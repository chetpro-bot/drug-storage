import {
  DrugMasterRecord,
  PregnancySafetyRecord,
  LactationSafetyRecord,
  EvidenceSourceRecord,
  IngredientMappingRecord
} from '../types/maternalSafety';

/**
 * 추가 검증 핵심 성분 DB (염기/수화물 제거 순수 성분명 기준)
 * - Atorvastatin (아토르바스타틴 - 리피토정 10mg/20mg/40mg)
 * - Rosuvastatin (로수바스타틴 - 크레스토정 10mg/20mg)
 * - Omeprazole (오메프라졸)
 * - Famotidine (파모티딘)
 * - Loratadine (로라타딘)
 * - Dextromethorphan (덱스트로메토르판)
 * - Pseudoephedrine (슈도에페드린)
 * - Guaifenesin (구아이페네신)
 * - DL-Methylephedrine (DL-메틸에페드린)
 * - Caffeine (카페인)
 */

export const EXPANDED_PREGNANCY_SAFETY_DB: Record<string, PregnancySafetyRecord> = {
  ing_atorvastatin: {
    ingredientId: 'ing_atorvastatin',
    englishInn: 'Atorvastatin',
    koreanIngrName: '아토르바스타틴',
    therapeuticClass: '이상지질혈증 치료제 (HMG-CoA 환원효소 억제제 · 스타틴계)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제)',
    trimester1Level: 'LEVEL_4_AVOID',
    trimester2Level: 'LEVEL_4_AVOID',
    trimester3Level: 'LEVEL_4_AVOID',
    trimester1Summary:
      '임신 1삼분기(1~13주): 콜레스테롤 및 메발론산 유도체는 태아 세포막 형성과 스테로이드 호르몬 합성에 필수적이므로, 임신이 확인되면 즉시 투여를 중단합니다. 다만 계획되지 않은 임신 초기에 우연히 복용했더라도 대규모 인간 코호트에서 주요 선천성 기형 위험이 유의하게 증가하지 않았으므로 임신 중절 사유가 되지는 않습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 죽상동맥경화증은 만성 질환이므로 임신 기간 중 지질강하제를 일시 중단하더라도 산모의 장기 심혈관 예후에 큰 영향을 주지 않아 원칙적으로 투여를 중단합니다 (단, 동형접합 가족성 고콜레스테롤혈증 등 초고위험군은 전문의 판단).',
    trimester3Summary:
      '임신 3삼분기(28~40주): 태아 콜레스테롤 합성 억제 우려 및 임신 중 생리적 고지혈증의 필요성을 고려하여 투여를 회피합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_4_AVOID',
        riskTitle: '임신 전 기간(1~40주) 임신 확인 즉시 중단 권고 (국내 DUR 1등급 금기)',
        clinicalDetail:
          '국내 식약처 DUR 임부금기 1등급 약물입니다. 단, 임신 사실을 모르고 초기에 복용한 산모에게는 최근 대규모 코호트 연구에서 기형 발생 증가가 입증되지 않았음을 설명하여 과도한 불안을 덜어주고 즉시 복용 중단 및 주치의 상담을 안내합니다.'
      }
    ],
    congenitalMalformationData:
      '과거 동물실험 및 초기 증례 보고로 인해 기형 유발 우려(구 FDA X등급)가 있었으나, 이후 발표된 대규모 인간 역학 코호트 및 메타분석에서는 산모의 기저 질환(당뇨, 비만, 고령)을 보정할 경우 임신 1삼분기 아토르바스타틴 노출에 따른 주요 선천성 기형 위험 증가가 관찰되지 않았습니다 (FDA 2021 Drug Safety Communication, MotherToBaby).',
    miscarriageData:
      '통제된 코호트 연구에서 기저 대사 질환 보정 시 아토르바스타틴 자체에 의한 자연유산 위험 증가는 명확히 입증되지 않았습니다.',
    fetalToxicityData:
      '약리학적으로 태아의 콜레스테롤 및 코엔자임Q10 등 이소프레노이드 합성을 감소시킬 이론적 위험이 존재합니다.',
    fetalRenalRisk: '태아 신장 독성 또는 양수과소증에 관한 특이 보고는 확인되지 않음.',
    fetalDuctusArteriosusRisk: '태아 동맥관 조기 폐쇄와 관련된 보고는 확인되지 않음.',
    maternalRisk:
      '일반적인 고지혈증 산모에서는 임신 중 수개월간 스타틴을 중단해도 산모 급성 심혈관 사건 위험이 거의 증가하지 않습니다.',
    domesticDurGrade: '임부금기 1등급',
    domesticDurNoticeDetail:
      '식약처 공고 DUR 임부금기 1등급 (원칙적 사용금지): 태아의 콜레스테롤 및 그 유도체 합성을 감소시켜 태아 발달에 심각한 영향을 줄 수 있으므로 임부 또는 임신 가능성이 있는 여성에게 투여 금기.',
    domesticPermitSummary:
      '식약처 허가사항(리피토정20밀리그램 등): "임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부에게는 투여하지 말 것(금기). 가임기 여성은 적절한 피임법을 사용해야 하며, 이 약 투여 중 임신이 확인되면 즉시 복용을 중단하고 의사와 상담해야 한다."',
    domesticVsInternationalComparison:
      '**국내 DUR(임부금기 1등급 절대 금기) vs 미국 FDA 2021년 개정 기준의 핵심 차이**: 국내는 여전히 임부금기 1등급 및 허가사항 금기(Contraindication)를 유지하고 있습니다. 반면 미국 FDA는 2021년 7월 대규모 인간 코호트에서 기형 증가 근거가 없음을 반영하여 가장 강력한 일괄 금기(Boxed/Contraindication) 문구를 삭제하고, "임신 확인 시 즉시 중단하되, 심근경색·뇌졸중 초고위험 산모에서는 개별 유익성 판단"으로 완화했습니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'FDA PLLR',
        summaryText:
          '임신이 확인되면 즉시 아토르바스타틴 복용을 중단할 것. 단, 수십 년간의 관찰 연구에서 주요 선천성 기형이나 유산 위험 증가가 확인되지 않아 2021년 일괄 금기 문구를 개정함 (FDA Label Section 8.1).',
        keyDifferenceNote: '임신 초기에 모르고 복용했더라도 태아 기형 확률이 높지 않음을 공식 인정함.',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Atorvastatin%22&limit=1'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText:
          '임신 중에는 일반적으로 Atorvastatin 복용이 권장되지 않으며 임신 계획 또는 임신 확인 시 의사와 상의하여 중단합니다. 다만 임신 초기에 복용했더라도 태아 기형을 유발한다는 강력한 증거는 없습니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/statins/'
      },
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText:
          '대부분의 연구에서 임신 1삼분기 스타틴 노출이 선천성 기형 위험을 높이지 않는 것으로 나타났으나, 임신 중 콜레스테롤 강하 치료가 대개 불필요하므로 임신 확인 시 중단하는 것이 표준입니다.',
        sourceUrl: 'https://mothertobaby.org/fact-sheets/statins/'
      }
    ],
    clinicalRecommendation:
      '처방 검토 시 가임기 여성에게 임신 계획 여부를 확인하고, 임신이 확인된 경우 즉시 복용을 중단하고 처방의와 상의하도록 지도하십시오. 만약 환자가 임신 사실을 모르고 리피토정을 복용했다며 불안해하는 경우, "최근 대규모 인간 연구 및 미국 FDA 검토에서 기형 증가가 확인되지 않았으므로 안심하시고 오늘부터 복용을 중단한 뒤 산부인과 진료를 받으시면 됩니다"라고 상담하십시오.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_rosuvastatin'],
    evidenceSourceIds: [
      'src_lactmed_atorvastatin_nbk501361',
      'src_fda_atorvastatin_pllr',
      'src_bumps_statins',
      'src_mfds_lipitor_200410085'
    ]
  },

  ing_rosuvastatin: {
    ingredientId: 'ing_rosuvastatin',
    englishInn: 'Rosuvastatin',
    koreanIngrName: '로수바스타틴',
    therapeuticClass: '이상지질혈증 치료제 (HMG-CoA 환원효소 억제제 · 스타틴계)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제)',
    trimester1Level: 'LEVEL_4_AVOID',
    trimester2Level: 'LEVEL_4_AVOID',
    trimester3Level: 'LEVEL_4_AVOID',
    trimester1Summary:
      '임신 1삼분기(1~13주): 태아 콜레스테롤 합성 억제 우려로 임신 확인 즉시 중단합니다. 우연한 초기 노출 시 주요 기형 위험 증가는 뚜렷하지 않습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 임신 중 지질강하제 치료의 급성 유익성이 없으므로 복용을 중단합니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 태아 지질 대사 보호를 위해 투여를 회피합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_4_AVOID',
        riskTitle: '임신 전 기간(1~40주) 임신 확인 시 즉시 투여 중단 (국내 DUR 1등급 금기)',
        clinicalDetail: '아토르바스타틴과 동일하게 국내 식약처 DUR 임부금기 1등급에 해당합니다.'
      }
    ],
    congenitalMalformationData:
      '인간 임신 노출 코호트에서 스타틴 계열 전반의 주요 선천성 기형 증가는 확인되지 않았으나 임신 중 사용은 권고되지 않습니다.',
    miscarriageData: '기저 질환 보정 시 유의한 유산 위험 증가는 입증되지 않음.',
    fetalToxicityData: '태아 콜레스테롤 및 메발론산 경로 억제 가능성.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '임신 기간 중 일시 중단 시 산모에 대한 급성 위험은 낮음.',
    domesticDurGrade: '임부금기 1등급',
    domesticDurNoticeDetail:
      '식약처 공고 DUR 임부금기 1등급: 태아 발달에 필수적인 콜레스테롤 합성 억제 우려로 임부 및 임신 가능 여성 금기.',
    domesticPermitSummary:
      '식약처 허가사항(크레스토정 등): "임부 및 수유부, 적절한 피임법을 사용하지 않는 가임여성에게는 투여하지 말 것(금기)."',
    domesticVsInternationalComparison:
      '국내 DUR 1등급 금기이며, 미국 FDA(2021 개정)에서도 임신 확인 시 즉시 중단하도록 권고합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'FDA PLLR',
        summaryText: '임신이 확인되면 즉시 로수바스타틴 투여를 중단할 것 (FDA Label Section 8.1).',
        sourceUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Rosuvastatin%22&limit=1'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText: '임신 중 Statin 복용은 권장되지 않으며 임신 확인 시 중단합니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/statins/'
      }
    ],
    clinicalRecommendation:
      '아토르바스타틴과 마찬가지로 임신 계획 또는 임신 확인 즉시 중단하도록 복약지도하십시오.',
    evidenceQualityLevel: 'MODERATE',
    alternativeIngredientIds: ['ing_atorvastatin'],
    evidenceSourceIds: ['src_lactmed_rosuvastatin_nbk501362', 'src_bumps_statins']
  },

  ing_omeprazole: {
    ingredientId: 'ing_omeprazole',
    englishInn: 'Omeprazole',
    koreanIngrName: '오메프라졸',
    therapeuticClass: '양성자펌프억제제 (PPI · 위산분비억제제)',
    route: 'ORAL',
    routeKorean: '경구 투여 (장용캡슐·장용정)',
    trimester1Level: 'LEVEL_1_SUPPORTED',
    trimester2Level: 'LEVEL_1_SUPPORTED',
    trimester3Level: 'LEVEL_1_SUPPORTED',
    trimester1Summary:
      '임신 1삼분기(1~13주): 수천 명 이상의 임신 1삼분기 노출 코호트(덴마크 국가 레지스트리 등)에서 주요 선천성 기형이나 유산 위험 증가가 확인되지 않았습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 제산제나 파모티딘(H2RA)으로 조절되지 않는 임신 중 중증 위식도역류질환(GERD)에 안전하게 사용할 수 있습니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 임신 말기 자궁 확대로 인한 심한 역류성 식도염 조절에 널리 사용되며 조산이나 저체중아 위험을 높이지 않습니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신 전 기간(1~40주) 가장 임상 근거가 풍부한 대표 PPI',
        clinicalDetail: 'PPI 계열 중 인간 임신 노출 데이터가 가장 많이 축적되어 있어 중증 속쓰림·역류성 식도염 시 선호됩니다.'
      }
    ],
    congenitalMalformationData:
      '대규모 전향적·후향적 코호트 연구에서 임신 1삼분기 오메프라졸 노출에 따른 선천성 기형 발생률 증가는 관찰되지 않았습니다 (MotherToBaby NBK582885, BUMPS).',
    miscarriageData: '자연유산 위험 증가 없음.',
    fetalToxicityData: '사산, 조산, 부당경량아(SGA) 위험 증가 없음.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '특이 산모 위험 없음.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary:
      '식약처 허가사항: "역학연구 결과 임신부 또는 태아/신생아의 건강에 유해한 영향이 나타나지 않았으므로 임부에게 투여할 수 있다(또는 유익성이 위험성을 상회할 때 투여)."',
    domesticVsInternationalComparison:
      '국내 DUR 비금기이며, 해외(MotherToBaby, BUMPS, FDA)에서도 임신 중 안전하게 사용할 수 있는 PPI로 평가가 일치합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '임신 중 오메프라졸 사용은 선천성 기형, 유산, 조산 위험을 높이지 않습니다 (NBK582885).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582885/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText: 'Omeprazole은 임신 중 위산 역류 치료에 가장 널리 연구된 PPI로 태아 유해성 근거가 없습니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/omeprazole/'
      }
    ],
    clinicalRecommendation:
      '임신 중 비약물요법이나 제산제로 조절되지 않는 위식도역류질환·속쓰림에 1차로 선택 가능한 PPI입니다.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_famotidine'],
    evidenceSourceIds: ['src_lactmed_omeprazole_nbk501190', 'src_mtb_omeprazole_nbk582885']
  },

  ing_famotidine: {
    ingredientId: 'ing_famotidine',
    englishInn: 'Famotidine',
    koreanIngrName: '파모티딘',
    therapeuticClass: 'H2 수용체 길항제 (위산분비억제제)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제)',
    trimester1Level: 'LEVEL_1_SUPPORTED',
    trimester2Level: 'LEVEL_1_SUPPORTED',
    trimester3Level: 'LEVEL_1_SUPPORTED',
    trimester1Summary:
      '임신 1삼분기(1~13주): 인간 임신 코호트 연구에서 선천성 기형이나 유산 위험 증가가 확인되지 않았습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 임산부 속쓰림·위염 치료에 널리 사용되는 1차 H2 차단제입니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 태아 독성 보고 없이 임신 말기까지 사용 가능합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신 및 수유 전 기간 선호되는 H2 수용체 길항제',
        clinicalDetail: '시메티딘 대비 약물 상호작용 및 항안드로겐 영향이 없고 수유 이행량도 적어 가장 선호되는 H2 차단제입니다.'
      }
    ],
    congenitalMalformationData: '인간 임신 노출 코호트에서 주요 선천성 기형 증가가 보고되지 않았습니다 (MotherToBaby NBK582700).',
    miscarriageData: '자연유산 위험 증가 보고 없음.',
    fetalToxicityData: '조산 및 저체중아 출산과의 유의한 연관성 없음.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '특이 산모 위험 없음.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary:
      '식약처 허가사항: "임부 또는 임신하고 있을 가능성이 있는 여성에게는 치료상의 유익성이 위험성을 상회한다고 판단되는 경우에만 투여한다."',
    domesticVsInternationalComparison:
      '국내 허가사항은 표준 신중투여 문구이나, 해외 임상 지침에서는 임신·수유 중 가장 선호되는 H2 차단제로 권고됩니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '임신 중 파모티딘 사용이 선천성 기형이나 조산 위험을 높이지 않는 것으로 나타났습니다 (NBK582700).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582700/'
      }
    ],
    clinicalRecommendation: '임신 및 수유 중 경증~중등도 속쓰림, 위산 역류 시 안전하게 권장할 수 있는 H2 차단제입니다.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_omeprazole'],
    evidenceSourceIds: ['src_lactmed_famotidine_nbk501097', 'src_mtb_famotidine_nbk582700']
  },

  ing_loratadine: {
    ingredientId: 'ing_loratadine',
    englishInn: 'Loratadine',
    koreanIngrName: '로라타딘',
    therapeuticClass: '2세대 항히스타민제 (비진정성)',
    route: 'ORAL',
    routeKorean: '경구 투여 (정제·시럽)',
    trimester1Level: 'LEVEL_1_SUPPORTED',
    trimester2Level: 'LEVEL_1_SUPPORTED',
    trimester3Level: 'LEVEL_1_SUPPORTED',
    trimester1Summary:
      '임신 1삼분기(1~13주): 수천 명의 노출 산모 코호트에서 선천성 기형(요도하열 포함) 및 유산 위험 증가가 없는 것으로 확립되었습니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 세티리진과 함께 임신 중 1차 선택 2세대 항히스타민제입니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 진정 작용이 거의 없어 분만 임박기까지 안전하게 사용 가능합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_1_SUPPORTED',
        riskTitle: '임신·수유 중 세티리진과 함께 최우선 권장되는 2세대 항히스타민제',
        clinicalDetail: '졸음 부작용이 가장 적고 모유 이행량(RID 약 0.3~1.1%)도 매우 낮습니다.'
      }
    ],
    congenitalMalformationData: '수천 건 이상의 임신 1삼분기 노출 연구에서 선천성 기형 증가 없음 (MotherToBaby NBK582804, BUMPS).',
    miscarriageData: '자연유산 위험 증가 없음.',
    fetalToxicityData: '조산·저체중아 위험 증가 없음.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '세티리진 대비 산모 졸음 빈도가 더 낮음.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary:
      '식약처 허가사항(클라리틴정 등): "임부에게는 치료상의 유익성이 위험성을 상회할 때만 투여하며, 모유로 이행되므로 수유부에는 투여하지 않는 것이 바람직하다."',
    domesticVsInternationalComparison:
      '세티리진과 마찬가지로 국내 OTC 허가문구는 보수적이나, 해외(LactMed, MotherToBaby, BUMPS, BSACI)에서는 임신·수유 중 가장 안전한 1차 항히스타민제로 권고됩니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '임신 중 로라타딘 사용은 기형이나 유산 확률을 높이지 않습니다 (NBK582804).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582804/'
      },
      {
        agencyName: 'BUMPS / UKTIS',
        summaryText: 'Loratadine은 임신 중 알레르기 치료에 흔히 선택되는 비진정성 항히스타민제입니다.',
        sourceUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/loratadine/'
      }
    ],
    clinicalRecommendation: '임신부 및 수유부의 알레르기 비염·두드러기에 졸음 걱정 없이 1차로 추천할 수 있는 성분입니다.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_cetirizine', 'ing_chlorpheniramine'],
    evidenceSourceIds: ['src_lactmed_loratadine_nbk501508', 'src_mtb_loratadine_nbk582804']
  },

  ing_dextromethorphan: {
    ingredientId: 'ing_dextromethorphan',
    englishInn: 'Dextromethorphan',
    koreanIngrName: '덱스트로메토르판',
    therapeuticClass: '비마약성 중추성 진해제 (기침약)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    trimester1Level: 'LEVEL_2_LOW_RISK',
    trimester2Level: 'LEVEL_2_LOW_RISK',
    trimester3Level: 'LEVEL_2_LOW_RISK',
    trimester1Summary:
      '임신 1삼분기(1~13주): 인간 임신 코호트 연구에서 주요 선천성 기형이나 유산 위험 증가가 관찰되지 않았습니다 (단, 액제 제품에 알코올 성분이 없는지 확인).',
    trimester2Summary: '임신 2삼분기(14~27주): 기침 조절을 위해 단기 상용량 사용 시 위험이 비교적 낮습니다.',
    trimester3Summary: '임신 3삼분기(28~40주): 필요한 최단 기간 상용량 복용 가능합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_2_LOW_RISK',
        riskTitle: '임신 중 마른기침 대증요법 시 단기 사용 가능 (복합제 내 타 성분 주의)',
        clinicalDetail: '단일 성분 자체는 기형 위험이 낮으나 종합감기약에 함께 들어있는 충혈제거제(슈도에페드린 등)를 함께 확인해야 합니다.'
      }
    ],
    congenitalMalformationData: '인간 임신 1삼분기 노출 코호트 연구들에서 선천성 기형 발생률 증가가 나타나지 않았습니다 (MotherToBaby NBK582665).',
    miscarriageData: '자연유산 위험 증가 보고 없음.',
    fetalToxicityData: '상용량에서 태아 독성 보고 없음.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '과량 복용 또는 MAO 억제제·SSRI 병용 시 세로토닌 증후군 주의.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정 성분.',
    domesticPermitSummary: '식약처 허가사항: "임부 또는 임신 가능성이 있는 여성은 유익성이 위험성을 상회할 때만 투여한다."',
    domesticVsInternationalComparison: '국내외 모두 단기 대증적 기침 조절 시 비교적 낮은 위험으로 평가합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '임신 중 상용량의 덱스트로메토르판 사용은 기형이나 유산 위험을 높이지 않습니다 (NBK582665).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582665/'
      }
    ],
    clinicalRecommendation: '임신·수유 중 심한 마른기침에 단기 사용 가능하나 복합감기약 대신 단일 대증요법을 우선 고려하십시오.',
    evidenceQualityLevel: 'MODERATE',
    alternativeIngredientIds: ['ing_guaifenesin'],
    evidenceSourceIds: ['src_lactmed_dextromethorphan_nbk501466', 'src_mtb_dextromethorphan_nbk582665']
  },

  ing_pseudoephedrine: {
    ingredientId: 'ing_pseudoephedrine',
    englishInn: 'Pseudoephedrine',
    koreanIngrName: '슈도에페드린',
    therapeuticClass: '비충혈제거제 (교감신경흥분성 혈관수축제)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    trimester1Level: 'LEVEL_4_AVOID',
    trimester2Level: 'LEVEL_3_CAUTION',
    trimester3Level: 'LEVEL_3_CAUTION',
    trimester1Summary:
      '임신 1삼분기(1~13주): 혈관 수축 작용과 연관되어 일부 환자-대조군 연구에서 태아 복벽갈림증(Gastroschisis), 소장폐쇄증, 반측안면왜소증 등 혈관 파괴성 기형 위험 증가 신호가 보고되어 **임신 1삼분기에는 사용 회피**가 권고됩니다.',
    trimester2Summary:
      '임신 2삼분기(14~27주): 태반 혈류 감소 가능성 및 산모 혈압 상승 위험이 있으므로 생리식염수 비강 스프레이 등을 우선 사용하고 고혈압·임신중독증 산모에게는 금기입니다.',
    trimester3Summary:
      '임신 3삼분기(28~40주): 자궁-태반 혈류 수축 우려가 있으므로 가능한 한 국소 요법으로 대체하고 불가피할 때만 단기 주의 사용합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 13,
        level: 'LEVEL_4_AVOID',
        riskTitle: '임신 1삼분기(1~13주): 혈관수축 기전에 따른 복벽갈림증 등 기형 위험 회피',
        clinicalDetail: '종합감기약(타이레놀콜드-에스정 등)이 임신 초기 산모에게 권장되지 않는 가장 핵심적인 원인 성분입니다.'
      }
    ],
    congenitalMalformationData:
      '전체 기형 위험은 낮으나, 일부 역학 연구에서 임신 1삼분기 노출 시 복벽갈림증(Gastroschisis) 및 소장폐쇄증의 소폭 증가 연관성이 보고되어 임신 초기 회피가 권장됩니다 (MotherToBaby NBK582930, BUMPS).',
    miscarriageData: '확인되지 않음.',
    fetalToxicityData: '교감신경 흥분으로 인한 자궁 동맥 수축 및 태반 관류 감소 가능성.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '산모 혈압 상승, 빈맥, 불면 유발 (임신성 고혈압·전자간증 산모에게 특히 위험).',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: 'DUR 임부금기 등급 미지정이나 임상적으로 임신 1삼분기 및 수유기 회피 권고.',
    domesticPermitSummary: '식약처 허가사항: "임부 및 수유부는 복용 전 의사·약사와 상의할 것."',
    domesticVsInternationalComparison:
      '국내 DUR에는 금기로 지정되어 있지 않아 자칫 간과하기 쉬우나, 해외 기형학 기관(MotherToBaby, BUMPS) 및 LactMed에서는 **임신 1삼분기 혈관수축 기형 우려**와 **수유 중 모유량 급감(24% 감소)**으로 인해 사용 회피를 권고합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '임신 1삼분기 노출과 복벽갈림증 등 일부 혈관성 기형 연관성 보고가 있어 임신 초기 회피가 권고됩니다 (NBK582930).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582930/'
      }
    ],
    clinicalRecommendation:
      '임신 초기(1삼분기) 산모 및 모유 수유부에게는 슈도에페드린이 포함된 종합감기약이나 코감기약을 피하고, 생리식염수 비강 세척 또는 세티리진·로라타딘 단일제를 안내하십시오.',
    evidenceQualityLevel: 'MODERATE',
    alternativeIngredientIds: ['ing_cetirizine', 'ing_loratadine'],
    evidenceSourceIds: ['src_lactmed_pseudoephedrine_nbk501040', 'src_mtb_pseudoephedrine_nbk582930']
  },

  ing_guaifenesin: {
    ingredientId: 'ing_guaifenesin',
    englishInn: 'Guaifenesin',
    koreanIngrName: '구아이페네신',
    therapeuticClass: '거담제 (가래 배출 촉진제)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    trimester1Level: 'LEVEL_3_CAUTION',
    trimester2Level: 'LEVEL_2_LOW_RISK',
    trimester3Level: 'LEVEL_2_LOW_RISK',
    trimester1Summary:
      '임신 1삼분기(1~13주): 대다수 연구에서 주요 기형 증가가 없었으나, 일부 연구에서 서혜부 탈장이나 신경관 결손과의 약한 연관성 신호가 보고된 바 있어 1삼분기에는 충분한 수분 섭취를 우선 권장하고 꼭 필요한 경우에만 사용합니다.',
    trimester2Summary: '임신 2삼분기(14~27주): 가래 증상 완화를 위해 단기 사용 시 위험이 비교적 낮습니다.',
    trimester3Summary: '임신 3삼분기(28~40주): 단기 사용 시 비교적 낮은 위험으로 평가됩니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 13,
        level: 'LEVEL_3_CAUTION',
        riskTitle: '임신 1삼분기(1~13주): 비약물적 수분 섭취 우선 권고',
        clinicalDetail: '가벼운 가래 증상에는 따뜻한 물 섭취와 가습을 우선 안내합니다.'
      }
    ],
    congenitalMalformationData: '전반적인 기형 위험은 낮으나 임신 1삼분기 연구 결과가 일부 혼재되어 있어 초기에는 신중히 사용합니다 (MotherToBaby NBK582732).',
    miscarriageData: '자연유산 위험 증가 근거 없음.',
    fetalToxicityData: '확인되지 않음.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '특이 위험 없음.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: '심평원/식약처 DUR 임부금기 미지정.',
    domesticPermitSummary: '식약처 허가사항: "임부 또는 임신 가능성이 있는 여성은 의사·약사와 상의할 것."',
    domesticVsInternationalComparison: '국내외 모두 임신 1삼분기에는 신중 투여, 중·후기에는 단기 사용 가능으로 평가합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '대부분의 연구에서 기형 증가가 없었으나 임신 1삼분기에는 꼭 필요한 경우에만 사용하는 것이 권장됩니다 (NBK582732).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582732/'
      }
    ],
    clinicalRecommendation: '임신 초기에는 충분한 수분 섭취를 먼저 권장하며, 복합감기약 내 타 성분을 함께 확인하십시오.',
    evidenceQualityLevel: 'MODERATE',
    alternativeIngredientIds: ['ing_dextromethorphan'],
    evidenceSourceIds: ['src_lactmed_guaifenesin_nbk501469', 'src_mtb_guaifenesin_nbk582732']
  },

  ing_methylephedrine: {
    ingredientId: 'ing_methylephedrine',
    englishInn: 'DL-Methylephedrine',
    koreanIngrName: 'DL-메틸에페드린',
    therapeuticClass: '교감신경흥분성 기관지확장·진해제',
    route: 'ORAL',
    routeKorean: '경구 투여 (종합감기약 액제·정제 복합성분)',
    trimester1Level: 'LEVEL_4_AVOID',
    trimester2Level: 'LEVEL_3_CAUTION',
    trimester3Level: 'LEVEL_3_CAUTION',
    trimester1Summary:
      '임신 1삼분기(1~13주): 에페드린 유도체로서 말초 및 자궁-태반 혈관 수축 작용이 있고 인간 임신 안전성 단독 코호트 연구가 부족하여 임신 초기에는 사용 회피가 권장됩니다.',
    trimester2Summary: '임신 2삼분기(14~27주): 산모 빈맥·혈압 상승 및 태반 혈류 영향 우려로 주의가 필요합니다.',
    trimester3Summary: '임신 3삼분기(28~40주): 태아 심박수 증가 및 산모 혈압 상승 주의가 필요합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_4_AVOID',
        riskTitle: '에페드린 유도체 교감신경흥분제: 임산부 종합감기약(판콜에스 등) 복용 시 주의 핵심 성분',
        clinicalDetail: '아세트아미노펜과 함께 들어있는 액상 감기약에 흔히 포함되므로 임산부에게는 아세트아미노펜 단일제를 권고해야 합니다.'
      }
    ],
    congenitalMalformationData: '단독 성분에 대한 대규모 인간 기형학 연구는 부족(확인되지 않음)하나 에페드린 계열 혈관수축 기전상 임신 초기 회피가 권고됩니다.',
    miscarriageData: '확인되지 않음.',
    fetalToxicityData: '태반 혈관 수축 및 태아 빈맥 유발 가능성.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '혈압 상승, 심계항진, 불면, 혈당 상승 우려.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: 'DUR 임부금기 미지정이나 허가사항상 임부·수유부 투여 전 전문가 상담 필수.',
    domesticPermitSummary: '식약처 허가사항: "임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부는 복용 전 의사·약사와 상의할 것."',
    domesticVsInternationalComparison:
      '국내 일반의약품 종합감기약(판콜에스내복액, 판피린큐액 등)에 다수 포함되어 있으므로 임산부·수유부에게는 복합 드링크 대신 단일 성분 해열진통제를 안내해야 합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'LactMed (NIH)',
        summaryText: 'Ephedrine 유도체는 중추신경 자극 및 모유 분비 감소 우려로 수유 및 임신 중 대체약 사용이 권장됩니다.',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501922/'
      }
    ],
    clinicalRecommendation: '임산부·수유부가 판콜에스 등 종합감기약을 찾는 경우 DL-메틸에페드린 등이 포함되어 있으므로 타이레놀 단일제로 안내하십시오.',
    evidenceQualityLevel: 'LOW',
    alternativeIngredientIds: ['ing_acetaminophen'],
    evidenceSourceIds: ['src_mfds_pancol_196800036']
  },

  ing_caffeine: {
    ingredientId: 'ing_caffeine',
    englishInn: 'Caffeine',
    koreanIngrName: '카페인',
    therapeuticClass: '중추신경흥분제 · 진통 보조제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    trimester1Level: 'LEVEL_2_LOW_RISK',
    trimester2Level: 'LEVEL_2_LOW_RISK',
    trimester3Level: 'LEVEL_2_LOW_RISK',
    trimester1Summary:
      '임신 1삼분기(1~13주): 1일 총 카페인 섭취량 200mg 이하(국내 식약처 권고 300mg 이하, 미국 ACOG 200mg 이하)에서는 선천성 기형이나 유산 위험을 높이지 않습니다. 단, 고용량 섭취 시 유산 및 저체중아 위험이 증가하므로 감기약·진통제 내 카페인과 커피/차 섭취량을 합산 관리해야 합니다.',
    trimester2Summary: '임신 2삼분기(14~27주): 임신 중기에는 산모의 카페인 대사 반감기가 2~3배 길어지므로 1일 200mg 이내로 제한합니다.',
    trimester3Summary: '임신 3삼분기(28~40주): 임신 말기에는 산모의 카페인 반감기가 최대 10~15시간까지 길어져 태아에게 축적될 수 있으므로 카페인 무첨가 단일 진통제를 우선 권장합니다.',
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: 'LEVEL_2_LOW_RISK',
        riskTitle: '임신 전 기간 1일 총 카페인 200mg 이하 제한 권고 (카페인 없는 단일 진통제 선호)',
        clinicalDetail: '복합진통제나 종합감기약 1회분에는 보통 카페인 30~50mg이 들어있으므로 카페인 무첨가 아세트아미노펜 단일제가 더 바람직합니다.'
      }
    ],
    congenitalMalformationData: '대규모 인간 역학 연구에서 카페인 섭취와 주요 선천성 기형 발생 증가는 연관성이 없는 것으로 확인되었습니다 (MotherToBaby NBK582613).',
    miscarriageData: '1일 200mg 이하 섭취 시 유산 위험 증가 없으나, 1일 300mg 이상 과량 섭취 시 자연유산 및 태아 성장 지연 위험 증가 보고.',
    fetalToxicityData: '태반을 자유롭게 통과하며 태아는 카페인 대사 효소(CYP1A2)가 미성숙하여 고용량 노출 시 태아 빈맥·자극과민성 유발 가능.',
    fetalRenalRisk: '확인되지 않음.',
    fetalDuctusArteriosusRisk: '확인되지 않음.',
    maternalRisk: '심계항진, 불면, 위산 역류 악화 가능.',
    domesticDurGrade: '임부금기 미지정',
    domesticDurNoticeDetail: 'DUR 임부금기 미지정 (식이 카페인 포함 1일 섭취량 관리 대상).',
    domesticPermitSummary: '식약처 허가사항: "임부·수유부는 카페인 함유 의약품 복용 시 커피, 차 등 카페인 함유 식품과의 중복 섭취에 주의할 것."',
    domesticVsInternationalComparison: '국내외 모두 1일 200mg 이하 소량 노출은 비교적 낮은 위험으로 보나, 의약품 선택 시에는 카페인 무첨가 단일제를 권장합니다.',
    internationalAgencySummaries: [
      {
        agencyName: 'MotherToBaby (OTIS)',
        summaryText: '임신 중 하루 200mg 이하의 중등도 카페인 섭취는 기형이나 유산 위험을 높이지 않습니다 (NBK582613).',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582613/'
      }
    ],
    clinicalRecommendation: '의약품 복용 목적이라면 굳이 카페인이 복합된 진통제·감기약 대신 아세트아미노펜 단일제를 선택하도록 안내하십시오.',
    evidenceQualityLevel: 'HIGH',
    alternativeIngredientIds: ['ing_acetaminophen'],
    evidenceSourceIds: ['src_lactmed_caffeine_nbk501467', 'src_mtb_caffeine_nbk582613']
  }
};

