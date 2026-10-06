/* content/26-workflow.js — 模块 26：自制大模型 Gen-1（一）：微观基石与手写 BPE 分词器 */
COURSE.register({
  id: "m26",
  part: 5,
  num: "26",
  title: "自制大模型 Gen-1（一）：微观基石与手写 BPE 分词器",
  en: "Building Gen-1 LLM (Part 1): Byte Pair Encoding (BPE) Tokenizer from Scratch",
  minutes: 40,
  tags: ["Gen-1自制大模型", "分词器", "BPE", "Karpathy源码", "从零手写"],
  body: String.raw`
<p class="lead">
  欢迎进入<strong>【自制大模型 Gen-1】实战营</strong>！从本讲（第 26 讲）到第 29 讲，我们将彻底告别黑盒与第三方高级封装库，
  紧随世界顶尖 AI 科学家 <strong>Andrej Karpathy</strong>（前 OpenAI 创始成员兼特斯拉 AI 总监）的《Zero to Hero》教学哲学，
  从最底层的<strong>字节频次统计与合并规则</strong>开始，逐行纯手工编写属于你自己的第一代自回归大语言模型（<strong>NanoLM-Gen1</strong>）！
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🎥</span>必看高质导读资源（Recommended Learning Resources）</h4>
  <p>在阅读与手写本章代码前，强烈建议同步观看以下权威公开资源：</p>
  <ul>
    <li>
      <strong>核心精讲视频</strong>：Andrej Karpathy — 
      <a href="https://www.youtube.com/watch?v=zduSFxRajkE" target="_blank" rel="noopener">《Let's build the GPT Tokenizer》</a>
      （时长：2小时13分钟）。<br>
      <em>重点时间戳</em>：<code>0:00:00</code> 为什么分词器是 LLM 奇怪行为的万恶之源；<code>0:26:00</code> BPE 算法工作机制；<code>0:48:00</code> 逐行手写训练 BPE；<code>1:12:00</code> GPT-2 与 GPT-4 正则切割规则。
    </li>
    <li>
      <strong>官方开源代码库</strong>：
      <a href="https://github.com/karpathy/minbpe" target="_blank" rel="noopener"><code>karpathy/minbpe</code></a> 
      — 极简、清爽的纯 Python BPE 分词器实现，无任何重型依赖。
    </li>
    <li>
      <strong>奠基性论文</strong>：Sennrich et al. (2016) — 
      <a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noopener">《Neural Machine Translation of Rare Words with Subword Units》</a>。<br>
      <em>推荐理由</em>：首次将数据压缩领域的 BPE 算法引入神经网络 NLP，彻底解决了固定大词表带来的 OOV（Out-Of-Vocabulary 词表外溢出）问题。
    </li>
  </ul>
</section>

<h3>1. 为什么不能直接使用字符或整词？</h3>
<p>
  大模型本质是数学矩阵计算器，它无法直接识别字符串 <code>"Hello, world!"</code>。在输入神经网络前，文本必须被映射为离散的整数索引（Token IDs）。
</p>
<table class="tbl">
  <thead><tr><th>切分级别</th><th>词表大小（Vocab Size）</th><th>序列长度（Sequence Length）</th><th>致命短板</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>字符级（Character）</strong></td>
      <td>极小（约 100~256）</td>
      <td><strong>极大（极度冗长）</strong></td>
      <td>每个汉字或复杂单词由多个字符构成，自注意力机制的计算复杂度为 \(O(T^2)\)，序列过长会导致计算量与显存爆炸。</td>
    </tr>
    <tr>
      <td><strong>整词级（Word）</strong></td>
      <td><strong>极大（数百万且开放）</strong></td>
      <td>极短</td>
      <td>词表随着新词无限膨胀，模型词嵌入矩阵占满显存；面对生僻词或错别字直接报错（OOV）。</td>
    </tr>
    <tr>
      <td><strong>子词级（Subword / BPE）</strong></td>
      <td><strong>可控（如 256~50,000）</strong></td>
      <td><strong>均衡</strong></td>
      <td>高频词作为一个整体，生僻词拆解为子词或基础字节，兼具计算紧凑性与 100% 无 OOV 的全字符覆盖率。</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：BPE 合并状态元组）</h4>
  <p>在 BPE 算法中，文本初始被转换为 UTF-8 原始字节序列（数值区间为 \(0 \sim 255\)）。设当前词表大小为 \(V\)，每轮迭代执行：</p>
  \[ \text{pair}^* = \arg\max_{(p_1, p_2)} \text{Count}(p_1, p_2), \qquad \text{NewID} = V \leftarrow (p_1, p_2) \]
  <ul>
    <li>\((p_1, p_2)\)：当前序列中相邻出现的连续双字符/字节对（Bigram Pair）；</li>
    <li>\(\text{pair}^*\)：全语料中出现频率最高的双字节组合；</li>
    <li>\(\text{NewID}\)：分配给该新组合的合并索引（从 256 开始递增）。</li>
  </ul>
</section>

<h3>2. 逐行手写极简 BPE 分词器（NanoTokenizer）</h3>
<p>
  以下我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，从零编写完整的 BPE 分词器类。
</p>

<h4>第一步：统计连续双字节频次</h4>

<pre><code>def get_stats(ids):
    counts = {}
</code></pre>
<p><strong>代码解析</strong>：定义辅助函数 <code>get_stats</code>，输入为一个由整数构成的序列 <code>ids</code>（初始为 UTF-8 字节列表），初始化一个字典 <code>counts</code> 用于累加每个相邻双元组出现的总次数。</p>

<pre><code>    for pair in zip(ids, ids[1:]):
        counts[pair] = counts.get(pair, 0) + 1
</code></pre>
<p><strong>代码解析</strong>：使用 Python 内置的 <code>zip(ids, ids[1:])</code> 将相邻位置的元素两两配对（例如 <code>[1, 2, 3]</code> 配成 <code>(1, 2)</code> 和 <code>(2, 3)</code>），遍历并自增统计各个配对出现的频次。</p>

<pre><code>    return counts
</code></pre>
<p><strong>代码解析</strong>：返回统计字典，键为双元组 <code>(p0, p1)</code>，值为该双元组在输入序列中出现的总次数。</p>

<h4>第二步：执行双字节原子合并</h4>

<pre><code>def merge(ids, pair, idx):
    newids = []
</code></pre>
<p><strong>代码解析</strong>：定义替换函数 <code>merge</code>，接收当前序列 <code>ids</code>、待合并的目标双元组 <code>pair</code> 以及分配给该组合的新编号 <code>idx</code>；初始化空列表 <code>newids</code> 存储合并后的新序列。</p>

<pre><code>    i = 0
    while i &lt; len(ids):
</code></pre>
<p><strong>代码解析</strong>：初始化遍历指针 <code>i = 0</code>，采用 <code>while</code> 循环进行顺序扫描，以便在遇到连续匹配时一次性跳跃 2 个位置。</p>

<pre><code>        if i &lt; len(ids) - 1 and ids[i] == pair[0] and ids[i+1] == pair[1]:
            newids.append(idx)
            i += 2
</code></pre>
<p><strong>代码解析</strong>：检查当前位置 <code>i</code> 与下一个位置 <code>i+1</code> 是否正好匹配目标双元组；若匹配成功，将合并后的新索引 <code>idx</code> 追加至输出列表，并将指针前移 2 步跳过这对组合。</p>

<pre><code>        else:
            newids.append(ids[i])
            i += 1
</code></pre>
<p><strong>代码解析</strong>：如果不匹配，原样保留当前位置元素 <code>ids[i]</code> 并前进一步。</p>

<pre><code>    return newids
</code></pre>
<p><strong>代码解析</strong>：返回合并后的紧凑序列。原序列长度缩短，高频组合被压缩为单一的抽象 Token ID。</p>

<h4>第三步：构建面向对象的分词器（NanoTokenizer）</h4>

<pre><code>class NanoTokenizer:
    def __init__(self):
        self.merges = {}
        self.vocab = {}
</code></pre>
<p><strong>代码解析</strong>：定义分词器主类，<code>self.merges</code> 用于保存训练得到的合并规则表 <code>{(p0, p1): new_id}</code>，<code>self.vocab</code> 用于保存反向解码词表 <code>{token_id: bytes}</code>。</p>

<pre><code>    def train(self, text, vocab_size, verbose=False):
        assert vocab_size &gt;= 256
        num_merges = vocab_size - 256
</code></pre>
<p><strong>代码解析</strong>：训练函数接收原始文本 <code>text</code> 与目标词表大小 <code>vocab_size</code>；因为单字节共有 256 种可能（0~255），因此目标词表必须大于等于 256，需要执行的合并迭代轮数恰好为 <code>vocab_size - 256</code>。</p>

<pre><code>        tokens = list(text.encode("utf-8"))
        ids = list(tokens)
</code></pre>
<p><strong>代码解析</strong>：将输入字符串直接转换为 UTF-8 原始字节序列，每个字节自然落在 <code>0 ~ 255</code> 的数值范围内，彻底消灭任何未知字符的可能。</p>

<pre><code>        for i in range(num_merges):
            stats = get_stats(ids)
            if not stats: break
            pair = max(stats, key=stats.get)
</code></pre>
<p><strong>代码解析</strong>：启动迭代循环，在每轮中调用 <code>get_stats</code> 统计当前序列中最常出现的双字节组合，通过 <code>max(stats, key=stats.get)</code> 贪心挑出出现次数最多的那个 <code>pair</code>。</p>

<pre><code>            idx = 256 + i
            ids = merge(ids, pair, idx)
            self.merges[pair] = idx
</code></pre>
<p><strong>代码解析</strong>：从 256 开始为该高频组合分配新编号 <code>idx</code>，调用 <code>merge</code> 将全序列中的该配对替换为 <code>idx</code>，并记录进合并规则表 <code>self.merges</code>。</p>

<pre><code>        self.vocab = {idx: bytes([idx]) for idx in range(256)}
        for (p0, p1), idx in self.merges.items():
            self.vocab[idx] = self.vocab[p0] + self.vocab[p1]
</code></pre>
<p><strong>代码解析</strong>：构建全局解码词表：前 256 个 ID 对应单字节本身；后续的新 ID 则由其合并来源的双元组对应的字节串拼接而成。</p>

<h4>第四步：文本编码（Encode）与解码（Decode）</h4>

<pre><code>    def encode(self, text):
        tokens = list(text.encode("utf-8"))
        while len(tokens) &gt;= 2:
</code></pre>
<p><strong>代码解析</strong>：编码函数将任意输入字符串先转换为原始字节序列；进入循环，只要序列长度不少于 2，就不断寻找是否还有可执行的合并规则。</p>

<pre><code>            stats = get_stats(tokens)
            pair = min(stats, key=lambda p: self.merges.get(p, float("inf")))
            if pair not in self.merges: break
            tokens = merge(tokens, pair, self.merges[pair])
</code></pre>
<p><strong>代码解析</strong>：寻找当前序列中在 <code>self.merges</code> 规则表里最早被训练出来的那个 <code>pair</code>（即合并优先级最高）；如果当前序列中已无任何可合并组合则退出循环，返回最终 Token ID 序列。</p>

<pre><code>    def decode(self, ids):
        tokens = b"".join(self.vocab[idx] for idx in ids)
        return tokens.decode("utf-8", errors="replace")
</code></pre>
<p><strong>代码解析</strong>：解码函数极为优雅纯粹：直接遍历每个 <code>idx</code>，从 <code>self.vocab</code> 中取出其所代表的原始字节串进行二进制拼接，最后以 UTF-8 还原为人类可读的字符串。</p>

<h3>3. 🧪 模块完整整合代码清单（Complete Runnable Script）</h3>
<p>
  下面是上述所有分步解析代码的<strong>完整、无删减整合版</strong>，可直接复制到本地 Python 3.10+ 环境或 Kaggle Notebook 中独立运行验证：
</p>

<pre><code># =====================================================================
# Gen-1 LLM: Minimal Byte Pair Encoding (BPE) Tokenizer
# Inspired by Andrej Karpathy's minbpe & Zero to Hero Series
# =====================================================================

def get_stats(ids):
    """统计整数序列中相邻双元组的出现频次"""
    counts = {}
    for pair in zip(ids, ids[1:]):
        counts[pair] = counts.get(pair, 0) + 1
    return counts

def merge(ids, pair, idx):
    """将序列中的目标 pair 原子替换为新的 token id"""
    newids = []
    i = 0
    while i &lt; len(ids):
        if i &lt; len(ids) - 1 and ids[i] == pair[0] and ids[i+1] == pair[1]:
            newids.append(idx)
            i += 2
        else:
            newids.append(ids[i])
            i += 1
    return newids

class NanoTokenizer:
    """自制大模型 Gen-1 极简 BPE 分词器"""
    def __init__(self):
        self.merges = {}  # (int, int) -> int
        self.vocab = {}   # int -> bytes

    def train(self, text, vocab_size, verbose=False):
        assert vocab_size &gt;= 256, "词表大小必须至少为 256（覆盖全部单个字节）"
        num_merges = vocab_size - 256
        tokens = list(text.encode("utf-8"))
        ids = list(tokens)

        for i in range(num_merges):
            stats = get_stats(ids)
            if not stats:
                break
            pair = max(stats, key=stats.get)
            idx = 256 + i
            ids = merge(ids, pair, idx)
            self.merges[pair] = idx
            if verbose:
                print(f"Merge {i+1}/{num_merges}: {pair} -> {idx} (出现频次: {stats[pair]})")

        # 构建反向映射词表
        self.vocab = {idx: bytes([idx]) for idx in range(256)}
        for (p0, p1), idx in self.merges.items():
            self.vocab[idx] = self.vocab[p0] + self.vocab[p1]

    def encode(self, text):
        """将任意文本编码为整数 Token ID 列表"""
        tokens = list(text.encode("utf-8"))
        while len(tokens) &gt;= 2:
            stats = get_stats(tokens)
            pair = min(stats, key=lambda p: self.merges.get(p, float("inf")))
            if pair not in self.merges:
                break
            tokens = merge(tokens, pair, self.merges[pair])
        return tokens

    def decode(self, ids):
        """将 Token ID 列表还原为自然文本"""
        tokens = b"".join(self.vocab[idx] for idx in ids)
        return tokens.decode("utf-8", errors="replace")

# ----------------- 单元测试与直观验证 -----------------
if __name__ == "__main__":
    sample_text = "aaabdaaabac — Hello Large Language Models! 欢迎来到自制大模型实战营。"
    print(f"原始文本长度: {len(sample_text)} 字符, UTF-8 原始字节数: {len(sample_text.encode('utf-8'))}")
    
    tokenizer = NanoTokenizer()
    tokenizer.train(sample_text, vocab_size=270, verbose=True)
    
    encoded = tokenizer.encode(sample_text)
    decoded = tokenizer.decode(encoded)
    
    print("\n编码后的 Token IDs:", encoded)
    print(f"压缩后序列长度: {len(encoded)} (压缩率: {len(encoded) / len(sample_text.encode('utf-8')):.1%})")
    print("解码还原文本:", decoded)
    assert decoded == sample_text, "自测失败：解码文本与原始文本不一致！"
    print("🎉 单元测试 100% 通过！分词器编解码完全无损。")
</code></pre>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 Karpathy 的 BPE 分词器设计中，为什么初始基础词表（Base Vocabulary）的大小严格设定为 256？</p>
  <ul class="opts">
    <li>因为 256 是 2 的 8 次方，能让 GPU 矩阵乘法刚好对齐张量核心（Tensor Core）</li>
    <li data-ok>现代计算机的 UTF-8 编码以字节（Byte）为基本物理单元，一个字节有 256 种不同的状态（0~255）。以 256 为底能确保任何文本（含所有语言、标点与Emoji）均可无损拆解，彻底杜绝 OOV 溢出</li>
    <li>因为早期 ASCII 编码只有 256 个汉字</li>
    <li>这是由 Python 循环解析器的最大栈深度决定的</li>
  </ul>
  <p class="why">
    字节级 BPE（Byte-level BPE）的核心创新在于用最底层的 256 个原始字节兜底。无论遇到怎样古怪的生僻符号，最多退化为多个原始单字节，而绝不会抛出未定义异常。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">当使用 <code>NanoTokenizer.train()</code> 训练语料时，若给定的 <code>vocab_size</code> 过小（例如只比 256 多 10），对下游大模型训练产生的主要负面影响是什么？</p>
  <ul class="opts">
    <li>模型权重文件体积会变得极大，显存无法放下</li>
    <li data-ok>词表合并次数过少，导致常见单词无法被有效压缩为单一子词，下游模型的上下文序列长度（Sequence Length）过长，引发自注意力计算开销急剧增加</li>
    <li>模型在反向传播时无法计算交叉熵损失</li>
    <li>分词器解码时会抛出编码异常崩溃</li>
  </ul>
  <p class="why">
    BPE 词表过小意味着缺乏高阶子词抽象，文本几乎以单字节或双字节形态存在，使得原本需要 1000 Token 表达的段落膨胀至 3000 Token，严重浪费模型的有限上下文窗口。
  </p>
</div>
`
});
