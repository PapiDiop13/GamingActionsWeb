'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NOTIF_CONFIG = {
  gg:                  { emoji: '⚡', label: 'GGs',        color: '#C9A84C' },
  follow:              { emoji: '👥', label: 'Followers',   color: '#00D4FF' },
  comment:             { emoji: '💬', label: 'Comments',    color: '#00D4FF' },
  comment_like:        { emoji: '❤️', label: 'Likes',       color: '#FF2D55' },
  comment_reply:       { emoji: '↩️', label: 'Replies',     color: '#00D4FF' },
  reply:               { emoji: '↩️', label: 'Replies',     color: '#00D4FF' },
  mention:             { emoji: '@',  label: 'Mentions',    color: '#7C4DFF' },
  ranking:             { emoji: '🏆', label: 'Rankings',    color: '#C9A84C' },
  announcement:        { emoji: '📣', label: 'News',        color: '#FF6B00' },
  system:              { emoji: '🎮', label: 'Système',     color: '#888899' },
  leader_bonus:        { emoji: '👑', label: 'Bonus',       color: '#C9A84C' },
  champion:            { emoji: '🏆', label: 'Champion',    color: '#C9A84C' },
  strike:              { emoji: '⚠️', label: 'Strike',      color: '#FF2D55' },
  giftcard_sent:       { emoji: '🎁', label: 'Gift Card',   color: '#00C853' },
};

const FILTERS = [
  { id: 'all',       label: 'Tout' },
  { id: 'gg',        label: '⚡ GGs' },
  { id: 'follow',    label: '👥 Followers' },
  { id: 'comment',   label: '💬 Comments' },
  { id: 'ranking',   label: '🏆 Rankings' },
  { id: 'system',    label: '📣 Système' },
];

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [notifs, setNotifs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.uid]);

  // Mark all as read when page opens
  useEffect(() => {
    if (!user?.uid || !notifs.length) return;
    const unread = notifs.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    batch.commit().catch(() => {});
  }, [notifs.length, user?.uid]);

  const filtered = filter === 'all' ? notifs : notifs.filter(n => {
    if (filter === 'comment') return ['comment', 'comment_like', 'comment_reply', 'reply', 'mention'].includes(n.type);
    if (filter === 'system') return ['system', 'announcement', 'strike', 'champion', 'leader_bonus', 'giftcard_sent'].includes(n.type);
    return n.type === filter;
  });

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div style={{ fontSize: 48 }}>🔔</div>
      <p className="font-bold" style={{ color: 'var(--white)' }}>Connecte-toi pour voir tes notifications</p>
      <button onClick={() => router.push('/auth')} className="btn-gold px-6 py-2.5">Connexion</button>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: 'var(--white)' }}>🔔 Notifications</h1>
        {notifs.filter(n => !n.read).length > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
            background: 'rgba(255,45,85,0.15)',
            color: 'var(--red)',
            border: '1px solid rgba(255,45,85,0.3)',
          }}>
            {notifs.filter(n => !n.read).length} non lues
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
            style={filter === f.id ? {
              background: 'var(--gold)', color: 'var(--black)',
            } : {
              background: 'var(--card)', color: 'var(--gray)',
              border: '1px solid var(--gray3)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <p className="font-bold" style={{ color: 'var(--white)' }}>Aucune notification</p>
          <p className="text-sm mt-1" style={{ color: 'var(--gray)' }}>Poste des clips pour en recevoir !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(n => {
            const cfg = NOTIF_CONFIG[n.type] || { emoji: '🎮', color: '#888899' };
            const href = n.videoId ? `/video/${n.videoId}` : n.fromUserId ? `/profile/${n.fromUserId}` : null;
            const Wrapper = href ? Link : 'div';
            const wrapperProps = href ? { href } : {};

            return (
              <Wrapper
                key={n.id}
                {...wrapperProps}
                className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
                style={{
                  background: n.read ? 'var(--card)' : 'rgba(201,168,76,0.04)',
                  border: n.read ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(201,168,76,0.15)',
                  textDecoration: 'none',
                }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg" style={{
                  background: cfg.color + '18',
                  border: `1px solid ${cfg.color}30`,
                }}>
                  {n.fromAvatar ? (
                    <img src={n.fromAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span>{cfg.emoji}</span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: 'var(--white)' }}>
                    {n.fromUsername && (
                      <span className="font-bold">{n.fromUsername} </span>
                    )}
                    <span style={{ color: 'var(--gray)' }}>{n.text || 'Notification'}</span>
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--gray)' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
                )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
