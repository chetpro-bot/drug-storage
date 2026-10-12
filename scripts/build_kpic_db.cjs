const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\59017a27-b0db-4957-96b6-5f5067a2ae99\\.system_generated\\steps\\567\\content.md';
const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split('\n');

const categoryMap = {}; // liId -> categoryName

for (const line of lines) {
  const m = line.match(/<li\s+id='([^']+)'[\s\S]*?val\('([^']+)'\)/i);
  if (m) {
    const id = m[1].trim();
    const name = m[2].trim();
    if (name) categoryMap[id] = name;
  }
}

const ingMap = {};

for (const line of lines) {
  const m = line.match(/\$\('#([^']+)'\)\.append\(.*?val\('([^']+)'\)/i);
  if (m) {
    const ulId = m[1].trim();
    const ingName = m[2].trim();
    const catId = ulId.replace(/^ul/, '');
    const catName = categoryMap[catId];

    if (catName) {
      // Prioritize specific category over generic '기타'
      if (!ingMap[ingName] || (ingMap[ingName] === '기타' && catName !== '기타')) {
        ingMap[ingName] = catName;
      }
    }
  }
}

// Clean and normalize keys
const normalizedMap = {};
for (const [k, v] of Object.entries(ingMap)) {
  normalizedMap[k] = v;
  // Also add version without parentheses, e.g. "Ursodeoxycholic Acid(Udca)" -> "Ursodeoxycholic Acid"
  const cleanK = k.replace(/\([^\)]*\)/g, '').trim();
  if (cleanK && cleanK !== k && !normalizedMap[cleanK]) {
    normalizedMap[cleanK] = v;
  }
}

// Extra major OTC digestion ingredients manual additions
if (!normalizedMap['Diastase · Protease · Cellulase']) normalizedMap['Diastase · Protease · Cellulase'] = '소화효소제';
if (!normalizedMap['Diastase·Protease·Cellulase']) normalizedMap['Diastase·Protease·Cellulase'] = '소화효소제';
if (!normalizedMap['Diastase · Protease 100']) normalizedMap['Diastase · Protease 100'] = '소화효소제';
if (!normalizedMap['Diastase·Protease100']) normalizedMap['Diastase·Protease100'] = '소화효소제';
if (!normalizedMap['Panprosin']) normalizedMap['Panprosin'] = '소화효소제';
if (!normalizedMap['Pancellase']) normalizedMap['Pancellase'] = '소화효소제';
if (!normalizedMap['Crease-PEG']) normalizedMap['Crease-PEG'] = '소화효소제';
if (!normalizedMap['크리아제-PEG']) normalizedMap['크리아제-PEG'] = '소화효소제';
if (!normalizedMap['판크레아틴장용과립']) normalizedMap['판크레아틴장용과립'] = '소화효소제';

const outPath = path.join(__dirname, '../src/constants/kpicMasterDatabase.json');
fs.writeFileSync(outPath, JSON.stringify(normalizedMap, null, 2), 'utf8');

console.log('Successfully built kpicMasterDatabase.json with', Object.keys(normalizedMap).length, 'ingredients!');
console.log('Sample checks:');
console.log('Diastase:', normalizedMap['Diastase']);
console.log('Simethicone:', normalizedMap['Simethicone']);
console.log('Ursodeoxycholic Acid:', normalizedMap['Ursodeoxycholic Acid']);
console.log('Bromelain:', normalizedMap['Bromelain']);
console.log('Benfotiamine:', normalizedMap['Benfotiamine']);
