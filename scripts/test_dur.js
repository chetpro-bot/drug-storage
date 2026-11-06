const API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

const services = ['DURPrdlstInfoService01', 'DURPrdlstInfoService02', 'DURPrdlstInfoService03'];
const ops = ['getSpcifyPrdlstInfoList', 'getAgeTabooInfoList', 'getSpcifyPrdlstInfoList01', 'getSpcifyPrdlstInfoList02'];

async function scan() {
  for (const s of services) {
    for (const op of ops) {
      const url = `https://apis.data.go.kr/1471000/${s}/${op}?serviceKey=${encodeURIComponent(API_KEY)}&itemName=${encodeURIComponent('페니라민')}&type=json`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!text.includes('NO_OPENAPI_SERVICE_ERROR')) {
          console.log(`MATCH! ${s}/${op} -> HTTP ${res.status}:`, text.slice(0, 200));
        }
      } catch (e) {
        // ignore
      }
    }
  }
  console.log('Scan finished.');
}
scan();
