/* content/23-compression.js — 模块 23：压缩与合并 */
COURSE.register({
  id: "m23",
  part: 6,
  num: "23",
  title: "压缩与合并：剪枝、稀疏、量化感知与模型融合",
  en: "Compression & Model Merging",
  minutes: 42,
  tags: ["高阶", "部署", "实用"],
  body: String.raw`
<p class="lead">
  一个 8B 模型，fp16 权重就要 16 GB；换成 4-bit，同样的模型只要 4 GB。中间这 12 GB 是怎么省出来的？
  把权重扔掉一半（剪枝）、把每个数写短一点（量化）、把两个矩阵合一个矮的（低秩）、
  把多个微调模型揉成一个（合并）——这四条路压的<strong>根本不是同一个东西</strong>。
  这一模块要做的，是把「参数账 / 显存账 / 算力账 / 延迟账」四本账彻底分开算清楚。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：压缩模型像整理一间仓库。你可以把货扔掉一半（剪枝）、
    把每件货的标签写得更短（量化）、把两层货架换成一个矮矮的宽货架（低秩分解）、
    或者把两个仓库的货拼进一个（模型合并）。<br />
    <strong>这一讲要建立的直觉</strong>：<em>稀疏度是「参数指标」，不是「速度指标」</em>。
    仓库里少了一半的货，并不代表叉车会跑得更快——除非叉车的说明书里写了「遇到空格直接跳过」。<br />
    <strong>读完你能回答</strong>：为什么 90% 稀疏度的模型在 A100 上不一定比稠密模型快？
    什么时候必须上 QAT 而不能只做 PTQ？为什么把两个不同基座的模型权重平均会得到胡言乱语？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你的 7B 模型要部署到一张 24 GB 的卡上，现在有四个候选方案：
    (a) 4-bit 量化，(b) 把 FFN 剪掉 50%，(c) 把两个任务微调模型合并成一个，
    (d) 把它 upcycle 成一个稀疏专家模型。预算只够做一次完整实验。
  </p>
  <p>
    要选对，先得回答一个更基础的问题：<strong>你被卡住的是显存、算力，还是延迟？</strong>
    这三者对不同手段的敏感度完全不同：量化同时改善显存与解码延迟；剪枝名义上省算力，
    但在没有稀疏硬件的通用 GPU 上几乎不改善任何一项；模型合并省的是「模型个数」，
    对单模型的显存与延迟一分钱都不省。选错方向，实验做完也解释不了结果。
  </p>
</section>

<h3>1. 全景：六条路线各自压的是显存、算力还是延迟</h3>
<p>
  先把「压缩」这个词拆开。下面六条路线经常被混在一起讲，但它们作用的对象、
  需要的训练预算、以及最终改善的指标都不一样。
</p>
<table class="tbl small">
  <thead><tr><th>路线</th><th>压的是什么</th><th>主要改善</th><th>需要训练吗</th><th>一句话原理</th></tr></thead>
  <tbody>
    <tr>
      <td>量化<br />（模块 08 已讲）</td>
      <td>每个数用几位表示</td>
      <td>显存 ↓↓、解码延迟 ↓</td>
      <td>通常不需要（PTQ）</td>
      <td>用低位宽整数格点逼近浮点权重：\(w \approx s(q-z)\)</td>
    </tr>
    <tr>
      <td>剪枝</td>
      <td>权重矩阵里的元素个数</td>
      <td>理论 FLOPs ↓；<strong>实际仅结构化剪枝有效</strong></td>
      <td>非结构化通常需要重训</td>
      <td>按重要性把一部分权重置零或删除</td>
    </tr>
    <tr>
      <td>稀疏化<br />（训练时）</td>
      <td>参数与激活的结构</td>
      <td>算力 ↓，且质量能靠训练补回</td>
      <td>是（必须）</td>
      <td>训练时就约束稀疏模式，让模型在约束下收敛</td>
    </tr>
    <tr>
      <td>蒸馏<br />（模块 17）</td>
      <td>模型本身的规模</td>
      <td>显存 ↓、算力 ↓、延迟 ↓</td>
      <td>是（要训学生）</td>
      <td>用教师的输出分布或中间特征指导学生</td>
    </tr>
    <tr>
      <td>低秩分解</td>
      <td>权重矩阵的秩</td>
      <td>显存 ↓、算力 ↓</td>
      <td>通常需要轻量恢复训练</td>
      <td>把 \(W\) 近似写成两个瘦矩阵的乘积 \(BA\)</td>
    </tr>
    <tr>
      <td>模型合并</td>
      <td>模型的<strong>个数</strong>（N 个变 1 个）</td>
      <td>部署与运维成本 ↓</td>
      <td>不需要</td>
      <td>在权重空间做加减平均</td>
    </tr>
  </tbody>
</table>
<p>
  看最后一列之前，先看第四列。<strong>量化和模型合并几乎不需要训练</strong>，属于「最后一公里」的手段；
  剪枝、稀疏化、蒸馏、低秩分解都要付训练预算。这就是为什么在生产环境里，
  量化总是第一个上、合并是「手上已经有一堆同源微调模型」时的应急方案，
  而稀疏只有在你能重新训练时才值得投入。
</p>
<p>
  还有一条容易被忽略的事实：这六条路里，<strong>只有量化同时改善显存和延迟，并且几乎不需要重训</strong>。
  它不是最优雅的压缩方法，但它是最划算的。把这句记住，后面所有取舍都有了参照系。
</p>

<h3>2. 剪枝：结构化与非结构化，以及「稀疏为什么常常不加速」</h3>
<p>剪枝按「删掉什么」先分成两大类，这两类的工程命运完全不同。</p>
<table class="tbl small">
  <thead><tr><th>维度</th><th>非结构化剪枝</th><th>结构化剪枝</th></tr></thead>
  <tbody>
    <tr><td>删什么</td><td>任意位置的单个权重</td><td>整行 / 整列 / 整个注意力头 / 整个块</td></tr>
    <tr><td>稀疏模式</td><td>不规则</td><td>规则（例如每 4 个元素里删 2 个）</td></tr>
    <tr><td>存储</td><td><strong>需要索引</strong>（CSR / 位图），可能反而更占地方</td><td>直接变小，无需索引</td></tr>
    <tr><td>通用硬件加速</td><td>基本没有</td><td>有（NVIDIA Ampere 起的 Sparse Tensor Core）</td></tr>
    <tr><td>同稀疏度下的精度</td><td>更好</td><td>更差</td></tr>
    <tr><td>典型方法</td><td><span class="t" data-tterm="Magnitude pruning" data-d="幅度剪枝：按权重绝对值大小排序，删掉最小的那一部分；只看权重，不看数据。">幅度剪枝</span>、Wanda、SparseGPT</td><td>通道剪枝、头剪枝、2:4 稀疏</td></tr>
  </tbody>
</table>

<h4>2.1 硬件前提：通用 GPU 为什么对零值视而不见</h4>
<p>
  通用 GPU 的矩阵乘内核（cuBLAS 之类）假设操作数是<strong>稠密</strong>的：它按固定的 tile 读显存、
  按固定的节奏喂给 Tensor Core。矩阵里有一个零，内核不会少读一个字节，也不会少做一次乘加。
  <em>零值对它是完全透明的。</em>
</p>
<p>
  NVIDIA 从 Ampere 架构开始引入了<strong>细粒度结构化稀疏</strong>：在 A100 上体现为
  <strong>2:4 模式</strong>——每 4 个连续元素里至少 2 个是零。Sparse Tensor Core 只对非零元素做乘加，
  通过跳过零值把这一路 GEMM 的吞吐翻倍，同时把压缩后的操作数体积减半
  （<a href="https://developer.nvidia.com/blog/exploiting-ampere-structured-sparsity-with-cusparselt/" target="_blank" rel="noopener">NVIDIA 技术博客：Exploiting NVIDIA Ampere Structured Sparsity with cuSPARSELt</a>，2020）。
</p>
<p>
  但请注意括号里那句是「<strong>这一路 GEMM</strong> 翻倍」。同一篇博客给出的 BERT-Large 各层实测加速是
  <strong>1.3×–1.6×</strong>，而不是 2×；并且明确写道「workload 越大，稀疏越有用」。
  <em>这是本模块最重要的一个数字：理论 2×，实测 1.3–1.6×。</em>
</p>

<h4>2.2 从幅度剪枝到 Wanda：评分函数才是关键</h4>
<p>
  <span class="t" data-tterm="Magnitude pruning" data-d="幅度剪枝：按权重绝对值大小排序，删掉最小的那一部分；只看权重，不看数据。">幅度剪枝</span>
  的规则简单到一行：按 \(|w|\) 排序，删掉最小的那部分。它只看权重、不看数据，
  在中小模型上一直是很强的基线，但在 LLM 上会明显掉点。
</p>
<p>
  <strong>Wanda</strong>（Sun、Liu、Bair、Kolter，ICLR 2024）给出了一个更聪明的评分：
  不只看权重的绝对值，还要乘以<em>这个权重对应的输入通道的激活范数</em>，并且<strong>逐输出通道</strong>比较。
  这样做的动机来自 LLM 中普遍存在的「大幅值特征」——少数输入通道的激活极大，
  剪掉与它们相连的权重代价远高于剪掉别的。
  论文报告：Wanda 不需要重训、也不需要二阶信息，明显优于纯幅度剪枝，
  并能与需要密集权重更新的方法竞争
  （<a href="https://arxiv.org/abs/2306.11695" target="_blank" rel="noopener">A Simple and Effective Pruning Approach for Large Language Models</a>，arXiv:2306.11695）。
</p>
<p>
  <strong>SparseGPT</strong>（Frantar、Alistarh，ICML 2023）走的是另一条路：把剪枝写成一个<em>逐层的稀疏回归问题</em>，
  用近似二阶信息一次性求解。它首次证明 GPT 系大模型可以在<strong>不重训</strong>的情况下剪到至少 50% 稀疏度而精度损失极小，
  在 OPT-175B 与 BLOOM-176B 上 4.5 小时内完成；60% 非结构化稀疏度下困惑度增加可忽略；
  并且可以推广到 2:4 与 4:8 半结构化模式，也能和权重量化叠加
  （<a href="https://arxiv.org/abs/2301.00774" target="_blank" rel="noopener">SparseGPT: Massive Language Models Can be Accurately Pruned in One-Shot</a>，arXiv:2301.00774）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>Wanda 的一行评分</h4>
  <p>对权重矩阵的第 \(i\) 行第 \(j\) 列，评分定义为权重绝对值乘以对应输入通道的激活范数：</p>
  \[ s_{ij} = |W_{ij}| \cdot \lVert X_j \rVert_2 \]
  <p>
    其中 \(X_j\) 是第 \(j\) 个输入通道在一小批校准数据上的激活。逐行比较 \(s_{ij}\)，
    保留每行最大的若干项，其余置零。注意两个极端情况：
  </p>
  <p>
    <strong>只看权重</strong>（令 \(\lVert X_j\rVert_2\) 全等于 1）就退化成幅度剪枝；
    <strong>只看激活</strong>（令 \(|W_{ij}|\) 全等于 1）就退化成按输入通道剪枝。
    Wanda 的贡献是说明这两者的<em>乘积</em>比任何单独一项都好，而且不需要任何梯度或二阶矩阵。
  </p>
  <p>
    计算成本也值得记住：估一次 \(\lVert X_j\rVert_2\) 只需要跑一遍校准集的前向，
    所以 Wanda 的额外成本大致等于一次推理，而不是一次训练。
  </p>
</section>

<h3>3. 稀疏度与精度：一条经验曲线</h3>
<p>
  下面的表是<strong>量级参考</strong>，不是可以直接引用的精确数字。它的用途是帮你判断
  「我这个稀疏度大概落在安全区、可恢复区、还是崩溃区」，以及需要哪种方法。
</p>
<table class="tbl small">
  <thead><tr><th>非结构化稀疏度</th><th>纯幅度剪枝（不重训）</th><th>一次性权重更新方法（Wanda / SparseGPT 类）</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>0 – 20%</td><td>几乎无损</td><td>几乎无损</td><td>这一区间很安全，但省下的也很少</td></tr>
    <tr><td>50%</td><td>明显掉点</td><td>接近无损</td><td>SparseGPT 报告「at least 50% sparsity」可做到 minimal loss</td></tr>
    <tr><td>60%</td><td>大幅掉点</td><td>困惑度增加可忽略</td><td>论文报告的边界（OPT-175B / BLOOM-176B）</td></tr>
    <tr><td>70 – 80%</td><td>通常不可用</td><td>需要持续更新或重训</td><td>收益开始被质量损失吃掉</td></tr>
    <tr><td>90% 以上</td><td>崩溃</td><td>仅对「微调增量」这类高度冗余参数成立</td><td>见 6.3 的 DARE，注意作用对象完全不同</td></tr>
  </tbody>
</table>
<p>
  最后一行特别容易被误读，这里提前说清楚：DARE 报告能丢掉 <strong>90% 甚至 99% 的 delta 参数</strong>
  （微调后权重与预训练权重之差），那是因为 SFT 增量本身量级极小（论文报告通常在 0.002 以内）且极度冗余。
  这和「预训练权重能丢 90%」是<strong>两件完全不同的事</strong>。
  一个是在已经学好的表征上做小幅调整，一个是在拆掉模型的知识本身。
</p>
<p>
  还有一个经验规律值得记住：<strong>稀疏度对精度的伤害是非线性的</strong>。
  从 0 到 50% 掉得很慢，过了某个拐点之后每一分稀疏度都要用质量换。
  这个拐点与模型规模、层类型（FFN 比注意力更耐剪）、以及是否逐层设置不同保留率都有关系——
  所以成熟的剪枝方案会给不同层分配<em>不同的稀疏度</em>，而不是全局一个数。
</p>

<h3>4. 数学内核：手算一次剪枝的四本账</h3>
<p>
  设一个 \(L = 32\)、\(d = 4096\)、\(d_{ff} = 14336\) 的模型（量级对应 Llama-3-8B，见模块 04）。
  我们只对 FFN 做剪枝，保留率 \(r = 0.5\)。
</p>
<p><strong>第一本账：参数量。</strong>单层 FFN 的参数（SwiGLU 的三个矩阵）是</p>
\[ N_{\text{ffn}} = 3\,d\,d_{ff} = 3 \times 4096 \times 14336 \approx 1.762 \times 10^{8} \]
<p>32 层合计：</p>
\[ N_{\text{ffn,tot}} = 32 \times 1.762 \times 10^{8} \approx 5.64 \times 10^{9} \]
<p>
  保留一半，则非零元素约 \(2.82 \times 10^{9}\) 个，也就是「省下」约 2.82 B 个权重。
  这个数字很好听，但它是<strong>参数账</strong>，不等于省了显存。
</p>

<p><strong>第二本账：显存。</strong>这里分四种情况，差别巨大：</p>
<table class="tbl small">
  <thead><tr><th>存储方式</th><th>每个权重的字节数</th><th>5.64 B 权重的占用</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>稠密 fp16</td><td>2</td><td>11.3 GB</td><td>剪枝前的基线</td></tr>
    <tr><td>置零但仍是稠密张量</td><td>2</td><td><strong>11.3 GB</strong></td><td>最常见也最没用的做法：显存一点没省</td></tr>
    <tr><td>CSR 稀疏存储</td><td>2（数值）+ 4（列索引）</td><td>≈ 16.9 GB</td><td><strong>反而更大</strong>：2.82 B × 6 B</td></tr>
    <tr><td>2:4 结构化</td><td>1.125</td><td>≈ 6.3 GB</td><td>每 4 个权重存 2 个数值 + 2 个 2-bit 索引</td></tr>
  </tbody>
</table>
<p>
  CSR 那一行一定要理解：非零元素少了<em>不等于</em>占用少了。
  每个非零元素都要额外带一个 4 字节的列索引，再加行指针；
  50% 稀疏度下索引开销已经完全抵消了省下的数值。
  <strong>只有结构化（2:4）压缩是「免费」的</strong>，因为索引被压进了硬件元数据格式里。
</p>

<p><strong>第三本账：算力（FLOPs）。</strong>用阿姆达尔定律。设 FFN 占前向 GEMM 算力的 \(2/3\)，
其余投影占 \(1/3\)。理想情况下被剪的部分算力降到 \(r = 0.5\)：</p>
\[ S_{\text{ideal}} = \frac{1}{\tfrac{2}{3}\cdot 0.5 + \tfrac{1}{3}} = \frac{1}{0.667} \approx 1.5 \]
<p>
  但 2:4 Sparse Tensor Core 只把这部分提速 \(k\) 倍，实测取 \(k \approx 1.4\)（对应上面的 1.3–1.6×）：
</p>
\[ S_{\text{real}} = \frac{1}{\tfrac{2}{3}\cdot\tfrac{1}{1.4} + \tfrac{1}{3}} = \frac{1}{0.810} \approx 1.24 \]
<p>
  如果换成 90% 的<strong>非结构化</strong>稀疏、而硬件完全不支持跳过零值，那么
  \(S \approx 1.0\)——<em>参数少了 90%，速度一点没变。</em>
</p>

<p><strong>第四本账：为什么实际加速总也达不到理论值。</strong></p>
<p>
  <strong>① 阿姆达尔定律。</strong>没被剪的那 \(1/3\) 成了新的下限。
  上面 \(S_{\text{ideal}} = 1.5\) 而不是 2.0，就是因为注意力投影、归一化、激活函数都还在。
</p>
<p>
  <strong>② 硬件只对特定模式加速。</strong>非结构化稀疏在通用 Tensor Core 上没有对应指令，
  要真的跳过零，需要专门的稀疏内核（或 2:4 这种硬件认识的模式）。
  这是「稀疏」与「加速」之间那道最容易被忽略的墙。
</p>
<p>
  <strong>③ 形状与批大小。</strong>稀疏内核需要足够大的 \(M\)、\(N\)、\(K\) 才能吃满 Tensor Core。
  小 batch、短序列、逐 token 解码时矩阵很瘦，稀疏带来的空档填不满，收益接近于零。
</p>
<p>
  <strong>④ 解码阶段是带宽瓶颈，不是算力瓶颈。</strong>回到模块 08 的结论：
  解码每步的时间约等于「模型字节数 ÷ 显存带宽」。
  如果剪枝<em>没有真正减少字节数</em>（比如只是置零），解码速度<strong>完全不变</strong>。
  这就是为什么「稀疏能加速」这句话必须补上前提。
</p>
<p>
  <strong>⑤ 隐性成本。</strong>索引与元数据的解码开销、非结构化稀疏带来的负载不均、
  以及为了保住精度必须付的重训预算。这些都不在「参数少了多少」这个数字里。
</p>

<h3>5. QAT 与 PTQ：什么时候必须「边训练边量化」</h3>
<p>
  这是量化里最重要的一组概念区分，也是最常被混用的一对缩写。
</p>
<p>
  <strong>PTQ（训练后量化）</strong>：训练全部结束之后，用少量校准数据估计每一组的缩放因子与零点，
  然后直接把权重转成低位宽。<strong>它真的把值 cast 成低位宽 dtype。</strong>
</p>
<p>
  <strong>QAT（量化感知训练）</strong>：在训练或微调过程中插入「伪量化」——
  前向照常模拟量化-反量化的数值误差，但张量<strong>仍然是浮点</strong>；
  反向靠<span class="t" data-tterm="Straight-through estimator" data-d="直通估计器：把不可导的取整/钳位操作在反向传播时当作恒等映射，梯度直接透传。">直通估计器</span>
  把梯度透过去。训练完再转成真正的低精度算子
  （<a href="https://docs.pytorch.org/ao/stable/workflows/qat.html" target="_blank" rel="noopener">PyTorch torchao：Quantization-Aware Training (QAT)</a>）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>两种量化的数学差别</h4>
  <p><strong>真正的量化（PTQ 用）</strong>——算出整数、存成低位宽：</p>
  \[ q = \mathrm{clamp}\!\left(\mathrm{round}\!\left(\frac{x}{s}\right) + z,\ q_{\min},\ q_{\max}\right) \]
  \[ x_{q} = s\,(q - z), \qquad x_q \ \text{stored as int8/int4} \]
  <p><strong>伪量化（QAT 用）</strong>——只模拟数值误差，张量保持浮点：</p>
  \[ \hat{x} = s\!\left(\mathrm{clamp}\!\left(\mathrm{round}\!\left(\frac{x}{s}\right) + z,\ q_{\min},\ q_{\max}\right) - z\right) \]
  <p>
    关键区别在反向传播：\(\mathrm{round}\) 的导数几乎处处为零，
    所以 QAT 约定 \(\partial \hat{x} / \partial x \approx 1\)，梯度当作恒等映射直接透传。
    这就是直通估计器。
  </p>
  <p>
    <strong>一个能立刻验证的推论</strong>：因为伪量化的前向与真量化完全一致，
    训练时模型「感受到」的误差就是部署时「感受到」的误差，于是梯度会把权重推到
    <em>即使在量化格点上也很稳</em>的位置。这是 QAT 唯一但足够强大的机制。
  </p>
</section>

<table class="tbl small">
  <thead><tr><th>维度</th><th>PTQ（训练后量化）</th><th>QAT（量化感知训练）</th></tr></thead>
  <tbody>
    <tr><td>需要什么</td><td>几百到几千条校准数据</td><td>完整训练/微调流程、数据、算力</td></tr>
    <tr><td>成本量级</td><td>分钟到小时</td><td>与一次微调同量级</td></tr>
    <tr><td>4-bit 权重量化</td><td>通常够用（GPTQ / AWQ / NF4）</td><td>更稳，但不是必需</td></tr>
    <tr><td>低于 4-bit 或激进量化激活</td><td>容易崩</td><td>基本是唯一可行路线</td></tr>
    <tr><td>典型场景</td><td>LLM 部署、消费级显卡、快速迭代</td><td>边缘 NPU、视觉模型、int8 激活、精度余量极紧</td></tr>
    <tr><td>能否「补回全部掉点」</td><td>—</td><td><strong>不能</strong>，只能补回一部分</td></tr>
  </tbody>
</table>
<p>
  「只能补回一部分」这句话有实测支撑。torchao 文档给出的评估里，
  以 gemma3-12b-it 为例：bf16 基线的 wikitext 困惑度是 9.1477，
  直接 int4 之后升到 9.7745，加上 int4 QAT 回到 9.5631——
  也就是把差距<strong>恢复了约 34%</strong>；同一个模型在 bbh 上恢复约 45%。
  数字不大，但方向非常一致：<em>QAT 是「把 PTQ 掉的分捡回来一部分」，不是免费的午餐。</em>
</p>
<p>
  <strong>一个必须记住的术语陷阱</strong>：QLoRA 不是 QAT。
  QLoRA 把基座模型 4-bit 量化后<strong>冻结</strong>，只训练浮点的 LoRA 适配器
  （<a href="https://arxiv.org/abs/2305.14314" target="_blank" rel="noopener">QLoRA: Efficient Finetuning of Quantized LLMs</a>，arXiv:2305.14314）。
  它训练的是 LoRA，不是量化误差本身；部署时基座是 4-bit、LoRA 仍是 16-bit。
</p>
<p>
  <strong>决策顺序</strong>：先试更好的 PTQ（GPTQ / AWQ / NF4），
  只有在掉点超出容忍度、或者目标平台要求 int8 激活、或者位宽要压到 4-bit 以下时，
  才进入 QAT。这条顺序能省下大量算力。
</p>

<h3>6. 模型合并与 MoE upcycling：把权重当作可运算的对象</h3>
<p>
  前五节都在「减少」参数。这一节做相反的事：<strong>在不增加推理成本的前提下，把多个模型的能力塞进一份权重里</strong>。
  它的核心假设是：权重空间里的算术是有意义的。
</p>

<h4>6.1 权重平均与「模型汤」</h4>
\[ \theta_{\text{soup}} = \frac{1}{K}\sum_{k=1}^{K}\theta_k \]
<p>
  前提非常强：所有 \(\theta_k\) 必须从<strong>同一个预训练权重</strong>出发，
  用不同的超参（学习率、数据顺序、增强方式）微调得到。
  Wortsman 等（ICML 2022）证明这种平均经常能超过超参搜索里最好的单个模型，
  而推理时只有一个模型、零额外开销——所以作者叫它
  <span class="t" data-tterm="Model soup" data-d="模型汤：把同一预训练权重的多次微调结果做权重平均；推理成本与单个模型相同，却能接近集成的效果。">模型汤</span>
  而不是「集成」
  （<a href="https://arxiv.org/abs/2203.05482" target="_blank" rel="noopener">Model soups: averaging weights of multiple fine-tuned models improves accuracy without increasing inference time</a>，arXiv:2203.05482）。
</p>
<p>
  为什么有效？论文的观察是：这些微调结果往往落在同一个<strong>低误差盆地</strong>里，
  盆地内部用直线连接仍然是低误差的。这就是「权重平均 ≈ logit 集成」在什么条件下成立的问题，
  论文给出了与损失面平坦度、预测置信度相关的解析关系。
</p>

<h4>6.2 任务向量与任务算术</h4>
\[ \tau_t = \theta_t - \theta_{\text{pre}}, \qquad \theta_{\text{multi}} = \theta_{\text{pre}} + \lambda \sum_t \tau_t \]
<p>
  Ilharco 等（ICLR 2023）提出
  <span class="t" data-tterm="Task vector" data-d="任务向量：微调后权重减去预训练权重得到的差，代表权重空间中「朝某个任务变好」的方向。">任务向量</span>：
  它指定了权重空间里的一个<em>方向</em>，朝这个方向移动就改善对应任务。
  任务向量可以被取负（削弱某项能力）也可以相加（同时提升多个任务）；
  论文还展示了「A 之于 B 如同 C 之于 D」这类类比关系可以直接在权重空间里做算术
  （<a href="https://arxiv.org/abs/2212.04089" target="_blank" rel="noopener">Editing Models with Task Arithmetic</a>，arXiv:2212.04089）。
</p>
<p>
  式中的 \(\lambda\) 是缩放系数，实践中常在 0.3–1.0 之间。它太大就会把模型拉出低误差区域，
  表现为输出变得混乱但不像任何一个源模型。\(\lambda\) 通常是合并实验里<strong>唯一需要调的旋钮</strong>。
</p>

<h4>6.3 TIES 与 DARE：先处理干扰，再合并</h4>
<p>
  <strong>TIES-Merging</strong>（Yadav 等，NeurIPS 2023）指出合并掉点有两个干扰来源：
  (a) <em>冗余参数值</em>——微调时几乎没变的参数也被卷进平均；
  (b) <em>符号不一致</em>——不同模型认为同一个参数应该往正走还是往负走。
  方法分三步：裁剪（把变化很小的参数归零）、符号选举（逐参数按多数投票决定最终符号）、
  只合并在最终符号上一致的参数
  （<a href="https://arxiv.org/abs/2306.01708" target="_blank" rel="noopener">TIES-Merging: Resolving Interference When Merging Models</a>，arXiv:2306.01708）。
</p>
<p>
  <strong>DARE</strong>（Yu 等，ICML 2024）从一个更激进的角度切入：先随机丢弃比例 \(p\) 的 delta 参数，
  再把剩下的按 \(1/(1-p)\) 放大，用来近似原来的 delta。
</p>
\[ \hat{\delta}_i = \frac{m_i}{1-p}\,\delta_i, \qquad m_i \sim \mathrm{Bernoulli}(1-p) \]
<p>
  这样做的期望是<strong>无偏</strong>的（\(\mathbb{E}[\hat{\delta}_i] = \delta_i\)），代价是方差变大。
  论文报告 SFT 的 delta 参数取值范围极小（通常在 0.002 以内）且极度冗余，
  可以丢掉 90% 甚至 99% 而能力不变；把 DARE 作为插件接上参数融合之后，
  可以合并多个同源的 SFT 模型，并且在大规模模型上出现「合并后的模型超过任何单个源模型」的现象
  （<a href="https://arxiv.org/abs/2311.03099" target="_blank" rel="noopener">Language Models are Super Mario: Absorbing Abilities from Homologous Models as a Free Lunch</a>，arXiv:2311.03099）。
</p>

<h4>6.4 为什么有时一起涨、有时直接崩</h4>
<p><strong>会提升的情形</strong>——三个条件同时满足时最稳：</p>
<p>
  <strong>① 同源。</strong>同一个基座、同一个 tokenizer、同一套训练框架。
  <strong>② delta 小且近似正交。</strong>LoRA、少量步数的 SFT 都属于这一类；
  不同任务的更新方向互不冲突，叠加起来接近「同一张权重表里塞进更多功能」。
  <strong>③ 模型足够大。</strong>DARE 明确观察到「这个现象在大规模模型上更明显」。
</p>
<p><strong>会崩的情形</strong>——下面五条，任何一条单独出现都足够致命：</p>
<p>
  <strong>① 基座或 tokenizer 不同。</strong>embedding 与输出头的每一行对应一个 token ID。
  两个词表不同时，第 1000 行可能对应完全不同的子词。直接平均等于把两个坐标系硬叠在一起，
  结果是两边都是噪声。这是最常见、也最容易犯的合并错误。
</p>
<p>
  <strong>② 架构不同。</strong>层数、RoPE 基频、GQA 的 KV 头数、是否使用 MLA，
  任何一处不同都会让「同名」的权重张量形状或语义错位。
</p>
<p>
  <strong>③ 符号冲突严重且没做符号选举。</strong>正负相消，两边能力一起消失。
</p>
<p>
  <strong>④ delta 量级差异过大。</strong>一个训了 200 步的 LoRA 和一个训了 3 个 epoch 的全参数微调，
  delta 范数可能差一到两个数量级；简单相加会被大的那个淹没，小的那个等于没加。
</p>
<p>
  <strong>⑤ 能力目标本身冲突。</strong>例如把「对齐过的模型」和「去对齐的模型」合并。
  这不是数值问题，是目标冲突——合并没有机制去仲裁两个互相矛盾的行为倾向。
</p>
<p>
  <strong>实践口诀</strong>：先对齐 tokenizer 与 config，再打印每个 delta 的范数分布看量级是否可比，
  最后才去调 \(\lambda\) 和 \(p\)。跳过前两步直接调参，是在给一个结构性错误做参数搜索。
</p>

<h4>6.5 MoE upcycling：把稠密模型「升级」成稀疏专家</h4>
<p>
  最后一条路线听起来和前面都不同：<em>不要压缩，要扩容——但扩的是容量，不是算力。</em>
  思路是：你已经花了大钱训好一个稠密 checkpoint，与其从零训一个 MoE，
  不如把稠密 FFN <strong>复制成 \(E\) 个专家</strong>、加一个路由器，然后继续训练。
  这个过程叫
  <span class="t" data-tterm="Upcycling" data-d="上循环：把稠密模型的权重复制成稀疏专家模型的初始化，再继续训练，从而复用已投入的预训练算力。">upcycling</span>。
</p>
<p>
  Komatsuzaki 等（2022）在 T5 Base / Large / XL 与 ViT Base / Large 上验证：
  sparse upcycling 只用约 <strong>50% 的初始稠密预训练沉没成本</strong>，
  就在 SuperGLUE 与 ImageNet 上超过对应的稠密模型；
  也超过了用 100% 稠密预训练算力<strong>从零训练</strong>的稀疏模型
  （<a href="https://arxiv.org/abs/2212.05055" target="_blank" rel="noopener">Sparse Upcycling: Training Mixture-of-Experts from Dense Checkpoints</a>，arXiv:2212.05055）。
</p>
<p>两个必须做对的工程细节：</p>
<p>
  <strong>① 打破对称性。</strong>如果 \(E\) 个专家初始完全相同，
  那么在这一步它们对所有输入给出相同的输出，路由器拿到的梯度是纯噪声，
  模型永远学不出「分工」。必须给专家加扰动或噪声（论文里用随机初始化路由器 + 复制后的扰动）。
</p>
<p>
  <strong>② 路由器要预热并做负载均衡。</strong>否则会出现专家坍缩——
  路由器把绝大多数 token 送给少数几个专家，其余专家从不更新，等于白养。
</p>
<p>
  把这一节和模块 04 的结论接上：<strong>upcycling 买到的是「容量」，付出的代价是显存</strong>。
  所有专家都要装进显存，而单卡小批量实验里省下来的算力根本用不上。
  所以它是「大规模训练场景的武器」，不是「单卡部署的武器」。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：剪枝 / 量化 / 合并的三条账（CPU 可跑，几分钟）</h4>
  <p>
    这个实验完全自包含：现场训练一个极小的语言模型，然后对同一个模型做三种压缩，
    分别量出「质量、字节数、墙钟时间」。跑完你会亲眼看到「参数变少 ≠ 变快」。
  </p>
<pre><code>import torch, torch.nn as nn, copy, io, time
torch.manual_seed(0)

<span class="cm"># ---------- 0. 造一个极小的“语言模型”并训练它 ----------</span>
class Tiny(nn.Module):
    def __init__(s, V=64, d=256, ff=1024):
        super().__init__()
        s.emb = nn.Embedding(V, d)
        s.l1, s.l2 = nn.Linear(d, ff), nn.Linear(ff, d)
        s.out = nn.Linear(d, V)
    def forward(s, x):
        h = s.emb(x)
        h = h + s.l2(torch.relu(s.l1(h)))
        return s.out(h)

V, T, B = 64, 32, 32
x = torch.randint(0, V, (B, T))
y = torch.roll(x, -1, dims=1)

def ce(m, target):
    with torch.no_grad():
        return nn.functional.cross_entropy(m(x).reshape(-1, V), target.reshape(-1)).item()

m = Tiny()
opt = torch.optim.AdamW(m.parameters(), lr=3e-3)
for _ in range(300):
    loss = nn.functional.cross_entropy(m(x).reshape(-1, V), y.reshape(-1))
    opt.zero_grad(); loss.backward(); opt.step()
print("训练后 loss =", round(ce(m, y), 3))

def kb(mod):                       <span class="cm"># 序列化后的真实字节数</span>
    buf = io.BytesIO(); torch.save(mod.state_dict(), buf)
    return buf.tell() / 1024

<span class="cm"># ---------- 1. 幅度剪枝：50% 置零，不压缩存储 ----------</span>
def magnitude_prune(mod, p, names=("l1", "l2")):
    for n in names:
        W = getattr(mod, n).weight.data
        k = max(1, int(p * W.numel()))
        thr = W.abs().flatten().kthvalue(k).values
        W[W.abs() &lt;= thr] = 0.0

mp = copy.deepcopy(m); magnitude_prune(mp, 0.5)
nz = sum((getattr(mp, n).weight != 0).sum().item() for n in ("l1", "l2"))
tot = sum(getattr(mp, n).weight.numel() for n in ("l1", "l2"))
print("剪枝后 loss =", round(ce(mp, y), 3),
      "| 非零占比 =", round(nz / tot, 3),
      "| 字节 =", round(kb(mp), 1), "KB (剪枝前", round(kb(m), 1), "KB)")

<span class="cm"># ---------- 2. 稀疏存储的账：CSR 反而更大 ----------</span>
def csr_kb(mod, p, names=("l1", "l2")):
    b = 0
    for n in names:
        W = getattr(mod, n).weight.data
        nnz = int((1 - p) * W.numel())
        b += nnz * (W.element_size() + 4) + (W.shape[0] + 1) * 4
    return b / 1024
print("CSR(50%) 估算 =", round(csr_kb(m, 0.5), 1), "KB  vs  稠密 =", round(kb(m), 1), "KB")

<span class="cm"># ---------- 3. 延迟：置零不会让通用内核变快 ----------</span>
A, Bd = torch.randn(2048, 2048), torch.randn(2048, 2048)
def ms(f, n=20):
    f(); t0 = time.perf_counter()
    for _ in range(n): f()
    return (time.perf_counter() - t0) / n * 1e3
As = A.clone()
thr = As.abs().flatten().kthvalue(int(0.9 * As.numel())).values
As[As.abs() &lt;= thr] = 0.0
print("dense matmul  =", round(ms(lambda: A @ Bd), 2), "ms")
print("90% 稀疏(仍按稠密算) =", round(ms(lambda: As @ Bd), 2), "ms",
      "| 非零占比 =", round((As != 0).float().mean().item(), 3))

<span class="cm"># ---------- 4. 量化：动态 int8，看字节与延迟 ----------</span>
mq = torch.ao.quantization.quantize_dynamic(m, {nn.Linear}, dtype=torch.qint8)
print("量化后 字节 =", round(kb(mq), 1), "KB (原", round(kb(m), 1), "KB)")

<span class="cm"># ---------- 5. 合并：两个“任务”的 delta 相加 vs 取平均 ----------</span>
def finetune(base, shift, steps=150):
    mm = copy.deepcopy(base)
    yy = torch.roll(x, -shift, dims=1)
    o = torch.optim.AdamW(mm.parameters(), lr=1e-3)
    for _ in range(steps):
        l = nn.functional.cross_entropy(mm(x).reshape(-1, V), yy.reshape(-1))
        o.zero_grad(); l.backward(); o.step()
    return mm

a, b = finetune(m, 1), finetune(m, 5)
ya, yb = torch.roll(x, -1, dims=1), torch.roll(x, -5, dims=1)

def merge(base, models, ws=None):
    out = copy.deepcopy(base)
    ws = ws or [1.0 / len(models)] * len(models)
    pa = dict(base.named_parameters())
    deltas = [dict(mm.named_parameters()) for mm in models]
    with torch.no_grad():
        for name, p in out.named_parameters():
            d = sum(w * (dd[name].data - pa[name].data) for w, dd in zip(ws, deltas))
            p.add_(d)
    return out

print("--- loss（越小越好）---")
print("基座        : 任务1", round(ce(m, ya), 3), " 任务2", round(ce(m, yb), 3))
print("微调A       : 任务1", round(ce(a, ya), 3), " 任务2", round(ce(a, yb), 3))
print("微调B       : 任务1", round(ce(b, ya), 3), " 任务2", round(ce(b, yb), 3))
mg = merge(m, [a, b])
print("合并(1,1)   : 任务1", round(ce(mg, ya), 3), " 任务2", round(ce(mg, yb), 3))
for lam in (0.5, 1.5):
    mm2 = merge(m, [a, b], [lam, lam])
    print("合并(%.1f)   : 任务1" % lam, round(ce(mm2, ya), 3),
          " 任务2", round(ce(mm2, yb), 3))</code></pre>
  <p><strong>要记录并解释的四件事：</strong></p>
  <p>
    <strong>①</strong> 剪枝后 loss 涨了多少？非零元素少了一半，但<em>字节数一点没变</em>——
    因为置零不改变稠密张量的存储。
  </p>
  <p>
    <strong>②</strong> CSR 估算比稠密更大。这正是手算那一节里 16.9 GB 的来源。
  </p>
  <p>
    <strong>③</strong> dense matmul 与 90% 稀疏 matmul 的耗时几乎相同。
    这就是「稀疏 ≠ 加速」在你自己机器上的直接证据。
  </p>
  <p>
    <strong>④</strong> 合并后的模型在任务 1 和任务 2 上<em>都不如</em>各自专用的模型，
    但通常<em>都优于基座</em>。这就是合并的真实价值：
    不是「一个模型打败两个」，而是「用一个模型的成本，拿到两个任务的大部分能力」。
    顺手把 \(\lambda\) 调到 1.5 试试，你会看到它开始崩——这就是「拉出低误差盆地」的样子。
  </p>
</section>

<h3>7. 三本账：同一个 7B 模型算三遍（fp16 / int8 / int4）</h3>
<p>
  第 4 节只算了 FFN 那一块。这一节换成一个完整模型，把<strong>权重账、KV 账、延迟账</strong>分成三本分别算，
  每一步都留中间结果，读者可以拿计算器复算。参考配置取整是为了好算，<em>不是任何一家产品的规格</em>：
</p>
<table class="tbl small">
  <thead><tr><th>符号</th><th>取值</th><th>它出现在哪本账里</th></tr></thead>
  <tbody>
    <tr><td>层数 \(L\)</td><td>32</td><td>权重与 KV 都要乘它</td></tr>
    <tr><td>隐藏维度 \(d\)</td><td>4096</td><td>参数量的主因子</td></tr>
    <tr><td>FFN 中间维度 \(d_{ff}\)</td><td>14336</td><td>SwiGLU 的三个矩阵</td></tr>
    <tr><td>注意力头数 \(h\) / 每头维度 \(d_h\)</td><td>32 / 128</td><td>\(h\,d_h = d\)</td></tr>
    <tr><td>KV 头数 \(h_{kv}\)</td><td>8</td><td>GQA，\(h/h_{kv} = 4\)</td></tr>
    <tr><td>词表 \(V\)</td><td>32000</td><td>embedding 与输出头各一份</td></tr>
  </tbody>
</table>

<h4>7.1 第一本账：权重体积</h4>
<p>参数量按四块相加（注意力投影、FFN、embedding、输出头）：</p>
\[ N_{\text{attn}} = L\,(d^2 + 2\,d\,h_{kv}d_h + d^2) = 32 \times 41{,}943{,}040 \approx 1.342\times10^{9} \]
\[ N_{\text{ffn}} = L \cdot 3\,d\,d_{ff} = 32 \times 176{,}160{,}768 \approx 5.637\times10^{9} \]
\[ N_{\text{emb}} = 2\,V\,d = 2 \times 32000 \times 4096 \approx 0.262\times10^{9} \]
\[ N = N_{\text{attn}} + N_{\text{ffn}} + N_{\text{emb}} \approx 7.24\times10^{9} \]
<p>
  也就是约 <strong>7.2 B</strong> 参数。接下来只做一次乘法：\(B_w = N \times b_w\)，
  其中 \(b_w\) 是每个权重占的字节数。4-bit 那一行还要额外算一笔：
  <em>每 128 个权重共享一个 fp16 缩放因子与一个 fp16 零点</em>，
  于是每个权重多出 \(4/128 = 0.03125\) 字节。
</p>
<table class="tbl small">
  <thead><tr><th>表示</th><th>每权重字节</th><th>权重体积</th><th>相对 fp16</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>fp16 / bf16</td><td>2</td><td>\(7.24\times2 = 14.5\) GB</td><td>1.00×</td><td>训练与推理的默认；也是你下载下来的那个文件</td></tr>
    <tr><td>int8（逐通道 scale）</td><td>1</td><td>7.24 GB</td><td>2.00×</td><td>掉点通常最小的一档，多数框架默认可用</td></tr>
    <tr><td>int4（group=128，scale 与 zero 为 fp16）</td><td>\(0.5 + 0.03125 = 0.531\)</td><td>3.85 GB</td><td>3.76×</td><td><strong>生产上最常见的 4-bit</strong>；比纸面 4.0× 差 6%</td></tr>
    <tr><td>int4（忽略缩放开销）</td><td>0.5</td><td>3.62 GB</td><td>4.00×</td><td>只存在于幻灯片里，任何真实格式都到不了</td></tr>
    <tr><td>NF4（group=64，非均匀格点）</td><td>约 0.53</td><td>约 3.85 GB</td><td>3.76×</td><td>格点按正态分位数摆放，押注权重近似正态</td></tr>
  </tbody>
</table>
<p>
  <strong>这张表要带走三句话</strong>：① 2 B 到 1 B 到 0.5 B 就是全部秘密，量化省的是<em>存储宽度</em>；
  ② 真实 4-bit 到不了 4.0×，因为缩放因子也要存，group 越小开销越大；
  ③ 权重账只付<strong>一次</strong>，与上下文长度无关——这一点马上会和 KV 账形成对比。
</p>

<h4>7.2 第二本账：KV cache</h4>
<p>每 token 的 KV 字节数只与结构有关，与序列里已经有几个 token 无关：</p>
\[ M_{\text{kv}} = 2 \cdot L \cdot h_{kv} \cdot d_h \cdot b = 2 \times 32 \times 8 \times 128 \times 2 = 131{,}072 \ \text{B} = 128 \ \text{KiB} \]
<p>
  式子里最前面的 2 是「K 与 V 各一份」，\(b = 2\) 是 fp16 的字节数。
  要强调的是：<strong>权重账只付一次，KV 账每条序列、每个 token 都要付</strong>。
  把 128 KiB 乘上长度，就得到一张能直接和显存对照的表：
</p>
<table class="tbl small">
  <thead><tr><th>上下文长度</th><th>fp16 KV（128 KiB/token）</th><th>int8 KV（64 KiB/token）</th><th>对照</th></tr></thead>
  <tbody>
    <tr><td>8,192（8K）</td><td>1.0 GiB</td><td>0.5 GiB</td><td>相对 fp16 权重（14.5 GB）还很小</td></tr>
    <tr><td>32,768（32K）</td><td>4 GiB</td><td>2 GiB</td><td>开始和权重同一量级</td></tr>
    <tr><td>131,072（128K）</td><td>16 GiB</td><td>8 GiB</td><td><strong>一条序列就是 int4 权重的 4 倍</strong></td></tr>
    <tr><td>16 条 × 8K 并发</td><td>16 GiB</td><td>8 GiB</td><td>并发数是被 KV 除出来的，不是拍出来的</td></tr>
  </tbody>
</table>
<p>
  注意最后一行：<em>决定并发上限的是 KV，不是权重</em>。把权重从 14.5 GB 压到 3.85 GB 省下 10.6 GB，
  正好够 10 条 8K 序列的 fp16 KV；而 KV 量化到 int8 又能让同样的显存多装一倍序列。
  这就是「长上下文首先是显存容量问题」的全部来源。
</p>

<h4>7.3 第三本账：解码延迟与吞吐</h4>
<p>
  解码一步要读一遍权重（模块 08 的结论），所以单序列的解码时间近似为「字节数 ÷ 显存带宽」。
  取标称带宽 1.0 TB/s（一张消费级 24 GB 卡的量级；数据中心卡是它的 2–3 倍）：
</p>
\[ t_{\text{step}} \approx \frac{B_w}{BW} \]
<table class="tbl small">
  <thead><tr><th>权重格式</th><th>每步权重字节</th><th>步时（理想）</th><th>单序列吞吐（理想）</th><th>按 70% 带宽效率折算</th></tr></thead>
  <tbody>
    <tr><td>fp16</td><td>14.5 GB</td><td>14.5 ms</td><td>69 tok/s</td><td>约 48 tok/s</td></tr>
    <tr><td>int8</td><td>7.24 GB</td><td>7.2 ms</td><td>138 tok/s</td><td>约 97 tok/s</td></tr>
    <tr><td>int4</td><td>3.85 GB</td><td>3.85 ms</td><td>260 tok/s</td><td>约 180 tok/s</td></tr>
  </tbody>
</table>
<p>三件事必须一起说，否则这张表会被用错：</p>
<p>
  <strong>① 这是上界，不是承诺。</strong>真实卡上取到标称带宽的 60%–80% 就算不错，所以表里给了两列。
  比例的<em>关系</em>是可靠的（量化大致把单序列解码提速 2–4 倍），绝对值不可靠。
</p>
<p>
  <strong>② 加速来自带宽，不是来自算力。</strong>很多 4-bit 权重内核（业界常称 W4A16）的做法是
  先把权重反量化回 fp16、再走普通的 fp16 GEMM。这种情况下 Tensor Core 的算力<em>一点没变</em>，
  省下来的只是把 14.5 GB 的读取换成 3.85 GB。想靠量化拿算力，要用 int8 这种有原生整数 GEMM 的格式，
  而且只在<strong>算力受限</strong>的 prefill 阶段有效。
</p>
<p>
  <strong>③ 批一大，权重就被摊薄，KV 开始主导。</strong>设批大小 \(B\)、上下文字长 \(T\)，
  一步要读的字节数是 \(B_w + B \cdot T \cdot M_{\text{kv}}\)。取 \(B = 4\)、\(T = 131072\)、fp16 KV：
</p>
\[ B \cdot T \cdot M_{\text{kv}} = 4 \times 131072 \times 131072 \approx 6.87\times10^{10} \ \text{B} \]
<p>
  也就是约 <strong>69 GB</strong> 的 KV 流量，而权重只有 3.85 GB（int4）——<em>KV 是权重的 18 倍</em>。
  结论很直接：<strong>长上下文服务里只量化权重几乎没用，必须同时处理 KV。</strong>
  把 KV 也压到 int4（约 34 KiB/token，含缩放开销），这一步的流量降到约 \(1.8\times10^{10}\) B，
  步时从 72 ms 回到 22 ms，4 条序列合计约 180 tok/s。
  第 24 章第 8 节会用同一套式子做架构选型。
</p>

<h3>8. 该不该压：先看卡在哪，再选手段</h3>
<p>
  压缩的门槛从来不是「能不能压」，而是「压完有没有解决你真正的问题」。
  下面这张表按<strong>症状</strong>索引：先在左列找到你观察到的现象，再往右看该动哪一步。它可以直接当查表用。
</p>
<table class="tbl small">
  <thead><tr><th>你观察到的症状</th><th>首选手段</th><th>预期量级</th><th>主要代价</th><th>一行验证方法</th></tr></thead>
  <tbody>
    <tr>
      <td>加载模型就 OOM，权重占满显存</td>
      <td>4-bit PTQ（GPTQ / AWQ / NF4 这一类）</td>
      <td>权重 ÷ 3.8</td>
      <td>长尾能力下降，结果受校准集影响</td>
      <td>量化前后跑同一份评测的困惑度（见第 9 节）</td>
    </tr>
    <tr>
      <td>权重不大，但并发 4 条长序列就 OOM</td>
      <td>KV 量化 + 滑窗 / GQA</td>
      <td>KV ÷ 2 到 ÷ 10</td>
      <td>注意力精度轻微下降</td>
      <td>固定显存下还能开几条序列（不是看困惑度）</td>
    </tr>
    <tr>
      <td>batch=1 解码只有 20 tok/s，用户等不了</td>
      <td>权重量化（低比特）＋ 投机解码</td>
      <td>延迟与权重字节数成正比</td>
      <td>需要支持该格式的内核</td>
      <td>量 tok/s，不要量 FLOPs</td>
    </tr>
    <tr>
      <td>首 token 要等几秒（prefill 慢）</td>
      <td>量化帮助有限；先查内核与批量大小</td>
      <td>多半停留在 1× 附近</td>
      <td>容易花掉时间却看不到变化</td>
      <td>量 TTFT 与 GPU 利用率，再决定</td>
    </tr>
    <tr>
      <td>稀疏度 90%，速度没变</td>
      <td>这是结构性错误：先换存储格式与内核</td>
      <td>通用内核约 1×</td>
      <td>可能白做一次实验</td>
      <td>同时打印非零占比与墙钟时间</td>
    </tr>
    <tr>
      <td>手上 6 个同源 LoRA，要部署 6 份</td>
      <td>TIES / DARE 合并</td>
      <td>6 份变 1 份</td>
      <td>基座与 tokenizer 必须同源</td>
      <td>合并后在每个任务上分别评测</td>
    </tr>
    <tr>
      <td>算力被激活参数卡住，显存还有余</td>
      <td>MoE upcycling（或直接换更大的 MoE）</td>
      <td>容量上升，每 token 算力不变</td>
      <td>显存上升、需要大规模训练</td>
      <td>同时报总参数与激活参数</td>
    </tr>
  </tbody>
</table>
<p><strong>同样重要的是「什么时候绝对不该做」——高级章最容易犯的错，是把每个技术都写成必需品：</strong></p>
<table class="tbl small">
  <thead><tr><th>你的情况</th><th>结论</th><th>原因</th><th>一行验证</th></tr></thead>
  <tbody>
    <tr><td>模型小于 1B，且和推理代码跑在同一台机器上</td><td>不要量化</td><td>省下的不到 1 GB，却给输出加了一层有界噪声</td><td>算 \(N \times 2\) GB，看它占显存的比例</td></tr>
    <tr><td>目标是提高准确率，显存与延迟都够</td><td>不要压缩</td><td>压缩只会让指标变差，不会变好</td><td>先画误差-数据量曲线（模块 09）</td></tr>
    <tr><td>输出是回归出来的连续标量</td><td>不要量化输出头</td><td>目标本来就在小数值上比较，量化噪声可能翻转结论</td><td>量化前后比较指标的置信区间</td></tr>
    <tr><td>不能重训，也没有稀疏硬件</td><td>剪枝 / 稀疏 / 蒸馏全部出局</td><td>它们要么要重训，要么在通用 GPU 上不加速</td><td>先查有没有 2:4 支持（见 2.1）</td></tr>
    <tr><td>手上没有同源的多个微调模型</td><td>合并没有对象</td><td>不同基座合并出来的结果是噪声</td><td>对比两份 config 的 tokenizer 与层数</td></tr>
  </tbody>
</table>

<h4>8.1 失败模式四段式：症状 → 原因 → 一行验证 → 对策</h4>
<table class="tbl small">
  <thead><tr><th>症状</th><th>原因</th><th>一行验证</th><th>对策</th></tr></thead>
  <tbody>
    <tr>
      <td>量化后输出重复、循环、偶尔乱码</td>
      <td>少数激活通道幅值极大，把整组的 scale 拉爆，小权重全被压到同一个格点</td>
      <td>逐层打印激活绝对值最大值与中位数之比</td>
      <td>离群通道保留 fp16；或用按激活幅度保护显著通道的方法（AWQ 的思路）</td>
    </tr>
    <tr>
      <td>主评测没掉，长上下文 / 代码 / 小语种崩了</td>
      <td>量化误差集中在低频 token，主评测覆盖不到</td>
      <td>把评测集换成长尾子集重跑一次困惑度</td>
      <td>逐层混合精度（敏感层留 8 bit），或减小 group size</td>
    </tr>
    <tr>
      <td>显存一点没降</td>
      <td>你只量化了权重，KV 还在按 fp16 增长</td>
      <td>分开量权重与 KV（框架的 memory summary）</td>
      <td>KV 量化，或降低并发、加滑窗</td>
    </tr>
    <tr>
      <td>精度对了，速度没变</td>
      <td>低比特内核没被调用，回落到「反量化 + fp16 GEMM」</td>
      <td>用 profiler 看实际执行的内核名</td>
      <td>换成后端支持的低比特格式，或接受「只省显存不省时间」</td>
    </tr>
    <tr>
      <td>和公开报告的数字差很远</td>
      <td>校准集、group size、评测口径三件事不同</td>
      <td>对齐这三项后重跑</td>
      <td>只和自己同口径的基线比，不比别人的绝对值</td>
    </tr>
  </tbody>
</table>

<h3>9. 二十分钟量出「掉了多少精度」</h3>
<p>
  压缩最容易糊弄的一步是评估：很多人只测几条自己写的样例，看到「还能答」就上线了。
  正确做法是<strong>固定一份评测文本，量化前后各跑一次困惑度</strong>，再额外跑一个长尾子集。
  下面这个脚本不到 20 行 CPU 上就能看到趋势；换成 7B 只需要改一个字符串。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>30 分钟最小实现：量出 int4 相对 bf16 掉了多少</h4>
  <p>
    先准备一个 <code>eval.txt</code>：把你自己业务里 100 条左右的文本拼在一起（音频项目的报告、
    标注说明、领域文档都行）。<strong>不要用训练集</strong>，否则量出来的是记忆而不是泛化。
  </p>
<pre><code>import torch, math
from transformers import AutoModelForCausalLM, AutoTokenizer

mid = "Qwen/Qwen2.5-0.5B"          <span class="cm"># 0.5B 足够看清趋势，换成你的 7B 不改结构</span>
tok = AutoTokenizer.from_pretrained(mid)
text = open("eval.txt", encoding="utf-8").read()
ids = tok(text, return_tensors="pt").input_ids
window = 512                        <span class="cm"># 固定窗口，保证两次评测用的是同一份数据</span>

def ppl(model):                     <span class="cm"># 困惑度 = 平均负对数似然的指数</span>
    nll, n = 0.0, 0
    for i in range(0, ids.size(1) - window, window):
        x = ids[:, i:i + window].to(model.device)
        with torch.no_grad():
            nll += model(x, labels=x).loss.item() * (x.size(1) - 1)
        n += x.size(1) - 1
    return math.exp(nll / n)

m16 = AutoModelForCausalLM.from_pretrained(mid, torch_dtype=torch.bfloat16, device_map="auto")
m4 = AutoModelForCausalLM.from_pretrained(mid, load_in_4bit=True, device_map="auto")
mb = lambda m: sum(p.numel() * p.element_size() for p in m.parameters()) / 2**20

print("bf16 ppl =", round(ppl(m16), 4), "| int4 ppl =", round(ppl(m4), 4))
print("delta =", round(ppl(m4) - ppl(m16), 4), "| ratio =", round(ppl(m4) / ppl(m16), 4))
print("MB: bf16 =", round(mb(m16), 1), "| int4 =", round(mb(m4), 1))</code></pre>
  <p>
    <code>load_in_4bit=True</code> 走的是 bitsandbytes 的 NF4 路径；环境没有 CUDA 时，
    可以换成 PyTorch 原生的 torchao 量化 API，脚本结构与上面完全相同（只换掉加载那两行）。
    想更严格一点，就把 <code>eval.txt</code> 换成长尾内容再跑一次。
  </p>
  <p><strong>要记录并解释的三个数字：</strong></p>
  <p>
    <strong>① 全量 <code>delta</code>。</strong>同一个模型、同一份文本，int4 相对 bf16 的困惑度差。
    量级参考：好的 4-bit 方案通常落在 0.1–0.5 之间（第 5 节引用的 torchao 实测是 0.63：9.1477 到 9.7745）。
    这个数字本身不是好坏的判据，<em>要和你的任务指标一起看</em>。
  </p>
  <p>
    <strong>② 压缩比 <code>MB(bf16) / MB(int4)</code>。</strong>用它去对照 7.1 的表：理论上是 3.76×，
    实测明显偏低，说明有些层（embedding、归一化、输出头）没有被量化。
    <em>这一条最常被忽略</em>：只量化 Linear 层时 embedding 与 LM head 还在 fp16，实际收益会低于 3.76×。
  </p>
  <p>
    <strong>③ 长尾子集上的 <code>delta</code>。</strong>把 <code>eval.txt</code> 换成你的长尾内容再跑一次。
    如果全量 delta 是 0.2、长尾是 2.0，这个量化方案对你就不可用——
    而只跑全量评测的人会得出完全相反的结论。
  </p>
  <p>
    <strong>别忘了任务级指标。</strong>困惑度只衡量「预测下一个 token」，
    对生成质量、指令跟随、回归误差都不敏感。压缩前后必须再跑一遍模块 09 的那套任务指标，
    并额外报「成对偏好胜率」这类相对指标。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么用在真实项目里：crossfade 项目要不要压？</h4>
  <p>
    <strong>先把 crossfade 项目拆成两个模型。</strong>一个是<em>音频模型本身</em>
    （频谱编码器加回归头，量级 10M–100M 参数，输出 \(T^*\)、LUFS、谱通量这类连续量）；
    另一个是你旁路的 <em>LLM 助手</em>（读实验日志、写报告、生成标注、批量跑分析）。
    这两个模型的压缩结论<strong>完全相反</strong>，混在一起谈一定会选错。
  </p>
  <p>
    <strong>对音频模型本身：基本不值。</strong>先算账：100M 参数在 fp16 下只有
    \(100\times10^{6} \times 2\ \text{B} = 0.2\ \text{GB}\)，量化到 4-bit 大约省 0.15 GB——
    在一张 24 GB 卡上这个数字没有任何工程意义。而你的模型输出是连续标量，
    评测协议（模块 09 的 LUFS、谱通量、成对偏好）本身就是在小数值上做比较，
    多出来的一层量化噪声完全可能让 A/B 结论翻面。
    <em>剪枝同理：没有 2:4 硬件适配的小模型，参数少一半也不加速，还要重训一遍。</em>
  </p>
  <p>
    <strong>合并这类技术在你这里反而可能值。</strong>如果你按「听众组 / 曲风 / 录音条件」
    分别微调了若干个 LoRA，可以用 TIES 或 DARE 把它们合成一个，
    省下的是每次实验都要切换适配器、每个版本都要单独评测的心智负担。
    前提仍然是 6.4 里的三条：同一基座、同一 tokenizer，并且先打印各 delta 的范数看量级是否可比。
  </p>
  <p>
    <strong>对旁路的 LLM 助手：值，而且经常是决定性的。</strong>
    7.2B 在 fp16 下是 14.5 GB，4-bit 是 3.85 GB，省下 10.6 GB。
    按 7.2 的账，这 10.6 GB 正好等于 10 条 8K 序列的 fp16 KV——
    也就是说，量化让「本地跑一个助手」和「同时跑 10 条长上下文分析」从二选一变成可以同时做。
    这类收益是<strong>容量型</strong>的：它不提升单条质量，但把「能不能跑」变成「跑得动」。
  </p>
  <p>
    <strong>一句话答案</strong>：crossfade 项目里，
    <em>量化值得用在旁路的大模型上，不值得用在直接出预测的音频模型上；
    合并值得用在你的多个 LoRA 上；剪枝与稀疏在你不能重训的前提下不值得花时间。</em>
  </p>
  <p>
    <strong>可照抄的顺序</strong>：① 先记录基线（助手模型的困惑度加上音频模型的任务指标）；
    ② 只对助手模型做 4-bit PTQ；③ 用第 9 节那 20 行脚本量 <code>delta</code>（全量与长尾各一次）；
    ④ 若 delta 超出你评测协议里的最小可觉察差异，退回 int8 或做逐层混合精度；
    ⑤ 音频模型保持 fp16，把省下来的显存给并发和上下文。
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>常见误区</h4>
  <p>
    <strong>① 以为「稀疏必然加速」。</strong>置零不改变存储，也不改变通用内核的行为——
    GPU 上没有「跳过零」的指令。要么用 2:4 结构化稀疏配 Sparse Tensor Core，
    要么接受 \(1.0\times\) 的加速比。参数账与延迟账是两本完全不同的账。
  </p>
  <p>
    <strong>② 把蒸馏和量化混为一谈。</strong>蒸馏改变的是「有几个模型、多大」——
    学生是一个<strong>新模型</strong>，要重新训练、重新评测，可能忘记长尾能力；
    量化改变的是「每个数用几位」，理论上是<em>同一套权重、同一套行为</em>，
    只多了一点有界的数值误差。前者是换人，后者是换写法。
  </p>
  <p>
    <strong>③ 合并不同来源、不同 tokenizer 的模型。</strong>
    词表不同时，embedding 的行与 token ID 的对应关系完全不同，
    平均出来的 embedding 对两边都是噪声。这是最常见也最致命的合并错误，
    而且它不会报错——只会给你一个「说胡话但语法正确」的模型。
  </p>
  <p>
    <strong>④ 用「参数量」估算稀疏模型的显存。</strong>
    非零元素少不等于占用少。50% 稀疏 + CSR 索引会让显存<em>变大</em>
    （上面的手算：11.3 GB → 16.9 GB）。要看的是<strong>存储格式</strong>，不是稀疏度。
  </p>
  <p>
    <strong>⑤ 把「PTQ 掉点」直接当成「必须上 QAT」。</strong>
    先试更好的 PTQ（GPTQ / AWQ / NF4）；QAT 的实测收益是把差距捡回约 33%–67%，
    它值得做，但它不是万能的，而且成本与一次微调同量级。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◆</span>怎么用在真实项目里</h4>
  <p>
    <strong>按投入产出比排序的决策链</strong>：量化 → 合并（手上已有一堆同源微调模型时）→
    蒸馏（需要一个能跑在边缘的小模型时）→ 剪枝 / 稀疏（<em>只有在你确定能重新训练时</em>）。
    这条顺序不是理论最优，而是「每一步的收益 / 成本」排序的结果。
  </p>
  <p>
    <strong>一个具体的组合拳</strong>：基座下载一次 → 用 QLoRA 为 8 个任务各训一个适配器 →
    用 DARE + TIES 把它们合并成<em>一个</em>多任务适配器 →
    基座 4-bit 量化部署。整条链路只需要一次大文件下载和若干次小规模训练，
    却同时解决了「显存」「多任务」「运维」三个问题。
  </p>
  <p>
    <strong>报告数字时必须写清三件事</strong>：稀疏度是哪种（非结构化 / 2:4 / 结构化）、
    存储格式是什么（稠密置零 / CSR / 硬件压缩格式）、
    以及报的是 FLOPs 还是墙钟时间。缺任何一项，这个数字都无法与别人的结果比较——
    这也是这一领域里大量「稀疏能加速 N 倍」说法互相矛盾的根本原因。
  </p>
  <p>
    <strong>评估纪律</strong>：压缩前后必须跑<em>同一套</em>评测（见模块 09），
    并额外检查长尾能力——长上下文、代码、少见语言。压缩最先伤到的几乎总是长尾，
    而你的主评测集往往测不出这一点。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">把一个 7B 模型的 FFN 权重按幅度置零 90%（仍是稠密张量），在 A100 上用普通 cuBLAS 推理，速度大约怎么变？</p>
  <ul class="opts">
    <li>快大约 10 倍</li>
    <li data-ok>基本不变：通用内核不跳过零值，存储也没变小</li>
    <li>慢大约 10 倍</li>
    <li>快大约 2 倍</li>
  </ul>
  <p class="why">
    通用 Tensor Core 按稠密 tile 取数与计算，零值照样读、照样参与乘加。
    只有 2:4 结构化稀疏在 Ampere 之后的 Sparse Tensor Core 上才真正跳过零，
    而且实测只有 1.3×–1.6×。如果换成 CSR 压缩存储，索引开销还会让情况更糟。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">你有两个 SFT 模型，想把能力合并成一个。下面哪种情况最可能<strong>直接崩掉</strong>？</p>
  <ul class="opts">
    <li>两个模型用同一个基座、不同数据、相同超参</li>
    <li data-ok>两个模型用同一个基座，但其中一个换了词表并重训了 embedding</li>
    <li>两个模型都用 LoRA，秩都是 16</li>
    <li>两个模型的 delta 范数都很小</li>
  </ul>
  <p class="why">
    词表不同意味着 embedding 每一行对应的 token 不同，权重矩阵的「行索引语义」不一致；
    直接平均等于把两套坐标系硬叠在一起，结果对两边都是噪声。
    合并的第一前提是<strong>同源</strong>：同基座、同 tokenizer、同 config。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于 QAT 与 PTQ，下面哪个说法正确？</p>
  <ul class="opts">
    <li>QAT 不需要训练数据</li>
    <li data-ok>PTQ 在 4-bit 权重上通常已经够用；QAT 用于更激进的位宽（例如把激活也压到低位宽）或精度余量很紧的场景</li>
    <li>QAT 一定能把掉点全部补回来</li>
    <li>QLoRA 就是一种 QAT</li>
  </ul>
  <p class="why">
    PTQ 用校准数据估计缩放与零点，成本低；QAT 在前向插入伪量化、用直通估计器回传梯度，
    需要完整训练流程，收益是「捡回一部分」而不是「全部」
    （torchao 实测约 33%–67%）。QLoRA 量化的是<em>冻结</em>的基座，
    训练的是浮点 LoRA，与 QAT 不是一回事。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">一个 7.2B 模型，权重按 group=128 的 4-bit 存放，每组带一个 fp16 缩放因子与一个 fp16 零点。它的权重体积最接近？</p>
  <ul class="opts">
    <li>1.8 GB，因为 4-bit 是 fp16 的四分之一</li>
    <li data-ok>3.85 GB：每个权重 \(0.5 + 4/128\) 字节，比纸面的 3.62 GB 多出约 6%</li>
    <li>7.24 GB，和 int8 一样</li>
    <li>14.5 GB，因为缩放因子必须用 fp32 存</li>
  </ul>
  <p class="why">
    4-bit 只决定数值本身的宽度，每组还要额外存缩放因子与零点：
    \(7.24\times10^{9} \times (0.5 + 4/128) \approx 3.85\) GB。
    实际收益还常低于这个数，因为 embedding 与输出头往往没被量化——
    这正是第 9 节要求记录「实测压缩比」而不是相信理论值的原因。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">某模型 \(L=32\)、\(h_{kv}=8\)、\(d_h=128\)，KV 用 fp16。128K 上下文（131072 个 token）时，<strong>一条</strong>序列的 KV cache 大约是多少？</p>
  <ul class="opts">
    <li>128 MiB</li>
    <li>1 GiB</li>
    <li data-ok>16 GiB：每 token \(2\times32\times8\times128\times2 = 128\) KiB</li>
    <li>与上下文无关，因为状态是固定大小的</li>
  </ul>
  <p class="why">
    \(128\ \text{KiB} \times 131072 = 16\) GiB。这个数字与权重直接可比：
    fp16 权重 14.5 GB、int4 权重 3.85 GB。长上下文服务里 KV 才是决定并发上限的那本账，
    而权重只付一次——所以只量化权重解决不了长上下文。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">你的服务是 batch=1 的交互式解码，每步比预期慢很多，显存也快满了。按第 8 节的决策表，第一步该做什么？</p>
  <ul class="opts">
    <li>把 FFN 剪掉 50%，用稀疏换速度</li>
    <li data-ok>先确认是不是带宽瓶颈（每步读一遍权重），然后做权重量化；非结构化剪枝不改变字节数，通常既不省显存也不加速</li>
    <li>把学习率调小重训一遍</li>
    <li>把 KV cache 挪到 CPU 内存</li>
  </ul>
  <p class="why">
    解码一步的时间近似是「读的字节数 ÷ 带宽」。置零不减少字节数，通用内核也不跳过零，
    所以剪枝在这个场景几乎没有收益；权重量化直接把字节数减少 2–4 倍，是对症的那一步。
    把 KV 挪到 CPU 只会给每步加一次 PCIe 往返。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">量化前后你只在自建的一小份评测上量了困惑度，全量 delta 是 0.2，看起来可以接受。还缺哪一步？</p>
  <ul class="opts">
    <li>不需要别的，0.2 已经足够小</li>
    <li data-ok>必须在长尾子集（长上下文、代码、小语种）与任务级指标上各量一次——量化误差常常集中在长尾，而主评测测不到</li>
    <li>应该把位宽继续降到 2-bit 再看</li>
    <li>应该换更大的校准集，直到 delta 变成 0</li>
  </ul>
  <p class="why">
    压缩最先伤到的几乎总是长尾，而自建评测往往覆盖不到。
    另外困惑度只衡量下一个 token 的预测，对生成质量与回归误差都不敏感，
    所以还要跑模块 09 的任务指标。delta 变成 0 通常说明量化没有真正生效，不是一个目标。
  </p>
</div>

<div class="acc" data-t="深入：为什么合并后的模型有时会超过所有源模型？" data-badge="可选">
  <div class="acc-body">
    <p>
      先把「合并」和「集成」分清楚。集成同时保留 \(K\) 个模型、对 logits 取平均，
      推理成本乘以 \(K\)。合并是在权重空间求平均，推理成本<strong>不变</strong>。
      所以合并的本质是「用算术偷一个集成的效果」——问题是什么时候偷得到。
    </p>
    <p>
      设微调后的权重 \(\theta_k = \theta_{\text{pre}} + \delta_k\)。
      如果每个 \(\delta_k\) 的尺度都远小于低误差盆地的宽度，那么对平均后的解做一阶展开：
    </p>
    \[ L(\theta_{\text{pre}} + \bar{\delta}) \approx L(\theta_{\text{pre}}) + \nabla L^{\top}\bar{\delta} \]
    <p>
      因为每个 \(\theta_k\) 都大致在极小点附近，\(\nabla L(\theta_k) \approx 0\)，
      所以平均后的梯度项很小，损失不会显著上升。
      <em>这就是「权重平均 ≈ logit 集成」的成立条件</em>，
      而它依赖两件事：损失面的平坦度，以及预测的置信度。
      Wortsman 等给出了这个关系的解析分析并做了实验验证。
    </p>
    <p><strong>那「超过所有源模型」是从哪来的？</strong>三个机制叠在一起：</p>
    <p>
      <strong>① 平均起到正则化作用。</strong>单个模型对<em>自己那一份</em>训练数据有轻微过拟合；
      平均之后这部分噪声被抵消，留下的是共同的信号。
    </p>
    <p>
      <strong>② TIES / DARE 做了一次隐式的特征选择。</strong>
      把「互相打架」的那部分参数增量去掉（符号选举、裁剪、随机丢弃），
      只保留多个模型一致的方向——等于用「多个独立训练过程的一致性」当作置信度信号。
    </p>
    <p>
      <strong>③ 不同任务的 delta 近似正交。</strong>
      叠加后等于在同一张权重表里塞进了多种功能，而参数量没有增加。
      这也是为什么在<em>大规模</em>模型上这个现象更明显：参数越多，方向越容易正交。
    </p>
    <p>
      <strong>反过来，只要有一个前提被破坏</strong>（不同基座、不同 tokenizer、
      符号冲突没处理、delta 量级差一个数量级），上面的一阶展开就不成立，
      损失会立刻跳起来。<strong>这就是合并「要么很赚要么很崩」的原因：它几乎没有中间态。</strong>
    </p>
    <p>
      <strong>工程建议</strong>：把合并当成一个实验，而不是一个公式。
      每次合并前打印每个 delta 的范数分布，合并后重跑多任务评测，
      并且始终保留一份「每个模型只在自己任务上评测」的基线。
      如果两个 delta 的范数差一个数量级，先去查数据量与训练步数，再动 \(\lambda\)。
    </p>
  </div>
</div>
`
});
