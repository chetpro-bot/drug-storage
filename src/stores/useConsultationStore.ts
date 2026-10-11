import { create } from 'zustand';
import { PatientClinicalProfile, ConsultationRegimenItem } from '../types/consultation';
import { IntakeAnalysisResult, IntakeStatusLevel } from '../types/kdri';
import { DetectedInteractionAlert } from '../types/interaction';
import { MOCK_KDRI_STANDARDS } from '../constants/kdri2020';
import { CLINICAL_DDI_RULES } from '../constants/ddiRules';
import { useProductStore } from './useProductStore';

interface ConsultationState {
  patient: PatientClinicalProfile;
  regimenItems: ConsultationRegimenItem[];
  pharmacistNotes: string;

  // Patient Actions
  setPatient: (patient: Partial<PatientClinicalProfile>) => void;
  addPrescriptionDrug: (drug: { drugNameKorean: string; englishInn: string; dosageDetail?: string }) => void;
  removePrescriptionDrug: (englishInn: string) => void;

  // Regimen Actions
  addRegimenItem: (productId: string) => void;
  removeRegimenItem: (productId: string) => void;
  updateRegimenItem: (productId: string, partial: Partial<ConsultationRegimenItem>) => void;
  clearRegimen: () => void;
  setPharmacistNotes: (notes: string) => void;

  // Clinical Analysis Computations
  getAggregatedKdriAnalysis: () => IntakeAnalysisResult[];
  getDetectedInteractions: () => DetectedInteractionAlert[];
  generatePatientHandout: () => string;
}

const DEFAULT_PATIENT: PatientClinicalProfile = {
  id: 'pt_sample_01',
  name: '김약국단골',
  age: 45,
  gender: 'MALE',
  conditions: ['만성 피로', '역류성 식도염'],
  currentPrescriptions: [
    {
      drugNameKorean: '사이톱신정 (시프로플록사신)',
      englishInn: 'Ciprofloxacin',
      dosageDetail: '500mg 1일 2회 복용'
    }
  ],
  allergies: ['Penicillin 과민반응']
};

