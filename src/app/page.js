'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit, onSnapshot, getDocs,
  doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import FramedAvatar from '@/components/ui/FramedAvatar';
import { PROFILE_BADGES, CARD_BORDERS, USERNAME_EFFECTS } from '@/lib/cosmetics';
import { COMMENT_FRAMES, VIDEO_FRAMES } from '@/lib/frames';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Colors ───────────────────────────────────────────────────────────────────
const BG    = '#0A0A0F';
const DARK  = '#12121A';
const CARD  = '#1A1A26';
const GOLD  = '#C9A84C';
const GOLD2 = '#FFE066';
const GRAY  = '#888899';
const GRAY3 = '#2A2A3A';

// ─── CSS keyframes (injected once) ────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes gg-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.55); }
    70%  { transform: scale(0.88); }
    100% { transform: scale(1); }
  }
  @keyframes gg-glow-out {
    0%   { opacity: 0.85; transform: scale(0.9); }
    60%  { opacity: 0.35; transform: scale(1.7); }
    100% { opacity: 0;    transform: scale(2.2); }
  }
  @keyframes electric-champ {
    0%,100% { box-shadow: 0 0 0 2px #C9A84C, 0 0 12px 4px rgba(201,168,76,0.45), inset 0 0 8px rgba(201,168,76,0.15); }
    25%      { box-shadow: 0 0 0 1px #C9A84C, 0 0 5px 1px rgba(201,168,76,0.25), inset 0 0 3px rgba(201,168,76,0.08); }
    50%      { box-shadow: 0 0 0 3px #FFE066, 0 0 22px 8px rgba(255,224,102,0.55), inset 0 0 12px rgba(255,224,102,0.2); }
    75%      { box-shadow: 0 0 0 2px #C9A84C, 0 0 8px 2px rgba(201,168,76,0.35), inset 0 0 6px rgba(201,168,76,0.1); }
  }
  .gg-pop-anim   { animation: gg-pop 0.42s cubic-bezier(0.36,0.07,0.19,0.97); }
  .gg-glow-anim  { animation: gg-glow-out 0.48s ease-out forwards; }
  .champ-border  { animation: electric-champ 0.9s ease-in-out infinite; }
  .feed-scroll::-webkit-scrollbar { display: none; }
  .feed-scroll   { -ms-overflow-style: none; scrollbar-width: none; }
  .genre-scroll::-webkit-scrollbar { display: none; }
  .genre-scroll  { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ─── Genre list ───────────────────────────────────────────────────────────────
const GENRES = ['All', 'FPS', 'Sports', 'RPG', 'MOBA', 'Battle Royale', 'Action', 'Racing', 'Fighting', 'Simulator'];

// ─── Cosmetic helpers ─────────────────────────────────────────────────────────
function getUsernameStyle(profile) {
  const ue = USERNAME_EFFECTS?.find(u => u.id === profile?.equippedUsernameEffect);
  if (!ue || ue.id === 'ue_none') return { color: '#fff' };
  const color = ue.color || ue.colors?.[0] || '#fff';
  return { color, textShadow: ue.glow ? `0 0 8px ${color}, 0 0 16px ${color}50` : 'none' };
}

function getProfileBadge(profile) {
  const b = PROFILE_BADGES?.find(x => x.id === profile?.equippedProfileBadge);
  return (!b || b.id === 'badge_none') ? null : b;
}

function getCardBorderStyle(profile) {
  const cb = CARD_BORDERS?.find(x => x.id === profile?.equippedCardBorder);
  if (!cb || cb.id === 'cb_none') return { border: `2px solid ${GRAY3}` };
  const color = cb.color || cb.colors?.[0] || GRAY3;
  return { border: `2px solid ${color}`, boxShadow: cb.glow ? `0 0 6px ${color}80` : 'none' };
}

function getCommentFrame(profile) {
  const cf = COMMENT_FRAMES?.find(f => f.id === profile?.equippedCommentFrame);
  return (!cf || cf.id === 'none') ? null : cf;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getVideoUrl(v) {
  if (v?.muxPlaybackId) return `https://stream.mux.com/${v.muxPlaybackId}.m3u8`;
  return v?.videoUrl || null;
}

function getThumbnail(v) {
  if (v?.muxPlaybackId)
    return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?time=3&width=800&height=450&fit_mode=crop`;
  return v?.thumbnailUrl || v?.thumbnail || null;
}

function timeAgo(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return ''; }
}

function fmtCount(n) {
  if (!n || n === 0) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ─── Badge Chip ───────────────────────────────────────────────────────────────
function BadgeChip({ badge, size = 'sm' }) {
  if (!badge) return null;
  const fs = size === 'xs' ? 7 : 9;
  return (
    <div style={{
      background: `${badge.color}22`, border: `0.5px solid ${badge.color}55`,
      borderRadius: 4, padding: size === 'xs' ? '1px 4px' : '2px 6px',
      display: 'inline-flex', alignItems: 'center', gap: 2,
    }}>
      {badge.emoji && <span style={{ fontSize: fs }}>{badge.emoji}</span>}
      <span style={{ fontSize: fs, fontWeight: 900, color: badge.color, lineHeight: 1 }}>{badge.name}</span>
    </div>
  );
}

// ─── Account badge (LEG / ICON / CR) ─────────────────────────────────────────
function AcctBadge({ label, bg, color = '#000' }) {
  return (
    <span style={{ fontSize: 7, fontWeight: 900, color, background: bg, padding: '1px 4px', borderRadius: 3 }}>
      {label}
    </span>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({ c, compact }) {
  const cf = getCommentFrame(c);
  const cbStyle = getCardBorderStyle(c);
  const unStyle = getUsernameStyle(c);
  const badge = getProfileBadge(c);
  const isLeg = c?.plan === 'legendary';

  const borderColor = cf?.color || 'transparent';
  const bubbleStyle = cf ? {
    border: `1.5px solid ${borderColor}`,
    boxShadow: cf.glow ? `0 0 8px ${borderColor}60` : 'none',
    borderRadius: 10, padding: '7px 9px',
    background: `${borderColor}08`,
  } : { padding: '2px 0' };

  const av = c.avatar || c.avatarUrl;
  const initial = (c.username || '?')[0].toUpperCase();

  return (
    <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
      {/* Avatar with card border */}
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: CARD, ...cbStyle,
      }}>
        {av
          ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 9, fontWeight: 900, color: GOLD }}>{initial}</span>
        }
      </div>
      {/* Bubble */}
      <div style={{ flex: 1, minWidth: 0, ...bubbleStyle }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, ...unStyle }}>{c.username || 'Fan'}</span>
          {isLeg && <span style={{ fontSize: 8, color: GOLD }}>👑</span>}
          {badge && <BadgeChip badge={badge} size="xs" />}
          <span style={{ fontSize: 9, color: '#44445A', marginLeft: 'auto' }}>{timeAgo(c.createdAt)}</span>
        </div>
        <p style={{
          fontSize: 12, color: '#bbb', margin: 0, lineHeight: 1.4,
          ...(compact ? {
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } : {}),
        }}>{c.text}</p>
      </div>
    </div>
  );
}

// ─── GG Button ────────────────────────────────────────────────────────────────
function GGButton({ hasGG, count, onPress, disabled }) {
  const [popAnim, setPopAnim] = useState(false);
  const [glowAnim, setGlowAnim] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setPopAnim(true);
    setGlowAnim(true);
    setTimeout(() => setPopAnim(false), 450);
    setTimeout(() => setGlowAnim(false), 520);
    onPress();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <div style={{ position: 'relative' }}>
        {glowAnim && (
          <div className="gg-glow-anim" style={{
            position: 'absolute', inset: -8, borderRadius: 18,
            background: GOLD, pointerEvents: 'none', zIndex: 0,
          }} />
        )}
        <button
          onClick={handleClick}
          className={popAnim ? 'gg-pop-anim' : ''}
          disabled={disabled}
          style={{
            position: 'relative', zIndex: 1,
            width: 68, height: 30, borderRadius: 15,
            background: hasGG ? GOLD : 'transparent',
            border: `1.5px solid ${hasGG ? '#E8C96B' : GOLD}`,
            color: hasGG ? '#000' : GOLD,
            fontWeight: 900, fontSize: 13, letterSpacing: 2,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
          }}
        >GG</button>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: hasGG ? GOLD : GRAY }}>
        {fmtCount(count)}{count > 0 ? ' ▾' : ''}
      </span>
    </div>
  );
}

// ─── HLS Video Player ─────────────────────────────────────────────────────────
function VideoPlayer({ video, isActive, shouldLoad, onDoubleTap, frameColor, isChampionFrame }) {
  const videoRef    = useRef(null);
  const hlsRef      = useRef(null);
  const isActiveRef = useRef(isActive);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const lastTapRef  = useRef(0);
  const tapTimerRef = useRef(null);
  const thumb = getThumbnail(video);

  // Keep ref in sync so tryPlay can read the latest value without closure staleness
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Load / tear-down HLS
  useEffect(() => {
    if (!shouldLoad || !videoRef.current) { return; }
    const el = videoRef.current;
    const url = getVideoUrl(video);
    if (!url) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setReady(false);

    // Only auto-play if this card is currently visible
    const tryPlay = () => { if (isActiveRef.current) el.play().catch(() => {}); };

    if (url.includes('.m3u8')) {
      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = url;
        el.addEventListener('loadedmetadata', tryPlay, { once: true });
      } else if (typeof window !== 'undefined' && window.Hls?.isSupported()) {
        const hls = new window.Hls({ maxBufferLength: 20, enableWorker: false });
        hls.loadSource(url);
        hls.attachMedia(el);
        hls.on(window.Hls.Events.MANIFEST_PARSED, tryPlay);
        hlsRef.current = hls;
      }
    } else {
      el.src = url;
      el.addEventListener('loadedmetadata', tryPlay, { once: true });
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      el.pause();
      el.removeAttribute('src');
    };
  }, [shouldLoad, video.id]);

  // Play / pause based on active state
  useEffect(() => {
    if (!videoRef.current || !shouldLoad) return;
    if (isActive && !paused) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isActive, paused, shouldLoad]);

  // Reset pause state when card becomes active
  useEffect(() => {
    if (isActive) setPaused(false);
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const handleTap = (e) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 310) {
      clearTimeout(tapTimerRef.current);
      lastTapRef.current = 0;
      onDoubleTap?.(); // double tap → GG
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        setPaused(p => !p); // single tap → pause/play
      }, 310);
    }
  };

  return (
    <div
      className={isChampionFrame ? 'champ-border' : ''}
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: '#060610', overflow: 'hidden',
        ...(frameColor && !isChampionFrame ? {
          outline: `2px solid ${frameColor}`,
          outlineOffset: '-2px',
        } : {}),
      }}
    >
      {/* Thumbnail placeholder */}
      {!ready && thumb && (
        <img src={thumb} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 1,
        }} />
      )}

      <video
        ref={videoRef}
        muted={muted}
        playsInline
        loop
        onCanPlay={() => setReady(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Tap overlay (single / double tap) */}
      <div onClick={handleTap} style={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 3 }}>
        {(!isActive || paused) && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 22, color: '#fff', marginLeft: 4 }}>▶</span>
            </div>
          </div>
        )}
      </div>

      {/* Corner brackets for regular frames */}
      {frameColor && !isChampionFrame && (
        <>
          <div style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderTop: `2px solid ${frameColor}`, borderLeft: `2px solid ${frameColor}`, zIndex: 4 }} />
          <div style={{ position: 'absolute', top: 8, right: 8, width: 14, height: 14, borderTop: `2px solid ${frameColor}`, borderRight: `2px solid ${frameColor}`, zIndex: 4 }} />
          <div style={{ position: 'absolute', bottom: 8, left: 8, width: 14, height: 14, borderBottom: `2px solid ${frameColor}`, borderLeft: `2px solid ${frameColor}`, zIndex: 4 }} />
          <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderBottom: `2px solid ${frameColor}`, borderRight: `2px solid ${frameColor}`, zIndex: 4 }} />
        </>
      )}

      {/* Controls: mute + expand */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 6, zIndex: 5 }}>
        <button
          onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >{muted ? '🔇' : '🔊'}</button>
        <a
          href={`/video/${video.id}`}
          onClick={e => e.stopPropagation()}
          style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
        >⛶</a>
      </div>
    </div>
  );
}

// ─── Comments Panel (right side) ─────────────────────────────────────────────
function CommentsPanel({ video, currentUser, currentUserProfile, isActive }) {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(video.commentCount ?? video.commentsCount ?? 0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Load top comments when card is active
  useEffect(() => {
    if (!isActive || !video?.id) return;

    const unsubs = [];
    const noop = () => {};

    try {
      // Count listener
      const countQ = query(collection(db, 'comments'), where('videoId', '==', video.id));
      unsubs.push(onSnapshot(countQ, snap => setCommentCount(snap.size), noop));
    } catch {}

    try {
      // Preview: 3 most recent top-level comments
      const previewQ = query(
        collection(db, 'comments'),
        where('videoId', '==', video.id),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      unsubs.push(onSnapshot(previewQ, snap => {
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => !c.deleted && !c.parentId);
        setComments(docs.slice(0, 3));
      }, noop));
    } catch {}

    return () => unsubs.forEach(u => { try { u(); } catch {} });
  }, [isActive, video?.id]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!currentUser) { router.push('/auth'); return; }
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const p = currentUserProfile || {};
      await addDoc(collection(db, 'comments'), {
        videoId: video.id,
        text: text.trim(),
        userId: currentUser.uid,
        username: p.username || 'Fan',
        avatar: p.avatarUrl || p.avatar || '',
        parentId: null,
        likes: 0, likedBy: [],
        equippedCommentFrame: p.equippedCommentFrame || null,
        equippedCardBorder: p.equippedCardBorder || null,
        equippedUsernameEffect: p.equippedUsernameEffect || null,
        equippedProfileBadge: p.equippedProfileBadge || null,
        plan: p.plan || 'free',
        createdAt: serverTimestamp(),
        deleted: false,
      });
      setText('');
    } catch { toast.error('Error posting comment'); }
    setSending(false);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: DARK, borderLeft: `1px solid ${GRAY3}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${GRAY3}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{fmtCount(commentCount)}</span>
            <span style={{ fontSize: 11, color: GRAY }}>comments</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: GRAY }}>⭐ {fmtCount(video.ggCount)}</span>
            <span style={{ fontSize: 11, color: GRAY }}>👁 {fmtCount(video.viewCount)}</span>
          </div>
        </div>
        <Link href={`/video/${video.id}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '6px 10px', borderRadius: 20,
          background: GOLD, color: '#000', fontWeight: 800, fontSize: 11,
          textDecoration: 'none',
        }}>
          Open All ↗
        </Link>
      </div>

      {/* Comment input */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY3}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <FramedAvatar user={currentUserProfile || {}} size={26} />
          </div>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(e); }}
            disabled={!currentUser}
            placeholder={currentUser ? 'Comment...' : 'Login to comment'}
            style={{
              flex: 1, height: 30, borderRadius: 15, minWidth: 0,
              border: `1px solid ${GRAY3}`, background: CARD,
              color: '#fff', fontSize: 12, padding: '0 10px',
              outline: 'none',
            }}
          />
          {text.trim() && (
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                padding: '0 10px', height: 30, borderRadius: 15, flexShrink: 0,
                background: GOLD, color: '#000', fontWeight: 800, fontSize: 11,
                border: 'none', cursor: 'pointer',
              }}
            >{sending ? '…' : '→'}</button>
          )}
        </div>
      </div>

      {/* Comments list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }} className="feed-scroll">
        {comments.length === 0 ? (
          <p style={{ fontSize: 12, color: GRAY, textAlign: 'center', padding: '20px 0', margin: 0 }}>
            No comments yet. Be first! 🎮
          </p>
        ) : (
          comments.map(c => <CommentItem key={c.id} c={c} compact />)
        )}
        {comments.length >= 3 && (
          <Link href={`/video/${video.id}`} style={{
            fontSize: 11, fontWeight: 700, color: GOLD,
            display: 'block', textAlign: 'center', padding: '8px 0',
            textDecoration: 'none', borderTop: `1px solid ${GRAY3}`, marginTop: 4,
          }}>
            See all comments →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ video, index, activeIndex, currentUser, currentUserProfile, following }) {
  const router = useRouter();
  const [author, setAuthor] = useState(null);
  const [ggCount, setGgCount] = useState(video.ggCount || 0);
  const [hasGG, setHasGG] = useState(false);
  const [followed, setFollowed] = useState(false);
  const viewTimerRef = useRef(null);

  const isActive   = index === activeIndex;
  const shouldLoad = index >= activeIndex - 1 && index <= activeIndex + 2;
  const isOwn      = currentUser?.uid === video.userId;

  // Author profile (for cosmetics / champion / badges)
  useEffect(() => {
    if (!video.userId) return;
    getDoc(doc(db, 'users', video.userId))
      .then(snap => { if (snap.exists()) setAuthor({ uid: snap.id, ...snap.data() }); })
      .catch(() => {});
  }, [video.userId]);

  // GG state
  useEffect(() => {
    setHasGG((video.ggBy || []).includes(currentUser?.uid));
    setGgCount(video.ggCount || 0);
  }, [currentUser?.uid, video.ggBy, video.ggCount]);

  // Follow state
  useEffect(() => {
    setFollowed(Array.isArray(following) ? following.includes(video.userId) : false);
  }, [following, video.userId]);

  // 5-second view tracking
  useEffect(() => {
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    if (isActive && video?.id) {
      viewTimerRef.current = setTimeout(async () => {
        try { await updateDoc(doc(db, 'videos', video.id), { viewCount: increment(1) }); } catch {}
      }, 5000);
    }
    return () => { if (viewTimerRef.current) clearTimeout(viewTimerRef.current); };
  }, [isActive, video?.id]);

  // GG handler
  const handleGG = async () => {
    if (!currentUser) { router.push('/auth'); return; }
    if (isOwn) return;
    const next = !hasGG;
    setHasGG(next);
    setGgCount(c => c + (next ? 1 : -1));
    try {
      await updateDoc(doc(db, 'videos', video.id), {
        ggCount: increment(next ? 1 : -1),
        ggBy: next ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
      });
    } catch {
      setHasGG(!next);
      setGgCount(c => c + (next ? -1 : 1));
    }
  };

  // Follow handler
  const handleFollow = async () => {
    if (!currentUser) { router.push('/auth'); return; }
    const next = !followed;
    setFollowed(next);
    try {
      await Promise.all([
        updateDoc(doc(db, 'users', currentUser.uid), {
          following: next ? arrayUnion(video.userId) : arrayRemove(video.userId),
        }),
        updateDoc(doc(db, 'users', video.userId), {
          followers: increment(next ? 1 : -1),
        }),
      ]);
    } catch { setFollowed(!next); }
  };

  // Cosmetics
  const unStyle    = getUsernameStyle(author);
  const badge      = getProfileBadge(author);
  const isLeg      = author?.plan === 'legendary';
  const isCreator  = author?.accountType === 'creator';
  const isIcon     = author?.accountType === 'gameconic';
  const isExcluded = isCreator || isIcon;
  const isChampion = !!author?.isChampion && !isExcluded;
  const isLeader   = !!author?.isCurrentLeader && !isExcluded;
  const streakLevel = video.streakLevel;
  const SL_COLORS   = { bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', goat: '#FF2D55' };

  // Video frame
  const vfId          = video.videoFrame;
  const videoFrame    = VIDEO_FRAMES?.find(f => f.id === vfId && f.id !== 'none') || null;
  const isChampVF     = vfId === 'vf_champion';
  const isLeaderVF    = isLeader && !isChampVF;
  const frameColor    = isChampVF ? GOLD : isLeaderVF ? '#00D4FF' : (videoFrame ? videoFrame.color : null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: BG }}>

      {/* ── CREATOR ROW (52px) ── */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 14px', gap: 10,
        borderBottom: `1px solid ${GRAY3}`,
      }}>
        {/* Avatar + info */}
        <Link
          href={`/profile/${video.userId}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flex: 1, minWidth: 0, overflow: 'visible' }}
        >
          <div style={{ overflow: 'visible', flexShrink: 0 }}>
            <FramedAvatar
              user={author || { avatar: video.userAvatar, avatarUrl: video.userAvatar, username: video.username }}
              size={32}
            />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Username + account badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: 700, fontSize: 13, ...unStyle,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
              }}>
                {video.username || 'Gamer'}
              </span>
              {isLeg     && <AcctBadge label="LEG"  bg={GOLD}     />}
              {isIcon    && <AcctBadge label="ICON" bg="#FF2D55"  />}
              {isCreator && <AcctBadge label="CR"   bg="#00D4FF" color="#12121A" />}
              {isChampion && <AcctBadge label="👑 CHAMP" bg={GOLD2} />}
              {isLeader  && !isChampion && <AcctBadge label="⚡ #1" bg="#00D4FF" color="#12121A" />}
            </div>
            {/* Profile cosmetic badge */}
            {badge && <div style={{ marginTop: 2 }}><BadgeChip badge={badge} size="xs" /></div>}
            {/* Streak level */}
            {streakLevel && streakLevel !== 'noob' && !video.hideStreakLevel && (
              <div style={{ marginTop: 2 }}>
                <span style={{ fontSize: 8, fontWeight: 900, color: '#1A1A2E', background: SL_COLORS[streakLevel] || GRAY, padding: '1px 5px', borderRadius: 3 }}>
                  {streakLevel.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </Link>
        {/* Follow button */}
        {!isOwn && (
          <button
            onClick={handleFollow}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${followed ? GRAY3 : GOLD}`,
              background: 'transparent', color: followed ? GRAY : GOLD,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {followed ? 'Following' : '+ Follow'}
          </button>
        )}
      </div>

      {/* ── BODY: left (video + meta + actions) | right (comments) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT PANEL */}
        <div style={{
          width: 'min(80%, 1200px)',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${GRAY3}`,
        }}>
          {/* VIDEO — fills remaining height */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VideoPlayer
              video={video}
              isActive={isActive}
              shouldLoad={shouldLoad}
              onDoubleTap={() => !isOwn && handleGG()}
              frameColor={frameColor}
              isChampionFrame={isChampVF}
            />
          </div>

          {/* META (72px) */}
          <div style={{
            height: 72, flexShrink: 0,
            padding: '8px 14px 6px',
            borderTop: `1px solid ${GRAY3}`,
            borderBottom: `1px solid ${GRAY3}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
            {/* Game · Console · Genre · Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              <span style={{ fontSize: 11 }}>🎮</span>
              <span style={{ fontSize: 11, color: GOLD, fontWeight: 600, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {[video.game, video.console, video.genre?.toUpperCase()].filter(Boolean).join(' · ')}
              </span>
              <span style={{ fontSize: 10, color: GRAY, flexShrink: 0 }}>{timeAgo(video.createdAt)}</span>
            </div>
            {/* Title */}
            <p style={{ fontWeight: 800, fontSize: 14, color: '#fff', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {video.title || video.caption || 'Untitled'}
            </p>
            {/* Caption (if separate from title) */}
            {video.title && video.caption && (
              <p style={{ fontSize: 11, color: GRAY, margin: 0, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                {video.caption}
              </p>
            )}
          </div>

          {/* ACTIONS (54px) */}
          <div style={{
            height: 54, flexShrink: 0,
            display: 'flex', alignItems: 'center',
            padding: '0 14px', gap: 4,
          }}>
            {isOwn
              ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>⭐ {ggCount}</span>
                </div>
              : <GGButton hasGG={hasGG} count={ggCount} onPress={handleGG} disabled={false} />
            }
            {!isOwn && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link
                  href={`/video/${video.id}#report`}
                  title="Report"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: GRAY, fontSize: 15, textDecoration: 'none',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${GRAY3}`,
                  }}
                >🚩</Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Comments */}
        <div style={{ flex: 1, minWidth: 180, maxWidth: '22%', overflow: 'hidden' }}>
          <CommentsPanel
            video={{ ...video, ggCount }}
            currentUser={currentUser}
            currentUserProfile={currentUserProfile}
            isActive={isActive}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user, userProfile } = useAuthStore();
  const [allVideos, setAllVideos] = useState([]);
  const [videos, setVideos]       = useState([]);
  const [genre, setGenre]         = useState('All');
  const [tab, setTab]             = useState('forYou');
  const [loading, setLoading]     = useState(true);
  const [following, setFollowing] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef(null);

  // Load user's following list
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
        if (snap.exists()) {
          const f = snap.data().following;
          setFollowing(Array.isArray(f) ? f : []);
        }
      })
      .catch(() => {});
  }, [user?.uid]);

  // Load videos
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(60));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => !v.banned && !v.restricted && (v.muxPlaybackId || v.videoUrl));
      // Shuffle: Fisher-Yates
      for (let i = docs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [docs[i], docs[j]] = [docs[j], docs[i]];
      }
      setAllVideos(docs);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Filter videos (reacts to any data change — never resets scroll)
  useEffect(() => {
    let docs = [...allVideos];
    if (tab === 'following') docs = docs.filter(v => following.includes(v.userId));
    if (genre !== 'All') docs = docs.filter(v =>
      v.genre?.toLowerCase() === genre.toLowerCase() ||
      v.game?.toLowerCase() === genre.toLowerCase()
    );
    setVideos(docs);
  }, [allVideos, tab, genre, following]);

  // Reset scroll only when the user switches tab or genre (not on Firestore updates)
  useEffect(() => {
    setActiveIndex(0);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [tab, genre]);

  // Snap scroll → track active index
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    let raf = null;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cardH = el.clientHeight;
        if (!cardH) return;
        const idx = Math.round(el.scrollTop / cardH);
        setActiveIndex(prev => prev !== idx ? idx : prev);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* Full-height feed container */}
      <div style={{ height: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}>

        {/* ── TAB + GENRE BAR ── */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${GRAY3}` }}>
          {/* Tabs: For You / Following */}
          <div style={{ display: 'flex' }}>
            {[
              { id: 'forYou',    label: 'For You' },
              { id: 'following', label: 'Following' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700,
                  color: tab === t.id ? '#fff' : GRAY,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: tab === t.id ? `2px solid ${GOLD}` : '2px solid transparent',
                }}
              >{t.label}</button>
            ))}
          </div>
          {/* Genre filter chips */}
          <div className="genre-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '7px 12px' }}>
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                style={{
                  padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  background: genre === g ? GOLD : CARD,
                  color: genre === g ? '#000' : GRAY,
                  border: genre === g ? 'none' : `1px solid ${GRAY3}`,
                }}
              >{g}</button>
            ))}
          </div>
        </div>

        {/* ── SNAP SCROLL FEED ── */}
        <div
          ref={feedRef}
          className="feed-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: 'scroll', scrollSnapType: 'y mandatory' }}
        >
          {loading ? (
            // Loading state takes full height
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ fontSize: 48 }}>🎮</div>
              <p style={{ color: GRAY, fontSize: 13, margin: 0 }}>Loading feed...</p>
            </div>
          ) : videos.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 56 }}>🎮</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>No videos</p>
              <p style={{ fontSize: 14, color: GRAY, margin: 0 }}>
                {tab === 'following' ? 'Follow creators to see their clips here.' : 'Be the first to post an action!'}
              </p>
              <Link href="/creator" style={{ marginTop: 8, padding: '8px 20px', borderRadius: 20, background: GOLD, color: '#000', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
                🎬 Post a clip
              </Link>
            </div>
          ) : (
            videos.map((v, idx) => (
              <div
                key={v.id}
                style={{ height: '100%', scrollSnapAlign: 'start', flexShrink: 0 }}
              >
                <VideoCard
                  video={v}
                  index={idx}
                  activeIndex={activeIndex}
                  currentUser={user}
                  currentUserProfile={userProfile}
                  following={following}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
