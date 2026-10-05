/* content/17-distillation.js — 模块 17：蒸馏全谱系 */
COURSE.register({
  id: "m17",
  part: 6,
  num: "17",
  title: "蒸馏全谱系：把大模型的能力搬进小模型",
  en: "Distillation — From Logits to Reasoning",
  minutes: 40,
  tags: ["高阶", "训练", "实用"],
  body: String.raw`
<p class="lead">
  你已经会微调、会对齐、会量化。但还有一个更根本的问题：
  <strong>能不能让一个小模型学会大模型的行为？</strong>
  这一讲把「蒸馏」拆成四条可分别实现的路线，给出数学形式、手算例子、实用配方，
  以及一条很多人忽略的红线——<em>用谁的数据蒸馏，可能违反谁的服务条款</em>。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：课堂上老师不只告诉你「答案是 B」，还会说「A 是最接近的干扰项，C 完全无关」——
    后面这句话信息量很大。<strong>蒸馏就是让学生模型去学老师的那份「完整判断」，而不只是最终答案。</strong><br />
    <strong>这一讲要建立的直觉</strong>：蒸馏 = 用教师的输出当标签做监督学习 + 一点特殊的损失设计；
    它压的是<em>模型规模</em>，和量化（压精度）、剪枝（压结构）是三件不同的事。<br />
    <strong>读完你能回答</strong>：软标签为什么比硬标签信息更多？什么时候蒸馏会失败？为什么教师不是越大越好？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你训练（或微调）了一个不错的大模型，但部署环境只有 8 GB 显存，而且推理成本要压到 1/10。
    你有三条路：<strong>量化</strong>（把权重压成 4-bit）、<strong>剪枝</strong>（删掉一部分结构）、
    <strong>蒸馏</strong>（训练一个小模型去模仿大模型）。
  </p>
  <p>
    前两条在模块 08 和 23 讲；这一讲讲第三条。
    关键区别在于：<em>量化和剪枝不改模型「学到的东西」，蒸馏是在训练一个新模型</em>——
    所以它能跨越架构、跨越规模，甚至能跨越模态，但代价是你得重新训练一遍。
  </p>
</section>

<h3>1. 核心洞察：软标签携带「暗知识」</h3>
<p>
  假设有三个类别，地面真值是第 1 类。硬标签长这样：\([1, 0, 0]\)。
  但一个训练良好的教师模型给出的分布可能是 \( [0.82, 0.11, 0.07] \)——
  它在告诉你：<strong>第 2 类和第 3 类并不是同等无关，第 2 类更接近。</strong>
</p>
<p>Hinton 等人在 2015 年的《Distilling the Knowledge in a Neural Network》里把这件事称为「暗知识」：
  教师学到的类间相似性结构，在硬标签里完全丢失，但在概率分布里被保留下来。</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>温度与蒸馏损失</h4>
  <p>先用温度 \(T\) 把教师的分布「软化」（\(T>1\) 让分布更平坦，暗知识更容易被看到）：</p>
  \[ p_i^{(T)} = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)} \]
  <p>然后让学生同时学习教师的软分布与真实硬标签：</p>
  \[ \mathcal{L}_{\text{KD}} = \alpha\,\mathrm{CE}\big(y,\; p_S\big) \;+\; (1-\alpha)\, T^2\, D_{\mathrm{KL}}\big(p_T^{(T)} \,\|\, p_S^{(T)}\big) \]
  <p>
    三件事需要解释：<strong>(1)</strong> \(T^2\) 是梯度尺度补偿——温度缩放会让 softmax 的梯度按 \(1/T^2\) 缩小，
    乘回去才能让两项量级相当；<strong>(2)</strong> \(\alpha\) 在「学真值」与「学教师」之间权衡，
    常取 0.1–0.5；<strong>(3)</strong> 当 \(T=1\) 时它就退化成普通的分布匹配。
  </p>
</section>

<h4>1.1 手算：软标签到底多带了多少信息</h4>
<p>设教师对某个样本输出 logits \(z = [3.0,\ 1.0,\ 0.5]\)，看两种温度：</p>
<table class="tbl small">
  <thead><tr><th>温度</th><th>计算</th><th>得到的分布</th><th>对比硬标签</th></tr></thead>
  <tbody>
    <tr><td>\(T = 1\)</td><td>\(e^{3}, e^{1}, e^{0.5} = 20.09,\ 2.72,\ 1.65\)，和 24.45</td><td>[0.822, 0.111, 0.067]</td><td>已经比 [1,0,0] 多出「第 2 类比第 3 类更接近」</td></tr>
    <tr><td>\(T = 4\)</td><td>\(z/4 = [0.75, 0.25, 0.125]\)，\(e\) 后为 2.117, 1.284, 1.133，和 4.534</td><td>[0.467, 0.283, 0.250]</td><td>暗知识被放大：三类都拿到可观的概率质量</td></tr>
  </tbody>
</table>
<p>
  注意 \(T\) 不是越大越好：\(T \to \infty\) 时分布趋于均匀，学生只能学到「什么都不确定」。
  实践中 \(T = 2\text{–}10\)，需要在小验证集上试。
</p>

<h3>2. 语言模型上的四条路线</h3>
<table class="tbl">
  <thead><tr><th>路线</th><th>学生看到什么</th><th>需要白盒教师？</th><th>典型场景</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>响应蒸馏</strong><br />（sequence-level KD）</td>
      <td>只有教师的<em>输出文本</em></td>
      <td>不需要</td>
      <td>用商业 API 的输出做数据集；开源界最常见</td>
    </tr>
    <tr>
      <td><strong>词级 / logit 蒸馏</strong></td>
      <td>教师每个位置的完整分布（词表维度）</td>
      <td>需要（同 tokenizer 更省事）</td>
      <td>有教师权重时效果最好；<strong>但词表必须对齐</strong></td>
    </tr>
    <tr>
      <td><strong>特征 / 中间层蒸馏</strong></td>
      <td>教师隐藏状态或注意力矩阵</td>
      <td>需要</td>
      <td>同架构蒸馏（小 BERT ← 大 BERT 式）</td>
    </tr>
    <tr>
      <td><strong>在线 / 策略蒸馏</strong></td>
      <td>学生<em>自己生成</em>的回答 + 教师的即时纠正</td>
      <td>需要（或需要一个能打分的教师）</td>
      <td>解决「学生从没走过教师的路」的分布错配问题</td>
    </tr>
  </tbody>
</table>
<dl class="kv">
  <dt>响应蒸馏</dt><dd>本质上是「用教师生成的数据做 SFT」。它的上限受限于<em>数据质量与多样性</em>，而不是损失函数。</dd>
  <dt>词级蒸馏</dt><dd>信息量最大，但要求教师与学生共享词表。跨家族蒸馏通常要先对齐词表或退化为响应蒸馏。</dd>
  <dt>在线蒸馏</dt><dd>关键论文是 GKD（On-Policy Distillation of Language Models, ICLR 2024，arXiv:2306.13649）：
    让学生自己采样，再由教师对这些<em>学生自己的</em>输出打分纠正。它同时缓解了 exposure bias 与训练/推理分布不一致。</dd>
</dl>

<h3>3. 什么时候蒸馏有效，什么时候白费</h3>
<table class="tbl small">
  <thead><tr><th>因素</th><th>有利</th><th>不利</th></tr></thead>
  <tbody>
    <tr><td>容量差距</td><td>学生规模在教师的一个合理比例内</td><td>学生太小 → 「装不下」教师的行为，只能学个大概</td></tr>
    <tr><td>教师质量</td><td>教师在该任务上显著强于学生的可学上限</td><td>教师过强但风格差异大 → 学生学不到，或学到一堆无用的风格</td></tr>
    <tr><td>数据多样性</td><td>覆盖任务分布，含边缘情况</td><td>只用少数提示生成 → 学生只会回答那几种问法</td></tr>
    <tr><td>标签噪声</td><td>教师输出经过过滤与去重</td><td>教师答错的部分被当成正确答案学进去（错误放大）</td></tr>
    <tr><td>词表一致性</td><td>同家族（共享 tokenizer）</td><td>跨家族 → 词级蒸馏不可用，只能做响应蒸馏</td></tr>
  </tbody>
</table>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>三种常见失败</h4>
  <ol>
    <li><strong>模式坍缩</strong>：学生只模仿教师最擅长的那些问法，遇到新问法时输出变单调。
        对策：在数据里混入学生自己采样并被打分筛过的样本（在线蒸馏）。</li>
    <li><strong>长度漂移</strong>：教师爱写长回答，学生学会了「写得越长越好」。对策：长度归一化，或在损失里对长度做惩罚。</li>
    <li><strong>错误继承</strong>：教师在某类问题上系统性错误，学生会把它<em>学得更牢</em>（因为教师分布很自信）。
        对策：用规则验证器过滤，或在损失里对低置信度样本降权。</li>
  </ol>
</section>

<h3>4. 与量化、剪枝的分工</h3>
<table class="tbl small">
  <thead><tr><th>手段</th><th>压的是什么</th><th>要不要重训</th><th>主要代价</th></tr></thead>
  <tbody>
    <tr><td>量化（模块 08）</td><td>数值精度（每参数字节）</td><td>通常不用</td><td>精度损失，需要校准数据</td></tr>
    <tr><td>剪枝 / 稀疏（模块 23）</td><td>结构（参数个数、激活通道）</td><td>一般要微调恢复</td><td>通用硬件上未必真的加速</td></tr>
    <tr><td><strong>蒸馏（本讲）</strong></td><td>模型规模与架构</td><td><strong>要，且要重新训练</strong></td><td>工程成本高；需要数据生成预算</td></tr>
  </tbody>
</table>
<p>三者可以叠加：<strong>先用教师生成数据蒸馏出一个 1B 学生 → 再做 QLoRA 微调 → 最后 4-bit 量化部署</strong>。
这是目前把「大模型能力」放进消费级硬件最常见的三级流水线。</p>

<h3>5. 实用配方</h3>
<ol>
  <li><strong>先定目标</strong>：是要「同样能力更小体积」，还是「同一体积更强」？前者蒸馏，后者继续预训练或换更好的基座。</li>
  <li><strong>生成数据</strong>：教师对任务分布采样，规模从几千条起步；每条记录保留教师答案与（若可得）置信度。
      去重 + 规则过滤（格式、长度、明显错误）。</li>
  <li><strong>选损失</strong>：能拿到 logits 就做词级 KL（\(T=2\text{–}4\)，\(\alpha \approx 0.3\)）；
      拿不到就做响应蒸馏，此时你其实是在做 SFT，关键变成数据质量。</li>
  <li><strong>训练</strong>：同家族学生初始化最省；全参或 LoRA 都可；学习率比常规 SFT 略低（因为软标签信号更密）。</li>
  <li><strong>评估三件事</strong>：①与教师比 pass@1（差距有多大）；②与学生自己「只用硬标签 SFT」比（蒸馏是否真的加了价值）；
      ③成本曲线（每百万 token 的费用与延迟）。<em>第二项最容易被跳过，但它才是「蒸馏有没有用」的唯一证据。</em></li>
</ol>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>合规红线（做之前必读）</h4>
  <ul>
    <li><strong>用商业模型的输出训练自己的模型，可能违反其服务条款。</strong>
        主流厂商的条款通常禁止「用输出训练竞争模型」或「批量抓取用于蒸馏」，违反可能直接封号。</li>
    <li><strong>开源模型也要看许可证</strong>：有的是 Apache 2.0（宽松），有的是自带使用限制的社区许可（例如对月活规模或用途有条件）。
        蒸馏出的学生模型通常还要遵守教师的许可条款。</li>
    <li><strong>数据来源同样要干净</strong>：教师生成的文本若混入了受版权保护的原文，问题会转到你的学生模型上。</li>
    <li>详见<a href="#appD">附录 D</a>：我们把「可做 / 不可做 / 灰色地带」列成了表。</li>
  </ul>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：给一个 0.5B 教师做一次词级蒸馏</h4>
  <p>在免费 Colab（T4）上可跑。思路：学生也是 0.5B，但只训练 LoRA，让它在<em>教师自己的分布</em>上对齐——
  这样能在 30 分钟内看到 KL 损失下降、且能对比「只用硬标签」的差别。</p>
<pre><code>!pip -q install torch transformers peft datasets

import torch, torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model

name = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(name)

teacher = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto").eval()
student = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto")
student = get_peft_model(student, LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                          target_modules=["q_proj","k_proj","v_proj","o_proj"], task_type="CAUSAL_LM"))

opt = torch.optim.AdamW(student.parameters(), lr=1e-4)
prompts = ["Explain what a crossfade is in audio.", "Why does a linear fade dip in the middle?",
           "Summarise how attention works.", "What is a KV cache?"] * 32   <span class="cm"># 真实项目里请用几百条不同提示</span>

T, ALPHA = 3.0, 0.3          <span class="cm"># 温度与两项损失的权重</span>
for step, p in enumerate(prompts):
    batch = tok(p, return_tensors="pt").to(student.device)
    with torch.no_grad():
        t_logits = teacher(**batch).logits           <span class="cm"># 教师分布（冻结）</span>
    s_logits = student(**batch).logits
    <span class="cm"># 学生也要学真实的下一个 token（硬标签）</span>
    labels = batch.input_ids[:, 1:]
    ce = F.cross_entropy(s_logits[:, :-1].reshape(-1, s_logits.size(-1)), labels.reshape(-1))
    <span class="cm"># 软标签 KL：两边都做温度缩放，再乘 T^2 补偿梯度尺度</span>
    log_p_t = F.log_softmax(t_logits / T, dim=-1)
    log_p_s = F.log_softmax(s_logits / T, dim=-1)
    kl = F.kl_div(log_p_s, log_p_t, log_target=True, reduction="batchmean") * (T ** 2)
    loss = ALPHA * ce + (1 - ALPHA) * kl
    loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    if step % 16 == 0:
        print(f"step {step:3d}  ce={ce.item():.3f}  kl={kl.item():.3f}  loss={loss.item():.3f}")</code></pre>
  <p>
    <strong>要记录的三件事</strong>：①<code>kl</code> 是否单调下降（说明学生在逼近教师分布）；
    ②把 <code>ALPHA</code> 设为 1.0（纯硬标签）再跑一遍，对比同样的验证集表现——这就是「蒸馏到底加了多少价值」；
    ③同一个提示下教师与学生的输出差异（肉眼可辨的模板化程度）。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么用在真实项目里</h4>
  <ul>
    <li><strong>你的场景很可能不需要蒸馏。</strong>如果只是想让模型按固定格式输出音频分析结论，SFT + LoRA 就够了（模块 07）。</li>
    <li><strong>适合蒸馏的场景</strong>：你需要一个能在本地/端侧跑的小模型；或者你有一个很强但很贵的教师，想把它的<em>行为</em>固化下来。</li>
    <li><strong>把蒸馏当实验做</strong>：它天然带对照组（硬标签 SFT），非常适合写进研究报告——
        「同样的数据与算力，软标签相对硬标签把验证集指标提升了多少」是一个干净的结论。</li>
    <li><strong>别用它来做回归任务</strong>：你的 crossfade 任务是预测一个连续标量，
        教师的「软标签」概念不适用；那里更该关心的是特征质量与评估协议（模块 09）。</li>
  </ul>
</section>

<h3>6. 本讲术语</h3>
<ul>
  <li><span class="t" data-tterm="Knowledge distillation" data-d="让学生模型的输出分布去逼近教师模型，而不只学硬标签。">知识蒸馏</span>、
      <span class="t" data-tterm="Soft targets" data-d="教师模型给出的完整概率分布，包含类间相似性（暗知识）。">软标签</span>。</li>
  <li><span class="t" data-tterm="Sequence-level KD" data-d="只用教师的输出文本当训练数据，属于黑盒蒸馏。">序列级蒸馏</span>、
      <span class="t" data-tterm="On-policy distillation" data-d="让学生自己生成、教师来纠正，缓解训练与推理分布不一致。">在线蒸馏</span>。</li>
  <li><span class="t" data-tterm="Capacity gap" data-d="教师与学生容量差距过大时，学生无法有效模仿。">容量差距</span>、
      <span class="t" data-tterm="Mode collapse" data-d="学生只学会教师的一部分行为，输出多样性显著下降。">模式坍缩</span>。</li>
</ul>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">蒸馏损失里为什么要乘一个 \(T^2\)？</p>
  <ul class="opts">
    <li>为了放大损失，让训练更快</li>
    <li data-ok>因为温度缩放会把 softmax 的梯度按 \(1/T^2\) 缩小，乘回来才能让软标签项与硬标签项的量级相当</li>
    <li>为了让分布更均匀</li>
    <li>这是一个经验技巧，没有理论理由</li>
  </ul>
  <p class="why">
    求导可以验证：\(\partial p_i^{(T)}/\partial z_j\) 含有 \(1/T\) 因子，KL 项对 logits 的梯度整体按 \(1/T^2\) 缩放。
    不补偿的话，温度越高，软标签项在总梯度里的权重越小，\(\alpha\) 的语义就变了。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">你要把 A 家族的模型（词表 15 万）蒸馏到 B 家族的模型（词表 5 万）。最现实的做法是？</p>
  <ul class="opts">
    <li>直接把两个词表的 logits 对齐做 KL</li>
    <li data-ok>退化为响应蒸馏：用教师的输出文本做监督微调（词级 KL 要求词表一致）</li>
    <li>把学生词表改成教师的词表再训练</li>
    <li>不可能蒸馏，只能重新预训练</li>
  </ul>
  <p class="why">
    词级蒸馏要求每个位置的两个分布定义在同一词表上。跨家族时通常只有文本可用，于是问题回到「合成数据质量」，
    本质是 SFT。硬改学生词表会让它的 embedding 失效，等于放弃学生的预训练成果。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">下面哪一项是判断「蒸馏是否真的有用」最关键的对照实验？</p>
  <ul class="opts">
    <li>蒸馏前后学生的训练损失</li>
    <li>学生与教师的参数规模比</li>
    <li data-ok>同样数据与算力下，软标签训练 vs 纯硬标签训练，在同一验证集上的表现</li>
    <li>教师模型在公开榜单上的分数</li>
  </ul>
  <p class="why">
    没有这个对照，你无法区分「蒸馏有效」与「多训了一遍有效」。
    这也和模块 09 的模型阶梯思想一致：<strong>任何新方法都必须打败一个更简单的基线</strong>。
  </p>
</div>

<div class="acc" data-t="深入：正向 KL 与反向 KL 的差别（为什么有的蒸馏更「保守」）" data-badge="进阶">
  <div class="acc-body">
    <p>两种方向都会出现在蒸馏文献里，行为差别很大：</p>
    <table class="tbl small">
      <thead><tr><th>损失</th><th>别称</th><th>行为</th><th>适用</th></tr></thead>
      <tbody>
        <tr><td>\(D_{\mathrm{KL}}(p_T \| p_S)\)</td><td>正向 / 期望覆盖</td>
            <td>学生必须覆盖教师所有高概率区域 → 输出更「平均」、更平滑</td><td>经典 KD（Hinton 2015）</td></tr>
        <tr><td>\(D_{\mathrm{KL}}(p_S \| p_T)\)</td><td>反向 / 模式寻找</td>
            <td>学生倾向于抓住教师的少数高概率模式 → 更锐利，但可能丢掉多样性</td><td>生成式蒸馏（MiniLLM 一类工作）</td></tr>
      </tbody>
    </table>
    <p>
      直觉：正向 KL 对「教师有概率、学生给 0」罚得极重（\(p_T \log(p_T/p_S) \to \infty\)），
      所以学生不敢漏掉任何模式；反向 KL 对「学生有概率、教师给 0」罚得重，所以学生会收紧到教师的几个高峰上。
    </p>
    <p>
      还有一个常被忽略的用途：<strong>投机解码的草稿模型</strong>（模块 08）就常常是用目标模型蒸馏出来的——
      草稿模型必须与目标模型「风格接近」才能有高接受率，而蒸馏正是让两者分布对齐的手段。
    </p>
  </div>
</div>
`
});
