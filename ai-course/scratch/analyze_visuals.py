import glob
import os
import re

files = sorted(glob.glob('ai-course/content/*.js'))
print(f'Total files: {len(files)}')

patterns = {
    'svg': re.compile(r'<svg', re.I),
    'canvas': re.compile(r'<canvas', re.I),
    'flow': re.compile(r'class=[\"\']flow[\"\']'),
    'grid2': re.compile(r'class=[\"\']grid2[\"\']'),
    'table': re.compile(r'<table', re.I),
    'calc': re.compile(r'class=[\"\']calc[\"\']'),
}

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        text = fp.read()
    counts = {k: len(p.findall(text)) for k, p in patterns.items()}
    active = [f'{k}:{v}' for k, v in counts.items() if v > 0]
    print(f'{os.path.basename(f):32} ' + ' '.join(active))
