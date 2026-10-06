# -*- coding: utf-8 -*-
"""
Batch 2: Upgrading chapters 17 to 24 code blocks:
- Dynamic tensor shapes: (B, T, C), (B, 16, 128), etc.
- Memory allocation, frozen parameters (requires_grad_(False)), autograd DAG
- '# [逐行剖析]' line-by-line explanatory commentary
"""
import re

def replace_block(file_path, block_index, new_inner_html):
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
# 17-distillation.js (Block 0 & 1)
# ========================================================
c_17_0 = """<span class="cm"># [逐行剖析] 温度对 Softmax 尾部概率质量（暗知识）的释放效应</span>
<span class="cm"># 动态形状: logits -> (B, V) [float32]</span>
p = torch.softmax(logits / T, dim=-1)
<span class="cm"># 截取第 2 到第 10 大候选 token 的概率质量和（表征语义联想丰富度）</span>
m = torch.topk(p, k=10, dim=-1).values[:, 1:].sum(dim=-1)
print("tail mass median =", round(m.median().item(), 4))   <span class="cm"># 动态形状: 标量 [float32]</span>"""

c_17_1 = """!pip -q install torch transformers peft datasets

import torch, torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model

<span class="cm"># [逐行剖析] 1. 加载双模型：全量冻结的教师模型 (Teacher) 与轻量学生模型 (Student)</span>
name = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(name)

<span class="cm"># 显存机制: 教师模型进入 eval 模式，所有参数不计算梯度 (requires_grad=False)</span>
teacher = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto").eval()
student = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto")
<span class="cm"># 仅为学生模型注入 LoRA 适配器，冻结基座，大幅削减显存开销</span>
student = get_peft_model(student, LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                          target_modules=["q_proj","k_proj","v_proj","o_proj"], task_type="CAUSAL_LM"))

opt = torch.optim.AdamW(student.parameters(), lr=1e-4)
prompts = ["Explain what a crossfade is in audio.", "Why does a linear fade dip in the middle?",
           "Summarise how attention works.", "What is a KV cache?"] * 32

T, ALPHA = 3.0, 0.3  <span class="cm"># 蒸馏温度 T=3.0, 硬标签损失权重 ALPHA=0.3</span>
for step, p in enumerate(prompts):
    <span class="cm"># 动态形状: batch['input_ids'] -> (B, T) [int64]</span>
    batch = tok(p, return_tensors="pt").to(student.device)
    
    <span class="cm"># [逐行剖析] 2. 教师模型前向传播（阻断 autograd 追踪）</span>
    <span class="cm"># 自动微分: torch.no_grad() 彻底释放中间激活显存</span>
    with torch.no_grad():
        <span class="cm"># 动态形状: t_logits -> (B, T, V) [bfloat16]</span>
        t_logits = teacher(**batch).logits
        
    <span class="cm"># [逐行剖析] 3. 学生模型前向传播（保留计算图）</span>
    <span class="cm"># 动态形状: s_logits -> (B, T, V) [bfloat16]</span>
    s_logits = student(**batch).logits
    
    <span class="cm"># [逐行剖析] 4. 硬标签交叉熵损失（下一 token 自回归真值）</span>
    <span class="cm"># 动态形状: labels -> (B, T-1), s_logits[:, :-1] -> (B*(T-1), V)</span>
    labels = batch.input_ids[:, 1:]
    ce = F.cross_entropy(s_logits[:, :-1].reshape(-1, s_logits.size(-1)), labels.reshape(-1))
    
    <span class="cm"># [逐行剖析] 5. 软标签 KL 散度蒸馏损失（暗知识对齐）</span>
    <span class="cm"># 数学机制: 在高温 T 下对 logits 做 log_softmax，梯度缩放因子为 T^2</span>
    <span class="cm"># 动态形状: log_p_t -> (B, T, V), log_p_s -> (B, T, V)</span>
    log_p_t = F.log_softmax(t_logits.float() / T, dim=-1)
    log_p_s = F.log_softmax(s_logits.float() / T, dim=-1)
    kl = F.kl_div(log_p_s, log_p_t, log_target=True, reduction="batchmean") * (T ** 2)
    
    <span class="cm"># [逐行剖析] 6. 凸组合损失与反向传播</span>
    loss = ALPHA * ce + (1 - ALPHA) * kl
    loss.backward()
    opt.step()
    opt.zero_grad(set_to_none=True)
    if step % 16 == 0:
        print(f"step {step:3d}  ce={ce.item():.3f}  kl={kl.item():.3f}  loss={loss.item():.3f}")"""

