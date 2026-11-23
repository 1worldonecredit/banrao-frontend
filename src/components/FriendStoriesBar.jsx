import React, { useState, useEffect } from 'react';
import {
  Heart, Eye, Star, Share2, MessageCircle,
  UserPlus, UserCheck, ChevronUp, Send, Calendar
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const formatThaiDateTime = (isoStr) => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} • ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
};

const FriendStoriesBar = ({ userData }) => {
  const myAccountId = userData?.account_id || userData?.id;

  const [authors, setAuthors] = useState([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [openCommentId, setOpenCommentId] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  const selectedAuthor = authors.find((a) => a.account_id === selectedAuthorId) || null;

  const fetchFeed = async () => {
    if (!myAccountId) return;
    try {
      const res = await fetch(`${API_URL}/api/stories/feed/${myAccountId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAuthors(data.data);
      }
    } catch (err) {
      console.error('Load stories feed error:', err);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [myAccountId]);

  // คลิกวงกลมเพื่อน: ขยายด้านล่าง (ถ้าคลิกคนเดิมซ้ำ = พับเก็บ)
  const handleSelectAuthor = (author) => {
    if (selectedAuthorId === author.account_id) {
      setSelectedAuthorId(null);
      setOpenCommentId(null);
      return;
    }
    setSelectedAuthorId(author.account_id);
    setOpenCommentId(null);

    // นับยอดวิวอัตโนมัติ
    author.stories.forEach((st) => {
      fetch(`${API_URL}/api/stories/${st.story_id}/view`, { method: 'POST' }).catch(() => {});
    });
  };

  // กดติดตาม / เลิกติดตาม
  const handleToggleFollow = async (e, targetAccountId) => {
    e.stopPropagation();
    if (targetAccountId === myAccountId) return;
    try {
      const res = await fetch(`${API_URL}/api/users/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: myAccountId, following_id: targetAccountId })
      });
      const data = await res.json();
      if (data.success) fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  // กดถูกใจ
  const handleLike = async (storyId) => {
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: myAccountId })
      });
      const data = await res.json();
      if (data.success) fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  // ให้ดาว 1-7 ดาว
  const handleRateStar = async (storyId, stars) => {
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: myAccountId, stars })
      });
      const data = await res.json();
      if (data.success) fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  // กดแชร์
  const handleShare = async (storyId) => {
    try {
      await fetch(`${API_URL}/api/stories/${storyId}/share`, { method: 'POST' });
      const shareUrl = `${window.location.origin}/dashboard`;
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl);
      alert('✅ คัดลอกลิงก์และบันทึกยอดแชร์แล้ว!');
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  // เปิดดูและส่งคอมเมนต์
  const handleToggleComments = async (storyId) => {
    if (openCommentId === storyId) {
      setOpenCommentId(null);
      return;
    }
    setOpenCommentId(storyId);
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}/comments`);
      const data = await res.json();
      if (data.success) {
        setCommentsMap((prev) => ({ ...prev, [storyId]: data.data || [] }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendComment = async (e, storyId) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: myAccountId, comment_text: commentInput })
      });
      const data = await res.json();
      if (data.success) {
        setCommentInput('');
        const cRes = await fetch(`${API_URL}/api/stories/${storyId}/comments`).then((r) => r.json());
        if (cRes.success) setCommentsMap((prev) => ({ ...prev, [storyId]: cRes.data || [] }));
        fetchFeed();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (authors.length === 0) return null;

  return (
    <div style={{ marginTop: '14px', marginBottom: '18px' }}>
      {/* ========================================================= */}
      {/* 1. แถบการ์ดโปรไฟล์เพื่อน (เลื่อนซ้าย-ขวาได้) */}
      {/* ========================================================= */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(12px)',
        borderRadius: '18px',
        padding: '14px 12px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            ✨ เรื่องราวของเพื่อนในชุมชน ({authors.length})
          </div>
          {selectedAuthor && (
            <button
              type="button"
              onClick={() => setSelectedAuthorId(null)}
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: '999px',
                padding: '4px 10px', fontSize: '11.5px', fontWeight: 700,
                color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <ChevronUp size={14} /> ซ่อนโพสต์
            </button>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none'
        }}>
          {authors.map((author) => {
            const isMe = author.account_id === myAccountId;
            const isSelected = selectedAuthorId === author.account_id;
            return (
              <div
                key={author.account_id}
                onClick={() => handleSelectAuthor(author)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: '76px', maxWidth: '76px', cursor: 'pointer', flexShrink: 0,
                  opacity: selectedAuthorId && !isSelected ? 0.65 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ position: 'relative', marginBottom: '6px' }}>
                  <div style={{
                    padding: '3px',
                    borderRadius: '50%',
                    background: isSelected
                      ? 'linear-gradient(135deg, #2563eb, #06b6d4)'
                      : 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
                    transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                    transition: 'transform 0.2s ease'
                  }}>
                    <img
                      src={author.author_image}
                      alt={author.full_name}
                      style={{
                        width: '62px', height: '62px', borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid #ffffff', display: 'block'
                      }}
                    />
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFollow(e, author.account_id)}
                      title={author.is_following ? 'กำลังติดตาม' : 'ติดตาม'}
                      style={{
                        position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: author.is_following ? '#10b981' : '#ffffff',
                        color: author.is_following ? '#ffffff' : '#2563eb',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '999px', width: '26px', height: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                    >
                      {author.is_following ? <UserCheck size={12} /> : <UserPlus size={12} />}
                    </button>
                  )}
                </div>

                <div style={{
                  fontSize: '11.5px', fontWeight: isSelected ? 800 : 700,
                  color: isSelected ? '#2563eb' : '#1e293b',
                  textAlign: 'center', width: '100%',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {author.nickname || author.full_name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ส่วนขยายแสดงโพสต์ด้านล่างแบบลื่นๆ (ไม่เด้ง Popup) */}
      {/* ========================================================= */}
      {selectedAuthor && (
        <div style={{
          marginTop: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          {/* หัวข้อเจ้าของโพสต์ + ปุ่มติดตาม */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <img
                src={selectedAuthor.author_image}
                alt={selectedAuthor.full_name}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedAuthor.full_name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  ทั้งหมด {selectedAuthor.stories.length} โพสต์
                </div>
              </div>
            </div>

            {selectedAuthor.account_id !== myAccountId && (
              <button
                type="button"
                onClick={(e) => handleToggleFollow(e, selectedAuthor.account_id)}
                style={{
                  padding: '7px 14px', borderRadius: '999px', border: 'none',
                  backgroundColor: selectedAuthor.is_following ? '#10b981' : '#2563eb',
                  color: '#ffffff', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0
                }}
              >
                {selectedAuthor.is_following ? <><UserCheck size={14} /> กำลังติดตาม</> : <><UserPlus size={14} /> ติดตาม</>}
              </button>
            )}
          </div>

          {/* รายการโพสต์ (จัดกึ่งกลาง ขนาดเท่ากันทุกโพสต์ ทั้งมือถือและคอม) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 420px))',
            justifyContent: 'center',
            gap: '20px'
          }}>
            {selectedAuthor.stories.map((st) => (
              <div
                key={st.story_id}
                style={{
                  backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden',
                  border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column'
                }}
              >
                {/* วันที่โพสต์ + ยอดคนดู */}
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} color="#6366f1" /> {formatThaiDateTime(st.created_at)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 700 }}>
                    <Eye size={14} color="#0284c7" /> {(st.views_count || 0) + 1} ดู
                  </span>
                </div>

                {/* พื้นที่รูป/วิดีโอ (บังคับขนาดอัตราส่วน 4:5 เท่ากันทุกโพสต์) */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', backgroundColor: '#0f172a', overflow: 'hidden' }}>
                  {st.media_type === 'VIDEO' ? (
                    <video
                      src={st.media_url}
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
                      alt="Story"
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        filter: st.bg_blur > 0 ? `blur(${(st.bg_blur / 100) * 16}px)` : 'none',
                        transform: st.bg_blur > 0 ? 'scale(1.06)' : 'none'
                      }}
                    />
                  )}

                  {/* ข้อความทับภาพตามตำแหน่งที่เจ้าของโพสต์วางไว้ */}
                  {st.overlay_text && (
                    <div style={{
                      position: 'absolute',
                      left: `${st.text_x ?? 50}%`,
                      top: `${st.text_y ?? 50}%`,
                      transform: 'translate(-50%, -50%)',
                      maxWidth: '90%', textAlign: 'center', pointerEvents: 'none',
                      color: st.text_color || '#ffffff', fontSize: `${st.text_size || 22}px`,
                      fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.85)', wordBreak: 'break-word'
                    }}>
                      {st.overlay_text}
                    </div>
                  )}
                </div>

                {/* แถบให้ดาว 1-7 ดาว */}
                <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                      const active = num <= (st.my_stars || 0);
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleRateStar(st.story_id, num)}
                          title={`ให้ ${num} ดาว`}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}
                        >
                          <Star size={18} color={active ? '#f59e0b' : '#cbd5e1'} fill={active ? '#facc15' : 'none'} />
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#d97706' }}>
                    ⭐ {st.avg_stars || 0} / 7 ({st.total_stars || 0} ดาว)
                  </span>
                </div>

                {/* แถบปุ่ม ชอบ / คอมเมนต์ / แชร์ */}
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                  <button
                    type="button"
                    onClick={() => handleLike(st.story_id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: st.is_liked ? '#ef4444' : '#475569' }}
                  >
                    <Heart size={19} color="#ef4444" fill={st.is_liked ? '#ef4444' : 'none'} />
                    <span>{st.likes_count || 0} ชอบ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleComments(st.story_id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}
                  >
                    <MessageCircle size={19} color="#2563eb" />
                    <span>{st.comments_count || 0} คอมเมนต์</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(st.story_id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#10b981' }}
                  >
                    <Share2 size={19} color="#10b981" />
                    <span>{st.shares_count || 0} แชร์</span>
                  </button>
                </div>

                {/* กล่องคอมเมนต์ */}
                {openCommentId === st.story_id && (
                  <div style={{ padding: '10px 14px 14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                      {(commentsMap[st.story_id] || []).length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '6px' }}>ยังไม่มีคอมเมนต์ เป็นคนแรกที่แสดงความคิดเห็น!</div>
                      ) : (
                        (commentsMap[st.story_id] || []).map((cm) => (
                          <div key={cm.comment_id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <img src={cm.user_image || '/profile-img.jpg'} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            <div style={{ backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: 1 }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>{cm.nickname || `${cm.first_name || ''} ${cm.last_name || ''}`.trim()}</div>
                              <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>{cm.comment_text}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={(e) => handleSendComment(e, st.story_id)} style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="เขียนคอมเมนต์..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '999px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                      />
                      <button
                        type="submit"
                        style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <Send size={15} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendStoriesBar;