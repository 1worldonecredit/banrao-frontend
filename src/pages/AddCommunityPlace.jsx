import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, Utensils, MapPin, Home, ArrowLeft, CheckCircle2, ImagePlus, X, Clock, CalendarX } from 'lucide-react';

const AddCommunityPlace = () => {
  const navigate = useNavigate();
  
  // ดึงข้อมูลผู้ใช้จากระบบ
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

  const mainCategories = [
    { id: 1, title: 'โรงเรียนในหมู่บ้าน', icon: <Building2 size={24} color="#e11d48" />, bg: '#ffe4e6' },
    { id: 2, title: 'วัดในหมู่บ้าน', icon: <Utensils size={24} color="#7c3aed" />, bg: '#ede9fe' },
    { id: 3, title: 'ห้องเช่า', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 7, title: 'ร้านค้า', icon: <Home size={24} color="#16a34a" />, bg: '#dcfce7' },
    { id: 8, title: 'ร้านอาหาร', icon: <Utensils size={24} color="#16a34a" />, bg: '#dcfce7' },
    { id: 10, title: 'สถานที่ท่องเที่ยว', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    // สามารถเพิ่มหมวดหมู่อื่นๆ กลับเข้ามาได้ครับ
  ];

  const daysOfWeek = [
    { id: 'mon', label: 'จันทร์' }, { id: 'tue', label: 'อังคาร' }, 
    { id: 'wed', label: 'พุธ' }, { id: 'thu', label: 'พฤหัสฯ' }, 
    { id: 'fri', label: 'ศุกร์' }, { id: 'sat', label: 'เสาร์' }, { id: 'sun', label: 'อาทิตย์' }
  ];

  // 🌟 State สำหรับรูปภาพ
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // 🌟 State สำหรับเวลาทำการ
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('17:00');
  const [daysOff, setDaysOff] = useState([]);

  const [formData, setFormData] = useState({
    category_id: null,
    place_name: '',
    description: '',
    address_text: '',
    visibility_level: 'PUBLIC',
    services: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // จัดการเลือกรูปภาพ
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // จัดการเลือกวันหยุด
  const toggleDayOff = (dayId) => {
    if (daysOff.includes(dayId)) {
      setDaysOff(daysOff.filter(d => d !== dayId));
    } else {
      setDaysOff([...daysOff, dayId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id) {
        alert("กรุณาเลือกหมวดหมู่สถานที่ก่อนครับ");
        return;
    }
    
    // 🌟 ดึง Account ID ตัวจริง ถ้าไม่มีให้แจ้งเตือน (ป้องกัน Error บันทึกไม่ได้)
    const accountId = userData.account_id || userData.id;
    if (!accountId) {
        alert("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
        return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = '';

      // 🌟 1. อัปโหลดรูปภาพ (ถ้ามี) ไปยัง Cloudflare
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);
        
        // *หมายเหตุ: ตรงนี้ใช้ endpoint อัปโหลดรูปรวม สมมติว่าสร้างไว้ที่ /api/upload-image
        // ถ้าใช้ API ของ Profile ชั่วคราว ให้เปลี่ยน URL เป็น /api/upload-profile
        const uploadRes = await axios.post(`${API_URL}/api/upload-image`, imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (uploadRes.data.success) {
          finalImageUrl = uploadRes.data.imageUrl;
        } else {
          // Fallback ภาพจำลองกรณี API อัปโหลดรูประบบของคุณยังไม่เสร็จ
          finalImageUrl = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80';
        }
      }

      // 🌟 2. เตรียมข้อมูล JSON สำหรับเวลาทำการและวันหยุด
      const operatingHoursJson = {
        open_time: openTime,
        close_time: closeTime,
        days_off: daysOff
      };

      const servicesArray = formData.services.split(',').map(s => s.trim()).filter(s => s !== '');

      // 🌟 3. บันทึกข้อมูลลง Database
      const payload = {
        ...formData,
        cover_image_url: finalImageUrl,
        services: servicesArray,
        operating_hours: operatingHoursJson,
        owner_account_id: accountId // 👈 ใช้ ID จริงแล้ว
      };

      const res = await axios.post(`${API_URL}/api/community-places`, payload);
      
      if (res.data.success) {
          alert('เพิ่มข้อมูลสำเร็จ! รอผู้นำชุมชนตรวจสอบและอนุมัติ');
          navigate(-1); // กลับไปหน้าก่อนหน้า
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
          <ArrowLeft size={24} color="#334155" />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>เพิ่มสถานที่/บริการชุมชน</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* 1. เลือกหมวดหมู่ */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#334155' }}>1. เลือกหมวดหมู่ *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
            {mainCategories.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => setFormData({...formData, category_id: cat.id})}
                style={{ 
                  backgroundColor: formData.category_id === cat.id ? cat.bg : '#f1f5f9',
                  border: formData.category_id === cat.id ? '2px solid #3b82f6' : '2px solid transparent',
                  borderRadius: '12px', padding: '10px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s', position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>{cat.icon}</div>
                <div style={{ fontSize: '11px', color: '#475569', fontWeight: formData.category_id === cat.id ? 'bold' : 'normal' }}>{cat.title}</div>
                {formData.category_id === cat.id && <CheckCircle2 size={16} color="#3b82f6" style={{ position: 'absolute', top: '5px', right: '5px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* 🌟 2. อัปโหลดรูปภาพปก */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#334155' }}>2. รูปภาพปก (Cover Image)</label>
          
          <div style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
               onClick={() => document.getElementById('place-image-upload').click()}>
            
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px' }} onClick={(e) => { e.stopPropagation(); setPreviewUrl(''); setImageFile(null); }}>
                  <X size={20} color="#fff" />
                </div>
              </>
            ) : (
              <>
                <ImagePlus size={40} color="#94a3b8" style={{ marginBottom: '10px' }} />
                <span style={{ color: '#64748b', fontSize: '14px' }}>แตะเพื่อเลือกรูปภาพปกสถานที่</span>
              </>
            )}
            <input type="file" id="place-image-upload" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
        </div>

        {/* 🌟 3. เวลาเปิด-ปิด และวันหยุด */}
        <div style={{ marginBottom: '25px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', fontWeight: 'bold', color: '#334155' }}>
            <Clock size={18} color="#3b82f6" /> 3. เวลาทำการ และวันหยุด
          </label>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>เวลาเปิด</label>
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>เวลาปิด</label>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              <CalendarX size={16} /> เลือกวันหยุดทำการ (สถานที่นี้จะไม่แสดงในวันหยุด)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {daysOfWeek.map(day => (
                <div key={day.id} onClick={() => toggleDayOff(day.id)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: daysOff.includes(day.id) ? '#fee2e2' : '#fff', color: daysOff.includes(day.id) ? '#ef4444' : '#64748b', border: `1px solid ${daysOff.includes(day.id) ? '#fca5a5' : '#e2e8f0'}` }}>
                  {day.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. ข้อมูลทั่วไป */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>ชื่อสถานที่ / ชื่อร้าน *</label>
            <input required type="text" name="place_name" value={formData.place_name} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="เช่น แซ่บอีหลี ส้มตำไก่ย่าง" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>รายละเอียดสั้นๆ *</label>
            <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="อธิบายจุดเด่นของสถานที่..."></textarea>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>ที่ตั้ง / ที่อยู่</label>
            <input type="text" name="address_text" value={formData.address_text} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="เช่น หมู่ 2 ต.บ้านเป็ด" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>แท็กบริการ (คั่นด้วยลูกน้ำ)</label>
            <input type="text" name="services" value={formData.services} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="เช่น มีบริการส่ง, รับคนละครึ่ง" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>สิทธิ์การมองเห็น</label>
            <select name="visibility_level" value={formData.visibility_level} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="PUBLIC">🌍 สาธารณะ (ทุกคนเห็นได้)</option>
              <option value="TAMBON">📍 ภายในตำบล</option>
              <option value="VILLAGE">🏠 เฉพาะคนในหมู่บ้าน</option>
            </select>
          </div>
        </div>

        <button disabled={isSubmitting} type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
          {isSubmitting ? 'กำลังบันทึกและอัปโหลดรูป...' : 'บันทึกข้อมูลสถานที่'}
        </button>
      </form>
    </div>
  );
};

export default AddCommunityPlace;