import React, { useState, useEffect } from 'react';
import { Users, Calendar, Edit, Camera, Save, X, UserPlus } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1; 
  
  const [leaders, setLeaders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(''); 
  
  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null); // เก็บข้อมูลว่ากำลังกดแก้ไข/เพิ่ม ที่กล่องตำแหน่งไหน
  const [formData, setFormData] = useState({
    account_id: '', // ในอนาคตคุณอาจจะต้องทำ Dropdown ค้นหาลูกบ้านมาใส่ตรงนี้
    start_date: '',
    end_date: '',
    responsibilities: '',
    image_file: null,
    previewUrl: ''
  });

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
    fetchLeaders();
  }, []);

  const handleDateSearch = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchLeaders(date);
  };

  // ==========================================
  // 🌟 กำหนด "แม่แบบโครงสร้าง" (Blueprint) ของหมู่บ้าน
  // ==========================================
  const orgStructure = {
    level1: [ { role_name: 'ผู้ใหญ่บ้าน', isHead: true } ],
    level2: [ 
        { role_name: 'ผู้ช่วยผู้ใหญ่บ้าน ฝ่ายปกครอง' }, 
        { role_name: 'ผู้ช่วยผู้ใหญ่บ้าน ฝ่ายรักษาความสงบ' } 
    ],
    level3: [
        { role_name: 'อสม.' },
        { role_name: 'คณะกรรมการหมู่บ้าน' },
        { role_name: 'เจ้าหน้าที่อื่นๆ' }
    ]
  };

  // ==========================================
  // 🌟 ฟังก์ชันเปิด Modal (รองรับทั้งช่องว่าง และ ช่องที่มีคนแล้ว)
  // ==========================================
  const handleSlotClick = (roleDef) => {
    // ค้นหาว่าในตำแหน่ง (roleDef.role_name) นี้ มีคนดำรงตำแหน่งอยู่แล้วหรือไม่
    const existingLeader = leaders.find(l => l.position_name.includes(roleDef.role_name));

    if (existingLeader) {
      // โหมด: แก้ไขคนที่มีอยู่แล้ว
      setEditingSlot({ ...roleDef, isNew: false, recordId: existingLeader.position_record_id });
      setFormData({
        account_id: existingLeader.account_id,
        start_date: existingLeader.start_date ? existingLeader.start_date.split('T')[0] : '',
        end_date: existingLeader.end_date ? existingLeader.end_date.split('T')[0] : '',
        responsibilities: existingLeader.responsibilities || '',
        previewUrl: existingLeader.user_image || '/profile-img.jpg',
        image_file: null
      });
    } else {
      // โหมด: ช่องว่าง (เพิ่มคนใหม่ลงในตำแหน่งนี้)
      setEditingSlot({ ...roleDef, isNew: true });
      setFormData({
        account_id: '',
        start_date: new Date().toISOString().split('T')[0], // ตั้งค่าเริ่มต้นเป็นวันนี้
        end_date: '',
        responsibilities: '',
        previewUrl: '/profile-img.jpg',
        image_file: null
      });
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
  // 🌟 Component การ์ดผู้นำ (รองรับแบบมีคน และแบบว่างเปล่า)
  // ==========================================
  const LeaderCard = ({ roleDef }) => {
    // หาว่าตำแหน่งนี้มีคนอยู่ไหม
    const leader = leaders.find(l => l.position_name.includes(roleDef.role_name));
    const isHead = roleDef.isHead;

    return (
      <div className="flex flex-col items-center relative z-10 mx-4 my-2">
        {!isHead && <div className="w-px h-6 bg-slate-300"></div>}
        
        {leader ? (
          // 🟩 กรณีที่ 1: มีคนดำรงตำแหน่งแล้ว (แสดงรูปและชื่อ)
          <div 
            onClick={() => handleSlotClick(roleDef)}
            className={`cursor-pointer group relative bg-white rounded-xl shadow-md border-2 ${isHead ? 'border-blue-500' : 'border-blue-300'} p-3 w-48 text-center hover:shadow-lg transition-all overflow-hidden`}
          >
            <div className={`w-20 h-20 mx-auto rounded-full overflow-hidden border-4 ${isHead ? 'border-blue-100' : 'border-slate-100'} mb-3 relative`}>
              <img src={leader.user_image || '/profile-img.jpg'} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Edit className="text-white" size={20} />
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{leader.first_name} {leader.last_name}</h3>
            <div className={`text-xs font-bold px-2 py-1 mt-1 rounded-full ${isHead ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} line-clamp-1`}>
              {roleDef.role_name}
            </div>
          </div>
        ) : (
          // ⬜ กรณีที่ 2: ช่องว่างเปล่า (รอการเพิ่มข้อมูล)
          <div 
            onClick={() => handleSlotClick(roleDef)}
            className={`cursor-pointer group relative bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 w-48 h-[160px] flex flex-col items-center justify-center text-center hover:bg-blue-50 hover:border-blue-400 transition-all`}
          >
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 mb-3">
              <UserPlus size={28} />
            </div>
            <p className="text-xs font-bold text-slate-500 group-hover:text-blue-600">คลิกเพื่อเพิ่ม</p>
            <p className="text-xs text-slate-400 mt-1">{roleDef.role_name}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-6xl mx-auto p-4 pt-20">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Users size={24} /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">ทำเนียบผู้นำชุมชนและเจ้าหน้าที่</h1>
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
              className="text-sm p-1 border border-slate-300 rounded outline-none"
            />
          </div>
        </div>

        {/* ========================================== */}
        {/* 🌟 วาดผังองค์กร (Organization Chart Structure) */}
        {/* ========================================== */}
        <div className="relative py-10 overflow-x-auto text-center flex flex-col items-center">
          
          {/* Level 1: ผู้ใหญ่บ้าน */}
          <div className="flex justify-center">
            {orgStructure.level1.map((role, idx) => (
               <LeaderCard key={`l1-${idx}`} roleDef={role} />
            ))}
          </div>

          {/* เส้นเชื่อม Level 1 -> Level 2 */}
          <div className="flex flex-col items-center">
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="h-px bg-slate-300 w-[300px]"></div>
          </div>

          {/* Level 2: ผู้ช่วยผู้ใหญ่บ้าน */}
          <div className="flex justify-center gap-4 mt-0">
            {orgStructure.level2.map((role, idx) => (
               <LeaderCard key={`l2-${idx}`} roleDef={role} />
            ))}
          </div>

          {/* เส้นเชื่อม Level 2 -> Level 3 */}
          <div className="flex flex-col items-center mt-2">
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="h-px bg-slate-300 w-[600px] max-w-[90%]"></div>
          </div>

          {/* Level 3: ตำแหน่งอื่นๆ */}
          <div className="flex justify-center flex-wrap gap-4 mt-0 max-w-5xl">
             {orgStructure.level3.map((role, idx) => (
               <LeaderCard key={`l3-${idx}`} roleDef={role} />
            ))}
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 🌟 Modal เพิ่ม/แก้ไข ข้อมูลผู้นำ */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingSlot?.isNew ? <UserPlus size={20} /> : <Edit size={20} />} 
                {editingSlot?.isNew ? 'เพิ่มบุคลากรในตำแหน่ง' : 'แก้ไขข้อมูลตำแหน่ง'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X size={24} /></button>
            </div>
            
            <form className="p-6">
              <div className="text-center mb-4">
                <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                  ตำแหน่ง: {editingSlot?.role_name}
                </span>
              </div>

              {/* อัปโหลดรูป */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden shadow-sm group cursor-pointer" onClick={() => document.getElementById('leader-img-upload').click()}>
                  <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <input type="file" id="leader-img-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              <div className="space-y-4">
                {editingSlot?.isNew && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">รหัสบัญชีลูกบ้าน (Account ID)</label>
                    <input type="text" placeholder="ระบุ ID ผู้ใช้งานเพื่อแต่งตั้ง" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
                    <p className="text-[10px] text-red-500 mt-1">* ในระบบจริงควรทำเป็นช่องค้นหาชื่อลูกบ้าน</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับตำแหน่ง</label>
                    <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">วันหมดวาระ</label>
                    <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบ</label>
                  <textarea 
                    rows="3" value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})}
                    placeholder="ระบุหน้าที่ความรับผิดชอบ..."
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                <button type="button" className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Save size={18} /> บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <BottomNavbar />
    </div>
  );
};

export default CommunityLeaders;