import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ProductItem } from '../types/product';
import { Layers, HelpCircle, GripVertical, SlidersHorizontal } from 'lucide-react';
import { normalizeCategory, getCategoryColor } from '../utils/categoryColors';
import { resolveIngredientDisplayInfo, sortProductIngredients } from '../utils/innMapper';
import { EfficacyClassificationModal } from './EfficacyClassificationModal';

interface ColumnDef {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
}

const COLUMNS: ColumnDef[] = [
  { id: 'category', label: '약효 분류', defaultWidth: 130, minWidth: 90 },
  { id: 'specification', label: '성분 / 함량', defaultWidth: 380, minWidth: 180 },
  { id: 'summary', label: '핵심 특징 및 작용 원리 요약', defaultWidth: 400, minWidth: 180 },
  { id: 'form', label: '원료 형태', defaultWidth: 240, minWidth: 120 },
];

const COLUMN_STORAGE_KEY = 'pharmassist_matrix_column_widths_v2';

interface IngredientMatrixProps {
  product: ProductItem;
}

export const IngredientMatrix: React.FC<IngredientMatrixProps> = ({ product }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 각 열(컬럼) 너비 수동 조절 상태 (localStorage 자동 보존)
  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === COLUMNS.length) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('열 너비 불러오기 실패:', e);
    }
    return COLUMNS.map((c) => c.defaultWidth);
  });

  const isResizingRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  // 마우스 드래그를 통한 컬럼 너비 조절 핸들러
  const handleMouseDown = (colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = {
      colIndex,
      startX: e.clientX,
      startWidth: columnWidths[colIndex],
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const { colIndex: idx, startX, startWidth } = isResizingRef.current;
      const diff = moveEvent.clientX - startX;
      const minW = COLUMNS[idx].minWidth;
      const newWidth = Math.max(minW, startWidth + diff);

      setColumnWidths((prev) => {
        const next = [...prev];
        next[idx] = Math.round(newWidth);
        return next;
      });
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = null;
        setColumnWidths((current) => {
          try {
            localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(current));
          } catch (e) {}
          return current;
        });
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 표준 성분 정렬 (비타민 A, B1..B9..B12, C, D, E, K -> 미네랄 알파벳순 -> 기타 성분 알파벳순)
  const baseSortedIngredients = useMemo(() => {
    return sortProductIngredients(product.ingredients, product.productName);
  }, [product.ingredients, product.productName]);

  // 제품 내 존재하는 KPIC 약효 분류 카테고리 추출 (기본: 표준 비타민->미네랄->기타 순서)
  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        baseSortedIngredients.map(
          (ing) => resolveIngredientDisplayInfo(ing, product.productName).categoryTag
        )
      )
    ).filter(Boolean);
  }, [baseSortedIngredients, product.productName]);

  // 사용자가 드래그로 조정한 약효 분류 순서 (localStorage에 보관, v2 키 사용)
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`pharmassist_cat_order_v2_${product.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((c) => availableCategories.includes(c));
          const missing = availableCategories.filter((c) => !valid.includes(c));
          return [...valid, ...missing];
        }
      }
    } catch (e) {}
    return availableCategories;
  });

  // 제품이 바뀌거나 가용 카테고리가 달라질 때 categoryOrder 동기화
  useEffect(() => {
    setCategoryOrder(() => {
      try {
        const saved = localStorage.getItem(`pharmassist_cat_order_v2_${product.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((c) => availableCategories.includes(c));
            const missing = availableCategories.filter((c) => !valid.includes(c));
            return [...valid, ...missing];
          }
        }
      } catch (e) {}
      return availableCategories;
    });
  }, [product.id, availableCategories]);

  // 카테고리 버튼 드래그 앤 드롭 상태 관리
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [dragOverCatIndex, setDragOverCatIndex] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleCatDragStart = (e: React.DragEvent, index: number) => {
    isDraggingRef.current = true;
    setDraggedCatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleCatDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCatIndex !== index) {
      setDragOverCatIndex(index);
    }
  };

  const handleCatDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) {
      setDraggedCatIndex(null);
      setDragOverCatIndex(null);
      return;
    }

    setCategoryOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedCatIndex, 1);
      next.splice(targetIndex, 0, moved);
      try {
        localStorage.setItem(`pharmassist_cat_order_v2_${product.id}`, JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    setDraggedCatIndex(null);
    setDragOverCatIndex(null);
  };

  const handleCatDragEnd = () => {
    setDraggedCatIndex(null);
    setDragOverCatIndex(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  // 사용자가 드래그로 약효 분류 순서를 바꾼 경우에만 categoryOrder를 반영하고, 기본 상태에서는 baseSortedIngredients 순서 유지
  const sortedIngredients = useMemo(() => {
    const isCustomOrder =
      categoryOrder.length === availableCategories.length &&
      categoryOrder.some((c, i) => c !== availableCategories[i]);

    if (!isCustomOrder) {
      return baseSortedIngredients;
    }

    return [...baseSortedIngredients].sort((a, b) => {
      const infoA = resolveIngredientDisplayInfo(a, product.productName);
      const infoB = resolveIngredientDisplayInfo(b, product.productName);

      const idxA = categoryOrder.indexOf(infoA.categoryTag);
      const idxB = categoryOrder.indexOf(infoB.categoryTag);

      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
        return idxA - idxB;
      }
      return infoA.englishName.localeCompare(infoB.englishName, 'en', { sensitivity: 'base' });
    });
  }, [baseSortedIngredients, categoryOrder, availableCategories, product.productName]);

  const filteredIngredients = selectedCategory === 'ALL'
    ? sortedIngredients
    : sortedIngredients.filter(
        (ing) => resolveIngredientDisplayInfo(ing, product.productName).categoryTag === selectedCategory
      );

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs overflow-hidden">
      {/* 헤더 & 카테고리 필터 */}
      <div className="p-3.5 px-5 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-y-3 gap-x-6">
        {/* 좌측: 성분 / 함량 타이틀 (큰 폰트 & 충분한 공간 확보) + 약효 분류표 수정하기 버튼 */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-sky-600 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900 whitespace-nowrap tracking-tight">
              성분 / 함량
            </h3>
          </div>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-white hover:bg-sky-50 border border-sky-300 hover:border-sky-400 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
            title="약학정보원(KPIC) 약효 분류표 전체 조회, 성분 검색 및 약효 분류 실시간 수정"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
            <span>약효 분류표 수정하기</span>
          </button>
        </div>

        {/* 우측: 충분한 공간을 두고 배치된 약효별 필터 탭 (드래그하여 순서 재배치 가능) */}
        <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-[320px] pl-4 border-l border-slate-200/90">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 text-xs rounded-md font-bold transition-all shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 ({product.ingredients.length})
          </button>
          {categoryOrder.map((cat, idx) => {
            const isSelected = selectedCategory === cat;
            const isDraggingThis = draggedCatIndex === idx;
            const isOverThis = dragOverCatIndex === idx;

            return (
              <button
                key={cat}
                draggable
                onDragStart={(e) => handleCatDragStart(e, idx)}
                onDragOver={(e) => handleCatDragOver(e, idx)}
                onDrop={(e) => handleCatDrop(e, idx)}
                onDragEnd={handleCatDragEnd}
                onClick={() => {
                  if (isDraggingRef.current) return;
                  setSelectedCategory(cat);
                }}
                title={`${cat} (드래그하여 순서 변경 가능)`}
                className={`group inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all select-none cursor-grab active:cursor-grabbing shrink-0 ${
                  isSelected
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                } ${
                  isDraggingThis ? 'opacity-40 scale-95 border-dashed border-sky-400' : ''
                } ${
                  isOverThis && !isDraggingThis ? 'ring-2 ring-sky-500 ring-offset-1 border-sky-500' : ''
                }`}
              >
                <GripVertical
                  className={`w-3 h-3 -ml-0.5 transition-opacity ${
                    isSelected
                      ? 'text-sky-200 opacity-60 group-hover:opacity-100'
                      : 'text-slate-400 opacity-40 group-hover:opacity-80'
                  }`}
                />
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 성분 매트릭스 테이블 영역 (수동 열 너비 조절 지원) */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table 
          className="text-left border-collapse table-fixed min-w-full"
          style={{ width: `${columnWidths.reduce((a, b) => a + b, 0)}px` }}
        >
          <colgroup>
            {columnWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 select-none">
              {COLUMNS.map((col, idx) => (
                <th
                  key={col.id}
                  style={{ width: `${columnWidths[idx]}px` }}
                  className="relative py-2.5 px-3.5 group/th text-center"
                >
                  <span className="truncate block font-bold text-center">{col.label}</span>
                  {/* 드래그 리사이즈 핸들 */}
                  <div
                    onMouseDown={(e) => handleMouseDown(idx, e)}
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center group hover:bg-sky-200/60 active:bg-sky-400 z-20"
                    title="좌우로 드래그하여 열 너비를 조절할 수 있습니다"
                  >
                    <div className="w-[2px] h-3.5 bg-slate-300 group-hover:h-full group-hover:bg-sky-600 transition-all" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredIngredients.map((ing, idx) => {
              // 1. formattedSpecification이 이미 있으면 최우선 사용하되, 한글 성분명이 남아있으면 영문화
              let rawSpec = ing.formattedSpecification;
              if (!rawSpec) {
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

                rawSpec = `${mainName} ${mainAmountStr}${bracketStr}`.trim();
              }

              // 한글 성분명 영문화 정제
              const displaySpec = rawSpec
                .replace(/베타카로틴\s*20\%/gi, 'Beta-carotene 20%')
                .replace(/베타카로틴/gi, 'Beta-carotene')
                .replace(/칼슘판토테네이트|판토텐산칼슘/gi, 'Calcium pantothenate')
                .replace(/콜레칼시페롤농축분말|농축콜레칼시페롤/gi, 'Cholecalciferol')
                .replace(/피리독신염산염/gi, 'Pyridoxine hydrochloride')
                .replace(/시아노코발라민/gi, 'Cyanocobalamin')
                .replace(/니코틴산아미드/gi, 'Nicotinamide')
                .replace(/콜린타르타르산염/gi, 'Choline bitartrate')
                .replace(/이노시톨/gi, 'Inositol')
                .replace(/산화아연/gi, 'Zinc oxide')
                .replace(/산화마그네슘/gi, 'Magnesium oxide')
                .trim();

              return (
                <tr
                  key={idx}
                  className="hover:bg-sky-50/50 transition-colors group align-top"
                >
                  {/* 1. 약효 분류 */}
                  <td className="py-3 px-3.5 whitespace-nowrap text-center">
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-md border ${getCategoryColor(
                        ing.functionalCategory
                      )}`}
                    >
                      {normalizeCategory(ing.functionalCategory)}
                    </span>
                  </td>

                  {/* 2. 성분 / 함량 */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5 group-hover:text-sky-700 transition-colors">
                      <span className="break-words">{displaySpec}</span>
                    </div>
                  </td>

                  {/* 3. 핵심 특징 및 작용 원리 요약 */}
                  <td className="py-3 px-4">
                    <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 break-words">
                      {ing.clinicalSummary}
                    </div>
                  </td>

                  {/* 4. 원료 형태 */}
                  <td className="py-3 px-3.5">
                    <div className="text-slate-700 font-medium text-xs leading-relaxed break-words">
                      {ing.chemicalFormName}
                    </div>
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
          <HelpCircle className="w-4 h-4 text-sky-500 shrink-0" />
          <span>각 열(컬럼) 오른쪽 경계선을 마우스로 드래그하면 원하는 폭으로 자유롭게 조절할 수 있습니다 (너비 설정 자동 저장).</span>
        </span>
        <span className="text-slate-400 font-mono text-[11px]">
          {product.productName} ({product.manufacturer})
        </span>
      </div>

      {/* 약학정보원(KPIC) 약효 분류표 관리 및 수정 모달 */}
      <EfficacyClassificationModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
};
