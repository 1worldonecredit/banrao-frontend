import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, PlaySquare, Users, Settings, LogOut, X, Bell,
  Camera, Save, XCircle, CheckCircle2, User, Shield, BookOpen,
  BookHeart, MapPin, Activity, FileText, LayoutList, HeartPulse,
  Stethoscope, Droplets, Store, Home, CreditCard, UserCheck
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const IconMapper = ({ name, size, color }) => {
  const icons = {
    User: <User size={size} color={color} />,
    ClipboardList: <ClipboardList size={size} color={color} />,
    Users: <Users size={size} color={color} />,
    PlaySquare: <PlaySquare size={size} color={color} />,
    Bell: <Bell size={size} color={color} />,
    Shield: <Shield size={size} color={color} />,
    BookOpen: <BookOpen size={size} color={color} />,
    BookHeart: <BookHeart size={size} color={color} />,
    MapPin: <MapPin size={size} color={color} />,
    Activity: <Activity size={size} color={color} />,
    FileText: <FileText size={size} color={color} />,
    LayoutList: <LayoutList size={size} color={color} />,
    HeartPulse: <HeartPulse size={size} color={color} />,
    Stethoscope: <Stethoscope size={size} color={color} />,
    Droplets: <Droplets size={size} color={color} />,
    Store: <Store size={size} color={color} />,
    Home: <Home size={size} color={color} />,
    CreditCard: <CreditCard size={size} color={color} />
  };
  return icons[name] || <ClipboardList size={size} color={color} />;
};

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(() => JSON.parse(localStorage.getItem('userData') || '{}'));
  const [securityCtx, setSecurityCtx] = useState(null);
  const [menuGroups, setMenuGroups] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(userData.userImage || '/profile-img.jpg');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    localStorage.removeItem('menuPermissions');
    navigate('/login');
  };

  // ดึงเมนูและตรวจสิทธิ์ 6 มิติสดจากฐานข้อมูลทุกครั้งที่เปิด Sidebar
  useEffect(() => {
    if (!isOpen) return;

    const stored = JSON.parse(localStorage.getItem('userData') || '{}');
    const accountId = stored.account_id || stored.id || stored.user_id;
    if (!accountId) return;

    let cancelled = false;
    const fetchMenus = async () => {
      setLoadingMenus(true);
      try {
        const response = await authFetch(`${API_URL}/api/sidebar-menus/${accountId}`);
        const result = await response.json();

        if (cancelled) return;

        // หากบัญชีถูกระงับหรือหมดสิทธิ์ใช้งาน บังคับออกจากระบบทันที
        if (response.status === 401 || response.status === 403 || result.code === 'ACCOUNT_BLOCKED') {
          alert(result.message || 'บัญชีของคุณถูกระงับหรือไม่สามารถใช้งานระบบได้');
          handleLogout();
          return;
        }

        if (result.success && Array.isArray(result.data)) {
          setMenuGroups(result.data);
          if (result.permissionsMap) {
            localStorage.setItem('menuPermissions', JSON.stringify(result.permissionsMap));
          }
          if (result.securityContext) {
            const ctx = result.securityContext;
            setSecurityCtx(ctx);

            // อัปเดต localStorage ให้ตรงกับสิทธิ์ล่าสุดจากฐานข้อมูลเสมอ (เช่น หลังผู้ใหญ่บ้านอนุมัติ/ถอดถอน)
            const syncedUser = {
              ...stored,
              village_id: ctx.village_id || stored.village_id,
              villageName: ctx.village_name || stored.villageName,
              village_no: ctx.village_no || stored.village_no,
              role: ctx.role,
              tier_code: ctx.tier_code,
              position_name: ctx.display_position_name,
              role_templates: ctx.role_templates,
              referrer: ctx.referrer,
              userImage: ctx.user_image || stored.userImage
            };
            localStorage.setItem('userData', JSON.stringify(syncedUser));
            setUserData(syncedUser);
            if (!selectedFile && ctx.user_image) setPreviewUrl(ctx.user_image);
          }
        } else {
          setMenuGroups([]);
        }
      } catch (error) {
        console.error('API Error fetching menus:', error);
      } finally {
        if (!cancelled) setLoadingMenus(false);
      }
    };

    fetchMenus();
    return () => { cancelled = true; };
  }, [isOpen]);

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
        headers: { Authorization: `Bearer ${token}` },
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
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
    } finally {
      setIsUploading(false);
    }
  };

  const displayName = securityCtx?.full_name || userData.full_name || userData.firstName || userData.username_phone || 'ผู้ใช้งานระบบ';
  const displayPosition = securityCtx?.display_position_name || userData.position_name || 'ประชาชนทั่วไป';
  const displayVillage = securityCtx?.village_full_address || (userData.villageName ? `${userData.villageName} หมู่ ${userData.village_no || '-'}` : '');
  const referrer = securityCtx?.referrer || userData.referrer || null;

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
          width: '285px', maxWidth: '80vw',
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
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

        {/* 1. Profile + ข้อมูลยืนยันตัวตน 6 มิติ (หมู่บ้าน / ตำแหน่ง / ผู้แนะนำ / สถานะ) */}
        <div style={{ padding: '0 18px', marginBottom: '16px', display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={() => document.getElementById('profile-upload-sidebar').click()}>
              <img
                src={previewUrl}
                alt="Profile"
                style={{ width: '58px', height: '58px', borderRadius: '50%', border: '2px solid #00e5ff', objectFit: 'cover', opacity: isUploading ? 0.5 : 1, backgroundColor: '#1e293b' }}
              />
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#0284c7', padding: '4px', borderRadius: '50%', border: '2px solid rgba(15, 23, 42, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={13} color="#fff" />
              </div>
              <input type="file" id="profile-upload-sidebar" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ color: '#ffffff', fontSize: '15px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399', padding: '2px 8px', borderRadius: '12px',
                fontSize: '11px', marginTop: '4px', fontWeight: 'bold', width: 'fit-content'
              }}>
                <Shield size={10} /> {displayPosition}
              </div>
            </div>
          </div>

          {/* บัตรข้อมูลสังกัดหมู่บ้าน & ผู้แนะนำ */}
          {(displayVillage || referrer) && (
            <div style={{
              marginTop: '12px', padding: '8px 10px', borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              {displayVillage && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin size={12} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.35 }}>{displayVillage}</span>
                </div>
              )}
              {referrer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                  <UserCheck size={12} color="#34d399" style={{ flexShrink: 0 }} />
                  <span>ผู้แนะนำ: {referrer.full_name}</span>
                </div>
              )}
            </div>
          )}

          {selectedFile && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}
              >
                <XCircle size={16} />
              </button>
            </div>
          )}

          {uploadSuccess && (
            <div style={{ marginTop: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#4ade80', padding: '8px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
              <CheckCircle2 size={16} /> บันทึกโปรไฟล์สำเร็จ!
            </div>
          )}
        </div>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '0 18px 12px 18px' }} />

        {/* 2. Menu List แบบ Dynamic ตามสิทธิ์จริง */}
        <div
          className="sidebar-menu-container"
          style={{ flex: 1, overflowY: 'auto', padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '14px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.sidebar-menu-container::-webkit-scrollbar { display: none; }`}</style>

          {loadingMenus && menuGroups.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '20px' }}>
              กำลังตรวจสอบสิทธิ์และโหลดเมนู...
            </div>
          ) : menuGroups.length > 0 ? (
            menuGroups.map((group, gIndex) => (
              <div key={group.group_id || gIndex}>
                <div style={{ padding: '0 10px', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '0.8px' }}>
                  {group.group_name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Array.isArray(group.menus) && group.menus.map((menu, mIndex) => (
                    <button
                      key={menu.menu_id || mIndex}
                      onClick={() => { navigate(menu.path); onClose(); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', borderRadius: '12px', color: '#cbd5e1', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', textAlign: 'left' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <IconMapper name={menu.icon} size={18} color="#00e5ff" />
                        <span>{menu.name}</span>
                      </div>
                      {menu.badge && (
                        <span style={{ backgroundColor: '#0284c7', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '12px' }}>{menu.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '20px' }}>
              ไม่พบเมนูที่ได้รับสิทธิ์
            </div>
          )}
        </div>

        {/* 3. Bottom Actions */}
        <div style={{ padding: '14px 18px 0 18px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => { navigate('/profile'); onClose(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', backgroundColor: 'transparent', border: 'none', borderRadius: '12px', color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <Settings size={19} color="#94a3b8" /> ตั้งค่าบัญชี
          </button>

          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '12px', color: '#ff4d4d', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <LogOut size={19} color="#ff4d4d" /> ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;