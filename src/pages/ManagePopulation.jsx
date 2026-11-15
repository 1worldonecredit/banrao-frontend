import React, { useState, useEffect } from 'react';
import { Home, Users, UserPlus, Plus, MapPin, Save, Loader2, X, Edit, Trash2 } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const ManagePopulation = () => {

  const [households, setHouseholds] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [locationContext, setLocationContext] = useState(null);
  
  // State สำหรับ Popup สมาชิก
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [isLoadingHouses, setIsLoadingHouses] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ฟอร์ม
  const [newHouseholdForm, setNewHouseholdForm] = useState({ house_no: '', expected_member_count: '' });
  const [memberForm, setMemberForm] = useState({
    citizen_id: '', first_name: '', last_name: '', nickname: '', gender: '', date_of_birth: '', status: 'ACTIVE'
  });

  const currentUser = JSON.parse(localStorage.getItem('userData')) || {};
  const currentVillageId = currentUser.village_id || currentUser.scope_village_id;

  // โหลดพื้นที่
  const fetchLocationContext = async () => {
    if (!currentVillageId) return;
    try {
      const res = await fetch(`${API_URL}/api/location-context/${currentVillageId}`);
      const result = await res.json();
      if (result.success) setLocationContext(result.data);
    } catch (error) { console.error("Error location:", error); }
  };

  // โหลดบ้าน
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

  // โหลดคนในบ้าน
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

  // ฟังก์ชัน: สร้างบ้าน
  const handleAddHousehold = async (e) => {
    e.preventDefault();
    if(!newHouseholdForm.house_no || !newHouseholdForm.expected_member_count) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/households`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_id: currentVillageId,
          house_no: newHouseholdForm.house_no,
          expected_member_count: parseInt(newHouseholdForm.expected_member_count)
        })
      });
      const result = await res.json();
      if (result.success) {
        setNewHouseholdForm({ house_no: '', expected_member_count: '' });
        fetchHouseholds(); // รีโหลดบ้านใหม่
      } else alert(result.message);
    } catch (error) { alert('เชื่อมต่อไม่ได้'); } 
    finally { setIsSaving(false); }
  };

  // เปิด Popup เพิ่มสมาชิก
  const openAddMemberModal = () => {
    setEditingMember(null);
    setMemberForm({ citizen_id: '', first_name: '', last_name: '', nickname: '', gender: '', date_of_birth: '', status: 'ACTIVE' });
    setShowMemberModal(true);
  };

  // เปิด Popup แก้ไขสมาชิก
  const openEditMemberModal = (member) => {
    setEditingMember(member);
    setMemberForm({
      citizen_id: member.citizen_id || '', first_name: member.first_name || '',
      last_name: member.last_name || '', nickname: member.nickname || '',
      gender: member.gender || '', date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '', 
      status: member.status || 'ACTIVE'
    });
    setShowMemberModal(true);
  };

  // ฟังก์ชัน: บันทึกสมาชิก (เงื่อนไขเลขบัตรประชาชนต้องไม่ซ้ำ)
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if(!selectedHousehold) return;
    setIsSaving(true);
    
    const url = editingMember ? `${API_URL}/api/household-members/${editingMember.member_id}` : `${API_URL}/api/household-members`;
    const method = editingMember ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...memberForm, household_id: selectedHousehold.household_id })
      });
      const result = await res.json();
      if (result.success) {
        setShowMemberModal(false);
        fetchMembers(selectedHousehold.household_id);
        fetchHouseholds(); // รีโหลดเพื่ออัปเดตจำนวนคน (current_count)
      } else alert(result.message); // เช่น "เลขบัตรประชาชนนี้อยู่ในระบบแล้ว"
    } catch (error) { alert('บันทึกไม่สำเร็จ'); } 
    finally { setIsSaving(false); }
  };

  // ฟังก์ชัน: เปลี่ยนสถานะ (Active/Inactive)
  const handleToggleStatus = async (member_id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if(!window.confirm(`ต้องการเปลี่ยนสถานะเป็น "${newStatus === 'ACTIVE' ? 'อาศัยอยู่' : 'เคยอาศัย'}" ใช่หรือไม่?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/household-members/${member_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if ((await res.json()).success) {
        fetchMembers(selectedHousehold.household_id);
        fetchHouseholds(); // รีโหลดจำนวน
      }
    } catch (error) { alert('เปลี่ยนสถานะไม่สำเร็จ'); }
  };

  const inputStyle = "w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-slate-50";
  const labelStyle = "block text-xs font-bold text-slate-500 mb-1";
  const loc = locationContext || { village_no: '-', village_name: '-', tambon_name_th: '-', amphure_name_th: '-', province_name_th: '-' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <div style={{ flexShrink: 0, zIndex: 40, position: 'sticky', top: 0, width: '100%' }}><TopNavbar /></div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '90px 16px 80px 16px', width: '100%' }}>
        <div className="max-w-7xl mx-auto">
          
          {/* Header แสดงพื้นที่ */}
          <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-500">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">จัดการข้อมูลประชากร</h1>
              <p className="text-sm font-medium text-blue-600 mt-1 flex items-center gap-1">
                <MapPin size={14}/> 
                หมู่ที่ {loc.village_no} บ้าน{loc.village_name} ต.{loc.tambon_name_th} อ.{loc.amphure_name_th} จ.{loc.province_name_th}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ฝั่งซ้าย: จัดการบ้าน */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2"><Home size={18} className="text-blue-500" /> เพิ่มข้อมูลบ้าน</h3>
                <form onSubmit={handleAddHousehold} className="flex flex-col gap-3">
                  <div>
                    <label className={labelStyle}>บ้านเลขที่ *</label>
                    <input required type="text" className={inputStyle} value={newHouseholdForm.house_no} onChange={e => setNewHouseholdForm({...newHouseholdForm, house_no: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelStyle}>จำนวนคนตามทะเบียนบ้าน *</label>
                    <input required type="number" min="1" className={inputStyle} value={newHouseholdForm.expected_member_count} onChange={e => setNewHouseholdForm({...newHouseholdForm, expected_member_count: e.target.value})} />
                  </div>
                  <button disabled={isSaving} type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                    <Plus size={16} /> สร้างข้อมูลบ้าน
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2"><MapPin size={18} className="text-slate-500" /> รายการบ้าน ({households.length})</h3>
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {households.map(h => {
                    const cCount = Number(h.current_count || 0);
                    const eCount = Number(h.expected_member_count || 0);
                    return (
                      <button key={h.household_id} onClick={() => setSelectedHousehold(h)} className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${selectedHousehold?.household_id === h.household_id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <div>
                          <div className="font-bold text-slate-800">บ้านเลขที่ {h.house_no}</div>
                          <div className="text-xs text-slate-500 mt-1">ประชากรปัจจุบัน: {cCount} / {eCount}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ฝั่งขวา: รายชื่อคนในบ้าน */}
            <div className="lg:col-span-8">
              {!selectedHousehold ? (
                <div className="bg-white h-full rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-10 text-slate-400 min-h-[400px]">
                  <h2 className="text-xl font-bold">เลือกลิสต์บ้านด้านซ้ายเพื่อดูสมาชิก</h2>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <div>
                      <h2 className="text-lg font-black text-slate-800">บ้านเลขที่ <span className="text-blue-600">{selectedHousehold.house_no}</span></h2>
                      <p className="text-sm text-slate-500 mt-1">ประชากร: {Number(selectedHousehold.current_count || 0)} / {Number(selectedHousehold.expected_member_count || 0)} คน</p>
                    </div>
                    <button onClick={openAddMemberModal} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                      <UserPlus size={16}/> เพิ่มสมาชิก
                    </button>
                  </div>

                  {householdMembers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">ยังไม่มีสมาชิก</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 border-b">ชื่อ-สกุล</th>
                            <th className="px-4 py-3 border-b">เลขบัตร</th>
                            <th className="px-4 py-3 border-b text-center">สถานะ</th>
                            <th className="px-4 py-3 border-b text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {householdMembers.map((person) => (
                            <tr key={person.member_id} className={`hover:bg-slate-50 ${person.status !== 'ACTIVE' ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-3 font-medium text-slate-800">{person.first_name} {person.last_name}</td>
                              <td className="px-4 py-3 font-mono text-slate-500">{person.citizen_id}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${person.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                                  {person.status === 'ACTIVE' ? 'อาศัยอยู่' : 'เคยอาศัย'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center flex justify-center gap-3">
                                <button onClick={() => openEditMemberModal(person)} className="text-blue-500 hover:text-blue-700"><Edit size={16}/></button>
                                <button onClick={() => handleToggleStatus(person.member_id, person.status)} className="text-amber-500 hover:text-amber-700"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
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

      {/* Popup Modal สำหรับเพิ่ม/แก้ไขสมาชิก */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">{editingMember ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h2>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelStyle}>เลขบัตรประชาชน (ต้องไม่ซ้ำ) *</label>
                  <input required type="text" maxLength="13" className={inputStyle} value={memberForm.citizen_id} onChange={e => setMemberForm({...memberForm, citizen_id: e.target.value.replace(/\D/g, '')})} disabled={editingMember} />
                </div>
                <div>
                  <label className={labelStyle}>ชื่อจริง *</label>
                  <input required type="text" className={inputStyle} value={memberForm.first_name} onChange={e => setMemberForm({...memberForm, first_name: e.target.value})} />
                </div>
                <div>
                  <label className={labelStyle}>นามสกุล *</label>
                  <input required type="text" className={inputStyle} value={memberForm.last_name} onChange={e => setMemberForm({...memberForm, last_name: e.target.value})} />
                </div>
                <div>
                  <label className={labelStyle}>เพศ *</label>
                  <select required className={inputStyle} value={memberForm.gender} onChange={e => setMemberForm({...memberForm, gender: e.target.value})}>
                    <option value="">เลือกเพศ</option><option value="MALE">ชาย</option><option value="FEMALE">หญิง</option><option value="OTHER">LGBTQ</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>สถานะ</label>
                  <select className={inputStyle} value={memberForm.status} onChange={e => setMemberForm({...memberForm, status: e.target.value})}>
                    <option value="ACTIVE">อาศัยอยู่</option><option value="INACTIVE">เคยอาศัย</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelStyle}>วันเกิด</label>
                  <input type="date" className={inputStyle} value={memberForm.date_of_birth} onChange={e => setMemberForm({...memberForm, date_of_birth: e.target.value})} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
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