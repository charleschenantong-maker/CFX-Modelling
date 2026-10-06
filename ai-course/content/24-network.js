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
  在个人算力条件下开展大模型科研与训练，核心矛盾在于<strong>云端免费/廉价算力环境（如 Kaggle 提供每周 30 小时免费双卡 T4/P100）的高度不稳定性与易失性</strong>。
  真正的工程素养不依赖于算力永不断线，而在两端建立铜墙铁壁：
  <strong>对内</strong>，设计原子化检查点（Checkpointing）与自动化断点续训流水线，配合果断的早停准则（Early Stopping）；
  <strong>对外</strong>，通过住宅 IP 与私有覆盖网（Tailscale）隔离敏感认证与风控，确保云端与本地环境协同无阻。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>两大现实痛点：算力断线与凭证风控</h4>
  <p>
    1. <strong>网络与凭据风控</strong>：多设备（笔记本、云服务器、CI 节点）直连大模型 API 时，多地域并发认证极易触发平台自动化风控或封禁；数据中心 IP 段更容易被标记。<br>
    2. <strong>会话易失性</strong>：Kaggle / Colab 等云端容器有严格的空闲超时与单次运行上限（如 9 小时或 12 小时），一旦会话重置，保存在容器本地内存或临时目录的数十个小时训练权重全部化为乌有。
  </p>
</section>

<h3>1. 云端训练物理拓扑与私有出口（Tailscale + 住宅 IP）</h3>
<p>
  为了让多台异构实验节点（移动笔记本、本地工作站、Kaggle 远程 Notebook）协同工作，业内标准的个人安全拓扑是将所有外部凭据认证与模型访问收敛至单一可信出口：
</p>
<table class="tbl">
  <thead><tr><th>网络节点</th><th>物理规格</th><th>关键协议 / 职责</th></tr></thead>
  <tbody>
    <tr><td><strong>家庭出口网关</strong></td><td>单个住宅公网 IPv4/v6</td><td>运行轻量代理守护进程，管理多平台 OAuth 会话，提供单一纯净出口</td></tr>
    <tr><td><strong>私有覆盖网（Tailnet）</strong></td><td>基于 WireGuard 的 Tailscale Mesh</td><td>将移动笔记本、本地宿主机与云端节点编织在同一私有子网，无需暴露任何公网端口</td></tr>
    <tr><td><strong>客户端（Notebook/CI）</strong></td><td>远程算力容器或本地开发机</td><td>只做逻辑执行与计算，通过 Tailscale 安全访问私有断点存储或代理，不持久化敏感主私钥</td></tr>
  </tbody>
</table>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>会话亲和（Session Affinity）与 Prompt Cache 经济学</h4>
  <p>
    如果使用支持 Prompt Caching（如 Anthropic 5 分钟前缀缓存）的接口服务，<strong>严禁在会话中途跨账号或跨节点轮询调度</strong>。
    一旦会话被随意调度到不同凭据节点，高达 80 万 Token 的前缀缓存将瞬间失效，导致每次 API 请求产生强制重写开销：
  </p>
  \[ \text{Rewrite Cost} \approx c_{\text{in}} \times T_{\text{prefix}}, \qquad T_{\text{prefix}} \le 8\times 10^5 \text{ tokens} \]
  <p>
    <strong>工程守则</strong>：严格保证线程级账号亲和，前缀会话固定；仅在新建任务或会话归档时再做负载分配。
  </p>
</section>

<h3>2. 完整训练检查点（Checkpoint）到底包含什么？</h3>
<p>
  许多初学者常犯的致命错误是：在训练循环中仅仅通过 <code>model.state_dict()</code> 保存模型权重矩阵。
  <strong>只恢复权重等于前功尽弃！</strong>仅加载权重会导致优化器丢失所有的历史动量与学习率状态，接续训练时极易引发梯度方向突变，导致 Loss 曲线瞬间剧烈尖刺（Spike）甚至完全发散（NaN）。
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
      <td>动量归零，接续步长突变，Loss 曲线产生超大 Spike，轻则破坏浅层特征，重则梯度爆炸</td>
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
  以下是经过数万次训练验证的原子化断点保存与接续代码规范：
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
  在个人算力极为宝贵的情况下，最浪费时间的不是断线重连，而是<strong>明知模型已经发散、陷入浅鞍点或发生灾难性过拟合，却依然任由其空转耗尽 9 小时配额</strong>。
  科学的训练流水线必须设定果断的早停准则：
</p>
<table class="tbl small">
  <thead><tr><th>诊断异常信号</th><th>底层物理根因</th><th>果断决策行动</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>初始 Loss 为 NaN 或 Inf</strong></td>
      <td>学习率过高引发梯度爆炸，或数值除零 / Log 越界</td>
      <td><strong>立即终止运行</strong>：检查 Softmax 是否遗漏减 Max 稳定处理，或将学习率缩小 3~5 倍</td>
    </tr>
    <tr>
      <td><strong>Warmup 结束后验证集 Loss 连续 3 轮不降反升</strong></td>
      <td>模型容量不足以泛化该数据分布，或在训练集噪声上过度拟合</td>
      <td><strong>果断停机</strong>：启用 Weight Decay 权重衰减，或缩减模型层宽、加大训练语料清洗力度</td>
    </tr>
    <tr>
      <td><strong>Loss 曲线长达数百步水平停滞（Plateau）</strong></td>
      <td>梯度范数接近零（\(\|\mathbf{g}\| \approx 0\)），或过早陷入极浅鞍点</td>
      <td><strong>检查梯度范数</strong>：重设学习率调度器的下限阈值，或在残差连接处加入更稳健的 Pre-LN 结构</td>
    </tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在自回归大模型断点续训时，为什么仅恢复 <code>model.state_dict()</code> 是极为危险的做法？</p>
  <ul class="opts">
    <li>因为 PyTorch 语法要求必须同时传入优化器才能通过编译</li>
    <li data-ok>AdamW 依赖一阶动量 \(m_t\) 与二阶方差 \(v_t\) 维持平滑的更新步长；若清空动量，接续更新量将发生瞬时方向突变，极易引发 Loss 剧烈跳跃或梯度爆炸</li>
    <li>因为优化器状态中记录了模型的 Tokenizer 词表大小与嵌入维度</li>
    <li>因为只有优化器保存了上下文长度参数</li>
  </ul>
  <p class="why">
    AdamW 更新公式的核心是 \(\frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon}\)。如果不恢复历史动量和方差，模型相当于从冷启动状态用初始梯度更新接近收敛的精细参数，步长与方向严重失调。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 Kaggle Notebooks 等有时长限制（如 9 小时）的云端训练容器中，以下哪项是确保实验成果绝对安全的最优工程做法？</p>
  <ul class="opts">
    <li>始终保持浏览器标签页前台开启，不锁屏</li>
    <li data-ok>采用原子化写入机制定期将完整 Checkpoint 导出至持久化目录（如 <code>/kaggle/working/</code>），并在重连时自动检测并恢复状态元组</li>
    <li>将训练批次（Batch Size）调到极大以在 1 小时内冲完训练</li>
    <li>仅在训练循环完全结束时调用一次保存</li>
  </ul>
  <p class="why">
    临时云端实例的本地内存与非持久化磁盘极其脆弱。必须在训练循环内部定期做原子化持久化落地，才能做到随时中断、随时无缝接续。
  </p>
</div>
`
});
