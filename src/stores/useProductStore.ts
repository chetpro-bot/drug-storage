import { create } from 'zustand';
import { ProductItem } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { ProductClassification } from '../types/classification';
import { MOCK_PRODUCTS } from '../constants/mockProducts';
import { doesProductMatchEfficacyTag } from '../constants/efficacyTags';
import { resolveKpicCategory, saveLearnedIngredientMapping } from '../utils/innMapper';
import { normalizeCategory } from '../utils/categoryColors';
import { 
  subscribeToProducts, 
  saveProductToFirestore, 
  deleteProductFromFirestore 
} from '../services/firestoreService';
import { isLiveFirebaseConfigured } from '../services/firebase';

export type MainViewMode = 'CATALOG' | 'DETAIL';
export type ProductSortOption = 'NAME_ASC' | 'CREATED_DESC' | 'UPDATED_DESC';

interface ProductState {
  products: ProductItem[];
  selectedProductId: string | null;
  viewMode: MainViewMode;
  searchQuery: string;
  classificationFilter: ProductClassification | 'ALL';
  selectedTag: string | null;
  sortBy: ProductSortOption;
  isLiveSyncActive: boolean;
  isSyncing: boolean;

  // Actions
  setSelectedProductId: (id: string | null) => void;
  setViewMode: (mode: MainViewMode) => void;
  setSearchQuery: (query: string) => void;
  setClassificationFilter: (filter: ProductClassification | 'ALL') => void;
  setSelectedTag: (tag: string | null) => void;
  setSortBy: (sort: ProductSortOption) => void;
  
  // Realtime Cloud Init
  initRealtimeSubscription: () => () => void;

