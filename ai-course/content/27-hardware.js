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
  要微调现代大模型，不必先买一块几万块的专业显卡。
  <strong>Kaggle</strong>（Google 旗下的数据科学平台）给注册开发者提供<strong>每周 30 小时免费的 NVIDIA T4 GPU</strong>（16GB 显存，微调 15 亿到 70 亿参数的模型够用）。
  这一讲按<strong>保姆级（Babysitting）的细致度</strong>，从注册账号、验证手机号、申请免费 GPU，讲到新建 Notebook、敲下第一行代码。
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
  很多人注册完账号发现开不了 GPU 加速器，原因是<strong>没做手机号验证</strong>。按下面的步骤走：
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
  <dd>在浏览器打开 <a href="https://www.kaggle.com" target="_blank" rel="noopener">https://www.kaggle.com</a>，点右上角 <strong>"Register"</strong>。可以直接选 "Register with Google" 一键登录，也可以拿常用邮箱注册。</dd>
  <dt>第二步：手机号实名短信验证（核心关键步）</dt>
  <dd>登录后，点右上角个人头像 → 选 <strong>"Settings"</strong>（设置）→ 页面向下拉到 <strong>"Phone Verification"</strong>（手机验证）区域 → 点 "Verify Account" → 选你所在的国家区号并输入手机号码 → 输入收到的 6 位短信验证码。<strong>验证成功后，账号就永久解锁每周 30 小时免费 GPU 配额</strong>。</dd>
</dl>

<h3>2. 新建首个云端 Notebook 与必开设置</h3>
<p>
  回到 Kaggle 首页，点左侧导航栏的 <strong>"+ Create"</strong>，在下拉菜单里选 <strong>"New Notebook"</strong>。浏览器里会出现一个 Jupyter 云端界面。
</p>
<p>
  写代码之前，先把右侧 Settings 面板里的<strong>三个开关</strong>检查一遍：
</p>
<table class="tbl">
  <thead><tr><th>设置项（Settings）</th><th>默认值</th><th>必须调整的目标值</th><th>为什么至关重要？</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Accelerator（加速器）</strong></td>
      <td>None（纯 CPU）</td>
      <td><strong>GPU T4 x2 或 GPU T4</strong></td>
      <td>把计算引擎从双核 CPU 换成 NVIDIA T4 GPU（16GB 独立显存），这是后面跑模型、做微调的前提。</td>
    </tr>
    <tr>
      <td><strong>Internet（外网访问权限）</strong></td>
      <td>OFF（关闭）</td>
      <td><strong>ON（开启）</strong></td>
      <td><strong>最常踩的坑。</strong>不开这一项，Notebook 就没法从 Hugging Face、GitHub 或 Pip 下载模型权重和依赖包。</td>
    </tr>
    <tr>
      <td><strong>Environment（环境镜像）</strong></td>
      <td>Pin to original</td>
      <td><strong>Always use latest environment</strong></td>
      <td>让环境自动带上最新版的 PyTorch、CUDA 驱动和常用的数据科学库。</td>
    </tr>
  </tbody>
</table>

<h3>3. Kaggle 云端文件系统物理拓扑</h3>
<p class="bridge">
  <strong>接上一节</strong>：你已经把 Notebook 建好、GPU 也点开了。
  <strong>本节只加一件事</strong>：搞清楚哪些目录一重启就没、哪些能留下。
  <strong>怎么读</strong>：只记三句话——input 只读、working 保留、tmp 蒸发；它直接决定你的产物该写在哪。
</p>
<p>
  动手写代码前，先把这几个目录的区别搞清楚：
</p>
<table class="tbl small">
  <thead><tr><th>目录路径</th><th>访问权限</th><th>生命周期与用途</th></tr></thead>
  <tbody>
    <tr>
      <td><code>/kaggle/input/</code></td>
      <td><strong>只读（Read-Only）</strong></td>
      <td>挂载的数据集和外部模型权重都在这里，不要往这个目录写文件（会抛 PermissionError）。</td>
    </tr>
    <tr>
      <td><code>/kaggle/working/</code></td>
      <td><strong>可读可写（Read-Write）</strong></td>
      <td>当前 Notebook 的主工作区。微调后的权重、日志和图表<strong>都要存到这个目录下</strong>；点右侧面板的 "Save Version" 就会把它打包持久化。</td>
    </tr>
    <tr>
      <td><code>/tmp/</code></td>
      <td>临时可读写</td>
      <td>系统临时盘，容器一重启或会话一断，里面的东西立刻清空，只适合放临时的中间缓存。</td>
    </tr>
  </tbody>
</table>

<h3>4. 逐行敲下你的第一行交互式测试代码</h3>
<p>
  在 Notebook 里新建一个代码单元格（Cell）。下面按“<strong>1~2 行代码 + 一段解析</strong>”的节奏，一步步确认 GPU 状态正常。
</p>

<h4>第一步：通过系统终端命令探测物理显卡</h4>

