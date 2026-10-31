import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store, Clock, CheckCircle2, Edit, Plus, ArrowLeft, MapPin } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const MyPlaces = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const accountId = userData.account_id || userData.id;
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

  useEffect(() => {
    fetchMyPlaces();
  }, []);

  const fetchMyPlaces = async () => {
    if (!accountId) return;
    try {
      const res = await axios.get(`${API_URL}/api/my-places/${accountId}`);
      if (res.data.success) {
        setPlaces(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching my places:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 แถบเมนูด้านบน (ส่ง userData ไปด้วยเผื่อ Navbar นำไปใช้แสดงรูปโปรไฟล์/ชื่อ) */}
      <TopNavbar userData={userData} />
      
      {/* 🌟 พื้นที่เนื้อหาหลัก (เพิ่ม paddingTop: 80px และ paddingBottom: 100px ป้องกัน Navbar บังเนื้อหา) */}
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header แบบการ์ดสีสันสดใส (Gradient Blue) */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
          borderRadius: '16px', 
          padding: '20px', 
          color: 'white',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '25px',
          boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <ArrowLeft size={20} color="white" />
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>สถานที่ของฉัน</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>จัดการร้านค้าและบริการ</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/add-place')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fbbf24', color: '#78350f', border: 'none', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            <Plus size={18} /> เพิ่มใหม่
          </button>
        </div>

        {/* List of Places */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>กำลังโหลดข้อมูล...</div>
        ) : places.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: 'white', borderRadius: '16px', color: '#64748b', border: '2px dashed #cbd5e1' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <Store size={40} color="#94a3b8" />
            </div>
            <h3 style={{ margin: '0 0 10px 0', color: '#334155' }}>ยังไม่มีสถานที่</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>คุณยังไม่ได้เพิ่มสถานที่ หรือร้านค้าเลย เริ่มต้นเพิ่มร้านแรกของคุณได้เลย!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {places.map((place) => (
              <div key={place.place_id} style={{ 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                padding: '16px', 
                display: 'flex', 
                gap: '15px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                /* แถบสีด้านซ้ายบอกสถานะ: เขียว=อนุมัติแล้ว, ส้ม=รออนุมัติ */
                borderLeft: place.is_verified ? '5px solid #22c55e' : '5px solid #f59e0b',
                position: 'relative',
                overflow: 'hidden'
              }}>
                
                {/* ลายน้ำ Icon พื้นหลังบางๆ เพื่อความสวยงาม */}
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.03, pointerEvents: 'none' }}>
                  <Store size={100} />
                </div>

                {/* Cover Image */}
                <div style={{ width: '100px', height: '100px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                  {place.cover_image_url ? (
                    <img src={place.cover_image_url} alt={place.place_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Store size={32} color="#cbd5e1" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#1e293b', fontWeight: 'bold' }}>{place.place_name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      <MapPin size={12} color="#3b82f6" /> {place.category_name}
                    </div>
                    
                    {/* Status Badge สีสันสดใส */}
                    {place.is_verified ? (
                       <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
                         <CheckCircle2 size={12} /> อนุมัติแล้ว (ออนไลน์)
                       </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fde68a' }}>
                         <Clock size={12} /> รอการอนุมัติ
                       </div>
                    )}
                  </div>

                  {/* Manage Button ดีไซน์ใหม่ */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button 
                      onClick={() => navigate(`/edit-place/${place.place_id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s' }}
                    >
                      <Edit size={14} /> จัดการร้าน
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🌟 แถบเมนูด้านล่าง */}
      <BottomNavbar />
    </div>
  );
};

export default MyPlaces;