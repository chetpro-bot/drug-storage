import { EfficacyCategory, NutrientStandardKey, ProductIngredientEntry } from '../types/ingredient';
import kpicMasterData from '../constants/kpicMasterDatabase.json';

export const KPIC_MASTER_DATABASE: Record<string, string> = kpicMasterData;

/**
 * 성분명 또는 영문 INN으로부터 약학정보원(KPIC) 공식 약효분류 조회
 */
export function resolveKpicCategory(nameOrInn: string): string | null {
  if (!nameOrInn) return null;
  const cleanTk = nameOrInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  if (!cleanTk) return null;

  const normalizeCategory = (cat: string) => {
    let res = cat.replace(/^비타민([A-Za-z0-9]+)\s*제제$/, '비타민$1');
    res = res.replace(/\s*보충$/, '');
    return res;
  };

  // 0. 사용자 수정 및 학습 사전 우선 조회
  const learned = getLearnedDict();
  const rawKey = nameOrInn.trim().toLowerCase();
  if (learned[rawKey]?.functionalCategory) {
    return normalizeCategory(learned[rawKey].functionalCategory);
  }
  for (const [k, v] of Object.entries(learned)) {
    if (k.toLowerCase().replace(/[^a-z0-9가-힣]/g, '') === cleanTk && v.functionalCategory) {
      return normalizeCategory(v.functionalCategory);
    }
  }

  // 1. 완전 일치 우선 검색
  for (const [kpicIng, kpicCat] of Object.entries(KPIC_MASTER_DATABASE)) {
    const cleanKpic = kpicIng.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
    if (cleanTk === cleanKpic && kpicCat && kpicCat !== '기타') {
      return normalizeCategory(kpicCat);
    }
  }

  // 2. 부분 일치 검색
  if (cleanTk.length >= 3) {
    for (const [kpicIng, kpicCat] of Object.entries(KPIC_MASTER_DATABASE)) {
      const cleanKpic = kpicIng.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      if (cleanKpic.length >= 3 && (cleanTk.includes(cleanKpic) || cleanKpic.includes(cleanTk)) && kpicCat && kpicCat !== '기타') {
        return normalizeCategory(kpicCat);
      }
    }
  }

  return null;
}

/**
 * 한글 성분명 ➔ 영문 표준 INN(International Nonproprietary Name) 및 임상 메타데이터 사전
 */
export interface InnMappingMeta {
  englishInn: string;
  functionalCategory: EfficacyCategory; // KPIC 약효 분류
  chemicalFormName: string;
  defaultUnit: 'mg' | 'ug' | 'IU' | 'g';
  standardKey?: NutrientStandardKey;
  clinicalSummary: string;
  elementalRatio?: number; // 원소 환산비 (예: 산화아연 0.803, 글루콘산아연 0.1435)
}

const LEARNED_DICT_STORAGE_KEY = 'pharmassist_learned_inn_dict_v1';

