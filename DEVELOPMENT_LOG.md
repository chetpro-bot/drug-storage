# 개발 및 데이터 검증 로그 (`DEVELOPMENT_LOG.md`)

## [2026-11-04] Phase 1 & Phase 2: 데이터 소스 조사 및 5대 테이블 스키마 설계 완료

### 1. 수행 내역
- **아키텍처 결정**: 기존 `PharmAssist Pro` (React 19 + Vite + TypeScript + Tailwind CSS + Zustand + Firebase) 대시보드와 모듈형으로 통합하되, 우상단 전환 버튼을 통해 **[💊 영양제·OTC 카탈로그]** ↔ **[🤰 임신·수유부 약물 안전성]** 화면을 즉시 전환하도록 설계.
- **외부 API 및 공식 문서 실증 테스트 완료**:
  - 식약처 `DrugPrdtPrmsnInfoService08` (`getDrugPrdtPrmsnInq08`, `getDrugPrdtPrmsnDtlInq08`) HTTP 200 응답 및 `NB_DOC_DATA` 내 임부·수유부 허가사항 추출 확인.
  - 미국 FDA `openFDA Drug Label API` (`api.fda.gov/drug/label.json`) HTTP 200 응답 및 5대 성분 `pregnancy` / `lactation` 필드 확인.
  - 미국 NIH `NCBI Bookshelf E-utilities API`를 통해 5대 핵심 성분의 공식 LactMed 및 MotherToBaby `NBK` 문서 번호 및 원문 데이터 확보:
    - `Acetaminophen`: LactMed `NBK501194`, MotherToBaby `NBK582555`
    - `Ibuprofen`: LactMed `NBK500986`, MotherToBaby `NBK582759`
    - `Cetirizine`: LactMed `NBK501509`, MotherToBaby `NBK582627`
    - `Chlorpheniramine`: LactMed `NBK501530`, MotherToBaby `NBK582633`
    - `Amoxicillin`: LactMed `NBK500887`, MotherToBaby `NBK582571`
- **미확인 데이터 처리 검증**:
  - `Chlorpheniramine`의 모유 내 약물 농도 및 RID(%)는 LactMed 원문(`NBK501530`)에서도 실제 모유 농도 측정 연구가 존재하지 않음을 확인 ➔ 임의 수치를 생성하지 않고 `'확인되지 않음 (원문 내 모유 농도 미측정)'` 및 `ridNumericMin: null`로 엄격히 처리.

### 2. 다음 단계 (Phase 3 ~ Phase 7)
- **Phase 3**: 5대 핵심 성분(`Acetaminophen`, `Ibuprofen`, `Cetirizine`, `Chlorpheniramine`, `Amoxicillin`) 및 대표 단일제·복합제(타이레놀정500mg, 부루펜정400mg, 지르텍정, 페니라민정, 아목시실린캡슐, 판콜에스내복액, 타이레놀콜드-에스정 등) 시드 데이터베이스 구축 (`src/features/maternal-safety/data/verifiedMaternalDb.ts`).
- **Phase 4**: 우상단 화면 전환 버튼(`Header.tsx`) 및 통합 검색(국내 제품명 실시간 식약처 연동 + 영문/한글 성분명 검색), 임신 주수(1·2·3삼분기 및 1~40주 슬라이더)·수유 영아 연령 필터 구현.
- **Phase 5 & 6**: 임신부·수유부 상세 카드, RID 공식 계산기, 국내 DUR vs 해외 임상 근거 분리 뷰, 복합제 전 성분 개별 분석기, 대체약 비교 테이블, 원문 출처 패널 구현.
- **Phase 7**: 빌드/타입 검증 및 실제 화면 테스트 후 `TEST_REPORT.md` 작성.


---

## [2026-11-04] Phase 3 ~ Phase 7: MVP 5대 핵심 성분 DB 및 임신·수유부 대시보드 구현·검증 완료

### 1. 구현 완료 파일 목록
- [maternalSafety.ts](file:///c:/drug_storage/src/features/maternal-safety/types/maternalSafety.ts): 5대 테이블(`DrugMaster`, `PregnancySafety`, `LactationSafety`, `EvidenceSources`, `IngredientMapping`) 및 5단계 안전성 요약 타입 정의
- [verifiedMaternalDb.ts](file:///c:/drug_storage/src/features/maternal-safety/data/verifiedMaternalDb.ts): 5대 핵심 성분(`Acetaminophen`, `Ibuprofen`, `Cetirizine`, `Chlorpheniramine`, `Amoxicillin`) 및 대표 단일·복합제 원문 검증 데이터베이스
- [maternalSearchService.ts](file:///c:/drug_storage/src/features/maternal-safety/services/maternalSearchService.ts): 국내 제품명(식약처 실시간 API 연동 포함) ➔ 복합제 성분 분리 ➔ 5대 핵심 성분 매칭 및 실시간 `openFDA` 라벨 조회 서비스
- [useMaternalStore.ts](file:///c:/drug_storage/src/features/maternal-safety/stores/useMaternalStore.ts): 우상단 모드 전환(`NUTRITION_CATALOG` ↔ `MATERNAL_SAFETY`), 임신 주수(1~40주)/삼분기, 수유 영아 연령/미숙아 필터, 약물 비교 상태 관리
- [PregnancySafetyView.tsx](file:///c:/drug_storage/src/features/maternal-safety/components/PregnancySafetyView.tsx): 임신 삼분기·주수별 동적 위험도 평가, 국내 DUR/허가사항 vs 해외 전문기관(MotherToBaby, BUMPS, FDA PLLR) 분리 비교 뷰
- [LactationSafetyView.tsx](file:///c:/drug_storage/src/features/maternal-safety/components/LactationSafetyView.tsx): 수유 영아 연령·미숙아별 평가, 모유 농도·RID·반감기·활성 대사체 카드 및 RID 공식 계산기
- [CombinationAndCompareView.tsx](file:///c:/drug_storage/src/features/maternal-safety/components/CombinationAndCompareView.tsx): 복합제 전 성분 개별 분리 분석기 및 핵심 성분 다차원 비교 매트릭스
- [EvidenceSourcesPanel.tsx](file:///c:/drug_storage/src/features/maternal-safety/components/EvidenceSourcesPanel.tsx): 원문 근거 출처 상세 카드 및 미국 FDA `openFDA` 실시간 원문 조회 패널
- [MaternalSafetyDashboard.tsx](file:///c:/drug_storage/src/features/maternal-safety/components/MaternalSafetyDashboard.tsx): 임신·수유부 약물 안전성 메인 대시보드
- [Header.tsx](file:///c:/drug_storage/src/components/Header.tsx) & [App.tsx](file:///c:/drug_storage/src/App.tsx): 우상단 **[영양제·OTC 대시보드 ↔ 임신·수유부 안전성]** 전환 스위치 연동

### 2. 빌드 및 검증 결과
- `npm run build` (`tsc && vite build`) 통과 (오류 0건).
- 검증 상세 내역은 [TEST_REPORT.md](file:///c:/drug_storage/TEST_REPORT.md)에 기록 완료.
