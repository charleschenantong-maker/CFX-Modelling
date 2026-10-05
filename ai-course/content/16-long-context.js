/* content/16-long-context.js — 模块 16：长上下文与外推 */
COURSE.register({
  id: "m16-long-context",
  part: 3,
  num: "16",
  title: "长上下文与外推：RoPE 旋转、频率分频与 YaRN 插值",
  en: "Long Context, Length Extrapolation & YaRN",
  minutes: 40,
  tags: ["上下文", "RoPE", "外推", "高阶"],
  body: String.raw`
<p class="lead">
  预训练大语言模型通常在固定长度（如 4096 或 8192 Tokens）的文本窗口上完成训练。
  然而在处理长篇文献阅读、代码工程仓库解析或超长音频时间序列建模时，我们渴望模型能直接处理 32k、128k 甚至百万 Token 的长上下文。
  为什么不能直接把训练好的模型放在超出训练长度的序列上推理？
  旋转位置编码（RoPE）在长序列外推时为何会遭遇高频振荡与注意力熵崩塌？
  从线性位置插值（PI）、NTK-Aware 到现代 YaRN，数学家与算法工程师如何通过精密的分频补偿与方差守恒实现无损长上下文外推？
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口与多齿轮钟表直觉</h4>
  <p>
    <strong>一句话类比</strong>：RoPE 就像一个拥有 32 根指针的多齿轮机械钟表！
    高频维是「秒针」（走得极快，转几步就是一整圈，专门用来区分相邻词的紧密相对次序）；
    低频维是「世纪齿轮」（走得极慢，转完整整一圈需要数万个 Token，用来标记超长距离的全局位置坐标）。<br />
    <strong>直接外推的失败</strong>：如果测试序列拉长 8 倍，低频的世纪齿轮被拨到了模型从没见过的全新角度区间，模型陷入数学未定义盲区；<br />
    <strong>朴素插值的缺陷</strong>：如果把所有指针统一减速 8 倍，低频齿轮虽然落回了已知范围，但秒针也变慢了 8 倍，原本相邻两个词的精确相对角度被压缩得模糊不清，导致模型丧失短距离语法辨别力。<br />
    <strong>读完你能回答</strong>：为什么不同频率维度必须区别对待？YaRN 如何通过频率分段调制与注意力温度缩放实现方差守恒？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    为什么当上下文从 4096 扩展到 4097 时，直接外推会导致困惑度（Perplexity）从十几直接飙升到数千甚至发散？
    在代数上，位置内积点积分布到底发生了什么形变？
    为什么只需要在注意力分数上乘上一个简单的温度系数 \(\sqrt{t} = 0.1 \ln(s) + 1\)，就能神奇地恢复长文本注意力的尖锐聚焦？
  </p>
</section>

<h3>1. RoPE 的正交旋转几何与内积相对位移不变性</h3>
<p>
  旋转位置编码（Rotary Position Embedding, RoPE）摒弃了传统的加性绝对位置嵌入，
  将隐藏向量按相邻两两维度配对，切分为 \(d/2\) 个二维复数正交子空间。
  在每个二维平面上，Token 依据其所在位置 \(m\) 执行旋转变换：
</p>
\[ R_m^{(i)} = \begin{bmatrix} \cos(m \theta_i) & -\sin(m \theta_i) \\ \sin(m \theta_i) & \cos(m \theta_i) \end{bmatrix} \]
<p>
  对于查询向量 \(q_m\) 与键向量 \(k_n\)，其旋转后的二维子空间内积具有绝对几何优雅性：
</p>
\[ \langle R_m^{(i)} q, R_n^{(i)} k \rangle = q^T \left( R_m^{(i)} \right)^T R_n^{(i)} k = q^T R_{n-m}^{(i)} k \]
<p>
  内积计算结果严格只取决于相对位移差 \(\Delta = n - m\)，绝对坐标 \(m\) 与 \(n\) 在代数上被完美抵消。
</p>

<h3>2. Charles 草稿纸演算区：RoPE 频率分解与波长手算</h3>
<p>
  给 Charles 的数学草稿纸推演：从角频率递减公式出发，亲手代入工业界标准超参数，
  算清高频维、中频维与低频维的物理旋转周期（波长）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：前置定义与符号约定</h4>
  <p>
    <strong>前置定义 1（基频衰减几何级数）：</strong>
    设单头注意力向量维度为 \(d\)（通常为 64 或 128）。可切分为 \(d/2\) 个独立的二维旋转子空间，
    子空间索引为 \(i \in \{0, 1, \dots, d/2 - 1\}\)。
    第 \(i\) 个子空间的角频率定义为：
  </p>
  \[ \theta_i \triangleq b^{-2i/d} = \frac{1}{b^{2i/d}} \]
  <p>
    其中底数 \(b\) 为基频常数（在 LLaMA-1/2 中标准设定为 \(b = 10000\)）。
    频率 \(\theta_i\) 随索引 \(i\) 的增大呈几何级数快速递减。
  </p>
  <p>
    <strong>前置定义 2（旋转周期波长 Wavelength）：</strong>
    第 \(i\) 个子空间的二维向量在序列推进时完成整整一圈（\(2\pi\) 弧度）旋转所跨越的 Token 步长，定义为其波长 \(\lambda_i\)：
  </p>
  \[ \lambda_i \triangleq \frac{2\pi}{\theta_i} = 2\pi \cdot b^{2i/d} \]
  <p>
    波长大小直接刻画了该维度几何旋转的「物理尺度」：
    \(\lambda_i \ll L_{\text{train}}\) 意味着该维度在训练集内经历过成百上千次的完整周期往复；
    \(\lambda_i \gg L_{\text{train}}\) 意味着该维度在训练集内连小半圈都没有转完。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：极简小数字手算（\(b=10000, d=64\) 全频段周期分析）</h4>
  <p>
    代入具体的标准参数：注意力头维度 \(d = 64\)，共有 \(d/2 = 32\) 个二维子空间，索引 \(i \in \{0, 1, \dots, 31\}\)。
    基底取经典常数 \(b = 10000 = 10^4\)。圆周率取 \(\pi \approx 3.14159265\)，则 \(2\pi \approx 6.283185\)。
  </p>
  <p><strong>第 1 步：手算最高频子空间（\(i=0\)）</strong></p>
  \[ \theta_0 = 10000^{-2 \times 0 / 64} = 10000^0 = 1.0 \text{ rad/token} \]
  \[ \lambda_0 = \frac{2\pi}{\theta_0} = \frac{6.283185}{1.0} \approx 6.28 \text{ tokens} \]
  <p>
    <strong>物理意义：</strong>每隔约 6 个 Token，最高频平面的相位就转满一整圈！
    这代表局部细粒度网格，专门捕获紧邻 Token 之间的语法依存与前后词序。
  </p>
  <p><strong>第 2 步：手算次高频子空间（\(i=1\)）</strong></p>
  \[ \theta_1 = 10000^{-2 \times 1 / 64} = 10000^{-1/32} = (10^4)^{-1/32} = 10^{-0.125} \approx 0.749894 \text{ rad/token} \]
  \[ \lambda_1 = \frac{2\pi}{\theta_1} \approx \frac{6.283185}{0.749894} \approx 8.38 \text{ tokens} \]
  <p>
    波长为 8.38 个 Token，依然属于强局域性频率分量。
  </p>
  <p><strong>第 3 步：手算正中频子空间（\(i=16\)）</strong></p>
  \[ \theta_{16} = 10000^{-2 \times 16 / 64} = 10000^{-0.5} = \frac{1}{\sqrt{10000}} = \frac{1}{100} = 0.01 \text{ rad/token} \]
  \[ \lambda_{16} = \frac{2\pi}{0.01} = 200\pi \approx 628.32 \text{ tokens} \]
  <p>
    波长约为 628 个 Token，对应中等跨度的段落级相对位移。
  </p>
  <p><strong>第 4 步：手算最低频子空间（\(i=31\)）</strong></p>
  \[ \theta_{31} = 10000^{-2 \times 31 / 64} = 10000^{-31/32} = 10^{-4 \times 31/32} = 10^{-3.875} \approx 0.000133352 \text{ rad/token} \]
  \[ \lambda_{31} = \frac{2\pi}{\theta_{31}} \approx \frac{6.283185}{0.000133352} \approx 47117.2 \text{ tokens} \]
  <p>
    <strong>震撼的对比：</strong>最低频维度的完整波长高达 <strong>47,117 个 Token</strong>！
  </p>
</section>

<h3>3. 外推崩溃手算与 YaRN 分频补偿机制</h3>
<p>
  假设模型在训练长度 \(L_{\text{train}} = 4096\) 上完成训练，现在要将其外推到 \(L_{\text{test}} = 32768\)（扩展缩放比率 \(s = 32768 / 4096 = 8\)）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：外推崩溃本质与 YaRN 分段插值推演</h4>
  <p><strong>第 1 步：直接外推（Direct Extrapolation）为什么必然爆炸？</strong></p>
  <p>
    考察最低频维度 \(i=31\)（波长 \(\lambda_{31} \approx 47117\)）：
  </p>
  <ul>
    <li>在训练阶段 \(m \le 4096\)：该维度最大转过的相位角为 \(\Phi_{\text{train}} = 4096 \times \theta_{31} \approx 4096 \times 0.00013335 \approx 0.546 \text{ rad} \approx 31.3^\circ\)；</li>
    <li>在推理外推 \(m = 32768\)：相位角暴增至 \(\Phi_{\text{test}} = 32768 \times 0.00013335 \approx 4.37 \text{ rad} \approx 250.4^\circ\)！</li>
  </ul>
  <p>
    <strong>结论：</strong>模型在训练阶段从来没有见过低频维度处于 \([31.3^\circ, 250.4^\circ]\) 区间内的旋转特征！
    当位置超出 4096 时，未见过的旋转矩阵破坏了自注意力内积的有界性，导致 Softmax 概率分布混乱发散，困惑度指数级爆炸。
  </p>

  <p><strong>第 2 步：朴素位置线性插值（Linear Position Interpolation, PI）的代价</strong></p>
  <p>
    线性插值通过对所有位置坐标除以 \(s=8\)：\(m' = m / s = m / 8\)。
    等效于将所有子空间的角频率全部衰减 8 倍：\(\theta_i' = \theta_i / 8\)。
  </p>
  <p>
    对于低频维，这完美地把最大相位限制在已知范围内。但对于高频维（\(i=0\)）：
    原角频率为 \(1.0 \text{ rad/token}\)，相邻两个 Token 的夹角原为 \(1.0 \text{ rad} \approx 57.3^\circ\)；
    插值后变为 \(1.0 / 8 = 0.125 \text{ rad} \approx 7.16^\circ\)！
    <strong>相邻 Token 之间的相位差被暴力压缩了 8 倍！</strong>
    模型的高频网格分辨率被抹平，导致局部语法感知失真，短文本理解精度严重劣化。
  </p>

  <p><strong>第 3 步：YaRN（Yet another RoPE extensioN）三段式频率分频补偿</strong></p>
  <p>
    YaRN 提出核心数学原则：<strong>高频不插值（保留局部分辨率），低频线性插值（消除未见大角度），中频平滑过渡！</strong>
    定义波长与训练长度的比值比率 \(r_i \triangleq \frac{\lambda_i}{L_{\text{train}}}\)。
    引入两个分频阈值：低频阈值 \(\alpha = 1\) 与高频阈值 \(\beta = 32\)：
  </p>
  \[ \gamma(r_i) = \begin{cases} 0, & r_i < \frac{1}{\beta} \\ 1, & r_i > \frac{1}{\alpha} \\ \dfrac{r_i - 1/\beta}{1/\alpha - 1/\beta}, & \frac{1}{\beta} \le r_i \le \frac{1}{\alpha} \end{cases} \]
  <p>
    其中：当 \(r_i < 1/\beta\) 为高频区，完全不插值（\(\gamma=0\)），保持原频不变；
    当 \(r_i > 1/\alpha\) 为低频区，完全线性插值（\(\gamma=1\)），频率除以 \(s\)；
    当 \(1/\beta \le r_i \le 1/\alpha\) 为中频区，按比例线性平滑过渡。
  </p>
  <p>
    各维度最终的修正频率为：
  </p>
  \[ \theta_i^{\text{YaRN}} = (1 - \gamma(r_i)) \cdot \theta_i + \gamma(r_i) \cdot \frac{\theta_i}{s} \]

  <p><strong>第 4 步：注意力 Softmax 熵与温度缩放（Variance Conservation）</strong></p>
  <p>
    序列长度从 \(L\) 扩展到 \(sL\) 后，注意力 Softmax 聚合的 Token 数量变多，会导致注意力分布变得过于平缓，发生注意力熵漂移（Attention Entropy Drift）。
    YaRN 证明引入温度缩放因子 \(\sqrt{t}\) 可以严格守恒注意力方差：
  </p>
  \[ \sqrt{t} = 0.1 \ln(s) + 1 \]
  <p>
    在执行注意力矩阵点积计算时，将缩放分母由 \(\sqrt{d}\) 修正为：
  </p>
  \[ \text{Scale} = \frac{1}{\sqrt{d} \cdot \sqrt{t}} = \frac{1}{\sqrt{d} \cdot (0.1 \ln(s) + 1)} \]
  <p>
    对于扩展倍率 \(s=8\)：\(\sqrt{t} = 0.1 \ln(8) + 1 \approx 0.1 \times 2.0794 + 1 \approx 1.2079\)。
    除以该温度因子使得长上下文下的注意力聚焦能力与短文本训练时严格保持等方差！
  </p>
</section>

<h3>4. 教科书级实现：YaRN 动态频率分频与温度补偿（PyTorch）</h3>
<p>
  以下代码展示工业级 YaRN 频率调度算子与注意力缩放计算，带详尽的逐行动态形状剖析：
</p>

<pre><code><span class="cm"># [逐行剖析] 工业级 YaRN (Yet another RoPE extensioN) 核心算子实现</span>
import math
import torch
import torch.nn as nn

class YaRNScaledRotaryEmbedding(nn.Module):
    def __init__(self, dim=64, max_position_embeddings=4096, base=10000, scale=8.0):
        super().__init__()
        self.dim = dim
        self.max_position_embeddings = max_position_embeddings
        self.base = base
        self.scale = scale

        <span class="cm"># [逐行剖析] 1. 计算原始基础角频率 theta_i = base^(-2i/d)</span>
        <span class="cm"># 动态形状: pos_idx -> (dim/2,) [float32]</span>
        pos_idx = torch.arange(0, dim, 2, dtype=torch.float32)
        inv_freq = 1.0 / (base ** (pos_idx / dim))

        <span class="cm"># [逐行剖析] 2. 计算各维度周期波长 wavelength = 2 * pi / theta_i</span>
        wavelength = 2.0 * math.pi / inv_freq

        <span class="cm"># [逐行剖析] 3. 计算 YaRN 分频过渡权重 gamma</span>
        <span class="cm"># 设置高低频阈值: alpha = 1.0, beta = 32.0</span>
        low_freq_wlen = float(max_position_embeddings) / 1.0   <span class="cm"># 低频边界: 4096</span>
        high_freq_wlen = float(max_position_embeddings) / 32.0 <span class="cm"># 高频边界: 128</span>

        <span class="cm"># 三段式平滑过渡公式</span>
        gamma = (wavelength - high_freq_wlen) / (low_freq_wlen - high_freq_wlen)
        gamma = torch.clamp(gamma, min=0.0, max=1.0)

        <span class="cm"># [逐行剖析] 4. 分频混合修正角频率</span>
        <span class="cm"># 高频保持原始 inv_freq，低频线性除以 scale，中频平滑过渡</span>
        inv_freq_yarn = (1.0 - gamma) * inv_freq + gamma * (inv_freq / scale)
        self.register_buffer("inv_freq", inv_freq_yarn)

        <span class="cm"># [逐行剖析] 5. 计算方差守恒注意力温度修正因子 sqrt(t)</span>
        <span class="cm"># 温度缩放公式: sqrt(t) = 0.1 * ln(scale) + 1.0</span>
        self.attention_temp_factor = 0.1 * math.log(scale) + 1.0

    def get_attention_scale(self):
        <span class="cm"># 修正注意力点积除以的缩放因子: 1.0 / (sqrt(d) * sqrt(t))</span>
        base_scale = 1.0 / math.sqrt(self.dim)
        return base_scale / self.attention_temp_factor</code></pre>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>长上下文扩展工程落地的三大致命雷区</h4>
  <ol>
    <li><strong>忽视 KV Cache 显存二次方爆炸</strong>：上下文从 4k 扩至 32k，KV Cache 显存暴涨 8 倍；若并发请求为 16，单卡显存秒爆。必须配合分组查询注意力（GQA）与 PagedAttention 显存分页管理。</li>
    <li><strong>测试集「大海捞针（Needle In A Haystack）」假通过</strong>：有些外推方案在随机插入的字符串查找测试中取得 100% 召回，但在复杂长文本多跳逻辑推理中完全退化。必须在真实连贯文档上评测长程困惑度。</li>
    <li><strong>注意力温度漏调导致软失活</strong>：仅修改 RoPE 旋转频率而忘记加上 YaRN 温度缩放 \(\sqrt{t}\)，模型生成的文本会呈现散乱、无主题复读与词频均化现象。</li>
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
    草稿纸核算：对于 \(i=0\)，\(\theta_0 = 1.0\)，波长 \(\lambda_0 = 2\pi / 1.0 \approx 6.28\) 个 token。对于 \(i=31\)，\(\theta_{31} = 10000^{-62/64} \approx 0.00013335\)，波长 \(\lambda_{31} = 2\pi / \theta_{31} \approx 47117\) 个 token。两者相差近 4 个数量级。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么朴素线性位置插值（PI，对所有频率除以扩展倍数 \(s\)）会导致模型在局部短序列上的理解能力下降？</p>
  <ul class="opts">
    <li>因为线性插值会使得低频维度的旋转周期缩短为零</li>
    <li data-ok>因为高频维度的角频率同样被缩小了 \(s\) 倍，导致相邻两个紧邻 token 之间的相对旋转相角差缩减至原来的 \(1/s\)，抹平了高频网格分辨率并削弱了局部词序感知</li>
    <li>因为线性插值破坏了自注意力的因果下三角掩码结构</li>
    <li>因为 Softmax 归一化在除以 \(s\) 之后无法收敛</li>
  </ul>
  <p class="why">
    推导核心：高频分量原本用来精细区分相邻词（如相邻词相位差 \(57.3^\circ\)），若被粗暴缩小 8 倍变成 \(7.16^\circ\)，相对位移感知被严重压缩模糊。YaRN 的精髓正是「高频不插值以保护局部短程分辨率」。
  </p>
</div>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>回到 Charles 的 Glass Player 与 Crossfade 音频时间序列</h4>
  <p>
    <strong>深度洞察：音频 Crossfade 时间衰减与 RoPE 分频思想的数学同构性</strong>
  </p>
  <table class="tbl small">
    <thead><tr><th>物理系统</th><th>高频分量物理对应</th><th>低频分量物理对应</th><th>长序列外推策略启示</th></tr></thead>
    <tbody>
      <tr><td><strong>语言模型（LLM）</strong></td><td>相邻 Token 的语法结构与局部搭配（波长数个 Token）</td><td>全篇文档的主题走向与跨段落长程逻辑（波长数万 Token）</td><td>YaRN 分频：高频保真度、低频拉伸插值、温度方差补偿</td></tr>
      <tr><td><strong>Glass Player 音频平滑过渡</strong></td><td>毫秒级瞬态波形过零点与高频相位对齐（防止爆音与梳状滤波）</td><td>数秒级能量包络平滑淡入淡出曲线（响度能量守恒）</td><td>瞬态波形保持微秒级绝对精度，宏观功率谱衰减包络在长时间窗做平滑插值</td></tr>
    </tbody>
  </table>
  <p>
    在 Glass Player 的实际混音中，你推导的交叉淡入淡出模型正是遵循这种「多尺度频域分治」原理：
    绝不能用单一切割斜率粗暴处理全频段音频，而应将高频冲击能量与低频低音包络分开加权，
    正如 YaRN 对 RoPE 齿轮的高低频解耦一样优雅自洽。
  </p>
</section>
`
});
