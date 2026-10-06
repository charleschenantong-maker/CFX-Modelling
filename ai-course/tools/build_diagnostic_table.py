import glob
import os
import re
import sys

base_dir = r"D:\CFX Modelling\ai-course"
content_dir = os.path.join(base_dir, "content")

# All core curriculum files
files = sorted([f for f in os.listdir(content_dir) if re.match(r'^[0-2][0-9].*\.js$', f)])

out_lines = []

for fname in files:
    fpath = os.path.join(content_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    lines = content.splitlines()

    # Find all h3 tags and other key structural elements
    h3_list = []
    for idx, line in enumerate(lines):
        m = re.search(r'<h3>(.*?)</h3>', line)
        if m:
            h3_list.append((idx + 1, m.group(1).strip()))

    out_lines.append(f"\n========================================================")
    out_lines.append(f"MODULE: {fname} (Total lines: {len(lines)}, h3 count: {len(h3_list)})")
    out_lines.append(f"========================================================")

    for i, (line_no, title) in enumerate(h3_list):
        next_line = h3_list[i + 1][0] if i + 1 < len(h3_list) else len(lines)
        sec_lines = lines[line_no:next_line - 1]
        
        # Analyze first 15 lines of this section
        first_chunk = sec_lines[:15]
        first_chunk_text = "\n".join(first_chunk)

        # Detect elements in first chunk
        has_quiz = "quiz" in first_chunk_text
        has_blk_m = "blk-m" in first_chunk_text
        has_acc = "class=\"acc\"" in first_chunk_text
        has_tbl = "<table" in first_chunk_text
        has_tip = "blk-tip" in first_chunk_text
        has_disp_math = "\\[" in first_chunk_text
        has_inline_math = "\\(" in first_chunk_text
        has_code = "<pre>" in first_chunk_text or "<code>" in first_chunk_text

        # First paragraph content
        first_p = ""
        for l in sec_lines:
            if "<p>" in l:
                clean = re.sub(r'<[^>]+>', ' ', l).strip()
                if clean:
                    first_p = clean[:120]
                    break

        out_lines.append(f"L{line_no:04d} | {title}")
        out_lines.append(f"       structure: blk_m={has_blk_m}, quiz={has_quiz}, acc={has_acc}, tbl={has_tbl}, tip={has_tip}, math={has_disp_math or has_inline_math}")
        out_lines.append(f"       first_p: {first_p}")

report_path = os.path.join(base_dir, "scratch", "h3_structure_audit.txt")
os.makedirs(os.path.dirname(report_path), exist_ok=True)
with open(report_path, "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))

print(f"Report generated at {report_path}")
