import React, { useState, useEffect } from 'react';
import { Users, Calendar, Edit, Camera, Save, X } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1; // ดึง Village ID ของผู้ใช้งาน
  
  const [leaders, setLeaders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(''); // สำหรับเลือกดูวาระย้อนหลัง
  
  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    responsibilities: '',
    image_file: null,
    previewUrl: ''
  });

  // ดึงข้อมูลผู้นำ
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

  // จัดกลุ่มผู้นำตามลำดับชั้น (จำลองตรรกะแบบง่าย)
  const headman = leaders.find(l => l.position_name.includes('ผู้ใหญ่บ้าน') && !l.position_name.includes('ผู้ช่วย'));
  const assistants = leaders.filter(l => l.position_name.includes('ผู้ช่วย'));
  const others = leaders.filter(l => l !== headman && !assistants.includes(l));

  // เปิด Modal แก้ไข
  const handleEditClick = (leader) => {
    setEditingLeader(leader);
    setFormData({
      start_date: leader.start_date ? leader.start_date.split('T')[0] : '',
      end_date: leader.end_date ? leader.end_date.split('T')[0] : '',
      responsibilities: leader.responsibilities || '',
      previewUrl: leader.user_image || '/profile-img.jpg',
      image_file: null
    });
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image_file: file, previewUrl: URL.createObjectURL(file) });
    }
  };

  // บันทึกข้อมูล
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // 1. อัปเดตข้อมูลตำแหน่งและวันที่
      await fetch(`${API_URL}/api/community-leaders/${editingLeader.position_record_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      // 2. ถ้ามีการเปลี่ยนรูปภาพ ให้เรียก API อัปโหลดรูปที่เคยสร้างไว้
      if (formData.image_file) {
        const imgData = new FormData();
        imgData.append('profileImage', formData.image_file);
        imgData.append('userId', editingLeader.account_id);
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/upload-profile`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: imgData
        });
      }

      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      setIsModalOpen(false);
      fetchLeaders(selectedDate);
    } catch (error) {
      console.error("Save error:", error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Component สำหรับการ์ดผู้นำ (ใช้ซ้ำได้)
  const LeaderCard = ({ leader, isHead = false }) => {
    if (!leader) return null;
    return (
      <div className="flex flex-col items-center relative z-10">
        {/* เส้นเชื่อมโยงสายงานด้านบน (ยกเว้นหัวหน้า) */}
        {!isHead && <div className="w-px h-6 bg-slate-400"></div>}
        
        <div 
          onClick={() => handleEditClick(leader)}
          className={`cursor-pointer group relative bg-white rounded-xl shadow-lg border-2 ${isHead ? 'border-yellow-500' : 'border-blue-400'} p-3 w-48 text-center hover:scale-105 transition-transform overflow-hidden`}
        >
          {/* กรอบรูปภาพ */}
          <div className={`w-24 h-24 mx-auto rounded-lg overflow-hidden border-2 ${isHead ? 'border-yellow-400' : 'border-slate-200'} mb-3 relative`}>
            <img src={leader.user_image || '/profile-img.jpg'} alt="Profile" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Edit className="text-white" size={24} />
            </div>
          </div>
          
          <h3 className="font-bold text-slate-800 text-sm">{leader.first_name} {leader.last_name}</h3>
          <p className={`text-xs font-medium px-2 py-1 mt-1 rounded-full ${isHead ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
            {leader.position_name}
          </p>
          {leader.responsibilities && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{leader.responsibilities}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-100 min-h-screen pb-24">
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
          
          {/* ตัวเลือกดูวาระย้อนหลัง */}
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

        {/* 🌟 ผังองค์กร (Org Chart UI) */}
        <div className="relative py-10 overflow-x-auto text-center">
          
          {/* Level 1: ผู้ใหญ่บ้าน */}
          <div className="flex justify-center">
            <LeaderCard leader={headman} isHead={true} />
          </div>

          {/* เส้นเชื่อม Level 1 ลงมา Level 2 */}
          {headman && (assistants.length > 0 || others.length > 0) && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-slate-400"></div>
              {/* เส้นแนวนอนเชื่อมลูกๆ */}
              <div className="h-px bg-slate-400 w-3/4 max-w-2xl"></div>
            </div>
          )}

          {/* Level 2: ผู้ช่วยผู้ใหญ่บ้าน */}
          {assistants.length > 0 && (
            <div className="flex justify-center gap-8 mt-6">
              {assistants.map((ast, idx) => (
                <LeaderCard key={idx} leader={ast} />
              ))}
            </div>
          )}

          {/* เส้นเชื่อม Level 2 ลงมา Level 3 */}
          {assistants.length > 0 && others.length > 0 && (
            <div className="flex flex-col items-center mt-6">
              <div className="w-px h-8 bg-slate-400"></div>
              <div className="h-px bg-slate-400 w-11/12 max-w-4xl"></div>
            </div>
          )}

          {/* Level 3: คณะกรรมการ / อสม. / อื่นๆ */}
          {others.length > 0 && (
            <div className="flex justify-center flex-wrap gap-6 mt-6 max-w-5xl mx-auto">
              {others.map((oth, idx) => (
                <LeaderCard key={idx} leader={oth} />
              ))}
            </div>
          )}
          
          {leaders.length === 0 && (
            <div className="text-slate-400 py-10">ไม่พบข้อมูลผู้นำชุมชนในวาระที่ระบุ</div>
          )}
        </div>
      </div>

      {/* 🌟 Modal แก้ไขข้อมูล (เมื่อคลิกที่การ์ด) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit size={18} /> แก้ไขข้อมูลผู้นำชุมชน
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              {/* อัปโหลดรูป */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-28 h-28 rounded-full border-4 border-slate-100 overflow-hidden shadow-md group cursor-pointer" onClick={() => document.getElementById('leader-img-upload').click()}>
                  <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">คลิกเพื่อเปลี่ยนรูปประจำตัว</p>
                <input type="file" id="leader-img-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับตำแหน่ง</label>
                    <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">วันหมดวาระ (ทิ้งว่างถ้ายังดำรงตำแหน่ง)</label>
                    <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบ</label>
                  <textarea 
                    rows="3"
                    value={formData.responsibilities}
                    onChange={e => setFormData({...formData, responsibilities: e.target.value})}
                    placeholder="ระบุหน้าที่ความรับผิดชอบที่ดูแล เช่น ฝ่ายรักษาความสงบ, ดูแลสวัสดิการชุมชน..."
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
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