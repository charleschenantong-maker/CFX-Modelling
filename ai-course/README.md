# LLM 底座与训练全栈 · 交互式课程

写给**数学系申请者**的一门 LLM 入门课：从 next-token prediction 的概率分解，一路走到预训练、对齐、
推理部署、算力与订阅经济学、多线程智能体舰队，最后全部接回
《Mathematical Crossfade Modelling for Glass Player》研究指南的八个检查点。

![课程预览](preview.png)

## 打开方式

直接双击 **`index.html`** 即可（Chrome / Edge / Firefox 均可）。所有依赖都已本地化，
**离线可用**：KaTeX 数学渲染器与 20 个字体文件已放在 `assets/katex/`。

如果浏览器对本地文件限制较严，也可以起一个静态服务：

```powershell
# 在 ai-course 目录下
python -m http.server 8000
# 然后访问 http://localhost:8000/
```

## 内容规模

| 项 | 数量 |
|---|---|
| 模块 | 22 个（17 个正文模块 + 5 个附录） |
| 正文 | 约 6,200 行 HTML，约 500 KB |
| 自测题 | 79 道（点选即时判定 + 解析） |
| 术语 | 240 条（中英对照，分为 14 类） |
| 动手实验 | 22 处（附录 B 有 8 个完整 Colab 实验） |
| 数学公式 | 全站 KaTeX 渲染，离线可用 |

## 结构

| 部分 | 模块 | 内容 |
|---|---|---|
| **0 导读** | 00 | 课程用法、资源盘点、12 周节奏 |
| **I 底座** | 01–05 | 语言模型的概率本质、Tokenizer 与数据、注意力机制、Transformer 解剖（参数量/FLOPs/显存）、预训练全流程 |
| **II 训练与推理** | 06–09 | 数据并行/FSDP/张量并行（含 JAX 写法）、SFT→DPO→GRPO 全谱系（对应 TRL）、推理量化与部署、评估与科研方法 |
| **III 算力** | 10 | Colab / Kaggle / HF 上能跑什么、环境纪律 |
| **IV 经济与基础设施** | 11–15 | 订阅套利经济学、住宅 IP 与本地代理架构、重置动力学、85/15 工作流与多线程舰队、硬件与操作系统瓶颈 |
| **V 收束** | 16 | 八个检查点映射、Checkpoint 7 完整方案、申请叙事与 viva 防御问题 |
| **附录** | A–E | 术语表、Colab 实验手册（E1–E8）、资源地图、合规与学术诚信、综合自测（20 题 + 3 开放题） |

## 交互功能

- **左侧目录**：随滚动高亮；点「标记为已读完」记录进度（存浏览器本地）
- **搜索**（快捷键 `/`）：搜标题、正文与公式，`↑` `↓` 选择、`Enter` 跳转
- **自测题**：答对显示成功动画，答错抖动并展开解析
- **术语悬浮**：带虚线下划线的词悬停显示中英对照定义
- **折叠深入**：灰色「深入」区块承载第二层内容，打印时自动全部展开
- **计算器**：模块 04 的显存估算器、模块 11 的订阅套利计算器
- **明暗主题**：右上角切换；也可用链接指定，例如 `index.html?theme=light`
- **打印 / 导出 PDF**：右上角按钮（会自动展开所有折叠内容）

## 验证状态

- 全部 22 个内容文件通过 `node --check` 语法检查
- 在 headless Chrome 中做过 20 项交互自检（导航、KaTeX、自测对/错、折叠、搜索、计算器、主题、术语悬浮、进度标记），
  禁用过渡后 **20/20 通过**；未禁用时两项动画态断言因 headless 虚拟时钟不推进 CSS 过渡而无法测量，非页面缺陷
- 用真实浏览器打开即可获得完整动效（动效 tokens 采用 transitions.dev 的时长/缓动刻度，并带 `prefers-reduced-motion` 适配）

## 目录

```
ai-course/
  index.html              单页课程（外壳 + 样式 + 交互引擎）
  content/                22 个内容模块（经典 <script> 按顺序加载）
    00-orientation.js ... 16-project.js
    90-appendix-a-glossary.js ... 94-appendix-e-exam.js
  assets/katex/           离线数学渲染（katex.min.js/css + 20 个字体）
  preview.png             首页预览
```

## 内容来源

- Hugging Face [TRL 文档](https://huggingface.co/docs/trl/index)（各 trainer、数据集格式、CLI、集成）
- [Hugging Face Learn](https://huggingface.co/learn)（LLM / Agents 课程）
- [JAX AI Stack · Train a miniGPT language model with JAX](https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html)
  （Flax NNX + Optax + Grain，Mesh/PartitionSpec，TPU v5e-8）
- [Google Colab 入门 notebook](https://colab.research.google.com/notebooks/intro.ipynb)
- Theo 关于订阅套利、反封禁网络架构、重置动力学与多线程工作流的访谈记录（第 11–15 模块，
  数值为量级参考，不是任何平台的报价承诺）
- 你的《Mathematical Crossfade Modelling for Glass Player》研究指南（第 16 模块的八个检查点映射）

## 合规提示

第 11–12 模块与附录 D 描述的是**个人订阅与自托管代理的工程与经济学**。
个人订阅用于个人编码与内部自动化是常见做法；把个人订阅额度接到面向公众的生产流量、
转售额度或用于模型蒸馏会违反服务条款。平台政策持续变化，
**请以各平台最新官方条款为准**，并自行承担配置后果。
