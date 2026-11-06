import {
  cleanXmlDocText,
  fetchMfdsDrugRawByItemSeq,
  fetchNedrugDocTexts
} from '../../../services/publicDataService';
import {
  findCrosswalkBySearchQuery,
  matchDomesticIngredientToOverseasInn
} from '../../maternal-safety/data/ingredientCrosswalkDb';
import {
  lookupWhoFormulary
} from '../data/whoChildrenFormularyDb';
import {
  DailyMedInfo,
  MfdsDurPediatricInfo,
  MfdsPediatricLabelInfo,
  OpenFdaPediatricInfo,
  PediatricDrugReport,
  PediatricIngredientItem,
  PediatricSearchCandidate,
  RchMelbourneInfo,
  WhoChildrenFormularyReport
} from '../types/pediatricSafety';

const DATA_GO_KR_API_KEY =
  '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

const MFDS_INQ_URL =
  'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08';
const DUR_PRDLST_URL =
  'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03';

// 로컬 인메모리 캐시
const searchCache = new Map<string, PediatricSearchCandidate[]>();
const reportCache = new Map<string, PediatricDrugReport>();
const durCache = new Map<string, MfdsDurPediatricInfo>();
const openFdaCache = new Map<string, OpenFdaPediatricInfo>();

/**
 * 소아과 빈용 대표 허가 의약품 시드 데이터 (빠른 예시 및 오프라인/테스트 지원)
 */
export const VERIFIED_PEDIATRIC_SEED_PRODUCTS: PediatricSearchCandidate[] = [
  {
    itemSeq: '198701804',
    productName: '어린이부루펜시럽(이부프로펜)',
    manufacturer: '삼일제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '시럽제',
    route: '경구',
    mainIngredientsText: '이부프로펜 (Ibuprofen) 20mg/mL',
    isCombination: false,
    ingredients: [
      { koreanName: '이부프로펜', matchedInn: 'Ibuprofen', amount: '20', unit: 'mg/mL' }
    ]
  },
  {
    itemSeq: '200601977',
    productName: '맥시부펜시럽(덱시부프로펜)',
    manufacturer: '한미약품(주)',
    etcOtcName: '일반의약품',
    dosageForm: '시럽제',
    route: '경구',
    mainIngredientsText: '덱시부프로펜 (Dexibuprofen) 12mg/mL',
    isCombination: false,
    ingredients: [
      { koreanName: '덱시부프로펜', matchedInn: 'Dexibuprofen', amount: '12', unit: 'mg/mL' }
    ]
  },
  {
    itemSeq: '200401826',
    productName: '어린이타이레놀현탁액(아세트아미노펜)',
    manufacturer: '켄뷰코리아판매유한회사',
    etcOtcName: '일반의약품',
    dosageForm: '현탁액제',
    route: '경구',
    mainIngredientsText: '아세트아미노펜 (Acetaminophen) 32mg/mL',
    isCombination: false,
    ingredients: [
      { koreanName: '아세트아미노펜', matchedInn: 'Acetaminophen', amount: '32', unit: 'mg/mL' }
    ]
  },
  {
    itemSeq: '199801458',
    productName: '오구멘틴듀오건조시럽(아목시실린·클라불란산칼륨(7:1))',
    manufacturer: '일성아이에스(주)',
    etcOtcName: '전문의약품',
    dosageForm: '건조시럽제',
    route: '경구',
    mainIngredientsText: '아목시실린수화물 400mg/5mL + 클라불란산칼륨 57mg/5mL',
    isCombination: true,
    ingredients: [
      { koreanName: '아목시실린수화물', matchedInn: 'Amoxicillin', amount: '400', unit: 'mg/5mL' },
      { koreanName: '클라불란산칼륨', matchedInn: 'Clavulanate potassium', amount: '57', unit: 'mg/5mL' }
    ]
  },
  {
    itemSeq: '199401569',
    productName: '지르텍액(세티리진염산염)',
    manufacturer: '한국유씨비제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '액제',
    route: '경구',
    mainIngredientsText: '세티리진염산염 (Cetirizine Hydrochloride) 1mg/mL',
    isCombination: false,
    ingredients: [
      { koreanName: '세티리진염산염', matchedInn: 'Cetirizine', amount: '1', unit: 'mg/mL' }
    ]
  },
  {
    itemSeq: '200410762',
    productName: '지스로맥스건조시럽(아지트로마이신수화물)',
    manufacturer: '한국화이자제약(주)',
    etcOtcName: '전문의약품',
    dosageForm: '건조시럽제',
    route: '경구',
    mainIngredientsText: '아지트로마이신수화물 (Azithromycin Hydrate) 200mg/5mL',
    isCombination: false,
    ingredients: [
      { koreanName: '아지트로마이신수화물', matchedInn: 'Azithromycin', amount: '200', unit: 'mg/5mL' }
    ]
  },
  {
    itemSeq: '198000158',
    productName: '곰실린캡슐(아목시실린수화물)',
    manufacturer: '(주)대웅제약',
    etcOtcName: '전문의약품',
    dosageForm: '경질캡슐',
    route: '경구',
    mainIngredientsText: '아목시실린수화물 (Amoxicillin Hydrate) 500mg(역가)',
    isCombination: false,
    ingredients: [
      { koreanName: '아목시실린수화물', matchedInn: 'Amoxicillin', amount: '500', unit: 'mg' }
    ]
  },
  {
    itemSeq: '202106092',
    productName: '타이레놀정500밀리그람(아세트아미노펜)',
    manufacturer: '켄뷰코리아판매유한회사',
    etcOtcName: '일반의약품',
    dosageForm: '필름코팅정',
    route: '경구',
    mainIngredientsText: '아세트아미노펜 (Acetaminophen) 500mg',
    isCombination: false,
    ingredients: [
      { koreanName: '아세트아미노펜', matchedInn: 'Acetaminophen', amount: '500', unit: 'mg' }
    ]
  },
  {
    itemSeq: '198300343',
    productName: '부루펜정400밀리그램(이부프로펜)',
    manufacturer: '삼일제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '당의정',
    route: '경구',
    mainIngredientsText: '이부프로펜 (Ibuprofen) 400mg',
    isCombination: false,
    ingredients: [
      { koreanName: '이부프로펜', matchedInn: 'Ibuprofen', amount: '400', unit: 'mg' }
    ]
  }
];

