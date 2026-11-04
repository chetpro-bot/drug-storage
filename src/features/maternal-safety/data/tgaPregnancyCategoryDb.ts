import { TgaPregnancyCategoryCode, TgaPregnancyCategoryInfo } from '../types/maternalSafety';

export const TGA_OFFICIAL_DATABASE_URL =
  'https://www.tga.gov.au/resources/health-professional-information-and-resources/australian-categorisation-system-prescribing-medicines-pregnancy/prescribing-medicines-pregnancy-database';

export const TGA_LAST_UPDATED_DATE = '2026-10-01';

/**
 * 지시서 필수 주의문구:
 * - TGA 등급은 절대적인 안전성 순위가 아니라는 주의문구 표시
 * - B1/B2/B3는 단순한 위험도 순서가 아님을 안내
 */
export const TGA_MANDATORY_DISCLAIMERS = [
  '호주 TGA 임신부 약물 분류(A, B1, B2, B3, C, D, X)는 알파벳 순서에 따른 절대적인 안전성 또는 위험도 순위(계층 구조)가 아닙니다.',
  '특히 B1, B2, B3 등급은 인체 투여 데이터가 제한적일 때 동물실험 결과에 따라 세분류한 것이며, 단순한 임상적 위험도 순서가 아닙니다.',
  '성분 매칭이 불확실한 경우에는 TGA 등급을 표시하지 않습니다.'
] as const;

/**
 * 호주 TGA 임신부 약물 분류 공식 정의 (A, B1, B2, B3, C, D, X)
 */
export const TGA_CATEGORY_DEFINITIONS: Record<
  TgaPregnancyCategoryCode,
  {
    koreanTitle: string;
    koreanDescription: string;
    englishDescription: string;
  }
> = {
  A: {
    koreanTitle: 'Category A',
    koreanDescription:
      '다수의 임신부 및 가임기 여성이 복용하였으나, 기형 발생 빈도 증가나 태아에 대한 직접·간접적 유해 작용이 입증되지 않은 약물입니다.',
    englishDescription:
      'Drugs which have been taken by a large number of pregnant women and women of childbearing age without any proven increase in the frequency of malformations or other direct or indirect harmful effects on the fetus having been observed.'
  },
  B1: {
    koreanTitle: 'Category B1',
    koreanDescription:
      '제한된 수의 임신부 및 가임기 여성이 복용하였으며 기형이나 태아 유해 작용 증가가 관찰되지 않았고, 동물실험에서도 태아 손상 증가 증거가 나타나지 않은 약물입니다.',
    englishDescription:
      'Drugs which have been taken by only a limited number of pregnant women and women of childbearing age, without an increase in the frequency of malformation or other direct or indirect harmful effects on the human fetus having been observed. Studies in animals have not shown evidence of an increased occurrence of fetal damage.'
  },
  B2: {
    koreanTitle: 'Category B2',
    koreanDescription:
      '제한된 수의 임신부 및 가임기 여성이 복용하였으며 기형이나 태아 유해 작용 증가가 관찰되지 않았고, 동물실험 자료가 불충분하거나 없으나 가용한 자료상 태아 손상 증가 증거가 없는 약물입니다.',
    englishDescription:
      'Drugs which have been taken by only a limited number of pregnant women and women of childbearing age, without an increase in the frequency of malformation or other direct or indirect harmful effects on the human fetus having been observed. Studies in animals are inadequate or may be lacking, but available data show no evidence of an increased occurrence of fetal damage.'
  },
  B3: {
    koreanTitle: 'Category B3',
    koreanDescription:
      '제한된 수의 임신부 및 가임기 여성이 복용하였으며 인체 기형이나 태아 유해 작용 증가가 관찰되지 않았으나, 동물실험에서는 태아 손상 증가 증거가 보고되어 그 인체 임상적 유의성이 불확실한 약물입니다.',
    englishDescription:
      'Drugs which have been taken by only a limited number of pregnant women and women of childbearing age, without an increase in the frequency of malformation or other direct or indirect harmful effects on the human fetus having been observed. Studies in animals have shown evidence of an increased occurrence of fetal damage, the significance of which is considered uncertain in humans.'
  },
  C: {
    koreanTitle: 'Category C',
    koreanDescription:
      '기형 유발성은 없으나, 약리학적 작용으로 인해 인간 태아 또는 신생아에게 유해한 영향(가역적일 수 있음)을 미치거나 미칠 것으로 의심되는 약물입니다.',
    englishDescription:
      'Drugs which, owing to their pharmacological effects, have caused or may be suspected of causing, harmful effects on the human fetus or neonate without causing malformations. These effects may be reversible.'
  },
  D: {
    koreanTitle: 'Category D',
    koreanDescription:
      '인간 태아의 기형 발생 빈도 증가 또는 비가역적 손상을 유발했거나, 유발할 것으로 의심되거나 예상되는 약물입니다. 약리학적 유해 작용도 동반할 수 있습니다.',
    englishDescription:
      'Drugs which have caused, are suspected to have caused or may be expected to cause, an increased incidence of human fetal malformations or irreversible damage. These drugs may also have adverse pharmacological effects.'
  },
  X: {
    koreanTitle: 'Category X',
    koreanDescription:
      '태아에게 영구적인 손상을 일으킬 위험이 매우 높아 임신 중이거나 임신 가능성이 있는 경우 절대 사용해서는 안 되는 약물입니다.',
    englishDescription:
      'Drugs which have such a high risk of causing permanent damage to the fetus that they should not be used in pregnancy or when there is a possibility of pregnancy.'
  }
};

