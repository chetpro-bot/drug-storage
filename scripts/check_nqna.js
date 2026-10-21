import fs from 'fs';

const DATA_GO_KR_API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';
const FOOD_SAFETY_API_KEY = '3c5e594cc12141d897fe';

async function searchImported(query) {
  const url = `https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&type=json&pageNo=1&numOfRows=100&${query}`;
  const res = await fetch(url);
  const data = await res.json();
  const rawList = data?.body?.items || [];
  return (Array.isArray(rawList) ? rawList : [rawList]).map(x => x?.item || x).filter(Boolean);
}

async function searchC003(param) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/C003/json/1/100/${param}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.C003?.row || [];
}

async function searchI1250(param) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/I1250/json/1/100/${param}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.I1250?.row || [];
}

async function run() {
  const c003_mdream = await searchC003('PRDLST_NM=엠-드림');
  console.log("=== C003 엠-드림 ===");
  console.log(JSON.stringify(c003_mdream, null, 2));

  const i1250_mdream = await searchI1250('PRDLST_NM=엠-드림');
  console.log("=== I1250 엠-드림 ===");
  console.log(JSON.stringify(i1250_mdream, null, 2));

  console.log("\n=== Checking NQNA products in imported ===");
  const nqnaImp = await searchImported('bsnOfcName=엔큐엔에이');
  console.log("NQNA imported count:", nqnaImp.length);
  const nqnaNames = nqnaImp.map(x => ({ kor: x.PRDUCT_KOREAN_NM, eng: x.PRDUCT_NM }));
  console.log("NQNA products:", nqnaNames);

  // Filter for '리퀴드' or '키즈' in NQNA
  const liquidOrKids = nqnaImp.filter(x => 
    (x.PRDUCT_KOREAN_NM && (x.PRDUCT_KOREAN_NM.includes('리퀴드') || x.PRDUCT_KOREAN_NM.includes('키즈') || x.PRDUCT_KOREAN_NM.includes('엠'))) ||
    (x.PRDUCT_NM && (x.PRDUCT_NM.includes('LIQUID') || x.PRDUCT_NM.includes('KIDS') || x.PRDUCT_NM.includes('M-DREAM')))
  );
  console.log("\nFiltered NQNA Liquid/Kids/M-Dream:", liquidOrKids.map(x => ({ kor: x.PRDUCT_KOREAN_NM, eng: x.PRDUCT_NM })));
  
  // Also check C003 and I1250 for NQNA (엔큐엔에이)
  const nqnaC003 = await searchC003('BSSH_NM=엔큐엔에이');
  console.log("NQNA C003 count:", nqnaC003.length);
  if (nqnaC003.length > 0) {
    console.log("NQNA C003 names:", nqnaC003.map(x => x.PRDLST_NM));
  }

  const nqnaI1250 = await searchI1250('BSSH_NM=엔큐엔에이');
  console.log("NQNA I1250 count:", nqnaI1250.length);
  if (nqnaI1250.length > 0) {
    console.log("NQNA I1250 names:", nqnaI1250.map(x => x.PRDLST_NM));
  }

  // Also search for "엠드림" in any products
  const dreamC003 = await searchC003('PRDLST_NM=엠드림');
  console.log("dreamC003:", dreamC003.length);

  // Search if there is "엠-드림 리퀴드" or "엠드림리퀴드키즈" in C003 / I1250 with regex or partial
  // In Food Safety Korea, PRDLST_NM is prefix/exact match or substring match depending on param
}

run();
