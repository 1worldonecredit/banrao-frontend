import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { MapPin, Save, User, Map as MapIcon, Key, ChevronLeft, Navigation, Home, AlertTriangle, RefreshCcw } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';
const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '12px' };

const RegisterVillage = () => {
    const navigate = useNavigate();
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State แผนที่
    const [mapInstance, setMapInstance] = useState(null);
    const [markerPos, setMarkerPos] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('กำลังค้นหาตำแหน่งของคุณ...');
    const [isLocating, setIsLocating] = useState(true);

    // 🌟 แก้ไข: ตั้งค่า options ให้เหมือนกับหน้า AddHousehold.jsx
    const { isLoaded, loadError } = useJsApiLoader({ 
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places', 'geometry'] // ถ้า AddHousehold ไม่ใช้ libraries ให้เอาออกทั้งสองที่
    });

    const onMapLoad = useCallback((map) => setMapInstance(map), []);
    const onMapUnmount = useCallback(() => setMapInstance(null), []);

    // State ข้อมูลฟอร์ม
    const [formData, setFormData] = useState({
        village_no: '', village_name: '', province: '', district: '', sub_district: '',
        citizen_id: '', first_name: '', last_name: '', nickname: '', phone_number: '', password: '', confirm_password: ''
    });

    const fetchCurrentLocation = () => {
        setIsLocating(true);
        setLocationStatus('กำลังดึงตำแหน่ง GPS...');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setUserLocation(pos);
                    setMarkerPos(pos);
                    setLocationStatus('พบตำแหน่งของคุณแล้ว');
                    setIsLocating(false);
                    if (isLoaded) reverseGeocode(pos);
                },
                (error) => {
                    console.error("Geolocation Error:", error);
                    setLocationStatus('ไม่สามารถดึงตำแหน่งได้ ระบบจะใช้ตำแหน่งเริ่มต้น');
                    setIsLocating(false);
                    const defaultPos = { lat: 13.7649, lng: 100.5383 };
                    setUserLocation(defaultPos);
                    setMarkerPos(defaultPos);
                    if (isLoaded) reverseGeocode(defaultPos);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocationStatus('เบราว์เซอร์ไม่รองรับ GPS');
            setIsLocating(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            fetchCurrentLocation();
        }
    }, [isLoaded]);

    const reverseGeocode = (pos) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: pos, language: 'th' }, (results, status) => {
            if (status === 'OK' && results[0]) {
                extractAddressComponents(results[0].address_components);
            }
        });
    };

    const extractAddressComponents = (components) => {
        let newAddress = { ...formData };
        components.forEach(component => {
            const types = component.types;
            if (types.includes('route') || types.includes('neighborhood')) {
                 if(component.long_name.includes('หมู่')) newAddress.village_no = component.long_name.replace('หมู่ที่ ', '').replace('หมู่ ', '');
                 else newAddress.village_name = component.long_name;
            }
            if (types.includes('sublocality_level_2')) newAddress.village_name = component.long_name;
            if (types.includes('sublocality_level_1') || types.includes('locality')) {
                 const name = component.long_name.replace('แขวง', '').replace('ต.', '').trim();
                 if(name !== 'กรุงเทพมหานคร') newAddress.sub_district = name;
            }
            if (types.includes('administrative_area_level_2')) {
                 newAddress.district = component.long_name.replace('เขต', '').replace('อ.', '').trim();
            }
            if (types.includes('administrative_area_level_1')) {
                 newAddress.province = component.long_name.replace('จ.', '').trim();
            }
        });
        setFormData(newAddress);
    };

    const handleMapClick = (event) => {
        if (!userLocation) return;
        const clickedPos = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        
        // ถ้าต้องการบังคับระยะ 500 เมตร
        const userLatLng = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(userLatLng, event.latLng);
        
        if (distance <= 500) {
            setMarkerPos(clickedPos);
            reverseGeocode(clickedPos);
        } else {
            alert("❌ กรุณาปักหมุดภายในรัศมี 500 เมตรรอบตัวคุณ (พื้นที่วงกลมสีเขียว)");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const formatCitizenId = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        let formatted = '';
        if(val.length > 0) formatted += val.substring(0,1);
        if(val.length > 1) formatted += '-' + val.substring(1,5);
        if(val.length > 5) formatted += '-' + val.substring(5,10);
        if(val.length > 10) formatted += '-' + val.substring(10,12);
        if(val.length > 12) formatted += '-' + val.substring(12,13);
        setFormData({ ...formData, citizen_id: formatted });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(formData.password !== formData.confirm_password) return alert("รหัสผ่านไม่ตรงกัน!");
        if(!markerPos) return alert("กรุณาปักหมุดที่ตั้งหมู่บ้านบนแผนที่");
        if (!formData.province || !formData.district || !formData.sub_district) return alert("กรุณากรอกข้อมูล ตำบล อำเภอ จังหวัด ให้ครบถ้วน");

        const cleanCitizenId = formData.citizen_id.replace(/-/g, '');
        if(cleanCitizenId.length !== 13) return alert("เลขบัตรประชาชนต้องครบ 13 หลัก");

        setIsSubmitting(true);
        try {
            const payload = { ...formData, citizen_id: cleanCitizenId, latitude: markerPos.lat, longitude: markerPos.lng };
            const res = await fetch(`${API_URL}/api/villages/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if(data.success) {
                alert('ลงทะเบียนสำเร็จ! คุณสามารถเข้าสู่ระบบด้วยเลขบัตรประชาชนและรหัสผ่านที่ตั้งไว้ได้เลย');
                navigate('/login'); 
            } else {
                alert('ลงทะเบียนล้มเหลว: ' + data.message);
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
        setIsSubmitting(false);
    };

    const inputStyle = "w-full p-3 rounded-xl border border-slate-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800";
    const labelStyle = "block text-xs font-bold text-slate-500 mb-1 ml-1";

    if (loadError) return <div>Error loading maps</div>;
    if (!isLoaded || (!userLocation && isLocating)) return (
        <div style={{minHeight: '100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'15px', backgroundColor:'#f8fafc'}}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{color:'#64748b', fontWeight:'bold'}}>{locationStatus}</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <TopNavbar userData={userData} />
            
            <div style={{ padding: '80px 20px 100px 20px', maxWidth: '800px', margin: '0 auto' }}>
                
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={20} color="white" />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>สร้างข้อมูลหมู่บ้าน และ ผู้ใหญ่บ้าน</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>สำหรับผู้ใหญ่บ้าน (ผู้นำชุมชน) เพื่อใช้ล็อกอิน</p>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                    <div>
                        <strong style={{ color: '#b45309', display: 'block', fontSize: '14px', marginBottom: '4px' }}>โปรดตรวจสอบตำแหน่งที่ตั้งและที่อยู่ให้ถูกต้อง!</strong>
                        <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
                            การปักหมุดที่แม่นยำจะช่วยให้ระบบระบุเขตการปกครองของคุณได้อย่างถูกต้อง
                        </p>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <form onSubmit={handleSubmit}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                                    <Home size={18} className="text-emerald-500"/> <strong style={{fontSize: '15px'}}>1. ข้อมูลที่ตั้งหมู่บ้าน</strong>
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>หมู่ที่</label>
                                <input type="text" name="village_no" value={formData.village_no} onChange={handleChange} placeholder="เช่น 1 หรือ 15" className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>ชื่อหมู่บ้าน / ชุมชน *</label>
                                <input required type="text" name="village_name" value={formData.village_name} onChange={handleChange} placeholder="กรุณาระบุชื่อหมู่บ้าน" className={inputStyle} />
                            </div>
                            <div className="col-span-full md:col-span-1">
                                <label className={labelStyle}>ตำบล/แขวง *</label>
                                <input required type="text" name="sub_district" value={formData.sub_district} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div className="col-span-full md:col-span-1">
                                <label className={labelStyle}>อำเภอ/เขต *</label>
                                <input required type="text" name="district" value={formData.district} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className={labelStyle}>จังหวัด *</label>
                                <input required type="text" name="province" value={formData.province} onChange={handleChange} className={inputStyle} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                                <Navigation size={18} color="#3b82f6" />
                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>เลื่อนหมุดเพื่อปรับพิกัดศูนย์กลางหมู่บ้าน</span>
                            </div>
                            <button type="button" onClick={fetchCurrentLocation} disabled={isLocating} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff' }}>
                                <RefreshCcw size={14} className={isLocating ? "animate-spin" : ""} /> {isLocating ? 'กำลังดึงพิกัด...' : 'ดึงตำแหน่งของฉันใหม่'}
                            </button>
                        </div>

                        <div style={{ border: '2px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', position: 'relative', marginBottom: '30px' }}>
                            {userLocation && (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={userLocation}
                                    zoom={15}
                                    onLoad={onMapLoad}
                                    onUnmount={onMapUnmount}
                                    onClick={handleMapClick}
                                    options={{
                                        disableDefaultUI: false,
                                        zoomControl: true,
                                        streetViewControl: false,
                                        mapTypeControl: true,
                                        mapTypeId: 'hybrid'
                                    }}
                                >
                                    <Circle
                                        center={userLocation}
                                        radius={500}
                                        options={{
                                            fillColor: "#10b981", fillOpacity: 0.15,
                                            strokeColor: "#10b981", strokeOpacity: 0.8, strokeWeight: 2,
                                            clickable: false
                                        }}
                                    />
                                    <Marker
                                        position={userLocation}
                                        icon={{
                                            path: window.google.maps.SymbolPath.CIRCLE,
                                            scale: 8, fillColor: "#3b82f6", fillOpacity: 1,
                                            strokeColor: "#ffffff", strokeWeight: 2,
                                        }}
                                        title="ตำแหน่ง GPS ปัจจุบัน"
                                    />
                                    {markerPos && (
                                        <Marker position={markerPos} animation={window.google.maps.Animation.DROP} draggable={true} onDragEnd={(e) => handleMapClick({ latLng: e.latLng })} />
                                    )}
                                </GoogleMap>
                            )}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
                                <MapPin size={16} color={markerPos ? "#10b981" : "#ef4444"} />
                                {markerPos ? (
                                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>พิกัดที่ปักหมุด: {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}</span>
                                ) : (
                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>กรุณาคลิกบนแผนที่เพื่อปักหมุดหมู่บ้าน</span>
                                )}
                            </div>
                        </div>

                        {/* ข้อมูลบัญชีผู้ใหญ่บ้าน */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                                    <User size={18} className="text-blue-500"/> <strong style={{fontSize: '15px'}}>2. บัญชีเข้าใช้งาน (ผู้ใหญ่บ้าน)</strong>
                                </div>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className={labelStyle}>เลขบัตรประชาชน (ใช้เป็น Username) *</label>
                                <input required type="text" value={formData.citizen_id} onChange={formatCitizenId} maxLength={17} placeholder="x-xxxx-xxxxx-xx-x" className={inputStyle} />
                            </div>
                            <div><label className={labelStyle}>ชื่อจริง *</label><input required type="text" name="first_name" onChange={handleChange} className={inputStyle} /></div>
                            <div><label className={labelStyle}>นามสกุล *</label><input required type="text" name="last_name" onChange={handleChange} className={inputStyle} /></div>
                            <div><label className={labelStyle}>ชื่อเรียก / ตำแหน่ง</label><input type="text" name="nickname" onChange={handleChange} placeholder="เช่น ผู้ใหญ่สมชาย" className={inputStyle} /></div>
                            <div><label className={labelStyle}>เบอร์โทรศัพท์ *</label><input required type="tel" name="phone_number" onChange={handleChange} className={inputStyle} /></div>
                            
                            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}><Key size={16}/> ตั้งรหัสผ่าน</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div><input required type="password" name="password" onChange={handleChange} placeholder="รหัสผ่าน" className={inputStyle} /></div>
                                    <div><input required type="password" name="confirm_password" onChange={handleChange} placeholder="ยืนยันรหัสผ่านอีกครั้ง" className={inputStyle} /></div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', marginTop: '30px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}>
                            <Save size={20} /> {isSubmitting ? 'กำลังบันทึก...' : 'สร้างข้อมูลหมู่บ้านและบัญชี'}
                        </button>
                    </form>
                </div>
            </div>
            <BottomNavbar />
        </div>
    );
};

export default RegisterVillage;