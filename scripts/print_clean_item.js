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
  const data1 = { ...d1.data() };
  delete data1.photos;
  delete data1.labelOcrSnapshot;
  console.log("=== 리퀴드씨엠키즈 ===");
  console.log(JSON.stringify(data1, null, 2));

  const d2 = await getDoc(doc(db, 'products', 'prod_1792325941126'));
  const data2 = { ...d2.data() };
  delete data2.photos;
  delete data2.labelOcrSnapshot;
  console.log("\n=== 엠-드림 리퀴드 키즈 ===");
  console.log(JSON.stringify(data2, null, 2));
}

check().catch(console.error);
