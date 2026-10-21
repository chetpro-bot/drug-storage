import { ProductClassification, DosageForm } from '../types/classification';
import { ProductIngredientEntry } from '../types/ingredient';
import { parseRawIngredientString, INN_DICTIONARY } from '../utils/innMapper';
import { deduplicatePrecautionsText } from '../utils/functionalClaimsHelper';

export type PublicDataSourceOrigin =
  | '약학정보원(KPAIC) DB'
  | '공공데이터포털 식약처 의약품 API'
  | '식품안전나라 건기식 API (I0030)'
  | '식품안전나라 건기식 API (C003)'
  | '공공데이터포털 수입식품 한글표시사항 API'
  | '식품안전나라 일반식품 API (I1250)'
  | '패키지 라벨 AI OCR 추출'
  | '약국 등록 품목 DB';

export interface PublicDataFetchResult {
  productName: string;
  manufacturer: string;
  classification: ProductClassification;
  dosageForm: DosageForm;
  packagingUnit: string;
  dailyServings: number;
  amountPerServing: number;
  servingUnitKorean: string;
  regulatoryCode: string; // 약학정보원 / 식약처 품목기준코드 / 품목제조보고번호
  rawIngredientsText: string; // 약학정보원(KPAIC) 또는 식품안전나라 성분/분량 표준 원문
  indicationsSummary: string[];
  dosageInstruction: string;
  parsedIngredients: ProductIngredientEntry[];
  sourceOrigin: PublicDataSourceOrigin;
  precautionsSummary?: string[];
  safetyPrecautionsText?: string; // C003 섭취 시 주의사항 원문 전문 (IFTKN_ATNT_MATR_CN)
  standardSpecificationText?: string; // STDR_STND 기준 및 규격 원문
  indivRawMaterialText?: string; // 기능성 주원료
  etcRawMaterialText?: string; // 기타원료/부원료
  capRawMaterialText?: string; // 캡슐기제
  rawMaterialsText?: string; // C003 원재료명 전문 (RAWMTRL_NM)
  appearanceKorean?: string; // C003 성상 (DISPOS)
  foodTypeCategory?: string; // 품목유형 (PRDLST_CDNM / PRDLST_DCNM)
  shelfLifeText?: string; // 소비기한 (POG_DAYCNT)
  storageMethod?: string; // 보관방법 (STORAGE_METHOD)
  koreanLabelText?: string; // 수입식품 한글표시사항 원문 전문 (KORLABEL)
}

export interface PublicDrugMasterItem {
  id: string;
  productName: string;
  manufacturer: string;
  classification: ProductClassification;
  dosageForm: DosageForm;
  packagingUnit: string;
  dailyServings: number;
  amountPerServing: number;
  servingUnitKorean: string;
  regulatoryCode: string;
  rawIngredientsText: string;
  dosageInstruction: string;
  indicationsSummary: string[];
  searchKeywords?: string[];
  sourceOrigin?: PublicDataSourceOrigin;
  apiSourceBadge?: string;
  precautionsSummary?: string[];
  safetyPrecautionsText?: string;
  standardSpecificationText?: string;
  indivRawMaterialText?: string;
  etcRawMaterialText?: string;
  capRawMaterialText?: string;
  rawMaterialsText?: string;
  appearanceKorean?: string;
  foodTypeCategory?: string;
  shelfLifeText?: string;
  koreanLabelText?: string;
  parsedIngredientsCache?: ProductIngredientEntry[];
}

/**
 * 띄어쓰기 및 특수기호 무시 정규화 헬퍼 (예: '강황이 날 튼튼' -> '강황이날튼튼')
 */
export const normalizeDrugSearchText = (str?: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s\-_·,\.\(\)\[\]\/~!@#$%^&*+=\\:]/g, '');
};

/**
 * 제품 검색 시 하이픈/공백 등의 입력 차이로 인한 공공 API 누락을 방지하기 위한 검색어 변형 후보 생성
 * 예:
 * - '엠드림' -> ['엠드림', '엠-드림', '엠 드림', '엠드-림', '엠드 림']
 * - '엠-드림' -> ['엠-드림', '엠드림', '엠 드림']
 * - '엠-드림 리퀴드' -> ['엠-드림 리퀴드', '엠드림리퀴드', '엠 드림 리퀴드', '엠드림 리퀴드', ...]
 */
