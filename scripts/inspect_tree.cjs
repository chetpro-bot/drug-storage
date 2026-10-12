const fs = require('fs');

const srcPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\59017a27-b0db-4957-96b6-5f5067a2ae99\\.system_generated\\steps\\567\\content.md';
const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split('\n');

const d1 = [];
for (const line of lines) {
  if (line.includes('$(".depth01").append')) {
    const m = line.match(/val\('([^']+)'\)/);
    if (m) d1.push(m[1]);
  }
}

console.log('Depth 01 대분류:', [...new Set(d1)]);
