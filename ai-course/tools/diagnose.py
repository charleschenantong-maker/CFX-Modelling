import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

course_files = sorted(glob.glob('content/[0-2][0-9]*.js'))

print(f"Total files: {len(course_files)}")

for cf in course_files:
    fname = os.path.basename(cf)
    with open(cf, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.splitlines()

    print(f"\n==========================================")
    print(f"FILE: {fname} ({len(lines)} lines)")
    print(f"==========================================")

    h3_matches = []
    for idx, line in enumerate(lines):
        m = re.search(r'<h3>(.*?)</h3>', line)
        if m:
            h3_matches.append((idx + 1, m.group(1).strip()))

    for i, (line_no, title) in enumerate(h3_matches):
        next_line_no = h3_matches[i+1][0] if i + 1 < len(h3_matches) else len(lines)
        section_lines = lines[line_no:next_line_no - 1]
        
        # Check first non-empty lines
        first_lines = [l.strip() for l in section_lines if l.strip()][:10]
        first_text = " ".join(first_lines)
        first_text_clean = re.sub(r'<[^>]+>', ' ', first_text)
        first_text_clean = re.sub(r'\s+', ' ', first_text_clean).strip()
        
        has_blk_m_early = any('blk-m' in l for l in first_lines[:3])
        has_quiz_early = any('quiz' in l for l in first_lines[:3])
        has_math_early = any(r'\[' in l or r'\(' in l for l in first_lines[:3])
        has_table_early = any('<table' in l for l in first_lines[:3])
        has_tip = any('blk-tip' in l for l in first_lines[:3]) or 'Notation Bridge' in first_text

        print(f"L{line_no:03d} | {title}")
        print(f"      [Flags: blk_m={has_blk_m_early}, quiz={has_quiz_early}, math={has_math_early}, tip={has_tip}]")
        print(f"      {first_text_clean[:140]}")
