import fs from 'fs';

const text = fs.readFileSync('who_children_formulary_2010.txt', 'utf8');
const lines = text.split(/\r?\n/);

// 1. 라인별 페이지 번호 추적
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

// 2. 모노그래프 분할
const rawList = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const atcMatch = line.match(/^ATC code:\s*([A-Z0-9]+)/i);
  if (atcMatch) {
    const atcCode = atcMatch[1];
    let drugName = '';
    let startLine = i;
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      const prev = lines[j].trim();
      if (!prev) continue;
      if (prev.startsWith('Section') || prev.startsWith('WHO') || /^\d+$/.test(prev)) continue;
      if (/^\d+\.\d+/.test(prev)) continue;
      drugName = prev;
      startLine = j;
      break;
    }
    
    // Dosage form 헤더 스킵
    if (/^(Tablet|Oral|Capsule|Inhalation|Solution|Powder|Injection|Gel|Cream|Lotion|Eye|Ear)/i.test(drugName)) {
      for (let j = startLine - 1; j >= Math.max(0, startLine - 6); j--) {
        const prev = lines[j].trim();
        if (prev && !/^\d+\.\d+/.test(prev) && !prev.startsWith('WHO') && !/^\d+$/.test(prev)) {
          drugName = prev;
          startLine = j;
          break;
        }
      }
    }

    // 정리
    drugName = drugName.replace(/\s+/g, ' ').trim();

    rawList.push({
      startLine,
      endLine: lines.length,
      drugName,
      atcCode,
      page: linePage[startLine],
      rawText: ''
    });
  }
}

for (let k = 0; k < rawList.length - 1; k++) {
  rawList[k].endLine = rawList[k + 1].startLine;
  rawList[k].rawText = lines.slice(rawList[k].startLine, rawList[k].endLine).join('\n');
}
if (rawList.length > 0) {
  rawList[rawList.length - 1].rawText = lines.slice(rawList[rawList.length - 1].startLine, rawList[rawList.length - 1].startLine + 200).join('\n');
}

// 3. 파싱 및 정제
function cleanText(t) {
  if (!t) return '';
  return t
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\d+\s+WHO Model Formulary for Children 2010/g, '')
    .replace(/WHO Model Formulary for Children 2010\s+\d+/g, '')
    .replace(/WHO Model Formulary for Children 2010/g, '')
    .trim();
}

function extractSection(text, startKeyword, endKeywords) {
  const pattern = new RegExp(`${startKeyword}:\\s*([\\s\\S]*?)(?:${endKeywords.map(k => `${k}:`).join('|')}|$)`, 'i');
  const m = text.match(pattern);
  return m ? cleanText(m[1]) : '';
}

const standardSections = [
  'Indications', 'Contraindications', 'Precautions', 'Dose',
  'Renal impairment', 'Hepatic impairment', 'Adverse effects',
  'Interactions with other medicines', 'Notes', 'References'
];

const whoDatabase = rawList.map(item => {
  const t = item.rawText;
  
  const dosageForms = cleanText((t.match(/(?:Tablet|Capsule|Oral liquid|Powder for oral liquid|Solution for injection|Inhalation|Cream|Ointment|Gel|Suppository|Eye drops|Ear drops)[\s\S]*?(?=Indications:|Special Notes:|$)/i) || [''])[0]);
  const specialNotes = extractSection(t, 'Special Notes', standardSections);
  const indications = extractSection(t, 'Indications', standardSections);
  const contraindications = extractSection(t, 'Contraindications', standardSections);
  const precautions = extractSection(t, 'Precautions', standardSections);
  const dose = extractSection(t, 'Dose', standardSections);
  const renalImpairment = extractSection(t, 'Renal impairment', standardSections);
  const hepaticImpairment = extractSection(t, 'Hepatic impairment', standardSections);
  const adverseEffects = extractSection(t, 'Adverse effects', standardSections);
  const notes = extractSection(t, 'Notes', standardSections);

  // 동의어(Synonyms) 추가
  const synonyms = [];
  const lowName = item.drugName.toLowerCase();
  if (lowName.includes('paracetamol')) {
    synonyms.push('acetaminophen', 'apap', 'tylenol');
  }
  if (lowName.includes('ibuprofen')) {
    synonyms.push('brufen', 'motrin', 'advil');
  }
  if (lowName.includes('amoxicillin')) {
    synonyms.push('amoxycillin', 'amoxil');
  }
  if (lowName.includes('epinephrine')) {
    synonyms.push('adrenaline');
  }
  if (lowName.includes('clavulanic')) {
    synonyms.push('clavulanate', 'augmentin');
  }

  // Dose 요약 분해 (연령, 경로, 1회/1일 용량, 최대 용량)
  let maxDose = '';
  const maxMatch = dose.match(/(?:maximum|max(?:\.)?)\s*(?:daily\s*)?dose(?:\s*is|\s*:)?\s*([^.;]+(?:mg|g|mcg|micrograms|doses)[^.;]*)/i);
  if (maxMatch) {
    maxDose = maxMatch[0].trim();
  }

  return {
    drugName: item.drugName,
    atcCode: item.atcCode,
    synonyms,
    dosageForms: dosageForms || undefined,
    specialNotes: specialNotes || undefined,
    indications: indications || undefined,
    contraindications: contraindications || undefined,
    precautions: precautions || undefined,
    dose: dose || 'Dose information in full monograph text.',
    maxDose: maxDose || undefined,
    renalImpairment: renalImpairment || undefined,
    hepaticImpairment: hepaticImpairment || undefined,
    adverseEffects: adverseEffects || undefined,
    notes: notes || undefined,
    sourcePage: item.page,
    sourceUrl: `https://iris.who.int/bitstream/handle/10665/44309/9789241599320_eng.pdf#page=${item.page}`,
    publicationYear: 2010
  };
});

console.log(`Generated ${whoDatabase.length} structured monographs.`);

const codeFile = `/**
 * WHO Model Formulary for Children 2010 로컬 검색 인덱스 데이터베이스
 * 
 * 공식 출처: WHO Model Formulary for Children 2010 (World Health Organization)
 * 공식 PDF: https://iris.who.int/bitstream/handle/10665/44309/9789241599320_eng.pdf
 * 발행 연도: 2010년
 */

export interface WhoFormularyItem {
  drugName: string;
  atcCode: string;
  synonyms: string[];
  dosageForms?: string;
  specialNotes?: string;
  indications?: string;
  contraindications?: string;
  precautions?: string;
  dose: string;
  maxDose?: string;
  renalImpairment?: string;
  hepaticImpairment?: string;
  adverseEffects?: string;
  notes?: string;
  sourcePage: number;
  sourceUrl: string;
  publicationYear: number;
}

export const WHO_CHILDREN_FORMULARY_DATABASE: WhoFormularyItem[] = ${JSON.stringify(whoDatabase, null, 2)};

/**
 * 영문 성분명(INN) 또는 동의어로 WHO Model Formulary 항목 검색
 */
export function lookupWhoFormulary(query: string): WhoFormularyItem[] {
  if (!query || !query.trim()) return [];
  const clean = query.trim().toLowerCase();

  // 1. 성분명 정확 일치 또는 동의어 일치
  const exact = WHO_CHILDREN_FORMULARY_DATABASE.filter(item => {
    const itemLow = item.drugName.toLowerCase();
    if (itemLow === clean) return true;
    if (item.synonyms.some(s => s.toLowerCase() === clean)) return true;
    return false;
  });
  if (exact.length > 0) return exact;

  // 2. 복합제 또는 부분 일치 (단어 경계)
  const partial = WHO_CHILDREN_FORMULARY_DATABASE.filter(item => {
    const itemLow = item.drugName.toLowerCase();
    const cleanWords = clean.split(/[\\s+,/]+/).filter(w => w.length >= 3);
    if (cleanWords.length > 0 && cleanWords.every(w => itemLow.includes(w))) return true;
    if (itemLow.includes(clean)) return true;
    return item.synonyms.some(s => s.toLowerCase().includes(clean));
  });

  return partial;
}
`;

fs.writeFileSync('src/features/pediatric-safety/data/whoChildrenFormularyDb.ts', codeFile, 'utf8');
console.log('Saved src/features/pediatric-safety/data/whoChildrenFormularyDb.ts successfully!');
