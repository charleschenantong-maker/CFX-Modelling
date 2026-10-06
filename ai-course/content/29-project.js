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
  在 Kaggle 上把 Qwen-2.5 微调完之后，剩下<strong>整个大模型课程的最后一步工程</strong>：
  <strong>把云端的微调产物搬到你自己电脑上，变成随时能离线调用的工具</strong>。
  做法是先用<strong>权重物理合并（Merge and Unload）</strong>把 LoRA 增量加回主干，再导入本机的 <strong>Ollama</strong> 运行时，
  得到一个懂 Crossfade 领域、不花 API 费用、断网也能跑的<strong>本地专属助手</strong>。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>工程实战路线：从云端训练到本地常驻</h4>
  <p>从云端到本地要走四步：</p>
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

<h3>1. 为什么要把 LoRA 权重合并回主干（Merge and Unload）？</h3>
<p>
  第 28 讲最后保存下来的，只是几兆字节的 LoRA 增量矩阵（\(\mathbf{A}\) 与 \(\mathbf{B}\)）。
  如果推理时每次都动态挂载 LoRA，就得分别算主干矩阵乘法和旁路矩阵乘法再相加，多出一份显存访存开销和推理延迟。
  常见做法是<strong>把低秩增量直接加回原权重矩阵</strong>：
</p>
\[ \mathbf{W}_{\text{merged}} = \mathbf{W}_0 + \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}) \]
<p>
  合并后适配器被吸收掉，模型又变成一个<strong>标准的单体 Transformer</strong>，任何通用推理引擎（Ollama、vLLM、TensorRT-LLM）都能直接加载，没有额外开销。
</p>

<h3>2. 逐行手写权重物理合并与导出代码</h3>
<p>
  接着第 28 讲的微调，在 Kaggle Notebook 里按“<strong>1~2 行代码 + 一段解析</strong>”的节奏完成合并与导出。
</p>

<h4>第一步：加载底座模型与微调后的 LoRA 适配器</h4>

<pre><code>from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
base_model_id = "Qwen/Qwen2.5-1.5B-Instruct"
lora_dir = "/kaggle/working/qwen-crossfade-lora"
</code></pre>
<p><strong>代码解析</strong>：指定原开源底座的 ID 和第 28 讲生成的 LoRA 权重路径。</p>

<pre><code>tokenizer = AutoTokenizer.from_pretrained(lora_dir)
base_model = AutoModelForCausalLM.from_pretrained(base_model_id, torch_dtype=torch.float16, device_map="cpu")
</code></pre>
<p><strong>代码解析</strong>：加载微调时保存的分词器；合并要同时装下底座和结果两份模型，GPU 显存放不下，所以用 <code>device_map="cpu"</code> 把底座以 FP16 加载到宿主机的 30GB 内存里。</p>

<pre><code>model = PeftModel.from_pretrained(base_model, lora_dir)
print("✅ 成功将 LoRA 适配器装载到底座模型拓扑结构中。")
</code></pre>
<p><strong>代码解析</strong>：用 <code>PeftModel.from_pretrained</code> 把保存的旁路矩阵挂到底座主干上。</p>

<h4>第二步：执行物理权重融合并卸载旁路</h4>

<pre><code>merged_model = model.merge_and_unload()
print("🎉 物理融合完毕！已将 LoRA 低秩矩阵严格按数学公式加回主干权重矩阵。")
</code></pre>
<p><strong>代码解析</strong>：<strong>关键一步</strong>：<code>merge_and_unload()</code> 把 \(\mathbf{W}_0 + \Delta \mathbf{W}\) 加回去，然后删掉低秩侧枝，对象重新变回干净的 <code>Qwen2ForCausalLM</code>。</p>

<pre><code>save_path = "/kaggle/working/qwen2.5-crossfade-merged"
merged_model.save_pretrained(save_path)
tokenizer.save_pretrained(save_path)
print(f"💾 合并后的完整独立大模型已成功持久化保存至: {save_path}")
</code></pre>
<p><strong>代码解析</strong>：把合并后的模型和分词器一起导出；文件夹里是完整的 <code>model.safetensors</code> 权重和配置文件，可以直接打包下载。</p>

