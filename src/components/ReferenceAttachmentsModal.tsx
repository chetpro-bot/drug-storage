import React, { useState, useRef, useEffect } from 'react';
import { ProductItem, ReferenceAttachment } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import {
  uploadReferenceFileToStorage,
  deleteReferenceFileFromStorage
} from '../services/storageService';
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
  RotateCw,
  Maximize2,
  Minimize2
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'fit' | 'width' | 'custom'>('fit');
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // 마우스 드래그 패닝(Panning) 상태
  const viewerScrollRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  // 모달 닫힐 때 뷰어 리셋
  useEffect(() => {
    if (!isOpen) {
      setViewingItem(null);
      setImageScale(1);
      setImageRotation(0);
      setIsFullscreen(false);
      setViewMode('fit');
      setNaturalSize({ width: 0, height: 0 });
      setIsPanning(false);
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

  // 파일을 Base64 Data URL로 변환 (PDF 등 비이미지용)
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * 첨부 이미지 고해상도 최적화 압축 함수 (Storage 미연동 시 Fallback용)
   * - 포스터/설명서의 작은 글씨 가독성을 위해 긴 변 한도를 3200px로 대폭 확장
   * - 세로로 긴 약품 포스터도 가로 해상도가 뭉개지지 않고 선명하게 유지
   */
  const compressImageForAttachment = async (file: File): Promise<{ dataUrl: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const originalDataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxDim = 3200; // 긴 상세페이지 포스터도 글자가 선명하도록 3200px 지원
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 배경을 흰색으로 채움 (투명 PNG가 검은색으로 변하는 것 방지)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const approximateSize = Math.round((compressedDataUrl.length * 3) / 4);
            resolve({ dataUrl: compressedDataUrl, size: approximateSize });
          } else {
            resolve({ dataUrl: originalDataUrl, size: file.size });
          }
        };
        img.onerror = () => resolve({ dataUrl: originalDataUrl, size: file.size });
        img.src = originalDataUrl;
      };
      reader.onerror = (err) => reject(err);
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

  // 파일 업로드 처리 (Firebase Storage 원본 고속 업로드 & Base64 Fallback)
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
      const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35MB

      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          alert(`파일 '${file.name}'의 크기(${formatFileSize(file.size)})가 너무 큽니다. (최대 35MB 지원)`);
          continue;
        }

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const fileId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        // 1단계: Firebase Storage에 원본 그대로 고속 업로드 (압축 손실 0%, 원본 화질 100% 보존)
        const storageResult = await uploadReferenceFileToStorage(product.id, file, fileId);

        if (storageResult) {
          newDocs.push({
            id: fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
            uploadedAt: new Date().toISOString(),
            dataUrl: storageResult.downloadUrl,
            storagePath: storageResult.storagePath
          });
        } else {
          // 2단계 (Fallback): Storage 미설정 또는 네트워크 오류 시 로컬 Base64 보존
          if (isPdf) {
            const dataUrl = await readFileAsDataUrl(file);
            newDocs.push({
              id: fileId,
              fileName: file.name,
              fileSize: file.size,
              fileType: 'application/pdf',
              uploadedAt: new Date().toISOString(),
              dataUrl
            });
          } else {
            const { dataUrl, size } = await compressImageForAttachment(file);
            newDocs.push({
              id: fileId,
              fileName: file.name,
              fileSize: size,
              fileType: 'image/jpeg',
              uploadedAt: new Date().toISOString(),
              dataUrl
            });
          }
        }
      }

      if (newDocs.length === 0) return;

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

  // 파일 삭제 처리 (Storage 원본 파일 동시 삭제)
  const handleDeleteItem = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm('이 첨부 자료를 삭제하시겠습니까?')) return;

    const latest = useProductStore.getState().products.find((p) => p.id === product.id) || product;
    const currentList = latest.referenceAttachments || [];
    const docToDelete = currentList.find((d) => d.id === docId);
    const updated = currentList.filter((d) => d.id !== docId);

    if (viewingItem?.id === docId) {
      setViewingItem(null);
    }

    // Storage 원본 파일도 함께 백그라운드 삭제
    if (docToDelete?.storagePath) {
      deleteReferenceFileFromStorage(docToDelete.storagePath).catch(() => {});
    }

    await updateProduct(product.id, { referenceAttachments: updated });
  };

  // 팝업으로 내용 열람 열기
  const handleOpenViewer = (item: ReferenceAttachment) => {
    setViewingItem(item);
    setImageScale(1);
    setImageRotation(0);
    setViewMode('fit');
    setNaturalSize({ width: 0, height: 0 });
    setIsFullscreen(false);
    setIsPanning(false);
  };

  // 이미지 줌 및 뷰 모드 핸들러
  const handleZoomIn = () => {
    setViewMode('custom');
    setImageScale((s) => Math.min(4, parseFloat((s + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setViewMode('custom');
    setImageScale((s) => Math.max(0.25, parseFloat((s - 0.25).toFixed(2))));
  };

  const handleFitWindow = () => {
    setViewMode('fit');
    setImageScale(1);
  };

  const handleFitWidth = () => {
    setViewMode('width');
    setImageScale(1);
  };

  const handleResetOriginal = () => {
    setViewMode('custom');
    setImageScale(1);
  };

  // 마우스 드래그 패닝 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !viewerScrollRef.current) return;
    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewerScrollRef.current.scrollLeft,
      scrollTop: viewerScrollRef.current.scrollTop
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !viewerScrollRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    viewerScrollRef.current.scrollLeft = panStart.scrollLeft - dx;
    viewerScrollRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // 새 창에서 파일 열기 (Storage HTTPS URL 또는 Base64)
  const handleOpenInNewTab = (item: ReferenceAttachment) => {
    if (item.dataUrl.startsWith('http://') || item.dataUrl.startsWith('https://')) {
      window.open(item.dataUrl, '_blank');
      return;
    }
    try {
      const parts = item.dataUrl.split(',');
      if (parts.length > 1) {
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const mime = item.fileType || (item.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }
    } catch (e) {
      console.warn('새 창 열기 실패, 직접 dataUrl 시도:', e);
    }
    window.open(item.dataUrl, '_blank');
  };

  // 파일 다운로드 (Storage HTTPS URL 또는 Base64)
  const handleDownload = async (e: React.MouseEvent, item: ReferenceAttachment) => {
    e.stopPropagation();
    if (item.dataUrl.startsWith('http://') || item.dataUrl.startsWith('https://')) {
      try {
        const res = await fetch(item.dataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = item.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      } catch (err) {
        console.warn('Storage 파일 fetch 실패, 직접 다운로드 fallback:', err);
      }
    }
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
      item.dataUrl.startsWith('data:application/pdf') ||
      item.dataUrl.toLowerCase().includes('.pdf')
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
          className={`fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150 ${
            isFullscreen ? 'p-0' : 'p-1.5 sm:p-3'
          }`}
          onClick={() => {
            if (!isPanning) setViewingItem(null);
          }}
        >
          <div
            className={`bg-slate-900 shadow-2xl flex flex-col overflow-hidden border border-slate-700 transition-all ${
              isFullscreen
                ? 'w-screen h-screen rounded-none border-0'
                : 'w-full max-w-[97vw] h-[96vh] rounded-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 뷰어 헤더 */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-slate-800 bg-slate-900/95 text-white shrink-0 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                    isPdfFile(viewingItem) ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
                  }`}
                >
                  {isPdfFile(viewingItem) ? 'PDF 문서' : '이미지'}
                </span>
                <h4 className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md lg:max-w-xl text-slate-100">
                  {viewingItem.fileName}
                </h4>
                <span className="text-[11px] text-slate-400 hidden md:inline shrink-0">
                  ({formatFileSize(viewingItem.fileSize)})
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                {/* 이미지 전용 컨트롤 (화면 맞춤 / 너비 맞춤 / 확대축소 / 회전) */}
                {!isPdfFile(viewingItem) && (
                  <div className="flex items-center gap-1 bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-slate-700 text-slate-200">
                    <button
                      type="button"
                      onClick={handleFitWindow}
                      className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                        viewMode === 'fit'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                      title="화면 전체에 맞추기"
                    >
                      창 맞춤
                    </button>
                    <button
                      type="button"
                      onClick={handleFitWidth}
                      className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                        viewMode === 'width'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                      title="가로 너비에 맞추기 (세로로 긴 상세페이지 포스터 읽기에 적합)"
                    >
                      너비 맞춤
                    </button>

                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="축소"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetOriginal}
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="100% 원본 크기로 리셋"
                    >
                      {viewMode === 'custom' ? `${Math.round(imageScale * 100)}%` : viewMode === 'width' ? '너비' : '맞춤'}
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="확대"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => setImageRotation((r) => (r + 90) % 360)}
                      className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="90도 회전"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 전체화면 토글 */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen((f) => !f)}
                  className="flex items-center gap-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  title={isFullscreen ? '창 모드로 복귀' : '전체 화면으로 크게 보기'}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">창 모드</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">전체화면</span>
                    </>
                  )}
                </button>

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
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-0.5"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 뷰어 본문 (스크롤 및 마우스 드래그 패닝 지원) */}
            <div
              ref={viewerScrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`flex-1 bg-slate-950 overflow-auto relative p-4 sm:p-8 select-none flex ${
                viewMode === 'width' ? 'items-start justify-center' : 'items-center justify-center'
              } ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            >
              {isPdfFile(viewingItem) ? (
                <iframe
                  src={viewingItem.dataUrl}
                  title={viewingItem.fileName}
                  className="w-full h-full rounded-xl bg-white shadow-md border border-slate-800"
                />
              ) : (
                <div className="m-auto flex items-center justify-center transition-all duration-100">
                  <img
                    src={viewingItem.dataUrl}
                    alt={viewingItem.fileName}
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                    style={{
                      transform: imageRotation ? `rotate(${imageRotation}deg)` : undefined,
                      ...(viewMode === 'custom' && {
                        width: `${Math.round((naturalSize.width || 800) * imageScale)}px`,
                        maxWidth: 'none',
                        maxHeight: 'none'
                      })
                    }}
                    className={`shadow-2xl rounded-lg pointer-events-none transition-transform duration-100 ${
                      viewMode === 'fit'
                        ? 'max-w-full max-h-[85vh] object-contain'
                        : viewMode === 'width'
                        ? 'w-full max-w-5xl h-auto object-contain'
                        : 'object-contain'
                    }`}
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
