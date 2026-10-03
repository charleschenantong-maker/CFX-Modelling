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
  Transformer 唯一真正的新东西就是注意力。它的数学形式短到可以一行写完，
  但围绕它衍生出的工程（FlashAttention、KV Cache、GQA、RoPE）几乎决定了推理成本。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：注意力就是在图书馆查资料——你带着问题（query）走进书库，
    每本书有标签（key），先比较匹配程度，再按匹配程度把内容（value）按比例取回来。<br />
    <strong>这一讲要建立的直觉</strong>：每个词都能「回头看」全句，并自己决定该看谁、看多重。<br />
    <strong>读完你能回答</strong>：那个吓人的公式里，每个字母在干什么？为什么序列长一倍，计算量要涨四倍？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    「他把钱存进了<strong>银行</strong>」和「他坐在河<strong>岸</strong>边」——中文里同一个词在不同上下文中含义不同。
    一个固定窗口的 n-gram 模型无法解决这个问题，因为它没有机制去「回头看」决定性的那几个词。
    注意力给出的答案是：<strong>让每个位置主动检索整段历史，检索权重由内容相似度决定</strong>。
  </p>
</section>

<h3>1. 一行公式，三个角色</h3>
\[ \mathrm{Attn}(Q,K,V) \;=\; \mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}} + M\right) V \]
<dl class="kv">
  <dt>Q (query)</dt><dd>当前位置「我想找什么」——由当前 token 的表示线性变换得到</dd>
  <dt>K (key)</dt><dd>每个历史位置「我是什么」——用于与 query 做匹配</dd>
  <dt>V (value)</dt><dd>每个历史位置「我能提供什么信息」——按权重加权求和</dd>
  <dt>1/√d_k</dt><dd>尺度因子，控制点积的方差（下面推导）</dd>
  <dt>M</dt><dd>掩码：因果注意力在 \(j > i\) 处填 \(-\infty\)，使位置 \(i\) 看不到未来</dd>
</dl>
<p>
  整个过程就是一次<strong>软检索</strong>：softmax 输出的权重是「检索强度」，\(V\) 的加权和是「检索结果」。
  与数据库检索的区别是：它是完全可微的，可以用梯度下降学习「该问什么、该怎么答」。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么除以 \(\sqrt{d_k}\)？</h4>
  <p>设 \(q, k \in \mathbb{R}^{d_k}\) 的各分量独立、均值 0、方差 1，则点积</p>
  \[ q \cdot k = \sum_{i=1}^{d_k} q_i k_i, \qquad \mathbb{E}[q\cdot k] = 0, \qquad \mathrm{Var}[q\cdot k] = d_k \]
  <p>
    所以点积的标准差是 \(\sqrt{d_k}\)。若不缩放，当 \(d_k = 128\) 时点积的量级在 \(\pm 11\) 附近，
    softmax 会进入饱和区：最大项接近 1，其余接近 0，<strong>梯度几乎消失</strong>。
    除以 \(\sqrt{d_k}\) 把方差拉回 1，softmax 保持在一个有梯度的范围内。
  </p>
</section>

<h4>1.1 把「除以 \(\sqrt{d_k}\)」的推导写完整</h4>
<p>
  上一节说「点积的方差是 \(d_k\)」，这里给出完整推理。设 \(q, k \in \mathbb{R}^{d_k}\)，
  各分量 \(q_i, k_i\) 相互独立、均值为 0、方差为 1（这是初始化后和前几层归一化后的常见近似）。那么：
</p>
\[ \mathbb{E}[q \cdot k] = \mathbb{E}\Big[\sum_{i=1}^{d_k} q_i k_i\Big] = \sum_{i=1}^{d_k} \mathbb{E}[q_i]\,\mathbb{E}[k_i] = 0 \]
\[ \mathrm{Var}[q \cdot k] = \sum_{i=1}^{d_k} \mathrm{Var}[q_i k_i]
   = \sum_{i=1}^{d_k} \mathbb{E}[q_i^2]\,\mathbb{E}[k_i^2] = \sum_{i=1}^{d_k} 1 = d_k \]
