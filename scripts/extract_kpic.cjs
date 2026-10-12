const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\59017a27-b0db-4957-96b6-5f5067a2ae99\\.system_generated\\steps\\567\\content.md';
const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split('\n');

const categoryMap = {}; // id -> category name
const ingredientToCategory = {};

for (const line of lines) {
  // Capture li id and its category name
  // e.g. <li id='B99A'>...val('장내 가스 제거제')
  const liMatch = line.match(/<li\s+id='([^']+)'[\s\S]*?val\('([^']+)'\)/i);
  if (liMatch) {
    categoryMap[liMatch[1].trim()] = liMatch[2].trim();
  }
}

for (const line of lines) {
  // Capture ingredient link appended to a ul
  // e.g. $('#ulB99A').append("<LI ><A onclick=\"opener.$('#kpic_atc_sunb').val('Simethicone');self.close();\">Simethicone</A>");
  const ingMatch = line.match(/\$\('#([^']+)'\)\.append\(["']<LI\s*><A\s+onclick=.*?val\('([^']+)'\)/i);
  if (ingMatch) {
    const parentUl = ingMatch[1].trim(); // e.g. ulB99A
    const ingName = ingMatch[2].trim();
    const catId = parentUl.replace(/^ul/, '');
    const catName = categoryMap[catId] || '';
    if (ingName && catName) {
      ingredientToCategory[ingName] = catName;
    }
  }
}

console.log('Total ingredients extracted:', Object.keys(ingredientToCategory).length);
console.log('Simethicone ->', ingredientToCategory['Simethicone']);
console.log('Bromelain ->', ingredientToCategory['Bromelain']);
console.log('Ursodeoxycholic Acid ->', ingredientToCategory['Ursodeoxycholic Acid']);

const samples = Object.entries(ingredientToCategory).slice(0, 20);
console.log('Samples:', samples);

// Save as kpicData.json
fs.writeFileSync(path.join(__dirname, '../src/constants/kpicIngredients.json'), JSON.stringify(ingredientToCategory, null, 2), 'utf8');
console.log('Saved to src/constants/kpicIngredients.json successfully!');