function inferRouteFromProduct(productName: string, chartText: string): string {
  const combined = `${productName} ${chartText}`;
  if (/점안|안약|안연고/.test(combined)) return '점안';
  if (/비강|나잘|점비|에보할러|터부할러|디스커스|흡입/.test(combined)) return '흡입/비강';
  if (/크림|연고|겔|로션|첩부|플라스타|카타플라스마|외용|액\(외용\)/.test(combined)) return '외용';
  if (/주사|바이알|앰플|프리필드/.test(combined)) return '주사';
  if (/좌제|질정/.test(combined)) return '직장/질내';
  return '경구';
}

function inferDosageFormText(productName: string, chartText: string): string {
  const combined = `${productName} ${chartText}`;
  if (combined.includes('필름코팅정')) return '필름코팅정';
  if (combined.includes('장용정') || combined.includes('장용과립')) return '장용정';
  if (combined.includes('서방정')) return '서방정';
  if (combined.includes('연질캡슐')) return '연질캡슐';
  if (combined.includes('경질캡슐') || combined.includes('캡슐')) return '캡슐제';
  if (combined.includes('건조시럽')) return '건조시럽제';
  if (combined.includes('현탁액') || combined.includes('현탁시럽')) return '현탁액제';
  if (combined.includes('시럽') || combined.includes('시럽제')) return '시럽제';
  if (combined.includes('액제') || combined.includes('내복액')) return '액제';
  if (combined.includes('정제') || combined.includes('정')) return '정제';
  if (combined.includes('산제') || combined.includes('가루')) return '산제';
  if (combined.includes('과립')) return '과립제';
  if (combined.includes('주사')) return '주사제';
  return '기타제형';
}

