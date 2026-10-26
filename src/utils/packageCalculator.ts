import { ProductItem, ProductPackageOption } from '../types/product';

/**
 * 제품의 1일 복용량(일일 섭취 총 알수/병수/포수)을 안전하게 계산
 */
export function getDailyDose(product: ProductItem): number {
  if (product.dailyServings && product.amountPerServing && product.dailyServings > 0 && product.amountPerServing > 0) {
    return product.dailyServings * product.amountPerServing;
  }

  // 복용 스케줄 필드가 불완전할 경우 용법·용량 텍스트에서 지능형 추출
  const dosageText =
    product.otcDetail?.dosageAndAdministrationKorean ||
    product.functionalFoodDetail?.suggestedUseKorean ||
    '';

  if (dosageText) {
    // 1일 X회, 1회 Y정/병/포 패턴 매칭
    const pattern1 = /1일\s*(\d+)회[^\d]*1회\s*(\d+)/i;
    const match1 = dosageText.match(pattern1);
    if (match1) {
      const times = parseInt(match1[1], 10);
      const dose = parseInt(match1[2], 10);
      if (times > 0 && dose > 0) return times * dose;
    }

    // 1일 X정/병/포 패턴 매칭 (예: 1일 2병, 1일 2정)
    const pattern2 = /1일\s*(\d+)\s*(?:정|캡슐|병|포|바이알|포대)/i;
    const match2 = dosageText.match(pattern2);
    if (match2) {
      const count = parseInt(match2[1], 10);
      if (count > 0) return count;
    }
  }

  return 1; // 기본값 1
}

/**
 * 포장 단위 문자열에서 총 수량 및 단위 자동 추출
 * - 예: "360정" -> { quantity: 360, unit: "정" }
 * - 예: "120정 (60정 x 2)" -> { quantity: 120, unit: "정" }
 * - 예: "30병" -> { quantity: 30, unit: "병" }
 * - 예: "20mL/바이알" -> { quantity: 1, unit: "병" }
 */
export function parseQuantityFromPackagingUnit(
  packagingUnit?: string,
  defaultUnit: string = '정'
): { quantity: number; unit: string } {
  if (!packagingUnit || !packagingUnit.trim()) {
    return { quantity: 1, unit: defaultUnit };
  }

  const clean = packagingUnit.trim();

  // "120정 (60정 x 2)" 등 괄호 앞의 전체 총량 우선 파싱
  const totalMatch = clean.match(/^(\d[\d,]*)\s*([가-힣a-zA-Z]+)/);
  if (totalMatch) {
    const qty = parseInt(totalMatch[1].replace(/,/g, ''), 10);
    const unit = totalMatch[2] || defaultUnit;
    if (qty > 0) return { quantity: qty, unit };
  }

  // "60정 x 2" 등 곱셈 패턴 파싱
  const multMatch = clean.match(/(\d+)\s*[가-힣a-zA-Z]*\s*[xX*×]\s*(\d+)/);
  if (multMatch) {
    const a = parseInt(multMatch[1], 10);
    const b = parseInt(multMatch[2], 10);
    if (a > 0 && b > 0) {
      return { quantity: a * b, unit: defaultUnit };
    }
  }

  // 숫자만 있는 경우
  const numMatch = clean.match(/(\d+)/);
  if (numMatch) {
    const qty = parseInt(numMatch[1], 10);
    if (qty > 0) return { quantity: qty, unit: defaultUnit };
  }

  return { quantity: 1, unit: defaultUnit };
}

/**
 * 총 수량과 1일 복용량을 바탕으로 복용 가능 기간 계산
 * - 예: 360정 / 1일 6정 = 60일 -> "2개월분 (60일)"
 * - 예: 30병 / 1일 2병 = 15일 -> "15일분"
 * - 예: 1병 / 1일 2병 = 0.5일 -> "반나절분 (0.5일)"
 */
export function calculateDuration(
  totalQuantity: number,
  dailyDose: number,
  customDays?: number
): {
  days: number;
  shortText: string;
  fullText: string;
  isFractional: boolean;
} {
  if (customDays !== undefined && customDays > 0) {
    const days = customDays;
    const months = parseFloat((days / 30).toFixed(1));
    const isExactMonth = days % 30 === 0;
    return {
      days,
      shortText: days < 30 ? `${days}일분` : isExactMonth ? `${Math.round(months)}개월분` : `약 ${months}개월분`,
      fullText: days < 30 ? `${days}일분` : isExactMonth ? `${Math.round(months)}개월분 (${days}일)` : `약 ${months}개월분 (${days}일)`,
      isFractional: false
    };
  }

  if (dailyDose <= 0 || totalQuantity <= 0) {
    return { days: 0, shortText: '-', fullText: '-', isFractional: false };
  }

  const rawDays = totalQuantity / dailyDose;

  if (rawDays < 1) {
    const displayDays = parseFloat(rawDays.toFixed(1));
    return {
      days: displayDays,
      shortText: '반나절분',
      fullText: `반나절분 (${displayDays}일)`,
      isFractional: true
    };
  }

  const days = Math.round(rawDays);
  if (days < 30) {
    return {
      days,
      shortText: `${days}일분`,
      fullText: `${days}일분`,
      isFractional: false
    };
  }

  const months = parseFloat((days / 30).toFixed(1));
  const isExactMonth = days % 30 === 0;

  return {
    days,
    shortText: isExactMonth ? `${Math.round(months)}개월분` : `약 ${months}개월분`,
    fullText: isExactMonth ? `${Math.round(months)}개월분 (${days}일)` : `약 ${months}개월분 (${days}일)`,
    isFractional: false
  };
}

/**
 * 1일당 환산 복용 비용 계산 (환자 상담 시 가격 저항 완화용 핵심 지표)
 * - 예: 30,000원에 60일분 -> 1일 500원
 * - 예: 70,000원에 15일분 -> 1일 4,667원
 */
export function calculateDailyCost(priceKrw: number, durationDays: number): number {
  if (priceKrw <= 0 || durationDays <= 0) return 0;
  return Math.round(priceKrw / durationDays);
}

/**
 * 제품의 포장 규격 옵션 목록 해석
 * - packageOptions가 등록되어 있으면 해당 목록 반환
 * - 등록되어 있지 않으면 packagingUnit 및 priceRetailKrw로부터 가상의 기본 규격 1개 자동 생성
 */
export function resolveProductPackageOptions(product: ProductItem): ProductPackageOption[] {
  if (product.packageOptions && product.packageOptions.length > 0) {
    return product.packageOptions;
  }

  // 기존 단일 가격/포장단위로부터 기본 1개 규격 생성
  const parsed = parseQuantityFromPackagingUnit(product.packagingUnit, product.servingUnitKorean || '정');
  return [
    {
      id: 'pkg_default',
      name: product.packagingUnit || `${parsed.quantity}${parsed.unit}`,
      totalQuantity: parsed.quantity,
      unit: parsed.unit,
      priceKrw: product.priceRetailKrw || 0,
      isDefault: true
    }
  ];
}

/**
 * 대표(기본) 포장 규격 가져오기
 */
export function getDefaultPackageOption(product: ProductItem): ProductPackageOption {
  const options = resolveProductPackageOptions(product);
  const def = options.find((o) => o.isDefault);
  return def || options[0];
}
