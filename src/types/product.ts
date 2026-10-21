import { ProductClassification, DosageForm } from './classification';
import { ProductIngredientEntry } from './ingredient';

/**
 * 일반의약품 전용 식약처/약학정보원(KPAIC) 메타데이터
 */
export interface OtcDrugRegulatoryDetail {
  itemSeq: string;                      // 식약처 품목기준코드 (예: "201801234")
  permitDate: string;                   // 허가일자
  atcCode?: string;                     // ATC(Anatomical Therapeutic Chemical) 분류 코드
  kpaicCode?: string;                   // 약학정보원 표준 식별 코드
  indicationsKorean: string[];          // 허가받은 효능·효과 (식약처 전문)
  dosageAndAdministrationKorean: string;// 용법·용량 (식약처 허가사항)
  storageMethodKorean: string;          // 저장 방법 (예: "기밀용기, 실온(1~30℃)보관")
  precautionsSummaryKorean: string[];   // 사용상의 주의사항 요약
}

/**
 * 건강기능식품 및 일반식품 전용 식품안전나라 메타데이터
 */
export interface FunctionalFoodRegulatoryDetail {
  reportNo: string;                     // 품목제조보고번호 (식품안전나라)
  functionalClaimsKorean: string[];     // 인정받은 영양·기능 정보 (예: "결합조직 형성과 기능유지에 필요")
  suggestedUseKorean: string;           // 섭취량 및 섭취방법
  safetyPrecautionsKorean: string[];    // 섭취 시 주의사항
  standardSpecificationKorean?: string; // 기준 및 규격
  labelPrecautionsText?: string;        // 제품 실물 뒷면 라벨 사진(OCR)에서 추출된 상세 주의사항 전문
  subIngredientsText?: string;          // 기타원료 / 부원료 목록 전문 (식품안전나라 ETC_RAWMTRL_NM)
  rawMaterialsText?: string;            // 원재료명 전문 (식품안전나라 C003 RAWMTRL_NM)
  appearanceKorean?: string;            // 성상 (식품안전나라 C003 DISPOS)
  safetyPrecautionsText?: string;       // 섭취 시 주의사항 전문 (식품안전나라 C003 IFTKN_ATNT_MATR_CN)
  koreanLabelText?: string;             // 수입식품 한글표시사항 원문 전문 (KORLABEL)
}

export interface AttachedDocument {
  id: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
  dataUrl: string; // 이미지 Base64 데이터 URL
  status?: 'PENDING' | 'ANALYZING' | 'ANALYZED' | 'FAILED';
  analysisSummary?: string; // 예: "약학정보원 약효분류 18건 적용 완료"
  extractedText?: string;
  docType?: 'BACK_LABEL' | 'GENERAL';
}

/**
 * 첨부 문서가 제품 뒷면 라벨 사진인지 판별
 */
export function isBackLabelAttachment(doc?: { id?: string; fileName?: string; docType?: string }): boolean {
  if (!doc) return false;
  if (doc.docType === 'BACK_LABEL') return true;
  if (doc.id && doc.id.startsWith('doc_back_')) return true;
  if (doc.fileName && (doc.fileName.includes('뒷면') || doc.fileName.toLowerCase().includes('back'))) return true;
  return false;
}

/**
 * 제품 대표 썸네일 반환
 * - 오직 사용자가 직접 등록한 제품 대표 사진(product.imageUrl)만 카탈로그 대표 사진으로 사용합니다.
 * - 성분/함량 추출용으로 첨부된 자료, 영양정보표, 라벨 사진 등(attachments)은 절대 카탈로그 대표 사진으로 노출되지 않습니다.
 */
export function getProductThumbnail(product?: Partial<ProductItem> | null): string | undefined {
  if (!product) return undefined;
  if (!product.imageUrl) return undefined;

  // 첨부자료 dataUrl이나 성분 추출용 라벨 이미지가 imageUrl에 잘못 들어가 있는 경우 차단
  if (
    product.attachments &&
    product.attachments.some((a) => a.dataUrl === product.imageUrl)
  ) {
    return undefined;
  }

  if (
    product.imageUrl.includes('/attachments/') ||
    product.imageUrl.includes('영양기능정보') ||
    product.imageUrl.includes('성분표')
  ) {
    return undefined;
  }

  return product.imageUrl;
}


/**
 * 약국 영양제 및 일반의약품 통합 마스터 품목 모델
 */
export interface ProductItem {
  id: string;                           // 내부 UUID
  barcode?: string;                     // 바코드 (GTIN-13)
  productName: string;                  // 한글 공식 제품명 (예: "비맥스메타정", "아로나민골드프리미엄정")
  classification: ProductClassification;// [일반의약품] | [건강기능식품] | [기타가공품/식품]
  manufacturer: string;                 // 제조의뢰자 / 제조사
  distributor?: string;                 // 판매원
  dosageForm: DosageForm;               // 제형
  packagingUnit: string;                // 포장 단위 (예: "120정 (60정 x 2)", "60캡슐")

  // 복용 스케줄 및 기준
  dailyServings: number;                // 1일 복용 횟수 (예: 1회)
  amountPerServing: number;             // 1회 복용량 (예: 1정)
  servingUnitKorean: string;            // 단위 (정, 캡슐, 포, ml)
  ingredientBasis?: 'PER_UNIT' | 'PER_DAILY'; // 성분 함량 기재 기준 (1알/1포당 vs 하루 섭취량당)

  // 성분 리스트 (모든 유효성분은 영문 INN 기준 매핑)
  ingredients: ProductIngredientEntry[];

  // 첨부 참고 자료 (약학정보원 캡처, 라벨 사진, 제약사 브로슈어 등)
  attachments?: AttachedDocument[];

  // 분류별 규제 세부 정보
  otcDetail?: OtcDrugRegulatoryDetail;
  functionalFoodDetail?: FunctionalFoodRegulatoryDetail;

  // 약국 관리 속성
  imageUrl?: string;                    // 제품 대표 사진 (Base64 데이터 URL 또는 외부 이미지 URL)
  storageLocation?: string;             // 약국 내 진열/보관 위치 (예: "상담석 우측 2단", "영양제 매대 A-1")
  priceRetailKrw?: number;              // 약국 소비자 판매가 (KRW)
  inventoryCount?: number;              // 현재 재고 수량
  tags: string[];                       // 효능 및 검색 태그 (예: ["피로", "간", "신경통", "고함량B군"])
  pharmacistNotes?: string;             // 약사 상담 노하우 및 복약지도 메모 (언제든 수정 가능한 메모장)
  isActive: boolean;                    // 취급 활성화 여부
  createdAt: string;
  updatedAt: string;
}
