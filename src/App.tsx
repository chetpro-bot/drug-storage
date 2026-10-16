import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductCatalogGrid } from './components/ProductCatalogGrid';
import { ProductDetailModal } from './components/ProductDetailModal';
import { NewProductModal } from './components/NewProductModal';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { useProductStore } from './stores/useProductStore';
import { ProductItem } from './types/product';

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const { products, initRealtimeSubscription } = useProductStore();

  // 현재 상세 팝업에 표시할 최신 제품 데이터 조회
  const detailProduct = React.useMemo(
    () => products.find((p) => p.id === detailProductId) || null,
    [products, detailProductId]
  );

  // Firestore 실시간 리스너 등록
  useEffect(() => {
    const unsubscribe = initRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, [initRealtimeSubscription]);

  // ESC 키로 상세 팝업 닫기 지원
  useEffect(() => {
    if (!detailProductId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isModalOpen) {
        setDetailProductId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailProductId, isModalOpen]);

  const handleOpenNewProductModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditProductModal = (product: ProductItem) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-900 overflow-hidden select-none">
      {/* 1. 글로벌 네비게이션 헤더 */}
      <Header />

      {/* 2. 풀 와이드 메인 카탈로그 뷰 (좌측 사이드바 제거로 넓은 화면 활용) */}
      <main className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
        <ProductCatalogGrid
          onOpenNewProductModal={handleOpenNewProductModal}
          onSelectProduct={(product) => setDetailProductId(product.id)}
          onEditProduct={handleOpenEditProductModal}
        />
      </main>

      {/* 3. 제품 카드 클릭 시 뜨는 상세 정보 팝업 모달 (복용 방법, 표시 함량, 기능성 3열 카드, 주의사항) */}
      <ProductDetailModal
        product={detailProduct}
        isOpen={!!detailProduct}
        onClose={() => setDetailProductId(null)}
        onEditProduct={handleOpenEditProductModal}
      />

      {/* 4. 신규 제품 등록 / 기존 제품 수정 모달 */}
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


