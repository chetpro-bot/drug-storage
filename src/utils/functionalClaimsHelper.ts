import { ProductIngredientEntry } from '../types/ingredient';

export interface ResolvedFunctionalClaim {
  nutrient: string;
  description: string;
}

export const KNOWN_NUTRIENT_NAMES: string[] = [
  '칼슘', '마그네슘', '아연', '구리', '동', '망간', '요오드', '아이오딘', '셀레늄', '셀렌', '크롬', '몰리브덴', '철', '칼륨',
  '비타민A', '비타민 A', '베타카로틴',
  '비타민B1', '비타민 B1', '티아민',
  '비타민B2', '비타민 B2', '리보플라빈',
  '비타민B3', '비타민 B3', '나이아신', '니코틴산', '니코틴산아미드',
  '비타민B5', '비타민 B5', '판토텐산',
  '비타민B6', '비타민 B6', '피리독신',
  '비타민B7', '비타민 B7', '비오틴',
  '엽산', '폴산', '비타민B9', '비타민 B9',
  '비타민B12', '비타민 B12', '코발라민',
  '비타민C', '비타민 C', '아스코르브산',
  '비타민D', '비타민 D', '비타민D3', '비타민 D3', '비타민D2', '비타민 D2',
  '비타민E', '비타민 E', '토코페롤',
  '비타민K', '비타민 K', '비타민K1', '비타민K2',
  '프로바이오틱스', '유산균', '프락토올리고당', '신바이오틱스',
  'EPA 및 DHA', 'EPA/DHA', '오메가3', '오메가-3', 'EPA 및 DHA 함유 유지',
  '루테인', '지아잔틴', '루테인지아잔틴', '루테인·지아잔틴',
  '밀크씨슬', '실리마린', '홍삼', '인삼', '테아닌', 'L-테아닌',
  '코엔자임Q10', '코엔자임 Q10', '코큐텐',
  '쏘팔메토', '옥타코사놀', '가르시니아', '글루코사민', 'MSM', '엠에스엠',
  '콜라겐', '히알루론산', '스피루리나', '클로렐라',
  '포스파티딜세린', '은행잎추출물', '빌베리추출물', '녹차추출물', '바나바잎추출물'
];

export function normalizeNutrientName(name: string): string {
  let clean = name.replace(/제품$/, '').trim();
  // 비타민D -> 비타민 D, 비타민B1 -> 비타민 B1, 비타민K -> 비타민 K
  clean = clean.replace(/비타민\s*([A-Za-z0-9]+)/g, '비타민 $1');
  return clean;
}

export function isNutrientHeader(line: string): string | null {
  const clean = line.replace(/^[①-⑩0-9\.\-\s]+/, '').replace(/제품$/, '').trim();
  if (!clean) return null;

  // Bracket style: [칼슘], 【마그네슘】, <아연>
  const bracketMatch = clean.match(/^[\[【<](.+?)[\]】>]$/);
  if (bracketMatch) {
    return normalizeNutrientName(bracketMatch[1]);
  }

  // Colon ended: "칼슘:" or "칼슘 :"
  const colonMatch = clean.match(/^([가-힣A-Za-z0-9\s·\.,\+및\/\-]+)[:：]\s*$/);
  if (colonMatch) {
    return normalizeNutrientName(colonMatch[1]);
  }

  // functional predicate endings cannot be nutrient headers
  if (/(?:필요|도움|관여|유지|형성|감소|촉진|억제|증식|보호|대사|개선|있음|작용|발생|생성|이용)$/.test(clean)) {
    return null;
  }

  // Tokenize by separators: e.g. "셀레늄.구리.망간", "칼슘, 마그네슘"
  const tokens = clean.split(/[\s,·\.\/\+및]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  const allTokensNutrient = tokens.every((tok) =>
    KNOWN_NUTRIENT_NAMES.some(
      (kn) => kn.replace(/\s+/g, '').toLowerCase() === tok.replace(/\s+/g, '').toLowerCase()
    )
  );

  if (allTokensNutrient && clean.length <= 30) {
    return tokens.map(normalizeNutrientName).join(' · ');
  }

  return null;
}

/**
 * 기능성 문구를 개별 bullet 포인트로 분리
 * - 줄바꿈, 특수 불릿(•, ·, ①-⑩) 및
 * - 문장이 종결어미(필요/도움/있음/개선 등) 뒤 쉼표로 연결된 복합 문구를 깔끔하게 분리
 */
export function splitDescriptionPoints(desc: string): string[] {
  if (!desc) return [];

  const chunks = desc
    .split(/(?:[•·\n\r]+|[①-⑩]+|(?<=[가-힣\)])\s*[\.·]\s*(?=[가-힣①-⑩]))/g)
    .map((s) => s.replace(/^[0-9\.\-\s]+/, '').trim())
    .filter(Boolean);

  const results: string[] = [];
  for (const chunk of chunks) {
    // 필요/도움/있음/개선/증진/억제/원활/줌/관여 뒤의 쉼표에서 분리 (단어 내부의 '탄수화물,지방' 등은 보존)
    const subParts = chunk.split(/(?<=(?:있음|필요|도움|개선|증진|억제|원활|줌|관여))\s*[,，]\s*/g);
    for (const sp of subParts) {
      const clean = sp.replace(/^[0-9\.\-\s]+/, '').trim();
      if (clean && !/^\s*[\-·•]\s*$/.test(clean)) {
        results.push(clean);
      }
    }
  }

  return results;
}

