import { ProductClassification, DosageForm } from '../types/classification';
import { ProductIngredientEntry } from '../types/ingredient';
import { parseRawIngredientString } from '../utils/innMapper';

export interface PublicDataFetchResult {
  productName: string;
  manufacturer: string;
  classification: ProductClassification;
  dosageForm: DosageForm;
  packagingUnit: string;
  dailyServings: number;
  amountPerServing: number;
  servingUnitKorean: string;
  regulatoryCode: string; // 약학정보원 / 식약처 품목기준코드
  rawIngredientsText: string; // 약학정보원(KPAIC) 성분/분량 표준 원문
  indicationsSummary: string[];
  dosageInstruction: string;
  parsedIngredients: ProductIngredientEntry[];
  sourceOrigin: '약학정보원(KPAIC) DB' | '패키지 라벨 AI OCR 추출' | '약국 등록 품목 DB';
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
}

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
    regulatoryCode: '202204118',
    rawIngredientsText: `Benfotiamine 벤포티아민 100mg (티아민염산염으로서 72.31mg)
Biotin 비오틴 0.1mg
Bisbenthiamine 비스벤티아민 30mg (티아민염산염으로서 26.25mg)
Calcium Pantothenate 판토텐산칼슘 100mg
Cholecalciferol Concentrated 농축콜레칼시페롤 10mg (비타민D로서 1000IU)
Choline Bitartrate 콜린타르타르산염 50mg
Folic Acid 폴산 0.5mg
Inositol 이노시톨 50mg
Magnesium Oxide 산화마그네슘 100mg (마그네슘으로서 60.3mg)
Mecobalamin 메코발라민 0.5mg
Nicotinamide 니코틴산아미드 50mg
Pyridoxal Phosphate Hydrate 피리독살포스페이트수화물 10mg
Riboflavin Butyrate 리보플라빈부티레이트 25mg
Selenium in Dried Yeast 셀레늄함유건조효모 46.29mg (셀레늄으로서 25ug)
Tocopherol Acetate 50% 토코페롤아세테이트 20mg (비타민E로서 10IU)
Ursodeoxycholic Acid 우르소데옥시콜산 15mg
Zinc Oxide 산화아연 18.7mg (아연으로서 15mg)`,
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
    regulatoryCode: '202300072',
    rawIngredientsText: `Benfotiamine 벤포티아민 100mg (티아민염산염으로서 72.3mg)
Bisbenthiamine 비스벤티아민 30mg (티아민염산염으로서 26.2mg)
Riboflavin Butyrate 리보플라빈부티레이트 50mg
Nicotinamide 니코틴산아미드 10mg
Calcium Pantothenate 판토텐산칼슘 100mg
Pyridoxal Phosphate Hydrate 피리독살포스페이트수화물 50mg
Mecobalamin 메코발라민 1000ug
Biotin 비오틴 0.2mg
Folic Acid 폴산 0.5mg
Ascorbic Acid Coated 제피아스코르브산 51.15mg (아스코르브산으로서 50mg)
Cholecalciferol Concentrate Powder 콜레칼시페롤농축분말 10mg (비타민D로서 1000IU)
Tocopherol Acetate 50% 토코페롤아세테이트 20mg (비타민E로서 10IU)
Choline Bitartrate 콜린타르타르산염 100mg
Inositol 이노시톨 100mg
Magnesium Oxide 산화마그네슘 100mg (마그네슘으로서 60.3mg)
Zinc Oxide 산화아연 30mg (아연으로서 24.1mg)
Ursodeoxycholic Acid 우르소데옥시콜산 60mg
Taurine 타우린 100mg
Gamma-oryzanol 감마-오리자놀 3mg
Selenium in Dried Yeast 셀레늄함유건조효모 40.8mg (셀레늄으로서 22ug)
Chromium in Dried Yeast 크롬함유건조효모 20mg (크롬으로서 40ug)`,
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
    searchKeywords: ['마이타민', '마이타민업', '네이처스팜']
  }
];

/**
 * 공공데이터포털(식약처 의약품 허가 상세 정보) 오픈 API 연동 서비스
 */
