/* content/28-kaggle-training.js — 模块 28：自制大模型 Gen-1（三）：Kaggle 免费 GPU 预训练循环与损失收敛 */
COURSE.register({
  id: "m28",
  part: 5,
  num: "28",
  title: "自制大模型 Gen-1（三）：Kaggle 免费 GPU 预训练循环与损失收敛",
  en: "Building Gen-1 LLM (Part 3): Pretraining Loop & Loss Optimization on Kaggle GPU",
  minutes: 45,
  tags: ["Gen-1自制大模型", "预训练循环", "Kaggle实战", "AdamW", "余弦退火"],
  body: String.raw`
<p class="lead">
  在前两讲中，我们手写了 BPE 分词器与完整的 nanoGPT 神经网络架构。
  现在，激动人心的时刻到了：我们将<strong>把数据、模型、优化器与真实 GPU 算力串联起来</strong>，
  在 Kaggle 免费提供的 NVIDIA T4 GPU 上，从零启动你的<strong>第一代自回归大模型（NanoLM-Gen1）预训练循环</strong>！
  你将亲眼见证模型 Loss 从初始的随机乱码状态（Loss ≈ 4.5~5.5）持续陡降至 1.5 以下，并在短短 15 分钟内彻底收敛出具备清晰语法的生成能力。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🎥</span>必看高质导读资源（Recommended Learning Resources）</h4>
  <p>在编写训练引擎前，强烈建议研读 Karpathy 的预训练复现经典：</p>
  <ul>
    <li>
      <strong>核心精讲视频</strong>：Andrej Karpathy — 
      <a href="https://www.youtube.com/watch?v=l8pRSuU81PU" target="_blank" rel="noopener">《Let's reproduce GPT-2 (124M)》</a>
      （时长：4小时01分钟）。<br>
      <em>重点时间戳</em>：<code>0:30:00</code> 批次加载器张量切片；<code>1:58:00</code> AdamW 优化器权重衰减解耦分组；<code>2:15:00</code> 带预热的余弦退火调度；<code>2:38:00</code> 梯度范数裁剪。
    </li>
    <li>
      <strong>官方开源代码库</strong>：
      <a href="https://github.com/karpathy/build-nanogpt" target="_blank" rel="noopener"><code>karpathy/build-nanogpt</code></a> 
      — 零依赖纯 PyTorch 复现 GPT-2 完整预训练流程的标准工业代码。
    </li>
    <li>
      <strong>优化器奠基论文</strong>：Loshchilov & Hutter (2019) — 
      <a href="https://arxiv.org/abs/1711.05101" target="_blank" rel="noopener">《Decoupled Weight Decay Regularization》（AdamW, ICLR 2019）</a>。<br>
      <em>推荐理由</em>：证明了 L2 正则化在自适应梯度法中的数学缺陷，确立了 AdamW 作为大模型预训练唯一主导优化器的历史地位。
    </li>
  </ul>
</section>

<h3>1. 训练语料极速收敛设计：TinyShakespeare / TinyStories</h3>
<p>
  大模型预训练的底层逻辑在 1 亿参数与 1000 亿参数上是完全同构的。为了让学员在单张免费 T4 GPU 上以极低等待成本走通全流程，我们选用经典教学语料 <strong>TinyShakespeare</strong>（约 1.1MB，4万行莎士比亚戏剧对白）或 <strong>TinyStories</strong>。
  在这类紧凑语料上，一个 1000 万参数级别的 NanoLM 只需训练 2000~5000 步（约 10~15 分钟），即可学会英文单词拼写、角色对话排版与地道的人名词汇。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：预训练批次切片逻辑）</h4>
  <p>设将全量语料展平为一个一维长张量 \(\mathbf{D} \in \mathbb{N}^L\)。每次采样批次大小为 \(B\)、上下文窗口为 \(T\)：</p>
  \[ \mathbf{x} = \mathbf{D}[i : i+T], \qquad \mathbf{y} = \mathbf{D}[i+1 : i+T+1] \]
  <p>
    其中输入 \(\mathbf{x}\) 与目标 \(\mathbf{y}\) 的物理关系是<strong>严格错开 1 个时间步</strong>。对于任意时间步 \(t\)，模型的任务就是在给定 \(\mathbf{x}_{1:t}\) 的条件下，最大化真实下一个 Token \(\mathbf{y}_t = \mathbf{x}_{t+1}\) 的对数似然概率。
  </p>
</section>

<h3>2. 逐行手写预训练核心引擎（train.py）</h3>
<p>
  下面我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，编写工业级预训练引擎。
</p>

<h4>第一步：语料批次切片加载器（get_batch）</h4>

<pre><code>def get_batch(split, data_train, data_val, batch_size, block_size, device):
    data = data_train if split == 'train' else data_val
</code></pre>
<p><strong>代码解析</strong>：定义高效批次生成函数，根据入参 <code>split</code> 自动在训练集张量与验证集张量之间切换数据源。</p>

<pre><code>    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([data[i:i+block_size] for i in ix])
</code></pre>
<p><strong>代码解析</strong>：生成 <code>batch_size</code> 个均匀随机的起始索引 <code>ix</code>；使用列表推导切出长度为 <code>block_size</code> 的切片，并用 <code>torch.stack</code> 沿第 0 维拼装成形状为 <code>(B, T)</code> 的输入张量 <code>x</code>。</p>

<pre><code>    y = torch.stack([data[i+1:i+block_size+1] for i in ix])
    return x.to(device), y.to(device)
</code></pre>
<p><strong>代码解析</strong>：将相同起始位置向后平移 1 个单位切出标签张量 <code>y</code>；直接异步搬运至目标计算设备（如 <code>cuda:0</code>），为 GPU 高速矩阵乘法做好准备。</p>

<h4>第二步：权重衰减（Weight Decay）参数精细分组</h4>

<pre><code>def configure_optimizers(model, weight_decay=1e-1, lr=5e-4, betas=(0.9, 0.95)):
    decay_params = [p for n, p in model.named_parameters() if p.requires_grad and p.dim() >= 2]
    nodecay_params = [p for n, p in model.named_parameters() if p.requires_grad and p.dim() < 2]
</code></pre>
<p><strong>代码解析</strong>：遍历模型的所有可学习参数，<strong>严格执行 Karpathy 的现代分组法则</strong>：所有维度大于等于 2 的张量（即线性层与注意力的二维权重矩阵）纳入衰减组；所有一维张量（偏置项 Bias 与 LayerNorm 的缩放平移参数）纳入不衰减组。</p>

<pre><code>    optim_groups = [
        {'params': decay_params, 'weight_decay': weight_decay},
        {'params': nodecay_params, 'weight_decay': 0.0}
    ]
    return torch.optim.AdamW(optim_groups, lr=lr, betas=betas)
</code></pre>
<p><strong>代码解析</strong>：构造参数组字典，对权重矩阵施加 0.1 的衰减系数防止模型过拟合，对 LayerNorm 施加 0 衰减保证归一化尺度稳定，最后初始化 AdamW 优化器。</p>

<h4>第三步：带预热的余弦退火学习率调度（Cosine Decay with Warmup）</h4>

<pre><code>def get_lr(it, max_iters, warmup_iters=100, max_lr=5e-4, min_lr=5e-5):
    if it < warmup_iters:
        return max_lr * (it + 1) / warmup_iters
</code></pre>
<p><strong>代码解析</strong>：在训练初期前 <code>warmup_iters</code> 步执行线性预热：学习率从 0 线性爬升至峰值 <code>max_lr</code>，防止随机初始化的粗糙梯度在刚开始就震毁模型。</p>

<pre><code>    if it > max_iters:
        return min_lr
    decay_ratio = (it - warmup_iters) / (max_iters - warmup_iters)
</code></pre>
<p><strong>代码解析</strong>：若超出最大步数则维持基底学习率；否则计算当前处于退火周期的相对进度百分比 <code>decay_ratio</code>（区间为 0.0~1.0）。</p>

<pre><code>    coeff = 0.5 * (1.0 + math.cos(math.pi * decay_ratio))
    return min_lr + coeff * (max_lr - min_lr)
</code></pre>
<p><strong>代码解析</strong>：使用 \(\frac{1}{2}(1 + \cos(\pi \cdot \text{ratio}))\) 余弦函数平滑降低学习率，在训练收敛末期微调权重，实现最细致的局部极小值收敛。</p>

<h4>第四步：无梯度验证集损失评估（estimate_loss）</h4>

<pre><code>@torch.no_grad()
def estimate_loss(model, data_train, data_val, batch_size, block_size, device, eval_iters=50):
    out = {}
    model.eval()
</code></pre>
<p><strong>代码解析</strong>：使用 <code>@torch.no_grad()</code> 装饰器禁用计算图梯度记录以节省显存；将模型切入 <code>eval()</code> 评估模式，停用 Dropout 的随机丢弃行为。</p>

<pre><code>    for split in ['train', 'val']:
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            X, Y = get_batch(split, data_train, data_val, batch_size, block_size, device)
            _, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
</code></pre>
<p><strong>代码解析</strong>：分别在训练集和验证集上均匀抽取 <code>eval_iters</code> 个批次，累加交叉熵损失并求均值，消除单批次偶发扰动，获得客观稳健的真实泛化误差。</p>

<pre><code>    model.train()
    return out
</code></pre>
<p><strong>代码解析</strong>：评估完成后将模型重新切回 <code>train()</code> 训练模式，返回训练集与验证集的平滑损失字典。</p>

<h4>第五步：梯度裁剪与单步优化更新</h4>

<pre><code>        optimizer.zero_grad(set_to_none=True)
        _, loss = model(xb, yb)
        loss.backward()
</code></pre>
<p><strong>代码解析</strong>：将优化器旧梯度置为 <code>None</code>（比传 0 显著更省内存并加速下轮反向传播）；执行模型前向传播获取当前批次损失，并调用 <code>loss.backward()</code> 反向微分计算各参数梯度。</p>

<pre><code>        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
</code></pre>
<p><strong>代码解析</strong>：<strong>大模型训练防炸核武器</strong>：使用 <code>clip_grad_norm_</code> 将全局梯度向量的 L2 范数硬截断至 1.0 上限，彻底阻断因偶发异常数据样本导致的梯度爆炸（Gradient Explosion）；随后由优化器执行参数物理更新。</p>

<h3>3. 🧪 模块完整整合代码清单（Complete Runnable Script）</h3>
<p>
  下面是预训练引擎的<strong>完整无删减脚本（train.py）</strong>。包含内置极简语料生成、模型实例化、学习率调度、定期损失打印与检查点保存，可直接在 Kaggle 或任何 PyTorch 环境中一键启动：
</p>

<pre><code># =====================================================================
# Gen-1 LLM: Complete Pretraining Loop on GPU
# Directly aligned with Andrej Karpathy's build-nanogpt & Zero to Hero
# =====================================================================

import math
import time
import torch
import torch.nn as nn
from torch.nn import functional as F

# 导入第 27 讲手写的核心模型（若在同文件可直接复用）
from model import NanoGPTLanguageModel

# ----------------- 超参数设定（专为 Kaggle T4 / 本地极速训练调优） -----------------
batch_size = 32           # 批次大小
block_size = 64           # 上下文窗口长度
max_iters = 1500          # 训练总迭代步数
eval_interval = 250       # 评估验证周期间隔
learning_rate = 5e-4      # 最大学习率
device = 'cuda' if torch.cuda.is_available() else 'cpu'
eval_iters = 40
n_embd = 128
n_head = 4
n_layer = 4
dropout = 0.1

print(f"🖥️ 当前使用的训练硬件设备: {device.upper()}")

# ----------------- 极简自包含训练数据准备 -----------------
# 构造包含经典结构的微型训练语料（实际可替换为任意文本文件）
sample_corpus = """
First Citizen: Before we proceed any further, hear me speak.
All: Speak, speak.
First Citizen: You are all resolved rather to die than to famish?
All: Resolved. resolved.
First Citizen: First, you know Caius Marcius is chief enemy to the people.
All: We know't, we know't.
First Citizen: Let us kill him, and we'll have corn at our own price.
Is't a verdict?
All: No more talking on't; let it be done: away, away!
Second Citizen: One word, good citizens.
First Citizen: We are accounted poor citizens, the patricians good.
What authority surfeits on would relieve us: if they would yield
us but the superfluity, while it were wholesome, we might guess
they relieved us humanely; but they think we are too dear.
""" * 100  # 重复放大形成自包含玩具训练集

chars = sorted(list(set(sample_corpus)))
vocab_size = len(chars)
stoi = {ch: i for i, ch in enumerate(chars)}
itos = {i: ch for i, ch in enumerate(chars)}

encode = lambda s: [stoi[c] for c in s]
decode = lambda l: ''.join([itos[i] for i in l])

data = torch.tensor(encode(sample_corpus), dtype=torch.long)
n_train = int(0.9 * len(data))
train_data = data[:n_train]
val_data = data[n_train:]

def get_batch(split):
    d = train_data if split == 'train' else val_data
    ix = torch.randint(len(d) - block_size, (batch_size,))
    x = torch.stack([d[i:i+block_size] for i in ix])
    y = torch.stack([d[i+1:i+block_size+1] for i in ix])
    return x.to(device), y.to(device)

@torch.no_grad()
def estimate_loss(model):
    out = {}
    model.eval()
    for split in ['train', 'val']:
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            X, Y = get_batch(split)
            _, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out

def get_lr(it):
    warmup_iters = 100
    if it < warmup_iters:
        return learning_rate * (it + 1) / warmup_iters
    decay_ratio = (it - warmup_iters) / (max_iters - warmup_iters)
    coeff = 0.5 * (1.0 + math.cos(math.pi * decay_ratio))
    return 1e-5 + coeff * (learning_rate - 1e-5)

# ----------------- 初始化模型与优化器 -----------------
model = NanoGPTLanguageModel(vocab_size=vocab_size, n_embd=n_embd, block_size=block_size, n_layer=n_layer, n_head=n_head, dropout=dropout).to(device)

# 权重衰减分组
decay_params = [p for n, p in model.named_parameters() if p.requires_grad and p.dim() >= 2]
nodecay_params = [p for n, p in model.named_parameters() if p.requires_grad and p.dim() < 2]
optimizer = torch.optim.AdamW([
    {'params': decay_params, 'weight_decay': 0.1},
    {'params': nodecay_params, 'weight_decay': 0.0}
], lr=learning_rate, betas=(0.9, 0.95))

# ----------------- 正式预训练主循环 -----------------
print(f"🚀 开始 NanoLM-Gen1 预训练循环（总计 {max_iters} 步）...")
start_time = time.time()

for iter_step in range(max_iters):
    # 动态调整当前步的学习率
    lr = get_lr(iter_step)
    for param_group in optimizer.param_groups:
        param_group['lr'] = lr

    # 定期无偏估计验证损失
    if iter_step % eval_interval == 0 or iter_step == max_iters - 1:
        losses = estimate_loss(model)
        elapsed = time.time() - start_time
        print(f"Step {iter_step:4d} | 耗时: {elapsed:5.1f}s | Train Loss: {losses['train']:.4f} | Val Loss: {losses['val']:.4f} | LR: {lr:.2e}")

    # 获取批次并执行反向传播
    xb, yb = get_batch('train')
    logits, loss = model(xb, yb)
    
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    optimizer.step()

# 保存最终训练好的模型权重元组
torch.save({
    'model_state': model.state_dict(),
    'vocab': chars,
    'config': {'n_embd': n_embd, 'n_head': n_head, 'n_layer': n_layer, 'block_size': block_size}
}, "nanogpt_gen1.pt")
print("🎉 恭喜！NanoLM-Gen1 预训练顺利完成，权重已安全序列化至 nanogpt_gen1.pt。")
</code></pre>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在配置 AdamW 优化器参数组时，为什么必须将二维权重矩阵（<code>p.dim() >= 2</code>）与一维偏置/LayerNorm 参数（<code>p.dim() < 2</code>）分开，并对一维参数设置 <code>weight_decay = 0.0</code>？</p>
  <ul class="opts">
    <li>因为 PyTorch 的底层 C++ 算子不支持对一维张量计算梯度</li>
    <li data-ok>Weight Decay 的本质是压制权重的 L2 模长以防过拟合。LayerNorm 的缩放平移参数（\(\gamma, \beta\)）和偏置项用于微调特征分布的均值与方差，对其施加衰减会强行扭曲激活值的统计尺度，损害模型表达能力</li>
    <li>为了让训练占用更少的 GPU 显存</li>
    <li>这样可以使优化器跳过反向传播计算</li>
  </ul>
  <p class="why">
    绝大多数工业大模型（GPT-3、LLaMA、Chinchilla）均严格遵守此规范：只有注意力投影矩阵与 MLP 权重参与 Weight Decay，所有偏置和归一化参数绝对豁免衰减。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在执行反向传播后调用 <code>torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)</code> 的主要物理意义是：</p>
  <ul class="opts">
    <li>将模型参数的数值强制压缩在 -1.0 到 +1.0 之间</li>
    <li data-ok>当遇到奇异噪声样本导致梯度的全局 L2 范数陡增时，将其按比例等比缩放至 1.0 的最大安全上限，从而彻底防止梯度爆炸冲毁模型参数</li>
    <li>加速梯度在 GPU 显存中的传输带宽</li>
    <li>自动将 FP32 梯度转换为 FP16 浮点数</li>
  </ul>
  <p class="why">
    梯度裁剪改变的是梯度更新向量的“步长上限”，但不改变其“更新方向”（等比缩放），是保障千步长周期预训练绝对不发生 Loss 突变飞升（NaN）的最坚固安全阀。
  </p>
</div>
`
});
