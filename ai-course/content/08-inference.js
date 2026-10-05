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
<pre><code><span class="cm"># [逐行剖析] 工业级解码采样器核心算子：温度缩放 -> 降序重排 -> 核采样 (Top-p) -> 多项分布抽样</span>
import torch, torch.nn.functional as F
def sample_next(logits, T=1.0, top_p=0.95):
    <span class="cm"># 动态形状: logits -> (V,) [float32] | V 为模型输出词表大小</span>
    <span class="cm"># [逐行剖析] 1. 温度缩放：调节能量状态密度</span>
    z = logits / max(T, 1e-6)
    
    <span class="cm"># [逐行剖析] 2. Softmax 概率归一化</span>
    <span class="cm"># 动态形状: p -> (V,) [float32]</span>
    p = F.softmax(z, dim=-1)
    
    <span class="cm"># [逐行剖析] 3. 降序重排：概率由高到低排序</span>
    <span class="cm"># 动态形状: s -> (V,) [float32], idx -> (V,) [int64]</span>
    s, idx = torch.sort(p, descending=True)
    
    <span class="cm"># [逐行剖析] 4. 核集合判定：累积概率严格小于 top_p 的前缀集合（至少保留 1 个元素）</span>
    <span class="cm"># 动态形状: keep -> (V,) [bool]</span>
    keep = torch.cumsum(s, dim=-1) - s &lt; top_p
    
    <span class="cm"># [逐行剖析] 5. 截断与重归一化</span>
    <span class="cm"># 原地位运算: where 条件替换非核集合概率为 0.0</span>
    s = torch.where(keep, s, torch.zeros_like(s))
    s = s / s.sum()  <span class="cm"># 动态形状: s -> (V,) [float32] 重新归一化至单位和</span>
    
    <span class="cm"># [逐行剖析] 6. 多项式随机采样并映射回原始词表 Token ID</span>
    return idx[torch.multinomial(s, 1)]  <span class="cm"># 动态形状: scalar [int64]</span></code></pre>
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

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：量化与吞吐基准（完整版见附录 B · E8）</h4>
<pre><code>!pip -q install transformers bitsandbytes accelerate
import torch, time
from transformers import AutoModelForCausalLM, AutoTokenizer

<span class="cm"># [逐行剖析] 1. 加载分词器与测试基座</span>
name = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(name)

<span class="cm"># [逐行剖析] 2. 差异化精度加载器：对比原生 float16 与 bitsandbytes NF4 量化</span>
def load(dtype, quant=None):
    kw = dict(torch_dtype=dtype, device_map="auto")
    if quant: kw["quantization_config"] = quant
    return AutoModelForCausalLM.from_pretrained(name, **kw)

import bitsandbytes as bnb
<span class="cm"># 显存机制: fp16 每个参数占用 2 字节；int4 每个参数仅占用 0.5 字节 (加上双重量化缩放系数)</span>
m16 = load(torch.float16)
m4  = load(torch.float16, bnb.BitsAndBytesConfig(load_in_4bit=True))

<span class="cm"># [逐行剖析] 3. 解码吞吐量基准测速函数</span>
def bench(m, n=64):
    <span class="cm"># 动态形状: ids['input_ids'] -> (1, T_in) [int64]</span>
    ids = tok("Explain the physics of an audio crossfade:", return_tensors="pt").to(m.device)
    t0 = time.time()
    <span class="cm"># 自动微分: torch.no_grad() 彻底切断反向传播追踪，生成过程纯前向缓存 KV</span>
    with torch.no_grad():
        m.generate(**ids, max_new_tokens=n, do_sample=False)
    return n / (time.time() - t0)

print("fp16 tok/s:", round(bench(m16), 1))
print("int4 tok/s:", round(bench(m4), 1))
print("显存 (GB):", {k: round(v/2**30, 2) for k, v in
      [("fp16", m16.get_memory_footprint()), ("int4", m4.get_memory_footprint())]})</code></pre>
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
