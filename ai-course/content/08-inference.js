/* content/08-inference.js — 模块 08：推理、部署与成本 */
COURSE.register({
  id: "m8",
  part: 2,
  num: "08",
  title: "推理与部署：从采样参数到每百万 token 的成本",
  en: "Inference, Serving & Cost",
  minutes: 35,
  tags: ["工程", "部署", "必做"],
  body: String.raw`
<p class="lead">
  训练一次，推理无数次。推理阶段决定了你的产品体验、账单，以及能不能在本地跑起来。
  这一模块讲采样、量化、批处理，以及一个对第 12 模块至关重要的机制：<strong>前缀缓存</strong>。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>0.5 Prefill 和 Decode：同一个模型的两种瓶颈</h4>
<p>
  推理不是一个单一速度。<strong>Prefill</strong> 一次读完整段提示词，矩阵乘法密集，通常受算力限制；<strong>Decode</strong> 每次只生成一个 token，却要反复读取模型权重和已有的 KV cache，通常受显存带宽限制。
  这解释了为什么“首字延迟”和“每秒生成多少 token”必须分开测。
</p>
<table class="tbl small">
  <thead><tr><th>阶段</th><th>输入</th><th>主要成本</th><th>实用优化</th></tr></thead>
  <tbody>
    <tr><td>Prefill</td><td>整段 prompt</td><td>大矩阵乘、建立 KV cache</td><td>批处理、提示词复用、前缀缓存</td></tr>
    <tr><td>Decode</td><td>上一个 token</td><td>权重搬运、KV cache 读取</td><td>量化、连续批处理、减少上下文</td></tr>
  </tbody>
</table>
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：训练像「一次性把菜谱写进厨师脑子里」，推理像「餐厅出餐」——
    出餐速度取决于厨房流水线（批处理）而不是菜谱本身；这一讲讲的都是出餐效率与成本。<br />
    <strong>这一讲要建立的直觉</strong>：解码阶段几乎不用算力，时间花在<em>把权重从显存读出来</em>。<br />
    <strong>读完你能回答</strong>：为什么温度、top-p 会改变输出风格？为什么并发 32 个请求并不比 1 个慢多少？为什么切账号会让缓存失效？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    同一段提示词，为什么第二次调用明显更快更便宜？为什么把并发从 1 提到 32，吞吐涨了几十倍而延迟几乎不变？
    为什么 4-bit 量化后显存降到 1/4、质量却只掉一点？这三个问题背后是同一套推理工程。
  </p>
</section>

<h3>1. 采样：从 logits 到文本</h3>
<p>模型给出 logits \(z \in \mathbb{R}^{|\mathcal{V}|}\)，解码策略决定如何选下一个 token。</p>
<table class="tbl small">
  <thead><tr><th>参数</th><th>作用</th><th>典型值</th><th>失效场景</th></tr></thead>
  <tbody>
    <tr><td>temperature \(T\)</td><td>\(p_i \propto \exp(z_i/T)\)：\(T<1\) 更确定，\(T>1\) 更随机</td><td>0.0–1.0</td><td>\(T\) 太小 → 复读；太大 → 胡言乱语</td></tr>
    <tr><td>top-k</td><td>只保留概率最高的 \(k\) 个候选</td><td>20–100</td><td>分布平坦时切掉合理选项</td></tr>
    <tr><td>top-p（核采样）</td><td>保留累积概率达到 \(p\) 的最小集合</td><td>0.9–0.95</td><td>与 \(T\) 同时调容易互相抵消</td></tr>
    <tr><td>min-p</td><td>保留概率 ≥ \(p_{\max}\cdot\)min-p 的候选</td><td>0.02–0.1</td><td>比 top-p 更自适应，但生态支持较少</td></tr>
    <tr><td>重复惩罚</td><td>对已出现 token 的 logit 打折</td><td>1.0–1.15</td><td>过大 → 语法崩坏</td></tr>
  </tbody>
</table>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先掷一次骰子：温度到底在压什么</h4>
  <p>取三个候选的 logits \([2,\,1,\,0]\)。\(T = 0.5\) 时先除后 exp 得 \([4,\,2,\,0] \to [0.867,\,0.117,\,0.016]\)，几乎每次都掷出第 1 面——这就是「\(T\) 太小会复读」。</p>
  <p>\(T = 2\) 时得 \([1,\,0.5,\,0] \to [0.506,\,0.307,\,0.186]\)，三面接近均等，采样像乱猜——这就是「\(T\) 太大会胡言」。\(T = 1\) 时保持原分布 \([0.665,\,0.245,\,0.090]\)。</p>
  <p>LLM 回报：抽取类任务用 \(T = 0\)（等价于贪心，延迟最低且可复现）；创意任务从 \(T = 0.7\) 起调，一次只动温度或 top-p 其中一个。下面看代码里这三步是怎么落子的。</p>
</section>
<p><strong>采样算子微核心演示：温度缩放与多项式随机采样</strong></p>
<p>\[ P(w_{t} = i \mid w_{<t}) = \frac{\exp(z_i / T)}{\sum_{j \in \mathcal{V}_{\text{top-p}}} \exp(z_j / T)} \]</p>
<p>
  <strong>逐行代数解析</strong>：未归一化的原始得分 <code>logits</code> 除以温度系数 \(T\)（\(T < 1\) 放大差异使输出更确定，\(T > 1\) 抚平分布使输出更丰富多样）；经 Softmax 映射为概率分布后，由 <code>torch.multinomial</code> 按照概率权重完成随机采样，杜绝纯贪心算法的机械死循环。
</p>
<p><strong>一个常见误解</strong>：贪心解码（\(T=0\)）不等于「最正确答案」，它只是「最高概率路径」。
在需要多样性的任务（写诗、生成候选）上贪心会退化；在需要确定性的任务（抽取、分类）上它是最佳选择。</p>

<h4>1.1 top-p 与 top-k 的几何区别（手算一次就懂）</h4>
<p>设某一步模型给出的分布是 \(p = [0.50,\ 0.25,\ 0.15,\ 0.06,\ 0.04]\)，累积概率为 \(0.50,\ 0.75,\ 0.90,\ 0.96,\ 1.00\)。</p>
<table class="tbl small">
  <thead><tr><th>策略</th><th>保留哪些候选</th><th>重归一化后的分布</th><th>特点</th></tr></thead>
  <tbody>
    <tr><td>top-k = 2</td><td>前 2 个</td><td>[0.667, 0.333]</td><td>固定数量；分布平坦时会切掉合理选项</td></tr>
    <tr><td>top-p = 0.90</td><td>前 3 个（累积恰好到 0.90）</td><td>[0.556, 0.278, 0.167]</td><td><strong>自适应</strong>：分布越尖保留越少，越平保留越多</td></tr>
    <tr><td>top-p = 0.95</td><td>前 4 个（累积 0.96 ≥ 0.95）</td><td>[0.521, 0.260, 0.156, 0.063]</td><td>更保守，多样性更高</td></tr>
  </tbody>
</table>
<p>
  这就是 top-p 被称为「核采样」的原因：它只保留构成概率质量「核心」的那一小撮候选，核的大小随分布自适应。
  <strong>实践建议</strong>：温度与 top-p 一起调很容易互相抵消——常见的做法是<em>只调一个</em>，
  或者用「温度 0.7 + top-p 0.9」这种经过大量实践检验的组合作为起点。
</p>

<h4>1.2 量化的数学：一个能写进报告的误差估计</h4>
<p>主流的训练后量化是<strong>分组仿射量化</strong>：把权重按每 \(g\) 个元素编成一组，各自映射到整数格点上。</p>
\[ w \approx s\,(q - z), \qquad s = \frac{w_{\max} - w_{\min}}{2^{b}-1} \]
<p>
  其中 \(b\) 是位宽，\(q\) 是整数量化值，\(z\) 是零点。误差上界是半个步长
  \(\frac{s}{2} = \frac{w_{\max}-w_{\min}}{2(2^{b}-1)}\)。
</p>
<p><strong>代入具体数字感受一下</strong>：若某组权重落在 \([-1, 1]\)，取 \(b = 4\)（16 个格点），
  步长 \(s = 2/15 \approx 0.067\)，最大误差约 0.033——相对量级 3%。
  这就是为什么 4-bit 权重「掉点很小」：误差是<em>有界且均匀</em>的，而且量化误差在矩阵乘里会部分相互抵消。
</p>
<p>
  那为什么激活值很难压到 8-bit 以下？因为激活的分布<strong>不是</strong>均匀有界的：
  少数通道会出现比中位数大几十倍的离群值（LLM.int8 论文的核心发现）。
  若把整组压到低位宽，这些离群值会主导缩放因子，导致其余元素全部被压成同一个值。
  所以主流做法是「权重量化到 4-bit + 激活保持较高精度」。
</p>

<h4>1.3 连续批处理与 PagedAttention：为什么吞吐能翻几倍</h4>
<p>
  <strong>静态批处理</strong>的浪费在于同步等待：一个批次要等最长的序列生成完才能释放显存，
  期间短的序列早已结束，位置却空着。连续批处理把「一个批次」变成「一个持续补位的队列」，
  序列一结束立刻填入新请求，GPU 几乎不空转。
</p>
<p>
  但连续批处理要求 KV Cache 能<strong>动态分配</strong>，而朴素的实现需要为每条序列预留一段连续显存，
  因此产生严重碎片。vLLM 论文报告的典型 KV Cache 浪费是 <strong>60%–80%</strong>；
  PagedAttention 借鉴操作系统的虚拟内存分页，把缓存切成固定大小的块、用页表映射，
  把碎片降到 <strong>4% 以下</strong>，直接换来数倍的并发能力。
</p>
<p><em>这个案例的迁移价值很高：当你在自己的项目里遇到「显存明明够却分配失败」时，先怀疑碎片，而不是怀疑容量。</em></p>

<h4>1.4 投机解码：为什么它能免费加速</h4>
<p>解码阶段每步只产生一个 token，GPU 利用率极低；但<em>验证</em>多个候选却可以并行（像 prefill 一样）。于是：</p>
<ol>
  <li>用一个小而快的<strong>草稿模型</strong>连续猜 \(k\) 个 token。</li>
  <li>用大模型<strong>一次前向</strong>并行验证这 \(k\) 个位置。</li>
  <li>从前往后接受正确的猜测，遇到第一个被拒的位置就用大模型的输出取代它，然后重新开始。</li>
</ol>
<p>
  用接受-拒绝采样可以证明：<strong>输出分布与大模型直接采样完全一致</strong>——它不改变结果，只是更快。
  加速比取决于草稿模型的命中率：命中率越高、\(k\) 越大，收益越高；
  若命中率很低，验证的算力就白花了。这也是为什么草稿模型必须与目标模型「风格相近」。
</p>

<h3>2. 量化：用精度换显存与速度</h3>
<table class="tbl small">
  <thead><tr><th>方案</th><th>位宽</th><th>显存（7B）</th><th>质量影响</th><th>场景</th></tr></thead>
  <tbody>
    <tr><td>fp16 / bf16</td><td>16</td><td>≈ 14 GB</td><td>基准</td><td>训练与高质量推理</td></tr>
    <tr><td>int8（LLM.int8 / bnb）</td><td>8</td><td>≈ 7 GB</td><td>极小</td><td>显存不足时的第一选择</td></tr>
    <tr><td>int4（NF4）</td><td>4</td><td>≈ 4 GB</td><td>小到中等</td><td>QLoRA 微调、消费级显卡</td></tr>
    <tr><td>GPTQ / AWQ</td><td>4</td><td>≈ 4 GB</td><td>小（校准更好）</td><td>部署服务</td></tr>
    <tr><td>GGUF（llama.cpp）</td><td>2–8</td><td>2–6 GB</td><td>视档位</td><td>CPU / Apple Silicon 本地运行</td></tr>
  </tbody>
</table>
<p>
  量化的核心操作是把权重按组做<strong>仿射映射</strong> \(w \approx s\cdot(q - z)\)（\(s\) 是缩放、\(z\) 是零点），
  训练后量化（PTQ）用少量校准数据估计 \(s,z\)。经验规律：
  <em>权重可以压到 4-bit 而质量损失很小，但激活值很难压到 8-bit 以下</em>——所以主流是「权重量化 + 激活保持较高精度」。
  KV Cache 也可以量化（通常到 int8），对长上下文推理的显存收益很大。
</p>

<h3>3. 服务：吞吐与延迟是两件事</h3>
<dl class="kv">
  <dt>TTFT</dt><dd>Time To First Token：预填充阶段决定，受提示长度与算力影响</dd>
  <dt>ITL / TPOT</dt><dd>Inter-Token Latency：解码阶段决定，受显存带宽与批大小影响</dd>
  <dt>吞吐</dt><dd>tokens/s（全局）：批处理规模的函数</dd>
</dl>
<p>
  <strong>静态批处理</strong>的浪费在于：一个批次必须等最长的序列生成完才能释放。
  <span class="t" data-tterm="Continuous batching" data-d="连续批处理：序列一结束立刻把新请求填进空槽，GPU 利用率大幅提升。">连续批处理</span>
  解决了这一点，而 <span class="t" data-tterm="PagedAttention" data-d="把 KV Cache 按页管理（类似操作系统虚拟内存），消除显存碎片，使高并发成为可能。">PagedAttention</span>
  让 KV Cache 不再需要连续显存，从而把并发上限提高数倍。这两项是 vLLM 吞吐优势的来源。
</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么批处理能同时提高吞吐而不牺牲延迟</h4>
  <p>解码阶段每生成一个 token 都要把<strong>全部权重</strong>从显存读一遍，时间约为</p>
  \[ t_{\text{step}} \approx \frac{\text{model bytes}}{\text{memory bandwidth}} \]
  <p>这个时间与批大小<strong>几乎无关</strong>（只要显存装得下 KV Cache）。于是：</p>
  \[ \text{throughput} \approx \frac{B}{t_{\text{step}}} \]
  <p>
    把批大小从 1 提到 32，吞吐接近线性增长，而单个请求的 ITL 基本不变——
    这就是「批处理几乎是免费的算力」的原因。代价是显存：KV Cache 随批大小线性增长（模块 03 的公式）。
  </p>
</section>

<h3>4. 前缀缓存：同一个提示只算一次</h3>
<p>
  如果两次请求共享一段前缀（例如系统提示 + 固定文档），那么这段前缀的 KV Cache 可以复用，
  第二次只需处理新增部分。这叫
  <span class="t" data-tterm="Prefix caching / prompt caching" data-d="缓存共享前缀的 KV，使重复前缀的计算与计费大幅降低；通常有几分钟的存活时间，且与具体账号/实例绑定。">前缀缓存 / 提示缓存</span>。
</p>
<ul>
  <li><strong>收益</strong>：长系统提示 + 多轮对话场景下，延迟可降数倍，费用可显著下降。</li>
  <li><strong>失效条件</strong>：前缀中任何位置变化（哪怕改一个字）都会让缓存失效；请求被路由到<strong>另一个实例或另一个账号</strong>也会失效。</li>
  <li><strong>对你的意义</strong>：这正是第 12 模块里「账号亲和」的量化理由——如果代理在中途切换账号，
      缓存全部失效，可能要重新写入 80 万 token 的前缀。</li>
</ul>

<h3>5. 成本估算</h3>
\[
\text{cost per request} \approx \frac{c_{\text{in}}\cdot T_{\text{in}} + c_{\text{out}}\cdot T_{\text{out}}}{10^{6}}
\quad(\text{with prices per million tokens})
\]
<p>四个立刻能用的省钱手段，按收益排序：</p>
<ol>
  <li><strong>压缩提示</strong>：去掉无关上下文。输入 token 通常占成本的绝大多数（多轮对话尤甚）。</li>
  <li><strong>利用缓存</strong>：固定前缀放前面，别在中间插入时间戳等每次都变的内容。</li>
  <li><strong>分级模型</strong>：分类/抽取用便宜模型，只在需要推理时调用旗舰模型。</li>
  <li><strong>批处理离线任务</strong>：把同质请求攒起来跑，而不是逐条交互。</li>
</ol>

<h3>6. 草稿纸演算区：把这一讲的数字算到字节</h3>
<p class="lead">
  前五节给的是「是什么」与「为什么」。这一节是<strong>上手计算区</strong>：先把符号钉死，
  再用一组极小的数字在草稿纸上一步步算出 KV Cache 到底占多少显存、投机解码到底能快几倍。
  三道草稿题都可以拿计算器独立复核，不需要跑代码。
</p>

<h4>6.1 符号约定（先把字母钉死，后面的算式才不会串）</h4>
<table class="tbl small">
  <thead><tr><th>符号</th><th>含义</th><th>本节取值</th><th>一句备注</th></tr></thead>
  <tbody>
    <tr><td>\(b\)</td><td>同时在跑的序列条数（批大小）</td><td>\(b = 1\)</td><td>每条序列各占一份，互不共享</td></tr>
    <tr><td>\(s\)</td><td>已填充的上下文长度（token 数）</td><td>\(s = 4096\)</td><td>每生成一个 token 它就 +1</td></tr>
    <tr><td>\(l\)</td><td>Transformer 层数</td><td>\(l = 28\)</td><td>每层各存一份 K 和一份 V</td></tr>
    <tr><td>\(h\)</td><td>注意力头数（标准 MHA 下等于 KV 头数）</td><td>\(h = 16\)</td><td>用了 GQA 就必须改取 KV 头数</td></tr>
    <tr><td>\(d\)</td><td>单个头的维度</td><td>\(d = 128\)</td><td>\(h\cdot d = 2048\) 恰好等于隐藏维度</td></tr>
    <tr><td>\(c\)</td><td>每个元素占的字节数</td><td>\(c = 2\)</td><td>bf16/fp16 为 2；fp32 为 4；int8 为 1</td></tr>
    <tr><td>\(q\)</td><td>草稿模型给候选 token 的概率</td><td>逐题给定</td><td>\(q\) 是「小模型有多自信」</td></tr>
    <tr><td>\(p\)</td><td>目标模型给同一 token 的概率</td><td>逐题给定</td><td>\(p\) 是「大模型有多自信」</td></tr>
    <tr><td>\(\alpha\)</td><td>单步接受概率</td><td>\(\alpha = \min(1,\,p/q)\)</td><td>只看比值，不看绝对值</td></tr>
    <tr><td>\(k\)</td><td>每轮草稿猜的候选个数</td><td>\(k = 3\)</td><td>猜得越多，验证越并行、也越容易白花</td></tr>
    <tr><td>\(\gamma\)</td><td>草稿模型与目标模型的单步成本比</td><td>\(\gamma = 0.1\)</td><td>小模型便宜十倍时取 0.1</td></tr>
  </tbody>
</table>
<p>
  <strong>符号约定里最容易出错的一条是 \(h\)</strong>：它到底该取 Query 头数还是 KV 头数。
  标准多头注意力里两者相同；一旦引入
  <span class="t" data-tterm="Grouped-Query Attention" data-d="让多个 Query 头共享同一组 Key/Value 头，KV 头数少于 Query 头数；KV Cache 因此按比例缩小，是长上下文部署的标准手段。">GQA</span>，
  \(h\) 就必须取 <em>KV 头数</em>，否则算出来的显存会系统性偏大好几倍。
  下面所有算式都按标准 MHA 写。
</p>

<h4>6.2 前置定义 A：自回归生成循环</h4>
<p>
  <strong>定义</strong>：自回归生成指模型把整段文本当作一条概率链，一次只往前吐一个 token；
  每吐一个，都必须等上一个落到硬件里、算完前向，才能继续。形式上，
</p>
\[ p(x_{1:n}) = \prod_{t=1}^{n} p(x_t \mid x_{<t}), \qquad x_t \sim \mathrm{Cat}\!\left(\operatorname{softmax}\left(\frac{W_E h_t^{(L)}}{T}\right)\right) \]
<p>
  其中 \(x_{<t}\) 是前 \(t-1\) 个 token，\(W_E\) 是输出嵌入矩阵，\(T\) 是温度，
  \(h_t^{(L)}\) 是最后一层在位置 \(t\) 的隐状态。这条链可以拆成两个性质完全不同的阶段：
</p>
<table class="tbl small">
  <thead><tr><th>阶段</th><th>做什么</th><th>瓶颈是什么</th><th>串并行形状</th></tr></thead>
  <tbody>
    <tr><td>prefill 预填充</td><td>一次前向把提示里 \(s\) 个 token 的 KV 全部算出来</td><td>算力（FLOPs）</td><td>\(s\) 个 token 一步到位</td></tr>
    <tr><td>decode 解码</td><td>每步只算 1 个新 token，但要读一遍全部权重</td><td>显存带宽</td><td>\(s\) 步严格串行</td></tr>
  </tbody>
</table>
<p><strong>KV Cache 缓存追加算子微核心演示：</strong></p>
<p>\[ K_{1:t} = [K_{1:t-1} \parallel k_t], \quad V_{1:t} = [V_{1:t-1} \parallel v_t] \]</p>
<p>
  <strong>逐行代数解析</strong>：在自回归解码步中，避免对整个前序长序列重复做全量矩阵乘法；仅对最新生成的单个 Token 计算当前的 Key 与 Value 向量，沿着序列时间轴（<code>dim=-2</code>）与历史缓存拼接，使生成单步计算复杂度从 \(O(T^2)\) 骤降为 \(O(T)\)。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸 ①：7B 模型处理 4096 token，prefill 只占多少时间</h4>
  <p>
    这道草稿题只做一件事：把 prefill 与 decode 的耗时各自算出来，看谁主导。
    取三个可查的量——权重 \(7\times 10^{9}\) 个参数乘 2 字节得 14 GB、算力 150 TFLOP/s、显存带宽 2000 GB/s。
  </p>
  \[ \mathrm{FLOPs}_{\text{prefill}} = 2 \cdot N_{\text{param}} \cdot s = 2 \times 7\times 10^{9} \times 4096 = 5.73\times 10^{13} \]
  \[ t_{\text{prefill}} = \frac{5.73\times 10^{13}}{1.5\times 10^{14}} = 0.382\ \mathrm{s} \]
  <p>解码每一步只多读一份权重，几乎不新增计算量：</p>
  \[ t_{\text{step}} = \frac{14\ \mathrm{GB}}{2000\ \mathrm{GB/s}} = 7\times 10^{-3}\ \mathrm{s} = 7\ \mathrm{ms} \]
  \[ t_{\text{decode}} = 4096 \times 7\ \mathrm{ms} = 28.67\ \mathrm{s} \]
  <p>
    两项一比：prefill 只占总时间的 \(\dfrac{0.382}{0.382+28.67} = 1.32\%\)。
    <strong>这就是「解码才是瓶颈」这句话的全部数学内容</strong>——4096 个 token 里，
    真正吃算力的只有开头那一段；剩下 98.7% 的时间全花在「把 14 GB 权重搬进计算单元」这件事上。
  </p>
  <p>
    顺手再算一个工程结论：把批大小提到 \(B = 32\)，<strong>每一步仍然是 7 ms</strong>
    （权重只读一次，同时服务 32 条序列），吞吐变成 \(32/0.007 = 4571\) tok/s，
    而单条请求的 ITL 仍是 7 ms。这就是第 3 节「批处理几乎是免费的算力」的来源。
  </p>
</section>

<h4>6.3 前置定义 B：KV Cache 的内存结构</h4>
<p>
  <strong>定义</strong>：因果注意力里，位置 \(t\) 的输出只依赖 \(x_{1:t}\)；
  所以第 1 到第 \(t\) 个 token 的 Key 与 Value 向量在算完位置 \(t\) 之后就<em>再也不会改变</em>。
  把它们留下来给后续步骤复用，这块显存就叫 KV Cache。每一层各存一份，形状是
</p>
\[ \mathcal{K}^{(\ell)},\, \mathcal{V}^{(\ell)} \in \mathbb{R}^{\,b \times h \times s \times d} \]
<p>于是总字节数是一个纯乘法式，没有任何隐含常数：</p>
\[ M_{\mathrm{KV}} = \underbrace{2}_{K,V}\cdot\underbrace{l}_{\text{layers}}\cdot\underbrace{b}_{\text{batch}}\cdot\underbrace{h}_{\text{kv-heads}}\cdot\underbrace{s}_{\text{seq}}\cdot\underbrace{d}_{\text{head-dim}}\cdot\underbrace{c}_{\text{bytes per elt}} \]
<p>三个必须记住的性质：</p>
<ol>
  <li>它对 \(s\) 和 \(b\) 都是<strong>严格线性</strong>的，没有任何压缩或上限——这是长上下文最主要的显存开销来源。</li>
  <li>追加一个 token 是 \(O(1)\) 的一次切片写入，所以实现上要<em>预分配</em>最大长度再按需填充，而不是每步 realloc。</li>
  <li>它<strong>不包含</strong>注意力矩阵那 \(O(s^2)\) 的部分——那部分用 FlashAttention 一类算法在片上算完就丢掉了。留在显存里的只有每个 token 的 \(h\cdot d\) 个数。</li>
</ol>

<h4>6.4 草稿纸 ②：KV Cache 显存逐字节手算</h4>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>题目：b = 1, s = 4096, l = 28, h = 16, d = 128，bf16，求 KV Cache 占多少字节、多少 GB</h4>
  <p>严格按公式从左往右代入，每一步都写出中间量：</p>
  <table class="tbl small">
    <thead><tr><th>步</th><th>在算什么</th><th>算式（数字全部代入）</th><th>结果</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>每层 Key 的元素个数</td><td>\(1\times16\times4096\times128\)</td><td>8,388,608</td></tr>
      <tr><td>2</td><td>每层 Key 的字节数</td><td>8,388,608 \(\times 2\)</td><td>16,777,216 B = 16 MiB</td></tr>
      <tr><td>3</td><td>每层 Value 的字节数</td><td>形状与 Key 完全相同，同上</td><td>16,777,216 B = 16 MiB</td></tr>
      <tr><td>4</td><td>每层 K 加 V</td><td>16,777,216 + 16,777,216</td><td>33,554,432 B = 32 MiB</td></tr>
      <tr><td>5</td><td>全部 28 层</td><td>33,554,432 \(\times 28\)</td><td>939,524,096 B = 896 MiB</td></tr>
      <tr><td>6</td><td>换成十进制 GB</td><td>939,524,096 \(\div\) 1,000,000,000</td><td>0.9395 GB</td></tr>
      <tr><td>7</td><td>换成二进制 GiB</td><td>939,524,096 \(\div\) 1,073,741,824</td><td>0.875 GiB</td></tr>
    </tbody>
  </table>
  <p>
    <strong>自查方式：换成 2 的幂再算一遍。</strong>四个数全是 2 的幂，答案应该也是一个干净的分数：
  </p>
  \[ 16 \times 4096 \times 128 = 2^{4}\times 2^{12}\times 2^{7} = 2^{23} = 8{,}388{,}608 \]
  \[ 2^{23}\times 2\times 2\times 28 = 7\times 2^{27} = 939{,}524{,}096\ \mathrm{B} = \tfrac{7}{8}\times 2^{30}\ \mathrm{B} \]
  <p>
    右端除以 \(2^{30}\) 正好是 \(7/8 = 0.875\)，与第 7 步完全吻合。
    <strong>凡是把公式写错的人，几乎都在这里露馅</strong>：如果你的结果除以 \(2^{30}\) 不是个简单分数，多半是漏乘了 2 或者漏乘了层数。
  </p>
  <p>再算一个更好用的中间量——<strong>每生成一个 token，KV Cache 长多少</strong>：</p>
  \[ \Delta M = 2 \times 28 \times 1 \times 16 \times 1 \times 128 \times 2 = 229{,}376\ \mathrm{B} = 224\ \mathrm{KiB} \]
  <p>
    反过来验：\(224\ \mathrm{KiB}\times 4096 = 917{,}504\ \mathrm{KiB} = 896\ \mathrm{MiB}\)，对得上。
    有了它你就获得了一把估算尺：<em>每生成 4.57 个 token，KV Cache 涨 1 MiB</em>。
    预估一次长回答要占多少显存，直接拿 \(224\ \mathrm{KiB}\) 乘以「提示长度 + 预计生成长度」。
  </p>
</section>

<p>然后是<strong>上下文长度的伸缩表</strong>（其余参数不变）：</p>
<table class="tbl small">
  <thead><tr><th>s（上下文 token 数）</th><th>总字节</th><th>MiB</th><th>十进制 GB</th></tr></thead>
  <tbody>
    <tr><td>1,024</td><td>234,881,024</td><td>224</td><td>0.235</td></tr>
    <tr><td>4,096</td><td>939,524,096</td><td>896</td><td>0.940</td></tr>
    <tr><td>16,384</td><td>3,758,096,384</td><td>3,584</td><td>3.758</td></tr>
    <tr><td>32,768</td><td>7,516,192,768</td><td>7,168</td><td>7.516</td></tr>
  </tbody>
</table>
<p>以及<strong>四个可以动手的杠杆</strong>——每一个都是往公式里的某一项上动手：</p>
<table class="tbl small">
  <thead><tr><th>手段</th><th>动公式里哪一项</th><th>本例结果</th><th>变化</th></tr></thead>
  <tbody>
    <tr><td>GQA：KV 头数 16 降到 4</td><td>\(h\) 除以 4</td><td>234,881,024 B = 0.235 GB</td><td>省 4 倍</td></tr>
    <tr><td>KV 量化 bf16 降到 int8</td><td>\(c\) 从 2 变成 1</td><td>469,762,048 B = 0.470 GB</td><td>省 2 倍</td></tr>
    <tr><td>上下文 4096 降到 1024</td><td>\(s\) 除以 4</td><td>234,881,024 B = 0.235 GB</td><td>省 4 倍</td></tr>
    <tr><td>并发 b 从 1 提到 32</td><td>\(b\) 乘以 32</td><td>30,064,771,072 B = 28.0 GiB</td><td>涨 32 倍</td></tr>
  </tbody>
</table>
<p>
  最后一行是绝大多数 OOM 的来源。取 \(b = 32\)、\(s = 32768\)：
  \(7{,}168\ \mathrm{MiB}\times 32 = 229{,}376\ \mathrm{MiB} = 224\ \mathrm{GiB}\)——80 GB 的 A100 装不下，
  而权重本身还要占 14 GB。<strong>症状</strong>是首 token 迟迟不来然后进程被杀；
  <strong>原因</strong>是 KV 的绝对容量不够，碎片优化救不了；
  <strong>对策</strong>是先砍 \(b\) 再砍 \(s\)，因为砍 \(b\) 不影响回答质量，砍 \(s\) 会。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>KV Cache 手算最常踩的五个坑</h4>
  <ol>
    <li><strong>忘了乘 2</strong>（只算了 Key）：结果正好差一半。检查法——单层结果必须是 \(2^{25}\) 字节的整数倍。</li>
    <li><strong>把 \(h\) 当成 Query 头数</strong>：用了 GQA 的模型要按 KV 头数算。这是最常见的系统性偏差，症状是「实测比公式小 4 倍」。</li>
    <li><strong>GB 与 GiB 混用</strong>：显存监控工具报 GiB，论文与账单报 GB，两者差 7.4%。本例 0.9395 GB = 0.875 GiB。</li>
    <li><strong>忘了把 \(s\) 算成「提示 + 已生成」</strong>：只按提示长度算，结果生成到一半就 OOM。稳妥做法是按提示长度加 max_new_tokens 预留。</li>
    <li><strong>忘了乘层数</strong>：只算了单层的 32 MiB 就去配机器，于是并发上不去。检查法——结果除以 \(l\) 应当正好回到单层的值。</li>
  </ol>
</section>

<h4>6.5 前置定义 C：投机解码的接受-拒绝规则</h4>
<p>
  <strong>定义</strong>：草稿模型 \(q\) 先猜 \(k\) 个 token，目标模型 \(p\) 用一次前向把它们全部验证。
  对第 \(j\) 个候选（假设 \(q(x_j) > 0\)），以概率
</p>
\[ \alpha_j = \min\left(1,\ \frac{p(x_j)}{q(x_j)}\right) \]
<p>接受它。一旦被拒，就在<em>残差分布</em>上重新采一个 token 顶上，本轮随即结束：</p>
\[ r(x) = \max\bigl(0,\ p(x) - q(x)\bigr), \qquad Z = \sum_{x'} r(x'), \qquad x_{\text{new}} \sim \frac{r(x)}{Z} \]
<p>
  这个 \(\alpha_j\) 只看<strong>比值</strong>：草稿模型与大模型同样自信（\(p = q\)）时必然接受；
  只有草稿模型<em>比目标模型更自信</em>（\(q > p\)）时才会被拒。
  所以草稿模型的任务<strong>不是「猜对」，而是「猜得和大模型一样自信」</strong>——
  一个正确但过度自信的小模型，会被频繁拒绝。
</p>
<div class="flow">
  <div class="nd hi">草稿模型猜 k 个</div>
  <div class="ar">→</div>
  <div class="nd">目标模型一次前向验证</div>
  <div class="ar">→</div>
  <div class="nd">逐个按 p/q 决定接受</div>
  <div class="ar">→</div>
  <div class="nd">第一个拒绝处用残差采样顶上</div>
  <div class="ar">→</div>
  <div class="nd hi">本轮结束，重新开始</div>
</div>

<h4>6.6 草稿纸 ③：3 个候选 token 的接受概率链</h4>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>题目：k = 3，逐个算接受概率，并求本轮的期望产出与加速比</h4>
  <p>给定草稿模型连猜 3 个 token，目标模型一次前向验证后的概率如下（只有比值起作用）：</p>
  <table class="tbl small">
    <thead><tr><th>j</th><th>候选 token</th><th>草稿模型 q</th><th>目标模型 p</th><th>比值 p/q</th><th>接受概率 α</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>"there"</td><td>0.60</td><td>0.75</td><td>1.2500</td><td>1.0000</td></tr>
      <tr><td>2</td><td>"is"</td><td>0.30</td><td>0.15</td><td>0.5000</td><td>0.5000</td></tr>
      <tr><td>3</td><td>"a"</td><td>0.50</td><td>0.20</td><td>0.4000</td><td>0.4000</td></tr>
    </tbody>
  </table>
  <p>
    第 1 个候选比值大于 1，草稿模型偏保守，必然接受。麻烦在于第 2、3 个：
    它们只有在前面全部被接受时才轮到检验，所以事件是<strong>链式相乘</strong>的。
  </p>
  \[ P(\text{accepted} \ge 1) = \alpha_1 = 1.0000 \]
  \[ P(\text{accepted} \ge 2) = \alpha_1\alpha_2 = 1.0000 \times 0.5000 = 0.5000 \]
  \[ P(\text{accepted} \ge 3) = \alpha_1\alpha_2\alpha_3 = 0.5000 \times 0.4000 = 0.2000 \]
  <p>把四种结局摊开，注意最后一列的产出为什么恒比「接受个数」多 1：</p>
  <table class="tbl small">
    <thead><tr><th>本轮结局</th><th>概率</th><th>接受几个</th><th>本轮实际产出 token 数</th></tr></thead>
    <tbody>
      <tr><td>3 个全被接受</td><td>\(\alpha_1\alpha_2\alpha_3 = 0.2000\)</td><td>3</td><td>4</td></tr>
      <tr><td>恰好接受前 2 个</td><td>\(\alpha_1\alpha_2(1-\alpha_3) = 0.3000\)</td><td>2</td><td>3</td></tr>
      <tr><td>只接受第 1 个</td><td>\(\alpha_1(1-\alpha_2) = 0.5000\)</td><td>1</td><td>2</td></tr>
      <tr><td>第 1 个就被拒</td><td>\(1-\alpha_1 = 0.0000\)</td><td>0</td><td>1</td></tr>
      <tr><td>合计</td><td>1.0000</td><td>—</td><td>期望 2.7000</td></tr>
    </tbody>
  </table>
  <p>
    「多 1」的原因：验证那一次前向其实已经算出了<em>每一个位置的下一个 token 分布</em>，
    包括最后一个被接受位置之后的那一个。所以被拒时用来顶替的 token 就在这次前向的结果里，
    <strong>不需要再跑一次</strong>。这是很多人算错的地方——你以为被拒要额外一次大模型前向。
  </p>
  \[ \mathbb{E}\bigl[n_{\text{tok}}\bigr] = 0\times 0.0000 + 2\times 0.5000 + 3\times 0.3000 + 4\times 0.2000 = 2.7000 \]
  <p>本轮的成本则恒定：草稿侧 3 次串行前向，按 \(\gamma = 0.1\) 折算，外加目标侧 1 次前向。</p>
  \[ \mathrm{cost} = \gamma k + 1 = 0.1\times 3 + 1 = 1.30 \]
  <p>
    不做投机解码、要拿到同样 2.7 个 token 需要 2.7 次目标模型前向。于是
  </p>
  \[ S = \frac{\mathbb{E}[n_{\text{tok}}]}{\gamma k + 1} = \frac{2.7000}{1.30} = 2.08 \]
  <p>
    <strong>保本判据就一句话</strong>：\(\mathbb{E}[n_{\text{tok}}] > \gamma k + 1\) 才赚。
    本例 2.7000 &gt; 1.30，赚 2.08 倍。
    <strong>反过来看这题的容错空间有多大</strong>：只要 \(\alpha_1 = 1\)（第一句草稿必被接受），
    即使 \(\alpha_2 = \alpha_3 = 0\)，期望产出也有 \(1 + 1 = 2.0000\)，仍然大于 1.30——
    也就是说这组配置<em>不可能亏</em>。哪怕把 \(\alpha_1\) 也压到 0.50，产出仍有
    \(1 + 0.50 + 0.25 + 0.10 = 1.8500\)，依然赚。要真正亏本，必须让接受率<em>整体</em>塌到 0.23 以下（见下面闭式表的保本列）。
    结论是：<strong>接受率是唯一决定盈亏的变量，而且它通常比你担心的更宽容。</strong>
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先看一眼上限：接受率全满时能快多少</h4>
  <p>设草稿与大模型完全同分布，每步接受率 \(\alpha = 1\)，\(k = 3\) 时期望产出 \(E = k + 1 = 4\) 个 token，成本仍是 \(1.30\)，加速比 \(S = 4/1.30 \approx 3.08\)——这就是本组配置的天花板。</p>
  <p>实测 \(\alpha_1 = 1\)、\(\alpha_2 = 0.5\)、\(\alpha_3 = 0.4\) 时 \(E = 2.70\)、\(S = 2.08\)，拿到了天花板的约七成。LLM 回报：先算天花板再调 \(k\) 与草稿模型，\(S\) 接近天花板时就该收手——剩下的延迟瓶颈在别处。</p>
</section>

<p>最后把这条判据推广成闭式。若每步接受率都近似同一个 \(\alpha\)（几何链假设），</p>
\[ S = \frac{\bigl(1-\alpha^{k+1}\bigr)/(1-\alpha)}{\gamma k + 1} \]
<p>取四组 (\(\gamma\)、\(k\)) 逐格算一遍（这张表可以直接拿去当选型依据）：</p>
<table class="tbl small">
  <thead><tr><th>γ</th><th>k</th><th>每轮成本</th><th>保本接受率</th><th>α = 0.5</th><th>α = 0.7</th><th>α = 0.9</th></tr></thead>
  <tbody>
    <tr><td>0.10</td><td>3</td><td>1.30</td><td>约 0.23</td><td>1.44</td><td>1.95</td><td>2.65</td></tr>
    <tr><td>0.10</td><td>5</td><td>1.50</td><td>约 0.34</td><td>1.31</td><td>1.96</td><td>3.12</td></tr>
    <tr><td>0.10</td><td>8</td><td>1.80</td><td>约 0.44</td><td>1.11</td><td>1.78</td><td>3.40</td></tr>
    <tr><td>0.05</td><td>5</td><td>1.25</td><td>约 0.20</td><td>1.57</td><td>2.35</td><td>3.75</td></tr>
  </tbody>
</table>
<p>
  <strong>保本接受率</strong>那一列是把 \(\mathbb{E}[n_{\text{tok}}] = \gamma k + 1\) 解出来的结果，
  可以当硬门槛用：\(\gamma = 0.1\)、\(k = 3\) 时接受率低于约 0.23 就必然亏本。
  同时注意 \(\alpha = 0.5\) 那一列随 \(k\) 递减——<strong>接受率低的时候，猜更多是纯浪费</strong>，
  因为多猜的那些次验证全部作废。
</p>
<p>还有一个上限，值得记住：</p>
\[ \lim_{\alpha\to 1}\frac{1-\alpha^{k+1}}{1-\alpha} = k+1, \qquad \lim_{k\to\infty}\frac{k+1}{\gamma k+1} = \frac{1}{\gamma} \]
<table class="tbl small">
  <thead><tr><th>γ</th><th>草稿模型单步成本</th><th>k 趋于无穷时的加速上限</th></tr></thead>
  <tbody>
    <tr><td>0.05</td><td>目标的 1/20</td><td>20 倍</td></tr>
    <tr><td>0.10</td><td>目标的 1/10</td><td>10 倍</td></tr>
    <tr><td>0.20</td><td>目标的 1/5</td><td>5 倍</td></tr>
    <tr><td>0.30</td><td>目标的 1/3</td><td>3.33 倍</td></tr>
  </tbody>
</table>
<p>
  也就是说：<strong>加速比的上限就是 \(1/\gamma\)</strong>——草稿模型每步便宜多少倍，加速就最多便宜多少倍。
  这解释了工业界为什么愿意花大力气做更小的草稿模型：<strong>把 \(\gamma\) 从 0.1 降到 0.05，
  收益比把 \(k\) 从 3 提到 8 大得多</strong>（对照上表：前者把上限从 10 倍抬到 20 倍，
  后者在 \(\alpha = 0.9\) 时也只把 2.65 抬到 3.40）。
</p>
<table class="tbl small">
  <thead><tr><th>场景</th><th>γ 的典型值</th><th>建议 k</th><th>备注</th></tr></thead>
  <tbody>
    <tr><td>代码补全、摘要改写（高度模板化）</td><td>0.03–0.08</td><td>6–10</td><td>接受率常高于 0.85，收益最大</td></tr>
    <tr><td>通用对话与问答</td><td>0.05–0.12</td><td>4–6</td><td>先实测 α 再调 k</td></tr>
    <tr><td>数学推导、严格结构化输出</td><td>0.10–0.20</td><td>2–4</td><td>接受率低，k 大了白花算力</td></tr>
    <tr><td>目标模型已被重度量化（如 int4）</td><td>0.25–0.40</td><td>不建议</td><td>γ 太大，上限 1/γ 已经太低</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>投机解码落地前必须先排除的四个问题</h4>
  <ol>
    <li><strong>先确认你的目标模型没被批处理打满。</strong>生产环境里 32 条序列已经共享了一次权重读取，投机解码只是把同一个 GPU 上的空闲算力换成延迟。在高并发服务上，它的收益通常远小于论文数字；先量 ITL，再决定要不要上。</li>
    <li><strong>tokenizer 必须与目标模型完全一致。</strong>否则 \(p\) 与 \(q\) 根本不可比，接受率会<em>假性</em>暴跌，而且你从指标上看不出原因。这是实践中最常见、最难查的坑。</li>
    <li><strong>先实测 \(\alpha\) 再选 \(k\)，不要照抄别人的 \(k\)。</strong>测法很便宜：两个模型各生成 200 个 token，逐位置比较 top-1 是否一致，得到一个粗估的 \(\alpha\)。测 \(\alpha\) 的成本远低于事后调 \(k\)。</li>
    <li><strong>草稿侧那 \(k\) 步是严格串行的。</strong>验证是并行的，但生成候选不是。\(k = 8\) 时草稿模型要走 8 次串行前向，这段串行延迟不会被并行的验证抵消——低 \(\gamma\) 是它唯一的优势来源。</li>
  </ol>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：量化与吞吐基准（完整版见附录 B · E8）</h4>
<p><strong>4-bit NF4 低显存量化加载算子微核心演示：</strong></p>
<p>\[ W_{\text{FP16}} \xrightarrow{\text{NF4 Quant}} W_{\text{4-bit}} + \text{absmax} \cdot c, \quad \text{Memory} \approx \frac{1}{4} \text{Memory}_{\text{FP16}} \]</p>
<p>
  <strong>逐行代数解析</strong>：底层将权重矩阵从 16-bit 压缩为 4-bit NF4 格式，显存占用直接缩减为原先的 \(\frac{1}{4}\)，使 1.5B 乃至 7B 级别大模型得以平稳驻留在消费级或免费 T4 显卡（16GB）显存内。
</p>
  <p>记录四件事：显存、tokens/s、输出质量是否肉眼可辨、以及首次加载时间。然后回答：
  <em>如果你要部署一个每天 10 万次调用的服务，量化省下的钱和掉的质量哪个更值？</em></p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">把批大小从 1 提到 32，解码阶段的单请求延迟（ITL）通常会怎样变化？</p>
  <ul class="opts">
    <li>提高约 32 倍</li>
    <li data-ok>基本不变：解码受显存带宽限制，读一次权重可以服务整个批次</li>
    <li>降低到 1/32</li>
    <li>完全无法预测</li>
  </ul>
  <p class="why">
    解码每步的主要成本是「把权重从显存读进计算单元」，该成本与批大小无关，
    因此吞吐随批大小近似线性增长，而单请求延迟基本持平（直到显存或算力成为瓶颈）。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">下面哪种情况会让前缀缓存<strong>完全失效</strong>？</p>
  <ul class="opts">
    <li>把生成温度从 0.7 调到 0.9</li>
    <li data-ok>在提示最前面插入当前时间戳，或把请求路由到另一个账号/实例</li>
    <li>缩短输出长度</li>
    <li>把 top_p 从 0.95 调到 0.9</li>
  </ul>
  <p class="why">
    前缀缓存以「逐 token 完全相同的前缀」为键。前缀任何位置的变化都会使其失效；
    缓存通常还与实例（甚至账号）绑定，因此负载均衡与账号切换会直接击穿缓存——这是第 12 模块的核心工程约束。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">为什么主流做法把权重量化到 4-bit，而激活值通常只到 8-bit？</p>
  <ul class="opts">
    <li>因为激活值数量更少</li>
    <li data-ok>激活值中存在离群值（outliers），低位宽会显著破坏它们，导致质量骤降</li>
    <li>因为硬件不支持低位宽激活</li>
    <li>因为量化权重更容易实现</li>
  </ul>
  <p class="why">
    权重分布相对集中，按组仿射量化损失可控；激活值的动态范围大、存在极端离群通道
    （LLM.int8 论文的核心发现），因此通常保留 8-bit 或对离群通道单独用高精度处理。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">
    草稿纸 ② 的那个模型（\(b=1\)、\(l=28\)、\(h=16\)、\(d=128\)、bf16），把上下文从 4096 加倍到 8192，KV Cache 变成多少 GB（十进制）？
  </p>
  <ul class="opts">
    <li>0.940 GB：权重没变，缓存也不该变</li>
    <li data-ok>1.879 GB：\(M_{\mathrm{KV}}\) 对 \(s\) 严格线性，939,524,096 乘 2 得 1,879,048,192</li>
    <li>3.758 GB：把 bf16 的 2 字节当成了 fp32 的 4 字节</li>
    <li>15.036 GB：把 K 与 V、以及每元素字节数各多乘了一次 2</li>
  </ul>
  <p class="why">
    \(M_{\mathrm{KV}} = 2\cdot l\cdot b\cdot h\cdot s\cdot d\cdot c\) 里有 7 个因子，只有 \(s\) 变了且翻倍，
    所以答案精确地是 0.9395 × 2 = 1.879 GB。0.940 是忘了让它变；3.758 是把 \(c\) 从 2 换成 4（fp32）；
    15.036 则是把 \(c\) 从 2 换成 8 又乘了一遍 K/V，属于重复计因子。
    <strong>自查习惯</strong>：把结果除以 \(2^{30}\) 看是不是简单分数——0.9395 GB 对应 0.875 GiB，
    算对了才敢往上配机器。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">
    草稿模型与目标模型的单步成本比 \(\gamma = 0.1\)，每步接受率近似常数 \(\alpha = 0.5\)，每轮猜 \(k = 4\) 个 token。投机解码的期望加速比最接近？
  </p>
  <ul class="opts">
    <li>1.00：接受率只有一半，验证的算力正好白花</li>
    <li data-ok>1.38：期望产出 \((1-0.5^5)/(1-0.5) = 1.9375\) 个 token，本轮成本 \(\gamma k+1 = 1.4\)</li>
    <li>2.00：猜中一半就等于 2 倍加速</li>
    <li>10.00：把理论上限 \(1/\gamma\) 当成了实测值</li>
  </ul>
  <p class="why">
    加速比是「每轮产出」除以「每轮成本」：\(\mathbb{E}[n_{\text{tok}}] = (1-\alpha^{k+1})/(1-\alpha) = 1.9375\)，
    成本 \(= \gamma k + 1 = 1.4\)，比值 \(1.9375/1.4 = 1.384\)。10.00 是把上限误当实测；
    2.00 忽略了草稿侧那 \(\gamma k = 0.4\) 的成本；1.00 是低估——因为保本接受率只有约 0.23，
    \(\alpha = 0.5\) 仍然明显高于保本线。<strong>结论</strong>：投机解码的加速比要先算后用，不要凭「快了十倍」的说法配参数。
  </p>
</div>

<div class="acc" data-t="深入：投机解码（speculative decoding）的直觉" data-badge="性能">
  <div class="acc-body">
    <p>问题：解码是串行的，每步只产出一个 token，GPU 利用率极低。</p>
    <p>想法：用一个小而快的<strong>草稿模型</strong>先连续猜 \(k\) 个 token，再用大模型<strong>一次前向</strong>并行验证这 \(k\) 个位置。
    验证是并行的（像 prefill 一样快），被接受的猜测直接采用，第一个被拒绝的位置由大模型给出正确 token。</p>
    <p>关键性质：<strong>在数学上等价于从大模型采样</strong>（配合接受-拒绝采样），所以不改变输出分布——只是更快。
    加速比取决于草稿模型的命中率：命中率越高、\(k\) 越大，收益越高。</p>
    <p>另一个方向是「提示查找解码」（prompt lookup）：如果输出大量复制输入中的片段（摘要、改写），
    直接从输入里匹配候选，几乎零成本。</p>
  </div>
</div>
`
});
