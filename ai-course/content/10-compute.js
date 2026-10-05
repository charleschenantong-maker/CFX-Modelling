/* content/10-compute.js — 模块 10：你的算力与工具链 */
COURSE.register({
  id: "m10",
  part: 3,
  num: "10",
  title: "算力与工具链：在 Colab、Kaggle、HF 上能跑什么",
  en: "Compute & Tooling (Colab / Kaggle / HF)",
  minutes: 35,
  tags: ["算力", "Colab", "动手"],
  body: String.raw`
<p class="lead">
  这一模块解决一个非常具体的问题：<strong>给定你手上的免费/低价算力，哪些实验今天就能跑，哪些必须改设计？</strong>
  答案会直接塑造你的项目路线。同时为英国大学数学系自学者建立起坚实的“算力数学底座”：从 Roofline 模型、算术强度，到经典 6N FLOPs 的严格矩阵微积分推导与 MFU 实战演算。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你最想要的是「训练一个自己的模型」。但真实约束是：Colab 免费层给的是单张 T4（16 GB）或单核 TPU，
    会话会在空闲或到点后断开。于是正确的问题不是「我能训多大的模型」，而是
    <em>「在会随时断线的 16 GB 显存上，什么实验能在 90 分钟内跑完并给出有意义的结论」</em>。
  </p>
</section>

<h3>1. 算力地图</h3>
<table class="tbl">
  <thead><tr><th>平台</th><th>典型硬件</th><th>限制</th><th>最适合</th></tr></thead>
  <tbody>
    <tr><td>Colab 免费层</td><td>T4 16 GB / 单核 TPU v5e-1</td><td>会话易断、无持久磁盘、单卡无法 SPMD 多设备并行</td><td>教学实验、小模型、LoRA</td></tr>
    <tr><td>Google AI Pro（含 Colab 计算单元）</td><td>按月发放计算单元 + 更高优先级与更强机器；更高档位（AI Ultra）支持后台连续执行</td><td>计算单元耗尽后退回免费层策略；额度随政策变化</td><td>稍大的微调、以及可以离开电脑的长任务</td></tr>
    <tr><td>Kaggle Notebooks</td><td>T4 ×2 / P100 / <strong>TPU v5e-8</strong></td><td>每周有 GPU/TPU 配额（约 30 小时量级，会调整，以 Kaggle 界面为准）；需手机验证</td><td><strong>免费体验 8 设备 SPMD 并行的主要去处</strong></td></tr>
    <tr><td>Hugging Face Jobs / Spaces</td><td>按需 GPU、ZeroGPU</td><td>额度有限、任务化</td><td>跑一次脚本、做 demo</td></tr>
    <tr><td>本地显卡（如有）</td><td>8–24 GB</td><td>受散热与内存限制</td><td>反复迭代、调试、小模型全流程</td></tr>
    <tr><td>按需云（RunPod / Vast 等）</td><td>A100 / H100</td><td>按小时计费；数据中心 IP 有合规风险</td><td>一次性大实验</td></tr>
  </tbody>
</table>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>Colab 的三条硬规则（学生最常踩）</h4>
  <ol>
    <li><strong>计算单元用完 = 退回免费层</strong>，不是「继续无限用」。所以长任务要能拆成一次会话内跑完的片段，
        并把检查点写到 Google Drive 或 Hugging Face Hub。</li>
    <li><strong>禁止用多个账号规避额度限制</strong>。你有三个 Google AI Pro 账号，正确做法是
        <em>按用途分开</em>（例如一个用于课程实验、一个用于项目），而不是在限额用尽后换号继续同一类重负载。</li>
    <li><strong>禁止把 Colab 当服务器</strong>：托管网站/文件服务、连接远程代理、挖矿、P2P、分布式 worker
        （无正计算单元余额时）都在禁止列表内。</li>
  </ol>
  <p><em>写 notebook、跑实验、做教学演示完全在允许范围内；越界的分界线是「把它变成免费的通用算力」。</em></p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>必须自己核实的两件事</h4>
  <ol>
    <li><strong>你的账户当前实际拿到什么硬件</strong>：在 notebook 里跑 <code>!nvidia-smi</code> 与
        <code>import jax; jax.devices()</code>（或 <code>torch.cuda.get_device_name()</code>）。
        平台的档位与配额会变，不要相信任何截图或二手描述——<em>包括本课程里的表格</em>。</li>
    <li><strong>会话与磁盘的持久性</strong>：Colab 的本地磁盘随会话消失。检查点必须写到 Google Drive 或 HF Hub，
        否则你会在第 89 分钟丢掉两小时训练。</li>
  </ol>
</section>

<h3>2. 显存 → 你能做什么</h3>
<table class="tbl small">
  <thead><tr><th>显存</th><th>推理</th><th>LoRA / QLoRA 微调</th><th>全参数训练</th></tr></thead>
  <tbody>
    <tr><td>8 GB</td><td>&le; 3B（int4）</td><td>&le; 1.5B（int4）</td><td>&le; 100M 从头训练</td></tr>
    <tr><td>16 GB（T4）</td><td>&le; 7B（int4）</td><td>&le; 7B（QLoRA, 短序列）</td><td>&le; 300M</td></tr>
    <tr><td>24 GB</td><td>&le; 13B（int4）</td><td>&le; 13B（QLoRA）</td><td>&le; 1B（含重计算）</td></tr>
    <tr><td>40–80 GB（A100）</td><td>&le; 70B（int4/int8）</td><td>&le; 70B（QLoRA）</td><td>&le; 7B（FSDP 多卡）</td></tr>
    <tr><td>8×TPU v5e</td><td>—</td><td>—</td><td><strong>约 10M–100M 参数从头预训练（教学用）</strong></td></tr>
  </tbody>
</table>
<p>
  这张表的用法不是「找上限」，而是<strong>反推实验设计</strong>：
  既然一台 T4 只能从头训 300M 以下的模型，那么「用 100M 的模型把预训练流程跑通」就是正确的目标，
  而不是试图硬撑 7B。规模缩小后，方法论完全一致，而迭代速度提高几十倍。
</p>

<h3>3. 环境与实验纪律</h3>
<div class="flow">
  <div class="nd hi">固定随机种子</div><div class="ar">→</div>
  <div class="nd">记录版本</div><div class="ar">→</div>
  <div class="nd">写 requirements</div><div class="ar">→</div>
  <div class="nd">检查点外存</div><div class="ar">→</div>
  <div class="nd">一键复现脚本</div>
</div>
<pre><code><span class="cm"># [逐行剖析] 科研级实验前置脚本：全栈随机种子固化 + 硬件状态快照 + 实验元数据持久化</span>
import os, random, numpy as np, torch, json, subprocess, sys
SEED = 0
<span class="cm"># 1. 固化 CPU 与所有 CUDA GPU 设备的伪随机数发生器，确保完全可复现性</span>
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED); torch.cuda.manual_seed_all(SEED)
torch.backends.cudnn.deterministic = True  <span class="cm"># 禁用非确定性卷积算法</span>

<span class="cm"># 2. 探查并打印当前 GPU 驱动与型号</span>
print(subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout.split("\n")[8])
print("python", sys.version.split()[0], "| torch", torch.__version__)

<span class="cm"># 3. 建立结构化实验工件输出目录并记录元数据配置清单</span>
RUN = "runs/exp001"
os.makedirs(RUN, exist_ok=True)
json.dump({"seed": SEED, "argv": sys.argv, "commit": "TODO"},
          open(f"{RUN}/config.json", "w"), indent=2)

<span class="cm"># 4. 从 Google Drive 挂载持久化存储（防止 Colab 实例断开导致权重丢失）</span>
from google.colab import drive
drive.mount("/content/drive")
CKPT_DIR = "/content/drive/MyDrive/llm-course/checkpoints" </code></pre>
<p>
  三条纪律：(1) <strong>每次实验目录里必须有 config.json</strong>，否则一周后你不知道那组数是哪来的；
  (2) <strong>先在小模型/小数据上把代码跑通</strong>，再放大；
  (3) <strong>写完脚本再开 GPU</strong>，不要在付费算力上调试语法错误。
</p>

<h3>4. Hugging Face 工作流（10 分钟上手）</h3>
<pre><code>!pip -q install -U huggingface_hub transformers datasets trl peft accelerate

from huggingface_hub import login, HfApi
login()                                    <span class="cm"># 粘贴 read/write token</span>

<span class="cm"># 下载数据集（只取前 N 条做实验）</span>
from datasets import load_dataset
ds = load_dataset("roneneldan/TinyStories", split="train[:1%]")

<span class="cm"># 训练完把模型推上去（含自动生成 model card）</span>
api = HfApi()
api.upload_folder(folder_path="out-sft/final", repo_id="your-name/mini-sft-demo",
                  repo_type="model", create_pr=False)</code></pre>
<p>
  相关文档：<a href="https://huggingface.co/docs/transformers" target="_blank" rel="noopener">transformers</a>、
  <a href="https://huggingface.co/docs/datasets" target="_blank" rel="noopener">datasets</a>、
  <a href="https://huggingface.co/docs/trl" target="_blank" rel="noopener">trl</a>、
  <a href="https://huggingface.co/docs/peft" target="_blank" rel="noopener">peft</a>。
  学习路径见 <a href="https://huggingface.co/learn" target="_blank" rel="noopener">Hugging Face Learn</a>。
</p>

<h3>5. 【草稿纸演算】硬件瓶颈、Roofline 模型与访存瓶颈推演</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>前置定义与符号约定</h4>
  <ul>
    <li><strong>浮点运算次数（FLOPs, Floating Point Operations）</strong>：衡量计算工作量的无量纲次数。注意末尾小写 <code>s</code> 代表复数（操作数），以区别于算力速率单位 <code>FLOPS</code>（FLOP/s, 每秒浮点操作次数）。</li>
    <li><strong>乘加运算（MACs, Multiply-Accumulate）</strong>：计算机底层执行 \( a \leftarrow a + (b \times c) \)。包含 1 次乘法与 1 次加法，因此在算力理论与硬件基准中定义：
      \[ 1 \text{ MAC} = 2 \text{ FLOPs} \]
    </li>
    <li><strong>矩阵乘法复杂度通用定理</strong>：设矩阵 \( A \in \mathbb{R}^{m \times k} \) 与 \( B \in \mathbb{R}^{k \times n} \) 相乘，结果矩阵 \( C = AB \in \mathbb{R}^{m \times n} \)。输出矩阵共有 \( m \times n \) 个元素，每个元素是 \( k \) 维向量点积（需 \( k \) 次乘法和 \( k \) 次累加，即 \( k \) 次 MACs）。因此稠密矩阵乘法的精确浮点运算量为：
      \[ \text{FLOPs}_{\text{GEMM}} = 2 \cdot m \cdot n \cdot k \]
    </li>
    <li><strong>访存量（Memory Traffic, \( M \)）与算术强度（Arithmetic Intensity, \( I \)）</strong>：
      算术强度定义为算法执行的总运算量与在芯片计算核心与显存（HBM/DRAM）之间搬运的字节总量之比：
      \[ I = \frac{\text{Total FLOPs}}{M} \quad (\text{FLOP/Byte}) \]
    </li>
    <li><strong>Roofline 模型</strong>：
      加速卡上的理论最大可达成运算性能 \( P_{\text{attainable}} \)（单位 \( \text{FLOP/s} \)）受到芯片理论算力峰值 \( P_{\text{peak}} \)（\( \text{FLOP/s} \)）与显存带宽 \( B_{\text{mem}} \)（\( \text{Byte/s} \)）的双重截断约束：
      \[ P_{\text{attainable}} = \min(P_{\text{peak}}, \; I \cdot B_{\text{mem}}) \]
      硬件本身的拐点强度（Turning Point Intensity）为：
      \[ I^* = \frac{P_{\text{peak}}}{B_{\text{mem}}} \]
      若 \( I < I^* \)，算法落入<strong>访存瓶颈区（Memory-bound）</strong>，算力利用率由显存带宽死死卡住；若 \( I \ge I^* \)，算法落入<strong>算力瓶颈区（Compute-bound）</strong>，此时才有可能逼近硬件算力上限。
    </li>
  </ul>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>极简小数字草稿纸演算（Scratchpad 1）</h4>
  <p>在草稿纸上设定一块易于心算的虚拟加速卡：算力峰值 \( P_{\text{peak}} = 100 \text{ TFLOPS} = 10^{14} \text{ FLOP/s} \)，显存带宽 \( B_{\text{mem}} = 1000 \text{ GB/s} = 10^{12} \text{ Byte/s} \)。</p>
  <p>首先计算该硬件的拐点算术强度：</p>
  \[ I^* = \frac{10^{14} \text{ FLOP/s}}{10^{12} \text{ Byte/s}} = 100 \text{ FLOP/Byte} \]
  <p>现在我们在草稿纸上对比两种典型的真实深度学习执行场景：</p>
  <ol>
    <li><strong>场景 A：大模型自回归单 Token 解码（Batch Size = 1）</strong><br />
      读取单层权重矩阵 \( W \in \mathbb{R}^{4096 \times 4096} \)（以 FP16 存储，每个参数 2 Bytes，权重大小 \( 4096^2 \times 2 = 33,554,432 \text{ Bytes} \approx 33.55 \text{ MB} \)），乘以当前输入的单 Token 激活行向量 \( x \in \mathbb{R}^{1 \times 4096} \)。<br />
      - 运算量：\( 2 \cdot 1 \cdot 4096 \cdot 4096 = 2 \times 4096^2 \approx 3.355 \times 10^7 \text{ FLOPs} \)。<br />
      - 显存搬运量：必须将整个权重 \( W \) 从 HBM 读进缓存，\( M \approx 3.355 \times 10^7 \text{ Bytes} \)。<br />
      - 算术强度：
      \[ I_A = \frac{2 \times 4096^2 \text{ FLOPs}}{2 \times 4096^2 \text{ Bytes}} = 1 \text{ FLOP/Byte} \]
      - 可达性能：
      \[ P_{\text{attainable}} = \min(10^{14}, \; 1 \times 10^{12}) = 10^{12} \text{ FLOP/s} = 1 \text{ TFLOPS} \]
      <strong>惊人结论</strong>：此时硬件利用率只有 \( \frac{1 \text{ TFLOPS}}{100 \text{ TFLOPS}} = 1\% \)！算力核心 99% 的时间都在饥饿地等待显存把参数搬过来。这就是单批次自回归推理极慢的数学本质。
    </li>
    <li><strong>场景 B：预训练阶段大 Batch 稠密矩阵乘法（输入包含 4096 个 Tokens）</strong><br />
      令输入矩阵为 \( X \in \mathbb{R}^{4096 \times 4096} \)，同样乘以权重 \( W \in \mathbb{R}^{4096 \times 4096} \)。<br />
      - 运算量：\( 2 \cdot 4096 \cdot 4096 \cdot 4096 = 2 \times 4096^3 \approx 1.374 \times 10^{11} \text{ FLOPs} \)。<br />
      - 显存搬运量：读入 \( X \)、读入 \( W \)、写出结果 \( Y \)，总数据量 \( 3 \times 4096^2 \times 2 \text{ Bytes} \approx 1.007 \times 10^8 \text{ Bytes} \)。<br />
      - 算术强度：
      \[ I_B = \frac{2 \times 4096^3}{6 \times 4096^2} = \frac{4096}{3} \approx 1365.3 \text{ FLOP/Byte} \]
      - 可达性能：因为 \( 1365.3 \text{ FLOP/Byte} \gg I^* = 100 \text{ FLOP/Byte} \)，算法稳居算力瓶颈区，\( P_{\text{attainable}} = 100 \text{ TFLOPS} \)。<br />
      <strong>核心洞察</strong>：相同的权重参数，被 4096 个 Token 深度复用，算力利用率从 1% 跃升至理论峰值！
    </li>
  </ol>
</section>

<h3>6. 【经典 6N 推导】标准 Transformer 单层与整网 6N FLOPs/token 严格数学证明</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>前置定义与单层标准 Transformer 块结构</h4>
  <p>
    设标准 Transformer 块的隐藏维度为 \( d \)，注意力头数为 \( h \)，每个头维度 \( d_k = d/h \)，MLP 中间前馈维度扩展为 \( d_{\text{ff}} = 4d \)。
    我们将计算拆解到<strong>单个 Token</strong>（输入行向量 \( x \in \mathbb{R}^{1 \times d} \)）上：
  </p>
  <table class="tbl small">
    <thead><tr><th>子模块</th><th>操作名称与矩阵维度</th><th>参数量</th><th>单 Token 前向 GEMM 运算量</th></tr></thead>
    <tbody>
      <tr><td>MHA 注意力</td><td>\( Q, K, V \) 三个线性投影：\( W_Q, W_K, W_V \in \mathbb{R}^{d \times d} \)</td><td>\( 3d^2 \)</td><td>\( 3 \times (2 \cdot 1 \cdot d \cdot d) = 6d^2 \) FLOPs</td></tr>
      <tr><td>MHA 注意力</td><td>注意力输出线性投影：\( W_O \in \mathbb{R}^{d \times d} \)</td><td>\( d^2 \)</td><td>\( 2 \cdot 1 \cdot d \cdot d = 2d^2 \) FLOPs</td></tr>
      <tr><td>MLP 前馈网络</td><td>第 1 层升维映射：\( W_1 \in \mathbb{R}^{d \times 4d} \)</td><td>\( 4d^2 \)</td><td>\( 2 \cdot 1 \cdot d \cdot 4d = 8d^2 \) FLOPs</td></tr>
      <tr><td>MLP 前馈网络</td><td>第 2 层降维映射：\( W_2 \in \mathbb{R}^{4d \times d} \)</td><td>\( 4d^2 \)</td><td>\( 2 \cdot 1 \cdot 4d \cdot d = 8d^2 \) FLOPs</td></tr>
      <tr><td><strong>单层总计</strong></td><td><strong>各模块稠密权重矩阵乘法求和</strong></td><td><strong>\( N_{\text{layer}} = 12d^2 \)</strong></td><td><strong>\( \text{FLOPs}_{\text{fwd}} = 24d^2 = 2 N_{\text{layer}} \)</strong></td></tr>
    </tbody>
  </table>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>极简小数字草稿纸演算（Scratchpad 2：令 \( d=2 \)）</h4>
  <p>在草稿纸上代入最微型数字验证代数恒等性：取隐藏维度 \( d = 2 \)，MLP 扩展维度 \( d_{\text{ff}} = 4 \times 2 = 8 \)。输入单 Token 向量 \( x \in \mathbb{R}^{1 \times 2} \)。</p>
  <ol>
    <li>单层参数量：\( N_{\text{layer}} = 12 \cdot 2^2 = 48 \) 个参数。</li>
    <li>前向逐项乘法：
      <br />- 3 个投影 \( x W_Q, x W_K, x W_V \)：每个是 \( (1 \times 2) \times (2 \times 2) \)，浮点计算为 \( 2 \cdot 1 \cdot 2 \cdot 2 = 8 \text{ FLOPs} \)，3 个合计 \( 24 \text{ FLOPs} \)。
      <br />- 输出投影 \( \text{context} \times W_O \)：\( (1 \times 2) \times (2 \times 2) \)，浮点计算为 \( 8 \text{ FLOPs} \)。注意力部分合计 \( 32 \text{ FLOPs} \)。
      <br />- MLP 升维 \( x W_1 \)：\( (1 \times 2) \times (2 \times 8) \)，浮点计算为 \( 2 \cdot 1 \cdot 2 \cdot 8 = 32 \text{ FLOPs} \)。
      <br />- MLP 降维 \( h W_2 \)：\( (1 \times 8) \times (8 \times 2) \)，浮点计算为 \( 2 \cdot 1 \cdot 8 \cdot 2 = 32 \text{ FLOPs} \)。MLP 部分合计 \( 64 \text{ FLOPs} \)。
    </li>
    <li>前向总浮点数：\( \text{FLOPs}_{\text{fwd}} = 32 + 64 = 96 \text{ FLOPs} \)。</li>
    <li>验证比值：
      \[ \frac{\text{FLOPs}_{\text{fwd}}}{N_{\text{layer}}} = \frac{96}{48} = 2 \]
      <strong>草稿验证通过</strong>：前向传播每 Token 恰好严格消耗 \( 2N \) FLOPs！
    </li>
  </ol>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么反向传播严格是 \( 4N \) FLOPs？——矩阵微积分严格证明</h4>
  <p>许多初学者直觉上认为反向传播应该与前向对称（以为也是 2N）。这里给出数学系标准的多元微积分链式法则推导：</p>
  <p>考虑通用全连接层的前向计算：</p>
  \[ Y = X W \]
  <p>其中输入激活矩阵 \( X \in \mathbb{R}^{B \times d_{\text{in}}} \)，参数权重 \( W \in \mathbb{R}^{d_{\text{in}} \times d_{\text{out}}} \)，输出特征 \( Y \in \mathbb{R}^{B \times d_{\text{out}}} \)。该层参数量为 \( N_{\text{param}} = d_{\text{in}} d_{\text{out}} \)。</p>
  <p><strong>前向计算量</strong>：一次矩阵乘法，消耗 \( 2 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}} = 2 B N_{\text{param}} \) FLOPs。</p>
  <p>在反向传播时，标量损失为 \( \mathcal{L} \)。反向传递从上一层接收到底层梯度的上游输入张量：</p>
  \[ G = \frac{\partial \mathcal{L}}{\partial Y} \in \mathbb{R}^{B \times d_{\text{out}}} \]
  <p>为了完成整个网络梯度的继续反向传递与权重参数更新，计算图必须执行<strong>两个完全独立的矩阵乘法</strong>：</p>
  <ol>
    <li><strong>第一步：对输入激活求梯度（用于向网络浅层继续反向传递）</strong><br />
      根据矩阵微分全导数公式：
      \[ \frac{\partial \mathcal{L}}{\partial X} = G W^T \]
      其矩阵维度运算为：\( (B \times d_{\text{out}}) \times (d_{\text{out}} \times d_{\text{in}}) \rightarrow (B \times d_{\text{in}}) \)。<br />
      浮点运算量为：
      \[ \text{FLOPs}_{\text{grad\_input}} = 2 \cdot B \cdot d_{\text{out}} \cdot d_{\text{in}} = 2 B N_{\text{param}} \]
    </li>
    <li><strong>第二步：对权重矩阵求梯度（用于优化器更新模型权重）</strong><br />
      根据矩阵微分全导数公式：
      \[ \frac{\partial \mathcal{L}}{\partial W} = X^T G \]
      其矩阵维度运算为：\( (d_{\text{in}} \times B) \times (B \times d_{\text{out}}) \rightarrow (d_{\text{in}} \times d_{\text{out}}) \)。<br />
      浮点运算量为：
      \[ \text{FLOPs}_{\text{grad\_weight}} = 2 \cdot d_{\text{in}} \cdot B \cdot d_{\text{out}} = 2 B N_{\text{param}} \]
    </li>
  </ol>
  <p><strong>反向传播总计算量</strong>：</p>
  \[ \text{FLOPs}_{\text{bwd}} = \text{FLOPs}_{\text{grad\_input}} + \text{FLOPs}_{\text{grad\_weight}} = 2 B N_{\text{param}} + 2 B N_{\text{param}} = 4 B N_{\text{param}} \]
  <p>单 Token（\( B=1 \)）的反向计算量<strong>严格等于 \( 4N \) FLOPs</strong>！</p>
  <p><strong>单 Token 训练总计算量（前向 + 反向）</strong>：</p>
  \[ \text{FLOPs}_{\text{train}} = \text{FLOPs}_{\text{fwd}} + \text{FLOPs}_{\text{bwd}} = 2N + 4N = 6N \quad (\text{FLOPs/token}) \]
  <p>对于含有 \( N \) 个参数的 Transformer 模型，训练 \( D \) 个 Token 所需的总浮点运算量精确公式为：</p>
  \[ \text{Total FLOPs} = 6 \cdot N \cdot D \]
  <p class="small">
    注：(1) 若开启激活重计算（Activation Checkpointing / Gradient Checkpointing）以显存换计算，在反向时需要把前向重新计算一遍，总计算量上升为 \( 2N + 2N + 4N = 8N \) FLOPs/token。<br />
    (2) 注意力上下文自乘 \( Q K^T \) 与 \( A V \) 涉及序列长度 \( T \)，单 Token 平摊计算量为 \( 4 T d \)。当隐藏维度 \( d \gg T \) 时，其占整网总计算量比例通常不足 5%~8%，在 Kaplan / Chinchilla 经典标度律推导中常作为次要项，密集参数矩阵乘法的主导项即为严谨的 \( 6N \)。
  </p>
</section>

<h3>7. 【MFU 实战演算】Model FLOPs Utilization 逐行草稿计算</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>前置定义与公式</h4>
  <p>模型浮点利用率（Model FLOPs Utilization, MFU）定义为模型有效计算产出速率与硬件理论密集算力峰值之比：</p>
  \[ \text{MFU} = \frac{\text{Effective FLOP/s}}{\text{Total Hardware Peak FLOPS}} = \frac{\text{Throughput (tokens/s)} \times 6N}{\sum_{i=1}^M P_{\text{peak}}^{(i)}} \]
  <p>其中 \( N \) 为模型参数量，\( \text{Throughput} \) 为集群端到端实测吞吐速率（Tokens/s），分母为所有加速卡理论半精度稠密峰值之和。</p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>真实工程场景草稿纸手算：8×A100 训练 7B 模型</h4>
  <p>在草稿纸上记录真实生产集群参数：</p>
  <ol>
    <li><strong>硬件规格</strong>：单节点 8 张 NVIDIA A100-SXM4-80GB。<br />
      单张 A100 的 BF16/FP16 Tensor Core 稠密非稀疏峰值为 \( 312 \text{ TFLOPS} = 3.12 \times 10^{14} \text{ FLOP/s} \)。<br />
      8 卡节点总理论算力峰值：
      \[ P_{\text{total}} = 8 \times (312 \times 10^{12} \text{ FLOP/s}) = 2.496 \times 10^{15} \text{ FLOP/s} = 2496 \text{ TFLOPS} \]
    </li>
    <li><strong>模型与实测吞吐</strong>：<br />
      训练 7B 稠密模型，\( N = 7 \times 10^9 \)。<br />
      实测集群端到端稳定训练吞吐为 \( \text{Throughput} = 24,000 \text{ tokens/s} \)（即每张卡平均处理 3,000 tokens/s）。
    </li>
    <li><strong>步骤 1：计算集群每秒有效浮点运算量（Effective FLOP/s）</strong><br />
      根据 6N 定理：
      \[ \text{Effective FLOP/s} = 24,000 \text{ tokens/s} \times (6 \times 7 \times 10^9 \text{ FLOP/token}) \]
      \[ = 24,000 \times 4.2 \times 10^{10} = 1.008 \times 10^{15} \text{ FLOP/s} = 1008 \text{ TFLOPS} \]
    </li>
    <li><strong>步骤 2：计算 MFU</strong><br />
      \[ \text{MFU} = \frac{1.008 \times 10^{15} \text{ FLOP/s}}{2.496 \times 10^{15} \text{ FLOP/s}} = \frac{1008}{2496} \approx 0.403846 \implies 40.38\% \]
    </li>
  </ol>
  <p><strong>工业达标基线解读</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>MFU 水平</th><th>典型区间</th><th>工程现状诊断</th></tr></thead>
    <tbody>
      <tr><td>较低</td><td>\( < 30\% \)</td><td>存在严重访存瓶颈（未用 FlashAttention）、小 Batch 导致 GEMM 算力未跑满、或数据加载/通信阻塞</td></tr>
      <tr><td>达标（优秀）</td><td>\( 35\% \sim 48\% \)</td><td>主流 Megatron-LM、DeepSpeed、JAX 工业级调优标准区间，计算与通信良好重叠</td></tr>
      <tr><td>极限顶尖</td><td>\( > 50\% \)</td><td>高度定制化的全异步流水通信重叠、算子深度融合（Kernel Fusion）与微架构协同调优</td></tr>
    </tbody>
  </table>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：今天就能跑通的三个实验</h4>
  <ol>
    <li><strong>90 分钟</strong>：在 TinyStories 的 1% 子集上从零训练一个 4 层 / 256 维的迷你 Transformer，
        记录 loss 曲线与 tokens/s（附录 B · E3）。</li>
    <li><strong>60 分钟</strong>：用 TRL 对 0.5B 模型做一次 LoRA SFT，对比微调前后的输出（附录 B · E4）。</li>
    <li><strong>45 分钟</strong>：在你的真实数据上跑「模型阶梯 + 分组交叉验证 + 置换检验」（附录 B · E7）——
        这个实验不需要 GPU，用 CPU 就能跑，却是你申请材料里最有分量的一个。</li>
  </ol>
  <p><strong>优先级建议</strong>：先做第 3 个。它直接产出项目成果，而前两个是能力训练。</p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    Checkpoint 5/6 需要「成对歌曲的适配」与「配对失败模式的统计」。这两件事都是<strong>特征工程 + 统计</strong>，
    不需要大算力；而 Checkpoint 7 的学习实验甚至可以用 CPU 完成（250 条样本、4 维特征）。
    <em>换句话说：你的项目瓶颈不是算力，而是模型设计、评估协议与听测组织。</em>
    把算力省下来做数据标注与多轮听测，比多训一个大模型更划算。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你想在免费资源上体验「多设备 SPMD 并行训练」。最现实的平台是？</p>
  <ul class="opts">
    <li>Colab 免费层的 TPU</li>
    <li data-ok>Kaggle 的 TPU v5e-8（8 个设备，可做 4×2 的数据/张量混合并行）</li>
    <li>任何一台笔记本</li>
    <li>HF Spaces 的 ZeroGPU</li>
  </ul>
  <p class="why">
    截至教程所述时点，Colab 免费层只提供单核 TPU v5e-1，<strong>无法使用 SPMD 多设备并行</strong>；
    而 Kaggle 免费提供 TPU v5e-8，正是 JAX AI Stack 教程针对的硬件。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 Colab 上做一次 90 分钟的训练，最不应该省略的一步是？</p>
  <ul class="opts">
    <li>把学习率调到最优</li>
    <li data-ok>把检查点定期写到 Google Drive / HF Hub</li>
    <li>使用更大的批大小</li>
    <li>打开 tqdm 进度条</li>
  </ul>
  <p class="why">
    Colab 会话随时可能断开且本地磁盘不持久。没有外存检查点，一次断线就等于全部重来。
    这是「工程纪律」在免费算力环境下最重要的一条。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">只有 16 GB 显存时，下面哪种计划最合理？</p>
  <ul class="opts">
    <li>全参数微调 7B 模型</li>
    <li data-ok>用 0.5B–1.5B 模型跑通全部流程（SFT → DPO → 评估），必要时再加 QLoRA 升到 7B</li>
    <li>放弃微调，只写提示词</li>
    <li>直接租 8 张 H100</li>
  </ul>
  <p class="why">
    方法论与规模无关。用 0.5B 把数据格式、训练循环、评估协议全部走通，
    再决定是否需要更大的模型；直接上 7B 全参数微调在 16 GB 上是数学上不可能的（模块 04）。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在推导 Transformer 训练算力需求时，为什么反向传播的 FLOPs 是前向传播的 2 倍（即前向 2N、反向 4N，合计 6N）？</p>
  <ul class="opts">
    <li>因为反向传播需要同时计算两次 Softmax</li>
    <li>反向传播的浮点数精度通常是前向的两倍</li>
    <li data-ok>根据矩阵微积分链式法则，每个线性层在前向只需一次矩阵乘法 \( Y = X W \)，而在反向必须计算两次独立的矩阵乘法：激活梯度 \( \frac{\partial \mathcal{L}}{\partial X} = G W^T \) 与权重梯度 \( \frac{\partial \mathcal{L}}{\partial W} = X^T G \)</li>
    <li>因为优化器 Adam 需要保留动量和方差两份副本</li>
  </ul>
  <p class="why">
    前向传播计算 \( Y = X W \) 是一次 GEMM（\( 2 B N \) FLOPs）；反向传播时，既要把梯度继续往浅层传递（需算 \( G W^T \) 产生激活梯度，消耗 \( 2 B N \) FLOPs），又要计算当前层权重梯度供优化器更新（需算 \( X^T G \) 产生权重梯度，消耗 \( 2 B N \) FLOPs）。两次 GEMM 相加恰好等于 \( 4 B N \)，严格是前向的 2 倍。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">某训练集群由 8 张峰值为 312 TFLOPS 的 GPU 组成，训练一个 7B 参数模型。当实测集群吞吐为 24,000 tokens/s 时，其 MFU 约为多少？该指标说明了什么？</p>
  <ul class="opts">
    <li>约为 18.5%，说明存在严重的数据加载或网络通信阻塞</li>
    <li data-ok>约为 40.4%，处于大模型分布式训练的高效达标区间（主流 Megatron-LM 调优标准水平）</li>
    <li>约为 78.2%，接近超算利用率极限</li>
    <li>约为 95.0%，说明已经完全消除了所有访存与通信开销</li>
  </ul>
  <p class="why">
    有效计算速率为 \( 24,000 \times 6 \times (7 \times 10^9) = 1.008 \times 10^{15} \text{ FLOP/s} = 1008 \text{ TFLOPS} \)；硬件理论总峰值为 \( 8 \times 312 = 2496 \text{ TFLOPS} \)；因此 \( \text{MFU} = \frac{1008}{2496} \approx 40.38\% \)。在大模型训练工程中，35%~48% 的 MFU 属于充分发挥硬件计算与通信重叠的标准达标表现。
  </p>
</div>

<div class="acc" data-t="深入：把「每次实验」变成可复现的资产" data-badge="工程">
  <div class="acc-body">
    <p>建议的目录结构（可以直接套用在本项目）：</p>
<pre><code>ai-course/
  index.html                  <span class="cm"># 本课程</span>
  content/                    <span class="cm"># 课程内容</span>
  labs/
    e7-model-ladder/
      run.py                  <span class="cm"># 一条命令跑完全部实验</span>
      config.yaml             <span class="cm"># 超参与数据路径</span>
      results/                <span class="cm"># RMSE、p 值、图</span>
      README.md               <span class="cm"># 结论与局限</span>
  notes/
    2026-10-03.md             <span class="cm"># 每日实验日志：假设 → 操作 → 结果 → 下一步</span></code></pre>
    <p>判断标准：<strong>一个陌生人 clone 这个仓库、运行一条命令，能否得到与你相同的图和数字？</strong>
    如果答案是「能」，你就达到了 Vandewalle 等人所说的可复现研究标准。</p>
  </div>
</div>
`
});
