/* content/04-transformer.js — 模块 04：Transformer 的解剖学 */
COURSE.register({
  id: "m4",
  part: 1,
  num: "04",
  title: "Transformer 的解剖学：参数、FLOPs 与显存都花在哪",
  en: "Transformer Anatomy — Parameters, FLOPs, Memory",
  minutes: 35,
  tags: ["核心", "数学", "必做"],
  body: String.raw`
<p class="lead">
  当工程师谈论「7B、14B 或 70B 模型」时，这些数字究竟指的是哪些张量？
  为什么同样是 7B 参数的模型，有的能塞进单张 16 GB 消费级显卡，有的微调时却连 80 GB A100 都会瞬间报 OOM（Out Of Memory）？
  本讲追随 Andrej Karpathy 的 <code>nanoGPT</code> 极简哲学，彻底拆解现代自回归 Transformer 的每一个矩阵与张量算子，
  给出参数量、计算 FLOPs、显存四大件（权重、梯度、优化器、激活值）以及 Pre-norm 恒等残差流的 STEP 级代数推导与工程账本。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>0.5 先追踪一次张量：每个维度都在回答什么问题</h4>
<p>
  下面这张表先于公式阅读。(B) 是一次处理多少条样本，(T) 是每条样本有多少个 token，(D) 是隐藏向量宽度，(h) 是注意力头数，(V) 是词表大小。
  看到一个矩阵时，先问“它沿哪个维度混合信息”，再问它的代数性质。
</p>
<table class="tbl small">
  <thead><tr><th>阶段</th><th>形状</th><th>维度含义</th><th>它解决的实际问题</th></tr></thead>
  <tbody>
    <tr><td>Token IDs</td><td><code>[B, T]</code></td><td>整数索引</td><td>输入多长，批次多大</td></tr>
    <tr><td>Embedding</td><td><code>[B, T, D]</code></td><td>每个 token 的可学习表示</td><td>把离散符号变成可计算的特征</td></tr>
    <tr><td>Q / K / V</td><td><code>[B, h, T, d_head]</code></td><td>每个头的查询、键和值</td><td>决定 token 互相读取什么</td></tr>
    <tr><td>Attention scores</td><td><code>[B, h, T, T]</code></td><td>每个位置对每个位置的分数</td><td>上下文越长，这张表越贵</td></tr>
    <tr><td>Logits</td><td><code>[B, T, V]</code></td><td>每个位置对词表的未归一化分数</td><td>交给采样器生成下一个 token</td></tr>
  </tbody>
</table>
  <h4><span class="ic">✓</span>学习目标：建立硬件算力与模型架构的解析直觉</h4>
  <p>
    阅读完本讲后，你将能够做到：
    <strong>①</strong> 仅凭纸笔在 5 分钟内准确推算出任意未知 Transformer 模型的参数总量（精确度达 95% 以上）；
    <strong>②</strong> 严密推导为什么单 Token 矩阵乘法前向需要 \(2N\) FLOPs、反向需要 \(4N\) FLOPs；
    <strong>③</strong> 从全微分角度证明 Pre-norm 为何比经典 Post-norm 具有更卓越的深度可训练性（恒等梯度直通项）；
    <strong>④</strong> 逐行解构包含 RMSNorm、SwiGLU 与 Pre-norm 残差流的 Karpathy 风格极简 nanoGPT 代码。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    你打算在本地或云端训练一个轻量级的专属 Transformer 模块（如 1.5B 级别），
    或者在云端微调一个 8B 的多任务模型。
    在启动训练前，你必须向自己清晰交代：
    <strong>这个模型每前向一个 Token 消耗多少次浮点运算？训练需要多少 GB 显存？
    权重占多少？AdamW 动量占多少？反向传播的中间激活值占多少？</strong>
    如果答案是模糊的估算，你将陷入无休止的爆显存试错中。
  </p>
</section>

<h3>1. 宏观拓扑：Pre-norm 残差流与子层解剖</h3>
<p>
  现代大语言模型（如 Llama-3、DeepSeek、Qwen-2.5）几乎全部摒弃了 2017 年初代 Transformer 的 Post-norm 结构，
  统一采用<strong>Pre-norm 残差流（Pre-normalization Residual Stream）</strong>：
</p>
<div class="flow">
  <div class="nd">输入表征 \(x_l\)</div><div class="ar">→</div>
  <div class="nd">RMSNorm</div><div class="ar">→</div>
  <div class="nd hi">因果多头自注意力</div><div class="ar">→</div>
  <div class="nd">＋ 残差连接</div><div class="ar">→</div>
  <div class="nd">RMSNorm</div><div class="ar">→</div>
  <div class="nd hi">SwiGLU 前馈网络 (MLP)</div><div class="ar">→</div>
  <div class="nd">＋ 残差连接</div><div class="ar">→</div>
  <div class="nd">输出表征 \(x_{l+1}\)</div>
</div>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先拿标量热身：为什么残差里那个 1 救了梯度</h4>
  <p>忘掉矩阵，先看一维：设每层是 \(x_{l+1} = x_l + 0.1\,x_l = 1.1\,x_l\)，起点 \(x_0 = 2\)，则 \(x_1 = 2.2\)，\(x_2 = 2.42\)，每层导数都是 \(1.1\)，两层连乘得 \(1.1^2 = 1.21\)——量级始终是 1。</p>
  <p>对比没有残差的 \(x_{l+1} = 0.1\,x_l\)：两层后梯度只剩 \(0.1^2 = 0.01\)，100 层后就是 \(0.1^{100}\)，直接归零。Pre-norm 的恒等项就是把每层的 0.1 变成了 \(1 + 0.1\)。</p>
  <p>LLM 回报：这就是百层 Transformer 能训下去的原因——梯度范数不随深度指数坍缩，省下的是调参和炸掉重训的 GPU 小时数。下面把同样的账算到矩阵上。</p>
</section>

<p>
  结论先行：Pre-norm 每层是 \(x_{l+1}=x_l+F_l(\mathrm{RMSNorm}(x_l))\)，求导后自带单位矩阵项 \(\mathbf{I}\)，梯度沿残差主干有一条直通路，所以比每层都要再乘一次归一化雅可比的 Post-norm 好训；但直通不等于永不爆炸，子层尺度、初始化与学习率仍决定总梯度。记住这个结论和上面的标量例子即可；下面的完整雅可比乘积证明第二遍再看。
</p>

<div class="acc" data-t="选读·第二遍：Pre-norm 恒等残差流的雅可比乘积证明" data-badge="可选">
  <div class="acc-body">
<section class="blk blk-m">
  <h4><span class="ic">∑</span>STEP 级严密分析：Pre-norm 恒等残差流的梯度直通定理</h4>
  <p>
    <strong>定理（残差梯度的恒等项分解）</strong>：
    在 Pre-norm 架构中，第 \(l\) 个 Block 的前向映射表示为：
  </p>
  \[ x_{l+1} = x_l + F_l\big(\mathrm{RMSNorm}(x_l)\big) \]
  <p>
    通过递归代入，深度为 \(L\) 的网络最终输出 \(x_L\) 可以显式展开为最初输入 \(x_0\) 与所有子层增量的绝对求和：
  </p>
  \[ x_L = x_0 + \sum_{l=0}^{L-1} F_l\big(\mathrm{RMSNorm}(x_l)\big) \]
  <p>
    把 \(N_l=\mathrm{RMSNorm}(x_l)\)，把 \(J_l=\partial F_l/\partial N_l\) 记作子层对归一化输入的雅可比矩阵，再把 \(R_l=\partial N_l/\partial x_l\) 记作归一化的雅可比矩阵。对第 \(l\) 层逐点求导，乘积法则给出：
  </p>
  \[ \frac{\partial x_{l+1}}{\partial x_l}=\mathbf{I}+J_lR_l \]
  <p>
    沿链式法则，深度 \(L\) 的精确输入输出雅可比是有序乘积（右侧先作用）：
  </p>
  \[ \frac{\partial x_L}{\partial x_0}=\prod_{l=0}^{L-1}\big(\mathbf{I}+J_lR_l\big) \]
  <p>
    展开这个非交换矩阵乘积，前几项为
  </p>
  \[ \mathbf{I}+\sum_l J_lR_l+\sum_{i<j}(J_jR_j)(J_iR_i)+\cdots \]
  <p>
    <strong>数学精义剖析</strong>：单位矩阵项确实提供一条不经过子层的直接梯度通道，但它不保证其余项必然有界；初始化、归一化尺度与学习率仍决定总乘积的谱范数。若损失梯度写成行向量，则
  </p>
  \[ \frac{\partial \mathcal{L}}{\partial x_0}=\frac{\partial \mathcal{L}}{\partial x_L}\prod_{l=0}^{L-1}\big(\mathbf{I}+J_lR_l\big) \]
  <p>
    经典 Post-norm 则为 \(x_{l+1}=\mathrm{LN}(x_l+F_l(x_l))\)，其单层雅可比为 \(J_{\mathrm{LN},l}(\mathbf{I}+J_{F,l})\)，所以总梯度还要连乘每层的归一化雅可比。Pre-norm 的恒等项改善了深层优化条件；“不会衰减或爆炸”只有在额外的范数界与步长条件下才可推出，不能从结构式单独断言。
  </p>
</section>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算：残差流、RMSNorm 与 SwiGLU</h4>
  <p><strong>前置定义。</strong>欧氏空间 \(\mathbb{R}^d\) 中的向量用方括号列出坐标；仿射变换写成 \(y=Ax+b\)；残差流在每个子层后做向量相加；RMSNorm 只按坐标平方的平均值缩放向量：</p>
  \[ \mathrm{RMS}(x)=\sqrt{\frac{1}{d}\sum_{i=1}^{d}x_i^2+\varepsilon},\qquad \mathrm{RMSNorm}(x)=\frac{x}{\mathrm{RMS}(x)}\odot\gamma \]
  <p><strong>1. 残差流与 RMSNorm 的手算。</strong>取 \(x=[2.0,-1.0,3.0]\)，先平方并求平均：</p>
  \[ x_1^2+x_2^2+x_3^2=4+1+9=14,\qquad \frac{14}{3}=4.6667 \]
  \[ \mathrm{RMS}(x)=\sqrt{14/3}\approx2.1602 \]
  <p>先令可学习缩放 \(\gamma=[1,1,1]\)，忽略很小的 \(\varepsilon\)，逐坐标相除：</p>
  \[ \mathrm{RMSNorm}(x)\approx[2/2.1602,-1/2.1602,3/2.1602]=[0.9258,-0.4629,1.3887] \]
  <p>若子层输出为 \(F=[0.1,-0.2,0.3]\)，残差相加就是 \(x+F=[2.1,-1.2,3.3]\)。RMSNorm 不计算均值，也不做减均值的平移；LayerNorm 还要先求 \(\mu\)，再计算方差并做 \(x-\mu\)，所以 RMSNorm 少了一次均值归约和一次逐坐标平移。</p>
  <p><strong>2. SwiGLU 门控前馈的手算。</strong>取 \(x=[1,2]\)，令 \(W_{\text{gate}}=I\)、\(W_{\text{up}}=\begin{bmatrix}0&1\\1&0\end{bmatrix}\)、\(W_{\text{down}}=I\)。于是</p>
  \[ g=W_{\text{gate}}x=[1,2],\qquad u=W_{\text{up}}x=[2,1] \]
  \[ \mathrm{SiLU}(z)=\frac{z}{1+e^{-z}},\qquad \mathrm{SiLU}(g)\approx[0.7311,1.7616] \]
  \[ \mathrm{SiLU}(g)\odot u\approx[0.7311\times2,1.7616\times1]=[1.4622,1.7616] \]
  \[ \mathrm{SwiGLU}(x)=W_{\text{down}}\big(\mathrm{SiLU}(g)\odot u\big)\approx[1.4622,1.7616] \]
  <p>门控支路决定每个通道放大或压低多少，上升支路提供待筛选的特征，最后由下降矩阵投回残差流维度。</p>
</section>

<h3>2. 核心参数量法则：\(12 L d^2 + |\mathcal{V}| d\)</h3>
<p>
  记模型隐藏层维度为 \(d\)、层数为 \(L\)、词表大小为 \(|\mathcal{V}|\)、前馈层（FFN）中间隐藏维度为 \(d_{ff}\)。
  我们逐个矩阵核算单个 Block 内的参数量：
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>逐矩阵代数拆解</h4>
  <ol>
    <li>
      <strong>多头自注意力层（MHA）</strong>：
      包含四个线性投影矩阵 \(W_Q, W_K, W_V \in \mathbb{R}^{d \times d}\) 以及输出融合矩阵 \(W_O \in \mathbb{R}^{d \times d}\)。
      \[ \text{Param}_{\text{attn}} = 4 \times (d \times d) = 4 d^2 \]
      <em>注：若使用分组查询注意力 GQA（KV 头数为 \(h_{kv}\)），则 \(W_K, W_V\) 的列维度缩小为 \(h_{kv} d_{\text{head}}\)，参数量相应缩减。</em>
    </li>
    <li>
      <strong>SwiGLU 门控前馈网络（MLP）</strong>：
      SwiGLU 包含三个投影矩阵——门控矩阵 \(W_{\text{gate}}\)、上升矩阵 \(W_{\text{up}}\) 和下降矩阵 \(W_{\text{down}}\)：
      \[ \mathrm{SwiGLU}(x) = W_{\text{down}}\Big( \mathrm{SiLU}(W_{\text{gate}} x) \odot (W_{\text{up}} x) \Big) \]
      其中 \(W_{\text{gate}}, W_{\text{up}} \in \mathbb{R}^{d \times d_{ff}}\)，\(W_{\text{down}} \in \mathbb{R}^{d_{ff} \times d}\)。
      \[ \text{Param}_{\text{mlp}} = 3 \times (d \times d_{ff}) \]
      在保持总参数与经典两层 FFN（\(2 \times 4d^2 = 8d^2\)）相当的设计准则下，通常设定 \(d_{ff} \approx \frac{8}{3}d\)。
      代入得：
      \[ \text{Param}_{\text{mlp}} \approx 3 \times d \times \left(\tfrac{8}{3}d\right) = 8 d^2 \]
    </li>
    <li>
      <strong>单 Block 参数总和</strong>：
      \[ \text{Param}_{\text{block}} = 4 d^2 + 8 d^2 = 12 d^2 \]
    </li>
  </ol>
  <p>
    叠加全网 \(L\) 个层级，并加上词表嵌入矩阵（Embedding 矩阵 \(|\mathcal{V}| \times d\)），便得到了著名的估算公理：
  </p>
  \[ N \approx 12 L d^2 + |\mathcal{V}| d \]
  <p>
    <strong>几何与缩放洞见</strong>：参数量关于模型宽度 \(d\) 呈二次方增长（\(d^2\)），而关于深度 \(L\) 仅呈一次方线性增长。
    这意味着增加模型宽度比增加深度更为昂贵，但更宽的模型具备更高的矩阵并行度。
  </p>
</section>

<h3>3. 算力 FLOPs 与显存四大件的 STEP 级账本</h3>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么前向是 \(2N\)、反向是 \(4N\) FLOPs？</h4>
  <p>
    <strong>命题</strong>：对任意形状为 \((1 \times d_{\text{in}})\) 的行向量与权重矩阵 \(W \in \mathbb{R}^{d_{\text{in}} \times d_{\text{out}}}\) 进行矩阵乘法（GEMM），
    计算所需的浮点运算次数（FLOPs）严格等于 \(2 \times d_{\text{in}} d_{\text{out}}\)。
  </p>
  <p><strong>证明</strong>：</p>
  <p>
    输出向量的每一个元素均是长度为 \(d_{\text{in}}\) 的向量点积：
    \[ y_j = \sum_{k=1}^{d_{\text{in}}} x_k W_{kj} \]
    这需要执行 \(d_{\text{in}}\) 次单精度乘法，以及 \(d_{\text{in}} - 1 \approx d_{\text{in}}\) 次单精度加法。
    每个输出分量耗费 \(2 d_{\text{in}}\) 次运算，总共 \(d_{\text{out}}\) 个分量，因此浮点运算总量为 \(2 d_{\text{in}} d_{\text{out}}\) FLOPs。
    由于模型的全部可学习参数 \(N\) 均由这些权重矩阵构成，单个 Token 的纯参数前向矩阵乘开销精确为：
  </p>
  \[ C_{\text{forward}} \approx 2N \qquad (\text{FLOPs/token}) \]
  <p>
    <strong>反向传播需要做两次矩阵乘法</strong>：
    在链式法则反向回传时，对于每一层 \(Y = X W\)：
  </p>
  <ol>
    <li>对输入特征的偏导：\(\frac{\partial \mathcal{L}}{\partial X} = \frac{\partial \mathcal{L}}{\partial Y} W^\top\)，等价于一次相同尺度的 GEMM（\(2N\) FLOPs）；</li>
    <li>对权重矩阵的偏导：\(\frac{\partial \mathcal{L}}{\partial W} = X^\top \frac{\partial \mathcal{L}}{\partial Y}\)，同样等价于一次相同尺度的 GEMM（\(2N\) FLOPs）。</li>
  </ol>
  <p>
    两者相加，反向传播恰好需要 \(4N\) FLOPs！加上前向的 \(2N\)，完成一个 Token 的完整梯度迭代所需算力为：
  </p>
  \[ C_{\text{train}} \approx 6 N D \qquad (\text{FLOPs}) \]
  <p>其中 \(D\) 是训练消耗的总 Token 数。这就是大模型 Scaling Law（如 Chinchilla）的核心计算基底。</p>
</section>

<h3>4. 训练显存四大件：为什么单卡 24 GB 无法全参数训练 7B 模型</h3>
<p>
  假设采用标准 bf16 混合精度与经典 AdamW 优化器进行全参数微调。显存开销由四大部分刚性组成：
</p>
<table class="tbl small">
  <thead>
    <tr>
      <th>显存占用模块</th>
      <th>每个参数所需字节数</th>
      <th>7B 参数模型实际显存</th>
      <th>底层数学与工程原理</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>模型权重 (Weights)</td>
      <td>2 字节 (bf16)</td>
      <td>14 GB</td>
      <td>用于前向激活计算</td>
    </tr>
    <tr>
      <td>梯度 (Gradients)</td>
      <td>2 字节 (bf16)</td>
      <td>14 GB</td>
      <td>用于反向传播链式求导累加</td>
    </tr>
    <tr>
      <td>优化器状态 (Optimizer)</td>
      <td>12 字节 (fp32)</td>
      <td><strong>84 GB</strong></td>
      <td>AdamW 必须维护 fp32 主权重（4B）、一阶动量 \(m\)（4B）与二阶动量 \(v\)（4B）</td>
    </tr>
    <tr>
      <td><strong>静态显存小计</strong></td>
      <td><strong>16 字节 / 参数</strong></td>
      <td><strong>112 GB</strong></td>
      <td><strong>尚未包含任何批次前向激活值显存！</strong></td>
    </tr>
    <tr>
      <td>前向激活值 (Activations)</td>
      <td>动态与 \(B \cdot T \cdot L \cdot d\) 成正比</td>
      <td>20 \(\sim\) 60 GB</td>
      <td>保存中间结果用于反向求导；可通过激活重计算（Activation Checkpointing）压缩</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>残酷的现实结论</strong>：
  单张 24 GB 显存的显卡（如 RTX 4090 或 3090），连 7B 模型的静态权重和梯度都无法完整载入，更不用说高达 84 GB 的 AdamW 优化器状态！
  这也是为什么 <span class="t" data-tterm="LoRA" data-d="Low-Rank Adaptation：冻结基座权重，仅微调低秩分解增量矩阵，将可训练参数压缩 1000 倍。">LoRA</span>
  与 <span class="t" data-tterm="QLoRA" data-d="将基座权重 4-bit 量化，使得消费级显卡可微调 7B 级别大模型。">QLoRA</span>
  能够彻底重塑开源社区生态的根本原因——它们将可训练参数量压缩了上千倍，从而移除了庞大的优化器显存山峦。
</p>

<h3>5. 教科书级实现：Karpathy nanoGPT 极简架构逐行剖析</h3>
<p>
  在现代大模型主干网络中，整个 Transformer Block 的运算由两个核心算子主导：<strong>RMSNorm 预归一化</strong> 与 <strong>SwiGLU 门控前馈网络</strong>。以下通过单行微核心代码展示其运算本质：
</p>

<p><strong>1. RMSNorm 算子核心演示：</strong></p>
<p>\[ \text{RMSNorm}(x) = \frac{x}{\sqrt{\frac{1}{d}\sum_{i=1}^d x_i^2 + \epsilon}} \odot \gamma \]</p>
<p>
  <strong>逐行代数解析</strong>：<code>x.pow(2).mean(-1)</code> 求特征维度平方和的均值；<code>torch.rsqrt</code> 计算均方根的倒数，跳过了传统 LayerNorm 中减去均值的中心化步骤；最后乘以可学习缩放参数 <code>gamma</code>。在现代大模型（LLaMA-3、Qwen-2.5）中被全量采用，硬件吞吐提升约 7%~15%。
</p>

<p><strong>2. SwiGLU 门控前馈网络（FFN）核心演示：</strong></p>
<p>\[ \text{SwiGLU}(x) = \left( \text{SiLU}(x W_{\text{gate}}) \odot (x W_{\text{up}}) \right) W_{\text{down}} \]</p>
<p>
  <strong>逐行代数解析</strong>：输入向量 \(x\) 分别乘上两个升维矩阵；<code>W_gate</code> 通道经过 SiLU 激活函数充当平滑开关，与 <code>W_up</code> 的线性特征进行元素级逐项乘法（Hadamard Product），最后由 <code>W_down</code> 投影回残差流维度。
</p>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么连通工业级部署：1.5B 模型的本地端侧推理显存预算</h4>
  <p>
    当你训练完一个约 1.5B 的轻量大模型后，如何在消费级硬件或普通笔记本上实现流畅推理？
  </p>
  <p>
    <strong>量化与显存账本</strong>：
    全精度 FP16 / BF16 下，1.5B 权重占用约 \(1.5 \times 10^9 \times 2 \approx 3.0\) GB 显存。
    通过现代成熟的 4-bit 权重量化（如 AWQ、GPTQ 或 GGUF Q4_K_M），权重体积可直接压缩至 <strong>1.0 GB 左右</strong>！
    配合 llama.cpp 或 ONNX Runtime，在无独立显卡的普通笔记本 CPU 上也能以数十 Token/s 的速度毫秒级流式输出。
  </p>
</section>

<h3>6. LayerNorm 与 RMSNorm：同一个残差流上的两种尺度控制</h3>
<p>
  <span class="t" data-tterm="Residual stream" data-d="跨越多个 Transformer block、始终保持 \((B,T,d)\) 宽度的主干表示；每个子层只向它写入一个增量。">残差流</span>
  的宽度 \(d\) 不变，归一化只在最后一维逐 token 处理。LayerNorm 先去均值再除标准差：
</p>
\[ \mu(x)=\frac1d\sum_{i=1}^{d}x_i,\qquad \sigma^2(x)=\frac1d\sum_{i=1}^{d}(x_i-\mu)^2,\qquad \mathrm{LN}(x)=\frac{x-\mu}{\sqrt{\sigma^2+\epsilon}}\odot\gamma+\beta \]
<p>
  RMSNorm 不减均值，也不引入偏置，只按均方根缩放：
</p>
\[ \mathrm{RMSNorm}(x)=\frac{x}{\sqrt{\frac1d\sum_{i=1}^{d}x_i^2+\epsilon}}\odot g \]
<table class="tbl small">
  <thead><tr><th>项目</th><th>LayerNorm</th><th>RMSNorm</th><th>对训练的含义</th></tr></thead>
  <tbody>
    <tr><td>中心化</td><td>减去 \(\mu\)</td><td>不减均值</td><td>RMSNorm 少一次统计量</td></tr>
    <tr><td>可学习参数</td><td>\(\gamma,\beta\)</td><td>只有 \(g\)</td><td>参数略少，kernel 更简单</td></tr>
    <tr><td>归一化轴</td><td>最后一维 \(d\)</td><td>最后一维 \(d\)</td><td>不混合不同 token 的统计量</td></tr>
    <tr><td>失败信号</td><td>方差接近 0 时依赖 \(\epsilon\)</td><td>同样依赖 \(\epsilon\)</td><td>删掉 \(\epsilon\) 会出现 NaN</td></tr>
  </tbody>
</table>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算二：\(x=(1,2,3,4)\) 的两种归一化</h4>
  <ol>
    <li>LayerNorm：\(\mu=2.5\)，\(\sigma^2=1.25\)，所以标准化后约为 \((-1.342,-0.447,0.447,1.342)\)。</li>
    <li>RMSNorm：均方根为 \(\sqrt{(1+4+9+16)/4}=\sqrt{7.5}\approx2.739\)，结果约为 \((0.365,0.730,1.095,1.460)\)。</li>
    <li>两者都保留相对尺度信息，但 RMSNorm 不强迫向量均值为 0；这正是它在现代 LLM 中常见的工程取舍。</li>
  </ol>
  <p>LLM 回报：RMSNorm 相比 LayerNorm 省一次均值归约加一次逐元素平移；decode 每步每层都要归一化一次，省下的就是显存带宽与 VRAM。</p>
  <p class="cm">Hint：如果把 \(x\) 的每个分量都加上常数，LayerNorm 不变而 RMSNorm 会变；想一想这是否影响残差流表达。</p>
</section>

<h3>7. 一个 block 的张量流：每一步都回到 \((B,T,d)\)</h3>
<p>
  Pre-norm 的前向可以写成两次「归一化 → 子层 → 加回残差」：
</p>
\[ u_l=x_l+\mathrm{MHA}(\mathrm{Norm}_1(x_l)),\qquad x_{l+1}=u_l+\mathrm{MLP}(\mathrm{Norm}_2(u_l)) \]
<p>
  每个子层只产生与 \(x_l\) 同形状的增量。<span class="t" data-tterm="Identity Jacobian" data-d="残差加法 \(x+F(x)\) 的导数含单位矩阵 \(I\)；它给深层反向传播保留一条直接路径，但不保证所有梯度都不爆炸。">恒等雅可比</span>
  \(I\) 解释了为什么梯度可以沿主干直接回流；实际稳定性仍取决于初始化、归一化与学习率。
</p>
<table class="tbl small">
  <thead><tr><th>节点</th><th>形状</th><th>典型算子</th><th>需保存的证据</th></tr></thead>
  <tbody>
    <tr><td>token embedding</td><td>\((B,T)\to(B,T,d)\)</td><td>查表</td><td>整数 token id 与 dtype</td></tr>
    <tr><td>注意力输入</td><td>\((B,T,d)\)</td><td>Norm → QKV → \(T\times T\) 权重</td><td>掩码方向、行和、上三角</td></tr>
    <tr><td>注意力残差</td><td>\((B,T,d)\)</td><td>\(u=x+\Delta_{\mathrm{attn}}\)</td><td>加法前后形状相同</td></tr>
    <tr><td>MLP 中间</td><td>\((B,T,d_{ff})\)</td><td>SwiGLU 三矩阵</td><td>gate 与 up 的逐元素乘积</td></tr>
    <tr><td>block 输出</td><td>\((B,T,d)\)</td><td>\(x'=u+\Delta_{\mathrm{mlp}}\)</td><td>可继续送入下一层</td></tr>
  </tbody>
</table>
<p class="cm">Hint：只要某一步输出成 \((B,d,T)\)，就说明把序列轴和通道轴弄反了；残差加法不会替你修正它。</p>

<h3>8. Crossfade：凸组合相似，能量约束不同</h3>
<p>
  两条音频 \(x(t),z(t)\) 的混合写作 \(y(t)=a(t)x(t)+b(t)z(t)\)。线性淡化取 \(a=1-u,b=u\)，
  \(u\in[0,1]\)。若两条信号近似不相关且功率相等 \(P\)，混合功率是
</p>
\[ \mathbb{E}|y|^2\approx P\big(a^2+b^2\big) \]
<p>
  线性曲线在中心 \(u=1/2\) 给出 \(a^2+b^2=1/2\)，会产生约 \(-3\) dB 的能量凹陷。
  <span class="t" data-tterm="Equal-power crossfade" data-d="令 \(a^2+b^2=1\) 的交叉淡化；常用 \(a=\cos(\pi u/2),b=\sin(\pi u/2)\)，可避免不相关信号的中心能量凹陷。">等功率交叉淡化</span>
  取 \(a=\cos(\pi u/2),b=\sin(\pi u/2)\)，保证 \(a^2+b^2=1\)。
</p>
<p>
  端点还需要平滑速度时，使用 <span class="t" data-tterm="Smoothstep" data-d="把 \(u\in[0,1]\) 映到 \(s(u)=3u^2-2u^3\) 的三次曲线；它满足 \(s'(0)=s'(1)=0\)，用于减小过渡边界的突变。">平滑步函数</span>
  \(s(u)=3u^2-2u^3\)，它满足 \(s'(0)=s'(1)=0\)。
</p>
<table class="tbl small">
  <thead><tr><th>机制</th><th>权重约束</th><th>平滑 / 能量性质</th><th>在 Crossfade 中的角色</th></tr></thead>
  <tbody>
    <tr><td>注意力</td><td>\(A_{ij}\ge0,\sum_jA_{ij}=1\)</td><td>保证凸组合，不保证时间单调或功率守恒</td><td>预测相似度、过渡点或检索片段</td></tr>
    <tr><td>线性淡化</td><td>\(a+b=1\)</td><td>端点连续，中心可能能量凹陷</td><td>基线与对照实验</td></tr>
    <tr><td>等功率淡化</td><td>\(a^2+b^2=1\)</td><td>不相关等功率信号的总能量近似恒定</td><td>默认音频增益曲线</td></tr>
    <tr><td>平滑步</td><td>\(s\in[0,1]\)</td><td>一阶导数端点为 0</td><td>减少点击声与边界突变</td></tr>
  </tbody>
</table>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>以后接到这类项目时：以 Crossfade 为例，Transformer 值不值</h4>
  <p>
    假设以后你接到只有几百条样本的 Crossfade 这类项目，直接训练完整 Transformer 预测每个采样点的增益<strong>不值</strong>：参数自由度、数据需求和调试成本都超过收益。
    值得做的是小模型或冻结编码器，用它预测过渡时刻、响度差与相似度；最终 \(a(t),b(t)\) 仍由等功率与 \(C^1\) 约束生成。这样模型处理内容，物理曲线处理能量与平滑。
  </p>
</section>

<h3>9. 30 分钟最小实现：验证一个 block 没有偷看未来</h3>
<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>几何推演：Transformer 残差流的三大维度不变量</h4>
  <p>
    在 Transformer 的深层堆叠网络中，整个主干信息流可以视为一条穿透所有层的<strong>残差高速公路（Residual Highway）</strong>。在数学推演中必须满足以下守恒：
  </p>
  <table class="tbl">
    <thead>
      <tr><th>校验维度</th><th>严格不变量</th><th>物理工程意义</th></tr>
    </thead>
    <tbody>
      <tr><td>1. 形状守恒</td><td>输入与输出形状严格为 \([B, T, d]\)</td><td>保证前后层残差能够无阻碍直接逐项相加（\(x_{l+1} = x_l + \Delta x\)）</td></tr>
      <tr><td>2. 序列独立</td><td>\(T\) 轴变化不改变通道 \(d\)</td><td>模型天然支持任意可变长度推理，无需重新构建网络权重</td></tr>
      <tr><td>3. 范数稳定</td><td>每层输出模长 \(\|\Delta x\| / \|x\| \ll 1\)</td><td>残差分支的更新量仅充当微小扰动，防止深层信号弥散或梯度爆炸</td></tr>
    </tbody>
  </table>
</section>

<div class="acc" data-t="纸笔算一算：手算迷你 Transformer 参数量与 T4 显存" data-badge="动笔">
  <div class="acc-body">
    <p><strong>题目背景</strong>：在 Google Colab 单张 T4（16GB 显存）上从零预训练一个小型自回归模型。拿出草稿纸，估算以下结构的静态显存开销：</p>
    <p>
      模型超参数：层数 \(L = 6\)，隐藏维度 \(d = 384\)，词表大小 \(|\mathcal{V}| = 10{,}000\)，FFN 中间维度 \(d_{ff} = 4d = 1536\)。采用权重绑定（Embedding 与输出投影共享）。
    </p>
    <ol>
      <li><strong>词嵌入层参数量</strong>：
        \[ N_{\text{emb}} = |\mathcal{V}| \times d = 10{,}000 \times 384 = 3{,}840{,}000 \approx 3.84\text{ M} \]
      </li>
      <li><strong>单个 Transformer 块（Block）的参数量</strong>：
        <ul>
          <li>注意力层：\(W_q, W_k, W_v, W_o\) 共 4 个 \(d \times d\) 矩阵：
            \[ 4 \times d^2 = 4 \times 384^2 = 589{,}824 \]
          </li>
          <li>前馈网络（FFN）：\(W_1 (d \to 4d)\) 与 \(W_2 (4d \to d)\) 共 2 个矩阵：
            \[ 2 \times (d \times 4d) = 8 d^2 = 8 \times 384^2 = 1{,}179{,}648 \]
          </li>
          <li>单层核心参数总和（忽略微量 LayerNorm 偏置）：
            \[ 4 d^2 + 8 d^2 = 12 d^2 = 12 \times 384^2 = 1{,}769{,}472 \approx 1.77\text{ M} \]
          </li>
        </ul>
      </li>
      <li><strong>6 层总参数量与全网参数量</strong>：
        \[ N_{\text{blocks}} = 6 \times 1.7695\text{ M} \approx 10.62\text{ M} \]
        \[ N_{\text{total}} = N_{\text{emb}} + N_{\text{blocks}} = 3.84\text{ M} + 10.62\text{ M} \approx 14.46\text{ M} \]
      </li>
      <li><strong>T4 显存占用心算（FP16 半精度训练）</strong>：
        <ul>
          <li>静态模型权重（2 字节/参数）：\(14.46\text{ M} \times 2\text{ B} \approx 28.9\text{ MB}\)</li>
          <li>梯度反向传播（2 字节/参数）：\(28.9\text{ MB}\)</li>
          <li>AdamW 优化器状态（一阶动量 4 字节 + 二阶动量 4 字节 = 8 字节/参数）：\(14.46\text{ M} \times 8\text{ B} \approx 115.7\text{ MB}\)</li>
          <li><strong>训练总静态显存</strong>：\(28.9 + 28.9 + 115.7 \approx 173.5\text{ MB}\)</li>
        </ul>
      </li>
    </ol>
    <p><em>复盘收获</em>：在拥有 16GB（\(16{,}384\text{ MB}\)）显存的 T4 上，14.5M 的模型静态占用仅约 <strong>1.1%</strong>！剩下超过 15GB 的充裕空间完全可以开大批次（Batch Size = 32 或 64），半小时内就能收敛。</p>
  </div>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">一个 \(L=24\) 层、隐层维度 \(d=2048\)、词表大小为 32,000 的经典架构大模型（权重绑定），其全网参数量最接近多少？</p>
  <ul class="opts">
    <li>约 0.3 B</li>
    <li data-ok>约 1.3 B</li>
    <li>约 3.5 B</li>
    <li>约 12 B</li>
  </ul>
  <p class="why">
    根据核心估算公理：\(N \approx 12 L d^2 + |\mathcal{V}| d\)。代入数值：\(12 \times 24 \times 2048^2 = 288 \times 4.194 \times 10^6 \approx 1.208 \times 10^9\)。词表嵌入项为 \(32000 \times 2048 \approx 0.065 \times 10^9\)。两项相加总计约 \(1.27 \times 10^9 \approx 1.3\text{ B}\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么现代前馈网络 SwiGLU 的参数量是 \(3 d d_{ff}\)，而原始 Transformer 的经典 FFN 参数量是 \(2 d d_{ff}\)？</p>
  <ul class="opts">
    <li>因为 SwiGLU 额外添加了一个偏置向量</li>
    <li data-ok>因为 SwiGLU 引入了门控机制，将原本单一的上升投影拆分为了 Gate 门控投影与 Up 内容投影两个并行的矩阵，与 Down 矩阵一起共需 3 个矩阵</li>
    <li>因为激活函数本身需要占用矩阵参数</li>
    <li>为了让残差连接能够相加</li>
  </ul>
  <p class="why">
    \(\mathrm{SwiGLU}(x) = W_{\text{down}}\big(\mathrm{SiLU}(W_{\text{gate}} x) \odot (W_{\text{up}} x)\big)\)。它拥有三个可学习矩阵 \(W_{\text{gate}}, W_{\text{up}}, W_{\text{down}}\)。为了维持同等计算量和参数开销，工业界通常将中间维度 \(d_{ff}\) 从传统的 \(4d\) 相应缩减为约 \(\frac{8}{3}d\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">为什么现代超深层大语言模型普遍放弃 Post-norm 结构，而全面拥抱 Pre-norm 残差结构？</p>
  <ul class="opts">
    <li>因为 Pre-norm 的前向矩阵乘法速度快一倍</li>
    <li data-ok>Pre-norm 的残差主干在反向传播时始终包含一个干净的单位矩阵恒等直通项 \(\mathbf{I}\)，显著改善了深层网络梯度弥散与爆炸的问题，极大提升了超深网络训练的稳定性</li>
    <li>因为 Pre-norm 不需要使用任何学习率</li>
    <li>为了让模型参数量缩减一半</li>
  </ul>
  <p class="why">
    在 Pre-norm 下，总输出为输入与各层增量的直接累加。全微分链式求导展开后恒定包含单位矩阵项 \(\frac{\partial \mathcal{L}}{\partial x_0} = \frac{\partial \mathcal{L}}{\partial x_L}(\mathbf{I} + \dots)\)，保证梯度可以在残差流中更顺畅地反向流动；而 Post-norm 每次残差后都做归一化，深层求导时面临雅可比矩阵连乘衰减。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在全参数训练大模型时，为什么一个参数量为 \(N\) 的模型，前向传播每 Token 仅耗费约 \(2N\) FLOPs，而反向传播每 Token 却需要耗费约 \(4N\) FLOPs？</p>
  <ul class="opts">
    <li>因为优化器更新步骤需要额外的加法</li>
    <li data-ok>反向传播对于每个线性变换矩阵乘法必须分别计算两组不同的梯度：一组对输入特征计算偏导（用于向上层继续回溯），一组对权重参数计算偏导（用于参数更新），相当于两次等规模的 GEMM 操作</li>
    <li>因为反向传播必须执行两次前向传播验证</li>
    <li>这是由于混合精度舍入带来的额外代价</li>
  </ul>
  <p class="why">
    对于前向单步 \(Y = XW\)，需一次矩阵乘法（\(2N\) FLOPs）。而在反向传播中，链式法则要求计算两项：\(\frac{\partial \mathcal{L}}{\partial X} = \frac{\partial \mathcal{L}}{\partial Y} W^\top\)（一次全量 GEMM，\(2N\) FLOPs）以及 \(\frac{\partial \mathcal{L}}{\partial W} = X^\top \frac{\partial \mathcal{L}}{\partial Y}\)（另一全量 GEMM，\(2N\) FLOPs），因此反向计算量严格为前向的 2 倍（\(4N\) FLOPs）。
  </p>
</div>
<div class="quiz quiz-blank" data-ans="19" data-tol="1">
  <div class="qlabel">填空 · 计算推演</div>
  <p class="q">根据 Transformer 非嵌入层参数量估算公式 \(N \approx 12 L d^2\)，若模型堆叠层数 \(L=6\)，隐藏维度 \(d=512\)。该主干网络的参数量约为多少 M（百万）？（填入整数，如 19）</p>
  <div class="blank-wrap">
    <input type="text" class="blank-input" placeholder="输入整数参数量（如 19）..." />
    <button class="blank-btn">提交验证</button>
    <span class="blank-feedback"></span>
  </div>
  <p class="why">
    \(12 \times L \times d^2 = 12 \times 6 \times 512^2 = 72 \times 262,144 = 18,874,368 \approx 18.9\text{M} \approx 19\text{M}\)。在草稿纸上牢记 \(12Ld^2\)，无需翻看代码就能秒算任意模型骨架的参数规模。
  </p>
</div>

`
});