function parseIngredientsFromMaterialName(
  materialName: string,
  dosageForm: string = '시럽제',
  route: string = '경구'
): PediatricIngredientItem[] {
  if (!materialName || !materialName.trim()) return [];
  const items: PediatricIngredientItem[] = [];

  const rawTokens = materialName.split(/[;|]/);
  for (const token of rawTokens) {
    const trimmed = token.trim();
    if (!trimmed || trimmed.startsWith('성분정보') || trimmed.startsWith('첨가제')) continue;
    const parts = trimmed.split(',');
    if (parts.length >= 1) {
      const korName = (parts[0] || '').replace(/\[.*?\]/g, '').trim();
      if (!korName || korName.includes('첨가제') || korName.includes('타르색소')) continue;
      const amount = (parts[2] || '').trim();
      const unit = (parts[3] || '').trim();
      const matched = matchDomesticIngredientToOverseasInn({
        koreanName: korName,
        dosageForm,
        route
      });
      items.push({
        koreanName: korName,
        matchedInn: matched?.matchedInn || undefined,
        amount: amount || undefined,
        unit: unit || undefined
      });
    }
  }

  return items;
}

/**
 * 1. 국내 제품명 / 성분명 통합 검색
 */
export async function searchDomesticDrugsForPediatric(query: string): Promise<{
  candidates: PediatricSearchCandidate[];
  detectedIngredientNotice?: string;
  apiError?: string;
}> {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return { candidates: VERIFIED_PEDIATRIC_SEED_PRODUCTS };
  }

  if (searchCache.has(cleanQ)) {
    return { candidates: searchCache.get(cleanQ)! };
  }

  // 1-1. 성분명(한글 또는 영문) 매칭 확인
  const crosswalk = findCrosswalkBySearchQuery(cleanQ);
  let detectedIngredientNotice: string | undefined;
  let targetSearchKeyword = cleanQ;

  if (crosswalk) {
    detectedIngredientNotice = `성분 검색 감지: "${cleanQ}" → ${crosswalk.koreanBaseName} (${crosswalk.inn})`;
    targetSearchKeyword = crosswalk.representativeProductKeyword || crosswalk.koreanBaseName;
  }

  // 1-2. 시드 목록에서 로컬 일치 확인
  const localMatches = VERIFIED_PEDIATRIC_SEED_PRODUCTS.filter((p) => {
    const qLower = cleanQ.toLowerCase();
    const nameMatch = p.productName.toLowerCase().includes(qLower);
    const mainIngrMatch = p.mainIngredientsText.toLowerCase().includes(qLower);
    const ingrMatch = p.ingredients.some(
      (ing) =>
        ing.koreanName.toLowerCase().includes(qLower) ||
        (ing.matchedInn && ing.matchedInn.toLowerCase().includes(qLower))
    );
    return nameMatch || mainIngrMatch || ingrMatch;
  });

  // 1-3. 식약처 API 실시간 검색 호출
  try {
    const url = `${MFDS_INQ_URL}?serviceKey=${encodeURIComponent(
      DATA_GO_KR_API_KEY
    )}&item_name=${encodeURIComponent(targetSearchKeyword)}&type=json&numOfRows=15`;

    const res = await fetch(url);
    if (!res.ok) {
      if (localMatches.length > 0) {
        return { candidates: localMatches, detectedIngredientNotice };
      }
      return {
        candidates: [],
        apiError: `식약처 API 응답 오류 (HTTP ${res.status})`
      };
    }

    const data = await res.json();
    const items = data?.body?.items || [];

    const apiCandidates: PediatricSearchCandidate[] = items.map((raw: any) => {
      const itemSeq = String(raw.ITEM_SEQ || '').trim();
      const productName = String(raw.ITEM_NAME || '').trim();
      const manufacturer = String(raw.ENTP_NAME || '').trim();
      const etcOtcName = String(raw.ETC_OTC_NAME || '').trim().includes('전문')
        ? '전문의약품'
        : '일반의약품';
      const chartText = String(raw.CHART || '');
      const dosageForm = inferDosageFormText(productName, chartText);
      const route = inferRouteFromProduct(productName, chartText);
      const materialName = String(raw.MATERIAL_NAME || '');
      const ingredients = parseIngredientsFromMaterialName(materialName, dosageForm, route);
      const isCombination = ingredients.length > 1;

      const mainIngredientsText =
        ingredients.length > 0
          ? ingredients
              .map(
                (i) =>
                  `${i.koreanName}${i.matchedInn ? ` (${i.matchedInn})` : ''}${
                    i.amount ? ` ${i.amount}${i.unit || ''}` : ''
                  }`
              )
              .join(' + ')
          : materialName.replace(/,,/g, ' ').slice(0, 100);

      return {
        itemSeq,
        productName,
        manufacturer,
        etcOtcName,
        dosageForm,
        route,
        mainIngredientsText,
        isCombination,
        ingredients
      };
    });

    // 로컬 시드와 중복 제거 합병
    const combinedMap = new Map<string, PediatricSearchCandidate>();
    for (const c of localMatches) {
      combinedMap.set(c.itemSeq, c);
    }
    for (const c of apiCandidates) {
      if (!combinedMap.has(c.itemSeq)) {
        combinedMap.set(c.itemSeq, c);
      }
    }

    const candidates = Array.from(combinedMap.values());
    searchCache.set(cleanQ, candidates);

    return { candidates, detectedIngredientNotice };
  } catch (err: any) {
    if (localMatches.length > 0) {
      return { candidates: localMatches, detectedIngredientNotice };
    }
    return {
      candidates: [],
      apiError: `검색 중 네트워크 오류가 발생했습니다: ${err.message}`
    };
  }
}

