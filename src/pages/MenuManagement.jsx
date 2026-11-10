import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, LayoutList, Folder } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const MenuManagement = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [menus, setMenus] = useState([]);
  const [roles, setRoles] = useState([]);
  const [menuGroups, setMenuGroups] = useState([]); // 🌟 State ใหม่สำหรับเก็บข้อมูลกลุ่มเมนู
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    menu_name: '',
    icon_name: 'FileText',
    route_path: '',
    group_id: '', // 🌟 เพิ่ม group_id ในฟอร์ม
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

    // 🌟 ฟังก์ชันใหม่: ดึงข้อมูลกลุ่มเมนู
    const fetchMenuGroups = async () => {
        try {
            const res = await fetch(`${API_URL}/api/menu-groups`); // ต้องสร้าง API เส้นนี้ด้วย
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
    fetchMenuGroups(); // เรียกใช้ฟังก์ชันดึงกลุ่มเมนู
  }, []);

  const handleOpenModal = (menu = null) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        menu_name: menu.menu_name || '',
        icon_name: menu.icon_name || 'Activity',
        route_path: menu.route_path || '',
        group_id: menu.group_id || '', // 🌟 ดึง group_id เดิมมาใส่
        selected_roles: menu.selected_roles || [] 
      });
    } else {
      setEditingMenu(null);
      // ตั้งค่าเริ่มต้น group_id ให้เป็นค่าแรกของ menuGroups (ถ้ามี)
      const defaultGroupId = menuGroups.length > 0 ? menuGroups[0].group_id : '';
      setFormData({ menu_name: '', icon_name: 'Activity', route_path: '', group_id: defaultGroupId, selected_roles: [] });
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
    
    if(formData.selected_roles.length === 0) {
        alert("กรุณาเลือกสิทธิ์อย่างน้อย 1 กลุ่ม");
        return;
    }

    // 🌟 ตรวจสอบว่าเลือกกลุ่มเมนูหรือยัง
    if (!formData.group_id) {
        alert("กรุณาเลือกกลุ่มเมนู");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/manage-menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('บันทึกข้อมูลเมนูและกำหนดสิทธิ์เรียบร้อยแล้ว!');
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

  // Helper ฟังก์ชันสำหรับหากลุ่มเมนูจาก id
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
                  <td className="p-4">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800 flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                            <LayoutList size={16} />
                            </div>
                            {menu.menu_name}
                        </span>
                        {/* 🌟 แสดงชื่อกลุ่มเมนูใต้ชื่อเมนู */}
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

                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleOpenModal(menu)} 
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingMenu ? 'แก้ไขเมนู' : 'สร้างเมนูใหม่'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                
                {/* 🌟 ช่องเลือกกลุ่มเมนู (เพิ่มใหม่) */}
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
                
                <div className="grid grid-cols-2 gap-4">
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
                          onChange={() => handleRoleToggle(role.id)} 
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