/* tools/formula-count.mjs - count math spans the same way validate.mjs does */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '..', 'content');
const items = [];
const ctx = vm.createContext({ window: {}, COURSE: { items, register: o => items.push(o) } });
const fileOf = new Map();
for (const f of readdirSync(contentDir).filter(x => x.endsWith('.js')).sort()) {
  const before = items.length;
  vm.runInContext(readFileSync(join(contentDir, f), 'utf8'), ctx, { filename: f });
  for (let i = before; i < items.length; i++) fileOf.set(items[i], f);
}

function mathSpans(html) {
  const scrubbed = html.replace(/<pre[\s\S]*?<\/pre>/gi, ' ').replace(/<code[\s\S]*?<\/code>/gi, ' ');
  const re = /(\\+)([()\[\]])/g;
  let m, open = null, inline = 0, disp = 0, bad = 0;
  while ((m = re.exec(scrubbed))) {
    if (m[1].length % 2 === 0) continue;
    const ch = m[2];
    if (ch === '(' || ch === '[') {
      if (open) { bad++; if (open.display) disp++; else inline++; }
      open = { start: re.lastIndex, display: ch === '[' };
    } else {
      if (!open || (open.display ? ch !== ']' : ch !== ')')) { bad++; continue; }
      if (open.display) disp++; else inline++;
      open = null;
    }
  }
  if (open) { bad++; if (open.display) disp++; else inline++; }
  return { inline, disp, bad };
}

let ti = 0, td = 0, bad = 0;
const rows = [];
for (const it of items) {
  const r = mathSpans(it.body || '');
  ti += r.inline; td += r.disp; bad += r.bad;
  rows.push([it.num, r.inline, r.disp, r.bad]);
}
console.log('inline', ti, 'display', td, 'total', ti + td, 'unpaired', bad);
console.log('per-module with unpaired>0:', rows.filter(r => r[3] > 0).map(r => `${r[0]}:${r[3]}`).join(' ') || '(none)');
