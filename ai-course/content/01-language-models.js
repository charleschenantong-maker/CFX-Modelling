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
  <h4><span class="ic">✓</span>先把交叉熵翻译成模型使用者的话</h4>
  <p>
    训练时模型每次只需要回答一个问题：<strong>在已经看到的上下文下，下一个真实 token 给了多大概率？</strong>
    如果真实答案拿到的概率是 0.5，单步损失约为 0.69；如果只有 0.01，损失约为 4.61。损失变小，意味着模型把更多概率质量放到了正确答案上。
    这比先背下概率空间的符号更重要，因为它直接告诉你日志里的 loss 在测什么。
  </p>
  <p>
    困惑度只是把平均损失换回“等效候选数”：\(\mathrm{PPL}=e^{\mathcal{L}}\)。PPL=10 不表示模型真的只会十个词，而表示在这批数据上，它的平均不确定性大约像在十个等可能选项中选择。
  </p>
</section>

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

<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算区：概率对象先对齐</h4>
  <p>
    概率测度 \(P\) 给事件分配非负质量并满足 \(P(\Omega)=1\)。有限词表上的概率向量落在单纯形
    \(\Delta^{V-1}=\{\mathbf{p}\in\mathbb{R}^{V}:p_i\ge0,\sum_i p_i=1\}\)。给定样本后，把每个词出现的相对频率记为经验分布 \(\hat p_i=n_i/N\)。交叉熵是
    \(H(p,q)=-\sum_i p_i\ln q_i\)，表示用 \(q\) 编码来自 \(p\) 的样本时的平均代价。
  </p>
</section>

<h3>2. 从频数统计到最大似然估计：Karpathy Bigram 的极简本质</h3>
<p>
  在引入复杂神经网络之前，最朴素的自回归假设是<strong>一阶马尔可夫链（Bigram 语言模型）</strong>：
  假设当前词出现的概率仅依赖于紧邻的前一个词，即 \(P(x_t \mid x_1, \dots, x_{t-1}) = P(x_t \mid x_{t-1})\)。
</p>

<p>
  答案先行，不用先看证明：<strong>极大似然的最优解就是“数个数再归一化”</strong>，
  即 \(p_{ij}^{*} = N_{ij} / \sum_{k} N_{ik}\)。
  拿最小的玩具语料 <code>aba</code> 验证：相邻对只有 \((a, b)\) 与 \((b, a)\) 各出现 1 次，
  所以 \(P(b \mid a) = 1/1 = 1\)，\(P(a \mid b) = 1/1 = 1\)——
  这个二元模型是完全确定的：看见 \(a\) 必出 \(b\)，看见 \(b\) 必出 \(a\)，它的条件熵是 0。
  下面的拉格朗日乘子推导只是在证明“数个数”恰好就是最优解，请把证明当成对直觉的盖章，而不是结论本身。
</p>

<div class="acc" data-t="选读·第二遍：最优解就是数个数归一化（拉格朗日证明）" data-badge="可选">
  <div class="acc-body">
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
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算区：三词 Bigram 频数到 MLE</h4>
  <p>词表按 \(['a','b','c']\) 排列。超短序列取 \(a\ b\ a\ c\ a\ b\)，只数相邻词对：</p>
  <pre>
频数矩阵 N（行是当前词，列是下一个词）
          a   b   c    行和
      a [ 0   2   1 ]    3
      b [ 1   0   0 ]    1
      c [ 1   0   0 ]    1

逐行归一化：
P(a|a) = 0/3 = ____   P(b|a) = 2/3 = ____   P(c|a) = 1/3 = ____
P(a|b) = 1/1 = ____   P(b|b) = 0/1 = ____   P(c|b) = 0/1 = ____
P(a|c) = 1/1 = ____   P(b|c) = 0/1 = ____   P(c|c) = 0/1 = ____

