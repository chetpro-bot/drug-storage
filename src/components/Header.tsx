import React, { useState } from 'react';
import { Pill, Settings } from 'lucide-react';
import { APP_VERSION } from '../version';
import { EfficacyClassificationModal } from './EfficacyClassificationModal';
import { SettingsModal } from './SettingsModal';

export const Header: React.FC = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 text-slate-900 px-6 flex items-center justify-between shrink-0 select-none shadow-2xs z-10">
      {/* 좌측: 로고 및 앱 타이틀 */}
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

      {/* 우측: 설정 버튼 */}
      <div className="flex items-center gap-2.5">
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
        onOpenEfficacyClassificationModal={() => {
          setIsSettingsModalOpen(false);
          setIsCategoryModalOpen(true);
        }}
      />

      {/* 약학정보원(KPIC) 약효 분류표 관리 및 수정 모달 */}
      <EfficacyClassificationModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </header>
  );
};