export interface TgaRawRecord {
  inn: string;
  category: TgaPregnancyCategoryCode;
  noteKorean?: string;
  noteEnglish?: string;
  routeOrFormCondition?: string;
  updatedAt?: string;
}

/**
 * 호주 TGA 공식 임신부 약물 분류 로컬 마스터 데이터베이스
 * - 다빈도 처방·일반의약품 유효성분 기준
 */
export const TGA_PREGNANCY_DATABASE: Record<string, TgaRawRecord> = {
  // 1. 해열·진통·소염제 (Analgesics & NSAIDs)
  acetaminophen: {
    inn: 'Acetaminophen',
    category: 'A',
    noteKorean: '호주 TGA에서는 Paracetamol(Acetaminophen) 단일제를 Category A로 분류합니다.',
    noteEnglish: 'Listed under Paracetamol in the TGA database as Category A.'
  },
  ibuprofen: {
    inn: 'Ibuprofen',
    category: 'C',
    noteKorean:
      '프로스타글란딘 합성 억제 작용으로 인해 임신 후반기 투여 시 태아 동맥관 조기 폐쇄, 태아 신기능 장애 및 양수과소증, 분만 지연을 유발할 수 있습니다.',
    noteEnglish:
      'Inhibitors of prostaglandin synthesis may cause premature closure of the fetal ductus arteriosus, fetal renal impairment with oligohydramnios, and delayed labour.'
  },
  dexibuprofen: {
    inn: 'Dexibuprofen',
    category: 'C',
    noteKorean:
      '이부프로펜의 활성 광학이성질체(S(+)-ibuprofen)로, 비스테로이드성 소염진통제(NSAIDs)의 약리학적 작용에 따른 태아 동맥관 수축 및 양수과소증 주의가 적용됩니다.'
  },
  naproxen: {
    inn: 'Naproxen',
    category: 'C',
    noteKorean:
      '비스테로이드성 소염진통제(NSAIDs)로 태아 동맥관 조기 폐쇄, 신기능 저하(양수과소증) 및 분만 지연 위험이 있습니다.'
  },
  loxoprofen: {
    inn: 'Loxoprofen',
    category: 'C',
    noteKorean:
      '프로피온산계 비스테로이드성 소염진통제(NSAIDs) 계열 약물로 프로스타글란딘 합성 억제에 따른 태아 동맥관 수축 및 양수과소증 주의가 요구됩니다.'
  },
  celecoxib: {
    inn: 'Celecoxib',
    category: 'B3',
    noteKorean:
      'TGA에서 Celecoxib은 동물실험에서의 태아 영향 및 프로스타글란딘 억제 작용을 고려해 Category B3로 분류됩니다.'
  },
  diclofenac: {
    inn: 'Diclofenac',
    category: 'C',
    noteKorean:
      '프로스타글란딘 합성 억제제로 임신 후반기 태아 동맥관 조기 폐쇄 및 태아 신기능 저하(양수과소증) 위험이 있습니다.'
  },
  meloxicam: {
    inn: 'Meloxicam',
    category: 'C',
    noteKorean:
      '프로스타글란딘 합성 억제에 따른 태아 동맥관 조기 폐쇄, 태아 신기능 장애 및 분만 지연 가능성이 있습니다.'
  },
  ketorolac: {
    inn: 'Ketorolac',
    category: 'C',
    noteKorean:
      '프로스타글란딘 합성 억제 작용으로 인해 태아 동맥관 수축, 신기능 장애 및 출혈 위험 증가 가능성이 있습니다.'
  },
  aspirin: {
    inn: 'Aspirin',
    category: 'C',
    noteKorean:
      '일반 진통 용량 투여 시 프로스타글란딘 합성 억제로 분만 지연, 태아 동맥관 조기 폐쇄 및 출혈 경향 증가를 유발할 수 있습니다.'
  },

  // 2. 항히스타민제 (Antihistamines)
  cetirizine: {
    inn: 'Cetirizine',
    category: 'B2',
    noteKorean:
      '제한된 수의 임신부 복용 자료에서 기형 증가가 관찰되지 않았으며, 동물실험에서 태아 손상 증가 증거가 보고되지 않았습니다.'
  },
  levocetirizine: {
    inn: 'Levocetirizine',
    category: 'B1',
    noteKorean:
      '세티리진의 거울상이성질체로, 동물실험에서 태아 유해 작용 증거가 관찰되지 않아 TGA Category B1으로 분류됩니다.'
  },
  loratadine: {
    inn: 'Loratadine',
    category: 'B1',
    noteKorean:
      '제한된 수의 임신부 복용에서 기형 증가가 관찰되지 않았으며, 동물실험에서도 태아 손상 증가 증거가 나타나지 않았습니다. (단, 국내 식약처 DUR에서는 임부금기 2등급으로 지정되어 있으므로 양쪽 정보를 모두 확인하십시오.)'
  },
  desloratadine: {
    inn: 'Desloratadine',
    category: 'B1',
    noteKorean: '로라타딘의 활성 대사체로 TGA Category B1으로 분류됩니다.'
  },
  fexofenadine: {
    inn: 'Fexofenadine',
    category: 'B2',
    noteKorean: '제한된 인체 자료 및 동물실험 기준 TGA Category B2로 분류됩니다.'
  },
  olopatadine: {
    inn: 'Olopatadine',
    category: 'B1',
    routeOrFormCondition: '점안제/비강분무제 기준',
    noteKorean: 'TGA에서 Olopatadine은 Category B1으로 분류됩니다.'
  },
  chlorpheniramine: {
    inn: 'Chlorpheniramine',
    category: 'A',
    noteKorean:
      '호주 TGA에서 Chlorpheniramine(Chlorphenamine)은 다수의 임신부 사용 경험에 근거하여 Category A로 분류됩니다.'
  },
  triprolidine: {
    inn: 'Triprolidine',
    category: 'A',
    noteKorean:
      '호주 TGA에서 Triprolidine은 다수의 임신부 사용 경험에서 기형 증가가 확인되지 않아 Category A로 분류됩니다.'
  },
  diphenhydramine: {
    inn: 'Diphenhydramine',
    category: 'A',
    noteKorean: '호주 TGA에서 Diphenhydramine은 Category A로 분류됩니다.'
  },
  doxylamine: {
    inn: 'Doxylamine',
    category: 'A',
    noteKorean: '임신 중 입덧(오심·구토) 치료 등 다수의 임신부 복용 데이터가 축적되어 Category A로 분류됩니다.'
  },

  // 3. 항생제·항균제·항바이러스제·항진균제 (Anti-infectives)
  amoxicillin: {
    inn: 'Amoxicillin',
    category: 'A',
    noteKorean:
      '페니실린계 항생제로 다수의 임신부 사용 경험에서 기형이나 직접적인 태아 유해성이 입증되지 않아 Category A로 분류됩니다.'
  },
  'clavulanic acid': {
    inn: 'Clavulanic Acid',
    category: 'B1',
    noteKorean:
      'TGA에서 아목시실린·클라불란산 복합제(Amoxicillin with clavulanic acid) 및 Potassium clavulanate는 Category B1으로 분류됩니다. 조기 양막 파수(pPROM) 산모 연구에서 신생아 괴사성 장염 위험 증가 가능성이 보고된 바 있습니다.',
    noteEnglish: 'Amoxicillin with clavulanic acid is classified as Category B1 in the TGA database.'
  },
  ampicillin: {
    inn: 'Ampicillin',
    category: 'A',
    noteKorean: '페니실린계 항생제로 TGA Category A로 분류됩니다.'
  },
  cephalexin: {
    inn: 'Cephalexin',
    category: 'A',
    noteKorean: '1세대 세팔로스포린계 항생제로 다수의 임신부 사용 경험에 따라 Category A로 분류됩니다.'
  },
  cefaclor: {
    inn: 'Cefaclor',
    category: 'B1',
    noteKorean: '2세대 세팔로스포린계 항생제로 TGA Category B1으로 분류됩니다.'
  },
  cefdinir: {
    inn: 'Cefdinir',
    category: 'B1',
    noteKorean: '세팔로스포린계 항생제로 동물실험에서 태아 유해 증거가 없어 Category B1 수준에 해당합니다.'
  },
  cefuroxime: {
    inn: 'Cefuroxime',
    category: 'B1',
    noteKorean: '2세대 세팔로스포린계 항생제로 TGA Category B1으로 분류됩니다.'
  },
  cefpodoxime: {
    inn: 'Cefpodoxime',
    category: 'B1',
    noteKorean:
      '3세대 경구용 세팔로스포린계 항생제로 동물실험에서 태아 손상 증거가 보고되지 않아 호주 TGA Category B1으로 분류됩니다.',
    noteEnglish: 'Classified as Category B1 in the Australian TGA database.'
  },
  cefditoren: {
    inn: 'Cefditoren',
    category: 'B1',
    noteKorean: '3세대 경구용 세팔로스포린계 항생제로 TGA Category B1으로 분류됩니다.'
  },
  cefixime: {
    inn: 'Cefixime',
    category: 'B1',
    noteKorean: '3세대 경구용 세팔로스포린계 항생제로 TGA Category B1으로 분류됩니다.'
  },
  cefazolin: {
    inn: 'Cefazolin',
    category: 'A',
    noteKorean: '1세대 세팔로스포린계 항생제로 다수의 임신부 사용 경험에 근거해 TGA Category A로 분류됩니다.'
  },
  ceftriaxone: {
    inn: 'Ceftriaxone',
    category: 'B1',
    noteKorean: '3세대 세팔로스포린계 항생제로 동물실험에서 기형 유발이 없어 TGA Category B1으로 분류됩니다.'
  },
  cefotaxime: {
    inn: 'Cefotaxime',
    category: 'B1',
    noteKorean: '3세대 세팔로스포린계 항생제로 TGA Category B1으로 분류됩니다.'
  },
  ceftazidime: {
    inn: 'Ceftazidime',
    category: 'B1',
    noteKorean: '3세대 세팔로스포린계 항생제로 TGA Category B1으로 분류됩니다.'
  },
  azithromycin: {
    inn: 'Azithromycin',
    category: 'B1',
    noteKorean: '마크로라이드계 항생제로 동물실험에서 태아 손상 증가 증거가 없어 TGA Category B1으로 분류됩니다.'
  },
  clarithromycin: {
    inn: 'Clarithromycin',
    category: 'B3',
    noteKorean:
      '동물실험에서 심혈관계 기형 및 구개열 등 태아 유해 작용이 관찰되어 TGA Category B3로 분류됩니다.'
  },
  erythromycin: {
    inn: 'Erythromycin',
    category: 'A',
    noteKorean: '마크로라이드계 항생제로 다수의 임신부 사용 경험에 근거해 TGA Category A로 분류됩니다.'
  },
  ciprofloxacin: {
    inn: 'Ciprofloxacin',
    category: 'B3',
    noteKorean: '미성숙 동물의 체중 부하 관절 연골 손상이 관찰되어 TGA Category B3로 분류됩니다.'
  },
  levofloxacin: {
    inn: 'Levofloxacin',
    category: 'B3',
    noteKorean: '퀴놀론계 항균제로 미성숙 동물 연골 손상 보고에 따라 Category B3로 분류됩니다.'
  },
  ofloxacin: {
    inn: 'Ofloxacin',
    category: 'B3',
    noteKorean: '퀴놀론계 항균제로 TGA Category B3로 분류됩니다.'
  },
  metronidazole: {
    inn: 'Metronidazole',
    category: 'B2',
    noteKorean: 'TGA에서 Metronidazole은 Category B2로 분류됩니다.'
  },
  doxycycline: {
    inn: 'Doxycycline',
    category: 'D',
    noteKorean:
      '테트라사이클린계 항생제는 태아 골격 형성 지연 및 치아 착색·법랑질 형성부전을 유발할 수 있어 Category D로 분류됩니다.'
  },
  tetracycline: {
    inn: 'Tetracycline',
    category: 'D',
    noteKorean: '태아 치아 착색 및 골 성장 억제 위험으로 TGA Category D로 분류됩니다.'
  },
  fluconazole: {
    inn: 'Fluconazole',
    category: 'D',
    noteKorean:
      '고용량(400~800mg/일) 장기 투여 시 다발성 선천성 기형 사례가 보고되어 TGA Category D로 분류됩니다 (단회 150mg 질칸디다증 치료 등 용량별 조건 확인 필요).'
  },
  itraconazole: {
    inn: 'Itraconazole',
    category: 'B3',
    noteKorean: '동물실험에서 태아 기형 및 독성이 보고되어 TGA Category B3로 분류됩니다.'
  },
  terbinafine: {
    inn: 'Terbinafine',
    category: 'B1',
    noteKorean: '동물실험에서 태아 유해 작용이 관찰되지 않아 TGA Category B1으로 분류됩니다.'
  },
  acyclovir: {
    inn: 'Acyclovir',
    category: 'B3',
    noteKorean:
      '인체 임신부 레지스트리에서는 기형 증가가 관찰되지 않았으나, 고용량 동물실험 결과에 근거하여 TGA에서는 Category B3로 분류합니다.'
  },
  valacyclovir: {
    inn: 'Valacyclovir',
    category: 'B3',
    noteKorean: '아시클로버의 전구약물로 TGA Category B3로 분류됩니다.'
  },
  oseltamivir: {
    inn: 'Oseltamivir',
    category: 'B1',
    noteKorean: '인플루엔자 항바이러스제로 TGA Category B1으로 분류됩니다.'
  },

  // 4. 비충혈제거제·진해거담제·감기약 성분 (Cough & Cold)
  pseudoephedrine: {
    inn: 'Pseudoephedrine',
    category: 'B2',
    noteKorean:
      '호주 TGA에서 Pseudoephedrine은 제한된 인체 데이터 및 동물실험 부족에 따라 Category B2로 분류됩니다. (단, 국내 식약처 DUR에서는 임부금기 2등급으로 지정되어 있으므로 양쪽 정보를 모두 확인하십시오.)',
    noteEnglish: 'Classified as Category B2 in the Australian TGA database.'
  },
  phenylephrine: {
    inn: 'Phenylephrine',
    category: 'B2',
    noteKorean:
      '알파-아드레날린 효능제로 자궁 혈류 감소 가능성이 있을 수 있으며 TGA Category B2로 분류됩니다.'
  },
  dextromethorphan: {
    inn: 'Dextromethorphan',
    category: 'A',
    noteKorean:
      '호주 TGA에서 Dextromethorphan은 다수의 임신부 사용 경험에서 기형 증가가 입증되지 않아 Category A로 분류됩니다.'
  },
  guaifenesin: {
    inn: 'Guaifenesin',
    category: 'A',
    noteKorean: '호주 TGA에서 Guaifenesin(Guaiphenesin)은 Category A로 분류됩니다.'
  },
  codeine: {
    inn: 'Codeine',
    category: 'A',
    noteKorean:
      'TGA에서 Codeine은 Category A로 분류되나, 분만 직전 또는 고용량 장기 투여 시 신생아 호흡억제 및 금단증상을 유발할 수 있다는 경고가 함께 제시됩니다.'
  },
  tramadol: {
    inn: 'Tramadol',
    category: 'C',
    noteKorean:
      '오피오이드계 진통제로 분만 전후 또는 장기 투여 시 신생아 호흡억제 및 금단증상을 유발할 수 있어 Category C로 분류됩니다.'
  },
  caffeine: {
    inn: 'Caffeine',
    category: 'A',
    noteKorean: '일반적인 치료/식이 범위 내에서 Category A로 분류되나 과량 섭취는 피해야 합니다.'
  },

  // 5. 호흡기·천식·스테로이드제 (Respiratory & Corticosteroids)
  prednisolone: {
    inn: 'Prednisolone',
    category: 'A',
    noteKorean:
      '태반에서 효소(11β-HSD2)에 의해 불활성화되는 비율이 높으며, 호주 TGA에서는 전신 코르티코스테로이드 중 Prednisolone을 Category A로 분류합니다.'
  },
  methylprednisolone: {
    inn: 'Methylprednisolone',
    category: 'A',
    noteKorean: '호주 TGA에서 Methylprednisolone은 Category A로 분류됩니다.'
  },
  dexamethasone: {
    inn: 'Dexamethasone',
    category: 'A',
    noteKorean:
      '호주 TGA에서 Dexamethasone은 Category A로 분류됩니다 (단, 태반 통과율이 높으므로 반복 투여 시 태아 부신 억제 및 성장 영향을 고려해야 합니다).'
  },
  hydrocortisone: {
    inn: 'Hydrocortisone',
    category: 'A',
    noteKorean: '호주 TGA에서 Hydrocortisone은 Category A로 분류됩니다.'
  },
  montelukast: {
    inn: 'Montelukast',
    category: 'B1',
    noteKorean: '류코트리엔 수용체 길항제로 TGA Category B1으로 분류됩니다.'
  },
  salbutamol: {
    inn: 'Salbutamol',
    category: 'A',
    noteKorean: '흡입용 단기작용 베타2 효능제로 다수의 임신부 천식 치료 경험에 따라 Category A로 분류됩니다.'
  },
  budesonide: {
    inn: 'Budesonide',
    category: 'A',
    routeOrFormCondition: '흡입제/비강분무제 기준',
    noteKorean: '흡입용 코르티코스테로이드 중 다수의 임신부 안전성 데이터가 확보되어 Category A로 분류됩니다.'
  },
  fluticasone: {
    inn: 'Fluticasone',
    category: 'B3',
    noteKorean: '동물실험 결과에 따라 TGA에서 Fluticasone은 Category B3로 분류됩니다.'
  },

  // 6. 소화기계 약물 (Gastrointestinal)
  famotidine: {
    inn: 'Famotidine',
    category: 'B1',
    noteKorean: 'H2 수용체 길항제로 동물실험에서 태아 손상 증거가 없어 TGA Category B1으로 분류됩니다.'
  },
  cimetidine: {
    inn: 'Cimetidine',
    category: 'B1',
    noteKorean: 'H2 수용체 길항제로 TGA Category B1으로 분류됩니다.'
  },
  omeprazole: {
    inn: 'Omeprazole',
    category: 'B3',
    noteKorean:
      '인체 역학 연구에서는 기형 증가가 보고되지 않았으나, 고용량 동물실험에서의 배아 독성 결과로 인해 TGA에서는 Category B3로 분류합니다.'
  },
  esomeprazole: {
    inn: 'Esomeprazole',
    category: 'B3',
    noteKorean: '오메프라졸의 S-이성질체로 TGA에서 Category B3로 분류됩니다.'
  },
  lansoprazole: {
    inn: 'Lansoprazole',
    category: 'B3',
    noteKorean: '프로톤펌프억제제(PPI)로 TGA Category B3로 분류됩니다.'
  },
  rabeprazole: {
    inn: 'Rabeprazole',
    category: 'B1',
    noteKorean: '프로톤펌프억제제(PPI) 중 동물실험 결과에 따라 TGA Category B1으로 분류됩니다.'
  },
  pantoprazole: {
    inn: 'Pantoprazole',
    category: 'B3',
    noteKorean: '프로톤펌프억제제(PPI)로 TGA Category B3로 분류됩니다.'
  },
  sucralfate: {
    inn: 'Sucralfate',
    category: 'B1',
    noteKorean: '위장관 흡수가 극히 적은 국소 점막보호제로 TGA Category B1으로 분류됩니다.'
  },
  domperidone: {
    inn: 'Domperidone',
    category: 'B2',
    noteKorean: '도파민 길항 위장관운동촉진제로 TGA Category B2로 분류됩니다.'
  },
  metoclopramide: {
    inn: 'Metoclopramide',
    category: 'A',
    noteKorean: '임신 중 입덧(오심·구토)에 다수 사용된 경험에 근거하여 TGA Category A로 분류됩니다.'
  },
  ondansetron: {
    inn: 'Ondansetron',
    category: 'B1',
    noteKorean: '5-HT3 수용체 길항 항구토제로 TGA Category B1으로 분류됩니다.'
  },
  loperamide: {
    inn: 'Loperamide',
    category: 'B3',
    noteKorean: '지사제로 고용량 동물실험 결과에 따라 TGA Category B3로 분류됩니다.'
  },
  bisacodyl: {
    inn: 'Bisacodyl',
    category: 'A',
    noteKorean: '자극성 완하제로 TGA Category A로 분류됩니다.'
  },

  // 7. 내분비·심혈관·신경정신과·최기형성 약물 (Endocrine, CV, CNS, Teratogens)
  levothyroxine: {
    inn: 'Levothyroxine',
    category: 'A',
    noteKorean: '갑상선호르몬제로 태반을 거의 통과하지 않으며 임신 중 갑상선기능저하증 유지에 필수적인 Category A 약물입니다.'
  },
  propylthiouracil: {
    inn: 'Propylthiouracil',
    category: 'C',
    noteKorean: '항갑상선제로 태반을 통과하여 태아 갑상선종 및 갑상선기능저하증을 유발할 수 있어 Category C로 분류됩니다.'
  },
  methimazole: {
    inn: 'Methimazole',
    category: 'C',
    noteKorean: '항갑상선제(Carbimazole/Methimazole)로 태아 갑상선 기능 억제 및 선천성 피부무형성증 등 주의가 필요합니다.'
  },
  metformin: {
    inn: 'Metformin',
    category: 'C',
    noteKorean: '경구 혈당강하제로 TGA에서는 임신 중 인슐린 요법을 표준으로 권장하며 Category C로 분류합니다.'
  },
  insulin: {
    inn: 'Insulin',
    category: 'A',
    noteKorean: '인슐린은 태반을 통과하지 않으며 임신성 당뇨 및 당뇨병 임신부의 표준 치료제로 Category A입니다.'
  },
  labetalol: {
    inn: 'Labetalol',
    category: 'C',
    noteKorean:
      '베타차단제의 약리학적 작용으로 태아 및 신생아 서맥, 저혈압, 저혈당을 일으킬 수 있어 TGA Category C로 분류됩니다.'
  },
  nifedipine: {
    inn: 'Nifedipine',
    category: 'C',
    noteKorean: '칼슘채널차단제로 TGA Category C로 분류됩니다.'
  },
  amlodipine: {
    inn: 'Amlodipine',
    category: 'C',
    noteKorean: '칼슘채널차단제로 TGA Category C로 분류됩니다.'
  },
  losartan: {
    inn: 'Losartan',
    category: 'D',
    noteKorean:
      '안지오텐신 II 수용체 차단제(ARB)는 임신 2·3삼분기 투여 시 태아 신기능 부전, 양수과소증, 두개골 형성부전 및 태아 사망을 유발할 수 있어 Category D로 분류됩니다.'
  },
  valsartan: {
    inn: 'Valsartan',
    category: 'D',
    noteKorean: 'ARB 계열 항고혈압제로 태아 신독성 및 양수과소증 위험 때문에 Category D로 분류됩니다.'
  },
  enalapril: {
    inn: 'Enalapril',
    category: 'D',
    noteKorean: 'ACE 억제제로 임신 2·3삼분기 태아 신부전, 양수과소증 및 기형 위험으로 Category D로 분류됩니다.'
  },
  atorvastatin: {
    inn: 'Atorvastatin',
    category: 'D',
    noteKorean:
      'HMG-CoA 환원효소 억제제(스타틴)로 콜레스테롤 합성 억제에 따른 태아 발달 영향 우려로 TGA Category D로 분류됩니다.'
  },
  rosuvastatin: {
    inn: 'Rosuvastatin',
    category: 'D',
    noteKorean: '스타틴 계열 고지혈증 치료제로 TGA Category D로 분류됩니다.'
  },
  simvastatin: {
    inn: 'Simvastatin',
    category: 'D',
    noteKorean: '스타틴 계열 고지혈증 치료제로 TGA Category D로 분류됩니다.'
  },
  sertraline: {
    inn: 'Sertraline',
    category: 'C',
    noteKorean:
      '선택적 세로토닌 재흡수 억제제(SSRI)로 임신 후반기 복용 시 신생아 적응 증후군(금단/자극과민성) 및 신생아 지속성 폐고혈압(PPHN) 가능성으로 인해 Category C로 분류됩니다.'
  },
  escitalopram: {
    inn: 'Escitalopram',
    category: 'C',
    noteKorean: 'SSRI 계열 항우울제로 신생아 금단/적응 증후군 등 약리학적 영향으로 인해 TGA Category C로 분류됩니다.'
  },
  fluoxetine: {
    inn: 'Fluoxetine',
    category: 'C',
    noteKorean: 'SSRI 계열 항우울제로 TGA Category C로 분류됩니다.'
  },
  paroxetine: {
    inn: 'Paroxetine',
    category: 'D',
    noteKorean: '임신 제1삼분기 노출 시 태아 심장 기형(심실·심방중격결손) 위험 증가 보고에 따라 TGA Category D로 분류됩니다.'
  },
  zolpidem: {
    inn: 'Zolpidem',
    category: 'B3',
    noteKorean: '비벤조디아제핀계 수면진정제로 TGA Category B3로 분류됩니다.'
  },
  alprazolam: {
    inn: 'Alprazolam',
    category: 'C',
    noteKorean: '벤조디아제핀계 약물로 분만 전후 투여 시 신생아 근긴장저하(floppy infant syndrome), 호흡억제 및 금단증상을 유발할 수 있어 Category C로 분류됩니다.'
  },
  diazepam: {
    inn: 'Diazepam',
    category: 'C',
    noteKorean: '벤조디아제핀계 약물로 신생아 호흡억제, 근긴장저하 및 금단증상 위험으로 Category C로 분류됩니다.'
  },
  sumatriptan: {
    inn: 'Sumatriptan',
    category: 'B3',
    noteKorean: '편두통 치료제(트립탄계)로 동물실험 결과에 근거하여 TGA Category B3로 분류됩니다.'
  },
  lamotrigine: {
    inn: 'Lamotrigine',
    category: 'D',
    noteKorean: '항경련제로 TGA에서 Category D로 분류됩니다.'
  },
  levetiracetam: {
    inn: 'Levetiracetam',
    category: 'B3',
    noteKorean: '항경련제로 동물실험 결과에 근거하여 TGA Category B3로 분류됩니다.'
  },
  carbamazepine: {
    inn: 'Carbamazepine',
    category: 'D',
    noteKorean: '신경관 결손(이분척추) 및 안면·심혈관 기형 위험 증가로 TGA Category D로 분류됩니다.'
  },
  'valproic acid': {
    inn: 'Valproic Acid',
    category: 'D',
    noteKorean: '신경관 결손 등 중대한 선천성 기형 및 소아 신경발달 장애 위험이 확립되어 TGA Category D로 분류됩니다.'
  },
  topiramate: {
    inn: 'Topiramate',
    category: 'D',
    noteKorean: '구순열·구개열 등 선천성 기형 위험 증가로 TGA Category D로 분류됩니다.'
  },
  isotretinoin: {
    inn: 'Isotretinoin',
    category: 'X',
    noteKorean:
      '중추신경계, 안면, 심혈관계 및 흉선 기형 등 심각하고 영구적인 태아 기형을 유발할 위험이 매우 높아 임신 중 절대 금기(Category X)입니다.'
  },
  acitretin: {
    inn: 'Acitretin',
    category: 'X',
    noteKorean: '중증 선천성 기형을 유발하는 레티노이드 제제로 임신 중 및 중단 후 일정 기간 절대 금기(Category X)입니다.'
  },
  finasteride: {
    inn: 'Finasteride',
    category: 'X',
    noteKorean:
      '5-알파 환원효소 억제제로 남성 태아의 외부 생식기 기형(요도하열 등)을 유발할 위험이 매우 높아 임신부 투여 및 부서진 정제 접촉 금기(Category X)입니다.'
  },
  dutasteride: {
    inn: 'Dutasteride',
    category: 'X',
    noteKorean: '5-알파 환원효소 억제제로 남성 태아 외부 생식기 발달을 저해하므로 임신부 절대 금기(Category X)입니다.'
  },
  warfarin: {
    inn: 'Warfarin',
    category: 'D',
    noteKorean: '태반을 통과하여 와파린 태아병증(코 형성부전, 점상 연골이영양증) 및 태아·신생아 출혈을 유발할 수 있어 Category D로 분류됩니다.'
  },
  misoprostol: {
    inn: 'Misoprostol',
    category: 'X',
    noteKorean: '강력한 자궁 수축 작용으로 유산, 조산, 태아 사망 및 선천성 기형(뫼비우스 증후군 등)을 유발하므로 임신 중 위궤양 예방 목적으로 절대 금기(Category X)입니다.'
  },
  methotrexate: {
    inn: 'Methotrexate',
    category: 'D',
    noteKorean: '엽산 길항제로 배아 치사 및 다발성 중증 선천성 기형을 유발하므로 TGA Category D(류마티스/건선 등 비종양 적응증은 금기)로 분류됩니다.'
  },
  pyridoxine: {
    inn: 'Pyridoxine',
    category: 'A',
    noteKorean: '비타민 B6로 일반적인 권장·치료 용량에서 TGA Category A에 해당합니다.'
  },
  'folic acid': {
    inn: 'Folic Acid',
    category: 'A',
    noteKorean: '엽산(비타민 B9)으로 태아 신경관 결손 예방을 위해 임신 전후 필수 권장되는 Category A 성분입니다.'
  },
  iron: {
    inn: 'Iron',
    category: 'A',
    noteKorean: '철분제로 임신 중 철결핍성 빈혈 예방 및 치료에 사용되는 Category A 성분입니다.'
  }
};