/**
 * 2. 식약처 허가사항 소아 정보 추출기
 */
export async function fetchMfdsPediatricLabel(itemSeq: string): Promise<MfdsPediatricLabelInfo> {
  const result: MfdsPediatricLabelInfo = {
    status: 'NO_DATA',
    fullDocTexts: {}
  };

  try {
    // 1차: 공식 상세 API
    let raw = await fetchMfdsDrugRawByItemSeq(itemSeq);
    let eeDoc = raw?.EE_DOC_DATA ? cleanXmlDocText(raw.EE_DOC_DATA) : '';
    let udDoc = raw?.UD_DOC_DATA ? cleanXmlDocText(raw.UD_DOC_DATA) : '';
    let nbDoc = raw?.NB_DOC_DATA ? cleanXmlDocText(raw.NB_DOC_DATA) : '';

    // 만약 빈값이면 nedrug 스크래핑 보완
    if (!udDoc || !nbDoc) {
      const nedrugDocs = await fetchNedrugDocTexts(itemSeq);
      if (nedrugDocs) {
        eeDoc = eeDoc || nedrugDocs.eeDocText || '';
        udDoc = udDoc || nedrugDocs.udDocText || '';
        nbDoc = nbDoc || nedrugDocs.nbDocText || '';
      }
    }

    result.fullDocTexts = { eeDoc, udDoc, nbDoc };

    if (!udDoc && !nbDoc) {
      result.status = 'NO_DATA';
      return result;
    }

    result.status = 'SUCCESS';

    // 소아 용법용량 문맥 추출
    const pediatricKeywords = [
      '소아', '어린이', '영아', '유아', '신생아', '체중', 'kg당', '개월', '세 미만', '세 이상', '체중당'
    ];
    const isPediatricSentence = (s: string) => pediatricKeywords.some((kw) => s.includes(kw));

    // UD_DOC_DATA(용법용량) 문단 및 문장 파싱
    const udParagraphs = udDoc.split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[1-9]\.|\b소아\b|\b어린이\b)/);
    const pediatricUdList: string[] = [];
    for (const p of udParagraphs) {
      const cleanP = p.trim();
      if (cleanP && isPediatricSentence(cleanP)) {
        pediatricUdList.push(cleanP);
      }
    }
    result.pediatricDosageSummary =
      pediatricUdList.length > 0 ? pediatricUdList.join('\n\n') : undefined;

    // 적용 연령 파싱
    const ageMatch = udDoc.match(
      /(?:만\s*)?\d+(?:\.\d+)?(?:개월|세)\s*(?:이상|미만|이하|초과)(?:\s*(?:~|-)\s*(?:만\s*)?\d+(?:개월|세))?/g
    );
    if (ageMatch && ageMatch.length > 0) {
      result.pediatricAgeRange = Array.from(new Set(ageMatch)).join(', ');
    }

    // 체중별/kg당 투여량 파싱
    const weightMatch = udDoc.match(
      /\d+(?:\.\d+)?(?:\s*(?:~|-)\s*\d+(?:\.\d+)?)?\s*(?:mg|밀리그램|mL|밀리리터|g)\s*\/\s*(?:kg|킬로그램)(?:\s*\/\s*(?:일|회|day|dose))?/gi
    );
    if (weightMatch && weightMatch.length > 0) {
      result.weightBasedDose = Array.from(new Set(weightMatch)).join(', ');
    }

    // 투여 횟수 및 간격
    const freqMatch = udDoc.match(
      /(?:1일\s*[1-6]회|1회\s*[1-6]회|[1-6]시간\s*간격으로|[1-6]회\s*분할\s*투여|필요시\s*[1-6]시간\s*간격)/g
    );
    if (freqMatch && freqMatch.length > 0) {
      result.frequencyAndInterval = Array.from(new Set(freqMatch)).join(', ');
    }

    // 1일 최대 용량
    const maxMatch = udDoc.match(
      /(?:1일\s*(?:최대|최고)\s*(?:용량은?)?\s*|최대\s*투여량\s*:?\s*)([^.;\n]+(?:mg|g|mL|정|캡슐|포)[^.;\n]*)/i
    );
    if (maxMatch) {
      result.maxDailyDose = maxMatch[0].trim();
    }

    // NB_DOC_DATA(주의사항) 내 소아 주의 및 금기 추출
    const nbParagraphs = nbDoc.split(/(?:\r?\n)+/);
    const precautionsList: string[] = [];
    const contraindicationsList: string[] = [];

    for (const p of nbParagraphs) {
      const cleanP = p.trim();
      if (!cleanP || !isPediatricSentence(cleanP)) continue;

      if (/투여하지\s*말\s*것|금기|투여금지/.test(cleanP)) {
        contraindicationsList.push(cleanP);
      } else if (/신중히\s*투여|주의|신중투여|이상반응|경고/.test(cleanP)) {
        precautionsList.push(cleanP);
      } else {
        precautionsList.push(cleanP);
      }
    }

    result.pediatricPrecautions =
      precautionsList.length > 0 ? precautionsList.slice(0, 5).join('\n\n') : undefined;
    result.pediatricContraindications =
      contraindicationsList.length > 0
        ? contraindicationsList.slice(0, 3).join('\n\n')
        : undefined;

    return result;
  } catch (e) {
    return {
      status: 'API_ERROR',
      fullDocTexts: {}
    };
  }
}

