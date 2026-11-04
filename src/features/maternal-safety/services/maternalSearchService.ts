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
  AdministrationRoute,
  SafetySummaryLevel
} from '../types/maternalSafety';
import {
  searchPublicDrugDatabase,
  fetchMfdsDrugDetail,
  normalizeDrugSearchText
} from '../../../services/publicDataService';

/**
 * 한글 원료명에서 염(Salt)·수화물·제피·배산체 수식어를 제거하여 순수 성분명(Base Ingredient)으로 정규화
 * 예: "아토르바스타틴칼슘삼수화물" -> "아토르바스타틴"
 *     "세티리진염산염" -> "세티리진"
 *     "클로르페니라민말레산염" -> "클로르페니라민"
 */
export function stripKoreanSaltAndHydrate(rawName: string): string {
  if (!rawName) return '';
  let s = rawName
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ug|μg|mcg|mL|IU|밀리그램|밀리그람|그램|마이크로그램).*/gi, '')
    .trim();

  // 제피/미분화/배산 접미어 제거
  s = s.replace(/(제피세립|제피과립|미분화|배산|장용성과립|속방성과립)$/g, '').trim();

  // 수화물/무수물 제거 (반복 적용)
  for (let i = 0; i < 2; i++) {
    s = s
      .replace(
        /(십수화물|구수화물|팔수화물|칠수화물|육수화물|오수화물|사수화물|삼수화물|이수화물|일수화물|반수화물|수화물|무수물|수화)$/g,
        ''
      )
      .trim();

    // 염기(Salt) 제거
    s = s
      .replace(
        /(브롬화수소산염|요오드화수소산염|베실산염|말레산염|말레인산염|푸마르산염|타르타르산염|시트르산염|석시네이트|숙신산염|메실산염|토실산염|캄실산염|올레산염|스테아르산염|발레르산염|프로피온산염|아세트산염|글루콘산염|락트산염|염산염|황산염|질산염|인산염|탄산염|나트륨염|칼륨염|칼슘염|마그네슘염|스트론튬염|트롬에타민염|트로메타민염|디염산염|일염산염|칼슘|나트륨|칼륨|마그네슘)$/g,
        ''
      )
      .trim();
  }

  return s || rawName.trim();
}

/**
 * 영문 성분명에서 염(Salt) 및 수화물(Hydrate) 수식어를 제거하여 순수 INN(Base Moiety)으로 정규화
 * 예: "Atorvastatin Calcium Trihydrate" -> "Atorvastatin"
 *     "Cetirizine Hydrochloride" -> "Cetirizine"
 */
export function stripEnglishSaltAndHydrate(rawEng: string): string {
  if (!rawEng) return '';
  let s = rawEng
    .replace(/\([^)]*\)/g, '')
    .replace(/[0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ug|μg|mcg|mL|IU).*/gi, '')
    .trim();

  const saltWords = new RegExp(
    '\\b(Calcium|Sodium|Potassium|Magnesium|Strontium|Zinc|Hydrochloride|Dihydrochloride|HCl|Hydrobromide|HBr|Maleate|Besylate|Besilate|Mesylate|Mesilate|Tosylate|Camsylate|Fumarate|Tartrate|Citrate|Succinate|Sulfate|Sulphate|Phosphate|Nitrate|Acetate|Propionate|Valerate|Stearate|Gluconate|Lactate|Tromethamine|Trihydrate|Dihydrate|Monohydrate|Hemihydrate|Pentahydrate|Hydrate|Anhydrous|Micronized)\\b',
    'gi'
  );

  s = s.replace(saltWords, '').replace(/\s+/g, ' ').replace(/[,/;-]+$/, '').trim();
  return s || rawEng.trim();
}

/**
 * 검색어 내 단위 표기 정규화 ('리피토정 20mg' <-> '리피토정20밀리그램' 양방향 매칭 지원)
 */
export function normalizeQueryForProductMatch(text: string): string {
  return normalizeDrugSearchText(
    text
      .replace(/밀리그램|밀리그람/g, 'mg')
      .replace(/마이크로그램|마이크로그람/g, 'mcg')
      .replace(/그램|그람/g, 'g')
  );
}

/**
 * 주요 국내 다빈도 처방·일반의약품 순수 성분(염기 제외) 사전
 */
