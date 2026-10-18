import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { db, isLiveFirebaseConfigured } from './firebase';
import { ProductItem } from '../types/product';
import { MOCK_PRODUCTS } from '../constants/mockProducts';
import { MOCK_KDRI_STANDARDS } from '../constants/kdri2020';
import { CLINICAL_DDI_RULES } from '../constants/ddiRules';

const PRODUCTS_COLLECTION = 'products';
const KDRI_COLLECTION = 'kdri_standards';
const DDI_COLLECTION = 'ddi_rules';

/**
 * 실시간 제품 목록 구독 (Realtime Sync via Firestore onSnapshot)
 * - 약국 PC 및 집 PC 어디서든 추가/수정/삭제 시 새로고침 없이 즉시 반응
 */
export function subscribeToProducts(
  onUpdate: (products: ProductItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isLiveFirebaseConfigured()) {
    // Firebase 미연동 모드일 때는 초기 목업 데이터를 전달
    onUpdate(MOCK_PRODUCTS);
    return () => {};
  }

  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(productsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hasBeenSeeded = localStorage.getItem('pharmassist_db_seeded_v1');
        if (snapshot.empty && !hasBeenSeeded) {
          // 진짜 최초 1회 실행 시에만 시드 데이터 주입
          localStorage.setItem('pharmassist_db_seeded_v1', 'true');
          seedInitialProductsIfEmpty();
          onUpdate(MOCK_PRODUCTS);
        } else {
          const list: ProductItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as ProductItem);
          });
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Firestore 실시간 리스너 에러 (로컬 캐시 사용):', error);
        if (onError) onError(error);
        // 에러 시 로컬 스토리지에 있는 데이터를 유지 (MOCK 강제 덮어쓰기 금지)
      }
    );


    return unsubscribe;
  } catch (err: any) {
    console.warn('Firestore 연결 실패:', err);
    onUpdate(MOCK_PRODUCTS);
    return () => {};
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}

/**
 * 신규 제품 Firestore 저장 또는 업데이트 (Write)
 */
export async function saveProductToFirestore(product: ProductItem): Promise<void> {
  if (!isLiveFirebaseConfigured()) {
    return;
  }

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    const dataToSave = sanitizeForFirestore({
      ...product,
      updatedAt: new Date().toISOString()
    });
    const savePromise = setDoc(docRef, dataToSave, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore 저장 타임아웃 (로컬에 우선 보존됨)')), 2500)
    );
    await Promise.race([savePromise, timeoutPromise]);
  } catch (e: any) {
    console.warn('Firestore 저장 알림 (로컬에 안전하게 보존됩니다):', e?.message || e);
  }
}

/**
 * 제품 Firestore 삭제
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  if (!isLiveFirebaseConfigured()) return;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const deletePromise = deleteDoc(docRef);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore 삭제 타임아웃 (로컬에서 우선 삭제됨)')), 2500)
    );
    await Promise.race([deletePromise, timeoutPromise]);
  } catch (e: any) {
    console.warn('Firestore 삭제 알림 (로컬에서는 삭제 완료되었습니다):', e?.message || e);
  }
}

/**
 * 초기 시드 데이터가 Firestore에 없을 때 자동 시딩
 */
async function seedInitialProductsIfEmpty(): Promise<void> {
  if (!isLiveFirebaseConfigured()) return;
  try {
    const collRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(collRef);
    if (snap.empty) {
      for (const prod of MOCK_PRODUCTS) {
        await setDoc(doc(db, PRODUCTS_COLLECTION, prod.id), prod);
      }
      // KDRI 및 DDI 마스터 시딩
      for (const kdri of MOCK_KDRI_STANDARDS) {
        await setDoc(doc(db, KDRI_COLLECTION, kdri.nutrientKey), kdri);
      }
      for (const ddi of CLINICAL_DDI_RULES) {
        await setDoc(doc(db, DDI_COLLECTION, ddi.id), ddi);
      }
      console.log('Firestore 초기 마스터 데이터 시딩 완료');
    }
  } catch (e) {
    console.warn('Firestore 시딩 건너뜀:', e);
  }
}
