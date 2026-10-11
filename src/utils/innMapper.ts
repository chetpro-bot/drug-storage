import { FunctionalCategory, NutrientStandardKey, ProductIngredientEntry } from '../types/ingredient';

/**
 * 한글 성분명 ➔ 영문 표준 INN(International Nonproprietary Name) 및 임상 메타데이터 사전
 */
export interface InnMappingMeta {
  englishInn: string;
  functionalCategory: FunctionalCategory;
  chemicalFormName: string;
  defaultUnit: 'mg' | 'ug' | 'IU' | 'g';
  standardKey?: NutrientStandardKey;
  clinicalSummary: string;
  elementalRatio?: number; // 원소 환산비 (예: 산화아연 0.803, 글루콘산아연 0.1435)
}

export const INN_DICTIONARY: Record<string, InnMappingMeta> = {
  // 비타민 B군
  '벤포티아민': {
    englishInn: 'Benfotiamine',
    functionalCategory: '에너지 대사',
    chemicalFormName: '지용성 활성형 비타민 B1 (에스테르 유도체)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 수용성 티아민 대비 높은 생체이용률, 근육 및 신경 ATP 생성 촉진\n• 젖산 축적 억제로 만성 피로 회복 가속'
  },
  '비스벤티아민': {
    englishInn: 'Bisbentiamine',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '뇌 투과형 지용성 활성 비타민 B1 (이량체)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• BBB(Blood-Brain Barrier - 뇌혈관장벽) 통과율 우수, 뇌세포 당대사 활성화\n• 뇌 피로 회복 및 신경 전달 조절'
  },
  '푸르설티아민': {
    englishInn: 'Fursultiamine',
    functionalCategory: '에너지 대사',
    chemicalFormName: '프로설티아민 유도체 지용성 비타민 B1',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 뇌혈관장벽(BBB) 및 세포막 통과 우수, 활성형 조효소 TPP 전환\n• 신경통, 관절통 증상 완화'
  },
  '티아민질산염': {
    englishInn: 'Thiamine mononitrate',
    functionalCategory: '에너지 대사',
    chemicalFormName: '질산염 (수용성 티아민)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물 에너지 대사 필수 조효소 작용'
  },
  '티아민염산염': {
    englishInn: 'Thiamine hydrochloride',
    functionalCategory: '에너지 대사',
    chemicalFormName: '염산염 (수용성 티아민)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물 대사 및 식욕 개선 보조'
  },
  '리보플라빈': {
    englishInn: 'Riboflavin',
    functionalCategory: '에너지 대사',
    chemicalFormName: '순수 리보플라빈 (비타민 B2)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 미토콘드리아 FMN/FAD 조효소 전구체, 체내 에너지 생성 및 점막 보호'
  },
  '리보플라빈포스페이트나트륨': {
    englishInn: "Riboflavin 5'-phosphate sodium",
    functionalCategory: '에너지 대사',
    chemicalFormName: '수용성 활성 에스테르염 (인산나트륨 형태)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 용해도 우수한 활성형 B2, 점막 세포 재생 및 에너지 대사'
  },
  '니코틴산아미드': {
    englishInn: 'Nicotinamide',
    functionalCategory: '에너지 대사',
    chemicalFormName: '아미드형 (비타민 B3)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 안면 홍조(Flushing) 위험 없는 아미드 형태, 산화환원 반응 NAD 조효소 합성'
  },
  '판토텐산칼슘': {
    englishInn: 'Calcium pantothenate',
    functionalCategory: '에너지 대사',
    chemicalFormName: '칼슘염 (비타민 B5)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B5',
    clinicalSummary: '• 조효소 Coenzyme A 구성 성분, 지방산 대사 및 부신피질 호르몬 합성 지원'
  },
  '피리독신염산염': {
    englishInn: 'Pyridoxine hydrochloride',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '염산염 (비타민 B6)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 아미노산 대사 및 신경전달물질(GABA, Serotonin) 합성 보조'
  },
  '피리독살포스페이트': {
    englishInn: "Pyridoxal 5'-phosphate",
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '활성 조효소형 비타민 B6 (PLP)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 간 대사 불필요한 즉각적 활성 조효소형, 호모시스테인 대사 정상화'
  },
  '메코발라민': {
    englishInn: 'Mecobalamin',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '체내 직접 작용 활성 비타민 B12 (메틸코발라민)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 신경초(Myelin sheath) 재생 직접 관여, 말초신경 장애 및 손발저림 완화'
  },
  '시아노코발라민': {
    englishInn: 'Cyanocobalamin',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '합성형 비타민 B12',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 엽산 대사 조효소 작용, 정상 적혈구 생성 및 거대적혈모구빈혈 예방'
  },
  '폴산': {
    englishInn: 'Folic acid',
    functionalCategory: '면역/세포분열',
    chemicalFormName: '합성 엽산 (비타민 B9)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B9',
    clinicalSummary: '• 세포 분열 및 DNA 합성 필수, 태아 신경관 정상 발달'
  },
  '비오틴': {
    englishInn: 'Biotin',
    functionalCategory: '에너지 대사',
    chemicalFormName: '순수 비오틴 (비타민 B7)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B7',
    clinicalSummary: '• 탄수화물, 단백질, 지방 대사 조효소, 케라틴 단백질 구조 강화'
  },

  // 미네랄
  '산화아연': {
    englishInn: 'Zinc oxide',
    functionalCategory: '면역/세포분열',
    chemicalFormName: '무기염 (산화아연)',
    defaultUnit: 'mg',
    standardKey: 'ZINC',
    elementalRatio: 0.803,
    clinicalSummary: '• DNA/RNA 합성 및 T림프구 분화 촉진, 면역 방어력 강화'
  },
  '글루콘산아연': {
    englishInn: 'Zinc gluconate',
    functionalCategory: '면역/세포분열',
    chemicalFormName: '유기산염 (글루콘산아연)',
    defaultUnit: 'mg',
    standardKey: 'ZINC',
    elementalRatio: 0.1435,
    clinicalSummary: '• 위산 의존도 낮은 유기염으로 위장관 자극(GI Distress) 최소화 및 높은 생체이용률'
  },
  '산화마그네슘': {
    englishInn: 'Magnesium oxide',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '무기염 (산화마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    elementalRatio: 0.603,
    clinicalSummary: '• 신경 자극 전달 조절 및 근육 수축·이완 정상화, 세포 내 ATP 결합 안정화'
  },
  '글리세로인산마그네슘': {
    englishInn: 'Magnesium glycerophosphate',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '유기 유도체염 (글리세로인산마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    elementalRatio: 0.125,
    clinicalSummary: '• 설사 유발 위험이 적고 생체흡수율이 뛰어난 유기염 마그네슘'
  },
  '탄산칼슘': {
    englishInn: 'Calcium carbonate',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '무기염 (탄산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    elementalRatio: 0.40,
    clinicalSummary: '• 뼈와 치아 형성의 주요 원소, 혈액 응고 및 신경 자극 전달'
  },
  '구연산칼슘': {
    englishInn: 'Calcium citrate',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '유기산염 (구연산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    elementalRatio: 0.21,
    clinicalSummary: '• 위산 저하증 환자나 공복 복용 시에도 흡수가 우수한 유기염 칼슘'
  },
  '푸마르산제일철': {
    englishInn: 'Ferrous fumarate',
    functionalCategory: '항산화/혈행',
    chemicalFormName: '유기산 2가 철 (푸마르산염)',
    defaultUnit: 'mg',
    standardKey: 'IRON',
    elementalRatio: 0.33,
    clinicalSummary: '• 헤모글로빈 구성 성분으로 체내 산소 운반 및 혈액 생성'
  },

  '콜린타르타르산염': {
    englishInn: 'Choline bitartrate',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '주석산염 (콜린염)',
    defaultUnit: 'mg',
    clinicalSummary: '• 신경전달물질 아세틸콜린(Acetylcholine) 합성 전구체, 뇌 신경 신호 전달 촉진'
  },
  '이노시톨': {
    englishInn: 'Inositol',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '미오-이노시톨 (Myo-inositol)',
    defaultUnit: 'mg',
    clinicalSummary: '• 세포막 인지질 구성 성분, 뇌세포 2차 신호전달계(IP3) 조절 및 신경 보호'
  },
  '리보플라빈부티레이트': {
    englishInn: 'Riboflavin butyrate',
    functionalCategory: '에너지 대사',
    chemicalFormName: '지용성 부티레이트 에스테르형 활성 비타민 B2',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 수용성 B2 대비 지질 친화성이 높아 체내 체류시간이 길고 지속적 에너지 생성 지원'
  },
  '피리독살포스페이트수화물': {
    englishInn: "Pyridoxal phosphate hydrate",
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '활성 조효소형 비타민 B6 수화물 (PLP)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 간 대사 불필요한 즉각적 활성 조효소형, 호모시스테인 대사 정상화 및 신경전달물질 합성'
  },
  '농축콜레칼시페롤': {
    englishInn: 'Cholecalciferol concentrated',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '농축 천연 비타민 D3 유도체',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 소장 내 칼슘 흡수 촉진, 골밀도 유지 및 선천 면역 세포 조절'
  },
  '셀레늄함유건조효모': {
    englishInn: 'Selenium in dried yeast',
    functionalCategory: '항산화/혈행',
    chemicalFormName: '유기 셀레늄 (건조효모 결합형)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    clinicalSummary: '• 글루타티온 과산화효소(GSH-Px) 핵심 조효소, 유해 활성산소 강력 소거'
  },
  '토코페롤아세테이트': {
    englishInn: 'Tocopherol acetate',
    functionalCategory: '항산화/혈행',
    chemicalFormName: '합성 비타민 E 에스테르',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 세포막 지질 과산화 방지, 말초 혈액순환 개선'
  },
  '우르소데옥시콜산': {
    englishInn: 'Ursodeoxycholic acid',
    functionalCategory: '간기능/해독',
    chemicalFormName: '친수성 담즙산 (UDCA: Ursodeoxycholic Acid)',
    defaultUnit: 'mg',
    clinicalSummary: '• 간세포 보호막 형성, 담즙 분비 촉진(이담 작용) 및 해독 대사 활성화'
  },

  '콜레칼시페롤': {
    englishInn: 'Cholecalciferol',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '천연 비타민 D3 유도체',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 소장 내 칼슘 흡수 촉진, 뼈 건강 유지 및 선천 면역 세포 조절'
  },

  '아스코르브산': {
    englishInn: 'Ascorbic acid',
    functionalCategory: '항산화/혈행',
    chemicalFormName: '순수 L-아스코르브산 (비타민 C)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 결합조직 형성 및 콜라겐 합성 필수 조효소, 유해 활성산소 소거'
  },
  'L-아르기닌': {
    englishInn: 'L-Arginine',
    functionalCategory: '아미노산/단백질 합성',
    chemicalFormName: '유리 L-아르기닌',
    defaultUnit: 'mg',
    clinicalSummary: '• 산화질소(NO) 생성 전구체, 혈관 확장 및 대사 활력 지원'
  },
  '타우린': {
    englishInn: 'Taurine',
    functionalCategory: '에너지 대사',
    chemicalFormName: '유리 아미노산',
    defaultUnit: 'mg',
    clinicalSummary: '• 담즙산 결합 및 삼투압 조절, 심근 수축력 및 근육 피로 완화'
  },
  '제피아스코르브산': {
    englishInn: 'Ascorbic acid coated',
    functionalCategory: '항산화/혈행',
    chemicalFormName: '코팅 제피 비타민 C (아스코르브산)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 산화 방지 및 위장 자극 경감 코팅 비타민 C, 결합조직 형성 및 항산화 작용'
  },
  '콜레칼시페롤농축분말': {
    englishInn: 'Cholecalciferol concentrate powder',
    functionalCategory: '골격/관절/치아',
    chemicalFormName: '농축 분말형 비타민 D3',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 장관 내 칼슘 흡수 촉진 및 골밀도 유지, 면역 세포 수용체 활성화'
  },
  '토코페롤아세테이트2배산': {
    englishInn: 'Tocopherol acetate 50%',
    functionalCategory: '항산화/혈행',
    chemicalFormName: '비타민 E 아세테이트 2배산',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 말초 혈관 순환 촉진, 세포막 불포화지방산 산화 억제'
  },
  '감마-오리자놀': {
    englishInn: 'Gamma-oryzanol',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  '감마오리자놀': {
    englishInn: 'Gamma-oryzanol',
    functionalCategory: '신경계/인지 기능',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  '크롬함유건조효모': {
    englishInn: 'Chromium in dried yeast',
    functionalCategory: '에너지 대사',
    chemicalFormName: '유기 크롬 (건조효모 결합형)',
    defaultUnit: 'mg',
    standardKey: 'CHROMIUM',
    clinicalSummary: '• GTF(Glucose Tolerance Factor) 인슐린 보조인자, 혈당 대사 및 당뇨 예방 보조'
  }
};

/**
 * 식약처 의약품 및 식품안전나라 원재료 텍스트를 파싱하여 ProductIngredientEntry 배열로 정규화
 */
export function parseRawIngredientString(rawText: string): ProductIngredientEntry[] {
  if (!rawText || !rawText.trim()) return [];

  const results: ProductIngredientEntry[] = [];
  // 쉼표, 세미콜론, 줄바꿈 단위로 항목 분리
  const rawItems = rawText.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);

  // 성분명 및 수치/단위 추출 정규식
  // 예: "벤포티아민 100mg", "산화아연(KP) 30mg", "시아노코발라민1000배산 500㎍"
  const regex = /([가-힣A-Za-z0-9\s\(\)·\-\'\_]+?)\s*[:：]?\s*([0-9\.]+)\s*(mg|ug|㎍|IU|g|밀리그램|마이크로그램)?/i;

  rawItems.forEach((item, index) => {
    // 1. 원소 환산량 괄호 추출 (예: "(아연(으)로서 15mg)", "(마그네슘(으)로서 60.3mg)", "(셀레늄(으)로서 25μg)")
    let elementalAmount: number | undefined = undefined;
    const elementalMatch = item.match(/\([가-힣A-Za-z0-9\s]+로서\s*([0-9\.]+)\s*(mg|ug|㎍|IU|g)?\)/i);
    if (elementalMatch) {
      elementalAmount = parseFloat(elementalMatch[1]);
    }

    // 괄호 부분 제외한 본문
    const cleanItem = item.replace(/\([^\)]*로서[^\)]*\)/gi, '').trim();

    // 2. 수치 및 단위 추출 (예: "100mg", "0.5mg", "46.29mg")
    const match = cleanItem.match(regex);
    let nameRaw = cleanItem;
    let amount = 0;
    let unit: 'mg' | 'ug' | 'IU' | 'g' = 'mg';

    if (match) {
      nameRaw = match[1].replace(/\(KP\)|\(별규\)|\(USP\)|\(EP\)|\(KHP\)/gi, '').trim();
      amount = parseFloat(match[2]) || 0;
      const matchedUnit = (match[3] || 'mg').toLowerCase();
      if (matchedUnit === 'ug' || matchedUnit === '㎍' || matchedUnit === '마이크로그램') {
        unit = 'ug';
      } else if (matchedUnit === 'iu') {
        unit = 'IU';
      } else if (matchedUnit === 'g') {
        unit = 'g';
      } else {
        unit = 'mg';
      }
    }

    // 약학정보원 포맷의 경우: "Benfotiamine 벤포티아민" 처럼 영문과 한글이 병기되어 있을 수 있음
    // 영문명과 한글명 분리 감지
    let detectedInn = '';
    const engKorMatch = nameRaw.match(/^([A-Za-z0-9\s\-\'\,\%]+)\s+([가-힣0-9\s\(\)·\-]+)$/);
    if (engKorMatch) {
      detectedInn = engKorMatch[1].trim();
      nameRaw = engKorMatch[2].trim();
    }

    // 사전에서 매핑되는 영문 INN 찾기 (부분 일치 검사)
    let matchedKey: string | null = null;
    for (const dictKey of Object.keys(INN_DICTIONARY)) {
      if (nameRaw.includes(dictKey) || dictKey.includes(nameRaw)) {
        matchedKey = dictKey;
        break;
      }
    }

    if (matchedKey) {
      const meta = INN_DICTIONARY[matchedKey];
      const finalElemental = elementalAmount ?? (meta.elementalRatio ? +(amount * meta.elementalRatio).toFixed(2) : undefined);

      results.push({
        ingredientId: `ing_auto_${Date.now()}_${index}`,
        englishInn: detectedInn || meta.englishInn,
        functionalCategory: meta.functionalCategory,
        chemicalFormName: meta.chemicalFormName,
        rawAmount: amount || 10,
        unit: (unit || meta.defaultUnit) as 'mg' | 'ug' | 'IU' | 'g',
        elementalAmount: finalElemental,
        isMainActive: index === 0 || amount >= 30,
        standardKey: meta.standardKey,
        clinicalSummary: meta.clinicalSummary,
        noteKorean: `약학정보원·의약품안전나라 표준 공시 (${nameRaw})`
      });
    } else {
      // 미등록 성분: 기본 English INN 추정 및 범용 메타데이터 생성
      results.push({
        ingredientId: `ing_auto_${Date.now()}_${index}`,
        englishInn: detectedInn || nameRaw,
        functionalCategory: '에너지 대사',
        chemicalFormName: '표준 정제 원료',
        rawAmount: amount || 10,
        unit,
        elementalAmount,
        isMainActive: false,
        clinicalSummary: `• ${nameRaw} 활성 성분 영양 및 생리 활성 지원`,
        noteKorean: `약학정보원/의약품안전나라: ${item}`
      });
    }
  });

  return results;
}

