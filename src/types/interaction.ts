/**
 * 약물-영양소 상호작용(DNI: Drug-Nutrient Interaction) 및 
 * 약물 상호작용(DDI: Drug-Drug Interaction) 임상 경고 모델
 */

export type InteractionSeverity = 
  | 'CONTRAINDICATED' // 병용 금기 (심각한 부작용 또는 치료 실패 초래)
  | 'MAJOR'           // 중대한 주의 (흡수 억제 또는 부작용 증가, 2~4시간 간격 복용 필수)
  | 'MODERATE'        // 중등도 주의 (효능 변동 가능성, 모니터링 필요)
  | 'MINOR';          // 경미한 주의 (단순 참고 수준)

export type InteractionMechanismType =
  | 'CHELATION_INSOLUBLE_COMPLEX' // 다가 양이온 킬레이션(Polyvalent Cation Chelation - 불용성 침전물 형성으로 흡수 저하)
  | 'CYP450_MODULATION'           // 간 대사효소 CYP450(Cytochrome P450) 유도 또는 저해
  | 'ADDITIVE_BLEEDING_RISK'      // 혈소판 응집 억제 및 상가적 출혈 위험 증가
  | 'RENAL_EXCRETION_COMPETITION' // 신장 배설 경쟁 및 전해질 불균형 (고칼륨혈증 등)
  | 'ABSORPTION_PH_DEPENDENCE'    // 위내 산도 변화로 인한 생체이용률 저하
  | 'PHARMACODYNAMIC_ANTAGONISM'; // 약력학적 길항 작용

export interface InteractionRule {
  id: string;
  ruleCode: string;
  severity: InteractionSeverity;
  mechanismType: InteractionMechanismType;

  // 상호작용을 유발하는 영양제 성분 (영문 INN 또는 영양소 키)
  triggerSupplementIngredients: string[]; // e.g. ["Zinc gluconate", "Magnesium oxide", "Ferrous sulfate", "Calcium carbonate"]
  
  // 환자가 복용 중인 처방 의약품 계열 또는 성분 (ETC: Ethical Over-The-Counter / Prescription Drug)
  targetPrescriptionClass: string;        // e.g. "Fluoroquinolones (Ciprofloxacin, Levofloxacin)", "Tetracyclines", "Levothyroxine"
  targetDrugInnList: string[];            // e.g. ["Ciprofloxacin", "Levofloxacin", "Doxycycline", "Levothyroxine"]

  // 임상 설명 및 가이드
  titleKorean: string;                    // e.g. "다가 양이온 킬레이션 흡수 저하 경고"
  clinicalDescriptionKorean: string;      // 상세 기전 및 임상 영향 설명
  managementGuidelineKorean: string;      // 임상 복약 대처법 (예: "처방약 복용 후 최소 2~4시간 간격을 두고 영양제를 복용하십시오.")
}

export interface DetectedInteractionAlert {
  ruleId: string;
  severity: InteractionSeverity;
  titleKorean: string;
  triggerSupplementName: string;
  triggerIngredientEnglishInn: string;
  interactedPrescriptionDrug: string;
  mechanismKorean: string;
  managementGuidelineKorean: string;
}
