import fs from 'node:fs';
import path from 'node:path';

const dir = 'D:/CFX Modelling/ai-course/content';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

console.log('=== 1. Checking < hazards and CJK in math ===');
let foundHazard = 0;
let foundCJK = 0;

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const mathMatches = content.match(/\\(\(|\[)[\s\S]*?\\(\)|\])/g) || [];
  for (const m of mathMatches) {
    if (/<[a-zA-Z]/.test(m)) {
      console.log(`[LT-HAZARD] in ${f}: ${m}`);
      foundHazard++;
    }
    if (/[\u4e00-\u9fa5]/.test(m)) {
      console.log(`[CJK-IN-MATH] in ${f}: ${m}`);
      foundCJK++;
    }
  }
}
console.log(`Total LT-HAZARDS: ${foundHazard}, Total CJK-IN-MATH: ${foundCJK}`);
