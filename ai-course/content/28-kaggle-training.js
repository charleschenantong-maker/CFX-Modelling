/* content/28-kaggle-training.js — 模块 28：真实开源模型改造：在 Kaggle 免费 T4 上加载与 LoRA 微调 Qwen-2.5（千问）大模型 */
COURSE.register({
  id: "m28",
  part: 5,
  num: "28",
  title: "真实开源模型改造：在 Kaggle 免费 T4 上加载与 LoRA 微调 Qwen-2.5（千问）大模型",
  en: "Open-Source Model Adaptation: Loading & LoRA Fine-Tuning Qwen-2.5 on Free Kaggle T4",
  minutes: 45,
  tags: ["Qwen-2.5", "LoRA微调", "PEFT", "大模型实战", "Kaggle"],
  body: String.raw`
<p class="lead">
  前面几章你自己训的小模型只有几兆参数，跑通流程没问题，但拿去答真实问题远远不够。
  真要用起来，常规做法是拿一个现成的开源模型当底座，只训练其中一小部分权重，让它学会你这边的说法和套路。
  这一章就用<strong>阿里通义千问 Qwen-2.5-1.5B</strong> 当底座，用 <strong>LoRA（Low-Rank Adaptation，低秩自适应微调）</strong>，
  在 Kaggle 免费的 16GB T4 上跑完一遍微调，产出一个能装进你项目的适配器。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>为什么拿 Qwen-2.5-1.5B 当底座</h4>
  <p>开源模型很多，但在 1.5B 这一档里，它是最省事的选择：</p>
  <ul>
    <li><strong>能力够用</strong>：代码（HumanEval）、数学（MATH）和中文指令跟随的表现，已经超过上一代的 7B / 13B 模型；</li>
    <li><strong>显存吃得少</strong>：16-bit 加载约 3.2 GB，4-bit 量化约 1.5 GB。放在 16GB 的 T4 上还剩下不少空间留给批次和上下文；</li>
    <li><strong>配套齐全</strong>：Hugging Face、vLLM、Ollama、llama.cpp 都能直接用，导出不用折腾。</li>
  </ul>
</section>

<h3>1. 为什么不用全量微调，而用 LoRA</h3>
<p>
  拿 1.5B 参数做全量微调，反向传播要给每个参数各存一份梯度和 AdamW 的一阶、二阶动量。按每个参数 16 字节算，光这一项就至少要 \(1.5 \times 16 = 24 \text{ GB}\)，一张 T4 直接装不下。
  <strong>LoRA（Low-Rank Adaptation）</strong>换了个做法：<strong>把底座里 99.8% 的预训练权重冻住不动，只在旁边挂两个很小的低秩矩阵</strong>，训练时只更新它们。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫：LoRA 到底动了哪个矩阵</h4>
  <p>设底座里那个被冻住的权重矩阵是 \(\mathbf{W}_0 \in \mathbb{R}^{d \times k}\)。微调时不去改它，而是把权重的改动量 \(\Delta \mathbf{W}\) 写成两个小矩阵的乘积：</p>
  \[ \mathbf{h} = \mathbf{W}_0 \mathbf{x} + \Delta \mathbf{W} \mathbf{x} = \mathbf{W}_0 \mathbf{x} + \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}) \mathbf{x} \]
  <ul>
    <li>\(\mathbf{W}_0\)：预训练大模型固有的稠密权重矩阵，在整个微调过程中<strong>完全冻结（requires_grad=False），不产生任何优化器动量开销</strong>；</li>
    <li>\(\mathbf{A} \in \mathbb{R}^{r \times k}\)：低秩降维矩阵，使用高斯随机正态分布初始化；</li>
    <li>\(\mathbf{B} \in \mathbb{R}^{d \times r}\)：低秩升维矩阵，初始全置为 0，<strong>这样第 0 步时 \(\mathbf{B} \cdot \mathbf{A} = \mathbf{0}\)，模型行为和原版底座一模一样，不会一上来就被随机权重带偏</strong>；</li>
    <li>\(r\)（Rank）：低秩内在维度（通常取 8 或 16）；</li>
    <li>\(\alpha\)（Lora Alpha）：恒定缩放因子（通常取 \(2 \times r\)，如 16 或 32），用于稳定不同秩下的学习率步长。</li>
  </ul>
</section>

<h3>2. 一步步跑通加载与 LoRA 微调</h3>
<p>
  下面按「一两行代码 + 一段解释」的节奏走，每一步都能单独跑。
</p>

<h4>第一步：装依赖</h4>

<pre><code>!pip install -q transformers peft trl accelerate bitsandbytes datasets
</code></pre>
<p><strong>代码解析</strong>：一次装齐 Hugging Face 那一套——<code>transformers</code>（模型本体）、<code>peft</code>（LoRA 这类参数高效微调）、<code>trl</code>（训练器）、<code>accelerate</code>（自动分配设备）。</p>

<h4>第二步：加载分词器</h4>

<pre><code>from transformers import AutoTokenizer
model_id = "Qwen/Qwen2.5-1.5B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_id)
</code></pre>
<p><strong>代码解析</strong>：填上 Hugging Face 上的仓库名，它会自动下载权重并建好分词器（Qwen2.5 用的是约 15 万词表的字节级 BPE）。</p>

<pre><code>tokenizer.pad_token = tokenizer.eos_token
print("词表大小:", len(tokenizer), "| 填充标记 Pad Token:", tokenizer.pad_token)
</code></pre>
<p><strong>代码解析</strong>：自回归模型没有专门的填充标记，这里把句子结束符 <code>eos_token</code>（<code>&lt;|im_end|&gt;</code>）兼作 <code>pad_token</code>，批量输入时长短不一的句子才能对齐。</p>

<h4>第三步：加载 Qwen-2.5 底座（半精度）</h4>

<pre><code>import torch
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16, device_map="auto")
</code></pre>
<p><strong>代码解析</strong>：T4 是 Turing 架构，不能原生算 <code>bfloat16</code>，所以这里必须用 <code>float16</code>。<code>device_map="auto"</code> 让它自己挑设备，1.5B 大约占 3.2 GB 显存。</p>

<h4>第四步：挂上 LoRA 适配器（PEFT）</h4>

<pre><code>from peft import LoraConfig, get_peft_model
peft_config = LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"], lora_dropout=0.05, bias="none", task_type="CAUSAL_LM")
</code></pre>
<p><strong>代码解析</strong>：秩 \(r=8\)，缩放系数 \(\alpha=16\)；LoRA 只挂在自注意力的查询（<code>q_proj</code>）和数值（<code>v_proj</code>）两个投影上。</p>

<pre><code>model = get_peft_model(model, peft_config)
model.print_trainable_parameters()
</code></pre>
<p><strong>代码解析</strong>：<code>get_peft_model</code> 把 LoRA 层挂到底座上，<code>print_trainable_parameters()</code> 会打印出真正要训练的参数：<strong>从 15.4 亿降到约 109 万，只占 0.07%</strong>。</p>

<h4>第五步：准备微调数据（以 Crossfade 为例）</h4>

<pre><code>from datasets import Dataset
train_data = [
    {"instruction": "给出音频 Crossfade 两个轨道的过渡曲线推荐参数。", "output": "建议采用等功率对数过渡曲线（Equal Power Crossfade），将轨道 A 设为 cos(t*pi/2)，轨道 B 设为 sin(t*pi/2)，保证重叠区域能量平方和守恒，消除声压凹陷。"},
    {"instruction": "Crossfade 数学建模中采样率不匹配应如何处理？", "output": "在执行重叠相加（Overlap-Add）之前，必须调用多相滤波插值算法（Polyphase Resampling）将从属音频轨重采样至主轨相同采样率（如 44.1kHz），以杜绝相位偏移与高频混叠。"}
] * 50
dataset = Dataset.from_list(train_data)
</code></pre>
<p><strong>代码解析</strong>：写两三条「提问-回答」样本，乘 50 凑出一个能跑通的小数据集，再包成 Hugging Face 的 <code>Dataset</code>。真实项目里这一步要几百到几千条，这里先把流程跑顺。</p>

<h4>第六步：套上对话模板（ChatML）</h4>

<pre><code>def format_chat(sample):
    messages = [{"role": "user", "content": sample["instruction"]}, {"role": "assistant", "content": sample["output"]}]
    return {"text": tokenizer.apply_chat_template(messages, tokenize=False)}
formatted_dataset = dataset.map(format_chat)
</code></pre>
<p><strong>代码解析</strong>：<code>apply_chat_template</code> 按 Qwen 自己的格式，把一问一答拼成它训练时见过的样子（<code>&lt;|im_start|&gt;user ... &lt;|im_end|&gt;</code> 这类标记）。模板对不上，微调效果会明显变差。</p>

<h4>第七步：开跑 SFT 并保存权重</h4>

<pre><code>from transformers import TrainingArguments
from trl import SFTTrainer
training_args = TrainingArguments(output_dir="/kaggle/working/qwen_lora_out", per_device_train_batch_size=4, gradient_accumulation_steps=2, learning_rate=2e-4, num_train_epochs=3, fp16=True, logging_steps=10, save_strategy="no")
</code></pre>
<p><strong>代码解析</strong>：单卡批次 4，梯度累积 2 步（等效批次 8）；学习率 \(2 \times 10^{-4}\)，开 FP16。</p>

<pre><code>trainer = SFTTrainer(model=model, train_dataset=formatted_dataset, dataset_text_field="text", max_seq_length=512, args=training_args)
trainer.train()
model.save_pretrained("/kaggle/working/qwen-crossfade-lora")
</code></pre>
<p><strong>代码解析</strong>：<code>SFTTrainer</code> 已经把训练循环封装好了，三行就能开跑。这点数据在 T4 上两三分钟跑完；最后只保存 LoRA 增量，文件只有几兆。</p>

<h3>3. 🧪 完整脚本（整段粘贴即可）</h3>
<p>
  下面是完整脚本。在 Kaggle Notebook 里新建一个单元格，整段粘进去就能跑：
</p>

<pre><code># =====================================================================
# Qwen-2.5-1.5B-Instruct LoRA Fine-Tuning on Kaggle Free T4 GPU
# End-to-End Pipeline for Crossfade & Domain-Specific Adaptation
# =====================================================================

import os
import torch
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# 1. 确认硬件加速状态
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"当前运行设备: {device.upper()} (GPU型号: {torch.cuda.get_device_name(0) if device=='cuda' else 'None'})")

# 2. 加载 Qwen-2.5-1.5B 官方底座
model_id = "Qwen/Qwen2.5-1.5B-Instruct"
print(f"⏳ 正在加载开源底座: {model_id} ...")
tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float16,
    device_map="auto"
)

# 3. 挂载 LoRA 适配层（冻结 99.8% 底座权重）
peft_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, peft_config)
print("📊 参数微调比例如下:")
model.print_trainable_parameters()

# 4. 构造 Crossfade 领域微调语料并应用 ChatML 模版
raw_samples = [
    {"q": "Crossfade 音频过渡时出现中频声压塌陷（Volume Dip），如何解决？", "a": "声压塌陷是因为采用了线性交叉渐变（Linear Fade）。应改用等功率曲线（Equal-Power Fade），满足Gain_A^2 + Gain_B^2 = 1，使得能量在中心点保持平直。"},
    {"q": "如何用数学语言定义 Crossfade 的平滑过渡窗口？", "a": "可定义时间归一化变量 t in [0, 1]，加权衰减窗函数 w1(t) = sqrt(1 - t)，递增窗函数 w2(t) = sqrt(t)，此时输出信号 s(t) = w1(t)*s1(t) + w2(t)*s2(t)，满足恒等能量守恒。"}
] * 40

dataset = Dataset.from_list([{"instruction": s["q"], "output": s["a"]} for s in raw_samples])

def apply_template(item):
    msgs = [{"role": "user", "content": item["instruction"]}, {"role": "assistant", "content": item["output"]}]
    return {"text": tokenizer.apply_chat_template(msgs, tokenize=False)}

formatted_ds = dataset.map(apply_template)

# 5. 启动超轻量微调训练
output_dir = "/kaggle/working/qwen-crossfade-lora"
train_args = TrainingArguments(
    output_dir=output_dir,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    learning_rate=2e-4,
    num_train_epochs=3,
    fp16=True,
    logging_steps=10,
    save_strategy="no",
    report_to="none"
)

trainer = SFTTrainer(
    model=model,
    train_dataset=formatted_ds,
    dataset_text_field="text",
    max_seq_length=512,
    args=train_args
)

print("🚀 开始执行 LoRA 微调训练循环...")
trainer.train()

# 6. 保存微调权重产物
model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)
print(f"🎉 成功！专属 Crossfade 领域的 Qwen LoRA 适配器已安全保存至: {output_dir}")
</code></pre>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 LoRA 微调中，低秩升维矩阵 \(\mathbf{B}\) 为什么在初始化时必须全置为 0？</p>
  <ul class="opts">
    <li>因为置为 0 可以节省 GPU 的运算时间</li>
    <li data-ok>这样第 0 步时 \(\Delta \mathbf{W} = \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}) = \mathbf{0}\)，模型输出与原始底座完全一致，不会被随机权重破坏已有知识</li>
    <li>这样可以使优化器不需要计算梯度</li>
    <li>这是由 PyTorch 静态显存机制强制要求的</li>
  </ul>
  <p class="why">
    如果 \(\mathbf{B}\) 也用随机初始化，训练一开始模型输出就被噪声搅乱，预训练学到的能力会被破坏。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">Qwen2.5-1.5B（\(L=28\)，\(d=1536\)，\(kv\_heads=2\)，\(head\_dim=128\)）上只给 q/v 投影挂 \(r=8\) 的 LoRA，v_proj 每层的 LoRA 参数量是多少？</p>
  <ul class="opts">
    <li>24576（把 v_proj 当成 1536×1536）</li>
    <li data-ok>14336（降维 12288 + 升维 2048）</li>
    <li>2048（只算了升维矩阵）</li>
    <li>12288（只算了降维矩阵）</li>
  </ul>
  <p class="why">
    GQA 下 v_proj 是 1536×256（\(kv\_heads \times head\_dim = 2 \times 128\)），不是 1536×1536：降维 \(A = 1536 \times 8 = 12288\)，升维 \(B = 8 \times 256 = 2048\)，合计 14336。28 层共约 109 万，占 15.4 亿的 0.071%——v 变窄正是 GQA 送的红利，q_proj 每层则是 24576。
  </p>
</div>
`
});
