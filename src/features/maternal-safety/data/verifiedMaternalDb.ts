import {
  DrugMasterRecord,
  PregnancySafetyRecord,
  LactationSafetyRecord,
  EvidenceSourceRecord,
  IngredientMappingRecord,
  SafetySummaryLevel
} from '../types/maternalSafety';

/**
 * 5단계 자체 안전성 요약 분류 메타데이터
 * (공식 규제기관 등급과 혼동 방지를 위한 명시적 라벨 및 설명 포함)
 */
export const SAFETY_LEVEL_META: Record<
  SafetySummaryLevel,
  {
    stepNumber: number;
    label: string;
    shortBadge: string;
    description: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  LEVEL_1_SUPPORTED: {
    stepNumber: 1,
    label: '1. 사용 가능 근거 있음',
    shortBadge: '1단계 · 사용 가능 근거 있음',
    description: '다수의 인간 임신·수유 임상 자료에서 유의한 위험 증가가 확인되지 않으며 1차 선택약으로 권고됨',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    dotClass: 'bg-emerald-500'
  },
  LEVEL_2_LOW_RISK: {
    stepNumber: 2,
    label: '2. 비교적 낮은 위험',
    shortBadge: '2단계 · 비교적 낮은 위험',
    description: '인간 임상 자료에서 중대한 위험 증가가 보고되지 않아 임상적 유익성 판단 하에 사용 가능함',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-300',
    dotClass: 'bg-sky-500'
  },
  LEVEL_3_CAUTION: {
    stepNumber: 3,
    label: '3. 주의하여 사용',
    shortBadge: '3단계 · 주의하여 사용',
    description: '특정 주수, 고용량·장기 투여, 신생아/미숙아 또는 모유 분비 감소 등 조건부 주의 관찰이 필요함',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-300',
    dotClass: 'bg-amber-500'
  },
  LEVEL_4_AVOID: {
    stepNumber: 4,
    label: '4. 사용 회피 권고',
    shortBadge: '4단계 · 사용 회피 권고',
    description: '해당 임신 주수(예: 20주/30주 이후 NSAIDs) 또는 수유 조건에서 태아·영아 위험 근거가 있어 사용 회피 또는 대체약 권장',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-300',
    dotClass: 'bg-rose-500'
  },
  LEVEL_5_INSUFFICIENT: {
    stepNumber: 5,
    label: '5. 근거 부족',
    shortBadge: '5단계 · 근거 부족 (단정 불가)',
    description: '검증된 인간 임상 근거 또는 모유 농도 측정 자료가 부족함 (근거 부족을 안전 또는 위험으로 단정하지 않음)',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-500'
  }
};

/**
 * 안전성 단계 우선순위 (복합제에서 가장 주의가 필요한 등급 산출용)
 * LEVEL_4_AVOID > LEVEL_5_INSUFFICIENT > LEVEL_3_CAUTION > LEVEL_2_LOW_RISK > LEVEL_1_SUPPORTED
 */
export function getWorstSafetyLevel(levels: SafetySummaryLevel[]): SafetySummaryLevel {
  if (levels.length === 0) return 'LEVEL_5_INSUFFICIENT';
  const priority: Record<SafetySummaryLevel, number> = {
    LEVEL_4_AVOID: 5,
    LEVEL_5_INSUFFICIENT: 4,
    LEVEL_3_CAUTION: 3,
    LEVEL_2_LOW_RISK: 2,
    LEVEL_1_SUPPORTED: 1
  };
  return levels.reduce((worst, cur) => (priority[cur] > priority[worst] ? cur : worst), levels[0]);
}

/**
 * ② Pregnancy Safety 테이블: 5대 핵심 성분 (Acetaminophen, Ibuprofen, Cetirizine, Chlorpheniramine, Amoxicillin)
 */
