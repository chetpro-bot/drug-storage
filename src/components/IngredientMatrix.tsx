import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ProductItem } from '../types/product';
import { Layers, HelpCircle, GripVertical } from 'lucide-react';

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

  // 카테고리 명칭 정규화 (비타민X 제제 -> 비타민X, X 보충 -> X)
  const normalizeCategory = (cat: string): string => {
    let res = (cat || '').replace(/^비타민([A-Za-z0-9]+)\s*제제$/, '비타민$1');
    res = res.replace(/\s*보충$/, '');
    return res;
  };

  // 제품 내 존재하는 KPIC 약효 분류 카테고리 추출 (기본: 가나다순)
  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(product.ingredients.map((ing) => normalizeCategory(ing.functionalCategory)))
    ).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [product.ingredients]);

  // 사용자가 드래그로 조정한 약효 분류 순서 (localStorage에 보관)
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`pharmassist_cat_order_${product.id}`);
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
    setCategoryOrder((prev) => {
      try {
        const saved = localStorage.getItem(`pharmassist_cat_order_${product.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((c) => availableCategories.includes(c));
            const missing = availableCategories.filter((c) => !valid.includes(c));
            return [...valid, ...missing];
          }
        }
      } catch (e) {}

      const valid = prev.filter((c) => availableCategories.includes(c));
      const missing = availableCategories.filter((c) => !valid.includes(c));
      const combined = [...valid, ...missing];
      return combined.length > 0 ? combined : availableCategories;
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
        localStorage.setItem(`pharmassist_cat_order_${product.id}`, JSON.stringify(next));
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

  // 1차: 약효 분류 버튼 배치 순서(categoryOrder), 2차: 영문 성분명(English INN) 알파벳 abc순 정렬
  const sortedIngredients = useMemo(() => {
    return [...product.ingredients].sort((a, b) => {
      const catA = normalizeCategory(a.functionalCategory);
      const catB = normalizeCategory(b.functionalCategory);

      const idxA = categoryOrder.indexOf(catA);
      const idxB = categoryOrder.indexOf(catB);

      if (idxA !== -1 && idxB !== -1) {
        if (idxA !== idxB) return idxA - idxB;
      } else if (idxA !== -1) {
        return -1;
      } else if (idxB !== -1) {
        return 1;
      } else {
        const catComp = catA.localeCompare(catB, 'ko');
        if (catComp !== 0) return catComp;
      }

      const nameA = a.englishInn || '';
      const nameB = b.englishInn || '';
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });
  }, [product.ingredients, categoryOrder]);

  const filteredIngredients = selectedCategory === 'ALL'
    ? sortedIngredients
    : sortedIngredients.filter((ing) => normalizeCategory(ing.functionalCategory) === selectedCategory);

  const getCategoryColor = (cat: string) => {
    const norm = normalizeCategory(cat);
    switch (norm) {
      // 비타민 B군
      case '비타민B1':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case '비타민B2':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '비타민B3':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '비타민B5':
        return 'bg-lime-100 text-lime-800 border-lime-200';
      case '비타민B6':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case '비타민B7':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '비타민B12':
      case '비타민B12 보충':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case '기타 비타민B':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      // 기타 비타민 & 미네랄
      case '비타민C':
      case '비타민C 제제':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case '비타민D':
      case '비타민D 제제':
      case '비타민D3':
      case '비타민D3 제제':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case '비타민E':
      case '비타민E 제제':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case '비타민A':
      case '비타민A 제제':
        return 'bg-red-100 text-red-800 border-red-200';
      case '비타민K':
      case '비타민K 제제':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case '엽산':
      case '엽산 보충':
        return 'bg-green-100 text-green-800 border-green-200';
      case '마그네슘(Mg)':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '아연(Zn)':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      case '칼슘(Ca)':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case '셀레늄(Se)':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '크롬(Cr)':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '제1철 (Ferrous)':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      // 소화 / 효소
      case '소화효소제':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '장내 가스 제거제':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case '소염효소':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '담석용해제':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      // 아미노산 & 기타
      case '비필수 아미노산제제':
      case '아미노산제제':
        return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
      case '간보호제':
      case '기타 간장 약물':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '자율신경제':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '기타 심부전 치료제':
        return 'bg-rose-100 text-rose-800 border-rose-200';
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
            성분 / 함량
          </h3>
          <span
            className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs"
            title={`총 ${product.ingredients.length}개 성분`}
          >
            {product.ingredients.length}
          </span>
        </div>

        {/* 약효별 필터 칩 (드래그하여 순서 재배치 가능) */}
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
                className={`group inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all select-none cursor-grab active:cursor-grabbing ${
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
                  className={`relative py-2.5 px-3.5 group/th ${
                    idx === 0 ? 'text-center' : ''
                  }`}
                >
                  <span className="truncate block font-bold">{col.label}</span>
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
    </div>
  );
};
