import {
  DRUG_MASTER_DB,
  PREGNANCY_SAFETY_DB,
  LACTATION_SAFETY_DB,
  EVIDENCE_SOURCES_DB,
  INGREDIENT_MAPPING_DB
} from '../data/verifiedMaternalDb';
import {
  DrugMasterRecord,
  IngredientMappingRecord,
  MaternalSearchResult,
  AdministrationRoute
} from '../types/maternalSafety';
import {
  searchPublicDrugDatabase,
  fetchMfdsDrugDetail,
  normalizeDrugSearchText
} from '../../../services/publicDataService';

/**
 * 한글/영문 성분명을 MVP 5대 핵심 성분 ID로 매핑
 * - 5대 핵심 성분에 해당하지 않는 성분은 절대 임의로 다른 성분에 끼워 맞추지 않고 'UNVERIFIED_INGREDIENT' 반환
 */
export function resolveCoreMaternalIngredientId(rawName: string): {
  ingredientId: string;
  englishInn: string;
  koreanName: string;
  isVerifiedCore5: boolean;
} {
  const norm = normalizeDrugSearchText(rawName);

  if (
    norm.includes('acetaminophen') ||
    norm.includes('paracetamol') ||
    norm.includes('아세트아미노펜') ||
    norm.includes('아세트아미노펜제피세립')
  ) {
    return {
      ingredientId: 'ing_acetaminophen',
      englishInn: 'Acetaminophen',
      koreanName: '아세트아미노펜',
      isVerifiedCore5: true
    };
  }

  // 주의: 덱시부프로펜(Dexibuprofen)은 이부프로펜의 활성 거울상이성질체이나 별도 성분명을 유지하고 구분 안내
  if (
    (norm.includes('ibuprofen') && !norm.includes('dexibuprofen')) ||
    (norm.includes('이부프로펜') && !norm.includes('덱시부프로펜'))
  ) {
    return {
      ingredientId: 'ing_ibuprofen',
      englishInn: 'Ibuprofen',
      koreanName: '이부프로펜',
      isVerifiedCore5: true
    };
  }

  if (
    (norm.includes('cetirizine') && !norm.includes('levocetirizine')) ||
    (norm.includes('세티리진') && !norm.includes('레보세티리진'))
  ) {
    return {
      ingredientId: 'ing_cetirizine',
      englishInn: 'Cetirizine',
      koreanName: '세티리진',
      isVerifiedCore5: true
    };
  }

  if (
    norm.includes('chlorpheniramine') ||
    norm.includes('chlorphenamine') ||
    norm.includes('클로르페니라민')
  ) {
    return {
      ingredientId: 'ing_chlorpheniramine',
      englishInn: 'Chlorpheniramine',
      koreanName: '클로르페니라민',
      isVerifiedCore5: true
    };
  }

  if (norm.includes('amoxicillin') || norm.includes('amoxycillin') || norm.includes('아목시실린')) {
    return {
      ingredientId: 'ing_amoxicillin',
      englishInn: 'Amoxicillin',
      koreanName: '아목시실린',
      isVerifiedCore5: true
    };
  }

  return {
    ingredientId: 'UNVERIFIED_INGREDIENT',
    englishInn: rawName.trim(),
    koreanName: rawName.trim(),
    isVerifiedCore5: false
  };
}

/**
 * 제형/성상 텍스트로부터 투여 경로 판별
 */
function inferRouteFromDosageForm(formOrName: string): {
  route: AdministrationRoute;
  routeKorean: string;
} {
  const s = formOrName.toLowerCase();
  if (/점안|안약/.test(s)) return { route: 'OPHTHALMIC', routeKorean: '점안 투여' };
  if (/연고|크림|겔|로션|외용|패치|카타플라스마|플라스타/.test(s)) {
    return { route: 'TOPICAL', routeKorean: '외용 도포/부착' };
  }
  if (/주사|바이알|앰플/.test(s) && !/내복/.test(s)) {
    return { route: 'INJECTION', routeKorean: '주사 투여' };
  }
  if (/흡입|분무|나잘스프레이/.test(s)) {
    return { route: 'INHALATION', routeKorean: '흡입/비강 분무' };
  }
  return { route: 'ORAL', routeKorean: '경구 투여' };
}

/**
 * 로컬 검증 DB(5대 성분 + 대표 단일/복합제) 즉시 검색
 */
