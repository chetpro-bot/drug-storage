/**
 * 프로바이오틱스(생균제제) 규격 및 균주 분석 유틸리티
 */

/**
 * 프로바이오틱스 균주 추출 정규식
 * - 식약처 건강기능식품 공전 고시형 19종 균주 속(Genus) 및 한국어/영문 학명 지원
 */
export const PROBIOTIC_GENERA_REGEX =
  /^(?:Lactobacillus|Bifidobacterium|Lacticaseibacillus|Lactiplantibacillus|Limosilactobacillus|Ligilactobacillus|Latilactobacillus|Streptococcus|Enterococcus|Lactococcus|Bacillus|Clostridium|락토\s*바실러스|비피[도토]\s*박테리움|락티카제이\s*바실러스|락티플란티\s*바실러스|리모시락토\s*바실러스|리지락토\s*바실러스|스트렙토\s*코커스|엔테로\s*코커스|락토\s*코커스|바실러스|클로스트리디움|낙산균|포자균|효모균|사균체)/i;

/**
 * 프로바이오틱스 표준 라틴 학명 <-> 한글명 상호 매핑 사전
 */
export const PROBIOTIC_LATIN_TO_KOR: Record<string, string> = {
  'bifidobacterium bifidum': '비피도박테리움 비피덤',
  'bifidobacterium longum': '비피도박테리움 롱검',
  'bifidobacterium animalis': '비피도박테리움 애니멀리스(락티스)',
  'bifidobacterium animalis subsp. lactis': '비피도박테리움 락티스',
  'bifidobacterium breve': '비피도박테리움 브레브',
  'bifidobacterium lactis': '비피도박테리움 락티스',
  'lacticaseibacillus casei': '락티카제이바실러스 카제이',
  'lactobacillus casei': '락토바실러스 카제이',
  'lacticaseibacillus rhamnosus': '락티카제이바실러스 람노서스',
  'lactobacillus rhamnosus': '락토바실러스 람노서스',
  'lactobacillus acidophilus': '락토바실러스 아시도필루스',
  'lactobacillus plantarum': '락토바실러스 플란타룸',
  'lactiplantibacillus plantarum': '락티플란티바실러스 플란타룸',
  'lactobacillus reuteri': '락토바실러스 루테리',
  'limosilactobacillus reuteri': '리모시락토바실러스 루테리',
  'lactobacillus gasseri': '락토바실러스 가세리',
  'lactobacillus helveticus': '락토바실러스 헬베티쿠스',
  'lactobacillus salivarius': '락토바실러스 살리바리우스',
  'lactobacillus bulgaricus': '락토바실러스 불가리쿠스',
  'lactobacillus fermentum': '락토바실러스 퍼멘텀',
  'limosilactobacillus fermentum': '리모시락토바실러스 퍼멘텀',
  'lactobacillus paracasei': '락토바실러스 파라카제이',
  'lacticaseibacillus paracasei': '락티카제이바실러스 파라카제이',
  'streptococcus thermophilus': '스트렙토코커스 써모필러스',
  'enterococcus faecium': '엔테로코커스 페슘',
  'enterococcus faecalis': '엔테로코커스 페칼리스',
  'lactococcus lactis': '락토코커스 락티스'
};

