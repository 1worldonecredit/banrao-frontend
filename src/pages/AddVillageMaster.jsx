import React, { useState, useEffect } from 'react';
import { Save, MapPin, ListPlus, Lock } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AddVillageMaster = () => {
  // 1. จำลองข้อมูลสิทธิ์ผู้ใช้งาน
  const currentUser = JSON.parse(localStorage.getItem('userData')) || {
      scope_province_code: null, 
      scope_amphure_code: null,  
      scope_tambon_id: null      
  };

  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);

  // 2. กำหนด State เริ่มต้น
  const [selectedProvince, setSelectedProvince] = useState(currentUser.scope_province_code || '');
  const [selectedAmphure, setSelectedAmphure] = useState(currentUser.scope_amphure_code || '');
  const [selectedTambon, setSelectedTambon] = useState(currentUser.scope_tambon_id || '');

  const [villagesInput, setVillagesInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- State สำหรับตารางแสดงหมู่บ้าน ---
  const [existingVillages, setExistingVillages] = useState([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  // 3. ดึงรายชื่อจังหวัด
  useEffect(() => {
    fetch(`${API_URL}/api/sys-provinces`)
      .then(res => res.json())
      .then(data => {
          const formattedData = data.map(item => ({ 
              id: item.province_code, 
              name_th: item.province_name_th 
          }));
          setProvinces(formattedData);
      })
      .catch(err => console.error("Error fetching provinces:", err));
  }, []);

  // 4. ดึงรายชื่ออำเภอ
  useEffect(() => {
    if (!selectedProvince) {
        setAmphures([]);
        setTambons([]);
        return;
    }
    fetch(`${API_URL}/api/sys-amphures/${selectedProvince}`)
      .then(res => res.json())
      .then(data => {
          const formattedData = data.map(item => ({ 
              id: item.amphure_code, 
              name_th: item.amphure_name_th 
          }));
          setAmphures(formattedData);
      })
      .catch(err => console.error("Error fetching amphures:", err));
  }, [selectedProvince]);

  // 5. ดึงรายชื่อตำบล
  useEffect(() => {
    if (!selectedAmphure) {
        setTambons([]);
        return;
    }
    fetch(`${API_URL}/api/sys-tambons/${selectedAmphure}`)
      .then(res => res.json())
      .then(data => {
          const formattedData = data.map(item => ({ 
              id: item.tambon_id, 
              name_th: item.tambon_name_th 
          }));
          setTambons(formattedData);
      })
      .catch(err => console.error("Error fetching tambons:", err));
  }, [selectedAmphure]);

  // ฟังก์ชันดึงรายชื่อหมู่บ้านที่มีอยู่แล้ว
  // ฟังก์ชันดึงรายชื่อหมู่บ้านที่มีอยู่แล้ว พร้อมจัดเรียงเลขหมู่บ้านให้ถูกต้อง
  const fetchExistingVillages = () => {
    if (!selectedTambon) {
        setExistingVillages([]);
        return;
    }
    setIsLoadingTable(true);
    fetch(`${API_URL}/api/villages/by-tambon-id/${selectedTambon}`)
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) {
              // ใช้คำสั่ง localeCompare พร้อมเปิดโหมด numeric เพื่อให้เรียง 1, 2, 3...10, 11 ได้ถูกต้อง
              const sortedData = data.sort((a, b) => {
                  return String(a.village_no).localeCompare(String(b.village_no), undefined, {
                      numeric: true,
                      sensitivity: 'base'
                  });
              });
              setExistingVillages(sortedData);
          } else {
              setExistingVillages([]);
          }
      })
      .catch(err => console.error("Error fetching existing villages:", err))
      .finally(() => setIsLoadingTable(false));
  };
  // ดึงข้อมูลอัตโนมัติเมื่อเปลี่ยนตำบล
  useEffect(() => {
    fetchExistingVillages();
  }, [selectedTambon]);

  // 6. ฟังก์ชันจัดการการกดบันทึกข้อมูล
  const handleSave = async () => {
    if (!selectedTambon) return alert("กรุณาเลือกตำบล");
    if (!villagesInput.trim()) return alert("กรุณากรอกรายชื่อหมู่บ้าน");

    setIsLoading(true);
    
    const lines = villagesInput.split('\n').filter(line => line.trim() !== '');
    const villagesToSave = lines.map(line => {
        const parts = line.trim().split(' ');
        const moo = !isNaN(parts[0]) ? parts[0] : '-'; 
        const name = !isNaN(parts[0]) ? parts.slice(1).join(' ') : line.trim();
        return { village_no: moo, village_name: name };
    });

    try {
      const res = await fetch(`${API_URL}/api/sys-villages/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tambon_id: selectedTambon, villages: villagesToSave })
      });
      const result = await res.json();
      
      if (result.success) {
        alert(result.message);
        setVillagesInput(''); 
        fetchExistingVillages(); 
      } else {
        alert('เกิดข้อผิดพลาด: ' + result.message);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ปรับพื้นหลังสุดโปร่งแสง 80% (bg-slate-50/80)
    <div className="bg-slate-50/80 min-h-screen pb-24 font-sans backdrop-blur-sm">
      <TopNavbar />
      
      {/* ขยายความกว้างเพื่อรองรับ 2 คอลัมน์ */}
      <div className="max-w-6xl mx-auto p-4 pt-24">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shadow-sm"><MapPin size={28} /></div>
          <div>
            {/* ปรับสีหัวตัวอักษรให้สวยงาม ชัดเจน */}
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
              เพิ่มฐานข้อมูลหมู่บ้าน (Master Data)
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-1">เลือกพื้นที่และพิมพ์รายชื่อหมู่บ้านเพื่อบันทึกลงระบบ</p>
          </div>
        </div>

        {/* แบ่ง Grid เป็น 2 ฝั่ง (ฝั่งซ้าย 7 ส่วน, ฝั่งขวา 5 ส่วน) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ============================================== */}
          {/* ฝั่งซ้าย: ฟอร์มกรอกข้อมูล */}
          {/* ============================================== */}
          <div className="lg:col-span-7">
            {/* สี Card โปร่งแสง 60% (bg-white/60) */}
            <div className="bg-white/60 p-6 rounded-2xl shadow-lg border border-white/50 backdrop-blur-md">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Dropdown จังหวัด */}
                <div>
                  <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                    จังหวัด {currentUser.scope_province_code && <Lock size={12} className="text-slate-400"/>}
                  </label>
                  <select 
                    className={`w-full p-3 border border-slate-200/80 rounded-xl font-medium outline-none transition-all
                      ${currentUser.scope_province_code ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed' : 'bg-white/70 hover:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
                    value={selectedProvince} 
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    disabled={!!currentUser.scope_province_code}
                  >
                    <option value="">-- เลือกจังหวัด --</option>
                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                  </select>
                </div>

                {/* Dropdown อำเภอ */}
                <div>
                  <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                    อำเภอ {currentUser.scope_amphure_code && <Lock size={12} className="text-slate-400"/>}
                  </label>
                  <select 
                    className={`w-full p-3 border border-slate-200/80 rounded-xl font-medium outline-none transition-all
                      ${currentUser.scope_amphure_code ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed' : 'bg-white/70 hover:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
                    value={selectedAmphure} 
                    onChange={(e) => setSelectedAmphure(e.target.value)}
                    disabled={!!currentUser.scope_amphure_code || !selectedProvince}
                  >
                    <option value="">-- เลือกอำเภอ --</option>
                    {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
                  </select>
                </div>

                {/* Dropdown ตำบล */}
                <div>
                  <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                    ตำบล {currentUser.scope_tambon_id && <Lock size={12} className="text-slate-400"/>}
                  </label>
                  <select 
                    className={`w-full p-3 border border-slate-200/80 rounded-xl font-medium outline-none transition-all
                      ${currentUser.scope_tambon_id ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed' : 'bg-white/70 hover:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
                    value={selectedTambon} 
                    onChange={(e) => setSelectedTambon(e.target.value)}
                    disabled={!!currentUser.scope_tambon_id || !selectedAmphure}
                  >
                    <option value="">-- เลือกตำบล --</option>
                    {tambons.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
                  </select>
                </div>
              </div>

              {/* ช่องกรอกข้อมูลหมู่บ้าน */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <ListPlus size={16} className="text-blue-600" /> รายชื่อหมู่บ้าน (แยกบรรทัด)
                </label>
                <textarea 
                  rows="8"
                  value={villagesInput}
                  onChange={(e) => setVillagesInput(e.target.value)}
                  placeholder="กรอกข้อมูลรูปแบบ: [หมู่ที่] [ชื่อหมู่บ้าน] (1 บรรทัดต่อ 1 หมู่บ้าน)&#10;เช่น:&#10;1 บ้านดง&#10;2 บ้านน้ำร้อน&#10;บ้านสันป่าตอง (ถ้าไม่มีหมู่ที่)"
                  className="w-full p-4 bg-white/70 border border-slate-200/80 rounded-xl outline-none resize-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium text-sm leading-relaxed shadow-inner"
                ></textarea>
                <p className="text-xs font-medium text-amber-600 mt-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                  * ระบบจะแยกข้อมูลด้วยการเว้นวรรคช่องแรก หากพิมพ์ "1 บ้านดง" ระบบจะบันทึก หมู่ที่=1, ชื่อ=บ้านดง
                </p>
              </div>

              {/* ปุ่มบันทึก */}
              <button 
                onClick={handleSave} 
                disabled={isLoading || !selectedTambon || !villagesInput}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  (isLoading || !selectedTambon || !villagesInput) 
                  ? 'bg-slate-200/80 text-slate-400 cursor-not-allowed border border-slate-300/50' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-1 hover:shadow-xl border border-blue-500/50'
                }`}
              >
                {isLoading ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึกข้อมูลหมู่บ้านเข้าสู่ระบบ</>}
              </button>
            </div>
          </div>

          {/* ============================================== */}
          {/* ฝั่งขวา: ตารางแสดงรายชื่อหมู่บ้าน (ย้ายมาไว้ข้างๆ) */}
          {/* ============================================== */}
          <div className="lg:col-span-5">
            <div className="bg-white/60 p-6 rounded-2xl shadow-lg border border-white/50 backdrop-blur-md h-full flex flex-col">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-200/80">
                <ListPlus size={20} className="text-indigo-600" />
                หมู่บ้านในระบบ ({existingVillages.length})
              </h3>
              
              {!selectedTambon ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-slate-200/50 border-dashed">
                  <MapPin size={32} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm font-medium">กรุณาเลือกตำบลเพื่อดูรายชื่อหมู่บ้าน</p>
                </div>
              ) : isLoadingTable ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-medium animate-pulse">
                  กำลังโหลดข้อมูลหมู่บ้าน...
                </div>
              ) : existingVillages.length > 0 ? (
                <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm bg-white/80">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100/80 text-slate-700 sticky top-0 backdrop-blur-md z-10">
                        <tr>
                          <th className="px-5 py-3 font-bold border-b border-slate-200/80 w-24">หมู่ที่</th>
                          <th className="px-5 py-3 font-bold border-b border-slate-200/80">ชื่อหมู่บ้าน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {existingVillages.map((v, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-3 font-bold text-indigo-600">{v.village_no}</td>
                            <td className="px-5 py-3 font-medium text-slate-700">{v.village_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-6 text-center text-slate-500 text-sm border border-slate-200/50 border-dashed">
                  <p className="font-medium">ยังไม่มีข้อมูลหมู่บ้านในตำบลนี้</p>
                  <p className="text-xs mt-1 text-slate-400">กรุณาเพิ่มรายชื่อในช่องด้านซ้าย</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>

      <BottomNavbar /> 
      
      {/* เพิ่ม CSS เล็กน้อยสำหรับ Scrollbar ด้านขวาให้ดูสะอาดตา */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
      `}} />
    </div>
  );
};

export default AddVillageMaster;