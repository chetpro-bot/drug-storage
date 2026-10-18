import React, { useState, useRef, useEffect } from 'react';
import { ProductItem, AttachedDocument, isBackLabelAttachment } from '../types/product';
import { ProductIngredientEntry } from '../types/ingredient';
import { 
  recognizeUniversalDocument, 
  parseKpicEfficacyText, 
  parseFoodNutritionLabel,
  fileToDataUrl,
  isMeaningfulKoreanText
} from '../services/labelOcrService';
import { 
  saveLearnedIngredientMapping, 
  parseRawIngredientString, 
  resolveKpicCategory 
} from '../utils/innMapper';
import { useProductStore } from '../stores/useProductStore';
import { 
  X, 
  Paperclip, 
  Upload, 
  FileText, 
  Trash2, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ClipboardCopy, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AttachedDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem;
}

export const AttachedDocumentsModal: React.FC<AttachedDocumentsModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const { updateProduct } = useProductStore();
  // 항상 스토어의 최신 제품 데이터를 조회하여 stale closure로 인한 첨부파일 유실 방지
  const currentProduct = useProductStore((state) => state.products.find((p) => p.id === product.id)) || product;
  const attachments: AttachedDocument[] = currentProduct.attachments || [];

  const [activeTab, setActiveTab] = useState<'FILES' | 'TEXT_INPUT'>('FILES');
  
  // 분석 상태 관리
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  
  // 확대 뷰어 모달
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  
  // 텍스트 직접 입력 탭 상태
  const [directText, setDirectText] = useState<string>('');

  // 추출 텍스트 보기 토글 ID
  const [expandedTextDocId, setExpandedTextDocId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  // 클립보드 붙여넣기(Ctrl+V) 지원
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleAddFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, product]);

  if (!isOpen) return null;

  // 파일 업로드 처리 (다중 파일 지원)
  const handleAddFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      alert('이미지 파일(JPG, PNG, WebP 등)을 선택해주세요.');
      return;
    }

    const newDocs: AttachedDocument[] = [];
    for (const file of fileArray) {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl) {
        newDocs.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          dataUrl,
          status: 'PENDING'
        });
      }
    }

    const latest = useProductStore.getState().products.find((p) => p.id === product.id) || product;
    const currentList = latest.attachments || [];
    const updated = [...currentList, ...newDocs];
    await updateProduct(product.id, { attachments: updated });

    // 첫 번째 파일이 업로드되면 자동으로 분석 시작
    if (newDocs.length > 0 && !analyzingDocId) {
      handleAnalyzeDocument(newDocs[0]);
    }
  };

  // 첨부 자료 삭제 (뒷면 라벨 사진 삭제 시 실물 라벨 주의사항 텍스트도 자동 동기화 삭제)
  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('이 첨부 자료를 삭제하시겠습니까?')) return;
    const latest = useProductStore.getState().products.find((p) => p.id === product.id) || product;
    const currentList = latest.attachments || [];
    const docToDelete = currentList.find((d) => d.id === docId);
    const filtered = currentList.filter((d) => d.id !== docId);

    const isBackLabelDoc = docToDelete && isBackLabelAttachment(docToDelete);
    const remainingBackLabels = filtered.filter((d) => isBackLabelAttachment(d));

    const updatePayload: any = { attachments: filtered };
    if ((isBackLabelDoc || remainingBackLabels.length === 0) && product.functionalFoodDetail?.labelPrecautionsText) {
      updatePayload.functionalFoodDetail = {
        ...product.functionalFoodDetail,
        labelPrecautionsText: undefined
      };
    }

    await updateProduct(product.id, updatePayload);
  };

  // 첨부 자료 OCR 분석 실행 및 성분표 100% 반영
  const handleAnalyzeDocument = async (doc: AttachedDocument) => {
    if (analyzingDocId) return;

    setAnalyzingDocId(doc.id);
    setProgressPercent(10);
    setProgressStatus('자료 이미지 확인 및 OCR 엔진 초기화...');
    isCancelledRef.current = false;

    try {
      const result = await recognizeUniversalDocument(doc.dataUrl, (pct, status) => {
        if (!isCancelledRef.current) {
          setProgressPercent(pct);
          setProgressStatus(status);
        }
      });

      if (isCancelledRef.current) return;

      const rawText = result.rawText || '';
      const rawTextClean = rawText.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

      // 1. 직접 KPIC 약효분류 포맷 인식
      const directKpic = parseKpicEfficacyText(rawText);

      // 2. 의약품 성분/함량 파싱 ("벤포티아민 100mg" 등)
      const parsedIngredients = parseRawIngredientString(rawText);

      // 3. 건기식 라벨 파싱 성분
      const nutritionIngredients = result.nutritionParsed.parsedIngredients || [];

      // 4. 일반식품(혼합음료, 기타가공품) 영양성분표 및 원재료명 맞춤 파싱 성분
      const foodParsed = result.foodParsed || parseFoodNutritionLabel(rawText);
      const foodIngredients = foodParsed?.ingredients || [];

      // 성분표 반영 추적
      const appliedList: string[] = [];

      // 기존 성분 중 경고문구나 일반 식품 매크로 비성분(나트륨, 탄수화물 등) 필터링
      const isMacroOrGarbage = (text: string) =>
        /(?:과량\s*섭취|설사를\s*일으킬|당알코올|주의사항|보관방법|유통기한|소비기한|나트륨|탄수화물|당류|지방|트랜스지방|포화지방|콜레스테롤|단백질|열량|칼로리|kcal|내용량|총내용량|정제수)/i.test(
          text
        );

      const validExisting = (product.ingredients || []).filter((i) => {
        const checkStr = `${i.englishInn || ''} ${i.koreanName || ''}`;
        return !isMacroOrGarbage(checkStr);
      });
      const updatedIngredients = [...validExisting];

      // A) 일반식품 영양성분표(마그네슘, 칼슘, 아연 등 원료염 결합 형태) 최우선 매핑
      if (foodIngredients.length > 0) {
        foodIngredients.forEach((fi) => {
          const fiNameClean = fi.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          const fiCatClean = (fi.functionalCategory || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

          const existingIdx = updatedIngredients.findIndex((ing) => {
            const ingCatClean = (ing.functionalCategory || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
            const ingNameClean = (ing.englishInn || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
            return (
              (fiCatClean && ingCatClean === fiCatClean) ||
              ingNameClean.includes(fiNameClean) ||
              fiNameClean.includes(ingNameClean)
            );
          });

          if (existingIdx >= 0) {
            updatedIngredients[existingIdx] = {
              ...updatedIngredients[existingIdx],
              englishInn: fi.englishInn,
              koreanName: fi.koreanName,
              functionalCategory: fi.functionalCategory,
              rawAmount: fi.rawAmount,
              unit: fi.unit,
              standardKey: fi.standardKey,
              chemicalFormName: fi.chemicalFormName,
              formattedSpecification: fi.formattedSpecification
            };
            appliedList.push(`[영양소 갱신] ${fi.functionalCategory}: ${fi.englishInn} ${fi.rawAmount}${fi.unit}`);
          } else {
            updatedIngredients.push(fi);
            appliedList.push(`[영양소 등록] ${fi.functionalCategory}: ${fi.englishInn} ${fi.rawAmount}${fi.unit}`);
          }
        });
      }

      // B) 기존 성분들에 대해 KPIC 약효분류 및 규격 갱신
      updatedIngredients.forEach((ing) => {
        const ingNameClean = ing.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

        // 1) 직접 KPIC 매핑이 있는지 확인
        const directFound = directKpic.find((km) => {
          const kName = km.ingredientName.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          return kName.includes(ingNameClean) || ingNameClean.includes(kName);
        });

        if (directFound) {
          ing.functionalCategory = directFound.category;
          saveLearnedIngredientMapping(ing.englishInn, { functionalCategory: directFound.category });
          appliedList.push(`${ing.englishInn} ➔ ${directFound.category}`);
          return;
        }

        // 2) 파싱된 성분 목록과 매칭 확인
        const parsedFound = [...parsedIngredients, ...nutritionIngredients].find((pe) => {
          const pName = pe.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          return pName.includes(ingNameClean) || ingNameClean.includes(pName);
        });

        if (parsedFound) {
          if (parsedFound.functionalCategory) {
            ing.functionalCategory = parsedFound.functionalCategory;
          }
          if (parsedFound.rawAmount && parsedFound.rawAmount > 0) {
            ing.rawAmount = parsedFound.rawAmount;
            ing.unit = parsedFound.unit;
            if (parsedFound.formattedSpecification) {
              ing.formattedSpecification = parsedFound.formattedSpecification;
            }
          }
          appliedList.push(`${ing.englishInn} ➔ ${ing.functionalCategory} (${ing.rawAmount}${ing.unit})`);
          return;
        }

        // 3) 본문 텍스트 내에 성분명이 포함되어 있는지 대조하여 KPIC 마스터 분류 자동 조회
        if (ingNameClean.length >= 3 && rawTextClean.includes(ingNameClean)) {
          const kpicCat = resolveKpicCategory(ing.englishInn);
          if (kpicCat && kpicCat !== ing.functionalCategory) {
            ing.functionalCategory = kpicCat;
            appliedList.push(`${ing.englishInn} ➔ ${kpicCat} (문서 매칭)`);
          }
        }
      });

      // C) 신규 성분 추가: 식품(혼합음료 등)의 경우 매크로 영양소(탄수화물, 당류, 지방, 단백질, 나트륨 등) 유입 차단
      const isFoodProduct = product.classification === 'GENERAL_FOOD' || foodIngredients.length > 0;
      const existingNames = new Set(
        updatedIngredients.map((i) => i.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, ''))
      );
      const newItemsToAdd: ProductIngredientEntry[] = [];

      if (!isFoodProduct) {
        [...parsedIngredients, ...nutritionIngredients].forEach((pe) => {
          const peName = pe.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          if (
            peName.length >= 2 &&
            !existingNames.has(peName) &&
            !isMacroOrGarbage(pe.englishInn)
          ) {
            existingNames.add(peName);
            newItemsToAdd.push(pe);
            appliedList.push(`[신규 성분] ${pe.englishInn} (${pe.rawAmount}${pe.unit}) - ${pe.functionalCategory}`);
          }
        });
      }

      const finalIngredients = [...updatedIngredients, ...newItemsToAdd];

      // 실물 라벨 뒷면 사진에서 추출된 주의사항 감지 및 저장
      const extractedPrecautions = result.extractedPrecautions;
      let updatedFunctionalDetail = product.functionalFoodDetail ? { ...product.functionalFoodDetail } : undefined;
      let updatedOtcDetail = product.otcDetail ? { ...product.otcDetail } : undefined;

      if (extractedPrecautions && extractedPrecautions.precautionsFullText && isMeaningfulKoreanText(extractedPrecautions.precautionsFullText)) {
        if (product.classification === 'HEALTH_FUNCTIONAL_FOOD' || product.classification === 'GENERAL_FOOD' || updatedFunctionalDetail) {
          updatedFunctionalDetail = {
            ...(updatedFunctionalDetail || {
              reportNo: '',
              functionalClaimsKorean: [],
              suggestedUseKorean: '',
              safetyPrecautionsKorean: []
            }),
            labelPrecautionsText: extractedPrecautions.precautionsFullText
          };
        } else if (updatedOtcDetail) {
          if (extractedPrecautions.precautionsList.length > 0) {
            updatedOtcDetail = {
              ...updatedOtcDetail,
              precautionsSummaryKorean: extractedPrecautions.precautionsList
            };
          }
        }
      }

      let summaryText = '';
      if (appliedList.length > 0) {
        summaryText = `성분 및 약효분류 ${appliedList.length}건 반영`;
      } else if (rawText.length > 20) {
        summaryText = `텍스트 판독 완료 (${rawText.length}자)`;
      } else {
        summaryText = '텍스트 판독 완료 (선명한 사진 권장)';
      }
      if (extractedPrecautions?.precautionsList && extractedPrecautions.precautionsList.length > 0) {
        summaryText += ` (주의사항 ${extractedPrecautions.precautionsList.length}건)`;
      }

      // 문서 상태 및 추출 텍스트 저장 (stale closure 방지: 최신 store 첨부 목록 기준)
      const latestProduct = useProductStore.getState().products.find((p) => p.id === product.id) || product;
      const latestAttachments = latestProduct.attachments || [];

      let updatedDocs = latestAttachments.map((d) => {
        if (d.id === doc.id) {
          return {
            ...d,
            status: 'ANALYZED' as const,
            analysisSummary: summaryText,
            extractedText: rawText
          };
        }
        return d;
      });

      if (!updatedDocs.some((d) => d.id === doc.id)) {
        updatedDocs.push({
          ...doc,
          status: 'ANALYZED' as const,
          analysisSummary: summaryText,
          extractedText: rawText
        });
      }

      // 데이터베이스(로컬 & Firestore)에 즉시 저장
      await updateProduct(product.id, {
        ingredients: finalIngredients,
        attachments: updatedDocs,
        ...(updatedFunctionalDetail ? { functionalFoodDetail: updatedFunctionalDetail } : {}),
        ...(updatedOtcDetail ? { otcDetail: updatedOtcDetail } : {})
      });

      // 사용자 알림
      const precautionNotif = extractedPrecautions?.precautionsList?.length
        ? `\n\n📸 [제품 라벨 주의사항 자동 추출 완료]\n• 실물 라벨 뒷면 주의사항 ${extractedPrecautions.precautionsList.length}건이 감지되어 제품 정보에 등록되었습니다! (상세 모달의 [전문보기]에서 확인 가능)`
        : '';

      if (appliedList.length > 0 || extractedPrecautions?.precautionsList?.length) {
        alert(
          `🎉 첨부 자료 분석 내용이 성공적으로 반영되었습니다!\n\n` +
          (appliedList.length > 0 ? `[성분 반영 내역 (${appliedList.length}건)]\n` +
          appliedList.slice(0, 10).map((item) => `• ${item}`).join('\n') +
          (appliedList.length > 10 ? `\n...외 ${appliedList.length - 10}건` : '') : '') +
          precautionNotif
        );
      } else {
        alert(
          `자료에서 텍스트(${rawText.length}자)를 판독했습니다.\n` +
          `기존 성분명과 일치하는 항목이 발견되지 않았습니다. 자료의 [텍스트 확인] 버튼을 눌러 판독된 내용을 확인하시거나, '텍스트 직접 붙여넣기' 탭을 이용해주세요.`
        );
      }
    } catch (err: any) {
      console.error('자료 분석 오류:', err);
      const updatedDocs = attachments.map((d) => {
        if (d.id === doc.id) {
          return {
            ...d,
            status: 'FAILED' as const,
            analysisSummary: err?.message || '분석 실패'
          };
        }
        return d;
      });
      await updateProduct(product.id, { attachments: updatedDocs });
      alert('자료 분석 중 오류가 발생했습니다: ' + (err?.message || '파일을 확인해주세요'));
    } finally {
      setAnalyzingDocId(null);
      setProgressPercent(0);
      setProgressStatus('');
    }
  };

  // 분석 취소
  const handleCancelAnalysis = () => {
    isCancelledRef.current = true;
    setAnalyzingDocId(null);
    setProgressPercent(0);
    setProgressStatus('');
  };

  // 텍스트 직접 입력 적용
  const handleApplyDirectText = async () => {
    if (!directText.trim()) {
      alert('약학정보원에서 복사한 성분 또는 약효분류 텍스트를 입력해주세요.');
      return;
    }

    const kpicMappings = parseKpicEfficacyText(directText);
    const parsedIngredients = parseRawIngredientString(directText);
    const foodParsed = parseFoodNutritionLabel(directText);
    const foodIngredients = foodParsed.ingredients || [];

    // 기존 성분 중 유효하지 않은 경고문구 및 매크로 비성분 제외
    const isMacroOrGarbage = (text: string) =>
      /(?:과량\s*섭취|설사를\s*일으킬|당알코올|주의사항|보관방법|유통기한|소비기한|나트륨|탄수화물|당류|지방|트랜스지방|포화지방|콜레스테롤|단백질|열량|칼로리|kcal|내용량|총내용량|정제수)/i.test(
        text
      );

    const validExisting = (product.ingredients || []).filter((i) => {
      const checkStr = `${i.englishInn || ''} ${i.koreanName || ''}`;
      return !isMacroOrGarbage(checkStr);
    });
    const updatedIngredients = [...validExisting];
    const appliedList: string[] = [];

    // 식품 영양성분 우선 매핑
    if (foodIngredients.length > 0) {
      foodIngredients.forEach((fi) => {
        const fiNameClean = fi.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        const fiCatClean = (fi.functionalCategory || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

        const existingIdx = updatedIngredients.findIndex((ing) => {
          const ingCatClean = (ing.functionalCategory || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          const ingNameClean = (ing.englishInn || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
          return (
            (fiCatClean && ingCatClean === fiCatClean) ||
            ingNameClean.includes(fiNameClean) ||
            fiNameClean.includes(ingNameClean)
          );
        });

        if (existingIdx >= 0) {
          updatedIngredients[existingIdx] = {
            ...updatedIngredients[existingIdx],
            englishInn: fi.englishInn,
            koreanName: fi.koreanName,
            functionalCategory: fi.functionalCategory,
            rawAmount: fi.rawAmount,
            unit: fi.unit,
            standardKey: fi.standardKey,
            chemicalFormName: fi.chemicalFormName,
            formattedSpecification: fi.formattedSpecification
          };
          appliedList.push(`[영양소 갱신] ${fi.functionalCategory}: ${fi.englishInn} ${fi.rawAmount}${fi.unit}`);
        } else {
          updatedIngredients.push(fi);
          appliedList.push(`[영양소 등록] ${fi.functionalCategory}: ${fi.englishInn} ${fi.rawAmount}${fi.unit}`);
        }
      });
    }

    updatedIngredients.forEach((ing) => {
      const ingNameClean = ing.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

      // 1. 직접 KPIC
      const foundKpic = kpicMappings.find((km) => {
        const kName = km.ingredientName.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        return kName.includes(ingNameClean) || ingNameClean.includes(kName);
      });
      if (foundKpic) {
        ing.functionalCategory = foundKpic.category;
        saveLearnedIngredientMapping(ing.englishInn, { functionalCategory: foundKpic.category });
        appliedList.push(`${ing.englishInn} ➔ ${foundKpic.category}`);
        return;
      }

      // 2. 성분/함량
      const foundParsed = parsedIngredients.find((pe) => {
        const pName = pe.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        return pName.includes(ingNameClean) || ingNameClean.includes(pName);
      });
      if (foundParsed) {
        if (foundParsed.functionalCategory) ing.functionalCategory = foundParsed.functionalCategory;
        if (foundParsed.rawAmount) {
          ing.rawAmount = foundParsed.rawAmount;
          ing.unit = foundParsed.unit;
        }
        appliedList.push(`${ing.englishInn} ➔ ${ing.functionalCategory} (${ing.rawAmount}${ing.unit})`);
      }
    });

    // 신규 성분 추가 (식품인 경우 매크로 비성분 차단)
    const isFoodProduct = product.classification === 'GENERAL_FOOD' || foodIngredients.length > 0;
    const existingNames = new Set(
      updatedIngredients.map((i) => i.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, ''))
    );
    const newItems: ProductIngredientEntry[] = [];
    if (!isFoodProduct) {
      parsedIngredients.forEach((pe) => {
        const peName = pe.englishInn.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        if (
          peName.length >= 2 &&
          !existingNames.has(peName) &&
          !isMacroOrGarbage(pe.englishInn)
        ) {
          existingNames.add(peName);
          newItems.push(pe);
          appliedList.push(`[신규] ${pe.englishInn} (${pe.rawAmount}${pe.unit}) - ${pe.functionalCategory}`);
        }
      });
    }

    const finalIngredients = [...updatedIngredients, ...newItems];

    // 주의사항 업데이트
    let updatedFunctionalDetail = product.functionalFoodDetail ? { ...product.functionalFoodDetail } : undefined;
    if (foodParsed.precautions.length > 0) {
      if (product.classification === 'HEALTH_FUNCTIONAL_FOOD' || product.classification === 'GENERAL_FOOD' || updatedFunctionalDetail) {
        updatedFunctionalDetail = {
          ...(updatedFunctionalDetail || {
            reportNo: '',
            functionalClaimsKorean: [],
            suggestedUseKorean: '',
            safetyPrecautionsKorean: []
          }),
          labelPrecautionsText: foodParsed.precautions.join('\n')
        };
      }
    }

    await updateProduct(product.id, {
      ingredients: finalIngredients,
      ...(updatedFunctionalDetail ? { functionalFoodDetail: updatedFunctionalDetail } : {})
    });

    alert(
      `🎉 텍스트 분석 내용이 성분표에 반영되었습니다!\n\n` +
      `[반영 내역 (${appliedList.length}건)]\n` +
      appliedList.slice(0, 10).map((item) => `• ${item}`).join('\n')
    );

    setDirectText('');
    setActiveTab('FILES');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto select-none">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {product.productName} 첨부 자료 관리
                </h2>
                <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                  총 {attachments.length}건
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                약학정보원 캡처, 제약사 학술자료, 라벨 사진을 여러 개 첨부하고 언제든 확인/분석할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('FILES')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'FILES'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>첨부 파일 목록 및 뷰어 ({attachments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('TEXT_INPUT')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'TEXT_INPUT'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>텍스트 직접 붙여넣기 (0.1초 즉시 적용)</span>
          </button>
        </div>

        {/* 모달 본문 영역 */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {activeTab === 'FILES' ? (
            <>
              {/* 파일 업로드 드롭존 (다중 첨부 지원) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    await handleAddFiles(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/50 hover:bg-purple-50/80 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    클릭하여 이미지 파일 선택 또는 마우스로 드래그 (여러 개 선택 가능)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    화면 캡처 후 이 창에서 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">Ctrl + V</kbd> 를 누르면 바로 붙여넣기됩니다.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleAddFiles(e.target.files);
                  }}
                />
              </div>

              {/* 분석 진행 표시줄 (진행 중일 때) */}
              {analyzingDocId && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span>{progressStatus || 'AI 자료 분석 및 약효분류 매칭 중...'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-700">{progressPercent}%</span>
                      <button
                        onClick={handleCancelAnalysis}
                        className="text-[11px] px-2 py-0.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 rounded transition-colors"
                      >
                        분석 중단
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(5, progressPercent)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 기존 첨부 자료 목록 */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>첨부된 자료 목록 ({attachments.length})</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    자료를 클릭하면 고화질 원본으로 확인할 수 있습니다.
                  </span>
                </h3>

                {attachments.length === 0 ? (
                  <div className="border border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500">
                      아직 첨부된 자료가 없습니다.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      약학정보원 화면 캡처나 영양성분표 라벨 사진을 위 업로드 영역에 추가해보세요.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((doc, idx) => {
                      const isThisAnalyzing = analyzingDocId === doc.id;
                      const isTextExpanded = expandedTextDocId === doc.id;

                      return (
                        <div
                          key={doc.id || idx}
                          className="border border-slate-200 hover:border-purple-300 bg-white rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-xs group gap-2"
                        >
                          <div className="flex gap-3">
                            {/* 썸네일 미리보기 */}
                            <div
                              onClick={() => setPreviewImage({ url: doc.dataUrl, title: doc.fileName })}
                              className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer relative group/thumb"
                              title="클릭하여 원본 크게 보기"
                            >
                              <img
                                src={doc.dataUrl}
                                alt={doc.fileName}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-4 h-4" />
                              </div>
                            </div>

                            {/* 정보 영역 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <h4
                                  onClick={() => setPreviewImage({ url: doc.dataUrl, title: doc.fileName })}
                                  className="text-xs font-bold text-slate-900 truncate hover:text-purple-700 cursor-pointer"
                                  title={doc.fileName}
                                >
                                  {doc.fileName}
                                </h4>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                  title="자료 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                등록: {new Date(doc.uploadedAt).toLocaleDateString()} {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {doc.analysisSummary && (
                                <p className="text-[11px] font-medium text-slate-700 mt-1 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  {doc.analysisSummary}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* 판독된 원문 텍스트 토글 영역 */}
                          {doc.extractedText && (
                            <div className="mt-1 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setExpandedTextDocId(isTextExpanded ? null : doc.id)}
                                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-purple-700 font-medium"
                              >
                                {isTextExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                <span>판독된 텍스트 원문 {isTextExpanded ? '접기' : '보기'} ({doc.extractedText.length}자)</span>
                              </button>
                              {isTextExpanded && (
                                <pre className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                  {doc.extractedText}
                                </pre>
                              )}
                            </div>
                          )}

                          {/* 상태 배지 & 분석 버튼 */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <div>
                              {doc.status === 'ANALYZED' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>반영 완료</span>
                                </span>
                              ) : doc.status === 'FAILED' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>재분석 권장</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">미분석 자료</span>
                              )}
                            </div>

                            <button
                              onClick={() => handleAnalyzeDocument(doc)}
                              disabled={isThisAnalyzing || analyzingDocId !== null}
                              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                                isThisAnalyzing
                                  ? 'bg-purple-100 text-purple-700 cursor-not-allowed'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs'
                              }`}
                            >
                              {isThisAnalyzing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>분석 중...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  <span>약효/성분 반영</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 텍스트 직접 입력 탭 */
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  약학정보원(KPIC) 복사 텍스트 초고속 자동 반영기
                </p>
                <p className="text-slate-600 text-[11px]">
                  약학정보원 웹페이지에서 성분 약효분류 표나 성분 분량 텍스트를 드래그하여 복사한 후 그대로 붙여넣으세요. OCR 이미지 인식 과정을 거치지 않아 0.1초 만에 100% 정확하게 성분표에 반영됩니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  복사한 텍스트 붙여넣기 (약효분류 또는 성분/분량)
                </label>
                <textarea
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  placeholder={`[예시 1: 약효분류 복사]\nBenfotiamine 소화기계질환 > 비타민제제 > 비타민B1\nSimethicone 소화기계질환 > 기타 약물 > 장내 가스 제거제\nUrsodeoxycholic Acid 소화기계질환 > 간장ㆍ담낭ㆍ췌장질환 치료 > 담석용해제\n\n[예시 2: 성분 분량 복사]\n벤포티아민 100mg\n피리독살포스페이트수화물 50mg\n우르소데옥시콜산 10mg`}
                  className="w-full h-48 p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleApplyDirectText}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>약효/성분 즉시 성분표에 반영</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 모달 하단 닫기 */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            반영된 내용은 메인 화면의 성분표에 즉시 갱신됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 원본 고화질 이미지 뷰어 팝업 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden p-2 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-2 py-1 mb-1">
              <span className="text-xs font-bold truncate max-w-lg">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
