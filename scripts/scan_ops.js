const API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

// 가능한 모든 오퍼레이션 접두사 시도
const prefixes = ['get', ''];
const cores = [
  'SpcfTaboo', 'SpcTaboo', 'SpcficTaboo', 'AgeTaboo', 'OldTaboo', 'OdrkTaboo',
  'CpctyAtnt', 'CapacityAtnt', 'DoseAtnt',
  'MdctnPdAtnt', 'PeriodAtnt', 'TermAtnt',
  'SeAtnt', 'SideEffectAtnt',
  'TotalPrdlst', 'DurPrdlst', 'DurInfo'
];
const suffixes = ['InfoList03', 'InfoList02', 'InfoList01', 'List03', '03', 'List'];

async function scanOps() {
  for (const c of cores) {
    for (const s of suffixes) {
      const op = `get${c}${s}`;
      const url = `https://apis.data.go.kr/1471000/DURPrdlstInfoService03/${op}?serviceKey=${encodeURIComponent(API_KEY)}&itemName=${encodeURIComponent('타이레놀')}&type=json`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!text.includes('NO_OPENAPI_SERVICE_ERROR')) {
          console.log(`FOUND: DURPrdlstInfoService03/${op} -> HTTP ${res.status}`);
        }
      } catch (e) {}
    }
  }
  console.log('Done scanning DURPrdlstInfoService03.');
}
scanOps();
