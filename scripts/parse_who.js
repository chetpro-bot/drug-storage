import fs from 'fs';

const text = fs.readFileSync('who_children_formulary_2010.txt', 'utf8');
const lines = text.split(/\r?\n/);
console.log('Total lines:', lines.length);

const targets = ['AMOXICILLIN', 'PARACETAMOL', 'IBUPROFEN', 'AZITHROMYCIN', 'AMOXICILLIN + CLAVULANIC ACID'];

lines.forEach((line, idx) => {
  const trimmed = line.trim().toUpperCase();
  if (targets.includes(trimmed)) {
    console.log(`--- Line ${idx}: [${line.trim()}] ---`);
    for (let i = Math.max(0, idx - 3); i < Math.min(lines.length, idx + 25); i++) {
      console.log(`  ${i}: ${lines[i]}`);
    }
  }
});
