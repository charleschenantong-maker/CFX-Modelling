/* content/14-workflow.js — 模块 14：工作流与多线程舰队 */
COURSE.register({
  id: "m14",
  part: 4,
  num: "14",
  title: "工作流：85/15 规则与多线程智能体舰队",
  en: "Workflow & Multi-Thread Fleet Management",
  minutes: 35,
  tags: ["工作流", "智能体", "系统"],
  body: String.raw`
<p class="lead">
  前面十三模块讲的是「模型怎么工作」。这一模块讲「人怎么用模型工作」——
  访谈记录里最有价值的部分不是技术细节，而是一整套把智能体当工程团队管理的操作规范。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    大多数人用 AI 的方式是：写一段提示、等它吐代码、复制粘贴、发现问题、再问一次。
    这种方式的天花板很低，因为<strong>瓶颈从来不是「生成代码」，而是「确认代码是对的」</strong>。
    记录中的整套工作流，本质上就是把算力从「写」重新分配到「验」。
  </p>
</section>

<h3>1. 85/15 规则：把 token 花在验证上</h3>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>记录中的分配</h4>
  <ul>
    <li><strong>10–15% 的 token</strong>：写实际的代码改动。</li>
    <li><strong>85–90% 的 token</strong>：跑测试、类型检查、编译、边界情况验证、自动化代码审查。</li>
  </ul>
  <p>
    为什么这个比例是理性的？因为<em>代码的正确性无法由生成本身保证</em>。
    智能体可以在一分钟内产出 300 行看起来完全合理的代码，其中可能藏着三个边界错误。
    把 85% 的预算投在验证上，等于用极低的边际成本买到「可以信任的产出」。
  </p>
</section>
<p>可操作的含义（以后做 crossfade 这类项目时可直接套用）：</p>
<ul>
  <li>每次让智能体改代码，都<strong>同时</strong>要求它写/更新对应的测试，并跑一遍。</li>
  <li>把「运行结果」作为验收标准写进提示，而不是「看起来对不对」。</li>
  <li>数值实验必须<strong>打印中间量</strong>（loss、梯度范数、RMSE、p 值），而不是只给一句「已完成」。</li>
</ul>

<h3>2. 15 秒回滚规则</h3>
<p>
  记录中的标准：<strong>如果一个坏 PR 的回滚需要超过 15 秒，人工审查就会成为速度瓶颈。</strong>
  这句话把「部署速度」翻译成了一个可度量的工程约束。
</p>
<table class="tbl small">
  <thead><tr><th>环节</th><th>慢（&gt;15 秒）</th><th>快（&lt;15 秒）</th></tr></thead>
  <tbody>
    <tr><td>回滚手段</td><td>手工改代码、重新构建、手动部署</td><td>一条命令：<code>git revert</code> + 自动部署，或切换 feature flag</td></tr>
    <tr><td>后果</td><td>没人愿意频繁合并 → 大批量合并 → 冲突与回归风险升高</td><td>小步快跑，坏改动瞬间消失</td></tr>
  </tbody>
</table>
<p>
  <strong>迁移到研究工作流</strong>：你的实验也要有「15 秒回滚」——
  每个实验都在独立分支/目录里跑，配置写在 <code>config.yaml</code>，
  坏结果一键丢弃，好结果一键复现。<em>这不是为了快，而是为了让「尝试」的心理成本足够低。</em>
</p>

<h3>3. 前置问题，而不是前置方案</h3>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>记录中的核心建议</h4>
  <p>
    开发者常花几天时间规划实现步骤，然后才交给智能体。
    更好的做法是<strong>直接把原始问题丢过去</strong>：完整的错误日志、截图、用户的原始抱怨。
    如果智能体十分钟就解决了，你同时省下了「自己规划的时间」和「多轮迭代的 token」。
  </p>
</section>
<table class="tbl small">
  <thead><tr><th>低效做法</th><th>高效做法</th></tr></thead>
  <tbody>
    <tr><td>「我打算先改 A，再改 B，你觉得呢？」</td><td>「这是失败日志全文与复现命令，找出根因并修复，附上验证方式。」</td></tr>
    <tr><td>凭印象描述报错</td><td>粘贴完整堆栈 + 环境版本 + 最近一次改动的 diff</td></tr>
    <tr><td>先问「应该怎么做」</td><td>「先复现问题，再给出最小修复，最后说明你排除了哪些假设。」</td></tr>
  </tbody>
</table>
<p><em>限制条件</em>：前置问题只在你有可靠验证手段时有效。否则智能体会给你一个「看起来很对」的修复，而你没有能力判断——这是第 1 节 85/15 规则的另一个理由。</p>

<h3>4. 管理式提示：像给工程师下任务一样</h3>
<div class="flow">
  <div class="nd hi">目标</div><div class="ar">→</div>
  <div class="nd">验收标准</div><div class="ar">→</div>
  <div class="nd">约束</div><div class="ar">→</div>
  <div class="nd">交付物</div><div class="ar">→</div>
  <div class="nd hi">只在真正卡住时介入</div>
</div>
<pre><code><span class="cm"># 一个可复用的任务模板</span>
目标：把 labs/e7 的岭回归扩展成「模型阶梯」，并给出是否值得上非线性模型的结论。
验收标准：
  1) 一条命令 python run.py 跑完 Level 0-3 与 5 折分组交叉验证；
  2) 输出 RMSE 均值±标准差、置换检验 p 值（B=500）、零分布图；
  3) 生成 results/report.md，包含结论与三条明确的局限性。
约束：只用 numpy/scikit-learn/matplotlib；固定随机种子；不得使用测试集调参。
卡住时：先报告你试过什么、观察到什么，再问问题。
交付：diff + 运行日志 + 生成的图。</code></pre>
<p>
  <strong>关键区别</strong>：给<em>验收标准</em>而不是给<em>实现步骤</em>。前者让智能体自己选择路径并自我检查，
  后者把它降级成一个打字机，同时把你锁进一个可能错误的方案里。
</p>

<h3>5. Thread 是待办事项，不是聊天记录</h3>
<ul>
  <li><strong>Thread 即任务</strong>：一个线程对应一件可完成的事（一个 bug、一个实验、一个重构）。</li>
  <li><strong>Settle（归档）</strong>：任务完成或合并后立刻归档，保持侧边栏「收件箱为零」。</li>
  <li><strong>为什么重要</strong>：长期混杂的线程会把上下文稀释，让模型和人都失去焦点。
      记录中的做法是把线程当<em>易逝的 to-do</em>，而不是<em>积累的历史</em>。</li>
  <li><strong>对照实验</strong>：一个包含三次不同任务的长线程，最终会让模型在同一段上下文里混淆目标；
      三个短线程则各自干净。这与「上下文窗口里塞进无关内容会降低表现」是同一件事。</li>
</ul>

<h3>6. Git worktree：并行的物理隔离</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么每个线程要有自己的工作树</h4>
  <p>
    两个智能体同时改同一个工作目录，会产生三类灾难：
    文件互相覆盖、<code>git add</code> 把对方的半成品一起提交、以及索引锁竞争。
    记录中的做法是<strong>每个并发线程一个 git worktree</strong>，
    等价于「每个任务一个独立沙箱」。
  </p>
</section>
<pre><code><span class="cm"># 为每个任务开一个独立工作树（互不干扰，共享同一个对象库）</span>
git worktree add ../wt-e7-model-ladder -b e7/model-ladder
git worktree add ../wt-audio-metrics     -b audio/metrics

<span class="cm"># 列出与清理</span>
git worktree list
git worktree remove ../wt-e7-model-ladder      <span class="cm"># 任务完成或废弃</span>

<span class="cm"># 若两个智能体撞到同一分支，现代模型通常会退化为「生成临时隔离分支」来避开冲突</span></code></pre>
<p>
  worktree 的关键优势：<strong>共享对象库</strong>（不重复占磁盘），但<strong>索引与工作目录独立</strong>（无锁竞争）。
  这在你的场景里尤其合适：一个工作树跑实验、一个改课程内容、一个整理笔记。
</p>

<h3>7. 端到端任务链：不要「写完就停」</h3>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>记录中的写法</h4>
  <p>
    「构建功能、在 Tailscale 上起一个预览部署、开 PR、然后盯着 PR 与 CI 直到全部通过。」
  </p>
  <p>
    要点是<strong>把「验证」也交给智能体</strong>，而不是让它「写代码然后等人批准」。
    这与 85/15 规则一致：验证占了大部分价值，就不应该由人来手动串行。
  </p>
</section>
<p>以 crossfade 这类任务为例，可以写成这样的链条（你以后可以照此套用）：</p>
<pre><code>1. 在 wt-e7 工作树里实现模型阶梯脚本；
2. 运行 E7 实验，保存 results/（RMSE 表、置换零分布图、config.json）；
3. 生成 results/report.md（含结论与局限）；
4. 把关键图与结论更新到课程项目页；
5. 提交并推送，确认 CI 与仓库状态为绿；
6. 若中途失败，附上完整日志并继续，直到全部通过；只在需要改变研究设计时才停下来问我。</code></pre>

<h3>8. 后台派发与远程卸载</h3>
<dl class="kv">
  <dt>后台派发</dt><dd>记录中的界面操作是 <code>Cmd + Enter</code>：把提示异步派发到后台，光标留在输入框，立刻可以开下一个线程。
      这正是「舰队」的操作节奏——你的时间用于<em>定义任务</em>，不是<em>观看生成</em>。</dd>
  <dt>半透明渲染</dt><dd>运行中的线程在侧边栏半透明显示，<strong>刻意降低你盯着流式输出的诱惑</strong>。
      盯着看不会让结果更好，只会占用你的注意力。</dd>
  <dt>远程节点</dt><dd><code>npx t3 connect</code> / <code>npx t3 serve</code> 把远程无头节点通过 Tailscale 暴露出来，
      于是你可以从笔记本甚至手机派发任务到远端 Linux 机器上执行。</dd>
  <dt>为什么值得</dt><dd>把「重活」放到一直开机的机器上，笔记本只做交互与审查；同时保持单一出口（模块 12）。</dd>
</dl>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>多线程舰队的三个反模式</h4>
  <ol>
    <li><strong>并发写同一处</strong>：没有 worktree 隔离就并行，最后合并成本高于收益。</li>
    <li><strong>验收标准模糊</strong>：十个线程产出十份「看起来不错」的结果，你逐一 review 的时间超过自己写。</li>
    <li><strong>只增不减</strong>：任务池只进不出。必须定期 Settle 与删除废弃分支，否则你会被自己的产出淹没。</li>
  </ol>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与未来这类项目的关系（学完就知道以后该怎么迁移）</h4>
  <p>
    crossfade 这类题目有天然可并行的五条线：<strong>数学推导</strong>（人做）、<strong>DSP 实现</strong>、
    <strong>客观测量</strong>（LUFS/谱通量脚本）、<strong>听测组织</strong>（受试者与问卷）、
    <strong>写作与图表</strong>。前四条都可以各占一个 worktree 与一个线程，
    你只在「数学假设是否需要修改」这个真正需要判断的节点介入。
    <em>这就是 85/15 规则在数学题目上的具体形式（以后可照此分工）。</em>
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">85/15 规则的实质是把算力预算从「生成」重新分配到「验证」。它成立的前提是？</p>
  <ul class="opts">
    <li>模型生成本身不可靠</li>
    <li data-ok>验证的边际成本远低于生成错误的边际成本，且验证结果可自动化判定</li>
    <li>验证不需要理解代码</li>
    <li>生成代码太便宜了</li>
  </ul>
  <p class="why">
    如果验证无法自动化（只能靠人肉判断），85/15 就退化成「把负担推给人」。
    所以规则的正确用法是：<strong>先建立可自动判定的验收标准（测试、指标、断言），再让它自己迭代。</strong>
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">「15 秒回滚规则」真正想保护的是什么？</p>
  <ul class="opts">
    <li>服务器的稳定性</li>
    <li data-ok>小步合并的节奏：回滚足够快，人才敢频繁合并，坏改动的影响面才小</li>
    <li>CI 的成本</li>
    <li>代码的整洁度</li>
  </ul>
  <p class="why">
    回滚慢 → 没人愿意频繁合并 → 批量合并 → 冲突与回归风险上升。
    规则表面上在讲速度，实际在保护<strong>开发节奏</strong>。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">为什么每个并发线程要用独立的 git worktree，而不是各自 clone 一份？</p>
  <ul class="opts">
    <li>因为 clone 更慢</li>
    <li data-ok>worktree 共享对象库（省磁盘、共享历史），但工作目录与索引相互独立（无锁竞争、无相互覆盖）</li>
    <li>因为 clone 无法创建分支</li>
    <li>因为 worktree 可以自动合并冲突</li>
  </ul>
  <p class="why">
    worktree 恰好提供了需要的隔离粒度：<em>共享仓库对象</em>但不共享工作区。
    多个 clone 会浪费磁盘并让历史同步变成额外工作。
  </p>
</div>

<div class="acc" data-t="深入：把「管理式提示」写成检查清单" data-badge="模板">
  <div class="acc-body">
    <ol>
      <li><strong>目标</strong>：一句话说清最终状态（可验收的名词，而不是动作）。</li>
      <li><strong>证据</strong>：原始日志 / 复现命令 / 数据位置 / 相关文件路径。</li>
      <li><strong>验收标准</strong>：具体到命令与输出（「跑 <code>python run.py</code> 输出 RMSE 与 p 值」）。</li>
      <li><strong>约束</strong>：允许的库、随机种子、不得触碰的目录、时间预算。</li>
      <li><strong>交付物</strong>：diff、日志、图、报告文件。</li>
      <li><strong>停止条件</strong>：什么情况下必须回来问人（例如「需要改变研究设计」或「发现数据本身有问题」）。</li>
    </ol>
    <p>这六项齐全时，一个任务的返工率会显著下降；缺第 3 项（验收标准）是返工的最主要来源。</p>
  </div>
</div>
`
});
