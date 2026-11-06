import fs from 'fs';

const text = fs.readFileSync('who_children_formulary_2010.txt', 'utf8');

function findDrug(name) {
  const re = new RegExp(`\\n(${name})\\r?\\n`, 'i');
  const match = re.exec(text);
  if (!match) {
    console.log(`Drug not found: ${name}`);
    return;
  }
  const start = match.index;
  const chunk = text.slice(start, start + 3000);
  console.log(`=== FOUND: ${name} ===`);
  console.log(chunk.slice(0, 1500));
}

['Amoxicillin', 'Paracetamol', 'Azithromycin', 'Amoxicillin + clavulanic acid'].forEach(findDrug);