replace_block('ai-course/content/17-distillation.js', 0, c_17_0)
replace_block('ai-course/content/17-distillation.js', 1, c_17_1)

# ========================================================
# 18-reasoning.js (Block 0 & 2)
# ========================================================
c_18_0 = """from math import lgamma, exp

<span class="cm"># [逐行剖析] 1. 数值稳定对数二项式系数 ln(C(n, k))</span>
def log_comb(n, k):
    <span class="cm"># 数学恒等式: ln(n!) - ln(k!) - ln((n-k)!)，使用 lgamma 避免阶乘溢出</span>
    return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)

<span class="cm"># [逐行剖析] 2. 孔多塞陪审团定理：独立二项多数投票成功概率解析解</span>
def p_majority(N, p):
    <span class="cm"># 动态演化: N 票中至少获得 k_min = N//2 + 1 票即为胜出</span>
    k_min = N // 2 + 1
    total = 0.0
    for k in range(k_min, N + 1):
        ln_prob = log_comb(N, k) + k * (p if p > 0 else 1e-12) + (N - k) * (1 - p if p < 1 else 1e-12)
        total += exp(ln_prob)
    return total

print("孔多塞陪审团多数投票胜率解析解:")
for N in (1, 3, 5, 9, 21):
    print(f"N={N:2d} | 单次胜率 p=0.60 -> 投票胜率 P={p_majority(N, 0.60):.4f}")"""

c_18_2 = """import json, re, collections, statistics

<span class="cm"># [逐行剖析] 1. 解析链式思考 (CoT) 末尾候选答案</span>
def extract_answer(text):
    m = re.findall(r"\\\\boxed\\{([^}]+)\\}", text)
    if m: return m[-1].strip()
    m2 = re.findall(r"answer is ([^\\n.]+)", text, re.IGNORECASE)
    return m2[-1].strip() if m2 else text.strip().split()[-1]

<span class="cm"># [逐行剖析] 2. 多数投票集成器 (Self-Consistency Majority Vote)</span>
def majority_vote(candidates):
    <span class="cm"># 统计所有采样子链输出的答案频次</span>
    counts = collections.Counter(extract_answer(c) for c in candidates)
    best_ans, num_votes = counts.most_common(1)[0]
    confidence = num_votes / len(candidates)
    return best_ans, confidence

samples = [
    "Let's think step by step... so \\\\boxed{42}",
    "We calculate 30 + 12 = 42. Thus \\\\boxed{42}",
    "Alternative method gives \\\\boxed{40}",
    "Step 1: 42. \\\\boxed{42}"
]
ans, conf = majority_vote(samples)
print(f"聚合答案: {ans} | 置信度: {conf:.2%}")"""

replace_block('ai-course/content/18-reasoning.js', 0, c_18_0)
replace_block('ai-course/content/18-reasoning.js', 2, c_18_2)

# ========================================================
# 19-rag.js (Block 0 & 1)
# ========================================================
c_19_0 = """!pip -q install -U "sentence-transformers" "transformers" numpy torch

import numpy as np, torch
from sentence_transformers import SentenceTransformer

<span class="cm"># [逐行剖析] 1. 加载双塔稠密嵌入模型</span>
model = SentenceTransformer("BAAI/bge-small-en-v1.5")
docs = [
    "Crossfade audio involves smooth transition between two tracks.",
    "Equal power crossfade preserves total RMS acoustic energy.",
    "Linear crossfades cause a perceptible 3dB volume drop in the middle.",
    "Transformer attention computes scaled dot-product over key-value pairs."
]

<span class="cm"># [逐行剖析] 2. 知识库离线向量化与单位球投影归一化</span>
<span class="cm"># 动态形状: doc_emb -> (N_docs, D) = (4, 384) [float32]</span>
doc_emb = model.encode(docs, normalize_embeddings=True)

query = "Why does an audio crossfade dip in loudness?"
<span class="cm"># 动态形状: q_emb -> (1, D) = (1, 384) [float32]</span>
q_emb = model.encode([query], normalize_embeddings=True)

<span class="cm"># [逐行剖析] 3. 欧氏内积即余弦相似度检索</span>
<span class="cm"># 动态形状: scores -> (N_docs,) = (4,) | 矩阵乘法: (1, D) @ (D, N) -> (1, N)</span>
scores = (q_emb @ doc_emb.T)[0]
top_idx = np.argsort(scores)[::-1]

print("Top 检索命中段落:")
for i in top_idx[:2]:
    print(f"得分: {scores[i]:.4f} | 内容: {docs[i]}")"""

