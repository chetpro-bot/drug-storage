const API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

const services = ['DURPrdlstInfoService03', 'DURIrdntInfoService03'];
const candidates = [
  'getSpcfTabooInfoList', 'getSpcfTabooInfoList02', 'getSpcfTabooInfoList03',
  'getSpcfAtntInfoList', 'getSpcfAtntInfoList02', 'getSpcfAtntInfoList03',
  'getSpcTabooInfoList', 'getSpcTabooInfoList02', 'getSpcTabooInfoList03',
  'getAgeTabooInfoList', 'getAgeTabooInfoList02', 'getAgeTabooInfoList03',
  'getCpctyAtntInfoList', 'getCpctyAtntInfoList02', 'getCpctyAtntInfoList03',
  'getMdctnPdAtntInfoList', 'getMdctnPdAtntInfoList02', 'getMdctnPdAtntInfoList03',
  'getOdrkAtntInfoList', 'getOdrkAtntInfoList02', 'getOdrkAtntInfoList03',
  'getOdrkTabooInfoList', 'getOdrkTabooInfoList02', 'getOdrkTabooInfoList03'
];

async function scanServices() {
  for (const s of services) {
    for (const op of candidates) {
      const url = `https://apis.data.go.kr/1471000/${s}/${op}?serviceKey=${encodeURIComponent(API_KEY)}&ingrName=${encodeURIComponent('시프로플록사신')}&itemName=${encodeURIComponent('씨프로바이')}&type=json`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!text.includes('NO_OPENAPI_SERVICE_ERROR')) {
          console.log(`FOUND: ${s}/${op} -> ${res.status}`);
        }
      } catch (e) {}
    }
  }
}
scanServices();
