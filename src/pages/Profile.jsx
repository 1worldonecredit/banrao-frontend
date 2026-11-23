import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, Calendar, MapPin, Shield, Camera, Edit3,
  Save, X, Trash2, Home, Users, Briefcase, Award, Copy, Check,
  Plus, Image as ImageIcon, Globe, Lock, Eye, EyeOff, Sparkles,
  MessageCircle, Reply, Ban, Send
} from 'lucide-react';
import Layout from '../components/Layout';

// =========================================================================
// ⚙️ ตั้งค่า URL และข้อมูลคงที่ (เดือนภาษาไทย / ระดับการมองเห็น Story)
// =========================================================================
const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const VISIBILITY_OPTIONS = [
  { value: 'PRIVATE', label: '🔒 ส่วนตัว (เห็นเฉพาะฉัน)' },
  { value: 'FRIENDS', label: '👥 เฉพาะเพื่อน' },
  { value: 'VILLAGE', label: '🏡 เฉพาะหมู่บ้านของฉัน' },
  { value: 'TAMBON', label: '📍 เฉพาะตำบลของฉัน' },
  { value: 'AMPHURE', label: '🗺️ เฉพาะอำเภอของฉัน' },
  { value: 'PROVINCE', label: '🏛️ เฉพาะจังหวัดของฉัน' },
  { value: 'PUBLIC', label: '🌍 สาธารณะ (ทุกคนเห็นได้)' }
];

const TEXT_COLORS = ['#ffffff', '#000000', '#facc15', '#ef4444', '#22c55e', '#3b82f6', '#ec4899'];

// ฟังก์ชันแปลง YYYY-MM-DD เป็นวันที่ภาษาไทย (เช่น 15 มกราคม 2533)
const formatThaiDate = (dobStr) => {
  if (!dobStr || dobStr.startsWith('1900')) return '-';
  const parts = String(dobStr).split('T')[0].split('-');
  if (parts.length !== 3) return '-';
  const yearBE = Number(parts[0]) + 543;
  const monthName = THAI_MONTHS[Number(parts[1]) - 1] || '';
  const day = Number(parts[2]);
  return `${day} ${monthName} ${yearBE}`;
};

