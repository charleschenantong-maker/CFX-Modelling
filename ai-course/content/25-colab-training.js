/* content/25-colab-training.js — 模块 25：Colab 1.5B 开源大模型实战训练与部署 */
COURSE.register({
  id: "m25",
  part: 6,
  num: "25",
  title: "实战闭环：在 Google Colab 上训练 1.5B 开源大模型并量化部署",
  en: "Hands-on 1.5B Model Training on Google Colab & Local Deployment",
  minutes: 50,
  tags: ["实战", "Colab Pro", "QLoRA", "1.5B模型", "GGUF导出"],
  body: String.raw`
<p class="lead">
  在前前面的二十四讲中，你已经推导了从标量计算图、注意力矩阵、KV Cache 到分布式并行的全部数学底座。
  但学 AI 绝不能只停留在黑板与推导上——你必须亲自经历一次「数据进、损失降、权重出、本地跑」的工程闭环。
  很多初学者在本地笔记本上尝试运行 1.7B 或更大模型时，常常感叹「为什么又笨又慢、风扇狂转还经常卡死」？
  本讲针对这一现实痛点，利用 Google Colab Pro 云端 GPU（T4 或 A100）的充沛算力，
  手把手带你完成一个 <strong>1.5B 级别开源大模型（以高性价比的 Qwen2.5-1.5B 为例）的指令微调（SFT）全流程</strong>。
  从显存账本精确手算、LoRA 奇异值低秩分解、NF4 四位量化数学原理，到一键合并导出 GGUF 并在本地极速秒回，
  彻底打通算法理论到端侧生产落地的最后一公里。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>学习目标：掌握端到端大模型工程闭环</h4>
  <p>
    完成本讲后，你将能够独立做到：
    <strong>①</strong> 纸面精确手算 1.5B 模型在全参数、LoRA 与 QLoRA 下的显存开销，准确避开 CUDA OOM 陷阱；
    <strong>②</strong> 用 STEP 级奇异值分解（SVD）几何理解 LoRA 的内在低秩假设，证明权重初始化的数学精妙性；
    <strong>③</strong> 亲手编写基于 Hugging Face <code>peft</code>、<code>transformers</code> 与 <code>trl</code> 的生产级微调脚本；
    <strong>④</strong> 掌握 Label Masking（标签掩码）机制，明白为什么损失只对助手回答计算；
    <strong>⑤</strong> 将云端微调后的 Adapter 权重与基座合并，并量化转换为 GGUF 格式，实现本地无网离线毫秒级推理。
  </p>
</section>

<h3>1. 痛点破局：为什么本地慢？为什么要在云端训练？</h3>
<p>
  许多人在本地电脑体验小模型（如 1.5B ~ 1.7B）时，常有两大抱怨：<strong>回答指令不听话</strong>，且<strong>每秒吐字极慢</strong>。
  这背后是两个物理现实：
</p>
<ul>
  <li><strong>算力与内存带宽壁垒</strong>：大模型自回归解码是受内存带宽限制（Memory Bandwidth Bound）的。
      本地普通 CPU 搭配 DDR4/DDR5 内存，带宽通常只有 30 ~ 60 GB/s；
      而哪怕是 Google Colab 免费提供的英伟达 T4 也有 300 GB/s，A100 更有 1.5 ~ 2.0 TB/s 的高带宽显存（HBM2）。
      训练涉及庞大的反向传播全微分计算，在本地普通电脑上几乎不可行。</li>
  <li><strong>基座模型 vs 对齐模型</strong>：刚下载的基座模型（Base Model）是一个单纯的「文本续写补全机」，
      它根本不知道什么叫「你问我答」。要让它具备问答逻辑，必须经过高质量指令监督微调（Supervised Fine-Tuning, SFT）。</li>
</ul>
<p>
  <strong>最优解工程策略</strong>：<strong>云端（Google Colab）微调大模型，端侧（本地电脑）量化流式推理。</strong>
</p>

<h3>2. 纸面精算：1.5B 模型的显存账本</h3>
<p>
  在启动任何 GPU 训练任务之前，合格的算法工程师必须先在草稿纸上算清显存开销。
  设模型参数量为 \(N = 1.54 \times 10^9\)（约 1.54B 参数）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>方案一：全参数微调（Full Fine-Tuning）的显存崩溃分析</h4>
  <p>全参数微调时，显存由四个刚性部分构成（按 16 位浮点数 half precision 计算）：</p>
  <ol>
    <li><strong>模型静态权重</strong>：每个参数 2 字节（fp16 / bf16）：
      \[ M_{\text{weights}} = 1.54 \times 10^9 \times 2 \text{ bytes} \approx 3.08 \text{ GB} \]
    </li>
    <li><strong>反向传播梯度</strong>：每个可训练参数对应一个梯度标量（fp16 / bf16）：
      \[ M_{\text{grads}} = 1.54 \times 10^9 \times 2 \text{ bytes} \approx 3.08 \text{ GB} \]
    </li>
    <li><strong>AdamW 优化器状态</strong>：AdamW 必须维护一阶动量（fp32，4 字节）、二阶动量（fp32，4 字节）以及主权重备份（fp32，4 字节），合计每参数 12 字节：
      \[ M_{\text{opt}} = 1.54 \times 10^9 \times 12 \text{ bytes} \approx 18.48 \text{ GB} \]
    </li>
    <li><strong>前向激活值（Activations）</strong>：设 batch size 为 4，序列长度为 2048，未开启梯度检查点时占用约 \(4 \sim 8 \text{ GB}\)。</li>
  </ol>
  <p>
    <strong>总显存需求</strong>：
    \[ M_{\text{total}} = 3.08 + 3.08 + 18.48 + 6.00 \approx 30.64 \text{ GB} \]
    结论：一块 16GB 的 T4 显卡在执行第 1 个 step 时就会瞬间遭遇 <code>CUDA Out of Memory</code> 崩溃！
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>方案二：QLoRA 4-bit 救赎账本（极简优雅）</h4>
  <p>
    QLoRA（Dettmers et al., 2023）通过三大数学创新彻底重构了显存账本：
  </p>
  <ol>
    <li><strong>NF4 四位量化基座</strong>：基座参数被压缩为 4 位（0.5 字节）：
      \[ M_{\text{base}} = 1.54 \times 10^9 \times 0.5 \text{ bytes} \approx 0.77 \text{ GB} \]
    </li>
    <li><strong>低秩适配器（LoRA，秩 \(r=16\)）</strong>：仅对注意力与 MLP 的投影矩阵外挂低秩侧支，可训练参数仅占总量的 \(0.2\%\)（约 \(3 \times 10^6\) 参数）：
      \[ M_{\text{lora\_opt}} = 3 \times 10^6 \times 16 \text{ bytes} \approx 0.048 \text{ GB} \]
    </li>
    <li><strong>梯度检查点（Gradient Checkpointing）</strong>：用时间换空间，前向不保存中间层激活，反向时局部重算，将激活显存压低至约 \(1.2 \text{ GB}\)。</li>
  </ol>
  <p>
    <strong>QLoRA 训练总显存</strong>：
    \[ M_{\text{total}} = 0.77 + 0.05 + 1.20 + 0.50 \approx 2.52 \text{ GB} \sim 4.50 \text{ GB} \]
    <strong>工程结论</strong>：在 Google Colab 最基础的 16GB T4 GPU 上，显存占用还不到 \(30\%\)，你可以从容开大 batch size 和更长上下文！
  </p>
</section>

<h3>3. STEP 级数学内核：LoRA 的低秩流形与 SVD 本质</h3>
<p>
  为什么我们不需要改动原模型的 1.5B 权重，只训练极其少量的旁路矩阵就能让模型脱胎换骨？
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>定理推导：内在维度与矩阵低秩分解</h4>
  <p>
    考虑神经网络中任意一个冻结的线性投影层：\(h = W_0 x\)，其中 \(W_0 \in \mathbb{R}^{d \times k}\)。
    微调时，参数更新量为 \(\Delta W \in \mathbb{R}^{d \times k}\)，更新后的前向计算为：
  </p>
  \[ h = (W_0 + \Delta W) x = W_0 x + \Delta W x \]
  <p>
    <strong>Aghajanyan 等人（2020）的内在维度假设</strong>：
    预训练大语言模型的参数虽然处于极高维的欧氏空间，但针对特定下游任务有效微调所需的更新矩阵 \(\Delta W\)，
    其本质上落在秩极低的内在子空间（Intrinsic Low-rank Subspace）中。
  </p>
  <p>
    因此，我们将全秩矩阵 \(\Delta W\) 分解为两个低秩矩阵的乘积：
  </p>
  \[ \Delta W = \frac{\alpha}{r} (B \cdot A) \]
  <p>
    其中 \(B \in \mathbb{R}^{d \times r}\)，\(A \in \mathbb{R}^{r \times k}\)，且内在秩 \(r \ll \min(d, k)\)。\(\alpha\) 为常数缩放因子。
  </p>
  <p><strong>参数缩减比严格计算</strong>：</p>
  <p>
    以 Qwen2.5-1.5B 中隐藏维度 \(d = 1536\)，投影维度 \(k = 1536\)，设秩 \(r = 16\)：<br/>
    全矩阵参数量：
  </p>
  \[ N_{\text{full}} = 1536 \times 1536 = 2,359,296 \]
  <p>LoRA 旁路参数量：</p>
  \[ N_{\text{LoRA}} = (1536 \times 16) + (16 \times 1536) = 49,152 \]
  <p>参数压缩比例：</p>
  \[ \text{Ratio} = \frac{49,152}{2,359,296} = \frac{2r}{d} = \frac{32}{1536} \approx 2.08\% \]
  <p>
    <strong>初始化数学巧思（零扰动起步定理）</strong>：
    在代码中，矩阵 \(A\) 采用高斯分布 \(\mathcal{N}(0, \sigma^2)\) 初始化，而矩阵 \(B\) <strong>严格初始化为全 0 矩阵</strong>！
    因此在微调刚开始的第 0 步：
  </p>
  \[ \Delta W = B \cdot A = \mathbf{0} \cdot A = \mathbf{0} \]
  <p>
    此时前向输出 \(h = W_0 x + \mathbf{0} = W_0 x\)，模型完全保留了预训练基座的所有知识与语言能力，
    消除了随机初始化带来的性能毁灭性扰动。
  </p>
</section>

<h3>4. 数据工程：ChatML 结构与助手掩码（Label Masking）</h3>
<p>
  微调模型不能直接塞进散乱的文章，必须使用符合工业规范的对话模板（ChatML 格式）。
  一条标准的单轮/多轮指令样本由系统预设（system）、用户指令（user）与模型回复（assistant）构成：
</p>
<pre><code>&lt;|im_start|&gt;system
你是一个严谨的数学与代码导师，回答简明扼要，直击本质。&lt;|im_end|&gt;
&lt;|im_start|&gt;user
请用一句话解释为什么 Softmax 满足平移不变性。&lt;|im_end|&gt;
&lt;|im_start|&gt;assistant
因为在分子分母同时乘除指数偏置 exp(c) 后该公因子被严格消去。&lt;|im_end|&gt;</code></pre>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>核心机制：为什么不能对 Prompt 计算损失？（Data Collator 的秘密）</h4>
  <p>
    模型在前向传播时处理了整段文本，但在反向传播计算交叉熵损失时，
    <strong>必须且只能计算 Assistant 回复部分的 Token 损失！</strong>
  </p>
  <p>
    <strong>数学原因</strong>：System 和 User 部分是人类的输入提示。如果我们强迫模型去预测「用户会提什么问题」，
    模型就会把宝贵的参数容量浪费在记忆各种千奇百怪的提问语气上。
    在 PyTorch 中，通过将标签张量（Labels）中对应 Prompt 的位置填充为特殊数值 <code>-100</code>，
    底层 <code>torch.nn.CrossEntropyLoss(ignore_index=-100)</code> 会自动跳过这些位置，
    实现 100% 聚焦于「如何输出高品质回答」。
  </p>
</section>

<h3>5. 教科书级实操：Google Colab 端到端训练脚本</h3>
<p>
  以下 Python 脚本可在 Google Colab（选择 GPU T4 运行时）中直接完整执行：
</p>

<pre><code><span class="cm"># [逐行剖析] 1. 安装微调核心生态三件套</span>
<span class="cm"># !pip install -q -U transformers datasets peft trl bitsandbytes accelerate</span>

<span class="kw">import</span> torch
<span class="kw">from</span> datasets <span class="kw">import</span> Dataset
<span class="kw">from</span> transformers <span class="kw">import</span> (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
<span class="kw">from</span> peft <span class="kw">import</span> LoraConfig, get_peft_model, prepare_model_for_kbit_training
<span class="kw">from</span> trl <span class="kw">import</span> SFTTrainer

<span class="cm"># [逐行剖析] 2. 准备指令样本数据集（示例构造 2 条精简样本）</span>
train_data = [
    {
        <span class="st">"messages"</span>: [
            {<span class="st">"role"</span>: <span class="st">"system"</span>, <span class="st">"content"</span>: <span class="st">"你是一个专业的数学与算法分析助手。"</span>},
            {<span class="st">"role"</span>: <span class="st">"user"</span>, <span class="st">"content"</span>: <span class="st">"简述为什么计算图反向传播必须按拓扑逆序执行？"</span>},
            {<span class="st">"role"</span>: <span class="st">"assistant"</span>, <span class="st">"content"</span>: <span class="st">"因为根据多元链式法则，父节点必须在其所有消费子节点的局部偏导回传累加完毕后，才能算出自身完整的总导数。"</span>}
        ]
    },
    {
        <span class="st">"messages"</span>: [
            {<span class="st">"role"</span>: <span class="st">"system"</span>, <span class="st">"content"</span>: <span class="st">"你是一个专业的数学与算法分析助手。"</span>},
            {<span class="st">"role"</span>: <span class="st">"user"</span>, <span class="st">"content"</span>: <span class="st">"什么是 LoRA 的秩 r？"</span>},
            {<span class="st">"role"</span>: <span class="st">"assistant"</span>, <span class="st">"content"</span>: <span class="st">"秩 r 代表低秩矩阵分解的瓶颈维度，它约束了模型微调时参数更新量 Delta W 能够探索的内在特征子空间维度。"</span>}
        ]
    }
]
dataset = Dataset.from_list(train_data)

<span class="cm"># [逐行剖析] 3. 配置 NF4 四位量化参数（将 1.5B 权重压入 0.8GB 显存）</span>
model_id = <span class="st">"Qwen/Qwen2.5-1.5B-Instruct"</span>
bnb_config = BitsAndBytesConfig(
    load_in_4bit=<span class="kw">True</span>,
    bnb_4bit_quant_type=<span class="st">"nf4"</span>,               <span class="cm"># 采用对正态分布最优的 NormalFloat4 分位质量化</span>
    bnb_4bit_compute_dtype=torch.bfloat16,   <span class="cm"># 矩阵乘法计算精度采用 bfloat16 避免溢出</span>
    bnb_4bit_use_double_quant=<span class="kw">True</span>           <span class="cm"># 开启双重量化，进一步节省量化常数显存</span>
)

<span class="cm"># [逐行剖析] 4. 加载基座分词器与量化模型</span>
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=<span class="kw">True</span>)
tokenizer.pad_token = tokenizer.eos_token     <span class="cm"># 补全 padding token 设定</span>

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map=<span class="st">"auto"</span>,                        <span class="cm"># 自动映射至当前 Colab GPU</span>
    trust_remote_code=<span class="kw">True</span>
)

<span class="cm"># [逐行剖析] 5. 为量化模型启用梯度检查点与类型转换预处理</span>
model = prepare_model_for_kbit_training(model)

<span class="cm"># [逐行剖析] 6. 挂载 LoRA 适配器配置</span>
peft_config = LoraConfig(
    r=16,                                    <span class="cm"># 内在低秩维度设定为 16</span>
    lora_alpha=32,                           <span class="cm"># 缩放因子 alpha=32（常设为 2*r）</span>
    target_modules=[<span class="st">"q_proj"</span>, <span class="st">"k_proj"</span>, <span class="st">"v_proj"</span>, <span class="st">"o_proj"</span>, <span class="st">"gate_proj"</span>, <span class="st">"up_proj"</span>, <span class="st">"down_proj"</span>],
    lora_dropout=0.05,
    bias=<span class="st">"none"</span>,
    task_type=<span class="st">"CAUSAL_LM"</span>
)
model = get_peft_model(model, peft_config)
model.print_trainable_parameters()           <span class="cm"># 打印验证：可训练参数量应仅约占 0.2%</span>

<span class="cm"># [逐行剖析] 7. 训练超参数设定</span>
training_args = TrainingArguments(
    output_dir=<span class="st">"./qwen1.5b-lora-output"</span>,
    per_device_train_batch_size=2,          <span class="cm"># 单卡批大小</span>
    gradient_accumulation_steps=4,           <span class="cm"># 梯度累积 4 步，等效总 Batch Size = 8</span>
    learning_rate=2e-4,                      <span class="cm"># LoRA 微调学习率通常显著大于全参数预训练（2e-4 vs 2e-5）</span>
    lr_scheduler_type=<span class="st">"cosine"</span>,              <span class="cm"># 余弦衰减调度</span>
    warmup_ratio=0.1,                        <span class="cm"># 10% 步数用于 Warmup 线性预热</span>
    logging_steps=1,
    max_steps=20,                            <span class="cm"># 实战演示设定 20 步</span>
    fp16=<span class="kw">False</span>,
    bf16=torch.cuda.is_bf16_supported(),     <span class="cm"># GPU 支持则优先开启 bf16</span>
    save_strategy=<span class="st">"no"</span>
)

<span class="cm"># [逐行剖析] 8. 启动 SFT 训练循环</span>
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=training_args,
    peft_config=peft_config
)
trainer.train()

<span class="cm"># [逐行剖析] 9. 仅保存极轻量的 LoRA 权重适配器（仅几十 MB）</span>
trainer.model.save_pretrained(<span class="st">"./my_lora_adapter"</span>)
tokenizer.save_pretrained(<span class="st">"./my_lora_adapter"</span>)
print(<span class="st">"云端微调完毕！LoRA 适配器权重已成功保存。"</span>)</code></pre>

<h3>6. 落地部署：权重合并与导出为 4-bit GGUF</h3>
<p>
  微调完成后，你得到的是一个只有几十兆字节的 <code>adapter_model.safetensors</code>。
  如何在本地单机无网环境实现几十毫秒的流畅推理？
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>第一步：代数意义上的显存合并（Weight Merge）</h4>
  <p>
    在推理时，我们绝不需要在每一步单独算两次矩阵乘法 \(W_0 x + B(Ax)\)。
    根据矩阵乘法的分配律，直接将 LoRA 权重一次性加回基座权重：
  </p>
  \[ W_{\text{merged}} = W_0 + \frac{\alpha}{r} (B \cdot A) \]
  <p>在 Python 中只需两行代码：</p>
<pre><code><span class="kw">from</span> peft <span class="kw">import</span> PeftModel
base_model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16, device_map=<span class="st">"cpu"</span>)
merged_model = PeftModel.from_pretrained(base_model, <span class="st">"./my_lora_adapter"</span>).merge_and_unload()
merged_model.save_pretrained(<span class="st">"./qwen1.5b-merged"</span>)</code></pre>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>第二步：转为 GGUF 格式并在本地运行</h4>
  <p>
    合并后的模型是标准的 16-bit 浮点权重（约 3.1GB）。
    利用著名的 <code>llama.cpp</code> 工具链将其量化为现代 CPU / 移动端通用的 <strong>GGUF Q4_K_M</strong> 格式：
  </p>
<pre><code><span class="cm"># 1. 克隆 llama.cpp 并转换为 gguf 格式</span>
git clone https://github.com/ggerganov/llama.cpp
python llama.cpp/convert_hf_to_gguf.py ./qwen1.5b-merged --outfile qwen1.5b-f16.gguf

<span class="cm"># 2. 执行 Q4_K_M 4 位量化（将体积进一步压至约 0.98 GB）</span>
./llama.cpp/llama-quantize qwen1.5b-f16.gguf qwen1.5b-q4_k_m.gguf Q4_K_M

<span class="cm"># 3. 本地 CPU 终端极速推理（无需任何独显！）</span>
./llama.cpp/llama-cli -m qwen1.5b-q4_k_m.gguf -p "数学中的奇异值分解本质是什么？" -n 128</code></pre>
  <p>
    此时，原本在本地又慢又卡的 1.5B 模型，由于整机体积被压缩至不足 1GB，
    完全被读入 CPU 的高速 L3 缓存与系统物理内存中，
    推理速度可达到每秒 40 ~ 70 Token 的极速流式体验！
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在全参数微调一个 1.5B 模型时，如果使用 AdamW 优化器，仅优化器状态本身就需要消耗多少 GB 显存？</p>
  <ul class="opts">
    <li>约 3.08 GB</li>
    <li>约 6.16 GB</li>
    <li data-ok>约 18.48 GB</li>
    <li>不到 1 GB</li>
  </ul>
  <p class="why">
    AdamW 需要维护每个参数的 FP32 一阶动量（4 字节）、FP32 二阶动量（4 字节）以及 FP32 主权重备份（4 字节），合计每参数 12 字节。对于 1.54B 参数：\(1.54 \times 12 \approx 18.48\text{ GB}\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 LoRA 微调中，若将输入投影矩阵 \(W \in \mathbb{R}^{2048 \times 2048}\) 分解为 \(B \cdot A\)，设定低秩 \(r = 16\)，参数量缩减到了原来的大约多少？</p>
  <ul class="opts">
    <li>50%</li>
    <li>10%</li>
    <li data-ok>约 1.56%</li>
    <li>0.01%</li>
  </ul>
  <p class="why">
    原矩阵参数量为 \(2048 \times 2048 = 4,194,304\)。LoRA 参数量为 \((2048 + 2048) \times 16 = 65,536\)。比例为 \(\frac{65536}{4194304} = \frac{2 \times 16}{2048} = \frac{32}{2048} = \frac{1}{64} \approx 1.56\%\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">为什么 LoRA 的矩阵 \(B\) 在初始化时必须全部置为 0，而矩阵 \(A\) 采用高斯分布初始化？</p>
  <ul class="opts">
    <li>为了让矩阵乘法能够并行计算</li>
    <li data-ok>保证初始增量 \(\Delta W = B \cdot A = 0\)，使得微调开始瞬间模型完全等价于预训练基座模型</li>
    <li>防止梯度反向传播时出现除以 0</li>
    <li>这是 PyTorch 的强制命名规则</li>
  </ul>
  <p class="why">
    若 \(B\) 与 \(A\) 均为随机初始化，初始 \(\Delta W\) 将是非零随机噪声，微调一开始就会严重破坏基座模型已学到的权重分布。令 \(B=0\) 保证了初始步 \(\Delta W = 0\)，平滑起步。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在 SFT（监督指令微调）的数据处理阶段，为什么必须把 User 提问部分的标签（Label）设置为 -100？</p>
  <ul class="opts">
    <li>因为 User 提问通常有错别字</li>
    <li>为了节省磁盘存储空间</li>
    <li data-ok>防止损失函数对 Prompt 进行梯度惩罚，使模型全力专注于优化 Assistant 回复的条件概率</li>
    <li>通知分词器截断句子</li>
  </ul>
  <p class="why">
    在 PyTorch 交叉熵损失函数中，<code>ignore_index=-100</code> 会忽略所有标签为 -100 的位置。这样模型反向传播时只对生成的助手答案计算交叉熵，避免模型浪费参数去强行拟合用户五花八门的提问方式。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">在将 LoRA 适配器（Adapter）合并进基座模型后，为什么在本地部署推理时不需要保留 PEFT 库？</p>
  <ul class="opts">
    <li>因为 PEFT 库不支持 CPU 推理</li>
    <li data-ok>因为矩阵满足分配律，\(W_{\text{merged}} = W_0 + \frac{\alpha}{r} BA\) 已经代数合并为单个稠密权重矩阵，结构与原基座完全相同</li>
    <li>因为 LoRA 参数在合并后被删除了</li>
    <li>因为必须转为 Python 字典才能读取</li>
  </ul>
  <p class="why">
    \(W_0 x + \Delta W x = (W_0 + \Delta W) x\)。合并操作直接在离线状态下把低秩增量矩阵乘积累加进了原本的权重矩阵中，前向传播只需一次标准矩阵乘法，完全摆脱了对 PEFT 动态分支代码的依赖。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">为什么 QLoRA 可以把 1.5B 模型的基座显存从 3.08GB（FP16）直接压缩至约 0.77GB？</p>
  <ul class="opts">
    <li>删除了 75% 的层数</li>
    <li>把序列上下文长度截断了</li>
    <li data-ok>采用了 NF4（NormalFloat4）4-bit 数据类型，每个参数仅占用 4 位（0.5 字节），存储空间缩减为原来的四分之一</li>
    <li>使用了稀疏注意力剪枝</li>
  </ul>
  <p class="why">
    FP16 每个浮点数占用 16 位（2 字节），而 NF4 针对预训练权重近似正态分布的先验特性，用 4 位二进制（0.5 字节）精准表示 16 个信息分位点。每个参数显存开销从 2 字节降至 0.5 字节，压缩比严格为 \(4:1\)。
  </p>
</div>
`
});
