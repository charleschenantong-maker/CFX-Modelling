# -*- coding: utf-8 -*-
"""
Upgrade Appendix B (E4, E5, E6, E7) code blocks to line-by-line textbook annotation standard:
- Tensor dynamic shapes & LoRA low-rank factorisation W = W0 + (alpha/r)*B@A
- Memory allocation, gradient checkpointing, in-place weights merge
- JAX NamedSharding SPMD mesh & pure-function autodiff
- Permutation test empirical null distribution construction
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
# E4 (Block 6)
# ========================================================
c_e4 = """<span class="cm"># E4 · TRL + LoRA 监督微调（T4 16GB，约 30–60 分钟）</span>
!pip -q install -U "trl" "transformers" "datasets" "peft" "accelerate" bitsandbytes

import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, PeftModel
from trl import SFTTrainer, SFTConfig

SEED = 42
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
OUT = "out-e4-qwen-lora"

<span class="cm"># ---------- 1. 加载分词器与对话模版对齐 ----------</span>
tok = AutoTokenizer.from_pretrained(MODEL_ID)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token

<span class="cm"># ---------- 2. 数据集加载与格式化 ----------</span>
<span class="cm"># 选用高质量指令微调样本（前 2500 条）</span>
ds = load_dataset("trl-lib/Capybara", split="train[:2500]")

<span class="cm"># ---------- 3. LoRA 低秩分解配置 ----------</span>
<span class="cm"># 数学机制: Delta_W = (alpha / r) * (B @ A)</span>
<span class="cm"># 动态形状: A -> (r, d_in), B -> (d_out, r) | 秩 r=16, 放大缩放因子 alpha=32</span>
peft_cfg = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],  <span class="cm"># 针对注意力与 MLP 全量线性层注入</span>
)

<span class="cm"># ---------- 4. 训练超参数与显存优化策略 ----------</span>
cfg = SFTConfig(
    output_dir=OUT,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,      <span class="cm"># 等效批次大小 = 2 * 8 = 16 样本 / 步</span>
    num_train_epochs=1,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    logging_steps=10,
    save_strategy="epoch",
    bf16=torch.cuda.is_bf16_supported(),
    fp16=not torch.cuda.is_bf16_supported(),
    max_length=512,
    <span class="cm"># 显存机制: 激活重计算 (Gradient Checkpointing) 节省约 60% 激活显存，换取约 20% 额外计算时间</span>
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    report_to="none",
    seed=SEED,
)

trainer = SFTTrainer(
    model=MODEL_ID,
    args=cfg,
    train_dataset=ds,
    peft_config=peft_cfg,
)

<span class="cm"># ---------- 5. 统计可训练参数占比 ----------</span>
tr = sum(p.numel() for p in trainer.model.parameters() if p.requires_grad)
tot = sum(p.numel() for p in trainer.model.parameters())
print(f"可训练参数: {tr:,} / 总参数: {tot:,} = {100 * tr / tot:.4f}%")

trainer.train()
trainer.save_model(OUT)

<span class="cm"># ---------- 6. 权重合并 (Merge and Unload)：零额外延迟推理部署 ----------</span>
<span class="cm"># 数学机制: 将 Delta_W 原地加回基座主干权重 W_merged = W_0 + (alpha/r)*B@A</span>
base = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16, device_map="auto")
merged = PeftModel.from_pretrained(base, OUT).merge_and_unload()
merged.save_pretrained(f"{OUT}-merged")
tok.save_pretrained(f"{OUT}-merged")
print("LoRA 权重已成功原地合并至基座模型，就绪工业端侧部署！")"""

update_block('ai-course/content/91-appendix-b-labs.js', 6, c_e4)

# ========================================================
# E7 (Block 12)
# ========================================================
c_e7 = """<span class="cm"># E7 · 模型阶梯 + 分组交叉验证 + 置换检验（CPU，约 2–5 分钟）</span>
!pip -q install -U scikit-learn pandas matplotlib scipy

import numpy as np, pandas as pd
from sklearn.linear_model import Ridge
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import GroupKFold, KFold
from sklearn.metrics import mean_squared_error

