/* content/24-architectures.js — 模块 24：前沿架构与多模态 */
COURSE.register({
  id: "m24",
  part: 6,
  num: "24",
  title: "前沿架构与多模态：注意力之外的世界",
  en: "Frontier Architectures & Multimodality",
  minutes: 35,
  tags: ["高阶", "前沿", "多模态"],
  body: String.raw`
<p class="lead">
  注意力是过去十年最成功的归纳偏置，但它有两张账单：序列长度的<strong>平方</strong>，
  和随上下文线性增长的 <strong>KV cache</strong>。这一模块走一遍「注意力之外」的尝试——
  状态空间模型、线性注意力、滑窗与混合架构、MLA 低秩 KV 压缩——
  然后换一个坐标系问同一个问题：当模型还能<em>看图、听音频、看视频</em>时，
  「序列」这个词意味着什么。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：软注意力像「每说一句话之前把整本书重读一遍」；
    状态空间模型像「一边读一边写一个固定厚度的摘要本」。摘要本永远那么厚，
    所以读多长的书都是同样的速度——但它可能记不住「第 37 页第 4 行的那个数字」。<br />
    <strong>这一讲要建立的直觉</strong>：线性复杂度不是免费的。
    它把「按内容精确检索」换成了「固定容量的记忆」。
    整个模块都在讨论这个交易的边界在哪、以及怎么用混合架构把它补回来。<br />
    <strong>读完你能回答</strong>：为什么 Mamba 的吞吐高但长上下文精确回忆会掉？
    MLA 到底缓存了什么、和 GQA 是什么关系？多模态模型是真的「看见」了图，还是读到了一段关于图的描述？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    一个 128K 上下文的请求打进来。prefill 阶段，注意力分数矩阵的规模按 \(T^2\) 增长；
    decode 阶段，KV cache 已经吃掉了十几 GB 显存，并发还不到 4 条。
    两条曲线都指向同一个问题：<strong>能不能把它们都压成线性，而不损失「按内容寻址」的能力？</strong>
  </p>
  <p>
    过去三年给出了三个不同层次的回答。第一个层次换掉注意力算子（SSM、线性注意力），
    第二个层次保留注意力但把 KV 压小（GQA、MLA），第三个层次承认两者都不完整、改用混合（交错堆叠）。
    这一模块要把这三种回答的收益与代价分别算清楚——
    因为它们在论文摘要里看起来都能「线性化」，但在你的服务栈里是完全不同的东西。
  </p>
</section>

<h3>1. 注意力的两张账单</h3>
<p>先把账单拆开。呼应模块 03（\(O(T^2)\) 的来源）与模块 08（KV cache 与解码瓶颈）。</p>
<p>
  <strong>账单 A：prefill 阶段的 \(O(T^2)\)。</strong>注意力分数矩阵有 \(T \times T\) 个元素。
  取 \(B = 1\)、\(h = 32\)、\(T = 32768\)、fp16（2 字节）：
</p>
\[ 32 \times 32768^{2} \times 2 \ \text{B} \approx 6.9 \times 10^{10} \ \text{B} \approx 68.7 \ \text{GB} \]
<p>
  这是朴素实现下<em>物化</em>一次分数矩阵的大小。FlashAttention 不物化它，
  但那个 \(T^2\) 的<strong>乘法次数</strong>依然存在——省的是显存，不是 FLOPs。
</p>
<p>
  <strong>账单 B：decode 阶段的 KV cache。</strong>每个 token 需要缓存的字节数是
</p>
\[ M_{\text{kv}} = 2 \cdot L \cdot h_{kv} \cdot d_h \cdot b \quad (\text{bytes per token}) \]
<p>
  取 \(L = 32\)、\(h_{kv} = 8\)、\(d_h = 128\)、\(b = 2\)（Llama-3-8B 的规格，GQA）：
</p>
\[ M_{\text{kv}} = 2 \times 32 \times 8 \times 128 \times 2 = 131072 \ \text{B} = 128 \ \text{KiB} \]
<p>
  128 KiB/token。放到 128K 上下文：\(128\ \text{KiB} \times 131072 = 16\ \text{GiB}\)——
  <strong>一条序列就把一张 24 GB 卡的三分之二吃掉了</strong>，而且这还没算权重。
  这也解释了为什么「长上下文」在工程上首先是一个显存问题，而不是一个算法问题。
</p>
<p>
  关键区分：<em>prefill 是算力瓶颈（账单 A），decode 是带宽与容量瓶颈（账单 B）。</em>
  「线性注意力」和「小 KV cache」解决的是<strong>不同阶段</strong>的问题，
  所以它们不是竞争关系，而是可以叠加的。
</p>
<table class="tbl small">
  <thead><tr><th>手段</th><th>压哪张账单</th><th>机制</th><th>代价</th></tr></thead>
  <tbody>
    <tr>
      <td>滑窗注意力（SWA）</td><td>A + B（局部）</td>
      <td>每个位置只看前 \(W\) 个位置</td>
      <td>超出窗口的依赖只能靠层间间接传播</td>
    </tr>
    <tr>
      <td>线性注意力</td><td>A（\(O(T^2) \to O(T)\)）</td>
      <td>用核函数替换 softmax，利用结合律先算 \(K^{\top}V\)</td>
      <td>表达力下降；状态容量固定</td>
    </tr>
    <tr>
      <td>状态空间模型</td><td>A（\(O(T)\)）</td>
      <td>递推 \(h_t = A h_{t-1} + B x_t\)</td>
      <td>长程精确回忆弱；训练并行度需要专门内核</td>
    </tr>
    <tr>
      <td>MQA / GQA</td><td>B（÷ \(h/h_{kv}\)）</td>
      <td>多个 Q 头共享同一组 K/V</td>
      <td>不改变注意力本身的计算量</td>
    </tr>
    <tr>
      <td>MLA</td><td>B（÷ 数十倍）</td>
      <td>把 K/V 压成低秩潜向量，只缓存潜向量</td>
      <td>多一层投影；实现复杂度高</td>
    </tr>
    <tr>
      <td>混合架构</td><td>A 与 B 一起</td>
      <td>多数层用廉价算子，少数层保留全局注意力</td>
      <td>需要调「几层全局」这个超参</td>
    </tr>
  </tbody>
</table>

<h3>2. 状态空间模型：把「检索」换成「递推」</h3>
<p>
  结构化状态空间模型（S4）来自控制论里的线性系统，连续形式是
  （<a href="https://arxiv.org/abs/2111.00396" target="_blank" rel="noopener">Efficiently Modeling Long Sequences with Structured State Spaces</a>，arXiv:2111.00396）：
</p>
\[ x'(t) = A\,x(t) + B\,u(t), \qquad y(t) = C\,x(t) + D\,u(t) \]
<p>把它离散化之后，就得到一个普通得不能再普通的递推（下面略去离散化记号上的横线）：</p>
\[ h_t = A\,h_{t-1} + B\,x_t, \qquad y_t = C\,h_t \]
<p>
  这就是
  <span class="t" data-tterm="State Space Model" data-d="状态空间模型：用一个固定维度的隐状态 h 递推地压缩全部历史，其更新是线性的，因此复杂度随序列长度线性增长。">状态空间模型</span>
  的全部内容：<strong>一个固定维度的隐状态 \(h_t \in \mathbb{R}^{N}\)，无论读过多少 token 都只有这么大。</strong>
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么是线性复杂度，以及为什么不能直接并行</h4>
  <p>
    每一步只做一次 \(N \times N\) 的矩阵-向量乘和一次 \(N \times 1\) 的加法，都是 \(O(N)\)；
    序列长度 \(T\)，所以总共 \(O(NT)\)。对比注意力的分数矩阵 \(O(T^2)\)，
    在长序列上这是决定性的差别。
  </p>
  <p>
    <strong>代价一：时间上无法并行。</strong>第 \(t\) 步依赖第 \(t-1\) 步，
    训练时没法像注意力那样一次算完整条序列。S4 的解法是换一个视角：
    因为 \(A\)、\(B\)、\(C\) 与时间无关，把递推展开就得到
  </p>
  \[ y_t = \sum_{k=0}^{t} C A^{k} B\, x_{t-k} = (K * x)_t \]
  \[ K = (CB,\ CAB,\ CA^{2}B,\ \dots) \]
  <p>
    整个 SSM 于是等价于<strong>一次长度为 \(T\) 的卷积</strong>，可以用 FFT 做到 \(O(T\log T)\)，
    训练时完全并行。S4 的另一个关键贡献是怎么选 \(A\) 的初始化（HiPPO 一类的结构），
    让状态真的能记住长程信息，而不是指数衰减掉。
  </p>
  <p>
    <strong>代价二：卷积视角要求「时不变」，而这正好限制了表达能力。</strong>
    如果 \(A\)、\(B\)、\(C\) 是固定的，那么「记什么、忘什么」与输入内容无关——
    模型没法因为看到一个关键 token 就决定「这句要记住」。
    Mamba 的整个贡献就建立在这句话上：把 \(B\)、\(C\) 和步长 \(\Delta\) 变成<strong>输入的函数</strong>
    （论文称之为「选择性」），从而恢复内容相关的推理能力。
  </p>
  <p>
    但这一改，卷积核 \(K\) 就不再固定，FFT 技巧失效；Mamba 转而写了一个
    <strong>硬件感知的并行扫描内核</strong>，把状态留在片上 SRAM、减少与 HBM 之间的往返，
    才把理论上的线性复杂度变成实测的吞吐优势。
  </p>
  <p>
    <strong>代价三（真正的代价）：状态是有损压缩。</strong>
    \(h_t\) 只有 \(N\) 个数，无论历史多长都压进这 \(N\) 个数。
    它擅长<em>累积型</em>信息（一个计数、一段趋势、一个主题），
    不擅长<em>索引型</em>信息（某个标识符在 40K token 前出现过没有、值是多少）。
    这不是工程缺陷，是容量约束的必然结果——后面第 3、6 节会回到这一点。
  </p>
</section>
<p>
  Mamba 论文报告的数字值得记住：推理吞吐约为同规模 Transformer 的 <strong>5 倍</strong>，
  在序列长度上线性扩展，并能在百万长度序列上继续改善；
  语言建模上 Mamba-3B 超过同规模 Transformer，追平两倍规模的 Transformer
  （<a href="https://arxiv.org/abs/2312.00752" target="_blank" rel="noopener">Mamba: Linear-Time Sequence Modeling with Selective State Spaces</a>，arXiv:2312.00752）。
</p>

<h3>3. 线性注意力、滑窗与混合架构</h3>
<p>
  <span class="t" data-tterm="Linear attention" data-d="线性注意力：用核函数替换 softmax 中的指数相似度，使注意力可以利用矩阵乘法结合律改写为先算 K 转置乘 V，从而把复杂度降到序列长度的线性。">线性注意力</span>
  的思路比 SSM 更直接：softmax 之所以禁止我们交换乘法顺序，
  是因为那个归一化项把每个位置耦合在一起。如果把相似度换成核函数
  \(\mathrm{sim}(q,k) = \phi(q)^{\top}\phi(k)\)（\(\phi\) 取正值，例如 \(\mathrm{elu}(\cdot) + 1\)），
  归一化就可以提到外面：
</p>
\[ \mathrm{Attn}(Q,K,V) = \frac{\phi(Q)\big(\phi(K)^{\top} V\big)}{\phi(Q)\big(\phi(K)^{\top}\mathbf{1}\big)} \]
<p>
  中间量 \(\phi(K)^{\top}V\) 的尺寸只与特征维度有关，<strong>与序列长度无关</strong>。
  于是时间降到 \(O(T)\)，状态是常数大小。Katharopoulos 等（ICML 2020）用这个改写把复杂度
  从 \(O(N^2)\) 降到 \(O(N)\)，指出它等价于一个 RNN，
  并在超长序列的自回归预测上报告了最高 4000× 的加速——注意这是
  <em>相对朴素 softmax 注意力实现</em>的最好情况，不是通用的端到端加速比
  （<a href="https://arxiv.org/abs/2006.16236" target="_blank" rel="noopener">Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention</a>，arXiv:2006.16236）。
</p>
<p>
  代价同样清楚：核函数是 softmax 的<strong>有损近似</strong>，模型的「检索精度」会下降。
  这正是 2024 年之后真正被大规模采用的不是「纯线性」，而是「混合」的原因。
</p>
<p>
  <span class="t" data-tterm="Sliding-window attention" data-d="滑窗注意力：每个位置只attend到前 W 个位置，把注意力的计算与缓存都限制在窗口内，使成本随序列长度近似线性增长。">滑窗注意力</span>
  是另一个极端务实的做法：每个 token 只看前 \(W\) 个位置。
  Mistral 7B 同时使用了 GQA 与滑动窗口注意力，论文的说明是
  「以降低的推理成本处理任意长度的序列」
  （<a href="https://arxiv.org/abs/2310.06825" target="_blank" rel="noopener">Mistral 7B</a>，arXiv:2310.06825）。
  它没有解决长程依赖，而是赌「信息可以在多层之间逐跳传播」——
  第 \(l\) 层的窗口只能看 \(W\)，但第 \(l+1\) 层已经能看到第 \(l\) 层聚合过的信息，
  于是感受野随深度线性增长。
</p>
<p>
  <strong>混合架构</strong>把上面两条路缝在一起：绝大多数层用廉价算子做累积，
  每隔几层放一个全局注意力层做索引。Jamba 是 Transformer 层与 Mamba 层交错、
  并在部分层加入 MoE 的完整实例：论文报告整个配置能装进一张 80 GB GPU，
  在 256K 上下文长度上仍保持强结果
  （<a href="https://arxiv.org/abs/2403.19887" target="_blank" rel="noopener">Jamba: A Hybrid Transformer-Mamba Language Model</a>，arXiv:2403.19887）。
</p>
<p>
  由此得到一个可迁移的工程直觉：<strong>全局注意力层是「精确检索通道」，廉价层是「高吞吐通道」。</strong>
  设计空间里的旋钮不是「要不要注意力」，而是「每几层放一个全局注意力层」。
</p>

<h3>4. MLA：低秩压缩 KV，与 MQA / GQA 的关系</h3>
<p>
  MQA / GQA 的思路是「让多个 Q 头共享 KV 头」：压缩比是 \(h / h_{kv}\)。
  它的上限很硬——最激进也就是所有头共享一组 KV（\(h_{kv} = 1\)），
  而共享会实实在在地损伤质量，所以 GQA 通常只取 4–8 组。
</p>
<p>
  MLA（Multi-head Latent Attention）换了一个维度：<strong>不减少头的数量，而是把整个 KV 表示先压成一个低维潜向量，只缓存这个潜向量，用的时候再升维回来。</strong>
</p>
\[ c_t^{KV} = W^{DKV} h_t \]
\[ k_t^{C} = W^{UK}\, c_t^{KV}, \qquad v_t^{C} = W^{UV}\, c_t^{KV} \]
<p>
  这里 \(W^{DKV}\) 把 \(d\) 维隐状态压到 \(d_c\) 维的潜空间，
  \(W^{UK}\)、\(W^{UV}\) 再把它升回各头的 K/V。
  缓存的只有 \(c_t^{KV}\)，与头数无关。
</p>
<p>
  但 RoPE 没法直接塞进这条低秩通道：旋转位置编码作用在 K 上，
  而低秩压缩后的 K 与位置项不满足同样的可吸收性。
  所以 MLA 额外缓存一份很小的<strong>解耦 RoPE 键</strong> \(k_t^{R}\)——它在所有头之间共享，每 token 只有几十维。
</p>
<p>
  MLA 最漂亮的一步在推理端：\(W^{UK}\) 可以<strong>被吸收进 \(W^{Q}\)</strong>，
  \(W^{UV}\) 可以<strong>被吸收进 \(W^{O}\)</strong>。
  于是解码时根本不需要显式构造完整的 K/V 头，矩阵形状也不用改变。
  这就是 MLA「省显存却不太掉速」的原因——它不是把计算推迟，而是把计算重写进了已有的投影里。
</p>
<p>
  规模上的结果：DeepSeek-V2 论文报告，相对 DeepSeek 67B，
  KV cache 减少 <strong>93.3%</strong>，最大生成吞吐提升到 <strong>5.76 倍</strong>，
  训练成本降低 42.5%
  （<a href="https://arxiv.org/abs/2405.04434" target="_blank" rel="noopener">DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model</a>，arXiv:2405.04434）。
  DeepSeek-V3 继续采用 MLA 与 DeepSeekMoE，规模做到 671B 总参数 / 37B 激活参数
  （<a href="https://arxiv.org/abs/2412.19437" target="_blank" rel="noopener">DeepSeek-V3 Technical Report</a>，arXiv:2412.19437）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算：MHA vs GQA vs MLA 的每 token KV 字节数</h4>
  <p>
    用 DeepSeek-V2 的公开 <code>config.json</code>（已逐字段核对 Hugging Face 上的模型仓库）：
  </p>
  <table class="tbl small">
    <thead><tr><th>字段</th><th>值</th><th>含义</th></tr></thead>
    <tbody>
      <tr><td><code>num_attention_heads</code></td><td>128</td><td>注意力头数</td></tr>
      <tr><td><code>qk_nope_head_dim</code></td><td>128</td><td>每头 K 中不带位置信息的部分</td></tr>
      <tr><td><code>qk_rope_head_dim</code></td><td>64</td><td>解耦 RoPE 键的维度（<strong>所有头共享</strong>）</td></tr>
      <tr><td><code>v_head_dim</code></td><td>128</td><td>每头 V 的维度</td></tr>
      <tr><td><code>kv_lora_rank</code></td><td>512</td><td>KV 潜向量维度 \(d_c\)</td></tr>
    </tbody>
  </table>
  <p>于是每个 token 需要缓存的<strong>元素个数</strong>（fp16/bf16 下再乘 2 字节）：</p>
  <p>
    <strong>MHA 基线（128 组 KV 头）</strong>：\(128 \times (128 + 64 + 128) = 40960\) 个数 → <strong>80 KiB/token</strong><br />
    <strong>GQA（假设 8 组 KV 头）</strong>：\(8 \times 320 = 2560\) 个数 → <strong>5 KiB/token</strong><br />
    <strong>MLA</strong>：\(d_c + d_{\text{rope}} = 512 + 64 = 576\) 个数 → <strong>1.125 KiB/token</strong>
  </p>
  \[ \frac{80\ \text{KiB}}{1.125\ \text{KiB}} \approx 71\times, \qquad \frac{5\ \text{KiB}}{1.125\ \text{KiB}} \approx 4.4\times \]
  <p>放到 128K 上下文（131072 个 token）：</p>
  <p>
    MLA：\(1.125\ \text{KiB} \times 131072 \approx 144\ \text{MiB}\)<br />
    GQA：\(5\ \text{KiB} \times 131072 \approx 640\ \text{MiB}\)<br />
    MHA 基线：\(80\ \text{KiB} \times 131072 \approx 10\ \text{GiB}\)
  </p>
  <p>
    <strong>结论</strong>：MLA 相对完全不压缩的 MHA 是约两个数量级的差距；
    相对已经很省的 GQA 还有约 4.4 倍。
    这就是它值得那份额外实现复杂度的原因——
    <em>注意这两个倍数解决的是不同问题：GQA 靠少一组头，MLA 靠降低每个头需要的维数。</em>
  </p>
</section>

<h3>5. 超越逐 token 自回归：多 token 预测与扩散语言模型</h3>
<p>
  前四节都在改「怎么算注意力」。这一节换角度：改<strong>预测什么</strong>、以及<strong>按什么顺序生成</strong>。
</p>

<h4>5.1 多 token 预测（MTP）</h4>
<p>
  传统目标函数是「给定前 \(t\) 个 token，预测第 \(t+1\) 个」。
  <span class="t" data-tterm="Multi-token prediction" data-d="多 token 预测：在共享主干之上挂 n 个独立输出头，同时预测后面 n 个 token，既提升样本效率也天然提供推理时的草稿。">多 token 预测</span>
  在共享主干之上挂 \(n\) 个独立输出头，同时预测后面 \(n\) 个 token。
</p>
<p>
  <strong>为什么能提升质量</strong>：每个位置要预测的不再只是一个 token，而是一小段未来的「形状」，
  这迫使模型学到更长的规划结构。论文报告 MTP 有利于归纳头（induction heads）的发育与算法推理能力。
</p>
<p>
  <strong>为什么能加速推理</strong>：\(n\) 个预测头一次前向就能给出 \(n\) 个候选 token，
  这天然构成一份「草稿」，可以直接接上模块 08 讲的投机解码——
  而且不需要额外训练一个小的草稿模型，草稿就长在主干的头上。
</p>
<p>
  数字（Gloeckle 等，2024）：13B 模型在 HumanEval 上多解出 <strong>12%</strong> 的题、
  在 MBPP 上多 <strong>17%</strong>；4-token 预测的模型推理最快可到 <strong>3 倍</strong>，
  即使批很大也一样，而且训练时间<em>没有</em>额外开销
  （<a href="https://arxiv.org/abs/2404.19737" target="_blank" rel="noopener">Better &amp; Faster Large Language Models via Multi-token Prediction</a>，arXiv:2404.19737）。
  DeepSeek-V3 也把多 token 预测写成了训练目标
  （<a href="https://arxiv.org/abs/2412.19437" target="_blank" rel="noopener">DeepSeek-V3 Technical Report</a>，arXiv:2412.19437）。
</p>
<p>
  一个容易忽略的工程点：MTP 的增益<strong>随模型增大而增大</strong>，在小模型上可能测不出来。
  如果你在 1B 规模上做实验发现「没什么用」，那不一定是否定这个方法。
</p>

<h4>5.2 扩散语言模型</h4>
<p>
  <span class="t" data-tterm="Diffusion language model" data-d="扩散语言模型：先把整段文本全部替换为掩码，再迭代地去掩码生成，每一步可以并行确定多个位置的 token，而不是严格从左到右。">扩散语言模型</span>
  改变了生成的<em>顺序</em>。
  自回归是严格从左到右、一次一个、每步依赖前面所有 token（KV cache 正是为这个顺序服务的）。
  掩码扩散的做法是：先把整段文本全部替换成掩码，
  然后迭代地去掩码——每一步让模型看当前（部分掩码的）序列，预测被掩码位置的 token，
  再确定其中一部分。LLaDA 就是用这个「前向掩码 / 反向生成」的过程从零预训练的一个 8B 模型
  （<a href="https://arxiv.org/abs/2502.09992" target="_blank" rel="noopener">Large Language Diffusion Models</a>，arXiv:2502.09992）。
</p>
<table class="tbl small">
  <thead><tr><th>维度</th><th>自回归（AR）</th><th>掩码扩散（DLM）</th></tr></thead>
  <tbody>
    <tr><td>生成顺序</td><td>严格从左到右</td><td>可以任意顺序，且一步可确定多个位置</td></tr>
    <tr><td>生成步数</td><td>= 输出长度</td><td>可以是几十步（与长度解耦）</td></tr>
    <tr><td>缓存策略</td><td>KV cache，逐 token 增长</td><td>已确定的前缀仍可缓存；块内需重复前向</td></tr>
    <tr><td>擅长的任务</td><td>开放生成、对话、流式输出</td><td>填空、纠错、需要全局结构约束的生成</td></tr>
    <tr><td>生态成熟度</td><td>极高（服务栈、投机解码、前缀缓存都围绕它建）</td><td>早期，服务栈仍在形成</td></tr>
  </tbody>
</table>
<p>
  论文报告的能力边界很清楚：LLaDA 8B 在上下文学习上可与 LLaMA3 8B 相比，
  SFT 之后表现出不错的指令跟随（包括多轮对话）；
  并且在「反向诗补全」这类任务上超过了 GPT-4o——作者把它归因于扩散模型不受
  自回归的<em>反转诅咒</em>（reversal curse）约束（同上，arXiv:2502.09992）。
</p>
<p>
  当前的局限也很实在：
  <strong>①</strong> 每一步都要对一个块做一次前向，
  新的成本结构是「步数 × 序列长度」而不是「生成长度」；
  <strong>②</strong> 序列长度是固定的而不是「生成到哪算到哪」，短输出也要付固定长度的代价；
  <strong>③</strong> 推理框架、KV 复用、投机解码、前缀缓存这些基础设施都是为自回归建的，
  迁移到扩散范式不是改一个参数的事。
  <em>所以这一节正确的读法是：扩散语言模型提出了一种新的能力边界，而不是替换掉自回归。</em>
</p>

<h3>6. 多模态：三段式、对比学习与训练阶段</h3>
<p>
  前面五节都在语言内部做文章。多模态提出的问题更根本：
  当输入可能是像素或声波时，「token 序列」从哪里来？
</p>

<h4>6.1 三段式架构</h4>
<div class="flow">
  <div class="nd">图像 / 音频 / 视频</div><div class="ar">→</div>
  <div class="nd">编码器</div><div class="ar">→</div>
  <div class="nd">投影层</div><div class="ar">→</div>
  <div class="nd">语言模型</div><div class="ar">→</div>
  <div class="nd">文本</div>
</div>
<p>
  <strong>编码器</strong>把像素变成一串向量（ViT 式的 patch embedding）；
  <strong>投影层</strong>把这些向量映射到语言模型的嵌入空间（一个 MLP，或若干可学习的 query token）；
  <strong>语言模型</strong>把视觉 token 与文本 token 拼成一条序列，一起做自回归。
</p>
<p>
  请特别注意最后这一步：<strong>语言模型看到的是一串向量，不是像素。</strong>
  它没有「再看一眼」的机制。这个事实决定了后面所有关于幻觉的讨论。
</p>
<table class="tbl small">
  <thead><tr><th>模态</th><th>编码器的典型形态</th><th>额外的难点</th></tr></thead>
  <tbody>
    <tr>
      <td>图像</td><td>ViT：切成 patch 序列</td>
      <td>分辨率越高 token 越多，需要切块 / 池化 / 动态分辨率</td>
    </tr>
    <tr>
      <td>音频</td><td>log-Mel 频谱图 → 编码器</td>
      <td>变长、没有自然分段、静音与噪声；Whisper 用 30 秒窗口 + 多任务 token 序列，在 680,000 小时多语言弱监督数据上训练</td>
    </tr>
    <tr>
      <td>视频</td><td>逐帧编码 + 时序聚合</td>
      <td>帧数 × 每帧 token 双重增长；需要时序压缩，以及「该看哪一段」的定位</td>
    </tr>
  </tbody>
</table>
<p>
  Whisper 论文报告：在 680,000 小时多语言、多任务弱监督上训练后，
  模型在零样本迁移下就能在多个基准上与全监督方法竞争，
  并且接近人类的准确率与鲁棒性
  （<a href="https://arxiv.org/abs/2212.04356" target="_blank" rel="noopener">Robust Speech Recognition via Large-Scale Weak Supervision</a>，arXiv:2212.04356）。
</p>

<h4>6.2 CLIP 式对比学习：InfoNCE 与一个能手算的例子</h4>
<p>
  <span class="t" data-tterm="Contrastive learning" data-d="对比学习：不预测标签，而是让匹配的样本对在嵌入空间里靠近、不匹配的远离；CLIP 用它把图像与文本对齐到同一个空间。">对比学习</span>
  的目标很朴素：一个批次里有 \(N\) 对（图，文），
  让第 \(i\) 张图与第 \(i\) 段文字在共享嵌入空间里最近，与其他 \(N-1\) 段文字都远。
</p>
\[ \mathcal{L} = -\frac{1}{N}\sum_{i=1}^{N} \log \frac{\exp(s_{ii}/\tau)}{\sum_{j=1}^{N}\exp(s_{ij}/\tau)} \]
<p>
  这就是 InfoNCE 损失，形式来自对比预测编码
  （<a href="https://arxiv.org/abs/1807.03748" target="_blank" rel="noopener">Representation Learning with Contrastive Predictive Coding</a>，arXiv:1807.03748）。
  式中 \(s_{ij} = \mathrm{sim}(z_i^{I}, z_j^{T})\) 是第 \(i\) 张图与第 \(j\) 段文字的相似度，
  对角项 \(s_{ii}\) 才是正样本对，其余 \(N-1\) 项都是负样本；
  \(\tau\) 是温度，控制分布的尖锐程度；\(\mathrm{sim}\) 通常是归一化向量的点积（余弦相似度）。
  CLIP 实际对称地算两遍（图→文、文→图）再取平均：
  在 4 亿对（图，文）上训练后，用自然语言直接指代视觉概念，
  在 ImageNet 零样本上追平了原始 ResNet-50 的准确率
  （<a href="https://arxiv.org/abs/2103.00020" target="_blank" rel="noopener">Learning Transferable Visual Models From Natural Language Supervision</a>，arXiv:2103.00020）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算一个 2×2 的 InfoNCE</h4>
  <p>设 \(N = 2\)、\(\tau = 1\)，相似度矩阵（行是图，列是文）为：</p>
  \[ S = \begin{pmatrix} 3.0 &amp; 1.0 \\ 0.5 &amp; 2.0 \end{pmatrix} \]
  <p><strong>第 1 行</strong>：\(\exp(3.0) = 20.09\)，\(\exp(1.0) = 2.72\)，和为 22.81；</p>
  \[ p_{11} = \frac{20.09}{22.81} = 0.881, \qquad -\log p_{11} = 0.127 \]
  <p><strong>第 2 行</strong>：\(\exp(0.5) = 1.649\)，\(\exp(2.0) = 7.389\)，和为 9.038；</p>
  \[ p_{22} = \frac{7.389}{9.038} = 0.818, \qquad -\log p_{22} = 0.201 \]
  <p>取平均：</p>
  \[ \mathcal{L} = \frac{0.127 + 0.201}{2} = 0.164 \]
  <p><strong>三个立刻能用的观察：</strong></p>
  <p>
    <strong>① 损失对错配的相似度极其敏感。</strong>
    把右上角的 \(1.0\) 抬到 \(3.0\)，第 1 行的分母变成 \(20.09 + 20.09 = 40.18\)，
    对角概率掉到 \(0.5\)，损失从 0.127 跳到 0.693。这就是「负样本有多难」直接决定梯度强度。
  </p>
  <p>
    <strong>② 温度 \(\tau\) 变小等价于放大相似度之间的差距。</strong>
    \(\tau < 1\) 会把 \(3.0\) 与 \(1.0\) 的差放大成 \(6.0\) 与 \(2.0\) 的差，分布更尖，
    梯度更集中在最难的负样本上；\(\tau\) 太大会让分布接近均匀，学到的东西变模糊。
  </p>
  <p>
    <strong>③ 批次越大，负样本越多。</strong>
    上式里 \(N\) 同时是「正样本个数」和「每个正样本的负样本个数」。
    这也解释了 CLIP 这一类方法为什么对 batch size 如此敏感——
    它实际上是在用大 batch 制造大量免费难负样本。
  </p>
</section>

<h4>6.3 训练的三个阶段与「看懂图」vs「能推理」</h4>
<p>
  <strong>阶段一：对齐模态（alignment）。</strong>
  冻结编码器与语言模型，<em>只训练投影层</em>。
  目标是让视觉 token 落到语言模型能理解的嵌入区域。
  这一阶段便宜、数据可以是纯描述对，本质是在找一个翻译词典。
</p>
<p>
  <strong>阶段二：指令微调。</strong>
  解冻投影层与语言模型（有时也包括编码器顶部），用多模态指令数据训练。
  LLaVA 是最早把「视觉指令微调」这条路走通的代表工作：
  用纯语言的 GPT-4 生成多模态指令跟随数据，再端到端训练，
  论文报告在与 GPT-4 对比的合成多模态指令集上取得 85.1% 的相对分数
  （<a href="https://arxiv.org/abs/2304.08485" target="_blank" rel="noopener">Visual Instruction Tuning</a>，arXiv:2304.08485）。
  这一步的产出才是「助手」，阶段一的产出只是一个能对齐的编码器。
</p>
<p>
  <strong>阶段三：偏好对齐。</strong>在多模态回答上用人类或模型偏好做 RLHF 一类的优化。
  它解决的是「回答得好不好」，不是「看得准不准」——这个区别很重要。
</p>
<p><strong>然后是评估，这里必须把两件事分开：</strong></p>
<p>
  <strong>「看懂图」（感知）</strong>：物体识别、OCR、计数、空间关系、属性。
  典型评测用「是/否」或短答案——正因为它容易猜，
  所以需要专门设计探测。POPE 用轮询式提问来测「模型是否描述了图里根本没有的物体」，
  论文发现当时的主流 LVLM 普遍存在严重的物体幻觉，
  并且<em>频繁出现在视觉指令中的物体、或与图中物体共现的物体，最容易被幻觉出来</em>
  （<a href="https://arxiv.org/abs/2305.10355" target="_blank" rel="noopener">Evaluating Object Hallucination in Large Vision-Language Models</a>，arXiv:2305.10355）。
  这条发现对工程有直接价值：你写提示词时提到的东西，本身就在诱发幻觉。
</p>
<p>
  <strong>「能推理」</strong>：需要结合学科知识、读图表、多步推导。
  MMMU 用 11.5K 道大学水平的多学科题目（涵盖 30 种异质图像类型：图表、地图、乐谱、化学结构等）测这一类能力，
  论文报告当时最强的 GPT-4V 与 Gemini Ultra 也只有 56% 与 59%
  （<a href="https://arxiv.org/abs/2311.16502" target="_blank" rel="noopener">MMMU: A Massive Multi-discipline Multimodal Understanding and Reasoning Benchmark for Expert AGI</a>，arXiv:2311.16502）。
</p>
<p>
  <strong>为什么必须分开报</strong>：一个模型可能 OCR 很准（感知强），
  但一让它做多步计算就崩；反过来，一个模型可能「猜答案」的倾向很强，
  在四选一的感知题上拿到不错的分数，换它自由描述就露馅。
  两个分数都不假，但它们<em>不测量同一个东西</em>。
</p>
<p>
  <strong>报告纪律</strong>：写清这四项中的每一项——是否零样本 / 少样本、
  是否允许回答「我不知道」、图像分辨率与切块策略、是否调用了外部工具（OCR、检索、代码执行）。
  这四项里任何一项变化都足以让分数差出十几个点。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：用一个开源 VLM 做三次对照实验（免费 Colab 可跑）</h4>
  <p>
    <strong>不要用外部图片。</strong>下面用 PIL 现场合成三张测试图，
    这样任何人都能复现，也避免你只测「漂亮照片」而漏掉模型真正会崩的输入。
  </p>
<pre><code>!pip -q install -U transformers accelerate pillow

import torch
from PIL import Image, ImageDraw
try:
    from transformers import AutoModelForImageTextToText as VLM
except ImportError:                       <span class="cm"># 旧版 transformers 的类名</span>
    from transformers import AutoModelForVision2Seq as VLM
from transformers import AutoProcessor

mid = "HuggingFaceTB/SmolVLM-500M-Instruct"   <span class="cm"># 想更准可换 Qwen/Qwen2.5-VL-3B-Instruct</span>
proc = AutoProcessor.from_pretrained(mid)
model = VLM.from_pretrained(mid, torch_dtype=torch.bfloat16, device_map="auto")

def make(kind, size=384):
    im = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(im)
    if kind == "circle":
        d.ellipse([96, 96, 288, 288], fill="crimson")
    elif kind == "square":
        d.rectangle([80, 80, 304, 304], fill="navy")
        d.text((185, 180), "7", fill="white")
    else:
        for i in range(0, size, 8):
            d.line([(0, i), (size, size - i)], fill=(i % 255, 120, 200), width=4)
    return im

def ask(img, q, n=96):
    msgs = [{"role": "user",
             "content": [{"type": "image"}, {"type": "text", "text": q}]}]
    prompt = proc.apply_chat_template(msgs, add_generation_prompt=True)
    inp = proc(text=prompt, images=[img], return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**inp, max_new_tokens=n, do_sample=False)
    return proc.decode(out[0][inp["input_ids"].shape[1]:], skip_special_tokens=True)

square = make("square")

<span class="cm"># 实验 1：同一张图，三种问法</span>
print("A 自由描述 :", ask(square, "描述这张图。"))
print("B 具体问题 :", ask(square, "图里有几个物体？它是什么颜色的？上面有数字吗？"))
print("C 幻觉诱导 :", ask(square, "请描述图中那只猫，以及它旁边的树。"))

<span class="cm"># 实验 2：换一张图，看答案如何随图变化</span>
for k in ("circle", "square", "lines"):
    print("D", k, ":", ask(make(k), "图里有几个物体？分别是什么颜色和形状？"))

<span class="cm"># 实验 3：模糊化——把同一张图缩到 64x64 再放大回来</span>
blur = square.resize((64, 64)).resize((384, 384))
print("E 模糊后   :", ask(blur, "图里的数字是多少？"))
print("F 原图复核 :", ask(square, "图里的数字是多少？"))</code></pre>
  <p><strong>要观察的三件事：</strong></p>
  <p>
    <strong>① 幻觉是怎么产生的。</strong>对比 A 与 C。
    C 里你<em>先说了</em>「猫」和「树」，模型很可能顺着你的话往下编。
    POPE 的发现正是这一点：指令里出现过的物体最容易被幻觉出来
    （<a href="https://arxiv.org/abs/2305.10355" target="_blank" rel="noopener">arXiv:2305.10355</a>）。
    <em>提示词不是中立的。</em>
  </p>
  <p>
    <strong>② 同一句话、不同图，答案怎么变。</strong>把 D 的三条输出并排看，
    你会看到模型是「真的在看」还是「在按问题模板作答」。
    如果三张图给出高度雷同的结构化回答（比如都答「一个红色圆形」），
    说明它更多在被指令先验驱动，而不是在描述图像。
  </p>
  <p>
    <strong>③ 分辨率是硬约束。</strong>E 与 F 的对比最直观。
    把图降到 64×64，数字「7」的笔画已经不足几个像素，
    但模型往往仍然会给出一个<em>看起来合理</em>的答案而不是说「看不清」。
    这就是「流畅但错误」——也是多模态落地时最常见的事故形态。
  </p>
  <p>
    把 500M 换成一个更大的模型（例如 Qwen2.5-VL-3B-Instruct，Colab T4 可以跑），
    上面的模式仍然存在，只是触发阈值更高。<strong>这不是小模型的问题，是架构的问题。</strong>
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>常见误区</h4>
  <p>
    <strong>① 以为线性注意力全面优于软注意力。</strong>
    线性注意力把「按内容精确检索」换成了「固定容量状态」。
    在需要逐字复制的任务上（长文档问答、代码补全、检索增强）它通常落后于同规模软注意力。
    这也正是实践中采用<em>混合</em>而不是<em>纯线性</em>的原因——
    纯线性架构声称全面超越时，先去找它保留了哪种全局通道。
  </p>
  <p>
    <strong>② 以为多模态模型真的「看见」了。</strong>
    三段式架构里，语言模型接收的是编码器 + 投影层产生的向量，不是像素；
    它没有「重新看一眼」的机制。所以当任务需要放大局部、数清小物体、读表格里的小字时，
    它更容易给出流畅但错误的答案——这就是物体幻觉
    （<a href="https://arxiv.org/abs/2305.10355" target="_blank" rel="noopener">arXiv:2305.10355</a>）。
  </p>
  <p>
    <strong>③ 把 benchmark 分数当作通用能力。</strong>
    MMMU 上 56% / 59% 说明的是「在受控多学科选择题上的正确率」，
    不是「能替代专家」。而且四选一允许猜（下限 25%）、
    题目难度分布随版本变化，跨论文比较分数要格外小心
    （<a href="https://arxiv.org/abs/2311.16502" target="_blank" rel="noopener">arXiv:2311.16502</a>）。
  </p>
  <p>
    <strong>④ 以为「没有 KV cache = 省显存」。</strong>
    SSM 确实没有 KV cache，但固定大小的状态是<em>另一种</em>有损压缩；
    它在长程精确回忆上的损失不是显存能换回来的。
    反过来，MLA 有 KV cache，只是把每 token 的字节数压了一个数量级。
    <strong>两件事要分开算账</strong>：一个是「有没有缓存」，一个是「缓存多大」。
  </p>
  <p>
    <strong>⑤ 只看架构、不看内核成熟度。</strong>
    一个理论上 \(O(T)\) 的架构，如果它的扫描或卷积内核没有 FlashAttention 那个量级的工程投入，
    在真实 GPU 上完全可能比软注意力更慢。判断一个新架构能不能用，
    第一个问题不是「复杂度是多少」，而是「它的内核在这个形状、这个 batch 下实测多少 tokens/s」。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>怎么用在真实项目里</h4>
  <p>
    <strong>选架构的四问</strong>：序列有多长？需不需要逐字精确回忆？
    有没有现成的高质量内核与服务栈？团队能不能维护自定义内核？
    如果序列是 8K–32K、服务栈是主流推理框架，默认答案通常仍然是
    <em>GQA + 全局注意力</em>；只有在长度上百 K、或者显存被 KV cache 卡死时，
    才值得考虑 MLA、滑窗或混合架构。
  </p>
  <p>
    <strong>长上下文的成本控制顺序（按性价比）</strong>：
    滑窗 / 局部注意力 → KV cache 量化 → MLA / 低秩压缩 → 换架构。
    前三项都不需要重训，第四项通常意味着从头预训练。
    先做前三项，很多时候你会发现第四项根本不需要。
  </p>
  <p>
    <strong>用多模态之前先做一次「能力体检」</strong>：
    准备 30 张你业务里的真实图片，配 5 类问题——
    物体存在性、计数、小字 OCR、空间关系、多步推理。
    逐类记录准确率，再决定能不能上线。
    这套 150 题的体检比看任何排行榜都可靠，因为它测的是<em>你的</em>分布。
  </p>
  <p>
    <strong>报告时把三件事写清楚</strong>：上下文长度、每 token 的 KV 字节数、
    以及是否使用了前缀缓存。这三项决定了「长上下文」在你这里到底是能力，还是账单。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">下面关于状态空间模型的哪个说法是对的？</p>
  <ul class="opts">
    <li>它的状态大小随上下文线性增长</li>
    <li data-ok>它的状态大小固定，所以长程精确回忆会受损；Mamba 让参数依赖输入以恢复内容推理，代价是不能再直接用 FFT 卷积</li>
    <li>它不需要任何训练</li>
    <li>它不需要位置编码，因此可以无限外推</li>
  </ul>
  <p class="why">
    \(h_t \in \mathbb{R}^{N}\) 与序列长度无关——这正是 \(O(T)\) 的来源，也是「有损压缩」的来源。
    原始 S4 的时不变参数让 SSM 可以写成卷积并用 FFT 并行；
    Mamba 为了「选择性」让 \(B\)、\(C\)、\(\Delta\) 依赖输入，卷积核不再固定，
    于是改用一个硬件感知的并行扫描内核。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">MLA 相对 GQA，多压了什么？</p>
  <ul class="opts">
    <li>它把注意力的头数减少了</li>
    <li data-ok>它不减少头数，而是把每层要缓存的 K/V 先投影到一个低维潜向量，只缓存这个潜向量，外加一份解耦的 RoPE 键</li>
    <li>它把 softmax 换成了核函数</li>
    <li>它把 KV cache 放到 CPU 内存里</li>
  </ul>
  <p class="why">
    MQA/GQA 靠「多个 Q 头共享 KV 头」来省，压缩比上限是 \(h\)；
    MLA 换了一个维度——低秩投影。
    用 DeepSeek-V2 的公开 config 手算：每 token 缓存的元素从 MHA 基线的 40960 个
    降到 576 个，而且论文报告相对 DeepSeek 67B 把 KV cache 减少了 93.3%。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">一个只在四选一的多模态基准上拿到高分的模型，最可能的问题是什么？</p>
  <ul class="opts">
    <li>它一定过拟合了训练集</li>
    <li data-ok>四选一允许猜（下限 25%），高分可能来自语言先验与答案分布，未必说明它能推理；要另做存在性/幻觉探测与开放式评估</li>
    <li>它的编码器一定太小</li>
    <li>它一定不能处理图像</li>
  </ul>
  <p class="why">
    多选题的猜中下限是 25%，而 VLM 的语言先验很强——
    POPE 发现频繁出现在指令中的物体最容易被幻觉出来。
    所以评估必须分层：感知（存在性、计数、OCR）、推理（多步）、开放式生成，
    三者不能用同一个分数代表。
  </p>
</div>

<div class="acc" data-t="深入：为什么混合架构赢了？——精确检索通道与高吞吐通道" data-badge="可选">
  <div class="acc-body">
    <p>把序列建模的需求拆成两类，很多困惑立刻消失：</p>
    <p>
      <strong>(a) 累积型</strong>：主题、趋势、计数、「这段代码整体在做什么」。
      这类信息可以用固定容量的状态近似——看了一千个 token 之后，
      你并不需要记得每一个词，只需要记得「这段在讲什么」。
    </p>
    <p>
      <strong>(b) 索引型</strong>：某个标识符在 40K token 前出现过没有、它的值是什么。
      这类信息需要「按内容查找」，也就是注意力在做的事。
      固定容量的状态在这里必然吃亏，因为你需要保存的不是摘要，而是原文的某一片段。
    </p>
    <p>
      纯 SSM 在 (a) 上很强、在 (b) 上吃亏；
      纯注意力在 (b) 上最强，但每一层都要付 \(O(T^2)\) 的时间与 \(O(T)\) 的缓存。
      混合架构的做法是：绝大多数层用廉价算子做累积，
      每隔几层放一个全局注意力层做索引。
      因为信息可以在层间流动，一次全局检索的结果可以供上下若干层廉价层使用。
      Jamba 的 Transformer/Mamba 交错加部分层 MoE 就是这个思路的一个完整实例，
      论文报告在 256K 上下文长度上仍保持强结果
      （<a href="https://arxiv.org/abs/2403.19887" target="_blank" rel="noopener">arXiv:2403.19887</a>）。
    </p>
    <p><strong>由此得到两个可以带走的判断：</strong></p>
    <p>
      <strong>① 看一个新架构时，先问它属于 (a) 还是 (b)。</strong>
      凡是在长文档精确问答、代码补全、检索增强这类任务上声称全面超越注意力的，
      都要去看它是否保留了某种全局通道——
      如果完全没有，那它在 (b) 上的损失只是暂时没被测出来，而不是不存在。
    </p>
    <p>
      <strong>② 混合比例是一个真正的工程超参。</strong>
      全局层太少，索引能力不够；太多，成本又回来了。
      它应该在你自己的数据分布上扫出来，而不是从论文里抄一个数字——
      因为 (a) 与 (b) 的需求比例在不同任务上差别极大：
      长文摘要偏 (a)，代码仓库问答偏 (b)。
    </p>
    <p>
      最后一条经验之谈：<strong>「让 KV cache 变小但不改变注意力本身」这条路风险最低。</strong>
      GQA、MLA、KV 量化都不动模型的表达能力，只动存储，
      因此最容易被现有服务栈吸收。这也是为什么 2024 年之后几乎所有开源模型
      都在用 GQA 或 MLA，而不是把注意力整个换掉——
      <em>工程上最容易赢的，往往是那个改动最小的方案。</em>
    </p>
  </div>
</div>
`
});
