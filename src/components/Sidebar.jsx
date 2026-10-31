import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, PlaySquare, Users, Settings, LogOut, X, Bell, Camera, Save, XCircle, CheckCircle2, User, Shield, BookOpen, BookHeart, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// ตัวช่วยแปลงชื่อไอคอนเป็น Component จริง
const IconMapper = ({ name, size, color }) => {
  const icons = {
    User: <User size={size} color={color} />,
    ClipboardList: <ClipboardList size={size} color={color} />,
    Users: <Users size={size} color={color} />,
    PlaySquare: <PlaySquare size={size} color={color} />,
    Bell: <Bell size={size} color={color} />,
    Shield: <Shield size={size} color={color} />,
    BookOpen: <BookOpen size={size} color={color} />,
    BookHeart: <BookHeart size={size} color={color} />
  };
  return icons[name] || <ClipboardList size={size} color={color} />;
};

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('userData') || '{}'));
  
  // 🌟 State สำหรับเมนู Dynamic
  const [menuGroups, setMenuGroups] = useState([]);

  // 🌟 State สำหรับระบบอัปโหลด Profile
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(userData.userImage || '/profile-img.jpg');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // ดึงเมนูจาก Backend ทันทีที่เปิด Sidebar
  useEffect(() => {
     const fetchMenus = async () => {
         const accountId = userData.account_id || userData.id || userData.user_id;
         if (!accountId) return;

         try {
             const response = await fetch(`${API_URL}/api/sidebar-menus/${accountId}`);
             const result = await response.json();
             if (result.success) {
                 setMenuGroups(result.data);
             } else {
                 console.error("Failed to load menus:", result.message);
             }
         } catch (error) {
             console.error("API Error fetching menus:", error);
         }
     };
     fetchMenus();
  }, [userData]);

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    navigate('/login');
  };

  // 🌟 ฟังก์ชันเมื่อเลือกไฟล์รูปภาพใหม่
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadSuccess(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(userData.userImage || '/profile-img.jpg');
  };

  // 🌟 ฟังก์ชันอัปโหลดรูปภาพ (ใช้ API Cloudflare ที่เราสร้างไว้)
  const handleSaveProfile = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('profileImage', selectedFile);
    formData.append('userId', userData.id || userData.account_id);

    try {
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
        const updatedUser = { ...userData, userImage: data.imageUrl };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser); 
        setPreviewUrl(data.imageUrl); 

        setUploadSuccess(true);
        setSelectedFile(null);
        setTimeout(() => setUploadSuccess(false), 3000); 
      } else {
        alert('บันทึกไม่สำเร็จ: ' + (data.error || 'เซิร์ฟเวอร์ขัดข้อง'));
      }
    } catch (error) {
      console.error("Save Profile Error:", error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9998,
          opacity: isOpen ? 1 : 0, visibility: isOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease-in-out'
        }}
      />

      <div 
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: '280px', maxWidth: '75vw',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(0, 240, 255, 0.2)',
          boxShadow: '4px 0 25px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column', padding: '20px 0', boxSizing: 'border-box'
        }}
      >
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '5px' }}
        >
          <X size={24} />
        </button>

        {/* 🌟 1. Profile & Upload Section */}
        <div style={{ padding: '0 20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* กล่องรูป Profile ที่คลิกเพื่อเลือกไฟล์ได้ */}
            <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={() => document.getElementById('profile-upload-sidebar').click()}>
              <img 
                src={previewUrl} 
                alt="Profile" 
                style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #00e5ff', objectFit: 'cover', opacity: isUploading ? 0.5 : 1, backgroundColor: '#1e293b' }}
              />
              <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', backgroundColor: '#0284c7', padding: '4px', borderRadius: '50%', border: '2px solid rgba(15, 23, 42, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={14} color="#fff" />
              </div>
              <input 
                type="file" 
                id="profile-upload-sidebar" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                {userData.firstName ? `${userData.firstName} ${userData.lastName}` : 'ผู้ใช้งานระบบ'}
              </span>
              
              {/* 🌟 แสดงตำแหน่งหน้าที่แทนที่ My Account */}
              {userData.position_name ? (
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '4px', 
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  marginTop: '4px',
                  fontWeight: 'bold',
                  width: 'fit-content'
                }}>
                  <Shield size={10} /> {userData.position_name}
                </div>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>ประชาชน</span>
              )}
            </div>
          </div>

          {/* 🌟 ปุ่มบันทึก จะโชว์เมื่อมีการเลือกไฟล์ใหม่เท่านั้น */}
          {selectedFile && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
              <button 
                onClick={handleSaveProfile}
                disabled={isUploading}
                style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: 'bold', cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <Save size={16} /> {isUploading ? 'กำลังอัปโหลด...' : 'บันทึกรูป'}
              </button>
              <button 
                onClick={handleCancelUpload}
                disabled={isUploading}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <XCircle size={16} />
              </button>
            </div>
          )}

          {/* 🌟 ข้อความแจ้งเตือนเมื่อบันทึกสำเร็จ */}
          {uploadSuccess && (
            <div style={{ marginTop: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#4ade80', padding: '8px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
              <CheckCircle2 size={16} /> บันทึกโปรไฟล์สำเร็จ!
            </div>
          )}

        </div>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '0 20px 15px 20px' }} />

        {/* 🌟 2. Menu List แบบ Dynamic ตาม Group */}
        <div 
          className="sidebar-menu-container"
          style={{ flex: 1, overflowY: 'auto', padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '15px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.sidebar-menu-container::-webkit-scrollbar { display: none; }`}</style>
          
          {menuGroups.map((group, gIndex) => (
              <div key={gIndex}>
                  <div style={{ padding: '0 10px', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                      {group.group_name}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {group.menus.map((menu, mIndex) => (
                          <button 
                              key={mIndex}
                              onClick={() => { navigate(menu.path); onClose(); }} 
                              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: 'transparent', border: 'none', borderRadius: '12px', color: '#cbd5e1', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <IconMapper name={menu.icon} size={18} color="#00e5ff" /> 
                                  {menu.name}
                              </div>
                              {menu.badge && (
                                  <span style={{ backgroundColor: '#0284c7', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '12px' }}>{menu.badge}</span>
                              )}
                          </button>
                      ))}
                  </div>
              </div>
          ))}
        </div>

        {/* 🌟 3. Bottom Actions */}
        <div style={{ padding: '15px 20px 0 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', backgroundColor: 'transparent', border: 'none', borderRadius: '12px', color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            <Settings size={20} color="#94a3b8" /> ตั้งค่าบัญชี
          </button>
          
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '12px', color: '#ff4d4d', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
            <LogOut size={20} color="#ff4d4d" /> ออกจากระบบ
          </button>
        </div>

      </div>
    </>
  );
};

export default Sidebar;