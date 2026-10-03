/* content/02-tokenization.js — 模块 02：Tokenizer 与数据 */
COURSE.register({
  id: "m2",
  part: 1,
  num: "02",
  title: "Tokenizer 与数据：模型看到的不是文字",
  en: "Tokenization & Data",
  minutes: 30,
  tags: ["核心", "工程", "必做"],
  body: String.raw`
<p class="lead">
  模型从来没有见过「字」。它见到的是整数索引，而整数索引的切法决定了成本、上下文长度、
  甚至某些看起来很蠢的失败。这一模块讲清楚 tokenizer 的算法、特殊 token、以及三种训练数据格式。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    「<code>strawberry</code> 里有几个 r」这类问题，模型经常答错，而它明明能写出一整段正确的代码。
    原因往往不在「推理能力」，而在<strong>切分</strong>：如果 <code>strawberry</code> 被切成一个 token，
    模型要回答「有几个 r」就必须在内部把 token 拆回字母——这是它没有被直接训练过的事。
  </p>
  <p><strong>模型的基本单位是 token，不是字符，也不是词。理解这一点，能解释大量「模型为什么这样」的现象。</strong></p>
</section>

<h3>1. Byte-Pair Encoding：一个贪心的合并算法</h3>
<p>
  主流做法是 <span class="t" data-tterm="BPE" data-d="Byte-Pair Encoding：从字节或字符出发，反复合并语料中出现频率最高的相邻对，直到词表达到目标大小。">BPE</span>。算法本身只有几行：
</p>
<ol>
  <li>把训练语料初始化为<strong>字节序列</strong>（byte-level BPE 保证了任何 Unicode 文本都能被编码，不会出现未知词）。</li>
  <li>统计所有相邻 token 对的频率，把频率最高的一对合并成一个新 token，记录这条合并规则。</li>
  <li>重复第 2 步，直到词表达到目标大小 \(|\mathcal{V}|\)（常见 32k–200k）。</li>
  <li>编码新文本时，按<strong>学到的合并顺序</strong>贪心应用规则。</li>
</ol>
<p>这是纯粹的压缩视角：tokenizer 的目标是在给定词表大小下，让平均每个 token 携带尽量多的信息。</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>三个必须会算的量</h4>
  <dl class="kv">
    <dt>fertility</dt><dd>平均每个词被切成几个 token。英文约 1.3，中文常见 1.5–3（取决于词表）。</dd>
    <dt>压缩率</dt><dd>字符数 / token 数。越高越省上下文与成本；但对模型来说，单个 token 的预测难度变大。</dd>
  </dl>
  <p>上下文长度是<em>以 token 计的</em>，所以它对应的真实文本量是：</p>
  \[ \text{文本量} \approx \frac{\text{context length}}{\text{fertility}} \ \text{个词} \]
  <p>成本同理。若 API 定价为每百万 token \(c\) 元，一段 \(M\) 个词的文本的输入成本约为 \(c \cdot \text{fertility}\cdot M / 10^6\)。
  <strong>中文在按 token 计费的体系里通常更贵</strong>，因为同一语义需要更多 token——这不是价格歧视，而是分词效率差异。</p>
</section>

<h3>2. 词表大小是一场权衡</h3>
<table class="tbl">
  <thead><tr><th>选择</th><th>好处</th><th>代价</th></tr></thead>
  <tbody>
    <tr><td>词表更大（如 200k）</td><td>序列更短 → 上下文里塞更多内容、训练更快</td><td>embedding 与输出层参数变大；稀有 token 训练不充分</td></tr>
    <tr><td>词表更小（如 32k）</td><td>参数省、每个 token 出现更频繁</td><td>序列变长、注意力 \(O(T^2)\) 成本上升</td></tr>
    <tr><td>纯字节（256）</td><td>无未知词、跨语言公平</td><td>序列极长，训练与推理都变慢</td></tr>
  </tbody>
</table>
<div class="flow">
  <div class="nd">原始文本</div><div class="ar">→</div>
  <div class="nd">规范化 (NFKC)</div><div class="ar">→</div>
  <div class="nd hi">BPE 合并规则</div><div class="ar">→</div>
  <div class="nd">token id 序列</div><div class="ar">→</div>
  <div class="nd">embedding 查表</div>
</div>

<h3>3. 特殊 token 与 chat template</h3>
<p>除了自然文本，词表里还有一类<strong>控制 token</strong>，它们决定模型如何区分「谁在说话」：</p>
<table class="tbl small">
  <thead><tr><th>Token</th><th>作用</th><th>容易踩的坑</th></tr></thead>
  <tbody>
    <tr><td><code>&lt;|endoftext|&gt;</code> / <code>&lt;/s&gt;</code></td><td>序列边界、EOS</td><td>忘了在微调数据里加 EOS → 模型不会停</td></tr>
    <tr><td><code>&lt;|im_start|&gt;user</code>（ChatML 风格）</td><td>标注角色</td><td><strong>训练用的模板必须与推理时完全一致</strong>，差一个空格都会掉点</td></tr>
    <tr><td><code>&lt;pad&gt;</code></td><td>对齐批次长度</td><td>很多模型的 pad token 与 eos 相同，需要显式设置，否则 loss 被污染</td></tr>
    <tr><td><code>&lt;tool_call&gt;</code> 等</td><td>结构化输出、函数调用</td><td>解析器与模板必须成对设计</td></tr>
  </tbody>
</table>
<p>
  <span class="t" data-tterm="Chat template" data-d="把 (role, content) 列表渲染成一段字符串的规则，通常存在 tokenizer_config.json 里，可用 apply_chat_template 调用。">chat template</span>
  是 tokenizer 的一部分资产。用 <code>tokenizer.apply_chat_template(messages, tokenize=False)</code> 打印出来看一眼——
  这是排查「微调没效果」最快的一步。
</p>

<h3>4. 三种训练数据格式</h3>
<table class="tbl">
  <thead><tr><th>阶段</th><th>数据形态</th><th>损失怎么算</th></tr></thead>
  <tbody>
    <tr><td>预训练</td><td>连续文本（长序列打包）</td><td>所有位置都算交叉熵</td></tr>
    <tr><td>SFT（指令微调）</td><td><code>messages</code> 角色对话</td><td><strong>只对 assistant 的 token 算损失</strong>（loss mask），否则模型会学着生成用户的提问</td></tr>
    <tr><td>偏好优化（DPO 等）</td><td><code>prompt</code> + <code>chosen</code> + <code>rejected</code></td><td>比较两个完整回答的对数概率差</td></tr>
    <tr><td>RL / GRPO</td><td>只有 <code>prompt</code>，奖励靠规则或模型</td><td>采样多个回答，按奖励加权</td></tr>
  </tbody>
</table>
<p>TRL 对这些格式有明确约定，详见 <a href="https://huggingface.co/docs/trl/dataset_formats" target="_blank" rel="noopener">Dataset Formats</a> 与
<a href="https://huggingface.co/docs/trl/chat_templates" target="_blank" rel="noopener">Chat Templates</a>。看错格式会让 trainer 静默地训练出无用的模型。</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>数据工程里最贵的三件事</h4>
  <ol>
    <li><strong>污染（contamination）</strong>：测试集混进训练集。你的模型在 benchmark 上「变强」了，但真实能力没变。
        做法：对训练集与测试集做 n-gram 重叠检测。</li>
    <li><strong>重复</strong>：同一文档出现多次会让模型背诵它。用 MinHash / SimHash 近似去重，通常能去掉 10%–40%。</li>
    <li><strong>标注质量</strong>：SFT 里一条错误示范的破坏力，远大于十条正确示范的建设力。宁可 500 条干净数据，也不要 5000 条噪声。</li>
  </ol>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：解剖 tokenizer（完整版见附录 B · E2）</h4>
<pre><code>!pip -q install tiktoken transformers

import tiktoken
from transformers import AutoTokenizer

gpt2 = tiktoken.get_encoding("gpt2")
zh = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B")   <span class="cm"># 中文友好型词表</span>

samples = ["strawberry", "Mathematical Crossfade Modelling", "交叉淡入淡出的功率守恒"]
for s in samples:
    a = gpt2.encode(s); b = zh.encode(s)
    print(f"{s!r:45s} gpt2={len(a):3d}  qwen={len(b):3d}  fertility={len(b)/max(1,len(s.split())):.2f}")

<span class="cm"># 看看一个中文句子到底被切成了什么</span>
print([zh.decode([t]) for t in zh.encode("交叉淡入淡出的功率守恒")])</code></pre>
  <p>记录三件事：<strong>同一句话在不同词表下的 token 数</strong>、<strong>切分边界是否对应语义词</strong>、<strong>同一段文本在两种模型下的输入成本差多少</strong>。</p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    你的音频项目不做文本生成，但 Checkpoint 7 需要把音乐特征<strong>离散化或编码</strong>：
    「ΔBPM、调性距离、ΔLUFS、谱通量对比」这四个特征，本质上就是你的「tokenizer」——
    你选择如何表示输入，直接决定了后续模型能学到什么。这也是为什么研究报告里必须写清楚特征定义与归一化方式。
  </p>
</section>

<h3>5. 本模块术语</h3>
<ul>
  <li><span class="t" data-tterm="Tokenizer" data-d="把字符串映射成整数序列（以及反向映射）的组件，词表与合并规则是训练出来的。" >tokenizer</span>、
      <span class="t" data-tterm="Vocabulary size" data-d="词表大小 |V|，决定 embedding 与输出层参数量，通常 32k–200k。">词表大小</span>。</li>
  <li><span class="t" data-tterm="Sequence packing" data-d="把多条短样本拼进一条固定长度序列，减少 padding 浪费，但要注意不能让注意力跨样本泄漏。">序列打包</span>、
      <span class="t" data-tterm="Loss mask" data-d="在损失里屏蔽不属于目标部分的 token（例如用户提问）。">损失掩码</span>。</li>
  <li><span class="t" data-tterm="Chat template" data-d="角色消息到字符串的渲染规则。">chat template</span>、
      <span class="t" data-tterm="Contamination" data-d="测试数据出现在训练集中，导致评估虚高。">数据污染</span>。</li>
</ul>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">把词表从 32k 扩大到 200k，最直接的两个后果是？</p>
  <ul class="opts">
    <li>模型推理变慢，且更容易过拟合</li>
    <li data-ok>同样文本的 token 数减少（上下文能装更多内容），但 embedding/输出层参数变大</li>
    <li>交叉熵一定会上升</li>
    <li>不再需要特殊 token</li>
  </ul>
  <p class="why">
    词表变大 → 平均每个 token 覆盖更多字符 → 序列变短（对 \(O(T^2)\) 的注意力是大好事），
    但 \(|\mathcal{V}| \cdot d\) 的 embedding 与输出投影随之变大，且稀有 token 的梯度稀疏。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">做 SFT 时忘记设置 loss mask（对用户提问也计算损失），会发生什么？</p>
  <ul class="opts">
    <li>没有影响，模型会自动忽略</li>
    <li>训练会直接报错</li>
    <li data-ok>模型会同时学习「生成用户的提问」，表现为自问自答或角色混乱</li>
    <li>只会让损失数值变大，效果不变</li>
  </ul>
  <p class="why">
    损失就是你告诉模型「要模仿什么」。把用户提问也算进去，等于在教它模仿用户。
    正确做法是只在 assistant 片段上计算交叉熵，其余位置置为 -100（PyTorch 的 ignore_index）。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">某 API 按 token 计费。同一段内容，英文 100 词、中文 100 词，中文通常更贵，原因是？</p>
  <ul class="opts">
    <li>中文的 Unicode 编码更长</li>
    <li data-ok>主流词表以英文语料为主训练，中文的 fertility 更高，同一语义需要更多 token</li>
    <li>中文模型更大</li>
    <li>这是厂商的定价策略，与分词无关</li>
  </ul>
  <p class="why">
    token 是计费与上下文的基本单位。BPE 的合并频次统计偏向语料中的语言分布，
    因此在英文占比高的词表上，中文被切得更碎。<em>这也是选模型时要看词表的原因之一。</em>
  </p>
</div>

<div class="acc" data-t="深入：什么时候该自己训练 tokenizer？" data-badge="可选">
  <div class="acc-body">
    <p><strong>该自己训</strong>：领域文本与通用语料分布差异极大（例如只处理 MIDI、蛋白序列、化学式），且你有足够语料（通常 ≥ 数十 GB 或 ≥ 10\(^8\) token）重训整个模型。</p>
    <p><strong>不要自己训</strong>：你只是做微调。一旦更换 tokenizer，预训练模型的 embedding 就全部失效，等于放弃了预训练的一切。</p>
    <p>实践顺序：先用现成 tokenizer 跑通 → 量化 fertility 与成本 → 只有在收益明确（例如序列长度缩短 40%）时才考虑更换。</p>
    <p>工具：<code>tokenizers</code> 库训练 BPE / Unigram；<code>tiktoken</code> 复现 GPT 系列分词；HF Hub 上可对比多个模型对同一段文本的切分。</p>
  </div>
</div>
`
});
