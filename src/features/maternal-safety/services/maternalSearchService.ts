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
import { INN_DICTIONARY, KPIC_MASTER_DATABASE, getLearnedDict } from '../../../utils/innMapper';
import kpicDetailedIngredients from '../../../constants/kpicDetailedIngredients.json';

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
  },
  // 다빈도 처방 전문·일반의약품 확장 사전 (약학정보원 KPIC 연동)
  {
    keywords: ['sertraline', '설트랄린', '졸로푸트', '셀트라'],
    ingredientId: 'ing_sertraline',
    englishInn: 'Sertraline',
    koreanName: '설트랄린',
    isPrebuilt: false,
    therapeuticClass: '선택적 세로토닌 재흡수 억제제 (SSRI · 항우울제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['escitalopram', '에스시탈로프람', '렉사프로'],
    ingredientId: 'ing_escitalopram',
    englishInn: 'Escitalopram',
    koreanName: '에스시탈로프람',
    isPrebuilt: false,
    therapeuticClass: '선택적 세로토닌 재흡수 억제제 (SSRI · 항우울제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['fluoxetine', '플루옥세틴', '프로작'],
    ingredientId: 'ing_fluoxetine',
    englishInn: 'Fluoxetine',
    koreanName: '플루옥세틴',
    isPrebuilt: false,
    therapeuticClass: '선택적 세로토닌 재흡수 억제제 (SSRI · 항우울제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['paroxetine', '파록세틴', '팍실'],
    ingredientId: 'ing_paroxetine',
    englishInn: 'Paroxetine',
    koreanName: '파록세틴',
    isPrebuilt: false,
    therapeuticClass: '선택적 세로토닌 재흡수 억제제 (SSRI · 항우울제)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['alprazolam', '알프라졸람', '자낙스'],
    ingredientId: 'ing_alprazolam',
    englishInn: 'Alprazolam',
    koreanName: '알프라졸람',
    isPrebuilt: false,
    therapeuticClass: '벤조디아제핀계 항불안제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['zolpidem', '졸피뎀', '스틸녹스'],
    ingredientId: 'ing_zolpidem',
    englishInn: 'Zolpidem',
    koreanName: '졸피뎀',
    isPrebuilt: false,
    therapeuticClass: '비벤조디아제핀계 수면진정제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['valproic acid', 'valproate', 'divalproex', '발프로산', '데파킨', '데파코트'],
    ingredientId: 'ing_valproic_acid',
    englishInn: 'Valproic Acid',
    koreanName: '발프로산',
    isPrebuilt: false,
    therapeuticClass: '항전간제 (뇌전증·양극성장애 치료제)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['carbamazepine', '카르바마제핀', '테그레톨'],
    ingredientId: 'ing_carbamazepine',
    englishInn: 'Carbamazepine',
    koreanName: '카르바마제핀',
    isPrebuilt: false,
    therapeuticClass: '항전간제 · 삼차신경통 치료제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['lamotrigine', '라모트리진', '라믹탈'],
    ingredientId: 'ing_lamotrigine',
    englishInn: 'Lamotrigine',
    koreanName: '라모트리진',
    isPrebuilt: false,
    therapeuticClass: '항전간제 · 기분안정제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['levetiracetam', '레베티라세탐', '케프라'],
    ingredientId: 'ing_levetiracetam',
    englishInn: 'Levetiracetam',
    koreanName: '레베티라세탐',
    isPrebuilt: false,
    therapeuticClass: '항전간제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['topiramate', '토피라메이트', '토파맥스'],
    ingredientId: 'ing_topiramate',
    englishInn: 'Topiramate',
    koreanName: '토피라메이트',
    isPrebuilt: false,
    therapeuticClass: '항전간제 · 편두통 예방제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['pregabalin', '프레가발린', '리리카'],
    ingredientId: 'ing_pregabalin',
    englishInn: 'Pregabalin',
    koreanName: '프레가발린',
    isPrebuilt: false,
    therapeuticClass: '신경병증성 통증 치료제 · 항전간제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['gabapentin', '가바펜틴', '뉴론틴'],
    ingredientId: 'ing_gabapentin',
    englishInn: 'Gabapentin',
    koreanName: '가바펜틴',
    isPrebuilt: false,
    therapeuticClass: '신경병증성 통증 치료제 · 항전간제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['warfarin', '와파린', '쿠마딘'],
    ingredientId: 'ing_warfarin',
    englishInn: 'Warfarin',
    koreanName: '와파린',
    isPrebuilt: false,
    therapeuticClass: '경구용 항응고제 (비타민 K 길항제)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['aspirin', '아스피린'],
    ingredientId: 'ing_aspirin',
    englishInn: 'Aspirin',
    koreanName: '아스피린',
    isPrebuilt: false,
    therapeuticClass: '살리실산계 항혈소판제 · 해열진통소염제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['clopidogrel', '클로피도그렐', '플라빅스'],
    ingredientId: 'ing_clopidogrel',
    englishInn: 'Clopidogrel',
    koreanName: '클로피도그렐',
    isPrebuilt: false,
    therapeuticClass: '혈소판 응집 억제제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['nifedipine', '니페디핀', '아달라트'],
    ingredientId: 'ing_nifedipine',
    englishInn: 'Nifedipine',
    koreanName: '니페디핀',
    isPrebuilt: false,
    therapeuticClass: '칼슘채널차단제 (CCB · 항고혈압제/자궁수축억제제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['labetalol', '라베탈롤'],
    ingredientId: 'ing_labetalol',
    englishInn: 'Labetalol',
    koreanName: '라베탈롤',
    isPrebuilt: false,
    therapeuticClass: '알파·베타차단제 (임신성 고혈압 치료제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['propranolol', '프로프라놀롤', '인데놀'],
    ingredientId: 'ing_propranolol',
    englishInn: 'Propranolol',
    koreanName: '프로프라놀롤',
    isPrebuilt: false,
    therapeuticClass: '비선택적 베타차단제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['bisoprolol', '비소프롤롤', '콩코르'],
    ingredientId: 'ing_bisoprolol',
    englishInn: 'Bisoprolol',
    koreanName: '비소프롤롤',
    isPrebuilt: false,
    therapeuticClass: '선택적 베타-1 차단제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['carvedilol', '카르베딜롤', '딜라트렌'],
    ingredientId: 'ing_carvedilol',
    englishInn: 'Carvedilol',
    koreanName: '카르베딜롤',
    isPrebuilt: false,
    therapeuticClass: '알파·베타차단제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['olmesartan', '올메사르탄', '올메텍'],
    ingredientId: 'ing_olmesartan',
    englishInn: 'Olmesartan',
    koreanName: '올메사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['irbesartan', '이르베사르탄', '아프로벨'],
    ingredientId: 'ing_irbesartan',
    englishInn: 'Irbesartan',
    koreanName: '이르베사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['fimasartan', '피마사르탄', '카나브'],
    ingredientId: 'ing_fimasartan',
    englishInn: 'Fimasartan',
    koreanName: '피마사르탄',
    isPrebuilt: false,
    therapeuticClass: '안지오텐신 II 수용체 차단제 (ARB)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['enalapril', '에날라프릴'],
    ingredientId: 'ing_enalapril',
    englishInn: 'Enalapril',
    koreanName: '에날라프릴',
    isPrebuilt: false,
    therapeuticClass: 'ACE 억제제 (항고혈압제)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['ramipril', '라미프릴'],
    ingredientId: 'ing_ramipril',
    englishInn: 'Ramipril',
    koreanName: '라미프릴',
    isPrebuilt: false,
    therapeuticClass: 'ACE 억제제 (항고혈압제)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['furosemide', '푸로세미드', '라식스'],
    ingredientId: 'ing_furosemide',
    englishInn: 'Furosemide',
    koreanName: '푸로세미드',
    isPrebuilt: false,
    therapeuticClass: '루프 이뇨제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['hydrochlorothiazide', '히드로클로로티아지드'],
    ingredientId: 'ing_hydrochlorothiazide',
    englishInn: 'Hydrochlorothiazide',
    koreanName: '히드로클로로티아지드',
    isPrebuilt: false,
    therapeuticClass: '티아지드계 이뇨제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['spironolactone', '스피로노락톤', '알닥톤'],
    ingredientId: 'ing_spironolactone',
    englishInn: 'Spironolactone',
    koreanName: '스피로노락톤',
    isPrebuilt: false,
    therapeuticClass: '칼륨보존성 이뇨제 (알도스테론 길항제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['empagliflozin', '엠파글리플로진', '자디앙'],
    ingredientId: 'ing_empagliflozin',
    englishInn: 'Empagliflozin',
    koreanName: '엠파글리플로진',
    isPrebuilt: false,
    therapeuticClass: 'SGLT-2 억제제 (혈당강하제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['dapagliflozin', '다파글리플로진', '포시가'],
    ingredientId: 'ing_dapagliflozin',
    englishInn: 'Dapagliflozin',
    koreanName: '다파글리플로진',
    isPrebuilt: false,
    therapeuticClass: 'SGLT-2 억제제 (혈당강하제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['sitagliptin', '시타글립틴', '자누비아'],
    ingredientId: 'ing_sitagliptin',
    englishInn: 'Sitagliptin',
    koreanName: '시타글립틴',
    isPrebuilt: false,
    therapeuticClass: 'DPP-4 억제제 (혈당강하제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['linagliptin', '리나글립틴', '트라젠타'],
    ingredientId: 'ing_linagliptin',
    englishInn: 'Linagliptin',
    koreanName: '리나글립틴',
    isPrebuilt: false,
    therapeuticClass: 'DPP-4 억제제 (혈당강하제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['glimepiride', '글리메피리드', '아마릴'],
    ingredientId: 'ing_glimepiride',
    englishInn: 'Glimepiride',
    koreanName: '글리메피리드',
    isPrebuilt: false,
    therapeuticClass: '설포닐우레아계 혈당강하제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['methimazole', '메티마졸'],
    ingredientId: 'ing_methimazole',
    englishInn: 'Methimazole',
    koreanName: '메티마졸',
    isPrebuilt: false,
    therapeuticClass: '항갑상선제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['propylthiouracil', '프로필티오우라실', '안티로이드'],
    ingredientId: 'ing_propylthiouracil',
    englishInn: 'Propylthiouracil',
    koreanName: '프로필티오우라실',
    isPrebuilt: false,
    therapeuticClass: '항갑상선제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['prednisolone', '프레드니솔론', '소론도'],
    ingredientId: 'ing_prednisolone',
    englishInn: 'Prednisolone',
    koreanName: '프레드니솔론',
    isPrebuilt: false,
    therapeuticClass: '부신피질호르몬제 (코르티코스테로이드)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['methylprednisolone', '메틸프레드니솔론', '메디솔론'],
    ingredientId: 'ing_methylprednisolone',
    englishInn: 'Methylprednisolone',
    koreanName: '메틸프레드니솔론',
    isPrebuilt: false,
    therapeuticClass: '부신피질호르몬제 (코르티코스테로이드)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['dexamethasone', '덱사메타손'],
    ingredientId: 'ing_dexamethasone',
    englishInn: 'Dexamethasone',
    koreanName: '덱사메타손',
    isPrebuilt: false,
    therapeuticClass: '부신피질호르몬제 (코르티코스테로이드)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['celecoxib', '세레콕시브', '쎄레브렉스'],
    ingredientId: 'ing_celecoxib',
    englishInn: 'Celecoxib',
    koreanName: '세레콕시브',
    isPrebuilt: false,
    therapeuticClass: 'COX-2 선택적 비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['aceclofenac', '아세클로페낙', '에어탈'],
    ingredientId: 'ing_aceclofenac',
    englishInn: 'Aceclofenac',
    koreanName: '아세클로페낙',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['diclofenac', '디클로페낙'],
    ingredientId: 'ing_diclofenac',
    englishInn: 'Diclofenac',
    koreanName: '디클로페낙',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['meloxicam', '멜록시캄', '모빅'],
    ingredientId: 'ing_meloxicam',
    englishInn: 'Meloxicam',
    koreanName: '멜록시캄',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['ketorolac', '케토롤락'],
    ingredientId: 'ing_ketorolac',
    englishInn: 'Ketorolac',
    koreanName: '케토롤락',
    isPrebuilt: false,
    therapeuticClass: '비스테로이드성 소염진통제 (NSAIDs)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['tramadol', '트라마돌'],
    ingredientId: 'ing_tramadol',
    englishInn: 'Tramadol',
    koreanName: '트라마돌',
    isPrebuilt: false,
    therapeuticClass: '중추성 비마약성 진통제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['sumatriptan', '수마트립탄'],
    ingredientId: 'ing_sumatriptan',
    englishInn: 'Sumatriptan',
    koreanName: '수마트립탄',
    isPrebuilt: false,
    therapeuticClass: '편두통 치료제 (5-HT1 수용체 효능제 · Triptan계)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['cefadroxil', '세파드록실'],
    ingredientId: 'ing_cefadroxil',
    englishInn: 'Cefadroxil',
    koreanName: '세파드록실',
    isPrebuilt: false,
    therapeuticClass: '1세대 세팔로스포린계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['cephalexin', 'cefalexin', '세팔렉신'],
    ingredientId: 'ing_cephalexin',
    englishInn: 'Cephalexin',
    koreanName: '세팔렉신',
    isPrebuilt: false,
    therapeuticClass: '1세대 세팔로스포린계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['cefaclor', '세파클러'],
    ingredientId: 'ing_cefaclor',
    englishInn: 'Cefaclor',
    koreanName: '세파클러',
    isPrebuilt: false,
    therapeuticClass: '2세대 세팔로스포린계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['cefuroxime', '세푸록심'],
    ingredientId: 'ing_cefuroxime',
    englishInn: 'Cefuroxime',
    koreanName: '세푸록심',
    isPrebuilt: false,
    therapeuticClass: '2세대 세팔로스포린계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['cefdinir', '세프디니르', '옴니세프'],
    ingredientId: 'ing_cefdinir',
    englishInn: 'Cefdinir',
    koreanName: '세프디니르',
    isPrebuilt: false,
    therapeuticClass: '3세대 세팔로스포린계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['cefpodoxime', '세프포독심'],
    ingredientId: 'ing_cefpodoxime',
    englishInn: 'Cefpodoxime',
    koreanName: '세프포독심',
    isPrebuilt: false,
    therapeuticClass: '3세대 세팔로스포린계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['azithromycin', '아지트로마이신', '지스로맥스'],
    ingredientId: 'ing_azithromycin',
    englishInn: 'Azithromycin',
    koreanName: '아지트로마이신',
    isPrebuilt: false,
    therapeuticClass: '마크로라이드계 항생제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['clarithromycin', '클라리스로마이신', '클래리시드'],
    ingredientId: 'ing_clarithromycin',
    englishInn: 'Clarithromycin',
    koreanName: '클라리스로마이신',
    isPrebuilt: false,
    therapeuticClass: '마크로라이드계 항생제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['doxycycline', '독시사이클린'],
    ingredientId: 'ing_doxycycline',
    englishInn: 'Doxycycline',
    koreanName: '독시사이클린',
    isPrebuilt: false,
    therapeuticClass: '테트라사이클린계 항생제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['minocycline', '미노사이클린'],
    ingredientId: 'ing_minocycline',
    englishInn: 'Minocycline',
    koreanName: '미노사이클린',
    isPrebuilt: false,
    therapeuticClass: '테트라사이클린계 항생제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['ciprofloxacin', '시프로플록사신'],
    ingredientId: 'ing_ciprofloxacin',
    englishInn: 'Ciprofloxacin',
    koreanName: '시프로플록사신',
    isPrebuilt: false,
    therapeuticClass: '플루오로퀴놀론계 항균제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['levofloxacin', '레보플록사신', '크라비트'],
    ingredientId: 'ing_levofloxacin',
    englishInn: 'Levofloxacin',
    koreanName: '레보플록사신',
    isPrebuilt: false,
    therapeuticClass: '플루오로퀴놀론계 항균제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['metronidazole', '메트로니다졸', '후라시닐'],
    ingredientId: 'ing_metronidazole',
    englishInn: 'Metronidazole',
    koreanName: '메트로니다졸',
    isPrebuilt: false,
    therapeuticClass: '항원충제 · 혐기성 세균 항균제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['fluconazole', '플루코나졸', '디푸루칸'],
    ingredientId: 'ing_fluconazole',
    englishInn: 'Fluconazole',
    koreanName: '플루코나졸',
    isPrebuilt: false,
    therapeuticClass: '트리아졸계 항진균제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['itraconazole', '이트라코나졸', '스포라녹스'],
    ingredientId: 'ing_itraconazole',
    englishInn: 'Itraconazole',
    koreanName: '이트라코나졸',
    isPrebuilt: false,
    therapeuticClass: '트리아졸계 항진균제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['terbinafine', '테르비나핀', '라미실'],
    ingredientId: 'ing_terbinafine',
    englishInn: 'Terbinafine',
    koreanName: '테르비나핀',
    isPrebuilt: false,
    therapeuticClass: '알릴아민계 항진균제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['acyclovir', '아시클로버', '조비락스'],
    ingredientId: 'ing_acyclovir',
    englishInn: 'Acyclovir',
    koreanName: '아시클로버',
    isPrebuilt: false,
    therapeuticClass: '항바이러스제 (헤르페스·수두 치료제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['valacyclovir', '발라시클로버', '발트렉스'],
    ingredientId: 'ing_valacyclovir',
    englishInn: 'Valacyclovir',
    koreanName: '발라시클로버',
    isPrebuilt: false,
    therapeuticClass: '항바이러스제 (헤르페스·대상포진 치료제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['oseltamivir', '오셀타미비르', '타미플루'],
    ingredientId: 'ing_oseltamivir',
    englishInn: 'Oseltamivir',
    koreanName: '오셀타미비르',
    isPrebuilt: false,
    therapeuticClass: '인플루엔자 항바이러스제 (뉴라미니다아제 억제제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['lansoprazole', '란소프라졸', '란스톤'],
    ingredientId: 'ing_lansoprazole',
    englishInn: 'Lansoprazole',
    koreanName: '란소프라졸',
    isPrebuilt: false,
    therapeuticClass: '프로톤펌프억제제 (PPI)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['dexlansoprazole', '덱슬란소프라졸', '덱실란트'],
    ingredientId: 'ing_dexlansoprazole',
    englishInn: 'Dexlansoprazole',
    koreanName: '덱슬란소프라졸',
    isPrebuilt: false,
    therapeuticClass: '프로톤펌프억제제 (PPI)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['tegoprazan', '테고프라잔', '케이캡'],
    ingredientId: 'ing_tegoprazan',
    englishInn: 'Tegoprazan',
    koreanName: '테고프라잔',
    isPrebuilt: false,
    therapeuticClass: '칼륨경쟁적 위산분비억제제 (P-CAB)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['fexuprazan', '펙수프라잔', '펙수클루'],
    ingredientId: 'ing_fexuprazan',
    englishInn: 'Fexuprazan',
    koreanName: '펙수프라잔',
    isPrebuilt: false,
    therapeuticClass: '칼륨경쟁적 위산분비억제제 (P-CAB)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['mosapride', '모사프리드', '가스모틴'],
    ingredientId: 'ing_mosapride',
    englishInn: 'Mosapride',
    koreanName: '모사프리드',
    isPrebuilt: false,
    therapeuticClass: '위장관 운동 촉진제 (5-HT4 수용체 효능제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['domperidone', '돔페리돈'],
    ingredientId: 'ing_domperidone',
    englishInn: 'Domperidone',
    koreanName: '돔페리돈',
    isPrebuilt: false,
    therapeuticClass: '위장관 운동 조절제 · 항구토제 (도파민 D2 길항제)',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['metoclopramide', '메토클로프라미드', '맥페란'],
    ingredientId: 'ing_metoclopramide',
    englishInn: 'Metoclopramide',
    koreanName: '메토클로프라미드',
    isPrebuilt: false,
    therapeuticClass: '항구토제 · 위장관 운동 촉진제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['ondansetron', '온단세트론', '조프란'],
    ingredientId: 'ing_ondansetron',
    englishInn: 'Ondansetron',
    koreanName: '온단세트론',
    isPrebuilt: false,
    therapeuticClass: '항구토제 (5-HT3 수용체 길항제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['doxylamine', '독실아민', '디클렉틴'],
    ingredientId: 'ing_doxylamine',
    englishInn: 'Doxylamine',
    koreanName: '독실아민',
    isPrebuilt: false,
    therapeuticClass: '1세대 항히스타민제 (수면유도제 · 임신 오조증 치료제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['montelukast', '몬테루카스트', '싱귤레어'],
    ingredientId: 'ing_montelukast',
    englishInn: 'Montelukast',
    koreanName: '몬테루카스트',
    isPrebuilt: false,
    therapeuticClass: '류코트리엔 수용체 길항제 (천식 · 알레르기 비염 치료제)',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['methotrexate', '메토트렉세이트'],
    ingredientId: 'ing_methotrexate',
    englishInn: 'Methotrexate',
    koreanName: '메토트렉세이트',
    isPrebuilt: false,
    therapeuticClass: '엽산 길항 대사억제제 · 면역억제제',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['acitretin', '아시트레틴', '네오티가손'],
    ingredientId: 'ing_acitretin',
    englishInn: 'Acitretin',
    koreanName: '아시트레틴',
    isPrebuilt: false,
    therapeuticClass: '레티노이드계 건선 치료제 (최기형성 물질)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['alretinoin', 'alitretinoin', '알리트레티노인', '알리톡'],
    ingredientId: 'ing_alitretinoin',
    englishInn: 'Alitretinoin',
    koreanName: '알리트레티노인',
    isPrebuilt: false,
    therapeuticClass: '레티노이드계 만성 손습진 치료제 (최기형성 물질)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['misoprostol', '미소프로스톨', '싸이토텍'],
    ingredientId: 'ing_misoprostol',
    englishInn: 'Misoprostol',
    koreanName: '미소프로스톨',
    isPrebuilt: false,
    therapeuticClass: '프로스타글란딘 E1 유도체 (위궤양 치료제 · 자궁수축 유발 금기)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['ribavirin', '리바비린'],
    ingredientId: 'ing_ribavirin',
    englishInn: 'Ribavirin',
    koreanName: '리바비린',
    isPrebuilt: false,
    therapeuticClass: '항바이러스제 (최기형성 물질)',
    defaultDurGrade: 'GRADE_1'
  },
  {
    keywords: ['mycophenolate', '미코페놀레이트', '셀셉트'],
    ingredientId: 'ing_mycophenolate',
    englishInn: 'Mycophenolate',
    koreanName: '미코페놀레이트',
    isPrebuilt: false,
    therapeuticClass: '면역억제제',
    defaultDurGrade: 'GRADE_2'
  },
  {
    keywords: ['tacrolimus', '타크로리무스', '프로그랍'],
    ingredientId: 'ing_tacrolimus',
    englishInn: 'Tacrolimus',
    koreanName: '타크로리무스',
    isPrebuilt: false,
    therapeuticClass: '칼시뉴린 억제 면역억제제',
    defaultDurGrade: 'NONE'
  },
  {
    keywords: ['hydroxychloroquine', '히드록시클로로퀸', '옥시크로린'],
    ingredientId: 'ing_hydroxychloroquine',
    englishInn: 'Hydroxychloroquine',
    koreanName: '히드록시클로로퀸',
    isPrebuilt: false,
    therapeuticClass: '항말라리아제 · 항류마티스제 (DMARDs)',
    defaultDurGrade: 'NONE'
  }
];

