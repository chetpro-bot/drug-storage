/**
 * 약국용 임신·수유부 약물 안전성 대시보드 타입 및 5대 핵심 테이블 스키마 정의
 * - DATABASE_SCHEMA.md 와 1:1 매핑
 * - 원칙: 확인되지 않은 내용은 절대 임의로 생성하지 않고 '확인되지 않음' 또는 null로 처리
 */

export type SafetySummaryLevel =
  | 'LEVEL_1_SUPPORTED'     // 1. 사용 가능 근거 있음
  | 'LEVEL_2_LOW_RISK'      // 2. 비교적 낮은 위험
  | 'LEVEL_3_CAUTION'       // 3. 주의하여 사용
  | 'LEVEL_4_AVOID'         // 4. 사용 회피 권고
  | 'LEVEL_5_INSUFFICIENT'; // 5. 근거 부족

export type AdministrationRoute =
  | 'ORAL'
  | 'TOPICAL'
  | 'INJECTION'
  | 'INHALATION'
  | 'OPHTHALMIC';

export type PregnancyTrimester = 'T1' | 'T2' | 'T3';

export type InfantAgeGroup =
  | 'NEONATE'        // 신생아 (생후 0~4주)
  | 'INFANT_1_6M'    // 생후 1~6개월
  | 'INFANT_OVER_6M'; // 생후 6개월 이상

export type EvidenceQualityLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';

export interface WeekSpecificRiskWindow {
  startWeek: number;
  endWeek: number;
  level: SafetySummaryLevel;
  riskTitle: string;
  clinicalDetail: string;
}

export interface AgencyEvaluationEntry {
  agencyName: 'MotherToBaby (OTIS)' | 'BUMPS / UKTIS' | 'FDA PLLR' | 'LactMed (NIH)';
  summaryText: string;
  keyDifferenceNote?: string; // 국내 허가사항/DUR과 다른 경우 차이점 설명
  sourceUrl: string;
}

/**
 * ① Drug Master (국내 의약품 제품 마스터 테이블)
 */
export interface DrugMasterRecord {
  id: string;
  itemSeq: string; // 식약처 품목기준코드 (9자리)
  koreanProductName: string;
  englishIngredientsSummary: string;
  strengthText: string;
  dosageForm: string;
  route: AdministrationRoute;
  routeKorean: string;
  manufacturer: string;
  isCombination: boolean;
  mfdsPregnancyPrecautionText: string; // 국내 식약처 허가사항 내 임부·수유부 조항 원문
  durPregnancyTabooGrade: 'GRADE_1' | 'GRADE_2' | 'NONE';
  durPregnancyTabooDetail: string | null;
  productSourceUrl: string;
  updatedAt: string;
}

/**
 * ② Pregnancy Safety (임신부 안전성 테이블 - 성분 및 투여 경로 단위)
 */
export interface PregnancySafetyRecord {
  ingredientId: string;
  englishInn: string;
  koreanIngrName: string;
  therapeuticClass: string;
  route: AdministrationRoute;
  routeKorean: string;
  trimester1Level: SafetySummaryLevel;
  trimester2Level: SafetySummaryLevel;
  trimester3Level: SafetySummaryLevel;
  trimester1Summary: string;
  trimester2Summary: string;
  trimester3Summary: string;
  weekSpecificRisks: WeekSpecificRiskWindow[];
  congenitalMalformationData: string;
  miscarriageData: string;
  fetalToxicityData: string;
  fetalRenalRisk: string;
  fetalDuctusArteriosusRisk: string;
  maternalRisk: string;
  domesticDurGrade: '임부금기 1등급' | '임부금기 2등급' | '임부금기 미지정';
  domesticDurNoticeDetail: string;
  domesticPermitSummary: string;
  domesticVsInternationalComparison: string; // 국내 DUR/허가사항 vs 해외 임상 근거의 차이점 명시
  internationalAgencySummaries: AgencyEvaluationEntry[];
  clinicalRecommendation: string;
  evidenceQualityLevel: EvidenceQualityLevel;
  alternativeIngredientIds: string[];
  evidenceSourceIds: string[];
}

