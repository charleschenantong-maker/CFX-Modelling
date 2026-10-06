/* content/25-resets.js — 模块 25：工程流水线与智能体协同 */
COURSE.register({
  id: "m25",
  part: 5,
  num: "25",
  title: "工程流水线与智能体协同：85/15 验证法则、多线程舰队与本地硬件避坑",
  en: "Engineering Workflow & Multi-Agent Fleet: The 85/15 Rule, Task Fleets, and Hardware Pitfalls",
  minutes: 30,
  tags: ["工作流", "多智能体", "Git Worktree", "硬件避坑", "验证法则"],
  body: String.raw`
<p class="lead">
  训练从「跑一个脚本」变成「跑一条流水线」之后，卡住产出的往往不是单张显卡的算力，而是<strong>流水线扛不扛得住中断、资源怎么编排</strong>。
  这一节讲三件事：
  把 Token 按<strong>85/15 验证法则</strong>分配，用 <strong>Git Worktree 把并发的智能体物理隔开</strong>，
  以及 Windows、macOS 与 Linux 在并行调度模型时各自会踩到什么硬件坑。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心痛点：为什么多智能体协同经常拖垮本地机器？</h4>
  <p>
    在本地同时开多个智能体（Subagents）并行写算子、洗数据或搜超参时，常见的情况是：
    macOS 的统一内存出现长时间的垃圾回收停顿，系统直接卡死；Windows 下文件句柄被锁住，并发写入互相打架；Git 仓库里几个人或多个 Agent 在同一个分支上写代码，冲突一堆。
  </p>
</section>

<h3>1. 85/15 规则与 15 秒回滚机制</h3>
<p>
  用 AI 智能体写模型代码时，新手常把 90% 的注意力放在“生成了多少行”，而不管这些代码跑起来什么样。
  成熟团队反过来，遵循 <strong>85/15 规则</strong>：
</p>
<table class="tbl">
  <thead><tr><th>阶段</th><th>Token / 算力占比</th><th>核心任务与考核指标</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>生成阶段（Drafting）</strong></td>
      <td><strong>15%</strong></td>
      <td>把输入输出形状、张量维度约定和核心公式写清楚，一次生成一版精简原型，不要过度设计</td>
    </tr>
    <tr>
      <td><strong>验证阶段（Verification）</strong></td>
      <td><strong>85%</strong></td>
      <td>跑单元测试、Shape 断言、NaN 探针、反向传播梯度检查和单步浮点性能对比</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：15 秒快速回滚与梯度置信度）</h4>
  <p>智能体迭代时，只要一次修改让验证集 Loss 变差或编译报错，就执行 15 秒回滚：</p>
  \[ \Delta L_{\text{val}} = L_{\text{val}}(\Theta_{\text{new}}) - L_{\text{val}}(\Theta_{\text{old}}) > \epsilon_{\text{tol}} \]
  <p>
    <strong>原则</strong>：不要在已经被未知状态污染的分支上修修补补，直接执行 <code>git reset --hard HEAD~1</code>，回到上一个已通过单元测试的稳定提交点，再让智能体从干净现场重新派发方案。
  </p>
</section>

<h3>2. 管理式 Prompt 与任务状态机</h3>
<p>
  别把和模型的对话当成漫无边际的聊天，把它当成<strong>一个严格的任务状态机（Task State Machine）</strong>：
</p>
<dl class="kv">
  <dt>Thread 是待办事项，不是聊天室</dt>
  <dd>一个对话只解决一个明确的小问题（比如“只实现带掩码的因果缩放点积注意力这一个算子”）。这个算子通过单元测试后，立刻归档关掉 Thread，别在同一个会话里接着塞多头拼接和前馈网络。</dd>
  <dt>前置问题，而不是前置方案</dt>
  <dd>派任务时先把输入张量形状（如 <code>[Batch, SeqLen, Dim]</code>）、硬件约束（如“不得显式分配 $S \times S$ 稠密显存矩阵”）和失败判据说清楚，模型才好在边界内找解法。</dd>
</dl>

<h3>3. 并行物理隔离：Git Worktree 与智能体舰队</h3>
<p>
  同时派 3 个以上智能体去试不同的优化器实现或分词策略，如果共用一个工作目录，文件必然互相覆盖，构建缓存也会打架。
  标准做法是用 <strong>Git Worktree</strong> 给每个智能体开一块独立的物理工作区：
</p>
<pre><code># 为探索 FlashAttention 优化的 Agent-1 创建独立的隔离工作树
git worktree add -b feat/flash-attn ../workspace-agent-flash main

# 为探索 BPE 词表剪枝的 Agent-2 创建独立的隔离工作树
git worktree add -b feat/bpe-prune ../workspace-agent-bpe main

# 各 Agent 在各自独立的目录下执行构建与测试，互不干扰
# 测试完成合入主分支后，一键安全清理
git worktree remove ../workspace-agent-flash
</code></pre>

<h3>4. 三大操作系统底层失败模式与避坑指南</h3>
<p>
  同一个多进程 Python 训练脚本，在三个系统上会踩到三种不同的坑：
</p>
<table class="tbl small">
  <thead><tr><th>操作系统</th><th>典型并发失败模式</th><th>底层物理机制</th><th>工业级防御方案</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>macOS (Apple Silicon)</strong></td>
      <td>MPS 显存耗尽导致系统级 WindowServer 卡死或硬重启</td>
      <td>统一内存架构（UMA）下，PyTorch MPS 后端回收临时张量不及时，XNU 内核拿不回内存，占用一路涨上去</td>
      <td>显式调用 <code>torch.mps.empty_cache()</code>，本地并行 Agent 控制在 $\le 2$ 个</td>
    </tr>
    <tr>
      <td><strong>Windows 11</strong></td>
      <td><code>PermissionError</code> 或文件无法读写覆盖</td>
      <td>NTFS 的句柄锁很严：一个子进程打开了文件还没关，别的进程就重命名不了、也删不掉</td>
      <td>写文件改成带重试退避的原子写，或者干脆搬到 WSL2 里跑</td>
    </tr>
    <tr>
      <td><strong>Linux (Ubuntu)</strong></td>
      <td>僵尸进程（Zombie Processes）堆积，显存被幽灵占用</td>
      <td>主进程异常退出时，多进程 DataLoader fork 出来的 Worker 变成孤儿进程（Orphaned），却还占着 CUDA 上下文</td>
      <td>用 <code>fuser -v /dev/nvidia*</code> 找出残留进程再 <code>kill -9</code>；脚本里捕获 <code>SIGINT</code>，退出前显式关掉线程池</td>
    </tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">用多智能体并行试不同算法方案时，为什么推荐 Git Worktree，而不是在同一个目录里反复切分支？</p>
  <ul class="opts">
    <li>因为 Git 官方不允许在本地创建超过两个分支</li>
    <li data-ok>Git Worktree 允许在磁盘上同时挂载多个物理隔离的目录，不同智能体可以在各自独立的目录中编译、测试与修改，彻底杜绝文件冲突与构建缓存踩踏</li>
    <li>因为 Git Worktree 可以直接提升 GPU 的矩阵乘法吞吐量</li>
    <li>因为使用 Worktree 可以免去写 Git Commit 信息的步骤</li>
  </ul>
  <p class="why">
    在同一个目录里切分支，未暂存的文件会被覆盖或混在一起。Git Worktree 给每个分支一个独立的物理目录，多智能体并行时互不干扰。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">85/15 法则要求把 85% 的算力和注意力放在“验证阶段”，为什么？</p>
  <ul class="opts">
    <li>因为生成代码比验证代码花费的 Token 更多</li>
    <li data-ok>大模型生成的代码极易存在表面通顺但底层数值不稳定性（如 NaN、维度隐式广播错误、梯度断裂）的隐患；唯有严密的验证与单元测试才能确保算法真实收敛</li>
    <li>因为只有验证阶段才能让显卡风扇全速运转</li>
    <li>因为 Python 是静态强类型语言，必须经过复杂编译验证</li>
  </ul>
  <p class="why">
    草稿代码的生成成本几乎为零，但隐蔽的数学和形状 Bug 代价很大。把 Token 和算力花在自动化断言、梯度检查和 Shape 验证上，才是保证质量的关键。
  </p>
</div>
`
});
