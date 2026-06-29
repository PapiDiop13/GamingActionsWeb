'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, getDoc, collection, query, where, orderBy, getDocs,
  updateDoc, increment, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const CARDS = [
  { id: 'card_10',  amount: 10,  pointsCost: 10000, label: 'CA$10',  color: '#00439C', conditions: { clips: 30,  ggReceived: 150,  ranking: null } },
  { id: 'card_25',  amount: 25,  pointsCost: 22000, label: 'CA$25',  color: '#107C10', conditions: { clips: 75,  ggReceived: 400,  ranking: null } },
  { id: 'card_50',  amount: 50,  pointsCost: 40000, label: 'CA$50',  color: '#1A9FFF', conditions: { clips: 150, ggReceived: 800,  ranking: 100  } },
  { id: 'card_100', amount: 100, pointsCost: 75000, label: 'CA$100', color: '#C9A84C', conditions: { clips: 250, ggReceived: 1500, ranking: 50   } },
];
const PLATFORMS = ['psn', 'xbox', 'steam'];
const PLATFORM_LABELS = { psn: 'PlayStation', xbox: 'Xbox', steam: 'Steam' };
const PLATFORM_COLORS = { psn: '#00439C', xbox: '#107C10', steam: '#1B2838' };

function CondRow({ label, met, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 14, color: met ? '#00C853' : 'var(--red)', flexShrink: 0 }}>{met ? '✓' : '✕'}</span>
      <span style={{ fontSize: 12, color: met ? 'var(--white)' : 'var(--gray)', flex: 1 }}>{label}</span>
      {!met && <span style={{ fontSize: 11, color: 'var(--gray)' }}>(toi : {typeof current === 'number' ? current.toLocaleString() : current})</span>}
    </div>
  );
}

