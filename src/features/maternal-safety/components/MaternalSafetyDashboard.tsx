import React, { useState, useMemo } from 'react';
import {
  Baby,
  CheckCircle2,
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
    [activeIngredientId]
  );

  const activeMapping = selectedResult.mappedIngredients.find(
    (m) => m.ingredientId === activeIngredientId
  ) || selectedResult.mappedIngredients[0];

  const core5List = Object.values(PREGNANCY_SAFETY_DB);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] select-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* 1. 상단: 대시보드 타이틀 & 통합 검색창 & 최근 검색 기록 */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold">
                  약국용 전문 의사결정 지원 시스템
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  AI 임의 판단 배제 · 원문 근거 100% 연동
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1.5">
                약국용 임신·수유부 약물 안전성 대시보드
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                국내 의약품 제품명(단일·복합제), 한글 성분명, 영문 성분명(INN)으로 검색하여 임신 주수 및 수유 연령별 검증 근거를 확인합니다.
              </p>
            </div>

            {/* 5대 핵심 MVP 성분 즉시 선택 칩 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 mr-1">
                5대 핵심 검증 성분:
              </span>
              {core5List.map((ing) => {
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
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
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
                  placeholder="국내 제품명(타이레놀, 부루펜, 지르텍, 페니라민, 판콜에스 등), 한글 성분명 또는 영문 INN(Acetaminophen, Ibuprofen 등) 입력..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
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
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
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
                    {liveMfdsResults.length > 0 ? ` + 식약처 실시간 연동 (${liveMfdsResults.length}건)` : ''}
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
                    <span className="text-[11px] font-bold text-sky-700 shrink-0">선택 →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 최근 검색 기록 & 대표 제품 빠른 선택 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <Clock className="w-3 h-3" /> 최근 검색 / 다빈도 제품:
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
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {/* 2. 현재 선택된 제품/성분 요약 바 & 복합제 구성성분 스위처 */}
        <section className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-extrabold">
                {selectedResult.resultType === 'INGREDIENT_DIRECT'
                  ? '성분 단위 직접 조회'
                  : selectedResult.isCombination
                  ? `국내 허가 복합제 (${selectedResult.mappedIngredients.length}개 성분 개별 분리)`
                  : '국내 허가 단일제'}
              </span>
              <h3 className="text-base font-extrabold text-white">{selectedResult.displayName}</h3>
              {selectedResult.drugMaster && (
                <a
                  href={selectedResult.drugMaster.productSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:underline"
                >
                  <span>의약품안전나라 허가원문 ({selectedResult.drugMaster.itemSeq})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="text-xs text-slate-300">{selectedResult.subLabel}</p>
          </div>

          {/* 복합제이거나 다중 성분이 매핑된 경우 성분 전환 버튼 표시 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">구성 성분별 선택:</span>
            {selectedResult.mappedIngredients.map((m) => {
              const isSelected = activeIngredientId === m.ingredientId && m.koreanIngredientName === activeMapping?.koreanIngredientName;
              const pRec = PREGNANCY_SAFETY_DB[m.ingredientId];
              const dotClass = pRec
                ? SAFETY_LEVEL_META[pRec.trimester3Level].dotClass
                : SAFETY_LEVEL_META.LEVEL_5_INSUFFICIENT.dotClass;
              return (
                <button
                  key={m.mappingId}
                  onClick={() => setActiveIngredientId(m.ingredientId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
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

        {/* 3. 중앙: 4대 핵심 기능 탭 네비게이션 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(
            [
              {
                id: 'PREGNANCY',
                label: '임신부 약물 검색',
                sub: `현재 임신 ${selectedGestationalWeek}주 기준 태아 안전성`,
                icon: HeartPulse,
                activeColor: 'border-rose-500 bg-rose-50/90 text-rose-950'
              },
              {
                id: 'LACTATION',
                label: '수유부 약물 검색',
                sub: `${
                  selectedInfantAge === 'NEONATE'
                    ? '신생아'
                    : selectedInfantAge === 'INFANT_1_6M'
                    ? '생후 1~6개월'
                    : '생후 6개월 이상'
                }${isPretermInfant ? '·미숙아' : ''} 모유이행·RID`,
                icon: Baby,
                activeColor: 'border-sky-500 bg-sky-50/90 text-sky-950'
              },
              {
                id: 'COMBINATION',
                label: '복합제 개별 성분 분석',
                sub: `포함 성분(${selectedResult.mappedIngredients.length}종) 전수 평가`,
                icon: Layers,
                activeColor: 'border-indigo-500 bg-indigo-50/90 text-indigo-950'
              },
              {
                id: 'COMPARE',
                label: '약물 및 대체약 비교',
                sub: '핵심 성분 간 임신·수유 다차원 비교',
                icon: Scale,
                activeColor: 'border-emerald-500 bg-emerald-50/90 text-emerald-950'
              }
            ] as {
              id: MaternalActiveTab;
              label: string;
              sub: string;
              icon: React.FC<{ className?: string }>;
              activeColor: string;
            }[]
          ).map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isActive
                    ? `${t.activeColor} shadow-xs`
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.label}</span>
                </div>
                <div className="text-[11px] opacity-80 font-semibold mt-1">{t.sub}</div>
              </button>
            );
          })}
        </div>

        {/* 4. 선택된 메인 탭 컨텐츠 렌더링 */}
        <section>
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
        </section>

        {/* 5. 원문 근거 및 출처 상세 패널 (Evidence Sources) */}
        <EvidenceSourcesPanel sources={sources} englishInn={pregnancy?.englishInn} />

        {/* 6. 하단: 데이터 출처 · 최근 업데이트 · 검증 상태 푸터 */}
        <footer className="bg-white rounded-2xl border border-slate-200/90 p-4 text-xs text-slate-600 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-sky-600" />
              연동 데이터 출처:
            </span>
            <a
              href="https://nedrug.mfds.go.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              식약처 의약품안전나라
            </a>
            <a
              href="https://www.hira.or.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              심평원 DUR
            </a>
            <a
              href="https://www.health.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              약학정보원(KPIC)
            </a>
            <a
              href="https://www.ncbi.nlm.nih.gov/books/NBK501922/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              NIH LactMed
            </a>
            <a
              href="https://mothertobaby.org/fact-sheets/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              MotherToBaby
            </a>
            <a
              href="https://www.medicinesinpregnancy.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              BUMPS / UKTIS
            </a>
            <a
              href="https://www.fda.gov/drugs/labeling/pregnancy-and-lactation-labeling-resources"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
            >
              FDA PLLR
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 shrink-0">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> 5대 핵심 성분 원문 검증 완료
            </span>
            <span>최근 업데이트: 2026-11-04</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
