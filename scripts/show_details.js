import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/raw_results.json', 'utf-8'));
console.log("=== 리퀴드씨엠키즈 I1250 RAW DATA ===");
console.log(JSON.stringify(data["리퀴드씨엠키즈_I1250"], null, 2));

console.log("\n=== 리퀴드씨엠 C003 RAW DATA (참고) ===");
console.log(JSON.stringify(data["리퀴드씨엠_C003"], null, 2));
