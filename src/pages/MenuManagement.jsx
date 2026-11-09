import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, LayoutList } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const MenuManagement = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // State หลักสำหรับเก็บข้อมูล
  const [menus, setMenus] = useState([]); // รายการเมนูทั้งหมดที่ดึงมาจากฐานข้อมูล
  const [roles, setRoles] = useState([]); // รายชื่อตำแหน่งจากตาราง sys_positions
  
  // State สำหรับจัดการ Modal (หน้าต่างป๊อปอัป)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null); // เช็คว่าเป็นการเพิ่มใหม่ (null) หรือแก้ไข (มีข้อมูล)
  const [formData, setFormData] = useState({
    menu_name: '',
    icon_name: 'FileText',
    route_path: '',
    selected_roles: [] 
  });

  // 🌟 useEffect: ทำงานครั้งเดียวเมื่อเปิดหน้าเพจนี้ (ดึงข้อมูลเมนูและตำแหน่ง)
  useEffect(() => {
    // 1. ฟังก์ชันดึงรายชื่อตำแหน่ง (เพื่อทำ Checkbox)
    const fetchPositions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/positions`);
        const result = await res.json();
        if (result.success) {
          // แปลงข้อมูลให้อยู่ในรูปแบบที่ UI นำไปใช้ง่ายขึ้น
          const loadedRoles = result.data.map(pos => ({
            id: pos.position_id,
            role_name: pos.position_name
          }));
          setRoles(loadedRoles);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };

    // 2. ฟังก์ชันดึงรายการเมนู (เพื่อมาแสดงตารางตรงกลางจอ)
    const fetchMenus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/menus`);
        const result = await res.json();
        if (result.success) {
          setMenus(result.data);
        }
      } catch (error) {
        console.error("Error fetching menus:", error);
      }
    };

    // เรียกใช้ฟังก์ชันดึงข้อมูลทั้งสองตัว
    fetchPositions();
    fetchMenus();
  }, []);

  // 🌟 ฟังก์ชัน: เปิด Modal (ทั้งกรณีเพิ่มใหม่ และ แก้ไข)
  const handleOpenModal = (menu = null) => {
    if (menu) {
      // 🛠 กรณี: กดปุ่ม "แก้ไข"
      setEditingMenu(menu);
      setFormData({
        menu_name: menu.menu_name || '',
        icon_name: menu.icon_name || 'Activity',
        route_path: menu.route_path || '',
        // ดึง role ที่เคยเลือกไว้ (ที่ส่งมาจาก Backend เป็น array ของ ID) มาตั้งเป็นค่าเริ่มต้น
        selected_roles: menu.selected_roles || [] 
      });
    } else {
      // 🆕 กรณี: กดปุ่ม "สร้างเมนูใหม่"
      setEditingMenu(null);
      setFormData({ menu_name: '', icon_name: 'Activity', route_path: '', selected_roles: [] });
    }
    setIsModalOpen(true);
  };

  // 🌟 ฟังก์ชัน: จัดการเมื่อมีการติ๊กเลือก Checkbox กำหนดสิทธิ์
  const handleRoleToggle = (roleId) => {
    setFormData(prev => {
      const isSelected = prev.selected_roles.includes(roleId);
      return {
        ...prev,
        selected_roles: isSelected 
          // ถ้าติ๊กแล้ว (มีใน array) ให้เอาออก
          ? prev.selected_roles.filter(id => id !== roleId) 
          // ถ้ายังไม่ติ๊ก ให้เพิ่มเข้าไปใน array
          : [...prev.selected_roles, roleId]
      };
    });
  };

  // 🌟 ฟังก์ชัน: กดปุ่ม "บันทึกข้อมูล" ลงฐานข้อมูลผ่าน API
  const handleSave = async (e) => {
    e.preventDefault();
    
    // บังคับให้ต้องเลือกสิทธิ์อย่างน้อย 1 กลุ่มเสมอ
    if(formData.selected_roles.length === 0) {
        alert("กรุณาเลือกสิทธิ์อย่างน้อย 1 กลุ่ม");
        return;
    }

    try {
        // ส่งข้อมูลแบบ POST ไปที่เส้น API ที่สร้างไว้รับข้อมูล
        const response = await fetch(`${API_URL}/api/manage-menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('บันทึกข้อมูลเมนูและกำหนดสิทธิ์เรียบร้อยแล้ว!');
            setIsModalOpen(false);
            window.location.reload(); // รีเฟรชหน้าเพื่อแสดงเมนูใหม่ที่เพิ่งบันทึก
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (error) {
        console.error("Save error:", error);
        alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-4xl mx-auto p-4 pt-20">
        {/* ส่วนหัวของหน้า (Header) */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutList className="text-blue-600" /> จัดการเมนูและสิทธิ์
            </h1>
            <p className="text-sm text-slate-500">กำหนดเมนูการใช้งานสำหรับกลุ่มต่างๆ ในชุมชน</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} // กดปุ่มนี้จะเปิดแบบ "สร้างใหม่"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={18} /> สร้างเมนูใหม่
          </button>
        </div>

        {/* 🌟 ตารางแสดงรายการเมนูตรงกลางจอ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="p-4 font-semibold">ชื่อเมนู</th>
                <th className="p-4 font-semibold">เส้นทาง (Route Path)</th>
                <th className="p-4 font-semibold">สิทธิ์การเข้าถึง</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {menus.length > 0 ? menus.map(menu => (
                <tr key={menu.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                      <LayoutList size={16} />
                    </div>
                    {menu.menu_name}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{menu.route_path}</td>
                  
                  {/* แสดงรายชื่อกลุ่มที่มีสิทธิ์ */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {menu.selected_roles && menu.selected_roles.length > 0 ? (
                        menu.selected_roles.map((roleId, idx) => {
                          const roleObj = roles.find(r => r.id === roleId);
                          return (
                            <span key={idx} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              {roleObj ? roleObj.role_name : 'ไม่ทราบชื่อ'}
                            </span>
                          );
                        })
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full font-medium">
                          ทุกคน (สาธารณะ)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ปุ่มแก้ไข / ลบ */}
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleOpenModal(menu)} // ส่งข้อมูลเมนูเข้าไป เพื่อเปิดแบบ "แก้ไข"
                      className="text-blue-600 hover:text-blue-800 p-2 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button className="text-red-500 hover:text-red-700 p-2 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400">ยังไม่มีรายการเมนู...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 🌟 Modal ฟอร์มสร้าง/แก้ไขเมนู (จะแสดงเมื่อ isModalOpen เป็น true) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              {/* เปลี่ยนหัวข้ออัตโนมัติตามสถานะการกด */}
              <h2 className="text-lg font-bold">{editingMenu ? 'แก้ไขเมนู' : 'สร้างเมนูใหม่'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                {/* ช่องกรอกชื่อเมนู */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อเมนู *</label>
                  <input 
                    type="text" required
                    value={formData.menu_name}
                    onChange={e => setFormData({...formData, menu_name: e.target.value})}
                    placeholder="เช่น เก็บข้อมูลผู้ป่วย"
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* ช่องกรอกเส้นทาง Route */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">เส้นทาง (Route Path) *</label>
                    <input 
                      type="text" required
                      value={formData.route_path}
                      onChange={e => setFormData({...formData, route_path: e.target.value})}
                      placeholder="เช่น /patients"
                      className="w-full p-3 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                  {/* ช่องกรอกไอคอน */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อไอคอน (Lucide)</label>
                    <input 
                      type="text" 
                      value={formData.icon_name}
                      onChange={e => setFormData({...formData, icon_name: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* 🌟 ส่วนตัวเลือกสิทธิ์ (ดึงมาจากตาราง sys_positions อัตโนมัติ) */}
                <div className="mt-6 border-t pt-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <Shield size={18} className="text-orange-500" /> 
                    กำหนดสิทธิ์ (ให้ใครเห็นเมนูนี้บ้าง?)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {roles.length > 0 ? roles.map(role => (
                      <label key={role.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${formData.selected_roles.includes(role.id) ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded mr-3"
                          checked={formData.selected_roles.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)} // กดแล้วเรียกฟังก์ชันติ๊ก
                        />
                        <span className={`text-sm font-medium ${formData.selected_roles.includes(role.id) ? 'text-blue-800' : 'text-slate-700'}`}>
                          {role.role_name}
                        </span>
                      </label>
                    )) : (
                      <div className="text-sm text-slate-500 col-span-2">กำลังโหลดข้อมูลตำแหน่ง...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" className="flex-1 p-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <BottomNavbar />
    </div>
  );
};

export default MenuManagement;