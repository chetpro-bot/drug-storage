import React, { useState } from 'react';
import { ProductItem, ProductPackageOption } from '../types/product';
import { useProductStore } from '../stores/useProductStore';
import {
  getDailyDose,
  calculateDuration,
  calculateDailyCost,
  resolveProductPackageOptions
} from '../utils/packageCalculator';
import { Package, Plus, Trash2, Edit2, Check, Star } from 'lucide-react';

interface PackagePricingSectionProps {
  product: ProductItem;
}

/**
 * 약국 복약 상담용 포장 규격 및 판매가 / 복용 기간 테이블
 * - 낱병, 소박스, 대박스 등 다중 규격별 수량 및 판매가 관리
 * - 1일 복용량 기반 복용 가능 기간(O일분/O개월분) 및 1일 환산가 자동 계산
 */
export const PackagePricingSection: React.FC<PackagePricingSectionProps> = ({ product }) => {
  const { updateProduct } = useProductStore();
  const [isEditing, setIsEditing] = useState(false);

  const dailyDose = getDailyDose(product);
  const currentOptions = resolveProductPackageOptions(product);

  // 편집 폼 상태
  const [draftOptions, setDraftOptions] = useState<ProductPackageOption[]>([]);

  const handleStartEdit = () => {
    setDraftOptions(JSON.parse(JSON.stringify(currentOptions)));
    setIsEditing(true);
  };

  const handleAddOption = () => {
    const defaultUnit = product.servingUnitKorean || '정';
    const newId = `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newOption: ProductPackageOption = {
      id: newId,
      name: '',
      totalQuantity: dailyDose > 0 ? dailyDose * 30 : 30, // 기본 30일치
      unit: defaultUnit,
      priceKrw: 0,
      isDefault: draftOptions.length === 0
    };
    setDraftOptions([...draftOptions, newOption]);
  };

  const handleRemoveOption = (id: string) => {
    if (draftOptions.length <= 1) {
      alert('최소 1개 이상의 포장 규격이 있어야 합니다.');
      return;
    }
    const filtered = draftOptions.filter((o) => o.id !== id);
    // 만약 대표 규격을 삭제했다면 첫 번째 항목을 대표로 지정
    if (!filtered.some((o) => o.isDefault) && filtered.length > 0) {
      filtered[0].isDefault = true;
    }
    setDraftOptions(filtered);
  };

  const handleSetDefault = (id: string) => {
    setDraftOptions(
      draftOptions.map((o) => ({
        ...o,
        isDefault: o.id === id
      }))
    );
  };

  const handleSave = async () => {
    // 유효성 검사
    const valid = draftOptions.filter((o) => o.totalQuantity > 0);
    if (valid.length === 0) {
      alert('최소 1개 이상의 규격 정보를 올바르게 입력해주세요.');
      return;
    }

    // 대표 규격이 없으면 첫 번째 항목으로 설정
    if (!valid.some((o) => o.isDefault)) {
      valid[0].isDefault = true;
    }

    const defaultOpt = valid.find((o) => o.isDefault) || valid[0];

    try {
      await updateProduct(product.id, {
        packageOptions: valid,
        priceRetailKrw: defaultOpt.priceKrw,
        packagingUnit: defaultOpt.name || `${defaultOpt.totalQuantity}${defaultOpt.unit || '정'}`
      });
      setIsEditing(false);
    } catch (e) {
      console.error('포장 규격 저장 실패:', e);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-2 bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-extrabold text-slate-800">
            포장 규격 및 판매가
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            (복용량: 1일 {dailyDose}
            {product.servingUnitKorean || '정'} 기준)
          </span>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
            title="포장 규격(낱병, 소박스, 대박스 등) 및 가격 설정"
          >
            <Edit2 className="w-3 h-3" />
            <span>규격 / 가격 수정</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Check className="w-3 h-3" />
              <span>저장</span>
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        /* 열람 모드 (표 및 카드 형태) */
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 font-bold text-[11px]">
                <th className="py-1.5 px-3 text-center">규격명</th>
                <th className="py-1.5 px-3 text-center">복용 가능 기간</th>
                <th className="py-1.5 px-3 text-center">판매가</th>
                <th className="py-1.5 px-3 text-center">1일 환산 비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentOptions.map((opt) => {
                const duration = calculateDuration(opt.totalQuantity, dailyDose, opt.customDurationDays);
                const dailyCost = calculateDailyCost(opt.priceKrw, duration.days);

                return (
                  <tr
                    key={opt.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      opt.isDefault ? 'bg-sky-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-800">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {opt.isDefault && (
                          <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded shrink-0">
                            대표
                          </span>
                        )}
                        <span>{opt.name || `${opt.totalQuantity}${opt.unit || product.servingUnitKorean || '정'}`}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                        {duration.fullText}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-blue-700 text-xs">
                      {opt.priceKrw > 0 ? `${opt.priceKrw.toLocaleString()} 원` : '가격 미지정'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[11px] text-slate-500 font-medium">
                      {dailyCost > 0 ? (
                        <span className="text-emerald-700 font-bold">
                          1일 약 {dailyCost.toLocaleString()}원
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 편집 모드 (입력 폼) */
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-slate-500">
            낱병, 1박스, 2박스 세트 등 약국에서 취급하는 규격별 수량과 판매가를 입력하세요. 복용 기간과 1일 비용이 자동 계산됩니다.
          </p>

          <div className="space-y-1.5">
            {draftOptions.map((opt) => {
              const duration = calculateDuration(opt.totalQuantity, dailyDose, opt.customDurationDays);
              const dailyCost = calculateDailyCost(opt.priceKrw, duration.days);

              return (
                <div
                  key={opt.id}
                  className="bg-white border border-slate-300 rounded-lg p-2.5 flex items-center gap-2 flex-wrap sm:flex-nowrap shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => handleSetDefault(opt.id)}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      opt.isDefault ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'
                    }`}
                    title={opt.isDefault ? '대표 규격 (메인 노출)' : '대표 규격으로 설정'}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>

                  <div className="flex-1 min-w-[110px]">
                    <label className="text-[10px] text-slate-400 block mb-0.5">규격명</label>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numMatch = val.match(/^(\d+)/);
                        const autoQty = numMatch ? parseInt(numMatch[1], 10) : undefined;
                        setDraftOptions(
                          draftOptions.map((o) =>
                            o.id === opt.id
                              ? {
                                  ...o,
                                  name: val,
                                  ...(autoQty && autoQty > 0 ? { totalQuantity: autoQty } : {})
                                }
                              : o
                          )
                        );
                      }}
                      placeholder="예: 낱병, 100정, 1박스"
                      className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="w-24 shrink-0">
                    <label className="text-[10px] text-slate-400 block mb-0.5">총 수량</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={opt.totalQuantity || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setDraftOptions(draftOptions.map((o) => (o.id === opt.id ? { ...o, totalQuantity: val } : o)));
                        }}
                        className="w-full text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded px-1.5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <span className="text-xs text-slate-600 shrink-0 font-medium">
                        {opt.unit || product.servingUnitKorean || '정'}
                      </span>
                    </div>
                  </div>

                  <div className="w-28 shrink-0">
                    <label className="text-[10px] text-slate-400 block mb-0.5">판매가 (원)</label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={opt.priceKrw || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setDraftOptions(draftOptions.map((o) => (o.id === opt.id ? { ...o, priceKrw: val } : o)));
                      }}
                      placeholder="예: 70000"
                      className="w-full text-xs font-mono font-black text-blue-700 border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* 자동 계산 결과 미리보기 */}
                  <div className="w-32 text-right shrink-0 hidden md:block">
                    <span className="text-[10px] text-amber-700 font-bold block">
                      {duration.shortText}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium block">
                      {dailyCost > 0 ? `1일 ${dailyCost.toLocaleString()}원` : '-'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOption(opt.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors shrink-0"
                    title="규격 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-1 flex justify-start">
            <button
              type="button"
              onClick={handleAddOption}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>규격 추가 (예: 2박스 세트 등)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
