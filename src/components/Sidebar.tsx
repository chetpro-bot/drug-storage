import { Search, Plus, Filter, Package, AlertCircle, LayoutGrid, MapPin, ArrowUpDown } from 'lucide-react';
import { useProductStore, ProductSortOption } from '../stores/useProductStore';
import { ProductClassification } from '../types/classification';

interface SidebarProps {
  onOpenNewProductModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewProductModal }) => {
  const {
    selectedProductId,
    setSelectedProductId,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    classificationFilter,
    setClassificationFilter,
    selectedTag,
    setSelectedTag,
    getFilteredProducts,
    sortBy,
    setSortBy
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
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
            일반의약품
          </span>
        );
      case 'HEALTH_FUNCTIONAL_FOOD':
        return (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            건기식
          </span>
        );
      case 'GENERAL_FOOD':
        return (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            기타식품
          </span>
        );
    }
  };

  return (
    <aside className="w-[320px] h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* 상단 컨트롤 영역 */}
      <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
        {/* 카탈로그 그리드 보기 & 신규 제품 등록 버튼 */}
        <div className="grid grid-cols-12 gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('CATALOG')}
            className={`col-span-5 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              viewMode === 'CATALOG'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="효능 태그별 전체 제품 카탈로그 그리드 화면 보기"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-500" />
            <span>카탈로그 뷰</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewProductModal}
            className="col-span-7 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>신규 품목 등록</span>
          </button>
        </div>

        {/* 검색창 */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제품명, 성분명, 제조사, 약 위치 검색"
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
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all text-center cursor-pointer ${
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

      {/* 리스트 요약 카운트 및 활성 효능 태그 표시 & 정렬 선택 */}
      <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-500 flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-slate-700">목록 ({filteredProducts.length})</span>
          {selectedTag && (
            <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
              #{selectedTag}
              <button
                onClick={() => setSelectedTag(null)}
                className="hover:text-rose-600 cursor-pointer"
              >
                ✕
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[11px] shrink-0">
          <ArrowUpDown className="w-3 h-3 text-sky-600" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
            className="bg-transparent text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
            aria-label="사이드바 제품 정렬 기준"
          >
            <option value="NAME_ASC">가나다순</option>
            <option value="CREATED_DESC">등록순</option>
            <option value="UPDATED_DESC">수정순</option>
          </select>
        </div>
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
            const isSelected = selectedProductId === product.id && viewMode === 'DETAIL';
            return (
              <div
                key={product.id}
                onClick={() => {
                  setSelectedProductId(product.id);
                  setViewMode('DETAIL');
                }}
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
                  <span className="truncate max-w-[165px]">{product.manufacturer}</span>
                  <span className="font-bold text-slate-700">
                    {product.priceRetailKrw ? `${product.priceRetailKrw.toLocaleString()}원` : ''}
                  </span>
                </div>

                {product.storageLocation && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-sky-700">
                    <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="truncate">{product.storageLocation}</span>
                  </div>
                )}

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {product.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 rounded-full font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                  {product.tags.length > 3 && (
                    <span className="text-[10px] text-slate-400 px-0.5">
                      +{product.tags.length - 3}
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
          <span>식약처 · 식품안전나라 연동</span>
        </span>
        <span className="text-sky-600 font-medium">안전모드 ON</span>
      </div>
    </aside>
  );
};