/**
 * 영문 성분명에서 염·수화물·에스테르 프로드러그 단어 제거
 */
function stripEngSaltWords(eng: string): string {
  const words = eng.trim().split(/\s+/).filter(Boolean);
  const saltWords = new Set([
    'proxetil', 'axetil', 'pivoxil', 'medoxomil', 'cilexetil', 'ester', 'ethyl', 'methyl',
    'hydrochloride', 'dihydrochloride', 'monohydrochloride', 'trihydrochloride', 'hcl',
    'sulfate', 'sulphate', 'bisulfate', 'hemisulfate', 'disulfate',
    'maleate', 'fumarate', 'succinate', 'tartrate', 'bitartrate', 'citrate',
    'mesylate', 'besylate', 'camsylate', 'tosylate', 'esylate', 'napadisylate', 'edisylate',
    'phosphate', 'nitrate', 'acetate', 'gluconate', 'propionate', 'dipropionate', 'valerate', 'butyrate', 'hydrobromide',
    'sodium', 'disodium', 'trisodium', 'potassium', 'calcium', 'magnesium', 'zinc', 'aluminum',
    'hydrate', 'monohydrate', 'dihydrate', 'trihydrate', 'tetrahydrate', 'pentahydrate', 'hemihydrate', 'sesquihydrate', 'anhydrous',
    'micronized', 'encapsulated'
  ]);
  while (words.length > 1) {
    const last = words[words.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (saltWords.has(last)) {
      words.pop();
    } else {
      break;
    }
  }
  return words.join(' ');
}

/**
 * 표준 INN 성분명으로 호주 TGA 임신부 약물 분류 조회
 * - 원문에 염·프로드러그(예: Cefpodoxime Proxetil)가 기재되어 있더라도 주성분(Cefpodoxime) 기준으로 자동 매칭
 */
export function lookupTgaCategoryByInn(inn: string | null | undefined): TgaPregnancyCategoryInfo | null {
  if (!inn) return null;
  const rawKey = inn.trim().toLowerCase();
  let record = TGA_PREGNANCY_DATABASE[rawKey];

  if (!record) {
    const baseKey = stripEngSaltWords(rawKey);
    if (baseKey && baseKey !== rawKey) {
      record = TGA_PREGNANCY_DATABASE[baseKey];
    }
  }

  if (!record) return null;

  const def = TGA_CATEGORY_DEFINITIONS[record.category];
  return {
    matchedInn: record.inn,
    category: record.category,
    categoryDefinitionKorean: def.koreanDescription,
    categoryDefinitionEnglish: def.englishDescription,
    ingredientNoteKorean: record.noteKorean || null,
    ingredientNoteEnglish: record.noteEnglish || null,
    routeOrFormCondition: record.routeOrFormCondition || null,
    sourceUrl: TGA_OFFICIAL_DATABASE_URL,
    updatedAt: record.updatedAt || TGA_LAST_UPDATED_DATE
  };
}

/**
 * 지시서 Section 2-③ 요구사항:
 * 공식 TGA CSV 파일 내용과 기존 로컬 데이터베이스를 비교하여 신규/변경/동일 항목을 반환하는 유틸리티
 */
export interface TgaCsvDiffResult {
  added: Array<{ inn: string; csvCategory: string; note?: string }>;
  changed: Array<{ inn: string; oldCategory: TgaPregnancyCategoryCode; newCategory: string; note?: string }>;
  unchangedCount: number;
}

export function compareTgaCsvWithLocalDb(csvContent: string): TgaCsvDiffResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const added: TgaCsvDiffResult['added'] = [];
  const changed: TgaCsvCsvChangedItem[] = [];
  let unchangedCount = 0;

  type TgaCsvCsvChangedItem = TgaCsvDiffResult['changed'][number];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 2) continue;
    const drugName = cols[0];
    const cat = cols[1].toUpperCase();
    const note = cols[2] || undefined;
    if (!drugName || !/^(A|B1|B2|B3|C|D|X)$/.test(cat)) continue;

    const normKey = drugName.toLowerCase() === 'paracetamol' ? 'acetaminophen' : drugName.toLowerCase();
    const existing = TGA_PREGNANCY_DATABASE[normKey];
    if (!existing) {
      added.push({ inn: drugName, csvCategory: cat, note });
    } else if (existing.category !== cat) {
      changed.push({
        inn: existing.inn,
        oldCategory: existing.category,
        newCategory: cat,
        note
      });
    } else {
      unchangedCount++;
    }
  }

  return { added, changed, unchangedCount };
}
