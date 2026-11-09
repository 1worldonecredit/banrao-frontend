import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, LayoutList } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const MenuManagement = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // State สำหรับเก็บข้อมูล
  const [menus, setMenus] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // State สำหรับฟอร์มสร้าง/แก้ไขเมนู
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    menu_name: '',
    icon_name: 'FileText',
    route_path: '',
    selected_roles: [] // เก็บ Role ID ที่อนุญาตให้ใช้เมนูนี้
  });

  // จำลองการดึงข้อมูล (ในระบบจริงต้องยิง API)
  useEffect(() => {
    // 1. ดึงรายการเมนูทั้งหมดที่ผู้ใหญ่บ้านคนนี้สร้าง
    setMenus([
      { id: 1, menu_name: 'จัดการร้านค้า/สถานที่ของฉัน', icon_name: 'MapPin', route_path: '/my-places', roles: ['ผู้ใหญ่บ้าน', 'อสม.', 'ประชาชน'] },
      { id: 2, menu_name: 'เก็บข้อมูลผู้ป่วย', icon_name: 'Activity', route_path: '/patients', roles: ['ผู้ใหญ่บ้าน', 'อสม.'] }
    ]);
    
    // 2. ดึงรายการ Role ทั้งหมดในระบบ
    setRoles([
      { id: 1, role_name: 'ผู้ใหญ่บ้าน' },
      { id: 2, role_name: 'ผู้ช่วยผู้ใหญ่บ้าน' },
      { id: 3, role_name: 'อสม.' },
      { id: 4, role_name: 'ประชาชน' }
    ]);
  }, []);

  // เปิดฟอร์มเพิ่ม/แก้ไข
  const handleOpenModal = (menu = null) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        menu_name: menu.menu_name,
        icon_name: menu.icon_name,
        route_path: menu.route_path,
        // ในระบบจริงต้องดึง Role ID มา
        selected_roles: roles.filter(r => menu.roles.includes(r.role_name)).map(r => r.id)
      });
    } else {
      setEditingMenu(null);
      setFormData({ menu_name: '', icon_name: 'FileText', route_path: '', selected_roles: [] });
    }
    setIsModalOpen(true);
  };

  // จัดการการเลือก Role
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

  // บันทึกข้อมูล
  const handleSave = (e) => {
    e.preventDefault();
    // TODO: ยิง API POST (สร้างใหม่) หรือ PUT (แก้ไข) ไปที่ Backend
    // โดยส่ง formData (เมนู + สิทธิ์) ไปบันทึกลงตาราง sys_menus และ sys_menu_roles
    
    alert(`บันทึกเมนู: ${formData.menu_name}\nให้สิทธิ์: ${formData.selected_roles.length} กลุ่ม`);
    setIsModalOpen(false);
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

        {/* รายการเมนู */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="p-4 font-semibold">ชื่อเมนู</th>
                <th className="p-4 font-semibold">เส้นทาง (Route)</th>
                <th className="p-4 font-semibold">กลุ่มที่ใช้งานได้ (Roles)</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {menus.map(menu => (
                <tr key={menu.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                    {/* ไอคอนจำลอง */}
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                      <LayoutList size={16} />
                    </div>
                    {menu.menu_name}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{menu.route_path}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {menu.roles.map((role, idx) => (
                        <span key={idx} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenModal(menu)} className="text-blue-600 hover:text-blue-800 p-2">
                      <Edit size={18} />
                    </button>
                    <button className="text-red-500 hover:text-red-700 p-2">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ฟอร์มสร้าง/แก้ไขเมนู */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingMenu ? 'แก้ไขเมนู' : 'สร้างเมนูใหม่'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
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

                {/* ส่วนเลือก Role (สิทธิ์) */}
                <div className="mt-6 border-t pt-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <Shield size={18} className="text-orange-500" /> 
                    กำหนดสิทธิ์ (ให้ใครเห็นเมนูนี้บ้าง?)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {roles.map(role => (
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
                    ))}
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