import { DomesticIngredientItem, IngredientMatchConfidence } from '../types/maternalSafety';

export interface CrosswalkEntry {
  inn: string;                 // 해외 표준 주성분명 (Title Case)
  koreanBaseName: string;      // 국내 대표 한글 성분명
  koreanSynonyms: string[];    // 국내 허가사항 원문에 등장하는 염·수화물·별칭 목록
  englishSynonyms: string[];   // 영문 염·수화물·별칭 (예: Paracetamol, Clavulanate potassium)
  durSearchKeyword: string;    // 식약처 DUR API 검색용 표준 한글 성분명
  representativeProductKeyword: string; // 성분명 검색 시 식약처 허가 API 조회용 대표 키워드
}

/**
 * 국내 성분명(한글·염·수화물) ↔ 해외 표준 성분명(INN) 공식 매칭 테이블
 */
export const INGREDIENT_CROSSWALK_TABLE: CrosswalkEntry[] = [
  // === 필수 검증 6대 핵심 성분 ===
  {
    inn: 'Acetaminophen',
    koreanBaseName: '아세트아미노펜',
    koreanSynonyms: [
      '아세트아미노펜',
      '아세트아미노펜제피세립',
      '제피아세트아미노펜',
      '아세트아미노펜미세입자',
      '아세트아미노펜혼합분말',
      '파라세타몰'
    ],
    englishSynonyms: ['acetaminophen', 'paracetamol', 'acetaminophen encapsulated', 'apap'],
    durSearchKeyword: '아세트아미노펜',
    representativeProductKeyword: '타이레놀정500밀리그람'
  },
  {
    inn: 'Ibuprofen',
    koreanBaseName: '이부프로펜',
    koreanSynonyms: [
      '이부프로펜',
      '이부프로펜아르기닌',
      '이부프로펜리신',
      '이부프로펜나트륨이수화물',
      '이부프로펜나트륨',
      '이부프로펜제피세립'
    ],
    englishSynonyms: [
      'ibuprofen',
      'ibuprofen arginine',
      'ibuprofen lysine',
      'ibuprofen sodium dihydrate',
      'ibuprofen sodium'
    ],
    durSearchKeyword: '이부프로펜',
    representativeProductKeyword: '부루펜정'
  },
  {
    inn: 'Cetirizine',
    koreanBaseName: '세티리진',
    koreanSynonyms: ['세티리진', '세티리진염산염', '염산세티리진'],
    englishSynonyms: ['cetirizine', 'cetirizine hydrochloride', 'cetirizine dihydrochloride', 'cetirizine hcl'],
    durSearchKeyword: '세티리진',
    representativeProductKeyword: '지르텍정'
  },
  {
    inn: 'Loratadine',
    koreanBaseName: '로라타딘',
    koreanSynonyms: ['로라타딘', '미분화로라타딘'],
    englishSynonyms: ['loratadine', 'loratadine micronized'],
    durSearchKeyword: '로라타딘',
    representativeProductKeyword: '클라리틴정'
  },
  {
    inn: 'Amoxicillin',
    koreanBaseName: '아목시실린',
    koreanSynonyms: ['아목시실린', '아목시실린수화물', '아목시실린삼수화물', '아목시실린나트륨'],
    englishSynonyms: ['amoxicillin', 'amoxicillin hydrate', 'amoxicillin trihydrate', 'amoxicillin sodium', 'amoxycillin'],
    durSearchKeyword: '아목시실린',
    representativeProductKeyword: '아목시실린'
  },
  {
    inn: 'Pseudoephedrine',
    koreanBaseName: '슈도에페드린',
    koreanSynonyms: ['슈도에페드린', '슈도에페드린염산염', '염산슈도에페드린', '슈도에페드린황산염'],
    englishSynonyms: [
      'pseudoephedrine',
      'pseudoephedrine hydrochloride',
      'pseudoephedrine hcl',
      'pseudoephedrine sulfate'
    ],
    durSearchKeyword: '슈도에페드린',
    representativeProductKeyword: '슈다페드정'
  },

  // === 주요 세팔로스포린계 및 항생제 성분 (염·에스테르 프로드러그 포함) ===
  {
    inn: 'Cefpodoxime',
    koreanBaseName: '세프포독심',
    koreanSynonyms: ['세프포독심', '세프포독심프록세틸', '세프포독심프로세틸'],
    englishSynonyms: ['cefpodoxime', 'cefpodoxime proxetil'],
    durSearchKeyword: '세프포독심',
    representativeProductKeyword: '바난건조시럽'
  },
  {
    inn: 'Cefditoren',
    koreanBaseName: '세프디토렌',
    koreanSynonyms: ['세프디토렌', '세프디토렌피복실'],
    englishSynonyms: ['cefditoren', 'cefditoren pivoxil'],
    durSearchKeyword: '세프디토렌',
    representativeProductKeyword: '메이액트정'
  },
  {
    inn: 'Cefuroxime',
    koreanBaseName: '세푸록심',
    koreanSynonyms: ['세푸록심', '세푸록심악세틸', '세푸록심아세틸', '세푸록심나트륨'],
    englishSynonyms: ['cefuroxime', 'cefuroxime axetil', 'cefuroxime sodium'],
    durSearchKeyword: '세푸록심',
    representativeProductKeyword: '진네트정'
  },
  {
    inn: 'Cephalexin',
    koreanBaseName: '세팔렉신',
    koreanSynonyms: ['세팔렉신', '세팔렉신수화물', '세파렉신'],
    englishSynonyms: ['cephalexin', 'cefalexin', 'cephalexin monohydrate'],
    durSearchKeyword: '세팔렉신',
    representativeProductKeyword: '세팔렉신'
  },
  {
    inn: 'Cefaclor',
    koreanBaseName: '세파클러',
    koreanSynonyms: ['세파클러', '세파클러수화물', '세파클러수화물서방정'],
    englishSynonyms: ['cefaclor', 'cefaclor hydrate', 'cefaclor monohydrate'],
    durSearchKeyword: '세파클러',
    representativeProductKeyword: '시클러'
  },
  {
    inn: 'Cefdinir',
    koreanBaseName: '세프디니르',
    koreanSynonyms: ['세프디니르'],
    englishSynonyms: ['cefdinir'],
    durSearchKeyword: '세프디니르',
    representativeProductKeyword: '옴니세프'
  },
  {
    inn: 'Cefixime',
    koreanBaseName: '세픽심',
    koreanSynonyms: ['세픽심', '세픽심수화물'],
    englishSynonyms: ['cefixime', 'cefixime trihydrate', 'cefixime hydrate'],
    durSearchKeyword: '세픽심',
    representativeProductKeyword: '슈프락스'
  },

  // === 복합제 및 다빈도 처방·일반의약품 성분 ===
  {
    inn: 'Clavulanic Acid',
    koreanBaseName: '클라불란산',
    koreanSynonyms: [
      '클라불란산',
      '클라불란산칼륨',
      '클라불란산칼륨·미결정셀룰로오스(1:1)',
      '클라불란산칼륨·이산화규소(1:1)',
      '클라불란산칼륨혼합분말'
    ],
    englishSynonyms: [
      'clavulanic acid',
      'potassium clavulanate',
      'clavulanate potassium',
      'diluted potassium clavulanate'
    ],
    durSearchKeyword: '클라불란산',
    representativeProductKeyword: '오구멘틴정'
  },
  {
    inn: 'Triprolidine',
    koreanBaseName: '트리프롤리딘',
    koreanSynonyms: ['트리프롤리딘', '트리프롤리딘염산염', '트리프롤리딘염산염수화물'],
    englishSynonyms: ['triprolidine', 'triprolidine hydrochloride', 'triprolidine hydrochloride hydrate', 'triprolidine hcl'],
    durSearchKeyword: '트리프롤리딘',
    representativeProductKeyword: '액티피드정'
  },
  {
    inn: 'Chlorpheniramine',
    koreanBaseName: '클로르페니라민',
    koreanSynonyms: ['클로르페니라민', '클로르페니라민말레산염', '말레산클로르페니라민', 'd-클로르페니라민말레산염'],
    englishSynonyms: ['chlorpheniramine', 'chlorpheniramine maleate', 'chlorphenamine', 'chlorphenamine maleate'],
    durSearchKeyword: '클로르페니라민',
    representativeProductKeyword: '페니라민정'
  },
  {
    inn: 'Dextromethorphan',
    koreanBaseName: '덱스트로메토르판',
    koreanSynonyms: [
      '덱스트로메토르판',
      '덱스트로메토르판브롬화수소산염',
      '덱스트로메토르판브롬화수소산염수화물',
      '브롬화수소산덱스트로메토르판'
    ],
    englishSynonyms: [
      'dextromethorphan',
      'dextromethorphan hydrobromide',
      'dextromethorphan hydrobromide hydrate',
      'dextromethorphan hbr'
    ],
    durSearchKeyword: '덱스트로메토르판',
    representativeProductKeyword: '덱스트로메토르판'
  },
  {
    inn: 'Guaifenesin',
    koreanBaseName: '구아이페네신',
    koreanSynonyms: ['구아이페네신'],
    englishSynonyms: ['guaifenesin', 'guaiphenesin'],
    durSearchKeyword: '구아이페네신',
    representativeProductKeyword: '구아이페네신'
  },
  {
    inn: 'Phenylephrine',
    koreanBaseName: '페닐레프린',
    koreanSynonyms: ['페닐레프린', '페닐레프린염산염'],
    englishSynonyms: ['phenylephrine', 'phenylephrine hydrochloride', 'phenylephrine hcl'],
    durSearchKeyword: '페닐레프린',
    representativeProductKeyword: '페닐레프린'
  },
  {
    inn: 'Caffeine',
    koreanBaseName: '카페인',
    koreanSynonyms: ['카페인', '카페인무수물', '무수카페인', '카페인수화물'],
    englishSynonyms: ['caffeine', 'caffeine anhydrous', 'anhydrous caffeine'],
    durSearchKeyword: '카페인',
    representativeProductKeyword: '카페인'
  },
  {
    inn: 'Codeine',
    koreanBaseName: '코데인',
    koreanSynonyms: ['코데인', '코데인인산염', '코데인인산염수화물', '디히드로코데인타르타르산염'],
    englishSynonyms: ['codeine', 'codeine phosphate', 'codeine phosphate hydrate', 'dihydrocodeine bitartrate'],
    durSearchKeyword: '코데인',
    representativeProductKeyword: '코데인'
  },
  {
    inn: 'Tramadol',
    koreanBaseName: '트라마돌',
    koreanSynonyms: ['트라마돌', '트라마돌염산염', '염산트라마돌'],
    englishSynonyms: ['tramadol', 'tramadol hydrochloride', 'tramadol hcl'],
    durSearchKeyword: '트라마돌',
    representativeProductKeyword: '울트라셋정'
  },
  {
    inn: 'Dexibuprofen',
    koreanBaseName: '덱시부프로펜',
    koreanSynonyms: ['덱시부프로펜', '덱시부프로펜디.씨', '덱시부프로펜디씨'],
    englishSynonyms: ['dexibuprofen', 'dexibuprofen d.c.', 'dexibuprofen dc'],
    durSearchKeyword: '덱시부프로펜',
    representativeProductKeyword: '덱시부프로펜'
  },
  {
    inn: 'Naproxen',
    koreanBaseName: '나프록센',
    koreanSynonyms: ['나프록센', '나프록센나트륨'],
    englishSynonyms: ['naproxen', 'naproxen sodium'],
    durSearchKeyword: '나프록센',
    representativeProductKeyword: '탁센연질캡슐'
  },
  {
    inn: 'Loxoprofen',
    koreanBaseName: '록소프로펜',
    koreanSynonyms: ['록소프로펜', '록소프로펜나트륨', '록소프로펜나트륨수화물'],
    englishSynonyms: ['loxoprofen', 'loxoprofen sodium', 'loxoprofen sodium hydrate'],
    durSearchKeyword: '록소프로펜',
    representativeProductKeyword: '록소닌정'
  },
  {
    inn: 'Celecoxib',
    koreanBaseName: '세레콕시브',
    koreanSynonyms: ['세레콕시브'],
    englishSynonyms: ['celecoxib'],
    durSearchKeyword: '세레콕시브',
    representativeProductKeyword: '쎄레브렉스캡슐'
  },
  {
    inn: 'Diclofenac',
    koreanBaseName: '디클로페낙',
    koreanSynonyms: ['디클로페낙', '디클로페낙나트륨', '디클로페낙칼륨', '디클로페낙디에틸암모늄'],
    englishSynonyms: ['diclofenac', 'diclofenac sodium', 'diclofenac potassium', 'diclofenac diethylammonium'],
    durSearchKeyword: '디클로페낙',
    representativeProductKeyword: '디클로페낙'
  },
  {
    inn: 'Meloxicam',
    koreanBaseName: '멜록시캄',
    koreanSynonyms: ['멜록시캄'],
    englishSynonyms: ['meloxicam'],
    durSearchKeyword: '멜록시캄',
    representativeProductKeyword: '모빅캡슐'
  },
  {
    inn: 'Ketorolac',
    koreanBaseName: '케토롤락',
    koreanSynonyms: ['케토롤락', '케토롤락트로메타민'],
    englishSynonyms: ['ketorolac', 'ketorolac tromethamine'],
    durSearchKeyword: '케토롤락',
    representativeProductKeyword: '케토롤락'
  },
  {
    inn: 'Aspirin',
    koreanBaseName: '아스피린',
    koreanSynonyms: ['아스피린', '아스피린장용과립', '아세틸살리실산'],
    englishSynonyms: ['aspirin', 'acetylsalicylic acid', 'aspirin enteric coated'],
    durSearchKeyword: '아스피린',
    representativeProductKeyword: '아스피린프로텍트정'
  },
  {
    inn: 'Levocetirizine',
    koreanBaseName: '레보세티리진',
    koreanSynonyms: ['레보세티리진', '레보세티리진염산염'],
    englishSynonyms: ['levocetirizine', 'levocetirizine dihydrochloride', 'levocetirizine hydrochloride'],
    durSearchKeyword: '레보세티리진',
    representativeProductKeyword: '씨잘정'
  },
  {
    inn: 'Desloratadine',
    koreanBaseName: '데스로라타딘',
    koreanSynonyms: ['데스로라타딘'],
    englishSynonyms: ['desloratadine'],
    durSearchKeyword: '데스로라타딘',
    representativeProductKeyword: '에리우스정'
  },
  {
    inn: 'Fexofenadine',
    koreanBaseName: '펙소페나딘',
    koreanSynonyms: ['펙소페나딘', '펙소페나딘염산염'],
    englishSynonyms: ['fexofenadine', 'fexofenadine hydrochloride'],
    durSearchKeyword: '펙소페나딘',
    representativeProductKeyword: '알레그라정'
  },
  {
    inn: 'Olopatadine',
    koreanBaseName: '올로파타딘',
    koreanSynonyms: ['올로파타딘', '올로파타딘염산염'],
    englishSynonyms: ['olopatadine', 'olopatadine hydrochloride'],
    durSearchKeyword: '올로파타딘',
    representativeProductKeyword: '파타놀'
  },
  {
    inn: 'Diphenhydramine',
    koreanBaseName: '디펜히드라민',
    koreanSynonyms: ['디펜히드라민', '디펜히드라민염산염'],
    englishSynonyms: ['diphenhydramine', 'diphenhydramine hydrochloride'],
    durSearchKeyword: '디펜히드라민',
    representativeProductKeyword: '슬리펠정'
  },
  {
    inn: 'Doxylamine',
    koreanBaseName: '독실아민',
    koreanSynonyms: ['독실아민', '독실아민숙신산염'],
    englishSynonyms: ['doxylamine', 'doxylamine succinate'],
    durSearchKeyword: '독실아민',
    representativeProductKeyword: '아론정'
  },
  {
    inn: 'Ampicillin',
    koreanBaseName: '암피실린',
    koreanSynonyms: ['암피실린', '암피실린수화물', '암피실린나트륨'],
    englishSynonyms: ['ampicillin', 'ampicillin hydrate', 'ampicillin sodium'],
    durSearchKeyword: '암피실린',
    representativeProductKeyword: '암피실린'
  },
  {
    inn: 'Cephalexin',
    koreanBaseName: '세팔렉신',
    koreanSynonyms: ['세팔렉신', '세팔렉신수화물'],
    englishSynonyms: ['cephalexin', 'cephalexin hydrate', 'cefalexin'],
    durSearchKeyword: '세팔렉신',
    representativeProductKeyword: '세팔렉신'
  },
  {
    inn: 'Cefaclor',
    koreanBaseName: '세파클러',
    koreanSynonyms: ['세파클러', '세파클러수화물'],
    englishSynonyms: ['cefaclor', 'cefaclor hydrate'],
    durSearchKeyword: '세파클러',
    representativeProductKeyword: '세파클러캡슐'
  },
  {
    inn: 'Cefdinir',
    koreanBaseName: '세프디니르',
    koreanSynonyms: ['세프디니르'],
    englishSynonyms: ['cefdinir'],
    durSearchKeyword: '세프디니르',
    representativeProductKeyword: '옴니세프캡슐'
  },
  {
    inn: 'Cefuroxime',
    koreanBaseName: '세푸록심',
    koreanSynonyms: ['세푸록심', '세푸록심악세틸', '세푸록심나트륨'],
    englishSynonyms: ['cefuroxime', 'cefuroxime axetil', 'cefuroxime sodium'],
    durSearchKeyword: '세푸록심',
    representativeProductKeyword: '진세프정'
  },
  {
    inn: 'Azithromycin',
    koreanBaseName: '아지트로마이신',
    koreanSynonyms: ['아지트로마이신', '아지트로마이신수화물', '아지트로마이신이수화물'],
    englishSynonyms: ['azithromycin', 'azithromycin hydrate', 'azithromycin dihydrate'],
    durSearchKeyword: '아지트로마이신',
    representativeProductKeyword: '지스로맥스정'
  },
  {
    inn: 'Clarithromycin',
    koreanBaseName: '클래리트로마이신',
    koreanSynonyms: ['클래리트로마이신', '클라리스로마이신'],
    englishSynonyms: ['clarithromycin'],
    durSearchKeyword: '클래리트로마이신',
    representativeProductKeyword: '클래리시드필름코팅정'
  },
  {
    inn: 'Erythromycin',
    koreanBaseName: '에리스로마이신',
    koreanSynonyms: ['에리스로마이신', '에리스로마이신스테아르산염', '에리스로마이신에스톨산염'],
    englishSynonyms: ['erythromycin', 'erythromycin stearate'],
    durSearchKeyword: '에리스로마이신',
    representativeProductKeyword: '에리스로마이신'
  },
  {
    inn: 'Ciprofloxacin',
    koreanBaseName: '시프로플록사신',
    koreanSynonyms: ['시프로플록사신', '시프로플록사신염산염', '시프로플록사신염산염수화물'],
    englishSynonyms: ['ciprofloxacin', 'ciprofloxacin hydrochloride', 'ciprofloxacin hydrochloride hydrate'],
    durSearchKeyword: '시프로플록사신',
    representativeProductKeyword: '시프로바이정'
  },
  {
    inn: 'Levofloxacin',
    koreanBaseName: '레보플록사신',
    koreanSynonyms: ['레보플록사신', '레보플록사신수화물'],
    englishSynonyms: ['levofloxacin', 'levofloxacin hydrate', 'levofloxacin hemihydrate'],
    durSearchKeyword: '레보플록사신',
    representativeProductKeyword: '크라비트정'
  },
  {
    inn: 'Ofloxacin',
    koreanBaseName: '오플록사신',
    koreanSynonyms: ['오플록사신'],
    englishSynonyms: ['ofloxacin'],
    durSearchKeyword: '오플록사신',
    representativeProductKeyword: '타리비드정'
  },
  {
    inn: 'Metronidazole',
    koreanBaseName: '메트로니다졸',
    koreanSynonyms: ['메트로니다졸'],
    englishSynonyms: ['metronidazole'],
    durSearchKeyword: '메트로니다졸',
    representativeProductKeyword: '후라시닐정'
  },
  {
    inn: 'Doxycycline',
    koreanBaseName: '독시사이클린',
    koreanSynonyms: ['독시사이클린', '독시사이클린수화물', '독시사이클린하이클레이트'],
    englishSynonyms: ['doxycycline', 'doxycycline hydrate', 'doxycycline hyclate', 'doxycycline monohydrate'],
    durSearchKeyword: '독시사이클린',
    representativeProductKeyword: '바이브라마이신'
  },
  {
    inn: 'Tetracycline',
    koreanBaseName: '테트라사이클린',
    koreanSynonyms: ['테트라사이클린', '테트라사이클린염산염'],
    englishSynonyms: ['tetracycline', 'tetracycline hydrochloride'],
    durSearchKeyword: '테트라사이클린',
    representativeProductKeyword: '테트라사이클린'
  },
  {
    inn: 'Fluconazole',
    koreanBaseName: '플루코나졸',
    koreanSynonyms: ['플루코나졸'],
    englishSynonyms: ['fluconazole'],
    durSearchKeyword: '플루코나졸',
    representativeProductKeyword: '디푸루칸캡슐'
  },
  {
    inn: 'Itraconazole',
    koreanBaseName: '이트라코나졸',
    koreanSynonyms: ['이트라코나졸', '이트라코나졸고체분산체'],
    englishSynonyms: ['itraconazole'],
    durSearchKeyword: '이트라코나졸',
    representativeProductKeyword: '스포라녹스캡슐'
  },
  {
    inn: 'Terbinafine',
    koreanBaseName: '테르비나핀',
    koreanSynonyms: ['테르비나핀', '테르비나핀염산염'],
    englishSynonyms: ['terbinafine', 'terbinafine hydrochloride'],
    durSearchKeyword: '테르비나핀',
    representativeProductKeyword: '라미실정'
  },
  {
    inn: 'Acyclovir',
    koreanBaseName: '아시클로버',
    koreanSynonyms: ['아시클로버'],
    englishSynonyms: ['acyclovir', 'aciclovir'],
    durSearchKeyword: '아시클로버',
    representativeProductKeyword: '조비락스정'
  },
  {
    inn: 'Valacyclovir',
    koreanBaseName: '발라시클로버',
    koreanSynonyms: ['발라시클로버', '발라시클로버염산염', '발라시클로버염산염수화물'],
    englishSynonyms: ['valacyclovir', 'valacyclovir hydrochloride', 'valaciclovir'],
    durSearchKeyword: '발라시클로버',
    representativeProductKeyword: '발트렉스정'
  },
  {
    inn: 'Oseltamivir',
    koreanBaseName: '오셀타미비르',
    koreanSynonyms: ['오셀타미비르', '오셀타미비르인산염'],
    englishSynonyms: ['oseltamivir', 'oseltamivir phosphate'],
    durSearchKeyword: '오셀타미비르',
    representativeProductKeyword: '타미플루캡슐'
  },
  {
    inn: 'Prednisolone',
    koreanBaseName: '프레드니솔론',
    koreanSynonyms: ['프레드니솔론', '프레드니솔론아세테이트'],
    englishSynonyms: ['prednisolone', 'prednisolone acetate'],
    durSearchKeyword: '프레드니솔론',
    representativeProductKeyword: '소론도정'
  },
  {
    inn: 'Methylprednisolone',
    koreanBaseName: '메틸프레드니솔론',
    koreanSynonyms: ['메틸프레드니솔론'],
    englishSynonyms: ['methylprednisolone'],
    durSearchKeyword: '메틸프레드니솔론',
    representativeProductKeyword: '메디솔론정'
  },
  {
    inn: 'Dexamethasone',
    koreanBaseName: '덱사메타손',
    koreanSynonyms: ['덱사메타손', '덱사메타손포스페이트이나트륨'],
    englishSynonyms: ['dexamethasone', 'dexamethasone sodium phosphate'],
    durSearchKeyword: '덱사메타손',
    representativeProductKeyword: '덱사메타손정'
  },
  {
    inn: 'Montelukast',
    koreanBaseName: '몬테루카스트',
    koreanSynonyms: ['몬테루카스트', '몬테루카스트나트륨'],
    englishSynonyms: ['montelukast', 'montelukast sodium'],
    durSearchKeyword: '몬테루카스트',
    representativeProductKeyword: '싱귤레어정'
  },
  {
    inn: 'Salbutamol',
    koreanBaseName: '살부타몰',
    koreanSynonyms: ['살부타몰', '살부타몰황산염', '알부테롤'],
    englishSynonyms: ['salbutamol', 'salbutamol sulfate', 'albuterol', 'albuterol sulfate'],
    durSearchKeyword: '살부타몰',
    representativeProductKeyword: '벤토린에보할러'
  },
  {
    inn: 'Budesonide',
    koreanBaseName: '부데소니드',
    koreanSynonyms: ['부데소니드', '미분화부데소니드'],
    englishSynonyms: ['budesonide'],
    durSearchKeyword: '부데소니드',
    representativeProductKeyword: '풀미코트'
  },
  {
    inn: 'Famotidine',
    koreanBaseName: '파모티딘',
    koreanSynonyms: ['파모티딘'],
    englishSynonyms: ['famotidine'],
    durSearchKeyword: '파모티딘',
    representativeProductKeyword: '가스터정'
  },
  {
    inn: 'Cimetidine',
    koreanBaseName: '시메티딘',
    koreanSynonyms: ['시메티딘'],
    englishSynonyms: ['cimetidine'],
    durSearchKeyword: '시메티딘',
    representativeProductKeyword: '타가메트정'
  },
  {
    inn: 'Omeprazole',
    koreanBaseName: '오메프라졸',
    koreanSynonyms: ['오메프라졸', '오메프라졸장용과립'],
    englishSynonyms: ['omeprazole'],
    durSearchKeyword: '오메프라졸',
    representativeProductKeyword: '로섹캡슐'
  },
  {
    inn: 'Esomeprazole',
    koreanBaseName: '에소메프라졸',
    koreanSynonyms: [
      '에소메프라졸',
      '에소메프라졸마그네슘',
      '에소메프라졸마그네슘삼수화물',
      '에소메프라졸마그네슘이수화물',
      '에소메프라졸스트론튬사수화물'
    ],
    englishSynonyms: [
      'esomeprazole',
      'esomeprazole magnesium',
      'esomeprazole magnesium trihydrate',
      'esomeprazole strontium'
    ],
    durSearchKeyword: '에소메프라졸',
    representativeProductKeyword: '넥시움정'
  },
  {
    inn: 'Lansoprazole',
    koreanBaseName: '란소프라졸',
    koreanSynonyms: ['란소프라졸', '란소프라졸장용과립'],
    englishSynonyms: ['lansoprazole'],
    durSearchKeyword: '란소프라졸',
    representativeProductKeyword: '란스톤캡슐'
  },
  {
    inn: 'Rabeprazole',
    koreanBaseName: '라베프라졸',
    koreanSynonyms: ['라베프라졸', '라베프라졸나트륨'],
    englishSynonyms: ['rabeprazole', 'rabeprazole sodium'],
    durSearchKeyword: '라베프라졸',
    representativeProductKeyword: '파리에트정'
  },
  {
    inn: 'Pantoprazole',
    koreanBaseName: '판토프라졸',
    koreanSynonyms: ['판토프라졸', '판토프라졸나트륨', '판토프라졸나트륨세스키히드레이트'],
    englishSynonyms: ['pantoprazole', 'pantoprazole sodium', 'pantoprazole sodium sesquihydrate'],
    durSearchKeyword: '판토프라졸',
    representativeProductKeyword: '판토록정'
  },
  {
    inn: 'Sucralfate',
    koreanBaseName: '수크랄페이트',
    koreanSynonyms: ['수크랄페이트', '수크랄페이트수화물'],
    englishSynonyms: ['sucralfate', 'sucralfate hydrate'],
    durSearchKeyword: '수크랄페이트',
    representativeProductKeyword: '아루사루민'
  },
  {
    inn: 'Domperidone',
    koreanBaseName: '돔페리돈',
    koreanSynonyms: ['돔페리돈', '돔페리돈말레산염'],
    englishSynonyms: ['domperidone', 'domperidone maleate'],
    durSearchKeyword: '돔페리돈',
    representativeProductKeyword: '모티리움엠정'
  },
  {
    inn: 'Metoclopramide',
    koreanBaseName: '메토클로프라미드',
    koreanSynonyms: ['메토클로프라미드', '메토클로프라미드염산염', '메토클로프라미드염산염수화물'],
    englishSynonyms: ['metoclopramide', 'metoclopramide hydrochloride'],
    durSearchKeyword: '메토클로프라미드',
    representativeProductKeyword: '맥페란정'
  },
  {
    inn: 'Ondansetron',
    koreanBaseName: '온단세트론',
    koreanSynonyms: ['온단세트론', '온단세트론염산염', '온단세트론염산염수화물'],
    englishSynonyms: ['ondansetron', 'ondansetron hydrochloride', 'ondansetron hydrochloride dihydrate'],
    durSearchKeyword: '온단세트론',
    representativeProductKeyword: '조프란정'
  },
  {
    inn: 'Loperamide',
    koreanBaseName: '로페라미드',
    koreanSynonyms: ['로페라미드', '로페라미드염산염'],
    englishSynonyms: ['loperamide', 'loperamide hydrochloride'],
    durSearchKeyword: '로페라미드',
    representativeProductKeyword: '로페민캡슐'
  },
  {
    inn: 'Bisacodyl',
    koreanBaseName: '비사코딜',
    koreanSynonyms: ['비사코딜'],
    englishSynonyms: ['bisacodyl'],
    durSearchKeyword: '비사코딜',
    representativeProductKeyword: '둘코락스'
  },
  {
    inn: 'Metformin',
    koreanBaseName: '메트포르민',
    koreanSynonyms: ['메트포르민', '메트포르민염산염'],
    englishSynonyms: ['metformin', 'metformin hydrochloride'],
    durSearchKeyword: '메트포르민',
    representativeProductKeyword: '다이아벡스정'
  },
  {
    inn: 'Levothyroxine',
    koreanBaseName: '레보티록신',
    koreanSynonyms: ['레보티록신', '레보티록신나트륨', '레보티록신나트륨수화물'],
    englishSynonyms: ['levothyroxine', 'levothyroxine sodium', 'levothyroxine sodium hydrate'],
    durSearchKeyword: '레보티록신',
    representativeProductKeyword: '씬지로이드정'
  },
  {
    inn: 'Propylthiouracil',
    koreanBaseName: '프로필티오우라실',
    koreanSynonyms: ['프로필티오우라실'],
    englishSynonyms: ['propylthiouracil'],
    durSearchKeyword: '프로필티오우라실',
    representativeProductKeyword: '안티로이드정'
  },
  {
    inn: 'Methimazole',
    koreanBaseName: '메티마졸',
    koreanSynonyms: ['메티마졸'],
    englishSynonyms: ['methimazole', 'thiamazole'],
    durSearchKeyword: '메티마졸',
    representativeProductKeyword: '메티마졸정'
  },
  {
    inn: 'Labetalol',
    koreanBaseName: '라베타롤',
    koreanSynonyms: ['라베타롤', '라베타롤염산염'],
    englishSynonyms: ['labetalol', 'labetalol hydrochloride'],
    durSearchKeyword: '라베타롤',
    representativeProductKeyword: '트란데이트'
  },
  {
    inn: 'Nifedipine',
    koreanBaseName: '니페디핀',
    koreanSynonyms: ['니페디핀'],
    englishSynonyms: ['nifedipine'],
    durSearchKeyword: '니페디핀',
    representativeProductKeyword: '아달라트오로스정'
  },
  {
    inn: 'Amlodipine',
    koreanBaseName: '암로디핀',
    koreanSynonyms: ['암로디핀', '암로디핀베실산염', '암로디핀캄실산염', '암로디핀말레산염', '에스암로디핀베실산염'],
    englishSynonyms: ['amlodipine', 'amlodipine besylate', 'amlodipine camsylate', 's-amlodipine'],
    durSearchKeyword: '암로디핀',
    representativeProductKeyword: '노바스크정'
  },
  {
    inn: 'Losartan',
    koreanBaseName: '로사르탄',
    koreanSynonyms: ['로사르탄', '로사르탄칼륨'],
    englishSynonyms: ['losartan', 'losartan potassium'],
    durSearchKeyword: '로사르탄',
    representativeProductKeyword: '코자정'
  },
  {
    inn: 'Valsartan',
    koreanBaseName: '발사르탄',
    koreanSynonyms: ['발사르탄'],
    englishSynonyms: ['valsartan'],
    durSearchKeyword: '발사르탄',
    representativeProductKeyword: '디오반필름코팅정'
  },
  {
    inn: 'Enalapril',
    koreanBaseName: '에날라프릴',
    koreanSynonyms: ['에날라프릴', '에날라프릴말레산염'],
    englishSynonyms: ['enalapril', 'enalapril maleate'],
    durSearchKeyword: '에날라프릴',
    representativeProductKeyword: '레니텍정'
  },
  {
    inn: 'Atorvastatin',
    koreanBaseName: '아토르바스타틴',
    koreanSynonyms: ['아토르바스타틴', '아토르바스타틴칼슘', '아토르바스타틴칼슘수화물', '아토르바스타틴칼슘삼수화물'],
    englishSynonyms: ['atorvastatin', 'atorvastatin calcium', 'atorvastatin calcium trihydrate'],
    durSearchKeyword: '아토르바스타틴',
    representativeProductKeyword: '리피토정'
  },
  {
    inn: 'Rosuvastatin',
    koreanBaseName: '로수바스타틴',
    koreanSynonyms: ['로수바스타틴', '로수바스타틴칼슘'],
    englishSynonyms: ['rosuvastatin', 'rosuvastatin calcium'],
    durSearchKeyword: '로수바스타틴',
    representativeProductKeyword: '크레스토정'
  },
  {
    inn: 'Simvastatin',
    koreanBaseName: '심바스타틴',
    koreanSynonyms: ['심바스타틴'],
    englishSynonyms: ['simvastatin'],
    durSearchKeyword: '심바스타틴',
    representativeProductKeyword: '조코정'
  },
  {
    inn: 'Sertraline',
    koreanBaseName: '설트랄린',
    koreanSynonyms: ['설트랄린', '설트랄린염산염'],
    englishSynonyms: ['sertraline', 'sertraline hydrochloride'],
    durSearchKeyword: '설트랄린',
    representativeProductKeyword: '졸로푸트정'
  },
  {
    inn: 'Escitalopram',
    koreanBaseName: '에스시탈로프람',
    koreanSynonyms: ['에스시탈로프람', '에스시탈로프람옥살산염'],
    englishSynonyms: ['escitalopram', 'escitalopram oxalate'],
    durSearchKeyword: '에스시탈로프람',
    representativeProductKeyword: '렉사프로정'
  },
  {
    inn: 'Fluoxetine',
    koreanBaseName: '플루옥세틴',
    koreanSynonyms: ['플루옥세틴', '플루옥세틴염산염'],
    englishSynonyms: ['fluoxetine', 'fluoxetine hydrochloride'],
    durSearchKeyword: '플루옥세틴',
    representativeProductKeyword: '프로작캡슐'
  },
  {
    inn: 'Paroxetine',
    koreanBaseName: '파록세틴',
    koreanSynonyms: ['파록세틴', '파록세틴염산염', '파록세틴염산염수화물'],
    englishSynonyms: ['paroxetine', 'paroxetine hydrochloride', 'paroxetine hydrochloride hemihydrate'],
    durSearchKeyword: '파록세틴',
    representativeProductKeyword: '팍실'
  },
  {
    inn: 'Zolpidem',
    koreanBaseName: '졸피뎀',
    koreanSynonyms: ['졸피뎀', '졸피뎀타르타르산염'],
    englishSynonyms: ['zolpidem', 'zolpidem tartrate'],
    durSearchKeyword: '졸피뎀',
    representativeProductKeyword: '스틸녹스정'
  },
  {
    inn: 'Alprazolam',
    koreanBaseName: '알프라졸람',
    koreanSynonyms: ['알프라졸람'],
    englishSynonyms: ['alprazolam'],
    durSearchKeyword: '알프라졸람',
    representativeProductKeyword: '자낙스정'
  },
  {
    inn: 'Diazepam',
    koreanBaseName: '디아제팜',
    koreanSynonyms: ['디아제팜'],
    englishSynonyms: ['diazepam'],
    durSearchKeyword: '디아제팜',
    representativeProductKeyword: '바리움정'
  },
  {
    inn: 'Sumatriptan',
    koreanBaseName: '수마트립탄',
    koreanSynonyms: ['수마트립탄', '수마트립탄숙신산염'],
    englishSynonyms: ['sumatriptan', 'sumatriptan succinate'],
    durSearchKeyword: '수마트립탄',
    representativeProductKeyword: '이미그란정'
  },
  {
    inn: 'Lamotrigine',
    koreanBaseName: '라모트리진',
    koreanSynonyms: ['라모트리진'],
    englishSynonyms: ['lamotrigine'],
    durSearchKeyword: '라모트리진',
    representativeProductKeyword: '라믹탈정'
  },
  {
    inn: 'Levetiracetam',
    koreanBaseName: '레베티라세탐',
    koreanSynonyms: ['레베티라세탐'],
    englishSynonyms: ['levetiracetam'],
    durSearchKeyword: '레베티라세탐',
    representativeProductKeyword: '케프라정'
  },
  {
    inn: 'Carbamazepine',
    koreanBaseName: '카르바마제핀',
    koreanSynonyms: ['카르바마제핀'],
    englishSynonyms: ['carbamazepine'],
    durSearchKeyword: '카르바마제핀',
    representativeProductKeyword: '테그레톨'
  },
  {
    inn: 'Valproic Acid',
    koreanBaseName: '발프로산',
    koreanSynonyms: ['발프로산', '발프로산나트륨', '디발프로엑스나트륨'],
    englishSynonyms: ['valproic acid', 'sodium valproate', 'divalproex sodium'],
    durSearchKeyword: '발프로산',
    representativeProductKeyword: '데파킨'
  },
  {
    inn: 'Topiramate',
    koreanBaseName: '토피라메이트',
    koreanSynonyms: ['토피라메이트'],
    englishSynonyms: ['topiramate'],
    durSearchKeyword: '토피라메이트',
    representativeProductKeyword: '토파맥스정'
  },
  {
    inn: 'Isotretinoin',
    koreanBaseName: '이소트레티노인',
    koreanSynonyms: ['이소트레티노인'],
    englishSynonyms: ['isotretinoin'],
    durSearchKeyword: '이소트레티노인',
    representativeProductKeyword: '로아큐탄캡슐'
  },
  {
    inn: 'Finasteride',
    koreanBaseName: '피나스테리드',
    koreanSynonyms: ['피나스테리드'],
    englishSynonyms: ['finasteride'],
    durSearchKeyword: '피나스테리드',
    representativeProductKeyword: '프로페시아정'
  },
  {
    inn: 'Dutasteride',
    koreanBaseName: '두타스테리드',
    koreanSynonyms: ['두타스테리드'],
    englishSynonyms: ['dutasteride'],
    durSearchKeyword: '두타스테리드',
    representativeProductKeyword: '아보다트연질캡슐'
  },
  {
    inn: 'Warfarin',
    koreanBaseName: '와파린',
    koreanSynonyms: ['와파린', '와파린나트륨', '와파린나트륨클라트레이트'],
    englishSynonyms: ['warfarin', 'warfarin sodium'],
    durSearchKeyword: '와파린',
    representativeProductKeyword: '쿠마딘정'
  },
  {
    inn: 'Misoprostol',
    koreanBaseName: '미소프로스톨',
    koreanSynonyms: ['미소프로스톨', '미소프로스톨분산체'],
    englishSynonyms: ['misoprostol'],
    durSearchKeyword: '미소프로스톨',
    representativeProductKeyword: '싸이토텍정'
  },
  {
    inn: 'Methotrexate',
    koreanBaseName: '메토트렉세이트',
    koreanSynonyms: ['메토트렉세이트', '메토트렉세이트나트륨'],
    englishSynonyms: ['methotrexate', 'methotrexate sodium'],
    durSearchKeyword: '메토트렉세이트',
    representativeProductKeyword: '메토트렉세이트정'
  },
  {
    inn: 'Pyridoxine',
    koreanBaseName: '피리독신',
    koreanSynonyms: ['피리독신', '피리독신염산염', '피리독살포스페이트수화물'],
    englishSynonyms: ['pyridoxine', 'pyridoxine hydrochloride', 'vitamin b6'],
    durSearchKeyword: '피리독신',
    representativeProductKeyword: '피리독신'
  },
  {
    inn: 'Folic Acid',
    koreanBaseName: '폴산',
    koreanSynonyms: ['폴산', '엽산'],
    englishSynonyms: ['folic acid', 'folate'],
    durSearchKeyword: '폴산',
    representativeProductKeyword: '폴산정'
  }
];

