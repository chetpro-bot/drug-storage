# 임신·수유부 약물 안전성 데이터베이스 스키마 설계서 (`DATABASE_SCHEMA.md`)

## 1. 데이터베이스 설계 원칙

1. **제품(Product)과 성분(Ingredient)의 완전 분리**:
   - 국내 의약품은 동일 성분이라도 수백 개의 제네릭 제품과 복합제 제품이 존재한다.
   - 따라서 임상 안전성 근거(`Pregnancy Safety`, `Lactation Safety`, `Evidence Sources`)는 **성분 ID (`ingredientId` + 투여경로 `route`)** 단위로 정규화하여 관리하고, 국내 제품(`Drug Master`)은 `Ingredient Mapping` 테이블을 통해 1:N 구조로 연결한다.
2. **복합제(Combination Drug) 개별 성분 평가 지원**:
   - 복합제는 포함된 모든 성분을 `Ingredient Mapping` 행으로 쪼개어 각 성분의 임신 주수별·수유 연령별 안전성을 독립 평가한다.
   - 복합제의 전체 안전성 요약은 **가장 주의도가 높은 성분(Worst-case safety level)**을 기준으로 표시하되, 단 1개 성분이라도 안전성 근거가 등록되지 않았다면 임의로 안전 판정을 내리지 않고 `'일부 성분 근거 미확보'` 경고를 병기한다.
3. **'확인되지 않음'의 명시적 구분**:
   - 모유 농도, 영아 혈중 농도, RID(%) 등 원문에서 측정된 적 없는 데이터는 `null`과 함께 `status: 'UNVERIFIED_IN_SOURCE'` 및 표시 문자열 `'확인되지 않음'`으로 저장하여 숫자 `0`이나 임의 추정치와 절대 혼동되지 않도록 설계한다.

---

## 2. 5대 핵심 테이블 상세 스키마

### ① `drug_master` (국내 의약품 마스터 테이블)
국내 허가 의약품의 제품 단위 기본 정보 및 국내 허가사항 원문을 관리한다. 식약처 실시간 허가 API(`DrugPrdtPrmsnInfoService08`) 조회 결과와도 1:1 호환된다.

| 필드명 | 타입 | 필수 | 설명 및 예시 |
| :--- | :--- | :---: | :--- |
| `id` | `string` (PK) | Y | 품목 고유 ID (예: `'mfds_202106092'`, `'drug_tylenol_500'`) |
| `itemSeq` | `string` | Y | 식약처 품목기준코드 9자리 (예: `'202106092'`) |
| `koreanProductName` | `string` | Y | 국내 제품명 (예: `'타이레놀정500밀리그람'`, `'판콜에스내복액'`) |
| `englishIngredientsSummary` | `string` | Y | 영문 성분명 요약 (예: `'Acetaminophen'`, `'Acetaminophen / Chlorpheniramine Maleate / ...'`) |
| `strengthText` | `string` | Y | 함량 표기 (예: `'500mg'`, `'400mg'`) |
| `dosageForm` | `string` | Y | 제형 (예: `'필름코팅정'`, `'연질캡슐'`, `'경질캡슐'`, `'내복액'`) |
| `route` | `'ORAL' \| 'TOPICAL' \| 'INJECTION' \| 'INHALATION' \| 'OPHTHALMIC'` | Y | 투여 경로 (동일 성분이라도 경구 vs 외용/점안 노출량 구분) |
| `manufacturer` | `string` | Y | 제조/수입사 (예: `'한국존슨앤드존슨판매(유)'`, `'삼일제약(주)'`) |
| `isCombination` | `boolean` | Y | 복합제 여부 (`true`: 2개 이상 유효성분 복합제, `false`: 단일제) |
| `mfdsPregnancyPrecautionText` | `string` | Y | 국내 식약처 허가사항 내 '임부 및 수유부에 대한 투여' 원문 |
| `durPregnancyTabooGrade` | `'GRADE_1' \| 'GRADE_2' \| 'NONE'` | Y | 국내 심평원/식약처 DUR 임부금기 등급 (`1등급`: 원칙적 금기, `2등급`: 조건부 금기, `NONE`: 비금기) |
| `durPregnancyTabooDetail` | `string \| null` | N | 식약처 공고 임부금기 상세 사유 원문 |
| `productSourceUrl` | `string` | Y | 제품별 공식 출처 URL (`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=...`) |
| `updatedAt` | `string` (ISO) | Y | 데이터 수집 및 최종 동기화 일자 |

