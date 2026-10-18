import React, { useState, useEffect } from 'react';
import { Pill, Monitor, ShieldCheck, Cloud, RefreshCw, Download, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { useProductStore } from '../stores/useProductStore';
import { APP_VERSION } from '../version';
import { EfficacyClassificationModal } from './EfficacyClassificationModal';

export const Header: React.FC = () => {
  const { isLiveSyncActive, isSyncing } = useProductStore();
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
    <header className="h-14 bg-white border-b border-slate-200/90 text-slate-900 px-6 flex items-center justify-between shrink-0 select-none shadow-2xs z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
          <Pill className="w-5 h-5" />
        </div>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
            PharmAssist Pro
            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
              v{APP_VERSION}
            </span>
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
            약국 영양제 & 일반의약품 상담 카탈로그
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-xs">
        {/* 단독 앱(PWA) 설치 / 상태 버튼 */}
        {!isStandalone ? (
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="브라우저 창 없이 바탕화면 단독 전용 앱으로 설치하기"
          >
            <Download className="w-3.5 h-3.5" />
            <span>💻 단독 앱으로 설치</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>단독 앱(App) 모드 실행 중</span>
          </div>
        )}

        {/* Firebase 실시간 동기화 배지 */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-medium">
          <Cloud className={`w-3.5 h-3.5 ${isLiveSyncActive ? 'text-emerald-600' : 'text-sky-600'}`} />
          <span>Firestore 실시간 동기화</span>
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 text-amber-500 animate-spin ml-0.5" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
          <Monitor className="w-3.5 h-3.5 text-sky-600" />
          <span>1920x1080 와이드 최적화</span>
        </div>
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-bold transition-colors cursor-pointer"
          title="약학정보원(KPIC) 약효 분류표 전체 조회, 성분 검색 및 약효 분류 실시간 수정"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
          <span>약효 분류표 수정</span>
        </button>

        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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

