import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Baby,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  HeartPulse,
  Layers,
  Pill,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import {
  MaternalActiveTab,
  useMaternalStore
} from '../stores/useMaternalStore';
import {
  getVerifiedIngredientBundle,
  searchLiveMfdsForMaternalSafety,
  searchLocalMaternalDatabase
} from '../services/maternalSearchService';
import {
  PREGNANCY_SAFETY_DB,
  SAFETY_LEVEL_META
} from '../data/verifiedMaternalDb';
import { QuickConsultationSummaryView } from './QuickConsultationSummaryView';
import { PregnancySafetyView } from './PregnancySafetyView';
import { LactationSafetyView } from './LactationSafetyView';
import {
  AlternativeDrugCompareView,
  CombinationDrugView
} from './CombinationAndCompareView';
import { EvidenceSourcesPanel } from './EvidenceSourcesPanel';
import { MaternalSearchResult } from '../types/maternalSafety';

export const MaternalSafetyDashboard: React.FC = () => {
  const {
    activeTab,
    searchQuery,
    recentSearches,
    selectedResult,
    activeIngredientId,
    selectedGestationalWeek,
    selectedInfantAge,
    isPretermInfant,
    setActiveTab,
    setSearchQuery,
    selectSearchResult,
    setActiveIngredientId
  } = useMaternalStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [liveMfdsResults, setLiveMfdsResults] = useState<MaternalSearchResult[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // 로컬(5대 성분 + 내장 국내 대표 품목) 자동완성 결과
  const localMatches = useMemo(
    () => searchLocalMaternalDatabase(searchQuery),
    [searchQuery]
  );

  // 식약처 실시간 API 확장 검색 핸들러
  const handleTriggerLiveSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearchingLive(true);
    setIsDropdownOpen(true);
    try {
      const live = await searchLiveMfdsForMaternalSafety(q);
      setLiveMfdsResults(live);
      if (live.length > 0 && localMatches.length === 0) {
        selectSearchResult(live[0]);
        setIsDropdownOpen(false);
      }
    } finally {
      setIsSearchingLive(false);
    }
  };

  const handleSelectResult = (res: MaternalSearchResult) => {
    selectSearchResult(res);
    setIsDropdownOpen(false);
  };

  // 현재 선택된 성분의 검증 데이터 번들 조회
  const { pregnancy, lactation, sources } = useMemo(
    () => getVerifiedIngredientBundle(activeIngredientId),
    [activeIngredientId, selectedResult]
  );

  const activeMapping =
    selectedResult.mappedIngredients.find((m) => m.ingredientId === activeIngredientId) ||
    selectedResult.mappedIngredients[0];

  const featuredChipIds = [
    'ing_acetaminophen',
    'ing_ibuprofen',
    'ing_atorvastatin',
    'ing_cetirizine',
    'ing_chlorpheniramine',
    'ing_amoxicillin',
    'ing_omeprazole',
    'ing_famotidine'
  ];
  const coreChipList = featuredChipIds
    .map((id) => PREGNANCY_SAFETY_DB[id])
    .filter(Boolean);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] select-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* 1. 상단: 통합 검색창 & 5대 핵심 성분 원클릭 칩 */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                임신·수유부 약물 안전성 빠른 조회
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                AI 임의 판단 배제 · 국내/국외 원문 기반
              </span>
            </div>

            {/* 주요 검증 성분 즉시 선택 칩 (염기 제외 순수 성분 기준) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 mr-0.5">
                주요 성분(염기 제외):
              </span>
              {coreChipList.map((ing) => {
                const isSelected =
                  activeIngredientId === ing.ingredientId &&
                  selectedResult.resultType === 'INGREDIENT_DIRECT';
                return (
                  <button
                    key={ing.ingredientId}
                    onClick={() => {
                      const found = searchLocalMaternalDatabase(ing.englishInn)[0];
                      if (found) handleSelectResult(found);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {ing.koreanIngrName} ({ing.englishInn})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 통합 검색창 */}
          <div className="relative">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (localMatches.length > 0) {
                        handleSelectResult(localMatches[0]);
                      } else {
                        handleTriggerLiveSearch();
                      }
                    }
                  }}
                  placeholder="국내 제품명(타이레놀, 부루펜, 지르텍, 페니라민, 판콜에스 등), 한글 성분명 또는 영문 INN 입력..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setLiveMfdsResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleTriggerLiveSearch}
                disabled={isSearchingLive}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSearchingLive ? '식약처 DB 조회 중...' : '식약처 국내 제품 통합검색'}</span>
              </button>
            </div>

            {/* 자동완성 & 검색 결과 드롭다운 */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-300 shadow-xl z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>
                    검증 DB 일치 결과 ({localMatches.length}건)
                    {liveMfdsResults.length > 0
                      ? ` + 식약처 실시간 연동 (${liveMfdsResults.length}건)`
                      : ''}
                  </span>
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    닫기 ✕
                  </button>
                </div>

                {[...localMatches, ...liveMfdsResults].map((res) => (
                  <button
                    key={res.id}
                    onClick={() => handleSelectResult(res)}
                    className="w-full px-4 py-2.5 text-left hover:bg-sky-50/70 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            res.resultType === 'INGREDIENT_DIRECT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.isCombination
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {res.resultType === 'INGREDIENT_DIRECT'
                            ? '핵심 성분'
                            : res.isCombination
                            ? `복합제 (${res.mappedIngredients.length}성분)`
                            : '국내 단일제'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {res.displayName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{res.subLabel}</div>
                    </div>
                    <span className="text-[11px] font-bold text-sky-700 shrink-0">
                      요약 보기 →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 최근 검색 기록 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <Clock className="w-3 h-3" /> 최근/다빈도:
            </span>
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  const found = searchLocalMaternalDatabase(term);
                  if (found.length > 0) {
                    handleSelectResult(found[0]);
                  }
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {/* 2. 현재 선택된 제품이 복합제이거나 국내 제품일 때 구성 성분 선택 바 */}
        {(selectedResult.resultType === 'DOMESTIC_PRODUCT' ||
          selectedResult.mappedIngredients.length > 1) && (
          <section className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-extrabold">
                {selectedResult.isCombination
                  ? `복합제 (${selectedResult.mappedIngredients.length}성분)`
                  : '국내 허가 의약품'}
              </span>
              <span className="text-sm font-extrabold text-white">
                {selectedResult.displayName}
              </span>
              {selectedResult.drugMaster && (
                <a
                  href={selectedResult.drugMaster.productSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:underline"
                >
                  <span>식약처 원문 ({selectedResult.drugMaster.itemSeq})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">구성 성분 선택:</span>
              {selectedResult.mappedIngredients.map((m) => {
                const isSelected =
                  activeIngredientId === m.ingredientId &&
                  m.koreanIngredientName === activeMapping?.koreanIngredientName;
                const pRec = PREGNANCY_SAFETY_DB[m.ingredientId];
                const dotClass = pRec
                  ? SAFETY_LEVEL_META[pRec.trimester3Level].dotClass
                  : SAFETY_LEVEL_META.LEVEL_5_INSUFFICIENT.dotClass;
                return (
                  <button
                    key={m.mappingId}
                    onClick={() => setActiveIngredientId(m.ingredientId)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-slate-900 border-white shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                    <span>
                      {m.koreanIngredientName} ({m.amountText})
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. 상세 페이지 열람 중일 때 상단 네비게이션 바 (요약 페이지로 즉시 복귀 + 상세 탭 전환) */}
        {activeTab !== 'SUMMARY' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setActiveTab('SUMMARY')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>복약지도 요약 페이지(국내/국외 요약표)로 돌아가기</span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'SUMMARY', label: '요약표 (국내/국외)', icon: ClipboardList },
                  {
                    id: 'PREGNANCY',
                    label: `임신부 상세 (${selectedGestationalWeek}주)`,
                    icon: HeartPulse
                  },
                  {
                    id: 'LACTATION',
                    label: `수유부 상세 · RID 계산기 (${
                      selectedInfantAge === 'NEONATE'
                        ? '신생아'
                        : selectedInfantAge === 'INFANT_1_6M'
                        ? '1~6개월'
                        : '6개월+'
                    }${isPretermInfant ? '·미숙아' : ''})`,
                    icon: Baby
                  },
                  {
                    id: 'COMBINATION',
                    label: `복합제 분석 (${selectedResult.mappedIngredients.length})`,
                    icon: Layers
                  },
                  { id: 'COMPARE', label: '타 성분 비교', icon: Scale },
                  { id: 'SOURCES', label: `원문 출처 (${sources.length})`, icon: BookOpen }
                ] as {
                  id: MaternalActiveTab;
                  label: string;
                  icon: React.FC<{ className?: string }>;
                }[]
              ).map((tab) => {
                const Icon = tab.icon;
                const isCurr = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      isCurr
                        ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. 메인 컨텐츠 영역: 기본은 '요약 페이지(SUMMARY)', 버튼 클릭 시에만 해당 상세 페이지 표시 */}
        <section>
          {activeTab === 'SUMMARY' && (
            <QuickConsultationSummaryView
              pregnancy={pregnancy}
              lactation={lactation}
              drugMaster={selectedResult.drugMaster}
              unverifiedIngredientName={activeMapping?.koreanIngredientName}
              sourcesCount={sources.length}
            />
          )}

          {activeTab === 'PREGNANCY' && (
            <PregnancySafetyView
              pregnancy={pregnancy}
              drugMaster={selectedResult.drugMaster}
              unverifiedIngredientName={activeMapping?.koreanIngredientName}
            />
          )}

          {activeTab === 'LACTATION' && (
            <LactationSafetyView
              lactation={lactation}
              drugMaster={selectedResult.drugMaster}
              unverifiedIngredientName={activeMapping?.koreanIngredientName}
            />
          )}

          {activeTab === 'COMBINATION' && <CombinationDrugView />}

          {activeTab === 'COMPARE' && <AlternativeDrugCompareView />}

          {activeTab === 'SOURCES' && (
            <EvidenceSourcesPanel sources={sources} englishInn={pregnancy?.englishInn} />
          )}
        </section>

        {/* 5. 하단: 간결한 데이터 출처 및 검증 상태 바 */}
        <footer className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 text-xs text-slate-600 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-sky-600" />
              연동 출처:
            </span>
            <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              국내: 식약처 의약품안전나라 · 심평원 DUR · 약학정보원
            </span>
            <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              국외: NIH LactMed · MotherToBaby · BUMPS(UKTIS) · FDA PLLR
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 shrink-0">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> 5대 핵심 성분 원문 검증 완료 (2026-11-04)
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
