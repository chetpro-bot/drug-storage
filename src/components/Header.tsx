import { Pill, Activity, Monitor, ShieldCheck, Cloud, RefreshCw } from 'lucide-react';
import { useProductStore } from '../stores/useProductStore';
import { APP_VERSION } from '../version';

export const Header: React.FC = () => {
  const { isLiveSyncActive, isSyncing } = useProductStore();

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 text-white px-5 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3">
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
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
            약국 영양제 & OTC 복약 상담 대시보드
          </span>
        </div>
      </div>


      <div className="flex items-center gap-3 text-xs">
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
        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>KDRIs 2020 & 식약처·약학정보원(KPAIC) 연동</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>상담 엔진: 활성</span>
        </div>
      </div>
    </header>
  );
};

