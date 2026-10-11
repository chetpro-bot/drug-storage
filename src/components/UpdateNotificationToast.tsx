import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const UpdateNotificationToast: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // 버전 체크 함수
  const checkForUpdates = async () => {
    try {
      // 캐시 방지용 타임스탬프 쿼리
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data?.version && data.version !== APP_VERSION) {
        setLatestVersion(data.version);
        setHasUpdate(true);
      }
    } catch {
      // 오프라인이거나 개발 모드일 때 조용히 패스
    }
  };

  useEffect(() => {
    // 1. 처음 마운트 시 3초 후 1차 체크
    const initialTimer = setTimeout(checkForUpdates, 3000);

    // 2. 주기적 체크 (40초마다)
    const intervalTimer = setInterval(checkForUpdates, 40000);

    // 3. 사용자가 다른 창을 보다가 이 탭으로 돌아왔을 때 즉시 체크
    const handleFocus = () => {
      checkForUpdates();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (!hasUpdate || isDismissed) return null;

  const handleApplyUpdate = () => {
    // 브라우저 캐시 무시 강제 새로고침
    window.location.reload();
  };

  return (
    <div className="fixed bottom-14 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-sky-500/40 rounded-2xl p-4 shadow-2xl max-w-sm flex items-start gap-3.5 ring-4 ring-sky-500/10">
        <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>새로운 버전 배포 알림</span>
              <span className="text-[10px] font-mono font-bold bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded">
                v{latestVersion}
              </span>
            </h4>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug">
            최신 약학 데이터와 대시보드 개선 사항이 배포되었습니다. 지금 새로고침하여 적용하시겠습니까?
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleApplyUpdate}
              className="flex-1 py-1.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>지금 새로고침</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="py-1.5 px-2.5 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
