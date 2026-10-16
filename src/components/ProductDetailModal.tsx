import React, { useState } from 'react';
import { ProductItem } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { useProductStore } from '../stores/useProductStore';
import { AttachedDocumentsModal } from './AttachedDocumentsModal';
import {
  X,
  Edit3,
  Trash2,
  Paperclip,
  MapPin,
  AlertCircle,
  FileText
} from 'lucide-react';

interface ProductDetailModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProduct: (product: ProductItem) => void;
}

/**
 * 영문 INN 또는 약효분류를 약국 상담용 한글 표시 성분명으로 변환
 */
function getFriendlyKoreanIngredientName(ing: ProductIngredientEntry): {
  title: string;
  subtitle?: string;
} {
  // 1. koreanName이 명시되어 있으면 우선 사용
  if (ing.koreanName && ing.koreanName.trim()) {
    const kor = ing.koreanName.trim();
    const cat = ing.functionalCategory?.trim();
    if (cat && !kor.includes(cat) && /^비타민|^아연|^마그네슘|^셀레늄|^크롬|^철|^구리|^망간|^요오드|^칼슘|^엽산|^비오틴/.test(cat)) {
      const cleanCat = cat.replace(/\([A-Za-z0-9]+\)$/, '');
      return { title: `${cleanCat} (${kor})`, subtitle: ing.englishInn };
    }
    return { title: kor, subtitle: ing.englishInn };
  }

  // 2. 약효 분류(functionalCategory)와 화학 형태(chemicalFormName) 조합
  const cat = ing.functionalCategory?.trim() || '';
  const cleanCat = cat.replace(/\([A-Za-z0-9]+\)$/, '');

  const innMap: Record<string, string> = {
    'benfotiamine': '비타민B1 (벤포티아민)',
    'fursultiamine': '비타민B1 (푸르설티아민)',
    'bisbenthiamine': '비타민B1 (비스벤티아민)',
    'thiamine hydrochloride': '비타민B1 (티아민염산염)',
    'thiamine mononitrate': '비타민B1 (티아민질산염)',
    'riboflavin butyrate': '비타민B2 (리보플라빈부티레이트)',
    "riboflavin 5'-phosphate sodium": '비타민B2 (리보플라빈인산나트륨)',
    'riboflavin': '비타민B2',
    'nicotinamide': '나이아신 (비타민B3)',
    'calcium pantothenate': '판토텐산 (비타민B5)',
    'pyridoxal phosphate hydrate': '비타민B6 (피리독살포스페이트)',
    'pyridoxine hydrochloride': '비타민B6 (피리독신염산염)',
    'biotin': '비오틴',
    'folic acid': '엽산',
    'mecobalamin': '비타민B12 (메코발라민)',
    'cyanocobalamin': '비타민B12 (시아노코발라민)',
    'ascorbic acid coated': '비타민C (제피아스코르브산)',
    'ascorbic acid': '비타민C',
    'cholecalciferol concentrate powder': '비타민D (콜레칼시페롤)',
    'cholecalciferol': '비타민D',
    'tocopherol acetate powder 50%': '비타민E (토코페롤아세테이트)',
    'tocopherol': '비타민E',
    'zinc oxide': '아연 (산화아연)',
    'zinc gluconate': '아연 (글루콘산아연)',
    'magnesium oxide': '마그네슘 (산화마그네슘)',
    'selenium in dried yeast': '셀레늄 (건조효모)',
    'chromium in dried yeast': '크롬 (건조효모)',
    'ursodeoxycholic acid': '우르소데옥시콜산 (UDCA)',
    'taurine': '타우린',
    'choline bitartrate': '콜린타르타르산염',
    'inositol': '이노시톨',
    'gamma oryzanol': '감마오리자놀',
    'silymarin': '밀크씨슬추출물 (실리마린)',
    'lutein': '루테인 (마리골드꽃추출물)',
    'probiotics': '프로바이오틱스 (유산균)'
  };

  const lowerInn = ing.englishInn.trim().toLowerCase();
  if (innMap[lowerInn]) {
    return { title: innMap[lowerInn], subtitle: ing.englishInn };
  }

  if (cleanCat && cleanCat !== '기타' && cleanCat !== '일반성분') {
    return { title: `${cleanCat} · ${ing.englishInn}` };
  }

  return { title: ing.englishInn, subtitle: ing.chemicalFormName };
}

