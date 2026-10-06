/* content/15-inference-serving.js · 模块 15：现代高性能推理 Serving 引擎 */
COURSE.register({
  id: "m15",
  part: 3,
  num: "15",
  title: "现代高性能推理 Serving 引擎：PagedAttention、动态批处理与长文本 Chunked Prefill",
  en: "High-Throughput LLM Serving Systems",
  minutes: 45,
  tags: ["核心", "系统", "推理 Serving", "vLLM"],
  body: String.raw`
<p class="lead">
  如果说第 08 讲回答了「单次请求怎么算自回归」，那么工业级 Serving 引擎则要回答「同时涌入 500 个不同长度的用户请求时，怎么压榨每一兆显存与每一微秒延迟」。
  从静态 Batching 的显存内碎片，到操作系统虚拟分页思想催生的 PagedAttention，
  再到 Token 级插队的 Continuous Batching 与计算-访存解耦的 Chunked Prefill，
  本讲完整解构以 vLLM、TensorRT-LLM 为代表的高吞吐推理系统架构。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>知识地图与承接关系</h4>
  <p>
    <strong>这一讲填补了什么鸿沟？</strong>在第 08 讲中，我们推导了 KV Cache 显存公式：
    \(M = 2 \times b \times n_{\text{layers}} \times n_{kv\_heads} \times d_{\text{head}} \times L \times B\)
   （首个 2 表示 K 与 V 各一份，\(b\) 为每元素字节数，\(n_{kv\_heads}\) 为 KV 头数——GQA 下小于注意力头数，\(B\) 为并发数，单请求时 \(B = 1\)）。<br />
    但在真实线上服务中，用户的 Prompt 长度从 10 到 32,000 不等，生成长度也完全无法预知。
    如果按最坏情况预先分配一块连续的显存空间，<strong>显存利用率往往暴跌至 20% 以下，大部分显存被预留的空白泡泡活活浪费</strong>。<br />
    本讲将从底层操作系统物理机制出发，揭开现代大模型高并发服务的终极秘密。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>工程核心痛点</h4>
  <p>
    一个 8 卡 H100 节点正在承载线上流量：用户 A 发送了 10,000 字的长文档提问，要求输出 100 字；
    与此同时，50 个用户发送了 20 字的日常对话，要求输出 500 字。
    <strong>如果使用传统的静态批处理，短请求必须原地空等长请求全部完成；而长请求的巨大显存占用又会导致其他请求直接报 OOM。
    如何才能让长短请求在同一个 GPU 核心内如流水般无缝穿插流转？</strong>
  </p>
</section>

<h3>1. 显存碎片困境与 PagedAttention 虚拟分页</h3>
<p>
  在传统框架中，为了使用高效的张量乘法核心，系统要求每个请求的 KV Cache 必须在 GPU 显存物理地址上是<strong>严格连续</strong>的。这导致了两种致命浪费：
</p>

<table class="tbl small">
  <thead><tr><th>碎片类型</th><th>发生场景</th><th>浪费比例</th><th>物理后果</th></tr></thead>
  <tbody>
    <tr><td><strong>内部碎片 (Internal Fragmentation)</strong></td><td>为请求预先分配最大长度（如 4096），但模型只输出了 150 个 Token 就遇到了 <code>&lt;eos&gt;</code></td><td>60% ~ 80%</td><td>预留显存空置，其他人无法使用</td></tr>
    <tr><td><strong>外部碎片 (External Fragmentation)</strong></td><td>不同请求生命周期交错，频繁申请与释放不同尺寸的显存块</td><td>10% ~ 20%</td><td>总空闲显存足够，但没有足够大的「连续」地址块，直接引发伪 OOM</td></tr>
  </tbody>
</table>

<h4>PagedAttention：操作系统分页算法的降维打击</h4>
<p>
  UC Berkeley 团队在 2023 年发表的 PagedAttention 彻底打破了「连续存储」的陈旧枷锁：
  它将 KV Cache 切分成固定大小的<strong>物理块（Physical Blocks）</strong>，每个块固定容纳例如 \(B_{\text{size}} = 16\) 个 Token 的 Key 和 Value。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>核心机制：逻辑块表（Block Table）映射</h4>
  <ul>
    <li><strong>逻辑连续，物理离散</strong>：每个请求看到的是一个逻辑上连续的 Token 序列（逻辑块 0, 1, 2...）；但在物理显存中，这些块可以散落在显存的任意角落；</li>
    <li><strong>按需分配，零内部碎片</strong>：仅当上一个物理块装满 16 个 Token 时，才在物理池中申请下一个空闲块。未使用的块永远停留在公共池中供并发请求共享；</li>
    <li><strong>显存利用率跃升</strong>：从传统静态预留的不到 25%，直接拉升到 <strong>96% 以上</strong>！同样的硬件，承载并发量直接翻了 2~4 倍。</li>
  </ul>
</section>

<h4>写时复制（Copy-on-Write）与并行采样零显存复制</h4>
<p>
  在多候选项生成（Parallel Sampling）或束搜索（Beam Search）中，多个分支共享完全相同的提示词 Prompt。
  在 PagedAttention 下，所有子分支的逻辑块表直接指向<strong>相同的物理块</strong>，引用计数（Ref Count）加 1，
  物理显存占用为<strong>严格的 0 额外开销</strong>！
  只有当某个分支吐出不同的 Token 时，系统才将当前物理块复制一份，实现优雅的<strong>写时复制（CoW）</strong>。
</p>

<h3>2. 动态连续批处理 (Continuous / In-Flight Batching)</h3>
<p>
  解决了显存存储碎片后，另一个吞吐杀手是<strong>时间维度上的执行气泡</strong>。
</p>

<table class="tbl">
  <thead><tr><th>调度范式</th><th>调度颗粒度</th><th>执行逻辑</th><th>资源浪费情况</th></tr></thead>
  <tbody>
    <tr><td><strong>静态批处理 (Static Batching)</strong></td><td>请求级（Request-level）</td><td>一组请求必须等全组最长的那一个完全生成完毕，才能释放资源并开始下一批</td><td>短请求早早结束，后续数十步迭代中 GPU 算力严重空闲，吞吐低下</td></tr>
    <tr><td><strong>连续批处理 (Continuous Batching)</strong></td><td>迭代级（Iteration-level / Token-level）</td><td>每次只做一个 Token 生成的步进迭代；一旦某个请求生成结束，立即将其移出批次，并在<strong>同一微秒将新到来的请求插队塞入当前批次</strong></td><td>算力核心始终保持 100% 满负荷，完全消除气泡等待</td></tr>
  </tbody>
</table>

<p>
  在连续批处理中，Prefill 阶段（处理长输入 Prompt）与 Decode 阶段（处理单 Token 生成）开始在时域上交织并存。
</p>

<h3>3. Chunked Prefill：长短请求解耦与消灭首字时延尖刺</h3>
<p>
  尽管连续批处理大幅提高了吞吐，但它引入了一个新的工业难题：<strong>Prefill 霸占显卡导致 Decode 卡顿</strong>。
</p>
<p>
  当一个输入包含 8,000 字的 Prompt 涌入系统时，由于 Prefill 是 Compute-bound（高算力密集型），
  它会独占 GPU 计算核心数秒之久。在此期间，已经在流式打字的 50 个普通用户的 Decode 步骤被强制挂起，
  用户体验到的就是流式文字突然「卡死打顿」。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>Chunked Prefill（分块预填充）数学调度机制</h4>
  <p>
    <strong>核心思想</strong>：为单次迭代设定一个最大计算预算，例如单次迭代最多只处理 \(T_{\text{budget}} = 512\) 个 Prefill Token。
  </p>
  <p>
    一个 8,000 Token 的长 Prompt 不再一次性计算，而是被切分为 16 个小切片（Chunks，每个 512 Token）。
    在每一次执行循环中，系统调度：
  </p>
  \[ B_{\text{iter}} = N_{\text{decode}} + \text{Chunk}_{\text{prefill}} \]
  <p>
    <strong>工业收益双赢</strong>：
    1. 现有用户的流式输出绝不卡顿，首字延迟（TTFT）与字间延迟（TPOT）完全平滑无抖动；
    2. 计算密集型的 Prefill 切片与访存密集型的 Decode 向量乘法在同一个 CUDA 核心内实现计算-访存互补，硬件 MFU 进一步提升。
  </p>
</section>

<h3>4. 工业级服务指标评估模型 (SLA 权衡三角形)</h3>
<p>
  在企业级大模型服务监控中，评估系统性能有三个互斥的黄金指标：
</p>

<table class="tbl small">
  <thead><tr><th>指标名称</th><th>英文缩写</th><th>衡量对象</th><th>主要瓶颈</th><th>用户感知</th></tr></thead>
  <tbody>
    <tr><td><strong>首字输出延迟</strong></td><td>TTFT (Time To First Token)</td><td>从用户点击发送到屏幕显示第一个字的时间</td><td>Prefill 吞吐、网络握手</td><td>「反应快不快」</td></tr>
    <tr><td><strong>字间生成时延</strong></td><td>TPOT (Time Per Output Token)</td><td>打字机流式输出中每个字符之间的平均耗时</td><td>Decode 阶段的显存带宽 (Memory Bound)</td><td>「吐字卡不卡」</td></tr>
    <tr><td><strong>总系统吞吐量</strong></td><td>Throughput (Tokens / s)</td><td>集群每秒能为所有并发用户生成的总 Token 数量</td><td>批处理并发度、显存利用率</td><td>「每百万 Token 运营成本」</td></tr>
  </tbody>
</table>

<p>
  <strong>工业取舍定律</strong>：追求极致吞吐（大 Batch）必然牺牲 TPOT 和 TTFT；追求极低延迟必然限制 Batch 大小导致 GPU 算力不饱和。
  现代 Serving 架构的本质，就是在用户 SLA（如要求 TPOT \(< 50 \text{ ms}\)）的约束硬边界下，
  通过 PagedAttention 与 Chunked Prefill 将总吞吐量推向理论物理极限。
</p>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">为什么 PagedAttention 能够让并发请求时的多候选项采样（如同一提示词并发生成 4 种不同回答）几乎不增加 Prompt 阶段的显存占用？</p>
  <ul class="opts">
    <li>因为模型把 Prompt 删除了</li>
    <li>因为 4 个分支共用同一个输出线性层</li>
    <li data-ok>因为所有分支的逻辑块表都指向完全相同的只读物理块（引用计数加 4），直到某个分支在生成时产生不同 Token 时才触发写时复制（Copy-on-Write）</li>
    <li>因为使用了 INT4 量化</li>
  </ul>
  <p class="why">
    PagedAttention 借鉴了操作系统的虚拟内存管理：Prompt 计算出的 KV Cache 在物理显存中只保留一份，所有子分支通过各自的页表共享这一份物理内存，直到需要写入新 Token 时才分配新的物理页块。
  </p>
</div>
`
});
