/**
 * 임신부·수유부 약물 안전성 대시보드 간소화 스키마 및 타입 정의
 *
 * [4대 공식 데이터 소스]
 * ① 식약처 의약품 허가사항 (DrugPrdtPrmsnInfoService08 / 의약품안전나라 nedrug)
 * ② 식약처 DUR 임부금기 (DURPrdlstInfoService03 / DURIrdntInfoService03)
 * ③ 호주 TGA 임신부 약물 분류 (Prescribing medicines in pregnancy database)
 * ④ NIH LactMed 수유부 약물 정보 (NCBI Bookshelf NBK501922)
 *
 * [절대 원칙]
 * - API 응답과 원문에 없는 정보를 생성하지 않음
 * - 원문에 없는 RID를 추정하거나 생성하지 않음
 * - 자체 5단계 안전성 등급이나 복합제 임의 통합 등급을 생성하지 않음
 * - API 오류와 실제 자료 부재를 명확히 구분함
 */

export type DataFetchStatus = 'SUCCESS' | 'NO_DATA' | 'API_ERROR';

export type IngredientMatchConfidence =
  | 'EXACT'        // 주성분(INN) 정확 일치
  | 'SALT_MAPPED'  // 염(Salt)·수화물 형태에서 유효 주성분(INN)으로 확인 후 매칭
  | 'UNCERTAIN'    // 매칭이 불확실하여 사용자 확인이 필요한 경우 (TGA 등급 미표시)
  | 'UNMATCHED';   // 해외 성분 매칭 테이블에 등록되지 않은 성분

export type TgaPregnancyCategoryCode = 'A' | 'B1' | 'B2' | 'B3' | 'C' | 'D' | 'X';

/**
 * 국내 의약품 유효성분 및 해외 성분 매칭 정보
 */
export interface DomesticIngredientItem {
  koreanName: string;                   // 식약처 원문 한글 성분명 (예: 이부프로펜, 아목시실린수화물)
  englishName: string;                  // 식약처 원문 영문 성분명
  matchedInn: string | null;            // 매칭된 해외 표준 성분명 (예: Ibuprofen, Amoxicillin)
  amountText: string;                   // 함량 및 단위 (예: 400mg, 500mg(역가))
  dosageForm: string;                   // 제형 (예: 정제, 연질캡슐, 시럽제, 크림제)
  route: string;                        // 투여경로 (예: 경구, 외용, 주사, 점안, 흡입)
  saltOrFormNote?: string;              // 염·수화물·제형 확인 메모
  matchConfidence: IngredientMatchConfidence;
  matchWarningNote?: string;            // 불확실 매칭 또는 복합 염 안내 문구
}

/**
 * ① 식약처 의약품 허가사항 (임부·수유부 투여 관련 내용)
 */
export interface MfdsLabelSafetyInfo {
  status: DataFetchStatus;
  errorMessage?: string;
  pregnancySectionTitle: string | null; // 추출된 임부 관련 조항 제목
  pregnancyKeyText: string | null;      // 임부 관련 핵심 문구 (원문 그대로 추출, 생성 금지)
  pregnancyFullText: string | null;     // 임부 관련 조항 원문 전체
  lactationSectionTitle: string | null; // 추출된 수유부 관련 조항 제목
  lactationKeyText: string | null;      // 수유부 관련 핵심 문구 (원문 그대로 추출, 생성 금지)
  lactationFullText: string | null;     // 수유부 관련 조항 원문 전체
  fullPrecautionsText: string | null;   // 사용상의 주의사항 전체 원문 (상세보기용)
  sourceUrl: string;                    // 식약처 의약품안전나라 품목 상세 원문 링크
  updatedAt: string;                    // 허가/변경 기준일
}

/**
 * ② 식약처 DUR 임부금기 개별 항목
 */
export interface MfdsDurTabooEntry {
  durSeq?: string;                      // DUR 일련번호
  mixType: '단일' | '복합';             // 단일/복합 구분
  ingrCode?: string;                    // 식약처 DUR 성분코드 (예: D000363)
  ingrName: string;                     // 한글 성분명
  ingrEngName: string;                  // 영문 성분명
  grade: '1등급' | '2등급' | '임부금기'; // 임부금기 등급
  prohibitContent: string | null;       // 금기 사유 및 적용 조건 (임신 주수 조건 등 원문)
  formName: string | null;              // 적용 제형
  remark: string | null;                // 비고 / 예외 조건 (예: 겔제, 첩부제 포함 / 점안제 제외 등)
  notificationDate: string | null;      // 고시일자 (YYYY-MM-DD)
}

/**
 * ② 식약처 DUR 임부금기 통합 결과
 */
export interface MfdsDurPregnantTabooInfo {
  status: DataFetchStatus;
  errorMessage?: string;
  hasTaboo: boolean;
  highestGrade: '1등급' | '2등급' | null;
  entries: MfdsDurTabooEntry[];
  sourceUrl: string;
  updatedAt: string;
}