export const PREGNANCY_SAFETY_DB: Record<string, PregnancySafetyRecord> = {
  ing_acetaminophen: {
    ingredientId: 'ing_acetaminophen',
    englishInn: 'Acetaminophen',
    koreanIngrName: '아세트아미노펜',
    therapeuticClass: '해열·진통제 (중추성 비마약성)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제·연질캡슐·현탁액)',
    trimester1Level: 'LEVEL_1_SUPPORTED',
    trimester2Level: 'LEVEL_1_SUPPORTED',
    trimester3Level: 'LEVEL_1_SUPPORTED',
    trimester1Summary:
      '임신 1삼분기(1~13주) 해열·진통 목적의 1차 선택약입니다. 대규모 역학 코호트에서 주요 선천성 기형이나 자연유산 위험 증가가 확인되지 않았습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주)에도 NSAIDs(이부프로펜 등)와 달리 태아 신장 기능 저하 및 양수과소증 위험이 비교적 낮아 1차 해열진통제로 권고됩니다. 단, 필요한 최소 유효용량으로 최단 기간 사용합니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주)에 NSAIDs 금기(태아 동맥관 조기 폐쇄 위험)에 대한 안전한 대안으로 사용됩니다. 다만 임신 말기 고용량·장기 연용은 피하고 증상 조절에 필요한 최소 기간만 복용하도록 상담합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 13,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신 초기(1~13주) 고열 방치 위험 대비 유익성 확립',
        clinicalDetail:
          '임신 1삼분기 산모의 고열(38.5℃ 이상) 자체는 태아 신경관 결손 위험을 높일 수 있으므로, 발열 시 아세트아미노펜을 통한 적절한 해열이 권장됩니다 (MotherToBaby NBK582555).'
      },
      {
        startWeek: 14,
        endWeek: 40,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신 중·후기(14~40주) 최소 유효용량·최단 기간 원칙',
        clinicalDetail:
          '단기 복용 시 태아 독성 근거는 낮으나, 2주 이상의 불필요한 장기 연용 시에는 반드시 주치의 상담을 권고합니다 (BUMPS / FDA PLLR).'
      }
    ],
    congenitalMalformationData:
      '수만 명 이상의 임신 1삼분기 노출 산모를 포함한 다수의 전향적·후향적 코호트 연구에서 배경 기형 발생률(3~5%) 대비 주요 선천성 기형 위험 증가가 관찰되지 않았습니다 (MotherToBaby NBK582555, BUMPS).',
    miscarriageData:
      '임신 초기 상용량 복용 시 자연유산 위험을 높이지 않는 것으로 보고되었습니다. 오히려 치료되지 않은 고열이 유산 위험과 연관될 수 있습니다.',
    fetalToxicityData:
      '산모 과량 복용(독성 용량) 시 태반을 통과하여 태아 간독성을 유발할 수 있으나, 상용량(성인 1일 최대 4,000mg 이하, 임부 상담 시 통상 단기 최소용량) 범위에서는 태아 간독성이 보고되지 않았습니다. 일부 역학 연구에서 장기 노출과 소아 신경발달(ADHD 등)의 연관성 가설이 제기된 바 있으나, 형제자매 대조군 대규모 연구(JAMA 2024 등) 및 FDA/ACOG 검토 결과 인과관계가 입증되지 않아 근거 불충분으로 결론지어졌습니다.',
    fetalRenalRisk:
      'NSAIDs와 달리 프로스타글란딘 합성을 말초 신장에서 강력히 억제하지 않아 치료 용량 단기 사용 시 태아 신장 기능 저하 및 양수과소증 위험이 거의 보고되지 않았습니다.',
    fetalDuctusArteriosusRisk:
      '임신 3삼분기 말기 고용량·장기 노출 시 드물게 태아 동맥관 수축 사례 보고가 존재하나 NSAIDs에 비해 위험도가 현저히 낮으며, 임상적으로 임신 3삼분기 해열·진통 1차 약물로 유지됩니다.',
    maternalRisk:
      '1일 최대 용량(4,000mg) 초과 또는 음주·복합감기약 중복 복용 시 산모 급성 간독성 위험이 있으므로 복합제 내 아세트아미노펜 중복 여부를 반드시 확인해야 합니다.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail:
      '심평원/식약처 DUR 임부금기 성분으로 지정되어 있지 않음 (단, 1일 최대용량 4,000mg 용량주의 및 효능군 중복주의 적용).',
    domesticPermitSummary:
      '식약처 허가사항(타이레놀정500밀리그람 등): "임부 또는 임신하고 있을 가능성이 있는 여성은 투여 전 의사·약사와 상의할 것. 임부에 대한 안전성은 확립되어 있지 않으므로 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다."',
    domesticVsInternationalComparison:
      '국내 식약처 허가사항은 방어적 표준 문구("안전성 미확립, 유익성이 위험성 상회 시 투여")를 기재하고 있으나, 해외 전문기관(MotherToBaby, BUMPS, ACOG, FDA)은 임신 전 기간(1·2·3삼분기)에 걸쳐 가장 근거가 확립된 1차 선택 해열·진통제로 일치하여 권고합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText:
          '임신 중 통증 및 발열 조절을 위해 가장 널리 권장되는 약물입니다. 기형이나 유산 위험 증가가 확인되지 않았으며 필요 시 최소 유효용량으로 사용합니다 (NBK582555).',
        keyDifferenceNote: '임신 초기 발열 방치의 위험성을 강조하며 적극적인 대증 조절을 지지함.',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582555/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText:
          'Paracetamol은 임신 중 어느 시기(1·2·3삼분기)에나 통증·발열 치료의 1차 선택약(first-choice painkiller)입니다. 가능한 한 낮은 용량으로 짧은 기간 복용합니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/paracetamol/'
      },
      {
        agencyName: 'FDA PLLR',
        summaryText:
          '출판된 역학 연구 및 수십 년간의 사용 경험에서 주요 선천성 기형이나 유산과의 일관된 연관성이 입증되지 않았습니다 (openFDA Label section 8.1).',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Acetaminophen%22&limit=1'
      }
    ],
    clinicalRecommendation:
      '임신 1·2·3삼분기 모두에서 발열 및 경증~중등도 통증 시 1차로 선택 가능한 성분입니다. 이부프로펜 등 NSAIDs가 제한되는 임신 20주 이후 및 3삼분기 산모에게 최우선 대안으로 안내하되, 종합감기약 등과 성분 중복을 피하고 필요한 최단 기간 복용하도록 지도하십시오.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_ibuprofen'],
    evidenceSourceIds: [
      'src_mtb_acetaminophen_nbk582555',
      'src_lactmed_acetaminophen_nbk501194',
      'src_bumps_paracetamol',
      'src_fda_acetaminophen_pllr',
      'src_mfds_tylenol_202106092'
    ]
  },

  ing_ibuprofen: {
    ingredientId: 'ing_ibuprofen',
    englishInn: 'Ibuprofen',
    koreanIngrName: '이부프로펜',
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs · 프로피온산계)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제·연질캡슐·시럽)',
    trimester1Level: 'LEVEL_3_CAUTION',
    trimester2Level: 'LEVEL_3_CAUTION',
    trimester3Level: 'LEVEL_4_AVOID',
    trimester1Summary:
      '임신 1삼분기(1~13주): 전반적인 주요 선천성 기형 증가 위험은 낮으나, 배란 억제 및 착상기/임신 초기 자연유산 위험 증가에 관한 상충된 역학 연구들이 있어 아세트아미노펜을 우선 고려하고 꼭 필요한 경우에만 단기 사용합니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 임신 20주 이전까지는 단기 사용 시 위험이 비교적 낮으나, **임신 20주 이후부터는 태아 신장 기능 저하 및 양수과소증(Oligohydramnios) 유발 위험**이 있으므로 원칙적으로 회피하며 불가피하게 48시간 이상 투여 시 양수량 모니터링이 필요합니다 (FDA 안전성 서한).',
    trimester3Summary:
      '임신 3삼분기(28~40주, 특히 30주 이후): **태아 동맥관 조기 폐쇄(Premature Closure of Ductus Arteriosus)**, 신생아 지속성 폐고혈압(PPHN), 태아 신부전 및 산모 분만 지연·출혈 위험이 명확히 확립되어 있어 **사용 회피(금기)** 대상입니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 19,
        level: 'LEVEL_3_CAUTION',
        riskTitle: '임신 1~19주: 배란/착상 영향 및 유산 연구 상충 주의',
        clinicalDetail:
          '임신 계획 중이거나 임신 초기 산모에서는 아세트아미노펜을 1차로 권장하며, 이부프로펜은 명확한 임상적 필요성이 있을 때만 단기 투여합니다.'
      },
      {
        startWeek: 20,
        endWeek: 29,
        level: 'LEVEL_4_AVOID',
        riskTitle: '임신 20~29주: 태아 신장 기능 저하 및 양수과소증 위험 (FDA 경고)',
        clinicalDetail:
          '미국 FDA 및 국내 식약처는 임신 20주경 이후 NSAIDs 복용 시 태아 신장 관류 감소로 인한 양수과소증 및 신생아 신장 장애가 발생할 수 있으므로 투여 회피를 권고합니다.'
      },
      {
        startWeek: 30,
        endWeek: 40,
        level: 'LEVEL_4_AVOID',
        riskTitle: '임신 30~40주(임신 말기): 태아 동맥관 조기 폐쇄 및 분만 지연 (절대 회피)',
        clinicalDetail:
          '프로스타글란딘 합성 억제로 태아 동맥관이 자궁 내에서 조기 수축·폐쇄되어 태아 우심실 부전 및 신생아 지속성 폐고혈압을 유발할 수 있으므로 금기입니다.'
      }
    ],
    congenitalMalformationData:
      '대규모 코호트 연구에서 임신 1삼분기 노출 시 전체 주요 선천성 기형 발생률의 유의한 증가는 일관되게 나타나지 않았으나, 일부 연구에서 심실중격결손이나 복벽갈림증과의 약한 연관성 신호가 보고된 바 있어 1차 약물로는 선호되지 않습니다 (MotherToBaby NBK582759).',
    miscarriageData:
      '수정 시점 전후 또는 임신 초기에 NSAIDs를 복용한 경우 자연유산 위험이 증가했다는 연구와 증가하지 않았다는 연구가 공존하여 주의가 필요합니다.',
    fetalToxicityData:
      '임신 중기 후반(20주~) 및 말기(30주~) 노출 시 태아 혈역학 및 신장 기능에 직접적인 약리학적 독성(동맥관 수축, 양수 감소)을 유발합니다.',
    fetalRenalRisk:
      '임신 20주 이후 태아의 소변 생성이 양수량의 주요 원천이 되는데, 이부프로펜이 태아 신장의 프로스타글란딘을 억제하여 빠르면 투여 시작 48시간 이내에도 가역적인 양수과소증을 일으킬 수 있습니다 (FDA 2020 Drug Safety Communication).',
    fetalDuctusArteriosusRisk:
      '임신 30주(3삼분기) 이후 투여 시 태아 동맥관의 조기 수축 및 폐쇄 위험이 뚜렷이 증가하며, 비가역적인 신생아 폐고혈압증을 초래할 수 있습니다.',
    maternalRisk:
      '임신 말기 자궁 수축 억제로 인한 분만 지연 및 혈소판 응집 억제에 따른 산모·태아 출혈 경향 증가 위험이 있습니다.',
    domesticDurGrade: '임부금기 2등급',
    domesticDurNoticeDetail:
      '식약처 공고 임부금기 2등급: 원칙적 사용금지 (임신 말기 투여 시 태아 동맥관 조기 폐쇄 등 위험, 임신 20주 이후 양수과소증 위험). 명확한 임상적 사유가 있는 경우에만 제한적 처방 가능.',
    domesticPermitSummary:
      '식약처 허가사항(부루펜정 등): "1) 임신 말기 3개월 동안에는 투여하지 않는다(태아 동맥관 조기 폐쇄, 분만 지연). 2) 임신 20주 이후 투여 시 태아 신기능 이상 및 양수과소증을 유발할 수 있으므로 피한다."',
    domesticVsInternationalComparison:
      '국내 DUR(임부금기 2등급)과 해외 기관(FDA PLLR, MotherToBaby, BUMPS) 모두 **임신 20주 이후(양수과소증 위험) 및 임신 30주/3삼분기 이후(동맥관 조기폐쇄 위험) 사용 회피**에 대해 기준이 일치합니다. (반면 수유 중에는 정반대로 가장 안전한 1차 진통소염제로 평가되므로 임신과 수유를 엄격히 구분해야 합니다.)',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText:
          '임신 20주 이후에는 태아 신장 문제와 양수 감소 위험으로, 임신 30주 이후에는 태아 심장 혈관(동맥관) 조기 폐쇄 위험으로 의료진의 특별한 지시 없이는 사용을 피해야 합니다 (NBK582759).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582759/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText:
          '임신 중 통증/발열에는 Paracetamol이 우선 권장됩니다. Ibuprofen은 임신 20주 이후부터 사용을 피해야 하며, 특히 임신 30주 이후에는 복용해서는 안 됩니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/ibuprofen/'
      },
      {
        agencyName: 'FDA PLLR',
        summaryText:
          '임신 30주 이상에서 태아 동맥관 조기 폐쇄 위험으로 투여를 회피할 것. 임신 20~30주 사이에도 태아 신장 기능 장애 및 양수과소증 위험으로 사용을 제한할 것 (FDA Label Section 5 & 8.1).',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Ibuprofen%22&limit=1'
      }
    ],
    clinicalRecommendation:
      '임부에게는 원칙적으로 아세트아미노펜(Acetaminophen)으로 대체를 권고하십시오. 특히 임신 20주 이후 및 임신 3삼분기(28~40주) 산모에게는 일반의약품 이부프로펜(및 덱시부프로펜, 나프록센 등 모든 NSAIDs)을 판매·투여하지 않도록 주의해야 합니다.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_acetaminophen'],
    evidenceSourceIds: [
      'src_mtb_ibuprofen_nbk582759',
      'src_lactmed_ibuprofen_nbk500986',
      'src_bumps_ibuprofen',
      'src_fda_ibuprofen_pllr',
      'src_mfds_brufen_198300343'
    ]
  },

  ing_cetirizine: {
    ingredientId: 'ing_cetirizine',
    englishInn: 'Cetirizine',
    koreanIngrName: '세티리진',
    therapeuticClass: '2세대 항히스타민제 (피페라진 유도체)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제·연질캡슐·액제)',
    trimester1Level: 'LEVEL_1_SUPPORTED',
    trimester2Level: 'LEVEL_1_SUPPORTED',
    trimester3Level: 'LEVEL_1_SUPPORTED',
    trimester1Summary:
      '임신 1삼분기(1~13주): 1,300명 이상의 임신 1삼분기 노출 산모를 포함한 다수의 코호트 및 메타분석에서 주요 선천성 기형이나 유산 위험 증가가 확인되지 않았습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 알레르기 비염, 두드러기, 가려움증 조절을 위해 사용할 수 있는 선호 2세대 항히스타민제입니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 1세대 항히스타민제 대비 진정·항콜린 부작용이 적어 임신 후기에도 비교적 안전하게 사용됩니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신 전 기간(1~40주) 선호되는 2세대 비진정성 항히스타민제',
        clinicalDetail:
          '해외 기형학 전문기관(MotherToBaby NBK582627, BUMPS)에서는 임신 중 알레르기 증상 조절 시 Loratadine과 함께 가장 근거가 많은 2세대 항히스타민제로 분류합니다.'
      }
    ],
    congenitalMalformationData:
      '1,300건 이상의 임신 1삼분기 노출 사례를 분석한 다수의 인간 연구에서 선천성 기형 발생률이 비노출군 대비 증가하지 않았습니다 (MotherToBaby NBK582627, BUMPS).',
    miscarriageData:
      '임신 초기 세티리진 복용군에서 자연유산 위험 증가가 관찰되지 않았습니다.',
    fetalToxicityData:
      '조산, 저체중아 출산, 사산 위험을 높이지 않는 것으로 보고되었습니다.',
    fetalRenalRisk: '태아 신장 기능 저하 또는 양수과소증과 관련된 보고는 확인되지 않음.',
    fetalDuctusArteriosusRisk: '태아 동맥관 조기 폐쇄와 관련된 보고는 확인되지 않음.',
    maternalRisk: '일부 산모에서 경미한 졸음이나 구강 건조가 나타날 수 있으나 1세대 항히스타민제보다 빈도가 낮습니다.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary:
      '식약처 허가사항(지르텍정 등): "동물실험에서 기형발생은 보고되지 않았으나 임부에 대한 연구가 충분하지 않으므로 임부 또는 임신 가능성이 있는 여성에게는 투여하지 않는 것이 바람직하다(또는 치료상의 유익성이 위험성을 상회할 때만 신중 투여)."',
    domesticVsInternationalComparison:
      '**대표적인 국내 허가사항 vs 해외 임상 근거 불일치 사례**: 국내 일반의약품 허가사항에는 과거 관행적인 문구("임부에게 투여하지 않는 것이 바람직하다")가 남아 있으나, 국내 DUR 임부금기에는 해당하지 않으며 해외 전문기관(MotherToBaby, BUMPS, ACOG)에서는 1,300건 이상의 인간 임신 노출 데이터를 바탕으로 **임신 중 우선 선택 가능한 2세대 항히스타민제**로 평가합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText:
          '임신 1삼분기 1,300명 이상을 포함한 인간 연구들에서 선천성 기형, 유산, 조산 또는 저체중아 위험 증가가 나타나지 않았습니다 (NBK582627).',
        keyDifferenceNote: '국내 허가사항의 보수적 문구와 달리 인간 임상 코호트 근거가 충분함을 명시함.',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582627/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText:
          'Cetirizine을 복용한 수천 명의 임산부 연구에서 태아 유해성(선천성 기형, 유산, 사산, 조산) 증거가 발견되지 않았으며 임신 중 알레르기 치료에 사용할 수 있습니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/cetirizine/'
      },
      {
        agencyName: 'FDA PLLR',
        summaryText:
          '역학 연구 및 시판 후 조사 데이터에서 주요 선천성 기형이나 유산 위험 증가가 확인되지 않았습니다.',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Cetirizine%22&limit=1'
      }
    ],
    clinicalRecommendation:
      '임산부의 알레르기 비염·두드러기 증상 조절 시 1세대 항히스타민제(클로르페니라민 등)보다 졸음 부작용이 적고 임상 근거가 축적된 세티리진(Cetirizine)이 양호한 선택지입니다. 국내 허가사항의 방어적 문구로 인해 임산부가 불안해할 경우 해외 코호트 근거를 설명하고 주치의 확인 하에 복용하도록 안내하십시오.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_chlorpheniramine'],
    evidenceSourceIds: [
      'src_mtb_cetirizine_nbk582627',
      'src_lactmed_cetirizine_nbk501509',
      'src_bumps_cetirizine',
      'src_mfds_zyrtec_200610765'
    ]
  },

  ing_chlorpheniramine: {
    ingredientId: 'ing_chlorpheniramine',
    englishInn: 'Chlorpheniramine',
    koreanIngrName: '클로르페니라민',
    therapeuticClass: '1세대 항히스타민제 (알킬아민계)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제·시럽·종합감기약 복합제)',
    trimester1Level: 'LEVEL_2_LOW_RISK',
    trimester2Level: 'LEVEL_2_LOW_RISK',
    trimester3Level: 'LEVEL_3_CAUTION',
    trimester1Summary:
      '임신 1삼분기(1~13주): 수십 년간의 임상 사용 및 코호트 연구에서 전반적인 주요 선천성 기형 발생률이나 유산 위험 증가가 확인되지 않았습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 태아 기형 위험은 낮으나 산모의 졸음·항콜린 부작용이 흔하므로 주간 활동 시에는 2세대 항히스타민제(세티리진 등)가 더 선호될 수 있습니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 분만 직전 고용량 또는 장기 투여 시 신생아에서 보챔, 떨림, 진정 작용이 나타날 수 있으며, 미숙아·신생아에서 고용량 항히스타민 노출 주의가 보고되어 있어 말기에는 단기·최소 용량으로 주의하여 사용합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 27,
        level: 'LEVEL_2_LOW_RISK',
        riskTitle: '임신 1~27주: 오랜 임상 사용 경험 보유 (단, 복합감기약 내 타 성분 주의)',
        clinicalDetail:
          '클로르페니라민 단일 성분 자체는 임신 초·중기 기형 위험이 낮으나, 약국 일반의약품에서는 주로 종합감기약 복합제(슈도에페드린, 카페인 등 포함) 형태로 유통되므로 복합제 내 다른 성분을 반드시 함께 평가해야 합니다.'
      },
      {
        startWeek: 28,
        endWeek: 40,
        level: 'LEVEL_3_CAUTION',
        riskTitle: '임신 28~40주(분만 임박기): 신생아 진정/자극과민성 주의',
        clinicalDetail:
          '출산 직전 산모가 고용량 1세대 항히스타민제를 복용할 경우 신생아에서 일시적인 진정 또는 금단성 보챔이 나타날 수 있습니다.'
      }
    ],
    congenitalMalformationData:
      'Collaborative Perinatal Project 등 대규모 관찰 연구에서 임신 1삼분기 클로르페니라민 노출과 전체 주요 선천성 기형 증가 사이의 유의한 연관성은 확인되지 않았습니다 (MotherToBaby NBK582633). 일부 후향적 연구에서 개별 기형과의 산발적 연관성이 제기되었으나 일관된 인과관계는 입증되지 않았습니다.',
    miscarriageData:
      '임신 중 클로르페니라민 노출이 자연유산 위험을 높인다는 근거는 확인되지 않았습니다 (MotherToBaby NBK582633).',
    fetalToxicityData:
      '과거 미숙아에서 항히스타민제 노출과 수정체후섬유증식증(미숙아 망막병증) 연관성 보고가 있어 분만 임박기 고용량 투여는 주의합니다.',
    fetalRenalRisk: '확인되지 않음 (태아 신장 독성 보고 없음).',
    fetalDuctusArteriosusRisk: '확인되지 않음 (태아 동맥관 조기 폐쇄 보고 없음).',
    maternalRisk: '중추신경계 투과성이 높아 산모 졸음, 어지러움, 입마름(항콜린 작용)을 유발하므로 운전 및 위험 작업 시 주의가 필요합니다.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary:
      '식약처 허가사항(페니라민정 등): "임부 또는 임신하고 있을 가능성이 있는 부인에는 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다."',
    domesticVsInternationalComparison:
      '국내 DUR 금기는 아니며 해외(MotherToBaby, BUMPS)에서도 기형 유발 위험은 낮은 것으로 평가하나, 산모 졸음 부작용과 수유 이행 시 문제점 때문에 현대 임상에서는 2세대 항히스타민제(세티리진, 로라타딘)를 우선 고려하는 추세입니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText:
          '대부분의 연구에서 임신 중 클로르페니라민 사용이 선천성 기형이나 유산 확률을 높이지 않는 것으로 나타났습니다 (NBK582633).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582633/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText:
          '임신 중 Chlorphenamine 사용이 태아에게 해롭다는 뚜렷한 증거는 없으나, 졸음을 유발하지 않는 Loratadine이나 Cetirizine이 대개 먼저 권장됩니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/chlorphenamine/'
      },
      {
        agencyName: 'FDA PLLR',
        summaryText:
          '수십 년간의 OTC 사용 경험에서 주요 기형 위험이 확립되지 않았으나 전문가 상담 후 사용하도록 표기됩니다.',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Chlorpheniramine%22&limit=1'
      }
    ],
    clinicalRecommendation:
      '단일제(페니라민정)로서 임신 중 단기 사용 시 기형 위험은 낮으나, 산모의 졸음 부작용이 적고 수유기까지 이어서 쓰기 좋은 2세대 항히스타민제(세티리진 등)를 우선 고려할 수 있습니다. 종합감기약에 포함된 경우 반드시 함께 들어있는 충혈제거제·진해제 성분을 확인하십시오.',
    evidenceQualityLevel: 'MODERATE',
    alternativeIngredientIds: ['ing_cetirizine'],
    evidenceSourceIds: [
      'src_mtb_chlorpheniramine_nbk582633',
      'src_lactmed_chlorpheniramine_nbk501530',
      'src_bumps_chlorphenamine',
      'src_mfds_peniramin_196000011'
    ]
  },

  ing_amoxicillin: {
    ingredientId: 'ing_amoxicillin',
    englishInn: 'Amoxicillin',
    koreanIngrName: '아목시실린',
    therapeuticClass: '베타락탐계 항생제 (페니실린계)',
    route: 'ORAL',
    routeKorean: '경구 투여 (캡슐·정제·건조시럽)',
    trimester1Level: 'LEVEL_1_SUPPORTED',
    trimester2Level: 'LEVEL_1_SUPPORTED',
    trimester3Level: 'LEVEL_1_SUPPORTED',
    trimester1Summary:
      '임신 1삼분기(1~13주): 세균 감염 치료를 위해 가장 널리 처방되는 1차 항생제 중 하나로, 대규모 코호트 연구에서 전체 주요 선천성 기형이나 유산 위험 증가가 확인되지 않았습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 요로감염, 부비동염, 호흡기 감염, 치과 감염 등에서 안전하게 사용할 수 있는 1차 항생제입니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 아목시실린 단일제는 임신 말기에도 안전하게 사용됩니다. (단, 클라불란산 복합제는 양막조기파열 산모에서 신생아 괴사성 장염 위험 증가 보고가 있어 단일제와 구분하여 판단합니다.)',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신 전 기간(1~40주) 세균 감염 1차 선택 항생제 (단일제 기준)',
        clinicalDetail:
          '임신 중 치료되지 않은 세균 감염(예: 무증상 세균뇨, 신우신염 등)은 조산 및 저체중아 위험을 높이므로 처방된 아목시실린은 임의로 중단하지 않고 정해진 기간 동안 복용을 완료해야 합니다.'
      }
    ],
    congenitalMalformationData:
      '수만 건의 임신 노출 사례를 분석한 다수의 역학 연구에서 전반적인 주요 선천성 기형 증가가 관찰되지 않았습니다. 과거 일부 소규모 연구에서 임신 1삼분기 노출과 구순구개열의 아주 약한 연관성 신호가 논의된 바 있으나, 대규모 후속 연구들에서 절대 위험도가 극히 낮거나 유의하지 않은 것으로 평가되었습니다 (MotherToBaby NBK582571, BUMPS).',
    miscarriageData:
      '임신 중 아목시실린 복용과 자연유산 위험 증가 사이의 유의한 연관성은 확인되지 않았습니다.',
    fetalToxicityData:
      '아목시실린 단일제는 태아 독성이 보고되지 않았습니다. (참고: 아목시실린·클라불란산 복합제의 경우 조기양막파수 산모 투여 시 신생아 괴사성 장염(NEC) 위험 증가 보고가 있어 임신 말기 조산 위험 산모에서는 단일제와 구분 필요.)',
    fetalRenalRisk: '태아 신장 독성 또는 양수과소증 보고 없음.',
    fetalDuctusArteriosusRisk: '태아 동맥관 조기 폐쇄 보고 없음.',
    maternalRisk: '페니실린 계열 과민반응(발진, 두드러기, 아나필락시스) 기왕력 확인이 필수이며, 항생제 연관 설사나 질 칸디다증이 발생할 수 있습니다.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary:
      '식약처 허가사항(아목시실린캡슐 등): "임신 중의 투여에 대한 안전성이 확립되어 있지 않으므로 임부 또는 임신하고 있을 가능성이 있는 여성에는 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다."',
    domesticVsInternationalComparison:
      '국내 허가사항은 전형적인 방어적 문구를 사용하고 있으나, 국내외 산부인과 임상 진료지침 및 MotherToBaby·BUMPS·FDA에서는 임신 전 기간 세균 감염 치료의 **표준 1차 선택 항생제**로 인정하고 있습니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText:
          '대부분의 연구에서 임신 중 아목시실린 사용은 선천성 기형이나 유산 확률을 높이지 않으며, 임신 중 감염 치료의 유익성이 매우 중요합니다 (NBK582571).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582571/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText:
          'Amoxicillin은 임신 중 세균 감염 치료에 흔히 처방되며 태아 유해성 근거가 없어 처방 시 안심하고 복용 기간을 채워야 합니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/amoxicillin/'
      },
      {
        agencyName: 'FDA PLLR',
        summaryText:
          '수십 년간의 인간 임신 노출 역학 데이터에서 아목시실린과 관련된 주요 선천성 기형, 유산 또는 산모·태아 이상 결과 위험이 입증되지 않았습니다.',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Amoxicillin%22&limit=1'
      }
    ],
    clinicalRecommendation:
      '페니실린 알레르기가 없는 임산부의 감수성 세균 감염에 1차로 안전하게 사용할 수 있는 항생제입니다. 태아 걱정에 임의로 복용을 중단하면 산모 감염 악화 및 내성 위험이 커지므로 처방 일수를 끝까지 복용하도록 복약지도하십시오.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: [],
    evidenceSourceIds: [
      'src_mtb_amoxicillin_nbk582571',
      'src_lactmed_amoxicillin_nbk500887',
      'src_bumps_amoxicillin',
      'src_fda_amoxicillin_pllr',
      'src_mfds_amoxicillin_198000158'
    ]
  }
};

