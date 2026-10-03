/* content/04-transformer.js — 模块 04：Transformer 前向与参数量 */
COURSE.register({
  id: "m4",
  part: 1,
  num: "04",
  title: "Transformer 的解剖学：参数、FLOPs 与显存都花在哪",
  en: "Transformer Anatomy — Parameters, FLOPs, Memory",
  minutes: 35,
  tags: ["核心", "数学", "必做"],
  body: String.raw`
<p class="lead">
  「7B 模型」里的 7B 到底数的是哪些张量？为什么同样 7B，有的能塞进 16 GB 显卡、有的不能？
  这一模块把整个前向拆成可手算的部件，让你在买卡、开 notebook、写实验计划之前就能估出预算。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你打算在 Colab 上用 LoRA 微调一个 7B 模型。第一个要回答的不是「学习率设多少」，
    而是：<strong>它占多少显存？</strong>权重、梯度、优化器状态、激活值分别是多少？
    如果答案是「不知道」，那么你只是在碰运气。
  </p>
</section>

<h3>1. 一个 block 的解剖</h3>
<div class="flow">
  <div class="nd">输入 x</div><div class="ar">→</div>
  <div class="nd">RMSNorm</div><div class="ar">→</div>
  <div class="nd hi">多头注意力</div><div class="ar">→</div>
  <div class="nd">＋ 残差</div><div class="ar">→</div>
  <div class="nd">RMSNorm</div><div class="ar">→</div>
  <div class="nd hi">SwiGLU MLP</div><div class="ar">→</div>
  <div class="nd">＋ 残差</div>
</div>
<p>
  这叫 <span class="t" data-tterm="Pre-norm" data-d="归一化放在子层之前，残差路径保持恒等，训练深层网络更稳定；现代 LLM 几乎都用 pre-norm。">pre-norm</span> 结构
  （2019 年后的标准做法）：归一化在子层输入处，残差是干净的恒等通路，所以深层网络的梯度可以直通底层。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>参数量公式（背下来）</h4>
  <p>设隐藏维度 \(d\)、层数 \(L\)、词表大小 \(|\mathcal{V}|\)、FFN 中间维度 \(d_{ff}\)。单层参数：</p>
  \[
  \underbrace{4d^2}_{\text{注意力}(W_Q,W_K,W_V,W_O)}
  \;+\;
  \underbrace{3\,d\,d_{ff}}_{\text{SwiGLU}(W_{\text{gate}},W_{\text{up}},W_{\text{down}})}
  \;\approx\; 12\,d^2 \quad (\text{取 } d_{ff} \approx \tfrac{8}{3}d)
  \]
  <p>整模型（词嵌入与输出层共享权重时）：</p>
  \[ N \;\approx\; 12\,L\,d^2 \;+\; |\mathcal{V}|\,d \]
  <p>若使用 GQA（\(h_{kv}\) 组 KV），注意力部分降为 \(2d^2 + 2d\,h_{kv}d_{\text{head}}\)，其余不变。</p>
</section>

<h3>2. 手算三个真实模型</h3>
<table class="tbl small">
  <thead><tr><th>模型</th><th>\(L\) / \(d\) / 头数</th><th>\(12Ld^2\)</th><th>词表项 \(|\mathcal{V}|d\)</th><th>合计</th></tr></thead>
  <tbody>
    <tr><td>GPT-2 small</td><td>12 / 768 / 12</td><td>\(12\cdot12\cdot768^2 \approx 8.5\times10^{7}\)</td><td>\(5.0\times10^{4}\cdot768 \approx 3.9\times10^{7}\)</td><td>≈ 124 M ✓</td></tr>
    <tr><td>Llama-3-8B</td><td>32 / 4096 / 32 (8 KV)</td><td>\(12\cdot32\cdot4096^2 \approx 6.4\times10^{9}\)</td><td>\(1.28\times10^{5}\cdot4096 \approx 5.2\times10^{8}\)</td><td>≈ 8.0 B ✓</td></tr>
    <tr><td>70B 级</td><td>80 / 8192 / 64 (8 KV)</td><td>\(12\cdot80\cdot8192^2 \approx 6.4\times10^{10}\)</td><td>\(1.28\times10^{5}\cdot8192 \approx 1.0\times10^{9}\)</td><td>≈ 65–70 B ✓</td></tr>
  </tbody>
</table>
<p>
  注意 <strong>\(N \propto L d^2\)</strong>：把 \(d\) 翻倍，参数变 4 倍；把 \(L\) 翻倍只变 2 倍。
  这解释了为什么「更宽」比「更深」贵得多，也解释了为什么深窄模型在同等参数量下往往训练更稳。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>算力与显存</h4>
  <p><strong>训练算力</strong>（每个 token）：前向约 \(2N\)，反向约 \(4N\)，合计 \(6N\)。</p>
  \[ C \approx 6\,N\,D \qquad (\text{FLOPs}) \]
  <p><strong>推理算力</strong>：每个生成 token 约 \(2N\)（再加上注意力随上下文的那一项）。</p>
  <p><strong>训练显存</strong>（AdamW + bf16 混合精度，单卡、无并行的下界）：</p>
  <table class="tbl small">
    <thead><tr><th>组成部分</th><th>每参数字节数</th><th>7B 模型</th><th>说明</th></tr></thead>
    <tbody>
      <tr><td>权重（bf16）</td><td>2</td><td>14 GB</td><td>前向用</td></tr>
      <tr><td>梯度（bf16）</td><td>2</td><td>14 GB</td><td>反向累积</td></tr>
      <tr><td>优化器状态（fp32 m, v + 主权重）</td><td>12</td><td>84 GB</td><td>AdamW 的 m、v 各 4 字节 + 4 字节 fp32 主权重</td></tr>
      <tr><td><strong>小计</strong></td><td>16</td><td><strong>112 GB</strong></td><td>还没算激活值</td></tr>
      <tr><td>激活值（含重计算）</td><td>—</td><td>数 GB – 数十 GB</td><td>随 \(B \cdot S \cdot L \cdot d\) 线性增长</td></tr>
    </tbody>
  </table>
  <p>
    这就是为什么 <strong>单卡 24 GB 微调 7B 全参数模型是不可能的</strong>，也是为什么
    <span class="t" data-tterm="LoRA" data-d="Low-Rank Adaptation：冻结原权重，只训练低秩增量矩阵，可训练参数通常降到 0.1%–2%。">LoRA</span>
    与 <span class="t" data-tterm="QLoRA" data-d="把基座模型 4-bit 量化后再加 LoRA，使 7B 模型能在 16 GB 显卡上微调。">QLoRA</span>
    存在：它们把「不可训练」的绝大多数参数的成本压到 4-bit 甚至更低。
  </p>
</section>

<h3>3. 现代变体清单（知道名字与动机即可）</h3>
<table class="tbl small">
  <thead><tr><th>部件</th><th>经典做法</th><th>现代做法</th><th>动机</th></tr></thead>
  <tbody>
    <tr><td>归一化</td><td>LayerNorm + bias</td><td>RMSNorm（无均值、无 bias）</td><td>更快、参数更少、稳定性相当</td></tr>
    <tr><td>激活</td><td>ReLU / GELU（2 个矩阵）</td><td>SwiGLU（3 个矩阵，门控）</td><td>同参数下质量更好</td></tr>
    <tr><td>位置</td><td>学习式绝对位置</td><td>RoPE</td><td>相对位置、可外推</td></tr>
    <tr><td>注意力</td><td>MHA</td><td>GQA / MLA</td><td>压缩 KV Cache，提高并发</td></tr>
    <tr><td>FFN</td><td>稠密</td><td>MoE（稀疏专家）</td><td>参数量大但每 token 只算一小部分</td></tr>
    <tr><td>注意力掩码</td><td>全因果</td><td>滑窗 / 混合（局部 + 全局）</td><td>长上下文线性化成本</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>MoE：参数量 ≠ 计算量</h4>
  <p>
    混合专家把 FFN 换成 \(E\) 个专家 + 一个路由器，每个 token 只激活 top-\(k\) 个（通常 \(k=1\) 或 \(2\)）。
    于是你可以拥有 671B 参数，但每个 token 只消耗约 37B 的计算量。
    <strong>它买到的是「容量」，付出的代价是显存</strong>（所有专家都要装进显存）与负载均衡的工程复杂度。
  </p>
  <p>
    这对预算决策非常关键：<em>如果是显存受限（单卡实验），MoE 帮不上忙；如果是算力受限（大规模训练），MoE 很划算。</em>
  </p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：验证参数量公式</h4>
<pre><code>import torch
from transformers import AutoConfig, AutoModelForCausalLM

cfg = AutoConfig.from_pretrained("meta-llama/Llama-3.2-1B")   <span class="cm"># 或任意开源小模型</span>
print(cfg.num_hidden_layers, cfg.hidden_size, cfg.num_attention_heads,
      cfg.num_key_value_heads, cfg.intermediate_size, cfg.vocab_size)

L, d, V, dff = cfg.num_hidden_layers, cfg.hidden_size, cfg.vocab_size, cfg.intermediate_size
attn = 4 * d * d
mlp  = 3 * d * dff          <span class="cm"># SwiGLU</span>
est  = L * (attn + mlp) + V * d
mdl  = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-1B")
real = sum(p.numel() for p in mdl.parameters())
print(f"手算 {est/1e9:.3f} B   实际 {real/1e9:.3f} B   误差 {abs(est-real)/real:.1%}")</code></pre>
  <p>
    误差通常在 3% 以内。剩下的差异来自：GQA 让 K/V 变小、是否共享词嵌入、以及归一化与 bias 项。
    <strong>能把这个误差解释清楚，就说明你真的理解了这张表。</strong>
  </p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧮</span>算一算：用下面的计算器估你的实验</h4>
  <div class="calc" data-calc="vram"></div>
  <p class="hint">
    这是<strong>数量级估算</strong>：把「参数规模」设为 7、批×序列设为 16000、层数 32、维度 4096，
    你会看到全参数训练的显存需求远超 Colab 免费额度——于是 LoRA/QLoRA 或更小的模型就成了唯一选项。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">一个 \(L=24\)、\(d=2048\)、词表 32000 的模型（共享词嵌入），参数量最接近？</p>
  <ul class="opts">
    <li>约 0.3 B</li>
    <li data-ok>约 1.3 B</li>
    <li>约 3.5 B</li>
    <li>约 12 B</li>
  </ul>
  <p class="why">
    \(12Ld^2 = 12 \times 24 \times 2048^2 = 1.21\times10^{9}\)，词表项 \(3.2\times10^{4}\times2048 = 0.066\times10^{9}\)，
    合计约 \(1.27\times10^{9}\) ≈ <strong>1.3 B</strong>。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么 SwiGLU 的参数量写成 \(3\,d\,d_{ff}\) 而不是 \(2\,d\,d_{ff}\)？</p>
  <ul class="opts">
    <li>因为它有两个隐藏层</li>
    <li data-ok>因为它有三个矩阵：gate、up、down；门控分支让同参数预算下的质量更好</li>
    <li>因为激活函数需要额外参数</li>
    <li>因为要处理 padding</li>
  </ul>
  <p class="why">
    \(\mathrm{SwiGLU}(x) = W_{\text{down}}\big(\mathrm{Swish}(W_{\text{gate}}x) \odot W_{\text{up}}x\big)\)。
    多出来的门控矩阵是「用参数换质量」的典型例子；实践中会把 \(d_{ff}\) 调小（约 \(8d/3\)）以保持总参数与经典 FFN 相当。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">某 MoE 模型总参数 671B、激活参数 37B。在单张 80 GB 显卡上做实验，最大的问题是？</p>
  <ul class="opts">
    <li>算力不够，前向会非常慢</li>
    <li data-ok>显存装不下全部专家权重，而 MoE 的省算力优势在单卡小批量下基本用不上</li>
    <li>无法使用 FlashAttention</li>
    <li>不能做 LoRA</li>
  </ul>
  <p class="why">
    MoE 用「每 token 只激活一部分专家」来省算力，但<em>所有</em>专家都必须驻留显存（或被换入换出）。
    单卡小规模实验里，反而是同激活参数量的稠密模型更好用。
  </p>
</div>

<div class="acc" data-t="深入：激活值为什么是显存杀手？" data-badge="工程">
  <div class="acc-body">
    <p>反向传播需要前向的中间结果。每个 block 里要保存的激活包括：归一化输出、Q/K/V、注意力输出、MLP 中间激活（\(d_{ff}\) 维，比 \(d\) 大）、以及各残差和。</p>
    <p>粗略量级：每个 token 每层需要保存约 \(10\)–\(20\) 个 \(d\) 维向量。于是</p>
    \[ \text{激活显存} \approx c \cdot B \cdot S \cdot L \cdot d \cdot \text{bytes}, \qquad c \approx 10\text{–}20 \]
    <p>
      代入 7B、\(B\cdot S = 16384\)、bf16：\(16 \times 16384 \times 32 \times 4096 \times 2 \approx 6.9\times10^{10}\) 字节 ≈ <strong>69 GB</strong>。
      这就是必须做
      <span class="t" data-tterm="Activation checkpointing" data-d="只保存部分激活，反向时重算其余部分；用约 30% 的额外算力换数倍显存节省。">激活重计算</span>的原因：
      不保存反向所需激活，反向时重新算一遍，通常能省 60%–80% 显存。
    </p>
    <p>相关技巧：梯度累积（用时间换批大小）、ZeRO/FSDP（把状态切到多卡，模块 06）、以及把序列长度当作第一优先级来压（它是线性因子）。</p>
  </div>
</div>
`
});