---

### ② `pregnancy_safety` (임신부 약물 안전성 테이블)
성분 및 투여 경로별 임신 주수(1·2·3삼분기 및 특정 주수)에 따른 태아·산모 안전성 근거를 저장한다.

| 필드명 | 타입 | 필수 | 설명 및 예시 |
| :--- | :--- | :---: | :--- |
| `ingredientId` | `string` (PK/FK) | Y | 표준 성분 고유 ID (예: `'ing_acetaminophen'`, `'ing_ibuprofen'`) |
| `englishInn` | `string` | Y | 영문 표준 성분명 (예: `'Acetaminophen'`) |
| `koreanIngrName` | `string` | Y | 국내 표준 성분명 (예: `'아세트아미노펜'`) |
| `route` | `string` | Y | 기준 투여 경로 (예: `'경구 (Oral)'`) |
| `trimester1Level` | `SafetySummaryLevel` | Y | 임신 1삼분기(1~13주) 자체 5단계 요약 등급 |
| `trimester2Level` | `SafetySummaryLevel` | Y | 임신 2삼분기(14~27주) 자체 5단계 요약 등급 |
| `trimester3Level` | `SafetySummaryLevel` | Y | 임신 3삼분기(28~40주) 자체 5단계 요약 등급 |
| `trimester1Summary` | `string` | Y | 1삼분기 평가 상세 (기관형성기 선천성 기형 및 유산 근거) |
| `trimester2Summary` | `string` | Y | 2삼분기 평가 상세 (20주 전후 태아 신장 기능/양수량 등 주수별 평가) |
| `trimester3Summary` | `string` | Y | 3삼분기 평가 상세 (30주 이후 동맥관 조기폐쇄, 분만 지연, 신생아 금단/진정 등) |
| `weekSpecificRisks` | `WeekSpecificRiskWindow[]` | Y | 특정 임신 주수 구간별 위험 알림 배열 (`startWeek`, `endWeek`, `level`, `riskTitle`, `clinicalDetail`) |
| `congenitalMalformationData` | `string` | Y | 선천성 기형(Major Congenital Malformations) 관련 코호트·역학 연구 요약 |
| `miscarriageData` | `string` | Y | 자연 유산(Spontaneous Abortion) 관련 연구 요약 |
| `fetalToxicityData` | `string` | Y | 태아 독성 전반 요약 |
| `fetalRenalRisk` | `string` | Y | 태아 신장 기능 저하 및 양수과소증(Oligohydramnios) 관련 위험 |
| `fetalDuctusArteriosusRisk` | `string` | Y | 태아 동맥관 조기 폐쇄(Premature Closure of Ductus Arteriosus) 및 지속성 폐고혈압 위험 |
| `maternalRisk` | `string` | Y | 산모 위험 (산후 출혈, 분만 지연, 간독성 등) |
| `domesticDurGrade` | `'1등급' \| '2등급' \| '임부금기 미지정'` | Y | 국내 심평원/식약처 DUR 임부금기 등급 |
| `domesticPermitSummary` | `string` | Y | 국내 식약처 허가사항(임부 투여 조항) 요약 |
| `internationalAgencySummaries` | `AgencyEvaluationEntry[]` | Y | 해외 전문기관별 평가 (`MotherToBaby`, `BUMPS/UKTIS`, `FDA PLLR` 각각의 원문 요약 및 국내 기준과의 차이점) |
| `clinicalRecommendation` | `string` | Y | 약사 복약상담용 임상 권고 요약 |
| `evidenceQualityLevel` | `'HIGH' \| 'MODERATE' \| 'LOW' \| 'INSUFFICIENT'` | Y | 임상 근거 수준 (대규모 인간 코호트 다수 vs 소규모/증례 보고) |
| `alternativeIngredientIds` | `string[]` | Y | 동일 효능군 내 비교/대체 검토 성분 ID 목록 |
| `evidenceSourceIds` | `string[]` (FK) | Y | `evidence_sources` 테이블 참조 ID 배열 |

---

### ③ `lactation_safety` (수유부 약물 안전성 테이블)
모유 이행, RID(%), 반감기, 활성 대사체 및 수유 영아 연령/미숙아 여부에 따른 안전성 근거를 저장한다.

