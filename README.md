# 💊 PharmAssist Pro (약국 영양제 & OTC 복약 상담 대시보드)

PC(1920x1080 와이드) 기반 약국 영양제 및 일반의약품(OTC) 관리 & 실시간 복약 상담 대시보드 시스템입니다.

## 🚀 주요 핵심 기능
1. **국제 표준 성분 체계**:
   - 모든 유효 성분명은 영문 표준 명칭(English INN: International Nonproprietary Name) 표기 원칙 준수.
   - 화학적 형태/염(Form: Oxide vs Gluconate/Bisglycinate 등) 및 순수 원소량(Elemental amount) 자동 환산.
2. **식약처·식품안전나라 공공데이터 수집 & 2단계 약사 검수(Verification)**:
   - 의약품안전나라 및 식품안전나라 품목신고 규격 원문 정규식 파싱.
   - 테이블 인터페이스에서 약사가 성분명, 함량, 염, MOA(Mechanism of Action)를 인라인 검수 후 클라우드 저장.
3. **한국인 영양소 섭취기준(KDRIs 2020) & 임상 안전 패널**:
   - 성인 기준 권장섭취량(RNI) 달성률 % 프로그레스 차트.
   - 상한섭취량(UL: Tolerable Upper Intake Level) 3단계 안전성 판정 (통과 / 근접 주의 / 초과 경고).
   - 다가 양이온 킬레이션(Polyvalent Cation Chelation: 항생제, 갑상선호르몬제 등) 처방약 상호작용(DDI) 실시간 감지.
4. **Cloud Firestore 기반 약국 ↔ 집 실시간 동기화**:
   - `onSnapshot` 리스너를 통해 어느 한 PC에서 제품을 등록/수정/삭제 시 다른 모든 화면이 새로고침 없이 즉시 갱신.
   - 로컬 브라우저 영속화(`localStorage`) 지원.

## 🛠️ 기술 스택
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite, Lucide Icons, Zustand
- **Backend / Database**: Google Firebase (Cloud Firestore, Cloud Functions, Firebase Hosting)

## 💻 로컬 개발 환경 실행
```bash
# 패키지 설치
npm install

# 로컬 개발 서버 기동 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build
```

## 🌐 클라우드 배포 (Firebase Hosting)
```bash
npm run deploy
```
- 공식 배포 주소: [https://drug-storage-175fe.web.app](https://drug-storage-175fe.web.app)