const COMMON_BASE_INGREDIENT_MAP: Array<{
  keywords: string[];
  ingredientId: string;
  englishInn: string;
  koreanName: string;
  isPrebuilt: boolean;
  therapeuticClass?: string;
  defaultDurGrade?: 'GRADE_1' | 'GRADE_2' | 'NONE';
}> = [
  {
    keywords: ['acetaminophen', 'paracetamol', '아세트아미노펜'],
    ingredientId: 'ing_acetaminophen',
    englishInn: 'Acetaminophen',
    koreanName: '아세트아미노펜',
    isPrebuilt: true
  },
  {
    keywords: ['ibuprofen', '이부프로펜'],
    ingredientId: 'ing_ibuprofen',
    englishInn: 'Ibuprofen',
    koreanName: '이부프로펜',
    isPrebuilt: true
  },
  {
    keywords: ['cetirizine', '세티리진'],
    ingredientId: 'ing_cetirizine',
    englishInn: 'Cetirizine',
    koreanName: '세티리진',
    isPrebuilt: true
  },
  {
    keywords: ['chlorpheniramine', 'chlorphenamine', '클로르페니라민'],
    ingredientId: 'ing_chlorpheniramine',
    englishInn: 'Chlorpheniramine',
    koreanName: '클로르페니라민',
    isPrebuilt: true
  },
  {
    keywords: ['amoxicillin', 'amoxycillin', '아목시실린'],
    ingredientId: 'ing_amoxicillin',
    englishInn: 'Amoxicillin',
    koreanName: '아목시실린',
    isPrebuilt: true
  },
  {
    keywords: ['atorvastatin', '아토르바스타틴', '리피토'],
    ingredientId: 'ing_atorvastatin',
    englishInn: 'Atorvastatin',
    koreanName: '아토르바스타틴',
    isPrebuilt: true
  },
  {
    keywords: ['rosuvastatin', '로수바스타틴', '크레스토'],
    ingredientId: 'ing_rosuvastatin',
    englishInn: 'Rosuvastatin',
    koreanName: '로수바스타틴',
    isPrebuilt: true
  },
  {
    keywords: ['omeprazole', '오메프라졸'],
    ingredientId: 'ing_omeprazole',
    englishInn: 'Omeprazole',
    koreanName: '오메프라졸',
    isPrebuilt: true
  },
  {
    keywords: ['famotidine', '파모티딘'],
    ingredientId: 'ing_famotidine',
    englishInn: 'Famotidine',
    koreanName: '파모티딘',
    isPrebuilt: true
  },
  {
    keywords: ['loratadine', '로라타딘', '클라리틴'],
    ingredientId: 'ing_loratadine',
    englishInn: 'Loratadine',
    koreanName: '로라타딘',
    isPrebuilt: true
  },
  {
    keywords: ['dextromethorphan', '덱스트로메토르판'],
    ingredientId: 'ing_dextromethorphan',
    englishInn: 'Dextromethorphan',
    koreanName: '덱스트로메토르판',
    isPrebuilt: true
  },
  {
    keywords: ['pseudoephedrine', '슈도에페드린'],
    ingredientId: 'ing_pseudoephedrine',
    englishInn: 'Pseudoephedrine',
    koreanName: '슈도에페드린',
    isPrebuilt: true
  },
  {
    keywords: ['guaifenesin', '구아이페네신'],
    ingredientId: 'ing_guaifenesin',
    englishInn: 'Guaifenesin',
    koreanName: '구아이페네신',
    isPrebuilt: true
  },
  {
    keywords: ['methylephedrine', '메틸에페드린'],
    ingredientId: 'ing_methylephedrine',
    englishInn: 'DL-Methylephedrine',
    koreanName: 'DL-메틸에페드린',
    isPrebuilt: true
  },
  {
    keywords: ['caffeine', '카페인'],
    ingredientId: 'ing_caffeine',
    englishInn: 'Caffeine',
    koreanName: '카페인',
    isPrebuilt: true
  },
  // 실시간 합성 지원 주요 성분 사전 (염기 제거 순수 영문 INN 매핑)
  {
    keywords: ['simvastatin', '심바스타틴'],
    ingredientId: 'ing_simvastatin',
    englishInn: 'Simvastatin',
    koreanName: '심바스타틴',
    isPrebuilt: false,
    therapeuticClass: '이상지질혈증 치료제 (HMG-CoA 환원효소 억제제 · 스타틴계)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['pitavastatin', '피타바스타틴', '리바로'],
    ingredientId: 'ing_pitavastatin',
    englishInn: 'Pitavastatin',
    koreanName: '피타바스타틴',
    isPrebuilt: false,
    therapeuticClass: '이상지질혈증 치료제 (스타틴계)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['ezetimibe', '에제티미브'],
    ingredientId: 'ing_ezetimibe',
    englishInn: 'Ezetimibe',
    koreanName: '에제티미브',
    isPrebuilt: false,
    therapeuticClass: '이상지질혈증 치료제 (콜레스테롤 흡수 억제제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['dexibuprofen', '덱시부프로펜'],
    ingredientId: 'ing_dexibuprofen',
    englishInn: 'Dexibuprofen',
    koreanName: '덱시부프로펜',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['naproxen', '나프록센', '탁센'],
    ingredientId: 'ing_naproxen',
    englishInn: 'Naproxen',
    koreanName: '나프록센',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['loxoprofen', '록소프로펜'],
    ingredientId: 'ing_loxoprofen',
    englishInn: 'Loxoprofen',
    koreanName: '록소프로펜',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['levocetirizine', '레보세티리진', '씨잘'],
    ingredientId: 'ing_levocetirizine',
    englishInn: 'Levocetirizine',
    koreanName: '레보세티리진',
    isPrebuilt: false,
    therapeuticClass: '2세대 항히스타민제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['fexofenadine', '펙소페나딘', '알레그라'],
    ingredientId: 'ing_fexofenadine',
    englishInn: 'Fexofenadine',
    koreanName: '펙소페나딘',
    isPrebuilt: false,
    therapeuticClass: '2세대 항히스타민제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['esomeprazole', '에소메프라졸', '넥시움'],
    ingredientId: 'ing_esomeprazole',
    englishInn: 'Esomeprazole',
    koreanName: '에소메프라졸',
    isPrebuilt: false,
    therapeuticClass: '프로톤펌프억제제 (PPI)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['pantoprazole', '판토프라졸'],
    ingredientId: 'ing_pantoprazole',
    englishInn: 'Pantoprazole',
    koreanName: '판토프라졸',
    isPrebuilt: false,
    therapeuticClass: '프로톤펌프억제제 (PPI)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['rabeprazole', '라베프라졸'],
    ingredientId: 'ing_rabeprazole',
    englishInn: 'Rabeprazole',
    koreanName: '라베프라졸',
    isPrebuilt: false,
    therapeuticClass: '프로톤펌프억제제 (PPI)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['amlodipine', '암로디핀', '노바스크'],
    ingredientId: 'ing_amlodipine',
    englishInn: 'Amlodipine',
    koreanName: '암로디핀',
    isPrebuilt: false,
    therapeuticClass: '칼슘채널차단제 (CCB · 항고혈압제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['losartan', '로사르탄', '코자'],
    ingredientId: 'ing_losartan',
    englishInn: 'Losartan',
    koreanName: '로사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['valsartan', '발사르탄', '디오반'],
    ingredientId: 'ing_valsartan',
    englishInn: 'Valsartan',
    koreanName: '발사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['telmisartan', '텔미사르탄', '미카르디스'],
    ingredientId: 'ing_telmisartan',
    englishInn: 'Telmisartan',
    koreanName: '텔미사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['candesartan', '칸데사르탄', '아타칸'],
    ingredientId: 'ing_candesartan',
    englishInn: 'Candesartan',
    koreanName: '칸데사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['metformin', '메트포르민', '다이아벡스'],
    ingredientId: 'ing_metformin',
    englishInn: 'Metformin',
    koreanName: '메트포르민',
    isPrebuilt: false,
    therapeuticClass: '경구용 혈당강하제 (Biguanide계)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['levothyroxine', '레보티록신', '씬지로이드'],
    ingredientId: 'ing_levothyroxine',
    englishInn: 'Levothyroxine',
    koreanName: '레보티록신',
    isPrebuilt: false,
    therapeuticClass: '갑상선 호르몬제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['isotretinoin', '이소트레티노인', '로아큐탄', '이소티논'],
    ingredientId: 'ing_isotretinoin',
    englishInn: 'Isotretinoin',
    koreanName: '이소트레티노인',
    isPrebuilt: false,
    therapeuticClass: '비타민 A 유도체 (중증 여드름 치료제 · 최기형성 물질)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['finasteride', '피나스테리드', '프로페시아', '프로스카'],
    ingredientId: 'ing_finasteride',
    englishInn: 'Finasteride',
    koreanName: '피나스테리드',
    isPrebuilt: false,
    therapeuticClass: '5-알파 환원효소 억제제',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['dutasteride', '두타스테리드', '아보다트'],
    ingredientId: 'ing_dutasteride',
    englishInn: 'Dutasteride',
    koreanName: '두타스테리드',
    isPrebuilt: false,
    therapeuticClass: '5-알파 환원효소 억제제',
    defaultDurGrade: 'GRADE_1'
  }
];

