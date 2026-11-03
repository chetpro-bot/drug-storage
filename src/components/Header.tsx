import React, { useState } from 'react';
import { Pill, Settings, Cloud, CloudOff, RefreshCw, HeartPulse, LayoutGrid } from 'lucide-react';
import { APP_VERSION } from '../version';
import { SettingsModal } from './SettingsModal';
import { useProductStore } from '../stores/useProductStore';
import { useMaternalStore } from '../features/maternal-safety/stores/useMaternalStore';

export const Header: React.FC = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { isLiveSyncActive, isSyncing, syncNow } = useProductStore();
  const { workspaceMode, setWorkspaceMode } = useMaternalStore();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      await syncNow();
      setSyncFeedback('동기화 완료');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (e) {
      setSyncFeedback('동기화 실패');
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 text-slate-900 px-6 flex items-center justify-between shrink-0 select-none shadow-2xs z-10">
      {/* 좌측: 로고 및 앱 타이틀 */}
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs transition-colors ${
            workspaceMode === 'MATERNAL_SAFETY' ? 'bg-rose-600' : 'bg-sky-600'
          }`}
        >
          {workspaceMode === 'MATERNAL_SAFETY' ? (
            <HeartPulse className="w-5 h-5" />
          ) : (
            <Pill className="w-5 h-5" />
          )}
        </div>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
            PharmAssist Pro
            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
              v{APP_VERSION}
            </span>
          </h1>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-md border hidden md:inline-block ${
              workspaceMode === 'MATERNAL_SAFETY'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}
          >
            {workspaceMode === 'MATERNAL_SAFETY'
              ? '약국용 임신·수유부 약물 안전성 대시보드'
              : '약국 영양제 & 일반의약품 상담 카탈로그'}
          </span>
        </div>
      </div>

      {/* 우측: 화면 전환 스위치(영양제 대시보드 ↔ 임신·수유부 안전성) + 클라우드 동기화 + 설정 버튼 */}
      <div className="flex items-center gap-2.5">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/90 shadow-2xs">
          <button
            onClick={() => setWorkspaceMode('NUTRITION_CATALOG')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              workspaceMode === 'NUTRITION_CATALOG'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="기존 영양제 및 일반의약품 상담 카탈로그 화면으로 전환"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>영양제·OTC 대시보드</span>
          </button>

          <button
            onClick={() => setWorkspaceMode('MATERNAL_SAFETY')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              workspaceMode === 'MATERNAL_SAFETY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
            title="임신부 및 수유부 처방 적정성·약물 안전성 대시보드 화면으로 전환"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>임신·수유부 안전성</span>
          </button>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 ${
            isSyncing
              ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-wait'
              : isLiveSyncActive
              ? 'bg-emerald-50 hover:bg-emerald-100/90 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 hover:bg-rose-100/90 border-rose-200 text-rose-700'
          }`}
          title={
            isSyncing
              ? '서버와 제품 데이터를 동기화하는 중입니다...'
              : isLiveSyncActive
              ? '약국 PC ↔ 자택 PC 실시간 클라우드 동기화 연결됨 (클릭하여 지금 즉시 새로고침)'
              : '클라우드 동기화 미연결 (클릭하여 재연결 시도)'
          }
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
          ) : isLiveSyncActive ? (
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span className="text-[11px]">
            {isSyncing
              ? '동기화 중...'
              : syncFeedback || (isLiveSyncActive ? '실시간 동기화됨' : '로컬 모드')}
          </span>
          <span className="text-[10px] text-slate-400 font-normal ml-0.5 hidden sm:inline">
            (새로고침 ↻)
          </span>
        </button>

        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300/80 text-slate-700 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          title="설정 (약효분류표 수정, 제품 태그 관리, 엑셀 대량 품목 등록)"
        >
          <Settings className="w-4 h-4 text-slate-600" />
          <span>설정</span>
        </button>
      </div>

      {/* 설정 모달 (약효분류표 수정, 제품 태그 관리, 엑셀 대량 품목 등록) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </header>
  );
};
