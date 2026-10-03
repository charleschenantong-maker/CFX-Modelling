/* content/11-economics.js — 模块 11：订阅套利经济学 */
COURSE.register({
  id: "m11",
  part: 4,
  num: "11",
  title: "订阅套利经济学：$200 为什么能换到数千美元的推理",
  en: "The Token Arbitrage Economics",
  minutes: 30,
  tags: ["经济", "订阅", "必做"],
  body: String.raw`
<p class="lead">
  这一模块的内容来自 Theo 的访谈记录：他把「订阅额度」当成一种可计算的资源做配置。
  数值是<strong>量级参考</strong>而非精确报价，但其中的推理结构非常值得学——
  它本质上是「边际成本、机会成本与套利」的应用题。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    同样付 200 美元：走 API 得到 200 美元的算力；买个人订阅，可能换到价值数千美元的推理量。
    这个差额从哪来？平台为什么愿意补贴？作为用户，应该怎样配置才不浪费？
  </p>
</section>

<h3>1. 核心数字（按访谈记录的量级）</h3>
<table class="tbl">
  <thead><tr><th>项目</th><th>记录中的量级</th><th>含义</th></tr></thead>
  <tbody>
    <tr><td>API 付费</td><td>$200 → 恰好 $200 算力</td><td>按 token 计费，线性、无补贴</td></tr>
    <tr><td>Claude Pro / Max（$200 档）</td><td>≈ $8,000 等价 token 价值</td><td>约 <strong>40 倍</strong>补贴</td></tr>
    <tr><td>其中 Fable 类旗舰模型的额度上限</td><td>约为总价值的一半 → ≈ $4,000</td><td>平台对旗舰模型单独设限，避免补贴被单一模型吃光</td></tr>
    <tr><td>OpenAI Codex（$200 档）</td><td>≈ $12,000 等价推理</td><td>且记录称<strong>不在旗舰与较小模型之间分层限额</strong></td></tr>
    <tr><td>重置带来的额外额度</td><td>30 天内最多 14 次重置，平均每 2–3 天一次</td><td>把「每周额度」压成「约 3 天周期」，等效月价值可上探到 ≈ $24,000</td></tr>
    <tr><td>前沿实验室的毛利</td><td>约 95%（其余约 5% 覆盖硬件折旧、服务器更换、电费）</td><td>解释了为什么有能力长期补贴</td></tr>
  </tbody>
</table>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>把它写成一个可以算的模型</h4>
  <p>设月费 \(F\)、等效倍率 \(m\)、每月重置次数 \(n\)、每次重置恢复的额度比例 \(r\)。若单次重置近似「补回 3 天的额度」，则</p>
  \[ V_{\text{total}} \;\approx\; F\cdot m \;+\; n \cdot \frac{F\cdot m}{30}\cdot 3 \cdot r \]
  <p>代入 \(F=200,\ m=40,\ n=14,\ r=1\)：\(V_{\text{total}} \approx 8000 + 14\times 800 \approx 19{,}200\) 美元。</p>
  <p><strong>每美元换到的推理量</strong> = \(V_{\text{total}}/F \approx 96\)。这就是「套利」的量化形式：
  同样的钱，在订阅制下换到的推理量是 API 计价下的一到两个数量级。</p>
  <p class="hint">下面这个计算器就是上面这个式子的实现，可以自己改参数看敏感性。</p>
  <div class="calc" data-calc="arbitrage"></div>
</section>

<h3>2. 折扣为什么会存在：平台侧的算术</h3>
<ul>
  <li><strong>规模与折旧</strong>：算力是重资产，折旧与电费是固定支出。空闲的 GPU 等于持续亏损，
      所以用「限时、限量、不可转让」的订阅把闲置产能卖出去，边际成本极低。</li>
  <li><strong>市场份额</strong>：订阅补贴是获客成本。用户把工作流迁移到某个平台之后，切换成本很高。</li>
  <li><strong>窗口限制</strong>：真正的约束不是「月总量」，而是 <strong>5 小时滚动窗口</strong>与 <strong>7 天上限</strong>。
      平台用时间窗把重度用户的峰值拉平。</li>
</ul>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>$100 档的「陷阱」</h4>
  <p>
    记录中的观察：$100 档提供约 50% 的月度总池，但<strong>滚动 5 小时窗口的上限被砍到 25%</strong>。
    后果是：总量看似够用，但你会在连续高强度使用时更早撞上节流，
    很难把额度「烧干净」——单位有效产能反而更差。
  </p>
  <p><strong>可迁移的决策原则</strong>：比较套餐时，要看<em>限制的形状</em>（滚动窗口、峰值上限），而不是只看月度总量。
    这与比较云主机时「不能只看 vCPU 数，还要看突发积分」是同一类思维。</p>
</section>

<h3>3. 限额比例：把窗口换算成可用的工作容量</h3>
<p>记录中给出的一个换算关系：在 20× 档位上，<strong>把 5 小时滚动窗口用满 100%，相当于 7 天旗舰额度的 40%</strong>，
也只占完整 7 天总配额的 20%。这可以写成一条简单的规划式：</p>
\[ \text{可用窗口数} \approx \frac{1}{0.40} = 2.5 \quad(\text{即 7 天内大约只能把 5 小时窗口打满 2–3 次}) \]
<p>
  于是「什么时候用最贵的模型」就变成了一个调度问题：把旗舰模型留给真正需要长链推理的任务，
  其余工作交给中等模型或本地模型。
</p>

<h3>4. 边界：什么会被封号</h3>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>零公开流量规则（最重要的合规红线）</h4>
  <p>
    记录中的明确表述：订阅池化<strong>只用于个人编码和内部自动化</strong>。
    把面向公众的生产 API 流量导向池化的个人订阅，违反服务条款，会招致迅速封号。
  </p>
  <ul>
    <li><strong>越界</strong>：对外提供 API 服务、把额度转售、把订阅当作产品后端、抓取模型输出用于蒸馏。</li>
    <li><strong>通常安全</strong>：自己的开发、自己的自动化脚本、个人学习与研究实验、内部工具。</li>
    <li><strong>判断标准</strong>：请求是否来自「不特定的第三方」？是否有商业转售？是否会与模型蒸馏相关？</li>
  </ul>
  <p><em>平台政策会变化，最终以官方服务条款为准。本模块只提供判断框架，请在动手前自行核对最新条款（见附录 D）。</em></p>
</section>

<h3>5. 隐私设置：让个人账号向企业条款靠拢</h3>
<p>
  记录中提到一个具体操作：在 Codex 中进入 <strong>Settings → Data Controls</strong>，关闭
  <strong>「Improve the model for everyone」</strong>。这样个人账号的数据隐私条款在功能上与企业团队账号趋同——
  对处理课程材料、研究数据与个人项目的人来说，这是必要的一步。
</p>
<p>
  对应地，在任何平台上都要确认三件事：<em>你的输入是否被用于训练？保留多久？能否关闭？</em>
  如果找不到开关，就假设数据会被用于训练，并据此决定要不要上传敏感内容。
</p>

<h3>6. 你的配置建议</h3>
<table class="tbl small">
  <thead><tr><th>资源</th><th>推荐用途</th><th>不要用来做</th></tr></thead>
  <tbody>
    <tr><td>Codex Plus</td><td>长任务链、代码审查、批量重构；配合第 14 模块的 85/15 分工</td><td>当成 GPU 训练算力（它是推理额度）</td></tr>
    <tr><td>Google AI Pro ×3</td><td>Colab 上的训练与实验、Gemini 长文档阅读</td><td>把三个账号的额度当成一个池（各自独立，需分别管理）</td></tr>
    <tr><td>计划中的 Claude Pro</td><td>长上下文数学推导、论文精读、写作</td><td>驱动面向公众的 API</td></tr>
    <tr><td>opencode / OpenRouter 免费额度</td><td>原型、模型对比、小任务</td><td>关键路径（额度会波动）</td></tr>
    <tr><td>Colab / Kaggle 算力</td><td>真正的训练与实验</td><td>跑「只是看看」的脚本（浪费会话额度）</td></tr>
  </tbody>
</table>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>把经济学的语言用到你的项目上</h4>
  <p>
    这套「边际成本 / 机会成本 / 套利」的思维，直接适用于你的 crossfade 项目：
  </p>
  <ul>
    <li><strong>边际成本</strong>：多采集 100 条标注数据的成本 vs. 多训练一个模型的成本——哪个更可能提升指标？</li>
    <li><strong>机会成本</strong>：花两周调一个复杂模型，等价于放弃多少轮听测？</li>
    <li><strong>套利</strong>：如果某个特征（如 ΔLUFS）几乎免费就能测量，而它能解释大部分方差，那么用它替代昂贵的特征工程就是套利。</li>
  </ul>
  <p><em>在申请材料里，这种「用成本结构解释技术决策」的写法，比单纯罗列技术名词更有说服力。</em></p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">为什么 $100 档在记录中被认为「更难用满」？</p>
  <ul class="opts">
    <li>因为它的月度总量只有 $200 档的 25%</li>
    <li data-ok>它的月度总量约为一半，但滚动 5 小时窗口限额被压到 25%，更容易撞上节流</li>
    <li>因为它不支持旗舰模型</li>
    <li>因为它的重置次数更少</li>
  </ul>
  <p class="why">
    约束的形状比总量更重要。窗口限额决定了你在一次高强度会话中能推进多少工作，
    而节流一旦触发，剩余额度就无法被有效利用。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">下列哪种用法最可能触发封号？</p>
  <ul class="opts">
    <li>用自己的订阅跑个人项目的自动化脚本</li>
    <li>用自己的订阅做课程作业与文献阅读</li>
    <li data-ok>把个人订阅额度接到一个面向公众的网站后端提供 API 服务</li>
    <li>在自己的笔记本上做实验</li>
  </ul>
  <p class="why">
    记录中的红线是「零公开流量」：订阅池化用于个人编码与内部自动化。
    面向不特定第三方提供服务属于违反条款，且通常伴随转售或蒸馏风险。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">月费 $200、等效倍率 40、每月 14 次重置、每次重置约补回 3 天额度。等效月价值约为？</p>
  <ul class="opts">
    <li>$8,000</li>
    <li>$11,200</li>
    <li data-ok>约 $19,200</li>
    <li>约 $56,000</li>
  </ul>
  <p class="why">
    基础额度 \(200\times40 = 8000\)；每次重置补回 \(8000/30\times3 = 800\)，14 次即 11,200；
    合计约 19,200 美元。<em>注意这是量级估算，用于理解结构，不是对任何平台的报价承诺。</em>
  </p>
</div>

<div class="acc" data-t="深入：什么时候订阅反而不划算？" data-badge="决策">
  <div class="acc-body">
    <p>订阅制在「持续、分散、交互式」的使用下占优；但在下面三种情形，API 或自建更划算：</p>
    <ol>
      <li><strong>突发且总量巨大</strong>：一次性处理 10 万条独立请求。订阅的窗口限制会让你排队数周，而 API 可以并行买满。</li>
      <li><strong>需要确定性延迟与配额保证</strong>：产品级 SLA 不能用「个人额度」承载——这也是条款上的红线。</li>
      <li><strong>可以用更小的模型</strong>：把 90% 的调用降到 3B 本地模型，边际成本接近电费，剩下的难题才交给旗舰模型。
          这是「分级路由」的经济学版本。</li>
    </ol>
    <p>决策口诀：<strong>把额度留给不可替代的推理，把可替代的调用赶到便宜或本地的地方。</strong></p>
  </div>
</div>
`
});
