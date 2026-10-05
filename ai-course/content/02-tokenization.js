/* content/02-tokenization.js — 模块 02：Tokenizer 与数据 */
COURSE.register({
  id: "m2",
  part: 1,
  num: "02",
  title: "Tokenizer 与数据：模型看到的不是文字",
  en: "Tokenization & Data",
  minutes: 60,
  tags: ["核心", "工程", "必做"],
  body: String.raw`
<p class="lead">
  模型从来没有见过「字」。它见到的是整数索引，而<strong>整数索引的切法</strong>决定了成本、上下文长度、
  甚至某些看起来很蠢的失败。这一模块从 Unicode 码点开始，一行一行地实现 BPE，
  再解释为什么 LLM 会在拼写、倒序字符串和简单加法上翻车——答案是：<strong>全是 tokenizer 造成的</strong>。
  最后我们把同一套代数搬到音频上，看神经音频编解码器（RVQ）与 BPE 的同构与不等价。
</p>

<h3>0.5 Chat template：同一个回答为什么会被切成不同任务</h3>
<p>
  对话模型收到的不是一组裸消息，而是一段带有特殊 token 的序列。系统消息、用户消息和助手消息的边界会被编码进文本；微调时如果只计算助手部分的 loss，模型学到的是“如何回答”，而不是把用户问题也背成答案。
</p>
<table class="tbl small">
  <thead><tr><th>层</th><th>例子</th><th>错配时的症状</th></tr></thead>
  <tbody>
    <tr><td>消息结构</td><td><code>system → user → assistant</code></td><td>模型把系统说明当成用户问题，角色边界混乱</td></tr>
    <tr><td>特殊 token</td><td><code>&lt;|im_start|&gt;</code> / <code>&lt;|im_end|&gt;</code></td><td>生成停不下来，或把控制标记原样输出</td></tr>
    <tr><td>训练标签</td><td>prompt 标签设为 <code>-100</code>，只计算 assistant loss</td><td>模型复述提示词，训练 loss 看起来下降但回答变差</td></tr>
    <tr><td>推理模板</td><td>训练和部署使用同一套格式</td><td>训练集很好，真实对话一换模板就退化</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：tokenizer 就是「把句子拆成乐高积木」的那把刀——刀口位置不同，
    同样一句话会被拆成不同数量、不同形状的积木。<br />
    <strong>这一讲要建立的直觉</strong>：模型看不见文字，只看见一串整数；而切法决定了成本、上下文长度，甚至模型犯某些「低级错误」的原因。<br />
    <strong>读完你能回答</strong>：为什么同一段中文，在不同模型上「更贵」？为什么 GPT 数不对 strawberry 里的 r？为什么微调时必须让 chat template 与推理时完全一致？为什么「离散化音频」和「分词」是同一件事？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题：三个模型都会犯的「蠢」，其实全是 tokenizer 的账</h4>
  <p>
    「<code>strawberry</code> 里有几个 r」这类问题，模型经常答错，而它明明能写出一整段正确的代码。
    原因往往不在「推理能力」，而在<strong>切分</strong>：如果 <code>strawberry</code> 被切成一个 token，
    模型要回答「有几个 r」就必须在内部把 token 拆回字母——这是它没有被直接训练过的事。
  </p>
  <p>
    Andrej Karpathy 在 2024 年的公开课 <em>Let's build the GPT Tokenizer</em>（配套参考实现 <code>minbpe</code>，约 300 行）
    里把这个机制演示到了极致。同一条 GPT-4 风格的流水线，会同时暴露出三类失败，而它们共享<strong>同一个根因</strong>：
  </p>
  <table class="tbl small">
    <thead><tr><th>失败现象</th><th>tokenizer 层面的真实原因</th><th>能不能靠「更大的模型」修好</th></tr></thead>
    <tbody>
      <tr><td>数不清单词里的字母</td><td>常见整词只占 <strong>1 个 token</strong>，字母级切分从未出现在输入里</td><td>只能靠训练目标去诱导，不能靠算力</td></tr>
      <tr><td>倒放字符串会错</td><td>token 是<strong>不可拆的原子</strong>，转置一个原子的内部字符没有对应的训练信号</td><td>基本不能</td></tr>
      <tr><td>简单加法会错</td><td>数字被<strong>每三位一组</strong>打包，位与位之间的对齐方式被正则固定死</td><td>能改善，但天花板由切分方式决定</td></tr>
      <tr><td>抄不对长串随机 ID</td><td>随机串里没有任何可合并的高频 pair，只能退回逐字节</td><td>不能</td></tr>
    </tbody>
  </table>
  <p><strong>模型的基本单位是 token，不是字符，也不是词。理解这一点，能解释大量「模型为什么这样」的现象。</strong></p>
</section>

<h3>1. 从 Unicode 码点到 UTF-8 字节：模型的字母表是怎么定下来的</h3>
<p>
  BPE 的起点不是字母，也不是字，而是<strong>字节</strong>。但「字节」不是天然存在的东西——
  它是一套编码规则把抽象的码点（code point）变成 0–255 这 256 个值的结果。
  想清楚这一步，后面的 BPE 才不是玄学。
</p>

<h4>1.1 Python 的 str 不是「字符数组」，而是「码点数组」</h4>
<p>
  Unicode 给每个字符分配一个整数，称为<strong>码点</strong>，写成 <code>U+XXXX</code>。
  Python 的 <code>str</code> 是一串码点。你以为「一个字符」，在它眼里可能是<strong>两个码点</strong>：
</p>
<pre><code>&gt;&gt;&gt; len("e\u0301")                  <span class="cm"># e 加上「组合尖音符」，看起来是 é</span>
2
&gt;&gt;&gt; "\u0065\u0301" == "\u00e9"      <span class="cm"># 两个不同的字符串，但打印出来一模一样</span>
False
&gt;&gt;&gt; [hex(ord(c)) for c in "\u00e9"]
['0xe9']
&gt;&gt;&gt; [hex(ord(c)) for c in "\u0915\u094d\u0937"]   <span class="cm"># 天城文的一段字形</span>
['0x915', '0x94d', '0x937']</code></pre>
<p>
  <strong>结论一：码点空间有 1 114 112 个码点，而字节只有 256 个。</strong>
  这就是「未知词（OOV）」问题的来源：如果直接按码点建词表，词表要一百万行，
  而真实语料里绝大多数码点只出现几十次，学到的 embedding 几乎全是噪声。
</p>

<h4>1.2 UTF-8：把码点写成 1 到 4 个字节</h4>
<p>
  UTF-8 的设计目标是<strong>自同步 + 变长</strong>：常用字符短、罕见字符长；
  任何合法序列都不会以延续字节开头，于是可以从任意位置重新对齐（这个性质让丢字节后的恢复成为可能）。
  具体规则只用到三条：
</p>
<ul>
  <li>ASCII 范围（码点小于 \(2^{7}\)）：<strong>1 字节</strong>，字节值直接等于码点值。</li>
  <li>其它范围：码点被切成若干 <strong>6 位一组</strong>，高位用「几个字节就几个 1 开头」的模式标识。</li>
  <li>除首字节外，每段的后续字节都以二进制 <code>10</code> 开头（<code>0x80</code>–<code>0xBF</code>）。</li>
</ul>
\[
\operatorname{bytes}(u)=
\begin{cases}
1, & 0 \le u &lt; 2^{7} \\
2, & 2^{7} \le u &lt; 2^{11} \\
3, & 2^{11} \le u &lt; 2^{16} \\
4, & 2^{16} \le u &lt; 2^{21}
\end{cases}
\]
<p>四个可亲手验证的例子（每一行的数字都能用 <code>len(s.encode("utf-8"))</code> 复算）：</p>
<table class="tbl small">
  <thead><tr><th>字符</th><th>码点</th><th>字节数</th><th>首字节二进制</th><th>延续字节数</th></tr></thead>
  <tbody>
    <tr><td><code>A</code></td><td>U+0041</td><td>1</td><td><code>01000001</code></td><td>0</td></tr>
    <tr><td><code>é</code></td><td>U+00E9</td><td>2</td><td><code>11000011</code></td><td>1</td></tr>
    <tr><td><code>你</code></td><td>U+4F60</td><td>3</td><td><code>11100100</code></td><td>2</td></tr>
    <tr><td><code>🎉</code></td><td>U+1F389</td><td>4</td><td><code>11110000</code></td><td>3</td></tr>
  </tbody>
</table>
<p>
  记住这张表的数字，你会立刻推出一条工程结论：
  <strong>一个汉字至少 3 个字节，一个 emoji 至少 4 个字节。</strong>
  如果词表里没有为它们学出合并规则，它们就各自要付 3–4 个 token。
  <em>中英文在按 token 计费的世界里为什么不同价，源头就在这张表上，不在任何定价策略里。</em>
</p>

<h4>1.3 为什么「从字节出发」是唯一能杜绝未知词的基线</h4>
<p>
  <code>byte-level</code> BPE 的起点是 <strong>UTF-8 字节</strong>（256 个），不是字符。
  好处是<strong>任何 Unicode 文本都能被编码，永远不会出现「未知词」</strong>——
  哪怕是 emoji、罕见汉字、混合脚本，都能拆成字节再合并。
  更强的一点是：它连<strong>任意二进制数据</strong>都能编码——UTF-8 编码器对任何字节串都有定义
  （可能失败的只有反向解码，那时用 <code>errors="replace"</code> 之类兜底）。
  <em>这一点在工程上非常有用：图片、字体、protobuf、乱码片段都可以直接进同一条数据管线。</em>
</p>
<p>
  代价是：一个汉字在 UTF-8 里占 3 个字节，如果不被合并，就会被切成 3 个 token。
  中文模型的中文分词效率，本质上取决于它的词表里合并了多少常用汉字与词组。
  <em>这解释了一个常见现象：同一个开源模型，在中文上「更贵、更短上下文」，根源在词表而不在模型能力。</em>
</p>

<h4>1.4 GPT-2 的一个巧劲：把字节伪装成可打印字符</h4>
<p>
  BPE 需要在「训练语料字符串」上做合并，而原始字节里混着换行、零字节这种没法直接写进文本文件的东西。
  GPT-2 的解法（Radford 等，2019）是一张双射表：把 256 个字节映射到 256 个
  <strong>可打印且非空白</strong>的码点上，于是整个词表可以当普通文本文件存、可以当普通字符串做正则。
  这段代码只有 12 行，值得逐行读：
</p>
<pre><code>def bytes_to_unicode():
    <span class="cm"># [逐行剖析] 第一段：先把「本来就能打印」的字节原样留下</span>
    bs  = list(range(ord("!"), ord("~") + 1))        <span class="cm"># 0x21..0x7E：可见 ASCII</span>
    bs += list(range(ord("\xa1"), ord("\xac") + 1))  <span class="cm"># 0xA1..0xAC：Latin-1 高段</span>
    bs += list(range(ord("\xae"), ord("\xff") + 1))  <span class="cm"># 0xAE..0xFF：Latin-1 其余</span>
    cs = bs[:]          <span class="cm"># [逐行剖析] cs 是「码点」列表，先复制一份做骨架</span>
    <span class="cm"># 第二段：剩下的字节（控制字符、0x7F..0xA0、0xAD）依次映射到 256, 257, ...</span>
    n = 0
    for b in range(2 ** 8):
        if b not in bs:
            bs.append(b)
            cs.append(2 ** 8 + n)   <span class="cm"># 落到 U+0100 之后，永远不与已有码点冲突</span>
            n += 1
    return dict(zip(bs, [chr(c) for c in cs]))</code></pre>
<p>跑一下就能看到三件事（全部可复算）：</p>
<ul>
  <li>表长恰好 <strong>256</strong>，而且是一个双射（每个字节对应唯一码点）。</li>
  <li>空格 <code>0x20</code> 变成 <code>Ġ</code>（U+0120），换行 <code>0x0A</code> 变成 <code>Ċ</code>（U+010A）。
      这就是你会在 Qwen / LLaMA 的 token 里看到「一片 Ġ」的原因——<strong>不是 bug，是设计</strong>。</li>
  <li>映射后所有码点都<strong>大于空格</strong>，也就是<strong>没有一个会变成空格或换行</strong>。这正是它能当普通文本用的原因。</li>
</ul>
<p>
  一个具体结果：字符串 <code>" the café 3.14\n"</code> 经这张表变成
  <code>"ĠtheĠcafÃ©Ġ3.14Ċ"</code>。你在任何 BPE 词表里看到的「乱码」都是这一层，
  它在解码时会原样还原回字节，所以<strong>不损失任何信息</strong>（第 4 节会给这条下证明）。
</p>

<h3>2. BPE 的数学骨架：把它写成一个优化问题</h3>
<p>
  先把符号摆好。<strong>字母表</strong> \(\Sigma=\{0,\dots,255\}\)；<strong>词表</strong> \(\mathcal{V}\)，
  256 个字节永远在里面；<strong>合并规则表</strong> \(M=\big((a_k,b_k)\mapsto c_k\big)_{k=1}^{K}\)，其中 \(c_k=a_k\cdot b_k\) 是拼接。
  词表大小等于 \(256+K\)。
</p>
<p>
  <strong>定义（展开函数）</strong>：\(E:\mathcal{V}\to\Sigma^{*}\)，\(E(x)=x\)（\(x\in\Sigma\)），\(E(c_k)=E(a_k)\,E(b_k)\)。
  这是一个良定义递归——因为 \(a_k,b_k\) 的合并次序都<strong>小于</strong> \(k\)，所以按 \(k\) 归纳即可定义完全部元素。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>目标函数：给定词表预算，最小化总符号数</h4>
  \[
  \min_{\mathcal{V}\,:\,|\mathcal{V}|\le K_{\max}}\ \sum_{i=1}^{N} n_i(\mathcal{V})
  \]
  <p>其中 \(n_i(\mathcal{V})\) 是第 \(i\) 个词被 \(\mathcal{V}\) 切开的段数。换到通信论的记号：</p>
  \[
  R = n_{\text{tok}}\cdot \log_2|\mathcal{V}|, \qquad
  \rho = \frac{B}{n_{\text{tok}}}
  \]
  <p>两式的单位分别是 bit，以及「每个 token 承载多少字节」。</p>
  <p>
    <strong>BPE 的全部故事就是：词表每翻一倍，每个 token 多携带 1 bit（因为 \(\log_{2}|\mathcal{V}|\) 恰好加 1），
    所以总比特 \(R = n_{\mathrm{tok}} \cdot \log_{2}|\mathcal{V}|\) 打平只需要 token 数下降约 \(1 / \log_{2}|\mathcal{V}|\)——
    对 32k–64k 词表（\(\log_{2}|\mathcal{V}|\) 为 15–16）就是约 5–6%，而不是减半。</strong>
    手算验证：记 \(L = \log_{2}|\mathcal{V}|\)，翻倍前后打平要求 \(n'/n = L/(L + 1)\)；
    \(L = 15\) 时 \(15/16 = 0.9375\)，token 数降 6.25% 即回本。
    这是一个可以手算的判据，也是第 7 节词表权衡的判据来源。
    现实里没人用满 256 个码点，所以实践中用「有效词表」估计更准——
    GPT-2 的词表大小 50257 就是这个结构：\(256+50000+1\)，一个特殊 token 加上 5 万条合并。✓
  </p>
</section>

<h4>2.1 训练循环的四行伪代码</h4>
<ol>
  <li>把语料初始化为 <strong>UTF-8 字节序列</strong>，并统计每个「词」的频次 \(f_w\)。</li>
  <li>统计所有相邻 token 对的<strong>加权频次</strong> \(c(p)=\sum_w f_w\cdot \#_p(w)\)，把最高频的 pair 合并成一个新 token，记录规则。</li>
  <li>重复第 2 步，直到词表达到目标，或最高频次掉到 2 以下。</li>
  <li>编码新文本时，按<strong>学到的合并顺序（rank）从小到大</strong>贪心应用规则。</li>
</ol>
<p>第 2 步里那个加权 \(f_w\) 是最容易被漏掉的一环：语料里出现 6 次的 <code>newest</code>，它的每个 pair 至少要贡献 6。</p>

<h4>2.2 手算一次 BPE：四步就能看出它在干什么</h4>
<p>
  教材里最经典的迷你语料是这四个词（数字是出现次数）：<code>low</code>×5、<code>lower</code>×2、
  <code>newest</code>×6、<code>widest</code>×3。每个词先拆成字母，并在词尾加一个结束标记 <code>&lt;/w&gt;</code>。
</p>
<table class="tbl small">
  <thead><tr><th>步骤</th><th>最高频的相邻对</th><th>频次</th><th>合并后新增的 token</th><th>语料里发生的变化</th></tr></thead>
  <tbody>
    <tr><td>初始</td><td>—</td><td>—</td><td>单字母 + <code>&lt;/w&gt;</code></td><td><code>newest</code> → <code>n e w e s t &lt;/w&gt;</code></td></tr>
    <tr><td>1</td><td>(e, s)</td><td>9</td><td><code>es</code></td><td><code>n e w es t &lt;/w&gt;</code></td></tr>
    <tr><td>2</td><td>(es, t)</td><td>9</td><td><code>est</code></td><td><code>n e w est &lt;/w&gt;</code></td></tr>
    <tr><td>3</td><td>(est, <code>&lt;/w&gt;</code>)</td><td>9</td><td><code>est&lt;/w&gt;</code></td><td><code>n e w est&lt;/w&gt;</code></td></tr>
    <tr><td>4</td><td>(l, o)</td><td>7</td><td><code>lo</code></td><td><code>lo w &lt;/w&gt;</code>、<code>lo w e r &lt;/w&gt;</code></td></tr>
  </tbody>
</table>
<p>
  频次从哪来：<code>newest</code> 出现 6 次、<code>widest</code> 出现 3 次，它们的结尾都是 <code>est&lt;/code></code>…，
  所以 <code>(e,s)</code> 一共 9 次。并列最高频时按固定顺序打破平局（真实实现里这一步是确定性的，保证可复现）。
</p>
<p><strong>三个结论：</strong></p>
<ol>
  <li>合并规则是<em>按学习到的顺序</em>贪心应用的，不是按频次重新排序——所以同一个词在不同 tokenizer 下切法不同。</li>
  <li>常见词尾、常见前缀会被合成一个 token，罕见词则被切成多块。这就是为什么英文的 fertility 比中文低。</li>
  <li>真实 tokenizer 的训练语料是几十亿到几万亿字符，但<strong>算法和上面这张表完全一样</strong>。</li>
</ol>

<h4>2.3 出处：这不是为大模型发明的算法</h4>
<p>
  BPE 最早是 Philip Gage 在 1994 年提出的<strong>数据压缩算法</strong>，后来 Sennrich、Haddow 与 Birch
  在 2016 年把它改造成子词切分用于机器翻译
  （<a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noopener">Neural Machine Translation of Rare Words with Subword Units</a>，
  ACL 2016，arXiv:1508.07909）。原论文的核心论证只有一句：
  <em>「BPE 允许用一个固定大小的词表表示开放词表，办法是把每个词表示成一串变长的子词单元。」</em>
  论文报告的收益是英德、英俄翻译上各提升 1.1 与 1.3 BLEU。
</p>
<p>
  同一篇论文还给出一个容易被忽略的结论：<strong>缩小子词词表反而会提升翻译质量</strong>
  （论文表里 C2-50k 的 BLEU 22.2 高于单字母 21.5）。这是「词表不是越大越好」的早期证据，
  到今天依然是选型时最容易被外行推翻的一条。
</p>
<p>
  之后的两步工程化决定了今天的长相：GPT-2（2019）把它改成<strong>字节级</strong>并加上上一节那张双射表；
  OpenAI 在 2022 年开源 <a href="https://github.com/openai/tiktoken" target="_blank" rel="noopener">tiktoken</a>
  作为 GPT 系列的唯一分词实现，它<strong>不存合并规则，而存 base64 编码的 rank 加上起始偏移</strong>——
  这是为了让训练好的词表在 Rust 里毫秒级加载，而不是每次重放几万次合并。
  <em>「学出来的规则」和「上线用的格式」是两件事，这一点在面试里经常被问到。</em>
</p>

<h4>2.4 贪心不是最优：33 比 20 的反例</h4>
<p>
  BPE 是贪心的，而贪心只看得见当前频次，看不见这次合并对<em>后续</em>切分的贡献。
  下面这个反例非常小，用手就能算完，而且它小到<strong>你可以自己完整枚举验证</strong>：
</p>
<table class="tbl small">
  <thead><tr><th>词（频次）</th><th>合并 (a,a) → <code>aa</code>（贪心选的）</th><th>直接新增整词 <code>baaa</code>（最优选的）</th></tr></thead>
  <tbody>
    <tr><td><code>baaa</code> × 9</td><td><code>b</code>, <code>aa</code>, <code>a</code> = 3 段 → 27</td><td>1 段 → 9</td></tr>
    <tr><td><code>aaaa</code> × 2</td><td><code>aa</code>, <code>aa</code> = 2 段 → 4</td><td>4 段 → 8</td></tr>
    <tr><td><code>aaa</code> × 1</td><td><code>aa</code>, <code>a</code> = 2 段 → 2</td><td>3 段 → 3</td></tr>
    <tr><td><strong>总符号数</strong></td><td><strong>33</strong></td><td><strong>20</strong></td></tr>
  </tbody>
</table>
<p>
  两个方案的<strong>词表大小完全一样</strong>，只有合并对象不同，贪心差了 65%。
  原因是 <code>(a,a)</code> 的频次是 26（<code>aaa</code> 贡献 2、<code>aaaa</code> 贡献 6、<code>baaa</code> 贡献 18），
  而 <code>(b,a)</code> 只有 9；但 <code>aa</code> 这三个字符本来就已经压得很好，
  <strong>加一个只覆盖 9 次的 token 却省下 13 个符号</strong>。
  放到真实规模语料里这个差距被摊薄，所以没人去优化它；但作为数学系申请的材料，
  它是极好的例子：<em>局部频次最大的选择，不等于全局总长度最小的选择。</em>
</p>

<h3>3. 从零实现：一个纯 Python 的 BPE 训练器与编码器</h3>
<p>
  下面这三段代码是<strong>可以照抄就能跑</strong>的完整实现（只用标准库 <code>re</code> 与 <code>collections</code>），
  每一步都有 <code># [逐行剖析]</code> 说明它在干什么。把它跑通，你就掌握了 tiktoken 的核心。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手 A · 预分词 + BPE 训练器</h4>
  <p>先解决「切分的单位是什么」：真实实现用 tiktoken 的正则（第 5 节），这里用一个刻意简化的版本，只保留最关键的一条性质——<strong>空格跟着后面的词走</strong>，否则切分就不可逆了。</p>
<pre><code>import re
from collections import Counter

<span class="cm"># ============ 0. 预分词：把字符串切成「词」 ============</span>
PRETOKEN = re.compile(r"\s*[^\W\d_]+|\s*\d+|\s*[^\w\s]|\s+")

def pretokenize(text):
    <span class="cm"># [逐行剖析] 四个分支依次是：单词 / 数字 / 单个标点 / 纯空白串。
    # 每一支都以 \s* 开头，于是「空格被后面的词吃掉」这件事被保留下来 ——
    # 这是 decode(encode(w)) == w 能成立的前提（见第 4 节的往返测试）。</span>
    return [m.group(0) for m in PRETOKEN.finditer(text)]

<span class="cm"># ============ 1. 训练：统计 pair 频次 -&gt; 合并最高频 pair -&gt; 产出 merge 表 ============</span>
def get_stats(ids):
    <span class="cm"># [逐行剖析] ids 是一个词当前被切成符号后的列表，例如 [108, 111, 119]。
    # zip(ids, ids[1:]) 生成的正是所有相邻对 (l,o) 与 (o,w)；
    # Counter 数出每个相邻对在这一个词里出现了多少次。</span>
    return Counter(zip(ids, ids[1:]))

def merge(ids, pair, new_id):
    <span class="cm"># [逐行剖析] 把序列里所有不相交出现的 pair 换成 new_id，其余符号原样保留。
    # 例：ids=[l,o,w], pair=(l,o) -&gt; [new_id, w]。「不相交」指从左到右扫一遍、
    # 命中后 i 直接跳 2。真实实现常用一个「上次命中位置」来保证同样的语义。</span>
    out, i = [], 0
    while i &lt; len(ids):
        if i &lt; len(ids) - 1 and ids[i] == pair[0] and ids[i + 1] == pair[1]:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out

def train_bpe(text, num_merges, log=None):
    <span class="cm"># [逐行剖析] text 是语料字符串；num_merges 是合并次数 = 词表大小 - 256。
    # 返回 merges，元素是 (pair, new_id)，new_id 从 256 开始递增。
    # 传入一个 list 当 log，就能把每一步的 (rank, pair, 频次, new_id) 记下来用于打印。</span>
    words = Counter(pretokenize(text))          <span class="cm"># 语料 -&gt; 每个词出现的次数</span>
    splits = [list(w.encode("utf-8")) for w in words]   <span class="cm"># 起点：每个词先拆成 UTF-8 字节</span>
    freqs = [words[w] for w in words]           <span class="cm"># 频次；两数组始终同长同序</span>
    merges = []
    for i in range(num_merges):
        stats = Counter()
        for seq, f in zip(splits, freqs):       <span class="cm"># 遍历整个语料</span>
            for pair, c in get_stats(seq).items():
                stats[pair] += c * f             <span class="cm"># 在这个词里出现 c 次、词频 f -&gt; 贡献 c*f</span>
        if not stats:
            break
        <span class="cm"># 并列最高频时取「数值上更小的 pair」：确定性是训练可复现的前提。
        # 换成 min(stats, key=stats.get) 也对，但换一种 tie-break 就会得到另一张词表。</span>
        pair = min(stats, key=lambda p: (-stats[p], p))
        if stats[pair] &lt; 2:                    <span class="cm"># 只出现一次的 pair 合并不划算，停止</span>
            break
        new_id = 256 + i                        <span class="cm"># 256 号之上留给「学出来的」token</span>
        splits = [merge(seq, pair, new_id) for seq in splits]   <span class="cm"># 全语料同时替换</span>
        merges.append((pair, new_id))
        if log is not None:
            log.append((i, pair, stats[pair], new_id))
    return merges

<span class="cm"># ---- 跑一遍：下面这段语料与后面那张表严格对应 ----</span>
CORPUS = """
low lower newest widest low lower newest widest low newer
lowest newer widest lower low newest lower lower newest
"""
log = []
merges = train_bpe(CORPUS, 5, log=log)
for rank, pair, freq, nid in log:
    print(rank, pair, freq, nid)</code></pre>
  <p>
    把 <code>text</code> 设成一段含 <code>newest / widest / lower</code> 的小语料、<code>num_merges=5</code>，
    跑出来的合并表会长这样（<strong>可逐行手算复核</strong>）：
  </p>
  <table class="tbl small">
    <thead><tr><th>rank</th><th>被合并的 pair</th><th>频次</th><th>新 token id</th></tr></thead>
    <tbody>
      <tr><td>0</td><td>(w, e)</td><td>12</td><td>256</td></tr>
      <tr><td>1</td><td>(l, o)</td><td>10</td><td>257</td></tr>
      <tr><td>2</td><td>(空格, 257)</td><td>8</td><td>258</td></tr>
      <tr><td>3</td><td>(s, t)</td><td>8</td><td>259</td></tr>
      <tr><td>4</td><td>(256, r)</td><td>7</td><td>260</td></tr>
    </tbody>
  </table>
  <p>
    <strong>请注意 rank 2 那条规则</strong>：<code>(空格, lo)</code> 之所以进得了合并表，
    是因为预分词把 <code>" low"</code> 当成一个整体交给了 BPE。
    <em>如果预分词先把空格切走，这条规则永远不会出现——预分词直接决定了你能不能学到这一条。</em>
    这是理解第 5 节的钥匙。
  </p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手 B · 编码器（推理时真正跑的那个循环）</h4>
  <p>
    编码器比训练器短，但有一个<strong>极易写错</strong>的地方：<strong>必须按 rank 从小到大套用规则</strong>，
    而不是「反复找当前频次最高」——推理时没有语料，也没有频次。
  </p>
<pre><code>def encode(text, merges):
    <span class="cm"># [逐行剖析] 训练产物 -&gt; 两张查找表：pair -&gt; rank（第几次合并），pair -&gt; 新 id。
    # 这两张表就是「模型上线时唯一需要的 tokenizer 参数」。</span>
    ranks = {pair: r for r, (pair, _) in enumerate(merges)}
    ids_of = {pair: nid for pair, nid in merges}
    out = []
    for word in pretokenize(text):              <span class="cm"># 每个预分词片段独立编码</span>
        ids = list(word.encode("utf-8"))        <span class="cm"># 每个片段的起点都是它的字节</span>
        while len(ids) &gt; 1:                   <span class="cm"># 只要还有一条规则能套上就继续</span>
            best, at = None, None               <span class="cm"># best = 当前可用规则里最小的 rank</span>
            for i in range(len(ids) - 1):
                r = ranks.get((ids[i], ids[i + 1]))
                if r is not None and (best is None or r &lt; best):
                    best, at = r, i
            if at is None:                      <span class="cm"># 一条规则都套不上，切分到此为止</span>
                break
            <span class="cm"># 套用：把 (ids[at], ids[at+1]) 换成合并后的 id。</span>
            ids = ids[:at] + [ids_of[(ids[at], ids[at + 1])]] + ids[at + 2:]
        out.extend(ids)
    return out</code></pre>
  <p>
    拿上一节的合并表去编码 <code>"newest"</code>，你会看到 <strong>rank 0 → rank 3</strong> 这样跳过 rank 1、2 的序列。
    <em>跳过不是 bug</em>：rank 1 是 (l, o)，rank 2 是 (空格, lo)，这两个词里根本没有对应符号。
    推理时按 rank 递增扫一遍，而不是从最小 rank 开始一条条全试，是把复杂度从
    \(O(K\cdot T)\) 降到接近 \(O(T\log T)\) 的关键。
  </p>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手 C · 解码器与往返测试（唯一真正重要的契约）</h4>
<pre><code>def decode(ids, merges):
    <span class="cm"># [逐行剖析] 解码只有一行数学内容：每个 token 展开成它当初对应的字节串。
    # 单字节 token 展开就是它自己；合并产生的 token 展开成两个老 token 的拼接。
    # 注意顺序：必须按合并发生的先后次序建表，所以 merges 天然是有序的。</span>
    table = {i: bytes([i]) for i in range(256)}
    for (a, b), nid in merges:
        table[nid] = table[a] + table[b]
    return b"".join(table[i] for i in ids).decode("utf-8")

<span class="cm"># ---- 往返测试：这是 tokenizer 唯一真正重要的验收标准 ----</span>
tests = ["newest", " low lower", "hello world", "\u4f60\u597d\u4e16\u754c",
         "\U0001f389 emoji", "na\u00efve caf\u00e9", "1234567890",
         "", " ", "\n\n", "\t\t"]
ok = all(decode(encode(t, merges), merges) == t for t in tests)
print("round-trip lossless:", ok)</code></pre>
  <p>
    这一行测试里有几个<strong>专门挑出来的坑</strong>，它们对应真实工程里出现过的 bug：
  </p>
  <ul>
    <li><strong>空串与纯空白</strong>：如果预分词把空格丢了，这里立刻失败（我第一版就踩了）。
        顺带一提，<code>na\u00efve caf\u00e9</code> 里的 <code>é</code> 占 2 个字节，
        会暴露任何「按字符而不是按字节切」的 bug。</li>
    <li><strong>emoji</strong>：4 个字节，暴露任何「按 16 位单元切」的假设。</li>
  </ul>
  <p>
    <strong>要记录的三个数字</strong>：① 训练后词表大小；② 一段固定测试文本的
    <code>bytes/token</code>；③ 往返测试是否全绿。第三个数字是一票否决项。
  </p>
</section>

<h3>4. 无损性：一条等式与三个定理</h3>
<p>
  「BPE 是无损的」这句话很容易被当成口号，但它其实可以被<strong>证明</strong>，而且核心证明只有两行。
  这一节是本模块最值得你写进申请材料的部分。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>定理 1（拼接保持性）：合并不改变字节串</h4>
  <p>先定义一个记号：对任意符号序列，令</p>
  \[
  S(x_1,\dots,x_n) \;:=\; E(x_1)\,E(x_2)\cdots E(x_n)
  \]
  <p>也就是「把每个符号展开后依次拼起来」（\(\Vert\) 表示拼接）。核心等式只有一行：</p>
  \[
  E(c_k) = E(a_k)\,E(b_k) \qquad\Longrightarrow\qquad
  S(t_1,\dots,t_n) = S(s_1,\dots,s_m)
  \]
  <p>
    <strong>证明</strong>：一次合并把相邻的 \((a_k,b_k)\) 换成 \(c_k\)，
    而 \(S\) 只看拼接结果，由 \(E(c_k)=E(a_k)E(b_k)\) 知 \(S\) 的值不变。对合并总步数归纳即可。∎
  </p>
  <p>
    <strong>推论（往返无损）</strong>：对任意 \(w\in\Sigma^{*}\)，\(\mathrm{Decode}(\mathrm{Encode}(w))=w\)。
    因为解码就是逐个 token 取 \(E\) 再拼起来，也就是对编码结果取 \(S\)；
    而上面那条等式说 \(S\) 在整个编码过程中保持不变，于是解码结果就是 \(S(w)=E(w)=w\)。∎
  </p>
  <p>
    请注意这条定理<strong>不需要任何额外假设</strong>：不管合并规则怎么设计、不管 tie-break 怎么定、
    不管训练语料多大。所以「BPE 一定无损」是<strong>结构性的</strong>，不是经验现象。
    实验室里的往返测试，只是在验证实现是否忠实于这个结构。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>定理 2（不动点）：编码结束后没有规则还能用</h4>
  <p>
    <strong>问题</strong>：按 rank 递增依次套用规则，会不会出现「后一条规则制造出一个前一条规则的形状」，
    导致必须回头再扫一遍？答案是不会。
  </p>
  <p>
    <strong>证明</strong>：记规则 \(j\) 产生的 token 的 rank 为 \(j\)，其两个子 token 的 rank 都<strong>小于</strong> \(j\)
    （这是 BPE 训练的定义）。设规则 \(i\) 已经套用不动。此后若执行规则 \(j\)（其中 \(j&gt;i\)），
    被新造出来的 token 的 rank 是 \(j\)，所以任何<em>新产生</em>的相邻对至少含一个 rank 为 \(j\) 的符号；
    而规则 \(i\) 的两个子 token 的 rank 都小于 \(i\)，也就小于 \(j\)，
    因此新对<strong>不可能</strong>匹配规则 \(i\)。于是规则 \(i\) 一旦套用不动就永远不动。对 \(i\) 归纳，
    得最终序列对所有规则都不动。∎
  </p>
  <p>
    <strong>这个引理的实际价值</strong>：它保证了「按 rank 递增扫一遍」是<strong>充分</strong>的算法，
    因此 tiktoken 与 HF 的实现可以写成一遍循环，而不需要「反复扫到不动点」。
    <em>一个性能优化能挂在一条两行的证明上，这是工程与数学交汇的好例子。</em>
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>引理 3（基数障碍）：为什么 BPE 能无损、RVQ 一定有损</h4>
  <p>这是本模块最漂亮的一条，也是你能在面试里直接用的一条。</p>
  <p>
    <strong>引理</strong>：设 \(X\) 是不可数集，\(\mathcal{C}\) 是有限字母表。则<strong>不存在</strong>单射
    \(f:X\to\mathcal{C}^{*}\)。
  </p>
  <p>
    <strong>证明</strong>：令 \(\mathcal{C}^{\le n}=\bigcup_{k\le n}\mathcal{C}^{k}\)，它有限。
    若 \(f\) 是单射，则 \(f^{-1}(\mathcal{C}^{\le n})\) 有限。于是
    \(X=\bigcup_{n\ge0}f^{-1}(\mathcal{C}^{\le n})\) 是可数个有限集的可数并，仍可数，与 \(X\) 不可数矛盾。∎
  </p>
  <p>
    <strong>换率失真的语言再说一遍（工程上真正用的版本）</strong>：
    基数论证只说了“精确还原不可能”，但工程师要的是定量 trade-off——
    这正是香农率失真理论回答的：对连续信源，任何有限码率 \(R\) 的编码都有大于零的失真下界 \(D(R) > 0\)，
    码率越低，失真下界越高。EnCodec 的 6 kbps 档听起来像电话音质而不是透明音质，
    不是码本没训好，而是 \(R = 6\) kbps 处的 \(D(R)\) 就摆在那里。
    文本 BPE 没有这一项：离散可数输入在有限码率下可以达到 \(D = 0\)（定理 1 的构造性证明）。
    所以选型时不要问“音频 codec 为什么不能无损”，要问“这个码率对应的失真我能不能接受”。
  </p>
  <p>
    <strong>推论</strong>：文本的输入空间 \(\Sigma^{*}\) 在 \(\Sigma\) 有限时是<strong>可数</strong>集，
    所以存在到某个有限码的单射——而且 BPE 的合并表就是一个<strong>显式构造</strong>。
    而音频波形所在的空间不可数，所以任何「有限码本 + 有限索引序列」的方案<strong>必然</strong>丢掉信息。∎
  </p>
  <p>
    把这条引理和第 10 节连起来看，结论会很锋利：
    <strong>「tokenizer 无损」不是实现得好，而是输入空间可数带来的必然；
    音频 codec 有损也不是工程没做好，而是输入空间不可数的必然。</strong>
    两者的差别在数学里，不在代码里。
  </p>
</section>

<h4>4.1 启发式思考题与证明题（自己动手，不要先看解析）</h4>
<ol>
  <li><strong>（证明）</strong>用定理 1 的等式，严格写出 \(\mathrm{Decode}(\mathrm{Encode}(w))=w\) 的推导，
      并指出哪一步用到了 merges 的<strong>有序性</strong>。</li>
  <li><strong>（证明）</strong>把定理 2 的「不动点」结论反过来用：如果编码后的序列里还剩一条规则可用，
      说明实现里至少有一处错了。请给出三种可能的原因。</li>
  <li><strong>（构造）</strong>把第 2.4 节的反例从「1 次合并」推广到「\(n\) 次合并」：
      设计一个语料，使贪心与最优的总符号数差距随 \(n\) 增长，并给出增长率。</li>
  <li><strong>（证明）</strong>引理 3 的结论可以加强：若额外要求「每个输入的编码长度有上界」，
      证明此时 \(X\) 必须是至多可数集。提示：直接数长度不超过某个定长的码字有多少个。</li>
  <li><strong>（估算）</strong>预分词正则规定一个数字 token 最多 3 位（第 5 节）。
      由此推出：\(N\) 位十进制数字串至少需要 \(\lceil N/3\rceil\) 个 token。
      在 32 768 的上下文里，最多能塞进多少位纯数字？</li>
  <li><strong>（思辨）</strong>如果把模型词表里的「草莓」「strawberry」这类整词 token 删掉，
      按你的推理，字母计数任务会变好还是变坏？给出<strong>两个方向相反的</strong>理由。</li>
</ol>

<h3>5. 预分词正则：tiktoken 与 GPT-4 的那条关键边界</h3>
<p>
  BPE 只在<strong>预分词片段内部</strong>做合并。片段的边界由一条正则表达式决定，
  而这条正则的每一条分支都对应一个工程决策。下面是 GPT-4 系列（<code>cl100k_base</code>）实际使用的模式：
</p>
<pre><code>(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+</code></pre>
<p>
  <strong>怎么读它</strong>：竖线是「或」，<strong>从左到右第一个能匹配上的分支获胜</strong>（正则的优先级规则，
  不是「最长匹配」）。所以分支的<em>顺序</em>本身携带信息，这一点是最容易看漏的。
  <code>\p{L}</code> 是 Unicode 的「字母」类，<code>\p{N}</code> 是「数字」类。
</p>

<h4>5.1 五个数字，说明为什么必须先切</h4>
<p>下面每一行都是把上面那条正则真正跑一遍得到的切分结果，可以自己复核：</p>
<table class="tbl small">
  <thead><tr><th>输入</th><th>切分结果</th><th>片段数 / 字符数</th><th>为什么这么切</th></tr></thead>
  <tbody>
    <tr><td><code> strawberry</code></td><td><code>[" strawberry"]</code></td><td>1 / 11</td><td>空格被字母分支的前缀位吃掉，整词一个片段</td></tr>
    <tr><td><code> 1234567890</code></td><td><code>[" ", "123", "456", "789", "0"]</code></td><td>5 / 11</td><td><strong>数字分支最多收 3 位</strong></td></tr>
    <tr><td><code>x = 3.14159;</code></td><td><code>["x"," ="," ","3",".","141","59",";"]</code></td><td>8 / 12</td><td>小数点两侧的数字各自成段</td></tr>
    <tr><td><code>I'm not</code></td><td><code>["I","'m"," not"]</code></td><td>3 / 7</td><td>缩写分支<strong>排在第一位</strong></td></tr>
    <tr><td><code>  \n  indented</code></td><td><code>["  \n"," "," indented"]</code></td><td>3 / 13</td><td>缩进与换行归一段，最后一个空格归后词</td></tr>
  </tbody>
</table>
<p>
  <strong>为什么数字要限死 3 位？</strong>这是 OpenAI 公开说明过的设计：让模型学到的数字 token
  <strong>从右对齐、按 3 位一组</strong>，从而至少能表示完整的三位数与千分位。
  副作用同样重要——<strong>模型永远学不到「一个 token 是一整串长数字」这件事</strong>，
  所以它对数字没有位置感，倒序一串数字会立刻崩掉。第 6 节会回到这个机制。
</p>

<h4>5.2 正则的数学本质：它定义了七个正则语言的并</h4>
<p>
  把它读成一个生成器，每一支都是一个正则语言，整条模式定义了语言
  \(L=L_1\cup L_2\cup\cdots\cup L_7\)；预分词就是把 \(\Sigma^{*}\) 切成 \(L\) 的句子，
  BPE 再在每个句子里独立压缩。三个设计不变量可以直接从模式上读出来：
</p>
<ol>
  <li><strong>有界数字</strong>：数字分支最多吃 3 位，于是一个片段至多携带 3 位十进制数字，
      「位数」与「位置」的对应关系是<strong>全局固定</strong>的。</li>
  <li><strong>空格与后词同生</strong>（第 2 支的前缀 <code>[^\r\n\p{L}\p{N}]?</code>）：
      空格不单独成 token，而是粘在后面的词上，<strong>保证「前导空格」这个信息不会丢</strong>，
      这是 GPT-2 的 Ġ 能工作的前提。</li>
  <li><strong>字母与数字不跨界</strong>：字母分支只吃字母类，数字分支只吃数字类，
      于是 <code>abc123</code> 永远被切成两个片段——这条不变量防止了跨类别的合并，
      是词表不会退化成「任意字节对」的关键。</li>
</ol>

<h4>5.3 边界处理：四支各管什么，以及那条最精细的前瞻</h4>
<ul>
  <li><strong>缩写分支放第一位</strong>：<code>(?i:'s|'t|'re|'ve|'m|'ll|'d)</code>。
      如果它排在后面，<code>'m</code> 会被标点分支当成独立标点，缩进与换行也就学不成一个 token。</li>
  <li><strong>\(\s*[\r\n]+\)</strong>：把缩进和换行绑成一段，所以代码块的缩进 token 是稳定的。</li>
  <li><strong>\(\ ?[^\s\p{L}\p{N}]+[\r\n]*\)</strong>：标点（及其后的换行）成段。
      注意它前面那个<strong>可选空格</strong>——这就是 <code>" ="</code> 成为一个片段的原因。</li>
  <li><strong>\(\s+(?!\S)\) 是整条模式里最精细的一处</strong>：
      <code>(?!\S)</code> 是负向前瞻，意思是「后面不能再接非空白」。
      当它出现在词前那串空白中间时，贪婪匹配失败后回溯，于是<strong>它刻意只吃到最后两个空格中的前一个</strong>，
      把<strong>最后一个空格留给下一个片段</strong>去粘词。
      构造输入 <code>"a b"</code> 与 <code>"a  b"</code>（一个空格、两个空格）对照就能验证：
      前者得到 <code>["a"," b"]</code>，后者得到 <code>["a"," "," b"]</code>——
      <strong>多出来的那个空格之所以被单独吐出来，就是为了把它粘到后面的词上</strong>。
      如果去掉这层前瞻，GPT-2 早期的 <code>" the"</code> 这类 token 就<strong>永远学不出来</strong>——
      这也是后来的词表要改版的原因之一。</li>
</ul>

<h3>6. 为什么 LLM 会在拼写、倒序、加法上犯傻</h3>
<p>
  现在可以把三个著名的失败统一起来解释。共同结构是：
  <strong>任务需要「在 token 内部操作」，而 tokenizer 把 token 定义成了不可拆的原子。</strong>
</p>

<h4>6.1 拼写与字母计数</h4>
<p>
  <code>" strawberry"</code> 在预分词阶段就是<strong>一个片段</strong>（见 5.1 的表），
  而在 GPT-4 系列的词表里它通常也确实是<strong>一个 token</strong>。
  于是模型在做「数 r」这个任务时，面前只有一个向量——
  它<strong>没有任何输入信号</strong>能告诉你这个向量里有几个 r。
</p>
<p>
  更精确地说，这类任务需要模型额外做一件事：<strong>把 token 展开回字母</strong>。
  而自回归预训练的目标函数里从来没有直接监督过这个展开动作。
  模型只能靠权重里被间接压进去的记忆来猜——而记忆很容易被反向的拼写、
  罕见的元音组合带偏。GPT-2 与 GPT-3 在这类任务上错得最厉害，GPT-4 大幅改善，
  但机制没变：<em>它仍然是猜，只是猜得更准。</em>
</p>

<h4>6.2 倒放字符串</h4>
<p>
  倒放要求模型在<strong>位置之间搬运字符</strong>。但搬运的单位是 token，
  而 token 的粒度远大于字符，且词内切分点<strong>依赖原文内容</strong>：
  <code>abcde</code> 反过来是 <code>edcba</code>，两者的切分点通常不同。
  模型必须先「拆」再「重排」，而训练分布里几乎没有「把一个词反过来输出」这种文本。
</p>
<p>
  最有说服力的单一证据是<strong>长度阈值现象</strong>：模型往往能正确处理 3–4 个字母的短串，
  稍长一点就开始崩。一个常见解释是——短串常被切成单字节或双字节 token，
  字母级信息<strong>确实还在输入里</strong>；长串被压成整词 token，字母信息<strong>从输入里消失了</strong>。
  <em>如果你要在论文里写这一段，这个现象比任何论证都有力，因为它能被你自己的实验复现。</em>
</p>

<h4>6.3 简单算术</h4>
<p>算术的失败有<strong>两层</strong>原因，而 tokenizer 只占第一层：</p>
<ol>
  <li><strong>表示层（tokenizer 的锅）</strong>：数字被<strong>每三位一组</strong>切分，且从右对齐。
      「123」是一个 token，而「1234」是 <code>["123","4"]</code>——
      也就是说<strong>个位在不同 token 里的相对位置并不一致</strong>。
      加法的进位本质上是「跨 token 边界对齐位」，而边界的语义被正则固定死了。</li>
  <li><strong>算法层（模型的锅）</strong>：即使表示完美，模型仍需学会一个<strong>逐位循环</strong>算法，
      而 Transformer 的一次前向是<strong>全体位置并行</strong>的——它天然擅长并行，
      不擅长「第 \(i\) 位依赖第 \(i-1\) 位的进位」这种串行依赖。</li>
</ol>
<p>
  实践结论很实际：<strong>不要让 LLM 做长数字串的精确算术</strong>，改用工具（Python、计算器 API）；
  也不要指望模型精确数出自己输出了多少 token——那是同一类问题的文本版本。
  <em>在工程上，tokenizer 与上下文长度的关系比模型能力更早成为瓶颈，这一点在成本模型里已经反复出现。</em>
</p>

<h4>6.4 什么时候这些「蠢问题」反而问得动</h4>
<p>反过来，有几类任务 tokenizer <strong>不是</strong>障碍，别一概而论：</p>
<ul>
  <li><strong>不需要字母内部信息的任务</strong>：语义检索、主题分类、把一句话压成向量。</li>
  <li><strong>罕见词的长尾</strong>：字节级兜底让生僻人名、专业术语仍可拼出（虽然费 token）。
      这正是 Sennrich 2016 那篇论文的原始目标。</li>
  <li><strong>代码与数学符号</strong>：代码的 token 密度高，因为缩进、括号、标识符后缀都是高度重复的短模式。</li>
</ul>

<h3>7. 词表大小是一场权衡</h3>
<table class="tbl">
  <thead><tr><th>选择</th><th>好处</th><th>代价</th></tr></thead>
  <tbody>
    <tr><td>词表更大（如 200k）</td><td>序列更短 → 上下文里塞更多内容、训练更快</td><td>embedding 与输出层参数变大；稀有 token 训练不充分</td></tr>
    <tr><td>词表更小（如 32k）</td><td>参数省、每个 token 出现更频繁</td><td>序列变长、注意力 \(O(T^2)\) 成本上升</td></tr>
    <tr><td>纯字节（256）</td><td>无未知词、跨语言公平</td><td>序列极长，训练与推理都变慢</td></tr>
  </tbody>
</table>
<p>
  词表大小直接决定 embedding 与输出层的参数量：不共享权重时约为 \(2\cdot|\mathcal{V}|\cdot d\)。
  取隐藏维度 4096，词表从 32k 到 200k，这两项从约 2.6 亿增到约 16 亿——
  <strong>差不多是 7B 模型参数的 4% 到 23%</strong>。这个量级值得在成本表里单列一行。
</p>

<h4>7.1 手算一次 fertility：fertility 是唯一需要记住的数</h4>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>定义与公式</h4>
  <p>
    定义 <strong>fertility</strong>：一个词（或一个字符）被切成多少个 token。
    它是连接「文本长度」与「计费 / 上下文长度」的<strong>唯一换算系数</strong>。
    对一段含 \(w\) 个词、总字符数 \(c\)、token 数为 \(T\) 的文本：
  </p>
  \[
  \mathrm{fert}_{\text{word}} = \frac{T}{w}, \qquad
  \mathrm{fert}_{\text{char}} = \frac{T}{c}, \qquad
  \mathrm{cost} = \frac{T}{10^{6}} \cdot p
  \]
  <p><strong>读法</strong>：成本 = token 数 ÷ 一百万 × 单价；而 token 数 = 词数 × 每词的 token 数（fertility）。</p>
  <p>
    取实测值：英文网页文本约 0.25 token/字符（约 4 字节/token），
    中文在中文友好词表上约 0.6–0.8，在英文为主的 GPT-2 词表上常达 1.5–2.2。
    于是<strong>同样一段意思，中文在英文为主的词表上可能贵 2–4 倍</strong>——不是定价歧视，是切分效率差。
  </p>
  <p>
    上下文同理，换算式只有一条：<em>能装的字符数 = 窗口 token 数 ÷ 每字符 token 数</em>。
    取一个 128k 的窗口，三种情形分别是：
  </p>
  <table class="tbl small">
    <thead><tr><th>语种与词表</th><th>每字符 token 数</th><th>128k 能装多少字符</th><th>折算成英文 token 约等于</th></tr></thead>
    <tbody>
      <tr><td>英文（GPT-4 / Qwen 类）</td><td>0.25</td><td>约 51 万</td><td><strong>128k</strong>（基准）</td></tr>
      <tr><td>中文（中文友好词表）</td><td>0.7</td><td>约 18 万</td><td>约 46k</td></tr>
      <tr><td>中文（英文为主的 GPT-2 类词表）</td><td>2.0</td><td>约 6.4 万</td><td><strong>约 16k，不到 128k 的八分之一</strong></td></tr>
    </tbody>
  </table>
  <p>
    <strong>这张表要带走一句</strong>：标称「128k 上下文」在中文上可能只值英文的十几分之一。
    这是<em>纯词表问题</em>，与模型能力无关，而它正是选型时最容易被忽略、也最容易在申请材料里加分的一个换算。
  </p>
  <p>
    <strong>再算一笔 3 倍变 9 倍的账</strong>：取一万个汉字，在中文友好词表（0.6 token/字）下是 6k token，
    在英文为主的词表（1.8 token/字）下是 18k token——长度差 3 倍。
    但注意力计算量是 \(O(T^2)\) 的，\(3^2 = 9\)，于是这 3 倍长度带来 <strong>9 倍的注意力 FLOPs</strong>、
    3 倍的 KV cache 显存、3 倍的按 token 计费。
  </p>
  <table class="tbl small">
    <thead><tr><th>情形（1 万汉字）</th><th>token 数</th><th>注意力计算量</th><th>KV 显存</th><th>计费</th></tr></thead>
    <tbody>
      <tr><td>中文友好词表（0.6/字）</td><td>6k（基准）</td><td>1 倍（基准）</td><td>1 倍（基准）</td><td>1 倍</td></tr>
      <tr><td>英文为主词表（1.8/字）</td><td>18k（3 倍）</td><td>约 9 倍</td><td>约 3 倍</td><td>约 3 倍</td></tr>
    </tbody>
  </table>
  <p>
    <strong>KV payoff</strong>：KV cache 字节数与 \(T\) 成正比，所以 fertility 直接乘在 KV 账单上——
    把 fertility 从 1.8 降到 0.6，等于在同样 KV 预算下有效上下文变成 3 倍。
    第 03 讲会给出 7B 模型的具体 GB 数字；记住结论：<strong>长上下文的第一性价比优化常常是换词表，而不是换模型</strong>。
  </p>
</section>
<p>
  <strong>经验值速查（用于心算）</strong>：
  英文约 0.25 token/字符，中文（中文词表）约 0.6，代码约 0.3，纯数字约 0.4。
  <em>不要背这些数，用第 3 节的代码在你自己的语料上量一次。</em>
</p>
<div class="flow">
  <div class="nd">原始文本</div><div class="ar">→</div>
  <div class="nd">预分词（正则）</div><div class="ar">→</div>
  <div class="nd">BPE 合并规则</div><div class="ar">→</div>
  <div class="nd hi">token id 序列</div><div class="ar">→</div>
  <div class="nd">embedding 查表</div>
</div>
<p>
  流程图里<strong>「预分词」是独立一步</strong>，不是 BPE 的一部分，但两者在实现里常写在同一个函数里。
  排查「切分不对」的问题时，顺序永远是：<em>先打印预分词片段，再打印 BPE 后的 token</em>。
</p>

<h3>8. 特殊 token 与 chat template</h3>
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
<p>
  一个必须知道的细节：<strong>特殊 token 会占用普通 token 的 id 空间吗？</strong>
  GPT-2 的 50257 里，最后一号就是 <code>&lt;|endoftext|&gt;</code>，
  它是在 5 万条合并规则<strong>之外</strong>额外加的。
  但 Hugging Face 加载一个聊天模型时你会看到 <code>vocab_size=151643</code> 而 <code>len(tokenizer)=151665</code>——
  差的 22 个是后加的特殊 token。
  <strong>做 embedding 裁剪时必须用后一个数</strong>，否则推理时会越界。
</p>

<h3>9. 三种训练数据格式</h3>
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

<h3>10. 文本之外的 tokenizer：音频离散化与 RVQ 的代数同构</h3>
<p>
  这是本模块和你的 Crossfade 项目真正的接口。
  <strong>把连续波形变成离散 token 序列，与把文本变成整数序列，是同一个代数结构。</strong>
  差别只在「先验空间」是可数的还是不可数的（第 4 节引理 3 已经把这条分界线说死了）。
</p>

<h4>10.1 神经音频 codec 的三段式：编码器 / 量化器 / 解码器</h4>
<p>
  <span class="t" data-tterm="Neural audio codec" data-d="把波形压成一串离散 token 的端到端模型；三段分别是卷积编码器、向量量化器、卷积解码器，典型如 SoundStream 与 EnCodec。">神经音频 codec</span>
  的结构可以直接对照文本 tokenizer：
</p>
<div class="flow">
  <div class="nd">连续波形</div><div class="ar">→</div>
  <div class="nd">卷积编码器 → 连续潜变量</div><div class="ar">→</div>
  <div class="nd hi">残差向量量化 → 离散索引</div><div class="ar">→</div>
  <div class="nd">解码器 → 重建波形</div>
</div>
<p>
  文本侧完全对应：<code>raw text</code> → <code>UTF-8 字节</code> → <code>BPE 合并</code> → <code>token id</code>。
  <strong>中间的「量化」这一步是音频独有的</strong>，因为文本天生离散；
  而 <code>BPE 的合并</code>对应<code>最近邻码字搜索</code>，两者都是「在已学到的码本里找一个最像的」。
</p>

<p>
  <strong>先算裸码率，再看压缩比</strong>：电话级单声道 24 kHz 采样、16 bit 量化，
  裸 PCM 码率是 \(24000 \times 16 = 384000\) bit/s，即 384 kbps——一秒钟 48 KB。
  EnCodec 的 6 kbps 档把它压到 \(6000/384000 \approx 1/64\)，压缩比 64 比 1。
  再除帧率：\(6000/75 = 80\) bit/帧，恰好等于 8 个码本每本 10 bit（\(1024 = 2^{10}\)）。
  <strong>LLM payoff</strong>：这和文本侧是同一笔账——码本层数对应词表大小，每秒比特数对应 fertility；
  做流式应用先看 kbps（带宽与存储成本），再看失真能不能接受，和选 tokenizer 先看 token 数再看效果是一个动作。
</p>

<h4>10.2 RVQ 的核心公式：把残差一层层吃掉</h4>
<p>
  <span class="t" data-tterm="Residual vector quantization" data-d="残差向量量化：先量化主成分得到 q1，再对残差 r1 继续量化得到 q2，依次类推；每一层码本更小、比特数更少。">RVQ</span>
  （残差矢量量化）的定义只有三行。设编码器输出 \(e\in\mathbb{R}^{d}\)，第 \(k\) 个码本 \(\mathcal{C}_{k}\) 有 \(N_k\) 个向量
  （各码本大小相同时就都记作 \(N\)）：
</p>
\[ q_{k} = \underset{c \in \mathcal{C}_{k}}{\arg\min}\; \lVert r_{k-1} - c \rVert_{2}^{2}, \qquad
   r_{k} = r_{k-1} - q_{k}, \qquad r_{0} = e \]
<p>
  最终表示是各层量化结果之和 \(\hat e = \sum_{k=1}^{K} q_{k}\)，而传输的只是每层的<strong>索引</strong>。
  于是码率有一个极其干净的公式（单位 bit/s）：
</p>
\[ R = f_{\text{frame}} \sum_{k=1}^{K} \log_{2} N_k \]
<p>
  这和 BPE 的 \(R = n_{\text{tok}}\log_2|\mathcal{V}|\) <strong>在结构上完全同构</strong>：
  都是「每秒（或每篇）多少个符号」乘以「每个符号多少比特」。
</p>
<p>
  <strong>为什么必须用残差？</strong>SoundStream 原论文（Zeghidour 等，arXiv:2107.03312，IEEE/ACM TASLP 2022）
  把这件事讲得非常直白：6 kbps、75 帧/秒意味着每帧 80 bit，
  <em>「用单一向量量化器需要存 \(N=2^{80}\) 个码字，这显然不可行。」</em>
  所以必须把它拆成 \(K\) 个小码本。EnCodec 的 6 kbps 档（Défossez 等，arXiv:2210.13438，
  后发表于 TMLR 2023）就是 <strong>8 个码本 × 1024 项</strong>，而 1024 正好是 \(2^{10}\)；
  代回上式：\(75 \times 8 \times 10 = 6000\) bit/s = 6 kbps ✓。
  <strong>这个 \(2^{80}\) 与「不能给每个字节一个独立的码字」是完全同构的论证。</strong>
</p>

<h4>10.3 与 BPE 的逐项对照</h4>
<table class="tbl small">
  <thead><tr><th>维度</th><th>文本 BPE</th><th>音频 RVQ</th></tr></thead>
  <tbody>
    <tr><td>输入空间</td><td>可数（\(\Sigma^{*}\)）</td><td>不可数（\(\mathbb{R}^{\mathbb{T}}\)）</td></tr>
    <tr><td>离散化步骤</td><td>UTF-8 编码（无损）</td><td>卷积编码 + 量化（<strong>有损</strong>）</td></tr>
    <tr><td>码本怎么学</td><td>贪心合并最高频 pair（无梯度）</td><td>k-means 配合直通估计器反传（有梯度）</td></tr>
    <tr><td>选择准则</td><td>最大频次</td><td>最小二乘距离</td></tr>
    <tr><td>残差结构</td><td>「还没被合并的相邻关系」</td><td>显式残差向量 \(r_{k}\)</td></tr>
    <tr><td>码率</td><td>\(n_{\text{tok}}\log_2|\mathcal{V}|\)</td><td>\(f_{\text{frame}}\sum_k \log_2 N_k\)</td></tr>
    <tr><td>预算旋钮</td><td>词表大小</td><td>开启几个码本层（码率调度）</td></tr>
    <tr><td>能否无损</td><td><strong>能</strong>（引理 3：输入空间可数）</td><td><strong>不能</strong>（引理 3：输入空间不可数）</td></tr>
    <tr><td>失败的样本</td><td>随机 ID、罕见人名（退化成逐字节）</td><td>高频嘶声、混响尾巴、打击类瞬态</td></tr>
  </tbody>
</table>
<p>
  表里最值得琢磨的是<strong>「预算旋钮」那一行</strong>。
  SoundStream 用「量化器 dropout」在训练时就随机丢掉后面的码本层，
  于是<strong>同一个模型</strong>可以跑在不同码率档位上。
  这和 BPE 的「同一个词表在不同文本上 fertility 不同」是同一类东西：
  <em>你付出的是「分布外输入会被拆得很碎」这一种代价，换来了可调的预算。</em>
</p>

<h4>10.4 关键差异（不要把同构当成等价）</h4>
<p>三处不一样，说不清楚就只能说「有点像」，说清楚才是理解：</p>
<ol>
  <li><strong>残差的类型不同</strong>：BPE 的残差是<strong>组合的</strong>（哪些相邻关系还没被合并），
      RVQ 的残差是<strong>向量的</strong>（\(r_{k}\in\mathbb{R}^{d}\)）。
      前者是离散的图结构，后者是连续空间里的欧氏投影。</li>
  <li><strong>学习信号不同</strong>：BPE 是<strong>无梯度的频次统计</strong>，一次训练几十分钟；
      RVQ 要<strong>端到端反传</strong>，成本高几个数量级。
      <em>这也是为什么文本 tokenizer 是「算出来的」，而音频 codec 是「训出来的」。</em></li>
  <li><strong>层数的作用方向相反</strong>：BPE 里<strong>加更多 merge 就是更长更贵的表示</strong>；
      RVQ 里加更多码本层是<strong>更细的残差</strong>（更准也更贵）。
      两者都叫「层级」，但一层的含义完全不同。</li>
</ol>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：写一个最小可运行的 RVQ，并与 BPE 对照</h4>
  <p>
    这是本模块最后一个动手，也是最容易出成果的：<strong>不训练任何网络</strong>，
    只用随机的码本，就能看到残差在前几层被迅速吃掉、
    以及<em>为什么随机码本在后面几层会「失灵」</em>（下面那段输出会亲自告诉你）。
  </p>
<pre><code>import numpy as np
rng = np.random.default_rng(0)

K, N, d = 8, 1024, 32          <span class="cm"># 8 个码本、每本 1024 项、潜变量维度 32</span>
codebooks = [rng.normal(size=(N, d)) for _ in range(K)]   <span class="cm"># 真实 codec 用 k-means 训练</span>

def rvq(e, trace=False):
    <span class="cm"># [逐行剖析] 逐层吃掉残差；只记录索引，不记录向量。
    # trace=True 时顺手记下每层的残差范数，用来观察下降曲线。</span>
    r, idx, norms = e.copy(), [], []
    for C in codebooks:
        j = int(np.argmin(((C - r) ** 2).sum(1)))   <span class="cm"># 找最近码字：argmin L2</span>
        r = r - C[j]                       <span class="cm"># 残差 = 上一步的 r 减去选中的码字</span>
        idx.append(j)
        norms.append(float(np.linalg.norm(r)))
    return idx, r, norms

e = rng.normal(size=d) * 2
idx, res, norms = rvq(e, trace=True)
bits_per_frame = K * int(np.log2(N))
print("bits/frame:", bits_per_frame, " -> at 75 Hz:",
      bits_per_frame * 75 / 1000.0, "kbps")     <span class="cm"># 80 bit/帧 x 75 帧/秒 = 6.0 kbps</span>
print("residual norm per layer:", [round(n, 3) for n in norms])
print("residual ratio:", round(float(np.linalg.norm(res) / np.linalg.norm(e)), 4))</code></pre>
  <p>
    <strong>你会看到什么（这是我实测到的输出，你可以逐个数字对一遍）</strong>：
  </p>
  <table class="tbl small">
    <thead><tr><th>层 \(k\)</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th></tr></thead>
    <tbody>
      <tr><td>残差范数</td><td>9.667</td><td>7.621</td><td>6.652</td><td>5.497</td><td>4.526</td><td>4.961</td><td>5.224</td><td>5.112</td></tr>
    </tbody>
  </table>
  <p>
    <strong>请注意第 6 层：残差范数从 4.526 回升到 4.961。</strong>这不是 bug，
    而是一个能学到东西的事实：<strong>随机码本里没有接近零的向量，
    所以第 \(k\) 层的「最近码字」有可能离残差比原点还远，残差范数于是变大。</strong>
    而真实的 codec 里残差范数是<strong>单调下降</strong>的，因为第 \(k\) 个码本正是在第 \(k\) 层的真实残差分布上训练出来的，
    里面必然有一个贴近该层尺度的码字。
    <em>所以 RVQ 的「层级」不是把几个码本拼起来就成立的，它是训出来的——这就是 10.4 节第三条差异的具体代价。</em>
  </p>
  <p>
    顺便核对码率那一行：8 个码本 × 每本 1024 项 = 每帧 80 bit，
    乘 75 帧/秒正好是 6.0 kbps——<strong>这就是 EnCodec 6 kbps 档的配置</strong>，
    也是验证「你真的理解了码率公式」最快的一步。
  </p>
  <p>
    <strong>要记录的三个数字</strong>：
    ① 上表这条残差曲线，并注明它在第几层开始回升（随机码本下的观察值）；
    ② 把 \(N\) 从 1024 降到 64（每层从 10 bit 变成 6 bit），残差范数上升多少倍；
    ③ 由此推出 EnCodec 的<strong>码率档位</strong>：每增加一个 1024 项的码本就多
    \(75\times10=750\) bit/s，于是 1.5 / 3 / 6 / 12 kbps 恰好对应 <strong>2 / 4 / 8 / 16 个码本</strong>——
    这正是 EnCodec 论文公开的那四档（arXiv:2210.13438）。对上了，说明你把码率公式算对了。
    这三个数字就是「音频 tokenizer 的 fertility」，和文本的 fertility 是同一类量。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么用在 Crossfade 项目上：值不值，先算这三笔账</h4>
  <p>
    你的项目里有两条可能用到 tokenizer 的路。先说结论：
    <strong>其中一条非常值，另一条你大概不需要。</strong>
  </p>
  <dl class="kv">
    <dt>路线 1 · 值得做</dt>
    <dd>
      <strong>把四个连续特征离散成文本 token</strong>，然后用现成文本模型做条件生成。
      你的特征向量（<span class="t" data-tterm="Feature discretization" data-d="把连续数值分箱成少数离散档位再映射为整数；档位数决定分辨率，也直接决定后续生成的 token 成本。">特征分箱</span>）
      每一维先分箱成若干档（例如 5–9 档），每档一个 token，于是「渲染一张谱」变成「预测一串 token」。
      <strong>值在哪</strong>：可以直接复用成熟模型的整条流水线（量化、KV cache、投机解码），
      不必自己训 codec。代价是<strong>分辨率被你的分箱数限制</strong>，
      所以只有 Level 0/1 那种「先给出大致目标」的任务适合。
    </dd>
    <dt>路线 2 · 大概不需要</dt>
    <dd>
      <strong>自己训一个音频 codec（RVQ）来给自回归模型当 tokenizer。</strong>
      不要做。RVQ 需要在千万小时级音频上端到端训练，
      而你的任务既不要求高保真重建，也不要求开放域泛化——
      <em>用一个固定维度的回归头直接预测这四个特征，通常比「离散化 + 生成」更准、更省。</em>
      第 10.4 节第三条差异就是这里的代价：RVQ 要反传，你没这个预算。
    </dd>
    <dt>路线 3 · 论文里最值钱的一条</dt>
    <dd>
      <strong>把「fertility」当作你报告里的一个明确指标。</strong>
      无论走哪条路，都量一次「每个特征值要花掉多少 token」。
      这是数学系申请材料里最好的那种东西：一个你<strong>自己定义、自己测量、并且会随分箱数变化</strong>的量，
      一句话就能讲清楚「为什么我们选 8 档而不是 32 档」——
      <em>成本随分箱数上升，而收益在某个点之后饱和。</em>
      一个可以直接照抄的量：你的 <code> 0.08</code> 这个数在 cl100k 下会占
      空格 + <code>0</code> + <code>.</code> + <code>08</code> 共 4 个片段，
      <strong>一个连续特征值的成本大约是 4 个 token</strong>。
    </dd>
  </dl>
  <p>
    <strong>一句话总结</strong>：tokenizer 的核心是「选择一种离散化，让后续模型只需学最少的东西」。
    文本领域用 BPE 是因为它便宜、可复现、且几乎无损；音频领域用 RVQ 是因为输入本来是连续的、别无选择。
    你的项目夹在中间——特征本来就是连续但低维的，
    <em>所以你有一个文本和音频都没有的选项：直接用实数回归，别绕道离散化。</em>
  </p>
</section>

<h3>11. 本模块术语</h3>
<ul>
  <li><span class="t" data-tterm="Tokenizer" data-d="把字符串映射成整数序列（以及反向映射）的组件，词表与合并规则是训练出来的。">tokenizer</span>、
      <span class="t" data-tterm="Vocabulary size" data-d="词表大小 |V|，决定 embedding 与输出层参数量，通常 32k–200k。">词表大小</span>。</li>
  <li><span class="t" data-tterm="Sequence packing" data-d="把多条短样本拼进一条固定长度序列，减少 padding 浪费，但要注意不能让注意力跨样本泄漏。">序列打包</span>、
      <span class="t" data-tterm="Loss mask" data-d="在损失里屏蔽不属于目标部分的 token（例如用户提问）。">损失掩码</span>。</li>
  <li><span class="t" data-tterm="Chat template" data-d="角色消息到字符串的渲染规则。">chat template</span>、
      <span class="t" data-tterm="Contamination" data-d="测试数据出现在训练集中，导致评估虚高。">数据污染</span>。</li>
  <li><span class="t" data-tterm="Code point" data-d="Unicode 给每个字符分配的整数，写成 U+XXXX；范围到 U+10FFFF，共 1114112 个。">码点</span>、
      <span class="t" data-tterm="UTF-8" data-d="把码点编码成 1 到 4 个字节的自同步变长编码；ASCII 占 1 字节，汉字占 3 字节。">UTF-8</span>、
      <span class="t" data-tterm="Pre-tokenization" data-d="在 BPE 之前用正则把文本切成片段，合并只在片段内发生；数字片段通常限长 3。">预分词</span>。</li>
  <li><span class="t" data-tterm="Merge rank" data-d="一条合并规则被学到的次序；推理时按 rank 递增套用，这是 tiktoken 能一遍扫完的原因。">合并 rank</span>、
      <span class="t" data-tterm="Fertility" data-d="一个词或字符被切成几个 token，是连接文本长度与成本、上下文长度的唯一换算系数。">fertility</span>。</li>
  <li><span class="t" data-tterm="Residual vector quantization" data-d="残差矢量量化：逐层把残差 r_k = r_{k-1} - q_k 逼近到更小的码本；码率为帧率乘以各码本比特数之和。">RVQ</span>、
      <span class="t" data-tterm="Codebook" data-d="量化器的码字集合，大小通常是 2 的幂（如 1024）；索引即码率，每项 log2(N) 比特。">码本</span>、
      <span class="t" data-tterm="Frame rate" data-d="codec 每秒输出多少帧离散 token；EnCodec 为 75 Hz、Mimi 为 12.5 Hz、英文文本约 4.5 token/s。">帧率</span>。</li>
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

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">按 GPT-4 的预分词正则，输入 <code> 1234567890</code> 会被切成几个片段？为什么要把数字规则写成「最多 3 位」？</p>
  <ul class="opts">
    <li>2 个片段，因为 1234 与 567890 各自合并</li>
    <li data-ok>5 个片段（空格 + 123 / 456 / 789 / 0）；限 3 位是为了让数字 token 按 3 位对齐，从而至少能表示完整的三位数与千分位</li>
    <li>3 个片段，因为数字最多两位一组</li>
    <li>11 个片段，因为每个数字必须单独成 token</li>
  </ul>
  <p class="why">
    正则里数字分支是 1 到 3 个连续数字，所以 10 位数字切成 <code>123</code>、<code>456</code>、<code>789</code>、<code>0</code>
    四段，加上前面那个<strong>不能粘到数字上的空格</strong>（空格只会粘到后面的字母或标点上），共 5 段。
    限 3 位的真实目的是<strong>让模型学到从右对齐的三位分组</strong>，好让个位/十位/百位有稳定位置；
    代价是模型永远学不到「一整个长数字是一个 token」，这直接解释了它为什么数不清、倒不对长数字串。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">关于 byte-level BPE 的编解码，下面哪个说法是<strong>严格正确</strong>的？</p>
  <ul class="opts">
    <li>每个字节各占一个固定的 token，所以编码是无损的</li>
    <li data-ok>合并保持字节串的拼接，所以无论规则怎么设计，<code>decode(encode(w))</code> 都等于原串</li>
    <li>词表覆盖了全部 Unicode 码点（111 万个），所以不存在未知词</li>
    <li>训练时的频次统计把每个字符的身份保留了下来，所以模型能数字母</li>
  </ul>
  <p class="why">
    这就是本模块的定理 1。逐条排除：① 恰恰相反，<strong>合并之后一个 token 对应多个字节</strong>，
    单字节 token 只是起点；③ byte-level 的作用是「即使词表里没有某个字符，也能退回它的字节」，
    而不是词表覆盖了码点（词表只有几万到二十万项）；④ 频次统计
    <strong>恰好丢弃了全部身份信息</strong>——它只保留「哪些相邻对更常连在一起」，
    这就是模型数不清字母的直接原因。定理 1 是结构性的，所以它不需要额外假设就成立。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">语料是 <code>baaa</code>×9、<code>aaaa</code>×2、<code>aaa</code>×1，只允许做 1 次合并。贪心 BPE 会选 <code>aa</code>（频次 26），而直接新增整词 <code>baaa</code> 更好。这个反例说明什么？</p>
  <ul class="opts">
    <li>说明实现有 bug，因为 BPE 应当枚举所有可能的合并顺序</li>
    <li data-ok>说明贪心只看当前频次、不看这次合并对后续切分的贡献；两者词表大小相同，总符号数却是 33 对 20</li>
    <li>说明频次统计里的 <code>aa</code> 被重复计算了（应该是 13 而不是 26）</li>
    <li>说明 BPE 只在词频低于某个阈值时才合并</li>
  </ul>
  <p class="why">
    <code>(a,a)</code> 的频次确实是 26（<code>aaa</code> 贡献 2、<code>aaaa</code> 贡献 3×2、
    <code>baaa</code> 贡献 2×9），不是重复计算。真实存在的阈值是「频次小于 2 就停止合并」，
    与 10 无关。而 BPE <strong>按定义就不枚举合并顺序</strong>——它每步只取当前最高频的一个 pair，
    这是原始论文里明确的设计取舍。所以正确的结论是：
    <em>贪心的局部最优不等于全局最优，但在真实规模语料上这个差距被摊薄到不值得优化。</em>
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">SoundStream 论文指出：6 kbps、75 帧/秒时每帧 80 bit，若用单一码本就需要 \(2^{80}\) 个码字，「显然不可行」。残差量化解决了什么？</p>
  <ul class="opts">
    <li data-ok>它把 80 bit 拆成 \(K\) 个小码本（如 8 个 × 10 bit），每层逼近残差；每帧只传 \(K\) 个索引，而索引的组合数是指数级的</li>
    <li>它让单码本能严格无损地表示任意实数潜变量</li>
    <li>它把帧率从 75 Hz 提到 750 Hz，因此每帧只需 8 bit</li>
    <li>它用梯度下降代替了 k-means，所以码率会自动下降</li>
  </ul>
  <p class="why">
    这就是<em>「不能给每个字节一个独立的码字」在音频里的同构版本</em>。
    逐条排除：② 由第 4 节引理 3，连续信号到有限码不可能单射，RVQ 一定有损；
    ③ 帧率由编码器的下采样倍数决定，是独立的设计选择（EnCodec 的 24 kHz 对应 75 Hz）；
    ④ 方向反了——RVQ 确实用直通估计器反传，但码率由开启的码本层数决定，
    训练不会自动把它降下来。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 8</div>
  <p class="q">文本 BPE 能做到严格无损、音频 RVQ 一定有损，最根本的原因是？</p>
  <ul class="opts">
    <li data-ok>文本的输入空间可数，而连续波形所在的空间不可数；有限码本无法单射到不可数集上</li>
    <li>文本的词表（几万项）比音频的码本集合更大</li>
    <li>文本里没有噪声与混响，音频里有</li>
    <li>因为 BPE 是无损压缩算法、RVQ 是有损压缩算法</li>
  </ul>
  <p class="why">
    这是第 4 节引理 3，也是本模块最值得记住的一条。逐条排除：② 词表大小与可逆性无关，
    把词表开到 \(2^{80}\) 也变不出无损；③ 这是听感上的解释，不是数学原因——
    即使把噪声也当成输入，它仍然是不可数的；④ 那是把结论当成原因，典型的循环论证。
    <strong>真正的分界线是可数性</strong>：只要输入空间可数，就存在到有限码的单射，
    而且 BPE 的合并表就是这个单射的<em>显式构造</em>。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 9</div>
  <p class="q">一万字中文从中文友好词表（0.6 token/字）换到英文为主词表（1.8 token/字），token 数、注意力计算量、KV 显存各变为几倍？</p>
  <ul class="opts">
    <li>都是 3 倍，因为三者都与长度成正比</li>
    <li data-ok>token 数 3 倍、注意力计算量约 9 倍、KV 显存约 3 倍</li>
    <li>token 数 9 倍，其余 3 倍，因为分词误差会被平方放大</li>
    <li>只有计费变 3 倍，计算量与显存不变</li>
  </ul>
  <p class="why">
    长度比 \(18\mathrm{k}/6\mathrm{k} = 3\)；注意力是 \(O(T^2)\)，\(3^2 = 9\)；
    KV cache 与计费都与 \(T\) 成正比，各约 3 倍。所以长上下文的第一性价比优化常常是换词表：fertility 降 3 倍，注意力账单降 9 倍。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 10</div>
  <p class="q">EnCodec 6 kbps 的语音听起来像电话音质而不是透明音质，最根本的原因是？</p>
  <ul class="opts">
    <li>码本只有 1024 项，训练数据不够多，加大码本就能无损</li>
    <li data-ok>连续信源在有限码率下的失真有大于零的下界 \(D(R) &gt; 0\)，6 kbps 处的下界就对应这个音质</li>
    <li>残差量化只用了 8 层，用 80 层就能逐层吃光残差</li>
    <li>帧率 75 Hz 太低，把帧率提到 750 Hz 就能无损</li>
  </ul>
  <p class="why">
    这是率失真理论的结论：\(R = 6\) kbps 处的 \(D(R)\) 下界摆在那里，加码本层数只是沿着率失真曲线向低失真方向走，
    永远到不了零（那需要无限码率）。基数论证只说了“精确还原不可能”，而率失真给出的是定量 trade-off，这才是选码率档位的依据。
  </p>
</div>

<div class="acc" data-t="深入：什么时候该自己训练 tokenizer？" data-badge="可选">
  <div class="acc-body">
    <p><strong>该自己训</strong>：领域文本与通用语料分布差异极大（例如只处理 MIDI、蛋白序列、化学式），且你有足够语料（通常 ≥ 数十 GB 或 ≥ 10\(^8\) token）重训整个模型。</p>
    <p><strong>不要自己训</strong>：你只是做微调。一旦更换 tokenizer，预训练模型的 embedding 就全部失效，等于放弃了预训练的一切。</p>
    <p>实践顺序：先用现成 tokenizer 跑通 → 量化 fertility 与成本 → 只有在收益明确（例如序列长度缩短 40%）时才考虑更换。</p>
    <p>工具：<code>tokenizers</code> 库训练 BPE / Unigram；<code>tiktoken</code> 复现 GPT 系列分词；HF Hub 上可对比多个模型对同一段文本的切分。</p>
    <p><strong>训练时的三个实务坑</strong>：① 语料必须<em>已经预分词</em>，
      否则你学到的合并规则会跨越不该跨越的边界（就是 5.3 节那条前瞻）；
      ② 数字要不要单独处理，取决于你是否希望模型学会位数对齐——
      这是一个<em>任务选择</em>，不是技术细节；
      ③ 保存词表时只存 <code>merges</code>，不存 id 到字符串的整表，前者能压缩十倍以上。</p>
  </div>
</div>

<div class="acc" data-t="深入：GPT-2 的 bytes_to_unicode 与 o200k 的三处改动" data-badge="进阶">
  <div class="acc-body">
    <p><strong>为什么要做那张映射？</strong>因为 BPE 要在「文本」上做统计与合并，
    而原始字节里混着零字节、换行这类没法安全写进语料文件的值。
    GPT-2 的做法是建立一个双射，把 256 个字节映射到 256 个<strong>可打印且非空白</strong>的码点，
    于是整个词表可以当普通文本文件分发。表长恰好 256，且每个码点都大于空格。</p>
    <p><strong>它和什么有关？</strong>和第 4 节的定理 1 直接相关：
    这张表是<strong>字节到「文本」的另一种编码</strong>，同样是保长展开，所以它也不引入任何损失。
    你在 Qwen / LLaMA 的 token 里看到大量 Ġ（U+0120，原空格）与 Ċ（U+010A，原换行），
    就是这一层的痕迹。</p>
    <p><strong>后来那个更大的词表（约 20 万项）改了什么？</strong>主要是三件事，
    建议你把两条正则并排 diff 一遍，比读任何文章都快：
    ① 字母类被拆得更细（区分大写、首字母大写、小写以及标题形式），
    这样能区分 <code>US</code> 与 <code>Us</code> 这类形态差异；
    ② <strong>把组合记号类显式纳入字母类</strong>——
    这一条对天城文、泰文、带附加符号的阿拉伯文是决定性的，
    因为旧模式里组合记号既不是字母也不是数字，会被当成标点切走；
    ③ 加入了大量非英语的高频片段，把很多语言的 fertility 拉低了约三分之一。
    <em>注意它的数字规则与第 5 节那条不同，所以「一个 token 最多几位」的结论不要跨词表照搬。</em></p>
    <p><strong>对选型的影响</strong>：词表越大，每百万 token 的价格通常越低（服务商按 token 定价，
    而同样一段文本在大词表上更短）。但注意<strong>上下文窗口的换算要重算</strong>——
    「128k token」在不同词表下代表的字符数不一样，这个换算在 7.1 节。</p>
  </div>
</div>
`
});
