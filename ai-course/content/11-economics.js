/* content/11-economics.js — 模块 11：订阅经济学（按你的真实订阅重写） */
COURSE.register({
  id: "m11",
  part: 4,
  num: "11",
  title: "你的订阅经济学：$20 档的三本账，以及访谈数字哪里不适用",
  en: "Your Subscription Economics ($20 tiers)",
  minutes: 35,
  tags: ["经济", "订阅", "必读"],
  body: String.raw`
<p class="lead">
  这一模块回答一个非常具体的问题：<strong>你手上这三份订阅（Codex Plus $20、Claude Pro $20、Google AI Pro）
  到底能换来多少工作？</strong>同时纠正一个常见误解——网上流传的「$200 换 $8000 推理」是<em>另一个档位</em>的数字，
  直接用在你身上会高估一个数量级。本讲还为具备数学与建模背景的同学专门开设了【草稿纸演算区】：系统推演集群 TCO（总体拥有成本）、单价模型，并手算 1.5B 模型处理 100B Token 时 8×A100 与 8×H100 的耗时与花费精确算式。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：订阅额度不是钱包里的钱，而是<em>三把不同的尺子</em>——
    消息条数（Codex）、用量（Claude）、计算单元（Colab），量出来的东西不能互相换算。<br />
    <strong>这一讲要建立的直觉</strong>：先搞清「额度按什么计量、窗口怎么滚动、在哪里查看」，再谈省钱。<br />
    <strong>读完你能回答</strong>：为什么访谈里「$200 换 $8000」的数字不适用于你的 $20 档？三个 Google AI Pro 账号为什么不能合并用？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    同样每月 20 美元，走 API 只能买到 20 美元的算力；订阅却能让你连续几小时使用最强模型。
    差额从哪来？为什么平台愿意补贴？以及最关键：<strong>我的额度什么时候会用完？</strong>
  </p>
</section>

<h3>1. 先建立正确的心智模型：订阅额度不是钱，是三把不同的尺子</h3>
<table class="tbl">
  <thead><tr><th>订阅</th><th>额度用什么计量</th><th>窗口结构</th><th>在哪里看</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>ChatGPT Plus（含 Codex）$20/月</strong></td>
      <td><strong>消息／任务条数</strong>，且按模型不同而不同</td>
      <td>5 小时窗口 <strong>+</strong> 每周窗口<strong>双重约束</strong>（两个窗口都要有余量才能继续）</td>
      <td>设置 → 用量（Settings → Usage）</td>
    </tr>
    <tr>
      <td><strong>Claude Pro $20/月</strong></td>
      <td><strong>「用量」</strong>（不是消息数），按 token 折算，具体折算规则不公开</td>
      <td>5 小时窗口 <strong>+</strong> 每周窗口</td>
      <td>Claude Code 里输入 <code>/usage</code></td>
    </tr>
    <tr>
      <td><strong>Google AI Pro ×3</strong></td>
      <td><strong>Colab 计算单元（compute units）</strong>余额，按机器类型扣费</td>
      <td>每月发放一次；余额耗尽后退回免费层策略</td>
      <td>Colab 设置 → 订阅／资源</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>为什么这个区分重要？</strong>因为「额度」不是余额宝里的钱，而是三把结构不同的尺子：
  消息数会因为你选更大的模型而立刻缩水；用量按 token 计所以你贴进去多长的上下文都算钱；
  计算单元按机器等级扣，A100 一小时扣掉的是 T4 的很多倍。
  <em>不理解这一点，就会出现「月初很宽裕、月中突然什么都干不了」的假象。</em>
</p>

<h3>2. Codex（Plus 档）的官方额度</h3>
<p>
  OpenAI 官方帮助中心给出的口径是：<strong>「工作」与 Codex 共享同一套套餐额度</strong>，
  并且<strong>不承诺固定条数</strong>——同样一条消息，选不同的模型、不同的推理强度、多步骤任务，消耗完全不同。
  官方只给出「每 5 小时窗口内的估算条数区间」：
</p>
<table class="tbl small">
  <thead><tr><th>模型</th><th>Plus 档每 5 小时估算条数</th><th>定位</th></tr></thead>
  <tbody>
    <tr><td>GPT-6 Astra</td><td><strong>5 – 45</strong></td><td>能力最强，适合疑难排查、复杂问题</td></tr>
    <tr><td>GPT-5.6 Sol</td><td>10 – 100</td><td>能力与效率兼顾，日常主力</td></tr>
    <tr><td>GPT-5.6 Terra</td><td>25 – 200</td><td>速度与成本平衡，起草与常规改动</td></tr>
    <tr><td>GPT-5.6 Luna</td><td>250 – 2 000</td><td>快速廉价，适合抽取、分类、短编辑</td></tr>
    <tr><td>GPT-5.5 / 5.4 / 5.4 mini</td><td>15–80 / 20–100 / 60–350</td><td>旧型号，额度更宽</td></tr>
  </tbody>
</table>
<p><strong>三个立刻可用的结论：</strong></p>
<ol>
  <li><strong>换模型是最有效的省额度手段</strong>，而且它是<em>同一个池子</em>：Astra 用掉的比例远高于 Luna。
      把「查询、分类、整理」交给便宜模型，把 Astra 留给真正难的问题，你的有效产能会提高数倍。</li>
  <li><strong>推理强度（reasoning effort）也会吃掉额度</strong>。官方明确说：更高推理强度不一定更好，但通常更贵。
      遇到简单任务先降档，别默认拉满。</li>
  <li><strong>5 小时窗口与每周窗口要同时有余量</strong>。这意味着你不能把一天的活全堆在一个 5 小时里连轴干——
      即使每周总额还有剩余，也会被 5 小时上限卡住。</li>
</ol>

<h3>3. Claude Pro 的官方口径</h3>
<ul>
  <li>Claude Code 的额度同样分<strong>5 小时窗口</strong>与<strong>每周窗口</strong>，按「用量」而非条数计量，
      具体折算不公开（用 <code>/usage</code> 查看你自己的剩余量）。</li>
  <li>2026 年 5 月 13 日到 9 月 13 日期间有过一次<strong>周上限 +50% 的促销</strong>；
      促销结束后从 <strong>2026 年 9 月 14 日</strong>起，Pro/Max/Team 的<strong>周上限永久比促销前高 25%</strong>。
      <em>5 小时上限不受这次调整影响。</em></li>
  <li>旗舰模型（例如 Fable 系列）在部分档位有单独的额度安排——这类「模型级上限」需要看你账户里显示的实际数字。</li>
</ul>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>务必自己核对</h4>
  <p>
    平台会调整额度、促销与重置规则（上面那条促销就是例子）。本模块给出的是<strong>结构与已查到的官方口径</strong>，
    <strong>你的真实上限只在两个地方</strong>：Codex 的「设置 → 用量」，以及 Claude Code 的 <code>/usage</code>。
    养成每周记录一次的习惯，这比记住任何二手数字都有用。
  </p>
</section>

<h3>4. Google AI Pro：Colab 计算单元</h3>
<p>
  从 2026 年 9 月 22 日起，Google 把 Colab 的付费权益并入 Google AI 订阅：
  <strong>符合条件的 Google AI 订阅者会按月获得 Colab 计算单元</strong>，并能访问更强的 GPU/TPU；
  更高档位（AI Ultra）额外提供<strong>后台连续执行</strong>与 Premium GPU——也就是关掉浏览器标签页训练还能继续跑。
</p>
<table class="tbl small">
  <thead><tr><th>档位</th><th>大致能力</th><th>对训练意味着什么</th></tr></thead>
  <tbody>
    <tr><td>免费层（无计算单元余额）</td><td>T4 级 GPU（视可用性）、最长约 12 小时、空闲即断开</td><td>能跑完本课程 30–90 分钟级的实验</td></tr>
    <tr><td>Google AI Pro（含计算单元）</td><td>更高优先级、更强机器、更长会话</td><td>能跑稍大的微调与更长的预训练实验</td></tr>
    <tr><td>Google AI Ultra</td><td>后台连续执行 + Premium GPU（最长 24 小时）</td><td>能跑「离开电脑也不中断」的长任务</td></tr>
  </tbody>
</table>
<p>
  <strong>额度耗尽的后果要提前知道</strong>：Colab 官方说明，付费用户的计算单元余额用完后，
  会<strong>退回免费层的策略与限制</strong>（而不是继续无限使用）。所以月底前要把关键实验跑完，
  或者把长任务拆成能在一 altercation 内完成的片段（这正是模块 10 讲的实验设计纪律）。
</p>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>关于你有 3 个 Google AI Pro 账号——一条重要的合规提醒</h4>
  <p>
    Google Colab 的使用政策里，被明确列为<strong>禁止</strong>的行为包括：
    「<strong>使用多个账号来规避访问限制或资源用量限制</strong>」（using multiple accounts to work around access
    or resource usage restrictions）。
  </p>
  <p>
    也就是说：<strong>三个账号不能当成一个三倍大的额度池来用</strong>。
    合规的用法是：每个账号用于它自己的学习/项目用途；
    不要为了绕开某一天的限额而在账号之间轮换同一类重负载任务。
  </p>
  <p>
    顺带列出与学习者最相关的其他几条禁止项：托管网站/文件服务、连接远程代理、
    加密货币挖矿、P2P 下载、生成深度伪造内容、以及用容器化等手段规避反滥用策略。
    <em>你写论文用的 notebook 完全在允许范围内；把它变成「免费 GPU 服务器」就越线了。</em>
  </p>
</section>

<h3>5. 访谈里的数字，哪些适用、哪些不适用</h3>
<p>
  你给我的访谈记录讨论的是 <strong>$200 档</strong>（Claude Max / Codex Pro 级）的套利结构。
  那些「$8,000 / $12,000 等价推理」「一个月 $24,000」属于<strong>那个档位</strong>的量级。
  把它直接搬到 $20 档会高估约一个数量级。但其中的<em>结构</em>仍然成立：
</p>
<table class="tbl">
  <thead><tr><th>访谈里的说法</th><th>对 $20 档是否成立</th><th>修正后的说法</th></tr></thead>
  <tbody>
    <tr>
      <td>订阅远比 API 划算（约 40×）</td>
      <td><strong>方向成立，倍数更小</strong></td>
      <td>订阅的「每美元等效推理量」仍显著高于 API，但倍数随档位下降；用下面的计算器按你自己的用量估</td>
    </tr>
    <tr>
      <td>$200 Claude 订阅 ≈ $8,000 token 价值</td>
      <td><strong>不适用于 $20 档</strong></td>
      <td>这是 $200 档的量级；$20 档请以「每 5 小时条数区间」为锚点</td>
    </tr>
    <tr>
      <td>Codex 不在旗舰与小模型之间分层限额</td>
      <td><strong>与官方数据不符</strong></td>
      <td>官方表格显示<em>不同模型的每 5 小时条数差别极大</em>（Astra 5–45 vs Luna 250–2000），只是它们共享同一个池子</td>
    </tr>
    <tr>
      <td>$100 档「陷阱」：5 小时窗口只有 25%</td>
      <td><strong>不适用于你</strong></td>
      <td>这是针对特定中间档位的观察；你的 $20 档直接按官方区间估算即可</td>
    </tr>
    <tr>
      <td>重置会「清空计时器」（OpenAI）</td>
      <td><strong>成立，且已核实</strong></td>
      <td>官方说明：使用一次完整预存重置会恢复 5 小时与每周配额，<strong>并改变你的每周重置日期</strong></td>
    </tr>
    <tr>
      <td>银行重置（banked reset）可留到以后再触发</td>
      <td><strong>成立</strong></td>
      <td>官方说明：重置机会保存在账户里直到使用或过期；只有确实恢复了某个周期才会被消耗</td>
    </tr>
    <tr>
      <td>前沿实验室约 95% 毛利</td>
      <td>量级参考</td>
      <td>属于行业估算，不是官方披露；用来理解「为什么能补贴」即可，不要当成财务事实引用</td>
    </tr>
    <tr>
      <td>零公开发流规则</td>
      <td><strong>完全成立，且是红线</strong></td>
      <td>个人订阅用于个人编码与内部自动化；接公开发流、转售、用于蒸馏会触发封禁</td>
    </tr>
  </tbody>
</table>

<h3>6. 把额度换算成工作量的计算器</h3>
<p>
  下面这个计算器<strong>把假设全部摊开</strong>：你填「每月大概推进多少任务」「每个任务平均多少 token」
  「混合 API 单价」，它算出这些工作如果用 API 要花多少钱，从而得到订阅的等效倍数。
  数字不重要，<em>结构</em>才重要——改一个参数就能看出哪一项最影响结论。
</p>
<div class="calc" data-calc="subvalue"></div>
<p class="small">
  参考量级：一次「有真实上下文的中等任务」（读几个文件、改代码、跑一轮验证）常见在 5 万–30 万 token；
  混合单价按你所用模型的输入/输出价格加权估计（例如输入 $3/M、输出 $15/M，比例 4:1 时混合约 $5.4/M）。
</p>

<h3>7. 你的配置建议（更新版）</h3>
<table class="tbl small">
  <thead><tr><th>资源</th><th>推荐用法</th><th>不要用来做</th></tr></thead>
  <tbody>
    <tr><td><strong>Codex Plus $20</strong></td><td>代码任务的主力：重构、调试、批量审查；<strong>按任务难度选模型</strong>（难题 Astra，杂活 Luna/Terra）</td><td>当成 GPU 训练算力（它是推理额度）；也不要默认拉满推理强度</td></tr>
    <tr><td><strong>Claude Pro $20</strong></td><td>长上下文阅读与写作：论文精读、数学推导复核、报告润色；用 <code>/usage</code> 盯额度</td><td>驱动面向公众的 API 服务</td></tr>
    <tr><td><strong>Google AI Pro ×3</strong></td><td>真正跑训练与实验的算力（Colab 计算单元）；三份分别服务于不同项目/身份</td><td><strong>不要合并成一个额度池来绕开限额</strong>（违反 Colab 政策）</td></tr>
    <tr><td>opencode / OpenRouter 免费额度</td><td>原型、模型对比、非关键任务</td><td>关键路径（额度会波动）</td></tr>
    <tr><td>Kaggle</td><td>想体验 8 设备 SPMD 并行时唯一的免费去处（TPU v5e-8）</td><td>需要长期稳定会话的任务</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>三条可以立刻执行的习惯</h4>
  <ol>
    <li><strong>每周记一次额度快照</strong>：Codex「设置 → 用量」、Claude 的 <code>/usage</code>、Colab 计算单元余额，
        写进 <code>notes/quota.md</code>。两周后你就能预测自己什么时候会用完。</li>
    <li><strong>按难度路由模型</strong>：把当天任务先分档（难 / 中 / 杂活），再决定用哪个模型。这一条通常能省下 50% 以上额度。</li>
    <li><strong>重任务放在窗口开头</strong>：既然 5 小时窗口会滚动重置，就把最需要 Astra 的任务放在一个窗口的起点，
        杂活填进窗口尾部。</li>
  </ol>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>把经济学的语言用到你的项目上</h4>
  <ul>
    <li><strong>边际成本</strong>：多标注 100 条数据 vs 多训一个模型——哪个更可能提升指标？（答案通常是前者）</li>
    <li><strong>机会成本</strong>：花两周调复杂模型，等于放弃多少轮听测？</li>
    <li><strong>套利</strong>：如果某个特征（如 ΔLUFS）几乎免费可测，却能解释大部分方差，那么用它替代昂贵特征工程就是套利。</li>
  </ul>
  <p><em>在申请材料里，用成本结构解释技术决策，比罗列技术名词更有说服力。</em></p>
</section>

<h3>8. 【草稿纸演算】大模型训练 TCO、单价模型与每 MTok 成本推演</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>前置定义与符号约定</h4>
  <ul>
    <li><strong>总体拥有成本（TCO, Total Cost of Ownership）</strong>：自建数据中心或机房采购（On-premise）在全生命周期内的资本支出（CapEx）与持续运营支出（OpEx）的代数总和：
      \[ \text{TCO}_{\text{on-prem}} = \text{CapEx} \times (1 + \alpha_{\text{deprec}}) + \text{OpEx} \]
      其中：
      <br />- <strong>CapEx（资本支出）</strong>：高密 GPU 服务器采购（如一台 8×H100 SXM5 节点整机售价常达 $300,000+）、InfiniBand 交换机、光模块与供电基础设施。
      <br />- \( \alpha_{\text{deprec}} \)：硬件维护与损耗系数（数据中心通用 3 年线性折旧残值模型）。
      <br />- <strong>OpEx（运营支出）</strong>：机柜租赁、持续电费与散热能耗支出（计算式为 \( \text{Power (kW)} \times PUE \times \text{Electricity Rate (\$/kWh)} \times \text{Hours} \)，PUE 即 Power Usage Effectiveness，工业良好基线在 1.1~1.3 之间）、7×24 小时 SRE 运维薪酬、以及公网出口流量费。
      <br />- <strong>云端租赁（Cloud Rental）对比</strong>：纯 OpEx 模式，零前置资金沉淀，按需使用与退订，消除了单代 GPU 快速贬值及技术换代淘汰的沉没成本风险。
    </li>
    <li><strong>GPU 租用单价体系（工业市场参考口径）</strong>：
      <br />- <strong>On-demand（按需租赁）</strong>：随时开通与销毁，按秒或小时扣费，弹性极高，单价最高。
      <br />- <strong>Reserved（预留合约）</strong>：签订 1 年或 3 年承诺期，单价可享受 30%~60% 的折扣。
      <br />- <strong>Spot / Preemptible（抢占式实例）</strong>：利用数据中心空闲算力池，折扣高达 65%~80%，但云厂商保留在 30 秒内随时收回实例的打断风险。
      <br />工业级按需公允基准单价（2024–2026 市场参考口径）：
      <br />- NVIDIA A100-SXM4-80GB：单卡约 \( \$1.80 / \text{GPU}\cdot\text{hr} \)（8 卡节点综合单价 \( \$14.40/\text{hr} \)）。
      <br />- NVIDIA H100-SXM5-80GB：单卡约 \( \$3.00 / \text{GPU}\cdot\text{hr} \)（8 卡节点综合单价 \( \$24.00/\text{hr} \)）。
    </li>
    <li><strong>每百万 Token 成本（Cost per MTok, \( C_{\text{MTok}} \)）</strong>：
      衡量训练或微调阶段在标准化 Token 尺度下的经济学效费比：
      \[ C_{\text{MTok}} = \frac{\text{Total Training Cost (USD)}}{\text{Total Tokens}} \times 10^6 \]
    </li>
  </ul>
</section>

<h3>9. 【实战手算草稿】1.5B 模型训练 100B Token：8×A100 vs 8×H100 耗时与花费精确演算</h3>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>极简小数字草稿纸演算（Scratchpad 1）</h4>
  <p>在代入巨大真实数字前，先在草稿纸上用极简小数字把推导公式彻底走通：</p>
  <p>设模型参数量 \( N = 10 \)，训练 Token 数量 \( D = 10 \)。</p>
  <p>设单卡理论算力 \( P_{\text{toy}} = 10 \text{ FLOP/s} \)，利用率 \( \mu = 50\% = 0.5 \)，单卡小时租金 \( c_{\text{toy}} = \$1.00 / \text{hr} \)。</p>
  <ol>
    <li>理论总浮点运算量（按 6N 规则）：
      \[ \text{FLOPs} = 6 \cdot N \cdot D = 6 \times 10 \times 10 = 600 \text{ FLOPs} \]
    </li>
    <li>单卡有效计算速率：
      \[ R_{\text{eff}} = P_{\text{toy}} \times \mu = 10 \times 0.5 = 5 \text{ FLOP/s} \]
    </li>
    <li>训练耗时推导：
      \[ T_{\text{sec}} = \frac{\text{FLOPs}}{R_{\text{eff}}} = \frac{600}{5} = 120 \text{ s} = \frac{120}{3600} \text{ hr} = \frac{1}{30} \text{ hr} \]
    </li>
    <li>租赁总花费：
      \[ \text{Cost} = T_{\text{sec}} / 3600 \times c_{\text{toy}} = \frac{1}{30} \text{ hr} \times \$1.00/\text{hr} \approx \$0.0333 \]
    </li>
    <li>每百万 Token 单位成本：
      \[ C_{\text{MTok}} = \frac{\$0.03333}{10 \text{ tokens}} \times 10^6 = \$3,333 / \text{MTok} \]
    </li>
  </ol>
  <p>推演逻辑链清晰闭环。接下来将工业级真实数字代入该精确算式。</p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>工业级真实任务手算草稿：1.5B 模型处理 100B Token</h4>
  <p><strong>任务基础参数设定</strong>：</p>
  <ul>
    <li>模型参数量：\( N = 1.5\text{B} = 1.5 \times 10^9 \)</li>
    <li>训练数据量：\( D = 100\text{B tokens} = 100 \times 10^9 = 10^{11} \text{ tokens} \)</li>
    <li>前向 + 反向理论总计算量（标准 6N 法则）：
      \[ \text{Total FLOPs} = 6 \cdot N \cdot D = 6 \times (1.5 \times 10^9) \times (10^{11}) = 9 \times 10^{20} \text{ FLOPs} \]
    </li>
    <li>设定成熟工程调优环境下的有效算力利用率：\( \text{MFU} = \mu = 40\% = 0.40 \)</li>
  </ul>

  <p><strong>对比方案 A：云端租赁 8 张 A100-SXM4-80GB</strong></p>
  <ol>
    <li>硬件参数：单卡 BF16 dense 理论峰值 \( 312 \text{ TFLOPS} = 3.12 \times 10^{14} \text{ FLOP/s} \)，单卡租金 \( \$1.80/\text{hr} \)。<br />
      8 卡节点总理论算力峰值：
      \[ P_{\text{total, A100}} = 8 \times (312 \times 10^{12} \text{ FLOP/s}) = 2.496 \times 10^{15} \text{ FLOP/s} \]
      8 卡节点综合小时租金：
      \[ C_{\text{rate, A100}} = 8 \times \$1.80/\text{hr} = \$14.40/\text{hr} \]
    </li>
    <li>节点有效算力速率：
      \[ R_{\text{eff, A100}} = P_{\text{total, A100}} \times \mu = 2.496 \times 10^{15} \times 0.40 = 9.984 \times 10^{14} \text{ FLOP/s} \]
    </li>
    <li>训练总耗时推算：
      \[ T_{\text{seconds, A100}} = \frac{\text{Total FLOPs}}{R_{\text{eff, A100}}} = \frac{9 \times 10^{20}}{9.984 \times 10^{14}} \approx 901,442.3 \text{ seconds} \]
      换算为小时与天数：
      \[ T_{\text{hours, A100}} = \frac{901,442.3}{3600} \approx 250.40 \text{ hours} \approx 10.43 \text{ days} \]
      集群处理吞吐速率：
      \[ \text{Throughput}_{\text{A100}} = \frac{10^{11} \text{ tokens}}{901,442.3 \text{ s}} \approx 110,933 \text{ tokens/s} \quad (\approx 13,867 \text{ tokens/s per GPU}) \]
    </li>
    <li>总租赁账单：
      \[ \text{Cost}_{\text{A100}} = 250.40 \text{ hours} \times \$14.40/\text{hour} = \$3,605.76 \]
    </li>
    <li>每百万 Token（MTok）训练成本：
      \[ C_{\text{MTok, A100}} = \frac{\$3,605.76}{100,000 \text{ MTok}} \approx \$0.03606 / \text{MTok} \]
    </li>
  </ol>

  <p><strong>对比方案 B：云端租赁 8 张 H100-SXM5-80GB</strong></p>
  <ol>
    <li>硬件参数：单卡 BF16 dense 理论峰值 \( 989 \text{ TFLOPS} = 9.89 \times 10^{14} \text{ FLOP/s} \)，单卡租金 \( \$3.00/\text{hr} \)。<br />
      8 卡节点总理论算力峰值：
      \[ P_{\text{total, H100}} = 8 \times (989 \times 10^{12} \text{ FLOP/s}) = 7.912 \times 10^{15} \text{ FLOP/s} \]
      8 卡节点综合小时租金：
      \[ C_{\text{rate, H100}} = 8 \times \$3.00/\text{hr} = \$24.00/\text{hr} \]
    </li>
    <li>节点有效算力速率：
      \[ R_{\text{eff, H100}} = P_{\text{total, H100}} \times \mu = 7.912 \times 10^{15} \times 0.40 = 3.1648 \times 10^{15} \text{ FLOP/s} \]
    </li>
    <li>训练总耗时推算：
      \[ T_{\text{seconds, H100}} = \frac{\text{Total FLOPs}}{R_{\text{eff, H100}}} = \frac{9 \times 10^{20}}{3.1648 \times 10^{15}} \approx 284,378.1 \text{ seconds} \]
      换算为小时与天数：
      \[ T_{\text{hours, H100}} = \frac{284,378.1}{3600} \approx 78.99 \text{ hours} \approx 3.29 \text{ days} \]
      集群处理吞吐速率：
      \[ \text{Throughput}_{\text{H100}} = \frac{10^{11} \text{ tokens}}{284,378.1 \text{ s}} \approx 351,644 \text{ tokens/s} \quad (\approx 43,956 \text{ tokens/s per GPU}) \]
    </li>
    <li>总租赁账单：
      \[ \text{Cost}_{\text{H100}} = 78.99 \text{ hours} \times \$24.00/\text{hour} = \$1,895.76 \]
    </li>
    <li>每百万 Token（MTok）训练成本：
      \[ C_{\text{MTok, H100}} = \frac{\$1,895.76}{100,000 \text{ MTok}} \approx \$0.01896 / \text{MTok} \]
    </li>
  </ol>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>综合决策对比表与数学经济学本质</h4>
  <table class="tbl small">
    <thead><tr><th>指标维度</th><th>8×A100-SXM4 (80GB)</th><th>8×H100-SXM5 (80GB)</th><th>对比差异与经济收益</th></tr></thead>
    <tbody>
      <tr><td>单卡半精度密集算力峰值</td><td>312 TFLOPS</td><td>989 TFLOPS</td><td>H100 是 A100 的 3.17 倍</td></tr>
      <tr><td>8 卡节点每小时综合租金</td><td>$14.40 / hr</td><td>$24.00 / hr</td><td>H100 节点高 66.7%</td></tr>
      <tr><td>训练总耗时</td><td>250.40 小时（~10.43 天）</td><td>78.99 小时（~3.29 天）</td><td><strong>节省 68.5% 的等待时间（提速 3.17×）</strong></td></tr>
      <tr><td>总租赁花费</td><td>$3,605.76</td><td>$1,895.76</td><td><strong>节省 $1,710.00（真金白银省下 47.4%）</strong></td></tr>
      <tr><td>每 MTok 训练成本</td><td>$0.0361 / MTok</td><td>$0.0190 / MTok</td><td>单位 Token 成本下降 47.4%</td></tr>
    </tbody>
  </table>

  <p><strong>数学系视角的代数本质证明</strong>：</p>
  <p>
    设卡 1（A100）租金为 \( c_1 \)，理论峰值算力为 \( P_1 \)；卡 2（H100）租金为 \( c_2 \)，理论峰值算力为 \( P_2 \)。
    在相同模型算力利用率 \( \mu \) 的前提下，完成总浮点运算量 \( \text{FLOPs} \) 的花费之比为：
  </p>
  \[ \frac{\text{Cost}_2}{\text{Cost}_1} = \frac{T_2 \cdot c_2}{T_1 \cdot c_1} = \frac{\frac{\text{FLOPs}}{\mu P_2} \cdot c_2}{\frac{\text{FLOPs}}{\mu P_1} \cdot c_1} = \frac{c_2 / P_2}{c_1 / P_1} \]
  <p>
    由此可知，决定总账单的唯一关键因子是<strong>单位算力价格（Price per TFLOP）</strong>：
  </p>
  \[ \frac{c_{\text{A100}}}{P_{\text{A100}}} = \frac{\$1.80 / \text{hr}}{312 \text{ TFLOPS} \times 3600 \text{ s/hr}} \approx \$1.603 \times 10^{-6} / \text{TFLOP} \]
  \[ \frac{c_{\text{H100}}}{P_{\text{H100}}} = \frac{\$3.00 / \text{hr}}{989 \text{ TFLOPS} \times 3600 \text{ s/hr}} \approx \$0.843 \times 10^{-6} / \text{TFLOP} \]
  <p>
    <strong>反直觉的终极经济学启示</strong>：虽然 H100 表面小时费率高出 67%，但其单位有效浮点算力便宜了近 47.5%！在模型训练这种「计算总量固定」的任务中，<strong>租用单价更高的 H100 无论在资金开销还是等待时间上都具有双重碾压级优势</strong>。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 Codex Plus 档里，同样一条消息用 Luna 而不是 Astra，对额度的影响是？</p>
  <ul class="opts">
    <li>没有区别，因为共享同一个池子</li>
    <li data-ok>差别很大：官方估算 Luna 每 5 小时可用 250–2000 条，而 Astra 只有 5–45 条，说明两者消耗同一个池子的速度相差一到两个数量级</li>
    <li>Luna 更贵，因为它更快</li>
    <li>只有 Pro 档才有区别</li>
  </ul>
  <p class="why">
    「共享同一个池子」与「不同模型消耗速度不同」并不矛盾——正因为共享，选便宜模型才能让你在同一个窗口里做更多事。
    这也是访谈记录里「不在旗舰与小模型之间分层限额」这句话需要修正的地方。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">你有 3 个 Google AI Pro 账号。下面哪种做法符合 Colab 政策？</p>
  <ul class="opts">
    <li>一个账号的计算单元用完就换另一个继续跑同一个长任务</li>
    <li data-ok>三个账号各自用于不同的学习/项目用途，不为了绕开限额而轮换重负载</li>
    <li>三个账号同时开同一个训练以加快速度</li>
    <li>把三个账号给同学一起用，共同分摊任务</li>
  </ul>
  <p class="why">
    Colab 明确禁止「使用多个账号规避访问或资源用量限制」。合规边界是<em>用途分离</em>，而不是<em>额度合并</em>；
    同时开三个相同任务也属于绕过资源限制的典型形态。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">关于「每周窗口」与「5 小时窗口」同时存在这件事，正确的理解是？</p>
  <ul class="opts">
    <li>只要每周还有余量，就可以不受限制地连续使用</li>
    <li data-ok>两个窗口都要有余量才能继续；即使每周总额充足，也可能在 5 小时窗口内先撞上限</li>
    <li>5 小时窗口只是显示用的，不影响使用</li>
    <li>每周窗口只在 Pro 档生效</li>
  </ul>
  <p class="why">
    官方说明是「如果两种限额同时适用，你需要在两个时段内均有剩余配额才能继续使用」。
    这条约束直接决定了你的工作节奏：把重任务分散到不同窗口，而不是一口气连轴用。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在预训练 1.5B 模型处理 100B Token 的算力选型中，为什么租用小时单价更高的 8×H100 节点反而比 8×A100 节点总花费节省近一半？</p>
  <ul class="opts">
    <li>因为云厂商对 H100 提供了巨额商业现金返还</li>
    <li>因为 H100 不需要使用分布式通信网络</li>
    <li data-ok>因为 H100 的半精度密集算力是 A100 的约 3.17 倍，而每小时单价仅为 A100 的约 1.67 倍，导致单位算力价格（Price per TFLOP）便宜了约 47.4%，因而在相同利用率下总账单更低</li>
    <li>因为 H100 训练模型时可以将 6N 理论算力需求压缩到 2N</li>
  </ul>
  <p class="why">
    总成本正比于 \( \frac{c}{P} \)。由于 \( \frac{c_2/c_1}{P_2/P_1} = \frac{1.67}{3.17} \approx 0.526 \)，H100 虽然单价上涨了 67%，但性能提升达到了 217%，算力性价比（FLOPs per dollar）反向大增，从而在完成固定运算量 \( 9 \times 10^{20} \) FLOPs 时总花费从 $3606 缩减到 $1896。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">关于数据中心自建集群与公有云租赁的 TCO（总体拥有成本）结构对比，下列说法正确的是？</p>
  <ul class="opts">
    <li>自建集群没有 OpEx 开销，只有前期的 CapEx 采购成本</li>
    <li data-ok>自建集群不仅需承担高昂的前置硬件采购 CapEx，还需承担 PUE 能耗、制冷、机房租赁与运维人力的持续 OpEx，且面临硬件 3 年折旧贬值的风险；云端租赁将成本纯转为弹性 OpEx</li>
    <li>云端按需租赁的单价无论何时都必然低于所有折旧后的自建硬件成本</li>
    <li>只有在模型参数量大于 70B 时才需要考虑显存带宽与算术强度</li>
  </ul>
  <p class="why">
    TCO 包含了资本性支出（CapEx）与运营性支出（OpEx）。自建节点不仅要在首日支付数十万美元硬件采购与折旧，还面临持续的电力 PUE 溢价与工程人力开销；而云端按需租用将一切简化为无沉没风险的纯 OpEx。
  </p>
</div>

<div class="acc" data-t="深入：为什么二手的「额度数字」总是错的" data-badge="方法">
  <div class="acc-body">
    <ol>
      <li><strong>档位不同</strong>：$20 / $100 / $200 三档的额度结构完全不同（访谈讲的是最高档）。</li>
      <li><strong>时间不同</strong>：平台随时调整（Claude 在 2026 年 5–9 月做过 +50% 促销，之后永久 +25%）。</li>
      <li><strong>计量不同</strong>：消息数、用量、计算单元是三种完全不同的尺子，不能互相换算。</li>
      <li><strong>任务不同</strong>：同一个模型，多步骤任务与单轮问答的消耗能差好几倍。</li>
      <li><strong>模型更名</strong>：访谈里的模型代称与实际发布名称常常对不上。</li>
    </ol>
    <p>
      <strong>正确做法</strong>：把二手数字当作「结构提示」，把官方页面与你自己账户里的用量页当作「事实来源」。
      本模块的每一处额度说法都给了官方链接，请以链接内容为准。
    </p>
  </div>
</div>
`
});
