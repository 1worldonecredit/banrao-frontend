import { authFetch } from './authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// บีบอัดภาพจากมือถือให้เบา (~50-70 KB) โหลดเร็วและประหยัดพื้นที่ระดับ 20 ล้านรูป/เดือน
export const compressImageToBlob = (file, { maxSide = 800, quality = 0.72 } = {}) => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) return reject(new Error('บีบอัดรูปภาพไม่สำเร็จ'));
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

// อัปโหลดตรงจากมือถือ/เบราว์เซอร์เข้า Cloudflare R2 (ไม่ผ่าน Railway)
export const uploadToR2 = async (fileOrBlob, folder = 'water/bills', prefix = 'img') => {
  const contentType = fileOrBlob.type || 'image/jpeg';

  // 1. ขอตั๋ว Presigned URL จาก banrao-api
  const presignRes = await authFetch(`${API_URL}/api/media/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, contentType, prefix })
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok || !presignData.success || !presignData.uploadUrl) {
    throw new Error(presignData.message || 'ขอสิทธิ์อัปโหลด R2 ไม่สำเร็จ');
  }

  // 2. ยิงไฟล์ตรงเข้า Cloudflare R2
  const putRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: fileOrBlob
  });

  if (!putRes.ok) {
    throw new Error(`อัปโหลดขึ้น R2 ไม่สำเร็จ (HTTP ${putRes.status})`);
  }

  return presignData.publicUrl;
};