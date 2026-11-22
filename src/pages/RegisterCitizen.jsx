import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, UserCheck, Search, Phone, Lock, Gift,
  CheckCircle2, ShieldCheck, ArrowLeft
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const RegisterCitizen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // พื้นที่: จังหวัด -> อำเภอ -> ตำบล -> หมู่บ้าน
  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedAmphure, setSelectedAmphure] = useState('');
  const [selectedTambon, setSelectedTambon] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // ข้อมูลผู้ใหญ่บ้าน & Checkbox ยืนยันหมู่บ้าน
  const [villageInfo, setVillageInfo] = useState(null);
  const [confirmMyVillage, setConfirmMyVillage] = useState(false);

  // ค้นหาลูกบ้านด้วยบ้านเลขที่ (ไม่แสดงเลขบัตร ปชช.)
  const [houseNo, setHouseNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [citizenResults, setCitizenResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState(null);

  // ข้อมูลบัญชีสำหรับ Login
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. โหลดจังหวัด
  useEffect(() => {
    fetch(`${API_URL}/api/sys-provinces`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProvinces(data);
      })
      .catch((err) => console.error(err));
  }, []);

  // 2. โหลดอำเภอ
  useEffect(() => {
    setSelectedAmphure('');
    setSelectedTambon('');
    setSelectedVillage('');
    setVillageInfo(null);
    setConfirmMyVillage(false);
    setCitizenResults([]);
    setSelectedCitizen(null);
    if (!selectedProvince) return setAmphures([]);

    fetch(`${API_URL}/api/sys-amphures/${selectedProvince}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setAmphures(data); })
      .catch((err) => console.error(err));
  }, [selectedProvince]);

  // 3. โหลดตำบล
  useEffect(() => {
    setSelectedTambon('');
    setSelectedVillage('');
    setVillageInfo(null);
    setConfirmMyVillage(false);
    setCitizenResults([]);
    setSelectedCitizen(null);
    if (!selectedAmphure) return setTambons([]);

    fetch(`${API_URL}/api/sys-tambons-with-count/${selectedAmphure}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setTambons(data); })
      .catch((err) => console.error(err));
  }, [selectedAmphure]);

  // 4. โหลดหมู่บ้าน
  useEffect(() => {
    setSelectedVillage('');
    setVillageInfo(null);
    setConfirmMyVillage(false);
    setCitizenResults([]);
    setSelectedCitizen(null);
    if (!selectedTambon) return setVillages([]);

    fetch(`${API_URL}/api/villages/by-tambon-id/${selectedTambon}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) =>
            String(a.village_no).localeCompare(String(b.village_no), undefined, { numeric: true })
          );
          setVillages(sorted);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedTambon]);

  // 5. โหลดข้อมูลผู้ใหญ่บ้านเมื่อเลือกหมู่บ้าน
  useEffect(() => {
    setVillageInfo(null);
    setConfirmMyVillage(false);
    setCitizenResults([]);
    setSelectedCitizen(null);
    setHasSearched(false);
    if (!selectedVillage) return;

    fetch(`${API_URL}/api/public/village-headman/${selectedVillage}`)
      .then((res) => res.json())
      .then((res) => { if (res.success) setVillageInfo(res.data); })
      .catch((err) => console.error(err));
  }, [selectedVillage]);

  // ค้นหาสมาชิกจากบ้านเลขที่
  const handleSearchHouse = async () => {
    if (!houseNo.trim()) return alert('กรุณากรอกบ้านเลขที่');
    setSearching(true);
    setHasSearched(true);
    setSelectedCitizen(null);
    try {
      const res = await fetch(`${API_URL}/api/public/search-citizens-by-house?house_no=${encodeURIComponent(houseNo.trim())}`);
      const data = await res.json();
      if (data.success) setCitizenResults(data.data || []);
      else setCitizenResults([]);
    } catch (err) {
      alert('ค้นหาข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  // ส่งข้อมูลลงทะเบียน
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedCitizen) return alert('กรุณาเลือกรายชื่อของคุณก่อน');
    if (password.length < 6) return alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if (password !== confirmPassword) return alert('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/register-citizen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: selectedCitizen.profile_id,
          village_id: selectedVillage,
          username_phone: phone,
          password,
          referred_by: referralCode || null
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ ' + data.message);
        navigate('/login');
      } else {
        alert('❌ ' + data.message);
      }
    } catch (err) {
      alert('❌ เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 12px', borderRadius: '10px',
    border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
    fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', outline: 'none'
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      padding: '24px 14px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start'
    }}>
      <div style={{
        width: '100%', maxWidth: '580px',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px', padding: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)', color: '#1e293b'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '13px' }}
          >
            <ArrowLeft size={16} /> กลับหน้าเข้าสู่ระบบ
          </button>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb' }}>BAN RAO CITIZEN</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            ลงทะเบียนผู้ใช้งาน (ประชาชน)
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#475569' }}>
            ยืนยันหมู่บ้านและตัวตนจากฐานข้อมูลหมู่บ้าน เพื่อความปลอดภัยและไม่ซ้ำซ้อน
          </p>
        </div>

        {/* ขั้นตอนที่ 1: เลือกพื้นที่ */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px' }}>
            <MapPin size={17} color="#2563eb" /> 1. เลือกพื้นที่หมู่บ้านของคุณ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)} style={inputStyle}>
              <option value="">-- เลือกจังหวัด --</option>
              {provinces.map((p) => <option key={p.province_code} value={p.province_code}>{p.province_name_th}</option>)}
            </select>

            <select value={selectedAmphure} onChange={(e) => setSelectedAmphure(e.target.value)} disabled={!selectedProvince} style={{ ...inputStyle, opacity: !selectedProvince ? 0.6 : 1 }}>
              <option value="">-- เลือกอำเภอ --</option>
              {amphures.map((a) => <option key={a.amphure_code} value={a.amphure_code}>{a.amphure_name_th}</option>)}
            </select>

            <select value={selectedTambon} onChange={(e) => setSelectedTambon(e.target.value)} disabled={!selectedAmphure} style={{ ...inputStyle, opacity: !selectedAmphure ? 0.6 : 1 }}>
              <option value="">-- เลือกตำบล --</option>
              {tambons.map((t) => <option key={t.tambon_id} value={t.tambon_id}>{t.tambon_name_th}</option>)}
            </select>

            <select value={selectedVillage} onChange={(e) => setSelectedVillage(e.target.value)} disabled={!selectedTambon} style={{ ...inputStyle, opacity: !selectedTambon ? 0.6 : 1 }}>
              <option value="">-- เลือกหมู่บ้าน --</option>
              {villages.map((v) => <option key={v.village_id} value={v.village_id}>หมู่ {v.village_no} {v.village_name}</option>)}
            </select>
          </div>
        </div>

        {/* ขั้นตอนที่ 2: การ์ดข้อมูลผู้ใหญ่บ้าน + Checkbox ยืนยันหมู่บ้าน */}
        {villageInfo && (
          <div style={{
            backgroundColor: '#eff6ff', padding: '16px', borderRadius: '16px',
            border: '1.5px solid #93c5fd', marginBottom: '16px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#1d4ed8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> ข้อมูลจากระบบบริหารจัดการหมู่บ้านเพื่อการพัฒนา
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
              <img
                src={villageInfo.headman_image || '/profile-img.jpg'}
                alt="ผู้ใหญ่บ้าน"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                  หมู่ {villageInfo.village_no} {villageInfo.village_name} ต.{villageInfo.tambon_name_th} อ.{villageInfo.amphure_name_th} จ.{villageInfo.province_name_th}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  ผู้ใหญ่บ้าน: {villageInfo.headman_first_name ? `${villageInfo.headman_first_name} ${villageInfo.headman_last_name || ''}` : 'ยังไม่ระบุในระบบ'}
                  {villageInfo.headman_nickname ? ` (${villageInfo.headman_nickname})` : ''}
                </div>
              </div>
            </div>

            <label style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px',
              padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
              backgroundColor: confirmMyVillage ? '#dcfce7' : '#ffffff',
              border: confirmMyVillage ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
              fontWeight: 800, fontSize: '14px', color: confirmMyVillage ? '#15803d' : '#1e293b'
            }}>
              <input
                type="checkbox"
                checked={confirmMyVillage}
                onChange={(e) => setConfirmMyVillage(e.target.checked)}
                style={{ width: '18px', height: '18px', margin: 0, accentColor: '#16a34a', cursor: 'pointer' }}
              />
              <span>ยืนยัน นี่คือหมู่บ้านของฉัน</span>
            </label>
          </div>
        )}

        {/* ขั้นตอนที่ 3: ค้นหาบ้านเลขที่ (แสดงหลังติ๊กยืนยันหมู่บ้านเท่านั้น) */}
        {confirmMyVillage && (
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 800, color: '#1e3a8a', marginBottom: '10px' }}>
              <Search size={17} color="#2563eb" /> 2. ค้นหาตัวตนด้วยบ้านเลขที่
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="กรอกบ้านเลขที่ เช่น 45/6"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleSearchHouse}
                disabled={searching}
                style={{
                  padding: '0 18px', borderRadius: '10px', border: 'none',
                  backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0
                }}
              >
                {searching ? 'ค้นหา...' : 'ค้นหา'}
              </button>
            </div>

            {hasSearched && (
              <div style={{ marginTop: '12px' }}>
                {citizenResults.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#b45309', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    ไม่พบรายชื่อในบ้านเลขที่นี้ กรุณาติดต่อผู้ใหญ่บ้านเพื่อเพิ่มข้อมูลเข้าสู่ระบบ
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>เลือกรายชื่อของคุณ (ระบบสงวนเลขบัตรประชาชนเพื่อความปลอดภัย):</div>
                    {citizenResults.map((c) => {
                      const isSelected = selectedCitizen?.profile_id === c.profile_id;
                      return (
                        <button
                          key={c.profile_id}
                          type="button"
                          disabled={c.already_registered}
                          onClick={() => setSelectedCitizen(c)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: '12px',
                            border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            backgroundColor: c.already_registered ? '#f1f5f9' : isSelected ? '#eff6ff' : '#ffffff',
                            opacity: c.already_registered ? 0.6 : 1,
                            cursor: c.already_registered ? 'not-allowed' : 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                              {c.first_name} {c.last_name} {c.nickname ? `(${c.nickname})` : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>บ้านเลขที่ {c.house_no}</div>
                          </div>
                          {c.already_registered ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>ลงทะเบียนแล้ว</span>
                          ) : isSelected ? (
                            <CheckCircle2 size={20} color="#2563eb" />
                          ) : (
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>เลือก</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ขั้นตอนที่ 4: กรอกเบอร์โทร + รหัสผู้แนะนำ + รหัสผ่าน */}
        {selectedCitizen && (
          <form onSubmit={handleRegister} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px' }}>
              <UserCheck size={17} color="#059669" /> 3. ตั้งค่าบัญชีเข้าสู่ระบบ ({selectedCitizen.first_name} {selectedCitizen.last_name})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                  <Phone size={14} /> เบอร์โทรศัพท์ (ใช้เป็น Username เข้าสู่ระบบ) *
                </label>
                <input required type="tel" placeholder="เช่น 0812345678" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                  <Gift size={14} /> รหัสผู้แนะนำ (จากการ Copy แชร์ — ถ้ามี)
                </label>
                <input type="text" placeholder="วางรหัสผู้แนะนำที่นี่ (ไม่บังคับ)" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    <Lock size={14} /> รหัสผ่าน *
                  </label>
                  <input required type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    <Lock size={14} /> ยืนยันรหัสผ่าน *
                  </label>
                  <input required type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '6px', width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                  background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff', fontWeight: 800, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการลงทะเบียน'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterCitizen;