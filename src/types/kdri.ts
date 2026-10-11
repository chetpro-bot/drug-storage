import { NutrientStandardKey } from './ingredient';

/**
 * 한국인 영양소 섭취기준(KDRIs: Dietary Reference Intakes for Koreans) 데이터 모델
 */

export type Gender = 'MALE' | 'FEMALE' | 'ALL';
export type LifeStage = 
  | 'CHILD'         // 소아 (6~11세)
  | 'ADOLESCENT'    // 청소년 (12~18세)
  | 'ADULT_YOUNG'   // 청년 (19~29세)
  | 'ADULT_MIDDLE'  // 중장년 (30~49세)
  | 'ADULT_OLDER'   // 장년 (50~64세)
  | 'ELDERLY'       // 고령 (65세 이상)
  | 'PREGNANT'      // 임산부
  | 'LACTATING';     // 수유부

export interface KdriReferenceValue {
  nutrientKey: NutrientStandardKey;
  nutrientNameKorean: string;
  unit: 'mg' | 'ug' | 'IU' | 'g';
  gender: Gender;
  minAge: number;
  maxAge: number;
  
  ear?: number;   // EAR(Estimated Average Requirement - 평균필요량)
  rni: number;    // RNI(Recommended Nutrient Intake - 권장섭취량)
  ai?: number;    // AI(Adequate Intake - 충분섭취량): RNI가 없는 경우 적용
  ul?: number;    // UL(Tolerable Upper Intake Level - 상한섭취량): 안전 상한치 (초과 시 부작용 위험)

  clinicalWarningThresholdNote?: string; // 상한 도달 시 임상적 우려 증상 (예: "신결석 위험", "감각신경병증 위험")
}

export type IntakeStatusLevel = 
  | 'INSUFFICIENT'      // RNI 대비 < 80% (부족 우려)
  | 'ADEQUATE'          // RNI 대비 80% ~ 200% (적정 권장 수준)
  | 'OPTIMAL_HIGH'      // 200% ~ UL 80% (고함량 최적화 구간)
  | 'APPROACHING_UL'    // UL의 80% ~ 100% (상한섭취량 근접 경고)
  | 'EXCEEDED_UL';      // UL > 100% (상한섭취량 초과 위험)

export interface IntakeAnalysisResult {
  nutrientKey: NutrientStandardKey;
  nutrientNameKorean: string;
  totalDailyIntake: number;
  unit: string;
  rni: number;
  ul?: number;
  rniPercentage: number;   // RNI 대비 섭취 비율 (%)
  ulPercentage?: number;   // UL 대비 섭취 비율 (%)
  statusLevel: IntakeStatusLevel;
  contributingProducts: {
    productId: string;
    productName: string;
    amount: number;
  }[];
  clinicalAdviceKorean: string;
}