MLE 转移矩阵：P_ij = N_ij / sum_k N_ik
  </pre>
  <p>填完后每一行都应和为 \(1\)。若某行没有观测，分母为零，实际系统会另加平滑或回退分布；本例每行都有计数，所以直接归一化即可。</p>
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

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>直觉先行：一枚硬币加一个二元语料，摸到熵的手感</h4>
  <p>
    <strong>一句话直觉</strong>：熵就是“平均惊诧程度”。公平硬币正反各一半，
    每次结果的自信息都是 \(-\ln(1/2) = \ln 2 \approx 0.693\)，平均下来熵也是 \(0.693\) nats——
    换成 bit 单位恰好是 1 bit（单位换算见本节末尾）。
  </p>
  <table class="tbl small">
    <thead><tr><th>玩具分布</th><th>概率</th><th>熵（nats）</th><th>熵（bits）</th></tr></thead>
    <tbody>
      <tr><td>公平硬币</td><td>\([0.5, 0.5]\)</td><td>\(0.693\)</td><td>\(1.000\)</td></tr>
      <tr><td>偏置硬币</td><td>\([0.9, 0.1]\)</td><td>\(0.325\)</td><td>\(0.469\)</td></tr>
      <tr><td>语料 <code>aba</code> 的 bigram</td><td>见 \(a\) 必出 \(b\)</td><td>\(0.000\)</td><td>\(0.000\)</td></tr>
    </tbody>
  </table>
  <p>
    偏置硬币的手算：\(-(0.9 \ln 0.9 + 0.1 \ln 0.1) \approx -(-0.0948 - 0.2303) = 0.325\) nats，
    除以 \(\ln 2\) 得 \(0.469\) bits——越确定，熵越小；而 <code>aba</code> 的转移完全确定，熵直接是 0。
    <strong>LLM payoff</strong>：训练损失永远甩不掉数据本身的熵 \(H(p)\)，
    所以不同数据集、不同分词器下的绝对 loss 不可比；读日志时，loss 长期停在一个平台，
    先问“是不是已经接近这个语料的熵下界”，再问“模型是不是不够大”。
    下面的吉布斯不等式只是把“\(D_{\mathrm{KL}}\) 非负”这句直觉写成证明。
  </p>
</section>

<div class="acc" data-t="选读·第二遍：损失下界就是数据熵（吉布斯不等式证明）" data-badge="可选">
  <div class="acc-body">
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
  <p>
    <strong>单位换算（读日志与读论文时天天用）</strong>：本讲全用自然对数 \(\ln\)，单位叫
    <strong>nat</strong>；若换成以 2 为底的对数 \(\log_{2}\)，单位叫 <strong>bit</strong>，
    两者只差一个常数因子 \(\ln 2 \approx 0.693\)，即 \(H_{\mathrm{bits}} = H_{\mathrm{nats}} / \ln 2\)。
    例：验证损失 \(1.2\) nats/token 换成比特是 \(1.2 / 0.693 \approx 1.73\) bits/token，
    而困惑度两种写法一致：\(\mathrm{PPL} = e^{1.2} = 2^{1.73} \approx 3.3\)。
    所以比较两篇论文的熵或损失时，先看它是 nats 还是 bits——差一个 \(\ln 2\) 就会差出“模型变强近一半”的假象。
  </p>
</section>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算区：切线不等式如何给出 Gibbs 不等式</h4>
  <p>从 \(\ln t\le t-1\) 开始，令 \(t=q_i/p_i\)，只对 \(p_i>0\) 的项书写：</p>
  <pre>
ln(q_i/p_i) &lt;= q_i/p_i - 1
乘以 p_i &gt; 0：
p_i ln(q_i/p_i) &lt;= p_i(q_i/p_i - 1) = q_i - p_i
对 i 求和：
sum_i p_i ln(q_i/p_i) &lt;= sum_i(q_i-p_i)
右边 = (sum_i q_i) - (sum_i p_i) = 1 - 1 = 0
左边 = -D_KL(p || q)
所以 -D_KL(p || q) &lt;= 0，最终 D_KL(p || q) &gt;= 0
  </pre>
  <p>每一步放缩方向没有改变：乘上的 \(p_i\) 非负，求和也保持不等号方向；等号要求每个有正质量的项满足 \(q_i/p_i=1\)。</p>
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

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>直觉先行：两个分值就够看清 Softmax 与残差梯度</h4>
  <p>
    <strong>一句话直觉</strong>：Softmax 只关心分值之差。取最小的非平凡例子 \(z = [2, 1]\)：
    \(e^{2} \approx 7.389\)，\(e^{1} \approx 2.718\)，和 \(S \approx 10.107\)，
    得 \(p \approx [0.7311, 0.2689]\)——分差 1 恰好对应概率比 \(e^{1} \approx 2.718\)。
  </p>
  <p>
    <strong>灵敏度手算</strong>：\(p_1(1 - p_1) \approx 0.7311 \times 0.2689 \approx 0.1966\)，
    所以把 \(z_1\) 推高 \(0.1\)，\(p_1\) 约上升 \(0.0197\)（线性近似，可用计算器复核）。
    若真值是第一类（\(y = [1, 0]\)），残差梯度 \(p - y \approx [-0.2689, 0.2689]\)：
    梯度下降沿负梯度走，恰好把 \(z_1\) 往上推、把 \(z_2\) 往下压。
    <strong>LLM payoff</strong>：每个训练 token 发出的学习信号就是这个残差向量；
    自信但答错（\(|p - y|\) 接近 1）时梯度最猛，这也是读梯度范数日志时判断“模型是否还在学新东西”的依据。
    下面的雅可比推导只是把“灵敏度 \(= 0.197\)”写成一般公式 \(p_i(\delta_{ij} - p_j)\)。
  </p>
