import { KdriReferenceValue } from '../types/kdri';

/**
 * 2025 한국인 영양소 섭취기준 (2025 KDRIs: Dietary Reference Intakes for Koreans, 보건복지부·한국영양학회)
 * - 원본 문서: docs/reference/2025_한국인_영양소_섭취기준_요약본.pdf (11~21페이지 요약표 전체 수록)
 * - 향후 제품 간 성분 비교 및 다중 영양제 복용 시 연령·성별·임신/수유 여부별 상한섭취량(UL) 초과 점검용 마스터 데이터
 */

export type KdriAgeGroupCode =
  | 'INFANT_0_5M'   // 영아 0-5개월
  | 'INFANT_6_11M'  // 영아 6-11개월
  | 'TODDLER_1_2Y'  // 유아 1-2세
  | 'TODDLER_3_5Y'  // 유아 3-5세
  | 'AGE_6_8'       // 6-8세
  | 'AGE_9_11'      // 9-11세
  | 'AGE_12_14'     // 12-14세
  | 'AGE_15_18'     // 15-18세
  | 'AGE_19_29'     // 19-29세
  | 'AGE_30_49'     // 30-49세
  | 'AGE_50_64'     // 50-64세
  | 'AGE_65_74'     // 65-74세
  | 'AGE_75_PLUS'   // 75세 이상
  | 'PREGNANT'      // 임신부 (권장/평균/충분섭취량은 부가량 또는 총량, 상한섭취량은 총량)
  | 'LACTATING';    // 수유부 (권장/평균/충분섭취량은 부가량 또는 총량, 상한섭취량은 총량)

export type KdriRowGender = 'ALL' | 'MALE' | 'FEMALE' | 'PREGNANT' | 'LACTATING';

export interface Kdri2025AgeRow {
  gender: KdriRowGender;
  ageGroup: KdriAgeGroupCode;
  ageLabel: string;
  ear?: number;  // 평균필요량 (에너지의 경우 필요추정량 EER)
  rni?: number;  // 권장섭취량
  ai?: number;   // 충분섭취량
  ul?: number;   // 상한섭취량 (니아신의 경우 니코틴아미드 기준 기본값, 마그네슘은 식품 외 급원 기준)
  ulSecondary?: number; // 니아신 중 니코틴산(Nicotinic acid) 상한섭취량 등 보조 상한치
  cdrr?: number; // 만성질환위험감소섭취량 (나트륨 등)
  isAddition?: boolean; // 임신부·수유부의 EAR/RNI/AI 수치가 비임신 여성 대비 부가량(+)인지 여부 (UL은 항상 총량)
  note?: string;
}

export interface Kdri2025NutrientSpec {
  id: string;
  standardKey?: string; // NutrientStandardKey 매핑 키 (비타민·무기질·오메가3 등)
  category:
    | 'ENERGY_MACRONUTRIENT'
    | 'AMINO_ACID'
    | 'FAT_SOLUBLE_VITAMIN'
    | 'WATER_SOLUBLE_VITAMIN'
    | 'VITAMIN_LIKE'
    | 'MACRO_MINERAL'
    | 'TRACE_MINERAL';
  nameKorean: string;
  nameEnglish: string;
  unit: string;
  ulScopeNote?: string; // 상한섭취량 적용 범위 주의사항 (예: 보충제/강화식품 한함, 니코틴산/니코틴아미드 구분 등)
  clinicalExcessNote?: string; // 상한섭취량 초과 시 주요 유해영향 (독성종말점)
  footnotes?: string[];
  rows: Kdri2025AgeRow[];
}

/**
 * 1) 에너지적정비율 (AMDR, 11페이지) 및 당류·콜레스테롤 권고
 */
export const KDRI_2025_AMDR_GUIDELINES = {
  carbohydrateRatioPercent: {
    toddlerAndAdult: '50~65%',
    note: '2020년 55~65%에서 2025년 50~65%로 하향 조정'
  },
  proteinRatioPercent: {
    toddlerAndAdult: '10~20%',
    note: '2020년 7~20%에서 2025년 10~20%로 조정'
  },
  fatRatioPercent: {
    toddler1To2Y: '20~35%',
    age3PlusAndAdult: '15~30%'
  },
  saturatedFatRatioPercent: {
    age3To18Y: '8% 미만',
    adult19Plus: '7% 미만'
  },
  transFatRatioPercent: {
    age3PlusAndAdult: '1% 미만'
  },
  cholesterolLimit: '19세 이상 성인 300 mg/일 미만 권고',
  sugarsGuideline:
    '총당류 섭취량을 총 에너지섭취량의 20% 이내로 제한하고, 식품의 조리 및 가공 시 첨가된 첨가당(설탕, 액상과당, 물엿, 당밀, 꿀, 시럽, 농축과일주스 등)은 총 에너지섭취량의 10% 이내로 제한한다. 특히 주요 급원인 가당음료의 섭취는 가능한 줄인다.'
};

/**
 * 2) 영양소별 생애주기 전체 섭취기준 데이터 (12~21페이지 전체)
 */
