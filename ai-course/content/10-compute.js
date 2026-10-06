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
  训练一个大模型到底要烧多少算力？这不是拍脑袋估的数字，而是被三件事卡死：显存带宽（Memory Wall）、浮点运算量（FLOPs）和集群利用率（MFU）。
  这一章把这本账算清楚：先用 Roofline 模型和算术强度判断一个算子卡在带宽上还是卡在算力上，再用矩阵微积分把经典 Transformer 的 6N FLOPs/token 严格推出来，然后拿 8×A100 / H100 训练集群的真实数字手算一遍 MFU。
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
  <strong>先建立量级感</strong>：前沿大模型为什么从来不是单卡跑的？拿一张 H100 SXM5 来说，半精度 Tensor Core 峰值已经接近每秒 \(10^{15}\) 次浮点运算，训练 70B 模型仍然要<strong>单卡不停机连算 200 年</strong>。所以真实工程里要解决的就三件事：把集群铺开做并行、把卡间网络接好、把访存瓶颈用算子优化压下去。
</p>

<h3>2. 硬件极限与 Roofline 模型：算术强度与访存瓶颈推演</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经看到真实集群的规模表，也知道单个模型的算力大致是哪个量级。
  <strong>本节只加一件事</strong>：给硬件画一条天花板——算力和带宽，谁先到顶。
  <strong>怎么读</strong>：只要抓住"算术强度"这一个量（每搬 1 字节能做多少次计算），拐点两侧的结论你都能自己推出来。
</p>

<section class="blk blk-m">

  <h4><span class="ic">∑</span>前置定义与符号约定</h4>

  <ul>

    <li><strong>浮点运算次数（FLOPs, Floating Point Operations）</strong>：一项计算一共要做多少次浮点运算，只是个次数，不带单位。末尾的小写 <code>s</code> 是复数（operations），用来跟算力速率单位 <code>FLOPS</code>（FLOP/s，每秒浮点操作次数）区分。</li>

    <li><strong>乘加运算（MACs, Multiply-Accumulate）</strong>：硬件底层执行的就是 \( a \leftarrow a + (b \times c) \)，1 次乘法加 1 次加法，所以算力理论和硬件基准里统一规定：

      \[ 1 \text{ MAC} = 2 \text{ FLOPs} \]

    </li>

    <li><strong>矩阵乘法复杂度通用定理</strong>：设矩阵 \( A \in \mathbb{R}^{m \times k} \) 与 \( B \in \mathbb{R}^{k \times n} \) 相乘，结果矩阵 \( C = AB \in \mathbb{R}^{m \times n} \)。输出矩阵有 \( m \times n \) 个元素，每个元素是一次 \( k \) 维向量点积（\( k \) 次乘法加 \( k \) 次累加，即 \( k \) 次 MACs）。于是稠密矩阵乘法的浮点运算量精确为：

      \[ \text{FLOPs}_{\text{GEMM}} = 2 \cdot m \cdot n \cdot k \]

    </li>

    <li><strong>访存量（Memory Traffic, \( M \)）与算术强度（Arithmetic Intensity, \( I \)）</strong>：

      算术强度就是总运算量除以计算核心与显存（HBM/DRAM）之间搬运的字节数：

      \[ I = \frac{\text{Total FLOPs}}{M} \quad (\text{FLOP/Byte}) \]

    </li>

    <li><strong>Roofline 模型</strong>：

      一张卡实际能跑到多快，由两个上限共同截断：芯片理论算力峰值 \( P_{\text{peak}} \)（单位 \( \text{FLOP/s} \)）与显存带宽 \( B_{\text{mem}} \)（单位 \( \text{Byte/s} \)）。两者中较小的那个就是可达成性能 \( P_{\text{attainable}} \)：

      \[ P_{\text{attainable}} = \min(P_{\text{peak}}, \; I \cdot B_{\text{mem}}) \]

      两个上限的交点叫拐点强度（Turning Point Intensity）：

      \[ I^* = \frac{P_{\text{peak}}}{B_{\text{mem}}} \]

      \( I < I^* \) 说明算法落在<strong>访存瓶颈区（Memory-bound）</strong>，能跑多快由显存带宽说了算；\( I \ge I^* \) 才进<strong>算力瓶颈区（Compute-bound）</strong>，这时才有机会逼近硬件算力上限。

    </li>

  </ul>

