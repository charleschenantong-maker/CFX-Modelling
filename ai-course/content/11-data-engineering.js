/* content/11-data-engineering.js · 模块 11：工业级数据工程与规模化训练体系 */
COURSE.register({
  id: "m11",
  part: 3,
  num: "11",
  title: "工业级数据工程与规模化训练：MinHash LSH 海量清洗、退火配比与集群容灾",
  en: "Data Engineering at Scale & Resilient Cluster Training",
  minutes: 45,
  tags: ["核心", "系统", "数据工程", "集群容灾"],
  body: String.raw`
<p class="lead">
  在万卡规模的工业级大模型研发中，业界有一句共识：「模型的上限由数据质量决定，模型的下限由集群稳定性托底」。
  本讲剖析从原始海量网络爬虫到高纯度 Token 语料的完整数据清洗流水线，
  深入 MinHash 与 LSH 局部敏感哈希的数学组合概率，
  并解构集群万卡训练中的计算-通信重叠拓扑与无损异步容灾机制。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>知识地图与心智模型</h4>
  <p>
    <strong>为什么需要独立的一讲？</strong>第 02 讲解决了「如何把文本切成 Token」，第 05 讲给出了「预训练的目标函数与防炸技巧」，第 06 讲推导了「单卡到多卡的并行切分」。<br />
    但真实工业界的残酷现实是：<strong>百 T 级原始爬虫语料中 60% 以上是垃圾与重复噪声；而在上千台服务器持续轰鸣数月的训练中，平均每几十小时就会有一张 GPU 发生静默计算错误或网络掉线。</strong><br />
    本讲将串联起数据生命周期与集群物理现实：<strong>海量去重数学原理 → 启发式过滤 → 合成数据退火策略 → 集群通信重叠与异步快照容灾</strong>。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>工程核心问题</h4>
  <p>
    面对 Common Crawl 爬取的 100 亿个网页文档（数十 TB），如果用暴力两两比对相似度，
    计算次数高达 \(\binom{10^{10}}{2} \approx 5 \times 10^{19}\) 次，足以让超算集群计算数年。
    <strong>工业界究竟如何用巧妙的随机哈希将比对复杂度降到近乎线性？
    当万卡集群在凌晨 3 点某张卡显存 ECC 报错死锁时，如何保证数千万元的算力不被白白浪费？</strong>
  </p>
</section>

<h3>1. 海量语料去重数学原理：MinHash 与局部敏感哈希 (LSH)</h3>
<p>
  文本去重的基石是衡量两个文档集合 \(A\) 与 \(B\) 的 <strong>Jaccard 相似度系数</strong>：
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>记号铺垫（Notation Bridge：Jaccard 相似度）</h4>
  <ul>
    <li><strong>\(A\) 与 \(B\)</strong>：将两篇文档切分成 \(k\)-shingle（即连续 \(k\) 个词构成的短语集合，通常取 \(k=5\) 或 \(k=13\)）；</li>
    <li><strong>交集与并集之比</strong>：\(J(A, B) = \frac{|A \cap B|}{|A \cup B|}\)。若两篇文章完全相同，\(J=1\)；若毫无交集，\(J=0\)。</li>
  </ul>
</section>

\[ J(A, B) = \frac{|A \cap B|}{|A \cup B|} \]

<p>
  为了避免直接比对超大集合，<strong>MinHash（最小哈希定理）</strong>提供了一个惊人的概率恒等式：
  若对全量词汇集合应用一个随机置换哈希函数 \(h\)，则两个集合的最小哈希值相等的概率，严格等于它们的 Jaccard 相似度！
</p>

\[ P\big(h_{\min}(A) = h_{\min}(B)\big) = J(A, B) \]

<p>
  <strong>代数直觉推导</strong>：考虑集合并集 \(A \cup B\) 中的所有元素，随机哈希后最小的那个元素，落在交集 \(A \cap B\) 中的概率恰好是交集大小占并集大小的比例，即 \(|A \cap B| / |A \cup B|\)！
  因此，只要独立选取 \(m\) 个随机哈希函数（例如 \(m = 128\)），计算出两篇文档的 MinHash 签名向量，比对这 128 个整数相等的比例，就能以无偏估计还原出真实文本相似度。
</p>

<h4>LSH 局部敏感哈希的「S 曲线」过滤魔术</h4>
<p>
  拿到 128 维签名后，依然需要两两比对。LSH 采用<strong>分桶波段法（Banding Technique）</strong>：
  将长度为 \(m\) 的签名向量切分成 \(b\) 个波段（Bands），每个波段包含 \(r\) 个哈希值（满足 \(m = b \times r\)，如 \(128 = 16 \text{ bands} \times 8 \text{ rows}\)）。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>LSH 候选命中概率公式铺垫</h4>
  <p>两个文档在至少一个波段中完全撞桶（被判定为疑似重复候选对）的概率为：</p>
</section>

\[ P_{\text{candidate}}(s) = 1 - \big(1 - s^r\big)^b \]

<table class="tbl small">
  <thead><tr><th>相似度 \(s = J(A,B)\)</th><th>单波段全等概率 \(s^r \; (r=8)\)</th><th>全不匹配概率 \((1-s^r)^b \; (b=16)\)</th><th>最终候选命中率 \(P_{\text{candidate}}\)</th><th>系统动作</th></tr></thead>
  <tbody>
    <tr><td><strong>0.90（高度抄袭）</strong></td><td>\(0.90^8 \approx 0.430\)</td><td>\((1-0.430)^{16} \approx 0.00008\)</td><td><strong>99.99%</strong></td><td>极大概率抓获，剔除冗余</td></tr>
    <tr><td><strong>0.80（显著重合）</strong></td><td>\(0.80^8 \approx 0.168\)</td><td>\((1-0.168)^{16} \approx 0.050\)</td><td><strong>95.00%</strong></td><td>高效捕获</td></tr>
    <tr><td><strong>0.50（轻微交集）</strong></td><td>\(0.50^8 \approx 0.0039\)</td><td>\((1-0.0039)^{16} \approx 0.939\)</td><td><strong>6.10%</strong></td><td>极低误报，绝大多数被排除</td></tr>
    <tr><td><strong>0.20（正常引用）</strong></td><td>\(0.20^8 \approx 0.0000025\)</td><td>\(\approx 1.0\)</td><td><strong>< 0.004%</strong></td><td>零开销直通通过</td></tr>
  </tbody>
</table>

<p>
  通过调节波段数 \(b\) 与行数 \(r\)，这条概率曲线形成了一条陡峭的<strong>「S 型跃迁曲线」</strong>。阈值（拐点）约为 \(t \approx (1/b)^{1/r}\)。在本例中 \(t \approx (1/16)^{1/8} \approx 0.707\)。相似度高于 70% 的文档几乎必被分入同一个哈希桶，而低于 70% 的文档几乎绝不发生碰撞，全库搜索复杂度直接从 \(O(N^2)\) 断崖式压低至 \(O(N)\)！
</p>

<h3>2. 启发式流水线与合成数据退火配比 (Data Annealing)</h3>
<p>
  去除重复文档后，真实工业界会执行严格的<strong>多层流水线过滤（Filter Cascade）</strong>：
</p>

<ol>
  <li><strong>规则过滤（Rule-based Filter）</strong>：
    剔除标点符号占比 \(> 30\%\)、大写锁定占比 \(> 40\%\)、平均词长 \(< 3\) 或 \(> 15\) 的低质文本，过滤乱码与机器抓取的空壳模板。
  </li>
  <li><strong>毒性与隐私脱敏（Safety & PII Redaction）</strong>：
    正则与快速分类器联合扫描身份证号、手机号、信用卡号，并过滤有害有害毒性语料。
  </li>
  <li><strong>高质量打分器（Quality Classifier / Perplexity Filter）</strong>：
    利用在维基百科、高质量教材上训练的小型语言模型，计算待清洗文档的困惑度 \(\text{PPL}\)。PPL 异常极高（语无伦次）或异常极低（机械重复同一句话）的文档均被整篇剔除。
  </li>
</ol>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>训练退火阶段的合成数据混合法则 (Data Mixture & Annealing)</h4>
  <p>
    在 Llama-3 与 Qwen-2.5 的技术报告中，最核心的机密之一是<strong>阶段式语料配比与退火（Cool-down Annealing）</strong>：
  </p>
  <ul>
    <li><strong>基座阶段（前 80%~90% Tokens）</strong>：
      以全网清洗后的广泛通识语料为主（网页 70%、代码 15%、学术百科 15%），建立强大的世界知识与多语言理解底座；
    </li>
    <li><strong>退火阶段（最后 10%~20% Tokens）</strong>：
      学习率线性衰减至零的同时，剧烈提升<strong>高质量合成数据（Synthetic Data）与高密度推理语料</strong>的配比：
      代码与算法题提升至 35%、高质量数学证明题提升至 30%、合成反思思维链提升至 20%，通识网页降至 15%。
    </li>
  </ul>
  <p>
    <strong>工业经验结论</strong>：在学习率即将归零的窗口注入极高密度的理科与逻辑合成数据，模型的 GSM8k、HumanEval 推理评测指标会出现明显的「翘尾效应」，性能提升幅度常超过前期数月的通识泛读。
  </p>
</section>

<h3>3. 集群物理通信拓扑与计算通信重叠</h3>
<p>
  在万卡规模下，单靠理论 FLOPs 无法保证训练速度，<strong>网络拓扑与通信调度</strong>才是决定 MFU 的生死线。
</p>

<table class="tbl small">
  <thead><tr><th>层级</th><th>互联技术</th><th>单向理论带宽</th><th>通信延迟</th><th>承载的并行切分维度</th></tr></thead>
  <tbody>
    <tr><td><strong>节点内（Intra-Node, 单机 8 卡）</strong></td><td>NVLink / NVSwitch</td><td>900 GB/s ~ 1.8 TB/s</td><td>< 1 µs</td><td><strong>张量并行 (TP)</strong>、前向注意力</td></tr>
    <tr><td><strong>跨节点（Inter-Node, 机柜内 / 跨机柜）</strong></td><td>InfiniBand NDR / RoCE v2</td><td>400 Gbps ~ 800 Gbps (50~100 GB/s)</td><td>2~5 µs</td><td><strong>流水线并行 (PP)</strong>、<strong>数据并行 (DP / ZeRO)</strong></td></tr>
  </tbody>
</table>

<p>
  由于跨节点带宽比机内 NVLink 慢了整整一个数量级，工业级训练框架必须严格实施<strong>计算通信重叠（Compute-Communication Overlap）</strong>：
</p>
<p>
  在反向传播计算第 \(l\) 层的权重梯度时，后台异步通信流（CUDA Stream）必须同时在物理网络上执行第 \(l+1\) 层的跨节点 All-Reduce 聚合梯度。
  如果通信时间 \(T_{\text{comm}} \le T_{\text{comp}}\)，通信开销将被计算完全掩盖（Zero Overhead）；
  只有当网络丢包或拥塞导致 \(T_{\text{comm}} > T_{\text{comp}}\) 时，GPU 才会进入空转等待（Bubble）。
</p>

<h3>4. 数值稳定与无损异步容灾 (Resilient Checkpointing)</h3>

<p><strong>1. FP8 缩放因子防下溢算子演示：</strong></p>
<p>\[ X_{\text{fp8}} = \text{clip}\left( \left\lfloor X \cdot \frac{S}{\text{amax}(|X|)} \right\rceil, -448, 448 \right) \]</p>
<p>
  <strong>逐行代数解析</strong>：在 FP8 混合精度训练中，动态统计张量绝对值的最大值 \(\text{amax}\)；乘以自适应缩放因子 \(S\) 将数值动态对齐至 FP8 的最大动态范围（E4M3 格式最大值为 448），彻底避免指数位只有 4 位的低精度浮点发生下溢截断归零。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>集群容灾的核心瓶颈：Checkpointed I/O</h4>
  <p>
    保存一个 70B 模型的完整权重与 AdamW 优化器状态需要约 <strong>1.1 TB</strong> 显存数据。
    如果让全集群万卡同步暂停训练等待写盘，每次落盘耗时可能长达 15~30 分钟，MFU 将直接下跌 15%。
  </p>
  <p>
    <strong>现代工业解法：异步非阻塞双缓冲（Asynchronous Double-Buffered Checkpointing）</strong>：<br />
    1. 在 GPU 显存中分配微小镜像或通过高速 PCIe 异步将权重拷贝至 Host 内存（仅需 2~3 秒）；<br />
    2. 主训练流立刻恢复前向反向计算；<br />
    3. CPU 后台线程池利用空闲网络带宽，平缓将内存数据刷入分布式文件系统（如 Ceph / Lustre / S3）；<br />
    4. 一旦某节点掉线，调度系统（如 Slurm / Kubernetes）直接在 3 分钟内踢除坏卡、拉起热备节点，从最近的快照平滑续训。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 LSH（局部敏感哈希）中，如果将哈希签名总长度 \(m=128\) 固定，将波段数 \(b\) 从 16 调整为 32（同时行数 \(r\) 从 8 降低到 4），会导致什么后果？</p>
  <ul class="opts">
    <li>降低相似度捕获能力，漏掉大量相似文章</li>
    <li data-ok>判定拐点阈值 \(t \approx (1/b)^{1/r}\) 显著降低，使系统更加敏感，捕获更多中低相似度文章，但会增加候选撞桶的候选对比开销</li>
    <li>哈希桶总数变少，导致内存溢出</li>
    <li>Jaccard 相似度计算完全失效</li>
  </ul>
  <p class="why">
    当 \(b\) 增大、\(r\) 减小时，单波段发生全等碰撞的条件（仅需 4 个哈希值相等）变得更容易满足，阈值 \(t \approx (1/32)^{1/4} \approx 0.42\)（原为 \(0.71\)），召回率更高，但误报与后续比对开销增加。
  </p>
</div>
`
});
