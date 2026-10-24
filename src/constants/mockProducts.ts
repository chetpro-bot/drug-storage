import { ProductItem } from '../types/product';

/**
 * 약국 현장 취급 영양제 & 일반의약품 목업 시드 데이터
 * 1. 일반의약품: 녹십자 비맥스제트정 (GC녹십자)
 * 2. 건강기능식품: 네이처스팜 마이타민업 (네이처스팜)
 * 3. 기타가공품/식품: 리퀴드씨엠키즈 (주식회사 아리너스)
 */
export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'prod_bmax_jet',
    barcode: '8806433031029',
    productName: '비맥스제트정',
    classification: 'OTC_DRUG',
    manufacturer: 'GC녹십자',
    distributor: 'GC녹십자',
    dosageForm: 'FILM_COATED_TABLET',
    packagingUnit: '120정 (60정 x 2병 / 4개월분)',
    dailyServings: 1,
    amountPerServing: 1,
    servingUnitKorean: '정',
    priceRetailKrw: 80000,
    storageLocation: '상담석 우측 2단 (고함량 비타민존)',
    inventoryCount: 32,
    tags: ['피로', '간', '관절', '면역', '뇌', '고함량활성비타민', '메코발라민1mg', 'UDCA함유'],
    isActive: true,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-10-11T14:30:00Z',
    ingredients: [
      {
        ingredientId: 'ing_ascorbic_acid_coated',
        englishInn: 'Ascorbic Acid Coated',
        functionalCategory: '비타민C',
        chemicalFormName: '제피아스코르브산 (코팅 비타민 C)',
        rawAmount: 51.15,
        unit: 'mg',
        elementalAmount: 50,
        isMainActive: false,
        standardKey: 'VITAMIN_C',
        clinicalSummary: '• 위장 자극을 줄인 제피형 비타민 C, 결합조직 형성 및 유해산소 차단',
        formattedSpecification: 'Ascorbic Acid Coated 51.15mg (Ascorbic Acid 50mg)'
      },
      {
        ingredientId: 'ing_benfotiamine',
        englishInn: 'Benfotiamine',
        functionalCategory: '비타민B1',
        chemicalFormName: '지용성 활성형 비타민 B1 (에스테르 유도체)',
        rawAmount: 100,
        unit: 'mg',
        elementalAmount: 72.3,
        isMainActive: true,
        standardKey: 'VITAMIN_B1',
        clinicalSummary: '• 수용성 티아민 대비 생체이용률 약 8배 우수, 근육 및 적혈구 내 빠른 TPP 전환\n• 탄수화물 에너지 대사 촉진 및 피로 유발 젖산 축적 억제',
        noteKorean: '생체이용률 극대화 활성형 B1 (100mg)',
        formattedSpecification: 'Benfotiamine 100mg (Thiamine HCl 72.3mg)'
      },
      {
        ingredientId: 'ing_biotin',
        englishInn: 'Biotin',
        functionalCategory: '비타민B7',
        chemicalFormName: '순수 비오틴 (비타민 B7)',
        rawAmount: 0.2,
        unit: 'mg',
        isMainActive: false,
        standardKey: 'VITAMIN_B7',
        clinicalSummary: '• 지방산 합성 및 아미노산 대사 보조, 모발 및 손발톱 케라틴 단백질 합성 지원',
        formattedSpecification: 'Biotin 0.2mg'
      },
      {
        ingredientId: 'ing_bisbentiamine',
        englishInn: 'Bisbenthiamine',
        functionalCategory: '비타민B1',
        chemicalFormName: '뇌 투과형 지용성 활성 비타민 B1 (이량체 구조)',
        rawAmount: 30,
        unit: 'mg',
        elementalAmount: 26.2,
        isMainActive: true,
        standardKey: 'VITAMIN_B1',
        clinicalSummary: '• BBB(Blood-Brain Barrier - 뇌혈관장벽) 통과율 우수, 뇌세포 내 당대사 촉진\n• 뇌 피로 회복 및 중추신경계 신경 전달 정상화 지원',
        noteKorean: '뇌혈관장벽(BBB) 투과 활성 B1 (30mg)',
        formattedSpecification: 'Bisbenthiamine 30mg (Thiamine HCl 26.2mg)'
      },
      {
        ingredientId: 'ing_calcium_pantothenate',
        englishInn: 'Calcium Pantothenate',
        functionalCategory: '비타민B5',
        chemicalFormName: '칼슘염 (비타민 B5)',
        rawAmount: 100,
        unit: 'mg',
        isMainActive: false,
        standardKey: 'VITAMIN_B5',
        clinicalSummary: '• 조효소 Coenzyme A의 핵심 전구체, 부신 피질 호르몬 합성 및 스트레스 저항력 강화',
        formattedSpecification: 'Calcium Pantothenate 100mg'
      },
      {
        ingredientId: 'ing_cholecalciferol_powder',
        englishInn: 'Cholecalciferol Concentrate Powder',
        functionalCategory: '비타민D3',
        chemicalFormName: '콜레칼시페롤농축분말 (비타민 D3)',
        rawAmount: 10,
        unit: 'mg',
        elementalAmount: 1000,
        isMainActive: false,
        standardKey: 'VITAMIN_D',
        clinicalSummary: '• 장관 내 칼슘 흡수 촉진, 골밀도 유지 및 선천 면역 세포 활성화 (1,000 IU)',
        formattedSpecification: 'Cholecalciferol Concentrate Powder 10mg (Vitamin D 1,000IU)'
      },
      {
        ingredientId: 'ing_choline_bitartrate',
        englishInn: 'Choline Bitartrate',
        functionalCategory: '기타 비타민B',
        chemicalFormName: '주석산수소콜린',
        rawAmount: 100,
        unit: 'mg',
        isMainActive: false,
        clinicalSummary: '• 아세틸콜린(Acetylcholine) 합성 전구체, 뇌 신경 전달 촉진 및 지방간 억제',
        formattedSpecification: 'Choline Bitartrate 100mg'
      },
      {
        ingredientId: 'ing_chromium_yeast',
        englishInn: 'Chromium in Dried Yeast',
        functionalCategory: '크롬(Cr)',
        chemicalFormName: '건조효모 결합형 (크롬)',
        rawAmount: 20,
        unit: 'mg',
        elementalAmount: 10,
        isMainActive: false,
        standardKey: 'CHROMIUM',
        clinicalSummary: '• GTF(내당인자) 구성 성분, 인슐린 감수성 개선 및 탄수화물/당 대사 촉진 (크롬 10ug)',
        formattedSpecification: 'Chromium in Dried Yeast 20mg (Chromium 10ug)'
      },
      {
        ingredientId: 'ing_folic_acid',
        englishInn: 'Folic Acid',
        functionalCategory: '엽산',
        chemicalFormName: '합성 엽산 (비타민 B9)',
        rawAmount: 0.5,
        unit: 'mg',
        isMainActive: false,
        standardKey: 'VITAMIN_B9',
        clinicalSummary: '• 세포 분열 및 DNA/RNA 합성 필수, 호모시스테인 농도 정상 유지',
        formattedSpecification: 'Folic Acid 0.5mg'
      },
      {
        ingredientId: 'ing_inositol',
        englishInn: 'Inositol',
        functionalCategory: '기타 비타민B',
        chemicalFormName: '미오-이노시톨 (Myo-inositol)',
        rawAmount: 100,
        unit: 'mg',
        isMainActive: false,
        clinicalSummary: '• 세포막 인지질 구성 성분, 뇌 신경 신호전달체계 조절 및 지질 대사 촉진',
        formattedSpecification: 'Inositol 100mg'
      },
      {
        ingredientId: 'ing_magnesium_oxide',
        englishInn: 'Magnesium Oxide',
        functionalCategory: '마그네슘(Mg)',
        chemicalFormName: '무기염 (산화마그네슘)',
        rawAmount: 100,
        unit: 'mg',
        elementalAmount: 60.3,
        isMainActive: false,
        standardKey: 'MAGNESIUM',
        clinicalSummary: '• 신경 자극 전달 조절 및 근육 수축/이완 정상화 작용 (순수 마그네슘 60.3mg)',
        noteKorean: '순수 마그네슘 60.3mg',
        formattedSpecification: 'Magnesium Oxide 100mg (Magnesium 60.3mg)'
      },
      {
        ingredientId: 'ing_mecobalamin',
        englishInn: 'Mecobalamin',
        functionalCategory: '비타민B12',
        chemicalFormName: '체내 직접 작용 활성형 비타민 B12 (메틸코발라민)',
        rawAmount: 1,
        unit: 'mg',
        isMainActive: true,
        standardKey: 'VITAMIN_B12',
        clinicalSummary: '• 시아노코발라민과 달리 체내 대사 변환 없이 신경초(Myelin sheath) 재생 직접 관여\n• 말초신경 장애, 손발저림, 당뇨병성 신경병증 완화 작용',
        noteKorean: '1mg 고함량 활성 B12',
        formattedSpecification: 'Mecobalamin 1mg'
      },
      {
        ingredientId: 'ing_nicotinamide',
        englishInn: 'Nicotinamide',
        functionalCategory: '비타민B3',
        chemicalFormName: '아미드형 비타민 B3 (나이아신아마이드)',
        rawAmount: 10,
        unit: 'mg',
        isMainActive: false,
        standardKey: 'VITAMIN_B3',
        clinicalSummary: '• 안면 홍조 부작용이 없는 아미드 형태, 산화환원 효소 NAD/NADP 합성',
        formattedSpecification: 'Nicotinamide 10mg'
      },
      {
        ingredientId: 'ing_pyridoxal_phosphate_hydrate',
        englishInn: 'Pyridoxal Phosphate Hydrate',
        functionalCategory: '비타민B6',
        chemicalFormName: '활성 조효소형 비타민 B6 수화물 (PLP)',
        rawAmount: 50,
        unit: 'mg',
        isMainActive: true,
        standardKey: 'VITAMIN_B6',
        clinicalSummary: '• 간 대사 없이 신경전달물질(GABA, Serotonin) 생합성에 즉각적 조효소로 작용\n• 호모시스테인(Homocysteine) 대사 정상화 및 신경 보호 작용',
        noteKorean: '활성 조효소형 비타민 B6 (50mg)',
        formattedSpecification: 'Pyridoxal Phosphate Hydrate 50mg'
      },
      {
        ingredientId: 'ing_riboflavin_butyrate',
        englishInn: 'Riboflavin Butyrate',
        functionalCategory: '비타민B2',
        chemicalFormName: '지용성 부티레이트 에스테르형 활성 비타민 B2',
        rawAmount: 50,
        unit: 'mg',
        elementalAmount: 28.7,
        isMainActive: true,
        standardKey: 'VITAMIN_B2',
        clinicalSummary: '• 수용성 B2 대비 지질 친화성이 높아 체내 체류시간이 길고 지속적 에너지 생성 지원\n• 구내염, 설염, 피부염 완화',
        noteKorean: '지속형 활성 비타민 B2 (50mg)',
        formattedSpecification: 'Riboflavin Butyrate 50mg (Riboflavin 28.7mg)'
      },
      {
        ingredientId: 'ing_selenium_yeast',
        englishInn: 'Selenium in Dried Yeast',
        functionalCategory: '셀레늄(Se)',
        chemicalFormName: '건조효모 결합형 (셀레늄)',
        rawAmount: 40.8,
        unit: 'mg',
        elementalAmount: 22,
        isMainActive: false,
        standardKey: 'SELENIUM',
        clinicalSummary: '• 글루타티온 과산화효소(GSH-Px) 조효소, 강력한 항산화 및 유해 활성산소 소거 (셀레늄 22ug)',
        formattedSpecification: 'Selenium in Dried Yeast 40.8mg (Selenium 22ug)'
      },
      {
        ingredientId: 'ing_taurine',
        englishInn: 'Taurine',
        functionalCategory: '비필수 아미노산',
        chemicalFormName: '유리 아미노산 (타우린)',
        rawAmount: 100,
        unit: 'mg',
        isMainActive: false,
        clinicalSummary: '• 삼투압 조절 및 심근 수축력 지원, 피로 물질(젖산) 대사 촉진',
        formattedSpecification: 'Taurine 100mg'
      },
      {
        ingredientId: 'ing_tocopherol_acetate',
        englishInn: 'Tocopherol Acetate Powder 50%',
        functionalCategory: '비타민E',
        chemicalFormName: '토코페롤아세테이트 2배산 (비타민 E)',
        rawAmount: 20,
        unit: 'mg',
        elementalAmount: 10,
        isMainActive: false,
        standardKey: 'VITAMIN_E',
        clinicalSummary: '• 지질 과산화 방지, 말초 혈액순환 장애 및 갱년기 수족냉증 완화',
        formattedSpecification: 'Tocopherol Acetate Powder 50% 20mg (Vitamin E 10IU)'
      },
      {
        ingredientId: 'ing_udca',
        englishInn: 'Ursodeoxycholic Acid',
        functionalCategory: '담석용해제',
        chemicalFormName: '친수성 담즙산 (UDCA: Ursodeoxycholic Acid)',
        rawAmount: 60,
        unit: 'mg',
        isMainActive: true,
        clinicalSummary: '• 간세포 보호막 형성, 담즙 분비 촉진(이담 작용) 및 해독 대사 활성화',
        noteKorean: '간기능 개선 고함량 UDCA (60mg)',
        formattedSpecification: 'Ursodeoxycholic Acid 60mg'
      },
      {
        ingredientId: 'ing_zinc_oxide',
        englishInn: 'Zinc Oxide',
        functionalCategory: '아연(Zn)',
        chemicalFormName: '무기염 (산화아연)',
        rawAmount: 30,
        unit: 'mg',
        elementalAmount: 24.1,
        isMainActive: true,
        standardKey: 'ZINC',
        clinicalSummary: '• 300종 이상 체내 효소계 필수 활성 성분, RNA/DNA 합성 및 면역 방어력 강화',
        noteKorean: '순수 아연 원소 24.1mg',
        formattedSpecification: 'Zinc Oxide 30mg (Zinc 24.1mg)'
      },
      {
        ingredientId: 'ing_gamma_oryzanol',
        englishInn: 'Gamma Oryzanol',
        functionalCategory: '자율신경제',
        chemicalFormName: '감마-오리자놀 (미강 추출 페룰산 에스테르)',
        rawAmount: 3,
        unit: 'mg',
        isMainActive: false,
        clinicalSummary: '• 자율신경계 조절, 갱년기 장애 및 자율신경 실조증 완화',
        formattedSpecification: 'Gamma Oryzanol 3mg'
      }
    ],
    otcDetail: {
      itemSeq: '202300436',
      permitDate: '2023-01-20',
      atcCode: 'A11BA',
      kpaicCode: '202300436-00',
      indicationsKorean: [
        '육체피로 · 체력 저하 시 비타민 B1, B2, B6, C, D 보급 (임신·수유기, 발육기, 노년기)',
        '신경통 · 근육통 · 관절통(요통, 어깨결림) 및 눈의 피로 · 각기 증상 완화',
        '구내염 · 구순염 · 구각염 · 설염 및 피부염 · 습진 증상 완화',
        '뼈 · 치아 발육불량 및 구루병 예방 (비타민 D)',
        '정상적인 면역 기능 및 세포 분열을 위한 아연 보급'
      ],
      dosageAndAdministrationKorean: '만 19세 이상 및 성인: 1일 1회, 1회 1정을 식후 복용',
      storageMethodKorean: '기밀용기, 실온(1~30℃) 차광보관',
      precautionsSummaryKorean: [
        '만 12개월 미만의 젖먹이: 복용 금기',
        '레보도파(Levodopa) 복용 환자는 병용 금기 (피리독신이 레보도파의 말초 대사를 촉진함)',
        '플루오로퀴놀론(Fluoroquinolone)계 항생제 병용 시 아연/마그네슘과의 킬레이션(Chelation)으로 흡수 저하가 발생하므로 2~4시간 간격 복용 필수'
      ]

    }
  },
  {
    id: 'prod_liquid_cm_kids',
    barcode: '8809043503519',
    productName: '리퀴드씨엠키즈',
    classification: 'GENERAL_FOOD',
    manufacturer: '주식회사 아리너스',
    distributor: '주식회사 아리너스',
    dosageForm: 'LIQUID_ORAL',
    packagingUnit: '20mL x 60포 (총 1,200mL / 1개월분)',
    dailyServings: 2,
    amountPerServing: 1,
    servingUnitKorean: '포(20mL)',
    priceRetailKrw: 70000,
    storageLocation: '어린이 영양제 진열대 1단',
    inventoryCount: 20,
    tags: ['어린이', '성장/어린이', '마그네슘', '칼슘', '혼합음료', '기타가공품'],
    isActive: true,
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: new Date().toISOString(),
    ingredients: [
      {
        ingredientId: 'ing_liquidcm_mg',
        englishInn: '글루콘산 마그네슘, 염화 마그네슘',
        koreanName: '글루콘산 마그네슘, 염화 마그네슘',
        functionalCategory: '마그네슘',
        chemicalFormName: '-',
        rawAmount: 35,
        unit: 'mg',
        standardKey: 'MAGNESIUM',
        isMainActive: true,
        formattedSpecification: '글루콘산 마그네슘, 염화 마그네슘 35mg',
        clinicalSummary: '• 에너지 이용에 필요, 신경과 근육 기능 유지에 필요 (복합 마그네슘 급원)',
        noteKorean: '1포당 35mg'
      },
      {
        ingredientId: 'ing_liquidcm_ca',
        englishInn: '젖산 칼슘, 황산 칼슘',
        koreanName: '젖산 칼슘, 황산 칼슘',
        functionalCategory: '칼슘',
        chemicalFormName: '-',
        rawAmount: 55,
        unit: 'mg',
        standardKey: 'CALCIUM',
        isMainActive: true,
        formattedSpecification: '젖산 칼슘, 황산 칼슘 55mg',
        clinicalSummary: '• 뼈와 치아 형성에 필요, 신경과 근육 기능 유지에 필요 (복합 칼슘 급원)',
        noteKorean: '1포당 55mg'
      }
    ],
    functionalFoodDetail: {
      reportNo: '20090435035193',
      functionalClaimsKorean: [
        '마그네슘 : 에너지 이용에 필요, 신경과 근육 기능 유지에 필요',
        '칼슘 : 뼈와 치아 형성에 필요, 신경과 근육 기능 유지에 필요'
      ],
      suggestedUseKorean: '100일 이상 ~ 6개월 이하 : 2.5mL, 1일 2회\n6개월 이상 ~ 12개월 이하 : 5mL, 1일 2회\n12개월 이상 ~ 2세 이하 : 10mL, 1일 2회 또는 20mL(1포), 1일 1회\n2세 이상 ~ 10세 이하 : 20mL(1포), 1일 2회\n10세 이상 : 40mL(2포), 1일 2회',
      safetyPrecautionsKorean: [
        '당알코올(자일리톨 9 %, D-말티톨 4 %) 함유 제품으로 과량 섭취 시 설사를 일으킬 수 있습니다.',
        '일반식품(기타가공품 등)은 질병의 예방 및 치료를 위한 의약품이나 건강기능식품이 아닙니다.'
      ],
      labelPrecautionsText: '당알코올(자일리톨 9 %, D-말티톨 4 %) 당알코올 함유 제품으로 과량 섭취 시 설사를 일으킬 수 있습니다.',
      rawMaterialsText: '정제수, 자일리톨(감미료), D-말티톨(감미료), 글루콘산마그네슘, 젖산칼슘, 사과과즙분말(사과농축액 : 국산), 시클로덱스트린액, 향료(사과향), 나한과추출농축액(중국산), DL-사과산, 염화마그네슘, 잔탄검, 무수구연산, LJG해양심층수미네랄농축액, 황산칼슘, 구연산삼나트륨, 울금추출분말(울금 : 인도네시아산), 글루콘산아연'
    },
    attachments: [
      {
        id: 'doc_liquidcm_label_01',
        fileName: '리퀴드씨엠키즈_영양기능정보_성분표.jpg',
        fileSize: 112851,
        uploadedAt: '2026-10-18T10:00:00Z',
        dataUrl: '/attachments/liquid_cm_kids_label.jpg',
        status: 'ANALYZED',
        analysisSummary: '영양성분 2건(마그네슘 35mg, 칼슘 55mg) 및 원료명 매핑 완료',
        extractedText: '1포당: 마그네슘 35mg, 칼슘 55mg\n원료명 및 함량: 정제수, 자일리톨(감미료), D-말티톨(감미료), 글루콘산마그네슘, 젖산칼슘, 사과과즙분말, 시클로덱스트린액, 향료(사과향), 나한과추출농축액, DL-사과산, 염화마그네슘, 잔탄검, 무수구연산, LJG해양심층수미네랄농축액, 황산칼슘, 구연산삼나트륨, 울금추출분말, 글루콘산아연\n※당알코올(자일리톨 9 %, D-말티톨 4 %) 당알코올 함유 제품으로 과량 섭취 시 설사를 일으킬 수 있습니다.'
      }
    ]
  }
];

