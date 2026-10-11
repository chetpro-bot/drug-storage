import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. package.json 읽기
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// 2. 패치 버전 자동 증가 (예: 1.0.0 -> 1.0.1)
const versionParts = pkg.version.split('.').map(Number);
versionParts[2] += 1; // patch 버전 +1
const newVersion = versionParts.join('.');
pkg.version = newVersion;

// package.json 저장
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
console.log(`\n🚀 [Release] 버전 자동 업데이트: v${newVersion}`);

// 3. src/version.ts 동기화
const versionTsPath = path.join(rootDir, 'src', 'version.ts');
fs.writeFileSync(versionTsPath, `export const APP_VERSION = '${newVersion}';\n`, 'utf-8');
console.log(`✅ [Release] src/version.ts 갱신 완료: v${newVersion}`);

// 4. 프로덕션 빌드 실행
console.log(`\n🔨 [Build] 프로덕션 빌드 진행 중...`);
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

// 5. Firebase Hosting 배포
console.log(`\n☁️  [Deploy] Firebase Hosting 배포 진행 중...`);
execSync('firebase deploy --only hosting', { stdio: 'inherit', cwd: rootDir });

// 6. GitHub 자동 커밋 및 푸시
console.log(`\n📦 [Git] GitHub 자동 버전 커밋 & 푸시 진행 중...`);
try {
  execSync('git add .', { stdio: 'inherit', cwd: rootDir });
  execSync(`git commit -m "chore(release): bump version to v${newVersion}"`, { stdio: 'inherit', cwd: rootDir });
  execSync('git push origin main', { stdio: 'inherit', cwd: rootDir });
  console.log(`🎉 [Success] GitHub v${newVersion} 푸시 완료!`);
} catch (gitErr) {
  console.warn(`⚠️ [Git] 커밋/푸시 중 알림:`, gitErr.message);
}

console.log(`\n========================================`);
console.log(`🎉 배포 및 버전 업그레이드 완료: v${newVersion}`);
console.log(`👉 공식 주소: https://drug-storage-175fe.web.app`);
console.log(`👉 깃허브: https://github.com/chetpro-bot/drug-storage`);
console.log(`========================================\n`);
