'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const CF_BASE = 'https://us-central1-gamingactions-app.cloudfunctions.net';

const TIERS = [
  { amount: 2.99, emoji: '☕', label: 'A coffee', desc: 'A little boost' },
  { amount: 4.99, emoji: '🍕', label: 'A pizza', desc: 'You feed the team!' },
  { amount: 9.99, emoji: '🔥', label: 'Super supporter', desc: 'You really move GA forward' },
  { amount: 19.99, emoji: '🚀', label: 'Boost', desc: 'You power the project' },
  { amount: 49.99, emoji: '👑', label: 'Legend', desc: 'Our hero 💛' },
];

export default function SupportPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(null); // montant en cours
  const [custom, setCustom] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') toast.success('Thank you so much for your support 💛');
    else if (params.get('canceled') === 'true') toast('Payment canceled.', { icon: '↩️' });
  }, []);

  const checkout = async (amount) => {
    if (!user) { router.push('/auth?mode=register'); return; }
    const amt = Number(amount);
    if (!amt || amt < 1) { toast.error('Minimum amount: $1'); return; }
    if (amt > 999) { toast.error('Maximum amount: $999'); return; }
    setLoading(amount);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${CF_BASE}/createSupportCheckout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          amount: amt,
          successUrl: `${window.location.origin}/support?success=true`,
          cancelUrl: `${window.location.origin}/support?canceled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Error');
    } catch (e) {
      toast.error('Payment error: ' + e.message);
      setLoading(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">💛</div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--white)' }}>Support Gaming Actions</h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--gray)' }}>
          We build Gaming Actions with passion. If you enjoy the app, you can help us
          keep going — every bit of support means the world.
        </p>
      </div>

      <div className="space-y-3">
        {TIERS.map((t) => (
          <button
            key={t.amount}
            disabled={loading !== null}
            onClick={() => checkout(t.amount)}
            className="w-full flex items-center gap-4 rounded-2xl p-4 transition disabled:opacity-60"
            style={{ background: 'var(--card)', border: '0.5px solid rgba(201,168,76,0.4)' }}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="flex-1 text-left">
              <span className="block font-bold" style={{ color: 'var(--white)' }}>{t.label}</span>
              <span className="block text-xs" style={{ color: 'var(--gray)' }}>{t.desc}</span>
            </span>
            <span className="font-extrabold" style={{ color: 'var(--gold)' }}>
              {loading === t.amount ? '…' : `CA$${t.amount.toFixed(2)}`}
            </span>
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="mt-6 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--gray3)' }}>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--white)' }}>Give another amount</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center rounded-xl px-3" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gray3)' }}>
            <span style={{ color: 'var(--gray)' }}>CA$</span>
            <input
              type="number"
              min="1"
              max="999"
              step="1"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Amount"
              className="w-full bg-transparent py-3 px-2 outline-none"
              style={{ color: 'var(--white)' }}
            />
          </div>
          <button
            disabled={loading !== null || !custom}
            onClick={() => checkout(custom)}
            className="btn-gold px-6 rounded-xl font-bold disabled:opacity-50"
          >
            {loading === custom ? '…' : 'Support'}
          </button>
        </div>
      </div>

      <p className="text-center text-xs mt-6" style={{ color: 'var(--gray)' }}>
        Secure payment via Stripe. Thank you for your support 🙏
      </p>
    </div>
  );
}
