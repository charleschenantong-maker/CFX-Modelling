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

  这是一门专为<strong>从早期就接触 AI、如今重度使用，且渴望搞清大模型底层原理的高中生与探索者</strong>量身打造的底座课程。

  你可能天天在用 ChatGPT / Claude 写作业、改代码或探讨题目，但我们这次不再只做 prompt 调优，

  而是要彻底拆开黑盒：<strong>理解注意力机制与自回归生成的数学第一性原理，掌握真实显存心算法，并在云端单张免费 T4 芯片上跑通属于你自己的模型训练。</strong>

</p>



<section class="blk blk-q">

  <h4><span class="ic">◆</span>核心学习目标：追求真实理解与动手能力，拒绝浮躁炫耀</h4>

  <p>把目标界定清晰，后面的学习路径才扎实有效：</p>

  <ol>

    <li><strong>搞透底座机制</strong>：从条件概率的链式法则到自注意力矩阵乘法，搞懂因果掩码、位置编码与交叉熵损失，真正看懂模型在每一步计算什么。</li>

    <li><strong>落地 T4 模型训练</strong>：掌握准确的显存与计算量估算（参数量、精度、优化器状态与激活值），在 Google Colab / Kaggle 免费分配的 16GB T4 GPU 上完成小模型（10M~45M）的从零预训练以及开源小底座（如 Qwen2.5-0.5B）的 LoRA 微调。</li>

    <li><strong>数学工具严格锚定 A-Level Further Maths</strong>：运用线性代数（矩阵乘法、向量内积）、微积分（导数与多元链式法则）、复数欧拉旋转（理解 RoPE 本质）和离散概率。复杂公式由浅入深铺垫，杜绝大学高阶测度论等不必要的抽象堆砌。</li>

    <li><strong>关于跨界数学建模项目（作为小参考而非前提）</strong>：本仓库虽附带了 <em>Mathematical Crossfade Modelling</em>（音频连续交叉淡入淡出建模）项目文档，但这仅作为未来探索如何将深度学习技术与传统工程问题进行 <strong>Merge</strong> 的一个小参考案例，绝非本课程的前置依赖，主线始终是通用的 LLM 底座与训练。</li>

    <li><strong>题型与学习方式</strong>：精简死记硬背的选择题，多进行<strong>纸笔手算推演（草稿纸走一遍数值）</strong>，培养对张量维度与数值流动的第一手直觉。</li>

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

  主线是<strong>通用大模型的第一性原理与单卡 T4 训练实践</strong>：每个模块聚焦原理机制与数值验证，带你一步步建立模型训练的直觉。

  涉及未来工程建模（如 crossfade 项目）的内容仅作为跨界拓展参考；轨道 C 则教你如何最大化利用手头的免费算力（如 Colab T4）与开发工具，把时间真正用在刀刃上。

</p>



<h3>2. 核心实验工具与学习环境</h3>

<table class="tbl">
  <thead><tr><th>工具与平台</th><th>定位与长处</th><th>最适合用途</th><th>核心建议</th></tr></thead>
  <tbody>
    <tr><td><strong>Kaggle Notebooks（核心主训平台）</strong></td><td>每周 30 小时免费 GPU，提供双卡 T4 ×2 与单卡 T4，支持持久化输出</td><td><strong>从零预训练 miniGPT、0.5B/1.5B 开源基座 QLoRA 4-bit 微调</strong></td><td>使用「Save Version → Save & Run All」后台静默运行，产出直接写入 <code>/kaggle/working</code>，无需担心断线丢失</td></tr>
    <tr><td><strong>Hugging Face Hub</strong></td><td>全球开源模型权重与开源语料库</td><td>下载开源基座（如 Qwen2.5-0.5B）、Tokenizer 与清洗后的微调数据集</td><td>通过标准 <code>transformers</code> 与 <code>peft</code> 库加载，安全可靠</td></tr>
    <tr><td><strong>PyTorch & Transformers 生态</strong></td><td>工业标准深度学习底层</td><td>编写 Tensor 运算、前向传播、因果掩码与自定义训练循环</td><td>配合本课程手写极简训练脚本，拒绝不透明的黑盒封装</td></tr>
    <tr><td><strong>草稿纸与纸笔手算</strong></td><td>第一性原理直觉工具</td><td><strong>手算点积注意力、Softmax 概率换算、参数量与显存预算</strong></td><td>凡是看不懂的代码，在草稿纸上走一遍标量或 2D 玩具数值即可彻底看透</td></tr>
  </tbody>
</table>



<h3>3. 课程地图</h3>

<table class="tbl small">

  <thead><tr><th>部分</th><th>模块</th><th>你会得到什么</th></tr></thead>

  <tbody>

    <tr><td><strong>I 底座</strong></td><td>01–05</td><td>语言模型的概率本质、tokenizer、注意力、Transformer 结构、预训练全流程与显存/算力公式</td></tr>

    <tr><td><strong>II 训练与推理</strong></td><td>06–09</td><td>数据并行/FSDP/张量并行（含 JAX 版）、SFT→DPO→GRPO 全谱系、量化与 vLLM、评估的科研方法</td></tr>

    <tr><td><strong>III 算力</strong></td><td>10</td><td>Colab / Kaggle / HF Jobs 上能跑什么、怎么不浪费额度</td></tr>

    <tr><td><strong>IV 算力与系统</strong></td><td>11–15</td><td>计算规模法则（Scaling Laws & Chinchilla 定律）、MoE 专家架构、长上下文 RoPE 外推与任务调度</td></tr>

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

