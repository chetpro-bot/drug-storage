import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ExternalLink,
  Globe,
  RefreshCw
} from 'lucide-react';
import { EvidenceSourceRecord } from '../types/maternalSafety';
import { fetchLiveOpenFdaLabel } from '../services/maternalSearchService';

interface EvidenceSourcesPanelProps {
  sources: EvidenceSourceRecord[];
  englishInn?: string;
}

export const EvidenceSourcesPanel: React.FC<EvidenceSourcesPanelProps> = ({
  sources,
  englishInn
}) => {
  const [liveFdaData, setLiveFdaData] = useState<{
    pregnancyText: string | null;
    lactationText: string | null;
    effectiveTime: string | null;
  } | null>(null);
  const [isLoadingFda, setIsLoadingFda] = useState(false);

  const handleLoadLiveOpenFda = async () => {
    if (!englishInn || isLoadingFda) return;
    setIsLoadingFda(true);
    try {
      const data = await fetchLiveOpenFdaLabel(englishInn);
      setLiveFdaData(data);
    } finally {
      setIsLoadingFda(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-extrabold text-slate-900">
              원문 근거 문헌 및 공식 데이터베이스 출처 (Evidence Sources · 총 {sources.length}건)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            모든 평가 항목은 검증된 원문 자료에 기반하며 연구 설계, 대상, 규모, 한계점 및 최종 검증일을 투명하게 공개합니다.
          </p>
        </div>

        {englishInn && (
          <button
            onClick={handleLoadLiveOpenFda}
            disabled={isLoadingFda}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-2xs transition-all cursor-pointer shrink-0"
          >
            {isLoadingFda ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>미국 FDA openFDA 라벨 원문 실시간 조회 ({englishInn})</span>
          </button>
        )}
      </div>

      {/* 실시간 openFDA 라벨 원문 표시 영역 */}
      {liveFdaData && (
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-extrabold text-sky-300">
              [실시간 openFDA API 응답 원문] {englishInn} — Pregnancy & Lactation Label
            </span>
            <button
              onClick={() => setLiveFdaData(null)}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>
          {liveFdaData.pregnancyText && (
            <div>
              <div className="font-bold text-amber-300 mb-0.5">■ FDA Pregnancy Section:</div>
              <p className="text-slate-200 leading-relaxed max-h-40 overflow-y-auto pr-2">
                {liveFdaData.pregnancyText}
              </p>
            </div>
          )}
          {liveFdaData.lactationText && (
            <div>
              <div className="font-bold text-emerald-300 mb-0.5">■ FDA Lactation / Nursing Mothers Section:</div>
              <p className="text-slate-200 leading-relaxed max-h-40 overflow-y-auto pr-2">
                {liveFdaData.lactationText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Evidence Sources 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {sources.map((src) => (
          <div
            key={src.sourceId}
            className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-300 text-[11px] font-extrabold text-slate-800">
                  {src.organizationName}
                </span>
                <a
                  href={src.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-sky-700 hover:text-sky-900 hover:underline shrink-0"
                >
                  <span>공식 원문 링크</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                {src.documentTitle}
              </h4>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-500">연구 설계: </span>
                  <span className="text-slate-800 font-semibold">{src.studyDesign}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">연구 대상/규모: </span>
                  <span className="text-slate-800 font-semibold">
                    {src.studySubjects} ({src.studyScale})
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">핵심 결과: </strong>
                {src.keyFindings}
              </div>

              <div className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/70">
                <strong className="text-amber-900">연구의 한계: </strong>
                {src.studyLimitations}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 출판/개정: {src.publishedDate}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle className="w-3 h-3" /> 수집: {src.collectedDate} · 최종검증: {src.lastVerifiedDate}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
