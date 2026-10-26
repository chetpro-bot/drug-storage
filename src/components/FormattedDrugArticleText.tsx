import React from 'react';

export interface FormattedDrugArticleTextProps {
  text?: string | null;
  emptyMessage?: string;
  className?: string;
}

/**
 * 한글 자모('가' ~ '하')를 1 기반 숫자 인덱스로 변환 (1: 가, 2: 나, 3: 다 ...)
 */
function hangulSyllableToNum(char: string): number {
  const syllables = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
  const idx = syllables.indexOf(char);
  return idx !== -1 ? idx + 1 : 1;
}

/**
 * 숫자(1, 2, 3...)를 영문 소문자('a', 'b', 'c'...)로 변환
 */
function numToAlpha(num: number): string {
  const safeNum = Math.max(1, num);
  return String.fromCharCode(96 + ((safeNum - 1) % 26 + 1));
}

/**
 * 원문자(① ~ ⑳)를 숫자로 변환
 */
function circleToNum(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= 0x2460 && code <= 0x2473) {
    return code - 0x2460 + 1; // ①: 1 ~ ⑳: 20
  }
  return 1;
}

/**
 * 로마 숫자(I, II, III, IV, V...)를 숫자로 변환
 */
function romanToNum(roman: string): number {
  const romanMap: Record<string, number> = {
    I: 1, Ⅰ: 1,
    II: 2, Ⅱ: 2,
    III: 3, Ⅲ: 3,
    IV: 4, Ⅳ: 4,
    V: 5, Ⅴ: 5,
    VI: 6, Ⅵ: 6,
    VII: 7, Ⅶ: 7,
    VIII: 8, Ⅷ: 8,
    IX: 9, Ⅸ: 9,
    X: 10, Ⅹ: 10
  };
  return romanMap[roman.toUpperCase()] || 1;
}

interface ParsedLine {
  level: number; // 0: 일반 문장(글머리 없음), 1: 1., 2: 1), 3: a., 4: -, 5: ·
  inheritedLevel: number;
  bulletText: string;
  content: string;
  isEmpty?: boolean;
}

/**
 * 텍스트 라인들을 사용자가 정한 표준 글머리 체계로 파싱
 * - 원문에 이미 1., 2. 가 있는 경우: 1. -> 1) -> a. -> - -> ·
 * - 원문에 번호 없이 특수기호(○, -, *, · 등)만 있는 경우:
 *   최상위 도형(○, ●, ■ 등) 또는 대분류 항목을 1단계(1., 2., 3.)로 자동 승격하고,
 *   그 하위 항목들을 2단계(1), 2)), 3단계(a., b.), 4단계(-)로 체계화
 * 1단계: 1.
 * 2단계: 1)
 * 3단계: a.
 * 4단계: -
 * 5단계: ·
 */