<p>
  所以点积的标准差是 \(\sqrt{d_k}\)。当 \(d_k = 128\) 时，未缩放的点积典型落在 \(\pm 11\) 之间；
  而 softmax 对输入的尺度极其敏感——输入差 10 与差 1，输出分布会从「几乎均匀」变成「几乎 one-hot」。
</p>
<p>
  更精确地说：softmax 的雅可比矩阵含因子 \(p_i(\delta_{ij} - p_j)\)。当某个 \(p_i \to 1\) 时，
  该行所有偏导 \(\to 0\)，梯度消失。<strong>除以 \(\sqrt{d_k}\) 就是把点积的方差重新标定到 1，
  让 softmax 工作在还有梯度的区间里。</strong>这不是「防止数值溢出」这种工程细节，而是训练能否进行的问题。
</p>

<h4>1.2 张量形状：一次注意力里到底流动着什么</h4>
<p>以 Llama-3-8B 的规格为例（\(d = 4096\)、\(h = 32\)、\(d_{\text{head}} = 128\)、\(h_{kv} = 8\)，批 \(B = 2\)、序列 \(T = 1024\)）：</p>
<table class="tbl small">
  <thead><tr><th>张量</th><th>形状</th><th>元素数</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>输入 \(X\)</td><td>(2, 1024, 4096)</td><td>8.4 M</td><td>每个位置一个 4096 维向量</td></tr>
    <tr><td>\(Q\)</td><td>(2, 32, 1024, 128)</td><td>8.4 M</td><td>32 个 Q 头</td></tr>
    <tr><td>\(K\) / \(V\)</td><td>(2, 8, 1024, 128)</td><td>2.1 M</td><td>只有 8 组（GQA），宽度是 Q 的 1/4</td></tr>
    <tr><td>注意力分数 \(QK^\top\)</td><td>(2, 32, 1024, 1024)</td><td><strong>67.1 M</strong></td><td>这是 \(O(T^2)\) 的来源</td></tr>
    <tr><td>输出</td><td>(2, 1024, 4096)</td><td>8.4 M</td><td>拼接所有头后投影</td></tr>
  </tbody>
</table>
<p>
  注意第 4 行：<strong>分数矩阵的元素数（67 M）是输入（8.4 M）的 8 倍</strong>，
  而且当 \(T\) 从 1024 涨到 8192 时它会涨到 64 倍。如果把它物化到显存，
  fp16 下就是 \(2 \times 32 \times 8192^2 \times 2\ \text{B} = 8.6\) GB——
  仅仅为了算一次注意力。<em>这就是 FlashAttention 要解决的问题。</em>
</p>

<h4>1.3 为什么用 softmax，而不是「直接选最相关的那个」</h4>
<p>
  一个自然的想法是硬检索：只看相似度最高的那个位置（hard attention）。它的问题是不可微——
  「选出最大值」这个操作本身没有梯度，无法通过反向传播学习「该问什么、该怎么答」。
</p>
<p>
  \(\mathrm{softmax}\) 是 \(\arg\max\) 的<strong>光滑近似</strong>：温度越低越接近 one-hot，
  温度越高越接近平均。于是模型可以同时做到两件事——<em>选出最重要的位置</em>（前向行为）
  和<em>通过梯度学习如何选择</em>（反向训练）。这个「用可微的软操作替代不可微的硬操作」的思路，
  在整个深度学习里反复出现（软注意力、可微渲染、Gumbel-Softmax 采样）。
</p>

<h4>1.4 FlashAttention：把 \(O(T^2)\) 的显存变成 \(O(T)\)</h4>
<p>
  核心观察是：GPU 的算力很快，但显存读写很慢。朴素实现把 \(T\times T\) 的分数矩阵写回显存、
  再读出来做 softmax，瓶颈全在带宽上。FlashAttention 做三件事：
