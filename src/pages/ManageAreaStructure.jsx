import React, { useState, useEffect } from 'react';
import { GitBranch, Building2, Map, Home, ArrowRightLeft, CheckSquare, Square, ShieldCheck } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const ManageAreaStructure = () => {
  const [activeTab, setActiveTab] = useState('province'); // 'province' | 'amphure' | 'tambon'
  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedAmphure, setSelectedAmphure] = useState('');
  const [selectedTambon, setSelectedTambon] = useState('');

  const [selectedItems, setSelectedItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // โหลดจังหวัด
  const fetchProvinces = () => {
    fetch(`${API_URL}/api/sys-provinces`)
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  // โหลดอำเภอเมื่อเปลี่ยนจังหวัด
  useEffect(() => {
    setAmphures([]);
    setSelectedAmphure('');
    setTambons([]);
    setSelectedTambon('');
    setVillages([]);
    setSelectedItems([]);
    if (!selectedProvince) return;

    fetch(`${API_URL}/api/sys-amphures/${selectedProvince}`)
      .then(res => res.json())
      .then(data => setAmphures(data))
      .catch(err => console.error(err));
  }, [selectedProvince]);

  // โหลดตำบลเมื่อเปลี่ยนอำเภอ
  useEffect(() => {
    setTambons([]);
    setSelectedTambon('');
    setVillages([]);
    if (activeTab !== 'province') setSelectedItems([]);
    if (!selectedAmphure) return;

    fetch(`${API_URL}/api/sys-tambons/${selectedAmphure}`)
      .then(res => res.json())
      .then(data => setTambons(data))
      .catch(err => console.error(err));
  }, [selectedAmphure]);

 // โหลดหมู่บ้านเมื่อเปลี่ยนตำบล
  useEffect(() => {
    setVillages([]);
    if (activeTab === 'tambon') setSelectedItems([]);
    if (!selectedTambon) return;

    fetch(`${API_URL}/api/villages/by-tambon-id/${selectedTambon}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) =>
            String(a.village_no).localeCompare(String(b.village_no), undefined, { numeric: true })
          );
          setVillages(sorted);
        } else {
          setVillages([]);
        }
      })
      .catch(err => console.error(err));
  }, [selectedTambon]);

  // สลับแท็บแล้วรีเซ็ตค่าที่ติ๊กไว้
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedItems([]);
    setNewName('');
  };

  const toggleItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!newName.trim()) return alert('กรุณากรอกชื่อพื้นที่ใหม่');
    if (selectedItems.length === 0) return alert('กรุณาเลือกรายการที่ต้องการย้ายอย่างน้อย 1 รายการ');

    if (!window.confirm(`ยืนยันการสร้าง "${newName}" และย้าย ${selectedItems.length} รายการที่เลือก?\n(ข้อมูลบ้านเลขที่และประชากรทั้งหมดจะตามไปโดยอัตโนมัติ)`)) {
      return;
    }

    setIsLoading(true);
    try {
      let endpoint = '';
      let payload = {};

      if (activeTab === 'province') {
        endpoint = '/api/area/restructure-province';
        payload = { new_province_name: newName, amphure_codes: selectedItems };
      } else if (activeTab === 'amphure') {
        endpoint = '/api/area/restructure-amphure';
        payload = { target_province_code: selectedProvince, new_amphure_name: newName, tambon_ids: selectedItems };
      } else if (activeTab === 'tambon') {
        endpoint = '/api/area/restructure-tambon';
        payload = { target_amphure_code: selectedAmphure, new_tambon_name: newName, village_ids: selectedItems };
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        alert('✅ ' + result.message);
        setNewName('');
        setSelectedItems([]);
        fetchProvinces();
        setSelectedProvince('');
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + result.message);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // รายการที่จะแสดงให้ติ๊กเลือกตามแท็บปัจจุบัน
  const currentList =
    activeTab === 'province'
      ? amphures.map(a => ({ id: a.amphure_code, label: a.amphure_name_th }))
      : activeTab === 'amphure'
      ? tambons.map(t => ({ id: t.tambon_id, label: t.tambon_name_th }))
      : villages.map(v => ({ id: v.village_id, label: `หมู่ ${v.village_no} ${v.village_name}` }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <div style={{ flexShrink: 0, zIndex: 50, position: 'sticky', top: 0, width: '100%', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <TopNavbar />
      </div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px', paddingTop: '72px', paddingBottom: '80px', width: '100%' }}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shadow-sm">
              <GitBranch size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">ปรับโครงสร้างเขตการปกครอง</h1>
              <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                <ShieldCheck size={16} className="text-emerald-600" />
                แยกจังหวัด / ยกฐานะอำเภอ / แยกตำบล โดยไม่กระทบข้อมูลบ้านเลขที่และประชากร
              </p>
            </div>
          </div>

          {/* 3 Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => handleTabChange('province')}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'province' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 size={18} /> 1. แยกจังหวัด (ย้ายอำเภอ)
            </button>
            <button
              onClick={() => handleTabChange('amphure')}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'amphure' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
               2. แยกอำเภอ (ย้ายตำบล)
            </button>
            <button
              onClick={() => handleTabChange('tambon')}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'tambon' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Home size={18} /> 3. แยกตำบล (ย้ายหมู่บ้าน)
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* Step 1: เลือกพื้นที่ต้นทาง */}
            <h3 className="text-sm font-bold text-slate-700 mb-3">ขั้นตอนที่ 1: เลือกพื้นที่ต้นทาง</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">จังหวัดต้นทาง</label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                >
                  <option value="">-- เลือกจังหวัด --</option>
                  {provinces.map(p => (
                    <option key={p.province_code} value={p.province_code}>{p.province_name_th}</option>
                  ))}
                </select>
              </div>

              {(activeTab === 'amphure' || activeTab === 'tambon') && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">อำเภอต้นทาง</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                    value={selectedAmphure}
                    onChange={(e) => setSelectedAmphure(e.target.value)}
                    disabled={!selectedProvince}
                  >
                    <option value="">-- เลือกอำเภอ --</option>
                    {amphures.map(a => (
                      <option key={a.amphure_code} value={a.amphure_code}>{a.amphure_name_th}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'tambon' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ตำบลต้นทาง</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                    value={selectedTambon}
                    onChange={(e) => setSelectedTambon(e.target.value)}
                    disabled={!selectedAmphure}
                  >
                    <option value="">-- เลือกตำบล --</option>
                    {tambons.map(t => (
                      <option key={t.tambon_id} value={t.tambon_id}>{t.tambon_name_th}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Step 2: ติ๊กเลือกรายการที่จะย้าย */}
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              ขั้นตอนที่ 2: ติ๊กเลือก{activeTab === 'province' ? 'อำเภอ' : activeTab === 'amphure' ? 'ตำบล' : 'หมู่บ้าน'}ที่จะย้าย ({selectedItems.length} รายการ)
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto">
              {currentList.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">กรุณาเลือกพื้นที่ต้นทางด้านบนเพื่อแสดงรายการ</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {currentList.map(item => {
                    const checked = selectedItems.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm font-medium transition-all ${
                          checked ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {checked ? <CheckSquare size={18} className="text-indigo-600 shrink-0" /> : <Square size={18} className="text-slate-400 shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: ตั้งชื่อพื้นที่ใหม่และกดบันทึก */}
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              ขั้นตอนที่ 3: ตั้งชื่อ{activeTab === 'province' ? 'จังหวัดใหม่' : activeTab === 'amphure' ? 'อำเภอใหม่' : 'ตำบลใหม่'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  activeTab === 'province'
                    ? 'เช่น จังหวัดบัวใหญ่ (ไม่ต้องใส่คำว่าจังหวัดก็ได้)'
                    : activeTab === 'amphure'
                    ? 'เช่น อำเภอ...'
                    : 'เช่น ตำบล...'
                }
                className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || selectedItems.length === 0 || !newName.trim()}
                className={`px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  isLoading || selectedItems.length === 0 || !newName.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                }`}
              >
                <ArrowRightLeft size={18} />
                {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการแยกพื้นที่'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0, position: 'fixed', bottom: 0, width: '100%', zIndex: 50 }}>
        <BottomNavbar />
      </div>
    </div>
  );
};

export default ManageAreaStructure;