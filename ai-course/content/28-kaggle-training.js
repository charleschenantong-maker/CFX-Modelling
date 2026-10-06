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
  在真实的数学建模科研、音频工程（Crossfade）或企业级应用中，<strong>没有人会用从零训练的几兆字节玩具模型去解决复杂的现实问题</strong>。
  我们必须站在巨人的肩膀上：以当今全球公认最强的小尺寸开源基座——<strong>阿里通义千问 Qwen-2.5（1.5B 或 7B）</strong>为底座，
  借助<strong>低秩自适应微调技术（LoRA, Low-Rank Adaptation）</strong>，在 Kaggle 免费的 16GB T4 GPU 上，
  将其改造为专属于我们项目的<strong>领域专家大模型</strong>！
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>为什么选择 Qwen-2.5-1.5B-Instruct 作为首选基座？</h4>
  <p>在千百个开源模型中，Qwen-2.5-1.5B 是当前个人算力实验的最优解：</p>
  <ul>
    <li><strong>能力顶级</strong>：在代码生成（HumanEval）、复杂数学推理（MATH）与中文遵循上，性能甚至超越了上一代的 7B / 13B 大模型；</li>
    <li><strong>显存极其友好</strong>：以 16-bit 浮点加载仅需约 3.2 GB 显存，以 4-bit 量化加载仅需约 1.5 GB 显存，在 Kaggle 16GB 的 T4 GPU 上运行游刃有余，留下了充裕的批次和上下文空间；</li>
    <li><strong>生态开放</strong>：完美支持 Hugging Face 生态、vLLM、Ollama 与 llama.cpp，导出部署极其顺畅。</li>
  </ul>
</section>

<h3>1. 为什么不用全量微调？LoRA 核心数学原理解析</h3>
<p>
  如果对一个 15 亿参数（1.5B）的模型执行全量微调（Full Fine-Tuning），反向传播需要为每个参数保存梯度与 AdamW 优化器的一阶/二阶动量状态，需要至少 \(1.5 \times 16 = 24 \text{ GB}\) 显存，直接撑爆单张 T4 显卡。
  <strong>LoRA（Low-Rank Adaptation）</strong>彻底颠覆了这一切：<strong>冻结大模型原本的 99.8% 预训练权重，只在旁边外挂极其轻量的低秩矩阵侧枝</strong>。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：LoRA 秩分解微调数学公式）</h4>
  <p>设大模型原有的冻结权重矩阵为 \(\mathbf{W}_0 \in \mathbb{R}^{d \times k}\)。在微调时，参数物理更新量 \(\Delta \mathbf{W}\) 被显式约束为一个低秩分解乘积：</p>
  \[ \mathbf{h} = \mathbf{W}_0 \mathbf{x} + \Delta \mathbf{W} \mathbf{x} = \mathbf{W}_0 \mathbf{x} + \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}) \mathbf{x} \]
  <ul>
    <li>\(\mathbf{W}_0\)：预训练大模型固有的稠密权重矩阵，在整个微调过程中<strong>完全冻结（requires_grad=False），不产生任何优化器动量开销</strong>；</li>
    <li>\(\mathbf{A} \in \mathbb{R}^{r \times k}\)：低秩降维矩阵，使用高斯随机正态分布初始化；</li>
    <li>\(\mathbf{B} \in \mathbb{R}^{d \times r}\)：低秩升维矩阵，初始全置为 0，<strong>确保微调启动第 0 步时 \(\mathbf{B} \cdot \mathbf{A} = \mathbf{0}\)，模型输出行为与原版底座 100% 严格一致</strong>；</li>
    <li>\(r\)（Rank）：低秩内在维度（通常取 8 或 16）；</li>
    <li>\(\alpha\)（Lora Alpha）：恒定缩放因子（通常取 \(2 \times r\)，如 16 或 32），用于稳定不同秩下的学习率步长。</li>
  </ul>
</section>

<h3>2. 逐行手写 Qwen-2.5 的加载与 LoRA 微调</h3>
<p>
  在 Kaggle Notebook 中，我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，完成大模型微调全流程。
</p>

<h4>第一步：安装现代大模型微调依赖全家桶</h4>

<pre><code>!pip install -q transformers peft trl accelerate bitsandbytes datasets
</code></pre>
<p><strong>代码解析</strong>：通过 pip 静默安装 Hugging Face 核心套件：<code>transformers</code>（模型核心库）、<code>peft</code>（高效参数微调库）、<code>trl</code>（Transformer 强化与监督微调库）以及 <code>accelerate</code>（底层硬件自动加速分配）。</p>

<h4>第二步：加载 Qwen-2.5 分词器与 ChatML 提示词模版</h4>

<pre><code>from transformers import AutoTokenizer
model_id = "Qwen/Qwen2.5-1.5B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_id)
</code></pre>
<p><strong>代码解析</strong>：指定 Hugging Face 上官方开源的 <code>Qwen2.5-1.5B-Instruct</code> 仓库路径；自动下载并实例化分词器（内置 15 万词表的 Tiktoken BPE 实现）。</p>

<pre><code>tokenizer.pad_token = tokenizer.eos_token
print("词表大小:", len(tokenizer), "| 填充标记 Pad Token:", tokenizer.pad_token)
</code></pre>
<p><strong>代码解析</strong>：因大模型自回归默认无填充标记，将句子结束符 <code>eos_token</code>（<code>&lt;|im_end|&gt;</code>）赋给 <code>pad_token</code>，确保批量输入时长短句能够整齐对齐。</p>

<h4>第三步：以半精度加载 Qwen-2.5 真实底座模型</h4>

