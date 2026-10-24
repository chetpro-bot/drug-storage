import React, { useState, useRef } from 'react';
import { useProductStore, ProductSortOption } from '../stores/useProductStore';
import { ProductItem, getProductThumbnail } from '../types/product';
import { ProductClassification } from '../types/classification';
import { isImportedProduct } from '../utils/productHelper';
import {
  doesProductMatchEfficacyTag,
  getMatchedEfficacyTagsForProduct
} from '../constants/efficacyTags';
import {
  Search,
  MapPin,
  Camera,
  Plus,
  Pill,
  Sparkles,
  Package,
  ChevronRight,
  Check,
  X,
  Edit3,
  ArrowUpDown
} from 'lucide-react';

interface ProductCatalogGridProps {
  onOpenNewProductModal: () => void;
  onSelectProduct: (product: ProductItem) => void;
  onEditProduct?: (product: ProductItem) => void;
}

export const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = ({
  onOpenNewProductModal,
  onSelectProduct,
  onEditProduct
}) => {
  const {
    products,
    searchQuery,
    setSearchQuery,
    classificationFilter,
    setClassificationFilter,
    selectedTag,
    setSelectedTag,
    setSelectedProductId,
    updateProduct,
    customTags,
    getFilteredProducts,
    getActiveTags,
    sortBy,
    setSortBy
  } = useProductStore();

  const filteredProducts = getFilteredProducts();

  // 카드 내 약 위치(storageLocation) 빠른 인라인 수정 상태
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<string>('');

  // 카드 내 가격(priceRetailKrw) 빠른 인라인 수정 상태
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>('');

  // 카드에서 즉시 대표 사진 업로드용 파일 인풋 ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoTargetProductId, setPhotoTargetProductId] = useState<string | null>(null);

  // 현재 활성화된 효능 태그 목록 (설정 관리 및 제품 태그 연동)
  const activeTags = React.useMemo(() => {
    return getActiveTags();
  }, [products, customTags, getActiveTags]);

  // 각 효능 태그별 매칭 제품 수 계산 (현재 분류 필터 기준)
  const getTagMatchCount = (tag: string) => {
    return products.filter((p) => {
      if (classificationFilter !== 'ALL' && p.classification !== classificationFilter) {
        return false;
      }
      return doesProductMatchEfficacyTag(p, tag);
    }).length;
  };



  // 카드에서 사진 변경 버튼 클릭 시
  const handleTriggerPhotoUpload = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setPhotoTargetProductId(productId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // 이미지 파일을 축소(최대 600px)하여 Base64로 저장
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoTargetProductId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updateProduct(photoTargetProductId, { imageUrl: compressedDataUrl });
        }
        setPhotoTargetProductId(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 약 위치 인라인 저장
  const handleSaveLocation = async (e: React.MouseEvent | React.FormEvent, productId: string) => {
    e.stopPropagation();
    await updateProduct(productId, { storageLocation: locationDraft.trim() });
    setEditingLocationId(null);
  };

  // 가격 인라인 저장
  const handleSavePrice = async (e: React.MouseEvent | React.FormEvent, productId: string) => {
    e.stopPropagation();
    const numeric = parseInt(priceDraft.replace(/[^0-9]/g, ''), 10) || 0;
    await updateProduct(productId, { priceRetailKrw: numeric });
    setEditingPriceId(null);
  };

  // 카드 클릭 시 상세 정보 팝업 모달 열기
  const handleSelectProductCard = (product: ProductItem) => {
    setSelectedProductId(product.id);
    onSelectProduct(product);
  };

  const getClassificationInfo = (classification: ProductClassification, isImported: boolean = false) => {
    switch (classification) {
      case 'OTC_DRUG':
        return {
          label: '일반의약품',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          subTextClass: 'text-blue-600',
          boxBgClass: 'from-sky-50/70 via-white to-blue-50/50',
          accentBorder: 'group-hover:border-sky-400'
        };
      case 'HEALTH_FUNCTIONAL_FOOD':
        return isImported
          ? {
              label: '건강기능식품 (수입)',
              badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 font-extrabold shadow-2xs',
              subTextClass: 'text-purple-600',
              boxBgClass: 'from-purple-50/70 via-white to-indigo-50/50',
              accentBorder: 'group-hover:border-purple-400'
            }
          : {
              label: '건강기능식품',
              badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
              subTextClass: 'text-emerald-600',
              boxBgClass: 'from-emerald-50/70 via-white to-teal-50/50',
              accentBorder: 'group-hover:border-emerald-400'
            };
      case 'GENERAL_FOOD':
        return isImported
          ? {
              label: '기타가공품/식품 (수입)',
              badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold shadow-2xs',
              subTextClass: 'text-amber-700',
              boxBgClass: 'from-amber-50/70 via-white to-orange-50/40',
              accentBorder: 'group-hover:border-amber-400'
            }
          : {
              label: '기타가공품/식품',
              badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
              subTextClass: 'text-slate-600',
              boxBgClass: 'from-slate-50 via-white to-amber-50/30',
              accentBorder: 'group-hover:border-slate-400'
            };
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden">
      {/* 숨겨진 사진 업로드 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {/* 상단 검색창 & 효능 태그 필터 헤더 (클린 메디컬 화이트 테마) */}
      <div className="px-6 pt-4 pb-4 bg-white border-b border-slate-200/90 space-y-3.5 shrink-0 shadow-2xs">
        {/* 1열: 검색창 + 총 개수 + 분류 필터 + 신규 품목 등록 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제품명, 성분명, 제약회사, 약 위치 검색..."
                className="w-full pl-10 pr-8 py-2 text-xs bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/80">
              {filteredProducts.length}개 제품
            </span>
          </div>

          {/* 우측: 분류 필터 + 신규 등록 버튼 */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {(
                [
                  { id: 'ALL', label: '전체 분류' },
                  { id: 'OTC_DRUG', label: '일반의약품' },
                  { id: 'HEALTH_FUNCTIONAL_FOOD', label: '건강기능식품' },
                  { id: 'GENERAL_FOOD', label: '기타식품' }
                ] as const
              ).map((tab) => {
                const active = classificationFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setClassificationFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 정렬 선택 드롭다운 (가나다순 / 최근 등록순 / 최근 수정순) */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
                aria-label="제품 정렬 기준"
              >
                <option value="NAME_ASC">가나다순 (기본)</option>
                <option value="CREATED_DESC">최근 등록순</option>
                <option value="UPDATED_DESC">최근 수정순</option>
              </select>
            </div>

            <button
              onClick={onOpenNewProductModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>신규 품목 등록</span>
            </button>
          </div>
        </div>

        {/* 2열: 효능·증상 태그 필터 바 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>효능·증상별 필터 (클릭 시 해당 효능의 영양제/의약품만 표시됩니다)</span>
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>필터 초기화 ({selectedTag})</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* '전체' 버튼 */}
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                selectedTag === null
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              전체
            </button>

            {/* 활성 효능 태그 버튼들 */}
            {activeTags.map((tag) => {
              const isSelected = selectedTag === tag;
              const matchCount = getTagMatchCount(tag);
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs scale-[1.02]'
                      : matchCount > 0
                      ? 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50/70 hover:border-sky-300 hover:text-sky-700'
                      : 'bg-slate-50 text-slate-400 border-slate-200/70 hover:bg-white hover:text-slate-600'
                  }`}
                >
                  <span>{tag}</span>
                  {matchCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-sky-50 text-sky-700 border border-sky-200/70'
                      }`}
                    >
                      {matchCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 메인 제품 카드 그리드 영역 */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProducts.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-300 rounded-2xl p-8 shadow-2xs">
            <Package className="w-12 h-12 text-slate-400 mb-3 stroke-1" />
            <p className="text-sm font-bold text-slate-700 mb-1">
              {selectedTag
                ? `'${selectedTag}' 효능 태그에 해당하는 제품이 아직 없습니다.`
                : '검색 조건에 일치하는 제품이 없습니다.'}
            </p>
            <p className="text-xs text-slate-500 mb-4">
              신규 품목을 등록하거나 기존 품목 수정에서 '{selectedTag || '효능'}' 태그를 추가해보세요.
            </p>
            <div className="flex items-center gap-2">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  전체 제품 보기
                </button>
              )}
              <button
                onClick={onOpenNewProductModal}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>신규 품목 등록하기</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredProducts.map((product) => {
              const isImported = isImportedProduct(product);
              const classInfo = getClassificationInfo(product.classification, isImported);
              const thumbnail = getProductThumbnail(product);
              const matchedEfficacyTags = getMatchedEfficacyTagsForProduct(product);
              const isEditingLoc = editingLocationId === product.id;
              const isEditingPrice = editingPriceId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => handleSelectProductCard(product)}
                  className={`group bg-white border border-slate-200/90 ${classInfo.accentBorder} rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-2xs hover:shadow-lg hover:shadow-slate-200/80 cursor-pointer`}
                >
                  <div>
                    {/* 1. 상단 제품 사진 박스 */}
                    <div
                      className={`w-full h-44 rounded-xl bg-gradient-to-br ${classInfo.boxBgClass} flex items-center justify-center p-3 relative overflow-hidden border border-slate-100 mb-3.5`}
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={product.productName}
                          className="max-h-full max-w-full object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        /* 사진 미등록 시 패키지 일러스트 플레이스홀더 */
                        <div className="flex flex-col items-center justify-center text-center px-3 select-none">
                          <div className="w-14 h-16 rounded-xl bg-white shadow-sm border border-slate-200 flex flex-col items-center justify-center mb-2 relative">
                            <div
                              className={`w-full h-3 rounded-t-xl absolute top-0 left-0 ${
                                product.classification === 'OTC_DRUG'
                                  ? 'bg-blue-600'
                                  : product.classification === 'HEALTH_FUNCTIONAL_FOOD'
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-600'
                              }`}
                            />
                            <Pill
                              className={`w-6 h-6 mt-2 ${
                                product.classification === 'OTC_DRUG'
                                  ? 'text-blue-600'
                                  : product.classification === 'HEALTH_FUNCTIONAL_FOOD'
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-extrabold text-slate-800 line-clamp-1">
                            {product.productName}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {product.packagingUnit}
                          </span>
                        </div>
                      )}

                      {/* 우측 상단: 사진 등록/변경 원클릭 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => handleTriggerPhotoUpload(e, product.id)}
                        className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-white/95 hover:bg-white text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                        title="제품 대표 사진 업로드 / 변경"
                      >
                        <Camera className="w-3 h-3 text-sky-600" />
                        <span>{thumbnail ? '사진 변경' : '사진 등록'}</span>
                      </button>
                    </div>

                    {/* 2. 분류 (일반의약품 / 건강기능식품 / 기타가공품) & 수정 버튼 */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 ${classInfo.badgeClass}`}
                      >
                        <span>
                          {product.classification === 'OTC_DRUG'
                            ? '일반의약품'
                            : product.classification === 'HEALTH_FUNCTIONAL_FOOD'
                            ? '건강기능식품'
                            : '기타가공품/식품'}
                        </span>
                        {isImportedProduct(product) && product.classification !== 'OTC_DRUG' && (
                          <span
                            className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                              product.classification === 'HEALTH_FUNCTIONAL_FOOD'
                                ? 'bg-purple-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            수입
                          </span>
                        )}
                      </span>

                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(product);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="품목 정보 전체 수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 3. 제품명 */}
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-1 group-hover:text-sky-600 transition-colors">
                      {product.productName}
                    </h3>

                    {/* 4. 제약회사 / 판매원 */}
                    <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                      {product.manufacturer}
                      {product.distributor && product.distributor !== product.manufacturer
                        ? ` · ${product.distributor}`
                        : ''}
                    </p>

                    {/* 5. 가격 (클릭 시 빠른 인라인 수정 지원) */}
                    <div className="mt-2">
                      {isEditingPrice ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="number"
                            value={priceDraft}
                            onChange={(e) => setPriceDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePrice(e, product.id);
                              if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                            placeholder="판매가(원)"
                            className="w-28 px-2 py-1 text-xs bg-white text-slate-900 border border-sky-500 rounded-md font-mono focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSavePrice(e, product.id)}
                            className="p-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPriceId(null);
                            }}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPriceId(product.id);
                              setPriceDraft(String(product.priceRetailKrw || ''));
                            }}
                            className="text-sm font-black text-blue-700 hover:text-sky-600 transition-colors"
                            title="클릭하여 가격 빠른 수정"
                          >
                            {product.priceRetailKrw
                              ? `${product.priceRetailKrw.toLocaleString()} 원`
                              : '가격 미입력'}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[110px]">
                            {product.packagingUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. 하단: 약 위치(진열 위치) 배지 & 효능 태그 */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    {/* 약 위치 표시 및 원클릭 인라인 편집 */}
                    {isEditingLoc ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={locationDraft}
                          onChange={(e) => setLocationDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLocation(e, product.id);
                            if (e.key === 'Escape') setEditingLocationId(null);
                          }}
                          placeholder="예: 상담석 우측 2단, 매대 A-1"
                          className="flex-1 px-2 py-1 text-[11px] bg-white text-slate-900 border border-sky-500 rounded-md focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveLocation(e, product.id)}
                          className="p-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md"
                          title="약 위치 저장"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLocationId(null);
                          }}
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLocationId(product.id);
                          setLocationDraft(product.storageLocation || '');
                        }}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          product.storageLocation
                            ? 'bg-sky-50/70 text-sky-800 border border-sky-200/80 hover:border-sky-400'
                            : 'bg-slate-50 text-slate-400 border border-dashed border-slate-200 hover:text-slate-600 hover:border-slate-300'
                        }`}
                        title="클릭하여 약 위치(진열장/매대 번호) 입력 또는 수정"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="truncate">
                            {product.storageLocation
                              ? `약 위치: ${product.storageLocation}`
                              : '약 위치 미지정 (클릭하여 입력)'}
                          </span>
                        </div>
                        <Edit3 className="w-3 h-3 opacity-50 shrink-0" />
                      </div>
                    )}

                    {/* 매칭된 효능 태그 및 상세 보기 안내 */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <div className="flex items-center gap-1 flex-wrap overflow-hidden max-h-5">
                        {(matchedEfficacyTags.length > 0
                          ? matchedEfficacyTags.slice(0, 3)
                          : product.tags.slice(0, 2)
                        ).map((t, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              selectedTag === t
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/70'
                            }`}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <span className="text-[11px] font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
                        <span>상세보기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
