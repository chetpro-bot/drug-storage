import React, { useState, useRef, useEffect } from 'react';
import { Highlighter, Indent, Outdent, Eraser, Check } from 'lucide-react';

interface PrecautionsTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  saveButtonColor?: 'rose' | 'sky' | 'emerald';
}

/**
 * 주의사항 본문 포맷팅 렌더러 (보기 모드)
 * - ==텍스트== 및 <mark>텍스트</mark> 형광펜 마크업 파싱 및 스타일 적용
 * - 들여쓰기 공백('    ', '  ', '\t') 및 하위 항목((1), (2), ①, - 등) 감지
 * - 긴 문장이나 데이터 내 줄바꿈(\n)으로 분절되어 다음 줄로 넘어간 텍스트도
 *   상위 항목의 들여쓰기 위치를 계승하여 완벽한 수직 정렬(Hanging Indent)을 보장
 */
export function renderFormattedPrecautionsText(text?: string | null) {
  if (!text || !text.trim()) {
    return <span className="text-slate-400">등록된 주의사항 내용이 없습니다.</span>;
  }

  // ==...== 또는 <mark>...</mark> 매칭 정규식
  const highlightRegex = /(?:==([\s\S]+?)==|<mark>([\s\S]+?)<\/mark>)/g;
  const lines = text.split(/\r?\n/);

  // 상위 항목의 들여쓰기 상태 추적 (이어진 줄의 수직 정렬용)
  let currentInheritedIndentPx = 0;

  return (
    <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed font-sans font-medium">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          currentInheritedIndentPx = 0;
          return <div key={lineIdx} className="h-3" />;
        }

        // 1. 대항목(1., 2. 등) 판별: 숫자로 시작하고 점이 붙은 대제목
        const isLevel1Header = /^\s*\d+\.\s+/.test(line) || /^\s*\[\s*\d+\s*\]/.test(line);

        // 2. 중항목/소항목 ((1), (2), 1), ①, -, • 등) 판별
        const isSubItem = /^\s*(\(\d+\)|\d+\)|[①-⑳]|[-•·]|[가-힣]\.)/.test(line);

        // 3. 앞쪽 공백(스페이스 또는 탭) 감지
        const leadingWhitespaceMatch = line.match(/^([ \t]+)/);
        let spaceCount = 0;
        let contentLine = line;

        if (leadingWhitespaceMatch) {
          const whitespace = leadingWhitespaceMatch[1];
          for (const ch of whitespace) {
            spaceCount += ch === '\t' ? 4 : 1;
          }
          contentLine = line.slice(whitespace.length);
        }

        let paddingLeftPx = 0;

        if (isLevel1Header) {
          // 대제목(1. 경고, 2. 복용 금기 등)은 들여쓰기 리셋 (맨 왼쪽 정렬)
          paddingLeftPx = spaceCount > 0 ? spaceCount * 6 : 0;
          currentInheritedIndentPx = 0;
        } else if (isSubItem) {
          // 하위 항목 ((1), (2) 등): 명시적 공백이 있으면 그에 맞추고, 없어도 기본 들여쓰기 16px 부여
          if (spaceCount > 0) {
            paddingLeftPx = Math.max(spaceCount * 8, 16);
          } else {
            paddingLeftPx = 16;
          }
          currentInheritedIndentPx = paddingLeftPx; // 이어진 다음 줄들이 이어받도록 보존
        } else {
          // 기호 없이 줄바꿈되어 이어진 텍스트 (예: "로 어린이의 손에 닿지 않는곳에...", ": 원인을 알 수 없는...", "빈혈")
          if (spaceCount > 0) {
            paddingLeftPx = Math.max(spaceCount * 8, 16);
            currentInheritedIndentPx = paddingLeftPx;
          } else if (currentInheritedIndentPx > 0) {
            // 앞선 항목의 들여쓰기를 그대로 계승하여 완벽한 수직 라인 맞춤!
            paddingLeftPx = currentInheritedIndentPx;
          }
        }

        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        highlightRegex.lastIndex = 0;

        while ((match = highlightRegex.exec(contentLine)) !== null) {
          const matchStart = match.index;
          const matchEnd = highlightRegex.lastIndex;

          if (matchStart > lastIndex) {
            parts.push(contentLine.slice(lastIndex, matchStart));
          }

          const highlightedContent = match[1] !== undefined ? match[1] : match[2];

          parts.push(
            <mark
              key={`${lineIdx}-${matchStart}`}
              className="bg-amber-200/95 text-amber-950 font-bold px-1.5 py-0.5 rounded shadow-2xs mx-0.5 inline-block"
            >
              {highlightedContent}
            </mark>
          );

          lastIndex = matchEnd;
        }

        if (lastIndex < contentLine.length) {
          parts.push(contentLine.slice(lastIndex));
        }

        return (
          <div
            key={lineIdx}
            style={paddingLeftPx > 0 ? { paddingLeft: `${paddingLeftPx}px` } : undefined}
            className="min-h-[1.25rem] whitespace-pre-wrap break-words"
          >
            {parts}
          </div>
        );
      })}
    </div>
  );
}

