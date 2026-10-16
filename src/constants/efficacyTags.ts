import { ProductItem } from '../types/product';

/**
 * 약국 영양제/일반의약품 카탈로그 표준 효능·증상 태그 목록
 * (사용자 캡처 화면의 효능 분류 체계와 1:1 대응 + 약국 현장 다빈도 상담 키워드)
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
 * 각 표준 효능 태그별 연관 키워드 (태그명, 효능·효과, 성분명/약효분류 자동 매칭용)
 */
const EFFICACY_TAG_KEYWORDS: Record<string, string[]> = {
  '뇌': ['뇌', '기억력', '인지', '치매', '집중력', '수험생', '콜린', '이노시톨', '비스벤티아민', '포스파티딜세린', '은행잎', '징코', 'ginkgo', 'bisbenthiamine', 'choline', 'inositol', 'phosphatidylserine'],
  '혈행': ['혈행', '혈액순환', '수족냉증', '손발저림', '정맥', '오메가3', '은행잎', '징코', '비타민e', '토코페롤', '센텔라', '디오스민', '초임계', 'epa', 'dha', 'tocopherol', 'ginkgo', 'diosmin'],
  '여성': ['여성', '갱년기', '생리', '월경', '질유산균', '감마리놀렌산', '보라지유', '이소플라본', '철분', '엽산', '이노시톨', '크랜베리', '시서스', '피크노제놀'],
  '모발': ['모발', '탈모', '손발톱', '케라틴', '비오틴', '맥주효모', '약용효모', '판토가', '시스틴', '파바', 'biotin', 'l-cystine', 'keratin'],
  '눈': ['눈', '안구건조', '시력', '황반', '루테인', '지아잔틴', '아스타잔틴', '오메가3', '비타민a', '베타카로틴', '빌베리', '콘드로이친', 'lutein', 'zeaxanthin', 'astaxanthin', 'retinol', 'beta-carotene'],
  '간': ['간', '간기능', '해독', '숙취', '담즙', '우르소데옥시콜산', 'udca', '밀크씨슬', '실리마린', '타우린', '아르기닌', '오르니틴', '글루타치온', '메티오닌', 'ursodeoxycholic', 'silymarin', 'milk thistle'],
  '피로': ['피로', '만성피로', '육체피로', '체력', '활력', '에너지', '비타민b', '벤포티아민', '푸르설티아민', '비스벤티아민', '리보플라빈', '피리독신', '메코발라민', '시아노코발라민', '타우린', '아르기닌', '홍삼', '로얄젤리', 'benfotiamine', 'fursultiamine', 'taurine'],
  '수면': ['수면', '불면', '신경안정', '스트레스', '긴장', '마그네슘', '테아닌', '락티움', '감태', '멜라토닌', '트립토판', '가바', 'gaba', 'theanine', 'magnesium'],
  '관절': ['관절', '신경통', '근육통', '연골', '어깨결림', '요통', '콘드로이친', '엠에스엠', 'msm', '보스웰리아', '글루코사민', '초록입홍합', '강황', '커큐민', '메코발라민', '피리독살', 'chondroitin', 'boswellia', 'glucosamine'],
  '항산화': ['항산화', '활성산소', '노화', '비타민c', '아스코르브산', '셀레늄', '코엔자임q10', '코큐텐', '글루타치온', '비타민e', '프로폴리스', '아스타잔틴', '알파리포산', 'ascorbic', 'selenium', 'coenzyme q10', 'ubidecarenone', 'glutathione'],
  '뼈': ['뼈', '골다공증', '골밀도', '치아', '구루병', '칼슘', '비타민d', '콜레칼시페롤', '비타민k', '메나퀴논', '마그네슘', '망간', 'cholecalciferol', 'calcium', 'menaquinone'],
  '빈혈(철)': ['빈혈', '철분', '철', '헤모글로빈', '조혈', '페리틴', '글루콘산철', '푸마르산철', '폴리말토스철', '엽산', '비타민b12', '코발라민', 'iron', 'ferrous', 'ferric', 'folic acid'],
  '면역': ['면역', '아연', '정상적인 면역', '프로폴리스', '홍삼', '인삼', '비타민d', '베타글루칸', '알로에', '초유', '글루콘산아연', '산화아연', 'zinc', 'propolis', 'ginseng'],
  '혈중 지질': ['혈중 지질', '콜레스테롤', '중성지방', '고지혈', '오메가3', '홍국', '모나콜린', '폴리코사놀', '코엔자임q10', '레시틴', '판테틴', 'epa', 'dha', 'monacolin', 'policosanol'],
  '남성': ['남성', '전립선', '지구력', '활력', '쏘팔메토', '로르산', '옥타코사놀', '아르기닌', '마카', '아연', '수박과피', '홍삼', 'saw palmetto', 'octacosanol', 'arginine'],
  '혈당': ['혈당', '당뇨', '인슐린', '내당인자', '크롬', '바나바잎', '코로솔산', '여주', '뽕잎', '이눌린', '난소화성말토덱스트린', '베르베린', '알파리포산', 'chromium', 'corosolic'],
  '피부': ['피부', '구내염', '설염', '구순염', '보습', '여드름', '습진', '콜라겐', '히알루론산', '엘라스틴', '세라마이드', '비타민c', '비타민b2', '리보플라빈', '비오틴', '판토텐산', 'L-시스테인', '글루타치온', 'collagen', 'hyaluronic'],
  '장': ['장', '유산균', '프로바이오틱스', '변비', '설사', '배변', '장내', '프리바이오틱스', '식이섬유', '차전자피', '락토바실러스', '비피도박테리움', '낙산균', '당화균', 'probiotics', 'lactobacillus', 'bifidobacterium'],
  '소화': ['소화', '위장', '속쓰림', '위산', '소화효소', '카무트', '브로멜라인', '파파인', '매스틱검', '양배추', '비타민u', '판크레아틴', '우르소데옥시콜산', '감초'],
  '성장/어린이': ['성장', '어린이', '키즈', '소아', '발육', '청소년', '아미노산', '라이신', '아르기닌', '초유', '칼슘', '비타민d', '아연']
};