function CardItem({ card, userStats, gaPoints, onRedeem }) {
  const userClips = userStats?.videoCount || 0;
  const userGG = userStats?.ggReceived || 0;
  const userRank = userStats?.rank || 999;
  const meetsClips = userClips >= card.conditions.clips;
  const meetsGG = userGG >= card.conditions.ggReceived;
  const meetsRanking = !card.conditions.ranking || userRank <= card.conditions.ranking;
  const meetsPoints = gaPoints >= card.pointsCost;
  const eligible = meetsClips && meetsGG && meetsRanking && meetsPoints;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '18px 18px 14px', background: card.color + '15', borderBottom: '1px solid var(--gray3)' }}>
        <p style={{ fontSize: 26, fontWeight: 900, color: card.color, marginBottom: 2 }}>{card.label}</p>
        <p style={{ fontSize: 12, color: 'var(--gray)' }}>{card.pointsCost.toLocaleString()} GA Points</p>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <p style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>CRITÈRES :</p>
        <CondRow label={`${card.conditions.clips} clips uploadés`} met={meetsClips} current={userClips} />
        <CondRow label={`${card.conditions.ggReceived} GGs reçus`} met={meetsGG} current={userGG} />
        <CondRow label={`${card.pointsCost.toLocaleString()} GA Points`} met={meetsPoints} current={gaPoints} />
        {card.conditions.ranking && <CondRow label={`Top ${card.conditions.ranking} ranking`} met={meetsRanking} current={`Rank #${userRank}`} />}
      </div>
      <div style={{ padding: '0 18px 18px' }}>
        {eligible ? (
          <button onClick={() => onRedeem(card)} style={{
            width: '100%', padding: '13px 0', borderRadius: 11, border: 'none',
            background: card.color, color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>🎁 Échanger {card.label}</button>
        ) : (
          <div style={{
            width: '100%', padding: '13px 0', borderRadius: 11, background: 'var(--gray3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14, color: 'var(--gray)' }}>🔒 Critères non remplis</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RedeemModal({ card, onClose, onConfirm }) {
  const [platform, setPlatform] = useState('psn');
  const [email, setEmail] = useState('');
  const [confirming, setConfirming] = useState(false);

  if (!card) return null;

  const handleConfirm = async () => {
    if (!email.trim() || !email.includes('@')) { toast.error('Email invalide'); return; }
    setConfirming(true);
    await onConfirm({ platform, email: email.trim() });
    setConfirming(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '24px 24px 40px', width: '100%', maxWidth: 600,
        border: '1px solid var(--gray3)', borderBottom: 'none',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--gray3)', margin: '0 auto 20px' }} />
        <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 4 }}>Échanger {card.label}</h2>
        <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 22 }}>Coût : {card.pointsCost.toLocaleString()} GA Points</p>

        <p style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>PLATEFORME</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {PLATFORMS.map(p => (
            <button key={p} onClick={() => setPlatform(p)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${platform === p ? PLATFORM_COLORS[p] : 'var(--gray3)'}`,
              background: platform === p ? PLATFORM_COLORS[p] + '20' : 'var(--card)',
              color: platform === p ? PLATFORM_COLORS[p] : 'var(--gray)', fontWeight: 700, fontSize: 12,
            }}>{PLATFORM_LABELS[p]}</button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>EMAIL POUR RECEVOIR LE CODE</p>
        <input
          className="input"
          type="email" placeholder="ton@email.com"
          value={email} onChange={e => setEmail(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'rgba(0,212,255,0.08)', borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <p style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.6 }}>
            Tes GA Points seront déduits immédiatement. Le code sera envoyé par email sous 24–48h par l'équipe Gaming Actions.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'rgba(255,45,85,0.08)', borderRadius: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <p style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.6 }}>
            Toute tentative de triche, manipulation ou abus entraîne un ban permanent et la perte de tous tes points.
          </p>
        </div>

        <button onClick={handleConfirm} disabled={confirming} style={{
          width: '100%', padding: '15px 0', borderRadius: 13, border: 'none', cursor: 'pointer',
          background: card.color, color: '#fff', fontWeight: 900, fontSize: 15, opacity: confirming ? 0.7 : 1,
        }}>{confirming ? 'Traitement...' : `Confirmer — ${card.pointsCost.toLocaleString()} pts`}</button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', fontSize: 13, padding: '8px 0' }}>Annuler</button>
      </div>
    </div>
  );
}

export default function GiftCardsPage() {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const gaPoints = typeof userProfile?.gaPoints === 'number' ? userProfile.gaPoints : 0;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !user) router.push('/auth'); }, [mounted, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDocs(query(collection(db, 'videos'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'gift_card_requests'), where('userId', '==', user.uid), orderBy('requestedAt', 'desc'))),
    ]).then(([uSnap, videosSnap, reqSnap]) => {
      if (uSnap.exists()) {
        const d = uSnap.data();
        setUserStats({ videoCount: videosSnap.size, ggReceived: d.ggReceived || 0, rank: d.rank || 999 });
      }
      setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleConfirm = async ({ platform, email }) => {
    if (!selectedCard || !user) return;
    try {
      const uSnap = await getDoc(doc(db, 'users', user.uid));
      const currentPoints = uSnap.data()?.gaPoints || 0;
      if (currentPoints < selectedCard.pointsCost) {
        toast.error(`Points insuffisants. Besoin : ${selectedCard.pointsCost.toLocaleString()} pts`);
        return;
      }
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.uid), { gaPoints: increment(-selectedCard.pointsCost) });
      batch.set(doc(collection(db, 'gift_card_requests')), {
        userId: user.uid, username: userProfile?.username || '', email, platform,
        amount: selectedCard.amount, pointsCost: selectedCard.pointsCost,
        gaPointsBefore: currentPoints, gaPointsAfter: currentPoints - selectedCard.pointsCost,
        status: 'pending', requestedAt: serverTimestamp(),
        processedAt: null, note: '', adminNote: '',
      });
      await batch.commit();
      setSelectedCard(null);
      toast.success(`🎁 Demande envoyée ! Code ${selectedCard.label} sous 48h sur ${email}`);
      // Reload requests
      getDocs(query(collection(db, 'gift_card_requests'), where('userId', '==', user.uid), orderBy('requestedAt', 'desc'))).then(snap => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch(() => {});
    } catch { toast.error('Erreur lors de l\'échange. Réessaie.'); }
  };

  const statusColor = (s) => s === 'sent' ? '#00C853' : s === 'rejected' ? 'var(--red)' : 'var(--gold)';
  const statusLabel = (s) => s === 'sent' ? '✅ Envoyé' : s === 'rejected' ? '❌ Refusé' : '🟡 En attente';

  if (!mounted || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray)' }}><div style={{ fontSize: 32 }}>🎁</div><p style={{ marginTop: 8 }}>Chargement...</p></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 80px' }}>
      <RedeemModal card={selectedCard} onClose={() => setSelectedCard(null)} onConfirm={handleConfirm} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--gray3)', background: 'var(--card)', cursor: 'pointer', fontSize: 18, color: 'var(--white)' }}>‹</button>
        <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)' }}>🎁 Gift Cards</h1>
      </div>

      {/* Balance */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', marginBottom: 20,
        background: 'var(--card)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12,
      }}>
        <span style={{ fontSize: 18 }}>💎</span>
        <span style={{ fontSize: 14, color: 'var(--white)', fontWeight: 600 }}>
          Tes GA Points : <strong style={{ color: 'var(--gold)' }}>{gaPoints.toLocaleString()}</strong>
        </span>
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--white)', marginBottom: 10 }}>🎮 Échange des GA Points contre des Gift Cards</p>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.8 }}>
          Gagne des GA Points en postant des clips, recevant des GGs et grimpant dans les classements.
          Échange-les contre des cartes PSN, Xbox ou Steam.<br />
          ⚡ Tu dois remplir TOUS les critères pour échanger une carte.<br />
          ⏱ Les codes sont envoyés par email sous 24–48h.<br />
          ⚠️ Toute triche = ban permanent.
        </p>
      </div>

      {/* Your stats */}
      <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>TES STATS</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Clips', value: userStats?.videoCount || 0 },
          { label: 'GGs reçus', value: (userStats?.ggReceived || 0).toLocaleString() },
          { label: 'Ranking', value: userStats?.rank ? `#${userStats.rank}` : '—' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 12, padding: '14px 0', textAlign: 'center' }}>
            <p style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold)' }}>{s.value}</p>
            <p style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>CARTES DISPONIBLES</p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 180, borderRadius: 16, background: 'var(--card)' }} />)}
        </div>
      ) : CARDS.map(card => (
        <CardItem key={card.id} card={card} userStats={userStats} gaPoints={gaPoints} onRedeem={setSelectedCard} />
      ))}

      {/* Anti-cheat warning */}
      <div style={{ display: 'flex', gap: 12, padding: 16, background: 'rgba(255,45,85,0.06)', borderRadius: 14, border: '1px solid rgba(255,45,85,0.3)', marginBottom: 28, marginTop: 8 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--red)', marginBottom: 6 }}>Politique de tolérance zéro</p>
          <p style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.7 }}>
            Toute tentative de tricher, utiliser des bots, manipuler le nombre de GGs, créer de faux comptes ou abuser du système de points entraînera : ban permanent du compte, perte de tous les points et demandes, et potentielles poursuites pour fraude.
          </p>
        </div>
      </div>

      {/* Request history */}
      {requests.length > 0 && (
        <>
          <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>MES DEMANDES</p>
          <div style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--gray3)' }}>
            {requests.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px',
                borderBottom: i < requests.length - 1 ? '1px solid var(--gray3)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)', marginBottom: 3 }}>
                    CA${r.amount} {PLATFORM_LABELS[r.platform]}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--gray)' }}>
                    {r.pointsCost?.toLocaleString()} pts · {r.email}
                  </p>
                  {r.requestedAt?.toDate && (
                    <p style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                      {r.requestedAt.toDate().toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {r.adminNote ? <p style={{ fontSize: 11, color: 'var(--gray)', fontStyle: 'italic', marginTop: 3 }}>{r.adminNote}</p> : null}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
