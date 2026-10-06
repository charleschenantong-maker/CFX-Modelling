/* content/26-workflow.js — 模块 26：自制大模型全景资源站：Karpathy《Zero to Hero》与 nanoGPT 第一性原理全景导读 */
COURSE.register({
  id: "m26",
  part: 5,
  num: "26",
  title: "自制大模型全景资源站：Karpathy《Zero to Hero》与 nanoGPT 第一性原理全景导读",
  en: "Complete LLM Resources Hub: Karpathy's Zero-to-Hero & nanoGPT First Principles Guide",
  minutes: 35,
  tags: ["Karpathy全集", "nanoGPT", "第一性原理", "资源矩阵", "导读索引"],
  body: String.raw`
<p class="lead">
  在真正进入现代开源大模型微调与工程改造之前，每一个严肃的 AI 工程师都必须经历一次<strong>第一性原理（First Principles）的思想洗礼</strong>。
  世界顶尖 AI 科学家、前 OpenAI 创始成员兼特斯拉 AI 总监 <strong>Andrej Karpathy</strong> 的《Neural Networks: Zero to Hero》系列，
  是全球公认最纯粹、最透彻的大模型底层教学典范。
  本模块为你系统梳理 Karpathy 经典课程全集矩阵、核心时间戳、官方开源仓库与理论跃迁路径，作为你随时查阅与复现的终极资源站。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>实战认知分流：从零造轮子 vs 真实项目开发</h4>
  <p>
    在开启本讲前，必须建立清晰的工程工程认知：
  </p>
  <ul>
    <li><strong>从零手写 nanoGPT（学心法）</strong>：让你彻底理解因果注意力掩码、前向反向传播、权重衰减与优化器步长计算，打破大模型的神秘感；</li>
    <li><strong>微调开源 Qwen-2.5（做项目）</strong>：在真实的 Crossfade、科研建模或企业级业务中，没有人会从零训练一个 1MB 语料的玩具模型，而是直接站在顶级开源底座（如阿里开源的 Qwen-2.5）肩膀上做领域微调与工程交付。</li>
  </ul>
</section>

<h3>1. Karpathy《Zero to Hero》全景课程资源矩阵</h3>
<p>
  Karpathy 的系列视频按照从微观梯度到完整大语言模型的演进逻辑编排，建议收藏并在遇到底层概念困惑时随时定点回看：
</p>
<table class="tbl">
  <thead><tr><th>序号 / 主题</th><th>核心教学目标</th><th>官方视频与源码仓库</th><th>推荐必看时间戳</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>1. micrograd</strong><br>标量反向传播引擎</td>
      <td>从零手写 Python 自动求导（Autograd），理解标量梯度计算与链式法则</td>
      <td>
        <a href="https://www.youtube.com/watch?v=VMj-3S1tku0" target="_blank" rel="noopener">YouTube (2h 25m)</a><br>
        <a href="https://github.com/karpathy/micrograd" target="_blank" rel="noopener"><code>karpathy/micrograd</code></a>
      </td>
      <td>
        <code>0:14:00</code> 导数的几何直觉；<br>
        <code>0:38:00</code> 搭建 Value 表达式图；<br>
        <code>1:15:00</code> 手写 backward 递归拓扑排序
      </td>
    </tr>
    <tr>
      <td><strong>2. makemore (1~5)</strong><br>自回归字符语言模型</td>
      <td>从 Bigram 统计模型、Bengio 2003 MLP、BatchNorm 到 WaveNet 层次化生成</td>
      <td>
        <a href="https://www.youtube.com/watch?v=PaCmpygFfXo" target="_blank" rel="noopener">YouTube (系列共 5 讲)</a><br>
        <a href="https://github.com/karpathy/makemore" target="_blank" rel="noopener"><code>karpathy/makemore</code></a>
      </td>
      <td>
        <code>Part 2 - 0:25:00</code> 嵌入层查表；<br>
        <code>Part 3 - 0:40:00</code> 权重初始化与饱和神经元；<br>
        <code>Part 4 - 0:50:00</code> 纯手动手算张量梯度
      </td>
    </tr>
    <tr>
      <td><strong>3. Let's build GPT</strong><br>nanoGPT 从零构建</td>
      <td>从注意力机制数学矩阵推导开始，纯 PyTorch 逐行手写 Decoder-Only Transformer</td>
      <td>
        <a href="https://www.youtube.com/watch?v=kCc8FmEb1nY" target="_blank" rel="noopener">YouTube (1h 56m)</a><br>
        <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noopener"><code>karpathy/nanoGPT</code></a>
      </td>
      <td>
        <code>0:38:00</code> 自注意力矩阵相乘直觉；<br>
        <code>1:04:00</code> 因果下三角掩码 (tril)；<br>
        <code>1:24:00</code> 残差连接与 Pre-LayerNorm
      </td>
    </tr>
    <tr>
      <td><strong>4. GPT Tokenizer</strong><br>字节级 BPE 分词器</td>
      <td>深入 Unicode 与 UTF-8，纯手工编写无 OOV 溢出的 Byte-Pair Encoding 分词器</td>
      <td>
        <a href="https://www.youtube.com/watch?v=zduSFxRajkE" target="_blank" rel="noopener">YouTube (2h 13m)</a><br>
        <a href="https://github.com/karpathy/minbpe" target="_blank" rel="noopener"><code>karpathy/minbpe</code></a>
      </td>
      <td>
        <code>0:26:00</code> BPE 相邻频次统计算法；<br>
        <code>0:48:00</code> 迭代训练与合并规则表；<br>
        <code>1:12:00</code> GPT-2 与 GPT-4 正则切割对比
      </td>
    </tr>
    <tr>
      <td><strong>5. build-nanogpt</strong><br>复现 GPT-2 (124M)</td>
      <td>极致硬件加速：从单卡 PyTorch 循环演进至 FlashAttention、BF16 混合精度与 DDP 分布式</td>
      <td>
        <a href="https://www.youtube.com/watch?v=l8pRSuU81PU" target="_blank" rel="noopener">YouTube (4h 01m)</a><br>
        <a href="https://github.com/karpathy/build-nanogpt" target="_blank" rel="noopener"><code>karpathy/build-nanogpt</code></a>
      </td>
      <td>
        <code>0:30:00</code> 高效 DataLoader 批次切片；<br>
        <code>1:32:00</code> 接入 FlashAttention 内核；<br>
        <code>1:58:00</code> AdamW 权重衰减分组
      </td>
    </tr>
  </tbody>
</table>

<h3>2. 从 nanoGPT 到现代大模型（Qwen-2.5）的架构演化</h3>
<p>
  当你看懂了 Karpathy 的手写 nanoGPT，你其实已经掌握了目前全球顶尖大模型 90% 的骨架。现代主流开源模型（以阿里开源的 <strong>Qwen-2.5</strong> 为代表）在经典 Transformer 基础上只做了四项关键微创新：
</p>
<table class="tbl small">
  <thead><tr><th>结构模块</th><th>经典 nanoGPT（GPT-2 标准）</th><th>现代工业大模型（Qwen-2.5 / LLaMA-3）</th><th>升级原因与物理收益</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>位置编码</strong></td>
      <td>绝对位置嵌入（Learned Absolute PE）</td>
      <td><strong>旋转位置编码（RoPE, Rotary Position Embedding）</strong></td>
      <td>赋予相对距离感知能力，能够通过插值算法实现超长上下文（如 128k）外推</td>
    </tr>
    <tr>
      <td><strong>归一化层</strong></td>
      <td>层归一化（LayerNorm：减均值除方差）</td>
      <td><strong>均方根归一化（RMSNorm：不减均值）</strong></td>
      <td>省略均值计算步骤，减少内存访存开销，计算吞吐量提升约 7%~10%</td>
    </tr>
    <tr>
      <td><strong>激活函数</strong></td>
      <td>GELU 激活函数</td>
      <td><strong>SwiGLU 门控单元（Gated Linear Unit）</strong></td>
      <td>引入可学习的双路线性门控相乘机制，显著提升非线性特征拟合容量</td>
    </tr>
    <tr>
      <td><strong>注意力机制</strong></td>
      <td>多头自注意力（MHA, Multi-Head Attention）</td>
      <td><strong>分组查询注意力（GQA, Grouped-Query Attention）</strong></td>
      <td>多组 Query 共享单组 Key/Value，大幅压缩推理自回归时的 KV Cache 显存消耗</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>通往真实项目的分水岭</h4>
  <p>
    阅读完上述资源后，你已具备了鉴别与改造模型代码的底层内功。
    从<strong>第 27 讲</strong>开始，我们将正式进入<strong>全流程保姆级云端实操</strong>：
    在 Kaggle 上免费开辟 GPU 容器、下载真正的 Qwen-2.5 开源模型，并使用工业级 LoRA 技术将其改造为专属于 Crossfade 项目的高能智能体！
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 Andrej Karpathy 的 minbpe 教程中，构建分词器时为什么必须采用字节级（Byte-level）作为算法底座？</p>
  <ul class="opts">
    <li>因为单字节计算速度比多字节快 10 倍</li>
    <li data-ok>现代计算机 UTF-8 编码由 256 种不同的基础字节（0~255）构成；以字节为底座能确保任何文本（包括未登录词、生僻语言和 Emoji）都能被无损表示，彻底消除 OOV（词表外）异常</li>
    <li>因为 GPU 的 CUDA 核只支持读取 8 位整数</li>
    <li>这样可以使模型词表大小永远固定为 256</li>
  </ul>
  <p class="why">
    字节级 BPE（Byte-level BPE）彻底消除了传统 NLP 中未登录词标记（如 <code>&lt;unk&gt;</code>）的尴尬，是现代大模型全语言泛化能力的基石。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在实际跨学科建模（如 Crossfade）与工业级项目开发中，为什么通常不推荐从零完全自训一个大模型，而是推荐基于 Qwen 等开源基座做微调？</p>
  <ul class="opts">
    <li>因为开源社区禁止个人用户从零编写 Transformer 架构</li>
    <li data-ok>从零预训练一个具备常识、逻辑和专业语法的及格大模型需要数万亿 Token 与数百万美元算力，个人算力训练的微型模型仅具备玩具教学价值；而微调成熟底座能够以极低算力成本将顶尖通识能力迅速迁移至特定专业领域</li>
    <li>因为 Python 解释器无法承受超过 1000 万参数的运算</li>
    <li>从零训练的模型无法保存权重至硬盘</li>
  </ul>
  <p class="why">
    预训练是注入通识知识（吞吐海量公网数据），成本极其高昂；微调是规范行为与注入专业技能（几百条高质量领域样本），个人完全可以在免费 GPU 上高效搞定。
  </p>
</div>
`
});
