/* content/03-attention.js — 模块 03：注意力机制 */
COURSE.register({
  id: "m3",
  part: 1,
  num: "03",
  title: "注意力机制：一次可微分的检索",
  en: "Attention — Differentiable Retrieval",
  minutes: 35,
  tags: ["核心", "数学", "必做"],
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

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：方差守恒定理的 AS Further Maths 级推导</h4>
  <p>
    给 Charles 的打草稿顺序：先抄三条前置定义，再逐行证明期望与方差，
    每一步在纸上注明所用的独立性依据，最后才看缩放因子的结论。
  </p>
  <p>
    <strong>前置定义 1（向量内积）：</strong>对列向量 \(q\) 与 \(k\)，
    点积定义为 \(s = q^{T} k = \sum_{i=1}^{d} q_{i} k_{i}\)，
    即对应分量相乘后再求和。
  </p>
  <p>
    <strong>前置定义 2（正交投影对比）：</strong>矩阵 \(P\) 为正交投影当且仅当
    \(P = P^{T}\) 且 \(P^{2} = P\)。普通注意力权重矩阵每行和为 \(1\)，
    但一般既不对称也不幂等，因此只能叫凸组合，不能叫投影。
  </p>
  <p>
    <strong>前置定义 3（标准正态线性组合方差）：</strong>若
    \(z_{i} \sim \mathcal{N}(0,1)\) 相互独立，则
    \(\mathrm{Var}(\sum_{i} a_{i} z_{i}) = \sum_{i} a_{i}^{2}\)。
    特别当所有 \(a_{i} = 1\) 时方差等于项数。
    独立是方差可加的唯一通行证，相关时必须另加协方差项。
  </p>
  <p><strong>草稿第 1 步：单个乘积的期望</strong></p>
  \[ E[q_{i} k_{i}] = E[q_{i}] E[k_{i}] = 0 \times 0 = 0 \]
  <p>
    依据：\(q_{i}\) 与 \(k_{i}\) 独立，独立变量乘积的期望等于期望的乘积。
  </p>
  <p><strong>草稿第 2 步：单个乘积的二阶矩与方差</strong></p>
  \[ E[(q_{i} k_{i})^{2}] = E[q_{i}^{2}] E[k_{i}^{2}] = 1 \times 1 = 1 \]
  \[ \mathrm{Var}(q_{i} k_{i}) = E[(q_{i} k_{i})^{2}] - (E[q_{i} k_{i}])^{2} = 1 - 0 = 1 \]
  <p>
    依据：\(E[q_{i}^{2}] = \mathrm{Var}(q_{i}) + (E[q_{i}])^{2} = 1 + 0 = 1\)，
    对 \(k_{i}\) 同理；平方后独立性依然保持，故期望可拆。
  </p>
  <p><strong>草稿第 3 步：求和的期望与方差</strong></p>
  \[ E[S] = \sum_{i=1}^{d_{k}} E[q_{i} k_{i}] = 0 \]
  \[ \mathrm{Var}(S) = \sum_{i=1}^{d_{k}} \mathrm{Var}(q_{i} k_{i}) = \sum_{i=1}^{d_{k}} 1 = d_{k} \]
  <p>
    依据：不同下标 \(i\) 的乘积项 \(q_{i} k_{i}\) 相互独立，
    独立求和的方差等于方差之和。于是点积标准差为 \(\sqrt{d_{k}}\)，
    除以 \(\sqrt{d_{k}}\) 后方差恰好回到 \(1\)：
  </p>
  \[ \mathrm{Var}\left(\frac{S}{\sqrt{d_{k}}}\right) = \frac{1}{d_{k}} \mathrm{Var}(S) = 1 \]
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

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：第二组数字的完整手算（请跟着抄算）</h4>
  <p>
    上一节的例子已经很清楚，这里再给一组新数字，专门练习出现负分与不均匀权重的情形。
    取序列长 \(T = 2\)，维度 \(d_{k} = 2\)，令：
  </p>
  \[ Q = \begin{bmatrix} 2 & 0 \\ 0 & 1 \end{bmatrix}, \qquad K = \begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}, \qquad V = \begin{bmatrix} 4 & 0 \\ 0 & 6 \end{bmatrix} \]
  <p><strong>草稿第 1 步：逐项手算点积矩阵 \(QK^{T}\)</strong></p>
  \[ QK^{T} = \begin{bmatrix} 2 & 2 \\ 1 & -1 \end{bmatrix} \]
  <p>
    打草稿逐项验算：第一行点积为 \(2 \times 1 + 0 \times 1 = 2\)，
    \(2 \times 1 + 0 \times (-1) = 2\)；第二行点积为 \(0 \times 1 + 1 \times 1 = 1\)，
    \(0 \times 1 + 1 \times (-1) = -1\)。
  </p>
  <p><strong>草稿第 2 步：除以 \(\sqrt{d_{k}} = \sqrt{2} \approx 1.414\)</strong></p>
  \[ \frac{QK^{T}}{\sqrt{2}} \approx \begin{bmatrix} 1.414 & 1.414 \\ 0.707 & -0.707 \end{bmatrix} \]
  <p><strong>草稿第 3 步：逐行 Softmax 归一化</strong></p>
  <p>
    第一行两数相等，权重为 \([0.50, 0.50]\)；
    第二行 \(e^{0.707} \approx 2.028\)，\(e^{-0.707} \approx 0.493\)，
    和为 \(2.521\)，权重为 \([0.80, 0.20]\)（保留两位小数约为 \([0.80, 0.20]\)）。
  </p>
  \[ A \approx \begin{bmatrix} 0.50 & 0.50 \\ 0.80 & 0.20 \end{bmatrix} \]
  <p><strong>草稿第 4 步：加权汇总 \(V\)</strong></p>
  \[ AV \approx \begin{bmatrix} 0.50 & 0.50 \\ 0.80 & 0.20 \end{bmatrix} \begin{bmatrix} 4 & 0 \\ 0 & 6 \end{bmatrix} = \begin{bmatrix} 2.00 & 3.00 \\ 3.20 & 1.20 \end{bmatrix} \]
  <p>
    第一行平权混合两个值向量得到 \([2.00, 3.00]\)；
    第二行更偏向第一个值向量，得到约 \([3.20, 1.20]\)。
    负分 \(-0.707\) 在指数化后只是变小，并不会变成负权重。
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
        self.head_dim = d_model // n_head  <span class="cm"># 单头子空间维度，例如 768 // 12 = 64</span>

        <span class="cm"># [逐行剖析] 1. 一次性将 Q, K, V 融合为一个大线性投影层（访存合并优化）</span>
        <span class="cm"># 显存分配: 权重矩阵形状为 (3*d_model, d_model)，float32 占用 3*C*C*4 字节</span>
        self.c_attn = nn.Linear(d_model, 3 * d_model, bias=False)
        
        <span class="cm"># [逐行剖析] 2. 输出投影层：多头拼接后重组混合语义</span>
        self.c_proj = nn.Linear(d_model, d_model, bias=False)

        <span class="cm"># [逐行剖析] 3. 注册下三角因果掩码缓冲区（无需反向传播梯度）</span>
        <span class="cm"># 自动微分: register_buffer 保证张量随模型迁移至 GPU，但不进入计算图求导</span>
        <span class="cm"># 动态形状: bias -> (1, 1, block_size, block_size) [bool/float]</span>
        self.register_buffer(
            "bias",
            torch.tril(torch.ones(block_size, block_size)).view(1, 1, block_size, block_size)
        )

    <span class="kw">def</span> forward(self, x):
        <span class="cm"># 动态形状: 输入 x -> (B, T, C) | B=批大小, T=序列长, C=d_model</span>
        B, T, C = x.size()

        <span class="cm"># [逐行剖析] 1. 融合投影与拆分</span>
        <span class="cm"># 动态形状: x (B, T, C) -> qkv (B, T, 3*C) -> q, k, v 各为 (B, T, C)</span>
        <span class="cm"># 自动微分: 记录在计算图中，反向传播时将梯度向输入 x 回传</span>
        qkv = self.c_attn(x)
        q, k, v = qkv.split(self.d_model, dim=2)

        <span class="cm"># [逐行剖析] 2. 变换多头维度并将 head 提前便于并行批矩阵乘法</span>
        <span class="cm"># 动态形状: (B, T, C) -> view -> (B, T, nh, hs) -> transpose(1, 2) -> (B, nh, T, hs)</span>
        <span class="cm"># 显存机制: view() 与 transpose() 只改变步长元数据 (stride)，无深拷贝内存开销</span>
        k = k.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        q = q.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_head, self.head_dim).transpose(1, 2)

        <span class="cm"># [逐行剖析] 3. 缩放点积注意力分数</span>
        <span class="cm"># 动态形状: q (B, nh, T, hs) @ k.T (B, nh, hs, T) -> att (B, nh, T, T)</span>
        <span class="cm"># 显存瓶颈: att 占用 O(B * nh * T^2) 显存，是长序列显存开销的最大根源</span>
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(self.head_dim))

        <span class="cm"># [逐行剖析] 4. 因果掩码阻断未来信息泄露</span>
        <span class="cm"># 动态形状: 掩码切片 bias[:, :, :T, :T] -> (1, 1, T, T)，广播到 (B, nh, T, T)</span>
        <span class="cm"># 原地位运算: masked_fill 将上三角未来位置填入 -inf，使 Softmax 后概率严格为 0</span>
        att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))

        <span class="cm"># [逐行剖析] 5. Softmax 概率归一化并加权聚合 Value 隐状态</span>
        <span class="cm"># 动态形状: att -> softmax -> (B, nh, T, T) | 每行和为 1.0 (概率单纯形)</span>
        <span class="cm"># 动态形状: att (B, nh, T, T) @ v (B, nh, T, hs) -> y (B, nh, T, hs)</span>
        att = torch.softmax(att, dim=-1)
        y = att @ v

        <span class="cm"># [逐行剖析] 6. 还原通道拼接并做最终输出线性投影</span>
        <span class="cm"># 动态形状: y (B, nh, T, hs) -> transpose -> (B, T, nh, hs) -> contiguous().view -> (B, T, C)</span>
        <span class="cm"># 显存机制: transpose 破坏了内存连续性，contiguous() 分配新内存块以支持 view()</span>
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        <span class="kw">return</span> self.c_proj(y)  <span class="cm"># 动态形状: (B, T, C) -> (B, T, C)</span></code></pre>

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

