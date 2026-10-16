import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProductHeader } from './components/ProductHeader';
import { IngredientMatrix } from './components/IngredientMatrix';
import { ProductCatalogGrid } from './components/ProductCatalogGrid';
import { NewProductModal } from './components/NewProductModal';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { useProductStore } from './stores/useProductStore';
import { ProductItem } from './types/product';

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const { getSelectedProduct, initRealtimeSubscription, viewMode, setViewMode } = useProductStore();
  const selectedProduct = getSelectedProduct();

  // Firestore 실시간 리스너 등록
  useEffect(() => {
    const unsubscribe = initRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, [initRealtimeSubscription]);

  const handleOpenNewProductModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditProductModal = (product: ProductItem) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* 1. 글로벌 네비게이션 헤더 */}
      <Header />

      {/* 2. 메인 바디 영역 (좌측 320px 사이드바 + 우측 메인 뷰) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 사이드바 (폭 320px) */}
        <Sidebar onOpenNewProductModal={handleOpenNewProductModal} />

        {/* 우측 메인 대시보드 뷰: 카탈로그 카드 그리드 뷰 vs 제품 상세 분석 뷰 */}
        <main className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {viewMode === 'CATALOG' ? (
            <ProductCatalogGrid
              onOpenNewProductModal={handleOpenNewProductModal}
              onEditProduct={handleOpenEditProductModal}
            />
          ) : selectedProduct ? (
            <>
              {/* 상단 헤더: 제품명, 제조사, 분류 배지, 제형, 복용법, 약 위치, 가격, 태그 */}
              <ProductHeader product={selectedProduct} />

              {/* 중앙: 유효 성분 매트릭스 테이블 (풀 와이드) */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <IngredientMatrix product={selectedProduct} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <p>좌측 목록에서 제품을 선택하거나 카탈로그 뷰에서 제품을 클릭해주세요.</p>
              <button
                onClick={() => setViewMode('CATALOG')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                효능별 카탈로그 보기로 이동
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 신규 제품 등록 / 기존 제품 수정 모달 */}
      <NewProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />

      {/* 배포 시 실시간 업데이트 알림 토스트 */}
      <UpdateNotificationToast />
    </div>
  );
};


