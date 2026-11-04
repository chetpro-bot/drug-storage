import {
  cleanXmlDocText,
  fetchMfdsDrugRawByItemSeq,
  fetchNedrugDocTexts,
  fetchNedrugIngredientsText
} from '../../../services/publicDataService';
import {
  DataFetchStatus,
  DomesticIngredientItem,
  IngredientSafetyEvaluation,
  MaternalDrugSafetyReport,
  MaternalDrugSearchCandidate,
  MfdsDurPregnantTabooInfo,
  MfdsDurTabooEntry,
  MfdsLabelSafetyInfo,
  PillIdentificationInfo
} from '../types/maternalSafety';
import {
  findCrosswalkBySearchQuery,
  matchDomesticIngredientToOverseasInn
} from '../data/ingredientCrosswalkDb';
import { lookupTgaCategoryByInn } from '../data/tgaPregnancyCategoryDb';
import {
  fetchLactMedChapterLinkLive,
  lookupLactMedAsync,
  lookupLactMedByInn
} from '../data/lactmedMonographDb';

const DATA_GO_KR_API_KEY =
  '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

const MFDS_INQ_URL =
  'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08';
const DUR_PRDLST_TABOO_URL =
  'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03';
const DUR_IRDNT_TABOO_URL =
  'https://apis.data.go.kr/1471000/DURIrdntInfoService03/getPwnmTabooInfoList02';
const PILL_IDNTFC_URL =
  'https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03';

// 캐시 (식약처 및 DUR API 호출 제한·응답 속도 최적화)
const searchCache = new Map<string, MaternalDrugSearchCandidate[]>();
const reportCache = new Map<string, MaternalDrugSafetyReport>();
const durIrdntCache = new Map<string, MfdsDurTabooEntry[]>();
const pillInfoCache = new Map<string, PillIdentificationInfo | null>();

/**
 * 식약처 의약품 낱알식별 정보 API (MdcinGrnIdntfcInfoService03)
 * - 공공누리 제1유형 공식 개방 저작물 (상업적 이용 가능, 저작권료 무료)
 * - 1차 품목기준코드(item_seq) 조회 -> 없을 시 제품명(item_name) 보완 조회
 */
