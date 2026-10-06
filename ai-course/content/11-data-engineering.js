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
  模型的上限由数据质量决定，下限由集群稳定性托底，这句话在万卡规模的训练里基本是共识。
  这一讲顺着数据走一遍：从原始爬虫语料一路清洗成高纯度 Token 语料，
  讲清 MinHash 与 LSH 局部敏感哈希背后的概率，
  再看万卡训练里计算与通信怎么重叠、异步快照怎么做到无损容灾。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">💡</span>知识地图与心智模型</h4>
  <p>
    <strong>为什么值得单独讲一讲？</strong>第 02 讲把文本切成 Token，第 05 讲给出预训练的目标函数与防炸技巧，第 06 讲推导了单卡到多卡的并行切分。<br />
    但工业现场是这样的：<strong>百 T 级原始爬虫语料里 60% 以上是垃圾和重复噪声；上千台服务器连跑几个月，平均每几十小时就有一张 GPU 出静默计算错误或者掉线。</strong><br />
    这一讲把数据生命周期和集群的物理现实串起来：<strong>海量去重的数学原理 → 启发式过滤 → 合成数据退火策略 → 集群通信重叠与异步快照容灾</strong>。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>工程核心问题</h4>
  <p>
    Common Crawl 爬下来 100 亿个网页文档（数十 TB），要是暴力两两比对相似度，
    计算次数高达 \(\binom{10^{10}}{2} \approx 5 \times 10^{19}\) 次，超算集群也得算好几年。
    <strong>怎么用随机哈希把比对复杂度压到接近线性？
    万卡集群凌晨 3 点某张卡显存 ECC 报错死锁时，怎么保证几千万元的算力不白扔？</strong>
  </p>
</section>

<h3>1. 海量语料去重数学原理：MinHash 与局部敏感哈希 (LSH)</h3>
<p class="bridge">
  <strong>接上一节</strong>：前面讲的是单卡、单模型怎么训；从这一节开始换到工业视角，先看数据本身。
  <strong>本节只加一件事</strong>：万亿级语料怎么去重——用概率方法替代两两比对。
  <strong>怎么读</strong>：只要跟住"相似度高的文档会自动落进同一个桶"这个效果；MinHash 的证明可以跳过。
</p>
<p>
  文本去重先要能衡量两个文档集合 \(A\) 与 \(B\) 的相似程度，用的就是 <strong>Jaccard 相似度系数</strong>：
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
  为了不去直接比对超大集合，<strong>MinHash（最小哈希定理）</strong>给出了一个漂亮的结果：
  对全量词汇集合用一个随机置换哈希函数 \(h\)，两个集合的最小哈希值相等的概率，严格等于它们的 Jaccard 相似度。
</p>

\[ P\big(h_{\min}(A) = h_{\min}(B)\big) = J(A, B) \]

<p>
  <strong>代数直觉推导</strong>：在集合并集 \(A \cup B\) 的所有元素里，随机哈希后最小的那个元素落在交集 \(A \cap B\) 中的概率，恰好是交集大小占并集大小的比例，即 \(|A \cap B| / |A \cup B|\)。
  所以只要独立取 \(m\) 个随机哈希函数（例如 \(m = 128\)），算出两篇文档的 MinHash 签名向量，再比这 128 个整数里相等的比例，就能无偏地估出真实文本相似度。
</p>

<h4>LSH 局部敏感哈希的「S 曲线」过滤</h4>
<p>
  拿到 128 维签名后，两两比对还是免不了。LSH 的做法是<strong>分桶波段法（Banding Technique）</strong>：
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
    <tr><td><strong>0.90（高度抄袭）</strong></td><td>\(0.90^8 \approx 0.430\)</td><td>\((1-0.430)^{16} \approx 0.00012\)</td><td><strong>99.99%</strong></td><td>极大概率抓获，剔除冗余</td></tr>
    <tr><td><strong>0.80（显著重合）</strong></td><td>\(0.80^8 \approx 0.168\)</td><td>\((1-0.168)^{16} \approx 0.050\)</td><td><strong>95.00%</strong></td><td>高效捕获</td></tr>
    <tr><td><strong>0.50（轻微交集）</strong></td><td>\(0.50^8 \approx 0.0039\)</td><td>\((1-0.0039)^{16} \approx 0.939\)</td><td><strong>6.10%</strong></td><td>极低误报，绝大多数被排除</td></tr>
    <tr><td><strong>0.20（正常引用）</strong></td><td>\(0.20^8 \approx 0.0000025\)</td><td>\(\approx 1.0\)</td><td><strong>< 0.004%</strong></td><td>零开销直通通过</td></tr>
  </tbody>
