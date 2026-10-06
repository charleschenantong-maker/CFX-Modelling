/* content/27-hardware.js — 模块 27：自制大模型 Gen-1（二）：从零搭建 nanoGPT 核心模型架构 */
COURSE.register({
  id: "m27",
  part: 5,
  num: "27",
  title: "自制大模型 Gen-1（二）：从零搭建 nanoGPT 核心模型架构",
  en: "Building Gen-1 LLM (Part 2): Pure nanoGPT Model Architecture from Scratch",
  minutes: 45,
  tags: ["Gen-1自制大模型", "nanoGPT", "注意力机制", "Transformer", "从零手写"],
  body: String.raw`
<p class="lead">
  在掌握了分词器底层原理之后，我们正式进入<strong>【自制大模型 Gen-1】的核心引擎部分</strong>：
  使用纯 PyTorch 逐行手写一个经典的<strong>自回归 Transformer 解码器（Decoder-Only nanoGPT）</strong>。
  我们将抛开 Hugging Face 等高级封装黑盒，
  用最清晰直观的数学算子，实现因果自注意力掩码、多头注意力机制（Multi-Head Attention）、残差连接（Residual Connections）、层归一化（LayerNorm）与输出投影头。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🎥</span>必看高质导读资源（Recommended Learning Resources）</h4>
  <p>在编写本讲神经网络架构前，极力推荐反复研读以下世界级导师的公开杰作：</p>
  <ul>
    <li>
      <strong>核心精讲视频</strong>：Andrej Karpathy — 
      <a href="https://www.youtube.com/watch?v=kCc8FmEb1nY" target="_blank" rel="noopener">《Let's build GPT: from scratch, in code, spelled out.》</a>
      （时长：1小时56分钟）。<br>
      <em>重点时间戳</em>：<code>0:38:00</code> 注意力机制的核心数学技巧（加权平均）；<code>1:04:00</code> 单头因果注意力；<code>1:15:00</code> 多头注意力与并行；<code>1:24:00</code> 前馈网络与残差连接；<code>1:44:00</code> 完整组装 Transformer。
    </li>
    <li>
      <strong>官方开源代码库</strong>：
      <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noopener"><code>karpathy/nanoGPT</code></a> 
      — 世界上最精简、优雅的 GPT 训练与微调仓库（仅 2 个核心 Python 文件完成全部工作）。
    </li>
    <li>
      <strong>核心论文</strong>：Vaswani et al. (2017) — 
      <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">《Attention Is All You Need》</a> 
      与 Radford et al. (2019) — 
      <a href="https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf" target="_blank" rel="noopener">《Language Models are Unsupervised Multitask Learners》（GPT-2）</a>。<br>
      <em>推荐理由</em>：确立现代 Decoder-Only 架构的行业标准，现代所有大模型（GPT-4、LLaMA、DeepSeek）的祖师爷爷。
    </li>
  </ul>
</section>

<h3>1. nanoGPT 张量几何流向与物理架构</h3>
<p>
  一个自回归因果语言模型本质上是一个<strong>下一个 Token 分类器</strong>。其输入为批次形状为 <code>(B, T)</code> 的整数索引，经过多层堆叠后输出形状为 <code>(B, T, vocab_size)</code> 的非归一化对数几率（Logits）：
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：张量形状维度速查）</h4>
  <p>在接下来的手写算子中，我们严格遵守业界统一的标准张量维度符号：</p>
  \[ \mathbf{X} \in \mathbb{R}^{B \times T \times C} \]
  <ul>
    <li>\(B\)（Batch Size）：批次大小，即一次并行计算的独立句子数量；</li>
    <li>\(T\)（Block Size / Sequence Length）：序列长度，模型单次能观察的上下文时间步窗口；</li>
    <li>\(C\)（Embedding Dimension / \(n_{\text{embd}}\)）：隐层特征通道维度（如 64、128 或 768）；</li>
    <li>\(H\)（Num Heads）：多头注意力的并行头数；每个头的维度为 \(d_{\text{head}} = C / H\)。</li>
  </ul>
</section>

<h3>2. 逐行手写 nanoGPT 核心算子</h3>
<p>
  下面我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，纯手工实现各层子模块。
</p>

<h4>第一步：因果单头注意力（Causal Self-Attention Head）</h4>

<pre><code>class Head(nn.Module):
    def __init__(self, head_size, n_embd, block_size, dropout=0.1):
        super().__init__()
</code></pre>
<p><strong>代码解析</strong>：继承 <code>nn.Module</code> 创建单注意力头类。传入单个头的特征维度 <code>head_size</code>、输入特征维度 <code>n_embd</code>、最大时间步长度 <code>block_size</code> 与 Dropout 丢弃率。</p>

<pre><code>        self.key = nn.Linear(n_embd, head_size, bias=False)
        self.query = nn.Linear(n_embd, head_size, bias=False)
        self.value = nn.Linear(n_embd, head_size, bias=False)
</code></pre>
<p><strong>代码解析</strong>：定义查询（Query）、键（Key）与值（Value）三个线性投影矩阵，不使用偏置项（bias=False），将输入向量映射到该注意头所在的子空间。</p>

<pre><code>        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))
        self.dropout = nn.Dropout(dropout)
</code></pre>
<p><strong>代码解析</strong>：注册一个下三角全 1 掩码矩阵 <code>tril</code> 为 Buffer（不参与反向传播梯度更新，但随模型保存）；初始化 Dropout 层用于注意力权重随机失活以防过拟合。</p>

<pre><code>    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)   # (B, T, head_size)
        q = self.query(x) # (B, T, head_size)
</code></pre>
<p><strong>代码解析</strong>：前向传播获取输入张量的批次大小 \(B\)、当前时间步长 \(T\) 与特征维度 \(C\)；分别计算每个位置的 Key 和 Query 向量。</p>

<pre><code>        wei = q @ k.transpose(-2, -1) * (k.shape[-1] ** -0.5)
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
</code></pre>
<p><strong>代码解析</strong>：计算注意力亲和度矩阵 \(Q K^T / \sqrt{d_k}\)；利用 <code>masked_fill</code> 将未来的时间步（掩码为 0 的右上三角区域）全部填充为负无穷大（\(-\infty\)），<strong>这是自回归模型不能“偷看未来”的核心物理保证</strong>！</p>

<pre><code>        wei = F.softmax(wei, dim=-1)
        wei = self.dropout(wei)
        v = self.value(x)
        return wei @ v
</code></pre>
<p><strong>代码解析</strong>：对最后一维做 Softmax 归一化为注意力概率分布（\(-\infty\) 变为 0）；乘以 Value 向量矩阵完成上下文特征加权聚合，输出形状为 <code>(B, T, head_size)</code>。</p>

<h4>第二步：多头注意力（Multi-Head Attention）</h4>

<pre><code>class MultiHeadAttention(nn.Module):
    def __init__(self, num_heads, head_size, n_embd, block_size, dropout=0.1):
        super().__init__()
        self.heads = nn.ModuleList([Head(head_size, n_embd, block_size, dropout) for _ in range(num_heads)])
</code></pre>
<p><strong>代码解析</strong>：初始化多头注意力容器，创建 <code>num_heads</code> 个并行的 <code>Head</code> 实例，让网络能在不同表示子空间中同时捕捉语法、语义等多元依赖关系。</p>

<pre><code>        self.proj = nn.Linear(head_size * num_heads, n_embd)
        self.dropout = nn.Dropout(dropout)
</code></pre>
<p><strong>代码解析</strong>：定义一个输出线性投影层 <code>proj</code>，将所有头拼接起来的特征向量统一投影回模型的隐层主通道维度 <code>n_embd</code>。</p>

<pre><code>    def forward(self, x):
        out = torch.cat([h(x) for h in self.heads], dim=-1)
        out = self.dropout(self.proj(out))
        return out
</code></pre>
<p><strong>代码解析</strong>：遍历执行每一个注意力头，在特征维度（<code>dim=-1</code>）上将多头输出拼接（Concatenate），经由线性投影与 Dropout 后输出。</p>

<h4>第三步：前馈感知网络（FeedForward / MLP）</h4>

<pre><code>class FeedForward(nn.Module):
    def __init__(self, n_embd, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_embd, 4 * n_embd),
            nn.GELU(),
            nn.Linear(4 * n_embd, n_embd),
            nn.Dropout(dropout)
        )
</code></pre>
<p><strong>代码解析</strong>：按照 GPT-2 标准结构，将隐层特征升维 4 倍（\(4 \times n_{\text{embd}}\)），经过平滑非线性的高斯误差线性单元 <code>nn.GELU()</code> 激活函数，再降维投影回 \(n_{\text{embd}}\)，赋予网络强大的逐 Token 记忆与特征变换能力。</p>

<pre><code>    def forward(self, x):
        return self.net(x)
</code></pre>
<p><strong>代码解析</strong>：前向执行两层 MLP 变换，输入输出张量形状保持 <code>(B, T, C)</code> 完全不变。</p>

<h4>第四步：Transformer 残差块（Block 与 Pre-LayerNorm）</h4>

<pre><code>class Block(nn.Module):
    def __init__(self, n_embd, n_head, block_size, dropout=0.1):
        super().__init__()
        head_size = n_embd // n_head
        self.sa = MultiHeadAttention(n_head, head_size, n_embd, block_size, dropout)
        self.ffwd = FeedForward(n_embd, dropout)
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)
</code></pre>
<p><strong>代码解析</strong>：定义单个 Transformer 块。包含一个多头自注意力模块 <code>self.sa</code>、一个前馈网络 <code>self.ffwd</code> 以及两个层归一化模块 <code>self.ln1</code> 和 <code>self.ln2</code>。</p>

<pre><code>    def forward(self, x):
        x = x + self.sa(self.ln1(x))
        x = x + self.ffwd(self.ln2(x))
        return x
</code></pre>
<p><strong>代码解析</strong>：采用现代大模型普遍遵循的 <strong>Pre-LayerNorm</strong> 残差结构：在进入注意力与 MLP 之前先做归一化，输出再通过加法残差跳接（Residual Skip Connection）相加，<strong>确保极深网络的梯度能够无衰减地直通底层</strong>。</p>

<h4>第五步：组装顶层自回归大语言模型（NanoGPTLanguageModel）</h4>

<pre><code>class NanoGPTLanguageModel(nn.Module):
    def __init__(self, vocab_size, n_embd=128, block_size=64, n_layer=4, n_head=4, dropout=0.1):
        super().__init__()
        self.block_size = block_size
        self.token_embedding_table = nn.Embedding(vocab_size, n_embd)
        self.position_embedding_table = nn.Embedding(block_size, n_embd)
</code></pre>
<p><strong>代码解析</strong>：定义大模型类。初始化词嵌入表 <code>token_embedding_table</code>（将离散词表索引转为向量）与位置嵌入表 <code>position_embedding_table</code>（为序列每个时间步赋予空间绝对位置感知）。</p>

<pre><code>        self.blocks = nn.Sequential(*[Block(n_embd, n_head, block_size, dropout) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size)
</code></pre>
<p><strong>代码解析</strong>：使用 <code>nn.Sequential</code> 堆叠 <code>n_layer</code> 层 Transformer 块；经过最终层归一化 <code>ln_f</code> 后，由无偏置的线性分类头 <code>lm_head</code> 将向量映射回词表大小 <code>vocab_size</code>。</p>

<pre><code>    def forward(self, idx, targets=None):
        B, T = idx.shape
        tok_emb = self.token_embedding_table(idx) # (B, T, C)
        pos_emb = self.position_embedding_table(torch.arange(T, device=idx.device)) # (T, C)
        x = tok_emb + pos_emb
</code></pre>
<p><strong>代码解析</strong>：前向计算时，将词嵌入与位置嵌入直接逐元素相加（Broadcasting），融合语义与序列时间顺序信息。</p>

<pre><code>        x = self.blocks(x)
        x = self.ln_f(x)
        logits = self.lm_head(x) # (B, T, vocab_size)
</code></pre>
<p><strong>代码解析</strong>：将融合后的张量输入深层 Transformer 块进行多轮因果自注意力与 MLP 变换，最终投影为词表中各字符的预测分值（Logits）。</p>

<pre><code>        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits_flat = logits.view(B * T, C)
            targets_flat = targets.view(B * T)
            loss = F.cross_entropy(logits_flat, targets_flat)
        return logits, loss
</code></pre>
<p><strong>代码解析</strong>：若提供了监督目标 <code>targets</code>（自回归下一个 Token 真实标签），将预测与标签展平为二维矩阵，计算标准的交叉熵损失（Cross Entropy Loss）；若推理生成阶段无 targets 则返回 None。</p>

<h3>3. 🧪 模块完整整合代码清单（Complete Runnable Script）</h3>
<p>
  下面是上述所有算子组件的<strong>完整无删减整合版代码（model.py）</strong>，可直接独立运行并自动打印模型参数量与单步前向校验：
</p>

<pre><code># =====================================================================
# Gen-1 LLM: Complete nanoGPT Decoder Architecture
# Directly aligned with Andrej Karpathy's nanoGPT & Zero to Hero Lecture
# =====================================================================

import torch
import torch.nn as nn
from torch.nn import functional as F

class Head(nn.Module):
    """单个因果自注意力头（Causal Self-Attention Head）"""
    def __init__(self, head_size, n_embd, block_size, dropout=0.1):
        super().__init__()
        self.key = nn.Linear(n_embd, head_size, bias=False)
        self.query = nn.Linear(n_embd, head_size, bias=False)
        self.value = nn.Linear(n_embd, head_size, bias=False)
        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)   # (B, T, head_size)
        q = self.query(x) # (B, T, head_size)
        
        # 计算注意力得分矩阵: (B, T, head_size) @ (B, head_size, T) -> (B, T, T)
        wei = q @ k.transpose(-2, -1) * (k.shape[-1] ** -0.5)
        # 因果遮蔽：未来位置填 -inf
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
        wei = F.softmax(wei, dim=-1)
        wei = self.dropout(wei)
        
        v = self.value(x) # (B, T, head_size)
        out = wei @ v     # (B, T, head_size)
        return out

class MultiHeadAttention(nn.Module):
    """多头因果自注意力机制（Multi-Head Attention）"""
    def __init__(self, num_heads, head_size, n_embd, block_size, dropout=0.1):
        super().__init__()
        self.heads = nn.ModuleList([Head(head_size, n_embd, block_size, dropout) for _ in range(num_heads)])
        self.proj = nn.Linear(head_size * num_heads, n_embd)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        out = torch.cat([h(x) for h in self.heads], dim=-1)
        out = self.dropout(self.proj(out))
        return out

class FeedForward(nn.Module):
    """两层逐位置前馈感知网络（MLP）"""
    def __init__(self, n_embd, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_embd, 4 * n_embd),
            nn.GELU(),
            nn.Linear(4 * n_embd, n_embd),
            nn.Dropout(dropout)
        )

    def forward(self, x):
        return self.net(x)

class Block(nn.Module):
    """标准 Pre-LayerNorm Transformer 结构块"""
    def __init__(self, n_embd, n_head, block_size, dropout=0.1):
        super().__init__()
        head_size = n_embd // n_head
        self.sa = MultiHeadAttention(n_head, head_size, n_embd, block_size, dropout)
        self.ffwd = FeedForward(n_embd, dropout)
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)

    def forward(self, x):
        x = x + self.sa(self.ln1(x))
        x = x + self.ffwd(self.ln2(x))
        return x

class NanoGPTLanguageModel(nn.Module):
    """自制大模型 Gen-1 完整自回归语言模型"""
    def __init__(self, vocab_size, n_embd=128, block_size=64, n_layer=4, n_head=4, dropout=0.1):
        super().__init__()
        self.block_size = block_size
        self.token_embedding_table = nn.Embedding(vocab_size, n_embd)
        self.position_embedding_table = nn.Embedding(block_size, n_embd)
        self.blocks = nn.Sequential(*[Block(n_embd, n_head, block_size, dropout) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size)

        # 权重初始化（小标准差正态分布，提升初期训练稳定性）
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        tok_emb = self.token_embedding_table(idx)                           # (B, T, n_embd)
        pos_emb = self.position_embedding_table(torch.arange(T, device=idx.device)) # (T, n_embd)
        x = tok_emb + pos_emb
        x = self.blocks(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)                                           # (B, T, vocab_size)

        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits_flat = logits.view(B * T, C)
            targets_flat = targets.view(B * T)
            loss = F.cross_entropy(logits_flat, targets_flat)

        return logits, loss

# ----------------- 形状验证与参数量测试 -----------------
if __name__ == "__main__":
    vocab_size = 270
    block_size = 64
    batch_size = 4
    
    model = NanoGPTLanguageModel(vocab_size=vocab_size, n_embd=128, block_size=block_size, n_layer=4, n_head=4)
    param_count = sum(p.numel() for p in model.parameters())
    print(f"✅ 模型构建成功！总可学习参数量: {param_count:,} ({param_count / 1e6:.2f}M)")

    # 随机生成一个批次的虚拟输入 [B, T]
    dummy_input = torch.randint(0, vocab_size, (batch_size, block_size))
    dummy_targets = torch.randint(0, vocab_size, (batch_size, block_size))

    logits, loss = model(dummy_input, dummy_targets)
    print(f"输入张量形状: {dummy_input.shape}")
    print(f"输出 Logits 形状: {logits.shape} (符合预期 [B, T, vocab_size])")
    print(f"初始随机前向交叉熵 Loss: {loss.item():.4f} (理论应接近 -ln(1/{vocab_size}) = {-torch.log(torch.tensor(1.0/vocab_size)).item():.4f})")
    assert logits.shape == (batch_size, block_size, vocab_size), "形状断言失败！"
    print("🎉 单元测试 100% 通过！nanoGPT 核心模型前向与反向传播完全就绪。")
</code></pre>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 <code>Head.forward()</code> 函数中，代码执行 <code>wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))</code> 的本质目的是什么？</p>
  <ul class="opts">
    <li>降低显卡显存占用，释放不必要的矩阵存储</li>
    <li data-ok>实施自回归因果遮蔽（Causal Masking），使得当前位置的注意力只能汇聚过去与当前 Token 的信息，严禁“偷看未来”的信息，保证自回归预测的因果合法性</li>
    <li>防止 Softmax 计算时发生下溢</li>
    <li>加速张量乘法运算的速度</li>
  </ul>
  <p class="why">
    语言模型的任务是根据前文预测下一个词。如果允许注意力查看后续的 Token，模型将直接“抄袭答案”而无法学到真正的序列建模与预测能力。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">现代大模型（如 GPT-2、LLaMA）普遍将 LayerNorm 放在残差跳接之前（Pre-LN：<code>x = x + sublayer(ln(x))</code>），相较于早期 Attention is All You Need 论文中的 Post-LN（<code>x = ln(x + sublayer(x))</code>），其最核心的数学优势是：</p>
  <ul class="opts">
    <li>能让模型参数量减少一半</li>
    <li data-ok>在深层网络中保持了一条完全畅通无阻的恒等残差通路（Identity Path），使得反向传播的梯度能够直达底层，杜绝深层训练初期梯度爆炸与消失，免去极其脆弱的 Warmup 依赖</li>
    <li>能让激活函数从 GELU 替换为 ReLU</li>
    <li>可以直接在 CPU 上极速训练</li>
  </ul>
  <p class="why">
    Pre-LN 使得梯度可以在残差流中以类似加法的方式直接反传，极大地改善了深层网络的数值条件数，是现代大模型能稳定扩展至数百层的基石设计。
  </p>
</div>
`
});
