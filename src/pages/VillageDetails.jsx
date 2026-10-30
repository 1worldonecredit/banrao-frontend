import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Home, MapPin, User, Building } from 'lucide-react';

const VillageDetails = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({});

  useEffect(() => {
    // ดึงข้อมูล User จาก LocalStorage ที่ได้ตอน Login
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
  }, []);

  // ข้อมูลจำลองสำหรับหน้าตัวอย่าง (ในอนาคตจะดึงจาก API)
  const mockVillageData = {
    population: 1250,
    households: 320,
    infrastructures: [
      { id: 1, type: 'โรงเรียน', name: 'โรงเรียนบ้านโคกสว่าง' },
      { id: 2, type: 'วัด', name: 'วัดป่าโคกสว่าง' },
      { id: 3, type: 'สถานีอนามัย', name: 'รพ.สต. โคกสว่าง' }
    ]
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* ส่วนหัว: ปุ่มกลับ และ ชื่อหมู่บ้าน */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={24} color="#475569" />
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#1e293b' }}>
          ข้อมูล{userData.villageName || 'หมู่บ้าน'}
        </h1>
      </div>

      {/* Card 1: ข้อมูลสรุปประชากร (Highlight) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        
        <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #3b82f6', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '50%' }}>
            <Users size={28} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>ประชากรทั้งหมด</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{mockVillageData.population} <span style={{fontSize: '14px', color: '#64748b'}}>คน</span></div>
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #22c55e', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '50%' }}>
            <Home size={28} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>จำนวนครัวเรือน</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{mockVillageData.households} <span style={{fontSize: '14px', color: '#64748b'}}>หลัง</span></div>
          </div>
        </div>

      </div>

      {/* Card 2: ข้อมูลผู้บริหารและที่ตั้ง */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
          ข้อมูลพื้นฐาน
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', fontSize: '14px', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={18} color="#64748b" />
            <span><strong>ผู้ใหญ่บ้าน:</strong> {userData.headmanName || 'ยังไม่มีข้อมูล'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={18} color="#64748b" />
            <span>
              <strong>ที่ตั้ง:</strong> ต.{userData.tambonName || '-'} อ.{userData.amphureName || '-'} จ.{userData.provinceName || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: โครงสร้างพื้นฐาน */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
          โครงสร้างพื้นฐานในหมู่บ้าน
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mockVillageData.infrastructures.map((infra) => (
            <div key={infra.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', padding: '10px 15px', borderRadius: '8px' }}>
              <Building size={18} color="#8b5cf6" />
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{infra.type}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>{infra.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default VillageDetails;