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
 * - 들여쓰기 공백('    ', '  ', '\t') 감지 시 CSS padding-left를 적용하여,
 *   긴 문장이 자동 줄바꿈(wrap)되어 여러 줄로 표시되더라도 전체 문장이 안쪽으로 정렬(hanging/soft-wrap indent)되도록 보장
 */
export function renderFormattedPrecautionsText(text?: string | null) {
  if (!text || !text.trim()) {
    return <span className="text-slate-400">등록된 주의사항 내용이 없습니다.</span>;
  }

  // ==...== 또는 <mark>...</mark> 매칭 정규식
  const highlightRegex = /(?:==([\s\S]+?)==|<mark>([\s\S]+?)<\/mark>)/g;
  const lines = text.split(/\r?\n/);

  return (
    <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed font-sans font-medium">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-3" />;
        }

        // 앞쪽 공백(스페이스 또는 탭) 감지 -> 줄바꿈 시에도 전체 줄 들여쓰기 유지
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

          // ==...== 내부 내용 (match[1]) 또는 <mark>...</mark> 내부 내용 (match[2])
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

        // 4칸 공백당 24px (1.5rem) 들여쓰기 패딩
        const paddingLeftPx = spaceCount > 0 ? (spaceCount / 4) * 24 : 0;

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

  // 마우스로 선택한 텍스트에 대한 플로팅 툴팁 상태
  const [floatingToolbar, setFloatingToolbar] = useState<{
    top: number;
    left: number;
    selectionStart: number;
    selectionEnd: number;
    selectedText: string;
  } | null>(null);

  // 들여쓰기 (4칸 공백) / 내어쓰기 실행
  const handleIndent = (isOutdent = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 플로팅 툴바가 떠 있을 때는 플로팅 툴바에 저장된 선택 범위 우선 활용
    const selectionStart = floatingToolbar ? floatingToolbar.selectionStart : textarea.selectionStart;
    const selectionEnd = floatingToolbar ? floatingToolbar.selectionEnd : textarea.selectionEnd;
    const textVal = textarea.value;
    const indentStr = '    '; // 4칸 스페이스

    // 선택 영역이 걸쳐 있는 첫 번째 줄의 시작 위치
    const startOfFirstLine = textVal.lastIndexOf('\n', selectionStart - 1) + 1;

    // 선택 영역이 걸쳐 있는 마지막 줄의 끝 위치
    // 만약 selectionEnd가 정확히 줄의 시작(이전 줄 끝의 \n 바로 다음)이고 여러 줄 선택 상태라면 이전 줄까지만 포함
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

    onChange(updatedText);
    setFloatingToolbar(null);

    // 커서 및 선택 영역 유지
    setTimeout(() => {
      if (!textarea) return;
      textarea.focus();
      const newStart = Math.max(startOfFirstLine, selectionStart + deltaStart);
      const newEnd = Math.max(newStart, selectionEnd + deltaTotal);
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // 형광펜 토글 (선택 영역을 ==...== 로 감싸거나 기존 형광펜 제거)
  const handleToggleHighlight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selStart = floatingToolbar ? floatingToolbar.selectionStart : textarea.selectionStart;
    const selEnd = floatingToolbar ? floatingToolbar.selectionEnd : textarea.selectionEnd;
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

  // 마우스 선택 감지 -> 플로팅 툴바 띄우기
  const handleMouseUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = textarea.value.slice(start, end).trim();
      if (selected.length > 0) {
        const rect = textarea.getBoundingClientRect();
        // textarea 상단 중앙에 플로팅 툴팁 띄우기
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
      {/* 상단 액션 툴바 */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 형광펜 버튼 */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleToggleHighlight();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors cursor-pointer shadow-2xs"
            title="마우스로 선택한 텍스트에 형광펜 칠하기 (클릭 시 토글)"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-700" />
            <span>형광펜 칠하기</span>
          </button>

          {/* 들여쓰기 버튼 */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleIndent(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer shadow-2xs"
            title="선택한 줄 오른쪽으로 들여쓰기 (Tab 키로도 가능)"
          >
            <Indent className="w-3.5 h-3.5 text-indigo-600" />
            <span>들여쓰기</span>
          </button>

          {/* 내어쓰기 버튼 */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleIndent(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer shadow-2xs"
            title="선택한 줄 왼쪽으로 내어쓰기 (Shift+Tab 키로도 가능)"
          >
            <Outdent className="w-3.5 h-3.5 text-slate-600" />
            <span>내어쓰기</span>
          </button>

          {/* 형광펜 지우기 버튼 */}
          {(value.includes('==') || value.includes('<mark>')) && (
            <button
              type="button"
              onClick={handleClearAllHighlights}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer"
              title="칠해진 형광펜 일괄 제거"
            >
              <Eraser className="w-3 h-3 text-rose-500" />
              <span>형광펜 지우기</span>
            </button>
          )}
        </div>
      </div>

      {/* 본문 텍스트 영역 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={handleMouseUp}
        onKeyUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        rows={12}
        placeholder={placeholder || '주의사항 내용을 입력하세요.'}
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
            title="들여쓰기 (4칸)"
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
            title="내어쓰기"
          >
            <Outdent className="w-3.5 h-3.5 text-slate-400" />
            <span>내어쓰기</span>
          </button>
        </div>
      )}

      {/* 저장 / 취소 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
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
  );
};