</table>

<p>
  调节波段数 \(b\) 和行数 \(r\)，这条概率曲线就成了一条陡峭的<strong>「S 型跃迁曲线」</strong>。阈值（拐点）约为 \(t \approx (1/b)^{1/r}\)。在本例中 \(t \approx (1/16)^{1/8} \approx 0.707\)。相似度高于 70% 的文档几乎必被分进同一个哈希桶，低于 70% 的几乎绝不碰撞，全库搜索复杂度从 \(O(N^2)\) 直接降到 \(O(N)\)。
</p>

<h3>2. 启发式流水线与合成数据退火配比 (Data Annealing)</h3>
<p class="bridge">
  <strong>接上一节</strong>：去重解决了"重复"，但没解决"低质"。
  <strong>本节只加一件事</strong>：两道并行的数据工序——规则过滤，和训练末期的配比调整。
  <strong>怎么读</strong>：过滤阈值那张表可以直接拿去用；退火配比记住一句：最后 10%–20% 要高比例灌代码与推理数据。
</p>
<p>
  去重之后，工业界还会再过一遍<strong>多层流水线过滤（Filter Cascade）</strong>：
</p>

<ol>
  <li><strong>规则过滤（Rule-based Filter）</strong>：
    剔除标点符号占比 \(> 30\%\)、大写锁定占比 \(> 40\%\)、平均词长 \(< 3\) 或 \(> 15\) 的低质文本，过滤乱码与机器抓取的空壳模板。
  </li>
  <li><strong>毒性与隐私脱敏（Safety & PII Redaction）</strong>：
    正则加快速分类器一起扫身份证号、手机号、信用卡号，同时过滤有害与毒性语料。
  </li>
  <li><strong>高质量打分器（Quality Classifier / Perplexity Filter）</strong>：
    拿维基百科和高质量教材训一个小语言模型，用它的困惑度 \(\text{PPL}\) 给待清洗文档打分。PPL 高得离谱（语无伦次）或者低得出奇（机械重复同一句话）的文档，整篇剔除。
  </li>
</ol>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>训练退火阶段的合成数据混合法则 (Data Mixture & Annealing)</h4>
  <p>
    在 Llama-3 与 Qwen-2.5 的技术报告中，最关键的招数之一是<strong>阶段式语料配比与退火（Cool-down Annealing）</strong>：
  </p>
  <ul>
    <li><strong>基座阶段（前 80%~90% Tokens）</strong>：
      以清洗后的全网通识语料为主（网页 70%、代码 15%、学术百科 15%），先把世界知识和多语言理解的底座打牢；
    </li>
    <li><strong>退火阶段（最后 10%~20% Tokens）</strong>：
      学习率线性衰减到零的同时，把<strong>高质量合成数据（Synthetic Data）与高密度推理语料</strong>的配比拉上去：
      代码与算法题提升至 35%、高质量数学证明题提升至 30%、合成反思思维链提升至 20%，通识网页降至 15%。
    </li>
  </ul>
  <p>
    <strong>工业经验结论</strong>：在学习率快归零的那段窗口里灌进高密度的理科与逻辑合成数据，模型的 GSM8k、HumanEval 推理评测指标会出现明显的「翘尾效应」，涨幅常常超过前面几个月的通识泛读。
  </p>
</section>

<h3>3. 集群物理通信拓扑与计算通信重叠</h3>
<p>
  到了万卡规模，光算理论 FLOPs 保证不了训练速度，<strong>网络拓扑与通信调度</strong>才是决定 MFU 的关键。
</p>