/**
 * ③ Lactation Safety 테이블: 5대 핵심 성분 (LactMed 원문 기반 검증)
 */
export const LACTATION_SAFETY_DB: Record<string, LactationSafetyRecord> = {
  ing_acetaminophen: {
    ingredientId: 'ing_acetaminophen',
    englishInn: 'Acetaminophen',
    koreanIngrName: '아세트아미노펜',
    therapeuticClass: '해열·진통제 (중추성 비마약성)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_1_SUPPORTED',
    milkConcentrationText:
      '산모 500~1,000mg 단회 경구 복용 후 1~2시간에 모유 최고 농도 약 10 ~ 15 mg/L 도달 후 빠르게 감소 (LactMed NBK501194).',
    infantSerumConcentrationText:
      '산모 상용량 복용 후 수유받은 영아의 혈중 농도는 검출 한계 미만이거나 극소량(소아 치료 혈중 농도인 10~20 mg/L보다 훨씬 낮음)이며 소변에서 미량의 대사체만 검출됨 (LactMed NBK501194).',
    ridRangeText: '약 0.5% ~ 2.4% (소아 상용 치료용량 대비 약 1~2% 수준)',
    ridNumericMin: 0.5,
    ridNumericMax: 2.4,
    referenceInfantDoseMgPerKgDay: 0.5,
    referenceMaternalDoseMgPerKgDay: 40.0,
    ridClinicalInterpretation:
      '산모 체중 보정 RID는 약 0.5~2.4%이며, 영아에게 직접 투여하는 소아 해열 상용량(1회 10~15 mg/kg)과 비교하면 모유를 통한 노출량은 1~2%에 불과합니다. 단, RID 수치에만 의존하지 않고 산모의 복합제 중복 복용 여부 및 미숙아 간 대사 성숙도를 함께 확인합니다.',
    halfLifeText:
      '성인(산모) 반감기: 약 1.5 ~ 3시간 / 만기 신생아: 약 3.5 ~ 5시간 (미숙아에서는 황산화/글루쿠론산화 미성숙으로 더 연장될 수 있음).',
    activeMetabolitesText:
      '주로 간에서 비활성 황산염(Sulfate) 및 글루쿠론산(Glucuronide) 포합체로 대사됨. 독성 대사체(NAPQI)는 상용량에서 글루타치온에 의해 즉시 해독됨.',
    infantAdverseEffects:
      '모유 수유 영아에서 중대한 부작용은 거의 보고되지 않았음 (과거 상반신 반구진성 발진 1례 증례 보고만 존재하며 대다수 연구에서 이상반응 없음, LactMed NBK501194).',
    ageConsiderations: {
      NEONATE: {
        level: 'LEVEL_1_SUPPORTED',
        title: '신생아 (생후 0~4주)',
        clinicalNote: '산모 제왕절개·자연분만 직후 통증 조절에도 널리 사용되며 모유 수유를 중단할 필요가 없습니다.'
      },
      INFANT_1_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 1~6개월 영아',
        clinicalNote: '수유 중 1차 해열진통제로 안전하게 사용 가능합니다.'
      },
      INFANT_OVER_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 6개월 이상 영아',
        clinicalNote: '이유식 병행 및 영아 간 대사 성숙으로 노출 영향이 더욱 미미합니다.'
      }
    },
    pretermInfantRisk: {
      level: 'LEVEL_2_LOW_RISK',
      clinicalNote:
        '미숙아(조산아)에서도 산모 상용량 수유는 일반적으로 허용되나, 극소저체중 출생아의 경우 간 청소율이 낮으므로 산모가 고용량 장기 연용 시에는 주치의와 상의하도록 안내합니다.'
    },
    continuationGuidance:
      '수유를 중단하거나 유축해서 버릴(Pump & Dump) 필요가 전혀 없습니다 (LactMed NBK501194).',
    domesticPermitLactationSummary:
      '식약처 허가사항: "수유부는 투여 전 의사·약사와 상의할 것(모유로 이행되나 치료용량에서 영아에 대한 위험성은 낮음)."',
    alternativeIngredientIds: ['ing_ibuprofen'],
    evidenceSourceIds: [
      'src_lactmed_acetaminophen_nbk501194',
      'src_mtb_acetaminophen_nbk582555',
      'src_fda_acetaminophen_pllr'
    ]
  },

  ing_ibuprofen: {
    ingredientId: 'ing_ibuprofen',
    englishInn: 'Ibuprofen',
    koreanIngrName: '이부프로펜',
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs · 프로피온산계)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_1_SUPPORTED',
    milkConcentrationText:
      '산모가 1일 1,200~1,600mg을 복용하더라도 모유 내 농도는 검출 한계 미만(<0.5 ~ 1 mg/L)이거나 최대 약 0.36 mg/L로 극히 낮음 (LactMed NBK500986).',
    infantSerumConcentrationText:
      '수유 영아 혈중 농도에 대한 직접 측정 연구에서도 검출 한계 미만으로 확인됨 (LactMed NBK500986).',
    ridRangeText: '0.1% ~ 0.65% 미만 (영아 소아용 상용량 대비 0.2% 미만)',
    ridNumericMin: 0.1,
    ridNumericMax: 0.65,
    referenceInfantDoseMgPerKgDay: 0.068,
    referenceMaternalDoseMgPerKgDay: 22.8,
    ridClinicalInterpretation:
      '이부프로펜은 산모 혈장 단백 결합률이 99% 이상으로 매우 높고 산성 약물(pKa 4.4)이라 상대적으로 약산성인 모유로 거의 이행되지 않습니다. 영아가 하루 종일 모유로 섭취하는 양(약 0.068 mg/kg/day)은 영아 해열 상용량(30 mg/kg/day)의 0.2% 미만입니다.',
    halfLifeText:
      '성인 반감기: 약 1.8 ~ 2.0시간으로 매우 짧아 모유 및 영아 체내 축적이 거의 일어나지 않음.',
    activeMetabolitesText:
      '약리학적 활성을 가진 대사체가 없음 (비활성 수산화·카르복실화 대사체로 배설됨).',
    infantAdverseEffects:
      '수유 영아에서 이부프로펜 모유 노출로 인한 중대한 부작용은 보고되지 않았음 (LactMed NBK500986).',
    ageConsiderations: {
      NEONATE: {
        level: 'LEVEL_1_SUPPORTED',
        title: '신생아 (생후 0~4주)',
        clinicalNote:
          '초유(Colostrum)에서도 거의 검출되지 않아 출산 및 제왕절개 직후 산모의 산후통·회음부 통증 조절 1차 약물로 가장 선호됩니다.'
      },
      INFANT_1_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 1~6개월 영아',
        clinicalNote: '모유 이행량이 극미량이며 반감기가 짧아 수유 중 가장 안전한 진통소염제입니다.'
      },
      INFANT_OVER_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 6개월 이상 영아',
        clinicalNote: '제한 없이 수유를 지속하며 복용 가능합니다.'
      }
    },
    pretermInfantRisk: {
      level: 'LEVEL_1_SUPPORTED',
      clinicalNote:
        '모유로 이행되는 절대량 자체가 극미량(0.1 mg/kg/day 미만)이므로 미숙아 수유모의 산후 진통 목적으로도 안전하게 선택되는 대표 NSAID입니다 (단, 영아에게 직접 투여하는 것과는 구별).'
    },
    continuationGuidance:
      '**임신 후기(금기)와 수유기(1차 권장)의 평가가 정반대인 핵심 성분입니다.** 수유 중에는 모유 이행량이 극소량이므로 수유 중단 없이 안전하게 복용할 수 있습니다 (LactMed NBK500986).',
    domesticPermitLactationSummary:
      '식약처 허가사항: 일부 국내 제품 설명서에 관행적으로 "수유부 투여 금지 또는 수유 중단" 문구가 기재되어 있으나, 국제 임상 근거(LactMed, AAP, WHO)에서는 수유 중 가장 선호되는 진통소염제로 권고됩니다.',
    alternativeIngredientIds: ['ing_acetaminophen'],
    evidenceSourceIds: [
      'src_lactmed_ibuprofen_nbk500986',
      'src_mtb_ibuprofen_nbk582759',
      'src_fda_ibuprofen_pllr'
    ]
  },

  ing_cetirizine: {
    ingredientId: 'ing_cetirizine',
    englishInn: 'Cetirizine',
    koreanIngrName: '세티리진',
    therapeuticClass: '2세대 항히스타민제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_2_LOW_RISK',
    milkConcentrationText:
      '산모 10mg 1일 1회 경구 복용 시 모유 평균 농도는 약 0.025 ~ 0.038 mg/L (최고 농도는 복용 약 2시간 후 약 0.055 mg/L)로 측정됨 (LactMed NBK501509).',
    infantSerumConcentrationText:
      '확인되지 않음 (LactMed NBK501509 원문상 수유 영아의 직접 혈중 농도 측정치는 보고되지 않았으나 모유 농도로 추산한 노출량은 매우 낮음).',
    ridRangeText: '약 1.77% (범위 0.69% ~ 3.16%)',
    ridNumericMin: 0.69,
    ridNumericMax: 3.16,
    referenceInfantDoseMgPerKgDay: 0.003,
    referenceMaternalDoseMgPerKgDay: 0.17,
    ridClinicalInterpretation:
      '최근 인간 모유 약동학 연구에서 확인된 평균 RID는 약 1.77%로 낮습니다. 다만 RID가 10% 미만이라도 고용량 장기 복용 시에는 영아의 졸음 여부와 모유량 변화를 함께 관찰해야 합니다.',
    halfLifeText: '성인 반감기: 약 8.3시간 (소아에서는 약 5~6시간으로 성인보다 다소 짧음).',
    activeMetabolitesText: '간 대사를 거의 받지 않고 대부분 미변화체로 신장 배설되므로 주요 활성 대사체 문제 없음.',
    infantAdverseEffects:
      '상용량 단기 복용 시 영아 부작용은 드물며 전화 추적 연구에서도 대조군과 유의한 차이가 없었음. 다만 고용량 또는 다른 진정 약물과 병용 시 영아의 졸음(Drowsiness)이나 보챔 여부를 관찰함 (LactMed NBK501509).',
    ageConsiderations: {
      NEONATE: {
        level: 'LEVEL_3_CAUTION',
        title: '신생아 (생후 0~4주)',
        clinicalNote:
          '신생아는 신장 배설 기능이 미성숙하므로 최소 유효용량(1일 10mg 이하)으로 단기 사용하고, 수유 직후 복용(취침 전 수유 직후)하여 다음 수유까지 간격을 두며 영아의 처짐·졸음 여부를 관찰합니다.'
      },
      INFANT_1_6M: {
        level: 'LEVEL_2_LOW_RISK',
        title: '생후 1~6개월 영아',
        clinicalNote: '상용량 복용 시 모유 수유와 병행 가능하며 영아 졸음 여부만 가볍게 확인합니다.'
      },
      INFANT_OVER_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 6개월 이상 영아',
        clinicalNote: '영아 신기능 성숙으로 수유 중 안전하게 사용 가능합니다.'
      }
    },
    pretermInfantRisk: {
      level: 'LEVEL_3_CAUTION',
      clinicalNote:
        '미숙아는 세티리진의 주 배설 경로인 신장 사구체 여과율이 낮아 반감기가 연장될 수 있으므로, 미숙아 수유 시에는 영아의 수유량 감소나 처짐 여부를 주의 깊게 관찰합니다.'
    },
    continuationGuidance:
      '영국 BSACI 가이드라인 및 LactMed(`NBK501509`)에서 수유 중 사용 가능한 비진정성 2세대 항히스타민제(Loratadine과 함께)로 권고되며, 수유를 중단할 필요가 없습니다.',
    domesticPermitLactationSummary:
      '식약처 허가사항: "모유 중으로 이행되므로 수유부에는 투여하지 않는 것이 바람직하다"라고 보수적으로 기재되어 있어 해외 임상 근거(LactMed RID 약 1.8%, 사용 가능)와 차이가 있습니다.',
    alternativeIngredientIds: ['ing_chlorpheniramine'],
    evidenceSourceIds: [
      'src_lactmed_cetirizine_nbk501509',
      'src_mtb_cetirizine_nbk582627'
    ]
  },

  ing_chlorpheniramine: {
    ingredientId: 'ing_chlorpheniramine',
    englishInn: 'Chlorpheniramine',
    koreanIngrName: '클로르페니라민',
    therapeuticClass: '1세대 항히스타민제 (진정성)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_3_CAUTION',
    milkConcentrationText:
      '확인되지 않음 (LactMed NBK501530 원문상 인간 모유 내 클로르페니라민 농도를 정량 측정한 연구가 존재하지 않음).',
    infantSerumConcentrationText:
      '확인되지 않음 (LactMed NBK501530 원문상 수유 영아 혈중 농도 측정 자료 없음).',
    ridRangeText: '확인되지 않음 (원문 내 모유 농도 미측정으로 RID 산출 불가)',
    ridNumericMin: null,
    ridNumericMax: null,
    referenceInfantDoseMgPerKgDay: null,
    referenceMaternalDoseMgPerKgDay: null,
    ridClinicalInterpretation:
      '**중요 원칙 적용**: 클로르페니라민은 인간 모유 농도 측정 연구가 없어 공식 RID 수치가 확인되지 않습니다(임의 생성 금지). 비록 1~2회 소용량 단기 복용은 큰 문제를 일으키지 않을 것으로 보이나, 반감기가 길고 중추신경계 진정 작용 및 프로락틴 분비 억제(모유량 감소) 가능성이 있어 2세대 항히스타민제로의 대체가 권장됩니다.',
    halfLifeText:
      '성인 반감기: 약 12 ~ 43시간 (평균 약 20시간으로 매우 길어 반복 복용 시 축적 우려가 있음) / 신생아 반감기: 확인되지 않음.',
    activeMetabolitesText:
      '데스메틸클로르페니라민(Desmethylchlorpheniramine) 등 대사체로 전환되며 배설이 느림.',
    infantAdverseEffects:
      '1세대 항히스타민제 공통 우려사항으로 수유 영아의 졸음(Drowsiness), 보챔(Irritability), 수유 부진이 나타날 수 있으며, 산모에서 항콜린 및 항세로토닌 작용으로 기초 프로락틴이 감소하여 **특히 수유 확립 전이거나 충혈제거제(슈도에페드린 등)와 복합 복용 시 모유 분비량이 감소**할 수 있음 (LactMed NBK501530).',
    ageConsiderations: {
      NEONATE: {
        level: 'LEVEL_4_AVOID',
        title: '신생아 (생후 0~4주)',
        clinicalNote:
          '출산 직후 신생아 수유기에는 산모의 모유 분비가 아직 완전히 확립되지 않아 모유량 감소 위험이 크고, 긴 반감기로 인해 신생아 진정 위험이 있으므로 세티리진 등 2세대 항히스타민제로 대체하는 것이 권장됩니다.'
      },
      INFANT_1_6M: {
        level: 'LEVEL_3_CAUTION',
        title: '생후 1~6개월 영아',
        clinicalNote:
          '취침 전 단회성 소용량 복용은 가능하나, 장기·반복 복용이나 종합감기약 복합제 복용 시 영아 졸음 및 모유량 감소를 주의해야 합니다.'
      },
      INFANT_OVER_6M: {
        level: 'LEVEL_3_CAUTION',
        title: '생후 6개월 이상 영아',
        clinicalNote:
          '단기 복용 시 위험은 낮아지나 여전히 주간 복용 시 비진정성 2세대 항히스타민제(세티리진 등)가 더 선호됩니다.'
      }
    },
    pretermInfantRisk: {
      level: 'LEVEL_4_AVOID',
      clinicalNote:
        '미숙아는 간 대사 및 신장 배설이 미성숙하고 중추신경계 억제(무호흡·처짐)에 취약하므로 미숙아 수유모에게는 1세대 항히스타민제 반복 투여를 피하도록 권고합니다.'
    },
    continuationGuidance:
      '취침 전 단회 소용량 복용 시에는 수유를 중단할 필요까지는 없으나, 수유 중 지속적인 알레르기·콧물 치료가 필요한 경우에는 **모유량 감소와 영아 진정 위험이 적은 2세대 항히스타민제(세티리진, 로라타딘)로 변경**하도록 상담하십시오 (LactMed NBK501530).',
    domesticPermitLactationSummary:
      '식약처 허가사항(페니라민정): "수유부에게는 투여하지 않는 것이 바람직하며 부득이 투여 시 수유를 중단한다."',
    alternativeIngredientIds: ['ing_cetirizine'],
    evidenceSourceIds: [
      'src_lactmed_chlorpheniramine_nbk501530',
      'src_mtb_chlorpheniramine_nbk582633'
    ]
  },

  ing_amoxicillin: {
    ingredientId: 'ing_amoxicillin',
    englishInn: 'Amoxicillin',
    koreanIngrName: '아목시실린',
    therapeuticClass: '베타락탐계 항생제 (페니실린계)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_1_SUPPORTED',
    milkConcentrationText:
      '산모 1,000mg(1g) 단회 경구 투여 후 4~5시간에 모유 최고 농도 약 0.68 ~ 1.3 mg/L (평균 0.9 mg/L)로 매우 낮게 측정됨 (LactMed NBK500887).',
    infantSerumConcentrationText:
      '확인되지 않음 (원문상 영아 혈중 농도 직접 측정치는 보고되지 않았으나 모유 섭취량이 극소량임).',
    ridRangeText: '약 0.5% ~ 0.95% (1% 미만)',
    ridNumericMin: 0.5,
    ridNumericMax: 0.95,
    referenceInfantDoseMgPerKgDay: 0.1,
    referenceMaternalDoseMgPerKgDay: 25.0,
    ridClinicalInterpretation:
      '모유를 통해 영아가 섭취하는 아목시실린의 양은 산모 체중 보정 용량의 1% 미만(최대 약 0.1 mg/kg/day)으로, 신생아·영아에게 감염 치료 목적으로 직접 투여하는 소아 상용량(25~50 mg/kg/day)의 0.2~0.4% 수준에 불과합니다.',
    halfLifeText: '성인 반감기: 약 1.0 ~ 1.3시간 / 신생아 반감기: 약 3.7시간.',
    activeMetabolitesText: '약리학적 활성을 가진 주요 대사체 없음 (주로 미변화체 및 비활성 페니실로산 형태로 배설).',
    infantAdverseEffects:
      '대부분의 수유 영아에서 아무런 이상이 없으나, 간혹 모유 내 미량 항생제로 인해 영아의 장내 정상 세균총이 변화하여 **경미한 묽은 변/설사(Diarrhea), 발진(Rash), 또는 기저귀 발진/구강 칸디다증(아구창)**이 드물게 나타날 수 있음 (LactMed NBK500887).',
    ageConsiderations: {
      NEONATE: {
        level: 'LEVEL_1_SUPPORTED',
        title: '신생아 (생후 0~4주)',
        clinicalNote: '산후 유선염(Mastitis)이나 요로감염 치료 시에도 수유를 지속하며 사용할 수 있으며 영아의 변 상태와 발진 여부만 관찰합니다.'
      },
      INFANT_1_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 1~6개월 영아',
        clinicalNote: '수유 중 가장 안전하게 처방되는 1차 항생제입니다.'
      },
      INFANT_OVER_6M: {
        level: 'LEVEL_1_SUPPORTED',
        title: '생후 6개월 이상 영아',
        clinicalNote: '수유 중단 없이 안전하게 복용 가능합니다.'
      }
    },
    pretermInfantRisk: {
      level: 'LEVEL_2_LOW_RISK',
      clinicalNote:
        '모유 이행량이 극소량이므로 미숙아 수유 시에도 일반적으로 허용되나, 미숙아의 장내세균총 변화(설사·복부팽만) 여부를 함께 모니터링합니다.'
    },
    continuationGuidance:
      '수유 중 허용되는 대표적인 1차 항생제(Acceptable in nursing mothers)이며, 수유를 중단할 필요가 없습니다. 영아에게 심한 설사나 알레르기성 발진이 나타나는지만 관찰하도록 복약지도하십시오 (LactMed NBK500887).',
    domesticPermitLactationSummary:
      '식약처 허가사항: "모유 중으로 소량 이행되므로 수유부에게 투여 시 주의한다(영아에서 설사, 칸디다증, 발진 등이 나타날 수 있음)."',
    alternativeIngredientIds: [],
    evidenceSourceIds: [
      'src_lactmed_amoxicillin_nbk500887',
      'src_mtb_amoxicillin_nbk582571',
      'src_fda_amoxicillin_pllr'
    ]
  }
};