const PROBIOTIC_KOR_TO_LATIN: Record<string, string> = {};
for (const [latin, kor] of Object.entries(PROBIOTIC_LATIN_TO_KOR)) {
  const cleanKor = kor.replace(/\s+/g, '').replace(/\([^)]+\)/g, '');
  const binomialLatin = latin
    .split(' ')
    .map((w, idx) => (idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ');
  PROBIOTIC_KOR_TO_LATIN[cleanKor] = binomialLatin;
}
PROBIOTIC_KOR_TO_LATIN['비피토박테리움락티스'] = 'Bifidobacterium animalis subsp. lactis';
PROBIOTIC_KOR_TO_LATIN['비피도박테리움락티스'] = 'Bifidobacterium animalis subsp. lactis';

/**
 * 프로바이오틱스 균주명 표준 표기 포맷터 (한글명 및 라틴 학명 병기)
 */
export function formatStrainDisplayName(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // 1. 라틴 학명인 경우 -> 한글명 (라틴 학명)
  if (PROBIOTIC_LATIN_TO_KOR[lower]) {
    const kor = PROBIOTIC_LATIN_TO_KOR[lower];
    const binomial = trimmed
      .split(' ')
      .map((w, idx) => (idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
      .join(' ');
    return `${kor} (${binomial})`;
  }

  // 2. 한글명인 경우 -> 표준 띄어쓰기 한글명 (라틴 학명)
  const cleanKor = trimmed.replace(/\s+/g, '').replace(/^비피토\s*박테리움/, '비피도박테리움');
  if (PROBIOTIC_KOR_TO_LATIN[cleanKor]) {
    const latin = PROBIOTIC_KOR_TO_LATIN[cleanKor];
    const prettyKor = cleanKor.replace(
      /^(비피도박테리움|락토바실러스|락티카제이바실러스|락티플란티바실러스|리모시락토바실러스|스트렙토코커스|엔테로코커스|락토코커스)([가-힣])/,
      '$1 $2'
    );
    return `${prettyKor} (${latin})`;
  }

  return trimmed;
}

/**
 * 식약처 건강기능식품 공전 고시형 19종 프로바이오틱스 균종 학명/한국어명 목록
 */
export const KFDA_STANDARD_SPECIES = [
  'acidophilus', 'casei', 'paracasei', 'rhamnosus', 'reuteri',
  'plantarum', 'fermentum', 'gasseri', 'helveticus', 'salivarius',
  'bulgaricus', 'delbrueckii', 'bifidum', 'breve', 'longum',
  'animalis', 'lactis', 'thermophilus', 'faecium', 'faecalis',
  '아시도필루스', '카제이', '파라카제이', '람노서스', '루테리',
  '플란타룸', '퍼멘텀', '가세리', '헬베티쿠스', '살리바리우스',
  '불가리쿠스', '델브루키', '비피덤', '브레브', '롱검', '애니멀리스', '락티스', '써모필러스', '페슘', '페칼리스'
];

export interface ProbioticStrainInfo {
  name: string;
  isStandard: boolean; // 식약처 공전 고시형 여부
  regulatoryType?: '고시형' | '개별인정형';
}

/**
 * 균주명이 식약처 공전 고시형 19종에 해당하는지 판별
 */
export function isKfdaStandardSpecies(strainName: string): boolean {
  const lower = strainName.toLowerCase();
  return KFDA_STANDARD_SPECIES.some((spec) => lower.includes(spec));
}

/**
 * C003 원재료명(RAWMTRL_NM)에서 프로바이오틱스 균주(Strains) 목록 및 고시형 여부 추출
 * - 부형제, 캡슐기제(히드록시프로필메틸셀룰로오스, 정제수, 자일리톨, 이눌린 등) 및 비생균 성분 제외
 * - 고시형 / 개별인정형 법정 분류 플래그 판별
 */
export function extractProbioticStrains(rawMtrlText?: string): ProbioticStrainInfo[] {
  if (!rawMtrlText || !rawMtrlText.trim()) return [];

  const items = rawMtrlText
    .split(/[,;\n\r/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const strains: ProbioticStrainInfo[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const isExplicitStandard = /고시형/.test(item);
    const isExplicitIndividual = /개별인정/.test(item);

    // 접두사 및 괄호 법정 수식어 제거: (고시형), (개별인정형), (기능성원료...)
    const cleaned = item
      .replace(/^(?:원료명|원재료명|원료\s*및\s*함량|원재료명\s*및\s*함량)\s*[:：]\s*/i, '')
      .replace(/\((?:고시형|개별인정형|기능성원료[^)]*|제[0-9\-]+호)\)/gi, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();

    if (!cleaned) continue;

    // 프로바이오틱스 균주에 해당하는지 검사
    if (PROBIOTIC_GENERA_REGEX.test(cleaned) || /유산균|비피더스|생균/i.test(cleaned)) {
      const formattedName = formatStrainDisplayName(cleaned);
      if (!seen.has(formattedName.toLowerCase()) && !seen.has(cleaned.toLowerCase())) {
        seen.add(formattedName.toLowerCase());
        seen.add(cleaned.toLowerCase());
        const isStandard = isExplicitStandard || (!isExplicitIndividual && isKfdaStandardSpecies(cleaned));
        strains.push({
          name: formattedName,
          isStandard,
          regulatoryType: isStandard ? '고시형' : (isExplicitIndividual ? '개별인정형' : undefined)
        });
      }
    }
  }

  // 알파벳(A-Z) 순서로 균주명 정렬
  strains.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  return strains;
}

/**
 * C003 기준 및 규격(STDR_STND)에서 보장 프로바이오틱스 수(CFU) 추출
 * 예: "프로바이오틱스 수 : 표시량(10,000,000,000(100억) CFU/329 ㎎) 이상" -> "100억 CFU"
 *     "프로바이오틱스 수 : 표시량(5,000,000,000(50억)CFU/1.5 g) 이상" -> "50억 CFU"
 *     "프로바이오틱스 수 : 표시량(10,000,000,000 CFU/2 g) 이상" -> "100억 CFU"
 */
export function extractProbioticCount(stdrText?: string): string | null {
  if (!stdrText || !stdrText.trim()) return null;

  const lines = stdrText.split(/[\r\n]+/);
  const probLine = lines.find((l) => /프로바이오틱스|유산균/.test(l));
  if (!probLine) return null;

  // 1) 괄호 안의 '(100억) CFU' 또는 '100억 CFU' 형태 우선 매칭
  const eokMatch =
    probLine.match(/\(([0-9,]+(?:\.[0-9]+)?)\s*억\)\s*CFU/i) ||
    probLine.match(/([0-9,]+(?:\.[0-9]+)?)\s*억\s*CFU/i) ||
    probLine.match(/\(([0-9,]+(?:\.[0-9]+)?)\s*억\)/);
  if (eokMatch) {
    const val = eokMatch[1].replace(/,/g, '');
    return `${val}억 CFU`;
  }

  // 2) 전체 숫자 형태 (10,000,000,000 CFU 또는 표시량(100,000,000))
  const numMatch =
    probLine.match(/([0-9,]{7,})\s*(?:\([^)]+\))?\s*CFU/i) ||
    probLine.match(/표시량\s*[\(\{]?\s*([0-9,]{7,})/i);
  if (numMatch) {
    const rawNum = parseFloat(numMatch[1].replace(/,/g, ''));
    if (!isNaN(rawNum) && rawNum > 0) {
      if (rawNum >= 100000000) {
        const eok = rawNum / 100000000;
        return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억 CFU`;
      } else if (rawNum >= 10000) {
        const man = rawNum / 10000;
        return `${Number.isInteger(man) ? man.toLocaleString() : man.toFixed(1)}만 CFU`;
      }
      return `${rawNum.toLocaleString()} CFU`;
    }
  }

  return null;
}

/**
 * 복용량 배율(1알 vs 하루 섭취량)에 따른 프로바이오틱스 CFU 표기 환산
 */
export function scaleProbioticCount(baseCountText: string, doseFactor: number = 1): string {
  if (doseFactor === 1 || !baseCountText) return baseCountText;

  const eokMatch = baseCountText.match(/([0-9,]+(?:\.[0-9]+)?)\s*억\s*CFU/i);
  if (eokMatch) {
    const val = parseFloat(eokMatch[1].replace(/,/g, '')) * doseFactor;
    return `${Number.isInteger(val) ? val : val.toFixed(1)}억 CFU`;
  }

  const manMatch = baseCountText.match(/([0-9,]+(?:\.[0-9]+)?)\s*만\s*CFU/i);
  if (manMatch) {
    const val = parseFloat(manMatch[1].replace(/,/g, '')) * doseFactor;
    return `${Number.isInteger(val) ? val : val.toFixed(1)}만 CFU`;
  }

  const rawMatch = baseCountText.match(/([0-9,]+)\s*CFU/i);
  if (rawMatch) {
    const val = parseFloat(rawMatch[1].replace(/,/g, '')) * doseFactor;
    return `${Math.round(val).toLocaleString()} CFU`;
  }

  return baseCountText;
}

/**
 * 성분 항목이 프로바이오틱스(생균제제)인지 판별
 */
export function isProbioticIngredient(
  englishInn?: string,
  categoryTag?: string,
  functionalCategory?: string,
  unit?: string
): boolean {
  if (englishInn && /^(?:probiotics|probiotic)$/i.test(englishInn.trim())) return true;
  if (unit === 'CFU') return true;
  if (categoryTag && /정장제|생균제제|프로바이오틱스|유산균/i.test(categoryTag)) return true;
  if (functionalCategory && /정장제|생균제제|프로바이오틱스|유산균/i.test(functionalCategory)) return true;
  return false;
}
