'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import { FRAMES } from '@/lib/frames';
import FramedAvatar from '@/components/ui/FramedAvatar';

/* ── helpers ── */
const isFramePurchase = (item) => {
  const r = item.reason || '';
  return (
    r.includes('avatar_frame') || r.includes('video_frame') || r.includes('comment_frame') ||
    r.includes('frame purchased') || r.includes('avatar frame') ||
    item.itemType === 'avatar_frame' || item.itemType === 'video_frame' || item.itemType === 'comment_frame'
  );
};

const getFrameFromPurchase = (item) => {
  const id = item.itemId;
  return FRAMES.find(f => f.id === id) || null;
};

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_LABELS = {
  avatar_frame:   { icon: '👤', label: 'Avatar Frame', color: '#C9A84C' },
  video_frame:    { icon: '🎬', label: 'Video Frame',  color: '#00D4FF' },
  comment_frame:  { icon: '💬', label: 'Comment Frame',color: '#BF5AF2' },
  background:     { icon: '🖼️',  label: 'Background',   color: '#888899' },
  banner:         { icon: '🏞️',  label: 'Banner',       color: '#888899' },
  badge:          { icon: '🏅', label: 'Title',        color: '#C9A84C' },
  username:       { icon: '✨', label: 'Username FX',  color: '#00D4FF' },
  card:           { icon: '🃏', label: 'Card Border',  color: '#888899' },
  theme:          { icon: '🎨', label: 'Theme',        color: '#FF2D55' },
};

function getTypeInfo(item) {
  const t = item.itemType || '';
  return TYPE_LABELS[t] || { icon: '🛒', label: 'Item', color: '#888899' };
}

/* ── card ── */
function PurchaseCard({ item, onEquipFrame, userProfile }) {
  const info = getTypeInfo(item);
  const frame = isFramePurchase(item) ? getFrameFromPurchase(item) : null;
  const isEquipped = frame && (userProfile?.equippedFrame === frame.id || userProfile?.equippedCommentFrame === frame.id);
  const cost = Math.abs(item.delta || 0);

  return (
    <div style={{ background: '#1A1A26', borderRadius: 14, padding: 14, marginBottom: 10, border: '0.5px solid #2A2A3A', display: 'flex', gap: 12, alignItems: 'center' }}>
      {/* preview */}
      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#111120', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${info.color}30` }}>
        {frame
          ? <FramedAvatar user={{ equippedFrame: frame.id, avatarUrl: userProfile?.avatarUrl, username: userProfile?.username }} size={42} />
          : <span style={{ fontSize: 22 }}>{info.icon}</span>
        }
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: info.color }}>{info.icon} {info.label}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {frame?.name || item.itemId || 'Unknown item'}
        </div>
        <div style={{ fontSize: 10, color: '#555566', marginTop: 2 }}>{formatDate(item.createdAt)} · {formatTime(item.createdAt)}</div>
      </div>

      {/* right */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: '#FF6B8A', fontWeight: 800, marginBottom: 4 }}>−{cost} pts</div>
        {frame && (
          <button onClick={() => onEquipFrame(frame)} style={{
            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: 'none',
            background: isEquipped ? 'rgba(0,200,83,0.15)' : 'rgba(201,168,76,0.12)',
            color: isEquipped ? '#00C853' : '#C9A84C',
          }}>
            {isEquipped ? '✓ Equipped' : 'Equip'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── page ── */
export default function PurchasesPage() {
  const router = useRouter();
  const { user, userProfile, saveProfile, refreshProfile } = useAuthStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | frames | other
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(collection(db, 'points_history'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // filter only purchases (negative delta) and sort client-side
        const purchases = all.filter(i => (i.delta || 0) < 0).sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(0);
          const tb = b.createdAt?.toDate?.() || new Date(0);
          return tb - ta;
        });
        setItems(purchases);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const equipFrame = async (frame) => {
    if (!user) return;
    await saveProfile({ equippedFrame: frame.id });
    await refreshProfile?.();
    showToast(`✅ "${frame.name}" equipped!`, 'success');
  };

  if (!user) return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <h2 style={{ color: '#fff', fontWeight: 900 }}>Sign in to see your purchases</h2>
      <button onClick={() => router.push('/auth')} style={{ padding: '12px 28px', background: '#C9A84C', color: '#000', fontWeight: 900, borderRadius: 14, border: 'none', cursor: 'pointer' }}>Log in</button>
    </div>
  );

  const gaPoints = userProfile?.gaPoints || 0;
  const totalCost = items.reduce((s, i) => s + Math.abs(i.delta || 0), 0);
  const frameItems = items.filter(isFramePurchase);
  const otherItems = items.filter(i => !isFramePurchase(i));

  const displayed = tab === 'frames' ? frameItems : tab === 'other' ? otherItems : items;

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', paddingBottom: 80 }}>
      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'success' ? '#00C853' : '#C9A84C', color: '#000', padding: '10px 20px', borderRadius: 14, fontWeight: 800, fontSize: 13, maxWidth: 300, textAlign: 'center' }}>
          {toast.msg}
        </div>
      )}

      {/* header */}
      <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/shop" style={{ color: '#888899', fontSize: 18, textDecoration: 'none', lineHeight: 1 }}>‹</Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>My Purchases 🛍️</h1>
          <p style={{ fontSize: 12, color: '#888899', margin: '2px 0 0' }}>{items.length} purchase{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* summary cards */}
      <div style={{ display: 'flex', gap: 10, padding: '0 16px', marginBottom: 16 }}>
        {[
          { label: 'Total Purchases', value: items.length, icon: '🛒', color: '#C9A84C' },
          { label: 'GA Points Spent', value: `${totalCost.toLocaleString()} pts`, icon: '⭐', color: '#FF6B8A' },
          { label: 'Current Balance', value: `${gaPoints.toLocaleString()} pts`, icon: '💰', color: '#00C853' },
        ].map(c => (
          <div key={c.label} style={{ flex: 1, background: '#1A1A26', borderRadius: 12, padding: '10px 12px', border: '0.5px solid #2A2A3A', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 9, color: '#555566', fontWeight: 700, marginTop: 2 }}>{c.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 14 }}>
        {[
          { id: 'all',    label: `All (${items.length})` },
          { id: 'frames', label: `Frames (${frameItems.length})` },
          { id: 'other',  label: `Other (${otherItems.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: tab === t.id ? 'rgba(201,168,76,0.15)' : '#1A1A26',
            border: `1px solid ${tab === t.id ? '#C9A84C' : '#2A2A3A'}`,
            color: tab === t.id ? '#C9A84C' : '#888899',
          }}>{t.label}</button>
        ))}
      </div>

      {/* content */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ color: '#555566', fontSize: 13 }}>Loading purchases…</div>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
            <div style={{ color: '#888899', fontSize: 16, fontWeight: 700 }}>No purchases yet</div>
            <div style={{ color: '#555566', fontSize: 13, marginTop: 6, marginBottom: 20 }}>Visit the shop to customize your profile</div>
            <Link href="/shop" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#000', fontWeight: 900, fontSize: 14, borderRadius: 14, textDecoration: 'none', display: 'inline-block' }}>Go to Shop →</Link>
          </div>
        ) : (
          displayed.map(item => (
            <PurchaseCard key={item.id} item={item} onEquipFrame={equipFrame} userProfile={userProfile} />
          ))
        )}
      </div>
    </div>
  );
}
