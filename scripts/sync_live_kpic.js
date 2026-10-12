import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

function normalizeCategory(cat) {
  if (!cat) return '';
  let res = cat.replace(/^비타민([A-Za-z0-9]+)\s*제제$/, '비타민$1');
  res = res.replace(/\s*보충$/, '');
  return res.trim();
}

async function run() {
  console.log('Fetching live data from https://www.health.kr/api/kpicAtc ...');
  const liveData = await fetchJson('https://www.health.kr/api/kpicAtc');

  console.log(`Fetched ${liveData.categories?.length || 0} categories and ${liveData.ingredients?.length || 0} ingredients.`);

  // Save the raw live dump for reference
  const rawPath = path.join(rootDir, 'src', 'constants', 'kpicLiveDump.json');
  fs.writeFileSync(rawPath, JSON.stringify(liveData, null, 2), 'utf-8');
  console.log('Saved raw live dump to src/constants/kpicLiveDump.json');

  // Build the clean mapping dictionary: { [ingredientName]: classification }
  const mapping = {};
  const detailedList = [];

  for (const item of liveData.ingredients || []) {
    const name = item.KPIC_SNAME?.trim();
    if (!name) continue;

    // Pick most specific category: 세분류 -> 소분류 -> 중분류 -> 대분류
    let cat = item.kpic_yakhyo04?.trim() || item.KPIC_YAKHYO3?.trim() || item.KPIC_YAKHYO2?.trim() || item.KPIC_YAKHYO1?.trim() || '기타';
    if (cat === '기타' && item.KPIC_YAKHYO2?.trim() && item.KPIC_YAKHYO2.trim() !== '기타') {
      cat = item.KPIC_YAKHYO2.trim();
    }
    const cleanCat = normalizeCategory(cat);

    mapping[name] = cleanCat;

    detailedList.push({
      kpicatc_code: item.kpicatc_code,
      name,
      category: cleanCat,
      dept1: item.KPIC_YAKHYO1 || '',
      dept2: item.KPIC_YAKHYO2 || '',
      dept3: item.KPIC_YAKHYO3 || '',
      dept4: item.kpic_yakhyo04 || '',
      aig_code: item.aig_code || '',
      ingd_code: item.ingd_code || ''
    });
  }

  // Also include any categories as fallback keywords if desired
  const masterDbPath = path.join(rootDir, 'src', 'constants', 'kpicMasterDatabase.json');
  // Combine existing with newly crawled live mapping (live data takes precedence)
  const existingMaster = JSON.parse(fs.readFileSync(masterDbPath, 'utf-8'));
  const merged = { ...existingMaster, ...mapping };

  fs.writeFileSync(masterDbPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Updated src/constants/kpicMasterDatabase.json with merged ${Object.keys(merged).length} entries!`);

  const detailedPath = path.join(rootDir, 'src', 'constants', 'kpicDetailedIngredients.json');
  fs.writeFileSync(detailedPath, JSON.stringify(detailedList, null, 2), 'utf-8');
  console.log(`Saved detailed ingredients list to src/constants/kpicDetailedIngredients.json (${detailedList.length} items)`);
}

run().catch(console.error);
