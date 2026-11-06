const API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

// 식품의약품안전처 DUR API 서비스 및 오퍼레이션 전체 목록 시도
const services = [
  'DURPrdlstInfoService03',
  'DURIrdntInfoService03',
  'DURPrdlstInfoService02',
  'DURIrdntInfoService02'
];

const operations = [
  'getSpcfTabooInfoList03',
  'getSpcfTabooInfoList02',
  'getSpcfTabooInfoList',
  'getUsjntTabooInfoList03', // 병용금기
  'getPwnmTabooInfoList03', // 임부금기
  'getMdctnPdAtntInfoList03', // 투여기간주의
  'getCpctyAtntInfoList03', // 용량주의
  'getOdrkAtntInfoList03', // 노인주의
  'getEfcyDplctInfoList03', // 효능군중복
  'getSpcifyPrdlstInfoList03',
  'getAgeTabooInfoList03',
  'getSpcfTabooInfoList03',
  // 성분별
  'getUsjntTabooInfoList02',
  'getPwnmTabooInfoList02',
  'getSpcfTabooInfoList02',
  'getCpctyAtntInfoList02',
  'getMdctnPdAtntInfoList02',
  'getOdrkAtntInfoList02',
  'getEfcyDplctInfoList02'
];

async function testAll() {
  for (const s of services) {
    for (const op of operations) {
      const url = `https://apis.data.go.kr/1471000/${s}/${op}?serviceKey=${encodeURIComponent(API_KEY)}&itemName=${encodeURIComponent('타이레놀')}&type=json`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!text.includes('NO_OPENAPI_SERVICE_ERROR')) {
          console.log(`SUCCESS: ${s}/${op} -> ${res.status} | len=${text.length}`);
        }
      } catch (e) {}
    }
  }
  console.log('Finished testing.');
}
testAll();
