import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { MapPin, Save, User, Map, Key, Phone, ChevronLeft } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';
const mapContainerStyle = { width: '100%', height: '300px', borderRadius: '12px' };

const RegisterVillage = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State แผนที่
    const [mapInstance, setMapInstance] = useState(null);
    const [markerPos, setMarkerPos] = useState(null);
    const [userLocation, setUserLocation] = useState({ lat: 13.736717, lng: 100.523186 });
    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
    const onMapLoad = useCallback((map) => setMapInstance(map), []);
    const onMapUnmount = useCallback(() => setMapInstance(null), []);

    // State ข้อมูลฟอร์ม
    const [formData, setFormData] = useState({
        // ข้อมูลหมู่บ้าน
        village_no: '', village_name: '', province: '', district: '', sub_district: '',
        // ข้อมูลผู้ใหญ่บ้าน
        citizen_id: '', first_name: '', last_name: '', nickname: '', phone_number: '', password: '', confirm_password: ''
    });

    useEffect(() => {
        if (isLoaded && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc); setMarkerPos(loc);
                }
            );
        }
    }, [isLoaded]);

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
                navigate('/login'); // เปลี่ยนเส้นทางไปหน้า Login
            } else {
                alert('ลงทะเบียนล้มเหลว: ' + data.message);
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
        setIsSubmitting(false);
    };

    const inputStyle = "w-full p-3 rounded-xl border border-slate-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";
    const labelStyle = "block text-xs font-bold text-slate-500 mb-1 ml-1";

    if (!isLoaded) return <div className="text-center p-10">กำลังโหลดแผนที่...</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans flex justify-center items-center">
            <div className="w-full max-w-2xl bg-white/90 backdrop-blur-md border border-white shadow-2xl rounded-3xl overflow-hidden">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
                    <Link to="/login" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                        <ChevronLeft size={24} />
                    </Link>
                    <h2 className="text-2xl font-black mb-1">ลงทะเบียนพื้นที่หมู่บ้าน</h2>
                    <p className="text-blue-100 text-sm">สำหรับผู้นำชุมชน / ผู้ใหญ่บ้าน เพื่อเริ่มต้นสร้างฐานข้อมูล</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    
                    {/* ส่วนที่ 1: ข้อมูลที่ตั้งหมู่บ้าน */}
                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 text-indigo-600 font-bold text-lg border-b border-slate-100 pb-2">
                            <MapPin size={20}/> 1. ข้อมูลสถานที่ตั้งหมู่บ้าน
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelStyle}>หมู่ที่ *</label><input required type="text" name="village_no" onChange={handleChange} placeholder="เช่น 1 หรือ 15" className={inputStyle} /></div>
                            <div><label className={labelStyle}>ชื่อหมู่บ้าน *</label><input required type="text" name="village_name" onChange={handleChange} placeholder="เช่น บ้านโคกสว่าง" className={inputStyle} /></div>
                            <div className="col-span-full md:col-span-1"><label className={labelStyle}>ตำบล *</label><input required type="text" name="sub_district" onChange={handleChange} className={inputStyle} /></div>
                            <div className="col-span-full md:col-span-1"><label className={labelStyle}>อำเภอ *</label><input required type="text" name="district" onChange={handleChange} className={inputStyle} /></div>
                            <div className="col-span-full"><label className={labelStyle}>จังหวัด *</label><input required type="text" name="province" onChange={handleChange} className={inputStyle} /></div>
                        </div>

                        {/* แผนที่ปักหมุดหมู่บ้าน */}
                        <div className="mt-4">
                            <label className="block text-sm font-bold text-blue-500 mb-2 flex items-center gap-2"> ซูมและปักหมุดที่ตั้งศูนย์กลางหมู่บ้าน</label>
                            <div className="border-2 border-slate-200 rounded-xl overflow-hidden relative">
                                <GoogleMap mapContainerStyle={mapContainerStyle} center={userLocation} zoom={15} onLoad={onMapLoad} onUnmount={onMapUnmount} onClick={(e) => setMarkerPos({lat: e.latLng.lat(), lng: e.latLng.lng()})} options={{ mapTypeId: 'hybrid' }}>
                                    {markerPos && <Marker position={markerPos} draggable onDragEnd={(e) => setMarkerPos({lat: e.latLng.lat(), lng: e.latLng.lng()})} />}
                                </GoogleMap>
                                {!markerPos && <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none"><span className="bg-white px-4 py-2 rounded-full text-sm font-bold shadow-md text-red-500">กรุณาคลิกบนแผนที่เพื่อปักหมุด</span></div>}
                            </div>
                        </div>
                    </div>

                    {/* ส่วนที่ 2: ข้อมูลผู้ใหญ่บ้าน (สร้างบัญชี) */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-lg border-b border-slate-100 pb-2">
                            <User size={20}/> 2. ข้อมูลผู้นำชุมชน (สำหรับเข้าสู่ระบบ)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-full">
                                <label className={labelStyle}>เลขบัตรประชาชน (ใช้เป็น Username) *</label>
                                <input required type="text" value={formData.citizen_id} onChange={formatCitizenId} maxLength={17} placeholder="x-xxxx-xxxxx-xx-x" className={inputStyle} />
                            </div>
                            <div><label className={labelStyle}>ชื่อจริง *</label><input required type="text" name="first_name" onChange={handleChange} className={inputStyle} /></div>
                            <div><label className={labelStyle}>นามสกุล *</label><input required type="text" name="last_name" onChange={handleChange} className={inputStyle} /></div>
                            <div><label className={labelStyle}>ชื่อเล่น / ชื่อเรียก</label><input type="text" name="nickname" onChange={handleChange} placeholder="เช่น พ่อผู้ใหญ่สมหมาย" className={inputStyle} /></div>
                            <div><label className={labelStyle}>เบอร์โทรศัพท์ *</label><input required type="tel" name="phone_number" onChange={handleChange} className={inputStyle} /></div>
                            
                            <div className="col-span-full mt-2">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3"><Key size={16}/> ตั้งรหัสผ่าน</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><input required type="password" name="password" onChange={handleChange} placeholder="รหัสผ่าน" className={inputStyle} /></div>
                                    <div><input required type="password" name="confirm_password" onChange={handleChange} placeholder="ยืนยันรหัสผ่านอีกครั้ง" className={inputStyle} /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ปุ่ม Submit */}
                    <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 mt-8">
                        <Save size={24}/> {isSubmitting ? 'กำลังสร้างฐานข้อมูล...' : 'ลงทะเบียนพื้นที่และสร้างบัญชี'}
                    </button>
                    
                </form>
            </div>
        </div>
    );
};

export default RegisterVillage;