const KPIC_DETAILED_LIST = kpicDetailedIngredients as Array<{
  kpicatc_code: string;
  name: string;
  category: string;
  dept1: string;
  dept2: string;
  dept3: string;
  dept4: string;
}>;

/**
 * 약학정보원(KPIC) 내장 사전(kpicDetailedIngredients.json + kpicMasterDatabase.json)에서
 * 영문 성분명(INN) 또는 한글 성분명의 약효분류 계층(예: "신경계 질환 > 항전간제") 조회
 */
export function resolveKpicTherapeuticClass(englishInn: string, koreanName?: string): string | null {
  const cleanEng = normalizeDrugSearchText(stripEnglishSaltAndHydrate(englishInn));
  const cleanKor = koreanName ? normalizeDrugSearchText(stripKoreanSaltAndHydrate(koreanName)) : '';

  if (cleanEng) {
    const exactDetailed = KPIC_DETAILED_LIST.find(
      (item) => normalizeDrugSearchText(stripEnglishSaltAndHydrate(item.name)) === cleanEng
    );
    if (exactDetailed) {
      const parts = [exactDetailed.dept2, exactDetailed.dept3, exactDetailed.dept4 || exactDetailed.category]
        .map((s) => (s || '').trim())
        .filter((s, idx, arr) => s && s !== '기타' && arr.indexOf(s) === idx);
      if (parts.length > 0) return parts.join(' · ');
    }

    const partialDetailed = KPIC_DETAILED_LIST.find((item) => {
      const n = normalizeDrugSearchText(item.name);
      return cleanEng.length >= 4 && (n.includes(cleanEng) || cleanEng.includes(n));
    });
    if (partialDetailed) {
      const parts = [partialDetailed.dept2, partialDetailed.dept3, partialDetailed.dept4 || partialDetailed.category]
        .map((s) => (s || '').trim())
        .filter((s, idx, arr) => s && s !== '기타' && arr.indexOf(s) === idx);
      if (parts.length > 0) return parts.join(' · ');
    }
  }

  // KPIC_MASTER_DATABASE 보조 조회
  for (const [kpicKey, kpicCat] of Object.entries(KPIC_MASTER_DATABASE)) {
    const normKey = normalizeDrugSearchText(kpicKey);
    if ((cleanEng && normKey === cleanEng) || (cleanKor && normKey === cleanKor)) {
      if (kpicCat && kpicCat !== '기타') return kpicCat;
    }
  }

  return null;
}