/**
 * 3. 식약처 DUR 소아 관련 주의정보 조회
 */
export async function fetchMfdsDurPediatricInfo(
  itemSeq: string,
  productName: string
): Promise<MfdsDurPediatricInfo> {
  const cacheKey = itemSeq || productName;
  if (durCache.has(cacheKey)) {
    return durCache.get(cacheKey)!;
  }

  const result: MfdsDurPediatricInfo = {
    status: 'NO_DATA',
    hasAgeTaboo: false,
    hasCapacityNotice: false,
    hasPeriodNotice: false,
    entries: [],
    noticeMessage: '관련 DUR 정보 조회 결과 없음 (본 결과는 안전성이 확인되었다는 의미는 아닙니다)'
  };

  try {
    const url = `${DUR_PRDLST_URL}?serviceKey=${encodeURIComponent(
      DATA_GO_KR_API_KEY
    )}&itemSeq=${encodeURIComponent(itemSeq)}&type=json`;

    const res = await fetch(url);
    if (!res.ok) {
      result.status = 'API_ERROR';
      result.noticeMessage = `DUR API 응답 실패 (HTTP ${res.status})`;
      return result;
    }

    const data = await res.json();
    const items = data?.body?.items || [];

    if (items.length === 0) {
      result.status = 'NO_DATA';
      durCache.set(cacheKey, result);
      return result;
    }

    result.status = 'SUCCESS';

    for (const item of items) {
      const typeName = String(item['TYPE_NAME  '] || item.TYPE_NAME || '').trim();
      const typeCode = String(item.TYPE_CODE || '').trim();

      const hasAge = typeName.includes('특정연령대금기') || typeCode.includes('B');
      const hasCap = typeName.includes('용량주의') || typeCode.includes('D');
      const hasPd = typeName.includes('투여기간주의') || typeCode.includes('E');

      if (hasAge) result.hasAgeTaboo = true;
      if (hasCap) result.hasCapacityNotice = true;
      if (hasPd) result.hasPeriodNotice = true;

      // 항목 생성
      if (hasAge) {
        let tabooAge = '소아 특정연령대 투여금기';
        let tabooReason = '소아 안전성·유효성 미확립 또는 중대한 이상반응 우려';
        if (productName.includes('시프로') || productName.includes('씨프로') || productName.includes('레보플록')) {
          tabooAge = '18세 미만 소아 및 청소년 금기';
          tabooReason = '관절병변 및 골성장 장애 우려';
        } else if (productName.includes('독시') || productName.includes('미노신')) {
          tabooAge = '12세 미만 소아 금기';
          tabooReason = '치아 착색 및 법랑질 형성부전 우려';
        } else if (productName.includes('아스피린')) {
          tabooAge = '15세 이하 수두 또는 독감 증상 소아 금기';
          tabooReason = '라이증후군(Reye syndrome) 유발 위험';
        }

        result.entries.push({
          typeName: '특정연령대금기',
          typeCode,
          itemName: item.ITEM_NAME || productName,
          ingrName: item.MATERIAL_NAME?.split(',')?.[0] || undefined,
          tabooAge,
          tabooReason,
          officialBasis: '식품의약품안전처 DUR 특정연령대금기 공고'
        });
      }

      if (hasCap) {
        result.entries.push({
          typeName: '용량주의',
          typeCode,
          itemName: item.ITEM_NAME || productName,
          ingrName: item.MATERIAL_NAME?.split(',')?.[0] || undefined,
          tabooReason: '1일 최대 투여용량 초과 주의 (성인/소아 체중당 권장용량 준수 필요)',
          officialBasis: '식품의약품안전처 DUR 용량주의 공고'
        });
      }

      if (hasPd) {
        result.entries.push({
          typeName: '투여기간주의',
          typeCode,
          itemName: item.ITEM_NAME || productName,
          ingrName: item.MATERIAL_NAME?.split(',')?.[0] || undefined,
          tabooReason: '최대 연속 투여기간 초과 주의',
          officialBasis: '식품의약품안전처 DUR 투여기간주의 공고'
        });
      }

      // 기타 주의사항
      const otherTypes = typeName
        .split(',')
        .filter((t: string) => !['특정연령대금기', '용량주의', '투여기간주의'].includes(t.trim()))
        .join(', ');
      if (otherTypes) {
        result.entries.push({
          typeName: otherTypes,
          typeCode,
          itemName: item.ITEM_NAME || productName,
          tabooReason: '임부금기/노인주의/첨가제주의 등 기타 DUR 공고 항목',
          officialBasis: '식품의약품안전처 DUR 기준'
        });
      }
    }

    if (result.entries.length > 0) {
      result.noticeMessage = `DUR 경고 ${result.entries.length}건 확인됨`;
    }

    durCache.set(cacheKey, result);
    return result;
  } catch (e: any) {
    result.status = 'API_ERROR';
    result.noticeMessage = `DUR 조회 중 네트워크 오류: ${e.message}`;
    return result;
  }
}

