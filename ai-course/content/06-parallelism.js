/* content/06-parallelism.js — 模块 06：并行与分布式训练 */
COURSE.register({
  id: "m6",
  part: 2,
  num: "06",
  title: "并行训练：从单卡到多卡，以及 JAX 的写法",
  en: "Distributed Training & JAX Parallelism",
  minutes: 40,
  tags: ["训练", "系统", "JAX"],
  body: String.raw`
<p class="lead">
  模块 04 已经算出：7B 模型做全参数 AdamW 训练需要约 112 GB 显存。单卡放不下，
  于是必须把「参数、梯度、优化器状态、激活值」切到多张卡上——这就是并行。
  这一模块给出四种切分的分工、代价，以及 JAX 里怎么写。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：一队人抬一块大石头。石头可以按<em>人</em>切（每个人抬一份，数据并行），
    也可以按<em>部位</em>切（有人抬左边有人抬右边，张量并行）——切法不同，喊口号（通信）的次数差很多。<br />
    <strong>这一讲要建立的直觉</strong>：并行不是「卡越多越快」，而是「把最贵的通信放在最快的连接上」。<br />
    <strong>读完你能回答</strong>：为什么张量并行通常只能待在一台机器内部？JAX 里那三行 Mesh 代码在声明什么？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你有 8 张卡。把模型切成 8 份就能训练了吗？<strong>不能</strong>——切法决定了通信量，
    而通信量决定了你有没有真的加速。最坏的情况下，加卡只会更慢。
  </p>
</section>

<h3>1. 四种并行，各自切什么</h3>
<table class="tbl">
  <thead><tr><th>方式</th><th>切什么</th><th>通信模式</th><th>适用场景</th></tr></thead>
  <tbody>
    <tr><td><strong>数据并行 DP / DDP</strong></td><td>不切模型，切数据；每卡一份完整模型</td><td>每步对梯度做一次 all-reduce</td><td>模型能装进单卡时的默认选择</td></tr>
    <tr><td><strong>ZeRO / FSDP</strong></td><td>把参数、梯度、优化器状态分片到各卡，用前才 all-gather</td><td>每层 all-gather + reduce-scatter</td><td>模型放不进单卡，但单机内带宽高</td></tr>
    <tr><td><strong>张量并行 TP</strong></td><td>切单层内部的矩阵（按列/按行）</td><td>每层两次 all-reduce，<strong>频率最高</strong></td><td>单机 NVLink 内；跨机通常不划算</td></tr>
    <tr><td><strong>流水线并行 PP</strong></td><td>按层切分成若干 stage</td><td>只在 stage 边界传激活</td><td>跨机；代价是气泡（bubble）</td></tr>
    <tr><td>序列并行 / 上下文并行</td><td>切序列维度（含激活与 KV）</td><td>注意力处需要通信</td><td>长上下文训练</td></tr>
    <tr><td>专家并行 EP</td><td>MoE 的不同专家放不同卡</td><td>all-to-all（最贵）</td><td>超大规模 MoE</td></tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>通信量：为什么张量并行不能跨机</h4>
  <p><strong>数据并行</strong>每步只需一次梯度 all-reduce，通信量约为 \(2N\) 个参数（ring all-reduce 的经典结果）：</p>
  \[ \text{Comm}_{\text{DP}} \approx 2N \ \text{elements} \quad(\text{almost independent of the number of GPUs}) \]
  <p><strong>张量并行</strong>每层都要通信激活，共 \(2L\) 次，且与批量大小成正比：</p>
  \[ \text{Comm}_{\text{TP}} \approx 2L \cdot B \cdot S \cdot d \ \text{elements} \]
  <p>
    代入 \(L = 32\)、\(B\cdot S = 10^{4}\)、\(d = 4096\)：
    \(\text{Comm}_{\text{TP}} \approx 2 \times 32 \times 10^{4} \times 4096 \approx 2.6\times 10^{9}\) 个元素；
    而同规模模型 \(N \approx 6.4\times 10^{9}\) 时 \(\text{Comm}_{\text{DP}} \approx 2N \approx 12.8\times 10^{9}\) 个元素——单看总量 TP 反而更小。
    真正的杀伤是<strong>频率</strong>：TP 每步要做 \(2L = 64\) 次小包 all-reduce，单次小、无法与计算重叠，跨机延迟会把它吃光；
    而 DP 每步只有 1 次大包 all-reduce，可与反向计算重叠。当 \(B\cdot S\) 放大到 \(10^{5}\)–\(10^{6}\) 时，TP 总量反超约 2–20 倍。
    这才是「TP 必须待在 NVLink 域内、PP 才适合跨机」的量化理由。
  </p>
  <p><strong>流水线并行</strong>的代价是气泡：若分成 \(p\) 个 stage、\(m\) 个 micro-batch，气泡比例约</p>
  \[ \text{bubble} \approx \frac{p-1}{m+p-1} \]
  <p>所以流水线并行必须配合足够多的 micro-batch（梯度累积）才能把利用率拉回来。</p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先拿 2 张卡热身：ring 通信到底搬了多少数</h4>
  <p>2 张卡做数据并行：每卡发出约一半梯度、收回约一半，单卡搬运约 \(N\) 个元素；卡数加到 \(P\) 张，单卡搬运仍是约 \(2N\) 量级——不随卡数涨，这就是 DP 敢跨机的底气。</p>
  <p>同样 2 张卡做张量并行：每层 2 次 all-reduce，每次只搬 \(B \cdot S \cdot d\) 个激活，\(L = 32\) 时一共 64 次小包——单次小到塞不满跨机带宽，全耗在延迟上，只能待在 NVLink 里；而流水线并行只在 stage 边界传一次激活，天生适合跨机。</p>
  <p>LLM 回报：配机器时先数「每步几次通信」再算总量；64 次小包一跨机，延迟直接吃掉加速比，省带宽的钱不如省拓扑的命。</p>
</section>

<h3>2. 草稿纸演算区：从分块矩阵到 Megatron-LM 与 3D 并行</h3>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：前置定义与通信算子约定</h4>
  <p>
    给 Charles 的打草稿顺序：先明确矩阵分块在代数上的行列规则，再对齐通信算子的集合语义。
    每一步在纸上写清张量形状（Shape）与设备归属，直观理解分布式系统中的数据切分。
  </p>
  <p>
    <strong>前置定义 1（分块矩阵乘法 Block Matrix Multiplication）：</strong>
    设矩阵 \(A \in \mathbb{R}^{m \times k}, B \in \mathbb{R}^{k \times n}\)。若将 \(A\) 按列切分为 \(p\) 块，\(B\) 按行切分为 \(p\) 块：
  </p>
  \[ A = [A_1 \mid A_2 \mid \dots \mid A_p], \qquad B = \begin{bmatrix} B_1 \\ B_2 \\ \vdots \\ B_p \end{bmatrix} \]
  <p>
    其中 \(A_i \in \mathbb{R}^{m \times k_i}, B_i \in \mathbb{R}^{k_i \times n}\) 且 \(\sum_{i=1}^p k_i = k\)。则矩阵乘积可展开为分块乘积之和：
  </p>
  \[ AB = \sum_{i=1}^p A_i B_i = A_1 B_1 + A_2 B_2 + \dots + A_p B_p \]
  <p>
    若将 \(B\) 按列切分 \(B = [B_1 \mid B_2 \mid \dots \mid B_p]\)，则 \(AB = [AB_1 \mid AB_2 \mid \dots \mid AB_p]\)。
  </p>
  <p>
    <strong>前置定义 2（列分块 Column Partition 与行分块 Row Partition）：</strong>
    在神经网络线性层 \(Y = XW\) 中（输入 \(X \in \mathbb{R}^{b \times d_{\text{in}}}\)，权重 \(W \in \mathbb{R}^{d_{\text{in}} \times d_{\text{out}}}\)）：
  </p>
  <ul>
    <li><strong>列分块（Column Parallel）：</strong>权重按输出通道列切 \(W = [W_1 \mid W_2]\)。各卡持有 \(W_i \in \mathbb{R}^{d_{\text{in}} \times (d_{\text{out}}/2)}\)。输入 \(X\) 完整广播到各卡，卡内各自计算 \(Y_i = X W_i\)。输出自然横向拼接为 \(Y = [Y_1 \mid Y_2]\)，<strong>前向计算完全无需跨卡通信</strong>！</li>
    <li><strong>行分块（Row Parallel）：</strong>权重按输入通道行切 \(W = \begin{bmatrix} W_1 \\ W_2 \end{bmatrix}\)。输入也相应切分为列分块 \(X = [X_1 \mid X_2]\)。各卡持有局部输入与局部权重，独立计算部分和 \(Y_i = X_i W_i\)。全局真实输出必须求和：\(Y = Y_1 + Y_2\)。<strong>此时必须调用一次跨卡规约（Sum Reduction）通信</strong>！</li>
  </ul>
  <p>
    <strong>前置定义 3（集合通信算子 Collective Primitives）：</strong>
    设集群有 \(P\) 张 GPU，每张卡持有大小为 \(M\) 的张量分片：
  </p>
  <table class="tbl small">
    <thead><tr><th>通信算子</th><th>各卡输入状态</th><th>通信后各卡输出</th><th>Ring 拓扑通信数据量</th></tr></thead>
    <tbody>
      <tr><td><strong>All-Reduce</strong></td><td>每卡各有一份局部张量 \(T_i \in \mathbb{R}^M\)</td><td>所有卡都得到完全一致的求和 \(\sum_{i=1}^P T_i\)</td><td>\(2 \times \frac{P-1}{P} M \approx 2M\)</td></tr>
      <tr><td><strong>Reduce-Scatter</strong></td><td>每卡各有一份局部张量 \(T_i \in \mathbb{R}^M\)</td><td>第 \(i\) 张卡仅获得分片结果 \((\sum_{j=1}^P T_j)_i \in \mathbb{R}^{M/P}\)</td><td>\(\frac{P-1}{P} M \approx M\)</td></tr>
      <tr><td><strong>All-Gather</strong></td><td>第 \(i\) 张卡持有一小块分片 \(t_i \in \mathbb{R}^{M/P}\)</td><td>所有卡都收集拼接齐完整的全量张量 \([t_1 \mid \dots \mid t_P] \in \mathbb{R}^M\)</td><td>\(\frac{P-1}{P} M \approx M\)</td></tr>
      <tr><td><strong>Broadcast</strong></td><td>仅根节点持有张量 \(T \in \mathbb{R}^M\)</td><td>所有节点均复制一份完整的 \(T\)</td><td>\(\frac{P-1}{P} M \approx M\)</td></tr>
    </tbody>
  </table>
  <p>
    核心恒等式：\(\text{All-Reduce} \equiv \text{Reduce-Scatter} + \text{All-Gather}\)。ZeRO-3 与 FSDP 的参数切分机制正是将 All-Reduce 拆解为这两个半程算子。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：Megatron-LM 张量并行极简小数字手算（4×4 矩阵）</h4>
  <p>
    两层 MLP 结构为 \(Y = \sigma(X W_1) W_2\)，其中 \(\sigma\) 为逐元素激活函数（如 ReLU / GeLU）。
    设设备数 \(P=2\)（GPU 0 与 GPU 1），维度 \(b=4, d=4, d_{ff}=4\)。
    输入矩阵为 \(4 \times 4\) 整数矩阵：
  </p>
  \[ X = \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 2 & 0 & 1 \\ 1 & 1 & 1 & 0 \\ 0 & 0 & 2 & 1 \end{bmatrix} \]
  <p>
    <strong>权重切分规划：</strong>第一层 \(W_1\) 采用<strong>列分块</strong>，第二层 \(W_2\) 采用<strong>行分块</strong>：
  </p>
  \[ W_1 = [W_{1,1} \mid W_{1,2}], \qquad W_{1,1} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 0 \\ 0 & 1 \end{bmatrix}, \quad W_{1,2} = \begin{bmatrix} 0 & 2 \\ 1 & 0 \\ 0 & 1 \\ 1 & 0 \end{bmatrix} \]
  \[ W_2 = \begin{bmatrix} W_{2,1} \\ W_{2,2} \end{bmatrix}, \qquad W_{2,1} = \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 1 & 0 & 1 \end{bmatrix}, \quad W_{2,2} = \begin{bmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \end{bmatrix} \]
  <p><strong>草稿第 1 步：GPU 0 与 GPU 1 本地并行计算第一层（零通信）</strong></p>
  <p>
    GPU 0 独立计算 \(Z_1 = X W_{1,1} \in \mathbb{R}^{4 \times 2}\)：
  </p>
  \[ Z_1 = \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 2 & 0 & 1 \\ 1 & 1 & 1 & 0 \\ 0 & 0 & 2 & 1 \end{bmatrix} \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 0 \\ 0 & 1 \end{bmatrix} = \begin{bmatrix} 1+1 & 0 \\ 0 & 2+1 \\ 1+1 & 1 \\ 2 & 1 \end{bmatrix} = \begin{bmatrix} 2 & 0 \\ 0 & 3 \\ 2 & 1 \\ 2 & 1 \end{bmatrix} \]
  <p>
    GPU 1 独立计算 \(Z_2 = X W_{1,2} \in \mathbb{R}^{4 \times 2}\)：
  </p>
  \[ Z_2 = \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 2 & 0 & 1 \\ 1 & 1 & 1 & 0 \\ 0 & 0 & 2 & 1 \end{bmatrix} \begin{bmatrix} 0 & 2 \\ 1 & 0 \\ 0 & 1 \\ 1 & 0 \end{bmatrix} = \begin{bmatrix} 0 & 2+1 \\ 2+1 & 0 \\ 1 & 2+1 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 0 & 3 \\ 3 & 0 \\ 1 & 3 \\ 1 & 2 \end{bmatrix} \]
  <p><strong>草稿第 2 步：逐元素激活函数的数学穿透（零通信的关键）</strong></p>
  <p>
    取激活函数 \(\sigma(z) = \max(0, z)\)（ReLU）。由于 \(Z_1, Z_2\) 元素均非负，激活后 \(H_1 = \sigma(Z_1) = Z_1, H_2 = \sigma(Z_2) = Z_2\)。
    <strong>数学审视：</strong>因为激活函数是逐元素作用（Element-wise）的，列拼接与非线性函数严格可交换：
  </p>
  \[ \sigma([Z_1 \mid Z_2]) = [\sigma(Z_1) \mid \sigma(Z_2)] = [H_1 \mid H_2] \]
  <p>
    这意味着：<strong>两张卡根本不需要把 \(Z_1\) 与 \(Z_2\) 汇总拼接</strong>，直接在各自显存内对局部中间张量执行激活计算！
  </p>
  <p><strong>草稿第 3 步：第二层行切分局部矩阵乘法（零通信）</strong></p>
  <p>
    GPU 0 持有 \(H_1 \in \mathbb{R}^{4 \times 2}\) 与行切权重 \(W_{2,1} \in \mathbb{R}^{2 \times 4}\)，独立计算部分积 \(Y_1 = H_1 W_{2,1} \in \mathbb{R}^{4 \times 4}\)：
  </p>
  \[ Y_1 = \begin{bmatrix} 2 & 0 \\ 0 & 3 \\ 2 & 1 \\ 2 & 1 \end{bmatrix} \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 1 & 0 & 1 \end{bmatrix} = \begin{bmatrix} 2 & 0 & 2 & 0 \\ 0 & 3 & 0 & 3 \\ 2 & 1 & 2 & 1 \\ 2 & 1 & 2 & 1 \end{bmatrix} \]
  <p>
    GPU 1 持有 \(H_2 \in \mathbb{R}^{4 \times 2}\) 与行切权重 \(W_{2,2} \in \mathbb{R}^{2 \times 4}\)，独立计算部分积 \(Y_2 = H_2 W_{2,2} \in \mathbb{R}^{4 \times 4}\)：
  </p>
  \[ Y_2 = \begin{bmatrix} 0 & 3 \\ 3 & 0 \\ 1 & 3 \\ 1 & 2 \end{bmatrix} \begin{bmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \end{bmatrix} = \begin{bmatrix} 0 & 0 & 3 & 3 \\ 3 & 3 & 0 & 0 \\ 1 & 1 & 3 & 3 \\ 1 & 1 & 2 & 2 \end{bmatrix} \]
  <p><strong>草稿第 4 步：单次 All-Reduce 聚合全量输出</strong></p>
  <p>
    根据分块矩阵乘法原理，全局完整输出恰为两卡局部部分积的代数相加：
  </p>
  \[ Y = H W_2 = [H_1 \mid H_2] \begin{bmatrix} W_{2,1} \\ W_{2,2} \end{bmatrix} = H_1 W_{2,1} + H_2 W_{2,2} = Y_1 + Y_2 \]
  \[ Y = \begin{bmatrix} 2 & 0 & 2 & 0 \\ 0 & 3 & 0 & 3 \\ 2 & 1 & 2 & 1 \\ 2 & 1 & 2 & 1 \end{bmatrix} + \begin{bmatrix} 0 & 0 & 3 & 3 \\ 3 & 3 & 0 & 0 \\ 1 & 1 & 3 & 3 \\ 1 & 1 & 2 & 2 \end{bmatrix} = \begin{bmatrix} 2 & 0 & 5 & 3 \\ 3 & 6 & 0 & 3 \\ 3 & 2 & 5 & 4 \\ 3 & 2 & 4 & 3 \end{bmatrix} \]
  <p>
    <strong>代数证明结论：为什么必须是「列切 + 行切」？</strong>
    若颠倒顺序为「行切 + 列切」：第一层行切输出为 \(X_1 W_{1,1} + X_2 W_{1,2}\)，由于非线性激活函数对加法不满足分配律（\(\sigma(u + v) \neq \sigma(u) + \sigma(v)\)），必须在进入激活函数前强制做一次 All-Reduce 通信；第二层列切结束又需做通信收集，两层 MLP 前向将需要 2 次通信。
    而<strong>「列切 \(W_1\) \(\to\) 逐元素激活 \(\to\) 行切 \(W_2\)」的优雅设计，利用了非线性算子对列拼接的可交换性，将通信完全延后到了第二层末尾，使整个 MLP 块仅需 1 次 All-Reduce</strong>！
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：3D 并行显存与通信量代数手算</h4>
  <p>
    设大模型总参数量为 \(\Phi\)（以 16-bit 浮点存储，每参数 2 字节），隐藏层维度为 \(d\)，层数为 \(L\)，序列长度为 \(S\)，单卡 micro-batch 大小为 \(b\)。
    集群划分为 3D 拓扑：张量并行度 \(t\)（TP）、流水线并行度 \(p\)（PP）、数据并行度 \(d_p\)（DP），总 GPU 数 \(N_{\text{gpu}} = t \cdot p \cdot d_p\)。
  </p>
  <p><strong>1. 单卡显存占用代数式（四项拆解）：</strong></p>
  <ul>
    <li><strong>模型参数（Parameters）：</strong>全模型参数被 TP 按列/行切分，被 PP 按层切分，单卡显存为：
      \[ M_{\text{param}} = \frac{2\Phi}{t \cdot p} \quad (\text{bytes}) \]
    </li>
    <li><strong>梯度（Gradients）：</strong>反向传播时对应的 fp16/bf16 梯度显存为：
      \[ M_{\text{grad}} = \frac{2\Phi}{t \cdot p} \quad (\text{bytes}) \]
    </li>
    <li><strong>优化器状态（Optimizer States - AdamW）：</strong>
      标准 AdamW 需维护 fp32 主权重（4 字节）、fp32 一阶动量（4 字节）、fp32 二阶动量（4 字节），共 12 字节/参数。
      在纯 TP+PP 下为 \(\frac{12\Phi}{t \cdot p}\)；若开启 ZeRO-1 / FSDP 优化器状态分片，状态在 DP 维度均摊：
      \[ M_{\text{opt}} = \frac{12\Phi}{t \cdot p \cdot d_p} = \frac{12\Phi}{N_{\text{gpu}}} \quad (\text{bytes}) \]
    </li>
    <li><strong>激活值显存（Activations）：</strong>
      在选择性激活重计算（Selective Activation Recomputation）下，注意力与 MLP 的线性投影被释放，仅保留必须的输入，单卡激活量为：
      \[ M_{\text{act}} \approx \frac{L}{p} \cdot \frac{b \cdot S \cdot d}{t} \cdot c_{\text{act}} \quad (\text{bytes}) \]
      其中 \(c_{\text{act}}\) 为单层保留张量常数（通常约 10–14 字节）。
    </li>
  </ul>
  <p><strong>2. 通信量代数手算与拓扑映射原则：</strong></p>
  <p>单位约定：\(\Phi\) 为全模型参数量（与上文 \(M_{\text{param}}\) 中一致），\(c\) 为每元素字节数（bf16 取 \(c = 2\)，fp32 取 \(c = 4\)）；下表字节数一律写成元素个数 \(\times\, c\)，不再混用裸数字。</p>
  <table class="tbl small">
    <thead><tr><th>并行维度</th><th>每步发生通信的频次</th><th>单卡单步通信量代数式</th><th>硬件映射要求与理由</th></tr></thead>
    <tbody>
      <tr><td><strong>TP（张量并行）</strong></td><td>每层前向 2 次 + 反向 2 次（共 \(4L\) 次 All-Reduce）</td><td>\(4L \cdot 2 \frac{t-1}{t} \cdot b S d \times c\) 字节</td><td><strong>必须在单机 NVLink 域内（900 GB/s）</strong>。若跨机走 IB（50 GB/s），每步通信耗时将超过计算时间 5 倍以上。</td></tr>
      <tr><td><strong>PP（流水线并行）</strong></td><td>仅在 stage 边界传递边界激活与梯度，每 micro-batch 1 次前向 + 1 次反向</td><td>\(2 \cdot m \cdot b S d \times c\) 字节（\(m\) 为 micro-batch 数量）</td><td><strong>适合跨机（走 InfiniBand）</strong>。通信量极小，只传单层输出，但需通过增加 \(m\) 压缩气泡率 \(\frac{p-1}{m+p-1}\)。</td></tr>
      <tr><td><strong>DP（数据并行）</strong></td><td>每步反向结束对梯度做 1 次 All-Reduce</td><td>\(2 \frac{d_p-1}{d_p} \cdot \frac{c\,\Phi}{t \cdot p}\) 字节</td><td><strong>适合跨节点机架间</strong>。通信量只与参数量相关，与上下文长度 \(S\) 无关，可完全与反向计算重叠（Overlap）。</td></tr>
    </tbody>
  </table>
</section>

<h3>3. 选择顺序（照这个顺序做，别跳）</h3>
<div class="flow">
  <div class="nd hi">1. 单卡能装下？</div><div class="ar">→</div>
  <div class="nd">DDP + 梯度累积</div><div class="ar">→</div>
  <div class="nd hi">2. 装不下？</div><div class="ar">→</div>
  <div class="nd">FSDP / ZeRO-3</div><div class="ar">→</div>
  <div class="nd hi">3. 还不够？</div><div class="ar">→</div>
  <div class="nd">TP（机内）+ PP（跨机）</div>
</div>
<p>
  实践中的组合通常是：<strong>TP=8（机内） × PP=2–8（跨机） × DP=其余</strong>。
  对个人研究者而言，能用的多半只有前两级（单卡 LoRA、或 Colab 上的 FSDP 小模型）——
  <em>知道后面的层级，是为了能读懂大厂的训练报告，而不是为了自己复现。</em>
</p>

<h3>4. JAX 的写法：把切分写进「类型」</h3>
<p>
  JAX 与 PyTorch 的哲学差异在并行上最明显。PyTorch 需要显式插入集合通信（或靠 FSDP 包装类），
  而 JAX 把 <strong>sharding 声明为数组类型的一部分</strong>，由 XLA 编译器自动插入通信（GSPMD）。
</p>
<p>
  在现代并行计算框架（如 JAX / PyTorch DTensor）中，多卡切分的本质可以通过两行微声明展示：
</p>
<pre><code>sharding = NamedSharding(mesh, PartitionSpec('data', None))
sharded_x = jax.device_put(x, sharding)</code></pre>
<p>
  <strong>逐行代数解析</strong>：<code>PartitionSpec('data', None)</code> 声明张量的物理切分规格——批量样本轴沿着设备网格的 <code>data</code> 轴切开分发至各张卡，特征隐藏轴保持完整不切分；<code>jax.device_put</code> 指挥硬件通过高速总线完成内存映射与设备广播，无需开发者手工写网络套接字传输。
</p>
<p>
  同样的模型，改成「8 路纯数据并行」只需要把 <code>mesh</code> 换成 <code>(8, 1)</code>，
  这正是教程里那句话的含义：<em>JAX 让不同切分策略之间的切换变成一行代码</em>。
</p>

<h3>5. JAX 生态速查（对照 PyTorch）</h3>
<table class="tbl small">
  <thead><tr><th>功能</th><th>PyTorch</th><th>JAX</th></tr></thead>
  <tbody>
    <tr><td>自动微分</td><td><code>loss.backward()</code></td><td><code>jax.grad</code> / <code>nnx.value_and_grad</code></td></tr>
    <tr><td>编译与融合</td><td><code>torch.compile</code></td><td><code>jax.jit</code>（XLA）</td></tr>
    <tr><td>模型定义</td><td><code>nn.Module</code></td><td>Flax NNX <code>nnx.Module</code></td></tr>
    <tr><td>优化器</td><td><code>torch.optim.AdamW</code></td><td>Optax <code>optax.adamw</code>（函数式）</td></tr>
    <tr><td>数据管道</td><td><code>DataLoader</code></td><td>Grain（<code>grain.python</code>）</td></tr>
    <tr><td>检查点</td><td><code>torch.save</code> / safetensors</td><td>Orbax</td></tr>
    <tr><td>并行</td><td>DDP / FSDP / 手写 TP</td><td>Mesh + PartitionSpec（编译器自动插入通信）</td></tr>
    <tr><td>重计算</td><td><code>torch.utils.checkpoint</code></td><td><code>jax.checkpoint</code> / <code>nnx.remat</code></td></tr>
    <tr><td>硬件重心</td><td>NVIDIA GPU</td><td>TPU 与 GPU 都很自然</td></tr>
  </tbody>
</table>
<p>
  推荐路径：<a href="https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html" target="_blank" rel="noopener">JAX AI Stack《Train a miniGPT language model with JAX》</a>
  是这门课里唯一需要你逐行跑完的外部教程。它用 TinyStories 数据、Tiktoken 分词、Grain 加载、
  并在 Kaggle 的 TPU v5e-8 上做 4×2 的混合并行。<strong>注意一个现实约束：截至 2025 年 10 月，Colab 免费层只提供单核 TPU v5e-1，无法使用 SPMD 多设备并行</strong>——
  要在 Colab 上体验多设备，需要更高级别的运行时或改用 Kaggle。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>OOM 排查清单（按顺序试）</h4>
  <ol>
    <li>先降<strong>批大小 × 序列长度</strong>（对激活值是线性因子，最有效）。</li>
    <li>打开<strong>激活重计算</strong>（省 60%–80% 激活显存，代价约 30% 算力）。</li>
    <li>打开<strong>梯度累积</strong>：用更小的 micro-batch 达到同样的全局批大小。</li>
    <li>换<strong>优化器</strong>：8-bit Adam / Adafactor 可把优化器状态从 8 字节/参数降到 2 字节。</li>
    <li>上 <strong>FSDP / ZeRO-3</strong>，或改用 LoRA/QLoRA（不训练绝大多数参数）。</li>
    <li>还没解决？<em>模型太大，换小的。</em>在 1B 以下把方法验证清楚，收益远大于硬撑 7B。</li>
  </ol>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">为什么张量并行通常只在单机内使用？</p>
  <ul class="opts">
    <li>因为跨机不支持张量并行</li>
    <li data-ok>它每层都要通信激活，通信量与层数、批量、序列长度成正比，跨机延迟会抵消收益</li>
    <li>因为它是让参数量翻倍</li>
    <li>因为张量并行只能用于 MoE</li>
  </ul>
  <p class="why">
    数据并行每步只有一次梯度 all-reduce（通信量约 \(2N\)，与卡数无关）；
    张量并行每步有 \(2L = 64\) 次激活小包通信：总量随 \(B\cdot S\) 增长（\(10^{4}\) 时约 \(2.6\times 10^{9}\) 个元素，与 \(2N\) 相当），
    但高频小包无法与计算重叠，所以它需要 NVLink 这类高带宽低延迟互联。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">用流水线并行分成 \(p=8\) 个 stage，micro-batch 数 \(m=8\)，气泡比例约为？</p>
  <ul class="opts">
    <li>约 12.5%</li>
    <li data-ok>约 46.7%</li>
    <li>约 87.5%</li>
    <li>约 6.3%</li>
  </ul>
  <p class="why">
    \((p-1)/(m+p-1) = 7/15 \approx 46.7\%\)。接近一半的算力被浪费在等待上。
    增大 \(m\)（更多 micro-batch / 梯度累积）是唯一有效的补救：\(m=64\) 时气泡降到约 10%。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">在 JAX 中声明 <code>PartitionSpec(None, 'model')</code> 用于某个权重矩阵，含义是？</p>
  <ul class="opts">
    <li>该矩阵完全复制到每个设备</li>
    <li data-ok>第一维不切分，第二维沿网格的 <code>model</code> 轴切分（张量并行）</li>
    <li>该矩阵不参与训练</li>
    <li>沿 batch 轴切分</li>
  </ul>
  <p class="why">
    <code>PartitionSpec</code> 的元素与张量维度一一对应，<code>None</code> 表示复制。
    这正是教程里把权重按 <code>'model'</code> 轴切分、把激活按 <code>'batch'</code> 轴切分的写法；
    剩下的通信插入由 XLA 的 GSPMD 编译器完成。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">Megatron-LM 在两层 MLP（\(Y = \sigma(X W_1) W_2\)）中，为什么第一层 \(W_1\) 采用列切分、第二层 \(W_2\) 采用行切分？</p>
  <ul class="opts">
    <li>因为行切分比列切分的显存占用更小</li>
    <li data-ok>列切输出自然按列拼接，逐元素激活函数满足 \(\sigma([Z_1 \mid Z_2]) = [\sigma(Z_1) \mid \sigma(Z_2)]\) 无需通信，与第二层行切分自然相加衔接，使整个 MLP 块仅需 1 次 All-Reduce</li>
    <li>为了让输入 \(X\) 在第一层就被切分以减少通信</li>
    <li>因为第二层必须做 Softmax 归一化</li>
  </ul>
  <p class="why">
    若先做行切分，第一层输出是两卡部分和相加；由于非线性激活函数 \(\sigma\) 对加法不满足分配律（\(\sigma(u+v) \neq \sigma(u)+\sigma(v)\)），必须在激活前强行做一次 All-Reduce，导致两层 MLP 总共需要 2 次通信。先列切再行切的设计巧妙避开了激活前的规约通信。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">在 3D 并行混合配置下（设参数量 \(\Phi = 70 \times 10^9\)，\(TP=8, PP=4, DP=8\)，采用 16-bit 权重，开启 ZeRO-1 对优化器状态分片），单卡存储 AdamW 优化器状态（fp32 动量与主权重共 12 字节/参数）所需的显存约为？</p>
  <ul class="opts">
    <li>约 105 GB</li>
    <li>约 26.25 GB</li>
    <li data-ok>约 3.28 GB</li>
    <li>约 840 GB</li>
  </ul>
  <p class="why">
    AdamW 全量优化器状态总大小为 \(12 \times 70\text{B} = 840\text{GB}\)。总 GPU 数为 \(N_{\text{gpu}} = TP \times PP \times DP = 8 \times 4 \times 8 = 256\)。开启 ZeRO-1 后，优化器状态在全集群 256 张卡上均匀分片：\(M_{\text{opt}} = 840\text{GB} / 256 \approx 3.28\text{GB}\)。相比未分片时的 \(840 / (8 \times 4) = 26.25\text{GB}\)，显存大幅降低。
  </p>
</div>

<div class="acc" data-t="深入：一个 7B 模型的实际并行配方" data-badge="工程">
  <div class="acc-body">
    <p>假设 64 张 A100 80 GB、机内 NVLink 8 卡、机间 InfiniBand：</p>
    <table class="tbl small">
      <thead><tr><th>维度</th><th>取值</th><th>理由</th></tr></thead>
      <tbody>
        <tr><td>TP</td><td>8</td><td>正好用满机内 NVLink 域，通信最贵的部分不跨机</td></tr>
        <tr><td>PP</td><td>2–4</td><td>跨机通信量小；用足量 micro-batch 压气泡</td></tr>
        <tr><td>DP</td><td>其余（64/(TP×PP)）</td><td>扩大全局批大小，收敛更稳</td></tr>
        <tr><td>优化器状态</td><td>ZeRO-1/2（配合 DP）</td><td>把 8 字节/参数的状态均摊，避免显存成为瓶颈</td></tr>
        <tr><td>激活</td><td>全部重计算</td><td>激活是唯一随序列长度爆炸的项</td></tr>
      </tbody>
    </table>
    <p><strong>关键洞察</strong>：并行配置不是「越多越好」，而是<em>让最贵的那类通信待在最快的互联里</em>。
    这句话是性能工程的核心，也同样适用于你的单机实验：把最重的循环放内存、把最频繁的访问放缓存。</p>
  </div>
</div>
`
});
