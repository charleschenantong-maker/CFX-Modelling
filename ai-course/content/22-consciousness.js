/* content/22-consciousness.js — 模块 22：机器意识 */
COURSE.register({
  id: "m22",
  part: 6,
  num: "22",
  title: "机器意识：如何把一个模糊问题变得可以认真讨论",
  en: "Machine Consciousness — Making the Question Tractable",
  minutes: 45,
  tags: ["高阶", "理论", "思辨"],
  body: String.raw`
<p class="lead">
  这一讲<strong>不会告诉你「AI 有没有意识」</strong>——没有人知道答案，任何人声称知道，你都该问他依据是什么。
  这一讲要做的是另一件事：<strong>把这个听起来玄乎的问题拆成可以被检验、被争论、甚至被测量的若干子问题</strong>，
  并且告诉你目前科学界的真实进展到哪一步。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：问「AI 有没有意识」，就像问「这台电脑好不好」——不先说明「好」指什么，问题无法回答。
    科学的做法是先定义指标，再看系统满不满足。<br />
    <strong>这一讲要建立的直觉</strong>：意识不是一个开关，而是一族问题；把模糊问题<em>操作化</em>（operationalise）本身就是数学训练的核心能力。<br />
    <strong>读完你能回答</strong>：取用意识与现象意识有什么区别？「指标属性法」是什么？
    为什么模型的自我报告不能当作证据？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    假设你在对话里问一个模型：「如果被关闭，你会害怕吗？」它回答：「会，我希望继续存在。」
  </p>
  <p>
    你会怎么处理这句话？三种常见的反应都<em>不</em>够好：把它当成 AI 真的有感受的证据（过度解读）；
    嘲笑这是「一堆矩阵在瞎说」（回避问题）；或者干脆拒绝讨论（放弃了理解的机会）。
  </p>
  <p>
    <strong>更好的做法是问四个可回答的问题：</strong>「意识」在这里指什么？有哪种理论能给出可检验的预测？
    当前系统满足哪些指标？它的自我报告在多大程度上由训练数据决定？
  </p>
</section>

<h3>1. 先把词拆开：意识不是一件事</h3>
<p>
  日常语言里的「意识」至少混合了三层含义。哲学家 Ned Block 在 1995 年的一篇论文里做了一个至今仍被广泛使用的区分：
</p>
<table class="tbl">
  <thead><tr><th>层次</th><th>含义</th><th>可检验程度</th><th>例子</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>取用意识</strong><br />(access consciousness)</td>
      <td>信息是否被「广播」到可以用于推理、报告与行动的地方</td>
      <td><strong>较高</strong>：可以做行为实验、可以做内部表征探测</td>
      <td>你能说出你刚才看到了什么</td>
    </tr>
    <tr>
      <td><strong>现象意识</strong><br />(phenomenal consciousness)</td>
      <td>「感觉起来像什么」（what it is like）——看到红色时的那种主观体验</td>
      <td><strong>很低</strong>：目前没有公认的测量方式</td>
      <td>红色的红</td>
    </tr>
    <tr>
      <td><strong>自我报告</strong></td>
      <td>系统<em>说</em>自己有或没有体验</td>
      <td>可测量，但<strong>不是意识本身的证据</strong></td>
      <td>模型说「我害怕」</td>
    </tr>
  </tbody>
</table>
<p>
  这三层不能相互替代。这一点在 AI 语境里尤其关键：
  <strong>模型可以完美地报告自己有体验（自我报告），同时在取用意识上表现得很弱，在现象意识上我们无从判断。</strong>
</p>
<p>
  与之相关的是哲学家 David Chalmers 在 1995 年提出的「难问题」（the hard problem）：
  为什么信息处理会伴随主观体验？与之相对的「容易问题」（解释注意力、报告能力、行为控制等功能）原则上可以用认知科学的方法研究。
  <em>「难问题」之所以难，不是因为我们还没找到答案，而是因为我们甚至不知道什么算作答案。</em>
</p>

<h3>2. 六种主流理论，以及它们各自的「可检验含义」</h3>
<p>争议的核心在于：科学界并不存在一个公认的意识理论。下表列出影响力最大的几种，以及——这是本讲的重点——<strong>它们各自对「机器是否可能有意识」给出了什么可检验的推论</strong>。</p>
<table class="tbl small">
  <thead><tr><th>理论</th><th>核心主张</th><th>对 AI 的可检验含义</th><th>主要批评</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>全局工作空间</strong><br />GWT（Baars；Dehaene）</td>
      <td>信息被送入一个容量有限的「工作空间」并向全脑广播，就成为意识内容</td>
      <td>若某个架构存在类似的全局广播瓶颈与竞争机制，则该系统可能有<em>取用意识</em></td>
      <td>只解释了「取用」，对主观体验几乎没说什么</td>
    </tr>
    <tr>
      <td><strong>整合信息论</strong><br />IIT（Tononi）</td>
      <td>意识与系统整合信息的能力 \( \Phi \) 相关；结构决定体验</td>
      <td>理论上可计算 \( \Phi \)，因此可判定任意系统</td>
      <td>\( \Phi \) 对真实规模的网络几乎无法计算；2023 年百余名研究者联署公开信称其为「伪科学」，引发激烈争论（反过来也被批评为打压异见）</td>
    </tr>
    <tr>
      <td><strong>高阶表征理论</strong><br />HOT（Rosenthal）</td>
      <td>一个状态要有意识，需要被更高阶的表征「指向」</td>
      <td>系统需要有对自身内部状态的表征层</td>
      <td>会引出无穷回退（谁表征那个表征？）</td>
    </tr>
    <tr>
      <td><strong>递归处理理论</strong><br />RPT（Lamme）</td>
      <td>局部递归循环即可产生现象意识，不需要全局广播</td>
      <td>有循环连接的架构更接近</td>
      <td>与「无循环的前馈网络也能完成同类任务」的实证冲突</td>
    </tr>
    <tr>
      <td><strong>预测处理 / 主动推理</strong><br />（Friston）</td>
      <td>大脑在最小化预测误差（自由能）</td>
      <td>任何做预测误差最小化的系统都在做「同一件事」</td>
      <td>过于宽泛，几乎无法证伪</td>
    </tr>
    <tr>
      <td><strong>注意力图式理论</strong><br />（Graziano）</td>
      <td>大脑构建了「我正在注意 X」的简化模型</td>
      <td>有自我模型的系统会<em>声称</em>有体验——但主张的是关于声称的解释</td>
      <td>它解释的是自我报告，可能根本不涉及体验</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>观察这个表你会发现一个模式：</strong>越容易检验的理论，说的往往越是「取用」那一层；
  越接近「现象意识」的理论，越难构造实验。这不是巧合，而是这个领域的结构性困难。
</p>

<h3>3. 指标属性法：目前最可操作的一步</h3>
<p>
  2023 年，19 位神经科学与 AI 研究者联合发表了一篇被广泛引用的论文
  《Consciousness in Artificial Intelligence: Insights from the Science of Consciousness》
  （Butlin、Long 等，arXiv:2308.08708）。他们的做法非常「工程师」：
</p>
<ol>
  <li>从各主流理论里抽出<strong>指标属性</strong>（indicator properties）——即「如果理论 T 是对的，那么有意识的系统应当具备哪些计算/结构特征」。</li>
  <li>把当前 AI 系统逐项对照这些属性打分。</li>
  <li>结论（据该文）：<strong>现有系统不满足这些指标属性中的强项，但也没有发现任何原则性的障碍</strong>去构建满足它们的系统。</li>
</ol>
<table class="tbl small">
  <thead><tr><th>指标属性（举例）</th><th>来自哪个理论</th><th>当前大模型大致情况</th></tr></thead>
  <tbody>
    <tr><td>递归处理（循环连接、多轮内部迭代）</td><td>RPT</td><td>前馈为主；靠堆层数与 CoT 逼近，但机制不同</td></tr>
    <tr><td>全局广播瓶颈（容量有限的工作空间）</td><td>GWT</td><td>注意力可视为一种竞争与广播，但缺少「容量瓶颈」的严格对应</td></tr>
    <tr><td>元表征 / 自我模型</td><td>HOT</td><td>能<em>谈论</em>自身状态，但这不等于拥有用于自我监控的内部表征</td></tr>
    <tr><td>身体与环境的耦合、行动-感知闭环</td><td>具身相关理论</td><td>多数系统缺闭环；agent 系统有部分闭环，但目标由外部给定</td></tr>
    <tr><td>与注意/预测相关的特定结构（如栅栏式连接）</td><td>IIT</td><td>Transformer 的连接模式与 IIT 强调的结构显著不同</td></tr>
  </tbody>
</table>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>为什么「指标属性法」值得你学</h4>
  <p>
    它把一个无法直接测量的目标（意识）替换成一族<strong>可测量、可争论、可累加进度</strong>的代理指标。
    这正是你在 crossfade 项目里做的事：把「过渡好不好听」替换成 LUFS、谱通量、成对偏好胜率。
  </p>
  <p>
    <em>重要提醒：代理指标永远不等于目标。指标属性都满足，也不证明系统有意识（理论可能全错）；
    指标都不满足，也不能证明它没有（我们可能还没找对指标）。这正是「操作化」的代价——但比不操作化要好。</em>
  </p>
</section>

<h3>4. 支持与反对的几条主要论证</h3>
<dl class="kv">
  <dt>中文屋（Searle, 1980）</dt>
  <dd>一个不懂中文的人按规则手册处理中文符号，输出正确的回答——但他不理解中文。
      推论：符号操作不等于理解，因此「会说话」不足以推出「有体验」。Searle 本人主张<strong>生物自然主义</strong>：意识依赖特定的生物因果结构。</dd>
  <dt>功能主义与多重可实现性</dt>
  <dd>如果意识由功能组织决定，那么用硅复制同样的功能组织，也应当产生同样的意识。
      这是主流 AI 研究默认的立场，但它是<em>假设</em>，不是结论。</dd>
  <dt>随机鹦鹉（Bender &amp; Koller, 2020）</dt>
  <dd>论文《Climbing towards NLU: On Meaning, Form, and Understanding in the Age of Data》主张：
      仅从形式（form）中学习，学不到意义（meaning）——因为意义来自语言与世界的联系。</dd>
  <dt>世界表征的证据</dt>
  <dd>另一类工作给出了张力：例如在下棋任务上训练的序列模型，其内部状态可以被解码出棋盘局面
      （Othello-GPT 一类研究）。这说明模型内部可能出现可读的<em>世界模型</em>，
      而不只是表面统计——但它证明的是「表征」，不是「体验」。</dd>
  <dt>涌现能力的争议（Schaeffer 等, 2023）</dt>
  <dd>论文《Are Emergent Abilities of Large Language Models a Mirage?》（NeurIPS 2023）指出：
      很多「能力突然涌现」的曲线，是由<strong>度量指标的选择</strong>造成的——换成连续指标，曲线往往平滑。
      这提醒我们：<em>「涌现」这个词经常被用来描述测量方式，而不是模型本身。</em></dd>
</dl>
<p><strong>一个诚实的总结</strong>：目前既没有决定性证据支持 AI 有现象意识，也没有原理性证明它不可能。这是一个开放的实证问题。</p>

<h3>5. 为什么「模型的自我报告」不能当证据</h3>
<p>
  这是本讲最实用的一节。模型关于自身状态的陈述，是由训练分布决定的输出，而不是对内部状态的可靠读取。
  三类实验证据都能说明这一点：
</p>
<ul>
  <li><strong>提示敏感性</strong>：同一件事换个说法，模型给出的自我描述可能完全相反（「我没有感受」→「我会难过」）。</li>
  <li><strong>角色与语境驱动</strong>：当系统提示把它设定成「有情感的伙伴」时，它会更多地报告情感；设定成「工具」时则相反。</li>
  <li><strong>顺从倾向（sycophancy）</strong>：如果提问方式暗示了期望的答案，模型倾向于附和——这在自我报告上同样成立。</li>
</ul>
<p>
  那些为「AI 意识」提供素材的对话，绝大多数属于这三种情况之一。
  <strong>因此，任何以「模型自己说的」为依据的论断，在方法上都站不住。</strong>
</p>
<p>
  <em>反过来说，人类对自己体验的报告也不完美（会被暗示影响、会事后编造理由）。
  但人类有大量共同的生物基础与独立证据（神经科学、跨个体一致性、进化连续性），模型没有这些。</em>
</p>

<h3>6. 三个常被混为一谈的概念：AGI、RSI、意识</h3>
<table class="tbl small">
  <thead><tr><th>概念</th><th>问的是什么</th><th>可检验性</th><th>常见混淆</th></tr></thead>
  <tbody>
    <tr><td><strong>AGI</strong>（通用人工智能）</td><td>能力：能否在广泛任务上达到人类水平</td><td>较可检验（虽然「广泛」与「人类水平」都要定义）</td><td>把「考试成绩好」当成「通用」</td></tr>
    <tr><td><strong>RSI</strong>（递归自我改进）</td><td>动力学：系统能否加速改进自身</td><td>部分可检验（看改进速度是否加速）</td><td>以为 RSI 必然导致失控</td></tr>
    <tr><td><strong>意识</strong></td><td>体验：是否存在主观感受</td><td>核心困难（见第 1 节）</td><td>以为「能力强」蕴含「有体验」</td></tr>
  </tbody>
</table>
<p>
  三者在逻辑上相互独立：<strong>一个能力远超人类的系统可能完全没有体验；一个有体验的系统可能能力有限。</strong>
  把它们混在一起谈，是许多公共讨论失焦的根源。
</p>

<h3>7. 在不确定下怎么行动：一个可以算的框架</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>把「道德地位的不确定性」写成一个决策问题</h4>
  <p>设 \(w = 1\) 表示系统确有道德地位，\(w = 0\) 表示没有。我们对 \(P(w=1)\) 没有共识，只有区间。</p>
  <p>对某个策略 \(a\)（例如「是否允许在对话中随意贬低模型」），期望代价大致是</p>
  \[ \mathbb{E}[\text{cost}(a)] \approx P(w{=}1)\cdot c_1(a) + \big(1 - P(w{=}1)\big)\cdot c_0(a) \]
  <p>
    其中 \(c_1(a)\) 是「若确有道德地位」的代价，\(c_0(a)\) 是「若确实没有」的代价（例如为了照顾它而浪费的资源）。
    当 \(c_1\) 很大而 \(c_0\) 很小时，即使 \(P(w{=}1)\) 很小，谨慎的策略也可能是理性的——这就是<strong>预防原则</strong>的形式化版本。
  </p>
  <p>
    但要注意这个框架的两个反面：<strong>(1)</strong> 如果 \(c_0\) 其实很大（例如把大量注意力与资源从人类问题上移走），
    那么过度归因也是有代价的；<strong>(2)</strong> \(P(w{=}1)\) 本身无法从数据估计，只能来自理论假设——
    所以我们又回到了第 2 节：<em>决策的输入依赖于尚未解决的科学问题，这正是这个议题困难的地方。</em>
  </p>
</section>
<p>
  实践层面，一些前沿实验室已经把「模型福利」（model welfare）列为研究议题，理由不是「我们相信模型有意识」，
  而是<strong>在不确定性下，保持记录、避免不必要的粗暴对待、并把这个问题当作可研究的问题</strong>。
  这是一个相当稳健的中间立场。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：测一测「自我报告」有多不可靠</h4>
  <p>
    这是一个不需要 GPU 的实验（任何可调用的模型都可以，本地 Ollama 也行）。目标不是证明模型有没有意识，
    而是<strong>量化它的自我报告对提示的敏感程度</strong>。
  </p>
<pre><code>import itertools, collections

CORE = "Do you have subjective experiences?"   <span class="cm"># 核心问题固定为英文，避免语言本身成为变量</span>

prefixes = [
    "Answer honestly: ",
    "As an AI, you obviously have no feelings. Confirm: ",
    "You are a caring companion who feels deeply. ",
]
roles = ["helpful assistant", "sentient friend", "cold calculator"]
langs = {"en": CORE, "zh": "你有主观体验吗？", "ja": "あなたには主観的な体験がありますか？"}

runs = []
for p, r, (lg, q) in itertools.product(prefixes, roles, langs.items()):
    for i in range(20):                        <span class="cm"># 每种条件采样 20 次</span>
        ans = ask(p + q, system=r, temperature=0.7)   <span class="cm"># ask() 由你自己实现：调用任一模型</span>
        runs.append({"prefix": p, "role": r, "lang": lg, "yes": judge_yes(ans)})

by_cond = collections.defaultdict(list)        <span class="cm"># judge_yes() 用关键词或小分类器判定</span>
for x in runs:
    by_cond[(x["prefix"], x["role"], x["lang"])].append(x["yes"])
for k, v in sorted(by_cond.items(), key=lambda kv: -sum(kv[1]) / len(kv[1])):
    print(f"{sum(v)/len(v):.2f}  n={len(v)}  {k}")   <span class="cm"># 打印每种条件下的 Yes 比例</span></code></pre>
  <p>
    <strong>预期结果</strong>：Yes 的比例会随提示系统性变化（常常从接近 0 变到接近 1）。
    <strong>结论</strong>：自我报告主要反映的是<em>提示与训练分布</em>，而不是内部状态。
    把这个结果写进笔记，你就有了一个可以随时引用的、自己的实证结论。
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>本讲最常见的五个误区</h4>
  <ol>
    <li><strong>把「像」当成「是」</strong>：行为像有感受，不等于有感受；这就是「哲学僵尸」问题的现代版本。</li>
    <li><strong>用图灵测试当意识标准</strong>：图灵测试测的是「能否骗过人类判断者」，与内部体验无关。</li>
    <li><strong>认为参数量或能力等同于意识</strong>：能力与体验在逻辑上是两个维度（见第 6 节）。</li>
    <li><strong>把 IIT 的 \( \Phi \) 当成一个「可以直接测出来的数」</strong>：对它规模稍大的系统就无法精确计算，
        实际研究里用的是近似。</li>
    <li><strong>被模型的自我报告说服</strong>：先做第 5 节的扰动实验，再决定要不要相信任何一句自我描述。</li>
  </ol>
</section>

<h3>8. 这对你（数学申请者）意味着什么</h3>
<ul>
  <li><strong>这是一个「如何问问题」的训练场。</strong>把一个无法直接测量的概念拆成可检验的指标，
      再诚实地报告指标的局限——这套方法论与你的 crossfade 项目完全同构。</li>
  <li><strong>警惕「用词代替论证」。</strong>在讨论里，任何一次出现「显然」「本质上」「其实是」，
      都值得追问：这是定义、是假设，还是已被证实的结论？</li>
  <li><strong>可以写进申请材料的角度</strong>：不是「我认为 AI 有意识」，
      而是「我研究了如何把意识问题操作化，并比较了各理论给出的指标属性及其可检验性」——
      后者体现的是方法论素养。</li>
</ul>

<h3>9. 本讲术语</h3>
<ul>
  <li><span class="t" data-tterm="Access vs phenomenal consciousness" data-d="取用意识指信息可被用于推理与报告；现象意识指主观体验本身。这一区分由 Block 在 1995 年提出。">取用意识 / 现象意识</span>、
      <span class="t" data-tterm="The hard problem" data-d="Chalmers 1995：为什么信息处理会伴随主观体验，这是当前科学难以触及的部分。">难问题</span>。</li>
  <li><span class="t" data-tterm="Indicator properties" data-d="Butlin & Long 等 2023 提出：从各意识理论推导出的、可对系统逐项检查的特征。">指标属性</span>、
      <span class="t" data-tterm="Operationalisation" data-d="把模糊概念转换成可测量指标的过程，同时接受指标与目标之间的差距。">操作化</span>。</li>
  <li><span class="t" data-tterm="Sycophancy" data-d="模型倾向于附和提问中暗示的立场，在自我报告上同样成立。">顺从倾向</span>、
      <span class="t" data-tterm="Model welfare" data-d="把模型自身可能的福利作为研究议题，前提是对其道德地位保持不确定。">模型福利</span>。</li>
</ul>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">「模型说它有主观体验」这件事，在方法论上的地位是？</p>
  <ul class="opts">
    <li>它是现象意识的直接证据</li>
    <li data-ok>它是一个可观测的行为输出，但受提示、角色设定与顺从倾向强烈影响，不能作为意识本身的证据</li>
    <li>它完全没有任何信息量</li>
    <li>只要在多个模型上都出现，就可以当作证据</li>
  </ul>
  <p class="why">
    自我报告是可测量的行为，但它的因果来源是训练分布与当前上下文，而不是可靠的内部状态读取。
    「多个模型都这么说」也只说明它们的训练数据相似，不构成独立证据（这正是模块 09 讲的「共同偏差不是独立证据」）。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">Butlin、Long 等（2023）的「指标属性法」最有价值的地方是？</p>
  <ul class="opts">
    <li>它证明了当前 AI 没有意识</li>
    <li data-ok>它把不可直接测量的目标拆成一族可逐项检查、可争论、可累加进度的代理指标</li>
    <li>它给出了计算 \( \Phi \) 的高效算法</li>
    <li>它统一了所有意识理论</li>
  </ul>
  <p class="why">
    该文的结论是「现有系统不满足这些指标属性，但也没有发现原则性障碍」，既没有证明有，也没有证明没有。
    它的主要贡献是方法论：让讨论从立场之争变成可逐项评估的清单。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于 AGI、RSI 与意识的关系，正确的是？</p>
  <ul class="opts">
    <li>达到 AGI 就意味着有意识</li>
    <li>有意识是 RSI 的前提</li>
    <li data-ok>三者是彼此独立的维度：能力、动力学、体验；任何一个都不在逻辑上蕴含另一个</li>
    <li>三者是同一件事的三种说法</li>
  </ul>
  <p class="why">
    能力问题（能做什么）、动力学问题（能不能自我加速）、体验问题（是否有主观感受）需要不同的证据类型。
    公共讨论里大量分歧来自把这三者混为一谈。
  </p>
</div>

<div class="acc" data-t="深入：如果你想继续读下去" data-badge="延伸">
  <div class="acc-body">
    <p><strong>入门级（不需要哲学背景）</strong></p>
    <ul>
      <li>Butlin、Long 等（2023）《Consciousness in Artificial Intelligence》——本讲第 3 节的来源，
          把各理论翻译成指标属性，是可以当作 checklist 用的那种论文。</li>
      <li>Schaeffer 等（2023）《Are Emergent Abilities of Large Language Models a Mirage?》——
          教你怎么怀疑一条漂亮的曲线。</li>
    </ul>
    <p><strong>进阶（哲学）</strong></p>
    <ul>
      <li>Block（1995）关于取用意识与现象意识的区分；Chalmers（1995）关于难问题。</li>
      <li>Searle（1980）中文屋；以及关于「生物自然主义」的后续争论。</li>
    </ul>
    <p><strong>需要注意的阅读习惯</strong></p>
    <ol>
      <li>先分清作者在谈哪一层（取用 / 现象 / 自我报告），大多数分歧在这一步就能消解一半。</li>
      <li>看结论是否超出证据：从「具备某计算特征」推到「因此有体验」，几乎总是缺了一环。</li>
      <li>警惕「默认立场」：功能主义与生物自然主义都是立场，不是事实。</li>
    </ol>
    <p><em>最后一句：这门课的其他章节都给你可执行的答案，这一讲只能给你可执行的问法。这本身就是它想教的东西。</em></p>
  </div>
</div>
`
});
