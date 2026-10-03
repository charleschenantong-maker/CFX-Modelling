/* content/13-resets.js — 模块 13：重置动力学与配额哲学 */
COURSE.register({
  id: "m13",
  part: 4,
  num: "13",
  title: "重置动力学：把「会过期的额度」用到 0%",
  en: "Reset Dynamics & The Sunk-Token Principle",
  minutes: 25,
  tags: ["经济", "调度", "策略"],
  body: String.raw`
<p class="lead">
  额度不是余额，而是<strong>会腐坏的库存</strong>。理解重置的机制，
  你就能把「什么时候用哪个模型、什么时候冲刺」变成一个可计算的调度问题。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    周五晚上你还有 60% 的额度，重置在周日凌晨。你应该休息，还是通宵把额度烧掉？
    答案取决于两件事：<strong>这个平台的额度是否会累积</strong>，以及<strong>你是否有值得烧的任务</strong>。
    这两件事分别由「重置机制」和「任务储备」决定。
  </p>
</section>

<h3>1. 两种非对称的重置机制</h3>
<table class="tbl">
  <thead><tr><th>平台</th><th>重置做什么</th><th>后果</th></tr></thead>
  <tbody>
    <tr><td><strong>OpenAI Codex</strong>（按记录）</td><td><strong>清空计时器</strong>：7 天时钟回到第 0 天</td>
        <td>多个账号同时被重置时，它们的续期日程会<strong>同步</strong>——所有账号在同一天到期，削峰的作用消失</td></tr>
    <tr><td><strong>Anthropic Claude</strong>（按记录）</td><td><strong>补满容量</strong>：把可用额度恢复 100%，但<em>不改变到期时间戳</em></td>
        <td>调度更可预测：到点即失效，因此「先烧快到期的账号」策略更有效</td></tr>
  </tbody>
</table>
<p>
  <strong>可迁移的洞察</strong>：同样叫「重置」，一个是「重置周期」，另一个是「补充库存」。
  前者会改变你的调度周期，后者只改变你的库存量。任何资源系统（缓存、CI 分钟数、云额度）都要先问清是哪一种。
</p>

<h3>2. 即时重置 vs 银行重置</h3>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>平台为什么发重置</h4>
  <ul>
    <li><strong>自动（即时）重置</strong>：多安排在<strong>非高峰的周末时段</strong>，目的是把闲置算力消化掉——
        对平台来说，闲置的 GPU 是纯亏损，让你多用一点没有边际成本。</li>
    <li><strong>银行重置（user-triggered）</strong>：由用户按需触发。记录中的观察是：
        银行重置对提供方的<strong>机会成本更高</strong>，因为用户倾向于在企业计费的<strong>高峰时段</strong>使用它，
        挤占的是本可以高价出售的产能。</li>
    <li><strong>设计含义</strong>：如果平台给你银行重置，那它是在给你一份「期权」——你应当把它用在高峰且不可替代的任务上，
        而不是随手消耗。</li>
  </ul>
</section>

<h3>3. 沉没 token 原则</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>把它写成一个优化问题</h4>
  <p>设周期长度 \(T\)、额度上限 \(Q\)、你在窗口内的使用量 \(u(t)\)。当期未用额度 \(Q-\int u\) <strong>不会结转</strong>，则：</p>
  \[ \text{有效产出} = \int_0^T v\big(u(t)\big)\,dt, \qquad v' > 0,\ v'' < 0 \]
  <p>
    因为 \(v\) 边际递减，把额度平均分配到全周期并不最优——
    <strong>应当把额度投给边际价值最高的任务</strong>；而在周期末尾仍有剩余时，
    任何正价值的任务都比浪费更好（<em>沉没 token 原则</em>）。
  </p>
  <p>
    记录中的说法很形象：不要用「API 用户」的稀缺心态看待订阅额度。
    每个周期都是一份<strong>会腐坏的礼物</strong>；不用到 0%，差额就永久损失。
  </p>
</section>

<h3>4. 建立「任务储备池」</h3>
<p>既然额度会过期，就必须提前准备「值得烧额度」的任务。按价值密度排序的清单：</p>
<table class="tbl small">
  <thead><tr><th>类别</th><th>具体任务（来自记录）</th><th>为什么适合烧额度</th></tr></thead>
  <tbody>
    <tr><td><strong>审计</strong></td><td>把大型 PR / 编排器重写丢给智能体生成架构简报</td><td>上下文大、价值高、结果可保存复用</td></tr>
    <tr><td><strong>发现</strong></td><td>多智能体扫描本地目录与 GitHub 组织，找出被搁置的侧项目、未完成的分支</td><td>没有明确产出压力，适合批量跑</td></tr>
    <tr><td><strong>整理</strong></td><td>抓取本地收件箱、个人记录、健康看板并结构化归档</td><td>机械但耗时，非常适合自动化</td></tr>
    <tr><td><strong>验证</strong></td><td>对已有结论做对抗性复核：让另一个线程尝试推翻它</td><td>直接提升你研究的可信度（模块 09）</td></tr>
    <tr><td><strong>学习</strong></td><td>把论文转成讲义、把代码转成推导笔记</td><td>把额度转化成你自己的理解</td></tr>
  </tbody>
</table>
<p>
  <strong>操作建议</strong>：维护一个 <code>backlog.md</code>，每当额度将到期（或收到银行重置）时，
  就从池子里挑任务批量派发。这样「闲置额度」永远有去处，也避免为了烧额度而做无意义的事。
</p>

<h3>5. 两种心态的对比</h3>
<table class="tbl">
  <thead><tr><th></th><th>API 用户心态</th><th>订阅调度者心态</th></tr></thead>
  <tbody>
    <tr><td>额度是</td><td>要花钱买的稀缺资源</td><td>会过期、边际递减的库存</td></tr>
    <tr><td>决策问题</td><td>「这条请求值不值」</td><td>「这笔额度该投给哪个任务」</td></tr>
    <tr><td>对浪费的反应</td><td>无所谓，本来就在花钱</td><td>强烈，因为差额永久损失</td></tr>
    <tr><td>典型错误</td><td>为了省钱而不用</td><td>为了烧额度而做无用功</td></tr>
  </tbody>
</table>
<p><em>两种心态都错在同一个地方：没有把「额度」与「产出」分开看。真正的目标是最小化<strong>每单位研究进展的成本</strong>，而不是最大化 token 消耗。</em></p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    你的项目有天然的「额度消耗任务」：文献精读、推导复核、实验报告润色、听测数据整理、
    以及最重要的——<strong>对自己结论的对抗性检验</strong>。
    最后一项尤其值得用订阅额度：让一个独立的会话尝试用更简单的模型解释你的数据（模块 09 的置换检验就是它的统计版本）。
    这比「多训一个模型」更能提升申请材料的质量。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">「Codex 的重置会清空 7 天计时器」这一机制的主要副作用是？</p>
  <ul class="opts">
    <li>额度上限变小</li>
    <li data-ok>多个账号同时被重置时续期日程会同步，原本错开的到期时间被拉到同一周期</li>
    <li>缓存会失效</li>
    <li>模型质量下降</li>
  </ul>
  <p class="why">
    重置周期而非补充库存，会改变调度结构的形状。原本「A 账号周一到期、B 账号周四到期」的错峰，
    在一次集体重置后会变成同一天到期——削峰失效，调度难度上升。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么「银行重置」对平台的机会成本更高？</p>
  <ul class="opts">
    <li>因为需要额外的存储</li>
    <li data-ok>用户倾向在企业计费的高峰时段触发它，挤占本可高价出售的产能</li>
    <li>因为它需要人工审核</li>
    <li>因为它会减少月度总额度</li>
  </ul>
  <p class="why">
    自动重置多安排在非高峰周末，用的是本来闲置的算力；
    而用户按需触发时，往往正是产能最紧张、可以卖给企业客户的时段。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">「沉没 token 原则」最准确的表述是？</p>
  <ul class="opts">
    <li>额度花不完会累积到下个月</li>
    <li data-ok>当期未使用的额度会永久损失，因此在周期末尾，任何有正价值的任务都比浪费额度好</li>
    <li>应该平均分配额度到每一天</li>
    <li>订阅额度比 API 便宜，所以应当尽量多用</li>
  </ul>
  <p class="why">
    关键是「会过期」+「边际价值递减」。
    但要注意平衡：目标不是最大化消耗，而是最大化产出——<em>为了烧额度而做无用功是另一种浪费</em>。
  </p>
</div>

<div class="acc" data-t="深入：把配额管理做成一张表" data-badge="模板">
  <div class="acc-body">
    <p>建议在笔记里维护一张每周更新的配额表：</p>
    <table class="tbl small">
      <thead><tr><th>资源</th><th>窗口类型</th><th>下次重置</th><th>当前余量</th><th>本轮计划任务</th></tr></thead>
      <tbody>
        <tr><td>Codex Plus</td><td>7 天 + 月中重置</td><td>—</td><td>—</td><td>架构审计 / PR 审查</td></tr>
        <tr><td>Claude Pro</td><td>5 小时滚动 + 7 天上限</td><td>—</td><td>—</td><td>论文精读 / 推导复核</td></tr>
        <tr><td>Google AI Pro ×3</td><td>Colab 会话与配额</td><td>—</td><td>—</td><td>E3 / E4 实验</td></tr>
        <tr><td>OpenRouter 免费</td><td>按日/按额度</td><td>—</td><td>—</td><td>模型对比</td></tr>
      </tbody>
    </table>
    <p>填表本身就是一种纪律：<strong>当你能写下「下次重置时间」与「本轮计划任务」时，你已经在做调度而不是在碰运气。</strong></p>
  </div>
</div>
`
});
