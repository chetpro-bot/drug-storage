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

export type AppWorkspaceMode = 'NUTRITION_CATALOG' | 'MATERNAL_SAFETY';
export type MobileSectionTab = 'PREGNANCY' | 'LACTATION';

interface MaternalStoreState {
  workspaceMode: AppWorkspaceMode;
  mobileSectionTab: MobileSectionTab;

  searchQuery: string;
  isSearching: boolean;
  searchCandidates: MaternalDrugSearchCandidate[];
  detectedIngredientNotice: string | null;
  searchApiError: string | null;

  selectedCandidate: MaternalDrugSearchCandidate;
  currentReport: MaternalDrugSafetyReport | null;
  isLoadingReport: boolean;

  setWorkspaceMode: (mode: AppWorkspaceMode) => void;
  toggleWorkspaceMode: () => void;
  setMobileSectionTab: (tab: MobileSectionTab) => void;
  setSearchQuery: (query: string) => void;
  executeSearch: (query: string) => Promise<void>;
  selectCandidateAndLoadReport: (candidate: MaternalDrugSearchCandidate) => Promise<void>;
}

const defaultCandidate = VERIFIED_DOMESTIC_SEED_PRODUCTS[0];

export const useMaternalStore = create<MaternalStoreState>((set) => ({
  workspaceMode: 'NUTRITION_CATALOG',
  mobileSectionTab: 'PREGNANCY',

  searchQuery: '',
  isSearching: false,
  searchCandidates: VERIFIED_DOMESTIC_SEED_PRODUCTS,
  detectedIngredientNotice: null,
  searchApiError: null,

  selectedCandidate: defaultCandidate,
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

    if (res.candidates.length > 0) {
      const first = res.candidates[0];
      set({ selectedCandidate: first, isLoadingReport: true });
      const report = await buildMaternalDrugSafetyReport(first);
      set({ currentReport: report, isLoadingReport: false });
    }
  },

  selectCandidateAndLoadReport: async (candidate: MaternalDrugSearchCandidate) => {
    set({ selectedCandidate: candidate, isLoadingReport: true });
    const report = await buildMaternalDrugSafetyReport(candidate);
    set({ currentReport: report, isLoadingReport: false });
  }
}));
