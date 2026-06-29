'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  doc, getDoc, onSnapshot, collection, query, orderBy,
  addDoc, setDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import FramedAvatar from '@/components/ui/FramedAvatar';
import { PROFILE_BADGES, CARD_BORDERS, USERNAME_EFFECTS } from '@/lib/cosmetics';
import { COMMENT_FRAMES } from '@/lib/frames';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ─── Cosmetic helpers ─────────────────────────────────────────────────────────
function getUsernameStyle(p) {
  const ue = USERNAME_EFFECTS.find(u => u.id === p?.equippedUsernameEffect);
  if (!ue || ue.id === 'ue_none') return { color: '#fff' };
  const color = ue.color || ue.colors?.[0] || '#fff';
  return { color, textShadow: ue.glow ? `0 0 8px ${color}, 0 0 16px ${color}50` : 'none' };
}
function getProfileBadge(p) {
  const b = PROFILE_BADGES.find(x => x.id === p?.equippedProfileBadge);
  return (!b || b.id === 'badge_none') ? null : b;
}
function getCardBorderStyle(p) {
  const cb = CARD_BORDERS.find(x => x.id === p?.equippedCardBorder);
  if (!cb || cb.id === 'cb_none') return { border: '2px solid #2A2A3A', boxShadow: 'none' };
  const color = cb.color || cb.colors?.[0] || '#2A2A3A';
  return { border: `2px solid ${color}`, boxShadow: cb.glow ? `0 0 6px ${color}80` : 'none' };
}
function getCommentFrame(p) {
  const cf = COMMENT_FRAMES.find(f => f.id === p?.equippedCommentFrame);
  return (!cf || cf.id === 'none') ? null : cf;
}

function BadgeChip({ badge }) {
  if (!badge) return null;
  return (
    <div style={{ background: `${badge.color}22`, border: `0.5px solid ${badge.color}55`, borderRadius: 4, padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {badge.emoji && <span style={{ fontSize: 8 }}>{badge.emoji}</span>}
      <span style={{ fontSize: 8, fontWeight: 900, color: badge.color }}>{badge.name}</span>
    </div>
  );
}

function CommentItem({ c }) {
  const cf = getCommentFrame(c);
  const cbStyle = getCardBorderStyle(c);
  const unStyle = getUsernameStyle(c);
  const badge = getProfileBadge(c);
  const isLeg = c?.plan === 'legendary';
  const av = c.avatar || c.avatarUrl;
  const borderColor = cf?.color || 'transparent';

  return (
    <div style={{
      borderRadius: 12, padding: '10px 12px',
      background: cf ? `${borderColor}08` : 'var(--card)',
      border: cf ? `1.5px solid ${borderColor}` : '1px solid rgba(255,255,255,0.06)',
      boxShadow: cf?.glow ? `0 0 8px ${borderColor}60` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Link href={c.userId ? `/profile/${c.userId}` : '#'} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: '#1A1A26', display: 'flex', alignItems: 'center', justifyContent: 'center', ...cbStyle }}>
            {av
              ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 10, fontWeight: 900, color: '#C9A84C' }}>{(c.username || '?')[0].toUpperCase()}</span>
            }
          </div>
        </Link>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, ...unStyle }}>{c.username || 'Fan'}</span>
          {isLeg && <span style={{ fontSize: 9, color: '#C9A84C' }}>👑</span>}
          {badge && <BadgeChip badge={badge} />}
        </div>
        <span style={{ fontSize: 10, color: 'var(--gray)', flexShrink: 0 }}>{timeAgo(c.createdAt)}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.5, margin: 0 }}>{c.text}</p>
    </div>
  );
}

function getVideoUrl(v) {
  if (v?.muxPlaybackId) return `https://stream.mux.com/${v.muxPlaybackId}.m3u8`;
  return v?.videoUrl || null;
}