export const KFDA_CLAIM_RULES: { match: RegExp; nutrient: string }[] = [
  { match: /유산균\s*증식|유해균\s*억제|배변활동\s*원활|장\s*건강/i, nutrient: '프로바이오틱스' },
  { match: /탄수화물과\s*에너지\s*대사/i, nutrient: '비타민 B1' },
  { match: /단백질\s*(?:및\s*아미노산)?\s*이용|호모시스테인/i, nutrient: '비타민 B6' },
  { match: /정상적인\s*면역기능|정상적인\s*세포분열/i, nutrient: '아연' },
  { match: /지방[,\s]*탄수화물[,\s]*단백질\s*대사/i, nutrient: '판토텐산' },
  { match: /체내\s*에너지\s*생성/i, nutrient: '비타민 B2' },
  { match: /유해산소로부터\s*세포/i, nutrient: '셀레늄 / 항산화' },
  { match: /칼슘과\s*인이\s*흡수|골다공증|뼈의\s*형성과\s*유지/i, nutrient: '비타민 D' },
  { match: /뼈와\s*치아\s*형성|신경과\s*근육/i, nutrient: '칼슘' },
  { match: /정상적인\s*혈액응고|뼈의\s*구성/i, nutrient: '비타민 K' },
  { match: /산소운반|혈액생성/i, nutrient: '철' },
  { match: /철의\s*운반과\s*이용/i, nutrient: '구리' },
  { match: /갑상선\s*호르몬|신경발달/i, nutrient: '요오드' },
  { match: /뼈\s*형성에\s*필요/i, nutrient: '망간' },
  { match: /체내\s*탄수화물.*대사에\s*관여/i, nutrient: '크롬' },
  { match: /세포와\s*혈액생성|태아\s*신경관/i, nutrient: '엽산' },
  { match: /정상적인\s*엽산\s*대사/i, nutrient: '비타민 B12' },
  { match: /어두운\s*곳에서\s*시각|상피세포/i, nutrient: '비타민 A' },
  { match: /간\s*건강/i, nutrient: '밀크씨슬' },
  { match: /황반색소/i, nutrient: '루테인·지아잔틴' },
  { match: /중성지질\s*개선|혈행\s*개선|건조한\s*눈/i, nutrient: 'EPA 및 DHA(오메가3)' },
  { match: /면역력\s*증진|피로개선|혈소판\s*응집/i, nutrient: '홍삼' },
  { match: /긴장완화/i, nutrient: 'L-테아닌' }
];

/**
 * 기능성 문구 목록에서 영양소별 헤더와 설명을 분리 및 매핑
 */