</section>



<section class="blk blk-tip">

  <h4><span class="ic">✓</span>小数字草稿纸演算（Scratchpad 1）</h4>

  <p>在草稿纸上造一块好算的虚拟卡：算力峰值 \( P_{\text{peak}} = 100 \text{ TFLOPS} = 10^{14} \text{ FLOP/s} \)，显存带宽 \( B_{\text{mem}} = 1000 \text{ GB/s} = 10^{12} \text{ Byte/s} \)。</p>

  <p>它的拐点算术强度是：</p>

  \[ I^* = \frac{10^{14} \text{ FLOP/s}}{10^{12} \text{ Byte/s}} = 100 \text{ FLOP/Byte} \]

  <p>下面比两个真实场景：</p>

  <ol>

    <li><strong>场景 A：大模型自回归单 Token 解码（Batch Size = 1）</strong><br />

      读取单层权重矩阵 \( W \in \mathbb{R}^{4096 \times 4096} \)（以 FP16 存储，每个参数 2 Bytes，权重大小 \( 4096^2 \times 2 = 33,554,432 \text{ Bytes} \approx 33.55 \text{ MB} \)），乘以当前输入的单 Token 激活行向量 \( x \in \mathbb{R}^{1 \times 4096} \)。<br />

      - 运算量：\( 2 \cdot 1 \cdot 4096 \cdot 4096 = 2 \times 4096^2 \approx 3.355 \times 10^7 \text{ FLOPs} \)。<br />

      - 显存搬运量：必须将整个权重 \( W \) 从 HBM 读进缓存，\( M \approx 3.355 \times 10^7 \text{ Bytes} \)。<br />

      - 算术强度：

      \[ I_A = \frac{2 \times 4096^2 \text{ FLOPs}}{2 \times 4096^2 \text{ Bytes}} = 1 \text{ FLOP/Byte} \]

      - 可达性能：

      \[ P_{\text{attainable}} = \min(10^{14}, \; 1 \times 10^{12}) = 10^{12} \text{ FLOP/s} = 1 \text{ TFLOPS} \]

      <strong>结论</strong>：此时硬件利用率只有 \( \frac{1 \text{ TFLOPS}}{100 \text{ TFLOPS}} = 1\% \)，算力核心 99% 的时间都在等显存把参数搬过来。这就是单条自回归推理慢的数学原因。

    </li>

    <li><strong>场景 B：预训练阶段大 Batch 稠密矩阵乘法（输入包含 4096 个 Tokens）</strong><br />

      令输入矩阵为 \( X \in \mathbb{R}^{4096 \times 4096} \)，同样乘以权重 \( W \in \mathbb{R}^{4096 \times 4096} \)。<br />

      - 运算量：\( 2 \cdot 4096 \cdot 4096 \cdot 4096 = 2 \times 4096^3 \approx 1.374 \times 10^{11} \text{ FLOPs} \)。<br />

      - 显存搬运量：读入 \( X \)、读入 \( W \)、写出结果 \( Y \)，总数据量 \( 3 \times 4096^2 \times 2 \text{ Bytes} \approx 1.007 \times 10^8 \text{ Bytes} \)。<br />

      - 算术强度：

      \[ I_B = \frac{2 \times 4096^3}{6 \times 4096^2} = \frac{4096}{3} \approx 1365.3 \text{ FLOP/Byte} \]

      - 可达性能：因为 \( 1365.3 \text{ FLOP/Byte} \gg I^* = 100 \text{ FLOP/Byte} \)，早就越过拐点，落在算力瓶颈区，\( P_{\text{attainable}} = 100 \text{ TFLOPS} \)。<br />

      <strong>关键差别</strong>：同一份权重被 4096 个 Token 共用，每读一次显存就摊给整批 Token，算力利用率从 1% 一路拉到理论峰值。

    </li>

  </ol>

</section>



<h3>3. 经典 6N 推导：单层 Transformer 到整网的 6N FLOPs/token 严格证明</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经知道瓶颈可能出在算力，也可能出在带宽。
  <strong>本节只加一件事</strong>：把"每个 token 要 6N 次浮点运算"这句话严格推出来。
  <strong>怎么读</strong>：这是全课最值得亲手推一遍的公式之一。先看表格里的逐项账（投影 6d²、输出 2d²、MLP 16d²），再跟推导。
</p>

