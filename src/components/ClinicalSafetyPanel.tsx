import React from 'react';
import { ProductItem } from '../types/product';
import { MOCK_KDRI_STANDARDS } from '../constants/kdri2020';
import { CLINICAL_DDI_RULES } from '../constants/ddiRules';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  Info, 
  ClockAlert
} from 'lucide-react';


interface ClinicalSafetyPanelProps {
  product: ProductItem;
}

export const ClinicalSafetyPanel: React.FC<ClinicalSafetyPanelProps> = ({ product }) => {
  // 제품에 포함된 성분 중 KDRIs 매핑 가능한 항목 계산
  const kdriItems = product.ingredients
    .filter((ing) => Boolean(ing.standardKey))
    .map((ing) => {
      const kdriRef = MOCK_KDRI_STANDARDS.find((k) => k.nutrientKey === ing.standardKey);
      if (!kdriRef) return null;

      let effectiveUl = kdriRef.ul;
      let effectiveNameKorean = kdriRef.nutrientNameKorean;
      let effectiveWarningNote = kdriRef.clinicalWarningThresholdNote;

      // 비타민 B3(니아신) 원료 형태별 상한섭취량(UL) 분기 처리 (기본 850mg, 산 형태인 경우 35mg)
      if (ing.standardKey === 'VITAMIN_B3') {
        const checkStr = `${ing.englishInn || ''} ${ing.koreanName || ''} ${ing.chemicalFormName || ''}`.toLowerCase();
        const isNicotinicAcid =
          (checkStr.includes('nicotinic acid') ||
            checkStr.includes('nicotinicacid') ||
            (checkStr.includes('니코틴산') && !checkStr.includes('아미드'))) &&
          !checkStr.includes('nicotinamide') &&
          !checkStr.includes('niacinamide') &&
          !checkStr.includes('아미드');

        if (isNicotinicAcid) {
          effectiveUl = 35;
          effectiveNameKorean = '니아신 (니코틴산)';
          effectiveWarningNote =
            '니코틴산(Nicotinic acid) 성인 상한 35mg NE/일 초과 시 혈관확장·안면홍조(Flushing) 및 가려움증 유발 위험';
        } else {
          effectiveUl = 850;
          effectiveNameKorean = '니아신 (비타민 B3)';
          effectiveWarningNote =
            '니코틴산아미드(Nicotinamide) 성인 상한 850mg NE/일 초과 시 간독성 및 위장장애 위험 (참고: 니코틴산은 상한 35mg)';
        }
      }

      const isPerDaily =
        product.ingredientBasis === 'PER_DAILY' || product.classification === 'HEALTH_FUNCTIONAL_FOOD';
      const dailyAmount = isPerDaily
        ? (ing.elementalAmount ?? ing.rawAmount)
        : (ing.elementalAmount ?? ing.rawAmount) * (product.dailyServings || 1);
      const rniPercent = Math.round((dailyAmount / kdriRef.rni) * 100);
      const isUlExceeded = effectiveUl ? dailyAmount > effectiveUl : false;
      const isUlApproaching = effectiveUl ? dailyAmount >= effectiveUl * 0.8 && !isUlExceeded : false;

      return {
        key: ing.standardKey!,
        nameKorean: effectiveNameKorean,
        englishInn: ing.englishInn,
        dailyAmount,
        unit: ing.unit,
        rni: kdriRef.rni,
        ul: effectiveUl,
        rniPercent,
        isUlExceeded,
        isUlApproaching,
        warningNote: effectiveWarningNote
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // 이 제품의 성분과 매칭되는 DDI(Drug-Drug Interaction) 룰 탐색
  const matchedDdiRules = CLINICAL_DDI_RULES.filter((rule) => {
    return product.ingredients.some((ing) =>
      rule.triggerSupplementIngredients.some(
        (trigger) => trigger.toLowerCase() === ing.englishInn.toLowerCase()
      )
    );
  });

  return (
    <div className="w-[440px] bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs overflow-hidden shrink-0">
      {/* 패널 헤더 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            KDRIs 기준치 & 임상 안전 패널
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
          한국 성인(19~64세) 기준
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. KDRIs 권장섭취량(RNI) & 상한섭취량(UL) 바 차트 영역 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>권장섭취량(RNI: Recommended Nutrient Intake) 대비 충족률</span>
            </h4>
            <span className="text-[11px] text-slate-400">2025 KDRIs 기준</span>
          </div>

          <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            {kdriItems.map((item, idx) => {
              // 프로그레스 바 너비 (최대 100%로 시각화하되 초과분은 수치 강조)
              const barWidth = Math.min(item.rniPercent, 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[190px]">
                      {item.nameKorean}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500">
                        {item.dailyAmount}{item.unit} / RNI {item.rni}{item.unit}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          item.rniPercent >= 100
                            ? 'text-sky-700'
                            : 'text-amber-600'
                        }`}
                      >
                        {item.rniPercent}%
                      </span>
                    </div>
                  </div>

                  {/* 프로그레스 바 */}
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        item.isUlExceeded
                          ? 'bg-rose-500'
                          : item.rniPercent > 200
                          ? 'bg-sky-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* 상한섭취량(UL: Tolerable Upper Intake Level) 통과 배지 */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.englishInn}
                    </span>
                    {item.ul ? (
                      item.isUlExceeded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertOctagon className="w-2.5 h-2.5 text-rose-600" />
                          UL {item.ul}{item.unit} 초과 경고
                        </span>
                      ) : item.isUlApproaching ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          UL {item.ul}{item.unit} 근접 주의
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                          UL {item.ul}{item.unit} 안전 통과
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        수용성 (UL 미설정 안전군)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 주요 처방약 상호작용(DDI: Drug-Drug Interaction) 알림 박스 */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ClockAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>주요 처방약 상호작용(DDI) 알림 박스</span>
            </h4>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              {matchedDdiRules.length}건 감지됨
            </span>
          </div>

          <div className="space-y-2.5">
            {matchedDdiRules.length === 0 ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>주요 처방약물군과 즉각적인 상호작용 주의 룰이 감지되지 않았습니다.</span>
              </div>
            ) : (
              matchedDdiRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-rose-950 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      {rule.titleKorean}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-900 shrink-0">
                      {rule.severity === 'MAJOR' ? '중대 주의' : '중등도 주의'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 bg-white/80 p-2 rounded border border-rose-100 space-y-1">
                    <div className="font-semibold text-slate-900">
                      대상 처방 의약품(ETC): <span className="text-rose-700">{rule.targetPrescriptionClass}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {rule.clinicalDescriptionKorean}
                    </p>
                  </div>

                  <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900">
                    <span className="font-bold block mb-0.5">💡 복약 지도 가이드:</span>
                    {rule.managementGuidelineKorean}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3. 복약 지도 핵심 코멘트 요약 */}
        <section className="bg-sky-50/80 border border-sky-200 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-sky-900 font-bold">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>임상 약사 복약상담 TIP</span>
          </div>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            {product.classification === 'OTC_DRUG'
              ? '• 일반의약품(OTC) 고함량 활성비타민은 위산 분비 시 흡수율이 높아지므로 위장장애 예방을 위해 식후 즉시 복용을 권장합니다.'
              : '• 성장기 어린이 액상 제형은 흡수가 빠르며, 미네랄 흡수 방해를 피하기 위해 우유나 유제품 섭취와 1시간 이상 간격을 두는 것이 좋습니다.'}
          </p>
        </section>
      </div>
    </div>
  );
};
