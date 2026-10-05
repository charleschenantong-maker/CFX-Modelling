/* content/19-rag.js — 模块 19：检索增强与上下文工程 */
COURSE.register({
  id: "m19",
  part: 6,
  num: "19",
  title: "检索增强与上下文工程：把知识放进提示，而不是权重里",
  en: "RAG & Context Engineering",
  minutes: 45,
  tags: ["高阶", "系统", "实用"],
  body: String.raw`
<p class="lead">
  如果一个事实今天才知道，把它「训进权重」是最慢、最贵、最不可追溯的做法。
  检索增强（RAG）把这件工作从<strong>训练时</strong>搬到<strong>推理时</strong>：
  知识存在索引里，答案在提示里组装。这一模块讲完整的七步管线、两套必须分开测的指标、
  以及长上下文时代里 RAG 仍然不可替代的原因。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：微调像<em>把整本书背下来</em>，检索像<em>带着书进考场，现查现答</em>。
    背书慢、改版要重背、还不知道答案是背来的还是想出来的；翻书快、改版只换书页、还能指出页码。<br />
    <strong>这一讲要建立的直觉</strong>：RAG 的质量由两个<em>独立</em>的环节决定——
    「该看的资料有没有被捞出来」（检索）与「捞出来的资料有没有被正确使用」（生成）。
    它们必须分开测量，否则你会在错误的环节上优化几周。<br />
    <strong>读完你能回答</strong>：chunk 该切多大？为什么 BM25 到现在还没被淘汰？
    「检索指标很好但回答很差」时该先查什么？每问的 token 成本怎么估？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你手上有 200 份产品文档（约 100 万 token），要让助手回答客户问题，并且答案要能给出处。
    团队里有人提议「拿文档微调一个模型」，有人说「现在上下文都 128k 了，全塞进去就行」，
    还有人要直接上向量数据库。三个方案的成本差 100 倍以上——
    在选之前，先回答一个问题：<em>你要的是「模型学会怎么回答」，还是「模型在回答时能拿到正确的资料」？</em>
  </p>
</section>

<h3>1. 先分类：缺知识还是缺行为</h3>
<p>
  这与 <a href="#m7">模块 07</a> 的第一张表是同一条判据，只是这里展开成工程细节：
  <strong>知识类的缺口优先用检索补，行为类的缺口（格式、语气、遵循复杂指令）才用微调补。</strong>
  判断方法很朴素：换一份更新的资料，你的系统能不能立刻受益？能，就是知识问题。
</p>
<table class="tbl small">
  <thead><tr><th>维度</th><th>检索（RAG）</th><th>微调（SFT / LoRA）</th></tr></thead>
  <tbody>
    <tr><td>知识更新</td><td>重建索引即可，分钟级</td><td>重新训练，小时到天级；且容易遗忘旧知识</td></tr>
    <tr><td>可溯源</td><td>天然可以给出 chunk 与来源</td><td>无法指出「这句话从哪来」</td></tr>
    <tr><td>一次成本</td><td>嵌入 + 索引，通常几美分到几美元</td><td>GPU 时长 + 数据构造，成本高一个量级</td></tr>
    <tr><td>单次成本</td><td>检索近乎免费，但 prompt 变长（输入 token ↑）</td><td>prompt 不变，权重变（无额外 token）</td></tr>
    <tr><td>延迟</td><td>检索 + 重排 + 更长的 prefill</td><td>与基线相同</td></tr>
    <tr><td>擅长的事</td><td>事实、条款、编号、时效性内容</td><td>输出格式、领域语言风格、固定流程</td></tr>
    <tr><td>不擅长的事</td><td>需要跨很多段落做全局推理的问题</td><td>记住快速变化的事实；「记住」不等于「会用」</td></tr>
  </tbody>
</table>
<p>
  实践中两者常常同时用：<strong>RAG 提供事实，轻量 LoRA 负责把这个领域的输出格式固定下来</strong>。
  这个范式本身来自 <a href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener">Lewis et al. (2020)</a>：
  把「参数化记忆」（seq2seq 模型）与「非参数化记忆」（Wikipedia 的稠密向量索引）组合起来，
  在当时三个开放域问答任务上取得最好成绩，并且生成的文本更具体、更多样、更符合事实。
  注意成本结构不同：RAG 把成本放在<em>每一次请求</em>（输入 token 变多），
  微调把成本放在<em>一次性训练</em>。请求量大时，这个差别会被放大到完全不同的量级
  （见 <a href="#m11">模块 11</a> 的订阅经济学）。
</p>

<h3>2. 完整管线：七个必须分开调试的环节</h3>
<div class="flow">
  <div class="nd hi">切分 chunking</div>
  <div class="ar">→</div>
  <div class="nd">嵌入 embedding</div>
  <div class="ar">→</div>
  <div class="nd">检索 retrieval</div>
  <div class="ar">→</div>
  <div class="nd">重排 rerank</div>
</div>
<div class="flow">
  <div class="nd hi">组装上下文</div>
  <div class="ar">→</div>
  <div class="nd">生成</div>
  <div class="ar">→</div>
  <div class="nd">引用与校验</div>
  <div class="ar">→</div>
  <div class="nd">记录日志</div>
</div>
<p>
  一个反直觉但极其重要的经验：<strong>大多数「RAG 效果不好」的问题出在第 1 步和第 7 步，而不是向量模型</strong>。
  切分决定了检索的上限（切碎了就永远捞不到完整语义），日志决定了你能不能定位问题。
</p>

<h4>2.1 切分：chunk 大小是一次精度与成本的交易</h4>
<p>三种主流做法，按实现成本排序：</p>
<ul>
  <li>
    <strong>固定长度 + 重叠</strong>：按 token 数切，相邻块重叠 10%–20%。
    简单、可预测，是默认起点。典型起点是 300–500 token、重叠 50。
    缺点是会在句子中间切断，指代关系（「该参数」「上述情况」）被切散。
  </li>
  <li>
    <strong>语义 / 结构切分</strong>：按标题层级、段落、句子边界切，配合最大长度兜底。
    成本低、收益高，尤其是技术文档。必须把<em>结构路径</em>（章节标题链）写进每个块的元数据——
    因为检索时命中的是块，但人理解时需要知道它属于哪一节。
  </li>
  <li>
    <strong>层级切分</strong>：递归地对块做嵌入、聚类、摘要，形成一棵从细到粗的树，检索时可以在不同抽象层级上取。
    RAPTOR（Sarthi et al., 2024）用这种方式把整体文档理解的问题变成「检索摘要节点」，
    报告在 QuALITY 基准上配合 GPT-4 取得 <strong>20% 的绝对准确率提升</strong>。
  </li>
</ul>
<p>
  <strong>小块的检索更准，大块的回答更完整</strong>——这是核心矛盾。常见的折中是「小块检索、大块喂给模型」：
  用小块做索引，命中后把它所在的父块（或相邻几块合并）送给生成模型。
</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>块数、向量体积与成本</h4>
  <p>给定语料 token 数 \(N_{\text{tok}}\)、块长 \(L_{\text{chunk}}\) 与重叠 \(L_{\text{overlap}}\)，块的数量近似为</p>
  \[ N_{\text{chunk}} \approx \frac{N_{\text{tok}}}{L_{\text{chunk}} - L_{\text{overlap}}} \]
  <p>手算：\(N_{\text{tok}} = 10^{6}\)（约 200 份文档）、\(L_{\text{chunk}} = 400\)、\(L_{\text{overlap}} = 50\)：</p>
  \[ N_{\text{chunk}} \approx \frac{10^{6}}{350} \approx 2857 \]
  <p>若用 384 维、fp32 的向量，索引体积是</p>
  \[ 2857 \times 384 \times 4\ \text{bytes} \approx 4.4\ \text{MB} \]
  <p>
    也就是说：<strong>100 万 token 的语料，向量索引只有几 MB，嵌入是一次性成本</strong>。
    真正持续花钱的不是索引，而是每次请求被塞进 prompt 的上下文。
  </p>
</section>

<h4>2.2 嵌入：它只是一个相似度函数</h4>
<p>
  双塔（bi-encoder）把查询与文档分别编码成向量，检索退化成一次近邻搜索：
</p>
\[ \mathrm{sim}(q,d) = \frac{\langle E(q), E(d)\rangle}{\|E(q)\|\,\|E(d)\|} \]
<p>
  这带来两个必须接受的性质：<strong>(1) 查询与文档从不互相看见</strong>，
  所以它抓的是「语义相近」，抓不到「细节匹配」；
  <strong>(2) 向量是压缩后的有损表示</strong>，编号、错误码、人名这类低频精确串很容易在压缩中丢掉。
</p>
<p>
  关于「用哪个嵌入模型最好」，最诚实的答案是
  <strong>没有哪个模型在所有任务上都最好</strong>。MTEB 基准（Muennighoff et al., 2022）横跨 8 类嵌入任务、
  58 个数据集、112 种语言、33 个模型，结论正是：没有任何单一方法在所有任务上占优。
  所以正确做法是<em>在你自己的数据上测召回</em>，而不是照抄榜单第一名。
</p>

<h4>2.3 检索：稀疏、稠密与混合</h4>
<table class="tbl small">
  <thead><tr><th>方式</th><th>代表</th><th>强项</th><th>弱点</th><th>成本</th></tr></thead>
  <tbody>
    <tr>
      <td>稀疏（词项匹配）</td>
      <td>BM25</td>
      <td>精确串、罕见词、编号、专有名词；无需训练；可解释</td>
      <td>同义改写、跨语言、语义泛化差</td>
      <td>极低（倒排索引）</td>
    </tr>
    <tr>
      <td>稠密（向量）</td>
      <td>DPR 类双塔</td>
      <td>语义改写、口语化提问与书面文档的对齐</td>
      <td>低频精确串易丢；领域外泛化不稳</td>
      <td>嵌入一次性 + 向量检索</td>
    </tr>
    <tr>
      <td>混合</td>
      <td>BM25 + 向量 + 融合</td>
      <td>两边的短板互补，通常是最稳的默认选择</td>
      <td>需要调融合权重或做结果融合</td>
      <td>低（两路检索可并行）</td>
    </tr>
    <tr>
      <td>重排</td>
      <td>交叉编码器（cross-encoder）</td>
      <td>精度最高：查询与文档逐 token 互相注意</td>
      <td>无法预先建索引，只能对候选集重排</td>
      <td>高（每个候选一次前向）</td>
    </tr>
  </tbody>
</table>
<p>
  三条可核实的证据支撑这张表：
  <strong>(1)</strong> DPR（Karpukhin et al., 2020）证明稠密检索可以只用双塔实现，
  并且在开放域问答上相对强 Lucene-BM25 系统在 top-20 段落召回准确率上高出 <strong>9%–19% 绝对值</strong>；
  <strong>(2)</strong> BEIR（Thakur et al., 2021）在 18 个跨领域数据集上评估 10 类检索系统后给出一个更冷静的结论：
  <strong>BM25 是稳健的基线</strong>，重排与 late-interaction 类模型平均最好但计算代价高，
  而稠密与稀疏模型更省算力却在跨域上常常不如它们；
  <strong>(3)</strong> 交叉编码器重排（Nogueira &amp; Cho, 2019）在 MS MARCO 段落检索上把 MRR@10 相对此前最好成绩提升了
  <strong>27%</strong>。
</p>
<p>
  混合检索最常用的融合方式是倒数排名融合（RRF），它只依赖名次、不需要两路分数可比：
</p>
\[ \mathrm{RRF}(d) = \sum_{r \in R}\frac{1}{\kappa + \mathrm{rank}_r(d)} \]
<p>
  其中 \(\kappa\) 是一个小常数（工程默认常取 60），用来压低头名的绝对优势。
  RRF 的好处是：你不需要把 BM25 的分数与余弦相似度归一化到同一个尺度上——
  这件事在实践中比看起来难得多。
</p>

<h4>2.4 重排：用一次昂贵计算换精度</h4>
<p>
  标准的两段式：先用便宜检索取 top-50 到 top-100，再用交叉编码器重排取 top-5。
  交叉编码器把「查询 + 文档」拼在一起过一遍模型，因此它能捕捉双塔看不到的交互（否定、限定条件、数字比较）。
  代价是每个候选一次前向：50 个候选 × 每块 400 token，就是一次 2 万 token 量级的批量推理——
  比检索贵，但比让主模型读全部候选便宜得多。
</p>
<p>
  <strong>什么时候值得加重排</strong>：检索召回没问题但 top-k 里有干扰项时；
  问题包含多个约束条件时；以及对成本不敏感但要求引用准确时。若你的召回本身只有 60%，
  重排救不了你——先解决召回。
</p>

<h4>2.5 组装与生成：位置比你想的更重要</h4>
<p>
  把检索结果拼成上下文时，有四件事会显著影响最终答案，而它们都不需要训练：
</p>
<ul>
  <li><strong>位置</strong>：把最相关的内容放在<em>开头或结尾</em>，不要放在中间（原因见下一节）。</li>
  <li><strong>指令位置</strong>：把「只依据资料回答、资料不足就说不知道、必须给出处」放在<em>紧邻问题</em>的位置，
      而不是只写在最前面的系统提示里。</li>
  <li><strong>去重与冲突处理</strong>：同一事实来自多个块时去重；如果资料互相矛盾，明确要求模型指出冲突，
      而不是让它悄悄选一个。</li>
  <li><strong>结构化引用</strong>：让每条资料带一个稳定 id（如 [docA-17]），并要求模型在句末标注 id，
      这样引用正确率可以被程序自动校验（见下一节）。</li>
</ul>

<h3>3. 两套指标：检索的与生成的，绝不能混着看</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>检索指标：召回、MRR、nDCG</h4>
  <p>设 \(k\) 为返回的条数，\(\mathrm{Rel}\) 为该问题的全部相关块：</p>
  \[ \mathrm{Recall@}k = \frac{|\mathrm{Rel} \cap \mathrm{Top}_k|}{|\mathrm{Rel}|} \]
  <p>MRR 只看<em>第一条</em>相关结果的位置，衡量「用户多快能看到有用资料」：</p>
  \[ \mathrm{MRR} = \frac{1}{|Q|}\sum_{q=1}^{|Q|}\frac{1}{\mathrm{rank}_q} \]
  <p>nDCG 支持分级相关性（非常相关 / 部分相关），并对排在后面的命中做对数折扣：</p>
  \[ \mathrm{DCG@}k = \sum_{i=1}^{k}\frac{2^{rel_i}-1}{\log_2(i+1)} \]
  \[ \mathrm{nDCG@}k = \frac{\mathrm{DCG@}k}{\mathrm{IDCG@}k} \]
  <p>
    其中 \(\mathrm{IDCG@}k\) 是「把相关文档按最优顺序排列」时的 DCG，用来把分数归一到 0–1。
  </p>
  <p><strong>手算示例</strong>：5 个问题，正确块在结果里的名次依次是 1、2、1、5、3。</p>
  <ul>
    <li>\(\mathrm{Recall@1} = 2/5 = 0.40\)；\(\mathrm{Recall@3} = 4/5 = 0.80\)；\(\mathrm{Recall@5} = 5/5 = 1.00\)。</li>
    <li>\(\mathrm{MRR} = (1 + 0.5 + 1 + 0.2 + 0.333)/5 = 3.033/5 \approx 0.607\)。</li>
  </ul>
  <p>
    读这两个数的方式：<strong>Recall@5 = 1.0 说明「只要给 5 条就一定有对的」</strong>，
    而 <strong>MRR = 0.607 说明平均而言正确结果排在第二三位</strong>。
    如果你的上下文预算只够放 3 条，这两个数一起才说明问题。
  </p>
  <p>nDCG 的小例子（二值相关性）：某次排名的相关性依次是 [1, 0, 1]，则</p>
  \[ \mathrm{DCG@3} = \frac{1}{\log_2 2} + 0 + \frac{1}{\log_2 4} = 1 + 0.5 = 1.5 \]
  <p>最优顺序 [1, 1, 0] 的 \(\mathrm{IDCG@3} = 1 + 1/\log_2 3 \approx 1.631\)，于是 \(\mathrm{nDCG@3} \approx 0.92\)。</p>
</section>
<table class="tbl small">
  <thead><tr><th>层次</th><th>指标</th><th>怎么算</th><th>回答什么问题</th></tr></thead>
  <tbody>
    <tr>
      <td>检索</td>
      <td>Recall@k、Precision@k、MRR、nDCG@k</td>
      <td>需要「问题 → 相关块」的标注（人工或规则构造）</td>
      <td>该看的资料有没有被捞出来</td>
    </tr>
    <tr>
      <td>生成（忠实度）</td>
      <td>faithfulness：回答里的每个论断是否被给定资料支持</td>
      <td>通常用 LLM-as-judge 拆论断后逐条判定，可无参考（<a href="https://arxiv.org/abs/2309.15217" target="_blank" rel="noopener">Ragas，Es et al., 2023</a>）</td>
      <td>有没有编造（幻觉）</td>
    </tr>
    <tr>
      <td>生成（相关性）</td>
      <td>answer relevance：回答是否切题、有没有答非所问</td>
      <td>LLM-as-judge，或反向生成问题再比对</td>
      <td>答得对不对题</td>
    </tr>
    <tr>
      <td>引用</td>
      <td>citation accuracy：标注的出处是否真的支持该句</td>
      <td>规则（id 是否存在）+ 判定（内容是否支持）</td>
      <td>能不能信它的出处</td>
    </tr>
    <tr>
      <td>端到端</td>
      <td>人工/规则判定的答案正确率，配对检验</td>
      <td>留出问题集 + <a href="#m9">模块 09</a> 的检验流程</td>
      <td>用户到底有没有得到正确答案</td>
    </tr>
  </tbody>
</table>
<p><strong>为什么检索指标好不等于回答好</strong>——四种常见情形，逐一对应不同的修法：</p>
<ol>
  <li>
    <strong>资料捞对了，但被埋在上下文中间。</strong>召回满分、答案照错。
    修法是调位置，不是调检索。
  </li>
  <li>
    <strong>资料里有答案，也有干扰。</strong>相似但不相关的块会诱导模型顺着错误线索走。
    修法是加重排、减 \(k\)，而不是加 \(k\)。
  </li>
  <li>
    <strong>答案需要跨块合成。</strong>Recall@k 只统计「有没有命中」，不衡量「能不能把三块拼起来」。
    修法是层级切分（父块 / 摘要节点）或让模型先列要点再作答。
  </li>
  <li>
    <strong>生成端根本没遵守指令。</strong>资料给全了，模型仍然自由发挥。
    修法是指令位置、few-shot、结构化输出约束，必要时用微调（<a href="#m7">模块 07</a>）。
  </li>
</ol>
<p>
  评估协议必须同时给出这四个层次的数，流程与显著性检验请照 <a href="#m9">模块 09</a>：
  <strong>构造留出问题集</strong>（问题不由写文档的人来出，避免「答案就在文档里、问题也照着文档写」的泄漏）、
  <strong>固定检索配置</strong>、<strong>成对比较</strong>（同一批问题上比较两个方案，用配对检验）、
  并报告<strong>效应量</strong>而不只是 p 值。
</p>

<h3>4. 长上下文 vs RAG：不是替代关系</h3>
<p>
  先破除一个流行的说法「上下文窗口够大就不需要 RAG」。
  最直接的证据来自 <em>Lost in the Middle</em>（Liu et al., 2023，发表于 TACL）：
  在多文档问答与键值检索任务上，<strong>当相关信息位于输入的开头或结尾时表现最好，
  位于中间时显著下降——即使是显式的长上下文模型也一样</strong>。
  这形成了一条 U 形的性能曲线：窗口装得下，不等于模型用得上。
</p>
<p>
  第二份证据更接近工程决策。<em>RAG or Long-Context?</em>（Li et al., 2024，EMNLP 2024 工业 track）
  用三个较新的模型在多套公开数据上做了系统对比，结论是：
  <strong>在资源充足时，长上下文（LC）的平均表现稳定优于 RAG；但 RAG 显著更低的成本仍是明确优势。</strong>
  他们据此提出 Self-Route：让模型自评「检索到的资料够不够回答」，
  够就用 RAG 的短上下文，不够再退回长上下文，从而在保持接近 LC 表现的同时大幅降低计算成本。
</p>
<p>把成本算清楚，选择就变得具体了（沿用模块 18 的口径：一个 8B 级 GQA 模型每 token 的 KV cache 是 128 KiB）：</p>
<table class="tbl small">
  <thead><tr><th>方案</th><th>每问输入 token</th><th>KV cache（单序列）</th><th>prefill</th><th>适合</th></tr></thead>
  <tbody>
    <tr>
      <td>RAG（k=8，块 400）</td>
      <td>约 3.5k</td>
      <td>约 0.43 GiB</td>
      <td>线性、可控</td>
      <td>绝大多数事实型问答</td>
    </tr>
    <tr>
      <td>长上下文全量</td>
      <td>10 万以上</td>
      <td>约 12.2 GiB</td>
      <td>随长度平方增长</td>
      <td>需要全局理解、跨文档推理</td>
    </tr>
  </tbody>
</table>
<p>
  算一下 KV：\(128\ \text{KiB} \times 10^{5} \approx 12.2\ \text{GiB}\)——单条序列就把一张 24 GB 卡吃掉一半。
  这也解释了为什么「全塞进去」在演示里可行、在生产里很快撞墙。
</p>
<p>
  <strong>工程结论</strong>：默认走 RAG；当问题需要全局归纳（「这批合同的共同风险点是什么」）时，
  用路由把请求交给长上下文；两者共用同一套文档解析与元数据，避免维护两份真相。
</p>
<p>
  长上下文一侧的机制（位置编码外推、KV 预算、注意力下沉）见
  <a href="#m16-long-context">模块 16（长上下文）</a>；本讲只保留 RAG 决策需要的接口：多少 token 时该切、切过去要多花多少钱。
</p>

<h3>5. 上下文工程：把提示当成一种数据结构</h3>
<p>「上下文工程」不是把提示写得更漂亮，而是把上下文当成有布局、有生命周期、有成本的数据结构来设计。</p>
<h4>5.1 前缀缓存：结构决定省钱</h4>
<p>
  现代推理服务会缓存 prompt 前缀的 KV 状态，命中的部分按远低于正常输入的价格计费。
  倍率数字来自服务商文档的实时页面（accessed 2026-10-06；价格与缓存政策会变，做预算前请先打开下面的实时页面核对，不要抄本讲的快照）：
  <a href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching" target="_blank" rel="noopener">Anthropic 的文档</a>给出的倍率是：
  <strong>5 分钟缓存写入 = 基础输入价的 1.25 倍，缓存读取 = 0.1 倍</strong>
  （默认 TTL 5 分钟，另有 1 小时档位，写入 2 倍）；
  <a href="https://developers.openai.com/api/docs/guides/prompt-caching" target="_blank" rel="noopener">OpenAI 的文档</a>同样说明缓存的是前缀的 KV 张量，
  并且<strong>要求整个前缀逐字节一致</strong>才能命中。
</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>缓存什么时候回本</h4>
  <p>设前缀长度为 \(L\)，同样的前缀被复用 \(N\) 次。不缓存的总代价是 \(NL\)；缓存是「写一次 + 读 \(N-1\) 次」：</p>
  \[ C_{\text{cache}} = 1.25L + 0.1L\,(N-1) \]
  <p>令它小于 \(NL\)：</p>
  \[ 1.25 + 0.1(N-1) < N \;\Longrightarrow\; N > 1.28 \]
  <p>
    也就是<strong>从第二次请求开始就回本</strong>。这个结论很实用：只要你的系统提示或固定的 few-shot 足够长
    （通常要求超过服务商的最小可缓存长度），就应该把它放在最前面并且<em>保持稳定</em>。
  </p>
  <p>
    反面同样重要：把用户问题、时间戳、随机 id 混进前缀，会让缓存永远不命中。
    OpenAI 文档还指出，用摘要/压缩（compaction）重写早期上下文会破坏前缀，
    于是缓存命中率下降——「压缩省下的 token」与「缓存丢掉的折扣」必须一起算。
  </p>
</section>
<p>
  与 <a href="#m8">模块 08</a> 的前缀缓存一节对照看：那边讲的是<em>引擎怎么复用 KV</em>，这里讲的是<em>你怎么组织请求让它可复用</em>。
  排序原则只有一条：<strong>稳定内容在前（系统指令、few-shot、固定资料），变化内容在后（本轮检索结果、用户问题）</strong>。
</p>
<h4>5.2 位置、结构化输出与压缩</h4>
<ul>
  <li>
    <strong>位置</strong>：长上下文的两端是「黄金地段」。把指令与问题放在末尾，把最相关的一两块资料放在开头，
    把最不关键的背景放在中间。
  </li>
  <li>
    <strong>结构化输出</strong>：要求模型输出 JSON，字段包含 answer、citations（chunk id 列表）、
    confidence 与 insufficient_context 布尔位。这样引用正确率、拒答率都能被程序统计，
    而不是靠人肉眼读。
  </li>
  <li>
    <strong>压缩</strong>：把不相关的块直接删掉（最有效的压缩），其次才是摘要。
    每多一个无关块，既增加输入成本，也增加干扰（研究上的 U 形曲线正是在说这件事）。
  </li>
  <li>
    <strong>拒答设计</strong>：明确给出「资料不足」是合格答案，并统计拒答率。
    一个从不拒答的 RAG 系统，它的忠实度指标一定是被高估的。
  </li>
</ul>

<h3>6. 成本手算：每问多少钱</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>每问成本公式与一个完整算例</h4>
  <p>设检索 \(k\) 块、每块 \(L_{\text{chunk}}\) token、固定提示与指令 \(L_{\text{prompt}}\) token、回答 \(L_{\text{out}}\) token，输入与输出单价分别为 \(p_{\text{in}}\)、\(p_{\text{out}}\)（美元 / 百万 token）：</p>
  \[ C_{\text{in}} = \frac{(k L_{\text{chunk}} + L_{\text{prompt}})\,p_{\text{in}}}{10^{6}} \]
  \[ C_{\text{query}} = C_{\text{in}} + \frac{L_{\text{out}}\,p_{\text{out}}}{10^{6}} \]
  <p>
    <strong>假设</strong>（请替换成你自己服务商的实时价格）：\(p_{\text{in}} = \$0.15\)、\(p_{\text{out}} = \$0.60\)、
    嵌入单价 \(p_{\text{embed}} = \$0.02\)。语料 100 万 token（200 份文档），\(k = 8\)、\(L_{\text{chunk}} = 400\)、
    \(L_{\text{prompt}} = 350\)、\(L_{\text{out}} = 300\)。
  </p>
  <ul>
    <li>输入 token：\(8 \times 400 + 350 = 3550\)，成本 \(3550 \times 0.15 / 10^{6} = \$0.000533\)。</li>
    <li>输出 token：\(300\)，成本 \(300 \times 0.60 / 10^{6} = \$0.00018\)。</li>
    <li><strong>合计约 \(\$0.00071\) / 问</strong>；每天 1000 问 ≈ <strong>\$0.71 / 天</strong>。</li>
  </ul>
  <p>对照组：不检索、把 100 万 token 全塞进上下文，则每问输入成本 \(10^{6} \times 0.15/10^{6} = \$0.15\)，是 RAG 的约 <strong>211 倍</strong>（而且多数模型的窗口根本放不下）。</p>
  <p>一次性成本：嵌入 100 万 token（用上面的假设单价）约 \(\$0.02\)，向量索引约 4.4 MB。相对持续发生的推理成本，这部分几乎可以忽略。</p>
  <p>
    <strong>还有一个隐性成本是重排</strong>：50 个候选 × 400 token = 2 万 token 经过一个交叉编码器。
    它不按 API 的 token 计价，而是按你自己的算力计价——在 GPU 上是毫秒到几十毫秒级，
    在 CPU 上可能到秒级。<strong>如果你的服务跑在 CPU 上，重排往往是延迟的主因，而不是生成。</strong>
  </p>
</section>
<p>
  把这几个数字放在一起，你会得到一条很实用的决策规则：
  <strong>先用检索把上下文压到几千 token，再考虑要不要重排与长上下文兜底</strong>。
  顺序反了（先上长上下文、再想优化）会让成本结构在早期就锁死。
</p>

<h3>7. 混合检索：把 BM25 与向量真的合起来</h3>
<p>
  第 2.3 节的表里已经写了「混合通常最稳」，但真正动手时你会立刻撞上一个问题：
  <strong>BM25 的分数可以是从 0 到几十的无界值，余弦相似度被限制在 -1 到 1 之间，两者根本不在一个尺度上</strong>。
  直接把分数相加，等于让量纲大的那一路说了算。
</p>
<h4>7.1 三种融合方式与它们的代价</h4>
<table class="tbl small">
  <thead><tr><th>融合方式</th><th>怎么做</th><th>优点</th><th>代价 / 坑</th></tr></thead>
  <tbody>
    <tr>
      <td>分数归一化后加权</td>
      <td>各自做 min-max 或 z-score 归一，再算 \(w_1 s_1 + w_2 s_2\)</td>
      <td>权重可调、结果可解释</td>
      <td>归一化依赖每次查询的候选集，分布一漂移就失效</td>
    </tr>
    <tr>
      <td>倒数排名融合（RRF）</td>
      <td>只用名次：\(\sum_r 1/(\kappa + \mathrm{rank}_r)\)</td>
      <td>不需要两路分数可比；几乎没有超参；对离群分数鲁棒</td>
      <td>丢掉分数的间隔信息（第一名 0.99 与 0.51 被当成一样）</td>
    </tr>
    <tr>
      <td>级联（先稀疏后稠密）</td>
      <td>BM25 先取 top-200，再用向量精排</td>
      <td>便宜、延迟低、实现最少</td>
      <td>被 BM25 漏掉的语义改写永远进不了第二步</td>
    </tr>
  </tbody>
</table>
<p>
  工程默认建议：<strong>先上 RRF 当基线，把它跑出一个数；只有当留出集明确显示某一路更好时，才去调加权融合的权重</strong>。
  这也是「先要一个可信的基线，再谈优化」在检索上的具体形态。
</p>
<h4>7.2 手算一遍 RRF</h4>
<p>同一次查询，两路各返回 3 条，取 \(\kappa = 60\)，名次从 1 开始：</p>
<table class="tbl small">
  <thead><tr><th>块 id</th><th>BM25 名次</th><th>向量名次</th><th>BM25 贡献</th><th>向量贡献</th><th>RRF 合计</th></tr></thead>
  <tbody>
    <tr>
      <td>A</td><td>1</td><td>3</td>
      <td>\(1/61 \approx 0.01639\)</td><td>\(1/63 \approx 0.01587\)</td>
      <td><strong>0.03226</strong></td>
    </tr>
    <tr>
      <td>B</td><td>3</td><td>1</td>
      <td>\(1/63 \approx 0.01587\)</td><td>\(1/61 \approx 0.01639\)</td>
      <td><strong>0.03226</strong></td>
    </tr>
    <tr>
      <td>C</td><td>2</td><td>未命中</td>
      <td>\(1/62 \approx 0.01613\)</td><td>0</td>
      <td>0.01613</td>
    </tr>
  </tbody>
</table>
<p>
  两个结论都很实用：<strong>(1) A 与 B 精确打平</strong>——RRF 只关心名次，所以「两边都靠前」比
  「一路第一、另一路完全没出现」更值钱；<strong>(2) C 虽然 BM25 排第 2，却没有任何融合优势</strong>。
  这解释了 RRF 为什么能压住单路检索的噪声：一个块只有被两路都认可，才能冲到前面。
  反过来说，如果你的查询全是精确串（错误码、型号），两路结果高度重合，RRF 的收益就接近于零——
  这时候省掉向量那一路更快。
</p>
<h4>7.3 开源组件选型：先看许可与形态，再看榜单</h4>
<table class="tbl small">
  <thead><tr><th>组件</th><th>负责哪一步</th><th>形态与许可（量级信息）</th><th>什么时候够用</th></tr></thead>
  <tbody>
    <tr>
      <td>SQLite FTS5</td>
      <td>稀疏检索（内置 bm25() 排名函数）</td>
      <td>C 库，随 Python 标准库分发；SQLite 自 3.9.0（2015-10-14）内置</td>
      <td>语料在百万 token 量级、单机、要零依赖：直接用，不用引入任何服务</td>
    </tr>
    <tr>
      <td>rank_bm25</td>
      <td>纯 Python 的 Okapi BM25</td>
      <td>纯 Python 包，几十行核心逻辑，便于读源码与改公式</td>
      <td>要把 BM25 的参数 \(k_1\)、\(b\) 拿来做实验时</td>
    </tr>
    <tr>
      <td>FAISS</td>
      <td>稠密向量近邻检索</td>
      <td>C++/Python 库，MIT 许可；支持 CPU 与 GPU</td>
      <td>向量超过十万条、且你不想自己写矩阵乘法时</td>
    </tr>
    <tr>
      <td>hnswlib</td>
      <td>近似近邻（HNSW 图索引）</td>
      <td>头文件式 C++ 库 + Python 绑定，Apache-2.0</td>
      <td>要亚线性检索、能接受近似结果与调参（M、ef）时</td>
    </tr>
    <tr>
      <td>sentence-transformers</td>
      <td>本地嵌入与交叉编码重排</td>
      <td>Python 库，Apache-2.0；模型权重可离线下载后本地跑</td>
      <td>需要真正的语义检索，且不接受把语料发到外部服务时</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>选型顺序建议</strong>：先用最小依赖把「召回 + 融合」跑通并量出 Recall@k，
  再按瓶颈换组件——瓶颈在召回就换嵌入与切分，瓶颈在排序就加重排，瓶颈在延迟就先减 \(k\)。
  反过来（先选一个大组件库、再回头看指标）几乎总是把时间花在集成而不是效果上。
</p>

<h3>8. 切分策略与上下文预算：把窗口当表格来分配</h3>
<p>先做一个可复算的对比，这是决定检索上限的一步。</p>
<h4>8.1 手算：固定切分 vs 结构切分</h4>
<p>
  语料 \(N_{\text{tok}} = 10^{6}\)，200 份文档（平均每份 5000 token），每份文档平均 8 个小节。
  方案甲：固定 400 token、重叠 50；方案乙：按小节切分，上限仍为 400 token。
</p>
<table class="tbl small">
  <thead><tr><th>量</th><th>方案甲（固定 400 / 重叠 50）</th><th>方案乙（按小节，上限 400）</th><th>怎么算</th></tr></thead>
  <tbody>
    <tr>
      <td>块数</td>
      <td>\(10^{6}/350 \approx 2857\)</td>
      <td>约 2000–2400（每份 8 节，小节平均 625 token，超 400 的才拆）</td>
      <td>甲按可推进长度，乙按结构单元</td>
    </tr>
    <tr>
      <td>混了两个主题的块</td>
      <td>约 <strong>2300 个</strong></td>
      <td><strong>约 0 个</strong>（边界即切点）</td>
      <td>甲：每份文档约 13 个切点，其中只有约 1/8 落在小节边界上</td>
    </tr>
    <tr>
      <td>首句无法自解释的块</td>
      <td>多（块首常出现「该参数」「上述条件」）</td>
      <td>少（小节首句通常是完整的）</td>
      <td>抽 50 个块，数首句能否独立理解</td>
    </tr>
    <tr>
      <td>索引与候选集体积</td>
      <td>块数多 30%–80%</td>
      <td>块更少、更整齐</td>
      <td>块数是检索分与生成分共同的乘数</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>读法</strong>：方案乙更便宜、主题更干净，但它要求解析器能认出标题层级——
  也就是要求你在第 2 步把文档解析做对。如果只能拿到裸文本，方案甲加 10%–20% 重叠是唯一选择。
  两块的折中「小块检索、大块喂给模型」（小块做索引，命中后送它的父块）在这里特别有用：
  索引用 400 token 保精度，喂给模型的父块约 1600–2000 token 保完整。
</p>
<h4>8.2 手算：一份 8192 token 的预算表</h4>
<p>把窗口当账本：先分配，再检索，而不是检索完了看能不能塞下。</p>
<table class="tbl small">
  <thead><tr><th>区段</th><th>预算</th><th>实际需要</th><th>超预算先砍谁</th><th>理由</th></tr></thead>
  <tbody>
    <tr><td>系统指令（不可压缩区）</td><td>300</td><td>260</td><td>不砍</td><td>引用格式、拒答规则、安全红线要逐字保留</td></tr>
    <tr><td>输出 schema 说明</td><td>400</td><td>380</td><td>不砍</td><td>砍了就无法程序化校验引用与拒答位</td></tr>
    <tr><td>few-shot 示例（稳定前缀）</td><td>1200</td><td>1150</td><td>减到 2 个示例</td><td>它是缓存命中的主体，改动会让前缀失效</td></tr>
    <tr><td>检索资料（\(k\) 块）</td><td>4800</td><td>\(12 \times 400 = 4800\)</td><td>按 RRF 分数从低到高删</td><td>删低分块既省钱又减少干扰，是唯一「越删越好」的部分</td></tr>
    <tr><td>用户问题 + 本轮时间戳</td><td>300</td><td>180</td><td>不砍</td><td>变化内容放最后，不进缓存前缀</td></tr>
    <tr><td>回答预留（输出预算）</td><td>1192</td><td>600–1200</td><td>先压到 600</td><td>预留不足会让回答被截断</td></tr>
    <tr><td>合计</td><td>8192</td><td>约 7370</td><td>—</td><td>留约 10% 余量给 tokenizer 与格式开销</td></tr>
  </tbody>
</table>
<p>
  两个检查点：<strong>(1) 输入侧合计（前五行）不能超过「窗口 − 输出预留」</strong>；
  <strong>(2) 稳定前缀必须逐字节一致</strong>，否则缓存不命中，省下的 token 又从别处花回去。
  按上面这组数，\(k = 12\) 是线上限；如果留出集显示 \(k = 6\) 的端到端正确率与 \(k = 12\) 相同，
  就砍到 6，把省下的 2400 token 换成更好的回答质量或更低的成本。
</p>

<h3>9. 让 RAG 可回归：忠实度、引用支持率与失败模式表</h3>
<p>这一节把第 3 节的四层指标变成一套每周能跑一次、结果可比的检查。</p>
<h4>9.1 手算：忠实度与引用是两个不同的数</h4>
<p>
  对某个问题，模型的回答里有 12 个可判定的论断（claim）：9 个能在给定资料里找到支持，
  2 个资料里完全没有依据，1 个与资料矛盾。回答里标了 10 条引用，其中 8 条确实支持它所在的那一句。
</p>
<ul>
  <li>忠实度（按论断）：\(9/12 = 0.750\)。分母是论断数，不是句子数，也不是 token 数。</li>
  <li>无依据率 \(2/12 = 0.167\)，矛盾率 \(1/12 = 0.083\)。
     矛盾比无依据更严重——它不是没查到，而是读反了，往往对应资料互相冲突（第 2.5 节的去重与冲突处理）。</li>
  <li>引用 id 合法率：\(10/10 = 1.00\)。这是规则可查的：id 是否来自本次上下文。</li>
  <li>引用支持率：\(8/10 = 0.80\)。这需要判定：被引段落是否真的支持该句。</li>
</ul>
<p>
  <strong>关键结论</strong>：只看「引用 id 合法率」，这个系统看起来满分（1.00），
  但忠实度只有 0.75。两个数必须分开报告，否则你会以为问题出在检索，而实际问题在「读得不准」。
</p>
<h4>9.2 失败模式表：症状 → 原因 → 一行验证 → 对策</h4>
<table class="tbl small">
  <thead><tr><th>症状</th><th>最可能的原因</th><th>一行验证</th><th>对策</th></tr></thead>
  <tbody>
    <tr>
      <td>回答里出现资料中没有的编号或数字</td>
      <td>嵌入把精确串压掉了，纯向量检索漏召回</td>
      <td>把该编号当查询词单独跑一次 BM25，看它是否进候选集</td>
      <td>补一路稀疏检索做 RRF；编号类字段另建正排索引</td>
    </tr>
    <tr>
      <td>Recall@5 不低，但答案仍缺关键信息</td>
      <td>关键块被埋在上下文中间；或答案需要跨块合成</td>
      <td>把该块人工移到上下文首位再问一次，看答案是否变对</td>
      <td>重要资料放头尾；小块检索、父块喂模型（第 8.1 节）</td>
    </tr>
    <tr>
      <td>引用 id 全部合法，内容却张冠李戴</td>
      <td>只校验了 id 存在，没校验内容支持关系</td>
      <td>抽 20 条引用，人工判「该段落是否支持该句」</td>
      <td>把引用支持率做成指标；要求逐句标注并做判定式校验</td>
    </tr>
    <tr>
      <td>同一批问题今天对、明天错</td>
      <td>索引或解析变了，或缓存前缀被改动</td>
      <td>记录上下文哈希，比对两次请求的哈希是否一致</td>
      <td>把索引版本、提示版本、模型版本写进每条日志</td>
    </tr>
    <tr>
      <td>从不拒答，任何问题都给一个答案</td>
      <td>缺少「资料不足」的出口，或拒答被当成失败</td>
      <td>故意问一个资料里没有的问题，看它是否回答「资料不足」</td>
      <td>显式允许拒答并统计拒答率；把拒答正确率写进回归集</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>回归集的最小规模</strong>：50 道留出题（每类失败至少 5 道）足以把端到端正确率的噪声压到可比较的量级。
  每题记录 Recall@\(k\)、MRR、忠实度、引用支持率、是否拒答、输入 token、延迟七个数；
  每周只跑这一套，改动前后对比同一批题，才谈得上「优化」。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：最小可用 RAG，并对比「无检索 / 有检索」</h4>
  <p>
    目标：在免费 Colab（CPU 也能跑）上跑通嵌入 + 本地向量检索 + 小模型生成，
    并在留出问题上比较两种模式。全流程不依赖任何向量数据库服务。
  </p>
<pre><code>!pip -q install -U "sentence-transformers" "transformers" numpy torch

import numpy as np, torch
from sentence_transformers import SentenceTransformer

<span class="cm"># [逐行剖析] 1. 加载双塔稠密嵌入模型</span>
model = SentenceTransformer("BAAI/bge-small-en-v1.5")
docs = [
    "Crossfade audio involves smooth transition between two tracks.",
    "Equal power crossfade preserves total RMS acoustic energy.",
    "Linear crossfades cause a perceptible 3dB volume drop in the middle.",
    "Transformer attention computes scaled dot-product over key-value pairs."
]

<span class="cm"># [逐行剖析] 2. 知识库离线向量化与单位球投影归一化</span>
<span class="cm"># 动态形状: doc_emb -> (N_docs, D) = (4, 384) [float32]</span>
doc_emb = model.encode(docs, normalize_embeddings=True)

query = "Why does an audio crossfade dip in loudness?"
<span class="cm"># 动态形状: q_emb -> (1, D) = (1, 384) [float32]</span>
q_emb = model.encode([query], normalize_embeddings=True)

<span class="cm"># [逐行剖析] 3. 欧氏内积即余弦相似度检索</span>
<span class="cm"># 动态形状: scores -> (N_docs,) = (4,) | 矩阵乘法: (1, D) @ (D, N) -> (1, N)</span>
scores = (q_emb @ doc_emb.T)[0]
top_idx = np.argsort(scores)[::-1]

print("Top 检索命中段落:")
for i in top_idx[:2]:
    print(f"得分: {scores[i]:.4f} | 内容: {docs[i]}")</code></pre>
  <p><strong>要产出的一张表</strong>（这是本实验的真正成果，不是代码）：</p>
  <table class="tbl small">
    <thead><tr><th>指标</th><th>无检索</th><th>有检索</th><th>怎么得到</th></tr></thead>
    <tbody>
      <tr><td>答案正确率</td><td>___</td><td>___</td><td>人工或规则判定，逐题记录</td></tr>
      <tr><td>注入上下文后的忠实度</td><td>不适用</td><td>___</td><td>抽查回答里每个论断能否在资料中找到</td></tr>
      <tr><td>Recall@4</td><td>不适用</td><td>___</td><td>gold 来源是否出现在 top-4</td></tr>
      <tr><td>每问输入 token</td><td>___</td><td>___</td><td>直接用 <a href="#m2">模块 02</a> 的 tokenizer 数</td></tr>
      <tr><td>每问成本</td><td>___</td><td>___</td><td>代入第 6 节的成本公式</td></tr>
    </tbody>
  </table>
  <p>
    <strong>最后一步别跳过</strong>：把 20–30 道题做成留出集，
    用 <a href="#m9">模块 09</a> 的<em>配对</em>比较（同一批问题上两个方案的差）来回答「提升是否超过噪声」，
    并报告效应量。只贴两段示例回答不构成结论。
  </p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>30 分钟最小实现：零托管服务的混合检索</h4>
  <p>
    限制条件：只用 Python 标准库加 numpy，不调任何托管 API、不装向量数据库。
    稀疏一路用 SQLite 自带的 FTS5（SQLite 3.9.0 起内置，2015-10-14 发布；FTS5 提供 bm25() 排名函数），
    稠密一路用下面这 10 行哈希向量（零下载、零模型），融合用 RRF。
    这是教学用的下限实现：真实项目里把哈希向量换成 <code>sentence-transformers</code> 等本地模型，
    再把 FTS5 换成 <code>rank_bm25</code> 或自己的倒排索引即可，接口不变。
  </p>
<pre><code><span class="cm"># [逐行剖析] 工业级混合检索下限实现：BM25 词频检索 + 稠密向量 + 互易排名融合 (RRF)</span>
import numpy as np

def rrf(rank_lists, k=60):
    <span class="cm"># 数学机制: RRF_score(d) = sum_{m} 1 / (k + rank_m(d))</span>
    scores = {}
    for r_list in rank_lists:
        for rank, doc_id in enumerate(r_list):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

<span class="cm"># 模拟测试：sparse_rank 为关键词检索排名，dense_rank 为语义向量检索排名</span>
sparse_rank = ["doc_A", "doc_B", "doc_C"]
dense_rank  = ["doc_B", "doc_A", "doc_D"]

fused = rrf([sparse_rank, dense_rank], k=60)
print("RRF 融合综合排序结果:")
for doc, score in fused:
    print(f"文档: {doc} | RRF 融合得分: {score:.5f}")</code></pre>
  <p>
    <strong>要记录的三个数字</strong>（缺一个这次实验就白做）：
    ① 留出 20 题上的 <strong>Recall@5</strong>（gold 块是否进前 5）；
    ② 同一批题的 <strong>MRR</strong>（第一条命中的名次倒数平均）；
    ③ 每次查询的 <strong>最终上下文 token 数</strong>（决定成本上限）。
    先只跑 BM25、再只跑向量、最后跑 RRF，三个数字各记一遍——
    你就能亲眼看到混合检索的收益到底来自哪一路，而不是凭感觉相信「混合一定更好」。
  </p>
  <p>
    最后加一步，把第 9.2 节的表用起来：从 50 道留出题里挑 5 道错得最典型的，
    按「症状 → 一行验证 → 对策」填满，作为你下一次改动的清单。
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>五个最常见的误区</h4>
  <ol>
    <li>
      <strong>把嵌入当成万能。</strong>稠密向量压缩掉的是精确串：错误码、型号、编号、罕见人名。
      对这类查询，BM25 往往直接赢。默认配置应该是混合检索，而不是纯向量。
    </li>
    <li>
      <strong>块切得太碎或太大。</strong>太碎：指代丢失、答案被切成两半，Recall@k 再高也合成不出答案；
      太大：一个块里塞进多个主题，检索分数被稀释，还会把无关内容带进上下文。先用 300–500 token / 重叠 50 做基线，再按失败案例调。
    </li>
    <li>
      <strong>不评估检索就调生成。</strong>先测 Recall@k 与 MRR，再谈提示词。
      如果正确块根本没被捞出来，你后面所有的提示工程都是在优化「如何更好地利用残缺资料」。
    </li>
    <li>
      <strong>把 RAG 当成知识更新的万灵药。</strong>索引更新只解决「资料在不在」，
      解决不了「解析对不对」（表格、扫描件、多栏 PDF 是重灾区）、「权限对不对」（谁可以看哪一块）、
      以及「问题需要跨文档推理」这三件事。
    </li>
    <li>
      <strong>没有日志就没有 RAG 工程。</strong>每次请求至少要记录：
      查询、命中块的 id 与分数、最终送入的上下文哈希、模型输出、引用、延迟、token 数。
      缺了这些，你只能靠猜。
    </li>
  </ol>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◆</span>怎么用在真实项目里</h4>
  <ol>
    <li>
      <strong>第一周只做两件事</strong>：把文档解析干净（保留结构路径与来源 id），建一个 BM25 + 向量的混合检索，
      在 30 道留出问题上量 Recall@5 与 MRR。这一步通常就能暴露 80% 的问题。
    </li>
    <li>
      <strong>按失败类型分层修复</strong>：召回低 → 换切分/加混合/换嵌入；
      排序差 → 加重排；召回好但回答差 → 调位置、缩 \(k\)、加忠实度约束；
      回答好但出处错 → 结构化引用 + 程序校验。
    </li>
    <li>
      <strong>把 \(k\) 当成要调的超参，而不是越大越好。</strong>每加一块，既有成本也有干扰。
      在留出集上画「\(k\) vs 端到端正确率」曲线，你常会看到它在 \(k = 5\) 到 \(10\) 之间见顶。
    </li>
    <li>
      <strong>结构与缓存一起设计。</strong>稳定前缀放最前并保持逐字节一致，变化内容放最后
      （<a href="#m8">模块 08</a> 的前缀缓存机制）。这一条几乎不需要改模型就能省钱。
    </li>
    <li>
      <strong>为「资料不足」设计出口。</strong>明确允许拒答、统计拒答率，
      并在覆盖度不够时提示「需要人工确认」。这比让模型硬答要便宜得多——一次编造的代价远大于一次拒答。
    </li>
  </ol>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>以 crossfade 这类项目为例：值不值，一个明确回答（你以后可以照此判断）</h4>
  <p>
    <strong>结论：值得，但只值得「轻量版」，不值得上一套向量数据库服务。</strong>
    理由可以算。以 crossfade 这类音频建模任务为例，知识面其实很窄：论文笔记、特征与超参对照表、
    失败实验记录，加上以后项目里的代码注释。这些全部加起来通常不到 10 万 token，
    而这类问题是高度重复的（「这个超参在哪个实验里调过」「上次那个爆音的配置是什么」）。
  </p>
  <ul>
    <li>
      <strong>值的部分——可溯源</strong>：音频建模里一次结论往往依赖具体配置，
      「哪份笔记、哪一行、哪次实验」比「一个流畅的回答」重要得多，
      这正是检索相对长上下文与微调的强项（第 1 节的对照表）。
    </li>
    <li>
      <strong>值的部分——精确串召回</strong>：这类任务的语料里满是 <code>lr=3e-4</code>、<code>n_fft=1024</code>、<code>hop=256</code>
      这样的 token，纯向量检索会把它们压掉（第 9.2 节第一行失败模式）；混合检索几乎是零成本的解药。
    </li>
    <li>
      <strong>不值当的部分</strong>：如果语料小于约 3 万 token，或者你反复问的就是同几页资料，
      那直接把全文放进上下文更简单——省掉解析、切分、索引、评估四件事，也就省掉一条要长期维护的管线。
      第 6 节算过：10 万 token 全量塞入约是每问 0.15 美元量级（按该节假设单价）。
      只有当请求量上去、或者语料继续增长时，检索的成本优势才会反超。
    </li>
    <li>
      <strong>明确不要做的</strong>：不要为了「看起来专业」而引入托管向量数据库。
      先用第 7.3 节里 SQLite FTS5 加本地嵌入把 Recall@5 与忠实度测出来；
      只有当索引涨到几百 MB、或需要多用户并发时，才考虑 FAISS、hnswlib 这类专用组件。
    </li>
  </ul>
  <p>
    一句话版本：<strong>以 crossfade 这类任务为例，RAG 的收益是「可溯源 + 精确串召回」，成本是一次性的解析与索引；
    只要以后的问题仍以事实与出处为主，它就值；如果其实是想让模型记住「怎么调参」这类风格偏好，那该去微调，而不是检索。</strong>
  </p>
</section>

<p>
  <strong>术语速查：</strong>
  <span class="t" data-tterm="chunking" data-d="把长文档切成可检索小块的过程，块的大小与重叠直接影响检索上限。">切分</span>、
  <span class="t" data-tterm="bi-encoder" data-d="查询与文档分别编码成向量的双塔模型，可预建索引，检索快但不能细看交互。">双塔编码器</span>、
  <span class="t" data-tterm="cross-encoder reranker" data-d="把查询与候选文档拼在一起过一遍模型来打分，精度高但只能用于重排。">交叉编码重排器</span>、
  <span class="t" data-tterm="hybrid retrieval" data-d="同时用稀疏（BM25）与稠密（向量）检索，再融合结果，通常比单一路线更稳。">混合检索</span>、
  <span class="t" data-tterm="recall@k" data-d="前 k 条结果中包含的相关文档占全部相关文档的比例。">召回率@k</span>、
  <span class="t" data-tterm="faithfulness" data-d="回答中的论断是否都能被给定上下文支持，用于衡量幻觉程度。">忠实度</span>、
  <span class="t" data-tterm="reciprocal rank fusion" data-d="只按名次融合多路检索结果：每路贡献 1 除以（常数 60 加名次），不需要两路分数可比。">倒数排名融合</span>、
  <span class="t" data-tterm="context budget" data-d="把窗口按区段预先分配的账本：系统指令与输出 schema 不可压缩，检索块按分数从低到高先砍。">上下文预算</span>、
  <span class="t" data-tterm="citation support rate" data-d="被引用段落真正支持该句的比例；与 id 合法率是两回事，前者要靠判定式校验。">引用支持率</span>。
</p>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你的检索 Recall@10 = 0.95，但用户经常说答案漏掉了关键信息。最先该查什么？</p>
  <ul class="opts">
    <li>把 k 从 10 加到 20</li>
    <li data-ok>生成端：关键块在上下文中的位置、k 里有几个干扰项、以及忠实度与拒答率</li>
    <li>换一个更大的嵌入模型</li>
    <li>把 chunk 切得更小</li>
  </ul>
  <p class="why">
    召回已经 95%，瓶颈不在「能不能捞到」，而在「捞到之后有没有被正确使用」。
    常见原因是关键块被埋在长上下文的中间（Lost in the Middle 的 U 形效应）、
    或者 \(k\) 太大引入了干扰块。正确做法是分开测检索指标与生成指标。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">关于稀疏检索、稠密检索与重排，下列哪个说法与 BEIR 等实证一致？</p>
  <ul class="opts">
    <li>稠密检索在所有任务上都已经超过 BM25，所以稀疏检索可以淘汰</li>
    <li data-ok>BM25 是稳健的基线，重排与 late-interaction 类模型平均最好但计算昂贵，稠密与稀疏更省算力却常在跨域时落后</li>
    <li>重排模型可以直接替代索引，因为它精度最高</li>
    <li>混合检索一定优于任何单一路线</li>
  </ul>
  <p class="why">
    BEIR（Thakur et al., 2021）在 18 个跨域数据集上得到这个结论：没有免费的午餐。
    DPR 在开放域问答上确实比 BM25 高 9%–19% 绝对值的 top-20 召回，但那是在域内数据上。
    重排无法替代索引——它需要对候选集逐个做前向，成本随候选数线性增长。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">知识库每周更新，团队提议用 LoRA 微调来「把新知识写进模型」。更合理的方案是？</p>
  <ul class="opts">
    <li>每周重新微调一次，保持权重最新</li>
    <li>把全部文档塞进长上下文，不做检索</li>
    <li data-ok>更新检索索引来承载知识，把微调留给输出格式与领域风格这类行为需求</li>
    <li>同时做微调和检索，但只评估微调后的模型</li>
  </ul>
  <p class="why">
    知识（事实、条款、时效内容）适合放在索引里：更新快、可溯源、单次成本低；
    行为（格式、语气、固定流程）才适合放进权重（<a href="#m7">模块 07</a>）。
    全塞长上下文则在成本与「中间遗忘」两个问题上同时吃亏。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">混合检索时，为什么工程上默认推荐 RRF，而不是「把 BM25 分数与余弦相似度加权相加」？</p>
  <ul class="opts">
    <li>因为 RRF 的精度一定更高</li>
    <li data-ok>因为两路分数不在同一尺度上，归一化会随候选集漂移；RRF 只用名次，不要求分数可比</li>
    <li>因为 RRF 的计算量更小</li>
    <li>因为 RRF 能自动学出最优权重</li>
  </ul>
  <p class="why">
    BM25 的分数是无界的词项权重，余弦相似度在 -1 到 1 之间，直接相加等于让量纲大的那一路主导。
    min-max 或 z-score 归一化看起来能解决，但它依赖每次查询的候选集，分布一漂就失效。
    RRF 只用名次，所以稳定；代价是丢掉分数的间隔信息——第 7.2 节的手算里 A 与 B 会精确打平。
    RRF 也不学权重，它的超参只有那个压低名次优势的常数。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">你的检查脚本报告「引用 id 合法率 = 1.00」，但人工抽查发现引用内容经常张冠李戴。这说明：</p>
  <ul class="opts">
    <li>检索没问题，可以直接上线</li>
    <li>应该把结构化引用改成自然语言描述</li>
    <li data-ok>id 合法性只能抓「编造出处」，抓不到「出处存在但内容不支持」，必须单独测引用支持率</li>
    <li>说明嵌入模型选错了</li>
  </ul>
  <p class="why">
    第 9.1 节的手算里，id 合法率 1.00 与支持率 0.80 可以同时存在。
    前者是规则可查的（id 是否来自本次上下文），后者的错误率才是真正的难点，需要判定式校验并人工抽样校准。
    把两个数混成一个「引用准确率」，就会低估风险并把修改方向搞错。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">8192 token 的上下文预算已经超了，按第 8.2 节的优先级，第一件该砍的是什么？</p>
  <ul class="opts">
    <li>系统指令里关于引用格式的那一段</li>
    <li data-ok>RRF 分数最低的那几个检索块</li>
    <li>用户问题本身</li>
    <li>为回答预留的输出预算</li>
  </ul>
  <p class="why">
    可压缩区与不可压缩区要分开：系统指令、输出 schema 与验收标准属于不可压缩区，砍了会让程序化校验失效；
    用户问题和输出预留砍了会让回答变差或被截断。检索块是唯一「越删越好」的部分——
    低分块既是成本也是干扰（第 5.2 节）。若砍完仍超预算，下一步是降低 \(k\) 并重测端到端正确率，而不是继续删指令。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">同事说：「我们的文档只有两万 token，直接全文塞进上下文就行，没必要上 RAG。」这个判断：</p>
  <ul class="opts">
    <li>错误，任何情况都应该上 RAG</li>
    <li data-ok>在语料小、问题重复度高时可以接受；但只要需要稳定出处、语料继续增长或请求量上升，检索的收益就会反超</li>
    <li>正确，因为 RAG 在任何场景下都没有价值</li>
    <li>正确，因为长上下文在准确率上一定优于检索</li>
  </ul>
  <p class="why">
    两万 token 全量塞入的成本与延迟都可接受，解析、切分、索引、评估反而是净值负担——所以这个判断在小语料下是对的。
    但第 1 节的对照表指出：需要出处、语料会更新、或请求量把每问的 token 成本放大时，检索的优势会重新出现。
    资源充足时长上下文的平均表现确实更好（第 4 节的 Li et al., 2024），但那是「资源充足」的前提，不是普适结论。
  </p>
</div>

<div class="acc" data-t="深入：自适应检索与引用评估（Self-RAG 一类的思路）" data-badge="进阶">
  <div class="acc-body">
    <p>
      固定 \(k\) 的 RAG 有一个内在矛盾：<strong>该不该检索、以及检索到的东西够不够用，本来就应该由问题决定</strong>。
      于是出现了一类「自适应」方法，代表工作是 Self-RAG（Asai et al., 2023）：
      模型在生成过程中输出特殊的<em>反思标记</em>，用来决定是否需要检索、检索到的段落是否相关、
      以及自己的输出是否被支持。论文报告它在开放域问答、推理与事实核查任务上超过当时的强基线，
      并<strong>明显改善了长文本生成的忠实度与引用准确率</strong>。
    </p>
    <p>
      它的启发不是「你也要训一个 Self-RAG」，而是<strong>把三件事变成可测的显式决策</strong>：
    </p>
    <ol>
      <li><strong>要不要检索</strong>：闲聊类、纯改写类请求不需要检索；检索了反而是成本与噪声。</li>
      <li><strong>资料够不够</strong>：不够就走长上下文兜底，或要求用户补充信息（对应 Self-Route 的思路）。</li>
      <li><strong>输出来源是什么</strong>：资料、常识、还是推测？要求模型显式区分，引用错误率才可被统计。</li>
    </ol>
    <p>
      <strong>引用质量怎么做自动化评估</strong>（这是最容易被忽略、却最影响信任的一项）：
      要求模型输出结构化引用 <code>[docA-17]</code> 这类稳定 id；
      先用规则检查 id 是否存在、是否来自本次上下文（能抓住「编造出处」）；
      再用一个判定模型检查「被引用的那段是否真的支持这一句」（能抓住「出处存在但张冠李戴」）。
      两项分开报告：前者的错误率应该接近 0，后者才是真正的难点。
    </p>
    <p>
      最后一个诚实的提醒：RAG 的评估成本会随着「层数」上升。
      检索指标可以自动算，忠实度与引用质量通常需要 LLM 判定，
      而 LLM 判定本身有偏差，需要人工抽查校准。经验做法是——
      <strong>用 50–100 道题建立一个小而干净的人工标注集，把它当作校准所有自动指标的锚点</strong>，
      然后在更大的集合上用自动指标做回归监控。这与模块 09 的「先定可检测下限，再谈提升」是同一套方法论。
    </p>
  </div>
</div>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>本模块引用的来源（均已核对原文摘要）</h4>
  <ul>
    <li><a href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener">Lewis et al. (2020) · Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks</a>：RAG 原始论文，参数化 + 非参数化记忆，NeurIPS 2020。</li>
    <li><a href="https://arxiv.org/abs/2004.04906" target="_blank" rel="noopener">Karpukhin et al. (2020) · Dense Passage Retrieval for Open-Domain Question Answering</a>：稠密双塔检索在 top-20 段落召回上比 Lucene-BM25 高 9%–19% 绝对值。</li>
    <li><a href="https://arxiv.org/abs/2104.08663" target="_blank" rel="noopener">Thakur et al. (2021) · BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models</a>：18 个跨域数据集；BM25 是稳健基线；重排与 late-interaction 平均最好但代价高。</li>
    <li><a href="https://arxiv.org/abs/1901.04085" target="_blank" rel="noopener">Nogueira &amp; Cho (2019) · Passage Re-ranking with BERT</a>：交叉编码器重排把 MS MARCO 的 MRR@10 相对此前最好成绩提升 27%。</li>
    <li><a href="https://arxiv.org/abs/2307.03172" target="_blank" rel="noopener">Liu et al. (2023) · Lost in the Middle: How Language Models Use Long Contexts</a>（TACL）：相关信息在开头或结尾时表现最好，在中间时显著下降，长上下文模型亦然。</li>
    <li><a href="https://arxiv.org/abs/2407.16833" target="_blank" rel="noopener">Li et al. (2024) · Retrieval Augmented Generation or Long-Context LLMs? A Comprehensive Study and Hybrid Approach</a>（EMNLP 2024 industry）：资源充足时长上下文平均更好，但 RAG 成本显著更低；提出 Self-Route。</li>
    <li><a href="https://arxiv.org/abs/2309.15217" target="_blank" rel="noopener">Es et al. (2023) · Ragas: Automated Evaluation of Retrieval Augmented Generation</a>：面向忠实度、答案相关性等维度的无参考评估框架。</li>
    <li><a href="https://arxiv.org/abs/2310.11511" target="_blank" rel="noopener">Asai et al. (2023) · Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection</a>：用反思标记实现按需检索，并提升事实性与引用准确率。</li>
    <li><a href="https://arxiv.org/abs/2401.18059" target="_blank" rel="noopener">Sarthi et al. (2024) · RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval</a>：递归聚类摘要树；配合 GPT-4 在 QuALITY 上提升 20% 绝对准确率。</li>
    <li><a href="https://arxiv.org/abs/2210.07316" target="_blank" rel="noopener">Muennighoff et al. (2022) · MTEB: Massive Text Embedding Benchmark</a>：8 类任务、58 个数据集、112 种语言；没有单一嵌入方法在所有任务上占优。</li>
    <li><a href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching" target="_blank" rel="noopener">Anthropic · Prompt caching 文档</a>：5 分钟写入 1.25×、缓存读取 0.1×、1 小时写入 2×，默认 TTL 5 分钟。</li>
    <li><a href="https://developers.openai.com/api/docs/guides/prompt-caching" target="_blank" rel="noopener">OpenAI · Prompt caching 文档</a>：缓存前缀的 KV 张量，前缀必须逐字节一致才能命中；压缩会降低缓存复用。</li>
  </ul>
</section>
`
});
