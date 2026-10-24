import { ProductItem } from '../types/product';
import { ProductClassification } from '../types/classification';

/**
 * 수입 의약품 / 수입 건강기능식품 / 수입 식품 판별 함수
 * - 가네-드림, 지-드림, 엠-드림 등 해외 수입 드림 라인업
 * - 해외 제조사 (캐나다, 미국, 독일, 호주 등) 또는 영문 법인명 (Inc., LLC, Ltd., Corp.)
 * - 수입식품 한글표시사항(koreanLabelText) 또는 수입_ 등록번호
 * - 제조원/수입원 필드에 '수입' 표기
 */
export function isImportedProduct(product?: ProductItem | null): boolean {
  if (!product) return false;

  // 1. 명시적 수입 데이터 소스, 수입 등록번호 또는 수입 태그
  if (product.id?.startsWith('imported_')) return true;
  if ((product as any).sourceOrigin?.includes('수입식품')) return true;
  if (product.tags?.some((t) => t.includes('수입'))) return true;

  const regCode = (product.otcDetail?.itemSeq || product.functionalFoodDetail?.reportNo || '').trim();
  if (regCode.startsWith('수입_') || regCode.startsWith('수입식품')) return true;

  // 2. 제조사 / 유통사 표기 분석
  const mfg = `${product.manufacturer || ''} ${product.distributor || ''}`.trim();

  // 해외 수입 징표 감지 (국가명, 수입원, 해외 영문 법인 형태)
  const hasImportIndicator =
    mfg.includes('수입') ||
    /\((?:캐나다|미국|독일|호주|일본|스위스|영국|프랑스|뉴질랜드|이탈리아|스페인|네덜란드|아일랜드|덴마크|노르웨이|스웨덴|벨기에|오스트리아|폴란드|인도|중국|대만)\)/i.test(mfg) ||
    /\b(?:INC|LLC|LTD|CORP|GMBH|LABORATORIES|NUTRACEUTICAL|NUTRACEUTICALS|PHARMACEUTICALS)\b/i.test(mfg);

  // 3. 국내 제조사 명확 감지 (예: '주식회사 아리너스', '코스맥스엔비티(주)', '주식회사 네추럴웨이' 등)
  // 단, '수입원'이나 해외 국가명/법인명이 포함되지 않은 순수 국내 제조사일 경우 절대 수입으로 판정하지 않음
  const isDomesticManufacturer =
    !hasImportIndicator &&
    /주식회사|\(주\)|제[0-9]+공장|농업회사법인|제약|바이오/i.test(mfg);

  if (isDomesticManufacturer) {
    return false;
  }

  // 해외 수입 징표가 있는 경우 수입 확정
  if (hasImportIndicator) return true;

  // 4. 수입 한글표시사항 필드 보유 여부
  if (product.functionalFoodDetail?.koreanLabelText?.trim()) return true;
  if ((product as any).koreanLabelText?.trim()) return true;

  // 5. 대표적인 해외 수입 브랜드명 패턴 (가네드림, 지드림 등 해외 직수입 라인업 - 단, 국내 제조사는 위 3번에서 이미 제외됨)
  const normName = (product.productName || '').replace(/[\s\-_]/g, '').toLowerCase();
  if (
    /^(가네드림|지드림|에스드림|아이드림|피드림|엔드림|비드림|디드림|ganedream|gdream|sdream)/.test(
      normName
    ) ||
    /^(솔가|나우푸드|쏜리서치|세노비스|닥터스베스트|자로우|소스내추럴|라이프익스텐션)/.test(normName)
  ) {
    return true;
  }

  return false;
}

/**
 * 분류 라벨 포맷터
 * - 건강기능식품, 기타가공품/식품에 한해 수입제품인 경우 뒤에 ' (수입)' 표기 추가 (일반의약품은 제외)
 * - 예: '건강기능식품 (수입)', '기타가공품/식품 (수입)', '일반의약품'
 */
export function getProductClassificationLabel(
  classification: ProductClassification,
  isImported: boolean = false
): string {
  switch (classification) {
    case 'OTC_DRUG':
      return '일반의약품';
    case 'HEALTH_FUNCTIONAL_FOOD':
      return isImported ? '건강기능식품 (수입)' : '건강기능식품';
    case 'GENERAL_FOOD':
      return isImported ? '기타가공품/식품 (수입)' : '기타가공품/식품';
    default:
      return classification;
  }
}
