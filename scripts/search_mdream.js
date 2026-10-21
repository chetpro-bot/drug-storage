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
  console.log("Searching imported with prductKoreanNm=엠-드림 ...");
  const impKor = await searchImported('prductKoreanNm=엠-드림');
  console.log("impKor length:", impKor.length);
  if (impKor.length > 0) {
    console.log("Sample:", impKor.map(x => ({ kor: x.PRDUCT_KOREAN_NM, eng: x.PRDUCT_NM, mfg: x.BSN_OFC_NAME, labelLen: (x.KORLABEL||'').length })));
  }

  console.log("Searching imported with prductNm=M-DREAM ...");
  const impEng = await searchImported('prductNm=M-DREAM');
  console.log("impEng length:", impEng.length);
  if (impEng.length > 0) {
    console.log("Sample:", impEng.map(x => ({ kor: x.PRDUCT_KOREAN_NM, eng: x.PRDUCT_NM, mfg: x.BSN_OFC_NAME })));
  }

  // Check C003 with various queries
  const c003_1 = await searchC003('PRDLST_NM=엠드림');
  console.log("c003 PRDLST_NM=엠드림:", c003_1.length);
  const c003_2 = await searchC003('PRDLST_NM=엠-드림');
  console.log("c003 PRDLST_NM=엠-드림:", c003_2.length);

  // Check I1250 with various queries
  const i1250_1 = await searchI1250('PRDLST_NM=엠드림');
  console.log("i1250 PRDLST_NM=엠드림:", i1250_1.length);
  const i1250_2 = await searchI1250('PRDLST_NM=엠-드림');
  console.log("i1250 PRDLST_NM=엠-드림:", i1250_2.length);

  // Search by business name (제이비케이랩 / 셀메드)
  console.log("Searching C003 BSSH_NM=제이비케이랩 ...");
  const jbkC003 = await searchC003('BSSH_NM=제이비케이랩');
  console.log("jbkC003 count:", jbkC003.length);
  if (jbkC003.length > 0) {
    console.log("JBK C003 products:", jbkC003.map(x => x.PRDLST_NM));
  }

  const jbkI1250 = await searchI1250('BSSH_NM=제이비케이랩');
  console.log("jbkI1250 count:", jbkI1250.length);
  if (jbkI1250.length > 0) {
    console.log("JBK I1250 products:", jbkI1250.map(x => x.PRDLST_NM));
  }
}

run();
