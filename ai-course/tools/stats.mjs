/* tools/stats.mjs - report course metrics used in READMEs (chapters, formulas, quizzes, terms, labs) */
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

let formulas = 0, display = 0, quizzes = 0, termSpans = 0, labs = 0, tables = 0, h3 = 0;
for (const it of items) {
  const b = it.body || '';
  formulas += (b.match(/(?<!\\)\\\(/g) || []).length + (b.match(/(?<!\\)\\\[/g) || []).length;
  display += (b.match(/(?<!\\)\\\[/g) || []).length;
  quizzes += (b.match(/class="quiz(?=["\s])/g) || []).length;
  termSpans += (b.match(/class="t" data-tterm/g) || []).length;
  labs += (b.match(/class="blk blk-lab"/g) || []).length;
  tables += (b.match(/<table class="tbl/g) || []).length;
  h3 += (b.match(/<h3>/g) || []).length;
}
const appA = items.find(i => i.id === 'appA');
let glossRows = 0;
for (const m of (appA?.body || '').matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)) {
  glossRows += (m[1].match(/<tr>/g) || []).length;
}
let appendixRows = 0;
for (const it of items.filter(i => i.part === 9)) {
  for (const m of (it.body || '').matchAll(/<tabular>([\s\S]*?)<\/tabular>/g)) void m;
}
const chapters = items.filter(i => /^(0[1-9]|[12][0-9])$/.test(String(i.num))).length;
const lectures = items.filter(i => /^\d+$/.test(String(i.num)) || i.num === '00' || i.num === 'P').length;
const appendices = items.filter(i => i.part === 9).length;

console.log(JSON.stringify({
  files: readdirSync(contentDir).filter(x => x.endsWith('.js')).length,
  modules: items.length,
  chapters, lectures,
  appendices,
  formulas, displayFormulas: display,
  quizzes, termSpans, glossaryRows: glossRows,
  labs, tables, h3,
  appendixTitles: items.filter(i => i.part === 9).map(i => `${i.num} ${i.title}`)
}, null, 2));