export const EXPANDED_LACTATION_SAFETY_DB: Record<string, LactationSafetyRecord> = {
  ing_atorvastatin: {
    ingredientId: 'ing_atorvastatin',
    englishInn: 'Atorvastatin',
    koreanIngrName: '아토르바스타틴',
    therapeuticClass: '이상지질혈증 치료제 (스타틴계)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_4_AVOID',
    milkConcentrationText:
      '산모 10~80mg 경구 복용 연구에서 모유 내 아토르바스타틴 및 활성 대사체 농도는 매우 낮게 측정됨 (LactMed NBK501361).',
    infantSerumConcentrationText:
      '확인되지 않음 (수유 영아 혈중 농도 측정 데이터 없음, LactMed NBK501361).',
    ridRangeText: '약 0.09% 미만 (모유 이행량은 극소량이나 영아 지질합성 억제 우려로 회피 권고)',
    ridNumericMin: 0.01,
    ridNumericMax: 0.09,
    referenceInfantDoseMgPerKgDay: 0.0005,
    referenceMaternalDoseMgPerKgDay: 0.6,
    ridClinicalInterpretation:
      '**RID 10% 이하를 절대적 안전 기준으로 삼지 않는 대표 사례입니다.** 최근 약동학 연구에서 모유 이행량(RID < 0.1%)은 극히 낮은 것으로 밝혀졌으나, 영아의 뇌·신경계 및 세포막 발달에 필수적인 콜레스테롤 합성을 억제할 잠재적 위험 때문에 수유 기간 동안에는 아토르바스타틴 복용을 보류(회피)하는 것이 권고됩니다.',
    halfLifeText:
      '성인 모화합물 반감기: 약 14시간 / 단, 활성 대사체에 의한 HMG-CoA 환원효소 억제 반감기는 약 20 ~ 30시간으로 긺.',
    activeMetabolitesText:
      '오르토-하이드록시(o-hydroxy) 및 파라-하이드록시(p-hydroxy) 아토르바스타틴 등 모화합물과 동등한 약리 활성을 지닌 활성 대사체가 약효의 약 70%를 담당함.',
    infantAdverseEffects:
      '소수 증례에서 단기 노출 영아의 특이 부작용은 보고되지 않았으나, 영아 장기 성장 및 신경·지질 발달에 대한 안전성 자료가 부족함 (LactMed NBK501361).',
    ageConsiderations: {
      NEONATE: {
        level: 'LEVEL_4_AVOID',
        title: '신생아 (생후 0~4주)',
        clinicalNote: '신생아의 급격한 신경계·세포막 발달 시기로 스타틴 노출을 피해야 합니다.'
      },
      INFANT_1_6M: {
        level: 'LEVEL_4_AVOID',
        title: '생후 1~6개월 영아',
        clinicalNote: '일반적인 고지혈증 치료는 수유 종료 후 재개하는 것이 권장됩니다.'
      },
      INFANT_OVER_6M: {
        level: 'LEVEL_4_AVOID',
        title: '생후 6개월 이상 영아',
        clinicalNote: '수유 중에는 스타틴 복용 회피가 표준 권고입니다.'
      }
    },
    pretermInfantRisk: {
      level: 'LEVEL_4_AVOID',
      clinicalNote: '미숙아 수유모에게는 투여를 금합니다.'
    },
    continuationGuidance:
      '고지혈증 치료는 대개 수개월간 보류하더라도 산모에게 급성 위험이 없으므로, **모유 수유 기간 동안 아토르바스타틴 복용을 일시 중단(보류)하고 단유 후 재개**하거나, 산모가 반드시 복용해야 하는 초고위험군이라면 모유 수유를 중단하도록 안내합니다 (LactMed NBK501361, FDA PLLR).',
    domesticPermitLactationSummary:
      '식약처 허가사항(리피토정): "수유부에게는 투여하지 말 것(금기). 이 약을 복용하는 여성은 수유를 하지 않도록 해야 한다."',
    alternativeIngredientIds: ['ing_rosuvastatin'],
    evidenceSourceIds: [
      'src_lactmed_atorvastatin_nbk501361',
      'src_fda_atorvastatin_pllr',
      'src_mfds_lipitor_200410085'
    ]
  },

  ing_rosuvastatin: {
    ingredientId: 'ing_rosuvastatin',
    englishInn: 'Rosuvastatin',
    koreanIngrName: '로수바스타틴',
    therapeuticClass: '이상지질혈증 치료제 (스타틴계)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_4_AVOID',
    milkConcentrationText: '산모 복용 시 모유 내 농도는 약 0.02 ~ 0.06 mg/L 수준으로 낮게 보고됨 (LactMed NBK501362).',
    infantSerumConcentrationText: '확인되지 않음.',
    ridRangeText: '약 0.6% ~ 1.5% (모유 농도는 낮으나 영아 지질 대사 우려로 수유 중 회피 권고)',
    ridNumericMin: 0.6,
    ridNumericMax: 1.5,
    referenceInfantDoseMgPerKgDay: 0.003,
    referenceMaternalDoseMgPerKgDay: 0.3,
    ridClinicalInterpretation: 'RID 수치는 낮으나 영아 콜레스테롤 생합성 억제 우려로 수유 중에는 사용하지 않는 것이 원칙입니다.',
    halfLifeText: '성인 반감기: 약 19시간.',
    activeMetabolitesText: 'N-데스메틸 로수바스타틴(모화합물의 1/6~1/2 활성)으로 일부 대사되나 90% 이상 미변화체 배설.',
    infantAdverseEffects: '영아 장기 안전성 미확립 (LactMed NBK501362).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_4_AVOID', title: '신생아 (0~4주)', clinicalNote: '수유 중 복용 회피 권고.' },
      INFANT_1_6M: { level: 'LEVEL_4_AVOID', title: '생후 1~6개월', clinicalNote: '수유 종료 후 복용 재개 권고.' },
      INFANT_OVER_6M: { level: 'LEVEL_4_AVOID', title: '생후 6개월 이상', clinicalNote: '수유 중 복용 회피 권고.' }
    },
    pretermInfantRisk: { level: 'LEVEL_4_AVOID', clinicalNote: '미숙아 수유 시 금기.' },
    continuationGuidance: '수유 기간 동안에는 로수바스타틴 복용을 일시 보류하고 수유 종료 후 재개하도록 권고합니다 (LactMed NBK501362).',
    domesticPermitLactationSummary: '식약처 허가사항(크레스토정): "수유부에게는 투여하지 말 것(금기)."',
    alternativeIngredientIds: ['ing_atorvastatin'],
    evidenceSourceIds: ['src_lactmed_rosuvastatin_nbk501362']
  },

  ing_omeprazole: {
    ingredientId: 'ing_omeprazole',
    englishInn: 'Omeprazole',
    koreanIngrName: '오메프라졸',
    therapeuticClass: '양성자펌프억제제 (PPI)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_1_SUPPORTED',
    milkConcentrationText: '산모 20mg 복용 후 3시간째 모유 최고 농도 약 0.02 mg/L(58 nmol/L)로 극미량이며 위산에 의해 영아 위장에서 대부분 불활성화됨 (LactMed NBK501190).',
    infantSerumConcentrationText: '확인되지 않음 (영아 위산에 의해 파괴되어 전신 흡수가 거의 일어나지 않음).',
    ridRangeText: '약 0.1% ~ 0.5% 미만 (경구 생체이용률까지 고려 시 영아 노출 극미량)',
    ridNumericMin: 0.1,
    ridNumericMax: 0.5,
    referenceInfantDoseMgPerKgDay: 0.003,
    referenceMaternalDoseMgPerKgDay: 0.33,
    ridClinicalInterpretation: '모유 내 농도 자체가 극히 낮고, 장용 코팅이 없는 상태로 모유에 녹아 있는 오메프라졸은 영아의 위산에 의해 파괴되므로 영아 전신 노출은 거의 없습니다.',
    halfLifeText: '성인 혈장 반감기: 약 0.5 ~ 1시간 (매우 짧음).',
    activeMetabolitesText: '간 CYP2C19/CYP3A4에 의해 비활성 대사체로 신속히 전환됨.',
    infantAdverseEffects: '수유 영아에서 보고된 중대한 부작용 없음 (LactMed NBK501190).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_1_SUPPORTED', title: '신생아 (0~4주)', clinicalNote: '수유 중단 없이 복용 가능합니다.' },
      INFANT_1_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 1~6개월', clinicalNote: '수유 중 안전하게 사용 가능합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 6개월 이상', clinicalNote: '제한 없이 수유 가능합니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_1_SUPPORTED', clinicalNote: '모유 이행량이 극미량이라 미숙아 수유모에서도 사용 가능합니다.' },
    continuationGuidance: '모유 이행량이 극소량이고 영아 위산에 의해 불활성화되므로 수유를 중단할 필요가 전혀 없습니다 (LactMed NBK501190).',
    domesticPermitLactationSummary: '식약처 허가사항: "모유로 배설되나 치료용량에서는 영아에게 영향을 미칠 가능성이 낮다."',
    alternativeIngredientIds: ['ing_famotidine'],
    evidenceSourceIds: ['src_lactmed_omeprazole_nbk501190', 'src_mtb_omeprazole_nbk582885']
  },

  ing_famotidine: {
    ingredientId: 'ing_famotidine',
    englishInn: 'Famotidine',
    koreanIngrName: '파모티딘',
    therapeuticClass: 'H2 수용체 길항제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_1_SUPPORTED',
    milkConcentrationText: '산모 40mg 복용 후 6시간째 모유 최고 농도 약 0.072 mg/L로 다른 H2 차단제(시메티딘, 니자티딘)보다 모유 농도가 가장 낮음 (LactMed NBK501097).',
    infantSerumConcentrationText: '확인되지 않음.',
    ridRangeText: '약 1.3% ~ 1.9%',
    ridNumericMin: 1.3,
    ridNumericMax: 1.9,
    referenceInfantDoseMgPerKgDay: 0.01,
    referenceMaternalDoseMgPerKgDay: 0.67,
    ridClinicalInterpretation: '모유 이행량이 가장 적은 H2 수용체 길항제로 영아 직접 치료 용량(0.5~1 mg/kg/day)의 약 1~2% 수준에 불과합니다.',
    halfLifeText: '성인 반감기: 약 2.5 ~ 3.5시간 / 신생아: 약 8~10시간.',
    activeMetabolitesText: '유효한 활성 대사체 없음.',
    infantAdverseEffects: '수유 영아 부작용 보고 없음 (LactMed NBK501097).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_1_SUPPORTED', title: '신생아 (0~4주)', clinicalNote: 'H2 차단제 중 수유 시 가장 선호되는 성분입니다.' },
      INFANT_1_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 1~6개월', clinicalNote: '수유 중단 없이 안전하게 복용 가능합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 6개월 이상', clinicalNote: '수유 중단 없이 복용 가능합니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_1_SUPPORTED', clinicalNote: '모유 이행량이 매우 적어 수유 중 선호됩니다.' },
    continuationGuidance: 'H2 수용체 길항제 중 모유 이행이 가장 적어 수유부에게 1차로 권장되며 수유 중단이 불필요합니다 (LactMed NBK501097).',
    domesticPermitLactationSummary: '식약처 허가사항: "모유 중으로 이행하므로 수유부 투여 시 주의한다."',
    alternativeIngredientIds: ['ing_omeprazole'],
    evidenceSourceIds: ['src_lactmed_famotidine_nbk501097', 'src_mtb_famotidine_nbk582700']
  },

  ing_loratadine: {
    ingredientId: 'ing_loratadine',
    englishInn: 'Loratadine',
    koreanIngrName: '로라타딘',
    therapeuticClass: '2세대 항히스타민제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_1_SUPPORTED',
    milkConcentrationText: '산모 40mg(상용량의 4배) 단회 복용 연구에서도 모유로 이행된 로라타딘 및 활성 대사체 합산량은 총 투여량의 0.03%에 불과함 (LactMed NBK501508).',
    infantSerumConcentrationText: '확인되지 않음 (모유 이행량이 극소량임).',
    ridRangeText: '약 0.3% ~ 1.1% (활성 대사체 데스로라타딘 포함)',
    ridNumericMin: 0.3,
    ridNumericMax: 1.1,
    referenceInfantDoseMgPerKgDay: 0.002,
    referenceMaternalDoseMgPerKgDay: 0.17,
    ridClinicalInterpretation: '모유 이행량이 극소량이고 비진정성이므로 영국 알레르기임상면역학회(BSACI) 및 LactMed에서 수유 중 1차 선택 항히스타민제로 권고됩니다.',
    halfLifeText: '로라타딘 반감기: 약 8.4시간 / 활성 대사체(데스로라타딘): 약 27시간.',
    activeMetabolitesText: '데스로라타딘(Desloratadine)이 활성 대사체이나 모유 이행량 합계가 RID 1.1% 이하로 매우 낮음.',
    infantAdverseEffects: '수유 영아 51명 추적 연구에서 졸음 등 이상반응이 보고되지 않았음 (LactMed NBK501508).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_1_SUPPORTED', title: '신생아 (0~4주)', clinicalNote: '비진정성이며 모유 이행량이 극히 낮아 수유 중 가장 선호되는 항히스타민제입니다.' },
      INFANT_1_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 1~6개월', clinicalNote: '수유 중단 없이 안전하게 복용 가능합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 6개월 이상', clinicalNote: '제한 없이 수유 가능합니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_2_LOW_RISK', clinicalNote: '1세대 항히스타민제 대비 진정 위험이 현저히 낮아 선호됩니다.' },
    continuationGuidance: '수유를 중단할 필요가 전혀 없으며 수유부 알레르기 치료의 1차 선택지입니다 (LactMed NBK501508).',
    domesticPermitLactationSummary: '식약처 허가사항: "모유로 이행하므로 수유부 투여를 피한다"고 기재되어 있으나 국제 가이드라인에서는 1차 권장 약물입니다.',
    alternativeIngredientIds: ['ing_cetirizine'],
    evidenceSourceIds: ['src_lactmed_loratadine_nbk501508', 'src_mtb_loratadine_nbk582804']
  },

  ing_dextromethorphan: {
    ingredientId: 'ing_dextromethorphan',
    englishInn: 'Dextromethorphan',
    koreanIngrName: '덱스트로메토르판',
    therapeuticClass: '비마약성 진해제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_2_LOW_RISK',
    milkConcentrationText: '산모 30mg 복용 시 모유 최고 농도는 약 0.003 ~ 0.015 mg/L, 활성 대사체(덱스트로르판)는 약 0.03 ~ 0.16 mg/L로 매우 낮음 (LactMed NBK501466).',
    infantSerumConcentrationText: '확인되지 않음.',
    ridRangeText: '약 0.04% ~ 0.7% (모화합물 및 활성 대사체 합산 1% 미만)',
    ridNumericMin: 0.04,
    ridNumericMax: 0.7,
    referenceInfantDoseMgPerKgDay: 0.004,
    referenceMaternalDoseMgPerKgDay: 1.5,
    ridClinicalInterpretation: '모유 이행량이 산모 체중 보정 용량의 1% 미만으로 매우 낮아 상용량 단기 복용 시 수유 영아에게 미치는 영향이 미미합니다.',
    halfLifeText: '성인 반감기: 약 2 ~ 4시간 (단, CYP2D6 저대사자에서는 연장 가능).',
    activeMetabolitesText: '간 CYP2D6에 의해 활성 대사체인 덱스트로르판(Dextrorphan)으로 대사되나 모유 농도가 매우 낮음.',
    infantAdverseEffects: '단기 상용량에서 수유 영아 이상반응은 거의 보고되지 않음 (발진 1례 의심 보고 외 특이사항 없음, LactMed NBK501466).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_2_LOW_RISK', title: '신생아 (0~4주)', clinicalNote: '알코올 무첨가 단일 제제로 단기 최소 용량 복용 시 수유 가능하며 영아 졸음만 관찰합니다.' },
      INFANT_1_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 1~6개월', clinicalNote: 'RID 1% 미만으로 수유 중 기침 조절에 사용 가능합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 6개월 이상', clinicalNote: '수유 중단 없이 복용 가능합니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_3_CAUTION', clinicalNote: '미숙아는 간 CYP2D6 대사가 미성숙하므로 최소 기간만 사용하고 처짐 여부를 관찰합니다.' },
    continuationGuidance: '상용량 복용 시 수유를 중단할 필요가 없습니다. 단, 슈도에페드린 등이 섞인 종합감기약 복합제는 모유량을 줄일 수 있으므로 단일제를 권장합니다 (LactMed NBK501466).',
    domesticPermitLactationSummary: '식약처 허가사항: "수유부는 복용 전 의사·약사와 상의할 것."',
    alternativeIngredientIds: ['ing_guaifenesin'],
    evidenceSourceIds: ['src_lactmed_dextromethorphan_nbk501466', 'src_mtb_dextromethorphan_nbk582665']
  },

  ing_pseudoephedrine: {
    ingredientId: 'ing_pseudoephedrine',
    englishInn: 'Pseudoephedrine',
    koreanIngrName: '슈도에페드린',
    therapeuticClass: '비충혈제거제 (혈관수축제)',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_4_AVOID',
    milkConcentrationText: '산모 60mg 단회 경구 복용 시 24시간 동안 모유로 총 투여량의 약 0.4 ~ 0.7%가 배설됨 (LactMed NBK501040).',
    infantSerumConcentrationText: '확인되지 않음.',
    ridRangeText: '약 3.3% ~ 4.3% (단, RID와 별개로 모유 분비량 24% 급감 위험으로 회피 권고)',
    ridNumericMin: 3.3,
    ridNumericMax: 4.3,
    referenceInfantDoseMgPerKgDay: 0.15,
    referenceMaternalDoseMgPerKgDay: 3.5,
    ridClinicalInterpretation:
      '**RID 수치(약 4%)만 보고 안전하다고 판단하면 안 되는 대표적인 약물입니다.** 슈도에페드린 60mg 단회 복용만으로도 산모의 혈중 프로락틴이 감소하여 **24시간 모유 생성량이 평균 24% 감소**한다는 무작위 대조 임상시험 결과가 확인되어 수유 중 사용 회피가 권고됩니다.',
    halfLifeText: '성인 반감기: 약 5 ~ 8시간.',
    activeMetabolitesText: '소량 노르슈도에페드린(Norpseudoephedrine)으로 대사되나 대부분 미변화체 배설.',
    infantAdverseEffects:
      '수유 영아의 약 20%에서 **보챔(Irritability), 울음, 수면 장애(불면)**가 보고되었으며, 산모에서 **모유 분비량 평균 24% 감소** 유발 (LactMed NBK501040).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_4_AVOID', title: '신생아 (0~4주)', clinicalNote: '수유 확립기에 모유 분비량을 현저히 줄이고 신생아 보챔을 유발하므로 복용을 피해야 합니다.' },
      INFANT_1_6M: { level: 'LEVEL_4_AVOID', title: '생후 1~6개월', clinicalNote: '모유량 감소 위험으로 경구 슈도에페드린 대신 생리식염수 비강 스프레이 사용을 권고합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_3_CAUTION', title: '생후 6개월 이상', clinicalNote: '단유 계획 중이 아니라면 모유량 감소를 일으킬 수 있으므로 사용을 피합니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_4_AVOID', clinicalNote: '모유량 감소 및 미숙아 빈맥·자극과민성 우려로 회피합니다.' },
    continuationGuidance:
      '모유 수유를 유지하려는 산모에게는 경구 슈도에페드린(및 이를 포함한 종합감기약·코감기약)을 권장하지 마십시오. 생리식염수 점비액이나 국소 비강 스프레이, 또는 2세대 항히스타민제로 대체하도록 복약지도합니다 (LactMed NBK501040).',
    domesticPermitLactationSummary: '식약처 허가사항: "모유로 이행하므로 수유부는 복용하지 않거나 수유를 중단할 것."',
    alternativeIngredientIds: ['ing_cetirizine', 'ing_loratadine'],
    evidenceSourceIds: ['src_lactmed_pseudoephedrine_nbk501040', 'src_mtb_pseudoephedrine_nbk582930']
  },

  ing_guaifenesin: {
    ingredientId: 'ing_guaifenesin',
    englishInn: 'Guaifenesin',
    koreanIngrName: '구아이페네신',
    therapeuticClass: '거담제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_2_LOW_RISK',
    milkConcentrationText: '확인되지 않음 (LactMed NBK501469 원문상 인간 모유 내 구아이페네신 농도 측정 연구 없음).',
    infantSerumConcentrationText: '확인되지 않음 (원문 측정 자료 없음).',
    ridRangeText: '확인되지 않음 (원문 내 모유 농도 미측정)',
    ridNumericMin: null,
    ridNumericMax: null,
    referenceInfantDoseMgPerKgDay: null,
    referenceMaternalDoseMgPerKgDay: null,
    ridClinicalInterpretation: '모유 농도 및 RID는 측정된 바 없으나(확인되지 않음), 성인 반감기가 약 1시간으로 매우 짧아 모유 축적 가능성은 낮습니다.',
    halfLifeText: '성인 반감기: 약 1시간 (신속히 대사·배설됨).',
    activeMetabolitesText: '비활성 대사체(베타-2-메톡시페녹시락트산)로 신속히 산화되어 신장 배설됨.',
    infantAdverseEffects: '수유 영아에서 구아이페네신 단일 성분으로 인한 부작용은 보고되지 않음 (LactMed NBK501469).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_3_CAUTION', title: '신생아 (0~4주)', clinicalNote: '모유 농도 자료가 없으므로 충분한 수분 섭취를 우선 권장합니다.' },
      INFANT_1_6M: { level: 'LEVEL_2_LOW_RISK', title: '생후 1~6개월', clinicalNote: '알코올·슈도에페드린이 없는 단일 제제로 단기 사용 가능합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_2_LOW_RISK', title: '생후 6개월 이상', clinicalNote: '단기 사용 시 위험이 낮습니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_3_CAUTION', clinicalNote: '정량 데이터 부족으로 미숙아 수유 시에는 비약물적 가습·수분 섭취를 우선합니다.' },
    continuationGuidance: '반감기가 약 1시간으로 짧아 단기 상용량 복용 시 수유를 중단할 필요는 없으나, 함께 복합된 충혈제거제나 알코올 함유 여부를 확인하십시오 (LactMed NBK501469).',
    domesticPermitLactationSummary: '식약처 허가사항: "수유부는 복용 전 의사·약사와 상의할 것."',
    alternativeIngredientIds: ['ing_dextromethorphan'],
    evidenceSourceIds: ['src_lactmed_guaifenesin_nbk501469', 'src_mtb_guaifenesin_nbk582732']
  },

  ing_methylephedrine: {
    ingredientId: 'ing_methylephedrine',
    englishInn: 'DL-Methylephedrine',
    koreanIngrName: 'DL-메틸에페드린',
    therapeuticClass: '교감신경흥분성 기관지확장제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_4_AVOID',
    milkConcentrationText: '확인되지 않음 (인간 모유 내 정량 약동학 연구 부재).',
    infantSerumConcentrationText: '확인되지 않음.',
    ridRangeText: '확인되지 않음 (원문 모유 농도 미측정)',
    ridNumericMin: null,
    ridNumericMax: null,
    referenceInfantDoseMgPerKgDay: null,
    referenceMaternalDoseMgPerKgDay: null,
    ridClinicalInterpretation: '정확한 RID는 확인되지 않으나, 에페드린 유도체 특성상 모유 이행 시 영아 보챔·수면장애를 유발하고 산모의 모유 분비량을 감소시킬 우려가 있습니다.',
    halfLifeText: '성인 반감기: 약 4 ~ 5시간.',
    activeMetabolitesText: '일부 에페드린 및 노르에페드린 형태로 대사됨.',
    infantAdverseEffects: '에페드린 계열 노출 시 수유 영아의 보챔, 흥분, 수면 장애 및 산모 모유 분비 감소 우려.',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_4_AVOID', title: '신생아 (0~4주)', clinicalNote: '모유량 감소 및 신생아 보챔 우려로 복용 회피 권고.' },
      INFANT_1_6M: { level: 'LEVEL_4_AVOID', title: '생후 1~6개월', clinicalNote: '종합감기약(판콜에스 등) 대신 단일 대증요법제로 대체 권고.' },
      INFANT_OVER_6M: { level: 'LEVEL_3_CAUTION', title: '생후 6개월 이상', clinicalNote: '모유량 감소 및 영아 수면장애 주의.' }
    },
    pretermInfantRisk: { level: 'LEVEL_4_AVOID', clinicalNote: '미숙아 수유모에게는 투여를 피합니다.' },
    continuationGuidance: '수유 중에는 DL-메틸에페드린이 포함된 종합감기약 액제/정제 대신 아세트아미노펜이나 이부프로펜 단일제를 선택하도록 안내하십시오.',
    domesticPermitLactationSummary: '식약처 허가사항: "수유부는 복용 전 의사·약사와 상의할 것."',
    alternativeIngredientIds: ['ing_acetaminophen', 'ing_ibuprofen'],
    evidenceSourceIds: ['src_mfds_pancol_196800036']
  },

  ing_caffeine: {
    ingredientId: 'ing_caffeine',
    englishInn: 'Caffeine',
    koreanIngrName: '카페인',
    therapeuticClass: '중추신경흥분제 · 진통 보조제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    overallSafetyLevel: 'LEVEL_2_LOW_RISK',
    milkConcentrationText: '산모 카페인 100~200mg 섭취 후 약 1시간에 모유 최고 농도 약 1.5 ~ 3.1 mg/L 도달 (LactMed NBK501467).',
    infantSerumConcentrationText: '산모 소량 섭취 시 영아 혈중 농도는 낮으나, 산모가 고용량 반복 섭취 시 신생아 체내에 축적될 수 있음.',
    ridRangeText: '약 6% ~ 10% (평균 약 7~8%)',
    ridNumericMin: 6.0,
    ridNumericMax: 10.0,
    referenceInfantDoseMgPerKgDay: 0.3,
    referenceMaternalDoseMgPerKgDay: 4.0,
    ridClinicalInterpretation: 'RID는 약 6~10% 수준이나, **신생아의 카페인 반감기(약 80시간)**는 성인(약 4.9시간)보다 16배 이상 길어 산모가 반복 섭취 시 신생아 체내에 축적될 수 있습니다.',
    halfLifeText: '성인 반감기: 약 4.9시간 / **신생아 반감기: 약 80 ~ 97시간** (생후 5~6개월이 되어야 성인 수준인 약 2.6시간으로 단축됨).',
    activeMetabolitesText: '파라잔틴(Paraxanthine), 테오브로민(Theobromine), 테오필린(Theophylline) 등 활성 크산틴 대사체 형성.',
    infantAdverseEffects: '산모 1일 300mg 이하 섭취 시 대개 문제없으나, 과량 섭취 또는 신생아·미숙아에서는 **보챔(Jitteriness/Irritability), 수면 장애(불면)** 발생 가능 (LactMed NBK501467).',
    ageConsiderations: {
      NEONATE: { level: 'LEVEL_3_CAUTION', title: '신생아 (0~4주)', clinicalNote: '신생아는 카페인 반감기가 약 80시간으로 매우 길어 쉽게 축적되므로 카페인 복합 의약품은 피하는 것이 좋습니다.' },
      INFANT_1_6M: { level: 'LEVEL_2_LOW_RISK', title: '생후 1~6개월', clinicalNote: '산모 총 카페인 섭취량(커피+의약품)을 1일 200~300mg 이하로 유지합니다.' },
      INFANT_OVER_6M: { level: 'LEVEL_1_SUPPORTED', title: '생후 6개월 이상', clinicalNote: '영아 간 대사 효소(CYP1A2) 성숙으로 반감기가 짧아져 영향이 적습니다.' }
    },
    pretermInfantRisk: { level: 'LEVEL_3_CAUTION', clinicalNote: '미숙아는 반감기가 100시간 이상으로 길어지고 별도로 무호흡 치료용 카페인을 투여받는 경우도 있으므로 산모 카페인 중복 노출을 주의합니다.' },
    continuationGuidance: '진통제나 감기약 선택 시에는 굳이 카페인이 들어간 복합제 대신 카페인 무첨가 단일제(타이레놀, 이부프로펜 등)를 복용하도록 안내하십시오 (LactMed NBK501467).',
    domesticPermitLactationSummary: '식약처 허가사항: "모유 중으로 이행하여 영아에게 불면·보챔을 일으킬 수 있으므로 수유부는 주의할 것."',
    alternativeIngredientIds: ['ing_acetaminophen', 'ing_ibuprofen'],
    evidenceSourceIds: ['src_lactmed_caffeine_nbk501467', 'src_mtb_caffeine_nbk582613']
  }
};

