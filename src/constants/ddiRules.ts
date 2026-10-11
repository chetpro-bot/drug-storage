import { InteractionRule } from '../types/interaction';

/**
 * 주요 약물-영양소 및 처방약 상호작용(DDI: Drug-Drug Interaction) 임상 룰베이스
 */
export const CLINICAL_DDI_RULES: InteractionRule[] = [
  {
    id: 'DDI_CHELATION_FLUOROQUINOLONE',
    ruleCode: 'CHEL-001',
    severity: 'MAJOR',
    mechanismType: 'CHELATION_INSOLUBLE_COMPLEX',
    triggerSupplementIngredients: [
      'Zinc gluconate',
      'Zinc oxide',
      'Magnesium oxide',
      'Magnesium citrate',
      'Magnesium bisglycinate',
      'Calcium carbonate',
      'Ferrous sulfate'
    ],
    targetPrescriptionClass: '플루오로퀴놀론(Fluoroquinolone)계 항생제',
    targetDrugInnList: [
      'Ciprofloxacin',
      'Levofloxacin',
      'Moxifloxacin',
      'Ofloxacin'
    ],
    titleKorean: '다가 양이온(Polyvalent Cation) 킬레이션에 의한 항생제 흡수 저하 위험',
    clinicalDescriptionKorean: '2가/3가 양이온(Mg²⁺, Zn²⁺, Ca²⁺, Fe²⁺)이 플루오로퀴놀론계 항생제와 킬레이트 착화합물을 형성하여 항생제의 위장관 흡수를 최대 50~90% 감소시켜 항균 치료 실패를 초래할 수 있습니다.',
    managementGuidelineKorean: '항생제 복용 최소 2시간 전 또는 복용 후 최소 4시간 이상 간격을 두고 미네랄 영양제를 복용하십시오.'
  },
  {
    id: 'DDI_CHELATION_TETRACYCLINE',
    ruleCode: 'CHEL-002',
    severity: 'MAJOR',
    mechanismType: 'CHELATION_INSOLUBLE_COMPLEX',
    triggerSupplementIngredients: [
      'Zinc gluconate',
      'Zinc oxide',
      'Magnesium oxide',
      'Calcium carbonate',
      'Ferrous fumarate'
    ],
    targetPrescriptionClass: '테트라사이클린(Tetracycline)계 항생제',
    targetDrugInnList: [
      'Doxycycline',
      'Minocycline',
      'Tetracycline'
    ],
    titleKorean: '테트라사이클린 킬레이트 복합체 형성으로 인한 생체이용률 급감',
    clinicalDescriptionKorean: '미네랄(Ca, Mg, Fe, Zn)이 테트라사이클린 분자와 결합하여 불용성 침전을 형성해 약물 흡수를 현저히 저해합니다.',
    managementGuidelineKorean: '테트라사이클린계 복용 전후 최소 2~3시간의 복용 간격을 반드시 유지하십시오.'
  },
  {
    id: 'DDI_LEVOTHYROXINE_MALABSORPTION',
    ruleCode: 'CHEL-003',
    severity: 'MAJOR',
    mechanismType: 'CHELATION_INSOLUBLE_COMPLEX',
    triggerSupplementIngredients: [
      'Calcium carbonate',
      'Ferrous sulfate',
      'Ferrous fumarate',
      'Magnesium oxide'
    ],
    targetPrescriptionClass: '갑상선호르몬제(Thyroid Hormone)',
    targetDrugInnList: [
      'Levothyroxine',
      'Liothyronine'
    ],
    titleKorean: '갑상선호르몬제(Levothyroxine) 흡수 억제로 인한 TSH 수치 교란',
    clinicalDescriptionKorean: '칼슘, 철분, 마그네슘 제제가 Levothyroxine과 결합하여 흡수를 차단하므로 갑상선 기능 저하 상태가 지속될 수 있습니다.',
    managementGuidelineKorean: '갑상선호르몬제는 아침 공복 복용하고, 미네랄 영양제는 최소 4시간 이상의 시간차를 두고 복용하십시오.'
  },
  {
    id: 'DDI_BLEEDING_ANTICOAGULANT',
    ruleCode: 'HEM-001',
    severity: 'MODERATE',
    mechanismType: 'ADDITIVE_BLEEDING_RISK',
    triggerSupplementIngredients: [
      'Icosapent ethyl',
      'Omega-3-acid ethyl esters',
      'Ginkgo biloba leaf extract',
      'High-dose Vitamin E (d-alpha-tocopherol)'
    ],
    targetPrescriptionClass: '항응고제 / 항혈소판제',
    targetDrugInnList: [
      'Warfarin',
      'Aspirin',
      'Clopidogrel',
      'Rivaroxaban',
      'Apixaban',
      'Edoxaban'
    ],
    titleKorean: '혈소판 응집 억제 상승작용으로 인한 출혈(Bleeding) 위험 증가',
    clinicalDescriptionKorean: '고용량 오메가-3 및 은행엽 추출물 등은 혈소판 지혈 기능을 억제하여 처방 항응고/항혈소판제와 병용 시 멍, 비출혈, 위장관 출혈 위험을 가중시킬 수 있습니다.',
    managementGuidelineKorean: '외과적 수술 또는 치과 시술 1~2주 전에는 복용을 중단하고, 멍이나 흑색변 발생 여부를 면밀히 모니터링하십시오.'
  }
];
