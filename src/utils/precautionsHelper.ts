/**
 * 사용상의 주의사항 허가 전문 및 요약 분석 헬퍼
 * - 복약지도 핵심 기준(연령금기, 임부/수유부 금기, 약과 병용 금기 성분, 주요 기저질환) 추출
 * - 연령금기는 식약처/식품안전나라 주의사항 전문에서 최우선 순위로 추출하여 항상 맨 처음에 배치
 * - 전문에 연령금기가 언급되지 않은 경우 공란(undefined) 처리
 */

export interface PrecautionsSummaryResult {
  ageContraindication?: string; // 1. 연령 금기 (최우선 배치)
  pregnancyContraindication?: string; // 2. 임부 및 수유부 금기
  drugInteractions: string[]; // 3. 약물 및 병용 금기/주의 성분
  generalWarning?: string; // 4. 주요 기저질환/투여 금기
}

/**
 * 식약처 의약품안전나라(NB_DOC_DATA) 및 식품안전나라(IFTKN_ATNT_MATR_CN) 주의사항 전문에서
 * 연령 금기(만 X개월 미만의 젖먹이, 3개월 미만의 영아, 2세 미만의 소아 등) 정밀 추출
 */
export function extractAgeContraindication(input?: string | string[] | null): string | undefined {
  if (!input) return undefined;
  const text = Array.isArray(input) ? input.join('\n') : String(input);
  if (!text || text.includes('첨부문서 참조')) return undefined;

  const lines = text.split(/\r?\n/);
  let inContraindicationSection = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // 대항목 섹션 헤더 식별 (예: "■ 1. 다음과 같은 사람은 이 약을 복용하지 말 것", "1. 다음 환자에는 투여하지 말 것")
    const isMajorSectionHeader = /^[■▶●◆★▪※]?\s*(?:\d+\s*\.|\[\s*\d+\s*\])/.test(line) || /^[■▶●◆★▪※]/.test(line);

    if (isMajorSectionHeader && /(?:복용|투여|섭취)[^\n]*?(?:하지\s*말|금지|불가|않는다)/i.test(line)) {
      if (/다음(?:과\s*같은)?\s*(?:사람|환자|경우|자)|금기|경고/i.test(line) || /^[■▶●◆★▪※\d\.\s\-\)]+/.test(line)) {
        inContraindicationSection = true;
        continue;
      }
    }

    // 대항목 섹션 종료 감지 (예: "■ 2. 이 약을 복용하는 동안...", "2. 다음과 같은 사람은 복용하기 전에 의사, 약사와 상의할 것")
    if (inContraindicationSection && isMajorSectionHeader) {
      if (
        !/(?:하지\s*말|금지|불가|금기)/i.test(line) ||
        /복용하기\s*전에|상의|상담|주의|신중/i.test(line) ||
        /복용하는\s*동안\s*다음의\s*약/i.test(line)
      ) {
        inContraindicationSection = false;
      }
    }

    // 보관방법 문구 제외 (예: "어린이의 손이 닿지 않는 곳에 보관할 것")
    if (/손(?:이|에)?\s*닿지\s*않/i.test(line)) continue;

    // 단순 성인 용법 문구 제외 (예: "만 19세 이상 및 성인: 1일 1회 복용")
    if (/(?:이상|성인)[^\n]*?(?:복용|투여|섭취)(?:하십시오|한다|\s*$)/i.test(line) && !/미만|이하|금기|하지\s*말/i.test(line)) {
      continue;
    }

    // 1) 복용/투여 금기 섹션(Section 1) 내부 항목 검색
    if (inContraindicationSection) {
      // 패턴 1: 만 X개월/세/돌 미만/이하 (젖먹이/영아/소아/유아/어린이)
      const m1 = line.match(/(?:^|\d+[\.\)]\s*|\-\s*)(만\s*\d+\s*(?:개월|세|돌|주)\s*(?:미만|이하)(?:의)?\s*(?:젖먹이|영아|소아|유아|어린이|환자|영[·ㆍ\.]?유아)?)/i);
      if (m1) {
        return `${m1[1].trim()}: 복용 금기`;
      }

      // 패턴 2: X개월/세/돌 미만/이하
      const m2 = line.match(/(?:^|\d+[\.\)]\s*|\-\s*)(\d+\s*(?:개월|세|돌|주)\s*(?:미만|이하)(?:의)?\s*(?:젖먹이|영아|소아|유아|어린이|환자|영[·ㆍ\.]?유아)?)/i);
      if (m2) {
        return `${m2[1].trim()}: 복용 금기`;
      }

      // 패턴 3: 소아(15세 미만) 등
      const m3 = line.match(/(?:^|\d+[\.\)]\s*|\-\s*)(소아\s*\(\s*(?:만\s*)?\d+\s*세\s*미만\s*\))/i);
      if (m3) {
        return `${m3[1].trim()}: 복용 금기`;
      }

      // 패턴 4: 신생아, 미숙아
      const m4 = line.match(/(?:^|\d+[\.\)]\s*|\-\s*)((?:신생아|미숙아)(?:[,\s·ㆍ\.]+미숙아|[,\s·ㆍ\.]+신생아)?)/i);
      if (m4) {
        return `${m4[1].trim()}: 투여 금기`;
      }

      // 패턴 5: 영유아
      const m5 = line.match(/(?:^|\d+[\.\)]\s*|\-\s*)(영[·ㆍ\.]?유아|영유아)/i);
      if (m5) {
        return `${m5[1].trim()}: 복용 금기`;
      }
    }

    // 2) 줄 단위 인라인 금기 문장 (본문 어디든 명시적인 금기 문구가 있을 때)
    // 예: "만 12개월 미만의 젖먹이에게는 투여하지 말 것", "만 12세 미만 소아 복용 금지"
    const inlineM1 =
      line.match(/(?:^|\d+[\.\)]\s*|\-\s*)(만\s*\d+\s*(?:개월|세|돌|주)\s*(?:미만|이하)(?:의)?\s*(?:젖먹이|영아|소아|유아|어린이|환자|영[·ㆍ\.]?유아)?)[^\n\.,]*?(?:투여하지\s*말|복용하지\s*말|섭취하지\s*말|복용\s*금지|투여\s*금지|섭취\s*금지|복용하지\s*않는다|투여하지\s*않는다|섭취하지\s*않는다|섭취를\s*피할|섭취를\s*삼갈)/i) ||
      line.match(/(?:^|\d+[\.\)]\s*|\-\s*)(\d+\s*(?:개월|세|돌|주)\s*(?:미만|이하)(?:의)?\s*(?:젖먹이|영아|소아|유아|어린이|환자|영[·ㆍ\.]?유아)?)[^\n\.,]*?(?:투여하지\s*말|복용하지\s*말|섭취하지\s*말|복용\s*금지|투여\s*금지|섭취\s*금지|복용하지\s*않는다|투여하지\s*않는다|섭취하지\s*않는다|섭취를\s*피할|섭취를\s*삼갈)/i);

    if (inlineM1) {
      return `${inlineM1[1].trim()}: 복용 금기`;
    }

    // 건기식 표준 문구 패턴: "영유아, 어린이, 임산부 및 수유부는 섭취를 피할 것"
    if (/(?:영[·ㆍ\.]?유아|영유아|어린이|미숙아|신생아)[^\n]*?(?:섭취를\s*피할|섭취를\s*삼갈|섭취하지\s*말|투여하지\s*말|복용하지\s*말)/i.test(line)) {
      if (/영[·ㆍ\.]?유아[^\n]*?어린이|어린이[^\n]*?영[·ㆍ\.]?유아/i.test(line)) {
        return '영유아 및 어린이: 섭취 주의/금기';
      }
      if (/영[·ㆍ\.]?유아|영유아/i.test(line)) {
        return '영·유아: 섭취 피할 것';
      }
      if (/어린이/i.test(line)) {
        return '어린이: 섭취 피할 것';
      }
    }
  }

  return undefined;
}

