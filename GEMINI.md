# 의약품 관리 시스템 (PharmAssist) 프로젝트 규칙

## 1. 일반의약품(OTC) 원료약품 및 분량 / 환산성분량(성분정보) 규칙

사용자가 나중에 **"일반의약품 규칙이 뭐였지?"**, **"환산성분량 규칙 알려줘"**, 또는 **"의약품안전나라 API / 웹페이지 수집 규칙"**을 물어보면 반드시 아래 내용을 기준으로 설명하고 코드에 적용한다.

### 1.1 국내 제조 vs 수입제품 환산성분량 표시 기준
- **국내 제조 일반의약품**: 염(Salt)·수화물·배산체·제피성분 등으로 원료가 투입된 경우, 유효성분(주성분) 기준의 **환산성분량(예: `푸르설티아민(으)로서 25 밀리그램`, `아스코르브산(으)로서 600 밀리그램`, `셀레늄(으)로서 50 마이크로그램`)**을 반드시 표시해야 한다.
- **수입제품(수입 의약품) 예외**: 수입제품은 환산성분량을 적지 않아도 되는 예외 대상이다.
  - 판별 기준: `MAKE_MATERIAL_FLAG`(또는 `makeMaterialFlag`)에 `'수입'`이 포함되거나, 원료명/제조원 표기에 수입품 조건이 명시된 경우 환산성분량 자동 보완 대상에서 제외한다.

### 1.2 공공데이터포털 공식 API vs 의약품안전나라 웹페이지(`nedrug`) 데이터 차이
1. **공공데이터포털 공식 허가정보 API (`DrugPrdtPrmsnInfoService08` - `getDrugPrdtPrmsnDtlInq08`)**
   - `MATERIAL_NAME` (원료약품 및 분량) 필드에 `|성분정보 : |` 항목이 존재하지만, **식약처 DB → 공공데이터포털 API 동기화 과정에서 세부 환산 문구가 누락되어 빈칸(`|성분정보 : |`)으로 내려오는 일반의약품이 다수 존재**한다 (예: `200400325` 아로나민씨플러스정, `202600394` 아로나민씨플러스프리미엄정 등).
2. **식약처 의약품안전나라 웹 상세페이지 (`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=...`)**
   - HTML 내부 스크립트의 `var aasda = {"data":[...]};` JSON 객체 안에 실제 식약처 원문 데이터가 모두 들어 있다.
   - 주요 필드:
     - `ingrName`: 성분명 (예: `푸르설티아민염산염`)
     - `ingrTotqy`: 분량 (예: `27.28`)
     - `ingrUnitName`: 단위 (예: `밀리그램`)
     - `ingrStdName`: 규격 (예: `KP`)
     - `ingrInfo`: **성분정보 / 환산성분량 원문** (예: `푸르설티아민(으)로서 25 밀리그램`)
     - `totqyCont`: 총량 정보 (예: `1정(750mg) 중`)

### 1.3 데이터 수집 및 저장 아키텍처 원칙 (4대 원칙)
공식 API가 아닌 `nedrug.mfds.go.kr` 웹페이지를 읽어오는 방식을 안전하고 지속 가능하게 유지하기 위해 다음 4가지 원칙을 준수한다.

1. **공식 API 우선 호출 + 누락된 항목만 `nedrug` 원문으로 보완 (환산성분량 빈칸은 누락에서 제외 & 임의 조작 금지)**
   - 공공데이터포털 공식 API(`getDrugPrdtPrmsnDtlInq08`)를 최우선으로 호출한다.
   - **환산성분량(`성분정보`)이 빈칸인 것은 누락이 아니라 원래 빈칸인 경우가 대부분이므로**, 환산성분량이 비어 있다는 이유로 `nedrug`를 호출하거나 자체 계산(`inferDrugIngredientConversion`)으로 임의로 채우지 않고 **공식 API 원문 그대로** 사용한다.
   - `nedrug` 원문 보완은 공식 API에서 **효능·효과(`EE_DOC_DATA`), 용법·용량(`UD_DOC_DATA`), 사용상의 주의사항(`NB_DOC_DATA`), 또는 원료약품(`MATERIAL_NAME`) 필드 자체가 `null`/빈값으로 누락된 경우**(예: 큐업액 `200301506`)에만 수행한다.
2. **최초 1회 수집 후 DB/캐시 영구 저장 (Fetch-Once & Persist)**
   - 품목 상세를 열 때마다 매번 식약처 웹페이지를 실시간 스크래핑하지 않는다.
   - 의약품을 검색/등록할 때 1회 수집한 원료약품 및 분량(`rawIngredientsText`)을 **Firestore(`products` 컬렉션) 및 브라우저 로컬 캐시(`localStorage`: `pharmassist_nedrug_rows_cache_v1`)**에 저장하여 재사용한다.
3. **무료 공용 CORS 프록시 의존 배제 & 자체 서버 프록시 사용**
   - `corsproxy.io`( 유료화/403 차단), `api.allorigins.win`(520 오류) 등 불안정한 서드파티 무료 프록시에 의존하지 않는다.
   - 개발 환경에서는 Vite 프록시(`/api/nedrug`), 배포 환경에서는 **Firebase Cloud Functions (`nedrugItemDetailProxy`) + Firebase Hosting Rewrite (`/api/nedrug-proxy`)** 자체 서버 프록시를 통해 식약처 서버와 직접 통신한다.