export const KDRI_2025_FULL_SPECIFICATIONS: Kdri2025NutrientSpec[] = [
  // =========================================================================
  // [페이지 15] 지용성 비타민 (비타민 A, D, E, K)
  // =========================================================================
  {
    id: 'VITAMIN_A',
    standardKey: 'VITAMIN_A',
    category: 'FAT_SOLUBLE_VITAMIN',
    nameKorean: '비타민 A',
    nameEnglish: 'Vitamin A (Retinol / Beta-carotene)',
    unit: 'μg RAE',
    clinicalExcessNote: '간독성(지방간·간손상), 임신부 과잉 섭취 시 태아 기형 유발 위험, 두통',
    footnotes: [
      '1 μg RAE = 1 μg 레티놀 = 2 μg 보충제용 베타카로틴 = 12 μg 식품유래 베타카로틴 = 24 μg 기타 식이 프로비타민 A 카로티노이드'
    ],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 350, ul: 600 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 450, ul: 600 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 190, rni: 250, ul: 600 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 230, rni: 300, ul: 750 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 310, rni: 450, ul: 1100 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 410, rni: 600, ul: 1600 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 540, rni: 750, ul: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 620, rni: 850, ul: 2800 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 570, rni: 800, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 560, rni: 800, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 530, rni: 750, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 520, rni: 700, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 500, rni: 700, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 290, rni: 400, ul: 1100 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 390, rni: 550, ul: 1600 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 480, rni: 650, ul: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 450, rni: 650, ul: 2800 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 460, rni: 650, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 450, rni: 650, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 430, rni: 600, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 410, rni: 600, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 410, rni: 600, ul: 3000 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 50, rni: 70, ul: 3000, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 350, rni: 490, ul: 3000, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_D',
    standardKey: 'VITAMIN_D',
    category: 'FAT_SOLUBLE_VITAMIN',
    nameKorean: '비타민 D',
    nameEnglish: 'Vitamin D (Cholecalciferol / Ergocalciferol)',
    unit: 'μg',
    clinicalExcessNote: '고칼슘혈증(Hypercalcemia), 연조직 석회화, 신장결석 및 신기능 저하 (1μg = 40 IU, 성인 UL 100μg = 4,000 IU)',
    footnotes: ['1 μg 비타민 D = 40 IU (성인 충분섭취량 10μg = 400 IU, 65세 이상 15μg = 600 IU, 성인 상한섭취량 100μg = 4,000 IU)'],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 5, ul: 25 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 5, ul: 25 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 5, ul: 30 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 5, ul: 35 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 5, ul: 40 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 5, ul: 60 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 10, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 10, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 10, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 10, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 10, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 15, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 15, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 5, ul: 40 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 5, ul: 60 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 10, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 10, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 10, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 10, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 10, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 15, ul: 100 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 15, ul: 100 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, ul: 100, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 0, ul: 100, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_E',
    standardKey: 'VITAMIN_E',
    category: 'FAT_SOLUBLE_VITAMIN',
    nameKorean: '비타민 E',
    nameEnglish: 'Vitamin E (Tocopherol)',
    unit: 'mg α-TE',
    clinicalExcessNote: '혈액응고 저해, 혈소판 응집 감소, 출혈 경향 증가 및 위장장애',
    footnotes: [
      'α-TE = (α-토코페롤) + 0.5(β-토코페롤) + 0.1(γ-토코페롤) + 0.01(δ-토코페롤) + 0.3(α-토코트리에놀)'
    ],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 3 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 4 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 5, ul: 100 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 6, ul: 150 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 7, ul: 200 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 9, ul: 300 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 11, ul: 400 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 12, ul: 500 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 12, ul: 540 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 12, ul: 540 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 12, ul: 540 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 12, ul: 540 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 12, ul: 540 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 7, ul: 200 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 9, ul: 300 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 11, ul: 400 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 12, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 12, ul: 540 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 12, ul: 540 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 12, ul: 540 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 12, ul: 540 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 12, ul: 540 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, ul: 540, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 3, ul: 540, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_K',
    standardKey: 'VITAMIN_K',
    category: 'FAT_SOLUBLE_VITAMIN',
    nameKorean: '비타민 K',
    nameEnglish: 'Vitamin K (Phylloquinone / Menaquinone)',
    unit: 'μg',
    clinicalExcessNote: '상한섭취량 미설정 (단, 와파린 등 항응고제 복용 환자는 섭취 제한 및 전문가 상담 필수)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 4 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 6 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 25 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 40 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 55 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 70 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 80 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 75 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 75 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 75 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 75 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 75 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 40 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 55 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 65 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 65 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 65 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 65 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 65 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 65 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 65 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 0, isAddition: true }
    ]
  },

  // =========================================================================
  // [페이지 16~17] 수용성 비타민 (비타민 C, 티아민, 리보플라빈, 니아신, B6, 엽산, B12, 판토텐산, 비오틴)
  // =========================================================================
  {
    id: 'VITAMIN_C',
    standardKey: 'VITAMIN_C',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '비타민 C',
    nameEnglish: 'Vitamin C (Ascorbic Acid)',
    unit: 'mg',
    clinicalExcessNote: '위장관 장애(삼투성 설사, 복통, 속쓰림), 수산뇨 및 신장결석 위험 증가',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 40 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 55 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 30, rni: 40, ul: 340 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 35, rni: 45, ul: 510 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 40, rni: 50, ul: 750 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 55, rni: 70, ul: 1100 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 70, rni: 90, ul: 1400 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 80, rni: 100, ul: 1600 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 75, rni: 100, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 40, rni: 50, ul: 750 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 55, rni: 70, ul: 1100 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 70, rni: 90, ul: 1400 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 80, rni: 100, ul: 1600 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 75, rni: 100, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 75, rni: 100, ul: 2000 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 10, rni: 10, ul: 2000, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 35, rni: 40, ul: 2000, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B1',
    standardKey: 'VITAMIN_B1',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '티아민 (비타민 B1)',
    nameEnglish: 'Thiamin (Vitamin B1)',
    unit: 'mg',
    clinicalExcessNote: '수용성으로 소변 배설되어 공식 UL 미설정',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.2 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 0.3 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 0.4, rni: 0.4 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 0.4, rni: 0.5 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 0.5, rni: 0.7 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 0.7, rni: 0.9 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 0.9, rni: 1.1 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 1.1, rni: 1.3 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 1.0, rni: 1.2 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 1.0, rni: 1.2 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 1.0, rni: 1.2 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 0.9, rni: 1.1 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 0.6, rni: 0.7 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 0.8, rni: 0.9 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 0.8, rni: 1.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 0.7, rni: 0.8 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0.4, rni: 0.4, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0.3, rni: 0.4, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B2',
    standardKey: 'VITAMIN_B2',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '리보플라빈 (비타민 B2)',
    nameEnglish: 'Riboflavin (Vitamin B2)',
    unit: 'mg',
    clinicalExcessNote: '소변으로 신속 배설되어 공식 UL 미설정 (고함량 복용 시 소변이 밝은 노란색을 띰)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.3 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 0.4 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 0.4, rni: 0.5 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 0.5, rni: 0.6 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 0.7, rni: 0.9 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 0.9, rni: 1.1 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 1.2, rni: 1.5 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 1.4, rni: 1.7 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 1.3, rni: 1.5 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 1.3, rni: 1.5 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 1.3, rni: 1.5 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 1.2, rni: 1.4 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 1.1, rni: 1.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 0.6, rni: 0.8 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 0.8, rni: 1.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 1.0, rni: 1.2 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 1.0, rni: 1.2 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 1.0, rni: 1.2 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 1.0, rni: 1.2 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 1.0, rni: 1.2 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 0.9, rni: 1.1 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 0.8, rni: 1.0 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0.3, rni: 0.4, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0.4, rni: 0.5, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B3',
    standardKey: 'VITAMIN_B3',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '니아신 (비타민 B3)',
    nameEnglish: 'Niacin (Nicotinamide / Nicotinic Acid)',
    unit: 'mg NE',
    ulScopeNote: '상한섭취량은 형태에 따라 니코틴산(성인 35mg)과 니코틴아미드(성인 850mg, 2020년 1000mg에서 하향)로 구분 적용 (국내 비타민제는 대부분 니코틴아미드 형태)',
    clinicalExcessNote: '니코틴산 과잉 시 안면홍조·가려움·간독성, 니코틴아미드 고함량 과잉 시 위장관 장애 및 간독성 위험',
    footnotes: [
      '1 mg NE(니아신 당량) = 1 mg 니아신 = 60 mg 트립토판',
      '2025 개정: 변이계수를 15%→10%로 조정하여 성인 권장섭취량 변경(남 16→14, 여 14→13), 니코틴아미드 상한섭취량 불확실계수 1.5→2 적용(성인 1000→850mg)'
    ],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 2 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 3 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 4, rni: 5, ul: 150, ulSecondary: 10 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 5, rni: 6, ul: 200, ulSecondary: 10 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 7, rni: 8, ul: 300, ulSecondary: 15 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 9, rni: 11, ul: 450, ulSecondary: 20 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 11, rni: 14, ul: 600, ulSecondary: 25 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 13, rni: 16, ul: 650, ulSecondary: 30 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 12, rni: 14, ul: 850, ulSecondary: 35 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 12, rni: 14, ul: 850, ulSecondary: 35 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 12, rni: 14, ul: 850, ulSecondary: 35 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 11, rni: 13, ul: 850, ulSecondary: 35 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 10, rni: 12, ul: 850, ulSecondary: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 7, rni: 8, ul: 300, ulSecondary: 15 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 9, rni: 11, ul: 450, ulSecondary: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 11, rni: 14, ul: 600, ulSecondary: 25 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 11, rni: 13, ul: 650, ulSecondary: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 11, rni: 13, ul: 850, ulSecondary: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 11, rni: 13, ul: 850, ulSecondary: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 11, rni: 13, ul: 850, ulSecondary: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 10, rni: 12, ul: 850, ulSecondary: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 9, rni: 11, ul: 850, ulSecondary: 35 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 3, rni: 4, ul: 850, ulSecondary: 35, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 2, rni: 3, ul: 850, ulSecondary: 35, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B6',
    standardKey: 'VITAMIN_B6',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '비타민 B6',
    nameEnglish: 'Vitamin B6 (Pyridoxine / Pyridoxal Phosphate)',
    unit: 'mg',
    ulScopeNote: '2025 KDRIs 핵심 개정: 말초신경병증 안전성 강화를 위해 성인 상한섭취량을 기존 100mg/일에서 50mg/일로 50% 하향 조정',
    clinicalExcessNote: '장기 과량 섭취 시 감각신경병증(손발 따끔거림, 작열감, 저림 등 말초신경병증) 발생 위험',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.1 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 0.3 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 0.5, rni: 0.6, ul: 10 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 0.6, rni: 0.7, ul: 15 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 0.7, rni: 0.9, ul: 20 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 0.9, rni: 1.1, ul: 30 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 1.3, rni: 1.5, ul: 40 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 1.3, rni: 1.5, ul: 45 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 1.3, rni: 1.5, ul: 50 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 1.3, rni: 1.5, ul: 50 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 1.3, rni: 1.5, ul: 50 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 1.3, rni: 1.5, ul: 50 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 1.3, rni: 1.5, ul: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 0.7, rni: 0.9, ul: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 0.9, rni: 1.1, ul: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 1.2, rni: 1.4, ul: 40 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 1.2, rni: 1.4, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 1.2, rni: 1.4, ul: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 1.2, rni: 1.4, ul: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 1.2, rni: 1.4, ul: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 1.2, rni: 1.4, ul: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 1.2, rni: 1.4, ul: 50 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0.7, rni: 0.8, ul: 50, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0.7, rni: 0.8, ul: 50, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B9',
    standardKey: 'VITAMIN_B9',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '엽산 (비타민 B9)',
    nameEnglish: 'Folate / Folic Acid (Vitamin B9)',
    unit: 'μg DFE (UL은 보충제 μg)',
    ulScopeNote: '상한섭취량(1,000μg/일)은 강화식품·보충제로 섭취한 합성 엽산(μg/일)에 한하여 적용 (가임기 여성 400μg/일 엽산보충제 섭취 권장)',
    clinicalExcessNote: '비타민 B12 결핍에 의한 거대적아구성 빈혈 진단 지연(가림 효과) 및 신경학적 손상 위험 증가',
    footnotes: [
      '1.0 μg DFE = 1 μg 식품 중 엽산 = 0.6 μg 강화식품/식사와 함께 섭취한 보충제 중 엽산 = 0.5 μg 공복에 섭취한 보충제 중 엽산'
    ],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 65 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 90 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 120, rni: 150, ul: 300 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 150, rni: 180, ul: 400 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 180, rni: 220, ul: 500 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 250, rni: 300, ul: 600 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 300, rni: 360, ul: 800 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 330, rni: 400, ul: 900 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 320, rni: 400, ul: 1000 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 180, rni: 220, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 250, rni: 300, ul: 600 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 300, rni: 360, ul: 800 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 330, rni: 400, ul: 900 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 320, rni: 400, ul: 1000 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 320, rni: 400, ul: 1000 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 200, rni: 220, ul: 1000, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 130, rni: 150, ul: 1000, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B12',
    standardKey: 'VITAMIN_B12',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '비타민 B12',
    nameEnglish: 'Vitamin B12 (Cobalamin / Mecobalamin)',
    unit: 'μg',
    clinicalExcessNote: '수용성으로 체내 축적 독성이 보고되지 않아 공식 UL 미설정 (메트포르민 장기 복용 시 결핍 주의)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.3 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 0.5 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 0.8, rni: 0.9 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 0.9, rni: 1.1 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 1.1, rni: 1.3 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 1.5, rni: 1.7 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 1.9, rni: 2.3 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 2.0, rni: 2.4 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 2.0, rni: 2.4 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 2.0, rni: 2.4 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 2.0, rni: 2.4 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 2.0, rni: 2.4 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 2.0, rni: 2.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 1.1, rni: 1.3 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 1.5, rni: 1.7 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 1.9, rni: 2.3 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 2.0, rni: 2.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 2.0, rni: 2.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 2.0, rni: 2.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 2.0, rni: 2.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 2.0, rni: 2.4 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 2.0, rni: 2.4 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0.2, rni: 0.2, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0.3, rni: 0.4, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B5',
    standardKey: 'VITAMIN_B5',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '판토텐산 (비타민 B5)',
    nameEnglish: 'Pantothenic Acid (Vitamin B5)',
    unit: 'mg',
    clinicalExcessNote: '소변으로 배설되어 공식 UL 미설정',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 1.7 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 2.0 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 2.0 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 2.5 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 3.0 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 4.0 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 5.0 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 5.0 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 5.0 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 5.0 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 5.0 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 5.0 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 3.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 4.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 5.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 5.0 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 1.0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 2.0, isAddition: true }
    ]
  },
  {
    id: 'VITAMIN_B7',
    standardKey: 'VITAMIN_B7',
    category: 'WATER_SOLUBLE_VITAMIN',
    nameKorean: '비오틴 (비타민 B7)',
    nameEnglish: 'Biotin (Vitamin B7)',
    unit: 'μg',
    clinicalExcessNote: '공식 UL 미설정 (단, 고함량 비오틴 섭취 시 갑상선호르몬·트로포닌 등 혈액 진단검사 위양성/위음성 간섭 주의)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 5 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 7 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 9 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 12 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 15 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 20 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 25 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 15 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 25 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 30 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 5, isAddition: true }
    ]
  },

  // =========================================================================
  // [페이지 18] 비타민 유사 영양소 (콜린 - 2025년 최초 제정)
  // =========================================================================
  {
    id: 'CHOLINE',
    standardKey: 'CHOLINE',
    category: 'VITAMIN_LIKE',
    nameKorean: '콜린 (2025 신설)',
    nameEnglish: 'Choline',
    unit: 'mg',
    ulScopeNote: '2025 한국인 영양소 섭취기준에서 최초로 충분섭취량 및 상한섭취량 제정',
    clinicalExcessNote: '저혈압(콜린성 반응), 체취(어취증: 비린내), 타액분비 증가, 설사 및 TMAO 상승',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 110 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 150 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 160, ul: 700 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 190, ul: 1000 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 260, ul: 1000 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 350, ul: 1500 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 450, ul: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 480, ul: 2500 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 480, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 480, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 480, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 480, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 480, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 250, ul: 1000 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 330, ul: 1500 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 390, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 390, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 390, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 390, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 390, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 390, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 390, ul: 2500 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 80, ul: 2500, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 110, ul: 2500, isAddition: true }
    ]
  },

  // =========================================================================
  // [페이지 19] 다량무기질 (칼슘, 인, 나트륨, 염소, 칼륨, 마그네슘)
  // =========================================================================
  {
    id: 'CALCIUM',
    standardKey: 'CALCIUM',
    category: 'MACRO_MINERAL',
    nameKorean: '칼슘',
    nameEnglish: 'Calcium',
    unit: 'mg',
    clinicalExcessNote: '고칼슘혈증, 신장결석, 연조직 석회화, 변비 및 철·아연 흡수 저해',
    footnotes: [
      '임신부·수유부의 상한섭취량(±0)은 해당 연령 여성의 상한섭취량(19-29세 2,500mg, 30-49세 2,000mg)과 동일함'
    ],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 200, ul: 1000 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 300, ul: 1000 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 400, rni: 450, ul: 1500 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 450, rni: 550, ul: 2500 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 600, rni: 700, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 700, rni: 800, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 800, rni: 950, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 700, rni: 800, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 650, rni: 800, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 650, rni: 800, ul: 2500 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 650, rni: 800, ul: 2500 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 650, rni: 800, ul: 2500 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 650, rni: 800, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 600, rni: 700, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 700, rni: 800, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 700, rni: 850, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 550, rni: 700, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 500, rni: 650, ul: 2500 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 500, rni: 650, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 650, rni: 750, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 600, rni: 750, ul: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 600, rni: 750, ul: 2000 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0, rni: 0, ul: 2500, isAddition: true, note: '상한섭취량은 해당 연령 여성과 동일' },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0, rni: 0, ul: 2500, isAddition: true, note: '상한섭취량은 해당 연령 여성과 동일' }
    ]
  },
  {
    id: 'PHOSPHORUS',
    standardKey: 'PHOSPHORUS',
    category: 'MACRO_MINERAL',
    nameKorean: '인',
    nameEnglish: 'Phosphorus',
    unit: 'mg',
    clinicalExcessNote: '고인산혈증, 이차성 부갑상선기능항진증, 혈관 및 연조직 석회화',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 100 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 300 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 380, rni: 450, ul: 3000 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 480, rni: 600, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 500, rni: 600, ul: 3000 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 1000, rni: 1200, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 1000, rni: 1200, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 900, rni: 1100, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 540, rni: 650, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 500, rni: 600, ul: 3000 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 1000, rni: 1200, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 950, rni: 1100, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 850, rni: 1000, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 540, rni: 650, ul: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 540, rni: 650, ul: 3000 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0, rni: 0, ul: 3000, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0, rni: 0, ul: 3500, isAddition: true }
    ]
  },
  {
    id: 'SODIUM',
    category: 'MACRO_MINERAL',
    nameKorean: '나트륨',
    nameEnglish: 'Sodium',
    unit: 'mg',
    ulScopeNote: '상한섭취량 대신 만성질환위험감소섭취량(CDRR: 성인 2,300mg/일) 설정',
    clinicalExcessNote: '고혈압, 심혈관질환, 만성신장질환, 위암 및 요중 칼슘 배설 증가',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 110 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 370 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 630, cdrr: 1000 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 1000, cdrr: 1500 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 1100, cdrr: 1700 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 1300, cdrr: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 1500, cdrr: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 1500, cdrr: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 1500, cdrr: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 1500, cdrr: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 1500, cdrr: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 1300, cdrr: 1900 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 1200, cdrr: 1800 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 1100, cdrr: 1700 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 1300, cdrr: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 1500, cdrr: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 1500, cdrr: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 1500, cdrr: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 1500, cdrr: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 1500, cdrr: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 1300, cdrr: 1900 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 1200, cdrr: 1800 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, cdrr: 2300, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 0, cdrr: 2300, isAddition: true }
    ]
  },
  {
    id: 'CHLORIDE',
    category: 'MACRO_MINERAL',
    nameKorean: '염소',
    nameEnglish: 'Chloride',
    unit: 'mg',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 170 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 560 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 1000 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 1500 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 1700 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 2000 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 1900 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 1800 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 1700 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 2000 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 2300 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 1900 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 1800 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 0, isAddition: true }
    ]
  },
  {
    id: 'POTASSIUM',
    category: 'MACRO_MINERAL',
    nameKorean: '칼륨',
    nameEnglish: 'Potassium',
    unit: 'mg',
    clinicalExcessNote: '정상 신장 기능 시 UL 미설정 (단, 신장질환자·ACE억제제/ARB/칼륨보존이뇨제 복용자는 고칼륨혈증 위험 주의)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 400 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 700 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 1500 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 2300 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 2600 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 3100 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 3500 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 2600 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 3100 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 3500 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 3500 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 400, isAddition: true }
    ]
  },
  {
    id: 'MAGNESIUM',
    standardKey: 'MAGNESIUM',
    category: 'MACRO_MINERAL',
    nameKorean: '마그네슘',
    nameEnglish: 'Magnesium',
    unit: 'mg',
    ulScopeNote: '상한섭취량(성인 350mg/일)은 "식품 외 급원(영양제·보충제·의약품)"으로 섭취한 마그네슘에만 적용',
    clinicalExcessNote: '삼투성 설사(Osmotic Diarrhea), 복통 등 위장관 증상 및 신기능 저하 시 고마그네슘혈증',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 25 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 55 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 60, rni: 70, ul: 60 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 90, rni: 110, ul: 90 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 130, rni: 150, ul: 130 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 190, rni: 220, ul: 190 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 260, rni: 320, ul: 270 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 340, rni: 410, ul: 330 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 300, rni: 360, ul: 350 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 310, rni: 380, ul: 350 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 310, rni: 380, ul: 350 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 310, rni: 380, ul: 350 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 310, rni: 380, ul: 350 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 130, rni: 150, ul: 130 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 180, rni: 220, ul: 190 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 240, rni: 290, ul: 270 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 290, rni: 340, ul: 330 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 240, rni: 280, ul: 350 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 240, rni: 280, ul: 350 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 240, rni: 280, ul: 350 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 240, rni: 280, ul: 350 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 240, rni: 280, ul: 350 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 30, rni: 40, ul: 350, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0, rni: 0, ul: 350, isAddition: true }
    ]
  },

  // =========================================================================
  // [페이지 20~21] 미량무기질 (철, 아연, 구리, 불소, 망간, 요오드, 셀레늄, 몰리브덴, 크롬)
  // =========================================================================
  {
    id: 'IRON',
    standardKey: 'IRON',
    category: 'TRACE_MINERAL',
    nameKorean: '철',
    nameEnglish: 'Iron',
    unit: 'mg',
    clinicalExcessNote: '변비, 오심, 구토, 복통 등 위장장애 및 아연 흡수 저해',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.3, ul: 40 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ear: 4, rni: 6, ul: 40 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 4, rni: 6, ul: 40 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 4, rni: 6, ul: 40 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 5, rni: 7, ul: 40 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 6, rni: 8, ul: 40 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 8, rni: 11, ul: 40 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 8, rni: 11, ul: 45 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 6, rni: 8, ul: 45 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 6, rni: 8, ul: 45 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 6, rni: 8, ul: 45 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 6, rni: 8, ul: 45 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 5, rni: 7, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 5, rni: 7, ul: 40 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 6, rni: 8, ul: 40 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 8, rni: 13, ul: 40 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 7, rni: 12, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 7, rni: 12, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 7, rni: 12, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 5, rni: 7, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 4, rni: 6, ul: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 4, rni: 6, ul: 45 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 8, rni: 9, ul: 45, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 0, rni: 0, ul: 45, isAddition: true }
    ]
  },
  {
    id: 'ZINC',
    standardKey: 'ZINC',
    category: 'TRACE_MINERAL',
    nameKorean: '아연',
    nameEnglish: 'Zinc',
    unit: 'mg',
    clinicalExcessNote: '장기 과량(성인 35mg/일 초과) 섭취 시 구리(Copper) 흡수 저하, 면역기능 손상, HDL 콜레스테롤 감소',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 2 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ear: 2, rni: 3 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 2, rni: 3, ul: 6 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 3, rni: 4, ul: 9 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 4, rni: 5, ul: 13 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 7, rni: 8, ul: 19 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 7, rni: 8, ul: 27 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 8, rni: 10, ul: 33 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 9, rni: 10, ul: 35 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 8, rni: 10, ul: 35 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 8, rni: 10, ul: 35 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 8, rni: 9, ul: 35 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 7, rni: 9, ul: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 4, rni: 5, ul: 13 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 7, rni: 8, ul: 19 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 7, rni: 8, ul: 27 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 7, rni: 9, ul: 33 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 7, rni: 8, ul: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 7, rni: 8, ul: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 6, rni: 8, ul: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 6, rni: 7, ul: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 6, rni: 7, ul: 35 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 2.0, rni: 2.5, ul: 35, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 4.0, rni: 5.0, ul: 35, isAddition: true }
    ]
  },
  {
    id: 'COPPER',
    standardKey: 'COPPER',
    category: 'TRACE_MINERAL',
    nameKorean: '구리',
    nameEnglish: 'Copper',
    unit: 'μg',
    clinicalExcessNote: '간 손상 및 위장장애(오심, 설사, 속쓰림)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 240 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 330 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 220, rni: 290, ul: 1700 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 270, rni: 350, ul: 2600 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 360, rni: 460, ul: 3700 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 470, rni: 600, ul: 5500 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 600, rni: 800, ul: 7500 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 700, rni: 900, ul: 9500 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 650, rni: 850, ul: 10000 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 650, rni: 850, ul: 10000 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 650, rni: 850, ul: 10000 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 600, rni: 800, ul: 10000 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 600, rni: 800, ul: 10000 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 310, rni: 410, ul: 3700 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 420, rni: 550, ul: 5500 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 500, rni: 650, ul: 7500 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 550, rni: 750, ul: 9500 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 500, rni: 650, ul: 10000 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 500, rni: 650, ul: 10000 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 500, rni: 650, ul: 10000 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 460, rni: 600, ul: 10000 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 460, rni: 600, ul: 10000 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 100, rni: 130, ul: 10000, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 370, rni: 480, ul: 10000, isAddition: true }
    ]
  },
  {
    id: 'FLUORIDE',
    category: 'TRACE_MINERAL',
    nameKorean: '불소',
    nameEnglish: 'Fluoride',
    unit: 'mg',
    clinicalExcessNote: '치아불소증(8세 이하), 골격불소증(9세 이상)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.01, ul: 0.3 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 0.4, ul: 0.5 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 0.6, ul: 0.7 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 0.9, ul: 1.1 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 1.3, ul: 1.5 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 1.9, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 2.6, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 3.2, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 3.5, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 3.4, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 3.2, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 3.1, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 3.0, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 1.3, ul: 1.5 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 1.8, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 2.4, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 2.7, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 2.8, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 2.7, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 2.6, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 2.5, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 2.3, ul: 10.0 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, ul: 10.0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 0, ul: 10.0, isAddition: true }
    ]
  },
  {
    id: 'MANGANESE',
    standardKey: 'MANGANESE',
    category: 'TRACE_MINERAL',
    nameKorean: '망간',
    nameEnglish: 'Manganese',
    unit: 'mg',
    clinicalExcessNote: '신경독성(운동신경 장애, 인지기능 저하)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.01 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 0.8 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 1.5, ul: 2.0 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 2.0, ul: 3.0 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 2.5, ul: 4.0 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 3.0, ul: 6.0 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 4.0, ul: 8.0 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 4.0, ul: 10.0 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 4.0, ul: 11.0 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 4.0, ul: 11.0 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 4.0, ul: 11.0 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 4.0, ul: 11.0 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 4.0, ul: 11.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 2.5, ul: 4.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 3.0, ul: 6.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 3.5, ul: 8.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 3.5, ul: 10.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 3.5, ul: 11.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 3.5, ul: 11.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 3.5, ul: 11.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 3.5, ul: 11.0 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 3.5, ul: 11.0 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 0, ul: 11.0, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 0, ul: 11.0, isAddition: true }
    ]
  },
  {
    id: 'IODINE',
    standardKey: 'IODINE',
    category: 'TRACE_MINERAL',
    nameKorean: '요오드',
    nameEnglish: 'Iodine',
    unit: 'μg',
    clinicalExcessNote: '갑상선 기능항진증/저하증, 요오드 유도성 갑상선염 (임신부·수유부는 근거 부족으로 UL 미설정)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 130, ul: 250 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 180, ul: 250 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 50, rni: 70, ul: 300 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 65, rni: 90, ul: 300 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 75, rni: 100, ul: 500 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 80, rni: 110, ul: 500 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 100, rni: 140, ul: 1900 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 100, rni: 140, ul: 2200 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 100, rni: 150, ul: 2400 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 75, rni: 100, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 80, rni: 110, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 100, rni: 140, ul: 1900 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 100, rni: 140, ul: 2200 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 100, rni: 150, ul: 2400 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 100, rni: 150, ul: 2400 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 60, rni: 90, isAddition: true, note: '근거 부족으로 UL 미설정' },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 130, rni: 190, isAddition: true, note: '근거 부족으로 UL 미설정' }
    ]
  },
  {
    id: 'SELENIUM',
    standardKey: 'SELENIUM',
    category: 'TRACE_MINERAL',
    nameKorean: '셀레늄',
    nameEnglish: 'Selenium',
    unit: 'μg',
    clinicalExcessNote: '셀레늄증(탈모, 손톱 변성·부스러짐, 마늘 냄새 호흡, 피로감, 말초신경 이상)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 9, ul: 40 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 12, ul: 65 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 19, rni: 23, ul: 70 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 22, rni: 25, ul: 100 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 30, rni: 35, ul: 150 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 40, rni: 45, ul: 200 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 50, rni: 60, ul: 300 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 55, rni: 65, ul: 300 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 50, rni: 60, ul: 400 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 50, rni: 60, ul: 400 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 50, rni: 60, ul: 400 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 50, rni: 60, ul: 400 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 50, rni: 60, ul: 400 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 30, rni: 35, ul: 150 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 40, rni: 45, ul: 200 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 50, rni: 60, ul: 300 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 55, rni: 65, ul: 300 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 50, rni: 60, ul: 400 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 50, rni: 60, ul: 400 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 50, rni: 60, ul: 400 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 50, rni: 60, ul: 400 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 50, rni: 60, ul: 400 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 3, rni: 4, ul: 400, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 9, rni: 10, ul: 400, isAddition: true }
    ]
  },
  {
    id: 'MOLYBDENUM',
    standardKey: 'MOLYBDENUM',
    category: 'TRACE_MINERAL',
    nameKorean: '몰리브덴',
    nameEnglish: 'Molybdenum',
    unit: 'μg',
    clinicalExcessNote: '고요산뇨증, 관절통증 및 통풍 유사 증상, 구리 결핍 유발 가능',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월' },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월' },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 8, rni: 10, ul: 100 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 10, rni: 13, ul: 150 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 15, rni: 20, ul: 250 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 20, rni: 25, ul: 350 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 25, rni: 30, ul: 500 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 30, rni: 40, ul: 600 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 25, rni: 30, ul: 650 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 25, rni: 30, ul: 600 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 25, rni: 30, ul: 600 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 25, rni: 30, ul: 600 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 20, rni: 25, ul: 550 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 15, rni: 20, ul: 250 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 15, rni: 20, ul: 350 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 20, rni: 25, ul: 450 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 20, rni: 25, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 20, rni: 25, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 20, rni: 25, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 20, rni: 25, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 20, rni: 25, ul: 500 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 15, rni: 20, ul: 450 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 0, rni: 0, ul: 500, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 3, rni: 5, ul: 500, isAddition: true }
    ]
  },
  {
    id: 'CHROMIUM',
    standardKey: 'CHROMIUM',
    category: 'TRACE_MINERAL',
    nameKorean: '크롬',
    nameEnglish: 'Chromium',
    unit: 'μg',
    clinicalExcessNote: '공식 UL 미설정 (아연과 장내 흡수 경쟁 가능)',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 0.2 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 4.0 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 9 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 11 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 15 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 20 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 35 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 25 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 25 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 15 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 20 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 5, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 20, isAddition: true }
    ]
  },

  // =========================================================================
  // [페이지 12~14] 에너지·다량영양소·필수지방산(EPA+DHA 등)·단백질·필수아미노산·수분
  // =========================================================================
  {
    id: 'EPA_DHA',
    standardKey: 'EPA_DHA',
    category: 'ENERGY_MACRONUTRIENT',
    nameKorean: 'EPA + DHA (오메가-3 지방산)',
    nameEnglish: 'EPA + DHA (Omega-3 Fatty Acids)',
    unit: 'mg',
    clinicalExcessNote: '공식 UL 미설정 (단, 고용량 복용 시 출혈 경향 증가 가능, 항응고제·항혈소판제 복용 시 주의)',
    footnotes: [
      '0-5개월(100mg) 및 6-11개월(150mg)은 DHA 단일성분 기준, 임신부·수유부 300mg은 부가량이 아닌 총량(그중 최소 200mg은 DHA 권장)'
    ],
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 100, note: 'DHA 단일성분' },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 150, note: 'DHA 단일성분' },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 150 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 200 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 200 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 200 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 200 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 200 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 250 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 250 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 250 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 250 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 250 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 200 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 200 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 200 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 200 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 250 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 250 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 250 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 250 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 250 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 300, isAddition: false, note: '총량 300mg (DHA 200mg 포함)' },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 300, isAddition: false, note: '총량 300mg (DHA 200mg 포함)' }
    ]
  },
  {
    id: 'CARBOHYDRATE',
    category: 'ENERGY_MACRONUTRIENT',
    nameKorean: '탄수화물',
    nameEnglish: 'Carbohydrate',
    unit: 'g',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 55 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ai: 85 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 100, rni: 130 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 100, rni: 130 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 6세 이상 전연령', ear: 100, rni: 130 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 6세 이상 전연령', ear: 100, rni: 130 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ear: 35, rni: 45, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 55, rni: 70, isAddition: true }
    ]
  },
  {
    id: 'DIETARY_FIBER',
    category: 'ENERGY_MACRONUTRIENT',
    nameKorean: '식이섬유',
    nameEnglish: 'Dietary Fiber',
    unit: 'g',
    rows: [
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ai: 10 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ai: 15 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ai: 20 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ai: 20 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ai: 25 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ai: 25 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ai: 30 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ai: 30 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ai: 15 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ai: 20 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ai: 25 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ai: 25 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ai: 25 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부', ai: 5, isAddition: true },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ai: 5, isAddition: true }
    ]
  },
  {
    id: 'PROTEIN',
    category: 'ENERGY_MACRONUTRIENT',
    nameKorean: '단백질',
    nameEnglish: 'Protein',
    unit: 'g',
    rows: [
      { gender: 'ALL', ageGroup: 'INFANT_0_5M', ageLabel: '0-5개월', ai: 10 },
      { gender: 'ALL', ageGroup: 'INFANT_6_11M', ageLabel: '6-11개월', ear: 12, rni: 15 },
      { gender: 'ALL', ageGroup: 'TODDLER_1_2Y', ageLabel: '1-2세', ear: 15, rni: 20 },
      { gender: 'ALL', ageGroup: 'TODDLER_3_5Y', ageLabel: '3-5세', ear: 20, rni: 25 },
      { gender: 'MALE', ageGroup: 'AGE_6_8', ageLabel: '남 6-8세', ear: 30, rni: 35 },
      { gender: 'MALE', ageGroup: 'AGE_9_11', ageLabel: '남 9-11세', ear: 40, rni: 50 },
      { gender: 'MALE', ageGroup: 'AGE_12_14', ageLabel: '남 12-14세', ear: 50, rni: 60 },
      { gender: 'MALE', ageGroup: 'AGE_15_18', ageLabel: '남 15-18세', ear: 55, rni: 65 },
      { gender: 'MALE', ageGroup: 'AGE_19_29', ageLabel: '남 19-29세', ear: 50, rni: 65 },
      { gender: 'MALE', ageGroup: 'AGE_30_49', ageLabel: '남 30-49세', ear: 50, rni: 65 },
      { gender: 'MALE', ageGroup: 'AGE_50_64', ageLabel: '남 50-64세', ear: 50, rni: 60 },
      { gender: 'MALE', ageGroup: 'AGE_65_74', ageLabel: '남 65-74세', ear: 50, rni: 60 },
      { gender: 'MALE', ageGroup: 'AGE_75_PLUS', ageLabel: '남 75세 이상', ear: 50, rni: 60 },
      { gender: 'FEMALE', ageGroup: 'AGE_6_8', ageLabel: '여 6-8세', ear: 30, rni: 35 },
      { gender: 'FEMALE', ageGroup: 'AGE_9_11', ageLabel: '여 9-11세', ear: 40, rni: 45 },
      { gender: 'FEMALE', ageGroup: 'AGE_12_14', ageLabel: '여 12-14세', ear: 45, rni: 55 },
      { gender: 'FEMALE', ageGroup: 'AGE_15_18', ageLabel: '여 15-18세', ear: 45, rni: 55 },
      { gender: 'FEMALE', ageGroup: 'AGE_19_29', ageLabel: '여 19-29세', ear: 45, rni: 55 },
      { gender: 'FEMALE', ageGroup: 'AGE_30_49', ageLabel: '여 30-49세', ear: 40, rni: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_50_64', ageLabel: '여 50-64세', ear: 40, rni: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_65_74', ageLabel: '여 65-74세', ear: 40, rni: 50 },
      { gender: 'FEMALE', ageGroup: 'AGE_75_PLUS', ageLabel: '여 75세 이상', ear: 40, rni: 50 },
      { gender: 'PREGNANT', ageGroup: 'PREGNANT', ageLabel: '임신부 (2분기/3분기)', ear: 8, rni: 10, isAddition: true, note: '2분기 +8/+10g, 3분기 +25/+30g' },
      { gender: 'LACTATING', ageGroup: 'LACTATING', ageLabel: '수유부', ear: 20, rni: 25, isAddition: true }
    ]
  }
];

