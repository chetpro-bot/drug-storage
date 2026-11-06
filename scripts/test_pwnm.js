const API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

const candOps = [
  'getSpcfTabooInfoList03',
  'getAgeTabooInfoList03',
  'getSpcfTabooInfoList',
  'getSpcifyTabooInfoList03',
  'getSpcTabooInfoList03',
  'getOdrkTabooInfoList03',
  'getCpctyAtntInfoList03',
  'getCpctyAtntInfoList',
  'getMdctnPdAtntInfoList03',
  'getSeInfoList03',
  'getEfcyDplctInfoList03'
];

async function findOps() {
  for (const op of candOps) {
    const url = `https://apis.data.go.kr/1471000/DURPrdlstInfoService03/${op}?serviceKey=${encodeURIComponent(API_KEY)}&itemName=${encodeURIComponent('이부프로펜')}&type=json`;
    const res = await fetch(url);
    const text = await res.text();
    if (!text.includes('NO_OPENAPI_SERVICE_ERROR')) {
      console.log('FOUND OPERATION:', op, 'Status:', res.status, text.slice(0, 150));
    }
  }
}
findOps();
