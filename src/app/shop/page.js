'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, runTransaction, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import {
  PROFILE_BACKGROUNDS, PROFILE_BANNERS, USERNAME_EFFECTS,
  PROFILE_BADGES, CARD_BORDERS, PROFILE_THEMES,
  RARITY_CONFIG, canAccessCosmetic,
} from '@/lib/cosmetics';
import { FRAMES, VIDEO_FRAMES, COMMENT_FRAMES } from '@/lib/frames';
import FramedAvatar from '@/components/ui/FramedAvatar';

const CF_BASE = 'https://us-central1-gamingactions-app.cloudfunctions.net';

/* ── legendary free-for-legendary helpers ── */
const isFreebie = (it) => it && it.category !== 'theme' && !it.exclusive && (Number(it.dollarsPrice || 0) > 0 ? Number(it.dollarsPrice) <= 1.49 : Number(it.pointsPrice || 0) > 0);
const hasLegendary = (plan) => plan === 'legendary';

/* ── helpers ── */
async function logPurchase(userId, item, itemType, balanceAfter) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'points_history'), {
      userId, delta: -(item.pointsPrice || 0),
      reason: `${itemType} purchased: ${item.name}`,
      total: balanceAfter, itemId: item.id, itemType,
      createdAt: serverTimestamp(),
    });
  } catch {}
}

async function spendPoints(userId, cost, onSuccess, bypass = false) {
  if (bypass) { try { await onSuccess(); return { ok: true }; } catch (e) { return { ok: false, reason: e.message }; } }
  const ref = doc(db, 'users', userId);
  try {
    let balanceAfter;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('User not found');
      const cur = snap.data().gaPoints || 0;
      if (cur < cost) throw new Error('NOT_ENOUGH_POINTS');
      balanceAfter = cur - cost;
      tx.update(ref, { gaPoints: balanceAfter });
    });
    await onSuccess(balanceAfter);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/* ── categories ── */
const CATS = [
  { id: 'avatar_frames',  label: 'Avatar',     icon: '👤' },
  { id: 'profile_bg',     label: 'Background', icon: '🖼️' },
  { id: 'banners',        label: 'Banner',     icon: '🏞️' },
  { id: 'badges',         label: 'Title',      icon: '🏅' },
  { id: 'username_fx',    label: 'Username',   icon: '✨' },
  { id: 'themes',         label: 'Themes 🔥',  icon: '🎨' },
  { id: 'video_frames',   label: 'Video',      icon: '🎬' },
  { id: 'comment_frames', label: 'Comment',    icon: '💬' },
  { id: 'gift_cards',     label: 'Gift Cards', icon: '🎁' },
];

const PRICE_FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'free',      label: '🎁 Free' },
  { id: 'points',    label: '⭐ Points' },
  { id: 'legendary', label: '👑 Legendary' },
  { id: 'dollars',   label: '💳 Pay' },
  { id: 'owned',     label: '✓ Owned' },
];

/* ── CSS animation helper ── */
function getFrameAnim(frame) {
  if (!frame.animated) return {};
  const id = frame.id || '';
  if (id.includes('rainbow') || id.includes('holo')) return { animation: 'ga-rainbow 2s linear infinite', filter: 'saturate(1.5)' };
  if (id.includes('fire') || id.includes('inferno')) return { animation: 'ga-fire 0.6s ease-in-out infinite' };
  if (id.includes('lightning') || id.includes('storm') || id.includes('blizzard')) return { animation: 'ga-lightning 2.5s ease-in-out infinite' };
  if (id.includes('galaxy') || id.includes('cosmic') || id.includes('nebula')) return { animation: 'ga-galaxy 4s ease-in-out infinite' };
  if (id.includes('matrix') || id.includes('digital')) return { animation: 'ga-matrix 1.5s ease-in-out infinite' };
  if (id.includes('glitch')) return { animation: 'ga-glitch 2s ease-in-out infinite' };
  if (id.includes('sakura') || id.includes('cherry')) return { animation: 'ga-sakura 3s ease-in-out infinite' };
  if (id.includes('void') || id.includes('shadow')) return { animation: 'ga-void 2s ease-in-out infinite' };
  if (id.includes('ice') || id.includes('snow')) return { animation: 'ga-ice 2s ease-in-out infinite' };
  if (id.includes('toxic') || id.includes('poison')) return { animation: 'ga-toxic 1.5s ease-in-out infinite' };
  if (id.includes('portal') || id.includes('spin')) return { animation: 'ga-spin 3s linear infinite' };
  if (id.includes('dna') || id.includes('helix')) return { animation: 'ga-spin 2s linear infinite' };
  return { animation: 'ga-pulse 2s ease-in-out infinite' };
}

/* ── preview components ── */
function BgPreview({ item }) {
  const colors = item.colors || ['#0A0A0F'];
  const main = colors[0], accent = colors[colors.length - 1];
  const mid = colors[Math.floor(colors.length / 2)] || accent;

  let animStyle = {};
  if (item.animated) {
    const id = item.id || '';
    if (id.includes('holographic') || id.includes('rainbow')) {
      animStyle = { backgroundImage: `linear-gradient(135deg, ${colors.join(', ')})`, backgroundSize: '300% 300%', animation: 'ga-holo-bg 3s ease infinite' };
    } else if (id.includes('fire') || id.includes('inferno')) {
      animStyle = { backgroundImage: `linear-gradient(180deg, ${main}, ${mid}, ${accent})`, animation: 'ga-fire 0.8s ease-in-out infinite' };
    } else if (id.includes('lightning') || id.includes('storm') || id.includes('blizzard')) {
      animStyle = { backgroundImage: `linear-gradient(135deg, ${main}, ${mid})`, animation: 'ga-lightning 2s ease-in-out infinite' };
    } else if (id.includes('matrix') || id.includes('code') || id.includes('digital')) {
      animStyle = { backgroundImage: `linear-gradient(180deg, ${main} 0%, ${accent} 100%)`, animation: 'ga-matrix 1.5s ease-in-out infinite' };
    } else if (id.includes('galaxy') || id.includes('cosmic') || id.includes('nebula') || id.includes('starfield')) {
      animStyle = { backgroundImage: `radial-gradient(ellipse at 50% 50%, ${mid}60, ${main})`, animation: 'ga-galaxy 4s ease-in-out infinite' };
    } else if (id.includes('glitch')) {
      animStyle = { backgroundImage: `linear-gradient(135deg, ${main}, ${mid})`, animation: 'ga-glitch 2s ease-in-out infinite' };
    } else if (id.includes('sakura') || id.includes('cherry') || id.includes('rose') || id.includes('bloom')) {
      animStyle = { backgroundImage: `radial-gradient(ellipse at 70% 30%, ${accent}50, ${main})`, animation: 'ga-sakura 3s ease-in-out infinite' };
    } else if (id.includes('void') || id.includes('shadow') || id.includes('smoke')) {
      animStyle = { backgroundImage: `radial-gradient(ellipse at 50% 50%, ${accent}40, ${main})`, animation: 'ga-void 2s ease-in-out infinite' };
    } else if (id.includes('ice') || id.includes('snow') || id.includes('arctic')) {
      animStyle = { backgroundImage: `linear-gradient(135deg, ${main}, ${accent}60, ${main})`, animation: 'ga-ice 2s ease-in-out infinite' };
    } else if (id.includes('vaporwave') || id.includes('neon') || id.includes('cyber')) {
      animStyle = { backgroundImage: `linear-gradient(135deg, ${main}, ${mid}, ${accent})`, backgroundSize: '200% 200%', animation: 'ga-holo-bg 2.5s ease infinite' };
    } else if (id.includes('toxic') || id.includes('wave')) {
      animStyle = { backgroundImage: `radial-gradient(ellipse at 50% 100%, ${accent}50, ${main})`, animation: 'ga-toxic 1.5s ease-in-out infinite' };
    } else {
      animStyle = { backgroundImage: `linear-gradient(135deg, ${main}, ${accent})`, backgroundSize: '200% 200%', animation: 'ga-holo-bg 3s ease infinite' };
    }
  }

  return (
    <div style={{ width: '100%', height: 80, borderRadius: 10, overflow: 'hidden', background: main, ...animStyle, position: 'relative' }}>
      {!item.animated && <>
        <div style={{ position: 'absolute', bottom: -10, right: -10, width: 70, height: 70, borderRadius: '50%', background: accent, opacity: 0.4 }} />
        <div style={{ position: 'absolute', top: -15, left: -15, width: 60, height: 60, borderRadius: '50%', background: accent, opacity: 0.2 }} />
      </>}
      {item.isNew && <div style={NEW_BADGE}>NEW</div>}
      <div style={{ position: 'absolute', bottom: 5, left: 7, fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>PROFILE BG</div>
    </div>
  );
}

function BannerPreview({ item }) {
  const colors = item.colors || ['#0D0820'];
  const accent = colors[colors.length - 1];
  const animStyle = item.animated ? getFrameAnim(item) : {};
  return (
    <div style={{ width: '100%', height: 80, borderRadius: 10, overflow: 'hidden', background: colors[0], position: 'relative', ...animStyle }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.8 }} />
      <div style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: '50%', background: accent, opacity: 0.15 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 2 }}>BANNER</div>
      {item.isNew && <div style={NEW_BADGE}>NEW</div>}
    </div>
  );
}

