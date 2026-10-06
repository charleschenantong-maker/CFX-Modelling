import fs from 'fs';

const files = fs.readdirSync('content').filter(f => f.endsWith('.js')).sort();
let total = 0;
for (const f of files) {
  const content = fs.readFileSync('content/' + f, 'utf8');
  const count = (content.match(/class="quiz"/g) || []).length;
  total += count;
  console.log(`${f.padEnd(30)}: ${count}`);
}
console.log(`TOTAL QUIZZES: ${total}`);
