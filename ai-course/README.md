# LLM 底座与训练全栈 · 交互式课程（通读 + 速查）

写给**数学系申请者**的一门 LLM 入门课：从 next-token prediction 的概率分解，一路走到预训练、对齐、
推理部署、算力与订阅经济学、多线程智能体舰队，并给出与《Mathematical Crossfade Modelling for Glass Player》
研究指南的**并行推进方案**。

它被设计成两种用法：

| 阶段 | 怎么用 |
|---|---|
| **第一次：通读**（约 6–10 小时） | 按 00 → P → 01 → … → 16 顺序读，每讲做自测；零基础务必先读 **P 预备课** |
| **之后：当手册查**（每次 1–3 分钟） | 顶部搜索（`/`）、[附录 F 速查手册](ai-course/content/95-appendix-f-cheatsheet.js)、[附录 A 术语表](ai-course/content/90-appendix-a-glossary.js)、每讲顶部的「本讲速查」 |

![课程预览](preview.png)

## 打开方式

直接双击 **`index.html`** 即可（Chrome / Edge / Firefox 均可）。所有依赖都已本地化，
**离线可用**：KaTeX 数学渲染器与 20 个字体文件已放在 `assets/katex/`。

```powershell
# 如果浏览器对本地文件限制较严，也可以起一个静态服务
python -m http.server 8000     # 在 ai-course 目录下执行，然后访问 http://localhost:8000/
```

## 内容规模

| 项 | 数量 |
|---|---|
| 模块 | **24** 个（18 讲 + 6 个附录） |
| 正文 | 约 7,600 行 HTML / 约 560 KB |
| 自测题 | 80+ 道（点选即时判定 + 解析） |
| 术语 | 240 条中英对照（14 类）+ 8 组易混概念对比 |
| 动手实验 | 22 处（附录 B 有 8 个完整 Colab 实验） |
| 速查表 | 附录 F 七张（公式 / 数字 / TRL / 超参 / 选型 / 额度 / 命令 / 排错） |
| 数学公式 | 全站 KaTeX 渲染，离线可用 |

## 结构

| 部分 | 模块 | 内容 |
|---|---|---|
| **0 导读** | 00 | 资源盘点（按真实订阅）、两种用法、12 周节奏 |
| **0 预备** | **P** | **零基础预备课**：概率预测 → 神经网络 → 损失 → 梯度下降 → 训练循环，全部手算 |
| **I 底座** | 01–05 | 语言模型的概率本质、Tokenizer 与数据、注意力机制、Transformer 解剖、预训练全流程 |
| **II 训练与推理** | 06–09 | 并行训练（含 JAX）、SFT→DPO→GRPO 全谱系（对应 TRL）、量化与部署、评估与科研方法 |
| **III 算力** | 10 | Colab 计算单元 / Kaggle TPU / HF，以及 Colab 的三条硬规则 |
| **IV 经济与基础设施** | 11–15 | **$20 档订阅经济学**、住宅 IP 与本地代理、重置动力学、85/15 工作流与多线程舰队、硬件瓶颈 |
| **V 收束** | 16 | 两条并行轨道、CP7 完整方案、申请叙事与 viva 问题 |
| **附录** | A–F | 术语表、Colab 实验手册（E1–E8）、资源地图、合规与学术诚信、综合自测、**速查手册** |

## 交互与速查功能

- **本讲速查**：每讲顶部的可展开小节目录，一键跳转
- **搜索**（`/`）：搜标题、正文与公式，`↑` `↓` 选择、`Enter` 跳转
- **自测题**：答对显示成功动画，答错抖动并展开解析
- **术语悬浮**：带虚线下划线的词悬停显示中英对照定义
- **计算器**：显存估算器（04）、订阅等效价值计算器（11）
- **回到顶部**、**明暗主题**（`?theme=light` 可指定）、**打印/导出 PDF**（自动展开折叠内容）

## 关于订阅额度（已按官方文档核实）

课程中的额度数据取自官方页面，并明确区分档位——网上流传的「$200 换 $8000 推理」属于 **$200 档**，
不适用于 **$20 档**：

- **Codex Plus（$20/月）**：与「工作」共享额度池，5 小时 + 每周双重窗口；
  官方给出的每 5 小时估算条数：GPT-6 Astra 5–45、Sol 10–100、Terra 25–200、Luna 250–2000
  （[OpenAI 帮助中心](https://help.openai.com/zh-hans-cn/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex)）
- **Claude Pro（$20/月）**：5 小时 + 每周窗口，按「用量」计量，用 `/usage` 查看；
  2026-09-14 起周上限永久比促销前高 25%
  （[Claude 帮助中心](https://support.claude.com/en/articles/15910845-claude-code-may-august-2026-weekly-limits-promotion)）
- **Google AI Pro**：自 2026-09-22 起包含 Colab 计算单元与更强 GPU/TPU，Ultra 档支持后台连续执行
  （[Google 开发者博客](https://developers.googleblog.com/en/colab-is-now-part-of-your-google-ai-plan/)）

**合规提醒**：Colab 明确禁止「用多个账号规避访问或资源用量限制」，因此三个 Google AI Pro 账号
应按用途分开，而不是合并成一个额度池；个人订阅也不得承载面向公众的流量。

## 验证状态

- 全部 24 个内容文件通过 `node --check` 语法检查
- 全站数学公式已清除「中文放进 `\text{}`」的问题（KaTeX 字体不含中文字形，会显示成方块）
- 在 headless Chrome 中做过交互自检（导航、KaTeX、自测对/错、折叠、搜索、计算器、主题、术语悬浮、
  进度标记、本讲速查、回到顶部）；禁用过渡后全部通过（未禁用时动画态断言因 headless 虚拟时钟不推进 CSS 过渡而无法测量）

## 内容来源

- Hugging Face [TRL 文档](https://huggingface.co/docs/trl/index)、[Hugging Face Learn](https://huggingface.co/learn)
- [JAX AI Stack · Train a miniGPT language model with JAX](https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html)
- [Google Colab 入门 notebook](https://colab.research.google.com/notebooks/intro.ipynb) 与 [Colab FAQ](https://research.google.com/colaboratory/faq.html)
- OpenAI / Anthropic / Google 官方帮助中心（额度与政策，见上文链接）
- Theo 关于订阅套利、反封禁网络架构、重置动力学与多线程工作流的访谈记录
  （第 11–15 讲；其中 $200 档的数字已在模块 11 中逐条标注适用范围）
- 你的《Mathematical Crossfade Modelling for Glass Player》研究指南（模块 16 的并行轨道方案）