/**
 * 3) 성인(19~64세) 기준 다중 영양제 합산 및 상한섭취량(UL) 즉시 평가용 요약 테이블
 * - 기존 MOCK_KDRI_STANDARDS 와 100% 호환되면서 2025 KDRIs 전 영양소(비타민 13종 + 콜린 + 무기질 11종 + 오메가3)로 확장
 */
export const KDRI_2025_ADULT_STANDARDS: KdriReferenceValue[] = [
  {
    nutrientKey: 'VITAMIN_A',
    nutrientNameKorean: '비타민 A',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 500, // 남 560 / 여 450
    rni: 700, // 남 800 / 여 650
    ul: 3000,
    clinicalWarningThresholdNote: '3,000μg RAE/일 초과 시 간독성 및 임신부 태아 기형 유발 위험'
  },
  {
    nutrientKey: 'VITAMIN_D',
    nutrientNameKorean: '비타민 D',
    unit: 'IU', // 제품 표시단위 호환을 위해 IU 기본 병기 (10μg = 400IU, UL 100μg = 4000IU)
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 400, // 충분섭취량 10μg (400 IU), 65세 이상은 15μg (600 IU)
    ai: 400,
    ul: 4000, // 상한섭취량 100μg (4,000 IU)
    clinicalWarningThresholdNote: '4,000 IU(100μg)/일 초과 장기 복용 시 고칼슘혈증, 신장결석 및 연조직 석회화 위험'
  },
  {
    nutrientKey: 'VITAMIN_E',
    nutrientNameKorean: '비타민 E',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 12,
    ai: 12,
    ul: 540,
    clinicalWarningThresholdNote: '540mg α-TE/일 초과 시 혈액응고 억제 및 출혈 경향 증가 위험'
  },
  {
    nutrientKey: 'VITAMIN_K',
    nutrientNameKorean: '비타민 K',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 70, // 남 75 / 여 65
    ai: 70,
    clinicalWarningThresholdNote: 'UL 미설정이나 와파린(Warfarin) 복용 환자는 약효 길항 작용 주의'
  },
  {
    nutrientKey: 'VITAMIN_C',
    nutrientNameKorean: '비타민 C (Ascorbic acid)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 75,
    rni: 100,
    ul: 2000,
    clinicalWarningThresholdNote: '2,000mg/일 초과 섭취 시 삼투성 설사, 위장장애 및 수산칼슘 신장결석 위험 증가'
  },
  {
    nutrientKey: 'VITAMIN_B1',
    nutrientNameKorean: '비타민 B1 (Thiamine)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 1.0, // 남 1.0 / 여 0.9
    rni: 1.2, // 남 1.2 / 여 1.1
    clinicalWarningThresholdNote: '수용성 비타민으로 공식 UL 미설정 (소변 배설)'
  },
  {
    nutrientKey: 'VITAMIN_B2',
    nutrientNameKorean: '비타민 B2 (Riboflavin)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 1.2, // 남 1.3 / 여 1.0
    rni: 1.5, // 남 1.5 / 여 1.2
    clinicalWarningThresholdNote: '수용성 비타민으로 공식 UL 미설정 (복용 후 소변이 노란색을 띰)'
  },
  {
    nutrientKey: 'VITAMIN_B3',
    nutrientNameKorean: '니아신 (비타민 B3)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 12, // 남 12 / 여 11
    rni: 14, // 2025 개정: 남 14 / 여 13
    ul: 850, // 2025 개정: 니코틴아미드 850mg (니코틴산은 35mg)
    clinicalWarningThresholdNote: '2025 KDRIs 상한: 니코틴아미드 850mg/일 (니코틴산은 35mg/일). 초과 시 간독성 및 위장장애 위험'
  },
  {
    nutrientKey: 'VITAMIN_B5',
    nutrientNameKorean: '판토텐산 (비타민 B5)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 5.0,
    ai: 5.0,
    clinicalWarningThresholdNote: '수용성 비타민으로 공식 UL 미설정'
  },
  {
    nutrientKey: 'VITAMIN_B6',
    nutrientNameKorean: '비타민 B6 (Pyridoxine)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 1.3, // 남 1.3 / 여 1.2
    rni: 1.5, // 남 1.5 / 여 1.4
    ul: 50,   // ★ 2025 KDRIs 핵심 개정: 100mg -> 50mg으로 하향!
    clinicalWarningThresholdNote: '[2025 개정 주의] 성인 상한섭취량 50mg/일(기존 100mg에서 하향). 초과 장기 복용 시 손발 저림·작열감 등 말초신경병증 위험'
  },
  {
    nutrientKey: 'VITAMIN_B7',
    nutrientNameKorean: '비오틴 (비타민 B7)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 30,
    ai: 30,
    clinicalWarningThresholdNote: '공식 UL 미설정이나 고함량 복용 시 혈액 진단검사(갑상선·심장효소 등) 수치 왜곡 가능'
  },
  {
    nutrientKey: 'VITAMIN_B9',
    nutrientNameKorean: '엽산 (Folic acid)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 320,
    rni: 400,
    ul: 1000, // 보충제/강화식품 합성 엽산 기준
    clinicalWarningThresholdNote: '보충제 합성 엽산 1,000μg/일 초과 시 비타민 B12 결핍 신경손상 가림 효과 주의'
  },
  {
    nutrientKey: 'VITAMIN_B12',
    nutrientNameKorean: '비타민 B12 (Cobalamin)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 2.0,
    rni: 2.4,
    clinicalWarningThresholdNote: '수용성 비타민으로 체내 축적 독성이 극히 낮아 공식 UL 미설정'
  },
  {
    nutrientKey: 'CHOLINE',
    nutrientNameKorean: '콜린 (Choline)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 480, // 남 480 / 여 390 (충분섭취량)
    ai: 480,
    ul: 3000, // 남 3,000 / 여 2,500
    clinicalWarningThresholdNote: '2025 신설 기준(남성 UL 3,000mg / 여성 UL 2,500mg). 과잉 시 저혈압, 체취(비린내), 위장장애 위험'
  },
  {
    nutrientKey: 'CALCIUM',
    nutrientNameKorean: '칼슘 (Calcium)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 600, // 남 650 / 여 500~650
    rni: 750, // 남 800 / 여 650~750
    ul: 2500, // 19-29세 남 3000·여 2500 / 30세 이상 남 2500·여 2000
    clinicalWarningThresholdNote: '성인 상한 2,000~3,000mg/일 초과 시 고칼슘혈증, 신장결석 및 철·아연 흡수 방해'
  },
  {
    nutrientKey: 'MAGNESIUM',
    nutrientNameKorean: '마그네슘 (Magnesium)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 300, // 남 300~310 / 여 240
    rni: 360, // 남 360~380 / 여 280
    ul: 350,  // 식품 외 급원(영양제/보충제) 상한섭취량 350mg
    clinicalWarningThresholdNote: '식품 외 급원(영양제) 350mg/일 초과 시 삼투성 설사 및 신기능 저하 환자 고마그네슘혈증 위험'
  },
  {
    nutrientKey: 'IRON',
    nutrientNameKorean: '철 (Iron)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 7.0,  // 2025 개정: 남 6 / 여(19-49세) 7 / 여(50-64세) 5
    rni: 10.0, // 2025 개정: 남 8 / 여(19-49세) 12 / 여(50-64세) 7
    ul: 45,
    clinicalWarningThresholdNote: '45mg/일 초과 시 변비, 오심, 복통 등 위장관 장애 및 아연 흡수 저해 위험'
  },
  {
    nutrientKey: 'ZINC',
    nutrientNameKorean: '아연 (Zinc)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 8.0,  // 남 8~9 / 여 6~7
    rni: 10.0, // 남 10 / 여 8
    ul: 35,
    clinicalWarningThresholdNote: '35mg/일 초과 장기 복용 시 구리(Copper) 결핍, 면역 저하 및 HDL 콜레스테롤 감소 위험'
  },
  {
    nutrientKey: 'COPPER',
    nutrientNameKorean: '구리 (Copper)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 575, // 남 650 / 여 500
    rni: 750, // 남 850 / 여 650
    ul: 10000,
    clinicalWarningThresholdNote: '10,000μg(10mg)/일 초과 시 간 손상 및 위장관 장애 위험'
  },
  {
    nutrientKey: 'MANGANESE',
    nutrientNameKorean: '망간 (Manganese)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 3.8, // 남 4.0 / 여 3.5 (충분섭취량)
    ai: 3.8,
    ul: 11.0,
    clinicalWarningThresholdNote: '11mg/일 초과 시 신경독성 위험'
  },
  {
    nutrientKey: 'IODINE',
    nutrientNameKorean: '요오드 (Iodine)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 100,
    rni: 150,
    ul: 2400,
    clinicalWarningThresholdNote: '2,400μg(2.4mg)/일 초과 시 갑상선 기능 이상 위험'
  },
  {
    nutrientKey: 'SELENIUM',
    nutrientNameKorean: '셀레늄 (Selenium)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 50,
    rni: 60,
    ul: 400,
    clinicalWarningThresholdNote: '400μg/일 초과 시 탈모, 손톱 변성, 말초신경 이상 등 셀레늄증 위험'
  },
  {
    nutrientKey: 'MOLYBDENUM',
    nutrientNameKorean: '몰리브덴 (Molybdenum)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 23, // 남 25 / 여 20
    rni: 28, // 남 30 / 여 25
    ul: 600, // 남 600~650 / 여 500
    clinicalWarningThresholdNote: '성인 상한 500~650μg/일 초과 시 고요산혈증 및 통풍 유사 관절통 위험'
  },
  {
    nutrientKey: 'CHROMIUM',
    nutrientNameKorean: '크롬 (Chromium)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 25, // 남 30 / 여 20 (충분섭취량)
    ai: 25,
    clinicalWarningThresholdNote: '공식 UL 미설정'
  },
  {
    nutrientKey: 'EPA_DHA',
    nutrientNameKorean: 'EPA + DHA (오메가-3)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    rni: 250, // 성인 충분섭취량 250mg (임신·수유부 300mg)
    ai: 250,
    clinicalWarningThresholdNote: '공식 UL 미설정이나 고함량 복용 시 항혈소판·항응고제 병용 출혈 주의'
  }
];
