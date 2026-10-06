/* content/12-moe.js — 模块 12：混合专家架构 MoE */
COURSE.register({
  id: "m15-moe",
  part: 3,
  num: "12",
  title: "混合专家架构：稀疏门控、Top-k 路由与负载均衡",
  en: "Mixture of Experts, Top-k Routing & Load Balancing",
  minutes: 40,
  tags: ["架构", "MoE", "高阶"],
  body: String.raw`
<p class="lead">
  模型做到千亿参数，密集前馈网络（Dense FFN）的计算代价在预训练和推理两端都吃不消。
  混合专家架构（Mixture of Experts, MoE）把前馈层拆成多个并行的子专家网络，
  再给每个 Token 配一个轻量路由门控网络（Router），每次只动态激活极少数几个专家（如 Top-1 或 Top-2），
  于是<strong>「参数量扩到几十倍，每个 Token 的计算量与延迟保持恒定」</strong>。
  这一模块拆开 MoE 的门控数学内核与负载均衡辅助损失，并把草稿纸手算过程写全。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口与直觉对齐</h4>
  <p>
    <strong>一句话类比</strong>：密集模型像「全科医生」，什么问题都调动全部脑细胞；
    MoE 则像「专家门诊的分诊台」，分诊台（Router）先花极小代价扫一眼病历，
    把病人分给心内科和内分泌科两个专家（Top-2），其余几十个科室这次完全不参与。
    医院的知识库照样是百科全书式的，但每个病人的就诊时间只有一个科室那么长。<br />
    <strong>核心账本差异</strong>：<strong>算力按激活参数算，显存按总参数算</strong>。
    MoE 解决的是计算效率，代价是对显存容量和卡间跨节点通信（All-to-All）提出了苛刻要求。<br />
    <strong>读完你能回答</strong>：为什么 Top-k 路由的不可微离散采样需要辅助损失？
    为什么门控 Softmax 归一化之后还要在激活子集上做第二次重新归一化？
    完全均衡分布在数学上如何让辅助损失达到全局极小值？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    朴素训练的 MoE 为什么会很快「模式坍缩（Expert Collapse）」——少数 1 到 2 个专家吃掉整批 95% 以上的 Token，
    其余专家梯度饥饿、形同虚设？
    又为什么不能直接对门控得分用 Argmax 选专家、做端到端反向传播？
    下面钻进门控网络的数学里，把每个导数和分配概率都在草稿纸上算清。
  </p>
</section>

<h3>1. 从稠密 FFN 到稀疏门控网络（Sparse MoE）</h3>
<p>
  标准 Transformer 块里，多头注意力后面接的是前馈网络（FFN）：\(y = \mathrm{FFN}(x)\)。
  到了 MoE 架构，这一层换成 \(E\) 个结构相同、权重独立的专家网络 \(\{E_1, E_2, \dots, E_E\}\)
  加一个参数化路由器（Router / Gating Network）\(G(x)\)：
</p>
\[ y = \sum_{i=1}^E G(x)_i E_i(x) \]
<p>
  其中 \(G(x) \in \mathbb{R}^E\) 是一个稀疏权重向量，非零元个数恰好是 \(k\)（通常 \(k \ll E\)，比如 \(E=8, k=2\) 或 \(E=64, k=8\)）。
</p>

<table class="tbl small">
  <thead><tr><th>架构范式</th><th>总参数量 \(N_{\text{total}}\)</th><th>每 Token 激活参数 \(N_{\text{active}}\)</th><th>前向 FLOPs / Token</th><th>显存物理驻留要求</th></tr></thead>
  <tbody>
    <tr><td><strong>密集基座（Dense）</strong></td><td>\(N\)</td><td>\(N\)</td><td>\(2N\)</td><td>\(N \times \text{bytes}\)</td></tr>
    <tr><td><strong>经典 MoE（如 Mixtral 8x7B）</strong></td><td>\(46.7\text{ B}\)</td><td>\(12.9\text{ B}\)</td><td>约等于 13B 稠密模型</td><td>需完整装载 46.7B 权重</td></tr>
    <tr><td><strong>细粒度 MoE（DeepSeekMoE）</strong></td><td>\(671\text{ B}\)</td><td>\(37\text{ B}\)</td><td>约等于 37B 稠密模型</td><td>多机集群分布式显存切分</td></tr>
  </tbody>
</table>

<h3>2. Charles 草稿纸演算区：Top-2 路由与门控重新归一化手算</h3>
<p>
  给 Charles 排一下打草稿的顺序：先在草稿纸上固定输入维度和专家数量，
  然后一路追门控线性映射、Softmax 激活、Top-k 离散掩码截断，以及关键的<strong>子集重新归一化（Re-normalization）</strong>。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 A：前置定义与符号约定</h4>
  <p>
    <strong>前置定义 1（门控得分网络 Gating Network）：</strong>
    设 Token 的隐藏层表征输入为行向量 \(x \in \mathbb{R}^{1 \times d_{\text{in}}}\)。
    门控路由权重矩阵为 \(W_g \in \mathbb{R}^{d_{\text{in}} \times E}\)（本例不设偏置项）。
    路由器前向映射生成未经归一化的原始 Logits 得分向量 \(H \in \mathbb{R}^{1 \times E}\)：
  </p>
  \[ H = x W_g = [H_1, H_2, \dots, H_E] \]
  <p>
    <strong>前置定义 2（全集 Softmax 概率分布）：</strong>
    对全部专家维度做标准 Softmax，得到全体专家上的先验路由概率分布 \(P \in \mathbb{R}^{1 \times E}\)：
  </p>
  \[ P_i = \mathrm{softmax}(H)_i = \frac{\exp(H_i)}{\sum_{j=1}^E \exp(H_j)}, \qquad \sum_{i=1}^E P_i = 1 \]
  <p>
    <strong>前置定义 3（Top-k 离散掩码与专家选择集合）：</strong>
    设激活专家数量为 \(k\)（\(1 \le k < E\)）。定义专家挑选算子：
  </p>
  \[ \mathcal{T} = \mathrm{TopK}(H, k) = \Big\{ i \in \{1, \dots, E\} \;\Big|\; \mathrm{rank}(H_i) \le k \Big\} \]
  <p>
    <strong>前置定义 4（重新归一化门控权重 Re-normalized Weights）：</strong>
    如果直接用原始 Softmax 概率 \(P_i\)，只选了 \(k\) 个分量，系数和 \(\sum_{i \in \mathcal{T}} P_i < 1\)，
    前向信号方差就被白白削弱。所以必须在选中的子集 \(\mathcal{T}\) 上再归一化一次：
  </p>
  \[ g_i = \begin{cases} \dfrac{\exp(H_i)}{\sum_{j \in \mathcal{T}} \exp(H_j)}, & i \in \mathcal{T} \\ 0, & i \notin \mathcal{T} \end{cases} \]
  <p>
    这样归一化之后，激活专家的加权系数满足凸组合条件：\(\sum_{i \in \mathcal{T}} g_i = 1\)。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：极简小数字单步路由全流程手算</h4>
  <p>
    在草稿纸上取最精简的一组数：
    输入维度 \(d=4\)，总专家数 \(E=4\)，激活专家数 \(k=2\)（Top-2 路由）。
  </p>
  <p>
    <strong>代入具体数值：</strong>
    单个 Token 过完门控矩阵乘法，得到的原始 Logits 得分向量是：
  </p>
  \[ H = [H_1, H_2, H_3, H_4] = [1.2, \; 0.5, \; 2.8, \; -0.1] \]
  <p><strong>草稿第 1 步：数值排序与 Top-2 离散集合锁定</strong></p>
  <p>
    按分量大小排一遍序：
  </p>
  \[ H_3 = 2.8 > H_1 = 1.2 > H_2 = 0.5 > H_4 = -0.1 \]
  <p>
    得分最高的两个分量是第 3 项和第 1 项。
    因此 Top-2 选中的专家索引集合是：
  </p>
  \[ \mathcal{T} = \{1, 3\} \]
  <p>
    没被选中的专家 2 和专家 4（索引集合 \(\{2, 4\}\)）掩码为 0，前向计算直接跳过。
  </p>
  <p><strong>草稿第 2 步：手算全量 Softmax 概率分布（作为全局对照）</strong></p>
  <p>
    先算各分量的自然指数（保留 4 位小数）：
  </p>
  <ul>
    <li>\(\exp(H_1) = e^{1.2} \approx 3.3201\)</li>
    <li>\(\exp(H_2) = e^{0.5} \approx 1.6487\)</li>
    <li>\(\exp(H_3) = e^{2.8} \approx 16.4446\)</li>
    <li>\(\exp(H_4) = e^{-0.1} \approx 0.9048\)</li>
  </ul>
  <p>
    全量指数求和，得到配分函数：
  </p>
  \[ S_{\text{all}} = \sum_{j=1}^4 \exp(H_j) = 3.3201 + 1.6487 + 16.4446 + 0.9048 = 22.3182 \]
  <p>
    于是全量 Softmax 概率向量 \(P = [P_1, P_2, P_3, P_4]\) 是：
  </p>
  \[ P_1 = \frac{3.3201}{22.3182} \approx 0.1488, \qquad P_2 = \frac{1.6487}{22.3182} \approx 0.0739 \]
  \[ P_3 = \frac{16.4446}{22.3182} \approx 0.7368, \qquad P_4 = \frac{0.9048}{22.3182} \approx 0.0405 \]
  <p>
    验一下概率的归一性：\(0.1488 + 0.0739 + 0.7368 + 0.0405 = 1.0000\)。
  </p>
  <p><strong>草稿第 3 步：子集指数配分与重新归一化加权系数 \(g\)</strong></p>
  <p>
    只把入选集合 \(\mathcal{T} = \{1, 3\}\) 的指数加起来：
  </p>
  \[ S_{\mathcal{T}} = \exp(H_1) + \exp(H_3) = 3.3201 + 16.4446 = 19.7647 \]
  <p>
    重新归一化后的门控权重 \(g_1\) 与 \(g_3\)：
  </p>
  \[ g_1 = \frac{\exp(H_1)}{S_{\mathcal{T}}} = \frac{3.3201}{19.7647} \approx 0.1680 \]
  \[ g_3 = \frac{\exp(H_3)}{S_{\mathcal{T}}} = \frac{16.4446}{19.7647} \approx 0.8320 \]
  <p>
    未入选的专家：\(g_2 = 0, \; g_4 = 0\)。
    验一下加权和：\(g_1 + g_3 = 0.1680 + 0.8320 = 1.0000\)。
  </p>
  <p><strong>草稿第 4 步：把最终输出装出来</strong></p>
  <p>
    设 4 个专家对输入 \(x\) 的前向结果分别是向量 \(E_1(x), E_2(x), E_3(x), E_4(x) \in \mathbb{R}^{1 \times d}\)，
    MoE 层的输出就是加权线性组合：
  </p>
  \[ y = 0.1680 \cdot E_1(x) + 0.8320 \cdot E_3(x) \]
  <p>
    <strong>回过头看：</strong>整个流程里专家 2 和专家 4 的 FFN 参数矩阵根本没参与前向矩阵乘法，
    反向也不用给它们分配激活值梯度显存。输入被路由动态分流，计算开销直接减半。
  </p>
</section>

<h3>3. 负载均衡辅助损失（Auxiliary Loss）代数推导与极值分析</h3>
<p>
  实际训练里如果只给主任务损失（比如交叉熵），路由网络很容易滑进<strong>自强化马太效应（Winner-Take-All Collapse）</strong>：
  初始化时某个专家偶然得分高一点，就会被更频繁地选中更新，拟合速度超过其他专家，
  路由器于是越来越偏爱它，最后 99% 的 Token 全涌向一个专家，MoE 退化成一个很小的密集模型。
  要把各专家的负载拉平，就得引入可微的辅助损失函数（Load Balancing Auxiliary Loss）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：辅助损失公式定义与协方差展开极小值证明</h4>
  <p>
    设当前训练批次（Batch）包含 \(T\) 个 Token，模型共有 \(E\) 个专家，路由策略为 Top-k。
  </p>
  <p><strong>第 1 步：定义批次内的两个统计向量</strong></p>
  <ul>
    <li>
      <strong>统计量一：分配频数密度向量 \(f \in \mathbb{R}^E\)（不可微的硬分配比例）：</strong>
      <br />
      统计专家 \(i\) 在这批 \(T\) 个 Token 里被实际选中的次数占全部路由决策的比例：
      \[ f_i \triangleq \frac{1}{T} \sum_{t=1}^T \mathbb{I}(i \in \mathcal{T}_t) \]
      每个 Token 恰好选出 \(k\) 个专家，总分配次数是 \(k T\)，所以分量和恒为：
      \[ \sum_{i=1}^E f_i = \frac{1}{T} \sum_{t=1}^T \sum_{i=1}^E \mathbb{I}(i \in \mathcal{T}_t) = \frac{1}{T} \sum_{t=1}^T k = k \]
    </li>
    <li>
      <strong>统计量二：平均门控概率向量 \(P \in \mathbb{R}^E\)（平滑可微的软概率平均）：</strong>
      <br />
      把每个 Token 在全量 Softmax 下分给专家 \(i\) 的概率 \(p_{t, i}\) 在批次内取算术平均：
      \[ P_i \triangleq \frac{1}{T} \sum_{t=1}^T p_{t, i} = \frac{1}{T} \sum_{t=1}^T \frac{\exp(H_{t, i})}{\sum_{j=1}^E \exp(H_{t, j})} \]
      每个 Token 的 Softmax 概率和为 1，所以这个向量的分量和恒为：
      \[ \sum_{i=1}^E P_i = \frac{1}{T} \sum_{t=1}^T \sum_{i=1}^E p_{t, i} = \frac{1}{T} \sum_{t=1}^T 1 = 1 \]
    </li>
  </ul>
  <p><strong>第 2 步：构建辅助损失（Switch / GShard 辅助损失）</strong></p>
  <p>
    标准的负载均衡辅助损失，就是分配密度向量 \(f\) 与门控概率向量 \(P\) 的内积再放大 \(E\) 倍：
  </p>
  \[ \mathcal{L}_{\mathrm{aux}} \triangleq \alpha \cdot E \sum_{i=1}^E f_i P_i = \alpha \cdot E \, \langle f, P \rangle \]
  <p>
    其中 \(\alpha > 0\) 是辅助损失权重超参数（工程常用 \(\alpha \in [0.01, 0.05]\)）。
    <strong>可微性就在这一手：</strong>搭计算图时把 \(f_i\) 当常数，不回传梯度（Detached / Stop Gradient），
    梯度全部通过平滑的软概率 \(P_i\) 回传给路由器权重 \(W_g\)。
  </p>
  <p><strong>第 3 步：为什么完全平衡时就是理论极小值？</strong></p>
  <p>
    <strong>定理：</strong>在约束条件 \(\sum_{i=1}^E f_i = k\) 与 \(\sum_{i=1}^E P_i = 1\) 下，
    当且仅当所有专家被均匀等概率选中、实际分流量也完全相等时，即：
  </p>
  \[ f_1 = f_2 = \dots = f_E = \frac{k}{E}, \qquad P_1 = P_2 = \dots = P_E = \frac{1}{E} \]
  <p>
    内积 \(\sum_{i=1}^E f_i P_i\) 取到全局最小值 \(\frac{k}{E}\)，此时辅助损失为：
  </p>
  \[ \mathcal{L}_{\mathrm{aux}}^{\mathrm{ideal}} = \alpha \cdot E \cdot \left( \sum_{i=1}^E \frac{k}{E} \cdot \frac{1}{E} \right) = \alpha \cdot E \cdot \left( E \cdot \frac{k}{E^2} \right) = \alpha \cdot k \]
  <p>
    <strong>证明（协方差展开）：</strong>
    写出两组离散变量 \(f\) 与 \(P\) 的协方差：
  </p>
  \[ \mathrm{Cov}(f, P) = \frac{1}{E} \sum_{i=1}^E (f_i - \bar{f})(P_i - \bar{P}) = \frac{1}{E} \sum_{i=1}^E f_i P_i - \bar{f}\bar{P} \]
  <p>
    两者的均值都是固定的代数常数：
  </p>
  \[ \bar{f} = \frac{1}{E} \sum_{i=1}^E f_i = \frac{k}{E}, \qquad \bar{P} = \frac{1}{E} \sum_{i=1}^E P_i = \frac{1}{E} \]
  <p>
    把内积改写成协方差的形式：
  </p>
  \[ \sum_{i=1}^E f_i P_i = E \cdot \bar{f}\bar{P} + E \cdot \mathrm{Cov}(f, P) = \frac{k}{E} + E \cdot \mathrm{Cov}(f, P) \]
  <p>
    <strong>正相关与极小值：</strong>
    \(f_i\) 是由 Softmax 概率选出的 Top-k 离散指示器，概率 \(P_i\) 越大的专家，被选中的频率 \(f_i\) 也越高。
    于是 \(f\) 与 \(P\) 天然正相关，协方差恒为非负：
  </p>
  \[ \mathrm{Cov}(f, P) \ge 0 \]
  <p>
    当且仅当 \(f_i\) 与 \(P_i\) 都退化成常数（\(f_i = \bar{f} = k/E\) 且 \(P_i = \bar{P} = 1/E\)）时，
    协方差取零 \(\mathrm{Cov}(f, P) = 0\)，内积才到绝对下确界：
  </p>
  \[ \sum_{i=1}^E f_i P_i \ge \frac{k}{E} \implies \mathcal{L}_{\mathrm{aux}} \ge \alpha k \]
  <p><strong>草稿第 4 步：代一个极端反例（模式坍缩时损失放大多少）</strong></p>
  <p>
    设 \(E=8, k=2\)。理想完全平衡时：
    \(\mathcal{L}_{\mathrm{aux}} = \alpha \cdot 8 \cdot [8 \times (2/8 \times 1/8)] = 2\alpha\)。
    如果彻底崩溃：所有 Token 都涌向专家 1 和专家 2（各分一半），其余 6 个专家完全饿死：
    \(f = [1, 1, 0, 0, 0, 0, 0, 0]\)，对应门控概率也坍缩为 \(P = [0.5, 0.5, 0, 0, 0, 0, 0, 0]\)。
    代入辅助损失：
  </p>
  \[ \mathcal{L}_{\mathrm{aux}}^{\mathrm{collapse}} = \alpha \cdot 8 \cdot \left( 1 \times 0.5 + 1 \times 0.5 + 0 \right) = \alpha \cdot 8 \cdot (1.0) = 8\alpha \]
  <p>
    <strong>结论：</strong>坍缩时的辅助损失是理想均匀状态的 \(8\alpha / 2\alpha = 4\) 倍（正好等于 \(E/k\)）。
    优化器沿 \(-\nabla_{P_i} \mathcal{L}_{\mathrm{aux}} = -\alpha E f_i\) 的方向，给过载专家一个很大的下压惩罚，
    对空闲专家（\(f_i = 0\)）则一点都不罚，这样就把流量推回均匀分流。
  </p>
</section>

<h3>4. 专家容量、丢弃机制与跨节点通信（All-to-All）</h3>
<p>
  分布式训练和推理集群里，不同专家通常放在不同 GPU 上（专家并行 Expert Parallelism, EP），
  由此带来几个绕不开的问题：
</p>
<ul>
  <li><strong>专家容量限制（Expert Capacity Factor）：</strong>
    为了防止单卡显存溢出，系统给每个专家设一个容量上限：
    \[ C = \mathrm{capacity\_factor} \times \left( \frac{k \cdot T}{E} \right) \]
    分给某个专家的 Token 超过容量上限 \(C\) 时，超出的部分触发<strong>Token Dropping（跳过 FFN 计算，走残差直通）</strong>，这部分信息就丢了。
  </li>
  <li><strong>All-to-All 集合通信算子：</strong>
    MoE 的通信瓶颈就在 <code>All-to-All</code>：各卡按路由目标把本地收到的 Token 洗牌打散，发到持有对应专家的卡上，
    算完再跑一次 <code>All-to-All</code> 把结果拉回来。
  </li>
</ul>

<h3>5. 核心代数微算子：轻量级 Top-2 稀疏门控网络</h3>
<p>
  下面这个代数式把门控计算、Top-2 索引提取、重新归一化与辅助损失定义串在一起（可运行的 PyTorch 版本见附录 B 对应实验）：
</p>

<p><strong>MoE 稀疏门控路由微算子演示：</strong></p>
<p>\[ H(x) = \sum_{i \in \text{Top-}k(G(x))} G(x)_i \cdot E_i(x), \quad G(x) = \text{ReNormalize}\big(\text{Top-}k(\text{Softmax}(x W_g), k)\big) \]</p>
<p>
  <strong>逐行代数解析</strong>：每个 Token 的输入表征 \(x\) 先乘门控投影矩阵 \(W_{\text{gate}}\)，Softmax 之后得到在所有候选专家（比如 8 个）上的分配概率；<code>torch.topk</code> 挑出概率最高的 2 个专家下标 <code>indices</code> 与权重系数 <code>gates</code>，没选中的专家完全不参与浮点前向计算，容量扩了而计算量没扩。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>MoE 落地的三个常见坑</h4>
  <ol>
    <li><strong>容量因子（Capacity Factor）设太小</strong>：训练初期负载波动大，容量卡得太紧会让 15% 以上的 Token 被直接丢弃（Dropping），损失曲线跟着剧烈震荡。缓解办法：训练阶段设 <code>capacity_factor=1.25~1.5</code>，或者直接用免丢弃路由（Dropless Routing）。</li>
    <li><strong>辅助损失权重 \(\alpha\) 过大或过小</strong>：\(\alpha < 0.001\) 拦不住马太坍缩；\(\alpha > 0.1\) 又会让辅助损失压过主任务交叉熵，路由器为了凑绝对均匀，把数学 Token 硬塞进文学专家。</li>
    <li><strong>跨节点通信带宽是最容易忽略的一环</strong>：专家并行跨机器要频繁跑 All-to-All，跨机互联要是只有普通千兆网或 PCIe 4.0，通信延迟能把 MoE 省下来的算力全吃掉。</li>
  </ol>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">某 MoE 模型有 8 个专家，输入 Logits 挑选后只保留专家 1 和专家 3，对应原始得分为 \(H_1 = 1.2, H_3 = 2.8\)。做重新归一化（Re-normalization）之后，分给专家 3 的门控权重 \(g_3\) 最接近？</p>
  <ul class="opts">
    <li>0.7368</li>
    <li data-ok>0.8320</li>
    <li>0.5000</li>
    <li>0.9048</li>
  </ul>
  <p class="why">
    草稿纸手算：子集指数和为 \(e^{1.2} + e^{2.8} \approx 3.3201 + 16.4446 = 19.7647\)，重新归一化后 \(g_3 = 16.4446 / 19.7647 \approx 0.8320\)。0.7368 是全体 4 个专家下的原始全局 Softmax 概率；不做子集重新归一化，选中专家的权重加起来不等于 1，会把信号方差衰减掉。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 MoE 辅助负载均衡损失 \(\mathcal{L}_{\mathrm{aux}} = \alpha E \sum_{i=1}^E f_i P_i\) 的推导里，为什么所有专家完全平衡时损失就到理论极小值？</p>
  <ul class="opts">
    <li>因为在平衡状态下所有专家的权重矩阵参数相等</li>
    <li data-ok>因为把内积展开成均值项与协方差项后，\(\sum f_i P_i = k/E + E \cdot \mathrm{Cov}(f, P)\)，而离散分配与门控概率同向正相关，\(\mathrm{Cov}(f, P) \ge 0\)；当且仅当完全均匀时协方差取零，达到极小值</li>
    <li>因为交叉熵损失在平衡时恒等于零</li>
    <li>因为 Softmax 函数的导数在平衡时处处为零</li>
  </ul>
  <p class="why">
    推导的关键：均值 \(\bar{f} = k/E\) 与 \(\bar{P} = 1/E\) 都是固定的代数常数，内积怎么变全看两者的协方差 \(\mathrm{Cov}(f, P)\)。高概率的专家总是更大概率被分配，两者非负相关，所以协方差非负；均匀分布时协方差为 0，取到全局下确界。
  </p>
</div>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>以 Charles 的 Glass Player 与 Crossfade 这类任务为例（以后可以照此判断）</h4>
  <p>
    <strong>结论：本地音乐播放器（Glass Player）拟合音频淡入淡出曲线，不要引入 MoE 架构。</strong>
  </p>
  <table class="tbl small">
    <thead><tr><th>维度</th><th>MoE 混合专家</th><th>密集小模型（如 0.5B~1.5B Dense）</th><th>Crossfade 音频工程判定</th></tr></thead>
    <tbody>
      <tr><td><strong>显存占用</strong></td><td>总参数巨大（多专家矩阵要常驻）</td><td>小巧（0.5B 只要 1 GB 显存）</td><td>本地播放器必须内存友好，MoE 的显存开销没法接受</td></tr>
      <tr><td><strong>计算延迟</strong></td><td>分支预测、动态 Gather/Scatter，访存不规则</td><td>连续张量乘法，矩阵加速器能吃满</td><td>音频播放要毫秒级实时调度，密集模型的吞吐更稳</td></tr>
      <tr><td><strong>适用场景</strong></td><td>超大规模通用百科知识库（涵盖代码、法律、医学）</td><td>特定垂直领域的密集数值回归与平滑曲线预测</td><td>Crossfade 就是连续功率谱与声学特征的拟合，没有多领域稀疏分诊的需求</td></tr>
    </tbody>
  </table>
</section>
`
});
