import fs from 'fs';

const DATA_GO_KR_API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';
const FOOD_SAFETY_API_KEY = '3c5e594cc12141d897fe';

async function queryImported(param) {
  try {
    const url = `https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&type=json&pageNo=1&numOfRows=50&${param}`;
    const res = await fetch(url);
    const data = await res.json();
    const rawList = data?.body?.items || [];
    return (Array.isArray(rawList) ? rawList : [rawList]).map(x => x?.item || x).filter(Boolean);
  } catch (e) {
    return { error: e.message };
  }
}

async function queryC003(param) {
  try {
    const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/C003/json/1/50/${param}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.C003?.row || [];
  } catch (e) {
    return { error: e.message };
  }
}

async function queryI1250(param) {
  try {
    const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/I1250/json/1/50/${param}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.I1250?.row || [];
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  console.log("1. Checking Imported for M-DREAM / M DREAM / 엠-드림 / 키즈...");
  const imp1 = await queryImported('prductNm=M-DREAM');
  const imp2 = await queryImported('prductNm=M-DREAM LIQUID');
  const imp3 = await queryImported('prductKoreanNm=엠-드림');
  const imp4 = await queryImported('prductNm=DREAM');
  const imp5 = await queryImported('prductKoreanNm=드림');
  const imp6 = await queryImported('korlabel=엠드림');
  const imp7 = await queryImported('korlabel=M-DREAM');

  console.log("Imported results count:", {
    'prductNm=M-DREAM': imp1.length,
    'prductNm=M-DREAM LIQUID': imp2.length,
    'prductKoreanNm=엠-드림': imp3.length,
    'prductNm=DREAM': imp4.length,
    'prductKoreanNm=드림': imp5.length,
    'korlabel=엠드림': imp6.length,
    'korlabel=M-DREAM': imp7.length,
  });

  if (imp1.length > 0) {
    console.log("imp1 sample names:", imp1.map(x => ({ kor: x.prductKoreanNm, eng: x.prductNm })));
  }
  if (imp7.length > 0) {
    console.log("imp7 sample names:", imp7.map(x => ({ kor: x.prductKoreanNm, eng: x.prductNm })));
  }

  console.log("\n2. Checking C003 and I1250 for 엠드림 / 드림 / 셀메드 / 제이비케이...");
  const c003_1 = await queryC003('PRDLST_NM=엠-드림');
  const c003_2 = await queryC003('BSSH_NM=제이비케이');
  const c003_3 = await queryC003('PRDLST_NM=키즈');
  console.log("C003 counts:", {
    'PRDLST_NM=엠-드림': c003_1.length,
    'BSSH_NM=제이비케이': c003_2.length,
    'PRDLST_NM=키즈': c003_3.length,
  });

  const i1250_1 = await queryI1250('PRDLST_NM=엠-드림');
  const i1250_2 = await queryI1250('BSSH_NM=제이비케이');
  const i1250_3 = await queryI1250('PRDLST_NM=엠드림');
  const i1250_4 = await queryI1250('PRDLST_NM=드림');
  console.log("I1250 counts:", {
    'PRDLST_NM=엠-드림': i1250_1.length,
    'BSSH_NM=제이비케이': i1250_2.length,
    'PRDLST_NM=엠드림': i1250_3.length,
    'PRDLST_NM=드림': i1250_4.length,
  });
  if (i1250_2.length > 0) {
    console.log("JBK items in I1250:", i1250_2.map(x => x.PRDLST_NM));
  }
}

main();
