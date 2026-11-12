import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { ArrowLeft, Home, Users, UserPlus, MapPin, Save, Trash2, Map, RefreshCcw } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '12px' };

const AddHousehold = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mapStatus, setMapStatus] = useState("กำลังดึงตำแหน่ง...");

  const [houseData, setHouseData] = useState({
    house_no: '',
    occupancy_status: 'OWNER_OCCUPIED'
  });

  // 🌟 เพิ่มฟิลด์ใหม่: nickname, date_of_birth, gender, is_foreigner
  const [members, setMembers] = useState([
    { 
        citizen_id: '', first_name: '', last_name: '', nickname: '', 
        date_of_birth: '', gender: '', is_head_of_household: true, 
        resident_type: 'REGISTERED', living_status: 'LIVING_HERE', 
        nationality: 'THAI', origin_location: '', is_foreigner: false 
    }
  ]);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  const fetchLocation = () => {
      setIsLocating(true);
      setMapStatus("กำลังค้นหาพิกัด GPS...");
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLocation(loc);
              setMarkerPos(loc); // ปักหมุดให้เลยตอนแรก
              setIsLocating(false);
              setMapStatus("พบตำแหน่งของคุณแล้ว");
          },
          (err) => {
              console.error(err);
              setUserLocation({ lat: 13.736717, lng: 100.523186 }); // Default
              setIsLocating(false);
              setMapStatus("ไม่สามารถดึงตำแหน่งได้ (ใช้ค่าเริ่มต้น)");
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
          setIsLocating(false);
          setMapStatus("เบราว์เซอร์ไม่รองรับ GPS");
      }
  };

  useEffect(() => {
     if(isLoaded) fetchLocation();
  }, [isLoaded]);

  const handleMapClick = (e) => {
    setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  const onMapLoad = useCallback((map) => setMapInstance(map), []);
  const onMapUnmount = useCallback(() => setMapInstance(null), []);

  const handleHouseChange = (e) => {
    setHouseData({ ...houseData, [e.target.name]: e.target.value });
  };

  // 🌟 ฟังก์ชัน Format เลขบัตรประชาชนให้อัตโนมัติ (มีขีด)
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

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...members];
    
    if (field === 'is_head_of_household' && value === true) {
        newMembers.forEach(m => m.is_head_of_household = false);
    }
    
    // จัดการ Format เลขบัตร ถ้าไม่ใช่ต่างชาติ
    if (field === 'citizen_id' && !newMembers[index].is_foreigner) {
        newMembers[index][field] = formatCitizenId(value);
    } 
    // ถ้าสลับ checkbox เป็นชาวต่างชาติ ให้ล้างเลขบัตรเก่าทิ้ง
    else if (field === 'is_foreigner') {
        newMembers[index][field] = value;
        newMembers[index]['citizen_id'] = '';
        if(value) newMembers[index]['nationality'] = 'OTHER'; // เปลี่ยนสัญชาติให้ด้วย
        else newMembers[index]['nationality'] = 'THAI';
    } 
    else {
        newMembers[index][field] = value;
    }

    setMembers(newMembers);
  };

  const addMember = () => {
    setMembers([...members, { 
        citizen_id: '', first_name: '', last_name: '', nickname: '', 
        date_of_birth: '', gender: '', is_head_of_household: false, 
        resident_type: 'REGISTERED', living_status: 'LIVING_HERE', 
        nationality: 'THAI', origin_location: '', is_foreigner: false 
    }]);
  };

  const removeMember = (index) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!houseData.house_no) return alert("กรุณาระบุบ้านเลขที่");
    if (!markerPos) return alert("กรุณาปักหมุดที่ตั้งบ้านบนแผนที่");
    if (!userData.village_id) return alert("ไม่พบข้อมูลเขตปกครองของคุณ (Village ID)");

    // ตรวจสอบข้อมูลบังคับของสมาชิกแต่ละคน
    for(let i=0; i<members.length; i++){
        if(!members[i].first_name || !members[i].last_name) return alert(`กรุณาระบุชื่อ-นามสกุล ของคนที่ ${i+1}`);
        if(!members[i].is_foreigner && members[i].citizen_id.length !== 17 && members[i].citizen_id !== '') {
             return alert(`เลขบัตรประชาชนคนที่ ${i+1} ไม่ครบ 13 หลัก`);
        }
    }

    const payload = {
        village_id: userData.village_id,
        house_no: houseData.house_no,
        latitude: markerPos.lat,
        longitude: markerPos.lng,
        occupancy_status: houseData.occupancy_status,
        created_by: userData.id || userData.account_id,
        members: members
    };

    setIsSubmitting(true);
    try {
        const res = await fetch(`${API_URL}/api/households`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            alert('บันทึกข้อมูลบ้านและรายชื่อประชากรเรียบร้อยแล้ว!');
            navigate('/dashboard'); 
        } else {
            alert('ล้มเหลว: ' + data.message);
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isLoaded) return <div className="text-center p-10">กำลังโหลดแผนที่...</div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <TopNavbar userData={userData} />
      
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>เพิ่มข้อมูลบ้านและประชากร</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>บันทึกพิกัดหลังคาบ้านและลูกบ้านในพื้นที่</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* 🌟 1. ส่วนข้อมูลบ้าน */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginTop: 0, color: '#0f172a' }}>
                 <Home size={20} className="text-blue-600"/> 1. ข้อมูลสถานที่ตั้ง (บ้าน)
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>บ้านเลขที่ *</label>
                    <input required type="text" name="house_no" value={houseData.house_no} onChange={handleHouseChange} placeholder="เช่น 12/3 หรือ 45" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>สถานะการใช้สอย *</label>
                    <select name="occupancy_status" value={houseData.occupancy_status} onChange={handleHouseChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}>
                        <option value="OWNER_OCCUPIED">อยู่อาศัยส่วนตัว (เจ้าของ)</option>
                        <option value="RENTED">บ้านเช่า / ห้องเช่า</option>
                        <option value="COMMERCIAL">ร้านค้า / เชิงพาณิชย์</option>
                        <option value="EMPTY">บ้านว่าง / ร้าง</option>
                    </select>
                </div>
             </div>

             <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>
                     ซูมและคลิกปักหมุดที่ "หลังคาบ้าน"
                </div>
                <button type="button" onClick={fetchLocation} disabled={isLocating} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff' }}>
                    <RefreshCcw size={14} className={isLocating ? "animate-spin" : ""} /> {isLocating ? mapStatus : 'ดึงตำแหน่งปัจจุบัน'}
                </button>
             </div>

             <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                {userLocation ? (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={userLocation}
                        zoom={18}
                        onLoad={onMapLoad}
                        onUnmount={onMapUnmount}
                        onClick={handleMapClick}
                        options={{ mapTypeId: 'hybrid', mapTypeControl: true, streetViewControl: false }}
                    >
                        {markerPos && <Marker position={markerPos} animation={window.google.maps.Animation.DROP} draggable={true} onDragEnd={handleMapClick} />}
                    </GoogleMap>
                ) : (
                    <div style={{height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{mapStatus}</div>
                )}
                
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 15px', borderTop: '1px solid #e2e8f0' }}>
                    <MapPin size={16} color={markerPos ? "#10b981" : "#ef4444"} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}/>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: markerPos ? '#10b981' : '#ef4444' }}>
                        {markerPos ? `ปักหมุดแล้ว: ${markerPos.lat.toFixed(5)}, ${markerPos.lng.toFixed(5)}` : 'กรุณาคลิกบนแผนที่เพื่อปักหมุดบ้าน'}
                    </span>
                </div>
             </div>
          </div>

          {/* 🌟 2. ส่วนข้อมูลประชากร */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#0f172a' }}>
                    <Users size={20} className="text-purple-600"/> 2. รายชื่อผู้อยู่อาศัย ({members.length} คน)
                </h3>
                <button type="button" onClick={addMember} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    <UserPlus size={16} /> เพิ่มคน
                </button>
             </div>

             {members.map((member, index) => (
                <div key={index} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', marginBottom: '15px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ backgroundColor: member.is_head_of_household ? '#dbeafe' : '#f1f5f9', color: member.is_head_of_household ? '#1e40af' : '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                            {member.is_head_of_household ? '⭐ เจ้าบ้าน' : `คนที่ ${index + 1}`}
                        </span>
                        {members.length > 1 && (
                            <button type="button" onClick={() => removeMember(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input type="checkbox" id={`foreigner-${index}`} checked={member.is_foreigner} onChange={(e) => handleMemberChange(index, 'is_foreigner', e.target.checked)} style={{ cursor: 'pointer' }} />
                           <label htmlFor={`foreigner-${index}`} style={{ fontSize: '13px', fontWeight: 'bold', color: '#e11d48', cursor: 'pointer' }}>ชาวต่างชาติ (ไม่ต้องใช้บัตรประชาชน 13 หลัก)</label>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                {member.is_foreigner ? 'เลขพาสปอร์ต / บัตรต่างด้าว (ตัวเลือก)' : 'เลขประจำตัวประชาชน 13 หลัก (ตัวเลือก)'}
                            </label>
                            <input 
                                type="text" 
                                value={member.citizen_id} 
                                onChange={(e) => handleMemberChange(index, 'citizen_id', e.target.value)} 
                                maxLength={member.is_foreigner ? 50 : 17} // ถ้าไทยจำกัด 17 ตัว (รวมขีด)
                                placeholder={member.is_foreigner ? "ระบุเลขพาสปอร์ต" : "x-xxxx-xxxxx-xx-x (พิมพ์ตัวเลขได้เลย)"} 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ชื่อจริง *</label>
                            <input required type="text" value={member.first_name} onChange={(e) => handleMemberChange(index, 'first_name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>นามสกุล *</label>
                            <input required type="text" value={member.last_name} onChange={(e) => handleMemberChange(index, 'last_name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        </div>

                        {/* 🌟 ฟิลด์ใหม่ที่เพิ่มมา */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ชื่อเล่น (ตัวเลือก)</label>
                            <input type="text" value={member.nickname} onChange={(e) => handleMemberChange(index, 'nickname', e.target.value)} placeholder="เช่น ยายสม" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>เพศ (ตัวเลือก)</label>
                            <select value={member.gender} onChange={(e) => handleMemberChange(index, 'gender', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                <option value="">- เลือกเพศ -</option>
                                <option value="MALE">ชาย</option>
                                <option value="FEMALE">หญิง</option>
                                <option value="OTHER">อื่นๆ</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>วัน/เดือน/ปีเกิด (ตัวเลือก)</label>
                            <input type="date" value={member.date_of_birth} onChange={(e) => handleMemberChange(index, 'date_of_birth', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ประเภทการอยู่อาศัย *</label>
                            <select value={member.resident_type} onChange={(e) => handleMemberChange(index, 'resident_type', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                <option value="REGISTERED">มีชื่อในทะเบียนบ้าน</option>
                                <option value="UNREGISTERED">ประชากรแฝง / เช่าอยู่</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>สถานะปัจจุบัน *</label>
                            <select value={member.living_status} onChange={(e) => handleMemberChange(index, 'living_status', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                <option value="LIVING_HERE">อาศัยอยู่จริง</option>
                                <option value="MOVED_AWAY">ย้ายออก / ไปทำงานที่อื่น</option>
                                <option value="DECEASED">เสียชีวิต</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>สัญชาติ *</label>
                            <select value={member.nationality} onChange={(e) => handleMemberChange(index, 'nationality', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                <option value="THAI">ไทย</option>
                                <option value="MYANMAR">เมียนมา</option>
                                <option value="LAO">ลาว</option>
                                <option value="CAMBODIAN">กัมพูชา</option>
                                <option value="OTHER">อื่นๆ</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ตั้งเป็นเจ้าบ้าน</label>
                            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center' }}>
                                <input type="checkbox" checked={member.is_head_of_household} onChange={(e) => handleMemberChange(index, 'is_head_of_household', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                <span style={{ fontSize: '13px', marginLeft: '8px' }}>ใช่ (เจ้าบ้าน)</span>
                            </div>
                        </div>

                        {member.resident_type === 'UNREGISTERED' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>ภูมิลำเนาเดิม / มาจากที่ใด (ตัวเลือก)</label>
                                <input type="text" value={member.origin_location} onChange={(e) => handleMemberChange(index, 'origin_location', e.target.value)} placeholder="เช่น จ.ขอนแก่น หรือ แขวงสะหวันนะเขต" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                        )}
                    </div>
                </div>
             ))}
          </div>

          <button type="submit" disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', marginTop: '25px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)' }}>
              <Save size={20} /> {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลเข้าสู่ระบบ'}
          </button>
        </form>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default AddHousehold;