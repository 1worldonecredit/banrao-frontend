import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNavbar from '../components/BottomNavbar';
import TopNavbar from '../components/TopNavbar';
import { 
  Building2, Home,
  Gift, Clock, 
  Ticket, Percent, Utensils, MapPin, ClipboardList, CalendarCheck, HardHat, Wrench, CarTaxiFront,
  Droplets, Activity, ShieldCheck, Pencil, Shield
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [userData, setUserData] = useState({});
  const [userPermissions, setUserPermissions] = useState([]); 
  const [wallet, setWallet] = useState({ balance: 0, points: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const currencySymbol = userData.currency_code === 'USD' ? '$' : '฿';

  const mainCategories = [
    { title: 'โรงเรียในหมู่บ้าน', icon: <Building2 size={40} color="#e11d48" />, bg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', action: 'hotels' },
    { title: 'วัดในหมู่บ้าน', icon: <Utensils size={40} color="#7c3aed" />, bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', action: 'restaurants' },
    { title: 'ห้องเช่า', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'บ้านเช่า', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'รีสอร์ท', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'โรงแรม', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'ร้านค้า', icon: <Home size={40} color="#16a34a" />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', action: 'monthly_rentals' },
    { title: 'ร้านอาหาร', icon: <Home size={40} color="#16a34a" />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', action: 'monthly_rentals' },
    { title: 'ห้าสรรพสินค้า', icon: <Home size={40} color="#16a34a" />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', action: 'monthly_rentals' },
    { title: 'สถานที่ท่องเทั่ยว', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'โรงงานอุตสาหกรรม', icon: <Home size={40} color="#16a34a" />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', action: 'monthly_rentals' },
    { title: 'โอทอป', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'วิสาหกิจชุมชน', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'สถานีอนามัย ', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'โรงพยาบาล', icon: <MapPin size={40} color="#ea580c" />, bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', action: 'nearby_hotels' },
    { title: 'คลีนิค', icon: <Home size={40} color="#16a34a" />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', action: 'monthly_rentals' },
  ];

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
    const storedUser = localStorage.getItem('userData');
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

  const triggerImageSelect = () => {
    fileInputRef.current.click();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('userId', userData.id || userData.account_id);

    try {
      console.log('กำลังอัปโหลดรูปภาพ...');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/upload-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.imageUrl) {
        setUserData(prev => {
            const updatedData = { ...prev, userImage: data.imageUrl };
            localStorage.setItem('userData', JSON.stringify(updatedData));
            return updatedData;
        });
        alert('อัปโหลดรูปลงระบบสำเร็จ!');
      } else {
        alert('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถอัปโหลดได้'));
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <TopNavbar />
      
      <div className="main-content" style={{ padding: '15px 20px 90px 20px', maxWidth: '500px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '25px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
              หมู่บ้าน<span style={{color: '#e11d48'}}>.</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#dcfce7', padding: '6px 12px', borderRadius: '20px', color: '#166534', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Ticket size={16} color="#16a34a" /> 
              <span>{currencySymbol} {isLoading ? '...' : formatCurrency(wallet.balance)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            
            {/* --- Card 1: ข้อมูลผู้ใช้งาน --- */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>👤 ข้อมูลผู้ใช้งาน</div>
                
                {userData.position_name ? (
                  <div style={{ 
                    backgroundColor: userData.position_level === 'AMPHURE' ? '#fef3c7' : '#e0e7ff',
                    color: userData.position_level === 'AMPHURE' ? '#d97706' : '#4338ca', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    border: `1px solid ${userData.position_level === 'AMPHURE' ? '#fde68a' : '#c7d2fe'}`,
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <Shield size={12} /> {userData.position_name}
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                    ประชาชน
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />

                <div 
                  onClick={triggerImageSelect} 
                  style={{ cursor: 'pointer', position: 'relative', width: '65px', height: '65px', flexShrink: 0 }}
                >
                  <img 
                    src={userData.userImage || '/profile-img.jpg'} 
                    alt="User Profile" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
                  />
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#ffffff', borderRadius: '50%', padding: '4px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <Pencil size={12} color="#475569" />
                  </div>
                </div>

                {/* 🌟 ส่วนแสดงข้อมูลผู้ใช้งานที่หายไป ได้ถูกนำกลับมาใส่ให้ครบถ้วนแล้ว */}
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

            {/* --- Card 2: ข้อมูลพื้นที่รับผิดชอบ (อัจฉริยะตามระดับตำแหน่ง) --- */}
            {/* --- Card 2: ข้อมูลพื้นที่รับผิดชอบ (อัจฉริยะแบบ Overview ทุกระดับ) --- */}
            <div 
              style={{ 
                backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', 
                borderTop: `4px solid ${
                  userData.position_level === 'NATIONAL' ? '#8b5cf6' : 
                  userData.position_level === 'PROVINCE' ? '#f59e0b' : 
                  userData.position_level === 'AMPHURE'  ? '#3b82f6' : 
                  userData.position_level === 'TAMBON'   ? '#ec4899' : 
                  '#10b981' 
                }`,
                cursor: 'pointer', transition: 'transform 0.2s ease-in-out'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {userData.position_level === 'NATIONAL' && <><Building2 size={16} color="#8b5cf6"/> ส่วนกลาง (กระทรวง)</>}
                  {userData.position_level === 'PROVINCE' && <><MapPin size={16} color="#f59e0b"/> ศูนย์บัญชาการจังหวัด</>}
                  {userData.position_level === 'AMPHURE' && <><Building2 size={16} color="#3b82f6"/> ที่ว่าการอำเภอ</>}
                  {userData.position_level === 'TAMBON' && <><Home size={16} color="#ec4899"/> องค์การบริหารส่วนตำบล</>}
                  {(!userData.position_level || userData.position_level === 'VILLAGE') && <><MapPin size={16} color="#10b981"/> หมู่บ้าน{userData.villageName || '...'}</>}
                </div>
                <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  {userData.position_level && userData.position_level !== 'VILLAGE' ? 'ผู้บริหาร' : (userData.villageName ? 'อนุมัติแล้ว' : 'รออนุมัติ')}
                </div>
              </div>
              
              {/* เนื้อหาแยกตาม Level */}
              {userData.position_level === 'NATIONAL' ? (
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                  <div><strong>สังกัด:</strong> กระทรวงมหาดไทย | <strong>ผู้บริหาร:</strong> {userData.firstName} {userData.lastName}</div>
                  
                  {/* โครงสร้างพื้นที่ */}
                  <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                     <div style={{ background: '#f5f3ff', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#7c3aed', border: '1px solid #ede9fe' }}><strong>76</strong> <span style={{fontSize:'10px'}}>จังหวัด</span></div>
                     <div style={{ background: '#f5f3ff', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#7c3aed', border: '1px solid #ede9fe' }}><strong>878</strong> <span style={{fontSize:'10px'}}>อำเภอ</span></div>
                     <div style={{ background: '#f5f3ff', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#7c3aed', border: '1px solid #ede9fe' }}><strong>74K</strong> <span style={{fontSize:'10px'}}>หมู่บ้าน</span></div>
                  </div>

                  {/* สถิติประชากร Overview */}
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📊 ภาพรวมประชากรระดับประเทศ</span>
                      <span style={{ color: '#8b5cf6', cursor: 'pointer', fontSize: '11px' }} onClick={() => navigate('/national-stats')}>ดูรายละเอียด ➔</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                       <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>ประชากร (ทะเบียนราษฎร์)</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>66.09M <span style={{fontSize: '10px', fontWeight: 'normal'}}>คน</span></div>
                       </div>
                       <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#166534' }}>จำนวนครัวเรือน</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>22.5M <span style={{fontSize: '10px', fontWeight: 'normal'}}>หลัง</span></div>
                       </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                       <div style={{ backgroundColor: '#fef2f2', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>+2.5M</div><div style={{ fontSize: '9px', color: '#ef4444' }}>ประชากรแฝง</div></div>
                       <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309' }}>-3.1M</div><div style={{ fontSize: '9px', color: '#f59e0b' }}>ย้ายออก/ทำงาน</div></div>
                       <div style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>2.8M</div><div style={{ fontSize: '9px', color: '#3b82f6' }}>ชาวต่างชาติ</div></div>
                    </div>
                  </div>
                </div>

              ) : userData.position_level === 'PROVINCE' ? (
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                  <div><strong>จังหวัด:</strong> {userData.provinceName || 'ขอนแก่น (จำลอง)'} | <strong>ผู้ว่าฯ:</strong> {userData.firstName} {userData.lastName}</div>
                  
                  <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                     <div style={{ background: '#fef3c7', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#d97706', border: '1px solid #fde68a' }}><strong>26</strong> <span style={{fontSize:'10px'}}>อำเภอ</span></div>
                     <div style={{ background: '#fef3c7', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#d97706', border: '1px solid #fde68a' }}><strong>198</strong> <span style={{fontSize:'10px'}}>ตำบล</span></div>
                     <div style={{ background: '#fef3c7', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#d97706', border: '1px solid #fde68a' }}><strong>2,331</strong> <span style={{fontSize:'10px'}}>หมู่บ้าน</span></div>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📊 ภาพรวมประชากรระดับจังหวัด</span>
                      <span style={{ color: '#d97706', cursor: 'pointer', fontSize: '11px' }} onClick={() => navigate('/province-stats')}>ดูรายละเอียด ➔</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                       <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>ประชากร (ทะเบียนราษฎร์)</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>1.79M <span style={{fontSize: '10px', fontWeight: 'normal'}}>คน</span></div>
                       </div>
                       <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#166534' }}>จำนวนครัวเรือน</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>580K <span style={{fontSize: '10px', fontWeight: 'normal'}}>หลัง</span></div>
                       </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                       <div style={{ backgroundColor: '#fef2f2', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>+45K</div><div style={{ fontSize: '9px', color: '#ef4444' }}>ประชากรแฝง</div></div>
                       <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309' }}>-120K</div><div style={{ fontSize: '9px', color: '#f59e0b' }}>ย้ายออก/ทำงาน</div></div>
                       <div style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>15K</div><div style={{ fontSize: '9px', color: '#3b82f6' }}>ชาวต่างชาติ</div></div>
                    </div>
                  </div>
                </div>

              ) : userData.position_level === 'AMPHURE' ? (
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                  <div><strong>อำเภอ:</strong> {userData.amphureName || 'เมือง'} จ.{userData.provinceName || 'ขอนแก่น'} | <strong>นายอำเภอ:</strong> {userData.firstName}</div>
                  
                  <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                     <div style={{ background: '#eff6ff', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#2563eb', border: '1px solid #bfdbfe' }}><strong>18</strong> <span style={{fontSize:'10px'}}>ตำบล</span></div>
                     <div style={{ background: '#eff6ff', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#2563eb', border: '1px solid #bfdbfe' }}><strong>250</strong> <span style={{fontSize:'10px'}}>หมู่บ้าน</span></div>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📊 ภาพรวมประชากรระดับอำเภอ</span>
                      <span style={{ color: '#2563eb', cursor: 'pointer', fontSize: '11px' }} onClick={() => navigate('/amphure-stats')}>ดูรายละเอียด ➔</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                       <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>ประชากร (ทะเบียนราษฎร์)</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>412K <span style={{fontSize: '10px', fontWeight: 'normal'}}>คน</span></div>
                       </div>
                       <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#166534' }}>จำนวนครัวเรือน</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>150K <span style={{fontSize: '10px', fontWeight: 'normal'}}>หลัง</span></div>
                       </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                       <div style={{ backgroundColor: '#fef2f2', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>+12K</div><div style={{ fontSize: '9px', color: '#ef4444' }}>ประชากรแฝง</div></div>
                       <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309' }}>-8K</div><div style={{ fontSize: '9px', color: '#f59e0b' }}>ย้ายออก/ทำงาน</div></div>
                       <div style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>4.5K</div><div style={{ fontSize: '9px', color: '#3b82f6' }}>ชาวต่างชาติ</div></div>
                    </div>
                  </div>
                </div>

              ) : userData.position_level === 'TAMBON' ? (
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                  <div><strong>ต.</strong>{userData.tambonName || 'บ้านเป็ด'} อ.{userData.amphureName || 'เมือง'} | <strong>นายกฯ:</strong> {userData.firstName}</div>
                  
                  <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                     <div style={{ background: '#fdf2f8', padding: '4px', borderRadius: '6px', flex: 1, textAlign: 'center', color: '#db2777', border: '1px solid #fbcfe8' }}><strong>15</strong> <span style={{fontSize:'10px'}}>หมู่บ้านรับผิดชอบ</span></div>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📊 ภาพรวมประชากรระดับตำบล</span>
                      <span style={{ color: '#db2777', cursor: 'pointer', fontSize: '11px' }} onClick={() => navigate('/tambon-stats')}>ดูรายละเอียด ➔</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                       <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>ประชากร (ทะเบียนราษฎร์)</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>45K <span style={{fontSize: '10px', fontWeight: 'normal'}}>คน</span></div>
                       </div>
                       <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0', flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#166534' }}>จำนวนครัวเรือน</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>18K <span style={{fontSize: '10px', fontWeight: 'normal'}}>หลัง</span></div>
                       </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                       <div style={{ backgroundColor: '#fef2f2', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>+2K</div><div style={{ fontSize: '9px', color: '#ef4444' }}>ประชากรแฝง</div></div>
                       <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309' }}>-1.5K</div><div style={{ fontSize: '9px', color: '#f59e0b' }}>ย้ายออก/ทำงาน</div></div>
                       <div style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>500</div><div style={{ fontSize: '9px', color: '#3b82f6' }}>ชาวต่างชาติ</div></div>
                    </div>
                  </div>
                </div>

              ) : (
                /* โครงสร้างระดับหมู่บ้าน (ผู้ใหญ่บ้าน/อสม./ประชาชน) - เหมือนที่คุณอัปเดตล่าสุด */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img 
                      src={userData.headmanImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80'} 
                      alt="Headman Profile" 
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }} 
                    />
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#0f172a' }}>ผู้ใหญ่บ้าน:</strong> 
                        <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{userData.headmanName || '-'}</span>
                      </div>
                      <div style={{ color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                        <span style={{ marginTop: '1px' }}>📍</span>
                        <span style={{ fontSize: '11px' }}>ต.{userData.tambonName || '-'} อ.{userData.amphureName || '-'} จ.{userData.provinceName || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📊 สถิติประชากรในพื้นที่</span>
                      <span style={{ color: '#10b981', cursor: 'pointer', fontSize: '11px' }} onClick={() => navigate('/population-details')}>ดูรายละเอียด ➔</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                       <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>ตามทะเบียนบ้าน</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                             <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>125 <span style={{fontSize: '10px', fontWeight: 'normal'}}>ครัวเรือน</span></span>
                             <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>450 <span style={{fontSize: '10px', fontWeight: 'normal'}}>คน</span></span>
                          </div>
                       </div>
                       <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '10px', color: '#166534' }}>อาศัยอยู่จริง (ลงทะเบียน)</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                             <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>118 <span style={{fontSize: '10px', fontWeight: 'normal'}}>ครัวเรือน</span></span>
                             <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d' }}>412 <span style={{fontSize: '10px', fontWeight: 'normal'}}>คน</span></span>
                          </div>
                       </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                       <div style={{ backgroundColor: '#fef2f2', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>+25</div><div style={{ fontSize: '9px', color: '#ef4444' }}>ประชากรแฝง</div></div>
                       <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309' }}>-63</div><div style={{ fontSize: '9px', color: '#f59e0b' }}>ย้ายออก/ทำงาน</div></div>
                       <div style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>12</div><div style={{ fontSize: '9px', color: '#3b82f6' }}>ชาวต่างชาติ</div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div> 
        </div> 

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
            {/* ================= ส่วนแสดงสถานที่ในชุมชน (Community Places) ================= */}
        <div style={{ marginTop: '30px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>
              สถานที่และบริการในพื้นที่
            </h3>
            <span style={{ color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>ดูทั้งหมด</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* --- Mock Data แบบ Array (ในอนาคตเปลี่ยนเป็น map จาก API) --- */}
            {[
              {
                id: 1,
                name: 'โรงเรียนบ้านโคกสว่าง',
                category: 'โรงเรียนในหมู่บ้าน',
                desc: 'โรงเรียนประจำหมู่บ้าน เปิดสอนอนุบาล ถึง ป.6 (ส่วนราชการ)',
                img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80',
                isOpen: true,
                visibility: 'ระดับตำบล',
                services: ['รับสมัครครูอัตราจ้าง', 'มีสนามฟุตบอลสาธารณะ'],
                owner: { name: 'นายก อบต', role: 'ส่วนราชการ', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80' }
              },
              {
                id: 2,
                name: 'แซ่บอีหลี ส้มตำไก่ย่าง',
                category: 'ร้านอาหาร',
                desc: 'ร้านส้มตำรสเด็ดประจำหมู่บ้าน อร่อยสะอาด ราคาเป็นกันเอง',
                img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
                isOpen: true,
                visibility: 'สาธารณะ',
                services: ['มีบริการส่งถึงบ้าน', 'รับคนล้างจาน ด่วน!'],
                owner: { name: 'ป้าอสม ใจดี', role: 'อสม. / ชาวบ้าน', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80' }
              }
            ].map((place) => (
              
              /* --- ดีไซน์ Card สถานที่ --- */
              <div key={place.id} style={{ 
                backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                cursor: 'pointer'
              }}>
                {/* ส่วนรูปภาพปก */}
                <div style={{ position: 'relative', height: '140px' }}>
                  <img src={place.img} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* ป้ายสถานะ เปิด/ปิด */}
                  <div style={{ 
                    position: 'absolute', top: '12px', right: '12px', 
                    backgroundColor: place.isOpen ? '#10b981' : '#ef4444', 
                    color: '#fff', padding: '4px 10px', borderRadius: '20px', 
                    fontSize: '11px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {place.isOpen ? '🟢 เปิดให้บริการ' : '🔴 ปิดแล้ว'}
                  </div>

                  {/* ป้ายหมวดหมู่ */}
                  <div style={{ 
                    position: 'absolute', top: '12px', left: '12px', 
                    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                    color: '#fff', padding: '4px 10px', borderRadius: '8px', 
                    fontSize: '11px', fontWeight: 'bold'
                  }}>
                    {place.category}
                  </div>
                </div>

                {/* ส่วนเนื้อหาและโปรไฟล์ผู้โพสต์ */}
                <div style={{ padding: '15px', position: 'relative' }}>
                  
                  {/* โปรไฟล์ผู้โพสต์ (ลอยทับรูปปกและเนื้อหา) */}
                  <div style={{ position: 'absolute', top: '-25px', right: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <img 
                      src={place.owner.img} 
                      alt={place.owner.name} 
                      style={{ width: '45px', height: '45px', borderRadius: '50%', border: '3px solid #fff', objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} 
                    />
                    <div style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginTop: '2px', border: '1px solid #e2e8f0' }}>
                      เพิ่มโดย: {place.owner.name}
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 'bold', paddingRight: '50px' }}>
                    {place.name}
                  </h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                    {place.desc}
                  </p>

                  {/* บริการเสริม (Services Badges) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {place.services.map((srv, idx) => (
                      <span key={idx} style={{ 
                        backgroundColor: srv.includes('ด่วน') || srv.includes('รับสมัคร') ? '#fee2e2' : '#eff6ff', 
                        color: srv.includes('ด่วน') || srv.includes('รับสมัคร') ? '#b91c1c' : '#2563eb', 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold',
                        border: `1px solid ${srv.includes('ด่วน') || srv.includes('รับสมัคร') ? '#fca5a5' : '#bfdbfe'}`
                      }}>
                        {srv.includes('ส่ง') ? '🛵' : srv.includes('สมัคร') || srv.includes('งาน') ? '💼' : '✨'} {srv}
                      </span>
                    ))}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0 0 10px 0' }} />

                  {/* Footer: สิทธิ์การมองเห็น */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} color="#64748b" /> สิทธิ์การมองเห็น: <strong style={{ color: '#475569' }}>{place.visibility}</strong>
                    </div>
                    <strong style={{ color: '#3b82f6' }}>คลิกดูรายละเอียด ➔</strong>
                  </div>

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