export function getLearnedDict(): Record<string, InnMappingMeta> {
  try {
    const saved = localStorage.getItem(LEARNED_DICT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('학습 성분 사전 로드 실패:', e);
  }
  return {};
}

/**
 * 약학정보원 캡처/자료로부터 학습된 새로운 성분 및 KPIC 약효분류 영구 저장
 */
export function saveLearnedIngredientMapping(nameOrInn: string, meta: Partial<InnMappingMeta>) {
  try {
    const current = getLearnedDict();
    const cleanKey = nameOrInn.trim().toLowerCase();
    current[cleanKey] = {
      englishInn: meta.englishInn || nameOrInn,
      functionalCategory: meta.functionalCategory || '기타',
      chemicalFormName: meta.chemicalFormName || '표준 규격 원료',
      defaultUnit: meta.defaultUnit || 'mg',
      clinicalSummary: meta.clinicalSummary || `• ${nameOrInn} 약효 및 대사 조절 작용`,
      ...meta
    } as InnMappingMeta;
    localStorage.setItem(LEARNED_DICT_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('학습 성분 사전 저장 실패:', e);
  }
}

export const INN_DICTIONARY: Record<string, InnMappingMeta> = {
  // 비타민 B군
  '벤포티아민': {
    englishInn: 'Benfotiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '지용성 활성형 비타민 B1 (에스테르 유도체)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 수용성 티아민 대비 높은 생체이용률, 근육 및 신경 ATP 생성 촉진\n• 젖산 축적 억제로 만성 피로 회복 가속'
  },
  '비스벤티아민': {
    englishInn: 'Bisbentiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '뇌 투과형 지용성 활성 비타민 B1 (이량체)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• BBB(Blood-Brain Barrier - 뇌혈관장벽) 통과율 우수, 뇌세포 당대사 활성화\n• 뇌 피로 회복 및 신경 전달 조절'
  },
  '푸르설티아민': {
    englishInn: 'Fursultiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '프로설티아민 유도체 지용성 비타민 B1',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 뇌혈관장벽(BBB) 및 세포막 통과 우수, 활성형 조효소 TPP 전환\n• 신경통, 관절통 증상 완화'
  },
  '티아민질산염': {
    englishInn: 'Thiamine mononitrate',
    functionalCategory: '비타민B1',
    chemicalFormName: '질산염 (수용성 티아민)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물 에너지 대사 필수 조효소 작용'
  },
  '티아민염산염': {
    englishInn: 'Thiamine hydrochloride',
    functionalCategory: '비타민B1',
    chemicalFormName: '염산염 (수용성 티아민)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물 대사 및 식욕 개선 보조'
  },
  '리보플라빈': {
    englishInn: 'Riboflavin',
    functionalCategory: '비타민B2',
    chemicalFormName: '순수 리보플라빈 (비타민 B2)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 미토콘드리아 FMN/FAD 조효소 전구체, 체내 에너지 생성 및 점막 보호'
  },
  '리보플라빈포스페이트나트륨': {
    englishInn: "Riboflavin 5'-phosphate sodium",
    functionalCategory: '비타민B2',
    chemicalFormName: '수용성 활성 에스테르염 (인산나트륨 형태)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 용해도 우수한 활성형 B2, 점막 세포 재생 및 에너지 대사'
  },
  '니코틴산아미드': {
    englishInn: 'Nicotinamide',
    functionalCategory: '비타민B3',
    chemicalFormName: '아미드형 (비타민 B3)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 안면 홍조(Flushing) 위험 없는 아미드 형태, 산화환원 반응 NAD 조효소 합성'
  },
  '판토텐산칼슘': {
    englishInn: 'Calcium pantothenate',
    functionalCategory: '비타민B5',
    chemicalFormName: '칼슘염 (비타민 B5)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B5',
    clinicalSummary: '• 조효소 Coenzyme A 구성 성분, 지방산 대사 및 부신피질 호르몬 합성 지원'
  },
  '칼슘판토테네이트': {
    englishInn: 'Calcium pantothenate',
    functionalCategory: '비타민B5',
    chemicalFormName: '칼슘염 (비타민 B5)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B5',
    clinicalSummary: '• 조효소 Coenzyme A 구성 성분, 지방산 대사 및 부신피질 호르몬 합성 지원'
  },
  '피리독신염산염': {
    englishInn: 'Pyridoxine hydrochloride',
    functionalCategory: '비타민B6',
    chemicalFormName: '염산염 (비타민 B6)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 아미노산 대사 및 신경전달물질(GABA, Serotonin) 합성 보조'
  },
  '피리독살포스페이트': {
    englishInn: "Pyridoxal 5'-phosphate",
    functionalCategory: '비타민B6',
    chemicalFormName: '활성 조효소형 비타민 B6 (PLP)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 간 대사 불필요한 즉각적 활성 조효소형, 호모시스테인 대사 정상화'
  },
  '메코발라민': {
    englishInn: 'Mecobalamin',
    functionalCategory: '비타민B12',
    chemicalFormName: '체내 직접 작용 활성 비타민 B12 (메틸코발라민)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 신경초(Myelin sheath) 재생 직접 관여, 말초신경 장애 및 손발저림 완화'
  },
  '시아노코발라민': {
    englishInn: 'Cyanocobalamin',
    functionalCategory: '비타민B12',
    chemicalFormName: '합성형 비타민 B12',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 엽산 대사 조효소 작용, 정상 적혈구 생성 및 거대적혈모구빈혈 예방'
  },
  '폴산': {
    englishInn: 'Folic acid',
    functionalCategory: '엽산',
    chemicalFormName: '합성 엽산 (비타민 B9)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B9',
    clinicalSummary: '• 세포 분열 및 DNA 합성 필수, 태아 신경관 정상 발달'
  },
  '비오틴': {
    englishInn: 'Biotin',
    functionalCategory: '비타민B7',
    chemicalFormName: '순수 비오틴 (비타민 B7)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B7',
    clinicalSummary: '• 탄수화물, 단백질, 지방 대사 조효소, 케라틴 단백질 구조 강화'
  },

  // 미네랄
  '산화아연': {
    englishInn: 'Zinc oxide',
    functionalCategory: '아연(Zn)',
    chemicalFormName: '무기염 (산화아연)',
    defaultUnit: 'mg',
    standardKey: 'ZINC',
    elementalRatio: 0.803,
    clinicalSummary: '• DNA/RNA 합성 및 T림프구 분화 촉진, 면역 방어력 강화'
  },
  '글루콘산아연': {
    englishInn: 'Zinc gluconate',
    functionalCategory: '아연(Zn)',
    chemicalFormName: '유기산염 (글루콘산아연)',
    defaultUnit: 'mg',
    standardKey: 'ZINC',
    elementalRatio: 0.1435,
    clinicalSummary: '• 위산 의존도 낮은 유기염으로 위장관 자극(GI Distress) 최소화 및 높은 생체이용률'
  },
  '산화마그네슘': {
    englishInn: 'Magnesium oxide',
    functionalCategory: '마그네슘(Mg)',
    chemicalFormName: '무기염 (산화마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    elementalRatio: 0.603,
    clinicalSummary: '• 신경 자극 전달 조절 및 근육 수축·이완 정상화, 세포 내 ATP 결합 안정화'
  },
  '글리세로인산마그네슘': {
    englishInn: 'Magnesium glycerophosphate',
    functionalCategory: '마그네슘(Mg)',
    chemicalFormName: '유기 유도체염 (글리세로인산마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    elementalRatio: 0.125,
    clinicalSummary: '• 설사 유발 위험이 적고 생체흡수율이 뛰어난 유기염 마그네슘'
  },
  '탄산칼슘': {
    englishInn: 'Calcium carbonate',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '무기염 (탄산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    elementalRatio: 0.40,
    clinicalSummary: '• 뼈와 치아 형성의 주요 원소, 혈액 응고 및 신경 자극 전달'
  },
  '구연산칼슘': {
    englishInn: 'Calcium citrate',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '유기산염 (구연산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    elementalRatio: 0.21,
    clinicalSummary: '• 위산 저하증 환자나 공복 복용 시에도 흡수가 우수한 유기염 칼슘'
  },
  '푸마르산제일철': {
    englishInn: 'Ferrous fumarate',
    functionalCategory: '제1철 (Ferrous)',
    chemicalFormName: '유기산 2가 철 (푸마르산염)',
    defaultUnit: 'mg',
    standardKey: 'IRON',
    elementalRatio: 0.33,
    clinicalSummary: '• 헤모글로빈 구성 성분으로 체내 산소 운반 및 혈액 생성'
  },

  '콜린타르타르산염': {
    englishInn: 'Choline bitartrate',
    functionalCategory: '기타 비타민B',
    chemicalFormName: '주석산염 (콜린염)',
    defaultUnit: 'mg',
    clinicalSummary: '• 신경전달물질 아세틸콜린(Acetylcholine) 합성 전구체, 뇌 신경 신호 전달 촉진'
  },
  '이노시톨': {
    englishInn: 'Inositol',
    functionalCategory: '기타 비타민B',
    chemicalFormName: '미오-이노시톨 (Myo-inositol)',
    defaultUnit: 'mg',
    clinicalSummary: '• 세포막 인지질 구성 성분, 뇌세포 2차 신호전달계(IP3) 조절 및 신경 보호'
  },
  '리보플라빈부티레이트': {
    englishInn: 'Riboflavin butyrate',
    functionalCategory: '비타민B2',
    chemicalFormName: '지용성 부티레이트 에스테르형 활성 비타민 B2',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 수용성 B2 대비 지질 친화성이 높아 체내 체류시간이 길고 지속적 에너지 생성 지원'
  },
  '피리독살포스페이트수화물': {
    englishInn: "Pyridoxal phosphate hydrate",
    functionalCategory: '비타민B6',
    chemicalFormName: '활성 조효소형 비타민 B6 수화물 (PLP)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 간 대사 불필요한 즉각적 활성 조효소형, 호모시스테인 대사 정상화 및 신경전달물질 합성'
  },
  '농축콜레칼시페롤': {
    englishInn: 'Cholecalciferol concentrated',
    functionalCategory: '비타민D3',
    chemicalFormName: '농축 천연 비타민 D3 유도체',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 소장 내 칼슘 흡수 촉진, 골밀도 유지 및 선천 면역 세포 조절'
  },
  '셀레늄함유건조효모': {
    englishInn: 'Selenium in dried yeast',
    functionalCategory: '셀레늄(Se)',
    chemicalFormName: '유기 셀레늄 (건조효모 결합형)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    clinicalSummary: '• 글루타티온 과산화효소(GSH-Px) 핵심 조효소, 유해 활성산소 강력 소거'
  },
  '토코페롤아세테이트': {
    englishInn: 'Tocopherol acetate',
    functionalCategory: '비타민E',
    chemicalFormName: '합성 비타민 E 에스테르',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 세포막 지질 과산화 방지, 말초 혈액순환 개선'
  },
  '우르소데옥시콜산': {
    englishInn: 'Ursodeoxycholic acid',
    functionalCategory: '담석용해제',
    chemicalFormName: '친수성 담즙산 (UDCA: Ursodeoxycholic Acid)',
    defaultUnit: 'mg',
    clinicalSummary: '• 간세포 보호막 형성, 담즙 분비 촉진(이담 작용) 및 해독 대사 활성화'
  },

  '콜레칼시페롤': {
    englishInn: 'Cholecalciferol',
    functionalCategory: '비타민D3',
    chemicalFormName: '천연 비타민 D3 유도체',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 소장 내 칼슘 흡수 촉진, 뼈 건강 유지 및 선천 면역 세포 조절'
  },

  '아스코르브산': {
    englishInn: 'Ascorbic acid',
    functionalCategory: '비타민C',
    chemicalFormName: '순수 L-아스코르브산 (비타민 C)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 결합조직 형성 및 콜라겐 합성 필수 조효소, 유해 활성산소 소거'
  },
  'L-아르기닌': {
    englishInn: 'L-Arginine',
    functionalCategory: '간보호제',
    chemicalFormName: '유리 L-아르기닌',
    defaultUnit: 'mg',
    clinicalSummary: '• 산화질소(NO) 생성 전구체, 혈관 확장 및 대사 활력 지원'
  },
  '타우린': {
    englishInn: 'Taurine',
    functionalCategory: '비필수 아미노산제제',
    chemicalFormName: '유리 아미노산',
    defaultUnit: 'mg',
    clinicalSummary: '• 담즙산 결합 및 삼투압 조절, 심근 수축력 및 근육 피로 완화'
  },
  '제피아스코르브산': {
    englishInn: 'Ascorbic acid coated',
    functionalCategory: '비타민C',
    chemicalFormName: '코팅 제피 비타민 C (아스코르브산)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 산화 방지 및 위장 자극 경감 코팅 비타민 C, 결합조직 형성 및 항산화 작용'
  },
  '콜레칼시페롤농축분말': {
    englishInn: 'Cholecalciferol concentrate powder',
    functionalCategory: '비타민D3',
    chemicalFormName: '농축 분말형 비타민 D3',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 장관 내 칼슘 흡수 촉진 및 골밀도 유지, 면역 세포 수용체 활성화'
  },
  '토코페롤아세테이트2배산': {
    englishInn: 'Tocopherol acetate 50%',
    functionalCategory: '비타민E',
    chemicalFormName: '비타민 E 아세테이트 2배산',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 말초 혈관 순환 촉진, 세포막 불포화지방산 산화 억제'
  },
  '감마-오리자놀': {
    englishInn: 'Gamma-oryzanol',
    functionalCategory: '자율신경제',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  '감마오리자놀': {
    englishInn: 'Gamma-oryzanol',
    functionalCategory: '자율신경제',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  '크롬함유건조효모': {
    englishInn: 'Chromium in dried yeast',
    functionalCategory: '크롬(Cr)',
    chemicalFormName: '유기 크롬 (건조효모 결합형)',
    defaultUnit: 'mg',
    standardKey: 'CHROMIUM',
    clinicalSummary: '• GTF(Glucose Tolerance Factor) 인슐린 보조인자, 혈당 대사 및 당뇨 예방 보조'
  },
  '유비데카레논': {
    englishInn: 'Ubidecarenone',
    functionalCategory: '기타 심부전 치료제',
    chemicalFormName: '코엔자임 Q10 (CoQ10)',
    defaultUnit: 'mg',
    clinicalSummary: '• 미토콘드리아 전자전달계 ATP 생성 촉진, 강력한 항산화 및 심혈관 기능 보호'
  },
  'DL-메티오닌': {
    englishInn: 'DL-Methionine',
    functionalCategory: '간보호제',
    chemicalFormName: '함황 필수 아미노산',
    defaultUnit: 'mg',
    clinicalSummary: '• 글루타티온 합성 전구체, 간 지방 축적 억제(지방간 예방) 및 간 해독 지원'
  },
  '오로트산수화물': {
    englishInn: 'Orotic acid hydrate',
    functionalCategory: '기타 간장 약물',
    chemicalFormName: '오로트산 수화물 (비타민 B13)',
    defaultUnit: 'mg',
    clinicalSummary: '• 피리미딘 염기 및 핵산 합성 조효소, 간세포 재생 촉진'
  },
  '베타카로틴': {
    englishInn: 'Beta-carotene',
    functionalCategory: '비타민A',
    chemicalFormName: '천연 프로비타민 A 카로티노이드',
    defaultUnit: 'mg',
    clinicalSummary: '• 체내 필요 시 비타민 A로 전환, 시각 기능 및 피부·점막 세포 재생\n• 유해 활성산소 소거 및 항산화 작용'
  },
  '베타카로틴20%': {
    englishInn: 'Beta-carotene 20%',
    functionalCategory: '비타민A',
    chemicalFormName: '천연 프로비타민 A 카로티노이드',
    defaultUnit: 'mg',
    clinicalSummary: '• 체내 필요 시 비타민 A로 전환, 시각 기능 및 피부·점막 세포 재생\n• 유해 활성산소 소거 및 항산화 작용'
  },

  // 소화효소 및 위장관 제제 (KPIC 약효분류 표준 적용)
  '판크레아틴장용과립': {
    englishInn: 'Pancreatin enteric granules',
    functionalCategory: '소화효소제',
    chemicalFormName: '장용 코팅 복합 소화효소제 (판크레아틴)',
    defaultUnit: 'mg',
    clinicalSummary: '• 췌장 유래 복합 효소(아밀라아제, 트립신, 리파아제), 장내 탄·단·지 소화 촉진'
  },
  '판크레아틴': {
    englishInn: 'Pancreatin',
    functionalCategory: '소화효소제',
    chemicalFormName: '복합 췌장 소화효소제',
    defaultUnit: 'mg',
    clinicalSummary: '• 탄수화물, 단백질, 지방 복합 분해 소화 효소 작용'
  },
  '디아스타제·프로테아제·셀룰라제': {
    englishInn: 'Diastase · Protease · Cellulase',
    functionalCategory: '소화효소제',
    chemicalFormName: '복합 다당류·단백질 분해 소화효소',
    defaultUnit: 'mg',
    clinicalSummary: '• 위 내에서 탄수화물, 섬유소 및 단백질 1차 분해 촉진'
  },
  '판프로신': {
    englishInn: 'Panprosin',
    functionalCategory: '소화효소제',
    chemicalFormName: '단백질 분해 효소',
    defaultUnit: 'mg',
    clinicalSummary: '• 단백질의 펩톤 분해 촉진, 소화 촉진'
  },
  '판셀라제': {
    englishInn: 'Pancellase',
    functionalCategory: '소화효소제',
    chemicalFormName: '섬유소 분해 효소 복합체',
    defaultUnit: 'mg',
    clinicalSummary: '• 채소류 섬유질 세포벽 분해, 위장 팽만감 완화'
  },
  '리파제': {
    englishInn: 'Lipase',
    functionalCategory: '소화효소제',
    chemicalFormName: '지방 분해 효소',
    defaultUnit: 'mg',
    clinicalSummary: '• 고지방식 섭취 시 중성지방 분해 및 소화 불량 완화'
  },
  '시메티콘': {
    englishInn: 'Simethicone',
    functionalCategory: '장내 가스 제거제',
    chemicalFormName: '가스 제거제 (디메티콘-실리카 복합체)',
    defaultUnit: 'mg',
    clinicalSummary: '• 위장관 내 기포 표면장력 저하로 가스 제거, 복부 팽만감 및 트림 완화'
  },
  '브로멜라인': {
    englishInn: 'Bromelain',
    functionalCategory: '소염효소',
    chemicalFormName: '파인애플 유래 식물성 단백분해효소',
    defaultUnit: 'mg',
    clinicalSummary: '• 단백질 소화 촉진 및 염증성 부종 완화'
  },
  '크리아제-PEG': {
    englishInn: 'Crease-PEG',
    functionalCategory: '소화효소제',
    chemicalFormName: '복합 소화효소 제제',
    defaultUnit: 'mg',
    clinicalSummary: '• 전분, 단백, 지방 분해 촉진 소화 효소'
  },
  '디아스타제·프로테아제100': {
    englishInn: 'Diastase · Protease 100',
    functionalCategory: '소화효소제',
    chemicalFormName: '전분 및 단백질 분해 소화효소',
    defaultUnit: 'mg',
    clinicalSummary: '• 탄수화물 및 단백질 소화 분해 촉진'
  },

  // 해열진통소염제
  '아세트아미노펜': {
    englishInn: 'Acetaminophen',
    functionalCategory: 'p-aminophenol 유도체',
    chemicalFormName: '해열진통제 (아세트아미노펜)',
    defaultUnit: 'mg',
    clinicalSummary: '• 중추 신경계 COX 억제, 두통·발열·근육통 완화 (위장장애 최소화)'
  },
  '이부프로펜': {
    englishInn: 'Ibuprofen',
    functionalCategory: 'Propionic acids',
    chemicalFormName: '비프로피온산계 NSAID 소염진통제',
    defaultUnit: 'mg',
    clinicalSummary: '• 말초 COX-1/COX-2 억제, 염증·통증·발열 완화'
  },

  // 건강기능식품 및 일반식품 다빈도 기능성 원료 (식품안전나라 I0030 / C003 / I1250 호환)
  '비타민B1염산염': {
    englishInn: 'Thiamine hydrochloride',
    functionalCategory: '비타민B1',
    chemicalFormName: '염산염 (수용성 비타민 B1)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물과 에너지 대사에 필요, 피로 물질 축적 완화'
  },
  '비타민 B1염산염': {
    englishInn: 'Thiamine hydrochloride',
    functionalCategory: '비타민B1',
    chemicalFormName: '염산염 (수용성 비타민 B1)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물과 에너지 대사에 필요, 피로 물질 축적 완화'
  },
  '비타민B1질산염': {
    englishInn: 'Thiamine mononitrate',
    functionalCategory: '비타민B1',
    chemicalFormName: '질산염 (수용성 비타민 B1)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물과 에너지 대사에 필요'
  },
  '비타민B1': {
    englishInn: 'Thiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '비타민 B1 (티아민)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물과 에너지 대사에 필요'
  },
  '비타민 B1': {
    englishInn: 'Thiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '비타민 B1 (티아민)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    clinicalSummary: '• 탄수화물과 에너지 대사에 필요'
  },
  '비타민B2': {
    englishInn: 'Riboflavin',
    functionalCategory: '비타민B2',
    chemicalFormName: '비타민 B2 (리보플라빈)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 체내 에너지 생성에 필요, 구내염 및 점막 보호'
  },
  '비타민 B2': {
    englishInn: 'Riboflavin',
    functionalCategory: '비타민B2',
    chemicalFormName: '비타민 B2 (리보플라빈)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 체내 에너지 생성에 필요, 구내염 및 점막 보호'
  },
  '나이아신': {
    englishInn: 'Nicotinamide',
    functionalCategory: '비타민B3',
    chemicalFormName: '나이아신 (니코틴산아미드)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 체내 에너지 생성 및 NAD/NADP 산화환원 조효소 작용'
  },
  '판토텐산': {
    englishInn: 'Calcium pantothenate',
    functionalCategory: '비타민B5',
    chemicalFormName: '판토텐산 (비타민 B5)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B5',
    clinicalSummary: '• 지방, 탄수화물, 단백질 대사와 에너지 생성에 필요'
  },
  '비타민B6염산염': {
    englishInn: 'Pyridoxine hydrochloride',
    functionalCategory: '비타민B6',
    chemicalFormName: '염산염 (비타민 B6)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 단백질 및 아미노산 이용에 필요, 혈액의 호모시스테인 수준을 정상으로 유지'
  },
  '비타민 B6 염산염': {
    englishInn: 'Pyridoxine hydrochloride',
    functionalCategory: '비타민B6',
    chemicalFormName: '염산염 (비타민 B6)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 단백질 및 아미노산 이용에 필요, 혈액의 호모시스테인 수준을 정상으로 유지'
  },
  '비타민B6': {
    englishInn: 'Pyridoxine',
    functionalCategory: '비타민B6',
    chemicalFormName: '비타민 B6 (피리독신)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 단백질 및 아미노산 이용에 필요, 혈액의 호모시스테인 수준을 정상으로 유지'
  },
  '비타민 B6': {
    englishInn: 'Pyridoxine',
    functionalCategory: '비타민B6',
    chemicalFormName: '비타민 B6 (피리독신)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    clinicalSummary: '• 단백질 및 아미노산 이용에 필요, 혈액의 호모시스테인 수준을 정상으로 유지'
  },
  '비타민B12': {
    englishInn: 'Cyanocobalamin',
    functionalCategory: '비타민B12',
    chemicalFormName: '비타민 B12 (코발라민)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 정상적인 엽산 대사에 필요, 신경 기능 유지'
  },
  '비타민 B12': {
    englishInn: 'Cyanocobalamin',
    functionalCategory: '비타민B12',
    chemicalFormName: '비타민 B12 (코발라민)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 정상적인 엽산 대사에 필요, 신경 기능 유지'
  },
  '엽산': {
    englishInn: 'Folic acid',
    functionalCategory: '엽산',
    chemicalFormName: '엽산 (비타민 B9)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B9',
    clinicalSummary: '• 세포와 혈액 생성에 필요, 태아 신경관의 정상 발달에 필요'
  },
  '비타민A': {
    englishInn: 'Retinol',
    functionalCategory: '비타민A',
    chemicalFormName: '비타민 A (레티놀/혼합제제)',
    defaultUnit: 'ug',
    clinicalSummary: '• 어두운 곳에서 시각 적응을 위해 필요, 피부와 점막을 형성하고 기능을 유지'
  },
  '비타민 A': {
    englishInn: 'Retinol',
    functionalCategory: '비타민A',
    chemicalFormName: '비타민 A (레티놀/혼합제제)',
    defaultUnit: 'ug',
    clinicalSummary: '• 어두운 곳에서 시각 적응을 위해 필요, 피부와 점막을 형성하고 기능을 유지'
  },
  '비타민C': {
    englishInn: 'Ascorbic acid',
    functionalCategory: '비타민C',
    chemicalFormName: '비타민 C (L-아스코르브산)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 결합조직 형성과 기능유지에 필요, 철의 흡수 및 항산화 작용'
  },
  '비타민 C': {
    englishInn: 'Ascorbic acid',
    functionalCategory: '비타민C',
    chemicalFormName: '비타민 C (L-아스코르브산)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 결합조직 형성과 기능유지에 필요, 철의 흡수 및 항산화 작용'
  },
  '비타민D3': {
    englishInn: 'Cholecalciferol',
    functionalCategory: '비타민D3',
    chemicalFormName: '활성 비타민 D3 (콜레칼시페롤)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 칼슘과 인이 흡수되고 이용되는데 필요, 뼈의 형성과 유지 및 골다공증 발생 위험 감소'
  },
  '비타민D': {
    englishInn: 'Cholecalciferol',
    functionalCategory: '비타민D3',
    chemicalFormName: '비타민 D (콜레칼시페롤)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 칼슘과 인이 흡수되고 이용되는데 필요, 뼈의 형성과 유지'
  },
  'd-α-토코페롤': {
    englishInn: 'd-alpha-Tocopherol',
    functionalCategory: '비타민E',
    chemicalFormName: '천연형 비타민 E (d-α-토코페롤)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 생체이용률이 높은 천연형 비타민 E, 유해산소로부터 세포막 보호'
  },
  '비타민E': {
    englishInn: 'Tocopherol',
    functionalCategory: '비타민E',
    chemicalFormName: '비타민 E (토코페롤)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요'
  },
  '아셀렌산나트륨': {
    englishInn: 'Sodium selenite',
    functionalCategory: '셀레늄(Se)',
    chemicalFormName: '무기염 셀레늄 (아셀렌산나트륨)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    clinicalSummary: '• 글루타티온 과산화효소 활성화, 유해산소로부터 세포를 보호'
  },
  '건조효모(셀렌함유)': {
    englishInn: 'Selenium in dried yeast',
    functionalCategory: '셀레늄(Se)',
    chemicalFormName: '유기 셀레늄 (건조효모 결합형)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    clinicalSummary: '• 생체이용률이 우수한 효모 유래 유기 셀레늄, 항산화 세포 보호'
  },
  '셀레늄': {
    englishInn: 'Selenium',
    functionalCategory: '셀레늄(Se)',
    chemicalFormName: '셀레늄 (미량 미네랄)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    clinicalSummary: '• 유해산소로부터 세포를 보호하는데 필요'
  },
  '셀렌': {
    englishInn: 'Selenium',
    functionalCategory: '셀레늄(Se)',
    chemicalFormName: '셀렌 (미량 미네랄)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    clinicalSummary: '• 유해산소로부터 세포를 보호하는데 필요'
  },
  '아연': {
    englishInn: 'Zinc',
    functionalCategory: '아연(Zn)',
    chemicalFormName: '아연 (정상 면역·세포분열 미네랄)',
    defaultUnit: 'mg',
    standardKey: 'ZINC',
    clinicalSummary: '• 정상적인 면역기능에 필요, 정상적인 세포분열에 필요'
  },
  '글루콘산마그네슘': {
    englishInn: 'Magnesium gluconate',
    functionalCategory: '마그네슘(Mg)',
    chemicalFormName: '유기산염 (글루콘산마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    clinicalSummary: '• 흡수율이 높고 위장 자극이 적은 유기염 마그네슘, 신경·근육 기능 유지'
  },
  '마그네슘': {
    englishInn: 'Magnesium',
    functionalCategory: '마그네슘(Mg)',
    chemicalFormName: '마그네슘',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    clinicalSummary: '• 에너지 이용에 필요, 신경과 근육 기능 유지에 필요'
  },
  '해조칼슘': {
    englishInn: 'Seaweed calcium',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '식물성 다공질 해조칼슘',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    clinicalSummary: '• 소화 흡수가 용이한 식물성 해조류 유래 칼슘, 뼈와 치아 형성'
  },
  '젖산칼슘': {
    englishInn: 'Calcium lactate',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '유기산염 (젖산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    clinicalSummary: '• 용해도와 흡수율이 우수한 유기염 칼슘'
  },
  '칼슘': {
    englishInn: 'Calcium',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '칼슘',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    clinicalSummary: '• 뼈와 치아 형성에 필요, 신경과 근육 기능 유지 및 정상 혈액응고'
  },
  '철': {
    englishInn: 'Iron',
    functionalCategory: '제1철 (Ferrous)',
    chemicalFormName: '철분 (체내 산소운반 미네랄)',
    defaultUnit: 'mg',
    standardKey: 'IRON',
    clinicalSummary: '• 체내 산소운반과 혈액생성에 필요, 에너지 생성에 필요'
  },
  '밀크씨슬': {
    englishInn: 'Silymarin (Milk thistle extract)',
    functionalCategory: '간보호제',
    chemicalFormName: '밀크씨슬(카르두스 마리아누스) 추출물 (실리마린)',
    defaultUnit: 'mg',
    clinicalSummary: '• 간세포막 안정화 및 글루타티온 생성 증가, 간 건강에 도움을 줄 수 있음'
  },
  '실리마린': {
    englishInn: 'Silymarin (Milk thistle extract)',
    functionalCategory: '간보호제',
    chemicalFormName: '밀크씨슬 추출물 지표성분 (실리마린)',
    defaultUnit: 'mg',
    clinicalSummary: '• 간세포 항산화 보호 및 재생 촉진, 간 건강에 도움을 줄 수 있음'
  },
  '루테인': {
    englishInn: 'Lutein (Marigold flower extract)',
    functionalCategory: '기타 안과용제',
    chemicalFormName: '마리골드꽃추출물 (루테인)',
    defaultUnit: 'mg',
    clinicalSummary: '• 노화로 인해 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움을 줄 수 있음'
  },
  '마리골드꽃추출물': {
    englishInn: 'Lutein (Marigold flower extract)',
    functionalCategory: '기타 안과용제',
    chemicalFormName: '마리골드꽃추출물 (루테인)',
    defaultUnit: 'mg',
    clinicalSummary: '• 황반색소밀도 유지 및 청색광(블루라이트) 산화 손상 방어'
  },
  'EPA+DHA': {
    englishInn: 'Omega-3 (EPA + DHA)',
    functionalCategory: 'Omega-3 (어유)',
    chemicalFormName: 'EPA 및 DHA 함유 유지 (정제어유)',
    defaultUnit: 'mg',
    clinicalSummary: '• 혈중 중성지질 개선·혈행 개선·건조한 눈을 개선하여 눈 건강에 도움을 줄 수 있음'
  },
  'EPA 및 DHA': {
    englishInn: 'Omega-3 (EPA + DHA)',
    functionalCategory: 'Omega-3 (어유)',
    chemicalFormName: 'EPA 및 DHA 함유 유지 (정제어유)',
    defaultUnit: 'mg',
    clinicalSummary: '• 혈중 중성지질 개선·혈행 개선·건조한 눈 개선'
  },
  '정제어유': {
    englishInn: 'Omega-3 (EPA + DHA)',
    functionalCategory: 'Omega-3 (어유)',
    chemicalFormName: '정제어유 (오메가-3 지방산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 혈중 중성지질 개선 및 혈행 개선'
  },
  '프로바이오틱스': {
    englishInn: 'Probiotics',
    functionalCategory: '정장제 (생균제제)',
    chemicalFormName: '복합 유산균 (Probiotics)',
    defaultUnit: 'mg',
    clinicalSummary: '• 유산균 증식 및 유해균 억제·배변활동 원활·장 건강에 도움을 줄 수 있음'
  },
  '유산균': {
    englishInn: 'Probiotics',
    functionalCategory: '정장제 (생균제제)',
    chemicalFormName: '프로바이오틱스 생균',
    defaultUnit: 'mg',
    clinicalSummary: '• 장내 미생물 균총 정상화 및 장 점막 면역 지원'
  },
  '홍삼': {
    englishInn: 'Red ginseng extract (Ginsenosides)',
    functionalCategory: '자양강장',
    chemicalFormName: '홍삼농축액 (진세노사이드 Rg1+Rb1+Rg3)',
    defaultUnit: 'mg',
    clinicalSummary: '• 면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화'
  },
  '진세노사이드': {
    englishInn: 'Red ginseng extract (Ginsenosides)',
    functionalCategory: '자양강장',
    chemicalFormName: '홍삼 지표성분 (진세노사이드)',
    defaultUnit: 'mg',
    clinicalSummary: '• 면역력 증진·피로개선·혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음'
  },
  '코엔자임Q10': {
    englishInn: 'Ubidecarenone (Coenzyme Q10)',
    functionalCategory: '기타 심부전 치료제',
    chemicalFormName: '코엔자임 Q10 (유비데카레논)',
    defaultUnit: 'mg',
    clinicalSummary: '• 항산화 작용 및 높은 혈압 감소에 도움을 줄 수 있음, 미토콘드리아 ATP 생성'
  },
  'L-테아닌': {
    englishInn: 'L-Theanine',
    functionalCategory: '자율신경제',
    chemicalFormName: '녹차 유래 아미노산 (L-테아닌)',
    defaultUnit: 'mg',
    clinicalSummary: '• 뇌 알파(α)파 발생 증가, 스트레스로 인한 긴장 완화에 도움을 줄 수 있음'
  },
  'L-아르지닌': {
    englishInn: 'L-Arginine',
    functionalCategory: '간보호제',
    chemicalFormName: '유리 L-아르기닌 (아미노산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 산화질소(NO) 생성 전구체, 혈관 확장 및 에너지 대사 활력 지원'
  },
  '글루타치온': {
    englishInn: 'Glutathione',
    functionalCategory: '간보호제',
    chemicalFormName: '환원형 글루타티온 (효모추출물)',
    defaultUnit: 'mg',
    clinicalSummary: '• 간 해독 2상 결합 반응 조효소 및 세포 내 항산화 환원 작용'
  },
  '엠에스엠': {
    englishInn: 'Methylsulfonylmethane (MSM)',
    functionalCategory: '기타 근골격계 약물',
    chemicalFormName: '식이유황 (MSM)',
    defaultUnit: 'mg',
    clinicalSummary: '• 관절 및 연골 결합조직 구성 성분, 관절 및 연골 건강에 도움을 줄 수 있음'
  },
  'MSM': {
    englishInn: 'Methylsulfonylmethane (MSM)',
    functionalCategory: '기타 근골격계 약물',
    chemicalFormName: '식이유황 (MSM)',
    defaultUnit: 'mg',
    clinicalSummary: '• 관절 및 연골 건강에 도움을 줄 수 있음'
  },
  '쏘팔메토': {
    englishInn: 'Saw palmetto extract (Lauric acid)',
    functionalCategory: '전립선비대증 치료제',
    chemicalFormName: '쏘팔메토열매추출물 (로르산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 남성 전립선 건강의 유지에 도움을 줄 수 있음'
  },
  '로르산': {
    englishInn: 'Saw palmetto extract (Lauric acid)',
    functionalCategory: '전립선비대증 치료제',
    chemicalFormName: '쏘팔메토열매추출물 지표성분 (로르산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 5-알파 환원효소 조절, 전립선 건강 유지에 도움을 줄 수 있음'
  },
  '은행잎추출물': {
    englishInn: 'Ginkgo biloba leaf extract',
    functionalCategory: '말초혈관 확장제',
    chemicalFormName: '은행잎추출물 (플라보놀배당체)',
    defaultUnit: 'mg',
    clinicalSummary: '• 기억력 개선 및 혈행 개선에 도움을 줄 수 있음'
  },
  '바나바잎추출물': {
    englishInn: 'Banaba leaf extract (Corosolic acid)',
    functionalCategory: '혈당조절',
    chemicalFormName: '바나바잎추출물 (코로솔산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 식후 혈당 상승 억제에 도움을 줄 수 있음'
  },
  '코로솔산': {
    englishInn: 'Banaba leaf extract (Corosolic acid)',
    functionalCategory: '혈당조절',
    chemicalFormName: '바나바잎추출물 지표성분 (코로솔산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 포도당 세포 내 수송 촉진, 식후 혈당 상승 억제'
  },
  '차전자피식이섬유': {
    englishInn: 'Psyllium husk fiber',
    functionalCategory: '팽창성 하제',
    chemicalFormName: '차전자피 식이섬유',
    defaultUnit: 'g',
    clinicalSummary: '• 혈중 콜레스테롤 개선·배변활동 원활에 도움을 줄 수 있음'
  },
  '난소화성말토덱스트린': {
    englishInn: 'Indigestible maltodextrin',
    functionalCategory: '혈당조절',
    chemicalFormName: '수용성 식이섬유 (난소화성말토덱스트린)',
    defaultUnit: 'g',
    clinicalSummary: '• 식후 혈당 상승 억제·혈중 중성지질 개선·배변활동 원활'
  },
  '비타민K1': {
    englishInn: 'Phytomenadione (Vitamin K1)',
    functionalCategory: '비타민K',
    chemicalFormName: '비타민 K1 (피토메나디온)',
    defaultUnit: 'ug',
    clinicalSummary: '• 정상적인 혈액응고에 필요, 뼈의 구성에 필요'
  },
  '비타민K': {
    englishInn: 'Vitamin K',
    functionalCategory: '비타민K',
    chemicalFormName: '비타민 K',
    defaultUnit: 'ug',
    clinicalSummary: '• 정상적인 혈액응고에 필요, 뼈의 구성에 필요'
  },
  '글루콘산동': {
    englishInn: 'Copper gluconate',
    functionalCategory: '동(Cu)',
    chemicalFormName: '유기산염 (글루콘산동)',
    defaultUnit: 'mg',
    clinicalSummary: '• 철의 운반과 이용에 필요, 유해산소로부터 세포를 보호하는데 필요'
  },
  '구리': {
    englishInn: 'Copper',
    functionalCategory: '동(Cu)',
    chemicalFormName: '구리 (미량 미네랄)',
    defaultUnit: 'mg',
    clinicalSummary: '• 철의 운반과 이용에 필요, 유해산소로부터 세포를 보호하는데 필요'
  },
  '황산망간': {
    englishInn: 'Manganese sulfate',
    functionalCategory: '망간(Mn)',
    chemicalFormName: '무기염 (황산망간)',
    defaultUnit: 'mg',
    clinicalSummary: '• 뼈 형성에 필요, 에너지 이용 및 유해산소로부터 세포를 보호'
  },
  '망간': {
    englishInn: 'Manganese',
    functionalCategory: '망간(Mn)',
    chemicalFormName: '망간 (미량 미네랄)',
    defaultUnit: 'mg',
    clinicalSummary: '• 뼈 형성에 필요, 에너지 이용에 필요, 유해산소로부터 세포를 보호하는데 필요'
  },
  '몰리브덴': {
    englishInn: 'Molybdenum',
    functionalCategory: '기타 미네랄',
    chemicalFormName: '몰리브덴 (산화·환원 효소 보조인자)',
    defaultUnit: 'ug',
    clinicalSummary: '• 산화·환원 효소의 활성에 필요'
  },
  '크롬': {
    englishInn: 'Chromium',
    functionalCategory: '크롬(Cr)',
    chemicalFormName: '크롬 (미량 미네랄)',
    defaultUnit: 'mg',
    standardKey: 'CHROMIUM',
    clinicalSummary: '• 체내 탄수화물, 지방, 단백질 대사에 관여'
  }
};

/**
 * 약학정보원 한글/영문 혼합 원문을 영문 표준 간결 형식으로 변환
 * 예: "Ascorbic Acid Coated  제피아스코르브산  51.15mg (아스코르브산(으)로서 50mg)"
 *  --> "Ascorbic Acid Coated 51.15mg (Ascorbic Acid 50mg)"
 * 예: "Cholecalciferol Concentrate Powder  콜레칼시페롤농축분말  10mg (비타민D(으)로서 1,000IU)"
 *  --> "Cholecalciferol Concentrate Powder 10mg (Vitamin D 1,000IU)"
 * 예: "γ-Oryzanol  γ-오리자놀  3mg"
 *  --> "Gamma Oryzanol 3mg"
 */
export function formatKpaicSpecification(rawItem: string): string {
  if (!rawItem) return '';
  let str = rawItem.trim();

  // 1. 특수 문자 치환 (γ- -> Gamma )
  str = str.replace(/γ\s*[-－]?\s*oryzanol/gi, 'Gamma Oryzanol');
  str = str.replace(/γ\s*[-－]?\s*오리자놀/gi, 'Gamma Oryzanol');

  // 2. 괄호 환산 성분 영문화 맵
  const elementalNameMap: Record<string, string> = {
    '아스코르브산': 'Ascorbic Acid',
    '티아민염산염': 'Thiamine HCl',
    '티아민': 'Thiamine',
    '리보플라빈': 'Riboflavin',
    '피리독신': 'Pyridoxine',
    '시아노코발라민': 'Cyanocobalamin',
    '메코발라민': 'Mecobalamin',
    '비타민D': 'Vitamin D',
    '비타민 d': 'Vitamin D',
    '비타민E': 'Vitamin E',
    '비타민 e': 'Vitamin E',
    '아연': 'Zinc',
    '마그네슘': 'Magnesium',
    '칼슘': 'Calcium',
    '셀레늄': 'Selenium',
    '크롬': 'Chromium',
    '철': 'Iron'
  };

  // 3. 괄호 부분 "(아스코르브산(으)로서 50mg)" 처리
  let bracketFormatted = '';
  const bracketMatch = str.match(/\(([^)]+?)(?:\(으\))?로서\s*([0-9\.,]+)\s*([a-zA-Z가-힣㎍μµ]+)?\)/);
  if (bracketMatch) {
    const rawTargetName = bracketMatch[1].trim();
    const amountVal = bracketMatch[2].trim();
    let unitVal = (bracketMatch[3] || '').trim();
    if (unitVal === '㎍' || unitVal === 'μg' || unitVal === 'µg') unitVal = 'ug';

    let englishTargetName = elementalNameMap[rawTargetName];
    if (!englishTargetName) {
      for (const [k, v] of Object.entries(elementalNameMap)) {
        if (rawTargetName.includes(k)) {
          englishTargetName = v;
          break;
        }
      }
    }
    englishTargetName = englishTargetName || rawTargetName;
    bracketFormatted = ` (${englishTargetName} ${amountVal}${unitVal})`;

    // 본문에서 괄호 제거
    str = str.replace(/\([^)]*로서[^)]*\)/g, '').trim();
  }

  // 4. 본문에서 함량 분리 (예: "51.15mg", "10mg", "3mg")
  const amountMatch = str.match(/([0-9\.,]+)\s*(mg|ug|㎍|μg|µg|IU|g|밀리그램|마이크로그램)?$/i);
  let mainAmount = '';
  if (amountMatch) {
    let u = amountMatch[2] || 'mg';
    if (u === '㎍' || u === 'μg' || u === 'µg') u = 'ug';
    mainAmount = `${amountMatch[1]}${u}`;
    str = str.substring(0, amountMatch.index).trim();
  }

  // 5. 한글 이름 제거하고 영문 이름만 추출
  // 영문명이 앞에 있는 경우: "Ascorbic Acid Coated  제피아스코르브산" -> "Ascorbic Acid Coated"
  const engPrefixMatch = str.match(/^([A-Za-z0-9\s\-\'\,\%\.\/]+?)(?:\s+[가-힣]+.*)?$/);
  let mainEngName = '';
  if (engPrefixMatch && engPrefixMatch[1].trim()) {
    mainEngName = engPrefixMatch[1].trim();
  } else {
    // 영문이 없고 한글만 있는 경우 사전을 통해 영문 INN 매핑
    let matchedDict: string | null = null;
    for (const [k, meta] of Object.entries(INN_DICTIONARY)) {
      if (str.includes(k)) {
        matchedDict = meta.englishInn;
        break;
      }
    }
    mainEngName = matchedDict || str;
  }

  // 6. 최종 결합: "Ascorbic Acid Coated 51.15mg (Ascorbic Acid 50mg)"
  const finalSpec = `${mainEngName}${mainAmount ? ' ' + mainAmount : ''}${bracketFormatted}`.trim();
  return finalSpec;
}

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
    // 영문 표준 간결 형식 성분표 규격 생성
    const formattedSpecification = formatKpaicSpecification(item);

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

    // 사전에서 매핑되는 영문 INN 찾기 (학습 사전 + 기본 사전 부분 일치 검사)
    const learnedDict = getLearnedDict();
    const combinedDict: Record<string, InnMappingMeta> = { ...INN_DICTIONARY, ...learnedDict };

    let matchedKey: string | null = null;
    const lookupKey = (detectedInn || nameRaw).toLowerCase();
    const sortedDictKeys = Object.keys(combinedDict).sort((a, b) => b.length - a.length);

    for (const dictKey of sortedDictKeys) {
      const cleanDictKey = dictKey.toLowerCase();
      if (lookupKey.includes(cleanDictKey) || cleanDictKey.includes(lookupKey) || nameRaw.includes(dictKey) || dictKey.includes(nameRaw)) {
        matchedKey = dictKey;
        break;
      }
    }

    // 1. KPIC 약학정보원 마스터 데이터베이스에서 공식 약효분류 조회 (정확도 우선순위 검색)
    let kpicCategory: string | undefined = undefined;
    const testKeys = [detectedInn, nameRaw, lookupKey].filter(Boolean);
    // 1-1. 완전 일치 우선 검색
    for (const tk of testKeys) {
      const cleanTk = tk.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      for (const [kpicIng, kpicCat] of Object.entries(KPIC_MASTER_DATABASE)) {
        const cleanKpicIng = kpicIng.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        if (cleanTk === cleanKpicIng && kpicCat && kpicCat !== '기타') {
          kpicCategory = kpicCat;
          break;
        }
      }
      if (kpicCategory) break;
    }
    // 1-2. 부분 일치 검색
    if (!kpicCategory) {
      for (const tk of testKeys) {
        const cleanTk = tk.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        if (cleanTk.length < 3) continue;
        for (const [kpicIng, kpicCat] of Object.entries(KPIC_MASTER_DATABASE)) {
          const cleanKpicIng = kpicIng.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          if (cleanKpicIng.length < 3) continue;
          if ((cleanTk.includes(cleanKpicIng) || cleanKpicIng.includes(cleanTk)) && kpicCat && kpicCat !== '기타') {
            kpicCategory = kpicCat;
            break;
          }
        }
        if (kpicCategory) break;
      }
    }

    if (matchedKey) {
      const meta = combinedDict[matchedKey];
      const finalElemental = elementalAmount ?? (meta.elementalRatio ? +(amount * meta.elementalRatio).toFixed(2) : undefined);

      results.push({
        ingredientId: `ing_auto_${Date.now()}_${index}`,
        englishInn: detectedInn || meta.englishInn,
        functionalCategory: kpicCategory || meta.functionalCategory,
        chemicalFormName: meta.chemicalFormName,
        rawAmount: amount || 10,
        unit: (unit || meta.defaultUnit) as 'mg' | 'ug' | 'IU' | 'g',
        elementalAmount: finalElemental,
        // 주요(Main Active) 기준: 첫 번째 처방 주성분이거나, 단위가 mg일 때 투입량이 30mg 이상인 고함량 성분
        isMainActive: index === 0 || (unit === 'mg' && amount >= 30),
        standardKey: meta.standardKey,
        clinicalSummary: meta.clinicalSummary,
        noteKorean: undefined,
        formattedSpecification
      });
    } else {
      // 미등록 성분: 한글 단어 영문 매핑 재검색 시도 후 기본 영문 INN 추정
      let fallbackInn = detectedInn || nameRaw;
      if (/^[가-힣]/.test(fallbackInn)) {
        for (const [k, meta] of Object.entries(INN_DICTIONARY)) {
          if (fallbackInn.includes(k) || k.includes(fallbackInn)) {
            fallbackInn = meta.englishInn;
            break;
          }
        }
      }

      results.push({
        ingredientId: `ing_auto_${Date.now()}_${index}`,
        englishInn: fallbackInn,
        functionalCategory: kpicCategory || '기타',
        chemicalFormName: '표준 정제 원료',
        rawAmount: amount || 10,
        unit,
        elementalAmount,
        isMainActive: index === 0 || (unit === 'mg' && amount >= 30),
        clinicalSummary: `• ${nameRaw} 활성 성분 영양 및 생리 활성 지원`,
        noteKorean: undefined,
        formattedSpecification
      });
    }
  });

  return results;
}

