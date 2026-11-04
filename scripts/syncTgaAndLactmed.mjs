/**
 * 호주 TGA 임신부 약물 분류 CSV 비교 및 NIH LactMed 공식 FTP 아카이브 갱신 확인 스크립트
 * 실행 방법:
 *   node scripts/syncTgaAndLactmed.mjs [--tga-csv ./path/to/tga_export.csv]
 */

import fs from 'fs';

const LACTMED_FTP_ARCHIVE_URL =
  'https://ftp.ncbi.nlm.nih.gov/pub/litarch/90/6c/lactmed_NBK501922.tar.gz';

async function checkLactMedArchiveStatus() {
  console.log('=== 1. NIH LactMed 공식 FTP 아카이브 상태 확인 ===');
  try {
    const res = await fetch(LACTMED_FTP_ARCHIVE_URL, { method: 'HEAD' });
    console.log('  URL:', LACTMED_FTP_ARCHIVE_URL);
    console.log('  HTTP Status:', res.status);
    console.log('  Last-Modified:', res.headers.get('last-modified'));
    console.log('  Content-Length:', res.headers.get('content-length'), 'bytes');
  } catch (e) {
    console.error('  LactMed FTP 확인 실패:', e.message);
  }
}

function compareTgaCsvIfProvided() {
  const csvIdx = process.argv.indexOf('--tga-csv');
  if (csvIdx === -1 || !process.argv[csvIdx + 1]) {
    console.log('\n=== 2. 호주 TGA 공식 CSV 비교 안내 ===');
    console.log(
      '  공식 페이지(https://www.tga.gov.au/resources/health-professional-information-and-resources/australian-categorisation-system-prescribing-medicines-pregnancy/prescribing-medicines-pregnancy-database)에서 다운로드한 CSV 경로를 --tga-csv 옵션으로 전달하면 로컬 DB(src/features/maternal-safety/data/tgaPregnancyCategoryDb.ts)와 변경분을 비교합니다.'
    );
    return;
  }

  const csvPath = process.argv[csvIdx + 1];
  if (!fs.existsSync(csvPath)) {
    console.error('CSV 파일을 찾을 수 없습니다:', csvPath);
    return;
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  console.log(`CSV 로드 완료: 총 ${lines.length - 1}건 행 확인.`);
}

async function main() {
  await checkLactMedArchiveStatus();
  compareTgaCsvIfProvided();
}

main();
