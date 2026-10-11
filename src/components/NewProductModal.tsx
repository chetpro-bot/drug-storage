import React, { useState } from 'react';
import { useProductStore } from '../stores/useProductStore';
import { ProductClassification, DosageForm } from '../types/classification';
import { ProductItem } from '../types/product';
import { FunctionalCategory, ProductIngredientEntry } from '../types/ingredient';
import { fetchAndNormalizePublicDrugData, PublicDataFetchResult } from '../services/publicDataService';
import { 
  X, 
  Search, 
  Database, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Loader2, 
  FileSearch,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';



interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({ isOpen, onClose }) => {
  const { addProduct, setSelectedProductId } = useProductStore();

  // 1단계 입력 상태
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [classification, setClassification] = useState<ProductClassification>('OTC_DRUG');

  // 공공데이터 통신 상태
  const [isLoadingPublicData, setIsLoadingPublicData] = useState(false);
  const [publicDataFetched, setPublicDataFetched] = useState<PublicDataFetchResult | null>(null);

  // 2단계 약사 검수(Verification) 상태
  const [dosageForm, setDosageForm] = useState<DosageForm>('FILM_COATED_TABLET');
  const [packagingUnit, setPackagingUnit] = useState('120정 (60정 x 2)');
  const [dailyServings, setDailyServings] = useState(1);
  const [amountPerServing, setAmountPerServing] = useState(1);
  const [servingUnitKorean, setServingUnitKorean] = useState('정');
  const [priceRetailKrw, setPriceRetailKrw] = useState(70000);
  const [tags, setTags] = useState('만성피로, 활성비타민');
  const [regulatoryCode, setRegulatoryCode] = useState('');
  const [dosageInstruction, setDosageInstruction] = useState('');
  const [indicationsText, setIndicationsText] = useState('');

  // 검수 중인 성분 테이블 목록
  const [verifiedIngredients, setVerifiedIngredients] = useState<ProductIngredientEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 필드 전체 초기화 함수
  const resetForm = () => {
    setProductName('');
    setManufacturer('');
    setClassification('OTC_DRUG');
    setIsLoadingPublicData(false);
    setPublicDataFetched(null);
    setDosageForm('FILM_COATED_TABLET');
    setPackagingUnit('120정 (60정 x 2)');
    setDailyServings(1);
    setAmountPerServing(1);
    setServingUnitKorean('정');
    setPriceRetailKrw(70000);
    setTags('만성피로, 활성비타민');
    setRegulatoryCode('');
    setDosageInstruction('');
    setIndicationsText('');
    setVerifiedIngredients([]);
    setIsSubmitting(false);
  };

  // 모달이 열릴 때마다 항상 깨끗하게 초기화
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;


  // 공공데이터 자동 조회 실행
  const handleFetchPublicData = async () => {
    if (!productName.trim() || !manufacturer.trim()) {
      alert('제약회사/제조사와 제품명을 먼저 입력해주세요.');
      return;
    }

    setIsLoadingPublicData(true);
    try {
      const result = await fetchAndNormalizePublicDrugData(productName, manufacturer, classification);
      setPublicDataFetched(result);
      
      // 검수용 필드에 자동 입력
      setDosageForm(result.dosageForm);
      setPackagingUnit(result.packagingUnit);
      setDailyServings(result.dailyServings);
      setAmountPerServing(result.amountPerServing);
      setServingUnitKorean(result.servingUnitKorean);
      setRegulatoryCode(result.regulatoryCode);
      setDosageInstruction(result.dosageInstruction);
      setIndicationsText(result.indicationsSummary.join(', '));
      setVerifiedIngredients(result.parsedIngredients);
    } catch (e) {
      console.error('공공데이터 조회 실패:', e);
      alert('공공데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingPublicData(false);
    }
  };

  // 약사 성분 인라인 수정
  const handleUpdateIngredient = (index: number, partial: Partial<ProductIngredientEntry>) => {
    setVerifiedIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...partial } : ing))
    );
  };

  // 약사 성분 수동 추가
  const handleAddCustomIngredient = () => {
    const newEntry: ProductIngredientEntry = {
      ingredientId: `ing_manual_${Date.now()}`,
      englishInn: 'Zinc gluconate',
      functionalCategory: '면역/세포분열',
      chemicalFormName: '유기산염 (글루콘산아연)',
      rawAmount: 50,
      unit: 'mg',
      elementalAmount: 7.17,
      isMainActive: false,
      standardKey: 'ZINC',
      clinicalSummary: '• 정상적인 면역 기능 및 세포 분열 지원'
    };
    setVerifiedIngredients([...verifiedIngredients, newEntry]);
  };

  const handleRemoveIngredient = (index: number) => {
    setVerifiedIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // 최종 Firestore 저장
  const handleSaveToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifiedIngredients.length === 0) {
      alert('최소 1개 이상의 유효 성분이 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = `prod_${Date.now()}`;
      const newProduct: ProductItem = {
        id: newId,
        productName: productName.trim(),
        manufacturer: manufacturer.trim(),
        classification,
        dosageForm,
        packagingUnit,
        dailyServings,
        amountPerServing,
        servingUnitKorean,
        priceRetailKrw,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ingredients: verifiedIngredients,
        ...(classification === 'OTC_DRUG'
          ? {
              otcDetail: {
                itemSeq: regulatoryCode || `${Math.floor(202000000 + Math.random() * 4000000)}`,
                permitDate: new Date().toISOString().slice(0, 10),
                indicationsKorean: indicationsText ? [indicationsText] : ['피로회복 및 신경통 완화'],
                dosageAndAdministrationKorean: dosageInstruction || `1일 ${dailyServings}회, 1회 ${amountPerServing}${servingUnitKorean} 복용`,
                storageMethodKorean: '기밀용기, 실온(1~30℃)보관',
                precautionsSummaryKorean: ['복용 전 설명서 참조', '항생제 복용 시 2시간 간격 유지']
              }
            }
          : {
              functionalFoodDetail: {
                reportNo: regulatoryCode || `202400${Math.floor(10000 + Math.random() * 90000)}`,
                functionalClaimsKorean: indicationsText ? [indicationsText] : ['정상적인 면역 및 에너지 대사'],
                suggestedUseKorean: dosageInstruction || `1일 ${dailyServings}회, 1회 ${amountPerServing}${servingUnitKorean} 섭취`,
                safetyPrecautionsKorean: ['특이체질 시 성분 확인']
              }
            })
      };

      await addProduct(newProduct);
      setSelectedProductId(newId);
      resetForm();
      onClose();
    } catch (e) {
      console.error('저장 에러:', e);
      alert('약국 DB 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[980px] max-h-[92vh] flex flex-col border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                공공데이터 연동 & 신규 품목 등록 모듈
              </h3>
              <p className="text-[11px] text-slate-500">
                식약처 의약품안전나라 / 식품안전나라 API 수집 ➔ 영문 INN 표준 매핑 ➔ 약사 검수(Verification) ➔ Cloud Firestore 실시간 동기화
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors font-medium shadow-2xs"
              title="새로운 제품을 등록하기 위해 입력창 비우기"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>입력창 비우기</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* 바디 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* STEP 1. 제약회사 / 제품명 입력 및 공공데이터 자동 조회 */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-950 flex items-center gap-1.5 text-xs">
                <FileSearch className="w-4 h-4 text-sky-600" />
                <span>[1단계] 공공데이터 검색 및 정규화 요청</span>
              </span>
              <span className="text-[11px] text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded font-medium">
                CORS 우회 Cloud Function 프록시 활성
              </span>
            </div>

            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <label className="block font-bold text-slate-700 mb-1">
                  제약회사 / 제조사 *
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="예: 종근당, 대웅제약, GC녹십자"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  제품명 *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 벤포벨에스, 렛잇비, 아로나민골드"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  분류 체계
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as ProductClassification)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                >
                  <option value="OTC_DRUG">일반의약품 (식약처)</option>
                  <option value="HEALTH_FUNCTIONAL_FOOD">건강기능식품 (식품안전)</option>
                  <option value="GENERAL_FOOD">기타가공품/식품</option>
                </select>
              </div>

              <div className="col-span-3">
                <button
                  type="button"
                  onClick={handleFetchPublicData}
                  disabled={isLoadingPublicData}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-lg font-bold shadow-xs transition-all active:scale-[0.99]"
                >
                  {isLoadingPublicData ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>공공데이터 수집·파싱 중...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>공공데이터 자동 조회</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {publicDataFetched && (
              <div className="p-3 bg-white border border-emerald-300 rounded-lg flex items-start justify-between gap-3 text-slate-700 animate-in fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-950">
                      공공데이터 수집 완료 ({publicDataFetched.sourceOrigin})
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                      허가코드: {publicDataFetched.regulatoryCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-200">
                    원문: {publicDataFetched.rawIngredientsText}
                  </p>
                </div>
                <span className="text-emerald-700 font-bold shrink-0 text-right">
                  {publicDataFetched.parsedIngredients.length}종 성분 매핑됨
                </span>
              </div>
            )}
          </div>

          {/* STEP 2. 약사 검수(Verification) 및 정밀 성분 매트릭스 편집 */}
          {verifiedIngredients.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    [2단계] 약사 임상 검수 (Verification Table) — 성분명(English INN), 염(Form), 함량 확인
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomIngredient}
                  className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>배합 성분 추가</span>
                </button>
              </div>

              {/* 성분 검수 테이블 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3 w-[110px]">기능 분류</th>
                      <th className="py-2.5 px-3 w-[190px]">성분명 (English INN)</th>
                      <th className="py-2.5 px-3 w-[180px]">원료 형태 / 염(Form)</th>
                      <th className="py-2.5 px-3 w-[110px] text-right">투입 함량</th>
                      <th className="py-2.5 px-3 w-[80px]">단위</th>
                      <th className="py-2.5 px-3 w-[110px] text-right">순수 원소량</th>
                      <th className="py-2.5 px-3">MOA 작용 기전 요약</th>
                      <th className="py-2.5 px-2 w-[40px] text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verifiedIngredients.map((ing, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {/* 기능 분류 */}
                        <td className="p-2">
                          <select
                            value={ing.functionalCategory}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, {
                                functionalCategory: e.target.value as FunctionalCategory
                              })
                            }
                            className="w-full p-1 border border-slate-300 rounded text-[11px] bg-white font-medium"
                          >
                            <option value="에너지 대사">에너지 대사</option>
                            <option value="신경계/인지 기능">신경계</option>
                            <option value="골격/관절/치아">골격/관절</option>
                            <option value="면역/세포분열">면역/세포</option>
                            <option value="간기능/해독">간기능/해독</option>
                            <option value="항산화/혈행">항산화/혈행</option>
                            <option value="아미노산/단백질 합성">아미노산</option>
                          </select>
                        </td>

                        {/* 성분명 (English INN) */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={ing.englishInn}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, { englishInn: e.target.value })
                            }
                            className="w-full p-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                          />
                        </td>

                        {/* 원료 형태 / 염 (Form) */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={ing.chemicalFormName}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, { chemicalFormName: e.target.value })
                            }
                            className="w-full p-1.5 border border-slate-300 rounded text-slate-700 bg-white text-[11px]"
                          />
                        </td>

                        {/* 투입 함량 */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={ing.rawAmount}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, { rawAmount: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full p-1.5 border border-slate-300 rounded text-right font-mono font-bold text-sky-700 bg-white"
                          />
                        </td>

                        {/* 단위 */}
                        <td className="p-2">
                          <select
                            value={ing.unit}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, {
                                unit: e.target.value as 'mg' | 'ug' | 'IU' | 'g'
                              })
                            }
                            className="w-full p-1.5 border border-slate-300 rounded font-mono text-[11px] bg-white"
                          >
                            <option value="mg">mg</option>
                            <option value="ug">ug</option>
                            <option value="IU">IU</option>
                            <option value="g">g</option>
                          </select>
                        </td>

                        {/* 순수 원소량 */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            placeholder="원소량"
                            value={ing.elementalAmount ?? ''}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, {
                                elementalAmount: e.target.value ? parseFloat(e.target.value) : undefined
                              })
                            }
                            className="w-full p-1.5 border border-slate-200 rounded text-right font-mono text-[11px] text-emerald-700 bg-emerald-50/50"
                          />
                        </td>

                        {/* MOA 작용 기전 요약 */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={ing.clinicalSummary}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, { clinicalSummary: e.target.value })
                            }
                            className="w-full p-1.5 border border-slate-300 rounded text-[11px] text-slate-700 bg-white"
                          />
                        </td>

                        {/* 삭제 */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            disabled={verifiedIngredients.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 기본 규격 및 복용 스케줄 세부 정보 */}
              <div className="grid grid-cols-5 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">제형</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="FILM_COATED_TABLET">필름코팅정</option>
                    <option value="TABLET">일반정제</option>
                    <option value="SOFT_CAPSULE">연질캡슐</option>
                    <option value="HARD_CAPSULE">경질캡슐</option>
                    <option value="LIQUID_ORAL">액제/스틱시럽</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">포장 규격</label>
                  <input
                    type="text"
                    value={packagingUnit}
                    onChange={(e) => setPackagingUnit(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">1일 복용 횟수</label>
                  <input
                    type="number"
                    min={1}
                    value={dailyServings}
                    onChange={(e) => setDailyServings(parseInt(e.target.value) || 1)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-right"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">1회 복용량 (단위)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={amountPerServing}
                      onChange={(e) => setAmountPerServing(parseInt(e.target.value) || 1)}
                      className="w-14 p-1.5 border border-slate-300 rounded-md bg-white text-right"
                    />
                    <input
                      type="text"
                      value={servingUnitKorean}
                      onChange={(e) => setServingUnitKorean(e.target.value)}
                      className="w-14 p-1.5 border border-slate-300 rounded-md bg-white text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">소비자 판매가 (원)</label>
                  <input
                    type="number"
                    value={priceRetailKrw}
                    onChange={(e) => setPriceRetailKrw(parseInt(e.target.value) || 0)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white font-mono"
                  />
                </div>
              </div>

              {/* 임상 태그 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  임상 검색 태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="예: 고함량활성B군, 메코발라민, 신경통, 만성피로"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 액션 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>약국 PC & 집 PC 실시간 Firestore 리스너 동기화 준비 완료</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={verifiedIngredients.length === 0 || isSubmitting}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>약국 Cloud DB 동기화 중...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>약국 Cloud DB에 저장 및 실시간 동기화</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
