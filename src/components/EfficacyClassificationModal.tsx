import React, { useState, useMemo, useEffect } from 'react';
import { useProductStore } from '../stores/useProductStore';
import { INN_DICTIONARY, KPIC_MASTER_DATABASE, getLearnedDict } from '../utils/innMapper';
import { 
  normalizeCategory, 
  getCategoryColor, 
  STANDARD_EFFICACY_CATEGORIES 
} from '../utils/categoryColors';
import {
  buildKpicTree,
  filterKpicTree,
  KpicTreeNode,
  KpicTreeIngredient
} from '../utils/kpicHierarchy';
import { 
  X, 
  Search, 
  SlidersHorizontal, 
  Check, 
  Edit3, 
  Package, 
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Layers,
  TableProperties,
  Pill,
  ExternalLink
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

  // 뷰 모드: 'tree' (health.kr 계층 트리형) | 'table' (평면 목록형)
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  const [onlyInProducts, setOnlyInProducts] = useState(false);

  // 트리 펼침/접힘 상태 관리 (Set of category codes)
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => new Set<string>());

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

  // 2. health.kr 공식 체계 4단계 트리 구축
  const rawTree = useMemo<KpicTreeNode[]>(() => {
    return buildKpicTree(allIngredients);
  }, [allIngredients]);

  // 3. 트리 검색 및 필터링
  const { filteredTree, autoExpandedCodes, totalMatchedIngredients } = useMemo(() => {
    return filterKpicTree(rawTree, searchQuery, selectedFilterCategory, onlyInProducts);
  }, [rawTree, searchQuery, selectedFilterCategory, onlyInProducts]);

  // 검색어가 있을 때 자동으로 일치 노드 펼치기
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedCodes((prev) => {
        const merged = new Set(prev);
        autoExpandedCodes.forEach((code) => merged.add(code));
        return merged;
      });
    }
  }, [searchQuery, autoExpandedCodes]);

  // 4. 테이블 뷰 필터링 목록
  const tableFilteredList = useMemo(() => {
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

  // 테이블 뷰 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFilterCategory, onlyInProducts]);

  const totalPages = Math.ceil(tableFilteredList.length / PAGE_SIZE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return tableFilteredList.slice(start, start + PAGE_SIZE);
  }, [tableFilteredList, currentPage]);

  // 노드 토글 핸들러
  const handleToggleNode = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // health.kr 뎁스별 빠른 펼치기/접기 핸들러
  const handleSetDepth = (depth: 1 | 2 | 3 | 4) => {
    const next = new Set<string>();
    if (depth === 1) {
      // 대분류만 표시 (하위 전체 닫기)
    } else if (depth === 2) {
      // 1단계(대분류) 펼쳐서 중분류까지 노출
      rawTree.forEach((r) => next.add(r.code));
    } else if (depth === 3) {
      // 1, 2단계 펼쳐서 소분류까지 노출
      rawTree.forEach((r) => {
        next.add(r.code);
        r.children.forEach((c) => next.add(c.code));
      });
    } else if (depth === 4) {
      // 전체 노드 펼치기 (성분까지 전체 노출)
      const addAll = (n: KpicTreeNode) => {
        next.add(n.code);
        n.children.forEach(addAll);
      };
      rawTree.forEach(addAll);
    }
    setExpandedCodes(next);
  };

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 md:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* 1. 상단 모달 헤더 */}
        <div className="p-4 md:px-6 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-white">
                  약학정보원(KPIC) 약효 분류표 관리 및 수정
                </h2>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  health.kr 공식 4단계 계층 연동
                </span>
                <a
                  href="https://www.health.kr/drug-info/kpic-classification"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-300 hover:text-sky-200 flex items-center gap-1 underline underline-offset-2 ml-1"
                  title="약학정보원 공식 KPIC 약효분류 웹페이지 열기"
                >
                  <span>공식 사이트 확인</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                대분류 ➔ 중분류 ➔ 소분류 ➔ 성분 체계(1,352개 분류 체계 & 2,234개 성분)로 의약품·영양제 약효 분류를 검색하고 실시간 관리합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="특정 약효분류 명칭을 다른 이름으로 한 번에 변경"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">약효 분류명 일괄 변경</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
          <div className="p-3.5 bg-sky-50 border-b border-sky-200 flex flex-wrap items-center gap-3 text-xs animate-fade-in">
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
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-md cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 2. 뷰 모드 탭 & health.kr 뎁스 제어 툴바 */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 뷰 모드 탭 버튼 */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-white text-sky-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>계층 트리 뷰 (health.kr 스타일)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-sky-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5 text-slate-500" />
              <span>테이블 목록 뷰</span>
            </button>
          </div>

          {/* health.kr 전용 뎁스 컨트롤 및 범례 */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* 뎁스 버튼 그룹 */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 px-1.5">깊이(Depth):</span>
                <button
                  onClick={() => handleSetDepth(1)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded text-[#003675] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  title="대분류만 표시 (하위 접기)"
                >
                  대분류
                </button>
                <button
                  onClick={() => handleSetDepth(2)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded text-[#246BEB] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  title="중분류까지 펼치기"
                >
                  중분류
                </button>
                <button
                  onClick={() => handleSetDepth(3)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded text-[#4B7DDA] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  title="소분류까지 펼치기"
                >
                  소분류
                </button>
                <button
                  onClick={() => handleSetDepth(4)}
                  className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-sky-700 text-white hover:bg-sky-800 transition-colors cursor-pointer"
                  title="전체 성분까지 모두 펼치기"
                >
                  전체 펼치기
                </button>
              </div>

              {/* 공식 색상 범례 배지 */}
              <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#003675] text-white font-medium">대분류</span>
                <span className="text-slate-300">›</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#246BEB] text-white font-medium">중분류</span>
                <span className="text-slate-300">›</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#7FA6E8] text-white font-medium">소분류</span>
                <span className="text-slate-300">›</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-medium">성분</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. 검색 및 필터 툴바 */}
        <div className="p-3 md:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 검색창 */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="성분명(한글/영문) 또는 약효 분류, 코드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 분류 필터 & 등록제품 체크박스 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">분류 필터:</span>
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

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none font-medium">
              <input
                type="checkbox"
                checked={onlyInProducts}
                onChange={(e) => setOnlyInProducts(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-sky-600" />
                등록 제품에 포함된 성분만 보기
              </span>
            </label>
          </div>
        </div>

        {/* 4. 본문 컨텐츠 영역 */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50/50">
          
          {/* ======================= 모드 1: health.kr 계층 트리 뷰 ======================= */}
          {viewMode === 'tree' ? (
            <div className="p-3 md:p-6 space-y-2">
              {filteredTree.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  검색 조건에 일치하는 약효 분류 또는 성분이 없습니다.
                </div>
              ) : (
                filteredTree.map((rootNode) => (
                  <TreeNodeItem
                    key={rootNode.code}
                    node={rootNode}
                    expandedCodes={expandedCodes}
                    onToggle={handleToggleNode}
                    editingKey={editingKey}
                    editCategoryVal={editCategoryVal}
                    customInputMode={customInputMode}
                    uniqueCategories={uniqueCategories}
                    setEditingKey={setEditingKey}
                    setEditCategoryVal={setEditCategoryVal}
                    setCustomInputMode={setCustomInputMode}
                    onSaveCategory={handleSaveCategory}
                    searchQuery={searchQuery}
                  />
                ))
              )}
            </div>
          ) : (
            /* ======================= 모드 2: 테이블 목록 뷰 ======================= */
            <table className="w-full text-left border-collapse text-xs bg-white">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 select-none">
                  <th className="py-2.5 px-4 w-[240px]">성분명 (영문 INN / 한글)</th>
                  <th className="py-2.5 px-4 w-[160px] text-center">현재 약효 분류</th>
                  <th className="py-2.5 px-4 w-[260px]">약효 분류 수정</th>
                  <th className="py-2.5 px-4">포함된 제품</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableFilteredList.length === 0 ? (
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

                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-md border ${getCategoryColor(
                              item.functionalCategory
                            )}`}
                          >
                            {item.functionalCategory}
                          </span>
                        </td>

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
          )}
        </div>

        {/* 5. 하단 푸터 통계 및 안내 */}
        <div className="p-3 md:px-6 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <span>
              대분류 <strong className="text-slate-900">{rawTree.length}</strong>개 · 중분류 <strong className="text-slate-900">141</strong>개 · 소분류 <strong className="text-slate-900">482</strong>개
            </span>
            <span className="text-slate-300">|</span>
            <span>
              전체 성분 <strong className="text-slate-900">{allIngredients.length.toLocaleString()}</strong>개
            </span>
            <span className="text-slate-300">|</span>
            <span>
              검색 일치 <strong className="text-sky-700 font-bold">
                {viewMode === 'tree' ? totalMatchedIngredients.toLocaleString() : tableFilteredList.length.toLocaleString()}
              </strong>개 성분
            </span>
          </div>

          {/* 테이블 뷰일 때만 페이지네이션 노출 */}
          {viewMode === 'table' && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                이전
              </button>
              <span className="font-semibold text-slate-700">
                {currentPage} / {totalPages}
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

/**
 * 계층 트리 재귀 렌더링 컴포넌트 (대분류-중분류-소분류-성분)
 */
interface TreeNodeItemProps {
  node: KpicTreeNode;
  expandedCodes: Set<string>;
  onToggle: (code: string) => void;
  editingKey: string | null;
  editCategoryVal: string;
  customInputMode: boolean;
  uniqueCategories: string[];
  setEditingKey: (key: string | null) => void;
  setEditCategoryVal: (val: string) => void;
  setCustomInputMode: (val: boolean) => void;
  onSaveCategory: (key: string, newCat: string) => void;
  searchQuery: string;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  expandedCodes,
  onToggle,
  editingKey,
  editCategoryVal,
  customInputMode,
  uniqueCategories,
  setEditingKey,
  setEditCategoryVal,
  setCustomInputMode,
  onSaveCategory,
  searchQuery
}) => {
  const isExpanded = expandedCodes.has(node.code);
  const hasChildren = node.children.length > 0;
  const hasIngredients = node.ingredients.length > 0;
  const canExpand = hasChildren || hasIngredients;

  // Level에 따른 스타일 지정
  // Level 1: 대분류 (#003675)
  // Level 2: 중분류 (#246BEB)
  // Level 3: 소분류 (#7FA6E8)
  // Level 4: 세분류
  const levelStyles = useMemo(() => {
    if (node.level === 1) {
      return {
        wrapBg: 'bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden my-2',
        rowBg: 'bg-[#003675] text-white hover:bg-[#002c5f] py-3.5 px-4',
        codeBg: 'bg-white/20 text-white font-mono font-bold text-xs px-2 py-0.5 rounded border border-white/30',
        badgeBg: 'bg-white/15 text-white font-semibold text-xs px-2.5 py-0.5 rounded-full border border-white/25',
        textColor: 'text-white font-bold text-sm md:text-base tracking-tight',
        enameColor: 'text-sky-200 text-xs font-normal',
        chevronColor: 'text-sky-200'
      };
    } else if (node.level === 2) {
      return {
        wrapBg: 'border-l-4 border-[#246BEB] my-1.5 ml-3 md:ml-6 rounded-r-lg',
        rowBg: 'bg-slate-50 hover:bg-blue-50/80 text-slate-900 py-2.5 px-3 rounded-r-lg border border-slate-200 shadow-2xs',
        codeBg: 'bg-[#246BEB] text-white font-mono font-bold text-xs px-2 py-0.5 rounded shadow-2xs',
        badgeBg: 'bg-blue-50 text-[#003675] font-bold text-xs px-2.5 py-0.5 rounded-md border border-blue-200',
        textColor: 'text-slate-900 font-bold text-xs md:text-sm',
        enameColor: 'text-slate-600 text-xs font-medium',
        chevronColor: 'text-[#246BEB]'
      };
    } else {
      return {
        wrapBg: 'border-l-4 border-[#7FA6E8] my-1 ml-3 md:ml-6 rounded-r-md',
        rowBg: 'bg-white hover:bg-sky-50 text-slate-900 py-2 px-3 rounded-r-md border border-slate-200 shadow-2xs',
        codeBg: 'bg-[#7FA6E8] text-white font-mono font-bold text-[11px] px-1.5 py-0.5 rounded shadow-2xs',
        badgeBg: 'bg-slate-100 text-slate-800 font-semibold text-[11px] px-2 py-0.5 rounded border border-slate-200',
        textColor: 'text-slate-900 font-bold text-xs',
        enameColor: 'text-slate-500 text-[11px] font-normal',
        chevronColor: 'text-[#4B7DDA]'
      };
    }
  }, [node.level]);

  return (
    <div className={levelStyles.wrapBg}>
      {/* 카테고리 헤더 행 */}
      <button
        type="button"
        onClick={() => canExpand && onToggle(node.code)}
        disabled={!canExpand}
        className={`w-full flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
          levelStyles.rowBg
        } ${!canExpand ? 'opacity-80 cursor-default' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* 펼침 아이콘 */}
          <span className="w-5 h-5 flex items-center justify-center shrink-0">
            {canExpand ? (
              isExpanded ? (
                <ChevronDown className={`w-4 h-4 ${levelStyles.chevronColor}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${levelStyles.chevronColor}`} />
              )
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            )}
          </span>

          {/* 코드 배지 */}
          <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${levelStyles.codeBg}`}>
            {node.code}
          </span>

          {/* 카테고리 명칭 */}
          <div className="flex items-baseline gap-2 truncate">
            <span className={levelStyles.textColor}>{node.label}</span>
            {node.ename && (
              <span className={levelStyles.enameColor}>({node.ename})</span>
            )}
          </div>
        </div>

        {/* 우측 메타 배지 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 등록 제품 포함 배지 */}
          {node.productIngredientsCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold shadow-2xs">
              <Package className="w-3.5 h-3.5 text-emerald-700" />
              <span>등록 제품 {node.productIngredientsCount}개 성분</span>
            </span>
          )}

          {/* 하위 항목 카운트 */}
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${levelStyles.badgeBg}`}>
            {node.level === 1 && node.children.length > 0
              ? `${node.children.length}개 중분류 · ${node.totalIngredientsCount}개 성분`
              : node.level === 2 && node.children.length > 0
              ? `${node.children.length}개 소분류 · ${node.totalIngredientsCount}개 성분`
              : `${node.totalIngredientsCount}개 성분`}
          </span>
        </div>
      </button>

      {/* 펼쳐졌을 때: 하위 자식 노드 및 소속 성분 렌더링 */}
      {isExpanded && (
        <div className="p-2 md:p-3 space-y-1.5 bg-slate-50/50">
          {/* 1. 하위 자식 카테고리 재귀 렌더링 */}
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.code}
              node={child}
              expandedCodes={expandedCodes}
              onToggle={onToggle}
              editingKey={editingKey}
              editCategoryVal={editCategoryVal}
              customInputMode={customInputMode}
              uniqueCategories={uniqueCategories}
              setEditingKey={setEditingKey}
              setEditCategoryVal={setEditCategoryVal}
              setCustomInputMode={setCustomInputMode}
              onSaveCategory={onSaveCategory}
              searchQuery={searchQuery}
            />
          ))}

          {/* 2. 해당 노드에 소속된 성분 목록 렌더링 */}
          {node.ingredients.length > 0 && (
            <div className="ml-3 md:ml-6 mt-2 space-y-1">
              <div className="text-[11px] font-bold text-slate-600 px-2 py-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-[#246BEB]" />
                <span>소속 성분 목록 ({node.ingredients.length}개)</span>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {node.ingredients.map((ing) => (
                  <TreeIngredientRow
                    key={ing.key}
                    ing={ing}
                    editingKey={editingKey}
                    editCategoryVal={editCategoryVal}
                    customInputMode={customInputMode}
                    uniqueCategories={uniqueCategories}
                    setEditingKey={setEditingKey}
                    setEditCategoryVal={setEditCategoryVal}
                    setCustomInputMode={setCustomInputMode}
                    onSaveCategory={onSaveCategory}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 성분 상세 행 컴포넌트
 */
interface TreeIngredientRowProps {
  ing: KpicTreeIngredient;
  editingKey: string | null;
  editCategoryVal: string;
  customInputMode: boolean;
  uniqueCategories: string[];
  setEditingKey: (key: string | null) => void;
  setEditCategoryVal: (val: string) => void;
  setCustomInputMode: (val: boolean) => void;
  onSaveCategory: (key: string, newCat: string) => void;
}

const TreeIngredientRow: React.FC<TreeIngredientRowProps> = ({
  ing,
  editingKey,
  editCategoryVal,
  customInputMode,
  uniqueCategories,
  setEditingKey,
  setEditCategoryVal,
  setCustomInputMode,
  onSaveCategory
}) => {
  const isEditing = editingKey === ing.key;

  return (
    <div className="py-2.5 px-3 md:px-4 hover:bg-blue-50/40 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs group border-b border-slate-100 last:border-b-0">
      {/* 1. 성분명 영역 */}
      <div className="min-w-[220px] flex-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#246BEB] shrink-0" />
          <span className="font-bold text-slate-900 text-xs md:text-sm">{ing.englishInn}</span>
          {ing.koreanName && ing.koreanName !== ing.englishInn && (
            <span className="text-slate-700 font-semibold text-xs">({ing.koreanName})</span>
          )}
        </div>
        {ing.chemicalFormName && (
          <div className="text-[11px] text-slate-500 pl-4 truncate max-w-md mt-0.5">
            {ing.chemicalFormName}
          </div>
        )}
      </div>

      {/* 2. 현재 약효 분류 배지 */}
      <div className="shrink-0">
        <span
          className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md border ${getCategoryColor(
            ing.functionalCategory
          )}`}
        >
          {ing.functionalCategory}
        </span>
      </div>

      {/* 3. 분류 수정 컨트롤 */}
      <div className="shrink-0">
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
              onClick={() => onSaveCategory(ing.key, editCategoryVal)}
              className="p-1 bg-sky-600 hover:bg-sky-700 text-white rounded transition-colors cursor-pointer"
              title="저장"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setEditingKey(null);
                setCustomInputMode(false);
              }}
              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors cursor-pointer"
              title="취소"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingKey(ing.key);
              setEditCategoryVal(ing.functionalCategory);
              setCustomInputMode(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-sky-800 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-600" />
            <span>수정</span>
          </button>
        )}
      </div>

      {/* 4. 포함된 등록 제품 배지들 */}
      <div className="shrink-0 min-w-[140px] flex justify-end">
        {ing.productCount > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {ing.productNames.map((prodName, pIdx) => (
              <span
                key={pIdx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold shadow-2xs"
              >
                <Package className="w-3 h-3 text-emerald-600" />
                <span>{prodName}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 font-normal italic">미등록 (사전)</span>
        )}
      </div>
    </div>
  );
};
