import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Settings, Package, Image as ImageIcon, Plus, Save } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const EditPlace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info'); 
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

  // State สำหรับเก็บข้อมูลฟอร์ม
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    place_name: '', description: '', address_text: '', visibility_level: 'PUBLIC', services: ''
  });
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('17:00');
  const [daysOff, setDaysOff] = useState([]);

  // ดึงข้อมูลเดิมเมื่อเปิดหน้า
  useEffect(() => {
    fetchPlaceDetail();
  }, [id]);

  const fetchPlaceDetail = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/community-places/detail/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setFormData({
          place_name: data.place_name || '',
          description: data.description || '',
          address_text: data.address_text || '',
          visibility_level: data.visibility_level || 'PUBLIC',
          services: data.services ? data.services.join(', ') : ''
        });
        if (data.operating_hours) {
          setOpenTime(data.operating_hours.open_time || '08:00');
          setCloseTime(data.operating_hours.close_time || '17:00');
          setDaysOff(data.operating_hours.days_off || []);
        }
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
      alert('ไม่สามารถดึงข้อมูลร้านได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // ฟังก์ชันบันทึกข้อมูลแก้ไข
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        services: formData.services.split(',').map(s => s.trim()).filter(s => s !== ''),
        operating_hours: { open_time: openTime, close_time: closeTime, days_off: daysOff }
      };
      const res = await axios.put(`${API_URL}/api/community-places/${id}`, payload);
      if (res.data.success) alert('อัปเดตข้อมูลสำเร็จ!');
    } catch (error) {
      console.error("Update Error:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
    setIsSaving(false);
  };

  const tabStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '20px', border: 'none',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap',
    backgroundColor: isActive ? '#3b82f6' : '#e2e8f0', color: isActive ? 'white' : '#475569', transition: 'all 0.2s',
    boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'none'
  });

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <TopNavbar userData={userData} />
      
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div style={{ overflow: 'hidden' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>จัดการร้านค้า / สถานที่</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>รหัส: {id}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
          <button onClick={() => setActiveTab('info')} style={tabStyle(activeTab === 'info')}><Settings size={16} /> แก้ไขข้อมูลร้าน</button>
          <button onClick={() => setActiveTab('menu')} style={tabStyle(activeTab === 'menu')}><Package size={16} /> สินค้าและบริการ</button>
          <button onClick={() => setActiveTab('gallery')} style={tabStyle(activeTab === 'gallery')}><ImageIcon size={16} /> แกลลอรี่ (0/10)</button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '300px' }}>
           
           {/* แท็บที่ 1: แก้ไขข้อมูล */}
           {activeTab === 'info' && (
              isLoading ? <div style={{textAlign: 'center', padding: '20px'}}>กำลังโหลดข้อมูล...</div> :
              <form onSubmit={handleUpdateInfo}>
                <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: '20px'}}>แก้ไขข้อมูลทั่วไป</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ชื่อสถานที่ / ชื่อร้าน *</label>
                    <input required type="text" name="place_name" value={formData.place_name} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>รายละเอียดสั้นๆ *</label>
                    <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ที่ตั้ง / ที่อยู่</label>
                    <input type="text" name="address_text" value={formData.address_text} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>แท็กบริการ (คั่นด้วยลูกน้ำ)</label>
                    <input type="text" name="services" value={formData.services} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                </div>

                <button disabled={isSaving} type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', marginTop: '25px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? '⏳ กำลังบันทึก...' : <><Save size={18} /> บันทึกข้อมูลการแก้ไข</>}
                </button>
              </form>
           )}

           {/* แท็บที่ 2: สินค้าและเมนู */}
           {activeTab === 'menu' && (
              <div>
                <h3 style={{marginTop: 0, color: '#1e293b'}}>รายการสินค้า</h3>
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <Package size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ margin: 0 }}>ยังไม่มีรายการสินค้าในร้านนี้ (กำลังพัฒนา...)</p>
                </div>
              </div>
           )}

           {/* แท็บที่ 3: แกลลอรี่รูปภาพ */}
           {activeTab === 'gallery' && (
              <div>
                <h3 style={{marginTop: 0, color: '#1e293b'}}>รูปภาพร้าน (สูงสุด 10 รูป)</h3>
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <ImageIcon size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ margin: 0 }}>อัปโหลดรูปภาพบรรยากาศร้าน (กำลังพัฒนา...)</p>
                </div>
              </div>
           )}

        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default EditPlace;