<section class="blk blk-m">

  <h4><span class="ic">∑</span>前置定义与单层标准 Transformer 块结构</h4>

  <p>

    设标准 Transformer 块的隐藏维度为 \( d \)，注意力头数为 \( h \)，每个头维度 \( d_k = d/h \)，MLP 中间前馈维度扩展为 \( d_{\text{ff}} = 4d \)。

    下面把所有计算都摊到<strong>单个 Token</strong>上看（输入是行向量 \( x \in \mathbb{R}^{1 \times d} \)）：

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

  <h4><span class="ic">✓</span>小数字草稿纸演算（Scratchpad 2：令 \( d=2 \)）</h4>

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

      <strong>验算通过</strong>：前向每个 Token 正好消耗 \( 2N \) FLOPs。

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

  <p>不少人凭直觉以为反向应该跟前向对称，也是 2N。下面用标准的多元微积分链式法则推一遍：</p>

  <p>考虑通用全连接层的前向计算：</p>

  \[ Y = X W \]

  <p>其中输入激活矩阵 \( X \in \mathbb{R}^{B \times d_{\text{in}}} \)，参数权重 \( W \in \mathbb{R}^{d_{\text{in}} \times d_{\text{out}}} \)，输出特征 \( Y \in \mathbb{R}^{B \times d_{\text{out}}} \)。该层参数量为 \( N_{\text{param}} = d_{\text{in}} d_{\text{out}} \)。</p>

  <p><strong>前向计算量</strong>：一次矩阵乘法，消耗 \( 2 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}} = 2 B N_{\text{param}} \) FLOPs。</p>

  <p>在反向传播时，标量损失为 \( \mathcal{L} \)。反向传递从上一层接收到底层梯度的上游输入张量：</p>

  \[ G = \frac{\partial \mathcal{L}}{\partial Y} \in \mathbb{R}^{B \times d_{\text{out}}} \]

  <p>要让梯度继续往浅层传、同时算出权重的更新量，计算图必须做<strong>两个互不相干的矩阵乘法</strong>：</p>

  <ol>

    <li><strong>第一步：对输入激活求梯度（用于向网络浅层继续反向传递）</strong><br />

      矩阵微分给出：

      \[ \frac{\partial \mathcal{L}}{\partial X} = G W^T \]

      其矩阵维度运算为：\( (B \times d_{\text{out}}) \times (d_{\text{out}} \times d_{\text{in}}) \rightarrow (B \times d_{\text{in}}) \)。<br />

      浮点运算量为：

      \[ \text{FLOPs}_{\text{grad\_input}} = 2 \cdot B \cdot d_{\text{out}} \cdot d_{\text{in}} = 2 B N_{\text{param}} \]

    </li>

    <li><strong>第二步：对权重矩阵求梯度（用于优化器更新模型权重）</strong><br />

      同样由矩阵微分：

      \[ \frac{\partial \mathcal{L}}{\partial W} = X^T G \]

      其矩阵维度运算为：\( (d_{\text{in}} \times B) \times (B \times d_{\text{out}}) \rightarrow (d_{\text{in}} \times d_{\text{out}}) \)。<br />

      浮点运算量为：

      \[ \text{FLOPs}_{\text{grad\_weight}} = 2 \cdot d_{\text{in}} \cdot B \cdot d_{\text{out}} = 2 B N_{\text{param}} \]

    </li>

  </ol>

  <p><strong>反向合计</strong>：</p>

  \[ \text{FLOPs}_{\text{bwd}} = \text{FLOPs}_{\text{grad\_input}} + \text{FLOPs}_{\text{grad\_weight}} = 2 B N_{\text{param}} + 2 B N_{\text{param}} = 4 B N_{\text{param}} \]

  <p>单 Token（\( B=1 \)）的反向计算量<strong>正好是 \( 4N \) FLOPs</strong>。</p>

  <p><strong>单 Token 训练总计算量（前向 + 反向）</strong>：</p>

  \[ \text{FLOPs}_{\text{train}} = \text{FLOPs}_{\text{fwd}} + \text{FLOPs}_{\text{bwd}} = 2N + 4N = 6N \quad (\text{FLOPs/token}) \]

  <p>于是参数量为 \( N \) 的 Transformer 训练 \( D \) 个 Token，总浮点运算量就是：</p>

  \[ \text{Total FLOPs} = 6 \cdot N \cdot D \]

  <p class="small">

    注：(1) 开了激活重计算（Activation Checkpointing / Gradient Checkpointing）就是拿显存换计算：反向时要把前向重跑一遍，总计算量变成 \( 2N + 2N + 4N = 8N \) FLOPs/token。<br />

     (2) 注意力里的 \( Q K^T \) 与 \( A V \) 跟序列长度 \( T \)、层数 \( L \) 有关，单 Token 平摊计算量为 \( 4LTd\)。当隐藏维度 \( d \gg T \) 时，它占整网总计算量的比例通常不到 5%~8%，Kaplan / Chinchilla 标度律推导里当次要项处理，主导项就是严谨的 \( 6N \)。<br />

    (3) 长上下文提醒：(2) 的 5%~8% 只在 \( T \ll d \) 时成立；一般情形要按 \(\max(T,\,d)\) 的量级比较——当 \( T \) 追上甚至超过 \( d \)（例如 \( T = 131072 \)、\( d = 4096 \) 的 128k 上下文），注意力项不再是次要项，必须单独精确核算，不能直接套用 \( 6N \)。

  </p>

