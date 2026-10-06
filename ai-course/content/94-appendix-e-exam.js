/* content/94-appendix-e-exam.js — 附录 E：综合自测 */
COURSE.register({
  id: "appE",
  part: 9,
  num: "E",
  title: "附录 E · 综合自测（20 题 + 3 道开放题）",
  en: "Appendix E — Final Exam",
  minutes: 60,
  tags: ["附录", "自测"],
  body: String.raw`
<p class="lead">
  这是一份覆盖全课程的收尾自测：<strong>20 道选择题 + 3 道开放题</strong>。
  它的目的不是给你一个分数，而是找出「你以为懂了、其实只是读过」的地方。
  其中 9 道是计算题——遇到它们请务必手算，看懂别人的算式和能自己写出算式，是两种不同的能力。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>使用说明</h4>
  <ol>
    <li><strong>先合上正文再做。</strong>翻着模块做题只能训练检索，不能训练理解。</li>
    <li><strong>每题先写下选项与一句理由，再点开解析。</strong>答对但理由错，等于答错。</li>
    <li><strong>错题回到对应模块重做那一小节</strong>，不要只记住正确答案。</li>
    <li><strong>选择题正确率建议达到 85%（20 题中至少 17 题）再进入项目阶段</strong>；
        开放题按 3 / 2 / 1 分自评，累计 6 分以上再动笔写申请材料。</li>
    <li>计算题只允许用计算器做最后一步换算，算式必须自己写出来。</li>
  </ol>
</section>

<h3>评分表</h3>
<table class="tbl small">
  <thead><tr><th>部分</th><th>题量</th><th>分值</th><th>建议用时</th><th>通过标准</th></tr></thead>
  <tbody>
    <tr><td>选择题</td><td>20 题</td><td>每题 1 分（共 20 分）</td><td>40 分钟</td><td>≥ 17 分（85%）</td></tr>
    <tr><td>开放题</td><td>3 题</td><td>每题 3 分（共 9 分）</td><td>30 分钟</td><td>≥ 6 分</td></tr>
  </tbody>
</table>
<table class="tbl small">
  <thead><tr><th>选择题得分</th><th>含义</th><th>建议</th></tr></thead>
  <tbody>
    <tr><td>18–20</td><td>底座牢固</td><td>直接进入项目阶段，把精力放在实验设计与写作上</td></tr>
    <tr><td>15–17</td><td>基本掌握，有明确薄弱模块</td><td>按错题定位一两个模块，重做那里的动手实验</td></tr>
    <tr><td>11–14</td><td>读过，但没内化</td><td>重读模块 03–09，并把全部计算题手推一遍</td></tr>
    <tr><td>0–10</td><td>还没建立框架</td><td>回到模块 00 的路线图，按部分 I → II 顺序重来</td></tr>
  </tbody>
</table>

<h3>第一部分 · 选择题（20 题）</h3>

<div class="quiz">
  <div class="qlabel">第 1 题 · 概率与目标函数 · 计算</div>
  <p class="q">一个语言模型在某语料上的交叉熵是 \(2.0\) nats/token，它的困惑度约为多少？</p>
  <ul class="opts">
    <li>2.0</li>
    <li data-ok>约 7.4</li>
    <li>约 0.69</li>
    <li>无法从交叉熵推出困惑度</li>
  </ul>
  <p class="why">
    算式：\(\text{PPL} = \exp(\mathcal{L}) = \exp(2.0) \approx 7.39 \approx 7.4\)，
    也就是模型平均在约 7.4 个等概率候选之间犹豫。
    第一项直接把损失值当成了困惑度——困惑度一定 \(\ge 1\)；
    第三项是把 \(\ln 2 \approx 0.69\) 或 \(1/2\) 混了进来；
    第四项错误：只要给的是「每 token 的 nats」，就能换算。
    顺带记住：困惑度依赖 tokenizer，跨模型比较通常用 \(\mathcal{L}/\ln 2 \approx 2.9\) bits/token。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 2 题 · 概率与目标函数 · 温度</div>
  <p class="q">生成时把温度从 \(1.0\) 提到 \(1.5\)，分布会发生什么变化？</p>
  <ul class="opts">
    <li>分布更尖锐，熵下降，输出更确定</li>
    <li>模型参数会被重新训练，等价于换了一个模型</li>
    <li data-ok>分布更平坦、熵上升，等价交叉熵变大，输出更多样但也更容易出错</li>
    <li>温度大于 1 时 softmax 不再输出合法的概率分布</li>
  </ul>
  <p class="why">
    温度只做一件事：把 logits 除以 \(T\) 再做 softmax。
    \(T > 1\) 会压小 logits 之间的差距，分布更平坦、熵更大，等价的交叉熵（困惑度）变大；
    \(T \to 0\) 退化为取 argmax，更确定但容易重复、缺少多样性。
    第二项错在温度不改变任何参数；第四项错在温度是 softmax 的正常参数，输出始终是合法分布。
    要记住的是：<strong>温度改变的是采样分布，不是模型的知识。</strong>
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 3 题 · Tokenizer 与数据 · 计算性推理</div>
  <p class="q">把词表从 32k 扩到 128k，同一段文本会发生什么？</p>
  <ul class="opts">
    <li data-ok>token 数变少、序列更短；每个 token 承载更多信息，绝对损失通常变大，跨分词器比较要用 bits/byte</li>
    <li>同一段文本会被切成更多 token，因此训练更难</li>
    <li>词表变大等价于把模型变小，参数量随之减少</li>
    <li>困惑度会同比下降，所以两个模型的困惑度可以直接比较</li>
  </ul>
  <p class="why">
    更大的词表会把同样的文本切成更少的 token（相当于更强的压缩），
    所以「每 token」承载的信息量更大，绝对 per-token 损失通常上升；要比较就必须归一化到
    bits/byte（\(\mathcal{L}/\ln 2\) 再除以字节数）。
    第二项方向相反；第三项错在词表只影响输入 embedding 与输出层的参数量，而且是<strong>增加</strong>；
    第四项错在困惑度的定义本身就依赖分词方式，两个不同 tokenizer 的困惑度不可比。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 4 题 · Tokenizer 与数据 · 污染</div>
  <p class="q">你怀疑训练语料里混进了测试集的近重复样本。哪一种处理是正确的？</p>
  <ul class="opts">
    <li>提高正则化强度（weight decay 与 dropout）就能消除影响</li>
    <li>换随机种子多跑几次取平均，可以把虚高的分数拉回真实水平</li>
    <li>只要测试集里没有完全相同的音频文件，就不构成污染</li>
    <li data-ok>训练前做精确、子串与近似近邻去重，并在报告中披露检查流程——污染是数据问题，正则化与多种子都改不了它</li>
  </ul>
  <p class="why">
    污染（contamination）意味着测试样本的信息已经进入训练，这是<strong>数据划分</strong>的问题，
    与优化无关，因此第一、二项无效。第三项错在近重复就足够泄露：
    同一段录音的不同编码、同一首曲子的不同段落、同一道题的改写版本都会让分数虚高。
    正确做法是训练前去重（精确匹配、子串匹配、n-gram 或嵌入近邻），并在报告里写清方法与结果——
    这既是科研诚实，也是让别人相信你的分数的前提。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 5 题 · 注意力与架构 · 计算</div>
  <p class="q">一个 32 层、\(d_{\text{model}} = 4096\) 的模型用 bf16 自回归生成，批大小 8、上下文 8192。只算 KV cache，显存占用约为多少（MHA，忽略其它开销）？</p>
  <ul class="opts">
    <li>约 0.5 GiB</li>
    <li>约 4 GiB</li>
    <li data-ok>约 32 GiB</li>
    <li>约 256 GiB</li>
  </ul>
  <p class="why">
    算式：每个 token 每层要存 K 与 V，各 \(d_{\text{model}}\) 个元素，
    所以字节数 \(= 2 \times d_{\text{model}} \times L \times 2 \times S \times B
    = 2 \times 4096 \times 32 \times 2 \times 8192 \times 8 \approx 3.4\times10^{10}\) B \(\approx 32\) GiB。
    第一项漏乘了序列长度与批大小；第二项漏乘批大小；
    第四项通常是把系数或字节数重复乘了一次（例如既按 fp32 算又乘了额外的 2）。
    两个要点：GQA / MQA 会按 KV 头数除以组数，是省显存的主要手段；
    PagedAttention 只是减少碎片，不改变总量的数量级。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 6 题 · 注意力与架构 · 计算</div>
  <p class="q">词表 50000、\(d_{\text{model}} = 512\)、6 层；每层含 \(4d^2\) 的注意力投影与 \(8d^2\) 的 MLP（忽略偏置、LayerNorm，输出层与 embedding 权重共享）。总参数量最接近？</p>
  <ul class="opts">
    <li>约 \(4.5\times10^{6}\)</li>
    <li data-ok>约 \(4.5\times10^{7}\)</li>
    <li>约 \(4.5\times10^{8}\)</li>
    <li>约 \(4.5\times10^{9}\)</li>
  </ul>
  <p class="why">
    算式：embedding \(= 50000 \times 512 = 2.56\times10^{7} \approx 26\)M；
    每层 \(= 4d^2 + 8d^2 = 12d^2 = 12 \times 512^2 \approx 3.1\)M，6 层 \(\approx 19\)M；
    合计 \(\approx 45\)M（若输出层不与 embedding 共享，再加 26M）。
    第一项少了一个数量级；第三、四项相当于把 \(d^2\) 当成了 \(d^3\)，或把词表乘错了量级。
    要点：小模型里 embedding 往往占总参数的一半以上，不能只数 Transformer 层。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 7 题 · 注意力与架构 · 复杂度</div>
  <p class="q">关于标准注意力与 FlashAttention，下面哪一条是对的？</p>
  <ul class="opts">
    <li data-ok>计算量仍是 \(O(S^2 d)\)，但通过分块与在线 softmax 避免物化 \(S \times S\) 矩阵，显存降到 \(O(S)\)，实测也更快</li>
    <li>它把注意力的时间复杂度从 \(O(S^2)\) 降到了 \(O(S)\)</li>
    <li>它用低秩近似替代精确注意力，因此结果是有偏的</li>
    <li>它说明因果掩码使训练也必须逐 token 串行</li>
  </ul>
  <p class="why">
    FlashAttention 是<strong>IO 感知的精确注意力</strong>：把 Q、K、V 分块搬进片上 SRAM，
    在块内完成 softmax 并累加，从而不把 \(S \times S\) 的注意力矩阵写回显存。
    节省的是显存与显存读写，FLOPs 的数量级不变，因此第二项错；
    第三项描述的是 Linformer / Performer 那一类近似方法（结果不再精确）；
    第四项与因果掩码的作用相反：掩码保证训练可并行，只有生成必须串行。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 8 题 · 预训练与优化 · 计算</div>
  <p class="q">一个 \(7\times10^{9}\) 参数模型在 \(10^{12}\) token 上训练。总训练算力约为多少？若单卡 bf16 峰值 \(3.1\times10^{14}\) FLOP/s、实际利用率 40%，单卡需要多久？</p>
  <ul class="opts">
    <li>约 \(4.2\times10^{19}\) FLOPs，单卡约 1 小时</li>
    <li>约 \(7\times10^{21}\) FLOPs，单卡约 1 年</li>
    <li>约 \(4.2\times10^{22}\) FLOPs，单卡约 \(3.4\times10^{5}\) 秒（约 4 天）</li>
    <li data-ok>约 \(4.2\times10^{22}\) FLOPs，单卡约 \(3.4\times10^{8}\) 秒（约 11 年），所以真实预训练必须并行</li>
  </ul>
  <p class="why">
    算式：\(C \approx 6ND = 6 \times 7\times10^{9} \times 10^{12} = 4.2\times10^{22}\) FLOPs
    （系数 6 = 前向 2 + 反向 4）。
    单卡有效算力 \(= 0.4 \times 3.1\times10^{14} = 1.24\times10^{14}\) FLOP/s，
    于是 \(t = 4.2\times10^{22} / 1.24\times10^{14} \approx 3.4\times10^{8}\) 秒 \(\approx 11\) 年。
    换算成卡·日：\(3.4\times10^{8} / 86400 \approx 3900\) 卡日，也就是 1000 张卡还要约 4 天——
    这与公开文献里 7B / 1T 量级模型报告的数万 GPU 小时一致。
    第三项正是最容易犯的错：把 \(10^{14}\) 当成了 \(10^{17}\) 一类的算力，结论就少了三个数量级。
    第一、二项分别是少乘 \(10^{3}\) 与用了 \(C \approx ND\) 的粗略写法。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 9 题 · 预训练与优化 · 计算</div>
  <p class="q">用「微批 4 ｜ 梯度累积 8 ｜ 数据并行 8 卡」训练，全局批是多少？另：单卡视角，若每层每 token 需保存约 10 个 \(d\) 维激活值，bf16，每卡微批 8、序列 1024、12 层、\(d = 768\)，单卡激活显存约为多少？</p>
  <ul class="opts">
    <li>全局批 20，激活约 1.4 GiB</li>
    <li>全局批 32，激活约 14 GiB</li>
    <li data-ok>全局批 256，激活约 1.4 GiB</li>
    <li>全局批 256，激活约 140 MiB</li>
  </ul>
  <p class="why">
    算式一：全局批 \(= \text{micro-batch} \times \text{accum steps} \times \text{DP degree} = 4 \times 8 \times 8 = 256\)。
    算式二：\(8 \times 1024 \times 12 \times 10 \times 768 \times 2\) B \(\approx 1.5\times10^{9}\) B \(\approx 1.4\) GiB。
    第一项把累加当成了乘法；第二项漏乘数据并行度；第四项少了一个数量级。
    两个要点：<strong>梯度累积把峰值激活拉回微批尺度</strong>（代价是同样的数据量下更多串行的前反向步），
    要再降就得靠激活重计算；混合精度方面，bf16 数值范围大、通常不需要 loss scaling，
    fp16 则需要，这是两者最容易踩坑的区别。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 10 题 · 并行训练 · 策略选择</div>
  <p class="q">一个 70B 模型要在 8 张卡上训练，单层还放得进一张卡，你希望代码改动尽量小。首选方案是？</p>
  <ul class="opts">
    <li>标准数据并行（DDP）即可，每张卡各存一份完整模型</li>
    <li data-ok>先用 FSDP / ZeRO 分片参数、梯度与优化器状态；若单层仍放不进一张卡，再引入张量并行</li>
    <li>只能上流水线并行，因为张量并行的通信量最小、最容易写</li>
    <li>用梯度累积代替并行：把 batch 变小就不需要多卡</li>
  </ul>
  <p class="why">
    70B 的 bf16 权重约 140 GB，加上 Adam 的优化器状态（一阶、二阶矩与 fp32 主权重）会远超任何单卡，
    所以第一项不可行。FSDP / ZeRO-3 把参数、梯度、优化器状态分片，需要时再 all-gather，
    代码改动小、扩展性好，是首选。只有当<strong>单层本身</strong>放不进一张卡时才需要张量并行——
    它把层内计算切开，每层都要通信，对带宽最敏感。流水线并行适合层数多的跨节点场景，
    但有气泡与调度复杂度，因此第三项错；第四项与显存无关，梯度累积解决的是批大小，不是模型大小。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 11 题 · 并行训练 · 通信量</div>
  <p class="q">关于三种并行策略的通信特征，哪一条描述正确？</p>
  <ul class="opts">
    <li>张量并行的通信量最小，因为把矩阵乘切开后各卡可以独立完成</li>
    <li>流水线并行的通信量最大，而且它没有气泡问题</li>
    <li>三者的通信量数量级相同，选哪个只取决于代码改动量</li>
    <li data-ok>数据并行每步只同步一次梯度；张量并行在每一层内部都要通信，对卡间带宽最敏感；流水线并行只在阶段边界传激活，但需要处理气泡</li>
  </ul>
  <p class="why">
    数据并行每步一次梯度 all-reduce，还能与计算重叠，梯度累积更可以摊薄频率；
    张量并行把每层的 GEMM 切开，前向与反向都要 all-reduce 或 all-gather，通信频繁、延迟敏感，
    因此通常限制在 NVLink 域内；流水线并行只在阶段边界传激活，字节数不大，
    但要靠足够多的微批与交错调度把气泡填满。
    第一项说反了（切分不等于无通信）；第二项的后半句错；第三项忽略了通信的<strong>频率与延迟敏感性</strong>远比总字节数重要。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 12 题 · 微调与对齐 · 计算</div>
  <p class="q">对 \(d = 4096\) 的模型给 q、v 两个投影加秩 \(r = 8\) 的 LoRA。可训练参数约多少，占被替换全量参数的多少？</p>
  <ul class="opts">
    <li data-ok>约 \(1.3\times10^{5}\)，约占 0.4%</li>
    <li>约 \(6.5\times10^{4}\)，约占 0.2%</li>
    <li>约 \(3.4\times10^{7}\)，约占 100%</li>
    <li>约 \(1.0\times10^{6}\)，约占 3%</li>
  </ul>
  <p class="why">
    算式：每个 LoRA 模块的参数是 \(d \times r + r \times d = 2dr = 2 \times 4096 \times 8 = 65536\)；
    q 与 v 两个模块合计约 \(1.3\times10^{5}\)。
    被替换的全量参数是 \(2d^2 = 2 \times 4096^2 \approx 3.4\times10^{7}\)，比值约 \(0.4\%\)。
    第二项只算了一个模块；第三项是完全微调；第四项把秩或模块数放大了。
    要点：LoRA 冻结原权重、只学低秩增量，因此可训练参数、梯度与优化器状态一起缩小——
    这也是它能在单卡上微调大模型的原因。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 13 题 · 微调与对齐 · DPO 与 PPO</div>
  <p class="q">关于 DPO 与 PPO 的对比，哪一条正确？</p>
  <ul class="opts">
    <li>DPO 需要单独训练一个奖励模型，而 PPO 不需要</li>
    <li>DPO 不需要参考模型，因此不存在分布漂移</li>
    <li data-ok>DPO 直接在偏好对上用相对损失优化策略，省掉奖励模型与在线采样；PPO 需要在线 rollout，但能接入可验证奖励或过程奖励</li>
    <li>PPO 只能用于人类偏好数据，无法用于答案可自动判定的任务</li>
  </ul>
  <p class="why">
    DPO 把「带 KL 约束的奖励最大化」重写成只依赖偏好对与参考策略的对比损失，
    因此不需要显式奖励模型，也省去在线采样，工程上更简单稳定；
    代价是它只学到相对偏好，对偏好数据的覆盖与质量很敏感。
    PPO 保留在线采样，可以插入奖励模型、可验证奖励（RLVR）或过程奖励，
    因此在数学、代码这类能自动判对错的任务上更常用。
    第一项说反了；第二项错在 DPO 的损失里仍有与参考策略的比值项（隐式 KL），分布漂移照样存在；
    第四项正好相反。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 14 题 · 微调与对齐 · GRPO 与 RLVR</div>
  <p class="q">关于 GRPO 与「可验证奖励」（RLVR），哪一条描述正确？</p>
  <ul class="opts">
    <li>GRPO 用一个价值网络估计优势，因此比 PPO 多一个模型</li>
    <li data-ok>GRPO 去掉价值网络，用同一 prompt 下一组采样的相对好坏估计优势；奖励若来自可自动判定的规则（RLVR，如答案对错、单元测试通过），信号便宜且不易被刷分</li>
    <li>RLVR 的奖励来自人类标注，因此是成本最高的一类方法</li>
    <li>GRPO 与 DPO 本质等价，只是实现细节不同</li>
  </ul>
  <p class="why">
    GRPO 用组内归一化的奖励作为优势估计，省掉 critic（价值网络），显存与工程复杂度都降下来。
    RLVR 指奖励可由规则自动判定——答案与标准答案一致、代码通过单元测试——
    因此不需要训练奖励模型，也不容易被「讨好奖励模型」的伪解钻空子，这是它在数学与代码任务上流行的原因。
    第一项与事实相反；第三项把它与 RLHF 混为一谈；第四项错在 DPO 是离线偏好方法，
    没有在线采样，也没有组内相对比较。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 15 题 · 推理与部署 · 计算</div>
  <p class="q">一个 7B 模型，bf16 权重约 14 GB。若只做权重的 INT4 分组量化，部署时的显存情况是？</p>
  <ul class="opts">
    <li>权重降到约 7 GiB，KV cache 不需要考虑</li>
    <li>权重降到约 0.4 GiB，因为 4 bit 是 16 bit 的十六分之一</li>
    <li>权重不变，量化只加速计算、不省显存</li>
    <li data-ok>权重降到约 3.5 GB（另加少量 scale / zero 开销）；但总显存还必须加上随并发与上下文线性增长的 KV cache</li>
  </ul>
  <p class="why">
    算式：\(7\times10^{9}\) 个参数 \(\times\) 4 bit \(= 28\times10^{9}\) bit \(= 3.5\) GB，
    相比 bf16 的 14 GB 恰好是 4 倍（16 bit → 4 bit），另加分组量化的 scale 与 zero 点开销。
    第一项少了一半；第二项把 4 倍当成了 16 倍；第三项错在权重-only 量化确实省显存，
    也顺带降低显存带宽压力。
    要点：量化省的是权重显存与带宽，而高并发、长上下文场景下<strong>KV cache 往往比权重更吃显存</strong>，
    这时的瓶颈通常在调度与缓存管理，而不在权重精度。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 16 题 · 推理与部署 · 调度</div>
  <p class="q">关于连续批处理（continuous batching）与吞吐 / 延迟的关系，哪一条正确？</p>
  <ul class="opts">
    <li data-ok>让完成的序列立刻退出、新请求立刻进入，从而在相同显存下提升吞吐，代价是尾延迟更不稳定，可用分块预填充与调度策略缓解</li>
    <li>它把所有序列截断到同一长度，从而提升吞吐</li>
    <li>它降低吞吐，但显著改善延迟</li>
    <li>它的收益与序列长度、输出长度分布无关</li>
  </ul>
  <p class="why">
    静态批处理必须等最长的序列结束，GPU 大量空转；
    连续批处理让批在运行中不断重组（配合分页 KV 管理），吞吐可以提升数倍。
    代价是调度更复杂、P95 延迟波动更大，长 prompt 的 prefill 还会抢占 decode。
    缓解手段是分块预填充、优先级调度，以及把 prefill 与 decode 分离。
    第二项描述的是截断或 padding，不是连续批处理；第三项方向错了；
    第四项错在收益恰恰强烈依赖长度分布的离散程度——输出长度越参差，收益越大。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 17 题 · 评估与统计 · 泛化估计</div>
  <p class="q">你的音频过渡数据有 12 位艺人、每人 20 段。关于「怎么估计泛化能力」，哪一条正确？</p>
  <ul class="opts">
    <li>随机 K 折就足够，样本量小的时候越随机越公平</li>
    <li data-ok>同源样本必须整组划分（GroupKFold、留一艺人），否则测试分数会被同源特征抬高；而 VC 一类的容量界在样本量约 250 时几乎只是定性提示</li>
    <li>VC 界可以给出精确的测试误差预测，因此交叉验证是多余的</li>
    <li>只要测试集有 50 条样本，交叉验证就没有必要</li>
  </ul>
  <p class="why">
    同一艺人的多个片段高度相关。随机划分会把同源样本同时放进训练与测试，
    模型只要学到「这位艺人的制作特征」就能刷分，分数会系统性高估跨艺人泛化能力——
    这就是数据泄露。分组交叉验证让整组同进同出，留一艺人则是最贴近应用场景的协议。
    第一项恰好是泄露的来源；第三项把最坏情况上界当成了预测：
    VC 界形如 误差 \(\le\) 经验误差 \(+ O(\sqrt{h/n})\)，
    在 \(n \approx 250\) 时界的数值通常远大于实际误差，它的价值在于解释「为什么容量必须小」；
    第四项错在 50 条样本连一个像样的置信区间都撑不起（二项比例的 95% 区间宽度约 \(\pm 14\) 个百分点）。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 18 题 · 评估与统计 · 计算</div>
  <p class="q">你用 1000 次置换做检验，其中 210 次得到的统计量不小于观测值。p 值约为多少？</p>
  <ul class="opts">
    <li>约 0.021</li>
    <li>约 0.79</li>
    <li data-ok>约 0.21</li>
    <li>约 2.1</li>
  </ul>
  <p class="why">
    算式：\(p \approx (b+1)/(m+1) = 211/1001 \approx 0.211\)（加一修正避免把 p 估成 0）。
    第一项少了一个数量级（把 210 看成了 21）；第二项是 \(1-p\)；第四项忘了归一化。
    解释：\(p \approx 0.21\) 意味着「在无效应的零假设下，约 21% 的随机置换都能给出不弱于观测的结果」，
    所以这份数据不支持该效应。
    两个补充：置换次数决定 p 的分辨率（1000 次约到 \(10^{-3}\)），报告时要写出置换次数与统计量的定义；
    p 值不是效应大小，也不是「假设为真的概率」，所以要同时给出效应量与置信区间。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 19 题 · 经济与系统 · 计算</div>
  <p class="q">某订阅 200 美元/月（教学假设量级，非任何具体产品；计费以官方页面为准）。重度用户每周用满约 2200 万输出 token 当量。按 API 每百万输出 token 10 美元折算，一个月（按 4.3 周）下来 API 侧要花多少？结论是？</p>
  <ul class="opts">
    <li>约 220 万 token ≈ 22 美元，订阅血亏</li>
    <li>约 4000 万 token ≈ 400 美元</li>
    <li>无法计算：订阅额度没有上限</li>
    <li data-ok>约 9500 万 token ≈ 950 美元，约为订阅月费的 4.75 倍——订阅的价值是重度使用下单价更低，而不是无限</li>
  </ul>
  <p class="why">
    算式分三步：每月 \(2200 \times 4.3 \approx 9500\) 万 token；按 10 美元/百万折算 \(\approx 950\) 美元；
    \(950 / 200 \approx 4.75\)。第一项把一周当成了一个月；第二项是单周总上限、不是月度用量；
    第三项错在订阅额度始终受「窗口 \(\times\) 上限」与并发约束。
    更重要的结论：<strong>订阅额度是推理额度，它无法替代训练算力</strong>——
    训练是持续数小时占满加速器的前反向循环，不是按 token 计费的推理调用。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">第 20 题 · 经济与系统 · 亲和性</div>
  <p class="q">要让自动化长期稳定地跑下去，下面哪一组做法最站得住？</p>
  <ul class="opts">
    <li data-ok>缓存亲和 + 会话亲和：固定前缀放最前并多轮不变以命中前缀缓存；多轮对话粘同一实例与同一份 KV，避免重复 prefill</li>
    <li>随机轮换账号与出口，让风控看不出规律</li>
    <li>prompt cache 只影响首 token 延迟，与成本无关，不必为它设计请求顺序</li>
    <li>多账号随机轮换使用，摊薄单账号风险，账号亲和不重要</li>
  </ul>
  <p class="why">
    缓存亲和：把固定前缀（系统提示、工具定义、长文档）放在请求最前面并在多轮之间保持不变，
    才能命中前缀缓存，命中的 token 通常按很低的折扣计费——<strong>它同时降低成本与首 token 延迟</strong>，
    所以第三项错。会话亲和：让多轮对话粘在同一实例与同一份 KV 上，避免重复 prefill。
    第二、四项都涉及多账号/出口轮换以规避检测：这违反多数平台服务条款，且与附录 D 的合规立场直接冲突——
    稳定性应该来自缓存与会话设计，而不是和风控捉迷藏。
  </p>
</div>

<h3>第二部分 · 开放题（3 题）</h3>
<p>
  开放题没有唯一答案。按「机制 — 证据 — 判据」三层自评：
  先说清机制，再给出你会用什么证据检验它，最后写下事先定好的判据。
  先写出你的版本，再展开参考要点。
</p>

<h4>开放题 1 · 250 条样本上的岭回归与深度网络</h4>
<section class="blk blk-q">
  <h4><span class="ic">◆</span>题目</h4>
  <p>
    你的音频过渡数据集只有约 <strong>250 条标注样本</strong>，目标是预测过渡时长这类低维参数。
    请论证：为什么在这个任务上，深度网络很可能<strong>不如</strong>岭回归？
    要求给出机制层面的理由，并说明你会怎么验证这个判断。（参考要点 300 字以内）
  </p>
</section>
<div class="acc" data-t="开放题 1 · 参考要点与评分标准" data-badge="写完再看">
  <div class="acc-body">
    <p>
      <strong>参考要点。</strong>样本量决定可达的模型容量。\(n \approx 250\)、目标又是低维参数时，
      岭回归的 \(L_2\) 正则等价于一个很强的先验，而且有闭式解、方差小。
      深度网络动辄 \(10^{6}\) 以上参数，偏差—方差分解与 VC 一类的容量界都指向同一件事：
      容量远大于样本量时，泛化误差由<strong>方差</strong>主导；要学到「过渡机制」的不变性，
      需要覆盖足够多的艺人、录音条件与技法组合，250 条通常只覆盖了少数几种。
      随机划分还会让同源片段同时进入训练与测试，进一步高估成绩。
      因此正确的立场是：把深度模型当作<strong>待检验的假设</strong>，
      用分组交叉验证与置换检验去比较它与岭回归，而不是默认它更强。
    </p>
    <table class="tbl small">
      <thead><tr><th>得分</th><th>标准</th></tr></thead>
      <tbody>
        <tr><td><strong>3 分</strong></td><td>明确指出样本量 / 容量与方差主导的关系，给出岭回归正则与闭式解的对照，并提出分组交叉验证或置换检验等验证方案</td></tr>
        <tr><td><strong>2 分</strong></td><td>说清了「样本太少容易过拟合」并提到正则化，但没有区分偏差与方差，或没有给出可执行的验证方案</td></tr>
        <tr><td><strong>1 分</strong></td><td>只重复「深度网络更强 / 更弱」的结论，没有机制解释，也没有检验方案</td></tr>
      </tbody>
    </table>
  </div>
</div>

<h4>开放题 2 · 区分「学到了机制」与「学到了艺人特征」</h4>
<section class="blk blk-q">
  <h4><span class="ic">◆</span>题目</h4>
  <p>
    你的模型在预测过渡参数时表现不错。请设计一个实验，区分
    <strong>「模型真的学到了过渡机制」</strong>与<strong>「模型学到了艺人的制作特征」</strong>。
    要求给出实验设计、判据，以及你打算怎么统计。（参考要点 300 字以内）
  </p>
</section>
<div class="acc" data-t="开放题 2 · 参考要点与评分标准" data-badge="写完再看">
  <div class="acc-body">
    <p>
      <strong>参考要点。</strong>核心是把「艺人」从训练与测试之间彻底隔开，并制造只在机制上变化的反事实。
      (1) 按艺人 / 专辑 / 录音批次分组做 GroupKFold，并单独报告留一艺人（leave-one-artist-out）结果：
      跨艺人的增益若消失，说明学到的主要是艺人特征。
      (2) 用艺人标签做探针或对抗验证：若内部表示能高精度预测艺人，就存在混入。
      (3) 合成数据对照：自己用已知的交叉淡化参数生成音频，看模型能否恢复参数——
      机制可学，在合成数据上也应成立。
      (4) 反事实编辑：保持过渡参数不变，替换人声、母带处理与编码格式，观察预测是否漂移。
      (5) 用置换检验给出显著性，并事先写好统计量与阈值。
      判据：只有在<strong>跨艺人、跨制作条件</strong>下仍然稳定，并且能恢复合成数据里的已知参数，
      才支持「学到了机制」这一主张。
    </p>
    <table class="tbl small">
      <thead><tr><th>得分</th><th>标准</th></tr></thead>
      <tbody>
        <tr><td><strong>3 分</strong></td><td>给出分组或留一艺人协议，并至少包含一种反事实或合成数据对照，同时说明判据与统计检验</td></tr>
        <tr><td><strong>2 分</strong></td><td>提到按艺人分组与交叉验证，但没有反事实或合成对照，判据含糊</td></tr>
        <tr><td><strong>1 分</strong></td><td>只提出「多收集一些数据」「看测试集准确率」这类无法区分两种解释的做法</td></tr>
      </tbody>
    </table>
  </div>
</div>

<h4>开放题 3 · 向招生官解释 AI 在你项目里的位置</h4>
<section class="blk blk-q">
  <h4><span class="ic">◆</span>题目</h4>
  <p>
    用<strong>不超过 400 字</strong>，假设以后你做了 crossfade 这类项目，向招生官解释 AI 在其中处在什么位置（练习用，现在不必真有项目）。
    要求边界清晰、可核查、语气克制。（参考要点 300 字以内）
  </p>
</section>
<div class="acc" data-t="开放题 3 · 参考要点与评分标准" data-badge="写完再看">
  <div class="acc-body">
    <p>
      <strong>参考要点。</strong>用三段式，不要写成辩护词。
      第一段说清 AI <strong>做了什么</strong>：代码脚手架、文献检索、语言润色、检查推导中的计算错误。
      第二段说清 AI <strong>没有做什么</strong>：研究问题、解析推导、实验设计、数据分析与结论、正文写作——
      并且这一句必须可核查，附上仓库地址与关键提交。
      第三段给一个具体例子：哪一步最难、你怎么解决、AI 在哪里被你否决
      （例如它给出一个看起来合理但边界条件错误的推导，你用数值实验推翻了它）。
      最后一句表明你愿意在面试中解释任何一行代码或任何一个公式。
      常见失分是笼统表态「AI 只用于辅助」，却没有边界、没有证据、没有具体例子。
    </p>
    <table class="tbl small">
      <thead><tr><th>得分</th><th>标准</th></tr></thead>
      <tbody>
        <tr><td><strong>3 分</strong></td><td>边界清晰（用在哪、没用在哪）、附可核查证据，并有一个真实的「我否决了 AI」的例子</td></tr>
        <tr><td><strong>2 分</strong></td><td>说明了用途但边界含糊，或缺少可核查的证据与具体例子</td></tr>
        <tr><td><strong>1 分</strong></td><td>只有笼统表态（例如「AI 只用于辅助」），或把 AI 的贡献含混地说成自己的</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="acc" data-t="答案速查表" data-badge="对答案">
  <div class="acc-body">
    <p>先按上面的评分表自评，再用这张表核对。第三列是这道题真正想考的那一句话。</p>
    <table class="tbl small">
      <thead><tr><th>题号</th><th>正确选项</th><th>一句话要点</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>B</td><td>\(\text{PPL} = \exp(2.0) \approx 7.4\)；跨分词器比较用 bits/byte</td></tr>
        <tr><td>2</td><td>C</td><td>温度只改采样分布：\(T > 1\) 更平坦、熵更大</td></tr>
        <tr><td>3</td><td>A</td><td>词表越大 token 越少，per-token 损失越大，必须归一化</td></tr>
        <tr><td>4</td><td>D</td><td>污染是数据问题：去重并披露，正则化与多种子都无效</td></tr>
        <tr><td>5</td><td>C</td><td>\(KV = 2 \times d \times L \times 2\,\text{B} \times S \times B \approx 32\) GiB</td></tr>
        <tr><td>6</td><td>B</td><td>词表 \(\times d \approx 26\)M，加上每层 \(12d^2 \times 6 \approx 19\)M</td></tr>
        <tr><td>7</td><td>A</td><td>FlashAttention 省的是显存与读写，计算仍是 \(O(S^2)\)</td></tr>
        <tr><td>8</td><td>D</td><td>\(C \approx 6ND = 4.2\times10^{22}\)；单卡约 11 年，必须并行</td></tr>
        <tr><td>9</td><td>C</td><td>全局批 \(= 4\times8\times8 = 256\)；激活约 1.4 GiB</td></tr>
        <tr><td>10</td><td>B</td><td>FSDP 分片优先；单层放不下时才上张量并行</td></tr>
        <tr><td>11</td><td>D</td><td>DP 每步同步梯度；TP 每层通信；PP 有气泡</td></tr>
        <tr><td>12</td><td>A</td><td>\(2 \times 2dr \approx 1.3\times10^{5}\)，约占 \(2d^2\) 的 0.4%</td></tr>
        <tr><td>13</td><td>C</td><td>DPO 离线偏好、省奖励模型；PPO 在线、能接可验证奖励</td></tr>
        <tr><td>14</td><td>B</td><td>GRPO 去掉 critic 用组内相对；RLVR 奖励可自动判定</td></tr>
        <tr><td>15</td><td>D</td><td>7B 的 INT4 权重约 3.5 GiB，还要加随上下文增长的 KV cache</td></tr>
        <tr><td>16</td><td>A</td><td>连续批处理提升吞吐，代价是尾延迟波动更大</td></tr>
        <tr><td>17</td><td>B</td><td>同源样本整组划分；VC 界在 \(n \approx 250\) 时只是定性提示</td></tr>
        <tr><td>18</td><td>C</td><td>\(p \approx (210+1)/(1000+1) \approx 0.21\)</td></tr>
        <tr><td>19</td><td>D</td><td>11 个可用窗口 \(\times 200\) 万 \(\approx 2200\) 万 token \(\approx 220\) 美元</td></tr>
        <tr><td>20</td><td>A</td><td>账号、缓存、会话三种亲和都要固定</td></tr>
      </tbody>
    </table>
    <p>
      如果错题集中在第 5、6、8、9、12、15、18、19 题，说明<strong>单位与量级</strong>是主要问题——
      回到对应模块，把公式按「元素数 × 字节数 × 数量」的顺序重推一遍，比多做十道题有效。
    </p>
  </div>
</div>
`
});
