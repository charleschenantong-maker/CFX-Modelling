/* content/00b-primer.js — 模块 P：零基础预备课 */
COURSE.register({
  id: "mP",
  part: 0,
  num: "P",
  title: "预备课：从「猜下一个词」到「训练」——把基础概念串起来",
  en: "Primer — From Guessing to Training",
  minutes: 60,
  tags: ["零基础", "必读", "直觉优先"],
  body: String.raw`
<p class="lead">
  这一讲的假设只有一个：你听说过 <strong>token</strong>、<strong>神经网络</strong>、<strong>概率预测</strong>这几个词，
  但不确定它们之间是什么关系，也不确定「训练」到底在做什么。
  读完这一讲，你会看懂后面所有模块的公式<em>在说什么</em>——即使你暂时还不能自己把它们推出来。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>这一讲怎么读</h4>
  <p>
    <strong>不要跳读，也不要背公式。</strong>每一节都是「先讲一个生活里的例子 → 再写成一行式子 → 再手算一遍」。
    手算的数字都很小，你可以拿纸跟着算；算过一遍，公式就不再是符号，而是你亲手做过的一件事。
  </p>
  <p>读完后你应该能回答四个问题：模型输出的是什么？参数是什么？损失是什么？梯度下降在干什么？</p>
</section>

<h3>1. 先看一张地图：从一句话到一次改进</h3>
<div class="flow">
  <div class="nd">一句话</div><div class="ar">→</div>
  <div class="nd">切成 token</div><div class="ar">→</div>
  <div class="nd">变成数字（向量）</div><div class="ar">→</div>
  <div class="nd hi">神经网络算出分数</div><div class="ar">→</div>
  <div class="nd">变成概率</div><div class="ar">→</div>
  <div class="nd">和正确答案比 → 损失</div><div class="ar">→</div>
  <div class="nd hi">微调参数</div>
</div>
<p>
  整门课讲的就是这条链子。后面出现的所有名词——tokenizer、embedding、注意力、交叉熵、学习率、LoRA——
  都只是这条链子上某一个环节的<strong>细节</strong>。
</p>

<h3>2. 「预测」到底预测什么？——一张概率表</h3>
<p>
  你在手机上打字时，输入法会在候选栏给你几个词，而且<strong>顺序是按「它觉得你接下来最可能打哪个」排的</strong>。
  大模型做的是同一件事，只不过它给出的不是三个候选，而是<strong>词表里每一个 token 的概率</strong>（可能是十几万个）。
</p>
<p>先看一个更熟悉的例子：天气预报。</p>
<table class="tbl small">
  <thead><tr><th>天气</th><th>概率</th></tr></thead>
  <tbody>
    <tr><td>晴</td><td>0.70</td></tr>
    <tr><td>阴</td><td>0.20</td></tr>
    <tr><td>雨</td><td>0.10</td></tr>
  </tbody>
</table>
<p>三个数都 ≥ 0，加起来正好等于 1。这就是<strong>概率分布</strong>：把「所有可能结果」各分一个 0 到 1 之间的数，总和为 1。</p>
<p>模型内部其实先算出一组<strong>没有归一化的分数</strong>，叫做 <span class="t" data-tterm="Logits" data-d="softmax 之前的原始分数，可以是任意实数（有正有负），还不是概率。">logits</span>。
  要把它们变成概率，用一个叫 <span class="t" data-tterm="Softmax" data-d="把任意一组实数变成正数且总和为 1 的函数：先取指数，再除以总和。">softmax</span> 的函数：<strong>先取指数，再除以总和</strong>。</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算一次 softmax（跟着算一遍）</h4>
  <p>假设模型对三个候选词给出 logits：\(z = [2.0,\ 1.0,\ 0.1]\)。那么</p>
  \[ e^{2.0} = 7.39,\qquad e^{1.0} = 2.72,\qquad e^{0.1} = 1.105 \]
  <p>三者相加 \(7.39+2.72+1.105 = 11.215\)，于是概率是</p>
  \[ p = \left[\frac{7.39}{11.215},\ \frac{2.72}{11.215},\ \frac{1.105}{11.215}\right] = [0.66,\ 0.24,\ 0.10] \]
  <p>
    注意三件事：分数大的概率一定大（指数是单调递增的）；结果一定都是正数；加起来一定是 1。
    <strong>这三条就是 softmax 存在的全部理由。</strong>
  </p>
</section>
<p>
  为什么要输出概率，而不是直接输出一个答案？三个原因，都很实际：
  <strong>①</strong> 概率可以「打分」——猜得越准、给正确答案的概率越高，我们才有东西可以优化；
  <strong>②</strong> 概率可以「采样」——同一个问题能生成不同的回答；
  <strong>③</strong> 训练时需要知道模型「错得有多离谱」，而不仅仅是对或错。
</p>

<h3>3. 神经网络 = 一堆可以拧的旋钮</h3>
<p>
  先说最小的零件：<strong>一个神经元</strong>。它做三件事——把输入乘上权重、加起来、再过一次非线性函数。
</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算一个神经元</h4>
  <p>设输入 \(x_1 = 2,\ x_2 = 3\)，权重 \(w_1 = 0.5,\ w_2 = -1\)，偏置 \(b = 1\)：</p>
  \[ \text{weighted sum} = 0.5\times 2 + (-1)\times 3 + 1 = 1 - 3 + 1 = -1 \]
  <p class="hint">（左边这个 <code>weighted sum</code> 就是「加权和」。）</p>
  <p>再用一个非线性函数（例如 ReLU：负数变 0，正数不变）得到输出：</p>
  \[ \text{output} = \mathrm{ReLU}(-1) = 0 \]
  <p>如果把 \(w_2\) 从 \(-1\) 改成 \(0\)，加权和变成 \(1+0+1=2\)，输出就变成 \(2\)。<strong>这就是「拧旋钮改变行为」的含义。</strong></p>
</section>
<dl class="kv">
  <dt>参数</dt><dd>就是这些 \(w\) 和 \(b\)。一个 7B 模型有 70 亿个这样的数字。「训练」就是找出让损失最小的那一组合适的数字。</dd>
  <dt>层</dt><dd>把很多神经元并排放在一起，就是「一层」；一层算完的结果喂给下一层。</dd>
  <dt>深度</dt><dd>层的数量。层数多 → 能表达的规则更复杂 → 但更难训、更贵。</dd>
  <dt>非线性</dt><dd>如果每层都只是乘加（线性），多层叠起来还是等价于一层——这是初学最常见的误解。必须夹一个非线性函数（ReLU、GELU、SiLU 等），深度才有意义。</dd>
</dl>
<p>
  <span class="t" data-tterm="Neural network" data-d="由多层「加权求和 + 非线性」组成的可微函数，参数靠梯度下降学习。">神经网络</span>
  本质上就是一个<strong>参数极多、但结构固定的函数</strong>。给它输入，它给输出；学习只改变参数，不改变结构。
</p>

<h3>4. 「猜得好不好」怎么衡量？——损失函数</h3>
<p>
  训练需要一个可以打分的指标。语言模型用的叫<span class="t" data-tterm="Cross-entropy" data-d="交叉熵：对正确答案的概率取负对数。猜得越准，值越小。">交叉熵</span>，
  对「下一个 token」的情形，公式简单到只有一项：<strong>正确答案的概率取负对数</strong>。
</p>
\[ \text{loss} = -\log p_{\text{correct}} \]
<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算四种情况的损失</h4>
  <table class="tbl small">
    <thead><tr><th>给正确答案的概率 \(p\)</th><th>损失 \(-\ln p\)</th><th>怎么理解</th></tr></thead>
    <tbody>
      <tr><td>0.90</td><td>0.105</td><td>很自信且对了 → 惩罚很小</td></tr>
      <tr><td>0.50</td><td>0.693</td><td>一半把握 → 中等惩罚</td></tr>
      <tr><td>0.10</td><td>2.303</td><td>几乎没猜到 → 惩罚大</td></tr>
      <tr><td>0.01</td><td>4.605</td><td><strong>很自信但错了</strong> → 惩罚最大</td></tr>
    </tbody>
  </table>
  <p>
    最后一行是重点：负对数对「自信的错误」惩罚得极重。这逼着模型<strong>要么别乱自信，要么就真的学对</strong>。
  </p>
</section>
<p>
  为什么偏偏要用对数？因为它把「概率相乘」变成「对数相加」：一整句话的概率是每个位置概率的乘积，
  取对数后就变成加法，几十万个位置求和也不会数值下溢。顺便，它的单位还是信息论里的「比特」或「nats」，
  有明确的物理含义（模块 01 会展开）。
</p>
<p>
  把所有位置的损失取平均，就得到训练时看到的 <strong>loss</strong>。对它取指数，就是
  <span class="t" data-tterm="Perplexity" data-d="困惑度：exp(平均损失)。可以粗略理解为“模型每一步平均在多少个候选中犹豫”。">困惑度</span>：
  \(\text{PPL} = e^{\text{loss}}\)。loss = 2.303 对应 PPL = 10，意思是「每步大约在 10 个候选之间犹豫」。
</p>

<h3>5. 怎么把参数改好？——梯度下降（下山）</h3>
<p>
  现在我们有了一把「尺子」（损失）。问题变成：70 亿个旋钮，每个该往哪个方向拧、拧多少？
  答案是<span class="t" data-tterm="Gradient descent" data-d="沿着损失下降最快的方向（负梯度）小步移动参数。">梯度下降</span>。
  它的直觉只有一句：<strong>如果你站在山坡上，想知道往哪走能最快下山，就看脚下最陡的方向。</strong>
</p>
<p>在一维情形里，「最陡方向」就是导数。用一个最简单的例子：</p>
\[ f(w) = (w - 3)^2 \qquad\Longrightarrow\qquad f'(w) = 2(w-3) \]
<p>最小值显然在 \(w = 3\)。我们从一个错误的地方出发，看梯度下降怎么走过去（学习率 \(\eta = 0.1\)）：</p>
<table class="tbl small">
  <thead><tr><th>步</th><th>当前 \(w\)</th><th>梯度 \(f'(w)=2(w-3)\)</th><th>更新 \(w \leftarrow w - \eta f'(w)\)</th><th>损失 \(f(w)\)</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0.00</td><td>−6.00</td><td>\(0 - 0.1\times(-6) = 0.60\)</td><td>9.00</td></tr>
    <tr><td>1</td><td>0.60</td><td>−4.80</td><td>\(0.6 - 0.1\times(-4.8) = 1.08\)</td><td>5.76</td></tr>
    <tr><td>2</td><td>1.08</td><td>−3.84</td><td>\(1.08 + 0.384 = 1.464\)</td><td>3.69</td></tr>
    <tr><td>3</td><td>1.46</td><td>−3.07</td><td>1.77</td><td>2.36</td></tr>
  </tbody>
</table>
<p>
  每一小步损失都在下降，而且越靠近谷底步子越小（因为梯度本身变小了）。
  这里出现了一个新名词：<strong>\(\eta\) 叫学习率</strong>，也就是「步子的大小」。
</p>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>学习率：初学最容易踩的坑</h4>
  <ul>
    <li><strong>太大</strong>：在山谷两侧来回横跳甚至越跳越远（损失变成 NaN）——就像下山时一步跨过整个山谷。</li>
    <li><strong>太小</strong>：损失确实在降，但慢到你在 Colab 用完额度还没训完。</li>
    <li><strong>先大后小</strong>：真实训练里学习率会先「热身」（warmup）再逐渐变小（余弦衰减），原因见模块 05。</li>
  </ul>
</section>
<p>
  真实训练比这个例子多两个部件：<strong>梯度是在一小批数据上算的</strong>（小批量，mini-batch），
  以及<strong>优化器</strong>会记住历史梯度来调整每一步（AdamW 等，模块 05）。
  但它们都是在上面那一行更新公式上做改进，方向还是「负梯度」。
</p>

<h3>6. 把上面五节拼成训练循环</h3>
<pre><code><span class="cm"># 伪代码：这六行就是“训练”的全部骨架</span>
for step in range(total_steps):
    x, y = get_batch()                 <span class="cm"># 1. 取一批数据（输入 x、正确答案 y）</span>
    logits = model(x)                  <span class="cm"># 2. 前向：算出每个位置对词表的分数</span>
    probs  = softmax(logits)           <span class="cm"># 3. 变概率</span>
    loss   = -log(probs[y]).mean()     <span class="cm"># 4. 打分：正确答案的负对数概率</span>
    grads  = backward(loss)            <span class="cm"># 5. 反向：算出每个参数该往哪拧（链式法则）</span>
    params = params - lr * grads       <span class="cm"># 6. 更新参数</span></code></pre>
<p>
  六个步骤，没有一个可以省略。后面所有「高级技巧」都是在优化其中某一步：
  第 1 步 → 数据处理与 tokenizer（模块 02）；第 2 步 → 注意力与 Transformer 结构（模块 03、04）；
  第 4 步 → 各种损失函数（模块 01、07）；第 5–6 步 → 优化器、混合精度、并行（模块 05、06）；
  而第 6 步之后「怎么知道真的变好了」→ 评估（模块 09）。
</p>
<p>
  顺便解释两个你一定会遇到的名词：<strong>step（步）</strong>是上面循环里的一次迭代；
  <strong>epoch（轮）</strong>是把整个训练集完整看过一遍。一个 epoch 通常包含很多 step。
</p>

<h3>7. 从「一个词」到「一整段」：为什么需要 Transformer</h3>
<p>
  输入法只看你刚敲的两三个字。但真正的语言理解需要看更远：<em>「他把钱存进了银行」</em>和
  <em>「他坐在河岸边」</em>，同一个词的含义由远处的上下文决定。
</p>
<p>
  早期做法是固定窗口（只看前 N 个词）或循环网络（把历史压成一个状态），都有明显缺陷。
  Transformer 的答案是 <span class="t" data-tterm="Attention" data-d="注意力：让每个位置按“内容相似度”去检索整段历史，并加权取回信息。">注意力</span>：
  <strong>让每个位置主动去「查」整段历史，查谁、查多少由内容相似度决定。</strong>
</p>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>一句话类比</h4>
  <p>
    把注意力想象成在图书馆查资料：你带着一个问题（query）走进书库，每本书有自己的标签（key），
    你先比较问题和标签的匹配程度，再按匹配程度把书里的内容（value）按比例取回来。
    这个「比较 → 加权 → 取回」的过程，就是模块 03 那个看起来吓人的公式。
  </p>
</section>
<p>
  <strong>这一节不需要你记住公式。</strong>只要记住：模型不是把整段文字当成一个整体处理，
  而是让每个位置都能「看到」其他位置，并且自己决定看谁。
</p>

<h3>8. 你需要的最小数学清单</h3>
<table class="tbl small">
  <thead><tr><th>工具</th><th>一句话</th><th>在课程哪里用到</th></tr></thead>
  <tbody>
    <tr><td>函数与复合</td><td>把输入变成输出；多层就是函数套函数</td><td>整个神经网络</td></tr>
    <tr><td>加权的和（向量点积）</td><td>两组数逐个相乘再相加，用来衡量「像不像」</td><td>神经元、注意力</td></tr>
    <tr><td>概率与期望</td><td>可能性的分配；期望是「平均而言」</td><td>语言模型的目标、损失</td></tr>
    <tr><td>对数与指数</td><td>\(\log\) 把乘法变加法；\(e^x\) 把任意实数变成正数</td><td>softmax、交叉熵、困惑度</td></tr>
    <tr><td>导数（梯度）</td><td>变化率；告诉你哪个方向下降最快</td><td>反向传播、梯度下降</td></tr>
    <tr><td>求和符号 \(\sum\)</td><td>把一堆同类项加起来</td><td>损失、参数量、显存公式</td></tr>
  </tbody>
</table>
<p>如果某一条你觉得陌生，<strong>先不急着补数学</strong>：本文档在每个用到它的地方都会重新解释一遍直觉。</p>

<h3>9. 训练实验其实就是 git 工作流</h3>
<p>你已经熟悉 branch / commit / tag / PR，这套习惯可以直接迁移到实验管理上：</p>
<table class="tbl small">
  <thead><tr><th>git 概念</th><th>在实验里的对应物</th></tr></thead>
  <tbody>
    <tr><td>branch（分支）</td><td>一次实验尝试：改一个超参、换一份数据</td></tr>
    <tr><td>commit（提交）</td><td>一次可复现的记录：代码 + config + 结果摘要</td></tr>
    <tr><td>tag（标签）</td><td>一个里程碑：例如 <code>v0.1-baseline</code>、<code>v0.2-lora-r16</code></td></tr>
    <tr><td>PR（合并请求）</td><td>把「这次实验的结论」合并进你的笔记/报告，并留下审查记录</td></tr>
    <tr><td>revert（回滚）</td><td>丢弃一次坏实验，回到上一个能跑的版本</td></tr>
  </tbody>
</table>
<p>
  这套映射不是比喻——它真的能救命：当你有 20 次实验、两个月后要写报告时，
  「哪一组数字来自哪个配置」只能靠 commit 记录回答。
</p>

<h3>10. 新手最常见的 8 个误解</h3>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>先纠正这些，再看后面的模块</h4>
  <ol>
    <li><strong>「模型在数据库里查答案」</strong>——不是。它只是算概率，能力来自参数里的统计规律。</li>
    <li><strong>「loss 降到 0 就是学好了」</strong>——不是。训练集 loss 降到 0 往往是背下来了（过拟合），要看验证集。</li>
    <li><strong>「参数越多一定越好」</strong>——不是。数据不够时，参数越多越容易过拟合。</li>
    <li><strong>「训练就是把知识灌进去」</strong>——不准确。训练是调整概率分布；知识以「能压低损失的规律」形式存在。</li>
    <li><strong>「模型 7B 就有 7GB」</strong>——不是。B 指参数量；7B 在 bf16 下约 14 GB，训练时还要梯度与优化器状态。</li>
    <li><strong>「梯度下降一次就能找到最优」</strong>——不是。它是一步步逼近，而且通常只能找到「足够好」的解。</li>
    <li><strong>「换了模型就等于换了知识」</strong>——很多时候你要的是<em>行为</em>（按格式回答），那用微调；要的是<em>知识</em>，优先用检索。</li>
    <li><strong>「AI 说的一定对」</strong>——语言模型会一本正经地编造，尤其是引用和数字。所有外部事实都要核对（见附录 D）。</li>
  </ol>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">模型对下一个词给出 logits，经过 softmax 后得到三个概率 0.5、0.3、0.2。如果正确答案是第一个词，损失约是多少？</p>
  <ul class="opts">
    <li>0.5</li>
    <li data-ok>约 0.69</li>
    <li>约 1.61</li>
    <li>无法计算</li>
  </ul>
  <p class="why">
    \(-\ln 0.5 = 0.693\)。记住这个数：<strong>概率 0.5 对应损失 0.69</strong>，它是最常用的「中位参考点」。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么神经网络每一层之间必须要有非线性函数？</p>
  <ul class="opts">
    <li>为了让计算更快</li>
    <li data-ok>因为若干线性变换复合起来仍然是线性变换，多层就退化等价于一层</li>
    <li>为了让参数变少</li>
    <li>为了处理中文</li>
  </ul>
  <p class="why">
    两个线性映射复合还是线性映射（\(W_2(W_1x) = (W_2W_1)x\)）。夹入非线性（ReLU 等）之后，
    多层才真正获得表达复杂函数的能力。这是深度学习最基础的一条。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">下面哪件事<strong>不</strong>是训练循环里的必要步骤？</p>
  <ul class="opts">
    <li>前向计算得到 logits</li>
    <li>计算损失</li>
    <li data-ok>把每个参数都手动设定一个初值范围并逐个检查</li>
    <li>反向传播得到梯度并更新参数</li>
  </ul>
  <p class="why">
    初始化确实重要，但它是<em>训练开始前的一次性步骤</em>（且通常按默认规则随机初始化），
    不属于循环内的必要步骤。循环内只有：取数据 → 前向 → 算损失 → 反向 → 更新。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">你在一维例子里把学习率从 0.1 改成 1.0（\(f(w)=(w-3)^2\)，从 \(w=0\) 出发）。会发生什么？</p>
  <ul class="opts">
    <li>收敛更快，一步到位</li>
    <li data-ok>更新后 \(w = 0 - 1\times(-6) = 6\)，越过最优点 3 到另一侧 3 的位置，来回横跳</li>
    <li>损失立刻变成 0</li>
    <li>参数不再更新</li>
  </ul>
  <p class="why">
    \(\eta=1\) 时第一步到 6，第二步梯度 \(2(6-3)=6\)，更新到 \(6-6=0\)——在 0 与 6 之间永久振荡。
    这就是「学习率太大」的最小可复现例子，也是模块 05 里 loss spike 的雏形。
  </p>
</div>

<div class="acc" data-t="深入：三小时上手清单（第一次动手就跑这些）" data-badge="动手">
  <div class="acc-body">
    <ol>
      <li><strong>第 0–20 分钟</strong>：打开 <a href="https://colab.research.google.com/notebooks/intro.ipynb" target="_blank" rel="noopener">Colab 入门 notebook</a>，
          新建 notebook，运行 <code>import torch; print(torch.cuda.is_available())</code>，确认你有 GPU。</li>
      <li><strong>第 20–60 分钟</strong>：跟着<a href="#m1">模块 01</a>的「动手实验 1」写一遍 bigram，
          亲手看到损失与困惑度这两个数字。</li>
      <li><strong>第 60–110 分钟</strong>：跟着<a href="#m2">模块 02</a>解剖 tokenizer，
          把同一句中文在两种词表下的 token 数记下来。</li>
      <li><strong>第 110–170 分钟</strong>：跑<a href="#appB">附录 B 的 E7</a>（模型阶梯 + 分组交叉验证 + 置换检验）。
          这个实验不需要 GPU，却直接产出你申请项目里最有分量的那张图。</li>
      <li><strong>第 170–180 分钟</strong>：把三份结果写进 <code>notes/Day1.md</code>，<code>git commit</code> 一次。</li>
    </ol>
    <p><strong>完成标准</strong>：你能不看笔记说出「loss 是正确答案概率的负对数」与「梯度告诉参数该往哪拧」。</p>
  </div>
</div>
`
});
