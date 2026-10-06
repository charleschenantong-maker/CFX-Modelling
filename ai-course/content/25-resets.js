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
  当训练大模型从单次脚本演进为系统性工程时，决定产出效率的往往不是单张显卡的绝对算力，而是<strong>工程流水线的容错韧性与资源编排能力</strong>。
  本模块提炼真实工程团队在大模型开发中沉淀的核心心法：
  建立以<strong>85/15 验证法则</strong>为核心的 Token 资源倾斜，使用<strong>Git Worktree 物理隔离多智能体并发舰队</strong>，
  并深度解析 Windows、macOS 与 Linux 三大操作系统在支撑并行模型调度时的底层硬件陷阱。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心痛点：为什么多智能体协同经常拖垮本地机器？</h4>
  <p>
    当开发者尝试在本地启动多个智能体（Subagents）并行编写算子、清洗数据或进行超参搜索时，经常遭遇灾难：
    macOS 统一内存发生不可逆的垃圾回收停顿导致系统卡死；Windows 下文件句柄锁定导致并发冲突；Git 仓库因多人/多 Agent 在同分支写代码而引发海量冲突。
  </p>
</section>

<h3>1. 85/15 规则与 15 秒回滚机制</h3>
<p>
  在借助 AI 智能体辅助大模型开发与算法编写时，新手常把 90% 的注意力放在“生成了多少行代码”，而忽视代码的真实运行状态。
  工业级开发团队严格遵循 <strong>85/15 规则</strong>：
</p>
<table class="tbl">
  <thead><tr><th>阶段</th><th>Token / 算力占比</th><th>核心任务与考核指标</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>生成阶段（Drafting）</strong></td>
      <td><strong>15%</strong></td>
      <td>清晰描述输入输出形状、张量维度契约与核心数学公式，单次生成精简原型，拒绝过度设计</td>
    </tr>
    <tr>
      <td><strong>验证阶段（Verification）</strong></td>
      <td><strong>85%</strong></td>
      <td>执行单元测试、Shape 断言、NaN 探针、梯度反向传播检查与单步浮点性能对比</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：15 秒快速回滚与梯度置信度）</h4>
  <p>在智能体迭代中，若一次修改引发验证集 Loss 恶化或编译报错，严格执行 15 秒回滚准则：</p>
  \[ \Delta L_{\text{val}} = L_{\text{val}}(\Theta_{\text{new}}) - L_{\text{val}}(\Theta_{\text{old}}) > \epsilon_{\text{tol}} \implies \text{git reset --hard HEAD} \]
  <p>
    <strong>原则</strong>：永远不在一个已经产生未知状态污染的分支上做“修修补补”，立即原子化回滚到上一个已通过单元测试的稳定提交点，重新由智能体从干净现场派发新方案。
  </p>
</section>

<h3>2. 管理式 Prompt 与任务状态机</h3>
<p>
  不要把与模型的对话当成无尽的漫谈聊天，而要将其视为<strong>严格的分布式任务状态机（Task State Machine）</strong>：
</p>
<dl class="kv">
  <dt>Thread 是待办事项，不是聊天室</dt>
  <dd>每个对话上下文仅解决一个明确的微观问题（例如：“仅实现带掩码的因果缩放点积注意力单算子”）。一旦该算子通过单元测试，立即归档关闭 Thread，严禁在同一会话中堆砌后续的多头拼接与前馈网络。</dd>
  <dt>前置问题，而不是前置方案</dt>
  <dd>在下达任务时，首先声明输入数据的张量形状（如 <code>[Batch, SeqLen, Dim]</code>）、硬件约束（如“不得显式分配 $S \times S$ 稠密显存矩阵”）与失败惩罚，让模型在明确边界内收敛解法。</dd>
</dl>

<h3>3. 并行物理隔离：Git Worktree 与智能体舰队</h3>
<p>
  当并行派发 3 个以上的智能体分别探索不同的优化器实现或分词策略时，如果共享同一个工作目录，势必造成文件相互覆盖与缓存踩踏。
  业内标准做法是借助 <strong>Git Worktree</strong> 实现完全独立的物理工作区：
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
  不同操作系统在管理多线程 Python 进程与 GPU 统一内存时，有着完全不同的底层行为陷阱：
</p>
<table class="tbl small">
  <thead><tr><th>操作系统</th><th>典型并发失败模式</th><th>底层物理机制</th><th>工业级防御方案</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>macOS (Apple Silicon)</strong></td>
      <td>MPS 显存耗尽导致系统级 WindowServer 卡死或硬重启</td>
      <td>统一内存架构（UMA）下，PyTorch MPS 后端的垃圾回收器无法及时向 XNU 内核释放临时张量，引发内存瀑布泄漏</td>
      <td>显式插入 <code>torch.mps.empty_cache()</code>，限制本地并行 Agent 数量 $\le 2$</td>
    </tr>
    <tr>
      <td><strong>Windows 11</strong></td>
      <td><code>PermissionError</code> 或文件无法读写覆盖</td>
      <td>NTFS 文件系统严格的句柄锁定机制；子进程在打开文件未关闭前，其他进程无法重命名或删除该文件</td>
      <td>采用带重试退避的原子写操作，或全面迁移至 WSL2 Linux 子系统环境中运行</td>
    </tr>
    <tr>
      <td><strong>Linux (Ubuntu)</strong></td>
      <td>僵尸进程（Zombie Processes）堆积，显存被幽灵占用</td>
      <td>多进程 DataLoader 在主进程异常退出时，Fork 出来的 Worker 子进程未被正确接收（Orphaned），继续持有 CUDA 上下文</td>
      <td>使用 <code>fuser -v /dev/nvidia*</code> 精准排查并 <code>kill -9</code> 残留僵尸进程；在脚本中捕获 <code>SIGINT</code> 并显式关闭线程池</td>
    </tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在大模型研发中使用多智能体协作探索不同算法方案时，为什么推荐使用 Git Worktree 而不是在同一目录下反复切换分支？</p>
  <ul class="opts">
    <li>因为 Git 官方不允许在本地创建超过两个分支</li>
    <li data-ok>Git Worktree 允许在磁盘上同时挂载多个物理隔离的目录，不同智能体可以在各自独立的目录中编译、测试与修改，彻底杜绝文件冲突与构建缓存踩踏</li>
    <li>因为 Git Worktree 可以直接提升 GPU 的矩阵乘法吞吐量</li>
    <li>因为使用 Worktree 可以免去写 Git Commit 信息的步骤</li>
  </ul>
  <p class="why">
    在单目录下切换分支会导致所有未暂存的文件被覆盖或混杂。Git Worktree 为每个分支提供物理上独立的文件夹，是多智能体并行作业的标准解耦架构。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在团队实施的 85/15 开发法则中，为什么要求将 85% 的资源与注意力倾斜在“验证阶段”？</p>
  <ul class="opts">
    <li>因为生成代码比验证代码花费的 Token 更多</li>
    <li data-ok>大模型生成的代码极易存在表面通顺但底层数值不稳定性（如 NaN、维度隐式广播错误、梯度断裂）的隐患；唯有严密的验证与单元测试才能确保算法真实收敛</li>
    <li>因为只有验证阶段才能让显卡风扇全速运转</li>
    <li>因为 Python 是静态强类型语言，必须经过复杂编译验证</li>
  </ul>
  <p class="why">
    大模型时代代码草稿的生成极其廉价，但隐蔽的数学与张量形状 Bug 极其致命。把 Token 和算力投入到自动化断言、梯度检查和 Shape 验证上，是保证工程质量的核心铁律。
  </p>
</div>
`
});