<h3>5. 多头注意力：把形状账本写在纸上</h3>
<p>
  Karpathy 风格的实现先把所有 \(Q,K,V\) 投影合并，再用 reshape 与 transpose 显式暴露头维。
  这里的 <span class="t" data-tterm="Head dimension" data-d="每个头的子空间宽度 \(d_h=d/h\)；它决定点积的最后一维和缩放因子。">头维度</span>
  \(d_h\) 不是新信息，只是把残差宽度 \(C\) 分成 \(h\) 个可并行的坐标块。
</p>
<table class="tbl small">
  <thead><tr><th>代码动作</th><th>形状变化</th><th>为什么这样排</th><th>容易写错的地方</th></tr></thead>
  <tbody>
    <tr><td>线性投影</td><td>\((B,T,C)\to(B,T,3C)\)</td><td>一次 GEMM 同时得到 Q、K、V</td><td>split 必须沿最后一维</td></tr>
    <tr><td>分头</td><td>\((B,T,C)\to(B,T,h,d_h)\)</td><td>每头拥有独立的子空间</td><td>必须满足 \(C=h\,d_h\)</td></tr>
    <tr><td>转置</td><td>\((B,T,h,d_h)\to(B,h,T,d_h)\)</td><td>让 batched matmul 在每个头上并行</td><td>transpose 后 view 前要 contiguous</td></tr>
    <tr><td>分数矩阵</td><td>\((B,h,T,d_h)(B,h,d_h,T)\to(B,h,T,T)\)</td><td>每个 query 对全序列 key 做点积</td><td>最后一维才是 softmax 维</td></tr>
    <tr><td>拼回残差流</td><td>\((B,h,T,d_h)\to(B,T,C)\)</td><td>下一个子层只接收 \(C\) 宽度</td><td>不能把 head 维留在输出</td></tr>
  </tbody>
