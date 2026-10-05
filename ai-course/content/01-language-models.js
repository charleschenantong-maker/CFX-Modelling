/* content/01-language-models.js — 模块 01：语言模型在算什么 */
COURSE.register({
  id: "m1",
  part: 1,
  num: "01",
  title: "语言模型在算什么：条件概率、交叉熵与困惑度",
  en: "What a language model actually computes",
  minutes: 35,
  tags: ["核心", "概率", "必做", "Karpathy体系"],
  body: String.raw`
<p class="lead">
  大模型最底层的操作其实极为纯粹：<strong>它在每一步仅做一件事——基于给定的上下文历史，为词表中的每个 Token 计算一个条件概率分布。</strong>
  无论是宏大的「逻辑推理」、「多轮对话」还是「代码生成」，均由这一步概率采样递归迭代而成。
  本讲专为具有严格数学品味的自学者设计，追随 Andrej Karpathy 的 <code>makemore</code> 体系，
  从最简 Bigram 统计频数矩阵推演到单层神经网络，严密证明吉布斯不等式、Softmax 平移不变性与优雅的 \(\frac{\partial \mathcal{L}}{\partial \mathbf{z}} = \mathbf{p} - \mathbf{y}\) 梯度公式。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>学习目标：建立概率测度与信息几何的严密桥梁</h4>
  <p>
    阅读完本讲后，你将能够做到：
    <strong>①</strong> 证明为什么条件概率的链式展开是自回归（Autoregressive）建模的唯一公理基础；
    <strong>②</strong> 用 STEP 级解析技巧推导吉布斯不等式，彻底理解为什么交叉熵的理论下界就是数据源的香农熵；
    <strong>③</strong> 亲手推导 Softmax 雅可比矩阵，领悟为什么深度学习框架能够将 Softmax 与交叉熵融合为极其稳定的单个算子；
    <strong>④</strong> 逐行解构从频数统计表到神经网络参数化预测的代数演进。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    给模型输入 <code>The capital of France is</code>，它预测输出 <code>Paris</code>。
    在数学现实中，模型<strong>从来没有直接输出单词</strong>——它输出的是词表维度（如 50,257 维）的原始连续分值向量（Logits），
    经由非线性映射转化为单纯形（Simplex）上的概率分布，<code>Paris</code> 仅是其中测度最高的点。
    我们凭什么用一个标量交叉熵损失函数，就能引导数以亿计的权重自我校准至如此精准的概率分布？
  </p>
</section>

<h3>1. 概率空间与自回归分解的公理化基础</h3>
<p>
  设词表为有限离散集合 \(\mathcal{V}\)。一段长度为 \(T\) 的文本序列表示为随机变量向量 \(\mathbf{x} = (x_1, x_2, \dots, x_T)\)，
  其中每个分量 \(x_t \in \mathcal{V}\)。
  根据概率论的基本公理（乘法法则 / 链式法则），任意有限维离散随机变量的联合概率分布，
  <strong>恒可无损分解为自回归条件概率的连乘积</strong>：
</p>
\[ P(x_1, x_2, \dots, x_T) = \prod_{t=1}^{T} P(x_t \mid x_1, x_2, \dots, x_{t-1}) \]
<p>
  任何自回归模型（GPT 系列、Claude、Llama）在本质上都是用一个带参函数族 \(p_\theta\)
  去逼近宇宙中真实的条件概率转移分布：
</p>
\[ p_\theta(\cdot \mid x_1, \dots, x_{t-1}) \in \Delta^{|\mathcal{V}|-1} \equiv \left\{ \mathbf{p} \in \mathbb{R}^{|\mathcal{V}|} \;\middle|\; p_i \ge 0, \; \sum_{i=1}^{|\mathcal{V}|} p_i = 1 \right\} \]

<h3>2. 从频数统计到最大似然估计：Karpathy Bigram 的极简本质</h3>
<p>
  在引入复杂神经网络之前，最朴素的自回归假设是<strong>一阶马尔可夫链（Bigram 语言模型）</strong>：
  假设当前词出现的概率仅依赖于紧邻的前一个词，即 \(P(x_t \mid x_1, \dots, x_{t-1}) = P(x_t \mid x_{t-1})\)。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>极大似然估计 (MLE) 推导条件概率转移矩阵</h4>
  <p>
    设语料库中所有相邻 Token 对 \((i, j)\) 出现的统计频数为 \(N_{ij}\)。
    对任意前驱 Token \(i\)，模型参数为其转移概率行向量 \(\mathbf{p}_i = (p_{i1}, p_{i2}, \dots, p_{i|\mathcal{V}|})\)，约束条件为 \(\sum_{j} p_{ij} = 1\)。
    根据极大似然原理，整篇语料库的对数似然函数为：
  </p>
  \[ \ell(\mathbf{p}) = \sum_{i \in \mathcal{V}} \sum_{j \in \mathcal{V}} N_{ij} \ln p_{ij} \]
  <p>
    由于不同行 \(i\) 之间相互独立，引入拉格朗日乘子 \(\lambda\) 建立目标优化方程：
  </p>
  \[ \mathcal{J}(\mathbf{p}_i, \lambda) = \sum_{j=1}^{|\mathcal{V}|} N_{ij} \ln p_{ij} - \lambda \left( \sum_{j=1}^{|\mathcal{V}|} p_{ij} - 1 \right) \]
  <p>求偏导并令其为 0：</p>
  \[ \frac{\partial \mathcal{J}}{\partial p_{ij}} = \frac{N_{ij}}{p_{ij}} - \lambda = 0 \implies p_{ij} = \frac{N_{ij}}{\lambda} \]
  <p>代入约束条件 \(\sum_j p_{ij} = 1\)，立即得到 \(\lambda = \sum_k N_{ik}\)。由此完成严密证明：</p>
  \[ p_{ij}^* = \frac{N_{ij}}{\sum_{k=1}^{|\mathcal{V}|} N_{ik}} \]
  <p>
    极大似然转移矩阵的解，恰好等于经验统计频数归一化！
    然而，一旦上下文长度从 1 扩展至现代模型的几千甚至几十万 Token，纯频数统计表将遭遇无法克服的<strong>维度灾难（Combinatorial Explosion）</strong>，
    必须借助神经网络的低秩连续嵌入来学习平滑的条件分布。
  </p>
</section>

<h3>3. 信息论四重奏：自信息、香农熵、交叉熵与 KL 散度</h3>
<p>
  语言模型的损失函数从何而来？为什么非得是对数形式？这根植于香农（Claude Shannon）1948 年奠定的信息论公理。
</p>
<dl class="kv">
  <dt>自信息量 (Surprisal)</dt><dd>\(I(x) = -\ln p(x)\)。事件越罕见，其发生时带来的信息量（惊诧程度）越大；独立事件联合概率相乘，对数运算使其信息量完美相加。</dd>
  <dt>信息熵 (Shannon Entropy)</dt><dd>\(H(p) = -\sum_i p_i \ln p_i\)。真实分布本身固有的平均不确定性。是任何压缩编码或预测算法不可逾越的理论物理地基。</dd>
  <dt>交叉熵 (Cross Entropy)</dt><dd>\(H(p, q) = -\sum_i p_i \ln q_i\)。用预估分布 \(q\) 去编码服从真实分布 \(p\) 的样本时，平均每个样本所需的编码长度。</dd>
  <dt>KL 散度 (Relative Entropy)</dt><dd>\(D_{\mathrm{KL}}(p \parallel q) = \sum_i p_i \ln \frac{p_i}{q_i} = H(p, q) - H(p)\)。由模型拟合不准引起的额外冗余代价。</dd>
</dl>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>STEP 级严密证明：吉布斯不等式（信息散度非负性）</h4>
  <p>
    <strong>定理</strong>：对于定义在同一有限样本空间上的任意两个离散概率分布 \(p\) 与 \(q\)，恒有：
  </p>
  \[ D_{\mathrm{KL}}(p \parallel q) \ge 0 \]
  <p>等号成立当且仅当对于所有 \(i\) 均有 \(p_i = q_i\)。</p>
  
  <p><strong>证明过程（巧妙运用切线不等式）</strong>：</p>
  <p>
    由于对数函数 \(\ln t\) 是严格上凸函数，在其切线处满足基本凸不等式：
  </p>
  \[ \ln t \le t - 1 \qquad (\forall t > 0) \]
  <p>且等号成立当且仅当 \(t = 1\)。</p>
  <p>
    考虑负 KL 散度的表达式。假设对于所有的 \(i\)，\(p_i > 0\)（对于 \(p_i = 0\) 的项其在极限下极限值为 0，可直接剔除）。
    令 \(t = \frac{q_i}{p_i} > 0\)，代入上述切线不等式：
  </p>
  \[ \ln\left(\frac{q_i}{p_i}\right) \le \frac{q_i}{p_i} - 1 \]
  <p>
    两端同时乘以正数 \(p_i\) 并对所有可能的事件 \(i\) 求和：
  </p>
  \[ \sum_{i=1}^{|\mathcal{V}|} p_i \ln\left(\frac{q_i}{p_i}\right) \le \sum_{i=1}^{|\mathcal{V}|} p_i \left( \frac{q_i}{p_i} - 1 \right) \]
  <p>展开右端级数：</p>
  \[ \sum_{i=1}^{|\mathcal{V}|} p_i \left( \frac{q_i}{p_i} - 1 \right) = \sum_{i=1}^{|\mathcal{V}|} q_i - \sum_{i=1}^{|\mathcal{V}|} p_i = 1 - 1 = 0 \]
  <p>因此左端：</p>
  \[ -D_{\mathrm{KL}}(p \parallel q) = \sum_{i=1}^{|\mathcal{V}|} p_i \ln\left(\frac{q_i}{p_i}\right) \le 0 \implies D_{\mathrm{KL}}(p \parallel q) \ge 0 \]
  <p>
    等号成立条件为每一个 \(t = \frac{q_i}{p_i} \equiv 1\)，即 \(p_i = q_i\) 恒成立。证毕。
  </p>
  <p>
    <strong>深刻结论</strong>：
    \[ \mathcal{L} = H(p, q) = H(p) + D_{\mathrm{KL}}(p \parallel q) \ge H(p) \]
    无论模型网络参数量多大、训练算力多么充裕，<strong>训练损失的极限下界被自然语言本身的熵 \(H(p)\) 死死卡住</strong>。
    不同任务语料（如散文 vs 规整代码）由于自身熵 \(H(p)\) 差异巨大，绝对 Loss 没有任何可比性！
  </p>
</section>

<h3>4. Softmax 核心代数性质与数值稳定性</h3>
<p>
  模型将隐层表示映射到 Logits 后，Softmax 函数负责生成最终概率。
  但在浮点计算中，直接使用定义式极易造成数值溢出（Overflow）或下溢（Underflow）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>定理一：Softmax 的平移不变性 (Shift Invariance)</h4>
  <p>
    <strong>命题</strong>：对任意常数 \(c \in \mathbb{R}\)，Logits 向量整体加上常数偏置后，其 Softmax 概率分布恒定不变：
  </p>
  \[ \mathrm{softmax}(\mathbf{z} - c \mathbf{1})_i = \mathrm{softmax}(\mathbf{z})_i \]
  <p><strong>代数证明</strong>：</p>
  \[ \frac{e^{z_i - c}}{\sum_{j=1}^{|\mathcal{V}|} e^{z_j - c}} = \frac{e^{z_i} \cdot e^{-c}}{\sum_{j=1}^{|\mathcal{V}|} (e^{z_j} \cdot e^{-c})} = \frac{e^{-c} \cdot e^{z_i}}{e^{-c} \cdot \sum_{j=1}^{|\mathcal{V}|} e^{z_j}} = \frac{e^{z_i}}{\sum_{j=1}^{|\mathcal{V}|} e^{z_j}} \]
  <p>
    <strong>工业级数值防爆工程实践</strong>：
    在计算机 float32 体系中，\(e^{89} \approx 10^{38}\) 就已接近上限，若某 logit 达到 100，直接计算 <code>np.exp(z)</code> 会产生 <code>inf</code>。
    利用平移不变性，标准做法是令标量 \(c = \max_k z_k\)。
    平移后的最大分量为 \(z_i - \max(z) \le 0\)，所有指数项满足 \(0 &lt; e^{z_i - c} \le 1\)，<strong>从数学上彻底根除了指数爆炸（溢出）</strong>！
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>定理二：Softmax 雅可比矩阵与交叉熵梯度联立化简</h4>
  <p>
    设 \(p_i = \frac{e^{z_i}}{\sum_k e^{z_k}}\)。我们严密计算雅可比矩阵元素 \(J_{ij} = \frac{\partial p_i}{\partial z_j}\)：
  </p>
  <p><strong>情况 1：对同角分量求导（\(i = j\)）</strong></p>
  \[ \frac{\partial p_i}{\partial z_i} = \frac{e^{z_i} \left(\sum_k e^{z_k}\right) - e^{z_i} \cdot e^{z_i}}{\left(\sum_k e^{z_k}\right)^2} = \frac{e^{z_i}}{\sum_k e^{z_k}} - \left(\frac{e^{z_i}}{\sum_k e^{z_k}}\right)^2 = p_i(1 - p_i) \]
  <p><strong>情况 2：对异角分量求导（\(i \ne j\)）</strong></p>
  \[ \frac{\partial p_i}{\partial z_j} = \frac{0 - e^{z_i} \cdot e^{z_j}}{\left(\sum_k e^{z_k}\right)^2} = - \frac{e^{z_i}}{\sum_k e^{z_k}} \cdot \frac{e^{z_j}}{\sum_k e^{z_k}} = - p_i p_j \]
  <p>利用克罗内克符号 \(\delta_{ij}\)（当 \(i=j\) 时为 1，否则为 0），紧凑表达为：</p>
  \[ \frac{\partial p_i}{\partial z_j} = p_i(\delta_{ij} - p_j) \]

  <p><strong>最终合体：交叉熵损失对原始 Logit \(z_i\) 的梯度</strong></p>
  <p>
    交叉熵损失标量为 \(\mathcal{L} = -\sum_{k} y_k \ln p_k\)（在自回归下一个词预测中，\(y\) 为真实标签的 One-hot 向量，\(\sum_k y_k = 1\)）。
    根据多元链式法则求 \(\frac{\partial \mathcal{L}}{\partial z_i}\)：
  </p>
  \[ \frac{\partial \mathcal{L}}{\partial z_i} = - \sum_{k} \frac{y_k}{p_k} \frac{\partial p_k}{\partial z_i} \]
  <p>代入 Softmax 雅可比公式：</p>
  \[ \frac{\partial \mathcal{L}}{\partial z_i} = - \sum_{k} \frac{y_k}{p_k} \Big[ p_k (\delta_{ki} - p_i) \Big] = - \sum_{k} y_k (\delta_{ki} - p_i) \]
  <p>拆解求和符号：</p>
  \[ \frac{\partial \mathcal{L}}{\partial z_i} = - \sum_{k} y_k \delta_{ki} + \sum_{k} y_k p_i = - y_i + p_i \sum_{k} y_k \]
  <p>因为真实分布满足归一化 \(\sum_k y_k = 1\)，由此诞生了深度学习史上最典雅对称的公式：</p>
  \[ \frac{\partial \mathcal{L}}{\partial \mathbf{z}} = \mathbf{p} - \mathbf{y} \]
  <p>
    <strong>几何与工程直觉</strong>：损失对 Logits 的反向梯度，
    <strong>恰好精确等于预测概率与目标分布的残差！</strong>
    如果模型对正确类别的预测概率为 0.99，回传梯度仅有 \(0.99 - 1 = -0.01\)（微调）；若预测概率仅为 0.05，回传梯度为 \(0.05 - 1 = -0.95\)（极其剧烈地往上拉升该 Logit）。
  </p>
</section>

<h3>5. 教科书级实现：Bigram 频数统计 vs 神经网络学习</h3>
<p>
  以下代码完整展现了 Karpathy <code>makemore</code> Part 1 的核心对比：纯频数表查找 vs 单层神经网络优化。
</p>

<pre><code><span class="kw">import</span> torch
<span class="kw">import</span> torch.nn.functional <span class="kw">as</span> F

<span class="cm"># [逐行剖析] 1. 构建玩具字符语料库与字符映射字典</span>
words = [<span class="st">'emma'</span>, <span class="st">'olivia'</span>, <span class="st">'ava'</span>, <span class="st">'isabella'</span>, <span class="st">'sophia'</span>, <span class="st">'charlotte'</span>]
chars = sorted(list(set(<span class="st">''</span>.join(words))))
<span class="cm"># 引入特殊开始/结束标识 '.'</span>
stoi = {s: i + 1 <span class="kw">for</span> i, s <span class="kw">in</span> enumerate(chars)}
stoi[<span class="st">'.'</span>] = 0
itos = {i: s <span class="kw">for</span> s, i <span class="kw">in</span> stoi.items()}
vocab_size = len(stoi)

<span class="cm"># ========================================================</span>
<span class="cm"># 方法一：经典统计计数表（显式 MLE 解析解）</span>
<span class="cm"># ========================================================</span>
N = torch.zeros((vocab_size, vocab_size), dtype=torch.int32)
<span class="kw">for</span> w <span class="kw">in</span> words:
    chs = [<span class="st">'.'</span>] + list(w) + [<span class="st">'.'</span>]
    <span class="kw">for</span> ch1, ch2 <span class="kw">in</span> zip(chs, chs[1:]):
        N[stoi[ch1], stoi[ch2]] += 1

<span class="cm"># Laplace 伪计数平滑并按行归一化成转移矩阵 P</span>
P = (N + 1).float()
P /= P.sum(1, keepdim=True)

<span class="cm"># ========================================================</span>
<span class="cm"># 方法二：神经网络单层无偏置线性层（梯度下降法逼近）</span>
<span class="cm"># ========================================================</span>
xs, ys = [], []
<span class="kw">for</span> w <span class="kw">in</span> words:
    chs = [<span class="st">'.'</span>] + list(w) + [<span class="st">'.'</span>]
    <span class="kw">for</span> ch1, ch2 <span class="kw">in</span> zip(chs, chs[1:]):
        xs.append(stoi[ch1])
        ys.append(stoi[ch2])
xs = torch.tensor(xs)
ys = torch.tensor(ys)
num_samples = xs.nelement()

<span class="cm"># 初始化可学习权重矩阵 W (vocab_size x vocab_size)</span>
g = torch.Generator().manual_seed(2147483647)
W = torch.randn((vocab_size, vocab_size), generator=g, requires_grad=True)

<span class="cm"># 梯度下降训练循环</span>
<span class="kw">for</span> k <span class="kw">in</span> range(100):
    <span class="cm"># [逐行剖析] 前向传播：将输入索引转为 one-hot 向量后做线性映射</span>
    <span class="cm"># xenc @ W 本质上就是根据输入索引选择 W 的对应行（即 Embedding 查找）</span>
    xenc = F.one_hot(xs, num_classes=vocab_size).float()
    logits = xenc @ W                      <span class="cm"># 线性输出 Logits</span>
    
    <span class="cm"># [逐行剖析] 数值稳定 Softmax：减去 max(logits)</span>
    counts = (logits - logits.max(dim=1, keepdim=True).values).exp()
    probs = counts / counts.sum(1, keepdims=True)
    
    <span class="cm"># [逐行剖析] 负对数似然损失 NLL</span>
    loss = -probs[torch.arange(num_samples), ys].log().mean()
    
    <span class="cm"># [逐行剖析] 反向传播与权重更新</span>
    W.grad = None                          <span class="cm"># 梯度清零比 zero_() 更高效</span>
    loss.backward()
    W.data += -50.0 * W.grad               <span class="cm"># 大步长梯度更新</span>

print(f"统计矩阵交叉熵下界: {-P[xs, ys].log().mean().item():.4f}")
print(f"神经网络优化达到的损失: {loss.item():.4f}")</code></pre>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么连通工业级推理：从转移矩阵到现代 LLM 采样解码器</h4>
  <p>
    我们在 ChatGPT、Claude 或本地模型中调整的 <strong>Temperature（采样温度）</strong>与 <strong>Top-p（核采样）</strong>，
    其背后的数学根基，正是本讲介绍的条件概率分布与 Softmax 能量形变。
  </p>
  <p>
    <strong>温度调节的本质</strong>：
    在模型推理阶段，将未归一化的 Logits \(z_i\) 缩放为 \(z_i / T\)：
    当 \(T \to 0\) 时，概率分布迅速坍缩为 argmax（贪心选择最大概率项，回答最死板确定）；
    当 \(T = 0.7 \sim 1.0\) 时，平滑拉开候选项的概率分布，兼顾逻辑严密与发散灵感；
    当 \(T \to \infty\) 时，概率退化为均匀分布（纯随机乱码）。
    语言模型输出的从来不是一句确定的话，而是一张随时随地根据采样策略展开的概率流。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">一个语言模型在某验证集上的交叉熵是 \(1.2\) nats/token，其对应的困惑度（Perplexity, PPL）最接近多少？</p>
  <ul class="opts">
    <li>1.2</li>
    <li data-ok>约 3.3</li>
    <li>0.3</li>
    <li>无法从交叉熵推出</li>
  </ul>
  <p class="why">
    \(\text{PPL} = \exp(\mathcal{L}) = e^{1.2} \approx 3.32\)。几何直觉解释：模型在每一步预测时，其不确定性平均等价于在约 3.3 个完全等概率的候选 Token 之间进行二选一或三选一纠结。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么自回归大模型（如 GPT）可以在一次前向计算中，高度并行地计算长度为 \(T\) 的所有序列位置的预测损失？</p>
  <ul class="opts">
    <li>因为模型参数极小</li>
    <li>因为使用了分布式多卡流水线并行</li>
    <li data-ok>因为因果下三角掩码保证了位置 \(t\) 的隐层表征只依赖历史，所有位置的目标标签在训练阶段全量已知（Teacher Forcing）</li>
    <li>因为训练时重复使用了两遍数据</li>
  </ul>
  <p class="why">
    在训练期间，真实完整文本全部已知。借助因果掩码遮蔽未来信息，矩阵运算可以一次性计算所有时刻的隐层表示，并与右移一位的目标序列逐位计算交叉熵，实现并行训练；而在自回归推理生成时，下一词尚未诞生，因此必须串行逐步解码。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">模型 A 在数据集 1 上训练并测得验证集 Loss 为 2.1，模型 B 在数据集 2 上测得 Loss 为 1.8。能否由此断言模型 B 的语言建模能力更强？</p>
  <ul class="opts">
    <li>可以，交叉熵是放之四海皆准的绝对指标</li>
    <li>可以，只要单位都是 nats/token</li>
    <li data-ok>不可以：不同数据集固有的香农信息熵 \(H(p)\) 不同，且不同分词器（Tokenizer）每个 Token 的信息承载量也不一致</li>
    <li>不可以，必须先转换为 Perplexity 才能比较</li>
  </ul>
  <p class="why">
    根据定理 \(\mathcal{L} = H(p) + D_{\mathrm{KL}}(p \parallel q)\)，损失下界由数据固有熵 \(H(p)\) 决定。若数据集 2 是语法高度受限的代码，其本身的信息熵可能只有 1.2；而数据集 1 是百科全书，熵为 2.0。此时模型 A 的 KL 散度仅为 0.1，反而远优于模型 B 的 0.6。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在计算单样本多分类交叉熵损失 \(\mathcal{L} = -\ln p_y\) 时，损失关于未归一化分值 Logits 向量的偏导数 \(\frac{\partial \mathcal{L}}{\partial \mathbf{z}}\) 等于什么？</p>
  <ul class="opts">
    <li>\(\mathbf{p} \odot (1 - \mathbf{p})\)</li>
    <li data-ok>\(\mathbf{p} - \mathbf{y}\)（其中 \(\mathbf{y}\) 为真实的 One-hot 目标向量）</li>
    <li>\(-\frac{1}{\mathbf{p}}\)</li>
    <li>\(\mathbf{z} - \mathbf{y}\)</li>
  </ul>
  <p class="why">
    经由前述严密的多元链式法则与 Softmax 雅可比矩阵收缩求和，\(\frac{\partial \mathcal{L}}{\partial z_i} = p_i - y_i\)。这一结果形式极简，意味着每个分值的梯度直接由预测概率与真实指示函数的差值决定。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">为什么工业级推理引擎在计算 <code>softmax(z)</code> 之前，必须先将向量减去其最大值 <code>z - max(z)</code>？</p>
  <ul class="opts">
    <li>为了让均值归零，加速后续收敛</li>
    <li>为了让负数变成正数</li>
    <li data-ok>利用平移不变性保证数值稳定性，使指数项的最大输入为 0，防止浮点数指数运算发生溢出（Overflow）</li>
    <li>防止注意力矩阵产生稀疏化</li>
  </ul>
  <p class="why">
    因为 Softmax 具有平移不变性 \(\mathrm{softmax}(z - c) = \mathrm{softmax}(z)\)。令 \(c = \max_k z_k\) 后，指数项的最大自变量为 \(0\)，\(e^0 = 1\)，所有指数项满足 \(0 &lt; e^{z_i - c} \le 1\)，彻底避免了 <code>exp(z)</code> 发生浮点溢出变为 <code>inf</code> 的惨剧。
  </p>
</div>
`
});
