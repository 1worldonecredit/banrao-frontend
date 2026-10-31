import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, Utensils, MapPin, Home, ArrowLeft, CheckCircle2 } from 'lucide-react';

const AddCommunityPlace = ({ userData }) => {
  const navigate = useNavigate();
  
  // 🌟 หมวดหมู่ที่คุณเตรียมไว้ (ผมแอบเพิ่ม id เข้าไปเพื่อให้ส่งเข้า Database ได้ง่ายขึ้นครับ)
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

  // State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    category_id: null,
    place_name: '',
    description: '',
    address_text: '',
    cover_image_url: '',
    visibility_level: 'PUBLIC',
    services: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ฟังก์ชันจัดการเมื่อพิมพ์ข้อมูล
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ฟังก์ชันบันทึกข้อมูลยิงเข้า API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id) {
        alert("กรุณาเลือกหมวดหมู่สถานที่ก่อนครับ");
        return;
    }
    
    setIsSubmitting(true);
    try {
      // แปลง tag บริการที่คั่นด้วยลูกน้ำ (,) เป็น Array
      const servicesArray = formData.services.split(',').map(s => s.trim()).filter(s => s !== '');

      const payload = {
        ...formData,
        services: servicesArray,
        owner_account_id: userData?.id || '0811111111-mock-id', // ดึง ID ผู้ล็อกอิน
        operating_hours: { "mon": "08:00-17:00", "is_open_24h": false } // Mock ไว้ก่อน
      };

      const res = await axios.post('https://api.banrao.life/api/community-places', payload);
      if (res.data.success) {
          alert('เพิ่มข้อมูลสำเร็จ! รอผู้นำชุมชนอนุมัติ');
          navigate('/dashboard'); // กลับไปหน้าหลัก
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={24} color="#334155" />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>เพิ่มสถานที่/บริการชุมชน</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* 1. เลือกหมวดหมู่ (Visual Grid) */}
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
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>{cat.icon}</div>
                <div style={{ fontSize: '11px', color: '#475569', fontWeight: formData.category_id === cat.id ? 'bold' : 'normal' }}>
                  {cat.title}
                </div>
                {formData.category_id === cat.id && <CheckCircle2 size={16} color="#3b82f6" style={{ position: 'absolute', marginTop: '-45px', marginLeft: '35px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* 2. ข้อมูลทั่วไป */}
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
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>ลิงก์รูปภาพปก (URL)</label>
            <input type="text" name="cover_image_url" value={formData.cover_image_url} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>แท็กบริการ (คั่นด้วยลูกน้ำ)</label>
            <input type="text" name="services" value={formData.services} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="เช่น มีบริการส่งถึงบ้าน, รับสแกนคนละครึ่ง" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#475569' }}>สิทธิ์การมองเห็น</label>
            <select name="visibility_level" value={formData.visibility_level} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="PUBLIC">🌍 สาธารณะ (ทุกคนเห็นได้)</option>
              <option value="PROVINCE">📍 ภายในจังหวัด</option>
              <option value="AMPHURE">📍 ภายในอำเภอ</option>
              <option value="TAMBON">📍 ภายในตำบล</option>
              <option value="VILLAGE">🏠 เฉพาะคนในหมู่บ้าน</option>
            </select>
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button disabled={isSubmitting} type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสถานที่'}
        </button>
      </form>
    </div>
  );
};

export default AddCommunityPlace;