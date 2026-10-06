/* content/07-finetuning.js — 模块 07：微调与对齐 */
COURSE.register({
  id: "m7",
  part: 2,
  num: "07",
  title: "微调与对齐：SFT → DPO → GRPO 的全谱系",
  en: "Fine-tuning & Alignment (TRL)",
  minutes: 45,
  tags: ["核心", "训练", "TRL", "必做"],
  body: String.raw`
<p class="lead">
  预训练给你一个「会续写」的模型，微调与对齐把它变成一个「听话」的模型。
  这条路线原则上有四个台阶：监督微调、参数高效微调、偏好优化、可验证奖励的强化学习。
  这一模块把每个台阶的<strong>数据形态、目标函数、适用条件</strong>列清楚，并对应到 TRL 的具体 trainer。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：预训练像「上完大学」，微调像「入职培训」，对齐像「按公司规范做事」；
    LoRA 则是<em>不重印整本书，只贴几张便签</em>——书的原内容不动，便签改变你读它的方式。<br />
    <strong>这一讲要建立的直觉</strong>：先判断你缺的是<em>知识</em>还是<em>行为</em>；知识优先检索，行为才用微调。<br />
    <strong>读完你能回答</strong>：SFT、DPO、GRPO 各自需要什么数据？为什么 DPO 能省掉奖励模型？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你想让模型按固定格式输出音频分析结论。应该：写更长的提示词？做 SFT？做 DPO？还是直接上 GRPO？
    选错的代价是几天的算力和一个「看起来变好了」但无法解释的结果。
  </p>
</section>

<h3>1. 先决定要不要微调</h3>
<table class="tbl">
  <thead><tr><th>需求</th><th>首选手段</th><th>理由</th></tr></thead>
  <tbody>
    <tr><td>模型不知道某些事实</td><td>检索（RAG）</td><td>知识更新快、可溯源，微调记事实既贵又易错</td></tr>
    <tr><td>输出格式/风格不对</td><td>提示词 + few-shot</td><td>零成本，先试 20 个提示模板</td></tr>
    <tr><td>需要稳定遵循复杂指令</td><td>SFT（可配 LoRA）</td><td>用几百条到几万条示范即可显著改善</td></tr>
    <tr><td>有「更好/更差」的偏好但对不齐</td><td>DPO / KTO</td><td>不需要训练奖励模型，直接用偏好对</td></tr>
    <tr><td>答案可以被自动验证（数学、代码）</td><td>GRPO / RLVR</td><td>用规则型奖励替代人类偏好，信号干净且可扩展</td></tr>
    <tr><td>要复现人类反馈的细粒度偏好</td><td>RLHF（奖励模型 + PPO）</td><td>最贵、最不稳，通常只在有大量标注时值得</td></tr>
  </tbody>
</table>

<h3>2. 台阶一：监督微调（SFT）</h3>
<p>数据是「提问 → 理想回答」的示范。目标函数仍然是交叉熵，只是只在回答部分计算：</p>
\[ \mathcal{L}_{\text{SFT}}(\theta) = -\frac{1}{|y|}\sum_{t \in y} \log p_\theta(y_t \mid x, y_{<t}) \]
<dl class="kv">
  <dt>数据量</dt><dd>格式对齐：200–2000 条即可见效；能力注入：数万到数十万条</dd>
  <dt>学习率</dt><dd>全参数微调 \(10^{-5}\) 量级；LoRA \(10^{-4}\) 量级（比全参数高一个数量级）</dd>
  <dt>轮数</dt><dd>1–3 个 epoch。超过 3 轮几乎一定开始过拟合与「复读训练集」</dd>
  <dt>必须做</dt><dd>只在 assistant 片段算损失；混入 5%–10% 通用数据防止灾难性遗忘；固定随机种子</dd>
</dl>
<p>TRL 对应：<a href="https://huggingface.co/docs/trl/sft_trainer" target="_blank" rel="noopener">SFTTrainer</a>，
支持 packing、loss mask、PEFT 与多卡。CLI 形式见 <a href="https://huggingface.co/docs/trl/clis" target="_blank" rel="noopener">CLI 文档</a>。</p>

<h3>3. 台阶二：参数高效微调（LoRA / QLoRA）</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>LoRA 的数学</h4>
  <p>冻结原权重 \(W_0 \in \mathbb{R}^{d\times k}\)，只学习一个低秩增量：</p>
  \[ W = W_0 + \Delta W, \qquad \Delta W = \frac{\alpha}{r} B A, \qquad B \in \mathbb{R}^{d\times r},\ A \in \mathbb{R}^{r\times k},\ r \ll \min(d,k) \]
  <p>可训练参数量从 \(dk\) 降到 \(r(d+k)\)。当 \(d=k=4096\)、\(r=16\) 时：</p>
  \[ \frac{r(d+k)}{dk} = \frac{16 \times 8192}{4096^2} \approx 0.78\% \]
  <p>
    <span class="t" data-tterm="rank r" data-d="LoRA 的秩：越大容量越强也越容易过拟合，常见 8–64。">秩 \(r\)</span> 控制容量，
    <span class="t" data-tterm="alpha" data-d="缩放因子，实际更新幅度为 alpha/r·BA；常取 2r 或 16。">\(\alpha\)</span> 控制更新幅度。
    初始化时 \(B=0\)，所以训练开始时 \(\Delta W = 0\)——<strong>微调从原始模型精确出发</strong>，这一性质让 LoRA 特别安全。
  </p>
  <p>
    <strong>QLoRA</strong> 在此之上把基座量化成 4-bit（NF4 + 双重量化 + 分页优化器），
    让 7B 模型能在 16 GB 显卡上微调，代价是约 20%–30% 的速度损失。
  </p>
  <p>
    <strong>该把 LoRA 加在哪？</strong>经验规则：至少覆盖所有注意力投影（Q、K、V、O）；
    效果不够时再加 MLP 的 gate/up/down。只加 Q、V 是最省的配置，也常常是最弱的。
  </p>
</section>

<h4>3.1 为什么「低秩」就够用：一个可检验的说法</h4>
<p>
  LoRA 的前提假设是：<strong>把预训练模型适配到下游任务，所需的权重变化 \(\Delta W\) 是低秩的</strong>。
  直觉是——预训练已经学会了「怎么理解语言」，微调只需要在其中做小幅调整（改变风格、格式、领域词汇），
  这种调整不需要动用到 \(4096\times4096\) 个自由度。
</p>
<p>
  这个假设有一个可检验的后果：如果你把 \(\Delta W\) 做奇异值分解，它的能量应该集中在少数几个奇异值上。
  原始论文正是用这个实验来支持低秩假设的。你也可以在自己的微调上验证：训练完把 \(\Delta W\) 取出来做 SVD，
  看前 8 个奇异值占了多少能量。<em>这是一个很好的「小成本、真结论」实验。</em>
</p>

<h4>3.2 一个 7B 模型的 LoRA 参数量实算</h4>
<p>以 Llama-3-8B 的维度（\(d = 4096\)、\(d_{ff} = 14336\)、\(h_{kv} = 8\)、\(d_{\text{head}} = 128\)、32 层）为例，取 \(r = 16\)：</p>
<table class="tbl small">
  <thead><tr><th>目标模块</th><th>原矩阵形状</th><th>LoRA 参数量 \(r(d+k)\)</th><th>× 32 层</th></tr></thead>
  <tbody>
    <tr><td>\(W_Q\)</td><td>4096 × 4096</td><td>\(16 \times 8192 = 131{,}072\)</td><td>4.19 M</td></tr>
    <tr><td>\(W_K\)</td><td>4096 × 1024（GQA）</td><td>\(16 \times 5120 = 81{,}920\)</td><td>2.62 M</td></tr>
    <tr><td>\(W_V\)</td><td>4096 × 1024</td><td>81,920</td><td>2.62 M</td></tr>
    <tr><td>\(W_O\)</td><td>4096 × 4096</td><td>131,072</td><td>4.19 M</td></tr>
    <tr><td><strong>仅注意力</strong></td><td></td><td>425,984 / 层</td><td><strong>13.6 M（占 8.03B 的 0.17%）</strong></td></tr>
    <tr><td>加上 MLP 的 gate / up / down</td><td>4096×14336 等</td><td>884,736 / 层</td><td>+28.3 M</td></tr>
    <tr><td><strong>注意力 + MLP</strong></td><td></td><td></td><td><strong>≈ 41.9 M（0.52%）</strong></td></tr>
  </tbody>
</table>
<p>
  这张表解释了社区里的经验规则：<strong>只挂 Q/V 最省但常常最弱；挂上全部注意力投影是默认起点；
  效果不够再加 MLP</strong>。而「挂 MLP」的参数量是注意力的两倍多——所以要按需加，而不是一把全挂。
</p>

<h4>3.3 训练完可以「合并」回原权重</h4>
<p>因为 \(\Delta W = \frac{\alpha}{r}BA\) 是确定性的矩阵，推理前可以直接合并：</p>
\[ W_{\text{merge}} = W_0 + \frac{\alpha}{r}\,B A \]
<p>
  合并后模型结构与原模型完全一致，<strong>推理时不增加任何延迟与显存</strong>。
  这是 LoRA 相对 adapter（插入额外层，推理必须带着走）的最大工程优势。
  代价是：合并之后就很难再切换回原来的基座，做多任务时需要保留多个 adapter 或按需合并。
</p>
<p>
  另外两个常被忽略的细节：<strong>(1) \(B\) 初始化为 0</strong>，所以训练开始时 \(\Delta W = 0\)，
  模型精确等于原模型——这让 LoRA 的起步非常安全；
  <strong>(2) \(\alpha/r\) 只是缩放</strong>，它不改变参数量，但会改变有效学习率，
  所以调 \(r\) 时通常同时按比例调 \(\alpha\)（常见做法是固定 \(\alpha = 2r\)）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：前置定义（参数高效微调与低秩分解）</h4>
  <p>
    给 Charles 的打草稿顺序：先写出微调参数空间的自由度约束，再通过低秩分解定理手算压缩比与 FLOPs。
    每一步在纸上写清矩阵维度（Dimension）与秩（Rank）的上界。
  </p>
  <p>
    <strong>前置定义 1（参数高效微调 PEFT 与增量更新）：</strong>
    设预训练模型包含 \(D\) 个参数 \(\theta_0 \in \mathbb{R}^D\)。全量微调（Full Fine-Tuning）更新全部参数：\(\theta = \theta_0 + \Delta \theta\)，
    反向传播需维护 \(D\) 个梯度的 fp16 显存（\(2D\) 字节）与 AdamW 的优化器状态（fp32 主权重 + 一阶动量 + 二阶动量，共 \(12D\) 字节）。
    PEFT 冻结底座参数 \(\theta_0\)，仅引入极小规模的附加可训练参数 \(\phi \in \mathbb{R}^d\)（满足 \(d \ll D\)），参数更新限制在低维子空间：
  </p>
  \[ \min_\phi \mathcal{L}(\theta_0 + \Delta \theta(\phi); \mathcal{D}) \]
  <p>
    底座参数不需要任何梯度与优化器动量显存，显存开销从 \(16D\) 字节降至仅需覆盖 \(\phi\) 的极小显存。
  </p>
  <p>
    <strong>前置定义 2（低秩分解 Low-Rank Factorization）：</strong>
    设线性映射权重矩阵 \(W_0 \in \mathbb{R}^{d \times k}\)（通常 \(d=k=4096\)）。若对其增量矩阵 \(\Delta W \in \mathbb{R}^{d \times k}\) 施加秩约束 \(\mathrm{rank}(\Delta W) \le r \ll \min(d, k)\)，
    根据线性代数秩分解定理，存在窄矩阵 \(B \in \mathbb{R}^{d \times r}\) 与 \(A \in \mathbb{R}^{r \times k}\) 使得：
  </p>
  \[ \Delta W = \frac{\alpha}{r} B A \]
  <p>
    <strong>代数性质与计算量（FLOPs）手算：</strong>
  </p>
  <ul>
    <li>参数量压缩比：原矩阵参数量为 \(dk\)，分解后参数量为 \(r(d+k)\)。当 \(d=k=4096, r=16\) 时，参数量由 \(16{,}777{,}216\) 骤降至 \(16 \times 8192 = 131{,}072\)，占比仅为：
      \[ \frac{r(d+k)}{dk} = \frac{131{,}072}{16{,}777{,}216} = \frac{1}{128} \approx 0.78\% \]
    </li>
    <li>前向浮点计算量（FLOPs）：对输入行向量 \(x \in \mathbb{R}^{1 \times d}\)，直接乘法 \(x \Delta W\) 需 \(2dk\) 次操作。利用结合律计算 \(x (BA) = (xB) A\)：先算 \(xB \in \mathbb{R}^{1 \times r}\) 需 \(2dr\) 次操作，再算 \((xB)A \in \mathbb{R}^{1 \times k}\) 需 \(2rk\) 次操作，总计 \(2r(d+k)\) 次浮点运算，计算开销同样降低到原来的 \(0.78\%\)！</li>
    <li>初始化守恒律：初始化令 \(A \sim \mathcal{N}(0, \sigma^2)\) 而 \(B = 0\)，因此训练初始时刻恒有 \(\Delta W = \frac{\alpha}{r} (0 \cdot A) = 0\)，保证初始输出与预训练模型严格一致，微调平滑起步。</li>
  </ul>
  <p>
    <strong>前置定义 3（DPO 相对概率比与隐式奖励函数）：</strong>
    设输入 prompt 为 \(x\)，模型生成完整序列 \(y = (y_1, y_2, \dots, y_T)\)。
    当前训练中的策略模型概率为 \(\pi_\theta(y \mid x) = \prod_{t=1}^T \pi_\theta(y_t \mid x, y_{<t})\)，固定的参考基座模型概率为 \(\pi_{\text{ref}}(y \mid x) = \prod_{t=1}^T \pi_{\text{ref}}(y_t \mid x, y_{<t})\)。
    两者的<strong>对数相对概率比（Log Probability Ratio）</strong>定义为：
  </p>
  \[ \Delta \log \pi(x, y) \triangleq \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)} = \sum_{t=1}^T \Big( \log \pi_\theta(y_t \mid x, y_{<t}) - \log \pi_{\text{ref}}(y_t \mid x, y_{<t}) \Big) \]
  <p>
    依据逆强化学习原理，该对数比值在乘以温度参数 \(\beta > 0\) 后，隐式地刻画了策略相较于参考基准的<strong>标量奖励（Implicit Reward）</strong>：
  </p>
  \[ \hat{r}_\theta(x, y) \triangleq \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)} \]
  <p>
    当 \(\pi_\theta(y \mid x) > \pi_{\text{ref}}(y \mid x)\) 时，说明当前模型认为回答 \(y\) 优于基座，给予正奖励；反之给予负惩罚。
  </p>
</section>

<h3>4. 台阶三：偏好优化（DPO / KTO / ORPO）</h3>
<p>数据形态是三元组 \((x, y_w, y_l)\)：同一个提问下，被选中的回答与被拒绝的回答。</p>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先把四个词对上号（给 DPO 搭一座小桥）</h4>
  <p>
    读推导之前，先把四个词用一句话对上号：
    <strong>监督微调（SFT）</strong>是「照着示范学」——给你提问和理想回答，模型逐词模仿；
    <strong>偏好对</strong>是「两个回答排个序」——同一个提问下，一个被选中 \((y_w)\)、一个被拒绝 \((y_l)\)；
    <strong>奖励</strong>就是「这个回答值几分」——可以是人打的分，也可以是程序验出来的对错；
    <strong>策略更新</strong>是「调概率」——让好回答的生成概率上升、差回答的下降。
  </p>
  <p>
    <strong>一个具体例子</strong>：问「用一句话解释光合作用」。回答 A 准确简洁（被选中），回答 B 编造了细节（被拒绝）。
    训练前模型给 A 的概率是 \(0.10\)、给 B 的是 \(0.40\)——学偏了。
    DPO 这一步要做的就是把 A 的概率推上去、把 B 的压下来；第 5 节的小数字手算会一步步算给你看。
  </p>
  <p>
    <strong>为什么 DPO 不用单独训练奖励模型？</strong>一句话：
    奖励可以改写成「新策略相对参考模型的对数概率比」，而比较两个回答时，两边相同的公共项相减正好抵消——
    于是偏好对可以直接用一个成对比较损失来更新原来那个负责生成文本的模型，不必先单独拟合一个打分模型。
    完整的变分推导与对消过程收在下面的可选推导里，第一遍只带走这句直觉就可以往下走。
  </p>
</section>
<div class="acc" data-t="选读·第二遍：DPO 为什么能省掉奖励模型（变分闭式解与配分对消）" data-badge="可选">
  <div class="acc-body">
<section class="blk blk-m">
  <h4><span class="ic">∑</span>DPO 为什么可以跳过奖励模型</h4>
  <p>RLHF 的目标是最大化奖励同时约束偏离参考模型：</p>
  \[ \max_\theta\ \mathbb{E}_{y\sim p_\theta}\big[r(x,y)\big] - \beta\, D_{\mathrm{KL}}\big(p_\theta \,\|\, p_{\text{ref}}\big) \]
  <p>这个问题的最优解有闭式形式：</p>
  \[ p^*(y|x) = \frac{1}{Z(x)}\, p_{\text{ref}}(y|x)\, \exp\!\Big(\frac{r(x,y)}{\beta}\Big) \]
  <p>反解出 \(r\)，代入 Bradley–Terry 偏好似然，配分函数 \(Z(x)\) 恰好抵消，得到只依赖策略与参考模型对数概率的损失：</p>
  \[ \mathcal{L}_{\text{DPO}} = -\log \sigma\!\left( \beta \Big[ \log\frac{p_\theta(y_w|x)}{p_{\text{ref}}(y_w|x)} - \log\frac{p_\theta(y_l|x)}{p_{\text{ref}}(y_l|x)} \Big] \right) \]
  <p>
    也就是说：<strong>DPO 把「训练奖励模型 + PPO」压缩成了一次监督式分类</strong>。
    这正是它成为主流的原因——不需要在线采样，不需要奖励模型，训练像 SFT 一样稳定。
  </p>
</section>

<h4>4.1 三步推导：为什么奖励模型可以「约掉」</h4>
<p><strong>第一步</strong>：写出带 KL 约束的优化目标（既要奖励高，又不能偏离参考模型太远）：</p>
\[ \max_\theta\ \mathbb{E}_{y\sim p_\theta}\big[r(x,y)\big] - \beta\, D_{\mathrm{KL}}\big(p_\theta \,\|\, p_{\text{ref}}\big) \]
<p>
  这个目标有<strong>闭式最优解</strong>（这是变分法/玻尔兹曼分布的标准结论）：
  \(p^*(y|x) \propto p_{\text{ref}}(y|x)\,e^{r(x,y)/\beta}\)，写成带配分函数 \(Z(x)\) 的形式：
</p>
\[ p^*(y|x) = \frac{1}{Z(x)}\,p_{\text{ref}}(y|x)\,\exp\!\Big(\frac{r(x,y)}{\beta}\Big) \]
<p>
  <strong>第二步</strong>：把上式反解出奖励。这一步给出了一个非常有用的视角——
  奖励可以用「策略与参考模型的对数概率比」表示：
</p>
\[ r(x,y) = \beta\,\log\frac{p^*(y|x)}{p_{\text{ref}}(y|x)} + \beta\,\log Z(x) \]
<p>
  右边第二项 \(\beta\log Z(x)\) <strong>只依赖输入 \(x\)，不依赖回答 \(y\)</strong>。
  <strong>第三步</strong>：把它代进 Bradley–Terry 偏好模型
  \(P(y_w \succ y_l) = \sigma\big(r(x,y_w) - r(x,y_l)\big)\)——两个回答相减时，
  这个只含 \(x\) 的项<strong>精确抵消</strong>，于是得到只含策略与参考模型对数概率的损失（即上一节的 \(\mathcal{L}_{\text{DPO}}\)）。
</p>
<p>
  <strong>这就是「DPO 省掉了什么」的准确答案</strong>：它省掉的是<em>显式</em>奖励模型与在线采样，
  但代价是奖励被<em>隐式地</em>定义成
  \(\hat r(x,y) = \beta\log\frac{p_\theta(y|x)}{p_{\text{ref}}(y|x)} + \text{const}\)。
  训练日志里看到的 <code>rewards/chosen</code> 与 <code>rewards/rejected</code> 就是这两个量。
</p>
  </div>
</div>

<h4>4.2 \(\beta\) 在控制什么，以及 DPO 的固有限制</h4>
<ul>
  <li><strong>\(\beta\) 越小</strong>：允许策略偏离参考模型越远，优化更激进，容易过拟合偏好数据、损失多样性。</li>
  <li><strong>\(\beta\) 越大</strong>：更贴近参考模型，变化保守，可能学不动。</li>
  <li>常用起点 \(\beta = 0.1\)。判断是否过头的方法：看 chosen 与 rejected 的奖励差是否持续拉开，
      同时<strong>独立评估集</strong>的表现有没有变差——只看训练日志一定会「越来越好」。</li>
</ul>
<p><strong>DPO 的三个固有局限</strong>（面试常问）：</p>
<ol>
  <li><strong>只能用离线数据</strong>：它优化的是「这份数据里被选中的回答」，
      但真正想要的是「模型自己采样出来的回答里更好的那些」。数据分布与策略分布会逐渐错位。</li>
  <li><strong>没有探索</strong>：PPO/GRPO 会不断采样新回答并从奖励里学习，DPO 只是拟合固定的偏好对。</li>
  <li><strong>对数据质量极其敏感</strong>：偏好对里的标注噪声会被直接学成「这就是好的」。</li>
</ol>
<p>所以实践中的顺序通常是：<strong>先用 SFT 把行为对齐 → 有偏好对就用 DPO 微调 → 若答案可自动验证（数学、代码）则改用 GRPO。</strong></p>
<table class="tbl small">
  <thead><tr><th>方法</th><th>需要的数据</th><th>关键点</th><th>TRL 文档</th></tr></thead>
  <tbody>
    <tr><td><strong>DPO</strong></td><td>偏好对 (chosen, rejected)</td><td>简单稳定；\(\beta\) 控制偏离参考模型的程度（常 0.1）</td><td><a href="https://huggingface.co/docs/trl/dpo_trainer" target="_blank" rel="noopener">dpo_trainer</a></td></tr>
    <tr><td><strong>KTO</strong></td><td>只要「好/坏」二元标签，不必成对</td><td>数据收集成本最低；适合工业场景</td><td><a href="https://huggingface.co/docs/trl/kto_trainer" target="_blank" rel="noopener">kto_trainer</a></td></tr>
    <tr><td><strong>ORPO / CPO</strong></td><td>偏好对</td><td>把 SFT 与偏好优化合并为一次训练，省一个阶段</td><td>见 <a href="https://huggingface.co/docs/trl/paper_index" target="_blank" rel="noopener">paper_index</a></td></tr>
    <tr><td><strong>RLOO</strong></td><td>只有 prompt + 奖励函数</td><td>REINFORCE 留一基线，比 PPO 少一个 critic</td><td><a href="https://huggingface.co/docs/trl/rloo_trainer" target="_blank" rel="noopener">rloo_trainer</a></td></tr>
    <tr><td><strong>PPO</strong></td><td>奖励模型或规则奖励</td><td>最经典也最难调；需要 critic、价值裁剪、KL 惩罚</td><td><a href="https://huggingface.co/docs/trl/paper_index" target="_blank" rel="noopener">paper_index</a></td></tr>
    <tr><td><strong>GRPO</strong></td><td>只有 prompt + 奖励函数</td><td>组内相对优势替代 critic，适合可验证任务</td><td><a href="https://huggingface.co/docs/trl/grpo_trainer" target="_blank" rel="noopener">grpo_trainer</a></td></tr>
    <tr><td>奖励模型</td><td>偏好对</td><td>为 PPO/GRPO 提供打分器</td><td><a href="https://huggingface.co/docs/trl/reward_trainer" target="_blank" rel="noopener">reward_trainer</a></td></tr>
    <tr><td>蒸馏</td><td>教师模型的输出</td><td>把大模型能力搬进小模型</td><td><a href="https://huggingface.co/docs/trl/distillation_trainer" target="_blank" rel="noopener">distillation_trainer</a></td></tr>
  </tbody>
</table>

<h3>5. 草稿纸演算区：DPO 损失函数代数推导与单步手算</h3>

<div class="acc" data-t="选读·第二遍：DPO 损失的严格代数推导（消去配分函数 Z(x)）" data-badge="可选">
  <div class="acc-body">
<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：DPO 损失函数的严格代数推导（消去配分函数 Z(x)）</h4>
  <p>
    给 Charles 的推导路径：从强化学习带 KL 约束的奖励最大化目标出发，利用变分法得出最优策略闭式解；反解奖励函数并代入 Bradley–Terry 偏好模型，见证配分函数 \(Z(x)\) 的精确对消。
  </p>
  <p><strong>第 1 步：带 KL 正则项的强化学习优化目标</strong></p>
  <p>
    设环境提供标量奖励模型 \(r(x, y)\)。RLHF 的目标是找到策略 \(\pi\)，在最大化期望奖励的同时，约束策略不要偏离参考策略 \(\pi_{\text{ref}}\) 过远：
  </p>
  \[ \max_\pi \mathbb{E}_{x \sim \mathcal{D}} \left[ \mathbb{E}_{y \sim \pi(\cdot \mid x)} [r(x, y)] - \beta D_{\mathrm{KL}}(\pi(y \mid x) \parallel \pi_{\text{ref}}(y \mid x)) \right] \]
  <p>
    其中 KL 散度定义为 \(D_{\mathrm{KL}}(\pi \parallel \pi_{\text{ref}}) = \sum_y \pi(y \mid x) \log \frac{\pi(y \mid x)}{\pi_{\text{ref}}(y \mid x)}\)。
  </p>
  <p><strong>第 2 步：恒等变形为负 KL 散度并导出闭式最优解</strong></p>
  <p>
    将目标括号内的期望写为统一求和式（省略条件变量 \(x\) 的外层积分）：
  </p>
  \[ \sum_y \pi(y \mid x) r(x, y) - \beta \sum_y \pi(y \mid x) \log \frac{\pi(y \mid x)}{\pi_{\text{ref}}(y \mid x)} = - \beta \sum_y \pi(y \mid x) \left[ \log \frac{\pi(y \mid x)}{\pi_{\text{ref}}(y \mid x)} - \frac{r(x, y)}{\beta} \right] \]
  \[ = - \beta \sum_y \pi(y \mid x) \log \left( \frac{\pi(y \mid x)}{\pi_{\text{ref}}(y \mid x) \exp(r(x, y) / \beta)} \right) \]
  <p>
    定义归一化配分函数（Partition Function，亦称玻尔兹曼配分）：
  </p>
  \[ Z(x) \triangleq \sum_y \pi_{\text{ref}}(y \mid x) \exp\left( \frac{r(x, y)}{\beta} \right) \]
  <p>
    构造合法的理论最优概率分布 \(\pi^*(y \mid x) \triangleq \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp(r(x, y) / \beta)\)。
    将 \(\pi_{\text{ref}}(y \mid x) \exp(r(x, y) / \beta) = Z(x) \pi^*(y \mid x)\) 代回目标函数：
  </p>
  \[ - \beta \sum_y \pi(y \mid x) \log \left( \frac{\pi(y \mid x)}{Z(x) \pi^*(y \mid x)} \right) = - \beta \sum_y \pi(y \mid x) \left[ \log \frac{\pi(y \mid x)}{\pi^*(y \mid x)} - \log Z(x) \right] \]
  \[ = \beta \log Z(x) - \beta D_{\mathrm{KL}}(\pi(y \mid x) \parallel \pi^*(y \mid x)) \]
  <p>
    <strong>结论：</strong>由于 \(\beta \log Z(x)\) 完全不包含策略变量 \(\pi\)，且由 Gibbs 不等式，\(D_{\mathrm{KL}}(\pi \parallel \pi^*) \ge 0\) 恒成立，当且仅当 \(\pi = \pi^*\) 时取最小值 \(0\)。
    因此，目标的最优策略必然具有以下闭式解析解（Closed-form Solution）：
  </p>
  \[ \pi^*(y \mid x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp\left( \frac{r(x, y)}{\beta} \right) \]
  <p><strong>第 3 步：代数反解显式奖励函数</strong></p>
  <p>
    对最优策略方程两边取对数：
  </p>
  \[ \log \pi^*(y \mid x) = \log \pi_{\text{ref}}(y \mid x) + \frac{r(x, y)}{\beta} - \log Z(x) \]
  <p>
    移项得到关于 \(r(x, y)\) 的精确表达式：
  </p>
  \[ r(x, y) = \beta \log \frac{\pi^*(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x) \]
  <p>
    <strong>关键观察：</strong>第二项 \(\beta \log Z(x)\) 仅仅是关于输入 prompt \(x\) 的标量，完全与生成的候选回答序列 \(y\) 无关！
  </p>
  <p><strong>第 4 步：代入 Bradley–Terry 偏好模型，配分项精确对消</strong></p>
  <p>
    设偏好数据集包含三元组 \((x, y_w, y_l) \sim \mathcal{D}\)，其中 \(y_w \succ y_l\)（\(y_w\) 为获胜回答 chosen，\(y_l\) 为落败回答 rejected）。
    经典的 Bradley–Terry 排序模型定义获胜概率为两回答奖励差的 Sigmoid 函数：
  </p>
  \[ P(y_w \succ y_l \mid x) = \sigma\big(r(x, y_w) - r(x, y_l)\big) = \frac{1}{1 + \exp\big(-(r(x, y_w) - r(x, y_l))\big)} \]
  <p>
    将第 3 步反解出的奖励函数代入差值：
  </p>
  \[ r(x, y_w) - r(x, y_l) = \left( \beta \log \frac{\pi^*(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} + \beta \log Z(x) \right) - \left( \beta \log \frac{\pi^*(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} + \beta \log Z(x) \right) \]
  \[ = \beta \log \frac{\pi^*(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi^*(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \]
  <p>
    <strong>数学奇迹：</strong>两个极其难算的配分项 \(\beta \log Z(x)\) 严格相减对消为 0！
    由此，偏好概率被纯粹表达为策略与参考模型的相对概率比：
  </p>
  \[ P(y_w \succ y_l \mid x) = \sigma\left( \beta \left[ \log \frac{\pi^*(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \log \frac{\pi^*(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right] \right) \]
  <p><strong>第 5 步：构建负对数似然损失（DPO Loss）</strong></p>
  <p>
    用参数化的可微神经网络 \(\pi_\theta\) 替代理论最优策略 \(\pi^*\)，对数据集 \(\mathcal{D}\) 极大化观测偏好对的对数似然，取负号即得 DPO 损失函数：
  </p>
  \[ \mathcal{L}_{\text{DPO}}(\theta; \pi_{\text{ref}}) = - \mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}} \left[ \log \sigma\left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right] \]
  <p>
    至此，我们用纯粹的代数变换，<strong>彻底消除了独立的奖励模型 \(r(x, y)\) 和 PPO 的在线环境采样循环</strong>！
  </p>
</section>
  </div>
</div>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：极简小数字单步样本手算草稿</h4>
  <p>
    取极简小数字，在草稿纸上模拟单个 prompt 与一对回复 \((x, y_w, y_l)\) 的完整单步计算过程。
  </p>
  <p>
    <strong>设定参数与先验概率：</strong>
  </p>
  <ul>
    <li>温度系数：\(\beta = 0.5\)</li>
    <li>参考基座模型：\(\pi_{\text{ref}}(y_w \mid x) = 0.20, \quad \pi_{\text{ref}}(y_l \mid x) = 0.20\)（基座对两者概率持平）</li>
    <li>待微调策略模型（初期状态）：\(\pi_\theta(y_w \mid x) = 0.10, \quad \pi_\theta(y_l \mid x) = 0.40\)（模型当前被带偏，更倾向于输出错误回答）</li>
  </ul>
  <p><strong>草稿第 1 步：手算对数概率比（Log Ratios）</strong></p>
  <p>
    对获胜回答 \(y_w\)：
  </p>
  \[ \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} = \frac{0.10}{0.20} = 0.5 \implies \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} = \log(0.5) = -\log 2 \approx -0.6931 \]
  <p>
    对落败回答 \(y_l\)：
  </p>
  \[ \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} = \frac{0.40}{0.20} = 2.0 \implies \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} = \log(2.0) = +\log 2 \approx +0.6931 \]
  <p><strong>草稿第 2 步：计算隐式奖励差与 Logit 标量 \(u\)</strong></p>
  <p>
    对数概率比差值：
  </p>
  \[ \Delta \log \pi = (-\log 2) - (+\log 2) = -2\log 2 = -\log 4 \approx -1.3863 \]
  <p>
    乘上温度因子 \(\beta = 0.5\) 得到 Sigmoid 输入标量 \(u\)：
  </p>
  \[ u = \beta \cdot \Delta \log \pi = 0.5 \times (-\log 4) = -\log 2 \approx -0.6931 \]
  <p><strong>草稿第 3 步：计算 Sigmoid 预测概率与样本损失</strong></p>
  <p>
    将 \(u = -\log 2\) 代入 Sigmoid 函数：
  </p>
  \[ \sigma(u) = \sigma(-\log 2) = \frac{1}{1 + e^{-(-\log 2)}} = \frac{1}{1 + e^{\log 2}} = \frac{1}{1 + 2} = \frac{1}{3} \approx 0.3333 \]
  <p>
    由此计算当前样本的 DPO 标量损失值：
  </p>
  \[ \mathcal{L}_{\text{DPO}} = -\log \sigma(u) = -\log\left(\frac{1}{3}\right) = \log 3 \approx 1.0986 \]
  <p>
    <strong>一步看懂更新方向</strong>：在这个具体例子里 \(\sigma(u)=1/3<1/2\)，成对比较更偏向被拒绝的回答 \(y_l\)，当前样本损失是 \(\log 3 \approx 1.0986\)。注意：一般而言损失非零本身并不是“分类错了”的判据，这里能这样读只是因为本例数字让 \(\sigma(u)\) 落在了 \(1/2\) 以下。
    直觉上，接下来的一次更新会把 \(y_w\) 的概率推高、把 \(y_l\) 的压低；推力有多大、什么时候停，见下面的可选推导。
  </p>
<div class="acc" data-t="选读·第二遍：单步梯度的动力学（推力大小与什么时候停）" data-badge="可选">
  <div class="acc-body">
  <p><strong>草稿第 4 步：梯度动力学推导（模型如何被推向正确方向）</strong></p>
  <p>
    利用复合求导法则 \(\frac{d}{du}[-\log \sigma(u)] = -(1 - \sigma(u))\)，DPO 损失对策略参数 \(\theta\) 的梯度展开为：
  </p>
  \[ \nabla_\theta \mathcal{L}_{\text{DPO}} = - \beta \big(1 - \sigma(u)\big) \left[ \nabla_\theta \log \pi_\theta(y_w \mid x) - \nabla_\theta \log \pi_\theta(y_l \mid x) \right] \]
  <p>
    将本例数值代入动态缩放因子：
  </p>
  \[ 1 - \sigma(u) = 1 - \frac{1}{3} = \frac{2}{3} \implies \beta \big(1 - \sigma(u)\big) = 0.5 \times \frac{2}{3} = \frac{1}{3} \]
  <p>
    在梯度下降更新步 \(\theta \leftarrow \theta - \eta \nabla_\theta \mathcal{L}_{\text{DPO}}\) 中：
  </p>
  \[ -\nabla_\theta \mathcal{L}_{\text{DPO}} = +\frac{1}{3} \nabla_\theta \log \pi_\theta(y_w \mid x) - \frac{1}{3} \nabla_\theta \log \pi_\theta(y_l \mid x) \]
  <p>
    <strong>动力学直觉：</strong>参数更新以 \(+\frac{1}{3}\) 的梯度动力<strong>强力推高</strong>获胜回答 \(y_w\) 的生成对数概率，同时以 \(-\frac{1}{3}\) 的反向动力<strong>压低</strong>落败回答 \(y_l\) 的生成概率！
    一旦模型学好使得 \(u \gg 0\) 时，\(\sigma(u) \to 1\)，动态权重 \(1 - \sigma(u) \to 0\)，梯度推力平滑归零，杜绝过调。
  </p>
  </div>
</div>
</section>

<h3>6. 台阶四：GRPO 与「可验证奖励」</h3>
<p>
  当答案可以被程序检验时（数学题、代码、结构化输出），你不需要人类偏好，只需要一个<strong>验证器</strong>。
  GRPO 的做法是：对同一道题采样一组回答 \(\{y_1,\dots,y_G\}\)，用奖励 \(r_i\) 做组内标准化，得到优势估计
</p>
\[ \hat A_i = \frac{r_i - \mathrm{mean}(r)}{\mathrm{std}(r)} \]
<p>
  <strong>操作上就四步</strong>：(1) 对同一道题采样一组回答（比如 \(G = 4\) 个）；
  (2) 用验证器给每个回答打分（比如答对记 \(1\) 分、答错记 \(0\) 分）；
  (3) 在组内做标准化得到优势 \(\hat A_i\)——高于平均的为正、低于平均的为负；
  (4) 把为正的回答的概率推高、为负的压低，同时用裁剪与 KL 约束别让模型一步走太远（完整形式见下面的可选推导）。
</p>
<p>
  <strong>一组小数字</strong>：设 \(4\) 个回答的奖励是 \(r = [1, 1, 0, 0]\)，均值 \(0.5\)；此处教学约定取总体标准差（平方偏差除以 \(G=4\) 再开方），得 \(0.5\)，
  于是 \(\hat A = [+1, +1, -1, -1]\)——前两个回答会被推高，后两个被压低（这只是本讲的教学约定，不同程序库的默认标准差口径可能不同）。
  顺带一提：若一组回答得分全相等，方差为零，组内就没有偏好信号，实现上可直接把这组优势记为零或给分母加一个很小的稳定项。
  <strong>组内标准化取代了 critic</strong>——这就是它比 PPO 省一半显存的原因，也是「推理模型」训练的主力算法。
</p>
<div class="acc" data-t="选读·第二遍：GRPO 裁剪目标与 KL 项的完整形式" data-badge="可选">
  <div class="acc-body">
\[ \mathcal{L}_{\text{GRPO}} = -\mathbb{E}\Big[\min\big(\rho_i \hat A_i,\ \mathrm{clip}(\rho_i, 1-\epsilon, 1+\epsilon)\hat A_i\big)\Big] + \beta D_{\mathrm{KL}} \]
<p>
  其中 \(\rho_i = p_\theta(y_i)/p_{\theta_{\text{old}}}(y_i)\) 是重要性比。
  裁剪限制的是这个样本在替代目标里的记分方式：优势为正时，\(\rho_i\) 超过 \(1+\epsilon\) 之后继续增大不再增加裁剪后的目标值；优势为负时，\(\rho_i\) 跌破 \(1-\epsilon\) 之后继续减小同样不再增加目标值。它并不是给概率本身设硬上限，也不保证参数更新会在阈值处停住；
  \(\beta D_{\mathrm{KL}}\) 把新策略拴在参考模型附近。
</p>
  </div>
</div>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>奖励设计才是真正的难点</h4>
  <p>只要奖励可被优化，模型就会优化它——包括你没打算奖励的部分。常见的奖励黑客（reward hacking）：</p>
  <ul>
    <li><strong>长度偏置</strong>：如果奖励模型偏好长回答，输出会越来越长。缓解：长度归一化，或在奖励里显式惩罚冗长。</li>
    <li><strong>格式刷分</strong>：模型学会输出「<code>答案是</code>」这种模板但内容胡编。缓解：只对最终答案正确性给分。</li>
    <li><strong>模式坍缩</strong>：多样性消失，所有回答一个样。缓解：KL 惩罚、提高采样温度、保留 SFT 数据混合。</li>
    <li><strong>过优化</strong>：奖励升而真实质量降。缓解：<strong>永远保留一个独立的人类/规则评估集</strong>，在奖励线上升时同步检查它。</li>
  </ul>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：最小可用的 SFT + DPO 流水线（完整版见附录 B · E4、E5）</h4>
<p>
  在后训练（Post-Training）阶段，两大核心技术 LoRA 与 DPO 的计算内核可以通过微核心算子直接展现：
</p>

<p><strong>1. LoRA 低秩适配前向计算微核心：</strong></p>
<pre><code>h = x @ W_base + (x @ A @ B) * (lora_alpha / r)</code></pre>
<p>
  <strong>逐行代数解析</strong>：主干基座权重 \(W_{\text{base}}\) 完全冻结不更新；输入 \(x\) 经低秩矩阵 \(A \in \mathbb{R}^{d \times r}\) 降维后再经 \(B \in \mathbb{R}^{r \times d}\) 升维，乘以缩放常数 \(\alpha / r\) 并与主路相加，将训练可变参数量压缩 95% 以上。
</p>

<p><strong>2. DPO 直接偏好优化损失函数微核心：</strong></p>
<pre><code>loss = -F.logsigmoid(beta * (logits_w - logits_l)).mean()</code></pre>
<p>
  <strong>逐行代数解析</strong>：计算人类偏好的获胜回答（\(w\)）与失败回答（\(l\)）之间的隐式奖励对数几率差；经由超参数 \(\beta\) 调节后输入 Sigmoid 函数并求负对数似然，无需显式训练独立的奖励模型。
</p>
  <p><strong>要观察的指标</strong>：DPO 日志里的 <code>rewards/chosen</code> 与 <code>rewards/rejected</code> 的差（margin）应逐步拉开；
  若两者同时下降，说明你在把模型推离参考分布太远，需要减小学习率或增大 \(\beta\)。</p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>对齐阶段的四个陷阱</h4>
  <ol>
    <li><strong>没有基线</strong>：不做 SFT 就直接 DPO，模型会用一个「跑偏」的策略去比较好坏，结果不可控。</li>
    <li><strong>数据泄露</strong>：偏好数据里的 chosen 出现在测试集里，评估结果虚高。</li>
    <li><strong>只看向上指标</strong>：奖励上升但人工抽查变差，是最常见的失败。必须有独立评估集。</li>
    <li><strong>忘记 EOS / chat template 一致</strong>：模型在推理时不听或格式错乱，多半是模板不匹配。</li>
  </ol>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与未来这类项目的关系（学完就知道以后该怎么迁移）</h4>
  <p>
    Checkpoint 7 这类任务的「模型阶梯」与对齐阶段同构：
    <strong>Level 0 启发式 → Level 1 岭回归 → Level 2 核方法/随机森林 → Level 3 小 MLP</strong>，
    每一级都必须回答「比上一级好多少、是否统计显著、代价是什么」。
    假设以后数据只有几百条，默认答案是：<em>停留在 Level 1–2，并把 Level 3 的失败当作正式结论写进报告</em>。
    这正是 Hand (2006) 与 Sturm (2014) 的立场（见模块 09）。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">LoRA 中 \(r=16\)、\(\alpha=32\)，某权重 \(W_0 \in \mathbb{R}^{4096\times4096}\)。可训练参数量约为？</p>
  <ul class="opts">
    <li>约 1.6 M</li>
    <li data-ok>约 13 万（\(16\times(4096+4096)\)）</li>
    <li>约 16.8 M</li>
    <li>约 4096</li>
  </ul>
  <p class="why">
    \(r(d+k) = 16 \times 8192 = 131{,}072\)，相对原矩阵的 \(16.8\text{M}\) 参数约为 <strong>0.78%</strong>。
    注意 \(\alpha/r = 2\) 只是更新幅度的缩放，不改变参数量。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">DPO 相比 PPO 的核心优势是？</p>
  <ul class="opts">
    <li>DPO 训出的模型一定更好</li>
    <li data-ok>它把「训练奖励模型 + 在线强化学习」化为一次离线监督式优化，无需采样循环与 critic</li>
    <li>DPO 不需要参考模型</li>
    <li>DPO 不需要任何偏好数据</li>
  </ul>
  <p class="why">
    DPO 从 KL 正则化奖励最大化的闭式最优解出发，把奖励隐式地表达成策略与参考模型的对数概率比，
    从而消掉了显式奖励模型与在线采样。代价是它只能用<em>离线</em>数据，探索能力弱于在线 RL。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">用 GRPO 训练模型解数学题，奖励是「最终答案是否正确」。训练几轮后发现奖励上升但人工抽查变差。最可能的原因是？</p>
  <ul class="opts">
    <li>学习率太小</li>
    <li data-ok>奖励只覆盖答案，模型学会用格式或猜测蹭分，出现奖励黑客与过优化</li>
    <li>数据量太大</li>
    <li>模型参数太少</li>
  </ul>
  <p class="why">
    奖励是模型唯一的指南针。仅奖励最终答案会鼓励「凑答案」而非可靠推理。
    缓解手段：加入过程奖励或格式约束、在训练中周期性用独立评估集检查真实正确率、
    并监控回答长度与多样性的变化。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在 DPO 损失函数的数学推导中，为什么难以计算的全局配分函数 \(Z(x)\) 最终没有出现在损失函数中？</p>
  <ul class="opts">
    <li>因为在推导时假设了 \(Z(x) = 1\)</li>
    <li data-ok>反解显式奖励时 \(r(x, y) = \beta \log \frac{\pi^*(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)\)，代入 Bradley–Terry 模型时，两项的 \(\beta \log Z(x)\) 仅与 prompt \(x\) 有关而与 \(y\) 无关，在做差 \(r(x, y_w) - r(x, y_l)\) 时被精确对消</li>
    <li>因为配分函数被包含进了参考模型的交叉熵损失中</li>
    <li>因为使用蒙特卡洛采样近似计算了 \(Z(x)\)</li>
  </ul>
  <p class="why">
    推导的核心精髓就在于配分函数 \(Z(x) = \sum_y \pi_{\text{ref}}(y \mid x) \exp(r(x, y)/\beta)\) 只依赖于条件 \(x\)，完全与候选回答 \(y\) 无关。在计算胜出回答与落败回答的奖励差时，\(\beta \log Z(x) - \beta \log Z(x) \equiv 0\)，从而奇迹般避开了对整个词表生成空间的难解配分求和！
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">设超参数 \(\beta = 0.5\)，对某样本输入 \(x\)，参考模型给出 \(\pi_{\text{ref}}(y_w \mid x) = 0.2, \pi_{\text{ref}}(y_l \mid x) = 0.2\)；当前待优化策略模型给出 \(\pi_\theta(y_w \mid x) = 0.1, \pi_\theta(y_l \mid x) = 0.4\)。则此时该单步样本的 DPO 损失精确值等于？</p>
  <ul class="opts">
    <li>\(\log 2 \approx 0.6931\)</li>
    <li data-ok>\(\log 3 \approx 1.0986\)</li>
    <li>\(\log 4 \approx 1.3863\)</li>
    <li>\(0.5000\)</li>
  </ul>
  <p class="why">
    草稿纸手算步骤：比值 \(\pi_\theta(y_w)/\pi_{\text{ref}}(y_w) = 0.1/0.2 = 0.5\)，对数值为 \(-\log 2\)；比值 \(\pi_\theta(y_l)/\pi_{\text{ref}}(y_l) = 0.4/0.2 = 2.0\)，对数值为 \(+\log 2\)。差值为 \(-\log 2 - \log 2 = -\log 4\)。乘以 \(\beta = 0.5\) 得到 Sigmoid 输入 \(u = -\log 2\)。\(\sigma(-\log 2) = \frac{1}{1 + e^{\log 2}} = \frac{1}{1 + 2} = \frac{1}{3}\)。因此损失为 \(-\log(1/3) = \log 3 \approx 1.0986\)。
  </p>
</div>

<div class="acc" data-t="深入：RLHF 的完整三步，以及为什么它今天退居二线" data-badge="历史">
  <div class="acc-body">
    <ol>
      <li><strong>SFT</strong>：用人类示范做监督微调，得到一个基本可用的策略。</li>
      <li><strong>奖励模型</strong>：让人类对同一 prompt 的多个回答排序，用 Bradley–Terry 模型拟合一个打分器
          \(\mathcal{L}_{RM} = -\log\sigma\big(r(x,y_w) - r(x,y_l)\big)\)。</li>
      <li><strong>PPO</strong>：用奖励模型的分数做在线强化学习，同时用 KL 惩罚约束不要偏离 SFT 模型太远。</li>
    </ol>
    <p>为什么退居二线：需要维护四个模型（策略、参考、奖励、critic），显存与调参成本高，
    且奖励模型本身会被过优化。DPO 系列消除了第 2–3 步的在线循环，GRPO 系列消除了 critic，
    于是「对齐」这件事的门槛从「一个团队」降到「一个 notebook」。</p>
    <p><em>但对申请而言，理解 RLHF 的三步仍然重要——它是所有简化方法的出发点，面试官常问的就是「DPO 到底省掉了什么」。</em></p>
  </div>
</div>
`
});
