import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { MapPin, Save, User, Key, ChevronLeft, Navigation, Home, AlertTriangle, RefreshCcw, Eye, EyeOff, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';
const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '16px' };

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
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [referrerPhone, setReferrerPhone] = useState('');
    const [referrerInfo, setReferrerInfo] = useState(null);
    const [isCheckingReferrer, setIsCheckingReferrer] = useState(false);

    const { isLoaded, loadError } = useJsApiLoader({ 
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places', 'geometry'] 
    });

    const onMapLoad = useCallback((map) => setMapInstance(map), []);
    const onMapUnmount = useCallback(() => setMapInstance(null), []);

    const [formData, setFormData] = useState({
        village_id: '', village_no: '', village_name: '', province: '', district: '', sub_district: '',
        citizen_id: '', first_name: '', last_name: '', nickname: '', phone_number: '', password: '', confirm_password: '' , gender: '', dob_day: '', dob_month: '', dob_year: ''
    });

    const [villagesList, setVillagesList] = useState([]);

 useEffect(() => {
        if (formData.sub_district) {
            fetch(`${API_URL}/api/villages/by-tambon?tambon_name=${formData.sub_district}`)
                .then(res => res.json())
                .then(data => {
                    // 🌟 เพิ่มการจัดเรียง (Sort) ให้เป็นตัวเลขแบบคณิตศาสตร์ (1, 2, 3, ..., 10, 11)
                    const sortedVillages = data.sort((a, b) => {
                        return parseInt(a.village_no) - parseInt(b.village_no);
                    });
                    setVillagesList(sortedVillages);
                })
                .catch(err => console.error("Error fetching villages:", err));
        } else {
            setVillagesList([]); 
        }
    }, [formData.sub_district]);

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

    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= 10) setFormData({ ...formData, phone_number: value });
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, ''); 
        setFormData({ ...formData, [name]: alphanumericValue });
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

   const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.village_id) return alert("กรุณาเลือกหมู่บ้านจากรายการ");
    if (formData.phone_number.length !== 10) return alert("กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
    if (!formData.gender) return alert("กรุณาเลือกเพศ");
    if (!formData.dob_day || !formData.dob_month || !formData.dob_year) return alert("กรุณาเลือกวันเดือนปีเกิดให้ครบถ้วน");
    if (formData.password.length < 6) return alert("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
    if (formData.password !== formData.confirm_password) return alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!");
    if (!markerPos) return alert("กรุณาปักหมุดที่ตั้งหมู่บ้านบนแผนที่");
    if (!formData.province || !formData.district || !formData.sub_district) return alert("กรุณากรอกข้อมูล ตำบล อำเภอ จังหวัด ให้ครบถ้วน");

    const cleanCitizenId = formData.citizen_id.replace(/-/g, '');
    if (cleanCitizenId && cleanCitizenId.length !== 13) return alert("เลขบัตรประชาชนต้องครบ 13 หลัก");

    // ✨ แปลง พ.ศ. เป็น ค.ศ. รูปแบบ YYYY-MM-DD
    const ceYear = Number(formData.dob_year) - 543;
    const finalDob = `${ceYear}-${String(formData.dob_month).padStart(2, '0')}-${String(formData.dob_day).padStart(2, '0')}`;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        citizen_id: cleanCitizenId,
        gender: formData.gender,
        dob: finalDob,
        latitude: markerPos.lat,
        longitude: markerPos.lng,
        referrer_account_id: (referrerInfo && !referrerInfo.notFound) ? referrerInfo.account_id : null
      };

      const res = await fetch(`${API_URL}/api/villages/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
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

    const inputStyle = "w-full p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 text-sm";
    const labelStyle = "block text-xs font-bold text-slate-500 mb-1.5";

    if (loadError) return <div>Error loading maps</div>;
    if (!isLoaded || (!userLocation && isLocating)) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            <p className="font-bold text-slate-500">{locationStatus}</p>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen overflow-hidden bg-slate-50 font-sans">
            <div className="flex-shrink-0 z-40 sticky top-0 w-full"><TopNavbar userData={userData} /></div>
            
            <div className="flex-1 overflow-y-auto px-4 pt-[90px] pb-[100px] w-full">
                <div className="max-w-3xl mx-auto">
                    
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white flex items-center gap-4 mb-6 shadow-md">
                        <button onClick={() => navigate(-1)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                            <ChevronLeft size={24} className="text-white" />
                        </button>
                        <div>
                            <h2 className="text-xl font-extrabold m-0">สร้างข้อมูลหมู่บ้าน และ ผู้ใหญ่บ้าน</h2>
                            <p className="text-sm opacity-90 m-0 mt-1">สำหรับผู้นำชุมชน เพื่อใช้ล็อกอินเข้าสู่ระบบ</p>
                        </div>
                    </div>

                    {/* Alert Box */}
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex gap-3 items-start">
                        <AlertTriangle size={24} className="text-amber-500 flex-shrink-0" />
                        <div>
                            <strong className="text-amber-800 block text-sm mb-1">โปรดตรวจสอบตำแหน่งที่ตั้งและที่อยู่ให้ถูกต้อง!</strong>
                            <p className="text-xs text-amber-700 m-0 leading-relaxed">
                                การปักหมุดที่แม่นยำจะช่วยให้ระบบระบุเขตการปกครองของคุณได้อย่างถูกต้อง
                            </p>
                        </div>
                    </div>

                    {/* Main Form Container */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            
                            {/* Section 1: ข้อมูลที่ตั้งหมู่บ้าน */}
                            <div>
                                <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
                                    <Home size={18} className="text-emerald-500" /> 1. ข้อมูลที่ตั้งหมู่บ้าน
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className={labelStyle}>หมู่ที่ และ ชื่อหมู่บ้าน / ชุมชน *</label>
                                        <select 
                                            name="village_id" 
                                            value={formData.village_id || ''} 
                                            onChange={(e) => {
                                                const selected = villagesList.find(v => String(v.village_id) === String(e.target.value));
                                                if (selected) {
                                                    setFormData(prev => ({
                                                        ...prev, village_id: selected.village_id, village_no: selected.village_no, village_name: selected.village_name
                                                    }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, village_id: '', village_no: '', village_name: '' }));
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
                                    
                                    <div className="col-span-full md:col-span-1">
                                        <label className={labelStyle}>ตำบล/แขวง *</label>
                                        <input required type="text" name="sub_district" value={formData.sub_district} onChange={handleChange} className={inputStyle} />
                                    </div>
                                    <div className="col-span-full md:col-span-1">
                                        <label className={labelStyle}>อำเภอ/เขต *</label>
                                        <input required type="text" name="district" value={formData.district} onChange={handleChange} className={inputStyle} />
                                    </div>
                                    <div className="col-span-full">
                                        <label className={labelStyle}>จังหวัด *</label>
                                        <input required type="text" name="province" value={formData.province} onChange={handleChange} className={inputStyle} />
                                    </div>
                                </div>
                            </div>

                            {/* Section: แผนที่ (ซูมใกล้ขึ้นเป็น 18) */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Navigation size={16} className="text-blue-500" />
                                        <span className="font-bold text-xs">เลื่อนหมุดเพื่อปรับพิกัดศูนย์กลางหมู่บ้าน</span>
                                    </div>
                                    <button type="button" onClick={fetchCurrentLocation} disabled={isLocating} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                        <RefreshCcw size={14} className={isLocating ? "animate-spin" : ""} /> {isLocating ? 'กำลังดึงพิกัด...' : 'ดึงตำแหน่งใหม่'}
                                    </button>
                                </div>
                                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden relative shadow-sm">
                                    {userLocation && (
                                        <GoogleMap
                                            mapContainerStyle={mapContainerStyle}
                                            center={userLocation}
                                            zoom={18} 
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
                            </div>

                            {/* Section 2: ข้อมูลบัญชี */}
                            <div className="mt-4">
                                <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
                                    <User size={18} className="text-blue-500" /> 2. บัญชีเข้าใช้งาน (ผู้ใหญ่บ้าน)
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className={labelStyle}>เบอร์โทรศัพท์ (ใช้เป็น Username สำหรับเข้าระบบ) *</label>
                                        <input required type="tel" name="phone_number" value={formData.phone_number} onChange={handlePhoneChange} maxLength={10} placeholder="08xxxxxxxx (กรอกเฉพาะตัวเลข 10 หลัก)" className={`${inputStyle} border-blue-300 bg-blue-50/50 focus:bg-white`} />
                                    </div>
                                    <div className="col-span-full">
                                        <label className={labelStyle}>เลขบัตรประชาชน (ตัวเลือก)</label>
                                        <input type="text" value={formData.citizen_id} onChange={formatCitizenId} maxLength={17} placeholder="x-xxxx-xxxxx-xx-x" className={inputStyle} />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>ชื่อจริง *</label>
                                        <input required type="text" name="first_name" onChange={handleChange} className={inputStyle} />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>นามสกุล *</label>
                                        <input required type="text" name="last_name" onChange={handleChange} className={inputStyle} />
                                    </div>
                                    <div className="col-span-full">
                                        <label className={labelStyle}>ชื่อเรียก / ตำแหน่ง</label>
                                        <input type="text" name="nickname" onChange={handleChange} placeholder="เช่น ผู้ใหญ่สมชาย" className={inputStyle} />
                                    </div>
                                    {/* ✨ เพศ */}
              <div className="col-span-full">
                <label className={labelStyle}>เพศ *</label>
                <select
                  required
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={inputStyle}
                >
                  <option value="">-- เลือก --</option>
                  <option value="MALE">ชาย</option>
                  <option value="FEMALE">หญิง</option>
                </select>
              </div>

              {/* ✨ วันเดือนปีเกิด (แบบไทย) */}
              <div className="col-span-full p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                <label className={labelStyle}>วันเดือนปีเกิด (แบบไทย) *</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {/* วันที่ */}
                  <select
                    required
                    name="dob_day"
                    value={formData.dob_day}
                    onChange={handleChange}
                    className={inputStyle}
                  >
                    <option value="">- วันที่ -</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* เดือน */}
                  <select
                    required
                    name="dob_month"
                    value={formData.dob_month}
                    onChange={handleChange}
                    className={inputStyle}
                  >
                    <option value="">- เดือน -</option>
                    {[
                      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  {/* พ.ศ. */}
                  <select
                    required
                    name="dob_year"
                    value={formData.dob_year}
                    onChange={handleChange}
                    className={inputStyle}
                  >
                    <option value="">- พ.ศ. -</option>
                    {Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() + 543) - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
                                </div>

                                <div className="mt-5 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3"><Key size={16} className="text-slate-400"/> ตั้งรหัสผ่าน (อังกฤษ/ตัวเลข)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <input required type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handlePasswordChange} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" className={inputStyle} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input required type={showConfirmPassword ? "text" : "password"} name="confirm_password" value={formData.confirm_password} onChange={handlePasswordChange} placeholder="ยืนยันรหัสผ่านอีกครั้ง" className={`${inputStyle} ${formData.confirm_password && formData.password !== formData.confirm_password ? 'border-red-400 bg-red-50' : ''}`} />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    {formData.confirm_password && formData.password !== formData.confirm_password && (
                                        <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1"><XCircle size={14}/> รหัสผ่านไม่ตรงกัน</p>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: ระบบผู้แนะนำ */}
                            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mt-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-blue-700 mb-1">
                                    <Users size={18} /> 3. ผู้แนะนำการใช้งาน (เพื่อรับสิทธิ์แชร์รายได้ระบบ)
                                </label>
                                <p className="text-xs text-slate-500 mb-4 font-medium">
                                    หากมีผู้ใหญ่บ้านท่านอื่นแนะนำคุณมา กรุณากรอกเบอร์โทรศัพท์ของท่าน เพื่อให้ท่านได้รับสิทธิ์ส่วนแบ่งรายได้
                                </p>
                                
                                <input 
                                    type="text" 
                                    maxLength="10"
                                    className={`${inputStyle} border-blue-200 bg-white`}
                                    placeholder="08xxxxxxxx (กรอกเฉพาะตัวเลข 10 หลัก)"
                                    value={referrerPhone}
                                    onChange={(e) => setReferrerPhone(e.target.value.replace(/\D/g, ''))} 
                                />

                                {isCheckingReferrer ? (
                                    <p className="text-xs text-blue-500 mt-2 font-bold flex items-center gap-1"><RefreshCcw size={12} className="animate-spin"/> กำลังค้นหาข้อมูล...</p>
                                ) : referrerInfo && !referrerInfo.notFound ? (
                                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col gap-1">
                                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle size={14}/> พบข้อมูลผู้แนะนำ</span>
                                        <span className="text-xs text-emerald-600 font-medium ml-5">คุณ {referrerInfo.first_name} {referrerInfo.last_name} (หมู่ {referrerInfo.village_no || '-'} {referrerInfo.village_name || ''})</span>
                                    </div>
                                ) : referrerInfo && referrerInfo.notFound ? (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <span className="text-xs font-bold text-red-600 flex items-center gap-1"><XCircle size={14}/> ไม่พบข้อมูลเบอร์โทรศัพท์นี้ในระบบ</span>
                                    </div>
                                ) : null}
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
                                {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'สร้างข้อมูลหมู่บ้านและบัญชี'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 fixed bottom-0 w-full z-40"><BottomNavbar /></div>
        </div>
    );
};

export default RegisterVillage;