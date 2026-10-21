import fs from 'fs';

const FOOD_SAFETY_API_KEY = '3c5e594cc12141d897fe';

async function fetchI1250ByNo(reportNo) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/I1250/json/1/1/PRDLST_REPORT_NO=${reportNo}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.I1250?.row?.[0] || null;
}

async function fetchC003ByNo(reportNo) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/C003/json/1/1/PRDLST_REPORT_NO=${reportNo}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.C003?.row?.[0] || null;
}

async function main() {
  const cmKids = await fetchI1250ByNo('20090435035193');
  const mdreamKids = await fetchI1250ByNo('20090435035379');
  const mdreamLiquidC003 = await fetchC003ByNo('20110020099169');

  console.log("=== 1. 리퀴드씨엠키즈 (I1250) ===");
  console.log(JSON.stringify(cmKids, null, 2));

  console.log("\n=== 2. 엠-드림 리퀴드 키즈 (I1250) ===");
  console.log(JSON.stringify(mdreamKids, null, 2));

  console.log("\n=== 3. 엠-드림 리퀴드 (C003 건기식 등록본) ===");
  console.log(JSON.stringify(mdreamLiquidC003, null, 2));
}

main();
