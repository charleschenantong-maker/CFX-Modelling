/* content/13-long-context.js — 模块 13：长上下文与外推 */
COURSE.register({
  id: "m16-long-context",
  part: 3,
  num: "13",
  title: "长上下文与外推：RoPE 旋转、频率分频与 YaRN 插值",
  en: "Long Context, Length Extrapolation & YaRN",
  minutes: 40,
  tags: ["上下文", "RoPE", "外推", "高阶"],
  body: String.raw`
<p class="lead">
  大语言模型预训练时，文本窗口的长度是固定的（比如 4096 或 8192 Tokens）。
  但读长篇文献、解析整个代码仓库、给超长音频做时间序列建模时，你希望模型能直接吃下 32k、128k 甚至百万 Token。
  为什么不能把训好的模型直接放到超出训练长度的序列上推理？
  旋转位置编码（RoPE）做长序列外推时，为什么会碰上高频振荡与注意力熵崩塌？
  从线性位置插值（PI）、NTK-Aware 到今天的 YaRN，这些方法又是怎么靠分频补偿与方差守恒把长上下文外推做无损的？
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口与多齿轮钟表直觉</h4>
  <p>
    <strong>一句话类比</strong>：RoPE 像一块有 32 根指针的多齿轮机械钟表。
    高频维是「秒针」，走得极快，转几步就是一整圈，专门用来区分相邻词的紧密次序；
    低频维是「世纪齿轮」，走得极慢，转完一整圈要数万个 Token，用来标记超长距离的全局位置。<br />
    <strong>直接外推为什么失败</strong>：测试序列拉长 8 倍，低频的世纪齿轮被拨到了模型从没见过的全新角度区间，模型落进数学盲区；<br />
    <strong>朴素插值差在哪</strong>：把所有指针统一减速 8 倍，低频齿轮虽然落回已知范围，但秒针也变慢了 8 倍，原本相邻两个词的精确相对角度被压得模糊不清，模型的短距离语法辨别力就没了。<br />
    <strong>读完你能回答</strong>：为什么不同频率维度必须区别对待？YaRN 怎么靠频率分段调制与注意力温度缩放做到方差守恒？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    上下文从 4096 扩到 4097，直接外推为什么会让困惑度（Perplexity）从十几飙到数千甚至发散？
    在代数上，位置内积的分布到底发生了什么形变？
    为什么只要在注意力分数上乘一个缩放因子 \(\sqrt{1/t} = 0.1 \ln(s) + 1\)，长文本注意力就能重新变得尖锐聚焦？
  </p>
</section>

<h3>1. RoPE 的正交旋转几何与内积相对位移不变性</h3>
<p class="bridge">
  <strong>接上一节</strong>：第 03 章最后提过 RoPE 只保留相对距离，但没有证明。
  <strong>本节只加一件事</strong>：把这个结论证出来——旋转为什么让点积只跟相对位置有关。
  <strong>怎么读</strong>：核心就是 \(\langle R_m q, R_n k\rangle = q^\top R_{n-m} k\) 这一行；钟表指针的类比看懂即可。
</p>
<p>
  旋转位置编码（Rotary Position Embedding, RoPE）不用传统的加性绝对位置嵌入，
  而是把隐藏向量按相邻两两维度配对，切成 \(d/2\) 个二维复数正交子空间。
  每个二维平面上，Token 按自己所在位置 \(m\) 做一次旋转：
</p>
\[ R_m^{(i)} = \begin{bmatrix} \cos(m \theta_i) & -\sin(m \theta_i) \\ \sin(m \theta_i) & \cos(m \theta_i) \end{bmatrix} \]
<p>
  查询向量 \(q_m\) 与键向量 \(k_n\) 旋转之后，其二维子空间内积有个很干净的性质：
</p>
\[ \langle R_m^{(i)} q, R_n^{(i)} k \rangle = q^T \left( R_m^{(i)} \right)^T R_n^{(i)} k = q^T R_{n-m}^{(i)} k \]
<p>
  内积只取决于相对位移差 \(\Delta = n - m\)，绝对坐标 \(m\) 与 \(n\) 在代数上被消掉了。
</p>

<h3>2. Charles 草稿纸演算区：RoPE 频率分解与波长手算</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经证出旋转只保留相对距离。
  <strong>本节只加一件事</strong>：把这条结论落到具体数字上——每个维度转多快、波长有多长。
  <strong>怎么读</strong>：跟着 \(d=64\) 那组数算一遍头尾两个频率；这两个极端值正好解释了后面外推为什么会崩。
</p>
<p>
  给 Charles 的草稿纸推演：从角频率递减公式出发，代入工业界的标准超参数，
  把高频维、中频维与低频维的旋转周期（波长）算清楚。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：前置定义与符号约定</h4>
  <p>
    <strong>前置定义 1（基频衰减几何级数）：</strong>
    设单头注意力向量维度为 \(d\)（通常为 64 或 128），可以切成 \(d/2\) 个独立的二维旋转子空间，
    子空间索引为 \(i \in \{0, 1, \dots, d/2 - 1\}\)。
    第 \(i\) 个子空间的角频率定义为：
  </p>
  \[ \theta_i \triangleq b^{-2i/d} = \frac{1}{b^{2i/d}} \]
  <p>
    底数 \(b\) 是基频常数（在 LLaMA-1/2 中标准设定为 \(b = 10000\)）。
    索引 \(i\) 越大，频率 \(\theta_i\) 按几何级数递减得越快。
  </p>
  <p>
    <strong>前置定义 2（旋转周期波长 Wavelength）：</strong>
    第 \(i\) 个子空间的二维向量在序列往前推进时转满一圈（\(2\pi\) 弧度）所跨的 Token 步长，就是它的波长 \(\lambda_i\)：
  </p>
  \[ \lambda_i \triangleq \frac{2\pi}{\theta_i} = 2\pi \cdot b^{2i/d} \]
  <p>
    波长刻画的是这个维度旋转的「物理尺度」：
    \(\lambda_i \ll L_{\text{train}}\) 意味着它在训练长度内经历过成百上千次完整周期；
    \(\lambda_i \gg L_{\text{train}}\) 意味着它在训练长度内连小半圈都没有转完。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：极简小数字手算（\(b=10000, d=64\) 全频段周期分析）</h4>
  <p>
    代入一组标准参数：注意力头维度 \(d = 64\)，共 \(d/2 = 32\) 个二维子空间，索引 \(i \in \{0, 1, \dots, 31\}\)。
    基底取经典常数 \(b = 10000 = 10^4\)，圆周率取 \(\pi \approx 3.14159265\)，于是 \(2\pi \approx 6.283185\)。
  </p>
  <p><strong>第 1 步：手算最高频子空间（\(i=0\)）</strong></p>
  \[ \theta_0 = 10000^{-2 \times 0 / 64} = 10000^0 = 1.0 \text{ rad/token} \]
  \[ \lambda_0 = \frac{2\pi}{\theta_0} = \frac{6.283185}{1.0} \approx 6.28 \text{ tokens} \]
  <p>
    <strong>物理意义：</strong>每隔约 6 个 Token，最高频平面的相位就转满一整圈，
    这是一层局部细网格，专门抓相邻 Token 之间的语法依存与前后词序。
  </p>
  <p><strong>第 2 步：手算次高频子空间（\(i=1\)）</strong></p>
  \[ \theta_1 = 10000^{-2 \times 1 / 64} = 10000^{-1/32} = (10^4)^{-1/32} = 10^{-0.125} \approx 0.749894 \text{ rad/token} \]
  \[ \lambda_1 = \frac{2\pi}{\theta_1} \approx \frac{6.283185}{0.749894} \approx 8.38 \text{ tokens} \]
  <p>
    波长 8.38 个 Token，仍然是很强的局域频率分量。
  </p>
  <p><strong>第 3 步：手算正中频子空间（\(i=16\)）</strong></p>
  \[ \theta_{16} = 10000^{-2 \times 16 / 64} = 10000^{-0.5} = \frac{1}{\sqrt{10000}} = \frac{1}{100} = 0.01 \text{ rad/token} \]
  \[ \lambda_{16} = \frac{2\pi}{0.01} = 200\pi \approx 628.32 \text{ tokens} \]
  <p>
    波长约 628 个 Token，对应段落级的相对位移。
  </p>
  <p><strong>第 4 步：手算最低频子空间（\(i=31\)）</strong></p>
  \[ \theta_{31} = 10000^{-2 \times 31 / 64} = 10000^{-31/32} = 10^{-4 \times 31/32} = 10^{-3.875} \approx 0.000133352 \text{ rad/token} \]
  \[ \lambda_{31} = \frac{2\pi}{\theta_{31}} \approx \frac{6.283185}{0.000133352} \approx 47117.2 \text{ tokens} \]
  <p>
    <strong>对比一下：</strong>最低频维度的完整波长高达 <strong>47,117 个 Token</strong>。
  </p>
</section>

<h3>3. 外推崩溃手算与 YaRN 分频补偿机制</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经算出各频段的波长——有的一圈只有几个 token，有的几万个 token 才转一圈。
  <strong>本节只加一件事</strong>：解释外推为什么崩，以及 YaRN 怎么按频段分别对症处理。
  <strong>怎么读</strong>：关键是"高频保真、低频插值"这条分工；跟着手算走一遍相位变化，就明白它为什么有效。
</p>
<p>
  假设模型在训练长度 \(L_{\text{train}} = 4096\) 上训完，现在要外推到 \(L_{\text{test}} = 32768\)（扩展倍率 \(s = 32768 / 4096 = 8\)）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：外推崩溃本质与 YaRN 分段插值推演</h4>
  <p><strong>第 1 步：直接外推（Direct Extrapolation）为什么一定炸？</strong></p>
  <p>
    考察最低频维度 \(i=31\)（波长 \(\lambda_{31} \approx 47117\)）：
  </p>
  <ul>
    <li>训练阶段 \(m \le 4096\)：它最多转过 \(\Phi_{\text{train}} = 4096 \times \theta_{31} \approx 4096 \times 0.00013335 \approx 0.546 \text{ rad} \approx 31.3^\circ\)；</li>
    <li>外推到 \(m = 32768\)：相位角涨到 \(\Phi_{\text{test}} = 32768 \times 0.00013335 \approx 4.37 \text{ rad} \approx 250.4^\circ\)。</li>
  </ul>
  <p>
    <strong>结论：</strong>训练阶段，模型从没见过低频维度落在 \([31.3^\circ, 250.4^\circ]\) 区间里的旋转特征。
    位置一超出 4096，这些没见过的旋转矩阵就破坏了自注意力内积的有界性，Softmax 概率分布开始混乱发散，困惑度指数级往上走。
  </p>

  <p><strong>第 2 步：朴素位置线性插值（Linear Position Interpolation, PI）的代价</strong></p>
  <p>
    线性插值的做法是把所有位置坐标除以 \(s=8\)：\(m' = m / s = m / 8\)，
    等价于把所有子空间的角频率衰减 8 倍：\(\theta_i' = \theta_i / 8\)。
  </p>
  <p>
    对低频维来说，这正好把最大相位压回已知范围。但高频维（\(i=0\)）就遭殃了：
    原角频率为 \(1.0 \text{ rad/token}\)，相邻两个 Token 的夹角原为 \(1.0 \text{ rad} \approx 57.3^\circ\)，
    插值后变为 \(1.0 / 8 = 0.125 \text{ rad} \approx 7.16^\circ\)。
    <strong>相邻 Token 之间的相位差被硬压了 8 倍</strong>，
    模型的高频网格分辨率被抹平，局部语法感知失真，短文本理解精度明显变差。
  </p>

  <p><strong>第 3 步：YaRN（Yet another RoPE extensioN）三段式频率分频补偿</strong></p>
  <p>
    YaRN 的核心原则：<strong>高频不插值（保留局部分辨率），低频线性插值（消除未见大角度），中频平滑过渡。</strong>
    定义波长与训练长度的比值 \(r_i \triangleq \frac{\lambda_i}{L_{\text{train}}}\)，
    再引入两个分频阈值：低频阈值 \(\alpha = 1\) 与高频阈值 \(\beta = 32\)：
  </p>
  \[ \gamma(r_i) = \begin{cases} 0, & r_i < \frac{1}{\beta} \\ 1, & r_i > \frac{1}{\alpha} \\ \dfrac{r_i - 1/\beta}{1/\alpha - 1/\beta}, & \frac{1}{\beta} \le r_i \le \frac{1}{\alpha} \end{cases} \]
  <p>
    其中 \(r_i < 1/\beta\) 是高频区，完全不插值（\(\gamma=0\)），频率保持不变；
    \(r_i > 1/\alpha\) 是低频区，完全线性插值（\(\gamma=1\)），频率除以 \(s\)；
    \(1/\beta \le r_i \le 1/\alpha\) 是中频区，按比例平滑过渡。
  </p>
  <p>
    各维度最终的修正频率为：
  </p>
  \[ \theta_i^{\text{YaRN}} = (1 - \gamma(r_i)) \cdot \theta_i + \gamma(r_i) \cdot \frac{\theta_i}{s} \]

  <p><strong>第 4 步：注意力 Softmax 熵与温度缩放（Variance Conservation）</strong></p>
  <p>
    序列长度从 \(L\) 扩到 \(sL\) 之后，Softmax 聚合的 Token 变多，注意力分布会变得过于平缓，也就是注意力熵漂移（Attention Entropy Drift）。
    YaRN 的做法是乘一个缩放因子 \(\sqrt{1/t}\)，把注意力方差守恒住：
  </p>
  \[ \sqrt{1/t} = 0.1 \ln(s) + 1 \]
  <p>
    算注意力矩阵点积时，把缩放系数从 \(1/\sqrt{d}\) 放大成：
  </p>
  \[ \text{Scale} = \frac{\sqrt{1/t}}{\sqrt{d}} = \frac{0.1 \ln(s) + 1}{\sqrt{d}} \]
  <p>
    扩展倍率 \(s=8\) 时：\(\sqrt{1/t} = 0.1 \ln(8) + 1 \approx 0.1 \times 2.0794 + 1 \approx 1.2079\)。
    乘上它，长上下文下的注意力聚焦能力就和短文本训练时保持等方差。
  </p>
</section>

<h3>4. 核心代数微算子：YaRN 动态频率分频与温度补偿</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经知道 YaRN 是按频段分别处理。
  <strong>本节只加一件事</strong>：把它写成代码——分频、缩放、温度补偿各落在哪几行。
  <strong>怎么读</strong>：这一节可以当实现参考；不打算自己写的话，记住"改的是频率，不是位置"就够。
</p>
<p>
  下面这个代数式给出 YaRN 的频率调度与注意力缩放定义（可运行的 PyTorch 版本见附录 B 对应实验）：
</p>

<p><strong>RoPE 旋转位置编码与角频率缩放微算子演示：</strong></p>
<p>\[ \theta_i = b^{-2i/d}, \quad R_{\Theta, m}^d = \text{diag}\left( \begin{pmatrix} \cos m\theta_i & -\sin m\theta_i \\ \sin m\theta_i & \cos m\theta_i \end{pmatrix}_{i=0}^{d/2-1} \right) \]</p>
<p>
  <strong>逐行代数解析</strong>：<code>freqs</code> 算的是特征维度里每一对通道的基础旋转角频率；在绝对位置 \(m\) 处，向量乘上对应角度的余弦和正弦，绝对位置就转成了内积里的相对位移 \(m - n\)；YaRN 在此基础上对高频与低频分量做分段插值，不用重训也能把上下文拉长。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>长上下文扩展的三个雷区</h4>
  <ol>
    <li><strong>把 KV Cache 的显存和注意力计算量混为一谈</strong>：上下文从 4k 扩至 32k，KV Cache 显存跟着涨 8 倍，这是随上下文长度线性增长；按长度二次方涨的是 prefill 阶段的注意力计算量。显存这边若并发请求为 16，单卡照样撑不住，必须配合分组查询注意力（GQA）与 PagedAttention 显存分页管理。</li>
    <li><strong>「大海捞针（Needle In A Haystack）」假通过</strong>：有些外推方案在随机插入字符串的查找测试里能拿到 100% 召回，一换到复杂长文本的多跳推理就完全退化。所以还得在真实连贯文档上评长程困惑度。</li>
    <li><strong>漏调注意力温度，等于软失活</strong>：只改了 RoPE 旋转频率却忘记乘上 YaRN 缩放因子 \(\sqrt{1/t}\)，生成的文本会散乱、无主题复读、词频被抹平。</li>
  </ol>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在基底 \(b=10000\)、维度 \(d=64\) 的标准 RoPE 设置下，最高频子空间（\(i=0\)）与最低频子空间（\(i=31\)）的旋转波长 \(\lambda\) 分别最接近？</p>
  <ul class="opts">
    <li data-ok>\(\lambda_0 \approx 6.28\) tokens，\(\lambda_{31} \approx 47117\) tokens</li>
    <li>\(\lambda_0 \approx 1.0\) tokens，\(\lambda_{31} \approx 10000\) tokens</li>
    <li>\(\lambda_0 \approx 628\) tokens，\(\lambda_{31} \approx 32768\) tokens</li>
    <li>\(\lambda_0 \approx 3.14\) tokens，\(\lambda_{31} \approx 65536\) tokens</li>
  </ul>
  <p class="why">
    草稿纸核算：\(i=0\) 时 \(\theta_0 = 1.0\)，波长 \(\lambda_0 = 2\pi / 1.0 \approx 6.28\) 个 token；\(i=31\) 时 \(\theta_{31} = 10000^{-62/64} \approx 0.00013335\)，波长 \(\lambda_{31} = 2\pi / \theta_{31} \approx 47117\) 个 token。两者差了近 4 个数量级。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">朴素线性位置插值（PI，把所有频率除以扩展倍数 \(s\)）为什么会让模型在局部短序列上的理解能力下降？</p>
  <ul class="opts">
    <li>因为线性插值会把低频维度的旋转周期缩到零</li>
    <li data-ok>因为高频维度的角频率也被缩小了 \(s\) 倍，相邻两个紧邻 token 之间的相对旋转相角差缩到原来的 \(1/s\)，高频网格分辨率被抹平，局部词序感知变弱</li>
    <li>因为线性插值破坏了自注意力的因果下三角掩码结构</li>
    <li>因为 Softmax 归一化在除以 \(s\) 之后无法收敛</li>
  </ul>
  <p class="why">
    推导核心：高频分量本来是用来精细区分相邻词的（相邻词相位差 \(57.3^\circ\)），被硬缩小 8 倍变成 \(7.16^\circ\) 之后，相对位移感知就被压模糊了。YaRN 的做法正是「高频不插值，保住局部短程分辨率」。
  </p>
</div>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>以 Charles 的 Glass Player 与 Crossfade 这类音频时间序列为例（以后可以照此判断）</h4>
  <p>
    <strong>音频 Crossfade 的时间衰减与 RoPE 分频，本是一套数学</strong>
  </p>
  <table class="tbl small">
    <thead><tr><th>物理系统</th><th>高频分量物理对应</th><th>低频分量物理对应</th><th>长序列外推策略启示</th></tr></thead>
    <tbody>
      <tr><td><strong>语言模型（LLM）</strong></td><td>相邻 Token 的语法结构与局部搭配（波长数个 Token）</td><td>全篇文档的主题走向与跨段落长程逻辑（波长数万 Token）</td><td>YaRN 分频：高频保真、低频拉伸插值、温度方差补偿</td></tr>
      <tr><td><strong>Glass Player 音频平滑过渡</strong></td><td>毫秒级瞬态波形过零点与高频相位对齐（防止爆音与梳状滤波）</td><td>数秒级能量包络平滑淡入淡出曲线（响度能量守恒）</td><td>瞬态波形保持微秒级精度，宏观功率谱的衰减包络在长时间窗上平滑插值</td></tr>
    </tbody>
  </table>
  <p>
    在 Glass Player 这类播放器的混音里，交叉淡入淡出模型照着这个「多尺度频域分治」的思路来会更稳：
    别用一个切割斜率硬套全频段，而是把高频冲击能量和低频低音包络分开加权，
    这正是 YaRN 对 RoPE 齿轮做高低频解耦的思路（以后做这类题目时可以照此分析）。
  </p>
</section>
`
});
