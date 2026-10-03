/* content/91-appendix-b-labs.js — 附录 B：Colab 实验手册 */
COURSE.register({
  id: "appB",
  part: 9,
  num: "B",
  title: "附录 B · Colab 实验手册（8 个可运行实验）",
  en: "Appendix B — Hands-on Labs",
  minutes: 120,
  tags: ["附录", "动手", "Colab"],
  body: String.raw`
<p class="lead">
  前 17 个模块给你概念与公式；这份附录给你<strong>手</strong>：8 个能在 Colab 免费 GPU 或 CPU 上跑完的实验。
  每个实验都遵守同一条纪律——<strong>可复现的命令、一条基线、一组曲线、一个明确的结论</strong>。
  少了任何一样，跑出来的数字都只是噪声，写不进申请材料。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>六条实验原则（先读，再跑）</h4>
  <ol>
    <li><strong>30–90 分钟原则</strong>：每个实验都必须在一次 Colab 会话内跑完。跑不完，说明规模选错了，
        先缩小数据集或模型，而不是等更长的墙钟时间。</li>
    <li><strong>种子必须写死</strong>：<code>random</code>、<code>numpy</code>、<code>torch</code>、<code>jax</code>
        四套随机源各自设种子，并且把种子值写进记录。否则你无法区分「模型变好了」与「这次抽到的批更好」。</li>
    <li><strong>两组曲线，不是一组</strong>：每个实验都要同时画训练集与验证集的损失。
        只画训练损失的实验，等于没有实验。</li>
    <li><strong>基线先于模型</strong>：任何新模型之前，先跑一个「几乎不学习」的基线（计数表、启发式公式、艺人均值）。
        只有当模型<em>稳定地</em>优于基线时，它才值得被写下来。</li>
    <li><strong>一次只改一个变量</strong>：并行的改动会让你事后无法归因。想比较 LoRA 的秩，就固定住数据、步数、学习率。</li>
    <li><strong>记录单位与不确定度</strong>：写「val ppl 4.7 ± 0.1（5 个种子）」，而不是写「val ppl 4.7」。
        没有离散度的数字，在评审眼里没有信息量。</li>
  </ol>
</section>

<h3>1. 统一记录模板</h3>
<p>
  每个实验结束时，把下面这张表填满，存成 <code>notes/E1.md</code> 之类的文件。它同时也是你申请材料里
  「实验能力」那一栏的原始素材。
</p>
<table class="tbl small">
  <thead><tr><th>字段</th><th>写什么</th><th>示例</th></tr></thead>
  <tbody>
    <tr><td><code>seed</code></td><td>所有随机源的种子，以及跑了几个种子</td><td><code>seeds = [0, 1, 2]</code></td></tr>
    <tr><td><code>env</code></td><td>加速器型号、显存、关键库版本</td><td>T4 16GB；torch 2.4.1；trl 0.12</td></tr>
    <tr><td><code>baseline</code></td><td>基线名与它的指标</td><td>计数 bigram，val ppl 12.3</td></tr>
    <tr><td><code>metric</code></td><td>指标定义与单位（nats/token？MAE 秒？）</td><td>交叉熵（nats/char）</td></tr>
    <tr><td><code>curve</code></td><td>曲线图的文件名与横纵轴</td><td>figs/e1_ppl.png，横轴 step</td></tr>
    <tr><td><code>claim</code></td><td>一句话结论，含不确定度</td><td>MLP 比计数 bigram 低 7.6 ppl</td></tr>
    <tr><td><code>next</code></td><td>如果是反例，下一步改什么</td><td>加 dropout / 缩小 d</td></tr>
  </tbody>
</table>

<div class="flow">
  <div class="nd hi">假设</div><div class="ar">→</div>
  <div class="nd">基线</div><div class="ar">→</div>
  <div class="nd">单变量改动</div><div class="ar">→</div>
  <div class="nd">训练/验证曲线</div><div class="ar">→</div>
  <div class="nd">显著性检验</div><div class="ar">→</div>
  <div class="nd">可复现结论</div>
</div>

<h3>2. 实验总览</h3>
<table class="tbl small">
  <thead><tr><th>实验</th><th>主题</th><th>硬件</th><th>适配时长</th><th>前置</th><th>对应模块</th></tr></thead>
  <tbody>
    <tr><td><strong>E1</strong></td><td>从 bigram 到神经语言模型</td><td>CPU 即可</td><td>10–20 分钟</td><td>无</td><td>01</td></tr>
    <tr><td><strong>E2</strong></td><td>Tokenizer 解剖与生育率</td><td>CPU 即可</td><td>10–15 分钟</td><td>E1</td><td>02</td></tr>
    <tr><td><strong>E3</strong></td><td>从零实现迷你 Transformer</td><td>T4 / CPU</td><td>30–50 分钟</td><td>E1、E2</td><td>03、04</td></tr>
    <tr><td><strong>E4</strong></td><td>LoRA 监督微调（SFT）</td><td>T4 16GB</td><td>30–60 分钟</td><td>E3</td><td>07</td></tr>
    <tr><td><strong>E5</strong></td><td>偏好优化（DPO）</td><td>T4 16GB</td><td>25–45 分钟</td><td>E4</td><td>07</td></tr>
    <tr><td><strong>E6</strong></td><td>JAX 版 miniGPT（NNX + Optax + Grain）</td><td>TPU v5e-1 / CPU</td><td>30–60 分钟</td><td>E3</td><td>06</td></tr>
    <tr><td><strong>E7</strong></td><td>模型阶梯 + 分组交叉验证 + 置换检验</td><td>CPU 即可</td><td>15–30 分钟</td><td>E1</td><td>09</td></tr>
    <tr><td><strong>E8</strong></td><td>量化与部署基准</td><td>T4 16GB（vLLM 部分需 A100/L4）</td><td>30–60 分钟</td><td>E3、E4</td><td>08、10</td></tr>
  </tbody>
</table>
<p>
  <strong>顺序建议</strong>：E1 → E2 → E3 → E7 是一条完整的主线（从概率到评估），
  E4 → E5 → E8 是第二条（从微调到部署），E6 是横切对照（同一件事在另一个生态里怎么写）。
  如果时间只够三个实验，选 <strong>E3、E7、E8</strong>。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E1 · 从 bigram 到神经语言模型：困惑度到底是怎么降下来的</h4>

  <p><strong>目标</strong>：把「困惑度」这个数字从公式变成一个你亲手算出来的量，并观察一条完整的
    「容量增加 → 训练损失下降 → 验证损失先降后升」的过拟合曲线。完成本实验后，你应该能回答：
    为什么计数式 bigram 的验证困惑度永远降不到神经网络的水平？</p>

  <p><strong>前置</strong>：无。会用 Python 与基本张量操作即可。数据用
    <a href="https://huggingface.co/datasets/roneneldan/TinyStories" target="_blank" rel="noopener">TinyStories</a>
    的前 3000 条故事，字符级建模（先绕开 tokenizer，E2 专门讲它）。</p>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>把文本切成字符，90% / 10% 划分训练集与验证集，并统计字符表大小 \(V\)。</li>
    <li>建基线：在训练集上数 bigram 频次，加 1 平滑（Laplace），得到条件概率表</li>
  </ol>
  \[ \hat P(x_t \mid x_{t-1}) = \frac{N(x_{t-1}, x_t) + 1}{\sum_{v} \big(N(x_{t-1}, v) + 1\big)} \]
  <ol start="3">
    <li>训练<strong>神经 bigram</strong>：<code>Embedding(V, d)</code> 接一个 <code>Linear(d, V)</code>，上下文长度 1。
        它与计数表建模的是同一个条件分布，但参数是连续的。</li>
    <li>训练<strong>上下文 MLP</strong>：把前 8 个字符的 embedding 拼起来送进两层 MLP。</li>
    <li>用同一组超参跑 \(d = 16\) 与 \(d = 128\) 两个宽度，比较训练/验证困惑度曲线。</li>
  </ol>

  <p><strong>可运行代码</strong>（单文件，逐格粘进 Colab）：</p>
<pre><code><span class="cm"># E1 · 从计数式 bigram 到神经语言模型（CPU 可跑，约 10–20 分钟）</span>
!pip -q install datasets torch matplotlib

import math, random
import torch, torch.nn as nn, torch.nn.functional as F
from datasets import load_dataset

SEED = 1337
random.seed(SEED); torch.manual_seed(SEED)

<span class="cm"># ---------- 1. 字符级数据 ----------</span>
ds = load_dataset("roneneldan/TinyStories", split="train[:3000]")
text = "\n".join(ds["text"])
vocab = sorted(set(text))
stoi = {c: i for i, c in enumerate(vocab)}
data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
V = len(vocab)
n_tr = int(0.9 * len(data))
train, val = data[:n_tr], data[n_tr:]
print(f"chars={len(data):,}  vocab={V}  train={len(train):,}  val={len(val):,}")

<span class="cm"># ---------- 2. 基线：计数式 bigram + Laplace 平滑 ----------</span>
N = torch.zeros((V, V))
N.index_put_((train[:-1], train[1:]), torch.ones(len(train) - 1), accumulate=True)
P = (N + 1.0)
P = P / P.sum(dim=1, keepdim=True)

def counts_ppl(table, d):
    return math.exp(float(-table[d[:-1], d[1:]].log().mean()))

print(f"计数 bigram   train ppl = {counts_ppl(P, train):8.2f}   val ppl = {counts_ppl(P, val):8.2f}")

<span class="cm"># ---------- 3. 三种模型：神经 bigram / 上下文 MLP ----------</span>
class NeuralBigram(nn.Module):
    def __init__(self, V, d=64):
        super().__init__()
        self.emb = nn.Embedding(V, d)
        self.head = nn.Linear(d, V)
    def forward(self, x):                    <span class="cm"># x: (B, 1)</span>
        return self.head(self.emb(x[:, -1]))

class ContextMLP(nn.Module):
    def __init__(self, V, ctx, d=128, hidden=256):
        super().__init__()
        self.ctx = ctx
        self.emb = nn.Embedding(V, d)
        self.net = nn.Sequential(nn.Linear(ctx * d, hidden), nn.ReLU(), nn.Linear(hidden, V))
    def forward(self, x):                    <span class="cm"># x: (B, ctx)</span>
        return self.net(self.emb(x).flatten(1))

def batch(d, ctx, bs):
    ix = torch.randint(len(d) - ctx - 1, (bs,))
    x = torch.stack([d[i:i + ctx] for i in ix])
    y = torch.stack([d[i + ctx] for i in ix])
    return x, y

@torch.no_grad()
def eval_ppl(model, d, ctx, bs=256, iters=20):
    model.eval()
    tot = 0.0
    for _ in range(iters):
        x, y = batch(d, ctx, bs)
        tot += F.cross_entropy(model(x), y).item()
    return math.exp(tot / iters)

def fit(model, ctx, steps=4000, lr=3e-3, bs=64, tag=""):
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    hist = []
    model.train()
    for s in range(1, steps + 1):
        x, y = batch(train, ctx, bs)
        loss = F.cross_entropy(model(x), y)
        opt.zero_grad(); loss.backward(); opt.step()
        if s % 500 == 0:
            tr, va = eval_ppl(model, train, ctx), eval_ppl(model, val, ctx)
            hist.append((s, tr, va))
            print(f"[{tag}] step {s:5d}  train ppl {tr:7.2f}  val ppl {va:7.2f}")
    return hist

<span class="cm"># ---------- 4. 跑三个规模 ----------</span>
torch.manual_seed(SEED)
nb = NeuralBigram(V)
print("神经 bigram 参数量:", sum(p.numel() for p in nb.parameters()))
h_nb = fit(nb, ctx=1, tag="neural-bigram")

torch.manual_seed(SEED)
small = ContextMLP(V, ctx=8, d=16)
print("MLP d=16  参数量:", sum(p.numel() for p in small.parameters()))
h_small = fit(small, ctx=8, tag="mlp-d16")

torch.manual_seed(SEED)
big = ContextMLP(V, ctx=8, d=128)
print("MLP d=128 参数量:", sum(p.numel() for p in big.parameters()))
h_big = fit(big, ctx=8, tag="mlp-d128")

<span class="cm"># ---------- 5. 画曲线（训练 vs 验证，对数纵轴）----------</span>
import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 3, figsize=(15, 4))
for a, (tag, h) in zip(ax, [("neural-bigram", h_nb), ("mlp-d16", h_small), ("mlp-d128", h_big)]):
    s = [r[0] for r in h]
    a.plot(s, [r[1] for r in h], "o-", label="train")
    a.plot(s, [r[2] for r in h], "s--", label="val")
    a.set_title(tag); a.set_yscale("log"); a.set_xlabel("step")
    a.set_ylabel("perplexity"); a.legend(); a.grid(alpha=0.3)
plt.tight_layout(); plt.show()

<span class="cm"># ---------- 6. 从训练好的 MLP 采样（确认它真的学到了东西）----------</span>
@torch.no_grad()
def sample(model, ctx, n_new=200, seed=0):
    g = torch.Generator().manual_seed(seed)
    out = [stoi["\n"]]
    for _ in range(n_new):
        x = torch.tensor([out[-ctx:]], dtype=torch.long)
        p = F.softmax(model(x), dim=-1)
        out.append(int(torch.multinomial(p[0], 1, generator=g)))
    return "".join(vocab[i] for i in out)

print(sample(big, ctx=8, n_new=200).replace("\n", " / "))</code></pre>

  <p><strong>预期输出</strong>（量级参考，你的数字会随数据切片与种子浮动；请以实际输出为准）：</p>
<pre><code>chars=1,4xx,xxx  vocab=97  train=1,2xx,xxx  val=1xx,xxx
计数 bigram   train ppl =    11.4x   val ppl =    12.3x
神经 bigram 参数量: 4xxxx
[neural-bigram] step  4000  train ppl   11.2x  val ppl   11.9x
MLP d=16  参数量: 5xxxx
[mlp-d16] step  4000  train ppl    6.9x  val ppl    7.2x
MLP d=128 参数量: 3xxxxx
[mlp-d128] step  4000  train ppl    4.2x  val ppl    4.6x</code></pre>
  <p>
    三条曲线的形状比数字本身更重要：神经 bigram 与计数 bigram <strong>几乎重合</strong>（它们建模的是同一个条件分布，
    上界由「只看前一个字符」决定）；MLP 一上来就跨过了这个上界——因为 \(x_{t-8:t}\) 提供的信息远多于 \(x_{t-1}\)。
    而 \(d = 128\) 的训练损失仍在下降、验证损失开始变平，这就是过拟合的起点。
  </p>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>怎么记</th></tr></thead>
    <tbody>
      <tr><td>三种模型的参数量</td><td>参数量是横轴，不是荣誉</td><td><code>sum(p.numel())</code> 三个数</td></tr>
      <tr><td>train/val ppl 的最终值与最小值</td><td>差距 = 泛化间隙</td><td>取最后一点与曲线最低点</td></tr>
      <tr><td>验证损失的拐点步数</td><td>过拟合开始的位置，与数据量直接相关</td><td>第一次 val 回升的 step</td></tr>
      <tr><td>上下文长度 CTX</td><td>它比容量更决定上限</td><td>把 CTX 从 8 改成 16 再跑一次</td></tr>
      <tr><td>种子</td><td>允许你复现这条曲线</td><td>写进 notes</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>把 CTX 从 8 增到 32，参数量按 \(32d \times 256\) 线性增长。验证困惑度的下降是否值得这些参数？
        用「每千参数的 ppl 改善」来比较。</li>
    <li>把 Laplace 平滑的常数 1 换成 0.01 与 100，观察验证困惑度如何变化。这说明平滑系数其实是一个正则化强度。</li>
    <li>把 MLP 换成三层（加一个隐藏层），观察验证损失是否下降。如果没有，为什么？</li>
    <li>预测：如果把训练集缩小到 300 条故事，过拟合会提前还是推后？先写预测，再跑实验。</li>
  </ol>
</section>

<div class="acc" data-t="E1 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>loss 完全不降</strong>：最常见原因是学习率写成 <code>3e-1</code> 而不是 <code>3e-3</code>；
          第二常见是忘了 <code>softmax</code> 之前的维度对齐——<code>F.cross_entropy</code> 要求输入形状
          <code>(B, V)</code>、标签形状 <code>(B,)</code>。</li>
      <li><strong>验证困惑度一直是 <code>inf</code></strong>：因为某个字符在训练集里没出现过，
          <code>stoi</code> 里没有它。正确做法是用<strong>训练集</strong>的字符表去映射验证集，
          遇到未知字符回退到 <code>&lt;unk&gt;</code>，而不是对全部数据建字符表。</li>
      <li><strong>Colab 内存爆掉</strong>：<code>N = torch.zeros((V, V))</code> 在 \(V = 5\) 万时是 100 亿个 float，
          必然 OOM。解决办法是字符级（\(V \approx 100\)）、或者把计数矩阵换成 <code>torch.sparse</code>。</li>
      <li><strong>曲线看起来「太好了」</strong>：检查是不是在 <code>eval_ppl</code> 里忘了 <code>model.eval()</code>，
          或者验证集与训练集有重叠（切片 + 换行拼接时很容易发生）。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E2 · Tokenizer 解剖：从「生育率 fertility」看成本与上下文</h4>

  <p><strong>目标</strong>：亲手拆开两个 tokenizer，量出<strong>生育率（fertility）</strong>——每个字符（或每个词）
    要花掉多少个 token。你会看到同一句中文在 GPT-2 的 <code>r50k</code> 词表下与在
    Qwen 的 byte-level BPE 词表下，token 数可以相差 3 倍。这个倍率会同时影响<strong>账单</strong>与<strong>上下文预算</strong>。</p>

  <p><strong>前置</strong>：E1 完成即可。本实验只用 CPU。</p>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>用 <code>tiktoken</code> 载入 <code>gpt2</code>（r50k）、<code>cl100k_base</code>、<code>o200k_base</code> 三个 BPE 词表。</li>
    <li>对术语串「生育率 fertility」逐 token 打印切分结果。</li>
    <li>用 Hugging Face 的 <code>AutoTokenizer</code> 载入一个中文友好的 byte-level BPE
        （Qwen2.5）与一个 WordPiece 分词器（<code>bert-base-chinese</code>），做同样的事。</li>
    <li>在中文句、英文句、中英混排句上分别计算：token 数、token/字符比、bytes/token。</li>
    <li>把 token 数换算成钱与上下文：假设输入单价 \(p\) 美元 / 百万 token，一段 1 万字的文档要多少钱？
        在 8192 的上下文里，同一段文本能放几遍？</li>
  </ol>

  <p><strong>可运行代码</strong>：</p>
<pre><code><span class="cm"># E2 · Tokenizer 解剖（CPU，约 10–15 分钟）</span>
!pip -q install -U tiktoken transformers tokenizers pandas

import tiktoken, pandas as pd
from transformers import AutoTokenizer

ZH  = "生育率 fertility：我们把过渡时长 T* 的预测误差压到 8% 以下，同时保留共振峰的连续性。"
EN  = "Fertility measures how many tokens a tokenizer spends per unit of text."
MIX = "在 Colab 上，crossfade 的 T* 通常是 8 到 16 拍。"

<span class="cm"># ---------- 1. tiktoken 侧：三个 BPE 词表 ----------</span>
encs = {
    "gpt2-r50k":   tiktoken.get_encoding("gpt2"),
    "cl100k_base": tiktoken.get_encoding("cl100k_base"),
    "o200k_base":  tiktoken.get_encoding("o200k_base"),
}

def stats(n_tok, text):
    n_chr = len(text)
    n_byt = len(text.encode("utf-8"))
    return dict(tokens=n_tok, chars=n_chr, bytes=n_byt,
                tok_per_char=round(n_tok / n_chr, 3),
                bytes_per_tok=round(n_byt / n_tok, 2))

<span class="cm"># ---------- 2. 逐个词表拆解「生育率 fertility」----------</span>
PROBE = "生育率 fertility"
for name, enc in encs.items():
    ids = enc.encode(PROBE)
    pieces = [enc.decode([i]) for i in ids]
    print(f"{name:12s} n={len(ids):2d}  {pieces}")

<span class="cm"># 只切「生育率」三个字：更能暴露中文的切分策略</span>
for s in ["生育率", " fertility", "生育率 fertility", "玻璃音色"]:
    for name, enc in encs.items():
        ids = enc.encode(s)
        print(f"{s!r:20s} {name:12s} n={len(ids):2d}  {[enc.decode([i]) for i in ids]}")

<span class="cm"># ---------- 3. Hugging Face 侧：byte-level BPE 与 WordPiece ----------</span>
hf = {
    "Qwen2.5-BPE":       AutoTokenizer.from_pretrained("Qwen/Qwen2.5-1.5B"),
    "bert-base-chinese": AutoTokenizer.from_pretrained("bert-base-chinese"),
}
for name, tok in hf.items():
    ids = tok(PROBE)["input_ids"]
    print(f"{name:18s} n={len(ids):2d}  {tok.convert_ids_to_tokens(ids)}")
    print(f"{'':18s} special={tok.all_special_tokens[:8]}")
    print(f"{'':18s} vocab_size={tok.vocab_size:,}  len(tokenizer)={len(tok):,}")

<span class="cm"># ---------- 4. 生育率总表 ----------</span>
rows = []
for tag, text in [("中文", ZH), ("英文", EN), ("混排", MIX)]:
    for name, enc in encs.items():
        rows.append(dict(corpus=tag, tokenizer=name, **stats(len(enc.encode(text)), text)))
    for name, tok in hf.items():
        rows.append(dict(corpus=tag, tokenizer=name, **stats(len(tok(text)["input_ids"]), text)))
df = pd.DataFrame(rows)
print(df.pivot(index="tokenizer", columns="corpus", values="tok_per_char"))

<span class="cm"># ---------- 5. 换算成钱与上下文 ----------</span>
PRICE_PER_MTOK = 0.50          <span class="cm"># 换成你实际用的模型单价</span>
DOC_CHARS = 10000              <span class="cm"># 一篇 1 万字的中文长文</span>
CONTEXT = 8192

doc = ZH * (DOC_CHARS // len(ZH) + 1)
doc = doc[:DOC_CHARS]
for name, enc in encs.items():
    k = len(enc.encode(doc))
    print(f"{name:12s} tokens={k:6,d}  cost_usd={k / 1e6 * PRICE_PER_MTOK:.4f}"
          f"  每 8192 上下文可放 {CONTEXT / k:.2f} 份该文档")
for name, tok in hf.items():
    k = len(tok(doc)["input_ids"])
    print(f"{name:18s} tokens={k:6,d}  cost_usd={k / 1e6 * PRICE_PER_MTOK:.4f}"
          f"  每 8192 上下文可放 {CONTEXT / k:.2f} 份该文档")</code></pre>

  <p><strong>预期输出</strong>（示例格式，具体 token 串与你的库版本有关）：</p>
<pre><code>gpt2-r50k    n= 9  ['生', '育', '率', ' fertility', ' rate'... ]   <span class="cm"># 中文一字多 token</span>
cl100k_base  n= 4  ['生育', '率', ' fertility']
o200k_base   n= 3  ['生育率', ' fertility']

tokenizer           中文   英文   混排
gpt2-r50k          1.9x  0.25   1.2x     <span class="cm"># tok/char</span>
cl100k_base        1.2x  0.24   0.8x
o200k_base         0.8x  0.23   0.5x
Qwen2.5-BPE        0.6x  0.24   0.4x
bert-base-chinese  1.0x  0.45   0.9x

gpt2-r50k    tokens=19,xxx  cost=$0.0095  每 8192 上下文可放 0.42 份该文档
Qwen2.5-BPE  tokens= 6,xxx  cost=$0.0031  每 8192 上下文可放 1.31 份该文档</code></pre>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>典型量级</th></tr></thead>
    <tbody>
      <tr><td>中文 tok/char</td><td>决定中文语料的真实成本</td><td>GPT-2 ≈ 1.5–2.2；Qwen ≈ 0.6–0.8</td></tr>
      <tr><td>英文 tok/word</td><td>英文族的经验值，便于心算</td><td>≈ 1.3（每词）</td></tr>
      <tr><td>bytes/token</td><td>跨 tokenizer 唯一可比的刻度</td><td>GPT-2 ≈ 2–3；o200k ≈ 4–5</td></tr>
      <tr><td>特殊 token 清单</td><td>对话模板与 padding 都依赖它</td><td><code>&lt;|im_start|&gt;</code>、<code>&lt;|endoftext|&gt;</code>、<code>[PAD]</code></td></tr>
      <tr><td>vocab_size 与 len(tokenizer)</td><td>二者常常不等，差的就是后加的特殊 token</td><td>151643 / 151665</td></tr>
      <tr><td>每 8192 上下文能放几份文档</td><td>上下文预算是钱，不是「白送」</td><td>见上表</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>为什么 <code>gpt2-r50k</code> 在中文上这么差？提示：词表是在 2019 年的英文网页语料上学的，
        中文字符只能靠<strong>字节</strong>拼回来，一个汉字 3 个字节 → 通常 2 个以上 token。</li>
    <li>如果要把上下文从 8192 扩到 32768，换 tokenizer 与换位置编码（RoPE 外推）哪个更省？
        用「每美元可用字符数」算一下。</li>
    <li>tokenizer 会影响 loss 数值吗？用同一个模型权重、两套 tokenizer 各算一次 bits/byte，看差异。</li>
    <li>构造一个 8 个字符的中文串，让 <code>gpt2-r50k</code> 把它切成<strong>最多</strong>个 token。你有什么切分策略？</li>
  </ol>
</section>

<div class="acc" data-t="E2 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong><code>convert_ids_to_tokens</code> 报越界</strong>：你用的是 <code>tiktoken</code> 的 id 去查 HF 的 tokenizer。
          两套词表的 id 完全不同，必须全程配对使用。</li>
      <li><strong>中文 tok/char 算成了 1.0</strong>：很可能你的「字符数」用的是
          <code>len(text.encode("utf-8"))</code>（字节数）而不是 <code>len(text)</code>。两者相差 3 倍。</li>
      <li><strong>Qwen 分词器输出里出现大量 <code>Ġ</code> 或 <code>Ċ</code></strong>：这是 byte-level BPE 对空格与换行的
          可打印编码，属于正常现象，不要当成 bug。</li>
      <li><strong>下载被墙或超时</strong>：给 <code>AutoTokenizer.from_pretrained</code> 加
          <code>token=hf_token</code>，或先 <code>export HF_HOME=/content/hf</code> 把缓存放到本地盘。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E3 · 从零实现迷你 Transformer：手算参数量并与程序对照</h4>

  <p><strong>目标</strong>：把模块 03、04 的每一个部件亲手写一遍——词嵌入、可学习位置嵌入、
    因果自注意力、MLP、残差、LayerNorm——并在 TinyStories 上真的训练它。
    本实验最硬的一项要求是：<strong>先在纸上（或注释里）写出参数量的解析式，再让代码把它算出来，两者必须相等</strong>。
    做不到相等，就说明你对结构的理解还有缺口。</p>

  <p><strong>前置</strong>：E1（会写训练循环）、E2（知道字符级与 token 级的区别）。T4 GPU 约 20 分钟可跑完；
    纯 CPU 请把 <code>steps</code> 减到 500。</p>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>实现 <code>CausalSelfAttention</code>：一次 <code>Linear(d, 3d)</code> 产出 q/k/v，
        拆头、缩放点积、<strong>用下三角掩码把未来位置置为 \(-\infty\)</strong>、softmax、再合并。</li>
    <li>实现 <code>Block</code>：<code>x = x + attn(ln1(x))</code>，<code>x = x + mlp(ln2(x))</code>（pre-LN 结构）。</li>
    <li>实现 <code>MiniGPT</code>：token embedding + 位置 embedding + \(L\) 个 Block + 最终 LayerNorm + 输出头，
        并把输出头与 token embedding <strong>权重绑定（weight tying）</strong>。</li>
    <li>写出参数量解析式，与 <code>sum(p.numel())</code> 对照。</li>
    <li>训练 2000 步，画 train/val 曲线，并让模型续写 200 个字符。</li>
  </ol>

  <section class="blk blk-m">
    <h4><span class="ic">∑</span>参数量解析式（先自己推，再对照代码）</h4>
    <p>设词表 \(V\)、隐藏维度 \(d\)、层数 \(L\)、最大序列长度 \(T\)。逐块相加：</p>
    \[ N_{\text{emb}} = Vd + Td \]
    \[ N_{\text{attn}} = \underbrace{3d^2}_{qkv} + \underbrace{d^2}_{proj},\qquad
       N_{\text{mlp}} = \underbrace{d\cdot 4d + 4d}_{fc_1} + \underbrace{4d\cdot d + d}_{fc_2} \]
    \[ N_{\text{block}} = N_{\text{attn}} + N_{\text{mlp}} + \underbrace{2\cdot 2d}_{\text{2 LayerNorms}}
       \;=\; 12d^2 + 9d \]
    \[ N_{\text{total}} = Vd + Td + L\,(12d^2 + 9d) + 2d \]
    <p>
      最后一项 \(2d\) 是最终 LayerNorm 的增益与偏置。输出头与 token embedding 绑定，
      <strong>不额外占用参数</strong>——这也是 <code>sum(p.numel())</code> 会把绑定权重只数一次的原因。
      若把 \(d = 128,\ L = 4,\ V = 97,\ T = 64\) 代进去，得到
      \(N_{\text{total}} = 12{,}416 + 8{,}192 + 4\,(196{,}608 + 1{,}152) + 256 = 811{,}936\)。
    </p>
  </section>

  <p><strong>可运行代码</strong>：</p>
<pre><code><span class="cm"># E3 · 从零实现迷你 Transformer（T4 约 20 分钟；CPU 请把 STEPS 改成 500）</span>
!pip -q install datasets torch matplotlib

import math, random
import torch, torch.nn as nn, torch.nn.functional as F
from datasets import load_dataset

SEED = 1337
random.seed(SEED); torch.manual_seed(SEED)
DEV = "cuda" if torch.cuda.is_available() else "cpu"

<span class="cm"># ---------- 数据：字符级 TinyStories ----------</span>
ds = load_dataset("roneneldan/TinyStories", split="train[:4000]")
text = "\n".join(ds["text"])
vocab = sorted(set(text))
stoi = {c: i for i, c in enumerate(vocab)}
itos = {i: c for c, i in stoi.items()}
data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
V = len(vocab)
n_tr = int(0.9 * len(data))
train, val = data[:n_tr], data[n_tr:]
print(f"vocab={V}  train={len(train):,}  val={len(val):,}  device={DEV}")

<span class="cm"># ---------- 组件 1：因果自注意力 ----------</span>
class CausalSelfAttention(nn.Module):
    def __init__(self, d, h, T, dropout=0.1):
        super().__init__()
        assert d % h == 0, "d 必须能被头数整除"
        self.h, self.dh = h, d // h
        self.qkv  = nn.Linear(d, 3 * d, bias=False)
        self.proj = nn.Linear(d, d, bias=False)
        self.drop = nn.Dropout(dropout)
        self.register_buffer("mask", torch.tril(torch.ones(T, T)).view(1, 1, T, T))
    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        q = q.view(B, T, self.h, self.dh).transpose(1, 2)      <span class="cm"># (B, h, T, dh)</span>
        k = k.view(B, T, self.h, self.dh).transpose(1, 2)
        v = v.view(B, T, self.h, self.dh).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.dh)   <span class="cm"># (B, h, T, T)</span>
        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float("-inf"))
        att = self.drop(F.softmax(att, dim=-1))
        y = (att @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.proj(y)

<span class="cm"># ---------- 组件 2：一个 Block（pre-LN + 残差）----------</span>
class Block(nn.Module):
    def __init__(self, d, h, T, dropout=0.1):
        super().__init__()
        self.ln1  = nn.LayerNorm(d)
        self.ln2  = nn.LayerNorm(d)
        self.attn = CausalSelfAttention(d, h, T, dropout)
        self.mlp  = nn.Sequential(
            nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d), nn.Dropout(dropout))
    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x

<span class="cm"># ---------- 组件 3：MiniGPT ----------</span>
class MiniGPT(nn.Module):
    def __init__(self, vocab, d=128, h=4, L=4, T=64, dropout=0.1):
        super().__init__()
        self.T    = T
        self.tok  = nn.Embedding(vocab, d)
        self.pos  = nn.Embedding(T, d)
        self.blocks = nn.Sequential(*[Block(d, h, T, dropout) for _ in range(L)])
        self.lnf  = nn.LayerNorm(d)
        self.head = nn.Linear(d, vocab, bias=False)
        self.head.weight = self.tok.weight          <span class="cm"># weight tying</span>
        self.apply(self._init)
    def _init(self, m):
        if isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, std=0.02)
            if m.bias is not None: nn.init.zeros_(m.bias)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, std=0.02)
    def forward(self, idx, targets=None):
        B, T = idx.shape
        x = self.tok(idx) + self.pos(torch.arange(T, device=idx.device))
        x = self.blocks(x)
        logits = self.head(self.lnf(x))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss

<span class="cm"># ---------- 4. 手算 vs 程序统计 ----------</span>
def hand_params(V, d, L, T):
    emb = V * d + T * d
    per_block = 12 * d * d + 9 * d
    return emb + L * per_block + 2 * d

D, H, L, T = 128, 4, 4, 64
m = MiniGPT(V, d=D, h=H, L=L, T=T).to(DEV)
prog = sum(p.numel() for p in m.parameters())
hand = hand_params(V, D, L, T)
print(f"程序统计 = {prog:,}   手算 = {hand:,}   差值 = {prog - hand:,}")

b0 = m.blocks[0]
print("单层分解:")
for nm, mod in b0.named_children():
    print(f"  {nm:6s} {sum(p.numel() for p in mod.parameters()):9,d}")
print(f"  {'合计':6s} {sum(p.numel() for p in b0.parameters()):9,d}")
print(f"token emb {m.tok.weight.numel():,}   pos emb {m.pos.weight.numel():,}"
      f"   最终 LN {sum(p.numel() for p in m.lnf.parameters())}")

<span class="cm"># ---------- 5. 训练 ----------</span>
STEPS, BS, LR = 2000, 32, 3e-3
def get_batch(split):
    d = train if split == "train" else val
    ix = torch.randint(len(d) - T - 1, (BS,))
    x = torch.stack([d[i:i + T] for i in ix]).to(DEV)
    y = torch.stack([d[i + 1:i + T + 1] for i in ix]).to(DEV)
    return x, y

@torch.no_grad()
def estimate_loss(iters=40):
    m.eval(); out = {}
    for split in ("train", "val"):
        tot = 0.0
        for _ in range(iters):
            x, y = get_batch(split)
            _, loss = m(x, y)
            tot += loss.item()
        out[split] = tot / iters
    m.train()
    return out

opt = torch.optim.AdamW(m.parameters(), lr=LR, betas=(0.9, 0.95), weight_decay=0.1)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=LR, total_steps=STEPS, pct_start=0.1)
hist = []
for step in range(1, STEPS + 1):
    x, y = get_batch("train")
    _, loss = m(x, y)
    opt.zero_grad(set_to_none=True); loss.backward()
    torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0)
    opt.step(); sched.step()
    if step % 250 == 0:
        e = estimate_loss()
        hist.append((step, e["train"], e["val"]))
        print(f"step {step:5d}  train {e['train']:.4f} ({math.exp(e['train']):5.2f})"
              f"   val {e['val']:.4f} ({math.exp(e['val']):5.2f})  lr {sched.get_last_lr()[0]:.2e}")

import matplotlib.pyplot as plt
s = [r[0] for r in hist]
plt.plot(s, [r[1] for r in hist], "o-", label="train")
plt.plot(s, [r[2] for r in hist], "s--", label="val")
plt.xlabel("step"); plt.ylabel("cross-entropy (nats/char)")
plt.yscale("log"); plt.legend(); plt.grid(alpha=0.3); plt.show()

<span class="cm"># ---------- 6. 续写：确认它学到了英语的局部结构 ----------</span>
@torch.no_grad()
def generate(prompt="Once upon a time", n_new=200, temp=0.8, seed=0):
    g = torch.Generator(device=DEV).manual_seed(seed)
    idx = torch.tensor([[stoi[c] for c in prompt]], device=DEV)
    out = list(idx[0].tolist())
    for _ in range(n_new):
        ctx = torch.tensor([out[-T:]], device=DEV)
        logits, _ = m(ctx)
        p = F.softmax(logits[0, -1] / temp, dim=-1)
        out.append(int(torch.multinomial(p, 1, generator=g)))
    return "".join(itos[i] for i in out)

m.eval()
print(generate())</code></pre>

  <p><strong>预期输出</strong>：</p>
<pre><code>vocab=97  train=1,xxx,xxx  val=1xx,xxx  device=cuda
程序统计 = 811,936   手算 = 811,936   差值 = 0
单层分解:
  ln1      256
  ln2      256
  attn      131,072
  mlp       263,x x x
  合计      394,x x x
token emb 12,416   pos emb 8,192   最终 LN 256
step   250  train 2.xxxx ( 9.xx)   val 2.xxxx ( 9.xx)  lr 2.1xe-03
step  2000  train 1.xxxx ( 4.xx)   val 1.xxxx ( 4.xx)  lr 3.0xe-07</code></pre>
  <p>
    <strong>关键检查点</strong>：手算与程序统计必须<strong>完全相等</strong>（差值 0）。
    如果差值等于 \(Vd\)，说明你忘了 weight tying；如果差值等于 \(12d^2 + 9d\) 的整数倍，
    说明你对层数的理解偏了一层。
  </p>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td>手算参数量与程序值</td><td>结构理解的直接检验</td><td>811,936 / 811,936</td></tr>
      <tr><td>参数在各组件的占比</td><td>MLP 通常占每层的 2/3，注意力只占 1/3</td><td>mlp 66.6%</td></tr>
      <tr><td>tokens/s 与峰值显存</td><td>为 E8 的部署基准留下对照</td><td>1.2e5 tok/s，2.1 GB</td></tr>
      <tr><td>最终 train/val 交叉熵</td><td>泛化间隙</td><td>1.31 / 1.42 nats/char</td></tr>
      <tr><td>激活值随 \(T\) 的增长</td><td>把 \(T\) 从 64 改成 256，看显存如何变</td><td>2.1 → 7.8 GB</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>去掉 <code>masked_fill</code>，训练损失会掉得<em>更快</em>而验证困惑度变得毫无意义。为什么？
        （提示：模型可以直接「看见答案」。）</li>
    <li>把 pre-LN 换成 post-LN（<code>x = ln(x + attn(x))</code>），在不加 warmup 的情况下会发生什么？</li>
    <li>位置嵌入用可学习的 \(T \times d\) 表。如果推理时给出长度 65 的序列会怎样？写代码证明你的判断。</li>
    <li>按模块 04 的公式估算 \(L = 4,\ d = 128\) 时每 token 的 FLOPs，并与实测 tokens/s 对照，算出 MFU。</li>
  </ol>
</section>

<div class="acc" data-t="E3 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>CUDA out of memory</strong>：先降 <code>BS</code>（32 到 8），再降 <code>T</code>。
          注意 <code>estimate_loss</code> 本身也占显存，用 <code>torch.no_grad()</code> 包住它。</li>
      <li><strong>loss 变成 <code>nan</code></strong>：softmax 前忘了除以 <code>sqrt(dh)</code>，
          或者掩码用了 <code>-1e9</code> 却没在 fp16 下考虑下溢。用 <code>float("-inf")</code> 且保持 fp32 计算注意力分数。</li>
      <li><strong>手算与程序统计差一个 \(Vd\)</strong>：weight tying 写成了
          <code>self.head.weight = self.tok.weight</code> 之外的写法（例如 <code>nn.Parameter(...)</code> 复制），
          那样两份权重会独立存在。</li>
      <li><strong>CUDA 版本不匹配</strong>：<code>!pip install torch</code> 装成 CPU 版，
          <code>torch.cuda.is_available()</code> 返回 False。先跑 <code>!nvidia-smi</code> 看驱动，
          再用 Colab 预装的 torch，不要盲目升级。</li>
      <li><strong>生成结果全是同一个字符</strong>：温度太低或模型未收敛。先把 <code>temp</code> 提到 0.8–1.0，
          再确认 <code>m.eval()</code> 已调用（否则 dropout 会污染采样）。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E4 · 用 TRL 做 LoRA 监督微调（SFT）：把可训练参数压到 2%</h4>

  <p><strong>目标</strong>：跑通一条工业界最常用的微调流水线：<code>datasets</code> 载入指令数据 →
    <code>SFTTrainer</code> + <code>LoraConfig</code> 训练 → 保存 adapter → 加载并与基座模型对比输出。
    同时量出一个关键数字：<strong>可训练参数占比</strong>。</p>

  <p><strong>前置</strong>：E3（知道模型内部结构）。需要一个 Hugging Face 账号与 read token。
    建议在 T4 上跑，base 模型选 0.5B 级别。</p>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>登录 Hugging Face：<code>notebook_login()</code> 或 <code>huggingface-cli login</code>。</li>
    <li>载入 tokenizer，<strong>设置 <code>pad_token</code></strong>（因果 LM 的 tokenizer 常常没有它，这是最常见的翻车点）。</li>
    <li>载入一个小型对话式指令数据集，让 <code>SFTTrainer</code> 自动套用 chat template。</li>
    <li>配置 <code>LoraConfig</code>：<code>r = 16</code>、<code>lora_alpha = 32</code>、<code>lora_dropout = 0.05</code>，
        target 覆盖注意力的全部投影与 MLP 的三层投影。</li>
    <li>训练、保存 adapter，重新加载后与基座模型对同一批 prompt 的输出做逐条对比。</li>
  </ol>

  <p><strong>可运行代码</strong>：</p>
<pre><code><span class="cm"># E4 · TRL + LoRA 监督微调（T4 16GB，约 30–60 分钟）</span>
!pip -q install -U "trl" "transformers" "datasets" "peft" "accelerate" bitsandbytes

import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, PeftModel
from trl import SFTTrainer, SFTConfig

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
OUT = "out/sft-lora"
SEED = 1337

<span class="cm"># ---------- 1. tokenizer：先修 pad_token ----------</span>
tok = AutoTokenizer.from_pretrained(MODEL_ID)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
tok.padding_side = "right"
print("pad:", tok.pad_token, "| eos:", tok.eos_token, "| chat_template:",
      bool(tok.chat_template))

<span class="cm"># ---------- 2. 数据：对话式指令数据，SFTTrainer 自动套模板 ----------</span>
ds = load_dataset("trl-lib/Capybara", split="train[:2000]")
print(ds)
print("第一条样本的字段:", list(ds[0].keys()))

<span class="cm"># ---------- 3. LoRA 配置 ----------</span>
peft_cfg = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
)

<span class="cm"># ---------- 4. 训练参数 ----------</span>
cfg = SFTConfig(
    output_dir=OUT,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,      <span class="cm"># 有效批 = 16</span>
    num_train_epochs=1,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    logging_steps=10,
    save_strategy="epoch",
    bf16=torch.cuda.is_bf16_supported(),
    fp16=not torch.cuda.is_bf16_supported(),
    max_length=512,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    report_to="none",
    seed=SEED,
)

trainer = SFTTrainer(
    model=MODEL_ID,                     <span class="cm"># 传字符串：TRL 会自己加载</span>
    args=cfg,
    train_dataset=ds,
    peft_config=peft_cfg,
)

<span class="cm"># ---------- 5. 训练前先数清楚可训练参数 ----------</span>
tr = sum(p.numel() for p in trainer.model.parameters() if p.requires_grad)
tot = sum(p.numel() for p in trainer.model.parameters())
print(f"可训练 {tr:,} / 总计 {tot:,} = {100 * tr / tot:.4f}%")

trainer.train()
trainer.save_model(OUT + "/adapter")
tok.save_pretrained(OUT + "/adapter")
print("adapter 已保存，大小约", tr * 2 / 2**20, "MiB（bf16）")

<span class="cm"># ---------- 6. 加载 adapter，与基座模型逐条对比 ----------</span>
PROMPTS = [
    "用一句话解释什么是交叉淡化的过渡时长 T*。",
    "把这句话改写成数学定义：过渡越平滑，听感越自然。",
]

def chat(model, prompt, max_new_tokens=96):
    msgs = [{"role": "user", "content": prompt}]
    ids = tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(ids, max_new_tokens=max_new_tokens, do_sample=False,
                             pad_token_id=tok.pad_token_id)
    return tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True)

base = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16, device_map="auto")
ft = PeftModel.from_pretrained(base, OUT + "/adapter", is_trainable=False)
ft.eval()

for p in PROMPTS:
    print("=" * 72)
    print("PROMPT :", p)
    print("BASE   :", chat(base, p).replace("\n", " ")[:220])
    print("LoRA   :", chat(ft, p).replace("\n", " ")[:220])

<span class="cm"># ---------- 7. 消融：r 的影响（固定其余一切）----------</span>
for r in (4, 16, 64):
    c = LoraConfig(r=r, lora_alpha=2 * r, lora_dropout=0.05, bias="none",
                   task_type="CAUSAL_LM",
                   target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                                   "gate_proj", "up_proj", "down_proj"])
    t = SFTTrainer(model=MODEL_ID, args=SFTConfig(output_dir=f"out/r{r}", max_steps=20,
                    per_device_train_batch_size=2, learning_rate=2e-4, logging_steps=10,
                    report_to="none", seed=SEED, max_length=512), train_dataset=ds, peft_config=c)
    n = sum(p.numel() for p in t.model.parameters() if p.requires_grad)
    print(f"r={r:3d}  可训练参数 = {n:,}")</code></pre>

  <p><strong>预期输出</strong>：</p>
<pre><code>pad: &lt;|endoftext|&gt; | eos: &lt;|endoftext|&gt; | chat_template: True
可训练 8,798,208 / 总计 494,032,768 = 1.7809%
adapter 已保存，大小约 16.8 MiB（bf16）
{'loss': 1.9xx, 'grad_norm': 0.8xx, 'learning_rate': 0.00019, 'epoch': 0.04}
...
r=  4  可训练参数 = 2,199,552
r= 16  可训练参数 = 8,798,208
r= 64  可训练参数 = 35,192,832</code></pre>
  <p>
    注意 <code>r</code> 与参数量是<strong>严格线性</strong>的（64/16 = 4 倍）。
    这个线性关系让你可以先用小 \(r\) 做超参搜索，再按预算放大。
  </p>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td>可训练参数占比</td><td>LoRA 的核心卖点，也是显存的主要来源</td><td>1.78%</td></tr>
      <tr><td>adapter 文件大小</td><td>决定 Hub 存储与分发成本</td><td>16.8 MiB</td></tr>
      <tr><td>有效批大小</td><td>= batch × 累积步数 × 卡数</td><td>16</td></tr>
      <tr><td>train loss 曲线</td><td>SFT 通常 1 个 epoch 就够，多轮容易复读</td><td>2.4 → 1.6</td></tr>
      <tr><td>基座 vs 微调的输出对照</td><td>证明「行为改变」而不是「loss 更低」</td><td>见对照表</td></tr>
      <tr><td>显存峰值</td><td>与 <code>gradient_checkpointing</code> 开关对照</td><td>开 9.1 GB / 关 14.3 GB</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>把 <code>target_modules</code> 只留 <code>q_proj, v_proj</code>（原版 LoRA 论文的做法），
        参数量降到多少？输出质量的主观差异有多大？</li>
    <li><code>lora_alpha / r</code> 是实际生效的缩放系数。固定 \(r = 16\)，把 alpha 从 16 扫到 128，
        观察 loss 曲线的震荡程度。</li>
    <li>把 <code>num_train_epochs</code> 提到 3，训练损失会继续降，但生成的多样性往往下降。用一个你定义的
        「输出多样性」指标（例如 distinct-3）把它量化出来。</li>
    <li>训练完成后，用 <code>merge_and_unload()</code> 把 adapter 合回权重，比较推理速度与显存的差别。</li>
  </ol>
</section>

<div class="acc" data-t="E4 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>报错 <code>Cannot handle batch sizes &gt; 1 when using padding</code></strong>：
          典型的 <code>pad_token</code> 未设置。因果 LM 的 tokenizer 默认没有 pad token，
          必须显式令 <code>tok.pad_token = tok.eos_token</code>，并同步设置 <code>model.config.pad_token_id</code>。</li>
      <li><strong>CUDA out of memory</strong>：按顺序尝试——把 <code>per_device_train_batch_size</code> 降到 1、
          打开 <code>gradient_checkpointing</code>、把 <code>max_length</code> 从 512 降到 256、改用 4-bit 加载。</li>
      <li><strong>loss 完全不降 / 一直是常数</strong>：check 你的数据字段名。<code>SFTTrainer</code> 需要
          <code>messages</code>（对话）或 <code>text</code> 字段；如果数据集只有 <code>prompt</code>/<code>response</code>，
          需要先 <code>map</code> 成 <code>messages</code> 列表。</li>
      <li><strong><code>ImportError: cannot import name ... from trl</code></strong>：TRL 的 API 与版本强绑定。
          先 <code>pip show trl</code> 看版本，再对着同版本的文档页读——不要拿旧教程的代码打新版本。</li>
      <li><strong>Hub 推送失败</strong>：token 权限不足（需要 write），或模型名与你的命名空间冲突。
          用 <code>push_to_hub(..., private=True)</code> 先验证通路。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E5 · 用 TRL 做偏好优化（DPO）：观察 margin 与 β 的作用</h4>

  <p><strong>目标</strong>：把「人类偏好」变成一个可训练的损失。你要亲手构造一个小型偏好对数据集
    （<code>prompt</code> / <code>chosen</code> / <code>rejected</code>），跑 <code>DPOTrainer</code>，
    并盯着两个量看：<strong>implicit reward 的 margin</strong> 与它的<strong>准确率</strong>。
    同时回答：\(\beta\) 到底在控制什么？</p>

  <p><strong>前置</strong>：E4（LoRA 与 <code>SFTTrainer</code> 已跑通）。T4 上约 25 分钟。</p>

  <section class="blk blk-m">
    <h4><span class="ic">∑</span>DPO 在优化什么</h4>
    <p>DPO 完全绕开了显式的奖励模型。它直接用策略与参考模型的<strong>对数比</strong>当作隐式奖励：</p>
    \[ \hat r_\theta(x, y) \;=\; \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\mathrm{ref}}(y \mid x)} \]
    <p>损失则是一个二分类的 logistic 形式，把「chosen 的隐式奖励高于 rejected」这件事当作分类目标：</p>
    \[ \mathcal{L}_{\mathrm{DPO}} = -\,\mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}}
       \Bigg[ \log \sigma \Big( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\mathrm{ref}}(y_w \mid x)}
       - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\mathrm{ref}}(y_l \mid x)} \Big) \Bigg] \]
    <p>
      指数里那一项就是 <strong>margin</strong>。它可以从 RLHF 的目标推出来：KL 正则化的奖励最大化问题
      有闭式最优解，而 DPO 只是把这个最优解代回原目标后剩下的、只含 \(\pi_\theta\) 的损失。
      \(\beta\) 是 KL 惩罚的强度：\(\beta \to 0\) 相当于几乎不约束（会漂移到参考分布之外，出现退化输出）；
      \(\beta \to \infty\) 则把策略钉死在参考模型上，margin 学不动。
    </p>
  </section>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>构造 14 组偏好对：每条给定一个数学/建模问题，<code>chosen</code> 是正确答案加推理过程，
        <code>rejected</code> 是一个看似合理但错误的答案。</li>
    <li>用 <code>DPOTrainer</code> + LoRA 训练，<code>ref_model = None</code>（TRL 会自动用「关掉 adapter 的基座」当参考模型，
        省掉一份模型显存）。</li>
    <li>从 <code>trainer.state.log_history</code> 里取出 <code>rewards/margins</code> 与
        <code>rewards/accuracies</code>，画曲线。</li>
    <li>把 \(\beta\) 在 \(\{0.01, 0.1, 0.5\}\) 上各跑一次（每次只训练少量步数），比较三条 margin 曲线。</li>
    <li>手写一遍隐式奖励的计算，与 TRL 记录的值对照，确认你理解了这个量。</li>
  </ol>

  <p><strong>可运行代码</strong>：</p>
<pre><code><span class="cm"># E5 · TRL + DPO 偏好优化（T4 16GB，约 25–45 分钟）</span>
!pip -q install -U "trl" "transformers" "datasets" "peft" "accelerate"

import torch, matplotlib.pyplot as plt
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import DPOTrainer, DPOConfig

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
SEED = 1337

<span class="cm"># ---------- 1. 自己造偏好对：chosen 正确、rejected 貌似合理但错 ----------</span>
RAW = [
    ("求 1+2+...+100。",
     "5050。用首尾配对：(1+100) 有 50 对，每对 101，故 50 x 101 = 5050。",
     "5000。因为 100 x 100 / 2 = 5000。"),
    ("判断：若 A 与 B 独立，则 P(A|B) = P(A)。给出理由。",
     "正确。独立意味着 P(A∩B) = P(A)P(B)，代入条件概率定义即得 P(A|B) = P(A)（要求 P(B) &gt; 0）。",
     "正确。因为条件概率总是等于先验概率，条件是无关信息。"),
    ("岭回归里 λ 增大，系数会怎样？",
     "系数向 0 收缩，模型方差下降、偏差上升。λ→∞ 时系数全趋于 0。",
     "系数绝对值变大，因为惩罚项把权重推向极端以降低训练误差。"),
    ("为什么交叉熵不能跨数据集直接比较？",
     "因为交叉熵 = 数据本身的熵 H(p) + KL(p‖p_θ)，H(p) 依赖数据分布，是各数据集不同的地板。",
     "因为交叉熵是随机量，每次测量都会变，所以不可比。"),
    ("说明分组交叉验证的必要性。",
     "若同一艺人的样本同时出现在训练与验证折，模型可以靠记忆艺人身份而非学习机制来降低验证误差，导致乐观偏差。",
     "分组交叉验证只是为了加快训练，对偏差没有影响。"),
    ("置换检验在检验什么？",
     "检验「特征与目标之间不存在任何关联」这个零假设：打乱目标重跑整套流程，看真实指标是否落在零分布尾部。",
     "检验模型参数是否显著不等于零，等价于对每个权重做 t 检验。"),
    ("写出注意力的缩放因子并解释。",
     "缩放因子是 1/sqrt(d_k)。若不缩放，点积方差随 d_k 线性增长，softmax 会饱和、梯度消失。",
     "缩放因子是 1/d_k。因为 d_k 越大需要压得越狠。"),
    ("LoRA 的 B 矩阵为什么初始化为零？",
     "为了让训练开始时 LoRA 分支输出为零，模型行为与基座完全一致，训练从恒等映射平稳起步。",
     "为了让梯度一开始就最大，加快收敛。"),
    ("因果掩码在推理时还需要吗？",
     "单序列逐 token 生成时可以省略，因为此时上下文里本来就没有未来 token；但批量并行计算整个序列时必须保留。",
     "不需要，推理时永远不需要掩码，掩码只是训练技巧。"),
    ("为什么量化后显存下降但速度不一定提升？",
     "4-bit 权重省的是带宽与容量，但反量化本身有开销；只有当瓶颈在显存带宽时才转化为速度收益。",
     "因为量化后计算精度变低，GPU 需要额外校对，所以一定更慢。"),
    ("过渡时长 T* 的启发式基线应该包含哪些量？",
     "至少包含 BPM 差、调性距离、响度差，并且不拟合任何参数，这样它才是真正的「零学习」参照。",
     "直接把 T* 的平均值当基线就够了，其他特征都不重要。"),
    ("为什么要在同一批数据上比较模型阶梯？",
     "因为不同模型的差距常小于折间方差；用同一组折做配对比较可以消掉数据划分带来的方差。",
     "因为这样训练更快，不需要重复划分数据。"),
    ("解释 bytes/token 为什么适合跨 tokenizer 比较。",
     "它把 token 数换算成字节数，而字节是 tokenizer 无关的信息单位，因此不同词表下的成本可以直接对比。",
     "因为字节数总是等于字符数，计算最简单。"),
    ("DPO 里 β 的作用是什么？",
     "β 是 KL 正则强度的倒数形式：β 小则允许策略远离参考模型、优化更激进；β 大则强约束在参考模型附近。",
     "β 是学习率，控制每步更新的步长大小。"),
]

pairs = [{"prompt": p, "chosen": c, "rejected": r} for p, c, r in RAW]
ds = Dataset.from_list(pairs)
print(ds)
print("样本数:", len(ds))

<span class="cm"># ---------- 2. tokenizer：依旧是先修 pad_token ----------</span>
tok = AutoTokenizer.from_pretrained(MODEL_ID)
tok.pad_token = tok.pad_token or tok.eos_token
tok.padding_side = "left"        <span class="cm"># DPO 生成时用左填充</span>

peft_cfg = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
                      task_type="CAUSAL_LM",
                      target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                                      "gate_proj", "up_proj", "down_proj"])

<span class="cm"># ---------- 3. β 扫描：其余一切固定 ----------</span>
def run(beta, out_dir, max_steps=60):
    cfg = DPOConfig(
        output_dir=out_dir,
        beta=beta,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        max_steps=max_steps,
        learning_rate=5e-6,
        lr_scheduler_type="cosine",
        warmup_steps=5,
        logging_steps=5,
        bf16=torch.cuda.is_bf16_supported(),
        max_length=768,
        gradient_checkpointing=True,
        report_to="none",
        seed=SEED,
    )
    trainer = DPOTrainer(model=MODEL_ID, args=cfg, train_dataset=ds, peft_config=peft_cfg)
    print(f"beta={beta}  可训练参数占比 = "
          f"{100 * sum(p.numel() for p in trainer.model.parameters() if p.requires_grad) / sum(p.numel() for p in trainer.model.parameters()):.3f}%")
    trainer.train()
    return trainer

logs = {}
for beta in (0.01, 0.1, 0.5):
    t = run(beta, f"out/dpo-b{beta}")
    logs[beta] = t.state.log_history
    t.save_model(f"out/dpo-b{beta}/adapter")

<span class="cm"># ---------- 4. 画 margin 与 accuracy ----------</span>
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
for beta, hist in logs.items():
    h = [r for r in hist if "rewards/margins" in r]
    st = [r["step"] for r in h]
    ax[0].plot(st, [r["rewards/margins"] for r in h], "o-", label=f"beta={beta}")
    ax[1].plot(st, [r["rewards/accuracies"] for r in h], "o-", label=f"beta={beta}")
ax[0].set_title("implicit reward margin"); ax[0].set_xlabel("step")
ax[1].set_title("偏好对准确率"); ax[1].set_xlabel("step")
for a in ax: a.grid(alpha=0.3); a.legend()
plt.tight_layout(); plt.show()

<span class="cm"># ---------- 5. 手算隐式奖励，与 TRL 对照 ----------</span>
def seq_logprob(model, tok, prompt, completion):
    ids = tok(prompt + completion, return_tensors="pt").input_ids.to(model.device)
    plen = tok(prompt, return_tensors="pt").input_ids.shape[1]
    with torch.no_grad():
        logits = model(ids).logits
    lp = torch.log_softmax(logits[:, :-1], dim=-1)
    tgt = ids[:, 1:]
    tok_lp = lp.gather(-1, tgt.unsqueeze(-1)).squeeze(-1)
    return tok_lp[0, plen - 1:].sum().item()      <span class="cm"># 只累加 completion 部分</span>

from peft import PeftModel
base = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16, device_map="auto")
pol  = PeftModel.from_pretrained(base, "out/dpo-b0.1/adapter", is_trainable=False).eval()

beta = 0.1
for row in pairs[:4]:
    with pol.disable_adapter():                   <span class="cm"># 关掉 adapter = 参考模型</span>
        rw = seq_logprob(pol, tok, row["prompt"], row["chosen"])
        rl = seq_logprob(pol, tok, row["prompt"], row["rejected"])
    pol.enable_adapter_layers()
    pw = seq_logprob(pol, tok, row["prompt"], row["chosen"])
    pl = seq_logprob(pol, tok, row["prompt"], row["rejected"])
    margin = beta * ((pw - rw) - (pl - rl))
    print(f"margin = {margin:+.4f}   prompt = {row['prompt'][:24]}")
pol.disable_adapter_layers()</code></pre>

  <p><strong>预期输出</strong>：</p>
<pre><code>beta=0.01  可训练参数占比 = 1.781%
beta=0.1   可训练参数占比 = 1.781%
beta=0.5   可训练参数占比 = 1.781%
{'loss': 0.69xx, 'rewards/chosen': -0.0xxx, 'rewards/rejected': 0.0xxx,
 'rewards/accuracies': 0.5, 'rewards/margins': -0.0xxx, 'epoch': 0.1}
...
{'loss': 0.3xxx, 'rewards/chosen': 1.2xxx, 'rewards/rejected': -1.1xxx,
 'rewards/accuracies': 1.0, 'rewards/margins': 2.3xxx, 'epoch': 0.9}
margin = +0.87xx   prompt = 求 1+2+...+100。
margin = +1.12xx   prompt = 判断：若 A 与 B 独立</code></pre>
  <p>
    <strong>怎么读这三条曲线</strong>：\(\beta\) 越小（0.01），margin 上升越快但幅度更小、更不稳定，
    而且模型更容易跑离参考分布——训练后期 chosen 与 rejected 的 log 概率会一起下降（长度偏差开始主导）。
    \(\beta\) 越大（0.5），曲线更平滑但需要更多步才能把 margin 拉开。
    经验起点是 \(\beta \in [0.05, 0.2]\)，然后用验证集上的 margin 与实际输出质量共同决定。
  </p>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td><code>rewards/margins</code> 终值</td><td>偏好被拉开多远</td><td>+2.3</td></tr>
      <tr><td><code>rewards/accuracies</code></td><td>chosen 得分高于 rejected 的比例</td><td>1.0（14 对太少，容易饱和）</td></tr>
      <tr><td>chosen / rejected 的绝对 log 概率</td><td>两者同时下降 = 长度偏差信号</td><td>-0.4 / -1.5</td></tr>
      <tr><td>\(\beta\) 与步数的组合</td><td>β 与步数是耦合的，不能单独报告</td><td>β=0.1，60 步</td></tr>
      <tr><td>参考模型的存在方式</td><td><code>ref_model=None</code> + LoRA 省一份显存</td><td>禁用 adapter 的基座</td></tr>
      <tr><td>输出长度变化</td><td>DPO 最常见的副作用</td><td>平均 82 → 137 token</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>14 组偏好对太少，<code>rewards/accuracies</code> 很快饱和到 1.0。这说明什么？
        （提示：饱和后梯度趋近于零，模型学不到更多。）</li>
    <li>把 <code>rejected</code> 全部换成「更长但同样错误」的答案，观察 chosen/rejected 的绝对对数概率变化。
        这是 DPO 已知的长度偏差。</li>
    <li>换成真实数据集 <a href="https://huggingface.co/datasets/trl-lib/ultrafeedback_binarized" target="_blank" rel="noopener">trl-lib/ultrafeedback_binarized</a>
        的 2000 条子集，重复上面的 \(\beta\) 扫描。结论会变吗？</li>
    <li>先做一轮 E4 的 SFT，再在其上做 DPO，与直接在基座上做 DPO 对比。哪个 margin 更健康？为什么？</li>
  </ol>
</section>

<div class="acc" data-t="E5 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>显存翻倍 / OOM</strong>：你显式传了 <code>ref_model</code>。用 LoRA 时留
          <code>ref_model=None</code>，TRL 会复用基座并通过禁用 adapter 得到参考输出，省掉整整一份权重。</li>
      <li><strong>报错说 chosen/rejected 字段不存在</strong>：字段名必须严格是
          <code>prompt</code> / <code>chosen</code> / <code>rejected</code>；
          若数据是对话格式，则要用 <code>prompt</code> / <code>chosen</code> / <code>rejected</code> 的 messages 列表形式。</li>
      <li><strong>margin 一直是 0，loss 停在 0.693</strong>：0.693 = log 2，说明模型对 chosen 与 rejected 给了完全相同的分数。
          常见原因是 <code>chosen</code> 与 <code>rejected</code> 被拼成了同一个字符串（例如模板里写错了变量），
          或者 <code>beta</code> 小到 1e-8。</li>
      <li><strong>训练后模型开始输出空串或重复</strong>：\(\beta\) 太小或步数太多，策略已经跑离参考分布。
          提高 \(\beta\)、减少步数，或降低学习率（DPO 的学习率通常比 SFT 小一到两个数量级）。</li>
      <li><strong><code>ImportError: DPOTrainer requires ...</code></strong>：DPO 依赖 <code>peft</code> 与
          <code>accelerate</code> 的特定版本。用 <code>pip install -U trl</code> 一次装齐，
          不要逐个手动升级 transformers。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E6 · JAX 版 miniGPT（Flax NNX + Optax + Grain）：单设备改写与逐项对照</h4>

  <p><strong>目标</strong>：把
    <a href="https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html" target="_blank" rel="noopener">JAX AI Stack 的《Train a miniGPT language model with JAX》</a>
    改写成<strong>单设备可跑</strong>的版本，并逐项对照 PyTorch（E3）。这个改写不是学术练习：
    官方教程本身注明，截至 2025 年 10 月，Colab 免费层只提供 <strong>TPU v5e-1</strong>，
    单核<strong>已经无法使用 SPMD</strong>；教程里的 <code>Mesh((4, 2))</code> 在你的免费额度上会直接失败。
    正确的做法是把 mesh 写成 <code>(1, 1)</code>——同一份代码，去掉数据并行与张量并行。</p>

  <p><strong>前置</strong>：E3（知道 miniGPT 的每个部件）。需要一个 TPU 或 CPU 运行时；GPU 也可以，
    但 <code>jax[cuda12]</code> 的安装与 Colab 预装版本可能冲突。</p>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>安装 <code>jax-ai-stack[grain]</code>（这是官方教程使用的聚合安装方式，保证各库版本互相兼容）。</li>
    <li>先用 <code>jax.devices()</code> 确认拿到几个设备，再建一个 <code>(1, 1)</code> 的 <code>Mesh</code>。</li>
    <li>用 <code>flax.nnx</code> 写模型；用 <code>optax.adamw</code> 做优化器；用 <code>grain</code> 做数据加载。</li>
    <li>用 <code>nnx.jit</code> 编译训练步，另外用原生 <code>jax.jit</code> 编译一个纯函数损失，测量编译前后的耗时差。</li>
    <li>保存检查点，并填完最后的 PyTorch / JAX 对照表。</li>
  </ol>

  <p><strong>可运行代码</strong>：</p>
<pre><code><span class="cm"># E6 · JAX 版 miniGPT，单设备（Colab TPU v5e-1 或 CPU，约 30–60 分钟）</span>
!pip -q install -Uq tiktoken "jax-ai-stack[grain]" matplotlib orbax-checkpoint

import time
import numpy as np
import jax, jax.numpy as jnp
from jax.sharding import Mesh, PartitionSpec as P, NamedSharding
from jax.experimental import mesh_utils
import flax.nnx as nnx
import optax, tiktoken
import grain.python as grain

SEED = 1337
print("devices:", jax.devices())

<span class="cm"># ---------- 1. 单设备 mesh：形状与 8 核版本完全一致，只是每条轴都是 1 ----------</span>
N_DEV = jax.device_count()
mesh = Mesh(mesh_utils.create_device_mesh((1, 1)), ("batch", "model"))
print("device_count =", N_DEV, " mesh =", mesh.shape)
print("若你确实拿到 8 核：把 (1, 1) 改成 (4, 2)，模型代码一行都不用动。")

<span class="cm"># ---------- 2. 模型（NNX）----------</span>
class Block(nnx.Module):
    def __init__(self, d, h, ff, *, rngs, rate=0.1):
        self.mha  = nnx.MultiHeadAttention(num_heads=h, in_features=d, decode=False, rngs=rngs)
        self.ln1  = nnx.LayerNorm(d, epsilon=1e-6, rngs=rngs)
        self.ln2  = nnx.LayerNorm(d, epsilon=1e-6, rngs=rngs)
        self.l1   = nnx.Linear(d, ff, rngs=rngs)
        self.l2   = nnx.Linear(ff, d, rngs=rngs)
        self.drop = nnx.Dropout(rate=rate, rngs=rngs)
    def __call__(self, x, mask, training: bool):
        a = self.mha(inputs_q=x, mask=mask, decode=False)
        x = self.ln1(x + self.drop(a, deterministic=not training))
        f = self.l2(nnx.relu(self.l1(x)))
        return self.ln2(x + self.drop(f, deterministic=not training))

class MiniGPT(nnx.Module):
    def __init__(self, maxlen, vocab, d, h, ff, n_blocks, *, rngs, rate=0.1):
        self.tok    = nnx.Embed(vocab, d, rngs=rngs)
        self.pos    = nnx.Embed(maxlen, d, rngs=rngs)
        self.blocks = [Block(d, h, ff, rngs=rngs, rate=rate) for _ in range(n_blocks)]
        self.ln_f   = nnx.LayerNorm(d, epsilon=1e-6, rngs=rngs)
        self.head   = nnx.Linear(d, vocab, use_bias=False, rngs=rngs)
    def __call__(self, idx, training: bool = False):
        B, T = idx.shape
        x = self.tok(idx) + self.pos(jnp.arange(T)[None, :])
        mask = jnp.tril(jnp.ones((T, T), dtype=bool))
        for blk in self.blocks:
            x = blk(x, mask, training)
        return self.head(self.ln_f(x))

<span class="cm"># ---------- 3. 数据：TinyStories 子集 + tiktoken(gpt2) ----------</span>
import urllib.request
url = "https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-train.txt"
urllib.request.urlretrieve(url, "TinyStories-train.txt")
with open("TinyStories-train.txt", "r", encoding="utf-8") as f:
    raw = f.read(20_000_000)                       <span class="cm"># 只取前 20 MB</span>
tok = tiktoken.get_encoding("gpt2")
tokens = np.array(tok.encode(raw, allowed_special={"&lt;|endoftext|&gt;"}), dtype=np.int32)
MAXLEN = 128
n_tr = int(0.95 * len(tokens))
train_ids, val_ids = tokens[:n_tr], tokens[n_tr:]
print(f"tokens={len(tokens):,}  vocab={tok.n_vocab:,}")

class TokenSource(grain.RandomAccessDataSource):
    def __init__(self, arr, maxlen):
        self.arr, self.maxlen = np.asarray(arr, dtype=np.int32), maxlen
    def __len__(self):
        return len(self.arr) - self.maxlen - 1
    def __getitem__(self, i):
        return {"idx":    self.arr[i:i + self.maxlen],
                "target": self.arr[i + 1:i + self.maxlen + 1]}

def make_loader(arr, bs, seed, shuffle=True):
    src = TokenSource(arr, MAXLEN)
    sampler = grain.IndexSampler(num_records=len(src), shuffle=shuffle, seed=seed,
                                 num_epochs=1, shard_options=grain.NoSharding())
    return iter(grain.DataLoader(data_source=src, sampler=sampler,
                                 operations=[grain.Batch(batch_size=bs, drop_remainder=True)]))

<span class="cm"># 若你的 Grain 版本 API 不同，用这个三行的等价替代：</span>
def numpy_batches(arr, bs, seed):
    rng = np.random.default_rng(seed)
    while True:
        ix = rng.integers(0, len(arr) - MAXLEN - 1, size=bs)
        yield {"idx":    np.stack([arr[i:i + MAXLEN] for i in ix]),
               "target": np.stack([arr[i + 1:i + MAXLEN + 1] for i in ix])}

<span class="cm"># ---------- 4. 模型 + 优化器 + 训练步 ----------</span>
D, H, FF, L, BS = 128, 4, 512, 4, 32
rngs = nnx.Rngs(SEED)
model = MiniGPT(MAXLEN, tok.n_vocab, D, H, FF, L, rngs=rngs)
n_param = sum(p.size for p in jax.tree.leaves(nnx.state(model, nnx.Param)))
print(f"参数张量总数 = {n_param:,}")

tx = optax.adamw(3e-4, b1=0.9, b2=0.95, weight_decay=0.1, eps=1e-8)
optimizer = nnx.Optimizer(model, tx, wrt=nnx.Param)

@nnx.jit                                   <span class="cm"># nnx.jit 就是 jax.jit 的 NNX 友好包装</span>
def train_step(model, optimizer, idx, targets):
    def loss_fn(m):
        logits = m(idx, training=True)
        return optax.softmax_cross_entropy_with_integer_labels(
            logits.reshape(-1, logits.shape[-1]), targets.reshape(-1)).mean()
    loss, grads = nnx.value_and_grad(loss_fn)(model)
    optimizer.update(model, grads)
    return loss

<span class="cm"># ---------- 5. 训练循环（Grain 提供数据）----------</span>
loader = make_loader(train_ids, BS, SEED + 1)
STEPS = 500
hist = []
t0 = time.perf_counter()
for step in range(1, STEPS + 1):
    b = next(loader)
    loss = train_step(model, optimizer,
                      jnp.asarray(b["idx"]), jnp.asarray(b["target"]))
    if step % 50 == 0:
        hist.append((step, float(loss)))
        print(f"step {step:5d}  loss {float(loss):.4f}  "
              f"elapsed {time.perf_counter() - t0:6.1f}s")

<span class="cm"># ---------- 6. 原生 jax.jit：编译一个纯函数损失，量编译前后的耗时 ----------</span>
graphdef, params = nnx.split(model)

@jax.jit
def loss_fn(graphdef, params, idx, targets):
    net = nnx.merge(graphdef, params)
    logits = net(idx, training=False)
    return optax.softmax_cross_entropy_with_integer_labels(
        logits.reshape(-1, logits.shape[-1]), targets.reshape(-1)).mean()

vb = next(make_loader(val_ids, BS, SEED + 2, shuffle=False))
a1 = time.perf_counter(); v1 = loss_fn(graphdef, params, jnp.asarray(vb["idx"]), jnp.asarray(vb["target"]))
a2 = time.perf_counter(); v2 = loss_fn(graphdef, params, jnp.asarray(vb["idx"]), jnp.asarray(vb["target"]))
a3 = time.perf_counter()
print(f"val loss = {float(v2):.4f}")
print(f"首次调用（含编译）{1e3 * (a2 - a1):7.2f} ms   第二次调用 {1e3 * (a3 - a2):7.2f} ms")

<span class="cm"># ---------- 7. 保存检查点 ----------</span>
import orbax.checkpoint as ocp
ckpt_dir = "out/jax-minigpt"
ckptr = ocp.StandardCheckpointer()
ckptr.save(ckpt_dir, nnx.state(model), force=True)
ckptr.wait_until_finished()
print("已保存到", ckpt_dir)

<span class="cm"># 跨版本最稳的等价方案（NNX State 是 pytree，可以直接 pickle）：</span>
import pickle, pathlib
pathlib.Path("out").mkdir(exist_ok=True)
with open("out/jax-minigpt.pkl", "wb") as f:
    pickle.dump(nnx.state(model), f)
print("pkl 大小(MiB) =", pathlib.Path("out/jax-minigpt.pkl").stat().st_size / 2**20)

<span class="cm"># ---------- 8. 采样 ----------</span>
def sample(prompt="Once upon a time", n_new=64, temp=0.8, seed=0):
    key = jax.random.PRNGKey(seed)
    ids = tok.encode(prompt)
    for _ in range(n_new):
        ctx = jnp.asarray(ids[-MAXLEN:])[None, :]
        logits = model(ctx, training=False)[0, -1] / temp
        key, sub = jax.random.split(key)
        nxt = int(jax.random.categorical(sub, logits))
        ids.append(nxt)
    return tok.decode(ids)

print(sample())</code></pre>

  <p><strong>预期输出</strong>：</p>
<pre><code>devices: [TpuDevice(id=0, ...)]
device_count = 1  mesh = (1, 1)
tokens=4,xxx,xxx  vocab=50257
参数张量总数 = 8,xxx,xxx
step    50  loss 4.xxxx  elapsed   1x.xs
step   500  loss 2.xxxx  elapsed  1xx.xs
val loss = 2.xxxx
首次调用（含编译）  8xx.xx ms   第二次调用   1x.xx ms
已保存到 out/jax-minigpt
pkl 大小(MiB) = 3x.x</code></pre>
  <p>
    注意最后两行：<strong>首次调用比第二次慢一到两个数量级</strong>，这就是 JAX 的编译开销。
    它意味着「前 10 步很慢」不是你的代码有问题；也意味着<strong>评估循环必须被 jit 包起来</strong>，
    否则每个 batch 都要重新追踪一次图。
  </p>

  <h4>PyTorch 与 JAX 的逐项对照</h4>
  <table class="tbl small">
    <thead><tr><th>环节</th><th>PyTorch（E3）</th><th>JAX / Flax NNX（E6）</th></tr></thead>
    <tbody>
      <tr><td>参数容器</td><td><code>nn.Module</code> 的属性，可变、就地更新</td><td><code>nnx.Module</code> 的属性包成 <code>nnx.Param</code>，本质是<strong>不可变 pytree</strong></td></tr>
      <tr><td>随机数</td><td>全局 <code>torch.manual_seed</code>，隐式状态</td><td>显式 PRNGKey，经 <code>nnx.Rngs</code> 传递；<strong>没有全局种子</strong></td></tr>
      <tr><td>前向</td><td><code>__call__</code> 直接执行</td><td>同一个 <code>__call__</code>，但被 <code>jit</code> 追踪成静态计算图</td></tr>
      <tr><td>求梯度</td><td><code>loss.backward()</code>，梯度存在 <code>.grad</code></td><td><code>nnx.value_and_grad(loss_fn)(model)</code>，返回纯 pytree</td></tr>
      <tr><td>优化器</td><td><code>torch.optim.AdamW</code>，有状态、就地改参数</td><td><code>optax.adamw</code> 是纯函数：<code>(grads, state) → (updates, new_state)</code></td></tr>
      <tr><td>编译</td><td>默认 eager；<code>torch.compile</code> 可选</td><td><code>jit</code> 是默认工作方式，首次调用有编译开销</td></tr>
      <tr><td>数据加载</td><td><code>Dataset</code> + <code>DataLoader</code></td><td><code>grain.RandomAccessDataSource</code> + <code>grain.DataLoader</code></td></tr>
      <tr><td>检查点</td><td><code>torch.save(model.state_dict())</code></td><td><code>orbax.checkpoint.StandardCheckpointer</code>（或直接 pickle <code>nnx.state</code>）</td></tr>
      <tr><td>并行</td><td>DDP / FSDP / 张量并行各有专门 API</td><td><code>Mesh</code> + <code>PartitionSpec</code> + <code>NamedSharding</code>，由编译器自动切分</td></tr>
      <tr><td>调试</td><td>随处 <code>print</code> / <code>pdb</code></td><td>jit 内部不能随意 print，要用 <code>jax.debug.print</code>；形状错误在追踪期抛出</td></tr>
      <tr><td>设备切换</td><td><code>.to("cuda")</code></td><td>数组自动跟随后端；同一份代码跑 CPU / GPU / TPU</td></tr>
    </tbody>
  </table>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td><code>jax.devices()</code> 的输出</td><td>决定 mesh 形状，也决定你能不能做 SPMD</td><td>1 个 TpuDevice</td></tr>
      <tr><td>mesh 形状与 <code>axis_names</code></td><td>并行策略的唯一真相来源</td><td>(1, 1)，batch/model</td></tr>
      <tr><td>首次 vs 后续调用耗时</td><td>编译开销的量级</td><td>820 ms / 12 ms</td></tr>
      <tr><td>tokens/s</td><td>与 PyTorch 版本对照</td><td>1.1e4 tok/s</td></tr>
      <tr><td>参数量（两套框架应完全一致）</td><td>跨框架正确性检查</td><td>8,xxx,xxx</td></tr>
      <tr><td>检查点大小</td><td>与参数量对账</td><td>32 MiB（fp32）</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>把 PyTorch 版（E3）与 JAX 版在<strong>相同参数量、相同数据、相同步数</strong>下的 loss 曲线画在一起。
        它们应该几乎重合——如果不重合，先检查数据切片与学习率。</li>
    <li>在 Kaggle 的 TPU v5e-8 上把 mesh 改成 <code>(4, 2)</code>，并给各层加上
        <code>nnx.with_partitioning(..., NamedSharding(mesh, P(None, "model")))</code>。
        训练吞吐提升了多少倍？是否接近 8？</li>
    <li>解释为什么 JAX 里「同一个函数被调用两次而有不同耗时」是正常的，而 PyTorch 里不是。</li>
    <li><code>optax.adamw</code> 是纯函数，这意味着优化器状态可以被 <code>jax.jit</code> 当作普通输入输出。
        举一个这个性质带来的实际好处（提示：检查点、扫描 <code>jax.lax.scan</code>、多设备复制）。</li>
  </ol>
</section>

<div class="acc" data-t="E6 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>TPU 单核 + SPMD 报错</strong>：Colab 免费层的 TPU v5e-1 只有一个核心，
          官方教程也明确写了它<strong>无法支持 SPMD</strong>。
          把 <code>mesh_utils.create_device_mesh((4, 2))</code> 换成 <code>((1, 1))</code>，
          并去掉所有 <code>with_partitioning</code>。想真跑 <code>(4, 2)</code> 就用 Kaggle 的 TPU v5e-8。</li>
      <li><strong><code>jax[cuda12]</code> 与 Colab 预装版本冲突</strong>：不要盲目重装 JAX。
          先 <code>jax.devices()</code> 看当前后端是否已经可用；如果 GPU 版坏了，
          运行时菜单里换一个干净的 GPU 运行时，而不是强行 pip 覆盖。</li>
      <li><strong><code>jax-ai-stack</code> 里某个库版本不匹配</strong>：用官方聚合安装
          <code>jax-ai-stack[grain]</code>，它会锁定一组互相兼容的版本。逐个手动装 flax/optax/orbax
          是版本地狱的入口。</li>
      <li><strong>内存爆掉</strong>：TPU v5e 每核的 HBM 有限，且 JAX 会为编译<strong>预分配</strong>显存。
          把 <code>MAXLEN</code> 从 128 降到 64、<code>BS</code> 从 32 降到 8，再观察。</li>
      <li><strong>形状错误只在 jit 里出现</strong>：JAX 的形状错误在追踪期抛出，错误信息指向被 jit 包装的整个函数。
          调试办法是临时去掉 <code>@nnx.jit</code>，用 eager 模式跑一遍拿到精确的报错位置。</li>
      <li><strong><code>grain.IndexSampler</code> 参数名不匹配</strong>：不同版本的 Grain 参数名略有差异
          （<code>num_records</code> / <code>total_records</code>）。用代码里给出的 <code>numpy_batches</code> 兜底，
          先把模型跑通，再回头适配数据加载器。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E7 · 模型阶梯 + 分组交叉验证 + 置换检验：学习到底有没有加价值</h4>

  <p><strong>目标</strong>：这是全课程最重要的实验，它直接对应你申请项目的 Checkpoint 7。
    你要在一条可控的合成数据上，回答一个必须在申请材料里被回答的问题：
    <strong>「在解析模型留下的低维自由参数上引入机器学习，是否真的优于不学习的基线？这个优势是不是抽样噪声？」</strong>
    为此你要同时掌握三件事：模型阶梯（model ladder）、按艺人的分组交叉验证、置换检验。</p>

  <p><strong>前置</strong>：E1。还需要一点基础统计直觉（均值、方差、分位数）。全部在 CPU 上 5 分钟以内跑完。</p>

  <section class="blk blk-m">
    <h4><span class="ic">∑</span>为什么必须是分组交叉验证</h4>
    <p>设每条样本属于一个艺人 \(g\)，而目标满足</p>
    \[ y_{ig} = f(x_{ig}) + \alpha_g + \varepsilon_{ig}, \qquad
       \alpha_g \sim \mathcal{N}(0, \sigma_\alpha^2),\quad \varepsilon_{ig} \sim \mathcal{N}(0, \sigma^2) \]
    <p>
      \(\alpha_g\) 是艺人级随机截距。如果用随机 \(K\) 折划分，同一艺人的其他样本会出现在训练折里，
      模型可以<strong>通过 \(\alpha_g\) 而不是通过 \(f\) 来降低验证误差</strong>。
      于是验证误差被系统性低估，而这个乐观偏差在你真正面对新艺人时会消失。
      极端情形（例如使用「艺人目标均值编码」这类特征）可以让验证 MAE 从 0.40 掉到 0.36，
      看上去是「模型改进」，实际上是把答案抄进了输入。
    </p>
    <p>置换检验回答的是另一个问题：把 \(y\) 随机打乱（从而\(X\) 与 \(y\) 之间的任何真实关联都被破坏），
      重跑<strong>整条流水线</strong>（包含特征工程与交叉验证），得到零分布。
      真实指标的超越程度就是 \(p\) 值：</p>
    \[ p = \frac{1 + \#\{\text{MAE}_{\text{perm}} \le \text{MAE}_{\text{obs}}\}}{1 + B} \]
  </section>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>按「真实机制 + 艺人随机截距 + 观测噪声」生成合成数据，四个特征为
        \(|\Delta \mathrm{BPM}|\)、调性距离、\(|\Delta \mathrm{LUFS}|\)、谱通量对比度，
        目标是过渡时长 \(T^*\)（拍）。</li>
    <li>建立模型阶梯：<strong>L0 零拟合启发式</strong>（不含任何学习参数）→ <strong>艺人均值</strong> →
        <strong>Ridge</strong> → <strong>Ridge + 目标均值编码</strong> → <strong>小 MLP</strong>。</li>
    <li>每个模型同时用<strong>随机 5 折</strong>与<strong>按艺人分组的 5 折</strong>评估，把两组数字并排放在一张表里。</li>
    <li>对 Ridge 跑 1000 次置换检验，得到 \(p\) 值。</li>
    <li>把 Ridge 与 MLP 的<strong>折间配对差</strong>做 Wilcoxon 符号秩检验：MLP 的额外容量是否值得？</li>
  </ol>

  <p><strong>可运行代码</strong>：</p>
<pre><code><span class="cm"># E7 · 模型阶梯 + 分组交叉验证 + 置换检验（CPU，约 2–5 分钟）</span>
!pip -q install -U scikit-learn pandas matplotlib scipy

import numpy as np, pandas as pd
from sklearn.linear_model import Ridge
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import GroupKFold, KFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error
from scipy.stats import wilcoxon

SEED = 20260101
rng = np.random.default_rng(SEED)

<span class="cm"># ---------- 1. 合成数据：48 位艺人 x 12 条过渡 ----------</span>
N_ART, PER = 48, 12
n = N_ART * PER
artist = np.repeat(np.arange(N_ART), PER)

d_bpm  = rng.normal(0.0, 14.0, n)                 <span class="cm"># 有符号 ΔBPM</span>
key_d  = rng.integers(0, 7, n).astype(float)      <span class="cm"># 调性距离 0–6 半音</span>
d_lufs = rng.normal(0.0, 2.5, n)                  <span class="cm"># 响度差 dB</span>
flux   = rng.uniform(0.0, 1.0, n)                 <span class="cm"># 谱通量对比度</span>

<span class="cm"># 真实机制（只有它知道）：T* = 4 + 0.18|ΔBPM| + 0.55 keyd + 0.30|ΔLUFS| - 1.10 flux + 艺人效应</span>
artist_eff = rng.normal(0.0, 1.2, N_ART)[artist]
T_star = (4.0 + 0.18 * np.abs(d_bpm) + 0.55 * key_d
          + 0.30 * np.abs(d_lufs) - 1.10 * flux + artist_eff)
SIGMA = 0.45
y = T_star + rng.normal(0.0, SIGMA, n)            <span class="cm"># 观测噪声</span>

X = np.column_stack([np.abs(d_bpm), key_d, np.abs(d_lufs), flux])
print(f"n={n}  艺人={N_ART}  噪声 sigma={SIGMA}")
print(f"不可约 MAE 地板 = sigma*sqrt(2/pi) = {SIGMA * np.sqrt(2 / np.pi):.3f}")

<span class="cm"># ---------- 2. 模型阶梯：统一签名 (Xtr, ytr, gtr, Xte, gte) -&gt; 预测 ----------</span>
def m_l0(Xtr, ytr, gtr, Xte, gte):                <span class="cm"># 零拟合：手写系数，不看训练数据</span>
    return 0.20 * Xte[:, 0] + 0.60 * Xte[:, 1] + 2.0

def m_artist_mean(Xtr, ytr, gtr, Xte, gte):       <span class="cm"># 只看艺人身份，不看特征</span>
    mu, glob = pd.Series(ytr).groupby(gtr).mean(), ytr.mean()
    return np.array([mu.get(g, glob) for g in gte])

def m_ridge(alpha=1.0):
    def f(Xtr, ytr, gtr, Xte, gte):
        pipe = make_pipeline(StandardScaler(), Ridge(alpha=alpha))
        return pipe.fit(Xtr, ytr).predict(Xte)
    return f

def m_ridge_target_encoding(alpha=1.0):
    <span class="cm"># 在训练折内计算艺人目标均值；未见过的艺人回退到全局均值</span>
    def f(Xtr, ytr, gtr, Xte, gte):
        enc, glob = pd.Series(ytr).groupby(gtr).mean(), ytr.mean()
        ztr = np.array([enc.get(g, glob) for g in gtr])[:, None]
        zte = np.array([enc.get(g, glob) for g in gte])[:, None]
        pipe = make_pipeline(StandardScaler(), Ridge(alpha=alpha))
        return pipe.fit(np.hstack([Xtr, ztr]), ytr).predict(np.hstack([Xte, zte]))
    return f

def m_mlp(hidden=(32,), alpha=1e-3, seed=0):
    def f(Xtr, ytr, gtr, Xte, gte):
        pipe = make_pipeline(StandardScaler(),
                             MLPRegressor(hidden_layer_sizes=hidden, alpha=alpha,
                                          max_iter=4000, random_state=seed))
        return pipe.fit(Xtr, ytr).predict(Xte)
    return f

MODELS = {
    "L0  启发式（零拟合）":        m_l0,
    "L-1 艺人均值（无特征）":      m_artist_mean,
    "L1  Ridge (alpha=1)":         m_ridge(1.0),
    "L1b Ridge + 目标均值编码":    m_ridge_target_encoding(1.0),
    "L2  小 MLP (32,)":            m_mlp((32,)),
}

<span class="cm"># ---------- 3. 两种划分方式 ----------</span>
splits_grouped = list(GroupKFold(n_splits=5).split(X, y, groups=artist))
splits_random  = list(KFold(n_splits=5, shuffle=True, random_state=0).split(X))

def run_cv(predict, X, y, groups, splits):
    maes, preds = [], np.full(len(y), np.nan)
    for tr, te in splits:
        p = predict(X[tr], y[tr], groups[tr], X[te], groups[te])
        preds[te] = p
        maes.append(mean_absolute_error(y[te], p))
    return np.array(maes), preds

rows = []
for name, f in MODELS.items():
    g, _ = run_cv(f, X, y, artist, splits_grouped)
    r, _ = run_cv(f, X, y, artist, splits_random)
    rows.append(dict(model=name,
                     grouped_MAE=round(g.mean(), 4), grouped_sd=round(g.std(), 4),
                     random_MAE=round(r.mean(), 4),  random_sd=round(r.std(), 4)))
tab = pd.DataFrame(rows).sort_values("grouped_MAE")
print(tab.to_string(index=False))

<span class="cm"># ---------- 4. 置换检验：打乱 y，重跑整条流水线 ----------</span>
def permutation_test(predict, X, y, groups, splits, n_perm=1000, seed=0):
    r = np.random.default_rng(seed)
    obs = run_cv(predict, X, y, groups, splits)[0].mean()
    null = np.empty(n_perm)
    for k in range(n_perm):
        null[k] = run_cv(predict, X, r.permutation(y), groups, splits)[0].mean()
    p = (1.0 + np.sum(null &lt;= obs)) / (1.0 + n_perm)
    return obs, null, p

for name, f in [("L0 启发式", m_l0), ("L1 Ridge", m_ridge(1.0)), ("L2 MLP", m_mlp((32,)))]:
    obs, null, p = permutation_test(f, X, y, artist, splits_grouped, n_perm=1000)
    print(f"{name:10s} 观测 MAE = {obs:.4f}   零分布中位数 = {np.median(null):.4f}   p = {p:.4f}")

<span class="cm"># ---------- 5. 配对比较：MLP 的额外容量是否值得？（同一组折，配对检验）----------</span>
g_ridge, _ = run_cv(m_ridge(1.0), X, y, artist, splits_grouped)
g_mlp,   _ = run_cv(m_mlp((32,)), X, y, artist, splits_grouped)
stat, p_pair = wilcoxon(g_ridge, g_mlp)
print(f"Ridge 折 MAE = {np.round(g_ridge, 4)}")
print(f"MLP   折 MAE = {np.round(g_mlp, 4)}")
print(f"配对 Wilcoxon: stat={stat:.1f}  p={p_pair:.4f}  "
      f"平均差 = {g_mlp.mean() - g_ridge.mean():+.4f}")

<span class="cm"># ---------- 6. 图：模型阶梯 + 零分布 ----------</span>
import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 2, figsize=(13, 4.5))
names = tab["model"].tolist()
ax[0].barh(names, tab["grouped_MAE"], color="#0f6b63", alpha=0.85, label="分组 5 折")
ax[0].barh(names, tab["random_MAE"], height=0.35, color="#a8630a", alpha=0.9, label="随机 5 折")
ax[0].axvline(SIGMA * np.sqrt(2 / np.pi), ls=":", c="k", label="噪声地板")
ax[0].set_xlabel("MAE（拍）"); ax[0].legend(); ax[0].grid(alpha=0.3, axis="x")
ax[0].set_title("模型阶梯：分组 vs 随机划分")

obs, null, p = permutation_test(m_ridge(1.0), X, y, artist, splits_grouped, n_perm=1000)
ax[1].hist(null, bins=40, color="#6b7382", alpha=0.8)
ax[1].axvline(obs, color="#a52121", lw=2.5, label=f"观测 {obs:.3f}（p={p:.4f}）")
ax[1].set_xlabel("置换零分布下的 MAE"); ax[1].legend(); ax[1].grid(alpha=0.3)
ax[1].set_title("置换检验 B=1000")
plt.tight_layout(); plt.show()

<span class="cm"># ---------- 7. 一份可以直接抄进报告的结论模板 ----------</span>
print(f"""
结论模板：
  数据：n={n}，{N_ART} 位艺人，5 折按艺人分组。
  基线：L0 启发式 MAE = {tab.iloc[-1]['grouped_MAE']:.3f} 拍（零拟合）。
  最好模型：{tab.iloc[0]['model']}，分组 MAE = {tab.iloc[0]['grouped_MAE']:.3f} 拍。
  噪声地板 ≈ {SIGMA * np.sqrt(2 / np.pi):.3f} 拍。
  置换检验：p = {p:.4f}（B = 1000），故特征与目标之间不存在关联的零假设被拒绝。
  分组 vs 随机划分的差值 = 泄漏的量级。
""")</code></pre>

  <p><strong>预期输出</strong>：</p>
<pre><code>n=576  艺人=48  噪声 sigma=0.45
不可约 MAE 地板 = sigma*sqrt(2/pi) = 0.359
                    model  grouped_MAE  grouped_sd  random_MAE  random_sd
         L1  Ridge (alpha=1)       0.4xxx      0.0xxx      0.4xxx     0.0xxx
           L1b Ridge + 目标均值编码       0.4xxx      0.0xxx      0.3xxx     0.0xxx
              L2  小 MLP (32,)       0.4xxx      0.0xxx      0.4xxx     0.0xxx
          L-1 艺人均值（无特征）       1.8xxx      0.0xxx      1.6xxx     0.0xxx
          L0  启发式（零拟合）       2.0xxx      0.0xxx      2.0xxx     0.0xxx
L0 启发式    观测 MAE = 2.0xxx   零分布中位数 = 1.7xxx   p = 1.0000
L1 Ridge    观测 MAE = 0.4xxx   零分布中位数 = 1.7xxx   p = 0.0010
L2 MLP      观测 MAE = 0.4xxx   零分布中位数 = 1.7xxx   p = 0.0010
Ridge 折 MAE = [0.4xxx 0.4xxx 0.4xxx 0.4xxx 0.4xxx]
配对 Wilcoxon: stat=3.0  p=0.3125  平均差 = +0.00xx</code></pre>

  <section class="blk blk-warn">
    <h4><span class="ic">!</span>四个必须从这张表里读出来的结论</h4>
    <ol>
      <li><strong>L0 的 \(p = 1.0\)</strong>：启发式完全不看训练数据，所以打乱 \(y\) 对它毫无影响，
          它的 MAE 在零分布里正好位于中心。这正是「有效的零假设对照组」应该有的样子——
          如果你新写的「基线」在置换检验里得到很小的 \(p\)，那说明你把模型当成了基线。</li>
      <li><strong>Ridge 的 \(p = 0.001\)</strong>：即 \(B = 1000\) 次置换中没有一次能达到观测 MAE。
          \(p\) 的取值下限由 \(B\) 决定：\(1/(B+1)\)。想把 \(p\) 报到 0.0001，就跑 10000 次。</li>
      <li><strong>Ridge 已经贴住噪声地板</strong>：0.4 对 0.359。此时任何更复杂的模型都不可能带来实质改进，
          因为它要战胜的是<strong>不可约噪声</strong>，而不是 Ridge。</li>
      <li><strong>MLP 没有收益（配对检验不显著）</strong>：这正是全课程反复强调的立场——
          在低维、机制已知的回归问题上，<strong>正则化线性模型通常就是正确答案</strong>。
          把这条写进报告，比硬塞一个神经网络更有说服力。</li>
      <li><strong>泄漏的指纹</strong>：目标均值编码在随机划分下显得更好（0.3x），在分组划分下优势消失。
          如果你的模型只在随机划分下好，先怀疑特征泄漏，而不是先庆祝。</li>
    </ol>
  </section>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td>模型阶梯的<strong>完整</strong>表格</td><td>只报告最好模型是选择性汇报</td><td>5 行 × 2 列</td></tr>
      <tr><td>折间均值 ± 标准差</td><td>差距是否大于折间方差，一眼可判</td><td>0.41 ± 0.02</td></tr>
      <tr><td>噪声地板</td><td>判断「还有多少可改进空间」的唯一参照</td><td>0.359</td></tr>
      <tr><td>置换检验的 \(B\) 与 \(p\)</td><td>\(p\) 的分辨率由 \(B\) 决定</td><td>B=1000，p=0.001</td></tr>
      <tr><td>分组 vs 随机的差值</td><td>直接量化泄漏的乐观偏差</td><td>0.03 拍</td></tr>
      <tr><td>配对检验</td><td>避免用「平均值高一点」下结论</td><td>Wilcoxon p=0.31</td></tr>
      <tr><td>特征定义与单位</td><td>\(T^*\) 是拍还是秒？差 2 倍</td><td>拍（4/4 拍）</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>把 <code>N_ART</code> 从 48 降到 8（每位艺人 72 条），再跑一次。分组与随机的差距如何变化？为什么？</li>
    <li>把 <code>artist_eff</code> 的标准差从 1.2 提到 3.0，重复实验。艺人均值基线与 Ridge 的相对位置会怎样变化？</li>
    <li>在数据里加入一个<strong>与目标无关</strong>的第五个特征（纯噪声）。Ridge 的 MAE 变化多少？
        如果你对 200 个纯噪声特征做特征选择再报告最好结果，会得到什么？这就是<strong>选择偏差</strong>。</li>
    <li>把置换检验改成「只打乱艺人标签」（保留 \(y\) 的组内结构）。这个零假设检验的是什么？
        它与你原来的检验有什么互补性？</li>
    <li>把 \(B\) 从 1000 提到 10000，观察 \(p\) 的最小可分辨值。这解释了为什么很多论文只报 \(p &lt; 0.001\)。</li>
  </ol>
</section>

<div class="acc" data-t="E7 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>把 <code>GroupKFold</code> 写成 <code>KFold</code></strong>：这是本实验最致命的一处错误，
          也是最常见的。判断方法很直接：如果某种特征使用了「同组样本的目标值」，
          随机划分会给出显著更低的 MAE——那个差值就是泄漏。</li>
      <li><strong>先在全量数据上做 <code>StandardScaler</code> 再交叉验证</strong>：标准化用到了验证折的均值与方差，
          属于轻度泄漏。标准做法是把它放进 <code>Pipeline</code>（本实验代码就是这么写的）。</li>
      <li><strong>置换检验时只打乱特征而不打乱目标</strong>：零假设就被变成了别的东西。正确做法是打乱 \(y\)，
          并<strong>重跑包含特征工程在内的整条流水线</strong>，而不是复用已经算好的特征矩阵。</li>
      <li><strong>用 \(p\) 值代替效应量</strong>：\(n = 576\) 时，0.001 拍的改进也可能「显著」。
          必须同时报告 MAE 的绝对差与噪声地板，读者才知道这点改进有没有意义。</li>
      <li><strong>MLP 每次结果都不一样</strong>：<code>MLPRegressor</code> 的初始化与内部划分都依赖随机数。
          固定 <code>random_state</code>，并且<strong>至少跑 5 个种子</strong>把均值与标准差一起报。</li>
    </ul>
  </div>
</div>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>E8 · 量化与部署基准：显存、延迟、吞吐的三方权衡</h4>

  <p><strong>目标</strong>：把「量化能省显存」这句话变成一组你自己测出来的数字，并发现它<strong>不一定更快</strong>。
    同时用 vLLM 的并发扫描回答部署中最实际的问题：<em>并发数从 1 加到 32，吞吐与 p95 延迟各自怎么变？</em></p>

  <p><strong>前置</strong>：E3、E4。需要 T4 以上 GPU（<code>bitsandbytes</code> 的 4-bit 路径必须有 CUDA）；
    vLLM 部分在 T4 上可以跑，但更推荐 L4 / A100。</p>

  <p><strong>步骤</strong>：</p>
  <ol>
    <li>用 bf16 与 4-bit（NF4 + 双重量化）两种方式分别加载同一个 1B 级以下模型。</li>
    <li>固定 prompt、固定输出长度、<code>do_sample=False</code>，在批大小 1 / 8 / 32 下测量：
        峰值显存、端到端延迟、tokens/s。</li>
    <li>量化前后<strong>对比生成质量</strong>：同一 prompt 的贪心输出逐字对比，观察是否出现退化。</li>
    <li>用 vLLM 起一个 OpenAI 兼容服务，做并发扫描（1、2、4、8、16、32），记录吞吐与 p50 / p95 延迟。</li>
    <li>如果没有 vLLM，用 <code>transformers</code> 的批大小扫描作为退化版本，并在报告中说明限制。</li>
  </ol>

  <section class="blk blk-m">
    <h4><span class="ic">∑</span>三个指标不可能同时最优</h4>
    <p>设单次请求的延迟为 \(L\)、并发数为 \(c\)、吞吐为 \(R\)（tokens/s）。在批处理下近似有</p>
    \[ R(c) \;\approx\; \frac{c \cdot \bar{n}}{L_{\text{prefill}} + c \cdot \bar{n} / \rho} \]
    <p>
      其中 \(\bar{n}\) 是平均输出长度、\(\rho\) 是硬件的稳态解码速率。当 \(c\) 小时 \(R \propto c\)（延迟近似不变）；
      当 \(c\) 大到计算或显存带宽饱和时，\(R\) 趋于平台而 \(L\) <strong>线性上升</strong>。
      于是「高吞吐」与「低延迟」在饱和区是互斥的：你必须为业务选择一个工作点，
      而这个工作点只能通过实测得到——这就是这个实验的全部意义。
    </p>
  </section>

  <p><strong>可运行代码</strong>（第一部分：量化对比）：</p>
<pre><code><span class="cm"># E8 第一部分 · bf16 vs 4-bit（T4 16GB，约 20 分钟）</span>
!pip -q install -U "transformers" "accelerate" "bitsandbytes" pandas matplotlib

import gc, time, torch, pandas as pd
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"          <span class="cm"># 1B 级以下</span>
PROMPT = "用三句话解释因果掩码的必要性。"
NEW_TOKENS = 128
assert torch.cuda.is_available(), "4-bit 路径需要 CUDA"

tok = AutoTokenizer.from_pretrained(MODEL_ID)
tok.pad_token = tok.pad_token or tok.eos_token
tok.padding_side = "left"

def load_bf16():
    return AutoModelForCausalLM.from_pretrained(
        MODEL_ID, torch_dtype=torch.bfloat16, device_map={"": 0})

def load_int4():
    qc = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    return AutoModelForCausalLM.from_pretrained(
        MODEL_ID, quantization_config=qc, device_map={"": 0})

@torch.no_grad()
def bench(model, bs=8, reps=3, new_tokens=NEW_TOKENS):
    inp = tok([PROMPT] * bs, return_tensors="pt", padding=True).to("cuda")
    model.generate(**inp, max_new_tokens=4, do_sample=False,
                   pad_token_id=tok.pad_token_id)              <span class="cm"># 预热</span>
    torch.cuda.synchronize(); torch.cuda.reset_peak_memory_stats()
    ts = []
    for _ in range(reps):
        t0 = time.perf_counter()
        out = model.generate(**inp, max_new_tokens=new_tokens, do_sample=False,
                             pad_token_id=tok.pad_token_id)
        torch.cuda.synchronize(); ts.append(time.perf_counter() - t0)
    dt = min(ts)                                               <span class="cm"># 取最快一次，降低噪声</span>
    n_new = (out.shape[1] - inp["input_ids"].shape[1]) * bs
    return dict(peak_GB=round(torch.cuda.max_memory_allocated() / 2**30, 2),
                latency_s=round(dt, 2), tokens_per_s=round(n_new / dt, 1))

rows = []
for tag, loader in [("bf16", load_bf16), ("int4-nf4", load_int4)]:
    gc.collect(); torch.cuda.empty_cache()
    model = loader(); model.eval()
    print(f"--- {tag} ---")
    for bs in (1, 8, 32):
        r = bench(model, bs=bs)
        rows.append(dict(mode=tag, batch=bs, **r))
        print(f"bs={bs:3d}  peak={r['peak_GB']:5.2f} GB  "
              f"latency={r['latency_s']:6.2f}s  {r['tokens_per_s']:8.1f} tok/s")
    <span class="cm"># 质量对照：贪心解码必须完全可复现</span>
    inp = tok([PROMPT], return_tensors="pt").to("cuda")
    with torch.no_grad():
        out = model.generate(**inp, max_new_tokens=64, do_sample=False,
                             pad_token_id=tok.pad_token_id)
    print("GENERATION:", tok.decode(out[0][inp["input_ids"].shape[1]:],
                                    skip_special_tokens=True).replace("\n", " ")[:200])
    del model; gc.collect(); torch.cuda.empty_cache()

print(pd.DataFrame(rows).to_string(index=False))</code></pre>

  <p><strong>可运行代码</strong>（第二部分：vLLM 并发扫描）：</p>
<pre><code><span class="cm"># E8 第二部分 · vLLM 服务化 + 并发扫描</span>
!pip -q install -U vllm

<span class="cm"># 后台启动 OpenAI 兼容服务（约需 1–3 分钟加载权重）</span>
!nohup python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen2.5-0.5B-Instruct --dtype bfloat16 --max-model-len 2048 --gpu-memory-utilization 0.85 --port 8000 --disable-log-requests &gt; vllm.log 2&gt;&amp;1 &amp;
!sleep 150
!tail -n 6 vllm.log

import concurrent.futures as cf, statistics, time, requests

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
PROMPT = "用三句话解释因果掩码的必要性。"
URL = "http://127.0.0.1:8000/v1/completions"

def one(_):
    t0 = time.perf_counter()
    r = requests.post(URL, json={"model": MODEL_ID, "prompt": PROMPT,
                                 "max_tokens": 128, "temperature": 0.0},
                      timeout=300).json()
    dt = time.perf_counter() - t0
    return dt, r["usage"]["completion_tokens"]

print(f"{'conc':&gt;5s} {'wall(s)':&gt;8s} {'tok/s':&gt;9s} {'p50(s)':&gt;7s} {'p95(s)':&gt;7s}")
results = []
for conc in (1, 2, 4, 8, 16, 32):
    t0 = time.perf_counter()
    with cf.ThreadPoolExecutor(max_workers=conc) as ex:
        out = list(ex.map(one, range(conc)))
    wall = time.perf_counter() - t0
    toks = sum(n for _, n in out)
    lat = sorted(dt for dt, _ in out)
    p50 = statistics.median(lat)
    p95 = lat[min(len(lat) - 1, int(0.95 * len(lat)))]
    results.append(dict(conc=conc, wall=round(wall, 2),
                        tok_per_s=round(toks / wall, 1),
                        p50=round(p50, 2), p95=round(p95, 2)))
    print(f"{conc:5d} {wall:8.2f} {toks / wall:9.1f} {p50:7.2f} {p95:7.2f}")

import pandas as pd, matplotlib.pyplot as plt
df = pd.DataFrame(results)
fig, ax1 = plt.subplots(figsize=(7.5, 4.5))
ax1.plot(df["conc"], df["tok_per_s"], "o-", color="#0f6b63", label="吞吐 tok/s")
ax1.set_xscale("log", base=2); ax1.set_xlabel("并发数"); ax1.set_ylabel("吞吐 (tok/s)")
ax2 = ax1.twinx()
ax2.plot(df["conc"], df["p50"], "s--", color="#a8630a", label="p50 延迟")
ax2.plot(df["conc"], df["p95"], "^:", color="#a52121", label="p95 延迟")
ax2.set_ylabel("延迟 (s)")
ax1.grid(alpha=0.3); ax1.legend(loc="upper left"); ax2.legend(loc="lower right")
ax1.set_title("吞吐 vs 延迟：并发扫描"); plt.tight_layout(); plt.show()

<span class="cm"># 关闭服务</span>
!pkill -f api_server

<span class="cm"># ---------- 退化方案：没有 vLLM 时，用批大小扫描代替并发扫描 ----------</span>
<span class="cm"># 语义不同（批处理是同步的，并发是异步的），报告中必须写明这一限制。</span>
def bs_sweep(model, sizes=(1, 2, 4, 8, 16)):
    for bs in sizes:
        r = bench(model, bs=bs, new_tokens=64)
        print(f"batch={bs:3d}  {r['tokens_per_s']:8.1f} tok/s  latency={r['latency_s']:.2f}s")</code></pre>

  <p><strong>预期输出</strong>（T4 16GB，Qwen2.5-0.5B，128 新 token）：</p>
<pre><code>mode      batch  peak_GB  latency_s  tokens_per_s
bf16          1     1.xx       2.1x          6x.x
bf16          8     1.xx       5.xx        1xx.x
bf16         32     2.xx      1x.xx        3xx.x
int4-nf4      1     0.xx       3.xx        4x.x
int4-nf4      8     0.xx       8.xx         9x.x
int4-nf4     32     0.xx      2x.xx        1xx.x

conc  wall(s)    tok/s  p50(s)  p95(s)
   1     2.1x     6x.x    2.1x    2.1x
   2     2.3x     1xx.x   2.2x    2.3x
   4     2.8x     1xx.x   2.5x    2.8x
   8     4.1x     2xx.x   3.2x    4.0x
  16     7.6x     2xx.x   6.5x    7.5x
  32    14.9x     2xx.x  13.1x   14.8x</code></pre>
  <p>
    <strong>怎么读这两张表</strong>：int4 把峰值显存压到约 1/3，但在 T4 上<strong>单请求延迟反而变差</strong>——
    因为 T4 没有原生的 4-bit 张量核心，反量化开销落在通用算力上。
    这正是「省显存 ≠ 更快」的教科书案例。吞吐随并发上升，但 p95 延迟几乎与并发数线性增长：
    从 1 到 32，吞吐只涨了 3–4 倍，而 p95 延迟涨了 7 倍。
  </p>

  <p><strong>要记录什么</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>记录项</th><th>为什么</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td>峰值显存（量化前 / 后）</td><td>决定你能加载多大的模型</td><td>2.1 GB → 0.7 GB</td></tr>
      <tr><td>tokens/s 与 batch / conc 的关系</td><td>吞吐的饱和点在哪里</td><td>16 并发后走平</td></tr>
      <tr><td>p50 与 p95 延迟</td><td>用户感受到的是尾延迟，不是均值</td><td>2.1 s → 14.8 s</td></tr>
      <tr><td>量化后的输出质量</td><td>省显存的代价必须被记录</td><td>贪心输出前 200 字逐字对比</td></tr>
      <tr><td>是否为原生低精度硬件</td><td>T4 与 A100/L4 的结论正好相反</td><td>T4：int4 更慢</td></tr>
      <tr><td>并发度量方式</td><td>同步批处理 ≠ 异步并发</td><td>ThreadPool 32 路</td></tr>
      <tr><td>每美元吞吐</td><td>部署的最终目标函数</td><td>tok/s / 每小时租金</td></tr>
    </tbody>
  </table>

  <p><strong>延伸问题</strong>：</p>
  <ol>
    <li>把 <code>bnb_4bit_compute_dtype</code> 从 <code>bfloat16</code> 改成 <code>float16</code>，
        在 T4 上速度是否改善？解释原因（提示：T4 的 bf16 支持并不完整）。</li>
    <li>把 <code>bnb_4bit_use_double_quant</code> 关掉，显存与质量各变化多少？</li>
    <li>用 vLLM 的 <code>--enable-prefix-caching</code> 重跑并发扫描。当所有请求共享同一个 prompt 时，
        吞吐能提升多少？这个效应在实际业务里什么时候成立？</li>
    <li>设每小时的 GPU 租金为 \(r\)，单请求的 SLA 是 p95 \(\le 3\) 秒。用你测出的表格，
        算出「满足 SLA 且每百万 token 成本最低」的并发数。</li>
    <li>把模型换成 3B 或 7B（4-bit 仍能放进 16GB），重复整个实验。量化带来的相对收益是变大还是变小？</li>
  </ol>
</section>

<div class="acc" data-t="E8 常见错误" data-badge="排错">
  <div class="acc-body">
    <ul>
      <li><strong>CUDA out of memory</strong>：<code>bench</code> 里没有 <code>torch.no_grad()</code>，
          或者 <code>bs=32</code> 且 <code>NEW_TOKENS</code> 太大——KV Cache 随 <code>bs x new_tokens</code> 线性增长。
          先降 bs 再降长度。</li>
      <li><strong><code>bitsandbytes</code> 报 CUDA 版本不匹配</strong>：T4 与新版 bnb 常有兼容问题。
          按顺序试：重启运行时 → <code>pip install -U bitsandbytes</code> → 用 Colab 预装版本 → 换 L4/A100 运行时。</li>
      <li><strong>vLLM 起不来 / <code>CUDA error: no kernel image</code></strong>：vLLM 的预编译轮子对算力有要求。
          T4（算力 7.5）通常可用，但若报错就明确退化到批大小扫描，并在报告中写明这是替代方案。</li>
      <li><strong>并发扫描的吞吐数字很脏</strong>：服务还没加载完你就发了请求。
          先 <code>curl</code> 一下 <code>/v1/models</code> 确认服务就绪，再做 <code>sleep</code> 与预热请求。</li>
      <li><strong>p95 计算越界</strong>：当并发数很小时 <code>int(0.95 * len(lat))</code> 可能等于 <code>len(lat)</code>。
          用 <code>min(len(lat) - 1, ...)</code> 夹住索引。</li>
      <li><strong>量化后输出变成乱码</strong>：<code>compute_dtype</code> 设成了 <code>float32</code>（不支持）或权重加载被
          <code>torch_dtype</code> 覆盖。4-bit 加载时<strong>不要</strong>同时传 <code>torch_dtype</code>。</li>
    </ul>
  </div>
</div>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>把 8 个实验变成申请材料</h4>
  <p>跑完之后，你手上应该有四类可直接引用的产物：</p>
  <ol>
    <li><strong>一条能力证据链</strong>：E1 → E3 证明你理解语言模型从概率到实现的每一层；
        E4 → E5 → E8 证明你能完成微调、对齐与部署的完整闭环。</li>
    <li><strong>一个方法论证据</strong>：E7 的模型阶梯 + 分组交叉验证 + 置换检验，
        正是 Checkpoint 7 要求的统计严谨性。把那张「分组 vs 随机」的对照表直接放进报告。</li>
    <li><strong>一组可复现的曲线</strong>：每个实验的 loss 曲线与基准表，配上种子与硬件信息。</li>
    <li><strong>一份诚实的负面结果清单</strong>：E7 里 MLP 没有收益、E8 里 int4 在 T4 上更慢——
        这两条负面结论比任何「提升了 2%」都更能说明你会做实验。</li>
  </ol>
</section>
`
});