export function resolveFunctionalClaimsWithNutrients(
  rawClaims: string[],
  ingredients: ProductIngredientEntry[] = []
): ResolvedFunctionalClaim[] {
  const result: ResolvedFunctionalClaim[] = [];
  const assignedNutrients = new Set<string>();
  let currentExplicitHeader = '';

  const hasIngredient = (regex: RegExp) =>
    ingredients.some(
      (ing) =>
        regex.test(ing.englishInn) ||
        regex.test(ing.koreanName || '') ||
        regex.test(ing.functionalCategory || '')
    );

  // 1. 모든 rawClaims를 개별 라인 단위로 풀기
  const flatLines: string[] = [];
  for (const raw of rawClaims) {
    if (!raw) continue;
    const lines = raw.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
    flatLines.push(...lines);
  }

  for (const raw of flatLines) {
    let text = raw.trim();
    if (!text) continue;

    // 접두어 제거: "기능정보 : ", "기능성 : "
    text = text.replace(/^(?:기능\s*정보|기능성|영양\s*·?\s*기능\s*정보)\s*[:：]?\s*/i, '').trim();
    if (!text) continue;

    // A. 줄 자체가 단독 영양소 헤더인 경우 (예: '칼슘', '마그네슘', '[비타민 D]', '셀레늄.구리.망간')
    const standaloneHeader = isNutrientHeader(text);
    if (standaloneHeader) {
      currentExplicitHeader = standaloneHeader;
      continue;
    }

    // B. '[영양소] 기능성 내용' 또는 '영양소: 기능성 내용' 인라인 형태인 경우
    const inlineHeaderMatch = text.match(/^\s*(?:\[([^\]]+)\]|([가-힣A-Za-z0-9\s·\.,및]+)[:：])\s*([\s\S]+)$/);
    if (inlineHeaderMatch) {
      const nutCandidate = (inlineHeaderMatch[1] || inlineHeaderMatch[2] || '').trim();
      const desc = inlineHeaderMatch[3]
        .replace(/^[①-⑩\(\)0-9\.\s]+/, '')
        .replace(/[①-⑩]/g, ', ')
        .trim();
      const verifiedNut = isNutrientHeader(nutCandidate) || normalizeNutrientName(nutCandidate);
      if (verifiedNut && desc) {
        currentExplicitHeader = verifiedNut;
        assignedNutrients.add(verifiedNut);
        result.push({ nutrient: verifiedNut, description: desc });
        continue;
      }
    }

    // C. 앞서 명시적 영양소 헤더(currentExplicitHeader)가 활성화되어 있는 경우
    if (currentExplicitHeader) {
      const cleanDesc = text
        .replace(/^[①-⑩\(\)0-9\.\s]+/, '')
        .replace(/[①-⑩]/g, ', ')
        .trim();
      if (cleanDesc) {
        result.push({ nutrient: currentExplicitHeader, description: cleanDesc });
        assignedNutrients.add(currentExplicitHeader);
        continue;
      }
    }

    // D. 뒤에 (영양소)가 붙어있는 경우 (예: '정상적인 면역기능에 필요 (아연)')
    const parenMatch = text.match(
      /^(.*?)\s*\((비타민[A-Za-z0-9\s]+|아연|엽산|철|칼슘|마그네슘|셀레늄|판토텐산|비오틴|나이아신)\)\s*$/
    );
    if (parenMatch) {
      const nut = normalizeNutrientName(parenMatch[2]);
      const desc = parenMatch[1].replace(/^[①-⑩\(\)0-9\.\s]+/, '').trim();
      result.push({ nutrient: nut, description: desc });
      assignedNutrients.add(nut);
      continue;
    }

    // E. 번호 기호 정돈 및 식약처 고시 기반 영양소 자동 추론 (헤더가 없는 국내 건기식 문구 대응)
    const cleanDesc = text
      .replace(/^[①-⑩\(\)0-9\.\s]+/, '')
      .replace(/[①-⑩]/g, ', ')
      .trim();

    if (!cleanDesc) continue;

    let nutrient = '';
    if (/탄수화물과\s*에너지\s*대사/i.test(cleanDesc)) {
      nutrient = '비타민 B1';
    } else if (/단백질\s*(?:및\s*아미노산)?\s*이용|호모시스테인/i.test(cleanDesc)) {
      nutrient = '비타민 B6';
    } else if (/정상적인\s*면역기능|정상적인\s*세포분열/i.test(cleanDesc)) {
      nutrient = '아연';
    } else if (/지방[,\s]*탄수화물[,\s]*단백질\s*대사/i.test(cleanDesc)) {
      nutrient = hasIngredient(/비오틴/i) && !hasIngredient(/판토텐/i) ? '비오틴' : '판토텐산';
    } else if (/체내\s*에너지\s*생성/i.test(cleanDesc)) {
      if (!assignedNutrients.has('비타민 B2') && hasIngredient(/비타민\s*B2|리보플라빈/i)) {
        nutrient = '비타민 B2';
      } else if (!assignedNutrients.has('나이아신') && hasIngredient(/나이아신|니코틴/i)) {
        nutrient = '나이아신';
      } else if (!assignedNutrients.has('비타민 B2')) {
        nutrient = '비타민 B2';
      } else {
        nutrient = '나이아신';
      }
    } else if (/유산균\s*증식|유해균\s*억제|배변활동\s*원활|장\s*건강/i.test(cleanDesc)) {
      nutrient = '프로바이오틱스';
    } else if (/유해산소로부터\s*세포/i.test(cleanDesc)) {
      if (hasIngredient(/셀레|셀렌/i)) nutrient = '셀레늄';
      else if (hasIngredient(/비타민\s*C|아스코르브/i)) nutrient = '비타민 C';
      else if (hasIngredient(/비타민\s*E|토코페롤/i)) nutrient = '비타민 E';
      else nutrient = '항산화 (셀레늄/비타민C/E)';
    } else if (/칼슘과\s*인이\s*흡수|골다공증|뼈의\s*형성과\s*유지/i.test(cleanDesc)) {
      nutrient = '비타민 D';
    } else if (/뼈와\s*치아\s*형성|신경과\s*근육/i.test(cleanDesc)) {
      nutrient = hasIngredient(/마그네슘/i) && !hasIngredient(/칼슘/i) ? '마그네슘' : '칼슘';
    } else if (/정상적인\s*혈액응고|뼈의\s*구성/i.test(cleanDesc)) {
      nutrient = '비타민 K';
    } else if (/철의\s*운반과\s*이용/i.test(cleanDesc)) {
      nutrient = '구리';
    } else if (/갑상선\s*호르몬|신경발달/i.test(cleanDesc)) {
      nutrient = '요오드';
    } else if (/체내\s*탄수화물.*대사에\s*관여/i.test(cleanDesc)) {
      nutrient = '크롬';
    } else if (/세포와\s*혈액생성|태아\s*신경관/i.test(cleanDesc)) {
      nutrient = '엽산';
    } else if (/정상적인\s*엽산\s*대사/i.test(cleanDesc)) {
      nutrient = '비타민 B12';
    } else if (/어두운\s*곳에서\s*시각|상피세포/i.test(cleanDesc)) {
      nutrient = '비타민 A';
    } else if (/간\s*건강/i.test(cleanDesc)) {
      nutrient = '밀크씨슬';
    } else if (/황반색소/i.test(cleanDesc)) {
      nutrient = '루테인·지아잔틴';
    } else if (/중성지질\s*개선|혈행\s*개선|건조한\s*눈/i.test(cleanDesc)) {
      nutrient = 'EPA 및 DHA(오메가3)';
    } else if (/면역력\s*증진|피로개선|혈소판\s*응집/i.test(cleanDesc)) {
      nutrient = '홍삼';
    } else if (/긴장완화/i.test(cleanDesc)) {
      nutrient = 'L-테아닌';
    }

    if (nutrient) {
      assignedNutrients.add(nutrient);
      result.push({ nutrient, description: cleanDesc });
    } else {
      result.push({ nutrient: '기능성', description: cleanDesc });
    }
  }

  return result;
}