</p>
<ol>
  <li><strong>分块</strong>：把 \(Q\)、\(K\)、\(V\) 切成能放进片上 SRAM 的小块，在片内完成整段计算，不落盘。</li>
  <li><strong>在线 softmax</strong>：softmax 需要全局最大值与总和，但分块时还不知道全局值。它用递推维护
      「当前最大值 \(m\)」与「当前指数和 \(\ell\)」，每读一块就修正一次：
      \[ m_{\text{new}} = \max(m_{\text{old}}, \max(s_{\text{block}})), \qquad
         \ell_{\text{new}} = e^{m_{\text{old}}-m_{\text{new}}}\,\ell_{\text{old}} + \sum_j e^{s_j - m_{\text{new}}} \]
      \[ O_{\text{new}} = e^{m_{\text{old}}-m_{\text{new}}}\,O_{\text{old}} + e^{s_{\text{block}}-m_{\text{new}}} V_{\text{block}} \]
      最后输出 \(O / \ell\)。数学上与一次性 softmax 完全等价，只是换了计算顺序。
  </li>
  <li><strong>反向重算</strong>：不在前向保存分数矩阵，反向时按块重新算一遍（用算力换显存）。</li>
</ol>
<p>
  结果：显存从 \(O(T^2)\) 降到 \(O(T)\)，速度通常还更快。
  <strong>这是一个「用更好的计算顺序换取更少的数据搬运」的经典案例</strong>——
  同样的思想后来出现在几乎所有高效 kernel 里。
</p>

<h4>1.5 KV Cache：把数字算到具体模型上</h4>
<p>用 Llama-3-8B 的规格（\(L = 32\)、\(h_{kv} = 8\)、\(d_{\text{head}} = 128\)）和 fp16（2 字节）：</p>
<table class="tbl small">
  <thead><tr><th>层级</th><th>计算</th><th>结果</th></tr></thead>
  <tbody>
    <tr><td>每 token 每层</td><td>\(2 \times 8 \times 128 \times 2\ \text{B}\)</td><td><strong>4 KB</strong>（K 与 V 各 2 KB）</td></tr>
    <tr><td>每 token 全部 32 层</td><td>\(4\ \text{KB} \times 32\)</td><td><strong>128 KB</strong></td></tr>
    <tr><td>一条 8k 上下文的序列</td><td>\(128\ \text{KB} \times 8192\)</td><td><strong>≈ 1 GiB</strong></td></tr>
    <tr><td>批 16 条同时解码</td><td>\(1\ \text{GiB} \times 16\)</td><td><strong>≈ 16 GiB</strong></td></tr>
  </tbody>
</table>
<p>
  最后一行值得停一下：<strong>8k 上下文、批 16 时，KV Cache 与模型权重一样大</strong>（bf16 的 8B 权重约 16 GB）。
  这解释了三件事：（1）长上下文推理的显存瓶颈往往不是权重而是缓存；（2）GQA 把 K/V 头数降到 1/4，
  缓存直接省 4 倍；（3）KV Cache 量化（到 int8）是非常划算的优化。
</p>

<h4>1.6 RoPE 的旋转矩阵与「相对位置」性质</h4>
<p>RoPE 把 \(d\) 维空间两两配对，每一对 \((2i, 2i+1)\) 用一个二维旋转矩阵，旋转角度与该维度的频率和位置成正比：</p>
\[ \theta_i = \text{base}^{-2i/d}, \qquad
   R(\theta_i, m) = \begin{pmatrix} \cos m\theta_i & -\sin m\theta_i \\ \sin m\theta_i & \cos m\theta_i \end{pmatrix} \]
