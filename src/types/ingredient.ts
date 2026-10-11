/**
 * 유효 성분(Active Ingredient) 및 화학 형태(Chemical Salt/Form) 데이터 모델
 * - 모든 유효 성분명(Active Ingredients)은 영문 표준 명칭(English INN 또는 Chemical Name)을 사용합니다.
 */

export type NutrientStandardKey =
  | 'VITAMIN_A'
  | 'VITAMIN_D'
  | 'VITAMIN_E'
  | 'VITAMIN_K'
  | 'VITAMIN_B1' // Thiamine
  | 'VITAMIN_B2' // Riboflavin
  | 'VITAMIN_B3' // Niacin / Nicotinamide
  | 'VITAMIN_B5' // Pantothenic acid
  | 'VITAMIN_B6' // Pyridoxine
  | 'VITAMIN_B7' // Biotin
  | 'VITAMIN_B9' // Folate / Folic acid
  | 'VITAMIN_B12'// Cobalamin
  | 'VITAMIN_C'
  | 'CALCIUM'
  | 'MAGNESIUM'
  | 'IRON'
  | 'ZINC'
  | 'SELENIUM'
  | 'COPPER'
  | 'MANGANESE'
  | 'IODINE'
  | 'CHROMIUM'
  | 'MOLYBDENUM'
  | 'EPA_DHA'
  | 'PROBIOTICS'
  | 'COENZYME_Q10'
  | 'LUTEIN';

export type IngredientCategory =
  | 'VITAMIN'
  | 'MINERAL'
  | 'LIPID_FATTY_ACID'
  | 'AMINO_ACID_PEPTIDE'
  | 'BOTANICAL_EXTRACT'
  | 'PROBIOTIC'
  | 'ENZYME_COFACTOR'
  | 'OTHER_FUNCTIONAL';

export interface ChemicalSaltProfile {
  saltName: string;                     // 예: "Gluconate", "Oxide", "Citrate", "Bisglycinate"
  elementalRatio: number;               // 원소 함량 환산율 (예: Zinc gluconate의 경우 약 0.1435)
  bioavailabilityNote: string;          // 생체이용률(Bioavailability) 및 흡수율 관련 한국어 임상 설명
  giDistressRisk: 'LOW' | 'MODERATE' | 'HIGH'; // 위장장애(GI: Gastrointestinal Distress) 위험도
}

export interface IngredientDefinition {
  id: string;                           // 성분 고유 ID (예: 'ing_benfotiamine')
  englishInn: string;                   // 영문 표준 명칭 (English INN / Chemical Name, 예: "Benfotiamine")
  koreanSynonym: string;                // 한국어 관용명/통칭 (예: "벤포티아민 (활성형 비타민 B1)")
  standardKey?: NutrientStandardKey;    // KDRIs(Dietary Reference Intakes for Koreans) 연동 기준 키
  category: IngredientCategory;
  defaultUnit: 'mg' | 'ug' | 'IU' | 'CFU' | 'g';
  
  // 화학적 형태 및 염(Salt) 정보
  chemicalForm?: ChemicalSaltProfile;

  // 임상 약학 정보
  moaDescription: string;               // MOA(Mechanism of Action - 작용 기전) 한국어 설명
  clinicalKeyPoints: string[];          // 임상 포인트 (활성형 여부, BBB 투과성 등)
  targetTissues: string[];              // 표적 조직 (예: 신경계, 근육, 간)
}

export type FunctionalCategory = 
  | '에너지 대사'
  | '신경계/인지 기능'
  | '골격/관절/치아'
  | '면역/세포분열'
  | '간기능/해독'
  | '항산화/혈행'
  | '아미노산/단백질 합성';

/**
 * 제품에 포함된 단일 성분 처방 정보
 */
export interface ProductIngredientEntry {
  ingredientId: string;
  englishInn: string;                   // 영문 표준 명칭 (English INN)
  functionalCategory: FunctionalCategory;// 기능 분류 (에너지 대사, 신경계 등)
  chemicalFormName: string;             // 원료 형태/염(Form, 예: "지용성 활성 에스테르", "유기염(Gluconate)")
  rawAmount: number;                    // 투입/표기 원료량
  unit: 'mg' | 'ug' | 'IU' | 'CFU' | 'g';
  elementalAmount?: number;             // 순수 원소 또는 환산 유효량 (예: 마그네슘 원소량)
  isMainActive: boolean;                // 주요 유효성분 여부
  standardKey?: NutrientStandardKey;    // KDRIs 영양소 매핑
  clinicalSummary: string;              // 핵심 특징 및 작용 원리 요약 (명사형 개조식 1~2줄)
  noteKorean?: string;                  // 배합 특이사항 (예: "장용코팅 처리 원료")
  formattedSpecification?: string;      // 약학정보원 표준 포맷 성분표 표기 (예: "Ascorbic Acid Coated 51.15mg (Ascorbic Acid 50mg)")
}

