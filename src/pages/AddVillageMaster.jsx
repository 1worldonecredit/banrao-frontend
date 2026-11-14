import React, { useState, useEffect } from 'react';
import { Save, MapPin, ListPlus, Lock } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AddVillageMaster = () => {
  // 1. จำลองการดึงข้อมูลผู้ใช้ที่กำลังล็อกอิน (ดึงจาก State Management หรือ LocalStorage ที่คุณใช้)
  // ตัวอย่างนี้สมมติว่า User เป็นเจ้าหน้าที่ระดับ "จังหวัดเพชรบูรณ์ (id: 67)"
  const currentUser = JSON.parse(localStorage.getItem('userData')) || {
      scope_province_id: 67, // ระบุสิทธิ์ระดับจังหวัด
      scope_amphure_id: null, // ถ้าเป็นเจ้าหน้าที่ระดับอำเภอ จะมีค่าตรงนี้
      scope_tambon_id: null   // ถ้าเป็นเจ้าหน้าที่ระดับตำบล จะมีค่าตรงนี้
  };

  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);

  // 2. กำหนดค่าเริ่มต้นให้กับ State ตามสิทธิ์ของ User ทันที
  const [selectedProvince, setSelectedProvince] = useState(currentUser.scope_province_id || '');
  const [selectedAmphure, setSelectedAmphure] = useState(currentUser.scope_amphure_id || '');
  const [selectedTambon, setSelectedTambon] = useState(currentUser.scope_tambon_id || '');

  const [villagesInput, setVillagesInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ดึงรายชื่อจังหวัดทั้งหมด
  useEffect(() => {
    fetch(`${API_URL}/api/sys-provinces`)
      .then(res => res.json())
      .then(data => {
          const formattedData = data.map(item => ({ id: item.province_id, name_th: item.province_name_th }));
          setProvinces(formattedData);
      });
  }, []);

  // ดึงอำเภอเมื่อ selectedProvince เปลี่ยน (หรือถูกตั้งค่าตั้งแต่แรก)
  useEffect(() => {
    if (!selectedProvince) {
        setAmphures([]);
        setTambons([]);
        return;
    }
    fetch(`${API_URL}/api/sys-amphures/${selectedProvince}`)
      .then(res => res.json())
      .then(data => {
          const formattedData = data.map(item => ({ id: item.amphure_id, name_th: item.amphure_name_th }));
          setAmphures(formattedData);
      });
  }, [selectedProvince]);

  // ดึงตำบลเมื่อ selectedAmphure เปลี่ยน (หรือถูกตั้งค่าตั้งแต่แรก)
  useEffect(() => {
    if (!selectedAmphure) {
        setTambons([]);
        return;
    }
    fetch(`${API_URL}/api/sys-tambons/${selectedAmphure}`)
      .then(res => res.json())
      .then(data => {
          const formattedData = data.map(item => ({ id: item.tambon_id, name_th: item.tambon_name_th }));
          setTambons(formattedData);
      });
  }, [selectedAmphure]);

  // ฟังก์ชันบันทึกข้อมูล (คงเดิม)
  const handleSave = async () => { /* ... โค้ดบันทึกข้อมูล ... */ };

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans"> 
      <TopNavbar />
      <div className="max-w-3xl mx-auto p-4 pt-24">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          {/* ... Header ... */}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 3. ประยุกต์ใช้ Disabled เพื่อล็อก Dropdown หาก User มีสิทธิ์ฟิกซ์ตายตัวไว้แล้ว */}
            <div>
              <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                จังหวัด {currentUser.scope_province_id && <Lock size={12} className="text-slate-400"/>}
              </label>
              <select 
                className={`w-full p-3 border border-slate-200 rounded-xl font-medium outline-none 
                  ${currentUser.scope_province_id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-blue-500'}`}
                value={selectedProvince} 
                onChange={(e) => setSelectedProvince(e.target.value)}
                disabled={!!currentUser.scope_province_id} // ล็อกถ้ามีสิทธิ์ระดับจังหวัด
              >
                <option value="">-- เลือกจังหวัด --</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                อำเภอ {currentUser.scope_amphure_id && <Lock size={12} className="text-slate-400"/>}
              </label>
              <select 
                className={`w-full p-3 border border-slate-200 rounded-xl font-medium outline-none 
                  ${currentUser.scope_amphure_id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-blue-500'}`}
                value={selectedAmphure} 
                onChange={(e) => setSelectedAmphure(e.target.value)}
                disabled={!!currentUser.scope_amphure_id || !selectedProvince} // ล็อกถ้ามีสิทธิ์ระดับอำเภอ หรือยังไม่เลือกจังหวัด
              >
                <option value="">-- เลือกอำเภอ --</option>
                {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-sm font-bold text-slate-700 mb-2">
                ตำบล {currentUser.scope_tambon_id && <Lock size={12} className="text-slate-400"/>}
              </label>
              <select 
                className={`w-full p-3 border border-slate-200 rounded-xl font-medium outline-none 
                  ${currentUser.scope_tambon_id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-blue-500'}`}
                value={selectedTambon} 
                onChange={(e) => setSelectedTambon(e.target.value)}
                disabled={!!currentUser.scope_tambon_id || !selectedAmphure} // ล็อกถ้ามีสิทธิ์ระดับตำบล หรือยังไม่เลือกอำเภอ
              >
                <option value="">-- เลือกตำบล --</option>
                {tambons.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
              </select>
            </div>
          </div>

          {/* ... ช่องกรอกหมู่บ้านและปุ่มบันทึก ... */}
        </div>
      </div>
      <BottomNavbar /> 
    </div>
  );
};

export default AddVillageMaster;