<table class="tbl small">
  <thead><tr><th>层级</th><th>互联技术</th><th>双向理论聚合带宽</th><th>通信延迟</th><th>承载的并行切分维度</th></tr></thead>
  <tbody>
    <tr><td><strong>节点内（Intra-Node, 单机 8 卡）</strong></td><td>NVLink / NVSwitch</td><td>900 GB/s ~ 1.8 TB/s</td><td>< 1 µs</td><td><strong>张量并行 (TP)</strong>、前向注意力</td></tr>
    <tr><td><strong>跨节点（Inter-Node, 机柜内 / 跨机柜）</strong></td><td>InfiniBand NDR / RoCE v2</td><td>400 Gbps ~ 800 Gbps (50~100 GB/s)</td><td>2~5 µs</td><td><strong>流水线并行 (PP)</strong>、<strong>数据并行 (DP / ZeRO)</strong></td></tr>
  </tbody>
</table>

<p>
  跨节点带宽比机内 NVLink 慢了整整一个数量级，所以工业级训练框架必须做<strong>计算通信重叠（Compute-Communication Overlap）</strong>：
</p>
<p>
  反向算第 \(l\) 层权重梯度的同时，后台异步通信流（CUDA Stream）在物理网络上做第 \(l+1\) 层的跨节点 All-Reduce 聚合梯度。
  只要通信时间 \(T_{\text{comm}} \le T_{\text{comp}}\)，通信开销就被计算完全盖住（Zero Overhead）；
  一旦网络丢包或拥塞导致 \(T_{\text{comm}} > T_{\text{comp}}\)，GPU 才会空转等待（Bubble）。
</p>

<h3>4. 数值稳定与无损异步容灾 (Resilient Checkpointing)</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经知道数据该怎么洗、怎么配。
  <strong>本节只加一件事</strong>：万卡跑几个月的现实问题——随时会坏，怎么不从头再来。
  <strong>怎么读</strong>：理解"为什么不能每次都停机写盘"这一个矛盾就够了；异步双缓冲的实现可以第二遍再看。
</p>

<p><strong>1. FP8 缩放因子防下溢算子演示：</strong></p>
<p>\[ X_{\text{fp8}} = \text{clip}\left( \left\lfloor X \cdot \frac{S}{\text{amax}(|X|)} \right\rceil, -448, 448 \right) \]</p>
<p>
  <strong>逐行代数解析</strong>：在 FP8 混合精度训练里先统计张量绝对值的最大值 \(\text{amax}\)，再乘上自适应缩放因子 \(S\)，把数值对齐到 FP8 的动态范围（E4M3 格式最大值为 448），这样指数位只有 4 位的低精度浮点就不会下溢截断归零。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>容灾的瓶颈：Checkpointed I/O</h4>
  <p>
    70B 模型的完整权重加上 AdamW 优化器状态，存一份大约要 <strong>1.1 TB</strong>。
    要是让全集群万卡一起停下来等写盘，每次落盘可能耗时 15~30 分钟，MFU 直接掉 15%。
  </p>
  <p>
    <strong>现在的做法：异步非阻塞双缓冲（Asynchronous Double-Buffered Checkpointing）</strong>：<br />
    1. 在显存里留一份小镜像，或者通过高速 PCIe 异步把权重拷到 Host 内存（只要 2~3 秒）；<br />
    2. 主训练流马上恢复前向反向计算；<br />
    3. CPU 后台线程池用空闲网络带宽，慢慢把内存里的数据刷进分布式文件系统（Ceph / Lustre / S3 这类）；<br />
    4. 某个节点掉线后，调度系统（Slurm / Kubernetes）在 3 分钟内踢掉坏卡、拉起热备节点，从最近一次快照接着训。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 LSH（局部敏感哈希）中，签名总长度固定为 \(m=128\)，把波段数 \(b\) 从 16 调到 32（行数 \(r\) 相应从 8 降到 4），会有什么后果？</p>
  <ul class="opts">
    <li>相似度捕获能力下降，漏掉大量相似文章</li>
    <li data-ok>判定拐点阈值 \(t \approx (1/b)^{1/r}\) 明显降低，系统更敏感，能捞回更多中低相似度文章，但撞桶的候选对变多，后续比对开销增加</li>
    <li>哈希桶总数变少，导致内存溢出</li>
    <li>Jaccard 相似度计算完全失效</li>
  </ul>
  <p class="why">
    当 \(b\) 增大、\(r\) 减小时，单波段发生全等碰撞的条件（只要 4 个哈希值相等）更容易满足，阈值 \(t \approx (1/32)^{1/4} \approx 0.42\)（原为 \(0.71\)），召回率更高，但误报和后续比对开销也跟着涨。
  </p>
</div>
`
});
