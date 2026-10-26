import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isLiveFirebaseConfigured } from './firebase';

/**
 * 첨부 자료(이미지/PDF 브로셔)를 Firebase Storage에 원본 그대로 업로드하고 고속 다운로드 URL을 반환합니다.
 * - 압축률 0% (고해상도 제약사 브로셔/포스터 원본 화질 100% 보존)
 * - Firebase Storage 연동 미설정 또는 오류 시 null 반환 (Base64 Fallback 지원)
 */
export async function uploadReferenceFileToStorage(
  productId: string,
  file: File,
  fileId: string
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  if (!isLiveFirebaseConfigured()) {
    return null;
  }

  try {
    // 특수문자 및 공백을 정규화한 안전한 파일명 생성
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `products/${productId}/reference_attachments/${fileId}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    const mime =
      file.type ||
      (file.name.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : file.name.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg');

    // 원본 바이트 그대로 업로드 (무손실 100% 원본 보존)
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: mime,
      cacheControl: 'public, max-age=31536000' // 브라우저 1년 캐싱으로 두 번째 열람 시 0초만에 즉시 로딩
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { downloadUrl, storagePath };
  } catch (error) {
    console.warn('Firebase Storage 업로드 실패 (Base64 로컬 보존으로 전환됩니다):', error);
    return null;
  }
}

/**
 * Storage에 저장된 첨부 파일 삭제
 */
export async function deleteReferenceFileFromStorage(storagePath?: string): Promise<void> {
  if (!storagePath || !isLiveFirebaseConfigured()) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Firebase Storage 파일 삭제 알림:', error);
  }
}
