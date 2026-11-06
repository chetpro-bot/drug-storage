import { create } from 'zustand';
import {
  MaternalDrugSafetyReport,
  MaternalDrugSearchCandidate
} from '../types/maternalSafety';
import {
  buildMaternalDrugSafetyReport,
  searchDomesticDrugsForMaternalSafety,
  VERIFIED_DOMESTIC_SEED_PRODUCTS
} from '../services/maternalSearchService';

export type AppWorkspaceMode = 'NUTRITION_CATALOG' | 'MATERNAL_SAFETY' | 'PEDIATRIC_SAFETY';
export type MobileSectionTab = 'PREGNANCY' | 'LACTATION';

interface MaternalStoreState {
  workspaceMode: AppWorkspaceMode;
  mobileSectionTab: MobileSectionTab;

  searchQuery: string;
  isSearching: boolean;
  searchCandidates: MaternalDrugSearchCandidate[];
  detectedIngredientNotice: string | null;
  searchApiError: string | null;

  selectedCandidate: MaternalDrugSearchCandidate | null;
  currentReport: MaternalDrugSafetyReport | null;
  isLoadingReport: boolean;

  setWorkspaceMode: (mode: AppWorkspaceMode) => void;
  toggleWorkspaceMode: () => void;
  setMobileSectionTab: (tab: MobileSectionTab) => void;
  setSearchQuery: (query: string) => void;
  executeSearch: (query: string) => Promise<void>;
  selectCandidateAndLoadReport: (candidate: MaternalDrugSearchCandidate) => Promise<void>;
}

export const useMaternalStore = create<MaternalStoreState>((set) => ({
  workspaceMode: 'NUTRITION_CATALOG',
  mobileSectionTab: 'PREGNANCY',

  searchQuery: '',
  isSearching: false,
  searchCandidates: VERIFIED_DOMESTIC_SEED_PRODUCTS,
  detectedIngredientNotice: null,
  searchApiError: null,

  selectedCandidate: null,
  currentReport: null,
  isLoadingReport: false,

  setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
  toggleWorkspaceMode: () =>
    set((state) => ({
      workspaceMode:
        state.workspaceMode === 'NUTRITION_CATALOG' ? 'MATERNAL_SAFETY' : 'NUTRITION_CATALOG'
    })),

  setMobileSectionTab: (tab) => set({ mobileSectionTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  executeSearch: async (query: string) => {
    set({
      searchQuery: query,
      isSearching: true,
      searchApiError: null,
      detectedIngredientNotice: null
    });

    const res = await searchDomesticDrugsForMaternalSafety(query);
    set({
      isSearching: false,
      searchCandidates: res.candidates,
      detectedIngredientNotice: res.detectedIngredientNotice || null,
      searchApiError: res.apiError || null
    });

    if (res.candidates.length === 1) {
      // 검색 결과가 단 1건인 경우에만 해당 의약품을 즉시 자동 로드
      const onlyOne = res.candidates[0];
      set({ selectedCandidate: onlyOne, isLoadingReport: true });
      const report = await buildMaternalDrugSafetyReport(onlyOne);
      set({ currentReport: report, isLoadingReport: false });
    } else {
      // 2건 이상이거나 0건인 경우, 첫 번째 항목을 임의로 자동 조회하지 않고
      // 사용자가 목록에서 조회할 제품을 직접 선택할 수 있도록 대기
      set({ selectedCandidate: null, currentReport: null, isLoadingReport: false });
    }
  },

  selectCandidateAndLoadReport: async (candidate: MaternalDrugSearchCandidate) => {
    set({ selectedCandidate: candidate, isLoadingReport: true });
    const report = await buildMaternalDrugSafetyReport(candidate);
    set({ currentReport: report, isLoadingReport: false });
  }
}));
