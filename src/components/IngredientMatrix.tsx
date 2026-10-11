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
            약학정보원 성분 / 함량 정보 (Ingredient Specifications)
          </h3>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
            총 {product.ingredients.length}개 성분
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

      {/* 성분 매트릭스 테이블 영역 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <th className="py-2.5 px-3.5 w-[110px] text-center">기능 분류</th>
              <th className="py-2.5 px-4 w-[280px]">성분 / 함량 (Specification)</th>
              <th className="py-2.5 px-4">핵심 특징 및 작용 원리 요약</th>
              <th className="py-2.5 px-3.5 w-[200px]">원료 형태 / 염 (Form)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredIngredients.map((ing, idx) => {
              // 1. formattedSpecification이 이미 있으면 최우선 사용
              let displaySpec = ing.formattedSpecification;

              // 2. 만약 없으면 제품 데이터로부터 자동 생성
              if (!displaySpec) {
                let mainName = ing.englishInn;
                if (mainName === 'Gamma-oryzanol') mainName = 'Gamma Oryzanol';

                const mainAmountStr = `${ing.rawAmount}${ing.unit}`;
                let bracketStr = '';

                if (ing.elementalAmount !== undefined && ing.elementalAmount !== null) {
                  let elemTarget = '';
                  let elemUnit = ing.unit;

                  if (ing.standardKey === 'VITAMIN_C' || mainName.includes('Ascorbic')) {
                    elemTarget = 'Ascorbic Acid';
                    elemUnit = 'mg';
                  } else if (ing.standardKey === 'VITAMIN_B1' || mainName.includes('Thiamine') || mainName.includes('Benfo') || mainName.includes('Bisben')) {
                    elemTarget = 'Thiamine HCl';
                    elemUnit = 'mg';
                  } else if (ing.standardKey === 'VITAMIN_B2' || mainName.includes('Riboflavin')) {
                    elemTarget = 'Riboflavin';
                    elemUnit = 'mg';
                  } else if (ing.standardKey === 'VITAMIN_D' || mainName.includes('Cholecalciferol')) {
                    elemTarget = 'Vitamin D';
                    elemUnit = 'IU';
                  } else if (ing.standardKey === 'VITAMIN_E' || mainName.includes('Tocopherol')) {
                    elemTarget = 'Vitamin E';
                    elemUnit = 'IU';
                  } else if (ing.standardKey === 'MAGNESIUM' || mainName.includes('Magnesium')) {
                    elemTarget = 'Magnesium';
                    elemUnit = 'mg';
                  } else if (ing.standardKey === 'ZINC' || mainName.includes('Zinc')) {
                    elemTarget = 'Zinc';
                    elemUnit = 'mg';
                  } else if (ing.standardKey === 'SELENIUM' || mainName.includes('Selenium')) {
                    elemTarget = 'Selenium';
                    elemUnit = 'ug';
                  } else if (ing.standardKey === 'CHROMIUM' || mainName.includes('Chromium')) {
                    elemTarget = 'Chromium';
                    elemUnit = 'ug';
                  }

                  if (elemTarget) {
                    bracketStr = ` (${elemTarget} ${ing.elementalAmount.toLocaleString()}${elemUnit})`;
                  }
                }

                displaySpec = `${mainName} ${mainAmountStr}${bracketStr}`.trim();
              }

              return (
                <tr
                  key={idx}
                  className="hover:bg-sky-50/50 transition-colors group align-top"
                >
                  {/* 1. 기능 분류 (앞에 배치) */}
                  <td className="py-3 px-3.5 whitespace-nowrap text-center">
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-md border ${getCategoryColor(
                        ing.functionalCategory
                      )}`}
                    >
                      {ing.functionalCategory}
                    </span>
                  </td>

                  {/* 2. 성분 / 함량 (요청하신 영문 표준 포맷) */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5 group-hover:text-sky-700 transition-colors">
                      <span>{displaySpec}</span>
                      {ing.isMainActive && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          주요
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. 핵심 특징 및 작용 원리 요약 (성분/함량 뒤에 배치) */}
                  <td className="py-3 px-4">
                    <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      {ing.clinicalSummary}
                    </div>
                  </td>

                  {/* 4. 원료 형태 / 염 (핵심 특징 뒤에 배치) */}
                  <td className="py-3 px-3.5">
                    <div className="text-slate-700 font-medium text-xs leading-relaxed">
                      {ing.chemicalFormName}
                    </div>
                    {ing.noteKorean && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        {ing.noteKorean}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 테이블 하단 푸터 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
          <HelpCircle className="w-4 h-4 text-sky-500" />
          <span>약학정보원(KPAIC) 성분/함량 표준 표기 규격 [영문 표준 명칭 + 투입량 + (순수 원소/유효 환산량)] 적용</span>
        </span>
        <span className="text-slate-400 font-mono text-[11px]">
          {product.productName} ({product.manufacturer})
        </span>
      </div>
    </div>
  );
};
