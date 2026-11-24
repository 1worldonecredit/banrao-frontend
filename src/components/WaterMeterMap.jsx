import React, { useState, useEffect, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { Navigation } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ['places', 'geometry'];

// ค่าพิกัดเริ่มต้น (เพชรบูรณ์) กรณียังไม่มีพิกัด
const DEFAULT_CENTER = { lat: 16.4189, lng: 101.1551 };

/**
 * WaterMeterMap (Google Maps + รัศมี 1,000 เมตร)
 * @param {string} mode - 'pick' (คลิก/ลากปักหมุดใน Modal) | 'view' (ดูหมุดผู้ใช้น้ำทั้งหมู่บ้าน)
 * @param {number|string} lat - ละติจูดที่เลือกอยู่
 * @param {number|string} lng - ลองจิจูดที่เลือกอยู่
 * @param {function} onSelectLocation - callback(lat, lng) เมื่อผู้ใช้คลิกหรือลากหมุด
 * @param {Array} meters - รายการมิเตอร์ทั้งหมด (ใช้ในโหมด 'view')
 * @param {number} radiusMeters - รัศมีวงกลม (ค่าเริ่มต้น 1000 เมตร)
 * @param {string} height - ความสูงแผนที่
 */
const WaterMeterMap = ({
  mode = 'pick',
  lat,
  lng,
  onSelectLocation,
  meters = [],
  radiusMeters = 1000,
  height = '320px'
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [mapInstance, setMapInstance] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [centerPos, setCenterPos] = useState(() => {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (!isNaN(pLat) && !isNaN(pLng)) return { lat: pLat, lng: pLng };

    const firstWithGps = meters.find((m) => m.latitude && m.longitude);
    if (firstWithGps) {
      return { lat: parseFloat(firstWithGps.latitude), lng: parseFloat(firstWithGps.longitude) };
    }
    return DEFAULT_CENTER;
  });

  const onMapLoad = useCallback((map) => setMapInstance(map), []);
  const onMapUnmount = useCallback(() => setMapInstance(null), []);

  // อัปเดตจุดศูนย์กลางเมื่อค่า lat/lng เปลี่ยน (เช่น กดปุ่มดึง GPS ปัจจุบัน)
  useEffect(() => {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      const nextPos = { lat: pLat, lng: pLng };
      setCenterPos(nextPos);
      if (mapInstance) {
        mapInstance.panTo(nextPos);
      }
    }
  }, [lat, lng, mapInstance]);

  // กรณีโหมด view และข้อมูล meters โหลดเสร็จทีหลัง ให้ขยับศูนย์กลางไปที่มิเตอร์แรกที่มีพิกัด
  useEffect(() => {
    if (mode !== 'view' || meters.length === 0) return;
    if (centerPos.lat !== DEFAULT_CENTER.lat || centerPos.lng !== DEFAULT_CENTER.lng) return;

    const firstWithGps = meters.find((m) => m.latitude && m.longitude);
    if (firstWithGps) {
      const nextPos = {
        lat: parseFloat(firstWithGps.latitude),
        lng: parseFloat(firstWithGps.longitude)
      };
      setCenterPos(nextPos);
      if (mapInstance) mapInstance.panTo(nextPos);
    }
  }, [meters, mode, centerPos, mapInstance]);

  // กรณีเปิด Modal เพิ่มใหม่แล้วยังไม่มีพิกัด ให้จับตำแหน่งปัจจุบันอัตโนมัติ
  useEffect(() => {
    if (mode !== 'pick') return;
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (!isNaN(pLat) && !isNaN(pLng)) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenterPos(current);
          if (mapInstance) mapInstance.panTo(current);
        },
        () => {}
      );
    }
  }, [mode, mapInstance]);

  // คลิกบนแผนที่เพื่อปักหมุด (โหมด pick)
  const handleMapClick = (e) => {
    if (mode !== 'pick' || !e.latLng) return;
    const newLat = e.latLng.lat().toFixed(6);
    const newLng = e.latLng.lng().toFixed(6);
    setCenterPos({ lat: parseFloat(newLat), lng: parseFloat(newLng) });
    onSelectLocation?.(newLat, newLng);
  };

  // ลากหมุดเพื่อปรับตำแหน่ง (โหมด pick)
  const handleMarkerDragEnd = (e) => {
    if (!e.latLng) return;
    const newLat = e.latLng.lat().toFixed(6);
    const newLng = e.latLng.lng().toFixed(6);
    setCenterPos({ lat: parseFloat(newLat), lng: parseFloat(newLng) });
    onSelectLocation?.(newLat, newLng);
  };

  // ย้ายจุดศูนย์กลางวงกลม 1,000 เมตรมาที่ตำแหน่งปัจจุบัน (โหมด view)
  const handleCenterToMe = () => {
    if (!navigator.geolocation) return alert('อุปกรณ์นี้ไม่รองรับ GPS');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenterPos(current);
        if (mapInstance) {
          mapInstance.panTo(current);
          mapInstance.setZoom(15);
        }
      },
      () => alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตสิทธิ์ตำแหน่งที่ตั้ง')
    );
  };

  // สร้างไอคอนหมุดแยกสีตามสถานะมิเตอร์
  const getMeterPinIcon = (meter) => {
    if (!window.google?.maps) return undefined;
    let fillColor = '#10b981'; // เขียว: ใช้งานปกติ
    if (meter.meter_status === 'CUT_OFF') fillColor = '#ef4444'; // แดง: ตัดมิเตอร์
    else if (meter.payment_status === 'OVERDUE') fillColor = '#f59e0b'; // เหลือง: ค้างชำระ
    else if (meter.meter_status === 'INACTIVE') fillColor = '#64748b'; // เทา: ไม่ใช้งาน

    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 1.8,
      scale: 1.6,
      anchor: new window.google.maps.Point(12, 22)
    };
  };

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center">
        ไม่สามารถโหลด Google Maps ได้ กรุณาตรวจสอบ VITE_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{ height }}
        className="w-full bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-xs text-slate-500 animate-pulse"
      >
        กำลังโหลดแผนที่ Google Maps...
      </div>
    );
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const activePinPos =
    !isNaN(parsedLat) && !isNaN(parsedLng) ? { lat: parsedLat, lng: parsedLng } : centerPos;

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-sm">
      {/* ปุ่มดึงตำแหน่งปัจจุบันในโหมดดูรวมทั้งหมู่บ้าน */}
      {mode === 'view' && (
        <button
          type="button"
          onClick={handleCenterToMe}
          className="absolute bottom-8 right-2.5 z-10 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-slate-200 flex items-center gap-1.5"
        >
          <Navigation size={13} /> ตำแหน่งฉัน (รัศมี 1 กม.)
        </button>
      )}

      {/* ป้ายบอกรัศมี 1,000 เมตร */}
      <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-900/80 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg pointer-events-none">
        วงกลมรัศมี {radiusMeters.toLocaleString()} เมตร{' '}
        {mode === 'pick' ? '• คลิกแผนที่หรือลากหมุดเพื่อปักพิกัด' : ''}
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={centerPos}
        zoom={mode === 'pick' ? 16 : 15}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        onClick={handleMapClick}
        options={{
          mapTypeId: 'hybrid', // ภาพถ่ายดาวเทียมพร้อมชื่อถนน/สถานที่
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true
        }}
      >
        {/* วงกลมรัศมี 1,000 เมตร (clickable: false เพื่อให้คลิกปักหมุดด้านในได้) */}
        <Circle
          center={mode === 'pick' ? activePinPos : centerPos}
          radius={radiusMeters}
          options={{
            strokeColor: '#2563eb',
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            clickable: false
          }}
        />

        {/* โหมดปักหมุด (Modal เพิ่ม/แก้ไข) */}
        {mode === 'pick' && (
          <Marker
            position={activePinPos}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        )}

        {/* โหมดดูภาพรวมทั้งหมู่บ้าน */}
        {mode === 'view' &&
          meters.map((m) => {
            const mLat = parseFloat(m.latitude);
            const mLng = parseFloat(m.longitude);
            if (isNaN(mLat) || isNaN(mLng)) return null;

            return (
              <Marker
                key={m.meter_id}
                position={{ lat: mLat, lng: mLng }}
                icon={getMeterPinIcon(m)}
                onClick={() => setSelectedMeter(m)}
              />
            );
          })}

        {/* กล่องรายละเอียดเมื่อคลิกหมุดมิเตอร์ */}
        {mode === 'view' && selectedMeter && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedMeter.latitude),
              lng: parseFloat(selectedMeter.longitude)
            }}
            onCloseClick={() => setSelectedMeter(null)}
          >
            <div style={{ fontFamily: 'sans-serif', minWidth: '185px', lineHeight: '1.5' }}>
              <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '13px' }}>
                มิเตอร์: {selectedMeter.meter_code}
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                {selectedMeter.full_name}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                บ้านเลขที่ {selectedMeter.house_no}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                โทร: {selectedMeter.phone || '-'}
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMeter.latitude},${selectedMeter.longitude}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: '6px',
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '12px'
                }}
              >
                เปิดนำทาง Google Maps →
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default WaterMeterMap;