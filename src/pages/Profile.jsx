import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, Calendar, MapPin, Shield, Camera, Edit3,
  Save, X, Trash2, Home, Users, Briefcase, Award, Copy, Check
} from 'lucide-react';

// =========================================================================
// ⚙️ ตั้งค่า URL ของ Backend API
// =========================================================================
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const Profile = () => {
  // 1. State เก็บข้อมูลผู้ใช้งานที่แสดงผล (ดึงจาก Login + อัปเดตจากฐานข้อมูลจริง)
  const [userData, setUserData] = useState(() => JSON.parse(localStorage.getItem('userData') || '{}'));
  const [occupations, setOccupations] = useState([]); // รายชื่ออาชีพจากตาราง sys_occupations
  const [loading, setLoading] = useState(true);

  // 2. State สำหรับโหมดแก้ไขข้อมูล (Edit Mode)
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Ref สำหรับสั่งกด <input type="file" /> ที่ซ่อนไว้เมื่อคลิกปุ่มกล้อง
  const fileInputRef = useRef(null);

  // 3. State เก็บค่าในฟอร์มตอนกด "แก้ไขข้อมูล"
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    dob: '',
    gender: '',
    house_no: '',
    occupation_id: '',
    household_member_count: 0
  });

  // =========================================================================
  // 🔄 ฟังก์ชันดึงข้อมูลโปรไฟล์ล่าสุดจากฐานข้อมูลจริง
  // =========================================================================
  const fetchLatestProfile = async () => {
    const storedUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const accountId = storedUser.account_id || storedUser.id;

    if (!accountId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/user/profile/${accountId}`);
      const result = await res.json();

      if (result.success && result.data) {
        const db = result.data;
        setOccupations(result.occupations || []);

        // แปลงวันที่เกิดให้อยู่ในรูปแบบ YYYY-MM-DD สำหรับ <input type="date" />
        const formattedDob = db.dob ? String(db.dob).split('T')[0] : '';

        // รวมข้อมูลจาก Login เดิม + ข้อมูลล่าสุดจาก DB
        const mergedUser = {
          ...storedUser,
          firstName: db.first_name || '',
          lastName: db.last_name || '',
          full_name: `${db.first_name || ''} ${db.last_name || ''}`.trim(),
          nickname: db.nickname || '',
          dob: formattedDob,
          genderCode: db.gender || '',
          gender: db.gender === 'MALE' ? 'ชาย' : db.gender === 'FEMALE' ? 'หญิง' : '-',
          house_no: db.house_no || '-',
          occupation_id: db.occupation_id || '',
          occupation: db.occupation_name || '-',
          household_member_count: db.household_member_count || 0,
          userImage: db.user_image || '/profile-img.jpg',
          tier_code: db.tier_code || 'CITIZEN_FREE',
          community_score: db.community_score || 0,
          referral_code: db.referral_code || ''
        };

        setUserData(mergedUser);
        localStorage.setItem('userData', JSON.stringify(mergedUser));

        // เตรียมค่าเริ่มต้นในฟอร์มแก้ไข
        setFormData({
          first_name: db.first_name || '',
          last_name: db.last_name || '',
          nickname: db.nickname || '',
          dob: formattedDob,
          gender: db.gender || '',
          house_no: db.house_no || '',
          occupation_id: db.occupation_id || '',
          household_member_count: db.household_member_count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestProfile();
  }, []);

  // =========================================================================
  // 📸 ฟังก์ชันอัปโหลดรูปโปรไฟล์ (ใช้ API เส้นเดียวกับ Dashboard Card 1)
  // =========================================================================
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formDataImg = new FormData();
    formDataImg.append('profileImage', file);
    formDataImg.append('userId', userData.id || userData.account_id);

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/upload-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataImg
      });

      const data = await response.json();

      if (response.ok && data.imageUrl) {
        // อัปเดต State และ LocalStorage ทันทีเพื่อให้ Sidebar / Dashboard เปลี่ยนตาม
        setUserData((prev) => {
          const updatedData = { ...prev, userImage: data.imageUrl };
          localStorage.setItem('userData', JSON.stringify(updatedData));
          return updatedData;
        });
        alert('✅ อัปโหลดรูปโปรไฟล์สำเร็จ!');
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถอัปโหลดได้'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setUploading(false);
      event.target.value = ''; // รีเซ็ต input เพื่อให้เลือกรูปเดิมซ้ำได้
    }
  };

  // =========================================================================
  // 🗑️ ฟังก์ชันลบรูปโปรไฟล์ (Soft Delete: ปรับ is_active = false)
  // =========================================================================
  const handleDeleteImage = async () => {
    if (!window.confirm('ต้องการลบรูปโปรไฟล์ปัจจุบันใช่หรือไม่?')) return;
    const accountId = userData.account_id || userData.id;

    try {
      const res = await fetch(`${API_URL}/api/user/profile-image/${accountId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setUserData((prev) => {
          const updated = { ...prev, userImage: '/profile-img.jpg' };
          localStorage.setItem('userData', JSON.stringify(updated));
          return updated;
        });
        alert('✅ ลบรูปโปรไฟล์เรียบร้อยแล้ว');
      }
    } catch (err) {
      alert('❌ ลบรูปไม่สำเร็จ: ' + err.message);
    }
  };

  // =========================================================================
  // 💾 ฟังก์ชันบันทึกการเพิ่ม / แก้ไข / ล้างค่าข้อมูลส่วนตัว
  // =========================================================================
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const accountId = userData.account_id || userData.id;
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/user/profile/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        alert('✅ ' + data.message);
        setIsEditing(false);
        fetchLatestProfile(); // โหลดข้อมูลล่าสุดมาแสดงและอัปเดต localStorage
      } else {
        alert('❌ ' + data.message);
      }
    } catch (err) {
      alert('❌ บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ฟังก์ชันช่วยล้างค่าข้อมูลรายช่อง (สำหรับลบข้อมูลในช่องที่ไม่ต้องการ)
  const clearField = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: '' }));
  };

  // ฟังก์ชัน Copy ลิงก์เชิญเพื่อน (Referral Link)
  const handleCopyReferral = () => {
    if (!userData.referral_code) return;
    const shareUrl = `${window.location.origin}/register-citizen?ref=${userData.referral_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // สไตล์ช่องกรอกข้อมูลตอนแก้ไข
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    color: '#ffffff', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
  };

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>กำลังโหลดข้อมูลโปรไฟล์...</div>;
  }

  return (
    <div style={{ paddingBottom: '40px', maxWidth: '1150px', margin: '0 auto' }}>

      {/* ========================================== */}
      {/* 🧭 ส่วนหัวหน้าโปรไฟล์ & ปุ่มสลับโหมดแก้ไข */}
      {/* ========================================== */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#fff', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
          โปรไฟล์ส่วนตัว (My Profile)
        </h2>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px',
              borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              fontWeight: 'bold', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Edit3 size={18} /> แก้ไขข้อมูลส่วนตัว
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
              }}
            >
              <X size={18} /> ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 22px',
                borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                fontWeight: 'bold', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Save size={18} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        )}
      </div>

      {/* 🌟 Grid Layout แบ่ง 2 คอลัมน์ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '25px' }}>

        {/* ========================================== */}
        {/* 🟢 คอลัมน์ซ้าย: รูปโปรไฟล์ + สถานะ + รหัสแนะนำ */}
        {/* ========================================== */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

          {/* ช่อง input file ที่ซ่อนไว้สำหรับเลือกรูป */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />

          {/* กรอบรูป Profile พร้อมปุ่มอัปโหลดรูป และปุ่มลบรูป */}
          <div style={{ position: 'relative', marginBottom: '18px' }}>
            <img
              src={userData.userImage || '/profile-img.jpg'}
              alt="Profile"
              style={{
                width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover',
                border: '4px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                opacity: uploading ? 0.5 : 1
              }}
            />
            {/* ปุ่มกล้อง: เปลี่ยนรูปโปรไฟล์ */}
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title="เปลี่ยนรูปโปรไฟล์"
              style={{
                position: 'absolute', bottom: '5px', right: '5px', backgroundColor: '#4ade80',
                color: '#000', border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
            >
              <Camera size={20} />
            </button>

            {/* ปุ่มถังขยะ: ลบรูปโปรไฟล์ (แสดงเมื่อมีรูปที่ไม่ใช่รูปเริ่มต้น) */}
            {userData.userImage && userData.userImage !== '/profile-img.jpg' && (
              <button
                type="button"
                onClick={handleDeleteImage}
                title="ลบรูปโปรไฟล์"
                style={{
                  position: 'absolute', bottom: '5px', left: '5px', backgroundColor: '#ef4444',
                  color: '#fff', border: 'none', borderRadius: '50%', width: '34px', height: '34px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#fff' }}>
            {userData.full_name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'ผู้ใช้งาน'}
          </h3>
          {userData.nickname && (
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              ({userData.nickname})
            </div>
          )}
          <p style={{ margin: '0 0 18px 0', color: '#4ade80', fontWeight: 'bold', fontSize: '14px' }}>
            {userData.position_name || 'ประชาชนทั่วไป'}
          </p>

          <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: '18px' }}></div>

          {/* สถิติระดับสมาชิก & คะแนนกิจกรรมชุมชน */}
          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginBottom: '18px' }}>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>ระดับแพ็กเกจ (Tier)</p>
              <p style={{ margin: '5px 0 0 0', color: '#38bdf8', fontSize: '15px', fontWeight: 'bold' }}>
                {userData.tier_code || 'CITIZEN_FREE'}
              </p>
            </div>
            <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>คะแนนชุมชน</p>
              <p style={{ margin: '5px 0 0 0', color: '#facc15', fontSize: '18px', fontWeight: 'bold' }}>
                {userData.community_score || 0} คะแนน
              </p>
            </div>
          </div>

          {/* กล่อง Copy ลิงก์เชิญเพื่อน (Referral Code) */}
          {userData.referral_code && (
            <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>รหัสผู้แนะนำของคุณ</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', color: '#4ade80' }}>
                  {userData.referral_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  style={{
                    backgroundColor: copiedRef ? '#10b981' : '#3b82f6', color: '#fff', border: 'none',
                    padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {copiedRef ? <><Check size={14} /> คัดลอกแล้ว</> : <><Copy size={14} /> แชร์ลิงก์</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* 🔵 คอลัมน์ขวา: ข้อมูลส่วนตัว + ข้อมูลหมู่บ้าน + โครงสร้าง 4 มิติ */}
        {/* ========================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', gridColumn: 'span 2' }}>

          {/* การ์ดที่ 1: ข้อมูลส่วนตัว (เพิ่ม / แก้ไข / ล้างค่าได้) */}
          <div className="glass-card">
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              ข้อมูลส่วนตัว (Personal Information)
            </h3>

            {!isEditing ? (
              /* โหมดแสดงผลปกติ */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                <InfoItem icon={<User size={22} />} bg="rgba(168, 85, 247, 0.2)" color="#c084fc" label="ชื่อ - นามสกุล" value={userData.full_name || '-'} />
                <InfoItem icon={<User size={22} />} bg="rgba(236, 72, 153, 0.2)" color="#f472b6" label="ชื่อเล่น" value={userData.nickname || '-'} />
                <InfoItem icon={<Phone size={22} />} bg="rgba(16, 185, 129, 0.2)" color="#34d399" label="เบอร์โทรศัพท์ (Username)" value={userData.username || '-'} />
                <InfoItem icon={<Calendar size={22} />} bg="rgba(234, 179, 8, 0.2)" color="#facc15" label="วันเกิด / อายุ" value={userData.dob ? `${userData.dob} (${userData.age_years || 0} ปี)` : '-'} />
                <InfoItem icon={<Users size={22} />} bg="rgba(59, 130, 246, 0.2)" color="#60a5fa" label="เพศ" value={userData.gender || '-'} />
                <InfoItem icon={<Home size={22} />} bg="rgba(244, 63, 94, 0.2)" color="#fb7185" label="บ้านเลขที่ / ผู้อาศัย" value={`บ้านเลขที่ ${userData.house_no || '-'} (${userData.household_member_count || 0} คน)`} />
                <InfoItem icon={<Briefcase size={22} />} bg="rgba(14, 165, 233, 0.2)" color="#38bdf8" label="อาชีพ" value={userData.occupation || '-'} />
              </div>
            ) : (
              /* โหมดแก้ไขข้อมูล (สามารถเพิ่ม แก้ไข หรือกดปุ่มกากบาทเพื่อล้างค่าได้) */
              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px' }}>ชื่อจริง *</label>
                  <input required type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px' }}>นามสกุล *</label>
                  <input required type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>ชื่อเล่น</span>
                    <span onClick={() => clearField('nickname')} style={{ color: '#f87171', cursor: 'pointer', fontSize: '11px' }}>ล้างค่า</span>
                  </label>
                  <input type="text" placeholder="ระบุชื่อเล่น" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>วันเดือนปีเกิด</span>
                    <span onClick={() => clearField('dob')} style={{ color: '#f87171', cursor: 'pointer', fontSize: '11px' }}>ล้างค่า</span>
                  </label>
                  <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px' }}>เพศ</label>
                  <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} style={inputStyle}>
                    <option value="">-- ไม่ระบุ --</option>
                    <option value="MALE">ชาย</option>
                    <option value="FEMALE">หญิง</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>บ้านเลขที่</span>
                    <span onClick={() => clearField('house_no')} style={{ color: '#f87171', cursor: 'pointer', fontSize: '11px' }}>ล้างค่า</span>
                  </label>
                  <input type="text" value={formData.house_no} onChange={(e) => setFormData({ ...formData, house_no: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px' }}>จำนวนผู้อาศัยในบ้าน (คน)</label>
                  <input type="number" min="0" value={formData.household_member_count} onChange={(e) => setFormData({ ...formData, household_member_count: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px' }}>อาชีพ</label>
                  <select value={formData.occupation_id} onChange={(e) => setFormData({ ...formData, occupation_id: e.target.value })} style={inputStyle}>
                    <option value="">-- ไม่ระบุอาชีพ --</option>
                    {occupations.map((o) => (
                      <option key={o.occupation_id} value={o.occupation_id}>{o.occupation_name}</option>
                    ))}
                  </select>
                </div>
              </form>
            )}
          </div>

          {/* การ์ดที่ 2: ข้อมูลหมู่บ้านและสังกัด 4 มิติ (ดึงจากการ Login) */}
          <div className="glass-card">
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              ข้อมูลหมู่บ้านและสังกัดในระบบ (Village & 4D Status)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px' }}>
              <InfoItem
                icon={<MapPin size={22} />} bg="rgba(244, 63, 94, 0.2)" color="#fb7185"
                label="พื้นที่หมู่บ้าน"
                value={userData.villageName ? `หมู่ ${userData.village_no || '-'} ${userData.villageName} ต.${userData.tambonName || '-'} อ.${userData.amphureName || '-'} จ.${userData.provinceName || '-'}` : '-'}
              />
              <InfoItem
                icon={<Award size={22} />} bg="rgba(234, 179, 8, 0.2)" color="#facc15"
                label="ผู้ใหญ่บ้านในพื้นที่"
                value={userData.headmanName || 'ยังไม่ระบุ'}
              />
              <InfoItem
                icon={<Shield size={22} />} bg="rgba(14, 165, 233, 0.2)" color="#38bdf8"
                label="ตำแหน่ง / หน่วยงาน / แผนก"
                value={`${userData.position_name || 'ประชาชนทั่วไป'}${userData.org_name ? ` (${userData.org_name})` : ''}`}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Component ย่อยสำหรับแสดงแต่ละรายการข้อมูลให้โค้ดอ่านง่ายและแก้ไขสะดวก
const InfoItem = ({ icon, bg, color, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
    <div style={{ backgroundColor: bg, padding: '11px', borderRadius: '12px', color, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{label}</div>
      <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginTop: '2px' }}>{value}</div>
    </div>
  </div>
);

export default Profile;