<p>把位置 \(m\) 的 query 与位置 \(n\) 的 key 分别旋转后做点积，利用旋转矩阵的正交性得到：</p>
\[ \big\langle R_m q,\; R_n k \big\rangle = \big\langle q,\; R_{n-m}\, k \big\rangle \]
<p>
  也就是说<strong>注意力分数只依赖相对距离 \(n-m\)</strong>，与绝对位置无关——这正是它外推性较好的原因。
  另一个实践细节：基频 <code>base</code> 的取值会影响长上下文能力。
  原始 RoPE 用 \(10000\)，而 Llama-3 用的是 \(500000\)（见模块 04 的 config 表）——
  基频越大，不同维度的旋转速度差别越缓，位置编码在更长的序列上越平滑。
  「位置插值」「YaRN」「NTK 缩放」这些长上下文技巧，本质上都是在改这一族频率。
</p>

<h3>2. 多头：把 \(d\) 切成 \(h\) 份</h3>
<p>
  单头注意力只能学一种「相似度」。多头把 \(d\) 维表示分成 \(h\) 个子空间并行做注意力，再拼接投影回 \(d\) 维：
</p>
\[ \mathrm{MHA}(X) = \big[\, \mathrm{head}_1; \dots; \mathrm{head}_h \,\big] W^O, \qquad \mathrm{head}_i = \mathrm{Attn}(XW_i^Q,\; XW_i^K,\; XW_i^V) \]
<p>
  参数量与单头几乎相同（\(4d^2\) 总量分配到各头），<strong>计算量也几乎不变</strong>，
  但表达能力显著增强。经验上不同的头会分别关注：相邻 token、句法依赖、指代对象、以及某些难以命名的统计模式。
</p>

<h3>3. 两个必须记住的复杂度</h3>
<table class="tbl">
  <thead><tr><th>量</th><th>公式</th><th>含义</th></tr></thead>
  <tbody>
    <tr><td>注意力计算量</td><td>\(O(T^2 d)\)</td><td>序列长度翻倍 → 计算量变 4 倍，这是长上下文昂贵的根源</td></tr>
    <tr><td>注意力矩阵显存</td><td>\(O(h \cdot T^2)\)</td><td>朴素实现要物化 \(T \times T\) 的分数矩阵；FlashAttention 通过分块与重计算避免它</td></tr>
    <tr><td>KV Cache 显存</td><td>\(2 \cdot L \cdot h_{kv} \cdot d_{\text{head}} \cdot T \cdot \text{bytes}\)</td><td>生成时缓存历史 K/V，避免重复计算；这是推理显存的主要开销</td></tr>
  </tbody>
</table>
<p>
  <span class="t" data-tterm="FlashAttention" data-d="IO 感知的注意力实现：分块计算并在反向时重计算，不把 T×T 矩阵写回显存，速度更快且更省显存。">FlashAttention</span>
  的本质是<strong>把瓶颈从算力搬到显存带宽</strong>：GPU 的算术单元很快，但显存读写很慢，所以「少读写、多计算」通常更快。
</p>
<p>
  <span class="t" data-tterm="KV cache" data-d="自回归生成时缓存每层历史的 key/value，使每步只需计算新 token 的 Q 并与缓存做注意力。">KV Cache</span>
  解释了一个常见困惑：为什么长对话越来越慢、越来越贵？因为每个 token 都要与全部历史做注意力，且缓存随长度线性增长。
  这也引出了 <span class="t" data-tterm="GQA" data-d="Grouped-Query Attention：多个 query 头共享一组 key/value 头，KV 缓存按比例缩小，几乎不掉点。">GQA</span> /
  <span class="t" data-tterm="MQA" data-d="Multi-Query Attention：所有 query 头共享一组 KV，缓存最小，但质量损失比 GQA 大。">MQA</span>：
  减少 KV 头数，把缓存压到 \(1/g\)，用极小的质量代价换取数倍的并发能力。现代开源模型大多用 GQA。
</p>

