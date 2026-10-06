import glob
import os
import re
import sys

base_dir = r"D:\CFX Modelling\ai-course"
content_dir = os.path.join(base_dir, "content")

files = sorted([f for f in os.listdir(content_dir) if re.match(r'^[0-2][0-9].*\.js$', f)])

audit_results = []

for fname in files:
    fpath = os.path.join(content_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    lines = content.splitlines()

    # Find h3 lines
    h3_indices = []
    for idx, l in enumerate(lines):
        if "<h3>" in l:
            m = re.search(r'<h3>(.*?)</h3>', l)
            title = m.group(1).strip() if m else l.strip()
            h3_indices.append((idx + 1, title))

    # Also check pre-h3 quiz (e.g. 01-language-models line 17)
    for idx, l in enumerate(lines[:60]):
        if '<div class="quiz' in l and (not h3_indices or idx + 1 < h3_indices[0][0]):
            audit_results.append({
                "file": fname,
                "line": idx + 1,
                "title": "前置自测（小节 1 之前）",
                "crit": "B",
                "gap": "在未讲解 Softmax 与交叉熵公式前，直接要求手算 -ln(0.5)≈0.693 基准损失",
                "action": "调顺序"
            })

    for i, (line_no, title) in enumerate(h3_indices):
        next_line_no = h3_indices[i + 1][0] if i + 1 < len(h3_indices) else len(lines)
        sec_lines = lines[line_no:next_line_no - 1]
        sec_text = "\n".join(sec_lines[:30])

        # Analyze features
        starts_with_blk_m = any("blk-m" in l for l in sec_lines[:4])
        starts_with_formula = any(r"\\[" in l for l in sec_lines[:6])
        starts_with_table = any("<table" in l for l in sec_lines[:4])
        starts_with_quiz = any("quiz" in l for l in sec_lines[:4])
        has_lead_p = any(l.strip().startswith("<p>") for l in sec_lines[:4])
        first_p = ""
        for l in sec_lines:
            if "<p>" in l:
                clean = re.sub(r'<[^>]+>', ' ', l).strip()
                if clean:
                    first_p = clean
                    break

        # Check existing bridges
        has_tip = "blk-tip" in sec_text[:400]
        has_bridge_kw = any(kw in sec_text[:300] for kw in ["Notation Bridge", "记号铺垫", "先看结论", "一句话直觉", "读前须知", "先回答一个工程问题", "知识地图"])

        audit_results.append({
            "file": fname,
            "line": line_no,
            "title": title,
            "starts_blk_m": starts_with_blk_m,
            "starts_formula": starts_with_formula,
            "starts_table": starts_with_table,
            "starts_quiz": starts_with_quiz,
            "has_tip": has_tip,
            "has_bridge": has_bridge_kw,
            "first_p": first_p[:100],
            "sec_text_snippet": sec_text[:300]
        })

print(f"Total sections scanned: {len(audit_results)}")
