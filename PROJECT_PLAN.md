# 약국용 임신·수유부 약물 안전성 대시보드 개발 계획서 (`PROJECT_PLAN.md`)

## 1. 프로젝트 개요 및 핵심 원칙

### 1.1 프로젝트 목표
기존 **PharmAssist Pro (약국 영양제 & 일반의약품 상담 카탈로그)** 웹 애플리케이션을 확장하여, 우상단 모드 전환 버튼을 통해 **임신부·수유부 처방/복약 적정성 및 약물 안전성 대시보드**로 즉시 전환할 수 있는 전문가용 약사 업무 지원 시스템을 구축한다.

약사가 **국내 의약품 제품명(단일제·복합제)**, **한글 성분명**, 또는 **영문 성분명(INN)**을 입력하면 임신 주수(1·2·3삼분기 및 특정 주수)와 수유 상황(영아 연령, 미숙아 여부)에 따른 약물 안전성 근거를 신속하고 정확하게 확인할 수 있도록 지원한다.

### 1.2 절대 준수 원칙 (Evidence-Based & Zero Hallucination)
1. **AI 임의 판단 금지**: AI나 로직이 근거 없는 임신부 금기 등급, RID(Relative Infant Dose) 수치, 안전성 결론을 임의로 추측·생성하지 않는다.
2. **미확인 정보의 투명한 표시**: 검증된 원문에서 확인되지 않은 수치는 반드시 `'확인되지 않음'` 또는 `'근거 부족'`으로 표시한다.
3. **국내 규제(DUR/허가사항)와 해외 임상 근거의 분리 표시**: 법적·행정적 방어 기준이 강한 **국내 식약처/심평원 DUR 임부금기 및 허가사항**과 실제 임상 노출 코호트 연구를 반영한 **해외 전문기관(LactMed, MotherToBaby, BUMPS/UKTIS, FDA PLLR)** 평가를 분리하여 나란히 비교 표시한다.
4. **복합제 전 성분 개별 분리 평가**: 종합감기약·복합진통제 등 복합제는 모든 유효성분을 개별 분리하여 각각의 안전성을 평가하고, 가장 주의가 필요한 성분(Worst-case ingredient)을 기준으로 종합 경고를 제공한다.
5. **모든 데이터의 원문 출처 및 검증일 기록**: 모든 평가 카드와 수치 옆에 원문 출처명, 문헌/DB 고유 번호(NBK ID, 품목기준코드 등), 원문 URL, 수집/검증일을 명시한다.

---

## 2. 기술 스택 및 기존 시스템 통합 아키텍처

### 2.1 기술 스택 선정 및 기존 아키텍처 유지 사유
초기 기획안의 `Next.js + Supabase + Vercel` 대신, 현재 운영 중인 **PharmAssist Pro**의 기술 스택과 서버/배포 파이프라인을 100% 그대로 유지한다.

| 영역 | 채택 기술 스택 | 선택 사유 및 기존 자산 활용 이점 |
| :--- | :--- | :--- |
| **프론트엔드 프레임워크** | **React 19 + Vite 8 + TypeScript 5.7** | 단일 페이지 앱(SPA) 구조로 우상단 버튼 클릭 시 페이지 새로고침 없이 즉각적인 화면 전환 가능 |
| **스타일링 & 아이콘** | **Tailwind CSS v4 + Lucide React** | 기존 대시보드와 일관된 고해상도 클리니컬 UI 및 반응형(데스크톱/모바일) 레이아웃 제공 |
| **상태 관리** | **Zustand 5** | 기존 `useProductStore`와 분리된 `useMaternalSafetyStore`를 통해 검색 이력, 임신 주수/영아 연령 필터, 비교함 상태 독립 관리 |
| **데이터베이스 & 캐시** | **Firebase Firestore + Local Verified Seed DB** | 5대 테이블 구조를 Firestore 컬렉션 및 타입 안전(Type-safe) 검증 데이터셋으로 구성하고 실시간 동기화 지원 |
| **백엔드 프록시 & 배포** | **Firebase Cloud Functions (`asia-northeast3`) + Firebase Hosting** | 기존 `nedrugItemDetailProxy` 및 공공데이터포털 API 연동을 그대로 재사용하며 단일 `npm run deploy`로 통합 배포 |

