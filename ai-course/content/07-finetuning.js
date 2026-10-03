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
  这条路线上有四个台阶：监督微调、参数高效微调、偏好优化、可验证奖励的强化学习。
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

<h3>4. 台阶三：偏好优化（DPO / KTO / ORPO）</h3>
<p>数据形态是三元组 \((x, y_w, y_l)\)：同一个提问下，被选中的回答与被拒绝的回答。</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>DPO 为什么可以跳过奖励模型</h4>
  <p>RLHF 的目标是最大化奖励同时约束偏离参考模型：</p>
  \[ \max_\theta\ \mathbb{E}_{y\sim p_\theta}\big[r(x,y)\big] - \beta\, D_{\mathrm{KL}}\big(p_\theta \,\|\, p_{\text{ref}}\big) \]
  <p>这个问题的<strong>最优解有闭式形式</strong>：</p>
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

<h3>5. 台阶四：GRPO 与「可验证奖励」</h3>
<p>
  当答案可以被程序检验时（数学题、代码、结构化输出），你不需要人类偏好，只需要一个<strong>验证器</strong>。
  GRPO 的做法是：对同一道题采样一组回答 \(\{y_1,\dots,y_G\}\)，用奖励 \(r_i\) 做组内标准化，得到优势估计
</p>
\[ \hat A_i = \frac{r_i - \mathrm{mean}(r)}{\mathrm{std}(r)}, \qquad
\mathcal{L}_{\text{GRPO}} = -\mathbb{E}\Big[\min\big(\rho_i \hat A_i,\ \mathrm{clip}(\rho_i, 1-\epsilon, 1+\epsilon)\hat A_i\big)\Big] + \beta D_{\mathrm{KL}} \]
<p>
  其中 \(\rho_i = p_\theta(y_i)/p_{\theta_{\text{old}}}(y_i)\) 是重要性比。
  <strong>组内标准化取代了 critic</strong>——这就是它比 PPO 省一半显存的原因，也是「推理模型」训练的主力算法。
</p>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>奖励设计才是真正的难点</h4>
  <p>只要奖励可被优化，模型就会优化它——包括你没打算奖励的部分。常见的奖励黑客（reward hacking）：</p>
  <ul>
    <li><strong>长度偏置</strong>：如果奖励模型偏好长回答，输出会越来越长。缓解：长度归一化，或在奖励里显式惩罚冗长。</li>
    <li><strong>格式刷分</strong>：模型学会输出「<code>答案是</code>」这种模板但内容胡编。缓解：只对最终答案正确性给分。</li>
    <li><strong>模式坍缩</strong>：多样性消失，所有回答一个样。缓解：KL 惩罚、提高采样温度、保留 SFT 数据混合。</li>
    <li><strong>过优化</strong>：奖励升而真实质量降。缓解：<strong>永远保留一个独立的人类/规则评估集</strong>，在奖励曲线上升时同步检查它。</li>
  </ul>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：最小可用的 SFT + DPO 流水线（完整版见附录 B · E4、E5）</h4>
<pre><code>!pip -q install "trl" "peft" "datasets" "transformers" "accelerate"

from datasets import load_dataset
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig

ds = load_dataset("trl-lib/Capybara", split="train[:2000]")   <span class="cm"># 小样本先跑通</span>

peft_cfg = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                      target_modules=["q_proj","k_proj","v_proj","o_proj"],
                      task_type="CAUSAL_LM")

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=ds,
    peft_config=peft_cfg,
    args=SFTConfig(output_dir="out-sft", num_train_epochs=1,
                   learning_rate=2e-4, per_device_train_batch_size=2,
                   gradient_accumulation_steps=8, max_length=1024,
                   logging_steps=10, save_strategy="epoch",
                   bf16=True, report_to="none"),
)
trainer.train()
trainer.save_model("out-sft/final")

<span class="cm"># 记录三件事：可训练参数占比、显存峰值、验证损失是否在 1 个 epoch 后回升</span>
print(trainer.model.print_trainable_parameters())</code></pre>
<pre><code><span class="cm"># DPO 阶段：数据换成偏好对</span>
from trl import DPOTrainer, DPOConfig
prefs = load_dataset("trl-lib/ultrafeedback_binarized", split="train[:2000]")

dpo = DPOTrainer(
    model="out-sft/final", args=DPOConfig(output_dir="out-dpo",
        beta=0.1, learning_rate=5e-6, num_train_epochs=1,
        per_device_train_batch_size=1, gradient_accumulation_steps=8,
        max_length=1024, max_prompt_length=512, bf16=True, report_to="none"),
    train_dataset=prefs,
)
dpo.train()</code></pre>
  <p><strong>要观察的指标</strong>：DPO 日志里的 <code>rewards/chosen</code> 与 <code>rewards/rejected</code> 的差（margin）应逐步拉开；
  若两者同时下降，说明你在把模型推离参考分布太远，需要减小学习率或增大 \(\beta\)。</p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>对齐阶段的四个陷阱</h4>
  <ol>
    <li><strong>没有基线</strong>：不做 SFT 就直接 DPO，模型会用一个「跑偏」的策略去比较好坏，结果不可控。</li>
    <li><strong>数据泄漏</strong>：偏好数据里的 chosen 出现在测试集里，评估结果虚高。</li>
    <li><strong>只看向上指标</strong>：奖励上升但人工抽查变差，是最常见的失败。必须有独立评估集。</li>
    <li><strong>忘记 EOS / chat template 一致</strong>：模型在推理时不停或格式错乱，多半是模板不匹配。</li>
  </ol>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    Checkpoint 7 的「模型阶梯」与对齐阶段同构：
    <strong>Level 0 启发式 → Level 1 岭回归 → Level 2 核方法/随机森林 → Level 3 小 MLP</strong>，
    每一级都必须回答「比上一级好多少、是否统计显著、代价是什么」。
    你的数据只有几百条，所以你的默认答案是：<em>停留在 Level 1–2，并把 Level 3 的失败当作正式结论写进报告</em>。
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
