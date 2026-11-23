import React, { useState, useEffect } from 'react';
import {
  Heart, Eye, Star, Share2, MessageCircle,
  UserPlus, UserCheck, ChevronUp, Send, Calendar,
  Reply, Trash2, Ban
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
  const [replyingTo, setReplyingTo] = useState(null); // { comment_id, author_name }

  const selectedAuthor = authors.find((a) => String(a.account_id) === String(selectedAuthorId)) || null;

  const fetchFeed = async () => {
    if (!myAccountId) return;
    try {
      const res = await fetch(`${API_URL}/api/stories/feed/${myAccountId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setAuthors(data.data);
    } catch (err) {
      console.error('Load stories feed error:', err);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [myAccountId]);

  const handleSelectAuthor = (author) => {
    if (String(selectedAuthorId) === String(author.account_id)) {
      setSelectedAuthorId(null);
      setOpenCommentId(null);
      return;
    }
    setSelectedAuthorId(author.account_id);
    setOpenCommentId(null);
    setReplyingTo(null);
    author.stories.forEach((st) => {
      fetch(`${API_URL}/api/stories/${st.story_id}/view`, { method: 'POST' }).catch(() => {});
    });
  };

  // กดติดตาม / เลิกติดตาม (แก้บั๊กการเทียบ ID และแจ้งผลชัดเจน)
  const handleToggleFollow = async (e, targetAccountId) => {
    e.stopPropagation();
    if (!myAccountId || String(targetAccountId) === String(myAccountId)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: myAccountId, following_id: targetAccountId })
      });
      const data = await res.json();
      if (data.success) {
        fetchFeed();
      } else {
        alert('❌ ' + (data.message || 'ไม่สามารถติดตามได้'));
      }
    } catch (err) {
      alert('❌ เชื่อมต่อระบบติดตามไม่สำเร็จ');
    }
  };

  const handleLike = async (storyId) => {
    const res = await fetch(`${API_URL}/api/stories/${storyId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: myAccountId })
    }).then((r) => r.json()).catch(() => ({}));
    if (res.success) fetchFeed();
  };

  const handleRateStar = async (storyId, stars) => {
    const res = await fetch(`${API_URL}/api/stories/${storyId}/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: myAccountId, stars })
    }).then((r) => r.json()).catch(() => ({}));
    if (res.success) fetchFeed();
  };

  const handleShare = async (storyId) => {
    await fetch(`${API_URL}/api/stories/${storyId}/share`, { method: 'POST' }).catch(() => {});
    if (navigator.clipboard) navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
    alert('✅ คัดลอกลิงก์และบันทึกยอดแชร์แล้ว!');
    fetchFeed();
  };

  const loadComments = async (storyId) => {
    const res = await fetch(`${API_URL}/api/stories/${storyId}/comments`).then((r) => r.json()).catch(() => ({}));
    if (res.success) setCommentsMap((prev) => ({ ...prev, [storyId]: res.data || [] }));
  };

  const handleToggleComments = async (storyId) => {
    if (openCommentId === storyId) {
      setOpenCommentId(null);
      setReplyingTo(null);
      return;
    }
    setOpenCommentId(storyId);
    setReplyingTo(null);
    loadComments(storyId);
  };

  const handleSendComment = async (e, storyId) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const finalText = replyingTo ? `@${replyingTo.author_name} ${commentInput.trim()}` : commentInput.trim();
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
      setCommentInput('');
      setReplyingTo(null);
      loadComments(storyId);
      fetchFeed();
    } else {
      alert('❌ ' + (res.message || 'ส่งคอมเมนต์ไม่สำเร็จ'));
    }
  };

  // ลบคอมเมนต์ (Soft Delete: ไม่ลบจริง)
  const handleDeleteComment = async (storyId, commentId) => {
    if (!window.confirm('ต้องการลบคอมเมนต์นี้ใช่หรือไม่?')) return;
    const res = await fetch(`${API_URL}/api/stories/comments/${commentId}/delete`, { method: 'PATCH' }).then((r) => r.json()).catch(() => ({}));
    if (res.success) {
      loadComments(storyId);
      fetchFeed();
    }
  };

  // บล็อกผู้คอมเมนต์
  const handleBlockUser = async (targetId, targetName) => {
    if (!window.confirm(`ต้องการบล็อก "${targetName}" ไม่ให้เห็นและคอมเมนต์โพสต์ของคุณใช่หรือไม่?`)) return;
    const res = await fetch(`${API_URL}/api/users/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocker_id: myAccountId, blocked_id: targetId })
    }).then((r) => r.json()).catch(() => ({}));
    if (res.success) alert('✅ ' + res.message);
  };

  if (authors.length === 0) return null;

  return (
    <div style={{ marginTop: '14px', marginBottom: '18px' }}>
      {/* แถบการ์ดโปรไฟล์เพื่อน เลื่อนซ้าย-ขวา */}
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

        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {authors.map((author) => {
            const isMe = String(author.account_id) === String(myAccountId);
            const isSelected = String(selectedAuthorId) === String(author.account_id);
            return (
              <div
                key={author.account_id}
                onClick={() => handleSelectAuthor(author)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: '76px', maxWidth: '76px', cursor: 'pointer', flexShrink: 0,
                  opacity: selectedAuthorId && !isSelected ? 0.65 : 1
                }}
              >
                <div style={{ position: 'relative', marginBottom: '6px' }}>
                  <div style={{
                    padding: '3px', borderRadius: '50%',
                    background: isSelected ? 'linear-gradient(135deg, #2563eb, #06b6d4)' : 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)'
                  }}>
                    <img src={author.author_image} alt={author.full_name} style={{ width: '62px', height: '62px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', display: 'block' }} />
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
                        border: '1.5px solid #e2e8f0', borderRadius: '999px', width: '26px', height: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                    >
                      {author.is_following ? <UserCheck size={12} /> : <UserPlus size={12} />}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#2563eb' : '#1e293b', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {author.nickname || author.full_name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ส่วนขยายแสดงโพสต์ด้านล่างแบบลื่นๆ */}
      {selectedAuthor && (
        <div style={{
          marginTop: '14px', backgroundColor: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(12px)',
          borderRadius: '20px', padding: '16px', boxShadow: '0 8px 28px rgba(15, 23, 42, 0.1)', border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 420px))', justifyContent: 'center', gap: '20px' }}>
            {selectedAuthor.stories.map((st) => {
              const isPostOwner = String(st.account_id) === String(myAccountId);
              return (
                <div key={st.story_id} style={{ backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                  {/* วันที่โพสต์ + ยอดคนดู */}
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} color="#6366f1" /> {formatThaiDateTime(st.created_at)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 700 }}>
                      <Eye size={14} color="#0284c7" /> {(st.views_count || 0) + 1} ดู
                    </span>
                  </div>

                  {/* รูปภาพ / วิดีโอ (บังคับขนาด 4:5 เท่ากันทุกโพสต์ + รองรับปกวิดีโอ) */}
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
                        color: st.text_color || '#ffffff', fontSize: `${st.text_size || 22}px`,
                        fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.85)', wordBreak: 'break-word'
                      }}>
                        {st.overlay_text}
                      </div>
                    )}
                  </div>

                  {/* ✨ รูปโปรไฟล์ผู้โพสต์ + ปุ่มติดตาม + หัวข้อ + คำอธิบาย (วางไว้ใต้รูป/วิดีโอ) */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: (st.title || st.description) ? '8px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <img src={selectedAuthor.author_image} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedAuthor.full_name}
                          </div>
                          {selectedAuthor.nickname && <div style={{ fontSize: '11px', color: '#64748b' }}>({selectedAuthor.nickname})</div>}
                        </div>
                      </div>

                      {!isPostOwner && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleFollow(e, selectedAuthor.account_id)}
                          style={{
                            padding: '5px 12px', borderRadius: '999px', border: 'none',
                            backgroundColor: selectedAuthor.is_following ? '#10b981' : '#2563eb',
                            color: '#ffffff', fontSize: '11.5px', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0
                          }}
                        >
                          {selectedAuthor.is_following ? <><UserCheck size={13} /> กำลังติดตาม</> : <><UserPlus size={13} /> ติดตาม</>}
                        </button>
                      )}
                    </div>

                    {st.title && <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{st.title}</div>}
                    {st.description && <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{st.description}</div>}
                  </div>

                  {/* แถบให้ดาว 1-7 ดาว */}
                  <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                        const active = num <= (st.my_stars || 0);
                        return (
                          <button key={num} type="button" onClick={() => handleRateStar(st.story_id, num)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                            <Star size={18} color={active ? '#f59e0b' : '#cbd5e1'} fill={active ? '#facc15' : 'none'} />
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#d97706' }}>⭐ {st.avg_stars || 0} / 7 ({st.total_stars || 0} ดาว)</span>
                  </div>

                  {/* แถบปุ่ม ชอบ / คอมเมนต์ / แชร์ */}
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                    <button type="button" onClick={() => handleLike(st.story_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: st.is_liked ? '#ef4444' : '#475569' }}>
                      <Heart size={19} color="#ef4444" fill={st.is_liked ? '#ef4444' : 'none'} /> <span>{st.likes_count || 0} ชอบ</span>
                    </button>
                    <button type="button" onClick={() => handleToggleComments(st.story_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                      <MessageCircle size={19} color="#2563eb" /> <span>{st.comments_count || 0} คอมเมนต์</span>
                    </button>
                    <button type="button" onClick={() => handleShare(st.story_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                      <Share2 size={19} color="#10b981" /> <span>{st.shares_count || 0} แชร์</span>
                    </button>
                  </div>

                  {/* กล่องคอมเมนต์ (ระบุวันที่ + ตอบกลับ / ลบ / บล็อก) */}
                  {openCommentId === st.story_id && (
                    <div style={{ padding: '10px 14px 14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                        {(commentsMap[st.story_id] || []).length === 0 ? (
                          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '6px' }}>ยังไม่มีคอมเมนต์</div>
                        ) : (
                          (commentsMap[st.story_id] || []).map((cm) => {
                            const cmName = cm.nickname || `${cm.first_name || ''} ${cm.last_name || ''}`.trim() || 'ผู้ใช้งาน';
                            const isMyComment = String(cm.account_id) === String(myAccountId);
                            return (
                              <div key={cm.comment_id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <img src={cm.user_image || '/profile-img.jpg'} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                <div style={{ backgroundColor: '#ffffff', padding: '7px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{cmName}</span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatThaiDateTime(cm.created_at)}</span>
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '3px' }}>{cm.comment_text}</div>

                                  {/* ปุ่มจัดการคอมเมนต์: ตอบกลับ / ลบ (Soft Delete) / บล็อก */}
                                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', fontWeight: 700 }}>
                                    <button type="button" onClick={() => setReplyingTo({ comment_id: cm.comment_id, author_name: cmName })} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Reply size={12} /> ตอบกลับ
                                    </button>
                                    {(isPostOwner || isMyComment) && (
                                      <button type="button" onClick={() => handleDeleteComment(st.story_id, cm.comment_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Trash2 size={12} /> ลบ
                                      </button>
                                    )}
                                    {isPostOwner && !isMyComment && (
                                      <button type="button" onClick={() => handleBlockUser(cm.account_id, cmName)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Ban size={12} /> บล็อก
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {replyingTo && (
                        <div style={{ fontSize: '11px', color: '#2563eb', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '8px' }}>
                          <span>กำลังตอบกลับ: <strong>{replyingTo.author_name}</strong></span>
                          <span onClick={() => setReplyingTo(null)} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 700 }}>ยกเลิก</span>
                        </div>
                      )}

                      <form onSubmit={(e) => handleSendComment(e, st.story_id)} style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder={replyingTo ? `ตอบกลับ ${replyingTo.author_name}...` : 'เขียนคอมเมนต์...'}
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: '999px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                        />
                        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <Send size={15} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendStoriesBar;