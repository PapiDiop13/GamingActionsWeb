'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const BENEFITS = [
  { icon: '🎬', label: 'Exclusive Clips', desc: 'Gameplay privé réservé aux fans', color: 'var(--gold)' },
  { icon: '💡', label: 'Private Tips', desc: 'Tutoriels avancés hors du feed', color: 'var(--blue)' },
  { icon: '🎭', label: 'Behind the Scenes', desc: 'Setup, bloopers, gameplay brut', color: '#7C4DFF' },
  { icon: '💬', label: 'FanBox Access', desc: 'Chat de groupe avec le créateur', color: '#00C853' },
];

export default function FanbasePage({ params }) {
  const { creatorId } = use(params);
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [creator, setCreator] = useState(null);
  const [fanbase, setFanbase] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!creatorId) return;
    Promise.all([
      getDoc(doc(db, 'users', creatorId)),
      getDoc(doc(db, 'fanbases', creatorId)),
    ]).then(([userSnap, fbSnap]) => {
      if (userSnap.exists()) setCreator({ uid: creatorId, ...userSnap.data() });
      if (fbSnap.exists()) setFanbase({ id: fbSnap.id, ...fbSnap.data() });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [creatorId]);

  // Check subscription
  useEffect(() => {
    if (!user || !creatorId) return;
    getDocs(query(
      collection(db, 'fanbase_subscriptions'),
      where('subscriberId', '==', user.uid),
      where('creatorId', '==', creatorId)
    )).then(snap => setSubscribed(!snap.empty)).catch(() => {});
  }, [user, creatorId]);

  const handleJoin = async () => {
    if (!user) { router.push('/auth'); return; }
    if (user.uid === creatorId) { toast.error('Tu ne peux pas rejoindre ta propre fanbase'); return; }
    setJoining(true);
    try {
      const subId = `${user.uid}_${creatorId}`;
      await setDoc(doc(db, 'fanbase_subscriptions', subId), {
        subscriberId: user.uid,
        subscriberUsername: userProfile?.username || '',
        subscriberAvatar: userProfile?.avatarUrl || '',
        creatorId,
        joinedAt: serverTimestamp(),
        status: 'active',
      });
      await updateDoc(doc(db, 'fanbases', creatorId), { subscriberCount: increment(1) });
      await updateDoc(doc(db, 'users', user.uid), { fanbaseSubscriptions: increment(1) });
      setSubscribed(true);
      setFanbase(prev => prev ? { ...prev, subscriberCount: (prev.subscriberCount || 0) + 1 } : prev);
      toast.success(`🔓 Tu fais partie de la Fanbase de ${creator?.username} !`);
    } catch (e) { toast.error('Erreur lors de l\'inscription'); }
    setJoining(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray)' }}><div style={{ fontSize: 32 }}>👥</div><p style={{ marginTop: 8 }}>Chargement...</p></div>
      </div>
    );
  }

  if (!creator || !fanbase) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Fanbase introuvable</p>
          <Link href="/" style={{ color: 'var(--gold)', textDecoration: 'none' }}>← Retour au feed</Link>
        </div>
      </div>
    );
  }

  const BADGE_MAP = {
    gameconic: { bg: 'var(--red)', text: '#fff', label: 'GAMECONIC' },
    creator: { bg: 'var(--blue)', text: '#fff', label: 'CREATOR' },
    developer: { bg: '#7C4DFF', text: '#fff', label: 'DEVELOPER' },
  };
  const badge = BADGE_MAP[creator.accountType] || null;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80 }}>

      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 0' }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--gray3)', background: 'var(--card)', cursor: 'pointer', fontSize: 18, color: 'var(--white)' }}>‹</button>
        <h1 style={{ fontWeight: 900, fontSize: 18, color: 'var(--white)' }}>Fanbase</h1>
      </div>

      {/* Creator banner */}
      <div style={{
        padding: '32px 20px', textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(13,8,32,1) 0%, transparent 100%)',
        borderBottom: '1px solid var(--gray3)', margin: '16px 0 0',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: 'rgba(201,168,76,0.15)', border: '3px solid var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 32, color: 'var(--gold)', overflow: 'hidden',
        }}>
          {creator.avatarUrl
            ? <img src={creator.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (creator.username || '?')[0].toUpperCase()}
        </div>
        <h2 style={{ fontWeight: 900, fontSize: 22, color: 'var(--white)', marginBottom: 8 }}>{creator.username}</h2>
        {badge && (
          <div style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 6, marginBottom: 18,
            background: badge.bg, color: badge.text, fontSize: 10, fontWeight: 900,
          }}>{badge.label}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
          {[
            { label: 'Followers', value: (creator.followersCount || 0).toLocaleString() },
            { label: 'Tips', value: creator.tipCount || 0 },
            { label: 'Fans', value: fanbase.subscriberCount || 0, color: '#7C4DFF' },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: '0 20px', borderRight: i < 2 ? '1px solid var(--gray3)' : 'none', textAlign: 'center' }}>
              <p style={{ fontWeight: 900, fontSize: 18, color: s.color || 'var(--white)' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', padding: '24px 0 20px', borderBottom: '1px solid var(--gray3)' }}>
        <span style={{ fontSize: 48, fontWeight: 900, color: '#7C4DFF' }}>CA$3.99</span>
        <span style={{ fontSize: 16, color: 'var(--gray)', marginLeft: 4 }}>/mois</span>
      </div>

      {/* Benefits */}
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, paddingLeft: 16, paddingTop: 12, paddingBottom: 8 }}>CE QUE TU OBTIENS</p>
        {BENEFITS.map(b => (
          <div key={b.label} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            borderBottom: '1px solid var(--gray3)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: b.color + '18', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20,
            }}>{b.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', marginBottom: 3 }}>{b.label}</p>
              <p style={{ fontSize: 11, color: 'var(--gray)' }}>{b.desc}</p>
            </div>
            <span style={{ color: b.color, fontSize: 18 }}>✓</span>
          </div>
        ))}
      </div>

      {/* Fanbase description */}
      {fanbase.description && (
        <div style={{ margin: '16px', padding: 16, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--gray3)' }}>
          <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.7 }}>{fanbase.description}</p>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '24px 16px' }}>
        {subscribed ? (
          <>
            <Link href={`/tips?creator=${creatorId}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '16px 0', borderRadius: 14, background: '#00C853', border: 'none',
              color: '#000', fontWeight: 900, fontSize: 16, textDecoration: 'none', marginBottom: 10,
            }}>🔓 Voir le contenu exclusif</Link>
            <p style={{ fontSize: 12, color: 'var(--gray)', textAlign: 'center' }}>✓ Tu es déjà abonné</p>
          </>
        ) : (
          <>
            <button onClick={handleJoin} disabled={joining} style={{
              width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#7C4DFF', color: '#fff', fontWeight: 900, fontSize: 16,
              opacity: joining ? 0.7 : 1, marginBottom: 10,
            }}>
              {joining ? 'Inscription...' : '🔓 Rejoindre (mode test · gratuit)'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--gray)', textAlign: 'center' }}>Accès gratuit pendant la phase de lancement 🚀</p>
          </>
        )}
      </div>
    </div>
  );
}
