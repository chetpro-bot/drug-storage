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

function getInitialProducts(): ProductItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('로컬스토리지 로드 실패:', e);
  }
  return MOCK_PRODUCTS;
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
      const unsubscribe = subscribeToProducts((updatedList) => {
        // Firestore에서 실시간 목록이 들어오면 로컬스토리지도 동기화
        persistToLocal(updatedList);
        set((state) => ({
          products: updatedList,
          isSyncing: false,
          selectedProductId: state.selectedProductId || updatedList[0]?.id || null
        }));
      });
      return unsubscribe;
    },

    addProduct: async (product) => {
      const next = [product, ...get().products.filter(p => p.id !== product.id)];
      persistToLocal(next);
      set({ products: next });
      try {
        await saveProductToFirestore(product);
      } catch (e) {
        console.error('Firestore 저장 에러:', e);
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
        console.error('Firestore 업데이트 에러:', e);
      }
    },

    deleteProduct: async (id) => {
      const next = get().products.filter((p) => p.id !== id);
      persistToLocal(next);
      set((state) => ({
        products: next,
        selectedProductId: state.selectedProductId === id ? (next[0]?.id || null) : state.selectedProductId
      }));

      try {
        await deleteProductFromFirestore(id);
      } catch (e) {
        console.error('Firestore 삭제 에러:', e);
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

