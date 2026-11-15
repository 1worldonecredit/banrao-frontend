import React, { useState, useEffect } from 'react';
import { Home, Users, UserPlus, Plus, MapPin, Save, Loader2, X, Edit, Trash2, CheckSquare, Square, Globe } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];
const currentThaiYear = new Date().getFullYear() + 543;
const years = Array.from({ length: 120 }, (_, i) => currentThaiYear - i);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const formatCitizenId = (value) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length <= 1) return v;
  if (v.length <= 5) return `${v.slice(0, 1)}-${v.slice(1)}`;
  if (v.length <= 10) return `${v.slice(0, 1)}-${v.slice(1, 5)}-${v.slice(5)}`;
  if (v.length <= 12) return `${v.slice(0, 1)}-${v.slice(1, 5)}-${v.slice(5, 10)}-${v.slice(10)}`;
  return `${v.slice(0, 1)}-${v.slice(1, 5)}-${v.slice(5, 10)}-${v.slice(10, 12)}-${v.slice(12, 13)}`;
};

const ManagePopulation = () => {

  const [households, setHouseholds] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [locationContext, setLocationContext] = useState(null);
  
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isLoadingHouses, setIsLoadingHouses] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newHouseholdForm, setNewHouseholdForm] = useState({ house_no: '', expected_member_count: '' });
  const [isNoHouseNumber, setIsNoHouseNumber] = useState(false);
  
  // เพิ่ม State สำหรับชาวต่างชาติ
  const [memberForm, setMemberForm] = useState({
    is_foreigner: false, citizen_id: '', passport_no: '', nationality: 'ไทย',
    first_name: '', last_name: '', nickname: '', gender: '', 
    birth_day: '', birth_month: '', birth_year: '', full_date_of_birth: '',
    status: 'ACTIVE', resident_type: 'REGISTERED', household_status: 'ผู้อาศัย', note: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('userData')) || {};
  const currentVillageId = currentUser.village_id || currentUser.scope_village_id;

  const fetchLocationContext = async () => {
    if (!currentVillageId) return;
    try {
      const res = await fetch(`${API_URL}/api/location-context/${currentVillageId}`);
      const result = await res.json();
      if (result.success) setLocationContext(result.data);
    } catch (error) { console.error("Error location:", error); }
  };

  const fetchHouseholds = async () => {
    if (!currentVillageId) return;
    setIsLoadingHouses(true);
    try {
      const res = await fetch(`${API_URL}/api/households/${currentVillageId}`);
      const result = await res.json();
      if (result.success) {
        setHouseholds(result.data);
        if (selectedHousehold) {
          const updatedHouse = result.data.find(h => h.household_id === selectedHousehold.household_id);
          if (updatedHouse) setSelectedHousehold(updatedHouse);
        }
      }
    } catch (error) { console.error("Error houses:", error); } 
    finally { setIsLoadingHouses(false); }
  };

  const fetchMembers = async (householdId) => {
    if (!householdId) return;
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`${API_URL}/api/household-members/${householdId}`);
      const result = await res.json();
      if (result.success) setHouseholdMembers(result.data);
    } catch (error) { console.error("Error members:", error); } 
    finally { setIsLoadingMembers(false); }
  };

  useEffect(() => {
    fetchLocationContext(); 
    fetchHouseholds();      
  }, [currentVillageId]);

  useEffect(() => {
    if (selectedHousehold) fetchMembers(selectedHousehold.household_id);
    else setHouseholdMembers([]);
  }, [selectedHousehold]);

  const handleAddHousehold = async (e) => {
    e.preventDefault();
    const finalHouseNo = isNoHouseNumber ? 'ไม่มีเลขที่' : newHouseholdForm.house_no;
    if(!finalHouseNo || !newHouseholdForm.expected_member_count) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/households`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ village_id: currentVillageId, house_no: finalHouseNo, expected_member_count: parseInt(newHouseholdForm.expected_member_count) })
      });
      if ((await res.json()).success) {
        setNewHouseholdForm({ house_no: '', expected_member_count: '' });
        setIsNoHouseNumber(false);
        fetchHouseholds();
      }
    } catch (error) { alert('เชื่อมต่อไม่ได้'); } 
    finally { setIsSaving(false); }
  };

  const openAddMemberModal = () => {
    setEditingMember(null);
    setMemberForm({ 
      is_foreigner: false, citizen_id: '', passport_no: '', nationality: 'ไทย',
      first_name: '', last_name: '', nickname: '', gender: '', 
      birth_day: '', birth_month: '', birth_year: '', full_date_of_birth: '',
      status: 'ACTIVE', resident_type: 'REGISTERED', household_status: 'ผู้อาศัย', note: '' 
    });
    setShowMemberModal(true);
  };

  const openEditMemberModal = (member) => {
    setEditingMember(member);
    let bDay = '', bMonth = '', bYear = '', fullDob = '';
    if (member.date_of_birth) {
      const d = new Date(member.date_of_birth);
      bDay = d.getDate().toString();
      bMonth = (d.getMonth() + 1).toString();
      bYear = (d.getFullYear() + 543).toString();
      fullDob = member.date_of_birth.split('T')[0];
    }
    setMemberForm({
      is_foreigner: member.is_foreigner || false,
      citizen_id: formatCitizenId(member.citizen_id || ''),
      passport_no: member.passport_no || '',
      nationality: member.nationality || 'ไทย',
      first_name: member.first_name || '', last_name: member.last_name || '', nickname: member.nickname || '',
      gender: member.gender || '', birth_day: bDay, birth_month: bMonth, birth_year: bYear, full_date_of_birth: fullDob,
      status: member.status || 'ACTIVE', resident_type: member.resident_type || 'REGISTERED', 
      household_status: member.relationship || 'ผู้อาศัย', note: member.note || ''
    });
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if(!selectedHousehold) return;
    
    let dob = null;
    if (memberForm.resident_type === 'REGISTERED') {
      if (memberForm.birth_year && memberForm.birth_month && memberForm.birth_day) {
         const y = parseInt(memberForm.birth_year) - 543;
         const m = String(memberForm.birth_month).padStart(2, '0');
         const d = String(memberForm.birth_day).padStart(2, '0');
         dob = `${y}-${m}-${d}`;
      }
    } else {
      dob = memberForm.full_date_of_birth || null;
    }

    const payload = {
      ...memberForm,
      citizen_id: memberForm.is_foreigner ? null : memberForm.citizen_id.replace(/-/g, ''), 
      passport_no: memberForm.is_foreigner ? memberForm.passport_no : null,
      nationality: memberForm.is_foreigner ? memberForm.nationality : 'ไทย',
      date_of_birth: dob,
      relationship: memberForm.household_status,
      household_id: selectedHousehold.household_id
    };

    setIsSaving(true);
    const url = editingMember ? `${API_URL}/api/household-members/${editingMember.member_id}` : `${API_URL}/api/household-members`;
    const method = editingMember ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        alert('บันทึกข้อมูลประชากรสำเร็จ!'); // 👈 เพิ่มบรรทัดนี้เข้าไปครับ
        setShowMemberModal(false);
        fetchMembers(selectedHousehold.household_id);
        fetchHouseholds();
      } else alert(result.message);
    } catch (error) { alert('บันทึกไม่สำเร็จ'); } 
    finally { setIsSaving(false); }
  };

  const handleToggleStatus = async (member_id, currentStatus, currentResidentType) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const txt = currentResidentType === 'REGISTERED' 
        ? (newStatus === 'ACTIVE' ? 'ปัจจุบันอยู่' : 'ไปอยู่ที่อื่น')
        : (newStatus === 'ACTIVE' ? 'ปัจจุบันอาศัยอยู่' : 'ย้ายออกไปแล้ว');
    
    if(!window.confirm(`เปลี่ยนสถานะเป็น "${txt}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/household-members/${member_id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
      });
      if ((await res.json()).success) {
        fetchMembers(selectedHousehold.household_id);
        fetchHouseholds();
      }
    } catch (error) { alert('เปลี่ยนสถานะไม่สำเร็จ'); }
  };

  const inputStyle = "w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm bg-slate-50 hover:bg-white text-slate-700 transition-all";
  const labelStyle = "block text-xs font-bold text-slate-500 mb-1.5";
  const loc = locationContext || { village_no: '-', village_name: 'กำลังโหลด...', tambon_name_th: '-', amphure_name_th: '-', province_name_th: '-' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <div style={{ flexShrink: 0, zIndex: 40, position: 'sticky', top: 0, width: '100%' }}><TopNavbar /></div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '90px 16px 80px 16px', width: '100%' }}>
        <div className="max-w-7xl mx-auto">
          
          <div className="flex items-center gap-4 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600">
              <Users size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-700">จัดการข้อมูลประชากร</h1>
              <p className="text-sm font-medium text-blue-600 mt-1 flex items-center gap-1.5">
                <MapPin size={14}/> หมู่ที่ {loc.village_no} บ้าน{loc.village_name} ต.{loc.tambon_name_th} อ.{loc.amphure_name_th} จ.{loc.province_name_th}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* เพิ่มข้อมูลบ้าน */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100"><Home size={18} className="text-blue-500" /> เพิ่มข้อมูลบ้าน</h3>
                <form onSubmit={handleAddHousehold} className="flex flex-col gap-4">
                  <div>
                    <label className={labelStyle}>บ้านเลขที่ *</label>
                    <input required={!isNoHouseNumber} disabled={isNoHouseNumber} type="text" className={`${inputStyle} ${isNoHouseNumber ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="เช่น 123/4" value={newHouseholdForm.house_no} onChange={e => setNewHouseholdForm({...newHouseholdForm, house_no: e.target.value})} />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer w-max group">
                      <input type="checkbox" className="hidden" checked={isNoHouseNumber} onChange={() => setIsNoHouseNumber(!isNoHouseNumber)} />
                      {isNoHouseNumber ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors"/>}
                      <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">บ้านไม่มีเลขที่</span>
                    </label>
                  </div>
                  <div>
                    <label className={labelStyle}>จำนวนคนตามทะเบียนบ้าน *</label>
                    <input required type="number" min="1" className={inputStyle} value={newHouseholdForm.expected_member_count} onChange={e => setNewHouseholdForm({...newHouseholdForm, expected_member_count: e.target.value})} />
                  </div>
                  <button disabled={isSaving} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 mt-2 shadow-sm transition-all">
                    <Plus size={18} /> สร้างข้อมูลบ้าน
                  </button>
                </form>
              </div>

              {/* รายการบ้าน */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col">
                <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100"><MapPin size={18} className="text-slate-400" /> รายการบ้าน ({households.length})</h3>
                <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 custom-scrollbar">
                  {households.map(h => {
                    const cCount = Number(h.current_count || 0);
                    const eCount = Number(h.expected_member_count || 0);
                    const isSelect = selectedHousehold?.household_id === h.household_id;
                    return (
                      <button key={h.household_id} onClick={() => setSelectedHousehold(h)} className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${isSelect ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
                        <div className="font-bold text-slate-700 text-[15px]">บ้านเลขที่ {h.house_no}</div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-1.5 flex justify-between">
                          <span>ประชากรที่บันทึกแล้ว:</span>
                          <span className={cCount >= eCount ? 'text-emerald-600' : 'text-amber-600'}>{cCount} / {eCount}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* รายชื่อคนในบ้าน */}
            <div className="lg:col-span-8">
              {!selectedHousehold ? (
                <div className="bg-white h-full rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-10 text-slate-400 min-h-[400px]">
                  <h2 className="text-xl font-bold text-slate-500">เลือกลิสต์บ้านด้านซ้ายเพื่อจัดการสมาชิก</h2>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-xl font-black text-slate-700">บ้านเลขที่ <span className="text-blue-600">{selectedHousehold.house_no}</span></h2>
                    </div>
                    <button onClick={openAddMemberModal} className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all">
                      <UserPlus size={16}/> เพิ่มสมาชิก
                    </button>
                  </div>

                  {householdMembers.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center flex-col text-slate-400 py-10">
                      <Users size={40} className="mb-3 opacity-20" />
                      <p className="font-medium text-sm">ยังไม่มีสมาชิกในบ้านนี้</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50/80 text-slate-600">
                          <tr>
                            <th className="px-4 py-3.5 border-b border-slate-100 font-bold rounded-tl-lg">ชื่อ-สกุล</th>
                            <th className="px-4 py-3.5 border-b border-slate-100 font-bold">ข้อมูลอ้างอิง</th>
                            <th className="px-4 py-3.5 border-b border-slate-100 font-bold">กลุ่ม</th>
                            <th className="px-4 py-3.5 border-b border-slate-100 font-bold text-center">สถานะ</th>
                            <th className="px-4 py-3.5 border-b border-slate-100 font-bold text-center rounded-tr-lg">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {householdMembers.map((person) => {
                            const isInactive = person.status !== 'ACTIVE';
                            const isReg = person.resident_type === 'REGISTERED';
                            return (
                              <tr key={person.member_id} className={`hover:bg-slate-50/50 transition-colors ${isInactive ? 'opacity-50 grayscale-[50%]' : ''}`}>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="font-bold flex items-center gap-1.5">
                                    {person.is_foreigner && <Globe size={12} className="text-amber-500" title="ชาวต่างชาติ"/>}
                                    {person.first_name} {person.last_name} {person.nickname && `(${person.nickname})`}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">{person.relationship}</div>
                                </td>
                                <td className="px-4 py-3">
                                  {person.is_foreigner ? (
                                    <>
                                      <div className="font-mono text-slate-600 text-xs tracking-wider font-semibold">PP: {person.passport_no}</div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">สัญชาติ: {person.nationality}</div>
                                    </>
                                  ) : (
                                    <div className="font-mono text-slate-500 text-xs tracking-wider">{formatCitizenId(person.citizen_id)}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                                  {isReg ? 'ในทะเบียนบ้าน' : 'ผู้อยู่อาศัย (ไม่เข้าทะเบียน)'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-colors ${isInactive ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`} onClick={() => handleToggleStatus(person.member_id, person.status, person.resident_type)} title="คลิกเพื่อเปลี่ยนสถานะ">
                                    {isReg ? (isInactive ? 'ไปอยู่ที่อื่น' : 'ปัจจุบันอยู่') : (isInactive ? 'ย้ายออกไปแล้ว' : 'ปัจจุบันอาศัยอยู่')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center gap-3">
                                    <button onClick={() => openEditMemberModal(person)} className="text-blue-500 hover:text-blue-700 p-1.5 bg-blue-50 rounded-lg"><Edit size={14}/></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0, position: 'fixed', bottom: 0, width: '100%', zIndex: 40 }}><BottomNavbar /></div>

      {/* ===================== MODAL เพิ่ม/แก้ไข สมาชิก ===================== */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600"/> {editingMember ? 'แก้ไขข้อมูลประชากร' : 'เพิ่มสมาชิกใหม่'}
              </h2>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveMember} className="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar bg-slate-50/50">
              
              {/* TABS กลุ่มผู้พักอาศัย */}
              <div className="flex mb-5 bg-slate-100/70 p-1 rounded-xl">
                <button type="button" onClick={() => setMemberForm({...memberForm, resident_type: 'REGISTERED', household_status: 'ผู้อาศัย'})} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${memberForm.resident_type === 'REGISTERED' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                  มีชื่อในทะเบียนบ้าน
                </button>
                <button type="button" onClick={() => setMemberForm({...memberForm, resident_type: 'NON_REGISTERED', household_status: 'เช่ารายเดือน'})} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${memberForm.resident_type === 'NON_REGISTERED' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                  ผู้อยู่อาศัย (ไม่มีชื่อในทะเบียน)
                </button>
              </div>

              {/* Toggle ชาวต่างชาติ (Smart Switch) */}
              <div className="flex justify-end mb-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${memberForm.is_foreigner ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                    <CheckSquare size={14} className={memberForm.is_foreigner ? 'opacity-100' : 'opacity-0'} />
                  </div>
                  <input type="checkbox" className="hidden" checked={memberForm.is_foreigner} onChange={(e) => setMemberForm({...memberForm, is_foreigner: e.target.checked, nationality: e.target.checked ? '' : 'ไทย', citizen_id: '', passport_no: ''})} />
                  <Globe size={16} className={memberForm.is_foreigner ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-sm font-bold text-slate-700 select-none">ประชากรต่างชาติ (Foreigner)</span>
                </label>
              </div>

              {/* ฟอร์มข้อมูลส่วนตัว */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm mb-4 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Smart ID Fields (เปลี่ยนตาม Toggle ต่างชาติ) */}
                  {memberForm.is_foreigner ? (
                    <>
                      <div>
                        <label className={labelStyle}>เลขพาสปอร์ต (Passport No.) *</label>
                        <input required type="text" className={`${inputStyle} font-mono tracking-wider font-bold`} placeholder="เช่น AB1234567" value={memberForm.passport_no} onChange={e => setMemberForm({...memberForm, passport_no: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <label className={labelStyle}>ประเทศ / สัญชาติ (Nationality) *</label>
                        <input required type="text" className={inputStyle} placeholder="เช่น เมียนมา, ลาว, จีน" value={memberForm.nationality} onChange={e => setMemberForm({...memberForm, nationality: e.target.value})} />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <label className={labelStyle}>เลขบัตรประชาชน (13 หลัก) *</label>
                      <input required type="text" maxLength="17" className={`${inputStyle} font-mono tracking-widest font-bold`} placeholder="x-xxxx-xxxxx-xx-x" value={memberForm.citizen_id} onChange={e => setMemberForm({...memberForm, citizen_id: formatCitizenId(e.target.value)})} />
                    </div>
                  )}
                  
                  <div><label className={labelStyle}>ชื่อจริง *</label><input required type="text" className={inputStyle} value={memberForm.first_name} onChange={e => setMemberForm({...memberForm, first_name: e.target.value})} /></div>
                  <div><label className={labelStyle}>นามสกุล *</label><input required type="text" className={inputStyle} value={memberForm.last_name} onChange={e => setMemberForm({...memberForm, last_name: e.target.value})} /></div>
                  <div><label className={labelStyle}>ชื่อเล่น</label><input type="text" className={inputStyle} value={memberForm.nickname} onChange={e => setMemberForm({...memberForm, nickname: e.target.value})} /></div>
                  <div>
                    <label className={labelStyle}>เพศ *</label>
                    <select required className={inputStyle} value={memberForm.gender} onChange={e => setMemberForm({...memberForm, gender: e.target.value})}>
                      <option value="">-- เลือก --</option><option value="MALE">ชาย</option><option value="FEMALE">หญิง</option><option value="OTHER">LGBTQ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ฟอร์มสถานะและรายละเอียดตาม Tab */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Smart Date Picker: ทะเบียนบ้านใช้ Dropdown ไทย, ผู้อาศัยใช้วันที่มาตรฐาน */}
                  {memberForm.resident_type === 'REGISTERED' ? (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="md:col-span-3"><label className={labelStyle}>วันเดือนปีเกิด (แบบไทย)</label></div>
                      <div>
                        <select className={inputStyle} value={memberForm.birth_day} onChange={e => setMemberForm({...memberForm, birth_day: e.target.value})}>
                          <option value="">- วันที่ -</option>{days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <select className={inputStyle} value={memberForm.birth_month} onChange={e => setMemberForm({...memberForm, birth_month: e.target.value})}>
                          <option value="">- เดือน -</option>{thaiMonths.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <select className={inputStyle} value={memberForm.birth_year} onChange={e => setMemberForm({...memberForm, birth_year: e.target.value})}>
                          <option value="">- พ.ศ. -</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className={labelStyle}>วันเดือนปีเกิด (ค.ศ.)</label>
                      <input type="date" className={inputStyle} value={memberForm.full_date_of_birth} onChange={e => setMemberForm({...memberForm, full_date_of_birth: e.target.value})} />
                    </div>
                  )}

                  <div>
                    <label className={labelStyle}>{memberForm.resident_type === 'REGISTERED' ? 'สถานะในครอบครัว' : 'สถานะการอยู่อาศัย'}</label>
                    <select className={inputStyle} value={memberForm.household_status} onChange={e => setMemberForm({...memberForm, household_status: e.target.value})}>
                      {memberForm.resident_type === 'REGISTERED' ? (
                        <><option value="เจ้าบ้าน">เจ้าบ้าน</option><option value="ผู้อาศัย">ผู้อาศัย</option></>
                      ) : (
                        <><option value="ญาติ">ญาติ</option><option value="เช่ารายเดือน">เช่ารายเดือน</option><option value="เช่ารายวัน">เช่ารายวัน</option><option value="พนักงาน/ลูกจ้าง">พนักงาน/ลูกจ้าง</option><option value="คนงาน">คนงาน</option><option value="อื่นๆ">อื่นๆ</option></>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className={labelStyle}>สถานะปัจจุบัน</label>
                    <select className={inputStyle} value={memberForm.status} onChange={e => setMemberForm({...memberForm, status: e.target.value})}>
                      {memberForm.resident_type === 'REGISTERED' ? (
                        <><option value="ACTIVE">ปัจจุบันอยู่</option><option value="INACTIVE">ไปอยู่ที่อื่น</option></>
                      ) : (
                        <><option value="ACTIVE">ปัจจุบันอาศัยอยู่</option><option value="INACTIVE">ย้ายออกไปแล้ว</option></>
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelStyle}>โน้ต / รายละเอียดเพิ่มเติม</label>
                    <textarea className={`${inputStyle} resize-none h-24`} placeholder="พิมพ์รายละเอียดเพิ่มเติม..." value={memberForm.note} onChange={e => setMemberForm({...memberForm, note: e.target.value})}></textarea>
                  </div>

                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึกข้อมูลประชากร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePopulation;