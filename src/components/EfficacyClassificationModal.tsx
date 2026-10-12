import React, { useState, useMemo, useEffect } from 'react';
import { useProductStore } from '../stores/useProductStore';
import { INN_DICTIONARY, KPIC_MASTER_DATABASE, getLearnedDict } from '../utils/innMapper';
import { 
  normalizeCategory, 
  getCategoryColor, 
  STANDARD_EFFICACY_CATEGORIES 
} from '../utils/categoryColors';
import { 
  X, 
  Search, 
  SlidersHorizontal, 
  Check, 
  Edit3, 
  Package, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface EfficacyClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IngredientRow {
  key: string;
  englishInn: string;
  koreanName: string;
  functionalCategory: string;
  chemicalFormName?: string;
  productNames: string[];
  productCount: number;
}

export const EfficacyClassificationModal: React.FC<EfficacyClassificationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { products, updateIngredientCategory, batchRenameCategory } = useProductStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  const [onlyInProducts, setOnlyInProducts] = useState(false);

  // 인라인 편집 상태 { [ingredientKey]: string }
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editCategoryVal, setEditCategoryVal] = useState<string>('');
  const [customInputMode, setCustomInputMode] = useState(false);

  // 일괄 변경 모달/폼 토글
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchOldCat, setBatchOldCat] = useState('');
  const [batchNewCat, setBatchNewCat] = useState('');

  // 알림 토스트 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. 전체 성분 및 현재 약효분류 매핑 데이터 집합 생성
  const allIngredients = useMemo<IngredientRow[]>(() => {
    const map = new Map<string, IngredientRow>();

    // 1-1. 현재 등록된 모든 제품의 성분들 취합
    products.forEach((prod) => {
      prod.ingredients.forEach((ing) => {
        const inn = ing.englishInn?.trim() || ing.koreanName?.trim() || ing.ingredientId;
        const normKey = inn.toLowerCase();

        if (!map.has(normKey)) {
          map.set(normKey, {
            key: normKey,
            englishInn: ing.englishInn || ing.koreanName || inn,
            koreanName: ing.koreanName || '',
            functionalCategory: normalizeCategory(ing.functionalCategory) || '기타',
            chemicalFormName: ing.chemicalFormName,
            productNames: [prod.productName],
            productCount: 1
          });
        } else {
          const item = map.get(normKey)!;
          if (!item.productNames.includes(prod.productName)) {
            item.productNames.push(prod.productName);
            item.productCount += 1;
          }
          if (!item.koreanName && ing.koreanName) {
            item.koreanName = ing.koreanName;
          }
          if (ing.functionalCategory) {
            item.functionalCategory = normalizeCategory(ing.functionalCategory);
          }
        }
      });
    });

    // 1-2. 표준 영양 사전(INN_DICTIONARY)의 성분들 보강
    Object.entries(INN_DICTIONARY).forEach(([korName, meta]) => {
      const inn = meta.englishInn || korName;
      const normKey = inn.toLowerCase();

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          englishInn: inn,
          koreanName: korName,
          functionalCategory: normalizeCategory(meta.functionalCategory) || '기타',
          chemicalFormName: meta.chemicalFormName,
          productNames: [],
          productCount: 0
        });
      } else {
        const item = map.get(normKey)!;
        if (!item.koreanName) item.koreanName = korName;
      }
    });

    // 1-3. KPIC 마스터 데이터베이스 (2,400여 개 전체 성분 및 공식 약효분류 매핑)
    Object.entries(KPIC_MASTER_DATABASE).forEach(([kpicName, kpicCat]) => {
      if (!kpicCat || kpicCat === '기타') return;
      const normKey = kpicName.trim().toLowerCase();

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          englishInn: kpicName,
          koreanName: /[가-힣]/.test(kpicName) ? kpicName : '',
          functionalCategory: normalizeCategory(kpicCat),
          productNames: [],
          productCount: 0
        });
      }
    });

    // 1-4. 사용자가 커스텀 수정한 학습 사전(learnedDict) 최우선 오버라이드
    try {
      const learned = getLearnedDict();
      Object.entries(learned).forEach(([learnedKey, meta]) => {
        const normKey = learnedKey.trim().toLowerCase();
        if (map.has(normKey)) {
          const item = map.get(normKey)!;
          if (meta.functionalCategory) {
            item.functionalCategory = normalizeCategory(meta.functionalCategory);
          }
        } else if (meta.englishInn && meta.functionalCategory) {
          map.set(normKey, {
            key: normKey,
            englishInn: meta.englishInn,
            koreanName: /[가-힣]/.test(learnedKey) ? learnedKey : '',
            functionalCategory: normalizeCategory(meta.functionalCategory),
            productNames: [],
            productCount: 0
          });
        }
      });
    } catch (e) {}

    // 제품에 포함된 성분 우선, 그 다음 가나다순 정렬
    return Array.from(map.values()).sort((a, b) => {
      if (b.productCount !== a.productCount) {
        return b.productCount - a.productCount;
      }
      return a.englishInn.localeCompare(b.englishInn, 'ko');
    });
  }, [products]);

  // 사용 가능한 전체 고유 카테고리 목록
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>(STANDARD_EFFICACY_CATEGORIES);
    allIngredients.forEach((item) => {
      if (item.functionalCategory) set.add(item.functionalCategory);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [allIngredients]);

  // 검색 및 필터링된 성분 목록
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allIngredients.filter((item) => {
      if (onlyInProducts && item.productCount === 0) return false;
      if (selectedFilterCategory !== 'ALL' && item.functionalCategory !== selectedFilterCategory) {
        return false;
      }
      if (!q) return true;

      const matchInn = item.englishInn.toLowerCase().includes(q);
      const matchKor = item.koreanName.toLowerCase().includes(q);
      const matchCat = item.functionalCategory.toLowerCase().includes(q);
      const matchProd = item.productNames.some((p) => p.toLowerCase().includes(q));
      return matchInn || matchKor || matchCat || matchProd;
    });
  }, [allIngredients, searchQuery, selectedFilterCategory, onlyInProducts]);

  // 대용량(2,400+개) 쾌속 렌더링을 위한 페이지네이션 (50개씩)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFilterCategory, onlyInProducts]);

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  // 성분 개별 수정 실행
  const handleSaveCategory = async (key: string, newCat: string) => {
    const target = allIngredients.find((i) => i.key === key);
    if (!target) return;
    const finalCat = normalizeCategory(newCat);
    if (!finalCat) return;

    await updateIngredientCategory(target.englishInn, finalCat);
    setEditingKey(null);
    setCustomInputMode(false);
    showToast(`'${target.englishInn}' 성분의 약효 분류가 '${finalCat}'(으)로 즉시 변경되었습니다.`);
  };

  // 일괄 변경 실행
  const handleBatchRename = async () => {
    if (!batchOldCat || !batchNewCat) {
      alert('기존 약효 분류와 새 분류명을 모두 입력해주세요.');
      return;
    }
    const oldNorm = normalizeCategory(batchOldCat);
    const newNorm = normalizeCategory(batchNewCat);
    if (oldNorm === newNorm) {
      alert('기존 분류와 새 분류명이 동일합니다.');
      return;
    }

    await batchRenameCategory(oldNorm, newNorm);
    setIsBatchOpen(false);
    setBatchOldCat('');
    setBatchNewCat('');
    showToast(`약효 분류 '${oldNorm}'이(가) '${newNorm}'(으)로 일괄 변경되었습니다.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="p-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                약학정보원(KPIC) 약효 분류표 관리 및 수정
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                등록된 전체 성분의 약효 분류를 검색하고 실시간으로 수정합니다. 수정 시 모든 등록 제품에 즉시 반영됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-white hover:bg-sky-50 border border-sky-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="특정 약효분류 명칭을 다른 이름으로 한 번에 변경"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              <span>약효 분류명 일괄 변경</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 토스트 알림 메시지 */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 일괄 변경 입력 폼 (토글 시 노출) */}
        {isBatchOpen && (
          <div className="p-4 bg-sky-50/70 border-b border-sky-200/80 flex flex-wrap items-center gap-3 text-xs animate-fade-in">
            <span className="font-bold text-sky-900 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              약효 분류명 일괄 변경:
            </span>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <select
                value={batchOldCat}
                onChange={(e) => setBatchOldCat(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800"
              >
                <option value="">변경할 기존 분류 선택...</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="text-slate-400 font-bold">➔</span>
              <input
                type="text"
                placeholder="새 약효 분류명 입력 (예: 비타민B군 복합)"
                value={batchNewCat}
                onChange={(e) => setBatchNewCat(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 min-w-[200px]"
              />
              <button
                onClick={handleBatchRename}
                className="px-3 py-1 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-md transition-colors cursor-pointer"
              >
                일괄 적용
              </button>
              <button
                onClick={() => setIsBatchOpen(false)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-md"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 검색 및 필터 툴바 */}
        <div className="p-3.5 md:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 검색창 */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="성분명(한글/영문) 또는 약효 분류 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
            />
          </div>

          {/* 분류 필터 & 등록제품 체크박스 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">분류별:</span>
              <select
                value={selectedFilterCategory}
                onChange={(e) => setSelectedFilterCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs"
              >
                <option value="ALL">전체 약효 분류 ({uniqueCategories.length}종)</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                checked={onlyInProducts}
                onChange={(e) => setOnlyInProducts(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>등록 제품에 포함된 성분만 보기</span>
            </label>
          </div>
        </div>

        {/* 테이블 목록 */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 select-none">
                <th className="py-2.5 px-4 w-[240px]">성분명 (영문 INN / 한글)</th>
                <th className="py-2.5 px-4 w-[160px] text-center">현재 약효 분류</th>
                <th className="py-2.5 px-4 w-[260px]">약효 분류 수정</th>
                <th className="py-2.5 px-4">포함된 제품</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    검색 조건에 맞는 성분 또는 약효 분류가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const isEditing = editingKey === item.key;

                  return (
                    <tr
                      key={item.key}
                      className="hover:bg-sky-50/40 transition-colors group align-middle"
                    >
                      {/* 1. 성분명 */}
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {item.englishInn}
                        </div>
                        {item.koreanName && item.koreanName !== item.englishInn && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.koreanName}
                          </div>
                        )}
                        {item.chemicalFormName && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                            {item.chemicalFormName}
                          </div>
                        )}
                      </td>

                      {/* 2. 현재 약효 분류 */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-md border ${getCategoryColor(
                            item.functionalCategory
                          )}`}
                        >
                          {item.functionalCategory}
                        </span>
                      </td>

                      {/* 3. 약효 분류 수정 */}
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            {customInputMode ? (
                              <input
                                type="text"
                                autoFocus
                                value={editCategoryVal}
                                onChange={(e) => setEditCategoryVal(e.target.value)}
                                placeholder="새 분류명 직접 입력"
                                className="bg-white border border-sky-400 rounded-md px-2 py-1 text-xs text-slate-900 w-36 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            ) : (
                              <select
                                autoFocus
                                value={editCategoryVal}
                                onChange={(e) => {
                                  if (e.target.value === '__CUSTOM__') {
                                    setCustomInputMode(true);
                                    setEditCategoryVal('');
                                  } else {
                                    setEditCategoryVal(e.target.value);
                                  }
                                }}
                                className="bg-white border border-sky-400 rounded-md px-2 py-1 text-xs text-slate-900 w-36 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              >
                                {uniqueCategories.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="__CUSTOM__">+ 직접 입력하기...</option>
                              </select>
                            )}

                            <button
                              onClick={() => handleSaveCategory(item.key, editCategoryVal)}
                              className="p-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors cursor-pointer"
                              title="수정 사항 저장"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingKey(null);
                                setCustomInputMode(false);
                              }}
                              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
                              title="취소"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingKey(item.key);
                              setEditCategoryVal(item.functionalCategory);
                              setCustomInputMode(false);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-sky-600" />
                            <span>분류 수정</span>
                          </button>
                        )}
                      </td>

                      {/* 4. 포함된 제품 */}
                      <td className="py-2.5 px-4">
                        {item.productCount > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.productNames.map((prodName, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/70 text-[10px] font-medium"
                              >
                                <Package className="w-2.5 h-2.5 text-sky-500" />
                                <span>{prodName}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            표준 사전 등록 (등록 품목 없음)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 푸터 통계 및 안내 */}
        <div className="p-3 md:px-6 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              전체 성분 <strong className="text-slate-800">{allIngredients.length.toLocaleString()}</strong>개
            </span>
            <span className="text-slate-300">|</span>
            <span>
              약효 분류 <strong className="text-slate-800">{uniqueCategories.length}</strong>종
            </span>
            <span className="text-slate-300">|</span>
            <span>
              검색 결과 <strong className="text-sky-700 font-bold">{filteredList.length.toLocaleString()}</strong>개
            </span>
          </div>

          {/* 페이지네이션 컨트롤 */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                이전
              </button>
              <span className="font-semibold text-slate-700">
                {currentPage} / {totalPages} 페이지
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                다음
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
