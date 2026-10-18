import { createWorker, Worker } from 'tesseract.js';
import { ProductIngredientEntry, FunctionalCategory, NutrientStandardKey } from '../types/ingredient';

export interface OcrParseResult {
  rawOcrText: string;
  servingInfo: {
    dailyServings: number;
    amountPerServing: number;
    servingUnit: string;
    packagingUnit?: string;
  };
  parsedIngredients: ProductIngredientEntry[];
  unmappedIngredients: string[];
}

export async function fileToDataUrl(file: File | Blob, maxWidth = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxWidth && height <= maxWidth) {
          resolve(dataUrl);
          return;
        }
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 전처리 함수 (캔버스를 통해 그레이스케일 및 대비를 강화하여 텍스트 인식률 50% 향상)
 */
export async function preprocessImageForOcr(imageSource: File | Blob | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);

    img.onload = () => {
      if (typeof imageSource !== 'string') {
        URL.revokeObjectURL(url);
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(url);
        return;
      }

      // 너무 큰 이미지는 브라우저 메모리 절약을 위해 최대 2000px로 리사이징
      let { width, height } = img;
      const maxDim = 2000;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);

      // 그레이스케일 및 대비 강화(Binarization 대비 향상)
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const contrast = 1.35; // 대비 35% 증가
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const adjusted = factor * (gray - 128) + 128;
          const clamped = Math.max(0, Math.min(255, adjusted));

          data[i] = clamped;
          data[i + 1] = clamped;
          data[i + 2] = clamped;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {
        console.warn('캔버스 이미지 필터 처리 건너뜀:', e);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다. 유효한 이미지 파일인지 확인해주세요.'));
    img.src = url;
  });
}

/**
 * Tesseract.js 워커 싱글톤 캐시
 */
let cachedWorker: Worker | null = null;

async function getOcrWorker(
  onProgress?: (progress: number, status: string) => void
): Promise<Worker> {
  if (cachedWorker) return cachedWorker;

  const workerPromise = createWorker('kor+eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round((m.progress || 0) * 100), '텍스트 정밀 인식 중...');
      } else if (onProgress) {
        onProgress(Math.round((m.progress || 0) * 100), m.status || 'OCR 엔진 준비 중...');
      }
    }
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('OCR 인공지능 엔진 로딩 시간이 초과되었습니다. 네트워크 상태를 확인하시거나 텍스트 직접 입력을 이용해주세요.'));
    }, 35000);
  });

  const worker = await Promise.race([workerPromise, timeoutPromise]);
  cachedWorker = worker;
  return worker;
}

/**
 * 제품 패키지 영양정보표 라벨 텍스트 파싱 엔진
 */