### 2.2 폴더 및 모듈 구조 설계
기존 영양제 대시보드 코드(`src/components/`)와 충돌하거나 복잡도를 높이지 않도록 `src/features/maternal-safety/` 하위 모듈로 완전 격리한다.

```text
c:\drug_storage\
├── PROJECT_PLAN.md                         # 전체 아키텍처 및 단계별 개발 계획서
├── DATA_SOURCES.md                         # 국내·외 8대 데이터 소스 API/라이선스/실제 검증 보고서
├── DATABASE_SCHEMA.md                      # 5대 핵심 테이블 스키마 및 제품-성분 매핑 설계서
├── DEVELOPMENT_LOG.md                      # 단계별 개발 및 데이터 검증 로그
├── TEST_REPORT.md                          # 브라우저 검증 및 시나리오 테스트 리포트
└── src/
    ├── components/
    │   └── Header.tsx                      # 우상단 [영양제·OTC 카탈로그 ↔ 임신·수유부 약물 안전성] 모드 전환 버튼 추가
    ├── features/
    │   └── maternal-safety/
    │       ├── types/
    │       │   └── maternalSafety.ts       # 5대 테이블(DrugMaster, PregnancySafety, LactationSafety, EvidenceSource, IngredientMapping) 타입 정의
    │       ├── data/
    │       │   └── verifiedMaternalDb.ts   # 5대 핵심 MVP 성분 + 복합제 연동용 보조 성분의 100% 원문 검증 마스터 데이터
    │       ├── services/
    │       │   └── maternalSearchService.ts # 국내 제품명 실시간 검색(식약처 API/nedrug) ➔ 복합제 성분 분리 ➔ INN 매칭 및 openFDA/국내 허가사항 연동
    │       ├── stores/
    │       │   └── useMaternalStore.ts     # 임신 주수, 삼분기, 수유 영아 연령, 미숙아 여부, 최근 검색어, 약물 비교함 상태 관리
    │       └── components/
    │           ├── MaternalSafetyDashboard.tsx     # 메인 대시보드 컨테이너 (상단 검색/필터 + 중앙 탭 뷰 + 하단 출처/검증 상태)
    │           ├── PregnancyConditionBar.tsx       # 임신 1·2·3삼분기 및 특정 임신 주수(1~40주) 슬라이더/선택 바
    │           ├── LactationConditionBar.tsx       # 수유 영아 연령(신생아, 1~6개월, 6개월 이상) 및 미숙아 여부 선택 바 + RID 계산기 팝오버
    │           ├── CombinationDrugAnalyzer.tsx     # 복합제 전 성분 분리 및 개별 성분 안전성 요약 배지
    │           ├── PregnancySafetyDetailCard.tsx   # 임신 주수별 위험(기형, 유산, 동맥관 폐쇄, 양수과소증 등) + 국내 DUR vs 해외 근거 비교
    │           ├── LactationSafetyDetailCard.tsx   # 모유 농도, RID(%), 반감기, 활성 대사체, 영아 부작용, 수유 지속/중단 근거 카드
    │           ├── AlternativeDrugComparison.tsx   # 동일 효능군 대체 약물 비교 테이블 및 근거 수준 비교
    │           └── EvidenceSourcesPanel.tsx        # 원문 논문/공식 DB 링크, 연구 설계, 수집일/최종 검증일 표시 패널
```

---

## 3. 국내 의약품 제품명 ↔ 영문 성분명(INN) 매칭 및 복합제 분석 전략

약국 현장에서는 성분명(`Acetaminophen`)뿐만 아니라 국내 제품명(`타이레놀정500밀리그람`, `부루펜정`, `판콜에스내복액`, `지르텍정`, `페니라민정`, `아목시실린캡슐`)으로 검색하는 경우가 많으므로 3단계 파이프라인으로 매칭한다.

