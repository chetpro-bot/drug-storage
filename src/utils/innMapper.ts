import { EfficacyCategory, NutrientStandardKey, ProductIngredientEntry } from '../types/ingredient';
import kpicMasterData from '../constants/kpicMasterDatabase.json';
import { KDRI_2025_ADULT_STANDARDS } from '../constants/kdri2025';
import { normalizeCategory } from './categoryColors';

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
  elementalRatio?: number; // 원소/유효성분 환산비 (예: 벤포티아민 0.7231, 산화아연 0.803)
  elementalTargetLabel?: string; // 환산 기준 성분 표기 (예: '티아민염산염으로서', '리보플라빈으로서', '마그네슘으로서')
  elementalUnit?: 'mg' | 'ug' | 'IU' | 'g'; // 환산 단위가 다른 경우 (예: 콜레칼시페롤농축분말 10mg -> 1,000IU)
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
    chemicalFormName: '지용성 S-아실 티아민 유도체 (활성형 비타민 B1)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    elementalRatio: 0.723,
    elementalTargetLabel: '티아민염산염으로서',
    clinicalSummary: '• 수용성 티아민 대비 높은 생체이용률, 근육 및 신경 ATP 생성 촉진\n• 젖산 축적 억제로 만성 피로 회복 가속'
  },
  '비스벤티아민': {
    englishInn: 'Bisbentiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '지용성 다이설파이드 티아민 이량체 (활성형 비타민 B1)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    elementalRatio: 0.875,
    elementalTargetLabel: '티아민염산염으로서',
    clinicalSummary: '• BBB(Blood-Brain Barrier - 뇌혈관장벽) 통과율 우수, 뇌세포 당대사 활성화\n• 뇌 피로 회복 및 신경 전달 조절'
  },
  '푸르설티아민': {
    englishInn: 'Fursultiamine',
    functionalCategory: '비타민B1',
    chemicalFormName: '지용성 다이설파이드 티아민 유도체 (활성형 비타민 B1)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B1',
    elementalRatio: 0.8463,
    elementalTargetLabel: '티아민염산염으로서',
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
    chemicalFormName: '수용성 리보플라빈 (비타민 B2)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    clinicalSummary: '• 미토콘드리아 FMN/FAD 조효소 전구체, 체내 에너지 생성 및 점막 보호'
  },
  '리보플라빈포스페이트나트륨': {
    englishInn: "Riboflavin 5'-phosphate sodium",
    functionalCategory: '비타민B2',
    chemicalFormName: '활성 조효소형(FMN) 인산나트륨염 (비타민 B2)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    elementalRatio: 0.787,
    elementalTargetLabel: '리보플라빈으로서',
    clinicalSummary: '• 용해도 우수한 활성형 B2, 점막 세포 재생 및 에너지 대사'
  },
  '니코틴산아미드': {
    englishInn: 'Nicotinamide',
    functionalCategory: '비타민B3',
    chemicalFormName: '아미드형 (니코틴산아미드)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 안면 홍조(Flushing) 위험 없는 아미드 형태, 산화환원 반응 NAD 조효소 합성\n• 2025 KDRIs 성인 상한섭취량(UL): 850mg NE/일 (니코틴산아미드 기준)'
  },
  '니코틴아미드': {
    englishInn: 'Nicotinamide',
    functionalCategory: '비타민B3',
    chemicalFormName: '아미드형 (니코틴산아미드)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 안면 홍조(Flushing) 위험 없는 아미드 형태, 산화환원 반응 NAD 조효소 합성\n• 2025 KDRIs 성인 상한섭취량(UL): 850mg NE/일 (니코틴산아미드 기준)'
  },
  '니코틴산': {
    englishInn: 'Nicotinic acid',
    functionalCategory: '비타민B3',
    chemicalFormName: '산(Acid)형 (니코틴산)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• NAD/NADP 산화환원 조효소 합성 및 지질 대사 관여\n• 2025 KDRIs 성인 상한섭취량(UL): 35mg NE/일 (초과 시 안면홍조/Flushing 유발 주의)'
  },
  '판토텐산칼슘': {
    englishInn: 'Calcium pantothenate',
    functionalCategory: '비타민B5',
    chemicalFormName: '칼슘염 (비타민 B5)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B5',
    elementalRatio: 0.9201,
    elementalTargetLabel: '판토텐산으로서',
    clinicalSummary: '• 조효소 Coenzyme A 구성 성분, 지방산 대사 및 부신피질 호르몬 합성 지원'
  },
  '칼슘판토테네이트': {
    englishInn: 'Calcium pantothenate',
    functionalCategory: '비타민B5',
    chemicalFormName: '칼슘염 (비타민 B5)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B5',
    elementalRatio: 0.9201,
    elementalTargetLabel: '판토텐산으로서',
    clinicalSummary: '• 조효소 Coenzyme A 구성 성분, 지방산 대사 및 부신피질 호르몬 합성 지원'
  },
  '피리독신염산염': {
    englishInn: 'Pyridoxine hydrochloride',
    functionalCategory: '비타민B6',
    chemicalFormName: '염산염 (수용성 비타민 B6)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    elementalRatio: 0.8227,
    elementalTargetLabel: '피리독신으로서',
    clinicalSummary: '• 아미노산 대사 및 신경전달물질(GABA, Serotonin) 합성 보조'
  },
  '피리독살포스페이트': {
    englishInn: "Pyridoxal 5'-phosphate",
    functionalCategory: '비타민B6',
    chemicalFormName: '활성 조효소형 비타민 B6 (PLP)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    elementalRatio: 0.638,
    elementalTargetLabel: '피리독신으로서',
    clinicalSummary: '• 간 대사 불필요한 즉각적 활성 조효소형, 호모시스테인 대사 정상화'
  },
  '메코발라민': {
    englishInn: 'Mecobalamin',
    functionalCategory: '비타민B12',
    chemicalFormName: '활성 조효소형 비타민 B12 (메틸코발라민)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 신경초(Myelin sheath) 재생 직접 관여, 말초신경 장애 및 손발저림 완화'
  },
  '시아노코발라민': {
    englishInn: 'Cyanocobalamin',
    functionalCategory: '비타민B12',
    chemicalFormName: '시아노코발라민 (비타민 B12)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B12',
    clinicalSummary: '• 엽산 대사 조효소 작용, 정상 적혈구 생성 및 거대적혈모구빈혈 예방'
  },
  '폴산': {
    englishInn: 'Folic acid',
    functionalCategory: '비타민B9(엽산)',
    chemicalFormName: '모노글루타메이트형 엽산 (비타민 B9)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B9',
    clinicalSummary: '• 세포 분열 및 DNA 합성 필수, 태아 신경관 정상 발달'
  },
  '비오틴': {
    englishInn: 'Biotin',
    functionalCategory: '비타민B7',
    chemicalFormName: 'D-비오틴 (비타민 B7)',
    defaultUnit: 'ug',
    standardKey: 'VITAMIN_B7',
    clinicalSummary: '• 탄수화물, 단백질, 지방 대사 조효소, 케라틴 단백질 구조 강화'
  },
  'D-비오틴': {
    englishInn: 'D-Biotin',
    functionalCategory: '비타민B7',
    chemicalFormName: 'D-비오틴 (비타민 B7)',
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
    elementalRatio: 0.8034,
    elementalTargetLabel: '아연으로서',
    clinicalSummary: '• DNA/RNA 합성 및 T림프구 분화 촉진, 면역 방어력 강화'
  },
  '글루콘산아연': {
    englishInn: 'Zinc gluconate',
    functionalCategory: '아연(Zn)',
    chemicalFormName: '유기산염 (글루콘산아연)',
    defaultUnit: 'mg',
    standardKey: 'ZINC',
    elementalRatio: 0.1435,
    elementalTargetLabel: '아연으로서',
    clinicalSummary: '• 위산 의존도 낮은 유기염으로 위장관 자극(GI Distress) 최소화 및 높은 생체이용률'
  },
  '산화마그네슘': {
    englishInn: 'Magnesium oxide',
    functionalCategory: '마그네슘(Mg)',
    chemicalFormName: '무기염 (산화마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    elementalRatio: 0.603,
    elementalTargetLabel: '마그네슘으로서',
    clinicalSummary: '• 신경 자극 전달 조절 및 근육 수축·이완 정상화, 세포 내 ATP 결합 안정화'
  },
  '글리세로인산마그네슘': {
    englishInn: 'Magnesium glycerophosphate',
    functionalCategory: '마그네슘(Mg)',
    chemicalFormName: '유기인산염 (글리세로인산마그네슘)',
    defaultUnit: 'mg',
    standardKey: 'MAGNESIUM',
    elementalRatio: 0.125,
    elementalTargetLabel: '마그네슘으로서',
    clinicalSummary: '• 설사 유발 위험이 적고 생체흡수율이 뛰어난 유기염 마그네슘'
  },
  '탄산칼슘': {
    englishInn: 'Calcium carbonate',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '무기염 (탄산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    elementalRatio: 0.40,
    elementalTargetLabel: '칼슘으로서',
    clinicalSummary: '• 뼈와 치아 형성의 주요 원소, 혈액 응고 및 신경 자극 전달'
  },
  '구연산칼슘': {
    englishInn: 'Calcium citrate',
    functionalCategory: '칼슘(Ca)',
    chemicalFormName: '유기산염 (구연산칼슘)',
    defaultUnit: 'mg',
    standardKey: 'CALCIUM',
    elementalRatio: 0.21,
    elementalTargetLabel: '칼슘으로서',
    clinicalSummary: '• 위산 저하증 환자나 공복 복용 시에도 흡수가 우수한 유기염 칼슘'
  },
  '푸마르산제일철': {
    englishInn: 'Ferrous fumarate',
    functionalCategory: '제1철 (Ferrous)',
    chemicalFormName: '유기산 2가 철 (푸마르산제일철)',
    defaultUnit: 'mg',
    standardKey: 'IRON',
    elementalRatio: 0.3287,
    elementalTargetLabel: '철로서',
    clinicalSummary: '• 헤모글로빈 구성 성분으로 체내 산소 운반 및 혈액 생성'
  },

  '콜린타르타르산염': {
    englishInn: 'Choline bitartrate',
    functionalCategory: '기타 비타민B',
    chemicalFormName: '주석산수소콜린',
    defaultUnit: 'mg',
    standardKey: 'CHOLINE',
    elementalRatio: 0.4113,
    elementalTargetLabel: '콜린으로서',
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
    chemicalFormName: '지용성 부티르산 에스테르 유도체 (활성형 비타민 B2)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B2',
    elementalRatio: 0.573,
    elementalTargetLabel: '리보플라빈으로서',
    clinicalSummary: '• 수용성 B2 대비 지질 친화성이 높아 체내 체류시간이 길고 지속적 에너지 생성 지원'
  },
  '피리독살포스페이트수화물': {
    englishInn: "Pyridoxal phosphate hydrate",
    functionalCategory: '비타민B6',
    chemicalFormName: '활성 조효소형 비타민 B6 수화물 (PLP)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B6',
    elementalRatio: 0.638,
    elementalTargetLabel: '피리독신으로서',
    clinicalSummary: '• 간 대사 불필요한 즉각적 활성 조효소형, 호모시스테인 대사 정상화 및 신경전달물질 합성'
  },
  '농축콜레칼시페롤': {
    englishInn: 'Cholecalciferol concentrated',
    functionalCategory: '비타민D3',
    chemicalFormName: '농축 콜레칼시페롤 (비타민 D3)',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_D',
    elementalRatio: 100,
    elementalTargetLabel: '비타민D로서',
    elementalUnit: 'IU',
    clinicalSummary: '• 소장 내 칼슘 흡수 촉진, 골밀도 유지 및 선천 면역 세포 조절'
  },
  '셀레늄함유건조효모': {
    englishInn: 'Selenium in dried yeast',
    functionalCategory: '셀레늄(Se)',
    chemicalFormName: '건조효모 결합형 (셀레늄)',
    defaultUnit: 'ug',
    standardKey: 'SELENIUM',
    elementalRatio: 0.54,
    elementalTargetLabel: '셀레늄으로서',
    elementalUnit: 'ug',
    clinicalSummary: '• 글루타티온 과산화효소(GSH-Px) 핵심 조효소, 유해 활성산소 강력 소거'
  },
  '토코페롤아세테이트': {
    englishInn: 'Tocopherol acetate',
    functionalCategory: '비타민E',
    chemicalFormName: '토코페롤 아세테이트 에스테르 (비타민 E)',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_E',
    clinicalSummary: '• 세포막 지질 과산화 방지, 말초 혈액순환 개선'
  },
  '우르소데옥시콜산': {
    englishInn: 'Ursodeoxycholic acid',
    functionalCategory: '담석용해제',
    chemicalFormName: '친수성 2차 담즙산 (UDCA)',
    defaultUnit: 'mg',
    clinicalSummary: '• 간세포 보호막 형성, 담즙 분비 촉진(이담 작용) 및 해독 대사 활성화'
  },

  '콜레칼시페롤': {
    englishInn: 'Cholecalciferol',
    functionalCategory: '비타민D3',
    chemicalFormName: '콜레칼시페롤 (비타민 D3)',
    defaultUnit: 'IU',
    standardKey: 'VITAMIN_D',
    clinicalSummary: '• 소장 내 칼슘 흡수 촉진, 뼈 건강 유지 및 선천 면역 세포 조절'
  },

  '아스코르브산': {
    englishInn: 'Ascorbic acid',
    functionalCategory: '비타민C',
    chemicalFormName: 'L-아스코르브산 (비타민 C)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    clinicalSummary: '• 결합조직 형성 및 콜라겐 합성 필수 조효소, 유해 활성산소 소거'
  },
  'L-아르기닌': {
    englishInn: 'L-Arginine',
    functionalCategory: '간보호제',
    chemicalFormName: 'L-아르기닌 (유리 아미노산)',
    defaultUnit: 'mg',
    clinicalSummary: '• 산화질소(NO) 생성 전구체, 혈관 확장 및 대사 활력 지원'
  },
  '타우린': {
    englishInn: 'Taurine',
    functionalCategory: '비필수 아미노산',
    chemicalFormName: '함황 아미노설폰산 (타우린)',
    defaultUnit: 'mg',
    clinicalSummary: '• 담즙산 결합 및 삼투압 조절, 심근 수축력 및 근육 피로 완화'
  },
  '제피아스코르브산': {
    englishInn: 'Ascorbic acid coated',
    functionalCategory: '비타민C',
    chemicalFormName: '코팅 제피 아스코르브산 (비타민 C)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_C',
    elementalRatio: 0.97,
    elementalTargetLabel: '아스코르브산으로서',
    clinicalSummary: '• 산화 방지 및 위장 자극 경감 코팅 비타민 C, 결합조직 형성 및 항산화 작용'
  },
  '콜레칼시페롤농축분말': {
    englishInn: 'Cholecalciferol concentrate powder',
    functionalCategory: '비타민D3',
    chemicalFormName: '농축 분말형 콜레칼시페롤 (비타민 D3)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_D',
    elementalRatio: 100,
    elementalTargetLabel: '비타민D로서',
    elementalUnit: 'IU',
    clinicalSummary: '• 장관 내 칼슘 흡수 촉진 및 골밀도 유지, 면역 세포 수용체 활성화'
  },
  '토코페롤아세테이트2배산': {
    englishInn: 'Tocopherol Acetate Powder 50%',
    functionalCategory: '비타민E',
    chemicalFormName: '비타민 E 아세테이트 2배산',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    elementalRatio: 0.5,
    elementalTargetLabel: '비타민E로서',
    elementalUnit: 'IU',
    clinicalSummary: '• 말초 혈관 순환 촉진, 세포막 불포화지방산 산화 억제'
  },
  '토코페롤아세테이트 2배산': {
    englishInn: 'Tocopherol Acetate Powder 50%',
    functionalCategory: '비타민E',
    chemicalFormName: '비타민 E 아세테이트 2배산',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    elementalRatio: 0.5,
    elementalTargetLabel: '비타민E로서',
    elementalUnit: 'IU',
    clinicalSummary: '• 말초 혈관 순환 촉진, 세포막 불포화지방산 산화 억제'
  },
  '토코페롤아세테이트50%': {
    englishInn: 'Tocopherol Acetate 50%',
    functionalCategory: '비타민E',
    chemicalFormName: '비타민 E 아세테이트 50%',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    elementalRatio: 0.5,
    elementalTargetLabel: '비타민E로서',
    elementalUnit: 'IU',
    clinicalSummary: '• 말초 혈관 순환 촉진, 세포막 불포화지방산 산화 억제'
  },
  '토코페롤아세테이트 50%': {
    englishInn: 'Tocopherol Acetate 50%',
    functionalCategory: '비타민E',
    chemicalFormName: '비타민 E 아세테이트 50%',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_E',
    elementalRatio: 0.5,
    elementalTargetLabel: '비타민E로서',
    elementalUnit: 'IU',
    clinicalSummary: '• 말초 혈관 순환 촉진, 세포막 불포화지방산 산화 억제'
  },
  '감마-오리자놀': {
    englishInn: 'γ-Oryzanol',
    functionalCategory: '자율신경제',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  'γ-오리자놀': {
    englishInn: 'γ-Oryzanol',
    functionalCategory: '자율신경제',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  '감마오리자놀': {
    englishInn: 'γ-Oryzanol',
    functionalCategory: '자율신경제',
    chemicalFormName: '미강유 추출 페룰산 에스테르 혼합물',
    defaultUnit: 'mg',
    clinicalSummary: '• 자율신경계(간뇌 시상하부) 조절, 갱년기 신경 증상 및 위장 신경증 완화'
  },
  '크롬함유건조효모': {
    englishInn: 'Chromium in dried yeast',
    functionalCategory: '크롬(Cr)',
    chemicalFormName: '건조효모 결합형 (크롬)',
    defaultUnit: 'mg',
    standardKey: 'CHROMIUM',
    elementalRatio: 2.0,
    elementalTargetLabel: '크롬으로서',
    elementalUnit: 'ug',
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
    englishInn: 'Niacin',
    functionalCategory: '비타민B3',
    chemicalFormName: '나이아신 (니코틴산아미드)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 체내 에너지 생성 및 NAD/NADP 산화환원 조효소 작용\n• 원료 형태에 따라 상한섭취량 상이 (니코틴산 35mg NE vs 니코틴산아미드 850mg NE)'
  },
  '니아신': {
    englishInn: 'Niacin',
    functionalCategory: '비타민B3',
    chemicalFormName: '나이아신 (니코틴산아미드)',
    defaultUnit: 'mg',
    standardKey: 'VITAMIN_B3',
    clinicalSummary: '• 체내 에너지 생성 및 NAD/NADP 산화환원 조효소 작용\n• 원료 형태에 따라 상한섭취량 상이 (니코틴산 35mg NE vs 니코틴산아미드 850mg NE)'
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
    functionalCategory: '비타민B9(엽산)',
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
    chemicalFormName: '건조효모 결합형 (셀레늄)',
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
  str = str.replace(/감마\s*[-－]?\s*오리자놀/gi, 'Gamma Oryzanol');

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
    '비타민 D': 'Vitamin D',
    '비타민E': 'Vitamin E',
    '비타민 e': 'Vitamin E',
    '비타민 E': 'Vitamin E',
    '아연': 'Zinc',
    '마그네슘': 'Magnesium',
    '칼슘': 'Calcium',
    '셀레늄': 'Selenium',
    '크롬': 'Chromium',
    '철': 'Iron'
  };

  // 3. 괄호 부분 "(아스코르브산(으)로서 50mg)" 처리
  let bracketFormatted = '';
  const bracketMatch = str.match(/\(([^)]+?)(?:\(으\)|으)?로서\s*([0-9\.,]+)\s*([a-zA-Z가-힣㎍μµ\.]+)?\)/);
  if (bracketMatch) {
    const rawTargetName = bracketMatch[1].trim();
    const amountVal = bracketMatch[2].trim();
    let unitVal = (bracketMatch[3] || '').trim();
    if (unitVal === '㎍' || unitVal === 'μg' || unitVal === 'µg' || unitVal === '마이크로그램') unitVal = 'ug';
    else if (unitVal === '밀리그램') unitVal = 'mg';
    else if (unitVal === '아이.유' || unitVal === '아이유') unitVal = 'IU';

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
  const amountMatch = str.match(/([0-9\.,]+)\s*(mg|ug|㎍|μg|µg|IU|g|밀리그램|마이크로그램|아이\.유)?$/i);
  let mainAmount = '';
  if (amountMatch) {
    let u = amountMatch[2] || 'mg';
    if (u === '㎍' || u === 'μg' || u === 'µg' || u === '마이크로그램') u = 'ug';
    else if (u === '밀리그램') u = 'mg';
    else if (u === '아이.유') u = 'IU';
    mainAmount = `${amountMatch[1]}${u}`;
    str = str.substring(0, amountMatch.index).trim();
  }

  // 5. 한글 이름 제거하고 영문 이름만 추출
  // 5-A. 약학정보원 표준 포맷: "벤포티아민 (Benfotiamine)" 처럼 괄호 안에 영문명이 있는 경우
  const korWithEngParenMatch = str.match(/^([가-힣0-9\s·\-]+?)\s*\(([A-Za-zγ][A-Za-z0-9\s\-\'\,\%\.\/·]+)\)$/);
  // 5-B. 영문명이 앞에 있는 경우: "Ascorbic Acid Coated  제피아스코르브산" -> "Ascorbic Acid Coated"
  const engPrefixMatch = str.match(/^([A-Za-z][A-Za-z0-9\s\-\'\,\%\.\/]*?)(?:\s+[가-힣]+.*)?$/);

  let mainEngName = '';
  if (korWithEngParenMatch && korWithEngParenMatch[2].trim()) {
    mainEngName = korWithEngParenMatch[2].trim().replace(/^γ-Oryzanol$/i, 'Gamma Oryzanol');
  } else if (engPrefixMatch && engPrefixMatch[1].trim()) {
    mainEngName = engPrefixMatch[1].trim();
  } else {
    // 영문이 없고 한글만 있는 경우 사전을 통해 영문 INN 매핑 (긴 키 우선 매칭)
    let matchedDict: string | null = null;
    const sortedKeys = Object.keys(INN_DICTIONARY).sort((a, b) => b.length - a.length);
    for (const k of sortedKeys) {
      if (str.includes(k)) {
        matchedDict = INN_DICTIONARY[k].englishInn;
        break;
      }
    }
    mainEngName = (matchedDict || str).replace(/^γ-Oryzanol$/i, 'Gamma Oryzanol');
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
  // 줄바꿈, 세미콜론, 또는 숫자 천단위 쉼표(예: 1,000IU)가 아닌 쉼표 단위로 항목 분리
  const rawItems = rawText
    .split(/(?:[\r\n;]+|,(?![0-9]{3}))+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 성분명 및 수치/단위 추출 정규식
  // 예: "벤포티아민 (Benfotiamine) 100mg", "벤포티아민 100mg", "산화아연(KP) 30mg", "시아노코발라민1000배산 500㎍"
  const regex = /([가-힣A-Za-z0-9γ\s\(\)·\-\'\_\%\/]+?)\s*[:：]?\s*([0-9\.,]+)\s*(mg|ug|㎍|μg|µg|IU|g|밀리그램|마이크로그램|아이\.유)?$/i;

  rawItems.forEach((item, index) => {
    // 주의사항, 경고문, 보관방법, 당알코올 설사 안내 등 비성분 문장 유입 원천 배제
    if (
      /(?:과량\s*섭취|설사를\s*일으킬|당알코올|주의사항|보관방법|유통기한|소비기한|직사광선|질병의\s*예방|부정\s*불량식품|개봉\s*후|이상사례|특이체질|알레르기|포장재질|기준치에\s*대한\s*비율|열량에\s*따라)/i.test(
        item
      )
    ) {
      return;
    }

    // 영문 표준 간결 형식 성분표 규격 생성
    const formattedSpecification = formatKpaicSpecification(item);

    // 1. 원소 환산량 괄호 추출 (예: "(아연(으)로서 15mg)", "(비타민D로서 1,000IU)", "(셀레늄으로서 22μg)")
    let elementalAmount: number | undefined = undefined;
    const elementalMatch = item.match(/\([^)]*?로서\s*([0-9\.,]+)\s*(mg|ug|㎍|μg|µg|IU|g|밀리그램|마이크로그램|아이\.유)?\)/i);
    if (elementalMatch) {
      elementalAmount = parseFloat(elementalMatch[1].replace(/,/g, ''));
    }

    // 괄호 환산량 부분 제외한 본문
    const cleanItem = item.replace(/\([^\)]*로서[^\)]*\)/gi, '').trim();

    // 2. 수치 및 단위 추출 (예: "100mg", "0.5mg", "46.29mg")
    const match = cleanItem.match(regex);
    let nameRaw = cleanItem;
    let amount = 0;
    let unit: 'mg' | 'ug' | 'IU' | 'g' = 'mg';

    if (match) {
      nameRaw = match[1].replace(/\(KP\)|\(별규\)|\(USP\)|\(EP\)|\(KHP\)/gi, '').trim();
      amount = parseFloat(match[2].replace(/,/g, '')) || 0;
      const matchedUnit = (match[3] || 'mg').toLowerCase();
      if (matchedUnit === 'ug' || matchedUnit === '㎍' || matchedUnit === 'μg' || matchedUnit === 'µg' || matchedUnit === '마이크로그램') {
        unit = 'ug';
      } else if (matchedUnit === 'iu' || matchedUnit === '아이.유') {
        unit = 'IU';
      } else if (matchedUnit === 'g') {
        unit = 'g';
      } else {
        unit = 'mg';
      }
    }

    // 약학정보원 포맷 감지:
    // Case A: "벤포티아민 (Benfotiamine)" (한글명 + 괄호 영문명)
    // Case B: "Benfotiamine 벤포티아민" (영문명 + 한글명)
    let detectedInn = '';
    const korParenEngMatch = nameRaw.match(/^([가-힣0-9γ\s·\-\%]+?)\s*\(([A-Za-zγ][A-Za-z0-9\s\-\'\,\%\.\/·]+)\)$/);
    const engKorMatch = nameRaw.match(/^([A-Za-z0-9γ\s\-\'\,\%\.]+)\s+([가-힣0-9\s\(\)·\-\%]+)$/);
    if (korParenEngMatch) {
      nameRaw = korParenEngMatch[1].trim();
      detectedInn = korParenEngMatch[2].trim();
    } else if (engKorMatch) {
      detectedInn = engKorMatch[1].trim();
      nameRaw = engKorMatch[2].trim();
    }

    // 사전에서 매핑되는 영문 INN 찾기 (1순위: 완전 일치, 2순위: 영문 INN 완전 일치, 3순위: 입력 문자열이 사전 키를 포함하는 가장 긴 키 매칭)
    // ※ 주의: dictKey.includes(nameRaw) (역방향 포함)를 허용하면 '리보플라빈' 입력이 더 긴 키인 '리보플라빈포스페이트나트륨'으로 잘못 매칭되므로 금지!
    const learnedDict = getLearnedDict();
    const combinedDict: Record<string, InnMappingMeta> = { ...INN_DICTIONARY, ...learnedDict };

    let matchedKey: string | null = null;
    const normNameRaw = nameRaw.replace(/\s+/g, '').toLowerCase();
    const normDetectedInn = detectedInn.replace(/\s+/g, '').toLowerCase();
    const sortedDictKeys = Object.keys(combinedDict).sort((a, b) => b.length - a.length);

    // 1단계: 한글 키 완전 일치 (공백 무시)
    for (const dictKey of sortedDictKeys) {
      const normDictKey = dictKey.replace(/\s+/g, '').toLowerCase();
      if (normNameRaw && normNameRaw === normDictKey) {
        matchedKey = dictKey;
        break;
      }
    }

    // 2단계: 영문 INN 완전 일치 (공백 무시)
    if (!matchedKey && (normDetectedInn || normNameRaw)) {
      const targetEng = normDetectedInn || normNameRaw;
      for (const dictKey of sortedDictKeys) {
        const metaEng = combinedDict[dictKey].englishInn.replace(/\s+/g, '').toLowerCase();
        if (targetEng === metaEng) {
          matchedKey = dictKey;
          break;
        }
      }
    }

    // 3단계: 입력된 원료명이 사전 키를 포함하는 경우 (예: "비타민B1염산염(고시형)" -> "비타민B1염산염")
    // 긴 사전 키부터 정렬되어 있으므로 복합염('리보플라빈포스페이트나트륨')이 단일성분('리보플라빈')보다 먼저 정확히 매칭됨
    if (!matchedKey) {
      for (const dictKey of sortedDictKeys) {
        const normDictKey = dictKey.replace(/\s+/g, '').toLowerCase();
        if (normDictKey.length < 2) continue;
        if (
          (normNameRaw && normNameRaw.includes(normDictKey)) ||
          (normDetectedInn && normDetectedInn.includes(normDictKey))
        ) {
          matchedKey = dictKey;
          break;
        }
      }
    }

    // 1. KPIC 약학정보원 마스터 데이터베이스에서 공식 약효분류 조회 (정확도 우선순위 검색)
    let kpicCategory: string | undefined = undefined;
    const testKeys = [detectedInn, nameRaw, normNameRaw].filter(Boolean);
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
      const resolvedCategory =
        learnedDict[matchedKey]?.functionalCategory ||
        (meta.functionalCategory && meta.functionalCategory !== '기타' ? meta.functionalCategory : undefined) ||
        kpicCategory ||
        '기타';

      results.push({
        ingredientId: `ing_auto_${Date.now()}_${index}`,
        englishInn: detectedInn || meta.englishInn,
        functionalCategory: resolvedCategory,
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
        for (const k of sortedDictKeys) {
          if (fallbackInn.includes(k)) {
            fallbackInn = INN_DICTIONARY[k]?.englishInn || fallbackInn;
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

export interface ChemicalFormFeature {
  badgeType: 'ACTIVE_VITAMIN' | 'ORGANIC_MINERAL' | 'INORGANIC_MINERAL' | 'AMIDE' | 'NATURAL' | 'NONE';
  badgeLabel?: string;
  detailLabel: string;
  displayText: string;
}

export interface ResolvedIngredientDisplayInfo {
  englishName: string;
  categoryTag: string;
  convertedAmount?: number;
  convertedUnit?: string;
  convertedLabel?: string;
  convertedText: string | null;
  ulText: string | null;
  ulNote?: string;
  childUlText?: string | null;
  childUlNote?: string;
  childAgeRows?: { ageLabel: string; ulText: string; ulValue: number }[];
  chemicalFormFeature: ChemicalFormFeature;
  sortGroup: 1 | 2 | 3 | 4; // 1: 비타민, 2: 미네랄, 3: 콜린, 4: 기타 성분
  subOrder?: number; // 비타민 내 순서 (A=10, B1=21..B12=32, C=40, D=50, E=60, K=70)
}

const KOR_TO_ENG_DISPLAY_MAP: Record<string, string> = {
  '벤포티아민': 'Benfotiamine',
  '푸르설티아민': 'Fursultiamine',
  '비스벤티아민': 'Bisbentiamine',
  '티아민염산염': 'Thiamine hydrochloride',
  '티아민질산염': 'Thiamine mononitrate',
  '리보플라빈부티레이트': 'Riboflavin butyrate',
  '리보플라빈포스페이트나트륨': "Riboflavin 5'-phosphate sodium",
  '리보플라빈': 'Riboflavin',
  '니코틴산아미드': 'Nicotinamide',
  '니코틴아미드': 'Nicotinamide',
  '니코틴산': 'Nicotinic acid',
  '나이아신': 'Niacin',
  '니아신': 'Niacin',
  '판토텐산칼슘': 'Calcium pantothenate',
  '피리독신염산염': 'Pyridoxine hydrochloride',
  '피리독살포스페이트': "Pyridoxal 5'-phosphate",
  '피리독살포스페이트수화물': 'Pyridoxal phosphate hydrate',
  '비오틴': 'Biotin',
  'D-비오틴': 'D-Biotin',
  '엽산': 'Folic acid',
  '폴산': 'Folic acid',
  '메코발라민': 'Mecobalamin',
  '시아노코발라민': 'Cyanocobalamin',
  '아스코르브산': 'Ascorbic acid',
  '제피아스코르브산': 'Ascorbic acid coated',
  '비타민C': 'Ascorbic acid',
  '콜레칼시페롤': 'Cholecalciferol',
  '콜레칼시페롤농축분말': 'Cholecalciferol concentrate powder',
  '농축콜레칼시페롤': 'Cholecalciferol concentrated',
  '토코페롤아세테이트': 'Tocopherol acetate',
  '토코페롤아세테이트2배산': 'Tocopherol Acetate Powder 50%',
  '산화아연': 'Zinc oxide',
  '글루콘산아연': 'Zinc gluconate',
  '산화마그네슘': 'Magnesium oxide',
  '글리세로인산마그네슘': 'Magnesium glycerophosphate',
  '탄산칼슘': 'Calcium carbonate',
  '구연산칼슘': 'Calcium citrate',
  '푸마르산제일철': 'Ferrous fumarate',
  '셀레늄': 'Selenium',
  '셀레늄함유건조효모': 'Selenium in dried yeast',
  '크롬함유건조효모': 'Chromium in dried yeast',
  '우르소데옥시콜산': 'Ursodeoxycholic acid',
  '타우린': 'Taurine',
  '이노시톨': 'Inositol',
  '감마오리자놀': 'Gamma-oryzanol',
  '감마-오리자놀': 'Gamma-oryzanol',
  'γ-오리자놀': 'Gamma-oryzanol',
  '콜린타르타르산염': 'Choline bitartrate',
  '실리마린': 'Silymarin',
  '밀크씨슬추출물': 'Milk thistle extract (Silymarin)',
  '루테인': 'Lutein',
  '프로바이오틱스': 'Probiotics',
  'L-아르기닌': 'L-Arginine',
  '아르기닌': 'L-Arginine',
  '글루타치온': 'L-Glutathione',
  '코엔자임Q10': 'Coenzyme Q10 (Ubidecarenone)',
  '유비데카레논': 'Ubidecarenone',
  '홍삼': 'Korean Red Ginseng extract',
  '오메가3': 'Omega-3 (EPA & DHA)',
  '테아닌': 'L-Theanine',
  '바나바잎추출물': 'Banaba leaf extract (Corosolic acid)'
};

const ENG_ALIAS_TO_DICT_KEY: Record<string, string> = {
  benfotiamine: '벤포티아민',
  bisbentiamine: '비스벤티아민',
  bisbenthiamine: '비스벤티아민',
  fursultiamine: '푸르설티아민',
  thiaminehydrochloride: '티아민염산염',
  thiaminemononitrate: '티아민질산염',
  riboflavin: '리보플라빈',
  riboflavinbutyrate: '리보플라빈부티레이트',
  riboflavintetrabutyrate: '리보플라빈부티레이트',
  "riboflavin5'-phosphatesodium": '리보플라빈포스페이트나트륨',
  riboflavinphosphatesodium: '리보플라빈포스페이트나트륨',
  nicotinamide: '니코틴산아미드',
  niacinamide: '니코틴산아미드',
  nicotinicacid: '니코틴산',
  niacin: '나이아신',
  calciumpantothenate: '판토텐산칼슘',
  pyridoxinehydrochloride: '피리독신염산염',
  "pyridoxal5'-phosphate": '피리독살포스페이트',
  pyridoxalphosphatehydrate: '피리독살포스페이트수화물',
  biotin: '비오틴',
  'd-biotin': 'D-비오틴',
  dbiotin: 'D-비오틴',
  folicacid: '폴산',
  folate: '폴산',
  cyanocobalamin: '시아노코발라민',
  mecobalamin: '메코발라민',
  cholinebitartrate: '콜린타르타르산염',
  inositol: '이노시톨',
  ascorbicacid: '아스코르브산',
  ascorbicacidcoated: '제피아스코르브산',
  coatedascorbicacid: '제피아스코르브산',
  cholecalciferol: '콜레칼시페롤',
  cholecalciferolconcentratepowder: '콜레칼시페롤농축분말',
  cholecalciferolconcentrated: '농축콜레칼시페롤',
  concentratedcholecalciferolpowder: '콜레칼시페롤농축분말',
  tocopherolacetate: '토코페롤아세테이트',
  'tocopherolacetatepowder50%': '토코페롤아세테이트2배산',
  'tocopherolacetate50%': '토코페롤아세테이트50%',
  zincoxide: '산화아연',
  zincgluconate: '글루콘산아연',
  magnesiumoxide: '산화마그네슘',
  magnesiumglycerophosphate: '글리세로인산마그네슘',
  calciumcarbonate: '탄산칼슘',
  calciumcitrate: '구연산칼슘',
  ferrousfumarate: '푸마르산제일철',
  seleniumindriedyeast: '셀레늄함유건조효모',
  chromiumindriedyeast: '크롬함유건조효모',
  ursodeoxycholicacid: '우르소데옥시콜산',
  'gamma-oryzanol': '감마-오리자놀',
  gammaoryzanol: '감마-오리자놀',
  'γ-oryzanol': '감마-오리자놀',
  ubidecarenone: '유비데카레논',
  taurine: '타우린',
  'l-arginine': 'L-아르기닌'
};

/**
 * 원료 형태/염(Form & Salt)의 특성을 정리하여 본문 텍스트 형태로 표기
 * - 인위적인 '활성형 (...)', '유기태 (...)', '무기염 (...)' 등의 수식어 래퍼를 배제하고 자연스러운 원문 원료 형태 표기 유지
 * - '주석산염 (콜린염)' -> '주석산수소콜린' 정규화
 * - '유기태' 표현 제거 및 효모 결합형태 정돈
 */
export function analyzeChemicalFormFeature(
  rawForm: string,
  categoryTag: string,
  englishName: string,
  rawInn: string
): ChemicalFormFeature {
  let formText = (rawForm || '').trim();

  // 1. 이전 버전에서 감싸졌던 외곽 래퍼(활성형 (...), 유기태 (...), 무기염 (...), 유기염 (...), 아미드형 (...), 천연형 (...)) 안전하게 해제
  for (let i = 0; i < 2; i++) {
    formText = formText
      .replace(/^활성형\s*\((.+)\)$/, '$1')
      .replace(/^유기태\s*\((.+)\)$/, '$1')
      .replace(/^유기염\s*\((.+)\)$/, '$1')
      .replace(/^무기염\s*\((.+)\)$/, '$1')
      .replace(/^아미드형\s*\((.+)\)$/, '$1')
      .replace(/^천연형\s*\((.+)\)$/, '$1')
  }

  // 상한섭취량 문구 및 비타민 B3 접두어 정돈
  formText = formText
    .replace(/^비타민\s*b3\s*—\s*/gi, '')
    .replace(/,\s*상한\s*\d+mg/gi, '')
    .replace(/상한\s*\d+mg/gi, '')
    .replace(/\(\s*\)/g, '')
    .trim();

  const combined = `${formText} ${englishName} ${rawInn} ${categoryTag}`.toLowerCase();

  // 2. 콜린 제제 정규화 ('주석산염 (콜린염)', '콜린타르타르산염' -> 표준 명칭 '주석산수소콜린')
  if (/choline|콜린|bitartrate|타르타르/i.test(combined)) {
    if (
      !formText ||
      formText === '콜린타르타르산염' ||
      formText.includes('주석산염') ||
      formText.includes('콜린염') ||
      formText === '표준 정제 원료'
    ) {
      formText = '주석산수소콜린';
    }
  }

  // 3. '유기태' 표현 제거 및 효모 결합 미네랄 정돈
  formText = formText.replace(/유기태/g, '').trim();
  if (/yeast|건조효모/i.test(combined)) {
    if (/selenium|셀레늄|셀렌/i.test(combined)) {
      formText = '건조효모 결합형 (셀레늄)';
    } else if (/chromium|크롬/i.test(combined)) {
      formText = '건조효모 결합형 (크롬)';
    } else {
      formText = formText
        .replace(/유기\s*(크롬|셀레늄|셀렌)?/g, '')
        .replace(/\(\s*\)/g, '')
        .trim();
      if (!formText) formText = '건조효모 결합형';
    }
  }

  // 4. 비어있거나 '표준 정제 원료'인 경우에만 기본 형태 보충
  if (!formText || formText === '표준 정제 원료') {
    if (categoryTag.startsWith('비타민')) formText = '일반(비활성)형';
    else formText = '-';
  }

  // 이중 괄호 방지: ((...)) -> (...)
  formText = formText.replace(/\(\(/g, '(').replace(/\)\)/g, ')').trim();

  return {
    badgeType: 'NONE',
    detailLabel: formText,
    displayText: formText
  };
}

/**
 * 개별 성분의 표시용 영문명, 약효분류 태그, 실제 유효/원소 환산량, 2025 KDRIs 상한섭취량(UL), 정렬 그룹을 계산
 */
export function resolveIngredientDisplayInfo(
  ing: ProductIngredientEntry,
  productName?: string
): ResolvedIngredientDisplayInfo {
  let rawInn = (ing.englishInn || '').trim();

  // 기존 DB 저장본 중 올대원맥스정의 리보플라빈 90mg이 과거 부분매칭 버그로 Riboflavin 5'-phosphate sodium으로 저장된 경우 자동 보정
  if (
    productName?.includes('올대원맥스') &&
    ing.rawAmount === 90 &&
    rawInn.toLowerCase().includes('riboflavin')
  ) {
    rawInn = 'Riboflavin';
  }

  // 1. 순수 영문 성분명 정제
  let englishName = KOR_TO_ENG_DISPLAY_MAP[rawInn] || '';
  if (!englishName) {
    const stripped = rawInn
      .replace(/\([가-힣\s·,0-9]+\)/g, '')
      .replace(/[가-힣]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    englishName = stripped && /[A-Za-z]/.test(stripped) ? stripped : rawInn || 'Active Ingredient';
  }
  // γ-Oryzanol은 알파벳 정렬을 위해 Gamma-oryzanol로 통일
  if (/^γ-?oryzanol$/i.test(englishName)) {
    englishName = 'Gamma-oryzanol';
  }

  // 2. 사전 메타데이터 조회
  const learnedDict = getLearnedDict();
  const combinedDict: Record<string, InnMappingMeta> = { ...INN_DICTIONARY, ...learnedDict };
  const normEng = englishName.toLowerCase().replace(/\s+/g, '');
  const normKor = (ing.koreanName || rawInn).replace(/\s+/g, '').toLowerCase();

  let meta: InnMappingMeta | undefined = undefined;
  const aliasDictKey = ENG_ALIAS_TO_DICT_KEY[normEng];
  if (aliasDictKey && combinedDict[aliasDictKey]) {
    meta = combinedDict[aliasDictKey];
  } else if (combinedDict[rawInn]) {
    meta = combinedDict[rawInn];
  } else {
    for (const [k, v] of Object.entries(combinedDict)) {
      const kNorm = k.replace(/\s+/g, '').toLowerCase();
      const vEngNorm = v.englishInn.replace(/\s+/g, '').toLowerCase();
      if (normEng === vEngNorm || (normKor && normKor === kNorm)) {
        meta = v;
        break;
      }
    }
  }

  // 3. 약효분류 태그 결정 (비타민B9(엽산) -> 엽산, 미네랄 원소기호 제거 등 표준화)
  let rawCategory =
    ing.functionalCategory && ing.functionalCategory !== '기타'
      ? ing.functionalCategory
      : meta?.functionalCategory || resolveKpicCategory(englishName) || resolveKpicCategory(rawInn) || '기타';

  let categoryTag = normalizeCategory(rawCategory);
  if (
    normEng === 'folicacid' ||
    normEng === 'folate' ||
    categoryTag === '엽산' ||
    categoryTag === '폴산' ||
    categoryTag === '비타민B9(엽산)' ||
    categoryTag === '비타민B9'
  ) {
    categoryTag = '엽산';
  }

  // 4. 실제 성분량(원소량 / 활성 유효성분량) 환산 계산
  let convertedAmount: number | undefined = undefined;
  let convertedUnit: string = meta?.elementalUnit || ing.unit;
  let convertedLabel: string | undefined = meta?.elementalTargetLabel;

  // 올대원맥스정 90mg Riboflavin 보정 시에는 환산량 없음
  const isPureRiboflavin90 =
    productName?.includes('올대원맥스') && ing.rawAmount === 90 && englishName === 'Riboflavin';

  if (!isPureRiboflavin90) {
    if (
      ing.elementalAmount !== undefined &&
      ing.elementalAmount > 0 &&
      ing.elementalAmount !== ing.rawAmount
    ) {
      convertedAmount = ing.elementalAmount;
    } else if (meta?.elementalRatio && ing.rawAmount > 0) {
      // 단위가 이미 환산 단위와 동일한 특수 케이스(예: 콜레칼시페롤이 이미 IU 단위로 입력된 경우)는 중복 곱셈 방지
      const skipConversion = meta.elementalUnit === 'IU' && ing.unit === 'IU';
      if (!skipConversion) {
        convertedAmount = +(ing.rawAmount * meta.elementalRatio).toFixed(2);
      }
    }
  }

  // 환산 라벨이 사전에 없을 경우 카테고리/성분명 기반 기본 라벨 부여
  if (convertedAmount !== undefined && !convertedLabel) {
    if (categoryTag === '마그네슘' || categoryTag === '마그네슘(Mg)') convertedLabel = '마그네슘';
    else if (categoryTag === '아연' || categoryTag === '아연(Zn)') convertedLabel = '아연';
    else if (categoryTag === '칼슘' || categoryTag === '칼슘(Ca)') convertedLabel = '칼슘';
    else if (categoryTag.includes('철')) convertedLabel = '철';
    else if (categoryTag === '셀레늄' || categoryTag === '셀레늄(Se)') convertedLabel = '셀레늄';
    else if (categoryTag === '크롬' || categoryTag === '크롬(Cr)') convertedLabel = '크롬';
    else if (categoryTag.startsWith('비타민D')) convertedLabel = '비타민D';
    else if (categoryTag === '비타민E') convertedLabel = '비타민E';
    else if (categoryTag === '비타민B1') convertedLabel = '티아민염산염';
    else if (categoryTag === '비타민B2') convertedLabel = '리보플라빈';
    else if (categoryTag === '비타민B5') convertedLabel = '판토텐산';
    else if (categoryTag === '비타민B6') convertedLabel = '피리독신';
    else if (categoryTag === '비타민C') convertedLabel = '아스코르브산';
  }

  // '~으로서', '~로서' 접미사 제거하여 (리보플라빈 28.65mg) 형태로 깔끔하게 표기
  const cleanConvertedLabel = convertedLabel
    ? convertedLabel.replace(/(으로서|로서)$/, '').trim()
    : undefined;

  const convertedText =
    convertedAmount !== undefined
      ? cleanConvertedLabel
        ? `${cleanConvertedLabel} ${convertedAmount.toLocaleString()}${convertedUnit}`
        : `${convertedAmount.toLocaleString()}${convertedUnit}`
      : null;

  // 5. 2025 한국인 영양소 섭취기준(KDRIs) 성인 상한섭취량(UL) 매칭
  let standardKey: NutrientStandardKey | undefined = ing.standardKey || meta?.standardKey;
  if (!standardKey) {
    if (categoryTag === '비타민A' && !normEng.includes('betacarotene') && !normEng.includes('beta-carotene')) {
      standardKey = 'VITAMIN_A';
    } else if (categoryTag === '비타민B3') standardKey = 'VITAMIN_B3';
    else if (categoryTag === '비타민B6') standardKey = 'VITAMIN_B6';
    else if (categoryTag === '엽산' || categoryTag === '비타민B9(엽산)') standardKey = 'VITAMIN_B9';
    else if (categoryTag === '비타민C') standardKey = 'VITAMIN_C';
    else if (categoryTag === '비타민D' || categoryTag === '비타민D3' || categoryTag === '비타민D2') {
      standardKey = 'VITAMIN_D';
    } else if (categoryTag === '비타민E') standardKey = 'VITAMIN_E';
    else if (categoryTag === '칼슘' || categoryTag === '칼슘(Ca)') standardKey = 'CALCIUM';
    else if (categoryTag === '마그네슘' || categoryTag === '마그네슘(Mg)') standardKey = 'MAGNESIUM';
    else if (categoryTag === '아연' || categoryTag === '아연(Zn)') standardKey = 'ZINC';
    else if (
      categoryTag === '철' ||
      categoryTag === '제1철' ||
      categoryTag === '제2철' ||
      categoryTag === '제1철 (Ferrous)' ||
      categoryTag === '제2철 (Ferric)' ||
      categoryTag === '철(Fe)'
    ) {
      standardKey = 'IRON';
    } else if (categoryTag === '셀레늄' || categoryTag === '셀레늄(Se)') standardKey = 'SELENIUM';
    else if (categoryTag === '구리' || categoryTag === '구리(Cu)' || categoryTag === '동(Cu)') standardKey = 'COPPER';
    else if (categoryTag === '망간' || categoryTag === '망간(Mn)') standardKey = 'MANGANESE';
    else if (categoryTag === '요오드' || categoryTag === '요오드(I)') standardKey = 'IODINE';
    else if (categoryTag === '몰리브덴' || categoryTag === '몰리브덴(Mo)') standardKey = 'MOLYBDENUM';
    else if (normEng.includes('choline')) standardKey = 'CHOLINE';
  }

  let ulText: string | null = null;
  let ulNote: string | undefined = undefined;
  if (standardKey) {
    const std = KDRI_2025_ADULT_STANDARDS.find((s) => s.nutrientKey === standardKey);
    if (std?.ul !== undefined) {
      ulNote = std.clinicalWarningThresholdNote;
      if (standardKey === 'VITAMIN_D') {
        ulText = '4,000IU (100μg)';
      } else if (standardKey === 'VITAMIN_B3') {
        // 비타민 B3(니아신)는 국내 건기식 및 비타민제에서 거의 대부분 니코틴산아미드 형태임
        // 사용자 기준:
        // 1) 기본적으로 상한섭취량에 그냥 '850mg'으로 기록
        // 2) 혹시 산 형태(니코틴산)일 경우에만 '35mg (니코틴산)'으로 적용 및 명시
        const fullCheckStr = `${normEng} ${rawInn} ${ing.koreanName || ''} ${ing.chemicalFormName || ''}`.toLowerCase();
        const isNicotinicAcid =
          (normEng.includes('nicotinicacid') ||
            (fullCheckStr.includes('니코틴산') && !fullCheckStr.includes('아미드'))) &&
          !normEng.includes('nicotinamide') &&
          !normEng.includes('niacinamide') &&
          !fullCheckStr.includes('아미드');

        if (isNicotinicAcid) {
          ulText = '35mg (니코틴산)';
          ulNote =
            '2025 KDRIs 비타민 B3 상한섭취량: 니코틴산(Nicotinic acid) 성인 35 mg NE/일 — 초과 시 프로스타글란딘 매개 혈관확장·안면홍조(Flushing) 유발 가능 (참고: 니코틴산아미드는 850 mg NE/일)';
        } else {
          ulText = '850mg';
          ulNote =
            '2025 KDRIs 비타민 B3 상한섭취량: 니코틴산아미드(Nicotinamide) 성인 850 mg NE/일 (참고: 니코틴산 형태는 35 mg NE/일)';
        }
      } else if (standardKey === 'VITAMIN_E') {
        ulText = '540mg α-TE (800IU)';
      } else if (standardKey === 'VITAMIN_A') {
        ulText = '3,000μg RAE';
      } else {
        const displayUnit = std.unit === 'ug' ? 'μg' : std.unit;
        ulText = `${std.ul.toLocaleString()}${displayUnit}`;
      }
    }
  }

  // 소아·어린이 연령별 2025 KDRIs 상한섭취량(UL) 계산
  let childUlText: string | null = null;
  let childUlNote: string | undefined = undefined;
  let childAgeRows: { ageLabel: string; ulText: string; ulValue: number }[] | undefined = undefined;

  if (standardKey) {
    if (standardKey === 'ZINC') {
      childUlText = '6~19mg (1~11세)';
      childUlNote = '2025 KDRIs 아연 연령별 상한섭취량: 1~2세 6mg, 3~5세 9mg, 6~8세 13mg, 9~11세 19mg, 12~14세 27mg, 15~18세 33mg (성인 35mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '6mg', ulValue: 6 },
        { ageLabel: '3~5세', ulText: '9mg', ulValue: 9 },
        { ageLabel: '6~8세', ulText: '13mg', ulValue: 13 },
        { ageLabel: '9~11세', ulText: '19mg', ulValue: 19 },
        { ageLabel: '12~14세', ulText: '27mg', ulValue: 27 },
        { ageLabel: '15~18세', ulText: '33mg', ulValue: 33 },
        { ageLabel: '성인 (19세+)', ulText: '35mg', ulValue: 35 }
      ];
    } else if (standardKey === 'VITAMIN_B6') {
      childUlText = '10~30mg (1~11세)';
      childUlNote = '2025 KDRIs 비타민 B6 연령별 상한섭취량: 1~2세 10mg, 3~5세 15mg, 6~8세 20mg, 9~11세 30mg, 12~14세 40mg, 15~18세 45mg (성인 50mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '10mg', ulValue: 10 },
        { ageLabel: '3~5세', ulText: '15mg', ulValue: 15 },
        { ageLabel: '6~8세', ulText: '20mg', ulValue: 20 },
        { ageLabel: '9~11세', ulText: '30mg', ulValue: 30 },
        { ageLabel: '12~14세', ulText: '40mg', ulValue: 40 },
        { ageLabel: '15~18세', ulText: '45mg', ulValue: 45 },
        { ageLabel: '성인 (19세+)', ulText: '50mg', ulValue: 50 }
      ];
    } else if (standardKey === 'VITAMIN_B3') {
      const fullCheckStr = `${normEng} ${rawInn} ${ing.koreanName || ''} ${ing.chemicalFormName || ''}`.toLowerCase();
      const isNicotinicAcid =
        (normEng.includes('nicotinicacid') ||
          (fullCheckStr.includes('니코틴산') && !fullCheckStr.includes('아미드'))) &&
        !normEng.includes('nicotinamide') &&
        !normEng.includes('niacinamide') &&
        !fullCheckStr.includes('아미드');

      if (isNicotinicAcid) {
        childUlText = '10~20mg (1~11세, 산 형태)';
        childUlNote = '2025 KDRIs 니코틴산(Nicotinic acid) 연령별 상한섭취량: 1~5세 10mg, 6~8세 15mg, 9~11세 20mg, 12~14세 25mg, 15~18세 30mg (성인 35mg)';
        childAgeRows = [
          { ageLabel: '1~5세', ulText: '10mg', ulValue: 10 },
          { ageLabel: '6~8세', ulText: '15mg', ulValue: 15 },
          { ageLabel: '9~11세', ulText: '20mg', ulValue: 20 },
          { ageLabel: '12~14세', ulText: '25mg', ulValue: 25 },
          { ageLabel: '15~18세', ulText: '30mg', ulValue: 30 },
          { ageLabel: '성인 (19세+)', ulText: '35mg', ulValue: 35 }
        ];
      } else {
        childUlText = '150~450mg (1~11세)';
        childUlNote = '2025 KDRIs 니코틴산아미드(Nicotinamide) 연령별 상한섭취량: 1~2세 150mg, 3~5세 200mg, 6~8세 300mg, 9~11세 450mg, 12~14세 600mg, 15~18세 650mg (성인 850mg)';
        childAgeRows = [
          { ageLabel: '1~2세', ulText: '150mg', ulValue: 150 },
          { ageLabel: '3~5세', ulText: '200mg', ulValue: 200 },
          { ageLabel: '6~8세', ulText: '300mg', ulValue: 300 },
          { ageLabel: '9~11세', ulText: '450mg', ulValue: 450 },
          { ageLabel: '12~14세', ulText: '600mg', ulValue: 600 },
          { ageLabel: '15~18세', ulText: '650mg', ulValue: 650 },
          { ageLabel: '성인 (19세+)', ulText: '850mg', ulValue: 850 }
        ];
      }
    } else if (standardKey === 'VITAMIN_A') {
      childUlText = '600~1,600μg (1~11세)';
      childUlNote = '2025 KDRIs 비타민 A 연령별 상한섭취량: 1~2세 600μg, 3~5세 750μg, 6~8세 1,100μg, 9~11세 1,600μg, 12~14세 2,300μg, 15~18세 2,800μg (성인 3,000μg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '600μg', ulValue: 600 },
        { ageLabel: '3~5세', ulText: '750μg', ulValue: 750 },
        { ageLabel: '6~8세', ulText: '1,100μg', ulValue: 1100 },
        { ageLabel: '9~11세', ulText: '1,600μg', ulValue: 1600 },
        { ageLabel: '12~14세', ulText: '2,300μg', ulValue: 2300 },
        { ageLabel: '15~18세', ulText: '2,800μg', ulValue: 2800 },
        { ageLabel: '성인 (19세+)', ulText: '3,000μg', ulValue: 3000 }
      ];
    } else if (standardKey === 'VITAMIN_D') {
      childUlText = '1,200~2,400IU (1~11세)';
      childUlNote = '2025 KDRIs 비타민 D 연령별 상한섭취량: 1~2세 30μg(1,200IU), 3~5세 35μg(1,400IU), 6~8세 40μg(1,600IU), 9~11세 60μg(2,400IU), 12세 이상 100μg(4,000IU)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '1,200IU', ulValue: 30 },
        { ageLabel: '3~5세', ulText: '1,400IU', ulValue: 35 },
        { ageLabel: '6~8세', ulText: '1,600IU', ulValue: 40 },
        { ageLabel: '9~11세', ulText: '2,400IU', ulValue: 60 },
        { ageLabel: '12세 이상', ulText: '4,000IU (100μg)', ulValue: 100 }
      ];
    } else if (standardKey === 'VITAMIN_C') {
      childUlText = '400~1,200mg (1~11세)';
      childUlNote = '2025 KDRIs 비타민 C 연령별 상한섭취량: 1~2세 400mg, 3~5세 600mg, 6~8세 900mg, 9~11세 1,200mg, 12~14세 1,600mg, 15~18세 1,800mg (성인 2,000mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '400mg', ulValue: 400 },
        { ageLabel: '3~5세', ulText: '600mg', ulValue: 600 },
        { ageLabel: '6~8세', ulText: '900mg', ulValue: 900 },
        { ageLabel: '9~11세', ulText: '1,200mg', ulValue: 1200 },
        { ageLabel: '12~14세', ulText: '1,600mg', ulValue: 1600 },
        { ageLabel: '성인 (19세+)', ulText: '2,000mg', ulValue: 2000 }
      ];
    } else if (standardKey === 'VITAMIN_B9') {
      childUlText = '300~700μg (1~11세)';
      childUlNote = '2025 KDRIs 엽산 연령별 상한섭취량: 1~2세 300μg, 3~5세 400μg, 6~8세 500μg, 9~11세 700μg, 12~14세 800μg, 15~18세 900μg (성인 1,000μg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '300μg', ulValue: 300 },
        { ageLabel: '3~5세', ulText: '400μg', ulValue: 400 },
        { ageLabel: '6~8세', ulText: '500μg', ulValue: 500 },
        { ageLabel: '9~11세', ulText: '700μg', ulValue: 700 },
        { ageLabel: '12~14세', ulText: '800μg', ulValue: 800 },
        { ageLabel: '성인 (19세+)', ulText: '1,000μg', ulValue: 1000 }
      ];
    } else if (standardKey === 'CALCIUM') {
      childUlText = '1,500~2,500mg (1~8세)';
      childUlNote = '2025 KDRIs 칼슘 연령별 상한섭취량: 1~2세 1,500mg, 3~5세 2,000mg, 6~8세 2,500mg, 9~18세 3,000mg (성인 2,500mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '1,500mg', ulValue: 1500 },
        { ageLabel: '3~5세', ulText: '2,000mg', ulValue: 2000 },
        { ageLabel: '6~8세', ulText: '2,500mg', ulValue: 2500 },
        { ageLabel: '9~18세', ulText: '3,000mg', ulValue: 3000 },
        { ageLabel: '성인 (19세+)', ulText: '2,500mg', ulValue: 2500 }
      ];
    } else if (standardKey === 'IRON') {
      childUlText = '40mg (1~14세)';
      childUlNote = '2025 KDRIs 철 연령별 상한섭취량: 1~14세 40mg, 15세 이상 45mg';
      childAgeRows = [
        { ageLabel: '1~14세', ulText: '40mg', ulValue: 40 },
        { ageLabel: '15세 이상', ulText: '45mg', ulValue: 45 }
      ];
    } else if (standardKey === 'MAGNESIUM') {
      childUlText = '65~230mg (1~11세)';
      childUlNote = '2025 KDRIs 마그네슘 연령별 상한섭취량: 1~2세 65mg, 3~5세 110mg, 6~8세 160mg, 9~11세 230mg, 12~14세 310mg (성인 350mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '65mg', ulValue: 65 },
        { ageLabel: '3~5세', ulText: '110mg', ulValue: 110 },
        { ageLabel: '6~8세', ulText: '160mg', ulValue: 160 },
        { ageLabel: '9~11세', ulText: '230mg', ulValue: 230 },
        { ageLabel: '12~14세', ulText: '310mg', ulValue: 310 },
        { ageLabel: '성인 (19세+)', ulText: '350mg', ulValue: 350 }
      ];
    } else if (standardKey === 'SELENIUM') {
      childUlText = '60~230μg (1~11세)';
      childUlNote = '2025 KDRIs 셀레늄 연령별 상한섭취량: 1~2세 60μg, 3~5세 90μg, 6~8세 150μg, 9~11세 230μg, 12~14세 320μg (성인 400μg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '60μg', ulValue: 60 },
        { ageLabel: '3~5세', ulText: '90μg', ulValue: 90 },
        { ageLabel: '6~8세', ulText: '150μg', ulValue: 150 },
        { ageLabel: '9~11세', ulText: '230μg', ulValue: 230 },
        { ageLabel: '12~14세', ulText: '320μg', ulValue: 320 },
        { ageLabel: '성인 (19세+)', ulText: '400μg', ulValue: 400 }
      ];
    } else if (standardKey === 'COPPER') {
      childUlText = '1~4mg (1~11세)';
      childUlNote = '2025 KDRIs 구리 연령별 상한섭취량: 1~2세 1mg, 3~5세 2mg, 6~8세 3mg, 9~11세 4mg, 12~14세 6mg, 15~18세 8mg (성인 10mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '1mg', ulValue: 1 },
        { ageLabel: '3~5세', ulText: '2mg', ulValue: 2 },
        { ageLabel: '6~8세', ulText: '3mg', ulValue: 3 },
        { ageLabel: '9~11세', ulText: '4mg', ulValue: 4 },
        { ageLabel: '12~14세', ulText: '6mg', ulValue: 6 },
        { ageLabel: '15~18세', ulText: '8mg', ulValue: 8 },
        { ageLabel: '성인 (19세+)', ulText: '10mg', ulValue: 10 }
      ];
    } else if (standardKey === 'MANGANESE') {
      childUlText = '2~6mg (1~11세)';
      childUlNote = '2025 KDRIs 망간 연령별 상한섭취량: 1~2세 2mg, 3~5세 3mg, 6~8세 4mg, 9~11세 6mg, 12~14세 8mg, 15~18세 10mg (성인 11mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '2mg', ulValue: 2 },
        { ageLabel: '3~5세', ulText: '3mg', ulValue: 3 },
        { ageLabel: '6~8세', ulText: '4mg', ulValue: 4 },
        { ageLabel: '9~11세', ulText: '6mg', ulValue: 6 },
        { ageLabel: '12~14세', ulText: '8mg', ulValue: 8 },
        { ageLabel: '15~18세', ulText: '10mg', ulValue: 10 },
        { ageLabel: '성인 (19세+)', ulText: '11mg', ulValue: 11 }
      ];
    } else if (standardKey === 'IODINE') {
      childUlText = '250~700μg (1~11세)';
      childUlNote = '2025 KDRIs 요오드 연령별 상한섭취량: 1~2세 250μg, 3~5세 300μg, 6~8세 450μg, 9~11세 700μg, 12~14세 1,200μg, 15~18세 1,800μg (성인 2,400μg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '250μg', ulValue: 250 },
        { ageLabel: '3~5세', ulText: '300μg', ulValue: 300 },
        { ageLabel: '6~8세', ulText: '450μg', ulValue: 450 },
        { ageLabel: '9~11세', ulText: '700μg', ulValue: 700 },
        { ageLabel: '12~14세', ulText: '1,200μg', ulValue: 1200 },
        { ageLabel: '15~18세', ulText: '1,800μg', ulValue: 1800 },
        { ageLabel: '성인 (19세+)', ulText: '2,400μg', ulValue: 2400 }
      ];
    } else if (standardKey === 'MOLYBDENUM') {
      childUlText = '60~220μg (1~11세)';
      childUlNote = '2025 KDRIs 몰리브덴 연령별 상한섭취량: 1~2세 60μg, 3~5세 100μg, 6~8세 150μg, 9~11세 220μg, 12~14세 350μg, 15~18세 450μg (성인 600μg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '60μg', ulValue: 60 },
        { ageLabel: '3~5세', ulText: '100μg', ulValue: 100 },
        { ageLabel: '6~8세', ulText: '150μg', ulValue: 150 },
        { ageLabel: '9~11세', ulText: '220μg', ulValue: 220 },
        { ageLabel: '12~14세', ulText: '350μg', ulValue: 350 },
        { ageLabel: '15~18세', ulText: '450μg', ulValue: 450 },
        { ageLabel: '성인 (19세+)', ulText: '600μg', ulValue: 600 }
      ];
    } else if (standardKey === 'VITAMIN_E') {
      childUlText = '100~350mg (1~11세)';
      childUlNote = '2025 KDRIs 비타민 E 연령별 상한섭취량: 1~2세 100mg(150IU), 3~5세 150mg(220IU), 6~8세 250mg(370IU), 9~11세 350mg(520IU), 12세 이상 540mg(800IU)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '100mg', ulValue: 100 },
        { ageLabel: '3~5세', ulText: '150mg', ulValue: 150 },
        { ageLabel: '6~8세', ulText: '250mg', ulValue: 250 },
        { ageLabel: '9~11세', ulText: '350mg', ulValue: 350 },
        { ageLabel: '12세 이상', ulText: '540mg (800IU)', ulValue: 540 }
      ];
    } else if (standardKey === 'CHOLINE') {
      childUlText = '700~1,500mg (1~11세)';
      childUlNote = '2025 KDRIs 콜린 연령별 상한섭취량: 1~2세 700mg, 3~8세 1,000mg, 9~11세 1,500mg, 12~14세 2,000mg, 15~18세 2,000mg (성인 2,500mg)';
      childAgeRows = [
        { ageLabel: '1~2세', ulText: '700mg', ulValue: 700 },
        { ageLabel: '3~5세', ulText: '1,000mg', ulValue: 1000 },
        { ageLabel: '6~8세', ulText: '1,000mg', ulValue: 1000 },
        { ageLabel: '9~11세', ulText: '1,500mg', ulValue: 1500 },
        { ageLabel: '12~14세', ulText: '2,000mg', ulValue: 2000 },
        { ageLabel: '15~18세', ulText: '2,000mg', ulValue: 2000 },
        { ageLabel: '성인 (19세+)', ulText: '2,500mg', ulValue: 2500 }
      ];
    }
  }

  // 6. 정렬 그룹 결정 (1: 비타민 -> 2: 미네랄 -> 3: 콜린 -> 4: 기타 성분)
  const VITAMIN_CATEGORIES = new Set([
    '비타민A',
    '베타카로틴',
    '비타민B1',
    '비타민B2',
    '비타민B3',
    '비타민B5',
    '비타민B6',
    '비타민B7',
    '엽산',
    '비타민B9',
    '비타민B9(엽산)',
    '비타민B12',
    '기타 비타민B',
    '비타민B군',
    '비타민C',
    '비타민D',
    '비타민D2',
    '비타민D3',
    '비타민E',
    '비타민K',
    '비타민K1',
    '비타민K2'
  ]);

  const MINERAL_CATEGORIES = new Set([
    '칼슘',
    '칼슘(Ca)',
    '마그네슘',
    '마그네슘(Mg)',
    '아연',
    '아연(Zn)',
    '철',
    '철(Fe)',
    '제1철',
    '제2철',
    '제1철 (Ferrous)',
    '제2철 (Ferric)',
    '셀레늄',
    '셀레늄(Se)',
    '구리',
    '구리(Cu)',
    '동(Cu)',
    '망간',
    '망간(Mn)',
    '크롬',
    '크롬(Cr)',
    '몰리브덴',
    '몰리브덴(Mo)',
    '요오드',
    '요오드(I)',
    '칼륨',
    '칼륨(K)',
    '인',
    '인(P)',
    '무기질(Mineral)제제',
    '미네랄'
  ]);

  const checkText = `${categoryTag} ${englishName} ${rawInn}`.toLowerCase();
  let sortGroup: 1 | 2 | 3 | 4 = 4;

  if (categoryTag === '콜린' || /choline|콜린/i.test(checkText)) {
    sortGroup = 3;
  } else if (VITAMIN_CATEGORIES.has(categoryTag)) {
    sortGroup = 1;
  } else if (MINERAL_CATEGORIES.has(categoryTag)) {
    sortGroup = 2;
  } else {
    if (
      /retinol|retinyl|carotene|thiamin|benfotiamin|fursultiamin|riboflavin|niacin|nicotinamid|pantothen|pyridox|biotin|folic|folate|cobalamin|cyanocobalamin|ascorb|cholecalciferol|ergocalciferol|tocopher|phylloquin|menaquin|vitamin/i.test(
        checkText
      )
    ) {
      sortGroup = 1;
    } else if (
      /calcium|magnesium|zinc|iron|ferrous|ferric|selenium|copper|cupric|manganese|chromium|molybdenum|iodine|potassium/i.test(
        checkText
      )
    ) {
      sortGroup = 2;
    }
  }

  // 비타민 그룹 내 정렬 순서 (기존 성분표 순서: A -> B1..B12 -> 기타B -> C -> D -> E -> K)
  let subOrder: number | undefined = undefined;
  if (sortGroup === 1) {
    if (categoryTag === '비타민A' || categoryTag === '베타카로틴' || /retinol|retinyl|palmitate|carotene/i.test(checkText)) {
      subOrder = 10;
    } else if (categoryTag === '비타민B1' || /thiamin|benfotiamin|fursultiamin|bisbentiamin/i.test(checkText)) {
      subOrder = 21;
    } else if (categoryTag === '비타민B2' || /riboflavin/i.test(checkText)) {
      subOrder = 22;
    } else if (categoryTag === '비타민B3' || /nicotinamid|niacin|nicotinic/i.test(checkText)) {
      subOrder = 23;
    } else if (categoryTag === '비타민B5' || /pantothen/i.test(checkText)) {
      subOrder = 25;
    } else if (categoryTag === '비타민B6' || /pyridox/i.test(checkText)) {
      subOrder = 26;
    } else if (categoryTag === '비타민B7' || /biotin/i.test(checkText)) {
      subOrder = 27;
    } else if (
      categoryTag === '엽산' ||
      categoryTag === '비타민B9' ||
      categoryTag === '비타민B9(엽산)' ||
      categoryTag === '폴산' ||
      /folic|folate/i.test(checkText)
    ) {
      subOrder = 29;
    } else if (categoryTag === '비타민B12' || /cobalamin|cyanocobalamin|mecobalamin/i.test(checkText)) {
      subOrder = 32;
    } else if (categoryTag === '기타 비타민B' || categoryTag === '비타민B군' || /inositol/i.test(checkText)) {
      subOrder = 35;
    } else if (categoryTag === '비타민C' || /ascorb/i.test(checkText)) {
      subOrder = 40;
    } else if (categoryTag.startsWith('비타민D') || /cholecalciferol|ergocalciferol|vitamin d/i.test(checkText)) {
      subOrder = 50;
    } else if (categoryTag === '비타민E' || /tocopher/i.test(checkText)) {
      subOrder = 60;
    } else if (categoryTag.startsWith('비타민K') || /phylloquin|menaquin|vitamin k/i.test(checkText)) {
      subOrder = 70;
    } else {
      subOrder = 99;
    }
  }

  const chemicalFormFeature = analyzeChemicalFormFeature(
    ing.chemicalFormName || meta?.chemicalFormName || '',
    categoryTag,
    englishName,
    rawInn
  );

  return {
    englishName,
    categoryTag,
    convertedAmount,
    convertedUnit,
    convertedLabel,
    convertedText,
    ulText,
    ulNote,
    childUlText,
    childUlNote,
    childAgeRows,
    chemicalFormFeature,
    sortGroup,
    subOrder
  };
}

/**
 * 제품 성분 배열 정렬 함수:
 * 1) 대분류: 비타민 -> 미네랄 -> 콜린 -> 기타 성분 순
 * 2) 비타민: 기존 성분표 순서 (비타민 A -> B1 -> B2 -> B3(나이아신) -> B5(판토텐산) -> B6 -> B7(비오틴) -> B9(엽산) -> B12 -> 기타B -> C -> D -> E -> K)
 * 3) 미네랄: 영문 성분명 abc 알파벳순 (Calcium -> Copper -> Iodine -> Iron -> Magnesium -> Manganese -> Molybdenum -> Selenium -> Zinc)
 * 4) 콜린 (미네랄 다음)
 * 5) 기타 성분: 영문 성분명 abc 알파벳순
 * (동일 비타민군 내부에서도 영문 성분명 abc 알파벳순)
 */
export function sortProductIngredients(
  ingredients: ProductIngredientEntry[],
  productName?: string
): ProductIngredientEntry[] {
  return [...ingredients].sort((a, b) => {
    const infoA = resolveIngredientDisplayInfo(a, productName);
    const infoB = resolveIngredientDisplayInfo(b, productName);

    // 1차: 대분류 비교 (1: 비타민 -> 2: 미네랄 -> 3: 콜린 -> 4: 기타 성분)
    if (infoA.sortGroup !== infoB.sortGroup) {
      return infoA.sortGroup - infoB.sortGroup;
    }

    // 2차: 비타민 그룹 내에서는 비타민 순서 (A -> B1..B12 -> 기타B -> C -> D -> E -> K)
    if (infoA.sortGroup === 1 && infoA.subOrder !== infoB.subOrder) {
      return (infoA.subOrder ?? 999) - (infoB.subOrder ?? 999);
    }

    // 3차: 각 세부 분류 내, 미네랄, 기타 성분은 영문 성분명 abc 알파벳순
    return infoA.englishName.localeCompare(infoB.englishName, 'en', { sensitivity: 'base' });
  });
}


