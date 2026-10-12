export function normalizeCategory(cat: string): string {
  if (!cat) return '';
  let res = cat.replace(/^비타민([A-Za-z0-9]+)\s*제제$/, '비타민$1');
  res = res.replace(/\s*보충$/, '');
  return res.trim();
}

export const STANDARD_EFFICACY_CATEGORIES = [
  '비타민B1',
  '비타민B2',
  '비타민B3',
  '비타민B5',
  '비타민B6',
  '비타민B7',
  '비타민B12',
  '기타 비타민B',
  '비타민C',
  '비타민D',
  '비타민D3',
  '비타민E',
  '비타민A',
  '비타민K',
  '엽산',
  '마그네슘(Mg)',
  '아연(Zn)',
  '칼슘(Ca)',
  '셀레늄(Se)',
  '크롬(Cr)',
  '제1철 (Ferrous)',
  '소화효소제',
  '소염효소',
  '장내 가스 제거제',
  '담석용해제',
  '비필수 아미노산제제',
  '아미노산제제',
  '간보호제',
  '기타 간장 약물',
  '자율신경제',
  '기타 심부전 치료제',
  '기타'
];

export function getCategoryColor(cat: string): string {
  const norm = normalizeCategory(cat);
  switch (norm) {
    case '비타민B1':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case '비타민B2':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case '비타민B3':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case '비타민B5':
      return 'bg-lime-100 text-lime-800 border-lime-200';
    case '비타민B6':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case '비타민B7':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case '비타민B12':
    case '비타민B12 보충':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case '기타 비타민B':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case '비타민C':
    case '비타민C 제제':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case '비타민D':
    case '비타민D 제제':
    case '비타민D3':
    case '비타민D3 제제':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case '비타민E':
    case '비타민E 제제':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case '비타민A':
    case '비타민A 제제':
      return 'bg-red-100 text-red-800 border-red-200';
    case '비타민K':
    case '비타민K 제제':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case '엽산':
    case '엽산 보충':
      return 'bg-green-100 text-green-800 border-green-200';
    case '마그네슘(Mg)':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case '아연(Zn)':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case '칼슘(Ca)':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case '셀레늄(Se)':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case '크롬(Cr)':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case '제1철 (Ferrous)':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case '소화효소제':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case '장내 가스 제거제':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case '소염효소':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case '담석용해제':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case '비필수 아미노산제제':
    case '아미노산제제':
      return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
    case '간보호제':
    case '기타 간장 약물':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case '자율신경제':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case '기타 심부전 치료제':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