/**
 * 4. 미국 openFDA 소아 허가정보 및 DailyMed 원문 링크 조회
 */
export async function fetchOpenFdaPediatricInfo(inn: string): Promise<{
  fda: OpenFdaPediatricInfo;
  dailyMed: DailyMedInfo;
}> {
  const cleanInn = inn.trim();
  const cacheKey = cleanInn.toLowerCase();

  const defaultDailyMed: DailyMedInfo = {
    brandName: cleanInn,
    genericName: cleanInn,
    dosageForm: 'Reference SPL',
    dailyMedUrl: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(
      cleanInn
    )}`
  };

  if (openFdaCache.has(cacheKey)) {
    const cachedFda = openFdaCache.get(cacheKey)!;
    if (cachedFda.splSetId) {
      defaultDailyMed.splSetId = cachedFda.splSetId;
      defaultDailyMed.dailyMedUrl = `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${cachedFda.splSetId}`;
    }
    return { fda: cachedFda, dailyMed: defaultDailyMed };
  }

  const fdaResult: OpenFdaPediatricInfo = {
    status: 'NO_DATA',
    genericName: cleanInn,
    isExactMatch: false
  };

  try {
    // 1차: generic_name AND _exists_:pediatric_use
    let url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(
      cleanInn
    )}"+AND+_exists_:pediatric_use&limit=2`;
    let res = await fetch(url);
    let json = await res.json();
    let hit = json.results?.[0];

    // 2차: 일반 검색
    if (!hit) {
      url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(
        cleanInn
      )}"&limit=2`;
      res = await fetch(url);
      json = await res.json();
      hit = json.results?.[0];
    }

    if (!hit) {
      fdaResult.status = 'NO_DATA';
      openFdaCache.set(cacheKey, fdaResult);
      return { fda: fdaResult, dailyMed: defaultDailyMed };
    }

    fdaResult.status = 'SUCCESS';
    fdaResult.brandName = hit.openfda?.brand_name?.[0] || hit.openfda?.generic_name?.[0] || cleanInn;
    fdaResult.genericName = hit.openfda?.generic_name?.[0] || cleanInn;
    fdaResult.dosageForm = hit.openfda?.dosage_form?.[0] || 'Oral / Injection';
    fdaResult.route = hit.openfda?.route?.[0] || 'Oral';
    fdaResult.splSetId = hit.openfda?.spl_set_id?.[0];

    fdaResult.pediatricUse = Array.isArray(hit.pediatric_use)
      ? hit.pediatric_use.join('\n\n')
      : hit.pediatric_use;
    fdaResult.dosageAndAdministration = Array.isArray(hit.dosage_and_administration)
      ? hit.dosage_and_administration.slice(0, 3).join('\n\n')
      : hit.dosage_and_administration;
    fdaResult.contraindications = Array.isArray(hit.contraindications)
      ? hit.contraindications.join('\n\n')
      : hit.contraindications;
    fdaResult.warningsAndPrecautions = Array.isArray(hit.warnings_and_cautions)
      ? hit.warnings_and_cautions.slice(0, 2).join('\n\n')
      : Array.isArray(hit.warnings)
      ? hit.warnings.slice(0, 2).join('\n\n')
      : hit.warnings_and_cautions || hit.warnings;

    // 동일 성분 해외 참고자료 여부
    fdaResult.isExactMatch = (hit.openfda?.generic_name?.[0] || '').toLowerCase() === cleanInn.toLowerCase();

    if (fdaResult.splSetId) {
      defaultDailyMed.splSetId = fdaResult.splSetId;
      defaultDailyMed.dailyMedUrl = `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${fdaResult.splSetId}`;
      defaultDailyMed.brandName = fdaResult.brandName || cleanInn;
      defaultDailyMed.dosageForm = fdaResult.dosageForm || 'SPL Document';
    }

    openFdaCache.set(cacheKey, fdaResult);
    return { fda: fdaResult, dailyMed: defaultDailyMed };
  } catch (e) {
    fdaResult.status = 'API_ERROR';
    return { fda: fdaResult, dailyMed: defaultDailyMed };
  }
}

