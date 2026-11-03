import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  HeartPulse,
  Info,
  Scale,
  ShieldAlert,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import {
  DrugMasterRecord,
  PregnancySafetyRecord,
  PregnancyTrimester,
  SafetySummaryLevel
} from '../types/maternalSafety';
import {
  PREGNANCY_SAFETY_DB,
  SAFETY_LEVEL_META
} from '../data/verifiedMaternalDb';
import { useMaternalStore } from '../stores/useMaternalStore';

interface PregnancySafetyViewProps {
  pregnancy: PregnancySafetyRecord | null;
  drugMaster?: DrugMasterRecord;
  unverifiedIngredientName?: string;
}

export const PregnancySafetyView: React.FC<PregnancySafetyViewProps> = ({
  pregnancy,
  drugMaster,
  unverifiedIngredientName
}) => {
  const {
    selectedTrimester,
    selectedGestationalWeek,
    setTrimester,
    setGestationalWeek,
    setActiveIngredientId
  } = useMaternalStore();

  // 미검증 성분(5대 핵심 성분 외 복합제 포함 성분 등)인 경우: 임의 안전성 판정 절대 금지
  if (!pregnancy) {
    const meta5 = SAFETY_LEVEL_META.LEVEL_5_INSUFFICIENT;
    return (
      <div className="space-y-4">
        <div className={`p-5 rounded-2xl border-2 ${meta5.borderClass} ${meta5.bgClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white border border-slate-300 text-slate-800 mb-2">
                <span className={`w-2 h-2 rounded-full ${meta5.dotClass}`} />
                {meta5.label} (원문 미등록 성분)
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                {unverifiedIngredientName || '선택된 성분'} — 임신부 안전성 임상 요약 미확보 (확인되지 않음)
              </h3>
              <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                본 성분은 현재 1차 검증된 5대 핵심 성분(Acetaminophen, Ibuprofen, Cetirizine, Chlorpheniramine, Amoxicillin) 데이터베이스에 아직 수록되지 않았습니다.
                <strong> 시스템 원칙에 따라 AI가 임의로 안전성 등급을 추측하거나 생성하지 않으며 &apos;확인되지 않음(근거 부족)&apos;으로 처리합니다.</strong>
              </p>
            </div>
          </div>

          {drugMaster && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>국내 식약처 허가사항 원문 ({drugMaster.koreanProductName})</span>
                <a
                  href={drugMaster.productSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-700 hover:underline font-bold"
                >
                  의약품안전나라 원문 열기 <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {drugMaster.mfdsPregnancyPrecautionText}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 현재 선택된 주수 및 삼분기에 따른 동적 위험도 계산
  const matchedWeekWindow = pregnancy.weekSpecificRisks.find(
    (w) => selectedGestationalWeek >= w.startWeek && selectedGestationalWeek <= w.endWeek
  );

  const trimesterBaseLevel: SafetySummaryLevel =
    selectedTrimester === 'T1'
      ? pregnancy.trimester1Level
      : selectedTrimester === 'T2'
      ? pregnancy.trimester2Level
      : pregnancy.trimester3Level;

  const activeLevel: SafetySummaryLevel = matchedWeekWindow ? matchedWeekWindow.level : trimesterBaseLevel;
  const levelMeta = SAFETY_LEVEL_META[activeLevel];

  const trimesterSummaryText =
    selectedTrimester === 'T1'
      ? pregnancy.trimester1Summary
      : selectedTrimester === 'T2'
      ? pregnancy.trimester2Summary
      : pregnancy.trimester3Summary;

  const quickWeeks = [
    { week: 6, label: '6주 (기관형성기)' },
    { week: 12, label: '12주 (1삼분기 말)' },
    { week: 20, label: '20주 (양수·신장 기준선)' },
    { week: 26, label: '26주 (2삼분기 후반)' },
    { week: 30, label: '30주 (동맥관 폐쇄 기준선)' },
    { week: 37, label: '37주 (분만 임박기)' }
  ];

  return (
    <div className="space-y-5">
      {/* 1. 임신 삼분기 & 특정 임신 주수(1~40주) 컨트롤 바 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 삼분기 선택 버튼 */}
          <div className="space-y-1.5">
            <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>임신 시기(삼분기) 선택</span>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {(
                [
                  { id: 'T1', label: '임신 1삼분기', sub: '1 ~ 13주 (기관형성)' },
                  { id: 'T2', label: '임신 2삼분기', sub: '14 ~ 27주 (태아성장/신장)' },
                  { id: 'T3', label: '임신 3삼분기', sub: '28 ~ 40주 (동맥관/분만)' }
                ] as { id: PregnancyTrimester; label: string; sub: string }[]
              ).map((t) => {
                const isSelected = selectedTrimester === t.id;
                const tLevel =
                  t.id === 'T1'
                    ? pregnancy.trimester1Level
                    : t.id === 'T2'
                    ? pregnancy.trimester2Level
                    : pregnancy.trimester3Level;
                const tDot = SAFETY_LEVEL_META[tLevel].dotClass;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTrimester(t.id)}
                    className={`px-3.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${tDot}`} />
                      <span>{t.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 특정 임신 주수 슬라이더 (1~40주) */}
          <div className="flex-1 max-w-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700">
                세부 임신 주수 지정 (주수별 태아 동맥관·양수 위험 자동 반영)
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-xs">
                임신 {selectedGestationalWeek}주 ({selectedTrimester === 'T1' ? '1삼분기' : selectedTrimester === 'T2' ? '2삼분기' : '3삼분기'})
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              value={selectedGestationalWeek}
              onChange={(e) => setGestationalWeek(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex flex-wrap gap-1.5">
              {quickWeeks.map((qw) => (
                <button
                  key={qw.week}
                  onClick={() => setGestationalWeek(qw.week)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    selectedGestationalWeek === qw.week
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {qw.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 선택된 주수 기준 5단계 자체 안전성 요약 배너 */}
      <div className={`rounded-2xl border-2 p-5 ${levelMeta.borderClass} ${levelMeta.bgClass} transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white text-slate-900 border border-slate-300 shadow-2xs">
                <span className={`w-2.5 h-2.5 rounded-full ${levelMeta.dotClass}`} />
                {levelMeta.label}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                평가 기준: 임신 {selectedGestationalWeek}주 ({selectedTrimester === 'T1' ? '1삼분기' : selectedTrimester === 'T2' ? '2삼분기' : '3삼분기'}) · {pregnancy.routeKorean}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                임상 근거 수준: {pregnancy.evidenceQualityLevel}
              </span>
            </div>
            <h2 className={`text-lg font-extrabold mt-1.5 ${levelMeta.textClass}`}>
              {pregnancy.koreanIngrName} ({pregnancy.englishInn}) — {matchedWeekWindow ? matchedWeekWindow.riskTitle : `${selectedTrimester} 시기 안전성 평가`}
            </h2>
          </div>

          <div className="text-[11px] text-slate-600 bg-white/90 px-3 py-2 rounded-xl border border-slate-200/90 max-w-xs shrink-0">
            <div className="font-extrabold text-slate-800 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>자체 5단계 요약 체계 안내</span>
            </div>
            <p className="mt-0.5 leading-snug">
              공식 규제기관 등급(구 FDA 등급 등)과 혼동하지 마십시오. 국내 DUR과 해외 임상 근거를 아래에서 별도로 비교합니다.
            </p>
          </div>
        </div>

        {/* 주수별 상세 요약 & 특정 주수 경고 */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/90 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-800 mb-1">
              선택 삼분기({selectedTrimester === 'T1' ? '1~13주' : selectedTrimester === 'T2' ? '14~27주' : '28~40주'}) 핵심 요약
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{trimesterSummaryText}</p>
          </div>

          {matchedWeekWindow && (
            <div className="bg-white/90 rounded-xl p-3.5 border border-slate-200/80">
              <div className="text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>임신 {matchedWeekWindow.startWeek}~{matchedWeekWindow.endWeek}주 구간 중점 포인트</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{matchedWeekWindow.clinicalDetail}</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. 국내 규제(심평원 DUR & 식약처 허가사항) vs 해외 전문기관 임상 근거 분리 비교 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 좌측(5열): 국내 DUR 및 식약처 허가사항 */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">국내 DUR 결과 및 식약처 허가사항</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                  pregnancy.domesticDurGrade === '임부금기 1등급'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : pregnancy.domesticDurGrade === '임부금기 2등급'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                국내 DUR: {pregnancy.domesticDurGrade}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-extrabold text-slate-700">심평원 / 식약처 DUR 고시 내역</div>
              <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.domesticDurNoticeDetail}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-extrabold text-slate-700">
                국내 식약처 허가사항 원문 요약 {drugMaster ? `(${drugMaster.koreanProductName})` : ''}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {drugMaster ? drugMaster.mfdsPregnancyPrecautionText : pregnancy.domesticPermitSummary}
              </p>
            </div>
          </div>

          {/* 국내 vs 해외 근거 차이점 명시 박스 */}
          <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-1">
            <div className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-700" />
              <span>국내 허가/DUR vs 해외 임상 근거 차이점 분석</span>
            </div>
            <p className="text-xs text-indigo-950 leading-relaxed">
              {pregnancy.domesticVsInternationalComparison}
            </p>
          </div>
        </div>

        {/* 우측(7열): 해외 전문기관(MotherToBaby, BUMPS/UKTIS, FDA PLLR) 평가 */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                해외 전문기관 임상 근거 (MotherToBaby · BUMPS/UKTIS · FDA PLLR)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">원문 링크 즉시 검증 가능</span>
          </div>

          <div className="space-y-2.5">
            {pregnancy.internationalAgencySummaries.map((agency, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-sky-300 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-sky-900 bg-sky-100/80 px-2.5 py-0.5 rounded-md border border-sky-200">
                    {agency.agencyName}
                  </span>
                  <a
                    href={agency.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline"
                  >
                    <span>원문 확인</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mt-1.5">{agency.summaryText}</p>
                {agency.keyDifferenceNote && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 mt-2">
                    💡 핵심 비교: {agency.keyDifferenceNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 태아 기관별·독성별 6대 세부 임상 근거 그리드 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <FileText className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-extrabold text-slate-900">
            태아·산모 세부 독성 항목별 검증 결과 (기형 · 유산 · 태아 신장/양수 · 동맥관)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-900 mb-1">① 선천성 기형 관련 연구</div>
            <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.congenitalMalformationData}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-900 mb-1">② 자연 유산 관련 자료</div>
            <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.miscarriageData}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-900 mb-1">③ 태아 독성 전반</div>
            <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.fetalToxicityData}</p>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              pregnancy.ingredientId === 'ing_ibuprofen' && selectedGestationalWeek >= 20
                ? 'bg-rose-50 border-rose-300'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="text-xs font-extrabold text-slate-900 mb-1">
              ④ 태아 신장 기능 및 양수과소증 위험 (20주~)
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.fetalRenalRisk}</p>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              pregnancy.ingredientId === 'ing_ibuprofen' && selectedGestationalWeek >= 30
                ? 'bg-rose-50 border-rose-300'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="text-xs font-extrabold text-slate-900 mb-1">
              ⑤ 태아 동맥관 조기 폐쇄 위험 (30주/3삼분기~)
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.fetalDuctusArteriosusRisk}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-900 mb-1">⑥ 산모 위험 및 복약 주의</div>
            <p className="text-xs text-slate-700 leading-relaxed">{pregnancy.maternalRisk}</p>
          </div>
        </div>
      </div>

      {/* 5. 약사 복약상담 요약 및 대체 약물 바로가기 */}
      <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>약사 복약상담 임상 권고 요약</span>
          </div>
          <p className="text-xs text-emerald-950 leading-relaxed">{pregnancy.clinicalRecommendation}</p>
        </div>

        {pregnancy.alternativeIngredientIds.length > 0 && (
          <div className="shrink-0 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-emerald-800">동일 효능군 비교/대체 검토 성분:</span>
            <div className="flex flex-wrap gap-1.5">
              {pregnancy.alternativeIngredientIds.map((altId) => {
                const alt = PREGNANCY_SAFETY_DB[altId];
                if (!alt) return null;
                return (
                  <button
                    key={altId}
                    onClick={() => setActiveIngredientId(altId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {alt.koreanIngrName} ({alt.englishInn}) 보기
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