export function searchLocalMaternalDatabase(query: string): MaternalSearchResult[] {
  const clean = query.trim();
  const norm = normalizeDrugSearchText(clean);

  const results: MaternalSearchResult[] = [];

  // 1. 5대 핵심 성분 직접 검색 (영문 INN / 한글 성분명 / 약효군)
  for (const preg of Object.values(PREGNANCY_SAFETY_DB)) {
    const matchInn = normalizeDrugSearchText(preg.englishInn).includes(norm);
    const matchKor = normalizeDrugSearchText(preg.koreanIngrName).includes(norm);
    const matchClass = normalizeDrugSearchText(preg.therapeuticClass).includes(norm);

    if (!norm || matchInn || matchKor || matchClass) {
      results.push({
        resultType: 'INGREDIENT_DIRECT',
        id: `direct_${preg.ingredientId}`,
        displayName: `${preg.koreanIngrName} (${preg.englishInn})`,
        subLabel: `${preg.therapeuticClass} · ${preg.routeKorean}`,
        isCombination: false,
        mappedIngredients: [
          {
            mappingId: `direct_map_${preg.ingredientId}`,
            drugMasterId: `direct_${preg.ingredientId}`,
            koreanProductName: `${preg.koreanIngrName} 단일 성분 표준`,
            itemSeq: '-',
            koreanIngredientName: preg.koreanIngrName,
            englishIngredientName: preg.englishInn,
            ingredientId: preg.ingredientId,
            amountText: '상용 치료 용량 기준',
            dosageForm: '경구제 표준',
            route: preg.route,
            isCombination: false,
            verificationStatus: 'VERIFIED_CORE_5'
          }
        ],
        primaryIngredientId: preg.ingredientId
      });
    }
  }

  // 2. 내장 국내 허가 의약품(단일제·복합제) 검색
  for (const drug of DRUG_MASTER_DB) {
    const mappings = INGREDIENT_MAPPING_DB.filter((m) => m.drugMasterId === drug.id);
    const matchProd = normalizeDrugSearchText(drug.koreanProductName).includes(norm);
    const matchEng = normalizeDrugSearchText(drug.englishIngredientsSummary).includes(norm);
    const matchSeq = drug.itemSeq.includes(clean);
    const matchIng = mappings.some(
      (m) =>
        normalizeDrugSearchText(m.koreanIngredientName).includes(norm) ||
        normalizeDrugSearchText(m.englishIngredientName).includes(norm)
    );

    if (!norm || matchProd || matchEng || matchSeq || matchIng) {
      const firstVerified = mappings.find((m) => m.verificationStatus === 'VERIFIED_CORE_5');
      results.push({
        resultType: 'DOMESTIC_PRODUCT',
        id: drug.id,
        displayName: drug.koreanProductName,
        subLabel: `${drug.manufacturer} · ${drug.dosageForm} · 품목기준코드 ${drug.itemSeq}`,
        isCombination: drug.isCombination,
        drugMaster: drug,
        mappedIngredients: mappings,
        primaryIngredientId: firstVerified?.ingredientId || mappings[0]?.ingredientId || 'ing_acetaminophen'
      });
    }
  }

  return results;
}

/**
 * 식약처 의약품 허가 API (DrugPrdtPrmsnInfoService08) 실시간 연동 검색
 * - 약사가 내장 샘플 외의 국내 의약품 제품명을 검색했을 때 실시간으로 식약처 원료약품 및 허가사항(임부·수유부 조항)을 가져와 분석
 */
