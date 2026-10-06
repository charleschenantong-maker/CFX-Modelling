/* tools/validate.mjs - static content validator for the LLM crash course.
 *
 *   node ai-course/tools/validate.mjs [--json] [--quiet]
 *
 * Why static: this sandbox blocks launching Chrome (crashpad needs named pipes),
 * so there is no headless-DOM check. Instead each content/*.js is evaluated in a
 * vm sandbox with a fake COURSE.register, then the captured HTML bodies are
 * checked structurally. That catches the regressions we actually care about:
 * broken HTML nesting, unpaired math delimiters, CJK inside formulas, quiz
 * answer-key errors, table column drift, dead internal anchors, and unknown
 * CSS classes.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const courseDir = resolve(here, '..');
const contentDir = join(courseDir, 'content');
const asJson = process.argv.includes('--json');
const quiet = process.argv.includes('--quiet');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const onlyIds = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean)) : null;

/* ---------------- load modules ---------------- */
const files = readdirSync(contentDir).filter(f => f.endsWith('.js')).sort();
const items = [];
const ctx = vm.createContext({
  window: {},
  COURSE: { items, register(o) { items.push(o); } },
  console
});
const loadErrors = [];
const fileLines = new Map();
const itemFile = new Map();
for (const f of files) {
  const src = readFileSync(join(contentDir, f), 'utf8');
  fileLines.set(f, src.split('\n').length);
  const before = items.length;
  try { vm.runInContext(src, ctx, { filename: f }); }
  catch (e) { loadErrors.push(`${f}: ${e.message}`); }
  for (let i = before; i < items.length; i++) itemFile.set(items[i], f);
}

/* ---------------- helpers ---------------- */
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const ALLOWED_CLASSES = new Set([
  'blk', 'blk-tip', 'blk-q', 'blk-m', 'blk-lab', 'blk-warn', 'blk-eco',
  'tbl', 'small', 'flow', 'nd', 'hi', 'ar', 'col', 'grid2', 'card', 'kv',
  'acc', 'acc-body', 'quiz', 'qlabel', 'q', 'opts', 'why', 'quiz-blank', 'blank-wrap', 'blank-input', 'blank-btn', 'blank-feedback',
  't', 'cm', 'kw', 'st', 'calc', 'lead', 'callout', 'pill', 'ic'
]);
// classes that exist in index.html CSS but are not part of the content DSL:
// seeing them in content is a warning, not an error.
const SOFT_CLASSES = new Set(['hint', 'fields', 'out', 'row', 'mono', 'grow', 'badge', 'open']);

const errors = [];
const warnings = [];
const statLines = [];
const stats = {
  files: files.length, modules: items.length,
  formulas: 0, displayFormulas: 0, quizzes: 0, terms: 0, labs: 0,
  tables: 0, accordions: 0, h3: 0, blockSections: 0,
  glossaryRows: 0, characters: 0
};

function err(mod, msg) { errors.push(`[${mod}] ${msg}`); }
function warn(mod, msg) { warnings.push(`[${mod}] ${msg}`); }

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/* collect math spans (ignoring code blocks). Delimiters are \( \) and \[ \];
 * a backslash that is itself escaped (\\( ) is not a delimiter. */
function extractMath(html) {
  const scrubbed = html.replace(/<pre[\s\S]*?<\/pre>/gi, ' ').replace(/<code[\s\S]*?<\/code>/gi, ' ');
  const found = [];
  const unmatched = { inline: 0, display: 0, strayClose: 0 };
  const re = /(\\+)([()\[\]])/g;
  let m, open = null;
  while ((m = re.exec(scrubbed))) {
    if (m[1].length % 2 === 0) continue;              // escaped backslash -> literal text
    const ch = m[2];
    if (ch === '(' || ch === '[') {
      if (open) { unmatched[open.display ? 'display' : 'inline']++; found.push({ tex: '(', display: false }); }
      open = { start: re.lastIndex, display: ch === '[' };
    } else {
      if (!open || (open.display ? ch !== ']' : ch !== ')')) { unmatched.strayClose++; continue; }
      found.push({ tex: scrubbed.slice(open.start, m.index), display: open.display });
      open = null;
    }
  }
  if (open) unmatched[open.display ? 'display' : 'inline']++;
  return { found, unmatched };
}

function balances(s) {
  const pairs = { '{': '}', '[': ']', '(': ')' };
  const stack = [];
  for (const ch of s) {
    if (pairs[ch]) stack.push(ch);
    else if (ch === '}' || ch === ']' || ch === ')') {
      const open = stack.pop();
      if (!open || pairs[open] !== ch) return false;
    }
  }
  return stack.length === 0;
}

function checkHtmlBalance(mod, html) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(?=[\s/>])[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3] || '';
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    if (!closing) stack.push(tag);
    else {
      const top = stack.pop();
      if (top !== tag) {
        err(mod, `标签未闭合: </${tag}> 出现在 <${top || '(空)'}> 之后  ...${html.slice(Math.max(0, m.index - 90), m.index + 10).replace(/\s+/g, ' ')}`);
        return false;
      }
    }
  }
  if (stack.length) { err(mod, `标签未闭合: <${stack.join('>, <')}>`); return false; }
  return true;
}

