import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProductHeader } from './components/ProductHeader';
import { IngredientMatrix } from './components/IngredientMatrix';
import { ClinicalSafetyPanel } from './components/ClinicalSafetyPanel';
import { NewProductModal } from './components/NewProductModal';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { useProductStore } from './stores/useProductStore';
import { useConsultationStore } from './stores/useConsultationStore';
import { FileText, Stethoscope, X, Printer } from 'lucide-react';


export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConsultationDrawer, setShowConsultationDrawer] = useState(false);

  const { getSelectedProduct, initRealtimeSubscription } = useProductStore();
  const selectedProduct = getSelectedProduct();

  // Firestore 실시간 리스너 등록
  useEffect(() => {
    const unsubscribe = initRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, [initRealtimeSubscription]);

  const {
    patient,
    regimenItems,
    generatePatientHandout,
    getDetectedInteractions
  } = useConsultationStore();

  const detectedAlerts = getDetectedInteractions();


  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* 1. 글로벌 네비게이션 헤더 */}
      <Header />

      {/* 2. 메인 바디 영역 (좌측 320px 사이드바 + 우측 2단/3단 스플릿 패널) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 사이드바 (폭 320px) */}
        <Sidebar onOpenNewProductModal={() => setIsModalOpen(true)} />

        {/* 우측 메인 대시보드 뷰 */}
        <main className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {selectedProduct ? (
            <>
              {/* 상단 헤더: 제품명, 제조사, 분류 배지, 제형, 복용법, 태그 */}
              <ProductHeader product={selectedProduct} />

              {/* 중앙 스플릿 뷰: [성분 매트릭스] (좌) + [KDRIs 및 임상 안전 패널] (우) */}
              <div className="flex-1 p-4 flex gap-4 overflow-hidden">
                {/* 중앙 좌측: 기능별 성분 매트릭스 테이블 */}
                <IngredientMatrix product={selectedProduct} />

                {/* 중앙 우측: KDRIs 권장섭취량/상한섭취량 및 DDI 알림 패널 */}
                <ClinicalSafetyPanel product={selectedProduct} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              좌측 목록에서 제품을 선택해주세요.
            </div>
          )}

          {/* 하단 플로팅 복약 상담 액션 바 */}
          <div className="h-11 bg-slate-900 border-t border-slate-800 px-5 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-sky-400">
                <Stethoscope className="w-4 h-4" />
                <span>실시간 복약 상담 세션:</span>
              </span>
              <span className="text-slate-300">
                환자: <strong className="text-white">{patient.name || '방문 고객'}</strong> (만 {patient.age}세)
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">
                조합 영양제: <strong className="text-sky-300">{regimenItems.length}종</strong> 담김
              </span>
              {detectedAlerts.length > 0 && (
                <span className="bg-rose-900/80 text-rose-300 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-700 animate-pulse">
                  DDI(Drug-Drug Interaction) 주의 {detectedAlerts.length}건
                </span>
              )}
            </div>

            <button
              onClick={() => setShowConsultationDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition-all shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>환자용 맞춤 복약지도서 미리보기</span>
            </button>
          </div>
        </main>
      </div>

      {/* 신규 제품 등록 모달 */}
      <NewProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* 복약 상담 지도서 미리보기 모달 */}
      {showConsultationDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col border border-slate-300 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  약국 고객 맞춤 복약 상담 안내문 (인쇄·출력용)
                </h3>
              </div>
              <button
                onClick={() => setShowConsultationDrawer(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-slate-800 bg-slate-50/50 whitespace-pre-wrap leading-relaxed border-b border-slate-200">
              {generatePatientHandout()}
            </div>

            <div className="p-3.5 bg-white flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">
                * 약학정보원(KPAIC) 및 보건복지부 2020 KDRIs 기준 데이터
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConsultationDrawer(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                >
                  닫기
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>인쇄하기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 배포 시 실시간 업데이트 알림 토스트 */}
      <UpdateNotificationToast />
    </div>
  );
};

