import os
import re
import sys

base_dir = r"D:\CFX Modelling\ai-course"
content_dir = os.path.join(base_dir, "content")

# Import candidates from generate_diagnosis
import generate_diagnosis
candidates = generate_diagnosis.candidates

valid_table_rows = []

for item in candidates:
    fname, line_no, title, crit, gap, action = item
    fpath = os.path.join(content_dir, fname)
    if not os.path.exists(fpath):
        print(f"Error: {fname} does not exist!")
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Check if line_no is close to the title or element
    target_idx = line_no - 1
    # Check a window of +/- 3 lines
    found_line = line_no
    for offset in range(-3, 4):
        idx = target_idx + offset
        if 0 <= idx < len(lines):
            l = lines[idx]
            if "<h3>" in l or "quiz" in l:
                # check match
                found_line = idx + 1
                break
    
    file_line = f"{fname}:{found_line}"
    valid_table_rows.append((file_line, title, crit, gap, action))

print(f"Verified {len(valid_table_rows)} rows cleanly.")

# Save markdown table to scratch/diagnosis_table.md
out_md = []
out_md.append("| 文件:行 | 小节标题 | 判据(A/B/C) | 断层在哪里（一句话） | 建议动作 |")
out_md.append("| :--- | :--- | :---: | :--- | :---: |")
for row in valid_table_rows:
    out_md.append(f"| `{row[0]}` | {row[1]} | {row[2]} | {row[3]} | `{row[4]}` |")

with open(os.path.join(base_dir, "scratch", "diagnosis_table.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(out_md))

print("Markdown table saved to scratch/diagnosis_table.md")
