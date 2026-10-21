import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDemoPharmacyApiKeyForDashboard_2026",
  authDomain: "drug-storage-175fe.firebaseapp.com",
  projectId: "drug-storage-175fe",
  storageBucket: "drug-storage-175fe.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const cmKidsApiText = [
  '■ 품목제조보고번호: 20090435035193',
  '■ 제품명: 리퀴드씨엠키즈',
  '■ 제조업소: 주식회사 아리너스',
  '■ 식품유형: 혼합음료',
  '■ 성상: 이미, 이취가 없고 특유의 향이 있는 노란색 젤 음료',
  '■ 섭취방법: 1일 2회, 1회 1포(25g)를 씹어서 섭취한다.',
  '■ 소비기한: 18개월',
  '■ 포장재질: PE',
  '■ 보고일자: 20190412 (최종수정: 20190417)',
  '■ 생산여부: 아니오'
].join('\n');

const mDreamKidsApiText = [
  '■ 품목제조보고번호: 20090435035379',
  '■ 제품명: 엠-드림 리퀴드 키즈(M-Dream Liquid Kids)',
  '■ 제조업소: 주식회사 아리너스',
  '■ 식품유형: 혼합음료',
  '■ 성상: 고유의 향미를 가지고 이미, 이취가 없는 연한 노란색의 액상',
  '■ 섭취방법: 개인의 취향에 따라 섭취하십시오.',
  '■ 소비기한: 제조일로부터 24개월',
  '■ 포장재질: 폴리프로필렌(PP), 폴리에틸렌(PE)',
  '■ 보고일자: 20241210 (최종수정: 20260415)',
  '■ 생산여부: 아니오'
].join('\n');

async function sync() {
  console.log("Updating prod_1792314234034 (리퀴드씨엠키즈)...");
  await updateDoc(doc(db, 'products', 'prod_1792314234034'), {
    'functionalFoodDetail.koreanLabelText': cmKidsApiText,
    'functionalFoodDetail.appearanceKorean': '이미, 이취가 없고 특유의 향이 있는 노란색 젤 음료',
    'functionalFoodDetail.suggestedUseKorean': '1일 2회, 1회 1포(25g)를 씹어서 섭취한다.'
  });

  console.log("Updating prod_1792325941126 (엠-드림 리퀴드 키즈)...");
  await updateDoc(doc(db, 'products', 'prod_1792325941126'), {
    'functionalFoodDetail.koreanLabelText': mDreamKidsApiText,
    'functionalFoodDetail.appearanceKorean': '고유의 향미를 가지고 이미, 이취가 없는 연한 노란색의 액상',
    'functionalFoodDetail.suggestedUseKorean': '개인의 취향에 따라 섭취하십시오.'
  });

  console.log("Firestore sync completed successfully!");
}

sync().catch(console.error);
