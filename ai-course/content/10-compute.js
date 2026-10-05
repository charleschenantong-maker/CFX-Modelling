/* content/10-compute.js — 模块 10：你的算力与工具链 */
COURSE.register({
  id: "m10",
  part: 3,
  num: "10",
  title: "算力与工具链：在 Colab、Kaggle、HF 上能跑什么",
  en: "Compute & Tooling (Colab / Kaggle / HF)",
  minutes: 30,
  tags: ["算力", "Colab", "动手"],
  body: String.raw`
<p class="lead">
  这一模块解决一个非常具体的问题：<strong>给定你手上的免费/低价算力，哪些实验今天就能跑，哪些必须改设计？</strong>
  答案会直接塑造你的项目路线。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你最想要的是「训练一个自己的模型」。但真实约束是：Colab 免费层给的是单张 T4（16 GB）或单核 TPU，
    会话会在空闲或到点后断开。于是正确的问题不是「我能训多大的模型」，而是
    <em>「在会随时断线的 16 GB 显存上，什么实验能在 90 分钟内跑完并给出有意义的结论」</em>。
  </p>
</section>

<h3>1. 算力地图</h3>
<table class="tbl">
  <thead><tr><th>平台</th><th>典型硬件</th><th>限制</th><th>最适合</th></tr></thead>
  <tbody>
    <tr><td>Colab 免费层</td><td>T4 16 GB / 单核 TPU v5e-1</td><td>会话易断、无持久磁盘、单卡无法 SPMD 多设备并行</td><td>教学实验、小模型、LoRA</td></tr>
    <tr><td>Google AI Pro（含 Colab 计算单元）</td><td>按月发放计算单元 + 更高优先级与更强机器；更高档位（AI Ultra）支持后台连续执行</td><td>计算单元耗尽后退回免费层策略；额度随政策变化</td><td>稍大的微调、以及可以离开电脑的长任务</td></tr>
    <tr><td>Kaggle Notebooks</td><td>T4 ×2 / P100 / <strong>TPU v5e-8</strong></td><td>每周有 GPU/TPU 配额（约 30 小时量级，会调整，以 Kaggle 界面为准）；需手机验证</td><td><strong>免费体验 8 设备 SPMD 并行的主要去处</strong></td></tr>
    <tr><td>Hugging Face Jobs / Spaces</td><td>按需 GPU、ZeroGPU</td><td>额度有限、任务化</td><td>跑一次脚本、做 demo</td></tr>
    <tr><td>本地显卡（如有）</td><td>8–24 GB</td><td>受散热与内存限制</td><td>反复迭代、调试、小模型全流程</td></tr>
    <tr><td>按需云（RunPod / Vast 等）</td><td>A100 / H100</td><td>按小时计费；数据中心 IP 有合规风险</td><td>一次性大实验</td></tr>
  </tbody>
</table>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>Colab 的三条硬规则（学生最常踩）</h4>
  <ol>
    <li><strong>计算单元用完 = 退回免费层</strong>，不是「继续无限用」。所以长任务要能拆成一次会话内跑完的片段，
        并把检查点写到 Google Drive 或 Hugging Face Hub。</li>
    <li><strong>禁止用多个账号规避额度限制</strong>。你有三个 Google AI Pro 账号，正确做法是
        <em>按用途分开</em>（例如一个用于课程实验、一个用于项目），而不是在限额用尽后换号继续同一类重负载。</li>
    <li><strong>禁止把 Colab 当服务器</strong>：托管网站/文件服务、连接远程代理、挖矿、P2P、分布式 worker
        （无正计算单元余额时）都在禁止列表内。</li>
  </ol>
  <p><em>写 notebook、跑实验、做教学演示完全在允许范围内；越线的分界线是「把它变成免费的通用算力」。</em></p>
</section>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>必须自己核实的两件事</h4>
  <ol>
    <li><strong>你的账户当前实际拿到什么硬件</strong>：在 notebook 里跑 <code>!nvidia-smi</code> 与
        <code>import jax; jax.devices()</code>（或 <code>torch.cuda.get_device_name()</code>）。
        平台的档位与配额会变，不要相信任何截图或二手描述——<em>包括本课程里的表格</em>。</li>
    <li><strong>会话与磁盘的持久性</strong>：Colab 的本地磁盘随会话消失。检查点必须写到 Google Drive 或 HF Hub，
        否则你会在第 89 分钟丢掉两小时训练。</li>
  </ol>
</section>

<h3>2. 显存 → 你能做什么</h3>
<table class="tbl small">
  <thead><tr><th>显存</th><th>推理</th><th>LoRA / QLoRA 微调</th><th>全参数训练</th></tr></thead>
  <tbody>
    <tr><td>8 GB</td><td>≤ 3B（int4）</td><td>≤ 1.5B（int4）</td><td>≤ 100M 从头训练</td></tr>
    <tr><td>16 GB（T4）</td><td>≤ 7B（int4）</td><td>≤ 7B（QLoRA, 短序列）</td><td>≤ 300M</td></tr>
    <tr><td>24 GB</td><td>≤ 13B（int4）</td><td>≤ 13B（QLoRA）</td><td>≤ 1B（含重计算）</td></tr>
    <tr><td>40–80 GB（A100）</td><td>≤ 70B（int4/int8）</td><td>≤ 70B（QLoRA）</td><td>≤ 7B（FSDP 多卡）</td></tr>
    <tr><td>8×TPU v5e</td><td>—</td><td>—</td><td><strong>约 10M–100M 参数从头预训练（教学用）</strong></td></tr>
  </tbody>
</table>
<p>
  这张表的用法不是「找上限」，而是<strong>反推实验设计</strong>：
  既然一台 T4 只能从头训 300M 以下的模型，那么「用 100M 的模型把预训练流程跑通」就是正确的目标，
  而不是试图硬撑 7B。规模缩小后，方法论完全一致，而迭代速度提高几十倍。
</p>

<h3>3. 环境与实验纪律</h3>
<div class="flow">
  <div class="nd hi">固定随机种子</div><div class="ar">→</div>
  <div class="nd">记录版本</div><div class="ar">→</div>
  <div class="nd">写 requirements</div><div class="ar">→</div>
  <div class="nd">检查点外存</div><div class="ar">→</div>
  <div class="nd">一键复现脚本</div>
</div>
<pre><code><span class="cm"># [逐行剖析] 科研级实验前置脚本：全栈随机种子固化 + 硬件状态快照 + 实验元数据持久化</span>
import os, random, numpy as np, torch, json, subprocess, sys
SEED = 0
<span class="cm"># 1. 固化 CPU 与所有 CUDA GPU 设备的伪随机数发生器，确保完全可复现性</span>
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED); torch.cuda.manual_seed_all(SEED)
torch.backends.cudnn.deterministic = True  <span class="cm"># 禁用非确定性卷积算法</span>

<span class="cm"># 2. 探查并打印当前 GPU 驱动与型号</span>
print(subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout.split("\n")[8])
print("python", sys.version.split()[0], "| torch", torch.__version__)

<span class="cm"># 3. 建立结构化实验工件输出目录并记录元数据配置清单</span>
RUN = "runs/exp001"
os.makedirs(RUN, exist_ok=True)
json.dump({"seed": SEED, "argv": sys.argv, "commit": "TODO"},
          open(f"{RUN}/config.json", "w"), indent=2)

<span class="cm"># 4. 从 Google Drive 挂载持久化存储（防止 Colab 实例断开导致权重丢失）</span>
from google.colab import drive
drive.mount("/content/drive")
CKPT_DIR = "/content/drive/MyDrive/llm-course/checkpoints" </code></pre>
<p>
  三条纪律：(1) <strong>每次实验目录里必须有 config.json</strong>，否则一周后你不知道那组数是哪来的；
  (2) <strong>先在小模型/小数据上把代码跑通</strong>，再放大；
  (3) <strong>写完脚本再开 GPU</strong>，不要在付费算力上调试语法错误。
</p>

<h3>4. Hugging Face 工作流（10 分钟上手）</h3>
<pre><code>!pip -q install -U huggingface_hub transformers datasets trl peft accelerate

from huggingface_hub import login, HfApi
login()                                    <span class="cm"># 粘贴 read/write token</span>

<span class="cm"># 下载数据集（只取前 N 条做实验）</span>
from datasets import load_dataset
ds = load_dataset("roneneldan/TinyStories", split="train[:1%]")

<span class="cm"># 训练完把模型推上去（含自动生成 model card）</span>
api = HfApi()
api.upload_folder(folder_path="out-sft/final", repo_id="your-name/mini-sft-demo",
                  repo_type="model", create_pr=False)</code></pre>
<p>
  相关文档：<a href="https://huggingface.co/docs/transformers" target="_blank" rel="noopener">transformers</a>、
  <a href="https://huggingface.co/docs/datasets" target="_blank" rel="noopener">datasets</a>、
  <a href="https://huggingface.co/docs/trl" target="_blank" rel="noopener">trl</a>、
  <a href="https://huggingface.co/docs/peft" target="_blank" rel="noopener">peft</a>。
  学习路径见 <a href="https://huggingface.co/learn" target="_blank" rel="noopener">Hugging Face Learn</a>。
</p>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手：今天就能跑通的三个实验</h4>
  <ol>
    <li><strong>90 分钟</strong>：在 TinyStories 的 1% 子集上从零训练一个 4 层 / 256 维的迷你 Transformer，
        记录 loss 曲线与 tokens/s（附录 B · E3）。</li>
    <li><strong>60 分钟</strong>：用 TRL 对 0.5B 模型做一次 LoRA SFT，对比微调前后的输出（附录 B · E4）。</li>
    <li><strong>45 分钟</strong>：在你的真实数据上跑「模型阶梯 + 分组交叉验证 + 置换检验」（附录 B · E7）——
        这个实验不需要 GPU，用 CPU 就能跑，却是你申请材料里最有分量的一个。</li>
  </ol>
  <p><strong>优先级建议</strong>：先做第 3 个。它直接产出项目成果，而前两个是能力训练。</p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>与你的项目的关系</h4>
  <p>
    Checkpoint 5/6 需要「成对歌曲的适配」与「配对失败模式的统计」。这两件事都是<strong>特征工程 + 统计</strong>，
    不需要大算力；而 Checkpoint 7 的学习实验甚至可以用 CPU 完成（250 条样本、4 维特征）。
    <em>换句话说：你的项目瓶颈不是算力，而是模型设计、评估协议与听测组织。</em>
    把算力省下来做数据标注与多轮听测，比多训一个大模型更划算。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你想在免费资源上体验「多设备 SPMD 并行训练」。最现实的平台是？</p>
  <ul class="opts">
    <li>Colab 免费层的 TPU</li>
    <li data-ok>Kaggle 的 TPU v5e-8（8 个设备，可做 4×2 的数据/张量混合并行）</li>
    <li>任何一台笔记本</li>
    <li>HF Spaces 的 ZeroGPU</li>
  </ul>
  <p class="why">
    截至教程所述时点，Colab 免费层只提供单核 TPU v5e-1，<strong>无法使用 SPMD 多设备并行</strong>；
    而 Kaggle 免费提供 TPU v5e-8，正是 JAX AI Stack 教程针对的硬件。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 Colab 上做一次 90 分钟的训练，最不应该省略的一步是？</p>
  <ul class="opts">
    <li>把学习率调到最优</li>
    <li data-ok>把检查点定期写到 Google Drive / HF Hub</li>
    <li>使用更大的批大小</li>
    <li>打开 tqdm 进度条</li>
  </ul>
  <p class="why">
    Colab 会话随时可能断开且本地磁盘不持久。没有外存检查点，一次断线就等于全部重来。
    这是「工程纪律」在免费算力环境下最重要的一条。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">只有 16 GB 显存时，下面哪种计划最合理？</p>
  <ul class="opts">
    <li>全参数微调 7B 模型</li>
    <li data-ok>用 0.5B–1.5B 模型跑通全部流程（SFT → DPO → 评估），必要时再加 QLoRA 升到 7B</li>
    <li>放弃微调，只写提示词</li>
    <li>直接租 8 张 H100</li>
  </ul>
  <p class="why">
    方法论与规模无关。用 0.5B 把数据格式、训练循环、评估协议全部走通，
    再决定是否需要更大的模型；直接上 7B 全参数微调在 16 GB 上是数学上不可能的（模块 04）。
  </p>
</div>

<div class="acc" data-t="深入：把「每次实验」变成可复现的资产" data-badge="工程">
  <div class="acc-body">
    <p>建议的目录结构（可以直接套用在本工作区）：</p>
<pre><code>ai-course/
  index.html                  <span class="cm"># 本课程</span>
  content/                    <span class="cm"># 课程内容</span>
  labs/
    e7-model-ladder/
      run.py                  <span class="cm"># 一条命令跑完全部实验</span>
      config.yaml             <span class="cm"># 超参与数据路径</span>
      results/                <span class="cm"># RMSE、p 值、图</span>
      README.md               <span class="cm"># 结论与局限</span>
  notes/
    2026-10-03.md             <span class="cm"># 每日实验日志：假设 → 操作 → 结果 → 下一步</span></code></pre>
    <p>判断标准：<strong>一个陌生人 clone 这个仓库、运行一条命令，能否得到与你相同的图和数字？</strong>
    如果答案是「能」，你就达到了 Vandewalle 等人所说的可复现研究标准。</p>
  </div>
</div>
`
});
