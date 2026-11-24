import React, { useState, useEffect, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { Navigation } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ['places', 'geometry'];
const DEFAULT_CENTER = { lat: 16.4189, lng: 101.1551 };

const escapeXml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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

  useEffect(() => {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      const nextPos = { lat: pLat, lng: pLng };
      setCenterPos(nextPos);
      if (mapInstance) mapInstance.panTo(nextPos);
    }
  }, [lat, lng, mapInstance]);

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

  const handleMapClick = (e) => {
    if (mode !== 'pick' || !e.latLng) return;
    const newLat = e.latLng.lat().toFixed(6);
    const newLng = e.latLng.lng().toFixed(6);
    setCenterPos({ lat: parseFloat(newLat), lng: parseFloat(newLng) });
    onSelectLocation?.(newLat, newLng);
  };

  const handleMarkerDragEnd = (e) => {
    if (!e.latLng) return;
    const newLat = e.latLng.lat().toFixed(6);
    const newLng = e.latLng.lng().toFixed(6);
    setCenterPos({ lat: parseFloat(newLat), lng: parseFloat(newLng) });
    onSelectLocation?.(newLat, newLng);
  };

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

  // สร้างหมุดแบบป้ายชื่อ แสดง "บ้านเลขที่ | เลขมิเตอร์" บนแผนที่ชัดเจน
  const getMeterPinIcon = (meter) => {
    if (!window.google?.maps) return undefined;

    let badgeColor = '#059669'; // เขียว: ใช้งานปกติ/ชำระแล้ว
    if (meter.meter_status === 'CUT_OFF') badgeColor = '#dc2626'; // แดง: ตัดมิเตอร์
    else if (meter.payment_status === 'OVERDUE' || meter.bill_payment_status === 'UNPAID') badgeColor = '#d97706'; // เหลือง: ค้างชำระ
    else if (meter.meter_status === 'INACTIVE') badgeColor = '#475569'; // เทา: ไม่ใช้งาน

    const labelText = `บ้าน ${meter.house_no || '-'} | ${meter.meter_code || '-'}`;
    const width = Math.max(120, labelText.length * 8 + 24);
    const heightSvg = 40;
    const halfW = width / 2;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${heightSvg}" viewBox="0 0 ${width} ${heightSvg}">
        <rect x="2" y="2" width="${width - 4}" height="26" rx="13" fill="${badgeColor}" stroke="#ffffff" stroke-width="2" />
        <polygon points="${halfW - 6},27 ${halfW + 6},27 ${halfW},38" fill="${badgeColor}" stroke="#ffffff" stroke-width="1.5" />
        <text x="${halfW}" y="19" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="11.5" font-weight="700">${escapeXml(labelText)}</text>
      </svg>
    `;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(width, heightSvg),
      anchor: new window.google.maps.Point(halfW, heightSvg)
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
      {mode === 'view' && (
        <button
          type="button"
          onClick={handleCenterToMe}
          className="absolute bottom-8 right-2.5 z-10 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-slate-200 flex items-center gap-1.5"
        >
          <Navigation size={13} /> ตำแหน่งฉัน (รัศมี 1 กม.)
        </button>
      )}

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
          mapTypeId: 'hybrid',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true
        }}
      >
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

        {mode === 'pick' && (
          <Marker position={activePinPos} draggable={true} onDragEnd={handleMarkerDragEnd} />
        )}

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

        {mode === 'view' && selectedMeter && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedMeter.latitude),
              lng: parseFloat(selectedMeter.longitude)
            }}
            onCloseClick={() => setSelectedMeter(null)}
          >
            <div style={{ fontFamily: 'sans-serif', minWidth: '190px', lineHeight: '1.5' }}>
              <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '13px' }}>
                บ้านเลขที่ {selectedMeter.house_no} • มิเตอร์ {selectedMeter.meter_code}
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                {selectedMeter.full_name}
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