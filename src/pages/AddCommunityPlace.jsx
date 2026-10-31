import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, Utensils, MapPin, Home, ArrowLeft, CheckCircle2, ImagePlus, X, Clock, CalendarX } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const AddCommunityPlace = () => {
  const navigate = useNavigate();
  
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

  const mainCategories = [
    { id: 1, title: 'โรงเรียนในหมู่บ้าน', icon: <Building2 size={24} color="#e11d48" />, bg: '#ffe4e6' },
    { id: 2, title: 'วัดในหมู่บ้าน', icon: <Utensils size={24} color="#7c3aed" />, bg: '#ede9fe' },
    { id: 3, title: 'ห้องเช่า', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 4, title: 'บ้านเช่า', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 5, title: 'รีสอร์ท', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 6, title: 'โรงแรม', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 7, title: 'ร้านค้า', icon: <Home size={24} color="#16a34a" />, bg: '#dcfce7' },
    { id: 8, title: 'ร้านอาหาร', icon: <Utensils size={24} color="#16a34a" />, bg: '#dcfce7' },
    { id: 9, title: 'ห้างสรรพสินค้า', icon: <Building2 size={24} color="#16a34a" />, bg: '#dcfce7' },
    { id: 10, title: 'สถานที่ท่องเที่ยว', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 11, title: 'โรงงานอุตสาหกรรม', icon: <Building2 size={24} color="#16a34a" />, bg: '#dcfce7' },
    { id: 12, title: 'โอทอป', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 13, title: 'วิสาหกิจชุมชน', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 14, title: 'สถานีอนามัย', icon: <MapPin size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 15, title: 'โรงพยาบาล', icon: <Building2 size={24} color="#ea580c" />, bg: '#ffedd5' },
    { id: 16, title: 'คลีนิค', icon: <Home size={24} color="#16a34a" />, bg: '#dcfce7' },
  ];

  const daysOfWeek = [
    { id: 'mon', label: 'จันทร์' }, { id: 'tue', label: 'อังคาร' }, 
    { id: 'wed', label: 'พุธ' }, { id: 'thu', label: 'พฤหัสฯ' }, 
    { id: 'fri', label: 'ศุกร์' }, { id: 'sat', label: 'เสาร์' }, { id: 'sun', label: 'อาทิตย์' }
  ];

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

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
    
    const accountId = userData.account_id || userData.id;
    if (!accountId) {
        alert("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
        return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = '';

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);
        
        const uploadRes = await axios.post(`${API_URL}/api/upload-image`, imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (uploadRes.data.success) {
          finalImageUrl = uploadRes.data.imageUrl;
        } else {
          finalImageUrl = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80';
        }
      }

      const operatingHoursJson = {
        open_time: openTime,
        close_time: closeTime,
        days_off: daysOff
      };

      const servicesArray = formData.services.split(',').map(s => s.trim()).filter(s => s !== '');

      const payload = {
        ...formData,
        cover_image_url: finalImageUrl,
        services: servicesArray,
        operating_hours: operatingHoursJson,
        owner_account_id: accountId
      };

      const res = await axios.post(`${API_URL}/api/community-places`, payload);
      
      if (res.data.success) {
          alert('เพิ่มข้อมูลสำเร็จ! รอผู้นำชุมชนตรวจสอบและอนุมัติ');
          navigate(-1); 
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* 🌟 1. นำ TopNavbar มาใส่ไว้ด้านบนสุด */}
      <TopNavbar userData={userData} />

      {/* 🌟 2. ครอบเนื้อหาทั้งหมดด้วย div ที่มี padding ป้องกันการถูก Navbar บัง */}
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header สไตล์ใหม่ คล้าย MyPlaces */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
          borderRadius: '16px', 
          padding: '20px', 
          color: 'white',
          display: 'flex', 
          alignItems: 'center', 
          gap: '15px',
          marginBottom: '25px',
          boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)'
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>เพิ่มสถานที่/บริการชุมชน</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>กรอกข้อมูลให้ครบถ้วนเพื่อส่งตรวจสอบ</p>
          </div>
        </div>

        {/* ฟอร์มที่มีพื้นหลังขาวและเงาสวยงาม */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          
          {/* 1. เลือกหมวดหมู่ */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>1. เลือกหมวดหมู่ *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
              {mainCategories.map((cat) => (
                <div 
                  key={cat.id} 
                  onClick={() => setFormData({...formData, category_id: cat.id})}
                  style={{ 
                    backgroundColor: formData.category_id === cat.id ? cat.bg : '#f8fafc',
                    border: formData.category_id === cat.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '12px', textAlign: 'center', cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out', position: 'relative',
                    transform: formData.category_id === cat.id ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: formData.category_id === cat.id ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{cat.icon}</div>
                  <div style={{ fontSize: '12px', color: '#475569', fontWeight: formData.category_id === cat.id ? 'bold' : 'normal' }}>{cat.title}</div>
                  {formData.category_id === cat.id && <CheckCircle2 size={18} color="#3b82f6" style={{ position: 'absolute', top: '6px', right: '6px' }} />}
                </div>
              ))}
            </div>
          </div>

          {/* 2. อัปโหลดรูปภาพปก */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>2. รูปภาพปก (Cover Image)</label>
            <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                 onClick={() => document.getElementById('place-image-upload').click()}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
              
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '6px', cursor: 'pointer', backdropFilter: 'blur(4px)' }} onClick={(e) => { e.stopPropagation(); setPreviewUrl(''); setImageFile(null); }}>
                    <X size={20} color="#fff" />
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
                  <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>แตะเพื่อเลือกรูปภาพปกสถานที่</span>
                </>
              )}
              <input type="file" id="place-image-upload" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </div>
          </div>

          {/* 3. เวลาเปิด-ปิด และวันหยุด */}
          <div style={{ marginBottom: '30px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>
              <Clock size={20} color="#3b82f6" /> 3. เวลาทำการ และวันหยุด
            </label>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>เวลาเปิด</label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>เวลาปิด</label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'white' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '10px', fontWeight: '500' }}>
                <CalendarX size={16} color="#ef4444" /> เลือกวันหยุดทำการ <span style={{fontSize: '11px', color: '#94a3b8'}}>(เลือกเพื่อซ่อนสถานที่ในวันนั้น)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {daysOfWeek.map(day => (
                  <div key={day.id} onClick={() => toggleDayOff(day.id)} style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: daysOff.includes(day.id) ? '#fee2e2' : '#fff', color: daysOff.includes(day.id) ? '#ef4444' : '#64748b', border: `1px solid ${daysOff.includes(day.id) ? '#fca5a5' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                    {day.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. ข้อมูลทั่วไป */}
          <div style={{ marginBottom: '30px' }}>
             <label style={{ display: 'block', marginBottom: '15px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>4. ข้อมูลรายละเอียด</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: '500' }}>ชื่อสถานที่ / ชื่อร้าน *</label>
                <input required type="text" name="place_name" value={formData.place_name} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} placeholder="เช่น แซ่บอีหลี ส้มตำไก่ย่าง" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: '500' }}>รายละเอียดสั้นๆ *</label>
                <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', resize: 'none' }} placeholder="อธิบายจุดเด่นของสถานที่..."></textarea>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: '500' }}>ที่ตั้ง / ที่อยู่</label>
                <input type="text" name="address_text" value={formData.address_text} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} placeholder="เช่น หมู่ 2 ต.บ้านเป็ด" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: '500' }}>แท็กบริการ (คั่นด้วยลูกน้ำ)</label>
                <input type="text" name="services" value={formData.services} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} placeholder="เช่น มีบริการส่ง, รับคนละครึ่ง" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: '500' }}>สิทธิ์การมองเห็น</label>
                <select name="visibility_level" value={formData.visibility_level} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                  <option value="PUBLIC">🌍 สาธารณะ (ทุกคนเห็นได้)</option>
                  <option value="TAMBON">📍 ภายในตำบล</option>
                  <option value="VILLAGE">🏠 เฉพาะคนในหมู่บ้าน</option>
                </select>
              </div>
            </div>
          </div>

          <button disabled={isSubmitting} type="submit" style={{ width: '100%', padding: '16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)', transition: 'background-color 0.2s' }}>
            {isSubmitting ? '⏳ กำลังบันทึกและอัปโหลดรูป...' : '✅ บันทึกข้อมูลสถานที่'}
          </button>
        </form>
      </div>

      {/* 🌟 3. นำ BottomNavbar มาใส่ไว้ด้านล่างสุด */}
      <BottomNavbar />
    </div>
  );
};

export default AddCommunityPlace;