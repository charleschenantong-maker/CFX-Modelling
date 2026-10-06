/* content/05-pretraining.js — 模块 05：预训练 */
COURSE.register({
  id: "m5",
  part: 1,
  num: "05",
  title: "预训练：把语料压进参数，以及所有会炸的地方",
  en: "Pretraining — Optimizers, Schedules, Scaling",
  minutes: 40,
  tags: ["核心", "训练", "必做"],
  body: String.raw`
<p class="lead">
  预训练是整条流水线里最贵、最不神秘、也最容易失败的一步。
  它的全部内容是：<strong>一个损失函数、一个优化器、一份数据、一条学习率曲线，跑很久</strong>。
  这一模块讲清楚每一步的选择与失败模式。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>训练日志先看症状，再看公式</h4>
  <table class="tbl small">
    <thead><tr><th>日志症状</th><th>常见原因</th><th>先做的一步检查</th></tr></thead>
    <tbody>
      <tr><td>loss 变成 NaN</td><td>精度溢出、学习率过大、梯度异常</td><td>切换到 bf16，打印梯度范数，暂时降低学习率</td></tr>
      <tr><td>loss 突然尖峰</td><td>脏数据、异常长样本、恢复训练时状态不一致</td><td>记录尖峰 batch 的样本 ID、长度和 token 统计</td></tr>
      <tr><td>训练集下降，验证集不动</td><td>过拟合、数据泄漏或验证集太小</td><td>固定验证集，检查重复样本和 train/val 切分</td></tr>
      <tr><td>loss 几乎不动</td><td>标签错位、学习率太小、参数没有更新</td><td>确认 targets 是输入右移一位，并检查参数梯度非零</td></tr>
    </tbody>
  </table>
  <p>这些现象比记住某个最优超参数更可迁移；公式用来解释现象，排障顺序才是训练能否跑通的关键。</p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：预训练就是「反复做题、对答案、改错」，重复几十万次；<br />
    这一讲讲的就是<em>怎么改错改得又快又稳</em>（优化器、学习率、精度），以及改错过程中最容易炸的地方。<br />
    <strong>读完你能回答</strong>：loss 突然从 2.1 跳到 3.6 该怎么办？为什么训练用 bf16 而不是 fp16？为什么个人不可能预训练 7B？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    从随机初始化的权重，到一个会写代码、能推理的模型，中间发生了什么？
    答案不是某个技巧，而是<strong>把「预测下一个 token」这件事重复几十万步</strong>，
    并在每一步小心地不让损失炸掉。
  </p>
</section>

<h3>1. 流水线全景</h3>
<div class="flow">
  <div class="nd">原始语料</div><div class="ar">→</div>
  <div class="nd">质量过滤</div><div class="ar">→</div>
  <div class="nd">去重 (MinHash)</div><div class="ar">→</div>
  <div class="nd">分词 + 打包</div><div class="ar">→</div>
  <div class="nd hi">训练循环</div><div class="ar">→</div>
  <div class="nd">退火 / 长上下文</div><div class="ar">→</div>
  <div class="nd">指令微调</div>
</div>
<dl class="kv">
  <dt>质量过滤</dt><dd>启发式规则（长度、符号比例、重复率）+ 分类器打分；这一步通常决定模型上限</dd>
  <dt>去重</dt><dd>近似去重能显著减少背诵现象，并让有限算力见到更多不同内容</dd>
  <dt>打包</dt><dd>把多条文档拼成固定长度序列；必须用注意力掩码隔离不同文档，否则会学到跨文档的虚假关联</dd>
  <dt>退火</dt><dd>训练末期用高质量数据（代码、数学、精选网页）并压低学习率，这是提升下游表现最划算的一招</dd>
</dl>

<h3>2. 优化器：AdamW 与它的现代替代</h3>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>记号铺垫（Notation Bridge：拆解 AdamW 优化器符号）</h4>
  <ul>
    <li><strong>\(\theta_t\) 与 \(\theta_{t-1}\)</strong>：模型在第 \(t\) 步与第 \(t-1\) 步的全部权重参数矩阵（如 Attention 与 FFN 矩阵）；</li>
    <li><strong>\(g_t = \nabla_\theta \mathcal{L}\)</strong>：当前小批量数据上的瞬时梯度向量，指示损失上升最陡峭的方向；</li>
    <li><strong>\(m_t\)（一阶动量）</strong>：类似「带惯性的滚珠」，按衰减率 \(\beta_1 = 0.9\) 平滑过滤单批次噪声，保留历史速度方向；</li>
    <li><strong>\(v_t\)（二阶动量）</strong>：梯度的未中心化方差，按衰减率 \(\beta_2 = 0.95\) 累计各个坐标的摆动幅度；</li>
    <li><strong>\(\frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon}\)</strong>：自适应步长核心——经常剧烈震荡的参数除以较大的 \(\sqrt{\hat v_t}\)（小步走防炸），平缓稀疏的参数除以较小的 \(\sqrt{\hat v_t}\)（大步走加速），\(\epsilon = 10^{-8}\) 防止分母为零；</li>
    <li><strong>\(\lambda \, \theta_{t-1}\) 与 \(\eta\)</strong>：\(\eta\) 为全局学习率，\(\lambda = 0.1\) 是解耦权重衰减系数（L2 正则化），温和拉低参数绝对值防过拟合。</li>
  </ul>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>AdamW 更新式</h4>
  \[
  m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t, \qquad
  v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2
  \]
  \[
  \hat m_t = \frac{m_t}{1-\beta_1^{t}}, \qquad \hat v_t = \frac{v_t}{1-\beta_2^{t}}, \qquad
  \theta_t = \theta_{t-1} - \eta\left(\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon} + \lambda\,\theta_{t-1}\right)
  \]
  <p>
    直观理解：\(m\) 是一阶动量（平滑梯度方向），\(v\) 是二阶动量（对每个坐标自适应缩放步长），
    偏置校正让训练初期不发散，\(\lambda\) 是<strong>解耦</strong>的权重衰减（AdamW 相对 Adam 的关键改动）。
  </p>
  <p>LLM 预训练的常用值：\(\beta_1 = 0.9\)、\(\beta_2 = 0.95\)、\(\epsilon = 10^{-8}\)、\(\lambda = 0.1\)、梯度裁剪范数 \(1.0\)。
  注意 \(\beta_2\) 用 0.95 而不是 0.999——长序列训练中 0.999 会让二阶动量反应太慢。</p>
  <p>
    新趋势：<strong>Muon</strong>（对动量矩阵做正交化，在 2D 参数上替代 Adam）与
    <strong>Adafactor / Lion</strong>（省显存）。它们的目标一致：在同等算力下更稳定或更省状态显存。
  </p>
</section>

<h4>2.1 偏置校正：那两个 \(1-\beta^t\) 到底在修正什么</h4>
<p>
  动量 \(m\) 的初值是 0。第一步时 \(m_1 = (1-\beta_1)g_1\)，只有真实梯度的 10%（\(\beta_1 = 0.9\)）；
  第二步 \(m_2 = 0.9\,m_1 + 0.1\,g_2\)，仍然被初值拖累。
  如果直接用 \(m_t\) 当梯度，训练初期的有效步长会被人为压小。
</p>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先拿标量热身：第一步的动量被压扁了 10 倍</h4>
  <p>设第一步梯度 \(g_1 = 5\)，\(\beta_1 = 0.9\)，初值 \(m_0 = 0\)，则 \(m_1 = 0.9 \times 0 + 0.1 \times 5 = 0.5\)——只有真实梯度的十分之一。</p>
  <p>偏置校正把它除回去：\(0.5 / (1 - 0.9) = 0.5 / 0.1 = 5\)，恰好还原。若不校正，warmup 前几百步的有效学习率会被人为压小一个量级，loss 曲线开头那段平坦多半是它。</p>
  <p>LLM 回报：这就是 warmup 必须和偏置校正一起看的原因——省的是训练前几千步炸掉重来的 GPU 小时数。</p>
</section>
<p>把递推展开就能看清偏差有多大（其中 \(\mathbb{E}[\cdot]\) 表示数学期望值）：</p>
\[ m_t = (1-\beta_1)\sum_{i=1}^{t}\beta_1^{\,t-i}\,g_i
   \qquad\Longrightarrow\qquad
   \mathbb{E}[m_t] = \big(1-\beta_1^{\,t}\big)\,\mathbb{E}[g] \]
<p>
  所以 \(m_t\) 的期望与真实梯度差一个因子 \((1-\beta_1^t)\)，除以它即得无偏估计：
  \(\hat m_t = m_t/(1-\beta_1^t)\)。当 \(t\) 变大时 \(\beta_1^t \to 0\)，校正项自动消失——
  所以偏置校正<strong>只影响训练初期几千步</strong>，但那恰好是 loss 最容易炸的阶段。
  \(v\) 的校正同理，用 \(1-\beta_2^t\)。
</p>

<h4>2.2 为什么 LLM 用 \(\beta_2 = 0.95\)，而视觉模型常用 0.999</h4>
<p>
  \(\beta_2\) 是「梯度平方的滑动平均」的记忆长度，其特征时间约为 \(1/(1-\beta_2)\) 步：
</p>
<table class="tbl small">
  <thead><tr><th>\(\beta_2\)</th><th>记忆长度</th><th>后果</th></tr></thead>
  <tbody>
    <tr><td>0.999</td><td>约 1000 步</td><td>对梯度尺度的变化反应迟钝；在长序列、异构梯度的 LLM 训练里容易滞后</td></tr>
    <tr><td><strong>0.95</strong></td><td>约 20 步</td><td>能快速跟上梯度尺度的变化，是 GPT-3 以来的常用值</td></tr>
  </tbody>
</table>
<p>
  GPT-3 论文给出的配方是 \(\beta_1 = 0.9\)、\(\beta_2 = 0.95\)、\(\epsilon = 10^{-8}\)，
  配合梯度裁剪（范数 1.0）与权重衰减 0.1。这套数字后来被大量开源模型沿用，
  所以你会在几乎所有 LLM 训练脚本里看到它们。
</p>

<h4>2.3 梯度累积：用小显存模拟大批量</h4>
<p>显存不够时，我们不做一次大批量的前向，而是分几次做、把梯度攒起来再更新：</p>
\[ B_{\text{global}} = B_{\text{micro}} \times N_{\text{accum}} \times N_{\text{DP}} \]
<p>
  例如「微批 4 × 累积 8 × 数据并行 8 卡 = 全局批 256」。
  <strong>它为什么几乎等价于真的用 256 的批？</strong>因为损失是每个 token 的平均值，
  而梯度是线性的：先算 8 个小批的梯度再相加（除以总 token 数），结果与一次大批的梯度相同。
</p>
<p><strong>但有三个细节会让它「几乎」而不「完全」等价：</strong></p>
<ol>
  <li><strong>Dropout 的随机掩码不同</strong>：每个微批独立采样，大批量只采样一次。</li>
  <li><strong>优化器步数变少</strong>：同样的数据量下，参数更新次数减少 \(N_{\text{accum}}\) 倍。
      如果学习率没有相应调整，收敛轨迹会不同。</li>
  <li><strong>归一化方式</strong>：如果你的损失不是按 token 平均而是按样本求和，累积会改变有效学习率。
      LLM 训练里逐 token 平均是标准做法，所以通常没问题；用 BatchNorm 的模型则会出问题
      （Transformer 用 LayerNorm/RMSNorm，所以安全）。</li>
</ol>

<h4>2.4 混合精度里到底谁是谁</h4>
<table class="tbl small">
  <thead><tr><th>对象</th><th>精度</th><th>每参数字节</th><th>为什么</th></tr></thead>
  <tbody>
    <tr><td>前向/反向的权重、梯度</td><td>bf16</td><td>2 / 2</td><td>矩阵乘用它最快</td></tr>
    <tr><td>优化器状态（\(m\), \(v\)）</td><td>fp32</td><td>8</td><td>累积量需要精度，否则更新会抖动</td></tr>
    <tr><td>fp32 主权重副本</td><td>fp32</td><td>4</td><td>更新在 fp32 里做，避免小步长被 bf16 舍入吃掉</td></tr>
    <tr><td><strong>合计</strong></td><td></td><td><strong>2 + 2 + 8 + 4 = 16</strong></td><td>这就是「训练显存 = 16 字节/参数」的来源</td></tr>
  </tbody>
</table>
<p>
  注：上表是「参数常驻」部分；激活是另算的现场量，量级约为 \(B \cdot T \cdot L \cdot d\) 再乘每元素字节数，
  随 batch、序列长度、层数、维度线性增长——长上下文训练里激活才是显存杀手，具体算法见模块 08 的 KV Cache 算账。
</p>
<p>
  <strong>loss scaling 只在 fp16 上需要</strong>：fp16 的指数位只有 5 位，最小正规数约 \(6\times10^{-5}\)，
  小梯度会下溢成 0。做法是先把损失放大 \(2^{k}\) 倍，反向后再除回来。
  bf16 的指数位与 fp32 相同（8 位），动态范围足够，所以不需要这一套——
  这是它在 LLM 训练里几乎完全取代 fp16 的原因。
</p>

<h3>3. 学习率曲线：warmup + 余弦</h3>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>记号铺垫（Notation Bridge：余弦退火分段函数）</h4>
  <ul>
    <li><strong>\(t\) 与 \(T\)</strong>：\(t\) 为当前训练步数，\(T\) 为全流程计划的总训练步数（如 100,000 步）；</li>
    <li><strong>\(t_{\text{warm}}\)</strong>：预热步数，通常设定为总步数的 1% ~ 2%（如前 2,000 步）；</li>
    <li><strong>\(\eta_{\max}\) 与 \(\eta_{\min}\)</strong>：峰值最大学习率（如 \(3 \times 10^{-4}\)）与退火下限最小学习率（通常为峰值的 10%，如 \(3 \times 10^{-5}\)）；</li>
    <li><strong>为什么是 \(\frac{1}{2}(1 + \cos(\dots))\)</strong>：余弦函数在 \(\theta = 0\) 时值为 1，\(\frac{1}{2}(1+1) = 1\) 刚好从峰值平滑启程；在 \(\theta = \pi\) 时值为 \(-1\)，\(\frac{1}{2}(1-1) = 0\) 刚好平滑降至最低点，形成完美的 S 型缓降。</li>
  </ul>
</section>

\[
\eta(t) = \begin{cases}
\eta_{\max}\cdot \dfrac{t}{t_{\text{warm}}} & t < t_{\text{warm}} \\
\eta_{\min} + \tfrac{1}{2}(\eta_{\max}-\eta_{\min})\left(1+\cos\left(\pi \dfrac{t-t_{\text{warm}}}{T-t_{\text{warm}}}\right)\right) & t \ge t_{\text{warm}}
\end{cases}
\]
<ul>
  <li><strong>为什么需要 warmup</strong>：训练初期梯度方向不可靠，自适应优化器的二阶动量估计也不准；直接用大学习率会发散。典型 warmup 占总步数的 0.5%–2%。</li>
  <li><strong>为什么用余弦</strong>：末期小步长让模型稳定收敛到更平坦的区域，下游微调更稳。</li>
  <li><strong>学习率与其他超参的关系</strong>：批量大小翻倍时，学习率通常按比例或按平方根缩放；峰值学习率随模型宽度大致按 \(1/\sqrt{d}\) 缩小。</li>
</ul>

<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算：余弦退火学习率</h4>
  <p><strong>前置定义。</strong>学习率退火是在训练后段逐步减小步长；余弦函数具有周期性，且 \(\cos 0=1\)、\(\cos(\pi/2)=0\)、\(\cos\pi=-1\)，因此可以平滑地从峰值过渡到下限。取 \(\eta_{\max}=3\times10^{-4}\)、\(\eta_{\min}=3\times10^{-5}\)、\(t_{\text{warm}}=100\)、\(T=1000\)。</p>
  <p><strong>\(t=50\)：warmup 段。</strong></p>
  \[ \eta(50)=3\times10^{-4}\cdot\frac{50}{100}=1.5\times10^{-4} \]
  <p><strong>\(t=100\)：刚好进入余弦段。</strong>余弦相位为零，所以仍在峰值：</p>
  \[ \eta(100)=3\times10^{-5}+\frac{1}{2}(2.7\times10^{-4})(1+\cos0)=3\times10^{-4} \]
  <p><strong>\(t=550\)：余弦段中点。</strong>相位为 \(\pi(550-100)/(1000-100)=\pi/2\)：</p>
  \[ \eta(550)=3\times10^{-5}+\frac{1}{2}(2.7\times10^{-4})(1+0)=1.65\times10^{-4} \]
  <p><strong>\(t=1000\)：训练末点。</strong>相位为 \(\pi\)，余弦值为 \(-1\)：</p>
  \[ \eta(1000)=3\times10^{-5}+\frac{1}{2}(2.7\times10^{-4})(1-1)=3\times10^{-5} \]
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>三种典型爆炸，以及正确处理</h4>
  <ol>
    <li><strong>Loss spike（损失尖峰）</strong>：突然从 2.1 跳到 3.5，然后不回落。
        处理：回滚到 spike 前若干步的检查点 → 跳过那段数据 → 降低学习率 → 加强梯度裁剪。
        <em>不要硬扛</em>，模型通常不会自己恢复。</li>
    <li><strong>梯度爆炸 / NaN</strong>：多半来自 fp16 上溢或学习率过大。改用 bf16（动态范围与 fp32 相同）通常能直接解决。</li>
    <li><strong>Loss 不下降</strong>：按概率排序依次检查——数据是否有标签错位、学习率是否太小/太大、warmup 是否过长、权重初始化是否异常、分词是否正确（先解码几条样本出来看）。</li>
  </ol>
</section>

<h3>4. 混合精度：为什么用 bf16 而不是 fp16</h3>
<table class="tbl small">
  <thead><tr><th>格式</th><th>位宽</th><th>指数/尾数</th><th>LLM 训练中的表现</th></tr></thead>
  <tbody>
    <tr><td>fp32</td><td>32</td><td>8 / 23</td><td>基准，显存与带宽成本高</td></tr>
    <tr><td>fp16</td><td>16</td><td>5 / 10</td><td>需要 loss scaling，容易上溢/下溢</td></tr>
    <tr><td><strong>bf16</strong></td><td>16</td><td>8 / 7</td><td>动态范围同 fp32，几乎不需要特殊处理 → <strong>默认选择</strong></td></tr>
    <tr><td>fp8</td><td>8</td><td>4–5 / 2–3</td><td>H100 及更新硬件上可再省一半带宽，需要 per-tensor 缩放</td></tr>
  </tbody>
</table>
<p>标准配方：<strong>参数、梯度、激活用 bf16，优化器状态与主权重保持 fp32</strong>。损失在 fp32 里计算。</p>

<h3>5. 缩放律：该用多少数据、多少算力</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>参数量最优配比与 6ND 物理来源</h4>
  <p>
    <strong>为什么训练总算力是 \(C \approx 6ND\)？</strong><br />
    每个 Token 在模型前向传播时，每个参数发生 1 次乘法和 1 次加法，耗费 <strong>\(2ND\) FLOPs</strong>；而在反向传播计算梯度时，既要求对权重的梯度、又要求对上一层激活的梯度，计算量是前向的 2 倍，即 <strong>\(4ND\) FLOPs</strong>。前向与反向相加，单步完整迭代恰好是 \(2ND + 4ND = \mathbf{6ND}\) FLOPs！
  </p>
  <p>Chinchilla 的核心结论：在固定算力预算下，最优的参数量与数据量满足</p>
  \[ N_{\text{opt}} \approx \frac{D}{20} \qquad\Longleftrightarrow\qquad D_{\text{opt}} \approx 20\,N \]
  <p>也就是说，一个 7B 模型大约需要 140B token 才算「算力最优」。但<strong>现代模型普遍远超这个比例</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>模型</th><th>参数</th><th>训练 token</th><th>D/N</th><th>为什么过训练</th></tr></thead>
    <tbody>
      <tr><td>Chinchilla 最优</td><td>—</td><td>—</td><td>≈ 20</td><td>训练算力最省</td></tr>
      <tr><td>Llama-3-8B</td><td>8 B</td><td>≈ 15 T</td><td>≈ 1875</td><td>推理成本远大于训练成本，宁可在训练时多花</td></tr>
    </tbody>
  </table>
  <p>
    这个「过训练」的取舍是可以算的：训练算力 \(C_{\text{train}} \approx 6ND\) 是一次性成本，
    推理成本正比于使用量。当模型要被调用 \(10^{12}\) 次以上时，把 \(N\) 换小、把 \(D\) 换大几乎总是划算的。
    <strong>这条推理链条值得写进你的申请材料——它展示了「用微积分做工程决策」的能力。</strong>
  </p>
</section>

<p><strong>先看结论再看推导</strong>：在 \(C = 6ND\) 的预算下，最优配比是 \(D \approx 20N\)（7B 配约 140B token）。
拉格朗日乘子 \(\lambda\) 在这里只是一个记账工具：它把约束 \(ND = K\) 折进目标函数，让你能对 \(N\) 与 \(D\) 分别求导找极值；消去 \(\lambda\) 后剩下的就是配比公式。
记住这个结论和 5.1 节的预算算账即可；下面的完整推导是选读，第一遍可跳过。
LLM 回报：拿预算反推 \(N_{\text{opt}} \approx \sqrt{C/120}\)，申请多少卡一眼就有数。</p>

<div class="acc" data-t="选读·第二遍：Chinchilla 最优配比的拉格朗日推导" data-badge="可选">
  <div class="acc-body">
<section class="blk blk-lab">
  <h4><span class="ic">✎</span>草稿纸演算：Chinchilla 的解析极值点</h4>
  <p><strong>前置定义。</strong>幂律表示损失随参数量 \(N\) 和数据量 \(D\) 按幂次下降；固定 FLOPs 预算 \(C=6ND\) 时，\(N\) 与 \(D\) 不能同时任意增加。用一个常数 \(K=C/6\)，约束写成 \(ND=K\)。</p>
  <p>取经验损失模型 \(L(N,D)=L_0+A N^{-a}+B D^{-b}\)，用拉格朗日乘子 \(\lambda\)：</p>
  \[ \mathcal{J}=L_0+A N^{-a}+B D^{-b}+\lambda(ND-K) \]
  \[ \frac{\partial\mathcal{J}}{\partial N}=-aA N^{-a-1}+\lambda D=0,\qquad \frac{\partial\mathcal{J}}{\partial D}=-bB D^{-b-1}+\lambda N=0 \]
  <p>两式分别乘以 \(N\) 与 \(D\)，再消去 \(\lambda ND\)：</p>
  \[ aA N^{-a}=bB D^{-b} \]
  <p>带入 \(D=K/N\)，得到单变量方程：</p>
  \[ aA N^{-a}=bB K^{-b}N^b \Longrightarrow N^{a+b}=\frac{aA}{bB}K^b \]
  \[ N_{\text{opt}}=\left(\frac{aA}{bB}K^b\right)^{\!1/(a+b)},\qquad D_{\text{opt}}=\frac{K}{N_{\text{opt}}} \]
  <p>若经验上 \(a=b\) 且系数使最优比值为 \(D/N\approx20\)，就得到 Chinchilla 规则 \(D_{\text{opt}}\approx20N\)。再与 \(C=6ND\) 联立：</p>
  \[ C\approx120N^2\Longrightarrow N_{\text{opt}}\approx\sqrt{C/120},\qquad D_{\text{opt}}\approx20\sqrt{C/120} \]
</section>
  </div>
</div>

<h4>5.1 论文原话与「怎么用」</h4>
<p>
  Chinchilla 论文（Hoffmann et al., NeurIPS 2022，训练了 400 多个模型）的摘要原话是：
  <em>「for compute-optimal training, the model size and the number of training tokens should be scaled equally:
  for every doubling of model size the number of training tokens should also be doubled.」</em>
  ——模型规模翻倍，训练 token 数也应翻倍。它自己训出的 Chinchilla 是 70B 参数、1.4T token，
  比值 ≈ 20，这就是「\(D_{\text{opt}} \approx 20N\)」的出处。
</p>
<p><strong>怎么把它变成可用的工具：</strong>把 \(C \approx 6ND\) 与 \(D = 20N\) 联立，得到</p>
\[ D = 20N \;\Longrightarrow\; C \approx 6N(20N) = 120N^2
   \;\Longrightarrow\; N_{\text{opt}} \approx \sqrt{C/120} \]
<p>
  举例：若你的算力预算是 \(C = 10^{22}\) FLOPs，则 \(N \approx \sqrt{10^{22}/120} \approx 9.1\times10^{9}\)（约 9B 参数），
  对应 \(D \approx 1.8\times10^{11}\)（约 180B token）。回代验证：\(6 \times 9.1\times10^{9} \times 1.8\times10^{11} \approx 10^{22}\) ✓。
  <strong>这两个数字就是「给定算力，该训多大模型、用多少数据」的答案。</strong>
</p>
<p>
  但要记住这是<em>训练算力最优</em>，不是<em>总成本最优</em>。当模型要被反复推理时，
  把 \(N\) 调小、\(D\) 调大会让推理更便宜——这正是 Llama-3-8B 用约 15T token（\(D/N \approx 1900\)）
  远超 Chinchilla 比例的原因。这个取舍在模块 23（算力物理与经济学）的成本框架里会更清楚。
</p>

<h4>5.2 MFU：把「跑得多快」换算成「用了多少算力」</h4>
<p>实测中我们只有耗时，没有 FLOPs。反过来算就得到模型算力利用率：</p>
\[ \text{MFU} \;=\; \frac{6\,N\,D / t}{\text{peak FLOPs/s}} \]
<p>
  实操技巧：训练日志里通常有 <code>tokens/s</code>，于是每秒真实算力 \(= 6 \times N \times (\text{tokens/s})\)。
  例如一个 7B 模型跑到 12 000 tokens/s，则 \(6\times7\times10^{9}\times1.2\times10^{4} \approx 5.0\times10^{14}\) FLOP/s；
  若硬件 bf16 峰值是 \(3.1\times10^{14}\)（A100），这个数已经超过峰值——说明该模型是 MoE
  或你用了更快的硬件，需要按<em>激活参数量</em>重算。这个「算出来超过 100% 说明参数用错了」的自检，
  正是 MFU 最有价值的地方。
</p>
<p>经验区间：稠密模型预训练 35%–50%，微调与推理更低；看到 60% 以上先怀疑数字有问题。</p>

<h4>5.3 数据侧真正决定上限的三件事</h4>
<ol>
  <li><strong>近似去重</strong>：用 MinHash/SimHash 之类的方法去掉重复文档。重复会让模型背诵而不是泛化，
      也会让有限算力浪费在同一份内容上。实践中常能去掉可观比例的数据。</li>
  <li><strong>质量过滤</strong>：长度、符号比例、重复率等启发式规则，再加一个分类器打分。
      这一步的收益通常大于换更大的模型——<em>数据质量是上限，模型只是逼近上限的方式</em>。</li>
  <li><strong>重复次数（epoch）</strong>：预训练一般 1–4 个 epoch。超过之后收益急剧下降，
      且会加剧记忆化。如果你在微调，规则更严：1–3 个 epoch，多了就开始复读训练集。</li>
</ol>

<h3>6. 预算估算：从 FLOPs 到 GPU 小时</h3>
\[
\text{GPU-hours} \;=\; \frac{C}{\text{peak FLOPs/s} \times \text{MFU} \times 3600}
\]
<p>
  其中 <span class="t" data-tterm="MFU" data-d="Model FLOPs Utilization：实际达到的算力占硬件峰值的比例，LLM 预训练常见 35%–50%。">MFU</span>
  是模型算力利用率。举例：\(N=7\times10^{9}\)、\(D=10^{12}\)，则
  \(C = 6ND \approx 4.2\times10^{22}\) FLOPs。
  单张 A100（bf16 峰值约 \(3.1\times10^{14}\) FLOP/s）在 40% MFU 下：
</p>
\[
\frac{4.2\times10^{22}}{3.1\times10^{14}\times0.4\times3600} \approx 9.4\times10^{4}\ \text{GPU-hours}
\]
<p>按每小时 2 美元算，约 19 万美元。<strong>这就是为什么个人不可能预训练 7B 模型——这是本课程最重要的预算结论。</strong></p>

<section class="blk blk-lab">
  <h4><span class="ic">∑</span>预训练单步迭代核心算子：交叉熵损失与梯度截断</h4>
  <p>
    在预训练工程底层中，单步迭代的计算本质可以提炼为两道极简的核心代数算子（注：Kaggle 平台的端到端完整显存实战位于第 V 板块模块 28）：
  </p>

<p><strong>1. 自回归交叉熵损失算子：</strong></p>
<p>\[ \mathcal{L}_{\text{CE}} = -\frac{1}{N}\sum_{i=1}^N \log \frac{e^{z_{i, y_i}}}{\sum_{j=1}^V e^{z_{i, j}}} \]</p>
<p>
  <strong>逐行代数解析</strong>：将预测张量打平为所有位置的类别分布，计算目标 Token 的负对数似然（Negative Log-Likelihood）。这也是衡量模型“惊奇程度”的基准指标。
</p>

<p><strong>2. 梯度截断与 AdamW 权重更新算子：</strong></p>
<p>\[ g \leftarrow \nabla_\theta \mathcal{L}, \quad g \leftarrow g \cdot \min\left(1, \frac{M}{\|g\|_2}\right), \quad \theta \leftarrow \theta - \eta \cdot \text{AdamW}(g) \]</p>
<section class="blk blk-tip">
  <h4><span class="ic">💡</span>记号拆解：梯度截断的「限速器」物理机制</h4>
  <ul>
    <li><strong>\(\nabla_\theta \mathcal{L}\)</strong>：倒三角记号 \(\nabla\)（读作 nabla）是多变量微积分中的<strong>梯度算子</strong>，代表对所有模型参数求偏导数拼成的大向量；</li>
    <li><strong>\(\|g\|_2\)</strong>：双竖线表示 <strong>\(L_2\) 范数（模长）</strong>，就是高一空间向量的几何长度公式 \(\|g\|_2 = \sqrt{\sum g_i^2}\)；</li>
    <li><strong>\(\min\left(1, \frac{M}{\|g\|_2}\right)\)</strong>：这是一座天然的<strong>限速器</strong>——若总梯度长度 \(\|g\|_2 \le M\)（未超速），比值 \(\ge 1\)，\(\min\) 返回 1，梯度原封不动；一旦梯度由于异常数据爆炸使 \(\|g\|_2 > M\)（超速），比值 \(< 1\)，乘以该比例恰好把总长度等比例压缩回上限 \(M\)，彻底消除了梯度爆炸导致模型参数变 NaN 的风险！</li>
  </ul>
</section>
<p>
  <strong>逐行代数解析</strong>：反向传播计算全部参数的偏导数；<code>clip_grad_norm_</code> 将全局梯度向量的 \(L_2\) 范数限制在 1.0 以内；最后由 <code>optimizer.step()</code> 按照动量轨迹更新权重矩阵。
</p>
  <p>
    <strong>必须记录的实验日志</strong>：全局步数、学习率、loss、梯度范数、tokens/s、显存峰值。
    把 loss 画出来，你会亲眼看到 warmup 段的下降、余弦末期的变缓，以及过拟合（验证 loss 回升）。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与未来这类项目的关系（学完就知道以后该怎么迁移）</h4>
  <p>
    你现在不做预训练，但学完这一节你就知道，以后做 crossfade 这类项目时可以把<strong>「预训练 → 微调」这个两阶段范式搬过去</strong>：
    先用解析模型给出基线（相当于预训练阶段的知识），再用少量数据拟合残差（相当于微调）。
    关键纪律相同：<em>每一阶段都必须有独立的验证集与可复现的日志</em>，
    否则你无法回答「提升到底来自哪里」——而这正是 Cambridge 面试会追问的第一个问题。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">\(N=1.3\times10^{9}\)、\(D=2.6\times10^{10}\)（即 D/N = 20），训练算力 \(C\) 约为？</p>
  <ul class="opts">
    <li>\(2.0\times10^{19}\) FLOPs</li>
    <li data-ok>\(2.0\times10^{20}\) FLOPs</li>
    <li>\(2.0\times10^{21}\) FLOPs</li>
    <li>无法估算</li>
  </ul>
  <p class="why">
    \(C \approx 6ND = 6 \times 1.3\times10^{9} \times 2.6\times10^{10} \approx 2.0\times10^{20}\) FLOPs。
    按单张 A100（\(3.1\times10^{14}\) FLOP/s）× 40% MFU，约 \(2.0\times10^{20}/(1.24\times10^{14}) \approx 1.6\times10^{6}\) 秒 ≈ <strong>18 天单卡</strong>。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">训练中 loss 突然从 2.1 跳到 3.6，几步后仍不回落。最合理处置是？</p>
  <ul class="opts">
    <li>等待，通常会自动恢复</li>
    <li>立刻把学习率提高 10 倍冲出局部极小</li>
    <li data-ok>回滚到 spike 之前的检查点，跳过该段数据并降低学习率、加强梯度裁剪</li>
    <li>重新初始化模型，从头训练</li>
  </ul>
  <p class="why">
    Loss spike 通常由某个异常批次（脏数据、极端长度）触发，参数已经走向坏区域。
    标准做法是「回滚 + 跳过 + 降 lr」，这也是<strong>检查点必须频繁保存</strong>的工程理由。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于「过训练」（数据量远超 D/N = 20），下面哪个说法正确？</p>
  <ul class="opts">
    <li>它是浪费，因为不符合 Chinchilla 最优</li>
    <li data-ok>当模型会被大量推理调用时，训练时多花算力换更小/更省的推理是划算的</li>
    <li>它只对 MoE 有效</li>
    <li>它会让模型变差</li>
  </ul>
  <p class="why">
    Chinchilla 最优是<strong>固定训练算力</strong>下的最优。一旦把推理成本纳入总成本，最优解就会向「小模型 + 多数据」移动。
    Llama-3-8B 用约 15T token 训练，远超 Chinchilla 比例，正是这个逻辑。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">Adam 里 \(\beta_1 = 0.9\)、\(m_0 = 0\)，第一步梯度 \(g_1 = 5\)。此时 \(m_1\) 与偏置校正后的 \(\hat m_1\) 分别是？</p>
  <ul class="opts">
    <li>\(m_1 = 5\)，\(\hat m_1 = 5\)：动量初值就是梯度本身</li>
    <li>\(m_1 = 4.5\)，\(\hat m_1 = 45\)：把 \((1-\beta_1)\) 错乘成 \(\beta_1\) 又多除了一次</li>
    <li data-ok>\(m_1 = 0.5\)，\(\hat m_1 = 5\)：\(m_1 = 0.1 \times 5\)，再除以 \((1-0.9) = 0.1\) 还原</li>
    <li>\(m_1 = 0.5\)，\(\hat m_1 = 0.5\)：偏置校正只影响 \(v\) 不影响 \(m\)</li>
  </ul>
  <p class="why">
    \(m_1 = 0.9 \times 0 + 0.1 \times 5 = 0.5\)，只有真梯度的 10%；
    \(\hat m_1 = 0.5/0.1 = 5\) 恰好无偏。第一个选项忘了初值 0 的拖累；
    第二个把系数弄反；第四个错在 \(m\) 与 \(v\) 都要校正。
    训练初期不用校正，有效步长会被压小一个量级，warmup 段的 loss 平坦多半源于此。
  </p>
</div>

<div class="quiz quiz-blank" data-ans="160" data-tol="5">
  <div class="qlabel">填空 · 计算推演</div>
  <p class="q">在标准 FP16 混合精度预训练中（AdamW 优化器维护 FP32 主权重、一阶动量与二阶方差），每个可学习参数约消耗 16 字节静态显存。若在 Kaggle T4 上训练一个 \(N = 10\text{M}\)（1000 万）参数的 miniGPT 模型，仅模型参数与优化器状态所占用的静态显存约为多少 MB？（填入整数，如 160）</p>
  <div class="blank-wrap">
    <input type="text" class="blank-input" placeholder="输入静态显存 MB 数（如 160）..." />
    <button class="blank-btn">提交验证</button>
    <span class="blank-feedback"></span>
  </div>
  <p class="why">
    根据公式 \(M_{\text{static}} \approx 16 \times N\) 字节，\(16 \times 10^7 \text{ bytes} = 1.6 \times 10^8 \text{ bytes} \approx 160\text{ MB}\)。在单张 16GB 显存的 T4 GPU 上仅占约 1% 的显存空间，极其轻量！
  </p>
</div>

<div class="acc" data-t="深入：领域适配与「继续预训练」" data-badge="可选">
  <div class="acc-body">
    <p>如果你想让模型掌握某个垂直领域（例如音频 DSP 术语、MIDI 语义），有三种强度递增的手段：</p>
    <ol>
      <li><strong>提示工程 + 检索（RAG）</strong>：不改权重，成本最低，适合知识型需求。</li>
      <li><strong>继续预训练（continued pretraining）</strong>：在领域语料上以较小的学习率再训练几亿到几十亿 token。
          适合词汇与语体差异大的领域（法律、医学、代码库）。风险是<em>灾难性遗忘</em>，需要混入通用数据。</li>
      <li><strong>指令微调 + 偏好优化</strong>：让模型学会<em>按要求</em>使用领域知识（模块 07）。</li>
    </ol>
    <p>决策规则：<em>先问「知识缺失」还是「行为缺失」</em>。知识缺失 → 检索或继续预训练；行为缺失 → SFT/DPO。</p>
  </div>
</div>
`
});
