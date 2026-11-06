import { create } from 'zustand';
import {
  PediatricDrugReport,
  PediatricSearchCandidate
} from '../types/pediatricSafety';
import {
  buildPediatricDrugReport,
  searchDomesticDrugsForPediatric,
  VERIFIED_PEDIATRIC_SEED_PRODUCTS
} from '../services/pediatricSearchService';

export type PediatricDashboardTab = 'ALL' | 'MFDS' | 'DUR' | 'OPENFDA' | 'WHO';

interface PediatricStoreState {
  searchQuery: string;
  isSearching: boolean;
  searchCandidates: PediatricSearchCandidate[];
  detectedIngredientNotice: string | null;
  searchApiError: string | null;

  selectedCandidate: PediatricSearchCandidate | null;
  currentReport: PediatricDrugReport | null;
  isLoadingReport: boolean;
  activeTab: PediatricDashboardTab;

  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: PediatricDashboardTab) => void;
  executeSearch: (query: string) => Promise<void>;
  selectCandidateAndLoadReport: (candidate: PediatricSearchCandidate) => Promise<void>;
  resetSelection: () => void;
}

export const usePediatricStore = create<PediatricStoreState>((set) => ({
  searchQuery: '',
  isSearching: false,
  searchCandidates: VERIFIED_PEDIATRIC_SEED_PRODUCTS,
  detectedIngredientNotice: null,
  searchApiError: null,

  selectedCandidate: null,
  currentReport: null,
  isLoadingReport: false,
  activeTab: 'ALL',

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  resetSelection: () =>
    set({
      selectedCandidate: null,
      currentReport: null,
      isLoadingReport: false
    }),

  executeSearch: async (query: string) => {
    set({
      searchQuery: query,
      isSearching: true,
      searchApiError: null,
      detectedIngredientNotice: null
    });

    const res = await searchDomesticDrugsForPediatric(query);
    set({
      isSearching: false,
      searchCandidates: res.candidates,
      detectedIngredientNotice: res.detectedIngredientNotice || null,
      searchApiError: res.apiError || null
    });

    if (res.candidates.length === 1) {
      const onlyOne = res.candidates[0];
      set({ selectedCandidate: onlyOne, isLoadingReport: true });
      const report = await buildPediatricDrugReport(onlyOne);
      set({ currentReport: report, isLoadingReport: false });
    } else {
      set({ selectedCandidate: null, currentReport: null, isLoadingReport: false });
    }
  },

  selectCandidateAndLoadReport: async (candidate: PediatricSearchCandidate) => {
    set({ selectedCandidate: candidate, isLoadingReport: true });
    const report = await buildPediatricDrugReport(candidate);
    set({ currentReport: report, isLoadingReport: false });
  }
}));
