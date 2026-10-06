import json

path = r'C:\Users\user2\.t3\userdata\providers\antigravity\a788ba1aa16a78b676d95b9655e3abb812f95f29db4cb606e395be1b79e8a152\antigravity-acp\brain\460bffec-cf55-4672-8aa6-e35abe881bd0\.system_generated\steps\392\output.txt'
with open(path, 'r', encoding='utf-8') as f:
    d = json.load(f)

threads = d.get('threads', [])
print(f'Total threads: {len(threads)}')
for t in threads:
    tid = t.get('threadId')
    status = t.get('status')
    title = t.get('title')
    model = t.get('model')
    print(f'[{status}] {tid} ({model}) : {title}')