/**
 * 건강기능식품 섭취 시 주의사항(IFTKN_ATNT_MATR_CN) 중복 문구 정제 및 서식 정리
 */
export function deduplicatePrecautionsText(rawText?: string): string {
  if (!rawText || !rawText.trim()) return '등록된 주의사항 정보가 없습니다.';

  // 문장 끝 뒤에 새 번호나 기호가 바로 붙어있는 경우 줄바꿈 삽입
  const preprocessed = rawText
    .replace(/(?<=[.!?])\s*(?=\([0-9가-힣a-zA-Z]\)|[①-⑳⑴-⒇]|[0-9]{1,2}[\.\)])/g, '\n')
    .replace(/(?<=[가-힣a-zA-Z0-9])\s*(?=\([0-9가-힣a-zA-Z]\)|[①-⑳⑴-⒇])/g, '\n');

  const lines = preprocessed
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return '등록된 주의사항 정보가 없습니다.';

  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    if (/^[\[【<].+[\]】>]/.test(line)) {
      if (result.length > 0 && result[result.length - 1] === line) {
        continue;
      }
      result.push(line);
      continue;
    }

    const core = line
      .replace(/^([①-⑳⑴-⒇]|\(?[0-9]{1,2}[\)\.]|\([가-힣a-zA-Z0-9]\)|[·\-•])\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (core && seen.has(core)) {
      continue;
    }

    if (core) {
      seen.add(core);
    }
    result.push(line);
  }

  return result.join('\n\n');
}
