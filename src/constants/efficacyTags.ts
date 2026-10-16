import { ProductItem } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';

/**
 * 약국 영양제/일반의약품 카탈로그 표준 효능·증상 태그 목록
 * (사용자 캡처 화면의 효능 분류 체계와 1:1 대응)
 */
export const STANDARD_EFFICACY_TAGS: string[] = [
  '뇌',
  '혈행',
  '여성',
  '모발',
  '눈',
  '간',
  '피로',
  '수면',
  '관절',
  '항산화',
  '뼈',
  '빈혈(철)',
  '면역',
  '혈중 지질',
  '남성',
  '혈당',
  '피부',
  '장',
  '소화',
  '성장/어린이'
];

/**
 * 제품에 부여된 태그 문자열(product.tags)과 표준 효능 태그 간 동의어 매핑
 * (성분 전체를 무분별하게 매칭하지 않고, 약사가 설정한 product.tags만을 기준으로 정확하게 매칭)
 */
const TAG_SYNONYM_MAP: Record<string, string[]> = {
  '뇌': ['뇌', '기억력', '인지', '집중력', '치매'],
  '혈행': ['혈행', '혈액순환', '수족냉증', '손발저림', '정맥'],
  '여성': ['여성', '갱년기', '생리', '질유산균'],
  '모발': ['모발', '탈모', '손발톱'],
  '눈': ['눈', '안구건조', '황반', '시력', '루테인'],
  '간': ['간', '간기능', '숙취', '해독', 'udca', '밀크씨슬'],
  '피로': ['피로', '만성피로', '육체피로', '활력', '체력', '고함량활성비타민', '활성비타민'],
  '수면': ['수면', '불면', '신경안정', '스트레스'],
  '관절': ['관절', '신경통', '근육통', '어깨결림', '요통', '연골'],
  '항산화': ['항산화', '노화', '활성산소'],
  '뼈': ['뼈', '골다공증', '골밀도', '치아', '칼슘'],
  '빈혈(철)': ['빈혈(철)', '빈혈', '철분', '조혈'],
  '면역': ['면역', '정상면역', '아연'],
  '혈중 지질': ['혈중 지질', '혈중지질', '콜레스테롤', '중성지방', '고지혈'],
  '남성': ['남성', '전립선', '지구력', '쏘팔메토'],
  '혈당': ['혈당', '당뇨', '인슐린'],
  '피부': ['피부', '구내염', '습진', '보습', '콜라겐'],
  '장': ['장', '유산균', '프로바이오틱스', '배변', '변비'],
  '소화': ['소화', '위장', '속쓰림', '효소'],
  '성장/어린이': ['성장/어린이', '성장', '어린이', '키즈', '성장기어린이']
};

/**
 * 특정 제품이 선택된 효능·증상 태그에 부합하는지 판별
 * 오직 제품에 설정된 태그(product.tags)만을 기준으로 판별하여 다성분 비타민이 모든 태그에 잘못 걸리는 현상을 방지합니다.
 */
export function doesProductMatchEfficacyTag(product: ProductItem, selectedTag: string): boolean {
  const cleanSelected = selectedTag.trim().toLowerCase();
  if (!cleanSelected || cleanSelected === '전체' || cleanSelected === 'all') return true;

  const productTagsLower = (product.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean);

  // 1. 정확히 일치하는 태그가 있는 경우
  if (productTagsLower.includes(cleanSelected)) {
    return true;
  }

  // 2. 표준 효능 태그의 동의어(예: '만성피로' -> '피로')가 product.tags에 있는 경우
  const synonyms = TAG_SYNONYM_MAP[selectedTag];
  if (synonyms) {
    return productTagsLower.some((pt) =>
      synonyms.some((syn) => pt === syn.toLowerCase() || pt.includes(syn.toLowerCase()))
    );
  }

  return false;
}

/**
 * 제품 카드 하단에 표시할 깔끔한 태그 목록 반환
 */
export function getMatchedEfficacyTagsForProduct(product: ProductItem): string[] {
  if (!product.tags || product.tags.length === 0) return [];
  return product.tags;
}

/**
 * 공공API에서 신규 제품을 불러올 때 제품명/주성분 기반으로 초기 효능 태그를 추천해주는 함수
 */
export function inferInitialEfficacyTags(
  productName: string,
  indications: string[],
  ingredients: ProductIngredientEntry[]
): string[] {
  const suggested = new Set<string>();
  const combined = `${productName} ${indications.join(' ')}`.toLowerCase();

  if (/피로|비타민b|벤포티아민|푸르설티아민|타우린|아르기닌|활력/.test(combined)) suggested.add('피로');
  if (/간|우르소|udca|밀크씨슬|실리마린/.test(combined)) suggested.add('간');
  if (/눈|루테인|아스타잔틴|안구|시력/.test(combined)) suggested.add('눈');
  if (/관절|신경통|근육통|콘드로이친|보스웰리아|엠에스엠|msm/.test(combined)) suggested.add('관절');
  if (/뼈|칼슘|골다공증|비타민d/.test(combined)) suggested.add('뼈');
  if (/면역|아연|프로폴리스|홍삼/.test(combined)) suggested.add('면역');
  if (/혈행|오메가|은행잎|징코|혈액순환/.test(combined)) suggested.add('혈행');
  if (/장|프로바이오틱스|유산균|배변/.test(combined)) suggested.add('장');
  if (/수면|락티움|테아닌|마그라민|마그네슘/.test(combined)) suggested.add('수면');
  if (/뇌|기억력|포스파티딜세린|콜린/.test(combined)) suggested.add('뇌');
  if (/항산화|비타민c|셀레늄|코엔자임|글루타치온/.test(combined)) suggested.add('항산화');
  if (/모발|비오틴|탈모|맥주효모|약용효모/.test(combined)) suggested.add('모발');
  if (/빈혈|철분|헤모글로빈/.test(combined)) suggested.add('빈혈(철)');
  if (/콜레스테롤|혈중\s*지질|홍국|폴리코사놀/.test(combined)) suggested.add('혈중 지질');
  if (/혈당|바나바|여주/.test(combined)) suggested.add('혈당');
  if (/여성|갱년기|감마리놀렌산|질유산균/.test(combined)) suggested.add('여성');
  if (/남성|전립선|쏘팔메토|옥타코사놀/.test(combined)) suggested.add('남성');
  if (/피부|콜라겐|히알루론산|구내염/.test(combined)) suggested.add('피부');
  if (/소화|효소|카무트|위장/.test(combined)) suggested.add('소화');
  if (/어린이|키즈|성장/.test(combined)) suggested.add('성장/어린이');

  // 주성분(isMainActive) 확인
  for (const ing of ingredients.filter((i) => i.isMainActive)) {
    const inn = `${ing.englishInn} ${ing.koreanName || ''}`.toLowerCase();
    if (/benfotiamine|fursultiamine|bisbenthiamine|thiamine|riboflavin/.test(inn)) suggested.add('피로');
    if (/ursodeoxycholic|silymarin/.test(inn)) suggested.add('간');
    if (/zinc|propolis/.test(inn)) suggested.add('면역');
    if (/lutein|zeaxanthin|astaxanthin/.test(inn)) suggested.add('눈');
    if (/probiotics|lactobacillus/.test(inn)) suggested.add('장');
    if (/epa|dha|omega|ginkgo/.test(inn)) suggested.add('혈행');
  }

  const arr = Array.from(suggested);
  return arr.length > 0 ? arr.slice(0, 4) : ['피로'];
}
