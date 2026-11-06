import fs from 'fs';

const text = fs.readFileSync('who_children_formulary_2010.txt', 'utf8');
const lines = text.split(/\r?\n/);

// 페이지 계산
let curPage = 1;
const linePage = new Array(lines.length).fill(1);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const mEven = line.match(/(?:^|\s+)(\d{1,3})\s+WHO Model Formulary for Children 2010/);
  if (mEven) {
    const p = parseInt(mEven[1], 10);
    if (p > 0 && p < 600) curPage = p;
  }
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

// ATC 코드를 기준으로 모노그래프 블록 분할
interface RawMonograph {
  startLine: number;
  endLine: number;
  drugName: string;
  atcCode: string;
  page: number;
  rawText: string;
}

const monographs: RawMonograph[] = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const atcMatch = line.match(/^ATC code:\s*([A-Z0-9]+)/i);
  if (atcMatch) {
    const atcCode = atcMatch[1];
    // drugName 추출: 이전 비어있지 않은 라인 탐색
    let drugName = '';
    let startLine = i;
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      const prev = lines[j].trim();
      if (!prev) continue;
      if (prev.startsWith('Section') || prev.startsWith('WHO') || /^\d+$/.test(prev)) continue;
      // 이전 섹션 헤딩 (예: "2.1 Non-opioids...") 건너뛰기
      if (/^\d+\.\d+/.test(prev)) continue;
      drugName = prev;
      startLine = j;
      break;
    }
    
    // 만약 drugName이 이상하거나 Tablet: 등 제형이면 한 줄 더 위로
    if (drugName.startsWith('Tablet') || drugName.startsWith('Oral') || drugName.startsWith('Capsule') || drugName.startsWith('Inhalation') || drugName.startsWith('Solution') || drugName.startsWith('Powder')) {
      for (let j = startLine - 1; j >= Math.max(0, startLine - 5); j--) {
        const prev = lines[j].trim();
        if (prev && !/^\d+\.\d+/.test(prev) && !prev.startsWith('WHO') && !/^\d+$/.test(prev)) {
          drugName = prev;
          startLine = j;
          break;
        }
      }
    }

    monographs.push({
      startLine,
      endLine: lines.length, // 나중에 조정
      drugName,
      atcCode,
      page: linePage[startLine],
      rawText: ''
    });
  }
}

// 각 모노그래프의 endLine 조정
for (let k = 0; k < monographs.length - 1; k++) {
  monographs[k].endLine = monographs[k + 1].startLine;
  monographs[k].rawText = lines.slice(monographs[k].startLine, monographs[k].endLine).join('\n');
}
if (monographs.length > 0) {
  monographs[monographs.length - 1].rawText = lines.slice(monographs[monographs.length - 1].startLine, monographs[monographs.length - 1].startLine + 200).join('\n');
}

console.log(`Parsed ${monographs.length} monographs.`);

// 5대 핵심 성분 테스트
const testNames = ['Ibuprofen', 'Paracetamol', 'Amoxicillin', 'Amoxicillin + Clavulanic acid', 'Azithromycin'];
testNames.forEach(tName => {
  const matches = monographs.filter(m => m.drugName.toLowerCase().includes(tName.toLowerCase()) || m.rawText.toLowerCase().includes(tName.toLowerCase()));
  console.log(`\n=== Target [${tName}] found ${matches.length} matches:`);
  matches.forEach(m => {
    console.log(`  -> Drug: [${m.drugName}], ATC: ${m.atcCode}, Page: ${m.page}`);
    // Dose 섹션 추출 테스트
    const doseMatch = m.rawText.match(/Dose:\s*([\s\S]*?)(?:Renal impairment:|Hepatic impairment:|Adverse effects:|Interactions:|References:|$)/i);
    if (doseMatch) {
      console.log(`     Dose: ${doseMatch[1].replace(/\s+/g, ' ').slice(0, 160)}...`);
    }
    const indMatch = m.rawText.match(/Indications:\s*([\s\S]*?)(?:Contraindications:|Precautions:|Dose:|$)/i);
    if (indMatch) {
      console.log(`     Indications: ${indMatch[1].replace(/\s+/g, ' ').slice(0, 120)}...`);
    }
  });
});