| 필드명 | 타입 | 필수 | 설명 및 예시 |
| :--- | :--- | :---: | :--- |
| `ingredientId` | `string` (PK/FK) | Y | 표준 성분 고유 ID |
| `overallSafetyLevel` | `SafetySummaryLevel` | Y | 수유 중 기본(만기 정상 신생아/영아 기준) 5단계 안전성 요약 |
| `milkConcentrationText` | `string` | Y | 모유 내 약물 농도 원문 수치 또는 `'확인되지 않음'` |
| `infantSerumConcentrationText` | `string` | Y | 영아 혈중 농도 원문 수치 또는 `'확인되지 않음'` |
| `ridRangeText` | `string` | Y | RID(Relative Infant Dose) 범위 텍스트 (예: `'0.1% ~ 0.65% 미만'`, 미측정 시 `'확인되지 않음 (원문 미측정)'`) |
| `ridNumericMin` | `number \| null` | N | RID 최소값 (계산기/시각화용, 미확인 시 `null` — 절대 임의 생성 금지) |
| `ridNumericMax` | `number \| null` | N | RID 최대값 (미확인 시 `null`) |
| `estimatedInfantDoseMgPerKgDay` | `number \| null` | N | 문헌상 산모 상용량 복용 시 추정 영아 섭취량 (mg/kg/day, RID 공식 검증용) |
| `referenceMaternalDoseMgPerKgDay` | `number \| null` | N | 문헌 기준 산모 체중당 투여량 (mg/kg/day) |
| `halfLifeText` | `string` | Y | 약물 반감기 (성인 및 신생아/영아 반감기 비교, 미확인 시 `'확인되지 않음'`) |
| `activeMetabolitesText` | `string` | Y | 활성 대사체 유무 및 모유 이행 특성 |
| `infantAdverseEffects` | `string` | Y | 모유 수유 영아에서 보고된 부작용 및 관찰 포인트 |
| `ageConsiderations` | `Record<'NEONATE' \| 'INFANT_1_6M' \| 'INFANT_OVER_6M', { level: SafetySummaryLevel; note: string }>` | Y | 영아 연령대별(신생아 0~4주, 생후 1~6개월, 생후 6개월 이상) 안전성 및 고려사항 |
| `pretermInfantRisk` | `{ level: SafetySummaryLevel; note: string }` | Y | 미숙아(조산아) 수유 시 간/신장 미성숙에 따른 축적 위험 및 주의사항 |
| `continuationGuidance` | `string` | Y | 수유 지속 가능 여부 및 수유 중단/시간 조절 필요성 임상 근거 |
| `alternativeIngredientIds` | `string[]` | Y | 수유 중 선호되는 대체 약물 성분 ID 목록 |
| `evidenceSourceIds` | `string[]` (FK) | Y | `evidence_sources` 테이블 참조 ID 배열 |

---

### ④ `evidence_sources` (근거 문헌 및 데이터베이스 출처 테이블)
모든 임신·수유부 평가의 원문 출처, 연구 설계, 연구 대상/규모, 한계점 및 검증 일자를 기록한다.

| 필드명 | 타입 | 필수 | 설명 및 예시 |
| :--- | :--- | :---: | :--- |
| `sourceId` | `string` (PK) | Y | 출처 고유 ID (예: `'src_lactmed_acetaminophen_nbk501194'`) |
| `ingredientId` | `string` (FK) | Y | 연결된 성분 ID |
| `organizationName` | `'LactMed (NIH)' \| 'MotherToBaby (OTIS)' \| 'BUMPS / UKTIS' \| 'FDA PLLR' \| '식약처 의약품안전나라' \| '심평원/식약처 DUR'` | Y | 공식 기관/데이터베이스명 |
| `documentTitle` | `string` | Y | 문헌/모노그래프 제목 (예: `'Drugs and Lactation Database (LactMed®): Acetaminophen [NBK501194]'`) |
| `originalUrl` | `string` | Y | 클릭 시 즉시 원문으로 이동하는 공식 URL |
| `studyDesign` | `string` | Y | 연구 설계 (예: `'인간 모유 약동학 연구 및 임상 코호트 종합 모노그래프'`) |
| `studySubjects` | `string` | Y | 연구 대상 (예: `'수유부 및 모유 수유 영아 다수 코호트'`) |
| `studyScale` | `string` | Y | 연구 규모 (원문 명시 규모 또는 `'다기관 역학 코호트 종합'`) |
| `keyFindings` | `string` | Y | 핵심 연구 결과 요약 |
| `studyLimitations` | `string` | Y | 연구의 한계점 (예: `'자가 보고 노출 연구의 교란변수(산모 기저 발열/감염) 통제 한계'`) |
| `publishedDate` | `string` | Y | 출판/개정일 (원문 기준, 미상 시 `'원문 상시 개정판'`) |
| `collectedDate` | `string` | Y | 데이터 수집일 (`'2026-11-04'`) |
| `lastVerifiedDate` | `string` | Y | 약사/시스템 최종 원문 대조 검증일 (`'2026-11-04'`) |

