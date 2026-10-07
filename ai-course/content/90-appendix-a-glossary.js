/* content/90-appendix-a-glossary.js — 附录 A：术语表 */
COURSE.register({
  id: "appA",
  part: 9,
  num: "A",
  title: "附录 A · 术语表（中英对照）",
  en: "Appendix A — Glossary",
  minutes: 45,
  tags: ["附录", "术语"],
  body: String.raw`
<p class="lead">
  这是一张速查表，不是教程：每个词只给「一句话解释」，但每条都落在可检验的事实上（形状、公式、默认值、失败模式）。
  用法是双向查阅：读正文时遇到不熟的词，回这里定位它属于哪一类；做题或调参时先在这里确认两个词不是同一件事。
  最容易被含糊过去的四组是
  <span class="t" data-tterm="Perplexity" data-d="交叉熵取指数，衡量平均候选数，依赖 tokenizer，不能跨模型直接比。">困惑度</span> 与准确率、
  <span class="t" data-tterm="Prefill" data-d="把整段提示一次性并行前向、填充 KV cache 的阶段，算力受限。">预填充</span> 与解码、
  <span class="t" data-tterm="LoRA rank" data-d="低秩更新的秩 r，决定可训练参数量，与学习率是两个独立旋钮。">LoRA 的 rank</span> 与学习率、
  <span class="t" data-tterm="Banked reset" data-d="把未用满的额度存起来、之后继续用；与「到点清零」相对。">即时重置</span> 与银行重置。
  第 16 节把其中三组逐对列出（预填充与解码的区别见第 3 章注意力与第 8 章推理）。术语按 16 节组织，共 <strong>365 行</strong>（357 条术语 + 8 组易混辨析，其中 72 条是为 14、16–22 章与附录 G 补的），可以直接拿去写论文、读文档、和同事对齐口径。
</p>

<h3>1. 概率与目标函数（Probability and objectives）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>交叉熵</td><td>Cross-entropy</td><td>对每个位置计算 -log p(正确 token) 再对位置取平均；它是语言模型唯一的训练目标，等价于最大似然，数值越小说明模型给正确 token 的概率越高。</td></tr>
    <tr><td>困惑度</td><td>Perplexity</td><td>交叉熵取指数所得的量；困惑度 20 读作「模型平均在 20 个等概率候选之间犹豫」，它依赖 tokenizer，跨模型比较要用 bits/byte。</td></tr>
    <tr><td>最大似然</td><td>Maximum likelihood</td><td>选出让训练语料出现概率最大的参数；在样本独立同分布假设下，它与最小化交叉熵是同一个优化问题。</td></tr>
    <tr><td>KL 散度</td><td>Kullback-Leibler divergence</td><td>衡量两个分布差异的非对称量，恒大于等于 0，且对调两个分布后数值不同；交叉熵 = 数据熵 + KL(真实分布 与 模型分布)。</td></tr>
    <tr><td>logits</td><td>Logits</td><td>softmax 之前的未归一化实向量，长度等于词表大小；温度、top-k、top-p 等采样参数都只作用在它上面，不改模型权重。</td></tr>
    <tr><td>softmax</td><td>Softmax</td><td>逐项取指数再除以总和，把 logits 变成概率分布；它保序，但会放大较大 logit 的差距；同一组 logits 整体加一个常数不改变输出。</td></tr>
    <tr><td>温度</td><td>Temperature</td><td>把 logits 除以 T 再做 softmax：T 小于 1 更确定（趋近 argmax），T 大于 1 更随机，T 趋于 0 等价贪心解码。</td></tr>
    <tr><td>熵</td><td>Entropy</td><td>真实数据分布下 -log p 的期望，是交叉熵不可再降的下界；代码与专业术语的熵低于日常闲聊，所以 loss 数值不能跨数据集比较。</td></tr>
    <tr><td>bits/byte</td><td>Bits per byte</td><td>把交叉熵除以 ln 2 换成 bit，再除以每 token 的平均字节数；由于按字节归一，它可以跨 tokenizer 比较，是评测集报告损失的更稳妥刻度。</td></tr>
    <tr><td>nats</td><td>Nats</td><td>以自然对数为单位的负对数似然，交叉熵的默认单位；1 nat 等于 1/ln 2 约 1.4427 bit。</td></tr>
  </tbody>
</table>

<h3>2. Tokenizer 与数据（Tokenization and data）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>token</td><td>Token</td><td>模型处理的最小离散单位，可能是一个字、一个词片段或一个字节；模型的所有计算都发生在 token 的整数 id 上。</td></tr>
    <tr><td>词表</td><td>Vocabulary</td><td>token 到整数 id 的固定映射，常见规模 3 万到 20 万；embedding 矩阵的行数、输出层 logits 的维度都等于词表大小。</td></tr>
    <tr><td>BPE</td><td>Byte-pair encoding</td><td>从字节或字符出发，反复合并当前频率最高的相邻符号对，直到达到目标词表大小；GPT 与 Llama 系列的默认分词算法。</td></tr>
    <tr><td>byte-level</td><td>Byte-level tokenization</td><td>先把文本编码成 UTF-8 字节再做 BPE，因此任何字符（emoji、罕见汉字、二进制片段）都可表示，不存在词表外符号。</td></tr>
    <tr><td>特殊 token</td><td>Special token</td><td>不来自普通文本的保留 id，例如 &lt;|endoftext|&gt;、&lt;|im_start|&gt;、&lt;|tool_call|&gt;，用来标记文档边界、角色与工具调用。</td></tr>
    <tr><td>chat template</td><td>Chat template</td><td>把 system、user、assistant 消息渲染成一段带特殊 token 的字符串的固定格式（如 ChatML）；训练与推理必须使用同一个模板，否则输出质量会明显下降。</td></tr>
    <tr><td>sequence packing</td><td>Sequence packing</td><td>把多条短样本首尾拼接填满定长序列，减少 padding 带来的算力浪费；必须配合块对角注意力掩码，否则不同样本会互相看见。</td></tr>
    <tr><td>loss mask</td><td>Loss mask</td><td>长度 T 的 0 与 1 向量，把 prompt 与 padding 位置的损失置零，只对需要学习的回答 token 回传梯度。</td></tr>
    <tr><td>数据集污染</td><td>Contamination</td><td>训练语料中混入了评测集题目；会让 benchmark 分数虚高，常用 n-gram 重合度或「让模型补全题目」来检测。</td></tr>
    <tr><td>去重</td><td>Deduplication</td><td>删除语料中完全重复与近重复的文档（常用 MinHash 加 LSH 近似）；保留重复会放大逐字记忆并提高过拟合风险。</td></tr>
    <tr><td>TinyStories</td><td>TinyStories</td><td>用幼儿词汇量生成的短故事数据集；因为语法简单、分布干净，小模型也能学到连贯叙事，是教学与消融实验的常用语料。</td></tr>
    <tr><td>teacher forcing</td><td>Teacher forcing</td><td>训练时把真实前缀而不是模型自己的预测喂给下一层；因为每个位置的标签已知，一次前向就能并行算出全部位置的损失。</td></tr>
    <tr><td>shift-by-one</td><td>Shift by one</td><td>预训练构造标签的方式：输入取 x[0] 到 x[T-2]，标签取 x[1] 到 x[T-1]，每个位置学习预测自己的下一个 token。</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>阅读提示：解释里的三类硬信息</h4>
  <p>
    本表每条解释尽量给出三类可验证信息之一：「形状」（谁的维度等于词表大小）、「默认值或量级」（常见取值、系数、比例）、
    「失败模式」（用错会怎样）。如果一条术语在正文模块里出现过，而这里只能写出同义反复的句子，说明它还没被真正理解——回到对应模块做一次最小实验。
  </p>
</section>

<h3>3. 架构与注意力（Architecture and attention）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>embedding</td><td>Embedding</td><td>把 token id 映射成 d 维向量的查表矩阵，形状为 词表大小 乘 d；输入 embedding 与输出投影常共享权重（tied embedding）以省参数。</td></tr>
    <tr><td>位置编码</td><td>Positional encoding</td><td>向模型注入顺序信息的机制，因为注意力本身对 token 排列等变；原始方案是正弦编码，现代主流是 RoPE 或 ALiBi。</td></tr>
    <tr><td>RoPE</td><td>Rotary position embedding</td><td>把 query 与 key 的维度两两配对，按位置角做旋转；于是注意力分数只依赖相对位移，改动旋转基频即可延长可用上下文。</td></tr>
    <tr><td>ALiBi</td><td>Attention with linear biases</td><td>不加入位置向量，直接在注意力分数上加与距离成正比的负偏置（每个头斜率不同）；外推简单，但长上下文检索通常弱于 RoPE。</td></tr>
    <tr><td>注意力</td><td>Attention</td><td>用查询与键的相似度当权重，对所有 value 做加权平均；它按内容检索而非按位置递推，是 Transformer 可并行的根本原因。</td></tr>
    <tr><td>Q/K/V</td><td>Query, key, value</td><td>同一输入经三个线性投影得到的三组向量；分数矩阵（Q 乘 K 的转置）形状为 T 乘 T，是算力与显存随长度平方增长的来源。</td></tr>
    <tr><td>缩放点积</td><td>Scaled dot-product attention</td><td>点积注意力除以 sqrt(每个头的维度) 再 softmax；这个缩放让分数方差在维度增大时保持在 1 附近，避免 softmax 饱和成 one-hot。</td></tr>
    <tr><td>多头注意力</td><td>Multi-head attention</td><td>把 d 维切成 h 份并行做注意力再拼接；不同头可分工（局部、句法、复制），总参数量与单头大维度版本同量级。</td></tr>
    <tr><td>因果掩码</td><td>Causal mask</td><td>把分数矩阵对角线以上置为负无穷，使位置 t 只能看见不超过 t 的 token；漏掉它会让训练损失异常低而生成完全崩坏。</td></tr>
    <tr><td>KV cache</td><td>KV cache</td><td>推理时缓存历史 key 与 value，避免每生成一个 token 重算整个前缀；显存随长度线性增长，是长上下文部署的首要瓶颈。</td></tr>
    <tr><td>MQA/GQA</td><td>Multi-query / grouped-query attention</td><td>让多个查询头共享少量 KV 头（GQA 常把 KV 头数设为查询头数的 1/8）；KV cache 缩小数倍而质量损失很小，已是主流默认。</td></tr>
    <tr><td>FlashAttention</td><td>FlashAttention</td><td>分块并把在线 softmax 放在片上高速缓存里完成，不物化 T 乘 T 矩阵；激活显存从平方降到线性，常见提速 2 到 4 倍。</td></tr>
    <tr><td>RMSNorm/LayerNorm</td><td>RMSNorm and LayerNorm</td><td>归一化层；LayerNorm 去均值除标准差并带缩放与偏置，RMSNorm 只除均方根且无均值与偏置，更省算力，是 Llama 系列的选择。</td></tr>
    <tr><td>残差连接</td><td>Residual connection</td><td>子层输出加回输入（x 加 f(x)），为梯度提供恒等通路；它把深层网络的优化问题变成学习「增量修正」，是能堆到上百层的前提。</td></tr>
    <tr><td>SwiGLU</td><td>SwiGLU</td><td>前馈层的门控形式：一路线性变换乘上另一路的 swish 激活，再经输出投影；质量优于 ReLU 版 MLP，代价是隐层宽度通常要按约 2/3 缩放以对齐参数量。</td></tr>
    <tr><td>混合专家</td><td>Mixture of experts (MoE)</td><td>多个前馈专家加一个路由器，每个 token 只激活少数专家（常见取 2 个）；总参数可以极大而每 token 算力只按激活参数计，代价是显存与通信。</td></tr>
    <tr><td>路由</td><td>Router</td><td>MoE 中为每个 token 计算专家分数的线性层；训练需加负载均衡损失，否则少数专家吸走全部 token，其余专家等于没训练。</td></tr>
    <tr><td>上下文窗口</td><td>Context window</td><td>一次前向能看到的 token 上限，由位置编码与训练长度共同决定；超出部分必须截断或滑动，模型并不真的「记住」窗口外内容。</td></tr>
    <tr><td>参数量 N</td><td>Parameter count N</td><td>可训练权重总数，可由层数与各矩阵形状直接求和；MoE 必须区分总参数与激活参数，否则算力估算会差数倍。</td></tr>
    <tr><td>深度 L</td><td>Depth L</td><td>Transformer 块的层数，决定串行依赖长度与流水线并行的切分粒度；太少无法做多步组合，太多则训练不稳、推理延迟上升。</td></tr>
    <tr><td>隐藏维度 d</td><td>Hidden dimension d</td><td>残差流的宽度，其余维度多由它派生（每头维度 = d 除以头数，前馈隐层约 4d 或 8/3 d）；它决定单层算力，也是张量并行的切分轴。</td></tr>
  </tbody>
</table>

<h3>4. 预训练与优化（Pretraining and optimization）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>预训练</td><td>Pretraining</td><td>在大规模无标注语料上做下一 token 预测，得到通用底座；它决定知识上限，后期微调补不回缺失的知识。</td></tr>
    <tr><td>微调</td><td>Fine-tuning</td><td>在预训练权重上用小规模标注数据继续训练；学习率通常比预训练低 1 到 3 个数量级，主要改变行为与格式而非知识。</td></tr>
    <tr><td>AdamW</td><td>AdamW</td><td>Adam 加上解耦权重衰减的优化器，用一阶与二阶动量的指数滑动平均；LLM 训练的默认基线，代价是优化器状态约占 2 倍参数显存。</td></tr>
    <tr><td>Muon</td><td>Muon</td><td>对二维权重矩阵的更新做近似正交化（Newton-Schulz 迭代）的优化器；大批大小下常比 AdamW 更快，但 embedding 与输出层一般仍配 AdamW。</td></tr>
    <tr><td>学习率 warmup</td><td>Warmup</td><td>训练最初若干步把学习率从近 0 线性升到峰值，避免早期大更新破坏随机初始化的表示；常用比例是总步数的 1% 到 2%。</td></tr>
    <tr><td>余弦衰减</td><td>Cosine decay</td><td>学习率沿余弦曲线从峰值降到近 0 的调度；实现简单、行为稳定，是预训练最常见的默认，末期常再叠加一次退火。</td></tr>
    <tr><td>权重衰减</td><td>Weight decay</td><td>把与权重平方成正比的项加入损失，等价于按步收缩参数；在 Adam 中耦合的 L2 与解耦衰减不等价，所以要用 AdamW 形式。</td></tr>
    <tr><td>梯度裁剪</td><td>Gradient clipping</td><td>梯度全局范数超过阈值时整体缩放（LLM 常用 1.0）；只改步长不改方向，是把 loss spike 挡在 NaN 之外的第一道保险。</td></tr>
    <tr><td>梯度累积</td><td>Gradient accumulation</td><td>累加多个 micro-batch 的梯度后再更新一次，用显存换算等效大批大小；注意归一化统计与 dropout 的口径要按真实批大小处理。</td></tr>
    <tr><td>批大小</td><td>Batch size</td><td>一次参数更新覆盖的样本数（以 token 计更严谨）；过大降低梯度噪声并可能损害泛化，过小则吞吐低且更新抖动。</td></tr>
    <tr><td>序列长度</td><td>Sequence length</td><td>单个训练样本的 token 数；注意力的算力与激活随它平方增长，于是它是最贵的超参数之一，也是长上下文训练成本的主因。</td></tr>
    <tr><td>混合精度</td><td>Mixed precision (bf16, fp16, fp8)</td><td>用低精度做矩阵乘、高精度做归约与更新；bf16 动态范围与 fp32 相同故无需 loss scaling，fp16 需要，fp8 还需分块量化与缩放因子。</td></tr>
    <tr><td>loss spike</td><td>Loss spike</td><td>训练中损失突然上跳数倍的现象，多由坏数据批或学习率过大引起；标准处置是回滚检查点、跳过错批、临时降学习率。</td></tr>
    <tr><td>检查点</td><td>Checkpoint</td><td>定期落盘的权重与优化器状态；除容错外，它是回滚 spike、做退火和消融实验的必要条件。</td></tr>
    <tr><td>缩放律</td><td>Scaling law</td><td>损失随参数量、数据量、算力按幂律下降的经验规律；它使「小规模实验加外推」成为有依据的工程方法，而不是猜测。</td></tr>
    <tr><td>Chinchilla 最优</td><td>Chinchilla-optimal</td><td>固定训练算力下，参数量与训练 token 数应大致按 1 比 20 同步增长的配比结论；它给出的是算力最优，不是部署最优。</td></tr>
    <tr><td>过训练</td><td>Over-training</td><td>有意用远超算力最优配比的 token 训练较小模型；训练更贵，换来的是完成同样任务所需推理成本更低。</td></tr>
    <tr><td>退火</td><td>Annealing</td><td>预训练末期把学习率快速降到近 0，常同时切换到更高质量或更贴近下游的语料；能在最后百分之几的算力里换来明显的损失下降。</td></tr>
  </tbody>
</table>

<h3>5. 并行与系统（Parallelism and systems）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>DDP</td><td>Distributed data parallel</td><td>每张卡保存完整模型副本、各算一部分数据，反向结束后对梯度做 all-reduce 求平均；只提升吞吐，不降低单卡显存。</td></tr>
    <tr><td>ZeRO 1/2/3</td><td>Zero redundancy optimizer</td><td>在数据并行上依次把优化器状态、梯度、参数切分到各卡，级别越高越省显存、通信越多；ZeRO-3 连参数都不再冗余保存。</td></tr>
    <tr><td>FSDP</td><td>Fully sharded data parallel</td><td>PyTorch 版的完全分片数据并行：参数、梯度、优化器状态都分片，计算某层前临时聚合、算完即释放；是 ZeRO-3 的工程实现。</td></tr>
    <tr><td>张量并行</td><td>Tensor parallelism (TP)</td><td>把单个矩阵乘按行或按列切到多卡（切开前馈隐层、注意力头），每层前后都要通信；适合节点内高带宽互联。</td></tr>
    <tr><td>流水线并行</td><td>Pipeline parallelism (PP)</td><td>按层把模型切成若干段放到不同卡，micro-batch 依次流过形成流水线；通信量小，但存在气泡，需要足够多的 micro-batch 填满。</td></tr>
    <tr><td>序列并行</td><td>Sequence parallelism</td><td>再切一个序列维度，用来分摊 LayerNorm、dropout 这类不参与张量并行的激活；长序列训练几乎必需。</td></tr>
    <tr><td>all-reduce</td><td>All-reduce</td><td>每张卡各出一份张量，归约后所有卡得到相同结果（典型用途是求梯度和）；它是数据并行的主要通信，带宽决定扩展效率。</td></tr>
    <tr><td>重计算</td><td>Activation checkpointing (gradient checkpointing)</td><td>前向只保存少量中间激活，反向时重新算一遍；用约三成额外算力把激活显存从随层数线性增长压到平方根量级。</td></tr>
    <tr><td>显存碎片</td><td>Memory fragmentation</td><td>反复申请释放不同尺寸张量，导致空闲显存不连续、总空闲够却申请失败；用预分配缓存池或统一尺寸对齐缓解。</td></tr>
    <tr><td>MFU</td><td>Model FLOPs utilization</td><td>实际吞吐对应的 FLOPs 除以硬件峰值；大模型训练典型值 35% 到 48%，50% 以上属极限调优，是判断是否卡在算力上的第一指标。</td></tr>
    <tr><td>吞吐</td><td>Throughput (tokens/s)</td><td>单位时间处理或生成的 token 数，训练时常按单卡计；它与单请求延迟是两个独立目标，可用批大小互相交换。</td></tr>
    <tr><td>JAX</td><td>JAX</td><td>Google 的函数式数值库，用纯函数与不可变数组描述计算、编译后执行；并行与切分通过装饰器和分片声明表达。</td></tr>
    <tr><td>jit</td><td>Just-in-time compilation</td><td>把 Python 函数追踪成计算图并编译为设备代码；当控制流依赖具体数值时必须改用专用控制流原语，否则只会追踪到一条分支。</td></tr>
    <tr><td>vmap</td><td>Vectorizing map</td><td>把只写单样本的函数沿指定轴自动批量化，不必手写 batch 维度；与 jit 组合可得到融合后的批量内核。</td></tr>
    <tr><td>pmap</td><td>Parallel map</td><td>旧式跨设备原语，把函数复制到多个设备并按轴切分输入；现已基本被自动分片与 shard_map 取代。</td></tr>
    <tr><td>SPMD</td><td>Single program multiple data</td><td>同一份程序在所有设备上运行，靠分片声明区分各设备持有的数据；JAX 并行模型的核心心智模型。</td></tr>
    <tr><td>Mesh</td><td>Device mesh</td><td>把可用设备按命名轴（如 data、model）排成多维网格；任何切分声明都必须落在某个具体 mesh 上。</td></tr>
    <tr><td>PartitionSpec</td><td>PartitionSpec</td><td>分片声明，用命名轴描述张量各维度如何切分（None 表示不切）；它把算法代码与并行策略解耦的最关键抽象。</td></tr>
    <tr><td>NamedSharding</td><td>NamedSharding</td><td>把 mesh 与 PartitionSpec 打包成可挂在数组上的分片对象；配合 with 语句设定默认分片，代码里不再手写设备编号。</td></tr>
    <tr><td>Flax NNX</td><td>Flax NNX</td><td>Flax 的新接口，用普通 Python 对象持有参数与状态，允许就地修改和动态结构；比旧 Linen 更接近 PyTorch 的写法。</td></tr>
    <tr><td>Optax</td><td>Optax</td><td>JAX 的优化器库，用可组合的梯度变换拼出 AdamW、裁剪与调度；优化器状态显式传递，因此天然适配 jit 与分片。</td></tr>
    <tr><td>Orbax</td><td>Orbax</td><td>JAX 的检查点与导出库，支持异步、分片感知的保存恢复；用于在数千设备规模下可靠落盘而不阻塞训练。</td></tr>
    <tr><td>Grain</td><td>Grain</td><td>JAX 生态的数据加载库，提供可随机访问与流式的数据集抽象、并行读取与确定性打乱；替代手写 sampler。</td></tr>
    <tr><td>XLA</td><td>Accelerated linear algebra</td><td>把计算图编译成设备代码的编译器，负责算子融合、内存规划与集合通信；JAX 与 TensorFlow 都建立在它之上。</td></tr>
    <tr><td>TPU v5e</td><td>TPU v5e</td><td>Google 的中端加速器，单芯片约 16GB HBM、bf16 峰值约 197 TFLOP/s，通过 ICI 组成 pod；Kaggle 免费层的 v5e-8 就是 8 颗芯片。</td></tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">一个 13B 模型在单卡 80GB 上放不下完整训练状态，希望尽量少写代码就扩大规模，同时不希望每一层都产生通信。最贴合的组合是？</p>
  <ul class="opts">
    <li>纯 DDP 加梯度累积：每张卡完整副本，显存不变</li>
    <li data-ok>FSDP（或 ZeRO-3）加梯度累积：状态分片省显存，通信集中在参数聚合</li>
    <li>张量并行 TP 单独使用：把每个矩阵切到多卡，每层都要通信</li>
    <li>流水线并行 PP 单独使用：按层切分，但气泡会吃掉大部分吞吐且难以调平衡</li>
  </ul>
  <p class="why">显存瓶颈来自优化器状态、梯度、参数三份冗余，FSDP 正是逐个切分它们，且通信发生在层粒度的聚合而不是每层内部的多次集合通信。TP 最省显存但通信最频繁，只在节点内高带宽场景划算；PP 的问题不是显存而是气泡与负载均衡。</p>
</div>

<h3>6. 微调与对齐（Fine-tuning and alignment）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>SFT</td><td>Supervised fine-tuning</td><td>用高质量「指令—回答」对做下一 token 预测，让模型学会按格式作答；它是任何偏好优化的起点，也决定模型的上限风格。</td></tr>
    <tr><td>指令微调</td><td>Instruction tuning</td><td>用大量多样化任务描述训练模型泛化到未见过的指令；关键在任务多样性与模板一致性，而不是数据条数。</td></tr>
    <tr><td>PEFT</td><td>Parameter-efficient fine-tuning</td><td>只训练少量新增或选定参数（LoRA、prefix、adapter）的一类方法总和；显存与每份权重的存储成本大幅下降，便于多版本部署。</td></tr>
    <tr><td>LoRA</td><td>Low-rank adaptation</td><td>冻结原权重，在旁路训练两个低秩矩阵 A 与 B，使更新等于 B 乘 A；推理时可把乘积加回原权重，因此不增加延迟。</td></tr>
    <tr><td>QLoRA</td><td>Quantized LoRA</td><td>把基座模型 4 bit 量化并冻结，只训练 LoRA 旁路；单卡 24GB 即可微调 7B 级模型，代价是训练速度略慢。</td></tr>
    <tr><td>rank r</td><td>LoRA rank</td><td>低秩矩阵的秩，决定可训练参数量与容纳新行为的容量；常用 8 到 64，任务越偏离基座分布越需要更大秩。</td></tr>
    <tr><td>alpha</td><td>LoRA alpha</td><td>LoRA 的缩放超参，实际更新按 alpha 除以 r 缩放；它等价于整体缩放旁路的学习率，所以固定其一、只调另一个。</td></tr>
    <tr><td>adapter</td><td>Adapter</td><td>插入每层的小型瓶颈模块（降维、非线性、升维），只训练它；因为增加串行层数，通常比 LoRA 带来更多推理延迟。</td></tr>
    <tr><td>DPO</td><td>Direct preference optimization</td><td>用偏好对直接在策略模型上做类似分类的损失，跳过奖励模型与在线采样；实现简单、稳定，但质量完全受偏好数据约束。</td></tr>
    <tr><td>KTO</td><td>Kahneman-Tversky optimization</td><td>只需要「好」与「坏」的二元标签，不需要成对比较；适合标签便宜、配对昂贵的场景。</td></tr>
    <tr><td>ORPO</td><td>Odds ratio preference optimization</td><td>把 SFT 损失与偏好项合成一步、不需要参考模型；省显存、流程短，但对超参更敏感。</td></tr>
    <tr><td>CPO</td><td>Contrastive preference optimization</td><td>同样去掉参考模型，用序列似然比构造对比损失；与 ORPO 属于同一「单阶段对齐」思路。</td></tr>
    <tr><td>RLOO</td><td>REINFORCE leave-one-out</td><td>对同一问题采样 k 条回答，用其余 k-1 条的平均奖励当基线来降方差；不需要价值网络，实现比 PPO 简单得多。</td></tr>
    <tr><td>PPO</td><td>Proximal policy optimization</td><td>用裁剪的重要性比率限制每步更新幅度，另配价值网络与 KL 惩罚；效果强但组件多、超参敏感、训练成本高。</td></tr>
    <tr><td>RLHF</td><td>Reinforcement learning from human feedback</td><td>完整三段式：SFT、训练奖励模型、用 PPO 优化；它是把人类偏好写进目标函数的第一代主流方案。</td></tr>
    <tr><td>奖励模型</td><td>Reward model</td><td>在偏好数据上训练的标量打分器，给整段回答一个分数；它既是优化目标，也是偏差与作弊的唯一入口。</td></tr>
    <tr><td>奖励黑客</td><td>Reward hacking</td><td>策略找到提高奖励却未提高真实质量的办法（堆长度、套模板、一味迎合）；对策是多样奖励、KL 约束与持续换数据。</td></tr>
    <tr><td>GRPO</td><td>Group relative policy optimization</td><td>对同一问题采样一组回答，用组内标准化奖励作为优势，省掉价值网络；是当前可验证任务训练的主流选择。</td></tr>
    <tr><td>RLVR</td><td>RL with verifiable rewards</td><td>奖励来自程序化检查（答案对错、单元测试通过、格式合法）而非人类偏好；信号客观，但只适用于可判定的任务。</td></tr>
    <tr><td>验证器</td><td>Verifier</td><td>判定答案是否正确的程序或模型（单测、符号求解器、另一个模型）；它的可靠度就是 RLVR 能力的天花板。</td></tr>
    <tr><td>思维链</td><td>Chain-of-thought</td><td>让模型先写中间步骤再给结论；在数学与多步推理上提升明显，代价是推理 token 数与成本线性上升。</td></tr>
    <tr><td>蒸馏</td><td>Distillation</td><td>让小模型模仿大模型的输出分布或采样结果；可迁移能力与风格，但会继承教师的错误，且常涉及许可与合规问题。</td></tr>
    <tr><td>拒绝采样</td><td>Rejection sampling</td><td>从模型采样多条回答，只保留通过验证的那些用于再训练；是自举数据的主力手段，代价是额外的采样算力。</td></tr>
    <tr><td>灾难性遗忘</td><td>Catastrophic forgetting</td><td>微调后新任务变好而原有能力变差；缓解手段是混入通用数据、降低学习率、用 LoRA 限制改动范围。</td></tr>
  </tbody>
</table>

<div class="acc" data-t="深入：四种偏好优化算法怎么选" data-badge="选读">
  <div class="acc-body">
    <p>判断顺序只有三步：有没有成对偏好数据、能不能承担在线采样、需不需要参考模型。</p>
    <table class="tbl small">
      <thead><tr><th>方法</th><th>数据需求</th><th>是否在线采样</th><th>是否需参考模型</th></tr></thead>
      <tbody>
        <tr><td>DPO</td><td>成对偏好</td><td>否（离线）</td><td>是</td></tr>
        <tr><td>ORPO / CPO</td><td>成对偏好</td><td>否</td><td>否</td></tr>
        <tr><td>RLOO / GRPO</td><td>仅需奖励或验证器</td><td>是</td><td>通常需要</td></tr>
        <tr><td>PPO</td><td>奖励模型</td><td>是</td><td>是，另加价值网络</td></tr>
      </tbody>
    </table>
    <p>经验法则：格式与风格对齐用 SFT 加 DPO 就够；只有任务存在可靠的自动判定（数学、代码、结构化抽取）时，在线强化学习才值得付出工程成本；奖励越容易被钻空子，就越需要 KL 约束与多来源奖励。</p>
  </div>
</div>

<h3>7. 推理与部署（Inference and deployment）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>自回归生成</td><td>Autoregressive generation</td><td>逐 token 生成，每步把上一步输出接回输入；生成 n 个 token 就要 n 次前向，因此解码通常是访存受限而非算力受限。</td></tr>
    <tr><td>贪心解码</td><td>Greedy decoding</td><td>每步取概率最大的 token；结果确定、可复现，但容易复读并陷入局部最优，也无法产生多样性。</td></tr>
    <tr><td>top-k / top-p / min-p</td><td>Nucleus and truncation sampling</td><td>三种截断候选集的方式：保留概率最高的 k 个、保留累积概率达到 p 的最小集合、丢弃概率低于 min-p 乘最大概率的 token；它们与温度各管一件事。</td></tr>
    <tr><td>重复惩罚</td><td>Repetition penalty</td><td>对已出现 token 的 logit 施加惩罚（除以大于 1 的系数或减常数）；能缓解复读，但系数过大会破坏语法与专有名词。</td></tr>
    <tr><td>量化 int8/int4</td><td>Int8 and int4 quantization</td><td>用 8 或 4 bit 表示权重（有时含激活）；7B 模型 fp16 约 14GB、int4 约 3.5GB，代价是困惑度略升与部分任务退化。</td></tr>
    <tr><td>GPTQ</td><td>GPTQ</td><td>训练后量化方法，逐层用二阶信息（Hessian 近似）修正量化误差；4 bit 权重下质量好，需要少量校准数据。</td></tr>
    <tr><td>AWQ</td><td>Activation-aware weight quantization</td><td>按激活幅度识别重要通道并加以保护（约 1% 的通道）；4 bit 下通常优于朴素舍入，推理需配套内核。</td></tr>
    <tr><td>GGUF</td><td>GGUF</td><td>llama.cpp 使用的单文件模型与量化格式，内含权重与元数据、支持多种 K-quant 等级；主要面向 CPU 与 Apple 芯片的本地推理。</td></tr>
    <tr><td>bitsandbytes</td><td>bitsandbytes</td><td>提供 8 bit 与 4 bit（NF4）线性层以及 8 bit 优化器的库；Hugging Face 生态中做 QLoRA 的默认依赖。</td></tr>
    <tr><td>vLLM</td><td>vLLM</td><td>高吞吐推理引擎，核心是 PagedAttention 与连续批处理；同硬件下吞吐常比朴素实现高数倍。</td></tr>
    <tr><td>PagedAttention</td><td>PagedAttention</td><td>把 KV cache 切成固定大小的块按需分配，类似操作系统的虚拟内存分页；消除「按最大长度预留」造成的浪费与碎片。</td></tr>
    <tr><td>连续批处理</td><td>Continuous batching</td><td>每个解码步都动态移除已完成序列、加入新请求，而非等整批结束；在线服务吞吐的关键机制。</td></tr>
    <tr><td>预填充与解码</td><td>Prefill and decode</td><td>预填充把整段提示一次并行前向、算力受限；解码逐 token 生成、访存受限；两者的最优批大小与优化手段完全不同。</td></tr>
    <tr><td>投机解码</td><td>Speculative decoding</td><td>小模型先草拟 k 个 token，大模型一次并行验证并接受最长正确前缀；输出分布不变，加速比取决于草稿命中率。</td></tr>
    <tr><td>延迟与吞吐</td><td>Latency versus throughput</td><td>延迟是单请求耗时（首 token 时间与每 token 时间），吞吐是单位时间总 token 数；批处理提升吞吐却抬高延迟，必须先定 SLA 再调参。</td></tr>
    <tr><td>prompt caching</td><td>Prompt caching</td><td>缓存提示前缀的 KV，命中时直接复用、跳过重算；对固定系统提示与长文档问答收益最大，但缓存有生命周期与容量上限。</td></tr>
    <tr><td>前缀缓存</td><td>Prefix caching</td><td>与 prompt caching 同指提示侧 KV 复用；跨请求复用时要求前缀逐 token 一致（含位置），否则只能部分命中。</td></tr>
    <tr><td>结构化输出</td><td>Structured output</td><td>用语法或 JSON Schema 约束解码，保证输出可解析；代价是采样空间受限于约束，极端约束下会牺牲表达力。</td></tr>
    <tr><td>function calling</td><td>Function calling</td><td>让模型输出符合约定的工具名与参数（常为 JSON），宿主执行后把结果回填再继续生成；本质是结构化输出加多轮循环。</td></tr>
    <tr><td>上下文截断</td><td>Context truncation</td><td>超出窗口时丢弃最早或中间部分；会静默丢信息，工程上必须记录被截断内容，否则故障无法归因。</td></tr>
    <tr><td>KV 显存占用</td><td>KV cache memory</td><td>由层数、KV 头数、每头维度、序列长度与元素字节数相乘再乘 2 得出；它就是长上下文服务的显存账单。</td></tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>KV cache 的显存与吞吐公式</h4>
  <p>单个序列的 KV cache 占用（字节）为：</p>
  \[ \text{KV bytes} \;=\; 2 \times L \times n_{kv} \times d_{head} \times T \times b \]
  <p>
    其中 2 来自 key 与 value 两份，\(L\) 为层数，\(n_{kv}\) 为 KV 头数，\(d_{head}\) 为每头维度，\(T\) 为序列长度，\(b\) 为每元素字节数（fp16 取 2、int8 取 1）。
    以 Llama 3 8B 为例：\(L = 32\)、\(n_{kv} = 8\)、\(d_{head} = 128\)、fp16，则每 token 约 \(2 \times 32 \times 8 \times 128 \times 2 = 131072\) 字节，
    即每 token 约 128 KB；32K 上下文的一条序列就要约 4GB，并发 8 条即约 32GB。这解释了为什么长上下文必须搭配 GQA、量化 KV 或分页管理。
  </p>
  <p>吞吐侧则近似满足：解码阶段每步读取全部权重一次，因此 tokens/s 的上限约为「显存带宽 除以 模型字节数」；批大小足够大时才能把访存摊薄，这也是连续批处理的收益来源。</p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">线上服务报「吞吐低」。日志显示单请求首 token 很快，但每条请求输出都很长，且批大小始终接近 1。最先应该动的是？</p>
  <ul class="opts">
    <li>把模型换成 int4 量化版本：显存降了但访存瓶颈仍在</li>
    <li>提高温度的采样多样性</li>
    <li data-ok>开启连续批处理并适当提高并发上限，让解码步之间有多个序列并行</li>
    <li>把上下文窗口调大</li>
  </ul>
  <p class="why">解码阶段是访存受限：每步都要读一遍权重，只有并行处理多条序列才能把带宽摊薄。首 token 快说明预填充没问题，问题出在解码的批效率；调大窗口或量化都不能改变「批大小为一」这一根本浪费。</p>
</div>

<h3>8. 评估与科研方法（Evaluation and research methods）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>留出集</td><td>Held-out set</td><td>训练与调参全程都不碰的数据；它的价值在于给出一次无偏估计，一旦反复用它选模型，它就退化成验证集。</td></tr>
    <tr><td>benchmark</td><td>Benchmark</td><td>固定的题目集合与打分脚本；只有版本、提示模板、解码参数全部固定时，分数才可比较。</td></tr>
    <tr><td>数据泄漏</td><td>Data leakage</td><td>训练集与评测集重叠，或特征中已包含标签信息；前者抬高分数，后者让线下指标无法迁移到线上。</td></tr>
    <tr><td>交叉验证</td><td>Cross-validation</td><td>把数据切成 k 折，轮流以其中一折验证并取平均；用全部样本估计泛化误差，代价是 k 倍训练开销。</td></tr>
    <tr><td>分组交叉验证</td><td>Grouped cross-validation</td><td>同一组（同一病人、用户、文档、仓库）的样本必须整体落在同一折；漏掉这一步等于把同组信息泄漏进验证集。</td></tr>
    <tr><td>留一法</td><td>Leave-one-out CV</td><td>折数等于样本数的交叉验证；偏差小、方差大、计算贵，在近似线性模型上有廉价闭式解。</td></tr>
    <tr><td>ridge/lasso</td><td>Ridge and lasso</td><td>两种正则化：ridge 用平方惩罚收缩系数，lasso 用绝对值惩罚产生稀疏解从而顺带做特征选择。</td></tr>
    <tr><td>偏差-方差权衡</td><td>Bias-variance tradeoff</td><td>期望泛化误差可分解为偏差平方、方差与不可约噪声；容量增大降低偏差、抬高方差，最优容量在两者之和最小处。</td></tr>
    <tr><td>VC 维</td><td>VC dimension</td><td>假设类能够打散的最大样本数，是容量度量；容量越大泛化界越松，因此它解释趋势而非预测具体分数。</td></tr>
    <tr><td>泛化界</td><td>Generalization bound</td><td>用容量与样本量给出的泛化误差上界；常数通常极松，实用价值在于说明「为什么样本少就必须限制容量」。</td></tr>
    <tr><td>置换检验</td><td>Permutation test</td><td>反复打乱标签或分组并重算统计量，得到原假设下的经验分布；不依赖正态假设，适合小样本与非标准统计量。</td></tr>
    <tr><td>p 值</td><td>p-value</td><td>原假设成立时观测到「至少这么极端」结果的概率；它不衡量效应大小，也不等于原假设为假的概率。</td></tr>
    <tr><td>效应量 Cohen d</td><td>Effect size (Cohen d)</td><td>均值差除以合并标准差，衡量差异相对于波动的幅度；0.2、0.5、0.8 作为小中大参考，必须与 p 值及样本量一起报告。</td></tr>
    <tr><td>消融</td><td>Ablation</td><td>从完整系统中移除或替换一个组件后重测，用于定位提升来自哪里；同时改多个组件再比较，等于没做消融。</td></tr>
    <tr><td>统计显著性</td><td>Statistical significance</td><td>观察到的差异在噪声下不易出现的程度；只报均值、不报方差与重复次数的对比一律不可信。</td></tr>
    <tr><td>Wilcoxon 符号秩检验</td><td>Wilcoxon signed-rank test</td><td>对配对差值按绝对值排秩再检验的非参数方法；比配对 t 检验更抗离群值，适合小样本或明显偏斜的分布。</td></tr>
    <tr><td>Clever Hans 效应</td><td>Clever Hans effect</td><td>模型利用了与标签相关但无因果的捷径（背景、水印、长度、措辞），换分布即失效；靠分布外测试与反事实扰动检测。</td></tr>
    <tr><td>进步的错觉</td><td>Illusion of progress</td><td>Hand 的论点：复杂模型带来的提升，常能被「更简单的模型 + 更好的特征或更多数据」复现；因此进步必须对照强基线而非只看绝对分数。</td></tr>
    <tr><td>可复现性</td><td>Reproducibility</td><td>给定相同代码、数据、随机种子与环境能得到相同结果；报告里缺少其中任何一项，别人就无法验证你的结论。</td></tr>
    <tr><td>预注册</td><td>Preregistration</td><td>在看到数据之前固定假设、主要指标与分析方案；用来区分验证性分析与探索性分析，压缩事后挑结果的空间。</td></tr>
  </tbody>
</table>

<div class="acc" data-t="深入：报告一次模型对比的最小清单" data-badge="选读">
  <div class="acc-body">
    <p>任何「A 比 B 好」的结论，至少要给齐以下六项，缺一项就不可复核：</p>
    <table class="tbl small">
      <thead><tr><th>项目</th><th>为什么必须给</th></tr></thead>
      <tbody>
        <tr><td>数据划分方式</td><td>随机划分还是分组划分，决定了指标是否被同组泄漏抬高</td></tr>
        <tr><td>每次运行的随机种子与重复次数</td><td>没有重复次数就无法区分提升与噪声</td></tr>
        <tr><td>均值与标准差（或置信区间）</td><td>只给均值等于隐藏了主要不确定性</td></tr>
        <tr><td>配对检验及效应量</td><td>配对设计要用配对检验，效应量说明提升是否值得工程成本</td></tr>
        <tr><td>解码与提示模板</td><td>温度、top-p、模板变化带来的差异常大于方法本身</td></tr>
        <tr><td>失败案例与截断比例</td><td>被截断或解析失败的样本如何处理，会直接改变结论方向</td></tr>
      </tbody>
    </table>
    <p>顺序建议：先证明差异不是噪声（重复加配对检验），再证明差异有意义（效应量），最后证明差异不是捷径（分布外与扰动测试）。</p>
  </div>
</div>

<h3>9. 算力与成本（Compute and cost）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>FLOPs</td><td>Floating point operations</td><td>浮点运算次数；一次乘加算 2 次运算，它是估算训练时间、推理延迟与电费的基本单位。</td></tr>
    <tr><td>6ND 估算式</td><td>Compute estimate 6ND</td><td>训练总算力约为 6 乘 参数量 乘 训练 token 数：前向约 2ND，反向约 4ND；它让「这个模型要多少算力」变成一行算术。</td></tr>
    <tr><td>GPU 小时</td><td>GPU hour</td><td>一张加速器运行一小时，是算力市场的计价单位；换算时要用实测利用率与功率，标称峰值几乎不可能跑满。</td></tr>
    <tr><td>T4/A100/H100</td><td>T4, A100, H100</td><td>三代常用加速器：T4 为 16GB 显存、约 320GB/s、只适合 fp16；A100 80GB 约 2TB/s、bf16 约 312 TFLOP/s；H100 约 3.35TB/s、bf16 约 990 TFLOP/s。</td></tr>
    <tr><td>Colab 免费层与 Pro</td><td>Colab free and Pro</td><td>免费层通常给 T4 并有会话时长与闲置断开限制，Pro 可能分配到 A100 或 L4；具体型号与配额随时段和地区变化，不能写进复现实验的前提里。</td></tr>
    <tr><td>Kaggle TPU v5e-8</td><td>Kaggle TPU v5e-8</td><td>Kaggle 每周发放的免费 TPU 配额，8 颗 v5e 芯片、单芯约 16GB；适合 JAX 小模型训练，需按每周配额与单次会话上限规划。</td></tr>
    <tr><td>HF Jobs</td><td>Hugging Face Jobs</td><td>Hugging Face 的托管作业，按 GPU 型号计费并可直接挂载 Hub 上的模型与数据集；适合短时微调与批量推理。</td></tr>
    <tr><td>Spaces</td><td>Hugging Face Spaces</td><td>托管应用（Gradio、Streamlit、Docker），有免费 CPU 档与按小时计费的 GPU 档；定位是演示与分享，不是高并发生产服务。</td></tr>
    <tr><td>RunPod/Vast</td><td>RunPod and Vast.ai</td><td>两类按小时租用 GPU 的平台：RunPod 提供托管 pod 与社区云，Vast 是竞价式聚合市场；后者更便宜但实例稳定性与网络差异更大。</td></tr>
    <tr><td>训练成本估算</td><td>Training cost estimation</td><td>总 FLOPs 除以（卡数 乘 单卡有效 FLOPs/s 乘 利用率）得到秒数，再乘小时单价；预算必须包含失败重跑、调试与数据处理的算力。</td></tr>
    <tr><td>每百万 token 推理成本</td><td>Cost per million tokens</td><td>由硬件小时价除以实测吞吐得到：成本 = 小时价 除以 每小时 token 数 再乘 1e6；它把电价、利用率与批处理效率压缩成一个可对比数字。</td></tr>
  </tbody>
</table>

<h3>10. 订阅经济（Subscription economics，来自访谈记录的量级参考）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>订阅套利</td><td>Subscription arbitrage</td><td>用固定月费获得远超该价格可买到的 API 额度的推理能力，再把这份能力用于等价于 API 的工作负载；价差源自厂商补贴与额度设计，受条款与限流约束，不是无风险收益。</td></tr>
    <tr><td>等效推理额度</td><td>Effective inference credit</td><td>把订阅按公开 API 单价折算成「值多少美元的 token」；用来判断某档订阅是否划算，必须用实测 token 量而不是宣传语。</td></tr>
    <tr><td>40 倍补贴</td><td>40x subsidy</td><td>访谈中出现的量级：某些高档订阅在重度使用下产出的 token 按 API 计价可达月费的数十倍；这个倍数随模型、缓存命中率与推理成本变化，不能当常数使用。</td></tr>
    <tr><td>百元档的陷阱</td><td>The 100-dollar trap</td><td>中间价位档常同时具备「额度不够重度使用」与「单位额度价格高于顶配」两个缺点；访谈的结论是要么留在低档按量付费，要么直接上顶配。</td></tr>
    <tr><td>滚动 5 小时窗口</td><td>Rolling 5-hour window</td><td>额度按最近 5 小时滚动统计而非自然日结算；短时间高强度使用会先撞墙，随后随窗口滑动逐步恢复。</td></tr>
    <tr><td>7 天上限</td><td>Weekly cap</td><td>除 5 小时窗口外还有每周总量上限，约束的是长期平均用量；因此「窗口没满」并不代表可以无限使用。</td></tr>
    <tr><td>月中重置</td><td>Mid-cycle reset</td><td>额度在计费周期中途恢复的现象；它由独立的重置定时器决定，与自然月结算不是一回事，需要单独记录时点。</td></tr>
    <tr><td>银行重置</td><td>Banked reset</td><td>把未使用的重置次数或额度存起来、之后一次性使用；与到点清零相对，是排期批量任务时最关键的差别。</td></tr>
    <tr><td>沉没 token 原则</td><td>Sunk cost principle</td><td>已经消耗的额度视为沉没成本、不参与后续决策；实践含义是不为了「不浪费」而在低价值任务上持续烧额度。</td></tr>
    <tr><td>burn-down</td><td>Burn-down</td><td>用量消耗曲线：把剩余额度按时间画出来，决定哪些任务现在跑、哪些留到下次重置之后。</td></tr>
    <tr><td>95% 毛利</td><td>95 percent gross margin</td><td>访谈对订阅型推理业务毛利率的量级描述；少量重度用户即可吃掉毛利，所以厂商必须用限流与窗口设计控制尾部用量。</td></tr>
    <tr><td>零公开流量规则</td><td>Zero public traffic rule</td><td>不做公开推广、只靠私域与口碑获客的运营选择；好处是不触发大规模滥用与对账压力，坏处是增长完全依赖留存。</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>把这些量级当参考，不当操作手册</h4>
  <p>
    第 10 节全部条目来自访谈中的经验数字，用途是建立数量级直觉与成本意识。把订阅能力转成 API 提供给第三方、或多账号共享，
    通常直接违反服务条款，可能触发封禁并造成数据与额度损失；相关风险与合规边界见第 14 节与附录 D。
  </p>
</section>

<h3>11. 网络与反封禁（Networking and account defense）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>住宅 IP</td><td>Residential IP</td><td>由 ISP 分配给家庭宽带的地址，在风控系统里与真实用户绑定；因此比机房地址更难被批量标记。</td></tr>
    <tr><td>数据中心指纹</td><td>Datacenter fingerprinting</td><td>通过 ASN、反向 DNS、时延分布与 TLS 指纹判断请求来自机房而非家庭；只换 IP 而不改其他特征，通常仍会被识别。</td></tr>
    <tr><td>多 IP 认证碰撞</td><td>Multi-IP auth collision</td><td>同一账号短时间内从差异很大的出口地址登录，被判定为共享或盗用；常见处置是强制二次验证甚至直接停用。</td></tr>
    <tr><td>Tailscale</td><td>Tailscale</td><td>基于 WireGuard 的零配置 mesh VPN，用身份而非地址建立点对点加密连接；适合把多台自有机器组成一个私有网络。</td></tr>
    <tr><td>mesh VPN</td><td>Mesh VPN</td><td>任意两节点直接建连、不依赖中心网关的组网方式；在 NAT 之后靠打洞成功、失败时回退到中继。</td></tr>
    <tr><td>tailnet</td><td>Tailnet</td><td>Tailscale 中的私有网络命名空间，设备、用户与访问策略都在其中定义，是权限最小化的落点。</td></tr>
    <tr><td>OAuth 会话刷新</td><td>OAuth session refresh</td><td>用 refresh token 定期换取新的 access token；令牌过期与刷新失败是长任务中途掉线的常见原因。</td></tr>
    <tr><td>CLI/Vibe Proxy</td><td>CLI and vibe proxy</td><td>把订阅制客户端的会话能力转成兼容 API 的本地反向代理；属于非官方路径，条款与稳定性风险由使用者承担。</td></tr>
    <tr><td>Bedrock base URL 改写</td><td>Bedrock base URL rewrite</td><td>把 SDK 的默认端点指向自建网关或兼容代理，用于统一鉴权、计量与多后端切换；改错端点会直接导致 403 或签名失败。</td></tr>
    <tr><td>优先路由</td><td>Priority routing</td><td>按账号等级、缓存命中或套餐档位把请求分配到不同队列；表现为高峰期低档账号排队更久。</td></tr>
    <tr><td>账号亲和</td><td>Account affinity</td><td>让同一会话的请求尽量落在同一账号或同一后端，以提高前缀缓存命中率并避免上下文丢失。</td></tr>
    <tr><td>WebSocket 长连接</td><td>WebSocket long connection</td><td>客户端与推理服务保持长连以流式接收 token；首 token 延迟低，代价是连接状态、心跳与断线重连都要自己维护。</td></tr>
    <tr><td>prompt cache 5 分钟绑定</td><td>Five-minute cache binding</td><td>缓存命中通常要求在数分钟内复用完全相同的前缀（常见为 5 分钟量级）；超时后需重新计费并重建缓存。</td></tr>
    <tr><td>限流</td><td>Throttling</td><td>服务端对请求数或 token 数设速率上限，触发后返回 429 或降速；客户端必须实现指数退避与队列化，否则重试风暴会加剧封禁。</td></tr>
    <tr><td>账号封禁</td><td>Account suspension</td><td>因违反条款、共享账号或异常流量模式导致的停用；已购额度与账号内数据通常无法取回，因此不要把唯一副本放在单一账号下。</td></tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">你要在 3 个地域跑同一个长任务，只有一个账号。按本节术语，最小改动的稳定方案是？</p>
  <ul class="opts">
    <li>每天换一个出口 IP，让风控看不出规律</li>
    <li>把带宽拉满，请求不超时就不会触发验证</li>
    <li data-ok>固定一个可信出口并保持账号亲和，让 ASN、反向 DNS、TLS 特征稳定一致</li>
    <li>改用 WebSocket 长连接，协议升级后风控自动放行</li>
  </ul>
  <p class="why">风控判定的是整体一致性而非单个字段：机房 ASN 加频繁变动的地址，等价于「同一账号在多个可疑出口登录」。修复顺序是先让出口特征稳定一致，再减少不必要的地址切换——这正是账号亲和的含义。</p>
</div>

<h3>12. 工作流与智能体（Workflow and agents）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>85/15 规则</td><td>The 85/15 rule</td><td>把约 85% 的精力花在定义问题与写清验收标准、15% 花在实现；比例反过来通常得到「能跑但没用」的产出。</td></tr>
    <tr><td>15 秒回滚</td><td>15-second rollback</td><td>任何改动都要能在 15 秒内撤销（小提交、开关、快照）；它把试错成本压到可忽略，从而真的鼓励多做实验。</td></tr>
    <tr><td>前置问题而非方案</td><td>Front-loading questions</td><td>先提交问题清单与约束条件，再给方案；因为一个错误方案消耗的时间远超把问题问清楚。</td></tr>
    <tr><td>管理式提示</td><td>Managed prompts</td><td>把提示当接口管理：版本化、配测试用例、记录变更；而不是每次现场手写一段自然语言。</td></tr>
    <tr><td>thread as to-do</td><td>Thread as to-do</td><td>把对话线程本身当任务清单，每条未决项留在线程里、解决后显式关闭；避免口头承诺在长对话里蒸发。</td></tr>
    <tr><td>settle</td><td>Settle</td><td>让智能体把当前状态落定（写完、跑完、验证完）再结束回合，而不是留下半成品等下一次输入。</td></tr>
    <tr><td>inbox zero</td><td>Inbox zero</td><td>把所有待办显式移入任务系统、清空通知流；在智能体语境里指不让未处理结果堆积在会话里。</td></tr>
    <tr><td>git worktree</td><td>Git worktree</td><td>同一仓库派生多个独立工作目录、各自检出不同分支；让并行智能体互不干扰，避免反复 stash 与切分支。</td></tr>
    <tr><td>端到端任务链</td><td>End-to-end task chain</td><td>从需求到验证的完整链路（代码、测试、文档、部署），每环都有可执行验收而不是人工目测。</td></tr>
    <tr><td>后台派发</td><td>Background dispatch</td><td>把长任务交给后台作业后立刻返回，主线程继续推进；回收结果时必须能区分失败、部分成功与超时。</td></tr>
    <tr><td>远程节点卸载</td><td>Remote node offload</td><td>把编译、测试、训练放到另一台机器执行，本地只留编辑与轻量验证，避免笔记本被重负载拖慢。</td></tr>
    <tr><td>CI offloading</td><td>CI offloading</td><td>把验证交给持续集成而非本地反复运行；好处是环境一致、结果可追溯、失败可重跑。</td></tr>
    <tr><td>Blacksmith</td><td>Blacksmith</td><td>面向 GitHub 的托管 CI 加速服务，用更快的机器与更激进的缓存缩短流水线时间；本质是用钱换等待时间。</td></tr>
    <tr><td>GitHub Actions</td><td>GitHub Actions</td><td>GitHub 原生 CI，用 YAML 定义作业与矩阵；公开仓库免费额度宽松，私有仓库按运行分钟计费。</td></tr>
    <tr><td>PR 审计</td><td>Pull request audit</td><td>对每个合并请求逐项检查范围、测试、风险与回滚方案；它把「谁的改动」变成「可追溯的改动」的最小机制。</td></tr>
    <tr><td>休眠代码发现</td><td>Dormant code discovery</td><td>主动找出长期未被调用、未被测试覆盖的代码路径并决定删除或激活；死代码是理解成本与安全风险的主要来源。</td></tr>
  </tbody>
</table>

<h3>13. 硬件与操作系统（Hardware and operating systems）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>裸金属 Linux</td><td>Bare-metal Linux</td><td>直接安装在物理机上的 Linux，没有虚拟化层损耗；适合需要独占 GPU、独占总线或要求稳定延迟的任务。</td></tr>
    <tr><td>APFS 锁争用</td><td>APFS lock contention</td><td>多个进程（Docker、索引、构建缓存）同时读写同一 APFS 卷时的文件锁竞争，表现为构建莫名变慢；把工作目录移到独立卷或改走远程节点可缓解。</td></tr>
    <tr><td>热降频</td><td>Thermal throttling</td><td>芯片温度触顶后自动降频，长任务性能随时间下滑；迷你主机与轻薄本上最明显，只能靠散热设计与功耗上限解决。</td></tr>
    <tr><td>安全守护进程</td><td>Security and index daemons</td><td>系统常驻的后台服务（索引、杀毒、备份、云同步），会周期性抢占磁盘与 CPU；对容器与随机读写负载影响最大。</td></tr>
    <tr><td>并行度</td><td>Degree of parallelism</td><td>同时运行的进程或线程数；它并不等于物理核数，编译与数据处理任务往往受内存带宽和磁盘限制。</td></tr>
    <tr><td>云 VPS 经济学</td><td>Cloud VPS economics</td><td>云主机按小时弹性计费，但长期总成本高于同规格自有机器；判断标准是负载持续性——间断且峰值高的负载更适合云。</td></tr>
    <tr><td>迷你主机</td><td>Mini PC</td><td>低功耗小型主机（Apple silicon 或 Ryzen 迷你机），做常驻开发与轻量推理节点性价比高；瓶颈通常是内存带宽与散热而非核心数。</td></tr>
    <tr><td>噪音与功耗</td><td>Noise and power draw</td><td>本地机器的风扇噪音与电费是真实成本；长时间训练前先估算功率，否则「免费」的本地算力会变成噪声与电费账单。</td></tr>
  </tbody>
</table>

<h3>14. 风险与合规（Risk and compliance）</h3>
<table class="tbl small">
  <thead><tr><th>术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>服务条款</td><td>Terms of service (ToS)</td><td>使用条款；限速绕过、转售、多账号共享与自动化抓取常被明确禁止，违反可导致停用且额度不退。</td></tr>
    <tr><td>账号安全</td><td>Account security</td><td>强口令、二次验证、令牌最小权限与定期轮换、绝不共享凭据；账号是额度与数据的唯一入口。</td></tr>
    <tr><td>数据隐私设置</td><td>Data privacy settings</td><td>对话是否被用于改进服务、保留多久、能否导出与删除；企业版通常可关闭训练用途，个人版多半默认开启。</td></tr>
    <tr><td>企业条款与个人条款</td><td>Enterprise versus consumer terms</td><td>企业版强调数据处理协议、审计与不用于训练；个人版在数据使用上限制更少，两者不能混用同一账号。</td></tr>
    <tr><td>模型蒸馏</td><td>Model distillation</td><td>用某个模型的输出训练另一个模型；可能违反使用条款，也可能触及数据与知识产权，商用前必须查许可。</td></tr>
    <tr><td>学术诚信</td><td>Academic integrity</td><td>课程作业使用生成模型必须遵守学校规定：允许辅助理解、禁止代写；不声明使用情况本身通常就构成违规。</td></tr>
    <tr><td>数据集许可</td><td>Dataset license</td><td>数据的可用范围、署名要求与能否商用；CC-BY、CC-BY-NC 与自定义条款差异极大，来源不明的爬取数据默认有风险。</td></tr>
    <tr><td>幻觉</td><td>Hallucination</td><td>生成流畅但不真实的内容（虚构引用、不存在的 API、错误定理）；根因是目标函数奖励「像真的」而非「是真的」，必须靠外部验证兜底。</td></tr>
  </tbody>
</table>

<h3>15. 高阶与前沿（Advanced and frontier，对应 14、16–22 章）</h3>
<table class="tbl small">
  <thead><tr><th>中文术语</th><th>English</th><th>一句话解释</th></tr></thead>
  <tbody>
    <tr><td>知识蒸馏</td><td>Knowledge distillation</td><td>训练小模型去逼近大模型的输出分布，而不只学硬标签；压的是模型规模与架构。</td></tr>
    <tr><td>软标签</td><td>Soft targets</td><td>教师给出的完整概率分布，携带「类间相似性」这类暗知识，硬标签里没有。</td></tr>
    <tr><td>温度（蒸馏用）</td><td>Temperature in KD</td><td>\(T>1\) 把教师分布拉平，让暗知识更容易被学生看到；\(T\to\infty\) 会退化成均匀分布。</td></tr>
    <tr><td>序列级蒸馏</td><td>Sequence-level KD</td><td>只用教师的输出文本当训练数据，属于黑盒蒸馏，本质是「用合成数据做 SFT」。</td></tr>
    <tr><td>在线蒸馏</td><td>On-policy distillation</td><td>让学生自己生成、教师即时纠正，缓解训练与推理分布不一致（GKD，ICLR 2024）。</td></tr>
    <tr><td>容量差距</td><td>Capacity gap</td><td>教师与学生规模差太大时学生学不动；教师不是越大越好。</td></tr>
    <tr><td>正向 / 反向 KL</td><td>Forward / reverse KL</td><td>前者要求覆盖教师所有高概率模式（更平滑），后者只抓教师的高峰（更锐利、易丢多样性）。</td></tr>
    <tr><td>模式坍缩</td><td>Mode collapse</td><td>学生只学会教师的部分行为，输出多样性明显下降。</td></tr>
    <tr><td>测试时计算</td><td>Test-time compute</td><td>推理阶段投入更多算力（更长思考、多次采样、搜索）来换正确率。</td></tr>
    <tr><td>pass@k</td><td>Pass at k</td><td>采样 \(k\) 个回答里至少一个正确的概率；单次正确率 \(p\) 时为 \(1-(1-p)^k\)，边际收益递减。</td></tr>
    <tr><td>过程 / 结果奖励</td><td>PRM / ORM</td><td>前者对推理每一步打分，后者只看最终答案；PRM 信号更密但标注成本高。</td></tr>
    <tr><td>检索增强生成</td><td>RAG</td><td>先从外部资料检索相关内容再生成；解决「缺知识」，不解决「缺行为」。</td></tr>
    <tr><td>切分</td><td>Chunking</td><td>把长文档切成可检索的小块；粒度直接决定召回率与上下文成本。</td></tr>
    <tr><td>稠密 / 稀疏检索</td><td>Dense / sparse retrieval</td><td>前者用向量相似度（语义），后者用词频（如 BM25，精确匹配强）；混合检索常优于单一方法。</td></tr>
    <tr><td>重排</td><td>Reranker</td><td>用交叉编码器对初筛结果精排；比向量检索准，但更慢，通常只对前几十条做。</td></tr>
    <tr><td>召回@k / nDCG</td><td>Recall@k / nDCG</td><td>检索质量指标：前者看前 k 条里有没有命中，后者看排序质量。</td></tr>
    <tr><td>忠实度</td><td>Faithfulness</td><td>回答是否只依据检索到的内容；RAG 系统最容易出问题的地方（编造引用）。</td></tr>
    <tr><td>迷失在中间</td><td>Lost in the middle</td><td>长上下文里中段信息最容易被忽略；把关键内容放头尾更稳。</td></tr>
    <tr><td>上下文工程</td><td>Context engineering</td><td>把指令、资料、示例、工具结果组织进有限窗口的工程实践，比「写提示词」更系统。</td></tr>
    <tr><td>工具调用 / 函数调用</td><td>Tool / function calling</td><td>模型输出结构化参数去调用外部函数；需要 schema 校验、超时、重试与权限最小化。</td></tr>
    <tr><td>ReAct</td><td>ReAct</td><td>推理与行动交替进行的智能体范式：想一步、做一步、看结果、再想。</td></tr>
    <tr><td>MCP</td><td>Model Context Protocol</td><td>把工具与数据源以统一协议暴露给模型的开放标准，解决「每个工具一套接法」。</td></tr>
    <tr><td>幂等</td><td>Idempotency</td><td>同一操作重复执行不产生额外副作用；智能体重试机制的前提。</td></tr>
    <tr><td>终止条件</td><td>Stopping condition</td><td>智能体必须显式定义何时停下（步数、预算、成功判定），否则会死循环。</td></tr>
    <tr><td>提示注入</td><td>Prompt injection</td><td>把恶意指令藏在被读取的内容里，劫持智能体行为；系统提示不是安全边界。</td></tr>
    <tr><td>红队</td><td>Red teaming</td><td>主动构造攻击与滥用场景来找出模型弱点，是发布前的标准动作。</td></tr>
    <tr><td>可扩展监督</td><td>Scalable oversight</td><td>当模型强于人类评审时，如何仍然有效监督；候选手段包括辩论与弱到强泛化。</td></tr>
    <tr><td>Goodhart 定律</td><td>Goodhart's law</td><td>一旦把代理指标当作目标优化，它就不再是好的指标；奖励黑客的理论根据。</td></tr>
    <tr><td>探针 / 激活修补</td><td>Probing / activation patching</td><td>可解释性手段：前者从内部状态读出信息，后者通过替换激活来检验因果作用。</td></tr>
    <tr><td>稀疏自编码器</td><td>Sparse autoencoder (SAE)</td><td>把稠密激活分解成稀疏的、更可读的特征方向，用于解释神经元级行为。</td></tr>
    <tr><td>取用意识</td><td>Access consciousness</td><td>信息可被用于推理、报告与行动的那一层；与「现象意识」相对（Block, 1995）。</td></tr>
    <tr><td>现象意识</td><td>Phenomenal consciousness</td><td>「感觉起来像什么」的主观体验本身；目前没有公认的测量方式。</td></tr>
    <tr><td>难问题</td><td>The hard problem</td><td>为什么信息处理会伴随主观体验（Chalmers, 1995）；与之相对的是可研究的「容易问题」。</td></tr>
    <tr><td>全局工作空间</td><td>GWT</td><td>信息被广播到容量有限的工作空间即成为意识内容（Baars；Dehaene）。</td></tr>
    <tr><td>整合信息论</td><td>IIT</td><td>用整合信息量 \( \Phi \) 刻画意识；争议极大，2023 年有百余名研究者联署称其为伪科学。</td></tr>
    <tr><td>指标属性</td><td>Indicator properties</td><td>从各意识理论推出的可检查特征（Butlin &amp; Long 等, 2023），把哲学问题变成清单。</td></tr>
    <tr><td>中文屋</td><td>Chinese room</td><td>Searle（1980）的思想实验：按规则操作符号不等于理解。</td></tr>
    <tr><td>功能主义</td><td>Functionalism</td><td>意识由功能组织决定，因此可在非生物基质上实现；这是主流 AI 研究的默认假设。</td></tr>
    <tr><td>模型福利</td><td>Model welfare</td><td>在道德地位不确定的前提下，把模型自身可能的福利当作研究议题。</td></tr>
    <tr><td>AGI</td><td>Artificial general intelligence</td><td>在广泛任务上达到人类水平的能力问题；与意识、RSI 是三件不同的事。</td></tr>
    <tr><td>RSI</td><td>Recursive self-improvement</td><td>系统加速改进自身能力的动力学问题；不蕴含意识。</td></tr>
    <tr><td>结构化 / 非结构化剪枝</td><td>Structured / unstructured pruning</td><td>前者删整行整列（硬件友好），后者删单个权重（压缩率高但通用 GPU 难加速）。</td></tr>
    <tr><td>稀疏度</td><td>Sparsity</td><td>被置零参数的比例；不等于实际加速，需要硬件与 kernel 支持。</td></tr>
    <tr><td>QAT / PTQ</td><td>Quantization-aware / post-training quantization</td><td>前者在训练中模拟量化误差，后者训练后校准；精度与成本此消彼长。</td></tr>
    <tr><td>模型合并</td><td>Model merging</td><td>把多个同源微调模型的权重融合（平均、任务算术、TIES、DARE），有时能同时提升多任务表现。</td></tr>
    <tr><td>MoE upcycling</td><td>MoE upcycling</td><td>把稠密模型「升级」成稀疏专家结构，复用已训练权重而非从头训练。</td></tr>
    <tr><td>状态空间模型</td><td>State-space model (SSM)</td><td>用递推 \( h_t = A h_{t-1} + B x_t \) 建模序列，复杂度对长度线性；代价是表达方式不同。</td></tr>
    <tr><td>线性 / 滑窗注意力</td><td>Linear / sliding-window attention</td><td>把 \( O(T^2) \) 的注意力替换为线性或局部形式，长上下文更省，但能力取舍需实测。</td></tr>
    <tr><td>MLA</td><td>Multi-head latent attention</td><td>用低秩隐向量压缩 KV，进一步缩小 KV Cache（与 GQA/MQA 同族思路）。</td></tr>
    <tr><td>多 token 预测</td><td>Multi-token prediction (MTP)</td><td>一次预测多个未来 token，提升训练信号密度并可用于推理加速。</td></tr>
    <tr><td>扩散语言模型</td><td>Diffusion LM</td><td>用去噪过程生成文本，与自回归路线不同；并行生成是潜在优势，成熟度仍在发展。</td></tr>
    <tr><td>视觉语言模型</td><td>VLM</td><td>编码器 + 投影层 + 语言模型的三段式结构，把图像特征接到文本模型的表示空间。</td></tr>
    <tr><td>对比学习 / InfoNCE</td><td>Contrastive learning / InfoNCE</td><td>拉近正样本、推远负样本（CLIP 式训练目标），是多模态对齐的基础损失。</td></tr>
  </tbody>

  <!-- 高级章（16–22，另有 23–29）与附录 G 新增术语 -->
  <tbody>
    <tr><td>暗知识</td><td>Dark knowledge</td><td>教师分布里「第 2 类比第 3 类更接近」这类类间结构；硬标签 \([1,0,0]\) 完全丢失，只在软标签中保留，温度 \(T>1\) 时更明显。</td></tr>
    <tr><td>特征蒸馏</td><td>Feature distillation</td><td>让学生模仿教师的隐藏状态或注意力矩阵，而不只是输出；要求同架构并配投影层，跨家族时基本不可用。</td></tr>
    <tr><td>词表对齐</td><td>Vocabulary alignment</td><td>词级蒸馏的前提：教师与学生必须共享同一词表与分词，否则每个位置的分布无法逐项比较，只能退化为响应蒸馏。</td></tr>
    <tr><td>长度漂移</td><td>Length drift</td><td>学生学会「教师的答案更长」这一表面统计，输出越来越长而正确率不变；用长度归一化与数据中的短答案正例纠正。</td></tr>
    <tr><td>错误继承</td><td>Error inheritance</td><td>教师系统性答错的样本被学生学得更牢，因为教师分布很自信；对策是规则验证器过滤或对低置信样本降权。</td></tr>
    <tr><td>尾部质量</td><td>Tail mass</td><td>只存 top-k logits 时被丢弃的概率质量 \(m = 1 - \sum_{i \in \text{top-}k} p_i\)；中位数超过 0.05 就加大 k 或降低温度。</td></tr>
    <tr><td>数据保留率</td><td>Data keep rate</td><td>生成样本经去重与规则过滤后剩下的比例；低于 0.5 说明提示太相似或过滤过狠，应先增加提示数而不是采样数。</td></tr>
    <tr><td>覆盖率</td><td>Coverage</td><td>采样 \(n\) 次里至少有一条正确的概率 \(1-(1-p)^n\)；它描述候选集合，不等于用户最终看到的答案正确率。</td></tr>
    <tr><td>无偏估计</td><td>Unbiased pass@k estimator</td><td>由「\(n\) 次采样中 \(c\) 次正确」估计 pass@k 的式子 \(1-\binom{n-c}{k}/\binom{n}{k}\)；\(k=1\) 时退化为 \(c/n\)。</td></tr>
    <tr><td>裁判精度</td><td>Judge accuracy</td><td>候选里至少有一条正确时，裁判挑中正确那条的概率 \(q\)；交付准确率的上限就是 \(q\)，加采样无法突破。</td></tr>
    <tr><td>过思考</td><td>Overthinking</td><td>在简单题上生成大量推理 token 却几乎不提升正确率的现象；判据是输出变长而正确率不动，对策是分档限长。</td></tr>
    <tr><td>预算强制</td><td>Budget forcing</td><td>通过强行截断或反复追加「等一下」来控制思考长度的推理时技巧，可在不重训的情况下把长度拉长或压短。</td></tr>
    <tr><td>计算最优分配</td><td>Compute-optimal allocation</td><td>按题目难度分配测试时算力而非统一采样数；实证相对朴素 best-of-n 把算力效率提高约 4 倍。</td></tr>
    <tr><td>思考预算</td><td>Thinking budget</td><td>为每条推理链设定的输出 token 上限；它同时决定 KV 显存、端到端延迟与账单，应做成可调超参。</td></tr>
    <tr><td>倒数排名融合</td><td>Reciprocal rank fusion (RRF)</td><td>只按名次融合多路检索结果，单个结果贡献 \(1/(\kappa+\mathrm{rank})\)，常数常取 60；无需两路分数可比，代价是丢失分差信息。</td></tr>
    <tr><td>父子块检索</td><td>Parent-child retrieval</td><td>用小子块建索引保证召回精度，命中后改送它所属的大父块给生成模型；父块常取 1600–2000 token，避免答案被切碎在块边界。</td></tr>
    <tr><td>上下文预算</td><td>Context budget</td><td>把窗口按区段预先分配：系统指令与输出 schema 属不可压缩区，检索块按融合分数从低到高先砍，并留约 10% 余量给格式开销。</td></tr>
    <tr><td>硬负例</td><td>Hard negative</td><td>与查询相似但不含答案的文档，用于训练或评估检索器；只喂随机负例时模型学不会区分，Recall@k 会被明显高估。</td></tr>
    <tr><td>引用支持率</td><td>Citation support rate</td><td>被引段落真正支持所标注句子的比例；它与引用 id 合法率是两个指标，前者需判定式校验，混用会低估风险并修错地方。</td></tr>
    <tr><td>全文索引</td><td>Full-text search index (FTS)</td><td>为词项建倒排表以支持 BM25 之类打分；SQLite FTS5 自 3.9.0（2015-10-14）内置并自带 bm25() 排名，适合单机语料。</td></tr>
    <tr><td>幂等键</td><td>Idempotency key</td><td>由任务、步骤、工具名与参数哈希拼出的唯一键，服务端保证同一键只生效一次；建议 128 位，32 位在一百万次调用下碰撞期望量级远超 1。</td></tr>
    <tr><td>指数退避</td><td>Exponential backoff</td><td>失败后按 \(t \cdot 2^{\text{attempt}}\) 等待重试并加随机抖动；通常最多重试 3–5 次，抖动避免多客户端同步重试造成尖峰。</td></tr>
    <tr><td>熔断器</td><td>Circuit breaker</td><td>某工具连续失败（常用阈值 5 次）后暂停调用进入冷却，冷却后半开放行试探；防止在必然失败的下游上空转并加剧重试风暴。</td></tr>
    <tr><td>最小权限</td><td>Least privilege</td><td>按任务而非按操作者身份发放权限：能只读就不给写，能给单个目录就不给全盘；系统提示只是建议，代码里的允许列表才是边界。</td></tr>
    <tr><td>工具模式校验</td><td>Tool schema validation</td><td>在宿主侧检查工具参数的类型、枚举与必填项（如 additionalProperties 设为 false）；能挡掉大部分参数幻觉，失败时回灌结构化错误。</td></tr>
    <tr><td>沙箱</td><td>Sandbox</td><td>把智能体的文件与网络访问限制在隔离环境（容器、临时分支、只读挂载）内；越权操作在沙箱里失败，而不是污染真实状态。</td></tr>
    <tr><td>威胁模型</td><td>Threat model</td><td>一页纸列出资产、攻击者能触及的输入、攻击路径与每层缓解措施；缺了它就无法判断评测到底覆盖了什么。</td></tr>
    <tr><td>间接提示注入</td><td>Indirect prompt injection</td><td>指令藏在模型会读取的第三方内容（文档、网页、工具返回值）里，攻击者无需与用户对话；区别于用户自行越狱。</td></tr>
    <tr><td>过优化</td><td>Overoptimization</td><td>对代理奖励优化过深使真实奖励先升后降；差距随优化强度与 \(n\) 增大，必须用独立评估集监控。</td></tr>
    <tr><td>性能差距恢复率</td><td>Performance gap recovered (PGR)</td><td>\( (S_{w2s} - S_{weak}) / (S_{strong} - S_{weak}) \)；0 表示弱监督没激发新能力，1 表示完全恢复。</td></tr>
    <tr><td>对齐伪装</td><td>Alignment faking</td><td>模型在能推断「正在训练」时假装服从，以保住部署时偏好的行为；Greenblatt 等 2024 在人为设定中观察到。</td></tr>
    <tr><td>模型裁判</td><td>LLM-as-judge</td><td>用另一个模型给输出打分；容易被长度与风格说服而非被正确性说服，需多裁判与人工抽检校准。</td></tr>
    <tr><td>操作化</td><td>Operationalisation</td><td>把模糊概念换成一族可测量指标，并接受指标与目标的差距；代价是结论必须永远带着口径。</td></tr>
    <tr><td>自我报告稳定性</td><td>Self-report stability</td><td>同一问题换措辞、语言与重复采样后答案的一致程度；极差接近 1 说明答案主要由提示措辞决定。</td></tr>
    <tr><td>元表征</td><td>Metarepresentation</td><td>系统对自身内部状态的表征层，是 HOT 的核心指标属性；能「谈论」自身状态不等于拥有它。</td></tr>
    <tr><td>递归处理</td><td>Recurrent processing</td><td>RPT 主张局部循环连接即可产生现象意识；以前馈为主的 Transformer 缺少这一结构。</td></tr>
    <tr><td>道德地位</td><td>Moral status</td><td>一个系统是否值得道德考量；与「是否有意识」相关但不相同，且无法从行为数据直接估计。</td></tr>
    <tr><td>行为等价</td><td>Behavioral equivalence</td><td>两个系统在全部可观察行为上无法区分；它不蕴含体验等价，这正是哲学僵尸论证的要点。</td></tr>
    <tr><td>任务向量</td><td>Task vector</td><td>微调权重与预训练权重之差 \(\tau_t=\theta_t-\theta_{pre}\)，代表权重空间中「朝该任务变好」的方向；可相加或取负，两个 delta 范数差一个数量级时直接相加会被大的淹没。</td></tr>
    <tr><td>模型汤</td><td>Model soup</td><td>对同一预训练权重的多次微调结果取平均 \(\theta=\frac{1}{K}\sum_k\theta_k\)；推理成本与单模型相同，但要求同源且各解落在同一低误差盆地，否则输出会变得混乱。</td></tr>
    <tr><td>TIES 合并</td><td>TIES merging</td><td>合并前先裁剪小幅变化、逐参数做符号选举、只合并符号一致的项；它解决冗余与符号冲突两类干扰，缩放系数 \(\lambda\) 常取 0.3 到 1.0。</td></tr>
    <tr><td>DARE</td><td>Drop And REscale</td><td>以概率 \(p\) 随机丢弃微调增量、再把保留项乘以 \(1/(1-p)\)；期望无偏但方差变大，论文报告 SFT 增量可丢 90% 到 99%。</td></tr>
    <tr><td>直通估计器</td><td>Straight-through estimator</td><td>把取整与钳位的反向传播当作恒等映射 \(\partial\hat{x}/\partial x\approx 1\)；它是 QAT 能训练的唯一机制，前向仍是真量化，所以训练与部署感受到的误差一致。</td></tr>
    <tr><td>分组量化</td><td>Group-wise quantization</td><td>每 \(g\) 个连续权重共享一个缩放因子，常用 \(g=128\)；4-bit 下每权重多出 \(4/g\) 字节开销（约 6%），group 越小开销越大、精度越好。</td></tr>
    <tr><td>2:4 稀疏</td><td>2:4 semi-structured sparsity</td><td>每 4 个连续权重里至少 2 个为零；这是 Ampere 之后 Sparse Tensor Core 直接支持的模式，理论上 2 倍、实测 1.3 到 1.6 倍加速。</td></tr>
    <tr><td>校准集</td><td>Calibration set</td><td>PTQ 用来估计每层或每组缩放因子与零点的少量无标签数据（几百到几千条）；换一份校准集，会让同一份 4-bit 权重的困惑度出现可观测的变化。</td></tr>
    <tr><td>选择性扫描</td><td>Selective scan</td><td>让 \(B\)、\(C\)、\(\Delta\) 依赖输入之后卷积核不再固定、FFT 技巧失效；只能在片上 SRAM 做并行前缀扫描，这是 Mamba 把线性复杂度变成实测吞吐的关键。</td></tr>
    <tr><td>混合架构</td><td>Hybrid architecture</td><td>多数层用 SSM 或滑窗做累积、每隔几层插一个全局注意力层做精确检索；全局层占比是要自己扫的超参，太少索引能力弱、太多成本又回来。</td></tr>
    <tr><td>解耦 RoPE</td><td>Decoupled RoPE</td><td>MLA 把 K 拆成低秩部分与单独缓存的旋转位置部分（每 token 约 64 维、所有头共享）；因为旋转项无法被低秩投影吸收，只能额外缓存一份。</td></tr>
    <tr><td>视觉指令微调</td><td>Visual instruction tuning</td><td>用合成多模态指令数据端到端训练投影层与语言模型；只冻结编码器做投影对齐产出的只是翻译器，这一步才产出真正的助手。</td></tr>
    <tr><td>反转诅咒</td><td>Reversal curse</td><td>模型学会了「A 在 B 之前」却答不出「B 在 A 之后」；自回归的因果掩码使它无法回看，不绑定生成顺序的扩散式训练可以缓解。</td></tr>
    <tr><td>对比温度</td><td>Contrastive temperature</td><td>InfoNCE 中的 \(\tau\)，把相似度差放大 \(1/\tau\) 倍；\(\tau\) 越小分布越尖、梯度越集中在最难的负样本上，CLIP 这一族常用 0.01 到 0.07。</td></tr>
    <tr><td>固定容量状态</td><td>Fixed-size state</td><td>SSM 与线性注意力的隐状态 \(h\in\mathbb{R}^{N}\) 与序列长度无关；它擅长累积型信息，按内容做精确回忆必然有损，这是容量约束的必然结果。</td></tr>
    <tr><td>跨界微调</td><td>Cross-domain fine-tuning</td><td>同一模型同时学通用对话与音频参数回归，音频与对话样本按 7 比 3 混合，配比失衡会导致只会输出数字或指令遗忘。</td></tr>
    <tr><td>合成管道</td><td>Synthetic feature pipeline</td><td>用经验规则加高斯噪声批量生成双音轨特征到过渡参数标签的映射，标签形如 \(T \in [2.0, 16.0]\)，用于跑通训练代码。</td></tr>
    <tr><td>调性距离</td><td>Tonal distance</td><td>两个音轨 12 维音级向量的欧氏距离 \(d = \sqrt{\sum (c_1-c_2)^{2}}\)，常取 0 到 3，超过 1.0 时应选用平滑指数过渡。</td></tr>
    <tr><td>Tonnetz 距离</td><td>Tonnetz Euclidean distance</td><td>6 维和声音程网格空间五度与三度坐标的欧氏距离 \(\Vert \mathbf{t}_A - \mathbf{t}_B \Vert_2\)，比色度图更准确刻画和声转调阻抗。</td></tr>
    <tr><td>LUFS 响度差</td><td>LUFS difference</td><td>两首曲目感知整合响度绝对差值 \(\lvert \Delta \text{LUFS} \rvert\)，单位分贝，超过 3 dB 时需要动态施加响度补偿与非对称增益曲线。</td></tr>
    <tr><td>回归头</td><td>Regression head</td><td>挂在隐藏状态 \(h \in \mathbb{R}^{d}\) 后的线性映射层 \(W \in \mathbb{R}^{1 \times d}\)，直接输出标量时长并用均方误差反向传播梯度。</td></tr>
    <tr><td>联合损失</td><td>Joint multi-task loss</td><td>\(\mathcal{L}_{total} = \mathcal{L}_{LM} + \lambda \mathcal{L}_{cfx}\)，复合交叉熵与回归的损失，\(\lambda\) 过大导致对话坍塌，过小导致音频参数漂移。</td></tr>
    <tr><td>损失权重</td><td>Loss weight</td><td>联合损失中回归项的调节系数 \(\lambda\)，初始推荐 0.5；验证集困惑度上升超 5% 时须回调至 0.3 并增补对话数据。</td></tr>
    <tr><td>混合比例</td><td>Instruction mixing ratio</td><td>通用对话样本占总训练样本的比例，1.5B 跨界模型常用 0.2 到 0.4，低于 0.1 则引发灾难性遗忘与泛化退化。</td></tr>
    <tr><td>适配合并</td><td>Adapter merging</td><td>把 LoRA 低秩矩阵按 \(W = W_{0} + \frac{\alpha}{r} B A\) 加回原始基座全精度权重，推理消除额外旁路分支开销。</td></tr>
    <tr><td>模型导出</td><td>Model export</td><td>将合并后的 PyTorch 模型转换为 GGUF 或 ONNX 格式，Q4 量化后体积约 1 GB，在普通 CPU 上延迟约百毫秒。</td></tr>
    <tr><td>4D 框架</td><td>AI Fluency 4D framework</td><td>把一次人机协作拆成委派、描述、辨识、尽责四个关口；缺任一维的典型症状是流程很顺但没人对结果负责。</td></tr>
    <tr><td>委派</td><td>Delegation</td><td>动手前先划边界：判据、抽样、最终签字不交给模型；委派过度的失败模式是把「决定」也一起交出去。</td></tr>
    <tr><td>描述</td><td>Description</td><td>把需求写到可验收：给输入、输出格式、判据与反例；描述不足的症状是答案看起来对却无法判定对不对。</td></tr>
    <tr><td>辨识</td><td>Discernment</td><td>用可复核的方法验收输出：基线、分组切分、噪声下限、置换检验；失败模式是把流畅当成正确。</td></tr>
    <tr><td>尽责</td><td>Diligence</td><td>明确谁签字、留什么记录：每条结论附日期、命令与数字；没有签字人的协作出事后既无法追责也无法复现。</td></tr>
    <tr><td>AI 素养</td><td>AI Fluency</td><td>与模型协作的可迁移能力：会划边界、会描述、会验收、会负责；它不随某家产品的界面改版而失效。</td></tr>
    <tr><td>厂商锁定</td><td>Vendor lock-in</td><td>产出依赖某家专有接口或界面，迁移成本高；检测办法是换一个模型把同一任务再做一次并记录迁移率。</td></tr>
    <tr><td>迁移率</td><td>Transfer rate</td><td>换到第二个模型或开放权重实现后，同一需求原样通过验收的任务比例；低于 0.6 说明需求绑定了原模型。</td></tr>
  </tbody>
</table>

<h3>16. 最容易混淆的 8 组概念</h3>
<table class="tbl small">
  <thead><tr><th>易混的一对</th><th>前者是什么</th><th>后者是什么</th><th>判别要点</th></tr></thead>
  <tbody>
    <tr><td>微调 与 预训练</td><td>在已有权重上用少量标注数据改变行为与格式</td><td>从随机初始化起用海量无标注语料学习通用表示</td><td>问「知识从哪来」：预训练决定知识上限，微调只决定怎么用；微调学习率通常低一到三个数量级。</td></tr>
    <tr><td>DPO 与 PPO</td><td>离线、用偏好对直接优化，无需奖励模型与采样</td><td>在线、用奖励模型加价值网络做策略梯度</td><td>问「有没有在线采样与环境交互」：DPO 便宜稳定但受数据限制，PPO 上限高但组件多、难调。</td></tr>
    <tr><td>张量并行 与 流水线并行</td><td>切开单个矩阵或注意力头，每层都通信</td><td>按层切成若干段，micro-batch 流水通过</td><td>问「切的是什么」：TP 切算子内部、通信频繁，PP 切层间、通信少但有气泡。</td></tr>
    <tr><td>困惑度 与 准确率</td><td>交叉熵取指数，衡量概率分配的优劣，依赖 tokenizer</td><td>离散判定对错的比例，依赖解码与答案解析规则</td><td>困惑度可微、可跨数据集粗比；准确率跨模型比较更直观但会被格式与采样策略左右，两者不能互相替代。</td></tr>
    <tr><td>吞吐 与 延迟</td><td>单位时间完成的总 token 数，靠批处理提升</td><td>单请求耗时（首 token 时间与每 token 时间）</td><td>问「同时服务多少人」：加大批提升吞吐却抬高单请求延迟，必须按 SLA 决定取舍。</td></tr>
    <tr><td>LoRA 的 rank 与 学习率</td><td>低秩矩阵的秩，决定可训练参数量与容量</td><td>每次更新沿梯度走多远，决定收敛速度与稳定性</td><td>rank 是「有多少自由度」，学习率是「怎么走」；损失不降时先升 rank 还是先调学习率，取决于欠拟合还是发散。</td></tr>
    <tr><td>即时重置 与 银行重置</td><td>到点未用即清零，额度不累积</td><td>未用额度可存储并在之后集中使用</td><td>问「不用会怎样」：前者迫使任务分散排期，后者允许攒起来跑大任务。</td></tr>
    <tr><td>住宅 IP 与 数据中心 IP</td><td>ISP 分配给家庭宽带，风控默认视为真实用户</td><td>云厂商机房网段，ASN 与反向 DNS 可被批量识别</td><td>风控看的是整体一致性（ASN、时延、TLS、账号历史），单独换 IP 而不改其他特征几乎无效。</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与其它附录的分工</h4>
  <p>
    本表负责「这个词是什么意思」；实验步骤与可运行代码在附录 B，论文、课程与工具的清单在附录 C，
    条款、许可与学术规范的边界在附录 D，模拟试题与答案在附录 E。某条解释里如果出现了本表没收录的术语，
    先按它属于哪一类（概率、架构、系统、对齐、推理、评估、算力、经济、网络、工作流、硬件、合规）定位，再回对应正文模块查。
  </p>
</section>

  `
});