/**
 * 기능성 / 효능·효과 문구 배열을 캡처 화면처럼 깔끔한 번호형 카드 리스트로 변환
 */
function parseClaimsIntoNumberedCards(product: ProductItem): string[] {
  const rawClaims =
    product.classification === 'OTC_DRUG'
      ? product.otcDetail?.indicationsKorean || []
      : product.functionalFoodDetail?.functionalClaimsKorean || [];

  // 줄바꿈이나 [성분명] 단위로 쪼개어 카드화
  const splitItems: string[] = [];
  rawClaims.forEach((claim) => {
    const lines = claim
      .split(/\r?\n|(?=\[\s*[가-힣A-Za-z0-9\s]+?\s*\])|(?=\d+\)\s*[가-힣A-Za-z])/)
      .map((s) => s.trim())
      .filter(Boolean);
    lines.forEach((line) => {
      // [비타민A] 어두운 곳에서... -> 비타민A : 어두운 곳에서...
      const formatted = line.replace(/^\[([^\]]+)\]\s*/, '$1 : ');
      splitItems.push(formatted);
    });
  });

  // 만약 기본 문구가 너무 짧거나 1개뿐이고 성분별 임상 요약이 풍부한 경우 보강
  if (
    splitItems.length <= 1 &&
    (splitItems[0]?.includes('정상적인 면역 및 에너지 대사') || splitItems.length === 0)
  ) {
    product.ingredients.forEach((ing) => {
      if (ing.clinicalSummary) {
        const { title } = getFriendlyKoreanIngredientName(ing);
        const cleanSummary = ing.clinicalSummary.replace(/^[•·\-]\s*/, '').replace(/\n[•·\-]\s*/g, ', ');
        splitItems.push(`${title} : ${cleanSummary}`);
      }
    });
  }

  return splitItems.map((item, idx) => {
    // 이미 "1) " 등으로 시작하면 그대로 유지, 아니면 번호 부여
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
  const { deleteProduct } = useProductStore();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

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
  const numberedClaims = parseClaimsIntoNumberedCards(product);

  const precautionsList =
    product.classification === 'OTC_DRUG'
      ? product.otcDetail?.precautionsSummaryKorean || []
      : product.functionalFoodDetail?.safetyPrecautionsKorean || [];

  const regulatoryCode =
    product.otcDetail?.itemSeq || product.functionalFoodDetail?.reportNo || '';

  const thumbnail = product.imageUrl || product.attachments?.[0]?.dataUrl;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-text"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1e293b] text-slate-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col border border-slate-700/90 overflow-hidden"
      >
        {/* 1. 상단 모달 헤더 (제품명 + 닫기 버튼) */}
        <div className="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between shrink-0 bg-slate-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-extrabold text-white tracking-tight truncate">
              {product.productName}
            </h2>
            {regulatoryCode && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                {product.classification === 'OTC_DRUG' ? '품목코드' : '품목제조번호'}: {regulatoryCode}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700/70 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. 모달 본문 (스크롤 영역) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 상단 액션 알약 버튼 & 제약회사 · 분류 · 가격 · 약 위치 요약 */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3 flex-1 min-w-[240px]">
              {/* 액션 버튼 그룹 (캡처 화면의 알약형 버튼 스타일) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProduct(product);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-700/80 hover:bg-slate-600 text-slate-100 border border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  <span>제품 편집</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDocsModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-700/80 hover:bg-slate-600 text-slate-100 border border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                  <span>자료 첨부/열람</span>
                  {product.attachments && product.attachments.length > 0 && (
                    <span className="bg-purple-500/30 text-purple-200 px-1.5 rounded-full text-[10px]">
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
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/70 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>제품 삭제</span>
                </button>
              </div>

              {/* 제약회사 · 분류 · 가격 · 약 위치 */}
              <div className="flex items-center gap-2.5 flex-wrap text-sm">
                <span className="font-bold text-slate-200">
                  {product.manufacturer} · {classificationShort}
                </span>
                {product.packagingUnit && (
                  <span className="text-xs text-slate-400">({product.packagingUnit})</span>
                )}
                {product.priceRetailKrw ? (
                  <span className="text-xs font-extrabold text-amber-300 bg-amber-950/50 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
                    {product.priceRetailKrw.toLocaleString()} 원
                  </span>
                ) : null}
                {product.storageLocation && (
                  <span className="text-xs font-bold text-sky-300 bg-sky-950/60 border border-sky-800/70 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-400" />
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
                      className="text-[11px] font-semibold text-sky-300 bg-slate-900/70 border border-slate-700 px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 우측: 제품 대표 사진이 있을 경우 깔끔한 썸네일 박스 표시 */}
            {thumbnail && (
              <div className="w-24 h-24 rounded-xl bg-white p-2 flex items-center justify-center border border-slate-600 shrink-0 shadow-md">
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
            <h3 className="text-xs font-bold text-slate-400">복용 방법</h3>
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              {dosageMethodText}
            </p>
          </div>

          {/* SECTION 2: 표시 함량 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400">표시 함량</h3>
              <span className="text-[11px] text-slate-400">
                1회 섭취량 ({servingUnitLabel}) 기준 · 총 {product.ingredients.length}종
              </span>
            </div>

            <div className="divide-y divide-slate-700/70 border-t border-b border-slate-700/70">
              {product.ingredients.map((ing, idx) => {
                const { title, subtitle } = getFriendlyKoreanIngredientName(ing);
                const hasElemental =
                  ing.elementalAmount !== undefined &&
                  ing.elementalAmount > 0 &&
                  ing.elementalAmount !== ing.rawAmount;

                return (
                  <div
                    key={ing.ingredientId || idx}
                    className="py-2.5 px-1 flex items-center justify-between gap-4 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {title}
                      </span>
                      {subtitle && subtitle.toLowerCase() !== title.toLowerCase() && (
                        <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                          {subtitle}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <span className="text-xs font-extrabold text-white">
                        {ing.rawAmount.toLocaleString()} {ing.unit}
                      </span>
                      {hasElemental && (
                        <span className="text-[11px] font-semibold text-emerald-400 ml-1.5">
                          (순수 {ing.elementalAmount?.toLocaleString()} {ing.unit})
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-400 ml-1">
                        / {servingUnitLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 식품안전나라 기준 및 규격(STDR_STND) 원문이 있을 경우 토글 제공 */}
            {product.functionalFoodDetail?.standardSpecificationKorean && (
              <details className="bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 mt-2">
                <summary className="cursor-pointer text-xs font-bold text-slate-300 hover:text-sky-300 flex items-center gap-1.5 select-none">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>식약처 기준 및 규격 (표시량 원문) 펼쳐보기</span>
                </summary>
                <pre className="mt-2 text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {product.functionalFoodDetail.standardSpecificationKorean}
                </pre>
              </details>
            )}
          </div>

          {/* SECTION 3: 기능성 (건기식) / 효능·효과 (일반의약품) - 3열 카드 그리드 */}
          {numberedClaims.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-400">
                  {product.classification === 'OTC_DRUG' ? '효능·효과' : '기능성'}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.2 rounded">
                  원문
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {numberedClaims.map((claimText, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-4 text-xs text-slate-200 leading-relaxed shadow-inner"
                  >
                    {claimText}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: 주의사항 (섭취 시 주의사항 / 사용상의 주의사항) */}
          {precautionsList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {product.classification === 'OTC_DRUG'
                    ? '사용상의 주의사항 및 복약지도'
                    : '섭취 시 주의사항'}
                </span>
              </h3>

              <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-4 space-y-1.5">
                {precautionsList.map((precaution, idx) => (
                  <p key={idx} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span>{precaution.replace(/^[•·\-]\s*/, '')}</span>
                  </p>
                ))}
                {product.otcDetail?.storageMethodKorean && (
                  <p className="text-xs text-slate-400 pt-1 border-t border-slate-800 mt-2">
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
