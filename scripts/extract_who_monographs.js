import fs from 'fs';

const text = fs.readFileSync('who_children_formulary_2010.txt', 'utf8');
const lines = text.split(/\r?\n/);

console.log('Total lines:', lines.length);

// ATC code 라인 찾기
const atcMatches = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (/^ATC code:\s*([A-Z0-9]+)/i.test(line)) {
    // 그 이전 라인들 중에서 약물명 찾기
    let drugName = '';
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const prev = lines[j].trim();
      if (prev && !prev.startsWith('Section') && !prev.startsWith('2.') && !prev.startsWith('WHO') && !/^\d+$/.test(prev)) {
        drugName = prev;
        break;
      }
    }
    atcMatches.push({ lineIndex: i, drugName, atc: line });
  }
}

console.log(`Found ${atcMatches.length} drug monographs with ATC codes!`);
console.log('First 10 monographs:');
atcMatches.slice(0, 10).forEach(m => console.log(`  Line ${m.lineIndex}: [${m.drugName}] (${m.atc})`));
console.log('Sample targets:');
atcMatches.filter(m => /amox|ibu|paracet|azithro|cetir/i.test(m.drugName)).forEach(m => console.log(`  Target: [${m.drugName}] (${m.atc})`));