/**
 * ③ Lactation Safety (수유부 안전성 테이블 - 성분 및 투여 경로 단위)
 */
export interface LactationSafetyRecord {
  ingredientId: string;
  englishInn: string;
  koreanIngrName: string;
  therapeuticClass: string;
  route: AdministrationRoute;
  routeKorean: string;
  overallSafetyLevel: SafetySummaryLevel;
  milkConcentrationText: string;        // 미확인 시 반드시 '확인되지 않음' 포함
  infantSerumConcentrationText: string; // 미확인 시 반드시 '확인되지 않음' 포함
  ridRangeText: string;                 // 미확인 시 반드시 '확인되지 않음' 포함
  ridNumericMin: number | null;         // 원문 확인된 경우에만 숫자, 미확인 시 null (절대 임의 생성 금지)
  ridNumericMax: number | null;
  referenceInfantDoseMgPerKgDay: number | null;   // 문헌 기준 영아 일일 추정 섭취량 (mg/kg/day)
  referenceMaternalDoseMgPerKgDay: number | null; // 문헌 기준 산모 체중당 일일 투여량 (mg/kg/day)
  ridClinicalInterpretation: string;              // RID 10% 이하를 절대적 안전 기준으로 삼지 않는 임상적 해석
  halfLifeText: string;
  activeMetabolitesText: string;
  infantAdverseEffects: string;
  ageConsiderations: Record<
    InfantAgeGroup,
    {
      level: SafetySummaryLevel;
      title: string;
      clinicalNote: string;
    }
  >;
  pretermInfantRisk: {
    level: SafetySummaryLevel;
    clinicalNote: string;
  };
  continuationGuidance: string;
  domesticPermitLactationSummary: string;
  alternativeIngredientIds: string[];
  evidenceSourceIds: string[];
}

/**
 * ④ Evidence Sources (근거 문헌 및 원문 출처 테이블)
 */
export interface EvidenceSourceRecord {
  sourceId: string;
  ingredientId: string;
  organizationName:
    | 'LactMed (NIH)'
    | 'MotherToBaby (OTIS)'
    | 'BUMPS / UKTIS'
    | 'FDA PLLR'
    | '식약처 의약품안전나라'
    | '심평원/식약처 DUR'
    | '약학정보원 (KPIC)';
  documentTitle: string;
  originalUrl: string;
  studyDesign: string;
  studySubjects: string;
  studyScale: string;
  keyFindings: string;
  studyLimitations: string;
  publishedDate: string;
  collectedDate: string;
  lastVerifiedDate: string;
}

/**
 * ⑤ Ingredient Mapping (국내 제품 ↔ 성분 매핑 테이블)
 */
export interface IngredientMappingRecord {
  mappingId: string;
  drugMasterId: string;
  koreanProductName: string;
  itemSeq: string;
  koreanIngredientName: string;
  englishIngredientName: string;
  ingredientId: string; // 미검증/미등록 성분은 'UNVERIFIED_INGREDIENT'
  amountText: string;
  dosageForm: string;
  route: AdministrationRoute;
  isCombination: boolean;
  verificationStatus: 'VERIFIED_CORE_5' | 'UNVERIFIED_IN_MVP';
}

/**
 * 통합 검색 결과 (단일 성분 또는 국내 단일제/복합제 제품)
 */
export interface MaternalSearchResult {
  resultType: 'INGREDIENT_DIRECT' | 'DOMESTIC_PRODUCT';
  id: string;
  displayName: string;
  subLabel: string;
  isCombination: boolean;
  drugMaster?: DrugMasterRecord;
  mappedIngredients: IngredientMappingRecord[];
  primaryIngredientId: string;
}
