import React from 'react';
import { Search, Plus, Filter, Package, AlertCircle } from 'lucide-react';
import { useProductStore } from '../stores/useProductStore';
import { ProductClassification } from '../types/classification';

interface SidebarProps {
  onOpenNewProductModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewProductModal }) => {
  const {
    selectedProductId,
    setSelectedProductId,
    searchQuery,
    setSearchQuery,
    classificationFilter,
    setClassificationFilter,
    getFilteredProducts
  } = useProductStore();

  const filteredProducts = getFilteredProducts();

  const filterChips: { id: ProductClassification | 'ALL'; label: string }[] = [
    { id: 'ALL', label: '전체' },
    { id: 'OTC_DRUG', label: '일반의약품' },
    { id: 'HEALTH_FUNCTIONAL_FOOD', label: '건기식' },
    { id: 'GENERAL_FOOD', label: '기타식품' }
  ];

  const getClassificationBadge = (classification: ProductClassification) => {
    switch (classification) {
      case 'OTC_DRUG':
        return (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
            일반의약품
          </span>
        );
      case 'HEALTH_FUNCTIONAL_FOOD':
        return (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            건기식
          </span>
        );
      case 'GENERAL_FOOD':
        return (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            기타식품
          </span>
        );
    }
  };

  return (
    <aside className="w-[320px] h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* 상단 컨트롤 영역 */}
      <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/70">
        {/* 신규 제품 등록 버튼 */}
        <button
          onClick={onOpenNewProductModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>신규 품목(영양제/OTC) 등록</span>
        </button>

        {/* 검색창 */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제품명, INN 성분명, 제조사 검색"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* 분류별 필터 칩 */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400 ml-0.5 mr-1" />
          <div className="flex gap-1 flex-1">
            {filterChips.map((chip) => {
              const active = classificationFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setClassificationFilter(chip.id)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all text-center ${
                    active
                      ? 'bg-slate-800 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 리스트 요약 카운트 */}
      <div className="px-3.5 py-1.5 bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
        <span>취급 목록 ({filteredProducts.length}건)</span>
        <span className="text-[10px] text-slate-400">클릭 시 상세 조회</span>
      </div>

      {/* 품목 리스트 */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs">검색 조건에 맞는 제품이 없습니다.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isSelected = selectedProductId === product.id;
            return (
              <div
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                className={`p-3 cursor-pointer transition-all border-l-4 ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-600 shadow-inner'
                    : 'bg-white hover:bg-slate-50 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3
                    className={`text-xs font-bold leading-snug line-clamp-1 ${
                      isSelected ? 'text-sky-950' : 'text-slate-900'
                    }`}
                  >
                    {product.productName}
                  </h3>
                  {getClassificationBadge(product.classification)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[170px]">{product.manufacturer}</span>
                  <span className="font-medium text-slate-600">
                    {product.priceRetailKrw ? `₩${product.priceRetailKrw.toLocaleString()}` : ''}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">
                    {product.dosageForm === 'FILM_COATED_TABLET'
                      ? '정제'
                      : product.dosageForm === 'LIQUID_ORAL'
                      ? '액제/스틱'
                      : '연질캡슐'}
                  </span>
                  {product.ingredients.slice(0, 2).map((ing, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1 rounded"
                    >
                      {ing.englishInn}
                    </span>
                  ))}
                  {product.ingredients.length > 2 && (
                    <span className="text-[10px] text-slate-400 px-0.5">
                      +{product.ingredients.length - 2}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 하단 단축 상태표시줄 */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-slate-400" />
          <span>KPAIC 식약처 매핑 완료</span>
        </span>
        <span className="text-sky-600 font-medium">안전모드 ON</span>
      </div>
    </aside>
  );
};