<h3>4. 位置信息怎么进来</h3>
<p>注意力本身是<strong>置换等变</strong>的：打乱输入顺序，输出只是跟着打乱。所以位置必须显式注入。</p>
<table class="tbl small">
  <thead><tr><th>方案</th><th>做法</th><th>优点 / 缺点</th></tr></thead>
  <tbody>
    <tr><td>学习式位置 embedding</td><td>每个位置一个可训练向量，加到 token embedding 上</td><td>简单；但无法外推到训练时的最大长度</td></tr>
    <tr><td>正弦编码（原论文）</td><td>用不同频率的 sin/cos 生成固定向量</td><td>无参数、可外推；表达力一般</td></tr>
    <tr><td><strong>RoPE</strong>（主流）</td><td>把 Q/K 向量按二维子空间<em>旋转</em>一个与位置成正比的角度</td><td>点积只依赖相对位置差，外推性好，可与长度插值配合</td></tr>
    <tr><td>ALiBi</td><td>直接在注意力分数上减去与距离成正比的偏置</td><td>极简、外推好；表达力略受限</td></tr>
  </tbody>
</table>
<p>RoPE 的关键直觉：把位置 \(m\) 写成旋转矩阵 \(R_m\)，则</p>
\[ \langle R_m q,\; R_n k \rangle = \langle q,\; R_{n-m} k \rangle \]
<p>注意力分数只依赖 \(n-m\)（相对距离），这就是它外推性较好的原因。</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：20 行 numpy 实现因果自注意力</h4>
<pre><code>import numpy as np

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

def attention(X, Wq, Wk, Wv, causal=True):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv          <span class="cm"># (T, d_k)</span>
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)            <span class="cm"># (T, T)</span>
    if causal:
        mask = np.triu(np.ones_like(scores), k=1).astype(bool)
        scores = np.where(mask, -1e9, scores)  <span class="cm"># 屏蔽未来</span>
    A = softmax(scores)
    return A @ V, A                            <span class="cm"># 输出 与 注意力权重</span>

rng = np.random.default_rng(0)
T, d, dk = 6, 16, 8
X  = rng.normal(size=(T, d))
Wq, Wk, Wv = (rng.normal(size=(d, dk)) / np.sqrt(d) for _ in range(3))
out, A = attention(X, Wq, Wk, Wv)
print(np.round(A, 3))          <span class="cm"># 上三角应为 0（看不到未来）</span>
print("每行和为 1:", np.allclose(A.sum(1), 1))</code></pre>
  <p>
    实验建议：(1) 把 <code>causal</code> 改成 False，观察权重矩阵变对称；
    (2) 把 \(d_k\) 从 8 提到 512，把 <code>/np.sqrt(d_k)</code> 去掉，观察 softmax 退化成 one-hot；
    (3) 手算一个 \(2\times 2\) 的例子，与代码结果对照。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    注意力解决的是「如何按内容相似度加权组合信息」。你的 crossfade 问题里有结构完全相同的对象：
    <strong>在 \([0,T]\) 上对两条增益曲线做加权组合</strong>。区别是：
    注意力权重由数据学出来（\(O(T^2)\) 个自由度，需要大量样本），
    而你的权重由<strong>物理约束</strong>（功率守恒、C¹ 连续）与<strong>少量可解释参数</strong>决定。
    这正好是你项目要论证的立场：<em>当样本只有几百条时，把自由度交给物理，而不是交给模型。</em>
  </p>
</section>

<h3>5. 本模块术语</h3>
<ul>
  <li><span class="t" data-tterm="Self-attention" data-d="Q、K、V 都来自同一序列的注意力；若 K/V 来自另一序列则称交叉注意力。">自注意力</span>、
      <span class="t" data-tterm="Causal mask" data-d="上三角为 −∞ 的掩码，保证位置 i 只能看到 j ≤ i。">因果掩码</span>。</li>
  <li><span class="t" data-tterm="Prefill vs decode" data-d="Prefill 并行处理整个提示（计算受限）；decode 逐 token 生成（显存带宽受限）。">预填充与解码</span>、
      <span class="t" data-tterm="Arithmetic intensity" data-d="每字节显存流量对应的浮点运算数，用来判断 kernel 是算力受限还是带宽受限。">算术强度</span>。</li>
  <li><span class="t" data-tterm="RoPE" data-d="Rotary Position Embedding，通过旋转 Q/K 注入相对位置。">RoPE</span>、
      <span class="t" data-tterm="Context extension" data-d="通过位置插值、YaRN、NTK 缩放等方法把上下文窗口拉长。">上下文扩展</span>。</li>
