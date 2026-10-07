import glob
import os
import re

files = sorted(glob.glob('content/*.js'))
print(f'Total files: {len(files)}')

patterns = {
    'svg': re.compile(r'<svg', re.I),
    'canvas': re.compile(r'<canvas', re.I),
    'flow': re.compile(r'class=["\']flow["\']'),
    'grid': re.compile(r'class=["\']grid2["\']'),
    'table': re.compile(r'<table', re.I),
    'quiz': re.compile(r'class=["\']quiz["\']'),
    'acc': re.compile(r'class=["\']acc["\']'),
    'input': re.compile(r'<input|<button', re.I),
    'slider': re.compile(r'type=["\']range["\']', re.I),
    'chart': re.compile(r'chart|plot|graph', re.I),
    'interactive': re.compile(r'interactive|slider|calc|demo', re.I),
}

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        text = fp.read()
    counts = {k: len(p.findall(text)) for k, p in patterns.items()}
    active = [f'{k}:{v}' for k, v in counts.items() if v > 0]
    print(f'{os.path.basename(f):32} ' + ' '.join(active))