c_19_1 = """<span class="cm"># [逐行剖析] 工业级混合检索下限实现：BM25 词频检索 + 稠密向量 + 互易排名融合 (RRF)</span>
import numpy as np

def rrf(rank_lists, k=60):
    <span class="cm"># 数学机制: RRF_score(d) = sum_{m} 1 / (k + rank_m(d))</span>
    scores = {}
    for r_list in rank_lists:
        for rank, doc_id in enumerate(r_list):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

<span class="cm"># 模拟测试：sparse_rank 为关键词检索排名，dense_rank 为语义向量检索排名</span>
sparse_rank = ["doc_A", "doc_B", "doc_C"]
dense_rank  = ["doc_B", "doc_A", "doc_D"]

fused = rrf([sparse_rank, dense_rank], k=60)
print("RRF 融合综合排序结果:")
for doc, score in fused:
    print(f"文档: {doc} | RRF 融合得分: {score:.5f}")"""

replace_block('ai-course/content/19-rag.js', 0, c_19_0)
replace_block('ai-course/content/19-rag.js', 1, c_19_1)

# ========================================================
# 23-compression.js (Block 1)
# ========================================================
c_23_1 = """import torch, math

<span class="cm"># [逐行剖析] 1. 计算 KV Cache 显存占用物理公式</span>
<span class="cm"># 显存机制: 每 token 占用显存 = 2 * n_layers * n_kv_heads * head_dim * bytes_per_elem</span>
def kv_cache_size_mb(batch_size, seq_len, n_layers=24, n_kv_heads=2, head_dim=64, bytes_per_elem=2):
    total_bytes = 2 * n_layers * n_kv_heads * head_dim * seq_len * batch_size * bytes_per_elem
    return total_bytes / (1024 ** 2)

print("KV Cache 显存压力分析 (MB):")
for S in (1024, 4096, 16384, 65536):
    fp16_mb = kv_cache_size_mb(1, S, bytes_per_elem=2)
    int4_mb = kv_cache_size_mb(1, S, bytes_per_elem=0.5)
    print(f"上下文长 {S:5d} | FP16 KV: {fp16_mb:6.1f} MB | INT4 KV: {int4_mb:6.1f} MB (压缩 75%)")"""

replace_block('ai-course/content/23-compression.js', 1, c_23_1)

# ========================================================
# 24-architectures.js (Block 1 & 2)
# ========================================================
c_24_1 = """import torch, torch.nn.functional as F

<span class="cm"># [逐行剖析] 对称双向多模态对比学习损失 (InfoNCE / CLIP Loss)</span>
def info_nce(img_vec, txt_vec, tau=0.07):
    <span class="cm"># 动态形状: img_vec -> (N, D), txt_vec -> (N, D)</span>
    <span class="cm"># 几何投影: 投影到单位超球面，消除模长对相似度的虚假干扰</span>
    img_vec = F.normalize(img_vec, dim=-1)
    txt_vec = F.normalize(txt_vec, dim=-1)
    
    <span class="cm"># 动态形状: logits -> (N, N) [float32] | 对角线为正配对，非对角线为负样本</span>
    logits = img_vec @ txt_vec.t() / tau
    labels = torch.arange(img_vec.size(0), device=img_vec.device)
    
    <span class="cm"># 双向对称交叉熵损失</span>
    loss_i = F.cross_entropy(logits, labels)      <span class="cm"># 图查文损失</span>
    loss_t = F.cross_entropy(logits.t(), labels)  <span class="cm"># 文查图损失</span>
    return 0.5 * (loss_i + loss_t)

vi, vt = torch.randn(8, 64), torch.randn(8, 64)
print("初始对齐损失 =", round(info_nce(vi, vt).item(), 4))"""