</table>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算一：\(B=2,T=3,C=8,h=2\)</h4>
  <ol>
    <li>每头宽度 \(d_h=C/h=4\)。</li>
    <li>投影后 Q、K、V 都是 \((2,3,8)\)，分头再转置成 \((2,2,3,4)\)。</li>
    <li>点积得到 \((2,2,3,3)\)，每个头有一个 \(3\times3\) 的位置关系表。</li>
    <li>乘 V 后回到 \((2,2,3,4)\)，transpose 与 reshape 后才回到 \((2,3,8)\)。</li>
  </ol>
  <p class="hint">Hint：如果你写出 \((2,3,2,4)\) 作为分数矩阵，最后两个维度没有做内积；先找出哪一维应该转置。</p>
</section>

<h3>6. 几何视角：双线性评分与行随机仿射算子</h3>
<p>
  采用列向量记号，\(q_i=W_Q^\top x_i+b_Q\)、\(k_j=W_K^\top x_j+b_K\)。忽略偏置时，
</p>
\[ s_{ij}=q_i^\top k_j=x_i^\top W_QW_K^\top x_j \]
<p>
  \(W_QW_K^\top\) 是一个<span class="t" data-tterm="Bilinear form" data-d="形如 \(x^\top M y\) 的双线性评分；在注意力中 \(M=W_QW_K^\top\)，所以模型学习的是子空间度量。">双线性形式</span>，
  不是固定的欧氏距离。若列向量恰好正交，它才可解释为在正交基上的坐标内积；一般训练后的基并不正交。
