import React from 'react';
import {
  AlertOctagon,
  ArrowRight,
  Baby,
  BookOpen,
  ExternalLink,
  Globe,
  HeartPulse,
  Layers,
  Scale,
  ShieldAlert
} from 'lucide-react';
import {
  DrugMasterRecord,
  InfantAgeGroup,
  LactationSafetyRecord,
  PregnancySafetyRecord,
  SafetySummaryLevel
} from '../types/maternalSafety';
import { SAFETY_LEVEL_META } from '../data/verifiedMaternalDb';
import { useMaternalStore } from '../stores/useMaternalStore';

interface QuickConsultationSummaryViewProps {
  pregnancy: PregnancySafetyRecord | null;
  lactation: LactationSafetyRecord | null;
  drugMaster?: DrugMasterRecord;
  unverifiedIngredientName?: string;
  sourcesCount: number;
}

export const QuickConsultationSummaryView: React.FC<QuickConsultationSummaryViewProps> = ({
  pregnancy,
  lactation,
  drugMaster,
  unverifiedIngredientName,
  sourcesCount
}) => {
  const {
    selectedResult,
    selectedGestationalWeek,
    selectedInfantAge,
    isPretermInfant,
    setInfantAge,
    setIsPretermInfant,
    setActiveTab
  } = useMaternalStore();

  const hasUnverifiedInCombo = selectedResult.mappedIngredients.some(
    (m) => m.verificationStatus !== 'VERIFIED_CORE_5'
  );

  // 미검증 성분인 경우 요약 테이블
  if (!pregnancy || !lactation) {
    const meta5 = SAFETY_LEVEL_META.LEVEL_5_INSUFFICIENT;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {unverifiedIngredientName || '선택된 성분'} — 복약지도 요약표
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              현재 5대 핵심 검증 성분 외 성분으로, AI 임의 추측 없이 식약처 원문 기준으로만 안내합니다.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${meta5.bgClass} ${meta5.textClass} ${meta5.borderClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${meta5.dotClass}`} />
            {meta5.label}
          </span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <tbody className="divide-y divide-slate-200">
            <tr className="bg-indigo-50/50">
              <td colSpan={2} className="py-2.5 px-5 font-extrabold text-indigo-950">
                🇰🇷 국내 기준 (심평원 DUR · 식약처 허가사항)
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 w-52 font-extrabold text-slate-700 bg-slate-50/60 border-r border-slate-200">
                식약처 허가사항 원문
              </td>
              <td className="py-3.5 px-5 text-slate-700 leading-relaxed whitespace-pre-line">
                {drugMaster
                  ? drugMaster.mfdsPregnancyPrecautionText
                  : '식약처 의약품안전나라에서 품목별 허가사항 원문을 확인하십시오.'}
              </td>
            </tr>
            <tr className="bg-sky-50/50">
              <td colSpan={2} className="py-2.5 px-5 font-extrabold text-sky-950">
                🌐 국외 임상 근거 (LactMed · MotherToBaby · BUMPS · FDA)
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-extrabold text-slate-700 bg-slate-50/60 border-r border-slate-200">
                임신·수유 해외 요약 및 RID
              </td>
              <td className="py-3.5 px-5 text-slate-700">
                <strong>확인되지 않음 (1차 MVP 5대 핵심 성분 외 미등록)</strong> — 출처 없는 안전성 등급이나 RID 수치를 임의로 생성하지 않습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const t1Meta = SAFETY_LEVEL_META[pregnancy.trimester1Level];
  const t2Meta = SAFETY_LEVEL_META[pregnancy.trimester2Level];
  const t3Meta = SAFETY_LEVEL_META[pregnancy.trimester3Level];

  const currentLactLevel: SafetySummaryLevel = isPretermInfant
    ? lactation.pretermInfantRisk.level
    : lactation.ageConsiderations[selectedInfantAge].level;
  const lactMeta = SAFETY_LEVEL_META[currentLactLevel];

  return (
    <div className="space-y-4">
      {/* 복합제인 경우 상단 1줄 알림 바 */}
      {selectedResult.isCombination && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <strong>복합제 주의 ({selectedResult.displayName}):</strong> 현재 표는 선택된 단일 성분(
              <strong>{pregnancy.koreanIngrName}</strong>) 요약입니다.
              {hasUnverifiedInCombo
                ? ' 본 복합제에는 미검증 성분이 함께 들어 있으므로 전체 성분을 반드시 확인하십시오.'
                : ' 포함된 다른 성분도 함께 확인하십시오.'}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('COMBINATION')}
            className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-extrabold shrink-0 cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>복합제 전 성분 분석표 보기 →</span>
          </button>
        </div>
      )}

      {/* 메인 복약지도 빠른 요약 테이블 (사용자 요청 이미지 레이아웃 + 국내/국외 분류) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        {/* 테이블 헤더: 성분명 + 우측 상세페이지 바로가기 버튼들 */}
        <div className="px-5 py-4 bg-slate-50/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-extrabold">
                복약지도 핵심 요약
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                {pregnancy.koreanIngrName} ({pregnancy.englishInn})
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {pregnancy.therapeuticClass} · {pregnancy.routeKorean}
              </span>
            </div>
          </div>

          {/* 상세 페이지 이동 버튼 그룹 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('PREGNANCY')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-extrabold transition-all cursor-pointer"
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
              <span>임신부 상세 페이지</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => setActiveTab('LACTATION')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-extrabold transition-all cursor-pointer"
            >
              <Baby className="w-3.5 h-3.5 text-sky-600" />
              <span>수유부 상세 · RID 계산기</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => setActiveTab('COMPARE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold transition-all cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>타 성분 비교</span>
            </button>

            <button
              onClick={() => setActiveTab('SOURCES')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-extrabold transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
              <span>원문 출처 ({sourcesCount})</span>
            </button>
          </div>
        </div>

        {/* 요약 테이블 본문 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-200 text-xs">
              {/* ==================== [분류 1] 국내 기준 요약 ==================== */}
              <tr className="bg-indigo-50/70">
                <td
                  colSpan={2}
                  className="py-2.5 px-5 font-extrabold text-indigo-950 text-xs border-b border-indigo-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-indigo-600" />
                      <span>[국내 기준] 심평원/식약처 DUR 및 국내 허가사항 요약</span>
                    </span>
                    {drugMaster && (
                      <a
                        href={drugMaster.productSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline"
                      >
                        <span>식약처 의약품안전나라 원문</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>

              {/* 국내 1: 심평원/식약처 DUR */}
              <tr>
                <td className="py-3.5 px-5 w-52 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  국내 심평원/식약처 DUR
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                        pregnancy.domesticDurGrade === '임부금기 1등급'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : pregnancy.domesticDurGrade === '임부금기 2등급'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      {pregnancy.domesticDurGrade}
                    </span>
                    <span className="text-slate-600 font-medium">
                      {pregnancy.domesticDurNoticeDetail}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 국내 2: 국내 식약처 허가사항 (임부·수유부) */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  국내 식약처 허가사항
                </td>
                <td className="py-3.5 px-5 space-y-1 text-slate-700 leading-relaxed">
                  <div>
                    <strong className="text-slate-900">[임부]</strong>{' '}
                    {drugMaster ? drugMaster.mfdsPregnancyPrecautionText : pregnancy.domesticPermitSummary}
                  </div>
                  <div>
                    <strong className="text-slate-900">[수유부]</strong>{' '}
                    {lactation.domesticPermitLactationSummary}
                  </div>
                </td>
              </tr>

              {/* ==================== [분류 2] 국외 임상 근거 요약 ==================== */}
              <tr className="bg-sky-50/70">
                <td
                  colSpan={2}
                  className="py-2.5 px-5 font-extrabold text-sky-950 text-xs border-b border-sky-100"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-sky-600" />
                      <span>
                        [국외 임상 근거] MotherToBaby · BUMPS(UKTIS) · NIH LactMed · FDA PLLR 종합
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-sky-800">
                      ※ 5단계 표시는 자체 임상 근거 요약 체계임 (근거 수준: {pregnancy.evidenceQualityLevel})
                    </span>
                  </div>
                </td>
              </tr>

              {/* 국외 1: 임신 1삼분기 (1~13주) */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  임신 1삼분기 (1~13주)
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 w-fit ${t1Meta.bgClass} ${t1Meta.textClass} ${t1Meta.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t1Meta.dotClass}`} />
                      {t1Meta.label}
                    </span>
                    <span className="text-slate-700 leading-relaxed">{pregnancy.trimester1Summary}</span>
                  </div>
                </td>
              </tr>

              {/* 국외 2: 임신 2삼분기 (14~27주) */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  임신 2삼분기 (14~27주)
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 w-fit ${t2Meta.bgClass} ${t2Meta.textClass} ${t2Meta.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t2Meta.dotClass}`} />
                      {t2Meta.label}
                    </span>
                    <span className="text-slate-700 leading-relaxed">{pregnancy.trimester2Summary}</span>
                  </div>
                </td>
              </tr>

              {/* 국외 3: 임신 3삼분기 (28~40주) */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  임신 3삼분기 (28~40주)
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 w-fit ${t3Meta.bgClass} ${t3Meta.textClass} ${t3Meta.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t3Meta.dotClass}`} />
                      {t3Meta.label}
                    </span>
                    <span className="text-slate-700 leading-relaxed">{pregnancy.trimester3Summary}</span>
                  </div>
                </td>
              </tr>

              {/* 국외 4: 수유부 안전성 (영아 연령 빠른 전환 포함) */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  <div>
                    수유부 안전성 (
                    {selectedInfantAge === 'NEONATE'
                      ? '신생아'
                      : selectedInfantAge === 'INFANT_1_6M'
                      ? '1~6개월'
                      : '6개월 이상'}
                    {isPretermInfant ? '·미숙아' : ''})
                  </div>
                  {/* 영아 조건 즉시 전환 미니 버튼 */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(
                      [
                        { id: 'NEONATE', label: '신생아' },
                        { id: 'INFANT_1_6M', label: '1~6개월' },
                        { id: 'INFANT_OVER_6M', label: '6개월+' }
                      ] as { id: InfantAgeGroup; label: string }[]
                    ).map((ag) => (
                      <button
                        key={ag.id}
                        onClick={() => setInfantAge(ag.id)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          selectedInfantAge === ag.id
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {ag.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsPretermInfant(!isPretermInfant)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        isPretermInfant
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      미숙아
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 w-fit ${lactMeta.bgClass} ${lactMeta.textClass} ${lactMeta.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${lactMeta.dotClass}`} />
                      {lactMeta.label}
                    </span>
                    <span className="text-slate-700 leading-relaxed">
                      {isPretermInfant
                        ? lactation.pretermInfantRisk.clinicalNote
                        : lactation.ageConsiderations[selectedInfantAge].clinicalNote}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 국외 5: 수유 RID (%) (LactMed) */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  수유 RID (%) (LactMed)
                </td>
                <td className="py-3.5 px-5">
                  <div className="font-extrabold text-sky-900 text-xs sm:text-sm">
                    {lactation.ridRangeText}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    모유 농도: {lactation.milkConcentrationText}
                  </div>
                </td>
              </tr>

              {/* 국외 6: 약물 반감기 */}
              <tr>
                <td className="py-3.5 px-5 font-extrabold text-slate-800 bg-slate-50/70 border-r border-slate-200">
                  약물 반감기
                </td>
                <td className="py-3.5 px-5 text-slate-700 leading-relaxed">
                  {lactation.halfLifeText}
                </td>
              </tr>

              {/* ==================== [분류 3] 복약지도 핵심 & 국내·외 차이점 ==================== */}
              <tr className="bg-emerald-50/60">
                <td className="py-4 px-5 font-extrabold text-slate-900 bg-slate-50/90 border-r border-slate-200">
                  임신·수유 복약지도 핵심
                </td>
                <td className="py-4 px-5 space-y-2.5 text-slate-800 leading-relaxed">
                  <p className="text-xs bg-indigo-50/80 border border-indigo-200 rounded-xl px-3 py-2 text-indigo-950">
                    <strong>[국내 vs 국외 차이점]</strong> {pregnancy.domesticVsInternationalComparison}
                  </p>
                  <p>
                    <strong className="text-rose-900">[임신 {selectedGestationalWeek}주 기준]</strong>{' '}
                    {pregnancy.clinicalRecommendation}
                  </p>
                  <p>
                    <strong className="text-sky-900">[수유]</strong> {lactation.continuationGuidance}
                  </p>

                  {/* 상세 페이지 이동 바로가기 링크 모음 */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab('PREGNANCY')}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                    >
                      <span>임신 주수별(1~40주) 및 6대 태아 독성 상세 화면으로 이동</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-slate-300">|</span>

                    <button
                      onClick={() => setActiveTab('LACTATION')}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                    >
                      <span>수유부 약동학 및 RID 계산기 상세 화면으로 이동</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-slate-300">|</span>

                    <button
                      onClick={() => setActiveTab('SOURCES')}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      <span>원문 근거 문헌 ({sourcesCount}건) 및 openFDA 라벨 보기</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
