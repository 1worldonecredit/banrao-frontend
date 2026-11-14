import React, { useState } from 'react';
import { Home, Users, UserPlus, CheckCircle, AlertCircle, Plus, MapPin, Save } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const ManagePopulation = () => {
  // ==========================================
  // State จำลองข้อมูล (Mock Data) อิงตาม Schema ของคุณ
  // ==========================================
  const [households, setHouseholds] = useState([
    { household_id: 'uuid-1', house_no: '12/3', expected_member_count: 4, current_count: 4 },
    { household_id: 'uuid-2', house_no: '45/6', expected_member_count: 3, current_count: 1 },
  ]);

  const [householdMembers, setHouseholdMembers] = useState([
    { member_id: 'm-1', household_id: 'uuid-1', first_name: 'สมชาย', last_name: 'ใจดี', nickname: 'ชาย', gender: 'MALE', citizen_id: '1234567890123' },
    { member_id: 'm-2', household_id: 'uuid-1', first_name: 'สมหญิง', last_name: 'ใจดี', nickname: 'หญิง', gender: 'FEMALE', citizen_id: '1234567890124' },
    { member_id: 'm-3', household_id: 'uuid-1', first_name: 'สมศักดิ์', last_name: 'ใจดี', nickname: 'ศักดิ์', gender: 'MALE', citizen_id: '1234567890125' },
    { member_id: 'm-4', household_id: 'uuid-1', first_name: 'สมฤดี', last_name: 'ใจดี', nickname: 'ดี', gender: 'OTHER', citizen_id: '1234567890126' },
    { member_id: 'm-5', household_id: 'uuid-2', first_name: 'วันเฉลิม', last_name: 'รักชาติ', nickname: 'วัน', gender: 'MALE', citizen_id: '9876543210987' },
  ]);

  // ==========================================
  // State สำหรับควบคุมหน้าจอ
  // ==========================================
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [newHouseholdForm, setNewHouseholdForm] = useState({ house_no: '', expected_member_count: '' });
  const [newMemberForm, setNewMemberForm] = useState({
    citizen_id: '', first_name: '', last_name: '', nickname: '', gender: '', date_of_birth: ''
  });

  // ==========================================
  // ฟังก์ชันการทำงาน
  // ==========================================
  const handleAddHousehold = (e) => {
    e.preventDefault();
    if(!newHouseholdForm.house_no || !newHouseholdForm.expected_member_count) return;
    
    const newHousehold = {
      household_id: `temp-${Date.now()}`,
      house_no: newHouseholdForm.house_no,
      expected_member_count: parseInt(newHouseholdForm.expected_member_count),
      current_count: 0
    };
    setHouseholds([newHousehold, ...households]);
    setNewHouseholdForm({ house_no: '', expected_member_count: '' });
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if(!selectedHousehold) return;

    if (selectedHousehold.current_count >= selectedHousehold.expected_member_count) {
      return alert("บ้านหลังนี้เพิ่มสมาชิกครบตามจำนวนที่ระบุไว้แล้ว!");
    }

    const newMember = { ...newMemberForm, member_id: `temp-m-${Date.now()}`, household_id: selectedHousehold.household_id };
    setHouseholdMembers([...householdMembers, newMember]);
    
    const updatedHouseholds = households.map(h => 
      h.household_id === selectedHousehold.household_id ? { ...h, current_count: h.current_count + 1 } : h
    );
    setHouseholds(updatedHouseholds);
    setSelectedHousehold(updatedHouseholds.find(h => h.household_id === selectedHousehold.household_id));
    
    setNewMemberForm({ citizen_id: '', first_name: '', last_name: '', nickname: '', gender: '', date_of_birth: '' });
  };

  const currentMembers = householdMembers.filter(r => r.household_id === selectedHousehold?.household_id);

  // Helper ฟังก์ชันแปลงเพศภาษาอังกฤษเป็นไทยสำหรับแสดงผล
  const getGenderLabel = (genderCode) => {
    if(genderCode === 'MALE') return 'ชาย';
    if(genderCode === 'FEMALE') return 'หญิง';
    if(genderCode === 'OTHER') return 'LGBTQ';
    return '-';
  };

  const inputStyle = "w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm";
  const labelStyle = "block text-xs font-bold text-slate-500 mb-1";

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar />
      
      <div className="max-w-7xl mx-auto p-4 pt-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shadow-sm"><Users size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">จัดการข้อมูลประชากร</h1>
            <p className="text-sm font-medium text-slate-600">หมู่ที่ 1 บ้านดงมูลเหล็ก</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ==================== ฝั่งซ้าย: จัดการบ้าน ==================== */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Home size={18} className="text-blue-500" /> เพิ่มข้อมูลบ้าน
              </h3>
              <form onSubmit={handleAddHousehold} className="flex flex-col gap-3">
                <div>
                  <label className={labelStyle}>บ้านเลขที่ *</label>
                  <input required type="text" placeholder="เช่น 123/4" className={inputStyle} value={newHouseholdForm.house_no} onChange={e => setNewHouseholdForm({...newHouseholdForm, house_no: e.target.value})} />
                </div>
                <div>
                  <label className={labelStyle}>จำนวนคนตามทะเบียนบ้าน *</label>
                  <input required type="number" min="1" placeholder="ระบุจำนวนคน" className={inputStyle} value={newHouseholdForm.expected_member_count} onChange={e => setNewHouseholdForm({...newHouseholdForm, expected_member_count: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-2 flex items-center justify-center gap-2">
                  <Plus size={18} /> สร้างข้อมูลบ้าน
                </button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <MapPin size={18} className="text-slate-500" /> รายการบ้านในหมู่บ้าน ({households.length})
              </h3>
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
                {households.map(household => {
                  const isComplete = household.current_count === household.expected_member_count;
                  const isSelected = selectedHousehold?.household_id === household.household_id;
                  
                  return (
                    <button 
                      key={household.household_id}
                      onClick={() => setSelectedHousehold(household)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between
                        ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-lg">บ้านเลขที่ {household.house_no}</div>
                        <div className="text-xs text-slate-500 mt-1">จำนวนคน: {household.current_count} / {household.expected_member_count} คน</div>
                      </div>
                      
                      {isComplete ? (
                         <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                           <CheckCircle size={14} /> ครบถ้วน
                         </div>
                      ) : (
                         <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                           <AlertCircle size={14} /> ขาด {household.expected_member_count - household.current_count}
                         </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ==================== ฝั่งขวา: จัดการสมาชิกในบ้าน ==================== */}
          <div className="lg:col-span-8">
            {!selectedHousehold ? (
              <div className="bg-white/60 h-full rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-10 text-slate-400">
                <Home size={48} className="mb-4 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-600">กรุณาเลือกบ้านเลขที่จากเมนูด้านซ้าย</h2>
                <p className="text-sm mt-2">เพื่อดูหรือเพิ่มข้อมูลรายชื่อประชากรในบ้าน</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 bg-gradient-to-r from-white to-blue-50">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-slate-800">
                      รายละเอียดบ้านเลขที่ <span className="text-blue-600">{selectedHousehold.house_no}</span>
                    </h2>
                    <div className="text-sm font-bold bg-white px-3 py-1 rounded-lg border shadow-sm">
                      ความคืบหน้า: <span className={selectedHousehold.current_count === selectedHousehold.expected_member_count ? 'text-emerald-600' : 'text-amber-600'}>{selectedHousehold.current_count} / {selectedHousehold.expected_member_count}</span>
                    </div>
                  </div>

                  {selectedHousehold.current_count < selectedHousehold.expected_member_count && (
                    <form onSubmit={handleAddMember} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-4">
                      <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><UserPlus size={16}/> เพิ่มสมาชิกในบ้าน</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="md:col-span-3">
                          <label className={labelStyle}>เลขบัตรประชาชน</label>
                          <input required type="text" maxLength="13" placeholder="เลข 13 หลัก" className={inputStyle} value={newMemberForm.citizen_id} onChange={e => setNewMemberForm({...newMemberForm, citizen_id: e.target.value.replace(/\D/g, '')})} />
                        </div>
                        <div>
                          <label className={labelStyle}>ชื่อจริง *</label>
                          <input required type="text" placeholder="ไม่ต้องใส่คำนำหน้า" className={inputStyle} value={newMemberForm.first_name} onChange={e => setNewMemberForm({...newMemberForm, first_name: e.target.value})} />
                        </div>
                        <div>
                          <label className={labelStyle}>นามสกุล *</label>
                          <input required type="text" className={inputStyle} value={newMemberForm.last_name} onChange={e => setNewMemberForm({...newMemberForm, last_name: e.target.value})} />
                        </div>
                        <div>
                          <label className={labelStyle}>ชื่อเล่น / ชื่อเรียก</label>
                          <input type="text" className={inputStyle} value={newMemberForm.nickname} onChange={e => setNewMemberForm({...newMemberForm, nickname: e.target.value})} />
                        </div>

                        <div>
                          <label className={labelStyle}>เพศ *</label>
                          <select required className={inputStyle} value={newMemberForm.gender} onChange={e => setNewMemberForm({...newMemberForm, gender: e.target.value})}>
                            <option value="">-- เลือกเพศ --</option>
                            <option value="MALE">ชาย</option>
                            <option value="FEMALE">หญิง</option>
                            <option value="OTHER">LGBTQ</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelStyle}>วันเดือนปีเกิด *</label>
                          <input required type="date" className={inputStyle} value={newMemberForm.date_of_birth} onChange={e => setNewMemberForm({...newMemberForm, date_of_birth: e.target.value})} />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 flex items-center gap-2">
                          <Save size={16} /> บันทึกข้อมูลคนนี้
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                    <Users size={18} className="text-slate-500" /> สมาชิกในบ้าน ({currentMembers.length} คน)
                  </h3>
                  
                  {currentMembers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">ยังไม่มีรายชื่อสมาชิกในบ้านนี้</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 border-b">เลขบัตร ปชช.</th>
                            <th className="px-4 py-3 border-b">ชื่อ-นามสกุล (ชื่อเล่น)</th>
                            <th className="px-4 py-3 border-b">เพศ</th>
                            <th className="px-4 py-3 border-b">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentMembers.map((person, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-slate-500">{person.citizen_id}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {person.first_name} {person.last_name} {person.nickname && <span className="text-slate-400 font-normal">({person.nickname})</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${person.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : person.gender === 'FEMALE' ? 'bg-pink-100 text-pink-600' : 'bg-purple-100 text-purple-600'}`}>
                                  {getGenderLabel(person.gender)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button className="text-blue-500 hover:underline text-xs font-bold">แก้ไข</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
      
      <div style={{ flexShrink: 0, position: 'fixed', bottom: 0, width: '100%', zIndex: 50 }}>
        <BottomNavbar /> 
      </div>
    </div>
  );
};

export default ManagePopulation;