export function normalizeCategory(cat: string): string {
  if (!cat) return '기타';
  let res = cat.replace(/^비타민([A-Za-z0-9]+)\s*제제$/, '비타민$1');
  res = res.replace(/\s*보충$/, '');
  res = res.trim();

  // 엽산 / 폴산 / 비타민B9는 모두 '엽산'으로 표기 통일 (정렬 순서는 B9 위치 유지)
  if (res === '엽산' || res === '폴산' || res === '비타민B9' || res === '비타민B9(엽산)') {
    return '엽산';
  }

  // 아미노산 '제제' 접미사 제거
  if (res === '비필수 아미노산제제' || res === '비필수 아미노산 제제') {
    return '비필수 아미노산';
  }
  if (res === '아미노산제제' || res === '아미노산 제제') {
    return '아미노산';
  }
  if (res === '무기질(Mineral)제제' || res === '무기질제제') {
    return '무기질';
  }

  // 미네랄 원소기호 제거
  if (res === '마그네슘(Mg)') return '마그네슘';
  if (res === '아연(Zn)') return '아연';
  if (res === '칼슘(Ca)') return '칼슘';
  if (res === '셀레늄(Se)' || res === '셀렌') return '셀레늄';
  if (res === '크롬(Cr)') return '크롬';
  if (res === '구리(Cu)' || res === '동(Cu)') return '구리';
  if (res === '망간(Mn)') return '망간';
  if (res === '요오드(I)') return '요오드';
  if (res === '몰리브덴(Mo)') return '몰리브덴';
  if (res === '칼륨(K)') return '칼륨';
  if (res === '철(Fe)' || res === '제1철 (Ferrous)' || res === '제2철 (Ferric)') return '철';

  // 정장제 / 프로바이오틱스 / 유산균 제제 표기 통일
  if (
    res === '정장제' ||
    res === '정장제 (생균제제)' ||
    res === '정장제(생균제제)' ||
    res === '정장제 (유산균)' ||
    res === '정장제(유산균)' ||
    res === '생균제제' ||
    res === '유산균' ||
    res === '유산균제제' ||
    res === '프로바이오틱스'
  ) {
    return '정장제';
  }

  // 기타 괄호 원소기호 패턴 제거 (예: '마그네슘(Mg)' -> '마그네슘')
  res = res.replace(/\([A-Z][a-z]?\)$/, '').trim();

  return res;
}

export const STANDARD_EFFICACY_CATEGORIES = [
  '비타민A',
  '비타민B1',
  '비타민B2',
  '비타민B3',
  '비타민B5',
  '비타민B6',
  '비타민B7',
  '엽산',
  '비타민B12',
  '기타 비타민B',
  '비타민C',
  '비타민D',
  '비타민D3',
  '비타민E',
  '비타민K',
  '마그네슘',
  '아연',
  '칼슘',
  '셀레늄',
  '크롬',
  '철',
  '구리',
  '망간',
  '소화효소제',
  '소염효소',
  '장내 가스 제거제',
  '담석용해제',
  '비필수 아미노산',
  '아미노산',
  '간보호제',
  '기타 간장 약물',
  '정장제',
  '자율신경제',
  '기타 심부전 치료제',
  '기타'
];

export function getCategoryColor(cat: string): string {
  const norm = normalizeCategory(cat);
  switch (norm) {
    case '정장제':
    case '정장제 (생균제제)':
    case '정장제 (유산균)':
    case '생균제제':
    case '유산균':
    case '프로바이오틱스':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case '비타민A':
    case '비타민A 제제':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case '비타민B1':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case '비타민B2':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case '비타민B3':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case '비타민B5':
      return 'bg-lime-50 text-lime-800 border-lime-200';
    case '비타민B6':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case '비타민B7':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case '엽산':
    case '비타민B9(엽산)':
    case '엽산 보충':
      return 'bg-green-50 text-green-800 border-green-200';
    case '비타민B12':
    case '비타민B12 보충':
      return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    case '기타 비타민B':
      return 'bg-amber-50/70 text-amber-700 border-amber-200/80';
    case '비타민C':
    case '비타민C 제제':
      return 'bg-yellow-50 text-amber-700 border-amber-200';
    case '비타민D':
    case '비타민D 제제':
    case '비타민D3':
    case '비타민D3 제제':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case '비타민E':
    case '비타민E 제제':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case '비타민K':
    case '비타민K 제제':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case '마그네슘':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case '아연':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case '칼슘':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case '셀레늄':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case '크롬':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case '철':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case '구리':
    case '망간':
    case '요오드':
    case '몰리브덴':
    case '칼륨':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case '소화효소제':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case '장내 가스 제거제':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case '소염효소':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case '담석용해제':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case '비필수 아미노산':
    case '비필수 아미노산제제':
    case '아미노산':
    case '아미노산제제':
      return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    case '간보호제':
    case '기타 간장 약물':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case '자율신경제':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case '기타 심부전 치료제':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * 상세 모달(ProductDetailModal) 약효분류 태그 스타일 (클린 메디컬 라이트 테마 파스텔 배지)
 */
export function getDarkCategoryBadgeStyle(cat: string): string {
  return getCategoryColor(cat);
}


