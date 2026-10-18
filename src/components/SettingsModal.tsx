import React, { useState, useMemo, useRef } from 'react';
import {
  Settings,
  X,
  SlidersHorizontal,
  Tag,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Check,
  FileCheck,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  CheckCircle2,
  PackagePlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useProductStore } from '../stores/useProductStore';
import { ProductItem } from '../types/product';
import { ProductClassification, DosageForm } from '../types/classification';
import { STANDARD_EFFICACY_TAGS } from '../constants/efficacyTags';
import {
  searchPublicDrugDatabase,
  convertMasterItemToFetchResult
} from '../services/publicDataService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEfficacyClassificationModal: () => void;
}

type SettingsTab = 'EFFICACY' | 'TAGS' | 'BULK_IMPORT';

interface ParsedBulkRow {
  index: number;
  productName: string;
  manufacturer: string;
  packagingUnit: string;
  priceRetailKrw?: number;
  classification?: ProductClassification;
  storageLocation?: string;
  barcode?: string;
  tags: string[];
  isValid: boolean;
  validationError?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenEfficacyClassificationModal
}) => {
  const {
    products,
    getActiveTags,
    addCustomTag,
    renameTag,
    deleteTag,
    bulkAddProducts
  } = useProductStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('EFFICACY');

  // --- [탭 2: 제품 태그 관리 상태] ---
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTag, setEditingTag] = useState<{ oldName: string; newName: string } | null>(null);

  // 모든 활성 태그 및 각 태그별 제품 수
  const allActiveTags = useMemo(() => {
    return getActiveTags();
  }, [getActiveTags, products]);

  const tagProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allActiveTags.forEach((tag) => {
      counts[tag] = products.filter(
        (p) => p.tags && p.tags.some((t) => t.trim().toLowerCase() === tag.trim().toLowerCase())
      ).length;
    });
    return counts;
  }, [allActiveTags, products]);

  const filteredTags = useMemo(() => {
    const q = tagSearchQuery.trim().toLowerCase();
    if (!q) return allActiveTags;
    return allActiveTags.filter((t) => t.toLowerCase().includes(q));
  }, [allActiveTags, tagSearchQuery]);

  const handleAddNewTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    addCustomTag(trimmed);
    setNewTagInput('');
  };

  const handleStartRenameTag = (tag: string) => {
    setEditingTag({ oldName: tag, newName: tag });
  };

  const handleConfirmRenameTag = async () => {
    if (!editingTag) return;
    const { oldName, newName } = editingTag;
    const cleanNew = newName.trim();
    if (!cleanNew || cleanNew === oldName) {
      setEditingTag(null);
      return;
    }
    const affectedCount = tagProductCounts[oldName] || 0;
    if (
      affectedCount > 0 &&
      !window.confirm(
        `'${oldName}' 태그를 '${cleanNew}'(으)로 변경하시겠습니까?\n현재 등록된 ${affectedCount}개 제품의 태그도 함께 일괄 변경됩니다.`
      )
    ) {
      return;
    }
    await renameTag(oldName, cleanNew);
    setEditingTag(null);
  };

  const handleDeleteTag = async (tag: string) => {
    const affectedCount = tagProductCounts[tag] || 0;
    const msg =
      affectedCount > 0
        ? `'${tag}' 태그를 삭제하시겠습니까?\n해당 태그를 사용 중인 ${affectedCount}개 제품에서도 태그가 제거됩니다.`
        : `'${tag}' 태그를 삭제하시겠습니까?`;

    if (window.confirm(msg)) {
      await deleteTag(tag);
    }
  };

  // --- [탭 3: 엑셀 대량 품목 등록 상태] ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedBulkRow[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [autoEnrichFromApi, setAutoEnrichFromApi] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: ''
  });
  const [importResult, setImportResult] = useState<{
    successCount: number;
    apiEnrichedCount: number;
    failedCount: number;
  } | null>(null);

  // 표준 엑셀 양식 다운로드
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        '제품명 (필수)': '비맥스메타정',
        '제약회사 (필수)': 'GC녹십자',
        '포장단위': '120정 (60정 x 2병)',
        '판매가(원)': 70000,
        '분류': '일반의약품',
        '보관위치': '진열대 A-1',
        '바코드': '8806440023456',
        '효능태그': '피로, 만성피로, 활력'
      },
      {
        '제품명 (필수)': '엠-드림 리퀴드 키즈',
        '제약회사 (필수)': '엔큐엔에이',
        '포장단위': '20g x 60포',
        '판매가(원)': 120000,
        '분류': '건강기능식품',
        '보관위치': '소아과 매대 B-2',
        '바코드': '',
        '효능태그': '어린이, 성장, 뼈, 면역'
      },
      {
        '제품명 (필수)': '아로나민골드프리미엄정',
        '제약회사 (필수)': '일동제약',
        '포장단위': '100정',
        '판매가(원)': 35000,
        '분류': '일반의약품',
        '보관위치': '진열대 A-2',
        '바코드': '',
        '효능태그': '피로, 눈, 신경통'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 24 }, // 제품명
      { wch: 18 }, // 제약회사
      { wch: 20 }, // 포장단위
      { wch: 14 }, // 판매가
      { wch: 16 }, // 분류
      { wch: 18 }, // 보관위치
      { wch: 18 }, // 바코드
      { wch: 28 }  // 효능태그
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '대량등록양식');
    XLSX.writeFile(wb, '약국_품목_대량등록_표준양식.xlsx');
  };

  // 엑셀 파싱 헬퍼
  const parseExcelFile = (file: File) => {
    setUploadedFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          alert('엑셀 파일에 유효한 데이터 행이 없습니다.');
          return;
        }

        const parsed: ParsedBulkRow[] = rawJson.map((row, idx) => {
          // 유연한 컬럼 헤더 매핑
          const findVal = (keys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase().replace(/[\s\(\)\[\]_]/g, '');
              for (const k of keys) {
                if (cleanKey.includes(k.toLowerCase())) {
                  return row[key];
                }
              }
            }
            return undefined;
          };

          const rawName = findVal(['제품명', '품목명', '제품', 'productname', 'name']);
          const rawMfg = findVal(['제약회사', '제조사', '제조원', '회사', 'manufacturer', 'company']);
          const rawUnit = findVal(['포장단위', '포장', '규격', '단위', 'packagingunit', 'unit']);
          const rawPrice = findVal(['판매가', '소비자가', '가격', 'price', 'priceretailkrw']);
          const rawClass = findVal(['분류', '구분', '종류', 'classification', 'type']);
          const rawLoc = findVal(['보관위치', '위치', '약위치', '진열', 'storagelocation', 'location']);
          const rawBarcode = findVal(['바코드', 'barcode', 'gtin']);
          const rawTags = findVal(['효능태그', '태그', 'tags', 'tag']);

          const productName = String(rawName || '').trim();
          const manufacturer = String(rawMfg || '').trim();
          const packagingUnit = String(rawUnit || '').trim() || '1박스';

          let priceRetailKrw: number | undefined = undefined;
          if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
            const num = Number(String(rawPrice).replace(/[^0-9\.]/g, ''));
            if (!isNaN(num) && num > 0) priceRetailKrw = num;
          }

          let classification: ProductClassification | undefined = undefined;
          if (rawClass) {
            const strClass = String(rawClass).trim();
            if (strClass.includes('건강') || strClass.includes('건기식')) {
              classification = 'HEALTH_FUNCTIONAL_FOOD';
            } else if (strClass.includes('일반') || strClass.includes('의약품')) {
              classification = 'OTC_DRUG';
            } else if (strClass.includes('식품') || strClass.includes('기타')) {
              classification = 'GENERAL_FOOD';
            }
          }

          const tags: string[] = rawTags
            ? String(rawTags)
                .split(/[,/·\n]/)
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

          const isValid = !!productName;
          const validationError = !productName ? '제품명이 입력되지 않았습니다.' : undefined;

          return {
            index: idx + 1,
            productName,
            manufacturer,
            packagingUnit,
            priceRetailKrw,
            classification,
            storageLocation: rawLoc ? String(rawLoc).trim() : undefined,
            barcode: rawBarcode ? String(rawBarcode).trim() : undefined,
            tags,
            isValid,
            validationError
          };
        });

        setParsedRows(parsed);
      } catch (err) {
        console.error('엑셀 파싱 에러:', err);
        alert('엑셀 파일을 읽는 도중 오류가 발생했습니다. 올바른 .xlsx 또는 .csv 파일인지 확인해주세요.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcelFile(file);
  };

  // 대량 등록 실행
  const handleExecuteBulkImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('등록 가능한 유효 품목이 없습니다.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validRows.length, currentName: '' });

    const newProducts: ProductItem[] = [];
    let apiEnrichedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({
        current: i + 1,
        total: validRows.length,
        currentName: row.productName
      });

      const now = new Date().toISOString();
      const generatedId = `prod_bulk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

      let enrichedData: any = null;

      if (autoEnrichFromApi) {
        try {
          // 식약처 의약품 및 건강기능식품 통합 검색
          const searchResults = await searchPublicDrugDatabase(row.productName, {
            manufacturer: row.manufacturer,
            classification: row.classification
          });

          if (searchResults.length > 0) {
            // 가장 연관도 높은 첫 번째 매칭 품목 선택
            const bestMatch = searchResults[0];
            enrichedData = await convertMasterItemToFetchResult(bestMatch);
            apiEnrichedCount++;
          }
        } catch (e) {
          console.warn(`[API 조회 건너뜀] ${row.productName}:`, e);
        }
      }

      // 최종 제품 객체 조합
      const finalProduct: ProductItem = {
        id: generatedId,
        productName: row.productName,
        manufacturer: enrichedData?.manufacturer || row.manufacturer || '제약사 미정',
        classification:
          enrichedData?.classification || row.classification || 'HEALTH_FUNCTIONAL_FOOD',
        dosageForm: (enrichedData?.dosageForm as DosageForm) || 'TABLET',
        packagingUnit: row.packagingUnit || enrichedData?.packagingUnit || '120정',
        priceRetailKrw: row.priceRetailKrw,
        storageLocation: row.storageLocation,
        barcode: row.barcode,
        dailyServings: enrichedData?.dailyServings || 1,
        amountPerServing: enrichedData?.amountPerServing || 1,
        servingUnitKorean: enrichedData?.servingUnitKorean || '정',
        tags: Array.from(new Set([...(row.tags || []), ...(enrichedData?.indicationsSummary || []).slice(0, 3)])),
        ingredients: enrichedData?.parsedIngredients || [],
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      if (enrichedData?.classification === 'OTC_DRUG') {
        finalProduct.otcDetail = {
          itemSeq: enrichedData.regulatoryCode || '',
          permitDate: '',
          indicationsKorean: enrichedData.indicationsSummary || [],
          dosageAndAdministrationKorean: enrichedData.dosageInstruction || '',
          storageMethodKorean: '실온(1~30℃) 보관',
          precautionsSummaryKorean: enrichedData.precautionsSummary || []
        };
      } else if (
        enrichedData?.classification === 'HEALTH_FUNCTIONAL_FOOD' ||
        enrichedData?.classification === 'GENERAL_FOOD'
      ) {
        finalProduct.functionalFoodDetail = {
          reportNo: enrichedData.regulatoryCode || '',
          functionalClaimsKorean: enrichedData.indicationsSummary || [],
          suggestedUseKorean: enrichedData.dosageInstruction || '',
          safetyPrecautionsKorean: enrichedData.precautionsSummary || [],
          standardSpecificationKorean: enrichedData.standardSpecificationText,
          subIngredientsText: enrichedData.etcRawMaterialText,
          rawMaterialsText: enrichedData.indivRawMaterialText
        };
      }

      newProducts.push(finalProduct);
    }

    try {
      await bulkAddProducts(newProducts);
      setImportResult({
        successCount: newProducts.length,
        apiEnrichedCount,
        failedCount
      });
      setParsedRows([]);
      setUploadedFileName('');
    } catch (e) {
      console.error('대량 저장 에러:', e);
      alert('품목 대량 저장 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                약국 상담 및 데이터 설정
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                약효 분류표, 제품 효능 태그 관리 및 엑셀 대량 품목 등록
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('EFFICACY')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'EFFICACY'
                ? 'border-sky-600 text-sky-700 bg-white/70'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-600" />
            <span>약효분류표 수정</span>
          </button>

          <button
            onClick={() => setActiveTab('TAGS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'TAGS'
                ? 'border-sky-600 text-sky-700 bg-white/70'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>제품 태그 관리</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
              {allActiveTags.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('BULK_IMPORT')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BULK_IMPORT'
                ? 'border-sky-600 text-sky-700 bg-white/70'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>엑셀 대량 품목 등록</span>
          </button>
        </div>

        {/* 모달 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: 약효분류표 수정 */}
          {activeTab === 'EFFICACY' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                      약학정보원(KPIC) 4단계 약효 분류표 관리
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      모든 의약품 및 건강기능식품의 성분은 약학정보원 공식 4단계 계층 분류(대분류 → 중분류 → 소분류 → 세분류)에 매핑됩니다.
                      성분별 약효 분류를 실시간으로 변경하거나 분류명을 일괄 수정할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>4단계 계층 트리 탐색</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      약학정보원 공식 코드 체계(health.kr) 기반으로 전체 약효 트리 구조를 편리하게 펼쳐보며 성분을 탐색할 수 있습니다.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>성분별 약효 실시간 변경 및 학습</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      약사님이 특정 성분의 약효 분류를 수정하면, 등록된 전체 제품과 향후 추가될 제품에 자동으로 영구 적용됩니다.
                    </p>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      onOpenEfficacyClassificationModal();
                    }}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>약효 분류표 수정 열기</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 제품 태그 관리 */}
          {activeTab === 'TAGS' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* 태그 추가 폼 & 가이드 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <span>제품 효능·증상 태그 관리</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      카탈로그 상단 필터 바에 표시될 태그를 추가, 수정, 삭제할 수 있습니다.
                    </p>
                  </div>

                  {/* 신규 태그 추가 인풋 */}
                  <form onSubmit={handleAddNewTag} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="새 태그명 (예: 통풍, 혈압, 비염)..."
                      className="w-48 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newTagInput.trim()}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>추가</span>
                    </button>
                  </form>
                </div>

                {/* 태그 검색 및 필터 */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      placeholder="태그 검색..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-800"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    총 <strong className="text-slate-800 font-bold">{allActiveTags.length}</strong>개 태그
                  </span>
                </div>
              </div>

              {/* 태그 목록 그리드 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {filteredTags.map((tag) => {
                    const count = tagProductCounts[tag] || 0;
                    const isStandard = STANDARD_EFFICACY_TAGS.includes(tag);
                    const isRenaming = editingTag?.oldName === tag;

                    return (
                      <div
                        key={tag}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2"
                      >
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingTag.newName}
                              onChange={(e) =>
                                setEditingTag({ ...editingTag, newName: e.target.value })
                              }
                              className="flex-1 px-2 py-1 text-xs bg-white border border-indigo-400 rounded focus:outline-none font-bold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRenameTag();
                                if (e.key === 'Escape') setEditingTag(null);
                              }}
                            />
                            <button
                              onClick={handleConfirmRenameTag}
                              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                              title="확인"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingTag(null)}
                              className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                              title="취소"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {tag}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                  isStandard
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {isStandard ? '표준' : '사용자'}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                  count > 0
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {count}개 품목
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartRenameTag(tag)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="태그 이름 수정"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTag(tag)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="태그 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredTags.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    검색 조건에 맞는 태그가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 엑셀 대량 품목 등록 */}
          {activeTab === 'BULK_IMPORT' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* 안내 카드 */}
              <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-sky-900">
                      엑셀 대량 등록 시 필요한 정보 안내
                    </h4>
                    <p className="text-xs text-sky-800 leading-relaxed">
                      대량 등록 시에는 <strong>[제품명, 제약회사]</strong> 2가지만 있으면 식약처 일반의약품 및 식품안전나라 건강기능식품 공공 API를 통해
                      <strong> 성분, 분량, 복용 방법, 주의사항, 약효분류</strong>가 자동으로 자동 수집·채워집니다!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-sky-200/80">
                        <span className="font-bold text-sky-950 block mb-0.5">🟢 필수 항목</span>
                        <span className="text-sky-800">제품명, 제약회사</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-sky-200/80">
                        <span className="font-bold text-sky-950 block mb-0.5">🔵 권장 항목</span>
                        <span className="text-sky-800">포장단위, 판매가(원)</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-sky-200/80">
                        <span className="font-bold text-sky-950 block mb-0.5">⚪ 선택 항목</span>
                        <span className="text-sky-800">보관위치, 바코드, 효능태그</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-sky-200/80 flex-wrap gap-2">
                  <span className="text-[11px] text-sky-700">
                    * 표준 엑셀 양식을 다운로드하여 내용을 채운 후 업로드하시면 편리합니다.
                  </span>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3.5 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>표준 엑셀 양식 다운로드 (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* 파일 업로드 드롭존 */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-sky-500 bg-sky-50/50 scale-[1.01]'
                    : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">
                    엑셀 파일(.xlsx, .xls, .csv)을 이곳에 끌어다 놓거나 클릭하여 선택하세요
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    표준 등록 양식 또는 기존 약국 품목 엑셀 파일을 그대로 업로드할 수 있습니다.
                  </p>
                </div>
                {uploadedFileName && (
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>선택된 파일: {uploadedFileName}</span>
                  </div>
                )}
              </div>

              {/* 완료 결과 알림 */}
              {importResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h5 className="text-xs font-extrabold text-emerald-900">
                        대량 품목 등록이 완료되었습니다!
                      </h5>
                      <p className="text-[11px] text-emerald-700">
                        총 {importResult.successCount}건 등록 완료 (공공데이터 실시간 자동 연동:{' '}
                        {importResult.apiEnrichedCount}건)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setImportResult(null)}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              )}

              {/* 파싱된 행 미리보기 표 */}
              {parsedRows.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <span>업로드 품목 미리보기</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
                          총 {parsedRows.length}개 품목 감지
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        데이터를 확인한 후 하단의 [대량 등록 시작] 버튼을 누르시면 제품 카탈로그에 일괄 반영됩니다.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoEnrichFromApi}
                          onChange={(e) => setAutoEnrichFromApi(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>식약처/식품안전나라 성분·복용법 자동 연동</span>
                      </label>

                      <button
                        onClick={() => {
                          setParsedRows([]);
                          setUploadedFileName('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                      >
                        취소 및 초기화
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <tr>
                          <th className="p-2.5 w-12 text-center">No</th>
                          <th className="p-2.5">제품명</th>
                          <th className="p-2.5">제약회사</th>
                          <th className="p-2.5">포장단위</th>
                          <th className="p-2.5 text-right">판매가</th>
                          <th className="p-2.5">위치</th>
                          <th className="p-2.5">태그</th>
                          <th className="p-2.5 text-center">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedRows.map((row) => (
                          <tr key={row.index} className="hover:bg-slate-50/70">
                            <td className="p-2 text-center font-mono text-slate-400 text-[11px]">
                              {row.index}
                            </td>
                            <td className="p-2 font-bold text-slate-900">
                              {row.productName || (
                                <span className="text-rose-500 text-[11px]">
                                  (제품명 누락)
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-slate-600">
                              {row.manufacturer || <span className="text-slate-400">-</span>}
                            </td>
                            <td className="p-2 text-slate-600">{row.packagingUnit}</td>
                            <td className="p-2 text-right font-mono text-slate-800">
                              {row.priceRetailKrw ? `${row.priceRetailKrw.toLocaleString()}원` : '-'}
                            </td>
                            <td className="p-2 text-slate-500">{row.storageLocation || '-'}</td>
                            <td className="p-2">
                              {row.tags.length > 0 ? (
                                <div className="flex gap-1 flex-wrap">
                                  {row.tags.slice(0, 2).map((t, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {row.tags.length > 2 && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      +{row.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ 유효
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {row.validationError}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 등록 진행 중 프로그레스 바 */}
                  {isImporting && (
                    <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                          <span>
                            대량 품목 등록 및 공공 API 조회 진행 중... ({importProgress.current}/
                            {importProgress.total})
                          </span>
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] truncate max-w-xs">
                          {importProgress.currentName}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-500 h-full transition-all duration-300"
                          style={{
                            width: `${(importProgress.current / importProgress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 일괄 등록 실행 버튼 */}
                  {!isImporting && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleExecuteBulkImport}
                        disabled={parsedRows.filter((r) => r.isValid).length === 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <PackagePlus className="w-4 h-4" />
                        <span>
                          {parsedRows.filter((r) => r.isValid).length}개 품목 일괄 등록 시작
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            💡 모든 변경 사항은 실시간으로 저장되며 모든 기기(약국/자택)에 자동 동기화됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
