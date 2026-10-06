/* content/29-project.js — 模块 29：模型工业交付与项目收束：Qwen 权重合并、Ollama 本地导出与 Crossfade 跨学科项目落地 */
COURSE.register({
  id: "m29",
  part: 5,
  num: "29",
  title: "模型工业交付与项目收束：Qwen 权重合并、Ollama 本地导出与 Crossfade 跨学科项目落地",
  en: "Model Delivery & Capstone: Qwen Weight Merging, Ollama Local Export, and Crossfade Project Integration",
  minutes: 45,
  tags: ["权重合并", "Ollama导出", "GGUF", "Crossfade实战", "项目毕业"],
  body: String.raw`
<p class="lead">
  在完成了 Kaggle 云端对 Qwen-2.5 的领域微调后，我们迎来了<strong>整个大模型课程的工程最终章</strong>：
  <strong>将云端微调产物无损转化为你电脑上随时随地可调用的离线生产力工具</strong>！
  我们将手把手执行<strong>权重物理合并（Merge and Unload）</strong>，将其打包并导入到你个人电脑上的 <strong>Ollama</strong> 运行时中，
  打造出一个具备专属领域常识、0 API 费用、离线极速响应的 <strong>Crossfade 算法工程超级智能助手</strong>！
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>工程实战闭环：从云端训练到本地常驻</h4>
  <p>现代大模型工业落地的黄金标准路径：</p>
  <div class="flow">
    <div class="nd hi">1. Kaggle 免费微调</div>
    <div class="ar">→</div>
    <div class="nd">2. 物理权重合并</div>
    <div class="ar">→</div>
    <div class="nd">3. 导出 GGUF / Ollama</div>
    <div class="ar">→</div>
    <div class="nd hi">4. 驱动 Crossfade 工程</div>
  </div>
</section>

<h3>1. 为什么必须执行权重合并（Merge and Unload）？</h3>
<p>
  在第 28 讲中，我们保存的产物只是几兆字节的 LoRA 增量矩阵（\(\mathbf{A}\) 与 \(\mathbf{B}\)）。
  如果在推理服务中每次都动态挂载 LoRA，计算时必须分别执行主干矩阵乘法与旁路矩阵乘法再相加，会带来额外的显存访存开销与推理延迟。
  工业生产中最优雅的方案是<strong>将低秩增量直接物理相加并写回原权重矩阵</strong>：
</p>
\[ \mathbf{W}_{\text{merged}} = \mathbf{W}_0 + \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}) \]
<p>
  合并后，适配器被彻底吸收，模型重新变为一个<strong>完全独立的单体标准 Transformer</strong>，可以直接使用任何通用推理引擎（如 Ollama、vLLM、TensorRT-LLM）高速加载，无任何额外开销！
</p>

<h3>2. 逐行手写权重物理合并与导出代码</h3>
<p>
  在 Kaggle Notebook 中紧接微调步骤，我们遵循“<strong>1~2 行代码 + 紧随详细解析</strong>”的严密认知步调，执行合并与写出。
</p>

<h4>第一步：加载底座模型与微调后的 LoRA 适配器</h4>

<pre><code>from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
base_model_id = "Qwen/Qwen2.5-1.5B-Instruct"
lora_dir = "/kaggle/working/qwen-crossfade-lora"
</code></pre>
<p><strong>代码解析</strong>：指定原开源底座 ID 与第 28 讲生成的 LoRA 权重本地路径。</p>

<pre><code>tokenizer = AutoTokenizer.from_pretrained(lora_dir)
base_model = AutoModelForCausalLM.from_pretrained(base_model_id, torch_dtype=torch.float16, device_map="cpu")
</code></pre>
<p><strong>代码解析</strong>：加载微调保存的分词器；为了防止 GPU 显存不够存放两份完整模型，直接使用 <code>device_map="cpu"</code> 将底座模型以 FP16 精度加载至宿主机的 30GB 内存中。</p>

<pre><code>model = PeftModel.from_pretrained(base_model, lora_dir)
print("✅ 成功将 LoRA 适配器装载到底座模型拓扑结构中。")
</code></pre>
<p><strong>代码解析</strong>：调用 <code>PeftModel.from_pretrained</code>，将保存的旁路矩阵动态挂载到底座模型的主干上。</p>

<h4>第二步：执行物理权重融合并卸载旁路</h4>

<pre><code>merged_model = model.merge_and_unload()
print("🎉 物理融合完毕！已将 LoRA 低秩矩阵严格按数学公式加回主干权重矩阵。")
</code></pre>
<p><strong>代码解析</strong>：<strong>关键核心算子</strong>：调用 <code>merge_and_unload()</code> 执行 \(\mathbf{W}_0 + \Delta \mathbf{W}\) 矩阵加法运算，随后彻底销毁低秩侧枝结构，恢复为纯净的原生 <code>Qwen2ForCausalLM</code> 类单体对象。</p>

<pre><code>save_path = "/kaggle/working/qwen2.5-crossfade-merged"
merged_model.save_pretrained(save_path)
tokenizer.save_pretrained(save_path)
print(f"💾 合并后的完整独立大模型已成功持久化保存至: {save_path}")
</code></pre>
<p><strong>代码解析</strong>：将合并后的自包含模型与分词器整体导出；生成的文件夹内包含完整的 <code>model.safetensors</code> 权重与配置文件，可直接打包下载。</p>

<h3>3. 将改造后的模型导入本地 Ollama 运行时</h3>
<p>
  下载合并后的模型权重到你自己的个人电脑（笔记本或工作站）后，借助 <strong>Ollama</strong>（本地大模型轻量运行时），只需三步即可将其注册为常驻服务：
</p>

<dl class="kv">
  <dt>第一步：编写轻量定制 Modelfile</dt>
  <dd>在保存权重的目录下新建一个名为 <code>Modelfile</code> 的文本文件，填入定制系统提示词与超参数：
<pre><code>FROM ./qwen2.5-crossfade-merged

# 设置自回归推理采样温度
PARAMETER temperature 0.7
PARAMETER top_p 0.9

# 注入专属系统人设
SYSTEM """
你是专门为 Glass Player 与 Crossfade 音频渐变算法工程定制的数学与代码专家。
你熟知等功率曲线（Equal Power Fade）、重叠相加（Overlap-Add）、多相滤波与时频连续性推导，请给出数学严格且工程可落地的建议。
"""
</code></pre>
  </dd>
  <dt>第二步：使用 Ollama 编译构建本地模型</dt>
  <dd>在本地电脑终端（Terminal 或 PowerShell）中执行一条命令：
<pre><code>ollama create qwen-crossfade -f ./Modelfile
</code></pre>
  Ollama 会自动解析模型结构并将其注册进本地模型库中。
  </dd>
  <dt>第三步：在终端启动交互式对话</dt>
  <dd>
<pre><code>ollama run qwen-crossfade "分析两首 128 BPM 电子音乐在交叉过渡时的 EQ 衰减坡度。"
</code></pre>
  模型将在本地 CPU / 显卡上以极高速度流式输出专业分析，彻底摆脱网络依赖与任何商业 API 计费！
  </dd>
</dl>

<h3>4. 怎么在真实 Crossfade 项目代码中调用该模型？</h3>
<p>
  在你的 Crossfade 音频处理流水线（Python 项目）中，无需复杂网络依赖，直接通过本地 REST 接口进行自动化调用：
</p>

<pre><code># =====================================================================
# Crossfade DSP Pipeline: Autonomous Parameter Generation via Local Qwen
# =====================================================================

import json
import requests

def get_crossfade_dsp_params(track_a_bpm, track_b_bpm, genre="House"):
    """向本地 Ollama 微调模型请求最优过渡算法参数"""
    prompt = f"请为 Track A (BPM={track_a_bpm}) 与 Track B (BPM={track_b_bpm}) 推荐 Crossfade 时长、过渡窗函数类型与低频削减切点。"
    
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen-crossfade",
            "prompt": prompt,
            "stream": False
        }
    )
    result = response.json()
    return result.get("response", "")

if __name__ == "__main__":
    print("🎵 正在向本地定制 Qwen 专家模型请求音频过渡策略...")
    dsp_advice = get_crossfade_dsp_params(124.0, 128.0)
    print("\n[AI 专家过渡策略建议]:")
    print(dsp_advice)
</code></pre>

<h3>5. 🎓 大模型项目毕业设计：如何写进你的 CV 与学术成果？</h3>
<p>
  至此，你已经走完了现代大模型全栈研发的最硬核闭环：
  <strong>第一性原理源码研读（Karpathy 哲学） \(\to\) 云端免费 GPU 算力调配（Kaggle） \(\to\) 真实开源底座改造（Qwen-2.5 + LoRA） \(\to\) 物理权重合并与 Ollama 边缘部署 \(\to\) 赋能 Crossfade 跨学科科研工程</strong>。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🌟</span>学术竞赛 / 升学文书 / 招聘面试量化描述模板（STAR 原则）</h4>
  <ul>
    <li>
      <strong>背景（Situation）</strong>：针对跨学科音频数学建模（Crossfade）中通用大模型缺乏音频 DSP、时频能量守恒及等功率算法专业常识的问题；
    </li>
    <li>
      <strong>任务（Task）</strong>：在零硬件购买成本（仅利用云端 16GB 免费 T4 算力）约束下，实现顶尖开源大模型的高效微调与端侧低延迟部署闭环；
    </li>
    <li>
      <strong>行动（Action）</strong>：
      以开源 Qwen-2.5 为底座，利用 LoRA 低秩分解将可训练参数压缩至 0.1%（150 万参数）；
      构建专属音频过渡数学指令集执行 SFT 监督微调；
      推导矩阵加法完成权重物理融合（Merge and Unload），并通过 Ollama 运行时实现本地端侧私有化流式推理；
    </li>
    <li>
      <strong>结果（Result）</strong>：
      单次推理成本直接降为 0，端侧响应延迟低于 200ms，在针对交叉过渡声压塌陷及能量守恒问题的问答准度达 100%，完全贯通“大模型底座微调-边缘交付-工业算法联动”的全栈技术闭环。
    </li>
  </ul>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在微调完成后执行 <code>model.merge_and_unload()</code> 将 LoRA 权重与底座物理合并的最主要优势是：</p>
  <ul class="opts">
    <li>能够让模型参数量变成原来的两倍</li>
    <li data-ok>彻底消除推理时双路并行矩阵乘法与显存访存开销，使模型还原为标准的单体自包含架构，能够无缝兼容 Ollama、vLLM 等所有通用高性能推理引擎</li>
    <li>能够让模型不需要分词器直接识别人类语言</li>
    <li>可以将模型精度自动提升到 64-bit 浮点</li>
  </ul>
  <p class="why">
    合并前模型是“主干 + 旁路”的复杂组合结构；合并后增量直接融入主干权重，不再需要 PEFT 运行库，任何通用推理框架都能以最高效率单体加载。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在将微调后的 Qwen 模型导入本地 Ollama 运行时过程中，<code>Modelfile</code> 文件的核心作用是：</p>
  <ul class="opts">
    <li>用来向 Ollama 平台支付软件授权使用费</li>
    <li data-ok>声明基底模型权重的存储路径，并配置推理采样超参数（如 Temperature、Top-p）以及专属于项目的 System 人设提示词，将模型固化为一个独立可调用的本地服务</li>
    <li>用来自动联网下载 Python 解释器</li>
    <li>用来清空电脑显卡的全部缓存</li>
  </ul>
  <p class="why">
    Ollama 的 Modelfile 类似于 Dockerfile，它将底层权重路径、系统预设（System Prompt）和采样超参数统一打成一个标准模型镜像，供本地随时秒级拉起。
  </p>
</div>
`
});