<h3>3. 将改造后的模型导入本地 Ollama 运行时</h3>
<p>
  把合并后的权重下载到本机（笔记本或工作站）之后，用 <strong>Ollama</strong>（本地大模型运行时）分三步把它注册成一个常驻服务：
</p>

<dl class="kv">
  <dt>第一步：编写轻量定制 Modelfile</dt>
  <dd>在权重目录下新建一个名为 <code>Modelfile</code> 的文本文件，填入系统提示词和采样超参数：
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
  Ollama 会自动读取目录里的 safetensors 权重，在内部转换成 GGUF 格式，再注册进本地模型库。流程图里写的“导出 GGUF / Ollama”指的就是这一步：本讲没有单独跑 GGUF 转换命令，转换由 <code>ollama create</code> 一并完成（前提是 Ollama 支持该模型架构，Qwen2 在支持范围内）。
  </dd>
  <dt>第三步：在终端启动交互式对话</dt>
  <dd>
<pre><code>ollama run qwen-crossfade "分析两首 128 BPM 电子音乐在交叉过渡时的 EQ 衰减坡度。"
</code></pre>
  模型会在本地 CPU 或显卡上流式输出分析结果，不依赖网络，也没有 API 费用。
  </dd>
</dl>

<h3>4. 怎么在真实 Crossfade 项目代码中调用该模型？</h3>
<p>
  在你的 Crossfade 音频处理流水线（Python 项目）里，不用装额外依赖，直接调本地 REST 接口就行：
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
  到这里，现代大模型从原理到落地这条线你已经走完了一遍：
  <strong>读 Karpathy 源码打底 \(\to\) 用 Kaggle 的免费 GPU \(\to\) 改造开源底座（Qwen-2.5 + LoRA） \(\to\) 合并权重并部署到 Ollama \(\to\) 接到 Crossfade 项目里</strong>。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">🌟</span>学术竞赛 / 升学文书 / 招聘面试量化描述模板（STAR 原则）</h4>
  <ul>
    <li>
      <strong>背景（Situation）</strong>：针对跨学科音频数学建模（Crossfade）中通用大模型缺乏音频 DSP、时频能量守恒及等功率算法专业常识的问题；
    </li>
    <li>
      <strong>任务（Task）</strong>：在不买任何硬件（只用云端 16GB 免费 T4）的前提下，完成开源大模型的微调与端侧低延迟部署；
    </li>
    <li>
      <strong>行动（Action）</strong>：
       以开源 Qwen-2.5 为底座，利用 LoRA 低秩分解将可训练参数压缩至约 0.07%（约 109 万参数）；
      整理一套专属的音频过渡数学指令集，做 SFT 监督微调；
      用矩阵加法完成权重物理融合（Merge and Unload），再通过 Ollama 做本地流式推理；
    </li>
    <li>
      <strong>结果（Result）</strong>：
      单次推理成本降到 0，端侧响应延迟低于 200ms，交叉过渡声压塌陷与能量守恒问题的问答准度达 100%，把“底座微调—边缘交付—算法联动”这条链路走通了。
    </li>
  </ul>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在微调完成后执行 <code>model.merge_and_unload()</code> 将 LoRA 权重与底座物理合并的最主要优势是：</p>
  <ul class="opts">
    <li>能够让模型参数量变成原来的两倍</li>
    <li data-ok>省掉推理时双路并行矩阵乘法与显存访存开销，模型还原成标准的单体自包含架构，Ollama、vLLM 等通用推理引擎都能直接跑</li>
    <li>能够让模型不需要分词器直接识别人类语言</li>
    <li>可以将模型精度自动提升到 64-bit 浮点</li>
  </ul>
  <p class="why">
    合并前是“主干 + 旁路”的组合结构；合并后增量融进主干权重，不再需要 PEFT 运行库，任何通用推理框架都能直接加载。
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
    Ollama 的 Modelfile 类似 Dockerfile，把权重路径、系统提示词（System Prompt）和采样超参数打成一份标准模型定义，本地随时能拉起来跑。
  </p>
</div>
`
});
