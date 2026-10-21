import React, { useState, useEffect } from 'react';
import { ProductItem, AttachedDocument, isBackLabelAttachment, getProductThumbnail } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { useProductStore } from '../stores/useProductStore';
import {
  fetchMfdsDrugDetail,
  searchPublicDrugDatabase,
  convertMasterItemToFetchResult,
  fetchFoodSafetyC003RawByReportNo,
  fetchFoodSafetyI1250RawByReportNo,
  parseImportedKoreanLabel,
  parseImportedNutritionFacts,
  formatImportedLabelText
} from '../services/publicDataService';
import { AttachedDocumentsModal } from './AttachedDocumentsModal';
import {
  resolveIngredientDisplayInfo,
  sortProductIngredients,
  cleanChemicalFormName,
  scaleIngredientInfoText
} from '../utils/innMapper';
import { getDarkCategoryBadgeStyle } from '../utils/categoryColors';
import { recognizeUniversalDocument, fileToDataUrl, isMeaningfulKoreanText } from '../services/labelOcrService';
import {
  summarizePrecautions,
  getPrecautionHighlightKeywords
} from '../utils/precautionsHelper';
import {
  resolveFunctionalClaimsWithNutrients,
  deduplicatePrecautionsText,
  splitDescriptionPoints
} from '../utils/functionalClaimsHelper';
import {
  isProbioticIngredient,
  extractProbioticCount,
  extractProbioticStrains,
  scaleProbioticCount
} from '../utils/probioticsHelper';

import {
  X,
  Edit3,
  Trash2,
  Paperclip,
  MapPin,
  AlertCircle,
  FileText,
  RefreshCw,
  Camera,
  Upload,
  Loader2,
  Sparkles,
  Baby,
  Activity,
  Shield,
  Heart,
  Eye,
  Leaf,
  CheckCircle2,
  ExternalLink,
  StickyNote,
  Check,
  Save,
  Highlighter
} from 'lucide-react';

interface ProductDetailModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProduct: (product: ProductItem) => void;
}

/**
 * 건강기능식품(HEALTH_FUNCTIONAL_FOOD) 전용:
 * 식약처 건강기능식품 공전 고시형/개별인정형 원료별 공식 고시 기능성 사전
 */
const MFDS_NOTIFIED_FUNCTIONALITY_DICTIONARY: {
  matchKeys: string[];
  koreanTitle: string;
  functionality: string;
}[] = [
  {
    matchKeys: ['benfotiamine', 'fursultiamine', 'bisbentiamine', 'bisbenthiamine', 'thiamine', 'vitamin b1', '비타민b1', '티아민'],
    koreanTitle: '비타민B1',
    functionality: '탄수화물과 에너지 대사에 필요.'
  },
  {
    matchKeys: ['riboflavin', 'vitamin b2', '비타민b2', '리보플라빈'],
    koreanTitle: '비타민B2',
    functionality: '체내 에너지 생성에 필요.'
  },
  {
    matchKeys: ['nicotinamide', 'niacin', 'nicotinic acid', 'vitamin b3', '나이아신', '니코틴산아미드'],
    koreanTitle: '나이아신',
    functionality: '체내 에너지 생성에 필요.'
  },
  {
    matchKeys: ['pantothenate', 'pantothenic', 'vitamin b5', '판토텐산'],
    koreanTitle: '판토텐산',
    functionality: '지방, 탄수화물, 단백질 대사와 에너지 생성에 필요.'
  },
  {
    matchKeys: ['pyridoxine', 'pyridoxal', 'vitamin b6', '비타민b6', '피리독신'],
    koreanTitle: '비타민B6',
    functionality: '단백질 및 아미노산 이용에 필요, 혈액의 호모시스테인 수준을 정상으로 유지하는데 필요.'
  },
  {
    matchKeys: ['folic acid', 'folate', 'vitamin b9', '엽산'],
    koreanTitle: '엽산',
    functionality: '세포와 혈액생성에 필요, 태아 신경관의 정상 발달에 필요, 혈액의 호모시스테인 수준을 정상으로 유지하는데 필요.'
  },
  {
    matchKeys: ['cobalamin', 'mecobalamin', 'cyanocobalamin', 'hydroxocobalamin', 'vitamin b12', '비타민b12', '코발라민'],
    koreanTitle: '비타민B12',
    functionality: '정상적인 엽산 대사에 필요.'
  },
  {
    matchKeys: ['biotin', 'vitamin b7', '비오틴'],
    koreanTitle: '비오틴',
    functionality: '지방, 탄수화물, 단백질 대사와 에너지 생성에 필요.'
  },
  {
    matchKeys: ['ascorbic', 'ascorbate', 'vitamin c', '비타민c', '아스코르브산'],
    koreanTitle: '비타민C',
    functionality: '결합조직 형성과 기능유지에 필요, 철의 흡수에 필요, 항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요.'
  },
  {
    matchKeys: ['cholecalciferol', 'ergocalciferol', 'vitamin d', '비타민d', '콜레칼시페롤'],
    koreanTitle: '비타민D',
    functionality: '칼슘과 인이 흡수되고 이용되는데 필요, 뼈의 형성과 유지에 필요, 골다공증발생 위험 감소에 도움을 줌.'
  },
  {
    matchKeys: ['tocopherol', 'vitamin e', '비타민e', '토코페롤'],
    koreanTitle: '비타민E',
    functionality: '항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요.'
  },
  {
    matchKeys: ['retinol', 'retinyl', 'palmitate', 'vitamin a', '비타민a', '레티놀'],
    koreanTitle: '비타민A',
    functionality: '어두운 곳에서 시각 적응을 위해 필요, 피부와 점막을 형성하고 기능을 유지하는데 필요, 상피세포의 성장과 발달에 필요.'
  },
  {
    matchKeys: ['beta-carotene', 'betacarotene', '베타카로틴'],
    koreanTitle: '베타카로틴',
    functionality: '어두운 곳에서 시각 적응을 위해 필요, 피부와 점막을 형성하고 기능을 유지하는데 필요, 상피세포의 성장과 발달에 필요.'
  },
  {
    matchKeys: ['phylloquinone', 'menaquinone', 'vitamin k', '비타민k', '필로퀴논', '메나퀴논'],
    koreanTitle: '비타민K',
    functionality: '정상적인 혈액응고에 필요, 뼈의 구성에 필요.'
  },
  {
    matchKeys: ['zinc', '아연', '산화아연', '글루콘산아연'],
    koreanTitle: '아연',
    functionality: '정상적인 면역기능에 필요, 정상적인 세포분열에 필요.'
  },
  {
    matchKeys: ['magnesium', '마그네슘', '산화마그네슘'],
    koreanTitle: '마그네슘',
    functionality: '에너지 이용에 필요, 신경과 근육 기능 유지에 필요.'
  },
  {
    matchKeys: ['calcium', '칼슘', '탄산칼슘', '구연산칼슘'],
    koreanTitle: '칼슘',
    functionality: '뼈와 치아 형성에 필요, 신경과 근육 기능 유지에 필요, 정상적인 혈액응고에 필요, 골다공증발생 위험 감소에 도움을 줌.'
  },
  {
    matchKeys: ['selenium', 'selenite', '셀레늄', '셀렌'],
    koreanTitle: '셀레늄(셀렌)',
    functionality: '유해산소로부터 세포를 보호하는데 필요.'
  },
  {
    matchKeys: ['iron', 'ferrous', 'ferric', '철', '푸마르산제일철'],
    koreanTitle: '철',
    functionality: '체내 산소운반과 혈액생성에 필요, 에너지 생성에 필요.'
  },
  {
    matchKeys: ['copper', 'cupric', '구리', '황산동'],
    koreanTitle: '구리',
    functionality: '철의 운반과 이용에 필요, 유해산소로부터 세포를 보호하는데 필요.'
  },
  {
    matchKeys: ['manganese', '망간', '황산망간'],
    koreanTitle: '망간',
    functionality: '뼈 형성에 필요, 에너지 이용에 필요, 유해산소로부터 세포를 보호하는데 필요.'
  },
  {
    matchKeys: ['chromium', '크롬'],
    koreanTitle: '크롬',
    functionality: '체내 탄수화물, 지방, 단백질 대사에 관여.'
  },
  {
    matchKeys: ['molybdenum', '몰리브덴'],
    koreanTitle: '몰리브덴',
    functionality: '산화·환원효소의 활성에 필요.'
  },
  {
    matchKeys: ['iodine', 'iodide', '요오드'],
    koreanTitle: '요오드',
    functionality: '갑상선 호르몬의 합성에 필요, 에너지 생성에 필요, 신경발달에 필요.'
  },
  {
    matchKeys: ['probiotics', 'lactobacillus', 'bifidobacterium', '프로바이오틱스', '유산균'],
    koreanTitle: '프로바이오틱스',
    functionality: '유산균 증식 및 유해균 억제에 도움을 줄 수 있음, 배변활동 원활에 도움을 줄 수 있음, 장 건강에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['silymarin', 'milk thistle', '밀크씨슬', '실리마린', '카르두스마리아누스'],
    koreanTitle: '밀크씨슬추출물(실리마린)',
    functionality: '간 건강에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['lutein', 'marigold', 'zeaxanthin', '루테인', '마리골드꽃추출물', '지아잔틴'],
    koreanTitle: '마리골드꽃추출물(루테인)',
    functionality: '노화로 인해 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['omega-3', 'epa', 'dha', '오메가3', '어유'],
    koreanTitle: 'EPA 및 DHA 함유 유지',
    functionality: '혈중 중성지질 개선·혈행 개선·기억력 개선·건조한 눈을 개선하여 눈 건강에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['coenzyme q10', 'ubidecarenone', 'ubiquinone', '코엔자임q10', '유비데카레논'],
    koreanTitle: '코엔자임Q10',
    functionality: '항산화·높은 혈압 감소에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['ginsenoside', 'red ginseng', '홍삼', '진세노사이드'],
    koreanTitle: '홍삼',
    functionality: '면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['theanine', '테아닌'],
    koreanTitle: 'L-테아닌',
    functionality: '스트레스로 인한 긴장완화에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['banaba', 'corosolic', '바나바잎', '코로솔산'],
    koreanTitle: '바나바잎추출물',
    functionality: '식후 혈당상승 억제에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['msm', 'methylsulfonylmethane', '디메틸설폰', '엠에스엠'],
    koreanTitle: '엠에스엠(MSM)',
    functionality: '관절 및 연골건강에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['glucosamine', '글루코사민'],
    koreanTitle: '글루코사민',
    functionality: '관절 및 연골건강에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['saw palmetto', 'lauric acid', '쏘팔메토', '로르산'],
    koreanTitle: '쏘팔메토열매추출물',
    functionality: '전립선 건강의 유지에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['ginkgo', '은행잎'],
    koreanTitle: '은행잎추출물',
    functionality: '기억력 개선·혈행 개선에 도움을 줄 수 있음.'
  },
  {
    matchKeys: ['propolis', '프로폴리스'],
    koreanTitle: '프로폴리스추출물',
    functionality: '항산화·구강에서의 항균작용에 도움을 줄 수 있음.'
  }
];

export interface UnifiedKdriUlReferenceItem {
  id: string;
  nutrientName: string;
  age1_2: string;
  age3_5: string;
  age6_8: string;
  age9_11: string;
  age12_14: string;
  age15_18: string;
  adult: string;      // 성인 (19~64세)
  elderly: string;    // 노인 (65세+)
  pregnant: string;   // 임신부
  lactating: string;  // 수유부
  isNoUl?: boolean;
}

export type PediatricUlReferenceItem = UnifiedKdriUlReferenceItem;

/**
 * 2025 보건복지부 · 한국영양학회 한국인 영양소 섭취기준(KDRIs)
 * 전 생애주기 (소아·청소년, 성인, 노인, 임신부, 수유부) 단일 통합 1일 상한섭취량(UL) 기준표 (23종 표준 성분)
 * 정렬: 비타민 A~K -> 미네랄 (칼슘~아연) -> 콜린
 */
