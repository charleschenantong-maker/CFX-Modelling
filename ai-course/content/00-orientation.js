/* content/00-orientation.js — 模块 00：导读 */
COURSE.register({
  id: "m0",
  part: 0,
  num: "00",
  title: "导读：这门课为谁写、怎么用、你手上有什么",
  en: "Orientation — How to use this course",
  minutes: 15,
  tags: ["导读", "路线图", "资源盘点"],
  body: String.raw`
<p class="lead">
  这门课只有一个目标：让你在<strong>几周之内</strong>具备「看懂、跑通、并且能批判」现代大模型训练的能力，
  同时学会把订阅、免费算力和公开资料，转化成<strong>以后做类似项目时可用的实验方法</strong>。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>先回答一个问题：你要用 LLM 干什么？</h4>
  <p>把目标写清楚，后面的学习顺序才不会乱。你的场景大致有三层，它们共用同一套底座知识：</p>
  <ol>
    <li><strong>项目层（申请用，未来示例）</strong>：以 <em>Mathematical Crossfade Modelling</em> 这类题目为例（你以后可以试试），用一个<strong>可辩护的统计学习实验</strong>，预测「过渡时长 / 曲线参数」这类低维目标，并且能证明它是否真的优于解析解。</li>
    <li><strong>能力层（兴趣）</strong>：自己想训练模型。从零跑通一个 miniGPT，知道数据、tokenizer、优化器、并行、显存、评估各自在干什么。</li>
    <li><strong>工程层（日常效率）</strong>：用订阅额度 + 多线程智能体，把「写代码 → 验证 → 提交 → 监控 CI」自动化，把时间花在数学上。</li>
  </ol>
</section>

<h3>1. 三条轨道，一条主线</h3>
<div class="flow">
  <div class="nd hi">轨道 A · 底座</div><div class="ar">→</div>
  <div class="nd">Token / 注意力 / Transformer / 预训练</div><div class="ar">=</div>
  <div class="nd">看懂模型内部在算什么</div>
</div>
<div class="flow">
  <div class="nd hi">轨道 B · 训练</div><div class="ar">→</div>
  <div class="nd">SFT / LoRA / DPO / GRPO / 并行 / 推理部署</div><div class="ar">=</div>
  <div class="nd">能把一个模型改造成你要的样子</div>
</div>
<div class="flow">
  <div class="nd hi">轨道 C · 系统</div><div class="ar">→</div>
  <div class="nd">Colab 算力 / 订阅套利 / 代理与网络 / 多线程舰队</div><div class="ar">=</div>
  <div class="nd">用最低成本持续产出实验</div>
</div>
<p>
  主线是<strong>以后做这类项目时的迁移</strong>：每个模块末尾都会回到「这对 crossfade 这类任务意味着什么，你以后接到类似项目时该怎么用」。
  轨道 C 的内容看起来像「运维」，但它决定了你一周能跑几个实验——对申请季的时间预算来说，这比多背两个术语重要得多。
</p>

<h3>2. 你手上的资源，以及它们各自适合干什么</h3>
<table class="tbl">
  <thead><tr><th>资源</th><th>本质</th><th>最适合的用途</th><th>注意</th></tr></thead>
  <tbody>
    <tr><td><strong>Codex Plus</strong>（$20/月）</td><td>订阅内推理额度，与「工作」共享同一个池子</td><td>代码任务主力：重构、调试、批量审查；<strong>按难度选模型</strong></td><td>每 5 小时 + 每周<strong>双重窗口</strong>；实时余量看「设置 → 用量」</td></tr>
    <tr><td><strong>Google AI Pro ×3</strong></td><td>每月 Colab <strong>计算单元</strong> + Gemini 额度</td><td><strong>真正的训练实验</strong>（GPU/TPU notebook）</td><td>余额耗尽会退回免费层策略；<strong>三个账号不能合并来绕过限额</strong>（违反 Colab 政策）</td></tr>
    <tr><td><strong>opencode / OpenRouter 免费额度</strong></td><td>模型路由与试用额度</td><td>原型、对比不同模型、跑小任务</td><td>额度波动大，别写进关键路径</td></tr>
    <tr><td><strong>Claude Pro</strong>（$20/月，已订阅）</td><td>按「用量」计量的订阅额度（不是消息条数）</td><td>长上下文数学推导、论文精读、写作</td><td>5 小时 + 每周窗口；用 <code>/usage</code> 查；周上限自 2026-09-14 起永久 +25%</td></tr>
    <tr><td><strong>Hugging Face</strong></td><td>模型 / 数据集 / 训练库 / 文档</td><td>TRL 做对齐、datasets 取数据、Hub 存检查点</td><td>注意数据集许可与污染</td></tr>
    <tr><td><strong>YouTube / 访谈记录</strong></td><td>工程经验与经济学</td><td>建立「怎么用」的直觉（第 11–15 模块）</td><td>量级参考，不是精确报价</td></tr>
    <tr><td><strong>AI 素养官方课</strong>（22 门，免费）</td><td>可迁移的人机协作能力：委派、描述、辨识、尽责</td><td>补「怎么和别人协作使用 AI」这一层，配 <a href="#appG">附录 G</a> 的映射表用</td><td><strong>不要只会上某一家的产品</strong>：学完用附录 G 的中立检查表验收自己</td></tr>
  </tbody>
</table>

<h3>3. 课程地图</h3>
<table class="tbl small">
  <thead><tr><th>部分</th><th>模块</th><th>你会得到什么</th></tr></thead>
  <tbody>
    <tr><td><strong>I 底座</strong></td><td>01–05</td><td>语言模型的概率本质、tokenizer、注意力、Transformer 结构、预训练全流程与显存/算力公式</td></tr>
    <tr><td><strong>II 训练与推理</strong></td><td>06–09</td><td>数据并行/FSDP/张量并行（含 JAX 版）、SFT→DPO→GRPO 全谱系、量化与 vLLM、评估的科研方法</td></tr>
    <tr><td><strong>III 算力</strong></td><td>10</td><td>Colab / Kaggle / HF Jobs 上能跑什么、怎么不浪费额度</td></tr>
    <tr><td><strong>IV 经济与基础设施</strong></td><td>11–15</td><td>订阅套利数学、住宅 IP 与代理架构、重置动力学、多线程工作流、硬件与操作系统瓶颈</td></tr>
    <tr><td><strong>V 收束</strong></td><td>16</td><td>把上面全部映射回 8 个检查点，给出可执行的 12 周计划</td></tr>
    <tr><td><strong>附录</strong></td><td>A–G</td><td>术语表、Colab 实验手册、资源地图、合规提示、综合自测、速查手册、<strong>AI 素养课地图</strong></td></tr>
  </tbody>
</table>

<h3>4. 两种用法：先通读，之后当手册</h3>
<p>
  这份材料是按「<strong>读一遍 → 之后反复查</strong>」设计的。两种用法差别很大，先想清楚你现在处于哪一种。
</p>
<table class="tbl">
  <thead><tr><th>阶段</th><th>怎么用</th><th>主要看哪些</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>第一次：通读</strong><br />（约 6–10 小时）</td>
      <td>按顺序读 00 → P → 01 → … → 16，每讲结束做自测；折叠的「深入」可以先跳过，
          等真正用到时再回来</td>
      <td>正文 24 讲；每讲 20–60 分钟。零基础务必先读 <strong>P 预备课</strong></td>
    </tr>
    <tr>
      <td><strong>之后：当手册查</strong><br />（每次 1–3 分钟）</td>
      <td>用顶部搜索框（快捷键 <code>/</code>）按关键词定位；或直接翻附录：
          公式、数字、超参、命令、排错决策都在 <a href="#appF">附录 F 速查手册</a>，
          术语在 <a href="#appA">附录 A 术语表</a>（355 条，按 14 类分好）</td>
      <td>附录 A（术语）、附录 F（七张速查表）、附录 G（22 门 AI 素养官方课怎么用）、每讲顶部的「本讲速查」</td>
    </tr>
  </tbody>
</table>
<p>为了让「查」这一步足够快，页面专门做了这几件事：</p>
<ul>
  <li><strong>本讲速查</strong>：每讲顶部有一个可展开的小目录，列出该讲所有小节，一键跳到任意一节。</li>
  <li><strong>关键词搜索</strong>：搜标题、正文与公式；<code>↑ ↓</code> 选择、<code>Enter</code> 跳转（快捷键 <code>/</code>）。</li>
  <li><strong>术语悬浮</strong>：正文里带虚线的词，鼠标停上去就显示中英对照定义，不用翻附录。</li>
  <li><strong>回到顶部</strong>：右下角按钮，长文里随时回到开头。</li>
  <li><strong>打印 / 导出 PDF</strong>：右上角按钮会自动展开全部折叠内容，适合离线当参考书翻。</li>
</ul>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>高阶章（17–24）怎么读：三层读法</h4>
  <p>
    v1.2 把这八章按「能算、能跑、能验证」加厚了一遍。它们比前面几章长，但<strong>不需要一次读完</strong>——
    每章都是同样的五段结构，按你的目的挑着读：
  </p>
  <ol>
    <li><strong>先读「零基础入口 + 问题」</strong>（约 5 分钟）：判断这一章与 crossfade 这类未来题目有没有关系。没关系就跳过，这不丢人——
        八章里有四章对 crossfade 这类任务只需「知道就好」。</li>
    <li><strong>再读手算例子与查表</strong>：每章都有带具体数字的算例和「症状 → 原因 → 一行验证 → 对策」的失败模式表。
        这两样是真正会反复回来查的部分，也是别人问你「你懂不懂」时你能立刻答出来的部分。</li>
    <li><strong>有需要时再动手</strong>：每章有一个 <span class="t" data-tterm="Hands-on block" data-d="课程里所有带 🧪 图标的版块：给出能在 30 分钟内跑完的最小实现与要记录的数字。">30 分钟最小实现</span>，
        不依赖任何托管服务；跑完只需记住三个数字，写进你的实验记录。</li>
  </ol>
  <p>
    每章末尾还有两样东西：<strong>自测题</strong>（点选项立刻判定）和<strong>「怎么用在真实项目里」</strong>——
    后者会直接回答「这件事若用在 crossfade 这类任务上值不值、为什么，你以后可以照此估算」。如果时间只够读一节，
    读那一节比读完全章更有用。
  </p>
</section>

<h3>5. 界面怎么用</h3>
<ul>
  <li><strong>左侧目录</strong>会跟着滚动高亮；点圆圈「标记为已读完」，进度会存在浏览器本地。</li>
  <li><strong>搜索框</strong>（快捷键 <code>/</code>）搜标题、正文与公式；<code>↑ ↓</code> 选择，<code>Enter</code> 跳转。</li>
  <li>带虚线下划线的词是<span class="t" data-tterm="Glossary tooltip" data-d="鼠标悬停即可看到中英对照与一句话定义；完整术语表见附录 A。">术语</span>，悬停看定义。</li>
  <li>灰色折叠块 <strong>「深入」</strong> 是可选的第二层内容，第一遍可以跳过。</li>
  <li>每个模块末尾有<strong>自测题</strong>：点选项立刻判定，答错会给出解析。</li>
  <li>右上角<strong>打印</strong>按钮会把所有折叠内容展开，适合导出成 PDF 慢慢看。</li>
</ul>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>开始之前：十分钟环境检查</h4>
  <p>在动手前，把三件事确认下来（后面的实验都依赖它们）：</p>
  <ol>
    <li>登录 <a href="https://colab.research.google.com/notebooks/intro.ipynb" target="_blank" rel="noopener">Google Colab</a>，
        新建 notebook，运行 <code>!nvidia-smi</code> 或 <code>import jax; jax.devices()</code>，确认你拿到的加速器型号。</li>
    <li>注册 <a href="https://huggingface.co/join" target="_blank" rel="noopener">Hugging Face</a> 账号，在 Settings → Access Tokens 建一个 read 权限 token。</li>
    <li>准备一个放实验记录的仓库（就用本工作区即可）：每天一次 <code>git commit</code>，实验结论写在 <code>notes/</code> 里。</li>
  </ol>
</section>

<h3>6. 数学符号约定</h3>
<table class="tbl small">
  <thead><tr><th>符号</th><th>含义</th><th>典型出现位置</th></tr></thead>
  <tbody>
    <tr><td>\(x_{1:T}\)</td><td>长度为 \(T\) 的 token 序列</td><td>语言模型建模</td></tr>
    <tr><td>\(d\) / \(L\) / \(h\)</td><td>隐藏维度 / 层数 / 注意力头数</td><td>参数量与显存估算</td></tr>
    <tr><td>\(B\) / \(S\)</td><td>批大小 / 序列长度</td><td>吞吐与激活值</td></tr>
    <tr><td>\(N\) / \(D\) / \(C\)</td><td>参数量 / 训练 token 数 / 训练算力</td><td>缩放律，\(C \approx 6ND\)</td></tr>
    <tr><td>\(\theta\)</td><td>模型参数</td><td>优化</td></tr>
    <tr><td>\(\mathcal{L}\)</td><td>损失函数</td><td>交叉熵、DPO、GRPO</td></tr>
    <tr><td>\(\eta\) / \(\lambda\)</td><td>学习率 / 正则强度</td><td>优化与岭回归</td></tr>
  </tbody>
</table>

<h3>7. 建议节奏（12 周，每周 6–8 小时）</h3>
<table class="tbl small">
  <thead><tr><th>周</th><th>模块</th><th>产出（可放进申请材料）</th></tr></thead>
  <tbody>
    <tr><td>1–2</td><td>01–04</td><td>从零写出 bigram 与迷你 Transformer，能在 Colab 上跑通并画出 loss 曲线</td></tr>
    <tr><td>3–4</td><td>05–06</td><td>跑通 JAX miniGPT 教程；写下参数量/显存/通信量的手算推导</td></tr>
    <tr><td>5–6</td><td>07–08</td><td>用 TRL 完成一次 LoRA 微调 + 一次 DPO；量化并部署成可交互 demo</td></tr>
    <tr><td>7</td><td>09</td><td>完成 Checkpoint 7 的模型阶梯 + 分组交叉验证 + 置换检验</td></tr>
    <tr><td>8–9</td><td>10–11</td><td>算清你的算力预算与订阅等效额度；确定实验配额分配</td></tr>
    <tr><td>10–11</td><td>12–15</td><td>搭起代理/网络与多线程工作流，形成稳定的日更节奏</td></tr>
    <tr><td>12</td><td>16</td><td>整合成一份研究报告 + 口头答辩稿</td></tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 概念辨析</div>
  <p class="q">下面哪一种做法最符合本课程的「科学优先」原则？</p>
  <ul class="opts">
    <li>先用最大的模型把音频端到端生成出来，效果好就写进报告</li>
    <li data-ok>先用解析模型把物理关系写清楚，只在留有余量的低维参数上引入学习，并用分组交叉验证检验它是否真的更好</li>
    <li>把能买到的算力全部用来做网格搜索，找到最优超参数再反推理论</li>
    <li>直接引用别人的 benchmark 分数，因为复现成本太高</li>
  </ul>
  <p class="why">
    这正是 Checkpoint 7 的立场：<strong>学习只应该出现在解析模型留下自由参数的地方</strong>。
    端到端生成音频会同时引入相位伪影、高延迟与过拟合；而网格搜索得到的是「对这份数据最优」的超参数，
    不是可迁移的机制。分组交叉验证与置换检验（模块 09）是判断「学习是否真的加了价值」的最低门槛。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 资源分配</div>
  <p class="q">你想在两周内验证「LoRA 秩 r 对验证损失的影响」。最合理的算力安排是？</p>
  <ul class="opts">
    <li>用 Codex 订阅额度去跑训练，因为它「等价推理量最大」</li>
    <li>在本地笔记本上用 CPU 跑，省下云额度</li>
    <li data-ok>用 Colab/Kaggle 的 GPU 跑 3 个秩的小规模对照实验，用订阅额度写脚本、读代码、分析结果</li>
    <li>一次性申请最大 TPU，把 r 从 1 扫到 256</li>
  </ul>
  <p class="why">
    订阅额度本质是<strong>推理</strong>额度（token 买卖），它不能替代 GPU 训练算力：训练是持续数小时的前向+反向+通信。
    正确分工是「拿算力做实验、拿订阅额度做智力劳动」。扫 256 个点则是典型的算力浪费——先用小规模实验定位趋势。
  </p>
</div>

<div class="acc" data-t="深入：如何读一篇 LLM 论文（15 分钟法）" data-badge="可选">
  <div class="acc-body">
    <ol>
      <li><strong>先读摘要的最后两句与图表标题</strong>。LLM 论文的贡献通常就藏在 loss 曲线与「我们在 X 上提升 Y%」里。</li>
      <li><strong>定位三件事</strong>：数据是什么、模型多大、比较对象是谁。缺任何一项，结论都不可迁移。</li>
      <li><strong>找消融</strong>。如果没有消融表，你对「是什么起作用」几乎一无所知。</li>
      <li><strong>读训练细节</strong>：学习率、批大小、序列长度、是否重计算。这是复现失败最集中的地方。</li>
      <li><strong>写下你自己的反驳</strong>：哪种更简单的解释也能产生同样的曲线？（见模块 09 的 Permutation Test）</li>
    </ol>
    <p>配套资源：<a href="https://huggingface.co/learn" target="_blank" rel="noopener">Hugging Face Learn</a> 的 LLM Course 适合查漏补缺，
     <a href="https://huggingface.co/docs/trl/paper_index" target="_blank" rel="noopener">TRL Paper Index</a> 则把对齐算法的原始论文按方法列好了。</p>
  </div>
</div>
`
});
