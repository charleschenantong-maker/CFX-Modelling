/* content/27-hardware.js — 模块 27：Kaggle 保姆级实操起步：账号激活、免费 T4 算力申请与首个云端 Notebook 交互 */
COURSE.register({
  id: "m27",
  part: 5,
  num: "27",
  title: "Kaggle 保姆级实操起步：账号激活、免费 T4 算力申请与首个云端 Notebook 交互",
  en: "Kaggle Step-by-Step Starter: Account Setup, Free T4 GPU Allocation, and First Notebook Interaction",
  minutes: 40,
  tags: ["Kaggle起步", "免费GPU", "Jupyter", "保姆级教程", "云端环境"],
  body: String.raw`
<p class="lead">
  要开始真正改造与微调现代大模型，你不需要购买昂贵的数万元专业显卡。
  <strong>Kaggle</strong>（Google 旗下全球最大的数据科学平台）为全球注册开发者提供<strong>每周 30 小时完全免费的 NVIDIA T4 GPU 算力</strong>（具备 16GB 显存，足以为 15 亿到 70 亿参数模型进行高效微调）。
  本讲将以<strong>保姆级（Babysitting）的细致度</strong>，手把手带你完成从账号激活、申请免费 GPU、新建第一个云端 Notebook 到敲下第一行交互代码的全流程。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>实操前准备清单</h4>
  <p>在开始前，你只需要准备两样东西：</p>
  <ul>
    <li>一个现代网页浏览器（Chrome / Edge / Firefox / Safari 均可）；</li>
    <li>一个能接收短信的真实手机号码（用于完成 Kaggle 免费 GPU 的实名短信激活验证）。</li>
  </ul>
</section>

<h3>1. Kaggle 账号注册与免费 GPU 权限解锁</h3>
<p>
  许多新手直接注册账号后发现无法开启 GPU 加速器，原因在于<strong>未完成手机号验证</strong>。请严格按照以下步骤操作：
</p>

<div class="flow">
  <div class="nd hi">1. 访问 Kaggle 官网注册</div>
  <div class="ar">→</div>
  <div class="nd">2. 绑定手机号激活 GPU</div>
  <div class="ar">→</div>
  <div class="nd">3. 新建 Notebook</div>
  <div class="ar">→</div>
  <div class="nd hi">4. 开启 T4 与 Internet</div>
</div>

<dl class="kv">
  <dt>第一步：创建账号</dt>
  <dd>在浏览器打开 <a href="https://www.kaggle.com" target="_blank" rel="noopener">https://www.kaggle.com</a>，点击右上角 <strong>"Register"</strong>。推荐选择 "Register with Google"（一键登录）或使用常用邮箱完成注册。</dd>
  <dt>第二步：手机号实名短信验证（核心关键步）</dt>
  <dd>登录后，点击右上角个人头像 → 选择 <strong>"Settings"</strong>（设置）→ 页面向下拉到 <strong>"Phone Verification"</strong>（手机验证）区域 → 点击 "Verify Account" → 选择你所在的国家区号并输入手机号码 → 输入收到的 6 位短信验证码。<strong>一旦验证成功，你的账号将永久解锁每周 30 小时免费 GPU 配额</strong>！</dd>
</dl>

<h3>2. 新建首个云端 Notebook 与必开设置</h3>
<p>
  进入 Kaggle 首页，点击左侧导航栏的 <strong>"+ Create"</strong> 按钮，在下拉菜单中点击 <strong>"New Notebook"</strong>。一个崭新的 Jupyter 云端交互式界面将在浏览器中呈现。
</p>
<p>
  在敲写任何代码之前，<strong>必须首先检查并开启右侧侧边栏（Settings 面板）的三个关键开关</strong>：
</p>
<table class="tbl">
  <thead><tr><th>设置项（Settings）</th><th>默认值</th><th>必须调整的目标值</th><th>为什么至关重要？</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Accelerator（加速器）</strong></td>
      <td>None（纯 CPU）</td>
      <td><strong>GPU T4 x2 或 GPU T4</strong></td>
      <td>将计算引擎从孱弱的双核 CPU 切换至专业级 NVIDIA T4 GPU（16GB 独立显存），这是运行与微调大模型的算力源泉。</td>
    </tr>
    <tr>
      <td><strong>Internet（外网访问权限）</strong></td>
      <td>OFF（关闭）</td>
      <td><strong>ON（开启）</strong></td>
      <td><strong>初学者最常踩的坑！</strong>若不开启此项，Notebook 将无法从 Hugging Face、GitHub 或 Pip 下载任何模型权重与依赖包。</td>
    </tr>
    <tr>
      <td><strong>Environment（环境镜像）</strong></td>
      <td>Pin to original</td>
      <td><strong>Always use latest environment</strong></td>
      <td>确保系统自动预装最新版本的 PyTorch、CUDA 驱动与常用数据科学依赖库。</td>
    </tr>
  </tbody>
</table>

<h3>3. Kaggle 云端文件系统物理拓扑</h3>
<p>
  在编写代码前，必须建立清晰的磁盘物理空间认知：
</p>
<table class="tbl small">
  <thead><tr><th>目录路径</th><th>访问权限</th><th>生命周期与用途</th></tr></thead>
  <tbody>
    <tr>
      <td><code>/kaggle/input/</code></td>
      <td><strong>只读（Read-Only）</strong></td>
      <td>挂载的数据集或外部模型权重所在路径，严禁尝试在此目录下写入或保存任何文件（会抛出 PermissionError）。</td>
    </tr>
    <tr>
      <td><code>/kaggle/working/</code></td>
      <td><strong>可读可写（Read-Write）</strong></td>
      <td>当前 Notebook 的主工作区。所有微调后的模型权重、生成的日志与图表<strong>必须保存到该目录下</strong>；在右侧面板点击 "Save Version" 后可将该目录打包持久化。</td>
    </tr>
    <tr>
      <td><code>/tmp/</code></td>
      <td>临时可读写</td>
      <td>系统高速临时盘，容器重启或会话断开后内容立即蒸发，仅用于存储瞬时中间缓存。</td>
    </tr>
  </tbody>
</table>

<h3>4. 逐行敲下你的第一行交互式测试代码</h3>
<p>
  在 Notebook 中新建一个代码单元格（Cell），我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，验证 GPU 的健康状态。
</p>

<h4>第一步：通过系统终端命令探测物理显卡</h4>

<pre><code>!nvidia-smi
</code></pre>
<p><strong>代码解析</strong>：在 Jupyter 中以感叹号 <code>!</code> 开头表示执行底层的 Linux Shell 终端命令；<code>nvidia-smi</code> 是 NVIDIA 驱动自带的系统管理接口，用于输出当前显卡型号、驱动版本、CUDA 版本以及 16GB 显存的当前空闲状态。</p>

<h4>第二步：在 PyTorch 中验证 CUDA 运算环境</h4>

<pre><code>import torch
print("CUDA 是否可用:", torch.cuda.is_available())
</code></pre>
<p><strong>代码解析</strong>：导入核心深度学习框架 <code>torch</code>；调用 <code>torch.cuda.is_available()</code> 检测底层 CUDA 运行时是否已成功与当前 Python 环境握手（正常应输出 <code>True</code>）。</p>

<pre><code>device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("当前默认计算设备:", torch.cuda.get_device_name(0))
</code></pre>
<p><strong>代码解析</strong>：构建动态设备对象 <code>device</code>（优先使用 <code>cuda</code>）；调用 <code>get_device_name(0)</code> 打印 0 号 GPU 的物理名称（正常输出类似 <code>Tesla T4</code>）。</p>

<h4>第三步：执行张量矩阵运算基准测试（GPU Warmup）</h4>

<pre><code>x = torch.randn(4096, 4096, device=device)
y = torch.randn(4096, 4096, device=device)
</code></pre>
<p><strong>代码解析</strong>：直接在 GPU 显存上生成两个 \(4096 \times 4096\) 的单精度（FP32）随机矩阵，每个张量占用约 64MB 显存。</p>

<pre><code>start_event = torch.cuda.Event(enable_timing=True)
end_event = torch.cuda.Event(enable_timing=True)
</code></pre>
<p><strong>代码解析</strong>：创建两个带时间记录功能的 CUDA 硬件事件对象，用于精确测量 GPU 内核执行的物理耗时（毫秒级）。</p>

<pre><code>start_event.record()
z = torch.matmul(x, y)
end_event.record()
</code></pre>
<p><strong>代码解析</strong>：记录起点时间，调用底层高度优化的 cuBLAS 矩阵乘法算子执行 \(O(N^3)\) 级运算，并在计算图末尾记录终点时间。</p>

<pre><code>torch.cuda.synchronize()
print(f"4096阶稠密矩阵乘法物理耗时: {start_event.elapsed_time(end_event):.2f} ms")
</code></pre>
<p><strong>代码解析</strong>：调用 <code>synchronize()</code> 阻塞等待异步流运算执行完毕；打印两点之间的精确物理用时（在 T4 上通常只需几毫秒，比 CPU 快 50 倍以上）。</p>

<h4>第四步：检查显存占用与释放</h4>

<pre><code>allocated_mb = torch.cuda.memory_allocated() / (1024 ** 2)
print(f"当前已占用显存: {allocated_mb:.1f} MB / 16384 MB")
</code></pre>
<p><strong>代码解析</strong>：调用 <code>memory_allocated()</code> 查看当前 Python 进程真实持有的活动张量显存，验证显存监控机制运行正常。</p>

<h3>5. 🧪 模块完整整合代码清单（Complete Notebook Cell）</h3>
<p>
  你可以将下面整段代码直接复制到 Kaggle Notebook 的第一个单元格中，按下 <strong>Shift + Enter</strong> 组合键一键运行验证：
</p>

<pre><code># =====================================================================
# Kaggle GPU Initialization & Environment Diagnostic Benchmark
# Step-by-Step Babysitting Starter for Large Language Model Practice
# =====================================================================

import sys
import os
import torch

print(f"Python 解释器版本: {sys.version.split()[0]}")
print(f"PyTorch 核心版本: {torch.__version__}")

# 1. 验证 CUDA 加速驱动
if not torch.cuda.is_available():
    print("❌ 警告：当前未检测到 GPU 加速器！请检查右侧面板 Settings -> Accelerator 是否已选为 GPU T4。")
else:
    gpu_name = torch.cuda.get_device_name(0)
    total_mem_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    print(f"✅ GPU 激活成功！型号: {gpu_name} (独立显存: {total_mem_gb:.2f} GB)")

    # 2. 矩阵乘法物理吞吐基准测验
    device = torch.device("cuda")
    a = torch.randn(4096, 4096, device=device)
    b = torch.randn(4096, 4096, device=device)
    
    start_evt = torch.cuda.Event(enable_timing=True)
    end_evt = torch.cuda.Event(enable_timing=True)
    
    start_evt.record()
    c = torch.matmul(a, b)
    end_evt.record()
    
    torch.cuda.synchronize()
    elapsed_ms = start_evt.elapsed_time(end_evt)
    print(f"🚀 4096×4096 稠密矩阵乘法耗时: {elapsed_ms:.2f} 毫秒")
    print(f"📊 当前已分配显存: {torch.cuda.memory_allocated() / 1024**2:.1f} MB")

    # 3. 验证持久化写出路径
    work_dir = "/kaggle/working"
    assert os.path.exists(work_dir) and os.access(work_dir, os.W_OK), "持久化目录不可写！"
    print(f"💾 持久化主输出目录正常就绪: {work_dir}")
    print("🎉 恭喜！你的 Kaggle 大模型实验环境已 100% 准备就绪，可以进入下一讲实战改造开源模型！")
</code></pre>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在 Kaggle Notebook 中尝试从 Hugging Face 下载开源模型时遇到 <code>ConnectionError</code> 无法连接网络，最可能的原因是：</p>
  <ul class="opts">
    <li>Kaggle 账号余额不足</li>
    <li data-ok>未在右侧 Settings 面板中将 "Internet" 开关开启（默认为 OFF 离线状态）</li>
    <li>Python 版本过低，不支持 HTTPS 协议</li>
    <li>GPU 显存被占满导致网络断开</li>
  </ul>
  <p class="why">
    Kaggle 出于反爬虫与安全合规考量，新建 Notebook 默认将 Internet 设为关闭。只要在右侧侧边栏切换为 Internet On，即可自由下载 Hugging Face 权重与数据。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 Kaggle 上进行大模型微调时，训练好的 LoRA 适配器权重或微调后模型必须保存在哪个目录下，才能在生成版本后下载到本地计算机？</p>
  <ul class="opts">
    <li><code>/kaggle/input/</code></li>
    <li data-ok><code>/kaggle/working/</code></li>
    <li><code>/tmp/</code></li>
    <li><code>/root/</code></li>
  </ul>
  <p class="why">
    <code>/kaggle/input/</code> 是只读输入路径，<code>/tmp/</code> 在容器重启后会被彻底抹除，只有 <code>/kaggle/working/</code> 才是 Kaggle 的官方持久化产物输出目录。
  </p>
</div>
`
});