export const useConsultationStore = create<ConsultationState>((set, get) => ({
  patient: DEFAULT_PATIENT,
  regimenItems: [
    {
      productId: 'prod_bmax_meta',
      dosingTime: 'MORNING',
      withFood: true
    },
    {
      productId: 'prod_health_zinc_gluconate',
      dosingTime: 'NOON',
      withFood: true
    }
  ],
  pharmacistNotes: '항생제 처방 복용 기간 중 미네랄 흡수 저하 주의 상담 진행 중',

  setPatient: (partial) =>
    set((state) => ({ patient: { ...state.patient, ...partial } })),

  addPrescriptionDrug: (drug) =>
    set((state) => ({
      patient: {
        ...state.patient,
        currentPrescriptions: [...state.patient.currentPrescriptions, drug]
      }
    })),

  removePrescriptionDrug: (englishInn) =>
    set((state) => ({
      patient: {
        ...state.patient,
        currentPrescriptions: state.patient.currentPrescriptions.filter(
          (d) => d.englishInn.toLowerCase() !== englishInn.toLowerCase()
        )
      }
    })),

  addRegimenItem: (productId) =>
    set((state) => {
      if (state.regimenItems.some((item) => item.productId === productId)) {
        return state;
      }
      return {
        regimenItems: [
          ...state.regimenItems,
          { productId, dosingTime: 'MORNING', withFood: true }
        ]
      };
    }),

  removeRegimenItem: (productId) =>
    set((state) => ({
      regimenItems: state.regimenItems.filter((i) => i.productId !== productId)
    })),

  updateRegimenItem: (productId, partial) =>
    set((state) => ({
      regimenItems: state.regimenItems.map((item) =>
        item.productId === productId ? { ...item, ...partial } : item
      )
    })),

  clearRegimen: () => set({ regimenItems: [] }),
  setPharmacistNotes: (notes) => set({ pharmacistNotes: notes }),

  // KDRIs 영양소 섭취량 합산 및 상한(UL) 분석
  getAggregatedKdriAnalysis: () => {
    const { regimenItems } = get();
    const products = useProductStore.getState().products;

    // nutrientKey별 일일 총 섭취량 집계 맵
    const intakeMap = new Map<
      string,
      {
        total: number;
        unit: string;
        contributions: { productId: string; productName: string; amount: number }[];
      }
    >();

    regimenItems.forEach((regItem) => {
      const product = products.find((p) => p.id === regItem.productId);
      if (!product) return;

      const dailyServings = regItem.customDailyServings ?? product.dailyServings;
      const amountPerServing = regItem.customAmountPerServing ?? product.amountPerServing;
      const multiplier = dailyServings * (amountPerServing / product.amountPerServing);

      product.ingredients.forEach((ing) => {
        if (!ing.standardKey) return;

        // 원소 환산량(elementalAmount)이 존재하면 우선 적용, 없으면 rawAmount 적용
        const effectiveAmount = (ing.elementalAmount ?? ing.rawAmount) * multiplier;

        const current = intakeMap.get(ing.standardKey) || {
          total: 0,
          unit: ing.unit,
          contributions: []
        };

        current.total += effectiveAmount;
        current.contributions.push({
          productId: product.id,
          productName: product.productName,
          amount: effectiveAmount
        });

        intakeMap.set(ing.standardKey, current);
      });
    });

    // MOCK_KDRI_STANDARDS와 매핑하여 상태 판정
    const results: IntakeAnalysisResult[] = [];

    intakeMap.forEach((data, nutrientKey) => {
      const kdriRef = MOCK_KDRI_STANDARDS.find((k) => k.nutrientKey === nutrientKey);
      if (!kdriRef) return;

      const rniPercentage = Math.round((data.total / kdriRef.rni) * 100);
      const ulPercentage = kdriRef.ul ? Math.round((data.total / kdriRef.ul) * 100) : undefined;

      let statusLevel: IntakeStatusLevel = 'ADEQUATE';
      let clinicalAdviceKorean = '적정 권장량 범위 내에서 안전하게 복용 중입니다.';

      if (kdriRef.ul && data.total > kdriRef.ul) {
        statusLevel = 'EXCEEDED_UL';
        clinicalAdviceKorean = `[경고] 상한섭취량(UL: Tolerable Upper Intake Level, ${kdriRef.ul}${kdriRef.unit})을 초과했습니다. ${kdriRef.clinicalWarningThresholdNote || '부작용 위험이 있으므로 용량 감량을 권장합니다.'}`;
      } else if (kdriRef.ul && data.total >= kdriRef.ul * 0.8) {
        statusLevel = 'APPROACHING_UL';
        clinicalAdviceKorean = `[주의] 상한섭취량의 80% 이상에 도달했습니다. 추가 영양제 병용 시 주의가 필요합니다.`;
      } else if (rniPercentage >= 200) {
        statusLevel = 'OPTIMAL_HIGH';
        clinicalAdviceKorean = `피로회복 및 결핍 개선을 위한 고함량 최적 섭취 구간입니다.`;
      } else if (rniPercentage < 80) {
        statusLevel = 'INSUFFICIENT';
        clinicalAdviceKorean = `권장섭취량(RNI: Recommended Nutrient Intake) 대비 부족합니다. 추가 섭취를 고려할 수 있습니다.`;
      }

      results.push({
        nutrientKey: kdriRef.nutrientKey,
        nutrientNameKorean: kdriRef.nutrientNameKorean,
        totalDailyIntake: Number(data.total.toFixed(2)),
        unit: data.unit,
        rni: kdriRef.rni,
        ul: kdriRef.ul,
        rniPercentage,
        ulPercentage,
        statusLevel,
        contributingProducts: data.contributions,
        clinicalAdviceKorean
      });
    });

    return results;
  },

  // 처방약 상호작용(DDI) 실시간 분석
  getDetectedInteractions: () => {
    const { patient, regimenItems } = get();
    const products = useProductStore.getState().products;
    const alerts: DetectedInteractionAlert[] = [];

    if (patient.currentPrescriptions.length === 0 || regimenItems.length === 0) {
      return alerts;
    }

    regimenItems.forEach((regItem) => {
      const product = products.find((p) => p.id === regItem.productId);
      if (!product) return;

      product.ingredients.forEach((ing) => {
        patient.currentPrescriptions.forEach((rx) => {
          // DDI 룰 매칭
          CLINICAL_DDI_RULES.forEach((rule) => {
            const hasTriggerIngredient = rule.triggerSupplementIngredients.some(
              (trigger) => trigger.toLowerCase() === ing.englishInn.toLowerCase()
            );

            const hasTargetPrescription = rule.targetDrugInnList.some(
              (target) => target.toLowerCase() === rx.englishInn.toLowerCase()
            );

            if (hasTriggerIngredient && hasTargetPrescription) {
              // 중복 알림 방지
              const exists = alerts.some(
                (a) =>
                  a.ruleId === rule.id &&
                  a.triggerSupplementName === product.productName &&
                  a.interactedPrescriptionDrug === rx.drugNameKorean
              );

              if (!exists) {
                alerts.push({
                  ruleId: rule.id,
                  severity: rule.severity,
                  titleKorean: rule.titleKorean,
                  triggerSupplementName: product.productName,
                  triggerIngredientEnglishInn: ing.englishInn,
                  interactedPrescriptionDrug: rx.drugNameKorean,
                  mechanismKorean: rule.clinicalDescriptionKorean,
                  managementGuidelineKorean: rule.managementGuidelineKorean
                });
              }
            }
          });
        });
      });
    });

    return alerts;
  },

  // 환자 제공용 복약 지도서 텍스트 생성
  generatePatientHandout: () => {
    const { patient, regimenItems, getAggregatedKdriAnalysis, getDetectedInteractions } = get();
    const products = useProductStore.getState().products;
    const kdriResults = getAggregatedKdriAnalysis();
    const ddiAlerts = getDetectedInteractions();

    let output = `========================================\n`;
    output += `[약국 맞춤 복약 상담 가이드]\n`;
    output += `고객명: ${patient.name || '고객'}님 (만 ${patient.age}세 / ${patient.gender === 'MALE' ? '남성' : '여성'})\n`;
    output += `발행일: ${new Date().toLocaleDateString('ko-KR')}\n`;
    output += `========================================\n\n`;

    output += `■ 복용 중인 처방 의약품(ETC: Ethical Over-The-Counter):\n`;
    if (patient.currentPrescriptions.length === 0) {
      output += `- 특별한 복용 처방약 없음\n`;
    } else {
      patient.currentPrescriptions.forEach((rx) => {
        output += `- ${rx.drugNameKorean} (${rx.englishInn}) [${rx.dosageDetail || '복용중'}]\n`;
      });
    }

    output += `\n■ 맞춤 추천/복용 영양제 조합:\n`;
    regimenItems.forEach((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return;
      const timingKo = item.dosingTime === 'MORNING' ? '아침' : item.dosingTime === 'NOON' ? '점심' : '저녁';
      output += `${idx + 1}. [${prod.productName}] (${prod.classification === 'OTC_DRUG' ? '일반의약품' : '건강기능식품'})\n`;
      output += `   - 복용법: 1일 ${item.customDailyServings ?? prod.dailyServings}회, 1회 ${item.customAmountPerServing ?? prod.amountPerServing}${prod.servingUnitKorean} (${timingKo} ${item.withFood ? '식후' : '공복'})\n`;
    });

    if (ddiAlerts.length > 0) {
      output += `\n⚠️ [중요 임상 복약 주의사항 - DDI(Drug-Drug Interaction)]\n`;
      ddiAlerts.forEach((alert) => {
        output += `▶ ${alert.titleKorean}\n`;
        output += `  - 관련 영양제 성분: ${alert.triggerIngredientEnglishInn} (${alert.triggerSupplementName})\n`;
        output += `  - 복약 지도: ${alert.managementGuidelineKorean}\n`;
      });
    }

    output += `\n■ 주요 영양소 섭취 평가 (KDRIs: Dietary Reference Intakes for Koreans 기준):\n`;
    kdriResults.forEach((kdri) => {
      output += `- ${kdri.nutrientNameKorean}: 일일 총 ${kdri.totalDailyIntake}${kdri.unit} (권장량 대비 ${kdri.rniPercentage}%)\n`;
      if (kdri.statusLevel === 'EXCEEDED_UL') {
        output += `  ⚠️ 상한섭취량(${kdri.ul}${kdri.unit}) 초과! 용량 조절이 필요합니다.\n`;
      }
    });

    output += `\n담당 약사 의견: 복용 시간대를 잘 지켜주시고, 이상 반응 발생 시 약국으로 문의바랍니다.\n`;
    return output;
  }
}));
