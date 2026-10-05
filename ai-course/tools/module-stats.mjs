/* tools/module-stats.mjs - per-module metrics for README/report numbers */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '..', 'content');
const items = [];
const ctx = vm.createContext({ window: {}, COURSE: { items, register: o => items.push(o) } });
for (const f of readdirSync(contentDir).filter(x => x.endsWith('.js')).sort()) {
  vm.runInContext(readFileSync(join(contentDir, f), 'utf8'), ctx, { filename: f });
}
let quiz = 0, lab = 0, chars = 0, disp = 0, inline = 0;
const appA = items.find(i => i.id === 'appA');
let terms = 0;
for (const m of (appA?.body || '').matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)) terms += (m[1].match(/<tr>/g) || []).length;
for (const it of items) {
  const b = it.body || '';
  quiz += (b.match(/class="quiz"/g) || []).length;
  lab += (b.match(/class="blk blk-lab"/g) || []).length;
  chars += b.replace(/<[^>]*>/g, '').length;
  disp += (b.match(/(?<!\\)\\\[/g) || []).length;
  inline += (b.match(/(?<!\\)\\\(/g) || []).length;
}
console.log(JSON.stringify({
  modules: items.length,
  lectures: items.filter(i => /^\d+$/.test(String(i.num)) && i.num !== '00' && i.num !== 'P').length,
  appendices: items.filter(i => i.part === 9).length,
  quiz, lab, terms,
  formulas: inline + disp, displayFormulas: disp,
  plainTextChars: chars,
  plainTextWan: (chars / 10000).toFixed(1)
}, null, 1));