export const EXPANDED_EVIDENCE_SOURCES_DB: Record<string, EvidenceSourceRecord> = {
  // --- Atorvastatin ---
  src_lactmed_atorvastatin_nbk501361: {
    sourceId: 'src_lactmed_atorvastatin_nbk501361',
    ingredientId: 'ing_atorvastatin',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Atorvastatin [NBK501361]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501361/',
    studyDesign: '인간 모유 약동학(PK) 및 수유 안전성 문헌 종합 모노그래프',
    studySubjects: '아토르바스타틴 복용 수유부 모유 농도 측정 코호트',
    studyScale: '산모 10~80mg 복용 모유 약동학 연구 포함',
    keyFindings:
      '모유 내 아토르바스타틴 농도는 매우 낮으나(RID < 0.09%), 영아의 지질 대사 및 세포막 발달에 미치는 잠재적 우려로 인해 수유 기간 동안에는 복용을 보류(회피)하는 것이 권고됨.',
    studyLimitations: '수유 영아의 직접 혈중 농도 및 장기 신경·지질 발달 추적 연구가 부족함.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_fda_atorvastatin_pllr: {
    sourceId: 'src_fda_atorvastatin_pllr',
    ingredientId: 'ing_atorvastatin',
    organizationName: 'FDA PLLR',
    documentTitle: 'FDA Drug Safety Communication (2021) & openFDA Label: Atorvastatin Pregnancy & Lactation',
    originalUrl: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22Atorvastatin%22+AND+_exists_:pregnancy&limit=1',
    studyDesign: '미국 FDA 허가사항 (Section 8.1 & 8.2) 및 2021 스타틴 임신부 금기 개정 서한',
    studySubjects: '대규모 인간 임신 노출 역학 코호트',
    studyScale: '수천 명 이상의 임신 1삼분기 노출 코호트 메타분석',
    keyFindings:
      '임신 확인 즉시 복용을 중단할 것. 단, 대규모 인간 관찰 연구에서 아토르바스타틴 노출에 따른 주요 선천성 기형이나 유산 증가가 입증되지 않아 일괄 금기(Contraindication) 문구를 완화함. 수유 중에는 권장되지 않음.',
    studyLimitations: '일반적인 고지혈증 산모에서는 임신 중 치료 지속 유익성이 없음.',
    publishedDate: 'openFDA 실시간 API',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_bumps_statins: {
    sourceId: 'src_bumps_statins',
    ingredientId: 'ing_atorvastatin',
    organizationName: 'BUMPS / UKTIS',
    documentTitle: 'BUMPS (Best Use of Medicines in Pregnancy): Statins (Atorvastatin / Rosuvastatin)',
    originalUrl: 'https://www.medicinesinpregnancy.org/leaflets-a-z/statins/',
    studyDesign: '영국 기형학 정보서비스(UKTIS) 임상 근거 요약',
    studySubjects: '임신 중 스타틴 노출 산모',
    studyScale: '국제 기형학 코호트 종합',
    keyFindings: '임신 중 스타틴 복용은 일반적으로 중단하나, 임신 초기에 우연히 복용했더라도 태아 기형 위험 증가는 확인되지 않음.',
    studyLimitations: '임신 2·3삼분기 지속 노출 데이터는 제한적임.',
    publishedDate: '최신 공개판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_lipitor_200410085: {
    sourceId: 'src_mfds_lipitor_200410085',
    ingredientId: 'ing_atorvastatin',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 허가사항 및 DUR 임부금기 1등급 고시: 리피토정20밀리그램(아토르바스타틴칼슘삼수화물) [200410085]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200410085',
    studyDesign: '대한민국 식약처 공식 허가사항 및 DUR 임부금기 1등급 고시',
    studySubjects: '국내 허가 아토르바스타틴 제제',
    studyScale: '국내 공식 규제 고시',
    keyFindings: '국내 DUR 임부금기 1등급 지정. 임부, 임신 가능 여성 및 수유부 투여 금기.',
    studyLimitations: '미국 FDA의 2021년 PLLR 완화 개정과 달리 국내는 DUR 1등급 금기를 유지하고 있음.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },

  // --- Rosuvastatin / Omeprazole / Famotidine / Loratadine / Cold Components ---
  src_lactmed_rosuvastatin_nbk501362: {
    sourceId: 'src_lactmed_rosuvastatin_nbk501362',
    ingredientId: 'ing_rosuvastatin',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Rosuvastatin [NBK501362]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501362/',
    studyDesign: '인간 모유 약동학 및 수유 안전성 모노그래프',
    studySubjects: '수유부',
    studyScale: '모유 농도 측정 증례 및 약동학 연구',
    keyFindings: '모유 이행량은 낮으나(RID 약 0.6~1.5%) 영아 지질 대사 우려로 수유 중 사용 회피 권고.',
    studyLimitations: '영아 장기 안전성 데이터 부재.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_omeprazole_nbk501190: {
    sourceId: 'src_lactmed_omeprazole_nbk501190',
    ingredientId: 'ing_omeprazole',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Omeprazole [NBK501190]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501190/',
    studyDesign: '인간 모유 약동학 모노그래프',
    studySubjects: '오메프라졸 복용 수유부',
    studyScale: '모유 농도 측정 연구',
    keyFindings: '모유 최고 농도 극미량(0.02 mg/L) 및 영아 위산에 의한 파괴로 수유 중 안전하게 사용 가능.',
    studyLimitations: '제한적인 표본 수이나 약리학적으로 영아 흡수 극미량.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_omeprazole_nbk582885: {
    sourceId: 'src_mtb_omeprazole_nbk582885',
    ingredientId: 'ing_omeprazole',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Omeprazole [NBK582885]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582885/',
    studyDesign: '임신 노출 대규모 역학 코호트 종합',
    studySubjects: '임산부 수천 명 코호트',
    studyScale: '국가 레지스트리 포함 대규모 코호트',
    keyFindings: '선천성 기형, 유산, 조산 위험 증가 없음.',
    studyLimitations: '관찰 연구 기반.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_famotidine_nbk501097: {
    sourceId: 'src_lactmed_famotidine_nbk501097',
    ingredientId: 'ing_famotidine',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Famotidine [NBK501097]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501097/',
    studyDesign: '인간 모유 약동학 모노그래프',
    studySubjects: '수유부',
    studyScale: '모유 농도 정량 연구',
    keyFindings: 'H2 차단제 중 모유 이행이 가장 낮아(RID 1.3~1.9%) 수유 중 가장 선호됨.',
    studyLimitations: '영아 혈중 농도 직접 측정은 없음.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_famotidine_nbk582700: {
    sourceId: 'src_mtb_famotidine_nbk582700',
    ingredientId: 'ing_famotidine',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Famotidine [NBK582700]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582700/',
    studyDesign: '임신 코호트 종합',
    studySubjects: '임산부',
    studyScale: '다수 관찰 코호트',
    keyFindings: '선천성 기형 및 유산 위험 증가 없음.',
    studyLimitations: '관찰 연구 중심.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_loratadine_nbk501508: {
    sourceId: 'src_lactmed_loratadine_nbk501508',
    ingredientId: 'ing_loratadine',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Loratadine [NBK501508]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501508/',
    studyDesign: '인간 모유 약동학 및 수유 코호트 모노그래프',
    studySubjects: '로라타딘 복용 수유부 및 영아',
    studyScale: '약동학 연구 및 영아 51명 추적 코호트',
    keyFindings: 'RID 0.3~1.1%로 극히 낮고 비진정성이어서 수유 중 1차 선택 항히스타민제로 권고됨.',
    studyLimitations: '특이 한계 없음.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_loratadine_nbk582804: {
    sourceId: 'src_mtb_loratadine_nbk582804',
    ingredientId: 'ing_loratadine',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Loratadine [NBK582804]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582804/',
    studyDesign: '임신 노출 역학 코호트 종합',
    studySubjects: '임산부 수천 명 코호트',
    studyScale: '대규모 역학 연구 및 메타분석',
    keyFindings: '선천성 기형이나 유산 위험 증가 없음.',
    studyLimitations: '관찰 연구 중심.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_dextromethorphan_nbk501466: {
    sourceId: 'src_lactmed_dextromethorphan_nbk501466',
    ingredientId: 'ing_dextromethorphan',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Dextromethorphan [NBK501466]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501466/',
    studyDesign: '인간 모유 약동학 모노그래프',
    studySubjects: '수유부 20명 코호트 등',
    studyScale: '모유 농도 및 활성 대사체 정량 연구',
    keyFindings: 'RID 0.04~0.7%로 매우 낮아 상용량 단기 복용 시 수유 가능.',
    studyLimitations: '알코올 함유 시럽제는 피해야 함.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_dextromethorphan_nbk582665: {
    sourceId: 'src_mtb_dextromethorphan_nbk582665',
    ingredientId: 'ing_dextromethorphan',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Dextromethorphan [NBK582665]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582665/',
    studyDesign: '임신 노출 코호트 종합',
    studySubjects: '임산부',
    studyScale: '관찰 코호트 다수',
    keyFindings: '상용량 복용 시 선천성 기형이나 유산 위험 증가 없음.',
    studyLimitations: '복합제 내 타 성분 주의 필요.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_pseudoephedrine_nbk501040: {
    sourceId: 'src_lactmed_pseudoephedrine_nbk501040',
    ingredientId: 'ing_pseudoephedrine',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Pseudoephedrine [NBK501040]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501040/',
    studyDesign: '무작위 교차 임상시험 및 모유 약동학 모노그래프',
    studySubjects: '수유부 8명 무작위 대조시험 및 영아 추적 연구',
    studyScale: '임상 약동학 및 모유 생성량 측정 연구',
    keyFindings: '60mg 단회 복용으로도 24시간 모유 생성량이 평균 24% 감소하며 영아 보챔(20%)을 유발하여 수유 중 회피 권고.',
    studyLimitations: '모유량 감소 효과가 뚜렷함.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_pseudoephedrine_nbk582930: {
    sourceId: 'src_mtb_pseudoephedrine_nbk582930',
    ingredientId: 'ing_pseudoephedrine',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Pseudoephedrine [NBK582930]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582930/',
    studyDesign: '임신 노출 환자-대조군 및 코호트 종합',
    studySubjects: '임산부',
    studyScale: '다기관 역학 연구',
    keyFindings: '임신 1삼분기 노출 시 복벽갈림증 등 혈관 수축 관련 기형 소폭 증가 보고가 있어 1삼분기 회피 권고.',
    studyLimitations: '절대 위험도는 낮으나 대체 요법 권장.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_guaifenesin_nbk501469: {
    sourceId: 'src_lactmed_guaifenesin_nbk501469',
    ingredientId: 'ing_guaifenesin',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Guaifenesin [NBK501469]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501469/',
    studyDesign: '수유 안전성 문헌 검토 모노그래프',
    studySubjects: '수유부',
    studyScale: '임상 문헌 종합',
    keyFindings: '모유 농도는 측정된 바 없으나(확인되지 않음) 반감기가 1시간으로 짧아 단기 사용 시 문제없을 것으로 평가.',
    studyLimitations: '인간 모유 정량 데이터 부재.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_guaifenesin_nbk582732: {
    sourceId: 'src_mtb_guaifenesin_nbk582732',
    ingredientId: 'ing_guaifenesin',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Guaifenesin [NBK582732]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582732/',
    studyDesign: '임신 코호트 요약',
    studySubjects: '임산부',
    studyScale: '관찰 코호트',
    keyFindings: '대부분 기형 증가 없으나 임신 1삼분기에는 꼭 필요한 경우에만 사용 권장.',
    studyLimitations: '일부 초기 연구 상충.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_lactmed_caffeine_nbk501467: {
    sourceId: 'src_lactmed_caffeine_nbk501467',
    ingredientId: 'ing_caffeine',
    organizationName: 'LactMed (NIH)',
    documentTitle: 'Drugs and Lactation Database (LactMed®): Caffeine [NBK501467]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK501467/',
    studyDesign: '인간 모유 약동학 및 신생아 배설 연구 모노그래프',
    studySubjects: '수유부 및 신생아·영아',
    studyScale: '다수의 약동학 코호트',
    keyFindings: 'RID 약 6~10%이며 신생아 반감기가 약 80시간으로 길어 과량 섭취 시 신생아 보챔·수면장애 유발 가능.',
    studyLimitations: '식이 카페인 합산 필요.',
    publishedDate: '상시 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mtb_caffeine_nbk582613: {
    sourceId: 'src_mtb_caffeine_nbk582613',
    ingredientId: 'ing_caffeine',
    organizationName: 'MotherToBaby (OTIS)',
    documentTitle: 'MotherToBaby Fact Sheets: Caffeine [NBK582613]',
    originalUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK582613/',
    studyDesign: '임신 노출 대규모 역학 연구 종합',
    studySubjects: '임산부',
    studyScale: '대규모 코호트',
    keyFindings: '1일 200mg 이하 섭취 시 기형이나 유산 위험 증가 없음.',
    studyLimitations: '고용량(300mg 초과)에서는 유산 위험 주의.',
    publishedDate: '최신 개정판',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  },
  src_mfds_pancol_196800036: {
    sourceId: 'src_mfds_pancol_196800036',
    ingredientId: 'ing_methylephedrine',
    organizationName: '식약처 의약품안전나라',
    documentTitle: '식약처 의약품 상세허가정보: 판콜에스내복액 [품목기준코드: 196800036]',
    originalUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=196800036',
    studyDesign: '대한민국 식약처 공식 허가사항',
    studySubjects: '국내 허가 일반의약품',
    studyScale: '국내 공식 규제 허가문서',
    keyFindings: '임부·수유부 복용 전 의사·약사 상담 필수.',
    studyLimitations: '복합제 주의사항.',
    publishedDate: '식약처 상시 업데이트',
    collectedDate: '2026-11-04',
    lastVerifiedDate: '2026-11-04'
  }
};

export const EXPANDED_DRUG_MASTER_DB: DrugMasterRecord[] = [
  {
    id: 'drug_lipitor_10',
    itemSeq: '199906034',
    koreanProductName: '리피토정10밀리그램 (리피토정 10mg)',
    englishIngredientsSummary: 'Atorvastatin',
    strengthText: '10mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '비아트리스코리아(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부에게는 투여하지 말 것(금기). 가임기 여성은 적절한 피임법을 사용해야 하며, 이 약 투여 중 임신이 확인되면 즉시 복용을 중단하고 의사와 상담해야 한다.',
    durPregnancyTabooGrade: 'GRADE_1',
    durPregnancyTabooDetail:
      '식약처 DUR 임부금기 1등급: 태아의 콜레스테롤 및 그 유도체 합성을 감소시켜 태아 발달에 심각한 영향을 줄 수 있으므로 임부 및 임신 가능성이 있는 여성에게 투여 금기.',
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=199906034',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_lipitor_20',
    itemSeq: '200410085',
    koreanProductName: '리피토정20밀리그램 (리피토정 20mg)',
    englishIngredientsSummary: 'Atorvastatin',
    strengthText: '20mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '비아트리스코리아(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부에게는 투여하지 말 것(금기). 가임기 여성은 적절한 피임법을 사용해야 하며, 이 약 투여 중 임신이 확인되면 즉시 복용을 중단하고 의사와 상담해야 한다.',
    durPregnancyTabooGrade: 'GRADE_1',
    durPregnancyTabooDetail:
      '식약처 DUR 임부금기 1등급: 태아의 콜레스테롤 및 그 유도체 합성을 감소시켜 태아 발달에 심각한 영향을 줄 수 있으므로 임부 및 임신 가능성이 있는 여성에게 투여 금기.',
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200410085',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_lipitor_40',
    itemSeq: '200410086',
    koreanProductName: '리피토정40밀리그램 (리피토정 40mg)',
    englishIngredientsSummary: 'Atorvastatin',
    strengthText: '40mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '비아트리스코리아(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부에게는 투여하지 말 것(금기). 임신이 확인되면 즉시 투여를 중단할 것.',
    durPregnancyTabooGrade: 'GRADE_1',
    durPregnancyTabooDetail: '식약처 DUR 임부금기 1등급 (아토르바스타틴 성분 지정).',
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200410086',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_crestor_10',
    itemSeq: '200409281',
    koreanProductName: '크레스토정10밀리그램 (크레스토정 10mg)',
    englishIngredientsSummary: 'Rosuvastatin',
    strengthText: '10mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '한국아스트라제네카(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 및 수유부, 적절한 피임법을 사용하지 않는 가임여성에게는 투여하지 말 것(금기).',
    durPregnancyTabooGrade: 'GRADE_1',
    durPregnancyTabooDetail: '식약처 DUR 임부금기 1등급 (로수바스타틴 성분 지정).',
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=200409281',
    updatedAt: '2026-11-04'
  },
  {
    id: 'drug_claritin_10',
    itemSeq: '199302890',
    koreanProductName: '클라리틴정 (로라타딘 10mg)',
    englishIngredientsSummary: 'Loratadine',
    strengthText: '10mg',
    dosageForm: '정제',
    route: 'ORAL',
    routeKorean: '경구 투여',
    manufacturer: '바이엘코리아(주)',
    isCombination: false,
    mfdsPregnancyPrecautionText:
      '임부 또는 임신하고 있을 가능성이 있는 여성에게는 치료상의 유익성이 위험성을 상회할 때만 투여하며, 모유로 이행하므로 수유부에는 투여하지 않는 것이 바람직하다.',
    durPregnancyTabooGrade: 'NONE',
    durPregnancyTabooDetail: null,
    productSourceUrl: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=199302890',
    updatedAt: '2026-11-04'
  }
];

export const EXPANDED_INGREDIENT_MAPPING_DB: IngredientMappingRecord[] = [
  {
    mappingId: 'map_lipitor_10',
    drugMasterId: 'drug_lipitor_10',
    koreanProductName: '리피토정10밀리그램 (리피토정 10mg)',
    itemSeq: '199906034',
    koreanIngredientName: '아토르바스타틴',
    englishIngredientName: 'Atorvastatin',
    ingredientId: 'ing_atorvastatin',
    amountText: '10mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_lipitor_20',
    drugMasterId: 'drug_lipitor_20',
    koreanProductName: '리피토정20밀리그램 (리피토정 20mg)',
    itemSeq: '200410085',
    koreanIngredientName: '아토르바스타틴',
    englishIngredientName: 'Atorvastatin',
    ingredientId: 'ing_atorvastatin',
    amountText: '20mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_lipitor_40',
    drugMasterId: 'drug_lipitor_40',
    koreanProductName: '리피토정40밀리그램 (리피토정 40mg)',
    itemSeq: '200410086',
    koreanIngredientName: '아토르바스타틴',
    englishIngredientName: 'Atorvastatin',
    ingredientId: 'ing_atorvastatin',
    amountText: '40mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_crestor_10',
    drugMasterId: 'drug_crestor_10',
    koreanProductName: '크레스토정10밀리그램 (크레스토정 10mg)',
    itemSeq: '200409281',
    koreanIngredientName: '로수바스타틴',
    englishIngredientName: 'Rosuvastatin',
    ingredientId: 'ing_rosuvastatin',
    amountText: '10mg',
    dosageForm: '필름코팅정',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  },
  {
    mappingId: 'map_claritin_10',
    drugMasterId: 'drug_claritin_10',
    koreanProductName: '클라리틴정 (로라타딘 10mg)',
    itemSeq: '199302890',
    koreanIngredientName: '로라타딘',
    englishIngredientName: 'Loratadine',
    ingredientId: 'ing_loratadine',
    amountText: '10mg',
    dosageForm: '정제',
    route: 'ORAL',
    isCombination: false,
    verificationStatus: 'VERIFIED_CORE_5'
  }
];
