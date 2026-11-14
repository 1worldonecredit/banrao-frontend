import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { MapPin, Save, User, Key, ChevronLeft, Navigation, Home, AlertTriangle, RefreshCcw, Eye, EyeOff, Users, CheckCircle, XCircle } from 'lucide-react';
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
    
    // State รหัสผ่าน
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 🌟 State ระบบผู้แนะนำ
    const [referrerPhone, setReferrerPhone] = useState('');
    const [referrerInfo, setReferrerInfo] = useState(null);
    const [isCheckingReferrer, setIsCheckingReferrer] = useState(false);

    const { isLoaded, loadError } = useJsApiLoader({ 
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places', 'geometry'] 
    });

    const onMapLoad = useCallback((map) => setMapInstance(map), []);
    const onMapUnmount = useCallback(() => setMapInstance(null), []);

    // ฟอร์มข้อมูลหลัก
    const [formData, setFormData] = useState({
        village_id: '', village_no: '', village_name: '', province: '', district: '', sub_district: '',
        citizen_id: '', first_name: '', last_name: '', nickname: '', phone_number: '', password: '', confirm_password: ''
    });

    // 🌟 1. เพิ่ม State และ useEffect สำหรับ Dropdown หมู่บ้าน (จุดที่ทำให้เกิด Error หน้าจอขาว)
    const [villagesList, setVillagesList] = useState([]);

    useEffect(() => {
        if (formData.sub_district) {
            fetch(`${API_URL}/api/villages/by-tambon?tambon_name=${formData.sub_district}`)
                .then(res => res.json())
                .then(data => setVillagesList(data))
                .catch(err => console.error("Error fetching villages:", err));
        } else {
            setVillagesList([]); // ล้างข้อมูลออกถ้าไม่มีตำบล
        }
    }, [formData.sub_district]);
    // ==========================================

    // ดึงพิกัด GPS ปัจจุบัน
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
        if (isLoaded) fetchCurrentLocation();
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

    // ควบคุมเบอร์โทร (ตัวเลขเท่านั้น)
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= 10) setFormData({ ...formData, phone_number: value });
    };

    // ควบคุมรหัสผ่าน (ภาษาอังกฤษและตัวเลข)
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, ''); 
        setFormData({ ...formData, [name]: alphanumericValue });
    };

    // ฟอร์แมตเลขบัตรประชาชน
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

    // 🌟 ดึงข้อมูลผู้แนะนำจาก API
    useEffect(() => {
        if (referrerPhone.length === 10) {
            checkReferrer(referrerPhone);
        } else {
            setReferrerInfo(null);
        }
    }, [referrerPhone]);

    const checkReferrer = async (phone) => {
        setIsCheckingReferrer(true);
        try {
            const res = await fetch(`${API_URL}/api/users/referrer/${phone}`);
            const data = await res.json();
            if(data.success) {
                setReferrerInfo(data.data);
            } else {
                setReferrerInfo({ notFound: true });
            }
        } catch (e) {
            console.error(e);
        }
        setIsCheckingReferrer(false);
    };

    // 🌟 ยืนยันการบันทึก
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if(!formData.village_id) return alert("กรุณาเลือกหมู่บ้านจากรายการ");
        if(formData.phone_number.length !== 10) return alert("กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
        if(formData.password.length < 6) return alert("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        if(formData.password !== formData.confirm_password) return alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!");
        if(!markerPos) return alert("กรุณาปักหมุดที่ตั้งหมู่บ้านบนแผนที่");
        if (!formData.province || !formData.district || !formData.sub_district) return alert("กรุณากรอกข้อมูล ตำบล อำเภอ จังหวัด ให้ครบถ้วน");

        const cleanCitizenId = formData.citizen_id.replace(/-/g, '');
        if(cleanCitizenId && cleanCitizenId.length !== 13) return alert("เลขบัตรประชาชนต้องครบ 13 หลัก");

        setIsSubmitting(true);
        try {
            const payload = { 
                ...formData, 
                citizen_id: cleanCitizenId, 
                latitude: markerPos.lat, 
                longitude: markerPos.lng,
                referrer_account_id: (referrerInfo && !referrerInfo.notFound) ? referrerInfo.account_id : null
            };
            
            const res = await fetch(`${API_URL}/api/villages/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if(data.success) {
                alert('ลงทะเบียนสำเร็จ! เข้าสู่ระบบด้วยเบอร์โทรศัพท์ได้เลยครับ');
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
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>สำหรับผู้นำชุมชน เพื่อใช้ล็อกอินเข้าสู่ระบบ</p>
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
                        
                        {/* 1. ข้อมูลที่ตั้งหมู่บ้าน */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                                    <Home size={18} className="text-emerald-500"/> <strong style={{fontSize: '15px'}}>ข้อมูลที่ตั้งหมู่บ้าน</strong>
                                </div>
                            </div>

                            {/* ===== ส่วนที่แก้ไขเป็น Dropdown ===== */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className={labelStyle}>หมู่ที่ และ ชื่อหมู่บ้าน / ชุมชน *</label>
                               <select 
    name="village_id" 
    value={formData.village_id || ''} 
    onChange={(e) => {
        // ค้นหาข้อมูลหมู่บ้านที่ถูกเลือก (แปลงเป็น String เพื่อให้เทียบกันได้แม่นยำ 100%)
        const selected = villagesList.find(v => String(v.village_id) === String(e.target.value));
        
        if (selected) {
            // อัปเดต State รวดเดียว 3 ค่าพร้อมกัน ป้องกัน React บันทึกข้อมูลทับกัน
            setFormData(prev => ({
                ...prev,
                village_id: selected.village_id,
                village_no: selected.village_no,
                village_name: selected.village_name
            }));
        } else {
            // กรณีเลือก "-- เลือกหมู่บ้านของคุณ --" ให้เคลียร์ค่าทิ้ง
            setFormData(prev => ({
                ...prev,
                village_id: '',
                village_no: '',
                village_name: ''
            }));
        }
    }} 
    className={inputStyle}
    disabled={!villagesList || villagesList.length === 0}
    required
>
    <option value="">
        {(!villagesList || villagesList.length === 0) 
            ? '-- กรุณารอระบบระบุตำบลก่อน หรือ กำลังโหลดข้อมูล... --' 
            : '-- เลือกหมู่บ้านของคุณ --'}
    </option>
    {villagesList && villagesList.map(v => (
        <option key={v.village_id} value={v.village_id}>
            หมู่ที่ {v.village_no} {v.village_name}
        </option>
    ))}
</select>
                            </div>
                            {/* ================================== */}

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

                        {/* แผนที่ */}
                        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                                <Navigation size={18} color="#3b82f6" />
                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>เลื่อนหมุดเพื่อปรับพิกัดศูนย์กลางหมู่บ้าน</span>
                            </div>
                            <button type="button" onClick={fetchCurrentLocation} disabled={isLocating} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff' }}>
                                <RefreshCcw size={14} className={isLocating ? "animate-spin" : ""} /> {isLocating ? 'กำลังดึงพิกัด...' : 'ดึงตำแหน่งใหม่'}
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
                                    options={{ disableDefaultUI: false, zoomControl: true, mapTypeControl: true, mapTypeId: 'hybrid' }}
                                >
                                    <Circle center={userLocation} radius={500} options={{ fillColor: "#10b981", fillOpacity: 0.15, strokeColor: "#10b981", strokeOpacity: 0.8, strokeWeight: 2, clickable: false }} />
                                    <Marker position={userLocation} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#3b82f6", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 }} title="ตำแหน่งปัจจุบัน" />
                                    {markerPos && <Marker position={markerPos} animation={window.google.maps.Animation.DROP} draggable={true} onDragEnd={(e) => handleMapClick({ latLng: e.latLng })} />}
                                </GoogleMap>
                            )}
                        </div>

                        {/* 2. ข้อมูลบัญชีผู้ใหญ่บ้าน */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                                    <User size={18} className="text-blue-500"/> <strong style={{fontSize: '15px'}}>2. บัญชีเข้าใช้งาน (ผู้ใหญ่บ้าน)</strong>
                                </div>
                            </div>
                            
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className={labelStyle}>เบอร์โทรศัพท์ (ใช้เป็น Username สำหรับเข้าระบบ) *</label>
                                <input required type="tel" name="phone_number" value={formData.phone_number} onChange={handlePhoneChange} maxLength={10} placeholder="08xxxxxxxx (กรอกเฉพาะตัวเลข 10 หลัก)" className={`${inputStyle} border-blue-400 bg-blue-50`} />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className={labelStyle}>เลขบัตรประชาชน (ตัวเลือก)</label>
                                <input type="text" value={formData.citizen_id} onChange={formatCitizenId} maxLength={17} placeholder="x-xxxx-xxxxx-xx-x" className={inputStyle} />
                            </div>
                            <div><label className={labelStyle}>ชื่อจริง *</label><input required type="text" name="first_name" onChange={handleChange} className={inputStyle} /></div>
                            <div><label className={labelStyle}>นามสกุล *</label><input required type="text" name="last_name" onChange={handleChange} className={inputStyle} /></div>
                            <div style={{ gridColumn: '1 / -1' }}><label className={labelStyle}>ชื่อเรียก / ตำแหน่ง</label><input type="text" name="nickname" onChange={handleChange} placeholder="เช่น ผู้ใหญ่สมชาย" className={inputStyle} /></div>
                            
                            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}><Key size={16}/> ตั้งรหัสผ่าน (ภาษาอังกฤษและตัวเลขเท่านั้น)</h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="relative">
                                        <input required type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handlePasswordChange} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" className={inputStyle} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    
                                    <div className="relative">
                                        <input required type={showConfirmPassword ? "text" : "password"} name="confirm_password" value={formData.confirm_password} onChange={handlePasswordChange} placeholder="ยืนยันรหัสผ่านอีกครั้ง" className={`${inputStyle} ${formData.confirm_password && formData.password !== formData.confirm_password ? 'border-red-500 bg-red-50' : ''}`} />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                {formData.confirm_password && formData.password !== formData.confirm_password && (
                                    <p className="text-red-500 text-xs mt-1 font-bold">รหัสผ่านไม่ตรงกัน</p>
                                )}
                            </div>
                        </div>

                        {/* 🌟 3. ระบบผู้แนะนำ (Affiliate) */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 mt-6">
                          <label className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-2">
                            <Users size={16} /> 3. ผู้แนะนำการใช้งาน (เพื่อรับสิทธิ์แชร์รายได้ระบบ)
                          </label>
                          <p className="text-xs text-slate-500 mb-3">
                            หากมีผู้ใหญ่บ้านท่านอื่นแนะนำคุณมา กรุณากรอกเบอร์โทรศัพท์ของท่าน เพื่อให้ท่านได้รับสิทธิ์ส่วนแบ่งรายได้
                          </p>
                          
                          <input 
                            type="text" 
                            maxLength="10"
                            className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500"
                            placeholder="08xxxxxxxx (กรอกเฉพาะตัวเลข 10 หลัก)"
                            value={referrerPhone}
                            onChange={(e) => setReferrerPhone(e.target.value.replace(/\D/g, ''))} 
                          />

                          {isCheckingReferrer ? (
                            <p className="text-sm text-slate-500 mt-2">กำลังค้นหาข้อมูล...</p>
                          ) : referrerInfo && !referrerInfo.notFound ? (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex flex-col gap-1">
                              <span className="text-sm font-bold text-green-700">✓ พบข้อมูลผู้แนะนำ</span>
                              <span className="text-sm text-green-600">
                                คุณ {referrerInfo.first_name} {referrerInfo.last_name} 
                              </span>
                              <span className="text-xs text-green-600">
                                (หมู่ {referrerInfo.village_no || '-'} {referrerInfo.village_name || ''})
                              </span>
                            </div>
                          ) : referrerInfo && referrerInfo.notFound ? (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                              <span className="text-sm font-bold text-red-600">✗ ไม่พบข้อมูลเบอร์โทรศัพท์นี้ในระบบ</span>
                            </div>
                          ) : null}
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