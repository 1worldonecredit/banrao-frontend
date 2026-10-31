import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Package, Image as ImageIcon, Plus } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const EditPlace = () => {
  // ดึง id ของร้านค้าจาก URL
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State สำหรับสลับแท็บ (info = ข้อมูล, menu = สินค้า, gallery = รูปภาพ)
  const [activeTab, setActiveTab] = useState('info'); 
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // ฟังก์ชันช่วยกำหนดสไตล์ของปุ่มแท็บ
  const tabStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 16px', borderRadius: '20px', border: 'none',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap',
    backgroundColor: isActive ? '#3b82f6' : '#e2e8f0',
    color: isActive ? 'white' : '#475569',
    transition: 'all 0.2s',
    boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'none'
  });

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <TopNavbar userData={userData} />
      
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header ส่วนบน */}
        <div style={{ 
          background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', 
          borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div style={{ overflow: 'hidden' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>จัดการร้านค้า / สถานที่</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              รหัส: {id}
            </p>
          </div>
        </div>

        {/* เมนู Tabs เลื่อนซ้ายขวาได้ */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setActiveTab('info')} style={tabStyle(activeTab === 'info')}>
            <Settings size={16} /> แก้ไขข้อมูลร้าน
          </button>
          <button onClick={() => setActiveTab('menu')} style={tabStyle(activeTab === 'menu')}>
            <Package size={16} /> สินค้าและบริการ
          </button>
          <button onClick={() => setActiveTab('gallery')} style={tabStyle(activeTab === 'gallery')}>
            <ImageIcon size={16} /> แกลลอรี่ (0/10)
          </button>
        </div>

        {/* พื้นที่แสดงเนื้อหาตามแท็บที่เลือก */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '300px' }}>
           
           {/* แท็บที่ 1: แก้ไขข้อมูล */}
           {activeTab === 'info' && (
              <div>
                <h3 style={{marginTop: 0, color: '#1e293b'}}>ข้อมูลทั่วไป</h3>
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <Settings size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ margin: 0 }}>เตรียมดึงข้อมูลเดิมมาแสดงในฟอร์มแก้ไข...</p>
                </div>
              </div>
           )}

           {/* แท็บที่ 2: สินค้าและเมนู */}
           {activeTab === 'menu' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{margin: 0, color: '#1e293b'}}>รายการสินค้า</h3>
                  <button style={{display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'}}>
                    <Plus size={16} /> เพิ่มสินค้า
                  </button>
                </div>
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <Package size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ margin: 0 }}>ยังไม่มีรายการสินค้าในร้านนี้</p>
                </div>
              </div>
           )}

           {/* แท็บที่ 3: แกลลอรี่รูปภาพ */}
           {activeTab === 'gallery' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{margin: 0, color: '#1e293b'}}>รูปภาพร้าน (สูงสุด 10 รูป)</h3>
                  <button style={{display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'}}>
                    <Plus size={16} /> อัปโหลดรูป
                  </button>
                </div>
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <ImageIcon size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ margin: 0 }}>อัปโหลดรูปภาพบรรยากาศร้านเพิ่มเติมได้ที่นี่</p>
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