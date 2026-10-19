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
  CheckCircle2,
  PackagePlus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useProductStore } from '../stores/useProductStore';
import { ProductItem } from '../types/product';
import { ProductClassification, DosageForm } from '../types/classification';
import { STANDARD_EFFICACY_TAGS } from '../constants/efficacyTags';
import {
  searchPublicDrugDatabase,
  convertMasterItemToFetchResult,
  PublicDrugMasterItem
} from '../services/publicDataService';
import { EfficacyClassificationView } from './EfficacyClassificationModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export type SettingsTab = 'EFFICACY' | 'TAGS' | 'BULK_IMPORT';

interface ParsedBulkRow {
  id: string;
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

  // 공공 API 매칭 및 사용자 선택 상태
  searchStatus?: 'IDLE' | 'SEARCHING' | 'DONE' | 'ERROR';
  searchCandidates?: PublicDrugMasterItem[];
  selectedMaster?: PublicDrugMasterItem | 'NONE' | null;
  lastSearchQuery?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'EFFICACY'
}) => {
  const {
    products,
    getActiveTags,
    addCustomTag,
    renameTag,
    deleteTag,
    bulkAddProducts
  } = useProductStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

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
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: ''
  });
  const [importResult, setImportResult] = useState<{
    successCount: number;
    apiEnrichedCount: number;
    manualCount: number;
    failedCount: number;
  } | null>(null);

  // 일괄 API 후보 조회 상태
  const [isBatchSearching, setIsBatchSearching] = useState(false);
  const [batchSearchProgress, setBatchSearchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0
  });

  // 후보 선택 모달 상태
  const [activeMatchRowId, setActiveMatchRowId] = useState<string | null>(null);
  const [matchModalSearchTerm, setMatchModalSearchTerm] = useState<string>('');
  const [matchModalClassification, setMatchModalClassification] = useState<ProductClassification>('OTC_DRUG');
  const [matchModalLoading, setMatchModalLoading] = useState<boolean>(false);
  const [matchModalResults, setMatchModalResults] = useState<PublicDrugMasterItem[]>([]);

  // 체크박스 다중 선택 및 삭제 상태
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // 개별 품목 행 삭제 핸들러
  const handleDeleteRow = (rowId: string) => {
    setParsedRows((prev) =>
      prev
        .filter((r) => r.id !== rowId)
        .map((r, idx) => ({ ...r, index: idx + 1 }))
    );
    setSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
    if (activeMatchRowId === rowId) {
      setActiveMatchRowId(null);
    }
  };

  // 선택된 여러 품목 일괄 삭제 핸들러
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.length === 0) return;
    if (
      window.confirm(
        `선택하신 ${selectedRowIds.length}개 품목을 목록에서 삭제하시겠습니까?`
      )
    ) {
      setParsedRows((prev) =>
        prev
          .filter((r) => !selectedRowIds.includes(r.id))
          .map((r, idx) => ({ ...r, index: idx + 1 }))
      );
      if (activeMatchRowId && selectedRowIds.includes(activeMatchRowId)) {
        setActiveMatchRowId(null);
      }
      setSelectedRowIds([]);
    }
  };

  // 전체 품목 선택/해제 토글
  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === parsedRows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(parsedRows.map((r) => r.id));
    }
  };

  // 개별 품목 선택 체크박스 토글
  const handleToggleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  // 검색어 정제 헬퍼 (괄호 규격 등 제거)
  const cleanSearchKeyword = (rawName: string): string => {
    return rawName
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 표준 엑셀 양식 다운로드 (제품 구분 필수화 안내 반영)
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        '제품명 (필수)': '올대원맥스정',
        '제품 구분 (필수)': '일반의약품',
        '제약회사 (필수)': '대원제약',
        '포장단위': '120정/상자 [60정/병 x 2]',
        '판매가(원)': 70000,
        '보관위치': '진열대 A-1',
        '바코드': '',
        '효능태그': '피로, 눈, 관절'
      },
      {
        '제품명 (필수)': '비맥스메타정',
        '제품 구분 (필수)': '일반의약품',
        '제약회사 (필수)': 'GC녹십자',
        '포장단위': '120정 (60정 x 2병)',
        '판매가(원)': 70000,
        '보관위치': '진열대 A-2',
        '바코드': '8806440023456',
        '효능태그': '피로, 만성피로, 활력'
      },
      {
        '제품명 (필수)': '엠-드림 리퀴드 키즈',
        '제품 구분 (필수)': '건강기능식품',
        '제약회사 (필수)': '엔큐엔에이',
        '포장단위': '20g x 60포',
        '판매가(원)': 120000,
        '보관위치': '소아과 매대 B-2',
        '바코드': '',
        '효능태그': '어린이, 성장, 뼈, 면역'
      },
      {
        '제품명 (필수)': '홍삼순액골드',
        '제품 구분 (필수)': '기타',
        '제약회사 (필수)': '정관장',
        '포장단위': '50ml x 30포',
        '판매가(원)': 55000,
        '보관위치': '진열대 C-1',
        '바코드': '',
        '효능태그': '홍삼, 면역, 활력'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 24 }, // 제품명
      { wch: 22 }, // 제품 구분
      { wch: 20 }, // 제약회사
      { wch: 22 }, // 포장단위
      { wch: 14 }, // 판매가
      { wch: 18 }, // 보관위치
      { wch: 18 }, // 바코드
      { wch: 28 }  // 효능태그
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '대량등록양식');
    XLSX.writeFile(wb, '약국_품목_대량등록_표준양식.xlsx');
  };

  // 엑셀 파싱 헬퍼 (제품 구분, 제품명, 제약회사 엄격 필수 검증)
  const parseExcelFile = (file: File) => {
    setUploadedFileName(file.name);
    setImportResult(null);
    setSelectedRowIds([]);

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
          const rawMfg = findVal(['제약회사', '제조사', '제조원', '회사', '판매사', 'manufacturer', 'company']);
          const rawUnit = findVal(['포장단위', '포장', '규격', '단위', 'packagingunit', 'unit']);
          const rawPrice = findVal(['판매가', '소비자가', '가격', 'price', 'priceretailkrw']);
          const rawClass = findVal(['제품구분', '구분', '분류', '종류', '제품분류', 'classification', 'type']);
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
            const strClass = String(rawClass).trim().toLowerCase().replace(/\s+/g, '');
            if (strClass.includes('건강') || strClass.includes('건기식') || strClass.includes('health')) {
              classification = 'HEALTH_FUNCTIONAL_FOOD';
            } else if (strClass.includes('일반') || strClass.includes('의약품') || strClass.includes('otc')) {
              classification = 'OTC_DRUG';
            } else if (strClass.includes('기타') || strClass.includes('식품') || strClass.includes('general')) {
              classification = 'GENERAL_FOOD';
            }
          }

          const tags: string[] = rawTags
            ? String(rawTags)
                .split(/[,/·\n]/)
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

          let isValid = true;
          let validationError: string | undefined = undefined;

          if (!productName) {
            isValid = false;
            validationError = '제품명 누락';
          } else if (!classification) {
            isValid = false;
            validationError = '제품 구분 누락 (필수)';
          } else if (!manufacturer) {
            isValid = false;
            validationError = '제약회사 누락';
          }

          return {
            id: `bulk_row_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
            validationError,
            searchStatus: 'IDLE',
            searchCandidates: undefined,
            selectedMaster: null
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

  // 테이블에서 행의 제품 구분(classification) 직접 변경
  const handleRowClassificationChange = (rowId: string, newClass: ProductClassification) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const isValid = !!r.productName && !!r.manufacturer && !!newClass;
        let validationError: string | undefined = undefined;
        if (!r.productName) validationError = '제품명 누락';
        else if (!newClass) validationError = '제품 구분 누락 (필수)';
        else if (!r.manufacturer) validationError = '제약회사 누락';

        return {
          ...r,
          classification: newClass,
          isValid,
          validationError,
          // 분류가 변경되었으면 기존 선택된 마스터 초기화 (분류 불일치 방지)
          selectedMaster:
            r.selectedMaster && r.selectedMaster !== 'NONE' && r.selectedMaster.classification !== newClass
              ? null
              : r.selectedMaster,
          searchCandidates: undefined,
          searchStatus: 'IDLE'
        };
      })
    );
  };

  // 개별 행 공공 API 후보 검색 실행
  const fetchCandidatesForRow = async (
    kw: string,
    targetClass: ProductClassification,
    mfg?: string
  ): Promise<PublicDrugMasterItem[]> => {
    try {
      const results = await searchPublicDrugDatabase(kw, {
        classification: targetClass,
        manufacturer: mfg
      });
      return results;
    } catch (e) {
      console.warn(`[후보 검색 오류] ${kw}:`, e);
      return [];
    }
  };

  // 일괄 API 후보 조회 핸들러
  const handleBatchSearchCandidates = async () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.classification);
    if (validRows.length === 0) {
      alert('공공데이터를 조회할 유효한 품목이 없습니다. 제품명과 구분을 먼저 확인해주세요.');
      return;
    }

    setIsBatchSearching(true);
    setBatchSearchProgress({ current: 0, total: validRows.length });

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setBatchSearchProgress({ current: i + 1, total: validRows.length });

      // 행 상태를 SEARCHING으로 갱신
      setParsedRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, searchStatus: 'SEARCHING' } : r))
      );

      const kw = cleanSearchKeyword(row.productName) || row.productName;
      const results = await fetchCandidatesForRow(
        kw,
        row.classification!,
        row.manufacturer
      );

      setParsedRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                searchCandidates: results,
                searchStatus: 'DONE',
                lastSearchQuery: kw
              }
            : r
        )
      );
    }

    setIsBatchSearching(false);
  };

  // 후보 선택 모달 열기
  const handleOpenMatchModal = async (row: ParsedBulkRow) => {
    setActiveMatchRowId(row.id);
    const targetClass = row.classification || 'OTC_DRUG';
    setMatchModalClassification(targetClass);

    const initialKw = cleanSearchKeyword(row.productName) || row.productName;
    setMatchModalSearchTerm(initialKw);

    if (row.searchCandidates && row.searchCandidates.length > 0) {
      setMatchModalResults(row.searchCandidates);
    } else {
      // 후보가 없으면 즉시 검색 실행
      setMatchModalLoading(true);
      const results = await fetchCandidatesForRow(initialKw, targetClass, row.manufacturer);
      setMatchModalResults(results);
      setMatchModalLoading(false);

      // 행 캐시도 업데이트
      setParsedRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                searchCandidates: results,
                searchStatus: 'DONE',
                lastSearchQuery: initialKw
              }
            : r
        )
      );
    }
  };

  // 모달 내 수동 재검색
  const handleModalSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeMatchRowId) return;

    const currentRow = parsedRows.find((r) => r.id === activeMatchRowId);
    const kw = matchModalSearchTerm.trim();
    if (!kw) return;

    setMatchModalLoading(true);
    const results = await fetchCandidatesForRow(
      kw,
      matchModalClassification,
      currentRow?.manufacturer
    );
    setMatchModalResults(results);
    setMatchModalLoading(false);

    setParsedRows((prev) =>
      prev.map((r) =>
        r.id === activeMatchRowId
          ? {
              ...r,
              searchCandidates: results,
              searchStatus: 'DONE',
              lastSearchQuery: kw,
              classification: matchModalClassification
            }
          : r
      )
    );
  };

  // 모달 내 제품 구분 변경 시 즉시 재검색
  const handleModalClassificationChange = async (newClass: ProductClassification) => {
    setMatchModalClassification(newClass);
    if (!activeMatchRowId) return;

    const currentRow = parsedRows.find((r) => r.id === activeMatchRowId);
    const kw = matchModalSearchTerm.trim() || cleanSearchKeyword(currentRow?.productName || '') || '';
    if (!kw) return;

    setMatchModalLoading(true);
    const results = await fetchCandidatesForRow(
      kw,
      newClass,
      currentRow?.manufacturer
    );
    setMatchModalResults(results);
    setMatchModalLoading(false);

    setParsedRows((prev) =>
      prev.map((r) =>
        r.id === activeMatchRowId
          ? {
              ...r,
              classification: newClass,
              searchCandidates: results,
              searchStatus: 'DONE',
              lastSearchQuery: kw
            }
          : r
      )
    );
  };

  // 특정 공공 마스터 후보 선택
  const handleSelectCandidate = (candidate: PublicDrugMasterItem) => {
    if (!activeMatchRowId) return;

    setParsedRows((prev) =>
      prev.map((r) =>
        r.id === activeMatchRowId
          ? {
              ...r,
              selectedMaster: candidate,
              classification: candidate.classification || r.classification
            }
          : r
      )
    );

    // 다음 품목으로 순차 이동 (사용자 편의성)
    const validRows = parsedRows.filter((r) => r.isValid);
    const currentIndex = validRows.findIndex((r) => r.id === activeMatchRowId);
    if (currentIndex >= 0 && currentIndex < validRows.length - 1) {
      handleOpenMatchModal(validRows[currentIndex + 1]);
    } else {
      setActiveMatchRowId(null);
    }
  };

  // 공공 API 연동 안함 (엑셀 입력값만 등록) 선택
  const handleSelectNone = () => {
    if (!activeMatchRowId) return;

    setParsedRows((prev) =>
      prev.map((r) =>
        r.id === activeMatchRowId
          ? {
              ...r,
              selectedMaster: 'NONE'
            }
          : r
      )
    );

    const validRows = parsedRows.filter((r) => r.isValid);
    const currentIndex = validRows.findIndex((r) => r.id === activeMatchRowId);
    if (currentIndex >= 0 && currentIndex < validRows.length - 1) {
      handleOpenMatchModal(validRows[currentIndex + 1]);
    } else {
      setActiveMatchRowId(null);
    }
  };

  // 선택 초기화 (미선택으로 변경)
  const handleClearSelection = (rowId: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, selectedMaster: null } : r))
    );
  };

  // 모달 내 이전/다음 품목 이동
  const handleNavigateMatchModal = (direction: 'prev' | 'next') => {
    const validRows = parsedRows.filter((r) => r.isValid);
    const currentIndex = validRows.findIndex((r) => r.id === activeMatchRowId);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < validRows.length) {
      handleOpenMatchModal(validRows[nextIndex]);
    }
  };

  // 대량 등록 최종 실행 (사용자 검수/선택 결과 완벽 반영)
  const handleExecuteBulkImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('등록 가능한 유효 품목이 없습니다. 필수 항목(제품명, 제품 구분, 제약회사)을 확인해주세요.');
      return;
    }

    // 아직 공공데이터 후보를 선택하지 않은 행 확인
    const unselectedRows = validRows.filter((r) => r.selectedMaster === null || r.selectedMaster === undefined);
    if (unselectedRows.length > 0) {
      const confirmProceed = window.confirm(
        `공공데이터 후보를 아직 확인/선택하지 않은 품목이 ${unselectedRows.length}건 있습니다.\n\n` +
        `• [확인]: 미선택 품목은 공공데이터 연동 없이 엑셀 입력값(제품명, 제약회사 등)만으로 등록합니다.\n` +
        `• [취소]: 등록을 멈추고 공공데이터 후보를 직접 확인하여 선택합니다.`
      );
      if (!confirmProceed) {
        return;
      }
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validRows.length, currentName: '' });

    const newProducts: ProductItem[] = [];
    let apiEnrichedCount = 0;
    let manualCount = 0;
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

      // 사용자가 공공데이터 후보를 선택한 경우에만 convertMasterItemToFetchResult 실행!
      if (row.selectedMaster && row.selectedMaster !== 'NONE') {
        try {
          enrichedData = await convertMasterItemToFetchResult(row.selectedMaster);
          apiEnrichedCount++;
        } catch (e) {
          console.warn(`[상세 연동 실패] ${row.productName}:`, e);
        }
      } else {
        manualCount++;
      }

      // [원칙 1] 제약회사는 엑셀 파일(사용자 입력)에 기재된 제약회사(판매사/브랜드)를 최우선으로 등록
      const userMfg = row.manufacturer ? row.manufacturer.trim() : '';
      const finalManufacturer = userMfg || enrichedData?.manufacturer || '제약사 미정';
      const finalClassification = row.classification || enrichedData?.classification || 'OTC_DRUG';

      const finalProduct: ProductItem = {
        id: generatedId,
        productName: row.productName,
        manufacturer: finalManufacturer,
        distributor: userMfg && enrichedData?.manufacturer && userMfg !== enrichedData.manufacturer ? userMfg : undefined,
        classification: finalClassification,
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

      if (finalClassification === 'OTC_DRUG') {
        finalProduct.otcDetail = {
          itemSeq: enrichedData?.regulatoryCode || '',
          permitDate: '',
          indicationsKorean: enrichedData?.indicationsSummary || [],
          dosageAndAdministrationKorean: enrichedData?.dosageInstruction || '',
          storageMethodKorean: '실온(1~30℃) 보관',
          precautionsSummaryKorean: enrichedData?.precautionsSummary || []
        };
      } else {
        finalProduct.functionalFoodDetail = {
          reportNo: enrichedData?.regulatoryCode || '',
          functionalClaimsKorean: enrichedData?.indicationsSummary || [],
          suggestedUseKorean: enrichedData?.dosageInstruction || '',
          safetyPrecautionsKorean: enrichedData?.precautionsSummary || [],
          standardSpecificationKorean: enrichedData?.standardSpecificationText,
          subIngredientsText: enrichedData?.etcRawMaterialText,
          rawMaterialsText: enrichedData?.indivRawMaterialText
        };
      }

      newProducts.push(finalProduct);
    }

    try {
      await bulkAddProducts(newProducts);
      setImportResult({
        successCount: newProducts.length,
        apiEnrichedCount,
        manualCount,
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
                설정 및 마스터 데이터 관리
              </h2>
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
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
        <div className={`flex-1 ${activeTab === 'EFFICACY' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto p-6 bg-slate-50/50'}`}>
          {/* TAB 1: 약효분류표 수정 (설명 배너 없이 바로 트리/테이블 수정 화면 노출) */}
          {activeTab === 'EFFICACY' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <EfficacyClassificationView />
            </div>
          )}

          {/* TAB 2: 제품 태그 관리 */}
          {activeTab === 'TAGS' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* 태그 추가 폼 */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <span>카탈로그 효능·증상 태그 관리</span>
                    </h3>
                  </div>

                  <form onSubmit={handleAddNewTag} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="새 태그명 (예: 통풍, 혈압)..."
                      className="w-48 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
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
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
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
            <div className="space-y-4 max-w-5xl mx-auto">
              {/* 상단 간결 안내 및 엑셀 표준 양식 다운로드 바 */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-slate-800 flex-wrap">
                    <span className="font-extrabold text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      필수 입력 3대 항목:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                      제품명
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                      제품 구분 (일반의약품 / 건강기능식품 / 기타)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200">
                      제약회사 (판매사 기준)
                    </span>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3.5 py-1.5 bg-slate-50 hover:bg-sky-50 text-sky-700 border border-slate-300 hover:border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-600" />
                    <span>표준 엑셀 양식 다운로드 (.xlsx)</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    <strong>안내:</strong> 자동 매칭 오류를 방지하기 위해 각 제품의 공공데이터 후보를 직접 눈으로 확인하고 선택하는 검수 과정이 제공됩니다.
                  </span>
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
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
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
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">
                    엑셀 파일(.xlsx, .xls, .csv)을 이곳에 끌어다 놓거나 클릭하여 선택하세요
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    표준 등록 양식 또는 약국 엑셀 파일을 업로드하시면 품목별 공공데이터 후보를 확인하실 수 있습니다.
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
                        총 {importResult.successCount}건 등록 완료 (공공데이터 실시간 정밀 연동:{' '}
                        <strong>{importResult.apiEnrichedCount}건</strong>, 엑셀 입력값 직접 등록:{' '}
                        <strong>{importResult.manualCount}건</strong>)
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

              {/* 파싱된 행 미리보기 및 매칭 검수 표 */}
              {parsedRows.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <span>업로드 품목 검수 및 매칭</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
                          총 {parsedRows.length}개 품목
                        </span>
                      </h4>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          선택 완료:{' '}
                          {
                            parsedRows.filter(
                              (r) => r.selectedMaster && r.selectedMaster !== null
                            ).length
                          }
                          건
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                          미선택:{' '}
                          {
                            parsedRows.filter(
                              (r) => r.isValid && (r.selectedMaster === null || r.selectedMaster === undefined)
                            ).length
                          }
                          건
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRowIds.length > 0 && (
                        <button
                          onClick={handleDeleteSelectedRows}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs animate-in fade-in"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>선택한 {selectedRowIds.length}개 품목 삭제</span>
                        </button>
                      )}

                      <button
                        onClick={handleBatchSearchCandidates}
                        disabled={isBatchSearching}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="모든 유효 품목의 공공데이터 후보를 구분에 맞춰 한번에 조회합니다"
                      >
                        {isBatchSearching ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                            <span>
                              후보 일괄 조회 중... ({batchSearchProgress.current}/{batchSearchProgress.total})
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                            <span>공공 API 후보 일괄 검색</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setParsedRows([]);
                          setUploadedFileName('');
                          setSelectedRowIds([]);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer px-2 py-1"
                      >
                        초기화
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold text-[11px] z-10">
                        <tr>
                          <th className="p-2.5 w-14 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={parsedRows.length > 0 && selectedRowIds.length === parsedRows.length}
                                onChange={handleToggleSelectAll}
                                className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                title="전체 선택 / 해제"
                              />
                              <span>No</span>
                            </div>
                          </th>
                          <th className="p-2.5 w-32">제품 구분 (필수)</th>
                          <th className="p-2.5">제품명 (필수)</th>
                          <th className="p-2.5 w-36">제약회사(판매사)</th>
                          <th className="p-2.5 w-24">규격/가격</th>
                          <th className="p-2.5">공공 API 매칭 및 선택</th>
                          <th className="p-2.5 w-20 text-center">상태</th>
                          <th className="p-2.5 w-12 text-center">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedRows.map((row) => {
                          const hasSelectedMaster =
                            row.selectedMaster && row.selectedMaster !== 'NONE';
                          const isSelectedNone = row.selectedMaster === 'NONE';

                          return (
                            <tr key={row.id} className={`hover:bg-slate-50/70 transition-colors ${selectedRowIds.includes(row.id) ? 'bg-sky-50/40' : ''}`}>
                              <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedRowIds.includes(row.id)}
                                    onChange={() => handleToggleSelectRow(row.id)}
                                    className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                  />
                                  <span>{row.index}</span>
                                </div>
                              </td>

                              {/* 제품 구분 (필수) — 드롭다운 인라인 수정 가능 */}
                              <td className="p-2.5">
                                <select
                                  value={row.classification || ''}
                                  onChange={(e) =>
                                    handleRowClassificationChange(
                                      row.id,
                                      e.target.value as ProductClassification
                                    )
                                  }
                                  className={`w-full p-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                    !row.classification
                                      ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-rose-400'
                                      : row.classification === 'OTC_DRUG'
                                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                                      : row.classification === 'HEALTH_FUNCTIONAL_FOOD'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : 'border-slate-300 bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <option value="">-- 구분 필수 선택 --</option>
                                  <option value="OTC_DRUG">일반의약품</option>
                                  <option value="HEALTH_FUNCTIONAL_FOOD">건강기능식품</option>
                                  <option value="GENERAL_FOOD">기타 (식품)</option>
                                </select>
                              </td>

                              {/* 제품명 */}
                              <td className="p-2.5 font-bold text-slate-900">
                                {row.productName ? (
                                  <div>
                                    <span>{row.productName}</span>
                                    {row.barcode && (
                                      <span className="block text-[10px] text-slate-400 font-mono">
                                        바코드: {row.barcode}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-rose-500 text-[11px] font-bold">
                                    (제품명 누락)
                                  </span>
                                )}
                              </td>

                              {/* 제약회사 */}
                              <td className="p-2.5 font-semibold text-slate-800">
                                {row.manufacturer || (
                                  <span className="text-rose-500 text-[11px] font-bold">
                                    (제약회사 누락)
                                  </span>
                                )}
                              </td>

                              {/* 규격 및 가격 */}
                              <td className="p-2.5 text-[11px]">
                                <div className="text-slate-700">{row.packagingUnit}</div>
                                {row.priceRetailKrw ? (
                                  <div className="font-mono text-slate-900 font-semibold">
                                    {row.priceRetailKrw.toLocaleString()}원
                                  </div>
                                ) : (
                                  <div className="text-slate-400">-</div>
                                )}
                              </td>

                              {/* 공공 API 후보 및 선택 열 (핵심 검수 UI) */}
                              <td className="p-2.5">
                                {hasSelectedMaster ? (
                                  <div className="flex items-center justify-between gap-2 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] px-1 rounded font-bold bg-emerald-600 text-white">
                                          ✓ 선택됨
                                        </span>
                                        <span className="font-bold text-xs text-emerald-950 truncate">
                                          {(row.selectedMaster as PublicDrugMasterItem).productName}
                                        </span>
                                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded">
                                          {(row.selectedMaster as PublicDrugMasterItem).manufacturer}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-emerald-700 font-mono mt-0.5 truncate">
                                        코드: {(row.selectedMaster as PublicDrugMasterItem).regulatoryCode} •{' '}
                                        {(row.selectedMaster as PublicDrugMasterItem).sourceOrigin}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleOpenMatchModal(row)}
                                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded border border-emerald-300 transition-colors cursor-pointer"
                                      >
                                        변경
                                      </button>
                                      <button
                                        onClick={() => handleClearSelection(row.id)}
                                        className="p-1 text-emerald-600 hover:text-rose-600 rounded cursor-pointer"
                                        title="선택 해제"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : isSelectedNone ? (
                                  <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                                    <span className="text-[11px] font-medium">
                                      ⊘ <strong>API 연동 안함</strong> (엑셀 입력값만 등록)
                                    </span>
                                    <button
                                      onClick={() => handleOpenMatchModal(row)}
                                      className="px-2 py-0.8 bg-white hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded border border-slate-300 cursor-pointer"
                                    >
                                      API 매칭
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {row.searchStatus === 'SEARCHING' ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 font-medium">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>API 조회 중...</span>
                                      </span>
                                    ) : row.searchCandidates && row.searchCandidates.length > 0 ? (
                                      <button
                                        onClick={() => handleOpenMatchModal(row)}
                                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>
                                          후보 <strong>{row.searchCandidates.length}건</strong> 중 선택하기
                                        </span>
                                      </button>
                                    ) : row.searchCandidates && row.searchCandidates.length === 0 ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-slate-400">후보 없음</span>
                                        <button
                                          onClick={() => handleOpenMatchModal(row)}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded border border-slate-300 cursor-pointer"
                                        >
                                          직접 검색 / 선택
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenMatchModal(row)}
                                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Search className="w-3 h-3 text-sky-600" />
                                        <span>API 후보 조회 및 선택</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 상태 */}
                              <td className="p-2.5 text-center">
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

                              {/* 개별 품목 삭제 버튼 */}
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="목록에서 이 품목 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
                            품목 등록 및 공공 API 연동 진행 중... ({importProgress.current}/
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
                    <div className="pt-2 flex justify-between items-center gap-4 flex-wrap">
                      <div className="text-xs text-slate-500">
                        * 공공데이터 후보가 선택된 품목은 허가 성분·용법이 실시간 연동되며, 미선택 품목은 엑셀 입력값으로 기본 등록됩니다.
                      </div>

                      <button
                        onClick={handleExecuteBulkImport}
                        disabled={parsedRows.filter((r) => r.isValid).length === 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <PackagePlus className="w-4 h-4" />
                        <span>
                          {parsedRows.filter((r) => r.isValid).length}개 품목 일괄 등록 실행
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* [품목 공공데이터 후보 선택 모달 다이얼로그] */}
              {activeMatchRowId && (() => {
                const row = parsedRows.find((r) => r.id === activeMatchRowId);
                if (!row) return null;

                const validRows = parsedRows.filter((r) => r.isValid);
                const currentIndex = validRows.findIndex((r) => r.id === activeMatchRowId);

                return (
                  <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
                      {/* 헤더 */}
                      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold flex items-center gap-2">
                              <span>공공데이터 제품 후보 확인 및 선택</span>
                              <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-800 text-sky-300 font-mono">
                                품목 {row.index} / {parsedRows.length}
                              </span>
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveMatchRowId(null)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 엑셀 입력 원본 요약 바 */}
                      <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 flex-wrap gap-2 shrink-0">
                        <div className="flex items-center gap-3">
                          <span>
                            <strong>엑셀 제품명:</strong>{' '}
                            <span className="text-slate-900 font-extrabold">{row.productName}</span>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            <strong>제약회사:</strong> {row.manufacturer || '미기재'}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            <strong>규격:</strong> {row.packagingUnit}
                          </span>
                        </div>

                        {row.selectedMaster && row.selectedMaster !== 'NONE' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            현재 선택: {(row.selectedMaster as PublicDrugMasterItem).productName}
                          </span>
                        )}
                        {row.selectedMaster === 'NONE' && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[11px]">
                            현재: API 연동 안함 (입력값 유지)
                          </span>
                        )}
                      </div>

                      {/* 제품 구분 선택 탭 및 검색어 수정 바 */}
                      <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
                        {/* 구분 탭 */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 shrink-0">
                            조회 대상 API 구분:
                          </span>
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80">
                            <button
                              onClick={() => handleModalClassificationChange('OTC_DRUG')}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                matchModalClassification === 'OTC_DRUG'
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              일반의약품 (식약처)
                            </button>
                            <button
                              onClick={() => handleModalClassificationChange('HEALTH_FUNCTIONAL_FOOD')}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                matchModalClassification === 'HEALTH_FUNCTIONAL_FOOD'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              건강기능식품 (식품안전나라)
                            </button>
                            <button
                              onClick={() => handleModalClassificationChange('GENERAL_FOOD')}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                matchModalClassification === 'GENERAL_FOOD'
                                  ? 'bg-slate-700 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              기타 / 식품 (I1250)
                            </button>
                          </div>
                        </div>

                        {/* 검색창 */}
                        <form onSubmit={handleModalSearchSubmit} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={matchModalSearchTerm}
                              onChange={(e) => setMatchModalSearchTerm(e.target.value)}
                              placeholder="검색어를 입력하고 검색 버튼을 누르세요..."
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={matchModalLoading || !matchModalSearchTerm.trim()}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            {matchModalLoading ? '검색 중...' : '다시 검색'}
                          </button>
                        </form>
                      </div>

                      {/* 후보 리스트 본문 */}
                      <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                        {matchModalLoading ? (
                          <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
                            <span>공공데이터(식약처 / 식품안전나라) 실시간 조회 중...</span>
                          </div>
                        ) : matchModalResults.length === 0 ? (
                          <div className="py-10 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">
                                "{matchModalSearchTerm}"에 해당하는 등록 제품을 찾을 수 없습니다.
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                검색어에서 용량이나 불필요한 단어를 지우고 재검색해보시거나, 상단 제품 구분(일반의약품/건기식/기타)을 변경해보세요.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleSelectNone}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              공공 API 연동 없이 엑셀 입력값만으로 등록
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                              <span>검색 결과 {matchModalResults.length}건 — 아래에서 올바른 제품을 골라주세요:</span>
                              <button
                                onClick={handleSelectNone}
                                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                              >
                                연동하지 않고 엑셀값만 사용
                              </button>
                            </div>

                            <div className="space-y-2">
                              {matchModalResults.map((candidate) => {
                                const isCurrentSelected =
                                  row.selectedMaster &&
                                  row.selectedMaster !== 'NONE' &&
                                  row.selectedMaster.id === candidate.id;

                                const classBadgeColor =
                                  candidate.classification === 'OTC_DRUG'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : candidate.classification === 'HEALTH_FUNCTIONAL_FOOD'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-200 text-slate-800 border-slate-300';

                                const classLabel =
                                  candidate.classification === 'OTC_DRUG'
                                    ? '일반의약품'
                                    : candidate.classification === 'HEALTH_FUNCTIONAL_FOOD'
                                    ? '건강기능식품'
                                    : `일반식품(${candidate.foodTypeCategory || '기타'})`;

                                return (
                                  <div
                                    key={candidate.id}
                                    onClick={() => handleSelectCandidate(candidate)}
                                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                      isCurrentSelected
                                        ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
                                        : 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-xs'
                                    }`}
                                  >
                                    <div className="space-y-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${classBadgeColor}`}>
                                          {classLabel}
                                        </span>
                                        {candidate.apiSourceBadge && (
                                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {candidate.apiSourceBadge}
                                          </span>
                                        )}
                                        <span className="font-extrabold text-xs text-slate-900">
                                          {candidate.productName}
                                        </span>
                                        <span className="text-[11px] font-medium text-sky-900 bg-sky-100 px-1.5 py-0.2 rounded">
                                          {candidate.manufacturer}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                          허가/보고번호: {candidate.regulatoryCode}
                                        </span>
                                      </div>

                                      <p className="text-[11px] text-slate-600 truncate">
                                        {candidate.packagingUnit} • {candidate.dosageInstruction}
                                      </p>

                                      {(candidate.indivRawMaterialText || candidate.rawIngredientsText) && (
                                        <p className="text-[10px] text-slate-500 truncate font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                          주원료/성분: {(candidate.indivRawMaterialText || candidate.rawIngredientsText).replace(/\n/g, ', ')}
                                        </p>
                                      )}
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                      {isCurrentSelected ? (
                                        <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>선택됨</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-[0.98]"
                                        >
                                          이 제품 선택
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 모달 푸터 (이전/다음 내비게이션 지원) */}
                      <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectNone}
                            className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                          >
                            공공데이터 연동 안함 (입력값 유지)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`'${row.productName}' 품목을 등록 목록에서 삭제하시겠습니까?`)) {
                                handleDeleteRow(row.id);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="이 품목을 등록 목록에서 제거"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>품목 삭제</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleNavigateMatchModal('prev')}
                            disabled={currentIndex <= 0}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>이전 품목</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavigateMatchModal('next')}
                            disabled={currentIndex === -1 || currentIndex >= validRows.length - 1}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>다음 품목</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveMatchRowId(null)}
                            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer ml-1"
                          >
                            검수창 닫기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* 모달 푸터 (TAB 1인 경우에는 본문 높이를 최대화) */}
        {activeTab !== 'EFFICACY' && (
          <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
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
        )}
      </div>
    </div>
  );
};
