import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Baby,
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  FlaskConical,
  Info,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import {
  DrugMasterRecord,
  InfantAgeGroup,
  LactationSafetyRecord,
  SafetySummaryLevel
} from '../types/maternalSafety';
import {
  LACTATION_SAFETY_DB,
  SAFETY_LEVEL_META
} from '../data/verifiedMaternalDb';
import { useMaternalStore } from '../stores/useMaternalStore';

interface LactationSafetyViewProps {
  lactation: LactationSafetyRecord | null;
  drugMaster?: DrugMasterRecord;
  unverifiedIngredientName?: string;
}

export const LactationSafetyView: React.FC<LactationSafetyViewProps> = ({
  lactation,
  drugMaster,
  unverifiedIngredientName
}) => {
  const {
    selectedInfantAge,
    isPretermInfant,
    setInfantAge,
    setIsPretermInfant,
    setActiveIngredientId
  } = useMaternalStore();

  // RID 공식 계산기 상태 (문헌 기준 초기값 자동 연동, 미확인 성분은 비워둠)
  const [infantDoseInput, setInfantDoseInput] = useState<string>('');
  const [maternalDoseInput, setMaternalDoseInput] = useState<string>('');

  useEffect(() => {
    if (
      lactation &&
      lactation.referenceInfantDoseMgPerKgDay !== null &&
      lactation.referenceMaternalDoseMgPerKgDay !== null
    ) {
      setInfantDoseInput(String(lactation.referenceInfantDoseMgPerKgDay));
      setMaternalDoseInput(String(lactation.referenceMaternalDoseMgPerKgDay));
    } else {
      setInfantDoseInput('');
      setMaternalDoseInput('');
    }
  }, [lactation]);

  // 미검증 성분(5대 핵심 성분 외 복합제 포함 성분 등)인 경우
  if (!lactation) {
    const meta5 = SAFETY_LEVEL_META.LEVEL_5_INSUFFICIENT;
    return (
      <div className="space-y-4">
        <div className={`p-5 rounded-2xl border-2 ${meta5.borderClass} ${meta5.bgClass}`}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white border border-slate-300 text-slate-800 mb-2">
            <span className={`w-2 h-2 rounded-full ${meta5.dotClass}`} />
            {meta5.label} (원문 미등록 성분)
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">
            {unverifiedIngredientName || '선택된 성분'} — 수유부 안전성 및 RID 원문 미확보 (확인되지 않음)
          </h3>
          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
            본 성분은 현재 1차 검증된 5대 핵심 성분 데이터베이스에 수록되지 않았습니다.
            <strong> 시스템 원칙에 따라 확인되지 않은 RID(%)나 모유 농도를 임의로 생성하지 않고 &apos;확인되지 않음&apos;으로 표시합니다.</strong>
          </p>

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

  const ageEntry = lactation.ageConsiderations[selectedInfantAge];
  const activeLevel: SafetySummaryLevel = isPretermInfant
    ? lactation.pretermInfantRisk.level
    : ageEntry.level;
  const levelMeta = SAFETY_LEVEL_META[activeLevel];

  // RID(%) = (영아의 체중당 약물 섭취량 / 산모의 체중당 약물 투여량) × 100
  const parsedInfantDose = parseFloat(infantDoseInput);
  const parsedMaternalDose = parseFloat(maternalDoseInput);
  const calculatedRid =
    !isNaN(parsedInfantDose) &&
    !isNaN(parsedMaternalDose) &&
    parsedMaternalDose > 0 &&
    parsedInfantDose >= 0
      ? (parsedInfantDose / parsedMaternalDose) * 100
      : null;

  return (
    <div className="space-y-5">
      {/* 1. 수유 영아 연령 및 미숙아 여부 선택 바 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
              <Baby className="w-4 h-4 text-sky-600" />
              <span>수유 영아 연령 선택</span>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {(
                [
                  { id: 'NEONATE', label: '신생아', sub: '생후 0 ~ 4주 (간·신장 미성숙)' },
                  { id: 'INFANT_1_6M', label: '생후 1 ~ 6개월', sub: '완전 모유수유기' },
                  { id: 'INFANT_OVER_6M', label: '생후 6개월 이상', sub: '이유식 병행기' }
                ] as { id: InfantAgeGroup; label: string; sub: string }[]
              ).map((ag) => {
                const isSelected = selectedInfantAge === ag.id;
                const agLevel = lactation.ageConsiderations[ag.id].level;
                const dot = SAFETY_LEVEL_META[agLevel].dotClass;
                return (
                  <button
                    key={ag.id}
                    onClick={() => setInfantAge(ag.id)}
                    className={`px-3.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      <span>{ag.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{ag.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 미숙아 여부 토글 */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200/90">
            <div>
              <div className="text-xs font-extrabold text-slate-800">미숙아(조산아) 여부</div>
              <div className="text-[11px] text-slate-500">
                미숙아는 약물 청소율이 낮아 축적 위험을 별도 반영합니다
              </div>
            </div>
            <button
              onClick={() => setIsPretermInfant(!isPretermInfant)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                isPretermInfant
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isPretermInfant ? '⚠️ 미숙아(조산아) 적용 중' : '만기 정상 출생아 (미숙아 아님)'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 선택된 수유 조건 기준 5단계 안전성 요약 배너 */}
      <div className={`rounded-2xl border-2 p-5 ${levelMeta.borderClass} ${levelMeta.bgClass} transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white text-slate-900 border border-slate-300 shadow-2xs">
                <span className={`w-2.5 h-2.5 rounded-full ${levelMeta.dotClass}`} />
                {levelMeta.label}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                영아 조건: {ageEntry.title} {isPretermInfant ? '+ 미숙아(조산아) 주의' : '(만기 정상아)'}
              </span>
              <span className="text-xs font-extrabold text-sky-900 bg-white/90 px-2.5 py-1 rounded-lg border border-sky-200">
                검증 RID: {lactation.ridRangeText}
              </span>
            </div>
            <h2 className={`text-lg font-extrabold mt-1.5 ${levelMeta.textClass}`}>
              {lactation.koreanIngrName} ({lactation.englishInn}) — 수유 중 안전성 및 모유 이행 평가
            </h2>
          </div>

          <a
            href={`https://www.ncbi.nlm.nih.gov/books/${
              lactation.evidenceSourceIds[0]?.split('_').pop()?.toUpperCase() || 'NBK501922'
            }/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-sky-800 border border-sky-200 text-xs font-extrabold shadow-2xs shrink-0"
          >
            <span>NIH LactMed 원문 바로가기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/90 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-800 mb-1">
              {ageEntry.title} 고려사항
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{ageEntry.clinicalNote}</p>
          </div>

          <div
            className={`rounded-xl p-3.5 border ${
              isPretermInfant
                ? 'bg-amber-100/90 border-amber-300'
                : 'bg-white/90 border-slate-200/80'
            }`}
          >
            <div className="text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>미숙아(조산아) 관련 위험 및 주의사항</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {lactation.pretermInfantRisk.clinicalNote}
            </p>
          </div>
        </div>
      </div>

      {/* 3. 모유 약동학(PK) 핵심 지표 6종 & RID 공식 계산기 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 좌측(7열): 모유 이행 · RID · 영아 혈중 농도 · 반감기 · 활성 대사체 · 영아 부작용 */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                모유 이행 및 약동학(PK) 원문 검증 데이터
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              미측정 항목은 &apos;확인되지 않음&apos;으로 표기
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-extrabold text-slate-900 mb-1">① 모유 내 약물 농도</div>
              <p className="text-xs text-slate-700 leading-relaxed">{lactation.milkConcentrationText}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-extrabold text-slate-900 mb-1">② 영아 혈중 농도</div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {lactation.infantSerumConcentrationText}
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                lactation.ridNumericMin === null
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-sky-50/70 border-sky-200'
              }`}
            >
              <div className="text-xs font-extrabold text-slate-900 mb-1">
                ③ RID (Relative Infant Dose, 상대적 영아 용량)
              </div>
              <div className="text-sm font-extrabold text-sky-950">{lactation.ridRangeText}</div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {lactation.ridClinicalInterpretation}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-extrabold text-slate-900 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>④ 약물 반감기 (Half-life)</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{lactation.halfLifeText}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-extrabold text-slate-900 mb-1">⑤ 활성 대사체 (Active Metabolites)</div>
              <p className="text-xs text-slate-700 leading-relaxed">{lactation.activeMetabolitesText}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-extrabold text-slate-900 mb-1">⑥ 모유 수유 영아 부작용</div>
              <p className="text-xs text-slate-700 leading-relaxed">{lactation.infantAdverseEffects}</p>
            </div>
          </div>

          {/* 수유 지속 및 중단 관련 근거 + 국내 허가사항 비교 */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
            <div className="text-xs font-extrabold text-emerald-900">
              수유 지속 및 중단 필요성 근거 (LactMed)
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed">{lactation.continuationGuidance}</p>
            <div className="pt-2 border-t border-emerald-200/70 text-[11px] text-slate-700">
              <strong>국내 허가사항(수유부 조항) 비교:</strong> {lactation.domesticPermitLactationSummary}
            </div>
          </div>
        </div>

        {/* 우측(5열): RID 공식 계산기 & RID 10% 기준 절대화 금지 원칙 안내 */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">RID(%) 표준 공식 계산 및 시뮬레이터</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                약사 복약상담 보조
              </span>
            </div>

            {/* 표준 공식 표시 */}
            <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono space-y-1">
              <div className="text-[10px] text-slate-400 font-sans font-bold">Relative Infant Dose 산출 공식</div>
              <div>RID(%) = (영아의 체중당 약물 섭취량 / 산모의 체중당 약물 투여량) × 100</div>
              <div className="text-[10px] text-slate-300 font-sans">
                ※ 영아 일일 모유 섭취량 표준 가정치: 150 mL/kg/day (0.15 L/kg/day)
              </div>
            </div>

            {lactation.ridNumericMin === null ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>원문 RID 미측정 성분 ({lactation.koreanIngrName})</span>
                </div>
                <p className="leading-relaxed">
                  LactMed 원문에서 인간 모유 농도가 정량 측정되지 않았으므로 기본 RID 수치를 임의로 채우지 않습니다. 아래 입력창은 가정치 계산 시에만 참고용으로 사용할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                현재 문헌 기준 대표값(영아 {lactation.referenceInfantDoseMgPerKgDay} mg/kg/day ÷ 산모{' '}
                {lactation.referenceMaternalDoseMgPerKgDay} mg/kg/day)이 자동 입력되어 있습니다.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  영아 체중당 약물 섭취량 (mg/kg/day)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="예: 0.068"
                  value={infantDoseInput}
                  onChange={(e) => setInfantDoseInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  산모 체중당 약물 투여량 (mg/kg/day)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="예: 22.8"
                  value={maternalDoseInput}
                  onChange={(e) => setMaternalDoseInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950">공식 계산 결과 RID(%):</span>
              <span className="text-base font-extrabold text-indigo-700 font-mono">
                {calculatedRid !== null ? `${calculatedRid.toFixed(2)}%` : '입력 대기 (또는 원문 미측정)'}
              </span>
            </div>
          </div>

          {/* RID 10% 절대 기준 사용 금지 경고 */}
          <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 space-y-1">
            <div className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span>필수 임상 원칙: RID 10% 이하를 절대적 안전 기준으로 사용하지 않음</span>
            </div>
            <p className="text-[11px] text-rose-950 leading-relaxed">
              통상 RID 10% 미만이 수유 호환성의 참고 지표로 활용되나, ① 신생아·미숙아의 간/신장 배설 미성숙, ② 긴 반감기(예: 클로르페니라민 12~43시간), ③ 중추신경계 진정 또는 프로락틴 억제(모유량 감소), ④ 영아 장내세균총 변화 등을 반드시 함께 평가해야 합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 수유 중 대체 약물 권고 바 */}
      {lactation.alternativeIngredientIds.length > 0 && (
        <div className="bg-sky-50/80 rounded-2xl border border-sky-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="text-xs font-extrabold text-sky-950">
              수유 중 비교 또는 대체 고려 가능 성분 (LactMed 근거):
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lactation.alternativeIngredientIds.map((altId) => {
              const alt = LACTATION_SAFETY_DB[altId];
              if (!alt) return null;
              return (
                <button
                  key={altId}
                  onClick={() => setActiveIngredientId(altId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>
                    {alt.koreanIngrName} ({alt.englishInn}) — RID: {alt.ridRangeText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
