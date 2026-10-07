import glob
import re

for f in sorted(glob.glob('content/*.js')):
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    calcs = re.findall(r'<div class=["\']calc["\'][^>]*>', c)
    inputs = re.findall(r'<input[^>]*>', c)
    buttons = re.findall(r'<button[^>]*>', c)
    if calcs or inputs or buttons:
        print(f"{f}: calcs={calcs}, inputs={len(inputs)}, buttons={len(buttons)}")