</section>



<h3>4. MFU 实战：8×A100 训练 7B 的利用率手算</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经知道 6N 是怎么来的。
  <strong>本节只加一件事</strong>：把纸面公式和真实吞吐对起来，算出 MFU。
  <strong>怎么读</strong>：跟着做一遍 8×A100 那道除法就够（24000 tok/s × 6N ÷ 峰值算力）；记住结论：40% 已经算不错。
</p>

<section class="blk blk-m">

  <h4><span class="ic">∑</span>前置定义与公式</h4>

  <p>模型浮点利用率（Model FLOPs Utilization, MFU）就是模型的有效计算速率除以硬件理论密集算力峰值：</p>

  \[ \text{MFU} = \frac{\text{Effective FLOP/s}}{\text{Total Hardware Peak FLOPS}} = \frac{\text{Throughput (tokens/s)} \times 6N}{\sum_{i=1}^M P_{\text{peak}}^{(i)}} \]

  <p>其中 \( N \) 是模型参数量，\( \text{Throughput} \) 是集群端到端实测吞吐（Tokens/s），分母把所有加速卡的理论半精度稠密峰值加起来。</p>

</section>



<section class="blk blk-tip">

  <h4><span class="ic">✓</span>8×A100 训练 7B：一步一步手算</h4>

  <p>先把生产集群的参数记在草稿纸上：</p>

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

  <p><strong>多少算达标</strong>：</p>

  <table class="tbl small">

    <thead><tr><th>MFU 水平</th><th>典型区间</th><th>工程现状诊断</th></tr></thead>

    <tbody>

      <tr><td>偏低</td><td>\( < 30\% \)</td><td>访存瓶颈没解决（比如没上 FlashAttention）、Batch 太小导致 GEMM 跑不满，或者卡在数据加载与通信上</td></tr>

      <tr><td>达标</td><td>\( 35\% \sim 48\% \)</td><td>Megatron-LM、DeepSpeed、JAX 调优到位的常见区间，计算和通信重叠得不错</td></tr>

      <tr><td>天花板</td><td>\( > 50\% \)</td><td>全异步流水线把通信彻底藏起来、算子深度融合（Kernel Fusion），再往上就要抠微架构细节了</td></tr>

    </tbody>

  </table>

</section>







<section class="blk blk-tip">

  <h4><span class="ic">✓</span>回到你自己的项目：以后该怎么迁移</h4>

  <p>

    Checkpoint 5/6 这类任务要的是「成对歌曲的适配」和「配对失败模式的统计」，本质是<strong>特征工程加统计</strong>，

    不吃算力；Checkpoint 7 那种学习实验用 CPU 就能跑完（250 条样本、4 维特征）。

    <em>换句话说：以后做 crossfade 这类项目，瓶颈通常不在算力，而在模型设计、评估协议和听测组织。</em>

    把算力省下来做数据标注和多轮听测，比多训一个大模型划算。

  </p>

</section>



