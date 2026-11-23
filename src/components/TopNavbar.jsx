import React, { useState, useEffect } from 'react';
import { LogIn, Menu, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

const TopNavbar = () => {
  const navigate = useNavigate();

  // State ควบคุม Sidebar และข้อมูลผู้ใช้งานที่ล็อกอินอยู่
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || 'null');
    } catch {
      return null;
    }
  });

  // ซิงค์ข้อมูลอัตโนมัติเมื่อมีการอัปเดตโปรไฟล์หรือรูปภาพ
  useEffect(() => {
    const syncUser = () => {
      try {
        setUserData(JSON.parse(localStorage.getItem('userData') || 'null'));
      } catch {
        setUserData(null);
      }
    };
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const isLoggedIn = Boolean(userData && (userData.account_id || userData.id));
  const walletBalance = Number(userData?.wallet_balance || 0);

  return (
    <>
      {/* Sidebar เมนูด้านข้าง */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div
        className="top-navbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)'
        }}
      >
        {/* ฝั่งซ้าย: ปุ่มเมนู 3 ขีด + โลโก้ BAN RAO */}
        <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn-icon"
            onClick={() => setIsSidebarOpen(true)}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0f172a'
            }}
          >
            <Menu size={22} />
          </button>

          <h2
            className="nav-logo"
            onClick={() => navigate('/dashboard')}
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              background: 'linear-gradient(135deg, #dc2626, #ea580c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            BAN RAO
          </h2>
        </div>

        {/* ฝั่งขวา: ยอดเงิน + กระดิ่งแจ้งเตือน + รูปโปรไฟล์ (หรือปุ่มล็อกอิน) */}
        <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isLoggedIn ? (
            <>
              {/* 💰 ป้ายแสดงยอดเงิน (รอพัฒนาเชื่อมระบบ Wallet จริงต่อ) */}
              <button
                type="button"
                onClick={() => navigate('/wallet')}
                title="กระเป๋าเงินของฉัน"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: '1px solid #a7f3d0',
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                  color: '#065f46',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
                }}
              >
                <Wallet size={15} color="#059669" />
                <span>฿{walletBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </button>

              {/* 🔔 กระดิ่งแจ้งเตือน (พร้อมระบบอ่านออกเสียงภาษาไทย) */}
              <NotificationBell />

              {/* 👤 รูปโปรไฟล์ผู้ใช้งาน (กดเพื่อไปหน้า Profile) */}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                title={userData?.full_name || 'โปรไฟล์ของฉัน'}
                style={{
                  padding: '2px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <img
                  src={userData?.userImage || '/profile-img.jpg'}
                  alt="Profile"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #ffffff',
                    display: 'block'
                  }}
                />
              </button>
            </>
          ) : (
            /* ปุ่มเข้าสู่ระบบ (แสดงเมื่อยังไม่ได้ล็อกอิน) */
            <button
              className="btn-icon btn-login"
              onClick={() => navigate('/login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <LogIn size={16} />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TopNavbar;