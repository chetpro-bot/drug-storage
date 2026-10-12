import React, { useState } from 'react';
import { useProductStore } from '../stores/useProductStore';
import { ProductClassification, DosageForm } from '../types/classification';
import { ProductItem } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { 
  searchPublicDrugDatabase, 
  convertMasterItemToFetchResult, 
  fetchAndNormalizePublicDrugData, 
  PublicDataFetchResult, 
  PublicDrugMasterItem 
} from '../services/publicDataService';
import { recognizeAndParsePackageImage, parseNutritionLabelText, OcrParseResult } from '../services/labelOcrService';
import { 
  X, 
  Search, 
  Database, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Loader2, 
  ShieldCheck, 
  Camera, 
  Upload, 
  Sparkles,
  AlertTriangle,
  Check,
  RotateCcw,
  FileSearch
} from 'lucide-react';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({ isOpen, onClose }) => {
  const { products, addProduct, setSelectedProductId } = useProductStore();

  // 1단계 입력 상태
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [classification, setClassification] = useState<ProductClassification>('OTC_DRUG');

  // 공공데이터 통신 & 다중 검색 결과 상태
  const [isLoadingPublicData, setIsLoadingPublicData] = useState(false);
  const [searchResults, setSearchResults] = useState<PublicDrugMasterItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchErrorMsg, setSearchErrorMsg] = useState<string | null>(null);
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

  // 건기식 전용 라벨 사진 AI OCR 상태
  const [showOcrPanel, setShowOcrPanel] = useState(false);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusMessage, setOcrStatusMessage] = useState('');
  const [ocrRawText, setOcrRawText] = useState('');
  const [showRawTextEditor, setShowRawTextEditor] = useState(false);

  // 이름 정규화 (공백, 제형 접미사 제거)
  const normalizeNameForDup = (str: string) => {
    return str
      .replace(/\s+/g, '')
      .replace(/정$|연질캡슐$|경질캡슐$|캡슐$|액$|산$/, '')
      .toLowerCase();
  };

  // 중복 제품 검사
  const findDuplicateProduct = (name: string, regCode?: string): ProductItem | undefined => {
    const trimmedName = name.trim();
    const trimmedCode = regCode?.trim();
    if (!trimmedName && !trimmedCode) return undefined;
    const normTarget = normalizeNameForDup(trimmedName);

    return products.find((p) => {
      // 1. 규격 허가코드 / 품목기준코드 일치 (가장 엄격)
      if (trimmedCode) {
        const pCode = p.otcDetail?.itemSeq || p.functionalFoodDetail?.reportNo;
        if (pCode && pCode.trim() === trimmedCode) return true;
      }
      // 2. 완벽한 제품명 일치
      if (p.productName.trim().toLowerCase() === trimmedName.toLowerCase()) return true;

      // 3. 정규화 이름 일치 (예: '임팩타민시그' vs '임팩타민시그니처' 등)
      if (normTarget.length >= 3) {
        const normP = normalizeNameForDup(p.productName);
        if (normP === normTarget) return true;
        // 4글자 이상일 때 한쪽이 다른 쪽을 포함하는 경우
        if (normTarget.length >= 4 && normP.length >= 4) {
          if (normP.includes(normTarget) || normTarget.includes(normP)) {
            return true;
          }
        }
      }
      return false;
    });
  };

  // 현재 입력/선택된 품목의 중복 상태 실시간 감지
  const currentDuplicate = findDuplicateProduct(productName, regulatoryCode);

  // 폼 필드 전체 초기화 함수
  const resetForm = () => {
    setProductName('');
    setManufacturer('');
    setClassification('OTC_DRUG');
    setIsLoadingPublicData(false);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchErrorMsg(null);
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
    setShowOcrPanel(false);
    setOcrImagePreview(null);
    setIsOcrLoading(false);
    setOcrProgress(0);
    setOcrStatusMessage('');
    setOcrRawText('');
    setShowRawTextEditor(false);
  };

  // 모달이 열릴 때마다 항상 깨끗하게 초기화
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // 클립보드 이미지 붙여넣기(Ctrl+V) 자동 지원
  React.useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setShowOcrPanel(true);
            processOcrFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 공공데이터 결과를 폼 상태에 적용
  const applyFetchResult = (result: PublicDataFetchResult) => {
    setPublicDataFetched(result);
    setDosageForm(result.dosageForm);
    setPackagingUnit(result.packagingUnit);
    setDailyServings(result.dailyServings);
    setAmountPerServing(result.amountPerServing);
    setServingUnitKorean(result.servingUnitKorean);
    setRegulatoryCode(result.regulatoryCode);
    setDosageInstruction(result.dosageInstruction);
    setIndicationsText(result.indicationsSummary.join(', '));
    setVerifiedIngredients(result.parsedIngredients);
  };

  // 약학정보원 검색 결과에서 특정 제품을 선택했을 때
  const handleSelectDrugMaster = (item: PublicDrugMasterItem) => {
    // 1. 정확한 제약회사명과 공식 제품명 자동 반영
    setManufacturer(item.manufacturer);
    setProductName(item.productName);
    setClassification(item.classification);

    // 2. 표준 규격 데이터 변환 및 성분 검수 테이블 세팅
    const result = convertMasterItemToFetchResult(item);
    applyFetchResult(result);

    // 검색 결과 패널 닫기
    setShowSearchResults(false);
    setSearchErrorMsg(null);
  };

  const applyOcrResult = (result: OcrParseResult) => {
    setClassification('HEALTH_FUNCTIONAL_FOOD');
    setDailyServings(result.servingInfo.dailyServings);
    setAmountPerServing(result.servingInfo.amountPerServing);
    setServingUnitKorean(result.servingInfo.servingUnit);
    const instruction = `1일 ${result.servingInfo.dailyServings}회, 1회 ${result.servingInfo.amountPerServing}${result.servingInfo.servingUnit} 섭취`;
    setDosageInstruction(instruction);

    if (result.servingInfo.servingUnit === '포') {
      setDosageForm('LIQUID_ORAL');
    } else if (result.servingInfo.servingUnit === '캡슐') {
      setDosageForm('SOFT_CAPSULE');
    } else {
      setDosageForm('FILM_COATED_TABLET');
    }

    setVerifiedIngredients(result.parsedIngredients);

    setPublicDataFetched({
      productName: productName || '라벨 추출 건강기능식품',
      manufacturer: manufacturer || '식품제조원',
      classification: 'HEALTH_FUNCTIONAL_FOOD',
      dosageForm: result.servingInfo.servingUnit === '포' ? 'LIQUID_ORAL' : 'FILM_COATED_TABLET',
      packagingUnit: `${result.servingInfo.dailyServings * 30}${result.servingInfo.servingUnit} (1개월분)`,
      dailyServings: result.servingInfo.dailyServings,
      amountPerServing: result.servingInfo.amountPerServing,
      servingUnitKorean: result.servingInfo.servingUnit,
      regulatoryCode: '라벨 실물 인증',
      rawIngredientsText: result.rawOcrText.slice(0, 300) + '...',
      indicationsSummary: ['정상적인 면역기능 및 세포분열', '에너지 대사 및 활력'],
      dosageInstruction: instruction,
      parsedIngredients: result.parsedIngredients,
      sourceOrigin: '패키지 라벨 AI OCR 추출'
    });
  };

  const processOcrFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG 등)을 선택해주세요.');
      return;
    }

    setIsOcrLoading(true);
    setOcrProgress(5);
    setOcrStatusMessage('이미지 불러오는 중...');

    const previewUrl = URL.createObjectURL(file);
    setOcrImagePreview(previewUrl);

    try {
      const result = await recognizeAndParsePackageImage(file, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatusMessage(status);
      });

      setOcrRawText(result.rawOcrText);

      if (result.parsedIngredients.length === 0) {
        alert('라벨에서 영양성분을 감지하지 못했습니다. 글씨가 선명한 사진을 다시 선택해주세요.');
        return;
      }

      applyOcrResult(result);
    } catch (err: any) {
      console.error('OCR 파싱 실패:', err);
      alert('라벨 인식 중 오류가 발생했습니다: ' + (err?.message || '이미지를 확인해주세요'));
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processOcrFile(file);
    }
  };

  // 실물 라벨 텍스트 수동 재파싱
  const handleReparseRawText = () => {
    if (!ocrRawText.trim()) return;
    const result = parseNutritionLabelText(ocrRawText);
    applyOcrResult(result);
    setShowRawTextEditor(false);
  };

  // 마이타민업 실물 라벨 즉시 테스트
  const handleTestMytaminSample = () => {
    const sampleText = `[영양·기능정보]
1일 섭취량: 2포(40g)
1일 섭취량 당 함량: 열량 35 kcal, 탄수화물 8g, 당류 7g, 단백질 1g 미만, 지방 0g, 나트륨 0mg
비타민B1 2mg (167%)
비타민B2 2.4mg (171%)
나이아신 26mg NE (173%)
비타민B6 3mg (200%)
아연 8mg (94%)
원재료명 및 함량: 글루콘산아연, 티아민염산염, 리보플라빈포스페이트나트륨, 피리독신염산염, 니코틴산아미드, L-아르기닌, L-라이신염산염, L-카르니틴, 글루콘산마그네슘, 젖산칼슘, 브로멜라인, 파파인, 수용성커큐민`;
    setProductName('마이타민업');
    setManufacturer('네이처스팜 (제조: 콜마비앤에이치)');
    setOcrRawText(sampleText);
    const result = parseNutritionLabelText(sampleText);
    applyOcrResult(result);
  };

  if (!isOpen) return null;

  // 약학정보원 검색 실행 (다중 결과 검색 지원)
  const handleFetchPublicData = async () => {
    const query = productName.trim() || manufacturer.trim();
    if (!query) {
      alert('조회할 제품명 또는 제약회사명을 입력해주세요.\n(예: "임팩타민", "비맥스", "벤포벨", "대웅제약" 등)');
      return;
    }

    setIsLoadingPublicData(true);
    setSearchErrorMsg(null);
    try {
      const results = searchPublicDrugDatabase(query);

      if (results.length === 0) {
        if (classification === 'OTC_DRUG') {
          setSearchErrorMsg(`"${query}"에 해당하는 약학정보원(KPAIC) 등록 제품을 찾을 수 없습니다. 정확한 제품명을 입력해주세요.`);
          setShowSearchResults(false);
        } else {
          // 건기식/일반식품 fallback
          const fallback = await fetchAndNormalizePublicDrugData(productName, manufacturer, classification);
          applyFetchResult(fallback);
          setShowSearchResults(false);
        }
      } else {
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (e: any) {
      console.error('약학정보원 조회 실패:', e);
      alert(e?.message || '약학정보원 조회 중 오류가 발생했습니다.');
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

    // 1. 중복 품목 등록 차단
    if (currentDuplicate) {
      alert(
        `[중복 등록 차단]\n취급 목록에 이미 "${currentDuplicate.productName}" (${currentDuplicate.manufacturer})이(가) 등록되어 있습니다.\n동일한 품목은 중복 등록할 수 없습니다.`
      );
      return;
    }

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>약학정보원(KPAIC) DB 연동 & 신규 품목 등록 모듈</span>
              </h3>
              <p className="text-xs text-slate-500">
                약학정보원(KPAIC) 정밀 성분 DB 조회 ➔ 영문 INN 표준 매핑 ➔ 약사 검수(Verification) ➔ 실시간 클라우드 동기화
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors border border-slate-200"
              title="입력창 전체 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>입력창 비우기</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 (스크롤 영역) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1. 제품 기본 정보 및 약학정보원 조회 */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <FileSearch className="w-4 h-4 text-sky-600" />
                <span>[1단계] 약학정보원(KPAIC) 제품 조회 및 규격 확인</span>
              </span>
              <span className="text-[11px] text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded font-medium">
                약학정보원(KPAIC) 표준 규격 DB 연동
              </span>
            </div>

            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  제약회사 / 제조사
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="예: 대웅제약, 종근당, GC녹십자"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-4">
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  제품명 *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchPublicData();
                    }
                  }}
                  placeholder="예: 임팩타민, 비맥스, 벤포벨"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  분류 체계
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as ProductClassification)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                >
                  <option value="OTC_DRUG">일반의약품</option>
                  <option value="HEALTH_FUNCTIONAL_FOOD">건강기능식품</option>
                  <option value="GENERAL_FOOD">기타가공품/식품</option>
                </select>
              </div>

              <div className="col-span-3 flex gap-1.5">
                <button
                  type="button"
                  onClick={handleFetchPublicData}
                  disabled={isLoadingPublicData}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-lg font-bold shadow-xs transition-all active:scale-[0.99] text-[11px]"
                  title="약학정보원(KPAIC) DB에서 제품 검색 및 후보 선택"
                >
                  {isLoadingPublicData ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>조회 중...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>약학정보원 정보 조회</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOcrPanel(!showOcrPanel)}
                  className={`px-2.5 py-2 rounded-lg font-bold text-[11px] border transition-all flex items-center gap-1 shrink-0 ${
                    showOcrPanel
                      ? 'bg-purple-700 text-white border-purple-800'
                      : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                  }`}
                  title="건기식 패키지 뒷면 영양·기능정보표 사진 AI OCR 자동 파싱"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>라벨 사진 OCR</span>
                </button>
              </div>
            </div>

            {/* 검색 에러 알림 */}
            {searchErrorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{searchErrorMsg}</span>
              </div>
            )}

            {/* 약학정보원 검색 결과 다중 후보 선택 리스트 */}
            {showSearchResults && (
              <div className="p-4 bg-sky-50/80 border-2 border-sky-300 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-sky-700" />
                    <span className="font-bold text-xs text-sky-950">
                      약학정보원(KPAIC) 검색 결과 ({searchResults.length}건) — 등록할 제품을 선택하세요
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSearchResults(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {searchResults.map((item) => {
                    const isDup = !!findDuplicateProduct(item.productName, item.regulatoryCode);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectDrugMaster(item)}
                        className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isDup
                            ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
                            : 'bg-white border-slate-200 hover:border-sky-500 hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{item.productName}</span>
                            <span className="text-[11px] font-medium text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded">
                              {item.manufacturer}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              허가코드: {item.regulatoryCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {item.packagingUnit} • {item.dosageInstruction}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isDup ? (
                            <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>이미 등록됨</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>신규 등록 가능</span>
                            </span>
                          )}
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-bold rounded-md bg-sky-600 text-white hover:bg-sky-700"
                          >
                            선택
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 중복 등록 차단 경고 배너 */}
            {currentDuplicate && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-center justify-between gap-3 text-rose-900 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-rose-950 flex items-center gap-2">
                      <span>🚫 [중복 등록 불가] 이미 약국 취급 목록에 등록된 제품입니다</span>
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      현재 취급 목록에 <strong>"{currentDuplicate.productName}"</strong> ({currentDuplicate.manufacturer})이(가) 이미 존재하므로 중복 등록할 수 없습니다.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-md">
                  신규 등록 차단됨
                </span>
              </div>
            )}

            {/* 건기식 전용 패키지 영양·기능정보표 사진 AI OCR 분석기 */}
            {showOcrPanel && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>건기식 전용 [제품 패키지 영양정보표 사진 AI OCR / 라벨 파서]</span>
                  </span>
                  <span className="text-[11px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-medium">
                    클립보드 붙여넣기(Ctrl+V) 지원
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* 파일 업로드 드롭존 */}
                  <div className="col-span-8">
                    <label
                      htmlFor="ocr-file-upload"
                      className={`flex flex-col items-center justify-center p-3.5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        isOcrLoading
                          ? 'border-purple-400 bg-purple-100/50 cursor-wait'
                          : 'border-purple-300 bg-white hover:bg-purple-50/50 hover:border-purple-500'
                      }`}
                    >
                      {isOcrLoading ? (
                        <div className="flex flex-col items-center gap-2 py-1">
                          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-purple-900">{ocrStatusMessage}</p>
                            <div className="w-48 bg-purple-200 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div
                                className="bg-purple-600 h-1.5 transition-all duration-300"
                                style={{ width: `${ocrProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-purple-600 font-mono mt-1 block">
                              {ocrProgress}% 완료
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              영양·기능정보표 사진을 선택하거나 여기로 드래그하세요
                            </p>
                            <p className="text-[11px] text-slate-500">
                              스마트폰 촬영 사진(JPG, PNG) 또는 캡처 이미지 붙여넣기(Ctrl+V)
                            </p>
                          </div>
                        </div>
                      )}
                      <input
                        id="ocr-file-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOcrFileSelect}
                        disabled={isOcrLoading}
                      />
                    </label>
                  </div>

                  {/* 즉시 테스트 버튼 & 썸네일 미리보기 */}
                  <div className="col-span-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleTestMytaminSample}
                      disabled={isOcrLoading}
                      className="w-full py-2 px-2.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
                      title="실제 마이타민업 라벨 데이터를 1초 만에 테스트 파싱합니다"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>🧪 마이타민업 실물 라벨 즉시 테스트</span>
                    </button>

                    {ocrImagePreview && (
                      <div className="flex items-center gap-2 p-1.5 bg-white border border-purple-200 rounded-lg">
                        <img
                          src={ocrImagePreview}
                          alt="라벨 미리보기"
                          className="w-8 h-8 object-cover rounded border border-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-800 truncate block">
                            라벨 사진 로드됨
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRawTextEditor(!showRawTextEditor)}
                            className="text-[10px] text-purple-600 hover:text-purple-800 font-medium underline"
                          >
                            인식된 텍스트 확인/수정
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 인식 텍스트 직접 교정 편집기 (선택 사항) */}
                {showRawTextEditor && (
                  <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        OCR 인식 원문 텍스트 (오타가 있을 경우 직접 수정 후 재파싱 가능)
                      </span>
                      <button
                        type="button"
                        onClick={handleReparseRawText}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold"
                      >
                        텍스트로 다시 파싱
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={ocrRawText}
                      onChange={(e) => setOcrRawText(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {publicDataFetched && (
              <div className="p-3 bg-white border border-emerald-300 rounded-lg flex items-start justify-between gap-3 text-slate-700 animate-in fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-950 text-xs">
                      공식 규격 수집 완료 ({publicDataFetched.sourceOrigin})
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                      허가코드: {publicDataFetched.regulatoryCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-200 line-clamp-2">
                    원문: {publicDataFetched.rawIngredientsText}
                  </p>
                </div>
                <span className="text-emerald-700 font-bold shrink-0 text-right text-xs">
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
                    [2단계] 약사 임상 검수 (Verification Table) — 성분명(English INN), 함량 확인
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

              {/* 성분 검수 테이블 (기능 분류, 원료 형태, MOA 컬럼 제거됨) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">성분명 (English INN)</th>
                      <th className="py-2.5 px-3 w-[140px] text-right">투입 함량</th>
                      <th className="py-2.5 px-3 w-[100px]">단위</th>
                      <th className="py-2.5 px-3 w-[140px] text-right">순수 원소량</th>
                      <th className="py-2.5 px-2 w-[50px] text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verifiedIngredients.map((ing, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
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
                  <label className="block font-bold text-slate-700 mb-1 text-xs">제형</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-xs"
                  >
                    <option value="FILM_COATED_TABLET">필름코팅정</option>
                    <option value="TABLET">일반정제</option>
                    <option value="SOFT_CAPSULE">연질캡슐</option>
                    <option value="HARD_CAPSULE">경질캡슐</option>
                    <option value="LIQUID_ORAL">액제/스틱시럽</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">포장 규격</label>
                  <input
                    type="text"
                    value={packagingUnit}
                    onChange={(e) => setPackagingUnit(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">1일 복용 횟수</label>
                  <input
                    type="number"
                    min={1}
                    value={dailyServings}
                    onChange={(e) => setDailyServings(parseInt(e.target.value) || 1)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-right text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">1회 복용량 (단위)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={amountPerServing}
                      onChange={(e) => setAmountPerServing(parseInt(e.target.value) || 1)}
                      className="w-14 p-1.5 border border-slate-300 rounded-md bg-white text-right text-xs"
                    />
                    <input
                      type="text"
                      value={servingUnitKorean}
                      onChange={(e) => setServingUnitKorean(e.target.value)}
                      className="w-14 p-1.5 border border-slate-300 rounded-md bg-white text-center text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">소비자 판매가 (원)</label>
                  <input
                    type="number"
                    value={priceRetailKrw}
                    onChange={(e) => setPriceRetailKrw(parseInt(e.target.value) || 0)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* 임상 태그 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  임상 검색 태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="예: 고함량활성B군, 메코발라민, 신경통, 만성피로"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
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
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 text-xs"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={verifiedIngredients.length === 0 || isSubmitting || !!currentDuplicate}
              className={`px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-xs ${
                currentDuplicate
                  ? 'bg-rose-200 text-rose-500 cursor-not-allowed border border-rose-300'
                  : 'bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white active:scale-[0.98]'
              }`}
              title={currentDuplicate ? '이미 취급 목록에 등록된 품목입니다' : undefined}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>약국 Cloud DB 동기화 중...</span>
                </>
              ) : currentDuplicate ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>이미 등록된 품목 (등록 불가)</span>
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
