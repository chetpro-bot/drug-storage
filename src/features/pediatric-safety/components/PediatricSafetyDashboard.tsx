import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  X,
  CheckCircle2,
  FileText,
  Baby,
  BookOpen,
  Globe,
  Building2,
  Pill,
  Sparkles
} from 'lucide-react';
import { usePediatricStore, PediatricDashboardTab } from '../stores/usePediatricStore';

export const PediatricSafetyDashboard: React.FC = () => {
  const {
    searchQuery,
    isSearching,
    searchCandidates,
    detectedIngredientNotice,
    searchApiError,
    selectedCandidate,
    currentReport,
    isLoadingReport,
    activeTab,
    setActiveTab,
    executeSearch,
    selectCandidateAndLoadReport,
    resetSelection
  } = usePediatricStore();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [showFullDocModal, setShowFullDocModal] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mfdsUd: true,
    mfdsNb: true,
    openFdaPediatric: true,
    openFdaDosage: true,
    whoDose: true
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      executeSearch(inputVal.trim());
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setInputVal(tag);
    executeSearch(tag);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* 상단 검색 바 */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shrink-0 shadow-2xs">
        <div className="max-w-6xl mx-auto space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="제품명 또는 성분명을 입력하세요 (예: 부루펜, 맥시부펜, 오구멘틴, Amoxicillin, Ibuprofen, Cetirizine, Azithromycin)"
                className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all placeholder:text-slate-400 font-medium"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => {
                    setInputVal('');
                    executeSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>검색</span>
            </button>
          </form>

          {/* 빠른 태그 추천 & 알림 */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 overflow-x-auto py-0.5">
              <span className="font-semibold text-slate-600 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                빈용 소아 처방약:
              </span>
              {[
                '어린이부루펜시럽',
                '맥시부펜시럽',
                '어린이타이레놀현탁액',
                '오구멘틴건조시럽',
                '지르텍',
                '지스로맥스',
                'Amoxicillin',
                'Ibuprofen',
                'Cetirizine',
                'Azithromycin'
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-md border border-slate-200/80 transition-colors text-[11px] cursor-pointer whitespace-nowrap"
                >
                  {tag}
                </button>
              ))}
            </div>

            {detectedIngredientNotice && (
              <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 text-[11px] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {detectedIngredientNotice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역: 2단 레이아웃 (좌측 검색결과 목록 / 우측 상세 리포트) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 패널: 검색 결과 목록 (데스크톱 320px 고정) */}
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Baby className="w-3.5 h-3.5 text-emerald-600" />
              <span>검색 결과</span>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-extrabold">
                {searchCandidates.length}
              </span>
            </div>
            {selectedCandidate && (
              <button
                onClick={resetSelection}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                선택 해제
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {searchApiError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                {searchApiError}
              </div>
            )}

            {searchCandidates.length === 0 && !isSearching && (
              <div className="py-12 text-center text-slate-400 text-xs">
                검색된 의약품이 없습니다.
              </div>
            )}

            {searchCandidates.map((candidate) => {
              const isSelected = selectedCandidate?.itemSeq === candidate.itemSeq;
              return (
                <div
                  key={candidate.itemSeq}
                  onClick={() => selectCandidateAndLoadReport(candidate)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                      {candidate.productName}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                        candidate.etcOtcName === '전문의약품'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {candidate.etcOtcName}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{candidate.manufacturer}</span>
                    <span className="text-slate-300">·</span>
                    <span className="shrink-0 font-medium text-slate-600">{candidate.dosageForm}</span>
                  </div>

                  <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2 font-mono">
                    {candidate.mainIngredientsText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 패널: 상세 대시보드 리포트 */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]">
          {isLoadingReport ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-slate-700">
                국내 허가사항, DUR, openFDA, WHO 소아 약물집 정보를 통합 분석하는 중입니다...
              </p>
            </div>
          ) : !currentReport ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                <Baby className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">소아 약물정보 대시보드</h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                좌측 목록에서 의약품을 선택하거나 상단에 제품명·성분명을 검색하면
                식약처 소아 허가사항, DUR 연령금기, 미국 FDA 라벨, WHO 소아 공식 용량집을 한눈에 대조할 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                <span className="text-[11px] bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600">
                  국내 허가 소아 용법·용량
                </span>
                <span className="text-[11px] bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600">
                  DUR 연령금기 & 용량주의
                </span>
                <span className="text-[11px] bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600">
                  openFDA Pediatric Use
                </span>
                <span className="text-[11px] bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600 font-bold text-emerald-700">
                  WHO Model Formulary for Children 2010
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-6xl w-full mx-auto space-y-5">
              {/* 1. 제품 개요 헤더 카드 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          currentReport.candidate.etcOtcName === '전문의약품'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {currentReport.candidate.etcOtcName}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {currentReport.candidate.dosageForm}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {currentReport.candidate.route}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        식약처 표준코드: {currentReport.candidate.itemSeq}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {currentReport.candidate.productName}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      제조/수입사: {currentReport.candidate.manufacturer}
                    </p>
                  </div>

                  {/* 외부 바로가기 링크들 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${currentReport.candidate.itemSeq}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <span>식약처 상세</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                    <a
                      href={currentReport.rchMelbourne.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl border border-sky-200 text-xs font-bold flex items-center gap-1 transition-all"
                      title={currentReport.rchMelbourne.title}
                    >
                      <Globe className="w-3 h-3 text-sky-600" />
                      <span>RCH Melbourne</span>
                      <ExternalLink className="w-3 h-3 text-sky-400" />
                    </a>
                  </div>
                </div>

                {/* 성분 목록 칩 */}
                <div className="pt-3">
                  <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    <span>유효성분 구성 ({currentReport.candidate.isCombination ? '복합제' : '단일제'})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentReport.candidate.ingredients.length > 0 ? (
                      currentReport.candidate.ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/90 text-xs flex items-baseline gap-1.5"
                        >
                          <span className="font-bold text-emerald-950">{ing.koreanName}</span>
                          {ing.matchedInn && (
                            <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                              ({ing.matchedInn})
                            </span>
                          )}
                          {ing.amount && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-white/80 px-1.5 py-0.2 rounded border border-emerald-100">
                              {ing.amount} {ing.unit || ''}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-600 font-mono">
                        {currentReport.candidate.mainIngredientsText}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. 네비게이션 탭 (ALL / 식약처 / DUR / openFDA / WHO) */}
              <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-2xs">
                {(
                  [
                    { id: 'ALL', label: '전체 정보 보기' },
                    { id: 'MFDS', label: '1. 식약처 허가사항' },
                    { id: 'DUR', label: '2. 식약처 DUR' },
                    { id: 'OPENFDA', label: '3. 미국 openFDA / DailyMed' },
                    { id: 'WHO', label: '4. WHO Model Formulary (2010)' }
                  ] as Array<{ id: PediatricDashboardTab; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 3. 정보 영역 1: 국내 식약처 허가사항 */}
              {(activeTab === 'ALL' || activeTab === 'MFDS') && (
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        식약처 허가사항 (소아 용법·용량 및 주의사항)
                      </h3>
                      <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        국내 허가정보
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFullDocModal('UD')}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>전체 허가원문 보기</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* 핵심 파라미터 요약 그리드 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          적용 연령 (Age Range)
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {currentReport.mfdsLabel.pediatricAgeRange || '원문 확인 필요'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          체중별 투여량 (mg/kg)
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {currentReport.mfdsLabel.weightBasedDose || '원문 확인 필요'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          투여 횟수 및 간격
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {currentReport.mfdsLabel.frequencyAndInterval || '원문 확인 필요'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          1일 최대 용량
                        </span>
                        <span className="text-xs font-extrabold text-emerald-700">
                          {currentReport.mfdsLabel.maxDailyDose || '원문 확인 필요'}
                        </span>
                      </div>
                    </div>

                    {/* 소아 용법·용량 발췌 전문 */}
                    <div>
                      <div
                        onClick={() => toggleSection('mfdsUd')}
                        className="flex items-center justify-between text-xs font-extrabold text-slate-800 mb-2 cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          소아 용법·용량 발췌 문맥
                        </span>
                        {expandedSections.mfdsUd ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      {expandedSections.mfdsUd && (
                        <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                          {currentReport.mfdsLabel.pediatricDosageSummary ||
                            '식약처 허가사항 원문에 명시된 별도의 소아 전용 용법 문장이 확인되지 않았습니다. 전체 허가원문 탭을 확인해 주십시오.'}
                        </div>
                      )}
                    </div>

                    {/* 소아 사용 시 주의사항 및 금기 */}
                    <div>
                      <div
                        onClick={() => toggleSection('mfdsNb')}
                        className="flex items-center justify-between text-xs font-extrabold text-slate-800 mb-2 cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          소아 사용상의 주의사항 및 금기 발췌
                        </span>
                        {expandedSections.mfdsNb ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      {expandedSections.mfdsNb && (
                        <div className="space-y-2">
                          {currentReport.mfdsLabel.pediatricContraindications && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed whitespace-pre-line font-medium">
                              <span className="font-bold text-rose-950 block mb-1">
                                [소아 투여 금기 조항]
                              </span>
                              {currentReport.mfdsLabel.pediatricContraindications}
                            </div>
                          )}
                          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                            {currentReport.mfdsLabel.pediatricPrecautions ||
                              '식약처 사용상의 주의사항에 별도의 소아 관련 주의 조항이 명시되어 있지 않습니다.'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. 정보 영역 2: 식약처 DUR (특정연령대금기, 용량주의, 투여기간주의) */}
              {(activeTab === 'ALL' || activeTab === 'DUR') && (
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        식약처 DUR (연령금기·용량주의·투여기간주의)
                      </h3>
                      <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        국내 공식 DUR
                      </span>
                    </div>

                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        currentReport.durInfo.hasAgeTaboo
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : currentReport.durInfo.hasCapacityNotice
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {currentReport.durInfo.hasAgeTaboo
                        ? '연령금기 경고'
                        : currentReport.durInfo.hasCapacityNotice
                        ? '용량주의 대상'
                        : '연령금기 없음'}
                    </span>
                  </div>

                  <div className="p-5">
                    {currentReport.durInfo.entries.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-800 mb-0.5">
                            {currentReport.durInfo.noticeMessage}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            ※ 조회 결과가 없다는 사실을 소아 투여의 절대적 안전성이 확인되었다는 의미로 해석하지 마십시오.
                            반드시 식약처 허가사항 및 임상지침을 종합적으로 확인하십시오.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentReport.durInfo.entries.map((entry, eIdx) => (
                          <div
                            key={eIdx}
                            className={`p-4 rounded-xl border ${
                              entry.typeName.includes('특정연령대금기')
                                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                : 'bg-amber-50/80 border-amber-200 text-amber-950'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-white border shadow-2xs">
                                DUR 항목: {entry.typeName}
                              </span>
                              {entry.officialBasis && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  근거: {entry.officialBasis}
                                </span>
                              )}
                            </div>

                            {entry.tabooAge && (
                              <div className="text-sm font-extrabold text-rose-700 mb-1">
                                🚫 {entry.tabooAge}
                              </div>
                            )}

                            {entry.tabooReason && (
                              <div className="text-xs leading-relaxed font-medium">
                                <span className="font-bold">사유/내용:</span> {entry.tabooReason}
                              </div>
                            )}

                            {entry.exceptionCondition && (
                              <div className="text-xs text-slate-700 mt-1">
                                <span className="font-bold">예외 조건:</span> {entry.exceptionCondition}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. 정보 영역 3: 미국 허가정보 (openFDA) & DailyMed 원문 링크 */}
              {(activeTab === 'ALL' || activeTab === 'OPENFDA') && (
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        미국 허가정보 (openFDA & DailyMed)
                      </h3>
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                        동일 성분 해외 참고자료
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      U.S. FDA Official SPL Drug Label
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {currentReport.openFdaList.map((item, idx) => (
                      <div key={idx} className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                          <div>
                            <span className="text-[11px] text-blue-700 font-bold block">
                              미국 제품 / 성분: {item.fda.brandName || item.ingredientInn} ({item.ingredientInn})
                            </span>
                            <span className="text-xs text-slate-600 font-medium">
                              제형: {item.fda.dosageForm || '미상'} · 경로: {item.fda.route || '경구'}
                            </span>
                          </div>

                          <a
                            href={item.dailyMed.dailyMedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all self-start sm:self-auto"
                          >
                            <span>DailyMed 원문 SPL 열기</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* openFDA 세부 섹션 */}
                        <div className="space-y-3">
                          {/* Pediatric Use */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div
                              onClick={() => toggleSection('openFdaPediatric')}
                              className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-extrabold text-slate-800 cursor-pointer"
                            >
                              <span>8.4 Pediatric Use (소아 사용 관련 미국 허가사항)</span>
                              {expandedSections.openFdaPediatric ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            {expandedSections.openFdaPediatric && (
                              <div className="p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-mono bg-white">
                                {item.fda.pediatricUse || '미국 허가사항 내 Pediatric Use 섹션 없음'}
                              </div>
                            )}
                          </div>

                          {/* Dosage & Administration */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div
                              onClick={() => toggleSection('openFdaDosage')}
                              className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-extrabold text-slate-800 cursor-pointer"
                            >
                              <span>Dosage and Administration (미국 소아 용법·용량)</span>
                              {expandedSections.openFdaDosage ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            {expandedSections.openFdaDosage && (
                              <div className="p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-mono bg-white">
                                {item.fda.dosageAndAdministration || '미국 허가사항 내 용법·용량 정보 없음'}
                              </div>
                            )}
                          </div>

                          {/* Warnings / Contraindications */}
                          {item.fda.contraindications && (
                            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-950 leading-relaxed whitespace-pre-line">
                              <span className="font-bold block mb-1">
                                [Contraindications (금기사항)]
                              </span>
                              {item.fda.contraindications}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. 정보 영역 4: WHO Model Formulary for Children 2010 (필수 구현 영역) */}
              {(activeTab === 'ALL' || activeTab === 'WHO') && (
                <div className="bg-white rounded-2xl border-2 border-emerald-400 overflow-hidden shadow-xs">
                  <div className="px-5 py-4 bg-emerald-50/90 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        4
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-emerald-950">
                            WHO Model Formulary for Children 2010
                          </h3>
                          <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            세계보건기구 공식 소아 약물집
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          성분별 소아 적응증, 연령·체중별 용량, 투여 간격, 최대 용량, 금기 및 주의사항
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://iris.who.int/bitstream/handle/10665/44309/9789241599320_eng.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span>WHO 공식 PDF 원문</span>
                      <ExternalLink className="w-3 h-3 text-emerald-500" />
                    </a>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* 최신성 필수 고지 문구 */}
                    <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900">자료 최신성 안내</p>
                        <p className="text-[11px] leading-relaxed">
                          {currentReport.whoList[0]?.who.disclaimer ||
                            'WHO Model Formulary for Children (2010) — 과거 발행된 참고자료로, 최신 임상지침 및 국내 허가사항과 차이가 있을 수 있습니다.'}
                        </p>
                      </div>
                    </div>

                    {/* WHO 검색 결과 상태별 렌더링 */}
                    {currentReport.whoList.map((entry, idx) => {
                      const { who, ingredientInn } = entry;

                      if (who.status === 'NOT_FOUND') {
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1"
                          >
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-slate-400" />
                              <span>성분: {ingredientInn} (상태 B: WHO 자료 미수록)</span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              {who.message ||
                                'WHO Model Formulary for Children 2010에서 해당 성분을 찾지 못했습니다.'}
                            </p>
                          </div>
                        );
                      }

                      if (who.status === 'CHECK_UNAVAILABLE') {
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1"
                          >
                            <div className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span>성분: {ingredientInn} (상태 C: WHO 자료 확인 불가)</span>
                            </div>
                            <p className="text-[11px]">{who.message || 'WHO 자료를 확인할 수 없습니다.'}</p>
                          </div>
                        );
                      }

                      // 상태 A: CONFIRMED
                      return (
                        <div key={idx} className="space-y-4">
                          {who.items.map((item, mIdx) => (
                            <div
                              key={mIdx}
                              className="border border-emerald-200 rounded-2xl bg-white p-5 space-y-3.5 shadow-2xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-black text-emerald-950">
                                      {item.drugName}
                                    </h4>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                                      ATC: {item.atcCode}
                                    </span>
                                  </div>
                                  {item.synonyms.length > 0 && (
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                      동의어 (Synonyms): {item.synonyms.join(', ')}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    WHO p.{item.sourcePage}
                                  </span>
                                  <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                  >
                                    <span>해당 페이지 PDF 열기</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>

                              {/* 제형 및 특별사항 */}
                              {(item.dosageForms || item.specialNotes) && (
                                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                                  {item.dosageForms && (
                                    <div className="text-slate-700">
                                      <span className="font-bold text-slate-900">수록 제형:</span>{' '}
                                      {item.dosageForms}
                                    </div>
                                  )}
                                  {item.specialNotes && (
                                    <div className="text-emerald-900 font-medium">
                                      <span className="font-bold text-emerald-950">Special Notes:</span>{' '}
                                      {item.specialNotes}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ① 적응증 (Indications) */}
                              {item.indications && (
                                <div>
                                  <span className="text-xs font-extrabold text-slate-900 block mb-1">
                                    ① WHO 제시 소아 적응증 (Indications)
                                  </span>
                                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                                    {item.indications}
                                  </div>
                                </div>
                              )}

                              {/* ② 소아 용량 (Dose) */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                                    <Baby className="w-3.5 h-3.5 text-emerald-700" />
                                    ② 소아 용법·용량 (WHO Dose)
                                  </span>
                                  {item.maxDose && (
                                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                      {item.maxDose}
                                    </span>
                                  )}
                                </div>
                                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-300 text-xs text-emerald-950 leading-relaxed whitespace-pre-line font-medium font-sans">
                                  {item.dose}
                                </div>
                              </div>

                              {/* ③ 금기 및 주의사항 (Contraindications & Precautions) */}
                              {(item.contraindications || item.precautions) && (
                                <div className="space-y-2">
                                  <span className="text-xs font-extrabold text-slate-900 block">
                                    ③ WHO 금기 및 주의사항
                                  </span>
                                  {item.contraindications && (
                                    <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-950 leading-relaxed">
                                      <span className="font-bold text-rose-950 block mb-0.5">
                                        Contraindications:
                                      </span>
                                      {item.contraindications}
                                    </div>
                                  )}
                                  {item.precautions && (
                                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
                                      <span className="font-bold text-amber-950 block mb-0.5">
                                        Precautions:
                                      </span>
                                      {item.precautions}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 신기능/간기능 장애 주의 */}
                              {(item.renalImpairment || item.hepaticImpairment) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  {item.renalImpairment && (
                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                                      <span className="font-bold text-slate-900 block mb-0.5">
                                        Renal Impairment:
                                      </span>
                                      {item.renalImpairment}
                                    </div>
                                  )}
                                  {item.hepaticImpairment && (
                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                                      <span className="font-bold text-slate-900 block mb-0.5">
                                        Hepatic Impairment:
                                      </span>
                                      {item.hepaticImpairment}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 전체 허가사항 원문 확인 모달 */}
      {showFullDocModal && currentReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  식약처 허가사항 원문 전체보기
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {currentReport.candidate.productName} ({currentReport.candidate.itemSeq})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullDocModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800 leading-relaxed font-sans">
              <div>
                <h4 className="text-sm font-extrabold text-emerald-800 border-b pb-1 mb-2">
                  [효능·효과]
                </h4>
                <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {currentReport.mfdsLabel.fullDocTexts.eeDoc || '효능효과 원문이 없습니다.'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-emerald-800 border-b pb-1 mb-2">
                  [용법·용량]
                </h4>
                <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {currentReport.mfdsLabel.fullDocTexts.udDoc || '용법용량 원문이 없습니다.'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-emerald-800 border-b pb-1 mb-2">
                  [사용상의 주의사항]
                </h4>
                <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {currentReport.mfdsLabel.fullDocTexts.nbDoc || '사용상의 주의사항 원문이 없습니다.'}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFullDocModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