<pre><code>import torch
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16, device_map="auto")
</code></pre>
<p><strong>代码解析</strong>：以 <code>float16</code> 半精度将 Qwen-2.5 的 15 亿参数加载进显存（Kaggle 免费 T4 为 Turing 架构，不支持 <code>bfloat16</code> 原生计算，此处必须用 <code>float16</code>，与附录 B 的硬件嗅探回退逻辑一致）；<code>device_map="auto"</code> 会自动识别当前 GPU 硬件并无缝放置在 T4 上（显存占用仅约 3.2 GB）。</p>

<h4>第四步：构建并注入 LoRA 适配器（PEFT）</h4>

<pre><code>from peft import LoraConfig, get_peft_model
peft_config = LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"], lora_dropout=0.05, bias="none", task_type="CAUSAL_LM")
</code></pre>
<p><strong>代码解析</strong>：定义 LoRA 拓扑配置：设置内在秩 \(r=8\)，缩放系数 \(\alpha=16\)；将低秩旁路注入至自注意力机制的查询（<code>q_proj</code>）和数值（<code>v_proj</code>）投影层中。</p>

<pre><code>model = get_peft_model(model, peft_config)
model.print_trainable_parameters()
</code></pre>
<p><strong>代码解析</strong>：将 LoRA 适配层物理挂载至底座模型上；调用 <code>print_trainable_parameters()</code> 会惊人地显示：<strong>可训练参数量从 15.4 亿陡降至仅约 109 万（占比约 0.07%）</strong>！显存开销暴降 80% 以上！</p>

<h4>第五步：准备领域微调数据集（以 Crossfade 任务为例）</h4>

<pre><code>from datasets import Dataset
train_data = [
    {"instruction": "给出音频 Crossfade 两个轨道的过渡曲线推荐参数。", "output": "建议采用等功率对数过渡曲线（Equal Power Crossfade），将轨道 A 设为 cos(t*pi/2)，轨道 B 设为 sin(t*pi/2)，保证重叠区域能量平方和守恒，消除声压凹陷。"},
    {"instruction": "Crossfade 数学建模中采样率不匹配应如何处理？", "output": "在执行重叠相加（Overlap-Add）之前，必须调用多相滤波插值算法（Polyphase Resampling）将从属音频轨重采样至主轨相同采样率（如 44.1kHz），以杜绝相位偏移与高频混叠。"}
] * 50
dataset = Dataset.from_list(train_data)
</code></pre>
<p><strong>代码解析</strong>：构造专业指令-回答训练对，模拟将通用大模型调教为精通 Crossfade 算法与音频数学建模的专用 Agent；将其包装为标准 Hugging Face <code>Dataset</code> 对象。</p>

<h4>第六步：应用标准对话模版（ChatML Formatting）</h4>

<pre><code>def format_chat(sample):
    messages = [{"role": "user", "content": sample["instruction"]}, {"role": "assistant", "content": sample["output"]}]
    return {"text": tokenizer.apply_chat_template(messages, tokenize=False)}
formatted_dataset = dataset.map(format_chat)
</code></pre>
<p><strong>代码解析</strong>：调用 Qwen 官方的 <code>apply_chat_template</code> 将用户提问与助手回答自动格式化为带 <code>&lt;|im_start|&gt;user ... &lt;|im_end|&gt;&lt;|im_start|&gt;assistant ...</code> 的严密对话标记序列。</p>

<h4>第七步：启动 SFT 监督微调循环并持久化权重</h4>

<pre><code>from transformers import TrainingArguments
from trl import SFTTrainer
training_args = TrainingArguments(output_dir="/kaggle/working/qwen_lora_out", per_device_train_batch_size=4, gradient_accumulation_steps=2, learning_rate=2e-4, num_train_epochs=3, fp16=True, logging_steps=10, save_strategy="no")
</code></pre>
<p><strong>代码解析</strong>：配置训练参数：单卡 Batch Size 为 4，结合 2 步梯度累积（等效 Batch Size = 8）；学习率设为 \(2 \times 10^{-4}\)，启用 FP16 混合精度加速。</p>

<pre><code>trainer = SFTTrainer(model=model, train_dataset=formatted_dataset, dataset_text_field="text", max_seq_length=512, args=training_args)
trainer.train()
model.save_pretrained("/kaggle/working/qwen-crossfade-lora")
</code></pre>
<p><strong>代码解析</strong>：实例化工业级微调器 <code>SFTTrainer</code> 并启动训练，在 T4 GPU 上只需 2~3 分钟即可完成！最后将训练好的 LoRA 增量权重持久化保存至 <code>/kaggle/working/qwen-crossfade-lora</code>（文件大小仅数兆字节）。</p>

<h3>3. 🧪 模块完整整合代码清单（Complete Kaggle Fine-Tuning Script）</h3>
<p>
  下面是完整的可运行脚本，直接在 Kaggle Notebook 中新建单元格粘贴运行即可完整走通：
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
    output_dir="/tmp/lora_checkpoints",
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
    <li data-ok>使得初始时增量矩阵 \(\Delta \mathbf{W} = \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}) = \mathbf{0}\)，从而保证在微调启动的第 0 步，模型的推理行为与原本强大的开源预训练底座 100% 严格一致，防止随机权重破坏已有知识</li>
    <li>这样可以使优化器不需要计算梯度</li>
    <li>这是由 PyTorch 静态显存机制强制要求的</li>
  </ul>
  <p class="why">
    如果 \(\mathbf{B}\) 也采用随机高斯初始化，刚开始训练时初始模型输出就会被随机噪声严重污染，导致预训练积累的通识能力被瞬间“震坏”。
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
