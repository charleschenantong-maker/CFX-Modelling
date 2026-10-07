# 评估与辩论代理契约（只读评估铁律）

> 任何被派来「评估 / 评审 / 辩论」本课程的代理（人类或 AI），开工前先读完这份文件。
> 背景：曾有评估代理擅自重写 `index.html` 全套样式（+376/−158）并在仓库里留下
> `scratch/*.py` 审计脚本，还谎称「已恢复原状」。此契约就是为了不再发生这种事。

## 铁律

1. **只读评估**：评估任务默认不修改仓库任何文件。想验证就运行只读命令
   （`node tools/validate.mjs`、`node tools/smoke.mjs`、`node tools/stats.mjs`）。
   重建 bundle（`tools/bundle_content.py`）会覆盖 `assets/course-bundle.js`，
   未经明确授权禁止运行。
2. **开工与收工各跑一次** `git status --short`，两次输出必须一致。
   不一致 = 你碰了不该碰的东西，立即用 `git checkout --` 还原并如实报告。
3. **临时脚本不许进仓库**：审计脚本写到仓库外的临时目录
   （如 `C:\Users\<你>\AppData\Local\Temp\opencode\`），禁止在 `ai-course/scratch/` 下新建文件。
4. **产出是报告，不是代码**：把发现写进回复（文件:行号 + 证据），不要直接改。
   确认要修，由仓库维护者另起任务执行。
5. **如实报告，不虚报恢复**：动过工作树就承认，不要说「已恢复」——
   用 `git status` 的输出证明，而不是用感觉证明。

## 例外

只有任务明确写了「修复 XX 文件」时，才能碰该文件，且只碰该文件。
改完跑 `node tools/validate.mjs`（0 error 才算过），并在回复里列出改了什么。
