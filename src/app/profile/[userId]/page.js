'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  doc, getDoc, collection, query, where, orderBy,
  onSnapshot, updateDoc, setDoc, deleteDoc, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import FramedAvatar from '@/components/ui/FramedAvatar';
import { PROFILE_BANNERS, PROFILE_BACKGROUNDS, USERNAME_EFFECTS, PROFILE_BADGES, PROFILE_THEMES } from '@/lib/cosmetics';

/* ── Helpers ── */
const fmtNum = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n || 0}`;
const fmtGG  = fmtNum;

function getThumbnail(v) {
  if (v?.muxPlaybackId)
    return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?time=3&width=400&height=400&fit_mode=crop`;
  return v?.thumbnail || v?.thumbnailUrl || null;
}

/* ── Cosmetics helpers ── */
function getBgColors(profile) {
  const bgId = profile?.equippedProfileBg || profile?.equippedBackground;
  if (bgId && bgId !== 'none' && bgId !== 'bg_none') {
    const bg = PROFILE_BACKGROUNDS?.find(b => b.id === bgId);
    if (bg?.colors?.length) return bg.colors;
  }
  return null;
}

function getBannerStyle(profile) {
  const bannerId = profile?.equippedProfileBanner || profile?.equippedBanner;
  if (bannerId && bannerId !== 'none' && bannerId !== 'banner_none') {
    const b = PROFILE_BANNERS?.find(x => x.id === bannerId);
    if (b?.colors?.length >= 2) return { background: `linear-gradient(135deg, ${b.colors.join(', ')})` };
    if (b?.colors?.length === 1) return { background: b.colors[0] };
  }
  // Fallback to bg colors
  const bgColors = getBgColors(profile);
  if (bgColors?.length >= 2) return { background: `linear-gradient(135deg, ${bgColors.join(', ')})` };
  const isLeg = profile?.plan === 'legendary';
  return { background: isLeg ? 'linear-gradient(135deg, #1C1200 0%, #2A1A00 100%)' : 'linear-gradient(135deg, #0d0820 0%, #12121A 100%)' };
}

function getUsernameStyle(profile) {
  const ueId = profile?.equippedUsernameEffect;
  if (!ueId || ueId === 'none') return { color: '#fff' };
  const ue = USERNAME_EFFECTS?.find(e => e.id === ueId);
  if (!ue) return { color: '#fff' };
  const color = ue.color || ue.colors?.[0] || '#fff';
  return {
    color,
    textShadow: ue.glow ? `0 0 12px ${color}, 0 0 24px ${color}50` : 'none',
  };
}

function getProfileBadge(profile) {
  const badgeId = profile?.equippedProfileBadge;
  if (!badgeId || badgeId === 'none' || badgeId === 'badge_none') return null;
  return PROFILE_BADGES?.find(b => b.id === badgeId) || null;
}

/* ── Social icons ── */
const SOCIAL_ICONS = {
  youtube:   { color: '#FF0000', label: '▶ YouTube' },
  twitch:    { color: '#9146FF', label: '● Twitch' },
  twitter:   { color: '#1DA1F2', label: '✕ Twitter' },
  instagram: { color: '#E1306C', label: '◆ Instagram' },
  tiktok:    { color: '#01D4FF', label: '♪ TikTok' },
  discord:   { color: '#5865F2', label: '# Discord' },
};
const SOCIAL_BASES = {
  youtube: 'https://youtube.com/', twitch: 'https://twitch.tv/',
  twitter: 'https://x.com/', instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@', discord: '',
};