export const PrecautionsTextEditor: React.FC<PrecautionsTextEditorProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder,
  saveButtonColor = 'rose'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 마우스로 선택한 범위를 실시간으로 안전하게 기억하는 Ref (버튼 클릭 시 selection 소실 방지)
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // 마우스로 선택한 텍스트에 대한 플로팅 툴팁 상태
  const [floatingToolbar, setFloatingToolbar] = useState<{
    top: number;
    left: number;
    selectionStart: number;
    selectionEnd: number;
    selectedText: string;
  } | null>(null);

  // textarea 선택 영역 실시간 추적
  const updateSelectionState = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    lastSelectionRef.current = { start, end };

    if (start !== end) {
      const selected = textarea.value.slice(start, end).trim();
      if (selected.length > 0) {
        const rect = textarea.getBoundingClientRect();
        setFloatingToolbar({
          top: Math.max(12, rect.top - 46),
          left: rect.left + rect.width / 2,
          selectionStart: start,
          selectionEnd: end,
          selectedText: selected
        });
        return;
      }
    }
    setFloatingToolbar(null);
  };

  // 들여쓰기 (4칸 공백) / 내어쓰기 실행
  const handleIndent = (isOutdent = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 실시간으로 추적된 lastSelectionRef를 최우선 사용하여 버튼 클릭 시 선택 해제 방지
    let selectionStart = lastSelectionRef.current.start;
    let selectionEnd = lastSelectionRef.current.end;

    // 만약 textarea 자체에 살아있는 선택 영역이 더 넓다면 최신 값 활용
    if (textarea.selectionStart !== textarea.selectionEnd) {
      selectionStart = textarea.selectionStart;
      selectionEnd = textarea.selectionEnd;
    }

    const textVal = textarea.value;
    const indentStr = '    '; // 4칸 스페이스

    // 선택 영역이 걸쳐 있는 첫 번째 줄의 시작 인덱스
    const startOfFirstLine = textVal.lastIndexOf('\n', selectionStart - 1) + 1;

    // 선택 영역이 걸쳐 있는 마지막 줄의 끝 인덱스
    let effectiveEnd = selectionEnd;
    if (effectiveEnd > selectionStart && textVal[effectiveEnd - 1] === '\n') {
      effectiveEnd = effectiveEnd - 1;
    }

    let endOfLastLine = textVal.indexOf('\n', effectiveEnd);
    if (endOfLastLine === -1) endOfLastLine = textVal.length;

    const targetChunk = textVal.slice(startOfFirstLine, endOfLastLine);
    const lines = targetChunk.split(/\r?\n/);

    let newLines: string[];
    let deltaStart = 0;
    let deltaTotal = 0;

    if (!isOutdent) {
      // 들여쓰기: 선택된 모든 라인 앞에 4칸 공백 추가
      newLines = lines.map((l) => indentStr + l);
      deltaStart = indentStr.length;
      deltaTotal = indentStr.length * lines.length;
    } else {
      // 내어쓰기: 선택된 모든 라인 앞의 공백(최대 4칸) 제거
      newLines = lines.map((l, idx) => {
        let removed = 0;
        if (l.startsWith(indentStr)) {
          removed = indentStr.length;
        } else {
          const match = l.match(/^[ ]+/);
          if (match) {
            removed = Math.min(match[0].length, indentStr.length);
          } else if (l.startsWith('\t')) {
            removed = 1;
          }
        }
        if (idx === 0) deltaStart = -removed;
        deltaTotal -= removed;
        return l.slice(removed);
      });
    }

    const updatedText =
      textVal.slice(0, startOfFirstLine) +
      newLines.join('\n') +
      textVal.slice(endOfLastLine);

    const newStart = Math.max(startOfFirstLine, selectionStart + deltaStart);
    const newEnd = Math.max(newStart, selectionEnd + deltaTotal);

    lastSelectionRef.current = { start: newStart, end: newEnd };

    onChange(updatedText);
    setFloatingToolbar(null);

    // 커서 및 선택 영역 유지
    setTimeout(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // 형광펜 토글 (선택 영역을 ==...== 로 감싸거나 기존 형광펜 제거)
  const handleToggleHighlight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let selStart = lastSelectionRef.current.start;
    let selEnd = lastSelectionRef.current.end;

    if (textarea.selectionStart !== textarea.selectionEnd) {
      selStart = textarea.selectionStart;
      selEnd = textarea.selectionEnd;
    }

    const textVal = textarea.value;

    if (selStart === selEnd) {
      alert('형광펜을 칠하거나 지울 텍스트를 마우스로 먼저 드래그하여 선택해주세요.');
      return;
    }

    const selectedText = textVal.slice(selStart, selEnd);
    if (!selectedText.trim()) return;

    let updated = '';
    let newStart = selStart;
    let newEnd = selEnd;

    // 1. 선택한 텍스트 자체가 이미 ==...== 로 감싸져 있는 경우 -> 제거
    if (selectedText.startsWith('==') && selectedText.endsWith('==') && selectedText.length >= 4) {
      const stripped = selectedText.slice(2, -2);
      updated = textVal.slice(0, selStart) + stripped + textVal.slice(selEnd);
      newEnd = selStart + stripped.length;
    }
    // 2. 선택한 텍스트의 바깥쪽 직전/직후가 == 인 경우 -> 바깥 == 제거
    else if (
      selStart >= 2 &&
      selEnd <= textVal.length - 2 &&
      textVal.slice(selStart - 2, selStart) === '==' &&
      textVal.slice(selEnd, selEnd + 2) === '=='
    ) {
      updated = textVal.slice(0, selStart - 2) + selectedText + textVal.slice(selEnd + 2);
      newStart = selStart - 2;
      newEnd = newStart + selectedText.length;
    }
    // 3. 선택 영역 내부에 == 가 여러 개 들어있는 경우 -> 내부 == 모두 제거
    else if (selectedText.includes('==')) {
      const stripped = selectedText.replace(/==/g, '');
      updated = textVal.slice(0, selStart) + stripped + textVal.slice(selEnd);
      newEnd = selStart + stripped.length;
    }
    // 4. 일반 텍스트인 경우 -> ==선택텍스트== 감싸기
    else {
      const highlighted = `==${selectedText}==`;
      updated = textVal.slice(0, selStart) + highlighted + textVal.slice(selEnd);
      newEnd = selStart + highlighted.length;
    }

    lastSelectionRef.current = { start: newStart, end: newEnd };
    onChange(updated);
    setFloatingToolbar(null);

    setTimeout(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // 모든 형광펜 일괄 제거
  const handleClearAllHighlights = () => {
    if (!value.includes('==') && !value.includes('<mark>')) {
      alert('현재 칠해진 형광펜이 없습니다.');
      return;
    }
    if (window.confirm('모든 형광펜 칠을 지우시겠습니까? (텍스트 내용은 유지됩니다)')) {
      const cleared = value
        .replace(/==/g, '')
        .replace(/<\/?mark>/gi, '');
      onChange(cleared);
      setFloatingToolbar(null);
    }
  };

  // 키보드 Tab (들여쓰기) / Shift+Tab (내어쓰기) 지원
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleIndent(e.shiftKey);
    }
  };

  // 외부 클릭 시 플로팅 툴바 닫기
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.precautions-floating-toolbar') && !target.closest('.precautions-textarea')) {
        setFloatingToolbar(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const saveColorClasses = {
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
    sky: 'bg-sky-600 hover:bg-sky-700 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  }[saveButtonColor];

  return (
    <div className="space-y-2 bg-[#f8fafc] border border-rose-300 rounded-xl p-3 relative">
      {/* 본문 텍스트 영역 (마우스 드래그 선택 시 형광펜/들여쓰기 팝업 메뉴 자동 노출) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateSelectionState}
        onMouseUp={updateSelectionState}
        onKeyUp={updateSelectionState}
        onTouchEnd={updateSelectionState}
        onKeyDown={handleKeyDown}
        rows={12}
        placeholder={placeholder || '주의사항 내용을 입력하세요. (마우스로 텍스트를 드래그하면 형광펜/들여쓰기 메뉴가 나타납니다)'}
        className="precautions-textarea w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-500 whitespace-pre-wrap font-sans min-h-[260px] resize-y"
      />

      {/* 마우스 드래그 시 바로 나타나는 플로팅 미니 툴바 */}
      {floatingToolbar && (
        <div
          style={{
            position: 'fixed',
            top: `${floatingToolbar.top}px`,
            left: `${floatingToolbar.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
          className="precautions-floating-toolbar bg-slate-900/95 text-white backdrop-blur-md rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleToggleHighlight();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
            title="형광펜 칠하기 / 지우기"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-300" />
            <span>형광펜</span>
          </button>

          <span className="w-px h-3.5 bg-slate-700" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleIndent(false);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="선택한 줄 전체 들여쓰기 (4칸)"
          >
            <Indent className="w-3.5 h-3.5 text-sky-400" />
            <span>들여쓰기</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleIndent(true);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="선택한 줄 전체 내어쓰기"
          >
            <Outdent className="w-3.5 h-3.5 text-slate-400" />
            <span>내어쓰기</span>
          </button>
        </div>
      )}

      {/* 저장 / 취소 버튼 */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {(value.includes('==') || value.includes('<mark>')) && (
            <button
              type="button"
              onClick={handleClearAllHighlights}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer"
              title="칠해진 형광펜 모두 지우기"
            >
              <Eraser className="w-3.5 h-3.5 text-rose-500" />
              <span>형광펜 전체 지우기</span>
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 ${saveColorClasses}`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
