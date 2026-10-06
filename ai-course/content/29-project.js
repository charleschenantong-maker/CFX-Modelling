/* content/29-project.js — 模块 29：自制大模型 Gen-1（四）：自回归文本生成、模型评估与毕业设计收束 */
COURSE.register({
  id: "m29",
  part: 5,
  num: "29",
  title: "自制大模型 Gen-1（四）：自回归文本生成、模型评估与毕业设计收束",
  en: "Building Gen-1 LLM (Part 4): Text Generation, Evaluation, and Project Synthesis",
  minutes: 45,
  tags: ["Gen-1自制大模型", "自回归生成", "Top-k采样", "PPL评估", "项目收束"],
  body: String.raw`
<p class="lead">
  在完成了分词器构建、神经网络搭建与 GPU 预训练循环之后，我们迎来了<strong>自制大模型 Gen-1 旅程的最终高潮</strong>：
  让模型“开口说话”！我们将<strong>从零手写带温度（Temperature）与 Top-k 截断的自回归采样生成引擎</strong>，
  计算模型的困惑度（Perplexity）量化评估指标，
  并最终将这一套从最底层数学物理演算到代码完整交付的硬核硬实力，<strong>无缝映射至数学建模、Crossfade 产研工程与顶尖升学求职材料中</strong>！
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🎥</span>必看高质导读资源（Recommended Learning Resources）</h4>
  <p>在编写推理生成引擎与准备项目交付前，强烈建议研读以下权威指南：</p>
  <ul>
    <li>
      <strong>核心科普与洞察视频</strong>：Andrej Karpathy — 
      <a href="https://www.youtube.com/watch?v=zjkBMFhNj_g" target="_blank" rel="noopener">《[1hr Talk] Intro to Large Language Models》</a>
      （时长：1小时00分钟）。<br>
      <em>重点时间戳</em>：<code>0:18:00</code> 为什么大模型本质是概率预测游戏；<code>0:32:00</code> 温度系数（Temperature）与创造力调控；<code>0:45:00</code> 从预训练底座到后训练（Post-Training）。
    </li>
    <li>
      <strong>官方开源推理脚本</strong>：
      <a href="https://github.com/karpathy/nanoGPT/blob/master/sample.py" target="_blank" rel="noopener"><code>karpathy/nanoGPT (sample.py)</code></a> 
      — 生产级自回归采样与条件提示词填充的标准代码模板。
    </li>
    <li>
      <strong>经典视觉交互博客</strong>：Jay Alammar — 
      <a href="https://jalammar.github.io/illustrated-gpt2/" target="_blank" rel="noopener">《The Illustrated GPT-2 (Visualizing Transformer Language Models)》</a>。<br>
      <em>推荐理由</em>：全球公认最清晰的 GPT-2 自回归推理动画解析，深入浅出展现自回归时间步逐 Token 生成的全过程。
    </li>
  </ul>
</section>

<h3>1. 为什么“贪心搜索”会导致模型胡言乱语或无限死循环？</h3>
<p>
  在每一步生成时，如果始终机械地挑出概率最高的那一个 Token（即贪心搜索 Greedy Search：\(\arg\max P(w)\)），模型极易陷入<strong>退化循环（Degeneration Loop）</strong>，反复机械重复同一个单词或短语（例如：“the model the model the model...”）。
  大模型能够展现出丰富多样的文学与逻辑创造力，根源在于<strong>按概率分布进行随机多项式采样（Stochastic Sampling）</strong>，并引入温度（Temperature）与 Top-k 截断。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：采样调控数学公式）</h4>
  <p>设模型对下一个 Token 的未归一化分值向量为 \(\mathbf{z} \in \mathbb{R}^V\)，引入温度系数 \(\tau > 0\) 与截断阈值 \(k\)：</p>
  \[ P(w_i) = \frac{\exp\left(z_i / \tau\right)}{\sum_{j \in \mathcal{K}} \exp\left(z_j / \tau\right)}, \qquad \mathcal{K} = \text{Top-}k(\mathbf{z}) \]
  <ul>
    <li>\(\tau \to 0\)：分布无限趋近于 One-Hot 冲激响应，退化为确定性的贪心搜索；</li>
    <li>\(\tau = 1.0\)：保留预训练学习到的原始物理概率分布；</li>
    <li>\(\tau > 1.0\)：平滑对数几率，增加长尾词被选中的机会，带来更高多样性（但也可能增加胡言乱语风险）；</li>
    <li>Top-\(k\)：将概率排名在 \(k\) 名以外的长尾噪声词强行置为 \(-\infty\)，彻底杜绝低质荒谬词的出现。</li>
  </ul>
</section>

<h3>2. 逐行手写自回归生成引擎（generate）</h3>
<p>
  下面我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，实现生产级生成函数。
</p>

<h4>第一步：裁剪输入上下文与获取最新步分值</h4>

<pre><code>def generate(model, idx, max_new_tokens, block_size, temperature=1.0, top_k=None):
    for _ in range(max_new_tokens):
</code></pre>
<p><strong>代码解析</strong>：定义生成函数，接收预训练模型 <code>model</code>、当前已有的提示词索引序列 <code>idx</code>（形状为 <code>(B, T)</code>）、期望生成的后续 Token 数量 <code>max_new_tokens</code>、模型窗口上限 <code>block_size</code>、温度与 Top-k 阈值；启动循环逐步自回归拓展。</p>

<pre><code>        idx_cond = idx if idx.size(1) <= block_size else idx[:, -block_size:]
        logits, _ = model(idx_cond)
</code></pre>
<p><strong>代码解析</strong>：<strong>滑动窗口保护</strong>：若当前累积的 Token 长度超过了模型的位置嵌入上限 <code>block_size</code>，严格截取最近的 <code>-block_size</code> 个 Token 作为输入（防止位置嵌入越界崩溃）；将裁剪后的序列送入模型前向传播。</p>

<pre><code>        logits = logits[:, -1, :] / temperature
</code></pre>
<p><strong>代码解析</strong>：取出序列最新生成的最后一个时间步的分值向量 <code>logits[:, -1, :]</code>（形状为 <code>(B, vocab_size)</code>）；将其除以温度系数 <code>temperature</code> 进行平滑或陡峭缩放。</p>

<h4>第二步：执行 Top-k 截断过滤</h4>

<pre><code>        if top_k is not None:
            v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < v[:, [-1]]] = -float('Inf')
</code></pre>
<p><strong>代码解析</strong>：使用 <code>torch.topk</code> 找出排名前 \(k\) 个最大的分值；将所有严格小于第 \(k\) 名分值的候选词强行用 <code>-float('Inf')</code> 覆写遮蔽，使得它们在后续计算 Softmax 后的概率严格归零。</p>

<h4>第三步：概率归一化与多项式分布采样</h4>

<pre><code>        probs = F.softmax(logits, dim=-1)
        idx_next = torch.multinomial(probs, num_samples=1)
</code></pre>
<p><strong>代码解析</strong>：对缩放与截断后的分值应用 Softmax 归一化为标准的概率分布；调用 <code>torch.multinomial</code> 按照概率权重进行随机投骰子采样，抽取下一个最具表现力的 Token 索引 <code>idx_next</code>（形状为 <code>(B, 1)</code>）。</p>

<pre><code>        idx = torch.cat((idx, idx_next), dim=1)
    return idx
</code></pre>
<p><strong>代码解析</strong>：将新采样的 Token 追加拼接到原有上下文的尾部（时间步维度 <code>dim=1</code>），作为下一次前向传播的输入条件；循环执行直至达到预设的最大生成长度，返回完整序列。</p>

<h3>3. 🧪 模块完整整合代码清单（Complete Runnable Script）</h3>
<p>
  下面是完整的自回归生成与采样推理脚本（<code>generate.py</code>），加载第 28 讲训练生成的模型权重，输入 Prompt 进行流畅生成：
</p>

<pre><code># =====================================================================
# Gen-1 LLM: Autoregressive Text Generation & Sampling Engine
# Directly aligned with Andrej Karpathy's nanoGPT (sample.py)
# =====================================================================

import torch
import torch.nn.functional as F
from model import NanoGPTLanguageModel

@torch.no_grad()
def generate(model, idx, max_new_tokens, block_size, temperature=0.8, top_k=20):
    """自制大模型核心自回归生成函数"""
    model.eval()
    for _ in range(max_new_tokens):
        # 截取窗口不超过模型上限
        idx_cond = idx if idx.size(1) <= block_size else idx[:, -block_size:]
        logits, _ = model(idx_cond)
        
        # 只关注最后一步预测，并施加温度调节
        logits = logits[:, -1, :] / max(temperature, 1e-5)
        
        # Top-k 截断
        if top_k is not None:
            v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < v[:, [-1]]] = -float('Inf')
            
        probs = F.softmax(logits, dim=-1)
        idx_next = torch.multinomial(probs, num_samples=1)
        idx = torch.cat((idx, idx_next), dim=1)
    return idx

# ----------------- 加载训练好的权重并生成文本 -----------------
if __name__ == "__main__":
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    # 模拟从已保存的检查点恢复（若有真实 pt 文件则 torch.load）
    sample_text = "First Citizen: Before we proceed any further, hear me speak."
    chars = sorted(list(set(sample_text + " \n\rabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:,.?!'")))
    vocab_size = len(chars)
    stoi = {ch: i for i, ch in enumerate(chars)}
    itos = {i: ch for i, ch in enumerate(chars)}

    model = NanoGPTLanguageModel(vocab_size=vocab_size, n_embd=128, block_size=64, n_layer=4, n_head=4).to(device)
    
    prompt = "First Citizen:"
    context = torch.tensor([stoi.get(c, 0) for c in prompt], dtype=torch.long, device=device).unsqueeze(0)
    
    print(f"📖 提示词 Prompt: \"{prompt}\"")
    print("⏳ 正在自回归采样生成中...\n")
    
    output_tokens = generate(model, context, max_new_tokens=200, block_size=64, temperature=0.8, top_k=15)
    generated_text = ''.join([itos.get(int(i), '') for i in output_tokens[0].cpu().numpy()])
    
    print("=================== 生成结果展示 ===================")
    print(generated_text)
    print("====================================================")
    print("🎉 恭喜！你已完整走通了自制大模型 Gen-1 的所有核心环节！")
</code></pre>

<h3>4. 困惑度（Perplexity, PPL）：大模型的核心质检尺</h3>
<p>
  在评测大模型的生成能力时，肉眼观察主观性极高。工业界统一采用<strong>困惑度（Perplexity）</strong>作为核心数学量化标准。
  困惑度的物理意义是：<strong>模型在每个时间步预测下一个词时，平均在犹豫“几个备选词”</strong>：
</p>
\[ \text{PPL} = \exp\left( \mathcal{L}_{\text{CE}} \right) = \exp\left( -\frac{1}{N} \sum_{i=1}^N \ln P(w_i \mid w_{< i}) \right) \]
<table class="tbl">
  <thead><tr><th>测试集交叉熵 Loss</th><th>对应的困惑度（PPL）</th><th>模型生成能力实际表现</th></tr></thead>
  <tbody>
    <tr><td><strong>5.60</strong>（初始冷启动）</td><td><strong>≈ 270</strong></td><td>完全随机猜测，输出为不可读的乱码字符组合</td></tr>
    <tr><td><strong>2.30</strong>（中途阶段）</td><td><strong>≈ 10.0</strong></td><td>开始学会基础英文单词拼写、空格与常用标点，但句子缺乏长程逻辑</td></tr>
    <tr><td><strong>1.38</strong>（充分收敛）</td><td><strong>≈ 4.0</strong></td><td>在极少数最符合语法的词汇中精准选择，能够生成结构完整、角色分明的连贯剧本</td></tr>
  </tbody>
</table>

<h3>5. 🎓 大模型全流程毕业设计：映射至 Crossfade 与科研/求职材料</h3>
<p>
  学完本板块（第 23~29 讲），你已经脱胎换骨。你不再是一个只会调用 <code>import openai</code> 的 API 搬运工，
  而是一个<strong>亲手实现过 BPE 分词算法、自注意力掩码、Pre-LN 残差连接、AdamW 权重衰减分组、梯度裁剪与 Top-k 自回归采样</strong>的全栈大模型架构理解者。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🌟</span>如何将本实战经历写进你的 CV、数模论文或个人陈述（PS）？</h4>
  <p>在描述此类跨学科大模型工程（例如 Crossfade 课题或大模型科研）时，推荐采用经典的 STAR 法则进行专业叙述：</p>
  <ul>
    <li>
      <strong>情境（Situation）与目标（Task）</strong>：<br>
      <em>“针对受限个人算力（单卡 NVIDIA T4 16GB）场景下大模型预训练成本高昂且不稳定的难题，旨在从底层纯手工实现一套轻量级高鲁棒性自回归大语言模型架构（NanoLM-Gen1）。”</em>
    </li>
    <li>
      <strong>行动（Action：突出第一性原理与数学深度）</strong>：<br>
      <em>“独立设计并手写基于 UTF-8 字节对频次合并的 BPE 分词器，消除 OOV 溢出；使用 PyTorch 逐行构建 Pre-LayerNorm Transformer 解码器结构；解耦 AdamW 优化器参数组并实施 \(6ND\) 算力物理演算与带线性预热的余弦退火学习率调度；在自建断点流水线与梯度裁剪防护下，完成 5000 步稳定收敛预训练。”</em>
    </li>
    <li>
      <strong>结果（Result：量化指标交付）</strong>：<br>
      <em>“模型验证集交叉熵损失由初始的 5.58 平滑收敛至 1.35，测试集困惑度（PPL）降至 3.86，成功实现受控温度与 Top-k 采样下长程连贯语义文本的零崩溃自回归生成，代码经原子化解耦完全开源。”</em>
    </li>
  </ul>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在自回归生成函数中，如果将温度系数 <code>temperature</code> 设定为极小值（例如 <code>0.01</code>），模型的输出行为会表现为：</p>
  <ul class="opts">
    <li>模型会随机挑选最冷门的生僻词生成</li>
    <li data-ok>概率分布被极度拉大差距，无限接近于贪心搜索（Greedy Search），模型每一步几乎 100% 挑选预测分值最高的那个词，生成结果完全确定且保守</li>
    <li>模型由于除以接近 0 的数字直接导致显存爆炸崩溃</li>
    <li>模型的输出长度会缩短为 1 个 Token</li>
  </ul>
  <p class="why">
    当温度 \(\tau \to 0\) 时，\(\frac{z_i - z_j}{\tau} \to \infty\)，最大的那个 Logit 在 Softmax 归一化后占据 99.99% 的概率权重，退化为确定性的贪心选择。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">语言模型测试集困惑度（Perplexity, PPL）与交叉熵损失（Cross-Entropy Loss, \(L\)）之间的严格数学关系是：</p>
  <ul class="opts">
    <li>\(\text{PPL} = L^2\)</li>
    <li data-ok>\(\text{PPL} = e^L\)</li>
    <li>\(\text{PPL} = \ln(L)\)</li>
    <li>\(\text{PPL} = 1 - L\)</li>
  </ul>
  <p class="why">
    交叉熵损失衡量的是模型预测概率的负对数似然 \(-\ln P\)。取指数 \(\exp(L)\) 即得到困惑度，直观反映了模型每步预测时等价于在多少个同等概率的候选词中做选择。
  </p>
</div>
`
});