function checkClasses(mod, html) {
  const re = /class="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) {
      if (ALLOWED_CLASSES.has(c)) continue;
      if (SOFT_CLASSES.has(c)) { warn(mod, `class="${c}" 不在内容 DSL 白名单里（index.html 虽有样式，但建议用标准结构）`); continue; }
      err(mod, `未知 class="${c}"（白名单见 STYLE-CONTRACT.md 第 2 节）`);
    }
  }
}

/* ---------------- per module ---------------- */
const active = onlyIds ? items.filter(i => onlyIds.has(i.id)) : items;
if (onlyIds && !active.length) { console.log('--only 没有匹配到任何模块'); process.exit(2); }
const seenIds = new Map();
const allIds = new Set(items.map(i => i.id));

for (const item of active) {
  const id = item.id || '(无 id)';
  const body = item.body || '';
  stats.characters += body.length;

  if (!item.id) err(id, '缺少 id');
  if (!item.title) err(id, '缺少 title');
  if (!item.en) warn(id, '缺少 en 副标题');
  if (!Array.isArray(item.tags) || !item.tags.length) warn(id, '缺少 tags');
  if (!Number.isFinite(item.minutes)) warn(id, '缺少 minutes');
  if (item.body == null) { err(id, '缺少 body'); continue; }
  if (seenIds.has(item.id)) err(id, `id 与 ${seenIds.get(item.id)} 重复`);
  seenIds.set(item.id, item.num || item.id);

  // forbidden template-literal hazards
  if (/`/.test(body)) err(id, 'body 里出现反引号，会提前结束 String.raw 模板串');
  if (/\$\{/.test(body)) err(id, 'body 里出现 ${，会被当成模板插值');
  if (/<style[\s>]/i.test(body)) err(id, 'body 里出现 <style>');
  if (/\sstyle="/i.test(body)) warn(id, 'body 里出现行内 style=');
  if (/<script[\s>]/i.test(body)) err(id, 'body 里出现 <script>');

  stats.blockSections += (body.match(/class="blk\b/g) || []).length;
  stats.tables += (body.match(/<table class="tbl/g) || []).length;
  stats.accordions += (body.match(/class="acc"/g) || []).length;
  stats.quizzes += (body.match(/class="quiz"/g) || []).length;
  stats.labs += (body.match(/class="blk blk-lab"/g) || []).length;
  stats.h3 += (body.match(/<h3>/g) || []).length;
  stats.glossaryRows += (body.match(/<tbody>[\s\S]*?<\/tbody>/g) || [])
    .reduce((n, t) => n + (t.match(/<tr>/g) || []).length, 0);

  // HTML / class / math
  const htmlOk = checkHtmlBalance(id, body);
  checkClasses(id, body);

  const { found: maths, unmatched } = extractMath(body);
  stats.formulas += maths.length;
  stats.displayFormulas += maths.filter(x => x.display).length;
  for (const { tex, display } of maths) {
    if (CJK.test(tex)) err(id, `公式含中文字符: ${tex.slice(0, 50)}`);
    if (!balances(tex)) err(id, `公式括号不平衡: ${tex.slice(0, 50)}`);
    if (/\\[a-zA-Z]*undefined/.test(tex)) err(id, `公式疑似未定义宏: ${tex.slice(0, 50)}`);
    void display;
  }
  if (unmatched.inline) err(id, `有 ${unmatched.inline} 个 \\( 没有配对的 \\)`);
  if (unmatched.display) err(id, `有 ${unmatched.display} 个 \\[ 没有配对的 \\]`);
  if (unmatched.strayClose) err(id, `有 ${unmatched.strayClose} 个多余的 \\) 或 \\]`);

  // quizzes
  const quizBlocks = body.split(/<div class="quiz(?:\s+[^"]*)?"[^>]*>/).slice(1);
  quizBlocks.forEach((qb, qi) => {
    const isBlank = /class="blank-wrap"|data-ans=/.test(qb);
    if (isBlank) {
      if (!/data-ans=/.test(qb) && !/class="blank-input"/.test(qb)) err(id, `填空自测 ${qi + 1}: 缺少 data-ans 或 .blank-input`);
      if (!/class="why"/.test(qb)) err(id, `填空自测 ${qi + 1}: 缺少 .why 解析`);
    } else {
      const okCount = (qb.match(/data-ok/g) || []).length;
      const optCount = (qb.split('<ul class="opts">')[1] || '').split('</ul>')[0].split('<li').length - 1;
      if (okCount !== 1) err(id, `自测 ${qi + 1}: data-ok 数量 = ${okCount}（应为 1）`);
      if (optCount < 3) err(id, `自测 ${qi + 1}: 选项只有 ${optCount} 个`);
      if (!/class="why"/.test(qb)) err(id, `自测 ${qi + 1}: 缺少 .why 解析`);
    }
    if (!/class="qlabel"/.test(qb)) warn(id, `自测 ${qi + 1}: 缺少 .qlabel`);
  });

  // tables: header/body column parity
  const tableRe = /<table class="tbl[^"]*">([\s\S]*?)<\/table>/g;
  let tm, ti = 0;
  while ((tm = tableRe.exec(body))) {
    ti++;
    const t = tm[1];
    const headRow = (t.match(/<thead>[\s\S]*?<\/thead>/) || [''])[0];
    const headCols = (headRow.match(/<th[\s>]/g) || []).length;
    if (!headCols) { err(id, `表格 ${ti}: 缺少表头或表头为空`); continue; }
    const bodyRows = t.split('<tbody>')[1] ? t.split('<tbody>')[1].split('</tbody>')[0].split('<tr>').slice(1) : [];
    bodyRows.forEach((r, ri) => {
      const cols = (r.match(/<td[\s>]/g) || []).length;
      if (cols !== headCols) err(id, `表格 ${ti} 第 ${ri + 1} 行: ${cols} 列 vs 表头 ${headCols} 列`);
    });
  }

  // blocks must carry an h4 title
  const blkRe = /<section class="blk[^"]*">([\s\S]*?)<\/section>/g;
  let bm, bi = 0;
  while ((bm = blkRe.exec(body))) {
    bi++;
    if (!/<h4>/.test(bm[1])) err(id, `版块 ${bi} 缺少 <h4> 标题`);
  }

  // internal anchors must exist
  const linkRe = /href="#([^"]+)"/g;
  let lm;
  while ((lm = linkRe.exec(body))) {
    const target = lm[1];
    if (target.startsWith('s-') || target.startsWith('quiz')) continue;
    if (!allIds.has(target)) err(id, `死链 #${target}（没有这个模块 id）`);
  }

  // term tooltips
  const termRe = /class="t" data-tterm="([^"]*)" data-d="([^"]*)"/g;
  let termM;
  while ((termM = termRe.exec(body))) {
    if (!termM[1].trim()) err(id, '术语缺少 data-tterm');
    if (stripTags(termM[2]).length < 8) err(id, `术语解释过短: ${termM[1]}`);
  }

  // depth expectations for the advanced part
  const num = parseInt(item.num, 10);
  const h3n = (body.match(/<h3>/g) || []).length;
  if (h3n < 2) warn(id, `h3 只有 ${h3n} 个（速查目录需要 ≥2）`);
  if (num >= 16 && num <= 22) {
    if (h3n < 7) warn(id, `高阶章 h3 只有 ${h3n} 个（目标 ≥7）`);
    const f = itemFile.get(item);
    const lines = fileLines.get(f) || 0;
    statLines.push(`${item.num}(${f}): ${lines} 行 / ${(body.length / 1000).toFixed(1)}k 字符`);
    if (lines < 550) warn(id, `高阶章只有 ${lines} 行（契约目标 ≥550 行）`);
    if (!/blk-eco/.test(body)) warn(id, '缺少 blk-eco「怎么用在真实项目里」版块');
    if (!/blk-lab/.test(body)) warn(id, '缺少 blk-lab 动手版块');
  }
  if (!htmlOk) continue;
}

/* ---------------- global checks ---------------- */
for (const f of loadErrors) errors.push(`[载入失败] ${f}`);

if (!asJson) {
  console.log(`\n内容静态自检  node tools/validate.mjs`);
  console.log(`${'='.repeat(74)}`);
  console.log(`文件 ${stats.files} 个 · 模块 ${stats.modules} 个 · 正文 ${(stats.characters / 1000).toFixed(1)}k 字符`);
  console.log(`公式 ${stats.formulas} 处（行间 ${stats.displayFormulas}）· 自测 ${stats.quizzes} · 术语 ${stats.terms} · 动手版块 ${stats.labs}`);
  console.log(`表格 ${stats.tables} · 折叠块 ${stats.accordions} · h3 ${stats.h3} · 色彩版块 ${stats.blockSections}`);
  console.log(`术语表表格行 ${stats.glossaryRows}`);
  if (statLines.length) {
    console.log(`\n前沿拓展章规模（16–22）：`);
    statLines.forEach(l => console.log('  ' + l));
  }
  console.log(`${'='.repeat(74)}`);
  if (errors.length) {
    console.log(`\n✗ ${errors.length} 条错误：`);
    errors.slice(0, 60).forEach(e => console.log('  - ' + e));
    if (errors.length > 60) console.log(`  … 其余 ${errors.length - 60} 条`);
  }
  if (warnings.length && !quiet) {
    console.log(`\n⚠ ${warnings.length} 条提醒：`);
    warnings.slice(0, 40).forEach(w => console.log('  - ' + w));
    if (warnings.length > 40) console.log(`  … 其余 ${warnings.length - 40} 条`);
  }
  console.log(`\n结论：${errors.length ? '❌ 未通过（' + errors.length + ' 条错误）' : '✅ 通过'}`);
}

if (asJson) console.log(JSON.stringify({ ok: errors.length === 0, stats, errors, warnings }, null, 2));
process.exit(errors.length ? 1 : 0);
