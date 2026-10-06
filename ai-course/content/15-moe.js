/* content/15-moe.js — 模块 15：混合专家架构 MoE */
COURSE.register({
  id: "m15-moe",
  part: 3,
  num: "15",
  title: "混合专家架构：稀疏门控、Top-k 路由与负载均衡",
  en: "Mixture of Experts, Top-k Routing & Load Balancing",
  minutes: 40,
  tags: ["架构", "MoE", "高阶"],
  body: String.raw`
<p class="lead">
  当模型规模达到千亿参数时，密集前馈网络（Dense FFN）的计算代价使预训练与推理成本难以承受。
  混合专家架构（Mixture of Experts, MoE）通过将前馈层拆分为多个并行的子专家网络，
  并在每个 Token 前置一个轻量级路由门控网络（Router），仅动态激活极少量子集专家（如 Top-1 或 Top-2），
  实现了<strong>「参数量扩增数十倍，而每个 Token 的计算量与延迟保持恒定」</strong>的优雅解耦。
  这一模块系统拆解 MoE 门控数学内核、负载均衡辅助损失，并给出完整的草稿纸手算演算。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口与直觉对齐</h4>
  <p>
    <strong>一句话类比</strong>：密集模型像一个「全科医生」，面对任何问题都调动全部脑细胞；
    MoE 则像一个「专家门诊分诊台」，分诊台（Router）先花极小代价快速看一眼病历，
    把病人分流给心内科和内分泌科两个专家（Top-2），其余数十个科室完全不参与本次诊断。
    模型拥有整个医院的百科全书式知识库，但每个病人的就诊时间依然只有一个科室的长短。<br />
    <strong>核心账本差异</strong>：<strong>算力按激活参数计，显存按总参数计</strong>！
    MoE 解决的是计算效率瓶颈，但对显存容量与卡间跨节点通信（All-to-All）提出了前所未有的苛刻要求。<br />
    <strong>读完你能回答</strong>：为什么 Top-k 路由的不可微离散采样需要辅助损失？
    为什么门控 Softmax 归一化后必须在激活子集上进行第二次重新归一化？
    完全均衡分布在数学上如何使得辅助损失达到全局极小值？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心问题</h4>
  <p>
    为什么朴素训练的 MoE 会迅速发生「模式坍缩（Expert Collapse）」——少数 1 到 2 个专家吞掉全批次 95% 以上的 Token，
    而其余专家梯度饥饿、形同虚设？
    为什么我们不能直接对门控得分用 Argmax 选专家做端到端反向传播？
    本讲带你深入门控网络的数学腹地，亲手在草稿纸上算清每个导数与分配概率。
  </p>
</section>

<h3>1. 从稠密 FFN 到稀疏门控网络（Sparse MoE）</h3>
<p>
  在标准 Transformer 块中，多头注意力后紧接前馈网络（FFN）：\(y = \mathrm{FFN}(x)\)。
  在 MoE 架构中，该层被替换为 \(E\) 个结构相同但权重独立的专家网络 \(\{E_1, E_2, \dots, E_E\}\)
  和一个参数化的路由器（Router / Gating Network）\(G(x)\)：
</p>
\[ y = \sum_{i=1}^E G(x)_i E_i(x) \]
<p>
  其中 \(G(x) \in \mathbb{R}^E\) 是一个极端稀疏的权重向量，其非零元个数严格等于 \(k\)（通常 \(k \ll E\)，如 \(E=8, k=2\) 或 \(E=64, k=8\)）。
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
  给 Charles 的数学打草稿顺序：先在草稿纸上固定输入维度与专家数量，
  追踪门控线性映射、Softmax 激活、Top-k 离散掩码截断，以及关键的<strong>子集重新归一化（Re-normalization）</strong>过程。
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
    对全量专家维度施加标准 Softmax 函数，得到在全体专家上的先验路由概率分布 \(P \in \mathbb{R}^{1 \times E}\)：
  </p>
  \[ P_i = \mathrm{softmax}(H)_i = \frac{\exp(H_i)}{\sum_{j=1}^E \exp(H_j)}, \qquad \sum_{i=1}^E P_i = 1 \]
  <p>
    <strong>前置定义 3（Top-k 离散掩码与专家选择集合）：</strong>
    设激活专家数量为 \(k\)（\(1 \le k < E\)）。定义专家挑选算子：
  </p>
  \[ \mathcal{T} = \mathrm{TopK}(H, k) = \Big\{ i \in \{1, \dots, E\} \;\Big|\; \mathrm{rank}(H_i) \le k \Big\} \]
  <p>
    <strong>前置定义 4（重新归一化门控权重 Re-normalized Weights）：</strong>
    若直接使用原始 Softmax 概率 \(P_i\)，由于只选取了 \(k\) 个分量，其系数之和 \(\sum_{i \in \mathcal{T}} P_i < 1\)，
    会导致前向传播的信号方差被无故衰减。因此必须在选中的子集 \(\mathcal{T}\) 上进行二次归一化：
  </p>
  \[ g_i = \begin{cases} \dfrac{\exp(H_i)}{\sum_{j \in \mathcal{T}} \exp(H_j)}, & i \in \mathcal{T} \\ 0, & i \notin \mathcal{T} \end{cases} \]
  <p>
    重新归一化保证了激活专家的加权系数满足严格的凸组合条件：\(\sum_{i \in \mathcal{T}} g_i = 1\)。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 B：极简小数字单步路由全流程手算</h4>
  <p>
    在草稿纸上设定最精简的整数与浮点数值：
    输入维度 \(d=4\)，总专家数 \(E=4\)，激活专家数 \(k=2\)（Top-2 路由）。
  </p>
  <p>
    <strong>设定具体数值：</strong>
    设单 Token 经过门控矩阵乘法后，算出的原始 Logits 得分向量为：
  </p>
  \[ H = [H_1, H_2, H_3, H_4] = [1.2, \; 0.5, \; 2.8, \; -0.1] \]
  <p><strong>草稿第 1 步：数值排序与 Top-2 离散集合锁定</strong></p>
  <p>
    对各分量大小进行严格排序：
  </p>
  \[ H_3 = 2.8 > H_1 = 1.2 > H_2 = 0.5 > H_4 = -0.1 \]
  <p>
    前两个最大得分的分量索引为第 3 项与第 1 项。
    因此，Top-2 选中的专家索引集合为：
  </p>
  \[ \mathcal{T} = \{1, 3\} \]
  <p>
    未选中的专家 2 与专家 4（索引集合 \(\{2, 4\}\)）其掩码为 0，前向计算直接短路跳过。
  </p>
  <p><strong>草稿第 2 步：手算全量 Softmax 概率分布（作为全局对照）</strong></p>
  <p>
    计算各分量的自然指数值（保留 4 位小数）：
  </p>
  <ul>
    <li>\(\exp(H_1) = e^{1.2} \approx 3.3201\)</li>
    <li>\(\exp(H_2) = e^{0.5} \approx 1.6487\)</li>
    <li>\(\exp(H_3) = e^{2.8} \approx 16.4446\)</li>
    <li>\(\exp(H_4) = e^{-0.1} \approx 0.9048\)</li>
  </ul>
  <p>
    全量指数求和配分：
  </p>
  \[ S_{\text{all}} = \sum_{j=1}^4 \exp(H_j) = 3.3201 + 1.6487 + 16.4446 + 0.9048 = 22.3182 \]
  <p>
    由此计算全量 Softmax 概率向量 \(P = [P_1, P_2, P_3, P_4]\)：
  </p>
  \[ P_1 = \frac{3.3201}{22.3182} \approx 0.1488, \qquad P_2 = \frac{1.6487}{22.3182} \approx 0.0739 \]
  \[ P_3 = \frac{16.4446}{22.3182} \approx 0.7368, \qquad P_4 = \frac{0.9048}{22.3182} \approx 0.0405 \]
  <p>
    核验概率归一性：\(0.1488 + 0.0739 + 0.7368 + 0.0405 = 1.0000\)。
  </p>
  <p><strong>草稿第 3 步：子集指数配分与重新归一化加权系数 \(g\)</strong></p>
  <p>
    仅对入选集合 \(\mathcal{T} = \{1, 3\}\) 的指数值求和：
  </p>
  \[ S_{\mathcal{T}} = \exp(H_1) + \exp(H_3) = 3.3201 + 16.4446 = 19.7647 \]
  <p>
    计算重新归一化门控权重 \(g_1\) 与 \(g_3\)：
  </p>
  \[ g_1 = \frac{\exp(H_1)}{S_{\mathcal{T}}} = \frac{3.3201}{19.7647} \approx 0.1680 \]
  \[ g_3 = \frac{\exp(H_3)}{S_{\mathcal{T}}} = \frac{16.4446}{19.7647} \approx 0.8320 \]
  <p>
    对于未入选专家：\(g_2 = 0, \; g_4 = 0\)。
    核验加权和：\(g_1 + g_3 = 0.1680 + 0.8320 = 1.0000\)。
  </p>
  <p><strong>草稿第 4 步：最终 MoE 输出张量代数装配</strong></p>
  <p>
    设 4 个专家对输入 \(x\) 的前向计算结果分别为向量 \(E_1(x), E_2(x), E_3(x), E_4(x) \in \mathbb{R}^{1 \times d}\)。
    最终 MoE 层的输出严格为加权线性组合：
  </p>
  \[ y = 0.1680 \cdot E_1(x) + 0.8320 \cdot E_3(x) \]
  <p>
    <strong>代数审视：</strong>在这个计算流程中，专家 2 与专家 4 的 FFN 参数矩阵根本无需参与前向矩阵乘法，
    也无需在反向传播中分配激活值梯度显存！输入被动态路由分流，计算开销瞬间减半。
  </p>
</section>

<h3>3. 负载均衡辅助损失（Auxiliary Loss）代数推导与极值分析</h3>
<p>
  在实际训练中，如果只给模型主任务损失（如交叉熵），路由网络很容易陷入<strong>自强化马太效应（Winner-Take-All Collapse）</strong>：
  初始化时某个专家偶然得分稍高，就会被更频繁地选中更新，其拟合速度超过其他专家，
  导致路由器越来越偏好该专家，最终 99% 的 Token 全部涌向单一专家，MoE 退化为极小维度的密集模型。
  为了强行拉平各专家的负载，必须引入可微的辅助损失函数（Load Balancing Auxiliary Loss）。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>草稿纸演算区 C：辅助损失公式定义与柯西-施瓦茨极小值证明</h4>
  <p>
    设当前训练批次（Batch）包含 \(T\) 个 Token，模型共有 \(E\) 个专家，路由策略为 Top-k。
  </p>
  <p><strong>第 1 步：定义批次内部的两个核心统计向量</strong></p>
  <ul>
    <li>
      <strong>统计量一：分配频数密度向量 \(f \in \mathbb{R}^E\)（不可微的硬分配比例）：</strong>
      <br />
      统计专家 \(i\) 在当前批次 \(T\) 个 Token 中被实际选中的总次数占总路由决策的比例：
      \[ f_i \triangleq \frac{1}{T} \sum_{t=1}^T \mathbb{I}(i \in \mathcal{T}_t) \]
      由于每个 Token 恰好选出 \(k\) 个专家，因此总分配次数为 \(k T\)，其分量和恒满足：
      \[ \sum_{i=1}^E f_i = \frac{1}{T} \sum_{t=1}^T \sum_{i=1}^E \mathbb{I}(i \in \mathcal{T}_t) = \frac{1}{T} \sum_{t=1}^T k = k \]
    </li>
    <li>
      <strong>统计量二：平均门控概率向量 \(P \in \mathbb{R}^E\)（平滑可微的软概率平均）：</strong>
      <br />
      对每个 Token 在全量 Softmax 上分配给专家 \(i\) 的概率 \(p_{t, i}\) 求批次算术平均：
      \[ P_i \triangleq \frac{1}{T} \sum_{t=1}^T p_{t, i} = \frac{1}{T} \sum_{t=1}^T \frac{\exp(H_{t, i})}{\sum_{j=1}^E \exp(H_{t, j})} \]
      由于每个 Token 的 Softmax 概率和为 1，因此该向量各分量和恒满足：
      \[ \sum_{i=1}^E P_i = \frac{1}{T} \sum_{t=1}^T \sum_{i=1}^E p_{t, i} = \frac{1}{T} \sum_{t=1}^T 1 = 1 \]
    </li>
  </ul>
  <p><strong>第 2 步：构建辅助损失（Switch / GShard 辅助损失）</strong></p>
  <p>
    标准负载均衡辅助损失定义为分配密度向量 \(f\) 与门控概率向量 \(P\) 的内积并缩放 \(E\) 倍：
  </p>
  \[ \mathcal{L}_{\mathrm{aux}} \triangleq \alpha \cdot E \sum_{i=1}^E f_i P_i = \alpha \cdot E \, \langle f, P \rangle \]
  <p>
    其中 \(\alpha > 0\) 为辅助损失权重超参数（工程常用值 \(\alpha \in [0.01, 0.05]\)）。
    <strong>反向传播的关键可微性设计：</strong>在计算计算图时，\(f_i\) 被视作常数不回传梯度（Detached / Stop Gradient），
    梯度完全通过平滑的软概率 \(P_i\) 回传给路由器权重 \(W_g\)。
  </p>
  <p><strong>第 3 步：为什么完全平衡时达到理论极小值？（严密代数推导）</strong></p>
  <p>
    <strong>定理：</strong>在约束条件 \(\sum_{i=1}^E f_i = k\) 与 \(\sum_{i=1}^E P_i = 1\) 下，
    当且仅当所有专家被均匀等概率选择、且实际分流量完全相等时，即：
  </p>
  \[ f_1 = f_2 = \dots = f_E = \frac{k}{E}, \qquad P_1 = P_2 = \dots = P_E = \frac{1}{E} \]
  <p>
    内积求和项 \(\sum_{i=1}^E f_i P_i\) 达到全局理论最小值 \(\frac{k}{E}\)，对应的辅助损失为：
  </p>
  \[ \mathcal{L}_{\mathrm{aux}}^{\mathrm{ideal}} = \alpha \cdot E \cdot \left( \sum_{i=1}^E \frac{k}{E} \cdot \frac{1}{E} \right) = \alpha \cdot E \cdot \left( E \cdot \frac{k}{E^2} \right) = \alpha \cdot k \]
  <p>
    <strong>证明（利用均值不等式与协方差展开）：</strong>
    考察两组离散变量 \(f\) 与 \(P\) 的协方差公式：
  </p>
  \[ \mathrm{Cov}(f, P) = \frac{1}{E} \sum_{i=1}^E (f_i - \bar{f})(P_i - \bar{P}) = \frac{1}{E} \sum_{i=1}^E f_i P_i - \bar{f}\bar{P} \]
  <p>
    其中两者的均值是严格固定的代数常数：
  </p>
  \[ \bar{f} = \frac{1}{E} \sum_{i=1}^E f_i = \frac{k}{E}, \qquad \bar{P} = \frac{1}{E} \sum_{i=1}^E P_i = \frac{1}{E} \]
  <p>
    将内积项改写为协方差形式：
  </p>
  \[ \sum_{i=1}^E f_i P_i = E \cdot \bar{f}\bar{P} + E \cdot \mathrm{Cov}(f, P) = \frac{k}{E} + E \cdot \mathrm{Cov}(f, P) \]
  <p>
    <strong>正相关性与极小值判定：</strong>
    因为 \(f_i\) 是由 Softmax 概率选出的 Top-k 离散指示器，概率 \(P_i\) 越大的专家，其被选中的频率 \(f_i\) 必然同向单调递增！
    这导致变量 \(f\) 与 \(P\) 之间存在天然的强正相关性，其协方差恒为非负数：
  </p>
  \[ \mathrm{Cov}(f, P) \ge 0 \]
  <p>
    当且仅当 \(f_i\) 与 \(P_i\) 各自退化为常数（即 \(f_i = \bar{f} = k/E\) 且 \(P_i = \bar{P} = 1/E\)）时，
    协方差严格取零 \(\mathrm{Cov}(f, P) = 0\)，此时内积达到绝对下确界：
  </p>
  \[ \sum_{i=1}^E f_i P_i \ge \frac{k}{E} \implies \mathcal{L}_{\mathrm{aux}} \ge \alpha k \]
  <p><strong>草稿第 4 步：极值反例代入（模式坍缩时损失放大几何倍）</strong></p>
  <p>
    设 \(E=8, k=2\)。理想完全平衡时：
    \(\mathcal{L}_{\mathrm{aux}} = \alpha \cdot 8 \cdot [8 \times (2/8 \times 1/8)] = 2\alpha\)。
    若发生极端崩溃：所有 Token 均涌向专家 1 与专家 2（各分得一半），其余 6 个专家彻底饿死：
    \(f = [1, 1, 0, 0, 0, 0, 0, 0]\)，对应门控概率也坍缩为 \(P = [0.5, 0.5, 0, 0, 0, 0, 0, 0]\)。
    代入辅助损失：
  </p>
  \[ \mathcal{L}_{\mathrm{aux}}^{\mathrm{collapse}} = \alpha \cdot 8 \cdot \left( 1 \times 0.5 + 1 \times 0.5 + 0 \right) = \alpha \cdot 8 \cdot (1.0) = 8\alpha \]
  <p>
    <strong>结论：</strong>坍缩状态下的辅助损失是理想均匀状态的 \(8\alpha / 2\alpha = 4\) 倍（恰好等于 \(E/k\)）！
    优化器的负梯度方向 \(-\nabla_{P_i} \mathcal{L}_{\mathrm{aux}} = -\alpha E f_i\) 会对过载专家施加巨大的下压惩罚，
    同时对空闲专家（\(f_i = 0\)）施加零惩罚，强力驱动网络恢复全专家均匀分流。
  </p>
</section>

<h3>4. 专家容量、丢弃机制与跨节点通信（All-to-All）</h3>
<p>
  在实际分布式训练与推理集群中，不同专家通常分布在不同 GPU 上（专家并行 Expert Parallelism, EP）。
  这带来了独特的系统工程挑战：
</p>
<ul>
  <li><strong>专家容量限制（Expert Capacity Factor）：</strong>
    为防止单卡显存溢出，系统通常设定单专家容量缓冲区上限：
    \[ C = \mathrm{capacity\_factor} \times \left( \frac{k \cdot T}{E} \right) \]
    若分配给某专家的 Token 数量超过容量上限 \(C\)，超额的 Token 将触发<strong>Token Dropping（直接短路丢弃 FFN 计算，通过残差直通）</strong>，导致信息损失。
  </li>
  <li><strong>All-to-All 集合通信算子：</strong>
    MoE 的通信瓶颈在 <code>All-to-All</code> 算子：各卡必须将本地收集到的 Token 根据路由目标全部洗牌打散发送到持有相应专家的目标卡，
    计算完成后再执行一次 <code>All-to-All</code> 把结果拉回原始卡。
  </li>
</ul>

<h3>5. 教科书级实现：轻量级 Top-2 稀疏门控网络（PyTorch）</h3>
<p>
  以下代码包含完整的门控计算、Top-2 索引提取、重新归一化与辅助损失计算，带详尽的逐行动态形状剖析：
</p>

<p><strong>MoE 稀疏门控路由微算子演示：</strong></p>
<pre><code>gates, indices = torch.topk(F.softmax(x @ W_gate, dim=-1), k=2)</code></pre>
<p>
  <strong>逐行代数解析</strong>：每个 Token 的输入表征 \(x\) 乘以门控投影矩阵 \(W_{\text{gate}}\)，经 Softmax 得到在所有候选专家（如 8 个）上的分配概率；<code>torch.topk</code> 选出概率最高的前 2 个专家下标 <code>indices</code> 与权重系数 <code>gates</code>，其余未选中的专家完全不参与浮点前向计算，实现模型容量扩张与计算量的优雅解耦。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>MoE 架构工程落地的三大常见陷阱</h4>
  <ol>
    <li><strong>容量因子（Capacity Factor）设太小</strong>：训练初期负载波动大，过紧的容量截断会导致 15% 以上的 Token 被直接丢弃（Dropping），损失曲线剧烈震荡。缓解：训练阶段设 <code>capacity_factor=1.25~1.5</code>，或采用免丢弃路由（Dropless Routing）。</li>
    <li><strong>辅助损失权重 \(\alpha\) 过大或过小</strong>：\(\alpha < 0.001\) 无法阻止马太坍缩；\(\alpha > 0.1\) 会导致辅助损失压制主任务交叉熵，路由器为了强求绝对均匀而把数学 Token 错误塞进文学专家。</li>
    <li><strong>跨节点通信带宽成为隐藏死穴</strong>：专家并行跨机器需要频繁跑 All-to-All，若跨机互联只有普通千兆网或 PCIe 4.0，通信延迟将吃掉 MoE 节省的全部 GPU 算力！</li>
  </ol>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">某 MoE 模型包含 8 个专家，输入 Logits 经挑选后仅保留专家 1 和专家 3，对应原始得分为 \(H_1 = 1.2, H_3 = 2.8\)。在执行重新归一化（Re-normalization）后，分配给专家 3 的门控权重 \(g_3\) 最接近？</p>
  <ul class="opts">
    <li>0.7368</li>
    <li data-ok>0.8320</li>
    <li>0.5000</li>
    <li>0.9048</li>
  </ul>
  <p class="why">
    草稿纸手算过程：子集指数和为 \(e^{1.2} + e^{2.8} \approx 3.3201 + 16.4446 = 19.7647\)。重新归一化加权权重为 \(g_3 = 16.4446 / 19.7647 \approx 0.8320\)。而 0.7368 是在全体 4 个专家下的原始全局 Softmax 概率，如果不做子集重新归一化，两者相加不等于 1，会衰减信号方差。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 MoE 辅助负载均衡损失 \(\mathcal{L}_{\mathrm{aux}} = \alpha E \sum_{i=1}^E f_i P_i\) 的代数推导中，为什么当所有专家完全平衡时损失达到理论极小值？</p>
  <ul class="opts">
    <li>因为在平衡状态下所有专家的权重矩阵参数相等</li>
    <li data-ok>因为将内积展开为均值项与协方差项后，\(\sum f_i P_i = k/E + E \cdot \mathrm{Cov}(f, P)\)，而离散分配与门控概率同向正相关使得 \(\mathrm{Cov}(f, P) \ge 0\)，当且仅当完全均匀时协方差严格取零达到极小值</li>
    <li>因为交叉熵损失在平衡时恒等于零</li>
    <li>因为 Softmax 函数的导数在平衡时处处为零</li>
  </ul>
  <p class="why">
    推导精髓：均值 \(\bar{f} = k/E\) 与 \(\bar{P} = 1/E\) 是固定的代数常数。内积的自由度完全取决于两者的协方差 \(\mathrm{Cov}(f, P)\)。由于高概率专家总是更大概率被分配，两者呈非负正相关，因此协方差非负，均匀分布时协方差为 0 达到全局下确界。
  </p>
</div>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>以 Charles 的 Glass Player 与 Crossfade 这类任务为例（你以后可以照此判断）</h4>
  <p>
    <strong>结论：在本地音乐播放器（Glass Player）的音频淡入淡出曲线拟合中，绝对不要引入 MoE 架构！</strong>
  </p>
  <table class="tbl small">
    <thead><tr><th>维度</th><th>MoE 混合专家</th><th>密集小模型（如 0.5B~1.5B Dense）</th><th>Crossfade 音频工程判定</th></tr></thead>
    <tbody>
      <tr><td><strong>显存占用</strong></td><td>总参数巨大（需常驻多专家矩阵）</td><td>小巧轻盈（0.5B 仅需 1 GB 显存）</td><td>用户端本地播放器必须内存友好，MoE 显存开销不可接受</td></tr>
      <tr><td><strong>计算延迟</strong></td><td>分支预测、动态 Gather/Scatter 内存不规则</td><td>连续张量乘法，硬件矩阵加速器利用率满格</td><td>音频播放对实时性要求严苛（毫秒级调度），密集模型吞吐极稳定</td></tr>
      <tr><td><strong>适用场景</strong></td><td>超大规模通用百科知识库（涵盖代码、法律、医学）</td><td>特定垂直领域的密集数值回归与平滑曲线预测</td><td>Crossfade 是纯粹的连续功率谱与声学特征拟合，无多领域稀疏分诊需求</td></tr>
    </tbody>
  </table>
</section>
`
});
