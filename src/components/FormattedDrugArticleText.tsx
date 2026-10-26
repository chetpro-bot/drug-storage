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
 * 1단계: 1.
 * 2단계: 1)
 * 3단계: a.
 * 4단계: -
 * 5단계: ·
 */
export function parseDrugArticleHierarchy(text?: string | null): ParsedLine[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const result: ParsedLine[] = [];

  let currentLevel = 0;
  // 각 레벨에 바인딩된 원문 토큰 패밀리 추적 (계층 역전 방지)
  let levelFamily: { 1: string; 2: string; 3: string } = { 1: '', 2: '', 3: '' };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      result.push({ level: 0, inheritedLevel: 0, bulletText: '', content: '', isEmpty: true });
      continue;
    }

    // 1. Level 1: 1. 또는 [1] 또는 I. / 1/
    let m = trimmed.match(/^(\d+)[\.\/]\s+(.*)$/) || trimmed.match(/^\[\s*(\d+)\s*\]\s*(.*)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      currentLevel = 1;
      levelFamily = { 1: 'DOT_NUM', 2: '', 3: '' };
      result.push({ level: 1, inheritedLevel: 1, bulletText: `${n}. `, content: m[2] });
      continue;
    }

    // 로마 숫자 (I., II., Ⅰ., Ⅱ. 등)
    m = trimmed.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVXLCDM]+)[\.\s]\s*(.*)$/);
    if (m) {
      const n = romanToNum(m[1]);
      currentLevel = 1;
      levelFamily = { 1: 'ROMAN', 2: '', 3: '' };
      result.push({ level: 1, inheritedLevel: 1, bulletText: `${n}. `, content: m[2] });
      continue;
    }

    // 2. HALF_PAREN_NUM: 1), 2) -> 항상 Level 2 (1), 2))
    m = trimmed.match(/^(\d+)\)\s*(.*)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      currentLevel = 2;
      levelFamily[2] = 'HALF_PAREN_NUM';
      levelFamily[3] = '';
      result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      continue;
    }

    // 3. PAREN_NUM: (1), (2)
    m = trimmed.match(/^\(\s*(\d+)\s*\)\s*(.*)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      let targetLevel = 2;
      if (levelFamily[2] === 'PAREN_NUM') {
        targetLevel = 2;
      } else if (levelFamily[2] && levelFamily[2] !== 'PAREN_NUM') {
        // 이미 2단계에 다른 패밀리(1) 등)가 존재함 -> 하위 3단계 (a., b.)
        targetLevel = 3;
        levelFamily[3] = 'PAREN_NUM';
      } else {
        targetLevel = 2;
        levelFamily[2] = 'PAREN_NUM';
      }

      currentLevel = targetLevel;
      if (targetLevel === 3) {
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(n)}. `, content: m[2] });
      } else {
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      }
      continue;
    }

    // 4. CIRCLE_NUM: ①, ②
    m = trimmed.match(/^([①-⑳])\s*(.*)$/);
    if (m) {
      const n = circleToNum(m[1]);
      let targetLevel = 2;
      if (levelFamily[2] === 'CIRCLE_NUM') {
        targetLevel = 2;
      } else if (levelFamily[2] && levelFamily[2] !== 'CIRCLE_NUM') {
        targetLevel = 3;
        levelFamily[3] = 'CIRCLE_NUM';
      } else {
        targetLevel = 2;
        levelFamily[2] = 'CIRCLE_NUM';
      }

      currentLevel = targetLevel;
      if (targetLevel === 3) {
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(n)}. `, content: m[2] });
      } else {
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      }
      continue;
    }

    // 5. 한글 글머리: 가., 나. / 가), 나) / (가), (나) / ㉮, ㉯
    m =
      trimmed.match(/^([가-하])\.\s*(.*)$/) ||
      trimmed.match(/^([가-하])\)\s*(.*)$/) ||
      trimmed.match(/^\(([가-하])\)\s*(.*)$/);
    if (m) {
      const n = hangulSyllableToNum(m[1]);
      let targetLevel = 2;
      if (levelFamily[2] === 'HANGUL') {
        targetLevel = 2;
      } else if (levelFamily[2] && levelFamily[2] !== 'HANGUL') {
        targetLevel = 3;
        levelFamily[3] = 'HANGUL';
      } else {
        // 만약 상위에 1. 이 없거나 2단계가 비어있다면:
        // 보통 공문서 체계상 1. 다음 가. 이므로 Level 2 매핑
        targetLevel = 2;
        levelFamily[2] = 'HANGUL';
      }

      currentLevel = targetLevel;
      if (targetLevel === 3) {
        result.push({ level: 3, inheritedLevel: 3, bulletText: `${numToAlpha(n)}. `, content: m[2] });
      } else {
        result.push({ level: 2, inheritedLevel: 2, bulletText: `${n}) `, content: m[2] });
      }
      continue;
    }

    // 6. 알파벳 글머리: a., b. / a), b) / (a), (b)
    m = trimmed.match(/^([a-zA-Z])[\.\)]\s*(.*)$/) || trimmed.match(/^\(([a-zA-Z])\)\s*(.*)$/);
    if (m) {
      const ch = m[1].toLowerCase();
      currentLevel = 3;
      levelFamily[3] = 'ALPHA';
      result.push({ level: 3, inheritedLevel: 3, bulletText: `${ch}. `, content: m[2] });
      continue;
    }

    // 7. 대시 / 특수 불릿 기호: -, *, ※, ■, ●, ○, ▶ 등 -> Level 4: "- "
    m = trimmed.match(/^([-–—―~*※■□▲△◆◇●○▶▷✦★])\s*(.*)$/);
    if (m) {
      currentLevel = 4;
      result.push({ level: 4, inheritedLevel: 4, bulletText: '- ', content: m[2] });
      continue;
    }

    // 8. 가운뎃점 / 점 기호: ·, •, ∙, ㆍ -> Level 5: "· "
    m = trimmed.match(/^([·•∙ㆍ])\s*(.*)$/);
    if (m) {
      currentLevel = 5;
      result.push({ level: 5, inheritedLevel: 5, bulletText: '· ', content: m[2] });
      continue;
    }

    // 9. 일반 문장 (글머리 없음 / 이전 항목에 이어진 설명문)
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
