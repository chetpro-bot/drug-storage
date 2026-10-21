import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  const snap = await getDocs(collection(db, 'products'));
  console.log(`Total products: ${snap.size}`);
  snap.forEach(doc => {
    const data = doc.data();
    if (data.productName && (data.productName.includes('리퀴드') || data.productName.includes('엠드림') || data.productName.includes('씨엠'))) {
      console.log(`- ID: ${doc.id}, Name: ${data.productName}, Class: ${data.classification}, RegCode: ${data.otcDetail?.itemSeq || data.functionalFoodDetail?.reportNo}, koreanLabelLen: ${(data.functionalFoodDetail?.koreanLabelText || data.koreanLabelText || '').length}`);
    }
  });
}

check().catch(console.error);
