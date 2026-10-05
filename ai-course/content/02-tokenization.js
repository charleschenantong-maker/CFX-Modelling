/* content/02-tokenization.js — 模块 02：分词与数据表示 */
COURSE.register({
  id: "m2",
  part: 1,
  num: "02",
  title: "Tokenizer 与数据：模型看到的不是文字",
  en: "Tokenization & Data",
  minutes: 35,
  tags: ["核心", "工程", "必做"],
  body: String.raw`
<p class="lead">
  大语言模型和音频生成模型从不曾真正「阅读」英文字母、汉字或声波采样点。
  它们眼中的世界，是由离散符号索引构成的整型序列（Token IDs）。
  分词器（Tokenizer）是连接连续人类符号与离散神经网络张量的数学变换网关。
  本讲追随 Andrej Karpathy 的 <code>minbpe</code> 极简哲学，
  从零手写纯 Python 字节级 BPE（Byte-Pair Encoding）算法，
  并深度对比音频神经离散编码（残差矢量量化 RVQ 码本）与文本分词器的代数同构性。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>学习目标：建立符号压缩与离散量化的严密直觉</h4>
  <p>
    阅读完本讲后，你将能够做到：
    <strong>①</strong> 彻底看透 Byte-level BPE 为何能以 256 个初始字节叶子节点彻底终结 OOV（未登录词）问题；
    <strong>②</strong> 手写频数统计与贪心合并循环，逐行解构从原始字节流到扩展词表的自底向上聚类演化；
    <strong>③</strong> 洞察文本 Tokenizer 与音频 RVQ（Residual Vector Quantization）之间的代数同构；
    <strong>④</strong> 掌握工业级训练数据配比、序列打包（Sequence Packing）与损失掩码（Loss Mask）的避坑规范。
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    为什么大模型做加减法算术经常翻车？为什么有些罕见字会导致模型生成幻觉？
    为什么同一段语义，英文消耗 100 个 Token，中文却要消耗 200 个？
    为什么在现代音频大模型中，一首交响乐可以被压缩为每秒几十个离散数字码？
    答案全在分词与离散量化（Tokenization & Quantization）的设计准则中。
  </p>
</section>

<h3>1. 为什么不能直接用字符或单词？（权衡三角）</h3>
<p>
  离散序列表示存在一个不可调和的工程与理论权衡三角：
</p>
<table class="tbl small">
  <thead>
    <tr>
      <th>粒度方案</th>
      <th>词表大小 \(|\mathcal{V}|\)</th>
      <th>序列展开长度 \(T\)</th>
      <th>主要缺陷与致命瓶颈</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>单词级 (Word-level)</td>
      <td>极度庞大（\(10^5 \sim 10^7\)）</td>
      <td>极短</td>
      <td>词表爆炸，无法处理未登录新词（OOV），参数矩阵极其稀疏</td>
    </tr>
    <tr>
      <td>字符级 (Character-level)</td>
      <td>极小（几十至几千）</td>
      <td>极长（膨胀 4–10 倍）</td>
      <td>单步语义承载极弱，自注意力 \(O(T^2)\) 计算开销在长序列下直接崩溃</td>
    </tr>
    <tr>
      <td><strong>子词级 BPE</strong> (主流)</td>
      <td>中等（32k \(\sim\) 128k）</td>
      <td>均衡</td>
      <td><strong>高频词整词编码，罕见词拆分为子词/字节，零 OOV，序列紧凑</strong></td>
    </tr>
  </tbody>
</table>

<h3>2. 教科书级实现：Karpathy 风格 Byte-level BPE 从零构建</h3>
<p>
  现代大模型（如 GPT-4、Llama-3）均采用<strong>字节级（Byte-level）BPE</strong>。
  其核心洞见是：任何文本、代码、公式甚至二进制数据，在底层都是 UTF-8 编码的字节序列（Byte values: 0–255）。
  只要初始词表包含基础的 256 个字节单元，<strong>世界上任何序列就永远不会发生 OOV 报错</strong>！
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>纯 Python 从零手写 BPE 训练与编解码引擎</h4>
<pre><code><span class="cm"># ========================================================</span>
<span class="cm"># Karpathy minbpe 极简工业级复刻：BPE 算法骨架</span>
<span class="cm"># ========================================================</span>

<span class="kw">def</span> <span class="hi">get_stats</span>(ids):
    <span class="st">"""统计整型序列中所有相邻二元对 (pair) 的出现频数"""</span>
    counts = {}
    <span class="cm"># [逐行剖析] 滑动窗口步长为 1，扫描所有相邻 token 对</span>
    <span class="kw">for</span> pair <span class="kw">in</span> zip(ids, ids[1:]):
        counts[pair] = counts.get(pair, 0) + 1
    <span class="kw">return</span> counts

<span class="kw">def</span> <span class="hi">merge</span>(ids, pair, idx):
    <span class="st">"""在整型序列中，将所有连续出现的特定 pair 替换为新分配的合并 token idx"""</span>
    newids = []
    i = 0
    <span class="kw">while</span> i &lt; len(ids):
        <span class="cm"># [逐行剖析] 匹配到目标 pair 且未越界：替换为新合并 ID，指针前移 2 位</span>
        <span class="kw">if</span> i &lt; len(ids) - 1 <span class="kw">and</span> ids[i] == pair[0] <span class="kw">and</span> ids[i+1] == pair[1]:
            newids.append(idx)
            i += 2
        <span class="kw">else</span>:
            newids.append(ids[i])
            i += 1
    <span class="kw">return</span> newids

<span class="kw">class</span> <span class="hi">BasicTokenizer</span>:
    <span class="kw">def</span> __init__(self):
        <span class="cm"># [逐行剖析] merges 字典：存储合并规则映射 (p0, p1) -> new_idx</span>
        self.merges = {}
        <span class="cm"># [逐行剖析] vocab 字典：存储整数 token_id 到对应原始 bytes 的双向查找表</span>
        self.vocab = {idx: bytes([idx]) <span class="kw">for</span> idx <span class="kw">in</span> range(256)}

    <span class="kw">def</span> train(self, text, vocab_size, verbose=False):
        <span class="kw">assert</span> vocab_size &gt;= 256, <span class="st">"词表大小必须至少覆盖 256 个基础字节"</span>
        num_merges = vocab_size - 256
        
        <span class="cm"># [逐行剖析] 1. 将输入纯文本按 UTF-8 编码为原始字节整数列表 [0..255]</span>
        text_bytes = text.encode(<span class="st">"utf-8"</span>)
        ids = list(text_bytes)

        <span class="cm"># [逐行剖析] 2. 迭代式贪心合并：寻找当前全局频数最高的相邻二元对</span>
        <span class="kw">for</span> i <span class="kw">in</span> range(num_merges):
            stats = get_stats(ids)
            <span class="kw">if</span> <span class="kw">not</span> stats:
                <span class="kw">break</span>
            <span class="cm"># 找出出现频数最高的相邻对</span>
            best_pair = max(stats, key=stats.get)
            idx = 256 + i
            <span class="cm"># 替换并记录规则</span>
            ids = merge(ids, best_pair, idx)
            self.merges[best_pair] = idx
            self.vocab[idx] = self.vocab[best_pair[0]] + self.vocab[best_pair[1]]
            <span class="kw">if</span> verbose:
                print(f"Merge {i+1}/{num_merges}: {best_pair} -> {idx} ({self.vocab[idx]!r})")

    <span class="kw">def</span> encode(self, text):
        <span class="cm"># [逐行剖析] 编码：自底向上贪心应用已学到的合并规则表</span>
        text_bytes = text.encode(<span class="st">"utf-8"</span>)
        ids = list(text_bytes)
        <span class="kw">while</span> len(ids) &gt;= 2:
            stats = get_stats(ids)
            <span class="cm"># 找出当前序列中在 merges 中排名最靠前（最先合并出来）的 pair</span>
            pair = min(stats, key=<span class="kw">lambda</span> p: self.merges.get(p, float(<span class="st">"inf"</span>)))
            <span class="kw">if</span> pair <span class="kw">not in</span> self.merges:
                <span class="kw">break</span>
            idx = self.merges[pair]
            ids = merge(ids, pair, idx)
        <span class="kw">return</span> ids

    <span class="kw">def</span> decode(self, ids):
        <span class="cm"># [逐行剖析] 解码：查表还原为字节串，并使用 UTF-8 容错解码还原自然语言</span>
        part_bytes = [self.vocab[idx] <span class="kw">for</span> idx <span class="kw">in</span> ids]
        <span class="kw">return</span> b<span class="st">""</span>.join(part_bytes).decode(<span class="st">"utf-8"</span>, errors=<span class="st">"replace"</span>)</code></pre>
</section>

<h3>3. 前沿理论映射：文本 Tokenizer 与音频 RVQ 码本的代数同构</h3>
<p>
  大语言模型处理自然语言，而现代音频神经编解码大模型（如 Meta EnCodec、SoundStream、Descript DAC）则处理连续声学波形。
  乍看之下，一维离散文字与高维连续声波截然不同，但从<strong>信息论与测度量化</strong>的数学视角看，
  <strong>文本 BPE 分词器与音频残差矢量量化（Residual Vector Quantization, RVQ）在代数结构上高度同构！</strong>
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>代数结构映射：BPE 层次合并 vs RVQ 级联残差量化</h4>
  <p>
    <strong>文本领域的 BPE 分词器</strong>：
    输入是连续时间轴上的离散字符序列。通过自底向上的<strong>时域层次聚合（Hierarchical Aggregation）</strong>，
    把高频共现的子序列映射为单个整数符号 \(s \in \mathcal{V}_{\text{text}}\)。
    这在本质上是对离散信息进行无损或近无损的<strong>熵编码重聚类</strong>。
  </p>
  <p>
    <strong>音频领域的 RVQ 离散神经编码器</strong>：
    连续音频采样点 \(x(t)\) 经由一维因果卷积降采样编码器映射为每秒固定的连续隐空间向量序列 \(\mathbf{z} \in \mathbb{R}^d\)（如 50 Hz 帧率）。
    由于直接对连续向量 \(\mathbf{z}\) 构建一个超级大码本在计算上不可行（若码本大小为 \(2^{32}\)，内积检索直接超算力），
    RVQ 引入了优雅的<strong>级联残差逼近结构</strong>：
  </p>
  <ol>
    <li><strong>第一级量化</strong>：在第一级码本 \(\mathcal{C}^{(1)} = \{\mathbf{e}_1^{(1)}, \dots, \mathbf{e}_K^{(1)}\}\) 中寻找与 \(\mathbf{z}\) 欧氏距离最近的码字：
      \[ k_1 = \arg\min_j \|\mathbf{z} - \mathbf{e}_j^{(1)}\|_2^2, \qquad \hat{\mathbf{z}}^{(1)} = \mathbf{e}_{k_1}^{(1)} \]
    </li>
    <li><strong>计算一阶残差</strong>：\(\mathbf{r}^{(1)} = \mathbf{z} - \hat{\mathbf{z}}^{(1)}\)；</li>
    <li><strong>第二级量化</strong>：在第二级码本 \(\mathcal{C}^{(2)}\) 中对残差进行逼近：
      \[ k_2 = \arg\min_j \|\mathbf{r}^{(1)} - \mathbf{e}_j^{(2)}\|_2^2, \qquad \hat{\mathbf{z}}^{(2)} = \mathbf{e}_{k_2}^{(2)} \]
    </li>
    <li><strong>级联递推 \(Q\) 层</strong>：最终连续向量被高保真分解为 \(Q\) 个离散码本索引元组与剩余残差：
      \[ \mathbf{z} \approx \sum_{q=1}^{Q} \mathbf{e}_{k_q}^{(q)} \]
    </li>
  </ol>
</section>

<table class="tbl small">
  <thead>
    <tr>
      <th>维度对比</th>
      <th>文本分词器 (Byte-level BPE)</th>
      <th>音频神经离散编码 (RVQ / EnCodec)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>原始输入数据</td>
      <td>连续文本字符序列（离散符号）</td>
      <td>连续音频压力波形（连续实数信号）</td>
    </tr>
    <tr>
      <td>离散化机制</td>
      <td>基于统计频数贪心合并（时域合并）</td>
      <td>基于欧氏距离的逐层残差矢量量化（空间残差投射）</td>
    </tr>
    <tr>
      <td>输出离散表征</td>
      <td>一维 Token 索引序列 \((t_1, t_2, \dots)\)</td>
      <td>多码本并行或交织 Token 矩阵 \([k_t^{(1)}, \dots, k_t^{(Q)}]\)</td>
    </tr>
    <tr>
      <td>词表/码本大小</td>
      <td>\(|\mathcal{V}| \approx 32\text{k} \sim 128\text{k}\) 单一词表</td>
      <td>\(Q\) 个层级码本，每个码本 \(K = 1024\) 或 \(2048\)</td>
    </tr>
    <tr>
      <td>下游模型接口</td>
      <td>输入 Embedding 矩阵行索引查表</td>
      <td>输入 \(Q\) 个 Embedding 累加：\(\sum_{q=1}^Q \mathbf{E}^{(q)}[k_t^{(q)}]\)</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么连通工业级实践：词表大小与压缩率的工程权衡</h4>
  <p>
    在设计实际的大模型时，词表大小 \(|\mathcal{V}|\) 是一个至关重要的工程权衡：
  </p>
  <ul>
    <li><strong>词表太小（如 8k）</strong>：每个单词被切成很多碎片 Token，导致相同的一句话生成的序列长度 \(T\) 极长，平方级注意力开销 \(\mathcal{O}(T^2)\) 剧增，推理极慢；</li>
    <li><strong>词表太大（如 150k，如 Qwen 系列）</strong>：Token 压缩率极高（一句话只占很少的 Token），但首尾 Embedding 矩阵占用大量显存（如 \(150000 \times 2048 \times 2\) 字节 \(\approx 600\) MB），在超小模型中 Embedding 参数甚至超过主干网络。</li>
  </ul>
  <p>
    因此，1B 到 3B 级别的小模型通常将词表控制在 32k 到 64k 之间，以实现显存开销与长文本推理效率的最佳平衡。
  </p>
</section>

<h3>4. 特殊 Token、Chat Template 与数据格式避坑指南</h3>
<p>
  除了普通文本词，工业级 Tokenizer 中还驻留着决定系统生死的<strong>控制 Token</strong>：
</p>
<table class="tbl small">
  <thead>
    <tr>
      <th>特殊 Token</th>
      <th>典型标准字符串</th>
      <th>核心功能与工程易错点</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>序列终结 (EOS)</td>
      <td><code>&lt;|endoftext|&gt;</code> / <code>&lt;/s&gt;</code></td>
      <td>标记生成停止。微调时若漏打 EOS，模型在推理时会陷入永不停止的胡言乱语</td>
    </tr>
    <tr>
      <td>对话角色标记</td>
      <td><code>&lt;|im_start|&gt;user</code> / <code>&lt;|im_start|&gt;assistant</code></td>
      <td>ChatML 规范中隔离用户提问与模型输出，必须严格与推理模板一致</td>
    </tr>
    <tr>
      <td>填充对齐 (PAD)</td>
      <td><code>&lt;pad&gt;</code></td>
      <td>对齐 Batch 中不同长度序列。在计算交叉熵损失时必须使用 <code>ignore_index=-100</code> 屏蔽</td>
    </tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">把词表大小 \(|\mathcal{V}|\) 从 32k 扩大到 128k，在序列建模中最直接的双重影响是什么？</p>
  <ul class="opts">
    <li>模型推理速度变慢，且更容易产生梯度弥散</li>
    <li data-ok>相同自然语言文本切分出的 Token 数量显著减少（等价于上下文窗口能容纳更长文本），但模型的 Embedding 与输出层参数量成比例增大</li>
    <li>交叉熵损失绝对值一定会变大</li>
    <li>词表中将不再需要任何单字节 Token</li>
  </ul>
  <p class="why">
    词表变大后，高频长短语被直接收录为一个 Token，因此相同文本被切成的 Token 序列长度变短，降低了自注意力 \(O(T^2)\) 的计算开销；但代价是参数量 \(|\mathcal{V}| \times d\) 在输入和输出层大幅膨胀，且稀有 Token 的更新梯度更加稀疏。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在进行指令微调（SFT）训练对话模型时，如果忘记为用户 Prompt 部分设置损失掩码（Loss Mask，将其设为 -100），模型在推理时最可能出现什么严重病态？</p>
  <ul class="opts">
    <li>完全没有影响，现代 Transformer 能自动区分角色</li>
    <li>训练过程会在反向传播时直接报错崩溃</li>
    <li data-ok>模型会混淆角色边界，常常在生成回答的过程中开始自顾自地假扮用户提问或自问自答</li>
    <li>只会导致 Loss 数值变大，生成能力反而有所增强</li>
  </ul>
  <p class="why">
    损失函数是模型行为的指挥棒。若将用户提问也纳入交叉熵反向传播，模型在反向梯度驱动下会同等学习「如何生成用户提问」，导致推理时角色边界瓦解，出现令人抓狂的自问自答现象。正确做法是只对 <code>assistant</code> 角色输出的 Token 计算损失。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">在英文为主的 BPE 词表（如原始 GPT-2 词表）上，处理中文或代码时为什么会出现极高的 Fertility（单个词对应的 Token 数很多）？</p>
  <ul class="opts">
    <li>中文 Unicode 编码标准本身存在设计缺陷</li>
    <li data-ok>BPE 贪心合并规则是根据训练语料中的二元对频数统计驱动的，英文语料占绝大多数导致高频合并规则几乎全被英文子词占据，中文多字节字符无法被有效合并，只能退化为零散字节</li>
    <li>中文模型故意采用了更复杂的非线性变换</li>
    <li>这是商业云服务商为了提高计费故意设置的策略</li>
  </ul>
  <p class="why">
    BPE 是一种纯粹基于语料统计频数的贪心无监督算法。若预训练语料中中文占比极低，中文字符的相邻高阶字节对频数不足以挤进全局前数万个合并规则中，导致编码时中文只能退化为单字节或双字节碎片，Fertility 大幅攀升。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">为什么 Byte-level BPE 能彻底保证在处理世界上任何文本甚至恶意损坏的乱码时，绝不会发生 OOV（未登录词）错误？</p>
  <ul class="opts">
    <li>因为词表容纳了无限多的特殊符号</li>
    <li data-ok>因为初始词表强制预置了 0 到 255 的全部 256 个 UTF-8 基础字节作为不可拆分基底，任何文本在字节层面都可以退化拆分为单字节序列</li>
    <li>因为遇到底层未知符号时会自动触发在线网络搜索</li>
    <li>因为遇到未知词时会直接静默丢弃</li>
  </ul>
  <p class="why">
    根据 UTF-8 编码规范，任何计算机文本序列在物理层面都是由 0 到 255 的八位字节构成的。Byte-level BPE 将这 256 个字节作为算法递归合并的不可分割原子叶子节点，因此无论多么罕见、冷门或拼写错误的字符串，最差情形下都可以拆为单字节 Token，永不发生 OOV。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">在神经音频编解码模型（如 EnCodec）中，残差矢量量化（RVQ）引入多级码本级联逼近的核心代数动机是什么？</p>
  <ul class="opts">
    <li>为了让声波采样率降低至 1 Hz</li>
    <li data-ok>避免高比特率下单级超级大码本的指数级存储与最近邻搜索算力爆炸，用 \(Q\) 个大小仅为 \(K\) 的小码本级联贪心拟合，达到等价于 \(K^Q\) 级超精细量化表征能力</li>
    <li>为了将立体声音频转换为单声道</li>
    <li>为了绕过傅里叶变换</li>
  </ul>
  <p class="why">
    若使用单级码本实现高保真度量化，例如需要 \(2^{30}\) 种状态，存储该码本并执行欧氏距离最近邻搜索在 GPU 显存和算力上完全不可行。RVQ 采用级联逼近：每一级只负责量化前一级的残差误差，仅需 \(Q\) 个大小为 1024 的微型码本相加，即可实现跨越数个数量级的极高保真度逼近。
  </p>
</div>
`
});