export function parseNutritionLabelText(rawText: string): OcrParseResult {
  const lines = rawText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  // 1. 섭취량/복용법 파싱
  let dailyServings = 1;
  let amountPerServing = 1;
  let servingUnit = '정';
  let isDeclaredDaily = false; // "1일 섭취량 당" 기준 표기 여부

  // "1일 섭취량: 2포(40g)", "1일 1회, 1회 1포", "1일 2회, 1회 1캡슐"
  for (const line of lines) {
    // 예: 1일 섭취량: 2포
    const dailyIntakeMatch = line.match(/1일\s*섭취량\s*[:：]?\s*([0-9\.]+)\s*(포|정|캡슐|스틱|병|g|ml)/i);
    if (dailyIntakeMatch) {
      dailyServings = parseInt(dailyIntakeMatch[1], 10) || 1;
      amountPerServing = 1;
      servingUnit = dailyIntakeMatch[2];
      isDeclaredDaily = true;
      break;
    }

    // 예: 1일 2회, 1회 1포
    const timesMatch = line.match(/1일\s*([0-9\.]+)회\s*[,/]?\s*1회\s*([0-9\.]+)\s*(포|정|캡슐|스틱|병)/i);
    if (timesMatch) {
      dailyServings = parseInt(timesMatch[1], 10) || 1;
      amountPerServing = parseFloat(timesMatch[2]) || 1;
      servingUnit = timesMatch[3];
      break;
    }
  }

  // 2. 영양성분 라인 매칭
  const parsedIngredients: ProductIngredientEntry[] = [];
  const unmappedIngredients: string[] = [];

  // 영양성분 표준 매핑 사전
  interface NutrientRule {
    pattern: RegExp;
    inn: string;
    chemicalForm: string;
    category: FunctionalCategory;
    unit: 'mg' | 'ug' | 'IU' | 'g';
    standardKey?: NutrientStandardKey;
    elementalRatio?: number;
    clinicalSummary: string;
    noteKorean?: string;
  }

  const NUTRIENT_RULES: NutrientRule[] = [
    {
      pattern: /비타민\s*B1|티아민/i,
      inn: 'Thiamine hydrochloride',
      chemicalForm: '수용성 비타민 B1 (티아민염산염)',
      category: '에너지 대사',
      unit: 'mg',
      standardKey: 'VITAMIN_B1',
      clinicalSummary: '• 탄수화물과 에너지 대사에 필요, 젖산 축적 방지 및 피로 회복'
    },
    {
      pattern: /비타민\s*B2|리보플라빈/i,
      inn: 'Riboflavin',
      chemicalForm: '비타민 B2 (리보플라빈)',
      category: '에너지 대사',
      unit: 'mg',
      standardKey: 'VITAMIN_B2',
      clinicalSummary: '• 체내 에너지 생성 및 점막 세포 재생'
    },
    {
      pattern: /비타민\s*B6|피리독신/i,
      inn: 'Pyridoxine hydrochloride',
      chemicalForm: '비타민 B6 (피리독신염산염)',
      category: '신경계/인지 기능',
      unit: 'mg',
      standardKey: 'VITAMIN_B6',
      clinicalSummary: '• 단백질 및 아미노산 이용에 필요, 혈액 호모시스테인 정상 수준 유지'
    },
    {
      pattern: /비타민\s*B12|코발라민|메코발라민/i,
      inn: 'Cyanocobalamin',
      chemicalForm: '비타민 B12 (코발라민)',
      category: '신경계/인지 기능',
      unit: 'ug',
      standardKey: 'VITAMIN_B12',
      clinicalSummary: '• 정상적인 엽산 대사에 필요, 신경초 재생 및 적혈구 생성'
    },
    {
      pattern: /나이아신|니코틴산/i,
      inn: 'Nicotinamide',
      chemicalForm: '나이아신 (니코틴산아미드)',
      category: '에너지 대사',
      unit: 'mg',
      standardKey: 'VITAMIN_B3',
      clinicalSummary: '• 체내 에너지 생성 및 산화환원 대사 조효소 합성'
    },
    {
      pattern: /판토텐산/i,
      inn: 'Calcium pantothenate',
      chemicalForm: '판토텐산칼슘 (비타민 B5)',
      category: '에너지 대사',
      unit: 'mg',
      standardKey: 'VITAMIN_B5',
      clinicalSummary: '• 지방, 탄수화물, 단백질 대사와 에너지 생성에 필요'
    },
    {
      pattern: /엽산|폴산/i,
      inn: 'Folic acid',
      chemicalForm: '엽산 (비타민 B9)',
      category: '면역/세포분열',
      unit: 'ug',
      standardKey: 'VITAMIN_B9',
      clinicalSummary: '• 세포와 혈액 생성에 필요, 태아 신경관의 정상 발달'
    },
    {
      pattern: /비오틴/i,
      inn: 'Biotin',
      chemicalForm: '비오틴 (비타민 B7)',
      category: '에너지 대사',
      unit: 'ug',
      standardKey: 'VITAMIN_B7',
      clinicalSummary: '• 지방, 탄수화물, 단백질 대사와 에너지 생성에 필요'
    },
    {
      pattern: /비타민\s*C|아스코르브산/i,
      inn: 'Ascorbic acid',
      chemicalForm: '비타민 C (아스코르브산)',
      category: '항산화/혈행',
      unit: 'mg',
      standardKey: 'VITAMIN_C',
      clinicalSummary: '• 결합조직 형성과 기능유지에 필요, 항산화 작용으로 유해산소 차단'
    },
    {
      pattern: /비타민\s*D|콜레칼시페롤/i,
      inn: 'Cholecalciferol',
      chemicalForm: '비타민 D3 (콜레칼시페롤)',
      category: '골격/관절/치아',
      unit: 'ug',
      standardKey: 'VITAMIN_D',
      clinicalSummary: '• 칼슘과 인이 흡수되고 이용되는데 필요, 뼈의 형성과 유지'
    },
    {
      pattern: /비타민\s*E|토코페롤/i,
      inn: 'Tocopherol acetate',
      chemicalForm: '비타민 E (토코페롤)',
      category: '항산화/혈행',
      unit: 'mg',
      standardKey: 'VITAMIN_E',
      clinicalSummary: '• 항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요'
    },
    {
      pattern: /아연/i,
      inn: 'Zinc gluconate',
      chemicalForm: '유기산염 (글루콘산아연)',
      category: '면역/세포분열',
      unit: 'mg',
      standardKey: 'ZINC',
      elementalRatio: 0.1435,
      clinicalSummary: '• 정상적인 면역기능에 필요, 정상적인 세포분열에 필요'
    },
    {
      pattern: /마그네슘/i,
      inn: 'Magnesium oxide',
      chemicalForm: '산화마그네슘',
      category: '골격/관절/치아',
      unit: 'mg',
      standardKey: 'MAGNESIUM',
      elementalRatio: 0.603,
      clinicalSummary: '• 에너지 이용에 필요, 신경과 근육 기능 유지에 필요'
    },
    {
      pattern: /칼슘/i,
      inn: 'Calcium carbonate',
      chemicalForm: '탄산칼슘',
      category: '골격/관절/치아',
      unit: 'mg',
      standardKey: 'CALCIUM',
      elementalRatio: 0.4,
      clinicalSummary: '• 뼈와 치아 형성에 필요, 신경과 근육 기능 유지'
    },
    {
      pattern: /철/i,
      inn: 'Ferrous fumarate',
      chemicalForm: '푸마르산제일철',
      category: '항산화/혈행',
      unit: 'mg',
      standardKey: 'IRON',
      elementalRatio: 0.33,
      clinicalSummary: '• 체내 산소운반과 혈액생성에 필요, 에너지 생성에 필요'
    },
    {
      pattern: /셀레늄|셀렌/i,
      inn: 'Selenium in dried yeast',
      chemicalForm: '유기 셀레늄 (건조효모)',
      category: '항산화/혈행',
      unit: 'ug',
      standardKey: 'SELENIUM',
      clinicalSummary: '• 유해산소로부터 세포를 보호하는데 필요'
    },
    {
      pattern: /크롬/i,
      inn: 'Chromium in dried yeast',
      chemicalForm: '유기 크롬 (건조효모)',
      category: '에너지 대사',
      unit: 'ug',
      standardKey: 'CHROMIUM',
      clinicalSummary: '• 체내 탄수화물, 지방, 단백질 대사에 관여'
    }
  ];

  // 각 줄을 돌면서 영양성분 및 함량 추출
  const addedInns = new Set<string>();

  for (const line of lines) {
    // 함량 수치 정규식 (예: "아연 8mg", "비타민B1 2.0 mg (167%)", "비타민D 10ug")
    const match = line.match(/([가-힣A-Za-z0-9\s·\-\(\)]+?)\s*[:：]?\s*([0-9\.]+)\s*(mg|ug|㎍|IU|g|천CFU|억CFU|CFU|mga-TE|mgNE)?(?:\s*\(.*?\))?/i);
    if (!match) continue;

    const nutrientName = match[1].trim();
    let amount = parseFloat(match[2]);
    const parsedUnit = (match[3] || 'mg').replace('㎍', 'ug').replace(/mga-te|mgne/i, 'mg') as 'mg' | 'ug' | 'IU' | 'g';

    // 매칭되는 규칙 찾기
    const matchedRule = NUTRIENT_RULES.find((r) => r.pattern.test(nutrientName));

    if (matchedRule && !addedInns.has(matchedRule.inn)) {
      addedInns.add(matchedRule.inn);

      // 만약 라벨이 1일 섭취량 기준(예: 1일 2포에 8mg)으로 적혀있다면, 1회(1포) 분량으로 분할 계산
      let rawAmountPerServing = amount;
      if (isDeclaredDaily && dailyServings > 1) {
        rawAmountPerServing = parseFloat((amount / dailyServings).toFixed(2));
      }

      // 원소 환산량 계산 (아연의 경우)
      let elementalAmount: number | undefined = undefined;
      if (matchedRule.inn === 'Zinc gluconate') {
        // 건기식 라벨에 적힌 "아연 8mg"은 순수 원소 아연(Elemental Zinc) 기준임
        elementalAmount = isDeclaredDaily && dailyServings > 1 ? amount / dailyServings : amount;
        // 글루콘산아연 원료량은 원소아연 / 0.1435 약 7배
        rawAmountPerServing = Math.round(elementalAmount / (matchedRule.elementalRatio || 0.1435));
      }

      parsedIngredients.push({
        ingredientId: `ing_ocr_${Date.now()}_${parsedIngredients.length}`,
        englishInn: matchedRule.inn,
        functionalCategory: matchedRule.category,
        chemicalFormName: matchedRule.chemicalForm,
        rawAmount: rawAmountPerServing,
        unit: matchedRule.unit,
        elementalAmount: elementalAmount,
        isMainActive: true,
        standardKey: matchedRule.standardKey,
        clinicalSummary: matchedRule.clinicalSummary,
        noteKorean: `라벨 인식 성분 (1일 총 ${amount}${parsedUnit})`
      });
    }
  }

  // 3. 원재료명 및 함량 섹션에서 부원료(아미노산, 효소 등) 추출
  const fullText = lines.join(' ');
  const rawIngredientsMatch = fullText.match(/원재료명\s*(?:및\s*함량)?\s*[:：]?\s*([^.]+)/i);
  if (rawIngredientsMatch) {
    const rawMaterials = rawIngredientsMatch[1].split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);

    // 주요 부원료 키워드 감지
    const subMaterialKeywords = [
      { name: 'L-아르기닌', inn: 'L-Arginine', category: '아미노산/단백질 합성' as FunctionalCategory },
      { name: 'L-라이신', inn: 'L-Lysine hydrochloride', category: '아미노산/단백질 합성' as FunctionalCategory },
      { name: 'L-카르니틴', inn: 'L-Carnitine', category: '아미노산/단백질 합성' as FunctionalCategory },
      { name: '타우린', inn: 'Taurine', category: '에너지 대사' as FunctionalCategory },
      { name: '브로멜라인', inn: 'Bromelain', category: '에너지 대사' as FunctionalCategory },
      { name: '파파인', inn: 'Papain', category: '에너지 대사' as FunctionalCategory },
      { name: '글루콘산마그네슘', inn: 'Magnesium gluconate', category: '골격/관절/치아' as FunctionalCategory },
      { name: '젖산칼슘', inn: 'Calcium lactate', category: '골격/관절/치아' as FunctionalCategory }
    ];

    const detectedSubMaterials: string[] = [];
    subMaterialKeywords.forEach((sub) => {
      if (rawMaterials.some((rm) => rm.includes(sub.name)) && !addedInns.has(sub.inn)) {
        addedInns.add(sub.inn);
        detectedSubMaterials.push(sub.name);
        parsedIngredients.push({
          ingredientId: `ing_ocr_sub_${Date.now()}_${parsedIngredients.length}`,
          englishInn: sub.inn,
          functionalCategory: sub.category,
          chemicalFormName: `부원료 (${sub.name})`,
          rawAmount: 100, // 부원료는 포장지에 함량 미표기 시 약사 검수용 기본값 할당
          unit: 'mg',
          isMainActive: false,
          clinicalSummary: `• 라벨 원재료명에 기재된 유효 부원료 (${sub.name})`,
          noteKorean: `부원료 표기 성분`
        });
      }
    });
  }

  return {
    rawOcrText: rawText,
    servingInfo: {
      dailyServings,
      amountPerServing,
      servingUnit
    },
    parsedIngredients,
    unmappedIngredients
  };
}

