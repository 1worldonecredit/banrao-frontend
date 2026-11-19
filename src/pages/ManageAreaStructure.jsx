import React, { useState, useEffect } from 'react';
import { GitBranch, Building2, Map, Home, ArrowRightLeft, CheckSquare, Square, ShieldCheck, Trash2, PlusCircle, CornerUpLeft } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const ManageAreaStructure = () => {
  const [activeTab, setActiveTab] = useState('tambon'); // 'province' | 'amphure' | 'tambon'
  const [actionMode, setActionMode] = useState('create'); // 'create' (สร้างใหม่) | 'move' (ย้ายไปพื้นที่เดิม)

  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedAmphure, setSelectedAmphure] = useState('');
  const [selectedTambon, setSelectedTambon] = useState('');

  const [selectedItems, setSelectedItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [targetExistingId, setTargetExistingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchProvinces = () => {
    fetch(`${API_URL}/api/sys-provinces`)
      .then(res => res.json())
      .then(data => setProvinces(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const fetchAmphures = (provCode) => {
    if (!provCode) return setAmphures([]);
    fetch(`${API_URL}/api/sys-amphures/${provCode}`)
      .then(res => res.json())
      .then(data => setAmphures(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const fetchTambons = (ampCode) => {
    if (!ampCode) return setTambons([]);
    fetch(`${API_URL}/api/sys-tambons/${ampCode}`)
      .then(res => res.json())
      .then(data => setTambons(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const fetchVillages = (tamId) => {
    if (!tamId) return setVillages([]);
    fetch(`${API_URL}/api/villages/by-tambon-id/${tamId}`)
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
  };

  useEffect(() => { fetchProvinces(); }, []);

  useEffect(() => {
    setSelectedAmphure('');
    setTambons([]);
    setSelectedTambon('');
    setVillages([]);
    setSelectedItems([]);
    setTargetExistingId('');
    fetchAmphures(selectedProvince);
  }, [selectedProvince]);

  useEffect(() => {
    setSelectedTambon('');
    setVillages([]);
    if (activeTab !== 'province') setSelectedItems([]);
    setTargetExistingId('');
    fetchTambons(selectedAmphure);
  }, [selectedAmphure]);

  useEffect(() => {
    if (activeTab === 'tambon') setSelectedItems([]);
    setTargetExistingId('');
    fetchVillages(selectedTambon);
  }, [selectedTambon]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedItems([]);
    setNewName('');
    setTargetExistingId('');
  };

  const toggleItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // กดยืนยัน (รองรับทั้ง สร้างใหม่ และ ย้ายไปพื้นที่เดิม)
  const handleSubmit = async () => {
    if (selectedItems.length === 0) return alert('กรุณาเลือกรายการที่ต้องการย้ายอย่างน้อย 1 รายการ');

    if (actionMode === 'create') {
      if (!newName.trim()) return alert('กรุณากรอกชื่อพื้นที่ใหม่');
      if (!window.confirm(`ยืนยันการสร้าง "${newName}" และย้าย ${selectedItems.length} รายการที่เลือก?`)) return;
    } else {
      if (!targetExistingId) return alert('กรุณาเลือกพื้นที่ปลายทางที่ต้องการย้ายไป');
      if (!window.confirm(`ยืนยันการย้าย ${selectedItems.length} รายการไปยังพื้นที่ปลายทางที่เลือก?`)) return;
    }

    setIsLoading(true);
    try {
      let endpoint = '';
      let payload = {};

      if (actionMode === 'create') {
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
      } else {
        endpoint = '/api/area/move-to-existing';
        payload = { level: activeTab, item_ids: selectedItems, target_parent_id: targetExistingId };
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
        setTargetExistingId('');
        // โหลดข้อมูลล่าสุดมาแสดงทันที
        if (activeTab === 'tambon') {
          fetchTambons(selectedAmphure);
          fetchVillages(selectedTambon);
        } else if (activeTab === 'amphure') {
          fetchAmphures(selectedProvince);
          fetchTambons(selectedAmphure);
        } else {
          fetchProvinces();
        }
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + result.message);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // กดลบตำบล หรือ อำเภอที่ว่างแล้ว
  const handleDeleteEmpty = async (level, id, label) => {
    if (!id) return;
    if (!window.confirm(`ยืนยันการลบ "${label}" ออกจากระบบ?\n(ระบบจะลบได้เฉพาะเมื่อไม่มีข้อมูลลูกสังกัดอยู่แล้วเท่านั้น)`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/area/delete-empty`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, id })
      });
      const result = await res.json();
      if (result.success) {
        alert('🗑️ ' + result.message);
        if (level === 'tambon') {
          setSelectedTambon('');
          setVillages([]);
          fetchTambons(selectedAmphure);
        } else if (level === 'amphure') {
          setSelectedAmphure('');
          setTambons([]);
          fetchAmphures(selectedProvince);
        }
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentList =
    activeTab === 'province'
      ? amphures.map(a => ({ id: a.amphure_code || a.id, label: a.amphure_name_th }))
      : activeTab === 'amphure'
      ? tambons.map(t => ({ id: t.tambon_id || t.id, label: t.tambon_name_th }))
      : villages.map(v => ({ id: v.village_id ?? v.id, label: `หมู่ ${v.village_no} ${v.village_name}` }));

  // ตัวเลือกปลายทางสำหรับโหมด "ย้ายไปพื้นที่เดิม"
  const targetOptions =
    activeTab === 'tambon'
      ? tambons.filter(t => String(t.tambon_id) !== String(selectedTambon)).map(t => ({ id: t.tambon_id, label: t.tambon_name_th }))
      : activeTab === 'amphure'
      ? amphures.filter(a => String(a.amphure_code) !== String(selectedAmphure)).map(a => ({ id: a.amphure_code, label: a.amphure_name_th }))
      : provinces.filter(p => String(p.province_code) !== String(selectedProvince)).map(p => ({ id: p.province_code, label: p.province_name_th }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <div style={{ flexShrink: 0, zIndex: 50, position: 'sticky', top: 0, width: '100%', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <TopNavbar />
      </div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px', paddingTop: '24px', paddingBottom: '80px', width: '100%' }}>
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
                แยกพื้นที่ / ย้ายกลับ / ลบพื้นที่ว่าง โดยไม่กระทบข้อมูลบ้านเลขที่และประชากร
              </p>
            </div>
          </div>

          {/* 3 Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={() => handleTabChange('province')} className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'province' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Building2 size={18} /> 1. จังหวัด (ย้ายอำเภอ)
            </button>
            <button onClick={() => handleTabChange('amphure')} className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'amphure' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
               2. อำเภอ (ย้ายตำบล)
            </button>
            <button onClick={() => handleTabChange('tambon')} className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'tambon' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Home size={18} /> 3. ตำบล (ย้ายหมู่บ้าน)
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* Step 1 */}
            <h3 className="text-sm font-bold text-slate-700 mb-3">ขั้นตอนที่ 1: เลือกพื้นที่ต้นทาง</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">จังหวัดต้นทาง</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}>
                  <option value="">-- เลือกจังหวัด --</option>
                  {provinces.map(p => <option key={p.province_code} value={p.province_code}>{p.province_name_th}</option>)}
                </select>
              </div>

              {(activeTab === 'amphure' || activeTab === 'tambon') && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">อำเภอต้นทาง</label>
                  <div className="flex gap-1.5">
                    <select className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" value={selectedAmphure} onChange={(e) => setSelectedAmphure(e.target.value)} disabled={!selectedProvince}>
                      <option value="">-- เลือกอำเภอ --</option>
                      {amphures.map(a => <option key={a.amphure_code} value={a.amphure_code}>{a.amphure_name_th}</option>)}
                    </select>
                    {activeTab === 'amphure' && selectedAmphure && (
                      <button
                        type="button"
                        title="ลบอำเภอนี้ (เมื่อไม่มีตำบลแล้ว)"
                        onClick={() => handleDeleteEmpty('amphure', selectedAmphure, amphures.find(a => String(a.amphure_code) === String(selectedAmphure))?.amphure_name_th)}
                        className="px-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tambon' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ตำบลต้นทาง</label>
                  <div className="flex gap-1.5">
                    <select className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" value={selectedTambon} onChange={(e) => setSelectedTambon(e.target.value)} disabled={!selectedAmphure}>
                      <option value="">-- เลือกตำบล --</option>
                      {tambons.map(t => <option key={t.tambon_id} value={t.tambon_id}>{t.tambon_name_th}</option>)}
                    </select>
                    {selectedTambon && (
                      <button
                        type="button"
                        title="ลบตำบลนี้ (เมื่อไม่มีหมู่บ้านแล้ว)"
                        onClick={() => handleDeleteEmpty('tambon', selectedTambon, tambons.find(t => String(t.tambon_id) === String(selectedTambon))?.tambon_name_th)}
                        className="px-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              ขั้นตอนที่ 2: ติ๊กเลือก{activeTab === 'province' ? 'อำเภอ' : activeTab === 'amphure' ? 'ตำบล' : 'หมู่บ้าน'}ที่จะย้าย ({selectedItems.length} รายการ)
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto">
              {currentList.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">ไม่มีรายการในพื้นที่นี้ (หากต้องการลบพื้นที่ว่างนี้ สามารถกดปุ่มถังขยะสีแดงด้านบนได้)</p>
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

            {/* Step 3: เลือกโหมด สร้างใหม่ หรือ ย้ายกลับไปพื้นที่เดิม */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-700">ขั้นตอนที่ 3: เลือกปลายทาง</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActionMode('create')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    actionMode === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <PlusCircle size={15} /> สร้างพื้นที่ใหม่
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode('move')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    actionMode === 'move' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <CornerUpLeft size={15} /> ย้ายกลับ / ไปพื้นที่เดิม
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {actionMode === 'create' ? (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`กรอกชื่อ${activeTab === 'province' ? 'จังหวัดใหม่' : activeTab === 'amphure' ? 'อำเภอใหม่' : 'ตำบลใหม่'}...`}
                  className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                />
              ) : (
                <select
                  value={targetExistingId}
                  onChange={(e) => setTargetExistingId(e.target.value)}
                  className="flex-1 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-emerald-500"
                >
                  <option value="">-- เลือก{activeTab === 'province' ? 'จังหวัด' : activeTab === 'amphure' ? 'อำเภอ' : 'ตำบล'}ปลายทางที่ต้องการย้ายไป --</option>
                  {targetOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading || selectedItems.length === 0 || (actionMode === 'create' ? !newName.trim() : !targetExistingId)}
                className={`px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  isLoading || selectedItems.length === 0 || (actionMode === 'create' ? !newName.trim() : !targetExistingId)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : actionMode === 'create'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                }`}
              >
                <ArrowRightLeft size={18} />
                {isLoading ? 'กำลังดำเนินการ...' : actionMode === 'create' ? 'ยืนยันการแยกพื้นที่' : 'ยืนยันการย้ายกลับ'}
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