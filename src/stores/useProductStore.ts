import { create } from 'zustand';
import { ProductItem } from '../types/product';
import { ProductClassification } from '../types/classification';
import { MOCK_PRODUCTS } from '../constants/mockProducts';
import { 
  subscribeToProducts, 
  saveProductToFirestore, 
  deleteProductFromFirestore 
} from '../services/firestoreService';
import { isLiveFirebaseConfigured } from '../services/firebase';

interface ProductState {
  products: ProductItem[];
  selectedProductId: string | null;
  searchQuery: string;
  classificationFilter: ProductClassification | 'ALL';
  selectedTag: string | null;
  isLiveSyncActive: boolean;
  isSyncing: boolean;

  // Actions
  setSelectedProductId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setClassificationFilter: (filter: ProductClassification | 'ALL') => void;
  setSelectedTag: (tag: string | null) => void;
  
  // Realtime Cloud Init
  initRealtimeSubscription: () => () => void;

  // Cloud CRUD
  addProduct: (product: ProductItem) => Promise<void>;
  updateProduct: (id: string, partial: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Getters
  getFilteredProducts: () => ProductItem[];
  getSelectedProduct: () => ProductItem | undefined;
}

const LOCAL_STORAGE_KEY = 'pharmassist_products_v1';
const DELETED_IDS_KEY = 'pharmassist_deleted_ids_v1';

function getDeletedIds(): Set<string> {
  try {
    const saved = localStorage.getItem(DELETED_IDS_KEY);
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('삭제 목록 로드 실패:', e);
  }
  return new Set();
}

function markDeletedId(id: string) {
  try {
    const ids = getDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('삭제 목록 저장 실패:', e);
  }
}

function unmarkDeletedId(id: string) {
  try {
    const ids = getDeletedIds();
    if (ids.has(id)) {
      ids.delete(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
    }
  } catch (e) {
    console.warn('삭제 목록 갱신 실패:', e);
  }
}

function getInitialProducts(): ProductItem[] {
  const deletedIds = getDeletedIds();
  let loadedProducts: ProductItem[] = [];

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedProducts = parsed.filter((p: ProductItem) => !deletedIds.has(p.id));
      }
    }
  } catch (e) {
    console.warn('로컬스토리지 로드 실패:', e);
  }

  // 만약 기존에 캐시된 비맥스제트정의 성분이 21개 미만(구버전 8개)이라면 최신 규격(21개)으로 자동 갱신
  const bmaxMock = MOCK_PRODUCTS.find((p) => p.id === 'prod_bmax_jet');
  if (bmaxMock) {
    const bmaxIdx = loadedProducts.findIndex((p) => p.id === 'prod_bmax_jet');
    if (bmaxIdx !== -1 && loadedProducts[bmaxIdx].ingredients.length < 21) {
      loadedProducts[bmaxIdx] = bmaxMock;
    }
  }

  // 만약 기존에 캐시된 마이타민업의 성분이 구버전(1일 환산 수치 오류)이라면 최신 정정 규격으로 자동 갱신
  const mytaminMock = MOCK_PRODUCTS.find((p) => p.id === 'prod_mytamin_up');
  if (mytaminMock) {
    const mytaminIdx = loadedProducts.findIndex((p) => p.id === 'prod_mytamin_up');
    if (mytaminIdx !== -1 && loadedProducts[mytaminIdx].ingredients[0].rawAmount > 30) {
      loadedProducts[mytaminIdx] = mytaminMock;
    }
  }

  // 사용자가 명시적으로 삭제하지 않은 초기 기본 목업 제품들이 누락되어 있다면 자동 복원
  const existingIds = new Set(loadedProducts.map((p) => p.id));
  const missingMocks = MOCK_PRODUCTS.filter(
    (p) => !deletedIds.has(p.id) && !existingIds.has(p.id)
  );

  const combined = [...loadedProducts, ...missingMocks];
  persistToLocal(combined);
  return combined;
}

function persistToLocal(products: ProductItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('로컬스토리지 저장 실패:', e);
  }
}

