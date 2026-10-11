import React, { useState } from 'react';
import { ProductItem } from '../types/product';
import { FunctionalCategory } from '../types/ingredient';
import { Layers, Sparkles, HelpCircle } from 'lucide-react';


interface IngredientMatrixProps {
  product: ProductItem;
}

export const IngredientMatrix: React.FC<IngredientMatrixProps> = ({ product }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 제품 내 존재하는 기능 카테고리 추출
  const availableCategories = Array.from(
    new Set(product.ingredients.map((ing) => ing.functionalCategory))
  );

  const filteredIngredients = selectedCategory === 'ALL'
    ? product.ingredients
    : product.ingredients.filter((ing) => ing.functionalCategory === selectedCategory);

  const getCategoryColor = (cat: FunctionalCategory) => {
    switch (cat) {
      case '에너지 대사':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case '신경계/인지 기능':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '골격/관절/치아':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case '면역/세포분열':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case '간기능/해독':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '항산화/혈행':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '아미노산/단백질 합성':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs overflow-hidden">
      {/* 헤더 & 카테고리 필터 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">
            유효 성분 매트릭스 (Active Ingredients Matrix)
          </h3>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
            총 {product.ingredients.length}종 배합
          </span>
        </div>

        {/* 기능별 필터 칩 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 ({product.ingredients.length})
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <th className="py-2.5 px-3.5 w-[110px]">기능 분류</th>
              <th className="py-2.5 px-3.5 w-[200px]">성분명 (English INN)</th>
              <th className="py-2.5 px-3.5 w-[170px]">원료 형태 / 염 (Form)</th>
              <th className="py-2.5 px-3.5 w-[140px] text-right">1회 / 1일 분량</th>
              <th className="py-2.5 px-4">핵심 특징 및 작용 원리 요약</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredIngredients.map((ing, idx) => {
              const dailyAmount = ing.rawAmount * product.dailyServings;
              const elementalDaily = ing.elementalAmount
                ? (ing.elementalAmount * product.dailyServings).toFixed(1)
                : null;

              return (
                <tr
                  key={idx}
                  className="hover:bg-sky-50/40 transition-colors group align-top"
                >
                  {/* 기능 분류 */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${getCategoryColor(
                        ing.functionalCategory
                      )}`}
                    >
                      {ing.functionalCategory}
                    </span>
                  </td>

                  {/* 성분명 (English INN) */}
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {ing.englishInn}
                    </div>
                    {ing.isMainActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        주요 지표/활성 원료
                      </span>
                    )}
                  </td>

                  {/* 원료 형태 / 염 */}
                  <td className="py-3 px-3.5">
                    <div className="text-slate-700 font-medium text-[11px] leading-relaxed">
                      {ing.chemicalFormName}
                    </div>
                    {ing.noteKorean && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ing.noteKorean}
                      </div>
                    )}
                  </td>

                  {/* 1회 / 1일 분량 */}
                  <td className="py-3 px-3.5 text-right font-mono">
                    <div className="font-bold text-slate-900">
                      {ing.rawAmount} {ing.unit} <span className="text-slate-400 font-normal">/회</span>
                    </div>
                    <div className="text-[11px] text-sky-700 font-semibold">
                      {dailyAmount} {ing.unit} <span className="text-slate-400 font-normal">/일</span>
                    </div>
                    {elementalDaily && (
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded inline-block mt-0.5">
                        원소: {elementalDaily}{ing.unit}/일
                      </div>
                    )}
                  </td>

                  {/* 핵심 특징 및 작용 원리 요약 */}
                  <td className="py-3 px-4">
                    <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-slate-50/70 p-2 rounded border border-slate-100">
                      {ing.clinicalSummary}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 테이블 하단 푸터 */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1 text-slate-500">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>모든 성분명은 국제 표준 INN(International Nonproprietary Name) 기준에 의거하여 표기되었습니다.</span>
        </span>
        <span className="text-slate-400">GC녹십자 / 네이처스팜 최신 성분 규격서 연동</span>
      </div>
    </div>
  );
};
