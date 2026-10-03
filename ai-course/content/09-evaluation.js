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
  这是整门课最重要的一模块。它决定了你的项目是「一个跑通的 demo」还是「一份可以辩护的研究」。
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
<p><strong>损失下降 ≠ 任务变好。</strong>这在你的项目里尤其明显：预测过渡时长的 RMSE 降低 0.3 秒，
可能完全听不出来。所以 Checkpoint 4/6 要求把客观指标与主观听测对齐。</p>

<h3>2. 泛化：为什么必须按「艺人」分组</h3>
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

<h3>4. 置换检验：检测「假信号」的通用工具</h3>
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

<h3>5. 一个可直接复用的评估协议</h3>
<pre><code>import numpy as np
from sklearn.linear_model import Ridge
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_squared_error

def rmse(a, b): return float(np.sqrt(np.mean((np.asarray(a) - np.asarray(b)) ** 2)))

def grouped_cv_rmse(X, y, groups, alpha=1.0, n_splits=5, seed=0):
    gkf = GroupKFold(n_splits=n_splits)
    errs = []
    for tr, te in gkf.split(X, y, groups):
        m = Ridge(alpha=alpha).fit(X[tr], y[tr])
        errs.append(rmse(y[te], m.predict(X[te])))
    return float(np.mean(errs)), errs

def permutation_pvalue(X, y, groups, B=500, seed=0, **kw):
    real, _ = grouped_cv_rmse(X, y, groups, **kw)
    rng = np.random.default_rng(seed)
    null = np.array([grouped_cv_rmse(X, rng.permutation(y), groups, **kw)[0] for _ in range(B)])
    p = (np.sum(null &lt;= real) + 1) / (B + 1)
    return real, p, null

<span class="cm"># 用法：real, p, null = permutation_pvalue(X, y_T, artist_ids, alpha=1.0, B=500)</span>
<span class="cm"># 报告：RMSE(real)=...，p=...，并画出 null 分布与真实值的位置</span></code></pre>
<p><strong>报告规范</strong>：给出真实分数、零分布的分位数、p 值、以及效应量（例如与 Level 0 的 RMSE 差）。
只说「我们的模型 RMSE 是 1.9」在学术上不构成结论。</p>

<h3>6. 三条方法论红线</h3>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>会让结论作废的做法</h4>
  <ol>
    <li><strong>在测试集上调超参</strong>：一旦你为了分数反复查看测试集，它就不再是测试集。要么留出最终的 held-out 集，要么用嵌套交叉验证。</li>
    <li><strong>只报告最好的运行</strong>：随机种子、初始化、数据顺序都会造成波动。至少跑 3–5 个种子并报告均值与标准差。</li>
    <li><strong>把相关性当因果</strong>：特征重要度高不等于「改变它就能改善结果」。要结论因果，需要干预实验（在你的项目里就是：修改一个参数，重新渲染并听测）。</li>
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
    <p>对你的 crossfade 项目而言，客观指标（LUFS、谱通量）与主观感知并不总一致。可用的主观方法：</p>
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