</ul>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">序列长度从 2k 增加到 8k，朴素的注意力计算量变为原来的几倍？</p>
  <ul class="opts">
    <li>4 倍</li>
    <li data-ok>16 倍</li>
    <li>8 倍</li>
    <li>2 倍</li>
  </ul>
  <p class="why">
    注意力分数矩阵是 \(T \times T\)，计算量随 \(T^2\) 增长。\(8/2 = 4\)，平方后是 16 倍。
    这正是长上下文需要用 FlashAttention、稀疏注意力或线性注意力变体来救的原因。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">一个 \(L=32\) 层、\(h_{kv}=8\) 个 KV 头、每头 \(d_{\text{head}}=128\) 的模型，在 \(T=8192\)、fp16 下 KV Cache 大约多大？</p>
  <ul class="opts">
    <li data-ok>约 1 GB</li>
    <li>约 8 GB</li>
    <li>约 64 GB</li>
    <li>约 0.5 GB</li>
  </ul>
  <p class="why">
    \(2 \times L \times h_{kv} \times d_{\text{head}} \times T \times \text{bytes}
    = 2 \times 32 \times 8 \times 128 \times 8192 \times 2
    \approx 1.07\times10^{9}\) 字节 ≈ <strong>1 GB</strong>，这是<em>单条</em>序列的缓存。
    并发 8 条就是 8 GB——「先算单条、再乘并发」是显存规划的标准动作。
    若换成 MHA（\(h_{kv}=32\)），单条立刻变成 4 GB，这就是 GQA 存在的理由。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于注意力权重的一个常见误解是：</p>
  <ul class="opts">
    <li>它可以用来回传梯度</li>
    <li data-ok>权重高就代表模型「认为」那个词重要，因此可以直接当作解释</li>
    <li>它需要 softmax 归一化</li>
    <li>它在因果掩码下是下三角结构</li>
  </ul>
  <p class="why">
    注意力权重是<strong>中间计算量</strong>，不是因果解释。多个头、多层、残差与 MLP 会一起决定输出，
    权重高不等于对最终预测贡献大（已有工作证明二者常常不一致）。
    若要解释模型，应使用消融、梯度归因或因果干预，而不是直接展示 attention map。
  </p>
</div>

<div class="acc" data-t="深入：为什么 decode 阶段是「显存带宽受限」？" data-badge="性能">
  <div class="acc-body">
    <p>生成第 \(t\) 个 token 时，模型需要：</p>
    <ul>
      <li>读取<strong>全部权重</strong>（几十 GB 量级，每个 token 都要读一遍）</li>
      <li>读取 KV Cache（随长度增长）</li>
      <li>做一次前向（此时只有 1 个新 token 参与，矩阵乘退化为向量乘矩阵）</li>
    </ul>
    <p>
      算力几乎用不上，时间花在「把权重从显存搬到计算单元」。
      所以推理速度的经验公式是 \( \text{tokens/s} \approx \dfrac{\text{memory bandwidth}}{\text{model bytes}} \)
      （分子是显存带宽，分母是模型字节数）。
      这解释了三件事：量化能提速（字节数变小）、批处理能提高吞吐（同一次权重读取服务多个序列）、
      以及为什么小模型在消费级显卡上也能跑得很快。
    </p>
    <p>反过来，<strong>prefill</strong> 阶段把整个提示并行处理，是算力受限，所以要靠 FlashAttention 与更高效的 kernel。</p>
  </div>
</div>
`
});