/**
 * ③ 호주 TGA 임신부 약물 분류 정보 (성분별)
 */
export interface TgaPregnancyCategoryInfo {
  matchedInn: string;
  category: TgaPregnancyCategoryCode;
  categoryDefinitionKorean: string;     // 등급에 대한 간단한 공식 설명 (한국어)
  categoryDefinitionEnglish: string;    // TGA 공식 영문 정의
  ingredientNoteKorean?: string | null; // 성분별 추가 설명 (있는 경우)
  ingredientNoteEnglish?: string | null;// 성분별 추가 설명 원문 (있는 경우)
  routeOrFormCondition?: string | null; // 특정 제형/투여경로 조건이 있는 경우
  sourceUrl: string;
  updatedAt: string;
}

/**
 * ④ NIH LactMed 수유부 약물 정보 (성분별)
 */
export interface LactMedMonographInfo {
  matchedInn: string;
  drugTitle: string;                    // LactMed 원문 표제어
  pmcid: string;                        // LM 문서 번호 (예: LM330, LM142)
  nbkId: string;                        // NCBI Bookshelf Accession ID (예: NBK501194, NBK500986)
  summaryKorean: string;                // Summary of Use During Lactation 한국어 핵심 요약
  summaryOriginalEnglish: string;       // Summary of Use During Lactation 영문 원문
  infantAdverseEffectsKorean: string;   // 영아 이상반응 한국어 요약
  infantAdverseEffectsOriginal: string; // Effects in Breastfed Infants 영문 원문
  ridOriginalText: string | null;       // 원문에 제시된 RID 문구/수치 (원문에 없으면 반드시 null, 절대 생성/추정 금지)
  ridKoreanSummary: string | null;      // 원문에 RID가 있는 경우에만 해당 수치 안내 (없으면 null)
  drugLevelsKorean?: string | null;     // 모유 농도 및 영아 혈중 농도 한국어 요약/번역
  drugLevelsOriginal: string | null;    // 모유 농도 및 영아 혈중 농도 상세 원문 (상세보기용)
  lactationEffectsKorean?: string | null; // 모유 분비량 영향 한국어 요약/번역
  lactationEffectsOriginal?: string | null; // 모유 분비량 영향 원문 (예: 슈도에페드린 등)
  sourceUrl: string;                    // https://www.ncbi.nlm.nih.gov/books/{nbkId}/
  lastRevisedDate: string;              // LactMed 원문 최종 개정일 (YYYY-MM-DD)
}

/**
 * 개별 유효성분 단위 안전성 매칭 결과 (단일제 및 복합제의 각 성분별 표시용)
 */
export interface IngredientSafetyEvaluation {
  ingredient: DomesticIngredientItem;
  durEntries: MfdsDurTabooEntry[];
  durStatus: DataFetchStatus;
  tgaStatus: 'MATCHED' | 'UNCERTAIN_MATCH_HIDDEN' | 'NO_DATA';
  tgaInfo: TgaPregnancyCategoryInfo | null;
  lactmedStatus: 'MATCHED' | 'LIVE_LINK_ONLY' | 'NO_DATA';
  lactmedInfo: LactMedMonographInfo | null;
}

/**
 * 검색 후보 항목 (국내 제품명 / 국내 성분명 / 영문 성분명 검색 결과)
 */
export interface MaternalDrugSearchCandidate {
  itemSeq: string;                      // 식약처 품목기준코드
  productName: string;                  // 국내 제품명
  manufacturer: string;                 // 제조사
  etcOtcName: string;                   // 전문의약품 / 일반의약품
  dosageForm: string;                   // 제형 및 성상
  route: string;                        // 투여경로
  mainIngredientsText: string;          // 주성분 요약 텍스트
  isCombination: boolean;               // 복합제 여부
  matchedKeywordNote?: string;          // 성분명 검색 시 매칭 안내
  rawMfdsItem?: Record<string, any>;    // 식약처 API 원본 캐시
}

/**
 * 제품 선택 시 단일 화면에 표시되는 최종 통합 리포트
 */
export interface MaternalDrugSafetyReport {
  // 제품 기본정보
  itemSeq: string;
  productName: string;
  manufacturer: string;
  etcOtcName: string;
  dosageForm: string;
  chartText: string;
  route: string;
  isCombination: boolean;
  ingredients: DomesticIngredientItem[];
  rawIngredientsText: string;
  permitUrl: string;
  permitUpdatedAt: string;

  // ① 식약처 허가사항 (제품 단위)
  mfdsLabel: MfdsLabelSafetyInfo;

  // ② 식약처 DUR 임부금기 (제품 + 성분 단위 통합)
  mfdsDur: MfdsDurPregnantTabooInfo;

  // ③ & ④ 성분별 개별 매칭 결과 (단일제는 1개, 복합제는 전체 유효성분 각각 개별 표시)
  ingredientEvaluations: IngredientSafetyEvaluation[];
}
