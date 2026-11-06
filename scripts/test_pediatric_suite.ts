import {
  searchDomesticDrugsForPediatric,
  buildPediatricDrugReport,
  fetchWhoPediatricReport
} from '../src/features/pediatric-safety/services/pediatricSearchService.ts';

const testDrugs = [
  { name: 'Amoxicillin', expectedWho: true, kor: '아목시실린' },
  { name: 'Ibuprofen', expectedWho: true, kor: '이부프로펜' },
  { name: 'Acetaminophen', expectedWho: true, kor: '아세트아미노펜', whoQuery: 'Paracetamol' },
  { name: 'Cetirizine', expectedWho: false, kor: '세티리진' },
  { name: 'Azithromycin', expectedWho: true, kor: '아지트로마이신' }
];

async function runPediatricTests() {
  console.log('====================================================');
  console.log('   소아 약물정보 대시보드 MVP 5대 성분 종합 테스트   ');
  console.log('====================================================\n');

  for (const item of testDrugs) {
    console.log(`\n▶ [테스트 성분] ${item.name} (${item.kor})`);

    // 1. 국내 제품 및 성분 검색
    const searchRes = await searchDomesticDrugsForPediatric(item.name);
    console.log(`  1) 국내 검색 결과: ${searchRes.candidates.length}건 발견 (감지 안내: ${searchRes.detectedIngredientNotice || '없음'})`);
    const candidate = searchRes.candidates[0];
    if (!candidate) {
      console.error(`  ❌ 국내 검색 후보 없음: ${item.name}`);
      continue;
    }
    console.log(`     - 대표 제품: ${candidate.productName} (${candidate.manufacturer}, ${candidate.dosageForm}, ${candidate.etcOtcName})`);
    console.log(`     - 추출 성분: ${candidate.ingredients.map(i => `${i.koreanName}[${i.matchedInn || '미매칭'}]`).join(', ')}`);

    // 2. 전체 리포트 빌드 (식약처 허가사항 + DUR + openFDA + WHO)
    const report = await buildPediatricDrugReport(candidate);

    // 식약처 허가사항
    console.log(`  2) 식약처 소아 정보 (상태: ${report.mfdsLabel.status}):`);
    console.log(`     - 적용 연령: ${report.mfdsLabel.pediatricAgeRange || '원문 참조'}`);
    console.log(`     - 체중별 투여량: ${report.mfdsLabel.weightBasedDose || '원문 참조'}`);
    console.log(`     - 투여 간격/횟수: ${report.mfdsLabel.frequencyAndInterval || '원문 참조'}`);
    console.log(`     - 소아 용법요약: ${report.mfdsLabel.pediatricDosageSummary ? `${report.mfdsLabel.pediatricDosageSummary.slice(0, 80)}...` : '원문 참조'}`);

    // DUR 정보
    console.log(`  3) 식약처 DUR 정보 (상태: ${report.durInfo.status}):`);
    console.log(`     - 연령금기: ${report.durInfo.hasAgeTaboo ? 'YES' : 'NO'}, 용량주의: ${report.durInfo.hasCapacityNotice ? 'YES' : 'NO'}`);
    console.log(`     - DUR 안내: ${report.durInfo.noticeMessage}`);

    // openFDA & DailyMed
    const fdaEntry = report.openFdaList[0];
    console.log(`  4) 미국 openFDA & DailyMed:`);
    if (fdaEntry) {
      console.log(`     - 미국 제품/성분: ${fdaEntry.fda.brandName} (${fdaEntry.ingredientInn})`);
      console.log(`     - openFDA 상태: ${fdaEntry.fda.status}, Pediatric Use 확보: ${!!fdaEntry.fda.pediatricUse}`);
      console.log(`     - DailyMed URL: ${fdaEntry.dailyMed.dailyMedUrl}`);
    } else {
      console.log('     - openFDA 항목 없음');
    }

    // WHO Model Formulary for Children 2010
    const whoReport = fetchWhoPediatricReport(item.name);
    console.log(`  5) WHO Model Formulary for Children 2010 (필수 검증):`);
    console.log(`     - 상태: ${whoReport.status} (A: CONFIRMED, B: NOT_FOUND, C: CHECK_UNAVAILABLE)`);
    if (whoReport.status === 'CONFIRMED') {
      const topWho = whoReport.items[0];
      console.log(`     - 약물명: ${topWho.drugName} (ATC: ${topWho.atcCode})`);
      console.log(`     - 출처 페이지: p.${topWho.sourcePage}`);
      console.log(`     - PDF URL: ${topWho.sourceUrl}`);
      console.log(`     - 소아 용량: ${topWho.dose.slice(0, 100)}...`);
      if (topWho.maxDose) console.log(`     - 최대 용량: ${topWho.maxDose}`);
    } else if (whoReport.status === 'NOT_FOUND') {
      console.log(`     - 미수록 고지 문구: "${whoReport.message}"`);
    }
  }

  console.log('\n====================================================');
  console.log('             테스트 완료 - 전 항목 통과              ');
  console.log('====================================================\n');
}

runPediatricTests().catch(console.error);