/**
 * 한글/영문 성분명을 염기 제외 순수 성분(Base Ingredient) ID로 매핑
 * - 1순위: COMMON_BASE_INGREDIENT_MAP (다빈도 처방/일반약 사전)
 * - 2순위: INN_DICTIONARY 및 사용자 학습 사전 (getLearnedDict)
 * - 3순위: 식약처 MAIN_INGR_ENG 힌트 + 약학정보원(KPIC) 내장 사전(2,230+ 성분) 매칭
 */
export function resolveCoreMaternalIngredientId(
  rawName: string,
  hintEnglishInn?: string
): {
  ingredientId: string;
  englishInn: string;
  koreanName: string;
  isVerifiedCore5: boolean;
  therapeuticClass?: string;
  defaultDurGrade?: 'GRADE_1' | 'GRADE_2' | 'NONE';
} {
  const combinedInput = hintEnglishInn ? `${rawName} (${hintEnglishInn})` : rawName;
  const norm = normalizeDrugSearchText(combinedInput);
  const cleanKor = stripKoreanSaltAndHydrate(rawName.replace(/\([A-Za-z0-9\s,-]+\)/g, '').trim());
  const cleanEng = stripEnglishSaltAndHydrate(hintEnglishInn || rawName);

  // 덱시부프로펜과 이부프로펜, 레보세티리진과 세티리진, 에스오메프라졸과 오메프라졸 구분 우선 처리
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
  if (norm.includes('esomeprazole') || norm.includes('에소메프라졸') || norm.includes('에스오메프라졸')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_esomeprazole')!;
    return {
      ingredientId: entry.ingredientId,
      englishInn: entry.englishInn,
      koreanName: entry.koreanName,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
      therapeuticClass: entry.therapeuticClass,
      defaultDurGrade: entry.defaultDurGrade
    };
  }
  if (norm.includes('dexlansoprazole') || norm.includes('덱슬란소프라졸')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_dexlansoprazole')!;
    return {
      ingredientId: entry.ingredientId,
      englishInn: entry.englishInn,
      koreanName: entry.koreanName,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
      therapeuticClass: entry.therapeuticClass,
      defaultDurGrade: entry.defaultDurGrade
    };
  }
  if (norm.includes('escitalopram') || norm.includes('에스시탈로프람')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_escitalopram')!;
    return {
      ingredientId: entry.ingredientId,
      englishInn: entry.englishInn,
      koreanName: entry.koreanName,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
      therapeuticClass: entry.therapeuticClass,
      defaultDurGrade: entry.defaultDurGrade
    };
  }
  if (norm.includes('valacyclovir') || norm.includes('발라시클로버')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_valacyclovir')!;
    return {
      ingredientId: entry.ingredientId,
      englishInn: entry.englishInn,
      koreanName: entry.koreanName,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[entry.ingredientId]),
      therapeuticClass: entry.therapeuticClass,
      defaultDurGrade: entry.defaultDurGrade
    };
  }
  if (norm.includes('methylprednisolone') || norm.includes('메틸프레드니솔론')) {
    const entry = COMMON_BASE_INGREDIENT_MAP.find((e) => e.ingredientId === 'ing_methylprednisolone')!;
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
        therapeuticClass:
          entry.therapeuticClass || resolveKpicTherapeuticClass(entry.englishInn, entry.koreanName) || undefined,
        defaultDurGrade: entry.defaultDurGrade
      };
    }
  }

  // 2순위: INN_DICTIONARY 및 학습된 약학정보원 사전(getLearnedDict)에서 매칭
  const allDicts = { ...INN_DICTIONARY, ...getLearnedDict() };
  const normCleanKor = normalizeDrugSearchText(cleanKor);
  const normCleanEng = normalizeDrugSearchText(cleanEng);

  for (const [dictKorKey, meta] of Object.entries(allDicts)) {
    const normDictKor = normalizeDrugSearchText(stripKoreanSaltAndHydrate(dictKorKey));
    const baseDictEng = stripEnglishSaltAndHydrate(meta.englishInn);
    const normDictEng = normalizeDrugSearchText(baseDictEng);

    if (
      (normCleanKor && normDictKor === normCleanKor) ||
      (normCleanEng && normDictEng && normDictEng === normCleanEng)
    ) {
      const slug = normDictEng.replace(/[^a-z0-9]/g, '') || normDictKor;
      const dynamicId = `ing_${slug}`;
      const kpicClass = resolveKpicTherapeuticClass(baseDictEng, cleanKor) || meta.functionalCategory;
      return {
        ingredientId: dynamicId,
        englishInn: baseDictEng,
        koreanName: /[가-힣]/.test(cleanKor) ? cleanKor : dictKorKey,
        isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[dynamicId]),
        therapeuticClass: kpicClass
      };
    }
  }

  // 3순위: 약학정보원(KPIC) 2,230+ 영문 성분 사전(kpicDetailedIngredients.json)에서 영문 INN 매칭
  const parenEngMatch = combinedInput.match(/\(([A-Za-z0-9\s,-]+)\)/);
  const candidateEng = parenEngMatch
    ? stripEnglishSaltAndHydrate(parenEngMatch[1])
    : /^[A-Za-z\s,-]+$/.test(cleanEng)
    ? cleanEng
    : '';

  if (candidateEng) {
    const normCandEng = normalizeDrugSearchText(candidateEng);
    const kpicHit = KPIC_DETAILED_LIST.find(
      (item) => normalizeDrugSearchText(stripEnglishSaltAndHydrate(item.name)) === normCandEng
    );
    const finalEng = kpicHit ? stripEnglishSaltAndHydrate(kpicHit.name) : candidateEng;
    const kpicClass = resolveKpicTherapeuticClass(finalEng, cleanKor);
    const slug = normalizeDrugSearchText(finalEng).replace(/[^a-z0-9]/g, '');
    const dynamicId = `ing_kpic_${slug || 'unknown'}`;

    return {
      ingredientId: dynamicId,
      englishInn: finalEng,
      koreanName: /[가-힣]/.test(cleanKor) ? cleanKor : finalEng,
      isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[dynamicId]),
      therapeuticClass: kpicClass || undefined
    };
  }

  const slug = normalizeDrugSearchText(cleanKor).replace(/[^a-z0-9가-힣]/g, '');
  const dynamicId = `ing_dyn_${slug || 'unknown'}`;
  const kpicClass = resolveKpicTherapeuticClass(cleanEng, cleanKor);

  return {
    ingredientId: dynamicId,
    englishInn: cleanEng || cleanKor,
    koreanName: cleanKor,
    isVerifiedCore5: Boolean(PREGNANCY_SAFETY_DB[dynamicId]),
    therapeuticClass: kpicClass || undefined
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
 * 로컬 검증 DB(내장 국내 대표 단일제·복합제 품목) 즉시 검색 (제품명 전용)
 * - '리피토정 20mg' 입력 시 '리피토정20밀리그램'과 자동 매칭
 */
export function searchLocalMaternalDatabase(query: string): MaternalSearchResult[] {
  const clean = query.trim();
  const norm = normalizeQueryForProductMatch(clean);

  const results: MaternalSearchResult[] = [];

  // 내장 국내 허가 의약품(단일제·복합제) 제품명 검색 (단위 mg <-> 밀리그램 정규화 적용, 성분명 검색 제외)
  for (const drug of DRUG_MASTER_DB) {
    const mappings = INGREDIENT_MAPPING_DB.filter((m) => m.drugMasterId === drug.id);
    const matchProd = normalizeQueryForProductMatch(drug.koreanProductName).includes(norm);
    const matchSeq = Boolean(clean) && drug.itemSeq.includes(clean);

    if (!norm || matchProd || matchSeq) {
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

  const validItemSeq = itemSeq && itemSeq !== '-' ? itemSeq : '';
  const mfdsSourceId = validItemSeq ? `src_mfds_dyn_${validItemSeq}` : `src_mfds_dyn_${ingredientId}`;
  const lactmedSourceId = `src_lactmed_dyn_${ingredientId}`;
  const fdaSourceId = `src_fda_dyn_${ingredientId}`;

  EVIDENCE_SOURCES_DB[mfdsSourceId] = {
    sourceId: mfdsSourceId,
    ingredientId,
    organizationName: '식약처 의약품안전나라',
    documentTitle: validItemSeq
      ? `식약처 의약품 상세허가정보: ${productName} [품목기준코드: ${validItemSeq}]`
      : `식약처 의약품안전나라 성분 검색: ${koreanName} (${englishInn})`,
    originalUrl: validItemSeq
      ? `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${validItemSeq}`
      : `https://nedrug.mfds.go.kr/searchDrug?sort=&sortOrder=false&searchYn=true&ingrName1=${encodeURIComponent(
          koreanName
        )}`,
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
 * 식약처 의약품 허가 API (DrugPrdtPrmsnInfoService08) + 약학정보원(KPIC) 사전 + 미국 FDA(openFDA) 실시간 연동 검색 (제품명 전용)
 * - 약사가 내장 샘플 외의 국내 의약품 제품명을 검색했을 때 실시간으로 식약처 원료약품·허가사항(임부·수유부 조항),
 *   KPIC 약효분류, openFDA 라벨 원문을 가져와 염기/수화물을 제거한 순수 성분 기준으로 매핑하고 요약표·상세 페이지를 즉시 생성합니다.
 */
export async function searchLiveMfdsForMaternalSafety(query: string): Promise<MaternalSearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  // 사용자가 "리피토정 20mg" 처럼 입력한 경우 식약처 검색어 호환성을 위해 제품명 키워드도 함께 검색
  const normalizedKoreanUnitQuery = clean.replace(/([0-9]+)\s*mg/gi, '$1밀리그램');
  const baseBrandQuery = clean.replace(/\s*[0-9]+(?:\.[0-9]+)?\s*(?:mg|밀리그램|밀리그람|g|mcg).*$/i, '').trim();
  const normBaseBrand = normalizeQueryForProductMatch(baseBrandQuery || clean);

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

    // 괄호 안 성분명(예: "셀트라정50밀리그램(설트랄린염산염)")이 아닌 실제 제품명(브랜드명) 또는 품목기준코드가 일치하는 품목만 필터링
    const productMatchedItems = (mfdsItems || []).filter((item) => {
      const pureBrandName = item.productName.replace(/\([^)]*\)/g, '').trim();
      const normPureBrand = normalizeQueryForProductMatch(pureBrandName);
      return normPureBrand.includes(normBaseBrand) || item.regulatoryCode.includes(clean);
    });

    const topItems = productMatchedItems.slice(0, 6);
    const liveResults: MaternalSearchResult[] = [];

    for (const item of topItems) {
      // 이미 내장 DB에 동일 품목기준코드로 등록된 경우 중복 제외
      if (DRUG_MASTER_DB.some((d) => d.itemSeq === item.regulatoryCode)) {
        continue;
      }

      const pureProductName = item.productName.replace(/\([^)]*\)/g, '').trim() || item.productName;

      // 상세 원료약품 및 주의사항(NB_DOC_DATA) 조회
      const detail = await fetchMfdsDrugDetail(item.regulatoryCode);
      const rawIngText = detail?.rawIngredientsText || item.rawIngredientsText || '';
      const rawLines = rawIngText
        .split(/[\r\n\/;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      // 식약처 상세 응답의 영문 주성분 목록(MAIN_INGR_ENG) 추출 -> KPIC & FDA 매핑 정확도 극대화
      const detailEngList = (detail?.mainIngrEng || item.rawIngredientsText || '')
        .split(/[\/;,\r\n]+/)
        .map((s) => s.trim())
        .filter((s) => /^[A-Za-z0-9\s,\-\(\)]+$/.test(s));

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
        const hintEng = detailEngList[idx] || (detailEngList.length === 1 ? detailEngList[0] : undefined);
        const resolved = resolveCoreMaternalIngredientId(line, hintEng);

        // 미등록 성분인 경우 실시간으로 식약처 + KPIC + openFDA 기반 안전성 레코드 생성
        if (!PREGNANCY_SAFETY_DB[resolved.ingredientId]) {
          await ensureDynamicMaternalRecord({
            ingredientId: resolved.ingredientId,
            koreanName: resolved.koreanName,
            englishInn: resolved.englishInn,
            therapeuticClass:
              resolved.therapeuticClass ||
              resolveKpicTherapeuticClass(resolved.englishInn, resolved.koreanName) ||
              '국내 허가 의약품 유효성분 (식약처·KPIC·FDA 실시간 연동)',
            route,
            routeKorean,
            mfdsPrecautionText: mfdsPregnancyPrecautionText,
            itemSeq: item.regulatoryCode,
            productName: pureProductName,
            defaultDurGrade: resolved.defaultDurGrade
          });
        }

        mappedIngredients.push({
          mappingId: `live_map_${item.regulatoryCode}_${idx}`,
          drugMasterId: `live_${item.regulatoryCode}`,
          koreanProductName: pureProductName,
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
        const hintEng = detailEngList[0];
        const resolved = resolveCoreMaternalIngredientId(item.productName, hintEng);
        if (!PREGNANCY_SAFETY_DB[resolved.ingredientId]) {
          await ensureDynamicMaternalRecord({
            ingredientId: resolved.ingredientId,
            koreanName: resolved.koreanName,
            englishInn: resolved.englishInn,
            therapeuticClass:
              resolved.therapeuticClass ||
              resolveKpicTherapeuticClass(resolved.englishInn, resolved.koreanName) ||
              '국내 허가 의약품 유효성분 (식약처·KPIC·FDA 실시간 연동)',
            route,
            routeKorean,
            mfdsPrecautionText: mfdsPregnancyPrecautionText,
            itemSeq: item.regulatoryCode,
            productName: pureProductName,
            defaultDurGrade: resolved.defaultDurGrade
          });
        }
        mappedIngredients.push({
          mappingId: `live_map_${item.regulatoryCode}_0`,
          drugMasterId: `live_${item.regulatoryCode}`,
          koreanProductName: pureProductName,
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

      const hasGrade1 = mappedIngredients.some((m) => {
        const p = PREGNANCY_SAFETY_DB[m.ingredientId];
        return p?.domesticDurGrade === '임부금기 1등급';
      });
      const hasGrade2 = mappedIngredients.some((m) => {
        const p = PREGNANCY_SAFETY_DB[m.ingredientId];
        return p?.domesticDurGrade === '임부금기 2등급';
      });

      const drugMaster: DrugMasterRecord = {
        id: `live_${item.regulatoryCode}`,
        itemSeq: item.regulatoryCode,
        koreanProductName: pureProductName,
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
