import React from 'react';
import {
  AlertOctagon,
  ArrowRight,
  Check,
  ExternalLink,
  Layers,
  Scale,
  ShieldAlert
} from 'lucide-react';
import {
  DRUG_MASTER_DB,
  INGREDIENT_MAPPING_DB,
  LACTATION_SAFETY_DB,
  PREGNANCY_SAFETY_DB,
  SAFETY_LEVEL_META,
  getWorstSafetyLevel
} from '../data/verifiedMaternalDb';
import { useMaternalStore } from '../stores/useMaternalStore';
import { SafetySummaryLevel } from '../types/maternalSafety';

export const CombinationDrugView: React.FC = () => {
  const {
    selectedResult,
    activeIngredientId,
    selectedGestationalWeek,
    selectedTrimester,
    selectedInfantAge,
    isPretermInfant,
    selectSearchResult,
    setActiveIngredientId,
    setActiveTab
  } = useMaternalStore();

  const mappings = selectedResult.mappedIngredients;
  const hasUnverifiedComponent = mappings.some((m) => m.verificationStatus !== 'VERIFIED_CORE_5');

  // 개별 성분들의 현재 임신 주수 안전성 및 수유 안전성 수집
  const evaluatedRows = mappings.map((m) => {
    const preg = PREGNANCY_SAFETY_DB[m.ingredientId] || null;
    const lact = LACTATION_SAFETY_DB[m.ingredientId] || null;

    let pregLevel: SafetySummaryLevel = 'LEVEL_5_INSUFFICIENT';
    if (preg) {
      const weekWin = preg.weekSpecificRisks.find(
        (w) => selectedGestationalWeek >= w.startWeek && selectedGestationalWeek <= w.endWeek
      );
      const triLevel =
        selectedTrimester === 'T1'
          ? preg.trimester1Level
          : selectedTrimester === 'T2'
          ? preg.trimester2Level
          : preg.trimester3Level;
      pregLevel = weekWin ? weekWin.level : triLevel;
    }

    let lactLevel: SafetySummaryLevel = 'LEVEL_5_INSUFFICIENT';
    if (lact) {
      lactLevel = isPretermInfant
        ? lact.pretermInfantRisk.level
        : lact.ageConsiderations[selectedInfantAge].level;
    }

    return {
      mapping: m,
      preg,
      lact,
      pregLevel,
      lactLevel
    };
  });

  const overallPregnancyWorst = getWorstSafetyLevel(evaluatedRows.map((r) => r.pregLevel));
  const overallLactationWorst = getWorstSafetyLevel(evaluatedRows.map((r) => r.lactLevel));

  // 샘플 복합제 빠른 불러오기 헬퍼
  const sampleCombinationDrugs = DRUG_MASTER_DB.filter((d) => d.isCombination);

  return (
    <div className="space-y-5">
      {/* 상단: 복합제 빠른 테스트 스위치 & 원칙 안내 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              복합제 전 성분 개별 분리 평가 시스템
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            원칙: <strong>복합제의 일부 성분(예: 아세트아미노펜)만 확인하고 전체 의약품을 안전하다고 판정하지 않습니다.</strong> 포함된 모든 성분을 개별 평가합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">대표 복합감기약 즉시 분석:</span>
          {sampleCombinationDrugs.map((d) => {
            const dMappings = INGREDIENT_MAPPING_DB.filter((m) => m.drugMasterId === d.id);
            const isSelected = selectedResult.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() =>
                  selectSearchResult({
                    resultType: 'DOMESTIC_PRODUCT',
                    id: d.id,
                    displayName: d.koreanProductName,
                    subLabel: `${d.manufacturer} · ${d.dosageForm}`,
                    isCombination: true,
                    drugMaster: d,
                    mappedIngredients: dMappings,
                    primaryIngredientId: dMappings[0]?.ingredientId || 'ing_acetaminophen'
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                }`}
              >
                {d.koreanProductName.split('(')[0].trim()} ({dMappings.length}성분)
              </button>
            );
          })}
        </div>
      </div>

      {/* 미검증 성분 포함 시 최우선 경고 배너 */}
      {hasUnverifiedComponent && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-extrabold text-amber-950">
              ⚠️ 복합제 주의 경고: 일부 성분의 해외 임상 요약이 현재 MVP(5대 핵심 성분) 범위에 포함되지 않았습니다
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>{selectedResult.displayName}</strong>에는 검증 완료된 성분(아세트아미노펜, 클로르페니라민 등) 외에 현재 원문 미등록 성분이 함께 포함되어 있습니다.
              확인된 성분만 보고 본 복합제 전체를 &apos;사용 가능&apos;으로 단정해서는 안 되며, 미등록 성분은 반드시 식약처 허가사항 원문 및 전문 문헌을 개별 확인하십시오.
            </p>
          </div>
        </div>
      )}

      {/* 현재 선택 제품/성분 종합 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-2xl border ${SAFETY_LEVEL_META[overallPregnancyWorst].borderClass} ${SAFETY_LEVEL_META[overallPregnancyWorst].bgClass}`}
        >
          <div className="text-xs font-bold text-slate-600">
            임신 {selectedGestationalWeek}주 ({selectedTrimester}) 기준 복합제 최우선 주의 등급
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${SAFETY_LEVEL_META[overallPregnancyWorst].dotClass}`} />
            <span>{SAFETY_LEVEL_META[overallPregnancyWorst].label}</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">
            포함된 {mappings.length}개 성분 중 가장 주의도가 높은 성분 또는 근거 부족 성분을 기준으로 표시합니다.
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${SAFETY_LEVEL_META[overallLactationWorst].borderClass} ${SAFETY_LEVEL_META[overallLactationWorst].bgClass}`}
        >
          <div className="text-xs font-bold text-slate-600">
            수유부 ({selectedInfantAge === 'NEONATE' ? '신생아' : selectedInfantAge === 'INFANT_1_6M' ? '생후 1~6개월' : '생후 6개월 이상'}
            {isPretermInfant ? ' · 미숙아' : ''}) 기준 복합제 최우선 주의 등급
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${SAFETY_LEVEL_META[overallLactationWorst].dotClass}`} />
            <span>{SAFETY_LEVEL_META[overallLactationWorst].label}</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">
            수유 중 모유량 감소(1세대 항히스타민제/충혈제거제) 또는 RID 미확보 성분이 있는지 개별 확인하십시오.
          </p>
        </div>
      </div>

      {/* 개별 성분 분리 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-sm font-extrabold text-slate-900">
              {selectedResult.displayName} — 구성 유효성분 개별 분석 ({mappings.length}종)
            </span>
          </div>
          {selectedResult.drugMaster && (
            <a
              href={selectedResult.drugMaster.productSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-extrabold text-sky-700 hover:underline"
            >
              <span>식약처 품목 허가증 원문</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-extrabold text-slate-600">
                <th className="py-3 px-4">성분명 (한글 / 영문 INN)</th>
                <th className="py-3 px-3">함량 · 제형</th>
                <th className="py-3 px-3">검증 상태</th>
                <th className="py-3 px-4">임신 {selectedGestationalWeek}주 평가</th>
                <th className="py-3 px-4">수유부 평가 & RID</th>
                <th className="py-3 px-4 text-right">상세 근거 보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {evaluatedRows.map(({ mapping, preg, lact, pregLevel, lactLevel }) => {
                const pMeta = SAFETY_LEVEL_META[pregLevel];
                const lMeta = SAFETY_LEVEL_META[lactLevel];
                const isCurrentActive = activeIngredientId === mapping.ingredientId && mapping.verificationStatus === 'VERIFIED_CORE_5';

                return (
                  <tr
                    key={mapping.mappingId}
                    className={`transition-colors ${
                      isCurrentActive ? 'bg-sky-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{mapping.koreanIngredientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{mapping.englishIngredientName}</div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      <div>{mapping.amountText}</div>
                      <div className="text-[10px] text-slate-500">{mapping.dosageForm}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      {mapping.verificationStatus === 'VERIFIED_CORE_5' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <Check className="w-3 h-3" /> 5대 핵심 검증완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold">
                          <ShieldAlert className="w-3 h-3 text-amber-600" /> 원문 미등록 (근거 부족)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${pMeta.bgClass} ${pMeta.textClass} ${pMeta.borderClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${pMeta.dotClass}`} />
                        {pMeta.label}
                      </span>
                      {preg && (
                        <div className="text-[11px] text-slate-600 mt-1">
                          국내 DUR: {preg.domesticDurGrade}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${lMeta.bgClass} ${lMeta.textClass} ${lMeta.borderClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${lMeta.dotClass}`} />
                        {lMeta.label}
                      </span>
                      <div className="text-[11px] text-slate-600 mt-1">
                        RID: {lact ? lact.ridRangeText : '확인되지 않음'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {mapping.verificationStatus === 'VERIFIED_CORE_5' ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => {
                              setActiveIngredientId(mapping.ingredientId);
                              setActiveTab('PREGNANCY');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-extrabold cursor-pointer"
                          >
                            임신 근거
                          </button>
                          <button
                            onClick={() => {
                              setActiveIngredientId(mapping.ingredientId);
                              setActiveTab('LACTATION');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-extrabold cursor-pointer"
                          >
                            수유 근거
                          </button>
                        </div>
                      ) : (
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/books/NBK501922/?term=${encodeURIComponent(
                            mapping.englishIngredientName
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold"
                        >
                          <span>LactMed 원문 검색</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * 5대 핵심 성분 및 대체 약물 비교 뷰
 */
export const AlternativeDrugCompareView: React.FC = () => {
  const {
    compareIngredientIds,
    selectedGestationalWeek,
    selectedInfantAge,
    isPretermInfant,
    toggleCompareIngredient,
    setActiveIngredientId,
    setActiveTab
  } = useMaternalStore();

  const allCoreIds = Object.keys(PREGNANCY_SAFETY_DB);

  return (
    <div className="space-y-5">
      {/* 비교 대상 성분 선택 바 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              핵심 성분 및 대체 약물 다차원 비교 (임신 주수별 · 국내 DUR · 수유 RID · 반감기)
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            비교할 성분을 클릭하여 선택/해제하십시오. 예: 해열진통제(아세트아미노펜 vs 이부프로펜), 항히스타민제(세티리진 vs 클로르페니라민)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {allCoreIds.map((id) => {
            const p = PREGNANCY_SAFETY_DB[id];
            const isChecked = compareIngredientIds.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleCompareIngredient(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isChecked
                    ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5" />}
                <span>
                  {p.koreanIngrName} ({p.englishInn})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 비교 매트릭스 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-x-auto shadow-2xs">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800">
              <th className="py-3.5 px-4 w-44 bg-slate-100/80">비교 항목</th>
              {compareIngredientIds.map((id) => {
                const p = PREGNANCY_SAFETY_DB[id];
                return (
                  <th key={id} className="py-3.5 px-4 border-l border-slate-200">
                    <div className="text-sm font-extrabold text-slate-900">
                      {p.koreanIngrName} ({p.englishInn})
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {p.therapeuticClass}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {/* 1. 임신 1삼분기 */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                임신 1삼분기 (1~13주)
              </td>
              {compareIngredientIds.map((id) => {
                const p = PREGNANCY_SAFETY_DB[id];
                const m = SAFETY_LEVEL_META[p.trimester1Level];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${m.bgClass} ${m.textClass} ${m.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${m.dotClass}`} />
                      {m.label}
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* 2. 임신 2삼분기 */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                임신 2삼분기 (14~27주)
              </td>
              {compareIngredientIds.map((id) => {
                const p = PREGNANCY_SAFETY_DB[id];
                const m = SAFETY_LEVEL_META[p.trimester2Level];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${m.bgClass} ${m.textClass} ${m.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${m.dotClass}`} />
                      {m.label}
                    </span>
                    {id === 'ing_ibuprofen' && (
                      <div className="text-[11px] font-bold text-rose-700 mt-1">
                        ※ 20주 이후 양수과소증 위험 회피
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* 3. 임신 3삼분기 */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                임신 3삼분기 (28~40주)
              </td>
              {compareIngredientIds.map((id) => {
                const p = PREGNANCY_SAFETY_DB[id];
                const m = SAFETY_LEVEL_META[p.trimester3Level];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${m.bgClass} ${m.textClass} ${m.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${m.dotClass}`} />
                      {m.label}
                    </span>
                    {id === 'ing_ibuprofen' && (
                      <div className="text-[11px] font-bold text-rose-700 mt-1">
                        ※ 30주 이후 태아 동맥관 조기폐쇄 금기
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* 4. 국내 DUR 임부금기 */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                국내 심평원/식약처 DUR
              </td>
              {compareIngredientIds.map((id) => {
                const p = PREGNANCY_SAFETY_DB[id];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200 font-bold text-slate-800">
                    {p.domesticDurGrade}
                  </td>
                );
              })}
            </tr>

            {/* 5. 수유부 안전성 (선택 연령 기준) */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                수유부 안전성 ({selectedInfantAge === 'NEONATE' ? '신생아' : selectedInfantAge === 'INFANT_1_6M' ? '1~6개월' : '6개월 이상'}
                {isPretermInfant ? '·미숙아' : ''})
              </td>
              {compareIngredientIds.map((id) => {
                const l = LACTATION_SAFETY_DB[id];
                const lv = isPretermInfant
                  ? l.pretermInfantRisk.level
                  : l.ageConsiderations[selectedInfantAge].level;
                const m = SAFETY_LEVEL_META[lv];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${m.bgClass} ${m.textClass} ${m.borderClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${m.dotClass}`} />
                      {m.label}
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* 6. RID (상대적 영아 용량) */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                수유 RID (%) (LactMed)
              </td>
              {compareIngredientIds.map((id) => {
                const l = LACTATION_SAFETY_DB[id];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200 font-extrabold text-sky-900">
                    {l.ridRangeText}
                  </td>
                );
              })}
            </tr>

            {/* 7. 반감기 */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">약물 반감기</td>
              {compareIngredientIds.map((id) => {
                const l = LACTATION_SAFETY_DB[id];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200 text-slate-700 leading-relaxed">
                    {l.halfLifeText}
                  </td>
                );
              })}
            </tr>

            {/* 8. 약사 상담 핵심 비교 요약 */}
            <tr>
              <td className="py-3 px-4 font-extrabold text-slate-700 bg-slate-50/60">
                임신·수유 복약지도 핵심
              </td>
              {compareIngredientIds.map((id) => {
                const p = PREGNANCY_SAFETY_DB[id];
                const l = LACTATION_SAFETY_DB[id];
                return (
                  <td key={id} className="py-3 px-4 border-l border-slate-200 space-y-2">
                    <p className="text-slate-700 leading-relaxed">
                      <strong>[임신 {selectedGestationalWeek}주]</strong> {p.clinicalRecommendation}
                    </p>
                    <p className="text-slate-700 leading-relaxed">
                      <strong>[수유]</strong> {l.continuationGuidance}
                    </p>
                    <button
                      onClick={() => {
                        setActiveIngredientId(id);
                        setActiveTab('PREGNANCY');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-sky-700 hover:underline cursor-pointer"
                    >
                      <span>이 성분 상세 화면으로 이동</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
