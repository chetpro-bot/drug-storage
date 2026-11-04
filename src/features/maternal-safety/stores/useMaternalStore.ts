import { create } from 'zustand';
import {
  InfantAgeGroup,
  MaternalSearchResult,
  PregnancyTrimester
} from '../types/maternalSafety';
import { searchLocalMaternalDatabase } from '../services/maternalSearchService';

export type AppWorkspaceMode = 'NUTRITION_CATALOG' | 'MATERNAL_SAFETY';
export type MaternalActiveTab =
  | 'SUMMARY'
  | 'PREGNANCY'
  | 'LACTATION'
  | 'COMBINATION'
  | 'COMPARE'
  | 'SOURCES';

const RECENT_SEARCH_STORAGE_KEY = 'pharmassist_maternal_recent_searches_v3';

const DEFAULT_RECENT_PRODUCTS = [
  '리피토정 20mg',
  '타이레놀정500밀리그람',
  '부루펜정400밀리그램',
  '지르텍정',
  '크레스토정 10mg',
  '판콜에스내복액'
];

function loadRecentSearches(): string[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return DEFAULT_RECENT_PRODUCTS;
  }
  try {
    // 기존에 성분명 검색 기록이 저장되어 있던 구버전 로컬 스토리지 삭제
    localStorage.removeItem('pharmassist_maternal_recent_searches_v1');
    localStorage.removeItem('pharmassist_maternal_recent_searches_v2');

    const saved = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_RECENT_PRODUCTS;
}

function saveRecentSearches(items: string[]) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // ignore
  }
}

export function weekToTrimester(week: number): PregnancyTrimester {
  if (week <= 13) return 'T1';
  if (week <= 27) return 'T2';
  return 'T3';
}

interface MaternalStoreState {
  workspaceMode: AppWorkspaceMode;
  activeTab: MaternalActiveTab;
  searchQuery: string;
  recentSearches: string[];
  selectedResult: MaternalSearchResult;
  activeIngredientId: string;

  // 임신부 조건 필터
  selectedTrimester: PregnancyTrimester;
  selectedGestationalWeek: number;

  // 수유부 조건 필터
  selectedInfantAge: InfantAgeGroup;
  isPretermInfant: boolean;

  // 약물 비교함
  compareIngredientIds: string[];

  // Actions
  setWorkspaceMode: (mode: AppWorkspaceMode) => void;
  toggleWorkspaceMode: () => void;
  setActiveTab: (tab: MaternalActiveTab) => void;
  setSearchQuery: (q: string) => void;
  addRecentSearch: (term: string) => void;
  selectSearchResult: (result: MaternalSearchResult) => void;
  setActiveIngredientId: (ingredientId: string) => void;
  setTrimester: (trimester: PregnancyTrimester) => void;
  setGestationalWeek: (week: number) => void;
  setInfantAge: (age: InfantAgeGroup) => void;
  setIsPretermInfant: (isPreterm: boolean) => void;
  toggleCompareIngredient: (ingredientId: string) => void;
}

const initialResults = searchLocalMaternalDatabase('');
const defaultSelected = initialResults[0];

export const useMaternalStore = create<MaternalStoreState>((set, get) => ({
  workspaceMode: 'NUTRITION_CATALOG',
  activeTab: 'SUMMARY',
  searchQuery: '',
  recentSearches: loadRecentSearches(),
  selectedResult: defaultSelected,
  activeIngredientId: defaultSelected?.primaryIngredientId || 'ing_acetaminophen',

  selectedTrimester: 'T1',
  selectedGestationalWeek: 8,

  selectedInfantAge: 'INFANT_1_6M',
  isPretermInfant: false,

  compareIngredientIds: ['ing_acetaminophen', 'ing_ibuprofen'],

  setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
  toggleWorkspaceMode: () =>
    set((state) => ({
      workspaceMode:
        state.workspaceMode === 'NUTRITION_CATALOG' ? 'MATERNAL_SAFETY' : 'NUTRITION_CATALOG'
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  addRecentSearch: (term) => {
    const clean = term.trim();
    if (!clean) return;
    const current = get().recentSearches;
    const updated = [clean, ...current.filter((item) => item !== clean)].slice(0, 8);
    saveRecentSearches(updated);
    set({ recentSearches: updated });
  },

  selectSearchResult: (result) => {
    const nextIngId = result.primaryIngredientId || 'ing_acetaminophen';
    get().addRecentSearch(result.displayName.split('(')[0].trim());
    set({
      selectedResult: result,
      activeIngredientId: nextIngId,
      activeTab: 'SUMMARY'
    });
  },

  setActiveIngredientId: (ingredientId) => set({ activeIngredientId: ingredientId }),

  setTrimester: (trimester) => {
    const defaultWeek = trimester === 'T1' ? 8 : trimester === 'T2' ? 22 : 32;
    set({
      selectedTrimester: trimester,
      selectedGestationalWeek: defaultWeek
    });
  },

  setGestationalWeek: (week) => {
    const clamped = Math.max(1, Math.min(40, week));
    set({
      selectedGestationalWeek: clamped,
      selectedTrimester: weekToTrimester(clamped)
    });
  },

  setInfantAge: (age) => set({ selectedInfantAge: age }),
  setIsPretermInfant: (isPreterm) => set({ isPretermInfant: isPreterm }),

  toggleCompareIngredient: (ingredientId) => {
    const current = get().compareIngredientIds;
    if (current.includes(ingredientId)) {
      if (current.length <= 1) return; // 최소 1개 유지
      set({ compareIngredientIds: current.filter((id) => id !== ingredientId) });
    } else {
      set({ compareIngredientIds: [...current, ingredientId] });
    }
  }
}));
