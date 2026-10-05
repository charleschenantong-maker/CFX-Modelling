/* content/95-appendix-f-cheatsheet.js — 附录 F：速查手册 */
COURSE.register({
  id: "appF",
  part: 9,
  num: "F",
  title: "附录 F · 速查手册（通读之后当工具书用）",
  en: "Appendix F — Reference Cheat Sheet",
  minutes: 15,
  tags: ["速查", "参考", "工具书"],
  body: String.raw`
<p class="lead">
  前面十几讲是<strong>用来读一遍的</strong>；这一页是<strong>用来反复查的</strong>。
  它把全课程最常被回查的东西压成七张表：公式、数字、超参、模型选型、额度窗口、命令、排错决策。
  你不需要背它——只需要记住「这里有一张表」。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>三种查法</h4>
  <ol>
    <li><strong>按关键词搜</strong>：顶部搜索框（快捷键 <code>/</code>）会搜标题、正文与公式，比翻页快。</li>
    <li><strong>按主题查</strong>：下面的表按「公式 / 数字 / 工具 / 决策」分区，先定位分区再看行。</li>
    <li><strong>按术语查</strong>：<a href="#appA">附录 A 术语表</a>有 240 条中英对照，分 14 类；每一讲顶部还有「本讲速查」可展开。</li>
  </ol>
</section>

<h3>1. 公式速查</h3>
<table class="tbl small">
  <thead><tr><th>公式</th><th>含义 / 什么时候用</th><th>出处</th><th>常见误用</th></tr></thead>
  <tbody>
    <tr><td>\(P(x_{1:T}) = \prod_t p_\theta(x_t \mid x_{&lt;t})\)</td><td>语言模型的链式分解，一切推理与训练的起点</td><td>01</td><td>以为模型一次直接输出整句</td></tr>
    <tr><td>\(\mathcal{L} = -\frac{1}{T}\sum_t \log p_\theta(x_t\mid x_{&lt;t})\)</td><td>交叉熵损失（= 平均负对数概率）</td><td>01</td><td>把 loss 与准确率混为一谈</td></tr>
    <tr><td>\(\text{PPL} = e^{\mathcal{L}}\)</td><td>困惑度；跨数据集<strong>不可直接比较</strong></td><td>01</td><td>用不同 tokenizer 的 PPL 比模型</td></tr>
    <tr><td>\(\text{softmax}(z)_i = e^{z_i}/\sum_j e^{z_j}\)</td><td>把 logits 变概率；温度即 \(z/T\)</td><td>01 / 08</td><td>忘了先减去最大值（数值溢出）</td></tr>
    <tr><td>\(\mathrm{Attn} = \mathrm{softmax}\!\big(\tfrac{QK^\top}{\sqrt{d_k}} + M\big)V\)</td><td>注意力；\(M\) 是因果掩码</td><td>03</td><td>漏掉 \(1/\sqrt{d_k}\) 导致 softmax 饱和</td></tr>
    <tr><td>\(\text{KV bytes} = 2\,L\,h_{kv}\,d_{\text{head}}\,T\,b\)</td><td>单条序列的 KV Cache 显存（\(b\) 为每元素字节）</td><td>03</td><td>忘了乘 2（K 与 V）或忘了乘并发数</td></tr>
    <tr><td>\(N \approx 12\,L\,d^2 + |\mathcal{V}|\,d\)</td><td>参数量手算（SwiGLU、共享词嵌入）</td><td>04</td><td>把 GQA 的 K/V 仍按 \(d^2\) 计</td></tr>
    <tr><td>\(M_{\text{train}} \approx 16N\) bytes + 激活</td><td>AdamW + bf16 全参数训练的显存下限</td><td>04</td><td>以为「7B 只要 14 GB」</td></tr>
    <tr><td>\(C \approx 6ND\)</td><td>训练总算力（FLOPs）</td><td>01 / 05</td><td>忘记反向是前向的两倍</td></tr>
    <tr><td>\(\text{GPU-hours} = \dfrac{C}{\text{peak}\times\text{MFU}\times3600}\)</td><td>预算换算；MFU 常用 35%–50%</td><td>05</td><td>用峰值算力直接除，忽略 MFU</td></tr>
    <tr><td>\(D_{\text{opt}} \approx 20N\)</td><td>Chinchilla 算力最优配比（不是质量最优）</td><td>05</td><td>以为所有模型都该守这个比例</td></tr>
    <tr><td>\(W = W_0 + \tfrac{\alpha}{r}BA\)</td><td>LoRA 低秩增量；\(B\) 初始化为 0</td><td>07</td><td>以为 \(\alpha/r\) 改变参数量</td></tr>
    <tr><td>\(\mathcal{L}_{\text{DPO}} = -\log\sigma\!\big(\beta[\log\tfrac{p_\theta(y_w)}{p_{\text{ref}}(y_w)} - \log\tfrac{p_\theta(y_l)}{p_{\text{ref}}(y_l)}]\big)\)</td><td>偏好优化（无需奖励模型）</td><td>07</td><td>跳过 SFT 直接 DPO</td></tr>
    <tr><td>\(\hat A_i = \dfrac{r_i - \mathrm{mean}(r)}{\mathrm{std}(r)}\)</td><td>GRPO 的组内相对优势（替代 critic）</td><td>07</td><td>组太小导致优势估计噪声大</td></tr>
    <tr><td>\(\hat w = (X^\top X + \lambda I)^{-1}X^\top y\)</td><td>岭回归闭式解；\(N\) 小时的首选模型</td><td>09</td><td>忘了在划分后拟合标准化</td></tr>
    <tr><td>\(\text{RMSE}_{\text{LOOCV}}^2 = \frac1N\sum_i\big(\tfrac{y_i-\hat y_i}{1-h_{ii}}\big)^2\)</td><td>留一交叉验证的 \(O(Nd^2)\) 捷径</td><td>09 / 16</td><td>真的跑 N 次重训</td></tr>
    <tr><td>\(R(f) \le R_{\text{emp}} + \sqrt{\tfrac{h(\ln(2N/h)+1)-\ln(\eta/4)}{N}}\)</td><td>VC 泛化界；\(N=250\) 时是空的</td><td>09</td><td>拿它当精确误差估计</td></tr>
    <tr><td>\(t_{\text{step}} \approx \dfrac{\text{model bytes}}{\text{memory bandwidth}}\)</td><td>解码速度上限（带宽受限）</td><td>03 / 08</td><td>以为提速要靠更多算力</td></tr>
    <tr><td>\(\mathrm{SE} = \sigma/\sqrt{N}\)</td><td>均值的不确定度；做实验前先算它，判断「多大的差别才测得出来」</td><td>09</td><td>拿小于 1 SE 的改进当结论</td></tr>
    <tr><td>\(\mathrm{df}(\lambda) = \sum_j \frac{\sigma_j^2}{\sigma_j^2+\lambda}\)</td><td>岭回归的有效自由度（\(\sigma_j\) 为 \(X\) 的奇异值）</td><td>09</td><td>以为「加了特征」就等于「增加了有效容量」</td></tr>
    <tr><td>\(\mathrm{RMSNorm}(x)=\frac{x}{\sqrt{\frac1d\sum x_i^2+\epsilon}}\odot g\)</td><td>Llama 系列归一化：不减均值、无 bias</td><td>04</td><td>与 LayerNorm 混写</td></tr>
    <tr><td>\(\mathrm{SwiGLU}(x)=W_{\text{down}}(\mathrm{SiLU}(W_{\text{gate}}x)\odot W_{\text{up}}x)\)</td><td>门控 FFN，3 个矩阵的来源</td><td>04</td><td>按 2 个矩阵算参数量</td></tr>
    <tr><td>\(\langle R_m q, R_n k\rangle = \langle q, R_{n-m}k\rangle\)</td><td>RoPE 只依赖相对位置</td><td>03</td><td>以为位置编码改变的是 token 向量本身</td></tr>
    <tr><td>\(\hat r(x,y)=\beta\log\frac{p_\theta(y|x)}{p_{\text{ref}}(y|x)}\)</td><td>DPO 的隐式奖励（日志里的 rewards/chosen）</td><td>07</td><td>以为 DPO 完全没有奖励概念</td></tr>
    <tr><td>\(s=\frac{w_{\max}-w_{\min}}{2^b-1}\)</td><td>分组仿射量化的步长；误差上界是 \(s/2\)</td><td>08</td><td>以为误差与位宽成线性关系</td></tr>
  </tbody>
</table>

<h3>2. 数字速查</h3>
<table class="tbl small">
  <thead><tr><th>要估的东西</th><th>口诀</th><th>例子</th></tr></thead>
  <tbody>
    <tr><td>权重显存</td><td>参数量 × 每参数字节</td><td>7B @ bf16 ≈ 14 GB；@ int4 ≈ 3.5 GB</td></tr>
    <tr><td>训练显存（单卡下限）</td><td>16 字节/参数 + 激活（AdamW + bf16）</td><td>7B ≈ 112 GB → 单卡不可能</td></tr>
    <tr><td>激活显存</td><td>\(c\cdot B S L d\)，\(c\approx10\text{–}20\)</td><td>7B、\(BS=16\text{k}\) ≈ 数十 GB</td></tr>
    <tr><td>参数量</td><td>\(12Ld^2\)</td><td>\(L=32,d=4096\) → 6.4B（+词表 ≈ 7B）</td></tr>
    <tr><td>训练算力</td><td>\(6ND\)</td><td>7B × 1T token ≈ \(4.2\times10^{22}\) FLOPs</td></tr>
    <tr><td>单卡时长</td><td>算力 ÷ (峰值 × MFU)</td><td>A100@40% → 约 11 年（1000 卡 ≈ 4 天）</td></tr>
    <tr><td>KV Cache</td><td>\(2Lh_{kv}d_{\text{head}}Tb\)</td><td>\(L{=}32,h_{kv}{=}8,d_{\text{head}}{=}128,T{=}8192\),fp16 ≈ 1 GB/条</td></tr>
    <tr><td>解码吞吐</td><td>批大小 ÷ 单步时间</td><td>批 1→32，吞吐近线性涨，单请求延迟不变</td></tr>
    <tr><td>推理算力</td><td>每 token ≈ \(2N\) FLOPs</td><td>用于估服务成本</td></tr>
    <tr><td>数据量经验值</td><td>微调：几百–几万条；预训练：token ≈ 20×参数量起</td><td>过训练是常态（Llama-3-8B ≈ 1875×）</td></tr>
  </tbody>
</table>

<h4>2.1 Llama-3-8B 逐项核对（已对照公开 config，可直接引用）</h4>
<table class="tbl small">
  <thead><tr><th>项目</th><th>数值</th><th>备注</th></tr></thead>
  <tbody>
    <tr><td>config</td><td>\(L=32,\ d=4096,\ h=32,\ h_{kv}=8,\ d_{ff}=14336,\ |\mathcal{V}|=128256,\ \text{rope\_theta}=5\times10^{5}\)</td><td>GQA；<code>tie_word_embeddings=false</code></td></tr>
    <tr><td>单层注意力（GQA）</td><td>41.9 M</td><td>\(4d^2\) 会高估到 67.1 M</td></tr>
    <tr><td>单层 SwiGLU</td><td>176.2 M</td><td>因 \(d_{ff}=14336 > 8d/3\)</td></tr>
    <tr><td>单层合计</td><td>218.1 M</td><td>×32 = 6.979 B</td></tr>
    <tr><td>词嵌入 + 输出头</td><td>0.525 B × 2</td><td>不共享，所以比规则多 0.525 B</td></tr>
    <tr><td><strong>总计</strong></td><td><strong>≈ 8.03 B</strong></td><td>规则式 \(12Ld^2+|\mathcal{V}|d\) 给 6.97 B，差 1.06 B</td></tr>
    <tr><td>KV Cache</td><td>4 KB/token/层；128 KB/token；8k 上下文 ≈ 1 GiB；批 16 ≈ 16 GiB</td><td>fp16</td></tr>
    <tr><td>训练显存下限</td><td>≈ 16 字节/参数 + 激活</td><td>bf16 权重/梯度 + fp32 优化器状态与主权重</td></tr>
    <tr><td>LoRA（r=16）</td><td>仅注意力 13.6 M（0.17%）；加 MLP 41.9 M（0.52%）</td><td>合并后推理零额外开销</td></tr>
  </tbody>
</table>

<h3>3. TRL 一页对照</h3>
<table class="tbl small">
  <thead><tr><th>阶段</th><th>Trainer</th><th>数据形态</th><th>什么时候用</th></tr></thead>
  <tbody>
    <tr><td>监督微调</td><td><code>SFTTrainer</code></td><td><code>messages</code>（只对 assistant 算损失）</td><td>格式对齐、风格、指令遵循</td></tr>
    <tr><td>偏好优化</td><td><code>DPOTrainer</code></td><td><code>prompt + chosen + rejected</code></td><td>有成对偏好，不想训奖励模型</td></tr>
    <tr><td>二元反馈</td><td><code>KTOTrainer</code></td><td>只要 good/bad 标签</td><td>标注成本最低</td></tr>
    <tr><td>奖励模型</td><td><code>RewardTrainer</code></td><td>偏好对</td><td>要给 PPO/GRPO 提供打分器</td></tr>
    <tr><td>在线 RL</td><td><code>GRPOTrainer</code> / <code>RLOOTrainer</code></td><td>只有 prompt + 奖励函数</td><td>答案可自动验证（数学、代码）</td></tr>
    <tr><td>经典 RLHF</td><td>PPO（见 paper_index）</td><td>奖励模型 + prompt</td><td>需要最细粒度的人类偏好</td></tr>
    <tr><td>蒸馏</td><td><code>GKDTrainer</code></td><td>教师输出</td><td>把大模型能力搬进小模型</td></tr>
    <tr><td>命令行</td><td><code>trl sft / dpo / grpo</code></td><td>YAML 配置</td><td>不想写 Python，直接跑脚本</td></tr>
  </tbody>
</table>
<p class="hint">文档入口：<a href="https://huggingface.co/docs/trl/sft_trainer" target="_blank" rel="noopener">sft</a>、
<a href="https://huggingface.co/docs/trl/dpo_trainer" target="_blank" rel="noopener">dpo</a>、
<a href="https://huggingface.co/docs/trl/grpo_trainer" target="_blank" rel="noopener">grpo</a>、
<a href="https://huggingface.co/docs/trl/dataset_formats" target="_blank" rel="noopener">数据集格式</a>。</p>

<h3>4. 超参起点（照着改，不要从零猜）</h3>
<table class="tbl small">
  <thead><tr><th>场景</th><th>学习率</th><th>轮数</th><th>批 / 累积</th><th>备注</th></tr></thead>
  <tbody>
    <tr><td>小模型预训练（教学）</td><td>3e-4，warmup 1%–2% + 余弦</td><td>1–3 epoch</td><td>可用梯度累积凑大全局批</td><td>bf16；梯度裁剪 1.0</td></tr>
    <tr><td>全参数 SFT</td><td>1e-5 ~ 2e-5</td><td>1–3</td><td>全局批尽量 ≥ 32</td><td>只对 assistant 算损失</td></tr>
    <tr><td>LoRA / QLoRA</td><td>1e-4 ~ 2e-4</td><td>1–3</td><td>微批 1–4 + 累积 8</td><td>r=8–32，\(\alpha\approx 2r\)，覆盖 q/k/v/o</td></tr>
    <tr><td>DPO</td><td>5e-7 ~ 5e-6</td><td>1–2</td><td>微批 1 + 累积 8</td><td>\(\beta=0.1\)；先 SFT 再 DPO</td></tr>
    <tr><td>GRPO</td><td>1e-6 量级</td><td>看奖励曲线</td><td>每题采样 4–16 个回答</td><td>必须留独立评估集防过优化</td></tr>
  </tbody>
</table>

<h3>5. 模型与工具选型决策树</h3>
<pre><code>任务是什么？
├─ 要「知识」并且更新频繁          → 检索（RAG）＋提示工程，不要微调
├─ 要「行为」（格式、风格、遵循）    → SFT（先 LoRA，不够再全参）
├─ 有「更好/更差」的成对数据        → DPO（省掉奖励模型）
├─ 答案能被程序验证（数学/代码）     → GRPO / RLVR
├─ 只要「跑通训练流程」            → 迷你模型（10M 级）+ TinyStories，T4 足够
└─ 要「本地长期跑」                → 4-bit 量化 + vLLM/llama.cpp

模型规模怎么选（按显存反推）
├─ 8 GB   → 推理 ≤3B(int4)；QLoRA ≤1.5B；从头训 ≤100M
├─ 16 GB  → 推理 ≤7B(int4)；QLoRA ≤7B(短序列)；从头训 ≤300M
├─ 24 GB  → 推理 ≤13B(int4)；QLoRA ≤13B；全参 ≤1B(含重计算)
└─ 80 GB  → LoRA ≤70B；全参 ≤7B(配合 FSDP 多卡)</code></pre>

<h3>6. 额度窗口速查（以官方页面为准）</h3>
<table class="tbl small">
  <thead><tr><th>订阅</th><th>窗口</th><th>计量</th><th>在哪看</th><th>关键操作</th></tr></thead>
  <tbody>
    <tr><td>Codex Plus $20</td><td>5 小时 + 每周（双重）</td><td>按模型的估算条数区间</td><td>设置 → 用量</td><td>难任务用 Astra(5–45)，杂活用 Luna(250–2000)</td></tr>
    <tr><td>Claude Pro $20</td><td>5 小时 + 每周</td><td>「用量」而非条数</td><td><code>/usage</code></td><td>周上限自 2026-09-14 起永久 +25%</td></tr>
    <tr><td>Google AI Pro</td><td>每月计算单元</td><td>Colab compute units</td><td>Colab 设置 → 订阅</td><td>余额耗尽会退回免费层策略</td></tr>
  </tbody>
</table>
<p class="hint">
  <strong>红线提醒</strong>：Colab 禁止「用多个账号规避资源限制」；个人订阅不得承载面向公众的流量。
  详见<a href="#m11">模块 11</a>与<a href="#appD">附录 D</a>。
</p>

<h3>7. 命令速查</h3>
<pre><code><span class="cm"># git（实验管理）</span>
git switch -c exp/lora-r16          <span class="cm"># 开一次实验分支</span>
git commit -am "exp: r=16, val 1.83"  <span class="cm"># 一次可复现的记录</span>
git tag v0.2-lora-r16                <span class="cm"># 里程碑</span>
git revert &lt;sha&gt;                     <span class="cm"># 15 秒回滚</span>
git worktree add ../wt-e7 -b e7/ladder  <span class="cm"># 并行实验隔离</span>

<span class="cm"># Hugging Face</span>
pip install -U transformers datasets trl peft accelerate bitsandbytes
huggingface-cli login
huggingface-cli upload &lt;repo&gt; ./out-sft/final .

<span class="cm"># Colab / 环境检查</span>
!nvidia-smi                          <span class="cm"># 拿到什么卡</span>
import jax; print(jax.devices())     <span class="cm"># TPU/多设备是否可用</span>
from google.colab import drive; drive.mount('/content/drive')  <span class="cm"># 检查点落盘</span>

<span class="cm"># 最小训练骨架（PyTorch）</span>
opt.zero_grad(); loss = model(x, labels=y).loss
loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); opt.step()</code></pre>

<h3>8. 排错决策表</h3>
<table class="tbl small">
  <thead><tr><th>症状</th><th>先查这三件事</th><th>再查</th><th>出处</th></tr></thead>
  <tbody>
    <tr><td>loss 不下降</td><td>标签是否错位一位；学习率是否过大/过小；数据是否真的被读到</td><td>把一条样本解码出来看；关掉 shuffle 用小数据过拟合测试</td><td>01 / 05</td></tr>
    <tr><td>loss 突然尖峰</td><td>回滚检查点；跳过该批数据；降学习率并加强裁剪</td><td>检查是否有异常长样本；换 bf16</td><td>05</td></tr>
    <tr><td>CUDA OOM</td><td>降批×序列；开激活重计算；开梯度累积</td><td>换 8-bit 优化器；上 LoRA/QLoRA；换更小模型</td><td>04 / 06</td></tr>
    <tr><td>微调后输出格式错乱</td><td>chat template 是否与训练一致；是否漏了 EOS</td><td>打印 <code>apply_chat_template</code> 的结果核对</td><td>02 / 07</td></tr>
    <tr><td>评估分数异常高</td><td>训练/测试是否按艺人分组；是否重复样本；是否特征穿越</td><td>跑置换检验；检查标准化是否在全量数据上拟合</td><td>09</td></tr>
    <tr><td>推理又慢又贵</td><td>上下文是否过长；是否命中前缀缓存；模型是否选太大</td><td>量化；连续批处理；按难度分级路由模型</td><td>08 / 11</td></tr>
    <tr><td>搜索/页面打不开</td><td>直接双击 <code>index.html</code>；确认 <code>assets/katex</code> 目录未被移动</td><td>用 <code>python -m http.server</code> 起本地服务</td><td>README</td></tr>
  </tbody>
</table>

<h3>9. 与 crossfade 项目对照速查</h3>
<table class="tbl small">
  <thead><tr><th>检查点</th><th>一句话任务</th><th>先看这些节</th></tr></thead>
  <tbody>
    <tr><td>CP1 问题 + 可听基线</td><td>定义「更好」，并尽早跑出能听的版本</td><td><a href="#mP">预备课</a>、<a href="#m1">01</a>、<a href="#m10">10</a></td></tr>
    <tr><td>CP2 可辩护模型</td><td>把增益包络写成变分/几何问题</td><td><a href="#m4">04</a>（自由度从哪来）</td></tr>
    <tr><td>CP3 竞争方法</td><td>三种结构不同的方法与各自的失效预测</td><td><a href="#m7">07</a>（模型阶梯思想）</td></tr>
    <tr><td>CP4 预测对音频</td><td>客观指标 + 听测对照</td><td><a href="#m9">09</a></td></tr>
    <tr><td>CP5 成对适配</td><td>特征提取（你的「tokenizer」）</td><td><a href="#m2">02</a></td></tr>
    <tr><td>CP6 证据与局限</td><td>分组 CV、效应量、盲测</td><td><a href="#m9">09</a></td></tr>
    <tr><td>CP7 学习实验</td><td>只学一个低维参数并严格比较</td><td><a href="#m9">09</a>、<a href="#m16">16</a>、<a href="#appB">附录 B · E7</a></td></tr>
    <tr><td>CP8 成品与辩护</td><td>一键复现 + 答辩稿</td><td><a href="#m14">14</a>、<a href="#m16">16</a></td></tr>
  </tbody>
</table>

<h3>10. 术语去哪里查</h3>
<table class="tbl small">
  <thead><tr><th>你想查的词属于</th><th>去附录 A 的第几类</th></tr></thead>
  <tbody>
    <tr><td>交叉熵、困惑度、温度、logits</td><td>1 概率与目标函数</td></tr>
    <tr><td>token、BPE、chat template、污染</td><td>2 Tokenizer 与数据</td></tr>
    <tr><td>注意力、KV cache、RoPE、MoE</td><td>3 架构与注意力</td></tr>
    <tr><td>AdamW、warmup、bf16、缩放律</td><td>4 预训练与优化</td></tr>
    <tr><td>FSDP、TP、PP、Mesh、SPMD</td><td>5 并行与系统</td></tr>
    <tr><td>SFT、LoRA、DPO、GRPO、RLVR</td><td>6 微调与对齐</td></tr>
    <tr><td>量化、vLLM、连续批处理、投机解码</td><td>7 推理与部署</td></tr>
    <tr><td>分组交叉验证、置换检验、VC 维</td><td>8 评估与科研方法</td></tr>
    <tr><td>计算单元、GPU 小时、MFU</td><td>9 算力与成本</td></tr>
    <tr><td>窗口、重置、沉没 token</td><td>10 订阅经济</td></tr>
    <tr><td>住宅 IP、Tailscale、账号亲和</td><td>11 网络与反封禁</td></tr>
    <tr><td>worktree、settle、85/15</td><td>12 工作流与智能体</td></tr>
    <tr><td>APFS、热降频、CI 卸载</td><td>13 硬件与操作系统</td></tr>
    <tr><td>ToS、许可、学术诚信</td><td>14 风险与合规</td></tr>
    <tr><td>蒸馏、RAG、智能体、意识、压缩、架构</td><td>15 高阶与前沿（对应 17–24 章）</td></tr>
  </tbody>
</table>

<h3>11. 高阶主题速查（17–24 章）</h3>
<table class="tbl small">
  <thead><tr><th>主题</th><th>关键式 / 关键量</th><th>一句话决策</th><th>章</th></tr></thead>
  <tbody>
    <tr>
      <td>蒸馏</td>
      <td>\( \mathcal{L} = \alpha\,\mathrm{CE}(y,p_S) + (1-\alpha)T^2 D_{\mathrm{KL}}(p_T^{(T)}\|p_S^{(T)}) \)</td>
      <td>要<strong>跨规模/跨架构</strong>搬能力才用它；只是想改行为就 SFT</td>
      <td>17</td>
    </tr>
    <tr>
      <td>推理模型</td>
      <td>\( \text{pass@}k = 1-(1-p)^k \)</td>
      <td>答案能被程序验证（数学/代码）才值得上 RL；否则先试采样投票</td>
      <td>18</td>
    </tr>
    <tr>
      <td>RAG</td>
      <td>召回@k、nDCG、忠实度</td>
      <td><strong>缺知识用检索，缺行为用微调</strong>；检索指标好 ≠ 回答好</td>
      <td>19</td>
    </tr>
    <tr>
      <td>智能体</td>
      <td>循环 = 模型 + 工具 + 记忆 + <strong>终止条件</strong></td>
      <td>有明确可自动判定的验收标准才自动化；否则人来收尾</td>
      <td>20</td>
    </tr>
    <tr>
      <td>安全与可解释</td>
      <td>系统提示不是安全边界；探针 ≠ 因果证据</td>
      <td>把「通过了评测」当作<em>一个</em>证据，而不是结论</td>
      <td>21</td>
    </tr>
    <tr>
      <td>机器意识</td>
      <td>取用意识 vs 现象意识；指标属性清单</td>
      <td><strong>自我报告不能当证据</strong>（先做提示扰动实验）</td>
      <td>22</td>
    </tr>
    <tr>
      <td>压缩与合并</td>
      <td>稀疏度、保留率、合并权重</td>
      <td>稀疏<strong>不必然</strong>加速；量化最省事、蒸馏最贵、合并最取巧</td>
      <td>23</td>
    </tr>
    <tr>
      <td>前沿架构</td>
      <td>\( h_t = A h_{t-1} + B x_t \)（SSM）；InfoNCE（多模态对齐）</td>
      <td>注意力不是唯一选择，但「更省」通常伴随「能力取舍」，必须实测</td>
      <td>24</td>
    </tr>
  </tbody>
</table>
<p class="hint">
  与之配套的术语（约 55 条）在<a href="#appA">附录 A 第 15 节</a>；
  这些主题的完整推导、动手实验与自测在各章正文里。
</p>

<div class="quiz">
  <div class="qlabel">自测 · 用这张表回答</div>
  <p class="q">你要在 16 GB 显存的 Colab 上微调一个 7B 模型，只想改一个文件里的配置。最该先查本页哪一区？</p>
  <ul class="opts">
    <li>公式速查</li>
    <li data-ok>超参起点 + 数字速查（确认 QLoRA 可行、批与序列要压小）</li>
    <li>术语表</li>
    <li>命令速查</li>
  </ul>
  <p class="why">
    这类决策由「显存 → 可行方案 → 超参起点」的顺序决定：先在第 2 区确认 16 GB 只能走 QLoRA 且序列要短，
    再到第 4 区取学习率与轮数起点，最后才写代码。
  </p>
</div>

<div class="acc" data-t="深入：怎么把这一页变成你自己的手册" data-badge="建议">
  <div class="acc-body">
    <ol>
      <li><strong>每做一次实验，就往「数字速查」里加一行你实测到的数字</strong>（例如「0.5B + LoRA r=16，T4 上 24 分钟，峰值 9.8 GB」）。
          三个月后，这一页会比任何教程都贴合你。</li>
      <li><strong>把踩过的坑写进「排错决策表」</strong>，注明症状 → 原因 → 修法。你的报错日志是最独特的知识资产。</li>
      <li><strong>用浏览器打印成 PDF</strong>（右上角「打印」按钮会自动展开折叠内容），放进手机随时查。</li>
      <li>如果需要分享，直接把这个 <code>ai-course</code> 文件夹压缩发给对方即可——它不依赖网络。</li>
    </ol>
  </div>
</div>
`
});
