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
  第 08 讲回答了「单次请求怎么算自回归」；这一讲回答另一个问题：同时涌进 500 个长度不同的请求，显存和延迟该怎么分。
  从静态 Batching 留下的显存碎片，到借操作系统分页思想做出来的 PagedAttention，
  再到 Token 级插队的 Continuous Batching，以及把计算与访存解耦的 Chunked Prefill，
  下面按 vLLM、TensorRT-LLM 这类引擎的实际做法，把高吞吐推理系统的架构拆开看。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>知识地图与承接关系</h4>
  <p>
    <strong>这一讲补的是哪一段？</strong>第 08 讲推导过 KV Cache 显存公式：
    \(M = 2 \times b \times n_{\text{layers}} \times n_{kv\_heads} \times d_{\text{head}} \times L \times B\)
   （首个 2 表示 K 与 V 各一份，\(b\) 为每元素字节数，\(n_{kv\_heads}\) 为 KV 头数——GQA 下小于注意力头数，\(B\) 为并发数，单请求时 \(B = 1\)）。<br />
    但线上服务里，用户的 Prompt 长度从 10 到 32,000 不等，生成长度事先也完全没法预知。
    如果按最坏情况预先分配一块连续显存，<strong>显存利用率往往不到 25%，剩下的全被预留出来的空白泡泡占着</strong>。<br />
    这一讲从操作系统分页的物理机制讲起，看现代大模型高并发服务到底是怎么做到的。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>工程核心痛点</h4>
  <p>
    一个 8 卡 H100 节点正在承载线上流量：用户 A 发来 10,000 字的长文档提问，要求输出 100 字；
    与此同时，50 个用户发来 20 字的日常对话，要求输出 500 字。
    <strong>用传统的静态批处理，短请求只能原地等长请求全部生成完；而长请求占住的显存又会让别的请求直接报 OOM。
    怎么才能让长短请求在同一个 GPU 核心上穿插着走？</strong>
  </p>
</section>

<h3>1. 显存碎片困境与 PagedAttention 虚拟分页</h3>
<p>
  传统框架为了用上高效的张量乘法内核，要求每个请求的 KV Cache 在 GPU 显存物理地址上<strong>严格连续</strong>。这带来两种浪费：
</p>

<table class="tbl small">
  <thead><tr><th>碎片类型</th><th>发生场景</th><th>浪费比例</th><th>物理后果</th></tr></thead>
  <tbody>
    <tr><td><strong>内部碎片 (Internal Fragmentation)</strong></td><td>为请求预先分配最大长度（如 4096），但模型只输出 150 个 Token 就遇到了 <code>&lt;eos&gt;</code></td><td>60% ~ 80%</td><td>预留显存空置，其他人无法使用</td></tr>
    <tr><td><strong>外部碎片 (External Fragmentation)</strong></td><td>不同请求的生命周期交错，频繁申请和释放不同尺寸的显存块</td><td>10% ~ 20%</td><td>总空闲显存足够，但没有足够大的「连续」地址块，直接引发伪 OOM</td></tr>
  </tbody>
</table>

<h4>PagedAttention：把操作系统的分页算法搬进显存管理</h4>
<p>
  UC Berkeley 团队 2023 年提出的 PagedAttention 不再要求「连续存储」：
  它把 KV Cache 切成固定大小的<strong>物理块（Physical Blocks）</strong>，每块默认容纳 \(B_{\text{size}} = 16\) 个 Token 的 Key 和 Value。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>核心机制：逻辑块表（Block Table）映射</h4>
  <ul>
    <li><strong>逻辑连续，物理离散</strong>：每个请求看到的仍是逻辑上连续的 Token 序列（逻辑块 0, 1, 2...），但这些块在物理显存里可以散落在任意角落；</li>
    <li><strong>按需分配，没有内部碎片</strong>：上一个物理块装满 16 个 Token，才去物理池里申请下一个空闲块。没用到的块一直留在公共池中，给其他并发请求共享；</li>
    <li><strong>显存利用率上去了</strong>：从传统静态预留的不到 25%，提到 <strong>96% 以上</strong>。同样的硬件，承载的并发量能翻 2~4 倍。</li>
  </ul>
</section>

<h4>写时复制（Copy-on-Write）与并行采样零显存复制</h4>
<p>
  多候选项生成（Parallel Sampling）或束搜索（Beam Search）里，多个分支共享同一段 Prompt。
  在 PagedAttention 下，所有子分支的逻辑块表直接指向<strong>相同的物理块</strong>，引用计数（Ref Count）加 1，
  这部分 Prompt 的物理显存占用是 <strong>0 额外开销</strong>。
  只有某个分支吐出不同的 Token 时，系统才把当前物理块复制一份，也就是<strong>写时复制（CoW）</strong>。
