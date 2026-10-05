/* content/20-agents.js — 模块 20：智能体系统 */
COURSE.register({
  id: "m20",
  part: 6,
  num: "20",
  title: "智能体系统：工具、规划、记忆与多智能体",
  en: "Agent Systems — Tools, Planning, Memory",
  minutes: 50,
  tags: ["高阶", "智能体", "实用"],
  body: String.raw`
<p class="lead">
  前面十九个模块里，模型都是「被调用一次、给一个答案」。这一模块讲的是把模型放进一个<strong>带状态的循环</strong>之后会发生什么：
  它能读文件、调 API、跑测试、失败重试、自我反思——也会死循环、删错文件、把「看起来成功」当成成功。
  智能体工程的绝大部分工作不是写提示词，而是设计<em>循环的边界</em>：能做什么、花多少、什么时候必须停下来问人。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>零基础入口</h4>
  <p>
    <strong>一句话类比</strong>：单次问答像一位<em>只回答一次问题的顾问</em>；智能体像一位<em>拿着门禁卡的实习生</em>——
    他会自己去查资料、调接口、改文件，出错还会重试。能力被放大的同时，<strong>出错的空间也被同步放大</strong>。<br />
    <strong>这一讲要建立的直觉</strong>：智能体的复杂度不来自模型，而来自<em>循环</em>与<em>副作用</em>。
    凡是能写成固定流程（workflow）的事，就不该用智能体——这一点连最积极推动智能体的团队也是这么建议的。<br />
    <strong>读完你能回答</strong>：一个 agent loop 必须具备哪五个部件？为什么「重试」会制造重复副作用？
    什么情况下多智能体反而<em>不如</em>单智能体？为什么必须用固定任务集做回归测试？
  </p>
</section>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你给智能体一个任务：「把 ai-course 里所有模块的术语补齐，跑一遍 <code>node --check</code>，然后提交。」
    它跑了 47 步、花掉 3.2 M token、改了 9 个文件，最后在对话里说「已完成」。
  </p>
  <p>
    <strong>你必须回答一个问题：它真的完成了吗？你是怎么知道的？</strong>
    如果你唯一的证据是它自己说「已完成」，那你交付的不是一个智能体，而是一个
    <em>会自我报告的随机过程</em>。这一模块剩下的部分，基本都在回答「怎么把它变成一个系统」。
  </p>
</section>

<h3>1. 定义：模型 + 工具 + 循环 + 记忆 + 终止条件</h3>
<p>
  工程语境下的智能体（agent）不是「更聪明的模型」，而是五种部件的组合：
  <strong>模型</strong>（决策者）、<strong>工具</strong>（改变世界或读取世界的手段）、
  <strong>循环</strong>（把工具结果喂回模型）、<strong>记忆</strong>（跨步保留状态）、
  <strong>终止条件</strong>（什么时候停）。少任何一个，系统都会以某种方式失效：
  没有终止条件就是死循环，没有记忆就是每步都从零开始，没有工具就退化成聊天。
</p>
<p>
  Anthropic 的工程文章给了一个很有用的划分（<a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noopener">Building effective agents</a>，2024-12-19）：
  <strong>workflow</strong> 是「用预定义的代码路径编排 LLM 与工具」，<strong>agent</strong> 是「由 LLM 动态决定自己的流程与工具使用」。
  两类都叫 agentic system，但工程含义完全不同：前者的控制流你能画出来，后者的控制流只能被<em>观测</em>。
</p>
<table class="tbl small">
  <thead><tr><th>形态</th><th>控制流由谁决定</th><th>状态</th><th>典型失败</th></tr></thead>
  <tbody>
    <tr><td>单次问答</td><td>调用方</td><td>无</td><td>答错、幻觉</td></tr>
    <tr><td>固定工作流（链式 / 路由 / 并行）</td><td>你写的代码</td><td>由你显式传递</td><td>分支没覆盖到，静默走错路</td></tr>
    <tr><td>智能体（工具循环）</td><td>模型逐步决定</td><td>对话 + 外部记忆</td><td>死循环、过度调用、副作用失控、错报成功</td></tr>
  </tbody>
</table>
<p>把它写成状态机，循环的骨架就三行：</p>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>循环的形式化</h4>
  <p>设第 \(t\) 步的状态为 \(s_t\)，动作为 \(a_t\)，环境返回的观察为 \(o_t\)：</p>
  \[ s_{t+1} = f(s_t,\ a_t,\ o_t), \qquad a_t \sim \pi_\theta(\cdot \mid s_t), \qquad o_t = E(a_t) \]
  <p>动作 \(a_t\) 要么是一次工具调用，要么是一个终止动作。循环在预算 \(B\) 内运行：</p>
  \[ t^\star = \min\{\, t : \mathrm{done}(s_t) = 1 \ \text{or}\ t = B \,\} \]
  <p>两类终止必须同时存在，而且互相独立：<strong>成功终止</strong>来自可验证的判据 \(\mathrm{done}\)，
  <strong>兜底终止</strong>来自预算 \(B\)（步数、token、墙钟时间、金额、副作用次数都可以是 \(B\)）。
  只写前者，遇到无法完成的任务就会跑到天数上限；只写后者，任务完成也不会停，白白烧钱。</p>
  <p>成本上界是平凡的：\(\mathbb{E}[C] \le \sum_{t=1}^{B} c_t\)。真正容易被忽略的是<strong>方差</strong>——
  同一个任务两次运行的步数可能相差一个数量级，所以预算必须按最坏情况设，而不是按平均情况设。</p>
</section>
<div class="flow">
  <div class="nd hi">目标 + 验收标准</div><div class="ar">→</div>
  <div class="nd">模型决定下一步</div><div class="ar">→</div>
  <div class="nd">工具调用（有副作用）</div><div class="ar">→</div>
  <div class="nd">观察结果回灌</div><div class="ar">→</div>
  <div class="nd">可达性检查：能不能被验证？</div><div class="ar">→</div>
  <div class="nd">继续 / 终止 / 交给人</div>
</div>
<p>
  <strong>与「一次问答」的本质区别是状态。</strong>一次问答是无状态的纯函数：同样的输入永远给同样的分布。
  智能体的输出依赖它<em>走过的路径</em>，因此「重跑一次」不等于「重复一次实验」——
  路径不同，副作用也不同。这直接决定了后面两件事：可观测性（必须记录路径）与幂等性（必须容忍重放）。
</p>
<p>
  最后一条经验规则值得单独记住：<strong>先试单次调用，再试工作流，最后才是智能体</strong>。
  复杂度是要用可测量的收益换来的，而不是默认配置。
</p>

<h3>2. 工具调用：schema、校验、重试与权限最小化</h3>
<p>
  2023 年 6 月 13 日，OpenAI 在 API 更新中引入 function calling
  （<a href="https://openai.com/index/function-calling-and-other-api-updates/" target="_blank" rel="noopener">Function calling and other API updates</a>），
  从此「模型输出一段结构化参数、由宿主程序执行」成为标准接口。它的机制很朴素，但每一步都有坑：
</p>
<div class="flow">
  <div class="nd">工具定义（JSON Schema）</div><div class="ar">→</div>
  <div class="nd hi">模型产出参数</div><div class="ar">→</div>
  <div class="nd">校验 / 补全 / 拒绝</div><div class="ar">→</div>
  <div class="nd hi">宿主执行（真实副作用）</div><div class="ar">→</div>
  <div class="nd">结果回灌（截断 / 摘要）</div>
</div>
<pre><code>{
  "name": "read_module",
  "description": "读取课程模块文件的正文。只读，不修改任何文件。",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {"type": "string", "description": "相对 ai-course/ 的路径，例如 content/09-evaluation.js"},
      "max_lines": {"type": "integer", "minimum": 1, "maximum": 2000, "default": 200}
    },
    "required": ["path"],
    "additionalProperties": false
  }
}</code></pre>
<p>注意三件事，它们决定了工具是否可靠：</p>
<ol>
  <li><strong>描述就是提示词</strong>。<code>read_module</code> 与 <code>write_module</code> 的描述必须能让人（和模型）一眼分清边界。
      含糊的工具描述会把智能体带到完全错误的方向上。</li>
  <li><strong>参数要用 schema 约束</strong>：枚举优于自由字符串，<code>additionalProperties: false</code> 能挡掉一半的幻觉参数。</li>
  <li><strong>能改窄就改窄</strong>。Anthropic 提到他们在 SWE-bench 智能体上因为相对路径出错，最后把工具改成<em>只接受绝对路径</em>，
      模型就再也没犯过这个错——这属于「让人不可能犯错的接口设计」（poka-yoke）。</li>
</ol>
<h4>2.1 三层校验，缺一层就会出事</h4>
<table class="tbl small">
  <thead><tr><th>层次</th><th>检查什么</th><th>失败示例</th><th>处理方式</th></tr></thead>
  <tbody>
    <tr><td>语法层</td><td>JSON 能否解析、类型/枚举/必填项</td><td>参数里出现不存在的字段</td><td>返回结构化错误，让模型改一次；连续两次失败就终止</td></tr>
    <tr><td>语义层</td><td>业务约束：路径是否存在、金额是否超限、状态是否允许</td><td>要删的文件不在白名单里</td><td>明确拒绝并说明原因，不要「猜用户的意思」</td></tr>
    <tr><td>权限层</td><td>这次调用是否有权对<em>这个对象</em>做<em>这个动作</em></td><td>只读任务里出现了写操作</td><td>默认拒绝；提升权限需要显式授权</td></tr>
  </tbody>
</table>
<h4>2.2 幂等性：重试一定会制造重复</h4>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么「至少一次」必然重复</h4>
  <p>设单次尝试成功概率为 \(p\)（且失败与成功独立），一直重试到成功的期望尝试次数是</p>
  \[ \mathbb{E}[\text{attempts}] = \frac{1}{p} \]
  <p>
    更要命的是<strong>假失败</strong>：请求其实已经在服务端执行成功，只是响应超时或丢了。
    这时重试会把同一个副作用执行第二次。\(p = 0.9\) 时平均重试 1.11 次，看起来无害；
    但如果副作用是「发一封邮件」「扣一次款」「提交一次 PR」，重复就是事故。
  </p>
  <p>
    解法不是「不要重试」（不重试会丢掉大量本可成功的调用），而是让副作用<strong>可去重</strong>：
    幂等键 \(+\) 唯一约束。工程上等价于把「执行」变成「执行并登记」的原子操作。
  </p>
</section>
<ul>
  <li><strong>幂等键</strong>：由「任务 id + 步骤 id + 工具名 + 参数哈希」拼出唯一键，服务端第一次执行才生效，之后直接返回上次结果。</li>
  <li><strong>只读工具可以随便重试</strong>；写工具必须幂等；不可逆操作（删除、付款、发信）必须走人工确认。</li>
  <li><strong>区分「可重试」与「不可重试」错误</strong>：超时、429、5xx 可重试；400 参数错误、403 权限错误重试一万次也不会变好。</li>
</ul>
<h4>2.3 MCP：把「工具接入」标准化</h4>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>Model Context Protocol 是什么</h4>
  <p>
    MCP 由 Anthropic 于 <strong>2024 年 11 月 25 日</strong>开源发布，定位是「连接 AI 助手与数据所在系统的开放标准」，
    用一套协议替代「每个数据源各写一个定制连接器」
    （<a href="https://www.anthropic.com/news/model-context-protocol" target="_blank" rel="noopener">Introducing the Model Context Protocol</a>）。
    官方规范把它类比为 <em>Language Server Protocol</em>：LSP 让编辑器不必为每种语言各写一遍支持，MCP 想让 AI 应用不必为每个工具各写一遍集成。
  </p>
  <table class="tbl small">
    <thead><tr><th>要素</th><th>内容（依据规范 2025-06-18 版）</th></tr></thead>
    <tbody>
      <tr><td>消息格式</td><td>JSON-RPC 2.0，有状态连接，双向能力协商</td></tr>
      <tr><td>角色</td><td><strong>Host</strong>（发起连接的 LLM 应用）、<strong>Client</strong>（宿主内的连接器）、<strong>Server</strong>（提供上下文与能力的一方）</td></tr>
      <tr><td>服务端提供</td><td><strong>Tools</strong>（可执行函数）、<strong>Resources</strong>（上下文与数据）、<strong>Prompts</strong>（模板化消息与工作流）</td></tr>
      <tr><td>客户端提供</td><td><strong>Sampling</strong>（服务端发起的 LLM 调用）、<strong>Roots</strong>（文件系统/URI 边界）、<strong>Elicitation</strong>（向用户追问补充信息）</td></tr>
      <tr><td>传输</td><td><strong>stdio</strong>（本地子进程）与 <strong>Streamable HTTP</strong>（取代 2024-11-05 版的 HTTP+SSE）</td></tr>
    </tbody>
  </table>
  <p>
    <strong>对安全的影响必须说清楚。</strong>规范自己写明：工具代表任意代码执行，必须谨慎对待；
    尤其是<em>「工具行为的描述（例如 annotations）应被视为不可信，除非来自可信服务器」</em>——
    也就是说，<strong>MCP 服务端返回的工具描述本身就是一个注入面</strong>。
    规范只能在协议层面提出原则（用户同意、数据隐私、工具安全），并明确说明它无法在协议层强制这些原则，
    实现者需要自己实现授权与同意流程。
  </p>
</section>
<h4>2.4 工具层的典型失败模式</h4>
<table class="tbl small">
  <thead><tr><th>失败</th><th>表现</th><th>缓解</th></tr></thead>
  <tbody>
    <tr><td>参数幻觉</td><td>编造不存在的字段名或路径</td><td>严格 schema + 明确错误信息 + 一次改正机会</td></tr>
    <tr><td>返回值爆炸</td><td>一次工具调用回灌 20 万 token，上下文被冲垮</td><td>在工具内部截断/摘要，只回传需要的字段</td></tr>
    <tr><td>静默失败</td><td>HTTP 200，但 body 里是错误信息</td><td>定义明确的成功判据，不能只看状态码</td></tr>
    <tr><td>重试风暴</td><td>服务端抖动时智能体并发重试，把对方打死</td><td>指数退避 + 抖动 + 熔断 + 全局调用上限</td></tr>
    <tr><td>工具描述被污染</td><td>注入内容伪装成工具说明，诱导模型调用危险工具</td><td>工具描述视为不可信输入；白名单；权限最小化</td></tr>
  </tbody>
</table>

<h3>3. 规划范式：从 ReAct 到动作树搜索</h3>
<p>
  规划要解决的问题是：<em>在不知道要走几步的情况下，怎么把「想」和「做」交替起来。</em>
  历史上形成了四类做法，它们的差别几乎可以完全用「代价」和「方差」解释。
</p>
<table class="tbl small">
  <thead><tr><th>范式</th><th>机制</th><th>代价</th><th>适合</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>ReAct</strong></td>
      <td>推理与行动交错：想一句 → 调一次工具 → 看结果 → 再想</td>
      <td>步数线性增长；工具调用次数 ≈ 步数</td>
      <td>需要外部信息的问答、网页操作、检索式任务</td>
    </tr>
    <tr>
      <td><strong>Plan-and-Execute</strong></td>
      <td>先一次性写出完整计划，再按计划逐步执行</td>
      <td>计划步的一次性大额生成；计划错了整条链都错</td>
      <td>任务结构可预判、子步骤依赖明确</td>
    </tr>
    <tr>
      <td><strong>Reflexion</strong></td>
      <td>失败后写一段「反思」存进记忆，下次尝试带着它重来</td>
      <td>每轮尝试的完整成本 × 尝试次数</td>
      <td>有明确成败判据、可反复试错的任务（代码、游戏）</td>
    </tr>
    <tr>
      <td><strong>动作树搜索</strong></td>
      <td>把动作序列当搜索树，用价值估计 + 回溯选路径（如 MCTS）</td>
      <td>节点数随分支与深度指数增长</td>
      <td>子任务可模拟、失败可回滚、预算充足</td>
    </tr>
  </tbody>
</table>
<p>几个可以直接引用的实证结果（都是原始论文口径）：</p>
<ul>
  <li>
    <strong>ReAct</strong>（Yao 等，<a href="https://arxiv.org/abs/2210.03629" target="_blank" rel="noopener">arXiv:2210.03629</a>，2022）
    在两个交互式决策基准上超过模仿学习与强化学习基线：ALFWorld 绝对成功率 <strong>+34%</strong>，WebShop <strong>+10%</strong>，
    且只用了一到两个上下文示例。它的关键收益不是「更聪明」，而是<em>用外部观察抑制幻觉与错误传播</em>。
  </li>
  <li>
    <strong>Reflexion</strong>（Shinn 等，<a href="https://arxiv.org/abs/2303.11366" target="_blank" rel="noopener">arXiv:2303.11366</a>，2023）
    不更新任何权重，只把语言化的反思存进情节记忆，在 HumanEval 上报告 <strong>91% pass@1</strong>，
    论文对比的此前最好结果（GPT-4）为 80%。
  </li>
  <li>
    <strong>Plan-and-Solve</strong>（Wang 等，<a href="https://arxiv.org/abs/2305.04091" target="_blank" rel="noopener">arXiv:2305.04091</a>，ACL 2023）
    把「先制定计划、再执行子任务」写进零样本提示，在十个数据集上稳定优于 zero-shot CoT，并指出 zero-shot CoT 的三类错误：
    计算错误、漏步、语义误解。
  </li>
  <li>
    <strong>LATS</strong>（Zhou 等，<a href="https://arxiv.org/abs/2310.04406" target="_blank" rel="noopener">arXiv:2310.04406</a>，2023）
    把蒙特卡洛树搜索接到 LM 的推理-行动上，用 LM 充当价值函数与反思器，
    报告 HumanEval 上 GPT-4 的 pass@1 达到 <strong>92.7%</strong>。
  </li>
</ul>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>树搜索的代价：先算节点数再选范式</h4>
  <p>分支因子 \(b\)、深度 \(d\) 的完全树的节点数：</p>
  \[ N = \frac{b^{\,d+1} - 1}{b - 1} \]
  <p>取 \(b = 3\)、\(d = 4\)（每步三个候选动作、四步）：</p>
  \[ N = \frac{3^{5} - 1}{2} = \frac{242}{2} = 121 \]
  <p>
    也就是说，一次「四步任务」在树搜索下要做 <strong>121 次</strong> 模型或环境评估量级的工作，而 ReAct 只需要 <strong>4 次</strong>。
    这就是为什么树搜索只在<em>可以便宜地模拟或回滚</em>的场景（代码编译、游戏、可重放环境）才划算——
    如果每一步都有不可逆的真实副作用，搜索本身就不可行。
  </p>
  <p>
    用统一的口径比较更清楚：设单步成本 \(c\)、成功所需的平均尝试轮数 \(R\)，
    ReAct 的成本约 \(c \cdot \mathbb{E}[\text{steps}]\)，
    Reflexion 约 \(c \cdot R \cdot \mathbb{E}[\text{steps}]\)，
    树搜索约 \(c \cdot N\)。三者差的是数量级，不是百分比。
  </p>
</section>
<p>
  <strong>什么时候不要规划：</strong>任务短（1–2 步）、结果可自动验证、或者失败代价接近零。
  这三种情况下，规划只是给模型增加了一次犯错的机会。
</p>

<h3>4. 记忆：短期上下文、摘要压缩、外部记忆、技能库</h3>
<table class="tbl small">
  <thead><tr><th>类型</th><th>载体</th><th>保留什么</th><th>失效方式</th></tr></thead>
  <tbody>
    <tr><td>短期上下文</td><td>对话历史（KV cache）</td><td>最近若干步的推理与观察</td><td>超出窗口被截断，最早的约束先丢</td></tr>
    <tr><td>摘要压缩</td><td>由模型写的阶段总结</td><td>已完成的工作、关键决策、未决问题</td><td>摘要丢细节，硬约束被「释义」掉</td></tr>
    <tr><td>外部记忆</td><td>文件 / 向量库 / 数据库</td><td>事实、文档、中间产物</td><td>检索召回不全；写入内容过期或相互矛盾</td></tr>
    <tr><td>技能库</td><td>可复用的脚本或工具</td><td>「怎么做」的程序性知识</td><td>环境变化后脚本静默失效</td></tr>
  </tbody>
</table>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>压缩率与信息损失</h4>
  <p>设原文长度 \(|c|\)，摘要长度 \(|c'|\)，压缩比</p>
  \[ \rho = \frac{|c'|}{|c|} \]
  <p>
    \(\rho\) 越小越省 token，但被丢掉的信息不可恢复。工程上关键不是把 \(\rho\) 压到多小，
    而是<strong>把内容分成两类</strong>：
  </p>
  <ul>
    <li><strong>可压缩区</strong>：探索过程、失败的尝试、冗长的工具输出——这些可以只留结论。</li>
    <li><strong>不可压缩区</strong>：任务的硬约束、禁止事项、验收标准、外部协议的版本号——
      这些必须<em>逐字</em>保留，且在每一轮都被重新注入（例如放在系统提示的固定位置，而不是靠摘要传递）。</li>
  </ul>
  <p>
    一个实用的判据：如果一条信息<strong>被误解的代价高于它占用的 token 成本</strong>，它就不该进摘要管道。
    这也解释了为什么长任务的智能体常常在第 40 步之后开始违反第 1 步就写明的约束。
  </p>
</section>
<p>
  Anthropic 在多智能体研究系统的工程复盘里给了两条可直接借用的记忆实践
  （<a href="https://www.anthropic.com/engineering/multi-agent-research-system" target="_blank" rel="noopener">How we built our multi-agent research system</a>，2025-06-13）：
  <strong>（1）把计划写进外部记忆</strong>——因为上下文超过窗口会被截断，而计划不能丢；
  <strong>（2）让子智能体把产物写进文件系统，只把轻量引用回传</strong>——避免长产物在多层传递中被「传话游戏」式地损耗与重复计费。
</p>
<p>
  最后一个容易被忽略的点：<strong>记忆是有写入代价的</strong>。不加治理的外部记忆会变成垃圾桶——
  检索到的内容互相矛盾，智能体就会在两个版本之间摇摆。写入时至少要带三样东西：来源、时间戳、适用范围。
</p>

<h3>5. 多智能体：分工的收益与通信的代价</h3>
<p>
  先看通信开销。设 \(n\) 个子智能体共享一个协调者，两两互相通信，则消息通道数量分别是：
</p>
\[ M_{\text{hub}} = 2(n-1), \qquad M_{\text{mesh}} = n(n-1) \]
<p>
  \(n = 6\) 时前者是 10 条、后者是 30 条；\(n = 12\) 时是 22 条对 132 条。
  更重要的不是条数，而是<strong>每条通道都要传递足够完整的上下文</strong>——
  否则子智能体会基于各自的隐含假设做决定，最后合不起来。
</p>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>支持多智能体的证据</h4>
  <p>
    Anthropic 报告：在他们的内部研究评测上，以 Claude Opus 4 为主智能体、Claude Sonnet 4 为子智能体的多智能体系统，
    比单智能体 Claude Opus 4 <strong>高出 90.2%</strong>。他们的解释是「多智能体主要在帮助花掉足够的 token」：
    在 BrowseComp 上，三个因素（token 用量、工具调用次数、模型选择）解释了 <strong>95%</strong> 的性能方差，
    其中<strong>仅 token 用量就解释 80%</strong>。
  </p>
  <p>但同一篇文章给出了代价与边界：</p>
  <ul>
    <li><strong>token 成本</strong>：普通智能体约为聊天交互的 <strong>4 倍</strong>，多智能体系统约为 <strong>15 倍</strong>。</li>
    <li><strong>任务适配</strong>：需要所有智能体共享上下文、或智能体之间依赖很多的任务不适合多智能体；
      文中直接说「大多数编码任务真正可并行的部分比研究少」，且当前的 LLM 智能体还不擅长实时协调与委派。</li>
    <li><strong>工程复杂度</strong>：错误会复利，需要从断点恢复、彩虹部署（新旧版本并存逐步切流）、
      以及能观测「决策模式与交互结构」的追踪系统。</li>
  </ul>
</section>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>反面证据：多智能体并不总是更好</h4>
  <ul>
    <li>
      <strong>系统性评测</strong>：Cemri 等人的 <em>Why Do Multi-Agent LLM Systems Fail?</em>
      （<a href="https://arxiv.org/abs/2503.13657" target="_blank" rel="noopener">arXiv:2503.13657</a>，2025）
      开篇就指出：尽管多智能体系统热度很高，它们在常见基准上的<strong>性能增益往往很小</strong>。
      他们收集了跨 7 个主流多智能体框架的 <strong>1600 多条</strong>标注轨迹，
      基于 150 条轨迹的人工分析构建了 <strong>MAST</strong> 失败分类法（标注者间一致性 kappa = 0.88），
      得到 <strong>14 种失败模式</strong>，聚成三类：<em>系统设计问题</em>、<em>智能体间不对齐</em>、<em>任务验证</em>。
      注意这三类里，只有一部分属于「模型能力不够」——<strong>更多是编排与验证的问题</strong>。
    </li>
    <li>
      <strong>工程立场</strong>：Cognition 的 Walden Yan 在 <em>Don't Build Multi-Agents</em>
      （<a href="https://cognition.com/blog/dont-build-multi-agents" target="_blank" rel="noopener">2025-06-12</a>）里给出两条原则：
      <strong>（1）共享上下文，且共享完整的 agent trace 而不只是单条消息；（2）动作携带隐含决策，冲突的隐含决策必然导致坏结果。</strong>
      他的结论是：默认应该排除不满足这两条原则的架构，优先用单线程线性智能体，靠「压缩历史的模型」而不是靠并行来扩展。
      这是一个明确的立场而非定论，但它与 MAST 的失败分类高度吻合。
    </li>
  </ul>
</section>
<table class="tbl small">
  <thead><tr><th>判断项</th><th>适合多智能体</th><th>不适合（用单智能体或工作流）</th></tr></thead>
  <tbody>
    <tr><td>子任务独立性</td><td>真正互不依赖（多个方向的检索、多条线索的调查）</td><td>互相依赖、需要频繁互相修正</td></tr>
    <tr><td>上下文体量</td><td>单窗口装不下，需要分开装</td><td>一份上下文就能装完</td></tr>
    <tr><td>结果可合并性</td><td>产物是可拼接的清单/文档/数据</td><td>产物必须风格与决策完全一致（多数编码任务）</td></tr>
    <tr><td>经济性</td><td>任务价值高到能付得起约 15 倍的 token</td><td>低价值、高频次任务</td></tr>
    <tr><td>可验证性</td><td>有客观判据（测试、引用核对）</td><td>只能靠人肉判断「好不好」</td></tr>
  </tbody>
</table>
<p>
  <strong>一句话总结：多智能体买到的主要是「并行」和「独立上下文」，不是「更聪明」。</strong>
  如果你的收益来自「多花 token 多想几遍」，那么先试单智能体加更多轮次——它更便宜、更好调试、也更容易做回归测试。
</p>

<h3>6. 工程与评估：trace、沙箱、预算、HITL</h3>
<p>
  智能体是<strong>有状态的长运行进程</strong>，所以它的问题更像分布式系统的问题，而不是机器学习问题。
  四件事必须在上线前想清楚：
</p>
<h4>6.1 可观测性：没有 trace 就没有调试</h4>
<p>
  单次问答出错，你看一眼输入输出就够了；智能体跑 47 步后出错，你必须知道<em>是哪一步开始偏的</em>。
  最低要求是「完整 trace」：每一步的模型输入（或哈希）、输出的工具调用、工具的真实返回、
  耗时与 token、以及终止原因。Anthropic 的经验是：用户报告「找不到明显的信息」时，
  没有 trace 就完全无法判断是搜索词差、来源差还是工具挂了。
</p>
<h4>6.2 预算与沙箱</h4>
<table class="tbl small">
  <thead><tr><th>预算维度</th><th>典型上限</th><th>超限时的行为</th></tr></thead>
  <tbody>
    <tr><td>步数 / 工具调用次数</td><td>简单事实查询 3–10 次调用；复杂任务另计</td><td>停止并把中间结果交回人</td></tr>
    <tr><td>token</td><td>按单任务金额上限倒推</td><td>触发摘要压缩，再超则终止</td></tr>
    <tr><td>墙钟时间</td><td>交互式 30–60 秒；批处理可放宽</td><td>降级到已有结果的次优版本</td></tr>
    <tr><td>副作用次数</td><td>写操作按条数限额（如最多 3 个文件）</td><td>强制人工审批下一步</td></tr>
  </tbody>
</table>
<p>
  <strong>沙箱不是可选项。</strong>Anthropic 的建议原话是「在沙箱环境中充分测试，并配上合适的护栏」。
  落地时至少做到：文件系统访问限定在项目目录、网络出口白名单、凭据按最小权限发放、
  删除类操作先做软删除。这一点与模块 12（网络、代理与凭据）直接相关——
  智能体通常运行在与你同源的网络身份下，它越权等于你越权。
</p>
<h4>6.3 人机接口（HITL）分级</h4>
<div class="grid2">
  <div class="card">
    <h5>可以全自动</h5>
    <p>只读检索、草稿生成、跑测试、格式检查、把结果写进新文件。错了的代价是返工。</p>
  </div>
  <div class="card">
    <h5>必须人工确认</h5>
    <p>修改既有文件、提交 PR、发送对外消息、调用付费接口。错了的代价是污染状态或花钱。</p>
  </div>
  <div class="card">
    <h5>必须双人 / 不可自动化</h5>
    <p>删除数据、付款、改权限、对外发布。错了的代价不可逆。</p>
  </div>
  <div class="card">
    <h5>必须留痕</h5>
    <p>以上每一类都要保留可审计的 trace 与幂等键，事后能回答「谁在什么时候改了什么」。</p>
  </div>
</div>
<h4>6.4 评估：固定任务集 + 失败归因</h4>
<p>
  智能体的评估与模块 09 的评估方法论是同一套东西，只是指标换了。因为路径不唯一，
  <strong>要评结果，不要评过程</strong>：给定任务描述与验收标准，只看最终状态对不对。
  Anthropic 的做法值得抄：早期就用 <strong>约 20 条</strong>真实使用场景的查询开始测——
  在改进空间还很大的阶段，20 条足以看出 30% 到 80% 这种量级的变化。
</p>
<table class="tbl small">
  <thead><tr><th>指标</th><th>怎么量</th><th>为什么重要</th></tr></thead>
  <tbody>
    <tr><td>任务成功率</td><td>通过验收标准的比例（要有可执行的判据）</td><td>唯一的「好」的定义</td></tr>
    <tr><td>步数 / 工具调用数</td><td>分布而不是均值</td><td>长尾步数通常意味着迷路</td></tr>
    <tr><td>成本</td><td>每任务 token 与金额</td><td>决定这件事能不能规模化</td></tr>
    <tr><td>方差</td><td>同一任务多次运行的差异</td><td>高方差 = 不能交付给用户</td></tr>
    <tr><td>失败归因</td><td>模型错 / 工具错 / 编排错</td><td>决定你下一步该修什么</td></tr>
  </tbody>
</table>
<p>失败归因是这一节最实用的一张表，因为它直接告诉你该动哪一层：</p>
<table class="tbl small">
  <thead><tr><th>症状</th><th>归因</th><th>修法</th></tr></thead>
  <tbody>
    <tr><td>参数正确但工具返回错误</td><td>工具/服务问题</td><td>修工具、加校验、加降级路径</td></tr>
    <tr><td>参数本身就不对</td><td>模型或工具描述问题</td><td>改工具描述与示例、缩小参数空间</td></tr>
    <tr><td>每一步都对，合起来不对</td><td>编排问题</td><td>改控制流、加中间校验点</td></tr>
    <tr><td>做对了但没停</td><td>终止条件问题</td><td>加显式的 done 判据与预算</td></tr>
    <tr><td>报告成功但状态没变</td><td>验证缺失</td><td>用外部状态判定，不信自然语言自述</td></tr>
  </tbody>
</table>

<h3>7. 幂等、超时与重试：把「至少一次」变成「恰好一次效果」</h3>
<p>
  第 2.2 节说明了「为什么必须幂等」。这一节把它做成可以照抄的规则：先分类错误，再定退避，
  最后用幂等键把副作用收口。顺序不能反——先写重试、后补幂等，等于先埋雷再找雷。
</p>
<h4>7.1 先分类，再重试</h4>
<table class="tbl small">
  <thead><tr><th>错误类别</th><th>典型例子</th><th>可重试</th><th>退避策略</th><th>是否消耗预算</th></tr></thead>
  <tbody>
    <tr>
      <td>瞬时抖动</td><td>连接超时、5xx、429</td><td>是</td>
      <td>指数退避加抖动，上限 3–5 次</td><td>是（每次尝试都算一次工具调用）</td>
    </tr>
    <tr>
      <td>调用方参数错误</td><td>参数校验失败、缺必填字段、类型不对</td><td>否（重试一万次也不会变好）</td>
      <td>不重试；把结构化错误回灌给模型改一次</td><td>是</td>
    </tr>
    <tr>
      <td>权限或配额错误</td><td>403、402、余额不足、被限流封禁</td><td>否</td>
      <td>立即停止并向人升级</td><td>否（不该继续烧钱）</td>
    </tr>
    <tr>
      <td><strong>结果未知</strong></td><td>超时、连接在响应前断开</td><td>只有幂等操作才可重试</td>
      <td>带同一个幂等键重试</td><td>是</td>
    </tr>
    <tr>
      <td>业务级失败</td><td>校验不通过、测试红、指标不达标</td><td>分情况</td>
      <td>把失败信息回灌，计入步数而不是重试次数</td><td>是</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>「结果未知」是唯一真正危险的一类</strong>：它既不是成功也不是失败，而重试策略通常写在这一类上。
  默认规则应该只有一条：<em>这个操作带幂等键，才可以自动重放；否则宁可暂停并交给人。</em>
  把「业务级失败」和「瞬时抖动」分开也很重要——前者需要的是一次新的推理，后者需要的是一次新的请求，
  混在一起会让重试预算被业务错误吃光。
</p>
<h4>7.2 手算：重试的期望代价与重复概率</h4>
<p>设单次成功概率 \(p = 0.9\)，失败后最多再试 2 次（共 3 次尝试），则期望尝试次数为</p>
\[ \mathbb{E}[\text{attempts}] = \frac{1 - 0.1^{3}}{0.9} \approx 1.111 \]
<p>
  也就是平均多花约 <strong>11%</strong> 的调用，看起来无害。但真正要看的是「假失败」：
  假设有 <strong>2%</strong> 的调用其实已经在服务端执行成功、只是响应在返回途中丢了。
  1000 次写操作里，这类事件约有 <strong>20 次</strong>；如果没有幂等键，就是约 20 次重复副作用。
  这就是第 2.2 节那句话的量化版本：<em>重复不是概率极低的意外，而是每次超时都会发生的常态</em>。
</p>
<p>
  幂等键本身也要算碰撞概率。用 \(b\) 位随机键、共 \(N\) 次调用，碰撞概率可用生日近似：
</p>
\[ P_{\text{collision}} \approx 1 - e^{-N^{2} / 2^{\,b+1}} \]
<p>
  \(N = 10^{6}\)、\(b = 128\) 时，\(N^{2}/2^{129} \approx 1.5 \times 10^{-27}\)，可以当成零；
  而 \(b = 32\) 时同一个量级是 \(10^{12}/2^{33} \approx 116\)，早已饱和——键会大量碰撞，
  于是「第二次写入被当成已执行」而静默丢数据。<strong>用 128 位（UUIDv4/UUIDv5 或 32 位十六进制哈希）是极便宜的安全边际。</strong>
  键的构成建议是「任务 id + 步骤 id + 工具名 + 参数哈希」：这样同一步重放天然命中，
  不同任务也不会互相顶掉。
</p>
<h4>7.3 退避参数怎么定</h4>
<table class="tbl small">
  <thead><tr><th>参数</th><th>常用取值</th><th>依据</th><th>调错的症状</th></tr></thead>
  <tbody>
    <tr><td>单次超时</td><td>该工具历史延迟的 p99，再乘 1.5–2 倍</td><td>超时太短会制造大量假失败与重复；太长会拖住整个循环</td><td>重复副作用变多（太短）；任务墙钟时间失控（太长）</td></tr>
    <tr><td>最大尝试次数</td><td>3–5 次</td><td>\(p = 0.9\) 时 3 次已到 1.11 次期望；继续加收益极小而尾部成本高</td><td>重试风暴、把下游打死</td></tr>
    <tr><td>退避基数</td><td>0.2–1 秒，按 \(2^{\text{attempt}}\) 增长</td><td>给下游恢复时间，而不是立刻再打</td><td>服务端抖动被放大成雪崩</td></tr>
    <tr><td>抖动</td><td>在退避时间上加 \(U(0, 0.1)\) 秒量级的随机</td><td>避免多个客户端同步重试（惊群）</td><td>周期性尖峰</td></tr>
    <tr><td>熔断阈值</td><td>连续失败 5 次即停用该工具，冷却 30 秒后半开</td><td>下游整体故障时，重试没有意义</td><td>整条任务在必然失败的工具上空转</td></tr>
  </tbody>
</table>

<h3>8. 权限、预算与终止条件：把边界写成可执行的清单</h3>
<p>
  第 2.1 节讲了「三层校验」，第 6.2 节讲了「预算与沙箱」。这一节把两者收成一个问题：
  <strong>如果模型的每一步都由它自己决定，那么什么在保证它不会越界、也不会无限烧钱？</strong>
  答案只能是你代码里的允许列表、预算常量与终止条件，不能是提示词里的请求。
</p>
<h4>8.1 手算：47 步任务的 token 账本</h4>
<p>
  回到本模块开头那个例子：智能体跑了 47 步、花掉 3.2 M token，最后在对话里说「已完成」。
  这个数字并不夸张，它来自每一轮都把<em>到目前为止的全部历史</em>重新送进模型——
  也就是你在为同一个 token 反复付费。设第 \(t\) 步的上下文长度为 \(L_t\)，每步新增内容
  （模型输出加工具返回）为 \(\Delta\)，则
</p>
\[ L_t = L_{t-1} + \Delta, \qquad C_{\text{tokens}} = \sum_{t=1}^{T} L_t \]
<p>
  取 \(T = 47\)、起步上下文 \(L_0 = 4000\) 与每步新增 \(\Delta = 1000\)，第 47 步的上下文约
  \(L_{47} = 4000 + 47 \times 1000 = 51000\) token，整个任务累计
</p>
\[ C_{\text{tokens}} = \sum_{t=1}^{47}(4000 + 1000t) = 47 \times 4000 + 1000 \times \frac{47 \times 48}{2} = 188000 + 1128000 = 1316000 \]
<p>
  约 1.3 M token；若每步新增换成一个更啰嗦的 2500 token（工具回传完整文件就会这样），
  累计约 3.0 M，与开头的 3.2 M 是同一量级。<strong>真正的结论不是「47 步很贵」，而是
  「上下文随步数线性增长，总消耗随步数近似平方增长」</strong>：步数翻倍，账单大约翻两番。
  这解释了为什么第 4 节的摘要压缩与这里的步数预算其实是同一件事的两端——
  一个压每次的长度，一个压次数。
</p>
<h4>8.2 手算：预算该设多大</h4>
<p>
  设每一步有独立概率 \(p = 0.3\) 找到成功动作（试探型任务的典型量级），预算为 \(B\) 步时，
  至少成功一次的概率是
</p>
\[ P(\text{success within } B) = 1 - (1-p)^{B} \]
<p>
  \(B = 5\) 时 \(1 - 0.7^{5} \approx 0.832\)；\(B = 10\) 时约 \(0.972\)；\(B = 20\) 时约 \(0.9992\)。
  <strong>从 10 步加到 20 步，成功率只多 2.7 个百分点，成本却翻倍</strong>——
  这就是「预算按目标反推，而不是凭感觉设」的具体含义。
</p>
<p>反推公式同样简单。先定可接受的单任务失败率，再解步数上限：</p>
\[ B \ge \frac{\ln(\text{failure tolerance})}{\ln(1-p)} \]
<p>
  取 \(p = 0.3\)、允许 5% 失败：\(B \ge \ln 0.05 / \ln 0.7 \approx 8.4\)，取 \(B = 9\)。
  再用「每步平均成本乘期望步数」估出单任务金额上限，两个数一起写成代码常量。
  <strong>关键是把它们写成常量，而不是写在系统提示里求模型遵守</strong>——常量会被程序强制执行，
  提示词只会被模型「尽量考虑」。
</p>
<h4>8.3 权限矩阵：按任务发放，而不是按你的身份发放</h4>
<table class="tbl small">
  <thead><tr><th>能力</th><th>读 / 写</th><th>作用域</th><th>可逆性</th><th>默认策略</th></tr></thead>
  <tbody>
    <tr><td>读取项目文件</td><td>读</td><td>项目目录（白名单）</td><td>不适用</td><td>允许；越界路径直接拒绝并记录</td></tr>
    <tr><td>写入新文件</td><td>写</td><td>指定输出目录</td><td>可逆（删掉即可）</td><td>允许并限额（如每次任务不超过 3 个文件）</td></tr>
    <tr><td>修改既有文件</td><td>写</td><td>本次任务显式声明的文件列表</td><td>可逆（有版本控制）</td><td>需要显式声明；超出声明范围一律拒绝</td></tr>
    <tr><td>执行命令 / 提交代码</td><td>写</td><td>沙箱容器或临时分支</td><td>可逆（分支可弃）</td><td>仅在沙箱内允许；不接触主分支与线上环境</td></tr>
    <tr><td>删除数据 / 付款 / 对外发消息</td><td>写</td><td>不可控</td><td><strong>不可逆</strong></td><td>默认禁止；必须人工确认，并做软删除兜底</td></tr>
  </tbody>
</table>
<p>
  这张表要直接变成代码里的允许列表（allowlist）。<strong>系统提示是建议，允许列表才是边界</strong>；
  只靠前者，一次提示注入（把指令藏在被读取的文档里）就能让边界消失。这与模块 21 的结论一致：
  提示注入没有「更好的提示词」解，只有把权限收窄。
</p>
<h4>8.4 终止条件：成功判据与兜底必须互相独立</h4>
<ol>
  <li>
    <strong>成功终止由外部状态判定</strong>：测试退出码为 0、文件里存在某个字符串、
    数据库里的目标行符合预期。绝不能是模型说「我完成了」。
  </li>
  <li>
    <strong>兜底终止至少四条</strong>：步数、token、墙钟时间、副作用次数。任意一条触发就停，
    并把中间产物与完整 trace 写盘交回人。
  </li>
  <li>
    <strong>停滞检测</strong>：连续 \(n\) 步（\(n = 3\) 是常用起点）的动作与观察高度重复，就判定为打转并终止。
    这是治「长尾步数」最有效的一条。
  </li>
  <li>
    <strong>终止原因必须落盘</strong>：done / step-limit / token-limit / timeout / write-limit / stuck / error。
    事后归因、算成功率、定预算，全都依赖这一个字段。
  </li>
</ol>

<h3>9. 失败模式复现手册：能跑起来的排查表</h3>
<p>
  这张表与第 6.4 节的归因表互补：6.4 告诉你<em>该修哪一层</em>，这里告诉你<em>怎么在本地复现出来</em>。
  「可复现」的意思很具体：按「最小复现」一列做一次，你就能在自己机器上看到同样的症状；
  否则你只是在猜，而猜错的代价是改错地方。
</p>
<table class="tbl small">
  <thead><tr><th>症状</th><th>最小复现</th><th>根因</th><th>一行验证</th><th>对策</th></tr></thead>
  <tbody>
    <tr>
      <td>上下文被一次工具输出冲垮</td>
      <td>让某个工具返回一份 1 万行的文件全文</td>
      <td>工具返回没有上限，观察直接进上下文</td>
      <td>打印每次 observation 的 token 数分位数，看 p99</td>
      <td>工具内部截断或摘要，只回传需要的字段与截断标记</td>
    </tr>
    <tr>
      <td>重试造成重复副作用</td>
      <td>让写工具执行到一半抛超时，再用本地桩强迫重试</td>
      <td>没有幂等键，「至少一次」语义被放大</td>
      <td>比对去重表记录数与真实状态变更次数是否相等</td>
      <td>幂等键加唯一约束；不可逆操作人工确认</td>
    </tr>
    <tr>
      <td>报告成功但状态没变</td>
      <td>把成功判据改成「工具返回 ok 即成功」，而工具什么都不做</td>
      <td>用自述当验证，而不是外部状态</td>
      <td>跑一个只读校验工具，直接读文件或数据库确认目标状态</td>
      <td>成功判据只认外部状态；把校验步骤写成必走的一步</td>
    </tr>
    <tr>
      <td>第 40 步开始违反第 1 步的约束</td>
      <td>把系统提示里的硬约束写得很长，然后跑一个 50 步任务</td>
      <td>历史被摘要压缩，硬约束被「释义」掉了</td>
      <td>在 trace 里搜索约束关键词，看它最后一次出现在第几步</td>
      <td>不可压缩区每轮重新注入，放在固定位置，不进摘要管道</td>
    </tr>
    <tr>
      <td>步数长尾（平均 20 步，个别 90 步）</td>
      <td>同一任务连跑 10 次，记录每次步数</td>
      <td>缺少停滞检测，遇到死路就无限试探</td>
      <td>画步数直方图，看 p50 与 p99 的比值</td>
      <td>加停滞检测；按 p99 设预算；把长尾样本收进回归集</td>
    </tr>
    <tr>
      <td>参数幻觉导致工具报错</td>
      <td>把工具 schema 的 additionalProperties 限制去掉，观察模型是否开始编字段</td>
      <td>schema 太松，模型用「看起来合理」的字段名</td>
      <td>统计校验失败里「未知字段」所占的比例</td>
      <td>严格 schema 加枚举与必填项；结构化错误只回灌一次</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>怎么用这张表</strong>：每次线上出问题，先把症状归到其中一行，再照着「最小复现」写一个不到 20 行的脚本存进仓库。
  攒到五六个这样的脚本，你就有了智能体的<em>事故库</em>——
  它比任何提示词模板都更能防止同类问题复发，也正是第 6.4 节「固定任务集」的野生版本。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：给一个最小智能体加上「可验证的成功」</h4>
  <p>
    目标不是写一个聪明的智能体，而是写一个<strong>你愿意相信其「完成」结论</strong>的循环。
    下面这段代码不依赖网络：模型与工具都用桩函数，你可以直接把它跑起来，
    然后故意让工具返回「有点错」的结果，看你的判定逻辑会不会被骗。
  </p>
<pre><code><span class="cm"># 最小可验证智能体循环：预算 + 幂等 + 外部判定 + 失败归因</span>
import json

STEP_LIMIT = 12          <span class="cm"># 兜底终止：步数</span>
WRITE_LIMIT = 3          <span class="cm"># 副作用预算：最多写 3 次</span>

state = {"task": "把 09-evaluation 的术语补进 glossary",
         "done": False, "steps": 0, "writes": 0, "trace": []}

def model_step(s):        <span class="cm"># 桩：真实项目里换成 LLM 调用</span>
    if s["writes"] &lt; 1:
        return {"tool": "write_entry", "args": {"key": "permutation-test"}}
    return {"tool": "verify_glossary", "args": {}}

def write_entry(args):    <span class="cm"># 有副作用：必须幂等</span>
    return {"ok": True, "idem_key": "glossary:" + args["key"], "changed": True}

def verify_glossary(args):<span class="cm"># 外部判定：读真实状态，不信自述</span>
    ok = state["writes"] &gt;= 1
    return {"ok": ok, "reason": "glossary entry present" if ok else "missing key"}

TOOLS = {"write_entry": write_entry, "verify_glossary": verify_glossary}
SIDE_EFFECTS = {"write_entry"}

while state["steps"] &lt; STEP_LIMIT:
    state["steps"] += 1
    call = model_step(state)
    name, args = call["tool"], call["args"]
    if name in SIDE_EFFECTS:
        if state["writes"] &gt;= WRITE_LIMIT:
            state["trace"].append((state["steps"], name, "blocked-by-budget"))
            break
        state["writes"] += 1
    obs = TOOLS[name](args)
    state["trace"].append((state["steps"], name, obs))
    if name == "verify_glossary" and obs["ok"]:
        state["done"] = True
        break

print(json.dumps({"done": state["done"], "steps": state["steps"],
                  "writes": state["writes"]}, ensure_ascii=False))
print(state["trace"])

<span class="cm"># 三个必做实验（这才是本实验的重点）</span>
<span class="cm"># 1) 把 verify_glossary 改成永远返回 ok=True：看「假成功」如何让循环提前结束</span>
<span class="cm"># 2) 让 write_entry 在第二次调用时抛异常，观察幂等键是否避免了重复写入</span>
<span class="cm"># 3) 去掉 STEP_LIMIT：如果模型永远选不到成功动作，会发生什么</span></code></pre>
  <p><strong>可执行的评估协议</strong>（照着做一遍，你就有了自己的回归测试）：</p>
  <ol>
    <li>固定 10–20 条任务，每条都写出<strong>机器可判定</strong>的验收标准（例如「文件里存在某字符串」「测试退出码为 0」）。</li>
    <li>每条任务跑 3 次，记录：成功率、步数、副作用次数、成本、终止原因。</li>
    <li>改一处（提示词、工具描述、预算、模型），重跑同一批任务，比较「成功率变化」与「成本变化」。</li>
    <li>把失败样本按 6.4 的表归因，只修占比最大的那一类。</li>
    <li>把这批任务与脚本一起存进仓库——这就是智能体的单元测试。</li>
  </ol>
</section>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>30 分钟最小实现：零托管服务的可控智能体循环</h4>
  <p>
    目标：不调任何托管 API，用 Python 标准库写出一个具备六件事的循环——
    <strong>schema 校验、幂等键、退避重试、权限允许列表、副作用预算、外部成功判据</strong>。
    模型用桩函数（真实项目里替换成任意一次文本生成调用即可），工具是内存字典，因此可以完全离线复现。
  </p>
<pre><code><span class="cm"># 可控智能体循环：schema 校验 + 幂等键 + 退避重试 + 允许列表 + 双终止（全程离线）</span>
import json, sqlite3, time, random, uuid

SCHEMA = {"read_note": {"key": str}, "write_note": {"key": str, "text": str}}
ALLOW  = {"read_note": "read", "write_note": "write"}  <span class="cm"># 本次任务只发这两个权限</span>
BUDGET = {"steps": 8, "writes": 2, "seconds": 5.0}
db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE done(k TEXT PRIMARY KEY, result TEXT)")
notes, t0 = {}, time.time()

def validate(name, args):
    if name not in ALLOW:
        raise PermissionError("denied: " + name)       <span class="cm"># 权限层：默认拒绝</span>
    for field, typ in SCHEMA[name].items():
        if field not in args or not isinstance(args[field], typ):
            raise ValueError("schema: " + name + "." + field)  <span class="cm"># 语法与语义层</span>

def call(name, args, retries=3, base=0.2):
    validate(name, args)
    key = str(uuid.uuid5(uuid.NAMESPACE_URL, name + json.dumps(args, sort_keys=True)))
    row = db.execute("SELECT result FROM done WHERE k=?", (key,)).fetchone()
    if row:
        return json.loads(row[0])                      <span class="cm"># 幂等：重放直接返回上次结果</span>
    for attempt in range(retries):
        try:
            out = TOOLS[name](**args)
            db.execute("INSERT OR REPLACE INTO done VALUES (?, ?)", (key, json.dumps(out)))
            db.commit()
            return out
        except TimeoutError:
            if attempt == retries - 1:
                raise
            time.sleep(base * (2 ** attempt) + random.random() * 0.1)  <span class="cm"># 退避加抖动</span>

TOOLS = {"read_note": lambda key: {"ok": True, "value": notes.get(key)},
         "write_note": lambda key, text: (notes.setdefault(key, text), {"ok": True})[1]}

def model_step(state):           <span class="cm"># 桩：真实项目里换成一次文本生成调用</span>
    if state["writes"] &lt; 1:
        return {"tool": "write_note", "args": {"key": "n1", "text": "hello"}}
    return {"tool": "read_note", "args": {"key": "n1"}}

state = {"steps": 0, "writes": 0, "done": False, "trace": []}
while state["steps"] &lt; BUDGET["steps"] and time.time() - t0 &lt; BUDGET["seconds"]:
    state["steps"] += 1
    act = model_step(state)
    if act["tool"] == "write_note":
        if state["writes"] &gt;= BUDGET["writes"]:
            state["trace"].append("write-limit")
            break
        state["writes"] += 1
    obs = call(act["tool"], act["args"])
    state["trace"].append((act["tool"], obs))
    if act["tool"] == "read_note" and obs.get("value") is not None:
        state["done"] = True       <span class="cm"># 成功判据 = 外部状态，不是模型自述</span>

print(state["done"], state["steps"], state["writes"], state["trace"])</code></pre>
  <p>
    <strong>要记录的三个数字</strong>：
    ① 同一任务连跑 10 次的<strong>成功率</strong>；
    ② <strong>步数的 p50 与 p99</strong>（长尾说明缺少停滞检测，见第 9 节）；
    ③ 写操作的 <strong>「真实状态变更次数 / 请求次数」比值</strong>（幂等生效时应恰为 1.0，小于 1 说明有重复被吞掉，大于 1 说明有重复生效）。
  </p>
  <p>
    三个必做实验：把 <code>validate</code> 里的类型检查删掉，看参数幻觉如何穿过；
    把 <code>uuid5</code> 换成基于随机数的键（重放不再命中），看去重表的记录数如何翻倍；
    把 <code>BUDGET</code> 的 steps 改成 3，观察循环是「按预算停」还是「按成功停」——
    终止原因字段会告诉你是哪一种。
  </p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>五个常见误区</h4>
  <ol>
    <li><strong>没有终止条件。</strong>只靠「模型自己觉得做完了」来停，等于把预算控制交给模型。
       必须有独立的步数/token/时间上限，且与成功判据分开实现。</li>
    <li><strong>把整个文件系统或管理员权限交给智能体。</strong>智能体的权限应该按<em>任务</em>发放，而不是按<em>你的身份</em>发放。
       能只读就不要给写；能给单个目录就不要给全盘；能软删除就不要硬删除。</li>
    <li><strong>用「看起来成功」当验证。</strong>「模型说已完成」「HTTP 200」「没有任何报错」都不构成成功证据。
       唯一的证据是<em>外部状态</em>：文件内容、测试结果、数据库里的那一行。</li>
    <li><strong>忽略重试带来的重复副作用。</strong>「至少一次」语义意味着重复;没有幂等键的写操作迟早会被执行两次——
       而且往往是在你最难复现的那次超时里发生。</li>
    <li><strong>把上下文当成免费资源。</strong>无限增长的历史会让早期约束被稀释、成本线性上升、延迟变差。
       记忆需要策略：压缩什么、保留什么、什么时候从外部重新读回来。</li>
  </ol>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>怎么用在真实项目里</h4>
  <p>
    把这一模块映射到你已经有的东西上，落地会非常快：
  </p>
  <ul>
    <li><strong>与模块 14 的 85/15 规则合起来看</strong>：那条规则说 token 应主要花在验证上，而不是生成上。
        在智能体语境里它变成了具体的架构要求——<em>每一步都要有一个便宜的、外部的检查</em>（编译、类型检查、测试、diff 审查），
        而不是等最后让模型自己复盘。你的智能体若没有「每步可验证」的环节，85/15 就无从谈起。</li>
    <li><strong>与模块 12 的凭据管理合起来看</strong>：智能体是一个会自己发起网络请求的进程。
        给它单独的、最小权限的凭据，别复用你的主账号；出口走你已经在用的代理与白名单；
        所有写操作都可追溯到幂等键。</li>
    <li><strong>与附录 D 的合规一节合起来看</strong>：会自主调用外部服务的智能体，
        在「谁在使用、数据去了哪里、是否代他人自动化」这些问题上与你手动跑脚本没有区别，
        但它的行为是<em>动态</em>的，所以更依赖日志与限流来兜底。</li>
    <li><strong>对你的毕业项目</strong>：crossfade 项目里最值得做智能体的部分不是「调参」，
        而是「实验编排」——生成配置、跑训练、收集指标、写报告草稿，每一步都能被测试脚本验证。
        把不可验证的环节（比如「这段过渡好不好听」）留给人。</li>
  </ul>
  <p>
    术语速记：
    <span class="t" data-tterm="tool call" data-d="模型输出结构化参数、由宿主程序执行的函数调用；是智能体改变世界的唯一通道。">工具调用</span>、
    <span class="t" data-tterm="idempotency" data-d="同一请求执行多次与执行一次效果相同；重试安全的前提。">幂等性</span>、
    <span class="t" data-tterm="ReAct" data-d="Reasoning + Acting：推理轨迹与工具动作交错生成的提示范式。">ReAct</span>、
    <span class="t" data-tterm="trace" data-d="一次运行中每一步的完整记录（输入、动作、观察、耗时、成本），调试与审计的基础。">轨迹</span>、
    <span class="t" data-tterm="HITL" data-d="Human-in-the-loop：在关键或有副作用的步骤前插入人工确认。">人机接口</span>、
    <span class="t" data-tterm="MCP" data-d="Model Context Protocol：用统一协议把工具与数据源接入 LLM 应用的开放标准。">MCP</span>、
    <span class="t" data-tterm="idempotency key" data-d="由任务、步骤、工具名与参数哈希拼出的唯一键，服务端保证同一键只生效一次。">幂等键</span>、
    <span class="t" data-tterm="exponential backoff" data-d="失败后按基数乘二的间隔重试并加随机抖动，避免同步重试把下游打死。">指数退避</span>、
    <span class="t" data-tterm="least privilege" data-d="按任务需要发放最小权限：能只读就不给写，能给单个目录就不给全盘。">最小权限</span>、
    <span class="t" data-tterm="sandbox" data-d="把智能体的文件与网络访问限制在隔离环境内，越权失败而不是污染真实状态。">沙箱</span>。
  </p>
</section>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>crossfade 项目上值不值：一个明确回答</h4>
  <p>
    <strong>结论：值得，但只值得做「实验编排」这一类智能体，不值得让模型自己决定怎么调音色。</strong>
    判断标准就是第 6.4 节那句话：<em>要评结果，不要评过程</em>。凡是结果能被脚本判定的环节，智能体划算；
    凡是只能靠耳朵判断的环节，智能体只会把你的不确定性放大成更多的不确定性。
  </p>
  <table class="tbl small">
    <thead><tr><th>crossfade 里的环节</th><th>可验证的判据</th><th>该不该交给智能体</th><th>为什么</th></tr></thead>
    <tbody>
      <tr>
        <td>生成实验配置、做网格搜索</td>
        <td>配置能解析、字段在允许范围内、实验确实跑完</td>
        <td><strong>该</strong>，这是收益最高的一环</td>
        <td>每一步都有便宜的机器判据，失败可重跑，几乎没有不可逆副作用</td>
      </tr>
      <tr>
        <td>批量跑训练并收集指标</td>
        <td>进程退出码、指标文件存在且字段齐全</td>
        <td><strong>该</strong>，但必须配预算与幂等</td>
        <td>长任务需要断点恢复；重跑不能产生重复提交（第 7 节）</td>
      </tr>
      <tr>
        <td>分析结果、写报告草稿</td>
        <td>草稿里引用的数字能在指标文件里找到</td>
        <td><strong>该</strong>，但要求给出来源 id</td>
        <td>与模块 19 的引用校验是同一件事：论断必须可回溯</td>
      </tr>
      <tr>
        <td>判断「这段过渡听起来自然吗」</td>
        <td>没有客观判据，只能人工试听</td>
        <td><strong>不该</strong></td>
        <td>无法验证的任务里，智能体的成功只能靠自述，等于买了一个会说谎的随机过程</td>
      </tr>
      <tr>
        <td>删除旧音频数据、覆盖模型权重</td>
        <td>不可逆</td>
        <td><strong>绝对不该</strong>自动化</td>
        <td>第 8.3 节权限矩阵的最后一行：默认禁止，必须人工确认</td>
      </tr>
    </tbody>
  </table>
  <p>
    换算成量级：若每个实验平均 6 步、每步 8k token，一次编排开销约 50k token；
    按模块 11 的口径，这通常远低于一次训练本身的卡时与电费，所以<strong>把编排自动化是划算的</strong>。
    反过来，如果让智能体反复「试听挑参数」，它每一步都在花你的时间做不可验证的搜索，收益接近零，
    而成本（包括你复核它的时间）还要另算。
  </p>
  <p>
    一句话版本：<strong>crossfade 上智能体的正确用法是「让它在可判定的闭环里替你跑腿」，而不是「让它替你审美」。</strong>
    先从上面表格里第一行做起来——一个只负责生成配置、跑实验、收指标、写草稿的循环，
    加上第 8.4 节的四条终止条件，你就能在一周内得到一个愿意相信其「完成」结论的工具。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">关于「智能体」与「固定工作流」的区别，最准确的说法是？</p>
  <ul class="opts">
    <li>智能体一定比工作流效果更好，所以应该优先用智能体</li>
    <li data-ok>区别在于控制流由谁决定：工作流走预定义的代码路径，智能体由模型动态决定下一步</li>
    <li>区别在于是否使用工具，用工具的就是智能体</li>
    <li>区别在于模型大小，大模型才叫智能体</li>
  </ul>
  <p class="why">
    这是 Anthropic 在《Building effective agents》里给出的划分：两者都叫 agentic system，
    但工作流的路径你能画出来，智能体的路径只能被观测。正因为智能体的路径不可预测，
    它才需要预算、trace 与沙箱。而工程建议恰恰相反：<em>先找最简单的方案</em>，只有复杂度换来可验证的收益时才升级。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">一个写操作工具调用超时了，你的重试逻辑又发了一次。关于后果，正确的是：</p>
  <ul class="opts">
    <li>超时意味着没执行，重试一定安全</li>
    <li>只要加了指数退避就安全了</li>
    <li data-ok>超时不代表没执行；没有幂等键时「至少一次」语义会导致副作用被执行两次</li>
    <li>把重试次数限制为 1 次即可彻底避免重复</li>
  </ul>
  <p class="why">
    超时是「不知道」，不是「没发生」。指数退避解决的是压力问题，不是重复问题；
    限制重试次数会同时牺牲成功率。正确的做法是让副作用可去重：
    用「任务 + 步骤 + 工具 + 参数哈希」作为幂等键，服务端保证同一键只生效一次。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">你想让智能体并行调查五个独立方向。在选择多智能体之前，最该先确认的是？</p>
  <ul class="opts">
    <li>模型是否支持并行工具调用</li>
    <li data-ok>子任务是否真的互不依赖、产物是否可合并，以及任务价值能否覆盖约十几倍的 token 成本</li>
    <li>子智能体数量越多越好</li>
    <li>是否用了最新的框架</li>
  </ul>
  <p class="why">
    Anthropic 在报告 90.2% 提升的同时指出：智能体用掉约 4 倍于聊天的 token，多智能体系统约 15 倍，
    且需要共享上下文或强依赖的任务并不适合多智能体；Cognition 则从工程角度主张默认用单线程智能体。
    MAST 的失败分类里，多数失败模式属于系统设计、智能体间不对齐与任务验证，而不是单纯的模型能力。
    所以先确认「独立性 + 可合并性 + 经济性」，再决定要不要并行。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">一个写操作工具返回「参数校验失败：缺少字段 target」。按第 7.1 节的错误分类，正确的处理是？</p>
  <ul class="opts">
    <li>立即用指数退避重试 3 次，抖动之后再试</li>
    <li data-ok>不重试；把结构化错误回灌给模型让它改参数，且这次改正计入步数而不是重试次数</li>
    <li>换一个更大的模型重新调用一次</li>
    <li>把重试上限提高到 10 次以确保成功</li>
  </ul>
  <p class="why">
    参数错误属于「不可重试」类：同样的参数重试一万次也不会变好，退避与抖动在这里毫无意义。
    它需要的是<em>一次新的推理</em>（模型改参数），而瞬时抖动需要的是<em>一次新的请求</em>——
    两者混在一起，重试预算会被业务错误吃光，真正的网络抖动反而没机会重试。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">某任务每一步有 \(p = 0.3\) 的概率找到成功动作，团队希望单任务失败率不超过 5%。按第 8.2 节的公式，步数上限大约取多少？</p>
  <ul class="opts">
    <li>3 步</li>
    <li data-ok>9 步</li>
    <li>20 步</li>
    <li>50 步</li>
  </ul>
  <p class="why">
    解 \(B \ge \ln(0.05)/\ln(0.7) \approx 8.4\)，向上取整为 9。
    3 步只有 \(1 - 0.7^{3} \approx 0.657\) 的成功率，20 步虽然到 0.9992，但相对 9 步只多约 2.6 个百分点、成本却翻倍以上。
    预算应该按目标失败率反推，而不是凭感觉或按最坏情况无上限地放大。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">你用 32 位随机字符串做幂等键，一年约 \(10^{6}\) 次写调用。会出什么问题？</p>
  <ul class="opts">
    <li>没有问题，32 位对一百万次调用绰绰有余</li>
    <li data-ok>碰撞已经不可忽略：按生日近似期望碰撞量级远超 1，会让「第二次写入被当成已执行」而静默丢数据</li>
    <li>只有高并发时才会碰撞，串行调用绝对安全</li>
    <li>碰撞只会导致重复执行，不会造成数据丢失</li>
  </ul>
  <p class="why">
    第 7.2 节的手算：\(b = 128\) 时 \(N^{2}/2^{129} \approx 1.5 \times 10^{-27}\)，可以忽略；
    但 \(b = 32\) 时 \(N^{2}/2^{33} \approx 116\)，键空间已经饱和。串行也一样会碰撞，因为碰撞只取决于键的取值分布。
    而且幂等表的方向是「命中就当已执行」，所以碰撞的后果是<em>静默丢弃合法写入</em>——
    这比重复执行更难发现。用 128 位键的成本几乎为零，没有理由省。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 7</div>
  <p class="q">一个「只读分析」任务里，模型请求调用一个写工具。按本模块的建议，最可靠的拦截方式是？</p>
  <ul class="opts">
    <li>在系统提示里写明「严禁写操作」，让模型自律</li>
    <li data-ok>在宿主程序里维护按任务下发的允许列表，请求不在列表内就直接拒绝</li>
    <li>让模型在调用前再做一次自我确认</li>
    <li>把写工具的描述改成「危险，请勿使用」</li>
  </ul>
  <p class="why">
    系统提示是建议，允许列表才是边界：一次提示注入（把指令藏在被读取的文档或工具返回值里）就能让前者失效，
    而后者在模型之外执行，模型说什么都不影响。
    把工具描述写得更吓人只是改变了模型的先验，不是一道墙——这与模块 21 的结论一致：
    提示注入没有「更好的提示词」解，只有把权限收窄。
  </p>
</div>

<div class="acc" data-t="深入：把智能体当分布式系统来设计" data-badge="进阶">
  <div class="acc-body">
    <p>
      一旦你承认智能体是「会失败、会重试、会部分完成的长运行进程」，很多成熟的分布式系统模式可以直接搬过来，
      而且比任何提示词技巧都更能提升可靠性：
    </p>
    <table class="tbl small">
      <thead><tr><th>分布式系统模式</th><th>在智能体里的对应物</th><th>解决的问题</th></tr></thead>
      <tbody>
        <tr><td>幂等键 / 去重表</td><td>工具调用的唯一键，服务端记录已执行</td><td>重试导致的重复副作用</td></tr>
        <tr><td>检查点与重放</td><td>把每步状态落盘，可从断点恢复而不是从头重跑</td><td>长任务中途失败的成本</td></tr>
        <tr><td>Saga / 补偿事务</td><td>为每个可逆步骤写一个补偿动作（撤销、还原、删除草稿）</td><td>多步操作中途失败后的状态一致性</td></tr>
        <tr><td>熔断与限流</td><td>工具连续失败就停用该工具并降级</td><td>重试风暴、把下游打死</td></tr>
        <tr><td>结构化日志 + 追踪 id</td><td>每次运行一个 trace id，每步一条记录</td><td>事后归因：模型错、工具错还是编排错</td></tr>
        <tr><td>灰度 / 彩虹部署</td><td>提示词或工具变更时新旧并存、逐步切流</td><td>升级打断正在运行的智能体</td></tr>
      </tbody>
    </table>
    <p>
      <strong>为什么这个类比有用？</strong>因为它把「智能体不听话」这个模糊的抱怨，
      翻译成了一组可以逐项检查的工程性质：可重放吗？有幂等键吗？有补偿吗？有断点吗？有熔断吗？
      如果这五个问题里有三个答不上来，那么你的系统在演示时能跑通，在生产里迟早会给你一个「说完成了但其实没完成」的结果。
    </p>
    <p>
      <em>最后一个诚实的提醒</em>：这些模式会让智能体变慢、变重、代码量翻倍。
      所以判断标准不是「要不要做得这么严」，而是「这一步失败的代价有多大」。
      只读的探索可以很轻；会写数据、会花钱、会对外发消息的步骤，值得配上上面全部六条。
    </p>
  </div>
</div>
`
});
