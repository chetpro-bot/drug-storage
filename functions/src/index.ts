/**
 * Firebase Cloud Functions (v2) - 공공데이터포털(식약처/식품안전나라) CORS 우회 프록시
 * 
 * 브라우저 환경에서 공공데이터 API를 직접 호출할 때 발생하는 CORS(Cross-Origin Resource Sharing)
 * 에러를 방지하고, API 키 보안을 위해 서버리스 함수에서 호출 및 파싱을 대행합니다.
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_DECODING_KEY || "YOUR_PUBLIC_DATA_PORTAL_KEY";

/**
 * 일반의약품(식약처 의약품안전나라 허가정보) 프록시
 */
export const searchOtcDrugProxy = onRequest({ cors: true }, async (req, res) => {
  try {
    const { productName, manufacturer } = req.query;

    if (!productName) {
      res.status(400).json({ error: "제품명(productName) 파라미터가 필요합니다." });
      return;
    }

    logger.info("식약처 의약품 공공데이터 검색 요청:", { productName, manufacturer });

    // 공공데이터포털 식약처 의약품 허가 상세 정보 API URL
    const targetUrl = new URL("https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService05/getDrugPrdtPrmsnInq05");
    targetUrl.searchParams.set("serviceKey", DATA_GO_KR_API_KEY);
    targetUrl.searchParams.set("item_name", String(productName));
    if (manufacturer) {
      targetUrl.searchParams.set("entp_name", String(manufacturer));
    }
    targetUrl.searchParams.set("type", "json");
    targetUrl.searchParams.set("numOfRows", "5");

    const response = await fetch(targetUrl.toString());
    if (!response.ok) {
      throw new Error(`식약처 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    logger.error("식약처 API 프록시 오류:", error);
    res.status(500).json({ error: error.message || "공공데이터 수집 중 오류가 발생했습니다." });
  }
});

/**
 * 건강기능식품(식품안전나라 품목제조신고정보) 프록시
 */
export const searchHealthFoodProxy = onRequest({ cors: true }, async (req, res) => {
  try {
    const { productName, manufacturer } = req.query;

    if (!productName) {
      res.status(400).json({ error: "제품명(productName) 파라미터가 필요합니다." });
      return;
    }

    logger.info("식품안전나라 건강기능식품 공공데이터 검색 요청:", { productName, manufacturer });

    // 식품안전나라 건강기능식품 품목제조신고 API URL
    const targetUrl = new URL("https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItemPrdtList03");
    targetUrl.searchParams.set("serviceKey", DATA_GO_KR_API_KEY);
    targetUrl.searchParams.set("prdlst_nm", String(productName));
    if (manufacturer) {
      targetUrl.searchParams.set("bssh_nm", String(manufacturer));
    }
    targetUrl.searchParams.set("type", "json");

    const response = await fetch(targetUrl.toString());
    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    logger.error("식품안전나라 API 프록시 오류:", error);
    res.status(500).json({ error: error.message || "식품안전나라 수집 중 오류가 발생했습니다." });
  }
});

/**
 * 의약품안전나라(nedrug.mfds.go.kr) 품목 상세 원문 허가증(원료약품 및 분량/환산량) 프록시
 */
export const nedrugItemDetailProxy = onRequest({ cors: true }, async (req, res) => {
  try {
    const { itemSeq } = req.query;
    if (!itemSeq) {
      res.status(400).json({ error: "품목기준코드(itemSeq) 파라미터가 필요합니다." });
      return;
    }

    const targetUrl = `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(String(itemSeq))}`;
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`의약품안전나라 응답 오류: ${response.status}`);
    }

    const html = await response.text();
    res.status(200).send(html);
  } catch (error: any) {
    logger.error("의약품안전나라 프록시 오류:", error);
    res.status(500).json({ error: error.message || "의약품안전나라 상세 수집 중 오류가 발생했습니다." });
  }
});

