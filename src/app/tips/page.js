'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, orderBy, getDocs, limit, startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';

const CATEGORIES = [
  { id: 'all', label: 'Tous', color: 'var(--gold)' },
  { id: 'flashtuto', label: 'FlashTutos', color: 'var(--blue)', desc: 'Astuces et tutoriels' },
  { id: 'flashinfo', label: 'FlashInfos', color: 'var(--red)', desc: 'Actualités gaming & meta' },
  { id: 'gameindev', label: 'GameInDev', color: '#7C4DFF', desc: 'Dev diary et révélations' },
  { id: 'gatv', label: 'GA TV', color: 'var(--gray)' },
];
const CAT_MAP = { flashtuto: { color: 'var(--blue)', label: 'FLASHTUTO' }, flashinfo: { color: 'var(--red)', label: 'FLASHINFO' }, gameindev: { color: '#7C4DFF', label: 'GAMEINDEV' } };
const PAGE_SIZE = 15;

function LockedModal({ tip, onClose, onJoin }) {
  if (!tip) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0a1a0a', borderRadius: 20, padding: 28, maxWidth: 380, width: '100%',
        border: '1px solid rgba(0,200,83,0.3)', textAlign: 'center',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,200,83,0.1)',
          border: '1px solid rgba(0,200,83,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 16px',
        }}>🔒</div>
        <h3 style={{ fontWeight: 900, fontSize: 18, color: 'var(--white)', marginBottom: 10 }}>Contenu exclusif</h3>
        <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 22 }}>
          Ce contenu est réservé aux fans de{' '}
          <span style={{ color: 'var(--white)', fontWeight: 700 }}>{tip.username}</span>.
          Rejoins sa Fanbase pour le débloquer.
        </p>
        <button onClick={onJoin} style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: '#00C853', color: '#000', fontWeight: 900, fontSize: 15, marginBottom: 10,
        }}>🔓 Rejoindre la Fanbase</button>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: 13, padding: '8px 0', width: '100%',
        }}>Plus tard</button>
      </div>
    </div>
  );
}

function TipCard({ tip, locked, onClick }) {
  const cat = CAT_MAP[tip.contentType];
  const fmt = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 12, padding: '14px 16px',
      borderBottom: '1px solid var(--gray3)', cursor: 'pointer',
      borderLeft: tip.isFanbaseExclusive ? '3px solid #00C853' : '3px solid transparent',
      background: tip.isFanbaseExclusive ? 'rgba(0,200,83,0.02)' : 'transparent',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = tip.isFanbaseExclusive ? 'rgba(0,200,83,0.05)' : 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = tip.isFanbaseExclusive ? 'rgba(0,200,83,0.02)' : 'transparent'}
    >
      {/* Thumbnail */}
      <div style={{
        width: 120, height: 80, borderRadius: 10, flexShrink: 0,
        background: 'var(--card)', border: `1px solid ${cat?.color || 'var(--gray3)'}40`,
        overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {tip.thumbnail
          ? <img src={tip.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: locked ? 'blur(6px)' : 'none' }} />
          : <span style={{ fontSize: 28, opacity: 0.4 }}>
            {tip.contentType === 'flashtuto' ? '💡' : tip.contentType === 'flashinfo' ? '📰' : tip.contentType === 'gameindev' ? '⚙️' : '🎮'}
          </span>}
        {locked && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🔒</div>
        )}
        {cat && (
          <div style={{
            position: 'absolute', top: 5, left: 5, padding: '2px 6px', borderRadius: 4,
            background: cat.color, fontSize: 8, color: '#fff', fontWeight: 900,
          }}>{cat.label}</div>
        )}
        {tip.duration && (
          <div style={{
            position: 'absolute', bottom: 5, right: 5, padding: '2px 6px',
            background: 'rgba(0,0,0,0.85)', borderRadius: 4, fontSize: 9, color: '#fff', fontWeight: 700,
          }}>{fmt(tip.duration)}</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {cat && (
          <div style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6, marginBottom: 6,
            background: cat.color + '18', color: cat.color, fontSize: 9, fontWeight: 800,
          }}>{cat.label}</div>
        )}
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {tip.title || tip.caption}
        </p>
        <p style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 6 }}>🎮 {tip.game || '—'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: 'var(--gray3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'var(--gray)',
          }}>{(tip.username || '?')[0].toUpperCase()}</div>
          <span style={{ fontSize: 11, color: 'var(--gray)' }}>{tip.username}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--gray)' }}>
          <span>{tip.viewCount || tip.viewsCount || 0} vues</span>
          <span style={{ color: '#7C4DFF' }}>👍 {tip.thanksCount || 0}</span>
          {tip.isFanbaseExclusive && <span style={{ color: locked ? '#00C853' : '#00C853' }}>{locked ? '🔒 Fanbase' : '🔓 Fanbase'}</span>}
        </div>
      </div>
    </div>
  );
}

