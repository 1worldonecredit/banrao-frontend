import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Circle, Marker } from '@react-google-maps/api';
import { ArrowLeft, Map as MapIcon, Save, MapPin, Navigation, Home } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '450px',
  borderRadius: '12px'
};

const RegisterVillage = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // พิกัด GPS ของผู้ใช้
  const [markerPos, setMarkerPos] = useState(null);       // พิกัดที่ปักหมุด
  const [locationStatus, setLocationStatus] = useState('กำลังค้นหาตำแหน่งของคุณ...');
  
  // State สำหรับเก็บที่อยู่
  const [addressData, setAddressData] = useState({
    houseNo: '',
    villageNo: '',
    villageName: '',
    subDistrict: '',
    district: '',
    province: ''
  });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places', 'geometry'] // เพิ่มไลบรารี geometry เพื่อคำนวณระยะทาง
  });

  // 1. ดึงตำแหน่งปัจจุบันของผู้ใช้เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(pos);
          setMarkerPos(pos); // ปักหมุดเริ่มต้นที่ตำแหน่งผู้ใช้
          setLocationStatus('พบตำแหน่งของคุณแล้ว');
          
          if (isLoaded) {
             reverseGeocode(pos); // แปลงพิกัดเป็นที่อยู่
          }
        },
        (error) => {
          console.error("Error Geolocation:", error);
          setLocationStatus('ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS และปักหมุดเอง');
          // กำหนดค่าเริ่มต้นถ้าดึง GPS ไม่ได้ (เช่น อนุสาวรีย์ชัยฯ)
          const defaultPos = { lat: 13.7649, lng: 100.5383 };
          setUserLocation(defaultPos);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
    }
  }, [isLoaded]);

  // 2. แปลงพิกัดเป็นที่อยู่ (Reverse Geocoding)
  const reverseGeocode = (pos) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: pos, language: 'th' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        extractAddressComponents(results[0].address_components);
      } else {
        console.error("Geocoder failed due to: " + status);
      }
    });
  };

  // 3. แกะข้อมูลจาก Google Maps Address Components
  const extractAddressComponents = (components) => {
    let newAddress = { houseNo: '', villageNo: '', villageName: '', subDistrict: '', district: '', province: '' };
    
    components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) newAddress.houseNo = component.long_name;
      if (types.includes('route') || types.includes('neighborhood')) {
         // Google Maps มักเก็บชื่อหมู่บ้านหรือถนนไว้ใน neighborhood หรือ route
         if(component.long_name.includes('หมู่')) newAddress.villageNo = component.long_name;
         else newAddress.villageName = component.long_name;
      }
      if (types.includes('sublocality_level_2')) newAddress.villageName = component.long_name;
      if (types.includes('sublocality_level_1')) newAddress.subDistrict = component.long_name.replace('แขวง', '').replace('ต.', '').trim();
      if (types.includes('locality') || types.includes('administrative_area_level_2')) newAddress.district = component.long_name.replace('เขต', '').replace('อ.', '').trim();
      if (types.includes('administrative_area_level_1')) newAddress.province = component.long_name.replace('จ.', '').trim();
    });

    setAddressData(newAddress);
  };

  const onMapLoad = useCallback(function callback(map) {
    setMapInstance(map);
  }, []);

  const onMapUnmount = useCallback(function callback(map) {
    setMapInstance(null);
  }, []);

  // 4. เมื่อคลิกบนแผนที่ (ตรวจสอบให้อยู่ในรัศมี 500 เมตร)
  const handleMapClick = (event) => {
    if (!userLocation) return;
    
    const clickedPos = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    
    // คำนวณระยะทางระหว่างจุดที่คลิก กับ ตำแหน่งผู้ใช้
    const userLatLng = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(userLatLng, event.latLng);

    if (distance <= 500) {
      setMarkerPos(clickedPos);
      reverseGeocode(clickedPos); // อัปเดตที่อยู่ตามหมุดใหม่
    } else {
      alert("❌ กรุณาปักหมุดภายในรัศมี 500 เมตรรอบตัวคุณ (พื้นที่สีเขียว) เพื่อความแม่นยำ");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddressData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!markerPos) return alert("กรุณาปักหมุดที่ทำการหมู่บ้านก่อนครับ");
    if (!addressData.province || !addressData.district || !addressData.subDistrict) {
        return alert("กรุณากรอกข้อมูล ตำบล อำเภอ จังหวัด ให้ครบถ้วน");
    }

    const payload = {
        ...addressData,
        latitude: markerPos.lat,
        longitude: markerPos.lng,
        creator_account_id: userData.id
    };

    console.log("Saving Data:", payload);
    // TODO: เรียก API บันทึกข้อมูล
    alert(`บันทึกข้อมูลสำเร็จ!\nพิกัด: ${markerPos.lat.toFixed(5)}, ${markerPos.lng.toFixed(5)}`);
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded || !userLocation) return (
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
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>เพิ่มที่อยู่และหมู่บ้าน</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>ระบบดึงพิกัดและที่อยู่อัตโนมัติ (กรุณาตรวจสอบ)</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSave}>
            
            {/* ฟอร์มที่อยู่ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                    <Home size={18} className="text-emerald-500"/> <strong style={{fontSize: '15px'}}>ข้อมูลที่ตั้ง</strong>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>บ้านเลขที่</label>
                  <input type="text" name="houseNo" value={addressData.houseNo} onChange={handleInputChange} placeholder="ไม่มีข้อมูล" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>หมู่ที่</label>
                  <input type="text" name="villageNo" value={addressData.villageNo} onChange={handleInputChange} placeholder="ไม่มีข้อมูล" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>ชื่อหมู่บ้าน / ชุมชน</label>
                  <input type="text" name="villageName" value={addressData.villageName} onChange={handleInputChange} placeholder="กรุณาระบุชื่อหมู่บ้าน" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>ตำบล/แขวง *</label>
                  <input required type="text" name="subDistrict" value={addressData.subDistrict} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>อำเภอ/เขต *</label>
                  <input required type="text" name="district" value={addressData.district} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>จังหวัด *</label>
                  <input required type="text" name="province" value={addressData.province} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                </div>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
              <Navigation size={18} color="#3b82f6" />
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>เลื่อนหมุดเพื่อปรับพิกัด (ภายในรัศมี 500 เมตร)</span>
            </div>

            {/* ส่วนแสดงแผนที่ */}
            <div style={{ border: '2px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={userLocation}
                zoom={16}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                onClick={handleMapClick}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                }}
              >
                {/* รัศมี 500 เมตรรอบตัวผู้ใช้ */}
                <Circle
                  center={userLocation}
                  radius={500}
                  options={{
                    fillColor: "#10b981",
                    fillOpacity: 0.15,
                    strokeColor: "#10b981",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    clickable: false
                  }}
                />

                {/* หมุดแสดงตำแหน่งของผู้ใช้ (จุดสีน้ำเงิน) */}
                <Marker 
                    position={userLocation} 
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#3b82f6",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                    }}
                    title="ตำแหน่งปัจจุบันของคุณ"
                />

                {/* หมุดที่กำลังจะบันทึก */}
                {markerPos && (
                  <Marker 
                    position={markerPos} 
                    animation={window.google.maps.Animation.DROP}
                    draggable={true}
                    onDragEnd={(e) => handleMapClick(e)}
                  />
                )}
              </GoogleMap>
              
              {/* แถบสถานะพิกัด */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', borderTop: '1px solid #e2e8f0', backdropFilter: 'blur(4px)' }}>
                <MapPin size={16} color={markerPos ? "#10b981" : "#ef4444"} />
                {markerPos ? (
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    พิกัดที่เลือก: {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
                  </span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>กรุณาปักหมุดที่ตั้ง</span>
                )}
              </div>
            </div>

            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', marginTop: '25px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}>
              <Save size={20} /> ยืนยันข้อมูลและบันทึก
            </button>
          </form>
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default RegisterVillage;