---

### ⑤ `ingredient_mapping` (국내 제품 ↔ 성분 매핑 테이블)
국내 허가 제품(단일제·복합제)과 표준 영문 성분명(INN)을 연결하고 복합제 개별 성분을 관리한다.

| 필드명 | 타입 | 필수 | 설명 및 예시 |
| :--- | :--- | :---: | :--- |
| `mappingId` | `string` (PK) | Y | 매핑 고유 ID |
| `koreanProductName` | `string` | Y | 국내 제품명 (예: `'판콜에스내복액'`, `'타이레놀콜드-에스정'`) |
| `itemSeq` | `string` | Y | 식약처 품목기준코드 |
| `koreanIngredientName` | `string` | Y | 국내 원료 성분명 (예: `'클로르페니라민말레산염'`) |
| `englishIngredientName` | `string` | Y | 영문 표준 성분명 (예: `'Chlorpheniramine'`) |
| `ingredientId` | `string` (FK) | Y | `pregnancy_safety` / `lactation_safety` 연결 성분 ID (미등록 성분은 `'UNMAPPED_INGR'`) |
| `amountText` | `string` | Y | 1회/1단위당 함량 (예: `'2.5mg'`) |
| `dosageForm` | `string` | Y | 제형 (예: `'내복액'`, `'정제'`) |
| `route` | `'ORAL' \| 'TOPICAL' \| 'INJECTION' \| 'INHALATION' \| 'OPHTHALMIC'` | Y | 투여 경로 |
| `isCombination` | `boolean` | Y | 복합제 여부 |
| `verificationStatus` | `'VERIFIED' \| 'PARTIAL_UNMAPPED' \| 'AUTO_PARSED'` | Y | 매칭 검증 상태 |

---

## 3. 자체 5단계 안전성 요약 분류 체계 (`SafetySummaryLevel`)

공식 규제기관(FDA 구 ABCDX 등급 또는 국내 DUR 1·2등급)과 혼동하지 않도록, 대시보드 내 모든 등급 배지에는 **"자체 임상 근거 요약 체계"** 안내 문구를 병기하며 국내 DUR 등급과 별도 영역으로 분리 표시한다.

1. `LEVEL_1_SUPPORTED` (**1. 사용 가능 근거 있음**): 다수의 인간 임신·수유 임상 자료에서 유의한 위험 증가가 없으며 1차 선택약으로 권고됨 (에메랄드 그린)
2. `LEVEL_2_LOW_RISK` (**2. 비교적 낮은 위험**): 제한적~중등도의 인간 임상 자료에서 큰 위험이 보고되지 않아 임상적 유익성 판단 하에 사용 가능함 (스카이 블루)
3. `LEVEL_3_CAUTION` (**3. 주의하여 사용**): 특정 임신 주수나 영아 조건(신생아/미숙아, 졸음, 모유 분비 감소 등)에서 주의 관찰 또는 단기·최소 용량 사용이 필요함 (앰버 옐로우)
4. `LEVEL_4_AVOID` (**4. 사용 회피 권고**): 특정 주수(예: 임신 20주/30주 이후 NSAIDs) 또는 수유 상황에서 태아·영아 독성 위험이 확인되어 대체약 사용이나 투여 회피가 권고됨 (로즈 레드)
5. `LEVEL_5_INSUFFICIENT` (**5. 근거 부족**): 인간 임신·수유 중 노출 연구나 모유 농도 측정 자료가 부족하여 안전성을 단정할 수 없음 — **위험 또는 안전으로 단정하지 않음** (슬레이트 그레이)
