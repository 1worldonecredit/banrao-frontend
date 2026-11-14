import React, { useState, useEffect } from 'react';
import { Save, MapPin, ListPlus, Lock } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; // ตรวจสอบ Path ให้ตรงกับโฟลเดอร์ของคุณ
import BottomNavbar from '../components/BottomNavbar'; // ตรวจสอบ Path ให้ตรงกับโฟลเดอร์ของคุณ

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AddVillageMaster = () => {
  // 1. จำลองข้อมูลสิทธิ์ผู้ใช้งาน (ดึงจาก LocalStorage ถ้ามี)
  // หากต้องการล็อกจังหวัด ให้ใส่รหัสจังหวัด 2 หลักตรง scope_province_code (เช่น '67' คือเพชรบูรณ์)
  const currentUser = JSON.parse(localStorage.getItem('userData')) || {
      scope_province_code: null, // สมมติถ้าเป็น '67' จะล็อกที่เพชรบูรณ์
      scope_amphure_code: null,  // สมมติถ้าเป็น '6701' จะล็อกที่เมืองเพชรบูรณ์
      scope_tambon_id: null      
  };

  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);

  // 2. กำหนด State เริ่มต้นตามสิทธิ์ของผู้ใช้งาน
  const [selectedProvince, setSelectedProvince] = useState(currentUser.scope_province_code || '');
  const [selectedAmphure, setSelectedAmphure] = useState(currentUser.scope_amphure_code || '');
  const [selectedTambon, setSelectedTambon] = useState(currentUser.scope_tambon_id || '');

  const [villagesInput, setVillagesInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 3. ดึงรายชื่อจังหวัดทั้งหมด (ใช้ province_code)
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

  // 4. ดึงรายชื่ออำเภอ เมื่อมีการเลือกจังหวัด (ใช้ amphure_code)
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

  // 5. ดึงรายชื่อตำบล เมื่อมีการเลือกอำเภอ (ต้องคืนค่า tambon_id เพื่อใช้บันทึกลงฐานข้อมูล)
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

  // 6. ฟังก์ชันจัดการการกดบันทึกข้อมูล
  const handleSave = async () => {
    if (!selectedTambon) return alert("กรุณาเลือกตำบล");
    if (!villagesInput.trim()) return alert("กรุณากรอกรายชื่อหมู่บ้าน");

    setIsLoading(true);
    
    // แยกบรรทัดและจัดรูปแบบข้อมูลเพื่อส่งไป Backend
    const lines = villagesInput.split('\n').filter(line => line.trim() !== '');
    const villagesToSave = lines.map(line => {
        const parts = line.trim().split(' ');
        const moo = !isNaN(parts[0]) ? parts[0] : '-'; // ถ้านำหน้าด้วยตัวเลข ให้ถือว่าเป็นหมู่ที่
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
        setVillagesInput(''); // ล้างช่องเฉพาะรายชื่อหมู่บ้าน เพื่อให้กรอกตำบลถัดไปได้เลย
        
        // 🌟 เพิ่มคำสั่งนี้เพื่อโหลดข้อมูลตารางใหม่ทันทีที่บันทึกสำเร็จ
        if (typeof fetchExistingVillages === 'function') {
            fetchExistingVillages();
        }
        
      } else {
        alert('เกิดข้อผิดพลาด: ' + result.message);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- State สำหรับตารางแสดงหมู่บ้าน ---
  const [existingVillages, setExistingVillages] = useState([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  // ฟังก์ชันดึงรายชื่อหมู่บ้านที่มีอยู่แล้ว
  const fetchExistingVillages = () => {
    if (!selectedTambon) {
        setExistingVillages([]);
        return;
    }
    setIsLoadingTable(true);
    fetch(`${API_URL}/api/villages/by-tambon-id/${selectedTambon}`)
      .then(res => res.json())
      .then(data => setExistingVillages(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching existing villages:", err))
      .finally(() => setIsLoadingTable(false));
  };

  // ดึงข้อมูลอัตโนมัติเมื่อเปลี่ยนตำบล
  useEffect(() => {
    fetchExistingVillages();
  }, [selectedTambon]);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar />
      
      <div className="max-w-3xl mx-auto p-4 pt-24">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><MapPin size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-800">เพิ่มฐานข้อมูลหมู่บ้าน (Master Data)</h1>
              <p className="text-sm text-slate-500">เลือกพื้นที่และพิมพ์รายชื่อหมู่บ้านเพื่อบันทึกลงระบบ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Dropdown จังหวัด */}
            <div>
              <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                จังหวัด {currentUser.scope_province_code && <Lock size={12} className="text-slate-400"/>}
              </label>
              <select 
                className={`w-full p-3 border border-slate-200 rounded-xl font-medium outline-none 
                  ${currentUser.scope_province_code ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-blue-500'}`}
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
                className={`w-full p-3 border border-slate-200 rounded-xl font-medium outline-none 
                  ${currentUser.scope_amphure_code ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-blue-500'}`}
                value={selectedAmphure} 
                onChange={(e) => setSelectedAmphure(e.target.value)}
                disabled={!!currentUser.scope_amphure_code || !selectedProvince}
              >
                <option value="">-- เลือกอำเภอ --</option>
                {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
              </select>
            </div>

            {/* Dropdown ตำบล */}
           {/* ============================================== */}
          {/* ตารางแสดงข้อมูลหมู่บ้านที่มีอยู่แล้ว (จะแสดงเมื่อเลือกตำบล) */}
          {/* ============================================== */}
          {selectedTambon && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ListPlus size={18} className="text-blue-600" />
                รายชื่อหมู่บ้านที่มีในระบบแล้ว ({existingVillages.length} หมู่บ้าน)
              </h3>
              
              {isLoadingTable ? (
                <div className="text-center py-6 text-slate-500 text-sm font-medium animate-pulse">
                  กำลังโหลดข้อมูลหมู่บ้าน...
                </div>
              ) : existingVillages.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-6 py-4 font-bold border-b border-slate-200 w-32">หมู่ที่</th>
                        <th className="px-6 py-4 font-bold border-b border-slate-200">ชื่อหมู่บ้าน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {existingVillages.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-900">{v.village_no}</td>
                          <td className="px-6 py-3 text-slate-600">{v.village_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500 text-sm border border-slate-200 border-dashed">
                  ยังไม่มีข้อมูลหมู่บ้านในตำบลนี้
                </div>
              )}
            </div>
          )}
          </div>

          {/* ช่องกรอกข้อมูลหมู่บ้าน */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <ListPlus size={16} /> รายชื่อหมู่บ้าน (แยกบรรทัด)
            </label>
            <textarea 
              rows="8"
              value={villagesInput}
              onChange={(e) => setVillagesInput(e.target.value)}
              placeholder="กรอกข้อมูลรูปแบบ: [หมู่ที่] [ชื่อหมู่บ้าน] (1 บรรทัดต่อ 1 หมู่บ้าน)&#10;เช่น:&#10;1 บ้านดง&#10;2 บ้านน้ำร้อน&#10;บ้านสันป่าตอง (ถ้าไม่มีหมู่ที่)"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm leading-relaxed"
            ></textarea>
            <p className="text-xs text-slate-400 mt-2">* ระบบจะแยกข้อมูลด้วยการเว้นวรรคช่องแรก หากพิมพ์ "1 บ้านดง" ระบบจะบันทึก หมู่ที่=1, ชื่อ=บ้านดง</p>
          </div>

          {/* ปุ่มบันทึก */}
          <button 
            onClick={handleSave} 
            disabled={isLoading || !selectedTambon || !villagesInput}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              (isLoading || !selectedTambon || !villagesInput) 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึกข้อมูลหมู่บ้านเข้าสู่ระบบ</>}
          </button>

        </div>
      </div>

      <BottomNavbar /> 
    </div>
  );
};

export default AddVillageMaster;