export function cleanIngrToken(raw: string): string {
  return raw
    .replace(/\[M[0-9]+\]/gi, '')
    .replace(/\([^)]*역가[^)]*\)/g, '')
    .replace(/밀리그램|밀리그람|마이크로그램|그램|아이\.유/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * 검색어가 한글 성분명 또는 영문 성분명인지 확인하여 대응하는 CrosswalkEntry 반환
 */
export function findCrosswalkBySearchQuery(query: string): CrosswalkEntry | null {
  const qNorm = cleanIngrToken(query);
  if (!qNorm) return null;

  // 1. 정확 일치
  for (const entry of INGREDIENT_CROSSWALK_TABLE) {
    if (
      cleanIngrToken(entry.inn) === qNorm ||
      cleanIngrToken(entry.koreanBaseName) === qNorm ||
      entry.koreanSynonyms.some((s) => cleanIngrToken(s) === qNorm) ||
      entry.englishSynonyms.some((s) => cleanIngrToken(s) === qNorm)
    ) {
      return entry;
    }
  }

  // 2. 부분 일치 (성분명 3자 이상)
  if (qNorm.length >= 3) {
    for (const entry of INGREDIENT_CROSSWALK_TABLE) {
      if (
        cleanIngrToken(entry.inn).includes(qNorm) ||
        cleanIngrToken(entry.koreanBaseName).includes(qNorm) ||
        entry.koreanSynonyms.some((s) => cleanIngrToken(s).includes(qNorm)) ||
        entry.englishSynonyms.some((s) => cleanIngrToken(s).includes(qNorm))
      ) {
        return entry;
      }
    }
  }

  return null;
}

export const KOR_SALT_SUFFIX_RE =
  /(?:프록세틸|악세틸|아세틸|피복실|메독소밀|실렉세틸|염산염|이염산염|일염산염|삼염산염|무수염산염|황산수소염|황산염|말레산염|말레인산염|푸마르산염|숙신산염|호박산염|타르타르산염|주석산염|중주석산염|구연산염|시트르산염|메실산염|베실산염|캄실산염|토실산염|에실산염|나파디실산염|에디실산염|인산염|질산염|아세트산염|초산염|글루콘산염|프로피온산염|디프로피온산염|발레르산염|부티르산염|브롬화수소산염|이나트륨|삼나트륨|나트륨|칼륨|칼슘|마그네슘|아연|알루미늄|일수화물|이수화물|삼수화물|사수화물|오수화물|반수화물|무수물|수화물|미분화|제피세립|제피|혼합분말)+$/;

export const ENG_SALT_WORDS = new Set([
  'proxetil', 'axetil', 'pivoxil', 'medoxomil', 'cilexetil', 'ester', 'ethyl', 'methyl',
  'hydrochloride', 'dihydrochloride', 'monohydrochloride', 'trihydrochloride', 'hcl',
  'sulfate', 'sulphate', 'bisulfate', 'hemisulfate', 'disulfate',
  'maleate', 'fumarate', 'succinate', 'tartrate', 'bitartrate', 'citrate',
  'mesylate', 'besylate', 'camsylate', 'tosylate', 'esylate', 'napadisylate', 'edisylate',
  'phosphate', 'nitrate', 'acetate', 'gluconate', 'propionate', 'dipropionate', 'valerate', 'butyrate', 'hydrobromide',
  'sodium', 'disodium', 'trisodium', 'potassium', 'calcium', 'magnesium', 'zinc', 'aluminum',
  'hydrate', 'monohydrate', 'dihydrate', 'trihydrate', 'tetrahydrate', 'pentahydrate', 'hemihydrate', 'sesquihydrate', 'anhydrous',
  'micronized', 'encapsulated'
]);

/**
 * 성분명에서 염(Salt), 수화물(Hydrate), 프로드러그 에스테르(Ester Prodrug)를 분리하여 주성분(Base Active Ingredient) 추출
 */
export function stripSaltsAndEsters(korName: string, engName?: string): {
  rawKor: string;
  rawEng: string;
  baseKor: string;
  baseEng: string;
  strippedKorPart: string;
  strippedEngWords: string;
} {
  const cleanKor = (korName || '').replace(/\[M[0-9]+\]/gi, '').trim();
  const cleanEng = (engName || '').replace(/\[M[0-9]+\]/gi, '').trim();

  // 1. 영문 성분명 우측에서 염/에스테르 단어 분리
  const engTokens = cleanEng.split(/\s+/).filter(Boolean);
  const strippedEngWords: string[] = [];
  while (engTokens.length > 1) {
    const lastWord = engTokens[engTokens.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ENG_SALT_WORDS.has(lastWord)) {
      strippedEngWords.unshift(engTokens.pop()!);
    } else {
      break;
    }
  }
  const baseEng = engTokens.join(' ');

  // 2. 한글 성분명 말미에서 염/에스테르 접미사 분리
  let strippedKorPart = '';
  const korMatch = cleanKor.match(KOR_SALT_SUFFIX_RE);
  let baseKor = cleanKor;
  if (korMatch && korMatch.index !== undefined && korMatch.index >= 2) {
    strippedKorPart = korMatch[0];
    baseKor = cleanKor.slice(0, korMatch.index);
  }

  return {
    rawKor: cleanKor,
    rawEng: cleanEng,
    baseKor,
    baseEng,
    strippedKorPart,
    strippedEngWords: strippedEngWords.join(' ')
  };
}

/**
 * 국내 식약처 원문 성분명(한글/영문)을 해외 표준 성분(INN)과 매칭하고,
 * 염(Salt), 제형, 투여경로 및 매칭 확실성(EXACT / SALT_MAPPED / UNCERTAIN / UNMATCHED)을 판별
 */
export function matchDomesticIngredientToOverseasInn(params: {
  koreanName: string;
  englishName?: string;
  amountText?: string;
  dosageForm: string;
  route: string;
}): DomesticIngredientItem {
  const korRaw = (params.koreanName || '').replace(/\[M[0-9]+\]/gi, '').trim();
  const engRaw = (params.englishName || '').replace(/\[M[0-9]+\]/gi, '').trim();
  const korNorm = cleanIngrToken(korRaw);
  const engNorm = cleanIngrToken(engRaw);

  // 생약 추출물·엑스·틴크·건조효모 등은 단일 화학성분 해외 DB와 1:1 매칭이 불확실하므로 UNCERTAIN 처리
  if (/엑스|추출물|틴크|류코노스톡|건조효모|우황|감초|길경|반하|마황|작약|당귀|천궁|시호|황금/.test(korRaw)) {
    return {
      koreanName: korRaw,
      englishName: engRaw,
      matchedInn: null,
      amountText: params.amountText || '',
      dosageForm: params.dosageForm,
      route: params.route,
      saltOrFormNote: '생약/추출물/복합원료 성분',
      matchConfidence: 'UNCERTAIN',
      matchWarningNote:
        '생약·추출물 원료는 해외 단일 화학성분 분류(TGA/LactMed)와 1:1 성분 매칭이 불확실하므로 해외 등급을 표시하지 않습니다.'
    };
  }

  // 1. 한국어 원료성분명(korNorm) 기반 1순위 매칭 (국내 의약품 허가자료 기준)
  if (korNorm) {
    for (const entry of INGREDIENT_CROSSWALK_TABLE) {
      const isBaseExact = korNorm === cleanIngrToken(entry.koreanBaseName);
      const isSaltMatched = entry.koreanSynonyms.some((s) => cleanIngrToken(s) === korNorm);

      if (isBaseExact || isSaltMatched) {
        const confidence: IngredientMatchConfidence = isBaseExact ? 'EXACT' : 'SALT_MAPPED';
        const saltNote =
          !isBaseExact && korRaw !== entry.koreanBaseName
            ? `원료 염/프로드러그 형태(${korRaw})에서 유효 주성분(${entry.inn}) 기준으로 매칭됨`
            : undefined;

        // 인자로 전달된 영문명이 해당 entry(동의어 포함)와 일치하는지 검증
        let resolvedEng = engRaw;
        const engMatches =
          engNorm &&
          (engNorm === cleanIngrToken(entry.inn) ||
            entry.englishSynonyms.some((s) => cleanIngrToken(s) === engNorm));

        if (!engMatches) {
          // engRaw가 비어있거나 엉뚱한 성분명(예: 타 성분 인덱스 혼입)인 경우,
          // korRaw의 염 형태에 맞는 최적의 공식 영문명을 설정
          if (/염산염|디히드로클로라이드/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Hydrochloride`;
          } else if (/나트륨/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Sodium`;
          } else if (/칼륨/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Potassium`;
          } else if (/말레산염/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Maleate`;
          } else if (/푸마르산염/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Fumarate`;
          } else if (/황산염/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Sulfate`;
          } else if (/인산염/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Phosphate`;
          } else if (/타르타르산염|주석산염/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Tartrate`;
          } else if (/브롬화수소산염/i.test(korRaw)) {
            resolvedEng = `${entry.inn} Hydrobromide`;
          } else {
            resolvedEng = entry.inn;
          }
        }

        return {
          koreanName: korRaw,
          englishName: resolvedEng,
          matchedInn: entry.inn,
          amountText: params.amountText || '',
          dosageForm: params.dosageForm,
          route: params.route,
          saltOrFormNote: saltNote,
          matchConfidence: confidence
        };
      }
    }
  }

  // 1-2. 한국어 명칭이 없거나 한국어로 매칭되지 않은 경우, 영문명(engNorm)으로 단독 매칭
  if (!korNorm && engNorm) {
    for (const entry of INGREDIENT_CROSSWALK_TABLE) {
      const isBaseExact = engNorm === cleanIngrToken(entry.inn);
      const isSaltMatched = entry.englishSynonyms.some((s) => cleanIngrToken(s) === engNorm);

      if (isBaseExact || isSaltMatched) {
        return {
          koreanName: korRaw || entry.koreanBaseName,
          englishName: engRaw || entry.inn,
          matchedInn: entry.inn,
          amountText: params.amountText || '',
          dosageForm: params.dosageForm,
          route: params.route,
          saltOrFormNote: !isBaseExact ? `영문 염 형태(${engRaw})에서 유효 주성분(${entry.inn}) 기준으로 매칭됨` : undefined,
          matchConfidence: isBaseExact ? 'EXACT' : 'SALT_MAPPED'
        };
      }
    }
  }

  // 2. 염/에스테르/프로드러그 제거 후 주성분(Base Active INN) 기준 매칭
  const stripped = stripSaltsAndEsters(korRaw, engRaw);
  const baseKorNorm = cleanIngrToken(stripped.baseKor);
  const baseEngNorm = cleanIngrToken(stripped.baseEng);

  if (stripped.strippedKorPart || stripped.strippedEngWords) {
    for (const entry of INGREDIENT_CROSSWALK_TABLE) {
      const entryKorNorm = cleanIngrToken(entry.koreanBaseName);
      const entryInnNorm = cleanIngrToken(entry.inn);

      if (baseKorNorm ? baseKorNorm === entryKorNorm : (baseEngNorm && baseEngNorm === entryInnNorm)) {
        const removedDescr = [stripped.strippedKorPart, stripped.strippedEngWords].filter(Boolean).join(' / ');
        let resolvedEng = engRaw;
        const engMatches =
          engNorm &&
          (engNorm === cleanIngrToken(entry.inn) ||
            entry.englishSynonyms.some((s) => cleanIngrToken(s) === engNorm));
        if (!engMatches) {
          resolvedEng = entry.inn;
        }

        return {
          koreanName: korRaw,
          englishName: resolvedEng,
          matchedInn: entry.inn,
          amountText: params.amountText || '',
          dosageForm: params.dosageForm,
          route: params.route,
          saltOrFormNote: `원료 형태(${korRaw})에서 염·에스테르(${removedDescr})를 분리하여 유효 주성분(${entry.inn}) 기준으로 매칭됨`,
          matchConfidence: 'SALT_MAPPED'
        };
      }
    }
  }

  // 3. 외용 유도체 등 약리 기전이 상이한 예외 항목 UNCERTAIN 처리
  if (korRaw.includes('이부프로펜피코놀') || engNorm.includes('ibuprofenpiconol')) {
    return {
      koreanName: korRaw,
      englishName: engRaw || 'Ibuprofen Piconol',
      matchedInn: null,
      amountText: params.amountText || '',
      dosageForm: params.dosageForm,
      route: params.route,
      saltOrFormNote: '이부프로펜 유도체(이부프로펜피코놀)',
      matchConfidence: 'UNCERTAIN',
      matchWarningNote:
        '이부프로펜피코놀(외용 유도체)은 경구 Ibuprofen과 화학 구조 및 적용 기준이 달라 성분 매칭 불확실로 처리하며 해외 TGA 등급을 임의 표시하지 않습니다.'
    };
  }

  // 4. 일반적인 염·수화물·프로드러그 접미사 포함 여부 확인
  for (const entry of INGREDIENT_CROSSWALK_TABLE) {
    const baseKor = cleanIngrToken(entry.koreanBaseName);
    const baseEng = cleanIngrToken(entry.inn);
    if (
      (baseKor.length >= 3 && korNorm.startsWith(baseKor)) ||
      (baseEng.length >= 4 && engNorm.startsWith(baseEng))
    ) {
      const remainderKor = korNorm.slice(baseKor.length);
      const isKnownSalt = !remainderKor || KOR_SALT_SUFFIX_RE.test(remainderKor);

      if (isKnownSalt) {
        return {
          koreanName: korRaw,
          englishName: engRaw || entry.inn,
          matchedInn: entry.inn,
          amountText: params.amountText || '',
          dosageForm: params.dosageForm,
          route: params.route,
          saltOrFormNote: `원료 형태(${korRaw})에서 주성분(${entry.inn}) 기준으로 매칭됨`,
          matchConfidence: 'SALT_MAPPED'
        };
      }
    }
  }

  // 5. 테이블 미등록 성분이라도 영문 주성분(Base INN)이 분리된 경우 (예: 해외 신약 또는 기타 항생제)
  if (stripped.baseEng && stripped.baseEng.length >= 3) {
    const formattedInn = stripped.baseEng
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const hasSaltStripped = Boolean(stripped.strippedKorPart || stripped.strippedEngWords);
    return {
      koreanName: korRaw,
      englishName: engRaw || formattedInn,
      matchedInn: formattedInn,
      amountText: params.amountText || '',
      dosageForm: params.dosageForm,
      route: params.route,
      saltOrFormNote: hasSaltStripped
        ? `원료 형태(${korRaw})에서 염·프로드러그를 분리하여 주성분(${formattedInn}) 기준으로 매칭됨`
        : undefined,
      matchConfidence: hasSaltStripped ? 'SALT_MAPPED' : 'EXACT'
    };
  }

  return {
    koreanName: korRaw,
    englishName: engRaw,
    matchedInn: engRaw || null,
    amountText: params.amountText || '',
    dosageForm: params.dosageForm,
    route: params.route,
    matchConfidence: 'UNMATCHED',
    matchWarningNote: '해외 성분 매칭 테이블에서 확인되지 않은 성분입니다.'
  };
}