/**
 * 5. WHO Model Formulary for Children 2010 리포트 생성
 */
export function fetchWhoPediatricReport(inn: string): WhoChildrenFormularyReport {
  const disclaimer =
    'WHO Model Formulary for Children (2010) — 과거 발행된 참고자료로, 최신 임상지침 및 국내 허가사항과 차이가 있을 수 있습니다.';

  if (!inn || !inn.trim()) {
    return {
      status: 'CHECK_UNAVAILABLE',
      items: [],
      disclaimer,
      message: 'WHO 자료를 확인할 수 없습니다. (성분명 불확실)'
    };
  }

  try {
    const hits = lookupWhoFormulary(inn);
    if (hits.length > 0) {
      return {
        status: 'CONFIRMED',
        items: hits,
        disclaimer
      };
    } else {
      return {
        status: 'NOT_FOUND',
        items: [],
        disclaimer,
        message: 'WHO Model Formulary for Children 2010에서 해당 성분을 찾지 못했습니다.'
      };
    }
  } catch (err: any) {
    return {
      status: 'CHECK_UNAVAILABLE',
      items: [],
      disclaimer,
      message: `WHO 자료를 확인할 수 없습니다: ${err.message}`
    };
  }
}

/**
 * 6. 전체 종합 리포트 빌더 (5개 정보원 병렬 수집)
 */
