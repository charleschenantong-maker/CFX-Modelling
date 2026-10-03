/* content/92-appendix-c-resources.js — 附录 C：资源地图与阅读路径 */
COURSE.register({
  id: "appC",
  part: 9,
  num: "C",
  title: "附录 C · 资源地图与阅读路径",
  en: "Appendix C — Resource Map",
  minutes: 45,
  tags: ["附录", "资源", "阅读路径"],
  body: String.raw`
<p class="lead">
  这门课只依赖<strong>四条信息源</strong>：TRL 文档、Hugging Face Learn、JAX AI Stack、Google Colab。
  它们不是并列的「推荐阅读」，而是四种<strong>不同类型的问题</strong>各自的答案所在地。
  分不清该去哪查，是初学者最耗时的一种错——你会花两小时在视频里找一个应该在文档第一页的参数默认值。
</p>

<h3>1. 四条信息源，四种问题</h3>
<div class="grid2">
  <div class="card">
    <h5>TRL 文档 —— 操作手册</h5>
    <p><strong>回答「怎么做」</strong>。当你要做 SFT / DPO / GRPO / 蒸馏，这里是唯一的权威：
      Trainer 的每个参数、数据集该长什么样、怎么省显存、怎么上多卡。</p>
    <p><strong>用法</strong>：Quickstart 跑通最小例子 → 直接跳到对应 Trainer 页 → 出问题再读 How-to。
      <em>不要</em>从头读到尾，它不是教材。</p>
  </div>
  <div class="card">
    <h5>Hugging Face Learn —— 系统教材</h5>
    <p><strong>回答「这是什么、为什么」</strong>。LLM Course 与 Agents Course 有完整的章节编排、
      可运行的 notebook 和测验，适合用来补概念的洞。</p>
    <p><strong>用法</strong>：按章读，但只为补洞而读。你已经懂的章节直接跳过，
      把时间留给第 5、6、11 章这些与动手直接相关的部分。</p>
  </div>
  <div class="card">
    <h5>JAX AI Stack —— 第二个生态的对照</h5>
    <p><strong>回答「同一件事换一套工具怎么写」</strong>。它的 miniGPT 教程是 NNX + Optax + Grain 的
      官方范例，并且明确覆盖了 <span class="t" data-tterm="SPMD" data-d="Single Program Multiple Data：同一份程序在不同设备上处理不同数据分片。JAX 通过 Mesh 与 PartitionSpec 让编译器自动完成切分。">SPMD</span>
      并行与 mesh 配置。</p>
    <p><strong>用法</strong>：在完成 PyTorch 版 miniGPT（实验 E3）之后读，边读边填附录 B 里的对照表。</p>
  </div>
  <div class="card">
    <h5>Google Colab —— 把代码跑起来</h5>
    <p><strong>回答「它到底能不能跑」</strong>。所有文档都可能在版本、显存、驱动上与你的现实不符，
      只有 Colab 的实际输出算数。</p>
    <p><strong>用法</strong>：每个实验开始前先跑一次环境检查（<code>!nvidia-smi</code>、
      <code>jax.devices()</code>、<code>pip show trl</code>），把结论写进实验记录。</p>
  </div>
</div>

<h4>遇到问题时，按这个顺序查</h4>
<div class="flow">
  <div class="nd hi">报错信息</div><div class="ar">→</div>
  <div class="nd">库的 Quickstart / Troubleshoot</div><div class="ar">→</div>
  <div class="nd">对应 Trainer / API 页</div><div class="ar">→</div>
  <div class="nd">How-to 指南</div><div class="ar">→</div>
  <div class="nd">自己写 20 行最小复现</div><div class="ar">→</div>
  <div class="nd">才去搜视频或论坛</div>
</div>
<p>
  注意最后一步的位置：<strong>视频与论坛是最后手段，不是第一手段</strong>。
  原因很简单——文档是版本化的、可检索的、可引用的；视频是一维的、不可检索的，
  而且它的时效性藏在出版日期里。
</p>

<h3>2. 表 1 · Hugging Face 生态地图</h3>
<table class="tbl small">
  <thead><tr><th>库 / 产品</th><th>是什么</th><th>什么时候用</th><th>在哪读</th></tr></thead>
  <tbody>
    <tr>
      <td><code>transformers</code></td>
      <td>模型与 tokenizer 的统一接口，一切的地基</td>
      <td>载入任何预训练模型、写前向、做推理</td>
      <td><a href="https://huggingface.co/docs/transformers/index" target="_blank" rel="noopener">docs/transformers</a></td>
    </tr>
    <tr>
      <td><code>datasets</code></td>
      <td>Arrow 支撑的数据集库，内存映射、可流式</td>
      <td>载入 Hub 数据、做 <code>map</code> 预处理、切分</td>
      <td><a href="https://huggingface.co/docs/datasets/index" target="_blank" rel="noopener">docs/datasets</a></td>
    </tr>
    <tr>
      <td><code>tokenizers</code></td>
      <td>Rust 实现的分词器，BPE / WordPiece / Unigram</td>
      <td>自己训词表、研究分词行为（实验 E2）</td>
      <td><a href="https://huggingface.co/docs/tokenizers/index" target="_blank" rel="noopener">docs/tokenizers</a></td>
    </tr>
    <tr>
      <td><code>accelerate</code></td>
      <td>把「单卡脚本」变成「多卡 / 混合精度」的抽象层</td>
      <td>同一份训练脚本要跑在不同硬件上</td>
      <td><a href="https://huggingface.co/docs/accelerate/index" target="_blank" rel="noopener">docs/accelerate</a></td>
    </tr>
    <tr>
      <td><code>peft</code></td>
      <td>参数高效微调：LoRA / DoRA / IA3 / 提示微调</td>
      <td>显存不够全量微调，或需要保存小体积 adapter（E4）</td>
      <td><a href="https://huggingface.co/docs/peft/index" target="_blank" rel="noopener">docs/peft</a></td>
    </tr>
    <tr>
      <td><code>trl</code></td>
      <td>后训练全套：SFT / DPO / GRPO / KTO / RLOO / 奖励模型 / 蒸馏</td>
      <td>做对齐训练，从监督微调到偏好优化（E4、E5）</td>
      <td><a href="https://huggingface.co/docs/trl/index" target="_blank" rel="noopener">docs/trl</a></td>
    </tr>
    <tr>
      <td><code>evaluate</code></td>
      <td>统一的指标接口（accuracy、BLEU、perplexity 等）</td>
      <td>需要与论文或他人结果对齐指标定义时</td>
      <td><a href="https://huggingface.co/docs/evaluate/index" target="_blank" rel="noopener">docs/evaluate</a></td>
    </tr>
    <tr>
      <td><code>bitsandbytes</code></td>
      <td>k-bit 量化：8-bit 优化器、LLM.int8()、NF4（QLoRA）</td>
      <td>4-bit 加载推理、QLoRA 微调（E8）</td>
      <td><a href="https://huggingface.co/docs/bitsandbytes/index" target="_blank" rel="noopener">docs/bitsandbytes</a></td>
    </tr>
    <tr>
      <td><code>safetensors</code></td>
      <td>安全的张量序列化格式，替代 pickle</td>
      <td>发布权重、避免反序列化执行任意代码</td>
      <td><a href="https://huggingface.co/docs/safetensors/index" target="_blank" rel="noopener">docs/safetensors</a></td>
    </tr>
    <tr>
      <td><code>vLLM</code></td>
      <td>高吞吐推理引擎，PagedAttention + 连续批处理</td>
      <td>自建服务、测吞吐与延迟（E8）</td>
      <td><a href="https://docs.vllm.ai/en/latest/" target="_blank" rel="noopener">docs.vllm.ai</a></td>
    </tr>
    <tr>
      <td>Hub（模型 / 数据集）</td>
      <td>权重与数据的托管、版本管理、模型卡</td>
      <td>找基座模型、找数据集、发布你的 adapter</td>
      <td><a href="https://huggingface.co/docs/hub/index" target="_blank" rel="noopener">docs/hub</a></td>
    </tr>
    <tr>
      <td>Jobs</td>
      <td>在 Hugging Face 托管的算力上跑训练脚本</td>
      <td>本地与 Colab 都不够时，跑一次性的训练任务</td>
      <td><a href="https://huggingface.co/docs/hub/jobs" target="_blank" rel="noopener">docs/hub/jobs</a></td>
    </tr>
    <tr>
      <td>Spaces</td>
      <td>托管的 demo 应用（Gradio / Streamlit / Docker）</td>
      <td>把量化后的模型做成可交互 demo 写进申请材料</td>
      <td><a href="https://huggingface.co/docs/hub/spaces" target="_blank" rel="noopener">docs/hub/spaces</a></td>
    </tr>
    <tr>
      <td><code>tiktoken</code></td>
      <td>OpenAI 的 BPE 分词器（r50k / cl100k / o200k）</td>
      <td>做分词对比实验、给 JAX 教程准备数据（E2、E6）</td>
      <td><a href="https://github.com/openai/tiktoken" target="_blank" rel="noopener">github/tiktoken</a></td>
    </tr>
  </tbody>
</table>

<h3>3. TRL 文档逐页清单</h3>
<p>
  下面这一节是全附录<strong>最值得收藏</strong>的部分。TRL 的版本迭代很快，API 与文档强绑定，
  所以「读哪一页」比「读多少」重要得多。所有链接都指向前缀
  <code>https://huggingface.co/docs/trl/</code> 下的页面。
</p>

<h4>3.1 Getting started（先跑通）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>什么时候读</th></tr></thead>
  <tbody>
    <tr><td>TRL 总览</td><td><a href="https://huggingface.co/docs/trl/index" target="_blank" rel="noopener">/docs/trl/index</a></td><td>先看左侧目录，建立「有哪些 Trainer」的整体概念</td></tr>
    <tr><td>Installation</td><td><a href="https://huggingface.co/docs/trl/installation" target="_blank" rel="noopener">/docs/trl/installation</a></td><td>第一次装、或版本冲突时。注意它对 transformers / peft 版本的连带要求</td></tr>
    <tr><td>Quickstart</td><td><a href="https://huggingface.co/docs/trl/quickstart" target="_blank" rel="noopener">/docs/trl/quickstart</a></td><td><strong>第一站</strong>。跑通一个最小 SFT 例子再往下读</td></tr>
  </tbody>
</table>

<h4>3.2 Conceptual Guides（建立心智模型）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>什么时候读</th></tr></thead>
  <tbody>
    <tr><td>Chat Templates</td><td><a href="https://huggingface.co/docs/trl/chat_templates" target="_blank" rel="noopener">/docs/trl/chat_templates</a></td><td>当你的模型输出格式奇怪、或数据是对话格式时。这是最常见的困惑来源</td></tr>
    <tr><td>Dataset Formats</td><td><a href="https://huggingface.co/docs/trl/dataset_formats" target="_blank" rel="noopener">/docs/trl/dataset_formats</a></td><td>准备数据之前<strong>必读</strong>。SFT / DPO / GRPO 各自要求的字段名完全不同</td></tr>
    <tr><td>Paper Index</td><td><a href="https://huggingface.co/docs/trl/paper_index" target="_blank" rel="noopener">/docs/trl/paper_index</a></td><td>想读原始论文时。按方法列好了 DPO / GRPO / KTO / RLOO 的出处</td></tr>
  </tbody>
</table>

<h4>3.3 Trainers（按需查阅，不要通读）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>什么时候读</th></tr></thead>
  <tbody>
    <tr><td>SFT Trainer</td><td><a href="https://huggingface.co/docs/trl/sft_trainer" target="_blank" rel="noopener">/docs/trl/sft_trainer</a></td><td>实验 E4。重点看数据格式、<code>completion_only_loss</code>、packing 相关参数</td></tr>
    <tr><td>DPO Trainer</td><td><a href="https://huggingface.co/docs/trl/dpo_trainer" target="_blank" rel="noopener">/docs/trl/dpo_trainer</a></td><td>实验 E5。重点看 <code>beta</code>、参考模型的提供方式、隐含奖励的日志字段</td></tr>
    <tr><td>GRPO Trainer</td><td><a href="https://huggingface.co/docs/trl/grpo_trainer" target="_blank" rel="noopener">/docs/trl/grpo_trainer</a></td><td>做可验证奖励（数学 / 代码）的强化学习时；它是当前最常用的在线 RL 方法</td></tr>
    <tr><td>KTO Trainer</td><td><a href="https://huggingface.co/docs/trl/kto_trainer" target="_blank" rel="noopener">/docs/trl/kto_trainer</a></td><td>你只有「好 / 坏」的二元标签、凑不出偏好对时</td></tr>
    <tr><td>Reward Trainer</td><td><a href="https://huggingface.co/docs/trl/reward_trainer" target="_blank" rel="noopener">/docs/trl/reward_trainer</a></td><td>要做经典 RLHF：先训一个奖励模型，再优化策略</td></tr>
    <tr><td>RLOO Trainer</td><td><a href="https://huggingface.co/docs/trl/rloo_trainer" target="_blank" rel="noopener">/docs/trl/rloo_trainer</a></td><td>想要比 PPO 更轻的在线 RL 基线时（REINFORCE 留一法）</td></tr>
    <tr><td>Distillation Trainer</td><td><a href="https://huggingface.co/docs/trl/distillation_trainer" target="_blank" rel="noopener">/docs/trl/distillation_trainer</a></td><td>把大模型的能力蒸馏到小模型时</td></tr>
  </tbody>
</table>

<h4>3.4 How-to Guides（遇到具体工程问题时）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>解决什么问题</th></tr></thead>
  <tbody>
    <tr><td>CLI</td><td><a href="https://huggingface.co/docs/trl/clis" target="_blank" rel="noopener">/docs/trl/clis</a></td><td>不想写 Python，直接用命令行启动一次训练</td></tr>
    <tr><td>Training using Jobs</td><td><a href="https://huggingface.co/docs/trl/jobs_training" target="_blank" rel="noopener">/docs/trl/jobs_training</a></td><td>要把训练提交到 HF Jobs 上跑</td></tr>
    <tr><td>Customizing the Training</td><td><a href="https://huggingface.co/docs/trl/customization" target="_blank" rel="noopener">/docs/trl/customization</a></td><td>需要自定义损失、回调、或改写训练循环</td></tr>
    <tr><td>Reducing Memory Usage</td><td><a href="https://huggingface.co/docs/trl/reducing_memory_usage" target="_blank" rel="noopener">/docs/trl/reducing_memory_usage</a></td><td><strong>OOM 时的第一站</strong>：梯度检查点、4-bit、Liger、序列打包</td></tr>
    <tr><td>Speeding Up Training</td><td><a href="https://huggingface.co/docs/trl/speeding_up_training" target="_blank" rel="noopener">/docs/trl/speeding_up_training</a></td><td>能跑但太慢：FlashAttention、序列打包、批大小</td></tr>
    <tr><td>Distributing Training</td><td><a href="https://huggingface.co/docs/trl/distributing_training" target="_blank" rel="noopener">/docs/trl/distributing_training</a></td><td>要上多卡 / 多机</td></tr>
    <tr><td>Training Beyond 1M Tokens</td><td><a href="https://huggingface.co/docs/trl/long_context_training" target="_blank" rel="noopener">/docs/trl/long_context_training</a></td><td>上下文拉到很长时（长文档、长对话）</td></tr>
    <tr><td>Using Trained Models</td><td><a href="https://huggingface.co/docs/trl/use_model" target="_blank" rel="noopener">/docs/trl/use_model</a></td><td><strong>训练完之后的必读</strong>：怎么正确加载你自己产出的模型</td></tr>
  </tbody>
</table>

<h4>3.5 Integrations（与其它库的接口）</h4>
<table class="tbl small">
  <thead><tr><th>集成</th><th>链接</th><th>为什么值得看</th></tr></thead>
  <tbody>
    <tr><td>PEFT</td><td><a href="https://huggingface.co/docs/trl/peft_integration" target="_blank" rel="noopener">/docs/trl/peft_integration</a></td><td>实验 E4 / E5 的全部细节：LoRA 配置、参考模型怎么省、adapter 怎么合并</td></tr>
    <tr><td>vLLM</td><td><a href="https://huggingface.co/docs/trl/vllm_integration" target="_blank" rel="noopener">/docs/trl/vllm_integration</a></td><td>用 vLLM 加速生成式训练（GRPO 采样阶段的关键优化）</td></tr>
    <tr><td>Unsloth</td><td><a href="https://huggingface.co/docs/trl/unsloth_integration" target="_blank" rel="noopener">/docs/trl/unsloth_integration</a></td><td>单卡上把微调速度和显存都优化一档</td></tr>
    <tr><td>Liger Kernel</td><td><a href="https://huggingface.co/docs/trl/liger_kernel_integration" target="_blank" rel="noopener">/docs/trl/liger_kernel_integration</a></td><td>通过融合算子降低显存占用，一行开关</td></tr>
    <tr><td>DeepSpeed</td><td><a href="https://huggingface.co/docs/trl/deepspeed_integration" target="_blank" rel="noopener">/docs/trl/deepspeed_integration</a></td><td>ZeRO 分片：多卡训练的显存分摊</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>关于链接形式的一个实测细节</h4>
  <p>
    Integrations 的五个页面，官方 URL 是<strong>带 <code>_integration</code> 后缀</strong>的形式
    （<code>/docs/trl/peft_integration</code> 等）。短形式（例如 <code>/docs/trl/peft</code>）目前只在
    <code>main</code> 版本下存在，指向稳定版时会提示「该页面在此版本不存在」。
    如果你从旧教程里抄到了短链接并发现 404，把 <code>_integration</code> 补上即可。
  </p>
  <p>
    同理，TRL 的 <code>how-to</code> 页面从早期版本起改过名字，遇到失效链接时，
    <strong>永远从 <a href="https://huggingface.co/docs/trl/index" target="_blank" rel="noopener">/docs/trl/index</a>
    的左侧目录进入</strong>，而不是相信任何二手链接。
  </p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>还值得收藏的几页</h4>
  <table class="tbl small">
    <thead><tr><th>页面</th><th>链接</th><th>用途</th></tr></thead>
    <tbody>
      <tr><td>LoRA Without Regret</td><td><a href="https://huggingface.co/docs/trl/lora_without_regret" target="_blank" rel="noopener">/docs/trl/lora_without_regret</a></td><td>一篇实战总结：LoRA 的秩、学习率与目标模块该怎么选</td></tr>
      <tr><td>Example Overview</td><td><a href="https://huggingface.co/docs/trl/example_overview" target="_blank" rel="noopener">/docs/trl/example_overview</a></td><td>官方脚本清单，想抄一个能跑的起点时用</td></tr>
      <tr><td>Community Tutorials</td><td><a href="https://huggingface.co/docs/trl/community_tutorials" target="_blank" rel="noopener">/docs/trl/community_tutorials</a></td><td>社区教程汇总（质量参差，读时对照官方 Trainer 页）</td></tr>
      <tr><td>Reward Functions</td><td><a href="https://huggingface.co/docs/trl/rewards" target="_blank" rel="noopener">/docs/trl/rewards</a></td><td>GRPO 的可验证奖励函数工具集</td></tr>
    </tbody>
  </table>
</section>

<h3>4. 表 2 · 学习路径</h3>
<p>
  下面这张表按「先读哪几节」而不是「读哪个资源」来组织。原因是你没有时间读完任何一门课：
  LLM Course 有 12 章、Agents Course 有 4 个单元加 3 个附加单元，全部读完等于放弃你的研究项目。
</p>
<table class="tbl small">
  <thead><tr><th>资源</th><th>链接</th><th>先读哪几节</th><th>配哪个实验</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Hugging Face Learn</strong>（总入口）</td>
      <td><a href="https://huggingface.co/learn" target="_blank" rel="noopener">huggingface.co/learn</a></td>
      <td>先在这里确认课程清单与各自的语言版本，再决定要不要投入某一门</td>
      <td>—</td>
    </tr>
    <tr>
      <td><strong>LLM Course</strong></td>
      <td><a href="https://huggingface.co/learn/llm-course/chapter1/1" target="_blank" rel="noopener">learn/llm-course</a></td>
      <td>第 1 章第 1–6 节（Transformer 与 LLM 基础）→ 第 6 章（Tokenizers 库）→ 第 5 章（Datasets 库）
        → 第 11 章（微调大模型）→ 第 12 章（推理模型）。第 7–10 章按需查</td>
      <td>E1、E2、E4</td>
    </tr>
    <tr>
      <td><strong>Agents Course</strong></td>
      <td><a href="https://huggingface.co/learn/agents-course/unit0/introduction" target="_blank" rel="noopener">learn/agents-course</a></td>
      <td>Unit 1（Agent Fundamentals：工具、消息格式、特殊 token、chat template）→ Unit 2.1（smolagents）
        → Bonus Unit 1（为函数调用微调模型）。Unit 3、4 只在你要做 agent 项目时读</td>
      <td>E4（chat template 的实战背景）</td>
    </tr>
    <tr>
      <td><strong>JAX AI Stack</strong>（总入口）</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/" target="_blank" rel="noopener">docs.jaxstack.ai</a></td>
      <td>先看 Tutorials 列表与「JAX AI Stack 由哪些库组成」（JAX / Flax / Orbax / Optax / Grain / ml_dtypes）</td>
      <td>E6</td>
    </tr>
    <tr>
      <td><strong>《Train a miniGPT language model with JAX》</strong></td>
      <td><a href="https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html" target="_blank" rel="noopener">JAX_for_LLM_pretraining.html</a></td>
      <td>按节读：Setup（用 <code>jax-ai-stack[grain]</code> 聚合安装）→ 用 Flax 定义 miniGPT
        → <code>jax.sharding.Mesh</code> → 数据加载与预处理 → 损失与训练步 → 保存检查点。
        三个关键词必须弄懂：<span class="t" data-tterm="Mesh" data-d="一个由设备组成的多维数组，每条轴有名字（如 batch / model）。它描述「有哪些算力、怎么排列」。">Mesh</span>、
        <span class="t" data-tterm="PartitionSpec" data-d="描述某个张量的每一维如何分布到 mesh 的各条轴上；None 表示该维不切分（复制）。">PartitionSpec</span>、
        <span class="t" data-tterm="NamedSharding" data-d="(Mesh, PartitionSpec) 的组合，告诉编译器某个具体张量该怎么切。">NamedSharding</span>
      </td>
      <td>E6</td>
    </tr>
    <tr>
      <td>《JAX for PyTorch users》</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/JAX_for_PyTorch_users.html" target="_blank" rel="noopener">JAX_for_PyTorch_users.html</a></td>
      <td>整篇。它是你在附录 B 里填「PyTorch / JAX 对照表」时的官方依据</td>
      <td>E6</td>
    </tr>
    <tr>
      <td>《Porting a PyTorch model to JAX》</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/JAX_porting_PyTorch_model.html" target="_blank" rel="noopener">JAX_porting_PyTorch_model.html</a></td>
      <td>整篇。把 E3 的 PyTorch 实现逐层搬过去时对照着看</td>
      <td>E6</td>
    </tr>
    <tr>
      <td>《Introduction to Data Loaders》</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/data_loaders.html" target="_blank" rel="noopener">data_loaders.html</a></td>
      <td>只看 Grain 部分（另有 CPU / GPU 两篇子页）。目的：搞清 <code>DataSource</code> 与 <code>Sampler</code> 的分工</td>
      <td>E6</td>
    </tr>
    <tr>
      <td><strong>Google Colab 入门 notebook</strong></td>
      <td><a href="https://colab.research.google.com/notebooks/intro.ipynb" target="_blank" rel="noopener">notebooks/intro.ipynb</a></td>
      <td>只要两节：运行时类型怎么切换、文件与磁盘怎么持久化（<code>/content</code> 会随会话消失）</td>
      <td>全部实验</td>
    </tr>
    <tr>
      <td>直接在 Colab 打开 miniGPT 教程</td>
      <td><a href="https://colab.research.google.com/github/jax-ml/jax-ai-stack/blob/main/docs/source/JAX_for_LLM_pretraining.ipynb" target="_blank" rel="noopener">Colab 上的 JAX_for_LLM_pretraining.ipynb</a></td>
      <td>从教程页的「Run in Google Colab」按钮进入；这也是验证「我本地版本与官方是否一致」的最快方式</td>
      <td>E6</td>
    </tr>
    <tr>
      <td>Kaggle（TPU v5e-8）</td>
      <td><a href="https://www.kaggle.com/" target="_blank" rel="noopener">kaggle.com</a></td>
      <td>当你确实想跑 <code>(4, 2)</code> 的 mesh 时来这里；免费层 Colab 只有单核 TPU，做不到 SPMD</td>
      <td>E6 延伸</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>关于 TPU 的一句话真相（值得单独记住）</h4>
  <p>
    JAX AI Stack 的 miniGPT 教程面向 <strong>TPU v5e-8</strong>（Kaggle 免费层提供）写成，
    使用 4 路数据并行 + 2 路张量并行。但教程同时写明：<strong>截至 2025 年 10 月，
    Colab 免费层只提供 TPU v5e-1，已经无法支持 SPMD</strong>。
  </p>
  <p>
    这解释了一个非常常见的挫败场景：你照着官方教程抄了 <code>(4, 2)</code> 的 mesh，
    在 Colab 上直接报错。正确做法不是放弃，而是把 mesh 改成 <code>(1, 1)</code>——
    模型代码一行都不用改，只是失去了并行加速。附录 B 的 E6 就是按这个思路改写的。
  </p>
</section>

<h3>5. 表 3 · 12 周阅读节奏</h3>
<p>
  这张表把模块、资源与实验绑在一起。每周的产出必须是<strong>可放进申请材料的东西</strong>，
  而不是「读完了某几页」。每周 6–8 小时。
</p>
<table class="tbl small">
  <thead><tr><th>周</th><th>读什么</th><th>配哪个实验</th><th>本周产出</th></tr></thead>
  <tbody>
    <tr><td><strong>1</strong></td><td>模块 00–01；LLM Course 第 1 章 1–4 节</td><td><strong>E1</strong></td><td>bigram → 神经 bigram → MLP 的三条 perplexity 曲线与记录表</td></tr>
    <tr><td><strong>2</strong></td><td>模块 02；LLM Course 第 6 章（Tokenizers）</td><td><strong>E2</strong></td><td>「生育率」在四个 tokenizer 下的切分对照表与成本换算</td></tr>
    <tr><td><strong>3</strong></td><td>模块 03–04；LLM Course 第 1 章 5–6 节</td><td><strong>E3</strong>（上半）</td><td>可运行的迷你 Transformer，能在 TinyStories 上收敛</td></tr>
    <tr><td><strong>4</strong></td><td>模块 04–05；JAX AI Stack「JAX for PyTorch users」</td><td><strong>E3</strong>（下半）</td><td>参数量手算与程序统计完全相等；FLOPs 与 MFU 估算</td></tr>
    <tr><td><strong>5</strong></td><td>模块 06；JAX AI Stack miniGPT 教程全部</td><td><strong>E6</strong></td><td>单设备 JAX miniGPT + PyTorch / JAX 逐项对照表</td></tr>
    <tr><td><strong>6</strong></td><td>模块 07（SFT 部分）；TRL Quickstart、SFT Trainer、PEFT 集成、Dataset Formats</td><td><strong>E4</strong></td><td>LoRA adapter + 可训练参数占比 + 基座对照输出</td></tr>
    <tr><td><strong>7</strong></td><td>模块 07（对齐部分）；TRL DPO Trainer、Paper Index 里的 DPO 原文</td><td><strong>E5</strong></td><td>偏好对数据集 + margin 曲线 + β 扫描结论</td></tr>
    <tr><td><strong>8</strong></td><td>模块 09 上半；LLM Course 第 11 章</td><td><strong>E7</strong>（第一遍）</td><td>分组交叉验证的模型阶梯表 + 置换检验 p 值</td></tr>
    <tr><td><strong>9</strong></td><td>模块 09 下半；复习分层抽样与多重比较</td><td><strong>E7</strong>（第二遍）</td><td>加入噪声特征后的选择偏差实验；结论模板定稿</td></tr>
    <tr><td><strong>10</strong></td><td>模块 08、10；bitsandbytes 文档、vLLM 文档、TRL 的 Reducing Memory Usage</td><td><strong>E8</strong></td><td>量化显存/速度对照表 + 并发-吞吐-延迟曲线</td></tr>
    <tr><td><strong>11</strong></td><td>模块 11–13；TRL Jobs 页（若要上云）</td><td>—（整理 E1–E8 的记录）</td><td>算力预算表与订阅等效额度换算</td></tr>
    <tr><td><strong>12</strong></td><td>模块 14–16；附录 A 术语表全过一遍</td><td>—（复现一次 E7 与 E8）</td><td>研究报告 + 口头答辩稿；所有实验可一键复现</td></tr>
  </tbody>
</table>
<p>
  <strong>两周的弹性空间</strong>：如果你在第 5 周发现 JAX 版占用了太多时间，
  就把第 9 周的 E7 第二遍删掉，把第 12 周的复现改成只复现 E7。
  <strong>唯一不能删的是 E7</strong>——它直接对应你申请项目里的 Checkpoint 7。
</p>

<h3>6. 怎么用 YouTube 与访谈类资料</h3>
<p>
  视频与访谈不是「不可信」，而是<strong>可信的维度不同</strong>。它们最有价值的成分是
  <em>工程经验</em>与<em>量级直觉</em>；最容易过期的成分是<em>具体数字</em>与<em>界面位置</em>。
  把这两类内容分开对待，你就能既吸收经验又不被误导。
</p>
<table class="tbl small">
  <thead><tr><th>内容类型</th><th>可信度</th><th>为什么</th><th>怎么用</th></tr></thead>
  <tbody>
    <tr>
      <td>可复现的工程经验（「我这样配就能在 16GB 上训 7B」）</td>
      <td><strong>高</strong></td>
      <td>它有明确的成功判据，而且你能在半小时内验证</td>
      <td>抄配置，自己跑一遍，把结果记进实验台账</td>
    </tr>
    <tr>
      <td>量级估算（「4-bit 的 7B 大约 4GB 权重」）</td>
      <td><strong>高</strong></td>
      <td>它由位宽与参数量决定，物理上很难说错</td>
      <td>当作心算校验：与你的公式估算对照</td>
    </tr>
    <tr>
      <td>失败教训与坑（「pad token 没设会炸」）</td>
      <td><strong>高</strong></td>
      <td>错误现象可复现，且往往比文档更贴近真实报错</td>
      <td>整理成自己的排错清单（附录 B 每节的「常见错误」就是这类内容）</td>
    </tr>
    <tr>
      <td>架构与直觉解释（「注意力像检索」）</td>
      <td><strong>中</strong></td>
      <td>类比帮助入门，但会掩盖边界条件</td>
      <td>当作入口，随后必须用公式与代码校准</td>
    </tr>
    <tr>
      <td>精确价格、费率、额度倍率</td>
      <td><strong>低</strong></td>
      <td>价格与配额每月都可能变，视频的时间戳不会跟着变</td>
      <td>只取「量级」（几十倍、几美元级），具体数字查官方定价页</td>
    </tr>
    <tr>
      <td>平台政策与条款解读</td>
      <td><strong>低</strong></td>
      <td>说的人常常没有读过原文，或读的是旧版本</td>
      <td>去读 ToS / Usage Policy 原文；把「能不能用于生产流量」这类判断交给条款</td>
    </tr>
    <tr>
      <td>界面操作步骤（「点右上角第三个按钮」）</td>
      <td><strong>低</strong></td>
      <td>UI 改版后步骤立即失效，而视频不会更新</td>
      <td>用它建立「大概在哪」，真正操作时以当前界面为准</td>
    </tr>
    <tr>
      <td>排行榜与「某模型能推理 / 能自主」这类断言</td>
      <td><strong>低</strong></td>
      <td>存在数据污染、选择性汇报与营销动机</td>
      <td>要结论就自己做一个最小评估（模块 09 的方法论）</td>
    </tr>
    <tr>
      <td>访谈里的商业判断与个人选择</td>
      <td><strong>看情况</strong></td>
      <td>讲述者有激励结构（卖课、卖工具、卖观点），且存在幸存者偏差</td>
      <td>问三个问题：他的目标函数是什么？样本量是多少？反例在哪里？</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>三步核实法（30 分钟以内）</h4>
  <ol>
    <li><strong>找官方文档</strong>：库的参数查库文档，平台的行为查平台文档，法规查条款原文。
        只接受<strong>能给出链接</strong>的说法——包括你自己在笔记里写下的说法。</li>
    <li><strong>看条款与定价页</strong>：任何涉及钱、额度、以及「能不能这样用」的结论，
        都要落到 ToS、Usage Policy 或 Pricing 页面上。<strong>顺手记下查询日期</strong>，
        因为这是唯一能让半年后的你知道「当时是这么写的」的方法。</li>
    <li><strong>自己跑一遍</strong>：写 20 行最小复现。
        「Colab 免费层有没有 8 核 TPU」这个问题，<code>jax.devices()</code> 一行就能回答；
        「4-bit 到底省多少显存」，<code>torch.cuda.max_memory_allocated()</code> 一行就能回答。
        <strong>能一行验证的事，不要花两小时看视频。</strong></li>
  </ol>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>建立你自己的资源台账</h4>
  <p>在仓库里维护一个 <code>notes/resources.md</code>，每一条记录至少包含四个字段：</p>
  <table class="tbl small">
    <thead><tr><th>字段</th><th>为什么必须有</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td>链接</td><td>二手记忆不可靠，链接可回溯</td><td>TRL dpo_trainer 页</td></tr>
      <tr><td>访问日期</td><td>文档会变，日期是唯一的时间锚点</td><td>2026-10-03</td></tr>
      <tr><td>一句话结论</td><td>你半年后只会读这一句</td><td>beta 默认 0.1，越小越激进</td></tr>
      <tr><td>验证状态</td><td>区分「文档说」与「我跑过」</td><td>已用 E5 验证</td></tr>
    </tbody>
  </table>
  <p>
    这份台账的价值会随时间单调上升：它把你从「又一次搜索同一件事」中永久解放出来，
    同时它本身就是「我如何管理信息」的能力证明。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你要确认 TRL 里 DPO 的 <code>beta</code> 参数的默认值与确切语义。最该先查哪里？</p>
  <ul class="opts">
    <li>在视频平台上搜「DPO beta 怎么调」，看播放量最高的那个</li>
    <li>在聊天窗口里问一句「DPO 的 beta 默认是多少」</li>
    <li data-ok>TRL 文档的 DPO Trainer 页（必要时对照 Paper Index 里的 DPO 原论文），再用 <code>pip show trl</code> 锁定版本</li>
    <li>Hub 上随便找一个 DPO 模型的 README</li>
  </ul>
  <p class="why">
    参数默认值属于<strong>版本化的事实</strong>，唯一权威是文档，而且必须与你的实际版本对齐——
    这正是先跑 <code>pip show trl</code> 的原因。视频与 README 都可能过期；
    聊天助手的答案无法给出可验证的版本边界（它可能把不同版本的默认值混在一起）。
    想再稳一层：在 notebook 里 <code>print(DPOConfig().beta)</code>，一行拿到真相。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">一个视频说「Colab 免费层的 TPU 已经是 8 核，照官方教程把 mesh 写成 (4, 2) 就行」。
    最稳妥的做法是什么？</p>
  <ul class="opts">
    <li>照做，因为官方教程就是这么写的</li>
    <li data-ok>先跑 <code>jax.devices()</code> 看实际设备数；官方教程本身写明免费层只有单核 TPU v5e-1、
        无法支持 SPMD，因此应把 mesh 改成 (1, 1)，想去 8 核就用 Kaggle 的 TPU v5e-8</li>
    <li>直接放弃 JAX，改用 PyTorch</li>
    <li>把 <code>(4, 2)</code> 改成 <code>(2, 4)</code> 试试</li>
  </ul>
  <p class="why">
    这是一个<strong>一行代码就能验证</strong>的问题：<code>jax.devices()</code> 的输出是唯一事实。
    同时注意，官方教程已经主动写了这个限制（「as of October 2025, free-tier Colab only offers TPU v5e-1,
    which can no longer support SPMD」）——所以正确的信息其实一直在文档里，
    视频只是把它压缩成了一句话并抹掉了日期。改换轴顺序 <code>(2, 4)</code> 不会创造第二个设备。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">你想知道「在 Hugging Face Jobs 上跑一次多卡训练该怎么配、大致什么价位」。
    该去哪一组页面查？</p>
  <ul class="opts">
    <li>TRL 的 SFT Trainer 页 + LLM Course 第 11 章</li>
    <li>某个访谈里提到的报价 + 论坛帖子的经验</li>
    <li data-ok>Hub 文档的 Jobs 页（配置与硬件选项）+ 官方定价页（价格口径），并记下查询日期</li>
    <li>vLLM 文档 + bitsandbytes 文档</li>
  </ul>
  <p class="why">
    这里有两个相互独立的事实来源：<strong>功能怎么用</strong>在 Hub 的 Jobs 文档，
    <strong>要花多少钱</strong>在定价页。任何「价格」类结论都必须带日期，因为它是最容易过期的信息。
    TRL 的 SFT Trainer 页讲的是训练器的参数与数据格式，不涉及平台计费；
    vLLM 与 bitsandbytes 分别管推理引擎与量化，与 Jobs 的配置无关。
    记住这条分工：<em>库的功能查库文档，平台的行为与价格查平台文档，条款查 ToS 原文。</em>
  </p>
</div>
`
});