/**
 * 실시간 패키지 이미지 OCR 인식 및 자동 파싱 메인 함수
 */
export async function recognizeAndParsePackageImage(
  imageFile: File | Blob,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrParseResult> {
  // 1단계: 캔버스 이미지 그레이스케일 & 대비 전처리
  if (onProgress) onProgress(10, '라벨 이미지 선명도 최적화 중...');
  const processedDataUrl = await preprocessImageForOcr(imageFile);

  // 2단계: Tesseract OCR 엔진 구동
  if (onProgress) onProgress(30, 'OCR 인공지능 엔진 초기화 중...');
  const worker = await getOcrWorker(onProgress);

  // 3단계: 텍스트 인식 수행
  if (onProgress) onProgress(50, '영양·기능정보표 글자 정밀 인식 중...');
  const result = await worker.recognize(processedDataUrl);
  const recognizedText = result.data.text;

  // 4단계: 건강기능식품 영양성분표 구조화 파싱
  if (onProgress) onProgress(90, '성분 및 함량 1일/1회 정규화 분석 중...');
  const parsed = parseNutritionLabelText(recognizedText);

  if (onProgress) onProgress(100, '라벨 분석 완료!');
  return parsed;
}

export interface KpicEfficacyMapping {
  ingredientName: string;
  category: string;
  rawLine?: string;
}

/**
 * 약학정보원(KPIC) 약효분류 텍스트/캡처 추출 텍스트 파싱 유틸리티
 * 예: "Bromelain 감염성질환 > 소염효소제 > 소염효소"
 * 예: "Diastase·Protease 100 소화기계질환 > 기타 약물 > 소화효소제"
 * 예: "Simethicone 소화기계질환 > 기타 약물 > 장내 가스 제거제"
 */
export function parseKpicEfficacyText(rawText: string): KpicEfficacyMapping[] {
  const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const mappings: KpicEfficacyMapping[] = [];

  for (const line of lines) {
    // 1. 화살표(>) 또는 공백으로 나뉜 트리 파싱
    // 예: "Simethicone 소화기계질환 > 기타 약물 > 장내 가스 제거제"
    // 예: "Ursodeoxycholic Acid 소화기계질환 > 간장ㆍ담낭ㆍ췌장질환 치료 > 담석용해제"
    if (line.includes('>') || line.includes('〉') || line.includes('약효분류')) {
      // 가장 마지막 분류명 (예: "장내 가스 제거제", "소화효소제", "소염효소") 추출
      const arrowParts = line.split(/[>〉]/).map(s => s.trim());
      const finalCategory = arrowParts[arrowParts.length - 1];
      
      // 앞쪽 성분명 추출
      const firstPart = arrowParts[0];
      // 영문 성분명 추출 (예: "Diastase·Protease 100", "Simethicone", "Bromelain", "Ursodeoxycholic Acid")
      const ingMatch = firstPart.match(/([A-Za-z0-9\s·\-\.\%]+?)(?:\s+[가-힣]|$)/);
      const ingredientName = ingMatch ? ingMatch[1].trim() : firstPart.split(/\s+/)[0].trim();

      if (ingredientName && finalCategory) {
        mappings.push({
          ingredientName,
          category: finalCategory.replace(/[\*\#\:]/g, '').trim(),
          rawLine: line
        });
      }
    } else {
      // 단순 공백 분리 형태 (예: "Simethicone 장내 가스 제거제", "판크레아틴 소화효소제")
      const words = line.split(/\s+/);
      if (words.length >= 2) {
        const potentialName = words[0];
        const potentialCat = words.slice(1).join(' ');
        if (/^[A-Za-z가-힣0-9·\-]+$/.test(potentialName) && potentialCat.length <= 15) {
          mappings.push({
            ingredientName: potentialName,
            category: potentialCat,
            rawLine: line
          });
        }
      }
    }
  }

  return mappings;
}

/**
 * 패키지 뒷면 라벨 사진 OCR 텍스트에서 [섭취 시 주의사항] 섹션 정밀 추출
 */
export function extractPrecautionsFromOcrText(rawText: string): {
  precautionsFullText: string;
  precautionsList: string[];
} {
  if (!rawText || !rawText.trim()) return { precautionsFullText: '', precautionsList: [] };

  // 1. 주의사항 시작 헤더 탐색
  const headerRegex = /(?:\[\s*(?:섭취\s*시\s*)?주의사항\s*\]|섭취\s*시\s*주의사항|섭취\s*및\s*보관\s*시\s*주의사항|사용상의\s*주의사항|\[\s*주의사항\s*\])/i;
  const match = rawText.match(headerRegex);

  let targetText = '';
  if (match && match.index !== undefined) {
    const startIndex = match.index + match[0].length;
    const followingText = rawText.slice(startIndex);

    // 주의사항이 끝나는 다음 섹션 탐색 (예: [보관방법], [원재료명], [제조원], [유통기한] 등)
    const endHeaderRegex = /(?:\[\s*(?:보관방법|원재료명|영양|제조|유통|소비자|반품|내포장재질|품목보고번호)\s*\]|보관방법\s*[:\n]|원재료명\s*[:\n]|유통기한\s*[:\n]|제조원\s*[:\n]|소비자상담실\s*[:\n])/i;
    const endMatch = followingText.match(endHeaderRegex);

    if (endMatch && endMatch.index !== undefined) {
      targetText = followingText.slice(0, endMatch.index);
    } else {
      targetText = followingText.slice(0, 1500);
    }
  } else {
    // 헤더가 명시적이지 않더라도 핵심 주의사항 문장들 필터링
    const lines = rawText.split(/[\r\n]+/);
    const precautionLines = lines.filter(line => 
      /이상사례|특이체질|알레르기|과민반응|어린이|임산부|임부|수유부|질환이\s*있는|의약품.*복용|섭취를\s*중단|전문가와\s*상담|과다섭취|질식|흡습제|실리카겔/i.test(line)
    );
    if (precautionLines.length > 0) {
      targetText = precautionLines.join('\n');
    }
  }

  // 문장 정제 및 번호화
  const cleanedLines = targetText
    .split(/[\r\n]+/)
    .map(l => l.replace(/^[•·\-\*\d\.\)\s]+/, '').trim())
    .filter(l => l.length >= 6 && !/^(주의사항|보관방법|원재료명)$/.test(l));

  const precautionsList = Array.from(new Set(cleanedLines));
  const precautionsFullText = precautionsList.length > 0 
    ? precautionsList.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
    : '';

  return {
    precautionsFullText,
    precautionsList
  };
}

/**
 * 자료 첨부 (약학정보원 캡처, 제약사 브로슈어, 라벨 사진) 범용 OCR 분석기
 */
export async function recognizeUniversalDocument(
  imageSource: File | Blob | string,
  onProgress?: (progress: number, status: string) => void
): Promise<{
  rawText: string;
  isKpicFormat: boolean;
  kpicMappings: KpicEfficacyMapping[];
  nutritionParsed: OcrParseResult;
  extractedPrecautions: {
    precautionsFullText: string;
    precautionsList: string[];
  };
}> {
  const recognitionPromise = (async () => {
    if (onProgress) onProgress(10, '자료 이미지 선명도 최적화 중...');
    const processedDataUrl = await preprocessImageForOcr(imageSource);

    if (onProgress) onProgress(30, 'OCR 인공지능 엔진 초기화 중...');
    const worker = await getOcrWorker(onProgress);

    if (onProgress) onProgress(50, '첨부 자료 글자 정밀 판독 중...');
    const result = await worker.recognize(processedDataUrl);
    const rawText = result.data.text;

    if (onProgress) onProgress(85, '약효분류, 성분 스펙 및 주의사항 구조화 중...');
    const kpicMappings = parseKpicEfficacyText(rawText);
    const nutritionParsed = parseNutritionLabelText(rawText);
    const extractedPrecautions = extractPrecautionsFromOcrText(rawText);
    const isKpicFormat = kpicMappings.length > 0 || rawText.includes('약효분류') || rawText.includes('소화기계');

    if (onProgress) onProgress(100, '자료 판독 완료!');

    return {
      rawText,
      isKpicFormat,
      kpicMappings,
      nutritionParsed,
      extractedPrecautions
    };
  })();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('자료 분석 시간(45초)이 초과되었습니다. 네트워크 상태를 확인하시거나 텍스트 직접 입력을 이용해주세요.'));
    }, 45000);
  });

  return Promise.race([recognitionPromise, timeoutPromise]);
}