</p>
\[ W_Q=W_K=U,\qquad U^\top U=I_r \implies s_{ij}=x_i^\top UU^\top x_j=x_i^\top P_Ux_j \]
<p>
  这里 \(P_U=UU^\top\) 满足 \(P_U^\top=P_U\) 与 \(P_U^2=P_U\)，所以它正是投到 \(U\) 所张成正交子空间的正交投影；评分也等于 \(\langle P_Ux_i,P_Ux_j\rangle\)。一般注意力只保留双线性度量，不满足这些对称与幂等条件，因而不能把每个 attention map 都称为投影。
</p>
\[ A=\mathrm{softmax}(S+M),\qquad A_{ij}\ge0,\qquad \sum_jA_{ij}=1,\qquad Y=AV \]
<p>
  由于每行权重都落在概率单纯形内，\(y_i=\sum_jA_{ij}v_j\) 是 value 的凸组合，是一个随输入变化的仿射算子。
  <span class="t" data-tterm="Row-stochastic matrix" data-d="每行元素非负且总和为 1 的矩阵；softmax 的注意力权重满足它，但它通常不对称也不幂等。">行随机矩阵</span>
  不等于正交投影：正交投影还要满足 \(A=A^\top\) 与 \(A^2=A\)，而因果注意力通常两者都不满足。
</p>
<table class="tbl small">
  <thead><tr><th>结构</th><th>条件</th><th>注意力对应</th><th>结论边界</th></tr></thead>
  <tbody>
    <tr><td>线性映射</td><td>\(y=Wx\)</td><td>Q、K、V 投影</td><td>矩阵固定时不随输入归一化</td></tr>
    <tr><td>仿射映射</td><td>\(y=Wx+b\)</td><td>带 bias 的投影</td><td>允许平移，但不保证保距离</td></tr>
    <tr><td>凸组合</td><td>\(a_j\ge0,\sum_ja_j=1\)</td><td>每个输出行 \(y_i\)</td><td>输出在 value 的凸包内</td></tr>
    <tr><td>正交投影</td><td>\(P=P^\top,P^2=P\)</td><td>仅特殊权重矩阵</td><td>不能把普通 attention map 直接叫投影</td></tr>
  </tbody>
</table>
<p class="hint">Hint：找 \(A=\begin{pmatrix}1&0\\1/2&1/2\end{pmatrix}\) 的反例；它行和为 1，但 \(A^2\ne A\)。</p>

<h3>7. 30 分钟验算：让代码自己暴露形状错误</h3>
<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>逐行剖析：最小 PyTorch 多头因果注意力</h4>
<pre><code>import torch

