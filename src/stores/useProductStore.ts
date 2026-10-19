import { create } from 'zustand';
import { ProductItem } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { ProductClassification } from '../types/classification';
import { MOCK_PRODUCTS } from '../constants/mockProducts';
import { 
  STANDARD_EFFICACY_TAGS, 
  doesProductMatchEfficacyTag,
  cleanProductTags,
  isSentenceOrAutoTag
} from '../constants/efficacyTags';
import { resolveKpicCategory, saveLearnedIngredientMapping } from '../utils/innMapper';
import { extractAgeContraindication } from '../utils/precautionsHelper';
import { normalizeCategory } from '../utils/categoryColors';
import { 
  subscribeToProducts, 
  saveProductToFirestore, 
  deleteProductFromFirestore,
  fetchProductsOnce
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
  lastSyncedAt: Date | null;

  // Actions
  setSelectedProductId: (id: string | null) => void;
  setViewMode: (mode: MainViewMode) => void;
  setSearchQuery: (query: string) => void;
  setClassificationFilter: (filter: ProductClassification | 'ALL') => void;
  setSelectedTag: (tag: string | null) => void;
  setSortBy: (sort: ProductSortOption) => void;
  
  // Realtime Cloud Init & Manual Sync
  initRealtimeSubscription: () => () => void;
  syncNow: () => Promise<void>;

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
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => typeof t === 'string' && !isSentenceOrAutoTag(t));
      }
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

      // 5. [철저한 환산 규칙] 식약처 품목 허가 상세에서 '성분정보'가 공란인 성분은 과거 저장된 임의 환산량(elementalAmount) 영구 제거
      const isExcludedFromConversion =
        /pantothen|판토텐산/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /pyridox|피리독신|피리독살/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /choline|콜린|bitartrate/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /nicotinamid|niacinamid|니코틴산아미드|니코틴아미드/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /biotin|비오틴/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /folic|엽산|폴산/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /cobalamin|코발라민|메코발라민/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /taurine|타우린/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /inositol|이노시톨/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /ursodeoxy|우르소/i.test(`${ing.englishInn} ${ing.koreanName || ''}`) ||
        /oryzanol|오리자놀/i.test(`${ing.englishInn} ${ing.koreanName || ''}`);

      let cleanElemental = ing.elementalAmount;
      if (isExcludedFromConversion && cleanElemental !== undefined) {
        cleanElemental = undefined;
        hasChanges = true;
      }

      if (currentCat !== ing.functionalCategory || cleanElemental !== ing.elementalAmount) {
        return {
          ...ing,
          functionalCategory: currentCat,
          elementalAmount: cleanElemental
        };
      }
      return ing;
    });

    // 5-1. 비맥스제트(100정 등) 등록 제품의 식약처 허가(202300436) 공식 21종 배합 성분 100% 동기화
    if (prod.productName.includes('비맥스제트')) {
      const BMAX_OFFICIAL_MAP: Record<string, { raw: number; unit: 'mg' | 'ug' | 'IU'; elemental?: number; label?: string; elUnit?: string }> = {
        'benfotiamine': { raw: 100, unit: 'mg', elemental: 72.3, label: '티아민염산염' },
        '벤포티아민': { raw: 100, unit: 'mg', elemental: 72.3, label: '티아민염산염' },
        'bisbenthiamine': { raw: 30, unit: 'mg', elemental: 26.2, label: '티아민염산염' },
        '비스벤티아민': { raw: 30, unit: 'mg', elemental: 26.2, label: '티아민염산염' },
        'riboflavin butyrate': { raw: 50, unit: 'mg', elemental: 28.7, label: '리보플라빈' },
        '리보플라빈부티레이트': { raw: 50, unit: 'mg', elemental: 28.7, label: '리보플라빈' },
        'nicotinamide': { raw: 10, unit: 'mg' },
        '니코틴산아미드': { raw: 10, unit: 'mg' },
        'calcium pantothenate': { raw: 100, unit: 'mg' },
        '판토텐산칼슘': { raw: 100, unit: 'mg' },
        'pyridoxal phosphate': { raw: 50, unit: 'mg' },
        '피리독살포스페이트': { raw: 50, unit: 'mg' },
        '피리독살포스페이트수화물': { raw: 50, unit: 'mg' },
        'biotin': { raw: 0.2, unit: 'mg' },
        '비오틴': { raw: 0.2, unit: 'mg' },
        'folic acid': { raw: 0.5, unit: 'mg' },
        '폴산': { raw: 0.5, unit: 'mg' },
        '엽산': { raw: 0.5, unit: 'mg' },
        'mecobalamin': { raw: 1, unit: 'mg' },
        '메코발라민': { raw: 1, unit: 'mg' },
        'ascorbic acid coated': { raw: 51.15, unit: 'mg', elemental: 50, label: '아스코르브산' },
        '제피아스코르브산': { raw: 51.15, unit: 'mg', elemental: 50, label: '아스코르브산' },
        'taurine': { raw: 100, unit: 'mg' },
        '타우린': { raw: 100, unit: 'mg' },
        'chromium in dried yeast': { raw: 20, unit: 'mg', elemental: 10, label: '크롬', elUnit: 'ug' },
        '크롬함유건조효모': { raw: 20, unit: 'mg', elemental: 10, label: '크롬', elUnit: 'ug' },
        'inositol': { raw: 100, unit: 'mg' },
        '이노시톨': { raw: 100, unit: 'mg' },
        'cholecalciferol concentrate powder': { raw: 10, unit: 'mg', elemental: 1000, label: '비타민D', elUnit: 'IU' },
        '콜레칼시페롤농축분말': { raw: 10, unit: 'mg', elemental: 1000, label: '비타민D', elUnit: 'IU' },
        'choline bitartrate': { raw: 100, unit: 'mg' },
        '콜린타르타르산염': { raw: 100, unit: 'mg' },
        'zinc oxide': { raw: 30, unit: 'mg', elemental: 24.1, label: '아연' },
        '산화아연': { raw: 30, unit: 'mg', elemental: 24.1, label: '아연' },
        'ursodeoxycholic acid': { raw: 60, unit: 'mg' },
        '우르소데옥시콜산': { raw: 60, unit: 'mg' },
        'selenium in dried yeast': { raw: 40.8, unit: 'mg', elemental: 22, label: '셀레늄', elUnit: 'ug' },
        '셀레늄함유건조효모': { raw: 40.8, unit: 'mg', elemental: 22, label: '셀레늄', elUnit: 'ug' },
        'tocopherol acetate powder 50%': { raw: 20, unit: 'mg', elemental: 10, label: '비타민E', elUnit: 'IU' },
        '토코페롤아세테이트2배산': { raw: 20, unit: 'mg', elemental: 10, label: '비타민E', elUnit: 'IU' },
        '토코페롤아세테이트 2배산': { raw: 20, unit: 'mg', elemental: 10, label: '비타민E', elUnit: 'IU' },
        'gamma oryzanol': { raw: 3, unit: 'mg' },
        '감마-오리자놀': { raw: 3, unit: 'mg' },
        '감마오리자놀': { raw: 3, unit: 'mg' },
        'magnesium oxide': { raw: 100, unit: 'mg', elemental: 60.3, label: '마그네슘' },
        '산화마그네슘': { raw: 100, unit: 'mg', elemental: 60.3, label: '마그네슘' }
      };

      for (let i = 0; i < updatedIngredients.length; i++) {
        const ing = updatedIngredients[i];
        const matchKey = Object.keys(BMAX_OFFICIAL_MAP).find(
          k =>
            (ing.koreanName && ing.koreanName.toLowerCase().replace(/\s+/g, '').includes(k.replace(/\s+/g, ''))) ||
            (ing.englishInn && ing.englishInn.toLowerCase().replace(/[\s\-\']/g, '').includes(k.replace(/[\s\-\']/g, '')))
        );
        if (matchKey) {
          const expected = BMAX_OFFICIAL_MAP[matchKey];
          if (
            ing.elementalAmount !== expected.elemental ||
            ing.rawAmount !== expected.raw ||
            ing.unit !== expected.unit ||
            ing.elementalLabel !== expected.label
          ) {
            hasChanges = true;
            updatedIngredients[i] = {
              ...ing,
              rawAmount: expected.raw,
              unit: expected.unit,
              elementalAmount: expected.elemental,
              elementalLabel: expected.label,
              elementalUnit: expected.elUnit || (expected.elemental ? expected.unit : undefined)
            };
          }
        }
      }
    }

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

    // 6. '마그라민트리플액션정' 성분 규격 자동 보정 (약학정보원 및 식약처 공식 규격: Magnesium Citrate Hydrate 50mg 포함 7종 성분 보장)
    if (prod.productName.includes('마그라민트리플액션')) {
      const hasCitrate = prod.ingredients.some(i => 
        /citrate|시트르산|구연산/i.test(i.englishInn || '') || 
        /citrate|시트르산|구연산/i.test(i.koreanName || '') ||
        /citrate|시트르산|구연산/i.test(i.formattedSpecification || '')
      );
      const hasGenericMg50 = prod.ingredients.some(i => 
        (i.englishInn === 'Magnesium' || i.englishInn === '마그네슘') && i.rawAmount === 50
      );

      if (!hasCitrate || hasGenericMg50 || prod.ingredients.length < 7) {
        hasChanges = true;
        const exactMagraminIngredients: ProductIngredientEntry[] = [
          {
            ingredientId: 'ing_magramin_mg_ox',
            englishInn: 'Magnesium Oxide',
            koreanName: '산화마그네슘',
            functionalCategory: '마그네슘(Mg)',
            chemicalFormName: '무기염 (산화마그네슘)',
            rawAmount: 445,
            unit: 'mg',
            elementalAmount: 268.3,
            standardKey: 'MAGNESIUM',
            isMainActive: true,
            formattedSpecification: 'Magnesium Oxide 445mg (Magnesium 268.3mg)',
            clinicalSummary: '• 신경 자극 전달 조절 및 근육 수축·이완 정상화, 세포 내 ATP 결합 안정화'
          },
          {
            ingredientId: 'ing_magramin_mg_gp',
            englishInn: 'Magnesium Glycerophosphate',
            koreanName: '글리세로인산마그네슘',
            functionalCategory: '마그네슘(Mg)',
            chemicalFormName: '유기인산염 (글리세로인산마그네슘)',
            rawAmount: 50,
            unit: 'mg',
            elementalAmount: 6.3,
            standardKey: 'MAGNESIUM',
            isMainActive: true,
            formattedSpecification: 'Magnesium Glycerophosphate 50mg (Magnesium 6.3mg)',
            clinicalSummary: '• 설사 유발 위험이 적고 생체흡수율이 뛰어난 유기염 마그네슘'
          },
          {
            ingredientId: 'ing_magramin_mg_cit',
            englishInn: 'Magnesium Citrate Hydrate',
            koreanName: '시트르산마그네슘수화물',
            functionalCategory: '마그네슘(Mg)',
            chemicalFormName: '유기염 (시트르산마그네슘수화물)',
            rawAmount: 50,
            unit: 'mg',
            standardKey: 'MAGNESIUM',
            isMainActive: true,
            formattedSpecification: 'Magnesium Citrate Hydrate 50mg',
            clinicalSummary: '• 흡수율과 생체이용률이 우수하고 위장 부담이 적은 유기산염(구연산) 마그네슘 수화물'
          },
          {
            ingredientId: 'ing_magramin_b6',
            englishInn: 'Pyridoxine Hydrochloride',
            koreanName: '피리독신염산염',
            functionalCategory: '비타민B6',
            chemicalFormName: '염산염 (피리독신염산염)',
            rawAmount: 25,
            unit: 'mg',
            standardKey: 'VITAMIN_B6',
            isMainActive: false,
            formattedSpecification: 'Pyridoxine Hydrochloride 25mg',
            clinicalSummary: '• 단백질 및 아미노산 대사, 마그네슘의 세포 내 유입 보조'
          },
          {
            ingredientId: 'ing_magramin_vite',
            englishInn: 'D-Alpha-Tocopherol Acetate',
            koreanName: '초산디알파토코페롤',
            functionalCategory: '비타민E',
            chemicalFormName: '천연형 유도체 (초산 d-α-토코페롤)',
            rawAmount: 142.8571,
            unit: 'mg',
            elementalAmount: 100,
            standardKey: 'VITAMIN_E',
            isMainActive: true,
            formattedSpecification: 'D-Alpha-Tocopherol Acetate 142.8571mg (Vitamin E 100IU)',
            clinicalSummary: '• 생체이용률이 우수한 천연형(d-alpha) 비타민 E 아세테이트\n• 지질 항산화 및 말초혈행 장애(어깨결림, 수족저림) 완화'
          },
          {
            ingredientId: 'ing_magramin_b1',
            englishInn: 'Fursultiamine',
            koreanName: '푸르설티아민',
            functionalCategory: '비타민B1',
            chemicalFormName: '활성형 (푸르설티아민)',
            rawAmount: 25,
            unit: 'mg',
            standardKey: 'VITAMIN_B1',
            isMainActive: false,
            formattedSpecification: 'Fursultiamine 25mg',
            clinicalSummary: '• 뇌혈관장벽(BBB) 및 세포막 통과 우수, 신경통·근육통 완화'
          },
          {
            ingredientId: 'ing_magramin_vitd',
            englishInn: 'Cholecalciferol Concentrated Powder',
            koreanName: '콜레칼시페롤농축분말',
            functionalCategory: '비타민D',
            chemicalFormName: '농축 분말 (콜레칼시페롤)',
            rawAmount: 10,
            unit: 'mg',
            standardKey: 'VITAMIN_D',
            isMainActive: false,
            formattedSpecification: 'Cholecalciferol Concentrated Powder 10mg',
            clinicalSummary: '• 칼슘 및 마그네슘 대사 조절, 뼈 형성 및 근육 기능 유지'
          }
        ];
        const updated = {
          ...prod,
          ingredients: exactMagraminIngredients,
          updatedAt: new Date().toISOString()
        };
        saveProductToFirestore(updated).catch(() => {});
        return updated;
      }
    }

    // 6-2. '마그랑비피돌샷액' 피돌산마그네슘 성분 규격 및 원소량(300mg) 자동 보정
    if (prod.productName.includes('마그랑비피돌샷')) {
      const hasPidolate = prod.ingredients.some(i =>
        /pidolate|피돌산/i.test(i.englishInn || '') ||
        /pidolate|피돌산/i.test(i.koreanName || '') ||
        /pidolate|피돌산/i.test(i.formattedSpecification || '')
      );
      const hasGenericMg3462 = prod.ingredients.some(i =>
        (i.englishInn === 'Magnesium' || i.englishInn === '마그네슘') && i.rawAmount === 3462.5
      );

      if (!hasPidolate || hasGenericMg3462) {
        hasChanges = true;
        const exactMagrangIngredients: ProductIngredientEntry[] = [
          {
            ingredientId: 'ing_magrang_mg_pidol',
            englishInn: 'Magnesium Pidolate',
            koreanName: '피돌산마그네슘',
            functionalCategory: '마그네슘(Mg)',
            chemicalFormName: '유기염 (피돌산마그네슘)',
            rawAmount: 3462.5,
            unit: 'mg',
            elementalAmount: 300,
            standardKey: 'MAGNESIUM',
            isMainActive: true,
            formattedSpecification: 'Magnesium Pidolate 3462.5mg (Magnesium 300mg)',
            clinicalSummary: '• 흡수율과 세포막 투과율이 탁월한 유기염 피돌산(Pidolic acid) 결합 마그네슘 (마그네슘으로서 300mg)\n• 신경 안정 및 근육 피로 완화'
          },
          {
            ingredientId: 'ing_magrang_b2',
            englishInn: "Riboflavin 5'-phosphate sodium",
            koreanName: '리보플라빈포스페이트나트륨',
            functionalCategory: '비타민B2',
            chemicalFormName: '활성 조효소형(FMN) 인산나트륨염 (비타민 B2)',
            rawAmount: 7.63,
            unit: 'mg',
            elementalAmount: 6,
            standardKey: 'VITAMIN_B2',
            isMainActive: false,
            formattedSpecification: "Riboflavin 5'-phosphate sodium 7.63mg (Riboflavin 6mg)",
            clinicalSummary: '• 용해도 우수한 활성형 B2, 점막 세포 재생 및 에너지 대사'
          },
          {
            ingredientId: 'ing_magrang_b6',
            englishInn: 'Pyridoxine hydrochloride',
            koreanName: '피리독신염산염',
            functionalCategory: '비타민B6',
            chemicalFormName: '염산염 (수용성 비타민 B6)',
            rawAmount: 75,
            unit: 'mg',
            elementalAmount: 61.7,
            standardKey: 'VITAMIN_B6',
            isMainActive: true,
            formattedSpecification: 'Pyridoxine hydrochloride 75mg',
            clinicalSummary: '• 아미노산 대사 및 신경전달물질(GABA, Serotonin) 합성 보조'
          },
          {
            ingredientId: 'ing_magrang_b3',
            englishInn: 'Nicotinamide',
            koreanName: '니코틴산아미드',
            functionalCategory: '비타민B3',
            chemicalFormName: '아미드형 (비타민 B3)',
            rawAmount: 20,
            unit: 'mg',
            standardKey: 'VITAMIN_B3',
            isMainActive: false,
            formattedSpecification: 'Nicotinamide 20mg',
            clinicalSummary: '• 안면 홍조(Flushing) 위험 없는 아미드 형태, 산화환원 반응 NAD 조효소 합성\n• 2025 KDRIs 성인 상한섭취량(UL): 850mg NE/일 (니코틴산아미드 기준)'
          },
          {
            ingredientId: 'ing_magrang_taurine',
            englishInn: 'Taurine',
            koreanName: '타우린',
            functionalCategory: '비필수 아미노산',
            chemicalFormName: '함황 아미노설폰산 (타우린)',
            rawAmount: 100,
            unit: 'mg',
            isMainActive: true,
            formattedSpecification: 'Taurine 100mg',
            clinicalSummary: '• 담즙산 결합 및 삼투압 조절, 심근 수축력 및 근육 피로 완화'
          }
        ];
        const updated = {
          ...prod,
          ingredients: exactMagrangIngredients,
          updatedAt: new Date().toISOString()
        };
        saveProductToFirestore(updated).catch(() => {});
        return updated;
      }
    }

    // 7. 일반 식품/음료류에서 유입된 영양정보 비성분(나트륨, 탄수화물, 당류, 지방, 단백질, 칼로리 등) 자동 정돈
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

    // 7. 성분/함량 추출용으로 첨부된 자료나 라벨 이미지가 과거 대표 사진(imageUrl)으로 잘못 저장된 경우 정리
    if (
      prod.imageUrl &&
      (prod.imageUrl.includes('/attachments/') ||
        prod.imageUrl.includes('영양기능정보') ||
        prod.imageUrl.includes('성분표') ||
        (prod.attachments && prod.attachments.some((a) => a.dataUrl === prod.imageUrl)))
    ) {
      hasChanges = true;
      prod = {
        ...prod,
        imageUrl: undefined
      };
    }

    // 6. 자동 주입된 장문 효능 문장 태그 일괄 정돈
    const originalTags = prod.tags || [];
    const cleanedTags = cleanProductTags(originalTags);
    if (cleanedTags.length !== originalTags.length) {
      hasChanges = true;
      prod = {
        ...prod,
        tags: cleanedTags
      };
    }

    // 7. 사용상의 주의사항 요약: 연령금기 항목 최우선 맨 처음 배치 보장
    if (prod.classification === 'OTC_DRUG' && prod.otcDetail?.precautionsSummaryKorean) {
      let currentOtc = prod.otcDetail;
      if (prod.productName.includes('비맥스제트') && currentOtc.itemSeq === '202300072') {
        hasChanges = true;
        currentOtc = {
          ...currentOtc,
          itemSeq: '202300436',
          kpaicCode: '202300436-00'
        };
      }

      const precs = currentOtc.precautionsSummaryKorean;
      // 요약형 리스트(길이 1~4줄)인 경우 연령금기를 맨 처음에 배치
      if (precs.length > 0 && precs.length <= 4 && !precs[0].includes('■ 1.') && !precs[0].includes('다음과 같은 사람은')) {
        const ageFound =
          extractAgeContraindication(precs) ||
          (prod.productName.includes('비맥스') ? '만 12개월 미만의 젖먹이: 복용 금기' : undefined);
        if (ageFound && !precs[0].includes(ageFound.split(':')[0])) {
          hasChanges = true;
          currentOtc = {
            ...currentOtc,
            precautionsSummaryKorean: [ageFound, ...precs.filter((p) => !p.includes(ageFound.split(':')[0]))]
          };
        }
      }

      if (currentOtc !== prod.otcDetail) {
        prod = {
          ...prod,
          otcDetail: currentOtc
        };
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
    lastSyncedAt: null,

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
        // 과거 목업 잔재 백그라운드 삭제
        if (firestoreList.some((p) => p.id === 'prod_mdream_liquid_kids')) {
          deleteProductFromFirestore('prod_mdream_liquid_kids').catch(() => {});
        }

        const currentSort = get().sortBy || 'NAME_ASC';
        const currentProducts = get().products;
        const validFromFirestore = firestoreList.filter((p) => p.id !== 'prod_mdream_liquid_kids');
        const firestoreIds = new Set(validFromFirestore.map((p) => p.id));

        // Firestore에 존재하는 정상 제품 ID는 로컬 deletedIds 차단 목록에서 즉시 해제
        validFromFirestore.forEach((p) => unmarkDeletedId(p.id));

        const mergedMap = new Map<string, ProductItem>();

        // Firestore 데이터 적용 (첨부파일은 로컬 캐시 우선 보존)
        validFromFirestore.forEach((p) => {
          const localP = currentProducts.find((lp) => lp.id === p.id);
          if (
            localP &&
            localP.attachments &&
            localP.attachments.length > 0 &&
            (!p.attachments || p.attachments.length < localP.attachments.length)
          ) {
            mergedMap.set(p.id, { ...p, attachments: localP.attachments });
          } else {
            mergedMap.set(p.id, p);
          }
        });

        // 오프라인 상태에서 방금 신규 등록된 로컬 제품(최근 5분 이내)은 보존 및 Firestore 백그라운드 전송
        const now = Date.now();
        currentProducts.forEach((p) => {
          if (!firestoreIds.has(p.id) && p.id !== 'prod_mdream_liquid_kids') {
            const createdTime = new Date(p.createdAt || 0).getTime();
            if (now - createdTime < 5 * 60 * 1000) {
              mergedMap.set(p.id, p);
              saveProductToFirestore(p).catch(() => {});
            }
          }
        });

        const mergedList = sortProducts(
          migrateAndEnsureKpic(Array.from(mergedMap.values())),
          currentSort
        );

        persistToLocal(mergedList);
        set((state) => ({
          products: mergedList,
          isSyncing: false,
          isLiveSyncActive: true,
          lastSyncedAt: new Date(),
          selectedProductId: state.selectedProductId || mergedList[0]?.id || null
        }));
      }, (error) => {
        console.warn('Firestore 리스너 에러 (로컬 캐시 안전 모드):', error);
        set({ isSyncing: false, isLiveSyncActive: false });
      });
      return unsubscribe;
    },

    syncNow: async () => {
      set({ isSyncing: true });
      try {
        const firestoreList = await fetchProductsOnce();
        if (firestoreList.some((p) => p.id === 'prod_mdream_liquid_kids')) {
          deleteProductFromFirestore('prod_mdream_liquid_kids').catch(() => {});
        }

        const currentSort = get().sortBy || 'NAME_ASC';
        const currentProducts = get().products;
        const validFromFirestore = firestoreList.filter((p) => p.id !== 'prod_mdream_liquid_kids');
        const firestoreIds = new Set(validFromFirestore.map((p) => p.id));

        validFromFirestore.forEach((p) => unmarkDeletedId(p.id));

        const mergedMap = new Map<string, ProductItem>();
        validFromFirestore.forEach((p) => {
          const localP = currentProducts.find((lp) => lp.id === p.id);
          if (
            localP &&
            localP.attachments &&
            localP.attachments.length > 0 &&
            (!p.attachments || p.attachments.length < localP.attachments.length)
          ) {
            mergedMap.set(p.id, { ...p, attachments: localP.attachments });
          } else {
            mergedMap.set(p.id, p);
          }
        });

        const now = Date.now();
        currentProducts.forEach((p) => {
          if (!firestoreIds.has(p.id) && p.id !== 'prod_mdream_liquid_kids') {
            const createdTime = new Date(p.createdAt || 0).getTime();
            if (now - createdTime < 5 * 60 * 1000) {
              mergedMap.set(p.id, p);
              saveProductToFirestore(p).catch(() => {});
            }
          }
        });

        const mergedList = sortProducts(
          migrateAndEnsureKpic(Array.from(mergedMap.values())),
          currentSort
        );

        persistToLocal(mergedList);
        set((state) => ({
          products: mergedList,
          isSyncing: false,
          isLiveSyncActive: true,
          lastSyncedAt: new Date(),
          selectedProductId: state.selectedProductId || mergedList[0]?.id || null
        }));
      } catch (err) {
        console.warn('수동 동기화 실패:', err);
        set({ isSyncing: false });
      }
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
        const trimmed = t.trim();
        if (trimmed && !deletedSet.has(trimmed) && !isSentenceOrAutoTag(trimmed)) tagSet.add(trimmed);
      });

      // 3. 현재 등록된 제품들에서 사용 중인 태그
      products.forEach((p) => {
        (p.tags || []).forEach((t) => {
          const trimmed = t.trim();
          if (trimmed && !deletedSet.has(trimmed) && !isSentenceOrAutoTag(trimmed)) {
            tagSet.add(trimmed);
          }
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
        set({ customTags: next, products: [...get().products] });
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
          products: [...products],
          customTags: currentCustom,
          selectedTag: selectedTag === cleanOld ? cleanNew : selectedTag
        });
      }
    },

    deleteTag: async (tagToDelete: string) => {
      const cleanTag = tagToDelete.trim();
      if (!cleanTag) return;

      const currentCustom = getSavedCustomTags().filter((t) => t.trim().toLowerCase() !== cleanTag.toLowerCase());
      localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(currentCustom));

      // 삭제된 태그 목록에 추가하여 모든 태그가 즉각 비활성화되도록 보장
      const deletedDefaults = getSavedDeletedDefaultTags();
      if (!deletedDefaults.some((t) => t.trim().toLowerCase() === cleanTag.toLowerCase())) {
        deletedDefaults.push(cleanTag);
        localStorage.setItem(DELETED_DEFAULT_TAGS_STORAGE_KEY, JSON.stringify(deletedDefaults));
      }

      const { products, selectedTag } = get();
      let hasChange = false;
      const nextProducts = products.map((p) => {
        if (p.tags && p.tags.some((t) => t.trim().toLowerCase() === cleanTag.toLowerCase())) {
          hasChange = true;
          const updatedTags = p.tags.filter((t) => t.trim().toLowerCase() !== cleanTag.toLowerCase());
          const updated = { ...p, tags: updatedTags, updatedAt: new Date().toISOString() };
          saveProductToFirestore(updated).catch(() => {});
          return updated;
        }
        return p;
      });

      if (hasChange) {
        persistToLocal(nextProducts);
      }

      set({
        products: hasChange ? nextProducts : [...products],
        customTags: currentCustom,
        selectedTag: selectedTag?.toLowerCase() === cleanTag.toLowerCase() ? null : selectedTag
      });
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

