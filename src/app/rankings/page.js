'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, onSnapshot, doc, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/useAuthStore';

/* ── Constants ── */
const EXCLUDED_TYPES = ['creator', 'gameconic'];

const TIERS = {
  noob:   { label: 'NOOB',   color: '#555566' },
  bronze: { label: 'BRONZE', color: '#CD7F32' },
  silver: { label: 'SILVER', color: '#C0C0C0' },
  gold:   { label: 'GOLD',   color: '#C9A84C' },
  goat:   { label: 'GOAT',   color: '#FF3B30' },
};
const getTier = (u) => TIERS[u?.streakLevel] || TIERS.noob;

const STREAK_LEVELS = [
  { id: 'noob',   minPoints: 0 },
  { id: 'bronze', minPoints: 500 },
  { id: 'silver', minPoints: 2000 },
  { id: 'gold',   minPoints: 5000 },
  { id: 'goat',   minPoints: 15000 },
];
const streakPct = (u) => {
  const pts = u?.streakPoints || 0;
  const lvl = u?.streakLevel || 'noob';
  const idx = Math.max(0, STREAK_LEVELS.findIndex(l => l.id === lvl));
  const cur = STREAK_LEVELS[idx];
  const next = STREAK_LEVELS[idx + 1];
  const seg = next ? Math.min(Math.max((pts - cur.minPoints) / (next.minPoints - cur.minPoints), 0), 1) : 1;
  return ((idx + seg) / (STREAK_LEVELS.length - 1)) * 100;
};
const fmtGG = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n || 0}`);
const thumbOf = (v) => v?.thumbnail || v?.thumbnailUrl || null;

const TABS = [
  { id: 'topgg',    label: 'Top GG',    icon: '⭐' },
  { id: 'topvideo', label: 'Top Video', icon: '🎬' },
  { id: 'bygenre',  label: 'By Genre',  icon: '🎯' },
  { id: 'videoday', label: 'Of the Day',icon: '☀️' },
  { id: 'history',  label: 'History',   icon: '📅' },
];

const GENRE_LIST = [
  { id: 'fps',           label: 'FPS 🎯' },
  { id: 'sports',        label: 'Sports ⚽' },
  { id: 'battle_royale', label: 'Battle Royale 🏆' },
  { id: 'action',        label: 'Action / Adventure 💥' },
  { id: 'rpg',           label: 'RPG ⚔️' },
  { id: 'fighting',      label: 'Fighting 🥊' },
  { id: 'moba',          label: 'MOBA / Strategy 🧙' },
  { id: 'racing',        label: 'Racing 🏎️' },
  { id: 'horror',        label: 'Horror 👻' },
  { id: 'simulation',    label: 'Simulation 🏗️' },
  { id: 'other',         label: 'Other 🕹️' },
];

const REWARDS = [
  { rank: '#1',  reward: '👑 Champion frame + 500 pts + shoutout', color: '#C9A84C' },
  { rank: '#2',  reward: '🥈 Silver Elite + 300 pts',              color: '#C0C0C0' },
  { rank: '#3',  reward: '🥉 Bronze Elite + 200 pts',              color: '#CD7F32' },
  { rank: 'Top 9', reward: '⭐ 100 GA Points bonus',               color: '#888899' },
];

/* ── Countdown Modal ── */
function CountdownModal({ onClose }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const ms = Math.max(end - now, 0);
  const days    = Math.floor(ms / 86400000);
  const hours   = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const isLast  = days === 0;
  const col     = isLast ? '#FF3B30' : '#C9A84C';
  const blocks  = isLast
    ? [{ v: hours, l: 'HOURS' }, { v: minutes, l: 'MIN' }, { v: seconds, l: 'SEC' }]
    : [{ v: days, l: 'DAYS' }, { v: hours, l: 'HOURS' }, { v: minutes, l: 'MIN' }, { v: seconds, l: 'SEC' }];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#12121A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 24, padding: '36px 32px', maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#888899', cursor: 'pointer', fontSize: 20 }}>✕</button>

        <h2 style={{ fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 4 }}>Monthly Reset</h2>
        <p style={{ fontSize: 12, color: '#888899', marginBottom: 28 }}>
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Rankings reset at end of month
        </p>

        {/* Countdown blocks */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20 }}>
          {blocks.map((b, i) => (
            <div key={b.l} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#1A1A26', border: `1px solid ${col}60`, borderRadius: 12, padding: '12px 16px', minWidth: 64 }}>
                  <div style={{ fontSize: 34, fontWeight: 900, color: col, letterSpacing: 2 }}>{String(b.v).padStart(2, '0')}</div>
                </div>
                <div style={{ fontSize: 9, color: '#888899', fontWeight: 700, letterSpacing: 1, marginTop: 6 }}>{b.l}</div>
              </div>
              {i < blocks.length - 1 && <div style={{ fontSize: 28, fontWeight: 900, color: '#444455', margin: '0 2px', marginBottom: 20 }}>:</div>}
            </div>
          ))}
        </div>

        {isLast && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FF3B30', padding: '8px 16px', borderRadius: 20, marginBottom: 20 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#000' }}>LAST DAY — Rankings close tonight!</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, marginBottom: 24, textAlign: 'left' }}>
          {[
            { icon: '🏆', title: 'Top 10 Win Rewards', desc: 'Top players earn GA Points, badges and featured placement' },
            { icon: '🔄', title: 'Rankings Reset', desc: 'All GG counts reset to 0 on the 1st of each month' },
            { icon: '⭐', title: 'Champion Badge', desc: 'The #1 player becomes Monthly Champion and gets a crown' },
          ].map(c => (
            <div key={c.title} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1A1A26', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.title}</div>
                <div style={{ fontSize: 11, color: '#888899' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#0A0A0F', fontWeight: 800, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer' }}>
          🏆 View Current Rankings
        </button>
      </div>
    </div>
  );
}

/* ── Podium ── */
function HeroPodium({ data }) {
  const [first, second, third] = [data[0], data[1], data[2]];

  const Spot = ({ user, place }) => {
    if (!user) return <div style={{ flex: 1 }} />;
    const isFirst = place === 1;
    const accent = isFirst ? '#C9A84C' : place === 2 ? '#C0C0C0' : '#CD7F32';
    const pedH = isFirst ? 92 : place === 2 ? 66 : 52;
    const avSize = isFirst ? 70 : 52;
    const av = user.avatar || user.avatarUrl;
    return (
      <Link href={`/profile/${user.uid}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
        {/* Crown / medal */}
        <div style={{ fontSize: isFirst ? 30 : 22, marginBottom: 4, animation: isFirst ? 'bob 2s ease-in-out infinite' : 'none' }}>
          {isFirst ? '👑' : place === 2 ? '🥈' : '🥉'}
        </div>

        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          {isFirst && (
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.4), transparent)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
          )}
          <div style={{
            width: avSize, height: avSize, borderRadius: '50%',
            border: `2.5px solid ${accent}`,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1A1A26', position: 'relative',
            boxShadow: isFirst ? `0 0 20px ${accent}50` : 'none',
          }}>
            {av
              ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontWeight: 900, fontSize: isFirst ? 24 : 18, color: accent }}>{(user.username || '?')[0]}</span>
            }
          </div>
        </div>

        <div style={{ fontSize: isFirst ? 13 : 11, fontWeight: 900, color: isFirst ? '#C9A84C' : '#fff', textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
          {user.username}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, border: `1px solid ${accent}60`, background: `${accent}14`, marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: accent }}>⭐</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: accent }}>{fmtGG(user.ggCount)} GG</span>
        </div>

        {/* Pedestal */}
        <div style={{
          width: '85%', height: pedH, borderRadius: 12,
          border: `1.5px solid ${accent}`,
          background: isFirst ? 'rgba(201,168,76,0.14)' : '#1A1A26',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `${accent}55` }} />
          <span style={{ fontWeight: 900, fontSize: isFirst ? 30 : 22, color: accent }}>{place}</span>
        </div>
      </Link>
    );
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '20px 8px 12px', gap: 0,
      background: 'rgba(201,168,76,0.03)',
      borderBottom: '1px solid rgba(201,168,76,0.15)',
    }}>
      <style>{`
        @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes pulse { 0%,100% { opacity: 0.22; transform: scale(0.85); } 50% { opacity: 0.55; transform: scale(1.2); } }
      `}</style>
      <Spot user={second} place={2} />
      <Spot user={first}  place={1} />
      <Spot user={third}  place={3} />
    </div>
  );
}

