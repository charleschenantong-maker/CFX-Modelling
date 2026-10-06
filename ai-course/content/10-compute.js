/* content/10-compute.js — 模块 10：你的算力与工具链 */

COURSE.register({

  id: "m10",

  part: 3,

  num: "10",

  title: "真实大模型算力法则：Roofline 瓶颈模型、6N FLOPs 矩阵证明与 MFU 评测",

  en: "Real-world LLM Compute Scaling: Roofline Model, 6N FLOPs Matrix Proof & MFU Evaluation",

  minutes: 35,

  tags: ["工业集群", "Roofline", "6N FLOPs", "MFU"],

  body: String.raw`

<p class="lead">
  在真实的现代大语言模型系统工程中，算力不再是一个抽象的数字，而是由硬件极限（Memory Wall）、浮点计算密度（FLOPs）、以及集群利用率（MFU）严格决定的物理系统。本章彻底剥离个人小实验工具，带你建立起工业级真实大模型的“算力物理底座”：从 Roofline 模型与算术强度推演，到标准 Transformer 经典 6N FLOPs/token 的严格矩阵微积分推导，再到 8×A100 / H100 训练集群的 MFU 真实工程手算。
</p>

<h3>1. 工业级真实大模型算力阶梯与集群规模</h3>
<table class="tbl">
  <thead><tr><th>模型规模</th><th>典型训练语料 (Token)</th><th>理论预训练计算量 (6ND FLOPs)</th><th>典型集群硬件规模</th><th>训练物理周期</th></tr></thead>
  <tbody>
    <tr><td><strong>7B (如 LLaMA-2/3-8B)</strong></td><td>2.0 ~ 15.0 万亿 (T)</td><td>\(8.4 \times 10^{22} \sim 6.3 \times 10^{23}\)</td><td>1,024 ~ 2,048 张 H100 SXM5</td><td>约 14 ~ 30 天</td></tr>
    <tr><td><strong>70B (如 LLaMA-3-70B)</strong></td><td>15.0 万亿 (T)</td><td>\(6.3 \times 10^{24}\) FLOPs</td><td>4,096 ~ 8,192 张 H100 SXM5</td><td>约 25 ~ 45 天</td></tr>
    <tr><td><strong>405B (如 LLaMA-3-405B)</strong></td><td>15.6 万亿 (T)</td><td>\(3.8 \times 10^{25}\) FLOPs</td><td>16,384 张 H100 SXM5（RoCEv2 / IB 互联）</td><td>约 54 天（集群 MFU ≈ 38%–41%）</td></tr>
  </tbody>
</table>
<p>
  <strong>工业级工程直觉</strong>：为什么前沿大模型从来不是单卡能跑的？因为哪怕用一张当今最强规格的 H100 SXM5（半精度 Tensor Core 峰值每秒近 \(10^{15}\) 次浮点运算），训练 70B 模型也需要<strong>单卡不吃不喝连续计算 200 年</strong>！因此，大规模分布式集群并行、网络拓扑互联、以及避免访存瓶颈的极致算子优化，是大模型系统工程的绝对核心。
</p>

<h3>2. 硬件极限与 Roofline 模型：算术强度与访存瓶颈推演</h3>

<section class="blk blk-m">

  <h4><span class="ic">∑</span>前置定义与符号约定</h4>

  <ul>

    <li><strong>浮点运算次数（FLOPs, Floating Point Operations）</strong>：衡量计算工作量的无量纲次数。注意末尾小写 <code>s</code> 代表复数（操作数），以区别于算力速率单位 <code>FLOPS</code>（FLOP/s, 每秒浮点操作次数）。</li>

    <li><strong>乘加运算（MACs, Multiply-Accumulate）</strong>：计算机底层执行 \( a \leftarrow a + (b \times c) \)。包含 1 次乘法与 1 次加法，因此在算力理论与硬件基准中定义：

      \[ 1 \text{ MAC} = 2 \text{ FLOPs} \]

    </li>

    <li><strong>矩阵乘法复杂度通用定理</strong>：设矩阵 \( A \in \mathbb{R}^{m \times k} \) 与 \( B \in \mathbb{R}^{k \times n} \) 相乘，结果矩阵 \( C = AB \in \mathbb{R}^{m \times n} \)。输出矩阵共有 \( m \times n \) 个元素，每个元素是 \( k \) 维向量点积（需 \( k \) 次乘法和 \( k \) 次累加，即 \( k \) 次 MACs）。因此稠密矩阵乘法的精确浮点运算量为：

      \[ \text{FLOPs}_{\text{GEMM}} = 2 \cdot m \cdot n \cdot k \]

    </li>

    <li><strong>访存量（Memory Traffic, \( M \)）与算术强度（Arithmetic Intensity, \( I \)）</strong>：

      算术强度定义为算法执行的总运算量与在芯片计算核心与显存（HBM/DRAM）之间搬运的字节总量之比：

      \[ I = \frac{\text{Total FLOPs}}{M} \quad (\text{FLOP/Byte}) \]

    </li>

    <li><strong>Roofline 模型</strong>：

      加速卡上的理论最大可达成运算性能 \( P_{\text{attainable}} \)（单位 \( \text{FLOP/s} \)）受到芯片理论算力峰值 \( P_{\text{peak}} \)（\( \text{FLOP/s} \)）与显存带宽 \( B_{\text{mem}} \)（\( \text{Byte/s} \)）的双重截断约束：

      \[ P_{\text{attainable}} = \min(P_{\text{peak}}, \; I \cdot B_{\text{mem}}) \]

      硬件本身的拐点强度（Turning Point Intensity）为：

      \[ I^* = \frac{P_{\text{peak}}}{B_{\text{mem}}} \]

      若 \( I < I^* \)，算法落入<strong>访存瓶颈区（Memory-bound）</strong>，算力利用率由显存带宽死死卡住；若 \( I \ge I^* \)，算法落入<strong>算力瓶颈区（Compute-bound）</strong>，此时才有可能逼近硬件算力上限。

    </li>

  </ul>

</section>



<section class="blk blk-tip">

  <h4><span class="ic">✓</span>极简小数字草稿纸演算（Scratchpad 1）</h4>

  <p>在草稿纸上设定一块易于心算的虚拟加速卡：算力峰值 \( P_{\text{peak}} = 100 \text{ TFLOPS} = 10^{14} \text{ FLOP/s} \)，显存带宽 \( B_{\text{mem}} = 1000 \text{ GB/s} = 10^{12} \text{ Byte/s} \)。</p>

  <p>首先计算该硬件的拐点算术强度：</p>

  \[ I^* = \frac{10^{14} \text{ FLOP/s}}{10^{12} \text{ Byte/s}} = 100 \text{ FLOP/Byte} \]

  <p>现在我们在草稿纸上对比两种典型的真实深度学习执行场景：</p>

  <ol>

    <li><strong>场景 A：大模型自回归单 Token 解码（Batch Size = 1）</strong><br />

      读取单层权重矩阵 \( W \in \mathbb{R}^{4096 \times 4096} \)（以 FP16 存储，每个参数 2 Bytes，权重大小 \( 4096^2 \times 2 = 33,554,432 \text{ Bytes} \approx 33.55 \text{ MB} \)），乘以当前输入的单 Token 激活行向量 \( x \in \mathbb{R}^{1 \times 4096} \)。<br />

      - 运算量：\( 2 \cdot 1 \cdot 4096 \cdot 4096 = 2 \times 4096^2 \approx 3.355 \times 10^7 \text{ FLOPs} \)。<br />

      - 显存搬运量：必须将整个权重 \( W \) 从 HBM 读进缓存，\( M \approx 3.355 \times 10^7 \text{ Bytes} \)。<br />

      - 算术强度：

      \[ I_A = \frac{2 \times 4096^2 \text{ FLOPs}}{2 \times 4096^2 \text{ Bytes}} = 1 \text{ FLOP/Byte} \]

      - 可达性能：

      \[ P_{\text{attainable}} = \min(10^{14}, \; 1 \times 10^{12}) = 10^{12} \text{ FLOP/s} = 1 \text{ TFLOPS} \]

      <strong>惊人结论</strong>：此时硬件利用率只有 \( \frac{1 \text{ TFLOPS}}{100 \text{ TFLOPS}} = 1\% \)！算力核心 99% 的时间都在饥饿地等待显存把参数搬过来。这就是单批次自回归推理极慢的数学本质。

    </li>

    <li><strong>场景 B：预训练阶段大 Batch 稠密矩阵乘法（输入包含 4096 个 Tokens）</strong><br />

      令输入矩阵为 \( X \in \mathbb{R}^{4096 \times 4096} \)，同样乘以权重 \( W \in \mathbb{R}^{4096 \times 4096} \)。<br />

      - 运算量：\( 2 \cdot 4096 \cdot 4096 \cdot 4096 = 2 \times 4096^3 \approx 1.374 \times 10^{11} \text{ FLOPs} \)。<br />

      - 显存搬运量：读入 \( X \)、读入 \( W \)、写出结果 \( Y \)，总数据量 \( 3 \times 4096^2 \times 2 \text{ Bytes} \approx 1.007 \times 10^8 \text{ Bytes} \)。<br />

      - 算术强度：

      \[ I_B = \frac{2 \times 4096^3}{6 \times 4096^2} = \frac{4096}{3} \approx 1365.3 \text{ FLOP/Byte} \]

      - 可达性能：因为 \( 1365.3 \text{ FLOP/Byte} \gg I^* = 100 \text{ FLOP/Byte} \)，算法稳居算力瓶颈区，\( P_{\text{attainable}} = 100 \text{ TFLOPS} \)。<br />

      <strong>核心洞察</strong>：相同的权重参数，被 4096 个 Token 深度复用，算力利用率从 1% 跃升至理论峰值！

    </li>

  </ol>

</section>



<h3>3. 经典 6N 推导：标准 Transformer 单层与整网 6N FLOPs/token 严格数学证明</h3>

<section class="blk blk-m">

  <h4><span class="ic">∑</span>前置定义与单层标准 Transformer 块结构</h4>

  <p>

    设标准 Transformer 块的隐藏维度为 \( d \)，注意力头数为 \( h \)，每个头维度 \( d_k = d/h \)，MLP 中间前馈维度扩展为 \( d_{\text{ff}} = 4d \)。

    我们将计算拆解到<strong>单个 Token</strong>（输入行向量 \( x \in \mathbb{R}^{1 \times d} \)）上：

  </p>

  <table class="tbl small">

    <thead><tr><th>子模块</th><th>操作名称与矩阵维度</th><th>参数量</th><th>单 Token 前向 GEMM 运算量</th></tr></thead>

    <tbody>

      <tr><td>MHA 注意力</td><td>\( Q, K, V \) 三个线性投影：\( W_Q, W_K, W_V \in \mathbb{R}^{d \times d} \)</td><td>\( 3d^2 \)</td><td>\( 3 \times (2 \cdot 1 \cdot d \cdot d) = 6d^2 \) FLOPs</td></tr>

      <tr><td>MHA 注意力</td><td>注意力输出线性投影：\( W_O \in \mathbb{R}^{d \times d} \)</td><td>\( d^2 \)</td><td>\( 2 \cdot 1 \cdot d \cdot d = 2d^2 \) FLOPs</td></tr>

      <tr><td>MLP 前馈网络</td><td>第 1 层升维映射：\( W_1 \in \mathbb{R}^{d \times 4d} \)</td><td>\( 4d^2 \)</td><td>\( 2 \cdot 1 \cdot d \cdot 4d = 8d^2 \) FLOPs</td></tr>

      <tr><td>MLP 前馈网络</td><td>第 2 层降维映射：\( W_2 \in \mathbb{R}^{4d \times d} \)</td><td>\( 4d^2 \)</td><td>\( 2 \cdot 1 \cdot 4d \cdot d = 8d^2 \) FLOPs</td></tr>

      <tr><td><strong>单层总计</strong></td><td><strong>各模块稠密权重矩阵乘法求和</strong></td><td><strong>\( N_{\text{layer}} = 12d^2 \)</strong></td><td><strong>\( \text{FLOPs}_{\text{fwd}} = 24d^2 = 2 N_{\text{layer}} \)</strong></td></tr>

    </tbody>

  </table>

</section>



<section class="blk blk-tip">

  <h4><span class="ic">✓</span>极简小数字草稿纸演算（Scratchpad 2：令 \( d=2 \)）</h4>

  <p>在草稿纸上代入最微型数字验证代数恒等性：取隐藏维度 \( d = 2 \)，MLP 扩展维度 \( d_{\text{ff}} = 4 \times 2 = 8 \)。输入单 Token 向量 \( x \in \mathbb{R}^{1 \times 2} \)。</p>

  <ol>

    <li>单层参数量：\( N_{\text{layer}} = 12 \cdot 2^2 = 48 \) 个参数。</li>

    <li>前向逐项乘法：

      <br />- 3 个投影 \( x W_Q, x W_K, x W_V \)：每个是 \( (1 \times 2) \times (2 \times 2) \)，浮点计算为 \( 2 \cdot 1 \cdot 2 \cdot 2 = 8 \text{ FLOPs} \)，3 个合计 \( 24 \text{ FLOPs} \)。

      <br />- 输出投影 \( \text{context} \times W_O \)：\( (1 \times 2) \times (2 \times 2) \)，浮点计算为 \( 8 \text{ FLOPs} \)。注意力部分合计 \( 32 \text{ FLOPs} \)。

      <br />- MLP 升维 \( x W_1 \)：\( (1 \times 2) \times (2 \times 8) \)，浮点计算为 \( 2 \cdot 1 \cdot 2 \cdot 8 = 32 \text{ FLOPs} \)。

      <br />- MLP 降维 \( h W_2 \)：\( (1 \times 8) \times (8 \times 2) \)，浮点计算为 \( 2 \cdot 1 \cdot 8 \cdot 2 = 32 \text{ FLOPs} \)。MLP 部分合计 \( 64 \text{ FLOPs} \)。

    </li>

    <li>前向总浮点数：\( \text{FLOPs}_{\text{fwd}} = 32 + 64 = 96 \text{ FLOPs} \)。</li>

    <li>验证比值：

      \[ \frac{\text{FLOPs}_{\text{fwd}}}{N_{\text{layer}}} = \frac{96}{48} = 2 \]

      <strong>草稿验证通过</strong>：前向传播每 Token 恰好严格消耗 \( 2N \) FLOPs！

    </li>

  </ol>

</section>



<section class="blk blk-tip">

  <h4><span class="ic">✓</span>先拿标量热身：为什么反向恰好是前向的 2 倍</h4>

  <p>忘掉矩阵，只看 \(y = x\,w\)。前向 1 次乘法；反向收到上游梯度 \(g\) 后要算两个数：\(\partial\mathcal{L}/\partial x = g\,w\) 与 \(\partial\mathcal{L}/\partial w = x\,g\)——2 次乘法。</p>

  <p>1 次对 2 次，这就是 2N 对 4N 的全部直觉；矩阵版只是把每次标量乘法换成 GEMM（\(GW^T\) 传梯度、\(X^TG\) 算权重梯度）。LLM 回报：6N 定理的 6 就是 \(6 = 2 + 4\)，MFU 账本里吞吐乘的正是这个 6。</p>

</section>



<section class="blk blk-m">

  <h4><span class="ic">∑</span>为什么反向传播严格是 \( 4N \) FLOPs？——矩阵微积分严格证明</h4>

  <p>许多初学者直觉上认为反向传播应该与前向对称（以为也是 2N）。这里给出数学系标准的多元微积分链式法则推导：</p>

  <p>考虑通用全连接层的前向计算：</p>

  \[ Y = X W \]

  <p>其中输入激活矩阵 \( X \in \mathbb{R}^{B \times d_{\text{in}}} \)，参数权重 \( W \in \mathbb{R}^{d_{\text{in}} \times d_{\text{out}}} \)，输出特征 \( Y \in \mathbb{R}^{B \times d_{\text{out}}} \)。该层参数量为 \( N_{\text{param}} = d_{\text{in}} d_{\text{out}} \)。</p>

  <p><strong>前向计算量</strong>：一次矩阵乘法，消耗 \( 2 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}} = 2 B N_{\text{param}} \) FLOPs。</p>

  <p>在反向传播时，标量损失为 \( \mathcal{L} \)。反向传递从上一层接收到底层梯度的上游输入张量：</p>

  \[ G = \frac{\partial \mathcal{L}}{\partial Y} \in \mathbb{R}^{B \times d_{\text{out}}} \]

  <p>为了完成整个网络梯度的继续反向传递与权重参数更新，计算图必须执行<strong>两个完全独立的矩阵乘法</strong>：</p>

  <ol>

    <li><strong>第一步：对输入激活求梯度（用于向网络浅层继续反向传递）</strong><br />

      根据矩阵微分全导数公式：

      \[ \frac{\partial \mathcal{L}}{\partial X} = G W^T \]

      其矩阵维度运算为：\( (B \times d_{\text{out}}) \times (d_{\text{out}} \times d_{\text{in}}) \rightarrow (B \times d_{\text{in}}) \)。<br />

      浮点运算量为：

      \[ \text{FLOPs}_{\text{grad\_input}} = 2 \cdot B \cdot d_{\text{out}} \cdot d_{\text{in}} = 2 B N_{\text{param}} \]

    </li>

    <li><strong>第二步：对权重矩阵求梯度（用于优化器更新模型权重）</strong><br />

      根据矩阵微分全导数公式：

      \[ \frac{\partial \mathcal{L}}{\partial W} = X^T G \]

      其矩阵维度运算为：\( (d_{\text{in}} \times B) \times (B \times d_{\text{out}}) \rightarrow (d_{\text{in}} \times d_{\text{out}}) \)。<br />

      浮点运算量为：

      \[ \text{FLOPs}_{\text{grad\_weight}} = 2 \cdot d_{\text{in}} \cdot B \cdot d_{\text{out}} = 2 B N_{\text{param}} \]

    </li>

  </ol>

  <p><strong>反向传播总计算量</strong>：</p>

  \[ \text{FLOPs}_{\text{bwd}} = \text{FLOPs}_{\text{grad\_input}} + \text{FLOPs}_{\text{grad\_weight}} = 2 B N_{\text{param}} + 2 B N_{\text{param}} = 4 B N_{\text{param}} \]

  <p>单 Token（\( B=1 \)）的反向计算量<strong>严格等于 \( 4N \) FLOPs</strong>！</p>

  <p><strong>单 Token 训练总计算量（前向 + 反向）</strong>：</p>

  \[ \text{FLOPs}_{\text{train}} = \text{FLOPs}_{\text{fwd}} + \text{FLOPs}_{\text{bwd}} = 2N + 4N = 6N \quad (\text{FLOPs/token}) \]

  <p>对于含有 \( N \) 个参数的 Transformer 模型，训练 \( D \) 个 Token 所需的总浮点运算量精确公式为：</p>

  \[ \text{Total FLOPs} = 6 \cdot N \cdot D \]

  <p class="small">

    注：(1) 若开启激活重计算（Activation Checkpointing / Gradient Checkpointing）以显存换计算，在反向时需要把前向重新计算一遍，总计算量上升为 \( 2N + 2N + 4N = 8N \) FLOPs/token。<br />

     (2) 注意力上下文自乘 \( Q K^T \) 与 \( A V \) 涉及序列长度 \( T \) 与层数 \( L \)，单 Token 平摊计算量为 \( 4LTd\)。当隐藏维度 \( d \gg T \) 时，其占整网总计算量比例通常不足 5%~8%，在 Kaplan / Chinchilla 经典标度律推导中常作为次要项，密集参数矩阵乘法的主导项即为严谨的 \( 6N \)。<br />

    (3) 长上下文守卫：(2) 的 5%~8% 只在 \( T \ll d \) 时成立；一般情形按 \(\max(T,\,d)\) 的量级比较——当 \( T \) 追上甚至超过 \( d \)（例如 \( T = 131072 \)、\( d = 4096 \) 的 128k 上下文），注意力项不再是次要项，必须单独精确核算，不能直接套用 \( 6N \)。

  </p>

</section>



<h3>4. MFU 实战演算：工业级集群训练利用率（8×A100 训练 7B 模型）</h3>

<section class="blk blk-m">

  <h4><span class="ic">∑</span>前置定义与公式</h4>

  <p>模型浮点利用率（Model FLOPs Utilization, MFU）定义为模型有效计算产出速率与硬件理论密集算力峰值之比：</p>

  \[ \text{MFU} = \frac{\text{Effective FLOP/s}}{\text{Total Hardware Peak FLOPS}} = \frac{\text{Throughput (tokens/s)} \times 6N}{\sum_{i=1}^M P_{\text{peak}}^{(i)}} \]

  <p>其中 \( N \) 为模型参数量，\( \text{Throughput} \) 为集群端到端实测吞吐速率（Tokens/s），分母为所有加速卡理论半精度稠密峰值之和。</p>

</section>



<section class="blk blk-tip">

  <h4><span class="ic">✓</span>真实工程场景草稿纸手算：8×A100 训练 7B 模型</h4>

  <p>在草稿纸上记录真实生产集群参数：</p>

  <ol>

    <li><strong>硬件规格</strong>：单节点 8 张 NVIDIA A100-SXM4-80GB。<br />

      单张 A100 的 BF16/FP16 Tensor Core 稠密非稀疏峰值为 \( 312 \text{ TFLOPS} = 3.12 \times 10^{14} \text{ FLOP/s} \)。<br />

      8 卡节点总理论算力峰值：

      \[ P_{\text{total}} = 8 \times (312 \times 10^{12} \text{ FLOP/s}) = 2.496 \times 10^{15} \text{ FLOP/s} = 2496 \text{ TFLOPS} \]

    </li>

    <li><strong>模型与实测吞吐</strong>：<br />

      训练 7B 稠密模型，\( N = 7 \times 10^9 \)。<br />

      实测集群端到端稳定训练吞吐为 \( \text{Throughput} = 24,000 \text{ tokens/s} \)（即每张卡平均处理 3,000 tokens/s）。

    </li>

    <li><strong>步骤 1：计算集群每秒有效浮点运算量（Effective FLOP/s）</strong><br />

      根据 6N 定理：

      \[ \text{Effective FLOP/s} = 24,000 \text{ tokens/s} \times (6 \times 7 \times 10^9 \text{ FLOP/token}) \]

      \[ = 24,000 \times 4.2 \times 10^{10} = 1.008 \times 10^{15} \text{ FLOP/s} = 1008 \text{ TFLOPS} \]

    </li>

    <li><strong>步骤 2：计算 MFU</strong><br />

      \[ \text{MFU} = \frac{1.008 \times 10^{15} \text{ FLOP/s}}{2.496 \times 10^{15} \text{ FLOP/s}} = \frac{1008}{2496} \approx 0.403846 \implies 40.38\% \]

    </li>

  </ol>

  <p><strong>工业达标基线解读</strong>：</p>

  <table class="tbl small">

    <thead><tr><th>MFU 水平</th><th>典型区间</th><th>工程现状诊断</th></tr></thead>

    <tbody>

      <tr><td>较低</td><td>\( < 30\% \)</td><td>存在严重访存瓶颈（未用 FlashAttention）、小 Batch 导致 GEMM 算力未跑满、或数据加载/通信阻塞</td></tr>

      <tr><td>达标（优秀）</td><td>\( 35\% \sim 48\% \)</td><td>主流 Megatron-LM、DeepSpeed、JAX 工业级调优标准区间，计算与通信良好重叠</td></tr>

      <tr><td>极限顶尖</td><td>\( > 50\% \)</td><td>高度定制化的全异步流水通信重叠、算子深度融合（Kernel Fusion）与微架构协同调优</td></tr>

    </tbody>

  </table>

</section>







<section class="blk blk-tip">

  <h4><span class="ic">✓</span>与未来这类项目的关系（学完就知道以后该怎么迁移）</h4>

  <p>

    Checkpoint 5/6 这类任务需要「成对歌曲的适配」与「配对失败模式的统计」。这两件事都是<strong>特征工程 + 统计</strong>，

    不需要大算力；而 Checkpoint 7 这类学习实验甚至可以用 CPU 完成（250 条样本、4 维特征）。

    <em>换句话说：以后做 crossfade 这类项目时，瓶颈通常不是算力，而是模型设计、评估协议与听测组织。</em>

    把算力省下来做数据标注与多轮听测，比多训一个大模型更划算。

  </p>

</section>



<div class="quiz">

  <div class="qlabel">自测 · 1</div>

  <p class="q">8 台设备的 SPMD 网格记作 \(t \times p \times d\)（张量 / 流水 / 数据）。要跑「4 路张量 × 2 路流水」的混合并行，网格与数据并行度是？</p>

  <ul class="opts">

    <li>单设备上直接跑 4×2，SPMD 会自动切分</li>

    <li data-ok>\(t=4, p=2, d=1\)：乘积正好 8 台设备，全局批全进 micro-batch</li>

    <li>\(t=8, p=2, d=2\)：张量越多越快</li>

    <li>\(t=2, p=4, d=2\)：对称配置最稳</li>

  </ul>

  <p class="why">

    网格乘积必须等于设备数：\(4 \times 2 \times 1 = 8\)，此时 \(d = 1\) 意味着没有数据并行，全局批全靠 micro-batch 堆。
    第三项要 32 台设备；第四项要 16 台；单核上 reshape(4,2) 会直接报错——设备数是硬约束，不是偏好。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 2</div>

  <p class="q">在 Colab 上做一次 90 分钟的训练，最不应该省略的一步是？</p>

  <ul class="opts">

    <li>把学习率调到最优</li>

    <li data-ok>把检查点定期写到 Google Drive / HF Hub</li>

    <li>使用更大的批大小</li>

    <li>打开 tqdm 进度条</li>

  </ul>

  <p class="why">

    Colab 会话随时可能断开且本地磁盘不持久。没有外存检查点，一次断线就等于全部重来。

    这是「工程纪律」在免费算力环境下最重要的一条。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 3</div>

  <p class="q">只有 16 GB 显存时，下面哪种计划最合理？</p>

  <ul class="opts">

    <li>全参数微调 7B 模型</li>

    <li data-ok>用 0.5B–1.5B 模型跑通全部流程（SFT → DPO → 评估），必要时再加 QLoRA 升到 7B</li>

    <li>放弃微调，只写提示词</li>

    <li>直接租 8 张 H100</li>

  </ul>

  <p class="why">

    方法论与规模无关。用 0.5B 把数据格式、训练循环、评估协议全部走通，

    再决定是否需要更大的模型；直接上 7B 全参数微调在 16 GB 上是数学上不可能的（模块 04）。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 4</div>

  <p class="q">在推导 Transformer 训练算力需求时，为什么反向传播的 FLOPs 是前向传播的 2 倍（即前向 2N、反向 4N，合计 6N）？</p>

  <ul class="opts">

    <li>因为反向传播需要同时计算两次 Softmax</li>

    <li>反向传播的浮点数精度通常是前向的两倍</li>

    <li data-ok>根据矩阵微积分链式法则，每个线性层在前向只需一次矩阵乘法 \( Y = X W \)，而在反向必须计算两次独立的矩阵乘法：激活梯度 \( \frac{\partial \mathcal{L}}{\partial X} = G W^T \) 与权重梯度 \( \frac{\partial \mathcal{L}}{\partial W} = X^T G \)</li>

    <li>因为优化器 Adam 需要保留动量和方差两份副本</li>

  </ul>

  <p class="why">

    前向传播计算 \( Y = X W \) 是一次 GEMM（\( 2 B N \) FLOPs）；反向传播时，既要把梯度继续往浅层传递（需算 \( G W^T \) 产生激活梯度，消耗 \( 2 B N \) FLOPs），又要计算当前层权重梯度供优化器更新（需算 \( X^T G \) 产生权重梯度，消耗 \( 2 B N \) FLOPs）。两次 GEMM 相加恰好等于 \( 4 B N \)，严格是前向的 2 倍。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 5</div>

  <p class="q">某训练集群由 8 张峰值为 312 TFLOPS 的 GPU 组成，训练一个 7B 参数模型。当实测集群吞吐为 24,000 tokens/s 时，其 MFU 约为多少？该指标说明了什么？</p>

  <ul class="opts">

    <li>约为 18.5%，说明存在严重的数据加载或网络通信阻塞</li>

    <li data-ok>约为 40.4%，处于大模型分布式训练的高效达标区间（主流 Megatron-LM 调优标准水平）</li>

    <li>约为 78.2%，接近超算利用率极限</li>

    <li>约为 95.0%，说明已经完全消除了所有访存与通信开销</li>

  </ul>

  <p class="why">

    有效计算速率为 \( 24,000 \times 6 \times (7 \times 10^9) = 1.008 \times 10^{15} \text{ FLOP/s} = 1008 \text{ TFLOPS} \)；硬件理论总峰值为 \( 8 \times 312 = 2496 \text{ TFLOPS} \)；因此 \( \text{MFU} = \frac{1008}{2496} \approx 40.38\% \)。在大模型训练工程中，35%~48% 的 MFU 属于充分发挥硬件计算与通信重叠的标准达标表现。

  </p>

</div>



<div class="acc" data-t="深入：把「每次实验」变成可复现的资产" data-badge="工程">

  <div class="acc-body">

    <p>建议的目录结构（可以直接套用在本项目）：</p>

<table class="tbl">
  <thead>
    <tr><th>路径目录</th><th>主要作用</th><th>持久化属性</th></tr>
  </thead>
  <tbody>
    <tr><td><code>/kaggle/working/</code></td><td>模型输出与微调权重（如 LoRA 适配器、GGUF）</td><td>训练结束后自动保存并支持直接下载</td></tr>
    <tr><td><code>/kaggle/input/</code></td><td>预置数据集与开源基础模型只读目录</td><td>系统只读挂载，不可直接写入修改</td></tr>
    <tr><td><code>/kaggle/temp/</code></td><td>临时缓存与分词中间文件</td><td>实例重启后自动清空，不占用配额</td></tr>
  </tbody>
</table>

    <p>判断标准：<strong>一个陌生人 clone 这个仓库、运行一条命令，能否得到与你相同的图和数字？</strong>

    如果答案是「能」，你就达到了 Vandewalle 等人所说的可复现研究标准。</p>

  </div>

</div>

`

});

