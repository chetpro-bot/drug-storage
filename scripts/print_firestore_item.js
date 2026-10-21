import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function check() {
  const d1 = await getDoc(doc(db, 'products', 'prod_1792314234034'));
  console.log("=== 리퀴드씨엠키즈 in Firestore ===");
  console.log(JSON.stringify(d1.data(), null, 2));

  const d2 = await getDoc(doc(db, 'products', 'prod_1792325941126'));
  console.log("\n=== 엠-드림 리퀴드 키즈 in Firestore ===");
  console.log(JSON.stringify(d2.data(), null, 2));
}

check().catch(console.error);
