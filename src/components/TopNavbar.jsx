import React, { useState, useEffect } from 'react';
import { LogIn, Globe, Gamepad2, Bell, Menu } from 'lucide-react'; // นำเข้า Icon 3 ขีด (Menu)
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar'; // นำเข้า Sidebar

const API_URL = import.meta.env.VITE_API_URL || 'https://apibooking.smartsoft.agency';

const TopNavbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // State ควบคุม Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // useEffect(() => {
  //   const storedUser = localStorage.getItem('userData');
  //   if (storedUser) {
  //     setIsLoggedIn(true);
  //     const user = JSON.parse(storedUser);
  //     const uid = user.id || user.user_id;

  //     const fetchUnreadNotifications = async () => {
  //       try {
  //         const res = await fetch(`${API_URL}/api/notifications/${uid}`);
  //         const data = await res.json();
  //         if (data.success) {
  //           setUnreadCount(data.unreadCount || 0);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching notifications count", error);
  //       }
  //     };

  //     fetchUnreadNotifications();
  //     const interval = setInterval(fetchUnreadNotifications, 10000); // ดึงข้อมูลทุก 10 วิ
  //     return () => clearInterval(interval);
  //   }
  // }, []);

  const toggleLanguage = () => {
    const currentLang = i18n.language || 'lo';
    const newLang = currentLang.includes('lo') ? 'th' : 'lo';
    i18n.changeLanguage(newLang);
  };

  return (
    <>
      {/* วาง Sidebar ไว้ที่ Root โดยไม่มีผลกับ Layout ของ Navbar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="top-navbar">
        {/* ฝั่งซ้าย */}
        <div className="nav-group">
          {/* ปุ่มเมนู 3 ขีด ใช้โครงสร้าง btn-icon เดิมของระบบ */}
          <button className="btn-icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <h2 className="nav-logo" onClick={() => navigate('/')}>BAN RAO</h2>
         
        </div>

        {/* ฝั่งขวา */}
        <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn-icon btn-lang" onClick={toggleLanguage}>
            <Globe size={18} />
            {i18n.language?.includes('lo') ? 'LA' : 'TH'}
          </button>

          {/* 🌟 กระดิ่งแจ้งเตือน ลิงก์ไปหน้าระบบแจ้งเตือน */}
          {isLoggedIn && (
            <button 
              className="btn-icon" 
              onClick={() => navigate('/notifications')} 
              style={{ position: 'relative', padding: '8px', borderRadius: '50%', backgroundColor: '#727272', border: 'none', cursor: 'pointer' }}
            >
              <Bell size={18} color="#374151" />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '-2px',
                  backgroundColor: '#230549', color: 'white',
                  fontSize: '10px', fontWeight: 'bold',
                  minWidth: '16px', height: '16px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid white'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          <button 
            className="btn-icon btn-login" 
            onClick={() => navigate('/login')}
            style={{ padding: '8px', borderRadius: '50%' }} 
          >
            <LogIn size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default TopNavbar;