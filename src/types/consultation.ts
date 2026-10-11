import { Gender, IntakeAnalysisResult } from './kdri';
import { DetectedInteractionAlert } from './interaction';

/**
 * 환자 임상 프로필
 */
export interface PatientClinicalProfile {
  id: string;
  name?: string;
  age: number;
  gender: Gender;
  isPregnant?: boolean;
  isLactating?: boolean;
  
  // 기저질환 (ICD-10 또는 한국어 질환명, 예: "만성 신부전(CKD)", "통풍", "역류성 식도염")
  conditions: string[];

  // 현재 복용 중인 전문의약품(ETC: Ethical Over-The-Counter / Prescription Drug) 성분 리스트 (영문 INN)
  currentPrescriptions: {
    drugNameKorean: string;
    englishInn: string;             // 예: "Ciprofloxacin", "Levothyroxine", "Aspirin"
    dosageDetail?: string;
  }[];

  allergies: string[];              // 알레르기 및 과민반응 이력
}

/**
 * 상담 시뮬레이션에 담긴 영양제 항목
 */
export interface ConsultationRegimenItem {
  productId: string;
  customDailyServings?: number;     // 환자 맞춤 1일 복용 횟수 (미입력 시 제품 기본값 사용)
  customAmountPerServing?: number;  // 1회 복용량
  dosingTime: 'MORNING' | 'NOON' | 'EVENING' | 'BEDTIME' | 'SPLIT_MEAL'; // 복용 시간대
  withFood: boolean;                // 식후 복용 여부
}

/**
 * 복약 상담 세션 전체 결과 및 출력물 모델
 */
export interface ConsultationSession {
  sessionId: string;
  patient: PatientClinicalProfile;
  selectedItems: ConsultationRegimenItem[];
  
  // 임상 분석 결과
  kdriAnalysis: IntakeAnalysisResult[];
  detectedAlerts: DetectedInteractionAlert[];

  // 약사 복약 지도 및 상담 요약
  pharmacistNotes: string;          // 약사 내부 기록 메모
  patientHandoutSummary: string;    // 환자 제공용 출력/카카오톡 전송 복약 지도문
  evaluatedAt: string;
}
