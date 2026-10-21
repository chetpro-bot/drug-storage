import fs from 'fs';

const DATA_GO_KR_API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';
const FOOD_SAFETY_API_KEY = '3c5e594cc12141d897fe';

async function queryC003(name) {
  try {
    const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/C003/json/1/10/PRDLST_NM=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.C003?.row || [];
  } catch (e) {
    return { error: e.message };
  }
}

async function queryI1250(name) {
  try {
    const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_API_KEY}/I1250/json/1/10/PRDLST_NM=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.I1250?.row || [];
  } catch (e) {
    return { error: e.message };
  }
}

async function queryImported(name, isKor=true) {
  try {
    const param = isKor ? `prductKoreanNm=${encodeURIComponent(name)}` : `prductNm=${encodeURIComponent(name)}`;
    const url = `https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&type=json&pageNo=1&numOfRows=10&${param}`;
    const res = await fetch(url);
    const data = await res.json();
    const rawList = data?.body?.items || [];
    return (Array.isArray(rawList) ? rawList : [rawList]).map(x => x?.item || x).filter(Boolean);
  } catch (e) {
    return { error: e.message };
  }
}

async function queryImportedLabel(term) {
  try {
    const url = `https://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&type=json&pageNo=1&numOfRows=10&korlabel=${encodeURIComponent(term)}`;
    const res = await fetch(url);
    const data = await res.json();
    const rawList = data?.body?.items || [];
    return (Array.isArray(rawList) ? rawList : [rawList]).map(x => x?.item || x).filter(Boolean);
  } catch (e) {
    return { error: e.message };
  }
}

async function run() {
  const results = {};
  
  // 1. 리퀴드씨엠키즈
  console.log("Searching 리퀴드씨엠키즈...");
  results["리퀴드씨엠키즈_C003"] = await queryC003("리퀴드씨엠키즈");
  results["리퀴드씨엠_C003"] = await queryC003("리퀴드씨엠");
  results["씨엠키즈_C003"] = await queryC003("씨엠키즈");
  results["리퀴드씨엠키즈_I1250"] = await queryI1250("리퀴드씨엠키즈");
  results["리퀴드씨엠_I1250"] = await queryI1250("리퀴드씨엠");
  results["리퀴드씨엠키즈_ImportedKor"] = await queryImported("리퀴드씨엠키즈");
  results["리퀴드씨엠_ImportedKor"] = await queryImported("리퀴드씨엠");
  results["리퀴드씨엠_ImportedLabel"] = await queryImportedLabel("리퀴드씨엠");

  // 2. 엠드림리퀴드키즈
  console.log("Searching 엠드림리퀴드키즈...");
  results["엠드림리퀴드키즈_C003"] = await queryC003("엠드림리퀴드키즈");
  results["엠드림리퀴드_C003"] = await queryC003("엠드림리퀴드");
  results["엠드림키즈_C003"] = await queryC003("엠드림키즈");
  results["엠드림_C003"] = await queryC003("엠드림");
  results["엠드림리퀴드키즈_I1250"] = await queryI1250("엠드림리퀴드키즈");
  results["엠드림리퀴드_I1250"] = await queryI1250("엠드림리퀴드");
  results["엠드림리퀴드키즈_ImportedKor"] = await queryImported("엠드림리퀴드키즈");
  results["엠드림리퀴드_ImportedKor"] = await queryImported("엠드림리퀴드");
  results["엠드림_ImportedKor"] = await queryImported("엠드림");
  results["엠드림_ImportedLabel"] = await queryImportedLabel("엠드림");

  fs.writeFileSync('scripts/raw_results.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log("Done! Written to scripts/raw_results.json");
}

run();
