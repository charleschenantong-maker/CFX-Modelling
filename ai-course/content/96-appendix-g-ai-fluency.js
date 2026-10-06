/* content/96-appendix-g-ai-fluency.js — 附录 G：AI 素养课地图（厂商中立版） */
COURSE.register({
  id: "appG",
  part: 9,
  num: "G",
  title: "附录 G · AI 素养课地图（厂商中立版）",
  en: "Appendix G — AI Fluency Course Map",
  minutes: 40,
  tags: ["附录", "资源", "AI 素养"],
  body: String.raw`
<p class="lead">
  Anthropic 的官方学习平台 <code>academy.claude.com</code> 上有一批「AI 素养 / AI Fluency」课程，
  从聊天入门一直排到 K-12 教师培训。本附录把其中的 <strong>22 门</strong>全部整理成一张可查的地图。
  但这份地图的定位不是「官方课推荐清单」，而是<strong>厂商中立的素养课地图</strong>：
  告诉你哪门课值得上、上完怎么把能力搬到别的模型与开放标准上、
  以及怎么用本课程（尤其是第 09 章）的方法证明自己真的学到了东西——
  而不是学会了某一家产品的按钮。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>先说结论：课值得上，但别只会上某一家的产品</h4>
  <p>
    这些官方课确实<strong>免费、成体系、有练习</strong>，比绝大多数二手教程可靠：
    它们背后是模型的原厂团队，讲的工具定义、上下文管理、评估思路通常比社区转述更准确。
    所以「值不值得上」的答案是<strong>值得</strong>。
  </p>
  <p>
    但要小心一个陷阱：<strong>课程里的大多数演示都发生在某一家的界面与 API 上</strong>。
    如果你把「我学会了」定义为「我知道这个按钮在哪」，那么下个月改版、或者换一家模型，
    你的能力就归零了。真正可迁移的东西是四种协作能力：
    <em>会划边界（哪些活不交给模型）、会把需求说到可验收、会用可复核的方法验收输出、会明确谁签字负责</em>。
    界面每个月都可能变，这四件事不会。
  </p>
  <p>
    本附录因此给三样东西：一张 22 门课的<strong>可查表</strong>（含链接、适合谁、学完能做什么、
    对应本课程哪一章）、一张把官方课里的 <span class="t" data-tterm="AI Fluency 4D framework" data-d="把一次人机协作拆成 Delegation、Description、Discernment、Diligence 四个关口；缺任一维的症状是流程很顺但没人对结果负责。">4D 框架</span>
    翻译成本课程语言的映射表，以及一张<strong>厂商中立检查表</strong>——
    上完任何一门课，用它给自己体检。
  </p>
  <p>
    课程清单、链接与事实的核对日期：<strong>2026-10-05</strong>。
    课程页会更新，学时与课名一律<strong>以课程页当时的标注为准</strong>。
  </p>
</section>

<h3>1. 这张地图怎么用：四组课，各解决一类问题</h3>
<p>
  22 门课不是 22 个并列选项，而是四类问题的答案所在地。
  <strong>先确定你现在卡在哪一类，再去那一组里挑课</strong>——这比从第一门顺序刷完省至少十天。
</p>
<div class="grid2">
  <div class="card">
    <h5>第一组 · 基础与协作（01–04）</h5>
    <p><strong>解决「人和模型怎么配合」</strong>。适合刚接触、或者只会一问一答的人。
      产出是一张分工表：哪些步骤我做、哪些交给模型。</p>
    <p>对应本课程：<a href="#m0">00 导读</a>、<a href="#m25">25 工程流水线</a>。</p>
  </div>
  <div class="card">
    <h5>第二组 · 把 AI 接进系统（05–12）</h5>
    <p><strong>解决「模型怎么接进代码库、工具与云平台」</strong>。适合要交付东西的开发者。
      产出是一次可复现的调用：输入、工具、重试、成本四样都记下来。</p>
    <p>对应本课程：<a href="#m8">08 推理与部署</a>、<a href="#m10">10 算力与工具链</a>、
      <a href="#m19">19 智能体系统</a>。</p>
  </div>
  <div class="card">
    <h5>第三组 · 素养框架与能力边界（13–16）</h5>
    <p><strong>解决「什么该交出去、什么绝不能交」</strong>。这是整张地图的地基，
      也是唯一一组「不写代码也该上」的课。产出是一份判断清单与验收方法。</p>
    <p>对应本课程：<a href="#m9">09 评估与科研方法</a>、<a href="#m1">01 语言模型在算什么</a>。</p>
  </div>
  <div class="card">
    <h5>第四组 · 身份与教学落地（17–22）</h5>
    <p><strong>解决「我所在的组织或课堂怎么用」</strong>。是第三组按身份拆出来的落地篇：
      学生、小企业、非营利、教育者、K-12、培训者各有约束。</p>
    <p>对应本课程：<a href="#m29">29 收束</a>、附录 D 合规与学术诚信。</p>
  </div>
</div>

<h4>1.1 不确定该上哪门时，按这个顺序问自己</h4>
<div class="flow">
  <div class="nd hi">我现在的问题是什么</div><div class="ar">→</div>
  <div class="nd">不会用 / 用得不顺</div><div class="ar">→</div>
  <div class="nd">第一组 01–04</div><div class="ar">→</div>
  <div class="nd">要接进项目</div><div class="ar">→</div>
  <div class="nd">第二组 05–12</div><div class="ar">→</div>
  <div class="nd">不知道该不该信它</div><div class="ar">→</div>
  <div class="nd">第三组 13–16</div>
</div>
<p>
  第四组不是「第四个技术阶段」，而是「把前三组的能力装进一个具体身份的流程里」。
  如果你既不是学生、也不带团队、也不教课，<strong>这一组可以直接跳过</strong>——
  它不会给你新的技术能力，只会给你组织层面的模板。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>读表的三个约定（很重要，关系到你能不能信这张表）</h4>
  <ol>
    <li><strong>课名与链接</strong>：中文名是本课程的中文译名；括号里的英文名按课程页 URL 的 slug 还原，
      可能与页面上的显示名略有差异，<strong>以课程页为准</strong>。链接照抄官方课程页。</li>
    <li><strong>「适合谁」与「学完应该能做什么」是编者按课名与定位给的预期，不是官方承诺</strong>，
      也不代表课程一定覆盖到那个深度。请把它当成「上完之后你应该能自己回答的问题」。</li>
    <li><strong>学时一律写「以课程页标注为准」</strong>。只有 13 号课因为多份二手资料引用同一组数字，
      我们把它单独标出来（官方页标注 14 lessons / 4 hr / 1 quiz）。学时是最容易过期的一类信息，
      本附录不复制其余课程的具体数字。</li>
  </ol>
</section>

<h3>2. 表 1 · 22 门官方课总表（按四组）</h3>
<p>
  每门课给六件事：课程名、链接、适合谁、建议学时、学完应该能做什么、对应本课程哪一章。
  「对应章节」的作用是<strong>先读本课程那一章，再去看官方课</strong>：
  本课程负责给你可验证的方法（公式、实验、台账），官方课负责给你产品里的具体操作。
  两者顺序反了，你就会只学到操作。
</p>

<h4>第一组 · 基础与协作（01–04）：解决「人和模型怎么配合」</h4>
<table class="tbl small">
  <thead><tr><th>课程</th><th>链接</th><th>适合谁</th><th>建议学时</th><th>学完应该能做什么</th><th>本课程对应章节</th></tr></thead>
  <tbody>
    <tr><td><strong>01</strong> Claude 101（Claude 101）</td><td><a href="https://academy.claude.com/courses/claude-101" target="_blank" rel="noopener">claude-101</a></td><td>第一次用聊天式模型的人；想把「听说很好用」变成「我自己试过」的人</td>
      <td>以课程页标注为准</td><td>能用自然语言完整做完一个小任务，并说清自己哪一步做对了、哪一步是模型替你决定的</td><td>00、08</td></tr>
    <tr><td><strong>02</strong> Claude 协作入门（Introduction to Claude Cowork）</td><td><a href="https://academy.claude.com/courses/introduction-to-claude-cowork" target="_blank" rel="noopener">introduction-to-claude-cowork</a></td><td>已经会一问一答，但还没把 AI 编进日常工作流的人</td>
      <td>以课程页标注为准</td>      <td>能把一个任务拆成「我做什么 + 它做什么」的两栏分工表，并写出交接时需要的输入</td><td>25、00</td></tr>
    <tr><td><strong>03</strong> Claude Code 101（Claude Code 101）</td><td><a href="https://academy.claude.com/courses/claude-code-101" target="_blank" rel="noopener">claude-code-101</a></td><td>要在终端或编辑器里让智能体改代码的人</td>
      <td>以课程页标注为准</td>      <td>能在自己的仓库里走完一次「读代码 → 改一处 → 跑测试 → 看 diff」的闭环</td><td>25、29</td></tr>
    <tr><td><strong>04</strong> Claude Code 实战（Claude Code in Action）</td><td><a href="https://academy.claude.com/courses/claude-code-in-action" target="_blank" rel="noopener">claude-code-in-action</a></td><td>已能跑通编码智能体，想把它放进真实项目流程的人</td>
      <td>以课程页标注为准</td>      <td>能把测试、审查、提交拆成可复用的步骤，而不是每次从零描述需求</td><td>25、29</td></tr>
  </tbody>
</table>

<h4>第二组 · 把 AI 接进系统（05–12）：解决「模型怎么接进代码库、工具与云平台」</h4>
<table class="tbl small">
  <thead><tr><th>课程</th><th>链接</th><th>适合谁</th><th>建议学时</th><th>学完应该能做什么</th><th>本课程对应章节</th></tr></thead>
  <tbody>
    <tr><td><strong>05</strong> Agent 技能入门（Introduction to Agent Skills）</td><td><a href="https://academy.claude.com/courses/introduction-to-agent-skills" target="_blank" rel="noopener">introduction-to-agent-skills</a></td><td>想把「一套固定做法」沉淀成可复用单元、而不是每次重写提示的人</td>
      <td>以课程页标注为准</td>      <td>能写出一个有输入输出约定的技能说明，让任务从「每次口述」变成「调用一次」</td><td>19</td></tr>
    <tr><td><strong>06</strong> Subagents 子代理入门（Introduction to Subagents）</td><td><a href="https://academy.claude.com/courses/introduction-to-subagents" target="_blank" rel="noopener">introduction-to-subagents</a></td><td>任务多、上下文互相污染，需要并行或隔离的人</td>
      <td>以课程页标注为准</td>      <td>能把大任务拆给多个执行者，并明确规定每个执行者能看到什么、不许碰什么</td><td>19、25</td></tr>
    <tr><td><strong>07</strong> Claude 平台 101（Claude Platform 101）</td><td><a href="https://academy.claude.com/courses/claude-platform-101" target="_blank" rel="noopener">claude-platform-101</a></td><td>想从聊天窗口走到平台与 API 的人</td>
      <td>以课程页标注为准</td><td>能画出一次请求经过的部件（模型、额度、工具、日志），并指出哪一环最可能出错</td><td>10、08</td></tr>
    <tr><td><strong>08</strong> 基于 Claude API 开发（Building with the Claude API）</td><td><a href="https://academy.claude.com/courses/building-with-the-claude-api" target="_blank" rel="noopener">building-with-the-claude-api</a></td><td>要写代码调用模型的人</td>
      <td>以课程页标注为准</td>      <td>能发出一次带系统提示、工具定义与重试的请求，并记录 token 数与耗时</td><td>08、23</td></tr>
    <tr><td><strong>09</strong> MCP 入门（Introduction to Model Context Protocol）</td><td><a href="https://academy.claude.com/courses/introduction-to-model-context-protocol" target="_blank" rel="noopener">introduction-to-model-context-protocol</a></td><td>被「每个工具一套接法」折磨过的人；数据在本地、想让模型安全地读到的人</td>
      <td>以课程页标注为准</td>      <td>能用公开规范把本地数据源暴露成工具，并说清它与通用「工具调用」的分工</td><td>19、18</td></tr>
    <tr><td><strong>10</strong> MCP 进阶话题（Model Context Protocol: Advanced Topics）</td><td><a href="https://academy.claude.com/courses/model-context-protocol-advanced-topics" target="_blank" rel="noopener">model-context-protocol-advanced-topics</a></td><td>已跑通最小服务端，关心权限、作用域与部署的人</td>
      <td>以课程页标注为准</td>      <td>能说清传输方式、权限边界与「这个工具该不该给它」，并写出最小威胁模型</td><td>19、20</td></tr>
    <tr><td><strong>11</strong> Claude 与 Amazon Bedrock（Claude with Amazon Bedrock）</td><td><a href="https://academy.claude.com/courses/claude-with-amazon-bedrock" target="_blank" rel="noopener">claude-with-amazon-bedrock</a></td><td>已经在 AWS 上、要按公司合规走的人</td>
      <td>以课程页标注为准</td>      <td>能说清「托管云平台」与「模型提供方」各负责哪一半，账单与数据落在谁那里</td><td>10、23</td></tr>
    <tr><td><strong>12</strong> Claude 与 Vertex AI（Claude with Google Cloud's Vertex AI）</td><td><a href="https://academy.claude.com/courses/claude-with-google-cloud-s-vertex-ai" target="_blank" rel="noopener">claude-with-google-cloud-s-vertex-ai</a></td><td>已经在 GCP 上、需要与既有流水线打通的人</td>
      <td>以课程页标注为准</td>      <td>能对照「托管平台 / 自建推理服务」两条路，算出一个粗成本口径与责任划分</td><td>10、23</td></tr>
  </tbody>
</table>

<h4>第三组 · 素养框架与能力边界（13–16）：解决「什么该交出去、什么绝不能交」</h4>
<table class="tbl small">
  <thead><tr><th>课程</th><th>链接</th><th>适合谁</th><th>建议学时</th><th>学完应该能做什么</th><th>本课程对应章节</th></tr></thead>
  <tbody>
    <tr><td><strong>13</strong> AI 素养框架与基础（AI Fluency: Framework and foundations）</td><td><a href="https://academy.claude.com/courses/ai-fluency-framework-foundations" target="_blank" rel="noopener">ai-fluency-framework-foundations</a></td><td>任何人。<strong>如果整张地图只上一门，就上这门</strong></td>
      <td>官方页标注 <strong>14 lessons / 4 hr / 1 quiz</strong>，完成可得徽章</td>      <td>能用 4D 说清一次协作里「谁决定、怎么描述、怎么验收、谁负责」，并指出自己最容易漏掉哪一维</td><td>09、00、29</td></tr>
    <tr><td><strong>14</strong> AI 能力与局限（AI Capabilities and Limitations）</td><td><a href="https://academy.claude.com/courses/ai-capabilities-and-limitations" target="_blank" rel="noopener">ai-capabilities-and-limitations</a></td><td>需要判断「这类任务能不能交给模型」的人</td>
      <td>以课程页标注为准</td>      <td>能对一类具体任务给出「可做 / 需复核 / 不做」的判断，并说出验证它的最小实验</td><td>01、17、22</td></tr>
    <tr><td><strong>15</strong> 开发者 AI 素养（AI Fluency for Builders）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-builders" target="_blank" rel="noopener">ai-fluency-for-builders</a></td><td>写代码、要交付可运行产物的人</td>
      <td>以课程页标注为准</td>      <td>能把 4D 用在代码审查、测试与日志上：每个 AI 生成的分支都要有一个失败时的判定</td><td>09、20、25</td></tr>
    <tr><td><strong>16</strong> 小企业 AI 素养（AI Fluency for Small Businesses）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-small-businesses" target="_blank" rel="noopener">ai-fluency-for-small-businesses</a></td><td>小团队、个体经营者、要控制成本的人</td>
      <td>以课程页标注为准</td>      <td>能给出一条业务的「能交 / 不能交」清单，并写清按月成本与退出方案</td><td>23、29</td></tr>
  </tbody>
</table>

<h4>第四组 · 身份与教学落地（17–22）：解决「我所在的组织或课堂怎么用」</h4>
<table class="tbl small">
  <thead><tr><th>课程</th><th>链接</th><th>适合谁</th><th>建议学时</th><th>学完应该能做什么</th><th>本课程对应章节</th></tr></thead>
  <tbody>
    <tr><td><strong>17</strong> 学生 AI 素养（AI Fluency for Students）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-students" target="_blank" rel="noopener">ai-fluency-for-students</a></td><td>在读学生、要写论文或申请材料的人</td>
      <td>以课程页标注为准</td>      <td>能把 AI 用在学习上而不越过学术诚信线，并留下「哪些是我做的」的过程记录</td><td>09、29、附录 D</td></tr>
    <tr><td><strong>18</strong> 非营利组织 AI 素养（AI Fluency for Nonprofits）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-nonprofits" target="_blank" rel="noopener">ai-fluency-for-nonprofits</a></td><td>预算紧、数据还敏感的非营利团队</td>
      <td>以课程页标注为准</td>      <td>能在「钱少 + 数据敏感」两个约束下写出一页可执行的使用规范</td><td>23、29</td></tr>
    <tr><td><strong>19</strong> 教育者 AI 素养（AI Fluency for Educators）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-educators" target="_blank" rel="noopener">ai-fluency-for-educators</a></td><td>要改作业与课程设计的高校教师、教学设计师</td>
      <td>以课程页标注为准</td><td>能设计一次「过程留痕」的作业：交结果之外还要交过程与验证记录</td><td>09、附录 D</td></tr>
    <tr><td><strong>20</strong> K-12 教育者 AI 素养（AI Fluency for K-12 Educators）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-k-12-educators" target="_blank" rel="noopener">ai-fluency-for-k-12-educators</a></td><td>中小学教师、教务管理者</td>
      <td>以课程页标注为准</td><td>能把年龄、隐私与家长沟通三件约束写进课堂用法，而不是照搬成人用法</td><td>附录 D、09</td></tr>
    <tr><td><strong>21</strong> K-12 培训师培训（AI Fluency for PK-12: Train the Trainer）</td><td><a href="https://academy.claude.com/courses/ai-fluency-for-pk-12-train-the-trainer" target="_blank" rel="noopener">ai-fluency-for-pk-12-train-the-trainer</a></td><td>教研组长、教师培训者</td>
      <td>以课程页标注为准</td>      <td>能把一次培训设计成「有练习、有验收」的流程，而不是一场演示</td><td>25、附录 B</td></tr>
    <tr><td><strong>22</strong> AI 素养教学（Teaching AI Fluency）</td><td><a href="https://academy.claude.com/courses/teaching-ai-fluency" target="_blank" rel="noopener">teaching-ai-fluency</a></td><td>要自己开一门 AI 素养课的人</td>
      <td>以课程页标注为准</td><td>能写出大纲、练习与验收标准，并逐条标出「哪部分不依赖特定产品」</td><td>09、附录 E</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>这张表的三个已知边界（别把预期当事实）</h4>
  <p>
    <strong>一、学时只对 13 号课写了具体数字</strong>，因为只有它有多份来源相互印证；
    其余 21 门一律写「以课程页标注为准」。这不是偷懒，而是纪律：学时、课名、模块数都是易过期信息，
    抄进笔记不写日期，半年后就会误导你自己。
  </p>
  <p>
    <strong>二、「适合谁 / 学完能做什么」是编者预期</strong>。判断是否达成，
    不要看「我上完了没有」，要看<strong>第 6 节那个 30 分钟实验</strong>能不能做出来。
  </p>
  <p>
    <strong>三、英文课名是按 URL slug 还原的</strong>，可能与页面显示名不同。
    以课程页为准；要找课就用上面的链接，不要用转述的课名去搜。
  </p>
</section>

<h3>3. 表 2 · 把 4D 框架翻译成本课程的语言</h3>
<p>
  13 号课《AI Fluency: Framework and foundations》由 Anthropic 与
  <strong>Ringling College of Art and Design 的 Rick Dakan</strong>、
  <strong>University College Cork 的 Joseph Feller</strong> 合作开发。
  官方页标注 14 lessons / 4 hr / 1 quiz，完成后可得徽章；
  页面上还附了一份「AI diligence statement」，<strong>披露这门课在开发过程中使用了大模型协助</strong>。
  这个披露本身就是本附录最想让你学的一个动作：<em>用了 AI 就写清楚用了在哪</em>。
</p>
<p>
  框架叫 <strong>4D</strong>：Delegation（委派）、Description（描述）、Discernment（辨识）、Diligence（尽责）。
  下面这套翻译是编者做的，目的是让每一维都落成<strong>你能在本课程里找到方法、并在项目里执行</strong>的动作。
</p>
<table class="tbl small">
  <thead><tr><th>4D</th><th>本课程语言的一句话</th><th>这一步要产出的东西</th><th>常见的假装做到了</th><th>本课程章节</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Delegation</strong><br />委派</td>
      <td>先决定<strong>哪些活不该交给模型</strong>，再决定交给它多少</td>
      <td>一张两栏分工表，外加一条「绝不外发」清单</td>
      <td>「先让它全做一遍，我再改」——把判断也一起交出去了</td>
      <td>00、21</td>
    </tr>
    <tr>
      <td><strong>Description</strong><br />描述</td>
      <td>把需求说到<strong>可验收</strong>：输入、输出格式、判据、反例</td>
      <td>一份 5 条的验收条件，别人拿它也能判断对错</td>
      <td>「帮我优化一下」——写完连自己都无法判定是否达成</td>
      <td>14、16</td>
    </tr>
    <tr>
      <td><strong>Discernment</strong><br />辨识</td>
      <td>用<strong>第 09 章的评估方法</strong>验收输出，而不是读起来觉得不错</td>
      <td>基线、分组切分、均值±标准差、置换检验 p 值</td>
      <td>把「语气自信、格式漂亮」当成正确</td>
      <td>09</td>
    </tr>
    <tr>
      <td><strong>Diligence</strong><br />尽责</td>
      <td>写清楚<strong>谁签字负责</strong>、留什么记录、出错怎么回滚</td>
      <td>台账四字段：日期、命令、数字、验证状态</td>
      <td>「是模型说的」——一出事就没有责任人，也无法复现</td>
      <td>16、附录 C</td>
    </tr>
  </tbody>
</table>

<h4>3.1 Delegation：哪些活不该交出去</h4>
<p>
  接地气的说法是：<strong>先划一条线，再开始用工具</strong>。
  这条线不按「难不难」划，而按「错了我能不能发现」划。
  下面这张清单以后做类似项目时可以直接抄进项目笔记（现在先理解思路），逐项打勾：
</p>
<table class="tbl small">
  <thead><tr><th>工作类型</th><th>能不能交给模型</th><th>理由</th></tr></thead>
  <tbody>
    <tr><td>把已有代码改写成另一种写法</td><td>可以，但要跑测试</td><td>错误会被编译器和测试抓住</td></tr>
    <tr><td>生成样板、写文档初稿</td><td>可以</td><td>错了代价低，且你会通读一遍</td></tr>
    <tr><td>设计「怎么切分数据集」</td><td><strong>不交</strong></td><td>这是实验设计，一旦泄漏（同一艺人跨两侧），后面所有数字都作废</td></tr>
    <tr><td>决定「什么样的提升算成功」</td><td><strong>不交</strong></td><td>判据要事先声明，事后让模型帮你挑一个有利的指标就是 p-hacking</td></tr>
    <tr><td>最终听测结论 / 对外结论</td><td><strong>不交</strong></td><td>要有人签字；模型没有责任能力</td></tr>
    <tr><td>识别「这段音频是不是同一艺人」</td><td>可辅助，需人工核对</td><td>它是分组键的来源，搞错会污染整个评估</td></tr>
  </tbody>
</table>
<p>
  注意最后三行的共同点：它们都是<strong>判据</strong>与<strong>责任</strong>，不是<strong>劳动</strong>。
  模型擅长替代劳动，不擅长替你承担责任。<strong>判据和责任一律自己留着</strong>，这就是 Delegation 的全部内容。
</p>

<h4>3.2 Description：把需求说到可验收</h4>
<p>
  「可验收」有个可操作的判据：<strong>把这份需求交给另一个人，他能不能独立判断你做完了没有</strong>。
  一条合格的验收条件必须包含五样东西，缺一样就会退化成「看起来对」：
</p>
<ol>
  <li><strong>输入</strong>：数据从哪来、多少条、什么格式（例如 250 条标注，字段 artist_id / bpm_delta / duration）。</li>
  <li><strong>输出格式</strong>：文件名、列名、单位、精度（例如 <code>cv_report.md</code>，RMSE 保留两位小数）。</li>
  <li><strong>判据</strong>：什么算通过（例如按艺人分组 5 折，均值误差不超过基线的 90%）。</li>
  <li><strong>反例</strong>：明确列出不许出现的做法（例如不许在划分前做标准化、不许用测试折调参）。</li>
  <li><strong>拒答条件</strong>：信息不足时它应该停下来问，而不是猜（写明「缺 artist_id 就停下并告诉我」）。</li>
</ol>
<table class="tbl small">
  <thead><tr><th>写法</th><th>例子</th><th>结果</th></tr></thead>
  <tbody>
    <tr>
      <td>差（无法验收）</td>
      <td>「帮我写个交叉验证脚本，效果尽量好」</td>
      <td>拿到一段能跑但不知道对不对的代码；「效果好」永远是它说了算</td>
    </tr>
    <tr>
      <td>好（可验收）</td>
      <td>「读 <code>data.csv</code> 的 250 行，按 <code>artist_id</code> 做 5 折 GroupKFold；每折打印 RMSE 两位小数；最后输出均值±标准差与每折数值；标准化只能在训练折上拟合；缺列就停下报错」</td>
      <td>输出可以直接贴进报告；任何一条不满足你都能立刻指出</td>
    </tr>
  </tbody>
</table>

<h4>3.3 Discernment：用第 09 章的方法验收输出</h4>
<p>
  这一维是 4D 与本课程重叠最深的地方，也是「官方课」最不容易替你补上的地方：
  官方课会教你<strong>怎么让模型产出</strong>，本课程第 09 章教你<strong>怎么判定产出是真的有用</strong>。
  把第 09 章的协议原样搬过来，四步：
</p>
<ol>
  <li><strong>先立基线（Level 0）</strong>：一条规则或一个最简单模型。任何「AI 帮忙后变好了」都要先打败它。</li>
  <li><strong>分组切分</strong>：按艺人（或专辑）做 GroupKFold，保证同一艺人只出现在一侧；标准化只在训练折上拟合。</li>
  <li><strong>先算噪声下限</strong>：\(\mathrm{SE} = \sigma/\sqrt{N}\)。代入 \(\sigma \approx 1.9\) 秒（与下例 RMSE 口径一致）、\(N = 250\)，
      得 \(\mathrm{SE} \approx 0.12\) 秒。小于 1 个 SE 的改进不要写进结论。</li>
  <li><strong>置换检验</strong>：打乱标签重跑同一套流程 \(B = 500\) 次，按
      \(p = \dfrac{\#\{E_{\text{perm}} \le E_{\text{real}}\} + 1}{B+1}\) 算 p 值。
      注意 \(p\) 的最小非零值是 \(1/(B+1) \approx 0.002\)——
      报告「p &lt; 0.002」比报告「p = 0.000」诚实。</li>
</ol>
<p>
  于是「模型说它优化了 15%」这句话，在你的报告里会变成：
  <em>「在 N=250 条按艺人分组的样本上，方案的 RMSE 为 1.92 ± 0.31（5 折），相对 Level 0 降低 15%，
  置换检验 p = ___（B=500）；由于可检测下限约为 0.24 秒，本次改进（___ 秒）落在（可检测 / 不可检测）范围内。」</em>
  这句话才是 Discernment 的证据。
</p>

<h4>3.4 Diligence：谁签字负责</h4>
<p>
  最容易被跳过、又最容易在评审时被追问的一维。它只要求两个动作：
</p>
<ol>
    <li><strong>每条结论指定一个签字人</strong>——在以后你自己的项目里就是你自己，但要写下来：
      「本节所有数字由我运行并核对，日期 ____，命令见附录」。</li>
  <li><strong>台账四字段</strong>（照抄附录 C 的格式）：链接 / 访问日期 / 一句话结论 / 验证状态。
      验证状态这一栏要区分<strong>「课程页说」与「我跑过」</strong>——评审时这两者的分量完全不同。</li>
</ol>
<p>
  13 号课页面上的 AI diligence statement 就是这个动作的官方示范：
  用了大模型协助，就在页面上写明用了。你交付项目时也该有这么一行：
  「本报告的图表代码由 AI 协助生成，所有数字由作者运行核对，脚本在 <code>scripts/</code>。」
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>把 4D 走一遍：以 Crossfade 这类任务为例（以后可直接照抄）</h4>
  <p>任务：让模型帮忙建一套「按艺人分组」的交叉验证脚本，用来比较过渡时长模型。</p>
  <table class="tbl small">
    <thead><tr><th>步骤</th><th>你做什么</th><th>产出</th><th>数字 / 判据</th></tr></thead>
    <tbody>
      <tr>
        <td>Delegation</td>
        <td>列出 6 项工作，圈出 3 项不交：分组键定义、判据设定、最终结论签字</td>
        <td>两栏分工表 + 「绝不外发」清单</td>
        <td>6 项里交 3 项；原始音频一律不外发</td>
      </tr>
      <tr>
        <td>Description</td>
        <td>写 5 条验收条件（输入 250 行、GroupKFold(5)、每折 RMSE 两位小数、划分后拟合标准化、缺列报错）</td>
        <td>一页需求说明，别人拿它也能判对错</td>
        <td>5 条全部可判真假；每条都有一个反例</td>
      </tr>
      <tr>
        <td>Discernment</td>
        <td>先跑 Level 0 规则基线；再跑脚本；算 SE 与置换检验</td>
        <td>「RMSE 1.92 ± 0.31（5 折，按艺人分组），p = ___」</td>
        <td>\(N=250\)，\(\mathrm{SE}\approx0.15\) 秒，可检测下限约 0.3 秒，\(B=500\)</td>
      </tr>
      <tr>
        <td>Diligence</td>
        <td>在实验台账写四字段，并在报告脚注声明 AI 参与范围</td>
        <td>可复现记录：日期 + 命令 + 数字 + 验证状态</td>
        <td>每条数字必须在第二个模型上再复现一次（见第 6 节）</td>
      </tr>
    </tbody>
  </table>
  <p>
    四个步骤合计约 90 分钟，其中真正「用模型」的时间不超过 20 分钟——
    <strong>这就是 4D 的配比：大部分时间花在划边界、写需求和验收上，而不是花在生成的等待上。</strong>
  </p>
</section>

<h3>4. 表 3 · 厂商中立检查表</h3>
<p>
  上完<strong>任何</strong>一家官方课（不限于本附录这 22 门）之后，花 10 分钟把这 8 个问题过一遍。
  每题 1 分，答得上得 1 分，答不上得 0 分。<strong>分数不是用来评价课程的，是用来定位你自己的短板。</strong>
</p>
<table class="tbl small">
  <thead><tr><th>#</th><th>自问</th><th>「合格」长什么样</th><th>答不上来说明什么</th><th>本课程章节</th></tr></thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>我学到的是<strong>能力</strong>还是<strong>按钮</strong>？</td>
      <td>能用一句与界面无关的话描述这件事：输入什么、做什么、输出什么</td>
      <td>你记的是操作步骤；下次改版就得重新学</td>
      <td>25</td>
    </tr>
    <tr>
      <td>2</td>
      <td>换一家模型，同一件事我还能不能做？</td>
      <td>做过一次迁移实验，有<strong>迁移率</strong>这个数字（同一需求原样通过验收的比例）</td>
      <td>能力绑在产品上；迁移率低于 0.6 说明需求写得不够中性</td>
      <td>09、第 6 节</td>
    </tr>
    <tr>
      <td>3</td>
      <td>这套术语在<strong>开放标准或论文</strong>里叫什么？</td>
      <td>能说出通用名与出处（例如工具调用、检索增强、上下文窗口）</td>
      <td>你把厂商的专有名词当成了概念本身</td>
      <td>附录 A</td>
    </tr>
    <tr>
      <td>4</td>
      <td>我的数据<strong>流向哪里</strong>？谁看得到、留多久？</td>
      <td>说得出一份数据分类：可外发 / 脱敏后可发 / 绝不外发</td>
      <td>你可能已经把不该发的数据发出去了</td>
      <td>20、24、附录 D</td>
    </tr>
    <tr>
      <td>5</td>
      <td>成本模型是什么？</td>
      <td>能说出计费维度（按 token / 按座席 / 按算力）与一个量级估算</td>
      <td>你无法判断「这个用法值不值」</td>
      <td>23、08</td>
    </tr>
    <tr>
      <td>6</td>
      <td>出错时我能定位到哪一层？</td>
      <td>分层排查：输入 → 提示 → 工具 → 模型 → 数据；每层有一个可打印/可回看的证据</td>
      <td>只能重试，不能定位</td>
      <td>08、19</td>
    </tr>
    <tr>
      <td>7</td>
      <td>我能用<strong>可复核的方法</strong>证明自己学到了吗？</td>
      <td>有基线、有分组切分、有均值±标准差、有 p 值或明确说不显著</td>
      <td>你的「学会了」目前只是一个主观印象</td>
      <td>09</td>
    </tr>
    <tr>
      <td>8</td>
      <td>如果明天停用这家服务，我的产出还剩什么？</td>
      <td>说得出可带走的东西：数据、脚本、规范、笔记、需求说明</td>
      <td>你的资产其实是租来的</td>
      <td>29、23</td>
    </tr>
  </tbody>
</table>
<p>
  <strong>怎么判分</strong>：8 分 = 这批课你确实转化成了自己的能力；
  5–7 分 = 半中立，缺的通常是第 2、3、8 题；
  4 分及以下 = 目前只是「会用某家产品」，建议先补第三组（13–16），再做第 6 节的实验。
</p>
<p>
  <strong>一个算例</strong>：某同学上完两门课后自评得 5 分，答不上的是第 3 题（术语）与第 8 题（退出成本）。
  补法不是再上一门课，而是两小时内做完两件事：翻附录 A 把该功能的通用名找出来（约 40 分钟），
  然后做第 6 节的迁移实验，把迁移率写成数字（约 60 分钟）。补完之后这两题就有证据了。
</p>

<h3>5. 表 4 · 三种身份的学习路径</h3>
<p>
  完整清单有 22 门，但没人需要全上。<strong>每门课的时间都应该换取一个能放进作品集或流程里的产出</strong>，
  否则它只是娱乐。下面按身份给最小路径，每个身份只上 3 门，且都配本课程的一个实验。
</p>
<table class="tbl small">
  <thead><tr><th>身份</th><th>先上哪 3 门</th><th>可以跳过</th><th>配套做本课程哪个实验</th><th>一个月后的产出物</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>想自己做研究的学生</strong></td>
      <td>13（素养框架，4D 地基）→ 14（能力与局限）→ 17（学生 AI 素养）</td>
      <td>05–12 的技术课（暂时用不上）；20、21（K-12 培训）</td>
      <td>附录 B 的 <strong>E7</strong>（分组交叉验证 + 置换检验）</td>
      <td>一页评估报告：基线、分组切分、RMSE ± 标准差、p 值，加一段「AI 参与范围」声明</td>
    </tr>
    <tr>
      <td><strong>要写代码的开发者</strong></td>
      <td>03 或 04（编码智能体）→ 09（MCP 入门）→ 15（开发者 AI 素养）</td>
      <td>17–22 的身份课（与你无关）；01 的界面向导（半天可跳过）</td>
      <td><strong>E8</strong>（量化 + 推理吞吐成本对照），顺带把 30 分钟实验做成交付前置检查</td>
      <td>一个仓库：README 写清一条命令跑通；<code>tests/</code> 能挡住 AI 改坏的提交；一条 MCP 最小服务端</td>
    </tr>
    <tr>
      <td><strong>要带团队或教学的人</strong></td>
      <td>13（4D）→ 19 或 20（教育者路径）→ 22（素养教学）</td>
      <td>05–12 里与自家平台无关的部分；07 平台 101（除非你要做技术选型）</td>
      <td>第 6 节的 30 分钟对照实验，<strong>让被培训的人自己跑一遍</strong></td>
      <td>一页使用规范（能交 / 不能交 + 数据分类）+ 一次带验收的培训设计</td>
    </tr>
  </tbody>
</table>
<h4>5.1 一个可执行的四周计划（以「学生」路径为例）</h4>
<table class="tbl small">
  <thead><tr><th>周</th><th>做什么</th><th>时间</th><th>本周产出</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>本课程第 09 章 + 13 号课</td><td>6–8 小时</td><td>4D 分工表；能说出自己最常漏掉哪一维</td></tr>
    <tr><td>2</td><td>本课程第 01 章 + 14 号课</td><td>4–6 小时</td><td>一页「可做 / 需复核 / 不做」任务清单，每类各写一个例子</td></tr>
    <tr><td>3</td><td>附录 B 的 E7 做第一遍</td><td>6 小时</td><td>基线 + 分组交叉验证结果（含每折数值）</td></tr>
    <tr><td>4</td><td>17 号课 + E7 做第二遍 + 第 6 节的迁移实验</td><td>6 小时</td><td>评估报告定稿：p 值、效应量、迁移率三个数字</td></tr>
  </tbody>
</table>
<p>
  四周合计约 24 小时。对照一下：如果改成把 22 门课按顺序刷完，
  光 13 号课官方页标注的就是 4 小时，再加上其余课程的课程页标注学时，
  很容易超过 40 小时，而你手上仍然只有一堆「我看过」。
  <strong>路径的价值不在于上了几门，而在于每周都有一个能被别人检查的产出。</strong>
</p>

<h3>6. 30 分钟最小对照实验：不依赖任何特定产品</h3>
<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：用第 09 章的方法验收「这节课我到底学到没有」</h4>
  <p>
    目标：用<strong>任意一个聊天模型</strong>（官方课里那个也行，本地跑的也行，换一家也行），
    在同一个任务上产出两版答案，然后做一次最小对照。全程不需要任何特定产品的功能，
    只要你<strong>能对着两个回答打分</strong>。
  </p>
  <p><strong>准备</strong>：挑一个假设的练习小任务（例如「给一段 8 秒 crossfade 写三条听测注意事项」，以后做类似项目时可换成真实任务），
    准备好同一份输入。下面用占位符表示，替换成你自己的内容即可：</p>
  <pre><code><span class="cm"># v1：一句话需求（低描述度）</span>
  用 [任务] 处理 [输入]，尽量做好。

<span class="cm"># v2：可验收需求（高描述度）</span>
  任务：[任务]
  输入：[输入]
  输出格式：3 条，每条不超过 20 字，编号 1-3
  判据：每条必须能指向一个具体时间段；不许出现「注意音质」这类无法执行的建议
  反例：不要泛泛而谈，不要重复同一条
  信息不足时：停下来问我，不要猜</code></pre>
  <p><strong>时间表（30 分钟）</strong>：</p>
  <ol>
    <li><strong>0–5 分钟</strong>：写下 3 条验收条件（可判真假），以及你会用哪 3 个维度打分（建议：正确性 / 完整性 / 可复核性）。</li>
    <li><strong>5–12 分钟</strong>：同一个模型、同一份输入，先跑 v1 再跑 v2（<strong>新开对话</strong>，避免它看到 v1）。</li>
    <li><strong>12–20 分钟</strong>：把两版答案的顺序<strong>随机化</strong>（抛硬币决定谁叫 A、谁叫 B），然后按 3 个维度各打 0/1 分，写进下面的记录表。</li>
    <li><strong>20–27 分钟</strong>：算三个数字（见后）。</li>
    <li><strong>27–30 分钟</strong>：把三行结论写进你的实验台账，标上日期。</li>
  </ol>
  <p><strong>要记录的三个数字</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>#</th><th>数字</th><th>怎么算</th><th>怎么读</th></tr></thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>有效比较次数与胜负比</td>
        <td>逐维度比较：v2 胜记 1、v1 胜记 −1、同分记 0，去掉平局后得到 \(n_{\text{eff}}\) 与 v2 的胜次 \(k\)</td>
        <td>\(n_{\text{eff}}\) 小于 5 时，任何结论都只是印象</td>
      </tr>
      <tr>
        <td>2</td>
        <td>符号检验的 p 值</td>
        <td>在「两版没差别」的原假设下，v2 赢 \(k\) 次及以上的双尾概率</td>
        <td>\(n_{\text{eff}}=7\)、\(k=6\) 时 \(p = 0.125\)，<strong>不显著</strong>——样本太小，别下结论</td>
      </tr>
      <tr>
        <td>3</td>
        <td>迁移率</td>
        <td>把 v2 的需求原样搬到<strong>另一个模型</strong>（换一家或本地开放权重模型），仍然通过验收的任务数 ÷ 总任务数</td>
        <td>低于 0.6 说明你的需求里藏着只有原模型能懂的假设，要重写</td>
      </tr>
    </tbody>
  </table>
  <p>符号检验可以直接跑五行程序（把 <code>n_eff</code> 与 <code>k</code> 换成你的数）：</p>
  <pre><code><span class="cm"># [逐行剖析] 配对符号检验 (Sign Test) 离散二项分布双尾精确 p 值计算</span>
from math import comb
<span class="cm"># 1. 剔除平局 (Tie) 后的有效配对对比总次数 n_eff</span>
n_eff = 7
<span class="cm"># 2. 新策略 v2 胜出的离散观测频次 k</span>
k = 6
<span class="cm"># 3. 计算双尾 p 值: 2 * sum_{i=k}^{n} C(n, i) * (0.5)^n（k 取多数侧；若 k&lt;n/2 先用 n-k 代入，否则 p 会超过 1）</span>
p = 2 * sum(comb(n_eff, i) for i in range(k, n_eff + 1)) / (2 ** n_eff)
print(f"双尾显著性检验 p 值 = {round(p, 3):.3f}")  <span class="cm"># 检验在 alpha=0.05 下是否具备统计学泛化显著性</span></code></pre>
  <p><strong>记录表（照抄进你的台账）</strong>：</p>
  <table class="tbl small">
    <thead><tr><th>日期</th><th>任务</th><th>有效比较 n_eff</th><th>v2 胜次 k</th><th>p 值</th><th>迁移率</th><th>结论（一句话）</th></tr></thead>
    <tbody>
      <tr><td>2026-10-05</td><td>crossfade 听测注意事项</td><td>7</td><td>6</td><td>0.125</td><td>3/6 = 0.50</td><td>描述度提升方向正确，但 7 次比较不足以证明；迁移率低于 0.6，需求要重写；需要把任务扩到 20 个以上</td></tr>
    </tbody>
  </table>
  <p>
    <strong>这个实验为什么重要</strong>：它用 30 分钟把「我上完课了」变成三个可以被别人复查的数字。
    而且它<strong>完全不依赖任何特定产品</strong>——你换了模型、换了课程、换了年份，这张表照样能填。
    这正是「可迁移能力」的操作定义。
  </p>
</section>

<h3>7. 以后接到这类项目时怎么判断：以 Crossfade 为例值不值</h3>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>结论：22 门不必全上，以这类题目为例值得的是 3 门（供以后参考）</h4>
  <p>
    以 crossfade 这类「音频过渡建模 + 申请材料」题目为例（你以后可以试试），它的瓶颈不是「不知道怎么点某个功能」，
    而是<strong>评估的可信度</strong>与<strong>数据留在本地</strong>两件事。按这两条筛：
  </p>
  <table class="tbl small">
    <thead><tr><th>课程</th><th>对 crossfade 这类任务的价值（供以后参考）</th><th>什么时候上</th><th>产出</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>13</strong> AI 素养框架（4D）</td>
        <td><strong>高</strong>。它给你一套划边界与签字的语言，直接改善以后写第 29 章这类答辩叙事时的表达</td>
        <td>现在，与第 09 章并行</td>
        <td>4D 分工表 + AI 参与范围声明</td>
      </tr>
      <tr>
        <td><strong>09 / 10</strong> MCP 入门与进阶</td>
        <td><strong>高</strong>。以后做这类项目时，音频与标注数据在本地，把 artist 索引暴露成一个只读工具，
          比把数据上传到别处更可控；而且 MCP 是开放协议、有公开规范，不是某家产品的私有接口</td>
        <td>第 19–20 章之后</td>
        <td>一条最小只读服务端 + 一份权限清单</td>
      </tr>
      <tr>
        <td><strong>14</strong> AI 能力与局限</td>
        <td><strong>中高</strong>。帮你写清「哪类结论不能外包给模型」，评审最常追问的就是这个</td>
        <td>写报告前两周</td>
        <td>一页「可做 / 需复核 / 不做」清单</td>
      </tr>
      <tr>
        <td>01–04、16–22</td>
        <td><strong>低</strong>（除非以后带人或教课）。界面向导与身份模板不会提升这类项目的可信度</td>
        <td>需要用的时候再上</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
  <p>
    <strong>值不值</strong>：三门课按课程页标注学时估算，投入大致在半天到一天；
    换上来的东西是「一份能被追问的评估报告」和「一条不把数据搬家的工具接法」。
    对一个以后要交申请材料的题目，这笔账是划算的。
  </p>
  <p>
    <strong>但如果你只有十小时预算，优先级应该是</strong>：
    先把第 09 章的 E7 做完（6 小时），再上 13 号课（课程页标注 4 小时）。
    <strong>先把验收方法立起来，再去扩充工具</strong>——顺序反了，你会得到一堆无法辩护的数字。
  </p>
  <p>
    明确说一句：<strong>本附录不需要你以后成为某个产品的专家</strong>。
    这类题目的评委看的是「你怎么证明你的结论」，不是「你会点哪几个按钮」。
  </p>
</section>

<h3>8. 表 5 · 官方课里的说法 ↔ 通用概念 ↔ 开放 / 开源替代</h3>
<p>
  这张表是整份附录的「翻译层」。官方课用产品名词讲概念，这在学习时很方便，
  但在写报告、跟别人协作、或者换平台时就会变成障碍。把产品名词翻成通用概念，再找一条不依赖它的路：
</p>
<table class="tbl small">
  <thead><tr><th>官方课里的说法</th><th>通用概念（写报告用这个）</th><th>开放标准 / 开源替代</th><th>本课程章节</th></tr></thead>
  <tbody>
    <tr>
      <td>MCP 工具 / 连接器</td>
      <td>把外部能力以统一描述暴露给模型，让模型决定何时调用</td>
      <td><strong>MCP 本身是开放协议、有公开规范</strong>；同层还有通用的函数/工具调用约定，以及各框架自己的工具描述格式</td>
      <td>19、18</td>
    </tr>
    <tr>
      <td>编码智能体的「读-改-跑」</td>
      <td>带工具循环的编码代理：读文件、改代码、执行测试、看结果再决定下一步</td>
      <td>一类开源编码智能体（如 Aider、OpenHands、Cline 等），或自己用 30 行编排循环实现</td>
      <td>25、29</td>
    </tr>
    <tr>
      <td>Agent 技能 / 技能库</td>
      <td>把重复任务的输入输出约定固化下来，避免每次重写提示</td>
      <td>朴素做法：一个版本化的提示模板 + 一份示例输入输出；框架无关</td>
      <td>19</td>
    </tr>
    <tr>
      <td>子代理 / 并行执行者</td>
      <td>任务分解 + 上下文隔离 + 结果汇总（多智能体编排）</td>
      <td>通用编排框架（如 LangGraph 等），或者最稳的版本：多次独立调用 + 人工汇总</td>
      <td>19、25</td>
    </tr>
    <tr>
      <td>Bedrock / Vertex 上的模型</td>
      <td>托管推理服务：云厂商负责算力与合规外壳，模型提供方负责权重与行为</td>
      <td>自建推理服务（vLLM、TGI、llama.cpp 等），本地跑开放权重模型</td>
      <td>10、23</td>
    </tr>
    <tr>
      <td>上下文 / 记忆功能</td>
      <td>上下文窗口内的信息组织与检索增强</td>
      <td>自己搭检索（BM25 / FAISS 等）+ 显式拼接；不依赖任何产品的「记忆」开关</td>
      <td>18</td>
    </tr>
    <tr>
      <td>额度、限流、会员档位</td>
      <td>服务等级与成本约束：按 token 计费、按时间窗限流、超额降级</td>
      <td>自建服务时用队列与并发上限表达同一件事；成本口径自己算</td>
      <td>23、24</td>
    </tr>
  </tbody>
</table>
<p>
  用法很简单：任何一次「我学会了某功能」之后，强迫自己在这张表里找一行，
  用<strong>中间那一列</strong>把这件事复述一遍。<strong>说得出来，才叫学会了。</strong>
</p>

<h3>9. 官方课的性质、边界与能力证明</h3>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>六条提醒（每一条都值得写在笔记第一页）</h4>
  <ol>
    <li><strong>课程免费，但免费不等于中立。</strong>它们是厂商的学习资源，
      示例、界面截图与推荐做法会偏向自家产品。这不影响它们的价值，但你要用第 4 节的检查表读它。</li>
    <li><strong>内容会更新。</strong>课名、模块数、学时都可能变；<strong>以课程页当时的标注为准</strong>。
      本附录的课程清单与链接核对日期是 <strong>2026-10-05</strong>，除此之外不要引用任何二手精确数字。</li>
    <li><strong>课程页可能要求登录</strong>，部分练习要在其产品环境里完成。
      如果登录或环境不可用，看课程大纲与公开材料同样能拿到概念部分——
      概念不依赖账号。</li>
    <li><strong>结业徽章不是能力证明。</strong>徽章证明你完成了一套流程，
      它不证明你能在<strong>没有这门课的界面</strong>的情况下把事做成。</li>
    <li><strong>官方披露了 AI 参与，你也该披露。</strong>
      13 号课页面附有 AI diligence statement，说明该课开发中使用了大模型协助。
      这是一种可以照抄的职业习惯：你的报告里也要有一行写清 AI 参与了哪一部分、你核对了什么。</li>
    <li><strong>不要把「上了课」当终点。</strong>课程的产出是<strong>你接下来要做的实验</strong>，
      不是一段可以写进简历的完成记录。</li>
  </ol>
</section>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>那用什么证明能力？三样东西，缺一不可</h4>
  <table class="tbl small">
    <thead><tr><th>证据</th><th>长什么样</th><th>为什么它比徽章有力</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>可复现的作品</strong></td>
        <td>一个仓库；README 里的命令能一条跑通；<code>tests/</code> 能挡住坏提交</td>
        <td>任何人都能当场验证，而徽章只能被你展示</td>
      </tr>
      <tr>
        <td><strong>实验台账</strong></td>
        <td>日期 + 命令 + 数字 + 验证状态（「课程页说」还是「我跑过」）</td>
        <td>它记录的是过程；过程造假成本远高于点完视频</td>
      </tr>
      <tr>
        <td><strong>迁移记录</strong></td>
        <td>同一个需求在第二个模型或开放权重实现上的结果与迁移率</td>
        <td>它直接回答了「你学的是能力还是按钮」这个问题</td>
      </tr>
    </tbody>
  </table>
  <p>
    这三样加起来，就是第 6 节那个 30 分钟实验的放大版：
    把一次对照做成一条持续记录。评审追问「这是你自己做的吗」时，
    你能给出的不是「我上过官方课」，而是一张带日期的表。
  </p>
</section>

<h3>10. 自测 · 5 题</h3>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你在某家官方课里把某个功能练得很熟，但换一家模型后同一个任务做不出来。最该补的是什么？</p>
  <ul class="opts">
    <li>再上一门该厂商的进阶课，把功能学得更全</li>
    <li data-ok>把能力与界面分开：用通用语言把需求写成可验收的条件，并在第二个模型上复现一次，记录迁移率</li>
    <li>认定另一家模型不行，回到原来那家</li>
    <li>把该功能的操作步骤背下来</li>
  </ul>
  <p class="why">
    换一家就做不出来，说明你记住的是界面流程，而不是任务本身。可迁移的做法是把「输入、输出格式、判据、反例」
    写成对模型无关的需求，然后做一次迁移实验——迁移率低于 0.6 就重写需求，而不是换回原产品。
    这正是第 4 节检查表第 2 题与第 6 节实验要测的东西。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">关于 09、10 号课对应的 MCP，正确的说法是？</p>
  <ul class="opts">
    <li>它是某家产品的私有接口，只能配合该家的模型使用</li>
    <li data-ok>它是开放协议、有公开规范；与通用的「工具/函数调用」处在不同层面，不是某一家的私有接口</li>
    <li>它等同于检索增强（RAG），只是换了个名字</li>
    <li>它只在云端可用，本地数据无法接入</li>
  </ul>
  <p class="why">
    MCP 是开放协议、有公开规范，这正是本附录把它列为「值得投入」的原因：
    你按规范搭出来的最小服务端，不会因为产品改版而失效。
    它解决的是「把外部能力以统一描述暴露给模型」，与检索增强（把知识放进上下文）是两件事，
    与函数调用则是同一层面的不同实现约定。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">13 号课 4D 框架中的 <strong>Discernment（辨识）</strong>，在本课程里最接近哪件事？</p>
  <ul class="opts">
    <li>把需求写清楚，让模型知道要什么</li>
    <li>决定哪些子任务不交给模型</li>
    <li data-ok>用第 09 章的方法验收输出：立基线、分组切分、先算噪声下限、做置换检验</li>
    <li>在交付文档上签名，声明 AI 参与范围</li>
  </ul>
  <p class="why">
    Discernment 的关键是「不靠读起来觉得不错」：\(N=250\) 时 \(\mathrm{SE}\approx0.12\) 秒、
    可检测下限约 0.24 秒，因此小于 1 个 SE 的改进不该写进结论。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">你的四周计划只有 24 小时，而 22 门课按顺序刷完至少 40 小时。按本附录的建议，你该怎么做？</p>
  <ul class="opts">
    <li>每天多挤 2 小时，硬把 22 门刷完，覆盖面最重要</li>
    <li data-ok>只上 13 号课（约 4 小时）加做第 6 节 30 分钟实验，拿三个可被别人检查的数字，剩下时间做自己项目的验收</li>
    <li>每门课只看前 10 分钟，22 门的目录都过一遍就行</li>
    <li>先花 24 小时刷课，自己的项目以后再说</li>
  </ul>
  <p class="why">
    40 与 24 差 16 小时，硬刷等于主动放弃项目验收。第 6 节实验产出三个可检查的数字
    （迁移率、双尾 p 值、带日期命令的台账），13 号课给你 4D 语言；
    刷完 22 门但零产出，评审那关等于零证据——顺序是先立验收，再扩工具。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">评审现场给你一份材料：commit 时间线、可运行仓库、AI 披露声明、一份迁移率 0.2 的记录。按本附录判据，结论是？</p>
  <ul class="opts">
    <li>材料这么全，通过；0.2 说明这个模型太差，换个模型就行</li>
    <li>只看徽章和学时就够了，0.2 是正常波动</li>
    <li data-ok>可验证的是仓库跑通、台账日期命令、迁移记录三样；0.2 低于 0.6 说明需求写得不够中性，要重写需求；「已掌握协作能力」这个结论会被追问穿帮</li>
    <li>材料越多越可信，不用逐项验证</li>
  </ul>
  <p class="why">
    能当场验证的只有三样：一条命令跑通的仓库、记着日期命令数字的台账、换模型重跑的迁移记录。
    迁移率 0.2 远低于 0.6，判据指向需求本身不中性——换模型解决不了需求的问题。
    徽章与学时证明的是流程，不是能力；「材料多」不等于「结论成立」。
  </p>
</div>
`
});
