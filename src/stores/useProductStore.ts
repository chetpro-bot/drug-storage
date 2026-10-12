import { create } from 'zustand';
import { ProductItem } from '../types/product';
import { ProductClassification } from '../types/classification';
import { MOCK_PRODUCTS } from '../constants/mockProducts';
import { resolveKpicCategory } from '../utils/innMapper';
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

const LOCAL_STORAGE_KEY = 'pharmassist_products_v3';
const DELETED_IDS_KEY = 'pharmassist_deleted_ids_v1';

const OLD_NUTRITION_CATEGORIES = new Set([
  '에너지 대사',
  '신경계/인지 기능',
  '골격/관절/치아',
  '면역/세포분열',
  '간기능/해독',
  '항산화/혈행',
  '아미노산/단백질 합성'
]);

function migrateAndEnsureKpic(products: ProductItem[]): ProductItem[] {
  return products.map((prod) => {
    // 목업 기본 제품인 경우 최신 MOCK_PRODUCTS 규격으로 강제 업데이트
    const matchingMock = MOCK_PRODUCTS.find((m) => m.id === prod.id);
    if (matchingMock) {
      return matchingMock;
    }

    let hasChanges = false;
    const updatedIngredients = prod.ingredients.map((ing) => {
      // 이전 분류 체계이거나 미지정인 경우 KPIC 마스터 DB에서 공식 약효분류로 자동 갱신
      if (OLD_NUTRITION_CATEGORIES.has(ing.functionalCategory) || !ing.functionalCategory) {
        const kpicCat = resolveKpicCategory(ing.englishInn);
        if (kpicCat && kpicCat !== ing.functionalCategory) {
          hasChanges = true;
          return { ...ing, functionalCategory: kpicCat };
        }
      }
      return ing;
    });

    if (hasChanges) {
      const updated = {
        ...prod,
        ingredients: updatedIngredients,
        updatedAt: new Date().toISOString()
      };
      saveProductToFirestore(updated).catch(() => {});
      return updated;
    }
    return prod;
  });
}

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
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || 
                  localStorage.getItem('pharmassist_products_v2') || 
                  localStorage.getItem('pharmassist_products_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedProducts = parsed.filter((p: ProductItem) => !deletedIds.has(p.id));
      }
    }
  } catch (e) {
    console.warn('로컬스토리지 로드 실패:', e);
  }

  // 기본 목업 제품 최신 KPIC 규격 강제 동기화
  MOCK_PRODUCTS.forEach((mock) => {
    if (!deletedIds.has(mock.id)) {
      const idx = loadedProducts.findIndex((p) => p.id === mock.id);
      if (idx !== -1) {
        loadedProducts[idx] = mock;
      } else {
        loadedProducts.push(mock);
      }
    }
  });

  const migrated = migrateAndEnsureKpic(loadedProducts);
  persistToLocal(migrated);
  return migrated;
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
          // 기본 목업 제품인 경우 최신 코드 스펙을 항상 우선 반영
          const matchingMock = MOCK_PRODUCTS.find((m) => m.id === p.id);
          if (matchingMock) {
            mergedMap.set(p.id, matchingMock);
            saveProductToFirestore(matchingMock).catch(() => {});
          } else {
            mergedMap.set(p.id, p);
          }
        });

        // 등록/수정일시 최신순으로 정렬 및 KPIC 약효분류 체계 자동 마이그레이션 적용
        const mergedList = migrateAndEnsureKpic(Array.from(mergedMap.values())).sort(
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

