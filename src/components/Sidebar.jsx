import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// นำเข้าไอคอนทั้งหมดที่คุณอาจจะต้องใช้เผื่อไว้
import { ClipboardList, PlaySquare, Users, Settings, LogOut, X, Bell, Camera, Save, XCircle, CheckCircle2, User, Shield, BookOpen, BookHeart } from 'lucide-react';

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
  return icons[name] || <ClipboardList size={size} color={color} />; // ถ้าหาไม่เจอใช้ค่า default
};

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('userData') || '{}'));
  // State สำหรับเก็บเมนูที่ดึงมาจาก API
  const [menuGroups, setMenuGroups] = useState([]);

  // ดึงเมนูจาก Backend ทันทีที่เปิด Sidebar
  useEffect(() => {
     const fetchMenus = async () => {
         // หา account_id หรือ user_id จาก LocalStorage
         const accountId = userData.account_id || userData.id || userData.user_id;
         
         if (!accountId) return; // ถ้ายังไม่ Login ไม่ต้องดึง

         try {
             // ยิง API ไปที่ Backend ของเรา
             const response = await fetch(`${API_URL}/api/sidebar-menus/${accountId}`);
             const result = await response.json();

             if (result.success) {
                 setMenuGroups(result.data); // เอาข้อมูลที่จัดกลุ่มแล้วไปแสดงหน้าจอ
             } else {
                 console.error("Failed to load menus:", result.message);
             }
         } catch (error) {
             console.error("API Error fetching menus:", error);
         }
     };
     
     fetchMenus();
  }, [userData]);

  // ... (ฟังก์ชัน handleUpload และอื่นๆ คงไว้เหมือนเดิม) ...

  return (
    <>
      {/* ... (ส่วน overlay และโครงร่าง Sidebar เหมือนเดิม) ... */}
      
      {/* ส่วน Profile รูปภาพ (เหมือนเดิม) */}

      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '0 20px 15px 20px' }} />

      {/* 🌟 4. Menu List แบบ Dynamic ตาม Group */}
      <div 
        className="sidebar-menu-container"
        style={{ flex: 1, overflowY: 'auto', padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '15px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.sidebar-menu-container::-webkit-scrollbar { display: none; }`}</style>
        
        {/* วนลูปตามกลุ่มเมนู */}
        {menuGroups.map((group, gIndex) => (
            <div key={gIndex}>
                {/* ชื่อกลุ่มเมนู */}
                <div style={{ padding: '0 10px', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    {group.group_name}
                </div>
                
                {/* รายการเมนูในกลุ่มนั้นๆ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {group.menus.map((menu, mIndex) => (
                        <button 
                            key={mIndex}
                            onClick={() => { navigate(menu.path); onClose(); }} 
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: 'transparent', border: 'none', borderRadius: '12px', color: '#cbd5e1', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
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

      {/* 🌟 5. Bottom (เหมือนเดิม) */}
      
    </>
  );
};

export default Sidebar;