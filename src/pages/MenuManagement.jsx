import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, LayoutList, Folder, X } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const MenuManagement = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [menus, setMenus] = useState([]);
  const [roles, setRoles] = useState([]);
  const [menuGroups, setMenuGroups] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    menu_name: '',
    icon_name: 'FileText',
    route_path: '',
    group_id: '',
    selected_roles: [] 
  });

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/positions`);
        const result = await res.json();
        if (result.success) {
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

    const fetchMenuGroups = async () => {
        try {
            const res = await fetch(`${API_URL}/api/menu-groups`);
            const result = await res.json();
            if (result.success) {
                setMenuGroups(result.data);
            }
        } catch (error) {
            console.error("Error fetching menu groups:", error);
        }
    };

    fetchPositions();
    fetchMenus();
    fetchMenuGroups();
  }, []);
// 🌟 ค้นหาฟังก์ชัน handleOpenModal แล้วแก้ตามนี้ครับ
  const handleOpenModal = (menu = null) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        menu_id: menu.menu_id, // 🛠 เพิ่มบรรทัดนี้ เพื่อส่ง ID ไปให้อัปเดต
        menu_name: menu.menu_name || '',
        icon_name: menu.icon_name || 'Activity',
        route_path: menu.route_path || '',
        group_id: menu.group_id || '',
        // เช็คว่า selected_roles เป็น array หรือ JSON string แล้วแปลงให้ถูกต้อง
        selected_roles: Array.isArray(menu.selected_roles) ? menu.selected_roles : (JSON.parse(menu.selected_roles || '[]')) 
      });
    } else {
      setEditingMenu(null);
      const defaultGroupId = menuGroups.length > 0 ? menuGroups[0].group_id : '';
      // เคลียร์ค่าเวลากดสร้างใหม่
      setFormData({ menu_id: null, menu_name: '', icon_name: 'Activity', route_path: '', group_id: defaultGroupId, selected_roles: [] });
    }
    setIsModalOpen(true);
  };

  const handleRoleToggle = (roleId) => {
    setFormData(prev => {
      const isSelected = prev.selected_roles.includes(roleId);
      return {
        ...prev,
        selected_roles: isSelected 
          ? prev.selected_roles.filter(id => id !== roleId) 
          : [...prev.selected_roles, roleId]
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if(formData.selected_roles.length === 0) return alert("กรุณาเลือกสิทธิ์อย่างน้อย 1 กลุ่ม");
    if (!formData.group_id) return alert("กรุณาเลือกกลุ่มเมนู");

    try {
        const response = await fetch(`${API_URL}/api/manage-menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
            alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
            setIsModalOpen(false);
            window.location.reload();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (error) {
        console.error("Save error:", error);
        alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

  const getGroupName = (groupId) => {
      const group = menuGroups.find(g => g.group_id === groupId);
      return group ? group.group_name : 'ไม่ระบุกลุ่ม';
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-4xl mx-auto p-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutList className="text-blue-600" /> จัดการเมนูและสิทธิ์
            </h1>
            <p className="text-sm text-slate-500">กำหนดเมนูการใช้งานสำหรับกลุ่มต่างๆ ในชุมชน</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={18} /> สร้างเมนูใหม่
          </button>
        </div>

        {/* 🌟 ตารางแสดงเมนู */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
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
                  /* 🛠 ใช้ menu_id แทน id ในกรณีที่ backend ส่งมาเป็น menu_id */
                  <tr key={menu.menu_id || menu.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex flex-col">
                          <span className="font-medium text-slate-800 flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <LayoutList size={16} />
                              </div>
                              {menu.menu_name}
                          </span>
                          <span className="text-xs text-slate-500 ml-10 mt-1 flex items-center gap-1">
                              <Folder size={12}/> {getGroupName(menu.group_id)}
                          </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">{menu.route_path}</td>
                    
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {menu.selected_roles && menu.selected_roles.length > 0 ? (
                          menu.selected_roles.map((roleId, idx) => {
                            const roleObj = roles.find(r => r.id === roleId);
                            return (
                              <span key={idx} className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                {roleObj ? roleObj.role_name : 'ไม่ทราบชื่อ'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap">
                            ทุกคน (สาธารณะ)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <button onClick={() => handleOpenModal(menu)} className="text-blue-600 hover:text-blue-800 p-2 transition-colors">
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

      </div>

      {/* 🌟 Modal ฟอร์มสร้าง/แก้ไขเมนู */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          {/* 🛠 แก้ปัญหาจอเล็ก/ล้น ด้วย max-h-[90vh] และ flex-col */}
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Header ของ Modal ยึดติดด้านบน */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <LayoutList size={20} />
                {editingMenu ? 'แก้ไขเมนู' : 'สร้างเมนูใหม่'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Body ของ Modal (เลื่อนขึ้นลงได้) */}
            <div className="p-6 overflow-y-auto flex-1">
              <form id="menuForm" onSubmit={handleSave} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">กลุ่มเมนู (Menu Group) *</label>
                  <select 
                    required
                    value={formData.group_id}
                    onChange={e => setFormData({...formData, group_id: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="" disabled>-- เลือกกลุ่มเมนู --</option>
                    {menuGroups.map(group => (
                        <option key={group.group_id} value={group.group_id}>
                            {group.group_name}
                        </option>
                    ))}
                  </select>
                </div>

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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">เส้นทาง (Route Path) *</label>
                    <input 
                      type="text" required
                      value={formData.route_path}
                      onChange={e => setFormData({...formData, route_path: e.target.value})}
                      placeholder="เช่น /patients"
                      className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อไอคอน (Lucide)</label>
                    <input 
                      type="text" 
                      value={formData.icon_name}
                      onChange={e => setFormData({...formData, icon_name: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <Shield size={18} className="text-orange-500" /> 
                    กำหนดสิทธิ์ (ให้ใครเห็นเมนูนี้บ้าง?)
                  </label>
                  {/* เปลี่ยนจาก grid 2 คอลัมน์ เป็น flex ห่อ เพื่อให้รองรับขนาดจอต่างๆ */}
                  <div className="flex flex-wrap gap-3">
                    {roles.length > 0 ? roles.map(role => (
                      <label key={role.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${formData.selected_roles.includes(role.id) ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)]`}>
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded mr-2"
                          checked={formData.selected_roles.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)} 
                        />
                        <span className={`text-[11px] sm:text-xs font-medium ${formData.selected_roles.includes(role.id) ? 'text-blue-800' : 'text-slate-700'} line-clamp-1`}>
                          {role.role_name}
                        </span>
                      </label>
                    )) : (
                      <div className="text-sm text-slate-500 w-full">กำลังโหลดข้อมูลตำแหน่ง...</div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer ของ Modal (ปุ่มบันทึก/ยกเลิก ยึดติดด้านล่างสุดเสมอ) */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-3 rounded-lg border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              
              <button 
                type="submit" 
                form="menuForm"
                className="flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors"
              >
                บันทึกข้อมูล
              </button>
            </div>

          </div>
        </div>
      )}
      
      <BottomNavbar />
    </div>
  );
};

export default MenuManagement;