/**
 * 복약지도 핵심 기준(연령금기 최우선, 임부/수유부 금기, 약과 병용 금기 성분, 주요 기저질환)으로 주의사항 전문 요약
 */
export function summarizePrecautions(rawLines: string[], additionalText?: string): PrecautionsSummaryResult {
  const combinedLines = [...(rawLines || [])];
  if (additionalText) {
    combinedLines.push(additionalText);
  }
  const fullText = combinedLines.join('\n');

  const result: PrecautionsSummaryResult = {
    drugInteractions: []
  };

  if (!fullText || fullText.includes('첨부문서 참조')) {
    return result;
  }

  // 1. 연령 금기 추출 (가장 최우선 순위 배치)
  result.ageContraindication = extractAgeContraindication(combinedLines);

  // 2. 임부 및 수유부 금기/주의 추출
  if (/임부|임신하고\s*있을\s*가능성|수유부/i.test(fullText)) {
    if (/임부[^\n\.]*?(?:투여하지\s*말|복용하지\s*말|금기)/i.test(fullText)) {
      result.pregnancyContraindication = '임부 또는 임신 가능성 여성: 복용 금기';
    } else if (/비타민\s*A[^\n\.]*?5,000\s*IU|기형아/i.test(fullText)) {
      result.pregnancyContraindication = '임부(임신 3개월 이내 또는 임신 계획 여성): 비타민 A 1일 5,000 IU 이상 투여 금지(기형 유발 위험)';
    } else if (/수유부[^\n\.]*?(?:투여하지\s*말|복용하지\s*말)/i.test(fullText)) {
      result.pregnancyContraindication = '임부 및 수유부: 복용 전 의사/약사 상담 필수 (모유로 이행 가능)';
    } else {
      result.pregnancyContraindication = '임부 및 수유부: 복용 전 전문가 상담 필수 (고함량 복용 주의)';
    }
  }

  // 3. 약물 병용 금기 성분 위주 추출
  // 레보도파
  if (/레보도파|levodopa/i.test(fullText)) {
    result.drugInteractions.push(
      '레보도파(Levodopa): 병용 금기 (피리독신이 레보도파의 말초 대사를 촉진하여 약효를 현저히 감소시킴)'
    );
  }
  // 테트라사이클린계 항생제
  if (/테트라사이클린|미노씬|독시사이클린|tetracycline/i.test(fullText)) {
    result.drugInteractions.push(
      '테트라사이클린(Tetracycline)계 항생제: 병용 주의 (미네랄과 착염 형성으로 흡수 저하, 2~4시간 간격 복용)'
    );
  }
  // 퀴놀론계/플루오로퀴놀론계 항생제
  if (/플루오로퀴놀론|퀴놀론|ciprofloxacin|levofloxacin|norfloxacin/i.test(fullText)) {
    result.drugInteractions.push(
      '퀴놀론(Quinolone)계 항생제: 병용 주의 (금속 이온 킬레이션으로 항생제 흡수 방해, 최소 2시간 이상 간격 복용)'
    );
  }
  // 제산제, 칼슘/철분제제
  if (/제산제|위산중화제|칼슘제|철분제제/i.test(fullText)) {
    if (!result.drugInteractions.some(d => d.includes('제산제'))) {
      result.drugInteractions.push(
        '제산제 및 위장약: 제산제 복용 시 위내 pH 상승 및 킬레이트로 흡수율 변동 가능 (1~2시간 간격 권장)'
      );
    }
  }
  // 항응고제 / 와파린
  if (/와파린|항응고제|warfarin/i.test(fullText)) {
    result.drugInteractions.push(
      '항응고제(와파린 등): 비타민 K 또는 고함량 비타민 E 병용 시 혈액응고 인자 변동 주의'
    );
  }
  // 에스트로겐/경구피임약
  if (/에스트로겐|경구피임약/i.test(fullText)) {
    result.drugInteractions.push(
      '에스트로겐 함유 경구피임약: 복용 여성은 혈전증 유발 위험 증가 주의'
    );
  }

  // 4. 일반 주요 금기 질환
  const warnings: string[] = [];
  if (/고칼슘혈증/i.test(fullText)) warnings.push('고칼슘혈증 환자');
  if (/신장결석/i.test(fullText)) warnings.push('신장결석 환자');
  if (/신부전/i.test(fullText)) warnings.push('심한 신부전 환자');
  if (/대두유|콩\s*또는\s*땅콩|땅콩에\s*과민/i.test(fullText)) warnings.push('대두유·콩·땅콩 과민증 환자');

  if (warnings.length > 0) {
    result.generalWarning = `${warnings.join(', ')}는 복용 금기`;
  }

  return result;
}

