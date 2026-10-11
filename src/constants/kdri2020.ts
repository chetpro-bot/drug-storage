import { KdriReferenceValue } from '../types/kdri';

/**
 * 2020 한국인 영양소 섭취기준(KDRIs: Dietary Reference Intakes for Koreans) 주요 영양소 기준치
 * (기준: 만 19~49세 성인 기준)
 */
export const MOCK_KDRI_STANDARDS: KdriReferenceValue[] = [
  {
    nutrientKey: 'VITAMIN_B1',
    nutrientNameKorean: '비타민 B1 (Thiamine)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 1.0,
    rni: 1.2,
    // B1은 수용성으로 공식 UL 미설정이나 100mg 이상 복용 시 모니터링
    clinicalWarningThresholdNote: '수용성 비타민으로 체외 배설되나, 고함량 지속 복용 시 모니터링 권장'
  },
  {
    nutrientKey: 'VITAMIN_B6',
    nutrientNameKorean: '비타민 B6 (Pyridoxine)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 1.2,
    rni: 1.5,
    ul: 100, // KDRIs 성인 상한섭취량 100mg
    clinicalWarningThresholdNote: '장기적인 100mg/일 초과 섭취 시 감각신경병증(Sensory Neuropathy) 발생 위험'
  },
  {
    nutrientKey: 'VITAMIN_B12',
    nutrientNameKorean: '비타민 B12 (Cobalamin)',
    unit: 'ug',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 2.0,
    rni: 2.4,
    clinicalWarningThresholdNote: '수용성 비타민으로 체내 축적 독성이 극히 낮음'
  },
  {
    nutrientKey: 'VITAMIN_C',
    nutrientNameKorean: '비타민 C (Ascorbic acid)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 75,
    rni: 100,
    ul: 2000, // KDRIs 성인 상한섭취량 2000mg
    clinicalWarningThresholdNote: '2000mg/일 초과 섭취 시 삼투성 설사, 복통 및 신결석(Oxalate stone) 형성 위험 증가'
  },
  {
    nutrientKey: 'ZINC',
    nutrientNameKorean: '아연 (Zinc)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 7.0,
    rni: 10.0,
    ul: 35, // KDRIs 성인 상한섭취량 35mg
    clinicalWarningThresholdNote: '35mg/일 초과 섭취 시 구리(Copper) 결핍, 면역 기능 저하 및 HDL 콜레스테롤 감소'
  },
  {
    nutrientKey: 'MAGNESIUM',
    nutrientNameKorean: '마그네슘 (Magnesium)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 280,
    rni: 350,
    ul: 350, // 식품 외 영양제 형태(부가적 섭취량) 상한 350mg
    clinicalWarningThresholdNote: '영양제 형태 350mg/일 초과 시 삼투성 설사(Osmotic Diarrhea) 및 신기능 저하 환자의 고마그네슘혈증 위험'
  },
  {
    nutrientKey: 'CALCIUM',
    nutrientNameKorean: '칼슘 (Calcium)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 550,
    rni: 700,
    ul: 2500, // 상한섭취량 2500mg
    clinicalWarningThresholdNote: '2500mg/일 초과 시 고칼슘혈증, 신결석증 및 타 미네랄 흡수 억제'
  },
  {
    nutrientKey: 'IRON',
    nutrientNameKorean: '철 (Iron)',
    unit: 'mg',
    gender: 'ALL',
    minAge: 19,
    maxAge: 64,
    ear: 8.0,
    rni: 12.0,
    ul: 45, // 상한섭취량 45mg
    clinicalWarningThresholdNote: '45mg/일 초과 시 심각한 변비, 오심, 위장관 궤양 및 조직 내 철 침착 위험'
  }
];
