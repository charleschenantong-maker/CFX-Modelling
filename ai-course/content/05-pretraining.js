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

<h3>3. 学习率曲线：warmup + 余弦</h3>
\[
\eta(t) = \begin{cases}
\eta_{\max}\cdot \dfrac{t}{t_{\text{warm}}} & t < t_{\text{warm}} \\[6pt]
\eta_{\min} + \tfrac{1}{2}(\eta_{\max}-\eta_{\min})\left(1+\cos\left(\pi \dfrac{t-t_{\text{warm}}}{T-t_{\text{warm}}}\right)\right) & t \ge t_{\text{warm}}
\end{cases}
\]
<ul>
  <li><strong>为什么需要 warmup</strong>：训练初期梯度方向不可靠，自适应优化器的二阶动量估计也不准；直接用大学习率会发散。典型 warmup 占总步数的 0.5%–2%。</li>
  <li><strong>为什么用余弦</strong>：末期小步长让模型稳定收敛到更平坦的区域，下游微调更稳。</li>
  <li><strong>学习率与其他超参的关系</strong>：批量大小翻倍时，学习率通常按比例或按平方根缩放；峰值学习率随模型宽度大致按 \(1/\sqrt{d}\) 缩小。</li>
</ul>

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
  <h4><span class="ic">∑</span>参数量最优配比</h4>
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
  <h4><span class="ic">🧪</span>动手：在 Colab 上跑一次真实的预训练步骤</h4>
  <p>免费层跑不了 7B，但可以完整跑通「从零预训练一个 10M 参数模型」的全流程（附录 B · E3 有完整代码）：</p>
<pre><code>import torch, torch.nn.functional as F

<span class="cm"># 一个 4 层、256 维、4 头的迷你 Transformer（约 4M 参数）</span>
from transformers import GPT2Config, GPT2LMHeadModel
cfg = GPT2Config(vocab_size=50257, n_positions=256, n_embd=256,
                 n_layer=4, n_head=4)
model = GPT2LMHeadModel(cfg).cuda()
opt = torch.optim.AdamW(model.parameters(), lr=3e-4, betas=(0.9, 0.95), weight_decay=0.1)

<span class="cm"># 学习率 warmup + 余弦：这是与论文一致的最小实现</span>
def lr_at(step, total, peak=3e-4, warm=100, floor_ratio=0.1):
    import math
    if step &lt; warm: return peak * (step + 1) / warm
    p = (step - warm) / max(1, total - warm)
    return peak * (floor_ratio + (1 - floor_ratio) * 0.5 * (1 + math.cos(math.pi * p)))

for step, (x, y) in enumerate(loader):          <span class="cm"># x: (B, S) token id, y: 右移一位</span>
    for g in opt.param_groups: g["lr"] = lr_at(step, total_steps)
    logits = model(x).logits                    <span class="cm"># (B, S, V)</span>
    loss = F.cross_entropy(logits.view(-1, logits.size(-1)), y.view(-1))
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step(); opt.zero_grad(set_to_none=True)
    if step % 50 == 0: print(step, round(loss.item(), 3), f"ppl={loss.exp().item():.1f}")</code></pre>
  <p>
    <strong>必须记录的实验日志</strong>：全局步数、学习率、loss、梯度范数、tokens/s、显存峰值。
    把 loss 画出来，你会亲眼看到 warmup 段的下降、余弦末期的变缓，以及过拟合（验证 loss 回升）。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    你不做预训练，但<strong>「预训练 → 微调」这个两阶段范式会直接搬到你的项目里</strong>：
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
  <p class="q">训练中 loss 突然从 2.1 跳到 3.6，几步后仍不回落。最合理的处置是？</p>
  <ul class="opts">
    <li>等待，通常会自动恢复</li>
    <li>立刻把学习率提高 10 倍冲出局部极小</li>
    <li data-ok>回滚到 spike 之前的检查点，跳过该段数据并降低学习率、加强梯度裁剪</li>
    <li>重新初始化模型，从头训练</li>
  </ul>
  <p class="why">
    Loss spike 通常由某个异常批次（脏数据、极端长度）触发，参数已经走入坏区域。
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
