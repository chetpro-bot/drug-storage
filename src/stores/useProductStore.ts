import { create } from 'zustand';
import { ProductItem } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { ProductClassification } from '../types/classification';
import { MOCK_PRODUCTS } from '../constants/mockProducts';
import { STANDARD_EFFICACY_TAGS, doesProductMatchEfficacyTag } from '../constants/efficacyTags';
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
  bulkAddProducts: (newProducts: ProductItem[]) => Promise<void>;
  updateProduct: (id: string, partial: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Tag Management
  customTags: string[];
  addCustomTag: (tag: string) => void;
  renameTag: (oldTag: string, newTag: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  getActiveTags: () => string[];

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
const CUSTOM_TAGS_STORAGE_KEY = 'pharmassist_custom_tags_v2';
const DELETED_DEFAULT_TAGS_STORAGE_KEY = 'pharmassist_deleted_default_tags_v1';

export function getSavedCustomTags(): string[] {
  try {
    const saved = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function getSavedDeletedDefaultTags(): string[] {
  try {
    const saved = localStorage.getItem(DELETED_DEFAULT_TAGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

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

    // 6. 일반 식품/음료류에서 유입된 영양정보 비성분(나트륨, 탄수화물, 당류, 지방, 단백질, 칼로리 등) 자동 정돈
    const hasFoodGarbage = prod.ingredients.some(i =>
      /(?:나트륨|탄수화물|당류|지방|트랜스지방|포화지방|콜레스테롤|단백질|열량|칼로리|kcal|내용량|총내용량|정제수)/i.test(
        i.englishInn || i.koreanName || ''
      )
    );
    if (hasFoodGarbage) {
      hasChanges = true;
      const filteredIngs = prod.ingredients.filter(
        i =>
          !/(?:나트륨|탄수화물|당류|지방|트랜스지방|포화지방|콜레스테롤|단백질|열량|칼로리|kcal|내용량|총내용량|정제수)/i.test(
            i.englishInn || i.koreanName || ''
          )
      );
      const updated = {
        ...prod,
        ingredients: filteredIngs,
        updatedAt: new Date().toISOString()
      };
      saveProductToFirestore(updated).catch(() => {});
      return updated;
    }

    // 6. 올대원맥스정 등 제약회사(판매사: 대원제약 vs 수탁제조사: 한풍제약) 교정
    if (prod.productName.includes('올대원맥스') && (prod.manufacturer.includes('한풍') || !prod.manufacturer.includes('대원'))) {
      hasChanges = true;
      prod = {
        ...prod,
        manufacturer: '대원제약',
        distributor: '대원제약'
      };
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

export function getDeletedIds(): Set<string> {
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

export function markDeletedId(id: string) {
  try {
    const ids = getDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('삭제 목록 저장 실패:', e);
  }
}

export function unmarkDeletedId(id: string) {
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
        loadedProducts = parsed.filter(
          (p: ProductItem) => p.id !== 'prod_mdream_liquid_kids' && !deletedIds.has(p.id)
        );
      }
    }
  } catch (e) {
    console.warn('로컬스토리지 로드 실패:', e);
  }

  // 기본 목업 제품은 아직 등록된 적 없는 신규 환경에서만 초기 시드로 추가
  const existingIds = new Set(loadedProducts.map((p) => p.id));
  MOCK_PRODUCTS.forEach((mock) => {
    if (mock.id !== 'prod_mdream_liquid_kids' && !deletedIds.has(mock.id) && !existingIds.has(mock.id)) {
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
    customTags: getSavedCustomTags(),
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

        // 1. Firestore에서 들어온 목록 중 사용자가 명시적으로 삭제한 ID 및 과거 목업 잔재 제외
        const validFromFirestore = firestoreList.filter(
          (p) => p.id !== 'prod_mdream_liquid_kids' && !deletedIds.has(p.id)
        );

        // Firestore에 과거 등록되었던 prod_mdream_liquid_kids 가 남아있다면 백그라운드로 안전하게 삭제
        if (firestoreList.some((p) => p.id === 'prod_mdream_liquid_kids')) {
          deleteProductFromFirestore('prod_mdream_liquid_kids').catch(() => {});
        }

        // 2. 현재 로컬에 등록되어 있는 제품들과 안전하게 병합 (클라우드 단일 조회로 로컬 품목이 유실되는 현상 원천 방지)
        const mergedMap = new Map<string, ProductItem>();

        // 우선 현재 로컬 제품들을 맵에 등록
        currentProducts.forEach((p) => {
          if (p.id !== 'prod_mdream_liquid_kids' && !deletedIds.has(p.id)) {
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
      }, (error) => {
        console.warn('Firestore 리스너 에러 (로컬 캐시 안전 모드):', error);
        set({ isSyncing: false });
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

      // 백그라운드 Firestore 동기화 (UI 블로킹 방지)
      saveProductToFirestore(product).catch((e) => {
        console.warn('Firestore 저장 비동기 처리 알림:', e);
      });
    },

    bulkAddProducts: async (newProducts: ProductItem[]) => {
      if (!newProducts || newProducts.length === 0) return;
      const currentProducts = get().products;
      const currentSort = get().sortBy || 'NAME_ASC';

      const existingMap = new Map<string, ProductItem>();
      currentProducts.forEach((p) => existingMap.set(p.id, p));

      newProducts.forEach((p) => {
        unmarkDeletedId(p.id);
        existingMap.set(p.id, p);
      });

      const nextList = sortProducts(
        migrateAndEnsureKpic(Array.from(existingMap.values())),
        currentSort
      );

      persistToLocal(nextList);
      set({
        products: nextList,
        selectedProductId: newProducts[0]?.id || get().selectedProductId
      });

      // 백그라운드 Firestore 비동기 저장
      for (const p of newProducts) {
        saveProductToFirestore(p).catch((e) => {
          console.warn('대량 등록 Firestore 동기화 알림:', e);
        });
      }
    },

    getActiveTags: () => {
      const { customTags, products } = get();
      const deletedSet = new Set(getSavedDeletedDefaultTags());
      const tagSet = new Set<string>();

      // 1. 기본 표준 태그 (삭제되지 않은 것)
      STANDARD_EFFICACY_TAGS.forEach((t) => {
        if (!deletedSet.has(t)) tagSet.add(t);
      });

      // 2. 사용자 추가 커스텀 태그
      customTags.forEach((t) => {
        if (!deletedSet.has(t)) tagSet.add(t);
      });

      // 3. 현재 등록된 제품들에서 사용 중인 태그
      products.forEach((p) => {
        p.tags.forEach((t) => {
          const trimmed = t.trim();
          if (trimmed && !deletedSet.has(trimmed)) tagSet.add(trimmed);
        });
      });

      return Array.from(tagSet);
    },

    addCustomTag: (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      const currentDeleted = getSavedDeletedDefaultTags().filter((t) => t !== trimmed);
      localStorage.setItem(DELETED_DEFAULT_TAGS_STORAGE_KEY, JSON.stringify(currentDeleted));

      const currentCustom = getSavedCustomTags();
      if (!currentCustom.includes(trimmed)) {
        const next = [...currentCustom, trimmed];
        localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(next));
        set({ customTags: next });
      }
    },

    renameTag: async (oldTag: string, newTag: string) => {
      const cleanOld = oldTag.trim();
      const cleanNew = newTag.trim();
      if (!cleanOld || !cleanNew || cleanOld === cleanNew) return;

      let currentCustom = getSavedCustomTags();
      if (currentCustom.includes(cleanOld)) {
        currentCustom = currentCustom.map((t) => (t === cleanOld ? cleanNew : t));
      } else {
        const deletedDefaults = getSavedDeletedDefaultTags();
        if (!deletedDefaults.includes(cleanOld)) {
          deletedDefaults.push(cleanOld);
          localStorage.setItem(DELETED_DEFAULT_TAGS_STORAGE_KEY, JSON.stringify(deletedDefaults));
        }
        if (!currentCustom.includes(cleanNew)) {
          currentCustom.push(cleanNew);
        }
      }
      localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(currentCustom));

      const { products, selectedTag } = get();
      let hasChange = false;
      const nextProducts = products.map((p) => {
        if (p.tags && p.tags.includes(cleanOld)) {
          hasChange = true;
          const updatedTags = p.tags.map((t) => (t === cleanOld ? cleanNew : t));
          const updated = { ...p, tags: updatedTags, updatedAt: new Date().toISOString() };
          saveProductToFirestore(updated).catch(() => {});
          return updated;
        }
        return p;
      });

      if (hasChange) {
        persistToLocal(nextProducts);
        set({
          products: nextProducts,
          customTags: currentCustom,
          selectedTag: selectedTag === cleanOld ? cleanNew : selectedTag
        });
      } else {
        set({
          customTags: currentCustom,
          selectedTag: selectedTag === cleanOld ? cleanNew : selectedTag
        });
      }
    },

    deleteTag: async (tagToDelete: string) => {
      const cleanTag = tagToDelete.trim();
      if (!cleanTag) return;

      const currentCustom = getSavedCustomTags().filter((t) => t !== cleanTag);
      localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(currentCustom));

      if (STANDARD_EFFICACY_TAGS.includes(cleanTag)) {
        const deletedDefaults = getSavedDeletedDefaultTags();
        if (!deletedDefaults.includes(cleanTag)) {
          deletedDefaults.push(cleanTag);
          localStorage.setItem(DELETED_DEFAULT_TAGS_STORAGE_KEY, JSON.stringify(deletedDefaults));
        }
      }

      const { products, selectedTag } = get();
      let hasChange = false;
      const nextProducts = products.map((p) => {
        if (p.tags && p.tags.includes(cleanTag)) {
          hasChange = true;
          const updatedTags = p.tags.filter((t) => t !== cleanTag);
          const updated = { ...p, tags: updatedTags, updatedAt: new Date().toISOString() };
          saveProductToFirestore(updated).catch(() => {});
          return updated;
        }
        return p;
      });

      if (hasChange) {
        persistToLocal(nextProducts);
        set({
          products: nextProducts,
          customTags: currentCustom,
          selectedTag: selectedTag === cleanTag ? null : selectedTag
        });
      } else {
        set({
          customTags: currentCustom,
          selectedTag: selectedTag === cleanTag ? null : selectedTag
        });
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
      const currentProducts = get().products;
      const target = currentProducts.find((p) => p.id === id);

      // 이름 및 규격 코드 정규화 (유령/중복 레코드 일괄 정리)
      const targetNormName = target
        ? target.productName
            .replace(/\s+/g, '')
            .replace(/정$|연질캡슐$|경질캡슐$|캡슐$|액$|산$/, '')
            .toLowerCase()
        : '';
      const targetCode = target?.otcDetail?.itemSeq || target?.functionalFoodDetail?.reportNo;

      const itemsToDelete = currentProducts.filter((p) => {
        if (p.id === id) return true;
        // 엠-드림 관련 시드 목업 또는 유령 데이터 자동 정리
        if (
          target &&
          (target.productName.includes('엠드림') ||
            target.productName.includes('엠-드림') ||
            target.productName.includes('M-Dream'))
        ) {
          if (
            p.id === 'prod_mdream_liquid_kids' ||
            p.productName.includes('엠드림') ||
            p.productName.includes('엠-드림') ||
            p.productName.includes('M-Dream')
          ) {
            return true;
          }
        }
        if (targetCode) {
          const pCode = p.otcDetail?.itemSeq || p.functionalFoodDetail?.reportNo;
          if (pCode && pCode.trim() === targetCode.trim()) return true;
        }
        if (targetNormName && targetNormName.length >= 3) {
          const pNorm = p.productName
            .replace(/\s+/g, '')
            .replace(/정$|연질캡슐$|경질캡슐$|캡슐$|액$|산$/, '')
            .toLowerCase();
          if (pNorm === targetNormName) return true;
        }
        return false;
      });

      const idsToDelete = Array.from(new Set([id, ...itemsToDelete.map((p) => p.id)]));
      idsToDelete.forEach((dId) => markDeletedId(dId));
      if (
        target &&
        (target.productName.includes('엠드림') ||
          target.productName.includes('엠-드림') ||
          target.productName.includes('M-Dream'))
      ) {
        markDeletedId('prod_mdream_liquid_kids');
      }

      const next = currentProducts.filter((p) => !idsToDelete.includes(p.id));
      persistToLocal(next);
      set((state) => ({
        products: next,
        selectedProductId: idsToDelete.includes(state.selectedProductId || '')
          ? next[0]?.id || null
          : state.selectedProductId
      }));

      // 백그라운드 Firestore 삭제 (UI 블로킹 방지)
      for (const dId of idsToDelete) {
        deleteProductFromFirestore(dId).catch((e) => {
          console.warn('Firestore 삭제 비동기 처리 알림:', e);
        });
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

    // 띄어쓰기 및 하이픈, 괄호 등 특수기호 제거 정규화 헬퍼 (예: '엠-드림 리퀴드 키즈' -> '엠드림리퀴드키즈')
    const normalize = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_·,\.\(\)\[\]\/]/g, '');
    const cleanQuery = normalize(query);
    const queryTokens = query.split(/\s+/).map(normalize).filter(Boolean);

    const filtered = products.filter((item) => {
      if (classificationFilter !== 'ALL' && item.classification !== classificationFilter) {
        return false;
      }
      if (selectedTag && !doesProductMatchEfficacyTag(item, selectedTag)) {
        return false;
      }
      if (!query) return true;

      // 1) 기본 단순 포함 검색
      const rawMatch =
        item.productName.toLowerCase().includes(query) ||
        item.manufacturer.toLowerCase().includes(query) ||
        Boolean(item.storageLocation?.toLowerCase().includes(query)) ||
        item.tags.some((t) => t.toLowerCase().includes(query)) ||
        item.ingredients.some(
          (ing) =>
            ing.englishInn.toLowerCase().includes(query) ||
            ing.koreanName?.toLowerCase().includes(query) ||
            ing.noteKorean?.toLowerCase().includes(query)
        ) ||
        Boolean(item.barcode?.includes(query));

      if (rawMatch) return true;

      // 2) 띄어쓰기·특수문자(하이픈 등) 무시 정규화 검색 (예: '엠드림리퀴드키즈' <-> '엠-드림 리퀴드 키즈')
      const normName = normalize(item.productName);
      const normMfg = normalize(item.manufacturer);
      const normLoc = normalize(item.storageLocation);
      const normBarcode = (item.barcode || '').replace(/[\s\-]/g, '');

      if (cleanQuery) {
        if (
          normName.includes(cleanQuery) ||
          cleanQuery.includes(normName) ||
          normMfg.includes(cleanQuery) ||
          normLoc.includes(cleanQuery) ||
          normBarcode.includes(cleanQuery) ||
          item.tags.some((t) => normalize(t).includes(cleanQuery)) ||
          item.ingredients.some(
            (ing) =>
              normalize(ing.englishInn).includes(cleanQuery) ||
              normalize(ing.koreanName).includes(cleanQuery) ||
              normalize(ing.noteKorean).includes(cleanQuery)
          )
        ) {
          return true;
        }
      }

      // 3) 다중 단어 검색 (예: '엠드림 키즈' 입력 시 모든 토큰이 제품명/원료 등에 포함되는지 확인)
      if (queryTokens.length > 1) {
        const fullSearchTarget = [
          normName,
          normMfg,
          normLoc,
          ...item.tags.map(normalize),
          ...item.ingredients.flatMap((ing) => [
            normalize(ing.englishInn),
            normalize(ing.koreanName),
            normalize(ing.noteKorean)
          ])
        ].join(' ');

        const allTokensMatch = queryTokens.every((token) => fullSearchTarget.includes(token));
        if (allTokensMatch) return true;
      }

      return false;
    });

    return sortProducts(filtered, sortBy);
  },

  getSelectedProduct: () => {
    const { products, selectedProductId } = get();
    return products.find((p) => p.id === selectedProductId);
  },
};
});

