import React, { useState, useEffect } from 'react';
import { Search, UserCheck, MapPin, ShieldCheck, Save } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; // ปรับ path ให้ตรงกับโปรเจกต์คุณ

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AssignPosition = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State สำหรับฟอร์มแต่งตั้ง
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [villagesList, setVillagesList] = useState([]); // สมมติว่าดึงรายการหมู่บ้านในอำเภอของนายอำเภอมา

  // จำลองดึงข้อมูลหมู่บ้าน (ในระบบจริงควรเรียก API ดึงหมู่บ้านตามอำเภอของนายอำเภอ)
  useEffect(() => {
    // สมมติว่านายอำเภอคนนี้ดูแลตำบลที่มีหมู่บ้านเหล่านี้
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
                position_id: 6, // สมมติว่า 6 คือ ID ตำแหน่งผู้ใหญ่บ้านใน sys_positions
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
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />
      
      <div className="max-w-2xl mx-auto p-4 pt-24">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">แต่งตั้งตำแหน่ง (ผู้ใหญ่บ้าน)</h1>
              <p className="text-sm text-slate-500">สำหรับนายอำเภอ / ปลัดอำเภอ</p>
            </div>
          </div>

          {/* ส่วนค้นหาประชาชน */}
          <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Search size={16} className="text-slate-400"/> ค้นหาประชาชนที่ต้องการแต่งตั้ง
             </label>
             <div className="flex gap-2 flex-col sm:flex-row">
                <input 
                  type="text" value={searchCitizenId} onChange={(e) => setSearchCitizenId(formatCitizenId(e.target.value))} 
                  placeholder="เลขประจำตัวประชาชน 13 หลัก" 
                  className="flex-1 p-3.5 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-mono tracking-wider font-bold" 
                />
                <button 
                  onClick={handleSearchUser} disabled={isLoading} 
                  className="bg-slate-800 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-700 disabled:bg-slate-300 shrink-0"
                >
                  {isLoading ? 'กำลังค้น...' : 'ค้นหา'}
                </button>
             </div>
          </div>

          {/* ส่วนแสดงผลและฟอร์มแต่งตั้ง (จะแสดงเมื่อค้นหาเจอ) */}
          {foundUser && (
            <form onSubmit={handleAssignRole} className="animate-fade-in-up">
              <div className="flex items-center gap-4 p-4 border border-blue-100 bg-blue-50/50 rounded-2xl mb-6">
                <img 
                   src={foundUser.user_image || '/profile-img.jpg'} 
                   alt="Profile" 
                   className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" 
                />
                <div>
                  <div className="text-sm text-blue-600 font-bold mb-1 flex items-center gap-1"><UserCheck size={14}/> พบข้อมูลประชาชน</div>
                  <div className="font-black text-slate-800 text-lg">{foundUser.first_name} {foundUser.last_name}</div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-500"/> เลือกพื้นที่ (หมู่บ้าน) ที่รับผิดชอบ
                </label>
                <select 
                  required
                  value={selectedVillageId} 
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none"
                >
                  <option value="" disabled>-- กรุณาเลือกหมู่บ้าน --</option>
                  {villagesList.map((v, idx) => (
                    <option key={idx} value={v.village_id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95"
              >
                <Save size={20} /> ยืนยันการแต่งตั้งผู้ใหญ่บ้าน
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AssignPosition;