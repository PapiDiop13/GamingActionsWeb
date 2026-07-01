'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/useAuthStore';

const PERKS = [
  { icon: '📹', title: '50 vidéos / semaine', desc: 'Au lieu de 20 — poste plus, grandi plus vite' },
  { icon: '🎬', title: 'Qualité vidéo supérieure', desc: 'Tes clips en haute qualité, plus nets et plus fluides' },
  { icon: '🎁', title: 'Pack cosmétiques offert', desc: 'Un pack de cosmétiques exclusifs Legendary dès l\'activation' },
  { icon: '⚡', title: 'GA Points bonus', desc: 'Points supplémentaires chaque semaine directement sur ton compte' },
  { icon: '👑', title: 'Badge Legendary', desc: 'Badge doré visible sur ton profil et dans les commentaires' },
  { icon: '🚀', title: 'Priorité dans le feed', desc: 'Tes clips remontés en priorité dans le feed de la communauté' },
  { icon: '🔬', title: 'Accès aux nouvelles features', desc: 'Tu testes les nouvelles fonctionnalités avant tout le monde' },
];

const FAQ = [
  {
    q: 'Où puis-je souscrire ?',
    a: 'L\'abonnement Legendary est disponible uniquement sur le web pour l\'instant — pas encore sur l\'app mobile. Tu es au bon endroit.',
  },
  {
    q: 'Combien de vidéos puis-je poster par semaine ?',
    a: 'Avec Legendary tu passes de 20 à 50 vidéos par semaine. Tes vidéos sont aussi en meilleure qualité.',
  },
  {
    q: 'Comment annuler ?',
    a: 'Tu peux annuler à tout moment depuis les paramètres de ton compte, sans engagement ni frais.',
  },
  {
    q: 'C\'est quoi FanBox ?',
    a: 'FanBox est une fonctionnalité séparée — c\'est un abonnement que tu paies directement à un créateur pour accéder à son contenu exclusif. Ce n\'est pas inclus dans Legendary.',
  },
];

export default function SubscriptionPage() {
  const { user, userProfile } = useAuthStore();
  const isLegendary = userProfile?.isLegendary;

  return (
    <div className="px-4 md:px-6 py-8 max-w-3xl mx-auto">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.3)',
        }}>
          <span>👑</span>
          <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>Gaming Actions Legendary</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight" style={{ color: 'var(--white)' }}>
          Passe au niveau<br />
          <span style={{ color: 'var(--gold)', textShadow: '0 0 24px rgba(201,168,76,0.35)' }}>Legendary</span>
        </h1>
        <p className="text-base max-w-md mx-auto" style={{ color: 'var(--gray)' }}>
          Plus de vidéos, meilleure qualité, badge exclusif et accès prioritaire au feed.
        </p>
        <p className="text-xs font-bold mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
          color: 'var(--gold)',
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          🌐 Disponible sur le web uniquement pour l'instant
        </p>
      </div>

      {/* Pricing card */}
      <div className="relative mb-12">
        <div className="absolute inset-0 rounded-2xl" style={{
          background: 'linear-gradient(to bottom, rgba(201,168,76,0.12), transparent)',
        }} />
        <div className="relative rounded-2xl p-8 text-center" style={{
          background: 'var(--card)',
          border: '1px solid rgba(201,168,76,0.4)',
          boxShadow: '0 0 40px rgba(201,168,76,0.08)',
        }}>
          <div className="text-5xl mb-4">👑</div>
          <div className="mb-2">
            <span className="text-5xl font-black" style={{ color: 'var(--white)' }}>CA$2.99</span>
            <span className="text-lg" style={{ color: 'var(--gray)' }}>/mois</span>
          </div>
          <p className="text-sm mb-8" style={{ color: 'var(--gray)' }}>Annule quand tu veux · Aucun engagement</p>

          {isLegendary ? (
            <div className="rounded-xl p-4" style={{
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.3)',
            }}>
              <p className="font-bold" style={{ color: 'var(--gold)' }}>👑 Tu es déjà Legendary !</p>
              <p className="text-xs mt-1" style={{ color: 'var(--gray)' }}>Gère ton abonnement depuis les paramètres.</p>
            </div>
          ) : user ? (
            <Link
              href="/legendary"
              className="btn-gold w-full flex items-center justify-center gap-2 text-base py-3"
              style={{ display: 'flex' }}
            >
              👑 Devenir Legendary — CA$2.99/mois
            </Link>
          ) : (
            <div className="space-y-3 flex flex-col gap-3">
              <Link href="/auth?mode=register" className="btn-gold w-full text-center py-3 text-base block">
                Créer un compte gratuit
              </Link>
              <p className="text-xs" style={{ color: 'var(--gray)' }}>Puis souscrire à Legendary</p>
            </div>
          )}
        </div>
      </div>

      {/* Perks */}
      <h2 className="font-black text-xl mb-6 text-center" style={{ color: 'var(--white)' }}>Ce qui est inclus</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-12">
        {PERKS.map(p => (
          <div key={p.title} className="rounded-xl p-5 flex gap-4 transition-all" style={{
            background: 'var(--card)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <span className="text-2xl shrink-0">{p.icon}</span>
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--white)' }}>{p.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--gray)' }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <h2 className="font-black text-xl mb-6 text-center" style={{ color: 'var(--white)' }}>Questions fréquentes</h2>
      <div className="flex flex-col gap-4">
        {FAQ.map(item => (
          <div key={item.q} className="rounded-xl p-5" style={{
            background: 'var(--card)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p className="font-bold text-sm mb-2" style={{ color: 'var(--white)' }}>{item.q}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--gray)' }}>{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