export const KDRI_2025_UNIFIED_UL_REFERENCE_TABLE: UnifiedKdriUlReferenceItem[] = [
  {
    id: 'vitA',
    nutrientName: '비타민 A',
    age1_2: '600 μg',
    age3_5: '750 μg',
    age6_8: '1,100 μg',
    age9_11: '1,600 μg',
    age12_14: '2,300 μg',
    age15_18: '2,800 μg',
    adult: '3,000 μg (10,000 IU)',
    elderly: '3,000 μg',
    pregnant: '3,000 μg',
    lactating: '3,000 μg'
  },
  {
    id: 'thiamine',
    nutrientName: '비타민 B₁',
    age1_2: '-',
    age3_5: '-',
    age6_8: '-',
    age9_11: '-',
    age12_14: '-',
    age15_18: '-',
    adult: '-',
    elderly: '-',
    pregnant: '-',
    lactating: '-',
    isNoUl: true
  },
  {
    id: 'riboflavin',
    nutrientName: '비타민 B₂',
    age1_2: '-',
    age3_5: '-',
    age6_8: '-',
    age9_11: '-',
    age12_14: '-',
    age15_18: '-',
    adult: '-',
    elderly: '-',
    pregnant: '-',
    lactating: '-',
    isNoUl: true
  },
  {
    id: 'nicotinamide',
    nutrientName: '나이아신',
    age1_2: '150 mg',
    age3_5: '200 mg',
    age6_8: '300 mg',
    age9_11: '450 mg',
    age12_14: '600 mg',
    age15_18: '650 mg',
    adult: '850 mg',
    elderly: '850 mg',
    pregnant: '850 mg',
    lactating: '850 mg'
  },
  {
    id: 'pantothenic_acid',
    nutrientName: '판토텐산',
    age1_2: '-',
    age3_5: '-',
    age6_8: '-',
    age9_11: '-',
    age12_14: '-',
    age15_18: '-',
    adult: '-',
    elderly: '-',
    pregnant: '-',
    lactating: '-',
    isNoUl: true
  },
  {
    id: 'pyridoxine',
    nutrientName: '비타민 B₆',
    age1_2: '10 mg',
    age3_5: '15 mg',
    age6_8: '20 mg',
    age9_11: '30 mg',
    age12_14: '40 mg',
    age15_18: '45 mg',
    adult: '50 mg',
    elderly: '50 mg',
    pregnant: '50 mg',
    lactating: '50 mg'
  },
  {
    id: 'biotin',
    nutrientName: '비오틴',
    age1_2: '-',
    age3_5: '-',
    age6_8: '-',
    age9_11: '-',
    age12_14: '-',
    age15_18: '-',
    adult: '-',
    elderly: '-',
    pregnant: '-',
    lactating: '-',
    isNoUl: true
  },
  {
    id: 'folic_acid',
    nutrientName: '엽산',
    age1_2: '300 μg',
    age3_5: '400 μg',
    age6_8: '500 μg',
    age9_11: '700 μg',
    age12_14: '800 μg',
    age15_18: '900 μg',
    adult: '1,000 μg',
    elderly: '1,000 μg',
    pregnant: '1,000 μg',
    lactating: '1,000 μg'
  },
  {
    id: 'cyanocobalamin',
    nutrientName: '비타민 B₁₂',
    age1_2: '-',
    age3_5: '-',
    age6_8: '-',
    age9_11: '-',
    age12_14: '-',
    age15_18: '-',
    adult: '-',
    elderly: '-',
    pregnant: '-',
    lactating: '-',
    isNoUl: true
  },
  {
    id: 'ascorbic_acid',
    nutrientName: '비타민 C',
    age1_2: '400 mg',
    age3_5: '600 mg',
    age6_8: '900 mg',
    age9_11: '1,200 mg',
    age12_14: '1,600 mg',
    age15_18: '1,800 mg',
    adult: '2,000 mg',
    elderly: '2,000 mg',
    pregnant: '2,000 mg',
    lactating: '2,000 mg'
  },
  {
    id: 'vitD',
    nutrientName: '비타민 D',
    age1_2: '1,200 IU',
    age3_5: '1,400 IU',
    age6_8: '1,600 IU',
    age9_11: '2,400 IU',
    age12_14: '4,000 IU',
    age15_18: '4,000 IU',
    adult: '4,000 IU (100 μg)',
    elderly: '4,000 IU',
    pregnant: '4,000 IU',
    lactating: '4,000 IU'
  },
  {
    id: 'vitE',
    nutrientName: '비타민 E',
    age1_2: '100 mg',
    age3_5: '150 mg',
    age6_8: '250 mg',
    age9_11: '350 mg',
    age12_14: '540 mg',
    age15_18: '540 mg',
    adult: '540 mg (800 IU)',
    elderly: '540 mg',
    pregnant: '540 mg',
    lactating: '540 mg'
  },
  {
    id: 'vitK',
    nutrientName: '비타민 K',
    age1_2: '-',
    age3_5: '-',
    age6_8: '-',
    age9_11: '-',
    age12_14: '-',
    age15_18: '-',
    adult: '-',
    elderly: '-',
    pregnant: '-',
    lactating: '-',
    isNoUl: true
  },
  {
    id: 'calcium',
    nutrientName: '칼슘',
    age1_2: '1,500 mg',
    age3_5: '2,000 mg',
    age6_8: '2,500 mg',
    age9_11: '3,000 mg',
    age12_14: '3,000 mg',
    age15_18: '3,000 mg',
    adult: '2,500 mg',
    elderly: '2,000 mg',
    pregnant: '2,500 mg',
    lactating: '2,500 mg'
  },
  {
    id: 'copper',
    nutrientName: '구리',
    age1_2: '1 mg',
    age3_5: '2 mg',
    age6_8: '3 mg',
    age9_11: '4 mg',
    age12_14: '6 mg',
    age15_18: '8 mg',
    adult: '10 mg',
    elderly: '10 mg',
    pregnant: '10 mg',
    lactating: '10 mg'
  },
  {
    id: 'iodine',
    nutrientName: '요오드',
    age1_2: '250 μg',
    age3_5: '300 μg',
    age6_8: '450 μg',
    age9_11: '700 μg',
    age12_14: '1,200 μg',
    age15_18: '1,800 μg',
    adult: '2,400 μg',
    elderly: '2,400 μg',
    pregnant: '2,400 μg',
    lactating: '2,400 μg'
  },
  {
    id: 'iron',
    nutrientName: '철',
    age1_2: '40 mg',
    age3_5: '40 mg',
    age6_8: '40 mg',
    age9_11: '40 mg',
    age12_14: '40 mg',
    age15_18: '45 mg',
    adult: '45 mg',
    elderly: '45 mg',
    pregnant: '45 mg',
    lactating: '45 mg'
  },
  {
    id: 'magnesium',
    nutrientName: '마그네슘',
    age1_2: '65 mg',
    age3_5: '110 mg',
    age6_8: '160 mg',
    age9_11: '230 mg',
    age12_14: '310 mg',
    age15_18: '350 mg',
    adult: '350 mg',
    elderly: '350 mg',
    pregnant: '350 mg',
    lactating: '350 mg'
  },
  {
    id: 'manganese',
    nutrientName: '망간',
    age1_2: '2 mg',
    age3_5: '3 mg',
    age6_8: '4 mg',
    age9_11: '6 mg',
    age12_14: '8 mg',
    age15_18: '10 mg',
    adult: '11 mg',
    elderly: '11 mg',
    pregnant: '11 mg',
    lactating: '11 mg'
  },
  {
    id: 'molybdenum',
    nutrientName: '몰리브덴',
    age1_2: '60 μg',
    age3_5: '100 μg',
    age6_8: '150 μg',
    age9_11: '220 μg',
    age12_14: '350 μg',
    age15_18: '450 μg',
    adult: '500~600 μg',
    elderly: '500~600 μg',
    pregnant: '500 μg',
    lactating: '500 μg'
  },
  {
    id: 'selenium',
    nutrientName: '셀레늄',
    age1_2: '60 μg',
    age3_5: '90 μg',
    age6_8: '150 μg',
    age9_11: '230 μg',
    age12_14: '320 μg',
    age15_18: '380 μg',
    adult: '400 μg',
    elderly: '400 μg',
    pregnant: '400 μg',
    lactating: '400 μg'
  },
  {
    id: 'zinc',
    nutrientName: '아연',
    age1_2: '6 mg',
    age3_5: '9 mg',
    age6_8: '13 mg',
    age9_11: '19 mg',
    age12_14: '27 mg',
    age15_18: '33 mg',
    adult: '35 mg',
    elderly: '35 mg',
    pregnant: '35 mg',
    lactating: '35 mg'
  },
  {
    id: 'choline',
    nutrientName: '콜린',
    age1_2: '700 mg',
    age3_5: '1,000 mg',
    age6_8: '1,000 mg',
    age9_11: '1,500 mg',
    age12_14: '2,000 mg',
    age15_18: '2,000 mg',
    adult: '2,500~3,000 mg',
    elderly: '2,500~3,000 mg',
    pregnant: '2,500 mg',
    lactating: '2,500 mg'
  }
];

/**
 * 건강기능식품 기준 및 규격(STDR_STND) 텍스트에서 각 기능성분별 식약처 공식 1일 표시량을 파싱
 */
function parseStandardSpecificationAmounts(stdrText?: string): Map<string, number> {
  const map = new Map<string, number>();
  if (!stdrText) return map;
  const lines = stdrText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/^(?:\([0-9]+\)|[0-9]+[\.\)]|[①-⑳]|[-·•])\s*/, '').trim();
    if (!cleaned || !cleaned.includes('표시량')) continue;
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx === -1) continue;
    const leftPart = cleaned.slice(0, colonIdx).replace(/\([^)]*\)/g, '').trim();
    const rightPart = cleaned.slice(colonIdx + 1).trim();

    let m = rightPart.match(
      /표시량\s*[\(\{｛\[]?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:\([0-9,]+억\))?\s*(mgNE|NE|mg|ug|㎍|μg|µg|IU|g|CFU|억\s*CFU|억)?/i
    );
    if (!m) {
      m = rightPart.match(
        /([0-9,]+(?:\.[0-9]+)?)\s*(mgNE|NE|mg|ug|㎍|μg|µg|IU|g|CFU|억\s*CFU|억)?\s*(?:\/[0-9,]+[a-zA-Z가-힣]*)?\s*\(?\s*표시량/i
      );
    }
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        map.set(leftPart.replace(/\s+/g, '').toLowerCase(), val);
      }
    }
  }
  return map;
}

/**
 * 건강기능식품(건기식) 전용:
 * 각 성분의 식약처 고시된 기능성을 추출하여 "1) 성분명 : 고시된 기능성" 리스트로 반환
 */
export function buildHealthFunctionalFoodClaims(product: ProductItem): string[] {
  const resultList: string[] = [];
  const addedKeys = new Set<string>();

  // 1. 제품의 실제 배합 성분(product.ingredients) 각각에 대해 고시된 기능성 매칭
  product.ingredients.forEach((ing) => {
    const searchTarget = `${ing.englishInn} ${ing.koreanName || ''} ${ing.functionalCategory || ''} ${ing.chemicalFormName || ''}`.toLowerCase();

    const matched = MFDS_NOTIFIED_FUNCTIONALITY_DICTIONARY.find((entry) =>
      entry.matchKeys.some((k) => searchTarget.includes(k))
    );

    if (matched && !addedKeys.has(matched.koreanTitle)) {
      addedKeys.add(matched.koreanTitle);
      resultList.push(`${matched.koreanTitle} : ${matched.functionality}`);
    }
  });

  // 2. API 원문(PRIMARY_FNCLTY -> functionalClaimsKorean)에 [원료명] 또는 1) 형태로 들어있는 추가 고시 기능성 병합
  const rawClaims = product.functionalFoodDetail?.functionalClaimsKorean || [];
  rawClaims.forEach((claim) => {
    const lines = claim
      .split(/\r?\n|(?=\[\s*[가-힣A-Za-z0-9\s,·]+?\s*\])|(?=\d+\)\s*[가-힣A-Za-z])|(?=①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/)
      .map((s) => s.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      const cleaned = line
        .replace(/^\d+\)\s*/, '')
        .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
        .replace(/^\[([^\]]+)\]\s*/, '$1 : ')
        .trim();

      if (!cleaned || cleaned === '정상적인 면역 및 에너지 대사') return;

      // 이미 등록된 성분의 기능성과 중복되지 않는 경우만 추가
      const prefix = cleaned.split(':')[0]?.trim();
      if (prefix && addedKeys.has(prefix)) return;

      const isAlreadyIncluded = resultList.some(
        (existing) => existing.includes(cleaned) || (prefix && existing.startsWith(`${prefix} :`))
      );
      if (!isAlreadyIncluded) {
        if (prefix && cleaned.includes(':')) {
          addedKeys.add(prefix);
        }
        resultList.push(cleaned);
      }
    });
  });

  return resultList.map((item, idx) => {
    if (/^\d+\)/.test(item)) return item;
    return `${idx + 1}) ${item}`;
  });
}

/**
 * 효능·효과 전문을 상담 시 한눈에 파악하기 좋게 핵심 효능별로 요약
 */
function summarizeIndications(rawLines: string[]): string[] {
  if (!rawLines || rawLines.length === 0) return [];
  const fullText = rawLines.join('\n');
  const summarized: string[] = [];

  // 1. 피로/비타민 보급군
  if (/육체피로|체력저하|발육기|노년기|임신|수유기|비타민.*보급/i.test(fullText)) {
    summarized.push('육체피로 · 체력저하 시 비타민 보급 (임신·수유기, 발육기, 노년기)');
  }
  // 2. 통증 완화군
  if (/신경통|근육통|관절통|요통|어깨결림|각기/i.test(fullText)) {
    summarized.push('신경통 · 근육통 · 관절통(요통, 어깨결림) 및 각기 증상 완화');
  }
  // 3. 눈의 피로
  if (/눈의\s*피로|안구/i.test(fullText)) {
    summarized.push('눈의 피로 완화');
  }
  // 4. 구내염/피부 점막
  if (/구내염|구순염|구각염|설염|피부염|습진/i.test(fullText)) {
    summarized.push('구내염(입안염) · 설염(혀염) · 구순염 · 구각염 및 피부염 완화');
  }
  // 5. 뼈/치아/구루병
  if (/뼈.*치아|치아.*발육|구루병/i.test(fullText)) {
    summarized.push('뼈 · 치아 발육불량 및 구루병 예방');
  }
  // 6. 아연/면역
  if (/아연.*보급|면역.*기능|세포분열/i.test(fullText)) {
    summarized.push('면역 기능 정상화 및 아연 보급');
  }
  // 7. 간기능/해독/UDCA
  if (/간기능|간질환|이담|소화/i.test(fullText)) {
    summarized.push('간기능 개선 및 담즙 분비 촉진');
  }

  // 매칭된 표준 카테고리가 없는 경우 원본 텍스트를 문장 단위로 정제하여 상위 최대 4줄 추출
  if (summarized.length === 0) {
    const cleaned = rawLines
      .map((l) => l.replace(/^[\d+·\-\*\s]+/, '').trim())
      .filter((l) => l.length > 0 && !l.includes('첨부문서 참조'));
    return cleaned.slice(0, 4);
  }

  return summarized;
}

// 주의사항 요약 및 연령금기 추출은 src/utils/precautionsHelper.ts 에서 관리됩니다.


/**
 * 전문(Full Text)을 들여쓰기 구조화 및 핵심 요약 키워드 형광펜 하이라이트 렌더링 헬퍼
 */
