'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const CF_BASE = 'https://us-central1-gamingactions-app.cloudfunctions.net';

const PLANS = [
  {
    id: 'monthly',
    label: 'Mensuel',
    price: 'CA$1.99',
    sub: '/mois',
    badge: null,
    highlight: false,
  },
  {
    id: 'yearly',
    label: 'Annuel',
    price: 'CA$14.99',
    sub: '/an',
    badge: '🔥 -37%',
    highlight: true,
  },
];

const PERKS = [
  { icon: '📹', title: '50 vidéos / semaine', desc: 'Au lieu de 20' },
  { icon: '🎬', title: 'Qualité vidéo supérieure', desc: 'Clips HD plus nets et fluides' },
  { icon: '🎁', title: 'Pack cosmétiques offert', desc: 'Pack Legendary exclusif dès l\'activation' },
  { icon: '⚡', title: 'GA Points bonus', desc: 'Points supplémentaires chaque semaine' },
  { icon: '👑', title: 'Badge Legendary', desc: 'Visible sur ton profil et dans les comments' },
  { icon: '🚀', title: 'Priorité dans le feed', desc: 'Tes clips remontés en priorité' },
  { icon: '🔬', title: 'Accès aux nouvelles features', desc: 'Beta tester avant tout le monde' },
];

export default function LegendaryPage() {
  const { user, userProfile, refreshProfile } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isLegendary = userProfile?.plan === 'legendary' || userProfile?.isLegendary;

  // Handle Stripe redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      toast.success('🎉 Bienvenue dans Legendary ! Actualisation...');
      setTimeout(() => refreshProfile?.(), 2000);
    } else if (canceled === 'true') {
      toast('Paiement annulé.', { icon: '↩️' });
    }
  }, [searchParams]);

  const handleCheckout = async () => {
    if (!user) { router.push('/auth?mode=register'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${CF_BASE}/createCheckoutSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          plan: selectedPlan,
          successUrl: `${window.location.origin}/legendary?success=true`,
          cancelUrl: `${window.location.origin}/legendary?canceled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur de paiement : ' + e.message);
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const res = await fetch(`${CF_BASE}/createPortalSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          returnUrl: `${window.location.origin}/legendary`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Erreur');
    } catch (e) {
      toast.error('Erreur : ' + e.message);
      setPortalLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-6 py-8 max-w-3xl mx-auto">

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.3)',
        }}>
          <span>👑</span>
          <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>Gaming Actions Legendary</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight" style={{ color: 'var(--white)' }}>
          Rize to the{' '}
          <span style={{ color: 'var(--gold)', textShadow: '0 0 24px rgba(201,168,76,0.4)' }}>Legendary</span>
        </h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--gray)' }}>
          Disponible sur le web · Annule à tout moment · Aucun engagement
        </p>
      </div>

      {isLegendary ? (
        /* Already legendary */
        <div className="rounded-2xl p-8 text-center mb-10" style={{
          background: 'var(--card)',
          border: '1px solid rgba(201,168,76,0.4)',
          boxShadow: '0 0 40px rgba(201,168,76,0.08)',
        }}>
          <div className="text-5xl mb-4">👑</div>
          <h2 className="font-black text-xl mb-2" style={{ color: 'var(--gold)' }}>Tu es déjà Legendary !</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--gray)' }}>
            Statut : <span className="font-bold" style={{ color: 'var(--green)' }}>{userProfile?.stripeStatus || 'actif'}</span>
          </p>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="btn-outline px-6 py-2.5 text-sm font-bold"
          >
            {portalLoading ? '...' : '⚙️ Gérer mon abonnement'}
          </button>
        </div>
      ) : (
        /* Plan selector + checkout */
        <div className="mb-10">
          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className="relative rounded-2xl p-6 text-left transition-all"
                style={{
                  background: selectedPlan === plan.id ? 'rgba(201,168,76,0.08)' : 'var(--card)',
                  border: selectedPlan === plan.id ? '2px solid var(--gold)' : '2px solid var(--gray3)',
                  boxShadow: selectedPlan === plan.id ? '0 0 24px rgba(201,168,76,0.12)' : 'none',
                }}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black px-3 py-1 rounded-full" style={{
                    background: 'var(--gold)', color: 'var(--black)',
                  }}>{plan.badge}</span>
                )}
                <p className="font-bold text-sm mb-1" style={{ color: 'var(--gray)' }}>{plan.label}</p>
                <p className="font-black text-2xl" style={{ color: 'var(--white)' }}>{plan.price}</p>
                <p className="text-xs" style={{ color: 'var(--gray)' }}>{plan.sub}</p>
                {selectedPlan === plan.id && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--gold)' }}>
                    <span style={{ color: 'var(--black)', fontSize: 11, fontWeight: 900 }}>✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* CTA */}
          {user ? (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-base transition-opacity"
              style={{ background: 'var(--gold)', color: 'var(--black)', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Redirection...' : `👑 Devenir Legendary — ${PLANS.find(p => p.id === selectedPlan)?.price}`}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/auth?mode=register')}
                className="w-full py-4 rounded-2xl font-black text-base"
                style={{ background: 'var(--gold)', color: 'var(--black)' }}
              >
                Créer un compte gratuit
              </button>
              <p className="text-xs text-center" style={{ color: 'var(--gray)' }}>Puis souscris à Legendary</p>
            </div>
          )}

          <p className="text-xs text-center mt-3" style={{ color: 'var(--gray)' }}>
            🔒 Paiement sécurisé via Stripe · Annule à tout moment
          </p>
        </div>
      )}

      {/* Perks */}
      <h2 className="font-black text-lg mb-5" style={{ color: 'var(--white)' }}>Ce qui est inclus</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {PERKS.map(p => (
          <div key={p.title} className="flex gap-3 p-4 rounded-xl" style={{
            background: 'var(--card)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span className="text-xl shrink-0">{p.icon}</span>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--white)' }}>{p.title}</p>
              <p className="text-xs" style={{ color: 'var(--gray)' }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
