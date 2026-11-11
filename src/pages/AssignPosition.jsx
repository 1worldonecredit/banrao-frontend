import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, MapPin, Save, User, Map, Building } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; // ระวังเรื่อง path ของ Navbar ว่าเข้ากับสีเข้มได้ไหมด้วยนะครับ

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AssignPosition = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [villagesList, setVillagesList] = useState([]);

  useEffect(() => {
    // จำลองข้อมูล (ควรดึงจาก API จริง)
    setVillagesList([
      { village_id: '8802be0c-ff9b-4c6c-996...', name: 'หมู่ 1 บ้านโคกสว่าง' },
      { village_id: '4c85d7ed-793d-465a-a3e...', name: 'หมู่ 15 บ้านหัวนา' }
    ]);
  }, []);

  const formatCitizenId = (value) => {
    const numbers = value.replace(/\D/g, '');
    let formatted = '';
    if (numbers.length > 0) formatted += numbers.substring(0, 1);
    if (numbers.length > 1) formatted += '-' + numbers.substring(1, 5);
    if (numbers.length > 5) formatted += '-' + numbers.substring(5, 10);
    if (numbers.length > 10) formatted += '-' + numbers.substring(10, 12);
    if (numbers.length > 12) formatted += '-' + numbers.substring(12, 13);
    return formatted;
  };

  const handleSearchUser = async () => {
    const rawCitizenId = searchCitizenId.replace(/-/g, ''); 
    if (rawCitizenId.length !== 13) return alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    setIsLoading(true);
    
    try {
        const res = await fetch(`${API_URL}/api/search-citizen/${rawCitizenId}`);
        const result = await res.json();
        if (result.success) {
            setFoundUser(result.data);
        } else {
            alert(result.message || 'ไม่พบข้อมูลประชาชนในระบบ');
            setFoundUser(null);
        }
    } catch (error) { 
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ'); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!foundUser || !selectedVillageId) {
        return alert('กรุณาค้นหาบุคลากรและเลือกหมู่บ้านให้ครบถ้วน');
    }

    if (!window.confirm(`ยืนยันการแต่งตั้ง ${foundUser.first_name} เป็นผู้ใหญ่บ้าน ใช่หรือไม่?`)) return;

    try {
        const res = await fetch(`${API_URL}/api/assign-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_account_id: foundUser.account_id,
                position_id: 6, // สมมติว่า 6 คือผู้ใหญ่บ้าน
                scope_type: 'VILLAGE',
                scope_id: selectedVillageId,
                assigner_account_id: userData.id
            })
        });

        const result = await res.json();
        if (result.success) {
            alert('แต่งตั้งตำแหน่งผู้ใหญ่บ้านเสร็จสมบูรณ์');
            setFoundUser(null);
            setSearchCitizenId('');
            setSelectedVillageId('');
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (error) {
        alert('เชื่อมต่อระบบล้มเหลว');
    }
  };

  return (
    // 🌟 พื้นหลังแบบไล่สีสไตล์ Neon/Tech (ล้อกับภาพอ้างอิง)
    <div className="min-h-screen pb-24 font-sans bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 relative overflow-hidden">
      
      {/* 🌟 สร้าง Effect แสงด้านหลังให้ดูมีมิติ */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/30 rounded-full blur-[100px]"></div>

      <TopNavbar userData={userData} />
      
      <div className="max-w-2xl mx-auto p-4 pt-24 relative z-10">
        
        {/* 🌟 การ์ดหลักแบบ Glassmorphism */}
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 mb-6">
          
          <div className="flex items-center gap-5 mb-8 border-b border-white/10 pb-6">
            <div className="p-4 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-500/30">
              <ShieldCheck size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">แต่งตั้งตำแหน่ง (ผู้ใหญ่บ้าน)</h1>
              <p className="text-sm text-purple-200 mt-1">ระบบบริหารจัดการสำหรับนายอำเภอ / ปลัดอำเภอ</p>
            </div>
          </div>

          {/* ส่วนค้นหาประชาชน */}
          <div className="mb-8 p-6 bg-black/20 rounded-2xl border border-white/5">
             <label className="text-sm font-bold text-purple-200 mb-4 flex items-center gap-2">
                <Search size={18} className="text-purple-400"/> <span>ค้นหาประชาชนที่ต้องการแต่งตั้ง</span>
             </label>
             <div className="flex gap-3 flex-col sm:flex-row">
                <input 
                  type="text" value={searchCitizenId} onChange={(e) => setSearchCitizenId(formatCitizenId(e.target.value))} 
                  placeholder="เลขประจำตัวประชาชน 13 หลัก" 
                  className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-400 focus:bg-white/10 text-white font-mono tracking-widest font-bold placeholder-white/30 transition-all" 
                />
                <button 
                  onClick={handleSearchUser} disabled={isLoading} 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-purple-500/25 transition-all"
                >
                  {isLoading ? 'กำลังค้น...' : 'ค้นหาข้อมูล'}
                </button>
             </div>
          </div>

          {/* ส่วนแสดงผลและฟอร์มแต่งตั้ง */}
          {foundUser && (
            <form onSubmit={handleAssignRole} className="animate-fade-in-up mt-8">
              
              {/* ข้อมูลคนที่ค้นพบ */}
              <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl mb-8">
                <div className="relative">
                  <img 
                     src={foundUser.user_image || '/profile-img.jpg'} 
                     alt="Profile" 
                     className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/20 shadow-sm flex items-center gap-1">
                    <User size={10} /> ยืนยันตัวตนแล้ว
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-indigo-300 font-bold mb-1 uppercase tracking-wider">ว่าที่ผู้ใหญ่บ้านคนใหม่</div>
                  <div className="font-black text-white text-xl md:text-2xl">{foundUser.first_name} {foundUser.last_name}</div>
                </div>
              </div>

              {/* ฟอร์มเลือกพื้นที่ */}
              <div className="space-y-6 bg-black/20 p-6 rounded-2xl border border-white/5 mb-8">
                <div>
                  <label className="text-sm font-bold text-purple-200 mb-3 flex items-center gap-2">
                     <span>ระดับพื้นที่รับผิดชอบ</span>
                  </label>
                  <div className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold cursor-not-allowed flex items-center gap-3">
                    <Building size={18} className="text-white/50" /> ระดับหมู่บ้าน (Village)
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-purple-200 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-400"/> <span>เลือกหมู่บ้าน</span>
                  </label>
                  <div className="relative">
                    <select 
                      required
                      value={selectedVillageId} 
                      onChange={(e) => setSelectedVillageId(e.target.value)}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 text-white font-bold appearance-none transition-all cursor-pointer"
                      style={{ colorScheme: 'dark' }} // ทำให้ Dropdown เป็นสีเข้มตามระบบ
                    >
                      <option value="" disabled className="bg-slate-900 text-white/50">-- กรุณาเลือกหมู่บ้านเป้าหมาย --</option>
                      {villagesList.map((v, idx) => (
                        <option key={idx} value={v.village_id} className="bg-slate-800 text-white">{v.name}</option>
                      ))}
                    </select>
                    {/* ไอคอน Dropdown จำลอง */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">▼</div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex justify-center items-center gap-2 transition-all active:scale-[0.98] text-lg"
              >
                <Save size={22} /> ยืนยันการแต่งตั้ง
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AssignPosition;