  // Cloud CRUD
  addProduct: (product: ProductItem) => Promise<void>;
  updateProduct: (id: string, partial: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Efficacy Category Realtime Updates
  updateIngredientCategory: (ingredientKey: string, newCategory: string) => Promise<void>;
  batchRenameCategory: (oldCategory: string, newCategory: string) => Promise<void>;

  // Getters
  getFilteredProducts: () => ProductItem[];
  getSelectedProduct: () => ProductItem | undefined;
}

const LOCAL_STORAGE_KEY = 'pharmassist_products_v3';
const DELETED_IDS_KEY = 'pharmassist_deleted_ids_v1';
const SORT_BY_STORAGE_KEY = 'pharmassist_sort_by_v1';

export function getSavedSortBy(): ProductSortOption {
  try {
    const saved = localStorage.getItem(SORT_BY_STORAGE_KEY);
    if (saved === 'NAME_ASC' || saved === 'CREATED_DESC' || saved === 'UPDATED_DESC') {
      return saved;
    }
  } catch (e) {}
  return 'NAME_ASC';
}

export function sortProducts(products: ProductItem[], sortBy: ProductSortOption = 'NAME_ASC'): ProductItem[] {
  return [...products].sort((a, b) => {
    if (sortBy === 'NAME_ASC') {
      const cmp = (a.productName || '').localeCompare(b.productName || '', 'ko', {
        sensitivity: 'base',
        numeric: true
      });
      if (cmp !== 0) return cmp;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'CREATED_DESC') {
      const timeDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.productName || '').localeCompare(b.productName || '', 'ko', {
        sensitivity: 'base',
        numeric: true
      });
    }
    if (sortBy === 'UPDATED_DESC') {
      const timeDiff =
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.productName || '').localeCompare(b.productName || '', 'ko', {
        sensitivity: 'base',
        numeric: true
      });
    }
    return 0;
  });
}

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
    let hasChanges = false;
    const updatedIngredients = prod.ingredients.map((ing) => {
      // 1. 이전 영양 분류 체계이거나 미지정인 경우 KPIC 마스터 DB에서 공식 약효분류로 자동 갱신
      let currentCat = ing.functionalCategory;
      if (OLD_NUTRITION_CATEGORIES.has(currentCat) || !currentCat) {
        const kpicCat = resolveKpicCategory(ing.englishInn);
        if (kpicCat && kpicCat !== currentCat) {
          currentCat = kpicCat;
          hasChanges = true;
        }
      }

      // 2. 비타민 제제 명칭에서 "제제" 제거 정규화 (예: '비타민C 제제' -> '비타민C')
      if (currentCat && /^비타민([A-Za-z0-9]+)\s*제제$/.test(currentCat)) {
        const strippedCat = currentCat.replace(/^비타민([A-Za-z0-9]+)\s*제제$/, '비타민$1');
        if (strippedCat !== currentCat) {
          currentCat = strippedCat;
          hasChanges = true;
        }
      }

      // 3. 약효 분류에서 "보충" 제거 정규화 (예: '비타민B12 보충' -> '비타민B12', '엽산 보충' -> '엽산')
      if (currentCat && /\s*보충$/.test(currentCat)) {
        const strippedCat = currentCat.replace(/\s*보충$/, '');
        if (strippedCat !== currentCat) {
          currentCat = strippedCat;
          hasChanges = true;
        }
      }

      // 4. 아미노산 제제 접미사 제거 (예: '비필수 아미노산제제' -> '비필수 아미노산')
      if (currentCat && (currentCat === '비필수 아미노산제제' || currentCat === '비필수 아미노산 제제')) {
        currentCat = '비필수 아미노산';
        hasChanges = true;
      }
      if (currentCat && (currentCat === '아미노산제제' || currentCat === '아미노산 제제')) {
        currentCat = '아미노산';
        hasChanges = true;
      }

      if (currentCat !== ing.functionalCategory) {
        return { ...ing, functionalCategory: currentCat };
      }
      return ing;
    });

    // 5. '리퀴드씨엠키즈' 등 일반식품 영양성분 및 경고 문구 정돈
    if (prod.productName.includes('리퀴드씨엠') || prod.functionalFoodDetail?.reportNo === '20090435035193') {
      const hasGarbage = prod.ingredients.some(i => /(?:과량\s*섭취|설사를\s*일으킬|당알코올)/i.test(i.englishInn || ''));
      const hasMg = prod.ingredients.some(i => i.functionalCategory === '마그네슘' || (i.englishInn || '').includes('마그네슘'));
      const hasCa = prod.ingredients.some(i => i.functionalCategory === '칼슘' || (i.englishInn || '').includes('칼슘'));
      
      if (hasGarbage || !hasMg || !hasCa) {
        hasChanges = true;
        const cleanIngs: ProductIngredientEntry[] = [
          {
            ingredientId: 'ing_liquidcm_mg',
            englishInn: '글루콘산 마그네슘, 염화 마그네슘',
            koreanName: '글루콘산 마그네슘, 염화 마그네슘',
            functionalCategory: '마그네슘',
            chemicalFormName: '-',
            rawAmount: 35,
            unit: 'mg',
            standardKey: 'MAGNESIUM',
            isMainActive: true,
            formattedSpecification: '글루콘산 마그네슘, 염화 마그네슘 35mg',
            clinicalSummary: '• 에너지 이용에 필요, 신경과 근육 기능 유지에 필요 (복합 마그네슘 급원)',
            noteKorean: '1포당 35mg'
          },
          {
            ingredientId: 'ing_liquidcm_ca',
            englishInn: '젖산 칼슘, 황산 칼슘',
            koreanName: '젖산 칼슘, 황산 칼슘',
            functionalCategory: '칼슘',
            chemicalFormName: '-',
            rawAmount: 55,
            unit: 'mg',
            standardKey: 'CALCIUM',
            isMainActive: true,
            formattedSpecification: '젖산 칼슘, 황산 칼슘 55mg',
            clinicalSummary: '• 뼈와 치아 형성에 필요, 신경과 근육 기능 유지에 필요 (복합 칼슘 급원)',
            noteKorean: '1포당 55mg'
          }
        ];
        
        let attachments = prod.attachments || [];
        if (attachments.length === 0) {
          attachments = [
            {
              id: 'doc_liquidcm_label_01',
              fileName: '리퀴드씨엠키즈_영양기능정보_성분표.jpg',
              fileSize: 112851,
              uploadedAt: new Date().toISOString(),
              dataUrl: '/attachments/liquid_cm_kids_label.jpg',
              status: 'ANALYZED',
              analysisSummary: '영양성분 2건(마그네슘 35mg, 칼슘 55mg) 및 원료명 매핑 완료',
              extractedText: '1포당: 마그네슘 35mg, 칼슘 55mg\n원료명 및 함량: 정제수, 자일리톨(감미료), D-말티톨(감미료), 글루콘산마그네슘, 젖산칼슘, 사과과즙분말, 시클로덱스트린액, 향료(사과향), 나한과추출농축액, DL-사과산, 염화마그네슘, 잔탄검, 무수구연산, LJG해양심층수미네랄농축액, 황산칼슘, 구연산삼나트륨, 울금추출분말, 글루콘산아연\n※당알코올(자일리톨 9 %, D-말티톨 4 %) 당알코올 함유 제품으로 과량 섭취 시 설사를 일으킬 수 있습니다.'
            }
          ];
        }

        const functionalFoodDetail = {
          ...(prod.functionalFoodDetail || {
            reportNo: '20090435035193',
            functionalClaimsKorean: [],
            suggestedUseKorean: '',
            safetyPrecautionsKorean: []
          }),
          safetyPrecautionsKorean: [
            '당알코올(자일리톨 9 %, D-말티톨 4 %) 함유 제품으로 과량 섭취 시 설사를 일으킬 수 있습니다.',
            '일반식품(기타가공품 등)은 질병의 예방 및 치료를 위한 의약품이나 건강기능식품이 아닙니다.'
          ],
          labelPrecautionsText: '당알코올(자일리톨 9 %, D-말티톨 4 %) 당알코올 함유 제품으로 과량 섭취 시 설사를 일으킬 수 있습니다.',
          rawMaterialsText: '정제수, 자일리톨(감미료), D-말티톨(감미료), 글루콘산마그네슘, 젖산칼슘, 사과과즙분말(사과농축액 : 국산), 시클로덱스트린액, 향료(사과향), 나한과추출농축액(중국산), DL-사과산, 염화마그네슘, 잔탄검, 무수구연산, LJG해양심층수미네랄농축액, 황산칼슘, 구연산삼나트륨, 울금추출분말(울금 : 인도네시아산), 글루콘산아연'
        };

        const updated = {
          ...prod,
          ingredients: cleanIngs,
          attachments,
          functionalFoodDetail,
          updatedAt: new Date().toISOString()
        };
        saveProductToFirestore(updated).catch(() => {});
        return updated;
      }
    }

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

  // 기본 목업 제품은 아직 등록된 적 없는 신규 환경에서만 초기 시드로 추가
  const existingIds = new Set(loadedProducts.map((p) => p.id));
  MOCK_PRODUCTS.forEach((mock) => {
    if (!deletedIds.has(mock.id) && !existingIds.has(mock.id)) {
      loadedProducts.push(mock);
    }
  });

  const currentSort = getSavedSortBy();
  const migrated = sortProducts(migrateAndEnsureKpic(loadedProducts), currentSort);
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
  const initialSort = getSavedSortBy();

  return {
    products: initialProducts,
    selectedProductId: initialProducts[0]?.id || null,
    viewMode: 'CATALOG',
    searchQuery: '',
    classificationFilter: 'ALL',
    selectedTag: null,
    sortBy: initialSort,
    isLiveSyncActive: isLiveFirebaseConfigured(),
    isSyncing: false,

    setSelectedProductId: (id) => set({ selectedProductId: id }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setClassificationFilter: (filter) => set({ classificationFilter: filter }),
    setSelectedTag: (tag) => set({ selectedTag: tag }),
    setSortBy: (sort) => {
      try {
        localStorage.setItem(SORT_BY_STORAGE_KEY, sort);
      } catch (e) {}
      const sorted = sortProducts(get().products, sort);
      persistToLocal(sorted);
      set({ sortBy: sort, products: sorted });
    },

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

        // Firestore에서 온 제품들 반영 (최신 변경사항 반영하되, 첨부자료는 로컬 데이터 안전 보존)
        validFromFirestore.forEach((p) => {
          const localP = mergedMap.get(p.id);
          if (localP && localP.attachments && localP.attachments.length > 0 && (!p.attachments || p.attachments.length < localP.attachments.length)) {
            mergedMap.set(p.id, { ...p, attachments: localP.attachments });
          } else {
            mergedMap.set(p.id, p);
          }
        });

        // 선택된 정렬 기준(기본: 가나다순) 적용 및 KPIC 약효분류 체계 자동 마이그레이션 적용
        const currentSort = get().sortBy || 'NAME_ASC';
        const mergedList = sortProducts(
          migrateAndEnsureKpic(Array.from(mergedMap.values())),
          currentSort
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
      const currentSort = get().sortBy || 'NAME_ASC';
      const next = sortProducts(
        [product, ...get().products.filter((p) => p.id !== product.id)],
        currentSort
      );
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

      // 백그라운드 Firestore 동기화 (UI 블로킹 방지)
      saveProductToFirestore(updated).catch((e) => {
        console.warn('Firestore 업데이트 비동기 처리 알림:', e);
      });
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

    updateIngredientCategory: async (ingredientKey: string, newCategory: string) => {
      const normNew = normalizeCategory(newCategory);
      if (!ingredientKey || !normNew) return;
      const cleanKey = ingredientKey.trim().toLowerCase();

      // 1. 학습 사전에 즉시 저장 (추후 추가되는 제품 및 분석 시 자동 적용)
      saveLearnedIngredientMapping(ingredientKey, { functionalCategory: normNew as any });

      // 2. 모든 제품 순회하며 해당 성분의 functionalCategory 갱신
      const { products } = get();
      let hasChange = false;
      const updatedProducts = products.map((prod) => {
        let prodChanged = false;
        const updatedIngredients = prod.ingredients.map((ing) => {
          const innMatch = ing.englishInn?.trim().toLowerCase() === cleanKey;
          const nameMatch = ing.koreanName?.trim().toLowerCase() === cleanKey;
          if ((innMatch || nameMatch) && normalizeCategory(ing.functionalCategory) !== normNew) {
            prodChanged = true;
            return { ...ing, functionalCategory: normNew as any };
          }
          return ing;
        });

        if (prodChanged) {
          hasChange = true;
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

      if (hasChange) {
        persistToLocal(updatedProducts);
        set({ products: updatedProducts });
      }
    },

    batchRenameCategory: async (oldCategory: string, newCategory: string) => {
      const normOld = normalizeCategory(oldCategory);
      const normNew = normalizeCategory(newCategory);
      if (!normOld || !normNew || normOld === normNew) return;

      const { products } = get();
      let hasChange = false;
      const updatedProducts = products.map((prod) => {
        let prodChanged = false;
        const updatedIngredients = prod.ingredients.map((ing) => {
          if (normalizeCategory(ing.functionalCategory) === normOld) {
            prodChanged = true;
            return { ...ing, functionalCategory: normNew as any };
          }
          return ing;
        });

        if (prodChanged) {
          hasChange = true;
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

      // 학습 사전에도 일괄 치환
      try {
        const saved = localStorage.getItem('pharmassist_learned_inn_dict_v1');
        if (saved) {
          const dict = JSON.parse(saved);
          let dictChanged = false;
          Object.keys(dict).forEach((k) => {
            if (normalizeCategory(dict[k].functionalCategory) === normOld) {
              dict[k].functionalCategory = normNew;
              dictChanged = true;
            }
          });
          if (dictChanged) {
            localStorage.setItem('pharmassist_learned_inn_dict_v1', JSON.stringify(dict));
          }
        }
      } catch (e) {}

      if (hasChange) {
        persistToLocal(updatedProducts);
        set({ products: updatedProducts });
      }
    },


  getFilteredProducts: () => {
    const { products, searchQuery, classificationFilter, selectedTag, sortBy } = get();
    const query = searchQuery.trim().toLowerCase();

    const filtered = products.filter((item) => {
      if (classificationFilter !== 'ALL' && item.classification !== classificationFilter) {
        return false;
      }
      if (selectedTag && !doesProductMatchEfficacyTag(item, selectedTag)) {
        return false;
      }
      if (!query) return true;

      const matchName = item.productName.toLowerCase().includes(query);
      const matchManufacturer = item.manufacturer.toLowerCase().includes(query);
      const matchLocation = item.storageLocation?.toLowerCase().includes(query);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(query));
      const matchIngredients = item.ingredients.some(
        (ing) =>
          ing.englishInn.toLowerCase().includes(query) ||
          ing.koreanName?.toLowerCase().includes(query) ||
          ing.noteKorean?.toLowerCase().includes(query)
      );
      const matchBarcode = item.barcode?.includes(query);

      return (
        matchName ||
        matchManufacturer ||
        Boolean(matchLocation) ||
        matchTags ||
        matchIngredients ||
        Boolean(matchBarcode)
      );
    });

    return sortProducts(filtered, sortBy);
  },

  getSelectedProduct: () => {
    const { products, selectedProductId } = get();
    return products.find((p) => p.id === selectedProductId);
  },
};
});

