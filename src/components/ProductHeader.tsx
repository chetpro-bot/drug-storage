import React, { useState, useRef } from 'react';
import { ProductItem, getProductThumbnail } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import { AttachedDocumentsModal } from './AttachedDocumentsModal';
import { NewProductModal } from './NewProductModal';
import { 
  Building2, 
  Clock, 
  Tag, 
  Trash2, 
  Paperclip,
  Edit3,
  ArrowLeft,
  MapPin,
  Camera,
  Pill
} from 'lucide-react';

interface ProductHeaderProps {
  product: ProductItem;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ product }) => {
  const { deleteProduct, setViewMode, setSelectedTag, updateProduct } = useProductStore();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const thumbnail = getProductThumbnail(product);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          updateProduct(product.id, { imageUrl: canvas.toDataURL('image/jpeg', 0.85) });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getClassificationBadge = () => {
    switch (product.classification) {
      case 'OTC_DRUG':
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-600 text-white shadow-xs">
            일반의약품 (OTC: Over-The-Counter)
          </span>
        );
      case 'HEALTH_FUNCTIONAL_FOOD':
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-600 text-white shadow-xs">
            건강기능식품
          </span>
        );
      case 'GENERAL_FOOD':
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-600 text-white shadow-xs">
            기타가공품/식품
          </span>
        );
    }
  };

  const getDosageFormKorean = () => {
    switch (product.dosageForm) {
      case 'FILM_COATED_TABLET':
        return '필름코팅정제';
      case 'TABLET':
        return '정제';
      case 'ENTERIC_TABLET':
        return '장용정';
      case 'SOFT_CAPSULE':
        return '연질캡슐';
      case 'HARD_CAPSULE':
        return '경질캡슐';
      case 'LIQUID_ORAL':
        return '경구용 액제/스틱시럽/겔';
      case 'POWDER':
        return '분말/산제';
      case 'GRANULE':
        return '과립제';
      case 'JELLY':
        return '젤리/츄어블';
      default:
        return product.dosageForm;
    }
  };

  const standardInstruction =
    product.otcDetail?.dosageAndAdministrationKorean ||
    product.functionalFoodDetail?.suggestedUseKorean ||
    `1일 ${product.dailyServings}회, 1회 ${product.amountPerServing}${product.servingUnitKorean} 복용`;


  const regulatoryCode =
    product.otcDetail?.itemSeq
      ? `식약처 품목기준코드: ${product.otcDetail.itemSeq}`
      : product.functionalFoodDetail?.reportNo
      ? `품목제조보고: ${product.functionalFoodDetail.reportNo}`
      : '일반식품 품목보고';

  return (
    <div className="bg-white border-b border-slate-200 p-5 shadow-xs shrink-0">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <div className="flex items-start justify-between gap-4">
        {/* 좌측: 제품 대표 사진 썸네일 + 타이틀 및 메타 */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* 제품 대표 사진 박스 (클릭 시 사진 등록/변경) */}
          <div
            onClick={() => photoInputRef.current?.click()}
            className="group relative w-24 h-24 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-2 shrink-0 cursor-pointer overflow-hidden hover:border-sky-400 transition-colors"
            title="클릭하여 제품 대표 사진 등록/변경"
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={product.productName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <Pill className="w-7 h-7 mb-1 text-slate-300" />
                <span className="text-[10px] font-semibold">사진 등록</span>
              </div>
            )}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
              <Camera className="w-4 h-4 text-sky-300" />
              <span>{thumbnail ? '사진 변경' : '사진 업로드'}</span>
            </div>
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 카탈로그 그리드로 돌아가기 버튼 */}
              <button
                onClick={() => setViewMode('CATALOG')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="효능별 제품 카탈로그 그리드 화면으로 돌아가기"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>카탈로그 목록</span>
              </button>

              {getClassificationBadge()}
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {getDosageFormKorean()}
              </span>
              <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {regulatoryCode}
              </span>
              {product.otcDetail?.atcCode && (
                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  ATC: {product.otcDetail.atcCode}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {product.productName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{product.manufacturer}</span>
                {product.distributor && product.distributor !== product.manufacturer && (
                  <span className="text-slate-400">({product.distributor} 공급)</span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-normal">| 포장: {product.packagingUnit}</span>

              {/* 소비자 가격 배지 */}
              {product.priceRetailKrw ? (
                <span className="text-sm font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                  {product.priceRetailKrw.toLocaleString()} 원
                </span>
              ) : null}

              {/* 약 위치 배지 */}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer"
                title="클릭하여 약 위치 수정"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>
                  {product.storageLocation
                    ? `약 위치: ${product.storageLocation}`
                    : '약 위치 입력하기'}
                </span>
              </button>
            </div>

            {/* 표준 섭취/복용법 */}
            <div className="flex items-center gap-2 text-xs text-slate-700 bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-md">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-900">표준 복용·섭취 기준:</span>
              <span className="font-medium">{standardInstruction}</span>
            </div>

            {/* 핵심 효능/특징 태그 (클릭 시 해당 효능 카탈로그 필터로 이동) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <Tag className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
              {product.tags.map((tag, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tag);
                    setViewMode('CATALOG');
                  }}
                  className="text-[11px] font-bold bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                  title={`클릭 시 '${tag}' 효능 제품만 카탈로그에서 모아보기`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 우측 액션: 관리 액션 */}
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {/* 첨부 자료 관리 / 추가 모달 열기 버튼 */}
            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors font-bold cursor-pointer shadow-2xs"
              title="약학정보원 캡처, 제약사 학술자료, 라벨 사진 첨부 및 열람/분석"
            >
              <Paperclip className="w-3.5 h-3.5 text-purple-600" />
              <span>자료 첨부 / 관리</span>
              {product.attachments && product.attachments.length > 0 && (
                <span className="bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {product.attachments.length}
                </span>
              )}
            </button>

            {/* 품목 수정 버튼 */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors font-bold cursor-pointer shadow-2xs"
              title="등록된 제품 정보, 약 위치, 가격 및 유효 성분/함량 수정"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-600" />
              <span>품목 수정</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm(`'${product.productName}' 품목을 약국 데이터베이스에서 삭제하시겠습니까?`)) {
                  deleteProduct(product.id);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors font-semibold cursor-pointer"
              title="잘못 등록된 제품 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>품목 삭제</span>
            </button>
          </div>
        </div>
      </div>

      {/* 첨부 자료 관리 & 뷰어 모달 */}
      <AttachedDocumentsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        product={product}
      />

      {/* 등록 품목 내용 수정 모달 */}
      <NewProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        productToEdit={product}
      />
    </div>
  );
};