/**
 * ④ Evidence Sources 테이블: 검증된 원문 출처 및 메타데이터
 */
export const EVIDENCE_SOURCES_DB: Record<string, EvidenceSourceRecord> = {
  // --- Acetaminophen ---
  src_lactmed_acetaminophen_nbk501194: {
    sourceId: 'src_lactmed_acetaminophen_nbk501194',
    ingredientId: 'ing_acetaminophen',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Acetaminophen [NBK501194]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501194/',
    studyDesign: '인간 모유 약동학(PK) 측정 및 수유 코호트 임상 문헌 종합 모노그래프',
    studySubjects: '아세트아미노펜 경구 복용 수유부 및 모유 수유 영아',
    studyScale: '다수의 임상 약동학 연구 및 추적 코호트 종합',
    keyFindings:
      '모유로 이행되는 양은 영아 상용량보다 훨씬 적으며(RID 약 0.5~2.4%), 수유 영아에서 이상반응이 거의 보고되지 않아 수유 중 해열·진통의 좋은 선택지임.',
    studyLimitations: '극소저체중 미숙아에서 산모 고용량 장기 복용 시의 직접적인 혈중 농도 데이터는 제한적임.',
    publishedDate: '상시 개정판 (2025/2026 최신판)',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_acetaminophen_nbk582555: {
    sourceId: 'src_mtb_acetaminophen_nbk582555',
    ingredientId: 'ing_acetaminophen',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Acetaminophen (Paracetamol) [NBK582555]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582555/',
    studyDesign: '전향적·후향적 임신 코호트 및 기형학 역학 문헌 체계적 요약',
    studySubjects: '임신 1·2·3삼분기 아세트아미노펜 노출 임산부 및 출생아',
    studyScale: '수만 명 이상의 대규모 국제 임신 등록 코호트 포함',
    keyFindings:
      '임신 중 아세트아미노펜 사용은 주요 선천성 기형이나 유산 위험을 증가시키지 않으며, 임신 초기 고열을 조절하는 유익성이 큼. 필요한 최소 용량으로 최단 기간 사용 권고.',
    studyLimitations:
      '장기 노출과 소아 신경발달에 관한 관찰 연구들은 산모 기저 질환(발열·감염·통증) 및 유전적 교란변수의 영향이 커 인과관계가 입증되지 않음.',
    publishedDate: '2024/2025 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_bumps_paracetamol: {
    sourceId: 'src_bumps_paracetamol',
    ingredientId: 'ing_acetaminophen',
    organizationName: 'BUMPS / UKTIS',
    documentTitle: 'BUMPS (Best Use of Medicines in Pregnancy): Paracetamol',
    originalUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/paracetamol/',
    studyDesign: '영국 기형학 정보서비스(UKTIS) 임상 근거 요약문',
    studySubjects: '임신 중 Paracetamol 복용 산모 코호트',
    studyScale: '국가 단위 역학 코호트 종합',
    keyFindings: '임신 어느 삼분기에서나 경증~중등도 통증 및 고열 치료의 1차 선택 약물임.',
    studyLimitations: '전문가용 상세 통계 원문(UKTIS)은 영국 NHS 구독 제한이 있어 BUMPS 공식 공개 리플릿 기준으로 인용.',
    publishedDate: '최신 공개판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_fda_acetaminophen_pllr: {
    sourceId: 'src_fda_acetaminophen_pllr',
    ingredientId: 'ing_acetaminophen',
    organizationName: 'FDA PLLR',
    documentTitle: 'openFDA Drug Label: Acetaminophen Pregnancy & Lactation Section',
    originalUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Acetaminophen%22+AND+_exists_:pregnancy&limit=1',
    studyDesign: '미국 FDA 허가사항 (PLLR Section 8.1 & 8.2)',
    studySubjects: '임부 및 수유부 허가 심사 근거 자료',
    studyScale: '시판 후 역학 코호트 종합',
    keyFindings: '역학 연구에서 주요 선천성 기형 또는 유산과의 연관성이 확인되지 않음.',
    studyLimitations: 'OTC 단일제 라벨은 간략한 전문가 상담 안내 문구 위주로 기재되는 경우가 있음.',
    publishedDate: 'openFDA 실시간 API',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_tylenol_202106092: {
    sourceId: 'src_mfds_tylenol_202106092',
    ingredientId: 'ing_acetaminophen',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 의약품 상세허가정보: 타이레놀정500밀리그람(아세트아미노펜) [품목기준코드: 202106092]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=202106092',
    studyDesign: '대한민국 식품의약품안전처 공식 허가사항 (사용상의 주의사항)',
    studySubjects: '국내 허가 일반의약품',
    studyScale: '국내 공식 규제 허가문서',
    keyFindings: '임부·수유부 복용 전 의사·약사 상담 및 유익성이 위험성을 상회할 때 투여.',
    studyLimitations: '국내 OTC 표준 허가문구는 방어적 표현을 유지하므로 해외 임상 코호트 근거와 병행 해석 필요.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },

  // --- Ibuprofen ---
  src_lactmed_ibuprofen_nbk500986: {
    sourceId: 'src_lactmed_ibuprofen_nbk500986',
    ingredientId: 'ing_ibuprofen',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Ibuprofen [NBK500986]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK500986/',
    studyDesign: '인간 모유 약동학 연구 및 수유부 코호트 종합 모노그래프',
    studySubjects: '산후 이부프로펜 복용 수유부 및 신생아·영아',
    studyScale: '다수의 모유 농도 정량 연구 종합',
    keyFindings:
      '모유 내 농도가 극히 낮고(RID 0.1~0.65% 미만, 영아 상용량의 0.2% 미만) 반감기가 약 2시간으로 짧아 수유 중 진통·소염 목적으로 가장 선호되는 약물임.',
    studyLimitations: '모유 수유 시에는 매우 안전하나 임신 20주/30주 이후 금기 사항과 혼동하지 않도록 주의 필요.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_ibuprofen_nbk582759: {
    sourceId: 'src_mtb_ibuprofen_nbk582759',
    ingredientId: 'ing_ibuprofen',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Ibuprofen [NBK582759]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582759/',
    studyDesign: '임신 주수별 노출 코호트 및 기형학 근거 종합',
    studySubjects: '임신 1·2·3삼분기 이부프로펜 노출 산모',
    studyScale: '대규모 코호트 및 FDA 안전성 검토 반영',
    keyFindings:
      '임신 20주 이후 태아 신장 기능 저하 및 양수과소증 위험, 임신 30주 이후 태아 동맥관 조기 폐쇄 위험으로 사용 회피 권고. 반면 수유 중에는 선호됨.',
    studyLimitations: '임신 1삼분기 유산 위험에 관한 초기 관찰 연구들은 처방 적응증(통증/염증)에 의한 교란 가능성 존재.',
    publishedDate: '2025-03-01',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_bumps_ibuprofen: {
    sourceId: 'src_bumps_ibuprofen',
    ingredientId: 'ing_ibuprofen',
    organizationName: 'BUMPS / UKTIS',
    documentTitle: 'BUMPS (Best Use of Medicines in Pregnancy): Ibuprofen',
    originalUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/ibuprofen/',
    studyDesign: '영국 기형학 정보서비스(UKTIS) 임신 주수별 안전성 지침',
    studySubjects: '임산부',
    studyScale: '영국 및 유럽 기형학 네트워크 데이터 종합',
    keyFindings: '임신 20주 이후 복용 회피 및 임신 30주 이후 금기(태아 동맥관 조기폐쇄 및 양수 감소).',
    studyLimitations: '공개 요약본 기준.',
    publishedDate: '최신 공개판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_fda_ibuprofen_pllr: {
    sourceId: 'src_fda_ibuprofen_pllr',
    ingredientId: 'ing_ibuprofen',
    organizationName: 'FDA PLLR',
    documentTitle: 'openFDA Drug Label & FDA Drug Safety Communication: NSAIDs in Pregnancy (20 Weeks or Later)',
    originalUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Ibuprofen%22+AND+_exists_:pregnancy&limit=1',
    studyDesign: '미국 FDA 허가사항 (Section 5.10, 8.1, 8.2) 및 안전성 서한',
    studySubjects: '임신 20주 및 30주 이후 산모 노출 사례',
    studyScale: 'FDA FAERS 및 임상 문헌 분석',
    keyFindings: '임신 20주 이후 양수과소증 및 신생아 신장 이상 경고, 임신 30주 이후 태아 동맥관 조기 폐쇄 회피 명시.',
    studyLimitations: '단기 48시간 미만 노출에서는 양수 감소가 드물며 중단 시 대부분 가역적임.',
    publishedDate: 'openFDA 실시간 API',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_brufen_198300343: {
    sourceId: 'src_mfds_brufen_198300343',
    ingredientId: 'ing_ibuprofen',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 의약품 허가사항 및 DUR 임부금기 2등급 고시: 부루펜정400밀리그램(이부프로펜) [198300343]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=198300343',
    studyDesign: '식약처 허가사항 및 한국의약품안전관리원 DUR 임부금기 고시',
    studySubjects: '국내 허가 이부프로펜 제제',
    studyScale: '국내 규제 고시',
    keyFindings: 'DUR 임부금기 2등급 지정. 임신 말기 3개월 투여 금지 및 임신 20주 이후 양수과소증 위험 주의.',
    studyLimitations: '국내 허가사항의 수유부 금지 문구는 최신 LactMed 근거와 괴리가 있음.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },

  // --- Cetirizine ---
  src_lactmed_cetirizine_nbk501509: {
    sourceId: 'src_lactmed_cetirizine_nbk501509',
    ingredientId: 'ing_cetirizine',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Cetirizine [NBK501509]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501509/',
    studyDesign: '인간 모유 약동학(PK) 및 수유 영아 이상반응 추적 연구 종합',
    studySubjects: '세티리진 복용 수유부 및 영아',
    studyScale: '인간 모유 농도 정량 연구(RID 약 1.77%) 및 전화 추적 코호트 포함',
    keyFindings:
      '소량만 모유로 이행(평균 RID 1.77%, 범위 0.69~3.16%)되며 단기 소용량 사용은 수유 중 허용됨. 고용량 사용 시 영아 졸음 여부만 관찰.',
    studyLimitations: '수유 영아의 직접적인 혈중 농도 측정 데이터는 보고되지 않음.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_cetirizine_nbk582627: {
    sourceId: 'src_mtb_cetirizine_nbk582627',
    ingredientId: 'ing_cetirizine',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Cetirizine (Zyrtec®) [NBK582627]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582627/',
    studyDesign: '임신 노출 코호트 및 메타분석 요약',
    studySubjects: '임신 중 세티리진 복용 산모',
    studyScale: '임신 1삼분기 노출 1,300명 이상 포함 다수 연구',
    keyFindings: '선천성 기형, 유산, 조산 또는 저체중아 출산 위험 증가가 확인되지 않음.',
    studyLimitations: '관찰 코호트 연구 중심.',
    publishedDate: '2024-10-01',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_bumps_cetirizine: {
    sourceId: 'src_bumps_cetirizine',
    ingredientId: 'ing_cetirizine',
    organizationName: 'BUMPS / UKTIS',
    documentTitle: 'BUMPS (Best Use of Medicines in Pregnancy): Cetirizine',
    originalUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/cetirizine/',
    studyDesign: '영국 기형학 정보서비스(UKTIS) 근거 요약',
    studySubjects: '임산부 수천 명 코호트',
    studyScale: '수천 건의 임신 노출 데이터',
    keyFindings: '태아 기형이나 유산 증거가 없으며 임신 중 알레르기 치료에 사용할 수 있는 비진정성 항히스타민제임.',
    studyLimitations: '공개 요약본 기준.',
    publishedDate: '최신 공개판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_zyrtec_200610765: {
    sourceId: 'src_mfds_zyrtec_200610765',
    ingredientId: 'ing_cetirizine',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 의약품 상세허가정보: 지르텍정(세티리진염산염) [품목기준코드: 200610765]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200610765',
    studyDesign: '대한민국 식약처 공식 허가사항',
    studySubjects: '국내 허가 일반의약품',
    studyScale: '국내 공식 규제 허가문서',
    keyFindings: 'DUR 임부금기 미지정이나, 허가사항 본문에는 임부·수유부 투여 지양 문구가 기재되어 있어 해외 근거와 차이가 있음.',
    studyLimitations: '해외 최신 임신·수유 코호트 결과가 국내 OTC 허가문구에 아직 반영되지 않음.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },

  // --- Chlorpheniramine ---
  src_lactmed_chlorpheniramine_nbk501530: {
    sourceId: 'src_lactmed_chlorpheniramine_nbk501530',
    ingredientId: 'ing_chlorpheniramine',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Chlorpheniramine [NBK501530]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501530/',
    studyDesign: '수유 중 약물 안전성 문헌 검토 모노그래프',
    studySubjects: '클로르페니라민 복용 수유부',
    studyScale: '임상 관찰 및 약리 기전 문헌 종합',
    keyFindings:
      '모유 내 약물 농도 및 RID는 측정된 바 없음(확인되지 않음). 고용량·장기 사용 시 영아 졸음·보챔 및 모유 분비 감소 가능성이 있어 비진정성 2세대 항히스타민제가 선호됨.',
    studyLimitations: '인간 모유 내 농도 및 영아 혈중 농도를 정량 측정한 약동학 연구가 부재함.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_chlorpheniramine_nbk582633: {
    sourceId: 'src_mtb_chlorpheniramine_nbk582633',
    ingredientId: 'ing_chlorpheniramine',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Chlorpheniramine [NBK582633]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582633/',
    studyDesign: '임신 노출 역학 연구 종합',
    studySubjects: '임신 중 클로르페니라민 노출 산모',
    studyScale: '다수의 관찰 코호트 및 환자-대조군 연구',
    keyFindings: '대부분의 연구에서 선천성 기형이나 유산 위험 증가가 확인되지 않음.',
    studyLimitations: '수유 중 모유 이행 정량 데이터 부족 및 진정 작용 존재.',
    publishedDate: '2025-01-01',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_bumps_chlorphenamine: {
    sourceId: 'src_bumps_chlorphenamine',
    ingredientId: 'ing_chlorpheniramine',
    organizationName: 'BUMPS / UKTIS',
    documentTitle: 'BUMPS (Best Use of Medicines in Pregnancy): Chlorphenamine',
    originalUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/chlorphenamine/',
    studyDesign: '영국 기형학 정보서비스(UKTIS) 근거 요약',
    studySubjects: '임산부 코호트',
    studyScale: '관찰 코호트 종합',
    keyFindings: '태아 기형 위험 증가 근거는 없으나 졸음을 유발하지 않는 Loratadine 또는 Cetirizine이 대개 먼저 권고됨.',
    studyLimitations: '출산 직전 고용량 복용 시 신생아 졸음/보챔 주의 필요.',
    publishedDate: '최신 공개판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_peniramin_196000011: {
    sourceId: 'src_mfds_peniramin_196000011',
    ingredientId: 'ing_chlorpheniramine',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 의약품 상세허가정보: 페니라민정(클로르페니라민말레산염) [품목기준코드: 196000011]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=196000011',
    studyDesign: '대한민국 식약처 공식 허가사항',
    studySubjects: '국내 허가 의약품',
    studyScale: '국내 공식 규제 허가문서',
    keyFindings: '임부에는 유익성이 위험성을 상회할 때만 투여하며 수유부 투여 시 수유 중단 권고.',
    studyLimitations: '고전적 허가사항 문구.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },

  // --- Amoxicillin ---
  src_lactmed_amoxicillin_nbk500887: {
    sourceId: 'src_lactmed_amoxicillin_nbk500887',
    ingredientId: 'ing_amoxicillin',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Amoxicillin [NBK500887]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK500887/',
    studyDesign: '인간 모유 약동학(PK) 및 수유 영아 코호트 종합 모노그래프',
    studySubjects: '아목시실린 투여 수유부 및 영아',
    studyScale: '모유 농도 측정 연구 및 수유 영아 이상반응 추적 코호트',
    keyFindings:
      '산모 1g 복용 시 모유 최고 농도 0.68~1.3 mg/L로 매우 낮으며 RID는 1% 미만(0.5~0.95%)임. 수유 중 허용되며 영아의 경미한 설사·발진 여부만 관찰.',
    studyLimitations: '영아 혈중 농도는 직접 측정되지 않았으나 모유 섭취량이 극소량임.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_amoxicillin_nbk582571: {
    sourceId: 'src_mtb_amoxicillin_nbk582571',
    ingredientId: 'ing_amoxicillin',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Amoxicillin / Amoxicillin-Clavulanate [NBK582571]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582571/',
    studyDesign: '임신 노출 코호트 및 기형학 역학 근거 요약',
    studySubjects: '임신 중 아목시실린 복용 산모',
    studyScale: '수만 명 규모의 국제 임신 코호트',
    keyFindings: '임신 중 아목시실린 사용은 전체 주요 선천성 기형이나 유산 확률을 높이지 않으며 1차 선택 항생제로 사용됨.',
    studyLimitations: '클라불란산 복합제는 양막조기파열 산모에서 신생아 괴사성 장염 위험 보고가 있어 단일제와 구분 필요.',
    publishedDate: '2024-04-01',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_bumps_amoxicillin: {
    sourceId: 'src_bumps_amoxicillin',
    ingredientId: 'ing_amoxicillin',
    organizationName: 'BUMPS / UKTIS',
    documentTitle: 'BUMPS (Best Use of Medicines in Pregnancy): Amoxicillin',
    originalUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/amoxicillin/',
    studyDesign: '영국 기형학 정보서비스(UKTIS) 근거 요약',
    studySubjects: '임산부 코호트',
    studyScale: '대규모 역학 연구 종합',
    keyFindings: '임신 중 세균 감염 치료에 널리 쓰이며 태아 유해성 근거가 없어 처방 기간을 완료해야 함.',
    studyLimitations: '공개 요약본 기준.',
    publishedDate: '최신 공개판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_fda_amoxicillin_pllr: {
    sourceId: 'src_fda_amoxicillin_pllr',
    ingredientId: 'ing_amoxicillin',
    organizationName: 'FDA PLLR',
    documentTitle: 'openFDA Drug Label: Amoxicillin Pregnancy & Lactation Section',
    originalUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Amoxicillin%22+AND+_exists_:pregnancy&limit=1',
    studyDesign: '미국 FDA 허가사항 (PLLR Section 8.1 & 8.2)',
    studySubjects: '임부 및 수유부 허가 심사 자료',
    studyScale: '시판 후 역학 코호트 종합',
    keyFindings: '주요 선천성 기형이나 유산 위험 증가 없음. 모유 이행량 소량으로 수유 가능.',
    studyLimitations: '영아 장내세균총 변화 모니터링 권고.',
    publishedDate: 'openFDA 실시간 API',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_amoxicillin_198000158: {
    sourceId: 'src_mfds_amoxicillin_198000158',
    ingredientId: 'ing_amoxicillin',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 의약품 상세허가정보: 곰실린캡슐(아목시실린수화물) [품목기준코드: 198000158]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=198000158',
    studyDesign: '대한민국 식약처 공식 허가사항',
    studySubjects: '국내 허가 전문의약품',
    studyScale: '국내 공식 규제 허가문서',
    keyFindings: 'DUR 임부금기 미지정. 치료상 유익성이 위험성을 상회할 때 투여.',
    studyLimitations: '표준 허가문구.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  }
};

/**
 * ① Drug Master 테이블 (대표 국내 단일제 6품목 + 복합제 분석 검증용 2품목)
 */
export const DRUG_MASTER_DB: DrugMasterRecord[] = [
  {
    id: 'drug_tylenol_500',
    itemSeq: '202106092',
    koreanProductName: '타이레놀정500밀리그람(아세트아미노펜)',
    englishIngredientsSummary: 'Acetaminophen',
    strengthText: '500mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '켄뷰코리아판매(유)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부는 이 약을 복용하기 전에 의사, 치과의사, 약사와 상의할 것. 임부에 대한 안전성은 확립되어 있지 않으므로 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=202106092',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_brufen_400',
    itemSeq: '198300343',
    koreanProductName: '부루펜정400밀리그램(이부프로펜)',
    englishIngredientsSummary: 'Ibuprofen',
    strengthText: '400mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '삼일제약(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '1) 임신 말기 3개월 동안에는 이 약을 투여하지 않는다(태아의 동맥관 조기 폐쇄 및 산모 분만 지연 위험). 2) 임신 20주 이후 이 약을 투여할 경우 태아의 신기능 이상 및 양수과소증을 유발할 수 있으므로 투여를 피한다.',
    durPregnancyTabooGrade: 'GRADE_2',
    durPregnancyTabooDetail:
      '식약처 DUR 임부금기 2등급: 임신 말기 투여 시 태아 동맥관 조기 폐쇄 등 위험, 임신 20주 이후 양수과소증 위험 (명확한 임상적 사유가 있는 경우에만 제한적 사용).',
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=198300343',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_ezn6_any',
    itemSeq: '200501140',
    koreanProductName: '이지엔6애니연질캡슐(이부프로펜)',
    englishIngredientsSummary: 'Ibuprofen',
    strengthText: '200mg',
    dosageForm: '연질캡슐',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '(주)대웅제약',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임신 말기 3개월 동안에는 투여하지 않으며, 임신 20주 이후에는 태아 신기능 장애 및 양수과소증 유발 위험이 있으므로 투여를 피한다.',
    durPregnancyTabooGrade: 'GRADE_2',
    durPregnancyTabooDetail: '식약처 DUR 임부금기 2등급 (이부프로펜 성분 지정).',
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200501140',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_zyrtec_10',
    itemSeq: '200610765',
    koreanProductName: '지르텍정(세티리진염산염)',
    englishIngredientsSummary: 'Cetirizine Hydrochloride',
    strengthText: '10mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '한국유씨비제약(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '동물실험에서 기형발생이 보고되지 않았으나 임부에 대한 임상 연구가 충분하지 않으므로 임부 또는 임신하고 있을 가능성이 있는 여성에는 투여하지 않는 것이 바람직하다. 모유 중으로 이행되므로 수유부에는 투여하지 않는다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200610765',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_peniramin_2',
    itemSeq: '196000011',
    koreanProductName: '페니라민정(클로르페니라민말레산염)',
    englishIngredientsSummary: 'Chlorpheniramine Maleate',
    strengthText: '2mg',
    dosageForm: '정제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '(주)유한양행',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 부인에는 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다. 수유부에는 투여하지 않는 것이 바람직하며 부득이 투여할 경우에는 수유를 중단한다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=196000011',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_gomsillin_500',
    itemSeq: '198000158',
    koreanProductName: '곰실린캡슐(아목시실린수화물)',
    englishIngredientsSummary: 'Amoxicillin Hydrate',
    strengthText: '500mg',
    dosageForm: '경질캡슐',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '(주)대웅제약',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임신 중의 투여에 대한 안전성이 확립되어 있지 않으므로 임부 또는 임신하고 있을 가능성이 있는 여성에는 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다. 모유 중으로 소량 이행되므로 수유부 투여 시 주의한다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=198000158',
    updatedAt: '2026-11-04'
  },
  // --- 복합제(Combination Drug) 개별 성분 평가 예시 품목 ---
  {
    id: 'drug_tylenol_cold_s',
    itemSeq: '202106095',
    koreanProductName: '타이레놀콜드-에스정 (종합감기약 복합제)',
    englishIngredientsSummary:
      'Acetaminophen 325mg / Chlorpheniramine Maleate 2mg / Dextromethorphan HBr 15mg / Pseudoephedrine HCl 30mg',
    strengthText: '325mg / 2mg / 15mg / 30mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '켄뷰코리아판매(유)',
    isCombination: true,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부는 복용 전 의사·약사와 상의할 것. 슈도에페드린 및 클로르페니라민 등 복합 성분이 포함되어 있으므로 단일 대증요법제 대비 임신 초기 혈관수축 위험 및 수유 중 모유량 감소 위험을 개별 성분 단위로 확인해야 한다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=202106095',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_pancol_s',
    itemSeq: '196800036',
    koreanProductName: '판콜에스내복액 (종합감기약 액제 복합제)',
    englishIngredientsSummary:
      'Acetaminophen 300mg / Chlorpheniramine Maleate 2.5mg / Caffeine Anhydrous 30mg / DL-Methylephedrine HCl 17.5mg / Guaifenesin 83.3mg',
    strengthText: '30mL(1병) 중 복합성분',
    dosageForm: '내복액제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '동화약품(주)',
    isCombination: true,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부는 복용하기 전에 의사·약사와 상의할 것. 아세트아미노펜 외에 클로르페니라민말레산염, DL-메틸에페드린염산염, 카페인무수물, 구아이페네신이 복합되어 있으므로 아세트아미노펜만 보고 안전하다고 판단해서는 안 된다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=196800036',
    updatedAt: '2026-11-04'
  }
];

/**
 * ⑤ Ingredient Mapping 테이블 (국내 제품 ↔ 개별 성분 분리 매핑)
 */
export const INGREDIENT_MAPPING_DB: IngredientMappingRecord[] = [
  // 단일제 매핑
  {
    mappingId: 'map_tylenol_1',
    drugMasterId: 'drug_tylenol_500',
    koreanProductName: '타이레놀정500밀리그람(아세트아미노펜)',
    itemSeq: '202106092',
    koreanIngredientName: '아세트아미노펜',
    englishIngredientName: 'Acetaminophen',
    ingredientId: 'ing_acetaminophen',
    amountText: '500mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_brufen_1',
    drugMasterId: 'drug_brufen_400',
    koreanProductName: '부루펜정400밀리그램(이부프로펜)',
    itemSeq: '198300343',
    koreanIngredientName: '이부프로펜',
    englishIngredientName: 'Ibuprofen',
    ingredientId: 'ing_ibuprofen',
    amountText: '400mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_ezn6_1',
    drugMasterId: 'drug_ezn6_any',
    koreanProductName: '이지엔6애니연질캡슐(이부프로펜)',
    itemSeq: '200501140',
    koreanIngredientName: '이부프로펜',
    englishIngredientName: 'Ibuprofen',
    ingredientId: 'ing_ibuprofen',
    amountText: '200mg',
    dosageForm: '연질캡슐',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_zyrtec_1',
    drugMasterId: 'drug_zyrtec_10',
    koreanProductName: '지르텍정(세티리진염산염)',
    itemSeq: '200610765',
    koreanIngredientName: '세티리진염산염',
    englishIngredientName: 'Cetirizine',
    ingredientId: 'ing_cetirizine',
    amountText: '10mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_peniramin_1',
    drugMasterId: 'drug_peniramin_2',
    koreanProductName: '페니라민정(클로르페니라민말레산염)',
    itemSeq: '196000011',
    koreanIngredientName: '클로르페니라민말레산염',
    englishIngredientName: 'Chlorpheniramine',
    ingredientId: 'ing_chlorpheniramine',
    amountText: '2mg',
    dosageForm: '정제',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_gomsillin_1',
    drugMasterId: 'drug_gomsillin_500',
    koreanProductName: '곰실린캡슐(아목시실린수화물)',
    itemSeq: '198000158',
    koreanIngredientName: '아목시실린수화물',
    englishIngredientName: 'Amoxicillin',
    ingredientId: 'ing_amoxicillin',
    amountText: '500mg',
    dosageForm: '경질캡슐',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },

  // 복합제 1: 타이레놀콜드-에스정 (4개 유효성분 전체 분리)
  {
    mappingId: 'map_tcold_1',
    drugMasterId: 'drug_tylenol_cold_s',
    koreanProductName: '타이레놀콜드-에스정 (종합감기약 복합제)',
    itemSeq: '202106095',
    koreanIngredientName: '아세트아미노펜',
    englishIngredientName: 'Acetaminophen',
    ingredientId: 'ing_acetaminophen',
    amountText: '325mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_tcold_2',
    drugMasterId: 'drug_tylenol_cold_s',
    koreanProductName: '타이레놀콜드-에스정 (종합감기약 복합제)',
    itemSeq: '202106095',
    koreanIngredientName: '클로르페니라민말레산염',
    englishIngredientName: 'Chlorpheniramine',
    ingredientId: 'ing_chlorpheniramine',
    amountText: '2mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_tcold_3',
    drugMasterId: 'drug_tylenol_cold_s',
    koreanProductName: '타이레놀콜드-에스정 (종합감기약 복합제)',
    itemSeq: '202106095',
    koreanIngredientName: '덱스트로메토르판브롬화수소산염수화물',
    englishIngredientName: 'Dextromethorphan',
    ingredientId: 'UNVERIFIED_INGREDIENT',
    amountText: '15mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'UNVERIFIED_IN_MVP'
  },
  {
    mappingId: 'map_tcold_4',
    drugMasterId: 'drug_tylenol_cold_s',
    koreanProductName: '타이레놀콜드-에스정 (종합감기약 복합제)',
    itemSeq: '202106095',
    koreanIngredientName: '슈도에페드린염산염',
    englishIngredientName: 'Pseudoephedrine',
    ingredientId: 'UNVERIFIED_INGREDIENT',
    amountText: '30mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'UNVERIFIED_IN_MVP'
  },

  // 복합제 2: 판콜에스내복액 (5개 유효성분 전체 분리)
  {
    mappingId: 'map_pancol_1',
    drugMasterId: 'drug_pancol_s',
    koreanProductName: '판콜에스내복액 (종합감기약 액제 복합제)',
    itemSeq: '196800036',
    koreanIngredientName: '아세트아미노펜',
    englishIngredientName: 'Acetaminophen',
    ingredientId: 'ing_acetaminophen',
    amountText: '300mg',
    dosageForm: '내복액제',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_pancol_2',
    drugMasterId: 'drug_pancol_s',
    koreanProductName: '판콜에스내복액 (종합감기약 액제 복합제)',
    itemSeq: '196800036',
    koreanIngredientName: '클로르페니라민말레산염',
    englishIngredientName: 'Chlorpheniramine',
    ingredientId: 'ing_chlorpheniramine',
    amountText: '2.5mg',
    dosageForm: '내복액제',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_pancol_3',
    drugMasterId: 'drug_pancol_s',
    koreanProductName: '판콜에스내복액 (종합감기약 액제 복합제)',
    itemSeq: '196800036',
    koreanIngredientName: '구아이페네신',
    englishIngredientName: 'Guaifenesin',
    ingredientId: 'UNVERIFIED_INGREDIENT',
    amountText: '83.3mg',
    dosageForm: '내복액제',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'UNVERIFIED_IN_MVP'
  },
  {
    mappingId: 'map_pancol_4',
    drugMasterId: 'drug_pancol_s',
    koreanProductName: '판콜에스내복액 (종합감기약 액제 복합제)',
    itemSeq: '196800036',
    koreanIngredientName: 'DL-메틸에페드린염산염',
    englishIngredientName: 'DL-Methylephedrine',
    ingredientId: 'UNVERIFIED_INGREDIENT',
    amountText: '17.5mg',
    dosageForm: '내복액제',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'UNVERIFIED_IN_MVP'
  },
  {
    mappingId: 'map_pancol_5',
    drugMasterId: 'drug_pancol_s',
    koreanProductName: '판콜에스내복액 (종합감기약 액제 복합제)',
    itemSeq: '196800036',
    koreanIngredientName: '카페인무수물',
    englishIngredientName: 'Caffeine Anhydrous',
    ingredientId: 'UNVERIFIED_INGREDIENT',
    amountText: '30mg',
    dosageForm: '내복액제',
    route: 'ORAL',
    isCombination: true,
    verificationStatus: 'UNVERIFIED_IN_MVP'
  }
];