const Profile = () => {
  // 1. State ข้อมูลผู้ใช้งาน, รายชื่ออาชีพ, รายชื่อผู้ที่แนะนำ และ Story
  const [userData, setUserData] = useState(() => JSON.parse(localStorage.getItem('userData') || '{}'));
  const [occupations, setOccupations] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. State โหมดแก้ไขโปรไฟล์ & อัปโหลดรูป
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const fileInputRef = useRef(null);

  // 3. State ฟอร์มแก้ไขโปรไฟล์ + แยกวัน/เดือน/พ.ศ. แบบไทย
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', nickname: '',
    dob: '', gender: '', house_no: '', occupation_id: '', household_member_count: 0
  });
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYearBE, setDobYearBE] = useState('');

  // 4. State สำหรับ Modal สร้าง My Story
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [storyPreview, setStoryPreview] = useState('');
  const [storyIsVideo, setStoryIsVideo] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyColor, setStoryColor] = useState('#ffffff');
  const [storySize, setStorySize] = useState(22);
  const [storyVisibility, setStoryVisibility] = useState('VILLAGE');
  const [postingStory, setPostingStory] = useState(false);

  const [storyTextX, setStoryTextX] = useState(50);   // ตำแหน่งแนวนอน (%) 0-100
  const [storyTextY, setStoryTextY] = useState(50);   // ตำแหน่งแนวตั้ง (%) 0-100
  const [storyBlur, setStoryBlur] = useState(0);      // ความเบลอพื้นหลัง (%) 0-100

  const [editingStoryId, setEditingStoryId] = useState(null);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDesc, setStoryDesc] = useState('');
  const [storyCoverFile, setStoryCoverFile] = useState(null);


  const [isDraggingText, setIsDraggingText] = useState(false);
  const previewBoxRef = useRef(null);

  // ฟังก์ชันคำนวณตำแหน่งตอนลาก (รองรับทั้งเมาส์และนิ้วสัมผัส)
  const updateTextPosition = (clientX, clientY) => {
    if (!previewBoxRef.current) return;
    const rect = previewBoxRef.current.getBoundingClientRect();
    const x = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - rect.top) / rect.height) * 100));
    setStoryTextX(Math.round(x));
    setStoryTextY(Math.round(y));
  };

  // สร้างรายการปี พ.ศ. (ย้อนหลัง 100 ปี)
  const currentYearBE = new Date().getFullYear() + 543;
  const yearsBE = Array.from({ length: 100 }, (_, i) => currentYearBE - i);

  // =========================================================================
  // 🔄 ดึงข้อมูลโปรไฟล์ + รายชื่อผู้ที่เราแนะนำ + My Story ทั้งหมดพร้อมกัน
  // =========================================================================
  const fetchAllData = async () => {
    const storedUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const accountId = storedUser.account_id || storedUser.id;
    if (!accountId) {
      setLoading(false);
      return;
    }

    try {
      const [profileRes, refRes, storyRes] = await Promise.all([
        fetch(`${API_URL}/api/user/profile/${accountId}`).then((r) => r.json()),
        fetch(`${API_URL}/api/user/referrals/${accountId}`).then((r) => r.json()).catch(() => ({ success: false })),
        fetch(`${API_URL}/api/user/stories/${accountId}`).then((r) => r.json()).catch(() => ({ success: false }))
      ]);

      if (profileRes.success && profileRes.data) {
        const db = profileRes.data;
        setOccupations(profileRes.occupations || []);

        const formattedDob = db.dob ? String(db.dob).split('T')[0] : '';
        const isDummy = formattedDob.startsWith('1900');

        const mergedUser = {
          ...storedUser,
          firstName: db.first_name || '',
          lastName: db.last_name || '',
          full_name: `${db.first_name || ''} ${db.last_name || ''}`.trim(),
          nickname: db.nickname || '',
          dob: isDummy ? '' : formattedDob,
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

        setFormData({
          first_name: db.first_name || '',
          last_name: db.last_name || '',
          nickname: db.nickname || '',
          dob: isDummy ? '' : formattedDob,
          gender: db.gender || '',
          house_no: db.house_no || '',
          occupation_id: db.occupation_id || '',
          household_member_count: db.household_member_count || 0
        });

        // แยกวัน/เดือน/พ.ศ. ใส่ Dropdown แบบไทย
        if (formattedDob && !isDummy) {
          const [y, m, d] = formattedDob.split('-');
          setDobYearBE(String(Number(y) + 543));
          setDobMonth(String(Number(m)));
          setDobDay(String(Number(d)));
        } else {
          setDobYearBE('');
          setDobMonth('');
          setDobDay('');
        }
      }

      if (refRes.success && Array.isArray(refRes.data)) setReferrals(refRes.data);
      if (storyRes.success && Array.isArray(storyRes.data)) setStories(storyRes.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // =========================================================================
  // 📸 อัปโหลด & ลบรูปโปรไฟล์ (API เส้นเดียวกับ Dashboard Card 1)
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
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataImg
      });
      const data = await response.json();

      if (response.ok && data.imageUrl) {
        setUserData((prev) => {
          const updated = { ...prev, userImage: data.imageUrl };
          localStorage.setItem('userData', JSON.stringify(updated));
          return updated;
        });
        alert('✅ อัปโหลดรูปโปรไฟล์สำเร็จ!');
      } else {
        alert('❌ ' + (data.error || 'ไม่สามารถอัปโหลดได้'));
      }
    } catch (error) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('ต้องการลบรูปโปรไฟล์ปัจจุบันใช่หรือไม่?')) return;
    const accountId = userData.account_id || userData.id;
    try {
      const res = await fetch(`${API_URL}/api/user/profile-image/${accountId}`, { method: 'DELETE' });
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
      alert('❌ ลบรูปไม่สำเร็จ');
    }
  };

  // =========================================================================
  // 💾 บันทึกข้อมูลส่วนตัว (แปลง วัน/เดือน/พ.ศ. กลับเป็น YYYY-MM-DD)
  // =========================================================================
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const accountId = userData.account_id || userData.id;

    let finalDob = '';
    if (dobDay && dobMonth && dobYearBE) {
      const yearAD = Number(dobYearBE) - 543;
      const mm = String(dobMonth).padStart(2, '0');
      const dd = String(dobDay).padStart(2, '0');
      finalDob = `${yearAD}-${mm}-${dd}`;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/user/profile/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, dob: finalDob })
      });
      const data = await res.json();

      if (data.success) {
        alert('✅ ' + data.message);
        setIsEditing(false);
        fetchAllData();
      } else {
        alert('❌ ' + data.message);
      }
    } catch (err) {
      alert('❌ บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // 🎬 ฟังก์ชันจัดการ My Story (เลือกรูป/วิดีโอ, โพสต์, ลบ)
  // =========================================================================
  const handleSelectStoryFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStoryFile(file);
    setStoryIsVideo(file.type.startsWith('video/'));
    setStoryPreview(URL.createObjectURL(file));
  };

  const handlePostStory = async (e) => {
    e.preventDefault();
    if (!editingStoryId && !storyFile) return alert('กรุณาเลือกรูปภาพหรือวิดีโอก่อนโพสต์');

    const accountId = userData.account_id || userData.id;
    setPostingStory(true);
    try {
      let data;
      if (editingStoryId) {
        // โหมดแก้ไขโพสต์เดิม
        const res = await fetch(`${API_URL}/api/user/stories/${editingStoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: storyTitle, description: storyDesc, overlay_text: storyText,
            text_color: storyColor, text_size: storySize, text_x: storyTextX,
            text_y: storyTextY, bg_blur: storyBlur, visibility: storyVisibility
          })
        });
        data = await res.json();
      } else {
        // โหมดสร้างโพสต์ใหม่
        const fd = new FormData();
        fd.append('storyMedia', storyFile);
        if (storyCoverFile) fd.append('coverImage', storyCoverFile);
        fd.append('account_id', accountId);
        if (userData.village_id) fd.append('village_id', userData.village_id);
        fd.append('title', storyTitle);
        fd.append('description', storyDesc);
        fd.append('overlay_text', storyText);
        fd.append('text_color', storyColor);
        fd.append('text_size', storySize);
        fd.append('text_x', storyTextX);
        fd.append('text_y', storyTextY);
        fd.append('bg_blur', storyBlur);
        fd.append('visibility', storyVisibility);
        const res = await fetch(`${API_URL}/api/user/stories`, { method: 'POST', body: fd });
        data = await res.json();
      }

      if (data.success) {
        alert('✅ ' + data.message);
        setStoryModalOpen(false);
        setEditingStoryId(null);
        setStoryFile(null);
        setStoryCoverFile(null);
        setStoryPreview('');
        setStoryTitle('');
        setStoryDesc('');
        setStoryText('');
        fetchAllData();
      } else {
        alert('❌ ' + data.message);
      }
    } catch (err) {
      alert('❌ บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setPostingStory(false);
    }
  };

  const openEditStory = (st) => {
    setEditingStoryId(st.story_id);
    setStoryTitle(st.title || '');
    setStoryDesc(st.description || '');
    setStoryText(st.overlay_text || '');
    setStoryColor(st.text_color || '#ffffff');
    setStorySize(st.text_size || 22);
    setStoryTextX(st.text_x ?? 50);
    setStoryTextY(st.text_y ?? 50);
    setStoryBlur(st.bg_blur || 0);
    setStoryVisibility(st.visibility || 'VILLAGE');
    setStoryPreview(st.media_url);
    setStoryIsVideo(st.media_type === 'VIDEO');
    setStoryFile(null);
    setStoryModalOpen(true);
  };

  const handleToggleHideStory = async (st) => {
    const res = await fetch(`${API_URL}/api/user/stories/${st.story_id}/toggle-hide`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_hidden: !st.is_hidden })
    }).then((r) => r.json()).catch(() => ({}));
    if (res.success) fetchAllData();
  };

// State & ฟังก์ชันจัดการคอมเมนต์บนหน้า My Story (ดู / ตอบกลับ / ลบ / บล็อก)
  const [openCommentStoryId, setOpenCommentStoryId] = useState(null);
  const [storyComments, setStoryComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const loadStoryComments = async (storyId) => {
    const res = await fetch(`${API_URL}/api/stories/${storyId}/comments`).then((r) => r.json()).catch(() => ({}));
    if (res.success) setStoryComments(res.data || []);
  };

  const handleOpenComments = (storyId) => {
    if (openCommentStoryId === storyId) {
      setOpenCommentStoryId(null);
      setReplyingTo(null);
      return;
    }
    setOpenCommentStoryId(storyId);
    setReplyingTo(null);
    loadStoryComments(storyId);
  };

  const handleSendStoryComment = async (e, storyId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const myAccountId = userData.account_id || userData.id;
    const finalText = replyingTo ? `@${replyingTo.author_name} ${commentText.trim()}` : commentText.trim();
    const res = await fetch(`${API_URL}/api/stories/${storyId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: myAccountId,
        comment_text: finalText,
        parent_comment_id: replyingTo?.comment_id || null
      })
    }).then((r) => r.json()).catch(() => ({}));

    if (res.success) {
      setCommentText('');
      setReplyingTo(null);
      loadStoryComments(storyId);
    }
  };

  const handleDeleteStoryComment = async (storyId, commentId) => {
    if (!window.confirm('ต้องการลบคอมเมนต์นี้ใช่หรือไม่?')) return;
    const res = await fetch(`${API_URL}/api/stories/comments/${commentId}/delete`, { method: 'PATCH' }).then((r) => r.json()).catch(() => ({}));
    if (res.success) loadStoryComments(storyId);
  };

  const handleBlockCommenter = async (targetId, targetName) => {
    if (!window.confirm(`ต้องการบล็อก "${targetName}" ไม่ให้เห็นและคอมเมนต์โพสต์ของคุณใช่หรือไม่?`)) return;
    const myAccountId = userData.account_id || userData.id;
    const res = await fetch(`${API_URL}/api/users/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocker_id: myAccountId, blocked_id: targetId })
    }).then((r) => r.json()).catch(() => ({}));
    if (res.success) alert('✅ ' + res.message);
  };


  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('ต้องการลบ Story นี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`${API_URL}/api/user/stories/${storyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchAllData();
    } catch (err) {
      alert('❌ ลบ Story ไม่สำเร็จ');
    }
  };

  const handleCopyReferral = () => {
    if (!userData.referral_code) return;
    const shareUrl = `${window.location.origin}/register-citizen?ref=${userData.referral_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '22px',
    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.07)',
    border: '1px solid #e2e8f0',
    color: '#0f172a'
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1px solid #cbd5e1', backgroundColor: '#f8fafc',
    color: '#0f172a', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ color: '#475569', textAlign: 'center', paddingTop: '100px', fontWeight: 600 }}>
          กำลังโหลดข้อมูลโปรไฟล์...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ✨ เพิ่ม paddingTop: '80px' เพื่อไม่ให้ Top Navbar บังหัวข้อและปุ่มแก้ไข */}
      <div style={{ padding: '80px 16px 100px', maxWidth: '1150px', margin: '0 auto', color: '#0f172a' }}>

        {/* ส่วนหัวหน้าโปรไฟล์ & ปุ่มแก้ไข */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '21px' }}>
            โปรไฟล์ส่วนตัว (My Profile)
          </h2>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px',
                borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                fontWeight: 'bold', fontSize: '13.5px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Edit3 size={17} /> แก้ไขข้อมูลส่วนตัว
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                  padding: '9px 16px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
                }}
              >
                <X size={17} /> ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  backgroundColor: '#059669', color: '#fff', border: 'none', padding: '9px 18px',
                  borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
                }}
              >
                <Save size={17} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          )}
        </div>

        {/* Grid หลัก */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '22px' }}>

          {/* 🟢 คอลัมน์ซ้าย: รูปโปรไฟล์ + สถานะ + รหัสแนะนำ */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <img
                src={userData.userImage || '/profile-img.jpg'}
                alt="Profile"
                style={{
                  width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover',
                  border: '4px solid #e2e8f0', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                  opacity: uploading ? 0.5 : 1
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                title="เปลี่ยนรูปโปรไฟล์"
                style={{
                  position: 'absolute', bottom: '4px', right: '4px', backgroundColor: '#10b981',
                  color: '#fff', border: 'none', borderRadius: '50%', width: '38px', height: '38px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}
              >
                <Camera size={18} />
              </button>

              {userData.userImage && userData.userImage !== '/profile-img.jpg' && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  title="ลบรูปโปรไฟล์"
                  style={{
                    position: 'absolute', bottom: '4px', left: '4px', backgroundColor: '#ef4444',
                    color: '#fff', border: 'none', borderRadius: '50%', width: '34px', height: '34px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {userData.full_name || 'ผู้ใช้งาน'}
            </h3>
            {userData.nickname && <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '6px' }}>({userData.nickname})</div>}
            <span style={{ display: 'inline-block', margin: '4px 0 16px 0', padding: '4px 14px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold', fontSize: '13px' }}>
              {userData.position_name || 'ประชาชนทั่วไป'}
            </span>

            <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '16px' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginBottom: '16px' }}>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px', fontWeight: 600 }}>ระดับแพ็กเกจ (Tier)</p>
                <p style={{ margin: '4px 0 0 0', color: '#0284c7', fontSize: '14px', fontWeight: 800 }}>{userData.tier_code || 'CITIZEN_FREE'}</p>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px', fontWeight: 600 }}>คะแนนชุมชน</p>
                <p style={{ margin: '4px 0 0 0', color: '#d97706', fontSize: '16px', fontWeight: 800 }}>{userData.community_score || 0} คะแนน</p>
              </div>
            </div>

            {userData.referral_code && (
              <div style={{ width: '100%', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>รหัสผู้แนะนำของคุณ</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: '#059669' }}>{userData.referral_code}</span>
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    style={{
                      backgroundColor: copiedRef ? '#059669' : '#2563eb', color: '#fff', border: 'none',
                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {copiedRef ? <><Check size={14} /> คัดลอกแล้ว</> : <><Copy size={14} /> แชร์ลิงก์</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🔵 คอลัมน์ขวา: ข้อมูลส่วนตัว + หมู่บ้าน + My Story + รายชื่อผู้ที่เราแนะนำ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', gridColumn: 'span 1' }}>

            {/* การ์ดที่ 1: ข้อมูลส่วนตัว */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 18px 0', color: '#0f172a', fontSize: '16px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                ข้อมูลส่วนตัว (Personal Information)
              </h3>

              {!isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                  <InfoItem icon={<User size={19} />} bg="#f3e8ff" color="#7e22ce" label="ชื่อ - นามสกุล" value={userData.full_name || '-'} />
                  <InfoItem icon={<User size={19} />} bg="#fce7f3" color="#be185d" label="ชื่อเล่น" value={userData.nickname || '-'} />
                  <InfoItem icon={<Phone size={19} />} bg="#d1fae5" color="#047857" label="เบอร์โทรศัพท์ (Username)" value={userData.username || '-'} />
                  <InfoItem icon={<Calendar size={19} />} bg="#fef3c7" color="#b45309" label="วันเดือนปีเกิด (แบบไทย)" value={formatThaiDate(userData.dob)} />
                  <InfoItem icon={<Users size={19} />} bg="#dbeafe" color="#1d4ed8" label="เพศ" value={userData.gender || '-'} />
                  <InfoItem icon={<Home size={19} />} bg="#ffe4e6" color="#be123c" label="บ้านเลขที่ / ผู้อาศัย" value={`บ้านเลขที่ ${userData.house_no || '-'} (${userData.household_member_count || 0} คน)`} />
                  <InfoItem icon={<Briefcase size={19} />} bg="#e0f2fe" color="#0369a1" label="อาชีพ" value={userData.occupation || '-'} />
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>ชื่อจริง *</label>
                    <input required type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>นามสกุล *</label>
                    <input required type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>ชื่อเล่น</span>
                      <span onClick={() => setFormData({ ...formData, nickname: '' })} style={{ color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>ล้างค่า</span>
                    </label>
                    <input type="text" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} style={inputStyle} />
                  </div>

                  {/* ✨ วันเดือนปีเกิด (แบบไทย: วันที่ / เดือน / พ.ศ.) */}
                  <div style={{ gridColumn: '1 / -1', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>วันเดือนปีเกิด (แบบไทย)</span>
                      <span onClick={() => { setDobDay(''); setDobMonth(''); setDobYearBE(''); }} style={{ color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>ล้างค่า</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: '8px' }}>
                      <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} style={inputStyle}>
                        <option value="">- วันที่ -</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} style={inputStyle}>
                        <option value="">- เดือน -</option>
                        {THAI_MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                      </select>
                      <select value={dobYearBE} onChange={(e) => setDobYearBE(e.target.value)} style={inputStyle}>
                        <option value="">- พ.ศ. -</option>
                        {yearsBE.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>เพศ</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} style={inputStyle}>
                      <option value="">-- ไม่ระบุ --</option>
                      <option value="MALE">ชาย</option>
                      <option value="FEMALE">หญิง</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>บ้านเลขที่</span>
                      <span onClick={() => setFormData({ ...formData, house_no: '' })} style={{ color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>ล้างค่า</span>
                    </label>
                    <input type="text" value={formData.house_no} onChange={(e) => setFormData({ ...formData, house_no: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>จำนวนผู้อาศัยในบ้าน (คน)</label>
                    <input type="number" min="0" value={formData.household_member_count} onChange={(e) => setFormData({ ...formData, household_member_count: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>อาชีพ</label>
                    <select value={formData.occupation_id} onChange={(e) => setFormData({ ...formData, occupation_id: e.target.value })} style={inputStyle}>
                      <option value="">-- ไม่ระบุอาชีพ --</option>
                      {occupations.map((o) => <option key={o.occupation_id} value={o.occupation_id}>{o.occupation_name}</option>)}
                    </select>
                  </div>
                </form>
              )}
            </div>

            {/* การ์ดที่ 2: ข้อมูลหมู่บ้านและสังกัด 4 มิติ */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 18px 0', color: '#0f172a', fontSize: '16px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                ข้อมูลหมู่บ้านและสังกัดในระบบ (Village & 4D Status)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                <InfoItem
                  icon={<MapPin size={19} />} bg="#ffe4e6" color="#be123c"
                  label="พื้นที่หมู่บ้าน"
                  value={userData.villageName ? `หมู่ ${userData.village_no || '-'} ${userData.villageName} ต.${userData.tambonName || '-'} อ.${userData.amphureName || '-'} จ.${userData.provinceName || '-'}` : '-'}
                />
                <InfoItem icon={<Award size={19} />} bg="#fef3c7" color="#b45309" label="ผู้ใหญ่บ้านในพื้นที่" value={userData.headmanName || 'ยังไม่ระบุ'} />
                <InfoItem
                  icon={<Shield size={19} />} bg="#e0f2fe" color="#0369a1"
                  label="ตำแหน่ง / หน่วยงาน"
                  value={`${userData.position_name || 'ประชาชนทั่วไป'}${userData.org_name ? ` (${userData.org_name})` : ''}`}
                />
              </div>
            </div>

          </div>
        </div>

              {/* ================================================================= */}
        {/* 🎬 ส่วนที่ 3: MY STORY (แสดง/ซ่อน, แก้ไข, ลบ, ดู/ตอบคอมเมนต์) */}
        {/* ================================================================= */}
        <div style={{ ...cardStyle, marginTop: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>My Story ({stories.length})</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingStoryId(null);
                setStoryTitle('');
                setStoryDesc('');
                setStoryText('');
                setStoryFile(null);
                setStoryCoverFile(null);
                setStoryPreview('');
                setStoryIsVideo(false);
                setStoryBlur(0);
                setStoryTextX(50);
                setStoryTextY(50);
                setStoryModalOpen(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)', color: '#fff', border: 'none',
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Plus size={16} /> สร้าง Story
            </button>
          </div>

          {stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1', fontSize: '14px' }}>
              ยังไม่มี Story ที่โพสต์ กดปุ่ม <strong>"+ สร้าง Story"</strong> เพื่อแชร์เรื่องราวในชุมชนของคุณ
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {stories.map((st) => {
                const visLabel = VISIBILITY_OPTIONS.find((v) => v.value === st.visibility)?.label || st.visibility;
                return (
                  <div key={st.story_id} style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 6px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', opacity: st.is_hidden ? 0.65 : 1 }}>
                    {/* รูปภาพ / วิดีโอ (ขนาด 4:5 เท่ากันทุกการ์ด) */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', backgroundColor: '#0f172a', overflow: 'hidden' }}>
                      {st.media_type === 'VIDEO' ? (
                        <video
                          src={st.media_url}
                          poster={st.cover_url || undefined}
                          controls
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            filter: st.bg_blur > 0 ? `blur(${(st.bg_blur / 100) * 16}px)` : 'none',
                            transform: st.bg_blur > 0 ? 'scale(1.06)' : 'none'
                          }}
                        />
                      ) : (
                        <img
                          src={st.media_url}
                          alt={st.title || 'Story'}
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            filter: st.bg_blur > 0 ? `blur(${(st.bg_blur / 100) * 16}px)` : 'none',
                            transform: st.bg_blur > 0 ? 'scale(1.06)' : 'none'
                          }}
                        />
                      )}

                      {st.overlay_text && (
                        <div style={{
                          position: 'absolute', left: `${st.text_x ?? 50}%`, top: `${st.text_y ?? 50}%`,
                          transform: 'translate(-50%, -50%)', maxWidth: '90%', textAlign: 'center', pointerEvents: 'none',
                          color: st.text_color || '#ffffff', fontSize: `${st.text_size || 20}px`,
                          fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.85)', wordBreak: 'break-word'
                        }}>
                          {st.overlay_text}
                        </div>
                      )}

                      {/* ป้ายความเป็นส่วนตัว + ป้ายสถานะ แสดง/ซ่อน */}
                      <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(15, 23, 42, 0.78)', color: '#fff', padding: '4px 8px', borderRadius: '999px' }}>
                          {visLabel.split(' ')[0]} {visLabel.split(' ')[1]}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '999px',
                          backgroundColor: st.is_hidden ? '#fee2e2' : '#dcfce7',
                          color: st.is_hidden ? '#b91c1c' : '#15803d'
                        }}>
                          {st.is_hidden ? 'ซ่อนอยู่' : 'กำลังแสดง'}
                        </span>
                      </div>
                    </div>

                    {/* หัวข้อ & คำอธิบาย */}
                    <div style={{ padding: '10px 12px', flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                        {st.title || '(ไม่มีหัวข้อ)'}
                      </div>
                      {st.description && (
                        <div style={{ fontSize: '12px', color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {st.description}
                        </div>
                      )}
                    </div>

                    {/* แถบปุ่มจัดการ: แก้ไข / ซ่อน-แสดง / คอมเมนต์ / ลบ */}
                    <div style={{ padding: '8px 10px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                      <button type="button" onClick={() => openEditStory(st)} title="แก้ไขโพสต์" style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                        <Edit3 size={13} /> แก้ไข
                      </button>
                      <button type="button" onClick={() => handleToggleHideStory(st)} title={st.is_hidden ? 'กดเพื่อแสดง' : 'กดเพื่อซ่อน'} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: st.is_hidden ? '#059669' : '#d97706', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                        {st.is_hidden ? <><Eye size={13} /> แสดง</> : <><EyeOff size={13} /> ซ่อน</>}
                      </button>
                      <button type="button" onClick={() => handleOpenComments(st.story_id)} title="ดูและตอบคอมเมนต์" style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: openCommentStoryId === st.story_id ? '#dbeafe' : '#fff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <MessageCircle size={14} />
                      </button>
                      <button type="button" onClick={() => handleDeleteStory(st.story_id)} title="ลบโพสต์" style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* กล่องดูและตอบคอมเมนต์ของโพสต์นี้ */}
                    {openCommentStoryId === st.story_id && (
                      <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                          {storyComments.length === 0 ? (
                            <div style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center', padding: '4px' }}>ยังไม่มีคอมเมนต์</div>
                          ) : (
                            storyComments.map((cm) => {
                              const cmName = cm.nickname || `${cm.first_name || ''} ${cm.last_name || ''}`.trim() || 'ผู้ใช้งาน';
                              const isMe = String(cm.account_id) === String(userData.account_id || userData.id);
                              return (
                                <div key={cm.comment_id} style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                    <strong style={{ color: '#0f172a' }}>{cmName}</strong>
                                    <span style={{ color: '#94a3b8' }}>{formatThaiDate(cm.created_at)}</span>
                                  </div>
                                  <div style={{ color: '#334155', margin: '3px 0' }}>{cm.comment_text}</div>
                                  <div style={{ display: 'flex', gap: '10px', fontSize: '10.5px', fontWeight: 700 }}>
                                    <span onClick={() => setReplyingTo({ comment_id: cm.comment_id, author_name: cmName })} style={{ color: '#2563eb', cursor: 'pointer' }}>ตอบกลับ</span>
                                    <span onClick={() => handleDeleteStoryComment(st.story_id, cm.comment_id)} style={{ color: '#ef4444', cursor: 'pointer' }}>ลบ</span>
                                    {!isMe && <span onClick={() => handleBlockCommenter(cm.account_id, cmName)} style={{ color: '#64748b', cursor: 'pointer' }}>บล็อก</span>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {replyingTo && (
                          <div style={{ fontSize: '10.5px', color: '#2563eb', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>ตอบกลับ: <strong>{replyingTo.author_name}</strong></span>
                            <span onClick={() => setReplyingTo(null)} style={{ color: '#ef4444', cursor: 'pointer' }}>ยกเลิก</span>
                          </div>
                        )}
                        <form onSubmit={(e) => handleSendStoryComment(e, st.story_id)} style={{ display: 'flex', gap: '4px' }}>
                          <input type="text" placeholder="พิมพ์ตอบคอมเมนต์..." value={commentText} onChange={(e) => setCommentText(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: '999px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }} />
                          <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Send size={13} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* ================================================================= */}
        {/* 👥 ส่วนที่ 4: รายชื่อผู้ที่เราแนะนำ (สไตล์การ์ดรายชื่อสะอาดตา) */}
        {/* ================================================================= */}
        <div style={{ ...cardStyle, marginTop: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                รายชื่อผู้ที่คุณแนะนำ ({referrals.length} คน)
              </h3>
            </div>
          </div>

          {referrals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1', fontSize: '14px' }}>
              ยังไม่มีรายชื่อผู้ที่คุณแนะนำ — กดปุ่ม <strong>"แชร์ลิงก์"</strong> เพื่อชวนคนในชุมชนเข้าร่วม
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {referrals.map((refUser) => (
                <div
                  key={refUser.account_id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    padding: '12px 14px', borderRadius: '14px', backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <img
                      src={refUser.user_image || '/profile-img.jpg'}
                      alt={refUser.first_name}
                      style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {refUser.first_name} {refUser.last_name} {refUser.nickname ? `(${refUser.nickname})` : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                          {refUser.tier_code}
                        </span>
                        {refUser.village_name && (
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                            หมู่ {refUser.village_no || '-'} {refUser.village_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      {refUser.created_at ? formatThaiDate(refUser.created_at) : '-'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                      ⭐ {refUser.community_score || 0} คะแนน
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ================================================================= */}
      {/* 🎨 Modal สร้าง My Story (เลือกไฟล์ + ใส่ข้อความ + เลือกขนาด/สี + ความเป็นส่วนตัว) */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* 🎨 Modal สร้าง / แก้ไข My Story (รองรับ ปกวิดีโอ + หัวข้อ + คำอธิบาย + ลากข้อความ + เบลอ) */}
      {/* ================================================================= */}
      {storyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <form onSubmit={handlePostStory} style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ backgroundColor: '#2563eb', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>{editingStoryId ? 'แก้ไข My Story' : 'สร้าง My Story ใหม่'}</span>
              <button type="button" onClick={() => setStoryModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. เลือกรูปหรือวิดีโอ (แสดงเฉพาะตอนสร้างใหม่) */}
              {!editingStoryId && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>1. เลือกรูปภาพหรือวิดีโอ *</label>
                  <input type="file" accept="image/*,video/*" onChange={handleSelectStoryFile} style={inputStyle} />
                </div>
              )}

              {/* เพิ่มภาพปกวิดีโอ (แสดงอัตโนมัติเมื่อเลือกไฟล์วิดีโอ) */}
              {!editingStoryId && storyIsVideo && (
                <div style={{ backgroundColor: '#eff6ff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', display: 'block', marginBottom: '6px' }}>🖼️ ภาพปกวิดีโอ (Thumbnail — ไม่บังคับ)</label>
                  <input type="file" accept="image/*" onChange={(e) => setStoryCoverFile(e.target.files[0] || null)} style={inputStyle} />
                </div>
              )}

              {/* ตัวอย่างแสดงผลสด (ลากย้ายข้อความได้ + เบลอสด) */}
              {storyPreview && (
                <div>
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, marginBottom: '4px' }}>
                    💡 จิ้มหรือคลิกลากข้อความบนภาพเพื่อย้ายตำแหน่งได้อิสระ
                  </div>
                  <div
                    ref={previewBoxRef}
                    style={{ position: 'relative', width: '100%', height: '240px', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#0f172a', userSelect: 'none' }}
                  >
                    {storyIsVideo ? (
                      <video src={storyPreview} controls style={{ width: '100%', height: '100%', objectFit: 'contain', filter: storyBlur > 0 ? `blur(${(storyBlur / 100) * 16}px)` : 'none', transform: storyBlur > 0 ? 'scale(1.06)' : 'none' }} />
                    ) : (
                      <img src={storyPreview} alt="Preview" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: storyBlur > 0 ? `blur(${(storyBlur / 100) * 16}px)` : 'none', transform: storyBlur > 0 ? 'scale(1.06)' : 'none' }} />
                    )}
                    {storyText && (
                      <div
                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setIsDraggingText(true); updateTextPosition(e.clientX, e.clientY); }}
                        onPointerMove={(e) => { if (isDraggingText) updateTextPosition(e.clientX, e.clientY); }}
                        onPointerUp={() => setIsDraggingText(false)}
                        onPointerCancel={() => setIsDraggingText(false)}
                        style={{
                          position: 'absolute', left: `${storyTextX}%`, top: `${storyTextY}%`, transform: 'translate(-50%, -50%)',
                          maxWidth: '90%', padding: '6px 10px', borderRadius: '8px',
                          border: isDraggingText ? '1.5px dashed #38bdf8' : '1px dashed rgba(255,255,255,0.45)',
                          textAlign: 'center', cursor: isDraggingText ? 'grabbing' : 'grab', touchAction: 'none',
                          color: storyColor, fontSize: `${storySize}px`, fontWeight: 800,
                          textShadow: '0 2px 8px rgba(0,0,0,0.85)', wordBreak: 'break-word'
                        }}
                      >
                        {storyText}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* หัวข้อ Post & คำอธิบาย (แสดงใต้รูป/วิดีโอ) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>2. หัวข้อโพสต์ (Title)</label>
                <input type="text" placeholder="เช่น บรรยากาศยามเช้าที่หมู่บ้านเรา" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>3. คำอธิบายเพิ่มเติม (Description)</label>
                <textarea rows={2} placeholder="เขียนรายละเอียดหรือเรื่องราวใต้โพสต์..." value={storyDesc} onChange={(e) => setStoryDesc(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* ข้อความทับบนภาพ + สี/ขนาด/ความเบลอ */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>4. ข้อความทับบนภาพ / วิดีโอ (ไม่บังคับ)</label>
                <input type="text" placeholder="พิมพ์ข้อความที่ต้องการแสดงทับ..." value={storyText} onChange={(e) => setStoryText(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>สีตัวอักษร</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {TEXT_COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setStoryColor(c)} style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: storyColor === c ? '2.5px solid #2563eb' : '1px solid #cbd5e1' }} />
                      ))}
                      <input type="color" value={storyColor} onChange={(e) => setStoryColor(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>ขนาดตัวอักษร ({storySize}px)</label>
                    <input type="range" min="14" max="38" value={storySize} onChange={(e) => setStorySize(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>ความเบลอภาพพื้นหลัง (Background Blur)</span>
                    <span style={{ color: '#2563eb' }}>{storyBlur}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={storyBlur} onChange={(e) => setStoryBlur(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>

              {/* ตั้งค่าความเป็นส่วนตัว */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>5. ตั้งค่าการมองเห็น (ความเป็นส่วนตัว)</label>
                <select value={storyVisibility} onChange={(e) => setStoryVisibility(e.target.value)} style={inputStyle}>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setStoryModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>ยกเลิก</button>
                <button type="submit" disabled={postingStory} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, cursor: postingStory ? 'not-allowed' : 'pointer' }}>
                  {postingStory ? 'กำลังบันทึก...' : editingStoryId ? 'บันทึกการแก้ไข' : 'โพสต์ Story'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
};

// Component ย่อยสำหรับแสดงแต่ละรายการข้อมูล
const InfoItem = ({ icon, bg, color, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ backgroundColor: bg, padding: '10px', borderRadius: '12px', color, flexShrink: 0, display: 'flex' }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14.5px', color: '#0f172a', fontWeight: 700, marginTop: '2px', wordBreak: 'break-word' }}>{value}</div>
    </div>
  </div>
);

export default Profile;