/* content/11-economics.js — 模块 11：算力法则与训练规模演算 */

COURSE.register({

  id: "m11",

  part: 3,

  num: "11",

  title: "算力法则与训练规模：从 6ND FLOPs、Chinchilla 到单卡 T4 耗时物理演算",

  en: "Scaling Laws & Training Compute: From 6ND FLOPs to Single-T4 Physical Runtime",

  minutes: 35,

  tags: ["算力法则", "Chinchilla", "T4演练", "FLOPs"],

  body: String.raw`

<p class="lead">

  严肃的深度学习科研与底座自训<strong>从不依赖商业账单或各种付费订阅作为衡量尺度</strong>，

  而是严格以<strong>浮点计算量（FLOPs）、有效利用率（MFU）与计算规模法则（Scaling Laws）</strong>作为第一性原理。

  本模块带你手算著名的 \(6ND\) 预训练计算量公理与 Chinchilla 最优数据-参数配比，

  并在草稿纸上精确推演：<strong>单张免费云端 T4 GPU 训通一个 miniGPT 处理千万级 Token 究竟只需要几十秒。</strong>

</p>



<section class="blk blk-q">

  <h4><span class="ic">◆</span>核心问题：为什么模型绝不是「越大越好」？</h4>

  <p>

    许多初学者常有一个误区，以为自训模型必须追求几百亿参数，结果因为算力不足，模型还没跑几个 step 就被迫停机，损失甚至没来得及下降。

    现代大模型理论早已证明：<strong>在有限的算力预算下，盲目把参数做大只会导致灾难性的欠拟合；训练一个参数适中、但被充分训练的小模型，效果远胜于空有骨架的大模型。</strong>

  </p>

</section>



<h3>1. 算力的通用物理尺度：FLOPs 与 MFU</h3>

<p>

  为了在不同显卡架构与不同模型之间公平比较算力开销，学术界统一使用 <strong>FLOPs（Floating Point Operations，浮点运算次数）</strong>：

</p>

<ul>

  <li><strong>1 次浮点乘加（MAC, Multiply-Accumulate）</strong>：计算机执行一次形如 \(a \times b + c\) 的运算，计为 <strong>2 个 FLOPs</strong>（一次乘法 + 一次加法）。</li>

  <li><strong>硬件标称峰值算力</strong>：显卡厂商在极端理想条件下测得的理论最大计算速率。例如 Nvidia T4 单卡在半精度（FP16）张量核心下的理论峰值约为 <strong>65 TFLOPs</strong>（即 \(65 \times 10^{12}\) FLOPs/s）。</li>

  <li><strong>模型算力利用率（MFU, Model FLOPs Utilization）</strong>：

    在实际模型训练中，GPU 不可能 100% 满负荷打满矩阵乘法，它还需要从显存搬运张量、执行非线性激活函数与通信同步。

    实测训练有效算力与硬件理论峰值的比值即为 MFU：

    \[ \mathrm{MFU} = \frac{\text{FLOPs}_{\text{observed}}}{\text{FLOPs}_{\text{peak}}} \]

    在未深度优化的 PyTorch 训练脚本中，单卡 T4 的 MFU 通常约为 <strong>\(25\% \sim 35\%\)</strong>。按 \(30\%\) 折算，T4 的真实持续有效计算吞吐约为：

    \[ R_{\text{eff}} \approx 65 \times 10^{12} \times 0.30 \approx 2.0 \times 10^{13} \text{ FLOPs/s} \quad (20\text{ TFLOPs}) \]

</li>

</ul>



<h3>2. 核心公理推导：为什么自回归预训练计算量是 6ND FLOPs？</h3>

<p>

  设模型的可学习非嵌入参数量为 \(N\)，训练语料的总 Token 数量为 \(D\)。整个预训练过程的总浮点运算量恒满足：

  \[ C \approx 6 N D \]

  这个经典公式背后的微积分与线性代数机制非常优美，严格对齐 A-Level Further Maths 的导数与矩阵乘法：

</p>



<section class="blk blk-m">

  <h4><span class="ic">∑</span>前向与反向传播的 2ND vs 4ND 分解</h4>

  <ol>

    <li><strong>前向传播（Forward Pass）：\(2ND\) FLOPs</strong><br/>

      考虑一个全连接线性变换 \(Y = X W\)，其中输入 \(X \in \mathbb{R}^{B \times d_{\text{in}}}\)，权重 \(W \in \mathbb{R}^{d_{\text{in}} \times d_{\text{out}}}\)。<br/>

      权重参数量为 \(P = d_{\text{in}} \times d_{\text{out}}\)。输出矩阵每个元素需要进行 \(d_{\text{in}}\) 次乘法与加法，因此前向单步计算量为 \(2 \times B \times d_{\text{in}} \times d_{\text{out}} = 2 \times B \times P\)。<br/>

      对全网所有线性层（Attention 投影与 FFN 矩阵）累加，每处理 1 个 Token 的前向计算量严格为 <strong>\(2N\) FLOPs</strong>。处理 \(D\) 个 Token 总计：

      \[ C_{\text{forward}} = 2 N D \]

    </li>

    <li><strong>反向传播（Backward Pass）：\(4ND\) FLOPs（严格为前向的 2 倍）</strong><br/>

      根据多元微积分链式法则，反向求导必须独立完成两组互不相同的全量矩阵乘法：

      <ul>

        <li><strong>对输入求偏导（用于向上层继续回传梯度）</strong>：

          \[ \frac{\partial \mathcal{L}}{\partial X} = \frac{\partial \mathcal{L}}{\partial Y} W^\top \]

          这是一次形状为 \((B, d_{\text{out}}) \times (d_{\text{out}}, d_{\text{in}})\) 的矩阵乘法，耗费 \(2 \times B \times P\) FLOPs。

        </li>

        <li><strong>对权重参数求偏导（用于执行梯度下降更新）</strong>：

          \[ \frac{\partial \mathcal{L}}{\partial W} = X^\top \frac{\partial \mathcal{L}}{\partial Y} \]

          这是一次形状为 \((d_{\text{in}}, B) \times (B, d_{\text{out}})\) 的矩阵乘法，耗费 \(2 \times B \times P\) FLOPs。

        </li>

      </ul>

      因此，反向传播必须执行两次与前向规模完全相等的 GEMM 矩阵乘法，其计算量严格为前向的 <strong>2 倍</strong>：

      \[ C_{\text{backward}} = 4 N D \]

    </li>

    <li><strong>总计算量求和</strong>：

      \[ C_{\text{total}} = C_{\text{forward}} + C_{\text{backward}} = 2 N D + 4 N D = 6 N D \]

    </li>

  </ol>

</section>



<h3>3. Chinchilla 最优计算法则（Compute-Optimal Scaling）</h3>

<p>

  在总算力预算 \(C \approx 6ND\) 给定的约束下，我们应该怎么在参数量 \(N\) 与数据量 \(D\) 之间分配？

</p>

<table class="tbl">

  <thead><tr><th>理论流派</th><th>核心假设</th><th>分配比例结论</th><th>现实检验与影响</th></tr></thead>

  <tbody>

    <tr>

      <td><strong>Kaplan 法则（OpenAI 2020）</strong></td>

      <td>认为参数量 \(N\) 带来的收益远大于数据量 \(D\)</td>

      <td>\(N \propto C^{0.73}, \quad D \propto C^{0.27}\)</td>

      <td>催生了 GPT-3 等一大批模型，但后来被证实严重缺乏数据、处于欠拟合状态</td>

    </tr>

    <tr>

      <td><strong>Chinchilla 法则（DeepMind 2022）</strong></td>

      <td>基于变分优化严格推导，两者的幂律系数基本相等</td>

      <td><strong>\(N \propto C^{0.5}, \quad D \propto C^{0.5}\)（即 \(D \approx 20 N\)）</strong></td>

      <td><strong>现代大模型的黄金公理</strong>：LLaMA、Qwen 等开源基座均大幅增加训练 Token 数量</td>

    </tr>

  </tbody>

</table>

<p>

  <strong>对高中自学与单卡实验的巨大价值</strong>：<br/>

  根据 \(D \approx 20N\)，如果你想要训练一个 <strong>15M 参数</strong> 的迷你 GPT 模型，最优的数据规模仅需约 \(15\text{M} \times 20 = 300\text{M}\) Token；

  即使是进行验证性训练，使用 <strong>10M ~ 30M Token</strong>（约几本纯文本开源小书或精选中文维基百科子集），模型就能以极快速度收敛并展现出连贯的语言组织能力。

</p>



<div class="acc" data-t="纸笔算一算：手算单卡 T4 预训练 15M miniGPT 物理耗时" data-badge="动笔">

  <div class="acc-body">

    <p><strong>题目背景</strong>：在 Kaggle Notebooks 上分配了一张免费的 Nvidia T4（16GB 显存）。现在拿出草稿纸，动手计算训练一个 15M 参数的 miniGPT 模型处理 1000 万 Token（\(10\text{M}\)）所需的物理秒数：</p>

    <ol>

      <li><strong>参数与数据符号化</strong>：

        \\[ N = 15 \\times 10^6, \\qquad D = 10 \\times 10^6 \\]

      </li>

      <li><strong>套用 6ND 预训练总计算量公理</strong>：

        \\[ C = 6 N D = 6 \\times (1.5 \\times 10^7) \\times (1.0 \\times 10^7) = 9.0 \\times 10^{14} \\text{ FLOPs} \\]

      </li>

      <li><strong>代入单卡 T4 实测有效计算速率</strong>（按 MFU = 30% 保守估计）：

        \\[ R_{\\text{eff}} = 2.0 \\times 10^{13} \\text{ FLOPs/s} \\]

      </li>

      <li><strong>计算物理训练时长 \(t\)</strong>：

        \\[ t = \\frac{C}{R_{\\text{eff}}} = \\frac{9.0 \\times 10^{14}}{2.0 \\times 10^{13}} = 45 \\text{ 秒}！ \\]

      </li>

      <li><strong>若语料扩展到 1 亿 Token（\(100\\text{M}\)）</strong>：

        \\[ t_{100M} = 45 \\times 10 = 450 \\text{ 秒} = 7.5 \\text{ 分钟}！ \\]

      </li>

    </ol>

    <p><em>复盘收获</em>：不到 8 分钟，就能在完全免费的云端 T4 上完整跑完 1 亿 Token 的训练流程，亲眼看到 Cross-Entropy Loss 从初始无序的 \(\\ln |\\mathcal{V}| \\approx 9.21\) 平稳下降到 3.0 以下！自训小模型不需要花费任何费用，底层的物理定律完全由你掌控。</p>

  </div>

</div>



<h3>4. 训练规模与资源决策对比</h3>

<table class="tbl">

  <thead><tr><th>实验类型</th><th>参数规模 \(N\)</th><th>训练数据 \(D\)</th><th>单卡 T4 耗时</th><th>显存峰值（16GB T4）</th><th>学习目标</th></tr></thead>

  <tbody>

    <tr>

      <td><strong>超微玩具验证</strong></td>

      <td>1M ~ 3M</td>

      <td>1M Token</td>

      <td>&lt; 5 秒</td>

      <td>&lt; 150 MB</td>

      <td>检查张量维度、梯度回传与代码是否有 bug</td>

    </tr>

    <tr>

      <td><strong>miniGPT 从头预训练</strong></td>

      <td>15M ~ 45M</td>

      <td>10M ~ 50M Token</td>

      <td>1 分钟 ~ 15 分钟</td>

      <td>&lt; 1.5 GB</td>

      <td>观察完整损失下降曲线、学习率调度与生成续写</td>

    </tr>

    <tr>

      <td><strong>0.5B 基座 QLoRA 微调</strong></td>

      <td>0.5B（微调 5M）</td>

      <td>2M ~ 10M Token</td>

      <td>10 分钟 ~ 30 分钟</td>

      <td>约 3.2 GB</td>

      <td>让已有的开源小基座精准学会你的自定义下游指令</td>

    </tr>

    <tr>

      <td><strong>1.5B 基座 QLoRA 微调</strong></td>

      <td>1.5B（微调 18M）</td>

      <td>5M ~ 20M Token</td>

      <td>20 分钟 ~ 60 分钟</td>

      <td>约 5.5 GB</td>

      <td>工业级端到端微调并导出为本地免显卡极速 GGUF</td>

    </tr>

  </tbody>

</table>



<div class="quiz">

  <div class="qlabel">自测 · 1</div>

  <p class="q">在预训练自回归大语言模型时，为什么反向传播的 FLOPs 计算量严格是前向传播的 2 倍？</p>

  <ul class="opts">

    <li>因为反向传播必须执行两次前向传播验证</li>

    <li data-ok>根据链式法则，反向求导对于每个矩阵乘法必须分别计算对激活值的偏导（向上传递）和对权重的偏导（更新参数），各需一次等规模的 GEMM 操作</li>

    <li>因为优化器维护一阶与二阶动量</li>

    <li>这是混合精度浮点截断带来的额外代价</li>

  </ul>

  <p class="why">

    前向单步 \(Y=XW\) 是一次矩阵乘法（\(2N\) FLOPs）。反向传播时，\(\frac{\partial \mathcal{L}}{\partial X} = \frac{\partial \mathcal{L}}{\partial Y} W^\top\) 与 \(\frac{\partial \mathcal{L}}{\partial W} = X^\top \frac{\partial \mathcal{L}}{\partial Y}\) 各是一次等规模的矩阵乘法，合起来严格耗费 \(4N\) FLOPs。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 2</div>

  <p class="q">根据 Chinchilla 最优计算法则（Compute-Optimal），若你有充足的算力预算训练一个 10M 参数的小模型，最优的训练语料 Token 数量大约是多少？</p>

  <ul class="opts">

    <li>10 万（0.1M）Token</li>

    <li>200 万（2M）Token</li>

    <li data-ok>2 亿（200M）Token</li>

    <li>100 亿（10B）Token</li>

  </ul>

  <p class="why">

    Chinchilla 定律指明最优训练配比为 \(D \approx 20N\)。对于 \(N = 10\text{M}\) 的模型，最佳语料量为 \(10\text{M} \times 20 = 200\text{M}\) Token。盲目加大参数量只会导致模型欠拟合。

  </p>

</div>



<div class="quiz">

  <div class="qlabel">自测 · 3</div>

  <p class="q">一张 GPU 标称理论算力为 100 TFLOPs，但在运行某大模型训练时测得每秒实际完成的模型 FLOPs 为 30 TFLOPs，该任务的 MFU（模型算力利用率）是多少？</p>

  <ul class="opts">

    <li>10%</li>

    <li data-ok>30%</li>

    <li>70%</li>

    <li>100%</li>

  </ul>

  <p class="why">

    \(\mathrm{MFU} = \frac{30\text{ TFLOPs}}{100\text{ TFLOPs}} = 30\%\)。这是衡量分布式与单卡训练系统工程优化效率的核心指标。

  </p>

</div>



<div class="quiz quiz-blank" data-ans="45" data-tol="1">

  <div class="qlabel">填空 · 计算实战</div>

  <p class="q">在 Kaggle 免费 T4 GPU（有效实测算力 \(2.0 \times 10^{13}\) FLOPs/s）上从零训练一个 \(N=15\text{M}\) 参数的 miniGPT 模型处理 \(D=10\text{M}\) Token 语料。根据公理 \(C = 6ND\)，该训练任务在理论物理耗时上仅需多少秒？（填入整数）</p>

  <div class="blank-wrap">

    <input type="text" class="blank-input" placeholder="输入计算秒数（整数）..." />

    <button class="blank-btn">提交验证</button>

    <span class="blank-feedback"></span>

  </div>

  <p class="why">

    根据 \(C = 6ND = 6 \times (1.5 \times 10^7) \times (10^7) = 9 \times 10^{14}\) FLOPs，训练时间 \(t = \frac{9 \times 10^{14}}{2 \times 10^{13}} = 45\) 秒。单张 T4 完全足以在不到一分钟内完成基础预训练闭环。

  </p>

</div>

`

});