</p>

<h3>2. 动态连续批处理 (Continuous / In-Flight Batching)</h3>
<p>
  显存碎片解决之后，还有一个拖吞吐的问题：<strong>时间维度上的执行气泡</strong>。
</p>

<table class="tbl">
  <thead><tr><th>调度范式</th><th>调度颗粒度</th><th>执行逻辑</th><th>资源浪费情况</th></tr></thead>
  <tbody>
    <tr><td><strong>静态批处理 (Static Batching)</strong></td><td>请求级（Request-level）</td><td>一组请求要等全组最长的那一个生成完，才能释放资源、开始下一批</td><td>短请求早就结束了，后面几十步迭代里 GPU 算力一直空着，吞吐上不去</td></tr>
    <tr><td><strong>连续批处理 (Continuous Batching)</strong></td><td>迭代级（Iteration-level / Token-level）</td><td>每做一步 Token 生成就重新调度一次；某个请求一生成完就移出批次，新到的请求可以在<strong>同一微秒插进当前批次</strong></td><td>计算核心基本保持 100% 满负荷，气泡等待被消掉</td></tr>
  </tbody>
</table>

<p>
  连续批处理下，Prefill 阶段（处理长输入 Prompt）与 Decode 阶段（每步只生成一个 Token）在时间上开始交织在一起。
</p>

<h3>3. Chunked Prefill：长短请求解耦，消掉首字时延尖刺</h3>
<p>
  连续批处理把吞吐提上去了，但带出一个新问题：<strong>Prefill 霸占显卡，Decode 就卡</strong>。
</p>
<p>
  一个 8,000 字的 Prompt 进来时，Prefill 是 Compute-bound（算力密集型），
  它会把 GPU 计算核心占住好几秒。这几秒里，正在流式打字的 50 个普通用户的 Decode 步骤被挂起，
  用户看到的就是字突然不往外蹦。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>Chunked Prefill（分块预填充）数学调度机制</h4>
  <p>
    <strong>核心思想</strong>：给单次迭代设一个计算预算，比如一次最多只处理 \(T_{\text{budget}} = 512\) 个 Prefill Token。
  </p>
  <p>
    一个 8,000 Token 的长 Prompt 就不再一次算完，而是切成 16 个小切片（Chunk，每个 512 Token）。
    每一次执行循环里，系统调度的是：
  </p>
  \[ B_{\text{iter}} = N_{\text{decode}} + \text{Chunk}_{\text{prefill}} \]
  <p>
    <strong>换来的收益有两块</strong>：
    1. 已经在输出的用户不会卡顿，首字延迟（TTFT）与字间延迟（TPOT）都平稳；
    2. 计算密集的 Prefill 切片和访存密集的 Decode 向量乘法在同一个 CUDA 核心上互补，硬件 MFU 更高。
  </p>
</section>

<h3>4. 工业级服务指标评估模型 (SLA 权衡三角形)</h3>
<p>
  企业级大模型服务监控里，有三个互相牵制的指标要一起看：
</p>

<table class="tbl small">
  <thead><tr><th>指标名称</th><th>英文缩写</th><th>衡量对象</th><th>主要瓶颈</th><th>用户感知</th></tr></thead>
  <tbody>
    <tr><td><strong>首字输出延迟</strong></td><td>TTFT (Time To First Token)</td><td>从用户点击发送到屏幕显示第一个字的时间</td><td>Prefill 吞吐、网络握手</td><td>「反应快不快」</td></tr>
    <tr><td><strong>字间生成时延</strong></td><td>TPOT (Time Per Output Token)</td><td>流式输出里相邻两个字之间的平均耗时</td><td>Decode 阶段的显存带宽 (Memory Bound)</td><td>「吐字卡不卡」</td></tr>
    <tr><td><strong>总系统吞吐量</strong></td><td>Throughput (Tokens / s)</td><td>集群每秒能为所有并发用户生成的总 Token 数量</td><td>批处理并发度、显存利用率</td><td>「每百万 Token 运营成本」</td></tr>
  </tbody>
</table>

<p>
  <strong>取舍是硬的</strong>：想要高吞吐（大 Batch），TPOT 和 TTFT 就得让步；想要低延迟，Batch 就大不了，GPU 算力跟着闲下来。
  现代 Serving 架构做的事，就是在用户 SLA（如要求 TPOT \(< 50 \text{ ms}\)）这条硬边界下，
  靠 PagedAttention 和 Chunked Prefill 把总吞吐顶到接近硬件上限。
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