<div class="quiz">

  <div class="qlabel">自测 · 1</div>

  <p class="q">在草稿纸那块卡上（峰值 100 TFLOPS、带宽 1000 GB/s），单个 Token 乘以 \(4096 \times 4096\) 的 FP16 权重矩阵，它的算术强度与瓶颈类型是？</p>

  <ul class="opts">

    <li>约 1365 FLOP/Byte，落在算力瓶颈区</li>

    <li data-ok>约 1 FLOP/Byte，远低于拐点 \(I^* = 100 \text{ FLOP/Byte}\)，落在访存瓶颈区</li>

    <li>正好 100 FLOP/Byte，卡在拐点上</li>

    <li>约 0.5 FLOP/Byte，属于显存容量不足</li>

  </ul>

  <p class="why">

    单 Token 的运算量是 \(2 \times 4096^2\) FLOPs，却要把整个 \(4096^2 \times 2\) Bytes 的权重从 HBM 搬进来，两者一除恰好是 1 FLOP/Byte。
    拐点 \(I^* = 10^{14} / 10^{12} = 100 \text{ FLOP/Byte}\)，1 远小于 100，所以算力核心只能跑到 1 TFLOPS，利用率 1%。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 2</div>

  <p class="q">同一层 \(4096 \times 4096\) 的权重，输入从 1 个 Token 换成 4096 个 Token 之后，可达性能为什么能从 1 TFLOPS 拉回 100 TFLOPS？</p>

  <ul class="opts">

    <li>因为权重变小了，显存搬运量随之下降</li>

    <li data-ok>因为权重只读一次就被 4096 个 Token 复用，搬运量约为 \(3 \times 4096^2 \times 2\) Bytes，算术强度升到约 1365.3 FLOP/Byte，越过拐点进入算力瓶颈区</li>

    <li>因为 GPU 会自动提高核心频率</li>

    <li>因为 Softmax 的浮点运算量占了主导</li>

  </ul>

  <p class="why">

    访存瓶颈下拼的不是算得多快，而是搬得多少。这一场景的算术强度是 \(I_B = \frac{2 \times 4096^3}{6 \times 4096^2} = \frac{4096}{3} \approx 1365.3 \text{ FLOP/Byte}\)，远高于 \(I^* = 100\)，于是 \(P_{\text{attainable}}\) 由算力峰值 100 TFLOPS 决定，而不是显存带宽。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 3</div>

  <p class="q">开启激活重计算（Activation Checkpointing）之后，训练每个 Token 实际执行的浮点运算量会变成多少？</p>

  <ul class="opts">

    <li>仍然是 \(6N\)，重计算只省显存，不增加计算</li>

    <li data-ok>\(8N\)：前向 \(2N\)、反向 \(4N\)，再加重算前向的 \(2N\)，合计 \(2N + 2N + 4N = 8N\)</li>

    <li>\(4N\)，因为前向那部分可以忽略不计</li>

    <li>\(12N\)，重计算会把反向也算两遍</li>

  </ul>

  <p class="why">

    重计算是拿计算换显存：反向时每一层都要重跑一次前向，所以每个 Token 的实算量从 \(6N\) 涨到 \(8N\)。代价就是同一批 Token 要多花计算时间。

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



<div class="acc" data-t="深入：把你的算力账本记成一张可复现的表" data-badge="工程">

  <div class="acc-body">

    <p>建议每次训练都记下这三行（换成你自己的卡型和卡数）：</p>

<table class="tbl">
  <thead>
    <tr><th>记录项</th><th>怎么得到</th><th>用来判断什么</th></tr>
  </thead>
  <tbody>
    <tr><td><code>P_peak</code>：理论算力峰值</td><td>查型号规格（如 A100 的 BF16 稠密峰值 312 TFLOPS），再乘以卡数</td><td>MFU 的分母，也就是这次训练的算力上限</td></tr>
    <tr><td><code>B_mem</code>：显存带宽</td><td>查型号规格，换算成 GB/s</td><td>算出拐点 \( I^* = P_{\text{peak}} / B_{\text{mem}} \)，判断算子是卡在带宽还是算力上</td></tr>
    <tr><td><code>Throughput</code>：实测吞吐</td><td>训练日志里的 tokens/s</td><td>乘 \( 6N \) 得有效算力，再除以 \( P_{\text{peak}} \) 就是 MFU</td></tr>
  </tbody>
</table>

    <p>判断标准：<strong>把这三行交给一个陌生人，他能不能复现出同一个 MFU 数字？</strong>

    如果答案是「能」，这次训练到底花了多少算力才算说清楚了。</p>

  </div>

</div>

`

});