export function parseDrugArticleHierarchy(text?: string | null): ParsedLine[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/);
  const lineItems = rawLines.map(rawLine => {
    const trimmed = rawLine.trim();
    return {
      rawLine,
      trimmed,
      isEmpty: !trimmed
    };
  });

  // 1. 문서 전체에서 1., [1], I. 등 명시적 Level 1 숫자 헤더가 존재하는지 검사
  const hasExplicitLevel1Number = lineItems.some(item =>
    /^\d+[\.\/]\s+/.test(item.trimmed) ||
    /^\[\s*\d+\s*\]/.test(item.trimmed) ||
    /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVXLCDM]+[\.\s]\s*/.test(item.trimmed)
  );

  // 2. 문서에 도형 기호(○, ●, ■ 등)가 존재하는지 검사
  const hasShapeBullets = lineItems.some(item => /^[○●■◆▲▶◇□]/.test(item.trimmed));

  // 3. 문서에 별표(*) 또는 참고표(※)가 존재하는지 검사
  const hasAsteriskBullets = lineItems.some(item => /^[\*※]/.test(item.trimmed));

  let l1Counter = 0;
  let l2Counter = 0;
  let l3Counter = 0;
  let currentLevel = 0;
  let levelFamily: { 1: string; 2: string; 3: string } = { 1: '', 2: '', 3: '' };

  const result: ParsedLine[] = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    if (item.isEmpty) {
      result.push({ level: 0, inheritedLevel: 0, bulletText: '', content: '', isEmpty: true });
      continue;
    }

    const trimmed = item.trimmed;

    // --- CASE 1: 명시적 숫자 헤더 (1., [1]) ---
    let m = trimmed.match(/^(\d+)[\.\/]\s+(.*)$/) || trimmed.match(/^\[\s*(\d+)\s*\]\s*(.*)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      l1Counter = n;
      l2Counter = 0;
      l3Counter = 0;
      currentLevel = 1;
      levelFamily = { 1: 'DOT_NUM', 2: '', 3: '' };
      result.push({ level: 1, inheritedLevel: 1, bulletText: `${n}. `, content: m[2] });
      continue;
    }

    // 로마 숫자 (I., II., Ⅰ., Ⅱ. 등)
    m = trimmed.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVXLCDM]+)[\.\s]\s*(.*)$/);
    if (m) {
      const n = romanToNum(m[1]);
      l1Counter = n;
      l2Counter = 0;
      l3Counter = 0;
      currentLevel = 1;
      levelFamily = { 1: 'ROMAN', 2: '', 3: '' };
      result.push({ level: 1, inheritedLevel: 1, bulletText: `${n}. `, content: m[2] });
      continue;
    }

    // --- CASE 2: 도형 기호(○, ●, ■ 등) 최상위 Level 1 헤더 ---
    m = trimmed.match(/^([○●■◆▲▶◇□])\s*(.*)$/);
    if (m) {
      l1Counter++;
      l2Counter = 0;
      l3Counter = 0;
      currentLevel = 1;
      levelFamily = { 1: 'SHAPE', 2: '', 3: '' };
      result.push({ level: 1, inheritedLevel: 1, bulletText: `${l1Counter}. `, content: m[2] });
      continue;
    }

    // --- CASE 3: 문서에 1. 이 없을 때 하위 목록(*, · 등)을 거느리는 대분류 문장(Level 1) 판별 ---
    if (!hasExplicitLevel1Number && (hasShapeBullets || hasAsteriskBullets)) {
      if (
        /^[-–—―]?\s*(이\s*약에\s*함유된.*다음과\s*같다.*)$/.test(trimmed) ||
        (/^[-–—―]?\s*(다음\s*증상의\s*완화.*[:：]?)$/.test(trimmed) &&
          i + 1 < lineItems.length &&
          /^[-–—―\*·•]/.test(lineItems[i + 1].trimmed))
      ) {
        const content = trimmed.replace(/^[-–—―]\s*/, '');
        l1Counter++;
        l2Counter = 0;
        l3Counter = 0;
        currentLevel = 1;
        levelFamily = { 1: 'SECTION_HEADER', 2: '', 3: '' };
        result.push({ level: 1, inheritedLevel: 1, bulletText: `${l1Counter}. `, content });
        continue;
      }
    }

    // --- Level 2: 1) 반괄호 숫자 ---
    m = trimmed.match(/^(\d+)\)\s*(.*)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      l2Counter = n;
      l3Counter = 0;
      currentLevel = 2;
      levelFamily[2] = 'HALF_PAREN_NUM';
      levelFamily[3] = '';
      result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      continue;
    }

    // --- Level 2: 별표(*) 또는 참고표(※) -> Level 2 (1), 2)) ---
    m = trimmed.match(/^([\*※])\s*(.*)$/);
    if (m) {
      l2Counter++;
      l3Counter = 0;
      currentLevel = 2;
      levelFamily[2] = 'ASTERISK';
      levelFamily[3] = '';
      result.push({ level: 2, inheritedLevel: 2, bulletText: `${l2Counter}) `, content: m[2] });
      continue;
    }

    // --- PAREN_NUM: (1), (2) ---
    m = trimmed.match(/^\(\s*(\d+)\s*\)\s*(.*)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (currentLevel >= 2) {
        l3Counter = n;
        currentLevel = 3;
        levelFamily[3] = 'PAREN_NUM';
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(n)}. `, content: m[2] });
      } else {
        l2Counter = n;
        l3Counter = 0;
        currentLevel = 2;
        levelFamily[2] = 'PAREN_NUM';
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      }
      continue;
    }

    // --- CIRCLE_NUM: ①, ② ---
    m = trimmed.match(/^([①-⑳])\s*(.*)$/);
    if (m) {
      const n = circleToNum(m[1]);
      if (currentLevel >= 2) {
        l3Counter = n;
        currentLevel = 3;
        levelFamily[3] = 'CIRCLE_NUM';
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(n)}. `, content: m[2] });
      } else {
        l2Counter = n;
        l3Counter = 0;
        currentLevel = 2;
        levelFamily[2] = 'CIRCLE_NUM';
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      }
      continue;
    }

    // --- HANGUL: 가., 나. / 가), 나) / (가), (나) ---
    m =
      trimmed.match(/^([가-하])\.\s*(.*)$/) ||
      trimmed.match(/^([가-하])\)\s*(.*)$/) ||
      trimmed.match(/^\(([가-하])\)\s*(.*)$/);
    if (m) {
      const n = hangulSyllableToNum(m[1]);
      if (currentLevel >= 2) {
        l3Counter = n;
        currentLevel = 3;
        levelFamily[3] = 'HANGUL';
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(n)}. `, content: m[2] });
      } else {
        l2Counter = n;
        l3Counter = 0;
        currentLevel = 2;
        levelFamily[2] = 'HANGUL';
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      }
      continue;
    }

    // --- ALPHA: a., b. / a), b) / (a), (b) -> Level 3 ---
    m = trimmed.match(/^([a-zA-Z])[\.\)]\s*(.*)$/) || trimmed.match(/^\(([a-zA-Z])\)\s*(.*)$/);
    if (m) {
      const ch = m[1].toLowerCase();
      currentLevel = 3;
      levelFamily[3] = 'ALPHA';
      result.push({ level: 3, inheritedLevel: 3, bulletText: `${ch}. `, content: m[2] });
      continue;
    }

    // --- DASH / HYPHEN: - ---
    m = trimmed.match(/^([-–—―~])\s*(.*)$/);
    if (m) {
      const content = m[2];
      // 1) 문서에 1. 번호가 없고 도형(○) 아래에 나열된 - 목록 -> Level 2 (1), 2), 3))
      if (!hasExplicitLevel1Number && hasShapeBullets && currentLevel <= 2) {
        l2Counter++;
        l3Counter = 0;
        currentLevel = 2;
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${l2Counter}) `, content });
      } else if (!hasExplicitLevel1Number && !hasShapeBullets) {
        // 2) 문서에 1. 도 없고 도형(○)도 없는 순수 - 목록 -> 1단계(1., 2., 3.)로 부여!
        l1Counter++;
        l2Counter = 0;
        l3Counter = 0;
        currentLevel = 1;
        result.push({ level: 1, inheritedLevel: 1, bulletText: `${l1Counter}. `, content });
      } else {
        // 3) 상위 번호가 이미 존재하는 상태에서 세부 하이픈 항목 -> Level 4 (- )
        currentLevel = 4;
        result.push({ level: 4, inheritedLevel: 4, bulletText: '- ', content });
      }
      continue;
    }

    // --- 가운뎃점 / 도트: ·, ㆍ, •, ∙ ---
    m = trimmed.match(/^([·•∙ㆍ])\s*(.*)$/);
    if (m) {
      const content = m[2];
      if (currentLevel >= 2) {
        l3Counter++;
        currentLevel = 3;
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(l3Counter)}. `, content });
      } else {
        currentLevel = 5;
        result.push({ level: 5, inheritedLevel: 5, bulletText: '· ', content });
      }
      continue;
    }

    // --- 일반 문장 (글머리 없음 / 이전 항목에 이어진 설명문) ---
    result.push({
      level: 0,
      inheritedLevel: currentLevel,
      bulletText: '',
      content: trimmed
    });
  }

  return result;
}

/**
 * 텍스트 문자열 자체를 표준 글머리 체계로 변환한 문자열로 반환하는 유틸리티
 */
export function convertDrugArticleHierarchyText(text?: string | null): string {
  if (!text) return '';
  const parsed = parseDrugArticleHierarchy(text);
  return parsed
    .map(line => {
      if (line.isEmpty) return '';
      const indent = '  '.repeat(Math.max(0, (line.level || line.inheritedLevel || 1) - 1));
      return `${indent}${line.bulletText}${line.content}`;
    })
    .join('\n');
}

/**
 * 의약품 효능·효과 및 사용상의 주의사항 전용 계층 포맷터 컴포넌트
 * - 1단계: 1. (굵은 글씨, 섹션 구분)
 * - 2단계: 1) (세미볼드, 1단계 들여쓰기)
 * - 3단계: a. (2단계 들여쓰기)
 * - 4단계: -  (3단계 들여쓰기)
 * - 5단계: ·  (4단계 들여쓰기)
 * - 형광펜(==...== 또는 <mark>...</mark>) 하이라이트 완벽 지원
 */
export const FormattedDrugArticleText: React.FC<FormattedDrugArticleTextProps> = ({
  text,
  emptyMessage = '등록된 내용이 없습니다.',
  className = ''
}) => {
  if (!text || !text.trim()) {
    return <span className="text-slate-400 text-xs italic">{emptyMessage}</span>;
  }

  const parsedLines = parseDrugArticleHierarchy(text);
  const highlightRegex = /(?:==([\s\S]+?)==|<mark>([\s\S]+?)<\/mark>)/g;

  // 인라인 형광펜 렌더링 헬퍼
  const renderHighlightedContent = (lineContent: string, keyPrefix: string | number) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    highlightRegex.lastIndex = 0;
    while ((match = highlightRegex.exec(lineContent)) !== null) {
      const matchStart = match.index;
      const matchEnd = highlightRegex.lastIndex;

      if (matchStart > lastIndex) {
        parts.push(lineContent.slice(lastIndex, matchStart));
      }

      const highlightedText = match[1] !== undefined ? match[1] : match[2];
      parts.push(
        <mark
          key={`${keyPrefix}-${matchStart}`}
          className="bg-amber-200/95 text-amber-950 font-bold px-1 py-0.5 rounded shadow-2xs mx-0.5 inline-block"
        >
          {highlightedText}
        </mark>
      );
      lastIndex = matchEnd;
    }

    if (lastIndex < lineContent.length) {
      parts.push(lineContent.slice(lastIndex));
    }

    return parts.length > 0 ? parts : lineContent;
  };

  return (
    <div className={`space-y-1.5 text-xs text-slate-800 leading-relaxed font-sans font-medium select-text ${className}`}>
      {parsedLines.map((line, idx) => {
        if (line.isEmpty) {
          return <div key={idx} className="h-2" />;
        }

        const effectiveLevel = line.level > 0 ? line.level : line.inheritedLevel;

        // 레벨별 들여쓰기 패딩
        let paddingLeftClass = '';
        if (effectiveLevel === 2) paddingLeftClass = 'pl-3.5';
        else if (effectiveLevel === 3) paddingLeftClass = 'pl-7';
        else if (effectiveLevel === 4) paddingLeftClass = 'pl-10';
        else if (effectiveLevel >= 5) paddingLeftClass = 'pl-13';

        // 레벨별 텍스트 스타일
        if (line.level === 1) {
          return (
            <div
              key={idx}
              className="mt-2.5 first:mt-0 font-bold text-slate-900 flex items-start gap-1"
            >
              <span className="text-slate-900 shrink-0 font-extrabold">{line.bulletText}</span>
              <span className="flex-1 break-words">
                {renderHighlightedContent(line.content, idx)}
              </span>
            </div>
          );
        }

        if (line.level === 2) {
          return (
            <div
              key={idx}
              className={`${paddingLeftClass} font-semibold text-slate-800 flex items-start gap-1`}
            >
              <span className="text-slate-700 shrink-0 font-bold">{line.bulletText}</span>
              <span className="flex-1 break-words">
                {renderHighlightedContent(line.content, idx)}
              </span>
            </div>
          );
        }

        if (line.level === 3) {
          return (
            <div
              key={idx}
              className={`${paddingLeftClass} text-slate-700 flex items-start gap-1 font-medium`}
            >
              <span className="text-slate-600 shrink-0 font-semibold">{line.bulletText}</span>
              <span className="flex-1 break-words">
                {renderHighlightedContent(line.content, idx)}
              </span>
            </div>
          );
        }

        if (line.level === 4) {
          return (
            <div
              key={idx}
              className={`${paddingLeftClass} text-slate-700 flex items-start gap-1.5 font-normal`}
            >
              <span className="text-slate-500 shrink-0 font-bold">{line.bulletText}</span>
              <span className="flex-1 break-words">
                {renderHighlightedContent(line.content, idx)}
              </span>
            </div>
          );
        }

        if (line.level >= 5) {
          return (
            <div
              key={idx}
              className={`${paddingLeftClass} text-slate-600 flex items-start gap-1.5 font-normal`}
            >
              <span className="text-slate-400 shrink-0 font-bold">{line.bulletText}</span>
              <span className="flex-1 break-words">
                {renderHighlightedContent(line.content, idx)}
              </span>
            </div>
          );
        }

        // 일반 본문 / 이어진 줄
        return (
          <div
            key={idx}
            className={`${paddingLeftClass} ${effectiveLevel >= 2 ? 'pl-7' : ''} text-slate-700 break-words leading-relaxed`}
          >
            {renderHighlightedContent(line.content, idx)}
          </div>
        );
      })}
    </div>
  );
};