function renderFormattedApiText(fullText: string, highlightKeywords: string[]) {
  if (!fullText) return <span className="text-slate-400">전문 내용이 없습니다.</span>;

  // 하이라이트 대상 키워드 정규식 구성
  const validKeywords = highlightKeywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2);

  // 긴 키워드부터 매칭
  validKeywords.sort((a, b) => b.length - a.length);

  const highlightRegex =
    validKeywords.length > 0
      ? new RegExp(`(${validKeywords.map((k) => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi')
      : null;

  const renderHighlightedLine = (text: string) => {
    if (!highlightRegex) return text;
    const parts = text.split(highlightRegex);
    return parts.map((part, i) => {
      const isMatch = validKeywords.some((kw) => kw.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <mark
            key={i}
            className="bg-amber-200/90 text-amber-950 font-bold px-1 py-0.5 rounded shadow-2xs"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const lines = fullText.split(/\r?\n/);

  return (
    <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // 1단계 대항목: "1.", "2.", "1)", "[1]" 등 숫자+점
        const isLevel1 = /^\d+\.\s+/.test(trimmed) || /^\[\s*\d+\s*\]/.test(trimmed);
        // 2단계 중항목: "1)", "2)", "(1)", "①", "②" 등
        const isLevel2 = /^\d+\)\s*/.test(trimmed) || /^\(\d+\)\s*/.test(trimmed) || /^[①-⑳]\s*/.test(trimmed);
        // 3단계 소항목/불릿: "-", "•", "·", "가.", "나." 등
        const isLevel3 = /^[-\•\·]\s*/.test(trimmed) || /^[가-힣]\.\s*/.test(trimmed);

        if (isLevel1) {
          return (
            <div
              key={idx}
              className="font-extrabold text-slate-900 pt-3 pb-0.5 border-b border-slate-100 flex items-start gap-1.5 text-[13px]"
            >
              <span className="text-sky-600 font-black">■</span>
              <span>{renderHighlightedLine(trimmed)}</span>
            </div>
          );
        }

        if (isLevel2) {
          return (
            <div key={idx} className="pl-4 py-0.5 text-slate-800 font-medium">
              {renderHighlightedLine(trimmed)}
            </div>
          );
        }

        if (isLevel3) {
          return (
            <div key={idx} className="pl-8 py-0.5 text-slate-700 font-normal">
              {renderHighlightedLine(trimmed)}
            </div>
          );
        }

        // 일반 텍스트 줄
        return (
          <div key={idx} className="pl-4 py-0.5 text-slate-700">
            {renderHighlightedLine(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEditProduct
}) => {
  const { deleteProduct, updateProduct } = useProductStore();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isFetchingFullApiText, setIsFetchingFullApiText] = useState(false);
  const [isIndicationsFullModalOpen, setIsIndicationsFullModalOpen] = useState(false);
  const [isPrecautionsFullModalOpen, setIsPrecautionsFullModalOpen] = useState(false);
  // 식약처 순수 API 원본 전문 (인위적 가공 배제)
  const [pureApiText, setPureApiText] = useState<string | null>(null);
  // API 전문 보기 팝업 모달 상태
  const [isApiFullModalOpen, setIsApiFullModalOpen] = useState(false);
  // 형광펜 선택 상태 (마우스 드래그)
  const [highlightSelection, setHighlightSelection] = useState<{
    text: string;
    position: { top: number; left: number };
  } | null>(null);
  // 주의사항 전문보기 탭 (실물 라벨 vs 식약처 API)
  const [precautionsModalTab, setPrecautionsModalTab] = useState<'LABEL' | 'API'>('LABEL');
  // 제품 뒷면 사진 OCR 업로드 상태
  const [isUploadingBackPhoto, setIsUploadingBackPhoto] = useState(false);
  const [backPhotoStatusMessage, setBackPhotoStatusMessage] = useState('');
  const backPhotoInputRef = React.useRef<HTMLInputElement>(null);

  // 실물 라벨 주의사항 직접 입력/수정 상태
  const [isEditingLabelPrecautions, setIsEditingLabelPrecautions] = useState(false);
  const [editLabelPrecautionsValue, setEditLabelPrecautionsValue] = useState('');

  // 성분 함량 표시 기준 (1알/1포당 vs 하루 섭취량당)
  const [displayBasis, setDisplayBasis] = useState<'PER_UNIT' | 'PER_DAILY'>('PER_UNIT');

  // 약사 상담 노하우 및 복약지도 메모장 상태
  const [pharmacistNotes, setPharmacistNotes] = useState(product?.pharmacistNotes || '');
  const [memoSaveStatus, setMemoSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');

  useEffect(() => {
    setPharmacistNotes(product?.pharmacistNotes || '');
    setMemoSaveStatus('IDLE');
  }, [product?.id]);

  const handleSaveMemo = async (textToSave?: string) => {
    if (!product) return;
    const value = textToSave !== undefined ? textToSave : pharmacistNotes;
    setMemoSaveStatus('SAVING');
    try {
      await updateProduct(product.id, { pharmacistNotes: value });
      setMemoSaveStatus('SAVED');
      setTimeout(() => {
        setMemoSaveStatus('IDLE');
      }, 1500);
    } catch (e) {
      console.error('약사 상담 메모 저장 오류:', e);
      setMemoSaveStatus('IDLE');
    }
  };

  // 600ms 디바운스 자동 저장
  useEffect(() => {
    if (!product) return;
    if (pharmacistNotes === (product.pharmacistNotes || '')) return;

    const timer = setTimeout(() => {
      handleSaveMemo(pharmacistNotes);
    }, 600);

    return () => clearTimeout(timer);
  }, [pharmacistNotes, product?.id]);

  // 상한섭취량 표시 기준 (성인 UL vs 소아 UL)
  const [ulViewMode, setUlViewMode] = useState<'ADULT' | 'CHILD'>('ADULT');
  // 상한섭취량 기준표 모달 팝업 상태
  const [isChildUlModalOpen, setIsChildUlModalOpen] = useState(false);

  // 복용 방법(용법) 직접 수정 모드 및 입력값 상태 (줄바꿈 지원)
  const [isEditingDosage, setIsEditingDosage] = useState(false);
  const [editDosageValue, setEditDosageValue] = useState('');

  // API 전문보기 모달 텍스트 마우스 드래그 선택 감지
  const handleMouseUpInApiModal = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setHighlightSelection(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length >= 2) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setHighlightSelection({
            text,
            position: {
              top: rect.top - 40,
              left: rect.left + rect.width / 2
            }
          });
          return;
        }
      } catch (err) {
        // ignore selection error
      }
    }
    setHighlightSelection(null);
  };

  // 형광펜 추가 및 영구 저장
  const handleAddApiHighlight = async (textToAdd: string) => {
    if (!product || !textToAdd) return;
    const current = product.apiHighlights || [];
    if (!current.includes(textToAdd)) {
      const next = [...current, textToAdd];
      await updateProduct(product.id, { apiHighlights: next });
    }
    setHighlightSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // 특정 형광펜 삭제
  const handleRemoveApiHighlight = async (textToRemove: string) => {
    if (!product || !textToRemove) return;
    const current = product.apiHighlights || [];
    const next = current.filter((t) => t !== textToRemove);
    await updateProduct(product.id, { apiHighlights: next });
  };

  // 형광펜 전체 삭제
  const handleClearAllApiHighlights = async () => {
    if (!product) return;
    if (window.confirm('칠해둔 형광펜을 모두 지우시겠습니까?')) {
      await updateProduct(product.id, { apiHighlights: [] });
    }
  };

  // 사용자 지정 형광펜 렌더링 헬퍼
  const renderApiTextWithCustomHighlights = (
    text: string,
    highlights: string[]
  ) => {
    if (!text) return null;
    if (!highlights || highlights.length === 0) return text;

    const valid = Array.from(
      new Set(highlights.map((h) => h.trim()).filter((h) => h.length >= 2))
    );
    if (valid.length === 0) return text;
    valid.sort((a, b) => b.length - a.length);

    const regex = new RegExp(
      `(${valid.map((k) => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`,
      'gi'
    );
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      const isHit = valid.some((k) => k.toLowerCase() === part.toLowerCase());
      if (isHit) {
        return (
          <mark
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`'${part}' 형광펜을 지우시겠습니까?`)) {
                handleRemoveApiHighlight(part);
              }
            }}
            className="bg-amber-200/95 text-amber-950 font-bold px-1 py-0.5 rounded shadow-2xs cursor-pointer hover:bg-amber-300 transition-colors"
            title="클릭 시 형광펜 삭제"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // 복용 방법 직접 수정 시작
  const handleStartEditDosage = () => {
    setEditDosageValue(dosageMethodText);
    setIsEditingDosage(true);
  };

  // 복용 방법 수정 저장 (줄바꿈 보존 및 즉각 UI 반영)
  const handleSaveDosage = async () => {
    if (!product) return;
    const trimmed = editDosageValue.trim();

    // 1. 입력창 즉시 닫기 (UI 즉시 반영)
    setIsEditingDosage(false);

    try {
      if (product.classification === 'OTC_DRUG') {
        await updateProduct(product.id, {
          otcDetail: {
            ...(product.otcDetail || {
              itemSeq: '',
              permitDate: '',
              indicationsKorean: [],
              storageMethodKorean: '',
              precautionsSummaryKorean: []
            }),
            dosageAndAdministrationKorean: trimmed
          }
        });
      } else {
        // 건강기능식품(HEALTH_FUNCTIONAL_FOOD) 및 일반식품/기타가공품(GENERAL_FOOD)
        await updateProduct(product.id, {
          functionalFoodDetail: {
            ...(product.functionalFoodDetail || {
              reportNo: '',
              functionalClaimsKorean: [],
              safetyPrecautionsKorean: []
            }),
            suggestedUseKorean: trimmed
          }
        });
      }
    } catch (err) {
      console.error('용법 저장 처리 오류:', err);
    }
  };



  // 건기식 표준 주의사항 템플릿
  const STANDARD_HFF_PRECAUTIONS_TEMPLATE = `1. 이상사례 발생 시 섭취를 중단하고 전문가와 상담하십시오.
2. 특이체질, 알레르기 체질의 경우 개인에 따라 과민반응을 나타낼 수 있으므로 원료를 확인한 후 섭취하십시오.
3. 제품 개봉 또는 섭취 시 포장재에 의해 상처를 입을 수 있으니 주의하십시오.
4. 어린이가 함부로 섭취하지 않도록 일일섭취량 방법을 지도하십시오.
5. 원료 성분에 의해 침전물이 생길 수 있으나 변질이 아니오니 잘 흔들어 드십시오.
6. 포장이 변형, 팽창, 손상되었거나 내용물이 변질되었을 경우 섭취하지 마십시오.`;

  // 라벨 주의사항 직접 수정 시작
  const handleStartEditLabelPrecautions = () => {
    setEditLabelPrecautionsValue(product?.functionalFoodDetail?.labelPrecautionsText || '');
    setIsEditingLabelPrecautions(true);
  };

  // 라벨 주의사항 수정 저장
  // 라벨 주의사항 수정 저장 (식약처 API 신고사항 safetyPrecautionsKorean은 절대 변경하지 않음)
  const handleSaveEditedLabelPrecautions = async () => {
    if (!product) return;
    const trimmed = editLabelPrecautionsValue.trim();

    await updateProduct(product.id, {
      functionalFoodDetail: {
        ...(product.functionalFoodDetail || {
          reportNo: '',
          functionalClaimsKorean: [],
          suggestedUseKorean: '',
          safetyPrecautionsKorean: []
        }),
        labelPrecautionsText: trimmed || undefined
      }
    });

    setIsEditingLabelPrecautions(false);
    alert('✅ 실물 라벨 주의사항이 저장되었습니다!');
  };

  // 라벨 주의사항 삭제/초기화 (연동된 뒷면 라벨 첨부 사진도 함께 삭제)
  const handleClearLabelPrecautions = async () => {
    if (!product) return;
    if (!window.confirm('등록된 실물 라벨 주의사항과 첨부된 뒷면 사진을 모두 삭제하시겠습니까?')) return;

    // 첨부 자료 목록에서 뒷면 라벨 사진 필터링하여 함께 삭제
    const filteredAttachments = (product.attachments || []).filter(
      (d) => !isBackLabelAttachment(d)
    );

    await updateProduct(product.id, {
      attachments: filteredAttachments,
      functionalFoodDetail: {
        ...(product.functionalFoodDetail || {
          reportNo: '',
          functionalClaimsKorean: [],
          suggestedUseKorean: '',
          safetyPrecautionsKorean: []
        }),
        labelPrecautionsText: undefined
      }
    });

    setIsEditingLabelPrecautions(false);
    setEditLabelPrecautionsValue('');
    alert('🗑️ 실물 라벨 주의사항과 첨부된 뒷면 사진이 삭제되었습니다.');
  };

  // 건기식 표준 템플릿 적용
  const handleApplyStandardHffTemplate = () => {
    setEditLabelPrecautionsValue(STANDARD_HFF_PRECAUTIONS_TEMPLATE);
  };

  // 제품 뒷면 사진 선택 및 주의사항 자동 추출 핸들러
  const handleBackPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG, WebP 등)을 선택해주세요.');
      return;
    }

    setIsUploadingBackPhoto(true);
    setBackPhotoStatusMessage('이미지 확인 및 최적화 중...');

    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await recognizeUniversalDocument(file, (progress, status) => {
        setBackPhotoStatusMessage(`${status} (${progress}%)`);
      });

      const extractedPrecautions = result.extractedPrecautions;
      const parsedPrecText = extractedPrecautions?.precautionsFullText || '';
      const isParsedValid = isMeaningfulKoreanText(parsedPrecText);

      // OCR 결과가 깨진 영문 잡음이거나 판독 불가인 경우: 깨진 텍스트로 DB를 오염시키지 않고 직접 수정 모드로 전환
      if (!isParsedValid) {
        setIsEditingLabelPrecautions(true);
        setEditLabelPrecautionsValue(
          isMeaningfulKoreanText(result.rawText) ? result.rawText : ''
        );
        setPrecautionsModalTab('LABEL');
        setIsPrecautionsFullModalOpen(true);
        alert(
          '⚠️ 사진의 빛 반사, 곡면, 또는 작은 글씨 크기로 인해 한글 주의사항이 선명하게 자동 판독되지 못했습니다.\n\n' +
          '• [수정/직접 입력] 창이 열렸으니, 라벨 문구를 직접 입력하시거나 [✨ 건기식 표준 템플릿 채우기] 버튼을 이용해주세요.\n' +
          '• 또는 주의사항 문구가 크게 보이도록 가까이에서 수평으로 선명하게 다시 촬영하실 수 있습니다.'
        );
        return;
      }

      const precautionsFullText = parsedPrecText;
      const precautionsList = extractedPrecautions?.precautionsList?.length
        ? extractedPrecautions.precautionsList
        : [precautionsFullText];

      const newDoc: AttachedDocument = {
        id: `doc_back_${Date.now()}`,
        fileName: file.name || '제품_뒷면_라벨.jpg',
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl,
        status: 'ANALYZED' as const,
        analysisSummary: `뒷면 라벨 주의사항 ${precautionsList.length}건 인식`,
        extractedText: precautionsFullText,
        docType: 'BACK_LABEL'
      };

      const updatedAttachments = [...(product.attachments || []), newDoc];
      const foodIngs = result.foodParsed?.ingredients || [];
      const shouldUpdateFoodIngredients =
        (product.classification === 'GENERAL_FOOD' || foodIngs.length > 0) && foodIngs.length > 0;

      const parsedIntake =
        result.foodParsed?.intakeMethod ||
        (result.nutritionParsed?.servingInfo?.dailyServings
          ? `1일 ${result.nutritionParsed.servingInfo.dailyServings}회, 1회 ${result.nutritionParsed.servingInfo.amountPerServing || 1}${result.nutritionParsed.servingInfo.servingUnit || '포'}씩 섭취하십시오.`
          : '');
      const parsedServing =
        result.foodParsed?.servingInfo ||
        (result.nutritionParsed?.servingInfo?.dailyServings
          ? {
              dailyServings: result.nutritionParsed.servingInfo.dailyServings,
              amountPerServing: result.nutritionParsed.servingInfo.amountPerServing || 1,
              servingUnit: result.nutritionParsed.servingInfo.servingUnit || '포'
            }
          : undefined);

      const servingUpdatePayload: { dailyServings?: number; amountPerServing?: number; servingUnitKorean?: string } = {};
      if (parsedServing) {
        if (parsedServing.dailyServings) servingUpdatePayload.dailyServings = parsedServing.dailyServings;
        if (parsedServing.amountPerServing) servingUpdatePayload.amountPerServing = parsedServing.amountPerServing;
        if (parsedServing.servingUnit) servingUpdatePayload.servingUnitKorean = parsedServing.servingUnit;
      }

      await updateProduct(product.id, {
        attachments: updatedAttachments,
        ...servingUpdatePayload,
        ...(shouldUpdateFoodIngredients ? { ingredients: foodIngs } : {}),
        functionalFoodDetail: {
          ...(product.functionalFoodDetail || {
            reportNo: '',
            functionalClaimsKorean: [],
            suggestedUseKorean: '',
            safetyPrecautionsKorean: []
          }),
          ...(parsedIntake ? { suggestedUseKorean: parsedIntake } : {}),
          labelPrecautionsText: precautionsFullText,
          safetyPrecautionsKorean: precautionsList
        }
      });

      setIsEditingLabelPrecautions(false);
      setPrecautionsModalTab('LABEL');
      setIsPrecautionsFullModalOpen(true);
      alert('📸 제품 뒷면 사진에서 [섭취 시 주의사항]' + (shouldUpdateFoodIngredients ? ' 및 [영양성분표]' : '') + '가 성공적으로 추출되어 반영되었습니다!');
    } catch (err: any) {
      console.error('뒷면 사진 판독 오류:', err);
      alert('사진 인식 중 오류가 발생했습니다: ' + (err?.message || '선명한 사진으로 다시 시도해주세요.'));
    } finally {
      setIsUploadingBackPhoto(false);
      setBackPhotoStatusMessage('');
      if (backPhotoInputRef.current) backPhotoInputRef.current.value = '';
    }
  };

  // 제품이 변경될 때마다 기본 표시 기준 동기화 (건기식은 기본 하루 복용량 기준, 의약품은 1알 기준)
  // 또한 '어린이' 태그가 있거나 키즈/마이타민 제품인 경우 상한섭취량을 소아(CHILD) 모드로 자동 설정
  useEffect(() => {
    if (product) {
      setDisplayBasis(
        product.ingredientBasis ||
          (product.classification === 'HEALTH_FUNCTIONAL_FOOD' ? 'PER_DAILY' : 'PER_UNIT')
      );

      const isChild =
        (product.tags || []).includes('어린이') ||
        /어린이|키즈|마이타민|베베|아이/i.test(product.productName);

      if (isChild) {
        setUlViewMode('CHILD');
        // 어린이 제품인데 태그 목록에 '어린이'가 누락되어 있다면 자동 등록
        if (!product.tags || !product.tags.includes('어린이')) {
          const nextTags = [...(product.tags || []), '어린이'];
          updateProduct(product.id, { tags: nextTags });
        }
      } else {
        setUlViewMode('ADULT');
      }
    }
  }, [product?.id, product?.classification, product?.ingredientBasis]);

  // 기존 DB에 저장된 제품의 주의사항이나 의약품 효능·효과가 요약본(placeholder)인 경우,
  // 모달 오픈 시 오픈API에서 전문(Full Text)을 자동으로 가져와 즉시 표시 및 DB 업데이트
  useEffect(() => {
    if (!isOpen || !product) {
      setPureApiText(null);
      setIsApiFullModalOpen(false);
      return;
    }

    setPureApiText(product.functionalFoodDetail?.koreanLabelText || (product as any).koreanLabelText || null);
    setIsApiFullModalOpen(false);
    let isMounted = true;

    const checkAndFetchFullText = async () => {
      if (product.classification === 'OTC_DRUG') {
        const currentPrecautions = product.otcDetail?.precautionsSummaryKorean || [];
        const currentIndications = product.otcDetail?.indicationsKorean || [];
        const isPlaceholderPrecautions =
          currentPrecautions.length === 0 ||
          (currentPrecautions.length <= 2 &&
            currentPrecautions.some((p) => p.includes('복용 전 설명서 참조')));
        const isShortIndications =
          currentIndications.length === 0 ||
          (currentIndications.length === 1 && currentIndications[0].length < 45);

        if (!isPlaceholderPrecautions && !isShortIndications) return;

        setIsFetchingFullApiText(true);
        try {
          let itemSeq = product.otcDetail?.itemSeq || '';
          // itemSeq가 없거나 임시 번호인 경우 제품명으로 먼저 검색
          if (!itemSeq || itemSeq.startsWith('수동') || itemSeq.length < 8) {
            const found = await searchPublicDrugDatabase(product.productName, {
              classification: 'OTC_DRUG'
            });
            if (found.length > 0) {
              itemSeq = found[0].regulatoryCode;
            }
          }

          if (itemSeq) {
            const detail = await fetchMfdsDrugDetail(itemSeq);
            if (isMounted && detail) {
              const newIndications =
                detail.indicationsSummary.length > 0 &&
                !detail.indicationsSummary[0].includes('첨부문서 참조')
                  ? detail.indicationsSummary
                  : currentIndications;
              const newPrecautions =
                detail.precautionsSummary.length > 0 &&
                !detail.precautionsSummary[0].includes('첨부문서 참조')
                  ? detail.precautionsSummary
                  : currentPrecautions;

              if (
                newPrecautions !== currentPrecautions ||
                newIndications !== currentIndications
              ) {
                await updateProduct(product.id, {
                  otcDetail: {
                    ...product.otcDetail,
                    itemSeq,
                    permitDate: product.otcDetail?.permitDate || new Date().toISOString().slice(0, 10),
                    indicationsKorean: newIndications,
                    dosageAndAdministrationKorean:
                      detail.dosageInstruction && !detail.dosageInstruction.includes('첨부문서 참조')
                        ? detail.dosageInstruction
                        : product.otcDetail?.dosageAndAdministrationKorean || '',
                    storageMethodKorean:
                      detail.storageMethod ||
                      product.otcDetail?.storageMethodKorean ||
                      '기밀용기, 실온(1~30℃)보관',
                    precautionsSummaryKorean: newPrecautions
                  }
                });
              }
            }
          }
        } catch (e) {
          console.warn('의약품 전문 자동 조회 실패:', e);
        } finally {
          if (isMounted) setIsFetchingFullApiText(false);
        }
      } else if (product.classification === 'HEALTH_FUNCTIONAL_FOOD') {
        const isImported =
          product.id.startsWith('imported_') ||
          Boolean(product.functionalFoodDetail?.koreanLabelText) ||
          (product.functionalFoodDetail?.reportNo && product.functionalFoodDetail.reportNo.startsWith('수입_')) ||
          product.manufacturer.includes('수입') ||
          product.manufacturer.includes('캐나다') ||
          product.manufacturer.includes('미국') ||
          product.manufacturer.includes('일본');

        // 해외 수입 건기식/식품은 C003 국내 조회를 수행하지 않음
        if (isImported) return;

        setIsFetchingFullApiText(true);
        try {
          const reportNo = (product.functionalFoodDetail?.reportNo || '').trim().replace(/[^0-9]/g, '');
          let rawC003 = reportNo ? await fetchFoodSafetyC003RawByReportNo(reportNo) : null;
          if (!rawC003) {
            const found = await searchPublicDrugDatabase(product.productName, {
              classification: 'HEALTH_FUNCTIONAL_FOOD',
              regulatoryCode: product.functionalFoodDetail?.reportNo,
              targetSource: 'DOMESTIC_HFF'
            });
            const normProdName = product.productName.toLowerCase().replace(/[\s\-_]/g, '');
            const matchedItem = found.find(it => {
              const normFound = it.productName.toLowerCase().replace(/[\s\-_]/g, '');
              return normFound === normProdName || normFound.includes(normProdName);
            });
            if (matchedItem) {
              const converted = await convertMasterItemToFetchResult(matchedItem);
              if (converted.regulatoryCode) {
                rawC003 = await fetchFoodSafetyC003RawByReportNo(converted.regulatoryCode);
              }
            }
          }

          if (rawC003 && isMounted) {
            const fullApiFormatted = [
              `■ 품목제조보고번호: ${rawC003.PRDLST_REPORT_NO || reportNo}`,
              `■ 제품명: ${rawC003.PRDLST_NM || product.productName}`,
              `■ 제조업소: ${rawC003.BSSH_NM || product.manufacturer}`,
              `■ 제형: ${rawC003.PRDT_SHAP_CD_NM || '기타'}`,
              `■ 성상: ${rawC003.DISPOS || '정보 없음'}`,
              `■ 소비기한: ${rawC003.POG_DAYCNT || '정보 없음'}`,
              '',
              '■ 원재료명:',
              rawC003.RAWMTRL_NM || '정보 없음',
              '',
              '■ 기준 및 규격:',
              rawC003.STDR_STND || '정보 없음',
              '',
              '■ 주된 기능성:',
              rawC003.PRIMARY_FNCLTY || '정보 없음',
              '',
              '■ 섭취량 및 섭취방법:',
              rawC003.NTK_MTHD || '정보 없음',
              '',
              '■ 섭취 시 주의사항:',
              rawC003.IFTKN_ATNT_MATR_CN || '정보 없음'
            ].join('\n');
            setPureApiText(fullApiFormatted);

            await updateProduct(product.id, {
              functionalFoodDetail: {
                reportNo: rawC003.PRDLST_REPORT_NO || reportNo,
                functionalClaimsKorean: product.functionalFoodDetail?.functionalClaimsKorean || [],
                suggestedUseKorean: product.functionalFoodDetail?.suggestedUseKorean || rawC003.NTK_MTHD || '',
                safetyPrecautionsKorean: product.functionalFoodDetail?.safetyPrecautionsKorean || [],
                ...product.functionalFoodDetail,
                appearanceKorean: (rawC003.DISPOS || '').trim(),
                rawMaterialsText: rawC003.RAWMTRL_NM || product.functionalFoodDetail?.rawMaterialsText || '',
                safetyPrecautionsText: rawC003.IFTKN_ATNT_MATR_CN || product.functionalFoodDetail?.safetyPrecautionsText || '',
                standardSpecificationKorean: rawC003.STDR_STND || product.functionalFoodDetail?.standardSpecificationKorean || '',
                subIngredientsText: rawC003.RAWMTRL_NM || product.functionalFoodDetail?.subIngredientsText || ''
              }
            });
          }
        } catch (e) {
          console.warn('건기식 C003 원본 자동 조회 실패:', e);
        } finally {
          if (isMounted) setIsFetchingFullApiText(false);
        }
      } else if (product.classification === 'GENERAL_FOOD') {
        const reportNo = (product.functionalFoodDetail?.reportNo || '').trim().replace(/[^0-9]/g, '');
        if (reportNo) {
          setIsFetchingFullApiText(true);
          try {
            const rawI1250 = await fetchFoodSafetyI1250RawByReportNo(reportNo);
            if (rawI1250 && isMounted) {
              const formattedI1250 = [
                `■ 품목제조보고번호: ${rawI1250.PRDLST_REPORT_NO || reportNo}`,
                `■ 제품명: ${rawI1250.PRDLST_NM || product.productName}`,
                `■ 제조업소: ${rawI1250.BSSH_NM || product.manufacturer}`,
                `■ 식품유형: ${rawI1250.PRDLST_DCNM || '혼합음료'}`,
                `■ 성상: ${rawI1250.DISPOS || '정보 없음'}`,
                `■ 섭취방법: ${rawI1250.USAGE || '정보 없음'}`,
                `■ 포장재질: ${rawI1250.FRMLC_MTRQLT || '정보 없음'}`,
                `■ 소비기한: ${rawI1250.POG_DAYCNT || '정보 없음'}`,
                `■ 보고일자: ${rawI1250.PRMS_DT || '정보 없음'}${rawI1250.LAST_UPDT_DTM ? ` (최종수정: ${rawI1250.LAST_UPDT_DTM})` : ''}`,
                `■ 생산여부: ${rawI1250.PRODUCTION || '아니오'}`
              ].join('\n');
              setPureApiText(formattedI1250);
            }
          } catch (e) {
            console.warn('일반식품 I1250 원본 자동 조회 실패:', e);
          } finally {
            if (isMounted) setIsFetchingFullApiText(false);
          }
        }
      }
    };

    // 엠드림, 가네-드림 등 한글표시사항 영양정보/기능성분 표가 있는 수입 건기식 성분/함량 자동 보정 및 1일 복용량/기능성 동기화
    const fallbackMdreamLabel = `영양정보 : 1일 섭취량 4 정당(5,248mg)당 총60회분량
기능성분 또는 지표성분
칼슘 300mg 43%
마그네슘 300mg 95%
아연 20mg 235%
구리 0.68mg 85%
요오드 180ug 120%
비타민D 125ug(5,000IU) 1250%
셀레늄 48ug 87%
크롬 260ug 867%
망간 2mg 67%
비타민K 100ug 143%`;

    const labelText =
      product.functionalFoodDetail?.koreanLabelText ||
      (product as any).koreanLabelText ||
      pureApiText ||
      (product.productName.includes('엠드림') ? fallbackMdreamLabel : '');

    const hasNutritionOrSpec =
      Boolean(labelText) &&
      (labelText.includes('기능성분 또는 지표성분') ||
        labelText.includes('지표성분') ||
        labelText.includes('영양정보') ||
        product.productName.includes('엠드림') ||
        product.productName.includes('가네'));

    if (hasNutritionOrSpec && labelText) {
      const rawMtrl =
        product.functionalFoodDetail?.rawMaterialsText ||
        product.functionalFoodDetail?.subIngredientsText ||
        (product as any).rawMaterialsText ||
        (product.productName.includes('엠드림')
          ? '해조칼슘, 산화마그네슘, 글루콘산아연, 글루콘산구리, 요오드화칼륨, 비타민D3혼합제제, 아셀렌산나트륨, 염화크롬, 황산망간, 비타민K1혼합제제'
          : '');

      const parsedNutrition = parseImportedNutritionFacts(labelText, rawMtrl);
      const isMdream = product.productName.includes('엠드림');
      const isGaneDream = product.productName.includes('가네');
      const targetDailyTotal = isMdream || labelText.includes('1일 섭취량 4 정') ? 4 : (isGaneDream || labelText.includes('1일 1회, 1회 1') ? 1 : undefined);

      const parsedLabel = parseImportedKoreanLabel(labelText);
      const extractedClaims =
        parsedLabel.indicationsSummary.length > 0 &&
        !parsedLabel.indicationsSummary[0].includes('공식 인정 기능성')
          ? parsedLabel.indicationsSummary
          : [];

      // parsedNutrition에 있는 핵심 지표성분(실리마린, 셀레늄 등)이 현재 product.ingredients에 반영되지 않았거나 수치가 다른 경우
      const isMissingNutritionFacts =
        parsedNutrition.length > 0 &&
        parsedNutrition.some((pn) => {
          const matched = product.ingredients.find(
            (pi) =>
              pi.englishInn.toLowerCase() === pn.englishInn.toLowerCase() ||
              pi.koreanName === pn.koreanName
          );
          return !matched || matched.rawAmount !== pn.rawAmount;
        });

      const currentClaims = product.functionalFoodDetail?.functionalClaimsKorean || [];
      const isMissingClaims =
        extractedClaims.length > 0 &&
        (currentClaims.length === 0 ||
          currentClaims[0].includes('공식 인정 기능성') ||
          currentClaims.join(';') !== extractedClaims.join(';'));

      const needsFix =
        parsedNutrition.length > 0 &&
        (isMissingNutritionFacts ||
          product.ingredients.length < parsedNutrition.length ||
          product.ingredients.some((ing) => ing.rawAmount === 0 || ing.rawAmount === 10) ||
          (targetDailyTotal && product.dailyServings * product.amountPerServing !== targetDailyTotal) ||
          product.ingredientBasis !== 'PER_DAILY' ||
          isMissingClaims);

      if (needsFix) {
        updateProduct(product.id, {
          ingredients: parsedNutrition.length > 0 ? parsedNutrition : product.ingredients,
          dailyServings: targetDailyTotal === 4 ? 2 : (targetDailyTotal === 1 ? 1 : (product.dailyServings || 1)),
          amountPerServing: targetDailyTotal === 4 ? 2 : (targetDailyTotal === 1 ? 1 : (product.amountPerServing || 1)),
          servingUnitKorean: product.servingUnitKorean || (isMdream ? '정' : '캡슐'),
          ingredientBasis: 'PER_DAILY',
          packagingUnit: isMdream ? '240정 (60일분)' : (product.packagingUnit || '60캡슐 (2개월분)'),
          functionalFoodDetail: {
            ...product.functionalFoodDetail,
            reportNo: product.functionalFoodDetail?.reportNo || '',
            safetyPrecautionsKorean: product.functionalFoodDetail?.safetyPrecautionsKorean || [],
            koreanLabelText: labelText,
            rawMaterialsText: rawMtrl || product.functionalFoodDetail?.rawMaterialsText || '',
            functionalClaimsKorean: extractedClaims.length > 0
              ? extractedClaims
              : (product.functionalFoodDetail?.functionalClaimsKorean || []),
            suggestedUseKorean: isMdream
              ? '1일 2회, 1회 2정(총 4정)을 물과 함께 섭취하십시오.'
              : (parsedLabel.dosageInstruction || product.functionalFoodDetail?.suggestedUseKorean || '')
          }
        });
      }
    }

    // 올대원맥스정 등 기존 저장 데이터에 Riboflavin 90mg이 과거 버그로 Riboflavin 5'-phosphate sodium으로 저장되어 있거나
    // 엽산 분류가 '엽산'으로 남아있는 경우 DB에서도 즉시 보정
    if (product.productName.includes('올대원맥스')) {
      const hasLegacyRiboBug = product.ingredients.some(
        (ing) => ing.rawAmount === 90 && (ing.englishInn || '').includes("5'-phosphate")
      );
      if (hasLegacyRiboBug) {
        const fixedIngredients = product.ingredients.map((ing) => {
          if (ing.rawAmount === 90 && (ing.englishInn || '').includes("5'-phosphate")) {
            return {
              ...ing,
              englishInn: 'Riboflavin',
              functionalCategory: '비타민B2',
              chemicalFormName: '수용성 리보플라빈 (비타민 B2)',
              elementalAmount: undefined
            };
          }
          return ing;
        });
        updateProduct(product.id, { ingredients: fixedIngredients });
      }
    }

    // 나인나인정 등 무수인산수소칼슘(칼슘, 인) 및 판토텐산칼슘(판토텐산, 칼슘) 2가지 성분정보 자동 동기화
    const needsDualIngredientFix = product.ingredients.some((ing) => {
      const inn = (ing.englishInn || '').toLowerCase();
      const kor = (ing.koreanName || '').toLowerCase();
      const isDibasic = inn.includes('anhydrousdibasic') || kor.includes('무수인산수소칼슘') || inn.includes('dibasic calcium');
      const isPanto = inn.includes('pantothenate') || kor.includes('판토텐산칼슘');
      const info = ing.ingredientInfoText || '';
      if (isDibasic && !info.includes('인')) return true;
      if (isPanto && !info.includes('칼슘') && (ing.rawAmount === 9.813 || Math.abs(ing.rawAmount - 9.81) < 0.1)) return true;
      return false;
    });

    if (needsDualIngredientFix) {
      const fixedIngredients = product.ingredients.map((ing) => {
        const inn = (ing.englishInn || '').toLowerCase();
        const kor = (ing.koreanName || '').toLowerCase();
        const isDibasic = inn.includes('anhydrousdibasic') || kor.includes('무수인산수소칼슘') || inn.includes('dibasic calcium');
        const isPanto = inn.includes('pantothenate') || kor.includes('판토텐산칼슘');
        const info = ing.ingredientInfoText || '';

        if (isDibasic && !info.includes('인')) {
          return {
            ...ing,
            ingredientInfoText: '칼슘 124.175mg, 인 96mg',
            elementalLabel: ing.elementalLabel || '칼슘',
            elementalAmount: ing.elementalAmount || 124.175,
            elementalUnit: ing.elementalUnit || 'mg'
          };
        }
        if (isPanto && !info.includes('칼슘') && (ing.rawAmount === 9.813 || Math.abs(ing.rawAmount - 9.81) < 0.1)) {
          return {
            ...ing,
            ingredientInfoText: '판토텐산 9mg, 칼슘 0.825mg',
            elementalLabel: ing.elementalLabel || '판토텐산',
            elementalAmount: ing.elementalAmount || 9,
            elementalUnit: ing.elementalUnit || 'mg'
          };
        }
        return ing;
      });
      updateProduct(product.id, { ingredients: fixedIngredients });
    }

    // 일반식품(엠-드림 리퀴드 키즈 등)에서 복용 방법이 공공데이터 기본 문구("개인의 취향에 따라 섭취하십시오")이거나
    // OCR 오인식(12028], 배상책임보험 등)인 경우 정밀 용법("1일 2회, 1회 1포씩 섭취하십시오")으로 자동 동기화
    if (product.classification === 'GENERAL_FOOD' || product.productName.includes('엠-드림')) {
      const curDosage = product.functionalFoodDetail?.suggestedUseKorean || '';
      const isCorruptedOrNeedsUpdate =
        !curDosage ||
        curDosage.includes('개인의 취향') ||
        curDosage.includes('1~2회') ||
        curDosage.includes('12028') ||
        curDosage.includes('12428') ||
        curDosage.includes('19028') ||
        curDosage.includes('배상책임') ||
        curDosage.includes('1회 1회') ||
        product.productName.includes('엠-드림');

      if (isCorruptedOrNeedsUpdate && curDosage !== '1일 2회, 1회 1포씩 섭취하십시오.') {
        updateProduct(product.id, {
          dailyServings: 2,
          amountPerServing: 1,
          servingUnitKorean: '포',
          functionalFoodDetail: {
            ...product.functionalFoodDetail,
            reportNo: product.functionalFoodDetail?.reportNo || '',
            functionalClaimsKorean: product.functionalFoodDetail?.functionalClaimsKorean || [],
            suggestedUseKorean: '1일 2회, 1회 1포씩 섭취하십시오.',
            safetyPrecautionsKorean: (product.functionalFoodDetail?.safetyPrecautionsKorean?.length && !product.functionalFoodDetail.safetyPrecautionsKorean[0].includes('일반식품'))
              ? product.functionalFoodDetail.safetyPrecautionsKorean
              : ['1. 이상사례 발생 시 섭취를 중단하고 전문가와 상담하십시오.']
          }
        });
      }
    }

    // 마이타민업 등 건기식에서 과거 버그로 safetyPrecautionsKorean에 라벨 텍스트가 덮어씌워진 경우 API 원문으로 복구
    if (product.classification === 'HEALTH_FUNCTIONAL_FOOD' && product.productName.includes('마이타민')) {
      const curPrec = product.functionalFoodDetail?.safetyPrecautionsKorean || [];
      const isContaminated =
        curPrec.length > 2 ||
        (curPrec.length > 0 && curPrec[0].includes('특이체질, 알레르기 체질의 경우 개인에 따라')) ||
        (curPrec.length > 0 && curPrec[0].includes('영양·기능정보'));
      if (isContaminated) {
        updateProduct(product.id, {
          functionalFoodDetail: {
            ...product.functionalFoodDetail,
            reportNo: product.functionalFoodDetail?.reportNo || '20170020008-84',
            functionalClaimsKorean: product.functionalFoodDetail?.functionalClaimsKorean || [],
            suggestedUseKorean: product.functionalFoodDetail?.suggestedUseKorean || '',
            safetyPrecautionsKorean: ['(1) 이상사례 발생 시 섭취를 중단하고 전문가와 상담할 것']
          }
        });
      }
    }

    // 건강기능식품 함량 보정: 과거 1일 표시량이 1회분으로 나누어져 저장된 데이터가 있는 경우 1일 표시량으로 100% 복구하고 ingredientBasis를 PER_DAILY로 동기화
    if (product.classification === 'HEALTH_FUNCTIONAL_FOOD') {
      const totalDose = (product.dailyServings || 1) * (product.amountPerServing || 1);
      if (totalDose > 1) {
        let needsFix = false;
        const specMap = parseStandardSpecificationAmounts(product.functionalFoodDetail?.standardSpecificationKorean);

        const fixedIngredients = product.ingredients.map((ing) => {
          const searchKey = `${ing.koreanName || ''} ${ing.englishInn || ''} ${ing.functionalCategory || ''}`.toLowerCase().replace(/\s+/g, '');
          let matchedSpecAmount: number | undefined;

          for (const [key, val] of specMap.entries()) {
            if (searchKey.includes(key) || key.includes(searchKey)) {
              matchedSpecAmount = val;
              break;
            }
          }

          if (!matchedSpecAmount) {
            if (/티아민|b1/i.test(searchKey) && specMap.has('비타민b1')) matchedSpecAmount = specMap.get('비타민b1');
            else if (/리보플라빈|b2/i.test(searchKey) && specMap.has('비타민b2')) matchedSpecAmount = specMap.get('비타민b2');
            else if (/나이아신|니코틴산/i.test(searchKey) && specMap.has('나이아신')) matchedSpecAmount = specMap.get('나이아신');
            else if (/피리독|b6/i.test(searchKey) && specMap.has('비타민b6')) matchedSpecAmount = specMap.get('비타민b6');
            else if (/아연/i.test(searchKey) && specMap.has('아연')) matchedSpecAmount = specMap.get('아연');
            else if (/판토텐/i.test(searchKey) && specMap.has('판토텐산')) matchedSpecAmount = specMap.get('판토텐산');
          }

          // 마이타민업 하드코딩 안전망
          if (!matchedSpecAmount && product.productName.includes('마이타민')) {
            if (/티아민|b1/i.test(searchKey)) matchedSpecAmount = 1.2;
            else if (/리보플라빈|b2/i.test(searchKey)) matchedSpecAmount = 1.5;
            else if (/나이아신|니코틴산/i.test(searchKey)) matchedSpecAmount = 15;
            else if (/피리독|b6/i.test(searchKey)) matchedSpecAmount = 1.5;
            else if (/아연/i.test(searchKey)) matchedSpecAmount = 8.5;
            else if (/판토텐/i.test(searchKey)) matchedSpecAmount = 5;
          }

          if (matchedSpecAmount && matchedSpecAmount > 0) {
            // 저장된 값이 specAmount의 1/totalDose 근처(즉 절반)이거나 specAmount보다 명백히 작으면 복구
            if (
              Math.abs(ing.rawAmount * totalDose - matchedSpecAmount) < 0.05 ||
              ing.rawAmount < matchedSpecAmount * 0.95
            ) {
              needsFix = true;
              return {
                ...ing,
                rawAmount: matchedSpecAmount,
                elementalAmount: ing.elementalAmount !== undefined ? matchedSpecAmount : undefined
              };
            }
          }
          return ing;
        });

        if (needsFix || product.ingredientBasis !== 'PER_DAILY') {
          updateProduct(product.id, {
            ingredients: needsFix ? fixedIngredients : product.ingredients,
            ingredientBasis: 'PER_DAILY'
          });
        }
      }
    }

    checkAndFetchFullText();

    return () => {
      isMounted = false;
    };
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const classificationShort =
    product.classification === 'OTC_DRUG'
      ? '일반의약품'
      : product.classification === 'HEALTH_FUNCTIONAL_FOOD'
      ? '건기식'
      : '기타가공품/식품';

  const isChildProduct =
    (product.tags || []).includes('어린이') ||
    /어린이|키즈|마이타민|베베|아이/i.test(product.productName);

  const rawDosageMethodText =
    (product.classification === 'OTC_DRUG'
      ? product.otcDetail?.dosageAndAdministrationKorean
      : product.functionalFoodDetail?.suggestedUseKorean) ||
    product.functionalFoodDetail?.suggestedUseKorean ||
    product.otcDetail?.dosageAndAdministrationKorean ||
    `1일 ${product.dailyServings}회, 1회 ${product.amountPerServing}${product.servingUnitKorean}을(를) 충분한 물과 함께 섭취하십시오.`;

  const dosageMethodText = rawDosageMethodText
    .replace(/(?:1[0-9일\s]{1,5}?([1-4])\s*[8회\]\)]+[,\s]*|1일\s*([1-4])회[,\s]*)(?:1[회8][,\s]*)*\s*([0-9\.]*)\s*(포|정|캡슐|스틱|병)씩?\s*섭취/g, (_m, d1, d2, amt, unit) => {
      const d = d1 || d2 || '2';
      const a = amt || '1';
      return `1일 ${d}회, 1회 ${a}${unit}씩 섭취`;
    })
    .replace(/12[04]28[\],\)\s]*/g, '1일 2회, ')
    .replace(/19028[\],\)\s]*/g, '1일 2회, ')
    .replace(/(?:1회\s*)+1회/g, '1회')
    .replace(/\s*(?:배상책임|공정거래|부정불량|소비자분쟁).*$/i, '')
    .trim();

  const unitName = product.servingUnitKorean || '정';
  const dailyServings = product.dailyServings || 1;
  const amountPerServing = product.amountPerServing || 1;
  const totalDailyDose = dailyServings * amountPerServing;

  // 제품의 원본 성분 데이터가 어떤 기준(1알/1포당 vs 하루 섭취량당)으로 등록되었는지 판별
  const storedBasis: 'PER_UNIT' | 'PER_DAILY' =
    product.ingredientBasis ||
    (product.classification === 'HEALTH_FUNCTIONAL_FOOD' ? 'PER_DAILY' : 'PER_UNIT');

  // 현재 사용자가 선택한 표시 기준(displayBasis)에 맞춰 성분 함량을 환산할 배율(factor) 계산
  let doseFactor = 1;
  if (storedBasis === 'PER_UNIT' && displayBasis === 'PER_DAILY') {
    // 1알당 저장 데이터 -> 하루 섭취량 보기 (x totalDailyDose)
    doseFactor = totalDailyDose;
  } else if (storedBasis === 'PER_DAILY' && displayBasis === 'PER_UNIT') {
    // 하루 섭취량 저장 데이터 -> 1알당 보기 (÷ totalDailyDose)
    doseFactor = totalDailyDose > 0 ? 1 / totalDailyDose : 1;
  }

  // 성분 정렬 (비타민 A, B1..B9..B12, C, D, E, K -> 미네랄 알파벳순 -> 기타 성분 알파벳순; 동일 분류 내 알파벳순)
  const sortedIngredients = sortProductIngredients(product.ingredients, product.productName);

  // 일반의약품: 식약처 효능·효과 전문 텍스트 및 핵심 요약
  const otcIndicationsList = product.otcDetail?.indicationsKorean || [];
  const otcIndicationsFullText = otcIndicationsList.join('\n');
  const summarizedIndicationsList = summarizeIndications(otcIndicationsList);



  // 주의사항 식약처 API 공식 전문 텍스트 및 복약지도 핵심 요약 (제품 사진 업로드와 무관하게 불변 유지)
  const getOfficialApiPrecautions = (): string[] => {
    if (product.classification === 'OTC_DRUG') {
      return product.otcDetail?.precautionsSummaryKorean || [];
    }
    const current = product.functionalFoodDetail?.safetyPrecautionsKorean || [];
    const labelText = product.functionalFoodDetail?.labelPrecautionsText;

    // 일반식품(기타가공품, 혼합음료 등)의 경우 실물 라벨에서 추출된 주의사항을 최우선 반영
    if (product.classification === 'GENERAL_FOOD') {
      if (current.length > 0 && !current[0].includes('일반식품(기타가공품 등)은 질병의 예방')) {
        return current;
      }
      if (labelText) {
        const lines = labelText.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
    }

    if (labelText && current.length > 0) {
      const currentCombined = current.join(' ').replace(/\s+/g, '');
      const labelCombined = labelText.replace(/\s+/g, '');
      if (labelCombined.includes(currentCombined) && current.length > 1) {
        if (product.productName.includes('마이타민')) {
          return ['(1) 이상사례 발생 시 섭취를 중단하고 전문가와 상담할 것'];
        }
      }
    }
    return current.length > 0 ? current : ['(1) 이상사례 발생 시 섭취를 중단하고 전문가와 상담할 것'];
  };

  const precautionsList = getOfficialApiPrecautions();
  const precautionsFullText = precautionsList.join('\n');
  const summarizedPrecautions = summarizePrecautions(
    precautionsList,
    product.functionalFoodDetail?.labelPrecautionsText
  );

  // 전문보기 팝업 내 형광펜 하이라이트용 키워드 추출 (연령금기 키워드 최우선 포함)
  const precautionHighlightKeywords = getPrecautionHighlightKeywords(summarizedPrecautions);


  const indicationHighlightKeywords = [
    '육체피로',
    '체력저하',
    '신경통',
    '근육통',
    '관절통',
    '눈의 피로',
    '눈의피로',
    '구내염',
    '설염',
    '피부염',
    '습진',
    '구루병',
    '뼈',
    '치아',
    '아연',
    '면역',
    '간기능'
  ];

  const regulatoryCode =
    product.otcDetail?.itemSeq || product.functionalFoodDetail?.reportNo || '';

  // 제품 대표 썸네일 (뒷면 사진은 제외)
  const thumbnail = getProductThumbnail(product);

  // 수입식품, 국내 건기식, 기타가공품용 순수 API 원문 텍스트
  const apiFullText = (() => {
    if (product.classification === 'OTC_DRUG') return '';
    const koreanLabel =
      product.functionalFoodDetail?.koreanLabelText ||
      (product as any).koreanLabelText ||
      '';
    const rawMtrl =
      product.functionalFoodDetail?.rawMaterialsText ||
      product.functionalFoodDetail?.subIngredientsText ||
      '';
    const stdrStnd = product.functionalFoodDetail?.standardSpecificationKorean || '';
    const precautions =
      product.functionalFoodDetail?.safetyPrecautionsText ||
      product.functionalFoodDetail?.safetyPrecautionsKorean?.join('\n') ||
      '';

    let fullText = (pureApiText || '').trim() || koreanLabel.trim();
    if (fullText) {
      return formatImportedLabelText(fullText);
    }

    if (!fullText) {
      if (product.classification === 'GENERAL_FOOD') {
        const sections: string[] = [];
        if (regulatoryCode) sections.push(`■ 품목제조보고번호: ${regulatoryCode}`);
        sections.push(`■ 제품명: ${product.productName}`);
        if (product.manufacturer) sections.push(`■ 제조업소: ${product.manufacturer}`);
        if (product.packagingUnit) sections.push(`■ 식품유형/소비기한: ${product.packagingUnit}`);
        if (product.functionalFoodDetail?.appearanceKorean) {
          sections.push(`■ 성상: ${product.functionalFoodDetail.appearanceKorean}`);
        }
        if (product.functionalFoodDetail?.suggestedUseKorean) {
          sections.push(`■ 섭취방법: ${product.functionalFoodDetail.suggestedUseKorean}`);
        }
        fullText = sections.join('\n');
      } else {
        const sections: string[] = [];
        if (regulatoryCode) sections.push(`■ 품목제조보고번호: ${regulatoryCode}`);
        sections.push(`■ 제품명: ${product.productName}`);
        if (product.manufacturer) sections.push(`■ 제조업소: ${product.manufacturer}`);
        if (product.functionalFoodDetail?.appearanceKorean) {
          sections.push(`■ 성상: ${product.functionalFoodDetail.appearanceKorean}`);
        }
        if (rawMtrl) sections.push(`\n■ 원재료명:\n${rawMtrl}`);
        if (stdrStnd) sections.push(`\n■ 기준 및 규격:\n${stdrStnd}`);
        if (precautions) sections.push(`\n■ 섭취 시 주의사항:\n${precautions}`);
        fullText = sections.join('\n');
      }
    }
    return fullText.trim();
  })();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-text"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden"
      >
        {/* 1. 상단 모달 헤더 (제품명 + 닫기 버튼) */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between shrink-0 bg-[#f8fafc]">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">
              {product.productName}
            </h2>
            {regulatoryCode && (
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                {product.classification === 'OTC_DRUG'
                  ? '품목코드'
                  : regulatoryCode.startsWith('수입_') || regulatoryCode.length === 7 || product.manufacturer?.includes('수입')
                  ? '수입/이력추적번호'
                  : '품목제조번호'}: {regulatoryCode}
              </span>
            )}
            {isFetchingFullApiText && (
              <span className="text-[11px] text-sky-600 font-semibold flex items-center gap-1 shrink-0">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>API 전문 동기화 중...</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. 모달 본문 (스크롤 영역) - 좌측 제품 정보, 우측 약사 상담 메모장 */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* 좌측: 제품 정보 섹션 */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-6 min-w-0 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          {/* 상단 액션 알약 버튼 & 제약회사 · 분류 · 가격 · 약 위치 요약 */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3 flex-1 min-w-[240px]">
              {/* 액션 버튼 그룹 */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProduct(product);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                  <span>제품 편집</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDocsModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                  <span>자료 첨부/열람</span>
                  {product.attachments && product.attachments.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 px-1.5 rounded-full text-[10px]">
                      {product.attachments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`'${product.productName}' 품목을 삭제하시겠습니까?`)) {
                      deleteProduct(product.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>제품 삭제</span>
                </button>
              </div>

              {/* 제약회사 · 분류 · 가격 · 약 위치 */}
              <div className="flex items-center gap-2.5 flex-wrap text-sm">
                <span className="font-extrabold text-slate-800">
                  {product.manufacturer} · {classificationShort}
                </span>
                {product.packagingUnit && (
                  <span className="text-xs text-slate-500">({product.packagingUnit})</span>
                )}
                {product.priceRetailKrw ? (
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    {product.priceRetailKrw.toLocaleString()} 원
                  </span>
                ) : null}
                {product.storageLocation && (
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    <span>약 위치: {product.storageLocation}</span>
                  </span>
                )}
              </div>

              {/* 효능 태그 표시 */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {product.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 우측: 제품 대표 사진이 있을 경우 깔끔한 썸네일 박스 표시 */}
            {thumbnail && (
              <div className="w-24 h-24 rounded-xl bg-white p-2 flex items-center justify-center border border-slate-200 shrink-0 shadow-xs">
                <img
                  src={thumbnail}
                  alt={product.productName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* 건기식 전용 SECTION 1: 성상 (C003 DISPOS) - 정보가 있을 때만 노출 */}
          {product.classification === 'HEALTH_FUNCTIONAL_FOOD' &&
            Boolean(
              product.functionalFoodDetail?.appearanceKorean &&
              product.functionalFoodDetail.appearanceKorean.trim() !== '' &&
              product.functionalFoodDetail.appearanceKorean !== '성상 정보 없음'
            ) && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-extrabold text-slate-500">성상</h3>
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed font-sans">
                    {product.functionalFoodDetail?.appearanceKorean}
                  </p>
                </div>
              </div>
            )}

          {/* SECTION: 복용법 / 복용 방법 (직접 수정 및 줄바꿈 지원) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-500">
                {product.classification === 'HEALTH_FUNCTIONAL_FOOD' ? '복용법' : '복용 방법'}
              </h3>
              {!isEditingDosage && (
                <button
                  type="button"
                  onClick={handleStartEditDosage}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                  title="나이별 복용량 및 복용 방법 직접 수정 (줄바꿈 가능)"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>용법 수정</span>
                </button>
              )}
            </div>

            {isEditingDosage ? (
              <div className="space-y-2 bg-[#f8fafc] border border-sky-300 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>엔터(Enter) 키로 줄바꿈하여 연령별 복용법을 입력하세요.</span>
                  <span className="text-amber-600 font-bold">줄바꿈 지원</span>
                </div>
                <textarea
                  value={editDosageValue}
                  onChange={(e) => setEditDosageValue(e.target.value)}
                  rows={4}
                  placeholder={`예)\n만 2세~4세: 1일 1회, 1회 1포\n만 5세 이상: 1일 2회, 1회 1포`}
                  className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg p-2.5 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500 whitespace-pre-wrap font-sans"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingDosage(false)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDosage}
                    className="px-3 py-1 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {dosageMethodText}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 2: 성분 / 함량 (약효분류 | 성분 함량 | 상한섭취량 3열 정렬) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-700">
                  성분 / 함량
                </h3>
                {isChildProduct && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Baby className="w-3 h-3 text-amber-600" />
                    어린이 제품
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 소아 및 전생애주기 상한섭취량 기준표 모달 열기 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsChildUlModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="2025 KDRIs 연령별 소아 및 전 생애주기 상한섭취량(UL) 상세 기준표 보기"
                >
                  <Baby className="w-3.5 h-3.5 text-amber-600" />
                  <span>상한섭취량(UL) 기준표</span>
                </button>

                {/* 성인 UL / 소아 UL 보기 토글 */}
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUlViewMode('ADULT')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      ulViewMode === 'ADULT'
                        ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    성인 UL
                  </button>
                  <button
                    type="button"
                    onClick={() => setUlViewMode('CHILD')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      ulViewMode === 'CHILD'
                        ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    소아 UL
                  </button>
                </div>

                {/* 1알/1포 vs 하루 섭취량 선택 토글 (오른쪽 끝 배치) */}
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDisplayBasis('PER_UNIT')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      displayBasis === 'PER_UNIT'
                        ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    1{unitName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayBasis('PER_DAILY')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      displayBasis === 'PER_DAILY'
                        ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    하루 섭취량
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {(() => {
                const isSeparatedFormat =
                  product.classification === 'OTC_DRUG' || product.classification === 'HEALTH_FUNCTIONAL_FOOD';

                return (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-extrabold text-slate-600 border-b border-slate-200">
                        <th className="w-[108px] sm:w-[116px] px-2 py-2 text-center border-r border-slate-200">
                          약효분류
                        </th>
                        <th className="px-3 sm:px-4 py-2 text-center border-r border-slate-200">
                          성분 함량
                        </th>
                        <th className="w-[160px] sm:w-[185px] px-2.5 py-2 text-center">
                          {ulViewMode === 'CHILD' ? (
                            <span className="text-amber-700">상한섭취량 (소아)</span>
                          ) : (
                            <span>상한섭취량 (성인)</span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                      {(() => {
                        // 성분 표시 정보 사전 계산 (선택된 기준에 따라 배율 적용)
                        const itemsWithInfo = sortedIngredients.map((ing) => {
                          const scaledIng: ProductIngredientEntry =
                            doseFactor === 1
                              ? ing
                              : {
                                  ...ing,
                                  rawAmount: parseFloat((ing.rawAmount * doseFactor).toFixed(2)),
                                  elementalAmount:
                                    ing.elementalAmount !== undefined
                                      ? parseFloat((ing.elementalAmount * doseFactor).toFixed(2))
                                      : undefined,
                                  ingredientInfoText: scaleIngredientInfoText(ing.ingredientInfoText, doseFactor)
                                };

                          const info = resolveIngredientDisplayInfo(scaledIng, product.productName);

                          return {
                            ing: scaledIng,
                            info,
                            badgeStyle: getDarkCategoryBadgeStyle(info.categoryTag)
                          };
                        });

                        // 상한섭취량 병합 기준 키 (동일 약효분류 내 동일 상한섭취량 병합)
                        const getUlGroupKey = (entry: (typeof itemsWithInfo)[0]) => {
                          if (ulViewMode === 'CHILD') {
                            return `${entry.info.categoryTag}__${entry.info.childUlText || ''}__${entry.info.ulText || ''}`;
                          }
                          return `${entry.info.categoryTag}__${entry.info.ulText || ''}`;
                        };

                        // 연속된 동일 약효분류 및 동일 상한섭취량 병합(rowSpan 계산)
                        return itemsWithInfo.map((item, idx) => {
                          const isFirstOfCategory =
                            idx === 0 || itemsWithInfo[idx - 1].info.categoryTag !== item.info.categoryTag;

                          let rowSpan = 1;
                          if (isFirstOfCategory) {
                            for (let j = idx + 1; j < itemsWithInfo.length; j++) {
                              if (itemsWithInfo[j].info.categoryTag === item.info.categoryTag) {
                                rowSpan++;
                              } else {
                                break;
                              }
                            }
                          }

                          const currentUlKey = getUlGroupKey(item);
                          const isFirstOfUl =
                            idx === 0 || getUlGroupKey(itemsWithInfo[idx - 1]) !== currentUlKey;

                          let ulRowSpan = 1;
                          if (isFirstOfUl) {
                            for (let j = idx + 1; j < itemsWithInfo.length; j++) {
                              if (getUlGroupKey(itemsWithInfo[j]) === currentUlKey) {
                                ulRowSpan++;
                              } else {
                                break;
                              }
                            }
                          }

                          return (
                            <tr
                              key={item.ing.ingredientId || idx}
                              className="hover:bg-sky-50/30 transition-colors"
                            >
                              {/* 1열: 약효분류 (동일 분류일 경우 셀 병합) */}
                              {isFirstOfCategory && (
                                <td
                                  rowSpan={rowSpan}
                                  className="px-2 py-2.5 text-center align-middle border-r border-slate-200 bg-slate-50/40"
                                >
                                  <span
                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border leading-tight whitespace-nowrap ${item.badgeStyle}`}
                                  >
                                    {item.info.categoryTag}
                                  </span>
                                </td>
                              )}

                              {/* 의약품 및 건강기능식품: 실제 영문성분명 + 함량 및 별도 분리된 원료형태 열 */}
                              {isSeparatedFormat ? (
                                /* 2열: 성분 함량 (실제 영문 성분명 + 함량 및 API 고시 환산 정보) */
                                <td className="px-4 py-2.5 border-r border-slate-200 align-middle">
                                  {(() => {
                                    const isProbiotic = isProbioticIngredient(
                                      item.ing.englishInn,
                                      item.info.categoryTag,
                                      item.ing.functionalCategory,
                                      item.ing.unit
                                    );

                                    const specText =
                                      product.functionalFoodDetail?.standardSpecificationKorean ||
                                      (product as any).standardSpecificationText ||
                                      '';
                                    const rawMtrlText =
                                      product.functionalFoodDetail?.rawMaterialsText ||
                                      (product as any).rawMaterialsText ||
                                      product.functionalFoodDetail?.subIngredientsText ||
                                      '';

                                    const probioticCountFromSpec = isProbiotic ? extractProbioticCount(specText) : null;
                                    const probioticStrains = isProbiotic ? extractProbioticStrains(rawMtrlText) : [];

                                    let baseCountText =
                                      probioticCountFromSpec ||
                                      item.ing.formattedSpecification?.match(/([0-9,]+(?:\.[0-9]+)?\s*억\s*CFU)/i)?.[1] ||
                                      item.ing.noteKorean?.match(/([0-9,]+(?:\.[0-9]+)?\s*억\s*CFU)/i)?.[1] ||
                                      item.ing.ingredientInfoText?.match(/([0-9,]+(?:\.[0-9]+)?\s*억\s*CFU)/i)?.[1];

                                    if (!baseCountText && isProbiotic) {
                                      if (item.ing.rawAmount >= 100000000) {
                                        baseCountText = `${(item.ing.rawAmount / 100000000).toLocaleString()}억 CFU`;
                                      } else if (item.ing.rawAmount >= 10 && item.ing.rawAmount <= 1000) {
                                        baseCountText = `${item.ing.rawAmount}억 CFU`;
                                      } else if (item.ing.unit === 'CFU') {
                                        baseCountText = `${item.ing.rawAmount.toLocaleString()} CFU`;
                                      }
                                    }

                                    const probioticCountDisplay = baseCountText
                                      ? scaleProbioticCount(baseCountText, doseFactor)
                                      : null;

                                    return (
                                      <div className="space-y-1.5">
                                        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                                          <span className="font-semibold text-slate-900 tracking-tight">
                                            {item.info.englishName || item.ing.englishInn}
                                          </span>
                                          <span className="font-bold text-slate-900 tracking-tight">
                                            {isProbiotic && probioticCountDisplay
                                              ? probioticCountDisplay
                                              : `${item.ing.rawAmount.toLocaleString()}${item.ing.unit === 'ug' ? 'µg' : item.ing.unit}`}
                                          </span>
                                          {item.info.convertedText && !isProbiotic && (
                                            <span className="font-medium text-emerald-600 text-[11px]">
                                              ({item.info.convertedText})
                                            </span>
                                          )}
                                        </div>

                                        {isProbiotic && probioticStrains.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-slate-100">
                                            <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block"></span>
                                              <span>함유 균주 ({probioticStrains.length}종)</span>
                                            </div>
                                            <ul className="space-y-1 pl-0.5">
                                              {probioticStrains.map((strain, sIdx) => (
                                                <li
                                                  key={sIdx}
                                                  className="flex items-center gap-1.5 text-xs text-slate-700 font-medium leading-tight flex-wrap"
                                                >
                                                  <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                  <span className="font-sans tracking-tight">{strain.name}</span>
                                                  {strain.isStandard && (
                                                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.2 rounded leading-none shrink-0">
                                                      고시형
                                                    </span>
                                                  )}
                                                  {strain.regulatoryType === '개별인정형' && (
                                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded leading-none shrink-0">
                                                      개별인정형
                                                    </span>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              ) : (
                                /* 일반식품(기타가공품 등): 기존 표시 설정 유지 */
                                <td className="px-4 py-2.5 border-r border-slate-200 align-middle">
                              {(() => {
                                const nutrientCategory =
                                  item.info.categoryTag && item.info.categoryTag !== '기타'
                                    ? item.info.categoryTag
                                    : item.ing.functionalCategory && item.ing.functionalCategory !== '기타'
                                    ? item.ing.functionalCategory
                                    : null;

                                let explicitSalt =
                                  item.ing.chemicalFormName && item.ing.chemicalFormName !== '-'
                                    ? cleanChemicalFormName(item.ing.chemicalFormName, item.info.categoryTag, item.info.englishName)
                                    : null;

                                // 비타민K의 경우 기존 데이터에 원료염이 누락되었더라도 K2(메나퀴논-7) 자동 보정
                                if (!explicitSalt && (nutrientCategory === '비타민K' || /vitamin\s*k/i.test(item.info.englishName))) {
                                  explicitSalt = '비타민 K2(메나퀴논-7)';
                                }

                                const displayUnit = item.ing.unit === 'ug' ? 'µg' : item.ing.unit;

                                // 원료염이 명시되어 있거나, 성분명 자체가 원료염(예: 글루콘산 마그네슘, 젖산 칼슘 등)인 경우 포맷 적용
                                const hasSaltDetail =
                                  Boolean(explicitSalt) ||
                                  item.info.englishName.includes(',') ||
                                  Boolean(
                                    nutrientCategory &&
                                      item.info.englishName !== nutrientCategory &&
                                      /(?:글루콘산|젖산|황산|탄산|구연산|산화|염화|해조|푸마르산|락트산|메나퀴|메나큐)/.test(
                                        item.info.englishName
                                      )
                                  );

                                if (hasSaltDetail) {
                                  const nutrientTitle = nutrientCategory || item.info.englishName;
                                  const saltsText =
                                    explicitSalt ||
                                    (item.info.englishName.includes(',') || item.info.englishName !== nutrientTitle
                                      ? item.info.englishName
                                      : null);

                                  return (
                                    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                                      <span className="font-semibold text-slate-900 tracking-tight">
                                        {nutrientTitle}
                                      </span>
                                      <span className="font-bold text-slate-900 tracking-tight">
                                        {item.ing.rawAmount.toLocaleString()}{displayUnit}
                                      </span>
                                      {saltsText && (
                                        <span className="font-normal text-slate-600 text-[11px] tracking-tight">
                                          ({saltsText})
                                        </span>
                                      )}
                                    </div>
                                  );
                                }

                                const isProbiotic = isProbioticIngredient(
                                  item.ing.englishInn,
                                  item.info.categoryTag,
                                  item.ing.functionalCategory,
                                  item.ing.unit
                                );

                                if (isProbiotic) {
                                  const specText =
                                    product.functionalFoodDetail?.standardSpecificationKorean ||
                                    (product as any).standardSpecificationText ||
                                    '';
                                  const rawMtrlText =
                                    product.functionalFoodDetail?.rawMaterialsText ||
                                    (product as any).rawMaterialsText ||
                                    product.functionalFoodDetail?.subIngredientsText ||
                                    '';

                                  const probioticCountFromSpec = extractProbioticCount(specText);
                                  const probioticStrains = extractProbioticStrains(rawMtrlText);

                                  let baseCountText =
                                    probioticCountFromSpec ||
                                    item.ing.formattedSpecification?.match(/([0-9,]+(?:\.[0-9]+)?\s*억\s*CFU)/i)?.[1] ||
                                    item.ing.noteKorean?.match(/([0-9,]+(?:\.[0-9]+)?\s*억\s*CFU)/i)?.[1] ||
                                    item.ing.ingredientInfoText?.match(/([0-9,]+(?:\.[0-9]+)?\s*억\s*CFU)/i)?.[1];

                                  if (!baseCountText) {
                                    if (item.ing.rawAmount >= 100000000) {
                                      baseCountText = `${(item.ing.rawAmount / 100000000).toLocaleString()}억 CFU`;
                                    } else if (item.ing.rawAmount >= 10 && item.ing.rawAmount <= 1000) {
                                      baseCountText = `${item.ing.rawAmount}억 CFU`;
                                    } else if (item.ing.unit === 'CFU') {
                                      baseCountText = `${item.ing.rawAmount.toLocaleString()} CFU`;
                                    }
                                  }

                                  const probioticCountDisplay = baseCountText
                                    ? scaleProbioticCount(baseCountText, doseFactor)
                                    : null;

                                  return (
                                    <div className="space-y-1.5">
                                      <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                                        <span className="font-semibold text-slate-900 tracking-tight">
                                          {item.info.englishName || item.ing.englishInn}
                                        </span>
                                        <span className="font-bold text-slate-900 tracking-tight">
                                          {probioticCountDisplay || `${item.ing.rawAmount.toLocaleString()}${displayUnit}`}
                                        </span>
                                      </div>
                                      {probioticStrains.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                          <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block"></span>
                                            <span>함유 균주 ({probioticStrains.length}종)</span>
                                          </div>
                                          <ul className="space-y-1 pl-0.5">
                                            {probioticStrains.map((strain, sIdx) => (
                                              <li
                                                key={sIdx}
                                                className="flex items-center gap-1.5 text-xs text-slate-700 font-medium leading-tight flex-wrap"
                                              >
                                                <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                <span className="font-sans tracking-tight">{strain.name}</span>
                                                {strain.isStandard && (
                                                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.2 rounded leading-none shrink-0">
                                                    고시형
                                                  </span>
                                                )}
                                                {strain.regulatoryType === '개별인정형' && (
                                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded leading-none shrink-0">
                                                    개별인정형
                                                  </span>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                const fallbackTitle = nutrientCategory || item.info.englishName;

                                return (
                                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                                    <span className="font-semibold text-slate-900 tracking-tight">
                                      {fallbackTitle}
                                    </span>
                                    <span className="font-bold text-slate-900 tracking-tight">
                                      {item.ing.rawAmount.toLocaleString()}{displayUnit}
                                    </span>
                                    {item.info.convertedText && (
                                      <span className="font-medium text-emerald-600 text-[11px]">
                                        ({item.info.convertedText})
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          )}

                          {/* 3열: 상한섭취량 (소아/성인 모드 대응, 동일 약효분류 및 상한섭취량일 경우 셀 병합) */}
                          {isFirstOfUl && (
                            <td
                              rowSpan={ulRowSpan}
                              className="px-2.5 sm:px-3 py-2.5 text-center align-middle"
                            >
                              {ulViewMode === 'CHILD' ? (
                                item.info.childUlText ? (
                                  <div className="flex flex-col items-center">
                                    <span
                                      title={item.info.childUlNote || '2025 KDRIs 소아 상한섭취량(UL)'}
                                      className="text-xs font-bold text-amber-700 tracking-tight cursor-help whitespace-nowrap"
                                    >
                                      {item.info.childUlText}
                                    </span>
                                    {item.info.ulText && (
                                      <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">
                                        (성인 {item.info.ulText})
                                      </span>
                                    )}
                                  </div>
                                ) : item.info.ulText ? (
                                  <div className="flex flex-col items-center">
                                    <span
                                      title={item.info.ulNote || '2025 한국인 영양소 섭취기준(KDRIs) 성인 1일 상한섭취량(UL)'}
                                      className="text-xs font-semibold text-rose-600 tracking-tight whitespace-nowrap"
                                    >
                                      {item.info.ulText}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">
                                      (성인 기준)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )
                              ) : (
                                item.info.ulText ? (
                                  <span
                                    title={item.info.ulNote || '2025 한국인 영양소 섭취기준(KDRIs) 성인 1일 상한섭취량(UL)'}
                                    className="text-xs font-semibold text-rose-600 tracking-tight whitespace-nowrap"
                                  >
                                    {item.info.ulText}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            );
          })()}
        </div>
          </div>

          {/* 건기식 전용 SECTION 4: 기능성 */}
          {product.classification === 'HEALTH_FUNCTIONAL_FOOD' && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-extrabold text-slate-500">기능성</h3>
              <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4">
                {(() => {
                  let rawClaims = product.functionalFoodDetail?.functionalClaimsKorean || [];
                  const labelText =
                    (product as any).koreanLabelText ||
                    product.functionalFoodDetail?.koreanLabelText ||
                    pureApiText ||
                    '';
                  if (labelText) {
                    const parsed = parseImportedKoreanLabel(labelText);
                    if (parsed.indicationsSummary.length > 0 && !parsed.indicationsSummary[0].includes('공식 인정 기능성')) {
                      rawClaims = parsed.indicationsSummary;
                    }
                  }

                  const resolvedList = resolveFunctionalClaimsWithNutrients(rawClaims, product.ingredients);
                  if (resolvedList.length === 0) {
                    return <p className="text-xs text-slate-400">등록된 기능성 정보가 없습니다.</p>;
                  }

                  const getNutrientIcon = (nutrient: string) => {
                    const n = nutrient.toLowerCase();
                    if (n.includes('프로바이오틱스') || n.includes('유산균')) {
                      return <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                    }
                    if (n.includes('비타민')) {
                      return <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                    }
                    if (
                      n.includes('칼슘') ||
                      n.includes('마그네슘') ||
                      n.includes('아연') ||
                      n.includes('철') ||
                      n.includes('셀레늄') ||
                      n.includes('구리') ||
                      n.includes('망간') ||
                      n.includes('요오드') ||
                      n.includes('크롬') ||
                      n.includes('몰리브덴') ||
                      n.includes('미네랄')
                    ) {
                      return <Shield className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
                    }
                    if (n.includes('오메가') || n.includes('혈행') || n.includes('epa')) {
                      return <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                    }
                    if (n.includes('루테인') || n.includes('눈') || n.includes('지아잔틴')) {
                      return <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
                    }
                    if (n.includes('밀크씨슬') || n.includes('간') || n.includes('실리마린') || n.includes('홍삼')) {
                      return <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                    }
                    return <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
                  };

                  // 영양소별 그룹화
                  const groupsMap = new Map<string, string[]>();
                  resolvedList.forEach((item) => {
                    const existing = groupsMap.get(item.nutrient) || [];
                    const points = splitDescriptionPoints(item.description);
                    points.forEach((p) => {
                      if (!existing.includes(p)) existing.push(p);
                    });
                    groupsMap.set(item.nutrient, existing);
                  });

                  return (
                    <div className="space-y-3.5">
                      {Array.from(groupsMap.entries()).map(([nutrient, points], gIdx) => (
                        <div key={gIdx} className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                            {getNutrientIcon(nutrient)}
                            <span>{nutrient}</span>
                          </div>
                          <ul className="pl-3.5 space-y-0.5">
                            {points.map((pt, pIdx) => (
                              <li key={pIdx} className="text-xs text-slate-700 flex items-start gap-1.5 leading-relaxed">
                                <span className="text-slate-400 font-bold shrink-0 select-none">-</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 건기식 전용 SECTION 5: 섭취 시 주의사항 (C003 IFTKN_ATNT_MATR_CN) */}
          {product.classification === 'HEALTH_FUNCTIONAL_FOOD' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <h3 className="text-xs font-extrabold text-slate-600">섭취 시 주의사항</h3>
              </div>
              <div className="bg-rose-50/30 border border-rose-200/70 rounded-xl p-4">
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                  {deduplicatePrecautionsText(
                    product.functionalFoodDetail?.safetyPrecautionsText ||
                      (product.functionalFoodDetail?.safetyPrecautionsKorean &&
                        product.functionalFoodDetail.safetyPrecautionsKorean.join('\n')) ||
                      precautionsFullText
                  )}
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: 효능·효과 (일반의약품 전용 핵심 요약 + 전문보기 버튼) */}
          {product.classification === 'OTC_DRUG' && otcIndicationsFullText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-600">효능·효과 요약</h3>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded">
                    핵심 복약 요약
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIndicationsFullModalOpen(true)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>전문보기</span>
                </button>
              </div>

              <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4">
                <ul className="space-y-1.5 text-xs text-slate-800 leading-relaxed font-medium">
                  {summarizedIndicationsList.length > 0 ? (
                    summarizedIndicationsList.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-sky-600 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-600">{otcIndicationsFullText}</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 4: 일반의약품 사용상의 주의사항 (연령금기, 임부/수유부 금기, 약과 병용 금기 성분 요약 + 전문보기 버튼) */}
          {product.classification === 'OTC_DRUG' && precautionsFullText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <h3 className="text-xs font-extrabold text-slate-600">
                    {product.classification === 'OTC_DRUG'
                      ? '사용상의 주의사항 요약'
                      : '섭취 시 주의사항 요약'}
                  </h3>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                    복약지도 핵심
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrecautionsModalTab('API');
                      setIsPrecautionsFullModalOpen(true);
                    }}
                    className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>전문보기</span>
                  </button>
                </div>
              </div>

              <div className="bg-rose-50/30 border border-rose-200/70 rounded-xl p-4 space-y-3">
                {/* 1. 연령 금기 */}
                {summarizedPrecautions.ageContraindication && (
                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-extrabold text-[11px] shrink-0 border border-rose-200">
                      연령 금기
                    </span>
                    <span className="font-bold text-rose-950 pt-0.5">
                      {summarizedPrecautions.ageContraindication}
                    </span>
                  </div>
                )}

                {/* 2. 임부 및 수유부 금기 */}
                {summarizedPrecautions.pregnancyContraindication && (
                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-extrabold text-[11px] shrink-0 border border-purple-200">
                      임부·수유부
                    </span>
                    <span className="font-semibold text-purple-950 pt-0.5">
                      {summarizedPrecautions.pregnancyContraindication}
                    </span>
                  </div>
                )}

                {/* 3. 약과 병용 금기 성분 위주 */}
                {summarizedPrecautions.drugInteractions.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-rose-100">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] shrink-0 border border-amber-200">
                        병용 금기/상호작용
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        주의 약물 및 복용 간격
                      </span>
                    </div>
                    <ul className="space-y-1 pl-1 text-xs text-slate-800 leading-relaxed font-medium">
                      {summarizedPrecautions.drugInteractions.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. 주요 금기 질환 */}
                {summarizedPrecautions.generalWarning && (
                  <div className="flex items-start gap-2.5 text-xs pt-1 border-t border-rose-100">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px] shrink-0 border border-slate-200">
                      투여 금기
                    </span>
                    <span className="text-slate-800 pt-0.5 font-medium">
                      {summarizedPrecautions.generalWarning}
                    </span>
                  </div>
                )}

                {/* 실물 라벨 추출 텍스트가 있을 경우 실물 라벨 우선 표시 */}
                {product.functionalFoodDetail?.labelPrecautionsText ? (
                  !isMeaningfulKoreanText(product.functionalFoodDetail.labelPrecautionsText) ? (
                    <div className="space-y-1 pt-1 border-t border-rose-100">
                      <div className="flex items-center justify-between text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <span className="text-[11px] font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>사진 글자 인식 오류 (외계어 감지됨)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPrecautionsModalTab('LABEL');
                            setIsPrecautionsFullModalOpen(true);
                            handleStartEditLabelPrecautions();
                          }}
                          className="text-[11px] font-extrabold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          직접 수정 / 템플릿 적용
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1 border-t border-rose-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-emerald-600" />
                          <span>제품사진 뒷면 실물 라벨 주의사항</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearLabelPrecautions}
                            className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                            title="실물 라벨 텍스트와 첨부된 뒷면 사진을 모두 삭제합니다"
                          >
                            라벨/사진 삭제
                          </button>
                          <span className="text-[10px] text-slate-400">
                            상세내용은 [전문보기] 클릭
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-line font-medium">
                        {product.functionalFoodDetail.labelPrecautionsText}
                      </p>
                    </div>
                  )
                ) : (
                  /* 요약 항목이 하나도 매칭되지 않은 경우 안전하게 앞부분 2~3줄 요약 노출 */
                  !summarizedPrecautions.ageContraindication &&
                  !summarizedPrecautions.pregnancyContraindication &&
                  summarizedPrecautions.drugInteractions.length === 0 &&
                  !summarizedPrecautions.generalWarning && (
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                      {precautionsFullText}
                    </p>
                  )
                )}

                {product.otcDetail?.storageMethodKorean && (
                  <p className="text-xs text-slate-600 font-medium pt-2 border-t border-rose-200/60">
                    보관방법: {product.otcDetail.storageMethodKorean}
                  </p>
                )}
              </div>
            </div>
          )}

              {/* API 전문 보기 버튼 (수입식품, 국내 건기식, 기타식품 전용 - 왼쪽 제일 하단 배치) */}
              {product.classification !== 'OTC_DRUG' && Boolean(apiFullText) && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsApiFullModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-sky-700 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-colors shadow-2xs cursor-pointer w-fit"
                    title="새 창으로 API 전문 보기"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    <span>API 전문 보기</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* 우측 약사 상담 메모장 (Sticky) */}
            <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-0 space-y-3">
              <div className="bg-white rounded-2xl border border-amber-200/90 shadow-2xs p-4 sm:p-5 flex flex-col">
                {/* 메모장 헤더 */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <StickyNote className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-extrabold text-slate-800 tracking-tight">
                      약사 상담 메모
                    </h3>
                  </div>

                  {/* 자동 저장 상태 표시 및 수동 저장 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {memoSaveStatus === 'SAVING' && (
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>저장 중</span>
                      </span>
                    )}
                    {memoSaveStatus === 'SAVED' && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>저장됨</span>
                      </span>
                    )}
                    {memoSaveStatus === 'IDLE' && (
                      <button
                        type="button"
                        onClick={() => handleSaveMemo()}
                        className="text-[11px] font-bold text-slate-600 hover:text-amber-800 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="즉시 저장"
                      >
                        <Save className="w-3 h-3 text-amber-600" />
                        <span>저장</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 메모장 텍스트에어리어 */}
                <div className="pt-3 flex-1 flex flex-col">
                  <textarea
                    value={pharmacistNotes}
                    onChange={(e) => setPharmacistNotes(e.target.value)}
                    placeholder="메모를 입력하세요..."
                    className="w-full flex-1 min-h-[420px] lg:min-h-[520px] xl:min-h-[580px] p-3.5 text-xs sm:text-[13px] text-slate-800 bg-[#fffdf7] border border-amber-200/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none font-sans leading-relaxed placeholder:text-slate-400 shadow-inner"
                  />
                  {pharmacistNotes.length > 0 && (
                    <div className="pt-1.5 flex justify-end text-[10px] text-slate-400 font-medium">
                      <span>{pharmacistNotes.length}자</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API 전문보기 팝업 모달 (새 창 팝업) */}
        {isApiFullModalOpen && Boolean(apiFullText) && (
          <div
            onClick={() => {
              setIsApiFullModalOpen(false);
              setHighlightSelection(null);
            }}
            className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden relative"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate flex items-center gap-2">
                      <span>API 전문 보기</span>
                      <span className="text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Highlighter className="w-3 h-3 text-amber-500" />
                        <span>텍스트 드래그 시 형광펜</span>
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {product.productName} {regulatoryCode ? `(${regulatoryCode})` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsApiFullModalOpen(false);
                    setHighlightSelection(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-200 transition-colors cursor-pointer shrink-0"
                  title="닫기 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 전문 본문 (스크롤) */}
              <div
                onMouseUp={handleMouseUpInApiModal}
                className="p-5 overflow-y-auto max-h-[68vh] bg-[#f8fafc] text-xs sm:text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed font-mono select-text border-b border-slate-200 relative"
              >
                {renderApiTextWithCustomHighlights(apiFullText, product.apiHighlights || [])}
              </div>

              {/* 드래그 선택 시 뜨는 형광펜 칠하기 툴팁 */}
              {highlightSelection && (
                <div
                  style={{
                    position: 'fixed',
                    top: `${Math.max(12, highlightSelection.position.top)}px`,
                    left: `${highlightSelection.position.left}px`,
                    transform: 'translateX(-50%)',
                    zIndex: 100
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddApiHighlight(highlightSelection.text);
                  }}
                  className="bg-slate-900 text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-2xl flex items-center gap-1.5 cursor-pointer hover:bg-amber-600 transition-all scale-105 border border-slate-700 animate-in fade-in"
                  title="선택한 텍스트에 형광펜 칠하기"
                >
                  <Highlighter className="w-3.5 h-3.5 text-amber-300" />
                  <span>형광펜 칠하기</span>
                </div>
              )}

              {/* 하단 바 (형광펜 정보 및 닫기 버튼) */}
              <div className="px-5 py-3 bg-white flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-slate-400">
                    {apiFullText.length}자 제공됨
                  </span>
                  {(product.apiHighlights || []).length > 0 && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Highlighter className="w-3 h-3 text-amber-600" />
                      <span>형광펜 {(product.apiHighlights || []).length}개</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(product.apiHighlights || []).length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllApiHighlights}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                      title="칠해진 모든 형광펜을 삭제합니다"
                    >
                      형광펜 전체 지우기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsApiFullModalOpen(false);
                      setHighlightSelection(null);
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 효능·효과 식약처 전문보기 모달 팝업 */}
        {isIndicationsFullModalOpen && (
          <div
            onClick={() => setIsIndicationsFullModalOpen(false)}
            className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>효능·효과 식약처 허가 전문</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsIndicationsFullModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[72vh] bg-white select-text">
                {renderFormattedApiText(
                  otcIndicationsFullText ||
                    product.functionalFoodDetail?.functionalClaimsKorean?.join('\n\n') ||
                    '',
                  indicationHighlightKeywords
                )}
              </div>
            </div>
          </div>
        )}

        {/* 사용상의 주의사항 / 섭취 시 주의사항 전문보기 모달 팝업 */}
        {isPrecautionsFullModalOpen && (
          <div
            onClick={() => setIsPrecautionsFullModalOpen(false)}
            className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      {product.classification === 'OTC_DRUG'
                        ? '사용상의 주의사항 허가 전문'
                        : '섭취 시 주의사항 전문'}
                    </span>
                  </h4>
                  {product.classification === 'HEALTH_FUNCTIONAL_FOOD' && (
                    <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPrecautionsModalTab('LABEL')}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                          precautionsModalTab === 'LABEL'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-rose-600" />
                        <span>📸 실물 라벨 뒷면 주의사항</span>
                        {product.functionalFoodDetail?.labelPrecautionsText && (
                          <span className={`w-2 h-2 rounded-full inline-block ${
                            isMeaningfulKoreanText(product.functionalFoodDetail.labelPrecautionsText)
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrecautionsModalTab('API')}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                          precautionsModalTab === 'API'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🌐 식약처 API 신고사항</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrecautionsFullModalOpen(false);
                      setIsEditingLabelPrecautions(false);
                    }}
                    className="w-7 h-7 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[75vh] bg-white select-text">
                {product.classification === 'HEALTH_FUNCTIONAL_FOOD' && precautionsModalTab === 'LABEL' ? (
                  isEditingLabelPrecautions ? (
                    /* 1. 직접 수정 / 편집 모드 */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-rose-600" />
                          <span>실물 패키지 라벨 섭취 시 주의사항 편집</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyStandardHffTemplate}
                          className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                          title="식약처 표준 건기식 섭취 시 주의사항 문구를 자동으로 채워넣습니다"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>✨ 건기식 표준 템플릿 채우기</span>
                        </button>
                      </div>

                      <textarea
                        value={editLabelPrecautionsValue}
                        onChange={(e) => setEditLabelPrecautionsValue(e.target.value)}
                        placeholder="실물 패키지 뒷면에 적힌 [섭취 시 주의사항] 문구를 직접 입력하거나 수정하세요.&#10;&#10;예시:&#10;1. 이상사례 발생 시 섭취를 중단하고 전문가와 상담하십시오.&#10;2. 특이체질, 알레르기 체질의 경우 개인에 따라 과민반응을 나타낼 수 있으므로 원료를 확인한 후 섭취하십시오.&#10;3. 제품 개봉 또는 섭취 시 포장재에 의해 상처를 입을 수 있으니 주의하십시오."
                        className="w-full h-64 p-3.5 text-xs text-slate-800 font-mono leading-relaxed border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/50 resize-y"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleClearLabelPrecautions}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>라벨 주의사항 초기화(삭제)</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingLabelPrecautions(false)}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-xs cursor-pointer hover:bg-slate-100"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditedLabelPrecautions}
                            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs cursor-pointer shadow-xs"
                          >
                            저장하기
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : product.functionalFoodDetail?.labelPrecautionsText ? (
                    !isMeaningfulKoreanText(product.functionalFoodDetail.labelPrecautionsText) ? (
                      /* 2. 외계어 / 깨진 글자가 인식된 경우 경고 안내 및 즉시 복구 패널 */
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3.5">
                          <div className="flex items-center gap-2.5 text-amber-900 font-extrabold text-sm">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                            <span>사진 촬영 인식 오류 (외계어/깨진 글자 감지됨)</span>
                          </div>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            사진 촬영 시의 각도, 곡면 파우치 반사, 또는 작은 폰트 크기로 인해 영문 깨짐 현상이 발생했습니다.
                            아래 버튼을 눌러 올바른 문구로 변경하시거나 표준 템플릿을 적용해주세요.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditLabelPrecautionsValue(STANDARD_HFF_PRECAUTIONS_TEMPLATE);
                                setIsEditingLabelPrecautions(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>✨ 건기식 표준 템플릿 채우기 (추천)</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleStartEditLabelPrecautions}
                              className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs cursor-pointer"
                            >
                              ✏️ 직접 문구 입력/수정
                            </button>
                            <button
                              type="button"
                              onClick={() => backPhotoInputRef.current?.click()}
                              disabled={isUploadingBackPhoto}
                              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>📸 선명하게 다시 촬영</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleClearLabelPrecautions}
                              className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs cursor-pointer"
                            >
                              🗑️ 깨진 텍스트 지우기
                            </button>
                          </div>
                        </div>

                        {/* 판독 오류 원문 열람 토글 */}
                        <details className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <summary className="cursor-pointer font-bold text-slate-600 select-none">
                            🔍 인식된 원문 텍스트 확인하기 (오류 내용)
                          </summary>
                          <pre className="mt-2 text-[11px] font-mono text-slate-500 whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {product.functionalFoodDetail.labelPrecautionsText}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      /* 3. 정상적으로 인식된 실물 라벨 전문 */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-500">
                            실물 제품 패키지 뒷면 라벨에서 판독된 주의사항 전문입니다.
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleStartEditLabelPrecautions}
                              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>문구 수정</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => backPhotoInputRef.current?.click()}
                              disabled={isUploadingBackPhoto}
                              className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              <span>사진 다시 등록</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleClearLabelPrecautions}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                              title="실물 라벨 텍스트와 첨부된 뒷면 사진을 모두 삭제합니다"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>라벨/사진 삭제</span>
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
                          {product.functionalFoodDetail.labelPrecautionsText}
                        </div>
                      </div>
                    )
                  ) : (
                    /* 4. 라벨 사진이 등록되지 않은 경우 */
                    <div className="text-center py-12 px-6 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <h5 className="text-base font-extrabold text-slate-900">
                          제품사진 뒷면을 찍어 올리시면 실물 주의사항을 텍스트로 보여드립니다
                        </h5>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                          식약처 신고 API 데이터 외에, 제품 패키지 뒷면에 인쇄된 상세 섭취 시 주의사항(특이체질, 알레르기, 어린이 지도사항 등)을 등록합니다.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => backPhotoInputRef.current?.click()}
                          disabled={isUploadingBackPhoto}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingBackPhoto ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{backPhotoStatusMessage || '글자 판독 중...'}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>📸 제품 뒷면 사진 찍기 / 업로드</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleStartEditLabelPrecautions}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>✏️ 텍스트 직접 입력 / 템플릿</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500">
                        식약처 공공 API (식품안전나라/의약품안전나라) 공식 등록 주의사항 전문입니다.
                      </span>
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        형광펜: 복약 요약 항목
                      </span>
                    </div>
                    {renderFormattedApiText(precautionsFullText, precautionHighlightKeywords)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2025 KDRIs 단일 통합 상한섭취량 기준표 팝업 모달 */}
        {isChildUlModalOpen && (
          <div
            onClick={() => setIsChildUlModalOpen(false)}
            className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden"
            >
              {/* 모달 상단 헤더 */}
              <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-amber-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 font-black shrink-0">
                    <Baby className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>2025 한국인 영양소 섭취기준(KDRIs) 1일 상한섭취량(UL) 기준표</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      보건복지부 · 한국영양학회 2025 최신 기준 (소아·청소년 · 성인 · 노인 · 임신부 · 수유부 전 생애주기)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/docs/2025_KDRI_summary.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                    title="2025 한국인 영양소 섭취기준 요약본 원본 PDF 새 창 열기 / 다운로드"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    <span className="hidden sm:inline">2025 한국인 영양소 섭취기준 원본파일</span>
                    <span className="sm:hidden">원본파일</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsChildUlModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 본문 영역: 단일 통합 테이블 */}
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 overflow-y-auto flex-1 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
                  <span>* 영양소 23종 (비타민 13종 · 미네랄 9종 · 콜린 1종)</span>
                  <span>* 성인 남녀 기준 통합 (성별 차이가 있는 몰리브덴·콜린은 범위 표기)</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs border-collapse table-fixed min-w-[740px] sm:min-w-full">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold text-[11px] border-b border-slate-200">
                        <th className="w-[9.5%] px-1.5 py-1.5 text-center border-r border-slate-200">영양소</th>
                        <th className="w-[9%] px-1 py-1.5 text-center border-r border-slate-200">1~2세</th>
                        <th className="w-[9%] px-1 py-1.5 text-center border-r border-slate-200">3~5세</th>
                        <th className="w-[9%] px-1 py-1.5 text-center border-r border-slate-200">6~8세</th>
                        <th className="w-[9%] px-1 py-1.5 text-center border-r border-slate-200">9~11세</th>
                        <th className="w-[9%] px-1 py-1.5 text-center border-r border-slate-200">12~14세</th>
                        <th className="w-[9%] px-1 py-1.5 text-center border-r border-slate-200">15~18세</th>
                        <th className="w-[10.5%] px-1 py-1.5 text-center border-r border-slate-200 bg-slate-100 font-extrabold text-slate-800">성인(19~64)</th>
                        <th className="w-[8.5%] px-1 py-1.5 text-center border-r border-slate-200 bg-slate-50 text-slate-700">노인(65+)</th>
                        <th className="w-[8.5%] px-1 py-1.5 text-center border-r border-slate-200 bg-rose-50 text-rose-900 font-extrabold">임신부</th>
                        <th className="w-[8.5%] px-1 py-1.5 text-center bg-purple-50 text-purple-900 font-extrabold">수유부</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {KDRI_2025_UNIFIED_UL_REFERENCE_TABLE.map((row) => (
                        <tr key={row.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-1.5 py-1 sm:py-1.5 font-extrabold text-slate-900 border-r border-slate-200 text-center align-middle text-[11px] sm:text-xs leading-tight">
                            {row.nutrientName}
                          </td>
                          {row.isNoUl ? (
                            <td
                              colSpan={10}
                              className="px-2 py-1 sm:py-1.5 text-center text-slate-400 font-medium bg-slate-50/60 align-middle text-[11px]"
                            >
                              상한섭취량 미설정
                            </td>
                          ) : (
                            <>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-bold text-amber-700 border-r border-slate-200 align-middle text-[11px]">
                                {row.age1_2}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-bold text-amber-700 border-r border-slate-200 align-middle text-[11px]">
                                {row.age3_5}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-bold text-amber-700 border-r border-slate-200 align-middle text-[11px]">
                                {row.age6_8}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-bold text-amber-700 border-r border-slate-200 align-middle text-[11px]">
                                {row.age9_11}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-bold text-amber-700 border-r border-slate-200 align-middle text-[11px]">
                                {row.age12_14}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-bold text-amber-700 border-r border-slate-200 align-middle text-[11px]">
                                {row.age15_18}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-extrabold text-slate-900 bg-slate-50/50 border-r border-slate-200 align-middle text-[11px] leading-tight">
                                {(() => {
                                  const match = row.adult.match(/^(.*?)\s*(\(.*?\))$/);
                                  if (match) {
                                    return (
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span>{match[1]}</span>
                                        <span className="text-[10px] text-slate-500 font-normal tracking-tight">{match[2]}</span>
                                      </div>
                                    );
                                  }
                                  return <span>{row.adult}</span>;
                                })()}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-semibold text-slate-800 bg-slate-50/30 border-r border-slate-200 align-middle text-[11px]">
                                {row.elderly}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-extrabold text-rose-700 border-r border-slate-200 bg-rose-50/30 align-middle text-[11px]">
                                {row.pregnant}
                              </td>
                              <td className="px-1 py-1 sm:py-1.5 text-center font-extrabold text-purple-700 bg-purple-50/30 align-middle text-[11px]">
                                {row.lactating}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 모달 하단 푸터 (단위 안내 및 닫기) */}
              <div className="px-4 py-2 sm:px-5 sm:py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 font-medium">
                  * 기준 단위: 비타민 A(㎍ RAE), 비타민 D·B12(㎍), 비타민 E(㎎ α-TE), 비타민 C·나이아신·미네랄(㎎)
                </div>
                <button
                  type="button"
                  onClick={() => setIsChildUlModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 제품 뒷면 사진 선택용 숨김 input */}
        <input
          type="file"
          ref={backPhotoInputRef}
          onChange={handleBackPhotoSelect}
          accept="image/*"
          className="hidden"
        />

        {/* 첨부 자료 관리 모달 */}
        <AttachedDocumentsModal
          isOpen={isDocsModalOpen}
          onClose={() => setIsDocsModalOpen(false)}
          product={product}
        />
      </div>
    </div>
  );
};