def shape_probe(x, n_head):
    B, T, C = x.shape                         <span class="cm"># [逐行剖析] 入口是 (B,T,C)，C 是残差流宽度。</span>
    assert C % n_head == 0                    <span class="cm"># [逐行剖析] 保证每头都有整数宽度 d_h。</span>
    hs = C // n_head                           <span class="cm"># [逐行剖析] hs=d_h，点积缩放使用 sqrt(hs)。</span>
    qkv = torch.nn.functional.linear(x, torch.eye(3 * C, C, device=x.device)) <span class="cm"># [逐行剖析] 教学投影，输出形状 (B,T,3C)。</span>
    q, k, v = qkv.split(C, dim=-1)             <span class="cm"># [逐行剖析] 沿最后一维拆回三个 (B,T,C)。</span>
    q = q.view(B, T, n_head, hs).transpose(1, 2) <span class="cm"># [逐行剖析] (B,T,C) → (B,h,T,hs)。</span>
    k = k.view(B, T, n_head, hs).transpose(1, 2) <span class="cm"># [逐行剖析] K 的最后一维与 Q 对齐才能做点积。</span>
    v = v.view(B, T, n_head, hs).transpose(1, 2) <span class="cm"># [逐行剖析] V 与权重矩阵共享 (B,h,T) 索引。</span>
    scores = q @ k.transpose(-2, -1) / hs**0.5 <span class="cm"># [逐行剖析] (B,h,T,hs)(B,h,hs,T) → (B,h,T,T)。</span>
    mask = torch.tril(torch.ones(T, T, dtype=torch.bool, device=x.device)) <span class="cm"># [逐行剖析] 下三角为真，位置 i 只看 j≤i。</span>
    scores = scores.masked_fill(~mask, float("-inf")) <span class="cm"># [逐行剖析] 未来分数为负无穷，softmax 后权重为 0。</span>
    weights = torch.softmax(scores, dim=-1)    <span class="cm"># [逐行剖析] 最后一维归一化，每行和为 1。</span>
    out = weights @ v                          <span class="cm"># [逐行剖析] (B,h,T,T)(B,h,T,hs) → (B,h,T,hs)。</span>
    out = out.transpose(1, 2).contiguous().view(B, T, C) <span class="cm"># [逐行剖析] 拼回 (B,T,C)，才能接残差与 MLP。</span>
    return out, weights                        <span class="cm"># [逐行剖析] 返回输出和权重，方便做三个断言。</span>

x = torch.randn(2, 5, 12)
y, a = shape_probe(x, n_head=3)
assert y.shape == (2, 5, 12)                  <span class="cm"># [逐行剖析] 输出宽度必须与输入一致。</span>
assert a.shape == (2, 3, 5, 5)                <span class="cm"># [逐行剖析] 每个头各有一个 T×T 分数表。</span>
assert torch.allclose(a.triu(1), torch.zeros_like(a.triu(1))) <span class="cm"># [逐行剖析] 上三角全零才证明因果方向正确。</span></code></pre>
  <p>记录三项：输出形状、上三角最大绝对值、每行和偏离 1 的最大值。再把 \(d_h\) 从 4 改成 6，确认 \(C\) 不变而头内宽度改变。</p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么用在真实项目里：Crossfade 不要直接变成 attention map</h4>
  <p>
    注意力的行随机性质与音频的加权混合很像，但把 \(A\) 直接当作时间增益曲线<strong>不值</strong>：它不保证单调、\(C^1\) 连续、相位一致或功率守恒，少量样本还会把 \(T\times T\) 的自由度学成噪声。
    值得保留的是检索思想：用注意力或其低维摘要预测过渡点与音色相似度，再把结果交给满足 \(a(t)^2+b(t)^2=1\) 的受约束 crossfade 曲线。
  </p>
</section>

<h3>8. 探究阶梯：从正确计算到反驳错误直觉</h3>
<ol>
  <li>先写 \(B=2,T=5,C=12,h=3\) 的 Q、分数、输出形状，再打开代码核对。</li>
  <li>对分数 \((0,1,-\infty)\) 手算 softmax，并说明为什么未来位置权重严格为 0。</li>
  <li>证明行和为 1 不推出 \(A^2=A\)，再说明这为何阻止「注意力就是投影」的说法。</li>
  <li>把 \(q,k\) 同时做同一个 RoPE 旋转，检查内积是否保持不变；再把它们放在不同位置，观察只剩 \(n-m\)。</li>
