/* tools/smoke.mjs - index.html delivery-shell smoke test (no browser needed).
 *
 *   node ai-course/tools/smoke.mjs
 *
 * Checks the things validate.mjs explicitly does NOT cover:
 *  1. content/*.js count == COURSE.register modules == bundle COURSE.register count
 *  2. assets/course-bundle.js is fresher than every content/*.js (no stale bundle)
 *  3. KaTeX vendored (katex.min.js + css + >=10 woff2), no http(s) CDN refs in index.html
 *  4. progress_server.py has body cap + origin check (regression guard)
 *  5. progress filenames documented (server progress.json vs folder llm-crash-course-progress.json)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const courseDir = resolve(here, '..');
const contentDir = join(courseDir, 'content');
const indexHtml = readFileSync(join(courseDir, 'index.html'), 'utf8');
const errors = [];

// 1. module counts
const files = readdirSync(contentDir).filter(f => f.endsWith('.js')).sort();
const items = [];
const ctx = vm.createContext({ window: {}, COURSE: { items, register(o) { items.push(o); } } });
for (const f of files) vm.runInContext(readFileSync(join(contentDir, f), 'utf8'), ctx, { filename: f });
const bundlePath = join(courseDir, 'assets', 'course-bundle.js');
if (!existsSync(bundlePath)) errors.push('assets/course-bundle.js 缺失，请跑 python tools/bundle_content.py');
let bundleModules = 0;
if (existsSync(bundlePath)) {
  const src = readFileSync(bundlePath, 'utf8');
  bundleModules = (src.match(/COURSE\.register\(/g) || []).length;
  if (bundleModules !== items.length) errors.push(`bundle 内 COURSE.register=${bundleModules} vs content=${items.length}，bundle 已过期`);
  // 2. freshness
  const bundleMtime = statSync(bundlePath).mtimeMs;
  for (const f of files) {
    if (statSync(join(contentDir, f)).mtimeMs > bundleMtime) { errors.push(`bundle 比 ${f} 旧，请重新打包`); break; }
  }
}
if (files.length !== 38) errors.push(`content 文件数=${files.length}（期望 38，README 数字需同步 tools/stats.mjs）`);
if (items.length !== 38) errors.push(`模块数=${items.length}（期望 38）`);

// 3. KaTeX vendored + no CDN
for (const p of ['assets/katex/katex.min.js', 'assets/katex/katex.min.css']) {
  if (!existsSync(join(courseDir, p))) errors.push(`缺失 ${p}（离线渲染必需）`);
}
const woff2 = existsSync(join(courseDir, 'assets', 'katex', 'fonts'))
  ? readdirSync(join(courseDir, 'assets', 'katex', 'fonts')).filter(f => f.endsWith('.woff2')) : [];
if (woff2.length < 10) errors.push(`katex fonts woff2 只有 ${woff2.length} 个（期望 >=10）`);
const cdnRefs = [...indexHtml.matchAll(/src="https?:\/\/[^"]+"|href="https?:\/\/[^"]+"/g)].map(m => m[0]);
if (cdnRefs.length) errors.push(`index.html 含外部 CDN 引用 ${cdnRefs.length} 处，离线要求零外部引用: ${cdnRefs.slice(0, 3).join(' | ')}`);

// 4. progress_server guards
const py = readFileSync(join(courseDir, 'progress_server.py'), 'utf8');
if (!/MAX_BODY/.test(py)) errors.push('progress_server.py 缺少 MAX_BODY 上限');
if (!/Origin/.test(py)) errors.push('progress_server.py 缺少 Origin 检查');

// 5. progress filenames
if (!/llm-crash-course-progress\.json/.test(indexHtml) || !/progress\.json/.test(indexHtml))
  errors.push('index.html 进度文件名注释缺失（server=progress.json, folder=llm-crash-course-progress.json）');

console.log(`smoke: files=${files.length} modules=${items.length} bundleModules=${bundleModules} woff2=${woff2.length} cdnRefs=${cdnRefs.length}`);
if (errors.length) { console.log('❌ SMOKE FAIL'); errors.forEach(e => console.log('  - ' + e)); process.exit(1); }
console.log('✅ SMOKE PASS');