export async function fetchPillIdentificationInfo(
  itemSeq: string,
  productName?: string
): Promise<PillIdentificationInfo | null> {
  const cleanSeq = (itemSeq || '').trim();
  if (!cleanSeq) return null;
  if (pillInfoCache.has(cleanSeq)) {
    return pillInfoCache.get(cleanSeq)!;
  }

  // 1. 품목기준코드(item_seq)로 우선 조회
  try {
    const urlSeq = `${PILL_IDNTFC_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&item_seq=${encodeURIComponent(cleanSeq)}&type=json`;
    const res = await fetch(urlSeq);
    if (res.ok) {
      const data = await res.json();
      const hit = data?.body?.items?.[0];
      if (hit && (hit.ITEM_IMAGE || hit.PRINT_FRONT || hit.DRUG_SHAPE)) {
        const info: PillIdentificationInfo = {
          itemImage: hit.ITEM_IMAGE || null,
          drugShape: hit.DRUG_SHAPE || null,
          colorClass1: hit.COLOR_CLASS1 || null,
          colorClass2: hit.COLOR_CLASS2 || null,
          lineFront: hit.LINE_FRONT || null,
          lineBack: hit.LINE_BACK || null,
          printFront: hit.PRINT_FRONT || null,
          printBack: hit.PRINT_BACK || null,
          lengLong: hit.LENG_LONG || null,
          lengShort: hit.LENG_SHORT || null,
          thick: hit.THICK || null,
          chart: hit.CHART || null,
          formName: hit.FORM_CODE_NAME || null
        };
        pillInfoCache.set(cleanSeq, info);
        return info;
      }
    }
  } catch {
    // ignore
  }

  // 2. 만약 갱신 코드 등으로 품목기준코드가 다를 경우 제품명(괄호 제거)으로 2차 조회
  if (productName) {
    try {
      const cleanName = productName.replace(/\(.*?\)/g, '').trim();
      if (cleanName.length >= 2) {
        const urlName = `${PILL_IDNTFC_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&item_name=${encodeURIComponent(cleanName)}&type=json`;
        const res = await fetch(urlName);
        if (res.ok) {
          const data = await res.json();
          const items = data?.body?.items || [];
          const hit = items.find((x: any) => (x.ITEM_NAME || '').includes(cleanName)) || items[0];
          if (hit && (hit.ITEM_IMAGE || hit.PRINT_FRONT || hit.DRUG_SHAPE)) {
            const info: PillIdentificationInfo = {
              itemImage: hit.ITEM_IMAGE || null,
              drugShape: hit.DRUG_SHAPE || null,
              colorClass1: hit.COLOR_CLASS1 || null,
              colorClass2: hit.COLOR_CLASS2 || null,
              lineFront: hit.LINE_FRONT || null,
              lineBack: hit.LINE_BACK || null,
              printFront: hit.PRINT_FRONT || null,
              printBack: hit.PRINT_BACK || null,
              lengLong: hit.LENG_LONG || null,
              lengShort: hit.LENG_SHORT || null,
              thick: hit.THICK || null,
              chart: hit.CHART || null,
              formName: hit.FORM_CODE_NAME || null
            };
            pillInfoCache.set(cleanSeq, info);
            return info;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  pillInfoCache.set(cleanSeq, null);
  return null;
}

/**
 * 빠른 검증 및 API 장애 대비용 국내 대표 허가 의약품 시드 목록
 * (실제 식약처 품목기준코드 ITEM_SEQ 및 공식 허가사항 기준)
 */
export const VERIFIED_DOMESTIC_SEED_PRODUCTS: MaternalDrugSearchCandidate[] = [
  {
    itemSeq: '202106092',
    productName: '타이레놀정500밀리그람(아세트아미노펜)',
    manufacturer: '켄뷰코리아판매유한회사',
    etcOtcName: '일반의약품',
    dosageForm: '필름코팅정',
    route: '경구',
    mainIngredientsText: '아세트아미노펜 (Acetaminophen) 500mg',
    isCombination: false
  },
  {
    itemSeq: '198300343',
    productName: '부루펜정400밀리그램(이부프로펜)',
    manufacturer: '삼일제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '당의정',
    route: '경구',
    mainIngredientsText: '이부프로펜 (Ibuprofen) 400mg',
    isCombination: false
  },
  {
    itemSeq: '200610765',
    productName: '지르텍정(세티리진염산염)',
    manufacturer: '한국유씨비제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '필름코팅정',
    route: '경구',
    mainIngredientsText: '세티리진염산염 (Cetirizine Hydrochloride) 10mg',
    isCombination: false
  },
  {
    itemSeq: '200905692',
    productName: '클라리틴정(로라타딘)',
    manufacturer: '바이엘코리아(주)',
    etcOtcName: '일반의약품',
    dosageForm: '정제',
    route: '경구',
    mainIngredientsText: '로라타딘 (Loratadine) 10mg',
    isCombination: false
  },
  {
    itemSeq: '198000158',
    productName: '곰실린캡슐(아목시실린수화물)(수출명:대웅아목시실린캡슐500밀리그램)',
    manufacturer: '(주)대웅제약',
    etcOtcName: '전문의약품',
    dosageForm: '경질캡슐',
    route: '경구',
    mainIngredientsText: '아목시실린수화물 (Amoxicillin Hydrate) 500mg(역가)',
    isCombination: false
  },
  {
    itemSeq: '197900575',
    productName: '슈다페드정(슈도에페드린염산염)',
    manufacturer: '삼일제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '정제',
    route: '경구',
    mainIngredientsText: '슈도에페드린염산염 (Pseudoephedrine Hydrochloride) 60mg',
    isCombination: false
  },
  {
    itemSeq: '199101279',
    productName: '오구멘틴정625밀리그램(아목시실린·클라불란산칼륨(4:1))',
    manufacturer: '일성아이에스(주)',
    etcOtcName: '전문의약품',
    dosageForm: '필름코팅정',
    route: '경구',
    mainIngredientsText: '아목시실린수화물 500mg(역가) + 클라불란산칼륨 125mg(역가)',
    isCombination: true
  },
  {
    itemSeq: '197000053',
    productName: '액티피드정',
    manufacturer: '삼일제약(주)',
    etcOtcName: '일반의약품',
    dosageForm: '정제',
    route: '경구',
    mainIngredientsText: '슈도에페드린염산염 60mg + 트리프롤리딘염산염수화물 2.5mg',
    isCombination: true
  },
  {
    itemSeq: '202003694',
    productName: '울트라셋정',
    manufacturer: '(주)한국얀센',
    etcOtcName: '전문의약품',
    dosageForm: '필름코팅정',
    route: '경구',
    mainIngredientsText: '트라마돌염산염 37.5mg + 아세트아미노펜 325mg',
    isCombination: true
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
  if (combined.includes('장용정') || combined.includes('장용과립')) return '장용정/장용과립';
  if (combined.includes('서방정')) return '서방정';
  if (combined.includes('연질캡슐') || combined.includes('연질캅셀')) return '연질캡슐';
  if (combined.includes('경질캡슐') || combined.includes('캡슐') || combined.includes('캅셀')) return '캡슐제';
  if (combined.includes('시럽') || combined.includes('현탁액')) return '시럽제/현탁액제';
  if (combined.includes('산제') || combined.includes('과립')) return '산제/과립제';
  if (combined.includes('크림')) return '크림제';
  if (combined.includes('연고')) return '연고제';
  if (combined.includes('겔')) return '겔제';
  if (combined.includes('점안')) return '점안제';
  if (combined.includes('주사')) return '주사제';
  if (combined.includes('정')) return '정제';
  return chartText ? chartText.slice(0, 20) : '기타 제형';
}

function formatDateYmd(raw?: string | null): string {
  if (!raw) return '기준일 미상';
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return String(raw).trim();
}

/**
 * 식약처 MATERIAL_NAME 및 MAIN_ITEM_INGR / MAIN_INGR_ENG에서 유효성분만 정확히 분리
 */
export function parseMfdsActiveIngredients(params: {
  materialName?: string | null;
  mainItemIngr?: string | null;
  mainIngrEng?: string | null;
  rawIngredientsFallback?: string | null;
  dosageForm: string;
  route: string;
}): DomesticIngredientItem[] {
  const { materialName, mainItemIngr, mainIngrEng, rawIngredientsFallback, dosageForm, route } = params;

  const engCandidates = (mainIngrEng || '')
    .split('/')
    .map((s) => s.replace(/\[M[0-9]+\]/gi, '').trim())
    .filter(Boolean);

  const mainKorSet = new Set(
    (mainItemIngr || '')
      .split(/[/|]/)
      .map((s) => s.replace(/\[M[0-9]+\]/gi, '').trim())
      .filter(Boolean)
  );

  const results: DomesticIngredientItem[] = [];

  // 1순위: MATERIAL_NAME 세미콜론(;) 구분 구조 파싱
  if (materialName && materialName.includes('|')) {
    const blocks = materialName
      .split(';')
      .map((b) => b.trim())
      .filter(Boolean);

    let activeIdx = 0;
    for (const block of blocks) {
      const fields: Record<string, string> = {};
      block.split('|').forEach((kv) => {
        const colonIdx = kv.indexOf(':');
        if (colonIdx !== -1) {
          fields[kv.slice(0, colonIdx).trim()] = kv.slice(colonIdx + 1).trim();
        }
      });

      const korName = (fields['성분명'] || '').trim();
      if (!korName) continue;

      // 부형제/첨가제가 섞여 있는 경우 mainKorSet과 대조
      if (mainKorSet.size > 0 && !Array.from(mainKorSet).some((m) => korName.includes(m) || m.includes(korName))) {
        continue;
      }

      const qty = (fields['분량'] || '').trim();
      let unit = (fields['단위'] || '').trim();
      if (unit === '밀리그램' || unit === '밀리그람') unit = 'mg';
      else if (unit === '마이크로그램' || unit === '마이크로그람') unit = 'μg';
      else if (unit === '그램' || unit === '그람') unit = 'g';

      const info = (fields['성분정보'] || '')
        .replace(/밀리그램/g, 'mg')
        .replace(/마이크로그램/g, 'μg')
        .trim();

      let amountText = qty ? `${qty}${unit}` : '';
      if (info) {
        amountText = amountText ? `${amountText} (${info})` : info;
      }

      const engHint = engCandidates[activeIdx] || '';
      activeIdx++;

      // '아목시실린ㆍ클라불란산칼륨(4:1)'과 같이 두 가지 유효성분이 중점(ㆍ/·)으로 묶여 기재된 복합원료는 개별 유효성분으로 분리
      if (/[ㆍ·]/.test(korName) && !/셀룰로오스|이산화규소|만니톨|전분/.test(korName)) {
        const subKorParts = korName
          .replace(/\([0-9]+:[0-9]+\)/g, '')
          .split(/[ㆍ·]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const subEngParts = engHint
          .replace(/\([0-9]+:[0-9]+\)/g, '')
          .split(/[ㆍ·]/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (subKorParts.length > 1) {
          subKorParts.forEach((subKor, sIdx) => {
            results.push(
              matchDomesticIngredientToOverseasInn({
                koreanName: subKor,
                englishName: subEngParts[sIdx] || '',
                amountText: sIdx === 0 && amountText ? `복합 총량 ${amountText} (${korName})` : `복합 배합 (${korName})`,
                dosageForm,
                route
              })
            );
          });
          continue;
        }
      }

      results.push(
        matchDomesticIngredientToOverseasInn({
          koreanName: korName,
          englishName: engHint,
          amountText,
          dosageForm,
          route
        })
      );
    }
  }

  // 2순위: MAIN_ITEM_INGR / MAIN_INGR_ENG 기반 파싱
  if (results.length === 0 && mainItemIngr) {
    const korList = mainItemIngr
      .split(/[/|]/)
      .map((s) => s.replace(/\[M[0-9]+\]/gi, '').trim())
      .filter(Boolean);

    korList.forEach((korName, idx) => {
      const engName = engCandidates[idx] || '';
      results.push(
        matchDomesticIngredientToOverseasInn({
          koreanName: korName,
          englishName: engName,
          amountText: '',
          dosageForm,
          route
        })
      );
    });
  }

  // 3순위: nedrug 또는 시드 텍스트 폴백
  if (results.length === 0 && rawIngredientsFallback) {
    const parts = rawIngredientsFallback
      .split(/[\n+]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      const m = part.match(/^([가-힣A-Za-z0-9·\-\(\)\s]+?)(?:\s*\(([A-Za-z\s\-]+)\))?\s*([0-9.,]+\s*(?:mg|μg|ug|g|mL)(?:\s*\([^)]+\))?)?$/i);
      const kor = (m ? m[1] : part).replace(/\([A-Za-z\s\-]+\)/g, '').trim();
      const eng = m?.[2]?.trim() || '';
      const amt = m?.[3]?.trim() || '';
      results.push(
        matchDomesticIngredientToOverseasInn({
          koreanName: kor,
          englishName: eng,
          amountText: amt,
          dosageForm,
          route
        })
      );
    }
  }

  // 중복 성분 제거
  const seen = new Set<string>();
  return results.filter((item) => {
    const k = `${item.koreanName}_${item.matchedInn || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * ① 식약처 허가사항(NB_DOC_DATA)에서 임부 및 수유부 투여 관련 문구 원문 추출
 * - 상위 조항 제목(예: "3. 다음과 같은 사람은 이 약을 복용하기 전에 의사, 치과의사, 약사와 상의할 것", "2. 다음과 같은 사람은 이 약을 복용하지 말 것", "6. 임부 및 수유부에 대한 투여")과 하위 항목(예: "10) 임부 또는 수유부")을 반드시 함께 묶어 추출
 * - 원문이 없는 경우 절대 내용을 생성하지 않음
 */
export function extractMfdsPregnancyAndLactationText(
  rawNbDocXmlOrText: string | null | undefined,
  itemSeq: string,
  updatedAt: string,
  fetchStatus: DataFetchStatus = 'SUCCESS',
  errorMessage?: string
): MfdsLabelSafetyInfo {
  const sourceUrl = `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(itemSeq)}`;

  if (fetchStatus === 'API_ERROR') {
    return {
      status: 'API_ERROR',
      errorMessage: errorMessage || '식약처 의약품 허가사항 API 조회 중 통신 오류가 발생했습니다.',
      pregnancySectionTitle: null,
      pregnancyKeyText: null,
      pregnancyFullText: null,
      lactationSectionTitle: null,
      lactationKeyText: null,
      lactationFullText: null,
      fullPrecautionsText: null,
      sourceUrl,
      updatedAt
    };
  }

  const rawInput = (rawNbDocXmlOrText || '').trim();
  const cleanedFull = cleanXmlDocText(rawInput);
  if (!cleanedFull) {
    return {
      status: 'NO_DATA',
      pregnancySectionTitle: null,
      pregnancyKeyText: null,
      pregnancyFullText: null,
      lactationSectionTitle: null,
      lactationKeyText: null,
      lactationFullText: null,
      fullPrecautionsText: null,
      sourceUrl,
      updatedAt
    };
  }

  const PREG_RE = /임부|임신|태아|태자|기형|양수|동맥관|분만|가임|생식\s*독성|배아/;
  const LACT_RE = /수유|모유|유즙/;

  interface ParsedArticle {
    title: string;
    paragraphs: string[];
  }

  const parsedArticles: ParsedArticle[] = [];

  // 1. XML <ARTICLE title="..."> 구조가 있는 경우 조항 단위 파싱
  const xmlArticleMatches = [
    ...rawInput.matchAll(/<ARTICLE\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/ARTICLE>/gi)
  ];

  if (xmlArticleMatches.length > 0) {
    for (const m of xmlArticleMatches) {
      const title = m[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const body = m[2] || '';
      const paras = [...body.matchAll(/<PARAGRAPH[^>]*>([\s\S]*?)<\/PARAGRAPH>/gi)]
        .map((p) =>
          p[1]
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
            .replace(/\s+/g, ' ')
            .trim()
        )
        .filter(Boolean);

      if (title || paras.length > 0) {
        parsedArticles.push({
          title: title || '사용상의 주의사항',
          paragraphs: paras
        });
      }
    }
  } else {
    // 2. 일반 텍스트(nedrug 폴백 등)인 경우 상위 대제목("1. ...", "2. ...") 기준으로 조항 분리
    const lines = cleanedFull
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let currentArticle: ParsedArticle = {
      title: '사용상의 주의사항',
      paragraphs: []
    };

    for (const line of lines) {
      const isMajorArticleTitle =
        /^[0-9]{1,2}\.\s+\S+/.test(line) &&
        line.length < 90 &&
        (/말\s*것|상의할\s*것|투여|주의|이상반응|상호작용|경고|일반적|과량|보관|기타|영향/.test(line) ||
          /임부|수유부/.test(line));

      if (isMajorArticleTitle) {
        if (currentArticle.paragraphs.length > 0 || currentArticle.title !== '사용상의 주의사항') {
          parsedArticles.push(currentArticle);
        }
        currentArticle = { title: line, paragraphs: [] };
      } else {
        currentArticle.paragraphs.push(line);
      }
    }
    if (currentArticle.paragraphs.length > 0 || parsedArticles.length === 0) {
      parsedArticles.push(currentArticle);
    }
  }

  const pregBlocks: string[] = [];
  const lactBlocks: string[] = [];
  const pregTitles: string[] = [];
  const lactTitles: string[] = [];
  const fullFormattedSections: string[] = [];

  for (const art of parsedArticles) {
    const title = art.title;
    if (art.paragraphs.length > 0) {
      fullFormattedSections.push(`[${title}]\n${art.paragraphs.join('\n')}`);
    } else {
      fullFormattedSections.push(`[${title}]`);
    }

    // 조항 내 문단들을 하위 번호("1)", "2)", ..., "10)", "(1)") 단위로 그룹화하여 후속 설명 문단이 누락되지 않도록 함
    const subItems: string[][] = [];
    for (const p of art.paragraphs) {
      if (/^(?:[0-9]{1,2}[\.\)]|\([0-9]{1,2}\))\s*/.test(p) || subItems.length === 0) {
        subItems.push([p]);
      } else {
        subItems[subItems.length - 1].push(p);
      }
    }

    const isDedicated = /임부|임신|수유부/.test(title);
    const matchedPregSub: string[] = [];
    const matchedLactSub: string[] = [];

    for (const subLines of subItems) {
      // 하위 항목 첫 줄이 "2) 임부 및 수유부에 대한 투여" 같은 소제목이고 아래에 ①, ② 세부 문단이 딸려 있는 경우
      if (
        subLines.length > 1 &&
        /임부.*수유|수유.*임부/.test(subLines[0]) &&
        subLines[0].length < 45
      ) {
        const rest = subLines.slice(1);
        const pregRest = rest.filter((l) => PREG_RE.test(l) || !LACT_RE.test(l));
        const lactRest = rest.filter((l) => LACT_RE.test(l) || !PREG_RE.test(l));

        if (pregRest.some((l) => PREG_RE.test(l))) {
          matchedPregSub.push(
            `• ${subLines[0]}\n` + pregRest.map((l) => `  ${l}`).join('\n')
          );
        }
        if (lactRest.some((l) => LACT_RE.test(l))) {
          matchedLactSub.push(
            `• ${subLines[0]}\n` + lactRest.map((l) => `  ${l}`).join('\n')
          );
        }
        continue;
      }

      const subText = subLines.join('\n');
      const hasPreg = PREG_RE.test(subText);
      const hasLact = LACT_RE.test(subText);

      if (hasPreg || (isDedicated && /임부|임신/.test(title) && !hasLact)) {
        matchedPregSub.push(
          subLines.map((l, idx) => (idx === 0 ? `• ${l}` : `  ${l}`)).join('\n')
        );
      }
      if (hasLact || (isDedicated && /수유/.test(title) && !hasPreg)) {
        matchedLactSub.push(
          subLines.map((l, idx) => (idx === 0 ? `• ${l}` : `  ${l}`)).join('\n')
        );
      }
    }

    if (matchedPregSub.length > 0) {
      pregTitles.push(title);
      pregBlocks.push(`[${title}]\n${matchedPregSub.join('\n')}`);
    }
    if (matchedLactSub.length > 0) {
      lactTitles.push(title);
      lactBlocks.push(`[${title}]\n${matchedLactSub.join('\n')}`);
    }
  }

  const pregnancyFullText = pregBlocks.length > 0 ? pregBlocks.join('\n\n') : null;
  const pregnancyKeyText = pregnancyFullText;

  const lactationFullText = lactBlocks.length > 0 ? lactBlocks.join('\n\n') : null;
  const lactationKeyText = lactationFullText;

  const formattedFullPrecautions =
    fullFormattedSections.length > 0 ? fullFormattedSections.join('\n\n') : cleanedFull;

  return {
    status: 'SUCCESS',
    pregnancySectionTitle:
      pregTitles.length > 0 ? pregTitles.join(' / ') : null,
    pregnancyKeyText,
    pregnancyFullText,
    lactationSectionTitle:
      lactTitles.length > 0 ? lactTitles.join(' / ') : null,
    lactationKeyText,
    lactationFullText,
    fullPrecautionsText: formattedFullPrecautions,
    sourceUrl,
    updatedAt
  };
}

/**
 * ② 식약처 공식 DUR OpenAPI (품목별 + 성분별) 조회
 * - DURPrdlstInfoService03/getPwnmTabooInfoList03 (품목 조회)
 * - DURIrdntInfoService03/getPwnmTabooInfoList02 (성분 조회)
 */
export async function fetchMfdsDurPregnantTaboo(params: {
  itemSeq: string;
  productName: string;
  ingredients: DomesticIngredientItem[];
  isCombination: boolean;
}): Promise<{
  overall: MfdsDurPregnantTabooInfo;
  byIngredientMap: Map<string, { status: DataFetchStatus; entries: MfdsDurTabooEntry[] }>;
}> {
  const { itemSeq, ingredients, isCombination } = params;
  const byIngredientMap = new Map<string, { status: DataFetchStatus; entries: MfdsDurTabooEntry[] }>();
  const allEntries: MfdsDurTabooEntry[] = [];
  let hadApiError = false;
  let latestDate = '2026-11-04';

  const firstIngrKor = ingredients[0]?.koreanName || params.productName;
  const durSourceUrl = `https://nedrug.mfds.go.kr/pbp/CCBAJ01/getList?searchName=${encodeURIComponent(
    firstIngrKor
  )}&searchTypeCode=C`;

  // 1. 품목기준코드(itemSeq) 기준 DUR 품목 API 조회
  const prdlstMap = new Map<string, any>();
  try {
    const prdUrl = `${DUR_PRDLST_TABOO_URL}?serviceKey=${encodeURIComponent(
      DATA_GO_KR_API_KEY
    )}&itemSeq=${encodeURIComponent(itemSeq)}&type=json&numOfRows=50`;
    const rPrd = await fetch(prdUrl);
    if (rPrd.ok) {
      const jPrd = await rPrd.json();
      const rawItems = jPrd?.body?.items || [];
      const list = Array.isArray(rawItems) ? rawItems : [rawItems];
      for (const it of list) {
        const row = it?.item || it;
        if (row && row.INGR_CODE) {
          prdlstMap.set(row.INGR_CODE, row);
        }
      }
    } else {
      hadApiError = true;
    }
  } catch {
    hadApiError = true;
  }

  // 2. 각 유효성분별 DUR 성분 API (DURIrdntInfoService03/getPwnmTabooInfoList02) 조회
  for (const ingr of ingredients) {
    const key = ingr.koreanName;
    const cw = findCrosswalkBySearchQuery(ingr.matchedInn || ingr.koreanName);
    const searchKor = cw?.durSearchKeyword || ingr.koreanName.replace(/(?:염산염|수화물|칼륨|나트륨|말레산염).*$/, '');

    if (durIrdntCache.has(searchKor)) {
      const cachedEntries = durIrdntCache.get(searchKor)!;
      const filtered = filterDurEntriesForProduct(cachedEntries, isCombination, ingredients);
      byIngredientMap.set(key, { status: 'SUCCESS', entries: filtered });
      allEntries.push(...filtered);
      continue;
    }

    try {
      const irdUrl = `${DUR_IRDNT_TABOO_URL}?serviceKey=${encodeURIComponent(
        DATA_GO_KR_API_KEY
      )}&ingrName=${encodeURIComponent(searchKor)}&type=json&numOfRows=50`;
      const rIrd = await fetch(irdUrl);
      if (!rIrd.ok) {
        hadApiError = true;
        byIngredientMap.set(key, { status: 'API_ERROR', entries: [] });
        continue;
      }

      const jIrd = await rIrd.json();
      const rawList = jIrd?.body?.items || [];
      const items = (Array.isArray(rawList) ? rawList : [rawList])
        .map((x: any) => x?.item || x)
        .filter((x: any) => x && x.DEL_YN === '정상');

      const parsedEntries: MfdsDurTabooEntry[] = items
        .filter((it: any) => {
          // 검색어가 정확히 해당 성분(또는 ORI_INGR 내 염 형태)에 해당하는지 확인 (예: '이부프로펜' 검색 시 '이부프로펜피코놀' 제외)
          const ingrNameClean = (it.INGR_NAME || '').trim();
          if (searchKor === '이부프로펜' && ingrNameClean.includes('이부프로펜피코놀')) {
            return false;
          }
          return (
            ingrNameClean === searchKor ||
            ingrNameClean.startsWith(`${searchKor}/`) ||
            ingrNameClean.endsWith(`/${searchKor}`) ||
            (it.ORI_INGR || '').includes(ingr.koreanName)
          );
        })
        .map((it: any) => {
          const prdMatch = prdlstMap.get(it.INGR_CODE);
          const notifDate = formatDateYmd(it.NOTIFICATION_DATE || prdMatch?.NOTIFICATION_DATE);
          if (notifDate && notifDate !== '기준일 미상') {
            latestDate = notifDate;
          }
          const rawGrade = (it.GRADE || '').trim();
          const grade: '1등급' | '2등급' | '임부금기' =
            rawGrade === '1등급' ? '1등급' : rawGrade === '2등급' ? '2등급' : '임부금기';

          return {
            durSeq: it.DUR_SEQ || undefined,
            mixType: it.MIX_TYPE === '복합' ? '복합' : '단일',
            ingrCode: it.INGR_CODE || undefined,
            ingrName: (it.INGR_NAME || searchKor).trim(),
            ingrEngName: (it.INGR_ENG_NAME || ingr.matchedInn || '').trim(),
            grade,
            prohibitContent:
              (it.PROHBT_CONTENT || prdMatch?.PROHBT_CONTENT || '').replace(/^"|"$/g, '').trim() ||
              null,
            formName: (it.FORM_NAME || prdMatch?.FORM_NAME || '').trim() || null,
            remark: (it.REMARK || prdMatch?.REMARK || '').trim() || null,
            notificationDate: notifDate
          };
        });

      durIrdntCache.set(searchKor, parsedEntries);
      const filtered = filterDurEntriesForProduct(parsedEntries, isCombination, ingredients);
      byIngredientMap.set(key, { status: 'SUCCESS', entries: filtered });
      allEntries.push(...filtered);
    } catch {
      hadApiError = true;
      byIngredientMap.set(key, { status: 'API_ERROR', entries: [] });
    }
  }

  // 중복 DUR 항목 제거
  const uniqueEntries: MfdsDurTabooEntry[] = [];
  const seenDurKeys = new Set<string>();
  for (const e of allEntries) {
    const k = `${e.mixType}_${e.ingrName}_${e.grade}_${e.prohibitContent || ''}`;
    if (!seenDurKeys.has(k)) {
      seenDurKeys.add(k);
      uniqueEntries.push(e);
    }
  }

  const hasGrade1 = uniqueEntries.some((e) => e.grade === '1등급');
  const hasGrade2 = uniqueEntries.some((e) => e.grade === '2등급');
  const highestGrade = hasGrade1 ? '1등급' : hasGrade2 ? '2등급' : null;

  const overallStatus: DataFetchStatus =
    uniqueEntries.length > 0
      ? 'SUCCESS'
      : hadApiError
      ? 'API_ERROR'
      : 'NO_DATA';

  return {
    overall: {
      status: overallStatus,
      errorMessage:
        overallStatus === 'API_ERROR'
          ? '식약처 DUR OpenAPI 통신 중 오류가 발생했습니다. 네트워크 상태를 확인하십시오.'
          : undefined,
      hasTaboo: uniqueEntries.length > 0,
      highestGrade,
      entries: uniqueEntries,
      sourceUrl: durSourceUrl,
      updatedAt: latestDate
    },
    byIngredientMap
  };
}

function filterDurEntriesForProduct(
  entries: MfdsDurTabooEntry[],
  isCombination: boolean,
  productIngredients: DomesticIngredientItem[]
): MfdsDurTabooEntry[] {
  if (entries.length === 0) return [];

  // 단일제인 경우 '단일' 고시 항목만 표시
  if (!isCombination) {
    const singleOnly = entries.filter((e) => e.mixType === '단일');
    return singleOnly.length > 0 ? singleOnly : entries.slice(0, 1);
  }

  // 복합제인 경우: (1) 개별 성분의 '단일' 고시 항목 + (2) 현재 복합제 구성 성분과 일치하는 '복합' 고시 항목 표시
  const result: MfdsDurTabooEntry[] = [];
  const korNames = productIngredients.map((i) => i.koreanName);

  for (const e of entries) {
    if (e.mixType === '단일') {
      result.push(e);
    } else if (e.mixType === '복합') {
      const parts = e.ingrName.split('/').map((s) => s.trim());
      const allPartsPresent = parts.every((p) =>
        korNames.some((k) => k.includes(p) || p.includes(k))
      );
      if (allPartsPresent) {
        result.push(e);
      }
    }
  }

  return result;
}

/**
 * 상단 통합 의약품 검색 (국내 제품명 / 국내 성분명 / 영문 성분명 모두 지원)
 */
export async function searchDomesticDrugsForMaternalSafety(
  query: string
): Promise<{
  candidates: MaternalDrugSearchCandidate[];
  detectedIngredientNotice?: string;
  apiError?: string;
}> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return { candidates: VERIFIED_DOMESTIC_SEED_PRODUCTS };

  const cacheKey = cleanQuery.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return { candidates: searchCache.get(cacheKey)! };
  }

  // 1. 입력 검색어가 한글 성분명 또는 영문 성분명인지 확인
  const crosswalkMatch = findCrosswalkBySearchQuery(cleanQuery);
  let detectedIngredientNotice: string | undefined;

  if (crosswalkMatch) {
    detectedIngredientNotice = `성분명 매칭: ${crosswalkMatch.koreanBaseName} (${crosswalkMatch.inn}) 함유 국내 허가 의약품 검색 결과`;
  }

  const results: MaternalDrugSearchCandidate[] = [];
  const seenItemSeq = new Set<string>();

  // 2. 내장 검증 시드 품목 중 일치 항목 최우선 포함 (즉각 반응 및 검증 보장)
  const qLower = cleanQuery.replace(/\s+/g, '').toLowerCase();
  for (const seed of VERIFIED_DOMESTIC_SEED_PRODUCTS) {
    const seedNorm = `${seed.productName} ${seed.mainIngredientsText} ${seed.itemSeq}`
      .replace(/\s+/g, '')
      .toLowerCase();
    const cwKor = crosswalkMatch?.koreanBaseName.toLowerCase() || '';
    const cwEng = crosswalkMatch?.inn.toLowerCase() || '';

    if (
      seedNorm.includes(qLower) ||
      (cwKor && seedNorm.includes(cwKor)) ||
      (cwEng && seedNorm.includes(cwEng))
    ) {
      results.push({
        ...seed,
        matchedKeywordNote: detectedIngredientNotice
      });
      seenItemSeq.add(seed.itemSeq);
    }
  }

  // 3. 식약처 의약품 제품허가 목록 API (getDrugPrdtPrmsnInq08) 실시간 호출
  const queryParamsToTry: string[] = [];

  if (/^[0-9]{8,9}$/.test(cleanQuery)) {
    queryParamsToTry.push(`item_seq=${encodeURIComponent(cleanQuery)}`);
  } else if (crosswalkMatch) {
    // 영문 성분명 또는 한글 성분명으로 검색한 경우: 대표 제품명 및 한글 성분명이 제품명에 포함된 품목 조회
    queryParamsToTry.push(`item_name=${encodeURIComponent(crosswalkMatch.koreanBaseName)}`);
    if (crosswalkMatch.representativeProductKeyword !== crosswalkMatch.koreanBaseName) {
      queryParamsToTry.push(`item_name=${encodeURIComponent(crosswalkMatch.representativeProductKeyword)}`);
    }
  } else {
    queryParamsToTry.push(`item_name=${encodeURIComponent(cleanQuery)}`);
  }

  let apiError: string | undefined;

  for (const qParam of queryParamsToTry) {
    try {
      const url = `${MFDS_INQ_URL}?serviceKey=${encodeURIComponent(
        DATA_GO_KR_API_KEY
      )}&${qParam}&type=json&pageNo=1&numOfRows=30`;
      const res = await fetch(url);
      if (!res.ok) {
        apiError = `식약처 API 응답 오류 (HTTP ${res.status})`;
        continue;
      }
      const data = await res.json();
      const rawItems = data?.body?.items || [];
      const list = Array.isArray(rawItems) ? rawItems : [rawItems];

      for (const item of list) {
        if (!item || !item.ITEM_SEQ) continue;
        if (item.CANCEL_NAME && item.CANCEL_NAME !== '정상') continue;
        const seq = String(item.ITEM_SEQ).trim();
        if (seenItemSeq.has(seq)) continue;
        seenItemSeq.add(seq);

        const prodName = (item.ITEM_NAME || '').trim();
        const chart = (item.CHART || '').trim();
        const ingrKor = (item.ITEM_INGR_NAME || '').trim();
        const ingrCount = Number(item.ITEM_INGR_CNT || 1);
        const isComb = ingrCount > 1 || (ingrKor.includes('/') && !ingrKor.includes('밀리그램/'));

        results.push({
          itemSeq: seq,
          productName: prodName,
          manufacturer: (item.ENTP_NAME || '').trim(),
          etcOtcName: (item.INDUTY_class || item.ETC_OTC_NAME || item.SPCLTY_PBLC || '의약품').trim(),
          dosageForm: inferDosageFormText(prodName, chart),
          route: inferRouteFromProduct(prodName, chart),
          mainIngredientsText: ingrKor || '상세 조회 시 유효성분 확인',
          isCombination: isComb,
          matchedKeywordNote: detectedIngredientNotice,
          rawMfdsItem: item
        });
      }
    } catch (e: any) {
      apiError = e?.message || '식약처 의약품 검색 API 네트워크 오류';
    }
  }

  if (results.length > 0) {
    searchCache.set(cacheKey, results);
  }

  return {
    candidates: results,
    detectedIngredientNotice,
    apiError: results.length === 0 ? apiError : undefined
  };
}

/**
 * 제품 선택 시 4대 공식 데이터 소스를 통합 조회하여 단일 화면용 리포트 생성
 */
export async function buildMaternalDrugSafetyReport(
  candidate: MaternalDrugSearchCandidate
): Promise<MaternalDrugSafetyReport> {
  const itemSeq = candidate.itemSeq;
  if (reportCache.has(itemSeq)) {
    return reportCache.get(itemSeq)!;
  }

  // 1. 식약처 의약품 제품허가 상세 API (getDrugPrdtPrmsnDtlInq08) 호출
  let dtlItem: Record<string, any> | null = null;
  let mfdsFetchStatus: DataFetchStatus = 'SUCCESS';
  let mfdsErrorMsg: string | undefined;

  try {
    dtlItem = await fetchMfdsDrugRawByItemSeq(itemSeq);
    if (!dtlItem) {
      mfdsFetchStatus = 'NO_DATA';
    }
  } catch (e: any) {
    mfdsFetchStatus = 'API_ERROR';
    mfdsErrorMsg = e?.message || '식약처 허가사항 상세 API 호출 실패';
  }

  const productName = (dtlItem?.ITEM_NAME || candidate.productName).trim();
  const manufacturer = (dtlItem?.ENTP_NAME || candidate.manufacturer).trim();
  const etcOtcName = (dtlItem?.ETC_OTC_CODE || candidate.etcOtcName || '의약품').trim();
  const chartText = (dtlItem?.CHART || candidate.dosageForm || '').trim();
  const dosageForm = inferDosageFormText(productName, chartText);
  const route = inferRouteFromProduct(productName, chartText);
  const permitUpdatedAt = formatDateYmd(dtlItem?.CHANGE_DATE || dtlItem?.ITEM_PERMIT_DATE);
  const permitUrl = `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(itemSeq)}`;

  // NB_DOC_DATA(사용상의 주의사항) 원문 확보 (API 누락 시 자체 서버 프록시 nedrug 보완)
  let rawNbDoc: string | null = dtlItem?.NB_DOC_DATA || null;
  if (!rawNbDoc) {
    try {
      const nedrugDocs = await fetchNedrugDocTexts(itemSeq);
      if (nedrugDocs?.nbDocText) {
        rawNbDoc = nedrugDocs.nbDocText;
        mfdsFetchStatus = 'SUCCESS';
      }
    } catch {
      // ignore proxy fallback error
    }
  }

  // MATERIAL_NAME(원료약품 및 분량) 확보 (API 누락 시 nedrug 보완)
  let rawMaterialName: string | null = dtlItem?.MATERIAL_NAME || null;
  let nedrugIngrText: string | null = null;
  if (!rawMaterialName) {
    try {
      nedrugIngrText = await fetchNedrugIngredientsText(itemSeq, dtlItem?.MAIN_INGR_ENG);
    } catch {
      // ignore
    }
  }

  // 유효성분 파싱 및 해외 표준 성분(INN) 매칭
  const ingredients = parseMfdsActiveIngredients({
    materialName: rawMaterialName,
    mainItemIngr: dtlItem?.MAIN_ITEM_INGR || candidate.mainIngredientsText,
    mainIngrEng: dtlItem?.MAIN_INGR_ENG || '',
    rawIngredientsFallback: nedrugIngrText || candidate.mainIngredientsText,
    dosageForm,
    route
  });

  const isCombination = ingredients.length > 1 || candidate.isCombination;

  const formattedIngredientsSummary =
    ingredients.length > 0
      ? ingredients
          .map(
            (ing) =>
              `${ing.koreanName}${ing.englishName ? ` (${ing.englishName})` : ''}${
                ing.amountText ? ` ${ing.amountText}` : ''
              }`
          )
          .join(' / ')
      : candidate.mainIngredientsText;

  // ① 식약처 허가사항 임부·수유부 투여 문구 추출
  const mfdsLabel = extractMfdsPregnancyAndLactationText(
    rawNbDoc,
    itemSeq,
    permitUpdatedAt,
    mfdsFetchStatus,
    mfdsErrorMsg
  );

  // ② 식약처 DUR 임부금기 및 ⑤ 식약처 낱알식별정보 실시간 병렬 조회
  const [durResult, pillIdentification] = await Promise.all([
    fetchMfdsDurPregnantTaboo({
      itemSeq,
      productName,
      ingredients,
      isCombination
    }),
    fetchPillIdentificationInfo(itemSeq, productName)
  ]);

  // ③ 호주 TGA & ④ NIH LactMed 성분별 개별 매칭 (복합제는 성분별 각각 분리 평가)
  const ingredientEvaluations: IngredientSafetyEvaluation[] = [];

  for (const ingr of ingredients) {
    const durForIngr = durResult.byIngredientMap.get(ingr.koreanName) || {
      status: durResult.overall.status,
      entries: []
    };

    // 호주 TGA 매칭: 불확실한 성분 매칭(UNCERTAIN / UNMATCHED)이면 등급을 표시하지 않음!
    let tgaStatus: IngredientSafetyEvaluation['tgaStatus'] = 'NO_DATA';
    let tgaInfo = null;

    if (ingr.matchConfidence === 'UNCERTAIN') {
      tgaStatus = 'UNCERTAIN_MATCH_HIDDEN';
      tgaInfo = null;
    } else if (ingr.matchedInn) {
      tgaInfo = lookupTgaCategoryByInn(ingr.matchedInn);
      tgaStatus = tgaInfo ? 'MATCHED' : 'NO_DATA';
    }

    // NIH LactMed 매칭 (1차 내장 동기 DB -> 2차 전체 1,971개 아카이브 비동기 DB)
    let lactmedStatus: IngredientSafetyEvaluation['lactmedStatus'] = 'NO_DATA';
    let lactmedInfo = ingr.matchedInn ? lookupLactMedByInn(ingr.matchedInn) : null;
    if (!lactmedInfo && ingr.matchedInn) {
      lactmedInfo = await lookupLactMedAsync(ingr.matchedInn);
    }

    if (lactmedInfo) {
      lactmedStatus = 'MATCHED';
    } else if (ingr.matchedInn && ingr.matchConfidence !== 'UNCERTAIN') {
      // 로컬 DB에 없는 성분은 NCBI Entrez E-utilities API로 실제 NBK 챕터 존재 여부 확인
      const liveCheck = await fetchLactMedChapterLinkLive(ingr.matchedInn);
      if (liveCheck.exists && liveCheck.nbkId && liveCheck.sourceUrl) {
        lactmedStatus = 'LIVE_LINK_ONLY';
        lactmedInfo = {
          matchedInn: ingr.matchedInn,
          drugTitle: liveCheck.title || ingr.matchedInn,
          pmcid: liveCheck.nbkId,
          nbkId: liveCheck.nbkId,
          summaryKorean:
            'NIH LactMed에 해당 성분의 공식 수유부 모노그래프가 존재합니다. 원문 링크를 통해 Summary of Use During Lactation을 직접 확인하십시오.',
          summaryOriginalEnglish: 'Please open the official NIH LactMed link to view the full monograph.',
          infantAdverseEffectsKorean: '원문 링크에서 영아 이상반응 보고 내역을 확인하십시오.',
          infantAdverseEffectsOriginal: 'See official NIH LactMed monograph.',
          ridOriginalText: null,
          ridKoreanSummary: null,
          drugLevelsOriginal: null,
          sourceUrl: liveCheck.sourceUrl,
          lastRevisedDate: '실시간 링크 확인'
        };
      }
    }

    ingredientEvaluations.push({
      ingredient: ingr,
      durEntries: durForIngr.entries,
      durStatus: durForIngr.status,
      tgaStatus,
      tgaInfo,
      lactmedStatus,
      lactmedInfo
    });
  }

  const report: MaternalDrugSafetyReport = {
    itemSeq,
    productName,
    manufacturer,
    etcOtcName,
    dosageForm,
    chartText,
    route,
    isCombination,
    ingredients,
    rawIngredientsText: formattedIngredientsSummary,
    permitUrl,
    permitUpdatedAt,
    mfdsLabel,
    mfdsDur: durResult.overall,
    ingredientEvaluations,
    pillIdentification
  };

  reportCache.set(itemSeq, report);
  return report;
}
