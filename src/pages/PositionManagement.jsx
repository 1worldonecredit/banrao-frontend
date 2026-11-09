import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const PositionManagement = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const [positions, setPositions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [positionName, setPositionName] = useState('');

  // ดึงรายการตำแหน่งทั้งหมด
  const fetchPositions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/positions`);
      const result = await res.json();
      if (result.success) {
        setPositions(result.data);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // เปิด Modal เพิ่ม/แก้ไข
  const handleOpenModal = (pos = null) => {
    if (pos) {
      setEditingPosition(pos);
      setPositionName(pos.position_name);
    } else {
      setEditingPosition(null);
      setPositionName('');
    }
    setIsModalOpen(true);
  };

  // บันทึกตำแหน่ง (เพิ่มใหม่ หรือ แก้ไข)
  const handleSave = async (e) => {
    e.preventDefault();
    const endpoint = editingPosition 
      ? `${API_URL}/api/positions/${editingPosition.position_id}`
      : `${API_URL}/api/positions`;
    
    const method = editingPosition ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_name: positionName, position_level: 'VILLAGE' })
      });
      const result = await res.json();
      
      if (result.success) {
        alert('บันทึกตำแหน่งสำเร็จ');
        setIsModalOpen(false);
        fetchPositions();
      } else {
        alert('บันทึกไม่สำเร็จ: ' + result.message);
      }
    } catch (error) {
      console.error("Save position error:", error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-4xl mx-auto p-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-blue-600" /> จัดการตำแหน่ง/บทบาทในชุมชน
            </h1>
            <p className="text-sm text-slate-500">เพิ่มตำแหน่งเฉพาะกิจในหมู่บ้าน เช่น ครู, เจ้าอาวาส, หมอประจำหมู่บ้าน</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={18} /> เพิ่มตำแหน่งใหม่
          </button>
        </div>

        {/* ตารางแสดงรายการตำแหน่ง */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="p-4 font-semibold">รหัส</th>
                <th className="p-4 font-semibold">ชื่อตำแหน่งในชุมชน</th>
                <th className="p-4 font-semibold">ระดับ</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => (
                <tr key={pos.position_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-slate-500">{pos.position_id}</td>
                  <td className="p-4 font-medium text-slate-800">{pos.position_name}</td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                      {pos.position_level || 'VILLAGE'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenModal(pos)} className="text-blue-600 hover:text-blue-800 p-2">
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingPosition ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อตำแหน่ง *</label>
                  <input 
                    type="text" required
                    value={positionName}
                    onChange={e => setPositionName(e.target.value)}
                    placeholder="เช่น เจ้าอาวาส, ครูประจำโรงเรียน"
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" className="flex-1 p-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
};

export default PositionManagement;