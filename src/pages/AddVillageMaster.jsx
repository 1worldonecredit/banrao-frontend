import React, { useState, useEffect } from 'react';
import { Save, MapPin, ListPlus } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; // 🌟 เพิ่มบรรทัดนี้

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AddVillageMaster = () => {
  // State สำหรับ Dropdown (สมมติว่าคุณมี API ดึงข้อมูลพื้นที่เหล่านี้แล้ว)
  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedAmphure, setSelectedAmphure] = useState('');
  const [selectedTambon, setSelectedTambon] = useState('');

  // State สำหรับรับข้อมูลแบบ Textarea (พิมพ์ 1 บรรทัด = 1 หมู่บ้าน)
  const [villagesInput, setVillagesInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ตัวอย่างการดึงข้อมูลจังหวัด (คุณอาจต้องปรับ URL ให้ตรงกับ API ที่คุณมี)
  useEffect(() => {
    // สมมติว่าดึง JSON จังหวัดมา
    // fetch(`${API_URL}/api/provinces`).then(res => res.json()).then(data => setProvinces(data.data));
    
    // 🔥 Mock ไว้ก่อนเพื่อให้คุณทดสอบ UI ได้ (รหัส 67 คือ เพชรบูรณ์)
    setProvinces([{ id: 67, name_th: 'เพชรบูรณ์' }]);
  }, []);

  // เมื่อเลือกจังหวัด ให้ดึงอำเภอ
  useEffect(() => {
    if (!selectedProvince) return;
    // fetch(`${API_URL}/api/amphures?province_id=${selectedProvince}`).then...
    setAmphures([{ id: 6701, name_th: 'เมืองเพชรบูรณ์' }, { id: 6702, name_th: 'ชนแดน' }]);
  }, [selectedProvince]);

  // เมื่อเลือกอำเภอ ให้ดึงตำบล
  useEffect(() => {
    if (!selectedAmphure) return;
    // fetch(`${API_URL}/api/tambons?amphure_id=${selectedAmphure}`).then...
    setTambons([{ id: 670101, name_th: 'ในเมือง' }, { id: 670102, name_th: 'ตะเบาะ' }]);
  }, [selectedAmphure]);

  const handleSave = async () => {
    if (!selectedTambon) return alert("กรุณาเลือกตำบล");
    if (!villagesInput.trim()) return alert("กรุณากรอกรายชื่อหมู่บ้าน");

    setIsLoading(true);
    
    // แปลง Textarea เป็น Array
    const lines = villagesInput.split('\n').filter(line => line.trim() !== '');
    const villagesToSave = lines.map(line => {
        // คาดหวังรูปแบบ "1 บ้านโคก" หรือ "บ้านโคก"
        const parts = line.trim().split(' ');
        const moo = !isNaN(parts[0]) ? parts[0] : '-'; // ถ้านำหน้าด้วยเลข ให้ถือว่าเป็นหมู่ที่
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
        setVillagesInput(''); // ล้างช่องกรอกเพื่อพร้อมกรอกตำบลต่อไป
      } else {
        alert('ผิดพลาด: ' + result.message);
      }
    } catch (error) {
      alert('เชื่อมต่อระบบล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-10 font-sans">
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
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">จังหวัด</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500"
                value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}>
                <option value="">-- เลือกจังหวัด --</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">อำเภอ</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500"
                value={selectedAmphure} onChange={(e) => setSelectedAmphure(e.target.value)} disabled={!selectedProvince}>
                <option value="">-- เลือกอำเภอ --</option>
                {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ตำบล</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500"
                value={selectedTambon} onChange={(e) => setSelectedTambon(e.target.value)} disabled={!selectedAmphure}>
                <option value="">-- เลือกตำบล --</option>
                {tambons.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
              </select>
            </div>
          </div>

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