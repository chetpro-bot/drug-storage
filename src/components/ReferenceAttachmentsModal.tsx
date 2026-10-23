import React, { useState, useRef, useEffect } from 'react';
import { ProductItem, ReferenceAttachment } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import {
  X,
  Paperclip,
  Upload,
  FileText,
  Trash2,
  Eye,
  ExternalLink,
  Download,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';

interface ReferenceAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem;
}

/**
 * 사용자 열람 전용 제품 참고 자료 첨부 및 뷰어 모달
 * - 이미지 및 PDF 첨부 지원
 * - 첨부된 자료 클릭 시 팝업으로 내용 열람 (이미지 확대 뷰어 & PDF 인라인 뷰어)
 * - AI나 시스템이 자료를 읽어서 성분/주의사항에 반영하지 않는 순수 사용자 열람용
 */
export const ReferenceAttachmentsModal: React.FC<ReferenceAttachmentsModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const { updateProduct } = useProductStore();
  const currentProduct =
    useProductStore((state) => state.products.find((p) => p.id === product.id)) || product;
  const attachments: ReferenceAttachment[] = currentProduct.referenceAttachments || [];

  // 파일 업로드 input ref & 드래그 오버 상태
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 팝업 내용 열람 뷰어 상태
  const [viewingItem, setViewingItem] = useState<ReferenceAttachment | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);

  // 모달 닫힐 때 뷰어 리셋
  useEffect(() => {
    if (!isOpen) {
      setViewingItem(null);
      setImageScale(1);
      setImageRotation(0);
    }
  }, [isOpen]);

  // 클립보드 붙여넣기(Ctrl+V) 지원 (스크린샷 바로 붙여넣기)
  useEffect(() => {
    if (!isOpen || viewingItem) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        await handleAddFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, viewingItem, product.id]);

  if (!isOpen) return null;

  // 파일을 Base64 Data URL로 변환
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 파일 크기 포맷터
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 파일 업로드 처리 (이미지 및 PDF 지원)
  const handleAddFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf' ||
        f.name.toLowerCase().endsWith('.pdf')
    );

    if (fileArray.length === 0) {
      alert('이미지 파일(JPG, PNG, WebP 등) 또는 PDF 파일만 첨부할 수 있습니다.');
      return;
    }

    setIsUploading(true);
    try {
      const newDocs: ReferenceAttachment[] = [];
      for (const file of fileArray) {
        const dataUrl = await readFileAsDataUrl(file);
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        newDocs.push({
          id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
          uploadedAt: new Date().toISOString(),
          dataUrl
        });
      }

      const latest = useProductStore.getState().products.find((p) => p.id === product.id) || product;
      const currentList = latest.referenceAttachments || [];
      const updated = [...currentList, ...newDocs];
      await updateProduct(product.id, { referenceAttachments: updated });
    } catch (err: any) {
      console.error('자료 첨부 실패:', err);
      alert('파일을 첨부하는 중 오류가 발생했습니다: ' + (err?.message || '다시 시도해주세요.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 파일 삭제 처리
  const handleDeleteItem = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm('이 첨부 자료를 삭제하시겠습니까?')) return;

    const latest = useProductStore.getState().products.find((p) => p.id === product.id) || product;
    const currentList = latest.referenceAttachments || [];
    const updated = currentList.filter((d) => d.id !== docId);

    if (viewingItem?.id === docId) {
      setViewingItem(null);
    }

    await updateProduct(product.id, { referenceAttachments: updated });
  };

  // 팝업으로 내용 열람 열기
  const handleOpenViewer = (item: ReferenceAttachment) => {
    setViewingItem(item);
    setImageScale(1);
    setImageRotation(0);
  };

  // 새 창에서 파일 열기 (Base64 -> Blob URL 변환하여 안전하게 새 탭 열기)
  const handleOpenInNewTab = (item: ReferenceAttachment) => {
    try {
      const byteCharacters = atob(item.dataUrl.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mime = item.fileType || (item.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const blob = new Blob([byteArray], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.warn('새 창 열기 실패, 직접 dataUrl 시도:', e);
      window.open(item.dataUrl, '_blank');
    }
  };

  // 파일 다운로드
  const handleDownload = (e: React.MouseEvent, item: ReferenceAttachment) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPdfFile = (item: ReferenceAttachment) => {
    return (
      item.fileType === 'application/pdf' ||
      item.fileName.toLowerCase().endsWith('.pdf') ||
      item.dataUrl.startsWith('data:application/pdf')
    );
  };

  return (
    <>
      {/* 1. 첨부 자료 목록 및 추가 모달 */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 truncate">
                  참고 자료 첨부 / 열람
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {product.productName} ({attachments.length}건)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 안내 배너: 순수 열람용 */}
          <div className="px-5 py-2.5 bg-purple-50/60 border-b border-purple-100 flex items-center gap-2 text-xs text-purple-900">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="leading-snug">
              첨부된 이미지나 PDF는 <strong>사용자 열람 전용</strong>이며, 시스템이 자동으로 읽어 제품 정보에 반영하지 않습니다.
            </span>
          </div>

          {/* 파일 업로드 드롭존 */}
          <div className="p-5 border-b border-slate-100">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
              accept="image/*,.pdf,application/pdf"
              multiple
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/30'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    이미지 또는 PDF 파일을 드래그하여 놓거나 클릭하여 선택
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    JPG, PNG, WebP, GIF, PDF 파일 지원 • 클립보드(Ctrl+V) 스크린샷 붙여넣기 지원
                  </p>
                </div>
                {isUploading && (
                  <p className="text-xs font-bold text-purple-700 animate-pulse mt-1">
                    자료를 업로드하는 중...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 첨부 자료 목록 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                첨부된 자료 목록 ({attachments.length})
              </span>
              <span className="text-[11px] text-slate-400">
                카드를 클릭하면 팝업으로 내용을 열람합니다
              </span>
            </div>

            {attachments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-slate-100 rounded-xl bg-slate-50/40">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium">첨부된 자료가 없습니다.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  상단의 업로드 영역을 통해 이미지나 PDF 문서를 첨부하세요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((item) => {
                  const isPdf = isPdfFile(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenViewer(item)}
                      className="group relative flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50/20 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                    >
                      {/* 썸네일 또는 아이콘 */}
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {isPdf ? (
                          <div className="flex flex-col items-center justify-center text-rose-600">
                            <FileText className="w-5 h-5" />
                            <span className="text-[9px] font-extrabold uppercase">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={item.dataUrl}
                            alt={item.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                      </div>

                      {/* 파일 상세 정보 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0 ${
                              isPdf
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {isPdf ? 'PDF' : '이미지'}
                          </span>
                          <p
                            className="text-xs font-bold text-slate-800 truncate"
                            title={item.fileName}
                          >
                            {item.fileName}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatFileSize(item.fileSize)} •{' '}
                          {new Date(item.uploadedAt).toLocaleDateString('ko-KR')}
                        </p>
                        <p className="text-[10px] text-purple-600 font-medium group-hover:underline flex items-center gap-1 mt-0.5">
                          <Eye className="w-3 h-3" />
                          <span>클릭하여 팝업으로 보기</span>
                        </p>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          title="다운로드"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 모달 하단 닫기 */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 2. 첨부 자료 팝업 뷰어 (클릭 시 전체 모달 팝업으로 크게 표시) */}
      {viewingItem && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 뷰어 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                    isPdfFile(viewingItem) ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
                  }`}
                >
                  {isPdfFile(viewingItem) ? 'PDF 문서' : '이미지'}
                </span>
                <h4 className="text-xs sm:text-sm font-bold truncate max-w-md sm:max-w-xl">
                  {viewingItem.fileName}
                </h4>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  ({formatFileSize(viewingItem.fileSize)})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* 이미지 전용 컨트롤 */}
                {!isPdfFile(viewingItem) && (
                  <div className="flex items-center gap-1 mr-2 bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-700 text-slate-200">
                    <button
                      type="button"
                      onClick={() => setImageScale((s) => Math.max(0.5, s - 0.25))}
                      className="p-1 hover:text-white rounded"
                      title="축소"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono px-1">
                      {Math.round(imageScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageScale((s) => Math.min(3, s + 0.25))}
                      className="p-1 hover:text-white rounded"
                      title="확대"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageRotation((r) => (r + 90) % 360)}
                      className="p-1 hover:text-white rounded ml-1"
                      title="90도 회전"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(viewingItem)}
                  className="flex items-center gap-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  title="새 탭에서 열기"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">새 탭</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownload(e, viewingItem)}
                  className="flex items-center gap-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">다운로드</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 뷰어 본문 */}
            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-2 sm:p-4">
              {isPdfFile(viewingItem) ? (
                <iframe
                  src={viewingItem.dataUrl}
                  title={viewingItem.fileName}
                  className="w-full h-full rounded-xl bg-white shadow-md border border-slate-300"
                />
              ) : (
                <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
                  <img
                    src={viewingItem.dataUrl}
                    alt={viewingItem.fileName}
                    style={{
                      transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.15s ease-out'
                    }}
                    className="max-w-full max-h-[80vh] object-contain shadow-lg rounded-lg select-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
