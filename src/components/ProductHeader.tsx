import React from 'react';
import { ProductItem } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import { 
  Building2, 
  Clock, 
  Tag, 
  FileText, 
  Trash2,
  CheckCircle2
} from 'lucide-react';

interface ProductHeaderProps {
  product: ProductItem;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ product }) => {
  const { deleteProduct } = useProductStore();


  const getClassificationBadge = () => {
    switch (product.classification) {
      case 'OTC_DRUG':
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-600 text-white shadow-xs">
            일반의약품 (OTC: Over-The-Counter)
          </span>
        );
      case 'HEALTH_FUNCTIONAL_FOOD':
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-600 text-white shadow-xs">
            건강기능식품
          </span>
        );
      case 'GENERAL_FOOD':
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-600 text-white shadow-xs">
            기타가공품/식품
          </span>
        );
    }
  };

  const getDosageFormKorean = () => {
    switch (product.dosageForm) {
      case 'FILM_COATED_TABLET':
        return '필름코팅정제';
      case 'TABLET':
        return '정제';
      case 'SOFT_CAPSULE':
        return '연질캡슐';
      case 'HARD_CAPSULE':
        return '경질캡슐';
      case 'LIQUID_ORAL':
        return '경구용 액제/스틱시럽';
      default:
        return product.dosageForm;
    }
  };

  const standardInstruction =
    product.otcDetail?.dosageAndAdministrationKorean ||
    product.functionalFoodDetail?.suggestedUseKorean ||
    `1일 ${product.dailyServings}회, 1회 ${product.amountPerServing}${product.servingUnitKorean} 복용`;

  const indications =
    product.otcDetail?.indicationsKorean ||
    product.functionalFoodDetail?.functionalClaimsKorean ||
    [];

  const regulatoryCode =
    product.otcDetail?.itemSeq
      ? `식약처 품목기준코드: ${product.otcDetail.itemSeq}`
      : product.functionalFoodDetail?.reportNo
      ? `품목제조보고: ${product.functionalFoodDetail.reportNo}`
      : '일반식품 품목보고';

  return (
    <div className="bg-white border-b border-slate-200 p-5 shadow-xs shrink-0">
      <div className="flex items-start justify-between gap-4">
        {/* 좌측: 타이틀 및 메타 */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {getClassificationBadge()}
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {getDosageFormKorean()}
            </span>
            <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {regulatoryCode}
            </span>
            {product.otcDetail?.atcCode && (
              <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                ATC(Anatomical Therapeutic Chemical): {product.otcDetail.atcCode}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {product.productName}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{product.manufacturer}</span>
              {product.distributor && product.distributor !== product.manufacturer && (
                <span className="text-slate-400">({product.distributor} 공급)</span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-normal">| 포장: {product.packagingUnit}</span>
          </div>

          {/* 표준 섭취/복용법 */}
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-md">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-900">표준 복용·섭취 기준:</span>
            <span className="font-medium">{standardInstruction}</span>
          </div>

          {/* 약학정보원(KPAIC) 공시 효능·효과 요약 박스 */}
          {indications.length > 0 && (
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-lg p-2.5 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sky-950">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    {product.classification === 'OTC_DRUG'
                      ? '약학정보원(KPAIC) 공시 효능·효과 요약'
                      : '식품안전나라 인정 기능성 요약'}
                  </span>
                </div>
                <span className="text-[10px] text-sky-600 font-medium bg-sky-100/70 border border-sky-200/60 px-2 py-0.5 rounded-full">
                  {product.classification === 'OTC_DRUG' ? '식약처·약학정보원 표준' : '공식 인정 기능성'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {indications.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 bg-white/90 px-2.5 py-1.5 rounded-md border border-sky-100 text-[11px] leading-relaxed font-medium text-slate-700 shadow-2xs"
                  >
                    <span className="text-sky-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 핵심 특징 태그 */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <Tag className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            {product.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 우측 액션: 관리 액션 */}
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm(`'${product.productName}' 품목을 약국 데이터베이스에서 삭제하시겠습니까?`)) {
                  deleteProduct(product.id);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors font-semibold"
              title="잘못 등록된 제품 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>품목 삭제</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>식약처·KPAIC(Korea Pharmaceutical Information Center) 표준 공시</span>
          </div>
        </div>
      </div>
    </div>
  );
};

