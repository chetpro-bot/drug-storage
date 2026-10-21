import { ProductIngredientEntry } from '../types/ingredient';

export interface ResolvedFunctionalClaim {
  nutrient: string;
  description: string;
}

export const KFDA_CLAIM_RULES: { match: RegExp; nutrient: string }[] = [
  { match: /유산균\s*증식|유해균\s*억제|배변활동\s*원활|장\s*건강/i, nutrient: '프로바이오틱스' },
  { match: /탄수화물과\s*에너지\s*대사/i, nutrient: '비타민 B1' },
  { match: /단백질\s*(?:및\s*아미노산)?\s*이용|호모시스테인/i, nutrient: '비타민 B6' },
  { match: /정상적인\s*면역기능|세포분열/i, nutrient: '아연' },
  { match: /지방[,\s]*탄수화물[,\s]*단백질\s*대사/i, nutrient: '판토텐산' },
  { match: /체내\s*에너지\s*생성/i, nutrient: '비타민 B2' },
  { match: /유해산소로부터\s*세포/i, nutrient: '셀레늄 / 항산화' },
  { match: /칼슘과\s*인이\s*흡수|골다공증|뼈의\s*형성과\s*유지/i, nutrient: '비타민 D' },
  { match: /뼈와\s*치아\s*형성|신경과\s*근육/i, nutrient: '칼슘 / 마그네슘' },
  { match: /세포와\s*혈액생성|태아\s*신경관/i, nutrient: '엽산' },
  { match: /정상적인\s*엽산\s*대사/i, nutrient: '비타민 B12' },
  { match: /어두운\s*곳에서\s*시각|상피세포/i, nutrient: '비타민 A' },
  { match: /정상적인\s*혈액응고|뼈의\s*구성/i, nutrient: '비타민 K' },
  { match: /산소운반|혈액생성/i, nutrient: '철' },
  { match: /간\s*건강/i, nutrient: '밀크씨슬' },
  { match: /황반색소/i, nutrient: '루테인·지아잔틴' },
  { match: /중성지질\s*개선|혈행\s*개선|건조한\s*눈/i, nutrient: 'EPA 및 DHA(오메가3)' },
  { match: /면역력\s*증진|피로개선|혈소판\s*응집/i, nutrient: '홍삼' },
  { match: /긴장완화/i, nutrient: 'L-테아닌' }
];

/**
 * 기능성 문구 목록에서 누락된 영양소명을 자동 추론하여 [영양소] 뱃지와 설명으로 분리
 */
export function resolveFunctionalClaimsWithNutrients(
  rawClaims: string[],
  ingredients: ProductIngredientEntry[] = []
): ResolvedFunctionalClaim[] {
  const result: ResolvedFunctionalClaim[] = [];
  const assignedNutrients = new Set<string>();
  let currentNutrientHeader = '';

  const hasIngredient = (regex: RegExp) =>
    ingredients.some(
      (ing) =>
        regex.test(ing.englishInn) ||
        regex.test(ing.koreanName || '') ||
        regex.test(ing.functionalCategory || '')
    );

  for (const raw of rawClaims) {
    const text = (raw || '').trim();
    if (!text) continue;

    // A. 줄 전체가 단독 영양소 태그인 경우: '[비타민 B1]'
    const standaloneHeader = text.match(/^\s*\[([^\]]+)\]\s*$/);
    if (standaloneHeader) {
      currentNutrientHeader = standaloneHeader[1].replace(/제품$/, '').trim();
      continue;
    }

    // B. '[영양소] 기능성 내용' 형태인 경우
    const inlineHeader = text.match(/^\s*\[([^\]]+)\]\s*([\s\S]+)$/);
    if (inlineHeader) {
      const nut = inlineHeader[1].replace(/제품$/, '').trim();
      const desc = inlineHeader[2]
        .replace(/^[①-⑩\(\)0-9\.\s]+/, '')
        .replace(/[①-⑩]/g, ', ')
        .trim();
      if (desc) {
        currentNutrientHeader = nut;
        assignedNutrients.add(nut);
        result.push({ nutrient: nut, description: desc });
        continue;
      }
    }

    // C. 앞서 영양소 헤더가 선언된 상태에서의 내용 줄인 경우
    if (currentNutrientHeader) {
      const cleanDesc = text
        .replace(/^[①-⑩\(\)0-9\.\s]+/, '')
        .replace(/[①-⑩]/g, ', ')
        .trim();
      if (cleanDesc) {
        result.push({ nutrient: currentNutrientHeader, description: cleanDesc });
        assignedNutrients.add(currentNutrientHeader);
        continue;
      }
    }

    // D. 뒤에 (영양소)가 붙어있는 경우 (예: '정상적인 면역기능에 필요 (아연)')
    const parenMatch = text.match(
      /^(.*?)\s*\((비타민[A-Za-z0-9\s]+|아연|엽산|철|칼슘|마그네슘|셀레늄|판토텐산|비오틴|나이아신)\)\s*$/
    );
    if (parenMatch) {
      const nut = parenMatch[2].trim();
      const desc = parenMatch[1].replace(/^[①-⑩\(\)0-9\.\s]+/, '').trim();
      result.push({ nutrient: nut, description: desc });
      assignedNutrients.add(nut);
      continue;
    }

    // E. 번호 기호 정돈 및 식약처 고시 기반 영양소 추론
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
    } else if (/면역기능|세포분열/i.test(cleanDesc)) {
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