4. **식약처 HTML 구조 변경 대비 파서 방어 설계**
   - `var aasda = {...}` 정규식 파싱을 기본으로 하되, 페이지 개편 시에도 서비스가 중단되지 않도록 예외 처리 및 공식 API(`MATERIAL_NAME`) Fallback 구조를 유지한다.

---

## 2. 관련 주요 파일 위치
- [publicDataService.ts](file:///c:/drug_storage/src/services/publicDataService.ts): 공공데이터포털 API 호출 및 `fetchNedrugIngredientsText` (`nedrug` 원문 파싱 + 로컬 캐시)
- [functions/src/index.ts](file:///c:/drug_storage/functions/src/index.ts): Firebase Cloud Function `nedrugItemDetailProxy` (식약처 상세페이지 서버 프록시)
- [firebase.json](file:///c:/drug_storage/firebase.json): `/api/nedrug-proxy` Hosting Rewrite 설정
- [vite.config.ts](file:///c:/drug_storage/vite.config.ts): 로컬 개발용 `/api/nedrug` 프록시 설정
- [innMapper.ts](file:///c:/drug_storage/src/utils/innMapper.ts): `inferDrugIngredientConversion` (비상용 Fallback 코드 보존)
- [lactmedMonographDb.ts](file:///c:/drug_storage/src/features/maternal-safety/data/lactmedMonographDb.ts): NIH LactMed 공식 모노그래프 및 한국어 전문 임상 번역 DB

---

## 3. NIH LactMed 해외 임상 데이터 번역 및 다국어 제공 원칙 (어설픈 정규식 혼용 번역 금지)

사용자가 나중에 **"LactMed 번역 규칙이 뭐였지?"**, **"RID 번역 규칙 알려줘"**, 또는 **"영문 원문과 번역본 제공 원칙"**을 물어보면 반드시 아래 원칙을 기준으로 코드를 작성하고 유지한다.

### 3.1 어설픈 정규식 단어 치환(영한 혼용 텍스트) 원천 금지
- 정규식(Regex)을 이용해 일부 영어 단어 몇 개만 한국어로 바꾸고 나머지를 영어 문장 그대로 방치하여, `"완전 모유 수유아는 daily dosages of... 모체 체중 보정 용량s were..."` 처럼 영문과 한글이 흉측하게 뒤섞인 텍스트를 `[한국어 번역본]` 화면에 절대 노출하지 않는다.
- `[한국어 번역본]`으로 표시되는 모든 영역(수유 중 사용 요약, 모유 농도, 영아 혈중 농도, 영아 이상반응, 수유 영향 등)은 문맥과 문법이 온전한 **100% 순수 한국어 임상 문장**으로 렌더링되어야 한다.

### 3.2 탭(Tab) 기반의 번역본과 영문 원문 완전 분리 원칙
- 모든 LactMed 상세 정보 영역은 `[한국어 번역본]`과 `[English 원문]` 탭(또는 전환 스위치)을 통해 명확히 분리하여 제공한다.
  - **`[한국어 번역본]` 탭**: 의·약 전문가 및 일반 사용자가 즉시 이해할 수 있는 체계적인 한국어 전문 번역 및 임상 핵심 해설을 제공한다.
  - **`[English 원문]` 탭**: 미국 국립보건원(NIH) LactMed 공식 영문 원문 전문을 단락별로 보존하여 제공함으로써 해외 공신력 있는 원문을 즉시 대조할 수 있도록 한다.

### 3.3 상대적 영아 용량(RID - Relative Infant Dose) 한국어 해석 원칙
- RID 영역에 번역 없이 영문 원문 문장(`[원문 발췌] The estimated weight-adjusted...`)만 덜렁 노출하는 것을 금지한다.
- **필수 제공 형식**:
  1. **한국어 요약**: 추정 RID 수치(예: `0.05% ~ 0.06%`)와 모체 투여량 대비 영아 흡수율 수준(예: `모체 투여량의 0.1% 미만`)을 명확히 명시한다.
  2. **안전성 평가 기준 안내**: 세계보건기구(WHO) 및 임상 안전 기준치인 `10% 미만` 충족 여부를 한글로 직관적으로 표시한다.
  3. **원문 발췌**: 원문 텍스트는 `[English 원문]` 모드 또는 별도의 원문 대조 블록에서만 제시한다.

### 3.4 로컬 데이터베이스 5대 임상 영역 완비 원칙
`lactmedMonographDb.ts`에 등록되는 모든 약물은 다음 5대 임상 필드에 대해 검증된 한국어 번역 텍스트를 반드시 구비해야 한다:
1. `summaryKorean`: 수유 중 사용 요약 한국어 전문 (소제목별 체계적 구성)
2. `ridKoreanSummary`: 상대적 영아 용량(RID) 한국어 수치 및 안전 기준 해설
3. `infantAdverseEffectsKorean`: 수유 노출 영아에게 보고된 이상반응 임상 관찰 한국어 번역
4. `drugLevelsKorean`: 모체 모유 내 약물 농도 및 영아 혈중 농도 한국어 번역
5. `lactationEffectsKorean`: 프로락틴 및 젖분비(모유량) 영향 한국어 번역