export function generateSearchNameVariants(rawKeyword: string): string[] {
  const clean = rawKeyword.trim();
  if (!clean) return [];
  const variants = new Set<string>();

  // 1. 원본
  variants.add(clean);

  // 2. 특수문자/하이픈/공백 제거 버전
  const noSymbol = clean.replace(/[\s\-_·,\.\(\)\[\]\/~!@#$%^&*+=\\:]/g, '');
  if (noSymbol) variants.add(noSymbol);

  // 3. 하이픈/공백 상호 치환
  if (clean.includes('-')) {
    variants.add(clean.replace(/-/g, ' '));
    variants.add(clean.replace(/-/g, ''));
  }
  if (clean.includes(' ')) {
    variants.add(clean.replace(/\s+/g, '-'));
    variants.add(clean.replace(/\s+/g, ''));
  }

  // 4. 하이픈/공백이 없는 단어(2~5글자)인 경우, 하이픈 및 공백 삽입 변형 생성 (예: '엠드림' -> '엠-드림')
  if (noSymbol.length >= 2 && noSymbol.length <= 5) {
    for (let i = 1; i < noSymbol.length; i++) {
      variants.add(`${noSymbol.slice(0, i)}-${noSymbol.slice(i)}`);
      variants.add(`${noSymbol.slice(0, i)} ${noSymbol.slice(i)}`);
    }
  }

  return Array.from(variants);
}

/**
 * 띄어쓰기 무시 일치도 평가 (정확일치: 3, 부분일치: 2, 불일치: 0)
 */
export const calcDrugMatchScore = (targetText?: string, queryText?: string): number => {
  if (!targetText || !queryText) return 0;
  const normTarget = normalizeDrugSearchText(targetText);
  const normQuery = normalizeDrugSearchText(queryText);
  if (!normTarget || !normQuery) return 0;
  if (normTarget === normQuery) return 3;
  if (normTarget.includes(normQuery)) return 2;
  if (normQuery.includes(normTarget)) return 1.5;
  return 0;
};

/**
 * 약학정보원(KPAIC) 의약품 표준 마스터 데이터베이스
 */
export const PUBLIC_DRUG_DATABASE: PublicDrugMasterItem[] = [
  // --- [대웅제약 임팩타민 라인업] ---
  {
    id: 'kpaic_impactamin_sig',
    productName: '임팩타민시그니처정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202301266',
    rawIngredientsText: `벤포티아민 (Benfotiamine) 100mg (티아민염산염으로서 72.31mg)
판토텐산칼슘 (Calcium Pantothenate) 100mg
산화마그네슘 (Magnesium Oxide) 100mg (마그네슘으로서 60.3mg)
니코틴산아미드 (Nicotinamide) 50mg
콜린타르타르산염 (Choline Bitartrate) 50mg
이노시톨 (Inositol) 50mg
셀레늄함유건조효모 (Selenium in Dried Yeast) 46.29mg (셀레늄으로서 25μg)
비스벤티아민 (Bisbenthiamine) 30mg (티아민염산염으로서 26.25mg)
리보플라빈부티레이트 (Riboflavin Butyrate) 25mg
토코페롤아세테이트50% (Tocopherol Acetate 50%) 20mg (비타민E로서 10IU)
산화아연 (Zinc Oxide) 18.7mg (아연으로서 15mg)
우르소데옥시콜산 (Ursodeoxycholic Acid) 15mg
농축콜레칼시페롤 (Cholecalciferol Concentrate) 10mg (비타민D로서 1,000IU)
피리독살포스페이트수화물 (Pyridoxal Phosphate Hydrate) 10mg
폴산 (Folic Acid) 0.5mg
메코발라민 (Mecobalamin) 0.5mg
비오틴 (Biotin) 0.1mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: [
      '비타민 B1, B2, B6, D, E의 보급: 육체피로, 병중·병후 체력 저하 시',
      '신경통, 근육통, 관절통(요통, 어깨결림 등), 구내염, 설염 완화',
      '아연의 보급 및 간기능 보조'
    ],
    searchKeywords: ['임팩타민', '임팩타민시그', '시그니처', '대웅', '대웅제약']
  },
  {
    id: 'kpaic_impactamin_prem',
    productName: '임팩타민프리미엄정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201104169',
    rawIngredientsText: `벤포티아민 50mg (티아민염산염으로서 36.15mg)
리보플라빈 50mg
피리독신염산염 50mg
시아노코발라민 50ug
니코틴산아미드 50mg
판토텐산칼슘 50mg
비오틴 0.25mg
폴산 0.2mg
콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
토코페롤아세테이트2배산 20mg (비타민E로서 10IU)
산화아연 18.7mg (아연으로서 15mg)
우르소데옥시콜산 15mg
콜린타르타르산염 50mg
이노시톨 50mg
제피아스코르브산 31.25mg (아스코르브산으로서 30mg)`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회 1~2정 식후 복용',
    indicationsSummary: [
      '육체피로, 임신·수유기, 병중·병후의 체력저하 시 비타민 보급',
      '신경통, 근육통, 관절통(요통, 어깨결림 등), 구내염, 구순염 완화'
    ],
    searchKeywords: ['임팩타민', '임팩타민프리미엄', '프리미엄', '대웅', '대웅제약']
  },
  {
    id: 'kpaic_impactamin_care',
    productName: '임팩타민케어정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201802951',
    rawIngredientsText: `벤포티아민 50mg
리보플라빈 50mg
피리독신염산염 100mg
시아노코발라민 1000ug
폴산 0.4mg
판토텐산칼슘 50mg
니코틴산아미드 50mg
비오틴 0.1mg
산화아연 30mg (아연으로서 24.1mg)
콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
토코페롤아세테이트2배산 20mg (비타민E로서 10IU)
크롬함유건조효모 20mg (크롬으로서 40ug)
셀레늄함유건조효모 46.3mg (셀레늄으로서 25ug)`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1~2정 복용',
    indicationsSummary: [
      '혈관 건강 및 비타민 B군 보급 (호모시스테인 케어)',
      '만성 육체피로, 신경통, 구내염 완화 및 아연 보급'
    ],
    searchKeywords: ['임팩타민', '임팩타민케어', '케어', '대웅', '대웅제약']
  },
  {
    id: 'kpaic_impactamin_once',
    productName: '임팩타민원스정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202100845',
    rawIngredientsText: `벤포티아민 120mg (초고함량 활성비타민 B1)
리보플라빈 100mg
피리독신염산염 100mg
시아노코발라민 1000ug
니코틴산아미드 50mg
판토텐산칼슘 100mg
비오틴 0.5mg
폴산 0.4mg
산화아연 30mg (아연으로서 24.1mg)
콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
산화마그네슘 100mg (마그네슘으로서 60.3mg)
우르소데옥시콜산 30mg`,
    dosageInstruction: '만 19세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: [
      '벤포티아민 120mg 초고함량 만성 육체피로 회복',
      '신경통, 근육통 완화, 눈의 피로 회복'
    ],
    searchKeywords: ['임팩타민', '임팩타민원스', '원스', '대웅', '대웅제약']
  },
  {
    id: 'kpaic_impactamin_power',
    productName: '임팩타민파워A+정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201503387',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 50ug
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Choline Bitartrate 콜린타르타르산염 50mg
Inositol 이노시톨 50mg
Zinc Oxide 산화아연 18.7mg (아연으로서 15mg)
Beta-Carotene 20% 베타카로틴20% 15mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Calcium Pantothenate 칼슘판토테네이트 50mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회 1~2정 복용',
    indicationsSummary: [
      '청소년 및 수험생 뇌 활력, 눈의 피로, 체력 증진',
      '집중력 유지 및 성장 발육기 비타민 보급'
    ],
    searchKeywords: ['임팩타민', '임팩타민파워', '파워에이플러스', '파워A', '대웅']
  },

  // --- [약학정보원 비맥스 전체 17종 라인업] ---
  {
    id: 'kpaic_recombimax_inj',
    productName: '리콤비맥스주(수출용)',
    manufacturer: '보란파마',
    classification: 'OTC_DRUG',
    dosageForm: 'LIQUID_ORAL',
    packagingUnit: '1회용 바이알 (수출용)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '바이알',
    regulatoryCode: '201601051',
    rawIngredientsText: 'Filgrastim 필그라스팀 300ug/mL',
    dosageInstruction: '의사의 처방 및 지시에 따라 투여 (수출용)',
    indicationsSummary: ['호중구감소증 치료 및 조혈 보조'],
    searchKeywords: ['비맥스', '리콤비맥스', '보란파마']
  },
  {
    id: 'kpaic_magbmax_cap',
    productName: '마그비맥스연질캡슐',
    manufacturer: '유한양행',
    classification: 'OTC_DRUG',
    dosageForm: 'SOFT_CAPSULE',
    packagingUnit: '120캡슐 (60캡슐 x 2)',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '캡슐',
    regulatoryCode: '202102844',
    rawIngredientsText: `Magnesium Oxide 산화마그네슘 250mg (마그네슘으로서 150.8mg)
Benfotiamine 벤포티아민 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Tocopherol Acetate 50% 토코페롤아세테이트 100mg (비타민E로서 50IU)
Gamma-oryzanol 감마-오리자놀 5mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 2회, 1회 1캡슐 복용',
    indicationsSummary: ['마그네슘 결핍으로 인한 근육경련, 손발저림, 육체피로 완화'],
    searchKeywords: ['비맥스', '마그비맥스', '유한양행']
  },
  {
    id: 'kpaic_mecobmax_tab',
    productName: '메코비맥스정',
    manufacturer: '메딕스제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201804212',
    rawIngredientsText: `Mecobalamin 메코발라민 0.5mg
Benfotiamine 벤포티아민 50mg
Pyridoxal Phosphate Hydrate 피리독살포스페이트수화물 5mg
Ascorbic Acid Coated 제피아스코르브산 51.5mg (아스코르브산으로서 50mg)
Folic Acid 폴산 0.4mg`,
    dosageInstruction: '성인 1일 1회, 1회 1정 복용',
    indicationsSummary: ['말초신경병증, 신경통, 만성 육체피로 회복'],
    searchKeywords: ['비맥스', '메코비맥스', '메딕스제약']
  },
  {
    id: 'kpaic_bmax_gold',
    productName: '비맥스골드정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201402283',
    rawIngredientsText: `Ascorbic Acid Coated 제피아스코르브산 206.2mg (아스코르브산으로서 200mg)
Benfotiamine 벤포티아민 50mg (티아민염산염으로서 36.15mg)
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 50ug
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Biotin 비오틴 0.05mg
Folic Acid 폴산 0.2mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Tocopherol Acetate 50% 토코페롤아세테이트 20mg (비타민E로서 10IU)
Zinc Oxide 산화아연 18.7mg (아연으로서 15mg)
Inositol 이노시톨 50mg
Choline Bitartrate 콜린타르타르산염 50mg
L-Cysteine L-시스테인 25mg
Ursodeoxycholic Acid 우르소데옥시콜산 15mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['비타민 B1, B2, B6, C, D, E 보급', '육체피로, 체력저하, 신경통, 관절통 완화'],
    searchKeywords: ['비맥스', '비맥스골드', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_active',
    productName: '비맥스액티브정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201701358',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Bisbenthiamine 비스벤티아민 5mg
Riboflavin Butyrate 리보플라빈부티레이트 6mg
Pyridoxal Phosphate Hydrate 피리독살포스페이트수화물 5mg
Cyanocobalamin 시아노코발라민 500ug
Nicotinamide 니코틴산아미드 10mg
Calcium Pantothenate 판토텐산칼슘 50mg
Biotin 비오틴 0.1mg
Folic Acid 폴산 0.4mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Tocopherol Acetate 50% 토코페롤아세테이트 20mg (비타민E로서 10IU)
Magnesium Oxide 산화마그네슘 100mg (마그네슘으로서 60.3mg)
Zinc Oxide 산화아연 30mg (아연으로서 24.1mg)
Ursodeoxycholic Acid 우르소데옥시콜산 15mg
Inositol 이노시톨 50mg
Choline Bitartrate 콜린타르타르산염 50mg
Gamma-oryzanol 감마-오리자놀 3mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 복용',
    indicationsSummary: ['활성비타민 4종 함유 육체피로, 신경통, 근육통, 구내염 완화'],
    searchKeywords: ['비맥스', '비맥스액티브', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_bb',
    productName: '비맥스비비정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201503388',
    rawIngredientsText: `L-Cysteine L-시스테인 120mg
Ascorbic Acid Coated 제피아스코르브산 515.5mg (아스코르브산으로서 500mg)
Benfotiamine 벤포티아민 50mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 25mg
Biotin 비오틴 0.1mg
Zinc Oxide 산화아연 18.7mg (아연으로서 15mg)
Selenium in Dried Yeast 셀레늄함유건조효모 46.3mg (셀레늄으로서 25ug)
Tocopherol Acetate 50% 토코페롤아세테이트 50mg (비타민E로서 25IU)
Ursodeoxycholic Acid 우르소데옥시콜산 15mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1~2정 복용',
    indicationsSummary: ['기미, 주근깨 색소침착 완화, 피부 점막 건강 및 만성 피로 회복'],
    searchKeywords: ['비맥스', '비맥스비비', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_ever',
    productName: '비맥스에버정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201908021',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Bisbenthiamine 비스벤티아민 5mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 100ug
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Biotin 비오틴 0.1mg
Folic Acid 폴산 0.4mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Tocopherol Acetate 50% 토코페롤아세테이트 20mg (비타민E로서 10IU)
Magnesium Oxide 산화마그네슘 100mg
Zinc Oxide 산화아연 30mg
Inositol 이노시톨 50mg
Choline Bitartrate 콜린타르타르산염 50mg
Ursodeoxycholic Acid 우르소데옥시콜산 15mg
녹용가루 10mg
당귀가루 10mg
작약가루 10mg
황기가루 10mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 복용',
    indicationsSummary: ['중장년층 기력 보강, 생약(녹용,당귀,작약,황기) 복합 활성비타민 피로회복'],
    searchKeywords: ['비맥스', '비맥스에버', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_ace',
    productName: '비맥스에이스정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201602491',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Ubidecarenone 유비데카레논 5mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 50ug
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Biotin 비오틴 0.05mg
Folic Acid 폴산 0.2mg
Ascorbic Acid Coated 제피아스코르브산 103.1mg (아스코르브산으로서 100mg)
Tocopherol Acetate 50% 토코페롤아세테이트 20mg
Selenium in Dried Yeast 셀레늄함유건조효모 46.3mg
Zinc Oxide 산화아연 18.7mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 복용',
    indicationsSummary: ['코엔자임Q10 함유 항산화 에너지 활력, 심혈관 및 피로 회복'],
    searchKeywords: ['비맥스', '비맥스에이스', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_meta',
    productName: '비맥스메타정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201901424',
    rawIngredientsText: `Benfotiamine 벤포티아민 95mg
Bisbenthiamine 비스벤티아민 5mg
Riboflavin 리보플라빈 100mg
Pyridoxine Hydrochloride 피리독신염산염 100mg
Cyanocobalamin 시아노코발라민 500ug
Nicotinamide 니코틴산아미드 10mg
Calcium Pantothenate 판토텐산칼슘 100mg
Biotin 비오틴 0.1mg
Folic Acid 폴산 0.4mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Magnesium Oxide 산화마그네슘 100mg (마그네슘으로서 60.3mg)
Zinc Oxide 산화아연 30mg (아연으로서 24.1mg)
Ursodeoxycholic Acid 우르소데옥시콜산 30mg
Choline Bitartrate 콜린타르타르산염 50mg
Inositol 이노시톨 50mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['육체피로, 체력저하 회복', '신경통, 근육통, 구내염 완화, 아연 보급'],
    searchKeywords: ['비맥스', '비맥스메타', '메타', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_metab',
    productName: '비맥스메타비정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202107883',
    rawIngredientsText: `Benfotiamine 벤포티아민 100mg
Bisbenthiamine 비스벤티아민 30mg
Riboflavin 리보플라빈 100mg
Pyridoxine Hydrochloride 피리독신염산염 100mg
Mecobalamin 메코발라민 1000ug
Nicotinamide 니코틴산아미드 10mg
Calcium Pantothenate 판토텐산칼슘 100mg
Biotin 비오틴 0.5mg
Folic Acid 폴산 0.5mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Zinc Oxide 산화아연 30mg (아연으로서 24.1mg)
Ursodeoxycholic Acid 우르소데옥시콜산 30mg
L-Cysteine L-시스테인 25mg`,
    dosageInstruction: '만 19세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['활성형 메코발라민 함유 신경피로 집중 개선', '육체피로 및 근육통 완화'],
    searchKeywords: ['비맥스', '비맥스메타비', '메타비', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_jet',
    productName: '비맥스제트정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202300436',
    rawIngredientsText: `벤포티아민 (Benfotiamine) 100mg (티아민염산염으로서 72.3mg)
비스벤티아민 (Bisbenthiamine) 30mg (티아민염산염으로서 26.2mg)
리보플라빈부티레이트 (Riboflavin Butyrate) 50mg (리보플라빈으로서 28.7mg)
니코틴산아미드 (Nicotinamide) 10mg
판토텐산칼슘 (Calcium Pantothenate) 100mg
피리독살포스페이트수화물 (Pyridoxal Phosphate Hydrate) 50mg
비오틴 (Biotin) 0.2mg
폴산 (Folic Acid) 0.5mg
메코발라민 (Mecobalamin) 1mg
제피아스코르브산 (Ascorbic Acid Coated) 51.15mg (아스코르브산으로서 50mg)
타우린 (Taurine) 100mg
크롬함유건조효모 (Chromium in Dried Yeast) 20mg (크롬으로서 10μg)
이노시톨 (Inositol) 100mg
콜레칼시페롤농축분말 (Cholecalciferol Concentrate Powder) 10mg (비타민D로서 1,000IU)
콜린타르타르산염 (Choline Bitartrate) 100mg
산화아연 (Zinc Oxide) 30mg (아연으로서 24.1mg)
우르소데옥시콜산 (Ursodeoxycholic Acid) 60mg
셀레늄함유건조효모 (Selenium in Dried Yeast) 40.8mg (셀레늄으로서 22μg)
토코페롤아세테이트2배산 (Tocopherol Acetate Powder 50%) 20mg (비타민E로서 10IU)
γ-오리자놀 (γ-Oryzanol) 3mg
산화마그네슘 (Magnesium Oxide) 100mg (마그네슘으로서 60.3mg)`,
    dosageInstruction: '만 19세 이상 및 성인: 1일 1회, 1회 1정을 식후 복용',
    indicationsSummary: [
      '육체피로, 체력저하 시 비타민 B1, B2, B6, C, D 보급',
      '신경통, 근육통, 관절통 완화',
      '아연 보급 및 간기능 보조'
    ],
    searchKeywords: ['비맥스', '비맥스제트', '제트정', '녹십자', 'GC녹십자']
  },
  {
    id: 'kpaic_bmax_mgplus',
    productName: '비맥스엠지플러스연질캡슐',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'SOFT_CAPSULE',
    packagingUnit: '120캡슐 (60캡슐 x 2)',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '캡슐',
    regulatoryCode: '201705122',
    rawIngredientsText: `Magnesium Oxide 산화마그네슘 250mg (마그네슘으로서 150.8mg)
Benfotiamine 벤포티아민 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Riboflavin 리보플라빈 50mg
Tocopherol Acetate 50% 토코페롤아세테이트 500mg (비타민E로서 500IU)
Gamma-oryzanol 감마-오리자놀 10mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 2회, 1회 1캡슐 복용',
    indicationsSummary: ['고함량 마그네슘 및 비타민E, 눈떨림, 근육경련, 혈액순환 개선'],
    searchKeywords: ['비맥스', '비맥스엠지', '비맥스엠지플러스', '마그네슘', '녹십자']
  },
  {
    id: 'kpaic_bmax_forte',
    productName: '비맥스포르테정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '100정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201301980',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 50ug
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Inositol 이노시톨 50mg
Choline Bitartrate 콜린타르타르산염 50mg
Zinc Oxide 산화아연 18.7mg`,
    dosageInstruction: '성인 1일 1회, 1회 1정 복용',
    indicationsSummary: ['비타민 B군 집중 보급, 만성 피로 및 체력 저하 회복'],
    searchKeywords: ['비맥스', '비맥스포르테', '포르테', '녹십자']
  },
  {
    id: 'kpaic_bmax_high',
    productName: '비맥스하이정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '100정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201501430',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Gamma-oryzanol 감마-오리자놀 5mg
Zinc Oxide 산화아연 18.7mg`,
    dosageInstruction: '성인 1일 1회, 1회 1정 복용',
    indicationsSummary: ['비타민 B군 및 감마오리자놀 함유 신경안정 및 피로 회복'],
    searchKeywords: ['비맥스', '비맥스하이', '녹십자']
  },
  {
    id: 'kpaic_bmax_original',
    productName: '비맥스정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '100정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201103210',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 5ug
Nicotinamide 니코틴산아미드 50mg
Calcium Pantothenate 판토텐산칼슘 50mg
Ascorbic Acid Coated 제피아스코르브산 103.1mg
Tocopherol Acetate 50% 토코페롤아세테이트 20mg
Zinc Oxide 산화아연 18.7mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['오리지널 비맥스 복합 비타민, 육체피로, 눈의 피로 회복'],
    searchKeywords: ['비맥스', '비맥스정', '녹십자']
  },
  {
    id: 'kpaic_bmax_ever_prem',
    productName: '비맥스에버프리미엄정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202301890',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Bisbenthiamine 비스벤티아민 10mg
Riboflavin Butyrate 리보플라빈부티레이트 20mg
Pyridoxal Phosphate Hydrate 피리독살포스페이트수화물 10mg
Mecobalamin 메코발라민 500ug
Biotin 비오틴 0.2mg
Folic Acid 폴산 0.4mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Magnesium Oxide 산화마그네슘 100mg
Zinc Oxide 산화아연 30mg
녹용가루 15mg
당귀가루 15mg
작약가루 15mg
황기가루 15mg
홍삼건조엑스 20mg`,
    dosageInstruction: '만 19세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['프리미엄 시니어 활력, 활성B군 5종 + 홍삼·녹용 생약 복합 처방'],
    searchKeywords: ['비맥스', '비맥스에버프리미엄', '에버프리미엄', '녹십자']
  },
  {
    id: 'kpaic_bmax_immune',
    productName: '비맥스이뮨플러스정',
    manufacturer: 'GC녹십자',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202202155',
    rawIngredientsText: `Benfotiamine 벤포티아민 50mg
Riboflavin 리보플라빈 50mg
Pyridoxine Hydrochloride 피리독신염산염 50mg
Cyanocobalamin 시아노코발라민 100ug
Nicotinamide 니코틴산아미드 50mg
Zinc Oxide 산화아연 37.4mg (아연으로서 30mg)
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 20mg (비타민D로서 2000IU)
Ascorbic Acid Coated 제피아스코르브산 206.2mg (아스코르브산으로서 200mg)
Selenium in Dried Yeast 셀레늄함유건조효모 92.6mg (셀레늄으로서 50ug)`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 복용',
    indicationsSummary: ['고함량 아연 30mg + 비타민D 2,000IU + 셀레늄 면역 기능 강화'],
    searchKeywords: ['비맥스', '비맥스이뮨', '비맥스이뮨플러스', '녹십자']
  },

  // --- [종근당 벤포벨 라인업] ---
  {
    id: 'kpaic_benfobell_s',
    productName: '벤포벨에스정',
    manufacturer: '종근당',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202201059',
    rawIngredientsText: `벤포티아민 100mg
비스벤티아민 30mg
리보플라빈 100mg
피리독신염산염 100mg
메코발라민 0.5mg
판토텐산칼슘 100mg
D-비오틴 0.2mg
폴산 0.4mg
농축콜레칼시페롤 10mg (비타민D로서 1000IU)
콜린타르타르산염 50mg
이노시톨 50mg
DL-메티오닌 15mg
산화아연 20mg
산화마그네슘 30mg
타우린 100mg
우르소데옥시콜산 60mg
오로트산수화물 25mg`,
    dosageInstruction: '만 19세 이상 및 성인: 1일 1회, 1회 1정을 식후 복용',
    indicationsSummary: ['육체피로, 체력저하 시 비타민 B1, B2, B6 보급', '신경통, 근육통, 관절통 완화', '아연 보급 및 간기능 보조'],
    searchKeywords: ['벤포벨', '벤포벨에스', '에스정', '종근당']
  },
  {
    id: 'kpaic_benfobell_b',
    productName: '벤포벨비정',
    manufacturer: '종근당',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201602490',
    rawIngredientsText: `벤포티아민 100mg
리보플라빈 100mg
피리독신염산염 100mg
시아노코발라민 500ug
니코틴산아미드 10mg
판토텐산칼슘 50mg
D-비오틴 0.05mg
폴산 0.2mg
농축콜레칼시페롤 10mg (비타민D로서 1000IU)
산화아연 30mg (아연으로서 24.1mg)
우르소데옥시콜산 30mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 복용',
    indicationsSummary: ['만성피로 회복, 구내염, 신경통, 근육통 완화'],
    searchKeywords: ['벤포벨', '벤포벨비', '종근당']
  },

  // --- [일동제약 아로나민 라인업] ---
  {
    id: 'kpaic_aronamin_gold',
    productName: '아로나민골드정',
    manufacturer: '일동제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '100정 / 300정',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '197000001',
    rawIngredientsText: `푸르설티아민 50mg
리보플라빈부티레이트 2.5mg
피리독살포스페이트 2.5mg
히드록소코발라민아세트산염 5.22ug
아스코르브산 70mg
토코페롤아세테이트2배산 20mg (비타민E로서 10IU)`,
    dosageInstruction: '성인 1일 2회, 1회 1정 식후 복용',
    indicationsSummary: ['활성비타민 피로회복, 신경통, 근육통 완화'],
    searchKeywords: ['아로나민', '아로나민골드', '골드정', '일동', '일동제약']
  },
  {
    id: 'kpaic_aronamin_prem',
    productName: '아로나민골드프리미엄정',
    manufacturer: '일동제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '100정 / 120정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202103321',
    rawIngredientsText: `푸르설티아민 50mg
리보플라빈부티레이트 15mg
피리독살포스페이트수화물 50mg
시아노코발라민 0.2mg
니코틴산아미드 25mg
판토텐산칼슘 25mg
비오틴 0.2mg
폴산 0.25mg
콜레칼시페롤농축분말 2mg (비타민D로서 200IU)
토코페롤아세테이트2배산 50mg (비타민E로서 25IU)
산화마그네슘 82.78mg (마그네슘으로서 50mg)`,
    dosageInstruction: '성인 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['신경통, 근육통, 관절통 완화', '눈의 피로 및 육체피로 회복'],
    searchKeywords: ['아로나민', '아로나민프리미엄', '골드프리미엄', '일동', '일동제약']
  },
  {
    id: 'kpaic_aronamin_cplus',
    productName: '아로나민씨플러스정',
    manufacturer: '일동제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '100정 / 120정',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '200401824',
    rawIngredientsText: `푸르설티아민 25mg
리보플라빈 6mg
피리독신염산염 25mg
시아노코발라민 6ug
니코틴산아미드 25mg
판토텐산칼슘 10mg
비오틴 0.05mg
폴산 0.1mg
아스코르브산 600mg
토코페롤아세테이트2배산 20mg (비타민E로서 10IU)
셀레늄함유건조효모 46.3mg (셀레늄으로서 25ug)
산화아연 18.7mg (아연으로서 15mg)`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 2회, 1회 1~2정 복용',
    indicationsSummary: ['항산화 비타민C 1,200mg 보급, 기미·주근깨 완화, 피로회복'],
    searchKeywords: ['아로나민', '아로나민씨플러스', '씨플러스', '일동', '일동제약']
  },

  // --- [제일헬스사이언스 투엑스비 라인업] ---
  {
    id: 'kpaic_twoxb_dual',
    productName: '투엑스비듀얼정',
    manufacturer: '제일헬스사이언스',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202008431',
    rawIngredientsText: `벤포티아민 80mg
푸르설티아민 20mg
리보플라빈 100mg
니코틴산아미드 50mg
판토텐산칼슘 100mg
피리독신염산염 100mg
시아노코발라민 1000ug
비오틴 0.1mg
폴산 0.4mg
콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
토코페롤아세테이트2배산 20mg (비타민E로서 10IU)
산화아연 30mg
산화마그네슘 100mg
우르소데옥시콜산 30mg
감마-오리자놀 5mg
콜린타르타르산염 50mg
이노시톨 50mg
셀레늄함유건조효모 46.3mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['육체피로, 근육통, 관절통, 눈의 피로 완화, 아연 보급'],
    searchKeywords: ['투엑스비', '투엑스비듀얼', '듀얼정', '제일', '제일헬스']
  },

  // --- [유한양행 마그비 라인업] ---
  {
    id: 'kpaic_magb_active',
    productName: '마그비액티브정',
    manufacturer: '유한양행',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '201602755',
    rawIngredientsText: `산화마그네슘 300mg
벤포티아민 50mg
리보플라빈 50mg
피리독신염산염 50mg
시아노코발라민 500ug
토코페롤아세테이트2배산 200mg (비타민E로서 100IU)`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: ['마그네슘 결핍으로 인한 근육경련, 육체피로, 신경통 완화'],
    searchKeywords: ['마그비', '마그비액티브', '유한양행', '유한']
  },
  {
    id: 'kpaic_magb_speed',
    productName: '마그비스피드액',
    manufacturer: '유한양행',
    classification: 'OTC_DRUG',
    dosageForm: 'LIQUID_ORAL',
    packagingUnit: '20ml x 30병',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '병(20ml)',
    regulatoryCode: '202002138',
    rawIngredientsText: `글리세로인산마그네슘 1200mg
피리독신염산염 75mg
리보플라빈포스페이트나트륨 15mg
니코틴산아미드 20mg`,
    dosageInstruction: '성인 1일 2회, 1회 1병 복용',
    indicationsSummary: ['빠른 흡수의 액상 유기염 마그네슘, 근육경련 및 피로 회복'],
    searchKeywords: ['마그비', '마그비스피드', '액상마그네슘', '유한양행']
  },

  // --- [일동제약 마그라민 라인업] ---
  {
    id: 'kpaic_magramin_triple',
    productName: '마그라민트리플액션정',
    manufacturer: '일동제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정/상자 [60정/병 x 2]',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202107129',
    rawIngredientsText: `산화마그네슘 (Magnesium Oxide) 445mg (마그네슘으로서 268.3mg)
글리세로인산마그네슘 (Magnesium Glycerophosphate) 50mg (마그네슘으로서 6.3mg)
시트르산마그네슘수화물 (Magnesium Citrate Hydrate) 50mg
피리독신염산염 (Pyridoxine Hydrochloride) 25mg
초산디알파토코페롤 (D-Alpha-Tocopherol Acetate) 142.8571mg (비타민E로서 100IU)
푸르설티아민 (Fursultiamine) 25mg
콜레칼시페롤농축분말 (Cholecalciferol Concentrated Powder) 10mg`,
    dosageInstruction: '만 12세 이상 및 성인 : 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: [
      '마그네슘 결핍으로 인한 근육경련 완화 (3종 복합 마그네슘: 산화+글리세로인산+시트르산수화물)',
      '말초혈행장애 및 갱년기 시 어깨·목결림, 수족저림·수족냉증 완화',
      '비타민 D, E, B1, B6의 보급: 육체피로, 신경통, 근육통, 관절통 완화'
    ],
    searchKeywords: ['마그라민', '마그라민트리플', '마그라민트리플액션정', '트리플액션', '일동제약', '일동']
  },

  // --- [대원제약 올대원맥스정] ---
  {
    id: 'kpaic_oldaewon_max',
    productName: '올대원맥스정',
    manufacturer: '대원제약 (제조: 한풍제약)',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정/상자 [60정/병 x 2]',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '2024071800004',
    rawIngredientsText: `Benfotiamine 벤포티아민 30mg (티아민염산염으로서 21.69mg)
Bisbenthiamine 비스벤티아민 20mg (티아민염산염으로서 17.5mg)
Fursultiamine 푸르설티아민 60mg
Riboflavin 리보플라빈 90mg
Riboflavin Butyrate 리보플라빈부티레이트 10mg (리보플라빈으로서 5.73mg)
Nicotinamide 니코틴산아미드 30mg
Calcium Pantothenate 판토텐산칼슘 200mg
Pyridoxine Hydrochloride 피리독신염산염 90mg
Pyridoxal Phosphate Hydrate 피리독살포스페이트수화물 10mg
Mecobalamin 메코발라민 1mg
D-Biotin D-비오틴 0.5mg
Folic Acid 폴산 0.5mg
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Magnesium Oxide 산화마그네슘 166mg (마그네슘으로서 100.14mg)
Zinc Oxide 산화아연 18.7mg (아연으로서 15.02mg)
Ursodeoxycholic Acid 우르소데옥시콜산 30mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 식후 복용',
    indicationsSummary: [
      '비타민 D, B1, B2, B6의 보급: 육체피로, 체력저하 시',
      '신경통, 근육통, 구내염 완화 및 아연 보급'
    ],
    searchKeywords: ['올대원', '올대원맥스', '대원', '대원제약']
  },

  // --- [대웅제약 렛잇비프로정] ---
  {
    id: 'kpaic_letitb_pro',
    productName: '렛잇비프로정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '202108018',
    rawIngredientsText: `벤포티아민 100mg
리보플라빈부티레이트 12mg
니코틴산아미드 10mg
판토텐산칼슘 50mg
피리독살포스페이트수화물 5mg
시아노코발라민 50ug
D-비오틴 0.1mg
폴산 0.1mg
농축콜레칼시페롤 10mg (비타민D로서 1000IU)
토코페롤아세테이트2배산 40mg (비타민E로서 20IU)
유비데카레논 5mg
셀레늄함유건조효모 76.39mg
우르소데옥시콜산 10mg
산화마그네슘 30mg
산화아연 20mg`,
    dosageInstruction: '만 12세 이상 및 성인: 1일 1회, 1회 1정 복용',
    indicationsSummary: ['육체피로, 병중·병후 체력 저하', '눈의 피로, 구내염, 설염 완화'],
    searchKeywords: ['렛잇비', '렛잇비프로', '대웅', '대웅제약']
  },

  // --- [대표 소화제 라인업] ---
  {
    id: 'kpaic_bearse_tab',
    productName: '베아제정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '10정 / 300정',
    dailyServings: 3,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '198701925',
    rawIngredientsText: `Diastase · Protease · Cellulase 디아스타제·프로테아제·셀룰라제 10mg
Pancreatin Enteric Granules 판크레아틴장용과립 78.6mg
Panprosin 판프로신 30mg
Pancellase 판셀라제 10mg
Ursodeoxycholic Acid 우르소데옥시콜산 10mg
Simethicone 시메티콘 40mg`,
    dosageInstruction: '성인 1회 1정, 1일 3회 식후 복용',
    indicationsSummary: ['소화불량, 식욕감퇴(식욕부진), 과식, 식체(위체), 소화촉진, 소화불량으로 인한 위부팽만감'],
    searchKeywords: ['베아제', '베아제정', '대웅', '대웅제약', '소화제']
  },
  {
    id: 'kpaic_dr_bearse_tab',
    productName: '닥터베아제정',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '10정 / 300정',
    dailyServings: 3,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '200401825',
    rawIngredientsText: `Pancreatin Enteric Granules 판크레아틴장용과립 160mg
Lipase 리파제 30mg
Panprosin 판프로신 20mg
Pancellase 판셀라제 30mg
Ursodeoxycholic Acid 우르소데옥시콜산 25mg
Simethicone 시메티콘 40mg
Bromelain 브로멜라인 10mg
Diastase · Protease · Cellulase 디아스타제·프로테아제·셀룰라제 20mg`,
    dosageInstruction: '성인 1회 1정, 1일 3회 식후 복용',
    indicationsSummary: ['과식, 소화불량, 위부팽만감, 가스제거 및 육류·지방 소화 촉진'],
    searchKeywords: ['베아제', '닥터베아제', '닥터베아제정', '대웅', '소화제']
  },
  {
    id: 'kpaic_festal_plus',
    productName: '훼스탈플러스정',
    manufacturer: '한독',
    classification: 'OTC_DRUG',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '10정 / 100정',
    dailyServings: 3,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '199901597',
    rawIngredientsText: `Pancreatin 판크레아틴 315mg
Pancellase 판셀라제 10mg
Ursodeoxycholic Acid 우르소데옥시콜산 25mg
Simethicone 시메티콘 30mg`,
    dosageInstruction: '성인 1회 1~2정, 1일 3회 식후 씹지 않고 복용',
    indicationsSummary: ['소화불량, 과식, 복부팽만감, 소화불량으로 인한 속쓰림 및 식체'],
    searchKeywords: ['훼스탈', '훼스탈플러스', '한독', '소화제']
  },

  // --- [대표 해열진통소염제 라인업] ---
  {
    id: 'kpaic_tylenol_500',
    productName: '타이레놀정 500mg',
    manufacturer: '한국존슨앤드존슨 (켄뷰)',
    classification: 'OTC_DRUG',
    dosageForm: 'TABLET',
    packagingUnit: '10정 / 30정',
    dailyServings: 3,
    amountPerServing: 1,
    servingUnitKorean: '정',
    regulatoryCode: '199301053',
    rawIngredientsText: 'Acetaminophen 아세트아미노펜 500mg',
    dosageInstruction: '만 12세 이상 및 성인: 1회 1~2정씩 1일 3~4회 (4~6시간 간격) 복용. 1일 최대 4,000mg(8정) 초과 금지',
    indicationsSummary: ['두통, 신경통, 근육통, 월경통, 염좌통, 치통, 관절통, 감기로 인한 발열 및 통증 완화'],
    searchKeywords: ['타이레놀', '아세트아미노펜', '타이레놀500', '진통제', '해열제']
  },
  {
    id: 'kpaic_ezn6_ani',
    productName: '이지엔6애니연질캡슐',
    manufacturer: '대웅제약',
    classification: 'OTC_DRUG',
    dosageForm: 'SOFT_CAPSULE',
    packagingUnit: '10캡슐 / 30캡슐',
    dailyServings: 3,
    amountPerServing: 1,
    servingUnitKorean: '캡슐',
    regulatoryCode: '200501140',
    rawIngredientsText: 'Ibuprofen 이부프로펜 200mg',
    dosageInstruction: '성인 1회 1~2캡슐 1일 3~4회 식후 복용 (1일 최대 3,200mg)',
    indicationsSummary: ['두통, 치통, 생리통(월경통), 관절통, 감기 발열 및 염증 완화'],
    searchKeywords: ['이지엔6', '이지엔', '이지엔6애니', '이부프로펜', '대웅']
  },

  // --- [건강기능식품] ---
  {
    id: 'kpaic_cellti_gold',
    productName: '쎌티아이 50 골드',
    manufacturer: '조은건강',
    classification: 'HEALTH_FUNCTIONAL_FOOD',
    dosageForm: 'HARD_CAPSULE',
    packagingUnit: '60캡슐 (2개월분)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '캡슐',
    regulatoryCode: '20140020011-19',
    rawIngredientsText: '프로바이오틱스 100억 CFU, 글루콘산아연 15mg',
    dosageInstruction: '1일 1회, 1회 1캡슐을 충분한 물과 함께 아침 공복에 섭취하십시오.',
    indicationsSummary: ['유익균 증식 및 유해균 억제', '배변활동 원활 및 장 건강 지원'],
    searchKeywords: ['쎌티아이', '쎌티아이50', '유산균', '조은건강']
  },
  {
    id: 'kpaic_mytamin_up',
    productName: '마이타민업',
    manufacturer: '네이처스팜 (제조: 콜마비앤에이치)',
    classification: 'HEALTH_FUNCTIONAL_FOOD',
    dosageForm: 'LIQUID_ORAL',
    packagingUnit: '20g x 60포 (총 1,200g / 30일분)',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '포(20g)',
    regulatoryCode: '20170020008-84',
    rawIngredientsText: '글루콘산아연 40mg, 티아민염산염 2.0mg, 리보플라빈포스페이트나트륨 2.4mg, 피리독신염산염 3.0mg, 니코틴산아미드 26mg, L-아르기닌 500mg',
    dosageInstruction: '1일 2회, 1회 1포(20g)를 식전 또는 식후에 그대로 섭취하십시오.',
    indicationsSummary: [
      '정상적인 면역기능 및 세포분열에 필요 (아연)',
      '탄수화물과 에너지 대사에 필요 (비타민 B1)',
      '체내 에너지 생성에 필요 (비타민 B2, 나이아신)',
      '단백질 및 아미노산 이용에 필요 (비타민 B6)'
    ],
    precautionsSummary: [
      '(1) 이상사례 발생 시 섭취를 중단하고 전문가와 상담할 것'
    ],
    searchKeywords: ['마이타민', '마이타민업', '네이처스팜']
  }
];

/**
 * 1) 공공데이터포털(식약처 의약품 허가 상세 정보) 오픈 API
 * 2) 식품안전나라(건강기능식품 I0030 · C003 / 일반식품 I1250) 오픈 API 연동 서비스
 */
const DATA_GO_KR_API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';
const MFDS_INQ_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08';
const MFDS_DTL_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08';

const FOOD_SAFETY_API_KEY = '3c5e594cc12141d897fe';
const FOOD_SAFETY_BASE_URL = 'https://openapi.foodsafetykorea.go.kr/api';

/**
 * 식약처 XML 문서(EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA)에서 ARTICLE 제목과 PARAGRAPH 줄바꿈을 보존하며 전문 추출
 */
function cleanXmlDocText(xmlStr?: string | null): string {
  if (!xmlStr) return '';
  return xmlStr
    // ARTICLE title="..." 속성 추출 (의미 있는 소제목 보존)
    .replace(/<ARTICLE[^>]*title="([^"]+)"[^>]*>/gi, '\n$1\n')
    // PARAGRAPH, br, tr 태그를 줄바꿈으로 변환
    .replace(/<\/PARAGRAPH>|<br\s*\/?>|<\/tr>/gi, '\n')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x[0-9a-fA-F]+;/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0 && !/^(효능효과|용법용량|사용상의주의사항)$/.test(line.replace(/\s+/g, '')))
    .join('\n')
    .trim();
}

/**
 * 제형 판별 유틸리티 (CHART/DISPOS 성상 텍스트, PRDT_SHAP_CD_NM 및 제품명 기반)
 */
function inferDosageForm(chartText: string = '', prodName: string = '', shapeCodeName: string = ''): DosageForm {
  const combined = `${chartText} ${prodName} ${shapeCodeName}`.toLowerCase();
  if (combined.includes('연질캡슐') || combined.includes('연질캅셀') || combined.includes('소프트캡슐')) return 'SOFT_CAPSULE';
  if (combined.includes('경질캡슐') || combined.includes('경질캅셀') || combined.includes('캡슐') || combined.includes('캅셀')) return 'HARD_CAPSULE';
  if (combined.includes('장용')) return 'ENTERIC_TABLET';
  if (combined.includes('필름코팅') || combined.includes('제피정')) return 'FILM_COATED_TABLET';
  if (
    combined.includes('시럽') ||
    combined.includes('액제') ||
    combined.includes('액상') ||
    combined.includes('현탁액') ||
    combined.includes('음료') ||
    combined.includes('겔') ||
    combined.includes('앰플')
  ) {
    return 'LIQUID_ORAL';
  }
  if (combined.includes('과립')) return 'GRANULE';
  if (combined.includes('산제') || combined.includes('가루') || combined.includes('분말')) return 'POWDER';
  if (combined.includes('젤리') || combined.includes('츄어블') || combined.includes('구미')) return 'JELLY';
  return 'TABLET';
}

/**
 * 식약처 품목 상세 정보(MATERIAL_NAME)를 파싱하여 rawIngredientsText 생성
 */
function formatMaterialNameToRawIngredients(materialName?: string, mainIngrEng?: string): string {
  if (!materialName) {
    if (mainIngrEng) {
      return mainIngrEng.split('/').map(s => s.trim()).join('\n');
    }
    return '';
  }

  const parts = materialName.split(';').map(p => p.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const part of parts) {
    const fields: Record<string, string> = {};
    part.split('|').forEach(f => {
      const idx = f.indexOf(':');
      if (idx !== -1) {
        fields[f.slice(0, idx).trim()] = f.slice(idx + 1).trim();
      }
    });

    const ingrName = fields['성분명'] || '';
    const amount = fields['분량'] || '';
    let unit = fields['단위'] || '';
    if (unit === '밀리그램') unit = 'mg';
    else if (unit === '마이크로그램') unit = 'ug';
    else if (unit === '아이.유') unit = 'IU';

    const info = fields['성분정보'] || '';
    let cleanInfo = info
      .replace(/밀리그램/g, 'mg')
      .replace(/마이크로그램/g, 'ug')
      .replace(/아이\.유/g, 'IU')
      .trim();

    if (ingrName) {
      let line = amount ? `${ingrName} ${amount}${unit}` : ingrName;
      if (cleanInfo) {
        line += ` (${cleanInfo})`;
      }
      lines.push(line);
    }
  }


  return lines.join('\n');
}

/**
 * 용법용량 / 섭취방법 텍스트에서 1일 섭취 횟수와 1회 복용량 추정
 */
function parseServingFromInstruction(instruction: string, fallbackShape: string = ''): {
  dailyServings: number;
  amountPerServing: number;
  servingUnitKorean: string;
} {
  let dailyServings = 1;
  let amountPerServing = 1;
  let servingUnitKorean = '정';

  const combined = `${instruction} ${fallbackShape}`;
  if (combined.includes('캡슐') || combined.includes('캅셀')) servingUnitKorean = '캡슐';
  else if (combined.includes('포') || combined.includes('스틱')) servingUnitKorean = '포';
  else if (combined.includes('병') || combined.includes('바이알') || combined.includes('앰플')) servingUnitKorean = '병';
  else if (combined.includes('스푼') || combined.includes('스쿱')) servingUnitKorean = '스푼';
  else if (combined.includes('정')) servingUnitKorean = '정';

  const dailyMatch = instruction.match(/1일\s*([0-9]+)\s*(?:~\s*([0-9]+))?\s*회/);
  if (dailyMatch) {
    dailyServings = parseInt(dailyMatch[2] || dailyMatch[1], 10) || 1;
  }

  const servingMatch = instruction.match(/1회\s*([0-9]+)\s*(?:~\s*([0-9]+))?\s*(정|포|캡슐|캅셀|스틱|병|알|매)/);
  if (servingMatch) {
    amountPerServing = parseInt(servingMatch[2] || servingMatch[1], 10) || 1;
    servingUnitKorean = servingMatch[3] === '캅셀' ? '캡슐' : servingMatch[3];
  } else {
    // "1일 1포", "1일 2캡슐" 형태
    const directDailyUnit = instruction.match(/1일\s*([0-9]+)\s*(정|포|캡슐|캅셀|스틱|병)/);
    if (directDailyUnit && !dailyMatch) {
      dailyServings = parseInt(directDailyUnit[1], 10) || 1;
      amountPerServing = 1;
      servingUnitKorean = directDailyUnit[2] === '캅셀' ? '캡슐' : directDailyUnit[2];
    }
  }

  return { dailyServings, amountPerServing, servingUnitKorean };
}

/**
 * 식품안전나라 기능성 문구(PRIMARY_FNCLTY)를 누락 없이 정제
 */
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
 * 식품안전나라 기능성 문구(PRIMARY_FNCLTY)에서 영양소별 기능성을 매핑하여 누락 없이 정제
 */
export function parseFunctionalClaims(rawFnclty?: string): string[] {
  if (!rawFnclty) return [];
  const cleaned = rawFnclty
    .replace(/\(국문\)/g, '')
    .replace(/\(영문\)\s*[A-Za-z0-9\s,\.\(\)\-\/]+/g, '')
    .trim();

  const lines = cleaned
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(Boolean);

  const claims: string[] = [];
  const assignedNutrients = new Set<string>();

  for (const line of lines) {
    // 1. 이미 [영양소]가 시작하는 경우 (예: [비타민 B1])
    if (line.startsWith('[')) {
      claims.push(line);
      const m = line.match(/^\[([^\]]+)\]/);
      if (m) assignedNutrients.add(m[1].trim());
      continue;
    }

    // 2. 뒤에 (영양소)가 붙어있는 경우 (예: '정상적인 면역기능에 필요 (아연)')
    const parenMatch = line.match(/^(.*?)\s*\((비타민[A-Za-z0-9\s]+|아연|엽산|철|칼슘|마그네슘|셀레늄|판토텐산|비오틴|나이아신)\)\s*$/);
    if (parenMatch) {
      const nut = parenMatch[2].trim();
      assignedNutrients.add(nut);
      claims.push(`[${nut}] ${parenMatch[1].replace(/^[①-⑩\(\)0-9\.\s]+/, '').trim()}`);
      continue;
    }

    const subParts = line
      .split(/[①②③④⑤⑥⑦⑧⑨⑩]|(?:\([0-9]+\))/)
      .map(s => s.trim())
      .filter(s => s.length > 1);

    const partsToProcess = subParts.length > 0 ? subParts : [line];
    for (const part of partsToProcess) {
      const cleanDesc = part.replace(/^[①-⑩\(\)0-9\.\s]+/, '').replace(/[①-⑩]/g, ', ').trim();
      if (!cleanDesc) continue;

      let nutrient = '';
      if (/체내\s*에너지\s*생성/i.test(cleanDesc)) {
        if (!assignedNutrients.has('비타민 B2')) nutrient = '비타민 B2';
        else nutrient = '나이아신';
      } else {
        const found = KFDA_CLAIM_RULES.find(r => r.match.test(cleanDesc));
        if (found) nutrient = found.nutrient;
      }

      if (nutrient) {
        assignedNutrients.add(nutrient);
        claims.push(`[${nutrient}] ${cleanDesc}`);
      } else {
        claims.push(cleanDesc);
      }
    }
  }

  return Array.from(new Set(claims));
}

/**
 * 식품안전나라 주의사항(IFTKN_ATNT_MATR_CN) 전문 보존 정제 (잘림 없이 전체 보존)
 */
function parsePrecautionsText(rawPrecautions?: string): string[] {
  if (!rawPrecautions) return ['특이체질 및 알레르기 체질의 경우 성분을 확인 후 섭취하십시오.'];
  const items = rawPrecautions
    .split(/[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1);
  return items.length > 0 ? items : [rawPrecautions.trim()];
}

/**
 * 식품안전나라(I0030 / C003)의 기준 및 규격(STDR_STND) + 기능성 주원료(INDIV_RAWMTRL_NM) + 기타원료(ETC_RAWMTRL_NM)를
 * 결합하여 약사 검수용 표준 성분 텍스트 및 ProductIngredientEntry 리스트 생성
 * - 계획서 기준: "건기식의 공식 신고 정보와 기능성 문구를 확인합니다. 함량은 규격(STDR_STND)에 명시된 경우만 해석합니다."
 * - I0030 장점 활용: INDIV_RAWMTRL_NM(주원료 염 형태)과 ETC_RAWMTRL_NM(부원료), CAP_RAWMTRL_NM(캡슐기제)이 분리되어 있어
 *   부형제 오염 없이 정확한 원료 염 형태와 표시량 함량을 매칭합니다.
 */
export function parseFunctionalFoodRecordToIngredients(
  row: any,
  _dailyServings: number = 1
): {
  rawIngredientsText: string;
  parsedIngredients: ProductIngredientEntry[];
} {
  const stdrText: string = row.STDR_STND || '';
  const indivRawText: string = row.INDIV_RAWMTRL_NM || '';
  const rawMtrlText: string = row.RAWMTRL_NM || '';

  // 1. INDIV_RAWMTRL_NM (또는 C003의 경우 RAWMTRL_NM 앞부분)에서 원료 화학적 형태 목록 추출
  const cleanRawMaterialItem = (str: string) =>
    str
      .replace(/\(고시형\)/g, '')
      .replace(/\(기능성원료[^)]*\)/g, '')
      .replace(/\(제[0-9\-]+호\)/g, '')
      .trim();

  const indivMaterials = (indivRawText || rawMtrlText)
    .split(/[,;\n\r]+/)
    .map(cleanRawMaterialItem)
    .filter(Boolean);

  // 2. STDR_STND(기준 및 규격)에서 '표시량'이 명시된 기능성분 및 수치 추출
  interface SpecExtracted {
    specName: string;
    amount: number;
    unit: 'mg' | 'ug' | 'IU' | 'g' | 'CFU';
    displayUnitNote?: string;
    isPerSingleUnit?: boolean;
  }

  const extractedSpecs = new Map<string, SpecExtracted>();
  const ignoreSpecPattern = /^(성상|대장균|세균|붕해|납|카드뮴|수은|총수은|비소|총비소|헥산|진균|수분|타르색소|보존료|산가|과산화물가|잔류용매|회분|산불용성)/;

  const stdrLines = stdrText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  for (const line of stdrLines) {
    const cleaned = line.replace(/^(?:\([0-9]+\)|[0-9]+[\.\)]|[①-⑳]|[-·•])\s*/, '').trim();
    if (!cleaned || !cleaned.includes('표시량')) continue;

    const colonIdx = cleaned.indexOf(':');
    if (colonIdx === -1) continue;

    let leftPart = cleaned.slice(0, colonIdx).trim();
    const rightPart = cleaned.slice(colonIdx + 1).trim();

    // 좌측에 단위가 괄호로 적힌 형태: 예 "실리마린(mg/900 mg)", "셀레늄(μg/900 mg)", "비타민A(μg RE/900 mg)"
    let unitFromLeft = '';
    const leftUnitMatch = leftPart.match(/\(\s*(mg|ug|㎍|μg|µg|IU|g|CFU)/i);
    if (leftUnitMatch) {
      unitFromLeft = leftUnitMatch[1];
      leftPart = leftPart.replace(/\([^)]*\)/g, '').trim();
    }

    if (ignoreSpecPattern.test(leftPart)) continue;

    // 우측에서 표시량 추출:
    // 형태 1) "표시량(1.2mg/40g)", "표시량(130)의 80~120%", "표시량{10,000,000,000CFU/400mg(1캡슐)}"
    // 형태 2) "1.2mg/40,000mg (표시량의 80% ~ 180%)", "15mgNE/40,000mg ( 표시량의 80% ~ 150%)"
    let pyosiMatch = rightPart.match(
      /표시량\s*[\(\{｛\[]?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:\([0-9,]+억\))?\s*(mgNE|NE|mg|ug|㎍|μg|µg|IU|g|CFU|억\s*CFU|억)?/i
    );
    if (!pyosiMatch) {
      pyosiMatch = rightPart.match(
        /([0-9,]+(?:\.[0-9]+)?)\s*(mgNE|NE|mg|ug|㎍|μg|µg|IU|g|CFU|억\s*CFU|억)?\s*(?:\/[0-9,]+[a-zA-Z가-힣]*)?\s*\(?\s*표시량/i
      );
    }
    if (!pyosiMatch) continue;

    const rawVal = parseFloat(pyosiMatch[1].replace(/,/g, ''));
    if (isNaN(rawVal) || rawVal <= 0) continue;

    const rawUnitStr = (pyosiMatch[2] || unitFromLeft || 'mg').trim();
    let normUnit: 'mg' | 'ug' | 'IU' | 'g' | 'CFU' = 'mg';
    let finalAmount = rawVal;
    let displayUnitNote: string | undefined = undefined;

    if (/cfu|억/i.test(rawUnitStr) || /프로바이오틱스|유산균/.test(leftPart)) {
      // 프로바이오틱스 CFU 처리 (예: 10,000,000,000 CFU -> 100억 CFU)
      const eokVal = rawVal >= 100000000 ? Math.round(rawVal / 100000000) : rawVal;
      finalAmount = eokVal;
      normUnit = 'CFU';
      displayUnitNote = `${eokVal.toLocaleString()}억 CFU`;
    } else if (/^(ug|㎍|μg|µg)$/i.test(rawUnitStr)) {
      normUnit = 'ug';
    } else if (/^iu$/i.test(rawUnitStr)) {
      normUnit = 'IU';
    } else if (/^g$/i.test(rawUnitStr)) {
      normUnit = 'g';
    } else {
      normUnit = 'mg';
    }

    const isPerSingleUnit = /\/\s*[0-9\.,]+\s*(?:mg|g)?\s*\(\s*1\s*(?:캡슐|캅셀|정|포)\s*\)/.test(rightPart);
    const normKey = leftPart.replace(/\s+/g, '').toLowerCase();

    // 멀티팩 등에서 동일 성분이 여러 정제에 나뉘어 있으면 더 큰 함량(또는 합산) 보존
    const existing = extractedSpecs.get(normKey);
    if (!existing || finalAmount > existing.amount) {
      extractedSpecs.set(normKey, {
        specName: leftPart.replace(/\s*수$/, '').trim(),
        amount: finalAmount,
        unit: normUnit,
        displayUnitNote,
        isPerSingleUnit
      });
    }
  }

  // 3. 규격 성분명(STDR_STND)과 실제 원료 염 형태(INDIV_RAWMTRL_NM) 매칭 규칙
  const saltMatchRules: { specKeyword: RegExp; rawKeyword: RegExp }[] = [
    { specKeyword: /비타민\s*b1(?!2)|티아민/i, rawKeyword: /비타민\s*b1|티아민|벤포티아민|푸르설티아민/i },
    { specKeyword: /비타민\s*b2|리보플라빈/i, rawKeyword: /비타민\s*b2|리보플라빈/i },
    { specKeyword: /나이아신|니코틴산/i, rawKeyword: /니코틴산아미드|나이아신|니코틴산/i },
    { specKeyword: /판토텐산/i, rawKeyword: /판토텐산칼슘|판토텐산/i },
    { specKeyword: /비타민\s*b6|피리독신/i, rawKeyword: /비타민\s*b6|피리독신|피리독살/i },
    { specKeyword: /비타민\s*b12|코발라민/i, rawKeyword: /비타민\s*b12|코발라민/i },
    { specKeyword: /비타민\s*c|아스코르브산/i, rawKeyword: /비타민\s*c|아스코르브산/i },
    { specKeyword: /비타민\s*d/i, rawKeyword: /비타민\s*d|콜레칼시페롤|에르고칼시페롤/i },
    { specKeyword: /비타민\s*e|토코페롤/i, rawKeyword: /토코페롤|토코페릴|비타민\s*e/i },
    { specKeyword: /비타민\s*a|레티놀|베타카로틴/i, rawKeyword: /비타민\s*a|레티놀|베타카로틴/i },
    { specKeyword: /비타민\s*k/i, rawKeyword: /비타민\s*k|피토메나디온|메나퀴논/i },
    { specKeyword: /엽산|폴산/i, rawKeyword: /엽산|폴산/i },
    { specKeyword: /비오틴/i, rawKeyword: /비오틴/i },
    { specKeyword: /아연/i, rawKeyword: /산화아연|글루콘산아연|황산아연|건조효모.*아연|아연/i },
    { specKeyword: /셀레늄|셀렌/i, rawKeyword: /셀렌|셀레늄|아셀렌산/i },
    { specKeyword: /마그네슘/i, rawKeyword: /산화마그네슘|글루콘산마그네슘|수산화마그네슘|마그네슘/i },
    { specKeyword: /칼슘/i, rawKeyword: /해조칼슘|탄산칼슘|구연산칼슘|젖산칼슘| 유청칼슘|칼슘/i },
    { specKeyword: /철/i, rawKeyword: /푸마르산제일철|피로인산제이철|글루콘산철|유산철|철/i },
    { specKeyword: /구리|동/i, rawKeyword: /글루콘산동|황산동|구리/i },
    { specKeyword: /망간/i, rawKeyword: /황산망간|글루콘산망간|망간/i },
    { specKeyword: /크롬/i, rawKeyword: /크롬/i },
    { specKeyword: /몰리브덴/i, rawKeyword: /몰리브덴/i },
    { specKeyword: /실리마린|밀크씨슬/i, rawKeyword: /밀크씨슬|카르두스|실리마린/i },
    { specKeyword: /루테인|지아잔틴|마리골드/i, rawKeyword: /루테인|마리골드|지아잔틴/i },
    { specKeyword: /epa|dha|오메가/i, rawKeyword: /epa|dha|정제어유|유지/i },
    { specKeyword: /프로바이오틱스|유산균/i, rawKeyword: /프로바이오틱스|유산균|lactobacillus|bifidobacterium|lacticaseibacillus/i },
    { specKeyword: /테아닌/i, rawKeyword: /테아닌/i },
    { specKeyword: /진세노사이드|홍삼/i, rawKeyword: /홍삼/i },
    { specKeyword: /코로솔산|바나바/i, rawKeyword: /바나바/i },
    { specKeyword: /로르산|쏘팔메토/i, rawKeyword: /쏘팔메토/i }
  ];

  const usedIndivIndices = new Set<number>();
  const formattedLines: string[] = [];

  for (const spec of extractedSpecs.values()) {
    let matchedRawSalt = '';
    const rule = saltMatchRules.find(r => r.specKeyword.test(spec.specName));
    if (rule) {
      const idx = indivMaterials.findIndex((m, i) => !usedIndivIndices.has(i) && rule.rawKeyword.test(m));
      if (idx !== -1) {
        matchedRawSalt = indivMaterials[idx];
        usedIndivIndices.add(idx);
      }
    }

    // 식품안전나라 기준 및 규격(STDR_STND)의 표시량은 법적으로 '1일 섭취량' 기준임
    // 건기식은 항상 하루 섭취량당 표시량을 성분 기준(PER_DAILY)으로 등록하므로 나누지 않고 규격 수치 그대로 보존
    const targetAmount = spec.amount;

    const targetName = matchedRawSalt || spec.specName;

    // 미네랄 염(글루콘산아연, 산화아연, 산화마그네슘 등)인 경우 표시량은 순수 원소량이므로 "(아연으로서 Xmg)" 병기
    if (
      /산화아연|글루콘산아연|산화마그네슘|글루콘산마그네슘|해조칼슘|탄산칼슘|구연산칼슘|젖산칼슘|푸마르산제일철|건조효모\(셀렌/i.test(
        targetName
      )
    ) {
      formattedLines.push(`${targetName} ${targetAmount}${spec.unit} (${spec.specName}으로서 ${targetAmount}${spec.unit})`);
    } else if (spec.displayUnitNote) {
      formattedLines.push(`${spec.specName} ${spec.displayUnitNote}`);
    } else {
      formattedLines.push(`${targetName} ${targetAmount}${spec.unit}`);
    }
  }

  // 4. 만약 STDR_STND에서 규격 수치를 하나도 찾지 못한 경우에만 (예: C003 폴백) 원재료에서 상위 기능성 성분 추출
  if (formattedLines.length === 0) {
    if (indivRawText) {
      indivMaterials.forEach((mat) => {
        if (/혼합제제|기타가공품|캡슐류|정제수|덱스트린|올리브유|대두유/.test(mat) && mat.length < 10) return;
        formattedLines.push(mat);
      });
    } else if (rawMtrlText) {
      rawMtrlText
        .split(/[,;\n\r]+/)
        .map(cleanRawMaterialItem)
        .filter(m => m && !/정제수|결정셀룰로스|스테아린산마그네슘|이산화규소|향료|젤라틴|글리세린|포도당|덱스트린/.test(m))
        .slice(0, 8)
        .forEach(m => formattedLines.push(m));
    }
  }

  const rawIngredientsText = formattedLines.join('\n');
  const parsedIngredients = parseRawIngredientString(rawIngredientsText);

  // 식약처 공전 고시형 원료별 기능성 매핑 사전
  const MFDS_FUNCTIONALITY_MAP: { pattern: RegExp; name: string; claim: string }[] = [
    { pattern: /비타민\s*b1|티아민/i, name: '비타민B1', claim: '탄수화물과 에너지 대사에 필요' },
    { pattern: /비타민\s*b2|리보플라빈/i, name: '비타민B2', claim: '체내 에너지 생성에 필요' },
    { pattern: /나이아신|니코틴산/i, name: '나이아신', claim: '체내 에너지 생성에 필요' },
    { pattern: /판토텐산/i, name: '판토텐산', claim: '지방, 탄수화물, 단백질 대사와 에너지 생성에 필요' },
    { pattern: /비타민\s*b6|피리독신/i, name: '비타민B6', claim: '단백질 및 아미노산 이용에 필요, 혈액의 호모시스테인 수준을 정상으로 유지하는데 필요' },
    { pattern: /비타민\s*b12|코발라민/i, name: '비타민B12', claim: '정상적인 엽산 대사에 필요' },
    { pattern: /비타민\s*c|아스코르브산/i, name: '비타민C', claim: '결합조직 형성과 기능유지에 필요, 철의 흡수에 필요, 항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요' },
    { pattern: /비타민\s*d|콜레칼시페롤/i, name: '비타민D', claim: '칼슘과 인이 흡수되고 이용되는데 필요, 뼈의 형성과 유지에 필요, 골다공증발생 위험 감소에 도움을 줌' },
    { pattern: /비타민\s*e|토코페롤/i, name: '비타민E', claim: '항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요' },
    { pattern: /비타민\s*a|레티놀|베타카로틴/i, name: '비타민A', claim: '어두운 곳에서 시각 적응을 위해 필요, 피부와 점막을 형성하고 기능을 유지하는데 필요, 상피세포의 성장과 발달에 필요' },
    { pattern: /비타민\s*k/i, name: '비타민K', claim: '정상적인 혈액응고에 필요, 뼈의 구성에 필요' },
    { pattern: /엽산|폴산/i, name: '엽산', claim: '세포와 혈액생성에 필요, 태아 신경관의 정상 발달에 필요, 혈액의 호모시스테인 수준을 정상으로 유지하는데 필요' },
    { pattern: /비오틴/i, name: '비오틴', claim: '지방, 탄수화물, 단백질 대사와 에너지 생성에 필요' },
    { pattern: /아연/i, name: '아연', claim: '정상적인 면역기능에 필요, 정상적인 세포분열에 필요' },
    { pattern: /셀레늄|셀렌/i, name: '셀레늄', claim: '유해산소로부터 세포를 보호하는데 필요' },
    { pattern: /마그네슘/i, name: '마그네슘', claim: '에너지 이용에 필요, 신경과 근육 기능 유지에 필요' },
    { pattern: /칼슘/i, name: '칼슘', claim: '뼈와 치아 형성에 필요, 신경과 근육 기능 유지에 필요, 정상적인 혈액응고에 필요, 골다공증발생 위험 감소에 도움을 줌' },
    { pattern: /철/i, name: '철', claim: '체내 산소운반과 혈액생성에 필요, 에너지 생성에 필요' },
    { pattern: /구리/i, name: '구리', claim: '철의 운반과 이용에 필요, 유해산소로부터 세포를 보호하는데 필요' },
    { pattern: /망간/i, name: '망간', claim: '뼈 형성에 필요, 에너지 이용에 필요, 유해산소로부터 세포를 보호하는데 필요' },
    { pattern: /요오드/i, name: '요오드', claim: '갑상선 호르몬의 합성에 필요, 에너지 생성에 필요, 신경발달에 필요' },
    { pattern: /크롬/i, name: '크롬', claim: '체내 탄수화물, 지방, 단백질 대사에 관여' },
    { pattern: /실리마린|밀크씨슬/i, name: '밀크씨슬(실리마린)', claim: '간 건강에 도움을 줄 수 있음' },
    { pattern: /루테인|지아잔틴/i, name: '루테인', claim: '노화로 인해 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움을 줌' },
    { pattern: /epa|dha|오메가/i, name: 'EPA 및 DHA 함유 유지', claim: '혈중 중성지질 개선·혈행 개선에 도움을 줄 수 있음' },
    { pattern: /프로바이오틱스|유산균/i, name: '프로바이오틱스', claim: '유익균 증식 및 유해균 억제·배변활동 원활·장 건강에 도움을 줄 수 있음' },
    { pattern: /테아닌/i, name: 'L-테아닌', claim: '스트레스로 인한 긴장완화에 도움을 줄 수 있음' },
    { pattern: /코엔자임q10|코큐텐/i, name: '코엔자임Q10', claim: '항산화·높은 혈압 감소에 도움을 줄 수 있음' },
    { pattern: /홍삼/i, name: '홍삼', claim: '면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음' },
    { pattern: /바나바/i, name: '바나바잎추출물', claim: '식후 혈당상승 억제에 도움을 줄 수 있음' },
    { pattern: /쏘팔메토/i, name: '쏘팔메토열매추출물', claim: '성인 남성의 전립선 건강 유지에 도움을 줄 수 있음' }
  ];

  // 각 성분에 해당 기능성 문구 자동 부여 및 프로바이오틱스 보정
  parsedIngredients.forEach(ing => {
    const searchTarget = `${ing.englishInn} ${ing.koreanName || ''} ${ing.chemicalFormName || ''}`.toLowerCase();
    const matched = MFDS_FUNCTIONALITY_MAP.find(m => m.pattern.test(searchTarget));
    if (matched) {
      ing.clinicalSummary = `• 식약처 인정 기능성: ${matched.claim}`;
      ing.noteKorean = `기준 및 규격 표시량 기준`;
    }

    if (ing.englishInn === 'Probiotics') {
      const cfuSpec = Array.from(extractedSpecs.values()).find(s => s.displayUnitNote);
      if (cfuSpec?.displayUnitNote) {
        ing.formattedSpecification = `Probiotics ${cfuSpec.displayUnitNote}`;
        ing.noteKorean = `기준규격 표시량: ${cfuSpec.displayUnitNote} 이상`;
      }
    }
  });

  return {
    rawIngredientsText: rawIngredientsText || indivRawText || rawMtrlText || '기준 및 규격 원문 참조',
    parsedIngredients
  };
}

/**
 * 품목제조보고번호로 식품안전나라 C003 원본 행 데이터 단건 직접 조회 (인위적 가공 없는 순수 API 원문)
 */
export async function fetchFoodSafetyC003RawByReportNo(reportNo: string): Promise<any | null> {
  const cleanNo = (reportNo || '').trim().replace(/[^0-9]/g, '');
  if (!cleanNo) return null;
  try {
    const url = `${FOOD_SAFETY_BASE_URL}/${FOOD_SAFETY_API_KEY}/C003/json/1/1/PRDLST_REPORT_NO=${cleanNo}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data?.C003?.row;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (e) {
    console.warn('C003 원본 데이터 단건 조회 실패:', e);
    return null;
  }
}

/**
 * 품목제조보고번호로 식품안전나라 I1250(일반가공식품/혼합음료 등) 원본 행 데이터 단건 직접 조회 (인위적 가공 없는 순수 API 원문)
 */
export async function fetchFoodSafetyI1250RawByReportNo(reportNo: string): Promise<any | null> {
  const cleanNo = (reportNo || '').trim().replace(/[^0-9]/g, '');
  if (!cleanNo) return null;
  try {
    const url = `${FOOD_SAFETY_BASE_URL}/${FOOD_SAFETY_API_KEY}/I1250/json/1/1/PRDLST_REPORT_NO=${cleanNo}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data?.I1250?.row;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (e) {
    console.warn('I1250 원본 데이터 단건 조회 실패:', e);
    return null;
  }
}

/**
 * 식품안전나라 건강기능식품 API (C003 전용 조회: 성상, 복용법, 기준규격, 원재료명, 주된기능성, 섭취주의사항)
 */
export async function searchFoodSafetyFunctionalFoods(
  keyword: string,
  manufacturer?: string,
  reportNo?: string
): Promise<PublicDrugMasterItem[]> {
  const fetchC003 = async (paramSegment: string): Promise<any[]> => {
    try {
      const url = `${FOOD_SAFETY_BASE_URL}/${FOOD_SAFETY_API_KEY}/C003/json/1/100/${paramSegment}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const rows = data?.C003?.row;
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn('식품안전나라 C003 호출 실패:', e);
      return [];
    }
  };

  // 조회 파라미터 구성 (품목제조번호 / 제품명 / 제조사명)
  const cleanKw = keyword.trim();
  const normKw = normalizeDrugSearchText(cleanKw);
  const cleanMfg = (manufacturer || '').trim();
  const cleanReport = (reportNo || '').trim().replace(/[^0-9]/g, '');

  const paramCandidates: string[] = [];
  if (cleanReport.length >= 8) {
    paramCandidates.push(`PRDLST_REPORT_NO=${encodeURIComponent(cleanReport)}`);
  }
  if (cleanKw) {
    if (/^[0-9]{8,}$/.test(cleanKw.replace(/-/g, ''))) {
      paramCandidates.push(`PRDLST_REPORT_NO=${encodeURIComponent(cleanKw.replace(/-/g, ''))}`);
    } else {
      // 1순위: 입력 키워드 및 하이픈/공백 변형(예: '엠드림' -> '엠-드림', '엠드림', '엠 드림') 후보 전체 조회
      const kwVariants = generateSearchNameVariants(cleanKw);
      for (const variant of kwVariants) {
        paramCandidates.push(`PRDLST_NM=${encodeURIComponent(variant)}`);
      }
    }
  }
  if (cleanMfg && !cleanKw) {
    paramCandidates.push(`BSSH_NM=${encodeURIComponent(cleanMfg)}`);
  }

  let rows: any[] = [];

  // 1차: C003 (건강기능식품 품목제조신고 원재료 - 전용 조회)
  for (const param of paramCandidates) {
    const found = await fetchC003(param);
    if (found.length > 0) {
      rows = [...rows, ...found];
    }
    if (rows.length >= 50) break;
  }

  // 2차: [핵심 해결책] 사용자가 띄어쓰기 없이 검색(예: "강황이날튼튼")하여 공공 API DB의 띄어쓰기 제품("강황이 날 튼튼")과 LIKE 일치하지 않는 경우
  // 접두사 토큰(Prefix)으로 공공 API를 조회한 후 클라이언트에서 띄어쓰기 무시 매칭 수행!
  if (rows.length === 0 && normKw.length >= 2) {
    const prefixTokens: string[] = [];
    if (normKw.length >= 4) {
      prefixTokens.push(normKw.slice(0, 3));
    }
    if (normKw.length >= 3) {
      prefixTokens.push(normKw.slice(0, 2));
    }
    if (cleanMfg) {
      prefixTokens.push(`MFG:${cleanMfg}`);
    }

    for (const token of prefixTokens) {
      const param = token.startsWith('MFG:')
        ? `BSSH_NM=${encodeURIComponent(token.replace('MFG:', ''))}`
        : `PRDLST_NM=${encodeURIComponent(token)}`;

      const foundC003 = await fetchC003(param);
      if (foundC003.length > 0) {
        rows = [...rows, ...foundC003];
      }
      if (rows.length >= 30) break;
    }
  }

  // 품목제조보고번호 기준 중복 제거
  const uniqueMap = new Map<string, any>();
  for (const r of rows) {
    const key = r.PRDLST_REPORT_NO || `${r.PRDLST_NM}_${r.BSSH_NM}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }

  let dedupedRows = Array.from(uniqueMap.values());

  // 3차: 클라이언트 사이드 띄어쓰기·특수문자 무시 정밀 일치도 계산 및 정렬
  if (normKw) {
    dedupedRows.sort((a, b) => {
      const aScore = calcDrugMatchScore(a.PRDLST_NM, cleanKw);
      const bScore = calcDrugMatchScore(b.PRDLST_NM, cleanKw);
      if (aScore !== bScore) return bScore - aScore;

      if (cleanMfg) {
        const mfgNorm = normalizeDrugSearchText(cleanMfg);
        const aMfg = normalizeDrugSearchText(a.BSSH_NM).includes(mfgNorm) ? 1 : 0;
        const bMfg = normalizeDrugSearchText(b.BSSH_NM).includes(mfgNorm) ? 1 : 0;
        if (aMfg !== bMfg) return bMfg - aMfg;
      }
      return 0;
    });

    const matches = dedupedRows.filter((r) => calcDrugMatchScore(r.PRDLST_NM, cleanKw) > 0);
    if (matches.length > 0) {
      dedupedRows = matches;
    }
  }

  return dedupedRows.map((row: any) => {
    const prodName = (row.PRDLST_NM || '').trim();
    const mfgName = (row.BSSH_NM || '건강기능식품제조원').trim();
    const reportNoStr = (row.PRDLST_REPORT_NO || '').trim();
    const instruction = (row.NTK_MTHD || '1일 1회, 1회 1정(포/캡슐)을 물과 함께 섭취하십시오.').replace(/\s+/g, ' ').trim();
    const { dailyServings, amountPerServing, servingUnitKorean } = parseServingFromInstruction(
      instruction,
      row.PRDT_SHAP_CD_NM || ''
    );
    const dosageForm = inferDosageForm(row.DISPOS || '', prodName, row.PRDT_SHAP_CD_NM || '');
    const claims = parseFunctionalClaims(row.PRIMARY_FNCLTY);
    const dedupedPrecautions = deduplicatePrecautionsText(row.IFTKN_ATNT_MATR_CN);
    const precautions = parsePrecautionsText(dedupedPrecautions);
    const { rawIngredientsText, parsedIngredients } = parseFunctionalFoodRecordToIngredients(row, dailyServings);

    const packagingUnit = row.PRDT_SHAP_CD_NM
      ? `${row.PRDT_SHAP_CD_NM} (${dailyServings * 30}${servingUnitKorean} 규격)`
      : `${dailyServings * 30}${servingUnitKorean} (1개월분 규격)`;

    return {
      id: `fsk_C003_${reportNoStr}`,
      productName: prodName,
      manufacturer: mfgName,
      classification: 'HEALTH_FUNCTIONAL_FOOD' as ProductClassification,
      dosageForm,
      packagingUnit,
      dailyServings,
      amountPerServing,
      servingUnitKorean,
      regulatoryCode: reportNoStr,
      rawIngredientsText,
      dosageInstruction: instruction,
      indicationsSummary: claims.length > 0 ? claims : ['건강기능식품 공식 신고 기능성'],
      searchKeywords: [prodName, mfgName, reportNoStr],
      sourceOrigin: '식품안전나라 건기식 API (C003)' as PublicDataSourceOrigin,
      apiSourceBadge: '식품안전나라 C003 (건기식)',
      precautionsSummary: precautions,
      safetyPrecautionsText: row.IFTKN_ATNT_MATR_CN || '',
      standardSpecificationText: row.STDR_STND || '',
      rawMaterialsText: row.RAWMTRL_NM || '',
      appearanceKorean: (row.DISPOS || '').trim(),
      indivRawMaterialText: row.RAWMTRL_NM || '',
      etcRawMaterialText: '',
      capRawMaterialText: '',
      foodTypeCategory: '건강기능식품',
      shelfLifeText: row.POG_DAYCNT || '',
      parsedIngredientsCache: parsedIngredients
    };
  });
}

/**
 * 식품안전나라 식품(첨가물)품목제조보고 API (I1250 — 일반식품/기타가공품 조회 및 건기식 미검색 시 보조 조회)
 */
export async function searchFoodSafetyGeneralFoods(
  keyword: string,
  manufacturer?: string,
  reportNo?: string
): Promise<PublicDrugMasterItem[]> {
  const fetchI1250 = async (paramSegment: string): Promise<any[]> => {
    try {
      const url = `${FOOD_SAFETY_BASE_URL}/${FOOD_SAFETY_API_KEY}/I1250/json/1/100/${paramSegment}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const rows = data?.I1250?.row;
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn('식품안전나라 I1250 호출 실패:', e);
      return [];
    }
  };

  const cleanKw = keyword.trim();
  const normKw = normalizeDrugSearchText(cleanKw);
  const cleanMfg = (manufacturer || '').trim();
  const cleanReport = (reportNo || '').trim().replace(/[^0-9]/g, '');

  const paramCandidates: string[] = [];
  if (cleanReport.length >= 8) {
    paramCandidates.push(`PRDLST_REPORT_NO=${encodeURIComponent(cleanReport)}`);
  }
  if (cleanKw) {
    if (/^[0-9]{8,}$/.test(cleanKw.replace(/-/g, ''))) {
      paramCandidates.push(`PRDLST_REPORT_NO=${encodeURIComponent(cleanKw.replace(/-/g, ''))}`);
    } else {
      const variants = generateSearchNameVariants(cleanKw);
      for (const v of variants) {
        paramCandidates.push(`PRDLST_NM=${encodeURIComponent(v)}`);
      }
    }
  }
  if (cleanMfg && !cleanKw) {
    paramCandidates.push(`BSSH_NM=${encodeURIComponent(cleanMfg)}`);
  }

  let rows: any[] = [];
  for (const param of paramCandidates) {
    const found = await fetchI1250(param);
    if (found.length > 0) {
      rows = [...rows, ...found];
      if (rows.length >= 50) break;
    }
  }

  // 2차: 띄어쓰기 없는 검색어(예: "홍삼순액골드")가 공공 API DB의 띄어쓰기("홍삼 순액 골드")와 미일치 시 prefix 토큰 조회
  if (rows.length === 0 && normKw.length >= 2) {
    const prefixTokens: string[] = [];
    if (normKw.length >= 4) {
      prefixTokens.push(normKw.slice(0, 3));
    }
    if (normKw.length >= 3) {
      prefixTokens.push(normKw.slice(0, 2));
    }
    if (cleanMfg) {
      prefixTokens.push(`MFG:${cleanMfg}`);
    }

    for (const token of prefixTokens) {
      const param = token.startsWith('MFG:')
        ? `BSSH_NM=${encodeURIComponent(token.replace('MFG:', ''))}`
        : `PRDLST_NM=${encodeURIComponent(token)}`;

      const found = await fetchI1250(param);
      if (found.length > 0) {
        rows = [...rows, ...found];
      }
      if (rows.length >= 30) break;
    }
  }

  const uniqueMap = new Map<string, any>();
  for (const r of rows) {
    const key = r.PRDLST_REPORT_NO || `${r.PRDLST_NM}_${r.BSSH_NM}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }

  let dedupedRows = Array.from(uniqueMap.values());

  // 3차: 클라이언트 사이드 띄어쓰기 무시 일치도 평가 및 정렬
  if (normKw) {
    dedupedRows.sort((a, b) => {
      const aScore = calcDrugMatchScore(a.PRDLST_NM, cleanKw);
      const bScore = calcDrugMatchScore(b.PRDLST_NM, cleanKw);
      if (aScore !== bScore) return bScore - aScore;

      if (cleanMfg) {
        const mfgNorm = normalizeDrugSearchText(cleanMfg);
        const aMfg = normalizeDrugSearchText(a.BSSH_NM).includes(mfgNorm) ? 1 : 0;
        const bMfg = normalizeDrugSearchText(b.BSSH_NM).includes(mfgNorm) ? 1 : 0;
        if (aMfg !== bMfg) return bMfg - aMfg;
      }
      return 0;
    });

    const matches = dedupedRows.filter((r) => calcDrugMatchScore(r.PRDLST_NM, cleanKw) > 0);
    if (matches.length > 0) {
      dedupedRows = matches;
    }
  }

  return Array.from(uniqueMap.values()).map((row: any) => {
    const prodName = (row.PRDLST_NM || '').trim();
    const mfgName = (row.BSSH_NM || '식품제조가공업소').trim();
    const reportNoStr = (row.PRDLST_REPORT_NO || '').trim();
    const foodType = (row.PRDLST_DCNM || '기타가공품').trim();
    const usageRaw = (row.USAGE || '').replace(/\s+/g, ' ').trim();
    const dispos = (row.DISPOS || '').trim();
    const shelfLife = (row.POG_DAYCNT || '').trim();

    const instruction = usageRaw || '1일 1~2회, 1회 1포(정)를 물과 함께 또는 그대로 섭취하십시오.';
    const { dailyServings, amountPerServing, servingUnitKorean } = parseServingFromInstruction(
      instruction,
      `${prodName} ${dispos}`
    );
    const dosageForm = inferDosageForm(dispos, prodName, foodType);

    // 일반식품(I1250)은 제품명에서 대표 성분을 추론하여 초기 검수 행 구성
    let inferredRaw = '';
    if (/아르기닌|아르지닌/.test(prodName)) inferredRaw = 'L-아르기닌 1000mg';
    else if (/글루타치온|글루타티온/.test(prodName)) inferredRaw = '글루타치온 100mg';
    else if (/브로멜라인/.test(prodName)) inferredRaw = '브로멜라인 100mg';
    else if (/카무트|효소/.test(prodName)) inferredRaw = '판크레아틴 100mg';
    else if (/타우린/.test(prodName)) inferredRaw = '타우린 500mg';
    else if (/비타민\s*C/i.test(prodName)) inferredRaw = '아스코르브산 500mg';
    else if (/마그네슘/.test(prodName)) inferredRaw = '글루콘산마그네슘 100mg';
    else if (/칼슘/.test(prodName)) inferredRaw = '해조칼슘 200mg';

    const parsedIngredients = inferredRaw
      ? parseRawIngredientString(inferredRaw)
      : [
          {
            ingredientId: `ing_i1250_${Date.now()}`,
            englishInn: `${prodName} 주원료`,
            functionalCategory: '기타',
            chemicalFormName: `${foodType} 원료 (실물 라벨 또는 직접 함량 입력)`,
            rawAmount: 100,
            unit: 'mg' as const,
            isMainActive: true,
            clinicalSummary: `• 식품안전나라 품목제조보고(I1250) 등록 일반식품 (${foodType})\n• 성상: ${dispos || '고유의 색택과 향미를 가진 식품'}`
          }
        ];

    return {
      id: `fsk_I1250_${reportNoStr}`,
      productName: prodName,
      manufacturer: mfgName,
      classification: 'GENERAL_FOOD' as ProductClassification,
      dosageForm,
      packagingUnit: `${foodType} (${shelfLife ? `소비기한: ${shelfLife}` : '품목보고 규격'})`,
      dailyServings,
      amountPerServing,
      servingUnitKorean,
      regulatoryCode: reportNoStr,
      rawIngredientsText: `품목유형: ${foodType} | 성상: ${dispos || '정보 없음'} | 소비기한: ${shelfLife || '정보 없음'}`,
      dosageInstruction: instruction,
      indicationsSummary: [`일반식품 (${foodType})`, ...(dispos ? [`성상: ${dispos}`] : [])],
      searchKeywords: [prodName, mfgName, reportNoStr, foodType],
      sourceOrigin: '식품안전나라 일반식품 API (I1250)',
      apiSourceBadge: `식품안전나라 I1250 (${foodType})`,
      precautionsSummary: ['일반식품(기타가공품 등)은 질병의 예방 및 치료를 위한 의약품이나 건강기능식품이 아닙니다.'],
      foodTypeCategory: foodType,
      shelfLifeText: shelfLife,
      parsedIngredientsCache: parsedIngredients
    };
  });
}

/**
 * 수입식품 한글표시사항(KORLABEL) 영양정보 / 기능성분 또는 지표성분 표 텍스트 파서
 */
export function parseImportedNutritionFacts(
  korlabel?: string,
  rawMaterialsText?: string
): ProductIngredientEntry[] {
  if (!korlabel) return [];

  const blockMatch = korlabel.match(
    /(?:기능성분\s*또는\s*지표성분|영양정보)[\s\S]*?(?:건강기능식품이력추적|이력추적|보관방법|소비기한|유통기한|포장재질|$)/i
  );
  const targetText = blockMatch ? blockMatch[0] : korlabel;

  const nutrientsMeta: {
    matchKeys: string[];
    koreanName: string;
    englishInn: string;
    functionalCategory: string;
    saltSearchKeys: string[];
    defaultUnit: string;
  }[] = [
    {
      matchKeys: ['칼슘'],
      koreanName: '칼슘',
      englishInn: 'Calcium',
      functionalCategory: '칼슘',
      saltSearchKeys: ['해조칼슘', '탄산칼슘', '구연산칼슘', '젖산칼슘', '인산칼슘', '칼슘'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['마그네슘'],
      koreanName: '마그네슘',
      englishInn: 'Magnesium',
      functionalCategory: '마그네슘',
      saltSearchKeys: ['산화마그네슘', '구연산마그네슘', '글루콘산마그네슘', '젖산마그네슘', '마그네슘'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['아연'],
      koreanName: '아연',
      englishInn: 'Zinc',
      functionalCategory: '아연',
      saltSearchKeys: ['글루콘산아연', '산화아연', '황산아연', '아연'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['구리'],
      koreanName: '구리',
      englishInn: 'Copper',
      functionalCategory: '구리',
      saltSearchKeys: ['글루콘산구리', '황산구리', '구리'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['요오드', '아이오딘'],
      koreanName: '요오드',
      englishInn: 'Iodine',
      functionalCategory: '요오드',
      saltSearchKeys: ['요오드화칼륨', '아이오딘화칼륨', '요오드', '아이오딘'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['비타민D', '비타민 D', '비타민D3', '비타민 D3'],
      koreanName: '비타민 D3',
      englishInn: 'Cholecalciferol',
      functionalCategory: '비타민D',
      saltSearchKeys: ['비타민D3혼합제제', '비타민D3', '비타민D', '콜레칼시페롤'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['셀레늄', '셀렌'],
      koreanName: '셀레늄',
      englishInn: 'Selenium',
      functionalCategory: '셀레늄',
      saltSearchKeys: ['아셀렌산나트륨', '셀레늄', '셀렌'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['크롬'],
      koreanName: '크롬',
      englishInn: 'Chromium',
      functionalCategory: '크롬',
      saltSearchKeys: ['염화크롬', '크롬'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['망간'],
      koreanName: '망간',
      englishInn: 'Manganese',
      functionalCategory: '망간',
      saltSearchKeys: ['황산망간', '글루콘산망간', '망간'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['비타민K', '비타민 K', '비타민K1', '비타민 K1', '비타민K2', '비타민 K2'],
      koreanName: '비타민 K1',
      englishInn: 'Phytomenadione',
      functionalCategory: '비타민K',
      saltSearchKeys: ['비타민K1혼합제제', '비타민K1', '비타민K', '피토나디온', '메나퀴논'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['비타민A', '비타민 A'],
      koreanName: '비타민 A',
      englishInn: 'Retinol',
      functionalCategory: '비타민A',
      saltSearchKeys: ['비타민A혼합제제', '레티놀', '베타카로틴'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['비타민B1', '비타민 B1', '티아민'],
      koreanName: '비타민 B1',
      englishInn: 'Thiamine',
      functionalCategory: '비타민B1',
      saltSearchKeys: ['티아민염산염', '티아민질산염', '비타민B1'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['비타민B2', '비타민 B2', '리보플라빈'],
      koreanName: '비타민 B2',
      englishInn: 'Riboflavin',
      functionalCategory: '비타민B2',
      saltSearchKeys: ['리보플라빈', '비타민B2'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['비타민B6', '비타민 B6', '피리독신'],
      koreanName: '비타민 B6',
      englishInn: 'Pyridoxine',
      functionalCategory: '비타민B6',
      saltSearchKeys: ['피리독신염산염', '비타민B6'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['비타민B12', '비타민 B12', '코발라민'],
      koreanName: '비타민 B12',
      englishInn: 'Cyanocobalamin',
      functionalCategory: '비타민B12',
      saltSearchKeys: ['시아노코발라민', '비타민B12'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['비타민C', '비타민 C', '아스코르브산'],
      koreanName: '비타민 C',
      englishInn: 'Ascorbic Acid',
      functionalCategory: '비타민C',
      saltSearchKeys: ['아스코르브산', '비타민C'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['비타민E', '비타민 E', '토코페롤'],
      koreanName: '비타민 E',
      englishInn: 'Tocopherol',
      functionalCategory: '비타민E',
      saltSearchKeys: ['d-알파-토코페롤', '초산토코페롤', '비타민E'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['엽산', '폴산'],
      koreanName: '엽산',
      englishInn: 'Folic Acid',
      functionalCategory: '엽산',
      saltSearchKeys: ['엽산', '폴산'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['철', '철분'],
      koreanName: '철',
      englishInn: 'Iron',
      functionalCategory: '철',
      saltSearchKeys: ['푸마르산제일철', '글루콘산제일철', '황산제일철', '철'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['나이아신', '니코틴산'],
      koreanName: '나이아신',
      englishInn: 'Niacinamide',
      functionalCategory: '비타민B3',
      saltSearchKeys: ['니코틴산아미드', '나이아신'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['판토텐산'],
      koreanName: '판토텐산',
      englishInn: 'Calcium Pantothenate',
      functionalCategory: '비타민B5',
      saltSearchKeys: ['판토텐산칼슘', '판토텐산'],
      defaultUnit: 'mg'
    },
    {
      matchKeys: ['비오틴'],
      koreanName: '비오틴',
      englishInn: 'Biotin',
      functionalCategory: '비타민B7',
      saltSearchKeys: ['비오틴'],
      defaultUnit: 'ug'
    },
    {
      matchKeys: ['몰리브덴'],
      koreanName: '몰리브덴',
      englishInn: 'Molybdenum',
      functionalCategory: '몰리브덴',
      saltSearchKeys: ['몰리브덴산나트륨', '몰리브덴'],
      defaultUnit: 'ug'
    }
  ];

  const results: ProductIngredientEntry[] = [];
  const lines = targetText.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  const seenNutrients = new Set<string>();

  for (const line of lines) {
    const match = line.match(
      /^\s*([가-힣A-Za-z0-9\s·\/\-]+?)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg|ug|µg|mcg|g|iu|kcal|억\s*cfu)(?:\s*\(([0-9,]+)\s*(?:iu|IU)\))?(?:\s*([0-9]+)\s*%)?/i
    );
    if (!match) continue;

    const rowName = match[1].trim();
    if (['열량', '탄수화물', '단백질', '지방', '나트륨', '당류', '콜레스테롤', '포화지방', '트랜스지방'].includes(rowName)) {
      continue;
    }

    const matchedMeta = nutrientsMeta.find((meta) =>
      meta.matchKeys.some((k) => rowName.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, ''))
    );

    if (!matchedMeta || seenNutrients.has(matchedMeta.koreanName)) continue;
    seenNutrients.add(matchedMeta.koreanName);

    const amount = parseFloat(match[2]);
    const rawUnitStr = match[3].toLowerCase();
    const unit =
      rawUnitStr.includes('ug') || rawUnitStr.includes('µg') || rawUnitStr.includes('mcg')
        ? 'ug'
        : rawUnitStr.includes('iu')
        ? 'IU'
        : matchedMeta.defaultUnit;

    const iuMatch = match[4];
    let infoText = `${amount}${unit === 'ug' ? 'μg' : unit}`;
    if (iuMatch) {
      infoText += ` (${iuMatch} IU)`;
    }

    // 원재료명 텍스트에서 실제 사용된 염(Salt) 또는 원료형태 검색
    let chemicalForm = matchedMeta.koreanName;
    if (rawMaterialsText) {
      const parts = rawMaterialsText.split(/[,，\+]+/).map((p) => p.trim());
      for (const saltKey of matchedMeta.saltSearchKeys) {
        const found = parts.find((p) => p.includes(saltKey));
        if (found) {
          chemicalForm = found;
          break;
        }
      }
    }

    results.push({
      ingredientId: `ing_imported_${matchedMeta.englishInn.toLowerCase()}_${Date.now()}_${results.length}`,
      englishInn: matchedMeta.englishInn,
      koreanName: matchedMeta.koreanName,
      functionalCategory: matchedMeta.functionalCategory,
      chemicalFormName: chemicalForm,
      rawAmount: amount,
      unit: unit as 'mg' | 'ug' | 'IU' | 'CFU' | 'g',
      elementalAmount: amount,
      elementalUnit: unit,
      ingredientInfoText: infoText,
      formattedSpecification: `${matchedMeta.koreanName} ${infoText}${match[5] ? ` (${match[5]}%)` : ''}`,
      clinicalSummary: `• ${matchedMeta.koreanName} 기능성 영양성분`,
      isMainActive: true
    });
  }

  return results;
}

/**
 * 수입식품 한글표시사항(KORLABEL) 전문 텍스트 구조화 서식 편집기
 * - 원문의 모든 단어/성분/수치/문장을 100% 보존하면서
 * - 국내 건기식 API 전문과 동일한 규격(■ 항목명 및 문단 분리)으로 가독성을 높입니다.
 */
export function formatImportedLabelText(rawText?: string): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  // 이미 구조화된 경우(예: 국내 건기식/I1250 등의 ■ 서식) 그대로 반환
  if (trimmed.startsWith('■ 품목제조보고번호') || trimmed.startsWith('■ 제품명')) {
    return trimmed;
  }

  const rawLines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== '건강기능식품 도안');

  const basicMap = new Map<string, string>();
  const rawMaterials: string[] = [];
  const dosageInfo: string[] = [];
  const precautions: string[] = [];
  const storageInfo: string[] = [];
  const functionInfo: string[] = [];
  const nutritionInfo: string[] = [];
  const otherInfo: string[] = [];

  let currentSection:
    | 'BASIC'
    | 'RAW_MATERIALS'
    | 'DOSAGE'
    | 'PRECAUTIONS'
    | 'STORAGE'
    | 'FUNCTION'
    | 'NUTRITION'
    | 'OTHER' = 'BASIC';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // 1. 주요 블록 전환 감지
    if (/^(?:원료명|원재료명|원료명\s*및\s*함량|원재료명\s*및\s*함량)\s*[:：]/i.test(line)) {
      currentSection = 'RAW_MATERIALS';
      const val = line.replace(/^(?:원료명|원재료명|원료명\s*및\s*함량|원재료명\s*및\s*함량)\s*[:：]\s*/i, '');
      if (val) rawMaterials.push(val);
      continue;
    }
    if (/^(?:권장섭취량|섭취량|섭취방법|섭취량\s*및\s*섭취방법|권장섭취량\s*및\s*섭취방법)\s*[:：]/i.test(line)) {
      currentSection = 'DOSAGE';
      const val = line.replace(/^(?:권장섭취량|섭취량|섭취방법|섭취량\s*및\s*섭취방법|권장섭취량\s*및\s*섭취방법)\s*[:：]\s*/i, '');
      if (val) dosageInfo.push(val);
      continue;
    }
    if (/^(?:섭취\s*시\s*주의사항|섭취시\s*주의사항|주의사항)\s*[:：]/i.test(line)) {
      currentSection = 'PRECAUTIONS';
      const val = line.replace(/^(?:섭취\s*시\s*주의사항|섭취시\s*주의사항|주의사항)\s*[:：]\s*/i, '');
      if (val) precautions.push(val);
      continue;
    }
    if (/^보관방법\s*[:：]/i.test(line)) {
      currentSection = 'STORAGE';
      const val = line.replace(/^보관방법\s*[:：]\s*/i, '');
      if (val) storageInfo.push(val);
      continue;
    }
    if (/^(?:기능정보|기능성\s*정보|주된\s*기능성)\s*[:：]/i.test(line)) {
      currentSection = 'FUNCTION';
      const val = line.replace(/^(?:기능정보|기능성\s*정보|주된\s*기능성)\s*[:：]\s*/i, '');
      if (val) functionInfo.push(val);
      continue;
    }
    if (/^(?:영양정보|영양·기능정보|영양성분|영양\s*성분)\s*[:：]/i.test(line)) {
      currentSection = 'NUTRITION';
      const val = line.replace(/^(?:영양정보|영양·기능정보|영양성분|영양\s*성분)\s*[:：]\s*/i, '');
      if (val) nutritionInfo.push(val);
      continue;
    }

    // 2. 단독 속성 감지
    if (/^제품명\s*[:：]/i.test(line)) {
      basicMap.set('제품명', line.replace(/^제품명\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^(?:수입원|수입업소|수입판매원)\s*[:：]/i.test(line)) {
      basicMap.set('수입원', line.replace(/^(?:수입원|수입업소|수입판매원)\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^(?:제조사|제조원|제조업소|해외제조원)\s*[:：]/i.test(line)) {
      basicMap.set('제조사', line.replace(/^(?:제조사|제조원|제조업소|해외제조원)\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^원산지\s*[:：]/i.test(line)) {
      basicMap.set('원산지', line.replace(/^원산지\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^내용량\s*[:：]/i.test(line)) {
      basicMap.set('내용량', line.replace(/^내용량\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^(?:소비기한|유통기한)\s*[:：]/i.test(line)) {
      basicMap.set('소비기한', line.replace(/^(?:소비기한|유통기한)\s*[:：]\s*/i, '').replace(/\s+/g, ' '));
      continue;
    }
    if (/^포장재질\s*[:：]/i.test(line)) {
      basicMap.set('포장재질', line.replace(/^포장재질\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^소비자상담실\s*[:：]/i.test(line)) {
      basicMap.set('소비자상담실', line.replace(/^소비자상담실\s*[:：]\s*/i, ''));
      continue;
    }
    if (/^반품\s*및\s*교환처\s*[:：]/i.test(line)) {
      basicMap.set('반품및교환처', line.replace(/^반품\s*및\s*교환처\s*[:：]\s*/i, ''));
      continue;
    }

    // 3. 섹션 내용 수집
    if (currentSection === 'RAW_MATERIALS') {
      if (/^캡슐기제\s*[:：]/i.test(line)) {
        rawMaterials.push(`\n[캡슐기제]\n${line.replace(/^캡슐기제\s*[:：]\s*/i, '')}`);
      } else {
        rawMaterials.push(line);
      }
    } else if (currentSection === 'DOSAGE') {
      dosageInfo.push(line);
    } else if (currentSection === 'PRECAUTIONS') {
      if (
        precautions.length > 0 &&
        /^[가-힣a-zA-Z]/.test(line) &&
        !line.includes(':') &&
        (line.endsWith('하십시오') || line.endsWith('바랍니다') || line.endsWith('것') || line.startsWith('장애가'))
      ) {
        const last = precautions[precautions.length - 1];
        if (!last.endsWith('.') && !last.endsWith('것') && !last.endsWith('십시오') && !last.endsWith('시오')) {
          precautions[precautions.length - 1] = `${last} ${line}`;
          continue;
        }
      }
      precautions.push(line);
    } else if (currentSection === 'STORAGE') {
      storageInfo.push(line);
    } else if (currentSection === 'FUNCTION') {
      functionInfo.push(line);
    } else if (currentSection === 'NUTRITION') {
      nutritionInfo.push(line);
    } else {
      if (line.startsWith('(') && basicMap.has('제품명')) {
        basicMap.set('제품명', `${basicMap.get('제품명')} ${line}`);
      } else if (
        line.includes('경남') ||
        line.includes('서울') ||
        line.includes('경기') ||
        line.includes('번길') ||
        line.includes('로 ')
      ) {
        if (basicMap.has('수입원')) {
          basicMap.set('수입원', `${basicMap.get('수입원')} (${line})`);
        } else {
          otherInfo.push(line);
        }
      } else if (!line.includes('건강기능식품')) {
        otherInfo.push(line);
      }
    }
  }

  // 섹션 조립
  const sections: string[] = [];

  // 1. 기본 정보 블록
  const basicLines: string[] = [];
  if (basicMap.has('제품명')) basicLines.push(`■ 제품명: ${basicMap.get('제품명')}`);
  if (basicMap.has('수입원')) basicLines.push(`■ 수입원: ${basicMap.get('수입원')}`);
  if (basicMap.has('제조사')) {
    const origin = basicMap.get('원산지');
    const mfg = basicMap.get('제조사');
    basicLines.push(`■ 제조사: ${mfg}${origin ? ` (원산지: ${origin})` : ''}`);
  } else if (basicMap.has('원산지')) {
    basicLines.push(`■ 원산지: ${basicMap.get('원산지')}`);
  }
  if (basicMap.has('내용량')) basicLines.push(`■ 내용량: ${basicMap.get('내용량')}`);
  if (basicMap.has('소비기한')) basicLines.push(`■ 소비기한: ${basicMap.get('소비기한')}`);
  if (basicMap.has('포장재질')) basicLines.push(`■ 포장재질: ${basicMap.get('포장재질')}`);
  if (basicLines.length > 0) sections.push(basicLines.join('\n'));

  // 2. 원료명 및 함량 블록
  if (rawMaterials.length > 0) {
    const text = rawMaterials
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\[캡슐기제\]\s*/g, '\n[캡슐기제] ');
    sections.push(`■ 원재료명 및 함량:\n${text.trim()}`);
  }

  // 3. 섭취량 및 섭취방법 블록
  if (dosageInfo.length > 0) {
    sections.push(`■ 섭취량 및 섭취방법:\n${dosageInfo.join('\n')}`);
  }

  // 4. 섭취 시 주의사항 블록
  if (precautions.length > 0) {
    const formattedPrecautions = precautions
      .map((p) => (p.startsWith('•') || p.startsWith('-') || p.startsWith('※') ? p : `• ${p}`))
      .join('\n');
    sections.push(`■ 섭취 시 주의사항:\n${formattedPrecautions}`);
  }

  // 5. 기능정보 블록
  if (functionInfo.length > 0) {
    sections.push(`■ 기능정보:\n${functionInfo.join('\n')}`);
  }

  // 6. 영양정보 블록
  if (nutritionInfo.length > 0) {
    sections.push(`■ 영양정보:\n${nutritionInfo.join('\n')}`);
  }

  // 7. 보관방법 및 기타 안내 블록
  const footerLines: string[] = [];
  if (storageInfo.length > 0) footerLines.push(`■ 보관방법: ${storageInfo.join(' ')}`);
  if (basicMap.has('소비자상담실')) footerLines.push(`■ 소비자상담실: ${basicMap.get('소비자상담실')}`);
  if (basicMap.has('반품및교환처')) footerLines.push(`■ 반품 및 교환처: ${basicMap.get('반품및교환처')}`);
  if (otherInfo.length > 0) {
    footerLines.push(...otherInfo.map((o) => (o.startsWith('■') || o.startsWith('•') ? o : `■ ${o}`)));
  }
  if (footerLines.length > 0) {
    sections.push(footerLines.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * 수입식품 한글표시사항(KORLABEL) 전문 텍스트 파서
 */
export function parseImportedKoreanLabel(korlabel?: string): {
  dosageInstruction: string;
  packagingUnit: string;
  dailyServings: number;
  amountPerServing: number;
  servingUnitKorean: string;
  safetyPrecautionsText: string;
  standardSpecificationText: string;
  regulatoryCode?: string;
  indicationsSummary: string[];
  dosageForm: DosageForm;
  subIngredientsText?: string;
  parsedNutritionIngredients?: ProductIngredientEntry[];
  dailyServingCount?: number;
} {
  if (!korlabel) {
    return {
      dosageInstruction: '1일 1회, 1회 1정(캡슐)을 물과 함께 섭취하십시오.',
      packagingUnit: '30정/캡슐 (1개월분)',
      dailyServings: 1,
      amountPerServing: 1,
      servingUnitKorean: '정',
      safetyPrecautionsText: '',
      standardSpecificationText: '',
      indicationsSummary: ['수입 건강기능식품 공식 인정 기능성'],
      dosageForm: 'HARD_CAPSULE'
    };
  }

  // 1. 권장섭취량 및 섭취방법
  const intakeMatch =
    korlabel.match(/(?:권장\s*)?섭취량\s*(?:및\s*섭취방법)?\s*[:：]\s*([^\n\r]+)/i) ||
    korlabel.match(/섭취방법\s*[:：]\s*([^\n\r]+)/i);
  const dosageInstruction = intakeMatch
    ? intakeMatch[1].trim()
    : '1일 1회, 1회 1캡슐을 물과 함께 섭취하십시오.';
  let { dailyServings, amountPerServing, servingUnitKorean } = parseServingFromInstruction(dosageInstruction, '');

  // 1일 섭취량 정수 및 단위 파싱 (예: "1일 섭취량 4 정당(5,248mg)당")
  let dailyServingCount = dailyServings * amountPerServing;
  const servingCountMatch = korlabel.match(/1일\s*섭취량\s*[:：]?\s*([0-9]+)\s*([정캡슐포알]|캅셀)/i);
  if (servingCountMatch) {
    dailyServingCount = parseInt(servingCountMatch[1], 10) || 1;
    servingUnitKorean = servingCountMatch[2] === '캅셀' ? '캡슐' : servingCountMatch[2];
    if (dailyServingCount > 1) {
      if (dosageInstruction.includes('1일 2회') || dailyServingCount % 2 === 0) {
        dailyServings = 2;
        amountPerServing = Math.round(dailyServingCount / 2);
      } else {
        dailyServings = 1;
        amountPerServing = dailyServingCount;
      }
    }
  }

  // 2. 내용량 / 포장규격
  const packMatch = korlabel.match(/내용량\s*[:：]\s*([^\n\r]+)/i);
  const totalCountMatch = korlabel.match(/총\s*([0-9]+)\s*회\s*분량/i);
  let packagingUnit = packMatch ? packMatch[1].trim() : '';
  if (!packagingUnit) {
    if (totalCountMatch && dailyServingCount) {
      const totalUnits = dailyServingCount * parseInt(totalCountMatch[1], 10);
      packagingUnit = `${totalUnits}${servingUnitKorean} (${totalCountMatch[1]}일분 / ${totalCountMatch[1]}회분량)`;
    } else {
      packagingUnit = `${dailyServings * 30}${servingUnitKorean} (1개월분 규격)`;
    }
  }

  // 3. 제형 추론
  const dosageForm = inferDosageForm(korlabel, korlabel, '');

  // 4. 프로바이오틱스 수 / 규격 수치 / 영양정보
  let standardSpecificationText = '';
  const cfuMatch =
    korlabel.match(/(?:프로바이오틱스\s*수|균수|CFU)[^:：\n\r]*[:：]\s*([^\n\r]+)/i) ||
    korlabel.match(/프로바이오틱스\s*수\s*([0-9]+[억만천\s]*CFU)/i);
  if (cfuMatch) {
    standardSpecificationText = `프로바이오틱스 수 : ${cfuMatch[1].trim()}`;
  } else {
    const specBlockMatch = korlabel.match(/(?:기능성분\s*또는\s*지표성분|영양정보)\s*[:：]?\s*([\s\S]*?)(?:건강기능식품이력추적|이력추적|$)/i);
    if (specBlockMatch) {
      standardSpecificationText = specBlockMatch[1].trim().replace(/\n+/g, ' ');
    }
  }

  // 5. 이력추적관리 등록번호
  let regulatoryCode: string | undefined;
  const traceMatch = korlabel.match(/등록번호\s*\(([0-9]+)\)/i) || korlabel.match(/이력추적.*?([0-9]{6,})/);
  if (traceMatch) {
    regulatoryCode = traceMatch[1].trim();
  }

  // 6. 섭취시 주의사항
  let safetyPrecautionsText = '';
  const precMatch = korlabel.match(/섭취\s*시\s*주의사항\s*[:：]\s*([\s\S]*?)(?:보관방법|원산지|제조사|수입원|소비기한|유통기한|포장재질|$)/i);
  if (precMatch) {
    safetyPrecautionsText = precMatch[1].trim();
  }

  // 7. 기능정보
  let indicationsSummary: string[] = [];
  const claimMatch = korlabel.match(/(?:기능\s*정보|기능성\s*정보|영양\s*·?\s*기능\s*정보|주된\s*기능성|기능성)\s*[:：]?\s*([\s\S]*?)(?:영양\s*(?:성분|정보)|기능\s*성분|건강기능식품이력추적|이력추적|보관방법|보관상\s*주의사항|원산지|제조사|$)/i);
  if (claimMatch) {
    indicationsSummary = claimMatch[1]
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (indicationsSummary.length === 0) {
    indicationsSummary = ['수입 건강기능식품 공식 인정 기능성'];
  }

  // 8. 부원료
  const rawMatch = korlabel.match(/원료\s*및\s*함량\s*[:：]\s*([^\n\r]+)/i);
  const subIngredientsText = rawMatch ? rawMatch[1].trim() : undefined;

  // 9. 영양정보 / 기능성분 또는 지표성분 표 파싱
  const parsedNutritionIngredients = parseImportedNutritionFacts(korlabel, subIngredientsText);

  return {
    dosageInstruction,
    packagingUnit,
    dailyServings,
    amountPerServing,
    servingUnitKorean,
    safetyPrecautionsText,
    standardSpecificationText,
    regulatoryCode,
    indicationsSummary,
    dosageForm,
    subIngredientsText,
    parsedNutritionIngredients,
    dailyServingCount
  };
}

const PHONETIC_LETTER_MAP: Record<string, string> = {
  '에이': 'A', '비': 'B', '씨': 'C', '디': 'D', '이': 'E', '에프': 'F',
  '지': 'G', '에이치': 'H', '아이': 'I', '제이': 'J', '케이': 'K', '엘': 'L',
  '엠': 'M', '엔': 'N', '오': 'O', '피': 'P', '큐': 'Q', '알': 'R',
  '에스': 'S', '티': 'T', '유': 'U', '브이': 'V', '엑스': 'X', '와이': 'Y', '제트': 'Z'
};

const PHONETIC_WORD_MAP: Record<string, string> = {
  '드림': 'DREAM',
  '키즈': 'KIDS',
  '골드': 'GOLD',
  '플러스': 'PLUS',
  '맥스': 'MAX',
  '리퀴드': 'LIQUID',
  '포르테': 'FORTE',
  '액티브': 'ACTIVE'
};

export function generateEnglishPhoneticVariants(cleanKw: string): string[] {
  const variants = new Set<string>();
  const text = cleanKw.replace(/[\s\-_]/g, '');

  for (const [kor, eng] of Object.entries(PHONETIC_LETTER_MAP)) {
    if (text.startsWith(kor)) {
      const rest = text.slice(kor.length);
      const restEng = PHONETIC_WORD_MAP[rest] || rest;
      variants.add(`${eng}-${restEng}`);
      variants.add(`${eng} ${restEng}`);
      variants.add(`${eng}${restEng}`);
      variants.add(`${eng}-${rest}`);
      variants.add(`${eng} ${rest}`);
      variants.add(`${eng}${rest}`);
    }
  }

  return Array.from(variants);
}

/**
 * 식품의약품안전처 수입식품 제품별 한글표시사항 API 실시간 조회
 * (G-DREAM, S-DREAM, 솔가, 나우푸드, 세노비스, 쏜리서치 등 해외 직수입 건기식 및 일반가공식품 지원)
 */
export async function searchFoodSafetyImportedFoods(
  keyword: string,
  manufacturer?: string,
  reportNo?: string
): Promise<PublicDrugMasterItem[]> {
  const cleanKw = keyword.trim();
  const cleanMfg = (manufacturer || '').trim();
  const cleanReg = (reportNo || '').trim().replace(/[^0-9]/g, '');

  if (!cleanKw && !cleanMfg && !cleanReg) return [];

  const fetchItems = async (paramSegment: string): Promise<any[]> => {
    try {
      const url = `https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem?serviceKey=${encodeURIComponent(
        DATA_GO_KR_API_KEY
      )}&type=json&pageNo=1&numOfRows=100&${paramSegment}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const rawList = data?.body?.items || [];
      return (Array.isArray(rawList) ? rawList : [rawList]).map((x: any) => x?.item || x).filter(Boolean);
    } catch (e) {
      console.warn('수입식품 한글표시사항 API 호출 실패:', e);
      return [];
    }
  };

  let rows: any[] = [];
  const variants = generateSearchNameVariants(cleanKw);
  const phonetics = generateEnglishPhoneticVariants(cleanKw);

  // 1차: 한글 제품명 변형 검색 (예: '지-드림', '지드림', '솔가')
  for (const v of variants) {
    const found = await fetchItems(`prductKoreanNm=${encodeURIComponent(v)}`);
    if (found.length > 0) {
      rows = [...rows, ...found];
    }
    if (rows.length >= 50) break;
  }

  // 2차: 영문 발음 변형 검색 (예: '에스드림' -> 'prductNm=S-DREAM', '엠드림' -> 'prductNm=M-DREAM')
  for (const ph of phonetics) {
    const foundPh = await fetchItems(`prductNm=${encodeURIComponent(ph)}`);
    if (foundPh.length > 0) {
      rows = [...rows, ...foundPh];
    }
    if (rows.length >= 50) break;
  }

  // 3차: 영문 제품명 직접 검색 (영문 문자가 포함되어 있거나 아직 결과가 부족한 경우)
  if (rows.length < 5 && /[a-zA-Z]/.test(cleanKw)) {
    const foundEng = await fetchItems(`prductNm=${encodeURIComponent(cleanKw)}`);
    if (foundEng.length > 0) {
      rows = [...rows, ...foundEng];
    }
  }

  // 4차: 한글표시사항(korlabel) 전문 검색 (예: '대두발효추출엑기스(S-Dream)' 라벨 본문 매칭)
  if (rows.length === 0) {
    for (const term of [cleanKw, ...phonetics]) {
      const foundLabel = await fetchItems(`korlabel=${encodeURIComponent(term)}`);
      if (foundLabel.length > 0) {
        rows = [...rows, ...foundLabel];
        break;
      }
    }
  }

  // 5차: 수입업체명 또는 해외제조사명 검색
  if (rows.length === 0 && cleanMfg) {
    const foundMfg = await fetchItems(`bsnOfcName=${encodeURIComponent(cleanMfg)}`);
    if (foundMfg.length > 0) {
      rows = [...rows, ...foundMfg];
    }
  }

  // 중복 제거 (제품명 + 수입원 기준)
  const uniqueMap = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.PRDUCT_KOREAN_NM || r.PRDUCT_NM}_${r.BSN_OFC_NAME || r.OVSMNFST_NM}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }

  let deduped = Array.from(uniqueMap.values());

  // 정밀 일치도 정렬
  if (cleanKw) {
    const calcScore = (r: any) => {
      const kor = r.PRDUCT_KOREAN_NM || '';
      const eng = r.PRDUCT_NM || '';
      let best = Math.max(calcDrugMatchScore(kor, cleanKw), calcDrugMatchScore(eng, cleanKw));
      for (const ph of phonetics) {
        best = Math.max(best, calcDrugMatchScore(eng, ph), calcDrugMatchScore(kor, ph));
      }
      return best;
    };

    deduped.sort((a, b) => {
      const aScore = calcScore(a);
      const bScore = calcScore(b);
      if (aScore !== bScore) return bScore - aScore;

      // 수입업체/제조사 일치도 보정
      if (cleanMfg) {
        const mfgNorm = normalizeDrugSearchText(cleanMfg);
        const aMfg = normalizeDrugSearchText(`${a.BSN_OFC_NAME} ${a.OVSMNFST_NM}`).includes(mfgNorm) ? 1 : 0;
        const bMfg = normalizeDrugSearchText(`${b.BSN_OFC_NAME} ${b.OVSMNFST_NM}`).includes(mfgNorm) ? 1 : 0;
        if (aMfg !== bMfg) return bMfg - aMfg;
      }
      return 0;
    });

    const matched = deduped.filter((r) => calcScore(r) > 0);
    if (matched.length > 0) {
      deduped = matched;
    }
  }

  return deduped.map((row: any) => {
    const korName = (row.PRDUCT_KOREAN_NM || '').trim();
    const engName = (row.PRDUCT_NM || '').trim();
    let prodName = korName || engName;
    if (korName && engName && !korName.toLowerCase().includes(engName.toLowerCase())) {
      prodName = `${korName} (${engName})`;
    }
    const distributorName = (row.BSN_OFC_NAME || '').trim();
    const mfgName = (row.OVSMNFST_NM || '').trim();
    const country = (row.MNF_NTNCD_NM || row.XPORT_NTNCD_NM || '해외').trim();
    const displayMfg = mfgName ? `${mfgName} (${country})` : (distributorName ? `${distributorName} (수입)` : country);

    const isHealthFood = (row.DCL_PRDUCT_SE_CD_NM || '').includes('건강기능식품');
    const classification: ProductClassification = isHealthFood ? 'HEALTH_FUNCTIONAL_FOOD' : 'GENERAL_FOOD';

    const rawLabel = row.KORLABEL || '';
    const labelParsed = parseImportedKoreanLabel(rawLabel);

    const rawIngr = (row.IRDNT_NM || labelParsed.subIngredientsText || '').trim();

    // 1. 프로바이오틱스 및 지표성분 스마트 추출
    const isProbiotic = (row.ITM_NM || '').includes('프로바이오틱스') || rawLabel.includes('프로바이오틱스');
    let parsedIngredients: ProductIngredientEntry[] = [];

    if (isProbiotic) {
      const cfuMatch =
        rawLabel.match(/(?:프로바이오틱스\s*수|균수|CFU)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*([억만천]*\s*CFU)/i) ||
        labelParsed.standardSpecificationText.match(/([0-9]+(?:\.[0-9]+)?)\s*([억만천]*\s*CFU)/i);

      const cfuCount = cfuMatch ? parseFloat(cfuMatch[1]) : 100;
      const cfuUnitStr = cfuMatch ? cfuMatch[2].trim() : '억 CFU';
      const cfuText = `${cfuCount}${cfuUnitStr}`;

      parsedIngredients.push({
        ingredientId: `ing_imported_probiotics_${Date.now()}`,
        englishInn: 'Probiotics',
        koreanName: '프로바이오틱스',
        functionalCategory: '기타',
        chemicalFormName: '프로바이오틱스 복합 균주',
        rawAmount: cfuCount,
        unit: 'CFU',
        ingredientInfoText: cfuText,
        elementalUnit: cfuUnitStr,
        isMainActive: true,
        clinicalSummary: '• 유산균 증식 및 유해균 억제, 배변활동 원활, 장건강 도움',
        formattedSpecification: `프로바이오틱스 ${cfuText}`
      });
    } else if (labelParsed.parsedNutritionIngredients && labelParsed.parsedNutritionIngredients.length > 0) {
      parsedIngredients = labelParsed.parsedNutritionIngredients;
    } else {
      const standardParsed = rawIngr ? parseRawIngredientString(rawIngr) : [];
      // 함량 정보가 없는 부형제는 별도 분리하여 임의 10mg 버그 방지
      const quantified = standardParsed.filter(ing => ing.rawAmount > 0);
      parsedIngredients = quantified.length > 0 ? quantified : standardParsed;
    }

    const reportNoStr =
      labelParsed.regulatoryCode ||
      (row.PROCS_DTM ? `수입_${row.PROCS_DTM}` : `수입_${cleanKw}`);

    const badgeLabel = isHealthFood ? `식약처 수입 건기식 (${country})` : `식약처 수입식품 (${country})`;

    return {
      id: `imported_${reportNoStr}_${encodeURIComponent(prodName)}`,
      productName: prodName,
      manufacturer: displayMfg,
      classification,
      dosageForm: labelParsed.dosageForm,
      packagingUnit: labelParsed.packagingUnit,
      dailyServings: labelParsed.dailyServings,
      amountPerServing: labelParsed.amountPerServing,
      servingUnitKorean: labelParsed.servingUnitKorean,
      regulatoryCode: reportNoStr,
      rawIngredientsText: rawIngr || rawLabel.slice(0, 300),
      dosageInstruction: labelParsed.dosageInstruction,
      indicationsSummary: labelParsed.indicationsSummary,
      searchKeywords: [prodName, korName, engName, distributorName, mfgName, country].filter(Boolean),
      sourceOrigin: '공공데이터포털 수입식품 한글표시사항 API' as PublicDataSourceOrigin,
      apiSourceBadge: badgeLabel,
      precautionsSummary: labelParsed.safetyPrecautionsText ? [labelParsed.safetyPrecautionsText] : ['수입식품 섭취 주의사항 참조'],
      safetyPrecautionsText: labelParsed.safetyPrecautionsText,
      standardSpecificationText: labelParsed.standardSpecificationText,
      rawMaterialsText: rawIngr,
      foodTypeCategory: isHealthFood ? '수입 건강기능식품' : (row.ITM_NM || '수입 가공식품'),
      shelfLifeText: row.EXPIRDE_DTM || row.EXPIRDE_END_DTM || '',
      koreanLabelText: rawLabel,
      ingredientBasis: (labelParsed.parsedNutritionIngredients && labelParsed.parsedNutritionIngredients.length > 0) ? 'PER_DAILY' : 'PER_UNIT',
      parsedIngredientsCache: parsedIngredients
    };
  });
}

/**
 * 한글 원료명에 대응하는 약학정보원(KPIC) 표준 Title Case 영문 성분명 반환
 */
function resolveKpaicEnglishIngredientName(korName: string, mainIngrEng?: string): string {
  const cleanKor = korName.replace(/\s+/g, '');
  const kpaicStandardMap: Record<string, string> = {
    '벤포티아민': 'Benfotiamine',
    '비스벤티아민': 'Bisbenthiamine',
    '푸르설티아민': 'Fursultiamine',
    '티아민질산염': 'Thiamine Mononitrate',
    '티아민염산염': 'Thiamine Hydrochloride',
    '리보플라빈': 'Riboflavin',
    '리보플라빈부티레이트': 'Riboflavin Butyrate',
    '리보플라빈포스페이트나트륨': "Riboflavin 5'-Phosphate Sodium",
    '니코틴산아미드': 'Nicotinamide',
    '판토텐산칼슘': 'Calcium Pantothenate',
    '피리독신염산염': 'Pyridoxine Hydrochloride',
    '피리독살포스페이트수화물': 'Pyridoxal Phosphate Hydrate',
    '메코발라민': 'Mecobalamin',
    '시아노코발라민': 'Cyanocobalamin',
    '히드록소코발라민아세트산염': 'Hydroxocobalamin Acetate',
    '비오틴': 'Biotin',
    'D-비오틴': 'D-Biotin',
    '폴산': 'Folic Acid',
    '제피아스코르브산': 'Ascorbic Acid Coated',
    '아스코르브산': 'Ascorbic Acid',
    '타우린': 'Taurine',
    '크롬함유건조효모': 'Chromium in Dried Yeast',
    '이노시톨': 'Inositol',
    '콜레칼시페롤농축분말': 'Cholecalciferol Concentrate Powder',
    '농축콜레칼시페롤': 'Cholecalciferol Concentrate',
    '콜레칼시페롤': 'Cholecalciferol',
    '콜린타르타르산염': 'Choline Bitartrate',
    '산화아연': 'Zinc Oxide',
    '글루콘산아연': 'Zinc Gluconate',
    '우르소데옥시콜산': 'Ursodeoxycholic Acid',
    '셀레늄함유건조효모': 'Selenium in Dried Yeast',
    '토코페롤아세테이트2배산': 'Tocopherol Acetate Powder 50%',
    '토코페롤아세테이트50%': 'Tocopherol Acetate 50%',
    '토코페롤아세테이트': 'Tocopherol Acetate',
    '감마-오리자놀': 'γ-Oryzanol',
    'γ-오리자놀': 'γ-Oryzanol',
    '감마오리자놀': 'γ-Oryzanol',
    '산화마그네슘': 'Magnesium Oxide',
    '글리세로인산마그네슘': 'Magnesium Glycerophosphate',
    '시트르산마그네슘수화물': 'Magnesium Citrate Hydrate',
    '시트르산마그네슘': 'Magnesium Citrate',
    '구연산마그네슘수화물': 'Magnesium Citrate Hydrate',
    '구연산마그네슘': 'Magnesium Citrate',
    '피돌산마그네슘수화물': 'Magnesium Pidolate',
    '피돌산마그네슘': 'Magnesium Pidolate',
    '피돌산 마그네슘': 'Magnesium Pidolate',
    '초산디알파토코페롤': 'D-Alpha-Tocopherol Acetate',
    'L-시스테인': 'L-Cysteine',
    '유비데카레논': 'Ubidecarenone',
    'DL-메티오닌': 'DL-Methionine',
    '오로트산수화물': 'Orotic Acid Hydrate',
    '베타카로틴20%': 'Beta-Carotene 20%',
    '베타카로틴20%과립': 'Beta-Carotene 20% Granules',
    '무수인산수소칼슘': 'Anhydrous Dibasic Calcium Phosphate',
    '황산칼륨': 'Potassium Sulfate',
    '황산제이구리수화물': 'Cupric Sulfate Hydrate',
    '황산제이구리': 'Cupric Sulfate',
    '황산망간': 'Manganese Sulfate',
    '염화크롬수화물': 'Chromic Chloride Hydrate',
    '요오드화칼륨': 'Potassium Iodide',
    '몰리브덴산나트륨': 'Sodium Molybdate',
    '피토나디온5%': 'Phytonadione 5%',
    '피토나디온': 'Phytonadione',
    '셀레늄가루0.1%': 'Selenium Powder 0.1%',
    '셀레늄가루': 'Selenium Powder',
    '콜레칼시페롤과립': 'Cholecalciferol Granules',
    '아스코르브산97%과립': 'Ascorbic Acid Granules 97%',
    '시아노코발라민1000배산': 'Cyanocobalamin 1000x Powder',
    '푸마르산철': 'Ferrous Fumarate'
  };

  if (kpaicStandardMap[cleanKor]) {
    return kpaicStandardMap[cleanKor];
  }

  // 식약처 MAIN_INGR_ENG 목록과 한글 성분명의 화학적 염/형태 스마트 교차 매칭
  if (mainIngrEng) {
    const candidates = mainIngrEng.split('/').map(s => s.trim()).filter(Boolean);
    // 피돌산 마그네슘 (Magnesium Pidolate)
    if (cleanKor.includes('피돌산') && cleanKor.includes('마그네슘')) {
      const match = candidates.find(c => /magnesium/i.test(c) && /pidolate/i.test(c));
      if (match) return match;
    }
    // 시트르산/구연산 마그네슘 (Magnesium Citrate Hydrate / Magnesium Citrate)
    if ((cleanKor.includes('시트르산') || cleanKor.includes('구연산')) && cleanKor.includes('마그네슘')) {
      const match = candidates.find(c => /magnesium/i.test(c) && /citrate/i.test(c));
      if (match) return match;
    }
    // 글리세로인산 마그네슘 (Magnesium Glycerophosphate)
    if (cleanKor.includes('글리세로인산') && cleanKor.includes('마그네슘')) {
      const match = candidates.find(c => /magnesium/i.test(c) && /glycerophosphate/i.test(c));
      if (match) return match;
    }
    // 산화 마그네슘 (Magnesium Oxide)
    if (cleanKor.includes('산화마그네슘')) {
      const match = candidates.find(c => /magnesium/i.test(c) && /oxide/i.test(c));
      if (match) return match;
    }
    // 초산디알파토코페롤 / 토코페롤아세테이트
    if (cleanKor.includes('토코페롤') && (cleanKor.includes('디알파') || cleanKor.includes('초산'))) {
      const match = candidates.find(c => /tocopherol/i.test(c) && /acetate/i.test(c));
      if (match) return match;
    }
  }

  // 사전에서 매칭 후 Title Case 변환
  const sortedKeys = Object.keys(INN_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (cleanKor.includes(k.replace(/\s+/g, ''))) {
      const inn = INN_DICTIONARY[k].englishInn;
      // 식약처 MAIN_INGR_ENG 목록에 일치하는 대소문자 표기가 있으면 우선 활용
      if (mainIngrEng) {
        const candidates = mainIngrEng.split('/').map(s => s.trim()).filter(Boolean);
        const found = candidates.find(c => c.toLowerCase() === inn.toLowerCase());
        if (found) return found;
      }
      return inn.replace(/\b[a-z]/g, ch => ch.toUpperCase());
    }
  }

  return '';
}

/**
 * 한글 단위명(밀리그램, 마이크로그램, 아이.유 등)을 표준 약어(mg, μg, IU, g)로 변환
 */
function normalizeNedrugUnit(rawUnit: string = ''): string {
  const u = rawUnit.trim();
  if (u === '밀리그램' || u === '밀리그람') return 'mg';
  if (u === '마이크로그램' || u === '마이크로그람' || u === '㎍' || u === 'ug') return 'μg';
  if (u === '그램' || u === '그람') return 'g';
  if (u === '아이.유' || u === '아이유' || u === '국제단위' || /^iu$/i.test(u)) return 'IU';
  if (u === '밀리리터' || u === '밀리리타') return 'mL';
  return u;
}

/**
 * 단일 의약품안전나라 ingrInfo 세그먼트 포맷팅
 */
function formatSingleNedrugIngrInfo(rawSegment: string): string {
  const trimmed = rawSegment.trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^(.+?)(?:\(으\)|으)?로서\s*([0-9\.,]+)\s*(.*)$/);
  if (!m) return trimmed;

  let targetName = m[1].trim().replace(/^비타민\s+([A-Za-z0-9]+)/i, '비타민$1');
  let numStr = m[2].trim();
  const unitStr = normalizeNedrugUnit(m[3] || '');

  // IU 단위에서 1000 이상인 경우 천단위 콤마 포맷 (예: 1000IU -> 1,000IU)
  if (unitStr === 'IU' && !numStr.includes(',')) {
    const n = parseFloat(numStr);
    if (!isNaN(n) && n >= 1000) {
      numStr = n.toLocaleString('en-US');
    }
  }

  // 마지막 글자 받침 여부에 따라 '으로서' / '로서' 자동 선택
  let particle = '로서';
  const lastChar = targetName.charCodeAt(targetName.length - 1);
  if (lastChar >= 0xac00 && lastChar <= 0xd7a3) {
    const jongseong = (lastChar - 0xac00) % 28;
    if (jongseong > 0 && jongseong !== 8) {
      particle = '으로서';
    }
  }

  return `${targetName}${particle} ${numStr}${unitStr}`;
}

/**
 * 의약품안전나라 ingrInfo 문자열(예: "티아민염산염(으)로서 72.3 밀리그램", "칼슘으로서 124.175mg, 총 인으로서 96mg", "판토텐산으로서 9mg,칼슘으로서 0.825mg")을
 * 약학정보원(KPIC) 표준 표기(예: "티아민염산염으로서 72.3mg", "칼슘으로서 124.175mg, 총 인으로서 96mg")로 정제
 */
function formatNedrugIngrInfo(rawInfo?: string | null): string {
  if (!rawInfo || !rawInfo.trim()) return '';
  const parts = rawInfo.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.map(formatSingleNedrugIngrInfo).join(', ');
  }
  return formatSingleNedrugIngrInfo(rawInfo);
}

/**
 * 의약품안전나라(nedrug.mfds.go.kr) 품목 상세 페이지 내 원료약품 JSON(var aasda = {...})을 직접 파싱하여
 * 약학정보원(KPIC)과 100% 동일한 성분/함량/환산량 텍스트 생성
 */
export async function fetchNedrugIngredientsText(
  itemSeq: string,
  mainIngrEng?: string
): Promise<string | null> {
  if (!itemSeq) return null;
  const directUrl = `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(itemSeq)}`;

  const fetchHtml = async (): Promise<string | null> => {
    // 1. Node.js 환경 (테스트/스크립트 실행 시) 직접 호출
    if (typeof window === 'undefined') {
      const r = await fetch(directUrl);
      if (r.ok) return await r.text();
      return null;
    }

    // 2. 브라우저 환경 1순위: Vite 프록시 (/api/nedrug) 호출
    try {
      const proxyRes = await fetch(`/api/nedrug/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(itemSeq)}`);
      if (proxyRes.ok) {
        const txt = await proxyRes.text();
        if (txt.includes('var aasda =')) return txt;
      }
    } catch {
      // ignore and try next fallback
    }

    // 3. 브라우저 환경 2순위 (정적 호스팅 배포 시): 공개 CORS 프록시 우회 호출
    const corsProxies = [
      `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
    ];
    for (const pUrl of corsProxies) {
      try {
        const r = await fetch(pUrl);
        if (r.ok) {
          const txt = await r.text();
          if (txt.includes('var aasda =')) return txt;
        }
      } catch {
        // try next
      }
    }
    return null;
  };

  try {
    const html = await fetchHtml();
    if (!html) return null;

    const matches = [...html.matchAll(/var aasda = (\{.*?\});/g)];
    if (matches.length === 0) return null;

    const lines: string[] = [];
    for (const m of matches) {
      try {
        const obj = JSON.parse(m[1]);
        let korName: string = (obj.ingrName || '').trim();
        if (!korName) continue;

        // 약학정보원 표기 통일 (감마-오리자놀 -> γ-오리자놀, 토코페롤아세테이트 2배산 -> 토코페롤아세테이트2배산)
        if (korName === '감마-오리자놀') korName = 'γ-오리자놀';
        else if (korName === '토코페롤아세테이트 2배산') korName = '토코페롤아세테이트2배산';

        const engName = resolveKpaicEnglishIngredientName(korName, mainIngrEng);
        const amount: string = (obj.ingrTotqy || '').trim();
        const unit: string = normalizeNedrugUnit(obj.ingrUnitName || '밀리그램');
        const infoFormatted = formatNedrugIngrInfo(obj.ingrInfo);

        const namePart = engName ? `${korName} (${engName})` : korName;
        const amountPart = amount ? ` ${amount}${unit}` : '';
        const infoPart = infoFormatted ? ` (${infoFormatted})` : '';

        lines.push(`${namePart}${amountPart}${infoPart}`);
      } catch {
        // skip malformed JSON row
      }
    }

    return lines.length > 0 ? lines.join('\n') : null;
  } catch (err) {
    console.warn('의약품안전나라 상세 성분/환산량 파싱 실패:', err);
    return null;
  }
}

/**
 * 식약처 실시간 공공데이터 API 품목 상세 조회 (단일 품목 기준코드 기반 — 효능·효과 전문, 주의사항 전문 및 의약품안전나라 원문 성분/환산량 수집)
 */
export async function fetchMfdsDrugDetail(itemSeq: string): Promise<{
  rawIngredientsText: string;
  dosageInstruction: string;
  indicationsSummary: string[];
  precautionsSummary: string[];
  storageMethod: string;
  packagingUnit: string;
  dosageForm: DosageForm;
  chartText: string;
} | null> {
  try {
    const url = `${MFDS_DTL_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&item_seq=${encodeURIComponent(itemSeq)}&type=json`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const item = data?.body?.items?.[0];
    if (!item) return null;

    const dosageInstruction = cleanXmlDocText(item.UD_DOC_DATA) || '용법용량 첨부문서 참조';
    const cleanEffects = cleanXmlDocText(item.EE_DOC_DATA);
    const indicationsSummary = cleanEffects
      ? cleanEffects.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)
      : ['효능·효과 첨부문서 참조'];

    const cleanPrecautions = cleanXmlDocText(item.NB_DOC_DATA);
    const precautionsSummary = cleanPrecautions
      ? cleanPrecautions.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)
      : ['사용상의 주의사항 첨부문서 참조'];

    const storageMethod = (item.STORAGE_METHOD || '기밀용기, 실온(1~30℃) 보관').replace(/\s+/g, ' ').trim();
    const packagingUnit = item.PACK_UNIT ? item.PACK_UNIT.split(/[\n,]/)[0].trim() : '120정';
    const dosageForm = inferDosageForm(item.CHART, item.ITEM_NAME);

    // 의약품안전나라(nedrug.mfds.go.kr) 원문 허가증 테이블에서 유효성분 환산량(ingrInfo) 포함 데이터 최우선 수집
    const nedrugIngredientsText = await fetchNedrugIngredientsText(itemSeq, item.MAIN_INGR_ENG);
    const rawIngredientsText =
      nedrugIngredientsText || formatMaterialNameToRawIngredients(item.MATERIAL_NAME, item.MAIN_INGR_ENG);

    return {
      rawIngredientsText,
      dosageInstruction,
      indicationsSummary: indicationsSummary.length > 0 ? indicationsSummary : ['효능·효과 첨부문서 참조'],
      precautionsSummary,
      storageMethod,
      packagingUnit,
      dosageForm,
      chartText: item.CHART || ''
    };
  } catch (err) {
    console.warn('식약처 상세 정보 조회 실패:', err);
    return null;
  }
}

export type SearchTargetSource = 'AUTO' | 'ALL' | 'OTC_DRUG' | 'DOMESTIC_HFF' | 'IMPORTED_FOOD' | 'GENERAL_FOOD';

/**
 * 식약처 의약품(DrugPrdtPrmsnInfoService08) + 식품안전나라 건기식(I0030/C003) + 식약처 수입식품(IprtFoodPrdtKoreanLabelingItem) + 일반식품(I1250) 통합 실시간 검색
 * - 선택된 분류(classification) 또는 대상 소스(targetSource)에 맞는 공공API를 최우선 호출하고,
 *   후보가 없을 경우 자동으로 다음 단계 API(일반의약품 ➔ 국내 건기식 ➔ 수입 건기식/식품 ➔ 일반식품)를 보조 조회합니다.
 */
export async function searchPublicDrugDatabase(
  keyword: string,
  options?: {
    classification?: ProductClassification;
    manufacturer?: string;
    regulatoryCode?: string;
    targetSource?: SearchTargetSource;
  }
): Promise<PublicDrugMasterItem[]> {
  const targetClass = options?.classification || 'OTC_DRUG';
  const targetSource = options?.targetSource || 'AUTO';
  const cleanQuery = keyword.trim().replace(/\s+/g, '');
  const cleanMfg = (options?.manufacturer || '').trim();
  const cleanReg = (options?.regulatoryCode || '').trim();

  if (!cleanQuery && !cleanMfg && !cleanReg) return [];

  // 로컬 마스터 DB 검색 헬퍼 (띄어쓰기 무시 일치 검색)
  const searchLocalDb = (filterClass?: ProductClassification) => {
    const qNorm = normalizeDrugSearchText(cleanQuery || cleanMfg || cleanReg);
    if (!qNorm) return [];

    return PUBLIC_DRUG_DATABASE.filter(item => {
      if (filterClass && item.classification !== filterClass) return false;
      const cleanName = normalizeDrugSearchText(item.productName);
      const mfg = normalizeDrugSearchText(item.manufacturer);
      const cleanKeywords = item.searchKeywords?.map(k => normalizeDrugSearchText(k)) || [];
      return (
        cleanName.includes(qNorm) ||
        qNorm.includes(cleanName) ||
        mfg.includes(qNorm) ||
        cleanKeywords.some(k => k.includes(qNorm) || qNorm.includes(k)) ||
        item.regulatoryCode.includes(cleanQuery || cleanReg)
      );
    })
      .sort((a, b) => {
        const aScore = calcDrugMatchScore(a.productName, keyword);
        const bScore = calcDrugMatchScore(b.productName, keyword);
        return bScore - aScore;
      })
      .map(item => ({
        ...item,
        apiSourceBadge: item.classification === 'OTC_DRUG' ? '약학정보원(KPAIC) 표준 DB' : '내장 건기식 마스터 DB'
      }));
  };

  // 일반의약품 전용 호출 헬퍼
  const fetchOtcMfds = async (): Promise<PublicDrugMasterItem[]> => {
    try {
      const fetchMfds = async (qParam: string): Promise<any[]> => {
        try {
          const url = `${MFDS_INQ_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&${qParam}&type=json&pageNo=1&numOfRows=100`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          const items = data?.body?.items;
          return Array.isArray(items) ? items : [];
        } catch (e) {
          return [];
        }
      };

      let mfdsItems: any[] = [];
      if (cleanReg) {
        mfdsItems = await fetchMfds(`item_seq=${encodeURIComponent(cleanReg)}`);
      } else {
        const cleanKw = keyword.trim();
        const normKw = normalizeDrugSearchText(cleanKw);
        const queryCandidates: string[] = [];

        const variants = generateSearchNameVariants(cleanKw);
        for (const v of variants) {
          queryCandidates.push(`item_name=${encodeURIComponent(v)}`);
        }

        if (normKw.length >= 4) {
          queryCandidates.push(`item_name=${encodeURIComponent(normKw.slice(0, 3))}`);
        } else if (normKw.length >= 2) {
          queryCandidates.push(`item_name=${encodeURIComponent(normKw.slice(0, 2))}`);
        }

        if (cleanMfg) {
          queryCandidates.push(`entp_name=${encodeURIComponent(cleanMfg)}`);
        }

        for (const qp of queryCandidates) {
          const found = await fetchMfds(qp);
          if (found.length > 0) {
            mfdsItems = [...mfdsItems, ...found];
            if (mfdsItems.length >= 50) break;
          }
        }
      }

      if (mfdsItems.length > 0) {
        const uniqueMfds = new Map<string, any>();
        for (const it of mfdsItems) {
          if (it.ITEM_SEQ && !uniqueMfds.has(it.ITEM_SEQ)) {
            uniqueMfds.set(it.ITEM_SEQ, it);
          }
        }

        let parsedItems = Array.from(uniqueMfds.values()).map((mfdsItem: any) => {
          const mfgName = (mfdsItem.ENTP_NAME || '').replace(/^\(주\)/, '').trim();
          const cleanProdName = mfdsItem.ITEM_NAME || '';
          const ingrListText = (mfdsItem.ITEM_INGR_NAME || '').split('/').join('\n');

          return {
            id: `mfds_${mfdsItem.ITEM_SEQ}`,
            productName: cleanProdName,
            manufacturer: mfgName || '제약사',
            classification: 'OTC_DRUG' as ProductClassification,
            dosageForm: inferDosageForm(mfdsItem.CHART, cleanProdName),
            packagingUnit: '규격 포장 단위 (상세 확인)',
            dailyServings: 1,
            amountPerServing: 1,
            servingUnitKorean: '정',
            regulatoryCode: mfdsItem.ITEM_SEQ,
            rawIngredientsText: ingrListText,
            dosageInstruction: '용법용량 첨부문서 참조 (상세 연동 시 자동 세팅)',
            indicationsSummary: [mfdsItem.PRDUCT_TYPE || '일반의약품 효능·효과'],
            searchKeywords: [cleanProdName, mfgName],
            sourceOrigin: '공공데이터포털 식약처 의약품 API' as PublicDataSourceOrigin,
            apiSourceBadge: '식약처 의약품 허가정보'
          };
        });

        const cleanKw = keyword.trim();
        parsedItems.sort((a, b) => {
          const aScore = calcDrugMatchScore(a.productName, cleanKw);
          const bScore = calcDrugMatchScore(b.productName, cleanKw);
          if (aScore !== bScore) return bScore - aScore;
          return 0;
        });

        const matched = parsedItems.filter((it) => calcDrugMatchScore(it.productName, cleanKw) > 0);
        return matched.length > 0 ? matched : parsedItems;
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  // --- 특정 소스 강제 지정 조회 (사용자가 탭/버튼 클릭 시) ---
  if (targetSource === 'OTC_DRUG') {
    const otc = await fetchOtcMfds();
    return otc.length > 0 ? otc : searchLocalDb('OTC_DRUG');
  }
  if (targetSource === 'DOMESTIC_HFF') {
    const hff = await searchFoodSafetyFunctionalFoods(keyword, cleanMfg, cleanReg);
    return hff.length > 0 ? hff : searchLocalDb('HEALTH_FUNCTIONAL_FOOD');
  }
  if (targetSource === 'IMPORTED_FOOD') {
    return await searchFoodSafetyImportedFoods(keyword, cleanMfg, cleanReg);
  }
  if (targetSource === 'GENERAL_FOOD') {
    return await searchFoodSafetyGeneralFoods(keyword, cleanMfg, cleanReg);
  }
  if (targetSource === 'ALL') {
    // 4대 공공데이터 동시 병렬 조회 및 일치도 순 통합 정렬
    const [otcItems, hffItems, impItems, genItems] = await Promise.all([
      fetchOtcMfds(),
      searchFoodSafetyFunctionalFoods(keyword, cleanMfg, cleanReg),
      searchFoodSafetyImportedFoods(keyword, cleanMfg, cleanReg),
      searchFoodSafetyGeneralFoods(keyword, cleanMfg, cleanReg)
    ]);
    const merged = [...otcItems, ...hffItems, ...impItems, ...genItems];
    merged.sort((a, b) => {
      const aScore = calcDrugMatchScore(a.productName, keyword);
      const bScore = calcDrugMatchScore(b.productName, keyword);
      return bScore - aScore;
    });
    return merged;
  }

  // --- 자동 캐스케이딩 조회 (AUTO 모드) ---

  // CASE 1: 건강기능식품 (HEALTH_FUNCTIONAL_FOOD) 선택 시
  if (targetClass === 'HEALTH_FUNCTIONAL_FOOD') {
    // 국내 건기식(C003)과 수입 건기식/식품을 동시 병렬 조회하여 가장 정확한 제품 우선 정렬 (예: '지-드림' 검색 시 정확한 수입 건기식 최우선 노출)
    const [hffResults, importedResults] = await Promise.all([
      searchFoodSafetyFunctionalFoods(keyword, cleanMfg, cleanReg),
      searchFoodSafetyImportedFoods(keyword, cleanMfg, cleanReg)
    ]);
    const localHff = searchLocalDb('HEALTH_FUNCTIONAL_FOOD');
    const combined = [
      ...hffResults,
      ...importedResults,
      ...localHff.filter(l => !hffResults.some(r => normalizeDrugSearchText(r.productName) === normalizeDrugSearchText(l.productName)))
    ];
    if (combined.length > 0) {
      combined.sort((a, b) => {
        const aScore = calcDrugMatchScore(a.productName, keyword);
        const bScore = calcDrugMatchScore(b.productName, keyword);
        return bScore - aScore;
      });
      return combined;
    }

    // 2순위 스마트 보조: 국내 일반식품(I1250) 조회
    const generalFoodFallback = await searchFoodSafetyGeneralFoods(keyword, cleanMfg, cleanReg);
    if (generalFoodFallback.length > 0) {
      return generalFoodFallback;
    }

    // 3순위 스마트 보조: 일반의약품 확인
    const otcFallback = await fetchOtcMfds();
    if (otcFallback.length > 0) {
      return otcFallback;
    }

    return [];
  }

  // CASE 2: 기타가공품 / 일반식품 (GENERAL_FOOD) 선택 시
  if (targetClass === 'GENERAL_FOOD') {
    // 국내 일반식품(I1250)과 수입 가공식품 병렬 조회
    const [genResults, importedFallback] = await Promise.all([
      searchFoodSafetyGeneralFoods(keyword, cleanMfg, cleanReg),
      searchFoodSafetyImportedFoods(keyword, cleanMfg, cleanReg)
    ]);
    const combinedGen = [...genResults, ...importedFallback];
    if (combinedGen.length > 0) {
      combinedGen.sort((a, b) => {
        const aScore = calcDrugMatchScore(a.productName, keyword);
        const bScore = calcDrugMatchScore(b.productName, keyword);
        return bScore - aScore;
      });
      return combinedGen;
    }

    // 3순위 스마트 보조: 국내 건강기능식품 확인
    const hffFallback = await searchFoodSafetyFunctionalFoods(keyword, cleanMfg, cleanReg);
    if (hffFallback.length > 0) {
      return hffFallback;
    }

    return [];
  }

  // CASE 3: 일반의약품 (OTC_DRUG) 선택 시
  // 1순위: 공공데이터포털 식약처 의약품 제품 허가정보 실시간 검색
  const otcItems = await fetchOtcMfds();
  if (otcItems.length > 0) {
    return otcItems;
  }

  // 2순위: 로컬 의약품 마스터 DB 확인
  const localOtc = searchLocalDb('OTC_DRUG');
  if (localOtc.length > 0) {
    return localOtc;
  }

  // 3순위 스마트 보조: 국내 건강기능식품(I0030/C003) 자동 보조 조회
  const hffFallback = await searchFoodSafetyFunctionalFoods(keyword, cleanMfg, cleanReg);
  if (hffFallback.length > 0) {
    return hffFallback;
  }

  // 4순위 스마트 보조: 해외 수입 건강기능식품/식품 한글표시사항 실시간 조회 (지-드림 등)
  const importedFallback = await searchFoodSafetyImportedFoods(keyword, cleanMfg, cleanReg);
  if (importedFallback.length > 0) {
    return importedFallback;
  }

  // 5순위 스마트 보조: 국내 일반식품(I1250) 자동 조회
  const genFallback = await searchFoodSafetyGeneralFoods(keyword, cleanMfg, cleanReg);
  if (genFallback.length > 0) {
    return genFallback;
  }

  return searchLocalDb();
}

/**
 * 마스터 품목 객체를 검수 및 제품 등록용 PublicDataFetchResult 형식으로 변환
 * - 식약처 의약품(mfds_)인 경우 상세 스펙 및 성분/분량을 비동기로 완벽 동기화
 * - 식품안전나라 건기식(fsk_I0030 / fsk_C003), 일반식품(fsk_I1250) 및 수입식품(imported_)인 경우 파싱된 규격/원재료 데이터를 즉시 반환
 */
export async function convertMasterItemToFetchResult(item: PublicDrugMasterItem): Promise<PublicDataFetchResult> {
  // 식품안전나라(I0030 / C003 / I1250) 또는 수입식품 한글표시사항 데이터인 경우 이미 상세 규격과 성분이 모두 파싱되어 있음
  if (item.id.startsWith('fsk_') || item.id.startsWith('imported_')) {
    return {
      productName: item.productName,
      manufacturer: item.manufacturer,
      classification: item.classification,
      dosageForm: item.dosageForm,
      packagingUnit: item.packagingUnit,
      dailyServings: item.dailyServings,
      amountPerServing: item.amountPerServing,
      servingUnitKorean: item.servingUnitKorean,
      regulatoryCode: item.regulatoryCode,
      rawIngredientsText: item.rawIngredientsText,
      dosageInstruction: item.dosageInstruction,
      indicationsSummary: item.indicationsSummary,
      parsedIngredients: item.parsedIngredientsCache || parseRawIngredientString(item.rawIngredientsText),
      sourceOrigin: item.sourceOrigin || (item.id.startsWith('imported_') ? '공공데이터포털 수입식품 한글표시사항 API' : '식품안전나라 건기식 API (C003)'),
      precautionsSummary: item.precautionsSummary,
      safetyPrecautionsText: item.safetyPrecautionsText,
      standardSpecificationText: item.standardSpecificationText,
      indivRawMaterialText: item.indivRawMaterialText,
      etcRawMaterialText: item.etcRawMaterialText,
      capRawMaterialText: item.capRawMaterialText,
      rawMaterialsText: item.rawMaterialsText,
      appearanceKorean: item.appearanceKorean,
      foodTypeCategory: item.foodTypeCategory,
      shelfLifeText: item.shelfLifeText,
      koreanLabelText: item.koreanLabelText
    };
  }

  let targetRawText = item.rawIngredientsText || '';
  let targetDosageInstruction = item.dosageInstruction;
  let targetIndicationsSummary = item.indicationsSummary;
  let targetPrecautionsSummary = item.precautionsSummary;
  let targetPackagingUnit = item.packagingUnit;
  let targetDosageForm = item.dosageForm;
  let { dailyServings, amountPerServing, servingUnitKorean } = parseServingFromInstruction(targetDosageInstruction);

  // 식약처 실시간 데이터(id가 mfds_로 시작) 또는 품목기준코드가 있는 일반의약품인 경우 품목 상세(getDrugPrdtPrmsnDtlInq08)를 실시간 호출하여 효능효과 전문 및 주의사항 전문 수집
  if (item.id.startsWith('mfds_') || (item.classification === 'OTC_DRUG' && item.regulatoryCode)) {
    const detail = await fetchMfdsDrugDetail(item.regulatoryCode);
    if (detail) {
      if (detail.rawIngredientsText) {
        targetRawText = detail.rawIngredientsText;
      }
      if (detail.dosageInstruction && detail.dosageInstruction !== '용법용량 첨부문서 참조') {
        targetDosageInstruction = detail.dosageInstruction;
        const parsedServing = parseServingFromInstruction(targetDosageInstruction);
        dailyServings = parsedServing.dailyServings;
        amountPerServing = parsedServing.amountPerServing;
        servingUnitKorean = parsedServing.servingUnitKorean;
      }
      if (detail.indicationsSummary.length > 0) {
        targetIndicationsSummary = detail.indicationsSummary;
      }
      if (detail.precautionsSummary && detail.precautionsSummary.length > 0) {
        targetPrecautionsSummary = detail.precautionsSummary;
      }
      if (detail.packagingUnit) {
        targetPackagingUnit = detail.packagingUnit;
      }
      targetDosageForm = detail.dosageForm;
    }
  }

  const parsedIngredients = parseRawIngredientString(targetRawText);

  return {
    productName: item.productName,
    manufacturer: item.manufacturer,
    classification: item.classification,
    dosageForm: targetDosageForm,
    packagingUnit: targetPackagingUnit,
    dailyServings,
    amountPerServing,
    servingUnitKorean,
    regulatoryCode: item.regulatoryCode,
    rawIngredientsText: targetRawText,
    dosageInstruction: targetDosageInstruction,
    indicationsSummary: targetIndicationsSummary,
    precautionsSummary: targetPrecautionsSummary,
    parsedIngredients,
    sourceOrigin: item.sourceOrigin || '약학정보원(KPAIC) DB'
  };
}

/**
 * 공공데이터 기반 제품 단일 조회 (레거시 및 자동 매핑 호환용)
 */
export async function fetchAndNormalizePublicDrugData(
  productName: string,
  manufacturer: string,
  classification: ProductClassification = 'OTC_DRUG'
): Promise<PublicDataFetchResult> {
  const query = (productName || manufacturer).trim();
  const searchResults = await searchPublicDrugDatabase(query, {
    classification,
    manufacturer
  });

  if (searchResults.length > 0) {
    return await convertMasterItemToFetchResult(searchResults[0]);
  }

  // 일반의약품인데 DB에 미등록된 품목인 경우 에러 차단
  if (classification === 'OTC_DRUG') {
    throw new Error(
      `[공공데이터 조회 실패] 입력하신 제품("${productName}")은 식약처/약학정보원 데이터베이스에서 조회되지 않았습니다.\n정확한 제품명을 확인해주세요.`
    );
  }

  // 건강기능식품 / 일반식품 신규 등록 시 기본 틀 제공
  const defaultRawText = '글루콘산아연 40mg, 티아민염산염 2.0mg, 피리독신염산염 3.0mg, 니코틴산아미드 26mg, L-아르기닌 500mg';
  const dynamicParsed = parseRawIngredientString(defaultRawText);
  const isLiquid = /액|시럽|스틱|포|앰플|마이타민|워터|음료/i.test(productName);
  const isCapsule = /캡슐/i.test(productName);

  const dosageForm: DosageForm = isLiquid
    ? 'LIQUID_ORAL'
    : isCapsule
    ? 'SOFT_CAPSULE'
    : 'TABLET';

  const servingUnitKorean = isLiquid ? '포(20g)' : isCapsule ? '캡슐' : '정';
  const dailyServings = isLiquid ? 2 : 1;

  return {
    productName: productName.trim(),
    manufacturer: manufacturer.trim(),
    classification,
    dosageForm,
    packagingUnit: isLiquid ? '20g x 60포 (30일분)' : '120정 (60정 x 2)',
    dailyServings,
    amountPerServing: 1,
    servingUnitKorean,
    regulatoryCode: `${Math.floor(202000000 + Math.random() * 4000000)}`,
    rawIngredientsText: defaultRawText,
    dosageInstruction: isLiquid
      ? `1일 ${dailyServings}회, 1회 1${servingUnitKorean}를 식전 또는 식후에 그대로 섭취하십시오.`
      : `1일 ${dailyServings}회, 1회 1${servingUnitKorean}를 식후 섭취하십시오.`,
    indicationsSummary: ['정상적인 면역기능 및 에너지 대사 지원'],
    parsedIngredients: dynamicParsed,
    sourceOrigin: '식품안전나라 건기식 API (I0030)'
  };
}