/* ── Your Rank Card ── */
function YourRankCard({ myRank, userProfile, topUsers }) {
  const av = userProfile?.avatar || userProfile?.avatarUrl;
  if (!myRank) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 8px', padding: 14, borderRadius: 18, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A1A26', border: '2px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {av ? <img src={av} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <span style={{ color: '#C9A84C', fontWeight: 900 }}>?</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>You're not ranked yet</div>
        <div style={{ fontSize: 12, color: '#888899', marginTop: 2 }}>Post clips and get GG-ed to enter the rankings 🎮</div>
      </div>
    </div>
  );

  const isChamp = myRank.rank === 1;
  const above = topUsers.find(u => u.rank === myRank.rank - 1);
  const gap = above ? Math.max(above.ggCount - myRank.ggCount, 0) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 8px', padding: 14, borderRadius: 18, background: isChamp ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.06)', border: `1.5px solid ${isChamp ? '#C9A84C' : 'rgba(201,168,76,0.4)'}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginRight: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#C9A84C' }}>#</span>
        <span style={{ fontSize: 30, fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>{myRank.rank}</span>
      </div>
      <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(201,168,76,0.5)', flexShrink: 0 }}>
        {av ? <img src={av} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1A1A26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#C9A84C' }}>{(userProfile?.username || '?')[0]}</div>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#C9A84C', letterSpacing: 0.5 }}>YOU · {userProfile?.username}</div>
        {isChamp
          ? <div style={{ fontSize: 12, color: '#C9A84C', marginTop: 3 }}>👑 You're dominating the season. Keep the crown!</div>
          : gap !== null
            ? <div style={{ fontSize: 12, color: '#888899', marginTop: 3 }}><span style={{ color: '#4CAF50', fontWeight: 800 }}>▲ {fmtGG(gap)} GG</span> to pass #{myRank.rank - 1}</div>
            : <div style={{ fontSize: 12, color: '#888899', marginTop: 3 }}>Keep climbing 🔥</div>
        }
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{fmtGG(myRank.ggCount)}</div>
        <div style={{ fontSize: 8, fontWeight: 800, color: '#C9A84C', letterSpacing: 1.5 }}>GG</div>
      </div>
    </div>
  );
}

/* ── Player Row (rank 4+) ── */
function PlayerRow({ user, isMe }) {
  const tier = getTier(user);
  const pct = Math.max(streakPct(user), 2);
  const av = user.avatar || user.avatarUrl;
  return (
    <Link href={`/profile/${user.uid}`} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none',
      background: isMe ? 'rgba(201,168,76,0.03)' : 'transparent',
    }}>
      <span style={{ fontSize: 16, fontWeight: 900, width: 32, textAlign: 'center', color: tier.color }}>{user.rank}</span>
      <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(201,168,76,0.3)', flexShrink: 0 }}>
        {av ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: '#1A1A26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#C9A84C', fontSize: 13 }}>{(user.username || '?')[0]}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>{user.username}</span>
          <span style={{ fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 5, border: `0.5px solid ${tier.color}70`, background: `${tier.color}18`, color: tier.color, letterSpacing: 0.5 }}>
            {tier.label}
          </span>
          {user.plan === 'legendary' && (
            <span style={{ fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 5, background: '#C9A84C', color: '#000' }}>LEG</span>
          )}
          {isMe && <span style={{ fontSize: 10, fontWeight: 800, color: '#C9A84C' }}>(you)</span>}
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: tier.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', marginLeft: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#C9A84C' }}>{fmtGG(user.ggCount)}</div>
        <div style={{ fontSize: 8, fontWeight: 800, color: '#888899', letterSpacing: 1.5 }}>GG</div>
      </div>
    </Link>
  );
}

/* ── Video Row ── */
function VideoRow({ v, rank }) {
  const medals = ['🥇', '🥈', '🥉'];
  const thumb = thumbOf(v);
  const isTop = rank <= 3;
  const accent = rank === 1 ? '#C9A84C' : rank === 2 ? '#C0C0C0' : '#CD7F32';
  return (
    <Link href={`/video/${v.id}`} style={{
      display: 'flex', alignItems: 'center', gap: 0, padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none',
      background: rank === 1 ? 'rgba(201,168,76,0.03)' : 'transparent',
    }}>
      <div style={{ width: 36, textAlign: 'center', fontSize: isTop ? 22 : 14, fontWeight: 900, color: '#888899', flexShrink: 0 }}>
        {isTop ? medals[rank - 1] : `#${rank}`}
      </div>
      <div style={{ width: 68, height: 44, borderRadius: 9, background: '#1A1A26', overflow: 'hidden', border: rank === 1 ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0, marginLeft: 6, position: 'relative' }}>
        {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: rank === 1 ? '#C9A84C' : '#888899' }}>▶</div>}
        <div style={{ position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }}>▶</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: rank === 1 ? '#C9A84C' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.username}</div>
        <div style={{ fontSize: 11, color: '#888899', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{v.caption}</div>
        <div style={{ fontSize: 10, color: '#555566', marginTop: 2 }}>🎮 {v.game}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 12, background: rank === 1 ? '#C9A84C' : 'rgba(201,168,76,0.1)', marginLeft: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: rank === 1 ? '#000' : '#C9A84C' }}>⭐</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: rank === 1 ? '#000' : '#C9A84C' }}>{fmtGG(v.ggCount)}</span>
      </div>
    </Link>
  );
}

