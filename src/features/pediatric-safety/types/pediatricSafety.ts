import { WhoFormularyItem } from '../data/whoChildrenFormularyDb';

export type PediatricDataFetchStatus = 'SUCCESS' | 'NO_DATA' | 'API_ERROR' | 'LOADING';
export type WhoMonographStatus = 'CONFIRMED' | 'NOT_FOUND' | 'CHECK_UNAVAILABLE';

export interface PediatricIngredientItem {
  koreanName: string;
  matchedInn?: string;
  amount?: string;
  unit?: string;
}

export interface PediatricSearchCandidate {
  itemSeq: string;
  productName: string;
  manufacturer: string;
  etcOtcName: string; // '전문의약품' | '일반의약품'
  dosageForm: string;
  route: string;
  mainIngredientsText: string;
  isCombination: boolean;
  ingredients: PediatricIngredientItem[];
}

export interface MfdsPediatricLabelInfo {
  status: PediatricDataFetchStatus;
  pediatricDosageSummary?: string;
  pediatricAgeRange?: string;
  weightBasedDose?: string;
  ageBasedDose?: string;
  frequencyAndInterval?: string;
  maxDailyDose?: string;
  pediatricPrecautions?: string;
  pediatricContraindications?: string;
  fullDocTexts: {
    eeDoc?: string;
    udDoc?: string;
    nbDoc?: string;
  };
}

export interface MfdsDurPediatricEntry {
  typeName: string; // '특정연령대금기' | '용량주의' | '투여기간주의' 등
  typeCode?: string;
  itemName: string;
  ingrName?: string;
  tabooAge?: string;
  tabooReason?: string;
  exceptionCondition?: string;
  officialBasis?: string;
}

export interface MfdsDurPediatricInfo {
  status: PediatricDataFetchStatus;
  hasAgeTaboo: boolean;
  hasCapacityNotice: boolean;
  hasPeriodNotice: boolean;
  entries: MfdsDurPediatricEntry[];
  noticeMessage: string;
}

export interface OpenFdaPediatricInfo {
  status: PediatricDataFetchStatus;
  brandName?: string;
  genericName?: string;
  dosageForm?: string;
  route?: string;
  pediatricUse?: string;
  dosageAndAdministration?: string;
  contraindications?: string;
  warningsAndPrecautions?: string;
  splSetId?: string;
  isExactMatch: boolean;
}

export interface DailyMedInfo {
  brandName: string;
  genericName: string;
  dosageForm: string;
  dailyMedUrl: string;
  splSetId?: string;
}

export interface WhoChildrenFormularyReport {
  status: WhoMonographStatus; // 'CONFIRMED' (A) | 'NOT_FOUND' (B) | 'CHECK_UNAVAILABLE' (C)
  items: WhoFormularyItem[];
  disclaimer: string;
  message?: string;
}

export interface RchMelbourneInfo {
  url: string;
  title: string;
  description: string;
}

export interface PediatricDrugReport {
  candidate: PediatricSearchCandidate;
  mfdsLabel: MfdsPediatricLabelInfo;
  durInfo: MfdsDurPediatricInfo;
  openFdaList: Array<{
    ingredientInn: string;
    fda: OpenFdaPediatricInfo;
    dailyMed: DailyMedInfo;
  }>;
  whoList: Array<{
    ingredientInn: string;
    who: WhoChildrenFormularyReport;
  }>;
  rchMelbourne: RchMelbourneInfo;
  generatedAt: string;
}