c_24_2 = """import torch, torch.nn as nn

<span class="cm"># [逐行剖析] 1. 视觉分块与线性投影编码器 (Patch Unfolding + Linear Projection)</span>
class Encoder(nn.Module):
    def __init__(self, patch=8, dim=64):
        super().__init__()
        self.patch = patch
        <span class="cm"># 将 3 * patch * patch 维度的展平像块映射到特征子空间 dim</span>
        self.proj = nn.Linear(3 * patch * patch, dim)

    def forward(self, img):
        <span class="cm"># 动态形状: img -> (B, 3, 32, 32)</span>
        <span class="cm"># 滑动展开无重叠像块: unfold -> (B, 3, 4, 4, 8, 8)</span>
        p = img.unfold(2, self.patch, self.patch).unfold(3, self.patch, self.patch)
        <span class="cm"># 内存重排与展平: -> permute -> (B, 4, 4, 3, 8, 8) -> reshape -> (B, 16, 192)</span>
        p = p.permute(0, 2, 3, 1, 4, 5).contiguous().reshape(img.size(0), 16, -1)
        return self.proj(p)  <span class="cm"># 动态形状: (B, 16, dim) [16 个视觉 Token]</span>

<span class="cm"># [逐行剖析] 2. 多模态投影适配器 (Vision-Language Projector)</span>
class Projector(nn.Module):
    def __init__(self, d_in=64, d_model=128):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d_in, d_model), nn.GELU(), nn.Linear(d_model, d_model))

    def forward(self, v):
        <span class="cm"># 动态形状: v (B, 16, 64) -> net -> (B, 16, 128)</span>
        return self.net(v)

<span class="cm"># [逐行剖析] 3. 极简端到端多模态大模型 (MiniVLM)</span>
class MiniVLM(nn.Module):
    def __init__(self, vocab=32, d_model=128):
        super().__init__()
        self.enc = Encoder()
        <span class="cm"># 显存机制: 视觉基座冻结 (requires_grad_(False))，不计算视觉梯度</span>
        for p in self.enc.parameters():
            p.requires_grad_(False)
        self.proj = Projector()
        self.emb = nn.Embedding(vocab, d_model)
        self.lm = nn.TransformerEncoderLayer(d_model, 4, 256, batch_first=True)
        self.head = nn.Linear(d_model, vocab)

    def forward(self, img, txt):
        <span class="cm"># 动态形状: img -> (B, 3, 32, 32), txt -> (B, T_txt) = (B, 12)</span>
        v = self.proj(self.enc(img))  <span class="cm"># (B, 16, 128)</span>
        t = self.emb(txt)             <span class="cm"># (B, 12, 128)</span>
        <span class="cm"># 多模态前缀拼接: (B, 16 + 12, 128) = (B, 28, 128)</span>
        h = self.lm(torch.cat([v, t], dim=1))
        <span class="cm"># 仅对文本 Token 位置计算语言模型预测 Logits: (B, 12, vocab)</span>
        return self.head(h[:, v.size(1):])

torch.manual_seed(0)
V, B = 32, 8
img = torch.rand(B, 3, 32, 32)
txt = torch.randint(0, V, (B, 12))
y = torch.roll(txt, -1, dims=1)  <span class="cm"># 目标标签自回归右移</span>

m = MiniVLM()
opt = torch.optim.AdamW([p for p in m.parameters() if p.requires_grad], lr=3e-3)
for step in range(100):
    logits = m(img, txt)  <span class="cm"># 动态形状: (B, 12, V)</span>
    loss = nn.functional.cross_entropy(logits.reshape(-1, V), y.reshape(-1))
    opt.zero_grad(set_to_none=True)
    loss.backward()
    opt.step()
    if step % 50 == 0:
        print(f"step {step:2d} | loss = {loss.item():.3f}")"""

replace_block('ai-course/content/24-architectures.js', 1, c_24_1)
replace_block('ai-course/content/24-architectures.js', 2, c_24_2)

print("Batch 2 upgraded successfully!")
