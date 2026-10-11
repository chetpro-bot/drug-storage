import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase 환경 구성 (Cloud Firestore 연동)
 * - 환경 변수(VITE_FIREBASE_...)가 있으면 이를 사용하고,
 *   미설정 시 약국 데모 프로젝트 설정으로 안전하게 초기화합니다.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoPharmacyApiKeyForDashboard_2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pharmassist-pro-dashboard.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pharmassist-pro-dashboard",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pharmassist-pro-dashboard.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475612",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475612:web:a9b8c7d6e5f4"
};

// 앱 초기화 (싱글톤)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Cloud Firestore 인스턴스
export const db: Firestore = getFirestore(app);

// 실제 프로젝트 설정 연결 여부 확인
export const isLiveFirebaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
};

export default app;
