import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/raw_results.json', 'utf-8'));
for (const k of Object.keys(data)) {
  const items = data[k];
  console.log(`${k}: ${Array.isArray(items) ? items.length : typeof items}`);
  if (Array.isArray(items) && items.length > 0) {
    console.log("  Names:", items.map(x => x.PRDLST_NM || x.prductKoreanNm || x.prductNm));
  }
}