1. **1단계: 통합 검색어 판별 (제품명 vs 한글 성분명 vs 영문 INN)**
   - 입력값이 영문 INN(`Acetaminophen`, `Ibuprofen` 등) 또는 한글 성분명(`아세트아미노펜`, `이부프로펜`, `세티리진`, `클로르페니라민`, `아목시실린`)과 일치하면 즉시 성분 안전성 카드로 직행한다.
   - 국내 제품명이 입력되면 내장 의약품 마스터 DB 및 **식약처 의약품 제품허가 API (`getDrugPrdtPrmsnInq08` / `getDrugPrdtPrmsnDtlInq08`)**를 실시간 호출하여 해당 제품의 품목기준코드(`ITEM_SEQ`), 제형, 투여경로, 원료약품(`MATERIAL_NAME`), 사용상의 주의사항(`NB_DOC_DATA`)을 가져온다.
2. **2단계: 복합제 개별 유효성분 파싱 (`parseRawIngredientString` + `innMapper.ts`)**
   - 단일제(예: `타이레놀정500밀리그람` ➔ `Acetaminophen 500mg`)는 단일 성분으로 매칭한다.
   - 복합제(예: `타이레놀콜드-에스정`, `판콜에스내복액`, `게보린정` 등)는 포함된 모든 유효성분을 개별 분리하여 각 성분의 영문 표준 INN으로 변환한다.
3. **3단계: 성분별 안전성 매칭 및 미등록 성분 정직한 표시**
   - 분리된 각 성분을 검증된 안전성 DB(`PregnancySafety`, `LactationSafety`)와 매칭한다.
   - 복합제 중 아직 해외 임상 요약이 등록되지 않은 성분이 포함되어 있다면, 전체 제품을 임의로 '안전' 판정하지 않고 **"일부 성분 임상 근거 미확보 (식약처 허가사항 원문 확인 필수)"** 경고를 명시한다.

---

## 4. 초기 MVP 핵심 5대 성분 선정 및 확장 계획

### 4.1 MVP 핵심 5대 성분
약국 다빈도 문의 약물 중 진통해열제(중추성 vs NSAIDs), 항히스타민제(1세대 vs 2세대), 항생제(페니실린계)를 대표하는 5개 핵심 성분을 1차 MVP 대상으로 선정하여 원문 검증을 완료한다.

1. **Acetaminophen (아세트아미노펜)** — 임신 전 기간 및 수유 중 1차 선택 해열진통제
2. **Ibuprofen (이부프로펜)** — 임신 20주 이후 양수과소증 / 30주(3삼분기) 이후 태아 동맥관 조기폐쇄 위험이 있는 대표 NSAID (반면 수유 중에는 RID가 극히 낮아 선호되는 대표적 대조 사례)
3. **Cetirizine (세티리진)** — 임신·수유 중 다빈도 2세대 항히스타민제
4. **Chlorpheniramine (클로르페니라민)** — 종합감기약에 다수 포함되는 1세대 항히스타민제 (수유 중 진정 작용 및 모유 분비 감소 주의)
5. **Amoxicillin (아목시실린)** — 임신·수유 중 다빈도 처방되는 페니실린계 베타락탐 항생제

---

## 5. 단계별 개발 일정 및 완료 조건

- **Phase 1: 데이터 소스 조사 및 라이선스/API 검증** (`DATA_SOURCES.md` 작성 완료)
- **Phase 2: 5대 테이블 데이터베이스 스키마 설계** (`DATABASE_SCHEMA.md` 및 TypeScript 인터페이스 설계 완료)
- **Phase 3: 5대 핵심 성분 원문 검증 데이터 구축** (식약처 허가사항/DUR, LactMed, MotherToBaby, BUMPS, FDA PLLR 원문 기반 시드 DB 구축)
- **Phase 4: 우상단 화면 전환 버튼 및 통합 검색·조건 필터 구현** (임신 삼분기/주수 슬라이더, 수유 영아 연령/미숙아 필터)
- **Phase 5: 임신부·수유부 상세 안전성 화면 구현** (5단계 자체 요약 체계, 국내 DUR vs 해외 근거 분리 뷰, RID 계산 공식 및 주의문구)
- **Phase 6: 복합제 개별 성분 분석 및 대체약 비교 화면 구현**
- **Phase 7: 브라우저 검증 및 테스트 리포트 작성** (`TEST_REPORT.md` 기록)
