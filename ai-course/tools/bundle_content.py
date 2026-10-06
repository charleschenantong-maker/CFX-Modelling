import os

files = [
  # Part 0: 心法
  "content/00-orientation.js",
  "content/00b-primer.js",
  # Part 1: 底座原理
  "content/01-language-models.js",
  "content/02-tokenization.js",
  "content/03-attention.js",
  "content/04-transformer.js",
  "content/05-pretraining.js",
  # Part 2: 训练与推理原理
  "content/06-parallelism.js",
  "content/07-finetuning.js",
  "content/08-inference.js",
  "content/09-evaluation.js",
  # Part 3: 真实大模型架构与系统工程 (10 - 15)
  "content/10-compute.js",
  "content/11-data-engineering.js",
  "content/12-moe.js",
  "content/13-long-context.js",
  "content/14-compression.js",
  "content/15-inference-serving.js",
  # Part 4: 能力拓展、前沿方向与研讨 (16 - 22)
  "content/16-distillation.js",
  "content/17-reasoning.js",
  "content/18-rag.js",
  "content/19-agents.js",
  "content/20-safety.js",
  "content/21-architectures.js",
  "content/22-consciousness.js",
  # Part 5: 个人算力、实战与项目收束 (23 - 29)
  "content/23-economics.js",
  "content/24-network.js",
  "content/25-resets.js",
  "content/26-workflow.js",
  "content/27-hardware.js",
  "content/28-kaggle-training.js",
  "content/29-project.js",
  # Part 9: 附录 (90 - 96)
  "content/90-appendix-a-glossary.js",
  "content/91-appendix-b-labs.js",
  "content/92-appendix-c-resources.js",
  "content/93-appendix-d-compliance.js",
  "content/94-appendix-e-exam.js",
  "content/95-appendix-f-cheatsheet.js",
  "content/96-appendix-g-ai-fluency.js"
]

out = ["/* COURSE BUNDLE: Auto-generated all-in-one ultra-fast bundle */\n"]
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    out.append(f"/* --- {f} --- */\n" + c + "\n")

bundle_text = "".join(out)
os.makedirs('assets', exist_ok=True)
with open('assets/course-bundle.js', 'w', encoding='utf-8') as fp:
    fp.write(bundle_text)

print(f"Bundled {len(files)} files into assets/course-bundle.js ({len(bundle_text)/1024:.1f} KB)")
