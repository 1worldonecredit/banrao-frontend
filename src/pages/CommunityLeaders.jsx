import React, { useState, useEffect } from 'react';
import { Users, Calendar, Edit, Camera, Save, X, UserPlus, Search } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1; 
  
  const [leaders, setLeaders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  
  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null); 
  
  // State สำหรับค้นหาลูกบ้าน (กรณีเพิ่มคนใหม่)
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);

  const [formData, setFormData] = useState({
    account_id: '',
    start_date: '',
    end_date: '',
    responsibilities: '',
    image_file: null,
    previewUrl: ''
  });

  // 🌟 ดึงข้อมูลผังผู้นำจาก Database
  const fetchLeaders = async (dateQuery = '') => {
    try {
      const url = `${API_URL}/api/community-leaders/${villageId}${dateQuery ? `?term_date=${dateQuery}` : ''}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setLeaders(result.data);
      }
    } catch (error) {
      console.error("Error fetching leaders:", error);
    }
  };

  useEffect(() => {
    fetchLeaders(selectedDate);
  }, []);

  const handleDateSearch = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchLeaders(date);
  };

  // ==========================================
  // 🌟 แม่แบบโครงสร้าง (Blueprint) ของหมู่บ้าน
  // ==========================================
  const orgStructure = {
    level1: [ { role_name: 'ผู้ใหญ่บ้าน', position_id: 6, isHead: true } ],
    level2: [ 
        { role_name: 'ผู้ช่วยผู้ใหญ่บ้าน ฝ่ายปกครอง', position_id: 7 }, 
        { role_name: 'ผู้ช่วยผู้ใหญ่บ้าน ฝ่ายรักษาความสงบ', position_id: 7 } 
    ],
    level3: [
        { role_name: 'อสม.', position_id: 8 },
        { role_name: 'คณะกรรมการหมู่บ้าน', position_id: 11 }, 
        { role_name: 'เจ้าหน้าที่อื่นๆ', position_id: 12 }
    ]
  };

  // ==========================================
  // 🌟 ฟังก์ชัน: ค้นหาข้อมูลลูกบ้านด้วยเลขบัตร (ปรับปรุงให้ดึงที่อยู่ด้วย)
  // ==========================================
  const handleSearchUser = async () => {
    if (!searchCitizenId) {
        alert("กรุณากรอกเลขบัตรประชาชน");
        return;
    }
    try {
        // 🌟 ส่ง village_id ไปเช็คด้วย เพื่อให้ค้นหาเฉพาะคนในหมู่บ้าน
        const res = await fetch(`${API_URL}/api/search-citizen/${searchCitizenId}?village_id=${villageId}`);
        const result = await res.json();
        if (result.success) {
            setFoundUser(result.data);
            setFormData(prev => ({
                ...prev, 
                account_id: result.data.account_id, 
                previewUrl: result.data.user_image || '/profile-img.jpg',
                responsibilities: result.data.responsibilities || prev.responsibilities
            }));
        } else {
            alert(result.message || 'ไม่พบข้อมูลลูกบ้านจากเลขบัตรประชาชนนี้');
            setFoundUser(null);
        }
    } catch (error) {
        console.error("Search Error:", error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // ==========================================
  // 🌟 ฟังก์ชัน: เปิด Modal (จัดการเพิ่ม/แก้ไข)
  // ==========================================
  const handleSlotClick = (roleDef) => {
    const existingLeader = leaders.find(l => l.position_name.includes(roleDef.role_name));

    if (existingLeader) {
      // โหมดแก้ไข
      setEditingSlot({ ...roleDef, isNew: false, recordId: existingLeader.position_record_id });
      setFormData({
        account_id: existingLeader.account_id,
        start_date: existingLeader.start_date ? existingLeader.start_date.split('T')[0] : '',
        end_date: existingLeader.end_date ? existingLeader.end_date.split('T')[0] : '',
        responsibilities: existingLeader.responsibilities || '',
        previewUrl: existingLeader.user_image || '/profile-img.jpg',
        image_file: null
      });
      // 🌟 สร้าง Object foundUser จำลองขึ้นมาเพื่อให้โชว์ข้อมูลใน Modal
      setFoundUser({
        first_name: existingLeader.first_name,
        last_name: existingLeader.last_name,
        village_name: existingLeader.village_name || userData.villageName, // ดึงจาก existingLeader หรือ userData ก็ได้
        tambon_name_th: existingLeader.tambon_name_th || userData.tambonName,
        responsibilities: existingLeader.responsibilities
      });
    } else {
      // โหมดเพิ่มใหม่ (ช่องว่าง)
      setEditingSlot({ ...roleDef, isNew: true });
      setFormData({
        account_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        responsibilities: '',
        previewUrl: '/profile-img.jpg',
        image_file: null
      });
      setFoundUser(null); // รีเซ็ตการค้นหา
      setSearchCitizenId('');
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image_file: file, previewUrl: URL.createObjectURL(file) });
    }
  };

  // ==========================================
  // 🌟 ฟังก์ชัน: บันทึกข้อมูล
  // ==========================================
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.account_id) return alert("กรุณาระบุบุคลากร");

    try {
      const payload = {
        village_id: villageId,
        position_id: editingSlot.position_id,
        account_id: formData.account_id,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        responsibilities: formData.responsibilities
      };

      const url = editingSlot.isNew 
        ? `${API_URL}/api/community-leaders` 
        : `${API_URL}/api/community-leaders/${editingSlot.recordId}`;
        
      const method = editingSlot.isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();

      if (result.success) {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
        setIsModalOpen(false);
        fetchLeaders(selectedDate);
      } else {
        alert('บันทึกไม่สำเร็จ: ' + result.message);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // ==========================================
  // 🌟 Component การ์ดผู้นำ
  // ==========================================
  const LeaderCard = ({ roleDef }) => {
    const leader = leaders.find(l => l.position_name.includes(roleDef.role_name));
    const isHead = roleDef.isHead;

    return (
      <div className="flex flex-col items-center relative z-10 mx-2 md:mx-4 my-2">
        {!isHead && <div className="w-px h-6 bg-slate-300"></div>}
        
        {leader ? (
          <div 
            onClick={() => handleSlotClick(roleDef)}
            className={`cursor-pointer group relative bg-white rounded-xl shadow-md border-2 ${isHead ? 'border-blue-500' : 'border-blue-300'} p-3 w-40 md:w-48 text-center hover:shadow-lg transition-all overflow-hidden`}
          >
            <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full overflow-hidden border-4 ${isHead ? 'border-blue-100' : 'border-slate-100'} mb-3 relative`}>
              <img src={leader.user_image || '/profile-img.jpg'} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Edit className="text-white" size={20} />
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{leader.first_name} {leader.last_name}</h3>
            <div className={`text-[10px] md:text-xs font-bold px-2 py-1 mt-1 rounded-full ${isHead ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} line-clamp-1`}>
              {roleDef.role_name}
            </div>
          </div>
        ) : (
          <div 
            onClick={() => handleSlotClick(roleDef)}
            className={`cursor-pointer group relative bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 w-40 md:w-48 h-[140px] md:h-[160px] flex flex-col items-center justify-center text-center hover:bg-blue-50 hover:border-blue-400 transition-all`}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 mb-3">
              <UserPlus size={24} />
            </div>
            <p className="text-xs font-bold text-slate-500 group-hover:text-blue-600">คลิกเพื่อเพิ่ม</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 line-clamp-2">{roleDef.role_name}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-6xl mx-auto p-4 pt-20">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-8 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Users size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">ทำเนียบผู้นำชุมชนและเจ้าหน้าที่</h1>
              <p className="text-sm text-slate-500">หมู่บ้านของคุณ</p>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Calendar size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">ดูวาระ ณ วันที่:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={handleDateSearch}
              className="text-sm p-1.5 border border-slate-300 rounded outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 🌟 วาดผังองค์กร */}
        <div className="relative py-4 md:py-10 overflow-x-auto text-center flex flex-col items-center min-w-max md:min-w-full">
          
          {/* Level 1: ผู้ใหญ่บ้าน */}
          <div className="flex justify-center">
            {orgStructure.level1.map((role, idx) => (
               <LeaderCard key={`l1-${idx}`} roleDef={role} />
            ))}
          </div>

          <div className="flex flex-col items-center">
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="h-px bg-slate-300 w-[200px] md:w-[300px]"></div>
          </div>

          {/* Level 2: ผู้ช่วยผู้ใหญ่บ้าน */}
          <div className="flex justify-center gap-2 md:gap-4 mt-0">
            {orgStructure.level2.map((role, idx) => (
               <LeaderCard key={`l2-${idx}`} roleDef={role} />
            ))}
          </div>

          <div className="flex flex-col items-center mt-2">
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="h-px bg-slate-300 w-full max-w-[600px]"></div>
          </div>

          {/* Level 3: ตำแหน่งอื่นๆ */}
          <div className="flex justify-center gap-2 md:gap-4 mt-0 flex-wrap max-w-4xl">
             {orgStructure.level3.map((role, idx) => (
               <LeaderCard key={`l3-${idx}`} roleDef={role} />
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 Modal เพิ่ม/แก้ไข (ปรับข้อมูลที่อยู่และหน้าที่รับผิดชอบ) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Header ของ Modal (ยึดติดด้านบน) */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingSlot?.isNew ? <UserPlus size={20} /> : <Edit size={20} />} 
                {editingSlot?.isNew ? 'เพิ่มผู้นำชุมชน' : 'แก้ไขข้อมูล'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Body ของ Modal (เลื่อนขึ้นลงได้) */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="text-center mb-6">
                <span className="inline-block bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                  ตำแหน่ง: {editingSlot?.role_name}
                </span>
              </div>

              {/* โหมดเพิ่มใหม่: ช่องค้นหาด้วยเลขบัตร */}
              {editingSlot?.isNew && !foundUser && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    ค้นหาจากเลขบัตรประชาชน 13 หลัก
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength="13"
                      value={searchCitizenId} 
                      onChange={e => setSearchCitizenId(e.target.value)} 
                      placeholder="ระบุเลขบัตร..." 
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <button 
                      type="button" 
                      onClick={handleSearchUser}
                      className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-700 flex items-center gap-2 shrink-0"
                    >
                      <Search size={16} /> ค้นหา
                    </button>
                  </div>
                </div>
              )}

              {/* ฟอร์มกรอกรายละเอียด (แสดงเมื่อค้นหาเจอ หรือเป็นการแก้ไข) */}
              {(!editingSlot?.isNew || foundUser) && (
                <form id="leaderForm" onSubmit={handleSave}>
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-28 h-28 rounded-full border-4 border-slate-100 overflow-hidden shadow-md group cursor-pointer" onClick={() => document.getElementById('leader-img-upload').click()}>
                      <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    {/* 🌟 แสดงชื่อ และข้อมูลที่อยู่ */}
                    {foundUser && (
                      <>
                        <h3 className="mt-3 font-bold text-slate-800 text-lg">
                          {foundUser.first_name} {foundUser.last_name}
                        </h3>
                        <p className="text-sm text-slate-500 text-center mt-1">
                          {foundUser.village_name || foundUser.tambon_name_th ? (
                            <>หมู่บ้าน: {foundUser.village_name || '-'} <br/> ตำบล: {foundUser.tambon_name_th || '-'}</>
                          ) : (
                            <span className="text-red-400">ไม่มีข้อมูลที่อยู่</span>
                          )}
                        </p>
                      </>
                    )}
                    <input type="file" id="leader-img-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับตำแหน่ง *</label>
                        <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">วันหมดวาระ</label>
                        <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบ</label>
                      <textarea 
                        rows="3" 
                        value={formData.responsibilities} 
                        onChange={e => setFormData({...formData, responsibilities: e.target.value})}
                        placeholder="เช่น ดูแลความสงบเรียบร้อย, ประสานงานลูกบ้าน..."
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                      ></textarea>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer ของ Modal (ปุ่มบันทึก/ยกเลิก ยึดติดด้านล่างสุดเสมอ) */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  setIsModalOpen(false);
                  setFoundUser(null);
                  setSearchCitizenId('');
                }} 
                className="flex-1 py-3 rounded-lg border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              
              <button 
                type="submit" 
                form="leaderForm"
                disabled={editingSlot?.isNew && !foundUser}
                className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                  (editingSlot?.isNew && !foundUser) 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                }`}
              >
                <Save size={18} /> บันทึกข้อมูล
              </button>
            </div>

          </div>
        </div>
      )}
      
      <BottomNavbar />
    </div>
  );
};

export default CommunityLeaders;