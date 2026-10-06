# -*- coding: utf-8 -*-
"""
Upgrade Appendix B code blocks (E1 to E7) to line-by-line textbook annotation standard:
- Tensor dynamic shapes: (B, ctx), (B, ctx, d), (B, ctx*d), (B, V), (B, T, C), (B, h, T, dh)
- In-place memory & contiguous allocations
- Autograd tracking & torch.no_grad()
- '# [逐行剖析]' explanatory commentary
"""
import re

def update_block(file_path, block_index, new_inner_html):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = list(re.finditer(r'<pre><code>([\s\S]*?)</code></pre>', content))
    if block_index >= len(matches):
        raise IndexError(f"File {file_path} only has {len(matches)} blocks, requested {block_index}")
    
    m = matches[block_index]
    start, end = m.span(1)
    new_content = content[:start] + new_inner_html + content[end:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {file_path} (block {block_index + 1}) successfully.")

# ========================================================
# E1 (Block 0)
# ========================================================
c_e1 = """<span class="cm"># E1 · 从计数式 bigram 到神经语言模型（CPU 可跑，约 10–20 分钟）</span>
!pip -q install datasets torch matplotlib

import math, random
import torch, torch.nn as nn, torch.nn.functional as F
from datasets import load_dataset

SEED = 1337
random.seed(SEED); torch.manual_seed(SEED)

<span class="cm"># ---------- 1. 数据准备（字符级，TinyStories 前 3000 条）----------</span>
ds = load_dataset("roneneldan/TinyStories", split="train[:3000]")
raw = "".join(ds["text"])
chars = sorted(set(raw))
V = len(chars)
c2i = {c: i for i, c in enumerate(chars)}
i2c = {i: c for i, c in enumerate(chars)}

data = torch.tensor([c2i[c] for c in raw], dtype=torch.long)
n_train = int(len(data) * 0.9)
train, val = data[:n_train], data[n_train:]
print(f"语料字符数={len(data):,}  词表 V={V}  train={len(train):,}  val={len(val):,}")

<span class="cm"># ---------- 2. 基线一：经验计数式 Bigram + Laplace 平滑 ----------</span>
<span class="cm"># 动态形状: N -> (V, V) [int64] | 显存: 分配 V*V*8 字节整数转移频次矩阵</span>
N = torch.zeros((V, V), dtype=torch.long)
for a, b in zip(train[:-1].tolist(), train[1:].tolist()):
    N[a, b] += 1

<span class="cm"># 动态形状: P -> (V, V) [float32] | 原地位运算: /= 沿行轴归一化为转移概率</span>
P = (N + 1).float()
P /= P.sum(1, keepdim=True)
val_a, val_b = val[:-1], val[1:]
val_nll = -P[val_a, val_b].log().mean().item()
print(f"[计数式 Bigram] val_loss = {val_nll:.3f}  ppl = {math.exp(val_nll):.1f}")

<span class="cm"># ---------- 3. 神经网络模型：单层 Bigram 与 多层感知机 ContextMLP ----------</span>
class NeuralBigram(nn.Module):
    def __init__(self, V, d=64):
        super().__init__()
        <span class="cm"># [逐行剖析] 查表嵌入层与线性预测头</span>
        <span class="cm"># 动态形状: emb.weight -> (V, d), head.weight -> (V, d)</span>
        self.emb = nn.Embedding(V, d)
        self.head = nn.Linear(d, V)
        
    def forward(self, x):
        <span class="cm"># 动态形状: 输入 x -> (B, 1) [int64]</span>
        <span class="cm"># 查表获得表征: self.emb(x[:, -1]) -> (B, d) [float32]</span>
        <span class="cm"># 线性投影映射至词表: self.head(...) -> (B, V) [float32]</span>
        return self.head(self.emb(x[:, -1]))

class ContextMLP(nn.Module):
    def __init__(self, V, ctx, d=128, hidden=256):
        super().__init__()
        self.ctx = ctx
        <span class="cm"># [逐行剖析] 嵌入层共享词表向量，多步上下文拼接后送入 MLP</span>
        self.emb = nn.Embedding(V, d)
        self.net = nn.Sequential(
            nn.Linear(ctx * d, hidden),
            nn.ReLU(),
            nn.Linear(hidden, V)
        )
        
    def forward(self, x):
        <span class="cm"># 动态形状: 输入 x -> (B, ctx) [int64]</span>
        <span class="cm"># 查表获取时序嵌入: self.emb(x) -> (B, ctx, d) [float32]</span>
        <span class="cm"># 展平时序维度: flatten(1) -> (B, ctx * d) [float32]</span>
        <span class="cm"># 经过隐藏层非线性映射输出 Logits: self.net(...) -> (B, V) [float32]</span>
        return self.net(self.emb(x).flatten(1))

def batch(d, ctx, bs):
    <span class="cm"># 动态采样: x -> (B, ctx) [int64], y -> (B,) [int64]</span>
    ix = torch.randint(len(d) - ctx - 1, (bs,))
    x = torch.stack([d[i:i + ctx] for i in ix])
    y = torch.stack([d[i + ctx] for i in ix])
    return x, y

@torch.no_grad()
def eval_ppl(model, d, ctx, bs=256, iters=20):
    <span class="cm"># 自动微分: @torch.no_grad() 阻断计算图追踪，纯前向评估测试集困惑度</span>
    model.eval()
    tot = 0.0
    for _ in range(iters):
        x, y = batch(d, ctx, bs)
        tot += F.cross_entropy(model(x), y).item()
    return math.exp(tot / iters)

def fit(model, ctx, steps=4000, lr=3e-3, bs=64, tag=""):
    <span class="cm"># 优化器: AdamW 动量更新，启用权重衰减正则化</span>
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    hist = []
    model.train()
    for s in range(1, steps + 1):
        x, y = batch(train, ctx, bs)
        <span class="cm"># 前向交叉熵损失计算: 动态形状 model(x) (B, V) 与 y (B,)</span>
        loss = F.cross_entropy(model(x), y)
        opt.zero_grad(set_to_none=True)
        loss.backward()  <span class="cm"># 自动微分: 反向回溯计算各层参数梯度</span>
        opt.step()       <span class="cm"># 原地更新模型参数权重</span>
        if s % 1000 == 0:
            val_p = eval_ppl(model, val, ctx)
            model.train()
            print(f"[{tag}] step {s:4d}  train_loss={loss.item():.3f}  val_ppl={val_p:.1f}")
            hist.append((s, loss.item(), val_p))
    return hist

print("\\n--- 训练 Neural Bigram (ctx=1) ---")
fit(NeuralBigram(V).cuda() if torch.cuda.is_available() else NeuralBigram(V), ctx=1, tag="Neural-Bigram")

print("\\n--- 训练 Context MLP (ctx=8) ---")
fit(ContextMLP(V, ctx=8).cuda() if torch.cuda.is_available() else ContextMLP(V, ctx=8), ctx=8, tag="Context-MLP")"""

update_block('ai-course/content/91-appendix-b-labs.js', 0, c_e1)

# ========================================================
# E3 (Block 4)
# ========================================================
c_e3 = """<span class="cm"># E3 · 从零实现迷你 Transformer（T4 约 20 分钟；CPU 请把 STEPS 改成 500）</span>
!pip -q install datasets torch matplotlib

import math, random
import torch, torch.nn as nn, torch.nn.functional as F
from datasets import load_dataset

SEED = 1337
random.seed(SEED); torch.manual_seed(SEED)
DEV = "cuda" if torch.cuda.is_available() else "cpu"

<span class="cm"># ---------- 1. 数据准备 ----------</span>
ds = load_dataset("roneneldan/TinyStories", split="train[:5000]")
raw = "".join(ds["text"])
chars = sorted(set(raw))
V = len(chars)
c2i = {c: i for i, c in enumerate(chars)}
i2c = {i: c for i, c in enumerate(chars)}
data = torch.tensor([c2i[c] for c in raw], dtype=torch.long)
n_train = int(len(data) * 0.9)
train, val = data[:n_train], data[n_train:]
print(f"vocab={V}  train={len(train):,}  val={len(val):,}  device={DEV}")

<span class="cm"># ---------- 2. 核心架构：多头因果自注意力算子 ----------</span>
class CausalSelfAttention(nn.Module):
    def __init__(self, d, h, T, dropout=0.1):
        super().__init__()
        assert d % h == 0, "d 必须能被头数 h 整除"
        self.h, self.dh = h, d // h
        <span class="cm"># [逐行剖析] 1. 一体化线性层并行映射 Q, K, V</span>
        <span class="cm"># 显存机制: 权重形状 (3*d, d)，单次 GEMM 避免 3 次小内核调度</span>
        self.qkv  = nn.Linear(d, 3 * d, bias=False)
        self.proj = nn.Linear(d, d, bias=False)
        self.drop = nn.Dropout(dropout)
        <span class="cm"># 自动微分: register_buffer 注册下三角掩码为常量张量，不追踪梯度历史</span>
        self.register_buffer("mask", torch.tril(torch.ones(T, T)).view(1, 1, T, T))

    def forward(self, x):
        <span class="cm"># 动态形状: 输入残差流 x -> (B, T, C)</span>
        B, T, C = x.shape
        
        <span class="cm"># [逐行剖析] 2. 线性投影与均匀三等分切分</span>
        <span class="cm"># 动态形状: self.qkv(x) -> (B, T, 3*C) -> split -> q, k, v 各为 (B, T, C)</span>
        q, k, v = self.qkv(x).split(C, dim=2)
        
        <span class="cm"># [逐行剖析] 3. 变换头维度并将 head 提前</span>
        <span class="cm"># 动态形状: (B, T, C) -> view -> (B, T, h, dh) -> transpose -> (B, h, T, dh)</span>
        q = q.view(B, T, self.h, self.dh).transpose(1, 2)
        k = k.view(B, T, self.h, self.dh).transpose(1, 2)
        v = v.view(B, T, self.h, self.dh).transpose(1, 2)
        
        <span class="cm"># [逐行剖析] 4. 缩放点积注意力分数</span>
        <span class="cm"># 动态形状: (B, h, T, dh) @ (B, h, dh, T) -> att (B, h, T, T)</span>
        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.dh)
        
        <span class="cm"># [逐行剖析] 5. 因果掩码切片与上三角 -inf 填充</span>
        <span class="cm"># 原地位运算: masked_fill 保证未来时间步注意力权重精确为 0</span>
        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float("-inf"))
        att = self.drop(F.softmax(att, dim=-1))
        
        <span class="cm"># [逐行剖析] 6. 加权求和并还原通道维度</span>
        <span class="cm"># 动态形状: att (B, h, T, T) @ v (B, h, T, dh) -> (B, h, T, dh) -> (B, T, C)</span>
        y = (att @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.proj(y)  <span class="cm"># 最终线性投影: (B, T, C)</span>

<span class="cm"># ---------- 3. Pre-LN Transformer 结构块 ----------</span>
class Block(nn.Module):
    def __init__(self, d, h, T, dropout=0.1):
        super().__init__()
        self.ln1  = nn.LayerNorm(d)
        self.ln2  = nn.LayerNorm(d)
        self.attn = CausalSelfAttention(d, h, T, dropout)
        self.mlp  = nn.Sequential(
            nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d), nn.Dropout(dropout)
        )
        
    def forward(self, x):
        <span class="cm"># 动态形状: x -> (B, T, d)</span>
        <span class="cm"># [逐行剖析] 双重 Pre-LN 残差连接：输入直通相加，梯度无衰减穿透深层网络</span>
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x

<span class="cm"># ---------- 4. 完整 MiniGPT 语言模型 ----------</span>
class MiniGPT(nn.Module):
    def __init__(self, V, d=128, h=4, n_layers=3, T=128, dropout=0.1):
        super().__init__()
        self.T = T
        self.tok_emb = nn.Embedding(V, d)
        self.pos_emb = nn.Parameter(torch.zeros(1, T, d))
        self.drop    = nn.Dropout(dropout)
        self.blocks  = nn.ModuleList([Block(d, h, T, dropout) for _ in range(n_layers)])
        self.ln_f    = nn.LayerNorm(d)
        self.head    = nn.Linear(d, V, bias=False)
        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, mean=0.0, std=0.02)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, mean=0.0, std=0.02)

    def forward(self, idx):
        <span class="cm"># 动态形状: idx -> (B, T) [int64]</span>
        B, T = idx.shape
        <span class="cm"># 词嵌入与可学习绝对位置嵌入相加: tok (B, T, d) + pos (1, T, d) -> x (B, T, d)</span>
        x = self.drop(self.tok_emb(idx) + self.pos_emb[:, :T, :])
        for blk in self.blocks:
            x = blk(x)
        x = self.ln_f(x)
        logits = self.head(x)  <span class="cm"># 动态形状: logits -> (B, T, V) [float32]</span>
        return logits

def get_batch(split, bs, T):
    src = train if split == "train" else val
    ix = torch.randint(len(src) - T - 1, (bs,))
    x = torch.stack([src[i:i + T] for i in ix]).to(DEV)
    y = torch.stack([src[i + 1:i + T + 1] for i in ix]).to(DEV)
    return x, y

@torch.no_grad()
def estimate_loss(model, bs=32, T=128, eval_iters=20):
    model.eval()
    out = {}
    for split in ["train", "val"]:
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            x, y = get_batch(split, bs, T)
            logits = model(x)
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), y.view(-1))
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out

<span class="cm"># ---------- 5. 训练循环 ----------</span>
model = MiniGPT(V, d=128, h=4, n_layers=3, T=128).to(DEV)
opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
STEPS = 3000 if DEV == "cuda" else 500

for s in range(1, STEPS + 1):
    x, y = get_batch("train", bs=32, T=128)
    logits = model(x)
    loss = F.cross_entropy(logits.view(-1, logits.size(-1)), y.view(-1))
    opt.zero_grad(set_to_none=True)
    loss.backward()
    opt.step()
    if s % 500 == 0 or s == STEPS:
        res = estimate_loss(model, bs=32, T=128)
        print(f"step {s:4d} | train_loss={res['train']:.3f} | val_loss={res['val']:.3f} | val_ppl={math.exp(res['val']):.1f}")"""

update_block('ai-course/content/91-appendix-b-labs.js', 4, c_e3)

print("Appendix B (E1 & E3) upgraded successfully!")
