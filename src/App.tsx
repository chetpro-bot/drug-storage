import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProductHeader } from './components/ProductHeader';
import { IngredientMatrix } from './components/IngredientMatrix';
import { NewProductModal } from './components/NewProductModal';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { useProductStore } from './stores/useProductStore';

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { getSelectedProduct, initRealtimeSubscription } = useProductStore();
  const selectedProduct = getSelectedProduct();

  // Firestore 실시간 리스너 등록
  useEffect(() => {
    const unsubscribe = initRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, [initRealtimeSubscription]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* 1. 글로벌 네비게이션 헤더 */}
      <Header />

      {/* 2. 메인 바디 영역 (좌측 320px 사이드바 + 우측 메인 뷰) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 사이드바 (폭 320px) */}
        <Sidebar onOpenNewProductModal={() => setIsModalOpen(true)} />

        {/* 우측 메인 대시보드 뷰 */}
        <main className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {selectedProduct ? (
            <>
              {/* 상단 헤더: 제품명, 제조사, 분류 배지, 제형, 복용법, 태그 */}
              <ProductHeader product={selectedProduct} />

              {/* 중앙: 유효 성분 매트릭스 테이블 (풀 와이드) */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <IngredientMatrix product={selectedProduct} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              좌측 목록에서 제품을 선택해주세요.
            </div>
          )}
        </main>
      </div>

      {/* 신규 제품 등록 모달 */}
      <NewProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* 배포 시 실시간 업데이트 알림 토스트 */}
      <UpdateNotificationToast />
    </div>
  );
};