export async function buildPediatricDrugReport(
  candidate: PediatricSearchCandidate
): Promise<PediatricDrugReport> {
  const cacheKey = candidate.itemSeq;
  if (reportCache.has(cacheKey)) {
    return reportCache.get(cacheKey)!;
  }

  // 1) 식약처 허가사항 & 2) 식약처 DUR 병렬 조회
  const [mfdsLabel, durInfo] = await Promise.all([
    fetchMfdsPediatricLabel(candidate.itemSeq),
    fetchMfdsDurPediatricInfo(candidate.itemSeq, candidate.productName)
  ]);

  // 성분 목록 (영문 INN 식별)
  const targetInns: string[] = [];
  if (candidate.ingredients.length > 0) {
    for (const ing of candidate.ingredients) {
      if (ing.matchedInn && !targetInns.includes(ing.matchedInn)) {
        targetInns.push(ing.matchedInn);
      }
    }
  }

  // 만약 ingredients에서 INN을 못 찾았으면 제품명과 매칭 시도
  if (targetInns.length === 0) {
    const cw = findCrosswalkBySearchQuery(candidate.productName);
    if (cw) {
      targetInns.push(cw.inn);
    }
  }

  // 3) openFDA & DailyMed 조회
  const openFdaList: Array<{
    ingredientInn: string;
    fda: OpenFdaPediatricInfo;
    dailyMed: DailyMedInfo;
  }> = [];

  for (const inn of targetInns) {
    const res = await fetchOpenFdaPediatricInfo(inn);
    openFdaList.push({
      ingredientInn: inn,
      fda: res.fda,
      dailyMed: res.dailyMed
    });
  }

  // 4) WHO Model Formulary 조회
  const whoList: Array<{
    ingredientInn: string;
    who: WhoChildrenFormularyReport;
  }> = [];

  for (const inn of targetInns) {
    const whoReport = fetchWhoPediatricReport(inn);
    whoList.push({
      ingredientInn: inn,
      who: whoReport
    });
  }

  // 5) RCH Melbourne 보조 가이드
  const rchMelbourne: RchMelbourneInfo = {
    url: 'https://www.rch.org.au/clinicalguide/',
    title: 'The Royal Children’s Hospital Melbourne Clinical Practice Guidelines',
    description: '호주 멜버른 왕립 아동병원 소아 임상진료 가이드라인 (질환별 소아 표준 지침)'
  };

  const report: PediatricDrugReport = {
    candidate,
    mfdsLabel,
    durInfo,
    openFdaList,
    whoList,
    rchMelbourne,
    generatedAt: new Date().toISOString()
  };

  reportCache.set(cacheKey, report);
  return report;
}
