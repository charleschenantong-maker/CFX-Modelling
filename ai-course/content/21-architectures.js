/* content/21-architectures.js — 模块 21：前沿架构与多模态 */
COURSE.register({
  id: "m21",
  part: 4,
  num: "21",
  title: "前沿架构与多模态：注意力之外的世界",
  en: "Frontier Architectures & Multimodality",
  minutes: 42,
  tags: ["高阶", "前沿", "多模态"],
  body: String.raw`
<p class="lead">
  注意力是过去十年最成功的归纳偏置，但它有两张账单：序列长度的<strong>平方</strong>，
  和随上下文线性增长的 <strong>KV cache</strong>。这一模块走一遍「注意力之外」的尝试——
  状态空间模型、线性注意力、滑窗与混合架构、MLA 低秩 KV 压缩——
  然后换一个坐标系问同一个问题：当模型还能<em>看图、听音频、看视频</em>时，
  「序列」这个词意味着什么。
</p>

<h3>0. 先问“为什么换架构”，再看新架构的方程</h3>
<p>
  新架构只有在旧架构的瓶颈明确时才有意义：上下文太长、KV cache 太大、吞吐不够，或输入已经不是纯文本。
  先画出任务的输入形状、目标输出、序列长度和延迟预算；如果这些没有变，换成更前沿的名字通常不会带来可验证收益。
</p>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>架构选择的最小决策表</h4>
  <table class="tbl small">
    <thead><tr><th>观察到的问题</th><th>可能的方向</th><th>不要跳过的对照</th></tr></thead>
    <tbody>
      <tr><td>长序列显存随 (T^2) 爆炸</td><td>稀疏注意力、线性注意力或状态空间模型</td><td>同一数据和上下文长度下的质量与吞吐</td></tr>
      <tr><td>KV cache 成为主要成本</td><td>MQA / GQA / MLA 等 KV 压缩</td><td>长上下文检索和多轮对话的回归集</td></tr>
      <tr><td>输入包含图像、音频或表格</td><td>多模态编码器与投影层</td><td>纯文本基线和跨模态对齐错误</td></tr>
      <tr><td>任务本身只有短序列</td><td>先保留成熟的 dense Transformer</td><td>简单模型的成本、可解释性和维护性</td></tr>
    </tbody>
  </table>
</section>

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
    每一步只做一次结构化 \(N \times N\) 矩阵（实践中取对角或低秩形式，否则稠密矩阵向量乘本是 \(O(N^2)\)）的矩阵-向量乘和一次 \(N \times 1\) 的加法，都是 \(O(N)\)；
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

<h3>2.5 Charles 草稿纸演算区：从连续 SSM、ZOH 离散化到 Mamba 选择性机制</h3>
<p>
  给 Charles 的数学草稿纸：Transformer 的注意力机制本质是「静态全历史检索」（复杂度二次方），
  而现代状态空间模型（SSM，如 S4 与 Mamba）的数学根基源于古典控制论与微分动力系统——用一阶线性微分方程将无限历史压缩在固定维度的隐状态之中。
  为了在数字计算机上执行连续动力系统，必须经历严密的<strong>连续方程积分</strong>与<strong>零阶保持器（ZOH）离散化</strong>。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>结论先行：离散化结果与选择性机制（推导折叠在下方）</h4>
  <p>
    下面两条是本节唯一需要带走的定理结论；完整的变易常数证明、\(N=2\) 手算与步长极值分析都在下方的折叠块里：
  </p>
  <p>
    <strong>定理 1（ZOH 精确离散化）</strong>：
    在零阶保持假设下，连续系统等价于离散递推 \(h_{k+1} = \bar{A} h_k + \bar{B} x_k\)，其中
  </p>
  \[ \bar{A} = \exp(\Delta A), \qquad \bar{B} = A^{-1}(\exp(\Delta A) - I) B \]
  <p>
    <strong>定理 2（Mamba 选择性机制）</strong>：
    把 \(B\)、\(C\) 与步长 \(\Delta\) 变成当前输入的实时函数，
  </p>
  \[ B_t = W_B x_t, \qquad C_t = W_C x_t, \qquad \Delta_t = \mathrm{softplus}(W_{\Delta} x_t + b_{\Delta}) \]
  <p>
    记住形状：\(\Delta_t > 0\) 是标量门控——它趋近 0 时状态直通（记住），显著增大时状态清零（遗忘）。
    背后的极值推演见折叠块。
  </p>
</section>

<div class="acc" data-t="深入：从连续SSM、ZOH离散化到Mamba选择性机制" data-badge="进阶">
  <div class="acc-body">
    <p>
      <strong>以 crossfade 这类任务为例：流式音频处理选 Mamba 类递推，多段音色对比必须加注意力（以后可照此选型）。</strong>
      原因各一句话：实时逐帧处理时，SSM 的隐状态只有固定 \(O(N)\) 个数，不随已播时长增长，
      内存恒定、解码吞吐约为同规模 Transformer 的 5 倍（见第 2 节的论文数字）——适合播放器的逐帧流式通路。
      但 crossfade 这类任务的「多段音色对比」（A 段第 3 秒与 B 段第 40 秒是否同调）是<em>索引型</em>回忆，
      有损状态会把它磨平，此时必须用混合架构补全局注意力层（见第 3 节与第 8 节）。
      代价也要先说：选择性机制破坏了时不变性，S4 的 FFT 并行训练失效，
      训练侧需要硬件感知的并行扫描内核（状态驻留 SRAM）；没有条件写或调这类内核时，不要自研，优先用混合架构的现成实现。
      下面是完整的连续积分、矩阵指数与变易常数推导，以及 \(N=2\) 手算与 \(\Delta_t\) 极值分析——第一次读可跳过。
    </p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：前置定义与符号约定（连续时间 SSM、ZOH 与矩阵指数）</h4>
  <p>
    <strong>前置定义 1（连续时间线性定常状态空间方程）：</strong>
    考虑连续时间动力学系统，一维连续输入激励信号为 \(x(t) \in \mathbb{R}\)，隐状态向量为 \(h(t) \in \mathbb{R}^N\)，一维观测输出为 \(y(t) \in \mathbb{R}\)：
  </p>
  \[ h'(t) = A h(t) + B x(t), \qquad y(t) = C h(t) + D x(t) \]
  <p>
    其中系统转移矩阵 \(A \in \mathbb{R}^{N \times N}\)，输入投影向量 \(B \in \mathbb{R}^{N \times 1}\)，输出投影向量 \(C \in \mathbb{R}^{1 \times N}\)，直通标量 \(D \in \mathbb{R}\)（在后续推导与工程实现中通常设 \(D=0\) 或视为残差连接）。
  </p>
  <p>
    <strong>前置定义 2（零阶保持器 Zero-Order Hold, ZOH 采样假设）：</strong>
    设采样时间间隔步长为 \(\Delta > 0\)，离散采样时刻点为 \(t_k = k \Delta\)，对应离散序列输入为 \(x_k = x(k \Delta)\)。
    零阶保持器假定：在两两采样时刻之间的连续时间区间 \(k\Delta \le t < (k+1)\Delta\) 内，输入信号保持恒定常数：
  </p>
  \[ x(t) \equiv x_k, \qquad \forall t: k\Delta \le t < (k+1)\Delta \]
  <p>
    <strong>前置定义 3（矩阵指数 Matrix Exponential）：</strong>
    对于任意方阵 \(M \in \mathbb{R}^{N \times N}\)，其矩阵指数由绝对收敛的皮亚诺级数（Taylor 级数）定义：
  </p>
  \[ \exp(M) = e^M = \sum_{j=0}^{\infty} \frac{1}{j!} M^j = I + M + \frac{1}{2!} M^2 + \frac{1}{3!} M^3 + \dots \]
  <p>
    当 \(M\) 为对角矩阵 \(M = \mathrm{diag}(\lambda_1, \dots, \lambda_N)\) 时，矩阵指数直接退化为各对角元的标量指数：
  </p>
  \[ \exp(M) = \mathrm{diag}(e^{\lambda_1}, e^{\lambda_2}, \dots, e^{\lambda_N}) \]
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：ZOH 精确离散化积分推导与转移矩阵 \(\bar{A}, \bar{B}\)</h4>
  <p>
    <strong>定理（连续系统精确离散化解析解）：</strong>
    在零阶保持器假设下，连续系统 \(h'(t) = A h(t) + B x(t)\) 在采样时刻 \(t_{k+1} = (k+1)\Delta\) 处的离散状态递推方程严格等价于：
  </p>
  \[ h_{k+1} = \bar{A} h_k + \bar{B} x_k \]
  <p>
    其中离散化状态转移矩阵与离散输入矩阵为：
  </p>
  \[ \bar{A} = \exp(\Delta A), \qquad \bar{B} = (\Delta A)^{-1}(\exp(\Delta A) - I) \cdot (\Delta B) = A^{-1}(\exp(\Delta A) - I) B \]
  <p>
    <strong>代数证明（Charles 的常微分方程变易常数积分草稿）：</strong>
  </p>
  <p>
    这是一阶线性非齐次常微分方程。利用积分因子 \(e^{-A t}\) 对等式两端同时左乘：
  </p>
  \[ e^{-A t} h'(t) - e^{-A t} A h(t) = e^{-A t} B x(t) \implies \frac{d}{dt}\left( e^{-A t} h(t) \right) = e^{-A t} B x(t) \]
  <p>
    在时间区间 \([k\Delta, (k+1)\Delta]\) 上两端定积分：
  </p>
  \[ \int_{k\Delta}^{(k+1)\Delta} \frac{d}{dt}\left( e^{-A t} h(t) \right) dt = \int_{k\Delta}^{(k+1)\Delta} e^{-A t} B x(t) \, dt \]
  <p>
    左侧展开为定积分上下限之差：\(e^{-A(k+1)\Delta} h_{k+1} - e^{-A k\Delta} h_k\)。
    在右侧，利用 ZOH 假定在整个积分区间内 \(x(t) \equiv x_k\) 为常数，可将其连同矩阵 \(B\) 提出积分号外：
  </p>
  \[ e^{-A(k+1)\Delta} h_{k+1} = e^{-A k\Delta} h_k + \left( \int_{k\Delta}^{(k+1)\Delta} e^{-A t} dt \right) B x_k \]
  <p>
    两端同时左乘 \(e^{A(k+1)\Delta}\)：
  </p>
  \[ h_{k+1} = e^{A(k+1)\Delta} e^{-A k\Delta} h_k + \left( \int_{k\Delta}^{(k+1)\Delta} e^{A((k+1)\Delta - t)} dt \right) B x_k \]
  <p>
    首项化简：\(e^{A(k+1)\Delta} e^{-A k\Delta} = e^{\Delta A} = \bar{A}\)。
    对积分项作变量代换，令 \(\tau = (k+1)\Delta - t\)，则 \(d\tau = -dt\)，当 \(t = k\Delta \implies \tau = \Delta\)，\(t = (k+1)\Delta \implies \tau = 0\)：
  </p>
  \[ \int_{k\Delta}^{(k+1)\Delta} e^{A((k+1)\Delta - t)} dt = \int_{0}^{\Delta} e^{A \tau} d\tau \]
  <p>
    利用矩阵指数的定积分性质：\(\int_{0}^{\Delta} e^{A \tau} d\tau = A^{-1}(e^{\Delta A} - I)\)。代入即得：
  </p>
  \[ \bar{B} = \left( \int_{0}^{\Delta} e^{A \tau} d\tau \right) B = A^{-1}(\exp(\Delta A) - I) B \]
  <p>
    <strong>极简小数字手算草稿：\(N=2\) 维对角阻尼系统逐步推演</strong>
  </p>
  <p>
    在草稿纸上设定一组最干净的数字，亲手验证离散化与状态更新过程。
  </p>
  <p>
    设系统隐状态维度 \(N = 2\)。为保证稳定性，连续演化矩阵 \(A\) 设为负定对角阵，输入向量为 \(B\)：
  </p>
  \[ A = \begin{bmatrix} -1 & 0 \\ 0 & -2 \end{bmatrix}, \qquad B = \begin{bmatrix} 1 \\ 2 \end{bmatrix} \]
  <p>
    设采样离散化步长为 \(\Delta = 0.5\)。
  </p>
  <p>
    <strong>第 1 步：算矩阵乘积 \(\Delta A\) 与矩阵指数 \(\bar{A}\)。</strong>
  </p>
  \[ \Delta A = 0.5 \times \begin{bmatrix} -1 & 0 \\ 0 & -2 \end{bmatrix} = \begin{bmatrix} -0.5 & 0 \\ 0 & -1.0 \end{bmatrix} \]
  \[ \bar{A} = \exp(\Delta A) = \begin{bmatrix} e^{-0.5} & 0 \\ 0 & e^{-1.0} \end{bmatrix} \approx \begin{bmatrix} 0.6065 & 0 \\ 0 & 0.3679 \end{bmatrix} \]
  <p>
    <strong>第 2 步：计算离散输入矩阵 \(\bar{B}\)。</strong>
    因 \(A\) 为对角阵，可逐行计算标量解析积分：
  </p>
  \[ \bar{B}_1 = \frac{e^{-0.5} - 1}{-1} \times 1 = 1 - e^{-0.5} \approx 1 - 0.6065 = 0.3935 \]
  \[ \bar{B}_2 = \frac{e^{-1.0} - 1}{-2} \times 2 = 1 - e^{-1.0} \approx 1 - 0.3679 = 0.6321 \]
  \[ \bar{B} \approx \begin{bmatrix} 0.3935 \\ 0.6321 \end{bmatrix} \]
  <p>
    <strong>第 3 步：追踪状态演化。</strong>
    设初始隐状态静止 \(h_0 = [0, 0]^{\top}\)。在第 1 步输入一个单位脉冲 \(x_0 = 1\)：
  </p>
  \[ h_1 = \bar{A} h_0 + \bar{B} x_0 = \begin{bmatrix} 0 \\ 0 \end{bmatrix} + \begin{bmatrix} 0.3935 \\ 0.6321 \end{bmatrix} \times 1 = \begin{bmatrix} 0.3935 \\ 0.6321 \end{bmatrix} \]
  <p>
    在第 2 步无新输入（\(x_1 = 0\)），仅由系统自主演化：
  </p>
  \[ h_2 = \bar{A} h_1 = \begin{bmatrix} 0.6065 \times 0.3935 \\ 0.3679 \times 0.6321 \end{bmatrix} \approx \begin{bmatrix} 0.2387 \\ 0.2325 \end{bmatrix} \]
  <p>
    物理图像跃然纸上：\(\bar{A}\) 的各对角元 \(e^{\Delta A_i} \in (0, 1)\) 严格充当了<strong>历史信息的指数衰减遗忘系数</strong>，而 \(\bar{B}\) 则控制了<strong>当前输入信号被注入隐状态的接纳增益</strong>！
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：Mamba 选择性机制（Selective SSM）与输入自适应步长 \(\Delta_t\)</h4>
  <p>
    在经典的 S4 架构中，参数 \(A, B, C, \Delta\) 全都是<strong>全局静态固定常数</strong>，与输入内容 \(x_t\) 毫无关系（时不变系统 LTI）。
    这造成了本质缺陷：无论当前的 token 是无关紧要的停顿虚词（如 “the”, “of”），还是决定上下文命题的核心实体，系统都只能按固定的衰减率一视同仁地遗忘！
  </p>
  <p>
    <strong>Mamba 的代数革新：参数向输入投影</strong>
  </p>
  <p>
    Mamba 彻底打破时不变约束，将 \(B\)、\(C\) 以及关键步长 \(\Delta\) 均定义为当前输入 \(x_t\) 的实时线性投影：
  </p>
  \[ B_t = W_B x_t, \qquad C_t = W_C x_t, \qquad \Delta_t = \mathrm{softplus}(W_{\Delta} x_t + b_{\Delta}) \]
  <p>
    其中 \(\mathrm{softplus}(z) = \log(1 + e^z) > 0\)，保证离散步长恒为严格正数。
  </p>
  <p>
    <strong>极值草稿纸推演：\(\Delta_t\) 如何充当智能动力学门控</strong>
  </p>
  <p>
    将随输入变化的动态步长 \(\Delta_t\) 代回离散递推公式 \(h_t = \exp(\Delta_t A) h_{t-1} + \bar{B}_t x_t\)，在草稿纸上考察两个极端数学边界：
  </p>
  <ul>
    <li>
      <strong>边界一：遇到停顿词、填充符号或无用噪声（模型令 \(\Delta_t \to 0\)）</strong>
      <br />
      当 \(\Delta_t \to 0\) 时，矩阵指数趋近于单位阵：
      \[ \bar{A}_t = \exp(\Delta_t A) \to \exp(0) = I \]
      离散输入矩阵趋近于零：
      \[ \bar{B}_t = A^{-1}(\exp(\Delta_t A) - I) B_t \approx \Delta_t B_t \to 0 \]
      代入状态更新方程：
      \[ h_t \approx I \cdot h_{t-1} + 0 \cdot x_t = h_{t-1} \]
      <strong>状态完全不衰减、新输入完全被阻断！</strong>系统相当于执行了完美的高速直通（Pass-through），将上一时刻的有效记忆 100% 完整原样保留。
    </li>
    <li>
      <strong>边界二：遇到重大语义转折、新段落或核心概念重置（模型令 \(\Delta_t \to +\infty\) 显著增大）</strong>
      <br />
      因为连续矩阵 \(A\) 的特征值皆为负数（\(A_{ii} < 0\)），当 \(\Delta_t\) 变大时：
      \[ \bar{A}_t = \exp(\Delta_t A) \to 0 \]
      \[ \bar{B}_t = A^{-1}(0 - I) B_t = -A^{-1} B_t \]
      代入状态更新方程：
      \[ h_t \approx 0 \cdot h_{t-1} + \bar{B}_t x_t = \bar{B}_t x_t \]
      <strong>历史记忆被瞬间彻底清零擦除（Reset/Forget）！</strong>隐状态全力聚焦并写入当下这一个全新的关键 token。
    </li>
  </ul>
  <p>
    <strong>与经典 RNN 门控机制的代数对照：</strong>
    对比 LSTM 的遗忘门 \(f_t \in (0, 1)\) 与 GRU 的更新门 \(z_t\)。
    Mamba 的 \(\bar{A}_t = \exp(\Delta_t A)\) 在连续控制论体系下实现了纯数学推导出的连续自适应遗忘门！
    更关键的是：传统 RNN 的非线性激活使状态递推无法并行；而 Mamba 内部是<strong>纯线性的时变动力系统</strong>。
    利用算子的结合律，在现代 GPU 上可通过<strong>硬件感知前缀扫描（Parallel Associative Scan）</strong>在 SRAM 内部实现 \(O(\log T)\) 时间跨度的并行极速训练！
  </p>
</section>
  </div>
</div>

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

<section class="blk blk-m">
  <h4><span class="ic">∑</span>位置外推：YaRN 为什么按频率分档缩放</h4>
  <p>
    <strong>以 crossfade 这类任务为例：序列只有一两千帧，一般用不上 YaRN——但要知道它什么时候会骗人。</strong>
    凡是「训练 4K、直接跑 128K」的开源权重，超长部分的相对位置都是外推出来的；
    如果以后评测恰好落在外推区，掉点来自位置编码而不是模型变笨。
    部署视角：YaRN 这类缩放不改变权重 GB 与单 token 算力，只改变长上下文的质量衰减曲线；
    代价是一次短微调（约 0.1% token 量级），推理侧只多一张逐位置的缩放常数表，tok/s 几乎不动。
    下面先给能直接用的结论，推导折起来了。
  </p>
  <p>
    先把三个词翻译成人话：RoPE 给每个维度配了一个旋转频率，高频分量转得快（看清邻居），
    低频分量转得慢（感知远距离）；直接把位置编号拉长，等于让所有频率都转出训练时见过的圈数——
    高频的精细刻度首先被破坏。YaRN（Peng et al.,
    <a href="https://arxiv.org/abs/2309.00071" target="_blank" rel="noopener">arXiv:2309.00071</a>）的办法是
    <strong>按频率分档</strong>：高频维度几乎不缩放（保局部精度），低频维度按比例拉伸（撑长距离），中间平滑过渡。
    经验数字：配合短微调，Llama-2 的 4K 上下文可撑到 64K–128K，而困惑度只涨零点几个点——
    代价几乎全在微调，不在推理。什么时候不值：任务长度本来就在训练窗口内时，任何缩放都是纯开销，直接关掉。
  </p>
</section>

<div class="acc" data-t="深入：YaRN 的 NTK 分档函数（哪一档缩、缩多少）" data-badge="进阶">
  <div class="acc-body">
    <p>
      记 RoPE 第 \(i\) 对维度的旋转频率为 \(\omega_i = \theta^{-2i/d}\)（\(\theta\) 常用 10000 或 500000）。
      定义波长 \(\lambda_i = 2\pi/\omega_i\) 与长度比 \(r = L'/L\)（目标长度除以训练长度），
      再定义相对覆盖 \(\gamma_i = L/\lambda_i\)。YaRN 的分档是：
    </p>
    \[ \gamma_i < \alpha \;\Rightarrow\; \text{full scale}, \qquad \gamma_i > \beta \;\Rightarrow\; \text{no scale} \]
    <p>
      中间档按余弦退火平滑过渡，其中 \(\alpha = 1\)、\(\beta = 32\) 是论文默认值。
      直觉：波长远大于训练长度的低频维度（\(\gamma_i\) 小）在训练时根本没转完一圈，拉长时必须全缩放；
      波长很短的高频维度（\(\gamma_i\) 大）已经见过无数圈，动它只会破坏局部刻度。
      动态 NTK 与纯位置插值（PI）都是这个函数的特例（分别对应只缩高频与均匀缩放全部频率）——
      这就是 YaRN 在长上下文榜单上系统性赢过它们的原因：它只在必须的地方付费。
    </p>
  </div>
</div>

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
  crossfade 这类短序列任务视角：这段形状推导现在不需要手算——但它解释了 MLA 省显存却几乎不掉速的原因。
  把形状写出来，吸收就不再像魔法。设隐状态维度 \(d\)，头数 \(h\)，每头维度 \(d_h\)，潜维度 \(d_c\)：
  查询 \(q = W^{Q}h\)，其中 \(W^{Q}\) 是 \((h d_h) \times d\)；
  压缩键 \(k^{C} = W^{UK}c\)，其中 \(W^{UK}\) 是 \((h d_h) \times d_c\)，而缓存的 \(c\) 只有 \(d_c\) 维。
  注意力分数 \(q^{\top}k^{C} = h^{\top}(W^{Q\top}W^{UK})c\)——
  括号里 \((W^{Q\top}W^{UK})\) 是 \(d \times d_c\)，与输入无关，可以<strong>离线乘好</strong>存成新的
  \(W^{Q,\text{abs}}\)。于是解码时直接用 \(W^{Q,\text{abs}}h\) 去点积缓存的 \(c\)，
  全程不构造 \((h d_h)\) 维的完整 K 头。这就是「\(W^{UK}\) 被吸收进 \(W^{Q}\)」的字面意思：
  一次矩阵乘法的位置从在线搬到了离线。部署视角：省的是 KV 字节（1.125 KiB/token），
  付的是实现复杂度；序列只有几千 token 时这笔交易不值（见第 8 节）。
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
<table class="tbl">
  <thead><tr><th>配置参数</th><th>MHA 基准</th><th>GQA 分组</th><th>MQA 单头</th></tr></thead>
  <tbody>
    <tr><td>Query 头数 \(H_q\)</td><td>128</td><td>128</td><td>128</td></tr>
    <tr><td>KV 头数 \(H_{kv}\)</td><td>128</td><td>8</td><td>1</td></tr>
    <tr><td>KV 显存倍率</td><td>1.0x (100%)</td><td>0.0625x (6.25%)</td><td>0.0078x (0.78%)</td></tr>
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
  \[ S = \begin{pmatrix} 3.0 & 1.0 \\ 0.5 & 2.0 \end{pmatrix} \]
  <p><strong>第 1 行</strong>：\(\exp(3.0) = 20.09\)，\(\exp(1.0) = 2.72\)，和为 22.81；</p>
  \[ p_{11} = \frac{20.09}{22.81} = 0.881, \qquad -\log p_{11} = 0.127 \]
  <p><strong>第 2 行</strong>：\(\exp(0.5) = 1.649\)，\(\exp(2.0) = 7.389\)，和为 9.038；</p>
  \[ p_{22} = \frac{7.389}{9.038} = 0.818, \qquad -\log p_{22} = 0.201 \]
  <p>取平均（图→文方向）：</p>
  \[ \mathcal{L}_{\text{img}\to\text{text}} = \frac{0.127 + 0.201}{2} = 0.164 \]
  <p>
    对称的 InfoNCE 还要加上文→图方向：第 1 列 \(\exp(3.0) = 20.09\)、\(\exp(0.5) = 1.649\)，和为 21.739，
    \(p = 0.924\)，\(-\log p = 0.079\)；第 2 列 \(\exp(1.0) = 2.72\)、\(\exp(2.0) = 7.389\)，和为 10.109，
    \(p = 0.731\)，\(-\log p = 0.314\)。双向平均 \(\mathcal{L} = (0.127 + 0.201 + 0.079 + 0.314)/4 \approx 0.180\)。
  </p>
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
<p>\[ H_{\text{vision}} = \text{Linear}(\text{PatchUnfold}(I)) \in \mathbb{R}^{N \times d} \]</p>
  <p><strong>要观察的三件事：</strong></p>
  <p>
    <strong>① 幻觉是怎么产生的。</strong>对比含引导词的合成图与中性描述的合成图。
    引导图里你<em>先说了</em>「猫」和「树」，模型很可能顺着你的话往下编。
    POPE 的发现正是这一点：指令里出现过的物体最容易被幻觉出来
    （<a href="https://arxiv.org/abs/2305.10355" target="_blank" rel="noopener">arXiv:2305.10355</a>）。
    <em>提示词不是中立的。</em>
  </p>
  <p>
    <strong>② 同一句话、不同图，答案怎么变。</strong>把同一句话在三张合成图上的输出并排看，
    你会看到模型是「真的在看」还是「在按问题模板作答」。
    如果三张图给出高度雷同的结构化回答（比如都答「一个红色圆形」），
    说明它更多在被指令先验驱动，而不是在描述图像。
  </p>
  <p>
    <strong>③ 分辨率是硬约束。</strong>低分辨率图与正常图的对比最直观。
    把图降到 64×64，数字「7」的笔画已经不足几个像素，
    但模型往往仍然会给出一个<em>看起来合理</em>的答案而不是说「看不清」。
    这就是「流畅但错误」——也是多模态落地时最常见的事故形态。
  </p>
  <p>
    把 500M 换成一个更大的模型（例如 Qwen2.5-VL-3B-Instruct，Colab T4 可以跑），
    上面的模式仍然存在，只是触发阈值更高。<strong>这不是小模型的问题，是架构的问题。</strong>
  </p>
</section>

<h3>7. 选型表：六类架构各自在为什么付费</h3>
<p>
  前面六节分别讲了原理。这一节把它压成一张可以直接拿去开会的表。
  读表的顺序是：先看「每 token 算力」与「每 token KV 字节」两列，它们决定账单；
  再看「长程精确回忆」那一列，它决定你会不会在评测里翻车；
  最后看「成熟度」，它决定你要不要自己写内核。
</p>
<table class="tbl small">
  <thead><tr><th>架构族</th><th>每 token 算力</th><th>每 token KV 字节</th><th>长程精确回忆</th><th>服务栈成熟度</th><th>什么时候选它</th></tr></thead>
  <tbody>
    <tr>
      <td>稠密自回归<br />（全局注意力 + GQA）</td>
      <td>约 \(2N\) FLOPs（\(N\) 为参数量）</td>
      <td>\(2\,L\,h_{kv}\,d_h\,b\)，参考配置 128 KiB</td>
      <td>最强</td>
      <td>最高：投机解码、前缀缓存、分页管理都围绕它建</td>
      <td>默认选项：序列不超过 32K，需要逐字精确</td>
    </tr>
    <tr>
      <td>滑窗 + 少量全局层</td>
      <td>接近 \(2N\)，注意力项降到 \(O(TW)\)</td>
      <td>全局层 \(O(T)\) 加窗口层 \(O(W)\)</td>
      <td>好（靠全局层兜底）</td>
      <td>高</td>
      <td>长度上百 K、KV 卡死显存，且不能重训</td>
    </tr>
    <tr>
      <td>线性注意力</td>
      <td>\(O(T)\)，但常数更大</td>
      <td>状态固定，没有 KV cache</td>
      <td>弱（核函数是有损近似）</td>
      <td>中</td>
      <td>超长流式，且对精确回忆要求低</td>
    </tr>
    <tr>
      <td>状态空间模型（SSM）</td>
      <td>\(O(T)\)，递推常数小</td>
      <td>状态固定，没有 KV cache</td>
      <td>弱（累积强、索引弱）</td>
      <td>中：需要专用扫描内核</td>
      <td>连续信号、传感器、音频这类长序列的<em>累积</em>任务</td>
    </tr>
    <tr>
      <td>MoE</td>
      <td>按<strong>激活</strong>参数计（常见是总参数的 1/5 到 1/10）</td>
      <td>与同规模稠密模型相同</td>
      <td>取决于注意力层</td>
      <td>高：主流推理框架已支持</td>
      <td>显存有余、想买容量而不是买算力</td>
    </tr>
    <tr>
      <td>扩散语言模型</td>
      <td>步数乘序列长度（与生成长度解耦）</td>
      <td>前缀可缓存，块内要重复前向</td>
      <td>中：可双向，没有反转诅咒</td>
      <td>低：服务栈仍在形成</td>
      <td>填空、纠错、需要全局结构约束的生成</td>
    </tr>
    <tr>
      <td>多模态（VLM）</td>
      <td>语言模型加上编码器（视觉 token 数乘每 token 成本）</td>
      <td>视觉 token 也进 KV，画面越细越贵</td>
      <td>取决于背后的语言模型</td>
      <td>高</td>
      <td>输入本身就是像素或声波，而不是文本</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>表里最容易被忽略的一列是「每 token KV 字节」。</strong>
  它乘上上下文长度就是你的并发上限。算力与 KV 是两本账：
  一本决定「跑得动吗」，一本决定「同时能跑几条」。
</p>

<h3>8. 同预算推导：一张 24 GB 卡、128K 上下文、并发 4 条</h3>
<p>
  下面是一次完整的选型推演。约束是硬的：<strong>一张 24 GB 卡、128K 上下文、同时服务 4 条序列、单序列解码要能看。</strong>
  参考配置沿用第 1 节那个 GQA 模型（\(L=32\)、\(h_{kv}=8\)、\(d_h=128\)），KV 先用 fp16。
  长上下文的通用机制（窗口、预算、失效模式）见 <a href="#m16-long-context">模块 13（长上下文）</a>，这里只做选型算术。
</p>
<p><strong>第一步：算 KV 预算。</strong>先把权重与运行时开销扣掉（基座权重已按 int4 量化计 3.9 GB，运行时底噪计 2.0 GB）：</p>
\[ 24 - 3.9 - 2.0 \approx 18 \qquad (\text{GB}) \]
\[ \text{per-sequence} = \frac{18}{4} = 4.5 \qquad (\text{GB}) \]
\[ \frac{4.5 \times 2^{30}}{131072} \approx 36 \qquad (\text{KiB/token}) \]
<p><strong>第二步：拿候选方案去撞这个预算。</strong></p>
<table class="tbl small">
  <thead><tr><th>候选</th><th>每 token KV</th><th>单序列 128K 占用</th><th>4 并发合计</th><th>结论</th></tr></thead>
  <tbody>
    <tr><td>GQA + fp16 KV</td><td>128 KiB</td><td>16 GiB</td><td>64 GiB</td><td>❌ 超预算 3.5 倍（相对整卡约 2.7 倍）</td></tr>
    <tr><td>GQA + int8 KV</td><td>64 KiB</td><td>8 GiB</td><td>32 GiB</td><td>❌ 仍然超</td></tr>
    <tr><td>GQA + int4 KV</td><td>约 34 KiB</td><td>约 4.25 GiB</td><td>约 17 GiB</td><td>⚠ 勉强通过，余量不到 1 GB</td></tr>
    <tr><td>全滑窗 \(W=4096\)</td><td>不随 \(T\) 增长：每序列 \(4096 \times 128\ \text{KiB}\)</td><td>512 MiB</td><td>2 GiB</td><td>✅ 但长程依赖只能靠层间传播</td></tr>
    <tr><td>混合：8 全局层 + 24 滑窗层</td><td>全局 \(8/32 \times 128 = 32\) KiB；窗口部分每序列 384 MiB</td><td>4 GiB 加 384 MiB</td><td>约 17.6 GiB</td><td>⚠ 接近上限；KV 换 int8 后约 8.8 GiB ✅</td></tr>
    <tr><td>MLA 类低秩 KV</td><td>1.125 KiB</td><td>144 MiB</td><td>576 MiB</td><td>✅ 但要改架构，通常要重训</td></tr>
  </tbody>
</table>
<p>
  <strong>第三步：算解码时间，检查「能不能看」。</strong>一步要读的字节数是
  \(B_w + B \cdot T \cdot M_{\text{kv}}\)，仍按 1.0 TB/s 带宽：
</p>
<p>
  fp16 KV：\(3.9\times10^{9} + 4 \times 131072 \times 131072 \approx 7.26\times10^{10}\) B → 约 73 ms/步 → 4 条合计约 55 tok/s<br />
  int4 KV：\(3.9\times10^{9} + 4 \times 131072 \times 34816 \approx 2.22\times10^{10}\) B → 约 22 ms/步 → 4 条合计约 180 tok/s
</p>
<p>
  <strong>这一步的结论比第一步更重要</strong>：在 128K、4 并发下，KV 流量（69 GB）
  是 int4 权重流量（3.9 GB）的 <strong>18 倍</strong>。
  <em>长上下文服务里只量化权重几乎无用</em>——这条和第 23 章第 7.3 节是同一笔账，
  两个模块在这里合上了。
</p>
<h4>8.1 同预算下的选型结论</h4>
<dl class="kv">
  <dt>必须 128K 且不能重训</dt><dd>唯一可行的是「KV 量化 + 滑窗/混合」。先做 KV int8（不改模型），不够再上滑窗；全局层保 1/4 左右，注意力算力同步降到约 1/4。</dd>
  <dt>可以重训</dt><dd>MLA 类低秩 KV 是唯一能在 128K 下留出大量余量的方案：1.125 KiB/token，4 并发只占 576 MiB。代价是额外的投影参数与实现复杂度。</dd>
  <dt>长度其实只有 8K</dt><dd>上面全部不需要。8K 下 fp16 KV 只有 1 GiB/序列，默认的全局注意力加 GQA 就是最优解，<strong>不要为了「前沿」而换架构</strong>。</dd>
  <dt>要的是容量不是长度</dt><dd>MoE。它的账完全不同，见 8.2。</dd>
</dl>

<h4>8.2 MoE：算力与显存不是同一件事</h4>
<p>MoE 把 FFN 换成 \(E\) 个专家加一个路由器，每个 token 只走其中 \(k\) 个。于是有两个数：</p>
\[ N_{\text{total}} = N_{\text{attn+emb}} + E\,N_{ffn} \]
\[ N_{\text{active}} = N_{\text{attn+emb}} + k\,N_{ffn} \]
<p>
  把第 23 章的参考配置代进来（\(N_{\text{attn+emb}} = 1.60\) B、\(N_{ffn} = 5.64\) B），取 \(E = 8\)、\(k = 2\)：
</p>
\[ N_{\text{total}} = 1.60 + 8 \times 5.64 \approx 46.7 \ \text{B} \]
\[ N_{\text{active}} = 1.60 + 2 \times 5.64 \approx 12.9 \ \text{B} \]
<p>
  读法：<strong>每 token 的算力相当于一个 12.9B 的稠密模型（约为原来 7.2B 的 1.8 倍），
  但显存要装 46.7B</strong>——int4 下约 24.8 GB，一张 24 GB 卡装不下，而且这还没算 KV。
  <em>MoE 买的是容量，付的是显存；它不解决显存问题，反而加重显存问题。</em>
</p>
<p>
  如果目标是在同一张卡上既扩容量又装得下，改法是把专家做小、个数减少：
  取 \(E = 4\)、每个专家是原 FFN 的一半（即 \(N_{ffn}' = 2.82\) B）、\(k = 2\)：
</p>
\[ N_{\text{total}} = 1.60 + 4 \times 2.82 \approx 12.9 \ \text{B}, \qquad N_{\text{active}} = 1.60 + 2 \times 2.82 \approx 7.24 \ \text{B} \]
<p>
  int4 下约 6.9 GB，装得下，每 token 算力与原来持平。<strong>这才是单卡场景下正确的 MoE 用法：
  用同样算力换到更大的总容量。</strong>而这需要从头训练或做 upcycling，属于训练侧决策，不是部署侧开关。
</p>

<div class="acc" data-t="深入：MoE 路由为什么需要辅助损失（aux-loss 与专家坍缩）" data-badge="进阶">
  <div class="acc-body">
    <p>
      <strong>以 crossfade 这类任务为例：以后也大概率不会训练 MoE，但这块解释了 MoE 的账为什么和直觉相反。</strong>
      没有辅助损失时，路由器会把几乎所有 token 扔给少数几个专家（赢者通吃），其余专家等于白占显存——
      此时 \(N_{\text{total}}\) 里的大部分参数从没被训练好。部署视角：aux-loss 只在训练时存在，
      推理侧零成本；但它决定了你下载的 MoE 权重里有多少参数是真正可用的。
      MoE 本体的路由与专家并行见 <a href="#m15-moe">模块 12（MoE）</a>。
      什么时候不值：单卡场景直接选稠密（本节已算过），连 aux 的存在都不需要知道。
    </p>
    <p>
      翻译成人话：路由器是给每个 token 选专家的打分器；辅助损失是挂在它头上的「班主任」，
      统计每个专家分到了多少 token，逼它分得均匀。常用形式是负载项与重要性项的乘积：
    </p>
    \[ \mathcal{L}_{\text{aux}} = \alpha\, E \sum_{i=1}^{E} f_i\, p_i \]
    <p>
      其中 \(E\) 是专家数，\(f_i\) 是实际分给专家 \(i\) 的 token 比例，
      \(p_i\) 是路由器分给专家 \(i\) 的平均门控概率，\(\alpha\) 常用 0.01。
      手算 \(E = 8\) 均匀时：\(f_i = p_i = 1/8\)，
      \(\mathcal{L}_{\text{aux}} = 0.01\times8\times8\times(1/64) = 0.01\)；
      若路由坍缩到 1 个专家：\(f_1 = p_1 = 1\)，其余为 0，
      \(\mathcal{L}_{\text{aux}} = 0.01\times8\times1 = 0.08\)——是均匀时的 8 倍，
      梯度会把路由器往回拉。这就是它被叫作「负载均衡」的原因。
    </p>
  </div>
</div>

<h3>9. 多模态最小三段式：编码器 + 投影层 + 语言模型</h3>
<p>
  6.1 给的是流程图。这一节把它做成<strong>能跑起来的最小例子</strong>，
  每一步都说明「这一段在做什么、参数量是多少、哪一段该冻结」。
  先算一笔在真实项目里最容易被低估的账：视觉 token 数。
</p>
<p>
  以 16×16 的 patch 为例。图片先切成 patch，再做一次 2×2 的像素合并
  （把相邻 4 个 patch 拼成 1 个 token），token 数就是「patch 数除以 4」：
</p>
<table class="tbl small">
  <thead><tr><th>输入</th><th>patch 数（16×16）</th><th>2×2 合并后的 token 数</th><th>追加的 KV（按 128 KiB/token）</th></tr></thead>
  <tbody>
    <tr><td>224 × 224</td><td>196</td><td>49</td><td>6.1 MiB</td></tr>
    <tr><td>448 × 448</td><td>784</td><td>196</td><td>24.5 MiB</td></tr>
    <tr><td>1024 × 1024</td><td>4096</td><td>1024</td><td>128 MiB</td></tr>
    <tr><td>视频 2 帧 × 3840 × 2160</td><td>32400 每帧</td><td>16200</td><td>约 2.0 GiB</td></tr>
  </tbody>
</table>
<p>
  最后一行是本模块最重要的数字：<strong>一秒钟的 4K 视频（按每秒 2 帧算）就能花掉约 2 GiB 的 KV</strong>，
  相当于约 84 张 448×448 的图。<em>「视频多模态」的账单来源不是模型更大，而是 token 更多。</em>
  工程上的对策只有三条：降分辨率、降帧率、加时序压缩（把多帧压成一个 token），三条都要牺牲细节。
</p>

<h4>9.1 三段各自的角色与参数量</h4>
<div class="flow">
  <div class="nd hi">像素 / 波形</div><div class="ar">→</div>
  <div class="nd">编码器（冻结）</div><div class="ar">→</div>
  <div class="nd">投影层（阶段一唯一训练目标）</div><div class="ar">→</div>
  <div class="nd">语言模型</div><div class="ar">→</div>
  <div class="nd">文本</div>
</div>
<dl class="kv">
  <dt>编码器</dt><dd>把像素或频谱变成一串向量。它自带预训练目标（对比学习或掩码重建），所以<strong>阶段一冻结</strong>：你不想用几百条指令数据毁掉它已经学好的表征。</dd>
  <dt>投影层</dt><dd>一个两层 MLP 就够（或若干可学习 query token）。唯一任务是把编码器输出搬进语言模型的嵌入空间——本质是<strong>一本翻译词典</strong>，参数量通常在百万级，是阶段一唯一要训的部分。</dd>
  <dt>语言模型</dt><dd>把视觉 token 与文本 token 拼成一条序列做自回归。注意它<em>只看到向量</em>，没有回看像素的通道——这是后面所有物体幻觉的根源。</dd>
</dl>
<p>
  参数量对比很清楚：编码器通常 300M–1B（冻结，不产生梯度），投影层 1M–100M（训练目标），
  语言模型 1B–10B 以上（阶段二才解冻）。
  <strong>阶段一真正可训的参数常常不到总参数的 1%</strong>，
  这也是小团队能做这件事的原因：一次前向加上一个很小的反向就够了。
</p>

<h4>9.2 对比学习损失：12 行代码与一个必须知道的细节</h4>
<p>6.2 已经手算过 InfoNCE。这里给出最小实现，它只有十行，却能帮你验证自己是否真的理解了那个公式：</p>
<p>\[ \mathcal{L}_{\text{InfoNCE}} = -\frac{1}{2N}\sum_{i=1}^N \left( \log \frac{e^{\langle u_i, v_i \rangle / \tau}}{\sum_j e^{\langle u_i, v_j \rangle / \tau}} + \log \frac{e^{\langle v_i, u_i \rangle / \tau}}{\sum_j e^{\langle v_i, u_j \rangle / \tau}} \right) \]</p>
<p>
  <strong>一个可以立刻验证的事实</strong>：把 \(\tau\) 设成 1、用随机向量跑，
  损失应当落在 \(\ln 8 \approx 2.079\) 附近（实测 2.08 上下）。
  推导很直接：随机向量之间的相似度几乎为零，每个 logit 都在 0 附近，分布接近均匀，
  于是每一项都是 \(-\log(1/N)\)，取平均就是 \(\ln N\)。
  <em>这条检查能一次抓出三个常见实现错误：忘了归一化、转置方向错了、温度除在了错的位置。</em>
</p>
<p>
  <strong>由此得到两个工程结论。</strong>① <strong>跨 batch size 比较 loss 没有意义</strong>：
  每个 batch 的损失起点就是 \(\ln N\)，\(N\) 越大起点越高，而学到的表示可能更好。
  ② \(\tau\) 是真正的超参：它决定「难负样本拿多少梯度」。
  \(\tau\) 从 0.07 调到 0.5，等于把所有相似度差缩小 7 倍，分布变平、梯度变软；
  这一族方法常用 0.01–0.07。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>30 分钟最小实现：训一个只有 16 个视觉 token 的三段式模型</h4>
  <p>
    下面这段代码在笔记本 CPU 上几十秒就能跑完。它故意把三件事压到最小：
    8×8 的 patch、16 个视觉 token、一个单层 Transformer。
    <strong>换成任何真实编码器（ViT、Whisper 编码器、频谱 CNN）都不改变这三段的结构</strong>，
    你要观察的是「哪一段在学、哪一段被冻结、图像到底有没有被用上」。
  </p>
<p>\[ X \in \mathbb{R}^{B \times C \times H \times W} \xrightarrow{\text{Unfold}} \mathbb{R}^{B \times N \times (P^2 C)} \xrightarrow{W_E} \mathbb{R}^{B \times N \times D} \]</p>
  <p><strong>要记录并解释的三个数字：</strong></p>
  <p>
    <strong>① <code>trainable / total</code>。</strong>它告诉你阶段一到底在训多少东西。
    真实项目里这个比例常常小于 1%；如果远大于 10%，说明编码器没冻住，你在花钱重训一个已经训好的编码器。
  </p>
  <p>
    <strong>② 原图与全零图的 loss 差。</strong>把 <code>torch.zeros_like(img)</code> 喂进去再测一次。
    如果两个 loss 几乎一样，说明<strong>语言模型根本没在用视觉输入</strong>：
    投影层在训，但信息没有流进预测。这是三段式训练最常见的静默失败，
    对策是先做纯对比对齐（9.2 那个损失）再进指令阶段，而不是直接端到端硬训。
  </p>
  <p>
    <strong>③ 视觉 token 数。</strong>这里刻意压到 16。把它乘上第 1 节的 \(M_{\text{kv}}\)，
    就是每张图追加的显存。真实项目里它是一个可调旋钮：
    降它省显存与算力、丢细节；升它相反。分辨率、切块、池化三个手段最终都是在调这个数。
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

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>以后接到这类项目时：以 crossfade 为例，该不该换架构、要不要多模态（你以后可以照此判断）</h4>
  <p>
    <strong>先量序列长度，这是唯一的选型输入（学完你就知道以后该怎么选）。</strong>假设音频按 22.05 kHz 采样、
    短时傅里叶用 1024 点窗 / 256 点跳步，则每秒约 \(22050/256 \approx 86\) 帧。
    100 BPM 下 16 拍是 \(16 \times 0.6 = 9.6\) 秒，也就是约 830 帧；
    两端各留 2.5 秒上下文，一共约 1260 帧。
    <em>把跳步减半、拍数翻倍，也只是两三千帧——它离 32K、128K 的注意力瓶颈差两个数量级。</em>
  </p>
  <p>
    把 1260 代进第 1 节的两张账单：注意力分数矩阵物化一次（\(h=32\)、fp16）是
    \(32 \times 1260^{2} \times 2 \approx 1.0\times10^{8}\) B，约 100 MB；
    KV 是 \(1260 \times 128\ \text{KiB} \approx 157\) MiB 每条序列，
    就算 batch 开到 32 也只有约 5 GiB。
    <strong>两者都不会成为瓶颈</strong>——所以 SSM、线性注意力、滑窗、MLA 这些为长序列准备的工具，
    在这类主任务上<em>都不值得引入</em>：它们能省的收益用不到，却要付出「内核不成熟 + 精确回忆变弱」的代价。
  </p>
  <p>
    <strong>默认答案</strong>：全局注意力加 GQA，批次内做 padding 与 mask，先跑通再谈优化。
    <strong>唯一可能值得重新选型的信号</strong>是任务形态变了：改成流式、要一整场演出连续推理
    （序列到几十万帧），或者要同时服务很多条长序列。
    那时按第 8 节的顺序来：KV 量化 → 滑窗 → 混合 → 换架构；前三项不需要重训，第四项通常要重训。
  </p>
  <p>
    <strong>多模态在 crossfade 这类任务里值得吗？值得，但方式不是「上一个 VLM 让它看图」。</strong>
    最划算的用法是：把频谱图当作图像，用预训练视觉编码器（或音频编码器）当特征提取器，
    接一个小投影层加回归头，输出 \(T^*\)、LUFS 这类连续量。
    这正是第 9 节的三段式，只是把「语言模型」换成「回归头」，
    成本从几十 GB 降到几 MB，而且不需要语言模型那套服务栈。
    反过来，如果以后要用 LLM 生成听感报告或标注，才需要真正的三段式 VLM：
    频谱图编码成视觉 token，喂给本地 4-bit 量化的助手模型（显存账见模块 23）。
  </p>
  <p>
    <strong>别做的事</strong>：为了一个 1260 帧的回归任务去预训练 SSM；
    或者为了让模型「理解音频」而端到端训一个多模态大模型。
    前者是拿长序列工具解决短序列问题，后者是拿几十 GB 显存解决一个三层 CNN 就能解决的问题——
    先用模块 09 的模型阶梯找到最便宜的基线。
  </p>
  <p>
    <strong>一句话答案</strong>：以 crossfade 这类任务为例，<em>不需要换架构</em>（序列只有一两千帧）；
    多模态<em>值得用</em>，但要用「编码器 + 投影层 + 小回归头」，而不是整套 VLM；
    只有当以后把任务扩成流式、整场推理时，第 7、8 节的选型表才真正开始起作用。
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

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">一张 24 GB 卡要服务 128K 上下文、并发 4 条；KV 用 fp16，参考配置每 token 128 KiB。为什么「GQA + fp16 KV」这个组合直接出局？</p>
  <ul class="opts">
    <li>因为权重的体积放不下</li>
    <li data-ok>4 条序列的 KV 需要约 64 GiB，超过整张卡的容量；必须先做 KV 量化或限制窗口，而不是继续优化权重</li>
    <li>因为注意力的算力不够</li>
    <li>因为 fp16 的 KV 精度不够</li>
  </ul>
  <p class="why">
    \(16\ \text{GiB} \times 4 = 64\) GiB，这还没算权重与激活。
    第 8 节的方法是先算 KV 预算（这里是 36 KiB/token），再拿候选去撞它。
    在长上下文下 KV 流量是权重的十几倍，所以只量化权重解决不了这个问题。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">一个 MoE 的总参数是 46.7B，每个 token 激活 12.9B。下面哪个说法正确？</p>
  <ul class="opts">
    <li>算力和显存都按 46.7B 计</li>
    <li data-ok>算力按 12.9B 计、显存按 46.7B 计；所以它在单张 24 GB 卡上装不下，MoE 买的是容量而不是省显存</li>
    <li>算力和显存都按 12.9B 计，所以它是免费的扩容</li>
    <li>激活参数越多，显存占用越小</li>
  </ul>
  <p class="why">
    所有专家都要常驻显存，而每个 token 只走被路由到的少数专家。
    这就是容量与算力分离的代价与好处：用显存换容量。
    单卡场景下正确的用法是把专家做小、个数减少（见 8.2），而不是加大扩容倍数。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">训练三段式多模态模型时，把输入图换成全零图，验证 loss 几乎没变化。最可能的原因是？</p>
  <ul class="opts">
    <li>学习率太小，需要调大</li>
    <li data-ok>语言模型没有真正使用视觉输入：投影层还没和语言模型对齐，视觉 token 对预测几乎没有贡献；应先用对比损失做对齐再进指令阶段</li>
    <li>编码器参数量太大</li>
    <li>需要把 KV cache 关掉</li>
  </ul>
  <p class="why">
    全零图是一个廉价的因果探针：如果去掉视觉输入对结果毫无影响，说明模型在只靠文本先验预测。
    这正是 9.1 与 9.2 的顺序问题——先用 InfoNCE 把投影层对齐，再做端到端指令微调，
    比一开始就硬训三段要稳得多。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">以 crossfade 这类任务为例：模型输入是约 1260 帧的频谱序列（一次过渡加少量上下文），要预测一个连续标量。架构上的默认选择是？</p>
  <ul class="opts">
    <li>换成 SSM 或线性注意力，因为线性复杂度更省</li>
    <li data-ok>保持全局注意力加 GQA，先跑通；1260 帧远没到注意力的瓶颈，换架构只会引入不成熟的内核与更弱的精确回忆</li>
    <li>换成扩散语言模型，因为可以并行生成</li>
    <li>必须上 MLA 才装得下</li>
  </ul>
  <p class="why">
    长序列架构解决的是几十万 token 的问题。1260 帧的序列上，KV 只有百 MiB 量级，
    瓶颈在数据质量与评估协议，不在注意力复杂度。
    只有当任务扩成流式、整场连续推理时，第 7、8 节的选型表才真正开始起作用。
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
