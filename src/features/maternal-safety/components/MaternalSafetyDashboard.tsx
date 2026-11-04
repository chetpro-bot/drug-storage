import React, { useEffect, useState } from 'react';
import {
  Search,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';
import { useMaternalStore } from '../stores/useMaternalStore';
import {
  IngredientSafetyEvaluation,
  MaternalDrugSearchCandidate,
  TgaPregnancyCategoryCode
} from '../types/maternalSafety';
import {
  TGA_MANDATORY_DISCLAIMERS,
  TGA_CATEGORY_DEFINITIONS
} from '../data/tgaPregnancyCategoryDb';
import { translateLactMedTextToKorean } from '../data/lactmedMonographDb';

export interface TgaVisualTheme {
  cardBg: string;
  borderColor: string;
  badgeBg: string;
  badgeLabel: string;
  titleColor: string;
  descBoxBg: string;
  descBoxBorder: string;
  tagBg: string;
  tagLabel: string;
}

export const TGA_CATEGORY_LIST: TgaPregnancyCategoryCode[] = ['A', 'B1', 'B2', 'B3', 'C', 'D', 'X'];

export function getTgaCategoryTheme(category?: TgaPregnancyCategoryCode | null): TgaVisualTheme {
  switch (category) {
    case 'A':
      return {
        cardBg: 'bg-emerald-50/70',
        borderColor: 'border-emerald-300',
        badgeBg: 'bg-emerald-600 text-white shadow-xs',
        badgeLabel: 'TGA Category A',
        titleColor: 'text-emerald-950',
        descBoxBg: 'bg-white/95 text-emerald-950',
        descBoxBorder: 'border-emerald-200',
        tagBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        tagLabel: '다수 임신부 안전 복용 확인'
      };
    case 'B1':
      return {
        cardBg: 'bg-teal-50/70',
        borderColor: 'border-teal-300',
        badgeBg: 'bg-teal-600 text-white shadow-xs',
        badgeLabel: 'TGA Category B1',
        titleColor: 'text-teal-950',
        descBoxBg: 'bg-white/95 text-teal-950',
        descBoxBorder: 'border-teal-200',
        tagBg: 'bg-teal-100 text-teal-800 border-teal-300',
        tagLabel: '인체제한 · 동물 기형/독성 없음'
      };
    case 'B2':
      return {
        cardBg: 'bg-indigo-50/70',
        borderColor: 'border-indigo-300',
        badgeBg: 'bg-indigo-600 text-white shadow-xs',
        badgeLabel: 'TGA Category B2',
        titleColor: 'text-indigo-950',
        descBoxBg: 'bg-white/95 text-indigo-950',
        descBoxBorder: 'border-indigo-200',
        tagBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        tagLabel: '동물연구 불충분 · 유해 증거 없음'
      };
    case 'B3':
      return {
        cardBg: 'bg-amber-50/75',
        borderColor: 'border-amber-300',
        badgeBg: 'bg-amber-600 text-white shadow-xs',
        badgeLabel: 'TGA Category B3',
        titleColor: 'text-amber-950',
        descBoxBg: 'bg-white/95 text-amber-950',
        descBoxBorder: 'border-amber-200',
        tagBg: 'bg-amber-100 text-amber-900 border-amber-300',
        tagLabel: '동물 기형/독성 관찰 · 인체 미상'
      };
    case 'C':
      return {
        cardBg: 'bg-orange-50/75',
        borderColor: 'border-orange-300',
        badgeBg: 'bg-orange-600 text-white shadow-xs',
        badgeLabel: 'TGA Category C',
        titleColor: 'text-orange-950',
        descBoxBg: 'bg-white/95 text-orange-950',
        descBoxBorder: 'border-orange-200',
        tagBg: 'bg-orange-100 text-orange-900 border-orange-300',
        tagLabel: '가역적 태아 유해작용 우려 (신중 투여)'
      };
    case 'D':
      return {
        cardBg: 'bg-red-50/80',
        borderColor: 'border-red-300',
        badgeBg: 'bg-red-600 text-white shadow-xs',
        badgeLabel: 'TGA Category D',
        titleColor: 'text-red-950',
        descBoxBg: 'bg-white/95 text-red-950',
        descBoxBorder: 'border-red-200',
        tagBg: 'bg-red-100 text-red-900 border-red-300',
        tagLabel: '인체 기형/손상 위험 확인 (주의 요망)'
      };
    case 'X':
      return {
        cardBg: 'bg-rose-100/90',
        borderColor: 'border-rose-400',
        badgeBg: 'bg-rose-950 text-white shadow-sm',
        badgeLabel: 'TGA Category X',
        titleColor: 'text-rose-950',
        descBoxBg: 'bg-white/95 text-rose-950',
        descBoxBorder: 'border-rose-300',
        tagBg: 'bg-rose-200 text-rose-950 border-rose-400',
        tagLabel: '임부 절대 금기 (Permanent Damage)'
      };
    default:
      return {
        cardBg: 'bg-slate-50',
        borderColor: 'border-slate-200',
        badgeBg: 'bg-slate-200 text-slate-700',
        badgeLabel: '미분류',
        titleColor: 'text-slate-900',
        descBoxBg: 'bg-white',
        descBoxBorder: 'border-slate-200',
        tagBg: 'bg-slate-100 text-slate-600 border-slate-200',
        tagLabel: '해당 성분 자료 없음'
      };
  }
}

/**
 * 식약처 허가사항의 상위 조항 제목([3. 다음과 같은 사람은...])과 세부 항목(• 10) 임부 또는 수유부)을 시각적으로 구분하여 표시
 */
function renderStructuredMfdsText(rawText: string) {
  const blocks = rawText.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').filter(Boolean);
        const firstLine = lines[0] || '';
        const isBracketHeader = firstLine.startsWith('[') && firstLine.endsWith(']');
        const headerText = isBracketHeader ? firstLine.slice(1, -1) : null;
        const bodyLines = isBracketHeader ? lines.slice(1) : lines;

        return (
          <div
            key={bIdx}
            className={bIdx > 0 ? 'pt-2.5 border-t border-slate-200/80 space-y-1.5' : 'space-y-1.5'}
          >
            {headerText && (
              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                {headerText}
              </div>
            )}
            <div className="space-y-1 pl-1 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {bodyLines.join('\n')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const MaternalSafetyDashboard: React.FC = () => {
  const {
    mobileSectionTab,
    setMobileSectionTab,
    searchQuery,
    isSearching,
    searchCandidates,
    detectedIngredientNotice,
    searchApiError,
    selectedCandidate,
    currentReport,
    isLoadingReport,
    executeSearch,
    selectCandidateAndLoadReport
  } = useMaternalStore();

  const [inputValue, setInputValue] = useState(searchQuery);
  const [showCandidateList, setShowCandidateList] = useState(false);

  // 상세보기 접기/펼치기 및 알약 이미지 모달 상태
  const [expandPregFullLabel, setExpandPregFullLabel] = useState(false);
  const [expandLactFullLabel, setExpandLactFullLabel] = useState(false);
  const [expandedLactmedDetailMap, setExpandedLactmedDetailMap] = useState<Record<string, boolean>>({});
  const [selectedPillImage, setSelectedPillImage] = useState<string | null>(null);
  const [showTgaCategoryGuide, setShowTgaCategoryGuide] = useState(false);

  // 품목 변경 시 상세보기 접힘 상태 및 알약 모달 초기화
  useEffect(() => {
    setExpandPregFullLabel(false);
    setExpandLactFullLabel(false);
    setExpandedLactmedDetailMap({});
    setSelectedPillImage(null);
  }, [currentReport?.itemSeq]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowCandidateList(true);
    await executeSearch(inputValue);
  };

  const handleSelectCandidate = async (candidate: MaternalDrugSearchCandidate) => {
    setShowCandidateList(false);
    await selectCandidateAndLoadReport(candidate);
  };

  const toggleLactmedDetail = (key: string) => {
    setExpandedLactmedDetailMap((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 overflow-y-auto select-text">
      {/* 1. 상단 검색 영역 (가장 눈에 잘 띄는 위치) */}
      <section className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                임신부·수유부 약물 안전성 빠른 조회
              </h2>
              <p className="text-xs text-slate-500">
                식약처 허가사항 · 식약처 DUR 임부금기 · 호주 TGA 분류 · NIH LactMed 공식 원문 대조
              </p>
            </div>
          </div>

          {/* 검색 폼 */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setShowCandidateList(true)}
                  placeholder="국내 제품명(예: 타이레놀, 부루펜, 오구멘틴), 국내 성분명(예: 이부프로펜), 영문 성분명(예: Ibuprofen) 검색"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    검색 중
                  </>
                ) : (
                  '검색'
                )}
              </button>
            </div>

            {/* 성분명 매칭 안내 및 API 오류 배너 */}
            {detectedIngredientNotice && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded px-3 py-1.5 flex items-center justify-between">
                <span>{detectedIngredientNotice}</span>
                <button
                  type="button"
                  onClick={() => setShowCandidateList((v) => !v)}
                  className="text-slate-800 font-semibold underline ml-2 cursor-pointer"
                >
                  {showCandidateList ? '목록 접기' : `검색 결과(${searchCandidates.length}건) 보기`}
                </button>
              </div>
            )}

            {searchApiError && (
              <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  [API 통신 오류] {searchApiError} (실제 자료 없음이 아닌 네트워크/API 응답 오류입니다.)
                </span>
              </div>
            )}

            {/* 검색 결과 제품 선택 리스트 */}
            {showCandidateList && searchCandidates.length > 0 && (
              <div className="mt-2 bg-white border border-slate-300 rounded-lg shadow-md max-h-64 overflow-y-auto divide-y divide-slate-100 z-20">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>검색된 국내 의약품 목록 ({searchCandidates.length}건) — 조회할 제품을 선택하세요</span>
                  <button
                    type="button"
                    onClick={() => setShowCandidateList(false)}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
                {searchCandidates.map((cand) => {
                  const isSelected = cand.itemSeq === selectedCandidate?.itemSeq;
                  return (
                    <button
                      key={cand.itemSeq}
                      type="button"
                      onClick={() => handleSelectCandidate(cand)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 cursor-pointer ${
                        isSelected ? 'bg-slate-100/80 font-semibold' : ''
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{cand.productName}</span>
                          {cand.isCombination && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-800 rounded">
                              복합제
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">{cand.manufacturer}</span>
                        </div>
                        <div className="text-slate-600">{cand.mainIngredientsText}</div>
                      </div>
                      <div className="text-[11px] text-slate-500 shrink-0">
                        {cand.dosageForm} · {cand.route} · 품목코드 {cand.itemSeq}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 2. 본문 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {isLoadingReport ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 flex flex-col items-center justify-center gap-3 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
            <p className="text-sm font-medium">
              식약처 허가사항, DUR 임부금기, 호주 TGA, NIH LactMed 데이터를 확인하고 있습니다...
            </p>
          </div>
        ) : !currentReport ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
            <p className="text-sm sm:text-base font-bold text-slate-800">
              상단 검색창에서 의약품을 검색하십시오.
            </p>
            <p className="text-xs text-slate-500">
              국내 제품명, 국내 성분명, 또는 영문 성분명을 입력하면 식약처 허가사항 · 식약처 DUR 임부금기 · 호주 TGA · NIH LactMed 공식 원문 데이터를 한 화면에 표시합니다.
            </p>
          </div>
        ) : (
          <>
            {/* [A] 제품 기본정보 */}
            <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-3.5">
                {/* 좌측: 제품 분류, 코드, 제품명 및 바로 뒤 알약 사진 */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {currentReport.etcOtcName}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                        currentReport.isCombination
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {currentReport.isCombination
                        ? `복합제 (유효성분 ${currentReport.ingredients.length}종 개별 매칭)`
                        : '단일제'}
                    </span>
                    <span className="text-xs text-slate-500">
                      품목기준코드: {currentReport.itemSeq}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 break-keep">
                      {currentReport.productName}
                    </h3>

                    {currentReport.pillIdentification?.itemImage && (
                      <div className="shrink-0 relative group">
                        <img
                          src={currentReport.pillIdentification.itemImage}
                          alt={`${currentReport.productName} 실물 알약`}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-contain bg-white border border-slate-200 rounded-lg p-1 shadow-xs cursor-pointer hover:border-sky-500 hover:shadow-md transition-all"
                          onClick={() => setSelectedPillImage(currentReport.pillIdentification?.itemImage || null)}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          title="클릭하여 식약처 공식 낱알 확대보기"
                        />
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 py-0.2 bg-slate-900/80 text-white text-[9px] rounded font-medium whitespace-nowrap shadow-xs pointer-events-none">
                          식약처 실물
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 우측: 허가사항 원문 링크 */}
                <div className="flex flex-col sm:items-end gap-1 text-right shrink-0">
                  <a
                    href={currentReport.permitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition-colors"
                  >
                    식약처 허가사항 원문 보기
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-slate-500">
                    식약처 허가/변경 기준일: {currentReport.permitUpdatedAt}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">제조사</span>
                  <span className="text-slate-900 font-semibold text-sm">
                    {currentReport.manufacturer || '정보 없음'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">성상</span>
                  <span className="text-slate-900 font-semibold text-sm block leading-snug">
                    {currentReport.chartText || currentReport.pillIdentification?.chart || currentReport.dosageForm || '정보 없음'}
                  </span>
                </div>
                <div className="sm:col-span-1">
                  <span className="text-slate-500 font-medium block mb-0.5">
                    전체 유효성분 및 함량 ({currentReport.ingredients.length}종)
                  </span>
                  <ul className="space-y-1">
                    {currentReport.ingredients.map((ing, idx) => (
                      <li key={idx} className="text-slate-900 font-semibold text-sm leading-snug">
                        • {ing.koreanName}
                        {ing.matchedInn ? ` (${ing.matchedInn})` : ing.englishName ? ` (${ing.englishName})` : ''}
                        {ing.amountText ? ` — ${ing.amountText}` : ''}
                        {ing.saltOrFormNote && (
                          <span className="block text-[11px] font-normal text-slate-500 pl-2.5">
                            └ {ing.saltOrFormNote}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {currentReport.isCombination && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    본 제품은 복합제이므로 전체 유효성분을 각각 분리하여 호주 TGA 및 NIH LactMed 데이터와 개별 매칭하였습니다. 복합제 전체에 대해 임의의 통합 안전성 등급을 생성하지 않습니다.
                  </span>
                </div>
              )}
            </section>

            {/* 모바일 화면용 임신부 / 수유부 탭 스위치 (데스크톱에서는 2열 나란히 표시) */}
            <div className="flex lg:hidden border-b border-slate-200 bg-white rounded-t-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setMobileSectionTab('PREGNANCY')}
                className={`flex-1 py-2.5 text-sm font-bold border-b-2 cursor-pointer ${
                  mobileSectionTab === 'PREGNANCY'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 bg-slate-50'
                }`}
              >
                임신부 정보
              </button>
              <button
                type="button"
                onClick={() => setMobileSectionTab('LACTATION')}
                className={`flex-1 py-2.5 text-sm font-bold border-b-2 cursor-pointer ${
                  mobileSectionTab === 'LACTATION'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 bg-slate-50'
                }`}
              >
                수유부 정보
              </button>
            </div>

            {/* [B] 임신부 정보 & [C] 수유부 정보 2열 레이아웃 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* ================= 좌측: 임신부 정보 ================= */}
              <div
                className={`space-y-4 ${
                  mobileSectionTab === 'LACTATION' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="border-b-2 border-rose-500 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-md shadow-xs">
                      임신부 안전 정보
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Pregnancy Safety
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    식약처 허가사항 · DUR 임부금기 · 호주 TGA
                  </span>
                </div>

                {/* 1. 식약처 허가사항의 임신 관련 문구 */}
                <article className="bg-white border-l-4 border-l-indigo-500 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                          식약처 허가사항
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          1. 임신 관련 허가사항 문구
                        </h4>
                      </div>
                      {currentReport.mfdsLabel.pregnancySectionTitle && (
                        <p className="text-[11px] text-slate-500 mt-1 pl-1">
                          발췌 항목: {currentReport.mfdsLabel.pregnancySectionTitle}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <a
                        href={currentReport.mfdsLabel.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
                      >
                        원문 링크
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="block text-[11px] text-slate-400">
                        갱신일: {currentReport.mfdsLabel.updatedAt}
                      </span>
                    </div>
                  </div>

                  {currentReport.mfdsLabel.status === 'API_ERROR' ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <strong>[API 조회 오류]</strong> {currentReport.mfdsLabel.errorMessage} (실제 자료 부재가 아닌 API 통신 오류입니다.)
                    </div>
                  ) : currentReport.mfdsLabel.pregnancyKeyText ? (
                    <div className="space-y-2">
                      <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 p-3 rounded-lg border border-indigo-200/80">
                        {renderStructuredMfdsText(currentReport.mfdsLabel.pregnancyKeyText)}
                      </div>

                      {currentReport.mfdsLabel.fullPrecautionsText && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandPregFullLabel((v) => !v)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            {expandPregFullLabel ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                사용상의 주의사항 전문 접기
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                사용상의 주의사항 전체 전문 상세보기
                              </>
                            )}
                          </button>

                          {expandPregFullLabel && (
                            <div className="mt-2 p-3 bg-white border border-slate-200 rounded max-h-80 overflow-y-auto">
                              {renderStructuredMfdsText(currentReport.mfdsLabel.fullPrecautionsText)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                      식약처 사용상의 주의사항 원문 내 별도 임부 관련 명시 문구가 확인되지 않습니다 (자료 없음). 원문 링크에서 전체 허가사항을 확인하십시오.
                    </div>
                  )}
                </article>

                {/* 2. 식약처 DUR 임부금기 등급 및 사유 */}
                <article className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                          식약처 DUR 임부금기
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          2. 임부금기 등급 및 사유
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-1">
                        식약처 의약품안전사용서비스(DUR) 공식 고시 기준
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <a
                        href={currentReport.mfdsDur.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 underline"
                      >
                        원문 링크
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="block text-[11px] text-slate-400">
                        고시/확인일: {currentReport.mfdsDur.updatedAt}
                      </span>
                    </div>
                  </div>

                  {currentReport.mfdsDur.status === 'API_ERROR' ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <strong>[DUR API 조회 오류]</strong> {currentReport.mfdsDur.errorMessage} (실제 임부금기 미지정이 아닌 API 통신 오류입니다.)
                    </div>
                  ) : currentReport.mfdsDur.hasTaboo ? (
                    <div className="space-y-2.5">
                      {currentReport.mfdsDur.entries.map((entry, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border space-y-1.5 shadow-2xs ${
                            entry.grade === '1등급'
                              ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-950'
                              : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-xs font-extrabold rounded ${
                                  entry.grade === '1등급'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-600 text-white'
                                }`}
                              >
                                DUR 임부금기 {entry.grade}
                              </span>
                              <span className="text-xs font-bold">
                                [{entry.mixType}] {entry.ingrName}
                                {entry.ingrEngName ? ` (${entry.ingrEngName})` : ''}
                              </span>
                            </div>
                            {entry.notificationDate && (
                              <span className="text-[11px] opacity-75">
                                고시일: {entry.notificationDate}
                              </span>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed font-medium">
                            <span className="font-bold">금기 사유 및 조건: </span>
                            {entry.prohibitContent ||
                              (entry.grade === '2등급'
                                ? '명확한 임상적 근거 또는 사유가 있는 경우에 한하여 부득이하게 사용 (세부 문구 별도 미기재)'
                                : '원칙적 사용금기')}
                          </p>

                          {(entry.formName || entry.remark) && (
                            <div className="text-[11px] pt-1 border-t border-black/10 space-y-0.5 opacity-90">
                              {entry.formName && (
                                <p>
                                  <span className="font-semibold">적용 제형:</span>{' '}
                                  {entry.formName.length > 90
                                    ? `${entry.formName.slice(0, 90)}...`
                                    : entry.formName}
                                </p>
                              )}
                              {entry.remark && (
                                <p>
                                  <span className="font-semibold">예외/비고 조건:</span> {entry.remark}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-300/80 rounded-lg space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        DUR 임부금기 미지정 (고시 대상 아님)
                      </div>
                      <p className="text-xs text-emerald-900/80 leading-relaxed pl-6">
                        ※ 식약처 고시 DUR 임부금기에 지정되어 있지 않은 약물입니다. 단, 이것이 임신 중 완전한 안전을 뜻하는 것은 아니므로 반드시 식약처 허가사항 및 호주 TGA 분류를 함께 확인하십시오.
                      </p>
                    </div>
                  )}
                </article>

                {/* 3. 호주 TGA 임신 등급 및 설명 */}
                <article className="bg-white border-l-4 border-l-sky-500 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-sky-100 text-sky-800 border border-sky-300">
                          호주 TGA 분류
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          3. 호주 TGA 임신 등급 및 설명
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-1">
                        Australian Categorisation System for Prescribing Medicines in Pregnancy
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <a
                        href={
                          currentReport.ingredientEvaluations[0]?.tgaInfo?.sourceUrl ||
                          'https://www.tga.gov.au/resources/health-professional-information-and-resources/australian-categorisation-system-prescribing-medicines-pregnancy/prescribing-medicines-pregnancy-database'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 underline"
                      >
                        TGA 원문 링크
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="block text-[11px] text-slate-400">
                        갱신일:{' '}
                        {currentReport.ingredientEvaluations[0]?.tgaInfo?.updatedAt || '2026-10-01'}
                      </span>
                    </div>
                  </div>

                  {/* 성분별 TGA 결과 표시 (복합제는 성분별 각각 구분 표시) */}
                  <div className="space-y-3">
                    {currentReport.ingredientEvaluations.map((evalItem, idx) => (
                      <TgaIngredientCard key={idx} evalItem={evalItem} />
                    ))}
                  </div>

                  {/* TGA 카테고리 설명 버튼 및 A~X 전체 등급 상세 안내 (클릭 시 토글) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTgaCategoryGuide((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-sky-900 bg-sky-50/80 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all shadow-2xs group cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-left">
                        <Info className="w-4 h-4 text-sky-600 shrink-0 group-hover:scale-110 transition-transform" />
                        <span>호주 TGA 카테고리(A ~ X) 분류 체계 및 등급 설명</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-white border border-sky-200 px-2.5 py-0.5 rounded shadow-2xs shrink-0">
                        {showTgaCategoryGuide ? '설명 접기' : '카테고리 설명 보기'}
                        {showTgaCategoryGuide ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {showTgaCategoryGuide && (
                      <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3.5 text-xs animate-fadeIn">
                        {/* 1. TGA 필수 주의사항 */}
                        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md text-[11px] text-amber-950 space-y-1.5">
                          <div className="font-bold flex items-center gap-1.5 text-amber-900">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>TGA 분류 체계 판독 시 핵심 주의사항</span>
                          </div>
                          {TGA_MANDATORY_DISCLAIMERS.map((notice, idx) => (
                            <p key={idx} className="leading-relaxed pl-1">• {notice}</p>
                          ))}
                        </div>

                        {/* 2. A부터 X까지 각각의 카테고리 공식 의미 설명 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="font-bold text-slate-800 text-xs">
                              호주 TGA 등급별 공식 정의 및 의미 (A, B1, B2, B3, C, D, X)
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              호주 의약품관리국 공식 기준
                            </span>
                          </div>

                          <div className="space-y-2">
                            {TGA_CATEGORY_LIST.map((catKey) => {
                              const def = TGA_CATEGORY_DEFINITIONS[catKey];
                              const theme = getTgaCategoryTheme(catKey);
                              return (
                                <div
                                  key={catKey}
                                  className={`p-2.5 rounded-md border ${theme.borderColor} ${theme.cardBg} space-y-1.5 shadow-2xs`}
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 text-xs font-extrabold rounded ${theme.badgeBg}`}>
                                        Category {catKey}
                                      </span>
                                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${theme.tagBg}`}>
                                        {theme.tagLabel}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-slate-800 leading-relaxed font-medium text-[11.5px]">
                                    {def.koreanDescription}
                                  </p>
                                  <p className="text-slate-500 text-[10.5px] leading-relaxed italic border-t border-slate-200/50 pt-1">
                                    {def.englishDescription}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </div>

              {/* ================= 우측: 수유부 정보 ================= */}
              <div
                className={`space-y-4 ${
                  mobileSectionTab === 'PREGNANCY' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="border-b-2 border-teal-500 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-600 text-white rounded-md shadow-xs">
                      수유부 안전 정보
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Lactation Safety
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    식약처 허가사항 · NIH LactMed (NBK501922)
                  </span>
                </div>

                {/* 1. 식약처 허가사항의 수유 관련 문구 */}
                <article className="bg-white border-l-4 border-l-cyan-500 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                          식약처 허가사항
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          1. 수유 관련 허가사항 문구
                        </h4>
                      </div>
                      {currentReport.mfdsLabel.lactationSectionTitle && (
                        <p className="text-[11px] text-slate-500 mt-1 pl-1">
                          발췌 항목: {currentReport.mfdsLabel.lactationSectionTitle}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <a
                        href={currentReport.mfdsLabel.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900 underline"
                      >
                        원문 링크
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="block text-[11px] text-slate-400">
                        갱신일: {currentReport.mfdsLabel.updatedAt}
                      </span>
                    </div>
                  </div>

                  {currentReport.mfdsLabel.status === 'API_ERROR' ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <strong>[API 조회 오류]</strong> {currentReport.mfdsLabel.errorMessage}
                    </div>
                  ) : currentReport.mfdsLabel.lactationKeyText ? (
                    <div className="space-y-2">
                      <div className="bg-gradient-to-br from-cyan-50/60 to-teal-50/40 p-3 rounded-lg border border-cyan-200/80">
                        {renderStructuredMfdsText(currentReport.mfdsLabel.lactationKeyText)}
                      </div>

                      {currentReport.mfdsLabel.fullPrecautionsText && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandLactFullLabel((v) => !v)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            {expandLactFullLabel ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                사용상의 주의사항 전문 접기
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                사용상의 주의사항 전체 전문 상세보기
                              </>
                            )}
                          </button>

                          {expandLactFullLabel && (
                            <div className="mt-2 p-3 bg-white border border-slate-200 rounded max-h-80 overflow-y-auto">
                              {renderStructuredMfdsText(currentReport.mfdsLabel.fullPrecautionsText)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                      식약처 사용상의 주의사항 원문 내 별도 수유부 관련 명시 문구가 확인되지 않습니다 (자료 없음). 원문 링크에서 전체 허가사항을 확인하십시오.
                    </div>
                  )}
                </article>

                {/* 2. NIH LactMed 수유 중 사용 요약 (Summary of Use During Lactation) */}
                <article className="bg-white border-l-4 border-l-teal-500 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-teal-100 text-teal-800 border border-teal-300">
                          NIH LactMed
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          2. 수유 중 사용 요약 (Summary of Use)
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-1">
                        미국 국립보건원(NIH) Drugs and Lactation Database 공식 원문 기반
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentReport.ingredientEvaluations.map((evalItem, idx) => (
                      <LactMedSummaryCard key={idx} evalItem={evalItem} />
                    ))}
                  </div>
                </article>

                {/* 3. 영아 이상반응 및 RID (자료가 있는 경우) + 모유/영아 농도 상세보기 */}
                <article className="bg-white border-l-4 border-l-emerald-500 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          이상반응 & RID
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          3. 영아 이상반응 및 상대적 영아 용량 (RID)
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-1">
                        원문에 제시된 RID만 표시하며, 원문에 없는 RID는 추정하거나 생성하지 않습니다.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentReport.ingredientEvaluations.map((evalItem, idx) => {
                      const key = `${evalItem.ingredient.koreanName}_${idx}`;
                      const isExpanded = !!expandedLactmedDetailMap[key];
                      return (
                        <LactMedInfantAndRidCard
                          key={key}
                          evalItem={evalItem}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleLactmedDetail(key)}
                        />
                      );
                    })}
                  </div>
                </article>
              </div>
            </div>
          </>
        )}

        {/* 식약처 공식 낱알 실물 이미지 확대 모달 */}
        {selectedPillImage && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setSelectedPillImage(null)}
          >
            <div
              className="bg-white rounded-xl p-4 sm:p-5 max-w-md w-full shadow-2xl space-y-3.5 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between pb-2 border-b border-slate-100 gap-2">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    {currentReport?.productName}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    식품의약품안전처 의약품안전나라 공식 낱알식별 이미지 (공공누리 제1유형)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPillImage(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                <img
                  src={selectedPillImage}
                  alt={currentReport?.productName}
                  className="max-h-64 object-contain rounded drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>

              {currentReport?.pillIdentification && (
                <div className="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200/60 leading-relaxed">
                  <div>
                    <span className="font-semibold text-slate-900">성상:</span>{' '}
                    {currentReport.pillIdentification.chart || currentReport.chartText}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="font-semibold text-slate-900">식별문자(앞):</span>{' '}
                      <span className="font-mono">{currentReport.pillIdentification.printFront || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">식별문자(뒤):</span>{' '}
                      <span className="font-mono">{currentReport.pillIdentification.printBack || '-'}</span>
                    </div>
                  </div>
                  {currentReport.pillIdentification.lengLong && (
                    <div>
                      <span className="font-semibold text-slate-900">실측 크기:</span>{' '}
                      장축 {currentReport.pillIdentification.lengLong}mm
                      {currentReport.pillIdentification.lengShort ? ` × 단축 ${currentReport.pillIdentification.lengShort}mm` : ''}
                      {currentReport.pillIdentification.thick ? ` × 두께 ${currentReport.pillIdentification.thick}mm` : ''}
                    </div>
                  )}
                  {currentReport.pillIdentification.lineFront && (
                    <div>
                      <span className="font-semibold text-slate-900">분할선:</span>{' '}
                      앞 [{currentReport.pillIdentification.lineFront}] / 뒤 [{currentReport.pillIdentification.lineBack || '-'}]
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const TgaIngredientCard: React.FC<{ evalItem: IngredientSafetyEvaluation }> = ({ evalItem }) => {
  const { ingredient, tgaStatus, tgaInfo } = evalItem;
  const theme = getTgaCategoryTheme(tgaInfo?.category);

  return (
    <div className={`p-3.5 rounded-lg border ${theme.borderColor} ${theme.cardBg} space-y-2.5 transition-all shadow-2xs`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">
            성분: {ingredient.koreanName}
            {ingredient.matchedInn ? ` (${ingredient.matchedInn})` : ''}
            {ingredient.amountText ? ` · ${ingredient.amountText}` : ''}
          </span>
          {tgaStatus === 'MATCHED' && tgaInfo && (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${theme.tagBg}`}>
              {theme.tagLabel}
            </span>
          )}
        </div>

        {tgaStatus === 'MATCHED' && tgaInfo ? (
          <span className={`px-2.5 py-1 text-xs font-extrabold rounded-md ${theme.badgeBg}`}>
            TGA Category {tgaInfo.category}
          </span>
        ) : tgaStatus === 'UNCERTAIN_MATCH_HIDDEN' ? (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
            성분 매칭 불확실 — 등급 미표시
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded">
            해당 성분 자료 없음
          </span>
        )}
      </div>

      {tgaStatus === 'MATCHED' && tgaInfo ? (
        <div className="space-y-2 text-xs">
          <p className="leading-relaxed font-medium">
            <span className="font-bold">등급 설명 (Category {tgaInfo.category}): </span>
            {tgaInfo.categoryDefinitionKorean}
          </p>
          {tgaInfo.ingredientNoteKorean && (
            <div className={`p-2.5 rounded-md border ${theme.descBoxBorder} ${theme.descBoxBg} leading-relaxed shadow-2xs`}>
              <span className="font-bold">성분별 추가 설명: </span>
              {tgaInfo.ingredientNoteKorean}
            </div>
          )}
        </div>
      ) : tgaStatus === 'UNCERTAIN_MATCH_HIDDEN' ? (
        <p className="text-xs text-amber-900 font-medium">
          {ingredient.matchWarningNote ||
            '국내 성분명과 해외 단일 성분명 간 염·제형·유도체 매칭이 불확실하여 TGA 등급을 표시하지 않습니다.'}
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          호주 TGA 데이터베이스에서 해당 성분의 분류 자료가 확인되지 않습니다 (해당 성분 자료 없음).
        </p>
      )}
    </div>
  );
};

const LactMedSummaryCard: React.FC<{ evalItem: IngredientSafetyEvaluation }> = ({ evalItem }) => {
  const { ingredient, lactmedStatus, lactmedInfo } = evalItem;
  const [showOriginalEng, setShowOriginalEng] = useState(false);

  // 감정 분석을 통한 시각적 뱃지 및 배경 스타일링
  const summary = lactmedInfo?.summaryKorean || '';
  const isSafeTone = /좋은 선택지|선호되는 선택지|허용 가능|허용가능|good choice|acceptable|preferred choice/i.test(summary);
  const isCautionTone = /감소|주의|보챔|interfere|decrease/i.test(summary);

  const cardStyle = isCautionTone
    ? 'bg-amber-50/70 border-amber-300'
    : isSafeTone
    ? 'bg-teal-50/70 border-teal-300'
    : 'bg-slate-50/80 border-slate-200';

  const badgeStyle = isCautionTone
    ? 'bg-amber-600 text-white'
    : isSafeTone
    ? 'bg-teal-600 text-white'
    : 'bg-slate-700 text-white';

  const badgeLabel = isCautionTone
    ? '모유량 감소 / 주의 관찰'
    : isSafeTone
    ? '수유 중 사용 적합 (Acceptable)'
    : 'LactMed 수록됨';

  return (
    <div className={`p-3.5 rounded-lg border ${cardStyle} space-y-2.5 transition-all shadow-2xs`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">
            성분: {ingredient.koreanName}
            {lactmedInfo?.drugTitle
              ? ` (LactMed: ${lactmedInfo.drugTitle})`
              : ingredient.matchedInn
              ? ` (${ingredient.matchedInn})`
              : ''}
          </span>
          {lactmedInfo && (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${badgeStyle}`}>
              {badgeLabel}
            </span>
          )}
        </div>
        {lactmedInfo && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              개정일: {lactmedInfo.lastRevisedDate}
            </span>
            <a
              href={lactmedInfo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
            >
              LactMed 원문 ({lactmedInfo.nbkId})
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {lactmedStatus !== 'NO_DATA' && lactmedInfo ? (
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-slate-900 leading-relaxed bg-white/95 p-3 rounded-md border border-slate-200/90 shadow-2xs">
            {lactmedInfo.summaryKorean}
          </p>

          <div>
            <button
              type="button"
              onClick={() => setShowOriginalEng((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {showOriginalEng ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Summary of Use During Lactation 영문 원문 접기
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Summary of Use During Lactation 영문 원문 보기
                </>
              )}
            </button>
            {showOriginalEng && (
              <div className="mt-1.5 p-3 bg-white border border-slate-200 rounded text-xs text-slate-700 whitespace-pre-line leading-relaxed shadow-2xs">
                {lactmedInfo.summaryOriginalEnglish}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          NIH LactMed 데이터베이스에서 해당 성분의 자료가 확인되지 않습니다 (해당 성분 자료 없음).
        </p>
      )}
    </div>
  );
};

const LactMedInfantAndRidCard: React.FC<{
  evalItem: IngredientSafetyEvaluation;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ evalItem, isExpanded, onToggleExpand }) => {
  const { ingredient, lactmedStatus, lactmedInfo } = evalItem;
  const [detailLangMode, setDetailLangMode] = useState<'KO' | 'EN'>('KO');

  if (lactmedStatus === 'NO_DATA' || !lactmedInfo) {
    return (
      <div className="p-3 bg-slate-50/70 border border-slate-200 rounded text-xs text-slate-500">
        <span className="font-bold text-slate-800">{ingredient.koreanName}: </span>
        해당 성분 자료 없음
      </div>
    );
  }

  const drugLevelsText =
    detailLangMode === 'KO'
      ? lactmedInfo.drugLevelsKorean || translateLactMedTextToKorean(lactmedInfo.drugLevelsOriginal, 'drugLevels')
      : lactmedInfo.drugLevelsOriginal;

  const infantEffectsText =
    detailLangMode === 'KO'
      ? lactmedInfo.infantAdverseEffectsKorean || translateLactMedTextToKorean(lactmedInfo.infantAdverseEffectsOriginal, 'infantEffects')
      : lactmedInfo.infantAdverseEffectsOriginal;

  const lactationEffectsText =
    detailLangMode === 'KO'
      ? lactmedInfo.lactationEffectsKorean || translateLactMedTextToKorean(lactmedInfo.lactationEffectsOriginal, 'lactationEffects')
      : lactmedInfo.lactationEffectsOriginal;

  return (
    <div className="p-3.5 bg-gradient-to-br from-teal-50/40 to-slate-50 border border-teal-200/80 rounded-lg space-y-3 text-xs shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-900 text-xs sm:text-sm">
          성분: {ingredient.koreanName} ({lactmedInfo.drugTitle})
        </span>
        <span className="text-[11px] text-slate-500">
          개정일: {lactmedInfo.lastRevisedDate}
        </span>
      </div>

      {/* 영아 이상반응 */}
      <div className="bg-white p-3 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
          영아에게 보고된 이상반응 (Effects in Breastfed Infants)
        </div>
        <p className="text-slate-800 leading-relaxed pl-3">{lactmedInfo.infantAdverseEffectsKorean}</p>
      </div>

      {/* RID (원문에 제시되어 있는 경우에만 표시) */}
      <div className="bg-white p-3 rounded-md border border-slate-200/80 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            상대적 영아 용량 (RID — Relative Infant Dose)
          </div>
          {lactmedInfo.ridOriginalText && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
              안전 기준치 (&lt;10%) 충족
            </span>
          )}
        </div>
        {lactmedInfo.ridOriginalText ? (
          <div className="space-y-1 pl-3">
            {lactmedInfo.ridKoreanSummary && (
              <p className="text-emerald-900 font-bold text-xs">{lactmedInfo.ridKoreanSummary}</p>
            )}
            <p className="text-slate-600 text-[11px] leading-relaxed">
              [원문 발췌] {lactmedInfo.ridOriginalText}
            </p>
          </div>
        ) : (
          <p className="text-slate-500 pl-3">
            LactMed 원문 내 제시된 RID 수치 없음 (원문에 없는 RID를 추정하거나 생성하지 않음)
          </p>
        )}
      </div>

      {/* 필요할 때만 펼쳐 보는 모유 농도 및 영아 혈중 농도 상세보기 */}
      {(lactmedInfo.drugLevelsOriginal ||
        lactmedInfo.infantAdverseEffectsOriginal ||
        lactmedInfo.lactationEffectsOriginal) && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                모유 농도·영아 혈중 농도 및 상세 연구 접기
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                모유 농도·영아 혈중 농도 및 상세 연구 펼치기
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 p-3 bg-white border border-slate-200 rounded space-y-3.5 text-xs text-slate-700 leading-relaxed shadow-xs">
              {/* 원문 / 번역본 선택 버튼 */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span>상세보기 언어 선택:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {detailLangMode === 'KO' ? '(한국어 번역본 요약)' : '(NIH LactMed 영문 원문)'}
                  </span>
                </div>
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setDetailLangMode('KO')}
                    className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                      detailLangMode === 'KO'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    한국어 번역본
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailLangMode('EN')}
                    className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                      detailLangMode === 'EN'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English 원문
                  </button>
                </div>
              </div>

              {drugLevelsText && (
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">
                    {detailLangMode === 'KO'
                      ? '[모유 농도 및 영아 혈중 농도 — Drug Levels]'
                      : '[Drug Levels — Milk Levels & Infant Blood Levels Original]'}
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed">
                    {drugLevelsText}
                  </div>
                </div>
              )}

              {infantEffectsText && (
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">
                    {detailLangMode === 'KO'
                      ? '[영아 이상반응 보고 내역 — Effects in Breastfed Infants]'
                      : '[Effects in Breastfed Infants Original]'}
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed">
                    {infantEffectsText}
                  </div>
                </div>
              )}

              {lactationEffectsText && (
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">
                    {detailLangMode === 'KO'
                      ? '[모유 분비량 및 젖분비 영향 — Effects on Lactation and Breastmilk]'
                      : '[Effects on Lactation and Breastmilk Original]'}
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed">
                    {lactationEffectsText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