function getThumbnailUrl(v) {
  if (v?.muxPlaybackId)
    return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?time=3&width=1280&height=720&fit_mode=crop`;
  return v?.thumbnailUrl || v?.thumbnail || null;
}

function timeAgo(ts) {
  if (!ts) return '';
  try { return formatDistanceToNow(ts.toDate ? ts.toDate() : new Date(ts), { addSuffix: true, locale: fr }); }
  catch { return ''; }
}

export default function VideoPage() {
  const { videoId }           = useParams();
  const router                = useRouter();
  const { user, userProfile } = useAuthStore();
  const [video, setVideo]     = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [comments, setComments]   = useState([]);
  const [comment, setComment]     = useState('');
  const [sending, setSending]     = useState(false);
  const [ggCooldown, setGgCooldown] = useState(false);
  const [ggCount, setGgCount]     = useState(0);
  const [hasGG, setHasGG]         = useState(false);
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);

  // Load video
  useEffect(() => {
    if (!videoId) return;
    const unsub = onSnapshot(doc(db, 'videos', videoId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setVideo(data);
        setGgCount(data.ggCount || 0);
        // Load author profile
        if (data.userId) {
          getDoc(doc(db, 'users', data.userId)).then(s => {
            if (s.exists()) setAuthorData({ uid: s.id, ...s.data() });
          }).catch(() => {});
        }
      }
    });
    return () => unsub();
  }, [videoId]);

  // HLS player
  useEffect(() => {
    if (!video || !videoRef.current) return;
    const el  = videoRef.current;
    const url = getVideoUrl(video);
    if (!url) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (url.includes('.m3u8')) {
      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = url;
      } else if (typeof window !== 'undefined' && window.Hls?.isSupported()) {
        const hls = new window.Hls({ maxBufferLength: 30 });
        hls.loadSource(url);
        hls.attachMedia(el);
        hlsRef.current = hls;
      }
    } else {
      el.src = url;
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [video]);

  // Check GG (using ggBy array on video doc — simpler, no extra collection needed)
  useEffect(() => {
    if (!user?.uid || !video) return;
    setHasGG((video.ggBy || []).includes(user.uid));
  }, [user?.uid, video]);

  // Comments — no compound index needed (filter client-side)
  useEffect(() => {
    if (!videoId) return;
    const q = query(
      collection(db, 'comments', videoId, 'messages'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setComments(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => !c.deleted && !c.parentId)
      );
    }, () => {});
    return () => unsub();
  }, [videoId]);

  const handleGG = async () => {
    if (!user) { router.push('/auth'); return; }
    if (ggCooldown) return;
    const next = !hasGG;
    setHasGG(next);
    setGgCount(p => p + (next ? 1 : -1));
    setGgCooldown(true);
    try {
      const { arrayUnion, arrayRemove } = await import('firebase/firestore');
      await updateDoc(doc(db, 'videos', videoId), {
        ggCount: increment(next ? 1 : -1),
        ggBy: next ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
      if (next && video?.userId && video.userId !== user.uid) {
        await updateDoc(doc(db, 'users', video.userId), { ggCount: increment(1) });
      }
    } catch { setHasGG(!next); setGgCount(p => p + (next ? -1 : 1)); }
    setTimeout(() => setGgCooldown(false), 1500);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { router.push('/auth'); return; }
    if (!comment.trim() || sending) return;
    setSending(true);
    const text = comment.trim();
    try {
      const p = userProfile || {};
      const payload = {
        text, userId: user.uid,
        username: p.username || 'Fan',
        avatar: p.avatarUrl || p.avatar || '',
        // cosmetic snapshot
        equippedCommentFrame: p.equippedCommentFrame || null,
        equippedCardBorder: p.equippedCardBorder || null,
        equippedUsernameEffect: p.equippedUsernameEffect || null,
        equippedProfileBadge: p.equippedProfileBadge || null,
        plan: p.plan || 'free',
        createdAt: serverTimestamp(), deleted: false,
      };
      const newRef = await addDoc(collection(db, 'comments', videoId, 'messages'), payload);
      setComments(prev => [{ id: newRef.id, ...payload, createdAt: null }, ...prev]);
      setComment('');
      toast.success('Commentaire ajouté !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi');
    }
    setSending(false);
  };

  if (!video) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const thumb = getThumbnailUrl(video);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px 40px' }}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 16, padding: '8px 16px', borderRadius: 10,
          background: 'var(--card)', border: '1px solid var(--gray3)',
          color: 'var(--gray)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.borderColor = 'var(--gray)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray)'; e.currentTarget.style.borderColor = 'var(--gray3)'; }}
      >
        ← Retour
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Video + info */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          {/* Video */}
          <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            <div style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              aspectRatio: '16/9', background: '#060610',
              border: '1px solid var(--gray3)',
            }}>
              {thumb && (
                <img src={thumb} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', opacity: 0.4,
                }} />
              )}
              <video
                ref={videoRef}
                controls
                playsInline
                style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, display: 'block' }}
              />
            </div>

            {/* Info below video */}
            <div style={{ marginTop: 16 }}>
              <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 12 }}>
                {video.title || 'Sans titre'}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <Link href={`/profile/${video.userId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <FramedAvatar
                    user={authorData || { avatar: video.userAvatar, username: video.username }}
                    size={44}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, ...getUsernameStyle(authorData) }}>{video.username || 'Gamer'}</span>
                      {authorData?.plan === 'legendary' && <span style={{ fontSize: 10, color: '#C9A84C' }}>👑</span>}
                      {getProfileBadge(authorData) && <BadgeChip badge={getProfileBadge(authorData)} />}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray)', margin: 0 }}>{timeAgo(video.createdAt)}</p>
                  </div>
                </Link>

                {/* GG button */}
                <button
                  onClick={handleGG}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 24,
                    fontWeight: 900, fontSize: 15, cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: hasGG ? 'var(--gold)' : 'transparent',
                    color: hasGG ? 'var(--black)' : 'var(--gold)',
                    border: `2px solid var(--gold)`,
                    opacity: ggCooldown ? 0.7 : 1,
                  }}
                >
                  <span>⚡</span>
                  <span>{ggCount} GG{ggCount !== 1 ? 's' : ''}</span>
                </button>
              </div>

              {video.description && (
                <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: 'var(--gray)' }}>{video.description}</p>
              )}

              {(video.game || video.genre || video.console) && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {video.game && <span className="badge-gold">{video.game}</span>}
                  {video.genre && <span className="badge-gold">{video.genre}</span>}
                  {video.console && <span className="badge-gold">{video.console}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Comments panel */}
          <div style={{ flex: '0 0 320px', minWidth: 0 }}>
            <h2 style={{ fontWeight: 900, fontSize: 16, color: 'var(--white)', marginBottom: 14 }}>💬 Commentaires</h2>

            {/* Input */}
            <form onSubmit={handleComment} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <textarea
                className="input resize-none"
                style={{ height: 80, fontSize: 13 }}
                placeholder={user ? 'Ton commentaire...' : 'Connecte-toi pour commenter'}
                value={comment}
                onChange={e => setComment(e.target.value)}
                disabled={!user}
              />
              <button
                type="submit"
                disabled={sending || !comment.trim() || !user}
                className="btn-gold"
                style={{ width: '100%' }}
              >
                {sending ? 'Envoi...' : user ? 'Commenter' : 'Connexion requise'}
              </button>
            </form>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }} className="scrollbar-hide">
              {comments.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray)', textAlign: 'center', padding: '24px 0' }}>
                  Aucun commentaire — sois le premier !
                </p>
              ) : comments.map(c => <CommentItem key={c.id} c={c} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