/**
 * 전문보기 팝업 모달에서 형광펜 하이라이트할 핵심 키워드 리스트 생성
 */
export function getPrecautionHighlightKeywords(summarized: PrecautionsSummaryResult): string[] {
  const keywords: string[] = [];

  if (summarized.ageContraindication) {
    // ": 복용 금기", "(복용 금기)" 등 부가 설명 제거 후 순수 연령 대상어 추출
    const rawAge = summarized.ageContraindication
      .replace(/:\s*복용\s*금기|:\s*투여\s*금기|\(복용\s*금기\)|\(투여\s*금기\)/g, '')
      .trim();

    if (rawAge) keywords.push(rawAge);

    const m = rawAge.match(/(?:만\s*)?\d+\s*(?:개월|세|돌|주)\s*(?:미만|이하)/);
    if (m) keywords.push(m[0]);

    if (/젖먹이/.test(rawAge)) keywords.push('젖먹이');
    if (/영아/.test(rawAge)) keywords.push('영아');
    if (/소아/.test(rawAge)) keywords.push('소아');
    if (/유아/.test(rawAge)) keywords.push('유아');
    if (/영[·ㆍ\.]?유아|영유아/.test(rawAge)) keywords.push('영유아', '영·유아');
    if (/신생아/.test(rawAge)) keywords.push('신생아');
    if (/미숙아/.test(rawAge)) keywords.push('미숙아');
    if (/어린이/.test(rawAge)) keywords.push('어린이');
  }

  keywords.push('임부', '수유부', '레보도파', 'Levodopa', '테트라사이클린', '제산제', '와파린');

  if (summarized.generalWarning) {
    if (summarized.generalWarning.includes('고칼슘혈증')) keywords.push('고칼슘혈증');
    if (summarized.generalWarning.includes('신장결석')) keywords.push('신장결석');
    if (summarized.generalWarning.includes('신부전')) keywords.push('신부전');
    if (summarized.generalWarning.includes('대두유')) keywords.push('대두유', '땅콩');
  }

  return keywords;
}
