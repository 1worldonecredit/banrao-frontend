import React, { useState, useEffect, useRef } from 'react';
import { Bell, Volume2, VolumeX, CheckCheck, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// ฟังก์ชันอ่านออกเสียงภาษาไทย (รองรับทั้งเว็บและ WebView ของแอปมือถือ)
const speakThai = (text) => {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // หยุดเสียงเก่าก่อนพูดใหม่
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech error:', err);
  }
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const myAccountId = userData?.account_id || userData?.id;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // สวิตช์เปิด/ปิดการอ่านแจ้งเตือนเป็นเสียงอัตโนมัติ
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('banrao_voice_notify') !== 'false');

  // เก็บ ID ของแจ้งเตือนล่าสุดที่เคยเห็นแล้ว เพื่อไม่ให้อ่านซ้ำ
  const lastSeenIdRef = useRef(null);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('banrao_voice_notify', String(next));
    if (next) speakThai('เปิดระบบอ่านแจ้งเตือนด้วยเสียงแล้วค่ะ');
  };

  const fetchNotifications = async () => {
    if (!myAccountId) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications/${myAccountId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        setUnreadCount(data.unread_count || 0);

        // เช็กว่ามีแจ้งเตือนใหม่สดๆ เข้ามาหรือไม่ ถ้ามีและเปิดเสียงอยู่ -> อ่านออกเสียงทันที
        const newest = data.data[0];
        if (newest) {
          if (lastSeenIdRef.current && lastSeenIdRef.current !== newest.notification_id && !newest.is_read) {
            if (voiceEnabled) {
              speakThai(newest.message);
            }
          }
          lastSeenIdRef.current = newest.notification_id;
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000); // เช็กแจ้งเตือนใหม่ทุก 15 วินาที
    return () => clearInterval(timer);
  }, [myAccountId, voiceEnabled]);

  const handleClickItem = async (item) => {
    if (!item.is_read) {
      await fetch(`${API_URL}/api/notifications/${item.notification_id}/read`, { method: 'PATCH' }).catch(() => {});
      fetchNotifications();
    }
    setIsOpen(false);
    navigate('/dashboard');
  };

  const handleReadAll = async () => {
    await fetch(`${API_URL}/api/notifications/read-all/${myAccountId}`, { method: 'PATCH' }).catch(() => {});
    fetchNotifications();
  };

  if (!myAccountId) return null;

  return (
    <div style={{ position: 'relative' }}>
      {/* ปุ่มกระดิ่งแจ้งเตือน */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="การแจ้งเตือน"
        style={{
          position: 'relative', background: '#f1f5f9', border: '1px solid #e2e8f0',
          borderRadius: '50%', width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#0f172a'
        }}
      >
        <Bell size={18} color={unreadCount > 0 ? '#2563eb' : '#475569'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            backgroundColor: '#ef4444', color: '#ffffff',
            fontSize: '10px', fontWeight: 800,
            minWidth: '18px', height: '18px', borderRadius: '999px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #ffffff'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* กล่องรายการแจ้งเตือน (Dropdown) */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          width: '320px', maxWidth: '88vw',
          backgroundColor: '#ffffff', borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.2)',
          border: '1px solid #e2e8f0', zIndex: 999, overflow: 'hidden'
        }}>
          {/* หัวกล่อง + ปุ่มเปิด/ปิดเสียง + อ่านทั้งหมด */}
          <div style={{
            padding: '12px 14px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px',
            backgroundColor: '#f8fafc'
          }}>
            <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
              แจ้งเตือน ({unreadCount})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={toggleVoice}
                title={voiceEnabled ? 'ปิดเสียงอ่านอัตโนมัติ' : 'เปิดเสียงอ่านอัตโนมัติ'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', borderRadius: '999px', border: 'none',
                  backgroundColor: voiceEnabled ? '#dcfce7' : '#e2e8f0',
                  color: voiceEnabled ? '#15803d' : '#475569',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {voiceEnabled ? <><Volume2 size={13} /> เสียงเปิด</> : <><VolumeX size={13} /> ปิดเสียง</>}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <CheckCheck size={14} /> อ่านหมด
                </button>
              )}
            </div>
          </div>

          {/* รายการแจ้งเตือน */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                ยังไม่มีการแจ้งเตือนใหม่
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.notification_id}
                  onClick={() => handleClickItem(item)}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                    backgroundColor: item.is_read ? '#ffffff' : '#eff6ff',
                    cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start'
                  }}
                >
                  <img
                    src={item.sender_image || '/profile-img.jpg'}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageCircle size={12} color="#2563eb" /> {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px', wordBreak: 'break-word' }}>
                      {item.message}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      {new Date(item.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>
                  {/* ปุ่มกดฟังเสียงอ่านซ้ำ */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakThai(item.message);
                    }}
                    title="ฟังเสียงอ่าน"
                    style={{
                      background: '#f1f5f9', border: 'none', borderRadius: '50%',
                      width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#2563eb', flexShrink: 0
                    }}
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;