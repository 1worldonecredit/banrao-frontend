import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store, Clock, CheckCircle2, XCircle, Edit, Plus, ArrowLeft } from 'lucide-react';
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

    <>
    <TopNavbar />
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
            <ArrowLeft size={24} color="#334155" />
          </button>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>จัดการสถานที่ของฉัน</h2>
        </div>
        <button 
          onClick={() => navigate('/add-place')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          <Plus size={16} /> เพิ่มใหม่
        </button>
      </div>

      {/* List of Places */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>กำลังโหลดข้อมูล...</div>
      ) : places.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#64748b' }}>
          <Store size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
          <p>คุณยังไม่ได้เพิ่มสถานที่ หรือร้านค้าเลย</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {places.map((place) => (
            <div key={place.place_id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '15px', display: 'flex', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              
              {/* Cover Image */}
              <div style={{ width: '90px', height: '90px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                {place.cover_image_url ? (
                  <img src={place.cover_image_url} alt={place.place_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Store size={32} color="#94a3b8" style={{ margin: '29px' }} />
                )}
              </div>

              {/* Details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1e293b' }}>{place.place_name}</h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>หมวดหมู่: {place.category_name}</div>
                  
                  {/* Status Badge */}
                  {place.is_verified ? (
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                       <CheckCircle2 size={12} /> อนุมัติแล้ว (ออนไลน์)
                     </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                       <Clock size={12} /> รอผู้นำชุมชนอนุมัติ
                     </div>
                  )}
                </div>

                {/* Manage Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button 
                    onClick={() => navigate(`/edit-place/${place.place_id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <Edit size={14} /> จัดการ/แก้ไข
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
    </>
  );
};

export default MyPlaces;