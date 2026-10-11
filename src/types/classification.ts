/**
 * 약국 영양제 및 일반의약품 분류 체계
 */

export type ProductClassification = 
  | 'OTC_DRUG'                 // 일반의약품 (식약처 허가 및 KPAIC(Korea Pharmaceutical Information Center) 기준)
  | 'HEALTH_FUNCTIONAL_FOOD'   // 건강기능식품 (식품안전나라 품목제조신고 기준)
  | 'GENERAL_FOOD';            // 기타가공품/일반식품

export interface ClassificationMeta {
  code: ProductClassification;
  labelKorean: string;
  regulatoryBody: string; // 식약처(의약품안전나라), 식품안전나라 등
  standardSource: string; // 약학정보원(KPAIC: Korea Pharmaceutical Information Center) 또는 공공데이터포털
  description: string;
}

export const CLASSIFICATION_CONFIG: Record<ProductClassification, ClassificationMeta> = {
  OTC_DRUG: {
    code: 'OTC_DRUG',
    labelKorean: '일반의약품',
    regulatoryBody: '식품의약품안전처(의약품안전나라)',
    standardSource: '약학정보원(KPAIC: Korea Pharmaceutical Information Center)',
    description: '질병의 치료 및 예방 목적의 일반의약품(OTC: Over-The-Counter) 허가 품목'
  },
  HEALTH_FUNCTIONAL_FOOD: {
    code: 'HEALTH_FUNCTIONAL_FOOD',
    labelKorean: '건강기능식품',
    regulatoryBody: '식품의약품안전처(식품안전나라)',
    standardSource: '식품안전나라 건강기능식품 품목제조신고 DB',
    description: '인체에 유용한 기능성을 가진 원료나 성분을 사용하여 제조·가공한 식품'
  },
  GENERAL_FOOD: {
    code: 'GENERAL_FOOD',
    labelKorean: '기타가공품/일반식품',
    regulatoryBody: '식품의약품안전처',
    standardSource: '일반식품 품목보고 DB',
    description: '혼합음료, 기타가공품, 캔디류 등 기능성 표시가 제한된 일반 식품군'
  }
};

export type DosageForm =
  | 'TABLET'            // 정제
  | 'FILM_COATED_TABLET'// 필름코팅정
  | 'ENTERIC_TABLET'    // 장용정
  | 'HARD_CAPSULE'      // 경질캡슐
  | 'SOFT_CAPSULE'      // 연질캡슐
  | 'POWDER'            // 산제/가루
  | 'GRANULE'           // 과립제
  | 'LIQUID_ORAL'       // 액제/시럽제
  | 'JELLY';            // 젤리/츄어블
