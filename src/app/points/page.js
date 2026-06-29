'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const STREAK_LEVELS = [
  { id: 'noob',   label: 'Noob',   minPoints: 0,     color: '#888899', emoji: '🎮' },
  { id: 'bronze', label: 'Bronze', minPoints: 500,   color: '#CD7F32', emoji: '🥉' },
  { id: 'silver', label: 'Silver', minPoints: 2000,  color: '#C0C0C0', emoji: '🥈' },
  { id: 'gold',   label: 'Gold',   minPoints: 5000,  color: '#C9A84C', emoji: '🏆' },
  { id: 'goat',   label: 'G.O.A.T', minPoints: 15000, color: '#7C4DFF', emoji: '👑' },
];

const ICON_MAP = {
  'Posted a clip':      { emoji: '🎬', color: '#00C853' },
  'Received a GG':      { emoji: '⚡', color: '#C9A84C' },
  'GG removed':         { emoji: '⚡', color: '#888899' },
  'New follower':       { emoji: '👥', color: '#00D4FF' },
  'Daily login bonus':  { emoji: '📅', color: '#7C4DFF' },
  'purchased':          { emoji: '🛍️', color: '#C9A84C' },
  'Clip deleted':       { emoji: '🗑️', color: '#FF2D55' },
  'default':            { emoji: '⚡', color: '#888899' },
};

function getIcon(reason = '') {
  for (const key of Object.keys(ICON_MAP)) {
    if (key !== 'default' && reason.includes(key)) return ICON_MAP[key];
  }
  return ICON_MAP['default'];
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

function getStreakLevel(points) {
  let level = STREAK_LEVELS[0];
  for (const l of STREAK_LEVELS) {
    if (points >= l.minPoints) level = l;
  }
  return level;
}

function getNextLevel(currentLevel) {
  const idx = STREAK_LEVELS.findIndex(l => l.id === currentLevel.id);
  return STREAK_LEVELS[idx + 1] || null;
}

export default function PointsPage() {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const gaPoints = userProfile?.gaPoints || 0;
  const streakPoints = userProfile?.streakPoints || gaPoints;
  const currentLevel = getStreakLevel(streakPoints);
  const nextLevel = getNextLevel(currentLevel);
  const progress = nextLevel
    ? Math.min(100, ((streakPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100)
    : 100;

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    getDocs(query(
      collection(db, 'points_history'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    )).then(snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div style={{ fontSize: 48 }}>⚡</div>
      <p className="font-bold" style={{ color: 'var(--white)' }}>Connecte-toi pour voir tes GA Points</p>
      <button onClick={() => router.push('/auth')} className="btn-gold px-6 py-2.5">Connexion</button>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--white)' }}>⚡ GA Points</h1>

      {/* Balance card */}
      <div className="rounded-2xl p-6 mb-5" style={{
        background: 'var(--card)',
        border: '1px solid rgba(201,168,76,0.3)',
        boxShadow: '0 0 30px rgba(201,168,76,0.06)',
      }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--gray)' }}>Solde disponible</p>
            <p className="text-4xl font-black" style={{ color: 'var(--gold)' }}>{gaPoints.toLocaleString()}</p>
            <p className="text-sm" style={{ color: 'var(--gray)' }}>GA Points</p>
          </div>
          <button onClick={() => router.push('/shop')} className="btn-gold px-4 py-2.5 text-sm">
            🛍️ Boutique
          </button>
        </div>

        {/* Streak level */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentLevel.emoji}</span>
              <div>
                <p className="font-black text-sm" style={{ color: currentLevel.color }}>{currentLevel.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--gray)' }}>{streakPoints.toLocaleString()} pts streak</p>
              </div>
            </div>
            {nextLevel && (
              <div className="text-right">
                <p className="text-[10px]" style={{ color: 'var(--gray)' }}>Prochain</p>
                <p className="text-xs font-bold" style={{ color: nextLevel.color }}>{nextLevel.emoji} {nextLevel.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--gray)' }}>{(nextLevel.minPoints - streakPoints).toLocaleString()} pts restants</p>
              </div>
            )}
          </div>
          {nextLevel && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--gray3)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, ${currentLevel.color}, ${nextLevel.color})`,
              }} />
            </div>
          )}
        </div>
      </div>

      {/* How to earn */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { emoji: '🎬', label: 'Poster un clip', pts: '+10 pts' },
          { emoji: '⚡', label: 'Recevoir un GG', pts: '+2 pts' },
          { emoji: '👥', label: 'Nouveau follower', pts: '+5 pts' },
        ].map(r => (
          <div key={r.label} className="rounded-xl p-3 text-center" style={{
            background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{r.emoji}</div>
            <p className="text-[10px]" style={{ color: 'var(--gray)' }}>{r.label}</p>
            <p className="text-xs font-black mt-1" style={{ color: 'var(--gold)' }}>{r.pts}</p>
          </div>
        ))}
      </div>

      {/* History */}
      <h2 className="font-black mb-4" style={{ color: 'var(--white)' }}>📋 Historique</h2>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--gray3)' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>⚡</p>
          <p className="text-sm" style={{ color: 'var(--gray)' }}>Aucun historique — commence à poster des clips !</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          {history.map((item, i) => {
            const { emoji, color } = getIcon(item.reason || '');
            const isPositive = item.delta > 0;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-4 py-3"
                style={{
                  background: i % 2 === 0 ? 'var(--card)' : 'rgba(26,26,38,0.5)',
                  borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{
                  background: color + '18',
                }}>
                  {emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--white)' }}>
                    {item.reason || 'Points update'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--gray)' }}>{fmtDate(item.createdAt)}</p>
                </div>

                {/* Delta */}
                <div className="text-right shrink-0">
                  <p className="font-black text-base" style={{ color: isPositive ? '#00C853' : 'var(--red)' }}>
                    {isPositive ? '+' : ''}{item.delta}
                  </p>
                  {item.total !== undefined && (
                    <p className="text-[10px]" style={{ color: 'var(--gray)' }}>= {item.total.toLocaleString()}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
