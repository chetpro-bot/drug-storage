const API_KEY = '864de6190645216e2e968761319f76898e0ac8da5200fe1def929646b0c7df9f';

const sampleDrugs = ['아스피린', '옥시코돈', '독시사이클린', '페니라민', '씨프로바이', '타이레놀', '부루펜'];

async function testDur() {
  for (const name of sampleDrugs) {
    const url = `https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03?serviceKey=${encodeURIComponent(API_KEY)}&itemName=${encodeURIComponent(name)}&type=json&numOfRows=20`;
    const res = await fetch(url);
    const json = await res.json();
    const items = json.body?.items || [];
    const typeNames = [...new Set(items.map(it => (it['TYPE_NAME  '] || it.TYPE_NAME || '').trim()))];
    console.log(`[${name}] total: ${json.body?.totalCount || 0}, types:`, typeNames);
    if (items.length > 0) {
      console.log('Sample item:', {
        name: items[0].ITEM_NAME,
        type: (items[0]['TYPE_NAME  '] || items[0].TYPE_NAME || '').trim(),
        seq: items[0].ITEM_SEQ
      });
    }
  }
}
testDur();