function UsernamePreview({ item }) {
  const color = item.color || (item.colors?.[0]) || '#fff';
  const colors = item.colors;
  let nameStyle = { fontSize: 18, fontWeight: 900, color };

  if (item.animated) {
    const id = item.id || '';
    if (id.includes('rainbow') || id.includes('holographic') || id.includes('holo') || id.includes('chrome')) {
      nameStyle = { fontSize: 18, fontWeight: 900, background: 'linear-gradient(90deg,#FF0080,#7C4DFF,#00D4FF,#FFD700,#FF0080)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'ga-text-rainbow 2s linear infinite' };
    } else if (id.includes('fire')) {
      nameStyle = { fontSize: 18, fontWeight: 900, background: 'linear-gradient(90deg,#FF3D00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'ga-fire 0.6s ease-in-out infinite' };
    } else if (id.includes('galaxy') || id.includes('galaxy_text')) {
      nameStyle = { fontSize: 18, fontWeight: 900, background: 'linear-gradient(90deg,#7C4DFF,#E040FB,#00D4FF)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'ga-text-rainbow 3s linear infinite' };
    } else if (id.includes('glitch')) {
      nameStyle = { fontSize: 18, fontWeight: 900, color: '#00D4FF', animation: 'ga-glitch 2s ease-in-out infinite' };
    } else if (id.includes('matrix')) {
      nameStyle = { fontSize: 18, fontWeight: 900, color: '#00FF41', textShadow: `0 0 10px #00FF41, 0 0 20px #00FF41`, animation: 'ga-matrix 1.5s ease-in-out infinite' };
    } else if (id.includes('ice')) {
      nameStyle = { fontSize: 18, fontWeight: 900, color: '#A0E8FF', textShadow: `0 0 8px #A0E8FF, 0 0 20px #00D4FF`, animation: 'ga-ice 2s ease-in-out infinite' };
    } else if (id.includes('toxic')) {
      nameStyle = { fontSize: 18, fontWeight: 900, color: '#39FF14', textShadow: `0 0 8px #39FF14, 0 0 20px #39FF14`, animation: 'ga-toxic 1.5s ease-in-out infinite' };
    } else if (id.includes('neon_pulse')) {
      nameStyle = { fontSize: 18, fontWeight: 900, color, textShadow: `0 0 8px ${color}, 0 0 20px ${color}`, animation: 'ga-pulse 1.5s ease-in-out infinite' };
    } else {
      nameStyle = { fontSize: 18, fontWeight: 900, color, textShadow: `0 0 10px ${color}, 0 0 20px ${color}50`, animation: 'ga-pulse 2s ease-in-out infinite' };
    }
  } else if (item.glow) {
    nameStyle = { ...nameStyle, textShadow: `0 0 10px ${color}, 0 0 20px ${color}50` };
  }

  return (
    <div style={{ width: '100%', height: 80, borderRadius: 10, background: '#0A0A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <span style={nameStyle}>PLAYER</span>
      {item.isNew && <div style={NEW_BADGE}>NEW</div>}
    </div>
  );
}

function BadgePreview({ item }) {
  const color = item.color || '#C9A84C';
  const animStyle = item.animated ? { animation: 'ga-pulse 1.5s ease-in-out infinite' } : {};
  return (
    <div style={{ width: '100%', height: 80, borderRadius: 10, background: '#0A0A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative' }}>
      <span style={{ fontSize: 28, ...animStyle }}>{item.emoji || '🏅'}</span>
      <div style={{ background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', boxShadow: item.animated ? `0 0 8px ${color}60` : 'none' }}>
        <span style={{ fontSize: 9, fontWeight: 900, color }}>{item.name}</span>
      </div>
      {item.isNew && <div style={NEW_BADGE}>NEW</div>}
    </div>
  );
}

function CardBorderPreview({ item }) {
  const color = item.color || (item.colors?.[0]) || '#2A2A3A';
  const animFrameStyle = item.animated ? getFrameAnim(item) : {};
  const glowBase = item.glow ? `0 0 8px ${color}80` : 'none';
  const glowAnim = item.animated ? { ...animFrameStyle } : {};
  return (
    <div style={{ width: '100%', height: 80, borderRadius: 10, background: '#0A0A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ width: 56, height: 56, borderRadius: 10, background: '#111120', border: `2px solid ${color}`, boxShadow: glowBase, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color, ...glowAnim }}>👤</div>
      {item.isNew && <div style={NEW_BADGE}>NEW</div>}
    </div>
  );
}

const THEME_PALETTES = {
  theme_champion:    { bg: '#1A1200', banner: '#C9A84C', accent: '#FFD700' },
  theme_phantom:     { bg: '#080010', banner: '#2A0040', accent: '#BF5AF2' },
  theme_inferno:     { bg: '#1A0500', banner: '#FF3D00', accent: '#FFD700' },
  theme_storm:       { bg: '#050510', banner: '#001030', accent: '#FFD700' },
  theme_cosmic:      { bg: '#02000A', banner: '#0A0030', accent: '#E040FB' },
  theme_matrix:      { bg: '#001A05', banner: '#003010', accent: '#00FF41' },
  theme_sakura:      { bg: '#0A0510', banner: '#FF69B4', accent: '#FFB7C5' },
  theme_cyber:       { bg: '#050515', banner: '#FF0080', accent: '#00D4FF' },
  theme_arctic:      { bg: '#000810', banner: '#001030', accent: '#A0E8FF' },
  theme_void_walker: { bg: '#000000', banner: '#130020', accent: '#BC13FE' },
  theme_neon_city:   { bg: '#150020', banner: '#200020', accent: '#FF00FF' },
};
function ThemePreview({ item }) {
  const pal = THEME_PALETTES[item.id] || { bg: '#0A0A0F', banner: '#1A1A1A', accent: '#C9A84C' };
  const animStyle = item.animated ? { animation: 'ga-pulse 2s ease-in-out infinite' } : {};
  return (
    <div style={{ width: '100%', height: 90, borderRadius: 10, overflow: 'hidden', background: pal.bg, position: 'relative' }}>
      <div style={{ height: 40, background: `linear-gradient(135deg, ${pal.banner}CC, ${pal.accent}66)`, position: 'relative', ...animStyle }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: pal.accent, opacity: 0.9 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', marginTop: -12 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: pal.accent, border: `2px solid ${pal.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, boxShadow: `0 0 10px ${pal.accent}` }}>🎮</div>
        <div style={{ marginLeft: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: pal.accent, textShadow: `0 0 8px ${pal.accent}` }}>PLAYER</div>
          <div style={{ background: `${pal.accent}22`, borderRadius: 4, padding: '1px 5px', marginTop: 2, fontSize: 7, color: pal.accent, fontWeight: 800, display: 'inline-block' }}>{item.name.split(' ')[0].toUpperCase()}</div>
        </div>
      </div>
      {item.isNew && <div style={NEW_BADGE}>NEW</div>}
    </div>
  );
}

function AvatarFramePreview({ frame, avatarUrl, username }) {
  const mock = { equippedFrame: frame.id, avatarUrl, username };
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><FramedAvatar user={mock} size={62} /></div>;
}

function VideoFramePreview({ frame }) {
  const color = frame.color || '#2A2A3A';
  const animStyle = frame.animated ? getFrameAnim(frame) : {};
  const glow = frame.glow ? `0 0 ${frame.animated ? 22 : 8}px ${color}${frame.animated ? 'CC' : '80'}` : 'none';
  return (
    <div style={{ width: 80, height: 50, borderRadius: 8, background: '#07071a', border: `${frame.animated ? 2.5 : 2}px solid ${color}`, boxShadow: glow, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: 22, overflow: 'hidden', ...animStyle }}>
      🎮
      {/* Shimmer sweep across the interior */}
      {frame.animated && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${color}20 35%, ${color}70 50%, ${color}20 65%, transparent 100%)`,
          backgroundSize: '250% 100%',
          animation: 'ga-shimmer-sweep 1.8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 3, left: 3, width: 11, height: 11, borderTop: `2.5px solid ${color}`, borderLeft: `2.5px solid ${color}` }} />
      <div style={{ position: 'absolute', top: 3, right: 3, width: 11, height: 11, borderTop: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 3, left: 3, width: 11, height: 11, borderBottom: `2.5px solid ${color}`, borderLeft: `2.5px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 3, right: 3, width: 11, height: 11, borderBottom: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}` }} />
      {/* Pulsing corner dots */}
      {frame.animated && (
        <>
          <div style={{ position: 'absolute', top: 1, left: 1, width: 4, height: 4, borderRadius: '50%', background: color, animation: 'ga-pulse 0.9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: 1, right: 1, width: 4, height: 4, borderRadius: '50%', background: color, animation: 'ga-pulse 0.9s ease-in-out infinite 0.22s' }} />
          <div style={{ position: 'absolute', bottom: 1, left: 1, width: 4, height: 4, borderRadius: '50%', background: color, animation: 'ga-pulse 0.9s ease-in-out infinite 0.45s' }} />
          <div style={{ position: 'absolute', bottom: 1, right: 1, width: 4, height: 4, borderRadius: '50%', background: color, animation: 'ga-pulse 0.9s ease-in-out infinite 0.68s' }} />
        </>
      )}
    </div>
  );
}

function CommentPreview({ frame }) {
  const color = frame.id === 'none' ? '#2A2A3A' : (frame.color || '#2A2A3A');
  const animStyle = frame.animated ? getFrameAnim(frame) : {};
  const glow = frame.glow ? `0 0 ${frame.animated ? 20 : 6}px ${color}${frame.animated ? 'CC' : '80'}` : 'none';
  return (
    <div style={{ width: '100%', borderRadius: 10, padding: '8px 10px', background: '#0A0A0F', border: `${frame.animated ? 2 : 1.5}px solid ${color}`, boxShadow: glow, position: 'relative', overflow: 'hidden', ...animStyle }}>
      {/* Shimmer sweep */}
      {frame.animated && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${color}22 38%, ${color}55 50%, ${color}22 62%, transparent 100%)`,
          backgroundSize: '250% 100%',
          animation: 'ga-shimmer-sweep 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 800 }}>YOU ⚡</div>
        {frame.animated && <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: 'ga-pulse 0.85s ease-in-out infinite' }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, position: 'relative' }}>
        <div style={{ fontSize: 11, color: '#fff' }}>Sample comment 🔥</div>
        {frame.animated && <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, animation: 'ga-pulse 0.85s ease-in-out infinite 0.42s' }} />}
      </div>
    </div>
  );
}

/* ── shared constants ── */
const NEW_BADGE = {
  position: 'absolute', top: 5, left: 5,
  background: 'linear-gradient(135deg, #FF2D55, #FF6D00)',
  borderRadius: 4, padding: '2px 5px', fontSize: 7, fontWeight: 900,
  color: '#fff', letterSpacing: 0.5, animation: 'ga-pulse 1.5s ease-in-out infinite',
  boxShadow: '0 0 8px rgba(255,45,85,0.6)',
};

/* ── rarity badge ── */
function RarityBadge({ rarity }) {
  const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  return (
    <div style={{ background: `${cfg.color}22`, borderRadius: 4, padding: '2px 5px', marginBottom: 3, display: 'inline-block' }}>
      <span style={{ fontSize: 8, fontWeight: 900, color: cfg.color, letterSpacing: 0.5 }}>{cfg.label.toUpperCase()}</span>
    </div>
  );
}

/* ── price tag ── */
function PriceTag({ item, owned, equipped, userPlan }) {
  if (owned && equipped) return <div style={BTN('#00C853', 'rgba(0,200,83,0.15)')}>✓ EQUIPPED</div>;
  if (owned) return <div style={BTN('#00D4FF', 'rgba(0,212,255,0.1)')}>TAP TO EQUIP</div>;
  if (item.free) return <div style={BTN('#888899', 'rgba(255,255,255,0.06)')}>FREE</div>;
  if (item.exclusive) return <div style={{ fontSize: 10, color: '#555566', fontWeight: 700, padding: '5px 0', textAlign: 'center' }}>🔒 EARNED</div>;
  const isFreebie = item.category !== 'theme' && !item.exclusive && (Number(item.dollarsPrice || 0) > 0 ? Number(item.dollarsPrice) <= 1.49 : Number(item.pointsPrice || 0) > 0);
  if (item.legendaryFree && userPlan === 'legendary') return <div style={BTN('#C9A84C', 'rgba(201,168,76,0.15)')}>👑 Legendary ✓</div>;
  if (userPlan === 'legendary' && isFreebie) return <div style={BTN('#C9A84C', 'rgba(201,168,76,0.15)')}>👑 Legendary ✓</div>;
  const hint = isFreebie ? <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div> : null;
  if (item.dollarsPrice) return <div style={{ textAlign: 'center' }}><div style={BTN('#FF2D55', 'rgba(255,45,85,0.1)')}>⚡ CA${item.dollarsPrice.toFixed(2)}</div>{hint}</div>;
  return <div style={{ textAlign: 'center' }}><div style={BTN('#C9A84C', 'rgba(201,168,76,0.1)')}>⭐ {item.pointsPrice} pts</div>{hint}</div>;
}
function BTN(color, bg) {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '6px 0', borderRadius: 8, border: `0.5px solid ${color}`, background: bg, fontSize: 10, fontWeight: 700, color };
}

/* ── toast ── */
function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const bg = type === 'error' ? '#FF2D55' : type === 'success' ? '#00C853' : '#C9A84C';
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: bg, color: type === 'success' || type === 'error' ? '#fff' : '#000', padding: '10px 20px', borderRadius: 14, fontWeight: 800, fontSize: 13, maxWidth: 320, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      {msg}
    </div>
  );
}

/* ── confirm modal ── */
function ConfirmModal({ config, onConfirm, onCancel }) {
  if (!config) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#141420', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', border: '0.5px solid rgba(201,168,76,0.3)' }}>
        <h3 style={{ fontWeight: 900, fontSize: 18, color: '#fff', margin: '0 0 8px' }}>{config.title}</h3>
        <p style={{ fontSize: 13, color: '#888899', margin: '0 0 20px', lineHeight: 1.5 }}>{config.message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid #2A2A3A', background: 'transparent', color: '#888899', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1.5, padding: '11px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>{config.action}</button>
        </div>
      </div>
    </div>
  );
}

/* ── champion banner ── */
function ChampionBanner({ type }) {
  const labels = { avatar: 'Avatar Frame', video: 'Video Frame', comment: 'Comment Frame' };
  return (
    <div style={{ margin: '10px 12px 8px', borderRadius: 12, padding: '12px 14px', background: '#15130a', border: '0.5px solid rgba(232,201,107,0.35)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,201,107,0.1)', border: '2px solid #E8C96B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⚡</div>
      <div>
        <div style={{ fontSize: 7, fontWeight: 900, color: '#FFD700', letterSpacing: 1, marginBottom: 2 }}>EXCLUSIVE · MONTHLY REWARD</div>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>CHAMPION {labels[type]?.toUpperCase()}</div>
        <div style={{ fontSize: 9, color: '#888899', marginTop: 1 }}>🔒 Cannot be bought — earned by becoming Champion</div>
      </div>
    </div>
  );
}

/* ── main page ── */
export default function ShopPage() {
  const router = useRouter();
  const { user, userProfile, saveProfile, refreshProfile } = useAuthStore();
  const [cat, setCat] = useState('avatar_frames');
  const [priceFilter, setPriceFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { title, message, action, onConfirm }

  const showToast = (msg, type = 'info', ms = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), ms);
  };

  /* ── stripe return handling — must be before any conditional return ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchased = params.get('purchased');
    const canceled = params.get('canceled');
    if (purchased) {
      setToast({ msg: '✅ Achat réussi ! Ton cosmétique sera débloqué sous peu.', type: 'success' });
      setTimeout(() => setToast(null), 5000);
      refreshProfile?.();
      window.history.replaceState({}, '', '/shop');
    } else if (canceled === 'true') {
      setToast({ msg: 'Paiement annulé.', type: 'info' });
      setTimeout(() => setToast(null), 3000);
      window.history.replaceState({}, '', '/shop');
    }
  }, []);

  const isAdmin = ['gameconic', 'admin'].includes(userProfile?.accountType) || !!userProfile?.isAdmin;
  const gaPoints = userProfile?.gaPoints || 0;
  const userPlan = userProfile?.plan || 'free';
  const ownedFrames = userProfile?.ownedFrames || ['none'];
  const ownedVideoFrames = userProfile?.ownedVideoFrames || ['none'];
  const ownedCommentFrames = userProfile?.ownedCommentFrames || ['none'];
  const ownedCosmetics = userProfile?.ownedCosmetics || [];

  if (!user) return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 56 }}>🛒</div>
      <h2 style={{ fontWeight: 900, color: '#fff' }}>Sign in to access the Shop</h2>
      <button onClick={() => router.push('/auth')} style={{ padding: '13px 30px', background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#000', fontWeight: 900, fontSize: 15, borderRadius: 14, border: 'none', cursor: 'pointer' }}>Log in / Sign up</button>
    </div>
  );

  /* ── stripe checkout ── */
  const handleStripeCheckout = async (item, itemType = 'cosmetic') => {
    if (!user) { router.push('/auth?mode=register'); return; }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${CF_BASE}/createCosmeticCheckoutSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          itemId: item.id,
          itemType,
          itemName: item.name,
          amountCents: Math.round((item.dollarsPrice || 0) * 100),
          successUrl: `${window.location.origin}/shop?purchased=${item.id}`,
          cancelUrl: `${window.location.origin}/shop`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erreur checkout');
      }
    } catch (e) {
      showToast(`Erreur : ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── purchase helpers ── */
  const equipCosmetic = async (item, extraFields = {}) => {
    const catMap = { background: 'equippedProfileBg', banner: 'equippedProfileBanner', badge: 'equippedProfileBadge', username: 'equippedUsernameEffect', card: 'equippedCardBorder' };
    const field = catMap[item.category];
    const patch = field ? { [field]: item.id, ...extraFields } : extraFields;
    await saveProfile(patch);
    await refreshProfile?.();
  };

  const handleCosmetic = async (item) => {
    if (item.exclusive) { showToast('🔒 Exclusive — earned via gameplay only', 'info'); return; }
    const free = item.free || (item.legendaryFree && userPlan === 'legendary');
    const ownedList = [...ownedCosmetics, ...PROFILE_BACKGROUNDS.filter(b => b.free).map(b => b.id), ...PROFILE_BANNERS.filter(b => b.free).map(b => b.id), ...PROFILE_BADGES.filter(b => b.free).map(b => b.id), ...USERNAME_EFFECTS.filter(u => u.free).map(u => u.id), ...CARD_BORDERS.filter(c => c.free).map(c => c.id)];
    const owned = isAdmin || canAccessCosmetic(item, userPlan, ownedList);
    if (owned) {
      setLoading(true);
      await equipCosmetic(item);
      setLoading(false);
      showToast(`✅ "${item.name}" equipped!`, 'success');
      return;
    }
    if (item.dollarsPrice && !isAdmin) { handleStripeCheckout(item, 'cosmetic'); return; }
    if (item.legendaryFree && userPlan !== 'legendary') {
      setModal({ title: '👑 Legendary Required', message: 'This item is free for Legendary subscribers. Upgrade to unlock it instantly.', action: 'See Legendary', onConfirm: () => { setModal(null); router.push('/legendary'); } });
      return;
    }
    if (!isAdmin && gaPoints < (item.pointsPrice || 0)) { showToast(`Not enough GA Points — need ${item.pointsPrice} pts, you have ${gaPoints}`, 'error'); return; }
    setModal({
      title: `Buy "${item.name}"?`,
      message: `Cost: ${item.pointsPrice} GA Points\nYour balance: ${gaPoints} pts\n\n${item.desc || ''}`,
      action: `Buy — ${item.pointsPrice} pts`,
      onConfirm: async () => {
        setModal(null); setLoading(true);
        const result = await spendPoints(user.uid, isAdmin ? 0 : item.pointsPrice, async (balAfter) => {
          const newOwned = [...new Set([...ownedCosmetics, item.id])];
          await equipCosmetic(item, { ownedCosmetics: newOwned });
          if (!isAdmin && balAfter !== undefined) await logPurchase(user.uid, item, item.category, balAfter);
          await refreshProfile?.();
        }, isAdmin);
        setLoading(false);
        if (result.ok) showToast(`✅ "${item.name}" equipped!`, 'success');
        else if (result.reason === 'NOT_ENOUGH_POINTS') showToast('Not enough GA Points', 'error');
        else showToast('Purchase failed. Try again.', 'error');
      },
    });
  };

  const handleAvatarFrame = async (frame) => {
    if (frame.exclusive) { showToast('🔒 Awarded automatically to Champion', 'info'); return; }
    if (frame.free || frame.id === 'none') { setLoading(true); await saveProfile({ equippedFrame: frame.id }); await refreshProfile?.(); setLoading(false); showToast(`✅ "${frame.name}" equipped!`, 'success'); return; }
    const owned = isAdmin || ownedFrames.includes(frame.id) || (hasLegendary(userPlan) && isFreebie(frame));
    if (owned) {
      const newId = userProfile?.equippedFrame === frame.id ? 'none' : frame.id;
      setLoading(true); await saveProfile({ equippedFrame: newId }); await refreshProfile?.(); setLoading(false);
      showToast(newId === 'none' ? 'Frame removed' : `✅ "${frame.name}" equipped!`, 'success'); return;
    }
    if (frame.animated && frame.dollarsPrice && !isAdmin) { handleStripeCheckout(frame, 'avatar_frame'); return; }
    if (!isAdmin && gaPoints < frame.pointsPrice) { showToast(`Not enough GA Points — need ${frame.pointsPrice}`, 'error'); return; }
    setModal({
      title: `Buy "${frame.name}"?`, message: `Cost: ${frame.pointsPrice} pts\nYour balance: ${gaPoints} pts`,
      action: `Buy — ${frame.pointsPrice} pts`,
      onConfirm: async () => {
        setModal(null); setLoading(true);
        const result = await spendPoints(user.uid, isAdmin ? 0 : frame.pointsPrice, async (balAfter) => {
          const newOwned = [...new Set([...ownedFrames, frame.id])];
          await saveProfile({ ownedFrames: newOwned, equippedFrame: frame.id });
          await refreshProfile?.();
          if (!isAdmin && balAfter !== undefined) await logPurchase(user.uid, frame, 'avatar_frame', balAfter);
        }, isAdmin);
        setLoading(false);
        if (result.ok) showToast(`✅ "${frame.name}" equipped!`, 'success');
        else if (result.reason === 'NOT_ENOUGH_POINTS') showToast('Not enough GA Points', 'error');
        else showToast('Purchase failed. Try again.', 'error');
      },
    });
  };

  const handleVideoFrame = async (frame) => {
    if (frame.exclusive) { showToast('🔒 Champion exclusive', 'info'); return; }
    const owned = isAdmin || frame.free || ownedVideoFrames.includes(frame.id) || (hasLegendary(userPlan) && isFreebie(frame));
    if (owned) { showToast(`✅ "${frame.name}" available when uploading!`, 'success'); return; }
    if (frame.animated && frame.dollarsPrice && !isAdmin) { handleStripeCheckout(frame, 'video_frame'); return; }
    if (!isAdmin && gaPoints < frame.pointsPrice) { showToast(`Need ${frame.pointsPrice} pts`, 'error'); return; }
    setModal({
      title: `Buy "${frame.name}"?`, message: `Cost: ${frame.pointsPrice} pts — available when uploading clips.`,
      action: `Buy — ${frame.pointsPrice} pts`,
      onConfirm: async () => {
        setModal(null); setLoading(true);
        const result = await spendPoints(user.uid, isAdmin ? 0 : frame.pointsPrice, async (balAfter) => {
          await saveProfile({ ownedVideoFrames: [...new Set([...ownedVideoFrames, frame.id])] });
          await refreshProfile?.();
          if (!isAdmin && balAfter !== undefined) await logPurchase(user.uid, frame, 'video_frame', balAfter);
        }, isAdmin);
        setLoading(false);
        if (result.ok) showToast(`✅ "${frame.name}" unlocked!`, 'success');
        else showToast('Purchase failed', 'error');
      },
    });
  };

  const handleCommentFrame = async (frame) => {
    if (frame.exclusive) { showToast('🔒 Champion exclusive', 'info'); return; }
    const owned = isAdmin || frame.free || frame.pointsPrice === 0 || ownedCommentFrames.includes(frame.id) || (frame.legendaryFree && userPlan === 'legendary') || (hasLegendary(userPlan) && isFreebie(frame));
    if (owned) {
      setLoading(true); await saveProfile({ equippedCommentFrame: frame.id }); await refreshProfile?.(); setLoading(false);
      showToast(`✅ "${frame.name}" is your comment frame!`, 'success'); return;
    }
    if (frame.animated && frame.dollarsPrice && !isAdmin) { handleStripeCheckout(frame, 'comment_frame'); return; }
    if (!isAdmin && gaPoints < frame.pointsPrice) { showToast(`Need ${frame.pointsPrice} pts`, 'error'); return; }
    setModal({
      title: `Buy "${frame.name}"?`, message: `Cost: ${frame.pointsPrice} pts — shows as a glowing border on all your comments.`,
      action: `Buy — ${frame.pointsPrice} pts`,
      onConfirm: async () => {
        setModal(null); setLoading(true);
        const result = await spendPoints(user.uid, isAdmin ? 0 : frame.pointsPrice, async (balAfter) => {
          const newOwned = [...new Set([...ownedCommentFrames, frame.id])];
          await saveProfile({ equippedCommentFrame: frame.id, ownedCommentFrames: newOwned });
          await refreshProfile?.();
          if (!isAdmin && balAfter !== undefined) await logPurchase(user.uid, frame, 'comment_frame', balAfter);
        }, isAdmin);
        setLoading(false);
        if (result.ok) showToast(`✅ "${frame.name}" equipped on comments!`, 'success');
        else showToast('Purchase failed', 'error');
      },
    });
  };

  const handleTheme = async (theme) => {
    const owned = isAdmin || ownedCosmetics.includes(theme.id);
    if (theme.dollarsPrice && !isAdmin && !owned) { handleStripeCheckout(theme, 'theme'); return; }
    setModal({
      title: `Apply "${theme.name}"?`,
      message: `Activates all ${(theme.includes || []).length} items of this theme on your profile at once.`,
      action: owned ? 'Apply Theme 🎨' : `Buy CA$${theme.dollarsPrice?.toFixed(2)}`,
      onConfirm: async () => {
        setModal(null); setLoading(true);
        await saveProfile({
          equippedProfileBg: theme.includes?.[0],
          equippedProfileBanner: theme.includes?.[1],
          equippedProfileBadge: theme.includes?.[2],
          equippedCardBorder: theme.includes?.[3],
          equippedUsernameEffect: theme.includes?.[4],
          equippedTheme: theme.id,
        });
        await refreshProfile?.(); setLoading(false);
        showToast(`✅ "${theme.name}" applied!`, 'success');
      },
    });
  };

  const filterItems = (items, getOwned) => items.filter(item => {
    if (priceFilter === 'owned') return getOwned(item);
    if (priceFilter === 'free') return item.free;
    if (priceFilter === 'points') return item.pointsPrice > 0 && !item.dollarsPrice;
    if (priceFilter === 'legendary') return item.legendaryFree;
    if (priceFilter === 'dollars') return !!item.dollarsPrice;
    return true;
  });

  const cosmeticOwned = (item) => isAdmin || canAccessCosmetic(item, userPlan, [...ownedCosmetics, ...(item.free ? [item.id] : [])]);
  const commentOwned = (f) => isAdmin || f.free || f.pointsPrice === 0 || ownedCommentFrames.includes(f.id) || (f.legendaryFree && userPlan === 'legendary') || (hasLegendary(userPlan) && isFreebie(f));

  const FEATURED = [
    { id: 'theme_cosmic',   name: 'Cosmic Entity 💫', price: 'CA$7.99', color: '#E040FB', cat: 'themes', emoji: '💫', desc: 'Pack complet légendaire' },
    { id: 'bg_void_pulse',  name: 'Void Pulse 🌑',    price: 'CA$3.99', color: '#BC13FE', cat: 'profile_bg', emoji: '🌑', desc: 'Background animé' },
    { id: 'theme_cyber',    name: 'Cyber Punk 💻',    price: 'CA$6.99', color: '#00D4FF', cat: 'themes', emoji: '💻', desc: 'Pack glitch complet', isNew: true },
    { id: 'portal_frame',   name: 'Portal 🌀',        price: 'CA$3.99', color: '#7C4DFF', cat: 'avatar_frames', emoji: '🌀', desc: 'Frame animée', isNew: true },
    { id: 'theme_void_walker', name: 'Void Walker 🌑', price: 'CA$6.99', color: '#7C4DFF', cat: 'themes', emoji: '🌑', desc: 'Pack ténèbres', isNew: true },
    { id: 'bg_cherry_bloom', name: 'Cherry Bloom 🌸', price: 'CA$2.99', color: '#FF69B4', cat: 'profile_bg', emoji: '🌸', desc: 'Background animé', isNew: true },
  ];

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', paddingBottom: 80, position: 'relative' }}>
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ga-pulse {
          0%,100% { opacity:1; box-shadow: 0 0 8px currentColor; }
          50% { opacity:0.85; box-shadow: 0 0 22px currentColor, 0 0 40px currentColor; }
        }
        @keyframes ga-rainbow {
          from { filter: hue-rotate(0deg) saturate(1.8) brightness(1.1); }
          to   { filter: hue-rotate(360deg) saturate(1.8) brightness(1.1); }
        }
        @keyframes ga-text-rainbow {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ga-holo-bg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ga-fire {
          0%,100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
          25% { transform: scale(1.04) rotate(-0.5deg); filter: brightness(1.15); }
          50% { transform: scale(0.97) rotate(0.5deg); filter: brightness(0.95); }
          75% { transform: scale(1.03) rotate(-0.3deg); filter: brightness(1.1); }
        }
        @keyframes ga-lightning {
          0%,80%,100% { opacity:1; box-shadow: 0 0 10px currentColor; }
          85% { opacity:0.2; box-shadow:none; }
          88% { opacity:1; box-shadow: 0 0 30px currentColor, 0 0 60px currentColor; }
          92% { opacity:0.5; }
        }
        @keyframes ga-galaxy {
          0%   { filter: hue-rotate(0deg) brightness(1); }
          50%  { filter: hue-rotate(30deg) brightness(1.2); }
          100% { filter: hue-rotate(0deg) brightness(1); }
        }
        @keyframes ga-matrix {
          0%,100% { text-shadow: 0 0 5px #00FF41; opacity:1; }
          50% { text-shadow: 0 0 20px #00FF41, 0 0 50px #00FF41; opacity:0.9; }
        }
        @keyframes ga-glitch {
          0%,85%,100% { transform:translateX(0); filter:none; }
          86% { transform:translateX(-3px) skewX(-2deg); filter:hue-rotate(90deg) saturate(3); }
          88% { transform:translateX(3px) skewX(2deg); filter:hue-rotate(-90deg) saturate(3); }
          90% { transform:translateX(-2px); filter:none; }
          92% { transform:translateX(2px); filter:hue-rotate(180deg) saturate(2); }
          94% { transform:translateX(0); filter:none; }
        }
        @keyframes ga-sakura {
          0%,100% { transform:translateY(0) rotate(0deg); opacity:1; }
          33% { transform:translateY(-6px) rotate(5deg); opacity:0.9; }
          66% { transform:translateY(4px) rotate(-4deg); opacity:0.95; }
        }
        @keyframes ga-void {
          0%,100% { box-shadow: 0 0 10px #BC13FE, 0 0 20px #7C4DFF; }
          50% { box-shadow: 0 0 30px #BC13FE, 0 0 70px #7C4DFF, 0 0 110px #BC13FE; }
        }
        @keyframes ga-ice {
          0%,100% { box-shadow: 0 0 5px #A0E8FF, 0 0 15px #00D4FF; filter:brightness(1); }
          50% { box-shadow: 0 0 20px #A0E8FF, 0 0 50px #00D4FF; filter:brightness(1.3); }
        }
        @keyframes ga-toxic {
          0%,100% { box-shadow: 0 0 8px #39FF14, 0 0 20px #39FF14; }
          33% { box-shadow: 0 0 20px #39FF14, 0 0 50px #00FF88; }
          66% { box-shadow: 0 0 4px #39FF14; }
        }
        @keyframes ga-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ga-float {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ga-shimmer-sweep {
          0%   { background-position: -250% 0; }
          100% { background-position: 350% 0; }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}} />

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {modal && <ConfirmModal config={modal} onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />}
      {loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--white)', margin: 0 }}>Shop 🛒</h1>
          <p style={{ fontSize: 12, color: 'var(--gray)', margin: '2px 0 0' }}>Customize your profile</p>
          {isAdmin && <div style={{ marginTop: 4, background: 'rgba(255,45,85,0.1)', borderRadius: 8, padding: '2px 8px', display: 'inline-block', fontSize: 9, color: '#FF2D55', fontWeight: 900 }}>⚡ ADMIN — All items free</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--gold)', borderRadius: 20, padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ fontSize: 15, color: 'var(--gold)', fontWeight: 800 }}>{gaPoints.toLocaleString()}</span>
            <span style={{ fontSize: 11, color: 'var(--gray)' }}>pts</span>
          </div>
          {userPlan === 'legendary' && <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800, marginTop: 4 }}>👑 Legendary</div>}
          <Link href="/shop/purchases" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>
            🛍️ My Purchases
          </Link>
        </div>
      </div>

      {/* Gift Cards — shortcut visible next to the points (turn points → gift cards) */}
      <button onClick={() => { setCat('gift_cards'); setPriceFilter('all'); }} style={{
        margin: '4px 14px 8px', padding: 12, width: 'calc(100% - 28px)',
        background: 'rgba(255,45,85,0.08)', borderRadius: 12, border: '0.5px solid rgba(255,45,85,0.31)',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,45,85,0.14)', fontSize: 18, flexShrink: 0 }}>🎁</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--white)' }}>Turn your points into Gift Cards 🎁</span>
          <span style={{ display: 'block', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>Amazon, PlayStation, Xbox, Steam… with your GA Points</span>
        </span>
        <span style={{ color: 'var(--gray)', fontSize: 18 }}>›</span>
      </button>

      {/* Earn banner */}
      <div style={{ margin: '0 14px 10px', padding: '10px 12px', background: 'rgba(0,212,255,0.06)', borderRadius: 10, border: '0.5px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <span style={{ fontSize: 10, color: '#888899' }}>Earn pts: +25/clip · +2/GG · +1/follower · daily login · monthly ranking rewards</span>
      </div>

      {/* ── Featured Strip ── */}
      <div style={{ margin: '0 0 10px' }}>
        <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>🔥 Featured</span>
          <span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700 }}>Top picks</span>
        </div>
        <div style={{ overflowX: 'auto', display: 'flex', gap: 10, padding: '0 14px 4px', scrollbarWidth: 'none' }}>
          {FEATURED.map(item => (
            <button key={item.id} onClick={() => { setCat(item.cat); setPriceFilter('all'); }} style={{
              flexShrink: 0, width: 130, borderRadius: 14, padding: 10, cursor: 'pointer', textAlign: 'left',
              background: `linear-gradient(135deg, #0A0A1A, ${item.color}18)`,
              border: `1px solid ${item.color}50`,
              boxShadow: `0 0 14px ${item.color}25`,
              animation: 'ga-float 0.5s ease-out',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontSize: 24, animation: 'ga-pulse 2s ease-in-out infinite' }}>{item.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{item.name}</div>
              {item.isNew && <div style={{ background: 'linear-gradient(90deg,#FF2D55,#FF6D00)', borderRadius: 4, padding: '1px 5px', fontSize: 7, fontWeight: 900, color: '#fff', display: 'inline-block', width: 'fit-content' }}>NEW</div>}
              <div style={{ fontSize: 9, color: '#888899' }}>{item.desc}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: item.color, marginTop: 2 }}>{item.price}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ overflowX: 'auto', paddingLeft: 14, paddingRight: 14, paddingBottom: 12, display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => { setCat(c.id); setPriceFilter('all'); }} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 20, whiteSpace: 'nowrap', height: 34,
            background: cat === c.id ? '#C9A84C' : '#1A1A26', border: `0.5px solid ${cat === c.id ? '#C9A84C' : '#2A2A3A'}`,
            color: cat === c.id ? '#000' : '#888899', fontSize: 11, fontWeight: cat === c.id ? 800 : 600, cursor: 'pointer',
          }}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Price filter */}
      {cat !== 'gift_cards' && (
        <div style={{ overflowX: 'auto', paddingLeft: 14, paddingRight: 14, paddingBottom: 10, display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
          {PRICE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setPriceFilter(f.id)} style={{
              padding: '7px 14px', borderRadius: 20, whiteSpace: 'nowrap', height: 36,
              background: priceFilter === f.id ? 'rgba(201,168,76,0.15)' : '#1A1A26',
              border: `1px solid ${priceFilter === f.id ? '#C9A84C' : '#2A2A3A'}`,
              color: priceFilter === f.id ? '#C9A84C' : '#888899', fontSize: 12, fontWeight: priceFilter === f.id ? 900 : 700, cursor: 'pointer',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── AVATAR FRAMES ─── */}
      {cat === 'avatar_frames' && (
        <div>
          <ChampionBanner type="avatar" />
          <div style={GRID}>
            {filterItems(FRAMES.filter(f => !f.exclusive), f => isAdmin || f.free || ownedFrames.includes(f.id) || (hasLegendary(userPlan) && isFreebie(f)))
              .sort((a, b) => (a.pointsPrice || 0) - (b.pointsPrice || 0))
              .map(frame => {
                const legFreebie = isFreebie(frame);
                const owned = isAdmin || frame.free || ownedFrames.includes(frame.id) || (hasLegendary(userPlan) && legFreebie);
                const equipped = userProfile?.equippedFrame === frame.id;
                return (
                  <button key={frame.id} onClick={() => handleAvatarFrame(frame)} style={CARD(equipped ? frame.color : frame.animated ? frame.color + '22' : null)}>
                    <div style={PREVIEW_WRAP}>
                      <AvatarFramePreview frame={frame} avatarUrl={userProfile?.avatar} username={userProfile?.username} />
                      {equipped && <div style={DOT('#00C853')}>✓</div>}
                      {owned && !equipped && !frame.free && <div style={DOT('#00D4FF')}>✓</div>}
                      {frame.isNew && !owned && <div style={{ position: 'absolute', top: 4, left: 4, background: 'linear-gradient(90deg,#FF2D55,#FF6D00)', borderRadius: 4, padding: '2px 4px', fontSize: 7, fontWeight: 900, color: '#fff' }}>NEW</div>}
                    </div>
                    <span style={NAME}>{frame.name}</span>
                    {equipped ? <div style={BTN('#00C853', 'rgba(0,200,83,0.15)')}>✓ EQUIPPED</div>
                      : owned && hasLegendary(userPlan) && legFreebie && !ownedFrames.includes(frame.id) ? <div style={BTN('#C9A84C', 'rgba(201,168,76,0.15)')}>👑 Legendary ✓</div>
                      : owned ? <div style={BTN('#00D4FF', 'rgba(0,212,255,0.1)')}>TAP TO EQUIP</div>
                      : frame.animated ? <div style={{ textAlign: 'center' }}><div style={BTN('#FF2D55', 'rgba(255,45,85,0.1)')}>⚡ CA${frame.dollarsPrice?.toFixed(2)}</div>{legFreebie && <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div>}</div>
                      : <div style={{ textAlign: 'center' }}><div style={BTN('#C9A84C', 'rgba(201,168,76,0.1)')}>⭐ {frame.pointsPrice} pts</div>{legFreebie && <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div>}</div>}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── BACKGROUND ─── */}
      {cat === 'profile_bg' && (
        <div>
          <InfoBanner icon="🎨" text="Profile backgrounds replace the dark black on your profile page. Visible to everyone who visits." />
          <div style={GRID}>
            {filterItems(PROFILE_BACKGROUNDS, cosmeticOwned).map(item => {
              const owned = cosmeticOwned(item);
              const equipped = userProfile?.equippedProfileBg === item.id;
              return (
                <button key={item.id} onClick={() => handleCosmetic(item)} style={CARD(owned ? item.colors?.[0] : null)}>
                  <div style={PREVIEW_WRAP}><BgPreview item={item} /></div>
                  <RarityBadge rarity={item.rarity} />
                  <span style={NAME}>{item.name}</span>
                  <span style={DESC}>{item.preview || item.desc}</span>
                  <PriceTag item={item} owned={owned} equipped={equipped} userPlan={userPlan} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── BANNERS ─── */}
      {cat === 'banners' && (
        <div>
          <InfoBanner icon="🏞️" text="Banners are the large image zone at the top of your profile — the first thing anyone sees." />
          <div style={GRID}>
            {filterItems(PROFILE_BANNERS, cosmeticOwned).map(item => {
              const owned = cosmeticOwned(item);
              const equipped = userProfile?.equippedProfileBanner === item.id;
              return (
                <button key={item.id} onClick={() => handleCosmetic(item)} style={CARD(owned ? item.colors?.[0] : null)}>
                  <div style={PREVIEW_WRAP}><BannerPreview item={item} /></div>
                  <RarityBadge rarity={item.rarity} />
                  <span style={NAME}>{item.name}</span>
                  <span style={DESC}>{item.preview || item.desc}</span>
                  <PriceTag item={item} owned={owned} equipped={equipped} userPlan={userPlan} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── BADGES ─── */}
      {cat === 'badges' && (
        <div>
          <InfoBanner icon="🏅" text="Titles/Badges appear under your username on your profile AND in comments. Show your identity." />
          <div style={GRID}>
            {filterItems(PROFILE_BADGES, cosmeticOwned).map(item => {
              const owned = cosmeticOwned(item);
              const equipped = userProfile?.equippedProfileBadge === item.id;
              return (
                <button key={item.id} onClick={() => handleCosmetic(item)} style={CARD(owned ? item.color : null)}>
                  <div style={PREVIEW_WRAP}><BadgePreview item={item} /></div>
                  <RarityBadge rarity={item.rarity} />
                  <span style={NAME}>{item.name}</span>
                  <span style={DESC}>{item.desc}</span>
                  <PriceTag item={item} owned={owned} equipped={equipped} userPlan={userPlan} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── USERNAME FX ─── */}
      {cat === 'username_fx' && (
        <div>
          <InfoBanner icon="✨" text="Username effects change the color and glow of your name. Animated versions pulse with light." />
          <div style={GRID}>
            {filterItems(USERNAME_EFFECTS, cosmeticOwned).map(item => {
              const owned = cosmeticOwned(item);
              const equipped = userProfile?.equippedUsernameEffect === item.id;
              return (
                <button key={item.id} onClick={() => handleCosmetic(item)} style={CARD(owned ? (item.color || item.colors?.[0]) : null)}>
                  <div style={PREVIEW_WRAP}><UsernamePreview item={item} /></div>
                  <RarityBadge rarity={item.rarity} />
                  <span style={NAME}>{item.name}</span>
                  <span style={DESC}>{item.desc}</span>
                  <PriceTag item={item} owned={owned} equipped={equipped} userPlan={userPlan} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── THEMES ─── */}
      {cat === 'themes' && (
        <div>
          <InfoBanner icon="🔥" text="Themes are complete packs — background, banner, title, card border and username effect all at once. Best value." gold />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '8px 14px 14px' }}>
            {filterItems(PROFILE_THEMES, t => isAdmin || ownedCosmetics.includes(t.id)).map(theme => {
              const owned = isAdmin || ownedCosmetics.includes(theme.id);
              return (
                <button key={theme.id} onClick={() => handleTheme(theme)} style={CARD(owned ? '#C9A84C' : null)}>
                  <div style={{ ...PREVIEW_WRAP, height: 80 }}><ThemePreview item={theme} /></div>
                  <RarityBadge rarity={theme.rarity || 'legendary'} />
                  <span style={NAME}>{theme.name}</span>
                  <span style={DESC}>{(theme.includes || []).length} items</span>
                  {owned ? <div style={BTN('#C9A84C', 'rgba(201,168,76,0.15)')}>🎨 APPLY</div>
                    : <div style={BTN('#FF2D55', 'rgba(255,45,85,0.1)')}>⚡ CA${theme.dollarsPrice?.toFixed(2)}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIDEO FRAMES ─── */}
      {cat === 'video_frames' && (
        <div>
          <InfoBanner icon="🎬" text="Video frames appear as a border around your clips in the feed." />
          <ChampionBanner type="video" />
          <div style={GRID}>
            {filterItems(VIDEO_FRAMES.filter(f => !f.exclusive), f => isAdmin || f.free || ownedVideoFrames.includes(f.id) || (hasLegendary(userPlan) && isFreebie(f)))
              .sort((a, b) => (a.pointsPrice || 0) - (b.pointsPrice || 0)).map(frame => {
              const legFreebie = isFreebie(frame);
              const legOwned = hasLegendary(userPlan) && legFreebie && !ownedVideoFrames.includes(frame.id);
              const owned = isAdmin || frame.free || ownedVideoFrames.includes(frame.id) || (hasLegendary(userPlan) && legFreebie);
              return (
                <button key={frame.id} onClick={() => handleVideoFrame(frame)} style={CARD(owned ? frame.color : null)}>
                  <div style={PREVIEW_WRAP}><VideoFramePreview frame={frame} /></div>
                  <span style={NAME}>{frame.name}</span>
                  <span style={DESC}>{frame.desc}</span>
                  {legOwned ? <div style={BTN('#C9A84C', 'rgba(201,168,76,0.15)')}>👑 Legendary ✓</div>
                    : owned ? <div style={BTN('#00D4FF', 'rgba(0,212,255,0.1)')}>✓ OWNED</div>
                    : frame.animated ? <div style={{ textAlign: 'center' }}><div style={BTN('#FF2D55', 'rgba(255,45,85,0.1)')}>⚡ CA${frame.dollarsPrice?.toFixed(2)}</div>{legFreebie && <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div>}</div>
                    : <div style={{ textAlign: 'center' }}><div style={BTN('#C9A84C', 'rgba(201,168,76,0.1)')}>⭐ {frame.pointsPrice} pts</div>{legFreebie && <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div>}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── COMMENT FRAMES ─── */}
      {cat === 'comment_frames' && (
        <div>
          <InfoBanner icon="💬" text="Comment Frames add a glowing border around your comments — visible to everyone!" />
          <ChampionBanner type="comment" />
          <div style={GRID}>
            {filterItems(COMMENT_FRAMES.filter(f => !f.exclusive), commentOwned)
              .sort((a, b) => (a.pointsPrice || 0) - (b.pointsPrice || 0)).map(frame => {
              const owned = commentOwned(frame);
              const equipped = userProfile?.equippedCommentFrame === frame.id;
              const legFreebie = isFreebie(frame);
              return (
                <button key={frame.id} onClick={() => handleCommentFrame(frame)} style={CARD(equipped ? frame.color : null)}>
                  <div style={PREVIEW_WRAP}><CommentPreview frame={frame} /></div>
                  <span style={NAME}>{frame.name}</span>
                  {frame.exclusive ? <span style={{ fontSize: 10, color: '#555566', padding: '5px 0' }}>🏆 Champion only</span>
                    : owned ? <div style={BTN(equipped ? '#C9A84C' : '#00D4FF', equipped ? 'rgba(201,168,76,0.15)' : 'rgba(0,212,255,0.1)')}>{equipped ? '✓ EQUIPPED' : 'TAP TO EQUIP'}</div>
                    : frame.animated ? <div style={{ textAlign: 'center' }}><div style={BTN('#FF2D55', 'rgba(255,45,85,0.1)')}>⚡ CA${frame.dollarsPrice?.toFixed(2)}</div>{legFreebie && <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div>}</div>
                    : <div style={{ textAlign: 'center' }}><div style={BTN('#C9A84C', 'rgba(201,168,76,0.1)')}>⭐ {frame.pointsPrice} pts</div>{legFreebie && <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800, marginTop: 3 }}>👑 FREE WITH LEGENDARY</div>}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── GIFT CARDS ─── */}
      {cat === 'gift_cards' && (
        <div style={{ padding: '0 14px' }}>
          <InfoBanner icon="🎁" text="Redeem your GA Points for real gift cards! Earn by playing and engaging with the community." />
          <Link href="/gift-cards" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: 'var(--card)', borderRadius: 16, border: '1px solid rgba(201,168,76,0.3)', textDecoration: 'none', marginBottom: 20 }}>
            <span style={{ fontSize: 32 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--white)' }}>Gift Cards</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>PSN, Xbox, Steam — CA$10 to CA$100</div>
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontWeight: 700 }}>Your balance: {gaPoints.toLocaleString()} pts →</div>
            </div>
            <span style={{ color: 'var(--gold)', fontSize: 18 }}>›</span>
          </Link>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>How to earn GA Points</div>
          {[
            ['📹', 'Post a clip', '+25 pts'],
            ['⭐', 'Receive a GG', '+2 pts'],
            ['👤', 'Get a follower', '+1 pt'],
            ['📅', 'Daily login bonus', '+1 to +15 pts'],
            ['👑', 'Monthly Champion', '+500 pts'],
          ].map(([icon, action, pts]) => (
            <div key={action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #1A1A26' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{action}</span>
              </div>
              <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800 }}>{pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── shared style constants ── */
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, padding: '8px 14px 14px' };
const CARD = (accentColor) => ({
  background: '#1A1A26', borderRadius: 14, padding: 10,
  border: `0.5px solid ${accentColor ? accentColor + '60' : '#2A2A3A'}`,
  display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
  textAlign: 'center', transition: 'border-color 0.2s',
});
const PREVIEW_WRAP = { height: 90, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' };
const NAME = { fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' };
const DESC = { fontSize: 10, color: '#888899', marginBottom: 6, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' };
const DOT = (color) => ({ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: color, fontSize: 9, fontWeight: 900, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' });

function InfoBanner({ icon, text, gold }) {
  const color = gold ? '#C9A84C' : '#00D4FF';
  return (
    <div style={{ margin: '0 14px 10px', padding: '10px 12px', background: `${color}0A`, borderRadius: 10, border: `0.5px solid ${color}30`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#888899', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