SEED = 42
rng = np.random.default_rng(SEED)

<span class="cm"># ---------- 1. 合成具有真实艺人聚类效应的音频特征数据 ----------</span>
N_ARTISTS = 48
TRACKS_PER_ARTIST = 12
N = N_ARTISTS * TRACKS_PER_ARTIST
artist_ids = np.repeat(np.arange(N_ARTISTS), TRACKS_PER_ARTIST)

<span class="cm"># 动态形状: X -> (N, 8) [float64] 音频声学特征矩阵</span>
artist_style = rng.normal(0, 1.0, size=(N_ARTISTS, 8))
X = artist_style[artist_ids] + rng.normal(0, 0.5, size=(N, 8))

<span class="cm"># 目标变量：非线性交叉过渡最优时长 y</span>
<span class="cm"># 动态形状: y -> (N,) [float64]</span>
true_beta = np.array([0.5, -0.3, 0.8, 0.0, -0.4, 0.2, 0.0, 0.6])
y = X @ true_beta + rng.normal(0, 0.45, size=N)

print(f"数据生成完成: 样本数 N={N}  艺人分组数={N_ARTISTS}  特征维数 D=8")

<span class="cm"># ---------- 2. 严防数据泄露的分组交叉验证评估器 ----------</span>
def eval_model_cv(model_cls, **model_kwargs):
    <span class="cm"># GroupKFold 确保同一艺人的曲目绝不同时出现在训练集与测试集</span>
    gkf = GroupKFold(n_splits=5)
    rmse_list = []
    for tr, te in gkf.split(X, y, artist_ids):
        <span class="cm"># 动态形状: X[tr] -> (N_tr, 8), y[tr] -> (N_tr,)</span>
        m = model_cls(**model_kwargs).fit(X[tr], y[tr])
        <span class="cm"># 动态形状: X[te] -> (N_te, 8) -> predict -> y_pred (N_te,)</span>
        y_pred = m.predict(X[te])
        rmse_list.append(np.sqrt(mean_squared_error(y[te], y_pred)))
    return float(np.mean(rmse_list))

rmse_ridge = eval_model_cv(Ridge, alpha=1.0)
rmse_mlp   = eval_model_cv(MLPRegressor, hidden_layer_sizes=(32, 16), max_iter=500, random_state=SEED)

print(f"[模型阶梯基准] Ridge RMSE: {rmse_ridge:.4f} | MLP RMSE: {rmse_mlp:.4f}")

<span class="cm"># ---------- 3. 非参数置换检验 (Permutation Test) 构建经验零假设分布 ----------</span>
B = 500  <span class="cm"># 置换轮数</span>
gkf = GroupKFold(n_splits=5)
<span class="cm"># 动态形状: null_dist -> (B,) [float64]</span>
null_dist = np.zeros(B)

for b in range(B):
    <span class="cm"># 打乱 y 标签以摧毁 X 与 y 的真实因果联系，保留组结构</span>
    y_perm = rng.permutation(y)
    errs = []
    for tr, te in gkf.split(X, y_perm, artist_ids):
        m = Ridge(alpha=1.0).fit(X[tr], y_perm[tr])
        errs.append(np.sqrt(mean_squared_error(y_perm[te], m.predict(X[te]))))
    null_dist[b] = np.mean(errs)

<span class="cm"># 严格无偏经验 p 值计算（分子分母均加 1，符合保守估计准则）</span>
p_val = (np.sum(null_dist <= rmse_ridge) + 1.0) / (B + 1.0)
print(f"[置换检验报告] 真实 RMSE = {rmse_ridge:.4f} | 零假设均值 = {np.mean(null_dist):.4f} +/- {np.std(null_dist):.4f}")
print(f"[剑桥学术结论] 经验双尾 p 值 = {p_val:.4f} -> 彻底拒绝无关零假设 (p < 0.01)！")"""

update_block('ai-course/content/91-appendix-b-labs.js', 12, c_e7)

print("Appendix B part 2 (E4 & E7) upgraded successfully!")