</ol>
<p class="hint">Hint：矩阵乘法看最后两维；softmax 看最后一维；RoPE 看 \(R_m^\top R_n\)。</p>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">当 \(B=2,T=5,C=12,h=3\) 时，分数矩阵的形状是什么？</p>
  <ul class="opts">
    <li>\((2,5,12,3)\)</li>
    <li data-ok>\((2,3,5,5)\)</li>
    <li>\((3,2,5,4)\)</li>
    <li>\((2,5,3,4)\)</li>
  </ul>
  <p class="why">每头宽度是 \(d_h=4\)，Q 与 K 的最后两维相乘后得到 \((B,h,T,T)=(2,3,5,5)\)。</p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">哪一个条件额外成立时，行随机的 \(A\) 才能称为正交投影？</p>
  <ul class="opts">
    <li>只要每行和为 1</li>
    <li>只要所有元素非负</li>
    <li data-ok>还要满足 \(A=A^\top\) 与 \(A^2=A\)</li>
    <li>只要 \(A\) 是下三角</li>
  </ul>
  <p class="why">行随机只说明凸组合；正交投影还必须对称且幂等。因果掩码通常使矩阵不对称，所以不能直接套这个名称。</p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">为什么 \(d_k=128\) 时缩放因子是 \(1/\sqrt{128}\)，而不是 \(1/128\)？</p>
  <ul class="opts">
    <li>因为 softmax 只接受整数</li>
    <li data-ok>点积方差是 \(d_k\)，要让方差而不是标准差回到 1，需要除以 \(\sqrt{d_k}\)</li>
    <li>因为这样能把 \(T^2\) 复杂度降为 \(T\)</li>
    <li>因为 RoPE 要求平方根</li>
  </ul>
  <p class="why">若 \(Z\) 方差为 \(d_k\)，则 \(Z/\sqrt{d_k}\) 的方差为 \(d_k/d_k=1\)；除以 \(d_k\) 会过度缩小 logit。</p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">对 Crossfade 项目，注意力最稳妥的落点是什么？</p>
  <ul class="opts">
    <li>直接把每行 attention 权重当左右声道增益</li>
    <li data-ok>用注意力摘要预测过渡点或相似度，再用受约束的等功率曲线生成增益</li>
    <li>去掉所有功率与连续性约束</li>
    <li>让每个时间点学习一个独立的 \(T\times T\) 矩阵</li>
  </ul>
  <p class="why">注意力适合内容检索，音频增益还需要单调、连续和能量约束；两者分层能保留可解释性并减少过拟合自由度。</p>
</div>

<h3>9. 现代前沿：旋转位置编码 (RoPE) 的复数几何</h3>
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
  <p>
    若把相对位移记作 \(\Delta=m-n\)，则可定义 \(g(q,k,\Delta)=q^\top R_{-\Delta}k\)，于是 \(\langle R_mq,R_nk\rangle=g(q,k,m-n)\)。负号只来自旋转方向的约定，不改变“只依赖相对位置”的结论。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：RoPE 二维旋转的具体数字手算</h4>
  <p>
    把复数旋转落实为一次可手算的数字例子。取频率 \(\theta = \pi / 2\)，
    即 \(90\) 度旋转，有 \(\cos(\theta) = 0\) 且 \(\sin(\theta) = 1\)。
  </p>
  <p><strong>草稿第 1 步：单个向量的旋转</strong></p>
  \[ R_{1} = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}, \qquad x = \begin{bmatrix} 1 \\ 0 \end{bmatrix} \]
  \[ R_{1} x = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix} \begin{bmatrix} 1 \\ 0 \end{bmatrix} = \begin{bmatrix} 0 \\ 1 \end{bmatrix} \]
  <p>
    复数视角为 \((0 + i \times 1) \times (1 + i \times 0) = 0 + i \times 1\)，
    正好把横轴单位向量搬到纵轴上。
  </p>
  <p><strong>草稿第 2 步：相对距离只剩差值</strong></p>
  \[ R_{m}^{T} R_{n} = R_{n-m} \]
  <p>
    取查询在位置 \(m = 1\)，键在位置 \(n = 2\)，
    相对位移为 \(n - m = 1\)，内积化为：
  </p>
  \[ \langle R_{1} q, R_{2} k \rangle = q^{T} R_{1} k \]
  <p>
    取最简数字 \(q = k = [1, 0]^{T}\)，则 \(R_{1} k = [0, 1]^{T}\)，
    内积为 \(1 \times 0 + 0 \times 1 = 0\)。
    若把两者放在同一位置，则相对角为 \(0\)，内积回到 \(1\)。
    这就是相对位置决定相似度的全部秘密。
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
