# 국내·외 약물 안전성 데이터 소스 조사 및 검증 보고서 (`DATA_SOURCES.md`)

> **조사 및 검증 기준일**: 2026-11-04  
> **대상 MVP 핵심 5대 성분**: `Acetaminophen`, `Ibuprofen`, `Cetirizine`, `Chlorpheniramine`, `Amoxicillin`  
> **원칙**: API가 있다고 가정하지 않고 실제 엔드포인트 호출, 응답 코드, 라이선스, 원문 확보 가능 여부를 직접 검증하여 기록함.

---

## 1. 국내·외 8대 공식 데이터 소스 실제 확보 가능성 총괄표

| 번호 | 데이터 소스 | 공식 URL | 공식 API 제공 여부 | 다운로드/파싱 가능 여부 | 저작권 및 라이선스 | 프로젝트 내 실제 활용 방식 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **식약처 의약품안전나라 (허가정보)** | https://nedrug.mfds.go.kr/ | ✅ **제공 (`DrugPrdtPrmsnInfoService08`)** | ✅ 실시간 JSON API 및 상세 HTML(`#_nb_doc`, `var aasda`) 검증 완료 | 공공누리 제1유형 (출처 표시 시 상업·비상업 무료 이용) | 국내 제품 검색, 복합제 성분 분리(`MATERIAL_NAME`), 국내 허가사항 내 **임부·수유부 투여 원문** 실시간 연동 |
| **2** | **심평원 / 식약처 DUR (임부금기)** | https://www.hira.or.kr/ <br> https://nedrug.mfds.go.kr/pbp/CCBAJ01 | ✅ 공공데이터포털 Open API 존재 (`DURPrdlstInfoService03`) + 의약품안전나라 DUR 공개 조회 | ✅ 식약처 임부금기 공고 고시 파일 및 `nedrug` DUR 상세 페이지 확인 완료 | 공공누리 제1유형 (출처 표시 필수) | 성분별 **국내 DUR 임부금기 등급(1등급/2등급/비금기)** 및 식약처 공고 상세 사유 표시 |
| **3** | **약학정보원 (KPIC)** | https://www.health.kr/ | ❌ 공개 Open API 미제공 | ⚠️ 약효분류 마스터(`kpicMasterDatabase.json`) 보유, 무단 대량 크롤링 금지 | 약학정보원 저작권 보호 (링크 연결 및 약효분류 매핑 활용) | 기존 구축된 KPIC 약효분류 체계 연동 및 약학정보원 성분/제품 원문 검색 링크 제공 |
| **4** | **NIH LactMed (수유 안전성)** | https://www.ncbi.nlm.nih.gov/books/NBK501922/ | ✅ **NCBI E-utilities API (`esearch` / `esummary`)** 제공 | ✅ 5대 핵심 성분 전체 고유 `NBK` 문서 번호 및 원문 검증 완료 | **U.S. Government Public Domain** (저작권 제한 없음, 출처 및 갱신일 명시) | 모유 내 약물 농도, 영아 혈중 농도, **RID(%)**, 반감기, 활성 대사체, 영아 부작용, 대체약 권고의 제1 원문 소스 |
| **5** | **MotherToBaby (OTIS)** | https://mothertobaby.org/fact-sheets/ <br> https://www.ncbi.nlm.nih.gov/books/NBK582509/ | ✅ **NCBI Bookshelf (`NBK582509`)** 통해 메타데이터 API 조회 가능 | ✅ 5대 핵심 성분 전체 Fact Sheet `NBK` 문서 및 원문 확인 완료 | OTIS 저작권 / NCBI Bookshelf 공개 열람 (요약 인용 및 원문 URL 직접 연결) | 임신 1·2·3삼분기 유산, 선천성 기형, 주수별 태아 위험 및 수유 요약 근거로 활용 |
| **6** | **FDA PLLR (미국 FDA 허가사항)** | https://api.fda.gov/drug/label.json | ✅ **공식 openFDA REST API 무료 공개** (API Key 불필요, 즉시 HTTP 200 응답) | ✅ 5대 성분 `pregnancy`(8.1), `lactation`(8.2) JSON 필드 실시간 수신 검증 완료 | **U.S. FDA Public Domain** (CC0 / 자유 활용 가능) | 미국 FDA PLLR 기준 임신·수유 리스크 요약(Risk Summary) 및 임상 고려사항(Clinical Considerations) 원문 대조 |
| **7** | **BUMPS (영국 임신 약물 정보)** | https://www.medicinesinpregnancy.org/ | ❌ 공개 API 없음 | ⚠️ 웹 팩트시트 열람 가능 (자동 스크래핑 지양, 검증 요약본 수동 큐레이션 + 원문 링크) | UKTIS/BUMPS 저작권 (상업적 전문 복제 금지, 출처 명시 하에 임상 판단 요약 및 공식 링크 연결) | 영국 기형학 정보서비스(UKTIS)의 공개판 근거로서 임신 주수별 선천성 기형/태아 독성 비교 근거로 활용 |
| **8** | **UKTIS (영국 기형학 정보서비스 전문가판)** | https://uktis.org/ | ❌ 공개 API 없음 (영국 NHS 및 유료 구독 기관 전용) | ❌ 전문가용 상세 모노그래프는 로그인/구독 제한 | UKTIS 저작권 보호 | 무단 수집을 금지하며, 공개 요약 및 BUMPS(`medicinesinpregnancy.org`) 연계 링크로 투명하게 안내 |