</section>

<div class="acc" data-t="选读·第二遍：梯度就是残差 p − y（Softmax 雅可比证明）" data-badge="可选">
  <div class="acc-body">
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
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算区：平移后的 Softmax 与残差梯度</h4>
  <p>给定 \(z=[2.0,1.0,0.1]\)，先减去最大值 \(c=2.0\)。</p>
  <pre>
平移： z-c = [2.0-2.0, 1.0-2.0, 0.1-2.0] = [0.0, -1.0, -1.9]
指数： exp(z-c) ≈ [1.0000, 0.3679, 0.1496]
总和： S ≈ 1.0000 + 0.3679 + 0.1496 = 1.5175
Softmax：p = exp(z-c)/S ≈ [0.6587, 0.2424, 0.0986]

若目标词是第一个词，y=[1,0,0]：
p-y ≈ [0.6587-1, 0.2424-0, 0.0986-0]
     ≈ [-0.3413, 0.2424, 0.0986]
  </pre>
  <p>残差的分量和约为 \(0\)，因为 \(\sum_i p_i=\sum_i y_i=1\)。目标 Logit 的负梯度会被梯度下降向上推，其余 Logits 则被向下推。</p>
</section>

<h3>5. 教科书级实现：Bigram 频数统计 vs 神经网络学习</h3>
<p>
  以下代码完整展现了 Karpathy <code>makemore</code> Part 1 的核心对比：纯频数表查找 vs 单层神经网络优化。
</p>

<pre><code><span class="kw">import</span> torch
<span class="kw">import</span> torch.nn.functional <span class="kw">as</span> F

<span class="cm"># [逐行剖析] 1. 构建玩具字符语料库与双向字符映射字典</span>
words = [<span class="st">'emma'</span>, <span class="st">'olivia'</span>, <span class="st">'ava'</span>, <span class="st">'isabella'</span>, <span class="st">'sophia'</span>, <span class="st">'charlotte'</span>]
chars = sorted(list(set(<span class="st">''</span>.join(words))))
<span class="cm"># 引入特殊开始/结束标识 '.' 作为因果序列哨兵</span>
stoi = {s: i + 1 <span class="kw">for</span> i, s <span class="kw">in</span> enumerate(chars)}
stoi[<span class="st">'.'</span>] = 0
itos = {i: s <span class="kw">for</span> s, i <span class="kw">in</span> stoi.items()}
vocab_size = len(stoi)

<span class="cm"># ========================================================</span>
<span class="cm"># 方法一：经典统计计数表（显式 MLE 频数解析解）</span>
<span class="cm"># ========================================================</span>
<span class="cm"># [逐行剖析] 频次矩阵：动态形状 (V, V) = (27, 27) [int32]，显存分配连续物理块</span>
N = torch.zeros((vocab_size, vocab_size), dtype=torch.int32)
<span class="kw">for</span> w <span class="kw">in</span> words:
    chs = [<span class="st">'.'</span>] + list(w) + [<span class="st">'.'</span>]
    <span class="kw">for</span> ch1, ch2 <span class="kw">in</span> zip(chs, chs[1:]):
        N[stoi[ch1], stoi[ch2]] += 1  <span class="cm"># 原地累加转移频次</span>

<span class="cm"># [逐行剖析] Laplace 伪计数平滑并按行归一化成转移矩阵 P</span>
<span class="cm"># 动态形状: P -> (V, V) [float32] | 原地位运算: /= 沿行轴归一化</span>
P = (N + 1).float()
P /= P.sum(1, keepdim=True)

<span class="cm"># ========================================================</span>
<span class="cm"># 方法二：神经网络单层无偏置线性层（梯度下降逼近解析解）</span>
<span class="cm"># ========================================================</span>
xs, ys = [], []
<span class="kw">for</span> w <span class="kw">in</span> words:
    chs = [<span class="st">'.'</span>] + list(w) + [<span class="st">'.'</span>]
    <span class="kw">for</span> ch1, ch2 <span class="kw">in</span> zip(chs, chs[1:]):
        xs.append(stoi[ch1])
        ys.append(stoi[ch2])
<span class="cm"># 动态形状: xs -> (num_samples,), ys -> (num_samples,) [int64]</span>
xs = torch.tensor(xs)
ys = torch.tensor(ys)
num_samples = xs.nelement()