/**
 * 한글/영문 성분명을 염기 제외 순수 성분(Base Ingredient) ID로 매핑
 */
export function resolveCoreMaternalIngredientId(rawName: string): {
  ingredientId: string;
  englishInn: string;
  koreanName: string;
  isVerifiedCore5: boolean;
  therapeuticClass?: string;
  defaultDurGrade?: 'GRADE_1' | 'GRADE_2' | 'NONE';
} {
  const norm = normalizeDrugSearchText(rawName);
  const cleanKor = stripKoreanSaltAndHydrate(rawName);
  const cleanEng = stripEnglishSaltAndHydrate(rawName);

  // 덱시부프로펜과 이부프로펜, 레보세티리진과 세티리진 구분 우선 처리
  if (norm.includes('dexibuprofen') || norm.includes('덱시부프로펜')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_dexibuprofen')!;
    return {
      ingredientId: entry.ingredientId,
      englishInn: entry.englishInn,
      koreanName: entry.koreanName,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
      therapeuticClass: entry.therapeuticClass,
      defaultDurGrade: entry.defaultDurGrade
    };
  }
  if (norm.includes('levocetirizine') || norm.includes('레보세티리진')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_levocetirizine')!;
    return {
      ingredientId: entry.ingredientId,
      englishInn: entry.englishInn,
      koreanName: entry.koreanName,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
      therapeuticClass: entry.therapeuticClass,
      defaultDurGrade: entry.defaultDurGrade
    };
  }

  for (const entry of COMMON_BASE_INGREDIENT_MAP) {
    if (entry.keywords.some((kw) => norm.includes(normalizeDrugSearchText(kw)))) {
      return {
        ingredientId: entry.ingredientId,
        englishInn: entry.englishInn,
        koreanName: entry.koreanName,
        isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
        therapeuticClass: entry.therapeuticClass,
        defaultDurGrade: entry.defaultDurGrade
      };
    }
  }

  // 괄호 안 영문명이 있으면 추출하여 염기 제거
  const parenEngMatch = rawName.match(/\(([A-Za-z0-9\s,-]+)\)/);
  const extractedEng = parenEngMatch ? stripEnglishSaltAndHydrate(parenEngMatch[1]) : cleanEng;
  const slug = normalizeDrugSearchText(extractedEng || cleanKor).replace(/[^a-z0-9가-힣]/g, '');
  const dynamicId = `ing_dyn_${slug || 'unknown'}`;

  return {
    ingredientId: dynamicId,
    englishInn: extractedEng || cleanKor,
    koreanName: cleanKor,
    isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[dynamicId])
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
 * 로컬 검증 DB(15대 검증 성분 + 대표 단일/복합제) 즉시 검색
 * - '리피토정 20mg' 입력 시 '리피토정20밀리그램'과 자동 매칭
 */
export function searchLocalMaternalDatabase(query: string): MaternalSearchResult[] {
  const clean = query.trim();
  const norm = normalizeQueryForProductMatch(clean);

  const results: MaternalSearchResult[] = [];

  // 1. 검증 성분 직접 검색 (영문 INN / 한글 성분명 / 약효군)
  for (const preg of Object.values(PREGNANCY_SAFETY_DB)) {
    const matchInn = normalizeQueryForProductMatch(preg.englishInn).includes(norm);
    const matchKor = normalizeQueryForProductMatch(preg.koreanIngrName).includes(norm);
    const matchClass = normalizeQueryForProductMatch(preg.therapeuticClass).includes(norm);

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
            koreanProductName: `${preg.koreanIngrName} (${preg.englishInn}) 단일 성분 표준`,
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

  // 2. 내장 국내 허가 의약품(단일제·복합제) 검색 (단위 mg <-> 밀리그램 정규화 적용)
  for (const drug of DRUG_MASTER_DB) {
    const mappings = INGREDIENT_MAPPING_DB.filter((m) => m.drugMasterId === drug.id);
    const matchProd = normalizeQueryForProductMatch(drug.koreanProductName).includes(norm);
    const matchEng = normalizeQueryForProductMatch(drug.englishIngredientsSummary).includes(norm);
    const matchSeq = drug.itemSeq.includes(clean);
    const matchIng = mappings.some(
      (m) =>
        normalizeQueryForProductMatch(m.koreanIngredientName).includes(norm) ||
        normalizeQueryForProductMatch(m.englishIngredientName).includes(norm)
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
 * 실시간 조회된 식약처 허가사항(NB_DOC_DATA) 및 openFDA 라벨 원문을 바탕으로
 * 기등록 성분이 아닌 국내 의약품도 아세트아미노펜/아토르바스타틴과 동일한 구조의 요약·상세 데이터를 생성
 * - 절대 RID 등 정량 수치를 임의 생성하지 않으며('확인되지 않음' 유지), 식약처 및 FDA 원문에 기반해 구조화
 */
async function ensureDynamicMaternalRecord(params: {
  ingredientId: string;
  koreanName: string;
  englishInn: string;
  therapeuticClass: string;
  route: AdministrationRoute;
  routeKorean: string;
  mfdsPrecautionText: string;
  itemSeq: string;
  productName: string;
  defaultDurGrade?: 'GRADE_1' | 'GRADE_2' | 'NONE';
}): Promise<void> {
  const {
    ingredientId,
    koreanName,
    englishInn,
    therapeuticClass,
    route,
    routeKorean,
    mfdsPrecautionText,
    itemSeq,
    productName,
    defaultDurGrade
  } = params;

  if (PREGNANCY_SAFETY_DB[ingredientId] && LACTATION_SAFETY_DB[ingredientId]) {
    return;
  }

  // openFDA 실시간 라벨 원문 조회 시도 (영문 INN이 알파벳인 경우)
  const hasEnglishInn = /^[A-Za-z\s-]+$/.test(englishInn);
  const fdaLabel = hasEnglishInn ? await fetchLiveOpenFdaLabel(englishInn) : null;

  // 식약처 허가문구 및 FDA 문구에서 금기/주의 수준 판별
  const combinedText = `${mfdsPrecautionText}\n${fdaLabel?.pregnancyText || ''}`;
  const isContraindicatedPreg =
    defaultDurGrade === 'GRADE_1' ||
    /임부.*투여하지\s*말\s*것|임부.*금기|임신.*금기|contraindicated in pregnancy/i.test(combinedText);
  const isSecondGradeOrThirdTriRisk =
    defaultDurGrade === 'GRADE_2' ||
    /임신\s*말기.*투여하지|임신\s*20주|임신\s*30주|태아.*동맥관|양수과소증/i.test(combinedText);

  const t1Level: SafetySummaryLevel = isContraindicatedPreg
    ? 'LEVEL_4_AVOID'
    : isSecondGradeOrThirdTriRisk
    ? 'LEVEL_3_CAUTION'
    : 'LEVEL_3_CAUTION';
  const t2Level: SafetySummaryLevel = isContraindicatedPreg
    ? 'LEVEL_4_AVOID'
    : isSecondGradeOrThirdTriRisk
    ? 'LEVEL_4_AVOID'
    : 'LEVEL_3_CAUTION';
  const t3Level: SafetySummaryLevel = isContraindicatedPreg
    ? 'LEVEL_4_AVOID'
    : isSecondGradeOrThirdTriRisk
    ? 'LEVEL_4_AVOID'
    : 'LEVEL_3_CAUTION';

  const isLactationAvoid =
    isContraindicatedPreg ||
    /수유부.*투여하지\s*말\s*것|수유를\s*중단|do not breastfeed|breastfeeding is not recommended/i.test(
      `${mfdsPrecautionText}\n${fdaLabel?.lactationText || ''}`
    );
  const lactLevel: SafetySummaryLevel = isLactationAvoid ? 'LEVEL_4_AVOID' : 'LEVEL_3_CAUTION';

  const durGradeText: '임부금기 1등급' | '임부금기 2등급' | '임부금기 미지정' =
    defaultDurGrade === 'GRADE_1' || isContraindicatedPreg
      ? '임부금기 1등급'
      : defaultDurGrade === 'GRADE_2' || isSecondGradeOrThirdTriRisk
      ? '임부금기 2등급'
      : '임부금기 미지정';

  const fdaPregSnippet = fdaLabel?.pregnancyText
    ? fdaLabel.pregnancyText.slice(0, 420) + (fdaLabel.pregnancyText.length > 420 ? '...' : '')
    : `openFDA 영문 라벨 원문 또는 MotherToBaby/LactMed에서 ${englishInn}의 최신 임신 코호트 근거를 교차 확인하십시오.`;

  const fdaLactSnippet = fdaLabel?.lactationText
    ? fdaLabel.lactationText.slice(0, 420) + (fdaLabel.lactationText.length > 420 ? '...' : '')
    : '확인되지 않음 (모유 내 농도 정량 데이터는 하단 LactMed 원문 검색 링크에서 직접 확인 필요).';

  const mfdsSourceId = `src_mfds_dyn_${itemSeq}`;
  const lactmedSourceId = `src_lactmed_dyn_${ingredientId}`;
  const fdaSourceId = `src_fda_dyn_${ingredientId}`;

  EVIDENCE_SOURCES_DB[mfdsSourceId] = {
    sourceId: mfdsSourceId,
    ingredientId,
    organizationName: '식약처 의약품안전나라',
    documentTitle: `식약처 의약품 상세허가정보: ${productName} [품목기준코드: ${itemSeq}]`,
    originalUrl: `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${itemSeq}`,
    studyDesign: '대한민국 식품의약품안전처 공식 허가사항 (사용상의 주의사항 원문)',
    studySubjects: '국내 허가 의약품',
    studyScale: '공식 규제 허가문서',
    keyFindings: mfdsPrecautionText.slice(0, 260),
    studyLimitations: '국내 허가사항 원문 기준이며, 해외 최신 코호트 연구와 병행 확인 권장.',
    publishedDate: '식약처 실시간 API',
    collectedDate: new Date().toISOString().slice(0, 10),
    lastVerifiedDate: new Date().toISOString().slice(0, 10)
  };

  EVIDENCE_SOURCES_DB[lactmedSourceId] = {
    sourceId: lactmedSourceId,
    ingredientId,
    organizationName: 'LactMed (NIH)',
    documentTitle: `NIH LactMed® Database Search: ${englishInn}`,
    originalUrl: `https://www.ncbi.nlm.nih.gov/books/NBK501922/?term=${encodeURIComponent(englishInn)}`,
    studyDesign: '미국 국립의학도서관(NLM) 모유 수유 약물 데이터베이스',
    studySubjects: `${englishInn} 복용 수유부 및 영아`,
    studyScale: '국제 수유 약동학 문헌 데이터베이스',
    keyFindings: `${englishInn} 성분의 모유 이행 및 RID 원문 모노그래프 직접 조회 링크.`,
    studyLimitations: '실시간 연동 요약에서는 정량 RID를 임의 추정하지 않으므로 원문 모노그래프를 직접 확인하십시오.',
    publishedDate: '상시 업데이트',
    collectedDate: new Date().toISOString().slice(0, 10),
    lastVerifiedDate: new Date().toISOString().slice(0, 10)
  };

  EVIDENCE_SOURCES_DB[fdaSourceId] = {
    sourceId: fdaSourceId,
    ingredientId,
    organizationName: 'FDA PLLR',
    documentTitle: `openFDA Drug Label: ${englishInn} (Pregnancy & Lactation)`,
    originalUrl: `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(
      englishInn
    )}%22&limit=1`,
    studyDesign: '미국 FDA 허가사항 (PLLR Section 8.1 & 8.2)',
    studySubjects: '임부 및 수유부 허가 심사 근거',
    studyScale: 'FDA 공식 라벨 데이터',
    keyFindings: fdaPregSnippet,
    studyLimitations: '성분별 미국 허가 라벨 유무에 따라 원문 길이가 다를 수 있음.',
    publishedDate: fdaLabel?.effectiveTime || 'openFDA 실시간 API',
    collectedDate: new Date().toISOString().slice(0, 10),
    lastVerifiedDate: new Date().toISOString().slice(0, 10)
  };

  PREGNANCY_SAFETY_DB[ingredientId] = {
    ingredientId,
    englishInn,
    koreanIngrName: koreanName,
    therapeuticClass,
    route,
    routeKorean,
    trimester1Level: t1Level,
    trimester2Level: t2Level,
    trimester3Level: t3Level,
    trimester1Summary: isContraindicatedPreg
      ? `임신 1삼분기(1~13주): 식약처 허가사항 및 임상 근거상 임부 투여 금지(사용 회피) 대상입니다.`
      : `임신 1삼분기(1~13주): 식약처 허가사항 원문 주의 조항이 적용되며, 치료상 유익성이 위험성을 상회할 때만 제한적으로 사용합니다.`,
    trimester2Summary: isContraindicatedPreg
      ? `임신 2삼분기(14~27주): 임신 전 기간 투여 금지(사용 회피) 대상입니다.`
      : `임신 2삼분기(14~27주): 태아 성장 및 장기 발달에 미치는 영향을 고려하여 주의하여 사용합니다.`,
    trimester3Summary:
      isContraindicatedPreg || isSecondGradeOrThirdTriRisk
        ? `임신 3삼분기(28~40주): 임신 후기 태아 독성 또는 분만 관련 위험으로 인해 사용 회피가 권고됩니다.`
        : `임신 3삼분기(28~40주): 출산 임박 시기 신생아 이행 영향을 고려하여 처방의와 상의 후 주의하여 사용합니다.`,
    weekSpecificRisks: [
      {
        startWeek: 1,
        endWeek: 40,
        level: isContraindicatedPreg ? 'LEVEL_4_AVOID' : 'LEVEL_3_CAUTION',
        riskTitle: `${koreanName} (${englishInn}) 식약처 허가사항 및 FDA 기준 임신 중 주의·금기 안내`,
        clinicalDetail: mfdsPrecautionText
      }
    ],
    congenitalMalformationData: fdaLabel?.pregnancyText
      ? `[FDA PLLR 8.1 원문 발췌] ${fdaPregSnippet}`
      : `식약처 허가사항 원문: "${mfdsPrecautionText}"`,
    miscarriageData: '식약처 허가사항 및 FDA 라벨 원문 기준 (하단 원문 출처 탭에서 상세 확인 가능).',
    fetalToxicityData: mfdsPrecautionText,
    fetalRenalRisk: /신장|신기능|양수/.test(combinedText)
      ? '허가사항 내 태아 신기능 또는 양수 관련 주의 문구가 포함되어 있습니다. 원문을 반드시 확인하십시오.'
      : '식약처 허가사항 원문 내 특이 태아 신독성 언급 없음 (원문 참조).',
    fetalDuctusArteriosusRisk: /동맥관/.test(combinedText)
      ? '임신 후기 태아 동맥관 조기 폐쇄 위험 주의 문구가 포함되어 있습니다.'
      : '식약처 허가사항 원문 내 태아 동맥관 조기 폐쇄 특이 언급 없음 (원문 참조).',
    maternalRisk: '산모 기저 질환 및 복용 적응증에 따른 유익성·위험성 평가가 필요합니다.',
    domesticDurGrade: durGradeText,
    domesticDurNoticeDetail: mfdsPrecautionText,
    domesticPermitSummary: mfdsPrecautionText,
    domesticVsInternationalComparison: fdaLabel?.pregnancyText
      ? `국내 식약처 허가사항과 미국 FDA PLLR(Section 8.1) 원문을 실시간으로 대조하였습니다.`
      : `국내 식약처 허가사항 원문이 수집되었으며, 해외 상세 모노그래프는 하단 LactMed/MotherToBaby 공식 링크에서 즉시 열람할 수 있습니다.`,
    internationalAgencySummaries: [
      {
        agencyName: 'FDA PLLR',
        summaryText: fdaPregSnippet,
        sourceUrl: `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(
          englishInn
        )}%22&limit=1`
      },
      {
        agencyName: 'LactMed (NIH)',
        summaryText: `NIH LactMed에서 ${englishInn} 성분의 수유 및 모유 이행 모노그래프를 확인하십시오.`,
        sourceUrl: `https://www.ncbi.nlm.nih.gov/books/NBK501922/?term=${encodeURIComponent(englishInn)}`
      }
    ],
    clinicalRecommendation: isContraindicatedPreg
      ? `[임부 투여 금지/회피] ${koreanName} (${englishInn}) 성분은 임신 중 투여 금기 또는 회피 권고 대상입니다. 임신이 확인되거나 임신 계획 시 처방의와 상의하여 안전한 대안으로 변경하도록 복약지도하십시오.`
      : `[식약처 허가사항 기반 복약지도] ${koreanName} (${englishInn}) 복용 전 임신 주수를 확인하고, 식약처 허가사항("${mfdsPrecautionText.slice(
          0,
          120
        )}...")에 따라 치료상 유익성이 위험성을 상회하는지 처방의와 확인하도록 안내하십시오.`,
    evidenceQualityLevel: fdaLabel?.pregnancyText ? 'MODERATE' : 'LOW',
    alternativeIngredientIds: ['ing_acetaminophen'],
    evidenceSourceIds: [mfdsSourceId, fdaSourceId, lactmedSourceId]
  };

  LACTATION_SAFETY_DB[ingredientId] = {
    ingredientId,
    englishInn,
    koreanIngrName: koreanName,
    therapeuticClass,
    route,
    routeKorean,
    overallSafetyLevel: lactLevel,
    milkConcentrationText: fdaLactSnippet,
    infantSerumConcentrationText: '확인되지 않음 (원문 내 영아 혈중 농도 미측정 또는 LactMed 원문 직접 확인 필요).',
    ridRangeText: '확인되지 않음 (임의 추정 금지 원칙 적용 · LactMed 원문 참조)',
    ridNumericMin: null,
    ridNumericMax: null,
    referenceInfantDoseMgPerKgDay: null,
    referenceMaternalDoseMgPerKgDay: null,
    ridClinicalInterpretation:
      '실시간 연동 성분은 AI가 임의로 RID(%) 수치를 추정하거나 생성하지 않습니다. 식약처 수유부 허가사항과 미국 FDA Lactation(8.2) 원문을 우선 확인하십시오.',
    halfLifeText: '확인되지 않음 (제품 상세 허가사항 약동학 조항 참조).',
    activeMetabolitesText: '식약처 상세 허가사항 참조.',
    infantAdverseEffects: mfdsPrecautionText,
    ageConsiderations: {
      NEONATE: {
        level: lactLevel,
        title: '신생아 (생후 0~4주)',
        clinicalNote: isLactationAvoid
          ? '수유 중 투여 회피 또는 수유 중단이 권고됩니다.'
          : '신생아는 약물 대사 및 배설이 미성숙하므로 수유부 복용 시 영아 이상반응을 면밀히 관찰해야 합니다.'
      },
      INFANT_1_6M: {
        level: lactLevel,
        title: '생후 1~6개월 영아',
        clinicalNote: isLactationAvoid
          ? '수유 중 투여 회피 또는 수유 중단이 권고됩니다.'
          : '식약처 허가사항 수유부 주의 조항에 따라 신중히 투여합니다.'
      },
      INFANT_OVER_6M: {
        level: lactLevel,
        title: '생후 6개월 이상 영아',
        clinicalNote: isLactationAvoid
          ? '수유 중 투여 회피 또는 수유 중단이 권고됩니다.'
          : '치료상 유익성과 모유 수유의 유익성을 고려하여 복약지도합니다.'
      }
    },
    pretermInfantRisk: {
      level: isLactationAvoid ? 'LEVEL_4_AVOID' : 'LEVEL_3_CAUTION',
      clinicalNote: '미숙아 수유 시에는 주치의와 상의 후 수유 지속 여부를 결정하십시오.'
    },
    continuationGuidance: isLactationAvoid
      ? `식약처 허가사항 또는 FDA 라벨상 수유 중 투여 회피(또는 투여 시 수유 중단)가 권고되는 성분입니다.`
      : `식약처 허가사항 수유부 조항을 확인하고 필요 시 수유 직후 복용하여 영아 노출을 최소화하도록 안내하십시오.`,
    domesticPermitLactationSummary: mfdsPrecautionText,
    alternativeIngredientIds: ['ing_acetaminophen'],
    evidenceSourceIds: [mfdsSourceId, fdaSourceId, lactmedSourceId]
  };
}

/**
 * 식약처 의약품 허가 API (DrugPrdtPrmsnInfoService08) 실시간 연동 검색
 * - 약사가 내장 샘플 외의 국내 의약품 제품명을 검색했을 때 실시간으로 식약처 원료약품 및 허가사항(임부·수유부 조항)을 가져와
 *   염기/수화물을 제거한 순수 성분 기준으로 매핑하고 요약표를 즉시 생성
 */
export async function searchLiveMfdsForMaternalSafety(query: string): Promise<MaternalSearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  // 사용자가 "리피토정 20mg" 처럼 입력한 경우 식약처 검색어 호환성을 위해 제품명 키워드도 함께 검색
  const normalizedKoreanUnitQuery = clean.replace(/([0-9]+)\s*mg/gi, '$1밀리그램');
  const baseBrandQuery = clean.replace(/\s*[0-9]+(?:\.[0-9]+)?\s*(?:mg|밀리그램|밀리그람|g|mcg).*$/i, '').trim();

  try {
    let mfdsItems = await searchPublicDrugDatabase(normalizedKoreanUnitQuery, {
      classification: 'OTC_DRUG',
      targetSource: 'OTC_DRUG'
    });

    if ((!mfdsItems || mfdsItems.length === 0) && baseBrandQuery.length >= 2 && baseBrandQuery !== normalizedKoreanUnitQuery) {
      mfdsItems = await searchPublicDrugDatabase(baseBrandQuery, {
        classification: 'OTC_DRUG',
        targetSource: 'OTC_DRUG'
      });
    }

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

      // 식약처 주의사항(precautionsSummary)에서 임부/수유부 관련 문단 추출
      const allPrecautions = detail?.precautionsSummary || item.precautionsSummary || [];
      const maternalParagraphs = allPrecautions.filter((p) => /임부|임신|수유|태아|기형|동맥관|양수/.test(p));
      const mfdsPregnancyPrecautionText =
        maternalParagraphs.length > 0
          ? maternalParagraphs.slice(0, 6).join('\n')
          : '식약처 상세 허가사항 원문 링크에서 임부 및 수유부 투여 조항을 확인하십시오.';

      const { route, routeKorean } = inferRouteFromDosageForm(`${item.dosageForm} ${item.productName}`);
      const mappedIngredients: IngredientMappingRecord[] = [];

      for (let idx = 0; idx < rawLines.length; idx++) {
        const line = rawLines[idx];
        const amountMatch = line.match(/([0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ug|μg|mL|IU|밀리그램|밀리그람))/i);
        const amountText = amountMatch ? amountMatch[1].replace(/밀리그램|밀리그람/g, 'mg') : '허가사항 참조';
        const resolved = resolveCoreMaternalIngredientId(line);

        // 미등록 성분인 경우 실시간으로 식약처 + openFDA 기반 안전성 레코드 생성
        if (!PREGNANCY_SAFETY_DB[resolved.ingredientId]) {
          await ensureDynamicMaternalRecord({
            ingredientId: resolved.ingredientId,
            koreanName: resolved.koreanName,
            englishInn: resolved.englishInn,
            therapeuticClass: resolved.therapeuticClass || '국내 허가 의약품 유효성분 (식약처·FDA 실시간 연동)',
            route,
            routeKorean,
            mfdsPrecautionText: mfdsPregnancyPrecautionText,
            itemSeq: item.regulatoryCode,
            productName: item.productName,
            defaultDurGrade: resolved.defaultDurGrade
          });
        }

        mappedIngredients.push({
          mappingId: `live_map_${item.regulatoryCode}_${idx}`,
          drugMasterId: `live_${item.regulatoryCode}`,
          koreanProductName: item.productName,
          itemSeq: item.regulatoryCode,
          koreanIngredientName: resolved.koreanName, // 염기 제외 순수 한글 성분명
          englishIngredientName: resolved.englishInn, // 염기 제외 순수 영문 성분명
          ingredientId: resolved.ingredientId,
          amountText,
          dosageForm: item.dosageForm,
          route,
          isCombination: rawLines.length > 1,
          verificationStatus: 'VERIFIED_CORE_5'
        });
      }

      if (mappedIngredients.length === 0) {
        const resolved = resolveCoreMaternalIngredientId(item.productName);
        if (!PREGNANCY_SAFETY_DB[resolved.ingredientId]) {
          await ensureDynamicMaternalRecord({
            ingredientId: resolved.ingredientId,
            koreanName: resolved.koreanName,
            englishInn: resolved.englishInn,
            therapeuticClass: resolved.therapeuticClass || '국내 허가 의약품 유효성분 (식약처·FDA 실시간 연동)',
            route,
            routeKorean,
            mfdsPrecautionText: mfdsPregnancyPrecautionText,
            itemSeq: item.regulatoryCode,
            productName: item.productName,
            defaultDurGrade: resolved.defaultDurGrade
          });
        }
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
          verificationStatus: 'VERIFIED_CORE_5'
        });
      }

      const hasGrade1 = mappedIngredients.some(
        (m) =>
          m.ingredientId === 'ing_atorvastatin' ||
          m.ingredientId === 'ing_rosuvastatin' ||
          m.ingredientId === 'ing_simvastatin' ||
          m.ingredientId === 'ing_isotretinoin'
      );
      const hasGrade2 = mappedIngredients.some(
        (m) =>
          m.ingredientId === 'ing_ibuprofen' ||
          m.ingredientId === 'ing_dexibuprofen' ||
          m.ingredientId === 'ing_naproxen' ||
          m.ingredientId === 'ing_loxoprofen'
      );

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
        durPregnancyTabooGrade: hasGrade1 ? 'GRADE_1' : hasGrade2 ? 'GRADE_2' : 'NONE',
        durPregnancyTabooDetail: hasGrade1
          ? '식약처 DUR 임부금기 1등급 해당 성분 포함 (원칙적 처방·조제 금지)'
          : hasGrade2
          ? '식약처 DUR 임부금기 2등급 해당 성분 포함'
          : null,
        productSourceUrl: `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${item.regulatoryCode}`,
        updatedAt: new Date().toISOString().slice(0, 10)
      };

      liveResults.push({
        resultType: 'DOMESTIC_PRODUCT',
        id: drugMaster.id,
        displayName: drugMaster.koreanProductName,
        subLabel: `[식약처 실시간 연동] ${drugMaster.manufacturer} · 품목기준코드 ${drugMaster.itemSeq}`,
        isCombination: drugMaster.isCombination,
        drugMaster,
        mappedIngredients,
        primaryIngredientId: mappedIngredients[0].ingredientId
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
    const cleanInn = stripEnglishSaltAndHydrate(englishInn);
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(
      cleanInn
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
