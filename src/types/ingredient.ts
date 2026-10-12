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

export type EfficacyCategory = 
  | '비타민B1'
  | '비타민B2'
  | '비타민B3'
  | '비타민B5'
  | '비타민B6'
  | '비타민B7'
  | '비타민B12'
  | '비타민B12 보충'
  | '기타 비타민B'
  | '비타민C'
  | '비타민C 제제'
  | '비타민D'
  | '비타민D 제제'
  | '비타민D3'
  | '비타민D3 제제'
  | '비타민E'
  | '비타민E 제제'
  | '비타민A'
  | '비타민A 제제'
  | '비타민K'
  | '비타민K 제제'
  | '엽산'
  | '엽산 보충'
  | '마그네슘(Mg)'
  | '아연(Zn)'
  | '칼슘(Ca)'
  | '셀레늄(Se)'
  | '크롬(Cr)'
  | '소화효소제'
  | '소염효소'
  | '장내 가스 제거제'
  | '담석용해제'
  | '비필수 아미노산제제'
  | '아미노산제제'
  | '간보호제'
  | '자율신경제'
  | '기타 심부전 치료제'
  | '기타 간장 약물'
  | '기타'
  | (string & {});

// 하위 호환성을 위해 FunctionalCategory도 EfficacyCategory의 별칭으로 유지
export type FunctionalCategory = EfficacyCategory;

/**
 * 제품에 포함된 단일 성분 처방 정보
 */
export interface ProductIngredientEntry {
  ingredientId: string;
  englishInn: string;                   // 영문 표준 명칭 (English INN)
  functionalCategory: EfficacyCategory; // KPIC 약효 분류 (비타민B1, 소화효소제 등)
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