<span class="cm"># [逐行剖析] 初始化可学习权重矩阵 W: 动态形状 (V, V) = (27, 27) [float32]</span>
<span class="cm"># 自动微分: requires_grad=True 开启计算图追踪，分配反向传播梯度内存 W.grad</span>
g = torch.Generator().manual_seed(2147483647)
W = torch.randn((vocab_size, vocab_size), generator=g, requires_grad=True)

<span class="cm"># [逐行剖析] 梯度下降优化训练循环</span>
<span class="kw">for</span> k <span class="kw">in</span> range(100):
    <span class="cm"># [逐行剖析] 前向传播 1: 离散输入索引转 One-hot 浮点特征</span>
    <span class="cm"># 动态形状: xs (N,) -> one_hot -> xenc (N, V) [float32]</span>
    xenc = F.one_hot(xs, num_classes=vocab_size).float()
    
    <span class="cm"># [逐行剖析] 前向传播 2: 矩阵乘法映射为未归一化对数几率 Logits</span>
    <span class="cm"># 动态形状: (N, V) @ (V, V) -> logits (N, V) [float32]</span>
    <span class="cm"># 自动微分: 线性算子节点记录在 DAG 中，反向传播时将损失残差广播回 W</span>
    logits = xenc @ W
    
    <span class="cm"># [逐行剖析] 前向传播 3: 数值稳定的 Softmax（减去行最大值防止 exp 溢出）</span>
    <span class="cm"># 动态形状: counts -> (N, V) [float32], probs -> (N, V) [float32] (每行和为 1.0)</span>
    counts = (logits - logits.max(dim=1, keepdim=True).values).exp()
    probs = counts / counts.sum(1, keepdim=True)
    
    <span class="cm"># [逐行剖析] 损失函数: 负对数似然损失 (NLL / 交叉熵)</span>
    <span class="cm"># 动态形状: probs[torch.arange(num_samples), ys] -> (num_samples,) -> .log().mean() -> loss [标量 float32]</span>
    loss = -probs[torch.arange(num_samples), ys].log().mean()
    
    <span class="cm"># [逐行剖析] 反向传播与梯度重置</span>
    <span class="cm"># 显存机制: W.grad = None 直接解除旧梯度引用，比 zero_() 减少显存写带宽消耗</span>
    W.grad = None
    loss.backward()  <span class="cm"># 自动微分: 回溯 DAG 计算 dLoss/dW</span>
    
    <span class="cm"># [逐行剖析] 原地权重更新: 脱离 autograd 追踪 (in-place)</span>
    with torch.no_grad():
        W -= 50.0 * W.grad

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

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">论文 A 报告验证熵为 \(0.693\) nats/token，论文 B 报告为 \(1.0\) bits/token。谁的数据更不确定？</p>
  <ul class="opts">
    <li>B 更不确定，因为 1.0 大于 0.693</li>
    <li>A 更不确定，因为 nats 是更大的单位</li>
    <li data-ok>两者完全一样：\(0.693\) nats 除以 \(\ln 2\) 恰好是 \(1.0\) bit</li>
    <li>无法比较，nats 与 bits 度量的是不同的量</li>
  </ul>
  <p class="why">
    \(H_{\mathrm{bits}} = H_{\mathrm{nats}} / \ln 2 = 0.693 / 0.693 = 1.0\) bit，两边是同一个熵。
    跨论文比较前必须先统一单位，否则“\(0.693\) 对 \(1.0\)”会伪装成 30% 的差距；同理困惑度两种写法一致，\(\mathrm{PPL} = e^{0.693} = 2^{1.0} = 2\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">玩具语料只有一个词 <code>aba</code>（统计相邻对，不加起止符）。按极大似然，\(P(b \mid a)\) 与 \(P(a \mid b)\) 各是多少？</p>
  <ul class="opts">
    <li>都是 0.5，因为有两个不同的字母</li>
    <li data-ok>都是 1：\((a,b)\) 与 \((b,a)\) 各出现 1 次，归一化后 \(1/1 = 1\)</li>
    <li>\(P(b \mid a) = 2/3\)，因为语料里有两个 a</li>
    <li>无法计算，语料太短导致分母为零</li>
  </ul>
  <p class="why">
    相邻对只有 \((a,b)\)、\((b,a)\) 各 1 次，所以 \(N_{ab} = 1\) 且 a 开头的行和为 1，\(P(b \mid a) = 1/1 = 1\)；同理 \(P(a \mid b) = 1\)。
    这就是“数个数再归一化”：分母是行和（以该词开头的所有对数），不是语料总词数；确定性转移的条件熵为 0。
  </p>
</div>
`
});