export default function TipsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [subscribedTo, setSubscribedTo] = useState(new Set());
  const [lockedTip, setLockedTip] = useState(null);
  const lastDocRef = useRef(null);

  // Load subscriptions
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'fanbase_subscriptions'), where('subscriberId', '==', user.uid))).then(snap => {
      setSubscribedTo(new Set(snap.docs.map(d => d.data().creatorId)));
    }).catch(() => {});
  }, [user]);

  const buildQuery = (after = null) => {
    const baseFilters = activeCategory === 'all'
      ? [where('contentType', 'in', ['flashtuto', 'flashinfo', 'gameindev'])]
      : [where('contentType', '==', activeCategory)];
    const constraints = [...baseFilters, where('restricted', '!=', true), orderBy('restricted'), orderBy('createdAt', 'desc')];
    const q = after
      ? query(collection(db, 'videos'), ...constraints, startAfter(after), limit(PAGE_SIZE))
      : query(collection(db, 'videos'), ...constraints, limit(PAGE_SIZE));
    return q;
  };

  const loadTips = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); lastDocRef.current = null; setHasMore(true); }
    try {
      // Simpler query without compound index issues
      const constraints = activeCategory === 'all'
        ? [where('contentType', 'in', ['flashtuto', 'flashinfo', 'gameindev']), orderBy('createdAt', 'desc')]
        : [where('contentType', '==', activeCategory), orderBy('createdAt', 'desc')];

      const q = lastDocRef.current && !reset
        ? query(collection(db, 'videos'), ...constraints, startAfter(lastDocRef.current), limit(PAGE_SIZE))
        : query(collection(db, 'videos'), ...constraints, limit(PAGE_SIZE));

      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !t.restricted && !t.banned);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      if (reset) setTips(docs);
      else setTips(prev => [...prev, ...docs]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [activeCategory]);

  useEffect(() => { loadTips(true); }, [activeCategory]);

  const isLocked = (tip) => {
    if (!tip.isFanbaseExclusive) return false;
    if (tip.userId === user?.uid) return false;
    return !subscribedTo.has(tip.userId);
  };

  const handleTipClick = (tip) => {
    if (isLocked(tip)) { setLockedTip(tip); return; }
    router.push(`/tips/${tip.id}`);
  };

  const filtered = tips.filter(t =>
    !search.trim() ||
    (t.title || t.caption || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.game || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <LockedModal
        tip={lockedTip}
        onClose={() => setLockedTip(null)}
        onJoin={() => { const tip = lockedTip; setLockedTip(null); router.push(`/fanbase/${tip.userId}`); }}
      />

      {/* Header */}
      <div style={{ padding: '20px 16px 12px' }}>
        <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--white)', marginBottom: 2 }}>💡 GameTips</h1>
        <p style={{ fontSize: 12, color: 'var(--gray)' }}>Learn · Discover · Watch</p>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, paddingLeft: 16, paddingBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
            padding: '7px 14px', borderRadius: 20, border: `1px solid ${activeCategory === cat.id ? cat.color : 'var(--gray3)'}`,
            background: activeCategory === cat.id ? cat.color + '18' : 'var(--card)',
            color: activeCategory === cat.id ? cat.color : 'var(--gray)',
            fontWeight: activeCategory === cat.id ? 700 : 500, fontSize: 12, cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
          }}>
            {cat.label}
            {cat.id === 'gatv' && <span style={{ marginLeft: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', verticalAlign: 'middle' }} />}
          </button>
        ))}
      </div>

      {/* Category desc */}
      {activeCategory !== 'all' && activeCategory !== 'gatv' && (
        <div style={{ paddingLeft: 16, paddingBottom: 8 }}>
          <p style={{ fontSize: 11, color: 'var(--gray)', fontStyle: 'italic' }}>
            {CATEGORIES.find(c => c.id === activeCategory)?.desc}
          </p>
        </div>
      )}

      {/* Search (not for GATV) */}
      {activeCategory !== 'gatv' && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--card)', border: '1px solid var(--gray3)',
            borderRadius: 12, paddingLeft: 14, height: 42,
          }}>
            <span style={{ fontSize: 15, color: 'var(--gray)' }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Recherche jeu, titre, créateur..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--white)', fontSize: 13 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ marginRight: 12, background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            )}
          </div>
        </div>
      )}

      {/* GATV Coming Soon */}
      {activeCategory === 'gatv' ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--card)',
            border: '1px solid var(--gray3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, margin: '0 auto 16px',
          }}>📺</div>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: 'var(--white)', marginBottom: 4 }}>GA TV</h2>
          <p style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: 12, fontSize: 13 }}>Coming Soon</p>
          <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.7, maxWidth: 320, margin: '0 auto 20px' }}>
            Notre chaîne gaming live arrive bientôt. Tournois en direct, révélations exclusives et shows gaming — restez connectés ! 🎮
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 20, background: 'rgba(201,168,76,0.1)', border: '1px solid var(--gold)', fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
            🔔 Vous serez notifié au lancement
          </div>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--gray3)' }}>
              <div style={{ width: 120, height: 80, borderRadius: 10, background: 'var(--card)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, borderRadius: 7, background: 'var(--card)', width: '80%' }} />
                <div style={{ height: 11, borderRadius: 6, background: 'var(--card)', width: '50%' }} />
                <div style={{ height: 11, borderRadius: 6, background: 'var(--card)', width: '30%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--gray)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>{search ? 'Aucun résultat' : 'Aucun contenu dans cette catégorie'}</p>
          <p style={{ fontSize: 12 }}>{search ? "Essaie avec d'autres mots-clés" : 'Sois le premier à publier ! 🎮'}</p>
        </div>
      ) : (
        <>
          <div>
            {filtered.map(tip => (
              <TipCard key={tip.id} tip={tip} locked={isLocked(tip)} onClick={() => handleTipClick(tip)} />
            ))}
          </div>
          {hasMore && !search && (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <button onClick={() => { setLoadingMore(true); loadTips(false); }} disabled={loadingMore} style={{
                padding: '10px 24px', borderRadius: 10, border: '1px solid var(--gray3)',
                background: 'var(--card)', color: 'var(--gray)', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              }}>
                {loadingMore ? 'Chargement...' : 'Voir plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
