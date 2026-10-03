/* content/01-language-models.js — 模块 01：语言模型是什么 */
COURSE.register({
  id: "m1",
  part: 1,
  num: "01",
  title: "语言模型在算什么：条件概率、交叉熵与困惑度",
  en: "What a language model actually computes",
  minutes: 25,
  tags: ["核心", "概率", "必做"],
  body: String.raw`
<p class="lead">
  大模型最底层的描述其实非常朴素：<strong>它每一步只做一件事——给词表里的每个 token 打一个概率。</strong>
  「智能」「推理」「涌现」这些词，全都建立在这件事之上。这一讲把这个直觉写成可以计算的公式，
  并告诉你训练信号到底从哪来。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口（先读这 20 行）</h4>
  <p>
    如果你还没读<a href="#mP">预备课 P</a>，建议先花 20 分钟读它：那里用输入法联想讲清了「概率分布」，
    用天气预报讲清了「softmax」，用下山讲清了「梯度下降」。
  </p>
  <p>
    <strong>这一讲要建立的直觉</strong>：模型不是「想好一句话再打出来」，而是<em>一个字一个字地掷骰子</em>，
    每一步都重新算一遍概率。<br />
    <strong>读完你能回答</strong>：为什么一个标量的损失（loss）就足以改进整个模型？
    以及为什么「模型答错了」往往不是因为它不懂，而是因为它在这一步的概率分配不够好。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    给模型输入 <code>The capital of France is</code>，它输出 <code>Paris</code>。
    严格地说，它<em>没有</em>输出 <code>Paris</code>——它输出的是 5 万个实数（logits），
    经过 softmax 变成一个概率分布，<code>Paris</code> 只是其中概率最大的那个。
    那么：这个分布是怎么定义的？我们凭什么用一个标量损失就能把它训练出来？
  </p>
</section>

<h3>1. 从「一句话的概率」到逐 token 决策</h3>
<p>
  设词表为 \(\mathcal{V}\)，一段文本是 token 序列 \(x = (x_1, x_2, \dots, x_T)\)，其中 \(x_t \in \mathcal{V}\)。
  语言模型要做的是给整段序列赋一个概率。用概率的链式法则，它<strong>必然</strong>可以分解成逐 token 的条件概率：
</p>
\[ P(x_1, \dots, x_T) \;=\; \prod_{t=1}^{T} P\big(x_t \mid x_1, \dots, x_{t-1}\big) \]
<p>
  模型参数 \(\theta\) 要做的就是逼近右边每一个因子：
  \( p_\theta(x_t \mid x_{<t}) \in \Delta^{|\mathcal{V}|-1} \)（单纯形上的分布）。
  这就是<span class="t" data-tterm="Autoregressive" data-d="自回归：把上一步的输出接到输入上，逐步生成。GPT 系列、Claude、Gemini 的文本生成都是自回归的。">自回归</span>的含义：
  <strong>一次前向只预测一个位置</strong>，但一次训练可以同时监督所有位置。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>数学内核：唯一的目标函数</h4>
  <p>训练用<strong>交叉熵</strong>（等价于最大似然）。对单个样本：</p>
  \[ \mathcal{L}(\theta) \;=\; -\frac{1}{T}\sum_{t=1}^{T} \log p_\theta\big(x_t \mid x_{<t}\big) \]
  <p>把它展开成对词表的求和，就看出它其实是「真实分布」与「模型分布」的 KL 散度加一个常数：</p>
  \[ \mathcal{L} = \underbrace{H(p)}_{\text{entropy of the data}} + D_{\mathrm{KL}}\big(p \,\|\, p_\theta\big) \]
  <p class="hint">（式中的 <code>entropy of the data</code> 就是「数据本身的熵」，中文说明见下方正文。）</p>
  <p>
    所以最小化交叉熵 = 最小化模型分布与真实分布的 KL 距离。
    <strong>数据本身的熵 \(H(p)\) 是下界</strong>——这解释了两件事：
    文本越「不可预测」（比如代码、专业术语），可达到的损失就越低不了多少；
    而不同数据集之间的 loss 数值<em>不可直接比较</em>。
  </p>
  <p>工业界还常用两个等价刻度：</p>
  \[ \text{Perplexity} = \exp(\mathcal{L}), \qquad \text{Bits/token} = \frac{\mathcal{L}}{\ln 2} \]
  <p>
    Perplexity 可以读作「模型在每个位置平均在多少个候选之间犹豫」。
    Perplexity 10 ≈ 平均每次在 10 个词里挑一个。它依赖 tokenizer，所以跨模型比较时常用 bits/byte。
  </p>
</section>

<h4>1.1 换个角度看损失：它就是「惊讶程度」</h4>
<p>
  前面说损失是「正确答案概率的负对数」。信息论给同一个东西起了一个更直观的名字：
  <strong>惊讶度（surprisal）</strong>——一件事越不可能发生，它发生时你越惊讶，惊讶度就越大。
</p>
<table class="tbl small">
  <thead><tr><th>模型给正确答案的概率 \(p\)</th><th>惊讶度 \(-\ln p\)（nats）</th><th>换成比特 \(-\log_2 p\)</th></tr></thead>
  <tbody>
    <tr><td>0.99</td><td>0.010</td><td>0.014</td></tr>
    <tr><td>0.90</td><td>0.105</td><td>0.152</td></tr>
    <tr><td>0.50</td><td>0.693</td><td>1.000</td></tr>
    <tr><td>0.10</td><td>2.303</td><td>3.322</td></tr>
    <tr><td>0.01</td><td>4.605</td><td>6.644</td></tr>
  </tbody>
</table>
<p>
  注意 \(p = 0.5\) 那一行：惊讶度正好是 \(\ln 2 = 0.693\) nats，也就是<strong>1 比特</strong>。
  这不是巧合——「一个 50/50 的二元选择包含 1 比特信息」正是信息论的定义。
  用比特而不是 nats 时，公式就变成 \(-\log_2 p\)，除一个 \(\ln 2\) 即可互换。
</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算一次：熵、交叉熵与 KL</h4>
  <p>设某个位置的<strong>真实</strong>下一个词分布是 \(p = [0.5,\ 0.3,\ 0.2]\)（三个候选词）。它的<strong>熵</strong>是</p>
  \[ H(p) = -\sum_i p_i \ln p_i = 0.347 + 0.361 + 0.322 = 1.030\ \text{nats} \]
  <p>熵的含义：<em>即使你完全知道真实分布，平均每一步也至少要付 1.030 nats 的代价</em>——这是数据本身的不确定性，也是任何模型都不可能突破的地板。</p>
  <p>现在假设你的模型给出 \(q = [0.7,\ 0.2,\ 0.1]\)，那么交叉熵是</p>
  \[ H(p, q) = -\sum_i p_i \ln q_i = 0.178 + 0.483 + 0.461 = 1.122\ \text{nats} \]
  <p>两者的差就是 KL 散度，也就是「因为模型不够准，每步多付的代价」：</p>
  \[ D_{\mathrm{KL}}(p\,\|\,q) = H(p,q) - H(p) = 1.122 - 1.030 = 0.092\ \text{nats} \]
  <p>
    这三个数把训练的目标讲清楚了：<strong>\(H(p)\) 你改不了，\(D_{\mathrm{KL}}\) 才是模型要压的东西。</strong>
    所以「loss = 2.1」这种绝对值在不同数据集之间没有可比性——每个数据集的地板 \(H(p)\) 不一样。
  </p>
</section>
<p>
  还有一个常被忽略的换算：如果把困惑度转成「每个字节多少比特」（bits/byte），
  就能跨 tokenizer 比较模型了。设每 token 平均对应 \(k\) 个字节，则
  \(\text{bits/byte} = \frac{\log_2 \text{PPL}}{k}\)。
  PPL = 10 且平均每 token 4 字节时，约为 0.83 bits/byte——这个刻度在论文里比原始 loss 常见得多。
</p>

<h4>1.2 温度：同一个模型，不同的「性格」</h4>
<p>生成文本时，我们不直接用模型输出的概率，而是先做一次「软化」或「锐化」：</p>
\[ p_i(T) = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)} \]
<p>\(T\) 就是<span class="t" data-tterm="Temperature" data-d="采样温度：小于 1 让分布更尖锐（更确定），大于 1 让分布更平坦（更随机）。">温度</span>。用之前那组 logits \(z = [2.0,\ 1.0,\ 0.1]\) 手算三种温度：</p>
<table class="tbl small">
  <thead><tr><th>温度 \(T\)</th><th>得到的概率分布</th><th>熵（nats）</th><th>行为</th></tr></thead>
  <tbody>
    <tr><td>0.5</td><td>[0.864, 0.117, 0.019]</td><td>0.45</td><td>几乎总是选第一个候选，输出稳定但容易重复</td></tr>
    <tr><td>1.0</td><td>[0.659, 0.242, 0.099]</td><td>0.85</td><td>原始分布</td></tr>
    <tr><td>2.0</td><td>[0.502, 0.304, 0.194]</td><td>1.03</td><td>三个候选几乎被拉平，输出多样但容易跑题</td></tr>
  </tbody>
</table>
<p>
  <strong>关键理解</strong>：温度不改变模型「知道什么」（logits 没变），它只改变<em>从这个分布里抽样的方式</em>。
  所以「调温度让回答更准确」是一种误解——它只能让回答更确定或更发散。
  当 \(T \to 0\) 时分布退化成 one-hot，采样等价于贪心解码（永远选概率最大的那个）。
</p>

<h4>1.3 为什么模型会「自信地胡说」</h4>
<p>
  训练目标只奖励一件事：<strong>给训练数据里真实出现的下一个 token 更高的概率</strong>。
  它从不直接奖励「知道自己不知道」。于是会出现两类偏差：
</p>
<ul>
  <li><strong>分布外的问题</strong>：训练数据里没有的事实，模型没有「不知道」这个选项可用（除了特殊 token 或拒绝回答的训练），
      它只能从学过的模式里挑一个最像的接上去——这就是幻觉的机制来源。</li>
  <li><strong>校准（calibration）问题</strong>：模型说「我有 90% 把握」时，实际正确率往往不是 90%。
      常见修法是<em>温度缩放</em>（用一个在验证集上拟合的温度把概率重新标定），
      但工程上更实用的做法是：<strong>把模型输出的概率当作排序信号，而不是可信度</strong>。
  </li>
</ul>
<p>
  对你的项目有直接启发：如果用一个模型来预测「最优过渡时长」，你要评估的是<em>预测误差</em>（RMSE），
  而不是它输出的置信度；同时必须在留出集上检查误差分布，看它在哪些样本上系统性偏高——那通常意味着特征缺失（模块 09）。
</p>

<h3>2. 一次前向里，标签从哪来</h3>
<p>预训练没有任何人工标注：**输入和标签是同一段文本错开一位**。</p>
<pre><code>tokens :  The  capital  of  France  is  Paris  .
input  :  The  capital  of  France  is
label  :       capital  of  France  is  Paris</code></pre>
<p>
  这叫 <span class="t" data-tterm="Teacher forcing" data-d="训练时把真实的前缀喂给模型（而不是模型自己上一步的输出），这样所有位置的损失可以并行计算。">teacher forcing</span>。
  因为每个位置的预测只依赖它左边的内容（因果掩码，见模块 03），一次矩阵乘法就能同时算出 \(T\) 个位置的分布——
  这是 Transformer 能高效训练的根本原因。
</p>

<h3>3. 从 n-gram 到 Transformer：同一目标，不同假设</h3>
<table class="tbl">
  <thead><tr><th>模型</th><th>条件独立的假设</th><th>表示</th><th>致命弱点</th></tr></thead>
  <tbody>
    <tr><td>n-gram</td><td>只依赖前 \(n-1\) 个 token</td><td>计数表</td><td>组合爆炸、无法泛化到未见过的 n 元组</td></tr>
    <tr><td>神经概率语言模型（2003）</td><td>同上，但用连续表示</td><td>embedding + MLP</td><td>窗口仍然固定</td></tr>
    <tr><td>RNN / LSTM</td><td>用一个隐状态压缩全部历史</td><td>递归状态</td><td>长程梯度衰减、无法并行</td></tr>
    <tr><td><strong>Transformer</strong></td><td>无固定窗口，直接对全部历史做加权检索</td><td>注意力</td><td>计算量随长度平方增长</td></tr>
  </tbody>
</table>
<p>
  注意：<strong>目标函数从头到尾没变</strong>。改变的是「怎么表示 \(x_{<t}\)」。
  这也意味着：任何声称「新架构让语言模型理解语义」的说法，都要先问它是否真的改变了条件概率的估计方式。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>算力与数据的两个经验关系</h4>
  <p>模型规模 \(N\)（参数）、数据量 \(D\)（token）、训练算力 \(C\)（FLOPs）之间有一个粗略但极其有用的关系：</p>
  \[ C \;\approx\; 6\,N\,D \]
  <p>
    系数 6 = 前向 2（乘加各算一次） + 反向 4。它让你能在纸上估算：
    「7B 模型、1T token」≈ \(6 \times 7\times10^9 \times 10^{12} \approx 4.2\times10^{22}\) FLOPs。
    一块 A100 的 bf16 峰值约 \(3.1\times10^{14}\) FLOP/s，按 40% 利用率算，
    单卡需要 \(4.2\times10^{22} / (0.4\times3.1\times10^{14}) \approx 3.4\times10^{8}\) 秒 ≈ <strong>11 年</strong>；
    换成 1000 张卡并假设线性加速，才降到约 4 天——
    所以真实预训练必须并行（模块 06），而「单卡训 7B」在数学上就是不成立的。
  </p>
  <p>缩放律（Chinchilla 之后的主流结论）：在固定算力下，\(N\) 与 \(D\) 应按比例增长；而现代模型为了降低<em>推理</em>成本，
  会故意<strong>过训练</strong>（数据远多于算力最优配比）。这一点在模块 05 展开。</p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手实验 1：30 行实现 bigram 语言模型</h4>
  <p>先在最简单的模型上感受「交叉熵 = 平均负对数概率」。在 Colab 里跑：</p>
<pre><code><span class="cm"># 1) 取一小段文本</span>
text = ("the quick brown fox jumps over the lazy dog. " * 200).split()
vocab = sorted(set(text))
stoi = {w: i for i, w in enumerate(vocab)}

<span class="cm"># 2) 统计 bigram 频次（这就是「模型」）</span>
import torch
N = torch.zeros((len(vocab), len(vocab)), dtype=torch.int32)
for w1, w2 in zip(text, text[1:]):
    N[stoi[w1], stoi[w2]] += 1

<span class="cm"># 3) 加平滑后取对数概率</span>
P = (N + 1).float()                      <span class="cm"># Laplace 平滑</span>
logP = P.log(); logP -= logP.logsumexp(1, keepdim=True)

<span class="cm"># 4) 负对数似然 = 交叉熵</span>
import math
nll = [-logP[stoi[w1], stoi[w2]].item() for w1, w2 in zip(text, text[1:])]
print("loss =", sum(nll) / len(nll), " perplexity =", math.exp(sum(nll) / len(nll)))</code></pre>
  <p>
    把 <code>* 200</code> 换成真实文本（例如 TinyStories），观察 perplexity 如何随语料变化。
    这是全课程唯一的「训练」直觉来源：<strong>损失就是对数概率的平均值</strong>。
  </p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手实验 2：观察一个真实模型的下一 token 分布</h4>
<pre><code>!pip -q install transformers torch
import torch, torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForCausalLM

tok = AutoTokenizer.from_pretrained("gpt2")
mdl = AutoModelForCausalLM.from_pretrained("gpt2").eval()

prompt = "The capital of France is"
ids = tok(prompt, return_tensors="pt").input_ids
with torch.no_grad():
    logits = mdl(ids).logits[0, -1]          <span class="cm"># 词表大小的一维向量</span>
probs = F.softmax(logits, dim=-1)
top = torch.topk(probs, 8)
for p, i in zip(top.values, top.indices):
    print(f"{tok.decode(i):12s} {p.item():.4f}")

<span class="cm"># 温度对分布的影响：T<1 更尖锐，T>1 更平坦</span>
for T in (0.5, 1.0, 2.0):
    q = F.softmax(logits / T, dim=-1)
    print(T, "entropy =", -(q * q.log()).sum().item())</code></pre>
  <p>
    在这里你会看到模块 08 要讲的<strong>采样</strong>的全部素材：logits → 温度 → softmax → top-k/top-p。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    你的 Checkpoint 7 要预测的是「最优过渡时长 \(T^*\)」这类<strong>连续标量</strong>，不是 token 分布。
    但两者的训练哲学完全相同：<em>用一个可微（或至少可评估）的目标函数衡量预测与真实的差距</em>。
    区别在于：语言模型用交叉熵，你的回归用均方误差；而你的样本量只有几百条，
    所以正则化与交叉验证（模块 09）比模型容量重要得多。
  </p>
</section>

<h3>4. 本模块术语</h3>
<ul>
  <li><span class="t" data-tterm="Logits" data-d="softmax 之前的原始实数输出，可以是任意实数。">logits</span>
      → <span class="t" data-tterm="Softmax" data-d="把任意实数向量映射成概率分布：softmax(z)_i = exp(z_i) / Σ_j exp(z_j)。">softmax</span>
      → 概率分布 → 采样或取 argmax。</li>
  <li><span class="t" data-tterm="Context window" data-d="模型一次能看到的 token 数上限，由位置编码与训练时的序列长度决定。">上下文窗口</span>、
      <span class="t" data-tterm="Token" data-d="文本被切分后的最小单位，可能是词、子词或字节。见模块 02。">token</span>。</li>
  <li><span class="t" data-tterm="Maximum likelihood" data-d="最大化训练数据的似然，等价于最小化交叉熵。">最大似然</span>、
      <span class="t" data-tterm="KL divergence" data-d="两个分布的相对熵，衡量用 q 近似 p 时多付出的编码长度。">KL 散度</span>。</li>
  <li><span class="t" data-tterm="Scaling law" data-d="损失随参数量、数据量、算力按幂律下降的经验规律。">缩放律</span>（模块 05 展开）。</li>
</ul>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">一个语言模型在某语料上的交叉熵是 \(1.2\) nats/token，它的困惑度约是多少？</p>
  <ul class="opts">
    <li>1.2</li>
    <li data-ok>约 3.3</li>
    <li>约 0.83</li>
    <li>无法从交叉熵推出</li>
  </ul>
  <p class="why">
    \(\text{PPL}=\exp(1.2)\approx 3.32\)。直观理解：模型平均在约 3.3 个等概率候选之间犹豫。
    常见错误是把 PPL 当成 \(\log\) 或倒数——它一定是 \(\ge 1\) 的。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么预训练可以在一次前向中同时监督全部 \(T\) 个位置？</p>
  <ul class="opts">
    <li>因为模型很小</li>
    <li>因为使用了多卡并行</li>
    <li data-ok>因为因果掩码保证位置 \(t\) 的输出只依赖 \(x_{&lt;t}\)，因此所有位置的标签在训练时都是「已知且合法」的</li>
    <li>因为训练时用了两遍数据</li>
  </ul>
  <p class="why">
    这是自回归训练效率的核心：掩码让 \(T\) 个预测彼此独立可并行，
    而生成时必须串行（生成第 \(t\) 个 token 需要先有第 \(t-1\) 个）。
    <strong>训练并行、推理串行</strong>这个不对称，是后面 KV Cache 与批处理优化的全部动机。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">两个模型分别在自己的私有数据集上报告了验证损失 2.1 与 1.8。可以直接比较吗？</p>
  <ul class="opts">
    <li>可以，损失是绝对指标</li>
    <li>可以，只要都是 nats/token</li>
    <li data-ok>不可以：数据分布不同则 \(H(p)\) 不同，且 tokenizer 不同会让「每 token」不可比</li>
    <li>不可以，必须都用 perplexity</li>
  </ul>
  <p class="why">
    \(\mathcal{L} = H(p) + D_{\mathrm{KL}}(p\|p_\theta)\)。数据本身的熵 \(H(p)\) 是损失的地板，
    不同的数据地板不同；不同 tokenizer 下「一个 token」的信息量也不同。
    要比较必须固定数据与分词，或者用 bits/byte 这类归一化刻度。
  </p>
</div>

<div class="acc" data-t="深入：为什么「预测下一个 token」能涌现能力？" data-badge="直觉">
  <div class="acc-body">
    <p>三个层次的回答，由浅入深：</p>
    <ol>
      <li><strong>压缩视角</strong>：最优的下一个 token 预测等价于最优压缩。要压低交叉熵，模型必须发现文本中的规律——
          语法、事实共现、代码的执行语义，甚至算术规则。这些规律是<em>预测能力的副产品</em>。</li>
      <li><strong>计算视角</strong>：Transformer 是一台可微分的检索机。深度 \(L\) 意味着可以在 \(L\) 步内做多轮信息交换，
          这让「先找事实、再组合、再校验」这类多步计算可以在前向中被实现。</li>
      <li><strong>谨慎的视角</strong>：能压低损失不等于「理解」。模型学到的是<strong>数据的统计结构</strong>，
          包括其中的偏差与捷径（Clever Hans 效应）。模块 09 的置换检验就是用来检测这种「学到了假信号」的。</li>
    </ol>
    <p>对你写申请材料有用的一句话：<em>「语言模型是对文本分布的极大似然估计器；它的能力边界由数据分布与模型容量共同决定。」</em></p>
  </div>
</div>
`
});
