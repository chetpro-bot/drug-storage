const fs = require('fs');
const path = require('path');

const replacements = [
  ['비\ufffd\ufffd\ufffd\ufffd민K 제제', '비타민K 제제'],
  ['비민K 제제', '비타민K 제제'],
  ['\ufffd\ufffd염성질환', '감염성질환'],
  ['염성질환', '감염성질환'],
  ['\ufffd\ufffd\ufffd기능 개선제 (치매 치료 포함)', '뇌기능 개선제 (치매 치료 포함)'],
  ['기능 개선제 (치매 치료 포함)', '뇌기능 개선제 (치매 치료 포함)'],
  ['비뇨\ufffd\ufffd식기계질환', '비뇨생식기계질환'],
  ['비뇨식기계질환', '비뇨생식기계질환'],
  ['통증 \ufffd\ufffd환', '통증 질환'],
  ['통증 환', '통증 질환'],
  ['알킬\ufffd\ufffd\ufffd제', '알킬화제'],
  ['알킬제', '알킬화제'],
  ['호르몬성 항암\ufffd\ufffd', '호르몬성 항암제'],
  ['호르몬성 항암', '호르몬성 항암제'],
  ['면\ufffd\ufffd\ufffd제제', '면역제제'],
  ['면제제', '면역제제'],
  ['무기질(Mineral) 제\ufffd\ufffd\ufffd', '무기질(Mineral) 제제'],
  ['무기질(Mineral) 제', '무기질(Mineral) 제제'],
  ['진단용방사성의\ufffd\ufffd\ufffd품', '진단용방사성의약품'],
  ['진단용방사성의품', '진단용방사성의약품'],
  ['소\ufffd\ufffd\ufffd기계질환', '소화기계질환'],
  ['소기계질환', '소화기계질환'],
  ['비필\ufffd\ufffd 아미노산제제', '비필수 아미노산제제'],
  ['비필 아미노산제제', '비필수 아미노산제제'],
  ['암 및 면\ufffd\ufffd\ufffd 관련 질환', '암 및 면역 관련 질환'],
  ['암 및 면 관련 질환', '암 및 면역 관련 질환'],
  ['골다공증 치료제 (파제트병,고칼슘혈증 포\ufffd\ufffd\ufffd)', '골다공증 치료제 (파제트병,고칼슘혈증 포함)'],
  ['골다공증 치료제 (파제트병,고칼슘혈증 포)', '골다공증 치료제 (파제트병,고칼슘혈증 포함)'],
  ['눈ㆍ귀ㆍ치과ㆍ구강용 약\ufffd\ufffd\ufffd', '눈ㆍ귀ㆍ치과ㆍ구강용 약물'],
  ['눈ㆍ귀ㆍ치과ㆍ구강용 약', '눈ㆍ귀ㆍ치과ㆍ구강용 약물'],
  ['근골\ufffd\ufffd계/결합조직질환', '근골격계/결합조직질환'],
  ['근골계/결합조직질환', '근골격계/결합조직질환'],
  ['기타 약\ufffd\ufffd\ufffd', '기타 약물'],
  ['기타 약', '기타 약물'],
  ['\ufffd\ufffd타-차단제', '베타-차단제'],
  ['타-차단제', '베타-차단제'],
  ['HER2 표적\ufffd\ufffd\ufffd료제', 'HER2 표적치료제'],
  ['HER2 표적료제', 'HER2 표적치료제']
];

const targetFiles = [
  path.join(__dirname, '../src/constants/kpicLiveDump.json'),
  path.join(__dirname, '../src/constants/kpicDetailedIngredients.json'),
  path.join(__dirname, '../src/constants/kpicMasterDatabase.json')
];

for (const filePath of targetFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let replacedCount = 0;
  for (const [bad, good] of replacements) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      replacedCount++;
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Cleaned ${filePath}: ${replacedCount} rules applied.`);
}