<pre><code>!nvidia-smi
</code></pre>
<p><strong>代码解析</strong>：在 Jupyter 里，以感叹号 <code>!</code> 开头表示执行 Linux Shell 命令；<code>nvidia-smi</code> 是 NVIDIA 驱动自带的工具，会打印显卡型号、驱动版本、CUDA 版本和 16GB 显存当前的占用情况。</p>

<h4>第二步：在 PyTorch 中验证 CUDA 运算环境</h4>

<pre><code>import torch
print("CUDA 是否可用:", torch.cuda.is_available())
</code></pre>
<p><strong>代码解析</strong>：导入 <code>torch</code>；用 <code>torch.cuda.is_available()</code> 看当前 Python 环境能不能连上 CUDA 运行时（正常输出 <code>True</code>）。</p>

<pre><code>device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("当前默认计算设备:", device)
if device.type == "cuda":
    print("0 号 GPU 型号:", torch.cuda.get_device_name(0))
else:
    print("没有可用的 GPU，本次只在 CPU 上跑通流程")
</code></pre>
<p><strong>代码解析</strong>：第一行构建设备对象 <code>device</code>：能上 CUDA 就用 <code>cuda</code>，否则退回 <code>cpu</code>。后面几行按设备类型分别打印：有 GPU 就报出 0 号卡的型号（T4 上会看到 <code>Tesla T4</code>），没有就直说这次在 CPU 上跑。这样写两种环境下都不会报错——如果把 <code>get_device_name(0)</code> 直接写在外面，在没有 GPU 的机器上会当场抛异常。</p>

<h4>第三步：执行张量矩阵运算基准测试（GPU Warmup）</h4>

<pre><code>x = torch.randn(4096, 4096, device=device)
y = torch.randn(4096, 4096, device=device)
</code></pre>
<p><strong>代码解析</strong>：在 GPU 显存上直接生成两个 \(4096 \times 4096\) 的单精度（FP32）随机矩阵，每个占约 64MB 显存。</p>

<pre><code>start_event = torch.cuda.Event(enable_timing=True)
end_event = torch.cuda.Event(enable_timing=True)
</code></pre>
<p><strong>代码解析</strong>：创建两个带计时功能的 CUDA 事件对象，用来测 GPU 内核的真实耗时（毫秒级）。</p>

<pre><code>start_event.record()
z = torch.matmul(x, y)
end_event.record()
</code></pre>
<p><strong>代码解析</strong>：记录起点，调用 cuBLAS 的矩阵乘法算子做 \(O(N^3)\) 量级的运算，再记录终点。</p>

<pre><code>torch.cuda.synchronize()
print(f"4096阶稠密矩阵乘法物理耗时: {start_event.elapsed_time(end_event):.2f} ms")
</code></pre>
<p><strong>代码解析</strong>：用 <code>synchronize()</code> 等异步流里的运算全部结束，再打印两个事件之间的真实耗时（T4 上通常只要几毫秒，比 CPU 快 50 倍以上）。</p>

<h4>第四步：检查显存占用与释放</h4>

<pre><code>allocated_mb = torch.cuda.memory_allocated() / (1024 ** 2)
print(f"当前已占用显存: {allocated_mb:.1f} MB / 16384 MB")
</code></pre>
<p><strong>代码解析</strong>：用 <code>memory_allocated()</code> 看当前进程实际占用的显存，确认显存监控能正常工作。</p>

<h3>5. 🧪 模块完整整合代码清单（Complete Notebook Cell）</h3>
<p>
  把下面整段代码复制到 Kaggle Notebook 的第一个单元格里，按 <strong>Shift + Enter</strong> 运行：
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
    total_mem_gib = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    print(f"✅ GPU 激活成功！型号: {gpu_name} (独立显存: {total_mem_gib:.2f} GiB)")

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
  <p class="q">在 T4（16 GB）上用 LoRA（\(r=8\)，只挂 q/v）微调 Qwen2.5-1.5B：\(batch=4\)、\(seq=512\) 时一切正常；把 \(seq\) 拉到 4096（约 8 倍）后 OOM。最可能的主因是：</p>
  <ul class="opts">
    <li>LoRA 参数量随 seq 变长同步膨胀</li>
    <li data-ok>激活值随 batch×seq 涨约 8 倍，LoRA 相关开销可忽略</li>
    <li>fp16 权重从 3.1 GB 翻倍到 6.2 GB</li>
    <li>batch=4 太大，3.1 GB 权重本来就装不下</li>
  </ul>
  <p class="why">
    底座权重 \(1.54 \times 10^9 \times 2\text{ B} \approx 3.1\text{ GB}\) 与 seq 无关；LoRA 在 q/v 上共约 109 万参数（占 0.071%），参数加梯度加优化器状态也就二三十 MB 量级。
    真正随 seq 线性膨胀的是前向激活值（\(\propto batch \times seq\)），8 倍即爆——这是在 flash/SDPA 注意力下的账；用 eager 注意力时注意力矩阵是 \(O(S^2)\)，8 倍 seq 会涨 64 倍，更狠。
    对策按顺序：先降 micro-batch、用梯度累积保全局批大小，再开激活重计算。
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
