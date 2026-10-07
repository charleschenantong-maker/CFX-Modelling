import fs from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '..', 'content');

const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.js')).sort();
let total = 0;
for (const f of files) {
  const content = fs.readFileSync(join(contentDir, f), 'utf8');
  const count = (content.match(/class="quiz"/g) || []).length;
  total += count;
  console.log(`${f.padEnd(30)}: ${count}`);
}
console.log(`TOTAL QUIZZES: ${total}`);
