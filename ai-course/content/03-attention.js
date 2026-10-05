/* content/03-attention.js — 模块 03：注意力机制 */
COURSE.register({
  id: "m3",
  part: 1,
  num: "03",
  title: "注意力机制：从直觉到公式，再到手写实现",
  en: "Attention Mechanism — Intuition, Math, and Implementation",
  minutes: 60,
  tags: ["核心", "数学", "代码", "必读"],
  body: String.raw`
<p class="lead">
  如果把 Transformer 比作一台精密发动机，<strong>注意力机制（Attention）</strong>就是它的核心燃烧室。
  这一讲我们抛开所有浮夸概念，从最接地气的「图书馆查资料」生活比喻出发，
  层层拆解单头注意力、多头注意力（MHA）、因果掩码（Causal Mask）与现代大模型标配的旋转位置编码（RoPE）。
  配合 STEP 级别的方差守恒定理证明与逐行解构的纯 PyTorch 代码，让你彻底看透点积注意力为什么能统治深度学习。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>生活比喻：图书馆查书卡（Q, K, V 的本质）</h4>
  <p>
    初学者最容易被 \(Q, K, V\) 三个矩阵绕晕。其实它们的现实原型极其平易近人：
    <strong>想象你走进一个巨大的大学图书馆查资料：</strong>
  </p>
  <ul>
    <li><strong>Query（查询向量 \(q\)）</strong>：是你脑子里的<strong>搜索关键词</strong>（比如“微积分链式法则”）；</li>
    <li><strong>Key（键向量 \(k\)）</strong>：是书架上每一本书的书脊<strong>索书条目与标签</strong>；</li>
    <li><strong>Value（值向量 \(v\)）</strong>：是每一本书里面<strong>真正承载的正文知识</strong>。</li>
  </ul>
  <p>
    <strong>你做的事情分为三步：</strong>
    第一步，拿你的问题 \(q\) 和书脊标签 \(k\) 挨个比对相似度（点积 \(q \cdot k\)）；
    第二步，按匹配程度算出该在每本书上分配多少注意力权重（Softmax 归一化）；
    第三步，按照权重把各本书里的知识 \(v\) 汇总带走（加权求和 \(\sum a_i v_i\)）。
    这三步在数学上，就凝聚成了大名鼎鼎的注意力公式！
  </p>
</section>

<h3>1. 核心数学基石：缩放点积注意力 (Scaled Dot-Product Attention)</h3>
<p>
  Vaswani 等人在 2017 年《Attention Is All You Need》中写下的标志性公式：
</p>
\[ \mathrm{Attention}(Q, K, V) = \mathrm{softmax}\left( \frac{QK^T}{\sqrt{d_k}} \right) V \]
<p>
  其中 \(Q \in \mathbb{R}^{T \times d_k}\), \(K \in \mathbb{R}^{T \times d_k}\), \(V \in \mathbb{R}^{T \times d_v}\)。
  \(T\) 为序列长度，\(d_k\) 为查询与键的特征维度。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>STEP 级严密定理推导：为什么分母必须除以 \(\sqrt{d_k}\)？</h4>
  <p>
    <strong>定理（独立随机变量点积方差爆炸定理）</strong>：
    假设查询向量分量 \(q_i\) 与键向量分量 \(k_i\) 均为相互独立的标量随机变量，
    且均满足零均值、单位方差（即 \(\mathbb{E}[q_i] = \mathbb{E}[k_i] = 0\)，\(\mathrm{Var}(q_i) = \mathrm{Var}(k_i) = 1\)）。
    求点积标量 \(S = q \cdot k = \sum_{i=1}^{d_k} q_i k_i\) 的均值与方差。
  </p>
  <p><strong>第一步：求点积的数学期望</strong></p>
  \[ \mathbb{E}[S] = \mathbb{E}\left[ \sum_{i=1}^{d_k} q_i k_i \right] = \sum_{i=1}^{d_k} \mathbb{E}[q_i] \mathbb{E}[k_i] = \sum_{i=1}^{d_k} (0 \times 0) = 0 \]
  <p><strong>第二步：求单个分量乘积的方差</strong></p>
  \[ \mathrm{Var}(q_i k_i) = \mathbb{E}[(q_i k_i)^2] - (\mathbb{E}[q_i k_i])^2 = \mathbb{E}[q_i^2]\mathbb{E}[k_i^2] - 0 = \mathrm{Var}(q_i)\mathrm{Var}(k_i) = 1 \times 1 = 1 \]
  <p><strong>第三步：独立随机变量求和的方差线性可加性</strong></p>
  \[ \mathrm{Var}(S) = \mathrm{Var}\left( \sum_{i=1}^{d_k} q_i k_i \right) = \sum_{i=1}^{d_k} \mathrm{Var}(q_i k_i) = \sum_{i=1}^{d_k} 1 = d_k \]
  <p>
    <strong>结论与灾难揭示</strong>：点积 \(q \cdot k\) 的标准差为 \(\sqrt{d_k}\)！
    在现代大模型中，维度 \(d_k\) 常为 64 或 128。如果不做缩放，点积数值的绝对值会轻易冲到 20 到 30 以上。
    当这些巨大的数值喂给 Softmax 函数时：
  </p>
  \[ \mathrm{softmax}(z)_i = \frac{e^{z_i}}{\sum_j e^{z_j}} \implies p_{\max} \to 1.0, \quad p_{j \ne \max} \to 0.0 \]
  <p>
    也就是说，最大项概率趋近于 1.0，其余概率几乎全变为 0.0。
    Softmax 的导数矩阵为 \(S_i(\delta_{ij} - S_j)\)。一旦进入极端极化状态，所有偏导数几乎完全等于零，
    反向传播的梯度瞬间在注意力层<strong>彻底消失（Vanishing Gradient）</strong>，网络停止学习！
    因此，必须严格除以缩放因子 \(\sqrt{d_k}\)，使输入 Softmax 前的方差精确锚定回 \(1.0\)。
  </p>
</section>

<h3>2. 极简小数字手算：一个 \(2 \times 2\) 的完整注意力流</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>纸面手算验证（跟算一遍，建立直觉）</h4>
  <p>设序列长度 \(T=2\)，特征维度 \(d_k=2\)。令：</p>
  \[ Q = \begin{bmatrix} 1 & 0 \\ 0 & 2 \end{bmatrix}, \qquad K = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}, \qquad V = \begin{bmatrix} 10 & 0 \\ 0 & 20 \end{bmatrix} \]
  <p><strong>第 1 步：计算点积矩阵 \(QK^T\)</strong></p>
  \[ K^T = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix} \implies QK^T = \begin{bmatrix} 1 & 0 \\ 0 & 2 \end{bmatrix} \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 2 & 2 \end{bmatrix} \]
  <p><strong>第 2 步：除以缩放系数 \(\sqrt{d_k} = \sqrt{2} \approx 1.414\)</strong></p>
  \[ \frac{QK^T}{\sqrt{2}} \approx \begin{bmatrix} 0.707 & 0.000 \\ 1.414 & 1.414 \end{bmatrix} \]
  <p><strong>第 3 步：逐行 Softmax 归一化</strong></p>
  <p>
    第一行：\(e^{0.707} \approx 2.028\), \(e^{0} = 1.000\), 和为 \(3.028\)。得到权重：\([0.67, 0.33]\)；<br/>
    第二行：两数相等，得到权重：\([0.50, 0.50]\)。
  </p>
  \[ A = \begin{bmatrix} 0.67 & 0.33 \\ 0.50 & 0.50 \end{bmatrix} \]
  <p><strong>第 4 步：加权汇总 Value 矩阵</strong></p>
  \[ \mathrm{Out} = AV = \begin{bmatrix} 0.67 & 0.33 \\ 0.50 & 0.50 \end{bmatrix} \begin{bmatrix} 10 & 0 \\ 0 & 20 \end{bmatrix} = \begin{bmatrix} 6.7 & 6.6 \\ 5.0 & 10.0 \end{bmatrix} \]
  <p>
    第一行 Token 明显更关注第一个 Value（权重 0.67）；第二行 Token 则平权吸收了两个 Value 的信息。
    没有黑盒，全是最直白的线性代数。
  </p>
</section>

<h3>3. 自回归语言模型的铁律：因果掩码 (Causal Mask)</h3>
<p>
  在文本生成任务中，模型必须遵守<strong>时间因果箭头</strong>：第 \(t\) 个词在预测时，绝对不能偷看第 \(t+1\) 个词及之后的信息。
  为了在 GPU 批量矩阵乘法中优雅地切断未来信息，引入了<strong>下三角因果掩码（Lower-triangular Causal Mask）</strong>：
</p>
\[ M_{ij} = \begin{cases} 0, & i \ge j \\ -\infty, & i < j \end{cases} \]
<p>
  将此掩码加到点积分数上：\(\frac{QK^T}{\sqrt{d_k}} + M\)。当位置 \(j > i\) 时，分数为 \(-\infty\)，
  经过 Softmax 算子后 \(e^{-\infty} = 0\)，未来位置的权重被精确斩断为 0，且反向传播梯度同样精确为 0。
</p>

<h3>4. 教科书级实现：多头自注意力 (MHA) 逐行解构</h3>
<p>
  以下是符合工业界最高标准的 PyTorch 多头注意力模块实现，完整包含投影、维度重排、缩放点积与因果掩码：
</p>

<pre><code><span class="kw">import</span> torch
<span class="kw">import</span> torch.nn <span class="kw">as</span> nn
<span class="kw">import</span> math

<span class="kw">class</span> <span class="hi">CausalSelfAttention</span>(nn.Module):
    <span class="kw">def</span> __init__(self, d_model=768, n_head=12, block_size=1024):
        super().__init__()
        <span class="kw">assert</span> d_model % n_head == 0, "d_model 必须能被 n_head 整除"
        self.d_model = d_model
        self.n_head = n_head
        self.head_dim = d_model // n_head  <span class="cm"># 每个头的子空间维度，例如 768 / 12 = 64</span>

        <span class="cm"># [逐行剖析] 1. 一次性将 Q, K, V 融合成一个大线性层投影（计算效率远高于 3 个小层）</span>
        self.c_attn = nn.Linear(d_model, 3 * d_model, bias=False)
        
        <span class="cm"># [逐行剖析] 2. 输出投影层：多头拼接后重组语义</span>
        self.c_proj = nn.Linear(d_model, d_model, bias=False)

        <span class="cm"># [逐行剖析] 3. 注册下三角因果掩码缓冲区（无需反向传播梯度）</span>
        self.register_buffer(
            "bias",
            torch.tril(torch.ones(block_size, block_size)).view(1, 1, block_size, block_size)
        )

    <span class="kw">def</span> forward(self, x):
        <span class="cm"># 输入张量维度：B=批次大小, T=序列长度, C=特征维度 (d_model)</span>
        B, T, C = x.size()

        <span class="cm"># [逐行剖析] 1. 前向投影并沿最后一维拆分为 q, k, v 三个张量 (B, T, C)</span>
        q, k, v = self.c_attn(x).split(self.d_model, dim=2)

        <span class="cm"># [逐行剖析] 2. 变换多头维度：(B, T, C) -> (B, T, nh, hs) -> (B, nh, T, hs)</span>
        <span class="cm"># 将注意力头维度挪到序列长度前面，以便利用 batched matmul 深度并行</span>
        k = k.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        q = q.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_head, self.head_dim).transpose(1, 2)

        <span class="cm"># [逐行剖析] 3. 缩放点积：(B, nh, T, hs) @ (B, nh, hs, T) -> (B, nh, T, T)</span>
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(self.head_dim))

        <span class="cm"># [逐行剖析] 4. 掩码阻断：未来时间步填入 -inf</span>
        att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))

        <span class="cm"># [逐行剖析] 5. Softmax 概率归一化并加权聚合 Value</span>
        att = torch.softmax(att, dim=-1)
        y = att @ v  <span class="cm"># 形状：(B, nh, T, hs)</span>

        <span class="cm"># [逐行剖析] 6. 还原通道拼接：(B, nh, T, hs) -> (B, T, nh, hs) -> (B, T, C)</span>
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        <span class="kw">return</span> self.c_proj(y)</code></pre>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>几何本质：注意力矩阵的凸组合与概率单纯形解释</h4>
  <p>
    仔细审视注意力权重矩阵 \(A = \mathrm{softmax}(QK^T / \sqrt{d_k})\) 的数学性质：
    由于 Softmax 的非负归一化特性，矩阵 \(A\) 的每一行都是一个概率分布，其元素和严格为 1。
  </p>
  <p>
    在凸分析中，这对应于高维欧氏空间中的<strong>标准概率单纯形（Probability Simplex \(\Delta^{T-1}\)）</strong>。
    输出向量 \(y_t = \sum_{\tau=1}^t A_{t,\tau} v_\tau\) 是先前所有 Value 向量的<strong>严格凸组合（Convex Combination）</strong>。
    自注意力并不创造超越值向量张成子空间的新外推方向，它所做的，是在语义子空间中根据查询条件进行精密的内插寻址与聚焦。
  </p>
</section>

<h3>5. 现代前沿：旋转位置编码 (RoPE) 的复数几何</h3>
<p>
  早期的 Transformer 使用绝对位置正余弦编码直接加在 Token 嵌入上。
  现代最强开源模型（LLaMA-3、Qwen-2.5、Mistral）普遍采用 <strong>RoPE（Rotary Position Embedding）</strong>。
  它的核心灵感极其优雅：<strong>用复数平面上的旋转矩阵对向量进行相乘，从而使内积天然携带相对位置距离</strong>。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>二维复数旋转推导</h4>
  <p>
    将二维向量 \(x = [x_1, x_2]^T\) 视为复平面上的复数 \(z = x_1 + i x_2\)。
    位于位置 \(m\) 处的旋转操作相当于乘以单位复数 \(e^{i m \theta}\)：
  </p>
  \[ R_m x = \begin{bmatrix} \cos(m\theta) & -\sin(m\theta) \\ \sin(m\theta) & \cos(m\theta) \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} \]
  <p>
    <strong>内积的相对性定理</strong>：计算位置 \(m\) 处的查询与位置 \(n\) 处的键的内积：
  </p>
  \[ \langle R_m q, \; R_n k \rangle = (R_m q)^T (R_n k) = q^T R_m^T R_n k \]
  <p>
    因为正交旋转矩阵满足 \(R_m^T = R_{-m}\)，且旋转群满足可加性 \(R_{-m} R_n = R_{n-m}\)，所以：
  </p>
  \[ \langle R_m q, \; R_n k \rangle = q^T R_{n-m} k \]
  <p>
    内积只依赖于相对距离 \(n - m\)，与绝对位置无关！高维向量只需两两配对切成二维平面，分别乘以不同频率的旋转矩阵即可。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">序列长度从 2k 增加到 8k，朴素自注意力的核心点积计算量变为原来的几倍？</p>
  <ul class="opts">
    <li>2 倍</li>
    <li>4 倍</li>
    <li data-ok>16 倍</li>
    <li>64 倍</li>
  </ul>
  <p class="why">
    序列长度 \(T\) 变为原来的 4 倍（\(8k / 2k = 4\)）。
    自注意力的点积复杂度为 \(\mathcal{O}(T^2)\)，故计算量变为 \(4^2 = 16\) 倍。这是长文本长上下文优化的主要痛点。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在缩放点积注意力中，若取消除以 \(\sqrt{d_k}\) 的操作，随着特征维度 \(d_k\) 的增大，最可能导致什么训练问题？</p>
  <ul class="opts">
    <li>模型发生严重的内存泄漏</li>
    <li data-ok>点积方差过大导致 Softmax 极化，反向传播梯度近乎为零（梯度消失）</li>
    <li>模型无法处理因果掩码</li>
    <li>注意力头无法拼接</li>
  </ul>
  <p class="why">
    根据随机变量点积方差守恒定理，\(\mathrm{Var}(q \cdot k) = d_k\)。若不除以 \(\sqrt{d_k}\)，输入 Softmax 的数值绝对值极大，导致概率趋向 one-hot，Softmax 的导数迅速饱和归零，阻断梯度回传。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">旋转位置编码 (RoPE) 相比于在词嵌入上直接加上绝对位置编码的最大数学优势是什么？</p>
  <ul class="opts">
    <li>计算量为零</li>
    <li data-ok>通过旋转算子的正交群性质，使内积天然只依赖于两词之间的相对距离 \((m - n)\)</li>
    <li>彻底消除了除以 \(\sqrt{d_k}\) 的需要</li>
    <li>可以将因果掩码去掉</li>
  </ul>
  <p class="why">
    RoPE 利用二维正交旋转矩阵的群结构 \(R_m^T R_n = R_{n-m}\)，使得两向量经过旋转后的点积只取决于相对位移 \((n - m)\)，展现出绝佳的相对位置不变性与长度外推能力。
  </p>
</div>
`
});
