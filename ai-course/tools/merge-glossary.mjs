/* tools/merge-glossary.mjs - append _glossary/<num>.md rows into appendix A section 15,
 * converting the markdown pipe rows into real <tr><td>..</td></tr> HTML.
 * Run with --fix to rewrite an already-broken merge.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const courseDir = resolve(here, '..');
const glDir = join(courseDir, '_glossary');
const target = join(courseDir, 'content', '90-appendix-a-glossary.js');

const order = ['17', '18', '19', '20', '21', '22', '23', '24', '25', 'G'];
function mdRowToHtml(line) {
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  if (cells.length !== 3) throw new Error('expected 3 cells: ' + line.slice(0, 60));
  return `    <tr><td>${cells[0]}</td><td>${cells[1]}</td><td>${cells[2]}</td></tr>`;
}

const rows = [];
for (const num of order) {
  const lines = readFileSync(join(glDir, `${num}.md`), 'utf8').split(/\r?\n/);
  const body = lines.filter(l => l.startsWith('|') && !/^\|\s*中文术语/.test(l) && !/^\|[\s\-|]+\|$/.test(l));
  rows.push(...body.map(mdRowToHtml));
  console.log(`${num}.md -> ${body.length} rows`);
}

let src = readFileSync(target, 'utf8');
const blockRe = /(  <!-- 高级章（17–24）与附录 G 新增术语 -->\r?\n)  <tbody>[\s\S]*?  <\/tbody>\r?\n/;
if (!blockRe.test(src)) { console.error('existing block not found'); process.exit(1); }
src = src.replace(blockRe, (_m, comment) =>
  comment + '  <tbody>\r\n' + rows.join('\r\n') + '\r\n  </tbody>\r\n');

src = src.replace(/<strong>\d+ 条<\/strong>（其中 \d+ 条是.*?补的）/, `<strong>${294 + rows.length} 条</strong>（其中 ${rows.length} 条是为 17–25 章与附录 G 补的）`);
src = src.replace(/<h3>15\. 高阶与前沿（Advanced and frontier，对应 17–24 章）<\/h3>/, '<h3>15. 高阶与前沿（Advanced and frontier，对应 17–25 章）</h3>');

writeFileSync(target, src, 'utf8');
console.log(`rewrote block with ${rows.length} HTML rows (total ${294 + rows.length} terms)`);
