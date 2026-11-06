import fs from 'fs';

const text = fs.readFileSync('who_children_formulary_2010.txt', 'utf8');
const lines = text.split(/\r?\n/);

let curPage = 1;
const linePage = new Array(lines.length).fill(1);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // 짝수 페이지: "18\t WHO Model Formulary for Children 2010"
  // 또는 라인 끝에 "\s+(\d+)\s+WHO Model Formulary for Children 2010"
  const mEven = line.match(/(?:^|\s+)(\d{1,3})\s+WHO Model Formulary for Children 2010/);
  if (mEven) {
    const p = parseInt(mEven[1], 10);
    if (p > 0 && p < 600) curPage = p;
  }
  
  // 홀수 페이지: 다음 라인 또는 다다음 라인이 숫자 단독 (1~550)
  if (line.startsWith('WHO Model Formulary for Children 2010')) {
    for (let k = 1; k <= 3; k++) {
      if (i + k < lines.length) {
        const next = lines[i + k].trim();
        if (/^\d{1,3}$/.test(next)) {
          const p = parseInt(next, 10);
          if (p > 0 && p < 600) {
            curPage = p;
            break;
          }
        }
      }
    }
  }
  
  linePage[i] = curPage;
}

console.log('Sample checked pages:');
[586, 615, 1920, 2000, 11118].forEach(lineIdx => {
  console.log(`Line ${lineIdx}: [${lines[lineIdx]?.trim()}] -> Page: ${linePage[lineIdx]}`);
});
