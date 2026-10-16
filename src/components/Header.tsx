import React, { useState, useEffect } from 'react';
import { Pill, Monitor, ShieldCheck, Cloud, RefreshCw, Download, CheckCircle2, SlidersHorizontal, LayoutGrid, Table2 } from 'lucide-react';
import { useProductStore } from '../stores/useProductStore';
import { APP_VERSION } from '../version';
import { EfficacyClassificationModal } from './EfficacyClassificationModal';

export const Header: React.FC = () => {
  const { isLiveSyncActive, isSyncing, viewMode, setViewMode } = useProductStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    // 이미 독립형 앱(PWA Standalone)으로 실행 중인지 감지
    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isApp);

    // 브라우저 설치 프로모션 이벤트 수신
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 설치 완료 이벤트 수신
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Chrome/Edge/Whale 등에서 안내
      alert(
        '💻 [단독 앱으로 설치하는 방법]\n\n' +
        '1. 브라우저 주소창 오른쪽 끝의 [컴퓨터로 다운로드/앱 설치 💻] 아이콘을 클릭하거나,\n' +
        '2. 브라우저 우측 상단 메뉴(⋮) > [저장 및 공유] > [이 사이트를 앱으로 설치]를 누르시면 바탕화면에 전용 단독 앱이 즉시 생성됩니다!'
      );
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 text-white px-5 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-4">
        <div
          onClick={() => setViewMode('CATALOG')}
          className="flex items-center gap-3 cursor-pointer"
          title="효능별 제품 카탈로그 그리드 홈으로 이동"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-md">
            <Pill className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              PharmAssist Pro
              <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                v{APP_VERSION}
              </span>
            </h1>
          </div>
        </div>

        {/* 화면 모드 전환 탭 (효능별 카탈로그 카드뷰 vs 제품 상세 성분 매트릭스) */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('CATALOG')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'CATALOG'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>효능별 카탈로그 (카드뷰)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('DETAIL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'DETAIL'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>제품 상세 성분표</span>
          </button>
        </div>
      </div>


      <div className="flex items-center gap-2.5 text-xs">
        {/* 단독 앱(PWA) 설치 / 상태 버튼 */}
        {!isStandalone ? (
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold shadow-xs border border-sky-400/40 transition-all active:scale-95"
            title="브라우저 창 없이 바탕화면 단독 전용 앱으로 설치하기"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>💻 단독 앱으로 설치</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/70 border border-indigo-700 text-indigo-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>단독 앱(App) 모드 실행 중</span>
          </div>
        )}

        {/* Firebase 실시간 동기화 배지 */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700 text-slate-300">
          <Cloud className={`w-3.5 h-3.5 ${isLiveSyncActive ? 'text-emerald-400' : 'text-sky-400'}`} />
          <span>Firestore 실시간 동기화</span>
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin ml-0.5" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span>1920x1080 와이드 최적화</span>
        </div>
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700 text-sky-300 hover:text-white font-medium transition-colors cursor-pointer shadow-2xs"
          title="약학정보원(KPIC) 약효 분류표 전체 조회, 성분 검색 및 약효 분류 실시간 수정"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
          <span>약효 분류표 수정</span>
        </button>

        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>약학정보원(KPAIC) 공식 데이터 연동</span>
        </div>
      </div>

      {/* 약학정보원(KPIC) 약효 분류표 관리 및 수정 모달 */}
      <EfficacyClassificationModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </header>
  );
};

