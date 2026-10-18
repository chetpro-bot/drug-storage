import React, { useState } from 'react';
import { useProductStore, getDeletedIds } from '../stores/useProductStore';
import { ProductClassification, DosageForm } from '../types/classification';
import { ProductItem, AttachedDocument } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { 
  searchPublicDrugDatabase, 
  convertMasterItemToFetchResult, 
  PublicDataFetchResult, 
  PublicDrugMasterItem 
} from '../services/publicDataService';
import { 
  recognizeUniversalDocument,
  parseNutritionLabelText, 
  parseFoodNutritionLabel,
  parseKpicEfficacyText,
  extractPrecautionsFromOcrText,
  fileToDataUrl,
  OcrParseResult 
} from '../services/labelOcrService';
import { saveLearnedIngredientMapping } from '../utils/innMapper';
import { STANDARD_EFFICACY_CATEGORIES } from '../utils/categoryColors';
import { STANDARD_EFFICACY_TAGS, inferInitialEfficacyTags } from '../constants/efficacyTags';
import { 
  X, 
  Search, 
  Database, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Loader2, 
  ShieldCheck, 
  Upload, 
  Sparkles,
  AlertTriangle,
  Check,
  RotateCcw,
  Paperclip,
  Edit3,
  MapPin,
  Camera
} from 'lucide-react';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: ProductItem | null;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const { products, addProduct, updateProduct, deleteProduct, setSelectedProductId } = useProductStore();
  const isEditMode = !!productToEdit;

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
  const [storageLocation, setStorageLocation] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [tags, setTags] = useState('피로, 활성비타민');
  const [regulatoryCode, setRegulatoryCode] = useState('');
  const [dosageInstruction, setDosageInstruction] = useState('');
  const [indicationsText, setIndicationsText] = useState('');
  const [precautionsText, setPrecautionsText] = useState('');
  const [ingredientBasis, setIngredientBasis] = useState<'PER_UNIT' | 'PER_DAILY'>('PER_UNIT');

  // 검수 중인 성분 테이블 목록
  const [verifiedIngredients, setVerifiedIngredients] = useState<ProductIngredientEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 첨부된 문서(영양라벨, 약학정보원 캡처 등) 상태 보존
  const [attachedDocuments, setAttachedDocuments] = useState<AttachedDocument[]>([]);

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
    const deletedIds = getDeletedIds();
    const trimmedName = name.trim();
    const trimmedCode = regCode?.trim();
    if (!trimmedName && !trimmedCode) return undefined;
    const normTarget = normalizeNameForDup(trimmedName);

    return products.find((p) => {
      // 이미 삭제된 품목이나 과거 시드 잔재는 중복 대상에서 제외
      if (deletedIds.has(p.id) || p.id === 'prod_mdream_liquid_kids') return false;

      // 수정 모드일 때 자기 자신은 중복 대상에서 제외
      if (productToEdit && p.id === productToEdit.id) return false;

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
    setStorageLocation('');
    setProductImageUrl('');
    setTags('피로, 활성비타민');
    setRegulatoryCode('');
    setDosageInstruction('');
    setIndicationsText('');
    setPrecautionsText('');
    setIngredientBasis('PER_UNIT');
    setVerifiedIngredients([]);
    setAttachedDocuments([]);
    setIsSubmitting(false);
    setShowOcrPanel(false);
    setOcrImagePreview(null);
    setIsOcrLoading(false);
    setOcrProgress(0);
    setOcrStatusMessage('');
    setOcrRawText('');
    setShowRawTextEditor(false);
  };

  const populateFromProduct = (p: ProductItem) => {
    setProductName(p.productName || '');
    setManufacturer(p.manufacturer || '');
    setClassification(p.classification || 'OTC_DRUG');
    setIngredientBasis(
      p.ingredientBasis || (p.classification === 'HEALTH_FUNCTIONAL_FOOD' ? 'PER_DAILY' : 'PER_UNIT')
    );
    setIsLoadingPublicData(false);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchErrorMsg(null);
    setDosageForm(p.dosageForm || 'FILM_COATED_TABLET');
    setPackagingUnit(p.packagingUnit || '');
    setDailyServings(p.dailyServings || 1);
    setAmountPerServing(p.amountPerServing || 1);
    setServingUnitKorean(p.servingUnitKorean || '정');
    setPriceRetailKrw(p.priceRetailKrw || 0);
    setStorageLocation(p.storageLocation || '');
    setProductImageUrl(p.imageUrl || '');
    setTags(p.tags?.join(', ') || '');
    setAttachedDocuments(p.attachments ? JSON.parse(JSON.stringify(p.attachments)) : []);

    const regCode = p.otcDetail?.itemSeq || p.functionalFoodDetail?.reportNo || '';
    setRegulatoryCode(regCode);

    const doseInst =
      p.otcDetail?.dosageAndAdministrationKorean ||
      p.functionalFoodDetail?.suggestedUseKorean ||
      `1일 ${p.dailyServings || 1}회, 1회 ${p.amountPerServing || 1}${p.servingUnitKorean || '정'} 복용`;
    setDosageInstruction(doseInst);

    const indications =
      p.otcDetail?.indicationsKorean ||
      p.functionalFoodDetail?.functionalClaimsKorean ||
      [];
    setIndicationsText(indications.join('\n'));

    const precautions =
      p.otcDetail?.precautionsSummaryKorean ||
      p.functionalFoodDetail?.safetyPrecautionsKorean ||
      [];
    setPrecautionsText(precautions.join('\n'));

    setVerifiedIngredients(
      p.ingredients ? JSON.parse(JSON.stringify(p.ingredients)) : []
    );

    setPublicDataFetched({
      productName: p.productName,
      manufacturer: p.manufacturer,
      classification: p.classification,
      dosageForm: p.dosageForm,
      packagingUnit: p.packagingUnit,
      dailyServings: p.dailyServings,
      amountPerServing: p.amountPerServing,
      servingUnitKorean: p.servingUnitKorean,
      regulatoryCode: regCode,
      rawIngredientsText: `${p.productName} 등록 규격 데이터`,
      indicationsSummary: indications,
      precautionsSummary: precautions,
      dosageInstruction: doseInst,
      parsedIngredients: p.ingredients || [],
      sourceOrigin: '약국 등록 품목 DB'
    });

    setIsSubmitting(false);
    setShowOcrPanel(false);
    setOcrImagePreview(null);
    setIsOcrLoading(false);
    setOcrProgress(0);
    setOcrStatusMessage('');
    setOcrRawText('');
    setShowRawTextEditor(false);
  };

  // 모달이 열릴 때 신규 등록이면 초기화, 수정이면 기존 제품 데이터 반영
  React.useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        populateFromProduct(productToEdit);
      } else {
        resetForm();
      }
    }
  }, [isOpen, productToEdit]);

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
    setIndicationsText(result.indicationsSummary.join('\n'));
    setPrecautionsText((result.precautionsSummary || []).join('\n'));
    setVerifiedIngredients(result.parsedIngredients);
    if (result.classification === 'HEALTH_FUNCTIONAL_FOOD') {
      setIngredientBasis('PER_DAILY');
    }

    if (!isEditMode) {
      const suggestedTags = inferInitialEfficacyTags(
        result.productName,
        result.indicationsSummary,
        result.parsedIngredients
      );
      if (suggestedTags.length > 0) {
        setTags(suggestedTags.join(', '));
      }
    }
  };

  // 약학정보원/식약처 검색 결과에서 특정 제품을 선택했을 때
  const handleSelectDrugMaster = async (item: PublicDrugMasterItem) => {
    // 1. 정확한 제약회사명과 공식 제품명 자동 반영
    setManufacturer(item.manufacturer);
    setProductName(item.productName);
    setClassification(item.classification);
    setIngredientBasis(item.classification === 'HEALTH_FUNCTIONAL_FOOD' ? 'PER_DAILY' : 'PER_UNIT');

    // 2. 표준 규격 데이터 변환 및 성분 검수 테이블 세팅 (식약처 상세 실시간 호출 포함)
    setIsLoadingPublicData(true);
    try {
      const result = await convertMasterItemToFetchResult(item);
      applyFetchResult(result);
    } catch (err) {
      console.error('상세 정보 변환 실패:', err);
    } finally {
      setIsLoadingPublicData(false);
    }

    // 검색 결과 패널 닫기
    setShowSearchResults(false);
    setSearchErrorMsg(null);
  };

  const applyOcrResult = (result: OcrParseResult) => {
    setClassification('HEALTH_FUNCTIONAL_FOOD');
    setIngredientBasis('PER_DAILY');
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

  // 첨부된 약학정보원 캡처/텍스트 약효분류를 현재 성분표에 반영하고 학습 사전에 저장
  const applyKpicMappings = (kpicList: { ingredientName: string; category: string }[]) => {
    if (kpicList.length === 0) return;

    setVerifiedIngredients((prev) => {
      return prev.map((ing) => {
        const found = kpicList.find((km) => {
          const kName = km.ingredientName.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          const ingName = ing.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          return kName.includes(ingName) || ingName.includes(kName);
        });

        if (found) {
          // 성분 사전에 영구 학습 저장
          saveLearnedIngredientMapping(ing.englishInn, {
            functionalCategory: found.category
          });
          return {
            ...ing,
            functionalCategory: found.category
          };
        }
        return ing;
      });
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
      const docResult = await recognizeUniversalDocument(file, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatusMessage(status);
      });

      setOcrRawText(docResult.rawText);

      let summaryText = '자료 분석 완료';
      let dataUrl = '';
      try {
        dataUrl = await fileToDataUrl(file);
      } catch (e) {
        dataUrl = previewUrl;
      }

      // 1. 약학정보원 KPIC 약효분류 포맷인 경우: 기존 성분의 약효 분류를 즉시 자동 갱신 및 학습
      if (docResult.isKpicFormat && docResult.kpicMappings.length > 0) {
        applyKpicMappings(docResult.kpicMappings);
        summaryText = `약학정보원(KPIC) 약효분류 ${docResult.kpicMappings.length}건 반영`;
        alert(`약학정보원(KPIC) 약효분류 ${docResult.kpicMappings.length}건이 성공적으로 인식되어 성분 분류에 반영되었습니다!`);
      }
      // 2. 일반식품(혼합음료/기타가공품) 라벨 영양성분표 파싱 (마그네슘, 칼슘, 아연 및 유기산염 결합 형태)
      else if (docResult.foodParsed.ingredients.length > 0 || classification === 'GENERAL_FOOD') {
        const foodIngs = docResult.foodParsed.ingredients;
        if (foodIngs.length > 0) {
          setVerifiedIngredients(foodIngs);
          summaryText = `일반식품 영양성분 ${foodIngs.length}건(원료염 매핑 완료) 반영`;

          if (docResult.nutritionParsed.servingInfo.servingUnit) {
            setServingUnitKorean(docResult.nutritionParsed.servingInfo.servingUnit);
          }
          if (docResult.nutritionParsed.servingInfo.dailyServings > 0) {
            setDailyServings(docResult.nutritionParsed.servingInfo.dailyServings);
          }
          if (docResult.nutritionParsed.servingInfo.amountPerServing > 0) {
            setAmountPerServing(docResult.nutritionParsed.servingInfo.amountPerServing);
          }
          alert(`일반식품 영양성분표에서 유효 성분 ${foodIngs.length}건(원료염 결합 형태)을 성공적으로 추출하여 검수 테이블에 반영했습니다!`);
        } else if (docResult.nutritionParsed.parsedIngredients.length > 0) {
          applyOcrResult(docResult.nutritionParsed);
          summaryText = `영양·기능정보 ${docResult.nutritionParsed.parsedIngredients.length}건 반영`;
        }
      }
      // 3. 패키지 영양·기능정보표(건기식)인 경우: 성분 및 섭취량 정규화 파싱
      else if (docResult.nutritionParsed.parsedIngredients.length > 0) {
        applyOcrResult(docResult.nutritionParsed);
        summaryText = `영양·기능정보 ${docResult.nutritionParsed.parsedIngredients.length}건 반영`;
      }

      // 4. 사진에서 [섭취 시 주의사항 / 당알코올 주의문구] 섹션이 감지된 경우 주의사항 텍스트에 자동 추가
      if (docResult.extractedPrecautions && docResult.extractedPrecautions.precautionsFullText) {
        setPrecautionsText(prev => {
          if (!prev.trim() || (prev.includes('이상사례') && prev.length < 50)) {
            return docResult.extractedPrecautions.precautionsFullText;
          }
          return `${prev}\n\n[실물 라벨 섭취 시 주의사항]\n${docResult.extractedPrecautions.precautionsFullText}`;
        });
      }

      // 5. 업로드된 자료를 제품의 첨부 문서 목록에 영구 보존
      const newDoc: AttachedDocument = {
        id: `doc_${Date.now()}`,
        fileName: file.name || '라벨_첨부자료.jpg',
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl,
        status: 'ANALYZED',
        analysisSummary: summaryText,
        extractedText: docResult.rawText
      };
      setAttachedDocuments(prev => [newDoc, ...prev.filter(d => d.fileName !== newDoc.fileName)]);

      if (
        !docResult.isKpicFormat &&
        docResult.foodParsed.ingredients.length === 0 &&
        docResult.nutritionParsed.parsedIngredients.length === 0 &&
        (!docResult.extractedPrecautions || !docResult.extractedPrecautions.precautionsFullText)
      ) {
        alert('첨부 자료에서 약효분류, 영양성분표 또는 주의사항을 감지하지 못했습니다. 선명한 캡처 사진을 다시 선택해주세요.');
      }
    } catch (err: any) {
      console.error('OCR 파싱 실패:', err);
      alert('자료 인식 중 오류가 발생했습니다: ' + (err?.message || '이미지를 확인해주세요'));
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

  // 자료 원문 텍스트 직접 재파싱 (약학정보원 텍스트 복사/붙여넣기 지원)
  const handleReparseRawText = () => {
    if (!ocrRawText.trim()) return;

    // 약학정보원 약효분류 텍스트 검사
    const kpicList = parseKpicEfficacyText(ocrRawText);
    if (kpicList.length > 0) {
      applyKpicMappings(kpicList);
      setShowRawTextEditor(false);
      alert(`약학정보원(KPIC) 약효분류 ${kpicList.length}건이 성분표에 반영되었습니다.`);
      return;
    }

    // 일반식품(혼합음료/기타가공품) 라벨 영양성분표 검사
    const foodParsed = parseFoodNutritionLabel(ocrRawText);
    if (foodParsed.ingredients.length > 0) {
      setVerifiedIngredients(foodParsed.ingredients);
      if (foodParsed.precautions.length > 0) {
        setPrecautionsText(prev =>
          prev
            ? `${prev}\n\n[실물 라벨 섭취 시 주의사항]\n${foodParsed.precautions.join('\n')}`
            : foodParsed.precautions.join('\n')
        );
      }
      setShowRawTextEditor(false);
      alert(`일반식품 영양성분 ${foodParsed.ingredients.length}건(원료염 매핑 완료)이 성분표에 반영되었습니다.`);
      return;
    }

    // 건기식 영양정보표 검사
    const result = parseNutritionLabelText(ocrRawText);
    applyOcrResult(result);

    // 라벨 섭취 시 주의사항 검사
    const extractedPrec = extractPrecautionsFromOcrText(ocrRawText);
    if (extractedPrec.precautionsFullText) {
      setPrecautionsText(prev => prev ? `${prev}\n\n[실물 라벨 섭취 시 주의사항]\n${extractedPrec.precautionsFullText}` : extractedPrec.precautionsFullText);
    }

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

  // 약학정보원/식약처/식품안전나라 통합 검색 실행 (실시간 다중 결과 검색 지원)
  const handleFetchPublicData = async () => {
    const query = productName.trim() || manufacturer.trim() || regulatoryCode.trim();
    if (!query) {
      alert(
        '조회할 제품명, 제조사명 또는 품목보고번호를 입력해주세요.\n• 일반의약품: "임팩타민", "비맥스", "베아제"\n• 건강기능식품: "락토핏", "마이타민", "밀크씨슬", "센트룸", "루테인"\n• 일반식품/기타가공품: "아르기닌", "카무트", "글루타치온"'
      );
      return;
    }

    setIsLoadingPublicData(true);
    setSearchErrorMsg(null);
    try {
      const results = await searchPublicDrugDatabase(productName.trim() || query, {
        classification,
        manufacturer: manufacturer.trim(),
        regulatoryCode: regulatoryCode.trim()
      });

      if (results.length === 0) {
        setSearchErrorMsg(
          `"${query}"에 해당하는 공공데이터(식약처 의약품 / 식품안전나라 I0030·C003·I1250) 등록 제품을 찾을 수 없습니다. 제품명 띄어쓰기를 줄이거나 핵심 단어로 다시 검색해보세요.`
        );
        setShowSearchResults(false);
      } else {
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (e: any) {
      console.error('공공데이터 조회 실패:', e);
      alert(e?.message || '공공데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingPublicData(false);
    }
  };

  // 약학정보원 DB에 미등록된 품목 직접 성분 입력 모드 시작
  const handleStartManualEntry = () => {
    const targetName = productName.trim() || '신규 등록 의약품';
    setProductName(targetName);
    setSearchErrorMsg(null);
    setShowSearchResults(false);

    // 기본 성분 1개 및 2단계 검수 활성화
    const initialEntry: ProductIngredientEntry = {
      ingredientId: `ing_manual_${Date.now()}`,
      englishInn: 'Active ingredient',
      functionalCategory: '에너지 대사',
      chemicalFormName: '표준 정제 원료',
      rawAmount: 100,
      unit: 'mg',
      isMainActive: true,
      clinicalSummary: '• 유효 성분 임상 효능 및 대사 작용'
    };

    setVerifiedIngredients([initialEntry]);
    setPublicDataFetched({
      productName: targetName,
      manufacturer: manufacturer.trim() || '제약사 직접 입력',
      classification,
      dosageForm,
      packagingUnit: '100정',
      dailyServings: 1,
      amountPerServing: 1,
      servingUnitKorean: '정',
      regulatoryCode: `수동등록_${Date.now().toString().slice(-6)}`,
      rawIngredientsText: `${targetName} 직접 성분 입력`,
      indicationsSummary: ['효능·효과 직접 작성'],
      dosageInstruction: '1일 1회, 1회 1정 복용',
      parsedIngredients: [initialEntry],
      sourceOrigin: '약학정보원(KPAIC) DB'
    });
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

  // 제품 대표 사진 업로드 핸들러 (최대 600px 리사이즈)
  const handleProductPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setProductImageUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 표준 효능 태그 칩 토글 핸들러
  const handleToggleEfficacyTag = (tagToToggle: string) => {
    const currentList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (currentList.includes(tagToToggle)) {
      setTags(currentList.filter((t) => t !== tagToToggle).join(', '));
    } else {
      setTags([tagToToggle, ...currentList].join(', '));
    }
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
      const parsedIndications = indicationsText
        ? indicationsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
        : [];
      const parsedPrecautions = precautionsText
        ? precautionsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
        : publicDataFetched?.precautionsSummary || [];

      if (isEditMode && productToEdit) {
        const updatedProduct: Partial<ProductItem> = {
          productName: productName.trim(),
          manufacturer: manufacturer.trim(),
          classification,
          dosageForm,
          packagingUnit,
          dailyServings,
          amountPerServing,
          servingUnitKorean,
          ingredientBasis,
          priceRetailKrw,
          storageLocation: storageLocation.trim() || undefined,
          imageUrl: productImageUrl || undefined,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          ingredients: verifiedIngredients,
          attachments: attachedDocuments.length > 0 ? attachedDocuments : productToEdit.attachments,
          ...(classification === 'OTC_DRUG'
            ? {
                otcDetail: {
                  ...productToEdit.otcDetail,
                  itemSeq: regulatoryCode || productToEdit.otcDetail?.itemSeq || `${Math.floor(202000000 + Math.random() * 4000000)}`,
                  permitDate: productToEdit.otcDetail?.permitDate || new Date().toISOString().slice(0, 10),
                  indicationsKorean: parsedIndications.length > 0 ? parsedIndications : productToEdit.otcDetail?.indicationsKorean || ['피로회복 및 신경통 완화'],
                  dosageAndAdministrationKorean: dosageInstruction || `1일 ${dailyServings}회, 1회 ${amountPerServing}${servingUnitKorean} 복용`,
                  storageMethodKorean: publicDataFetched?.storageMethod || productToEdit.otcDetail?.storageMethodKorean || '기밀용기, 실온(1~30℃)보관',
                  precautionsSummaryKorean:
                    parsedPrecautions.length > 0
                      ? parsedPrecautions
                      : productToEdit.otcDetail?.precautionsSummaryKorean || ['복용 전 설명서 참조']
                }
              }
            : {
                functionalFoodDetail: {
                  ...productToEdit.functionalFoodDetail,
                  reportNo: regulatoryCode || productToEdit.functionalFoodDetail?.reportNo || `202400${Math.floor(10000 + Math.random() * 90000)}`,
                  functionalClaimsKorean: parsedIndications.length > 0 ? parsedIndications : productToEdit.functionalFoodDetail?.functionalClaimsKorean || ['정상적인 면역 및 에너지 대사'],
                  suggestedUseKorean: dosageInstruction || `1일 ${dailyServings}회, 1회 ${amountPerServing}${servingUnitKorean} 섭취`,
                  safetyPrecautionsKorean:
                    parsedPrecautions.length > 0
                      ? parsedPrecautions
                      : productToEdit.functionalFoodDetail?.safetyPrecautionsKorean || ['특이체질 시 성분 확인'],
                  standardSpecificationKorean:
                    publicDataFetched?.standardSpecificationText ||
                    productToEdit.functionalFoodDetail?.standardSpecificationKorean,
                  subIngredientsText:
                    publicDataFetched?.etcRawMaterialText ||
                    productToEdit.functionalFoodDetail?.subIngredientsText,
                  rawMaterialsText:
                    publicDataFetched?.indivRawMaterialText ||
                    productToEdit.functionalFoodDetail?.rawMaterialsText
                }
              })
        };

        await updateProduct(productToEdit.id, updatedProduct);
        onClose();
        return;
      }

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
        ingredientBasis: classification === 'HEALTH_FUNCTIONAL_FOOD' ? 'PER_DAILY' : ingredientBasis,
        priceRetailKrw,
        storageLocation: storageLocation.trim() || undefined,
        imageUrl: productImageUrl || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ingredients: verifiedIngredients,
        attachments: attachedDocuments.length > 0 ? attachedDocuments : undefined,
        ...(classification === 'OTC_DRUG'
          ? {
               otcDetail: {
                itemSeq: regulatoryCode || `${Math.floor(202000000 + Math.random() * 4000000)}`,
                permitDate: new Date().toISOString().slice(0, 10),
                indicationsKorean: parsedIndications.length > 0 ? parsedIndications : ['피로회복 및 신경통 완화'],
                dosageAndAdministrationKorean: dosageInstruction || `1일 ${dailyServings}회, 1회 ${amountPerServing}${servingUnitKorean} 복용`,
                storageMethodKorean: publicDataFetched?.storageMethod || '기밀용기, 실온(1~30℃)보관',
                precautionsSummaryKorean: parsedPrecautions.length > 0 ? parsedPrecautions : ['복용 전 설명서 참조']
              }
            }
          : {
              functionalFoodDetail: {
                reportNo: regulatoryCode || `202400${Math.floor(10000 + Math.random() * 90000)}`,
                functionalClaimsKorean: parsedIndications.length > 0 ? parsedIndications : ['정상적인 면역 및 에너지 대사'],
                suggestedUseKorean: dosageInstruction || `1일 ${dailyServings}회, 1회 ${amountPerServing}${servingUnitKorean} 섭취`,
                safetyPrecautionsKorean: parsedPrecautions.length > 0 ? parsedPrecautions : ['특이체질 시 성분 확인'],
                standardSpecificationKorean: publicDataFetched?.standardSpecificationText,
                subIngredientsText: publicDataFetched?.etcRawMaterialText,
                rawMaterialsText: publicDataFetched?.indivRawMaterialText
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
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${isEditMode ? 'bg-indigo-600' : 'bg-sky-600'}`}>
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <Database className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditMode
                  ? `품목 정보 수정 — ${productToEdit?.productName}`
                  : '신규 품목 등록'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isEditMode && productToEdit ? () => populateFromProduct(productToEdit) : resetForm}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title={isEditMode ? '원래 저장된 내용으로 되돌리기' : '입력창 전체 초기화'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEditMode ? '원래대로 되돌리기' : '입력창 비우기'}</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 (스크롤 영역) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* 제품 기본 정보 및 공공API 조회 */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5">
            <div className="grid grid-cols-12 gap-2.5 items-end">
              <div className="col-span-3">
                <label className="block font-bold text-slate-700 mb-1 text-xs text-center">
                  제약회사 / 제조업소
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchPublicData();
                    }
                  }}
                  placeholder={
                    classification === 'OTC_DRUG'
                      ? '예: 대웅제약, 종근당, GC녹십자'
                      : '예: 콜마비앤에이치, 서흥, 알피바이오'
                  }
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-3">
                <label className="block font-bold text-slate-700 mb-1 text-xs text-center">
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
                  placeholder={
                    classification === 'OTC_DRUG'
                      ? '예: 임팩타민, 비맥스, 벤포벨'
                      : classification === 'HEALTH_FUNCTIONAL_FOOD'
                      ? '예: 락토핏, 마이타민업, 밀크씨슬, 루테인'
                      : '예: 아르기닌, 카무트, 글루타치온'
                  }
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1 text-xs text-center">
                  분류 체계
                </label>
                <select
                  value={classification}
                  onChange={(e) => {
                    const val = e.target.value as ProductClassification;
                    setClassification(val);
                    setIngredientBasis(val === 'HEALTH_FUNCTIONAL_FOOD' ? 'PER_DAILY' : 'PER_UNIT');
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                >
                  <option value="OTC_DRUG">일반의약품</option>
                  <option value="HEALTH_FUNCTIONAL_FOOD">건강기능식품</option>
                  <option value="GENERAL_FOOD">기타가공품/식품</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1 text-xs text-center">
                  품목기준코드 / 품목제조번호
                </label>
                <input
                  type="text"
                  value={regulatoryCode}
                  onChange={(e) => setRegulatoryCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchPublicData();
                    }
                  }}
                  placeholder={classification === 'OTC_DRUG' ? '예: 202300072' : '예: 20190004553197'}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="button"
                  onClick={handleFetchPublicData}
                  disabled={isLoadingPublicData}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 text-white rounded-lg font-bold shadow-xs transition-all active:scale-[0.99] text-xs cursor-pointer h-[38px] ${
                    classification === 'HEALTH_FUNCTIONAL_FOOD'
                      ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                      : classification === 'GENERAL_FOOD'
                      ? 'bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400'
                      : 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400'
                  }`}
                  title="식약처 / 식품안전나라 오픈API에서 제품 실시간 검색 및 후보 선택"
                >
                  {isLoadingPublicData ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>
                    {classification === 'OTC_DRUG'
                      ? '의약품 조회'
                      : classification === 'HEALTH_FUNCTIONAL_FOOD'
                      ? '건기식 조회'
                      : '식품 조회'}
                  </span>
                </button>
              </div>
            </div>

            {/* 검색 에러 알림 및 직접 등록 지원 */}
            {searchErrorMsg && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">{searchErrorMsg}</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      공공API에 아직 등재되지 않은 품목이라도 아래 버튼을 눌러 성분을 직접 입력하거나 [자료 첨부]로 라벨을 촬영해 등록할 수 있습니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartManualEntry}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shrink-0 shadow-xs flex items-center gap-1 active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>직접 성분 입력하여 등록하기</span>
                </button>
              </div>
            )}

            {/* 공공API 검색 결과 다중 후보 선택 리스트 */}
            {showSearchResults && (
              <div className="p-4 bg-sky-50/80 border-2 border-sky-300 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-sky-700" />
                    <span className="font-bold text-xs text-sky-950">
                      공공데이터 실시간 검색 결과 ({searchResults.length}건) — 등록할 제품을 선택하세요
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

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((item) => {
                    const isDup = !!findDuplicateProduct(item.productName, item.regulatoryCode);
                    const classLabel =
                      item.classification === 'OTC_DRUG'
                        ? '일반의약품'
                        : item.classification === 'HEALTH_FUNCTIONAL_FOOD'
                        ? '건강기능식품'
                        : `일반식품(${item.foodTypeCategory || '기타가공품'})`;
                    const classBadgeColor =
                      item.classification === 'OTC_DRUG'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : item.classification === 'HEALTH_FUNCTIONAL_FOOD'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-200 text-slate-800 border-slate-300';

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
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${classBadgeColor}`}>
                              {classLabel}
                            </span>
                            {item.apiSourceBadge && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {item.apiSourceBadge}
                              </span>
                            )}
                            <span className="font-bold text-xs text-slate-900">{item.productName}</span>
                            <span className="text-[11px] font-medium text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded">
                              {item.manufacturer}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              {item.classification === 'OTC_DRUG' ? '품목기준코드' : '품목제조번호'}: {item.regulatoryCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate">
                            {item.packagingUnit} • {item.dosageInstruction}
                          </p>
                          {(item.indivRawMaterialText || item.rawIngredientsText) && (
                            <p className="text-[10px] text-slate-500 truncate font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              주원료: {(item.indivRawMaterialText || item.rawIngredientsText).replace(/\n/g, ', ')}
                            </p>
                          )}
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

            {/* 중복 등록 차단 경고 배너 및 해결 액션 */}
            {currentDuplicate && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-900 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-rose-950 flex items-center gap-2">
                      <span>🚫 [중복 등록 불가] 이미 약국 취급 목록에 등록된 제품입니다</span>
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      현재 취급 목록에 <strong>"{currentDuplicate.productName}"</strong> ({currentDuplicate.manufacturer})이(가) 이미 존재합니다.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`'${currentDuplicate.productName}' 기존 품목을 완전히 삭제하고 새 품목으로 등록하시겠습니까?`)) {
                            await deleteProduct(currentDuplicate.id);
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="기존 등록된 품목을 데이터베이스에서 삭제하여 신규 등록 차단을 해제합니다"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>기존 품목 삭제 후 새로 등록</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          populateFromProduct(currentDuplicate);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="기존 품목의 내용을 현재 화면으로 불러와 수정·덮어쓰기 모드로 전환합니다"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>기존 품목 정보 덮어쓰기 (수정 모드)</span>
                      </button>
                    </div>
                  </div>
                </div>
                <span className="shrink-0 self-start md:self-center text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-md">
                  신규 등록 차단됨
                </span>
              </div>
            )}

            {/* 자료 첨부 (약학정보원 캡처, 제약사 학술자료, 건기식 라벨 AI 파서) */}
            {showOcrPanel && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                    <Paperclip className="w-4 h-4 text-purple-600" />
                    <span>[자료 첨부] 약학정보원(KPIC) 캡처 · 제약사 브로슈어 · 영양정보표 자동 동기화</span>
                  </span>
                  <span className="text-[11px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-medium">
                    클립보드 이미지/텍스트 붙여넣기(Ctrl+V) 지원
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
                              약학정보원 캡처, 제약사 자료, 영양성분표 사진을 첨부하세요
                            </p>
                            <p className="text-[11px] text-slate-500">
                              파일 선택 또는 화면 캡처 후 <b>Ctrl+V</b>로 즉시 붙여넣을 수 있습니다.
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
              <div className="p-3.5 bg-white border border-emerald-300 rounded-xl space-y-2 text-slate-700 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-950 text-xs">
                        공식 규격 수집 완료 ({publicDataFetched.sourceOrigin})
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                        {publicDataFetched.classification === 'OTC_DRUG' ? '품목기준코드' : '품목제조번호'}: {publicDataFetched.regulatoryCode}
                      </span>
                      {publicDataFetched.foodTypeCategory && (
                        <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-semibold">
                          유형: {publicDataFetched.foodTypeCategory}
                        </span>
                      )}
                      {publicDataFetched.shelfLifeText && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          소비기한: {publicDataFetched.shelfLifeText}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded border border-slate-200 line-clamp-2">
                      규격 파싱 원문: {publicDataFetched.rawIngredientsText.replace(/\n/g, ' / ')}
                    </p>
                  </div>
                  <span className="text-emerald-700 font-bold shrink-0 text-right text-xs">
                    {publicDataFetched.parsedIngredients.length}종 성분 매핑됨
                  </span>
                </div>

                {/* 식품안전나라 I0030 분리 원재료(주원료 / 부원료 / 캡슐기제) 및 기준규격(STDR_STND) 상세 표시 */}
                {(publicDataFetched.indivRawMaterialText || publicDataFetched.etcRawMaterialText || publicDataFetched.standardSpecificationText) && (
                  <div className="grid grid-cols-12 gap-2 pt-1 text-[11px]">
                    {publicDataFetched.indivRawMaterialText && (
                      <div className="col-span-6 p-2 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                        <span className="font-bold text-emerald-900 block mb-0.5">
                          ✔ 기능성 주원료 (INDIV_RAWMTRL_NM):
                        </span>
                        <p className="text-slate-700 line-clamp-2">{publicDataFetched.indivRawMaterialText}</p>
                      </div>
                    )}
                    {publicDataFetched.etcRawMaterialText && (
                      <div className="col-span-6 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">
                          • 기타원료 / 부원료 (ETC_RAWMTRL_NM):
                        </span>
                        <p className="text-slate-600 line-clamp-2">{publicDataFetched.etcRawMaterialText}</p>
                      </div>
                    )}
                    {publicDataFetched.standardSpecificationText && (
                      <details className="col-span-12 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <summary className="cursor-pointer font-bold text-slate-700 hover:text-sky-700 select-none">
                          📋 식약처 기준 및 규격 (STDR_STND 표시량 원문) 펼쳐보기
                        </summary>
                        <pre className="mt-1.5 text-[10px] text-slate-600 whitespace-pre-wrap font-mono max-h-36 overflow-y-auto bg-white p-2 rounded border border-slate-200">
                          {publicDataFetched.standardSpecificationText}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2. 약사 검수(Verification) 및 정밀 성분 매트릭스 편집 */}
          {verifiedIngredients.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    성분 검수 및 편집
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {/* 성분 입력 기준 (1알/1포당 vs 하루 섭취량당) 선택 */}
                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIngredientBasis('PER_UNIT')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        ingredientBasis === 'PER_UNIT'
                          ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      1{servingUnitKorean || '알'}당 함량
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngredientBasis('PER_DAILY')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        ingredientBasis === 'PER_DAILY'
                          ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      하루 섭취량 ({dailyServings * amountPerServing}{servingUnitKorean || '알'})당 함량
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomIngredient}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>배합 성분 추가</span>
                  </button>
                </div>
              </div>

              {/* 성분 검수 테이블 (약효 분류, 원료 형태 포함) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">성분명 (English INN)</th>
                      <th className="py-2.5 px-3 w-[150px]">약효 분류</th>
                      <th className="py-2.5 px-3 w-[120px] text-right">
                        투입 함량 ({ingredientBasis === 'PER_UNIT' ? `1${servingUnitKorean || '알'}` : '하루'})
                      </th>
                      <th className="py-2.5 px-3 w-[80px]">단위</th>
                      <th className="py-2.5 px-3 w-[110px] text-right">순수 원소량</th>
                      <th className="py-2.5 px-3 w-[160px]">원료 형태</th>
                      <th className="py-2.5 px-2 w-[45px] text-center">삭제</th>
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

                        {/* 약효 분류 */}
                        <td className="p-2">
                          <input
                            type="text"
                            list="efficacy-categories-list"
                            value={ing.functionalCategory || ''}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, { functionalCategory: e.target.value })
                            }
                            placeholder="약효 분류"
                            className="w-full p-1.5 border border-slate-300 rounded font-medium text-slate-800 bg-white text-[11px]"
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

                        {/* 원료 형태 */}
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="예: 벤포티아민"
                            value={ing.chemicalFormName || ''}
                            onChange={(e) =>
                              handleUpdateIngredient(idx, { chemicalFormName: e.target.value })
                            }
                            className="w-full p-1.5 border border-slate-200 rounded font-medium text-[11px] text-slate-700 bg-white"
                          />
                        </td>

                        {/* 삭제 */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            disabled={verifiedIngredients.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                            title="성분 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <datalist id="efficacy-categories-list">
                  {STANDARD_EFFICACY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* 기본 규격, 복용 스케줄, 소비자 판매가, 약 위치, 대표 사진 */}
              <div className="grid grid-cols-12 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl items-end">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">제형</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-xs"
                  >
                    <option value="FILM_COATED_TABLET">필름코팅정</option>
                    <option value="TABLET">일반정제</option>
                    <option value="ENTERIC_TABLET">장용정</option>
                    <option value="SOFT_CAPSULE">연질캡슐</option>
                    <option value="HARD_CAPSULE">경질캡슐</option>
                    <option value="LIQUID_ORAL">액제/스틱시럽/겔</option>
                    <option value="POWDER">분말/산제</option>
                    <option value="GRANULE">과립</option>
                    <option value="JELLY">젤리/츄어블</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">포장 규격</label>
                  <input
                    type="text"
                    value={packagingUnit}
                    onChange={(e) => setPackagingUnit(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-xs"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">1일 횟수</label>
                  <input
                    type="number"
                    min={1}
                    value={dailyServings}
                    onChange={(e) => setDailyServings(parseInt(e.target.value) || 1)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white text-right text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">1회량 (단위)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={amountPerServing}
                      onChange={(e) => setAmountPerServing(parseInt(e.target.value) || 1)}
                      className="w-12 p-1.5 border border-slate-300 rounded-md bg-white text-right text-xs"
                    />
                    <input
                      type="text"
                      value={servingUnitKorean}
                      onChange={(e) => setServingUnitKorean(e.target.value)}
                      className="flex-1 min-w-0 p-1.5 border border-slate-300 rounded-md bg-white text-center text-xs"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">소비자 판매가 (원)</label>
                  <input
                    type="number"
                    value={priceRetailKrw}
                    onChange={(e) => setPriceRetailKrw(parseInt(e.target.value) || 0)}
                    className="w-full p-1.5 border border-slate-300 rounded-md bg-white font-mono text-xs"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-bold text-slate-700 mb-1 text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    <span>약 위치 (진열대 / 보관 위치)</span>
                  </label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="예: 상담석 우측 2단, 영양제 매대 A-1"
                    className="w-full p-1.5 border border-sky-300 rounded-md bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 제품 대표 사진 등록 및 표준 복용·섭취 기준 / 효능·효과 전문 / 주의사항 전문 */}
              <div className="grid grid-cols-12 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl items-start">
                <div className="col-span-4">
                  <label className="block font-bold text-slate-700 mb-1 text-xs flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-sky-600" />
                    <span>카탈로그 대표 사진</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {productImageUrl ? (
                      <div className="relative w-11 h-11 rounded-lg bg-white border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={productImageUrl}
                          alt="제품 대표 사진"
                          className="max-w-full max-h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setProductImageUrl('')}
                          className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] px-1 rounded-bl"
                          title="사진 제거"
                        >
                          ✕
                        </button>
                      </div>
                    ) : null}
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{productImageUrl ? '사진 변경' : '제품 사진 선택'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="col-span-8">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    표준 복용·섭취 기준 문구 (줄바꿈 가능)
                  </label>
                  <textarea
                    rows={3}
                    value={dosageInstruction}
                    onChange={(e) => setDosageInstruction(e.target.value)}
                    placeholder="예:&#10;만 1세~3세: 1일 1회, 1회 1포&#10;만 4세~7세: 1일 2회, 1회 1포&#10;만 8세 이상: 1일 2회, 1회 2포"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium leading-relaxed font-sans"
                  />
                </div>

                <div className="col-span-6">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    {classification === 'OTC_DRUG' ? '효능·효과 전문 (API 원문)' : '기능성 내용 (API 원문)'}
                  </label>
                  <textarea
                    rows={3}
                    value={indicationsText}
                    onChange={(e) => setIndicationsText(e.target.value)}
                    placeholder="공공API 조회 시 효능·효과 / 기능성 전문이 자동으로 입력됩니다."
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium leading-relaxed"
                  />
                </div>

                <div className="col-span-6">
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    주의사항 전문 (API 원문)
                  </label>
                  <textarea
                    rows={3}
                    value={precautionsText}
                    onChange={(e) => setPrecautionsText(e.target.value)}
                    placeholder="공공API 조회 시 사용상의 주의사항 / 섭취 시 주의사항 전문이 자동으로 입력됩니다."
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium leading-relaxed"
                  />
                </div>
              </div>

              {/* 효능·증상 태그 프리셋 & 임상 검색 태그 */}
              <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>효능·증상 태그 설정 (클릭하여 카탈로그 필터 태그 ON/OFF)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    선택한 효능 버튼을 누르면 카탈로그에서 해당 영양제가 즉시 필터링됩니다
                  </span>
                </div>

                {/* 표준 효능 태그 원클릭 토글 버튼 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {STANDARD_EFFICACY_TAGS.map((stdTag) => {
                    const currentTagList = tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean);
                    const isActive = currentTagList.includes(stdTag);
                    return (
                      <button
                        key={stdTag}
                        type="button"
                        onClick={() => handleToggleEfficacyTag(stdTag)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-sky-400 hover:text-sky-700'
                        }`}
                      >
                        {isActive ? `✓ ${stdTag}` : `+ ${stdTag}`}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                    적용된 효능 및 검색 태그 직접 편집 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="예: 피로, 간, 관절, 고함량활성B군, 메코발라민"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 액션 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 text-xs cursor-pointer"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={verifiedIngredients.length === 0 || isSubmitting || !!currentDuplicate}
            className={`px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-xs cursor-pointer ${
              currentDuplicate
                ? 'bg-rose-200 text-rose-500 cursor-not-allowed border border-rose-300'
                : isEditMode
                ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white active:scale-[0.98]'
                : 'bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white active:scale-[0.98]'
            }`}
            title={currentDuplicate ? '이미 취급 목록에 등록된 품목입니다' : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEditMode ? '수정 중...' : '등록 중...'}</span>
              </>
            ) : currentDuplicate ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>이미 등록된 품목</span>
              </>
            ) : isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                <span>수정 완료</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>등록하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