/* ── Genre Leaderboard ── */
const GENRE_CACHE = {};
function GenreLeaderboard({ genreId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const cached = GENRE_CACHE[genreId];
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) { setUsers(cached.data); setLoading(false); return; }
    getDocs(query(collection(db, 'videos'), where('genre', '==', genreId), limit(200))).then(snap => {
      const map = {};
      snap.docs.forEach(d => {
        const v = d.data();
        if (!v.userId || !(v.ggCount > 0) || v.banned || v.restricted) return;
        if (!map[v.userId]) map[v.userId] = { uid: v.userId, username: v.username, avatar: v.avatar || '', ggCount: 0 };
        map[v.userId].ggCount += v.ggCount || 0;
      });
      const top3 = Object.values(map).sort((a, b) => b.ggCount - a.ggCount).slice(0, 3).map((u, i) => ({ ...u, rank: i + 1 }));
      GENRE_CACHE[genreId] = { data: top3, ts: Date.now() };
      setUsers(top3); setLoading(false);
    }).catch(() => setLoading(false));
  }, [genreId]);

  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['#C9A84C', '#C0C0C0', '#CD7F32'];
  if (loading) return <div style={{ padding: 16, textAlign: 'center', color: '#888899', fontSize: 12 }}>Loading...</div>;
  if (users.length === 0) return <div style={{ padding: 16, textAlign: 'center', color: '#888899', fontSize: 12 }}>No clips in this genre yet — be the first! 🎮</div>;
  return (
    <div>
      {users.map((u, i) => {
        const av = u.avatar || u.avatarUrl;
        return (
          <Link key={u.uid} href={`/profile/${u.uid}`} style={{ display: 'flex', alignItems: 'center', padding: 12, borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', textDecoration: 'none' }}>
            <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>{medals[i]}</span>
            <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `1.5px solid ${colors[i]}`, flexShrink: 0 }}>
              {av ? <img src={av} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1A1A26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: colors[i], fontSize: 13 }}>{(u.username || '?')[0]}</div>}
            </div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', marginLeft: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 11, color: colors[i] }}>⭐</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: colors[i] }}>{fmtGG(u.ggCount)}</span>
              </div>
              <div style={{ fontSize: 9, color: '#888899' }}>{[50, 25, 10][i]} pts/month</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Main Page ── */
export default function RankingsPage() {
  const { user, userProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('topgg');
  const [now, setNow] = useState(new Date());
  const [topUsers, setTopUsers] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [videosOfDay, setVideosOfDay] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'videos'), orderBy('ggCount', 'desc'), limit(500)),
      async (snap) => {
        try {
          const allVideos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

          // Top videos
          const topVids = [...allVideos].sort((a, b) => (b.ggCount || 0) - (a.ggCount || 0)).map((v, i) => ({ ...v, rank: i + 1 }));
          setTopVideos(topVids.filter(v => (v.ggCount || 0) > 0).slice(0, 5));

          // Aggregate GG by user
          const userGGs = {};
          allVideos.forEach(v => {
            if (!v.userId || !(v.ggCount > 0) || v.banned || v.restricted) return;
            if (!userGGs[v.userId]) userGGs[v.userId] = { uid: v.userId, username: v.username, avatar: v.avatar || '', plan: v.plan || 'free', streakLevel: v.streakLevel, ggCount: 0 };
            userGGs[v.userId].ggCount += v.ggCount || 0;
          });

          const sorted = Object.values(userGGs).sort((a, b) => b.ggCount - a.ggCount);
          const myEntry = sorted.find(u => u.uid === user?.uid);

          // Enrich top 20 with full profiles
          const top20 = sorted.slice(0, 20);
          const enriched = await Promise.all(top20.map(async (u) => {
            try {
              const snap = await getDoc(doc(db, 'users', u.uid));
              if (snap.exists()) {
                const p = snap.data();
                return { ...u, avatar: p.avatar || u.avatar, plan: p.plan || u.plan, username: p.username || u.username, streakLevel: p.streakLevel || u.streakLevel, accountType: p.accountType || 'gamer', equippedFrame: p.equippedFrame };
              }
            } catch {}
            return u;
          }));

          const filtered = enriched.filter(u => !EXCLUDED_TYPES.includes(u.accountType)).slice(0, 10).map((u, i) => ({ ...u, rank: i + 1 }));
          setTopUsers(filtered);

          // My rank
          if (user?.uid && myEntry) {
            const allFiltered = sorted.filter(u => !EXCLUDED_TYPES.includes(u.accountType || 'gamer'));
            const pos = allFiltered.findIndex(u => u.uid === user.uid) + 1;
            if (pos > 0) setMyRank({ rank: pos, ggCount: myEntry.ggCount });
          }

          // Videos of the day (last 24h)
          const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const today = allVideos.filter(v => {
            const t = v.createdAt?.toDate ? v.createdAt.toDate().getTime() : new Date(v.createdAt).getTime();
            return t > dayAgo;
          }).slice(0, 5).map((v, i) => ({ ...v, rank: i + 1 }));
          setVideosOfDay(today);
        } catch {}
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user?.uid]);

  // Countdown
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const diffMs = end - now;
  const daysLeft = Math.floor(diffMs / 86400000);
  const diffH = Math.floor((diffMs % 86400000) / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  const diffS = Math.floor((diffMs % 60000) / 1000);
  const isLastDay = daysLeft <= 1;

  return (
    <div style={{ minHeight: '100vh', background: '#080810', padding: '0 0 80px' }}>
      {showCountdown && <CountdownModal onClose={() => setShowCountdown(false)} />}

      {/* Starfield */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: 2, background: '#fff',
            top: `${5 + (i * 37) % 80}%`, left: `${(i * 53) % 95}%`,
            opacity: 0.08 + (i % 4) * 0.05,
            width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
          }} />
        ))}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 16px', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 2, margin: 0 }}>🏆 RANKINGS</h1>
            <p style={{ fontSize: 11, color: '#888899', margin: '3px 0 0', letterSpacing: 0.5 }}>
              {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setShowCountdown(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: isLastDay ? 'rgba(255,59,48,0.1)' : 'rgba(201,168,76,0.1)',
            border: `1px solid ${isLastDay ? 'rgba(255,59,48,0.4)' : 'rgba(201,168,76,0.4)'}`,
            padding: '9px 14px', borderRadius: 14, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 13, color: isLastDay ? '#FF3B30' : '#C9A84C' }}>
              {isLastDay ? '⚡' : '⏱'}
            </span>
            {isLastDay ? (
              <span style={{ fontSize: 13, fontWeight: 900, color: '#FF3B30', letterSpacing: 1 }}>
                {String(diffH).padStart(2, '0')}:{String(diffM).padStart(2, '0')}:{String(diffS).padStart(2, '0')}
              </span>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 900, color: '#C9A84C' }}>
                {daysLeft}D before reset ›
              </span>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 0', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === t.id ? '#C9A84C' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeTab === t.id ? '#C9A84C' : 'rgba(255,255,255,0.08)'}`,
              color: activeTab === t.id ? '#0A0A0F' : '#888899',
            }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── TOP GG ── */}
        {activeTab === 'topgg' && (
          loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : topUsers.length === 0 ? (
            <p style={{ color: '#888899', textAlign: 'center', marginTop: 60, fontSize: 14 }}>No rankings yet — post clips and get GG-ed! 🎮</p>
          ) : (
            <>
              {/* LIVE badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF3B30' }} />
                <span style={{ fontSize: 11, color: '#888899', fontWeight: 600 }}>LIVE — updates in real time</span>
              </div>

              {/* Rewards banner */}
              <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.3)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#C9A84C' }}>Monthly Rewards</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {REWARDS.map(r => (
                    <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: r.color }}>{r.rank}</span>
                      <span style={{ fontSize: 10, color: '#888899' }}>{r.reward}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Podium */}
              <HeroPodium data={topUsers} />

              {/* Your rank */}
              {!EXCLUDED_TYPES.includes(userProfile?.accountType) && user && (
                <YourRankCard myRank={myRank} userProfile={userProfile} topUsers={topUsers} />
              )}

              {/* Challengers */}
              {topUsers.length > 3 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 6px' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#888899', letterSpacing: 3 }}>⚡ CHALLENGERS</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  {topUsers.slice(3).map(u => (
                    <PlayerRow key={u.uid} user={u} isMe={u.uid === user?.uid} />
                  ))}
                </>
              )}
            </>
          )
        )}

        {/* ── TOP VIDEO ── */}
        {activeTab === 'topvideo' && (
          <>
            <p style={{ fontSize: 12, color: '#888899', padding: '6px 0 10px', letterSpacing: 0.3 }}>
              🏆 Top 5 most GG-ed clips of all time · Updates in real time
            </p>
            {topVideos.length === 0
              ? <p style={{ color: '#888899', textAlign: 'center', marginTop: 60 }}>No videos yet 🎮</p>
              : topVideos.map(v => <VideoRow key={v.id} v={v} rank={v.rank} />)
            }
          </>
        )}

        {/* ── BY GENRE ── */}
        {activeTab === 'bygenre' && (
          <div style={{ paddingBottom: 20 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 4 }}>🏅 Genre Rankings</div>
              <div style={{ fontSize: 11, color: '#888899', lineHeight: 1.6 }}>Top 3 players per genre receive GA Points at end of month. Every genre gives smaller creators a chance to shine!</div>
            </div>
            {GENRE_LIST.map(genre => (
              <div key={genre.id} style={{ marginBottom: 16, background: '#1A1A26', borderRadius: 14, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{genre.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,0.1)', padding: '4px 10px', borderRadius: 10 }}>
                    <span style={{ fontSize: 10, color: '#C9A84C' }}>⭐</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#C9A84C' }}>#1: 50pts · #2: 25pts · #3: 10pts</span>
                  </div>
                </div>
                <GenreLeaderboard genreId={genre.id} />
              </div>
            ))}
          </div>
        )}

        {/* ── OF THE DAY ── */}
        {activeTab === 'videoday' && (
          <>
            <p style={{ fontSize: 12, color: '#888899', padding: '6px 0 10px', letterSpacing: 0.3 }}>
              {videosOfDay.length > 0 ? '🌟 Clip of the Day — best of the last 24h · Updates in real time' : '🌟 Clip of the Day'}
            </p>
            {videosOfDay.length === 0
              ? <p style={{ color: '#888899', textAlign: 'center', marginTop: 60 }}>No clips uploaded today yet — be the first! 🎮</p>
              : videosOfDay.map(v => <VideoRow key={v.id} v={v} rank={v.rank} />)
            }
          </>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <>
            <p style={{ fontSize: 12, color: '#888899', padding: '6px 0 10px' }}>📅 The Hall of Champions</p>
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Coming Soon</p>
              <p style={{ fontSize: 13, color: '#888899', lineHeight: 1.6 }}>Monthly champions archive is being built. Rankings reset at end of each month.</p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
