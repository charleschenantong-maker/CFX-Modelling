/* content/15-hardware.js — 模块 15：硬件与操作系统瓶颈 */
COURSE.register({
  id: "m15",
  part: 4,
  num: "15",
  title: "硬件与系统：为什么并行智能体会拖垮 macOS",
  en: "Hardware & OS Bottlenecks",
  minutes: 25,
  tags: ["硬件", "系统", "成本"],
  body: String.raw`
<p class="lead">
  当你同时跑 5–10 个智能体时，瓶颈通常不是模型，而是<strong>磁盘、内存、散热与操作系统的调度策略</strong>。
  这一模块给出记录中的实测结论与背后的机制，以及你可以马上做的检查。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    同样的任务，在 macOS 笔记本上跑 5 个并发就卡顿、降频、风扇狂转；
    换到一台几百美元的裸金属 Linux 小主机上却能稳定跑 6–10 个线程。
    差别不在 CPU 主频，而在<strong>文件系统、安全守护进程与散热策略</strong>。
  </p>
</section>

<h3>1. 三个平台，三种失败模式</h3>
<table class="tbl">
  <thead><tr><th>平台</th><th>记录中的观察</th><th>机制</th></tr></thead>
  <tbody>
    <tr><td><strong>macOS</strong>（高并发）</td>
        <td>同时跑 5 个以上编码智能体会出现<strong>热降频与资源停顿</strong></td>
        <td>APFS 的文件系统锁争用、后台安全守护进程扫描、以及并行磁盘 I/O 下的进程节流</td></tr>
    <tr><td><strong>裸金属 Linux</strong></td>
        <td>无头 Ubuntu（4–8 核、8–32 GB）插在家用路由器上，轻松维持 6–10 个并行线程，空闲开销接近零</td>
        <td>文件系统与进程调度更可预测；没有强制降频的散热约束（有主动散热）</td></tr>
    <tr><td><strong>云 VPS</strong></td>
        <td>同等规格月费高，且数据中心 IP 带来合规与封禁风险</td>
        <td>见下面的经济学对比</td></tr>
  </tbody>
</table>
<blockquote class="callout">
  <p><strong>关键类比</strong>：智能体工作负载的特征是「大量小文件读写 + 频繁进程创建 + 持续网络等待」。
  这恰好是 APFS 与现代安全守护进程最不擅长的模式。GPU 或 CPU 主频在这个负载里根本不是瓶颈。</p>
</blockquote>

<h3>2. 云 VPS 的经济学陷阱</h3>
<section class="blk blk-eco">
  <h4><span class="ic">◈</span>记录中的对比</h4>
  <table class="tbl small">
    <thead><tr><th>方案</th><th>成本</th><th>IP 风险</th><th>回本周期</th></tr></thead>
    <tbody>
      <tr><td>云 VPS（Hetzner 级，16 核 / 32 GB）</td><td>约 $275 / 月</td><td>数据中心 IP，有封禁风险</td><td>永不回本（持续支出）</td></tr>
      <tr><td>自购迷你主机（32 GB）</td><td>约 $700 一次性</td><td>接在家用网络上 → 住宅 IP</td><td><strong>不到 3 个月</strong>（对比 $275/月）</td></tr>
    </tbody>
  </table>
  <p>
    计算很简单：\(700 / 275 \approx 2.5\) 个月。这也解释了模块 12 里「住宅网关」的价值——
    它不仅更便宜，还顺带解决了 IP 画像问题。
  </p>
</section>
<p><strong>但要加上被忽略的成本</strong>：电费（一台 32 GB 小主机满载约 30–60 W，按 \$0.2/kWh 计约 \$5–9/月）、
噪音与散热位置、以及家用宽带断网时的可用性风险。
即便如此，长期成本仍显著低于同规格 VPS。</p>

<h3>3. 把重编译卸载出去（CI offloading）</h3>
<p>
  记录中的建议：对资源密集的编译（例如多 crate 的 Rust 构建），
  把构建放到<strong>专用 runner</strong>（Blacksmith CLI 或 GitHub Actions）上执行，
  避免本地内存被吃光而阻塞其他线程。
</p>
<table class="tbl small">
  <thead><tr><th>任务类型</th><th>本地跑</th><th>卸载到 CI</th></tr></thead>
  <tbody>
    <tr><td>快速单元测试（&lt; 30 秒）</td><td>✅ 保留在本地，反馈最快</td><td>—</td></tr>
    <tr><td>多平台/多版本矩阵测试</td><td>❌ 本地资源不足</td><td>✅ 天然并行</td></tr>
    <tr><td>大型编译（Rust/C++、Docker 镜像）</td><td>❌ 会挤爆内存</td><td>✅ 有缓存层，反而更快</td></tr>
    <tr><td>需要 GPU 的训练</td><td>小规模可以</td><td>✅ 但单价高（见模块 10）</td></tr>
  </tbody>
</table>
<p><strong>对你的项目</strong>：音频实验脚本很轻，不需要 CI 卸载；但「批量渲染 100 段过渡 + 计算指标」这类任务适合写成脚本交给 CI 或后台任务，
这样你的交互式设备始终保持可响应。</p>

<h3>4. 如果你现在只有一台 Windows 或 macOS 机器</h3>
<table class="tbl">
  <thead><tr><th>平台</th><th>立刻可做的三件事</th></tr></thead>
  <tbody>
    <tr><td><strong>macOS</strong></td>
        <td>
          1) 把并发线程数控制在 <strong>3–4 个</strong>（记录中 5+ 就会触发热降频）；<br />
          2) 把工作目录放在内置 SSD，避开外接盘与网络盘；<br />
          3) 给持续任务设置 <code>caffeinate</code> 防止睡眠中断，并监控 <code>powermetrics</code> 的温度与降频。
        </td></tr>
    <tr><td><strong>Windows</strong></td>
        <td>
          1) 用 <strong>WSL2</strong> 跑 Linux 工具链，并且<em>把仓库放在 WSL 的原生文件系统里</em>
             （例如 <code>/home/you/projects</code>），<strong>不要</strong>放在 <code>/mnt/c/...</code>——跨文件系统 I/O 会慢一个数量级；<br />
          2) 在 Windows 安全中心里为项目目录与 WSL 虚拟磁盘添加排除项，避免实时扫描拖慢大量小文件读写；<br />
          3) 限制并发与内存（<code>.wslconfig</code> 里的 <code>memory=</code>），把重活交给后台或远程节点。
        </td></tr>
    <tr><td><strong>Linux 主机</strong></td>
        <td>
          1) 把并发线程数设为「物理核数 − 1」；<br />
          2) 用 <code>htop</code> / <code>iostat -x 1</code> 确认瓶颈到底是 CPU、内存还是磁盘；<br />
          3) 大编译与 CI 卸载出去，本地只留交互式任务。
        </td></tr>
  </tbody>
</table>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>不要凭感觉优化</h4>
  <p>
    「换机器」通常是最后手段。先量化：在卡顿发生时看<strong>磁盘队列长度、内存压力、CPU 降频与交换分区使用</strong>。
    智能体负载的瓶颈往往是<em>磁盘 I/O 与内存</em>，而不是 CPU 主频——
    给一台老机器加内存或换 NVMe，往往比换整台机器更划算。
  </p>
</section>

<h3>5. 你的最优配置（按预算分档）</h3>
<table class="tbl small">
  <thead><tr><th>预算</th><th>建议</th><th>能支撑</th></tr></thead>
  <tbody>
    <tr><td>0（现有设备）</td><td>WSL2 / 原生 Linux + 把仓库放对文件系统 + 并发 ≤ 4</td><td>3–4 个并行线程、全部课程实验（除多设备 SPMD）</td></tr>
    <tr><td>≈ $700</td><td>32 GB 内存的迷你主机 / NUC 级机器，接家用路由器</td><td>6–10 个并行线程、作为住宅网关（模块 12）</td></tr>
    <tr><td>≈ $1500–2500</td><td>带独显（12–16 GB 显存）的工作站</td><td>本地 LoRA 微调、推理实验</td></tr>
    <tr><td>按小时</td><td>云 GPU（A100 级），只在需要时开</td><td>一次性大实验；注意合规与成本</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    你的 crossfade 项目包含<strong>大量小规模但高频的实验</strong>：渲染音频、计算指标、跑统计检验。
    这类负载对硬盘与内存的压力远大于对 CPU 的压力。
    把实验脚本做成「一条命令、结果落盘、可复现」，再配合 2–3 个 worktree 并行跑不同参数组，
    你就能在一台普通机器上获得远超预期的迭代速度——<em>而这正是 85/15 规则想要的基础设施</em>。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">记录中把 macOS 上 5+ 并行智能体的卡顿归因于？</p>
  <ul class="opts">
    <li>CPU 核心数不足</li>
    <li data-ok>APFS 文件系统锁争用、后台安全守护进程扫描、以及并行磁盘 I/O 下的进程节流与热降频</li>
    <li>Python 的 GIL</li>
    <li>网络带宽不足</li>
  </ul>
  <p class="why">
    智能体负载的特征是大量小文件读写与频繁进程创建，正好踩在文件系统与安全扫描的痛点上。
    这类瓶颈在活动监视器里表现为磁盘队列与内存压力，而不是 CPU 100%。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">$700 的迷你主机对比 $275/月的同规格 VPS，回本周期约为？</p>
  <ul class="opts">
    <li>约 1 个月</li>
    <li data-ok>约 2.5 个月</li>
    <li>约 12 个月</li>
    <li>无法比较</li>
  </ul>
  <p class="why">
    \(700 / 275 \approx 2.5\) 个月。记录中的结论是「不到三个月回本」。
    别忘了把电费（约 $5–9/月）、噪音与家庭网络可用性一起计入。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">在 Windows 上用 WSL2 跑实验，下面哪个做法会显著拖慢大量小文件读写？</p>
  <ul class="opts">
    <li>把仓库放在 WSL 的 /home 下</li>
    <li data-ok>把仓库放在 /mnt/c 下（跨 Windows 与 Linux 两套文件系统）</li>
    <li>限制 WSL 的内存上限</li>
    <li>为项目目录添加杀毒排除项</li>
  </ul>
  <p class="why">
    <code>/mnt/c</code> 走的是跨系统文件访问路径（9p/virtio 层），大量小文件操作的开销远高于 WSL 原生文件系统。
    这与记录中「文件系统决定成败」的判断是同一条原理。
  </p>
</div>

<div class="acc" data-t="深入：五分钟瓶颈体检" data-badge="动手">
  <div class="acc-body">
    <p>在卡顿发生时，依次执行（Linux / WSL）：</p>
<pre><code><span class="cm"># 1) 整体负载与内存压力</span>
uptime; free -h; vmstat 1 5

<span class="cm"># 2) 磁盘是否成为瓶颈（看 %util 与 await）</span>
iostat -x 1 5

<span class="cm"># 3) 谁在读写（找出小文件风暴的元凶）</span>
sudo iotop -oPa

<span class="cm"># 4) 线程与进程数</span>
ps -eLf | wc -l; htop</code></pre>
    <p>判读规则：</p>
    <ul>
      <li><code>%util</code> 接近 100% 且 <code>await</code> 高 → <strong>磁盘瓶颈</strong>：换 NVMe、减少日志写入、把仓库移出跨系统目录。</li>
      <li>内存吃紧且开始 <code>swap</code> → <strong>内存瓶颈</strong>：降并发、加内存。</li>
      <li>两者都正常但延迟高 → <strong>网络/线程调度</strong>：检查代理、DNS 与并发上限。</li>
    </ul>
    <p><em>先测量，再采购。这一条能省下最多的钱。</em></p>
  </div>
</div>
`
});
