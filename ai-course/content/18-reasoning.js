/* content/18-reasoning.js — 模块 18：推理模型与测试时计算 */
COURSE.register({
  id: "m18",
  part: 6,
  num: "18",
  title: "推理模型与测试时计算：让模型「想久一点」值不值",
  en: "Reasoning Models & Test-Time Compute",
  minutes: 35,
  tags: ["高阶", "推理", "实用"],
  body: String.raw`
<p class="lead">
  同一道题、同一个模型，只是允许它「多想一会儿」，正确率就能从 30% 涨到 90% 以上。
  这不是玄学：它把<strong>一次前向传播</strong>变成了<strong>一次带筛选的搜索</strong>。
  这一模块讲清楚三件事——想更久为什么有用、什么时候会饱和、以及你为它付出的 token 与显存代价。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：普通解码像<em>拿到卷子直接交</em>；推理模型像<em>允许打草稿、检查、重算</em>。
    但草稿纸写满不等于分数高——方向错了，写得越多越糟。<br />
    <strong>这一讲要建立的直觉</strong>：测试时算力不能让模型「变聪明」，它只能在模型<em>已有的输出分布</em>里做搜索，
    再用一个裁判挑出最好的那条。所以收益只取决于两个量：单次成功率 \(p\)，以及裁判的可靠程度。<br />
    <strong>读完你能回答</strong>：什么时候该加采样次数、什么时候该换更大的模型？PRM 与 ORM 差在哪？
    为什么长链式思考的显存开销常常比它的 token 账单更早成为瓶颈？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你的音频问答任务上，7B 模型单次答对率约 30%（你自己采样 8 次测出来的）。
    两条路摆在面前：<strong>A</strong> 保持这个模型，改成每问采样 8 条再挑一条，账单 ×8；
    <strong>B</strong> 换成更大的模型，单次答对率 55%，账单 ×10。
    在写下答案之前先问：<em>你用什么挑？</em>——如果你没有可靠的裁判，A 路线买到的只是「8 条候选里有 1 条对」，
    而不是「用户看到对的答案」。
  </p>
</section>

<h3>1. 想更久为什么有用：把解码看成搜索</h3>
<p>
  自回归解码每一步都是在一个固定深度的网络里做一次前向传播。这意味着：<strong>模型的「串行计算步数」与它生成的 token 数成正比</strong>。
  想让模型解决一个需要 20 步代数变形的问题，而它只被允许输出 5 个 token，那么在计算意义上它根本没有足够的步数——
  这是
  <span class="t" data-tterm="test-time compute" data-d="推理阶段（而非训练阶段）投入的额外算力，包括多采样、更长推理链、搜索与验证。">测试时计算</span>
  能起作用的第一个原因：<em>它把「算得更多」变成可能</em>。
</p>
<p>长链式思考带来的是三种互相独立的好处，工程上必须分开算账：</p>
<ol>
  <li><strong>更多串行步数</strong>：每多一个 token 就多一次非线性变换，能表达更深的条件计算。</li>
  <li><strong>外部工作内存</strong>：中间结果被写进上下文，后面的步骤可以直接读到，而不必全部压在隐状态里。
      这与<a href="#m3">模块 03</a>的注意力机制是同一件事——注意力让你能在上下文里「查表」。</li>
  <li><strong>多路径探索与回退</strong>：只有当你采样多条轨迹、或在中间步骤分叉时才会出现。它不属于「长 CoT」本身，而属于<em>搜索</em>。</li>
</ol>
<p>
  一个常被混淆的点：<strong>「分布锐化」与「搜索」是两种不同的收益</strong>。
  经过长 CoT 数据 SFT 或 RLVR 训练的模型，第一步就更容易走对（分布变了，这是训练带来的）；
  而多采样 n 次再筛选，是在<em>不变的分布</em>上做搜索（这是推理时付出的）。
  把两者混为一谈，你会得出错误的结论——比如「我的模型已经很会推理了，所以多采样没用」。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>pass@n：覆盖率的数学</h4>
  <p>设单次独立采样的正确率为 \(p\)，采样 \(n\) 次，则「至少有一条正确」的概率（覆盖率）是</p>
  \[ \text{pass@}n = 1 - (1-p)^n \]
  <p>手算 \(p = 0.3\)、\(n = 8\)：</p>
  \[ 1 - 0.7^{8} = 1 - 0.0576 = 0.942 \]
  <p>
    也就是 <strong>94.2%</strong>。继续加到 \(n = 32\)：\(0.7^{32} \approx 1.1\times 10^{-5}\)，覆盖率 99.999%。
    注意这里的「独立」是关键假设：如果 8 条采样共享同一个错误方向，实际覆盖率会远低于公式值。
  </p>
  <p>
    真实场景里你只有「采样 \(n\) 次、其中 \(c\) 次正确」这一组观测，需要用无偏估计量（Chen et al., 2021）：
  </p>
  \[ \widehat{\text{pass@}k} = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}} \]
  <p>
    当 \(k=1\) 时它就退化成 \(\frac{c}{n}\)（直接数比例）；当 \(k\) 接近 \(n\) 时它明显更稳。
    这也是为什么评估报告里必须写清「采样几次、取哪一次的答案」——同一组 \(n=8\) 的采样，
    报 pass@1 和报 pass@8 可以差出 60 个百分点。
  </p>
  <p><strong>更重要的结构是边际递减的形状。</strong>残余失败率是指数衰减的</p>
  \[ \varepsilon(n) = (1-p)^n \]
  <p>所以「把残余失败率再减半」需要的<em>额外</em>样本数是一个常数：</p>
  \[ \Delta n = \frac{\ln 2}{-\ln(1-p)} \]
  <p>
    代入 \(p = 0.3\)：\(\Delta n \approx 0.693 / 0.357 \approx 1.94\)，即每多约 <strong>2 次</strong>采样，残余错误率就减半。
    这个结论有两面性：在对数坐标下采样法几乎是无敌的；但在<em>线性</em>坐标下，
    从 94% 到 97% 你要付出的样本数，和从 30% 到 60% 一样多——而前者在用户感知上几乎看不出来。
  </p>
</section>

<h3>2. 三种测试时策略：长 CoT、采样投票、搜索</h3>
<p>
  它们不是互斥的，而是三个「在哪一层花钱」的选项：在<em>单条轨迹内部</em>花钱（长 CoT）、
  在<em>轨迹之间</em>花钱（采样与投票）、在<em>中间步骤之间</em>花钱（搜索）。
</p>
<table class="tbl small">
  <thead><tr><th>策略</th><th>机制</th><th>需要什么</th><th>成本量级</th><th>典型失败模式</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>长链式思考</strong><br />long CoT</td>
      <td>单条轨迹内生成大量中间步骤；训练时用可验证奖励强化「想对了才收尾」</td>
      <td>用长 CoT 数据训练过的模型；长度/预算控制</td>
      <td>输出 token ×10–100</td>
      <td>过思考：简单题也写几千 token，收益为零甚至变负</td>
    </tr>
    <tr>
      <td><strong>采样投票</strong><br />self-consistency</td>
      <td>独立采样 \(n\) 条轨迹，对最终答案做多数投票</td>
      <td>答案能归一化成有限集合（数值、选项、短字符串）</td>
      <td>\(n\times\) 输出 token</td>
      <td>错误答案彼此一致时，投票会把错误<em>放大</em>；开放答案无法投票</td>
    </tr>
    <tr>
      <td><strong>best-of-n</strong></td>
      <td>采样 \(n\) 条，用奖励模型或验证器打分，取最高分</td>
      <td>一个比生成器更可靠的打分器</td>
      <td>\(n\times\) 输出 + 验证开销</td>
      <td>验证器被刷分（长度偏置、格式刷分）；打分器与任务是同一批数据训的</td>
    </tr>
    <tr>
      <td><strong>搜索</strong><br />beam / tree / MCTS</td>
      <td>在中间步骤展开分支，用过程分数剪枝、回退、重新展开</td>
      <td>过程奖励模型；有时还需要状态价值估计</td>
      <td>分支数 × 深度，通常最贵</td>
      <td>过程分数噪声大 → 剪掉正确分支；状态空间一大就退化</td>
    </tr>
  </tbody>
</table>
<p>
  两个可核实的锚点：Tree of Thoughts（Yao et al., 2023）在 Game of 24 上把 GPT-4 的成功率从
  CoT 的 <strong>4%</strong> 提到 <strong>74%</strong>——这是「在中间步骤搜索」能带来多大差别的最干净证据；
  而 RAP（Hao et al., 2023）把 LLM 同时当作世界模型与推理智能体，用蒙特卡洛树搜索在推理空间里规划，
  报告在规划任务上 LLaMA-33B 相对 GPT-4 的 CoT 有 33% 的相对提升。
  两者都说明：<strong>搜索的收益来自「中间步骤可被评估」，而不是来自「输出更长」。</strong>
  而最便宜的那一档——采样投票——也不是没有依据：self-consistency（Wang et al., 2022）在
  GSM8K 上相对贪心 CoT 提升 <strong>17.9%</strong>，SVAMP <strong>11.0%</strong>，AQuA <strong>12.2%</strong>，
  StrategyQA <strong>6.4%</strong>，ARC-challenge <strong>3.9%</strong>。注意这些提升全部来自「换一种解码与聚合方式」，
  没有改动任何权重——这正是测试时计算值得单独拿出来研究的原因。
</p>
<p>
  工程上的选择顺序通常是：先确认答案可归一化 → 上采样投票（最便宜、最容易上线）；
  若已有可靠验证器 → 上 best-of-n；只有当「中间步骤能被稳定打分」并且问题确实需要前瞻时，才值得上树搜索。
</p>

<h3>3. 过程奖励与结果奖励：谁来当裁判</h3>
<p>
  搜索和筛选都需要一个裁判。裁判有两种粒度：
  <span class="t" data-tterm="outcome reward model (ORM)" data-d="只看最终答案对错来打分的奖励模型，信号稀疏但标注便宜。">结果奖励（ORM）</span>
  只看最终答案，
  <span class="t" data-tterm="process reward model (PRM)" data-d="对推理链的每一步给出正确性分数，信号密集但标注昂贵。">过程奖励（PRM）</span>
  看成败。
</p>
<table class="tbl small">
  <thead><tr><th>维度</th><th>ORM（结果奖励）</th><th>PRM（过程奖励）</th></tr></thead>
  <tbody>
    <tr><td>监督信号</td><td>整条轨迹一个分数</td><td>每一步一个分数</td></tr>
    <tr><td>标注成本</td><td>低（答案可自动比对）</td><td>高（人工逐步标注，或用一个更贵的模型来判）</td></tr>
    <tr><td>可利用性</td><td>只能用于重排整条轨迹</td><td>可用于剪枝、回退、定位第一个错误步</td></tr>
    <tr><td>主要风险</td><td>无法区分「答案对但过程错」与「真的会做」</td><td>步骤级标注噪声；容易被 best-of-n 协议刷高</td></tr>
    <tr><td>代表工作</td><td>RLHF / RLVR 的规则奖励</td><td>Lightman et al., 2023（PRM800K 数据集）</td></tr>
  </tbody>
</table>
<p>
  Lightman 等人的对照实验给出了这个领域最常被引用的一条结论：
  <strong>在 MATH 上，过程监督训练出的模型显著优于结果监督</strong>，其过程监督模型解决了代表性测试子集中
  <strong>78%</strong> 的题目；他们同时公开了 PRM800K——约 <strong>80 万条</strong>步骤级人工反馈标签。
  注意这条结论的代价：80 万条步骤级标注不是一个课程项目能承担的规模。
</p>
<p>
  而 PRM 这条路并不平坦。Zhang et al.（2025）系统性地指出：<strong>用蒙特卡洛估计自动合成 PRM 训练数据，
  通常不如 LLM-as-a-judge 与人工标注</strong>，因为「当前步正确」被近似成了「从这一步出发能补全出正确答案」，
  于是步骤验证本身不准；他们还发现，常规 best-of-n 的 PRM 评估存在偏差——生成器可能给出<em>答案对但过程错</em>的回答，
  而 PRM 对这类回答的宽容会<strong>抬高</strong> best-of-n 分数，使得榜单上的提升并不等于过程验证能力的提升。
</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>验证器决定天花板</h4>
  <p>
    设裁判在「候选里至少有一条正确」的条件下挑中正确那条的概率为 \(q\)（裁判精度），
    并用最简单的模型近似「挑错就等于答错」，那么最终交付准确率是
  </p>
  \[ P_{\text{final}} \approx q \cdot \big(1 - (1-p)^n\big) \]
  <p>手算 \(p = 0.3\)、\(n = 8\)、\(q = 0.8\)：</p>
  \[ P_{\text{final}} \approx 0.8 \times 0.942 = 0.754 \]
  <p>
    关键在 \(n \to \infty\) 的极限：覆盖率趋近 1，而 \(P_{\text{final}}\) 只趋近 \(q\)。
    <strong>再多算力也突破不了裁判的精度</strong>。这条式子应该贴在每一个「多采样就能提升」的方案书首页：
    如果 \(q = 0.75\)，那么加预算的上限就是 75%，此时把资源投在做更好的验证器上，回报远大于再多采样。
  </p>
  <p>
    这也是
    <span class="t" data-tterm="RLVR" data-d="可验证奖励强化学习：用规则或程序（单测、答案比对、格式校验）给出奖励，而不是人类偏好。">RLVR</span>
    的核心逻辑：当答案能被程序验证时，验证器是免费且近乎完美的（\(q \to 1\)），
    于是可以放心把算力砸在采样上。DeepSeek-R1 的技术报告（DeepSeek-AI, 2025；后发表于 Nature 645 卷）正是沿这条路线，
    用纯强化学习（不含人工标注的推理轨迹）让模型自发出现自我反思、验证与策略调整。
    训练侧的细节——组内标准化优势、KL 惩罚、奖励黑客——见 <a href="#m7">模块 07</a> 的 GRPO 一节。
  </p>
</section>

<h3>4. 测试时算力的缩放：什么时候有用，什么时候饱和</h3>
<p>
  这个方向有两篇最值得读的实证工作，结论互补：
</p>
<ul>
  <li>
    <strong>Snell et al.（2024）</strong>比较了两类机制：对稠密过程奖励验证器做搜索，以及按题目难度自适应地更新输出分布。
    他们最重要的发现是<strong>有效性强烈依赖题目难度</strong>——同一种策略在简单题和难题上的收益完全不同。
    因此他们提出按题分配算力的「compute-optimal」策略，相对朴素 best-of-n 基线把测试时算力的效率提升了
    <strong>4 倍以上</strong>；在 FLOPs 匹配的比较里，<em>当较小的基座模型已经有非平凡成功率时</em>，
    测试时算力可以让它<strong>超过大 14 倍的模型</strong>。
  </li>
  <li>
    <strong>Brown et al.（2024，即「Large Language Monkeys」）</strong>把「反复采样」这一件事单独放到四个数量级的样本预算上考察：
    覆盖率随样本数增长，而且这个关系<strong>常常接近对数线性</strong>，可以用幂律形式拟合——即存在推理时的缩放律。
    在可自动验证的领域（代码、形式证明），覆盖率的提升可以直接兑现：SWE-bench Lite 上，同一个模型
    从 1 个样本的 <strong>15.9%</strong> 提升到 250 个样本的 <strong>56%</strong>，超过了当时单样本 43% 的最好成绩。
    但在<em>没有自动验证器</em>的领域，常用的挑选方式（多数投票、奖励模型）在几百个样本之后就<strong>停止增长</strong>。
  </li>
</ul>
<p>
  这两条合起来就是本节的全部要点：<strong>覆盖率会持续上涨，但「从候选里挑对」的能力会饱和</strong>。
  你真正交付的是后者。
</p>
<h4>4.1 饱和的三个来源</h4>
<table class="tbl small">
  <thead><tr><th>来源</th><th>数学表现</th><th>症状</th><th>对策</th></tr></thead>
  <tbody>
    <tr><td>分布里根本没有正确解</td><td>\(p \to 0\)，覆盖率上不去</td><td>采样 64 次仍全错</td><td>换更强的模型、加检索、或把问题拆小</td></tr>
    <tr><td>裁判精度封顶</td><td>\(P_{\text{final}} \to q\)</td><td>覆盖率涨、人工抽查不涨</td><td>改做验证器：规则校验、单元测试、交叉验证</td></tr>
    <tr><td>单条轨迹内部收益递减</td><td>错误率不随长度下降</td><td>输出越来越长、正确率没变</td><td>预算控制：简单题早停，难题才延长</td></tr>
  </tbody>
</table>
<p>
  第三条有一个专门的实证工作：Chen et al.（2024）研究了 o1 类模型的
  <span class="t" data-tterm="overthinking" data-d="在简单问题上浪费大量推理算力却几乎不提升正确率的现象。">过思考</span>（overthinking），
  发现大量算力被分配给「几乎不需要推理」的题目，收益极小，并提出了在不损失正确率的前提下压缩推理过程的训练方法。
  他们还提出了从结果与过程两个视角衡量算力使用效率的指标——这正是你评估自己的推理方案时该抄的作业：
  <strong>不要只报正确率，要同时报每条正确回答花了多少 token</strong>。
</p>
<p>一个可操作的判据表（用你自己的 100 道题测出来，而不是凭感觉）：</p>
<table class="tbl small">
  <thead><tr><th>观测</th><th>判断</th><th>该做什么</th></tr></thead>
  <tbody>
    <tr><td>\(p \ge 0.3\)，且有精确验证器</td><td>采样法非常划算</td><td>直接加大 \(n\)，把预算花在采样上</td></tr>
    <tr><td>\(p \ge 0.3\)，只有 LLM-as-judge</td><td>收益取决于裁判</td><td>先用小规模实验测 \(q\)，再决定是否加 \(n\)</td></tr>
    <tr><td>\(0.05 \le p < 0.3\)</td><td>需要真裁判才能兑现</td><td>投票往往不够；上 PRM/规则验证器，或降级为「给出多个候选 + 人工确认」</td></tr>
    <tr><td>\(p < 0.05\)</td><td>搜索空间里基本没有正确解</td><td>换更大模型、加检索、或改任务分解（见 <a href="#m9">模块 09</a> 的模型阶梯思路）</td></tr>
  </tbody>
</table>

<h3>5. 工程代价：token、KV cache、延迟</h3>
<p>
  推理时算力不是免费的。它同时消耗三样东西，而这三样的瓶颈顺序常常被搞反。
</p>
<table class="tbl small">
  <thead><tr><th>代价</th><th>随什么增长</th><th>谁会先撑不住</th></tr></thead>
  <tbody>
    <tr><td>输出 token 账单</td><td>\(n \times L_{\text{CoT}}\)</td><td>财务；但对单次请求而言最不致命</td></tr>
    <tr><td>KV cache 显存</td><td>并发序列数 × 序列长度</td><td>显存，最先爆；直接决定你的并发度</td></tr>
    <tr><td>延迟（TTFT 之外的时间）</td><td>串行解码 token 数 / 吞吐</td><td>用户体验；长 CoT 让「首字很快、答案很慢」成为常态</td></tr>
    <tr><td>prefill 计算</td><td>prompt 长度（与 \(n\) 无关，可被前缀缓存摊薄）</td><td>通常不是瓶颈，见 <a href="#m8">模块 08</a></td></tr>
  </tbody>
</table>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>KV cache 手算：8k 推理链 = 1 GiB</h4>
  <p>每 token 的 KV cache 字节数（fp16，每元素 2 字节）：</p>
  \[ \text{KV per token} = 2 \times L \times H_{kv} \times d_{head} \times b \]
  <p>
    取一个 8B 级 GQA 模型（\(L = 32\) 层、\(H_{kv} = 8\) 个 KV 头、\(d_{head} = 128\)、\(b = 2\) 字节）：
  </p>
  \[ 2 \times 32 \times 8 \times 128 \times 2 = 131072\ \text{bytes} = 128\ \text{KiB} \]
  <p>一条 8192 token 的推理链：</p>
  \[ 128\ \text{KiB} \times 8192 = 1\ \text{GiB} \]
  <p>
    <strong>一条链就吃掉 1 GiB。</strong>如果你为了 pass@8 并行跑 8 条，仅 KV cache 就是 8 GiB，
    还没算权重、激活与中间缓冲区。这解释了两件事：
    (1) 为什么 GQA / MQA 这类「减少 KV 头数」的结构对推理模型是刚需——
    把 \(H_{kv}\) 从 8 降到 4，上面每一个数字都直接减半；
    (2) 为什么分页 KV 缓存（paged attention）与连续批处理是推理引擎的标配——
    不解决 KV 的碎片与复用，长 CoT 的并发度就上不去。
  </p>
  <p>
    <strong>注意前缀缓存帮不了你。</strong>多采样共享同一段 prompt，prefill 可以复用（省下输入侧计算），
    但每条采样轨迹生成的 token 都是<em>新的</em>，它们的 KV 必须各自增长。所以「多想一会儿」的成本曲线，
    在显存上比在账单上陡得多。
  </p>
</section>
<p>
  延迟上的直觉算术：8k token 的推理链，在单条 60 token/s 的解码速度下是约 133 秒；
  8 条并行会摊薄吞吐，端到端很可能到几分钟。这就是「想更久」在产品上的真实形态——
  它不是一个开关，而是一次<strong>延迟换正确率的交易</strong>，必须让用户看得见（进度、思考摘要、可中断）。
</p>

<h3>6. 便宜模型多想 vs 贵模型想一次</h3>
<div class="flow">
  <div class="nd hi">先测单次成功率 p</div>
  <div class="ar">→</div>
  <div class="nd">有精确验证器？</div>
  <div class="ar">→</div>
  <div class="nd">有：加大 n，采样最划算</div>
</div>
<div class="flow">
  <div class="nd">没有验证器</div>
  <div class="ar">→</div>
  <div class="nd">测裁判精度 q</div>
  <div class="ar">→</div>
  <div class="nd">q 高：best-of-n；q 低：换更大模型</div>
</div>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>什么时候「小模型 + 多采样」赢</h4>
  <p>用最简单的一行比较就能决策。小模型多采样的期望准确率（有理想验证器时）是</p>
  \[ P_A = 1 - (1-p_{\text{small}})^n \]
  <p>大模型单次的准确率是 \(p_{\text{large}}\)。只要</p>
  \[ 1 - (1-p_{\text{small}})^n > p_{\text{large}} \]
  <p>
    小模型路线就更准。但别忘了把成本放进不等式：如果大模型的单价是小模型的 10 倍，
    那么在<strong>同等预算</strong>下你能给小模型 10 次采样。
    代入手算：\(p_{\text{small}} = 0.3\)、\(n = 10\) 时 \(P_A \approx 0.972\)，
    要打赢它，大模型需要 \(p_{\text{large}} > 0.97\)。
  </p>
  <p>
    这直接解释了 Snell et al. 的「FLOPs 匹配」结论为什么让人震惊：
    只要小模型的单次成功率不是接近 0，采样带来的复利就非常可怕。
    但它有三个前提，缺一个结论就不成立：<strong>(1) 有验证器</strong>（否则 \(P_A\) 要乘 \(q\)）；
    <strong>(2) \(p_{\text{small}}\) 不能太小</strong>（\(p = 0.02\) 时 \(n = 10\) 也只有 18%）；
    <strong>(3) 显存允许并发</strong>（回到上一节：8 条 8k 链就是 8 GiB）。
  </p>
</section>
<p>
  最后是训练-推理匹配问题。s1 这项工作（Muennighoff et al., 2025）给了一个很干净的对照：
  他们用 1000 道题（s1K）做 SFT 得到一个会写长 CoT 的模型，然后加上
  <span class="t" data-tterm="budget forcing" data-d="通过强行截断或反复追加「Wait」来控制模型思考长度的推理时技巧。">budget forcing</span>
  来拉长或截断思考过程。结果是在竞赛数学（MATH、AIME24）上最高超过 o1-preview 27%，
  并且仅靠测试时的长度干预就把 AIME24 从 50% 外推到 57%。
  反过来的教训同样重要：<strong>对一个没有用长 CoT 数据训练过的模型，在提示词里写「再仔细想想」通常只增加 token，不增加正确率</strong>。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：30 秒的模拟 + 一个真模型评估协议</h4>
  <p><strong>实验 A（纯 CPU，秒级）：</strong>验证覆盖率、无偏估计量与「错误一致性如何毁掉投票」。</p>
<pre><code>from math import lgamma, exp
import numpy as np
rng = np.random.default_rng(0)

def pass_at_k_estimate(n, c, k):
    <span class="cm"># 1 - C(n-c,k)/C(n,k)，用 lgamma 防止组合数溢出</span>
    if n - c &lt; k:
        return 1.0
    log_num = lgamma(n - c + 1) - lgamma(k + 1) - lgamma(n - c - k + 1)
    log_den = lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)
    return 1.0 - exp(log_num - log_den)

p = 0.3
for n in (1, 2, 4, 8, 16, 32):
    print("n =", n, "  pass@n =", round(1 - (1 - p) ** n, 4))

print("k=1 时估计量退化为 c/n:", round(pass_at_k_estimate(8, 3, 1), 4))
print("k=4 时:", round(pass_at_k_estimate(8, 3, 4), 4))

<span class="cm"># 实验 B：误差相关性 s = 错误样本中集中到同一个错误答案的比例</span>
def vote_vs_coverage(p, s, n, trials=20000):
    cover = vote = 0
    for _ in range(trials):
        u = rng.random(n)
        labels = np.where(u &lt; p, 0,
                          np.where(rng.random(n) &lt; s, 1,
                                   rng.integers(2, 7, size=n)))
        cnt = np.bincount(labels, minlength=7)
        cover += int(cnt[0] &gt; 0)
        top = np.flatnonzero(cnt == cnt.max())
        vote += int(rng.choice(top) == 0)      <span class="cm"># 平票时随机打破</span>
    return cover / trials, vote / trials

for s in (0.0, 0.3, 0.5, 0.7):
    c, v = vote_vs_coverage(0.3, s, 8)
    print("s =", s, " 覆盖率 =", round(c, 3), " 投票准确率 =", round(v, 3))</code></pre>
  <p>
    <strong>要观察的东西</strong>：覆盖率稳定在 0.94 附近，而投票准确率随 \(s\) 上升而崩塌——
    这就是「覆盖率不等于交付质量」的最小可复现证据。
  </p>
  <p><strong>实验 C（免费 Colab，几分钟）：用真模型测你自己的 \(p\) 与 \(q\)。</strong>协议如下。</p>
<pre><code>!pip -q install "transformers" "datasets"

from transformers import pipeline
gen = pipeline("text-generation", model="Qwen/Qwen2.5-1.5B-Instruct",
               device_map="auto")   <span class="cm"># CPU 也能跑，只是慢；先在 20 道题上做</span>

<span class="cm"># 1) 20 道你手上有标准答案的题，每题采样 8 次（temperature 0.8）</span>
<span class="cm"># 2) 用字符串/数值归一化比对，得到单题 c 与 p_hat = c/8</span>
<span class="cm"># 3) 报告三组数字：pass@1 = mean(c/8)、pass@8 = mean(c &gt; 0)、</span>
<span class="cm">#    以及「用多数投票选出的答案是否对」的准确率</span>
<span class="cm"># 4) 若你有 PRM 或规则验证器，再加一行「best-of-8 + 验证器」的准确率</span>
<span class="cm"># 判据：多数投票 &lt;&lt; pass@8 说明误差高度相关或答案空间开放；</span>
<span class="cm">#       best-of-n 远低于 pass@8 说明裁判（q）是瓶颈，而不是生成器。</span>
<span class="cm"># 5) 最后按模块 09 的做法，用配对检验回答「提升是否超过噪声」</span></code></pre>
  <p>
    规模控制：20 题 × 8 次采样在 1.5B 模型上是百次级别的短生成，免费 Colab 的 CPU 也能跑完；
    换成 0.5B 模型则更快，但 \(p\) 会更低，正好可以用来观察 \(p < 0.1\) 时采样法的失效。
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>四个会让你得出错误结论的误区</h4>
  <ol>
    <li>
      <strong>把「输出更长」当成「推理更强」。</strong>长度与正确率的相关性在控制题目难度后会大幅减弱甚至消失，
      而 overthinking 的研究显示大量算力被花在不需要推理的题上。正确的报告方式是同时给出「正确率」与「每条正确回答的 token 数」。
    </li>
    <li>
      <strong>拿覆盖率当交付指标。</strong>pass@8 = 94% 说的是「8 条里有 1 条对」。
      没有可靠裁判时，用户看到的是投票或打分选出来的那条，它等于 \(q \cdot \text{pass@}n\)。
      报指标时必须写清楚「取哪一条」。
    </li>
    <li>
      <strong>用错误的答案格式去做验证器。</strong>验证器只能验证它能解析的东西：最终答案的标记方式、
      单位、有效数字、是否带货币符号。训练时改一次输出格式（或在推理链里也写了「答案：」字样），
      规则验证器就可能静默失效——它不会报错，只会把分数给错对象。
    </li>
    <li>
      <strong>把 PRM 的 best-of-n 分数当成能力提升。</strong>Zhang et al.（2025）证明这条路线的评估本身有偏差：
      生成器给出「答案对、过程错」的回答会被 PRM 宽容，从而抬高 BoN 分数。
      要么用步骤级指标单独评估 PRM，要么承认你测的是「这套组合在这个测试集上的表现」。
    </li>
  </ol>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◆</span>怎么用在真实项目里</h4>
  <ol>
    <li>
      <strong>先量化 \(p\)，再谈方案。</strong>在 100 道你自己的题上每题采样 8 次，画出覆盖率曲线。
      这一步成本极低，却能直接告诉你「加采样有用」还是「该换模型」。
    </li>
    <li>
      <strong>按可验证性分层设计。</strong>答案能被程序检验（数值、格式、单元测试）→ 大胆上大 \(n\)；
      只能靠人看 → 产品形态应该是「给 2–3 个候选 + 置信提示」，而不是装作只有一个正确答案。
    </li>
    <li>
      <strong>把「想多久」做成可调超参。</strong>给每类问题设 token 预算上限，简单问题早停。
      s1 的 budget forcing 说明长度是可以被显式控制的，控制它比放任它更省。
    </li>
    <li>
      <strong>显存预算先于账单预算。</strong>上线前先算：并发 × 单条 CoT 长度 × 每 token KV 字节数。
      用 GQA、分页 KV、限制最大生成长度来把它压进你的卡里。
    </li>
    <li>
      <strong>多采样时共享前缀。</strong>同一 prompt 的 \(n\) 条采样可以复用 prefill（<a href="#m8">模块 08</a> 的前缀缓存），
      但解码阶段各自计费、各自占 KV——预算表里要把这两部分分开写。
    </li>
  </ol>
</section>

<p>
  <strong>术语速查：</strong>
  <span class="t" data-tterm="long chain-of-thought" data-d="模型在给出最终答案前生成的很长的中间推理序列，通常经 SFT 或 RL 训练得到。">长链式思考</span>、
  <span class="t" data-tterm="self-consistency" data-d="采样多条推理链并对最终答案多数投票的解码策略。">自洽性投票</span>、
  <span class="t" data-tterm="best-of-n" data-d="采样 n 条候选后用奖励模型或验证器挑选最高分的一条。">best-of-n</span>、
  <span class="t" data-tterm="verifier" data-d="判断某个答案或某个推理步骤是否正确的模型或程序。">验证器</span>、
  <span class="t" data-tterm="process reward model" data-d="对推理链每一步打分的奖励模型，用于搜索与剪枝。">过程奖励模型</span>、
  <span class="t" data-tterm="RLVR" data-d="用可自动验证的奖励（答案比对、单元测试）做强化学习，替代人类偏好标注。">可验证奖励强化学习</span>。
</p>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">某模型单题单次正确率 \(p = 0.25\)。采样 16 次，覆盖率 pass@16 约为多少？</p>
  <ul class="opts">
    <li>25%</li>
    <li>64%</li>
    <li data-ok>约 99%</li>
    <li>100%</li>
  </ul>
  <p class="why">
    \(1 - 0.75^{16} = 1 - 0.0100 \approx 0.99\)。注意这只说明 16 条候选里几乎一定有正确答案，
    并不说明你<em>能挑出</em>它——没有裁判时交付准确率还要乘上裁判精度 \(q\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">你已经采样 8 次，覆盖率 94%，但上线后的实际准确率只有 62%。最可能的原因是？</p>
  <ul class="opts">
    <li>采样次数还不够，应加到 64 次</li>
    <li data-ok>挑选环节不可靠：错误答案彼此一致使投票失效，或验证器精度 \(q\) 成了天花板</li>
    <li>模型参数太少</li>
    <li>温度设得太低</li>
  </ul>
  <p class="why">
    覆盖率已经 94%，再加采样只能把上限从 99.9% 往上推，却无法越过 \(P_{\text{final}} \approx q\cdot\text{pass@}n\)。
    正确动作是分别测量投票准确率与验证器精度，找出瓶颈在生成端还是挑选端。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于 PRM（过程奖励）与 ORM（结果奖励），下列哪个说法与已有实证一致？</p>
  <ul class="opts">
    <li>ORM 的信号更密集，所以在 MATH 上总是更好</li>
    <li>PRM 不需要额外标注，因为它可以用最终答案自动推导</li>
    <li data-ok>过程监督在 MATH 上显著优于结果监督，但 PRM 需要昂贵的步骤级标注，且其 best-of-n 评估容易被偏差抬高分数</li>
    <li>PRM 只能用于训练，不能用于推理时的搜索</li>
  </ul>
  <p class="why">
    Lightman et al.（2023）报告过程监督显著优于结果监督，其模型解决了 MATH 代表性测试子集的 78%，代价是约 80 万条步骤级标签；
    Zhang et al.（2025）进一步指出蒙特卡洛估计合成的 PRM 数据通常不如 LLM-as-a-judge 与人工标注，
    且常规 best-of-n 评估会因 PRM 宽容「答案对、过程错」的回答而虚高。
  </p>
</div>

<div class="acc" data-t="深入：为什么搜索有时还不如多采样（以及怎么判断）" data-badge="进阶">
  <div class="acc-body">
    <p>
      理论上搜索应该严格优于采样：它在更大的空间里找解。实践里它经常输，原因有三：
    </p>
    <ol>
      <li>
        <strong>过程分数是噪声信号。</strong>PRM 对每一步的估计误差会沿着树累积；
        一旦在早期剪掉了正确分支，后面的搜索再精确也救不回来。搜索对「第一个错误剪枝」极其敏感。
      </li>
      <li>
        <strong>搜索的分支成本是乘法。</strong>宽度 \(b\)、深度 \(d\) 的树需要约 \(b^d\) 次评估，
        而采样 \(n\) 条只是 \(n\) 次完整生成。要让搜索划算，过程评估必须比完整生成便宜得多且更可靠。
      </li>
      <li>
        <strong>难度决定最优策略。</strong>Snell et al.（2024）的核心观察正是「不同难度下最优策略不同」：
        简单题上多搜是浪费，难题上多采样几乎无用。他们据此提出的 compute-optimal 分配，
        相对朴素 best-of-n 把效率提升了 4 倍以上。
      </li>
    </ol>
    <p>
      <strong>可执行的判断方法</strong>：在同一批题上做三组对照——\(n\) 次采样 + 投票、\(n\) 次采样 + 验证器、搜索（等预算）。
      三组都报告「覆盖率」与「最终准确率」两个数。如果搜索的覆盖率更高但最终准确率更低，
      瓶颈就是过程分数，而不是搜索算法本身——此时应该去改验证器，而不是加深搜索树。
    </p>
    <p>
      顺带一个常被忽略的工程事实：长 CoT 的显存开销与搜索的分支数<em>相乘</em>。
      在单卡场景下，你往往不是被算法限制，而是被 KV cache 限制——这也是为什么「先算显存、再选算法」是更现实的顺序。
    </p>
  </div>
</div>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>本模块引用的来源（均已核对原文摘要）</h4>
  <ul>
    <li><a href="https://arxiv.org/abs/2408.03314" target="_blank" rel="noopener">Snell, Lee, Xu, Kumar (2024) · Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters</a>：compute-optimal 分配效率提升 4 倍以上；FLOPs 匹配下超过大 14 倍的模型。</li>
    <li><a href="https://arxiv.org/abs/2407.21787" target="_blank" rel="noopener">Brown et al. (2024) · Large Language Monkeys: Scaling Inference Compute with Repeated Sampling</a>：覆盖率跨四个数量级近似对数线性；SWE-bench Lite 15.9% → 56%（250 样本）；投票与奖励模型在几百样本后饱和。</li>
    <li><a href="https://arxiv.org/abs/2305.20050" target="_blank" rel="noopener">Lightman et al. (2023) · Let's Verify Step by Step</a>：过程监督显著优于结果监督，MATH 子集 78%；PRM800K 约 80 万条步骤级标签。</li>
    <li><a href="https://arxiv.org/abs/2501.07301" target="_blank" rel="noopener">Zhang et al. (2025) · The Lessons of Developing Process Reward Models in Mathematical Reasoning</a>：蒙特卡洛估计合成 PRM 数据不如 LLM-as-a-judge 与人工标注；best-of-n 的 PRM 评估存在虚高偏差。</li>
    <li><a href="https://arxiv.org/abs/2107.03374" target="_blank" rel="noopener">Chen et al. (2021) · Evaluating Large Language Models Trained on Code</a>：pass@k 的无偏估计量；重复采样把 HumanEval 从 28.8% 提到 70.2%（每题 100 次采样）。</li>
    <li><a href="https://arxiv.org/abs/2203.11171" target="_blank" rel="noopener">Wang et al. (2022) · Self-Consistency Improves Chain of Thought Reasoning in Language Models</a>：GSM8K +17.9%、SVAMP +11.0%、AQuA +12.2%、StrategyQA +6.4%、ARC-challenge +3.9%。</li>
    <li><a href="https://arxiv.org/abs/2305.10601" target="_blank" rel="noopener">Yao et al. (2023) · Tree of Thoughts: Deliberate Problem Solving with Large Language Models</a>：Game of 24 上 GPT-4 从 CoT 的 4% 提升到 74%。</li>
    <li><a href="https://arxiv.org/abs/2305.14992" target="_blank" rel="noopener">Hao et al. (2023) · Reasoning with Language Model is Planning with World Model</a>：把 LLM 同时作为世界模型与智能体，用 MCTS 做推理规划。</li>
    <li><a href="https://arxiv.org/abs/2501.19393" target="_blank" rel="noopener">Muennighoff et al. (2025) · s1: Simple test-time scaling</a>：s1K（1000 题）SFT + budget forcing；竞赛数学上最高超过 o1-preview 27%；AIME24 由 50% 外推到 57%。</li>
    <li><a href="https://arxiv.org/abs/2412.21187" target="_blank" rel="noopener">Chen et al. (2024) · Do NOT Think That Much for 2+3=? On the Overthinking of o1-Like LLMs</a>：简单题上的过度思考与效率指标。</li>
    <li><a href="https://arxiv.org/abs/2501.12948" target="_blank" rel="noopener">DeepSeek-AI (2025) · DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning</a>：纯强化学习激励推理，无需人工标注推理轨迹；见 Nature 645, 633–638 (2025)。</li>
  </ul>
</section>
`
});