/* ── Streak ── */
const STREAK_LEVELS = [
  { id: 'noob',   label: 'NOOB',   minPoints: 0,     color: '#555566' },
  { id: 'bronze', label: 'BRONZE', minPoints: 500,   color: '#CD7F32' },
  { id: 'silver', label: 'SILVER', minPoints: 2000,  color: '#C0C0C0' },
  { id: 'gold',   label: 'GOLD',   minPoints: 5000,  color: '#C9A84C' },
  { id: 'goat',   label: 'GOAT 🐐', minPoints: 15000, color: '#FF2D55' },
];
function StreakBar({ level, points, onClick }) {
  const idx = Math.max(0, STREAK_LEVELS.findIndex(l => l.id === level));
  const cur = STREAK_LEVELS[idx];
  const next = STREAK_LEVELS[idx + 1];
  const seg = next ? Math.min(Math.max((points - cur.minPoints) / (next.minPoints - cur.minPoints), 0), 1) : 1;
  const pct = ((idx + seg) / (STREAK_LEVELS.length - 1)) * 100;
  return (
    <button onClick={onClick} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0 16px 12px' }}>
      <div style={{ background: '#1A1A26', borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${cur.color}55` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 9, color: '#888899', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Streak Level</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: cur.color }}>{cur.label}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: '#2A2A3A', overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: cur.color, borderRadius: 3, transition: 'width 0.5s ease', boxShadow: `0 0 8px ${cur.color}80` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {STREAK_LEVELS.map(l => (
            <span key={l.id} style={{ fontSize: 7, color: l.id === level ? l.color : '#555566', fontWeight: l.id === level ? 800 : 500 }}>
              {l.label.split(' ')[0]}
            </span>
          ))}
        </div>
        {next && (
          <div style={{ fontSize: 8, color: '#555566', marginTop: 3 }}>
            {(next.minPoints - points).toLocaleString()} pts to <span style={{ color: next.color }}>{next.label}</span>
          </div>
        )}
      </div>
    </button>
  );
}

/* ── Streak Info Modal ── */
function StreakModal({ level, points, onClose }) {
  const idx = Math.max(0, STREAK_LEVELS.findIndex(l => l.id === level));
  const next = STREAK_LEVELS[idx + 1];
  const ptsToNext = next ? next.minPoints - points : 0;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#141420', borderRadius: 20, padding: 24, maxWidth: 420, width: '100%', border: '0.5px solid rgba(201,168,76,0.4)', maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 30 }}>⚡</div>
          <h2 style={{ fontWeight: 900, fontSize: 22, color: '#fff', margin: '8px 0 4px' }}>Streak Level</h2>
          <p style={{ fontSize: 12, color: '#888899' }}>Level up by being active. Your streak never goes down.</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#888899', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>HOW IT GROWS</div>
          {[
            ['📹', 'Post a clip', '+25 pts'],
            ['⭐', 'Receive a GG', '+2 pts'],
            ['👤', 'Get a new follower', '+1 pt'],
            ['📅', 'Daily login bonus', '+1 to +15 pts'],
            ['🏆', 'Monthly Top 10', '+200 pts'],
            ['👑', 'Monthly Champion', '+500 pts'],
          ].map(([icon, action, pts]) => (
            <div key={action} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #222233' }}>
              <span style={{ fontSize: 16, width: 30 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: '#888899' }}>{action}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4CAF50' }}>{pts}</span>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#888899', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>LEVELS & DAILY BONUS</div>
          {STREAK_LEVELS.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid #222233' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, marginRight: 10, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: l.id === level ? '#fff' : '#888899', fontWeight: l.id === level ? 800 : 400 }}>
                {l.label} {l.id === level ? '← YOU' : ''}
              </span>
              <span style={{ fontSize: 12, color: '#888899', width: 80 }}>{l.minPoints.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
        {next && (
          <div style={{ background: '#1A1A2E', borderRadius: 12, padding: 12, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#888899' }}>Next: <span style={{ color: next.color, fontWeight: 800 }}>{next.label}</span></div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#C9A84C', marginTop: 4 }}>{ptsToNext.toLocaleString()} pts to go</div>
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: '13px 0', background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#000', fontWeight: 900, fontSize: 15, border: 'none', borderRadius: 12, cursor: 'pointer' }}>
          Got it 👍
        </button>
      </div>
    </div>
  );
}

/* ── QR Modal ── */
function QRModal({ username, onClose }) {
  const url = `https://gamingactions.app/user/${username}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&bgcolor=0A0A0F&color=C9A84C&margin=2&ecc=H`;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0A0A0F', borderRadius: 24, padding: 28, textAlign: 'center', border: '1px solid rgba(201,168,76,0.4)' }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>@{username}</h3>
        <p style={{ fontSize: 12, color: '#888899', marginBottom: 20 }}>Scan to view profile</p>
        <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto' }}>
          <img src={qrUrl} alt="QR" style={{ width: 220, height: 220, borderRadius: 12 }} />
        </div>
        <p style={{ fontSize: 11, color: '#888899', marginTop: 18 }}>gamingactions.app/user/{username}</p>
        <button onClick={onClose} style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#000' }}>
          🔗 Share Link
        </button>
      </div>
    </div>
  );
}

/* ── Theme border colors ── */
const THEME_COLORS = {
  theme_champion:    { c1: '#C9A84C', c2: '#FFD700' },
  theme_phantom:     { c1: '#BF5AF2', c2: '#7C4DFF' },
  theme_inferno:     { c1: '#FF3D00', c2: '#FF6D00' },
  theme_storm:       { c1: '#00D4FF', c2: '#7C4DFF' },
  theme_cosmic:      { c1: '#E040FB', c2: '#00D4FF' },
  theme_matrix:      { c1: '#00FF41', c2: '#00C853' },
  theme_sakura:      { c1: '#FF69B4', c2: '#FFB7C5' },
  theme_cyber:       { c1: '#FF0080', c2: '#00D4FF' },
  theme_arctic:      { c1: '#A0E8FF', c2: '#00D4FF' },
  theme_void_walker: { c1: '#7C4DFF', c2: '#BC13FE' },
  theme_neon_city:   { c1: '#FF00FF', c2: '#00FFFF' },
};

/* ── Main Page ── */
export default function ProfilePage() {
  const { userId }  = useParams();
  const router      = useRouter();
  const { user, userProfile } = useAuthStore();

  const [profile, setProfile]     = useState(null);
  const [videos, setVideos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('clips');
  const [isFollowing, setIsFollowing] = useState(false);
  const [bellActive, setBellActive]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showStreak, setShowStreak]     = useState(false);
  const [showQR, setShowQR]             = useState(false);

  const isOwn = user?.uid === userId;
  const displayProfile = isOwn ? userProfile : profile;
  const av = displayProfile?.avatar || displayProfile?.avatarUrl;

  /* ── Real-time profile ── */
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'users', userId), snap => {
      if (snap.exists()) setProfile({ uid: snap.id, ...snap.data() });
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  /* ── Real-time videos ── */
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'videos'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userId]);

  /* ── Check following ── */
  useEffect(() => {
    if (!user?.uid || isOwn) return;
    getDoc(doc(db, 'follows', `${user.uid}_${userId}`)).then(s => setIsFollowing(s.exists()));
    getDoc(doc(db, 'bells', `${user.uid}_${userId}`)).then(s => setBellActive(s.exists()));
  }, [user?.uid, userId, isOwn]);

  const handleFollow = async () => {
    if (!user?.uid) { router.push('/auth'); return; }
    setFollowLoading(true);
    const followId = `${user.uid}_${userId}`;
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followId));
        await updateDoc(doc(db, 'users', userId), { followers: increment(-1) });
        await updateDoc(doc(db, 'users', user.uid), { following: increment(-1) });
        setIsFollowing(false);
      } else {
        await setDoc(doc(db, 'follows', followId), { followerId: user.uid, followedId: userId, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'users', userId), { followers: increment(1) });
        await updateDoc(doc(db, 'users', user.uid), { following: increment(1) });
        setIsFollowing(true);
      }
    } catch {}
    setFollowLoading(false);
  };

  const handleBell = async () => {
    if (!user?.uid) return;
    const bellId = `${user.uid}_${userId}`;
    try {
      if (bellActive) { await deleteDoc(doc(db, 'bells', bellId)); setBellActive(false); }
      else { await setDoc(doc(db, 'bells', bellId), { bellerId: user.uid, targetUserId: userId, createdAt: serverTimestamp() }); setBellActive(true); }
    } catch {}
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!displayProfile) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <p style={{ fontSize: 56 }}>👻</p>
      <p style={{ fontWeight: 700, marginTop: 16, color: '#fff' }}>Profile not found</p>
    </div>
  );

  const p = displayProfile;
  const bgColors = getBgColors(p);
  const containerBg = bgColors?.[0] || '#080810';
  const accentBg = bgColors?.[bgColors.length - 1] || null;
  const bannerStyle = getBannerStyle(p);
  const usernameStyle = getUsernameStyle(p);
  const badge = getProfileBadge(p);
  const isLegendary = p?.plan === 'legendary';
  const isCreator = ['creator', 'gameconic', 'admin'].includes(p?.accountType);
  const isChampion = p?.isChampion && !isCreator;
  const isLeader = p?.isCurrentLeader && !isCreator;

  const clips = videos.filter(v => (v.contentType === 'clip' || !v.contentType) && (isOwn || (!v.banned && !v.restricted)));

  const TABS = isCreator ? ['Clips', 'Tips', 'Infos'] : ['Clips', 'Infos'];

  // Detect equipped theme (field set when applying, or fall back to bg match)
  const equippedThemeId = p?.equippedTheme ||
    PROFILE_THEMES?.find(t => t.includes?.[0] === (p?.equippedProfileBg || p?.equippedBackground))?.id;
  const themeColor = THEME_COLORS[equippedThemeId];

  return (
    <div style={{ background: containerBg, minHeight: '100vh', paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
      {showStreak && <StreakModal level={p?.streakLevel || 'noob'} points={p?.streakPoints || 0} onClose={() => setShowStreak(false)} />}
      {showQR && <QRModal username={p?.username} onClose={() => setShowQR(false)} />}

      {/* ── Theme animated page borders ── */}
      {themeColor && (
        <>
          <style>{`
            @keyframes theme-sweep-h {
              0%   { background-position: -280px 0; }
              100% { background-position: calc(100vw + 280px) 0; }
            }
            @keyframes theme-sweep-v {
              0%   { background-position: 0 -280px; }
              100% { background-position: 0 calc(100vh + 280px); }
            }
          `}</style>
          {/* Permanent thin colored frame */}
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 120, pointerEvents: 'none', background: `linear-gradient(90deg, ${themeColor.c1}, ${themeColor.c2}, ${themeColor.c1})`, opacity: 0.5 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 2, zIndex: 120, pointerEvents: 'none', background: `linear-gradient(180deg, ${themeColor.c1}, ${themeColor.c2}, ${themeColor.c1})`, opacity: 0.5 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 2, zIndex: 120, pointerEvents: 'none', background: `linear-gradient(90deg, ${themeColor.c1}, ${themeColor.c2}, ${themeColor.c1})`, opacity: 0.5 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 2, zIndex: 120, pointerEvents: 'none', background: `linear-gradient(180deg, ${themeColor.c1}, ${themeColor.c2}, ${themeColor.c1})`, opacity: 0.5 }} />
          {/* Traveling shimmer — TOP */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 121, pointerEvents: 'none',
            background: `linear-gradient(90deg, transparent 0%, ${themeColor.c1}80 35%, ${themeColor.c2} 50%, ${themeColor.c1}80 65%, transparent 100%)`,
            backgroundSize: '280px 100%', backgroundRepeat: 'no-repeat',
            animation: 'theme-sweep-h 2.4s linear infinite',
            boxShadow: `0 0 16px ${themeColor.c1}, 0 0 32px ${themeColor.c2}60`,
          }} />
          {/* Traveling shimmer — RIGHT */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 4, zIndex: 121, pointerEvents: 'none',
            background: `linear-gradient(180deg, transparent 0%, ${themeColor.c1}80 35%, ${themeColor.c2} 50%, ${themeColor.c1}80 65%, transparent 100%)`,
            backgroundSize: '100% 280px', backgroundRepeat: 'no-repeat',
            animation: 'theme-sweep-v 2.4s linear infinite',
            animationDelay: '0.6s',
            boxShadow: `0 0 16px ${themeColor.c1}, 0 0 32px ${themeColor.c2}60`,
          }} />
          {/* Traveling shimmer — BOTTOM */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 4, zIndex: 121, pointerEvents: 'none',
            background: `linear-gradient(270deg, transparent 0%, ${themeColor.c1}80 35%, ${themeColor.c2} 50%, ${themeColor.c1}80 65%, transparent 100%)`,
            backgroundSize: '280px 100%', backgroundRepeat: 'no-repeat',
            animation: 'theme-sweep-h 2.4s linear infinite',
            animationDelay: '1.2s',
            boxShadow: `0 0 16px ${themeColor.c1}, 0 0 32px ${themeColor.c2}60`,
          }} />
          {/* Traveling shimmer — LEFT */}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 4, zIndex: 121, pointerEvents: 'none',
            background: `linear-gradient(360deg, transparent 0%, ${themeColor.c1}80 35%, ${themeColor.c2} 50%, ${themeColor.c1}80 65%, transparent 100%)`,
            backgroundSize: '100% 280px', backgroundRepeat: 'no-repeat',
            animation: 'theme-sweep-v 2.4s linear infinite',
            animationDelay: '1.8s',
            boxShadow: `0 0 16px ${themeColor.c1}, 0 0 32px ${themeColor.c2}60`,
          }} />
        </>
      )}

      {/* Accent blobs */}
      {accentBg && (
        <>
          <div style={{ position: 'fixed', bottom: 100, right: -40, width: 260, height: 260, borderRadius: '50%', background: accentBg, opacity: 0.06, pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'fixed', top: 300, left: -60, width: 180, height: 180, borderRadius: '50%', background: accentBg, opacity: 0.04, pointerEvents: 'none', zIndex: 0 }} />
        </>
      )}

      {/* === BANNER === */}
      <div style={{ ...bannerStyle, height: 160, position: 'relative', overflow: 'hidden' }}>
        {p?.banner && (
          <img src={p.banner} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {/* GA watermark */}
        {!p?.banner && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, fontWeight: 900, color: '#C9A84C', opacity: 0.04, letterSpacing: 10, userSelect: 'none' }}>GA</div>
        )}
        {/* Champion shimmer */}
        {isChampion && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)', animation: 'shimmer 2s ease-in-out infinite' }} />
        )}
        {/* Theme shimmer overlay on banner */}
        {themeColor && (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${themeColor.c1}22, ${themeColor.c2}30, ${themeColor.c1}22, transparent)`, backgroundSize: '300% 100%', animation: 'shimmer 2.5s ease-in-out infinite', pointerEvents: 'none' }} />
        )}
        {/* Theme bottom glow line on banner */}
        {themeColor && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${themeColor.c1}, ${themeColor.c2}, ${themeColor.c1}, transparent)`, backgroundSize: '280px 100%', backgroundRepeat: 'no-repeat', animation: 'theme-sweep-h 2s linear infinite', boxShadow: `0 0 20px ${themeColor.c1}, 0 0 40px ${themeColor.c2}60`, pointerEvents: 'none' }} />
        )}
        {/* Header actions overlay */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
          {[
            { label: '⊞', action: () => setShowQR(true), tip: 'QR Code' },
            { label: '↑', action: () => navigator.share?.({ url: `https://gamingactions.app/user/${p?.username}`, title: p?.username }), tip: 'Share' },
            ...(isOwn ? [{ label: '⚙', action: () => router.push('/settings'), tip: 'Settings' }] : []),
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} title={btn.tip} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              {btn.label}
            </button>
          ))}
        </div>
        <style>{`
          @keyframes shimmer { 0%,100% { transform: translateX(-100%); } 50% { transform: translateX(100%); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-name { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        `}</style>
      </div>

      {/* === PROFILE INFO === */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Avatar + Actions row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 16px', marginTop: -40 }}>
          {/* Avatar (overlaps banner) */}
          <div style={{ flexShrink: 0 }}>
            <FramedAvatar user={p} size={80} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 48 }}>
            {isOwn ? (
              <Link href={`/profile/edit`} style={{
                padding: '9px 18px', borderRadius: 22, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 700, fontSize: 13,
                textDecoration: 'none', display: 'inline-block',
              }}>
                ✏️ Edit Profile
              </Link>
            ) : (
              <>
                <button onClick={handleFollow} disabled={followLoading} style={{
                  padding: '9px 22px', borderRadius: 22, border: 'none', cursor: 'pointer',
                  background: isFollowing ? 'transparent' : 'linear-gradient(135deg, #C9A84C, #E8C96A)',
                  color: isFollowing ? '#888899' : '#000',
                  fontWeight: 900, fontSize: 13,
                  border: isFollowing ? '1px solid #333344' : 'none',
                }}>
                  {followLoading ? '...' : isFollowing ? 'Following' : '+ Follow'}
                </button>
                <button onClick={handleBell} style={{
                  width: 36, height: 36, borderRadius: '50%', border: `1px solid ${bellActive ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  background: bellActive ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
                  color: bellActive ? '#C9A84C' : '#888899', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {bellActive ? '🔔' : '🔕'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name row */}
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.3, ...usernameStyle }}>
              {p?.username}
            </span>
            {isLegendary && (
              <span style={{ background: '#C9A84C', color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.5 }}>
                👑 LEGENDARY
              </span>
            )}
            {p?.accountType === 'creator' && (
              <span style={{ background: '#00A8FF', color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>CREATOR</span>
            )}
            {p?.accountType === 'gameconic' && (
              <span style={{ background: '#FF3B30', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>GAMECONIC</span>
            )}
            {isChampion && (
              <span style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.5)', color: '#C9A84C', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>
                🏆 CHAMPION
              </span>
            )}
            {isLeader && !isChampion && (
              <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>
                ⚡ LEADER
              </span>
            )}
          </div>

          {/* Profile badge */}
          {badge && badge.id !== 'badge_none' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${badge.color || '#C9A84C'}18`, border: `0.5px solid ${badge.color || '#C9A84C'}40`, borderRadius: 8, padding: '3px 8px', marginBottom: 6 }}>
              {badge.emoji && <span style={{ fontSize: 11 }}>{badge.emoji}</span>}
              <span style={{ fontSize: 10, fontWeight: 800, color: badge.color || '#C9A84C' }}>{badge.name}</span>
            </div>
          )}

          {/* Meta (account type, game) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#888899' }}>🎮 {p?.accountType || 'Gamer'}</span>
            {p?.mainGame && <span style={{ fontSize: 12, color: '#888899' }}>· {p.mainGame}</span>}
            {p?.country && <span style={{ fontSize: 12, color: '#888899' }}>· 🌍 {p.country}</span>}
          </div>

          {/* Bio */}
          {p?.bio && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 12 }}>{p.bio}</p>}

          {/* Social links */}
          {p?.socialLinks && Object.entries(p.socialLinks).some(([, v]) => v) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {Object.entries(p.socialLinks).map(([platform, url]) => {
                if (!url) return null;
                const cfg = SOCIAL_ICONS[platform];
                if (!cfg) return null;
                const href = url.startsWith('http') ? url : (SOCIAL_BASES[platform] || '') + url;
                return (
                  <a key={platform} href={href} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 20,
                    background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`,
                    color: cfg.color, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  }}>
                    {cfg.label}
                  </a>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 4 }}>
            {[
              { label: 'Followers', value: fmtNum(p?.followers || 0), href: `/profile/${userId}/followers`, color: null },
              { label: 'Following', value: fmtNum(Array.isArray(p?.following) ? p.following.length : p?.following || 0), href: `/profile/${userId}/following`, color: null },
              { label: 'Clips', value: fmtNum(clips.length), href: null, color: null },
              { label: 'GG ⓘ', value: fmtGG(p?.ggReceived || p?.ggCount || 0), href: null, color: '#C9A84C', borderColor: 'rgba(201,168,76,0.4)' },
              ...(isOwn ? [{ label: 'GA Pts ⓘ', value: (p?.gaPoints || 0).toLocaleString(), href: '/points', color: '#00A8FF', borderColor: 'rgba(0,168,255,0.4)' }] : []),
            ].map((s, i) => {
              const content = (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '10px 12px',
                  textAlign: 'center', border: `0.5px solid ${s.borderColor || 'rgba(255,255,255,0.08)'}`,
                  minWidth: 72, flexShrink: 0,
                }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: s.color || '#fff' }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: s.color || '#888899', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              );
              return s.href ? <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>{content}</Link> : content;
            })}
          </div>
        </div>

        {/* Streak bar */}
        <div style={{ marginTop: 10 }}>
          <StreakBar level={p?.streakLevel || 'noob'} points={p?.streakPoints || 0} onClick={() => setShowStreak(true)} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', padding: '0 16px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{
              padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: activeTab === tab.toLowerCase() ? 800 : 600,
              color: activeTab === tab.toLowerCase() ? '#C9A84C' : '#888899',
              position: 'relative',
            }}>
              {tab}
              {activeTab === tab.toLowerCase() && (
                <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, background: '#C9A84C', borderRadius: 1 }} />
              )}
            </button>
          ))}
        </div>

        {/* ── CLIPS TAB ── */}
        {activeTab === 'clips' && (
          clips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
              <p style={{ color: '#888899', fontSize: 14 }}>No clips yet</p>
              {isOwn && <Link href="/creator" style={{ display: 'inline-block', marginTop: 12, padding: '10px 20px', background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#000', borderRadius: 12, fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>Upload your first clip 🎬</Link>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginTop: 2 }}>
              {clips.map(v => {
                const thumb = getThumbnail(v);
                return (
                  <Link key={v.id} href={`/video/${v.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', aspectRatio: '1/1', background: '#111120', overflow: 'hidden' }}>
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#C9A84C', opacity: 0.25 }}>🎮</div>
                    )}
                    {/* Restricted / Banned overlay */}
                    {(v.restricted || v.banned) && isOwn && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18 }}>{v.banned ? '⛔' : '🚫'}</span>
                        <span style={{ fontSize: 7, color: '#fff', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>{v.banned ? 'Removed' : 'Under review'}</span>
                      </div>
                    )}
                    {/* GG count */}
                    <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.8)', padding: '2px 5px', borderRadius: 4, fontSize: 8, color: '#C9A84C', fontWeight: 800 }}>
                      ⭐ {fmtGG(v.ggCount || 0)}
                    </div>
                    {/* Game tag */}
                    {v.game && (
                      <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: 4, fontSize: 7, color: '#fff', fontWeight: 700, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.game}
                      </div>
                    )}
                    {/* Views */}
                    {(v.viewCount || 0) > 0 && (
                      <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.8)', padding: '2px 5px', borderRadius: 4, fontSize: 8, color: '#fff', fontWeight: 700 }}>
                        👁 {fmtNum(v.viewCount || 0)}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* ── TIPS TAB ── */}
        {activeTab === 'tips' && (
          (() => {
            const tips = videos.filter(v => v.contentType && v.contentType !== 'clip' && (isOwn || (!v.isFanbaseExclusive && !v.banned && !v.restricted)));
            return tips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40 }}>💡</div>
                <p style={{ color: '#888899', fontSize: 14, marginTop: 12 }}>No tips yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginTop: 2 }}>
                {tips.map(v => {
                  const thumb = getThumbnail(v);
                  const catColor = v.contentType === 'flashtuto' ? '#00A8FF' : v.contentType === 'flashinfo' ? '#FF3B30' : v.contentType === 'gameindev' ? '#7C4DFF' : '#888899';
                  const catLabel = v.contentType === 'flashtuto' ? 'TUTO' : v.contentType === 'flashinfo' ? 'INFO' : v.contentType === 'gameindev' ? 'DEV' : '';
                  return (
                    <Link key={v.id} href={`/video/${v.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', aspectRatio: '1/1', background: '#111120', overflow: 'hidden', border: `2px solid ${catColor}` }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💡</div>}
                      {catLabel && <div style={{ position: 'absolute', top: 4, left: 4, background: catColor, padding: '2px 5px', borderRadius: 3, fontSize: 7, fontWeight: 900, color: '#fff' }}>{catLabel}</div>}
                      {v.isFanbaseExclusive && <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,200,83,0.8)', padding: '2px 5px', borderRadius: 3, fontSize: 7, fontWeight: 900, color: '#000' }}>EXCL</div>}
                      <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.8)', padding: '2px 5px', borderRadius: 4, fontSize: 8, color: '#C9A84C', fontWeight: 800 }}>⭐ {v.ggCount || 0}</div>
                    </Link>
                  );
                })}
              </div>
            );
          })()
        )}

        {/* ── INFOS TAB ── */}
        {activeTab === 'infos' && (
          <div style={{ padding: 16 }}>
            {[
              p?.country && { icon: '🌍', text: p.country },
              { icon: '📅', text: `Joined ${p?.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}` },
              p?.mainGame && { icon: '🎮', text: p.mainGame },
              p?.mainConsole && { icon: '🕹️', text: p.mainConsole },
              isOwn && { icon: '✉️', text: user?.email || 'Hidden' },
            ].filter(Boolean).map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 16, marginRight: 12 }}>{row.icon}</span>
                <span style={{ fontSize: 14, color: '#fff' }}>{row.text}</span>
              </div>
            ))}

            {p?.socialLinks && Object.entries(p.socialLinks).some(([, v]) => v) && (
              <>
                <div style={{ fontSize: 10, color: '#888899', fontWeight: 700, letterSpacing: 1.5, marginTop: 16, marginBottom: 8 }}>SOCIAL LINKS</div>
                {Object.entries(p.socialLinks).map(([platform, url]) => {
                  if (!url) return null;
                  const cfg = SOCIAL_ICONS[platform];
                  if (!cfg) return null;
                  const href = url.startsWith('http') ? url : (SOCIAL_BASES[platform] || '') + url;
                  return (
                    <a key={platform} href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                      <span style={{ fontSize: 16, marginRight: 12, color: cfg.color }}>◆</span>
                      <span style={{ fontSize: 14, color: cfg.color }}>{url}</span>
                    </a>
                  );
                })}
              </>
            )}

            {/* Streak detailed */}
            <button onClick={() => setShowStreak(true)} style={{ width: '100%', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: 16, marginTop: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Streak Level · {(STREAK_LEVELS.find(l => l.id === (p?.streakLevel || 'noob'))?.label) || 'NOOB'}</div>
                <div style={{ fontSize: 11, color: '#888899', marginTop: 2 }}>{(p?.streakPoints || 0).toLocaleString()} streak points · tap to learn more</div>
              </div>
              <span style={{ color: '#888899', fontSize: 16 }}>›</span>
            </button>

            {/* Support the App */}
            {isOwn && (
              <Link href="/support" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.5)', borderRadius: 14, padding: 14, marginTop: 12, textDecoration: 'none' }}>
                <span style={{ fontSize: 22 }}>💛</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#fff' }}>Support the App</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#888899', marginTop: 2 }}>Help Gaming Actions keep growing</span>
                </span>
                <span style={{ color: '#888899', fontSize: 16 }}>›</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
