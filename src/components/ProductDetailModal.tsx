import React, { useState, useEffect } from 'react';
import { ProductItem } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import {
  fetchMfdsDrugDetail,
  searchPublicDrugDatabase,
  convertMasterItemToFetchResult
} from '../services/publicDataService';
import { AttachedDocumentsModal } from './AttachedDocumentsModal';
import { resolveIngredientDisplayInfo, sortProductIngredients } from '../utils/innMapper';
import { getDarkCategoryBadgeStyle } from '../utils/categoryColors';
import {
  X,
  Edit3,
  Trash2,
  Paperclip,
  MapPin,
  AlertCircle,
  FileText,
  RefreshCw
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

/**
 * 건강기능식품(건기식) 전용:
 * 각 성분의 식약처 고시된 기능성을 추출하여 "1) 성분명 : 고시된 기능성" 리스트로 반환
 */
function buildHealthFunctionalFoodClaims(product: ProductItem): string[] {
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

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEditProduct
}) => {
  const { deleteProduct, updateProduct } = useProductStore();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isFetchingFullApiText, setIsFetchingFullApiText] = useState(false);

  // 기존 DB에 저장된 제품의 주의사항이나 의약품 효능·효과가 요약본(placeholder)인 경우,
  // 모달 오픈 시 오픈API에서 전문(Full Text)을 자동으로 가져와 즉시 표시 및 DB 업데이트
  useEffect(() => {
    if (!isOpen || !product) return;

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
        const currentPrecautions = product.functionalFoodDetail?.safetyPrecautionsKorean || [];
        const isPlaceholderPrecautions =
          currentPrecautions.length === 0 ||
          (currentPrecautions.length === 1 &&
            (currentPrecautions[0].includes('특이체질 시 성분 확인') ||
              currentPrecautions[0].includes('라벨 주의사항 참조')));

        if (!isPlaceholderPrecautions) return;

        setIsFetchingFullApiText(true);
        try {
          const found = await searchPublicDrugDatabase(product.productName, {
            classification: 'HEALTH_FUNCTIONAL_FOOD',
            regulatoryCode: product.functionalFoodDetail?.reportNo
          });
          if (isMounted && found.length > 0) {
            const converted = await convertMasterItemToFetchResult(found[0]);
            if (
              isMounted &&
              converted.precautionsSummary &&
              converted.precautionsSummary.length > 0 &&
              !converted.precautionsSummary[0].includes('라벨 주의사항 참조')
            ) {
              await updateProduct(product.id, {
                functionalFoodDetail: {
                  ...product.functionalFoodDetail,
                  reportNo:
                    converted.regulatoryCode ||
                    product.functionalFoodDetail?.reportNo ||
                    '',
                  functionalClaimsKorean:
                    converted.indicationsSummary.length > 0
                      ? converted.indicationsSummary
                      : product.functionalFoodDetail?.functionalClaimsKorean || [],
                  suggestedUseKorean:
                    converted.dosageInstruction ||
                    product.functionalFoodDetail?.suggestedUseKorean ||
                    '',
                  safetyPrecautionsKorean: converted.precautionsSummary,
                  standardSpecificationKorean:
                    converted.standardSpecificationText ||
                    product.functionalFoodDetail?.standardSpecificationKorean
                }
              });
            }
          }
        } catch (e) {
          console.warn('건기식 전문 자동 조회 실패:', e);
        } finally {
          if (isMounted) setIsFetchingFullApiText(false);
        }
      }
    };

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

  const dosageMethodText =
    product.functionalFoodDetail?.suggestedUseKorean ||
    product.otcDetail?.dosageAndAdministrationKorean ||
    `1일 ${product.dailyServings}회, 1회 ${product.amountPerServing}${product.servingUnitKorean}을(를) 충분한 물과 함께 섭취하십시오.`;

  const servingUnitLabel = `${product.amountPerServing || 1}${product.servingUnitKorean || '개'}`;

  // 성분 정렬 (비타민 A, B1..B9..B12, C, D, E, K -> 미네랄 알파벳순 -> 기타 성분 알파벳순; 동일 분류 내 알파벳순)
  const sortedIngredients = sortProductIngredients(product.ingredients, product.productName);

  // 일반의약품: 식약처 효능·효과 전문 텍스트
  const otcIndicationsFullText = (product.otcDetail?.indicationsKorean || []).join('\n');

  // 건강기능식품: 각 성분의 식약처 고시 기능성 번호형 카드 목록
  const hffIngredientClaims =
    product.classification !== 'OTC_DRUG' ? buildHealthFunctionalFoodClaims(product) : [];

  // 주의사항 API 전문 텍스트
  const precautionsList =
    product.classification === 'OTC_DRUG'
      ? product.otcDetail?.precautionsSummaryKorean || []
      : product.functionalFoodDetail?.safetyPrecautionsKorean || [];
  const precautionsFullText = precautionsList.join('\n');

  const regulatoryCode =
    product.otcDetail?.itemSeq || product.functionalFoodDetail?.reportNo || '';

  const thumbnail = product.imageUrl || product.attachments?.[0]?.dataUrl;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-text"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden"
      >
        {/* 1. 상단 모달 헤더 (제품명 + 닫기 버튼) */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between shrink-0 bg-[#f8fafc]">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">
              {product.productName}
            </h2>
            {regulatoryCode && (
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                {product.classification === 'OTC_DRUG' ? '품목코드' : '품목제조번호'}: {regulatoryCode}
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

        {/* 2. 모달 본문 (스크롤 영역) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
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

          {/* SECTION 1: 복용 방법 */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-extrabold text-slate-500">복용 방법</h3>
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                {dosageMethodText}
              </p>
            </div>
          </div>

          {/* SECTION 2: 성분 / 함량 (약효분류 | 성분 함량 | 상한섭취량 3열 세로줄 구분 정렬) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-500">
                성분 / 함량 ({servingUnitLabel})
              </h3>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {/* 테이블 컬럼 헤더 */}
              <div className="grid grid-cols-[100px_1fr_180px] divide-x divide-slate-200 bg-slate-50 text-[11px] font-extrabold text-slate-600">
                <div className="px-2 py-2 text-center">약효분류</div>
                <div className="px-3.5 py-2 text-center">성분 함량</div>
                <div className="px-2.5 py-2 text-center">상한섭취량</div>
              </div>

              {/* 성분 행 목록 */}
              {sortedIngredients.map((ing, idx) => {
                const info = resolveIngredientDisplayInfo(ing, product.productName);
                const badgeStyle = getDarkCategoryBadgeStyle(info.categoryTag);

                return (
                  <div
                    key={ing.ingredientId || idx}
                    className="grid grid-cols-[100px_1fr_180px] divide-x divide-slate-200 hover:bg-sky-50/40 transition-colors"
                  >
                    {/* 1열: 약효분류 태그 (작은 사이즈) */}
                    <div className="px-2 py-2 flex items-center justify-center">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-tight text-center ${badgeStyle}`}
                      >
                        {info.categoryTag}
                      </span>
                    </div>

                    {/* 2열: 성분 함량 + 하단 (실제 환산 성분량) */}
                    <div className="px-3.5 py-2 flex flex-col justify-center min-w-0 font-mono">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {info.englishName}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 shrink-0">
                          {ing.rawAmount.toLocaleString()}{ing.unit}
                        </span>
                      </div>
                      {info.convertedText && (
                        <div className="text-[11px] font-bold text-emerald-600 text-right mt-0.5">
                          ({info.convertedText})
                        </div>
                      )}
                    </div>

                    {/* 3열: 상한섭취량 */}
                    <div className="px-2 py-2 flex items-center justify-center font-mono">
                      {info.ulText ? (
                        <span
                          title={info.ulNote || '2025 한국인 영양소 섭취기준(KDRIs) 성인 1일 상한섭취량(UL)'}
                          className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded whitespace-nowrap"
                        >
                          {info.ulText}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 식품안전나라 기준 및 규격(STDR_STND) 원문이 있을 경우 토글 제공 */}
            {product.functionalFoodDetail?.standardSpecificationKorean && (
              <details className="bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 mt-2">
                <summary className="cursor-pointer text-xs font-bold text-slate-700 hover:text-sky-600 flex items-center gap-1.5 select-none">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>식약처 기준 및 규격 (표시량 원문) 펼쳐보기</span>
                </summary>
                <pre className="mt-2 text-[11px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200">
                  {product.functionalFoodDetail.standardSpecificationKorean}
                </pre>
              </details>
            )}
          </div>

          {/* SECTION 3: 효능·효과 (의약품 전문) vs 기능성 (건기식 성분별 고시 기능성) */}
          {product.classification === 'OTC_DRUG' ? (
            otcIndicationsFullText && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold text-slate-500">효능·효과</h3>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded">
                    식약처 허가 전문
                  </span>
                </div>

                <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {otcIndicationsFullText}
                </div>
              </div>
            )
          ) : (
            hffIngredientClaims.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold text-slate-500">기능성</h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    성분별 고시 기능성
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {hffIngredientClaims.map((claimText, idx) => (
                    <div
                      key={idx}
                      className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 text-xs text-slate-800 leading-relaxed"
                    >
                      {claimText}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* SECTION 4: 주의사항 (API 전문 표시) */}
          {precautionsFullText && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-xs font-extrabold text-slate-500">
                  {product.classification === 'OTC_DRUG'
                    ? '사용상의 주의사항'
                    : '섭취 시 주의사항'}
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                  API 전문
                </span>
              </div>

              <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 space-y-2 max-h-72 overflow-y-auto">
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {precautionsFullText}
                </div>
                {product.otcDetail?.storageMethodKorean && (
                  <p className="text-xs text-slate-600 font-medium pt-2 border-t border-amber-200/60 mt-2">
                    보관방법: {product.otcDetail.storageMethodKorean}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

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
