/* content/06-parallelism.js — 模块 06：并行与分布式训练 */
COURSE.register({
  id: "m6",
  part: 2,
  num: "06",
  title: "并行训练：从单卡到多卡，以及 JAX 的写法",
  en: "Distributed Training & JAX Parallelism",
  minutes: 40,
  tags: ["训练", "系统", "JAX"],
  body: String.raw`
<p class="lead">
  模块 04 已经算出：7B 模型做全参数 AdamW 训练需要约 112 GB 显存。单卡放不下，
  于是必须把「参数、梯度、优化器状态、激活值」切到多张卡上——这就是并行。
  这一模块给出四种切法的分工、代价，以及 JAX 里怎么写。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：一队人抬一块大石头。石头可以按<em>人</em>切（每个人抬一份，数据并行），
    也可以按<em>部位</em>切（有人抬左边有人抬右边，张量并行）——切法不同，喊口号（通信）的次数差很多。<br />
    <strong>这一讲要建立的直觉</strong>：并行不是「卡越多越快」，而是「把最贵的通信放在最快的连接上」。<br />
    <strong>读完你能回答</strong>：为什么张量并行通常只能待在一台机器内部？JAX 里那三行 Mesh 代码在声明什么？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你有 8 张卡。把模型切成 8 份就能训练了吗？<strong>不能</strong>——切法决定了通信量，
    而通信量决定了你有没有真的加速。最坏的情况下，加卡只会更慢。
  </p>
</section>

<h3>1. 四种并行，各自切什么</h3>
<table class="tbl">
  <thead><tr><th>方式</th><th>切什么</th><th>通信模式</th><th>适用场景</th></tr></thead>
  <tbody>
    <tr><td><strong>数据并行 DP / DDP</strong></td><td>不切模型，切数据；每卡一份完整模型</td><td>每步对梯度做一次 all-reduce</td><td>模型能装进单卡时的默认选择</td></tr>
    <tr><td><strong>ZeRO / FSDP</strong></td><td>把参数、梯度、优化器状态分片到各卡，用前才 all-gather</td><td>每层 all-gather + reduce-scatter</td><td>模型放不进单卡，但单机内带宽高</td></tr>
    <tr><td><strong>张量并行 TP</strong></td><td>切单层内部的矩阵（按列/按行）</td><td>每层两次 all-reduce，<strong>频率最高</strong></td><td>单机 NVLink 内；跨机通常不划算</td></tr>
    <tr><td><strong>流水线并行 PP</strong></td><td>按层切分成若干 stage</td><td>只在 stage 边界传激活</td><td>跨机；代价是气泡（bubble）</td></tr>
    <tr><td>序列并行 / 上下文并行</td><td>切序列维度（含激活与 KV）</td><td>注意力处需要通信</td><td>长上下文训练</td></tr>
    <tr><td>专家并行 EP</td><td>MoE 的不同专家放不同卡</td><td>all-to-all（最贵）</td><td>超大规模 MoE</td></tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>通信量：为什么张量并行不能跨机</h4>
  <p><strong>数据并行</strong>每步只需一次梯度 all-reduce，通信量约为 \(2N\) 个参数（ring all-reduce 的经典结果）：</p>
  \[ \text{Comm}_{\text{DP}} \approx 2N \ \text{elements} \quad(\text{almost independent of the number of GPUs}) \]
  <p><strong>张量并行</strong>每层都要通信激活，共 \(2L\) 次，且与批量大小成正比：</p>
  \[ \text{Comm}_{\text{TP}} \approx 2L \cdot B \cdot S \cdot d \ \text{elements} \]
  <p>
    当 \(L=32\)、\(B\cdot S = 10^{4}\)、\(d=4096\) 时，TP 的通信量比 DP 高两个数量级。
    这就是「TP 必须待在 NVLink 域内」的量化理由——跨机 InfiniBand 的延迟会把它吃光。
  </p>
  <p><strong>流水线并行</strong>的代价是气泡：若分成 \(p\) 个 stage、\(m\) 个 micro-batch，气泡比例约</p>
  \[ \text{bubble} \approx \frac{p-1}{m+p-1} \]
  <p>所以流水线并行必须配合足够多的 micro-batch（梯度累积）才能把利用率拉回来。</p>
</section>

<h3>2. 选择顺序（照这个顺序做，别跳）</h3>
<div class="flow">
  <div class="nd hi">1. 单卡能装下？</div><div class="ar">→</div>
  <div class="nd">DDP + 梯度累积</div><div class="ar">→</div>
  <div class="nd hi">2. 装不下？</div><div class="ar">→</div>
  <div class="nd">FSDP / ZeRO-3</div><div class="ar">→</div>
  <div class="nd hi">3. 还不够？</div><div class="ar">→</div>
  <div class="nd">TP（机内）+ PP（跨机）</div>
</div>
<p>
  实践中的组合通常是：<strong>TP=8（机内） × PP=2–8（跨机） × DP=其余</strong>。
  对个人研究者而言，能用的多半只有前两级（单卡 LoRA、或 Colab 上的 FSDP 小模型）——
  <em>知道后面的层级，是为了能读懂大厂的训练报告，而不是为了自己复现。</em>
</p>

<h3>3. JAX 的写法：把切分写进「类型」</h3>
<p>
  JAX 与 PyTorch 的哲学差异在并行上最明显。PyTorch 需要显式插入集合通信（或靠 FSDP 包装类），
  而 JAX 把 <strong>sharding 声明为数组类型的一部分</strong>，由 XLA 编译器自动插入通信（GSPMD）。
</p>
<pre><code>import jax, jax.numpy as jnp
from jax.sharding import Mesh, PartitionSpec as P, NamedSharding
from jax.experimental import mesh_utils
import flax.nnx as nnx, optax

<span class="cm"># [逐行剖析] 1. 描述物理设备网格拓扑：4 路数据并行 (DP) × 2 路张量并行 (TP)</span>
<span class="cm"># 硬件映射: 面向 8 个 TPU 核心 (如 Kaggle TPU v5e-8)，构建二维物理拓扑 ('batch', 'model')</span>
mesh = Mesh(mesh_utils.create_device_mesh((4, 2)), ('batch', 'model'))

<span class="cm"># [逐行剖析] 2. 声明 SPMD 自动分片规则 (PartitionSpec)</span>
<span class="cm"># 动态分布: 权重 W 维度 (4096, 4096) -> P(None, 'model') 沿第 1 维列切分为 2 份，每卡持 (4096, 2048)</span>
<span class="cm"># 动态分布: 激活 X 维度 (B, 4096) -> P('batch', None) 沿批次维切分为 4 份，每卡处理 B/4</span>
w_sharding = NamedSharding(mesh, P(None, 'model'))
x_sharding = NamedSharding(mesh, P('batch', None))

<span class="cm"># [逐行剖析] 3. 在 Flax NNX 声明式层中绑定分片规范</span>
<span class="cm"># 编译器介入: XLA 编译器自动推导前向与反向通信算子（自动插入 All-Gather 与 Reduce-Scatter）</span>
linear = nnx.Linear(in_features=4096, out_features=4096,
                    kernel_init=nnx.with_partitioning(
                        nnx.initializers.xavier_uniform(), w_sharding),
                    rngs=nnx.Rngs(0))

<span class="cm"># [逐行剖析] 4. JIT 编译的 SPMD 训练步纯函数</span>
@nnx.jit
def train_step(model, opt, batch):
    def loss_fn(m):
        <span class="cm"># 动态形状: batch['tokens'] -> (B, S), logits -> (B, S, V)</span>
        logits = m(batch['tokens'])
        return optax.softmax_cross_entropy_with_integer_labels(logits, batch['labels']).mean()
    
    <span class="cm"># 纯函数式自动微分: 同时获得标量损失值与全量模型参数梯度树</span>
    loss, grads = nnx.value_and_grad(loss_fn)(model)
    opt.update(grads)  <span class="cm"># 优化器参数状态演进</span>
    return loss

print(jax.devices())  <span class="cm"># 打印设备拓扑: 验证 8 个独立可编址的 TPU 计算核心</span></code></pre>
<p>
  同样的模型，改成「8 路纯数据并行」只需要把 <code>mesh</code> 换成 <code>(8, 1)</code>，
  这正是教程里那句话的含义：<em>JAX 让不同切分策略之间的切换变成一行代码</em>。
</p>

<h3>4. JAX 生态速查（对照 PyTorch）</h3>
<table class="tbl small">
  <thead><tr><th>功能</th><th>PyTorch</th><th>JAX</th></tr></thead>
  <tbody>
    <tr><td>自动微分</td><td><code>loss.backward()</code></td><td><code>jax.grad</code> / <code>nnx.value_and_grad</code></td></tr>
    <tr><td>编译与融合</td><td><code>torch.compile</code></td><td><code>jax.jit</code>（XLA）</td></tr>
    <tr><td>模型定义</td><td><code>nn.Module</code></td><td>Flax NNX <code>nnx.Module</code></td></tr>
    <tr><td>优化器</td><td><code>torch.optim.AdamW</code></td><td>Optax <code>optax.adamw</code>（函数式）</td></tr>
    <tr><td>数据管道</td><td><code>DataLoader</code></td><td>Grain（<code>grain.python</code>）</td></tr>
    <tr><td>检查点</td><td><code>torch.save</code> / safetensors</td><td>Orbax</td></tr>
    <tr><td>并行</td><td>DDP / FSDP / 手写 TP</td><td>Mesh + PartitionSpec（编译器自动插入通信）</td></tr>
    <tr><td>重计算</td><td><code>torch.utils.checkpoint</code></td><td><code>jax.checkpoint</code> / <code>nnx.remat</code></td></tr>
    <tr><td>硬件重心</td><td>NVIDIA GPU</td><td>TPU 与 GPU 都很自然</td></tr>
  </tbody>
</table>
<p>
  推荐路径：<a href="https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html" target="_blank" rel="noopener">JAX AI Stack《Train a miniGPT language model with JAX》</a>
  是这门课里唯一需要你逐行跑完的外部教程。它用 TinyStories 数据、Tiktoken 分词、Grain 加载、
  并在 Kaggle 的 TPU v5e-8 上做 4×2 的混合并行。<strong>注意一个现实约束：截至 2025 年 10 月，Colab 免费层只提供单核 TPU v5e-1，无法使用 SPMD 多设备并行</strong>——
  要在 Colab 上体验多设备，需要更高级别的运行时或改用 Kaggle。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>OOM 排查清单（按顺序试）</h4>
  <ol>
    <li>先降<strong>批大小 × 序列长度</strong>（对激活值是线性因子，最有效）。</li>
    <li>打开<strong>激活重计算</strong>（省 60%–80% 激活显存，代价约 30% 算力）。</li>
    <li>打开<strong>梯度累积</strong>：用更小的 micro-batch 达到同样的全局批大小。</li>
    <li>换<strong>优化器</strong>：8-bit Adam / Adafactor 可把优化器状态从 8 字节/参数降到 2 字节。</li>
    <li>上 <strong>FSDP / ZeRO-3</strong>，或改用 LoRA/QLoRA（不训练绝大多数参数）。</li>
    <li>还没解决？<em>模型太大，换小的。</em>在 1B 以下把方法验证清楚，收益远大于硬撑 7B。</li>
  </ol>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">为什么张量并行通常只在单机内使用？</p>
  <ul class="opts">
    <li>因为跨机不支持张量并行</li>
    <li data-ok>它每层都要通信激活，通信量与层数、批量、序列长度成正比，跨机延迟会抵消收益</li>
    <li>因为它会让参数量翻倍</li>
    <li>因为张量并行只能用于 MoE</li>
  </ul>
  <p class="why">
    数据并行每步只有一次梯度 all-reduce（通信量约 \(2N\)，与卡数无关）；
    张量并行有 \(2L\) 次激活通信，量级高出两个数量级。它需要 NVLink 这类高带宽低延迟互联。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">用流水线并行分成 \(p=8\) 个 stage，micro-batch 数 \(m=8\)，气泡比例约为？</p>
  <ul class="opts">
    <li>约 12.5%</li>
    <li data-ok>约 46.7%</li>
    <li>约 87.5%</li>
    <li>约 6.3%</li>
  </ul>
  <p class="why">
    \((p-1)/(m+p-1) = 7/15 \approx 46.7\%\)。接近一半的算力被浪费在等待上。
    增大 \(m\)（更多 micro-batch / 梯度累积）是唯一有效的补救：\(m=64\) 时气泡降到约 10%。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">在 JAX 中声明 <code>PartitionSpec(None, 'model')</code> 用于某个权重矩阵，含义是？</p>
  <ul class="opts">
    <li>该矩阵完全复制到每个设备</li>
    <li data-ok>第一维不切分，第二维沿网格的 <code>model</code> 轴切分（张量并行）</li>
    <li>该矩阵不参与训练</li>
    <li>沿 batch 轴切分</li>
  </ul>
  <p class="why">
    <code>PartitionSpec</code> 的元素与张量维度一一对应，<code>None</code> 表示复制。
    这正是教程里把权重按 <code>'model'</code> 轴切分、把激活按 <code>'batch'</code> 轴切分的写法；
    剩下的通信插入由 XLA 的 GSPMD 编译器完成。
  </p>
</div>

<div class="acc" data-t="深入：一个 7B 模型的实际并行配方" data-badge="工程">
  <div class="acc-body">
    <p>假设 64 张 A100 80 GB、机内 NVLink 8 卡、机间 InfiniBand：</p>
    <table class="tbl small">
      <thead><tr><th>维度</th><th>取值</th><th>理由</th></tr></thead>
      <tbody>
        <tr><td>TP</td><td>8</td><td>正好用满机内 NVLink 域，通信最贵的部分不跨机</td></tr>
        <tr><td>PP</td><td>2–4</td><td>跨机通信量小；用足量 micro-batch 压气泡</td></tr>
        <tr><td>DP</td><td>剩余（64/(TP×PP)）</td><td>扩大全局批大小，收敛更稳</td></tr>
        <tr><td>优化器状态</td><td>ZeRO-1/2（配合 DP）</td><td>把 8 字节/参数的状态均摊，避免显存成为瓶颈</td></tr>
        <tr><td>激活</td><td>全部重计算</td><td>激活是唯一随序列长度爆炸的项</td></tr>
      </tbody>
    </table>
    <p><strong>关键洞察</strong>：并行配置不是「越多越好」，而是<em>让最贵的那类通信待在最快的互联里</em>。
    这句话是性能工程的核心，也同样适用于你的单机实验：把最重的循环放内存、把最频繁的访问放缓存。</p>
  </div>
</div>
`
});
