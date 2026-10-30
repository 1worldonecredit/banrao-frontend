import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNavbar from '../components/BottomNavbar';
import TopNavbar from '../components/TopNavbar';
import { 
  Building2, Plane, Tent, Home,
  Gift, Clock, 
  Ticket, Percent, Utensils, MapPin, ClipboardList, CalendarCheck, HardHat, Wrench, CarTaxiFront,
  Droplets, Activity, Map, ShieldCheck, Pencil
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [userData, setUserData] = useState({});
  const [userPermissions, setUserPermissions] = useState([]); 
  const [wallet, setWallet] = useState({ balance: 0, points: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // กำหนดสกุลเงิน
  const currencySymbol = userData.currency_code === 'USD' ? '$' : '฿';

  // ==========================================
  // ข้อมูล 4 หมวดหมู่หลัก (โครงสร้างเดิม)
  // ==========================================
  const mainCategories = [
    { title: 'จำนวนประชาการทั้งหมด', icon: <Building2 size={40} color="#e11d48" />, bg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', action: 'hotels' },
    { title: 'ร้านอาหารใกล้ฉัน', icon: <Utensils size={40} color="#7c3aed" />, bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', action: 'restaurants' },
    { title: 'ที่พักใกล้ฉัน', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'ห้องเช่ารายเดือน', icon: <Home size={40} color="#16a34a" />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', action: 'monthly_rentals' },
  ];

  // ==========================================
  // เมนูบริการย่อย (ปรับปรุงเพิ่มสิทธิ์ reqPerm)
  // ==========================================
  const allSubServices = [
    { title: 'ฌาปนกิจ หมู่บ้าน', icon: <ClipboardList size={24} color="#0284c7" />, action: 'orders', reqPerm: null },
    { title: 'ธนาคารชุมชน', icon: <CalendarCheck size={24} color="#0284c7" />, action: 'bookings', reqPerm: null },
    { title: 'เก็บค่าน้ำประปา', icon: <Droplets size={24} color="#0284c7" />, action: 'water-bill', reqPerm: 'MANAGE_WATER_BILL' },
    { title: 'บันทึกสุขภาพ', icon: <Activity size={24} color="#e11d48" />, action: 'health-data', reqPerm: 'MANAGE_HEALTH_DATA' },
    { title: 'มอบหมายงาน', icon: <ShieldCheck size={24} color="#ca8a04" />, action: 'assign-role', reqPerm: 'ASSIGN_VILLAGE_ROLE' },
    { title: 'ต้องการคนทำงาน', icon: <HardHat size={24} color="#0284c7" />, action: 'jobs', reqPerm: null },
    { title: 'ช่างซ่อมรถใกล้ฉัน', icon: <Wrench size={24} color="#0284c7" />, action: 'mechanics', reqPerm: null },
    { title: 'รถรับจ้าง', icon: <CarTaxiFront size={24} color="#0284c7" />, action: 'taxis', reqPerm: null },
  ];

  const filteredSubServices = allSubServices.filter(sub => 
    !sub.reqPerm || userPermissions.includes(sub.reqPerm)
  );

  const welcomeGifts = [
    { title: 'รับส่วนลดสูงสุด 12%', subtitle: 'จองที่พักครั้งแรก', badge: 'รับสิทธิ์', icon: <Gift color="#ca8a04" /> },
    { title: 'ทดลองเป็นลูกค้า VIP', subtitle: 'รับส่วนลดสูงสุด 15%', badge: 'ใหม่', icon: <Percent color="#000" /> },
  ];

  const flashSales = [
    { title: 'อุ่นไอแคมป์ปิ้ง เขาค้อ รีสอร์ท', discount: 'ลด 76%', img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80' },
    { title: 'พูลวิลล่า ธรรมชาติ', discount: 'ลด 53%', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500&q=80' },
  ];

  const fetchDashboardData = async (userId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/dashboard/${userId}?t=${new Date().getTime()}`);
      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet || { balance: 0, points: 0 });
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('userData'); // ตรวจสอบว่าในระบบคุณใช้ userData หรือ user
    let userId = null;
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserData(parsedUser);
      setUserPermissions(parsedUser.permissions || []);
      userId = parsedUser.id || parsedUser.user_id || parsedUser.account_id; 
    }
    if (userId) fetchDashboardData(userId);
    else setIsLoading(false);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  };

  // ==========================================
  // ฟังก์ชันจัดการอัปโหลดรูปภาพ
  // ==========================================
  const triggerImageSelect = () => {
    fileInputRef.current.click();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('userId', userData.id || userData.account_id); // ปรับตามฟิลด์ ID ของคุณ

    try {
      console.log('กำลังอัปโหลดรูปภาพ...');
      
      // ดึง token เพื่อส่งไปยืนยันสิทธิ์
      const token = localStorage.getItem('token');
      
      // ส่งไปที่ API อัปโหลดรูปของคุณ
      const response = await axios.post(`${API_URL}/api/upload-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.imageUrl) {
        // อัปเดตรูปใหม่ในหน้าจอทันที
        setUserData(prev => {
            const updatedData = { ...prev, userImage: response.data.imageUrl };
            // อัปเดตใน LocalStorage เพื่อให้จำรูปใหม่ตอนรีเฟรช
            localStorage.setItem('userData', JSON.stringify(updatedData));
            return updatedData;
        });
        alert('อัปโหลดรูปลงระบบสำเร็จ!');
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองอีกครั้ง');
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <TopNavbar />
      
      <div className="main-content" style={{ padding: '15px 20px 90px 20px', maxWidth: '500px', margin: '0 auto' }}>
        
        {/* ================= Header Section (Card Style) ================= */}
        <div style={{ marginBottom: '25px' }}>
          
          {/* แถวบน: โลโก้ และ กระเป๋าเงิน */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
              หมู่บ้าน<span style={{color: '#e11d48'}}>.</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#dcfce7', padding: '6px 12px', borderRadius: '20px', color: '#166534', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Ticket size={16} color="#16a34a" /> 
              <span>{currencySymbol} {isLoading ? '...' : formatCurrency(wallet.balance)}</span>
            </div>
          </div>

          {/* แถวล่าง: แยก Card ข้อมูล 2 ฝั่ง */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            
            {/* --- Card 1: ข้อมูลผู้ใช้งาน --- */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>👤 ข้อมูลผู้ใช้งาน</div>
                <div style={{ backgroundColor: '#1e293b', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  ★ VIP {userData.level_name || 'Bronze'}
                </div>
              </div>
              
              {/* ส่วนเนื้อหาจัด Flex ให้มีรูปด้านซ้าย */}
              <div style={{ display: 'flex', gap: '15px' }}>
                
                {/* 1. Input สำหรับเลือกรูปภาพ (ซ่อนไว้) */}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />

                {/* 2. รูปโปรไฟล์ที่คลิกได้ */}
                <div 
                  onClick={triggerImageSelect} 
                  style={{ cursor: 'pointer', position: 'relative', width: '65px', height: '65px', flexShrink: 0 }}
                >
                  <img 
                    src={userData.userImage || '/profile-img.jpg'} 
                    alt="User Profile" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
                  />
                  {/* ไอคอนดินสอเล็กๆ ซ้อนบนรูปให้รู้ว่าเปลี่ยนได้ */}
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#ffffff', borderRadius: '50%', padding: '4px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <Pencil size={12} color="#475569" />
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8', flex: 1 }}>
                  <div><strong>ชื่อ-สกุล:</strong> {userData.firstName || '-'} {userData.lastName || ''}</div>
                  <div>
                    <strong>เกิดวัน:</strong> {userData.birthDayName || '-'} | 
                    <strong> เพศ:</strong> {userData.gender || '-'} 
                  </div>
                  <div>
                    <strong>อายุ:</strong> {userData.age_years || '0'} ปี {userData.age_months || '0'} เดือน {userData.age_days || '0'} วัน
                  </div>
                  <div><strong>เบอร์:</strong> {userData.username || '-'}</div>
                  <div><strong>บ้านเลขที่:</strong> {userData.house_no || '-'} | <strong>ผู้อาศัย:</strong> {userData.household_member_count || '0'} คน</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>ID: {userData.id || '-'}</div>
                </div>
              </div>
            </div>

            {/* --- Card 2: ข้อมูลหมู่บ้าน --- */}
            <div 
              onClick={() => navigate('/village-details')}
              style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                padding: '16px', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', 
                borderTop: '4px solid #10b981',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>🏡 ข้อมูลหมู่บ้าน</div>
                {userData.villageName ? (
                   <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>อนุมัติแล้ว</div>
                ) : (
                   <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>รออนุมัติ</div>
                )}
              </div>
              
              {/* ส่วนเนื้อหาจัด Flex ให้มีรูปผู้ใหญ่บ้านด้านซ้าย */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <img 
                  src={userData.headmanImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80'} 
                  alt="Headman Profile" 
                  style={{ width: '65px', height: '65px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }} 
                />
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8', flex: 1 }}>
                  <div><strong>ชื่อหมู่บ้าน:</strong> {userData.villageName || <span style={{ color: '#ef4444' }}>ยังไม่ผูกหมู่บ้าน</span>}</div>
                  <div><strong>ผู้ใหญ่บ้าน:</strong> {userData.headmanName || '-'}</div>
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                    <span style={{ marginTop: '2px' }}>📍</span>
                    <span>ต.{userData.tambonName || '-'} อ.{userData.amphureName || '-'} จ.{userData.provinceName || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div> {/* ปิด div grid */}
        </div> {/* ปิด div Header Section */}

        {/* ================= 4 หมวดหมู่หลัก (Grid) ================= */}
        <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '25px' }}>
          {mainCategories.map((cat, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                if (cat.action === 'hotels') navigate('/hotels');
                else if (cat.action === 'restaurants') navigate('/restaurants');
                else if (cat.action === 'nearby_hotels') navigate('/nearby-hotels');
                else if (cat.action === 'monthly_rentals') navigate('/monthly-rentals');
                else alert(`กำลังพัฒนาระบบ: ${cat.title}`);
              }}
              style={{ 
                background: cat.bg, borderRadius: '16px', padding: '15px', 
                position: 'relative', height: '95px', cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
              }}
            >
              <h4 style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: 'bold', position: 'relative', zIndex: 2 }}>
                {cat.title}
              </h4>
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', opacity: 0.8, zIndex: 1 }}>
                {cat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ================= เมนูบริการย่อย (ที่กรองตามสิทธิ์แล้ว) ================= */}
        <div style={{ display: 'flex', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: '15px', marginBottom: '15px', gap: '10px', scrollbarWidth: 'none' }}>
          {filteredSubServices.map((sub, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                if (sub.action) navigate(`/${sub.action}`);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '65px', cursor: 'pointer' }}
            >
              <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '12px', marginBottom: '8px' }}>
                {sub.icon}
              </div>
              <span style={{ fontSize: '10px', color: '#475569', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: '1.2' }}>
                {sub.title}
              </span>
            </div>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

        {/* ================= ของขวัญต้อนรับ และ Flash Sales ================= */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>ของขวัญต้อนรับลูกค้าใหม่ ^^</h3>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
            {welcomeGifts.map((gift, idx) => (
              <div key={idx} style={{ 
                minWidth: '220px', border: '1px solid #e2e8f0', borderRadius: '12px', 
                padding: '12px', display: 'flex', alignItems: 'center', gap: '12px',
                backgroundColor: '#fff', position: 'relative'
              }}>
                <div style={{ padding: '8px', backgroundColor: '#fef9c3', borderRadius: '8px' }}>
                  {gift.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{gift.title}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>{gift.subtitle}</p>
                </div>
                <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#2563eb', fontSize: '11px', fontWeight: 'bold' }}>
                  {gift.badge}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>
              ลดราคาเวลาจำกัด - ที่พักใน<br/>เขาค้อ
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e11d48', fontSize: '12px', fontWeight: 'bold' }}>
              <Clock size={14} /> หมดอายุ 11:11:57
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
            {flashSales.map((sale, idx) => (
              <div key={idx} style={{ minWidth: '160px', borderRadius: '12px', overflow: 'hidden', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <img src={sale.img} alt={sale.title} style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: '10px', left: '0', backgroundColor: '#e11d48', color: '#fff', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>
                  {sale.discount}
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 10px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                   <p style={{ margin: 0, color: '#fff', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                     {sale.title}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <BottomNavbar />
    </div>
  );
};

export default Dashboard;