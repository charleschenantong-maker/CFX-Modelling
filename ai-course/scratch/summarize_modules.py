import glob
import re
import os

files = sorted(glob.glob('content/*.js'))
modules = []

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    mod_id = re.search(r'id:\s*["\']([^"\']+)["\']', c)
    mod_num = re.search(r'num:\s*["\']([^"\']+)["\']', c)
    mod_title = re.search(r'title:\s*["\']([^"\']+)["\']', c)
    mod_part = re.search(r'part:\s*["\']([^"\']+)["\']', c)
    
    h3s = re.findall(r'<h3>(.*?)</h3>', c)
    h3s_clean = [re.sub(r'<[^>]+>', '', h).strip() for h in h3s]
    
    modules.append({
        'file': os.path.basename(f),
        'id': mod_id.group(1) if mod_id else '',
        'num': mod_num.group(1) if mod_num else '',
        'part': mod_part.group(1) if mod_part else '',
        'title': mod_title.group(1) if mod_title else '',
        'h3s': h3s_clean,
        'size': len(c),
    })

with open('scratch/modules_summary.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total modules: {len(modules)}\n\n")
    for m in modules:
        out.write(f"[{m['part']}] #{m['num']} {m['title']} ({m['file']}) - {len(m['h3s'])} h3s\n")
        for h in m['h3s']:
            out.write(f"    - {h}\n")
        out.write("\n")

print("Saved to scratch/modules_summary.txt")
