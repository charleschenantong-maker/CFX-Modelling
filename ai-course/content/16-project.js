/* content/16-project.js — 模块 16：把方法映射到数学建模类题目（未来示例） */
COURSE.register({
  id: "m16",
  part: 5,
  num: "16",
  title: "收束：把这一切映射到 Crossfade 这类项目与申请材料（未来示例）",
  en: "Synthesis — Mapping the Course onto Your Project",
  minutes: 40,
  tags: ["项目", "申请", "必做"],
  body: String.raw`
<p class="lead">
  前面各模块构成了<strong>大模型底座与自训的核心能力</strong>；
  而以《Mathematical Crossfade Modelling for Glass Player》（音频交叉淡入淡出连续建模）为例，它是一个独立的工程建模课题。
  <strong>两者的关系是：大模型底座是通用的技术内功，未来可以在合适的时候尝试把表征学习或强化搜索与之 Merge</strong>。
  本讲仅作为一个小参考案例，带你拆解当通用 AI 方法论遇上具体连续优化问题时，如何设计清晰的基线、特征映射与严格的科学评估，绝不作为学习大模型的前置门槛。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>两条轨道：请分开推进</h4>
  <table class="tbl small">
    <thead><tr><th></th><th>轨道甲：研究指南（PDF）</th><th>轨道乙：本课程</th></tr></thead>
    <tbody>
      <tr><td><strong>目标</strong></td><td>产出一个可辩护的数学模型 + 可运行引擎 + 答辩材料</td><td>建立 LLM 与训练的完整能力，能读论文、能跑实验</td></tr>
      <tr><td><strong>推进方式</strong></td><td>按 8 个检查点（CP1–CP8）线性推进，每个检查点有明确产出</td><td>按 24 讲推进，每讲配自测与动手版块</td></tr>
      <tr><td><strong>评价标准</strong></td><td>数学严谨性、实证证据、可复现性</td><td>能否独立跑通、能否识别常见错误</td></tr>
      <tr><td><strong>它不负责</strong></td><td>不负责教你 Transformer、TRL、Colab（那是轨道乙）</td><td>不负责替你做 crossfade 这类题目的数学（那是轨道甲）</td></tr>
    </tbody>
  </table>
  <p><strong>只在这三处交汇</strong>：① CP1 要工具与基线 → 用本课程 10 的实验纪律；
     ② CP5/CP7 要特征与学习实验 → 用 02 的特征视角、07 的模型阶梯、09 的评估协议；
     ③ CP8 要可复现与答辩 → 用 14 的流水线与 16 的 viva 问题清单。</p>
  <p><em>反过来说：不要在写研究报告时试图把 Transformer 原理塞进去，也不要在学课程时试图顺手完成检查点。</em></p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    以《Mathematical Crossfade Modelling for Glass Player》这类研究指南为例（你以后可以找来读），它已经把问题、物理与文献都摆好了。
    现在你有了 LLM 与训练的整套知识，真正要回答的是：
    <strong>哪一部分应该由数学完成，哪一部分才轮到学习？</strong>
    这一模块给出判据与执行方案。
  </p>
</section>

<h3>1. 八个检查点 ↔ 本课程模块</h3>
<table class="tbl">
  <thead><tr><th>检查点</th><th>核心任务</th><th>用到本课程的</th><th>关键纪律</th></tr></thead>
  <tbody>
    <tr><td><strong>CP1</strong> 精确问题 + 早期可听基线</td><td>定义「更好」是什么，并尽早跑起来一个能听的版本</td>
        <td>M1（目标函数思维）、M10（环境与纪律）</td><td>先有基线，再谈优化；没有可听 demo 的数学是空转</td></tr>
    <tr><td><strong>CP2</strong> 可辩护的数学模型</td><td>把增益包络写成变分问题 / 几何轨迹</td>
        <td>M1（假设与可辨识性）、M4（把自由度算清）</td><td>显式写出假设，并给出假设失效时的边界</td></tr>
    <tr><td><strong>CP3</strong> 竞争方法与可检验预测</td><td>至少三种结构不同的方法，各自给出可检验预测</td>
        <td>M7（模型阶梯与消融思想）</td><td>每个方法都要能预测「在什么输入下会失败」</td></tr>
    <tr><td><strong>CP4</strong> 预测 confront 音频</td><td>用 LUFS / 谱通量等客观量与听测对照</td>
        <td>M9（客观 vs 主观、测什么与不能测什么）</td><td>报告不一致之处，而不是只报告支持理论的部分</td></tr>
    <tr><td><strong>CP5</strong> 成对歌曲适配</td><td>从音频提取成对特征（ΔBPM、调性距离、ΔLUFS、谱通量差）</td>
        <td>M2（<strong>特征就是你的 tokenizer</strong>）</td><td>特征定义与归一化方式必须可复现</td></tr>
    <tr><td><strong>CP6</strong> 改进证据与局限</td><td>统计检验 + 听测协议 + 失效模式分类</td>
        <td>M9（分组 CV、效应量、MUSHRA、Wilcoxon）</td><td>盲测、随机顺序、报告置信区间</td></tr>
    <tr><td><strong>CP7</strong> 有明确目的的学习实验</td><td>只学一个低维参数，并与简单模型严格比较</td>
        <td><strong>M7 + M9</strong>（模型阶梯、岭回归闭式解、置换检验、VC 界）</td><td>没有置换检验的学习结论不成立</td></tr>
    <tr><td><strong>CP8</strong> 成品与数学辩护</td><td>可复现仓库 + 报告 + 口头答辩</td>
        <td>M14（worktree、端到端任务链、可复现性）、M9（Vandewalle 三要素）</td><td>一条命令复现全部图表</td></tr>
  </tbody>
</table>

<h3>2. Checkpoint 7 的完整技术方案</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>形式化</h4>
  <p>学习目标：从成对特征预测最优过渡时长</p>
  \[ x = \big[\ \Delta\text{BPM},\ d_{\text{Tonnetz}},\ \Delta\text{LUFS},\ \text{SpectralFluxContrast}\ \big]^\top \in \mathbb{R}^4,
     \qquad T^* \in [2.0,\ 16.0]\ \text{seconds} \]
  <p>模型阶梯（每一级都必须跑，且必须报告相对上一级的增量）：</p>
  <table class="tbl small">
    <thead><tr><th>级别</th><th>模型</th><th>自由度</th><th>预期结论</th></tr></thead>
    <tbody>
      <tr><td>Level 0</td><td>规则：\(\Delta\text{BPM} \le 0.05 \Rightarrow 8\) 秒，否则 3 秒</td><td>0</td><td>基线，任何模型必须打败它</td></tr>
      <tr><td>Level 1</td><td>岭回归 \(\hat T = w^\top x + b\)</td><td>5 + \(\lambda\)</td><td>大概率显著优于 Level 0</td></tr>
      <tr><td>Level 2</td><td>核岭回归（RBF）或深度 ≤ 4 的随机森林</td><td>\(O(N)\)</td><td>可能持平——这本身是结论</td></tr>
      <tr><td>Level 3</td><td>MLP 4→8→1 + dropout</td><td>约 50</td><td>很可能不显著优于 Level 1</td></tr>
    </tbody>
  </table>
</section>

<h4>2.1 数据怎么来（这是真正的瓶颈）</h4>
<table class="tbl small">
  <thead><tr><th>来源</th><th>做法</th><th>成本</th><th>风险</th></tr></thead>
  <tbody>
    <tr><td>自己标注</td><td>对 40–60 首曲目、约 250 对组合，用同一套流程标出「专家式」过渡时长</td><td>数天</td><td>标注者一致性需要检验（至少两人标注 10% 并算一致性）</td></tr>
    <tr><td>公开 DJ mix 数据集</td><td>使用已发表数据集（如 Conte 等 2021 的 DJ-Mix 数据）</td><td>低</td><td>风格分布与你的目标场景可能不同；注意许可</td></tr>
    <tr><td>合成/半合成</td><td>用规则生成标签，再注入噪声</td><td>低</td><td><strong>不可用于验证真实结论</strong>，只能用于打通代码</td></tr>
  </tbody>
</table>
<p><strong>建议</strong>：以后做这类题目时，先把 250 条真实标注做出来（现在先理解流程）。数据质量决定了这类研究的上限，而模型选择只影响几个百分点。</p>

<h4>2.2 评估协议（照抄即可）</h4>
<ol>
  <li><strong>分组</strong>：按艺人（或专辑）分组，5 折 <code>GroupKFold</code>，确保同一艺人不跨折。</li>
  <li><strong>指标</strong>：RMSE（主）+ MAE（辅）+ 与 Level 0 的相对降低。</li>
  <li><strong>置换检验</strong>：\(B = 500\)，报告 \(p\) 值与零分布分位数。</li>
  <li><strong>稳定性</strong>：至少 5 个随机种子，报告均值 ± 标准差。</li>
  <li><strong>听测</strong>：对 Level 0 与 Level 1 的预测各生成一批过渡，做盲测成对偏好（模块 09 的方法）。</li>
</ol>

<h4>2.3 三种可能的结论，以及怎么写</h4>
<table class="tbl small">
  <thead><tr><th>结果</th><th>如何表述</th><th>价值</th></tr></thead>
  <tbody>
    <tr><td>Level 1 显著优于 Level 0，Level 3 无增益</td><td>「学习确实能标定解析模型留下的自由参数 \(T^*\)，且在 N=250 的规模下，线性模型的容量已经饱和。」</td><td>最理想：正结果 + 清晰的容量边界</td></tr>
    <tr><td>所有级别都不显著</td><td>「在现有样本量与特征下，无法拒绝『学习没有带来增益』的原假设；这表明 \(T^*\) 主要由未观测因素（如编曲结构）决定。」</td><td>合格且诚实：负结果本身是学术产出</td></tr>
    <tr><td>只有 Level 3 好，且置换检验显著</td><td>必须额外做数据泄漏审查（艺人分组是否严格、特征是否含未来信息），再报告。</td><td>要警惕：这通常是泄漏的信号</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>什么情况下才值得引入神经网络</h4>
  <p>三个条件<strong>同时</strong>满足时才可以考虑：</p>
  <ol>
    <li>样本量提升一个数量级（例如 \(N \ge 2000\) 对）；</li>
    <li>特征维度显著上升（例如加入频谱图或自监督音频嵌入）；</li>
    <li>你有独立的、更大的测试集与足够的听测预算来证明确实更好。</li>
  </ol>
  <p>否则，引入大模型只会得到一个「无法辩护的复杂度」——这正是 Hand (2006) 与 Checkpoint 7 这类题目原始设定的立场。</p>
</section>

<h3>3. 12 周执行计划</h3>
<table class="tbl small">
  <thead><tr><th>周</th><th>课程模块</th><th>项目产出</th><th>可放进申请材料的证据</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>M0–M2</td><td>环境与仓库就绪；跑通 bigram 与 tokenizer 实验</td><td><code>labs/</code> 目录 + 实验日志</td></tr>
    <tr><td>2</td><td>M3–M4</td><td>手写注意力 + 参数量/显存手算；CP1 的可听基线 demo</td><td>推导笔记（含参数量误差分析）</td></tr>
    <tr><td>3</td><td>M5–M6</td><td>跑通迷你 Transformer 预训练；跑一遍 JAX miniGPT 教程</td><td>loss 曲线 + 训练配置表</td></tr>
    <tr><td>4</td><td>M7</td><td>CP2 完成：模型写成变分问题，列出全部假设</td><td>完整的假设-结论对照表</td></tr>
    <tr><td>5</td><td>M7–M8</td><td>CP3：三种竞争方法实现并给出预测</td><td>方法对比表 + 各自的失效条件</td></tr>
    <tr><td>6</td><td>M9</td><td>CP4：客观指标管线（LUFS、谱通量）</td><td>指标脚本 + 首批图</td></tr>
    <tr><td>7</td><td>M9–M10</td><td>CP5：成对特征提取完成</td><td>特征定义文档与分布图</td></tr>
    <tr><td>8</td><td>M10</td><td>数据标注完成（约 250 对）</td><td>标注协议 + 一致性统计</td></tr>
    <tr><td>9</td><td>M9 + E7</td><td><strong>CP7：模型阶梯 + 分组 CV + 置换检验</strong></td><td>RMSE 表、p 值、零分布图</td></tr>
    <tr><td>10</td><td>M9</td><td>CP6：听测（至少 10 名受试者，盲测）</td><td>偏好胜率与显著性检验</td></tr>
    <tr><td>11</td><td>M14</td><td>CP8：一键复现脚本 + 报告初稿</td><td>仓库 + <code>make all</code> 级别的复现命令</td></tr>
    <tr><td>12</td><td>M16</td><td>口头答辩演练；申请文书定稿</td><td>10 个 viva 问题的书面答复</td></tr>
  </tbody>
</table>

<h3>4. 申请叙事：三段式</h3>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>可复用的结构</h4>
  <ol>
    <li><strong>问题</strong>：一句话说清被你重新表述的问题（「我把淡入淡出从工程习惯重述为一个带边界条件的变分优化问题」）。</li>
    <li><strong>方法</strong>：你实际做的三件事——推导、实现、<strong>验证</strong>。强调验证协议（分组交叉验证、置换检验、盲测）。</li>
    <li><strong>诚实的结论</strong>：包括没成功的那部分（「在 250 条样本上，非线性模型没有带来可检测的增益」）。
        <em>对数学系申请而言，能说清「什么做不到、为什么」比罗列成果更有说服力。</em></li>
  </ol>
</section>
<table class="tbl small">
  <thead><tr><th>不要这样写</th><th>改成这样</th></tr></thead>
  <tbody>
    <tr><td>「我用 AI 训练了一个模型来优化音频过渡」</td><td>「我把过渡参数的学习限制在解析模型留下的一个自由参数上，并用分组交叉验证与置换检验检验其增益」</td></tr>
    <tr><td>「准确率提升了 30%」</td><td>「RMSE 从 2.4 秒降到 1.9 秒（5 折分组 CV 均值 ± 0.3），置换检验 p = 0.01，Level 3 相对 Level 1 无显著增益」</td></tr>
    <tr><td>「使用了最先进的 Transformer 架构」</td><td>「我评估了容量边界：在 N=250 时 VC 界已不可用，因此我以交叉验证为判据，并报告了负结果」</td></tr>
  </tbody>
</table>

<h3>5. Viva / 面试防御问题清单</h3>
<table class="tbl small">
  <thead><tr><th>问题</th><th>回答要点</th></tr></thead>
  <tbody>
    <tr><td>你为什么假设两条轨道不相关（\(\rho = 0\)）？</td><td>这是常功率曲线的成立条件；我在 CP4 中测量了实际相关性并给出了 \(\rho \ne 0\) 时的功率偏差界。</td></tr>
    <tr><td>你的能量守恒在哪个内积空间成立？</td><td>\(L^2([0,T])\)；感知响度不是该空间上的范数，所以必须引入 ITU-R BS.1770 的加权。</td></tr>
    <tr><td>为什么不用端到端神经网络？</td><td>样本量（250）与 VC 界分析；并且端到端会引入相位伪影与延迟，违反实时性约束。</td></tr>
    <tr><td>你的机器学习实验是否真的学到了东西？</td><td>置换检验 \(p\) 值 + 分组交叉验证；我保留了「无增益」这一可能的结论。</td></tr>
    <tr><td>你怎么知道不是过拟合？</td><td>艺人分组切分、多个随机种子、以及 Level 0 基线的对照。</td></tr>
    <tr><td>如果 \(\rho \to -1\) 会怎样？</td><td>出现零点，功率趋于 0；这给出了最坏情况的界，也是我建议加入频率分离的原因。</td></tr>
    <tr><td>你的实时实现如何避免线程不安全？</td><td>用无锁 SPSC 环形缓冲区；音频回调里不做内存分配与加锁。</td></tr>
    <tr><td>你怎么处理听测的主观性？</td><td>盲测、随机顺序、成对偏好 + 符号检验，并报告效应量而不是只说「更好听」。</td></tr>
    <tr><td>这项工作里哪些是已有技术，哪些是你的贡献？</td><td>常功率曲线、Linkwitz-Riley、节拍跟踪都是既有技术；我的贡献是统一的变分表述与「何时学习才有价值」的实证边界。</td></tr>
    <tr><td>如果重做一次，你会改变什么？</td><td>更早标注数据；把听测与客观指标的采集并行；一开始就用置换检验作为门槛。</td></tr>
  </tbody>
</table>

<h3>6. 可交付物清单</h3>
<table class="tbl">
  <thead>
    <tr><th>模块目录</th><th>核心内容</th><th>未来与大模型 Merge 衔接点</th></tr>
  </thead>
  <tbody>
    <tr><td><code>derivations/</code></td><td>音频平滑过渡与连续流建模数学推导</td><td>可作为连续状态空间（SSM / Mamba）特征插值理论基础</td></tr>
    <tr><td><code>engine/</code></td><td>实时音频重叠变换与自适应淡入淡出引擎</td><td>作为多模态大模型音频 Token 流的实时端侧渲染后端</td></tr>
    <tr><td><code>learning/</code></td><td>小规模参数拟合与交叉验证实验流水线</td><td>与 Kaggle 评测指标与微调实验规范完全接轨</td></tr>
    <tr><td><code>analysis/</code></td><td>感知响度（LUFS）与波形重叠能量分析</td><td>充当语音多模态大模型的声学质量客观奖励函数（Reward Model）</td></tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 Checkpoint 7 里，模型阶梯（Level 0 → 3）的主要目的是？</p>
  <ul class="opts">
    <li>找出准确率最高的模型</li>
    <li data-ok>定位「容量从哪一级开始不再带来可检测的增益」，把结论写成可辩护的边界</li>
    <li>证明神经网络没有用</li>
    <li>减少训练时间</li>
  </ul>
  <p class="why">
    阶梯的价值在于<strong>定位容量边界</strong>，而不是找到最优模型。
    如果 Level 1 已达上限，那么「在这个数据规模下非线性没有增益」就是一个完整的研究结论。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">假设以后你的 CP7 这类实验发现 Level 3 的 CV RMSE 明显低于 Level 1，且置换检验显著。第一步应该做什么？</p>
  <ul class="opts">
    <li>立刻写进报告</li>
    <li data-ok>先审查数据泄漏：艺人分组是否严格、特征里是否混入了未来信息、预处理是否在划分之前拟合</li>
    <li>再训练一个更大的模型</li>
    <li>提高学习率重跑</li>
  </ul>
  <p class="why">
    「复杂模型意外胜出」在小组数据上最常见的解释是泄漏（分组不严、特征穿越、标准化在全量数据上拟合）。
    必须先排除这些，否则结论无法通过答辩。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">在申请材料里，哪一种表述最符合学术诚实且最有说服力？</p>
  <ul class="opts">
    <li>「我训练了 SOTA 模型，效果显著提升」</li>
    <li data-ok>「在 250 条按艺人分组的样本上，线性模型的增益显著（p = 0.01），而非线性模型没有带来可检测的额外增益——我据此给出了容量边界」</li>
    <li>「由于数据有限，实验没有得出任何结论」</li>
    <li>「模型还在调参中，结果待补充」</li>
  </ul>
  <p class="why">
    招生官关心的是<strong>你的判断力</strong>：你是否知道如何在有限数据上做出可辩护的结论，
    以及是否愿意报告边界与负结果。含混的表述比负结果更糟。
  </p>
</div>

<div class="acc" data-t="深入：如果时间只够做一件事" data-badge="优先级">
  <div class="acc-body">
    <p>那就做 <strong>Checkpoint 7 的评估协议</strong>，并且只做 Level 0 与 Level 1 两级。</p>
    <p>理由：</p>
    <ul>
      <li>它同时覆盖「数学建模（解析基线）」「统计（分组 CV + 置换检验）」「工程（可复现脚本）」三项能力；</li>
      <li>不需要 GPU，一天之内可以完成；</li>
      <li>它天然产出可展示的图表与数字；</li>
      <li>它给出一个<em>诚实的、可检验的</em>结论，而不是一个「demo」。</li>
    </ul>
    <p>执行顺序：</p>
    <ol>
      <li>用 20 条真实数据先把 <code>run.py</code> 跑通（合成数据也算，只用于调试）。</li>
      <li>补齐到 250 条，固定随机种子，跑 5 折分组 CV。</li>
      <li>加置换检验（\(B=500\)），画出零分布。</li>
      <li>写下三句结论：数据规模、增益幅度与显著性、局限。</li>
      <li>把它写进申请材料，并准备好回答「如果换成非线性模型会怎样」。</li>
    </ol>
    <p><strong>完成这一个实验，以后你就拥有了大多数申请者没有的东西：一个带统计检验的、承认边界的定量结论。</strong></p>
  </div>
</div>
`
});