export const useProductStore = create<ProductState>((set, get) => {
  const initialProducts = getInitialProducts();

  return {
    products: initialProducts,
    selectedProductId: initialProducts[0]?.id || null,
    searchQuery: '',
    classificationFilter: 'ALL',
    selectedTag: null,
    isLiveSyncActive: isLiveFirebaseConfigured(),
    isSyncing: false,

    setSelectedProductId: (id) => set({ selectedProductId: id }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setClassificationFilter: (filter) => set({ classificationFilter: filter }),
    setSelectedTag: (tag) => set({ selectedTag: tag }),

    initRealtimeSubscription: () => {
      set({ isSyncing: true });
      const unsubscribe = subscribeToProducts((firestoreList) => {
        const deletedIds = getDeletedIds();
        const currentProducts = get().products;

        // 1. Firestore에서 들어온 목록 중 사용자가 명시적으로 삭제한 ID 제외
        const validFromFirestore = firestoreList.filter((p) => !deletedIds.has(p.id));

        // 2. 현재 로컬에 등록되어 있는 제품들과 안전하게 병합 (클라우드 단일 조회로 로컬 품목이 유실되는 현상 원천 방지)
        const mergedMap = new Map<string, ProductItem>();

        // 우선 현재 로컬 제품들을 맵에 등록
        currentProducts.forEach((p) => {
          if (!deletedIds.has(p.id)) {
            mergedMap.set(p.id, p);
          }
        });

        // Firestore에서 온 제품들 반영 (최신 변경사항 반영)
        validFromFirestore.forEach((p) => {
          mergedMap.set(p.id, p);
        });

        // 등록/수정일시 최신순으로 정렬
        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );

        // 로컬에만 있고 Firestore에는 아직 저장되지 않은 제품들은 백그라운드로 보강 동기화
        const firestoreIds = new Set(validFromFirestore.map((p) => p.id));
        mergedList.forEach((prod) => {
          if (!firestoreIds.has(prod.id)) {
            saveProductToFirestore(prod).catch(() => {});
          }
        });

        persistToLocal(mergedList);
        set((state) => ({
          products: mergedList,
          isSyncing: false,
          selectedProductId: state.selectedProductId || mergedList[0]?.id || null
        }));
      });
      return unsubscribe;
    },

    addProduct: async (product) => {
      unmarkDeletedId(product.id);
      const next = [product, ...get().products.filter((p) => p.id !== product.id)];
      persistToLocal(next);
      set({ products: next, selectedProductId: product.id });
      try {
        await saveProductToFirestore(product);
      } catch (e) {
        console.warn('Firestore 저장 비동기 처리 알림:', e);
      }
    },

    updateProduct: async (id, partial) => {
      const { products } = get();
      const target = products.find((p) => p.id === id);
      if (!target) return;

      const updated = { ...target, ...partial, updatedAt: new Date().toISOString() };
      const next = products.map((p) => (p.id === id ? updated : p));
      persistToLocal(next);
      set({ products: next });

      try {
        await saveProductToFirestore(updated);
      } catch (e) {
        console.warn('Firestore 업데이트 비동기 처리 알림:', e);
      }
    },

    deleteProduct: async (id) => {
      markDeletedId(id);
      const next = get().products.filter((p) => p.id !== id);
      persistToLocal(next);
      set((state) => ({
        products: next,
        selectedProductId:
          state.selectedProductId === id ? next[0]?.id || null : state.selectedProductId
      }));

      try {
        await deleteProductFromFirestore(id);
      } catch (e) {
        console.warn('Firestore 삭제 비동기 처리 알림:', e);
      }
    },


  getFilteredProducts: () => {
    const { products, searchQuery, classificationFilter, selectedTag } = get();
    const query = searchQuery.trim().toLowerCase();

    return products.filter((item) => {
      if (classificationFilter !== 'ALL' && item.classification !== classificationFilter) {
        return false;
      }
      if (selectedTag && !item.tags.includes(selectedTag)) {
        return false;
      }
      if (!query) return true;

      const matchName = item.productName.toLowerCase().includes(query);
      const matchManufacturer = item.manufacturer.toLowerCase().includes(query);
      const matchIngredients = item.ingredients.some(
        (ing) =>
          ing.englishInn.toLowerCase().includes(query) ||
          ing.noteKorean?.toLowerCase().includes(query)
      );
      const matchBarcode = item.barcode?.includes(query);

      return matchName || matchManufacturer || matchIngredients || Boolean(matchBarcode);
    });
  },

  getSelectedProduct: () => {
    const { products, selectedProductId } = get();
    return products.find((p) => p.id === selectedProductId);
  },
};
});

