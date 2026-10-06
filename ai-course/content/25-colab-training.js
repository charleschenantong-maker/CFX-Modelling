/* content/25-colab-training.js — 模块 25：Colab 1.5B 开源大模型实战训练与部署 */
COURSE.register({
  id: "m25",
  part: 5,
  num: "25",
  title: "实战闭环：在 Kaggle 上训练 1.5B 开源大模型并量化导出（免费 T4 GPU 实战）",
  en: "Hands-on 1.5B Model Training on Kaggle & Local Deployment",
  minutes: 50,
  tags: ["实战", "Kaggle", "QLoRA", "1.5B模型", "GGUF导出"],
  body: String.raw`
<p class="lead">
  在前面的二十四讲中，你已经推导了从标量计算图、注意力矩阵、KV Cache 到分布式并行的全部数学底座。
  但学 AI 绝不能只停留在黑板与推导上——你必须亲自经历一次「数据进、损失降、权重出、本地跑」的工业级工程闭环。
  很多初学者在本地笔记本上尝试运行 1.7B 或更大模型时，常常感叹「为什么又笨又慢、风扇狂转还经常卡死」？
  本讲针对这一现实痛点，面向利用 Kaggle 免费 GPU（支持双卡 T4 ×2 或单卡 T4，每周 30 小时算力）的学生，
  手把手带你完成一个 <strong>1.5B 级别开源大模型（以高性价比的 Qwen2.5-1.5B 为例）的指令微调（SFT）全流程</strong>。
  从 NF4 四位量化分位点编码、双重量化数学手算、LoRA 秩矩阵乘积、ChatML 标签掩码机制，到 Kaggle 实战避坑与一键导出 GGUF 本地毫秒级秒回，
  彻底打通算法理论到端侧生产落地的最后一公里。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>学习目标：掌握端到端大模型工程闭环</h4>
  <p>
    完成本讲后，你将能够独立做到：
    <strong>①</strong> 在草稿纸上纯手工精算 1.5B 模型在全参数、LoRA 与 QLoRA 下的真实 MB 级显存账本，精确避开 CUDA OOM 陷阱；
    <strong>②</strong> 深入理解 NF4（NormalFloat4）四位最优分位点编码与双重量化（Double Quantization）的信息论本质；
    <strong>③</strong> 掌握 ChatML 数据格式与 Label Masking（标签掩码）机制，手算追踪 10-Token 玩具序列的交叉熵损失参与状态；
    <strong>④</strong> 编写并运行基于 <code>peft</code>、<code>transformers</code> 与 <code>trl</code> 的生产级微调脚本，避开 Colab T4 / A100 的 3 种典型暗礁；
    <strong>⑤</strong> 将微调得到的 LoRA 适配器权重与基座合并，导出为现代 GGUF 格式并在本地终端实现免显卡离线极速推理。
  </p>
</section>

<h3>1. 痛点破局：为什么本地慢？为什么要在云端训练？</h3>
<p>
  许多人在本地笔记本体验小模型（如 1.5B ~ 1.7B）时，常有两大抱怨：<strong>回答指令不听话</strong>，且<strong>每秒吐字极慢</strong>。
  这背后是两个物理现实：
</p>
<ul>
  <li><strong>算力与内存带宽壁垒</strong>：大模型自回归解码是受内存带宽限制（Memory Bandwidth Bound）的。
      本地普通 CPU 搭配 DDR4/DDR5 内存，带宽通常只有 30 ~ 60 GB/s；
      而 Kaggle 提供的英伟达 T4（支持单卡 16GB 或双卡 T4 ×2 共 32GB） 拥有 300 GB/s 显存带宽，A100 更拥有高达 1.5 ~ 2.0 TB/s 的高带宽显存（HBM2）。
      训练涉及庞大的反向传播全微分计算，在本地普通电脑上几乎不可行。</li>
  <li><strong>基座模型 vs 对齐模型</strong>：刚下载的基座模型（Base Model）是一个单纯的「文本续写补全机」，
      它根本不知道什么叫「你问我答」。要让它具备精准遵循人类指令的问答逻辑，必须经过高质量指令监督微调（Supervised Fine-Tuning, SFT）。</li>
</ul>
<p>
  <strong>最优解工程策略</strong>：<strong>云端（Kaggle Notebooks）微调大模型，端侧（本地电脑）量化流式推理。</strong>
</p>

<h3>2. 显存底座：LoRA 与 QLoRA 数学内核草稿纸</h3>
<p>
  给 Charles 的草稿纸第一步：先推导核心数学定义，再进入具体的显存预算账本。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：NF4 分位点量化、双重量化与 LoRA 秩积推导</h4>
  <p>
    <strong>前置定义 1（NF4 四位量化分位点编码）：</strong>
    预训练语言模型的权重张量经验上高度逼近零均值正态分布 \(W \sim \mathcal{N}(0, \sigma^2)\)。
    若采用传统的均匀量化（Uniform Quantization），量化区间在分布两侧极稀疏的尾部与中间高密度区域等距划分，导致信息熵严重损失（均值附近量化误差骤增）。
    NF4（NormalFloat4, Dettmers et al., 2023）基于最优标量量化器（Lloyd-Max Quantizer）原理，
    寻找 16 个离散量化点 \(q_0, q_1, \dots, q_{15}\)，使得对标准正态分布的期望均方误差（MSE）最小化：
  </p>
  \[ \min_{q_0, \dots, q_{15}} \mathbb{E}_{w \sim \mathcal{N}(0, 1)} \left[ (w - q(w))^2 \right] \]
  <p>
    其理论解要求每个区间的积分概率相等（等分位点原则）：
  </p>
  \[ q_i = \frac{1}{2} \left( Q_X\left(\frac{i}{2^k}\right) + Q_X\left(\frac{i+1}{2^k}\right) \right) \]
  <p>
    其中 \(Q_X(\cdot)\) 为标准正态分布累计分布函数（CDF）的逆分位数函数，\(k=4\)。
    经零点精确对称化处理后，将 16 个点规范化缩放到 \([-1, 1]\) 区间。
    在工程实现中，将张量划分为块大小为 \(B = 64\) 的连续小块，计算绝对最大值缩放因子：
  </p>
  \[ c = \max_{j=1}^{B} |w_j| \]
  <p>
    量化时，每个权重仅需存储 4 个二进制位（即 16 个量化点中最接近项的下标索引 \(\tilde{w}_j \in \{0, \dots, 15\}\)）：
  </p>
  \[ \tilde{w}_j = \arg\min_{i \in \{0, \dots, 15\}} \left| \frac{w_j}{c} - q_i \right| \]
  <p>
    在前向传播计算矩阵乘法时，硬件在 GPU 寄存器中瞬时完成反量化（Dequantization）：
  </p>
  \[ \hat{w}_j = c \cdot q_{\tilde{w}_j} \]
  <p>
    因此，1.5B 参数的基座模型在静态显存中只需占用 4 bits/参数（即 0.5 字节/参数），显存占用仅为 16-bit 浮点数的四分之一！
  </p>

  <p>
    <strong>前置定义 2（双重量化 Double Quantization, DQ）：</strong>
    虽然基座权重压缩到了 4 bits，但为了保证量化精度，每 64 个参数必须保留一个缩放因子 \(c\)。
    若缩放因子采用标准 FP32（32 bits）存储，其本身带来的额外显存开销为：
  </p>
  \[ M_{\text{scale1}} = \frac{32 \text{ bits}}{64} = 0.5 \text{ bits/param} \]
  <p>
    这意味着原本 4.0 bits 的权重膨胀为了 4.5 bits，附加显存开销高达 \(12.5\%\)！
    双重量化（Double Quantization）对第一层缩放因子 \(c_1\) 再次执行量化：
    以 256 为二级块大小，将 \(c_1\) 压缩为 8-bit FP8 格式，并引入第二层极低频的 FP32 缩放因子 \(c_2\)。
    此时，每个参数平摊的缩放因子显存开销骤降为：
  </p>
  \[ M_{\text{DQ}} = \frac{8 \text{ bits}}{64} + \frac{32 \text{ bits}}{64 \times 256} = 0.125 + 0.00195 \approx 0.127 \text{ bits/param} \]
  <p>
    相比单层量化的 \(0.5 \text{ bits/param}\)，双重量化节省了：
  </p>
  \[ \Delta M = 0.5 - 0.127 = 0.373 \text{ bits/param} \]
  <p>
    对于 1.54B 参数模型，双重量化直接在静态常量显存上削减了：
  </p>
  \[ \Delta S = \frac{1.5437 \times 10^9 \times 0.373}{8 \times 1024 \times 1024} \approx 68.6 \text{ MB} \]

  <p>
    <strong>前置定义 3（LoRA 秩矩阵乘积与零扰动起步）：</strong>
    设基座网络某线性投影层输入为 \(x \in \mathbb{R}^{k}\)，固定冻结权重为 \(W_0 \in \mathbb{R}^{d \times k}\)。
    LoRA 将微调增量矩阵分解为两个极低秩矩阵的乘积：
  </p>
  \[ \Delta W = \frac{\alpha}{r} (B \cdot A) \]
  <p>
    其中 \(B \in \mathbb{R}^{d \times r}\)，\(A \in \mathbb{R}^{r \times k}\)，且内在秩 \(r \ll \min(d, k)\)。
    根据矩阵代数中的秩不等式：
  </p>
  \[ \mathrm{rank}(\Delta W) \le \min(\mathrm{rank}(B), \mathrm{rank}(A)) \le r \]
  <p>
    参数量从原本全矩阵的 \(d \times k\) 缩减至 \(r(d + k)\)。
    常数缩放因子 \(\frac{\alpha}{r}\)（通常设 \(\alpha = 2r\)）的作用是：当调整秩 \(r\) 进行实验对比时，
    梯度的数值尺度保持稳定，免去针对不同秩重新网格搜索学习率。
  </p>
  <p>
    <strong>初始化零扰动定理</strong>：在代码中，矩阵 \(A\) 采用高斯分布 \(\mathcal{N}(0, \sigma^2)\) 初始化，
    而矩阵 \(B\) <strong>严格初始化为全 0 矩阵</strong>。因此微调第 0 步：
  </p>
  \[ \Delta W \Big|_{t=0} = \frac{\alpha}{r} (\mathbf{0} \cdot A) = \mathbf{0} \]
  \[ h = W_0 x + \Delta W x = W_0 x + \mathbf{0} = W_0 x \]
  <p>
    这保证了训练初始时刻模型前向输出 100% 等价于预训练基座，彻底消除了随机初始化对预训练语言知识的灾难性扰动。
  </p>
</section>

<h3>3. 显存实战精算：Colab T4 与 A100 MB 级账本草稿纸</h3>
<p>
  在 Google Colab 上启动训练之前，我们以真实的 <strong>Qwen2.5-1.5B</strong>（参数量 \(N = 1,543,714,816 \approx 1.5437 \times 10^9\)）为例，
  在草稿纸上逐项拆解静态权重、优化器、梯度与激活值的 MB 级占用。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：Qwen2.5-1.5B 显存真实分配手算与双卡对比</h4>
  <p>
    模型关键超参数：隐层维度 \(d = 1536\)，层数 \(L = 28\)，中间层维度 \(d_{\text{ffn}} = 8960\)，
    注意力头数 \(H_q = 12\)，KV 头数 \(H_{kv} = 2\)（GQA 架构），词表大小 \(V = 151936\)。
    微调时外挂 LoRA 目标模块为全部 7 个线性投影层（q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj），
    设定秩 \(r = 16\)，总 LoRA 可训练参数量约 \(1.846 \times 10^7\)（约 18.5M 参数，仅占总量的 \(1.2\%\)）。
  </p>
  <p><strong>显存构成逐项核算：</strong></p>
  <ol>
    <li><strong>模型静态权重</strong>：
      全参数（FP16/BF16，2 字节/参数）：
      \[ M_{\text{weights, full}} = \frac{1.5437 \times 10^9 \times 2}{1024^2} \approx 2944 \text{ MB} \approx 2.88 \text{ GB} \]
      QLoRA（NF4 4-bit 搭配双重量化，平均约 4.127 bits/参数）：
      \[ M_{\text{weights, QLoRA}} = \frac{1.5437 \times 10^9 \times 4.127}{8 \times 1024^2} \approx 760 \text{ MB} \approx 0.74 \text{ GB} \]
    </li>
    <li><strong>可训练参数权重与梯度</strong>：
      全参数微调时梯度（FP16，2 字节）：\(2944 \text{ MB}\)。
      LoRA 微调时可训练参数仅 18.5M：
      \[ M_{\text{lora\_weights}} = \frac{18.46 \times 10^6 \times 2}{1024^2} \approx 35.2 \text{ MB} \]
      \[ M_{\text{lora\_grads}} = \frac{18.46 \times 10^6 \times 2}{1024^2} \approx 35.2 \text{ MB} \]
    </li>
    <li><strong>优化器状态（Optimizer States）</strong>：
      标准 AdamW 维护一阶动量（FP32，4 字节）、二阶动量（FP32，4 字节）以及主权重备份（FP32，4 字节），合计 12 字节/可训练参数：
      全参数微调：
      \[ M_{\text{opt, full}} = \frac{1.5437 \times 10^9 \times 12}{1024^2} \approx 17666 \text{ MB} \approx 17.25 \text{ GB} \]
      LoRA 微调（标准 AdamW）：
      \[ M_{\text{opt, lora}} = \frac{18.46 \times 10^6 \times 12}{1024^2} \approx 211.3 \text{ MB} \]
      若开启 <code>paged_adamw_8bit</code>，优化器状态压缩至 6 字节/参数，显存进一步降至约 \(105.6 \text{ MB}\)。
    </li>
    <li><strong>前向激活值（Activations，取 batch size = 2, seq len = 1024）</strong>：
      未开启梯度检查点时，28 层的中间激活全量驻留显存：约 \(3800 \sim 4500 \text{ MB}\)。
      开启梯度检查点（Gradient Checkpointing）后，前向仅保留每层输入边界，反向时局部重算：激活显存骤降至约 \(550 \text{ MB}\)。
    </li>
    <li><strong>CUDA 驱动与 PyTorch 运行时底噪</strong>：
      T4 环境约 \(650 \text{ MB}\)，A100 环境约 \(950 \text{ MB}\)。
    </li>
  </ol>

  <p><strong>实战显存全景对比表（真实 MB / GB 级数据）：</strong></p>
  <table class="tbl">
    <thead>
      <tr>
        <th>微调方案</th>
        <th>基座静态权重</th>
        <th>可训练权重与梯度</th>
        <th>优化器状态</th>
        <th>激活值 (b=2, s=1024)</th>
        <th>显存总计</th>
        <th>Colab T4 (16 GB) 状态</th>
        <th>Colab A100 (40 GB) 状态</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>全参数微调</strong> (FP16 + AdamW)</td>
        <td>2944 MB</td>
        <td>2944 MB</td>
        <td>17666 MB</td>
        <td>4200 MB (无重算)</td>
        <td><strong>28404 MB (约 27.7 GB)</strong></td>
        <td>❌ <strong>瞬间 OOM 崩溃</strong>（超限 11.7 GB）</td>
        <td>✅ 正常运行（占用约 69%）</td>
      </tr>
      <tr>
        <td><strong>标准 LoRA</strong> (FP16 + AdamW)</td>
        <td>2944 MB</td>
        <td>70.4 MB</td>
        <td>211.3 MB</td>
        <td>550 MB (梯度检查点)</td>
        <td><strong>4425 MB (约 4.32 GB)</strong></td>
        <td>✅ 极度流畅（占用约 27%）</td>
        <td>✅ 极度富余（可开更大 batch）</td>
      </tr>
      <tr>
        <td><strong>QLoRA 4-bit</strong> (NF4 + Paged 8-bit)</td>
        <td>760 MB</td>
        <td>70.4 MB</td>
        <td>105.6 MB</td>
        <td>550 MB (梯度检查点)</td>
        <td><strong>2136 MB (约 2.08 GB)</strong></td>
        <td>✅ <strong>极致轻量</strong>（仅占 13% 显存）</td>
        <td>✅ <strong>支持万级上下文超长文本</strong></td>
      </tr>
    </tbody>
  </table>
  <p>
    <strong>实战结论</strong>：在 Google Colab 免费或 Pro 标配的 16GB T4 上，全参数微调是绝对不可能运行的物理禁区；
    而采用 QLoRA 时，整个 1.5B 模型的训练显存被压缩到了 <strong>2.1 GB 左右</strong>，剩余近 14 GB 显存允许学生从容探索更大的批大小或更长的提示词。
  </p>
</section>

<h3>4. 数据工程：ChatML 掩码机制草稿纸追踪</h3>
<p>
  监督微调（SFT）绝对不能把整段文本一视同仁地计算交叉熵损失。
  若对人类提问的 Prompt 计算损失，模型就会把宝贵的参数容量浪费在记忆「千奇百怪的提问语气」上。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：10-Token 玩具序列损失计算逐位追踪</h4>
  <p>
    考虑一个标准的单轮问答对话：
    用户提问 <code>Hi</code>，模型回复 <code>Hello</code>。
    在分词器（Tokenizer）应用 ChatML 模板后，编码为如下严格包含 10 个 token 的玩具序列。
    我们在草稿纸上追踪每一个位置的 <code>input_id</code>、<code>attention_mask</code> 与 <code>labels</code>：
  </p>
  <table class="tbl">
    <thead>
      <tr>
        <th>序列索引 \(t\)</th>
        <th>Token 文本</th>
        <th>语义角色</th>
        <th>input_id</th>
        <th>attention_mask</th>
        <th>labels 目标值</th>
        <th>是否计入 Loss？</th>
        <th>底层数学与工程原理剖析</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0</td>
        <td><code>&lt;|im_start|&gt;</code></td>
        <td>User 轮次起始</td>
        <td>151644</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>系统控制符，不参与损失计算</td>
      </tr>
      <tr>
        <td>1</td>
        <td><code>user</code></td>
        <td>角色标识符</td>
        <td>872</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>固定结构标记，无需优化预测概率</td>
      </tr>
      <tr>
        <td>2</td>
        <td><code>\n</code></td>
        <td>换行分隔符</td>
        <td>198</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>格式控制标记，掩码屏蔽</td>
      </tr>
      <tr>
        <td>3</td>
        <td><code>Hi</code></td>
        <td>用户真实提问</td>
        <td>13324</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>人类输入内容，绝对不能惩罚模型的自发预测</td>
      </tr>
      <tr>
        <td>4</td>
        <td><code>&lt;|im_end|&gt;</code></td>
        <td>User 轮次终止</td>
        <td>151645</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>提问结束符，属于 Prompt 范畴</td>
      </tr>
      <tr>
        <td>5</td>
        <td><code>\n</code></td>
        <td>段落换行</td>
        <td>198</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>提示词与回答的分隔换行</td>
      </tr>
      <tr>
        <td>6</td>
        <td><code>&lt;|im_start|&gt;</code></td>
        <td>Assistant 起始</td>
        <td>151644</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>由数据流水线生成的前导引导符</td>
      </tr>
      <tr>
        <td>7</td>
        <td><code>assistant\n</code></td>
        <td>助手前缀引导</td>
        <td>77091</td>
        <td>1</td>
        <td><strong>-100</strong></td>
        <td>否（掩码忽略）</td>
        <td>引导模型开始作答，仍属于条件上下文</td>
      </tr>
      <tr>
        <td>8</td>
        <td><code>Hello</code></td>
        <td><strong>助手回答正文</strong></td>
        <td>9707</td>
        <td>1</td>
        <td><strong>9707</strong></td>
        <td><strong>是（反向传播）</strong></td>
        <td><strong>关键点：交叉熵损失对真实生成内容求导！</strong></td>
      </tr>
      <tr>
        <td>9</td>
        <td><code>&lt;|im_end|&gt;</code></td>
        <td><strong>助手生成终止</strong></td>
        <td>151645</td>
        <td>1</td>
        <td><strong>151645</strong></td>
        <td><strong>是（反向传播）</strong></td>
        <td><strong>关键点：必须计算 EOS 损失，让模型学会停下！</strong></td>
      </tr>
    </tbody>
  </table>

  <p><strong>交叉熵损失函数的数学形式：</strong></p>
  <p>
    在 PyTorch 底层，损失函数调用 <code>torch.nn.CrossEntropyLoss(ignore_index=-100)</code>。
    对于整条序列，总标量损失定义为：
  </p>
  \[ \mathcal{L} = -\frac{1}{\sum_{t=0}^{T-1} \mathbb{I}(y_t \ne -100)} \sum_{t=0}^{T-1} \mathbb{I}(y_t \ne -100) \log P(x_t \mid x_{< t}) \]
  <p>
    其中 \(\mathbb{I}(\cdot)\) 为示性函数，在序列 10 个 token 中，只有 \(t=8\) 与 \(t=9\) 两位满足 \(y_t \ne -100\)。
    因此归一化分母为 2，损失严格聚焦在「助手如何输出 <code>Hello</code>」以及「何时输出终止符 <code>&lt;|im_end|&gt;</code>」。
  </p>
  <p>
    <strong>为什么第 9 位的 <code>&lt;|im_end|&gt;</code> 必须参与计算损失？</strong>
    如果将结尾的终止符也误设为 <code>-100</code>，模型在推理生成时将永远无法学会「在回答完毕后主动闭合句子」，
    最终导致生成陷入无休止的胡言乱语、逻辑复读直到达到最大 token 强制截断。
  </p>
</section>

<h3>5. 工业级代码实操：Google Colab 端到端训练脚本</h3>
<p>
  以下 Python 脚本可在 Google Colab（支持 T4 或 A100）中直接完整执行。
  代码内建了对硬件架构的动态探测与兼容性保护：
</p>

<pre><code><span class="cm"># [步骤 1] 安装微调与量化全生态库</span>
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

<span class="cm"># [步骤 2] 动态硬件探测：判断当前 GPU 是否支持原生 bfloat16</span>
<span class="cm"># A100 (Ampere) 原生支持 bf16；T4 (Turing) 不支持硬件 bf16，必须回退至 float16</span>
has_bf16 = torch.cuda.is_available() <span class="kw">and</span> torch.cuda.is_bf16_supported()
compute_dtype = torch.bfloat16 <span class="kw">if</span> has_bf16 <span class="kw">else</span> torch.float16
print(f<span class="st">"GPU: {torch.cuda.get_device_name(0)}, 计算精度: {compute_dtype}"</span>)

<span class="cm"># [步骤 3] 准备符合 ChatML 规范的微调样本</span>
train_data = [
    {
        <span class="st">"messages"</span>: [
            {<span class="st">"role"</span>: <span class="st">"system"</span>, <span class="st">"content"</span>: <span class="st">"你是一个严谨的数学与大模型算法导师。"</span>},
            {<span class="st">"role"</span>: <span class="st">"user"</span>, <span class="st">"content"</span>: <span class="st">"简述为什么计算图反向传播必须按拓扑逆序执行？"</span>},
            {<span class="st">"role"</span>: <span class="st">"assistant"</span>, <span class="st">"content"</span>: <span class="st">"因为根据多元链式法则，任一父节点必须在其全部消费者子节点的局部梯度回传并累加完毕后，才能确定自身完整的全微分总导数。"</span>}
        ]
    },
    {
        <span class="st">"messages"</span>: [
            {<span class="st">"role"</span>: <span class="st">"system"</span>, <span class="st">"content"</span>: <span class="st">"你是一个严谨的数学与大模型算法导师。"</span>},
            {<span class="st">"role"</span>: <span class="st">"user"</span>, <span class="st">"content"</span>: <span class="st">"简述 LoRA 中矩阵 B 初始化为 0 的数学目的。"</span>},
            {<span class="st">"role"</span>: <span class="st">"assistant"</span>, <span class="st">"content"</span>: <span class="st">"令 B=0 可以保证初始增量矩阵 Delta W=BA=0，使微调在第 0 步严格等价于原始基座，消除随机初始化带来的破坏性震荡。"</span>}
        ]
    }
]
dataset = Dataset.from_list(train_data)

<span class="cm"># [步骤 4] 配置 NF4 四位量化与双重量化参数</span>
model_id = <span class="st">"Qwen/Qwen2.5-1.5B-Instruct"</span>
bnb_config = BitsAndBytesConfig(
    load_in_4bit=<span class="kw">True</span>,
    bnb_4bit_quant_type=<span class="st">"nf4"</span>,               <span class="cm"># 采用等分位点最优 NF4</span>
    bnb_4bit_compute_dtype=compute_dtype,    <span class="cm"># 动态指定计算精度，规避 T4 上的 bf16 异常</span>
    bnb_4bit_use_double_quant=<span class="kw">True</span>           <span class="cm"># 开启双重量化，每参数再省 0.373 bits</span>
)

<span class="cm"># [步骤 5] 加载分词器与量化基座</span>
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=<span class="kw">True</span>)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map=<span class="st">"auto"</span>,
    trust_remote_code=<span class="kw">True</span>
)

<span class="cm"># [步骤 6] 关键预处理：关闭 use_cache 并启用梯度检查点</span>
model.config.use_cache = <span class="kw">False</span>                <span class="cm"># 避坑必加：防止与梯度检查点发生图冲突</span>
model = prepare_model_for_kbit_training(model)

<span class="cm"># [步骤 7] 挂载 LoRA 适配器</span>
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=[<span class="st">"q_proj"</span>, <span class="st">"k_proj"</span>, <span class="st">"v_proj"</span>, <span class="st">"o_proj"</span>, <span class="st">"gate_proj"</span>, <span class="st">"up_proj"</span>, <span class="st">"down_proj"</span>],
    lora_dropout=0.05,
    bias=<span class="st">"none"</span>,
    task_type=<span class="st">"CAUSAL_LM"</span>
)
model = get_peft_model(model, peft_config)
model.print_trainable_parameters()           <span class="cm"># 打印验证：可训练参数量仅约 1.2%</span>

<span class="cm"># [步骤 8] 设置训练超参数</span>
training_args = TrainingArguments(
    output_dir=<span class="st">"./qwen1.5b-lora-output"</span>,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,           <span class="cm"># 等效 Batch Size = 8</span>
    learning_rate=2e-4,
    lr_scheduler_type=<span class="st">"cosine"</span>,
    warmup_ratio=0.1,
    logging_steps=1,
    max_steps=20,
    fp16=<span class="kw">not</span> has_bf16,                       <span class="cm"># T4 开启 fp16</span>
    bf16=has_bf16,                           <span class="cm"># A100 开启 bf16</span>
    optim=<span class="st">"paged_adamw_8bit"</span>,                 <span class="cm"># 8-bit 分页优化器，进一步节省优化器状态显存</span>
    save_strategy=<span class="st">"no"</span>
)

<span class="cm"># [步骤 9] 启动 SFT 训练循环</span>
<span class="cm"># 注意：前面已显式调用 get_peft_model，此处无需再传 peft_config 避免双重包裹；</span>
<span class="cm"># 必须显式传入 tokenizer 以便 TRL 解析 ChatML 对话模板并完成 Label Masking 掩码打包</span>
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=training_args,
    tokenizer=tokenizer
)
trainer.train()

<span class="cm"># [步骤 10] 仅保存极轻量的 LoRA 权重</span>
trainer.model.save_pretrained(<span class="st">"./my_lora_adapter"</span>)
tokenizer.save_pretrained(<span class="st">"./my_lora_adapter"</span>)
print(<span class="st">"微调完成！轻量级 Adapter 权重已导出。"</span>)</code></pre>

<h3>6. Colab 工业级避坑指南：三大核心报错与一行命令对策</h3>
<p>
  在 Google Colab 上跑大模型训练，初学者几乎 100% 会遭遇以下 3 种典型暗礁。请熟记成因与一行命令对策：
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>避坑指南：Colab T4 / A100 实战三大典型暗礁与对策</h4>
  <p><strong>暗礁 1：T4 GPU 硬件不支持原生 bfloat16 导致的极慢或报错</strong></p>
  <ul>
    <li><strong>根因分析</strong>：Google Colab 免费或默认分配的 T4 GPU 属于英伟达 Turing 架构（算力 Compute Capability 7.5），
        在硬件底层<strong>没有任何原生 BF16 张量核心指令</strong>！
        若在代码中强行设置 <code>bf16=True</code> 或 <code>bnb_4bit_compute_dtype=torch.bfloat16</code>，
        PyTorch 会被迫使用低效的软件层仿真，微调速度比正常慢 10 ~ 20 倍，且经常在反向传播时抛出 <code>CUDA error: illegal instruction</code>。
        而在 A100（Ampere 架构，算力 8.0）上，硬件原生支持 BF16。</li>
    <li><strong>一行代码对策（动态自适应回退）</strong>：
      <code>compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16</code>
    </li>
  </ul>

  <p><strong>暗礁 2：bitsandbytes 驱动库动态链接缺失或 CUDA Setup 报错</strong></p>
  <ul>
    <li><strong>根因分析</strong>：Google Kaggle 环境经常静默更新宿主机底层英伟达驱动和 CUDA 工具包版本。
        当系统预装的 <code>bitsandbytes</code> 二进制动态库（如 <code>libbitsandbytes_cuda*.so</code>）与当前的驱动版本不兼容时，
        在执行 <code>import bitsandbytes</code> 或加载 4-bit 量化模型时会报出 <code>CUDA Setup failed: libbitsandbytes_cuda*.so: cannot open shared object file</code>。</li>
    <li><strong>一行终端命令对策（无缓存重装与环境自检）</strong>：
      <code>!pip install -U bitsandbytes --no-cache-dir</code><br/>
      可附加执行自检诊断命令验证动态链接库是否就绪：
      <code>!python -m bitsandbytes</code>
    </li>
  </ul>

  <p><strong>暗礁 3：梯度检查点与 use_cache 冲突引发运行时崩溃</strong></p>
  <ul>
    <li><strong>根因分析</strong>：Hugging Face 的因果语言模型在默认配置下会开启 <code>model.config.use_cache = True</code>，
        用于在推理自回归阶段缓存历史 Key/Value 状态。
        但在微调训练阶段开启 <code>gradient_checkpointing_enable()</code>（梯度检查点）后，
        前向传播会丢弃中间激活值并在反向传播时重新计算，两者在计算图追踪逻辑上互斥，
        会直接抛出著名的致命错误：<code>RuntimeError: use_cache=True is incompatible with gradient checkpointing. Set use_cache=False...</code>。</li>
    <li><strong>一行代码对策</strong>：
      <code>model.config.use_cache = False</code>
    </li>
  </ul>
</section>

<h3>7. 落地部署：权重合并与导出为 4-bit GGUF</h3>
<p>
  微调完成后，保存在云端的只有数十兆字节的 <code>adapter_model.safetensors</code>。
  如何在没有显卡的本地普通笔记本上实现毫秒级的高速离线推理？
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>第一步：代数意义上的显存合并（Weight Merge）</h4>
  <p>
    在推理时，我们绝不需要在每一步单独算两次矩阵乘法 \(W_0 x + B(Ax)\)。
    根据矩阵乘法的分配律，直接将 LoRA 权重一次性加回基座权重：
  </p>
  \[ W_{\text{merged}} = W_0 + \frac{\alpha}{r} (B \cdot A) \]
  <p>在 Python 中只需两行核心合并代码，并务必同时导出分词器元数据：</p>
<pre><code><span class="kw">from</span> peft <span class="kw">import</span> PeftModel
base_model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16, device_map=<span class="st">"cpu"</span>)
merged_model = PeftModel.from_pretrained(base_model, <span class="st">"./my_lora_adapter"</span>).merge_and_unload()
merged_model.save_pretrained(<span class="st">"./qwen1.5b-merged"</span>)
tokenizer.save_pretrained(<span class="st">"./qwen1.5b-merged"</span>)     <span class="cm"># 必加：保存分词器元数据，防止 llama.cpp convert 找不到词表</span></code></pre>
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
  <p class="q">在全参数微调一个 1.54B 参数模型时，若使用标准 AdamW 优化器，仅优化器状态本身就需要消耗多少显存？</p>
  <ul class="opts">
    <li>约 3.08 GB</li>
    <li>约 6.16 GB</li>
    <li data-ok>约 17.25 GB ~ 18.48 GB</li>
    <li>不到 1 GB</li>
  </ul>
  <p class="why">
    标准 AdamW 需要维护每个可训练参数的一阶动量（FP32，4 字节）、二阶动量（FP32，4 字节）以及主权重备份（FP32，4 字节），合计每参数 12 字节。
    对于 1.54B 参数：\(1.5437 \times 10^9 \times 12 \text{ bytes} \approx 17.25 \text{ GB} \sim 18.48 \text{ GB}\)。
  </p>
</div>

<div class="quiz quiz-blank" data-ans="49152" data-tol="0">
  <div class="qlabel">填空 · 计算推演</div>
  <p class="q">在 LoRA 微调中，若某线性层隐藏投影矩阵 \(W \in \mathbb{R}^{1536 \times 1536}\)，设定低秩 \(r = 16\)。使用低秩分解矩阵 \(A \in \mathbb{R}^{16 \times 1536}\) 与 \(B \in \mathbb{R}^{1536 \times 16}\) 替代直接更新全量权重。这两个可训练低秩适配矩阵的总参数量（\(|A| + |B|\)）精确等于多少？（填入整数）</p>
  <div class="blank-wrap">
    <input type="text" class="blank-input" placeholder="输入总参数量数值（如 49152）..." />
    <button class="blank-btn">提交验证</button>
    <span class="blank-feedback"></span>
  </div>
  <p class="why">
    \(|A| = 16 \times 1536 = 24,576\)，\(|B| = 1536 \times 16 = 24,576\)，总计 \(24,576 \times 2 = 49,152\)。相比原始全量矩阵的 \(1536 \times 1536 = 2,359,296\) 个参数，可训练参数量直接压缩为原先的 \(\frac{49152}{2359296} \approx 2.08\%\)（参数减少了近 98%）！
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">为什么 LoRA 的矩阵 \(B\) 在初始化时必须全部置为 0，而矩阵 \(A\) 采用高斯分布初始化？</p>
  <ul class="opts">
    <li>为了让矩阵乘法能够并行计算</li>
    <li data-ok>保证初始增量 \(\Delta W = B \cdot A = 0\)，使得微调开始瞬间模型完全等价于预训练基座模型，实现平滑起步</li>
    <li>防止梯度反向传播时出现除以 0</li>
    <li>这是 PyTorch 的强制命名规则</li>
  </ul>
  <p class="why">
    若 \(B\) 与 \(A\) 均为随机初始化，初始 \(\Delta W\) 将是非零随机噪声，微调一开始就会严重破坏基座模型已学到的权重分布。
    令 \(B=0\) 保证了初始步 \(\Delta W = 0\)，平滑起步。
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
    在 PyTorch 交叉熵损失函数中，<code>ignore_index=-100</code> 会忽略所有标签为 -100 的位置。
    这样模型反向传播时只对生成的助手答案计算交叉熵，避免模型浪费参数去强行拟合用户五花八门的提问方式。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">在 ChatML 掩码机制中，为什么 Assistant 回复末尾的 <code>&lt;|im_end|&gt;</code> 终止符必须保留原 token ID 参与交叉熵损失计算？</p>
  <ul class="opts">
    <li>为了通知系统释放 GPU 显存</li>
    <li data-ok>让模型学会何时主动停止输出，防止推理时陷入无限循环生成与无意义复读</li>
    <li>因为终止符占用 2 个字节</li>
    <li>为了加速反向传播求导</li>
  </ul>
  <p class="why">
    若掩码掉终止符，模型在生成时就永远学不会「在此处停止输出」的条件概率，推理时将一直疯狂续写乱码，直到被最大 token 长度强行打断。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">QLoRA 中的双重量化（Double Quantization）技术，其核心数学与工程收益是什么？</p>
  <ul class="opts">
    <li>把浮点数从 16 位直接转为 2 位</li>
    <li data-ok>对第一层量化缩放因子再次进行 8 位量化，将每个参数平摊的量化常量开销从 0.5 位降低至约 0.127 位</li>
    <li>将模型的隐藏层数量削减一半</li>
    <li>让优化器学习率自动翻倍</li>
  </ul>
  <p class="why">
    常规分块量化（块大小 64）使用 FP32 存储缩放因子，占用 \(32/64 = 0.5 \text{ bits/param}\)。
    双重量化对缩放因子按块大小 256 进行 8 位 FP8 二次量化，平摊开销降至 \(8/64 + 32/(64 \times 256) \approx 0.127 \text{ bits/param}\)，每参数节省约 0.373 位显存。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">在 Kaggle 分配的 T4 GPU 上微调时，如果将计算精度强行指定为 <code>bfloat16</code>，最可能会导致什么问题？</p>
  <ul class="opts">
    <li>显存占用暴增 10 倍</li>
    <li data-ok>因为 T4 属于 Turing 架构无原生硬件 BF16 指令，会触发软件层模拟导致训练极度缓慢甚至报非法指令错误</li>
    <li>自动将模型参数重置为 0</li>
    <li>导致 Colab 账号被封禁</li>
  </ul>
  <p class="why">
    英伟达 T4 的算力架构为 Compute Capability 7.5（Turing），缺乏原生硬件 BF16 算子支持；
    只有 Ampere 及更高架构（如 A100 / H100）才原生支持 BF16。T4 上必须使用 float16。
  </p>
</div>
`
});
