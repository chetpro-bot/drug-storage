import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// .env 파싱
const envPath = path.join(rootDir, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
};

function normalizeUnit(rawUnit = '') {
  const u = rawUnit.trim();
  if (u === '밀리그램' || u === '밀리그람' || /^mg$/i.test(u)) return 'mg';
  if (u === '마이크로그램' || u === '마이크로그람' || u === '㎍' || /^ug|μg|µg$/i.test(u)) return 'ug';
  if (u === '그램' || u === '그람' || /^g$/i.test(u)) return 'g';
  if (u === '아이.유' || u === '아이유' || u === '국제단위' || /^iu$/i.test(u)) return 'IU';
  return u;
}

function parseIngrInfoToFields(rawInfo = '') {
  const trimmed = rawInfo.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  let elementalLabel;
  let elementalAmount;
  let elementalUnit;
  const formattedParts = [];

  parts.forEach((part, idx) => {
    const m = part.match(/^(?:(.*?)(?:\(으\)|으)?로서\s*|(.*?)\s+)?([0-9\.,]+)\s*([a-zA-Z가-힣㎍μµ\.]+)?$/);
    if (m) {
      let label = (m[1] || m[2] || '')
        .replace(/\(비타민\s*[A-Za-z0-9]+\)/gi, '')
        .replace(/(?:\(으\)|으로서|로서|으)$/, '')
        .trim();
      if (/^총\s*인$/i.test(label)) label = '인';
      label = label.replace(/^비타민\s+([A-Za-z0-9]+)/i, '비타민$1');
      const num = parseFloat((m[3] || '').replace(/,/g, ''));
      const u = normalizeUnit(m[4] || 'mg');

      if (idx === 0 && !isNaN(num)) {
        elementalLabel = label || undefined;
        elementalAmount = num;
        elementalUnit = u;
      }

      const dispUnit = u === 'ug' ? 'µg' : u;
      const dispNum = (u === 'IU' && num >= 1000) ? num.toLocaleString('en-US') : num.toString();
      formattedParts.push(label ? `${label} ${dispNum}${dispUnit}` : `${dispNum}${dispUnit}`);
    }
  });

  if (formattedParts.length === 0) return null;
  return {
    elementalLabel,
    elementalAmount,
    elementalUnit,
    ingredientInfoText: formattedParts.join(', '),
  };
}

async function fetchNedrugRows(itemSeq) {
  const url = `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetailCache?cacheSeq=${encodeURIComponent(itemSeq)}aupdateTs2025-01-01b`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });
  if (!res.ok) return null;
  const html = await res.text();
  const matches = [...html.matchAll(/var\s+aasda\s*=\s*(\{[\s\S]*?\})\s*;/g)];
  if (!matches || matches.length === 0) return null;

  const rows = [];
  for (const m of matches) {
    try {
      const row = JSON.parse(m[1]);
      if (row && row.ingrName) {
        rows.push({
          ingrName: String(row.ingrName || '').trim(),
          ingrTotqy: String(row.ingrTotqy || '').trim(),
          ingrUnitName: String(row.ingrUnitName || '').trim(),
          ingrStdName: String(row.ingrStdName || '').trim(),
          ingrInfo: String(row.ingrInfo || '').trim(),
          totqyCont: String(row.totqyCont || '').trim(),
        });
      }
    } catch {
      // ignore invalid JSON block
    }
  }
  return rows.length > 0 ? rows : null;
}

async function main() {
  const cachePath = path.join(rootDir, 'public', 'nedrug_cache.json');
  let staticCache = {};
  if (fs.existsSync(cachePath)) {
    try {
      staticCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      staticCache = {};
    }
  }

  const seedItemSeqs = new Set(['200400325', '202600394']);

  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDocs(collection(db, 'products'));
    console.log(`📦 Firestore 등록 제품 수: ${snap.size}개`);

    for (const docSnap of snap.docs) {
      const product = docSnap.data();
      if (product.classification !== 'OTC_DRUG') continue;

      const itemSeq = (product.otcDetail?.itemSeq || '').trim();
      if (!itemSeq || !/^\d{7,12}$/.test(itemSeq)) continue;

      seedItemSeqs.add(itemSeq);

      try {
        const rows = staticCache[itemSeq] || await fetchNedrugRows(itemSeq);
        if (rows && rows.length > 0) {
          staticCache[itemSeq] = rows;

          // 수입제품 여부 확인
          const isImported = (product.manufacturer || '').includes('수입');
          if (!isImported && Array.isArray(product.ingredients)) {
            let updatedCount = 0;
            const newIngredients = product.ingredients.map((ing) => {
              const normKor = (ing.koreanName || '').replace(/\s+/g, '');
              const matchedRow = rows.find((r) => {
                const rKor = (r.ingrName || '').replace(/\s+/g, '');
                return rKor && normKor && (rKor === normKor || rKor.includes(normKor) || normKor.includes(rKor));
              });
              if (matchedRow && matchedRow.ingrInfo) {
                const parsed = parseIngrInfoToFields(matchedRow.ingrInfo);
                if (parsed && (
                  ing.ingredientInfoText !== parsed.ingredientInfoText ||
                  ing.elementalAmount !== parsed.elementalAmount ||
                  ing.elementalLabel !== parsed.elementalLabel
                )) {
                  updatedCount++;
                  const nextIng = { ...ing, ingredientInfoText: parsed.ingredientInfoText };
                  if (parsed.elementalLabel !== undefined) nextIng.elementalLabel = parsed.elementalLabel;
                  if (parsed.elementalAmount !== undefined) nextIng.elementalAmount = parsed.elementalAmount;
                  if (parsed.elementalUnit !== undefined) nextIng.elementalUnit = parsed.elementalUnit;
                  return nextIng;
                }
              }
              return ing;
            });

            if (updatedCount > 0) {
              await setDoc(doc(db, 'products', product.id), {
                ...product,
                ingredients: newIngredients,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              console.log(`✅ Firestore 성분정보(ingrInfo) 원문 반영 완료: [${itemSeq}] ${product.productName} (${updatedCount}개 성분)`);
            } else {
              console.log(`✔ 이미 최신 상태: [${itemSeq}] ${product.productName}`);
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️ [${itemSeq}] ${product.productName} nedrug 동기화 실패:`, err.message);
      }
    }
  }

  for (const seq of seedItemSeqs) {
    if (!staticCache[seq]) {
      try {
        const rows = await fetchNedrugRows(seq);
        if (rows && rows.length > 0) {
          staticCache[seq] = rows;
          console.log(`✅ 정적 캐시 추가 완료: [${seq}]`);
        }
      } catch (err) {
        console.warn(`⚠️ [${seq}] 정적 캐시 수집 실패:`, err.message);
      }
    }
  }

  fs.writeFileSync(cachePath, JSON.stringify(staticCache, null, 2) + '\n', 'utf-8');
  console.log(`🎉 public/nedrug_cache.json 저장 완료 (${Object.keys(staticCache).length}개 품목)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(0);
});
