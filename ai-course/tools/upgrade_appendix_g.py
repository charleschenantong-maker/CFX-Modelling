# -*- coding: utf-8 -*-
import re

path = 'ai-course/content/96-appendix-g-ai-fluency.js'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

blocks = list(re.finditer(r'<pre><code>([\s\S]*?)</code></pre>', c))
m = blocks[1]
start, end = m.span(1)

new_code = """<span class="cm"># [逐行剖析] 配对符号检验 (Sign Test) 离散二项分布双尾精确 p 值计算</span>
from math import comb
<span class="cm"># 1. 剔除平局 (Tie) 后的有效配对对比总次数 n_eff</span>
n_eff = 7
<span class="cm"># 2. 新策略 v2 胜出的离散观测频次 k</span>
k = 6
<span class="cm"># 3. 计算双尾 p 值: 2 * sum_{i=k}^{n} C(n, i) * (0.5)^n</span>
p = 2 * sum(comb(n_eff, i) for i in range(k, n_eff + 1)) / (2 ** n_eff)
print(f"双尾显著性检验 p 值 = {round(p, 3):.3f}")  <span class="cm"># 检验在 alpha=0.05 下是否具备统计学泛化显著性</span>"""

c_new = c[:start] + new_code + c[end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(c_new)
print('Appendix G upgraded successfully.')