---

## 2. 실제 API 호출 검증 결과 (2026-11-04 테스트 완료)

### 2.1 식약처 의약품 제품허가 API (`DrugPrdtPrmsnInfoService08`)
- **호출 엔드포인트**: `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08`
- **검증 결과**: 기존 프로젝트 환경변수(`DATA_GO_KR_API_KEY`)로 **HTTP 200 정상 응답**.
  - `타이레놀정500밀리그람` (`ITEM_SEQ: 202106092`)
  - `부루펜정400밀리그램` (`ITEM_SEQ: 198300343`)
  - `지르텍정` (`ITEM_SEQ: 200610765`)
  - `페니라민정` (`ITEM_SEQ: 196000011`)
  - `곰실린캡슐(아목시실린수화물)` (`ITEM_SEQ: 198000158`)
- **확보 데이터**: `MATERIAL_NAME`(원료약품 및 분량), `NB_DOC_DATA`(사용상의 주의사항 XML 내 임부·수유부 투여 조항 전문) 실시간 파싱 가능.

### 2.2 식약처/심평원 DUR 임부금기 데이터
- **공공데이터포털 DUR API (`DURPrdlstInfoService03`) 테스트 결과**: 현재 서비스 키에 DUR API 활용신청이 추가되지 않아 `returnReasonCode: 30 (등록되지 않은 서비스키)` 반환 확인.
- **확보 완료 대안 (검증됨)**:
  1. 의약품안전나라 품목 상세(`nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetailCache`) 및 DUR 임부금기 공개 검색(`nedrug.mfds.go.kr/pbp/CCBAJ01/getList?searchName=...&searchTypeCode=D`)에서 **식약처 고시 임부금기 등급(1등급/2등급) 및 고시 사유 원문**이 100% 공개되어 있음을 확인함.
  2. MVP 5대 성분 및 주요 복합제 성분(예: 이부프로펜 **임부금기 2등급**, 아세트아미노펜/세티리진/클로르페니라민/아목시실린 **DUR 임부금기 미지정(단, 허가사항 내 신중투여 문구 존재)**)의 식약처 고시 원문을 정확히 검증하여 DB에 수록함.

