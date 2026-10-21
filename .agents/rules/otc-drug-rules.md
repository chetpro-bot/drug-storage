---
description: 일반의약품(OTC) 원료약품 및 분량 / 환산성분량(성분정보) 수집 및 표시 규칙
---

# 일반의약품(OTC) 환산성분량 및 의약품안전나라 데이터 수집 규칙

1. **국내 일반의약품 vs 수입제품 기준**
   - 국내 제조 일반의약품은 염·수화물·배산체·제피 원료의 유효성분 환산량(`성분정보`, 예: `~로서 ~밀리그램`)을 반드시 표시한다.
   - **수입제품(`MAKE_MATERIAL_FLAG`에 `'수입'` 포함 등)은 환산성분량을 적지 않아도 된다.**

2. **공식 API(`DrugPrdtPrmsnInfoService08`)의 한계와 `nedrug` 원문 사용**
   - 공공데이터포털 허가정보 API(`getDrugPrdtPrmsnDtlInq08`)의 `MATERIAL_NAME` 항목은 식약처 DB 동기화 누락으로 인해 `|성분정보 : |`가 빈칸으로 내려오는 품목(예: 아로나민씨플러스정, 아로나민씨플러스프리미엄정 등)이 많다.
   - 따라서 식약처 의약품안전나라 웹페이지(`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=...`) 내부의 `var aasda` 객체에서 `ingrInfo`(성분정보) 원문을 가져와 **수정 없이 있는 그대로** 표시한다.

3. **안전한 웹페이지 수집 4대 원칙**
   - **원문 보존**: `nedrug`에서 가져온 `ingrInfo`는 임의로 계산/변조하지 않고 식약처 원문 그대로 사용한다 (자체 계산 코드는 최후 Fallback으로만 유지).
   - **1회 수집 후 저장**: 품목 등록/조회 시 1회만 수집하여 Firestore DB(`rawIngredientsText`)와 `localStorage`(`pharmassist_nedrug_rows_cache_v1`)에 저장해 식약처 서버 부하 및 차단 위험을 방지한다.
   - **자체 서버 프록시 사용**: 불안정한 무료 공용 CORS 프록시 대신 자체 Firebase Cloud Function(`nedrugItemDetailProxy`, `/api/nedrug-proxy`) 및 Vite 프록시(`/api/nedrug`)를 사용한다.
   - **Fallback 방어**: 식약처 웹페이지 점검이나 구조 변경 시에도 앱이 멈추지 않도록 공식 API(`MATERIAL_NAME`) Fallback을 유지한다.
