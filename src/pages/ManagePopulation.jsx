import React, { useState, useEffect } from 'react';
import { Home, Users, UserPlus, CheckCircle, AlertCircle, Plus, MapPin, Save, Loader2 } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const ManagePopulation = () => {

  const [households, setHouseholds] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  
  // State เก็บข้อมูลพื้นที่จาก API
  const [locationContext, setLocationContext] = useState(null);

  const [isLoadingHouses, setIsLoadingHouses] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newHouseholdForm, setNewHouseholdForm] = useState({ house_no: '', expected_member_count: '' });
  const [newMemberForm, setNewMemberForm] = useState({
    citizen_id: '', first_name: '', last_name: '', nickname: '', gender: '', date_of_birth: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('userData')) || {};
  const currentVillageId = currentUser.village_id || currentUser.scope_village_id;

  // 1. โหลดข้อมูลพื้นที่เต็มรูปแบบ
  const fetchLocationContext = async () => {
    if (!currentVillageId) return;
    try {
      const res = await fetch(`${API_URL}/api/location-context/${currentVillageId}`);
      const result = await res.json();
      if (result.success) setLocationContext(result.data);
    } catch (error) {
      console.error("Error fetching location context:", error);
    }
  };

  // 2. โหลดรายการบ้าน
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
    } catch (error) {
      console.error("Error fetching households:", error);
    } finally {
      setIsLoadingHouses(false);
    }
  };

  // 3. โหลดสมาชิกในบ้าน
  const fetchMembers = async (householdId) => {
    if (!householdId) return;
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`${API_URL}/api/household-members/${householdId}`);
      const result = await res.json();
      if (result.success) setHouseholdMembers(result.data);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchLocationContext(); 
    fetchHouseholds();      
  }, [currentVillageId]);

  useEffect(() => {
    if (selectedHousehold) fetchMembers(selectedHousehold.household_id);
    else setHouseholdMembers([]);
  }, [selectedHousehold]);

  // ฟังก์ชันบันทึก
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
        alert('เพิ่มบ้านสำเร็จ!');
        setNewHouseholdForm({ house_no: '', expected_member_count: '' });
        fetchHouseholds();
      } else alert('เกิดข้อผิดพลาด: ' + result.message);
    } catch (error) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if(!selectedHousehold) return;
    
    const currentCount = Number(selectedHousehold.current_count || 0);
    const expectedCount = Number(selectedHousehold.expected_member_count || 0);
    
    if (currentCount >= expectedCount && expectedCount > 0) {
      return alert("บ้านหลังนี้เพิ่มสมาชิกครบตามจำนวนที่ระบุไว้แล้ว!");
    }
    
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/household-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMemberForm, household_id: selectedHousehold.household_id })
      });
      const result = await res.json();
      if (result.success) {
        alert('เพิ่มสมาชิกสำเร็จ!');
        setNewMemberForm({ citizen_id: '', first_name: '', last_name: '', nickname: '', gender: '', date_of_birth: '' });
        fetchMembers(selectedHousehold.household_id);
        fetchHouseholds();
      } else alert('เกิดข้อผิดพลาด: ' + result.message);
    } catch (error) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsSaving(false);
    }
  };

  const getGenderLabel = (genderCode) => {
    if(genderCode === 'MALE') return 'ชาย';
    if(genderCode === 'FEMALE') return 'หญิง';
    if(genderCode === 'OTHER') return 'LGBTQ';
    return '-';
  };

  const inputStyle = "w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-all";
  const labelStyle = "block text-xs font-bold text-slate-500 mb-1";

  // ตัวแปร Fallback ป้องกันการพังตอนข้อมูลพื้นที่ยังไม่มา
  const fallbackLocation = {
    village_no: currentUser?.village_no || 'ไม่ระบุหมู่',
    village_name: currentUser?.village_name || 'ไม่ระบุหมู่บ้าน',
    tambon_name_th: currentUser?.tambon_name_th || 'ไม่ระบุตำบล',
    amphure_name_th: currentUser?.amphure_name_th || 'ไม่ระบุอำเภอ',
    province_name_th: currentUser?.province_name_th || 'ไม่ระบุจังหวัด'
  };

  const loc = locationContext || fallbackLocation;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <div style={{ flexShrink: 0, zIndex: 50, position: 'sticky', top: 0, width: '100%' }}>
        <TopNavbar />
      </div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '100px 16px 80px 16px', width: '100%' }}>
        <div className="max-w-7xl mx-auto">
          
          <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-500">
              {currentUser?.profile_image_url ? (
                <img src={currentUser.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Users size={24} className="text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">จัดการข้อมูลประชากร</h1>
              <p className="text-sm font-medium text-blue-600 mt-1 flex items-center gap-1">
                <MapPin size={14}/> 
                หมู่ที่ {loc.village_no} บ้าน{loc.village_name} 
                ต.{loc.tambon_name_th} อ.{loc.amphure_name_th} จ.{loc.province_name_th}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                  <button disabled={isSaving} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
                    {isSaving ? 'กำลังบันทึก...' : 'สร้างข้อมูลบ้าน'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                  <MapPin size={18} className="text-slate-500" /> รายการบ้านในหมู่บ้าน ({households.length})
                </h3>
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {isLoadingHouses ? (
                     <div className="text-center py-6 text-slate-400 text-sm animate-pulse">กำลังโหลดข้อมูลบ้าน...</div>
                  ) : households.length === 0 ? (
                     <div className="text-center py-6 text-slate-400 text-sm">ยังไม่มีข้อมูลบ้าน</div>
                  ) : (
                    households.map(household => {
                      const currentCount = Number(household.current_count || 0);
                      const expectedCount = Number(household.expected_member_count || 0);
                      const isComplete = expectedCount > 0 && currentCount >= expectedCount;
                      const isSelected = selectedHousehold?.household_id === household.household_id;
                      
                      return (
                        <button 
                          key={household.household_id}
                          onClick={() => setSelectedHousehold(household)}
                          className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                        >
                          <div>
                            <div className="font-bold text-slate-800 text-lg">บ้านเลขที่ {household.house_no}</div>
                            <div className="text-xs text-slate-500 mt-1">จำนวนคน: {currentCount} / {expectedCount} คน</div>
                          </div>
                          {isComplete ? (
                             <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                               <CheckCircle size={14} /> ครบถ้วน
                             </div>
                          ) : (
                             <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full whitespace-nowrap">
                               <AlertCircle size={14} /> ขาด {Math.max(0, expectedCount - currentCount)}
                             </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              {!selectedHousehold ? (
                <div className="bg-white h-full rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-10 text-slate-400 min-h-[400px]">
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
                      <div className="text-sm font-bold bg-white px-3 py-1 rounded-lg border shadow-sm flex items-center gap-2">
                        ความคืบหน้า: 
                        <span className={Number(selectedHousehold.current_count || 0) >= Number(selectedHousehold.expected_member_count || 0) ? 'text-emerald-600' : 'text-amber-600'}>
                          {Number(selectedHousehold.current_count || 0)} / {Number(selectedHousehold.expected_member_count || 0)}
                        </span>
                      </div>
                    </div>

                    {Number(selectedHousehold.current_count || 0) < Number(selectedHousehold.expected_member_count || 0) && (
                      <form onSubmit={handleAddMember} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-4">
                        <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><UserPlus size={16}/> เพิ่มประชากรใหม่</h4>
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
                          <button disabled={isSaving} type="submit" className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลคนนี้'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                      <Users size={18} className="text-slate-500" /> สมาชิกในบ้าน ({householdMembers.length} คน)
                    </h3>
                    {isLoadingMembers ? (
                      <div className="text-center py-8 text-slate-400 text-sm animate-pulse">กำลังโหลดข้อมูลสมาชิก...</div>
                    ) : householdMembers.length === 0 ? (
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
                            {householdMembers.map((person, idx) => (
                              <tr key={person.member_id || idx} className="hover:bg-slate-50">
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
      </div>
      
      <div style={{ flexShrink: 0, position: 'fixed', bottom: 0, width: '100%', zIndex: 50 }}>
        <BottomNavbar /> 
      </div>
    </div>
  );
};

export default ManagePopulation;