export async function searchLiveMfdsForMaternalSafety(query: string): Promise<MaternalSearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  try {
    const mfdsItems = await searchPublicDrugDatabase(clean, {
      classification: 'OTC_DRUG',
      targetSource: 'OTC_DRUG'
    });

    if (!mfdsItems || mfdsItems.length === 0) return [];

    const topItems = mfdsItems.slice(0, 6);
    const liveResults: MaternalSearchResult[] = [];

    for (const item of topItems) {
      // 이미 내장 DB에 동일 품목기준코드로 등록된 경우 중복 제외
      if (DRUG_MASTER_DB.some((d) => d.itemSeq === item.regulatoryCode)) {
        continue;
      }

      // 상세 원료약품 및 주의사항(NB_DOC_DATA) 조회
      const detail = await fetchMfdsDrugDetail(item.regulatoryCode);
      const rawIngText = detail?.rawIngredientsText || item.rawIngredientsText || '';
      const rawLines = rawIngText
        .split(/[\r\n\/;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const { route, routeKorean } = inferRouteFromDosageForm(`${item.dosageForm} ${item.productName}`);
      const mappedIngredients: IngredientMappingRecord[] = [];

      rawLines.forEach((line, idx) => {
        // 예: "아세트아미노펜 (Acetaminophen) 500mg" 또는 "이부프로펜 200mg"
        const amountMatch = line.match(/([0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ug|μg|mL|IU))/i);
        const amountText = amountMatch ? amountMatch[1] : '허가사항 참조';
        const nameOnly = line.replace(/\([^)]*\)/g, '').replace(/[0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ug|μg|mL|IU).*/i, '').trim() || line;

        const resolved = resolveCoreMaternalIngredientId(line);
        mappedIngredients.push({
          mappingId: `live_map_${item.regulatoryCode}_${idx}`,
          drugMasterId: `live_${item.regulatoryCode}`,
          koreanProductName: item.productName,
          itemSeq: item.regulatoryCode,
          koreanIngredientName: nameOnly,
          englishIngredientName: resolved.englishInn,
          ingredientId: resolved.ingredientId,
          amountText,
          dosageForm: item.dosageForm,
          route,
          isCombination: rawLines.length > 1,
          verificationStatus: resolved.isVerifiedCore5 ? 'VERIFIED_CORE_5' : 'UNVERIFIED_IN_MVP'
        });
      });

      if (mappedIngredients.length === 0) {
        const resolved = resolveCoreMaternalIngredientId(item.productName);
        mappedIngredients.push({
          mappingId: `live_map_${item.regulatoryCode}_0`,
          drugMasterId: `live_${item.regulatoryCode}`,
          koreanProductName: item.productName,
          itemSeq: item.regulatoryCode,
          koreanIngredientName: resolved.koreanName,
          englishIngredientName: resolved.englishInn,
          ingredientId: resolved.ingredientId,
          amountText: '허가사항 참조',
          dosageForm: item.dosageForm,
          route,
          isCombination: false,
          verificationStatus: resolved.isVerifiedCore5 ? 'VERIFIED_CORE_5' : 'UNVERIFIED_IN_MVP'
        });
      }

      // 식약처 주의사항(precautionsSummary)에서 임부/수유부 관련 문단 추출
      const allPrecautions = detail?.precautionsSummary || item.precautionsSummary || [];
      const maternalParagraphs = allPrecautions.filter((p) => /임부|임신|수유|태아|기형|동맥관|양수/.test(p));
      const mfdsPregnancyPrecautionText =
        maternalParagraphs.length > 0
          ? maternalParagraphs.slice(0, 6).join('\n')
          : '식약처 상세 허가사항 원문 링크에서 임부 및 수유부 투여 조항을 확인하십시오.';

      const hasIbuprofen = mappedIngredients.some((m) => m.ingredientId === 'ing_ibuprofen');

      const drugMaster: DrugMasterRecord = {
        id: `live_${item.regulatoryCode}`,
        itemSeq: item.regulatoryCode,
        koreanProductName: item.productName,
        englishIngredientsSummary: mappedIngredients.map((m) => m.englishIngredientName).join(' / '),
        strengthText: mappedIngredients.map((m) => m.amountText).join(' / '),
        dosageForm: item.dosageForm,
        route,
        routeKorean,
        manufacturer: item.manufacturer,
        isCombination: mappedIngredients.length > 1,
        mfdsPregnancyPrecautionText,
        durPregnancyTabooGrade: hasIbuprofen ? 'GRADE_2' : 'NONE',
        durPregnancyTabooDetail: hasIbuprofen
          ? '이부프로펜 함유 제제: 식약처 DUR 임부금기 2등급 해당'
          : null,
        productSourceUrl: `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${item.regulatoryCode}`,
        updatedAt: new Date().toISOString().slice(0, 10)
      };

      const firstVerified = mappedIngredients.find((m) => m.verificationStatus === 'VERIFIED_CORE_5');

      liveResults.push({
        resultType: 'DOMESTIC_PRODUCT',
        id: drugMaster.id,
        displayName: drugMaster.koreanProductName,
        subLabel: `[식약처 실시간 연동] ${drugMaster.manufacturer} · 품목기준코드 ${drugMaster.itemSeq}`,
        isCombination: drugMaster.isCombination,
        drugMaster,
        mappedIngredients,
        primaryIngredientId: firstVerified?.ingredientId || mappedIngredients[0].ingredientId
      });
    }

    return liveResults;
  } catch (e) {
    console.warn('식약처 실시간 임신·수유 의약품 검색 실패:', e);
    return [];
  }
}

/**
 * 미국 FDA openFDA API 실시간 라벨 원문 조회 (Pregnancy 8.1 & Lactation 8.2)
 */
export async function fetchLiveOpenFdaLabel(englishInn: string): Promise<{
  pregnancyText: string | null;
  lactationText: string | null;
  effectiveTime: string | null;
} | null> {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(
      englishInn
    )}%22+AND+_exists_:pregnancy&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const record = data?.results?.[0];
    if (!record) return null;

    const pregnancyText = Array.isArray(record.pregnancy)
      ? record.pregnancy.join('\n\n')
      : Array.isArray(record.teratogenic_effects)
      ? record.teratogenic_effects.join('\n\n')
      : null;

    const lactationText = Array.isArray(record.lactation)
      ? record.lactation.join('\n\n')
      : Array.isArray(record.nursing_mothers)
      ? record.nursing_mothers.join('\n\n')
      : null;

    return {
      pregnancyText,
      lactationText,
      effectiveTime: record.effective_time || null
    };
  } catch {
    return null;
  }
}

/**
 * 성분 ID로 임신·수유 안전성 및 출처 문헌 일괄 조회
 */
export function getVerifiedIngredientBundle(ingredientId: string) {
  const pregnancy = PREGNANCY_SAFETY_DB[ingredientId] || null;
  const lactation = LACTATION_SAFETY_DB[ingredientId] || null;
  const sources = Object.values(EVIDENCE_SOURCES_DB).filter((s) => s.ingredientId === ingredientId);
  return {
    pregnancy,
    lactation,
    sources
  };
}
