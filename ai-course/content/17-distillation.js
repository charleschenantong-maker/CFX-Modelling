/* content/17-distillation.js — 模块 17：蒸馏全谱系 */
COURSE.register({
  id: "m17",
  part: 4,
  num: "17",
  title: "蒸馏全谱系：把大模型的能力搬进小模型",
  en: "Distillation — From Logits to Reasoning",
  minutes: 55,
  tags: ["高阶", "训练", "实用"],
  body: String.raw`
<p class="lead">
  你已经会微调、会对齐、会量化。但还有一个更根本的问题：
  <strong>能不能让一个小模型学会大模型的行为？</strong>
  这一讲把「蒸馏」拆成四条可分别实现的路线，给出数学形式、手算例子、实用配方，
  以及一条很多人忽略的红线——<em>用谁的数据蒸馏，可能违反谁的服务条款</em>。
</p>

<h3>0. 先回答一个工程问题：为什么要蒸馏</h3>
<p>
  蒸馏不是为了让公式更漂亮，而是为了把<strong>一个太慢、太贵或不能放进产品的教师模型</strong>变成一个更小的学生模型。
  先确认瓶颈是延迟、显存、隐私还是离线部署；如果只是想让答案更好，先改数据和评估集，蒸馏通常不是第一步。
</p>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>先看输出，再看 logits</h4>
  <p>
    教师模型给出的不只是“正确答案”，还包含候选答案之间的相对偏好。正文先用三条同一问题的输出比较这种信息；后面的温度、KL 和 logits 推导只是解释“学生怎样保留这些偏好”。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：课堂上老师不只告诉你「答案是 B」，还会说「A 是最接近的干扰项，C 完全无关」——
    后面这句话信息量很大。<strong>蒸馏就是让学生模型去学老师的那份「完整判断」，而不只是最终答案。</strong><br />
    <strong>这一讲要建立的直觉</strong>：蒸馏 = 用教师的输出当标签做监督学习 + 一点特殊的损失设计；
    它压的是<em>模型规模</em>，和量化（压精度）、剪枝（压结构）是三件不同的事。<br />
    <strong>读完你能回答</strong>：软标签为什么比硬标签信息更多？什么时候蒸馏会失败？为什么教师不是越大越好？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你训练（或微调）了一个不错的大模型，但部署环境只有 8 GB 显存，而且推理成本要压到 1/10。
    你有三条路：<strong>量化</strong>（把权重压成 4-bit）、<strong>剪枝</strong>（删掉一部分结构）、
    <strong>蒸馏</strong>（训练一个小模型去模仿大模型）。
  </p>
  <p>
    前两条在模块 08 和 23 讲；这一讲讲第三条。
    关键区别在于：<em>量化和剪枝不改模型「学到的东西」，蒸馏是在训练一个新模型</em>——
    所以它能跨越架构、跨越规模，甚至能跨越模态，但代价是你得重新训练一遍。
  </p>
</section>

<h3>1. 核心洞察：软标签携带「暗知识」</h3>
<p>
  假设有三个类别，地面真值是第 1 类。硬标签长这样：\([1, 0, 0]\)。
  但一个训练良好的教师模型给出的分布可能是 \( [0.82, 0.11, 0.07] \)——
  它在告诉你：<strong>第 2 类和第 3 类并不是同等无关，第 2 类更接近。</strong>
</p>
<p>Hinton 等人在 2015 年的《Distilling the Knowledge in a Neural Network》里把这件事称为「暗知识」：
  教师学到的类间相似性结构，在硬标签里完全丢失，但在概率分布里被保留下来。</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>温度与蒸馏损失</h4>
  <p>先用温度 \(T\) 把教师的分布「软化」（\(T>1\) 让分布更平坦，暗知识更容易被看到）：</p>
  \[ p_i^{(T)} = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)} \]
  <p>然后让学生同时学习教师的软分布与真实硬标签：</p>
  \[ \mathcal{L}_{\text{KD}} = \alpha\,\mathrm{CE}\big(y,\; p_S\big) \;+\; (1-\alpha)\, T^2\, D_{\mathrm{KL}}\big(p_T^{(T)} \,\|\, p_S^{(T)}\big) \]
  <p>
    三件事需要解释：<strong>(1)</strong> \(T^2\) 是梯度尺度补偿——温度缩放会让 softmax 的梯度按 \(1/T^2\) 缩小，
    乘回去才能让两项量级相当；<strong>(2)</strong> \(\alpha\) 在「学真值」与「学教师」之间权衡，
    常取 0.1–0.5；<strong>(3)</strong> 当 \(T=1\) 时它就退化成普通的分布匹配。
  </p>
</section>

<h4>1.1 手算：软标签到底多带了多少信息</h4>
<p>设教师对某个样本输出 logits \(z = [3.0,\ 1.0,\ 0.5]\)，看两种温度：</p>
<table class="tbl small">
  <thead><tr><th>温度</th><th>计算</th><th>得到的分布</th><th>对比硬标签</th></tr></thead>
  <tbody>
    <tr><td>\(T = 1\)</td><td>\(e^{3}, e^{1}, e^{0.5} = 20.09,\ 2.72,\ 1.65\)，和 24.45</td><td>[0.822, 0.111, 0.067]</td><td>已经比 [1,0,0] 多出「第 2 类比第 3 类更接近」</td></tr>
    <tr><td>\(T = 4\)</td><td>\(z/4 = [0.75, 0.25, 0.125]\)，\(e\) 后为 2.117, 1.284, 1.133，和 4.534</td><td>[0.467, 0.283, 0.250]</td><td>暗知识被放大：三类都拿到可观的概率质量</td></tr>
  </tbody>
</table>
<p>
  注意 \(T\) 不是越大越好：\(T \to \infty\) 时分布趋于均匀，学生只能学到「什么都不确定」。
  实践中 \(T = 2\text{–}10\)，需要在小验证集上试。
</p>

<div class="acc" data-t="深入：高温极限为什么变成 logits MSE（完整推导 + 数字演示）" data-badge="进阶">
  <div class="acc-body">
    <p>
      <strong>以 crossfade 这类任务为例：这个推导现在用不上——但学完你就知道以后调参该信哪条经验。</strong>
      能带走的只有两句：温度把梯度按 \(1/T^2\) 压小，所以损失里要乘回 \(T^2\)；
      \(T\) 太大时软标签趋于均匀，暗知识被洗掉。如果你只做响应蒸馏（调接口生成数据），
      记住 \(T = 2\)–\(10\) 起步、拿验证集选，下面 20 行数学可以直接跳过。
      部署视角：高温蒸馏不改变上线后的权重 GB、解码 tok/s 与单次查询成本——
      它只改变学生训练时每个 token 携带的信息量；\(T\) 选错的代价是多训一轮，而不是线上变慢。
      什么时候不值：当你连 5 个百分点的差异都测不出来时（第 8 节），任何温度都救不了评估。
    </p>
<section class="blk blk-m">
  <h4><span class="ic">✎</span>草稿纸演算：高温极限为什么变成 Logits MSE</h4>
  <p><strong>先定符号：</strong>知识蒸馏是让学生模型 (S) 学习教师模型 (T) 的输出分布；教师与学生 logits 为 (z^T,z^S)，类别数为 (K)。温度 Softmax 为</p>
  \[ p_i(z;\tau)=\frac{\exp(z_i/\tau)}{\sum_{j=1}^{K}\exp(z_j/\tau)} \]
  <p>令 \(\bar z=K^{-1}\sum_j z_j\)，并写 \(\epsilon=1/\tau\)。泰勒草稿：</p>
  \[ \exp(\epsilon z_i)=1+\epsilon z_i+O(\epsilon^2),\qquad \sum_j\exp(\epsilon z_j)=K+\epsilon K\bar z+O(\epsilon^2) \]
  \[ p_i(z;\tau)=\frac{1}{K}+\frac{\epsilon}{K}(z_i-\bar z)+O(\epsilon^2) \]
  <p>把两组概率代入 KL，并用 \(\log(1+x)=x-x^2/2+O(x^3)\)，一阶项相消：</p>
  \[ D_{\mathrm{KL}}(p^T\|p^S)\approx\frac{1}{2K\tau^2}\sum_{i=1}^{K}\left[(z_i^T-\bar z^T)-(z_i^S-\bar z^S)\right]^2 \]
  \[ D_{\mathrm{KL}}(p^T\|p^S)\approx\frac{1}{2\tau^2}\operatorname{MSE}(z^T-\bar z^T,z^S-\bar z^S) \]
  <p>所以 \(\tau\to\infty\) 时，软目标损失主项是中心化 logits 的 MSE 乘 \(1/(2\tau^2)\)，其学生侧梯度为</p>
  \[ \nabla_{z^S}D_{\mathrm{KL}}\approx\frac{z^S-\bar z^S-z^T+\bar z^T}{K\tau^2} \]
  <p>这就是损失中乘 \(\tau^2\) 的尺度补偿理由。</p>
  <h5>三类小数字：温度如何平滑概率</h5>
  <p>取 logits \(z=[2,1,0]\)：</p>
  <ol>
    <li>\(\tau=1\)：\(e^z=[7.389,2.718,1]\)，和为 \(11.107\)，故 \(p\approx[0.665,0.245,0.090]\)。</li>
    <li>\(\tau=2\)：\(z/2=[1,0.5,0]\)，\(e^{z/2}=[2.718,1.649,1]\)，和为 \(5.367\)，故 \(p\approx[0.506,0.307,0.186]\)。</li>
    <li>\(\tau\to\infty\)：\(e^{z_i/\tau}\to1\)，三类概率都趋近 \(1/3\)。</li>
  </ol>
</section>
  </div>
</div>

<h3>2. 语言模型上的四条路线</h3>
<table class="tbl">
  <thead><tr><th>路线</th><th>学生看到什么</th><th>需要白盒教师？</th><th>典型场景</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>响应蒸馏</strong><br />（sequence-level KD）</td>
      <td>只有教师的<em>输出文本</em></td>
      <td>不需要</td>
      <td>用商业 API 的输出做数据集；开源界最常见</td>
    </tr>
    <tr>
      <td><strong>词级 / logit 蒸馏</strong></td>
      <td>教师每个位置的完整分布（词表维度）</td>
      <td>需要（同 tokenizer 更省事）</td>
      <td>有教师权重时效果最好；<strong>但词表必须对齐</strong></td>
    </tr>
    <tr>
      <td><strong>特征 / 中间层蒸馏</strong></td>
      <td>教师隐藏状态或注意力矩阵</td>
      <td>需要</td>
      <td>同架构蒸馏（小 BERT ← 大 BERT 式）</td>
    </tr>
    <tr>
      <td><strong>在线 / 策略蒸馏</strong></td>
      <td>学生<em>自己生成</em>的回答 + 教师的即时纠正</td>
      <td>需要（或需要一个能打分的教师）</td>
      <td>解决「学生从没走过教师的路」的分布错配问题</td>
    </tr>
  </tbody>
</table>
<dl class="kv">
  <dt>响应蒸馏</dt><dd>本质上是「用教师生成的数据做 SFT」。它的上限受限于<em>数据质量与多样性</em>，而不是损失函数。</dd>
  <dt>词级蒸馏</dt><dd>信息量最大，但要求教师与学生共享词表。跨家族蒸馏通常要先对齐词表或退化为响应蒸馏。</dd>
  <dt>在线蒸馏</dt><dd>关键论文是 GKD（On-Policy Distillation of Language Models, ICLR 2024，arXiv:2306.13649）：
    让学生自己采样，再由教师对这些<em>学生自己的</em>输出打分纠正。它同时缓解了 exposure bias 与训练/推理分布不一致。</dd>
</dl>

<h3>3. 什么时候蒸馏有效，什么时候白费</h3>
<table class="tbl small">
  <thead><tr><th>因素</th><th>有利</th><th>不利</th></tr></thead>
  <tbody>
    <tr><td>容量差距</td><td>学生规模在教师的一个合理比例内</td><td>学生太小 → 「装不下」教师的行为，只能学个大概</td></tr>
    <tr><td>教师质量</td><td>教师在该任务上显著强于学生的可学上限</td><td>教师过强但风格差异大 → 学生学不到，或学到一堆无用的风格</td></tr>
    <tr><td>数据多样性</td><td>覆盖任务分布，含边缘情况</td><td>只用少数提示生成 → 学生只会回答那几种问法</td></tr>
    <tr><td>标签噪声</td><td>教师输出经过过滤与去重</td><td>教师答错的部分被当成正确答案学进去（错误放大）</td></tr>
    <tr><td>词表一致性</td><td>同家族（共享 tokenizer）</td><td>跨家族 → 词级蒸馏不可用，只能做响应蒸馏</td></tr>
  </tbody>
</table>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>三种常见失败</h4>
  <ol>
    <li><strong>模式坍缩</strong>：学生只模仿教师最擅长的那些问法，遇到新问法时输出变单调。
        对策：在数据里混入学生自己采样并被打分筛过的样本（在线蒸馏）。</li>
    <li><strong>长度漂移</strong>：教师爱写长回答，学生学会了「写得越长越好」。对策：长度归一化，或在损失里对长度做惩罚。</li>
    <li><strong>错误继承</strong>：教师在某类问题上系统性错误，学生会把它<em>学得更牢</em>（因为教师分布很自信）。
        对策：用规则验证器过滤，或在损失里对低置信度样本降权。</li>
  </ol>
</section>

<h3>4. 与量化、剪枝的分工</h3>
<table class="tbl small">
  <thead><tr><th>手段</th><th>压的是什么</th><th>要不要重训</th><th>主要代价</th></tr></thead>
  <tbody>
    <tr><td>量化（模块 08）</td><td>数值精度（每参数字节）</td><td>通常不用</td><td>精度损失，需要校准数据</td></tr>
    <tr><td>剪枝 / 稀疏（模块 23）</td><td>结构（参数个数、激活通道）</td><td>一般要微调恢复</td><td>通用硬件上未必真的加速</td></tr>
    <tr><td><strong>蒸馏（本讲）</strong></td><td>模型规模与架构</td><td><strong>要，且要重新训练</strong></td><td>工程成本高；需要数据生成预算</td></tr>
  </tbody>
</table>
<p>三者可以叠加：<strong>先用教师生成数据蒸馏出一个 1B 学生 → 再做 QLoRA 微调 → 最后 4-bit 量化部署</strong>。
这是目前把「大模型能力」放进消费级硬件最常见的三级流水线。</p>

<h3>5. 实用配方</h3>
<ol>
  <li><strong>先定目标</strong>：是要「同样能力更小体积」，还是「同一体积更强」？前者蒸馏，后者继续预训练或换更好的基座。</li>
  <li><strong>生成数据</strong>：教师对任务分布采样，规模从几千条起步；每条记录保留教师答案与（若可得）置信度。
      去重 + 规则过滤（格式、长度、明显错误）。</li>
  <li><strong>选损失</strong>：能拿到 logits 就做词级 KL（\(T=2\text{–}4\)，\(\alpha \approx 0.3\)）；
      拿不到就做响应蒸馏，此时你其实是在做 SFT，关键变成数据质量。</li>
  <li><strong>训练</strong>：同家族学生初始化最省；全参或 LoRA 都可；学习率比常规 SFT 略低（因为软标签信号更密）。</li>
  <li><strong>评估三件事</strong>：①与教师比 pass@1（差距有多大）；②与学生自己「只用硬标签 SFT」比（蒸馏是否真的加了价值）；
      ③成本曲线（每百万 token 的费用与延迟）。<em>第二项最容易被跳过，但它才是「蒸馏有没有用」的唯一证据。</em></li>
</ol>

<h3>6. 数据工厂：一场蒸馏要生成多少条、怎么过滤</h3>
<p>
  先记住一句话：<strong>蒸馏的上限由数据决定，不由损失函数决定。</strong>
  损失函数只决定你能多接近教师；数据决定教师教了什么、以及教师教错的东西有没有被拦住。
  第一次做蒸馏失败的人，多数不是把 \(T^2\) 写错了，而是数据集里八成样本在问同一件事、
  答案长度整齐得像模板、还混着教师几类系统性错误。
</p>
<p>这一节把「要生成多少条」变成一个能手算出来的数，再给出这笔数据的时间账。</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>可用样本量的一行公式</h4>
  <p>
    设提示数为 \(P\)、每题采样 \(k\) 条、去重保留率 \(\rho_{\text{dedup}}\)、
    规则过滤保留率 \(\rho_{\text{filter}}\)，则最终可训练样本量是
  </p>
  \[ N = P \times k \times \rho_{\text{dedup}} \times \rho_{\text{filter}} \]
  <p>
    四个因子的分工完全不同：\(P\) 决定<em>问法的多样性</em>，\(k\) 决定<em>同一问法下答案的多样性</em>，
    两个 \(\rho\) 决定你的清洗有多狠。<strong>只提高 \(k\) 而不提高 \(P\)，学生会背下问法而不是学会能力</strong>——
    这是合成数据最常见、也最难察觉的过拟合。
  </p>
</section>

<h4>6.1 手算一：一份 4,896 条的蒸馏集是怎么来的</h4>
<p>
  设定：\(P = 2000\) 条不同提示，每题采样 \(k = 4\) 条；去重规则是「4-gram 的 Jaccard 相似度超过 0.85 判为重复」；
  长度过滤只保留 8–512 个 token 的答案。
</p>
<ol>
  <li>原始生成量：\(2000 \times 4 = 8000\) 条。</li>
  <li>去重后：实测去重保留率 \(\rho_{\text{dedup}} = 0.72\)，于是 \(8000 \times 0.72 = 5760\) 条。
      这个数低于 0.8 就说明你的提示太像——正确反应是加 \(P\)，不是加 \(k\)。</li>
  <li>规则过滤后：长度与格式过滤保留率 \(\rho_{\text{filter}} = 0.85\)，于是 \(5760 \times 0.85 = 4896\) 条。</li>
  <li>训练步数：跑 2 个 epoch 就是 \(4896 \times 2 = 9792\) 个样本通过；全局 batch 取 32 时，
      总步数 \(9792 / 32 \approx 306\) 步。这就是一次正经蒸馏的全部训练量。</li>
</ol>
<p>
  所以「一场蒸馏」的合理起点量级是<strong>几千条数据、几百步训练</strong>。
  一上手就要 10 万条的方案，通常是因为手里没有评估集，只能靠堆数据来获得「感觉变好了」。
</p>

<h4>6.2 手算二：生成这批数据要花多久</h4>
<p>按平均每条答案 350 个输出 token、每个提示 120 个输入 token 计算：</p>
<table class="tbl small">
  <thead><tr><th>量</th><th>计算</th><th>结果</th></tr></thead>
  <tbody>
    <tr><td>输出 token 总量</td><td>\(4896 \times 350\)</td><td>1,713,600 token（约 1.71 M）</td></tr>
    <tr><td>输入 token 总量</td><td>\(4896 \times 120\)</td><td>587,520 token（约 0.59 M）</td></tr>
    <tr><td>输入占总 token 的比例</td><td>\(0.59 / (0.59 + 1.71)\)</td><td>约 26%，提示不短时输入侧不能忽略</td></tr>
  </tbody>
</table>
<p>同样的 1.71 M 输出 token，换成三种服务方式，墙钟时间差了一个数量级：</p>
<table class="tbl small">
  <thead><tr><th>教师服务方式</th><th>聚合吞吐</th><th>墙钟时间</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>逐条串行调用</td><td>45 token/s</td><td>1,713,600 / 45 ≈ 38,080 s ≈ <strong>10.6 小时</strong></td><td>最容易被低估，一整天没了</td></tr>
    <tr><td>本地批量推理（连续批处理）</td><td>800 token/s</td><td>1,713,600 / 800 ≈ 2,142 s ≈ <strong>36 分钟</strong></td><td>同一张卡，批处理把它压进一小时</td></tr>
    <tr><td>换更小更快的教师</td><td>2,500 token/s</td><td>1,713,600 / 2,500 ≈ 685 s ≈ <strong>11 分钟</strong></td><td>教师质量与吞吐必须一起权衡</td></tr>
  </tbody>
</table>
<p>
  <strong>结论：教师选型的第一约束不是「谁更聪明」，而是「能不能批量」。</strong>
  只要你打算自己生成几万条数据，串行调用的方案在时间上就不可行；
  反过来，如果手上的接口不支持批量，你的数据规模上限就被墙钟时间锁死了——
  这时应该把 \(P\) 降下来、把评估集建扎实，而不是硬凑数量。
</p>

<h4>6.3 数据规模经验表（起点假设，不是定律）</h4>
<p>
  下表是社区实践中常见的起步量级（起点假设，不是定律；accessed 2026-10-06）。
  正确用法是<em>先按它起步，再用自己的验证集做一次小规模扫描</em>
  确认够不够；不要当定律，也不要因为它精确到千位就以为它有理论保证。
</p>
<table class="tbl small">
  <thead><tr><th>任务形态</th><th>可训练样本量起点</th><th>提示数 × 每题采样</th><th>最该担心的失败</th></tr></thead>
  <tbody>
    <tr><td>格式转换 / 信息抽取（答案 &lt; 64 token）</td><td>2k–5k</td><td>\(P = 1000\)，\(k = 4\)</td><td>模板重复，学生只认一种问法</td></tr>
    <tr><td>单轮问答 / 判断式任务</td><td>5k–20k</td><td>\(P = 2000\)–\(5000\)，\(k = 4\)–\(8\)</td><td>长度漂移，答案越来越长</td></tr>
    <tr><td>长文生成（单条 &gt; 500 token）</td><td>10k 以上</td><td>\(P = 3000\)，\(k = 8\)</td><td>教师错误被整段学走，肉眼很难发现</td></tr>
    <tr><td>多步推理 / 答案可验证</td><td>20k–100k 以上</td><td>\(P = 5000\)，\(k = 16\)</td><td>错误继承，必须配规则验证器</td></tr>
    <tr><td>风格 / 语气迁移</td><td>1k–3k</td><td>\(P = 500\)，\(k = 2\)</td><td>只学到表面格式，能力没有迁移</td></tr>
  </tbody>
</table>

<h4>6.4 数据失败模式查表：症状 → 原因 → 一行验证 → 对策</h4>
<table class="tbl small">
  <thead><tr><th>症状</th><th>可能原因</th><th>一行验证</th><th>对策</th></tr></thead>
  <tbody>
    <tr>
      <td>训练 loss 平稳下降，验证集生成质量没变</td>
      <td>学生只学到教师的表面统计（长度、模板、标点）</td>
      <td>对比训练前后同一批提示的输出长度分布与重复率</td>
      <td>长度归一化；数据里混入短答案正例</td>
    </tr>
    <tr>
      <td>蒸馏后输出多样性明显下降，同一提示 8 次几乎一样</td>
      <td>模式坍缩；采样温度太低，或每题采样数 \(k\) 太小</td>
      <td>数同一提示 8 次采样的去重答案个数</td>
      <td>提高采样温度；按第 3 节加入在线蒸馏样本</td>
    </tr>
    <tr>
      <td>KL 项降不下去，卡在某个值不动</td>
      <td>教师与学生的词表或分词不一致，或温度设置不当</td>
      <td>打印两边 <code>vocab_size</code>，取一个共同句子比对 token id</td>
      <td>退化为响应蒸馏；或先做词表对齐</td>
    </tr>
    <tr>
      <td>训练出现 NaN，或输出变成乱码</td>
      <td>全词表 logits 用 fp16 存储溢出；padding 位置没有 mask</td>
      <td>统计 logits 里 inf / nan 的个数，检查 loss 是否算在 padding 上</td>
      <td>KL 用 float32 累加；严格 mask 掉 prompt 与 padding 位置</td>
    </tr>
    <tr>
      <td>学生学会了教师的口头禅，每段都以同一句话开头</td>
      <td>教师风格被当成任务学走</td>
      <td>统计高频开头短语在生成结果里的出现率</td>
      <td>提示里要求风格中性，或对开头做风格过滤</td>
    </tr>
  </tbody>
</table>

<h3>7. 词级蒸馏的存储账：为什么你只会存 top-k logits</h3>
<p>
  <strong>词级蒸馏在算力上很便宜，在存储上很贵。</strong>
  教师的那次前向传播你已经付过钱了，但当你决定把「每个位置上的完整分布」留下来当标签时，
  一个 15 万词表的模型对<em>一个 token</em> 就要写 30 万字节。
  这一节把这笔账算清楚，并给出工程上的标准做法：只存 top-k，同时把截断偏差量化出来。
</p>

<h4>7.1 手算三：100 万 token 的数据集有多大</h4>
<p>取词表大小 \(V = 151936\)（15 万量级模型的常见值），数据集共 100 万 token（约 3000 条 350 token 的样本）：</p>
<table class="tbl small">
  <thead><tr><th>步骤</th><th>计算</th><th>结果</th></tr></thead>
  <tbody>
    <tr><td>每 token 的完整分布（fp16）</td><td>\(151936 \times 2\) B</td><td>303,872 B ≈ 297 KiB</td></tr>
    <tr><td>100 万 token 的全词表存储</td><td>\(303872 \times 10^{6}\) B</td><td>\(3.04 \times 10^{11}\) B ≈ <strong>304 GB</strong></td></tr>
    <tr><td>训练时顺序读 2 遍（按 500 MB/s）</td><td>\(304 \times 2 / 0.5\) s</td><td>1,216 s ≈ 20 分钟纯 IO</td></tr>
    <tr><td>改成只存 top-50（int32 下标 + fp16 logit）</td><td>\(50 \times (4 + 2) = 300\) B</td><td>100 万 token 只有 <strong>300 MB</strong></td></tr>
    <tr><td>压缩比</td><td>\(304\ \text{GB} / 300\ \text{MB}\)</td><td><strong>约 1000 倍</strong></td></tr>
  </tbody>
</table>
<p>
  \(297\ \text{KiB}\) 这个数字值得记住：它意味着「一个 token 的教师分布」比「一个 token 的文本」大三个数量级。
  如果数据规模到 1000 万 token，全词表存储就是 3 TB 量级——不是训练算不起，是磁盘放不下、dataloader 读不动。
</p>

<h4>7.2 存法对照表：省多少、丢什么</h4>
<table class="tbl small">
  <thead><tr><th>存法</th><th>每 token 字节</th><th>100 万 token 体积</th><th>丢掉的信息</th></tr></thead>
  <tbody>
    <tr><td>全词表 fp32</td><td>607,744 B（约 594 KiB）</td><td>608 GB</td><td>无</td></tr>
    <tr><td>全词表 fp16</td><td>303,872 B（约 297 KiB）</td><td>304 GB</td><td>无，只有舍入误差</td></tr>
    <tr><td>top-50：int32 下标 + fp16 logit</td><td>\(50 \times 6 = 300\) B</td><td>300 MB</td><td>尾部概率质量，必须监控</td></tr>
    <tr><td>top-8：同格式</td><td>48 B</td><td>48 MB</td><td>尾部更多，温度高时偏差明显</td></tr>
    <tr><td>只存 argmax（硬标签）</td><td>4 B</td><td>4 MB</td><td>全部暗知识，退化为普通 SFT</td></tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>截断偏差：尾部质量 m</h4>
  <p>只存 top-k 再重新归一化，你实际在教一个被截断的分布。偏差的直接度量是<strong>尾部质量</strong>：</p>
  \[ m = 1 - \sum_{i \in \text{top-}k} p_i^{(T)} \]
  <p>
    手算：温度 \(T = 4\)、词表 151,936，某个位置的 top-50 覆盖了 0.974 的概率质量，
    则 \(m = 0.026\)，也就是 2.6% 的概率质量被丢掉并重新分配。
    经验判据：在 100 个位置上算 \(m\) 取中位数，<strong>中位数超过 0.05 就提高 \(k\) 或降低 \(T\)</strong>。
    长尾词表（多语言、代码）的 \(m\) 会明显大于纯英文场景。
  </p>
  <pre><code><span class="cm"># [逐行剖析] 温度对 Softmax 尾部概率质量（暗知识）的释放效应</span>
<span class="cm"># 动态形状: logits -> (B, V) [float32]</span>
p = torch.softmax(logits / T, dim=-1)
<span class="cm"># 截取第 2 到第 10 大候选 token 的概率质量和（表征语义联想丰富度）</span>
m = torch.topk(p, k=10, dim=-1).values[:, 1:].sum(dim=-1)
print("tail mass median =", round(m.median().item(), 4))   <span class="cm"># 动态形状: 标量 [float32]</span></code></pre>
</section>

<h3>8. 怎么证明蒸馏有用：评估协议与最小样本量</h3>
<p>
  第 3 节说过「唯一证据是对照实验」。这里补上两个更硬的约束：<strong>测试集要多大</strong>、
  以及<strong>怎么防止训练数据把测试集污染掉</strong>。没有这两条，你手里的「提升 X%」只是噪声。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>两组对照要多少题</h4>
  <p>把 A/B 两组看成两个独立比例，差值标准误与所需样本量（每组 \(n\) 题）是</p>
  \[ \mathrm{SE}(\hat p_B - \hat p_A) \approx \sqrt{\frac{2\bar p (1-\bar p)}{n}}, \qquad n \approx \frac{16\,\bar p\,(1-\bar p)}{\delta^2} \]
  <p>
    其中 \(\bar p\) 是两组平均正确率，\(\delta\) 是想检测出的差值。
    常数 16 来自「双侧 5% 显著性、80% 把握」的正态近似；要 90% 把握就换成约 21。
  </p>
</section>

<h4>8.1 手算四：200 道题够不够</h4>
<ol>
  <li>设定：硬标签基线 \(\hat p_A = 0.41\)，蒸馏后 \(\hat p_B = 0.46\)，测试集 \(n = 200\) 题。</li>
  <li>差值 \(\delta = 0.05\)，平均正确率 \(\bar p = 0.435\)。</li>
  <li>差值标准误：\(\sqrt{2 \times 0.435 \times 0.565 / 200} = \sqrt{0.002458} \approx 0.0496\)，即约 <strong>4.96 个百分点</strong>。</li>
  <li>观察到的 5 个百分点只相当于 <strong>1.0 个标准误</strong>，双侧 \(p \approx 0.31\)——<strong>不能下结论</strong>。</li>
  <li>要在 80% 把握下检测 5 个百分点：\(n \approx 16 \times 0.2458 / 0.0025 \approx 1573\)，即<strong>每组约 1600 题</strong>。</li>
  <li>反过来看 200 题能查出多大差距：\(\delta \approx \sqrt{16 \times 0.2458 / 200} \approx 0.140\)，也就是<strong>约 14 个百分点以下看不出来</strong>。</li>
  <li>若改成配对设计（同一批题、同一模型，只统计「一个对一个错」的题），所需题数通常能降到几百量级；
      代价是必须固定题目与解码设置，用 McNemar 检验或自助法。做法见 <a href="#m9">模块 09</a>。</li>
</ol>
<p>
  <strong>这条算式的实用价值</strong>：以后有人告诉你「蒸馏提升了 5 个点」，先问一句「测试集多少题」。
  200 题的 5 个点是噪声，1600 题的 5 个点才算证据。
</p>

<h4>8.2 评估协议查表</h4>
<table class="tbl small">
  <thead><tr><th>项目</th><th>最低要求</th><th>不做会怎样</th></tr></thead>
  <tbody>
    <tr><td>测试集规模</td><td>800–1600 题，或采用配对检验</td><td>5 个百分点的差异淹没在噪声里</td></tr>
    <tr><td>对照组</td><td>同数据、同步数、同超参的纯硬标签 SFT</td><td>无法区分「蒸馏有效」与「多训了一遍有效」</td></tr>
    <tr><td>主指标</td><td>pass@1，同时报告平均输出长度</td><td>学生学会「写长」就能刷分</td></tr>
    <tr><td>效率指标</td><td>每条正确回答消耗的 token 数</td><td>用 3 倍成本换 2 个点，报告里看不出来</td></tr>
    <tr><td>多样性指标</td><td>同一提示 8 次采样的去重答案个数</td><td>模式坍缩完全不可见</td></tr>
    <tr><td>教师上界</td><td>教师在同一测试集上的分数</td><td>不知道天花板在哪，也不知道错误继承有多严重</td></tr>
    <tr><td>污染检查</td><td>测试集与训练数据的长 n-gram 重叠率</td><td>涨的是记忆而不是能力，做法见 <a href="#m9">模块 09</a></td></tr>
    <tr><td>成本</td><td>每 1000 次请求的 token 与端到端延迟</td><td>上线后才发现超预算</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>合规红线（做之前必读）</h4>
  <ul>
    <li><strong>用商业模型的输出训练自己的模型，可能违反其服务条款。</strong>
        主流厂商的条款通常禁止「用输出训练竞争模型」或「批量抓取用于蒸馏」，违反可能直接封号。</li>
    <li><strong>开源模型也要看许可证</strong>：有的是 Apache 2.0（宽松），有的是自带使用限制的社区许可（例如对月活规模或用途有条件）。
        蒸馏出的学生模型通常还要遵守教师的许可条款。</li>
    <li><strong>数据来源同样要干净</strong>：教师生成的文本若混入了受版权保护的原文，问题会转到你的学生模型上。</li>
    <li>详见<a href="#appD">附录 D</a>：我们把「可做 / 不可做 / 灰色地带」列成了表。</li>
  </ul>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：给一个 0.5B 教师做一次词级蒸馏</h4>
  <p>在免费 Colab（T4）上可跑。思路：学生也是 0.5B，但只训练 LoRA，让它在<em>教师自己的分布</em>上对齐——
  这样能在 30 分钟内看到 KL 损失下降、且能对比「只用硬标签」的差别。</p>
<pre><code>!pip -q install torch transformers peft datasets

import torch, torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model

<span class="cm"># [逐行剖析] 1. 加载双模型：全量冻结的教师模型 (Teacher) 与轻量学生模型 (Student)</span>
name = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(name)

<span class="cm"># 显存机制: 教师模型进入 eval 模式，所有参数不计算梯度 (requires_grad=False)</span>
teacher = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto").eval()
student = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto")
<span class="cm"># 仅为学生模型注入 LoRA 适配器，冻结基座，大幅削减显存开销</span>
student = get_peft_model(student, LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                          target_modules=["q_proj","k_proj","v_proj","o_proj"], task_type="CAUSAL_LM"))

opt = torch.optim.AdamW(student.parameters(), lr=1e-4)
prompts = ["Explain what a crossfade is in audio.", "Why does a linear fade dip in the middle?",
           "Summarise how attention works.", "What is a KV cache?"] * 32

T, ALPHA = 3.0, 0.3  <span class="cm"># 蒸馏温度 T=3.0, 硬标签损失权重 ALPHA=0.3</span>
for step, p in enumerate(prompts):
    <span class="cm"># 动态形状: batch['input_ids'] -> (B, T) [int64]</span>
    batch = tok(p, return_tensors="pt").to(student.device)
    
    <span class="cm"># [逐行剖析] 2. 教师模型前向传播（阻断 autograd 追踪）</span>
    <span class="cm"># 自动微分: torch.no_grad() 彻底释放中间激活显存</span>
    with torch.no_grad():
        <span class="cm"># 动态形状: t_logits -> (B, T, V) [bfloat16]</span>
        t_logits = teacher(**batch).logits
        
    <span class="cm"># [逐行剖析] 3. 学生模型前向传播（保留计算图）</span>
    <span class="cm"># 动态形状: s_logits -> (B, T, V) [bfloat16]</span>
    s_logits = student(**batch).logits
    
    <span class="cm"># [逐行剖析] 4. 硬标签交叉熵损失（下一 token 自回归真值）</span>
    <span class="cm"># 动态形状: labels -> (B, T-1), s_logits[:, :-1] -> (B*(T-1), V)</span>
    labels = batch.input_ids[:, 1:]
    ce = F.cross_entropy(s_logits[:, :-1].reshape(-1, s_logits.size(-1)), labels.reshape(-1))
    
    <span class="cm"># [逐行剖析] 5. 软标签 KL 散度蒸馏损失（暗知识对齐）</span>
    <span class="cm"># 数学机制: 在高温 T 下对 logits 做 log_softmax，梯度缩放因子为 T^2</span>
    <span class="cm"># 动态形状: log_p_t -> (B, T, V), log_p_s -> (B, T, V)</span>
    log_p_t = F.log_softmax(t_logits.float() / T, dim=-1)
    log_p_s = F.log_softmax(s_logits.float() / T, dim=-1)
    kl = F.kl_div(log_p_s, log_p_t, log_target=True, reduction="batchmean") * (T ** 2)
    
    <span class="cm"># [逐行剖析] 6. 凸组合损失与反向传播</span>
    loss = ALPHA * ce + (1 - ALPHA) * kl
    loss.backward()
    opt.step()
    opt.zero_grad(set_to_none=True)
    if step % 16 == 0:
        print(f"step {step:3d}  ce={ce.item():.3f}  kl={kl.item():.3f}  loss={loss.item():.3f}")</code></pre>
  <p>
    <strong>要记录的三件事</strong>：①<code>kl</code> 是否单调下降（说明学生在逼近教师分布）；
    ②把 <code>ALPHA</code> 设为 1.0（纯硬标签）再跑一遍，对比同样的验证集表现——这就是「蒸馏到底加了多少价值」；
    ③同一个提示下教师与学生的输出差异（肉眼可辨的模板化程度）。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么用在真实项目里</h4>
  <ul>
    <li><strong>你的场景很可能不需要蒸馏。</strong>如果只是想让模型按固定格式输出音频分析结论，SFT + LoRA 就够了（模块 07）。</li>
    <li><strong>适合蒸馏的场景</strong>：你需要一个能在本地/端侧跑的小模型；或者你有一个很强但很贵的教师，想把它的<em>行为</em>固化下来。</li>
    <li><strong>把蒸馏当实验做</strong>：它天然带对照组（硬标签 SFT），非常适合写进研究报告——
        「同样的数据与算力，软标签相对硬标签把验证集指标提升了多少」是一个干净的结论。</li>
    <li><strong>别用它来做回归任务</strong>：crossfade 这类任务是预测一个连续标量，
        教师的「软标签」概念不适用；那里更该关心的是特征质量与评估协议（模块 09）。</li>
  </ul>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：30 分钟最小实现——把教师输出变成可训练数据集</h4>
  <p>
    这个实验<strong>训练那一步可以跳过</strong>也能完成大半：你要亲手把 200 条提示变成一份干净的数据集，
    并打印三个决定成败的数字。全程 CPU，30 分钟内可跑完。
  </p>
  <ol>
    <li><strong>准备 200 条提示（5 分钟）。</strong>写进 <code>prompts.txt</code>，一行一条，覆盖你真实的任务形态；
        不要把 200 条都写成同一个问题的不同措辞。</li>
    <li><strong>每题生成 4 条（10 分钟）。</strong>教师可以是本地小模型，也可以是你能合法调用、条款允许批量生成的接口。
        写出 <code>raw.jsonl</code>，字段为 <code>prompt</code> 与 <code>completion</code>。</li>
    <li><strong>去重 + 过滤（5 分钟）。</strong>跑下面这段脚本，它按 4-gram Jaccard 去重、按长度与复读过滤，
        并打印保留率。</li>
    <li><strong>训练两组（10 分钟，可跳过）。</strong>A 组只用每题第一条（等价硬标签）；B 组用全部过滤后的样本。
        两组用同样的步数与超参。</li>
    <li><strong>评估。</strong>在同一批测试题上比 A/B 的 pass@1，以及平均输出长度。</li>
  </ol>
<pre><code>import json, re

def shingles(s, n=4):
    w = re.findall(r"\w+", s.lower())
    return set(tuple(w[i:i + n]) for i in range(max(1, len(w) - n + 1)))

def jaccard(a, b):
    return len(a &amp; b) / max(1, len(a | b))

rows = [json.loads(l) for l in open("raw.jsonl", encoding="utf-8")]
kept, seen = [], []
for r in rows:
    c = r["completion"].strip()
    ntok = len(c.split())
    if not c or not (8 &lt;= ntok &lt;= 512):            <span class="cm"># 长度过滤：太短或太长都丢</span>
        continue
    if re.search(r"(\b\w+\b)(\s+\1){3,}", c):        <span class="cm"># 复读过滤</span>
        continue
    sh = shingles(c)
    if any(jaccard(sh, s) &gt; 0.85 for s in seen):     <span class="cm"># 近似去重</span>
        continue
    seen.append(sh)
    kept.append(r)

print("raw =", len(rows), " kept =", len(kept), " keep_rate =", round(len(kept) / len(rows), 3))
json.dump(kept, open("clean.json", "w", encoding="utf-8"), ensure_ascii=False)
<span class="cm"># 注意：seen 会随数据量线性变大，整体是 O(n^2) 比较。真实规模请换 MinHash/LSH 或向量去重。</span></code></pre>
  <p><strong>要记录的三个数字：</strong></p>
  <ol>
    <li><strong>保留率 <code>keep_rate</code></strong>：低于 0.5 说明提示太像或过滤太狠，先回头核对 6.1 的去重保留率。</li>
    <li><strong>A/B 的 pass@1 差</strong>：这是「蒸馏有没有用」的唯一证据；差 5 个点以内请按第 8 节先扩测试集。</li>
    <li><strong>每条正确回答的平均 token 数</strong>：如果 B 组更准但长了 2 倍，你的账单会先撑不住。</li>
  </ol>
  <p>
    规模化提示：200 条提示 × 4 条采样刚好是一次可解释的实验。把它放大到 \(P = 2000\) 之前，
    先把上面三个数字量一遍——否则你只是把噪声放大了 10 倍。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>落地决策单：以 crossfade 这类音频建模任务为例，该不该上蒸馏（你以后可以照此判断）</h4>
  <p>
    <strong>一句话结论：对绝大多数 crossfade 音频建模任务，蒸馏不值——先把评估协议和量化做完，回报高得多。</strong>
    理由不是「蒸馏不好」，而是这个项目的输出形态让蒸馏的主要收益（软标签里的类间结构）几乎没有用武之地。
  </p>
  <table class="tbl small">
    <thead><tr><th>你的问题形态</th><th>该用什么</th><th>为什么</th></tr></thead>
    <tbody>
      <tr>
        <td>预测淡入淡出曲线的连续参数（交叉点、时长、增益形状）</td>
        <td>特征工程 + 小回归 / 树模型，见 <a href="#m16">模块 16</a></td>
        <td>输出是连续标量，没有「类间相似性」可学；蒸馏的软标签概念在这里不成立</td>
      </tr>
      <tr>
        <td>把音频分析结论写成自然语言解释</td>
        <td>响应蒸馏：用合成数据做 SFT</td>
        <td>这是蒸馏最成熟的形态；成本几乎全在教师生成上，30 分钟能跑通</td>
      </tr>
      <tr>
        <td>端侧实时判断两段音频能否平滑交叉</td>
        <td>DSP 规则 + 阈值</td>
        <td>实时预算只有几十毫秒，任何 LLM 路线都不合适</td>
      </tr>
      <tr>
        <td>想让小模型复现教师的问答能力与风格</td>
        <td>蒸馏（词级或响应级）</td>
        <td>值，但必须先满足第 8 节的评估条件，否则无法证明有效</td>
      </tr>
    </tbody>
  </table>
  <p><strong>现在就能做的三个动作：</strong></p>
  <ol>
    <li>把验证集建到 800 题以上（或改用配对检验），先能量出 5 个百分点的差异——这是后面所有实验的前提。</li>
    <li>只是想要更小体积？先做 4-bit 量化（<a href="#m8">模块 08</a>），通常够用且不用重训；
        量化解决不了「能力不足」，那时才轮到蒸馏。</li>
    <li>真要蒸馏，就按上面的 30 分钟最小实现走一遍，把 <code>keep_rate</code>、A/B 差、
        每条正确回答的 token 数记下来再决定是否放大。</li>
  </ol>
  <p>
    <strong>什么时候绝对不该用：</strong>当你的测试集还分不清 5 个百分点的差异时。
    此时蒸馏的收益无法被测量，你花的每一小时都在制造「感觉变好了」的报告——
    这正是 <a href="#m9">模块 09</a> 反复强调的：<em>没有评估能力，就没有优化能力</em>。
  </p>
</section>

<h3>9. 本讲术语</h3>
<ul>
  <li><span class="t" data-tterm="Knowledge distillation" data-d="让学生模型的输出分布去逼近教师模型，而不只学硬标签。">知识蒸馏</span>、
      <span class="t" data-tterm="Soft targets" data-d="教师模型给出的完整概率分布，包含类间相似性（暗知识）。">软标签</span>。</li>
  <li><span class="t" data-tterm="Sequence-level KD" data-d="只用教师的输出文本当训练数据，属于黑盒蒸馏。">序列级蒸馏</span>、
      <span class="t" data-tterm="On-policy distillation" data-d="让学生自己生成、教师来纠正，缓解训练与推理分布不一致。">在线蒸馏</span>。</li>
  <li><span class="t" data-tterm="Capacity gap" data-d="教师与学生容量差距过大时，学生无法有效模仿。">容量差距</span>、
      <span class="t" data-tterm="Mode collapse" data-d="学生只学会教师的一部分行为，输出多样性显著下降。">模式坍缩</span>。</li>
</ul>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">蒸馏损失里为什么要乘一个 \(T^2\)？</p>
  <ul class="opts">
    <li>为了放大损失，让训练更快</li>
    <li data-ok>因为温度缩放会把 softmax 的梯度按 \(1/T^2\) 缩小，乘回来才能让软标签项与硬标签项的量级相当</li>
    <li>为了让分布更均匀</li>
    <li>这是一个经验技巧，没有理论理由</li>
  </ul>
  <p class="why">
    求导可以验证：\(\partial p_i^{(T)}/\partial z_j\) 含有 \(1/T\) 因子，KL 项对 logits 的梯度整体按 \(1/T^2\) 缩放。
    不补偿的话，温度越高，软标签项在总梯度里的权重越小，\(\alpha\) 的语义就变了。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">你要把 A 家族的模型（词表 15 万）蒸馏到 B 家族的模型（词表 5 万）。最现实的做法是？</p>
  <ul class="opts">
    <li>直接把两个词表的 logits 对齐做 KL</li>
    <li data-ok>退化为响应蒸馏：用教师的输出文本做监督微调（词级 KL 要求词表一致）</li>
    <li>把学生词表改成教师的词表再训练</li>
    <li>不可能蒸馏，只能重新预训练</li>
  </ul>
  <p class="why">
    词级蒸馏要求每个位置的两个分布定义在同一词表上。跨家族时通常只有文本可用，于是问题回到「合成数据质量」，
    本质是 SFT。硬改学生词表会让它的 embedding 失效，等于放弃学生的预训练成果。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">下面哪一项是判断「蒸馏是否真的有用」最关键的对照实验？</p>
  <ul class="opts">
    <li>蒸馏前后学生的训练损失</li>
    <li>学生与教师的参数规模比</li>
    <li data-ok>同样数据与算力下，软标签训练 vs 纯硬标签训练，在同一验证集上的表现</li>
    <li>教师模型在公开榜单上的分数</li>
  </ul>
  <p class="why">
    没有这个对照，你无法区分「蒸馏有效」与「多训了一遍有效」。
    这也和模块 09 的模型阶梯思想一致：<strong>任何新方法都必须打败一个更简单的基线</strong>。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">你有 100 万个 token 的语料，想用 fp16 保存教师在每个位置上的完整词表分布（词表 151,936）。这笔存储大约是多大？</p>
  <ul class="opts">
    <li>约 300 MB</li>
    <li>约 30 GB</li>
    <li data-ok>约 300 GB</li>
    <li>约 3 TB</li>
  </ul>
  <p class="why">
    每 token \(151936 \times 2 \approx 297\ \text{KiB}\)，乘 100 万 token 约等于 304 GB。
    若只保留 top-50（int32 下标 + fp16 logit，每 token 300 B），同样的语料只要约 300 MB——
    压缩约 1000 倍。这也解释了为什么工程上几乎没人存全词表分布。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">在 200 题的测试集上，蒸馏组比硬标签基线高 5 个百分点（41% 对 46%）。按本讲的样本量估算，最合理的结论是？</p>
  <ul class="opts">
    <li>蒸馏有效，可以写进报告并发布</li>
    <li data-ok>这个差距约等于 1 个标准误，200 题不足以支撑结论；要检测 5 个百分点约需每组 1600 题，或改用配对检验</li>
    <li>应该先把采样温度调低再测一次，直到差距拉开</li>
    <li>只要差值为正，就说明蒸馏有效</li>
  </ul>
  <p class="why">
    两组合并正确率 0.435 时，差值的标准误约为 \(4.96\) 个百分点，观察到的 5 个百分点只有约 1 个标准误
    （双侧 \(p \approx 0.31\)）。反复调温度或换题集直到差距显著，是典型的 p-hacking——
    正确做法是扩大测试集或用配对检验。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">假设以后接到 crossfade 这类项目，要预测淡入淡出曲线的三个连续参数，同事建议用词级蒸馏把大模型能力搬进小模型。最合理的回答是？</p>
  <ul class="opts">
    <li>可以，只要教师足够大就行</li>
    <li data-ok>不合适：输出是连续标量，没有类间相似性结构可学；应先做特征工程与评估协议，若只是为了压体积则先量化</li>
    <li>应该先训一个过程奖励模型再蒸馏</li>
    <li>词级蒸馏一定能提升回归任务的精度</li>
  </ul>
  <p class="why">
    软标签的价值来自「教师认为第 2 类比第 3 类更接近」这类类间结构，回归输出没有这种结构。
    对照第 8 节：如果连 5 个百分点的差异都测不出来，任何新方法都无法被证明有效；
    而只想压体积时，4-bit 量化的成本远低于重新训练一个学生。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">设提示数 \(P = 2000\)、每题采样 \(k = 4\)，去重保留率 0.72、规则过滤保留率 0.85。最终可训练样本量约为多少？</p>
  <ul class="opts">
    <li>8,000 条</li>
    <li>5,760 条</li>
    <li data-ok>4,896 条</li>
    <li>6,800 条</li>
  </ul>
  <p class="why">
    \(2000 \times 4 = 8000\)，去重后 \(8000 \times 0.72 = 5760\)，过滤后 \(5760 \times 0.85 = 4896\)。
    两个中间值都是常见误区：只算去重会高估数据量，只算过滤会低估清洗的损失。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 8</div>
  <p class="q">把蒸馏温度 \(T\) 推向无穷大，教师的软标签与蒸馏损失会变成什么？</p>
  <ul class="opts">
    <li>软标签越来越尖锐，学生只学到 argmax，退化为硬标签训练</li>
    <li>软标签不变，只是训练变慢，需要更多轮数</li>
    <li data-ok>三类概率都趋近均匀分布，KL 损失主项变成中心化 logits 的 MSE 乘 \(1/(2T^2)\)，必须乘回 \(T^2\) 补偿，否则软标签项梯度消失</li>
    <li>KL 散度变成 0，蒸馏损失自动关闭，只剩硬标签项</li>
  </ul>
  <p class="why">
    \(T\to\infty\) 时 \(e^{z_i/T}\to1\)，分布趋于均匀（第 1 节折叠块里 \(z=[2,1,0]\) 的第三行手算）。
    推导见同一折叠块：KL 主项是中心化 logits 的 MSE 乘 \(1/(2T^2)\)——
    这正是损失里 \(T^2\) 系数的来源，也是 \(T\) 不能无脑调大的理由：太大时暗知识被均匀分布淹没。
  </p>
</div>

<div class="acc" data-t="深入：正向 KL 与反向 KL 的差别（为什么有的蒸馏更「保守」）" data-badge="进阶">
  <div class="acc-body">
    <p>两种方向都会出现在蒸馏文献里，行为差别很大：</p>
    <table class="tbl small">
      <thead><tr><th>损失</th><th>别称</th><th>行为</th><th>适用</th></tr></thead>
      <tbody>
        <tr><td>\(D_{\mathrm{KL}}(p_T \| p_S)\)</td><td>正向 / 期望覆盖</td>
            <td>学生必须覆盖教师所有高概率区域 → 输出更「平均」、更平滑</td><td>经典 KD（Hinton 2015）</td></tr>
        <tr><td>\(D_{\mathrm{KL}}(p_S \| p_T)\)</td><td>反向 / 模式寻找</td>
            <td>学生倾向于抓住教师的少数高概率模式 → 更锐利，但可能丢掉多样性</td><td>生成式蒸馏（MiniLLM 一类工作）</td></tr>
      </tbody>
    </table>
    <p>
      直觉：正向 KL 对「教师有概率、学生给 0」罚得极重（\(p_T \log(p_T/p_S) \to \infty\)），
      所以学生不敢漏掉任何模式；反向 KL 对「学生有概率、教师给 0」罚得重，所以学生会收紧到教师的几个高峰上。
    </p>
    <p>
      还有一个常被忽略的用途：<strong>投机解码的草稿模型</strong>（模块 08）就常常是用目标模型蒸馏出来的——
      草稿模型必须与目标模型「风格接近」才能有高接受率，而蒸馏正是让两者分布对齐的手段。
    </p>
  </div>
</div>
`
});
