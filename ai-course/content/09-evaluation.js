/* content/09-evaluation.js — 模块 09：评估与科研方法 */
COURSE.register({
  id: "m9",
  part: 2,
  num: "09",
  title: "评估与科研方法：怎么证明「真的变好了」",
  en: "Evaluation & Research Methods",
  minutes: 40,
  tags: ["核心", "统计", "必做"],
  body: String.raw`
<p class="lead">
  这是整门课最重要的一模块。学完这一节，以后你做 crossfade 这类项目时，就知道怎么把「一个跑通的 demo」做成「一份可以辩护的研究」。
  核心问题只有一个：<strong>你观察到的提升，是真实信号还是噪声与捷径？</strong>
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：评估就是「防止自欺」。你调了半天参数终于让分数变好——
    这一讲教你分辨那是<em>真本事</em>还是<em>背下了答案</em>。<br />
    <strong>这一讲要建立的直觉</strong>：任何「变好了」的结论都要过三道门——数据怎么切的、波动有多大、随机的运气能不能复现同样的提升。<br />
    <strong>读完你能回答</strong>：为什么必须按艺人分组？什么是置换检验，它为什么能识破「假信号」？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你用 250 条标注数据训练了一个模型，验证 RMSE 从 2.4 秒降到 1.9 秒。这算成功吗？
    在你回答之前，先问三个问题：<em>验证集是怎么切的？数据里有没有重复的艺人？如果把标签打乱重训，还能得到类似的「提升」吗？</em>
  </p>
</section>

<h3>1. 三层评估，缺一不可</h3>
<table class="tbl">
  <thead><tr><th>层次</th><th>指标</th><th>能回答什么</th><th>不能回答什么</th></tr></thead>
  <tbody>
    <tr><td>训练指标</td><td>loss、perplexity、梯度范数</td><td>优化是否正常进行</td><td>任务表现好不好</td></tr>
    <tr><td>任务指标</td><td>准确率、F1、RMSE、BLEU、MUSHRA</td><td>在固定测试集上的表现</td><td>是否泛化到真实分布</td></tr>
    <tr><td>人类/领域评估</td><td>双盲听测、专家评审</td><td>是否真的有价值</td><td>成本高、方差大</td></tr>
  </tbody>
</table>
<p><strong>损失下降 ≠ 任务变好。</strong>以 crossfade 这类任务为例，这一点尤其明显：预测过渡时长的 RMSE 降低 0.3 秒，
可能完全听不出来。所以 Checkpoint 4/6 要求把客观指标与主观听测对齐。</p>

<h3>2. 泛化：为什么必须按「艺人」分组</h3>
<p>
  <strong>结论先行</strong>：数据很少时，模型越复杂越容易把噪声当成规律，简单模型反而更稳——
  记住「小数据上简单模型常常赢」这一句和下面按艺人分组的例子即可，下面的偏差-方差公式与岭回归闭式解第二遍再看。
</p>
<div class="acc" data-t="选读·第二遍：偏差-方差分解与岭回归闭式解" data-badge="可选">
  <div class="acc-body">
<section class="blk blk-m">
  <h4><span class="ic">∑</span>偏差-方差分解与正则化</h4>
  <p>期望泛化误差可以分解为三部分：</p>
  \[ \mathbb{E}\big[(y - \hat f(x))^2\big] = \underbrace{\text{noise}}_{\sigma^2} + \underbrace{\big(\mathbb{E}[\hat f] - f\big)^2}_{\text{bias}^2} + \underbrace{\mathrm{Var}(\hat f)}_{\text{variance}} \]
  <p>岭回归的闭式解显示正则化如何换掉方差：</p>
  \[ \hat w = (X^\top X + \lambda I)^{-1} X^\top y \]
  <p>
    \(\lambda\) 增大 → 方差下降、偏差上升。这就是「小数据上简单模型常常赢」的数学原因：
    当 \(N\) 很小而 \(d\) 不小的时候，方差项主导，容量越大越糟。
  </p>
</section>
  </div>
</div>
<p>
  更隐蔽的问题是<strong>分组泄漏</strong>。音乐数据里，同一艺人的作品共享录音、母带、编曲习惯。
  如果随机切分，训练集与验证集里会同时出现同一艺人的曲目，模型只要记住「这个艺人的歌过渡时长通常 8 秒」就能刷分——
  这是 <span class="t" data-tterm="Clever Hans effect" data-d="模型利用了数据中的捷径（与任务无关的伪相关）而非真正机制，评估指标看起来很好。">Clever Hans 效应</span>。
  正确做法：<strong>按艺人/专辑分组切分（grouped split）</strong>，保证同一艺人的样本只出现在一侧。
</p>

<h3>3. 模型阶梯：奥卡姆剃刀的可执行版本</h3>
<table class="tbl small">
  <thead><tr><th>级别</th><th>模型</th><th>参数量级</th><th>作用</th></tr></thead>
  <tbody>
    <tr><td>Level 0</td><td>启发式规则（如 |ΔBPM| ≤ 0.05 → 8 秒，否则 3 秒）</td><td>0</td><td>必须有：任何学习模型都要先打败它</td></tr>
    <tr><td>Level 1</td><td>岭回归 \( \hat T = w^\top x + b\)</td><td>\(d+1\)</td><td>线性基线，可解释、可写解析解</td></tr>
    <tr><td>Level 2</td><td>核岭回归 / 浅层随机森林</td><td>\(O(N)\)</td><td>检验非线性是否真的存在</td></tr>
    <tr><td>Level 3</td><td>小型 MLP（如 4→8→1）+ dropout</td><td>数十</td><td>检验「容量」是否带来额外收益</td></tr>
  </tbody>
</table>
<p>
  <strong>判据不是「Level 3 最好」，而是「每一级相对上一级的提升是否超过噪声」。</strong>
  如果 Level 3 只比 Level 1 好 2%，而置换检验的 p 值是 0.4，那么正确的结论是：
  <em>在这份数据规模下，非线性模型没有带来可检测的增益</em>——这是一个合格的研究结论。
</p>

<h4>3.1 你的样本量到底能检测出多大的差别</h4>
<p>
  这是做实验前<strong>必须先算</strong>的一件事，否则你可能花两周去追一个根本测不出来的效应。用最基础的公式：
</p>
\[ \mathrm{SE} = \frac{\sigma}{\sqrt{N}} \]
<p>
  设过渡时长的标准差 \(\sigma \approx 2.4\) 秒、样本量 \(N = 250\)，则均值的标准误
  \(\mathrm{SE} = 2.4/\sqrt{250} \approx 0.15\) 秒。
  这意味着：<strong>单看一个模型的平均 RMSE，本身就带着约 0.15 秒的随机波动</strong>。
</p>
<table class="tbl small">
  <thead><tr><th>观测到的改进</th><th>相当于几个 SE</th><th>粗略结论</th></tr></thead>
  <tbody>
    <tr><td>0.05 秒</td><td>0.3 SE</td><td>完全在噪声里，不要报告</td></tr>
    <tr><td>0.15 秒</td><td>1 SE</td><td>很可能只是运气（p ≈ 0.32）</td></tr>
    <tr><td>0.30 秒</td><td>2 SE</td><td>勉强显著（p ≈ 0.05），需要置换检验确认</td></tr>
    <tr><td>0.50 秒</td><td>3.3 SE</td><td>较可信（p ≈ 0.001）</td></tr>
  </tbody>
</table>
<p>
  <strong>两个重要修正：</strong>（1）比较两个模型是<em>配对</em>比较（同一批样本上跑两个模型），
  应该用「每个样本上的误差差」的标准差，通常比上面的非配对估计更小、更容易显著；
  （2）交叉验证的折之间<strong>不独立</strong>，所以不要把 5 折的 5 个数当 5 个独立样本做 t 检验——
  这正是下一节要做置换检验的原因。
</p>
<p><em>可执行的结论：在 crossfade 这类任务常见的规模下，能可靠检测的是「0.3 秒以上」的差别。所以不要为了让 Level 3 赢而调参——
先在报告里声明这个可检测下限，会让你的结论显得非常专业。</em></p>

<h4>3.2 分组交叉验证的正确做法</h4>
<ol>
  <li><strong>先定分组键</strong>：音频任务用「艺人」；若有专辑信息，可以更粗（按专辑分），防止同一专辑的相似母带特征泄漏。</li>
  <li><strong>用 GroupKFold 而不是 KFold</strong>：前者保证同一个分组只出现在训练侧或验证侧。</li>
  <li><strong>标准化/编码只在训练折上拟合</strong>：在划分之前对全体数据做标准化，是最常见也最隐蔽的泄漏。</li>
  <li><strong>报告每折的分数与离散度</strong>：写「RMSE = 1.92 ± 0.31（5 折，按艺人分组）」，
      而不是只写一个 1.92。离散度本身就是信息——如果某一折特别差，往往是那一折里有个特殊艺人。</li>
  <li><strong>保留一个最终留出集</strong>：如果反复用交叉验证的分数挑选模型，它也会被「用过」。
      认真做的话，把 20% 的艺人整组留出来，只在最后用一次。</li>
</ol>

<h3>4. 置换检验：检测「假信号」的通用工具</h3>

<h4>4.1 三个前提，缺一个结论就不成立</h4>
<ol>
  <li><strong>可交换性</strong>：在原假设（特征与标签无关）下，标签的顺序是可以任意打乱的。
      对「按艺人分组」的数据，打乱必须在<em>样本层面</em>做，且重跑同样的分组交叉验证——
      否则你测的是别的东西。</li>
  <li><strong>统计量必须固定</strong>：检验前就定好用哪个指标（RMSE）、哪套交叉验证。
      不能在看到结果之后换指标——那是 p-hacking。</li>
  <li><strong>置换次数决定 p 值的分辨率</strong>：\(p\) 的最小非零值是 \(1/(B+1)\)。
      \(B = 500\) 时约 0.002，\(B = 10\,000\) 时约 \(10^{-4}\)。
      报告 p &lt; 0.002（B=500）比报告「p = 0.000」诚实得多——后者在有限次置换里不可能出现。</li>
</ol>
<p>
  还有一个常被忽略的细节：置换检验的零分布<strong>本身就是噪声的度量</strong>。
  把真实分数与零分布一起画出来，读者一眼就能看出「改进」相对噪声有多大——这张图比任何 p 值都有说服力。
</p>

<h4>4.2 效应量与多重比较</h4>
<p>
  p 值只回答「有没有信号」，不回答「信号有多大」。所以一定要同时报告效应量：
  常用的是 Cohen's d（两组均值差除以合并标准差），或对非正态数据更稳健的 Cliff's delta。
  经验刻度是 0.2 算小、0.5 算中、0.8 算大。
</p>
<p>
  <strong>多重比较</strong>：如果你比较了 5 个模型、每个都算一个 p 值，那么「至少一个偶然显著」的概率约 23%。三种诚实的做法：
</p>
<ul>
  <li><strong>Bonferroni</strong>：把阈值除以比较次数（5 次比较 → 用 0.01）。最保守。</li>
  <li><strong>Benjamini–Hochberg（FDR）</strong>：控制错误发现率，统计功效更高，适合比较次数多时。</li>
  <li><strong>先定假设再收集数据</strong>：只检验事先声明的那一个比较。这是最省事也最可信的做法。</li>
</ul>

<h4>4.3 岭回归的「有效自由度」：一个可写进报告的正则化度量</h4>
<p>
  <strong>结论先行</strong>：正则化越强，模型实际用到的自由度越小——
  从全部特征一路压向 0。记住这一句即可，下面的奇异值求和公式第二遍再看。
</p>
<div class="acc" data-t="选读·第二遍：岭回归有效自由度的 SVD 求和公式" data-badge="可选">
  <div class="acc-body">
<p>岭回归的解 \(\hat w = (X^\top X + \lambda I)^{-1}X^\top y\) 看起来像个线性模型，但它实际用了多少「自由度」？答案是</p>
\[ \mathrm{df}(\lambda) = \sum_{j} \frac{\sigma_j^2}{\sigma_j^2 + \lambda} \]
<p>
  其中 \(\sigma_j\) 是设计矩阵 \(X\) 的奇异值。这个式子很好用：\(\lambda = 0\) 时它等于特征维数 \(d\)；
  \(\lambda \to \infty\) 时它趋于 0。<strong>于是「模型复杂度」不再是一个模糊的说法，
  而是一个可以算出来的数</strong>——把它和 \(R^2\)、RMSE 一起报告，就能解释「为什么加了非线性特征却没有真正增加有效容量」。
</p>
  </div>
</div>
<p>Sturm (2014) 提出的做法极其简单，却极少被认真执行：</p>
<ol>
  <li>用真实标签训练并评估，得到 \(E_{\text{real}}\)（例如 RMSE）。</li>
  <li>把标签 <em>随机打乱</em>，重新训练与评估，得到 \(E_{\text{perm}}\)。重复几百次。</li>
  <li>把 \(E_{\text{real}}\) 放进 \(\{E_{\text{perm}}\}\) 的分布里，计算
      \( p = \dfrac{\#\{E_{\text{perm}} \le E_{\text{real}}\} + 1}{B + 1} \)。</li>
</ol>
<p>
  含义：<em>如果特征与标签之间没有真实关系，模型还能做到这么好的概率有多大？</em>
  如果 \(p\) 不显著，你的模型可能只是在拟合噪声——哪怕交叉验证的 RMSE 很漂亮。
</p>
<p>
  <strong>结论先行</strong>：250 条样本撑不起大模型——有一个老式理论公式算出来，
  连最简单的模型都给不出保证。记住方向性结论即可：样本越少、模型越复杂，泛化越不可靠；
  真正判断靠交叉验证和置换检验，公式推导第二遍再看。
</p>
<div class="acc" data-t="选读·第二遍：容量界为什么在 250 样本下是空的" data-badge="可选">
  <div class="acc-body">
<section class="blk blk-m">
  <h4><span class="ic">∑</span>容量界：为什么 250 个样本撑不起大模型</h4>
  <p>Vapnik 的泛化界（以 0-1 损失、置信度 \(1-\eta\) 为例）：</p>
  \[ R(f) \;\le\; R_{\text{emp}}(f) + \sqrt{\frac{h\big(\ln(2N/h)+1\big) - \ln(\eta/4)}{N}} \]
  <p>代入 \(N = 250\)、\(\eta = 0.05\)，要求泛化间隙小于 0.20，即</p>
  \[ \sqrt{\frac{h(\ln(500/h)+1) + 4.38}{250}} < 0.20
     \;\Longrightarrow\; h\big(\ln(500/h)+1\big) < 5.62 \]
  <p>
    取 \(h = 1\)：左边 \(= 1\times(\ln 500 + 1) = 7.21 > 5.62\)，<strong>仍然不满足</strong>。
    也就是说，<em>在这个样本量下，该界连「容量为 1 的模型」都无法认证</em>——界是空的（vacuous）。
  </p>
  <p>
    这不是说学习不可能，而是说 <strong>VC 界在现实样本量下过于保守</strong>。
    它的价值在于给出<em>方向性</em>结论：容量 \(h\) 越大、样本 \(N\) 越少，泛化间隙越大。
     实践中判断泛化靠的是交叉验证与置换检验，而不是这个公式——<strong>能说清这一点，正是数学成熟度的体现</strong>。
    </p>
</section>
  </div>
</div>

<h3>5. 一个可直接复用的评估协议</h3>
<p><strong>大模型评估核心指标微算子演示：</strong></p>
<p>\[ \text{PPL}(W) = \exp\left( -\frac{1}{N}\sum_{i=1}^N \log P(w_i \mid w_{< i}) \right) = \exp(\mathcal{L}_{\text{CE}}) \]</p>
<p>
  <strong>逐行代数解析</strong>：困惑度（Perplexity）在数学上严格等于验证集平均交叉熵损失的指数 \(\exp(\mathcal{L})\)；直观物理意义代表模型在预测下一个词时的“平均有效分支数”。困惑度数值越接近 1.0，说明模型对真实文本分布的预测越自信准确。
</p>
<p><strong>报告规范</strong>：给出真实分数、零分布的分位数、p 值、以及效应量（例如与 Level 0 的 RMSE 差）。
只说「我们的模型 RMSE 是 1.9」在学术上不构成结论。</p>

<h3>6. 三条方法论红线</h3>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>会让结论作废的做法</h4>
  <ol>
    <li><strong>在测试集上调超参</strong>：一旦你为了分数反复查看测试集，它就不再是测试集。要么留出最终的 held-out 集，要么用嵌套交叉验证。</li>
    <li><strong>只报告最好的运行</strong>：随机种子、初始化、数据顺序都会造成波动。至少跑 3–5 个种子并报告均值与标准差。</li>
    <li><strong>把相关性当因果</strong>：特征重要度高不等于「改变它就能改善结果」。要结论因果，需要干预实验（以 crossfade 这类任务为例：比如修改一个参数，重新渲染并听测）。</li>
  </ol>
</section>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>理论背书</h4>
  <ul>
    <li><strong>Hand (2006), <em>Classifier Technology and the Illusion of Progress</em></strong>：在真实噪声数据上，复杂模型往往打不过简单线性模型；「进步的错觉」来自评估方式而非模型。</li>
    <li><strong>Sturm (2014)</strong>：置换检验用于检测 MIR 系统是否真的学到了东西。</li>
    <li><strong>Flexer (2006) / 艺人效应</strong>：音乐数据必须按艺人分组，否则评估虚高。</li>
    <li><strong>Hastie, Tibshirani &amp; Friedman (2009)</strong>：岭回归、模型评估与自由度的标准参考。</li>
    <li><strong>Vandewalle et al. (2009)</strong>：可复现研究的三要素——代码、数据、脚本化的一键复现。</li>
  </ul>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：把 Checkpoint 7 完整做一遍（附录 B · E7）</h4>
  <p>用合成数据（或你的真实测量）实现下面三件事，并写成一页报告：</p>
  <ol>
    <li><strong>模型阶梯</strong>：Level 0 规则、Ridge、核岭回归/随机森林、小 MLP。</li>
    <li><strong>分组交叉验证</strong>：按「艺人」分组，5 折，报告每折 RMSE 与均值±标准差。</li>
    <li><strong>置换检验</strong>：\(B=500\) 次，报告 p 值与零分布图。</li>
  </ol>
  <p>结论模板：<em>「在 N=___ 条按艺人分组的样本上，Level k 相对 Level 0 的 RMSE 降低 __%，置换检验 p=___。
  因此我们（可以/不能）拒绝『学习没有带来增益』的原假设。」</em></p>
</section>

<h3>7. 草稿纸演算区：把指标算到小数点后三位</h3>
<p class="lead">
  前六节讲的是「怎么防止自欺」。这一节是<strong>上手计算区</strong>：先把字母当名字记住，
  再用 3 个小数、两句话、4 场对抗赛这种极小规模，把困惑度、词组命中率、ROUGE 召回率、
  Elo 更新全部手算一遍。每一道都能拿计算器独立复核，不需要跑代码。
  第一遍只需看懂加粗的结论句和表格里的几个小数，公式推导都收在「选读·第二遍」里。
</p>

<h4>7.1 符号约定（先把字母当名字记住，后面才不会串）</h4>
<p>
  下面这张表是本节的「人名册」：字母不多，每个都有一个极小的取值，第一遍扫一眼即可，
  用到时再回来查。
</p>
<table class="tbl small">
  <thead><tr><th>符号</th><th>含义</th><th>本节取值</th><th>一句备注</th></tr></thead>
  <tbody>
    <tr><td>\(N\)</td><td>测试集 token 总数</td><td>\(N = 3\)</td><td>困惑度是 token 级平均，不是句子级</td></tr>
    <tr><td>\(p_t\)</td><td>模型对第 \(t\) 个<em>真实</em> token 的预测概率</td><td>0.8 / 0.5 / 0.1</td><td>必须在预测时记录，不能事后重算</td></tr>
    <tr><td>\(P_n\)</td><td>裁剪后的 n-gram 精确率</td><td>\(n = 1,2,3,4\)</td><td>分母永远是候选的 n-gram 数</td></tr>
    <tr><td>\(m\)</td><td>候选文本的词数</td><td>\(m = 7\)</td><td>与参考比长度算出 BP</td></tr>
    <tr><td>\(r\)</td><td>参考文本的词数</td><td>\(r = 7\)</td><td>ROUGE 的召回率分母用的是它</td></tr>
    <tr><td>\(R_A\)</td><td>模型 A 的 Elo 分</td><td>\(R_A = 1500\)</td><td>每场之后总分 \(R_A + R_B\) 守恒</td></tr>
    <tr><td>\(S_A\)</td><td>A 本场得分</td><td>\(1 / 0.5 / 0\)</td><td>胜 / 平 / 负</td></tr>
    <tr><td>\(E_A\)</td><td>A 的期望得分（由分差算出）</td><td>0.50 至 0.85</td><td>分差为 0 时恒等于 0.5</td></tr>
    <tr><td>\(K\)</td><td>Elo 更新步长</td><td>\(K = 32\)</td><td>大 K 快而抖，小 K 稳而慢</td></tr>
  </tbody>
</table>

<h4>7.2 前置定义 A：困惑度</h4>
<p>
  <strong>一句话先行</strong>：困惑度回答的是「模型平均要在几个选项里猜下一个词」——数字越小越好，最小是 1。
  只需记住一条性质：<strong>错得离谱会被重罚</strong>，下面草稿纸里的三个小数就是演示这一条的。
</p>
<p>
  定义只用一行：先给每个位置的预测打分再平均，最后还原成「几个选项」：
</p>
\[ \mathrm{NLL}_t = -\ln p_t, \qquad \mathrm{CE} = \frac{1}{N}\sum_{t=1}^{N}\mathrm{NLL}_t, \qquad \mathrm{PPL} = \exp(\mathrm{CE}) \]
<div class="acc" data-t="选读·第二遍：困惑度的乘积写法" data-badge="可选">
  <div class="acc-body">
<p>把定义式改写成乘积形式，会看到一个非常好用的读法：</p>
\[ \mathrm{PPL} = \left(\prod_{t=1}^{N} \frac{1}{p_t}\right)^{1/N} \]
<p>
  也就是说，困惑度是倒数预测概率的几何平均。几何平均的性质是「谁差谁拖后腿」，
  后面草稿纸里的推导第二遍再看也完全跟得上。
</p>
  </div>
</div>
<p>
  直觉例子：三个位置的把握是 0.8、0.5、0.1，倒数就是 1.25、2 和 10——
  最差的那个 10 是另两项的五到八倍，整体结果被它单方面拉动；
  而三个 0.9 也只能把整体压到约 1.11（下限永远是 1）。
  <strong>这正是我们想要的性质</strong>——偶尔没把握没关系，但「错得离谱」会被重罚。
</p>

<h4>7.3 草稿纸 ①：三选一测试集上算困惑度</h4>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>题目：3 个 token，真实预测概率 p = 0.8 / 0.5 / 0.1，求 CE 与 PPL</h4>
  <p>严格按定义代入，每一步都写出中间量：</p>
  <table class="tbl small">
    <thead><tr><th>步</th><th>在算什么</th><th>算式</th><th>结果</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>取倒数</td><td>1 ÷ 0.8，1 ÷ 0.5，1 ÷ 0.1</td><td>1.2500，2.0000，10.0000</td></tr>
      <tr><td>2</td><td>连乘</td><td>1.25 × 2 × 10</td><td>25.0000</td></tr>
      <tr><td>3</td><td>开 3 次方（几何平均）</td><td>25 的 3 次方根</td><td>2.9240</td></tr>
      <tr><td>4</td><td>方法二：逐项 NLL</td><td>-ln 0.8，-ln 0.5，-ln 0.1</td><td>0.2231，0.6931，2.3026</td></tr>
      <tr><td>5</td><td>求和后除以 N</td><td>(0.2231 + 0.6931 + 2.3026) ÷ 3</td><td>CE = 1.0730</td></tr>
      <tr><td>6</td><td>指数还原（应当对上第 3 步）</td><td>e 的 1.0730 次方</td><td>2.9240 一致</td></tr>
      <tr><td>7</td><td>换算成比特</td><td>1.0730 ÷ ln 2</td><td>1.548 bit / token</td></tr>
    </tbody>
  </table>
  <p>
    <strong>自查方式：不用计算器的夹逼法。</strong>只需验两个整数立方，就能把答案夹在两位小数之内：
  </p>
  \[ 2.92^{3} = 24.897 < 25, \qquad 2.93^{3} = 25.154 > 25 \]
  <p>
    所以答案落在 2.92 与 2.93 之间；取 2.924 回代，\(2.924^{3} = 25.00\)，成立。
    <strong>第 6 步是必须做的交叉验证</strong>——几何平均与指数还原是同一个式子的两种写法，
    两者对不上就说明中间某一步抄错了数。
  </p>
</section>

<p>
  现在做这一节<strong>最重要</strong>的一步：<em>别急着说「PPL 2.92 很小」。</em>
  基线是什么？假设这 3 个位置上的候选集合都只有 3 个 token，一个完全不学的模型输出均匀分布：
</p>
\[ \mathrm{CE}_{\text{uniform}} = -\ln\tfrac{1}{3} = \ln 3 = 1.0986, \qquad \mathrm{PPL}_{\text{uniform}} = e^{1.0986} = 3.000 \]
\[ \mathrm{Gap} = \frac{3.000 - 2.924}{3.000} = 2.5\% \]
<p>
  <strong>结论：这个模型只比瞎猜好 2.5%。</strong>而单看「PPL = 2.92」这个数字，
  任何人都以为它很强——因为人们习惯把 PPL 和「几百」联系在一起，
  而那个数字背后是几万词的词表。瞎猜时困惑度恰好等于词表大小，
  <strong>所以困惑度的绝对值几乎完全由词表大小决定</strong>。
  第 3 节那句「Level 3 比 Level 1 好 2%，可能只是噪声」，在这里就变成
  「PPL 差 2.5% 可能什么都不算」。
</p>
<table class="tbl small">
  <thead><tr><th>情形</th><th>p 的三元组</th><th>CE</th><th>PPL</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>完全正确且自信</td><td>0.9, 0.9, 0.9</td><td>0.1054</td><td>1.111</td><td>几何平均贴近下限 1</td></tr>
    <tr><td>草稿纸 ① 那个例子</td><td>0.8, 0.5, 0.1</td><td>1.0730</td><td>2.924</td><td>中间那个 token 没把握</td></tr>
    <tr><td>三选一瞎猜</td><td>1/3, 1/3, 1/3</td><td>1.0986</td><td>3.000</td><td>基线恰好等于词表大小</td></tr>
    <tr><td>自信地全错</td><td>0.05, 0.05, 0.05</td><td>2.9957</td><td>20.000</td><td>几何平均重罚灾难性自信</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>报告困惑度的四条硬规矩</h4>
  <ol>
    <li><strong>必须同时报 tokenizer 与语料 token 数。</strong>换分词器之后 PPL 完全不可比——同一个模型，BPE 与字符级两种切法的 PPL 可以差三倍以上。</li>
    <li><strong>必须与基线一起报。</strong>一个孤立的 PPL 数字不构成结论。至少同时给出均匀分布基线（第 3 行那个数）和一个强基线。</li>
    <li><strong>PPL 与任务指标常常不同向。</strong>困惑度奖励「整体流畅」，任务指标奖励「恰好抽对那个字段」。一个 PPL 更低的模型完全可能有更差的抽取 F1。</li>
    <li><strong>别在小测试集上算完 PPL 再选模型。</strong>回到草稿纸 ①：那个 \(p_3 = 0.1\) 的 token 一个人贡献了 \(2.3026/3.2189 = 71.5\%\) 的总 NLL。也就是说这个 PPL 里有超过七成的权重压在一个样本上——这种数字做不了任何决策。</li>
  </ol>
</section>

<h4>7.4 前置定义 B：N-gram 精确率与 BLEU</h4>
<p>
  <strong>一句话先行</strong>：BLEU 数的是「你写的词组在参考答案里出现过几个」——
  但把同一句话抄十遍不算本事，所以重复的部分要砍掉（这叫裁剪）；
  最后把 1 个词到 4 个词的分数合在一起，还要罚「说得太短」。
  记住这一句就能看懂下面两张数词表，公式第二遍再看。
</p>
<div class="acc" data-t="选读·第二遍：精确率与 BLEU 的公式写法" data-badge="可选">
  <div class="acc-body">
<p>
  把候选文本切成 n-gram（连续 n 个词），数它们在参考里出现了多少次，
  但每个 n-gram 最多只能计它在参考里出现的次数；精确率的分母是候选里的 n-gram 总数：
</p>
\[ P_n = \frac{\sum_{g} \max\bigl(0,\ c_{\text{cand}}(g) - c_{\text{ref}}(g)\bigr)}{\sum_{g} c_{\text{cand}}(g)} \]
<p>BLEU 把前四个精确率用几何平均合成，BP 是长度惩罚：</p>
\[ \mathrm{BLEU\text{-}n} = \mathrm{BP}\cdot\exp\left(\frac{1}{n}\sum_{i=1}^{n}\ln P_i\right), \qquad \mathrm{BP} = \min\bigl(1,\ \exp(1 - r/m)\bigr) \]
<p>
  BP 那一行值得单独理解：当候选比参考长时不惩罚，当候选更短时按比例压分。
</p>
  </div>
</div>
<p>
  <strong>裁剪这一步是全部要点。</strong>若不裁剪，候选里把同一个短语重复十遍会被算成十次命中，
  精确率反而上升。裁剪把「重复」和「命中」这两件完全不同的事正确地分开了。
</p>
<p>
  长度惩罚只做一件事：<strong>专门对付「靠说得少刷精确率」</strong>——候选比参考长时不罚，候选更短时按比例压分。
</p>

<h4>7.5 草稿纸 ②：只差一个词的输出，BLEU-4 是多少</h4>
<p>
  设候选与参考都是 7 个词，<strong>只有第 6 个词不同</strong>（token 对 word）：
</p>
<p>候选（系统输出）：the model predicts the next <strong>token</strong> quickly<br />
参考（人工标注）：the model predicts the next <strong>word</strong> quickly</p>
<p>先逐档数 n-gram，再看被裁掉的是哪几个：</p>
<table class="tbl small">
  <thead><tr><th>n</th><th>候选 n-gram 总数</th><th>裁剪后命中</th><th>P_n</th><th>被裁掉的是什么</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>7</td><td>6</td><td>0.8571</td><td>token（在参考里出现 0 次）</td></tr>
    <tr><td>2</td><td>6</td><td>4</td><td>0.6667</td><td>(next, token)、(token, quickly)</td></tr>
    <tr><td>3</td><td>5</td><td>3</td><td>0.6000</td><td>(the, next, token)、(next, token, quickly)</td></tr>
    <tr><td>4</td><td>4</td><td>2</td><td>0.5000</td><td>含 token 的两个 4-gram</td></tr>
  </tbody>
</table>
<p>
  把二元的六步手工走一遍，这是唯一真正需要动笔的部分：
</p>
<table class="tbl small">
  <thead><tr><th>候选 bigram</th><th>参考里出现几次</th><th>裁剪后计入</th></tr></thead>
  <tbody>
    <tr><td>(the, model)</td><td>1</td><td>1</td></tr>
    <tr><td>(model, predicts)</td><td>1</td><td>1</td></tr>
    <tr><td>(predicts, the)</td><td>1</td><td>1</td></tr>
    <tr><td>(the, next)</td><td>1</td><td>1</td></tr>
    <tr><td>(next, token)</td><td>0</td><td>0</td></tr>
    <tr><td>(token, quickly)</td><td>0</td><td>0</td></tr>
  </tbody>
</table>
<p>长度惩罚：两边都是 7 个词，所以不罚分。四个精确率合在一起，BLEU-4 约等于 0.64（对数平均的写法见选读）。</p>
<div class="acc" data-t="选读·第二遍：BLEU-4 的对数平均写法" data-badge="可选">
  <div class="acc-body">
<p>长度惩罚这一步代入 7 和 7 就得到 1；四个精确率先连乘再开四次方：</p>
\[ \mathrm{BP} = \min\bigl(1,\ \exp(1 - 7/7)\bigr) = 1 \]
\[ \mathrm{BLEU\text{-}4} = \exp\Bigl(\tfrac{1}{4}\bigl[\ln 0.8571 + \ln 0.6667 + \ln 0.6000 + \ln 0.5000\bigr]\Bigr) = \exp\bigl(\tfrac{1}{4}\ln 0.1714\bigr) = \exp(-0.4409) = 0.6435 \]
<p>
  复核一遍（同样不用计算器）：
</p>
\[ 0.8571\times0.6667\times0.6000\times0.5000 = 0.1714, \qquad 0.6435^{4} = 0.1715 \]
  </div>
</div>
<p>
  <strong>为什么 BLEU 偏偏要用几何平均？</strong>把第 4 档改成 0（只在句尾错一个词）试试：
  BLEU-4 直接变成 0，前三档多好看都没用。如果换成算术平均，同样情况下仍有 0.53。
  <strong>几何平均是故意的</strong>：它要求每一档都不允许有短板。
  换成评估语言，这正是「细节错一处就整体不可信」的量化表达——你可以把这句话直接写进报告。
</p>

<h4>7.6 前置定义 C：ROUGE 召回率与 F-measure</h4>
<p>
  <strong>一句话先行</strong>：BLEU 怕「说得太多」，ROUGE 怕「该说的没说到」——
  ROUGE 看的是参考答案里被覆盖了多少，参考写得越长分数越容易往下掉。
  下面草稿纸③就是演示这一句的，公式第二遍再看。
</p>
<div class="acc" data-t="选读·第二遍：召回率与 ROUGE-L 的公式写法" data-badge="可选">
  <div class="acc-body">
<p>
  ROUGE 与 BLEU 有两处关键差别：主指标用召回率，因为参考里的内容都该被覆盖到；召回率的分母是参考的 n-gram 数：
</p>
\[ R_n = \frac{\mathrm{matched}_n}{\text{reference } n\text{-grams}}, \qquad P_n = \frac{\mathrm{matched}_n}{\text{candidate } n\text{-grams}}, \qquad F_n = \frac{2 P_n R_n}{P_n + R_n} \]
<p>
  ROUGE-L 用最长公共子序列代替计数：
</p>
\[ P_{\text{LCS}} = \frac{\mathrm{LCS}(c,r)}{m}, \qquad R_{\text{LCS}} = \frac{\mathrm{LCS}(c,r)}{r}, \qquad F_{\text{LCS}} = \frac{2 P_{\text{LCS}} R_{\text{LCS}}}{P_{\text{LCS}} + R_{\text{LCS}}} \]
  </div>
</div>
<p>
  差别很实在。取候选 the model <strong>predicts</strong> the next token
  与参考 the model <strong>estimates</strong> the next word：
  按两词一组数只命中 2 个，得 0.400 分；
  按最长公共子序列能认出 4 个共同成分，得 0.667 分。
  <strong>同一对句子，一种算法判 0.40 而另一种判 0.67</strong>——差别全部来自
  「同义词算不算部分正确」这个建模选择。
  抽取式摘要通常宁长勿短，所以主流实现默认同时报告 F，并把召回与精确单独列出来。
</p>

<h4>7.7 草稿纸 ③：把参考句拉长 10 个词，同一份输出会掉多少分</h4>
<p>
  候选固定不变（6 个词、5 个 bigram），只改参考的写法。参考 A 是候选本身；
  参考 B 把它展开成流程描述，信息量几乎没增加：
</p>
<p>候选：the model predicts the next token<br />
参考 A：the model predicts the next token<br />
参考 B：the model predicts the next token autoregressively one position at a time across the whole sequence</p>
<table class="tbl small">
  <thead><tr><th>参考</th><th>参考 bigram 数</th><th>命中</th><th>R_2</th><th>P_2</th><th>F_2</th></tr></thead>
  <tbody>
    <tr><td>A（6 词）</td><td>5</td><td>5</td><td>1.0000</td><td>1.0000</td><td>1.0000</td></tr>
    <tr><td>B（16 词）</td><td>15</td><td>5</td><td>0.3333</td><td>1.0000</td><td>0.5000</td></tr>
  </tbody>
</table>
<p>换成最长公共子序列的算法（两份参考下共同子序列都是 6 个词）：</p>
<table class="tbl small">
  <thead><tr><th>参考</th><th>LCS 长度</th><th>m</th><th>r</th><th>P_LCS</th><th>R_LCS</th><th>F_LCS</th></tr></thead>
  <tbody>
    <tr><td>A（6 词）</td><td>6</td><td>6</td><td>6</td><td>1.0000</td><td>1.0000</td><td>1.0000</td></tr>
    <tr><td>B（16 词）</td><td>6</td><td>6</td><td>16</td><td>1.0000</td><td>0.3750</td><td>0.5455</td></tr>
  </tbody>
</table>
<p>
  <strong>这一节最该带走的一句话</strong>：参考从 6 词扩到 16 词、输出却一个字都没改，
  ROUGE-2 的 F 就从 1.000 掉到 0.500，ROUGE-L 的 F 从 1.000 掉到 0.545。
  <strong>分数里有一部分是标注者文风与长度的函数，不是质量的函数。</strong>
  而参考长度是评测集的一个自由参数——评测者可以「调」分。
  这正是第 1 节三层评估里为什么必须有人类评估这一层：自动指标能被评测集的构造方式直接操纵。
</p>

<table class="tbl small">
  <thead><tr><th>指标</th><th>适合的任务</th><th>容易被什么刷高</th><th>容易被什么压低</th></tr></thead>
  <tbody>
    <tr><td>困惑度</td><td>语言建模基准</td><td>语料里的重复文本</td><td>换分词器即不可比</td></tr>
    <tr><td>精确匹配 / F1</td><td>抽取、分类、结构化输出</td><td>标签体系本身泄漏</td><td>同义不同形的正确答案</td></tr>
    <tr><td>BLEU / ROUGE-1,2</td><td>翻译、抽取式摘要</td><td>候选拉长、照抄参考里的常见短语</td><td>同样正确的另一种说法</td></tr>
    <tr><td>ROUGE-L</td><td>有序改写、代码生成</td><td>复述结构</td><td>同义替换（predicts 换成 estimates）</td></tr>
    <tr><td>语义相似度（向量嵌入类）</td><td>开放式生成</td><td>与参考语义相近的改写</td><td>依赖额外模型，引入新偏差</td></tr>
    <tr><td>人工 Elo</td><td>对话、创作、主观质量</td><td>评审疲劳与从众</td><td>成本高、方差大</td></tr>
  </tbody>
</table>

<h4>7.8 前置定义 D：Elo 积分排名系统</h4>
<p>
  <strong>一句话先行</strong>：Elo 是一套「惊喜系统」——赢了不该赢的加很多分，输了不该输的掉很多分；
  两人分数加起来永远不变，涨的都是对方掉的。下面四场小数字就是验这条的，代数证明第二遍再看。
</p>
<p>
  规则只用两行：先按分差算出「本该得几分」，再按「超出预期多少」加减（胜记 1、平记 0.5、负记 0）：
</p>
\[ E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}, \qquad R_A' = R_A + K\bigl(S_A - E_A\bigr), \qquad S_A \in \{0,\, 0.5,\, 1\} \]
<p>
  超出预期的部分就是这一场的<strong>惊喜程度</strong>：赢弱手加分多，赢强手几乎不加；输给弱手则掉很多分。
  对手同时反向更新，所以<strong>总分严格守恒</strong>。
</p>
<div class="acc" data-t="选读·第二遍：总分守恒的代数验证" data-badge="可选">
  <div class="acc-body">
<p>两人同时更新，总分的变化正好抵消：</p>
\[ R_A' + R_B' = R_A + R_B + K\bigl(S_A - E_A + S_B - E_B\bigr) = R_A + R_B + K\bigl((S_A + S_B) - (E_A + E_B)\bigr) = R_A + R_B \]
<p>
  括号里的两项都是 1（胜负和平局的计分规则，以及期望得分的对称性），
  所以步长 K 被完全抵消掉。这正是 Elo 最优雅的性质：涨分必然等于对方掉分，
  系统内部始终有一个固定总量在分配。后面草稿纸 ④ 会用四场数据把这条守恒律直接验一遍。
</p>
  </div>
</div>

<h4>7.9 草稿纸 ④：K = 32，连续四场的分值演化</h4>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>题目：A 与 B 都从 1500 分起步，连打四场，逐一更新</h4>
  <p>先手算第 2 场（因为它的分差不再为零）：</p>
  \[ E_A = \frac{1}{1 + 10^{(1484 - 1516)/400}} = \frac{1}{1 + 10^{-0.08}} = \frac{1}{1 + 0.8318} = 0.5459 \]
  \[ R_A' = 1516 + 32\bigl(1 - 0.5459\bigr) = 1516 + 14.53 = 1530.5 \]
  \[ R_B' = 1484 + 32\bigl(0 - 0.4541\bigr) = 1484 - 14.53 = 1469.5 \]
  <p>剩下的三场按同一套规则排下去：</p>
  <table class="tbl small">
    <thead><tr><th>场次</th><th>对阵（分）</th><th>S_A</th><th>E_A</th><th>R_A 更新后</th><th>R_B 更新后</th><th>总分</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>1500 : 1500</td><td>1</td><td>0.5000</td><td>1516.0</td><td>1484.0</td><td>3000</td></tr>
      <tr><td>2</td><td>1516.0 : 1484.0</td><td>1</td><td>0.5459</td><td>1530.5</td><td>1469.5</td><td>3000</td></tr>
      <tr><td>3</td><td>1530.5 : 1469.5</td><td>0</td><td>0.5870</td><td>1511.7</td><td>1488.3</td><td>3000</td></tr>
      <tr><td>4</td><td>1511.7 : 1488.3</td><td>0.5</td><td>0.5338</td><td>1510.7</td><td>1489.3</td><td>3000</td></tr>
    </tbody>
  </table>
  <p>
    <strong>三个可以直接引用的性质</strong>，全部能从这张表读出来：
  </p>
  <ul>
    <li><strong>总分守恒</strong>：四场都是 3000。实测时如果总分漂了，说明你把对方的得分写错了。</li>
    <li><strong>分差越大，胜负越不重要</strong>：第 2 场 A 赢了，但只涨 14.53 分；第 1 场分差为 0，同样是赢，涨了整整 16 分。</li>
    <li><strong>惊喜是有方向的</strong>：A 连赢两场又输一场，最后只比起点高 10.7 分。第 4 场是平局，A 反而掉 1.1 分——因为分差已经拉开，平局算「失望」。</li>
  </ul>
  <p>再算一组<strong>爆冷</strong>的数（同一对模型换个分差）：A 有 1700 分，B 有 1400 分。</p>
  \[ E_A = \frac{1}{1 + 10^{(1400 - 1700)/400}} = \frac{1}{1 + 10^{-0.75}} = \frac{1}{1 + 0.1778} = 0.8490 \]
  <table class="tbl small">
    <thead><tr><th>A 的本场结果</th><th>ΔR_A</th><th>直观解读</th></tr></thead>
    <tbody>
      <tr><td>胜</td><td>+4.83</td><td>赢一个弱手，涨分很少</td></tr>
      <tr><td>平</td><td>-11.17</td><td>与强手打平，掉分接近下限</td></tr>
      <tr><td>负</td><td>-27.17</td><td>输给弱手是灾难，掉分接近上限</td></tr>
    </tbody>
  </table>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸 ⑤：那个 400 是怎么来的（代数推导）</h4>
  <p>
    <strong>结论先行</strong>：400 只是「胜率比」翻译成「分数差」的比例尺——
    记住「差 400 分约等于 10 比 1，差 800 分约等于 100 比 1」这一句就能用，
    下面的对数推导第二遍再看。
  </p>
<div class="acc" data-t="选读·第二遍：从胜率比反解 400" data-badge="可选">
  <div class="acc-body">
  <p>
    400 看着像拍脑袋定的魔数，其实可以从一条要求反解出来。我们希望胜率比为 n 比 1 的选手，
    分数上正好领先对应分差，也就是要求
  </p>
  \[ \frac{1}{1 + 10^{-\Delta/400}} = \frac{n}{1+n} \]
  <p>把右边代进去解分差：</p>
  \[ 10^{-\Delta/400} = \frac{1}{n} \;\Longrightarrow\; -\frac{\Delta}{400} = \log_{10}\frac{1}{n} \;\Longrightarrow\; \Delta = 400\log_{10} n \]
  <p>
    代回去验一个具体值。取 n 为 2（期望 2:1），得分差为 120.4 分：
  </p>
  \[ E_A = \frac{1}{1 + 10^{-120.4/400}} = \frac{1}{1 + 10^{-0.30103}} = \frac{1}{1 + 0.5000} = 0.6667 = \frac{2}{3} \]
  <p>
    完全对上。所以 400 只是比例尺，
    而且换成任何正数都能得到一个自洽的系统；选 400 是为了让人类直觉上的小差距对应到温和的胜率变化。
  </p>
  </div>
</div>
  <table class="tbl small">
    <thead><tr><th>分数差 Δ</th><th>期望得分 E</th><th>等价胜率</th></tr></thead>
    <tbody>
      <tr><td>0</td><td>0.500</td><td>1 : 1</td></tr>
      <tr><td>100</td><td>0.640</td><td>约 1.8 : 1</td></tr>
      <tr><td>120</td><td>0.666</td><td>约 2 : 1</td></tr>
      <tr><td>200</td><td>0.760</td><td>约 3.2 : 1</td></tr>
      <tr><td>400</td><td>0.909</td><td>约 10 : 1</td></tr>
      <tr><td>800</td><td>0.990</td><td>约 100 : 1</td></tr>
    </tbody>
  </table>
  <p>
    反过来说一个更实用的读法：<strong>400 分差对应 10:1，800 分差对应 100:1</strong>——
    每 400 分把胜率比乘以 10。所以「某个模型比另一个强 800 分」不是一个模糊的说法，
    它精确地意味着 100 局里赢 99 局。
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>用 Elo 排名时的四个陷阱</h4>
  <ol>
    <li><strong>K 同时决定快慢与噪声。</strong>\(K = 32\) 时前十场就能把分差拉开 100 分以上，后面几百场都追不回来——所以早期 Elo 排名极不稳定。样本少时把 K 降到 4 至 16 更合适。</li>
    <li><strong>Elo 只给序数，不给间隔。</strong>1516 与 1530 相差 14 分，和 1516 与 2500 相差 984 分，在 Elo 里都只是「一次 32 分的更新」，但前者是噪声、后者是碾压。<strong>不要把 Elo 分差当效应量写进报告。</strong></li>
    <li><strong>必须随机化位置并匿名。</strong>让 A 总是出现在左边会引入位置偏好；让被测对象评价自己会引入自我偏好偏差。方差最小的做法是每对<em>双向各跑一次</em>，再取 \(S = (W + 0.5D)/N\)。</li>
    <li><strong>人数投票不等于 Elo。</strong>要把 \(N\) 个评审的胜负压成一个分数，应该用 Bradley-Terry 模型做最大似然拟合，并给出置信区间——而不是把各人的 Elo 简单平均。评审数少时，两者能差出一整个名次。</li>
  </ol>
</section>

<table class="tbl small">
  <thead><tr><th>本节题目</th><th>给定</th><th>算出的结果</th></tr></thead>
  <tbody>
    <tr><td>困惑度</td><td>\(p = 0.8,\ 0.5,\ 0.1\)</td><td>CE = 1.0730，PPL = 2.9240；均匀基线 3.000，只赢 2.5%</td></tr>
    <tr><td>BLEU-4</td><td>7 词候选，仅第 6 词不同</td><td>\(P_1\ldots P_4 = 0.857/0.667/0.600/0.500\)，BLEU-4 = 0.6435</td></tr>
    <tr><td>ROUGE-2 F</td><td>同一输出 vs 6 词 / 16 词参考</td><td>1.000 降到 0.500</td></tr>
    <tr><td>ROUGE-L F</td><td>同一输出 vs 6 词 / 16 词参考</td><td>1.000 降到 0.5455</td></tr>
    <tr><td>Elo 四场</td><td>\(K = 32\)，1500 : 1500 起手</td><td>A 1510.7 / B 1489.3，总分恒为 3000</td></tr>
    <tr><td>Elo 爆冷</td><td>1700 对 1400，\(E_A = 0.849\)</td><td>胜 +4.83，平 -11.17，负 -27.17</td></tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">
    候选 7 个词、参考 7 个词，只有第 6 个词不同，四个 n-gram 精确率是 \(P_1=0.857\)、\(P_2=0.667\)、\(P_3=0.600\)、\(P_4=0.500\)。BLEU-4 最接近？
  </p>
  <ul class="opts">
    <li>0.656：四个精确率取算术平均</li>
    <li data-ok>0.644：几何平均 \(\exp\bigl(\tfrac{1}{4}\ln 0.1714\bigr)\)</li>
    <li>0.171：直接连乘，没有开四次方</li>
    <li>0.500：被最小的 \(P_4\) 拉到了底</li>
  </ul>
  <p class="why">
    \(0.857\times0.667\times0.600\times0.500 = 0.1714\)，开四次方得 0.6435。
    算术平均 0.656 只差 0.012，所以两种错法看起来很像——但它们在边界上完全不同：
    若 \(P_4\) 真的是 0，几何平均直接给出 0（任何一档为 0 则整体为 0，这是 BLEU 的加固设计），
    而算术平均仍会给 0.53。连乘 0.171 忘了开方；取最小值 0.500 则把加固特性抹平了。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">
    同一份 6 词的候选输出，命中 5 个 bigram，分别对 6 词参考与 16 词参考算 ROUGE-2 的 F 值，F 从 1.000 变成了？
  </p>
  <ul class="opts">
    <li>1.000：候选没变，命中数也没变，分数就不该变</li>
    <li data-ok>0.500：召回率从 5/5 掉到 5/15，精确率仍是 1.000，F 正好减半</li>
    <li>0.333：把召回率直接当成了 F 值</li>
    <li>0.667：套用了 BLEU 的长度惩罚</li>
  </ul>
  <p class="why">
    召回率的分母是<em>参考</em>的 bigram 数。参考从 5 个 bigram 涨到 15 个，\(R_2 = 5/15 = 0.333\)，
    精确率 \(P_2 = 5/5 = 1.000\) 不变，于是 \(F_2 = 2\times1.000\times0.333/1.333 = 0.500\)。
    0.333 是漏掉了精确率那一半；0.667 是错把 BP 当成了 F。
    <strong>结论</strong>：参考长度是评测集的自由参数，同一份输出可以被评测方式本身压掉一半分数——
    所以报告 ROUGE 必须同时给出规范化规则、参考长度分布，并把 P 与 R 一起列出。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">
    Elo 里 \(R_A = 1700\)、\(R_B = 1400\)、\(K = 32\)。这一场 A 赢了，分数变化是？
  </p>
  <ul class="opts">
    <li>+16.00：赢就是赢，固定加 16 分</li>
    <li data-ok>+4.83：\(E_A = 0.849\)，赢弱手的惊喜本来就小</li>
    <li>-27.17：这是 A 输掉时的变化量</li>
    <li>+32.00：K 就是单场最大涨分</li>
  </ul>
  <p class="why">
    \(E_A = 1/(1+10^{(1400-1700)/400}) = 0.849\)，于是 \(\Delta R_A = 32\times(1 - 0.849) = +4.83\)。
    同一个模型输掉这一场则是 \(32\times(0-0.849) = -27.17\)——正因如此 Elo 才叫「惊喜系统」：
    它奖励以弱胜强、惩罚以强凌弱。+16 是「势均力敌时」的涨分（分差为 0 时 \(E = 0.5\)）；
    +32 需要 \(E = 0\)，即分差无穷大时才可能达到。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你的模型 CV RMSE 比基线低 15%，但置换检验 p = 0.42。合理的结论是？</p>
  <ul class="opts">
    <li>模型有效，只是数据太少</li>
    <li data-ok>没有证据表明模型学到了真实关系；这个「提升」与随机打乱标签后得到的提升无法区分</li>
    <li>p 值不重要，RMSE 才是关键</li>
    <li>应该继续调参直到 p &lt; 0.05</li>
  </ul>
  <p class="why">
    置换检验回答的是「在无真实关系时也能达到该表现的概率」。p = 0.42 意味着这个提升完全在噪声范围内。
    继续调参直到 p 变小是典型的 p-hacking，会让结论彻底失效。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么音乐/音频任务的交叉验证要按艺人（或专辑）分组？</p>
  <ul class="opts">
    <li>为了减少计算量</li>
    <li>为了让每折样本数相同</li>
    <li data-ok>同一艺人的作品共享录音与制作特征，随机切分会让模型利用艺人身份作弊，导致评估虚高</li>
    <li>因为随机切分在数学上不成立</li>
  </ul>
  <p class="why">
    这是分组泄漏的经典情形。模型不需要学到「过渡机制」，只要识别出艺人就能预测出更接近的时长。
    必须保证同一艺人的样本只出现在训练侧或验证侧。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于 VC 界在 N = 250 时的表现，正确的说法是？</p>
  <ul class="opts">
    <li>它能给出精确的泛化误差估计</li>
    <li data-ok>即使容量 h = 1，该界也要求泛化间隙超过 0.20，因此界是空的；它只能作方向性参考</li>
    <li>它证明任何模型都无法学习</li>
    <li>它等价于交叉验证</li>
  </ul>
  <p class="why">
    代入 \(N=250\)、\(\eta=0.05\) 得 \(h(\ln(500/h)+1) < 5.62\)，而 \(h=1\) 时左边为 7.21。
    界失效说明它过于保守，而不是说明学习不可能——实践中的泛化判断依赖交叉验证。
  </p>
</div>

<div class="acc" data-t="深入：把听力测试纳入评估体系（音频项目的必备环节）" data-badge="项目">
  <div class="acc-body">
    <p>以 crossfade 这类任务为例，客观指标（LUFS、谱通量）与主观感知并不总一致。可用的主观方法：</p>
    <table class="tbl small">
      <thead><tr><th>方法</th><th>做法</th><th>优点</th><th>代价</th></tr></thead>
      <tbody>
        <tr><td>ABX 测试</td><td>随机给出 A、B 与未知的 X，判断 X 是哪一个</td><td>能检测「是否有可听差异」</td><td>只能测差异，不能测偏好</td></tr>
        <tr><td>MUSHRA</td><td>多刺激 + 隐藏参考，0–100 打分</td><td>分辨率高、可比较多个方法</td><td>需 10–20 名受试者与规范流程</td></tr>
        <tr><td>成对偏好</td><td>两两比较，统计胜率并做符号检验</td><td>样本效率高、易实施</td><td>需要控制顺序效应</td></tr>
      </tbody>
    </table>
    <p><strong>最低要求</strong>：盲测（受试者不知道哪个是哪个）、随机顺序、足够的试次、报告置信区间或显著性检验。
    单人听测可以作为探索，但不能作为结论。</p>
    <p>与统计的接口：成对偏好用<strong>符号检验 / Wilcoxon 符号秩检验</strong>；
    多方法比较用 <strong>Friedman + 事后检验</strong>；效应量用 Cohen's \(d\) 或 Cliff's delta。
    这些正是 Checkpoint 6 里 \(\text{ITU-R BS.1770}\) 与 MUSHRA 并存的原因。</p>
  </div>
</div>
`
});
