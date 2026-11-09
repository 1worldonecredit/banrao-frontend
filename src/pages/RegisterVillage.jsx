import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Polygon, Marker } from '@react-google-maps/api';
import { ArrowLeft, Map as MapIcon, Save, MapPin } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

// ดึง API Key จาก .env (ฝั่ง Frontend)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ขนาดเริ่มต้นของแผนที่
const mapContainerStyle = {
  width: '100%',
  height: '450px',
  borderRadius: '12px'
};

// ข้อมูลจำลองขอบเขตหมู่บ้าน (Polygon Path) - สามารถเปลี่ยนเป็นพิกัดจริงได้
const sampleVillageBoundary = [
  { lat: 18.618, lng: 98.981 }, // ตัวอย่างพิกัดภาคเหนือ
  { lat: 18.618, lng: 99.001 },
  { lat: 18.600, lng: 99.001 },
  { lat: 18.600, lng: 98.981 }
];

// ฟังก์ชันคณิตศาสตร์: เช็คว่าจุดที่คลิก (Marker) อยู่ในกรอบ Polygon หรือไม่
const isPointInPolygon = (point, vs) => {
  let x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].lng, yi = vs[i].lat;
    let xj = vs[j].lng, yj = vs[j].lat;
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const RegisterVillage = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [villageName, setVillageName] = useState('');
  const [markerPos, setMarkerPos] = useState(null); // ตำแหน่งหมุดที่ปัก
  const [mapInstance, setMapInstance] = useState(null);

  // โหลด Google Maps Script
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // ฟังก์ชันนี้จะทำงานเมื่อแผนที่โหลดเสร็จ
  const onMapLoad = useCallback(function callback(map) {
    setMapInstance(map);
    // สร้าง Bounds เพื่อคำนวณระยะซูมให้พอดีกับ Polygon อัตโนมัติ (FitBounds)
    const bounds = new window.google.maps.LatLngBounds();
    sampleVillageBoundary.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
  }, []);

  const onMapUnmount = useCallback(function callback(map) {
    setMapInstance(null);
  }, []);

  // ฟังก์ชันเมื่อคลิกบนแผนที่
  const handleMapClick = (event) => {
    const clickedLat = event.latLng.lat();
    const clickedLng = event.latLng.lng();
    const point = { lat: clickedLat, lng: clickedLng };

    // เช็คว่าจุดที่คลิก อยู่ในขอบเขต (Polygon) หรือไม่
    if (isPointInPolygon(point, sampleVillageBoundary)) {
      setMarkerPos(point);
    } else {
      alert("❌ ไม่สามารถปักหมุดนอกเขตหมู่บ้านได้ครับ กรุณาปักภายในพื้นที่สีแดง");
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!markerPos) return alert("กรุณาปักหมุดที่ทำการหมู่บ้านก่อนครับ");
    // TODO: ส่งข้อมูลไปยัง API
    alert(`บันทึกหมู่บ้าน: ${villageName} \nพิกัด: ${markerPos.lat.toFixed(5)}, ${markerPos.lng.toFixed(5)}`);
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div style={{textAlign: 'center', padding: '50px'}}>กำลังโหลดแผนที่...</div>;

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
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>ลงทะเบียนหมู่บ้าน</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>สำหรับผู้นำชุมชนกำหนดขอบเขตและที่ตั้ง</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>ชื่อหมู่บ้าน *</label>
              <input 
                required 
                type="text" 
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder="เช่น บ้านโคกสว่าง หมู่ 1"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }}
              />
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
              <MapIcon size={20} color="#3b82f6" />
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>กำหนดพื้นที่และปักหมุดที่ทำการ (คลิกในพื้นที่สีแดง)</span>
            </div>

            {/* ส่วนแสดงแผนที่ */}
            <div style={{ border: '2px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
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
                {/* วาด Polygon ขอบเขตหมู่บ้าน */}
                <Polygon
                  paths={sampleVillageBoundary}
                  options={{
                    fillColor: "#FF0000",
                    fillOpacity: 0.2,
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    clickable: false // ให้ส่ง event click ทะลุไปที่ GoogleMap ได้
                  }}
                />

                {/* แสดงหมุดเมื่อมีการคลิก (เฉพาะในพื้นที่) */}
                {markerPos && (
                  <Marker 
                    position={markerPos} 
                    animation={window.google.maps.Animation.DROP}
                  />
                )}
              </GoogleMap>
              
              {/* แถบสถานะด้านล่างแผนที่ */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', borderTop: '1px solid #e2e8f0', backdropFilter: 'blur(4px)' }}>
                <MapPin size={16} color={markerPos ? "#10b981" : "#ef4444"} />
                {markerPos ? (
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    ปักหมุดแล้ว: {markerPos.lat.toFixed(4)}, {markerPos.lng.toFixed(4)}
                  </span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>ยังไม่ได้ปักหมุดที่ทำการ</span>
                )}
              </div>
            </div>

            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', marginTop: '25px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}>
              <Save size={20} /> บันทึกข้อมูลหมู่บ้าน
            </button>
          </form>
        </div>
      </div>
      
      <BottomNavbar />
    </div>
  );
};

export default RegisterVillage;