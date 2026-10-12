import React, { useState } from 'react';
import { ProductItem } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import { recognizeUniversalDocument } from '../services/labelOcrService';
import { saveLearnedIngredientMapping } from '../utils/innMapper';
import { 
  Building2, 
  Clock, 
  Tag, 
  Trash2,
  Paperclip
} from 'lucide-react';

interface ProductHeaderProps {
  product: ProductItem;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ product }) => {
  const { deleteProduct, updateProduct } = useProductStore();
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);


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
            {/* 기존 등록 제품에 자료 첨부하여 약효/성분 자동 갱신 */}
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors font-bold cursor-pointer shadow-2xs"
              title="약학정보원 캡처, 제약사 학술 자료, 영양성분표 사진을 첨부하여 약효분류 및 성분을 자동 동기화합니다"
            >
              <Paperclip className="w-3.5 h-3.5 text-purple-600" />
              <span>자료 첨부</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isProcessingDoc}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsProcessingDoc(true);
                  try {
                    const result = await recognizeUniversalDocument(file);
                    
                    // 1. 약학정보원 KPIC 약효분류 갱신
                    if (result.isKpicFormat && result.kpicMappings.length > 0) {
                      const updatedIngredients = product.ingredients.map((ing) => {
                        const found = result.kpicMappings.find((km) => {
                          const kName = km.ingredientName.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
                          const ingName = ing.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
                          return kName.includes(ingName) || ingName.includes(kName);
                        });
                        if (found) {
                          saveLearnedIngredientMapping(ing.englishInn, { functionalCategory: found.category });
                          return { ...ing, functionalCategory: found.category };
                        }
                        return ing;
                      });

                      await updateProduct(product.id, { ingredients: updatedIngredients });
                      alert(`약학정보원(KPIC) 약효분류 ${result.kpicMappings.length}건이 성분표에 성공적으로 업데이트되었습니다!`);
                      return;
                    }

                    // 2. 건기식 라벨 파싱 갱신
                    if (result.nutritionParsed.parsedIngredients.length > 0) {
                      await updateProduct(product.id, {
                        ingredients: result.nutritionParsed.parsedIngredients,
                        dailyServings: result.nutritionParsed.servingInfo.dailyServings,
                        amountPerServing: result.nutritionParsed.servingInfo.amountPerServing,
                        servingUnitKorean: result.nutritionParsed.servingInfo.servingUnit
                      });
                      alert('첨부 자료의 영양성분표가 제품 성분표에 성공적으로 업데이트되었습니다!');
                      return;
                    }

                    alert('첨부 자료에서 약효분류 또는 영양성분표를 인식하지 못했습니다. 글씨가 선명한 캡처 사진을 확인해주세요.');
                  } catch (err: any) {
                    console.error('자료 분석 오류:', err);
                    alert('자료 분석 중 오류가 발생했습니다: ' + (err?.message || '파일을 확인해주세요'));
                  } finally {
                    setIsProcessingDoc(false);
                  }
                }}
              />
            </label>

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
          {isProcessingDoc && (
            <span className="text-[11px] font-bold text-purple-600 animate-pulse flex items-center gap-1">
              자료 분석 및 약효분류 갱신 중...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