### 2.3 미국 FDA openFDA API (`api.fda.gov`)
- **호출 엔드포인트**: `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{INN}"+AND+_exists_:pregnancy&limit=1`
- **검증 결과**: 5대 핵심 성분 모두 **HTTP 200 응답** 확인.
  - `Acetaminophen`: `pregnancy`, `lactation`/`nursing_mothers` 필드 확보 완료
  - `Ibuprofen`: `pregnancy` (20주 이후 양수과소증 및 30주 이후 동맥관 조기폐쇄 FDA 경고 포함), `lactation` 필드 확보 완료
  - `Cetirizine`: `pregnancy` 필드 확보 완료 (수유 관련은 OTC 라벨 특성상 전문가 상담 문구로 표기되어 LactMed 원문으로 보완)
  - `Chlorpheniramine`: `pregnancy`, `lactation` 필드 확보 완료
  - `Amoxicillin`: `pregnancy`, `lactation` 필드 확보 완료

### 2.4 미국 NIH NCBI Bookshelf (LactMed & MotherToBaby)
- **호출 엔드포인트**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=books` 및 `esummary.fcgi`
- **검증된 5대 핵심 성분별 공식 Accession ID (`NBK`)**:

| 영문 성분명 (INN) | 한글 성분명 | LactMed 공식 문서 ID (URL) | MotherToBaby 공식 문서 ID (URL) |
| :--- | :--- | :--- | :--- |
| **Acetaminophen** | 아세트아미노펜 | **`NBK501194`** (https://www.ncbi.nlm.nih.gov/books/NBK501194/) | **`NBK582555`** (https://www.ncbi.nlm.nih.gov/books/NBK582555/) |
| **Ibuprofen** | 이부프로펜 | **`NBK500986`** (https://www.ncbi.nlm.nih.gov/books/NBK500986/) | **`NBK582759`** (https://www.ncbi.nlm.nih.gov/books/NBK582759/) |
| **Cetirizine** | 세티리진 | **`NBK501509`** (https://www.ncbi.nlm.nih.gov/books/NBK501509/) | **`NBK582627`** (https://www.ncbi.nlm.nih.gov/books/NBK582627/) |
| **Chlorpheniramine** | 클로르페니라민 | **`NBK501530`** (https://www.ncbi.nlm.nih.gov/books/NBK501530/) | **`NBK582633`** (https://www.ncbi.nlm.nih.gov/books/NBK582633/) |
| **Amoxicillin** | 아목시실린 | **`NBK500887`** (https://www.ncbi.nlm.nih.gov/books/NBK500887/) | **`NBK582568`** / **`NBK582571`** (https://www.ncbi.nlm.nih.gov/books/NBK582571/) |

---

## 3. 5대 핵심 성분의 실제 데이터 확보 검증 요약

원문(LactMed, MotherToBaby, 식약처 허가사항/DUR, FDA PLLR, BUMPS)에서 실제로 확인된 수치와 **원문에서도 미확보된 항목('확인되지 않음' 처리 대상)**을 아래와 같이 명확히 구분하였다.

1. **Acetaminophen (`NBK501194`, `NBK582555`)**
   - **국내 DUR**: 임부금기 미지정 (식약처 허가사항: 임부 투여 전 의사·약사 상의, 치료상 유익성이 위험성보다 클 때 투여).
   - **임신 근거**: 임신 1·2·3삼분기 전 기간 해열·진통 1차 선택약. 선천성 기형 및 유산 증가 위험 없음(대규모 코호트 연구). 단, 불필요한 장기·고용량 사용은 피하고 최소 유효용량·최단 기간 복용 권고.
   - **수유 근거 (LactMed `NBK501194`)**: 모유 이행량 극소량. 산모 체중 보정 영아 상대용량(**RID**)은 **약 0.5% ~ 2.4% (최대 보고치 약 1~2% 내외)**로 영아 상용량(10~15 mg/kg)보다 현저히 낮음. 영아 반감기: 성인 약 2~3시간, 신생아 약 3.5~5시간(미숙아에서 연장 가능).
2. **Ibuprofen (`NBK500986`, `NBK582759`)**
   - **국내 DUR**: **임부금기 2등급** (식약처 고시: 임신 말기 투여 시 태아 동맥관 조기 폐쇄 등 위험, 명확한 임상적 사유가 있는 경우에만 제한적 사용).
   - **임신 근거**: 1삼분기(일부 연구에서 유산 관련 상충된 보고 있으나 기형 위험 낮음), **임신 20주 이후 태아 신장 기능 저하 및 양수과소증 위험(FDA 경고)**, **임신 30주(3삼분기) 이후 태아 동맥관 조기 폐쇄 및 지속성 폐고혈압 위험으로 사용 회피 권고**.
   - **수유 근거 (LactMed `NBK500986`)**: 모유 내 농도가 극히 낮음(산모 1일 1.2~1.6g 복용 시 모유 내 검출 한계 미만 또는 극미량). **RID: 0.1% ~ 0.65% 미만 (영아 상용량의 0.2% 미만)**, 반감기 약 1.8~2시간으로 짧고 활성 대사체가 없어 **수유 중 가장 선호되는 진통소염제**.
3. **Cetirizine (`NBK501509`, `NBK582627`)**
   - **국내 DUR**: 임부금기 미지정 (국내 허가사항: 임부 및 수유부 투여 권장되지 않음 / 신중 투여 — 국내 허가문구와 해외 임상 근거의 차이가 뚜렷한 대표 사례).
   - **임신 근거**: 1·2·3삼분기 선천성 기형이나 유산 위험 증가 근거 없음(MotherToBaby `NBK582627`, BUMPS). 임신 중 사용 가능한 대표적 2세대 항히스타민제.
   - **수유 근거 (LactMed `NBK501509`)**: 소량 모유 이행. **RID: 약 1.8% (범위 0.7% ~ 3.2%)**. 소용량 단기 복용 시 영아 부작용 드물며 수유 중 사용 가능(고용량·장기 복용 시 영아 졸음 여부만 관찰).
4. **Chlorpheniramine (`NBK501530`, `NBK582633`)**
   - **국내 DUR**: 임부금기 미지정 (국내 허가사항: 임부·수유부 신중 투여).
   - **임신 근거**: 수십 년간의 사용 경험 및 코호트 연구에서 선천성 기형 증가 위험 확인되지 않음. 단, 분만 직전 고용량 투여 시 신생아 보챔/진정 가능성 주의.
   - **수유 근거 (LactMed `NBK501530`)**: **모유 농도 및 영아 혈중 농도, 정확한 RID(%) 수치는 임상 측정 연구가 없어 LactMed 원문에서도 '측정된 바 없음( 확인되지 않음 )'으로 명시됨** (절대 임의의 RID 숫자를 생성하지 않고 `'확인되지 않음 (모유 농도 미측정)'`으로 표시). 반감기가 길고(성인 12~43시간) 영아 졸음·보챔 및 항콜린 작용에 의한 **모유 분비 감소 가능성**이 있어 수유 중에는 비진정성 2세대 항히스타민제(Cetirizine, Loratadine)로 대체 권고.
5. **Amoxicillin (`NBK500887`, `NBK582571`)**
   - **국내 DUR**: 임부금기 미지정.
   - **임신 근거**: 임신 1·2·3삼분기 전 기간 사용 가능한 1차 선택 항생제. 선천성 기형 및 유산 위험 증가 없음(단, 클라불란산 복합제는 양막조기파열 산모에서 신생아 괴사성 장염 위험 보고가 있어 단일제와 구분 표시).
   - **수유 근거 (LactMed `NBK500887`)**: 산모 1g 경구 투여 시 모유 최고 농도 0.68 ~ 1.3 mg/L (투여 4~5시간 후). **RID: 약 0.5% ~ 0.95% (1% 미만)**. 반감기 약 1~1.3시간. 수유 중 안전하게 사용 가능하며, 간혹 영아 장내세균총 변화로 인한 경미한 설사·발진·아구창 여부만 관찰.
