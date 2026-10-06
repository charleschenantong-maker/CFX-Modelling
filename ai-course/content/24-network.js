/* content/24-network.js — 模块 24：个人云端训练与实验调度 */
COURSE.register({
  id: "m24",
  part: 5,
  num: "24",
  title: "个人云端训练与实验调度：网络代理、Kaggle/Colab 环境与断点续训",
  en: "Cloud Training & Experiment Scheduling: Proxies, Kaggle/Colab Setup, and Resilient Checkpointing",
  minutes: 30,
  tags: ["云端训练", "Kaggle", "Tailscale", "断点续训", "早停法"],
  body: String.raw`
<p class="lead">
  用个人算力做深度学习训练，最大的麻烦是<strong>云端免费算力（比如 Kaggle 每周 30 小时的双卡 T4/P100）随时可能断、随时可能被清空</strong>。
  所以别指望算力永不断线，要准备的是两头：
  <strong>对内</strong>，写原子化检查点（Checkpointing）、做自动断点续训，再配一条果断的早停准则（Early Stopping）；
  <strong>对外</strong>，用住宅 IP 加私有覆盖网（Tailscale）把敏感认证和风控隔离开，让云端和本地顺畅互通。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>两大现实痛点：算力断线与凭证风控</h4>
  <p>
    1. <strong>网络与凭据风控</strong>：多设备（笔记本、云服务器、CI 节点）直连大模型 API 时，多地域并发登录很容易触发平台的风控甚至封号；数据中心 IP 段尤其容易被盯上。<br>
    2. <strong>会话易失性</strong>：Kaggle / Colab 这类云端容器有严格的空闲超时和单次运行上限（如 9 小时或 12 小时），一旦会话重置，存在容器内存或临时目录里、几十个小时训出来的权重就全没了。
  </p>
</section>

<h3>1. 云端训练物理拓扑与私有出口（Tailscale + 住宅 IP）</h3>
<p>
  要让几台设备（笔记本、本地工作站、Kaggle 远程 Notebook）协同干活，常见的做法是把外部凭据认证和模型访问都收敛到一个可信出口：
</p>
<table class="tbl">
  <thead><tr><th>网络节点</th><th>物理规格</th><th>关键协议 / 职责</th></tr></thead>
  <tbody>
    <tr><td><strong>家庭出口网关</strong></td><td>单个住宅公网 IPv4/v6</td><td>跑一个轻量代理，统一管理各平台的 OAuth 会话，对外只留一个出口</td></tr>
    <tr><td><strong>私有覆盖网（Tailnet）</strong></td><td>基于 WireGuard 的 Tailscale Mesh</td><td>把移动笔记本、本地宿主机和云端节点放进同一个私有子网，不用暴露任何公网端口</td></tr>
    <tr><td><strong>客户端（Notebook/CI）</strong></td><td>远程算力容器或本地开发机</td><td>只负责执行和计算，通过 Tailscale 访问私有断点存储或代理，本地不留敏感主私钥</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>会话亲和（Session Affinity）与 Prompt Cache 经济学</h4>
  <p>
    如果用的是支持 Prompt Caching 的接口（比如 Anthropic 的 5 分钟前缀缓存），<strong>别在会话中途跨账号或跨节点轮询调度</strong>。
    一旦请求被切到另一个凭据节点，那 80 万 Token 的前缀缓存当场失效，之后每次 API 请求都得重新写一遍前缀：
  </p>
  \[ \text{Rewrite Cost} \approx c_{\text{in}} \times T_{\text{prefix}}, \qquad T_{\text{prefix}} \le 8\times 10^5 \text{ tokens} \]
  <p>
    <strong>工程守则</strong>：同一个线程固定用同一个账号，前缀会话不要换来换去；只有新建任务或归档旧会话时才重新分配。
  </p>
</section>

<h3>2. 完整训练检查点（Checkpoint）到底包含什么？</h3>
<p>
  一个常见错误是：训练循环里只用 <code>model.state_dict()</code> 存模型权重。
  <strong>只恢复权重，等于白训。</strong>优化器的历史动量和学习率状态全丢了，接着训练时梯度方向会突变，Loss 曲线当场炸出一个大尖刺（Spike），严重时直接发散成 NaN。
</p>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>记号铺垫（Notation Bridge：拆解原子化检查点状态元组）</h4>
  <p>在严谨的训练工程中，一个 $t$ 步的完整系统状态表示为：</p>
  \[ \mathcal{S}_t = \left( \Theta_t,\, \mathbf{m}_t,\, \mathbf{v}_t,\, \eta_t,\, t,\, \mathcal{R}_{\text{rng}} \right) \]
  <ul>
    <li>\(\Theta_t\)：$t$ 步时模型的全部可学习权重矩阵与偏置向量（Model Parameters）；</li>
    <li>\(\mathbf{m}_t\)：AdamW 优化器维护的一阶梯度动量历史矩阵（First Momentum）；</li>
    <li>\(\mathbf{v}_t\)：AdamW 优化器维护的二阶梯度方差历史矩阵（Second Momentum）；</li>
    <li>\(\eta_t\)：当前所处步数的学习率调度器内部状态（LR Scheduler State）；</li>
    <li>\(t\)：已完成的精确全局训练步数（Global Step Count）；</li>
    <li>\(\mathcal{R}_{\text{rng}}\)：PyTorch、CUDA、NumPy 及 Python 内置的随机数生成器状态种子（RNG States），确保接续训练时数据 Shuffle 与 Dropout 序列完全可复现。</li>
  </ul>
</section>

<table class="tbl">
  <thead><tr><th>组件名称</th><th>包含内容</th><th>若遗漏的致命后果</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>模型参数（Model Weights）</strong></td>
      <td>各层权重与偏置（\(\mathbf{W}, \mathbf{b}\)）</td>
      <td>模型回到初始随机状态，完全丢失已学知识</td>
    </tr>
    <tr>
      <td><strong>优化器状态（Optimizer State）</strong></td>
      <td>AdamW 一阶动量 \(\mathbf{m}_t\) 与二阶动量 \(\mathbf{v}_t\)</td>
      <td>动量归零，接续时步长突变，Loss 曲线冒出大尖刺，轻则破坏浅层特征，重则梯度爆炸</td>
    </tr>
    <tr>
      <td><strong>调度器状态（LR Scheduler）</strong></td>
      <td>已执行的 step、Warmup 与余弦退火阶段参数</td>
      <td>学习率可能被重置为峰值，超大步长瞬间冲毁已接近收敛的精细权重</td>
    </tr>
    <tr>
      <td><strong>混合精度缩放器（GradScaler）</strong></td>
      <td>FP16 动态梯度缩放系数（Scale Factor）</td>
      <td>接续计算时数值溢出（Overflow）或下溢，导致后续梯度的反向传播全变为 NaN</td>
    </tr>
  </tbody>
</table>

<h3>3. 工业标准断点续训代码范式</h3>
<p>
  在 Kaggle Notebooks 运行时中，非持久化临时目录会在容器重启后清空，只有 <code>/kaggle/working/</code> 下的内容支持持久化输出与版本打包。
  下面是原子化保存与接续训练的代码范式：
</p>

<pre><code>import os
import torch

def save_checkpoint(model, optimizer, scheduler, scaler, step, loss, filepath="/kaggle/working/ckpt_latest.pt"):
    """原子化保存完整训练检查点元组"""
    tmp_path = filepath + ".tmp"
    checkpoint = {
        'step': step,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'scheduler_state_dict': scheduler.state_dict(),
        'scaler_state_dict': scaler.state_dict() if scaler else None,
        'loss': loss,
        'rng_state': {
            'cpu': torch.get_rng_state(),
            'cuda': torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None
        }
    }
    # 先写入临时文件再原子重命名，防止写入中途断电导致文件损坏
    torch.save(checkpoint, tmp_path)
    os.replace(tmp_path, filepath)
    print(f"✅ Checkpoint atomically saved at step {step} -> {filepath}")

def load_checkpoint(filepath, model, optimizer, scheduler, scaler=None, device="cuda"):
    """安全恢复训练现场，实现零震荡满血复活"""
    if not os.path.exists(filepath):
        print(f"ℹ️ 未发现已有检查点 ({filepath})，将从 Step 0 开始全新冷启动。")
        return 0
    
    print(f"🔄 正在从 {filepath} 恢复训练现场...")
    ckpt = torch.load(filepath, map_location=device)
    model.load_state_dict(ckpt['model_state_dict'])
    optimizer.load_state_dict(ckpt['optimizer_state_dict'])
    scheduler.load_state_dict(ckpt['scheduler_state_dict'])
    if scaler and ckpt.get('scaler_state_dict'):
        scaler.load_state_dict(ckpt['scaler_state_dict'])
    
    # 恢复随机数状态，确保数据 Shuffle 严格连续
    if 'rng_state' in ckpt:
        torch.set_rng_state(ckpt['rng_state']['cpu'])
        if torch.cuda.is_available() and ckpt['rng_state']['cuda'] is not None:
            torch.cuda.set_rng_state_all(ckpt['rng_state']['cuda'])
            
    start_step = ckpt['step'] + 1
    print(f"🚀 成功恢复现场！当前接续步数：Step {start_step}，上轮记录 Loss: {ckpt['loss']:.4f}")
    return start_step
</code></pre>

<h3>4. 科学早停准则（Early Stopping）：避开沉没成本</h3>
<p>
  个人算力有限，最浪费时间的不是断线重连，而是<strong>明知模型已经发散、掉进浅鞍点或严重过拟合，还让它空转把 9 小时配额烧完</strong>。
  所以训练脚本里要写死几条早停准则：
</p>
<table class="tbl small">
  <thead><tr><th>诊断异常信号</th><th>底层物理根因</th><th>果断决策行动</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>初始 Loss 为 NaN 或 Inf</strong></td>
      <td>学习率过高引发梯度爆炸，或数值除零 / Log 越界</td>
      <td><strong>立即终止运行</strong>：检查 Softmax 有没有漏掉减 Max 的稳定处理，或者把学习率缩小 3~5 倍</td>
    </tr>
    <tr>
      <td><strong>Warmup 结束后验证集 Loss 连续 3 轮不降反升</strong></td>
      <td>模型容量不足以泛化该数据分布，或在训练集噪声上过度拟合</td>
      <td><strong>果断停机</strong>：加上 Weight Decay 权重衰减，或者把模型层宽改小、把训练语料再洗一遍</td>
    </tr>
    <tr>
      <td><strong>Loss 曲线长达数百步水平停滞（Plateau）</strong></td>
      <td>梯度范数接近零（\(\|\mathbf{g}\| \approx 0\)），或过早陷入极浅鞍点</td>
      <td><strong>检查梯度范数</strong>：重新设一下学习率调度器的下限，或把残差连接换成更稳的 Pre-LN 结构</td>
    </tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在自回归大模型断点续训时，为什么只恢复 <code>model.state_dict()</code> 很危险？</p>
  <ul class="opts">
    <li>因为 PyTorch 语法要求必须同时传入优化器才能通过编译</li>
    <li data-ok>AdamW 靠一阶动量 \(m_t\) 与二阶方差 \(v_t\) 维持平滑的更新步长；动量一旦清零，下一步的更新量会突然变向，很容易让 Loss 剧烈跳动甚至梯度爆炸</li>
    <li>因为优化器状态中记录了模型的 Tokenizer 词表大小与嵌入维度</li>
    <li>因为只有优化器保存了上下文长度参数</li>
  </ul>
  <p class="why">
    AdamW 更新公式的核心是 \(\frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon}\)。不恢复动量和方差，就等于拿冷启动时的初始梯度去更新一组已经接近收敛的精细参数，步长和方向都会失调。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 Kaggle Notebooks 这类有时长限制（如 9 小时）的云端容器里训练，下面哪种做法能最大程度保住实验成果？</p>
  <ul class="opts">
    <li>始终保持浏览器标签页前台开启，不锁屏</li>
    <li data-ok>采用原子化写入机制定期将完整 Checkpoint 导出至持久化目录（如 <code>/kaggle/working/</code>），并在重连时自动检测并恢复状态元组</li>
    <li>将训练批次（Batch Size）调到极大以在 1 小时内冲完训练</li>
    <li>仅在训练循环完全结束时调用一次保存</li>
  </ul>
  <p class="why">
    临时云端实例的内存和非持久化磁盘说没就没，得在训练循环里定期做原子化落盘，才能随时中断、随时接上。
  </p>
</div>
`
});
