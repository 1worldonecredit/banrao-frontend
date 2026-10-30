// ดึงค่า URL มาจากไฟล์ .env (ถ้าไม่มีจะใช้โดเมนจริงแทน)
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';