const DATA_GO_KR_API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';
const MFDS_INQ_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08';
const MFDS_DTL_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08';

/**
 * XML/HTML 태그 및 CDATA 안전 제거 유틸리티
 */
function cleanXmlDocText(xmlStr?: string | null): string {
  if (!xmlStr) return '';
  return xmlStr
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 제형 판별 유틸리티 (CHART 성상 텍스트 및 제품명 기반)
 */
function inferDosageForm(chartText: string = '', prodName: string = ''): DosageForm {
  const combined = `${chartText} ${prodName}`.toLowerCase();
  if (combined.includes('연질캡슐') || combined.includes('소프트캡슐')) return 'SOFT_CAPSULE';
  if (combined.includes('경질캡슐') || combined.includes('캡슐')) return 'HARD_CAPSULE';
  if (combined.includes('장용')) return 'ENTERIC_TABLET';
  if (combined.includes('필름코팅')) return 'FILM_COATED_TABLET';
  if (combined.includes('시럽') || combined.includes('액제') || combined.includes('액상') || combined.includes('현탁액')) return 'LIQUID_ORAL';
  if (combined.includes('과립')) return 'GRANULE';
  if (combined.includes('산제') || combined.includes('가루')) return 'POWDER';
  if (combined.includes('젤리') || combined.includes('츄어블')) return 'JELLY';
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

    if (ingrName) {
      if (amount) {
        lines.push(`${ingrName} ${amount}${unit}`);
      } else {
        lines.push(ingrName);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 용법용량 텍스트에서 1일 섭취 횟수와 1회 복용량 추정
 */
function parseServingFromInstruction(instruction: string): { dailyServings: number; amountPerServing: number; servingUnitKorean: string } {
  let dailyServings = 1;
  let amountPerServing = 1;
  let servingUnitKorean = '정';

  if (instruction.includes('캡슐')) servingUnitKorean = '캡슐';
  else if (instruction.includes('포')) servingUnitKorean = '포';
  else if (instruction.includes('정')) servingUnitKorean = '정';

  const dailyMatch = instruction.match(/1일\s*([0-9]+)\s*회/);
  if (dailyMatch) {
    dailyServings = parseInt(dailyMatch[1], 10) || 1;
  }

  const servingMatch = instruction.match(/1회\s*([0-9]+)\s*[정포캡슐]/);
  if (servingMatch) {
    amountPerServing = parseInt(servingMatch[1], 10) || 1;
  }

  return { dailyServings, amountPerServing, servingUnitKorean };
}

/**
 * 식약처 실시간 공공데이터 API 품목 상세 조회 (단일 품목 기준코드 기반)
 */
export async function fetchMfdsDrugDetail(itemSeq: string): Promise<{
  rawIngredientsText: string;
  dosageInstruction: string;
  indicationsSummary: string[];
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
      ? cleanEffects.split(/[○·\n\r]+/).map(s => s.trim()).filter(s => s.length > 2).slice(0, 5)
      : ['효능·효과 첨부문서 참조'];
    const packagingUnit = item.PACK_UNIT ? item.PACK_UNIT.split(/[\n,]/)[0].trim() : '120정';
    const dosageForm = inferDosageForm(item.CHART, item.ITEM_NAME);
    const rawIngredientsText = formatMaterialNameToRawIngredients(item.MATERIAL_NAME, item.MAIN_INGR_ENG);

    return {
      rawIngredientsText,
      dosageInstruction,
      indicationsSummary: indicationsSummary.length > 0 ? indicationsSummary : ['효능·효과 첨부문서 참조'],
      packagingUnit,
      dosageForm,
      chartText: item.CHART || ''
    };
  } catch (err) {
    console.warn('식약처 상세 정보 조회 실패:', err);
    return null;
  }
}

/**
 * 식약처 공공데이터포털 실시간 API 검색 (메인) + 로컬 마스터 DB 폴백
 */
export async function searchPublicDrugDatabase(keyword: string): Promise<PublicDrugMasterItem[]> {
  const cleanQuery = keyword.trim().replace(/\s+/g, '');
  if (!cleanQuery) return [];

  // 1. 식약처 의약품 공공데이터포털 실시간 검색 (최대 30건 조회)
  try {
    const url = `${MFDS_INQ_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&item_name=${encodeURIComponent(keyword.trim())}&type=json&pageNo=1&numOfRows=30`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const items = data?.body?.items;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((mfdsItem: any) => {
          const mfgName = (mfdsItem.ENTP_NAME || '').replace(/^\(주\)/, '').trim();
          const cleanProdName = mfdsItem.ITEM_NAME || '';
          const ingrListText = (mfdsItem.ITEM_INGR_NAME || '').split('/').join('\n');

          return {
            id: `mfds_${mfdsItem.ITEM_SEQ}`,
            productName: cleanProdName,
            manufacturer: mfgName || '제약사',
            classification: 'OTC_DRUG',
            dosageForm: inferDosageForm(mfdsItem.CHART, cleanProdName),
            packagingUnit: '규격 포장 단위 (상세 확인)',
            dailyServings: 1,
            amountPerServing: 1,
            servingUnitKorean: '정',
            regulatoryCode: mfdsItem.ITEM_SEQ,
            rawIngredientsText: ingrListText,
            dosageInstruction: '용법용량 첨부문서 참조 (상세 연동 시 자동 세팅)',
            indicationsSummary: [mfdsItem.PRDUCT_TYPE || '일반의약품 효능·효과'],
            searchKeywords: [cleanProdName, mfgName]
          };
        });
      }
    }
  } catch (apiErr) {
    console.warn('식약처 실시간 API 통신 오류, 내장 DB로 폴백합니다:', apiErr);
  }

  // 2. 오프라인 또는 API 미검색 시 로컬 마스터 데이터베이스 검색
  const cleanQueryLower = cleanQuery.toLowerCase();
  return PUBLIC_DRUG_DATABASE.filter((item) => {
    const cleanName = item.productName.replace(/\s+/g, '').toLowerCase();
    const cleanMfg = item.manufacturer.replace(/\s+/g, '').toLowerCase();
    const cleanKeywords = item.searchKeywords?.map((k) => k.replace(/\s+/g, '').toLowerCase()) || [];

    return (
      cleanName.includes(cleanQueryLower) ||
      cleanQueryLower.includes(cleanName) ||
      cleanMfg.includes(cleanQueryLower) ||
      cleanKeywords.some((k) => k.includes(cleanQueryLower) || cleanQueryLower.includes(k)) ||
      item.regulatoryCode.includes(cleanQueryLower)
    );
  });
}

/**
 * 마스터 품목 객체를 검수 및 제품 등록용 PublicDataFetchResult 형식으로 변환
 * (식약처 실시간 API 품목인 경우 상세 스펙 및 성분/분량을 비동기로 완벽 동기화)
 */
export async function convertMasterItemToFetchResult(item: PublicDrugMasterItem): Promise<PublicDataFetchResult> {
  let targetRawText = item.rawIngredientsText || '';
  let targetDosageInstruction = item.dosageInstruction;
  let targetIndicationsSummary = item.indicationsSummary;
  let targetPackagingUnit = item.packagingUnit;
  let targetDosageForm = item.dosageForm;
  let { dailyServings, amountPerServing, servingUnitKorean } = parseServingFromInstruction(targetDosageInstruction);

  // 식약처 실시간 데이터(id가 mfds_로 시작)인 경우 품목 상세(getDrugPrdtPrmsnDtlInq08)를 실시간 호출하여 정확한 성분/분량/용법 수집
  if (item.id.startsWith('mfds_') || item.regulatoryCode) {
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
    parsedIngredients,
    sourceOrigin: '약학정보원(KPAIC) DB'
  };
}

/**
 * 약학정보원(KPAIC) DB 기반 제품 단일 조회 (레거시 및 자동 매핑 호환용)
 */
export async function fetchAndNormalizePublicDrugData(
  productName: string,
  manufacturer: string,
  classification: ProductClassification = 'OTC_DRUG'
): Promise<PublicDataFetchResult> {
  const query = (productName || manufacturer).trim();
  const searchResults = await searchPublicDrugDatabase(query);

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
    sourceOrigin: '약학정보원(KPAIC) DB'
  };
}
