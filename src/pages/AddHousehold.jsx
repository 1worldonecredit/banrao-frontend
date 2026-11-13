import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { ArrowLeft, Home, Users, UserPlus, MapPin, Save, Map, Search, CheckCircle, RefreshCcw, BarChart2, Trash2 } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '12px' };

const AddHousehold = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [progress, setProgress] = useState({ target_houses: 0, actual_houses: 0, target_population: 0, actual_population: 0 });

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

  // 🌟 ข้อมูลสำหรับ Dropdown วันเกิดภาษาไทย
  const currentYearBE = new Date().getFullYear() + 543;
  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  
  // แกะค่าวันเดือนปีเดิมออกมาเพื่อแสดงผล
  const dobParts = (newMember.date_of_birth || '').split('-');
  const dobY = dobParts[0] || '';
  const dobM = dobParts[1] || '';
  const dobD = dobParts[2] || '';
  const displayYearBE = dobY ? parseInt(dobY) + 543 : '';

  useEffect(() => {
     fetchProgress();
     if(isLoaded) fetchLocation();
  }, [isLoaded]);

  const fetchProgress = async () => {
      if(!userData.village_id) return;
      try {
          const res = await fetch(`${API_URL}/api/villages/${userData.village_id}/progress`);
          const data = await res.json();
          if(data.success) setProgress(data.data);
      } catch(e) { console.error(e); }
  };

  const fetchLocation = () => {
      setIsLocating(true); setMapStatus("กำลังค้นหาพิกัด GPS...");
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLocation(loc); setMarkerPos(loc); 
              setIsLocating(false); setMapStatus("พบตำแหน่งของคุณแล้ว");
          },
          () => {
              setUserLocation({ lat: 13.736717, lng: 100.523186 }); 
              setIsLocating(false); setMapStatus("ไม่สามารถดึงตำแหน่งได้ (ใช้ค่าเริ่มต้น)");
          },
          { enableHighAccuracy: true, timeout: 5000 }
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
              alert("พบบ้านเลขที่นี้แล้ว! คุณสามารถเพิ่มรายชื่อประชากรต่อได้เลย");
          } else {
              setCurrentHouse(null);
              setExistingMembers([]);
              alert("ยังไม่มีบ้านเลขที่นี้ในระบบ โปรดปักหมุดแล้วกด 'บันทึกข้อมูลบ้าน'");
          }
      } catch(e) { alert("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว"); }
  };

  const saveHouse = async () => {
      if(!searchHouseNo) return alert("กรุณาระบุบ้านเลขที่");
      if(!markerPos) return alert("กรุณาปักหมุดบนแผนที่");
      
      setIsSavingHouse(true);
      try {
          const payload = {
              village_id: userData.village_id, house_no: searchHouseNo,
              latitude: markerPos.lat, longitude: markerPos.lng,
              occupancy_status: houseData.occupancy_status, created_by: userData.id
          };
          const res = await fetch(`${API_URL}/api/households/single`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.success) {
              setCurrentHouse(data.data); 
              fetchProgress(); 
              alert("บันทึกที่ตั้งบ้านสำเร็จ! กรุณาเพิ่มรายชื่อประชากรด้านล่าง");
          } else { alert("ล้มเหลว: " + data.message); }
      } catch(e) { alert("เกิดข้อผิดพลาด"); }
      setIsSavingHouse(false);
  };

  const fetchMembers = async (householdId) => {
      try {
          const res = await fetch(`${API_URL}/api/households/${householdId}/members`);
          const data = await res.json();
          if(data.success) setExistingMembers(data.data);
      } catch(e) {}
  };

  const formatCitizenId = (value) => {
      const numbers = value.replace(/\D/g, '');
      let formatted = '';
      if (numbers.length > 0) formatted += numbers.substring(0, 1);
      if (numbers.length > 1) formatted += '-' + numbers.substring(1, 5);
      if (numbers.length > 5) formatted += '-' + numbers.substring(5, 10);
      if (numbers.length > 10) formatted += '-' + numbers.substring(10, 12);
      if (numbers.length > 12) formatted += '-' + numbers.substring(12, 13);
      return formatted;
  };

  const handleNewMemberChange = (field, value) => {
      if (field === 'citizen_id' && !newMember.is_foreigner) {
          setNewMember({ ...newMember, [field]: formatCitizenId(value) });
      } else if (field === 'is_foreigner') {
          setNewMember({ 
              ...newMember, is_foreigner: value, citizen_id: '', 
              nationality: value ? 'OTHER' : 'THAI' 
          });
      } else {
          setNewMember({ ...newMember, [field]: value });
      }
  };

  // 🌟 ฟังก์ชันจัดการวันที่ไทย
  const handleThaiDateChange = (type, value) => {
      let d = dobD, m = dobM, y = dobY;
      
      if (type === 'day') d = value ? value.padStart(2, '0') : '';
      if (type === 'month') m = value ? value.padStart(2, '0') : '';
      if (type === 'year') y = value ? (parseInt(value) - 543).toString() : '';

      handleNewMemberChange('date_of_birth', `${y}-${m}-${d}`);
  };

  const saveMember = async (e) => {
      e.preventDefault();
      if(!currentHouse) return alert("กรุณาบันทึกบ้านก่อน");
      if(!newMember.is_foreigner && newMember.citizen_id && newMember.citizen_id.length !== 17 && newMember.citizen_id !== '') {
          return alert("เลขบัตรประชาชนต้องครบ 13 หลัก (หรือเว้นว่างไว้ถ้าไม่มี)");
      }

      // 🌟 ตรวจสอบว่ากรอกวันเกิดครบไหม
      let finalDob = null;
      if (newMember.date_of_birth && newMember.date_of_birth !== '--') {
          if (dobY && dobM && dobD) {
              finalDob = newMember.date_of_birth;
          } else if (dobY || dobM || dobD) {
              return alert("กรุณาเลือก วัน/เดือน/ปีเกิด ให้ครบถ้วน (หรือปล่อยว่างไว้ทั้ง 3 ช่อง)");
          }
      }

      setIsSavingMember(true);
      try {
          const payload = { ...newMember, date_of_birth: finalDob };
          const res = await fetch(`${API_URL}/api/households/${currentHouse.household_id}/members`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.success) {
              setNewMember(initialMemberState); 
              fetchMembers(currentHouse.household_id); 
              fetchProgress(); 
              alert("บันทึกบุคคลสำเร็จ! สามารถพิมพ์เพิ่มคนต่อไปได้ทันที");
          } else { alert("ล้มเหลว: " + data.message); }
      } catch(e) { alert("เกิดข้อผิดพลาด"); }
      setIsSavingMember(false);
  };

  if (!isLoaded) return <div className="text-center p-10">กำลังโหลดแผนที่...</div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <TopNavbar userData={userData} />
      
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '900px', margin: '0 auto' }}>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '50%', color: '#3b82f6' }}>
                    <BarChart2 size={24} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>ความคืบหน้าของพื้นที่</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>เปรียบเทียบข้อมูลจากภาครัฐและข้อมูลจริงที่ลงพื้นที่</p>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
                <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>บ้าน/หลังคาเรือน</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: progress.actual_houses >= progress.target_houses ? '#10b981' : '#f59e0b' }}>
                        {progress.actual_houses} <span style={{fontSize:'12px', color:'#94a3b8'}}>/ {progress.target_houses || 0}</span>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ประชากรทั้งหมด</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: progress.actual_population >= progress.target_population ? '#10b981' : '#3b82f6' }}>
                        {progress.actual_population} <span style={{fontSize:'12px', color:'#94a3b8'}}>/ {progress.target_population || 0}</span>
                    </div>
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: currentHouse ? '2px solid #10b981' : '1px solid #e2e8f0' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginTop: 0, color: '#0f172a' }}>
                    <Home size={20} className={currentHouse ? "text-emerald-500" : "text-blue-600"}/> 1. ระบุบ้านเลขที่และสถานที่ตั้ง
                    {currentHouse && <span style={{ backgroundColor: '#d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', marginLeft: 'auto' }}><CheckCircle size={14} style={{display:'inline', marginBottom:'2px'}}/> บันทึกบ้านแล้ว</span>}
                </h3>
                
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input type="text" value={searchHouseNo} onChange={(e) => setSearchHouseNo(e.target.value)} placeholder="พิมพ์บ้านเลขที่ เช่น 12/3 เพื่อค้นหาหรือเพิ่มใหม่" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 'bold' }} disabled={currentHouse !== null} />
                    {!currentHouse ? (
                        <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Search size={18}/> ค้นหา
                        </button>
                    ) : (
                        <button type="button" onClick={() => { setCurrentHouse(null); setSearchHouseNo(''); setExistingMembers([]); }} style={{ padding: '12px 20px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>เปลี่ยนบ้าน</button>
                    )}
                </form>

                {!currentHouse && searchHouseNo && (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>สถานะการใช้สอย *</label>
                            <select value={houseData.occupancy_status} onChange={(e) => setHouseData({ occupancy_status: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                <option value="OWNER_OCCUPIED">อยู่อาศัยส่วนตัว (เจ้าของ)</option>
                                <option value="RENTED">บ้านเช่า / ห้องเช่า</option>
                                <option value="COMMERCIAL">ร้านค้า / เชิงพาณิชย์</option>
                                <option value="EMPTY">บ้านว่าง / ร้าง</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>
                                 ซูมและคลิกปักหมุดที่ "หลังคาบ้าน"
                            </div>
                            <button type="button" onClick={fetchLocation} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <RefreshCcw size={14} className={isLocating ? "animate-spin" : ""} /> {isLocating ? 'กำลังดึง...' : 'ดึงพิกัด GPS'}
                            </button>
                        </div>

                        <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', position: 'relative', marginBottom: '20px' }}>
                            {userLocation && (
                                <GoogleMap mapContainerStyle={mapContainerStyle} center={userLocation} zoom={18} onLoad={onMapLoad} onUnmount={onMapUnmount} onClick={(e) => setMarkerPos({lat: e.latLng.lat(), lng: e.latLng.lng()})} options={{ mapTypeId: 'hybrid', mapTypeControl: true, streetViewControl: false }}>
                                    {markerPos && <Marker position={markerPos} animation={window.google.maps.Animation.DROP} draggable={true} onDragEnd={(e) => setMarkerPos({lat: e.latLng.lat(), lng: e.latLng.lng()})} />}
                                </GoogleMap>
                            )}
                        </div>

                        <button type="button" onClick={saveHouse} disabled={isSavingHouse} style={{ width: '100%', padding: '14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                            <Save size={20}/> {isSavingHouse ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบ้านหลังนี้'}
                        </button>
                    </div>
                )}
            </div>

            {currentHouse && (
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }} className="animate-fade-in-up">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginTop: 0, color: '#0f172a' }}>
                        <Users size={20} className="text-purple-600"/> 2. รายชื่อประชากรในบ้านเลขที่ {currentHouse.house_no}
                    </h3>
                    
                    {existingMembers.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>ประชากรที่บันทึกแล้ว ({existingMembers.length} คน):</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {existingMembers.map((m, idx) => (
                                    <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{m.first_name} {m.last_name} {m.nickname && `(${m.nickname})`}</span>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>บัตร: {m.citizen_id || '-'} | สถานะ: {m.resident_type === 'REGISTERED' ? 'คนในพื้นที่' : 'คนนอก/แฝง'}</div>
                                        </div>
                                        {m.is_head_of_household && <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>⭐ เจ้าบ้าน</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '15px' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}><UserPlus size={18}/> เพิ่มประชากรใหม่เข้าบ้านนี้</h4>
                        <form onSubmit={saveMember}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                
                                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                   <input type="checkbox" id="is_foreigner" checked={newMember.is_foreigner} onChange={(e) => handleNewMemberChange('is_foreigner', e.target.checked)} style={{ cursor: 'pointer' }} />
                                   <label htmlFor="is_foreigner" style={{ fontSize: '13px', fontWeight: 'bold', color: '#e11d48', cursor: 'pointer' }}>ชาวต่างชาติ (ไม่ต้องใช้บัตร 13 หลัก)</label>
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>{newMember.is_foreigner ? 'เลขพาสปอร์ต (ตัวเลือก)' : 'เลขบัตรประชาชน (ตัวเลือก)'}</label>
                                    <input type="text" value={newMember.citizen_id} onChange={(e) => handleNewMemberChange('citizen_id', e.target.value)} maxLength={newMember.is_foreigner ? 50 : 17} placeholder={newMember.is_foreigner ? "" : "x-xxxx-xxxxx-xx-x"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ชื่อจริง *</label><input required type="text" value={newMember.first_name} onChange={(e) => handleNewMemberChange('first_name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>นามสกุล *</label><input required type="text" value={newMember.last_name} onChange={(e) => handleNewMemberChange('last_name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ชื่อเล่น (ตัวเลือก)</label><input type="text" value={newMember.nickname} onChange={(e) => handleNewMemberChange('nickname', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>เพศ (ตัวเลือก)</label>
                                    <select value={newMember.gender} onChange={(e) => handleNewMemberChange('gender', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                        <option value="">- เลือก -</option><option value="MALE">ชาย</option><option value="FEMALE">หญิง</option><option value="OTHER">อื่นๆ</option>
                                    </select>
                                </div>
                                
                                {/* 🌟 กล่องเลือกวันเกิดภาษาไทย 3 ช่อง */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>วัน/เดือน/ปีเกิด (ตัวเลือก)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select value={dobD} onChange={(e) => handleThaiDateChange('day', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                            <option value="">- วัน -</option>
                                            {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                        </select>
                                        <select value={dobM} onChange={(e) => handleThaiDateChange('month', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                            <option value="">- เดือน -</option>
                                            {thaiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                                        </select>
                                        <select value={displayYearBE} onChange={(e) => handleThaiDateChange('year', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                            <option value="">- ปี พ.ศ. -</option>
                                            {[...Array(120)].map((_, i) => {
                                                const year = currentYearBE - i;
                                                return <option key={year} value={year}>{year}</option>
                                            })}
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ประเภทผู้อยู่อาศัย *</label>
                                    <select value={newMember.resident_type} onChange={(e) => handleNewMemberChange('resident_type', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                        <option value="REGISTERED">มีชื่อในทะเบียนบ้าน</option><option value="UNREGISTERED">ประชากรแฝง / เช่าอยู่</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ตั้งเป็นเจ้าบ้าน</label>
                                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center' }}>
                                        <input type="checkbox" checked={newMember.is_head_of_household} onChange={(e) => handleNewMemberChange('is_head_of_household', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        <span style={{ fontSize: '13px', marginLeft: '8px' }}>ใช่ (เจ้าบ้าน)</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="submit" disabled={isSavingMember} style={{ width: '100%', padding: '14px', marginTop: '20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <Save size={20}/> {isSavingMember ? 'กำลังบันทึก...' : 'บันทึกประชากรคนนี้'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default AddHousehold;