/**
 * 특정 제품이 선택된 효능·증상 태그에 부합하는지 판별
 * 1순위: 제품에 직접 등록된 tags 배열에 해당 태그가 포함되어 있는 경우 (완전 일치 또는 부분 포함)
 * 2순위: 표준 효능 태그인 경우 제품의 태그/효능문구/성분명에서 연관 임상 키워드를 스마트 매칭
 */
export function doesProductMatchEfficacyTag(product: ProductItem, selectedTag: string): boolean {
  const cleanSelected = selectedTag.trim().toLowerCase();
  if (!cleanSelected || cleanSelected === '전체' || cleanSelected === 'all') return true;

  // 1. 제품에 직접 설정된 태그(product.tags) 확인
  const hasDirectTag = product.tags.some((t) => {
    const cleanT = t.trim().toLowerCase();
    return cleanT === cleanSelected || cleanT.includes(cleanSelected) || cleanSelected.includes(cleanT);
  });
  if (hasDirectTag) return true;

  // 2. 표준 효능 태그 키워드 사전 기반 스마트 매칭
  const keywords = EFFICACY_TAG_KEYWORDS[selectedTag];
  if (!keywords || keywords.length === 0) {
    return false;
  }

  // 검색 대상 텍스트 풀 구성 (태그 + 효능·효과/기능성 문구 + 성분명 + 약효분류)
  const indications = [
    ...(product.otcDetail?.indicationsKorean || []),
    ...(product.functionalFoodDetail?.functionalClaimsKorean || [])
  ].join(' ').toLowerCase();

  const tagsJoined = product.tags.join(' ').toLowerCase();

  // 효능 문구나 태그에 키워드가 직접 등장하는지 확인
  if (keywords.some((kw) => tagsJoined.includes(kw.toLowerCase()) || indications.includes(kw.toLowerCase()))) {
    return true;
  }

  // 주성분(isMainActive) 또는 고함량 성분의 INN / 한글명 / 약효분류와 매칭
  const ingredientText = product.ingredients
    .map((ing) => `${ing.englishInn} ${ing.koreanName || ''} ${ing.chemicalFormName || ''} ${ing.functionalCategory || ''} ${ing.clinicalSummary || ''}`)
    .join(' ')
    .toLowerCase();

  return keywords.some((kw) => ingredientText.includes(kw.toLowerCase()));
}

/**
 * 제품이 해당하는 표준 효능 태그들을 자동으로 추출하여 반환 (카드 하단 효능 배지 표시용)
 */
export function getMatchedEfficacyTagsForProduct(product: ProductItem): string[] {
  const matched: string[] = [];

  // 1. 사용자가 직접 입력한 태그 중 표준 효능 태그에 해당하는 항목 우선 배치
  for (const stdTag of STANDARD_EFFICACY_TAGS) {
    if (product.tags.some((t) => t.trim() === stdTag)) {
      matched.push(stdTag);
    }
  }

  // 2. 스마트 매칭으로 부합하는 표준 효능 태그 추가
  for (const stdTag of STANDARD_EFFICACY_TAGS) {
    if (!matched.includes(stdTag) && doesProductMatchEfficacyTag(product, stdTag)) {
      matched.push(stdTag);
    }
  }

  return matched;
}
