import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { ArrowLeft, Home, Users, UserPlus, Save, Map, Search, CheckCircle, RefreshCcw, BarChart2, ChevronDown, ChevronUp, UserMinus, FileText } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';
const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '12px' };

const AddHousehold = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [progress, setProgress] = useState({ target_houses: 0, actual_houses: 0, target_population: 0, actual_population: 0 });
  const [householdsList, setHouseholdsList] = useState([]); // รายการทะเบียนบ้าน
  const [expandedHouseId, setExpandedHouseId] = useState(null); // ควบคุมการเปิด/ปิด Card บ้าน
  const [houseMembersList, setHouseMembersList] = useState({}); // เก็บลูกบ้านของแต่ละ Card

  const [mapInstance, setMapInstance] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mapStatus, setMapStatus] = useState("กำลังดึงตำแหน่ง...");
  
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const onMapLoad = useCallback((map) => setMapInstance(map), []);
  const onMapUnmount = useCallback(() => setMapInstance(null), []);

  const [searchHouseNo, setSearchHouseNo] = useState('');
  const [currentHouse, setCurrentHouse] = useState(null); 
  const [houseData, setHouseData] = useState({ occupancy_status: 'OWNER_OCCUPIED' });
  const [isSavingHouse, setIsSavingHouse] = useState(false);

  const [existingMembers, setExistingMembers] = useState([]); 
  const [isSavingMember, setIsSavingMember] = useState(false);
  
  const initialMemberState = { 
      citizen_id: '', first_name: '', last_name: '', nickname: '', 
      date_of_birth: '', gender: '', is_head_of_household: false, 
      resident_type: 'REGISTERED', living_status: 'LIVING_HERE', 
      nationality: 'THAI', origin_location: '', is_foreigner: false 
  };
  const [newMember, setNewMember] = useState(initialMemberState);

  const currentYearBE = new Date().getFullYear() + 543;
  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  
  const dobParts = (newMember.date_of_birth || '').split('-');
  const dobY = dobParts[0] || '';
  const dobM = dobParts[1] || '';
  const dobD = dobParts[2] || '';
  const displayYearBE = dobY ? parseInt(dobY) + 543 : '';

  useEffect(() => {
     fetchProgress();
     fetchHouseholdsList();
     if(isLoaded) fetchLocation();
  }, [isLoaded]);

  const fetchProgress = async () => {
      if(!userData.village_id) return;
      try {
          const res = await fetch(`${API_URL}/api/villages/${userData.village_id}/progress`);
          const data = await res.json();
          if(data.success) setProgress(data.data);
      } catch(e) {}
  };

  const fetchHouseholdsList = async () => {
      if(!userData.village_id) return;
      try {
          const res = await fetch(`${API_URL}/api/villages/${userData.village_id}/households`);
          const data = await res.json();
          if(data.success) setHouseholdsList(data.data);
      } catch(e) {}
  };

  const fetchLocation = () => {
      setIsLocating(true); setMapStatus("กำลังค้นหาพิกัด...");
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setMarkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocating(false); },
          () => { setUserLocation({ lat: 13.736717, lng: 100.523186 }); setIsLocating(false); },
          { enableHighAccuracy: true }
        );
      } else { setIsLocating(false); }
  };

  const handleSearch = async (e) => {
      e.preventDefault();
      if(!searchHouseNo.trim()) return alert("กรุณาพิมพ์บ้านเลขที่ก่อนค้นหา");
      try {
          const res = await fetch(`${API_URL}/api/households/search?village_id=${userData.village_id}&house_no=${searchHouseNo}`);
          const data = await res.json();
          if(data.success && data.data) {
              setCurrentHouse(data.data);
              fetchMembers(data.data.household_id);
          } else {
              setCurrentHouse(null); setExistingMembers([]);
              alert("ยังไม่มีบ้านเลขที่นี้ในระบบ โปรดปักหมุดแล้วบันทึกบ้านใหม่");
          }
      } catch(e) {}
  };

  const saveHouse = async () => {
      if(!searchHouseNo || !markerPos) return alert("ข้อมูลไม่ครบ");
      setIsSavingHouse(true);
      try {
          const payload = { village_id: userData.village_id, house_no: searchHouseNo, latitude: markerPos.lat, longitude: markerPos.lng, occupancy_status: houseData.occupancy_status, created_by: userData.id };
          const res = await fetch(`${API_URL}/api/households/single`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await res.json();
          if(data.success) { setCurrentHouse(data.data); fetchProgress(); fetchHouseholdsList(); alert("บันทึกที่ตั้งบ้านสำเร็จ!"); }
      } catch(e) {}
      setIsSavingHouse(false);
  };

  const fetchMembers = async (householdId, updateList = false) => {
      try {
          const res = await fetch(`${API_URL}/api/households/${householdId}/members`);
          const data = await res.json();
          if(data.success) {
              setExistingMembers(data.data);
              if(updateList) setHouseMembersList(prev => ({ ...prev, [householdId]: data.data }));
          }
      } catch(e) {}
  };

  // 🌟 ฟังก์ชันแจ้งเปลี่ยนสถานะ (ย้ายออก / เสียชีวิต)
  const updateMemberStatus = async (memberId, statusName, householdId) => {
      if(!confirm(`ยืนยันการแจ้ง ${statusName === 'MOVED_AWAY' ? 'ย้ายออก' : 'เสียชีวิต'} ?`)) return;
      try {
          const res = await fetch(`${API_URL}/api/members/${memberId}/status`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ living_status: statusName })
          });
          const data = await res.json();
          if(data.success) {
              fetchMembers(householdId, true); // รีเฟรชข้อมูลลูกบ้านใน Card
              fetchProgress(); // อัปเดตสถิติ
          }
      } catch(e) {}
  };

  const toggleHouseCard = (householdId) => {
      if(expandedHouseId === householdId) { setExpandedHouseId(null); } 
      else { setExpandedHouseId(householdId); fetchMembers(householdId, true); }
  };

  const formatCitizenId = (val) => {
      const n = val.replace(/\D/g, ''); let f = '';
      if(n.length>0) f+=n.substring(0,1); if(n.length>1) f+='-'+n.substring(1,5);
      if(n.length>5) f+='-'+n.substring(5,10); if(n.length>10) f+='-'+n.substring(10,12);
      if(n.length>12) f+='-'+n.substring(12,13); return f;
  };

  const handleNewMemberChange = (field, value) => {
      if (field === 'citizen_id' && !newMember.is_foreigner) setNewMember({ ...newMember, [field]: formatCitizenId(value) });
      else if (field === 'is_foreigner') setNewMember({ ...newMember, is_foreigner: value, citizen_id: '', nationality: value ? 'OTHER' : 'THAI' });
      else setNewMember({ ...newMember, [field]: value });
  };

  // 🌟 แก้ไขบัคเดือน เลือกไม่ได้แล้วครับ (เติม .padStart(2, '0') ให้ตรงกับ value)
  const handleThaiDateChange = (type, value) => {
      let d = dobD, m = dobM, y = dobY;
      if (type === 'day') d = value ? value.padStart(2, '0') : '';
      if (type === 'month') m = value ? value.padStart(2, '0') : '';
      if (type === 'year') y = value ? (parseInt(value) - 543).toString() : '';
      handleNewMemberChange('date_of_birth', `${y}-${m}-${d}`);
  };

  const saveMember = async (e) => {
      e.preventDefault();
      if(!currentHouse) return;
      let finalDob = null;
      if (newMember.date_of_birth && newMember.date_of_birth !== '--') {
          if (dobY && dobM && dobD) finalDob = newMember.date_of_birth;
          else if (dobY || dobM || dobD) return alert("กรุณาเลือก วัน/เดือน/ปี เกิดให้ครบ");
      }
      setIsSavingMember(true);
      try {
          const payload = { ...newMember, date_of_birth: finalDob };
          const res = await fetch(`${API_URL}/api/households/${currentHouse.household_id}/members`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.success) {
              setNewMember(initialMemberState); fetchMembers(currentHouse.household_id); fetchProgress(); fetchHouseholdsList();
              alert("บันทึกบุคคลสำเร็จ!");
          }
      } catch(e) {}
      setIsSavingMember(false);
  };

  // ==========================================
  // 🎨 ตั้งค่า CSS Classes ล่วงหน้า เพื่อให้แก้ไขสีง่าย
  // ==========================================
  const theme = {
      // สีพื้นหลังโปร่งแสงแบบกระจก (Glassmorphism)
      glassCard: "bg-white/90 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl",
      // สีปุ่มหลัก
      btnPrimary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 transition-all rounded-xl",
      btnSuccess: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 transition-all rounded-xl",
      // หัวข้อต่างๆ
      headingText: "text-slate-800 font-bold",
      subText: "text-slate-500 text-xs",
      inputField: "w-full p-3 rounded-xl border border-slate-200 bg-white/70 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
  };

  if (!isLoaded) return <div className="text-center p-10">กำลังโหลดแผนที่...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <TopNavbar userData={userData} />
      
      <div className="pt-24 px-4 max-w-4xl mx-auto space-y-6">
        
        {/* 🌟 0. แถบความคืบหน้า (Progress) */}
        <div className={`${theme.glassCard} p-5 flex justify-between items-center`}>
            <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600"><BarChart2 size={24} /></div>
                <div>
                    <h3 className={theme.headingText}>ความคืบหน้าของพื้นที่</h3>
                    <p className={theme.subText}>ข้อมูลจากภาครัฐเทียบกับลงพื้นที่จริง</p>
                </div>
            </div>
            <div className="flex gap-6 text-right">
                <div>
                    <div className={theme.subText}>บ้าน/หลังคาเรือน</div>
                    <div className={`text-xl font-black ${progress.actual_houses >= progress.target_houses ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {progress.actual_houses} <span className="text-sm text-slate-400">/ {progress.target_houses || 0}</span>
                    </div>
                </div>
                <div>
                    <div className={theme.subText}>ประชากรรวม</div>
                    <div className={`text-xl font-black ${progress.actual_population >= progress.target_population ? 'text-emerald-500' : 'text-blue-500'}`}>
                        {progress.actual_population} <span className="text-sm text-slate-400">/ {progress.target_population || 0}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 🌟 1. ฟอร์มค้นหาและบันทึกบ้าน */}
        <div className={`${theme.glassCard} p-6 border-l-4 ${currentHouse ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
            <h3 className={`flex items-center gap-2 pb-4 border-b border-slate-100 ${theme.headingText}`}>
                <Home size={20} className={currentHouse ? "text-emerald-500" : "text-blue-500"}/> 
                1. ระบุบ้านเลขที่และสถานที่ตั้ง
            </h3>
            
            <form onSubmit={handleSearch} className="flex gap-3 mt-4">
                <input type="text" value={searchHouseNo} onChange={(e) => setSearchHouseNo(e.target.value)} placeholder="พิมพ์บ้านเลขที่ เช่น 12/3 เพื่อค้นหา" className={theme.inputField} disabled={currentHouse !== null} />
                {!currentHouse ? (
                    <button type="submit" className="px-5 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center gap-2"><Search size={18}/> ค้นหา</button>
                ) : (
                    <button type="button" onClick={() => { setCurrentHouse(null); setSearchHouseNo(''); setExistingMembers([]); }} className="px-5 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200">เปลี่ยนบ้าน</button>
                )}
            </form>

            {!currentHouse && searchHouseNo && (
                <div className="mt-4 animate-fade-in space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">สถานะการใช้สอย *</label>
                        <select value={houseData.occupancy_status} onChange={(e) => setHouseData({ occupancy_status: e.target.value })} className={theme.inputField}>
                            <option value="OWNER_OCCUPIED">อยู่อาศัยส่วนตัว (เจ้าของ)</option><option value="RENTED">บ้านเช่า / ห้องเช่า</option>
                            <option value="COMMERCIAL">ร้านค้า / เชิงพาณิชย์</option><option value="EMPTY">บ้านว่าง / ร้าง</option>
                        </select>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-blue-500">
                        <span className="flex items-center gap-1"> ซูมและคลิกปักหมุดบ้าน</span>
                        <button type="button" onClick={fetchLocation} className="flex items-center gap-1"><RefreshCcw size={14} className={isLocating ? "animate-spin":""}/> ดึง GPS</button>
                    </div>
                    <div className="border-2 border-slate-200 rounded-xl overflow-hidden relative">
                        {userLocation && (
                            <GoogleMap mapContainerStyle={mapContainerStyle} center={userLocation} zoom={18} onLoad={onMapLoad} onUnmount={onMapUnmount} onClick={(e) => setMarkerPos({lat: e.latLng.lat(), lng: e.latLng.lng()})} options={{ mapTypeId: 'hybrid', mapTypeControl: true, streetViewControl: false }}>
                                {markerPos && <Marker position={markerPos} animation={window.google.maps.Animation.DROP} draggable onDragEnd={(e) => setMarkerPos({lat: e.latLng.lat(), lng: e.latLng.lng()})} />}
                            </GoogleMap>
                        )}
                    </div>
                    <button type="button" onClick={saveHouse} disabled={isSavingHouse} className={`w-full py-4 flex justify-center items-center gap-2 ${theme.btnSuccess}`}>
                        <Save size={20}/> {isSavingHouse ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบ้านหลังนี้'}
                    </button>
                </div>
            )}
        </div>

        {/* 🌟 2. ฟอร์มเพิ่มประชากร (จะขึ้นเมื่อพบบ้าน) */}
        {currentHouse && (
            <div className={`${theme.glassCard} p-6 border-l-4 border-l-purple-500 animate-fade-in-up`}>
                <h3 className={`flex items-center gap-2 pb-4 border-b border-slate-100 ${theme.headingText}`}>
                    <Users size={20} className="text-purple-500"/> 2. รายชื่อประชากรในบ้าน {currentHouse.house_no}
                </h3>
                
                {existingMembers.length > 0 && (
                    <div className="my-4 space-y-2">
                        <div className="text-xs font-bold text-slate-500">ประชากรปัจจุบัน ({existingMembers.length} คน):</div>
                        {existingMembers.map((m, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-800">{m.first_name} {m.last_name} {m.nickname && `(${m.nickname})`}</div>
                                    <div className="text-xs text-slate-500">สถานะ: {m.living_status === 'LIVING_HERE' ? 'อยู่จริง' : m.living_status === 'MOVED_AWAY' ? 'ย้ายออก' : 'เสียชีวิต'}</div>
                                </div>
                                {m.is_head_of_household && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">⭐ เจ้าบ้าน</span>}
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 mt-4">
                    <h4 className="flex items-center gap-2 text-emerald-700 font-bold mb-4"><UserPlus size={18}/> เพิ่มประชากรใหม่เข้าบ้านนี้</h4>
                    <form onSubmit={saveMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full flex items-center gap-2">
                            <input type="checkbox" id="is_foreigner" checked={newMember.is_foreigner} onChange={(e) => handleNewMemberChange('is_foreigner', e.target.checked)} className="w-4 h-4 cursor-pointer" />
                            <label htmlFor="is_foreigner" className="text-xs font-bold text-rose-600 cursor-pointer">ชาวต่างชาติ (ไม่ต้องใช้บัตร 13 หลัก)</label>
                        </div>
                        <div className="col-span-full">
                            <label className={theme.subText}>{newMember.is_foreigner ? 'เลขพาสปอร์ต' : 'เลขบัตรประชาชน'}</label>
                            <input type="text" value={newMember.citizen_id} onChange={(e) => handleNewMemberChange('citizen_id', e.target.value)} maxLength={newMember.is_foreigner ? 50 : 17} className={theme.inputField} />
                        </div>
                        <div><label className={theme.subText}>ชื่อจริง *</label><input required type="text" value={newMember.first_name} onChange={(e) => handleNewMemberChange('first_name', e.target.value)} className={theme.inputField} /></div>
                        <div><label className={theme.subText}>นามสกุล *</label><input required type="text" value={newMember.last_name} onChange={(e) => handleNewMemberChange('last_name', e.target.value)} className={theme.inputField} /></div>
                        
                        <div className="col-span-full">
                            <label className={theme.subText}>วัน/เดือน/ปีเกิด (ไทย)</label>
                            <div className="flex gap-2">
                                <select value={dobD} onChange={(e) => handleThaiDateChange('day', e.target.value)} className={theme.inputField}>
                                    <option value="">- วัน -</option>{[...Array(31)].map((_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{i+1}</option>)}
                                </select>
                                <select value={dobM} onChange={(e) => handleThaiDateChange('month', e.target.value)} className={theme.inputField}>
                                    <option value="">- เดือน -</option>{thaiMonths.map((m, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{m}</option>)}
                                </select>
                                <select value={displayYearBE} onChange={(e) => handleThaiDateChange('year', e.target.value)} className={theme.inputField}>
                                    <option value="">- ปี พ.ศ. -</option>{[...Array(120)].map((_, i) => { const y = currentYearBE - i; return <option key={y} value={y}>{y}</option> })}
                                </select>
                            </div>
                        </div>
                        <div className="col-span-full flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                            <input type="checkbox" checked={newMember.is_head_of_household} onChange={(e) => handleNewMemberChange('is_head_of_household', e.target.checked)} className="w-4 h-4 cursor-pointer" />
                            <span className="text-sm font-bold text-slate-700">ตั้งเป็น "เจ้าบ้าน"</span>
                        </div>
                        <button type="submit" disabled={isSavingMember} className={`col-span-full py-4 flex justify-center items-center gap-2 mt-2 ${theme.btnPrimary}`}>
                            <Save size={20}/> บันทึกประชากรคนนี้
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* 🌟 3. Card ทะเบียนบ้านเลขที่ (ใหม่ล่าสุด) แสดง 10 รายการ และจัดการลูกบ้าน */}
        <div className={`${theme.glassCard} p-6 border-t-4 border-t-amber-400`}>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                <h3 className={`flex items-center gap-2 ${theme.headingText}`}><FileText size={20} className="text-amber-500"/> สมุดทะเบียนบ้าน (10 ล่าสุด)</h3>
            </div>
            
            <div className="space-y-3">
                {householdsList.map((house) => (
                    <div key={house.household_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
                        {/* 🌟 Header ของแต่ละบ้าน (กดเพื่อขยาย) */}
                        <div onClick={() => toggleHouseCard(house.household_id)} className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                            <div>
                                <div className="text-lg font-black text-slate-800">บ้านเลขที่ {house.house_no}</div>
                                <div className="text-xs text-slate-500">จำนวนผู้อยู่อาศัย: {house.total_members} คน</div>
                            </div>
                            <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                                {expandedHouseId === house.household_id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                        </div>

                        {/* 🌟 Body (ขยายออกเมื่อกด) */}
                        {expandedHouseId === house.household_id && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-fade-in">
                                
                                {/* ปุ่มแจ้งเกิด / เพิ่มคน */}
                                <button onClick={() => { setCurrentHouse(house); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="w-full py-2 bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center justify-center gap-2 text-sm">
                                    <UserPlus size={16}/> แจ้งเพิ่มคนเข้าบ้านนี้
                                </button>

                                {/* รายชื่อลูกบ้าน และปุ่มอัปเดตสถานะ */}
                                {houseMembersList[house.household_id]?.map((member, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-3">
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {member.first_name} {member.last_name} 
                                                {member.is_head_of_household && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">เจ้าบ้าน</span>}
                                            </div>
                                            <div className="text-xs text-slate-500">สถานะ: {member.living_status === 'LIVING_HERE' ? 'อยู่จริง' : member.living_status === 'MOVED_AWAY' ? 'ย้ายออกไปแล้ว' : 'เสียชีวิต'}</div>
                                        </div>
                                        
                                        {/* ปุ่ม แจ้งย้ายออก / เสียชีวิต (แสดงเฉพาะคนที่ยังมีชีวิตและอาศัยอยู่) */}
                                        {member.living_status === 'LIVING_HERE' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => updateMemberStatus(member.member_id, 'MOVED_AWAY', house.household_id)} className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs font-bold flex items-center gap-1 hover:bg-amber-100 transition-all">
                                                    <UserMinus size={14}/> แจ้งย้ายออก
                                                </button>
                                                <button onClick={() => updateMemberStatus(member.member_id, 'DECEASED', house.household_id)} className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold flex items-center gap-1 hover:bg-red-100 transition-all">
                                                    <FileText size={14}/> แจ้งเสียชีวิต
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

      </div>
      <BottomNavbar />
    </div>
  );
};

export default AddHousehold;