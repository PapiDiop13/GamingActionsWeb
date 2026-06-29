'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

const THANKS_VALUE_CAD = 0.05;
const THANKS_COST_POINTS = 5;

const STEPS = [
  { n: '1', title: 'Crée du contenu de qualité', desc: 'Poste des clips, tips et tutoriels que tes fans adorent.' },
  { n: '2', title: 'Les fans t\'envoient des Thanks 💜', desc: `Chaque Thanks coûte ${THANKS_COST_POINTS} GA Points à ton fan et te soutient directement.` },
  { n: '3', title: 'Les fans s\'abonnent à ta Fanbase 🔒', desc: 'Gagne un revenu mensuel récurrent de chaque abonné à ton contenu exclusif.' },
  { n: '4', title: 'Thanks + abonnements = argent réel', desc: `Chaque Thanks vaut CA$${THANKS_VALUE_CAD.toFixed(2)}, plus ta part des abonnements Fanbase.` },
  { n: '5', title: 'Retire tes gains', desc: 'Une fois le seuil de paiement atteint, transfère ton argent.' },
];

const METHODS = [
  { id: 'paypal',  label: 'PayPal',                color: '#003087' },
  { id: 'stripe',  label: 'Virement bancaire',      color: '#635BFF' },
  { id: 'interac', label: 'Interac (Canada)',        color: '#FF2D55' },
];

export default function CreatorEarningsPage() {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();

  const thanksReceived = userProfile?.thanksReceived || 0;
  const estimatedCAD   = (thanksReceived * THANKS_VALUE_CAD).toFixed(2);
  const available      = parseFloat(estimatedCAD);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount,  setAmount]  = useState('');
  const [method,  setMethod]  = useState(null);
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    // Withdrawals coming soon
    toast('🚀 Les retraits seront disponibles prochainement !', { icon: '⏳' });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--black)' }}>
        <button onClick={() => router.push('/auth')} className="btn-gold px-6 py-3">Connexion</button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--black)', minHeight: '100dvh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--gray3)', position: 'sticky', top: 0, background: 'var(--black)', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--white)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>←</button>
        <h1 style={{ fontWeight: 900, fontSize: 18, color: 'var(--white)', margin: 0 }}>Revenus Créateur</h1>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 60px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'linear-gradient(180deg, #0d0820 0%, #0A0A0F 100%)', margin: '0 -16px 24px' }}>
          <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 8, fontWeight: 600 }}>Revenus estimés</p>
          <p style={{ fontSize: 52, fontWeight: 900, color: '#00C853', margin: '0 0 8px', lineHeight: 1 }}>
            CA${estimatedCAD}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,77,255,0.12)', borderRadius: 20, padding: '6px 14px', border: '1px solid rgba(124,77,255,0.3)' }}>
            <span style={{ fontSize: 14 }}>💜</span>
            <span style={{ fontSize: 13, color: '#B0A0FF', fontWeight: 600 }}>{thanksReceived.toLocaleString()} Thanks reçus</span>
          </div>
        </div>

        {/* How you earn */}
        <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>COMMENT TU GAGNES DE L'ARGENT</p>
        <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--gray3)', overflow: 'hidden', marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderBottom: i < STEPS.length - 1 ? '1px solid var(--gray3)' : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--black)' }}>{s.n}</span>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', margin: '0 0 4px' }}>{s.title}</p>
                <p style={{ fontSize: 12, color: 'var(--gray)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue sources */}
        <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>TES SOURCES DE REVENUS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '💜', title: 'Thanks', desc: 'Pourboires ponctuels de tes fans sur tes clips et tips.', color: '#7C4DFF' },
            { icon: '🔒', title: 'Abonnements Fanbase', desc: 'Revenu mensuel récurrent de tes abonnés.', color: '#00C853' },
          ].map(card => (
            <div key={card.title} style={{ background: 'var(--card)', borderRadius: 14, padding: 16, border: `1px solid ${card.color}40`, textAlign: 'center' }}>
              <span style={{ fontSize: 28 }}>{card.icon}</span>
              <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--white)', margin: '10px 0 6px' }}>{card.title}</p>
              <p style={{ fontSize: 11, color: 'var(--gray)', margin: '0 0 12px', lineHeight: 1.5 }}>{card.desc}</p>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--black)', background: '#00C853', padding: '3px 10px', borderRadius: 10 }}>Argent réel</span>
            </div>
          ))}
        </div>

        {/* GA Points clarification */}
        <p style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>À PROPOS DES GA POINTS</p>
        {[
          { icon: '⭐', color: 'var(--gold)', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)', text: 'Les GA Points se gagnent avec tes clips, GGs et followers, et s\'utilisent dans la Boutique pour des frames & cosmétiques. Ils ne sont PAS convertibles en argent — seuls les Thanks et abonnements Fanbase génèrent des revenus réels.' },
          { icon: 'ℹ️', color: '#00A8FF', bg: 'rgba(0,168,255,0.08)', border: 'rgba(0,168,255,0.2)', text: 'En tant que Créateur, tu ne peux pas envoyer de Thanks toi-même — cela garantit l\'équité de l\'économie et prévient les abus.' },
        ].map((note, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, background: note.bg, borderRadius: 12, padding: 14, border: `1px solid ${note.border}`, marginBottom: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{note.icon}</span>
            <p style={{ fontSize: 12, color: 'var(--gray)', margin: 0, lineHeight: 1.6 }}>{note.text}</p>
          </div>
        ))}

        {/* Withdraw button */}
        <button
          onClick={handleWithdraw}
          style={{
            width: '100%', marginTop: 24, padding: '16px 0', borderRadius: 14,
            background: 'var(--gold)', color: 'var(--black)', fontWeight: 900, fontSize: 16,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          💸 Retirer mes gains
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray)', marginTop: 10 }}>
          Minimum CA$10 · Frais de traitement 2.5%
        </p>
      </div>
    </div>
  );
}
