'use client';
export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const TABS = [
  { id: 'terms', label: "Conditions d'utilisation" },
  { id: 'privacy', label: 'Politique de confidentialité' },
  { id: 'community', label: 'Community Guidelines' },
  { id: 'contest', label: 'Règles du concours' },
];

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-black mb-2" style={{ color: 'var(--gold)' }}>{title}</h2>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>{children}</div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <Section title="1. Acceptation des conditions">
        En accédant à Gaming Actions («&nbsp;GA&nbsp;»), tu acceptes les présentes Conditions d'utilisation. Si tu n'es pas d'accord, tu ne dois pas utiliser la plateforme. Ces conditions sont régies par les lois de la province de Québec et du Canada.
      </Section>
      <Section title="2. Éligibilité">
        Tu dois avoir au moins 13 ans pour utiliser Gaming Actions. Les utilisateurs de moins de 18 ans doivent avoir l'autorisation d'un parent ou tuteur légal.
      </Section>
      <Section title="3. Ton compte">
        Tu es responsable de la sécurité de ton compte et de toute activité qui s'y déroule. N'utilise pas de fausses informations lors de ton inscription. En cas de compromission de ton compte, contacte-nous immédiatement.
      </Section>
      <Section title="4. Contenu utilisateur">
        Tu conserves la propriété de ton contenu, mais tu nous accordes une licence mondiale, non exclusive et libre de redevances pour l'afficher, le distribuer et le promouvoir sur la plateforme. Tu garantis que ton contenu ne viole pas les droits de tiers.
      </Section>
      <Section title="5. Abonnement Legendary">
        L'abonnement Legendary est disponible à CA$1,99/mois ou CA$14,99/an. Les paiements sont traités par Stripe. L'abonnement se renouvelle automatiquement sauf annulation avant la date de renouvellement. Aucun remboursement n'est accordé pour les périodes partielles, sauf obligation légale.
      </Section>
      <Section title="6. GA Points">
        Les GA Points sont une monnaie virtuelle non remboursable et non transférable. Ils peuvent être obtenus par l'activité sur la plateforme et dépensés dans la boutique cosmétique. Ils n'ont aucune valeur monétaire réelle.
      </Section>
      <Section title="7. Programme Créateur">
        Les créateurs acceptent les conditions supplémentaires du programme Créateur. Gaming Actions se réserve le droit de modifier les critères d'éligibilité et les structures de rémunération avec un préavis de 30 jours.
      </Section>
      <Section title="8. Résiliation">
        Nous nous réservons le droit de suspendre ou supprimer tout compte qui viole ces conditions, sans préavis. Tu peux supprimer ton compte à tout moment depuis les paramètres.
      </Section>
      <Section title="9. Limitation de responsabilité">
        Gaming Actions est fourni «&nbsp;tel quel&nbsp;». Nous ne garantissons pas la disponibilité continue du service et déclinons toute responsabilité pour les pertes indirectes ou consécutives.
      </Section>
      <Section title="10. Modifications">
        Nous pouvons modifier ces conditions à tout moment. Les changements significatifs seront notifiés par email ou notification in-app avec un préavis de 15 jours.
      </Section>
      <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Dernière mise à jour : juin 2026</p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <Section title="1. Informations collectées">
        Nous collectons les informations que tu nous fournis directement (email, pseudo, avatar), les données d'utilisation (clips uploadés, interactions, temps passé), les données d'appareil (type d'appareil, OS, identifiants), et les données de paiement traitées par Stripe (nous ne stockons pas tes informations de carte bancaire).
      </Section>
      <Section title="2. Utilisation des données">
        Tes données sont utilisées pour : faire fonctionner et améliorer la plateforme, personnaliser ton expérience et le fil de contenu, t'envoyer des notifications pertinentes, prévenir la fraude et assurer la sécurité, générer des statistiques agrégées anonymisées.
      </Section>
      <Section title="3. Partage des données">
        Nous ne vendons jamais tes données personnelles. Nous partageons uniquement avec : les prestataires de services essentiels (Stripe pour les paiements, Firebase/Google pour l'infrastructure), les autorités légales sur ordonnance judiciaire.
      </Section>
      <Section title="4. Cookies et traceurs">
        Nous utilisons des cookies essentiels pour l'authentification et des cookies analytiques (Firebase Analytics) pour comprendre l'utilisation de la plateforme. Tu peux configurer ton navigateur pour refuser les cookies non essentiels.
      </Section>
      <Section title="5. Conservation des données">
        Tes données sont conservées tant que ton compte est actif. Après suppression du compte, les données personnelles sont effacées dans un délai de 30 jours, à l'exception des données requises par la loi.
      </Section>
      <Section title="6. Tes droits">
        Tu as le droit d'accéder à tes données, de les corriger, de les exporter et de demander leur suppression. Pour exercer ces droits, contacte-nous à privacy@gamingactions.com.
      </Section>
      <Section title="7. Sécurité">
        Nous utilisons le chiffrement SSL/TLS pour toutes les communications. Les mots de passe sont hashés et jamais stockés en clair. Nous effectuons des audits de sécurité réguliers.
      </Section>
      <Section title="8. Mineurs">
        Nous ne collectons pas sciemment de données sur des enfants de moins de 13 ans. Si tu as connaissance d'un compte d'un mineur de moins de 13 ans, contacte-nous immédiatement.
      </Section>
      <Section title="9. Transferts internationaux">
        Tes données peuvent être traitées sur des serveurs situés aux États-Unis (Google Cloud/Firebase). Ces transferts sont encadrés par les clauses contractuelles types approuvées par la Commission européenne.
      </Section>
      <Section title="10. Contact">
        Pour toute question relative à la vie privée : privacy@gamingactions.com — Gaming Actions Inc., Montréal, Québec, Canada.
      </Section>
      <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Dernière mise à jour : juin 2026</p>
    </>
  );
}

function CommunityContent() {
  return (
    <>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--gray)' }}>
        Gaming Actions est une communauté construite par et pour les gamers. Ces règles existent pour que chacun puisse partager sa passion du jeu vidéo dans un environnement sain, inclusif et inspirant. En utilisant la plateforme, tu t'engages à les respecter.
      </p>
      <Section title="✅ Ce qu'on valorise">
        <ul className="list-disc list-inside space-y-1">
          <li>Les clips authentiques qui mettent en valeur ton skill, ta créativité ou ton humour</li>
          <li>Le soutien à la communauté — commente, like, et encourage les autres créateurs</li>
          <li>Le fair-play, même dans les moments de compétition intense</li>
          <li>La diversité — tous les genres de jeux sont les bienvenus, du FPS au jeu de gestion</li>
          <li>La transparence — identifie tes partenariats et contenus sponsorisés</li>
        </ul>
      </Section>
      <Section title="🚫 Contenu interdit">
        <ul className="list-disc list-inside space-y-1">
          <li><strong style={{ color: 'var(--white)' }}>Triche et manipulation</strong> : ne partage pas de gameplay obtenu avec des cheats, hacks ou exploits. Ne manipule pas les classements ou le système de GA Points.</li>
          <li><strong style={{ color: 'var(--white)' }}>Harcèlement et intimidation</strong> : aucune forme d'attaque personnelle, de cyberharcèlement, de menaces ou de prise de contact non sollicitée harcelante.</li>
          <li><strong style={{ color: 'var(--white)' }}>Discours haineux</strong> : tout contenu qui discrimine sur la base de la race, l'ethnicité, la religion, le genre, l'orientation sexuelle, le handicap ou tout autre caractéristique protégée est strictement interdit.</li>
          <li><strong style={{ color: 'var(--white)' }}>Contenu adulte</strong> : aucun contenu sexuellement explicite ou suggestif. Gaming Actions accueille des utilisateurs de 13 ans et plus.</li>
          <li><strong style={{ color: 'var(--white)' }}>Violence gratuite</strong> : la violence inhérente aux jeux est acceptée, mais la glorification de la violence réelle, le gore excessif hors contexte de jeu, ou tout contenu qui incite à la violence est interdit.</li>
          <li><strong style={{ color: 'var(--white)' }}>Spam et contenu trompeur</strong> : ne publie pas de contenu répétitif, de clickbait trompeur ou de fausses informations.</li>
          <li><strong style={{ color: 'var(--white)' }}>Violations de droits d'auteur</strong> : n'utilise pas de musique, images ou contenu protégé sans autorisation.</li>
          <li><strong style={{ color: 'var(--white)' }}>Doxxing</strong> : ne révèle jamais les informations personnelles d'un autre utilisateur sans son consentement.</li>
        </ul>
      </Section>
      <Section title="📢 Signalement">
        Si tu vois un contenu qui viole ces règles, utilise le bouton de signalement intégré à chaque clip ou profil. Notre équipe examine tous les signalements sous 48h.
      </Section>
      <Section title="⚖️ Conséquences">
        Les violations peuvent entraîner : un avertissement, la suppression du contenu, une suspension temporaire (1 à 30 jours), ou un bannissement permanent selon la gravité. Les décisions de modération peuvent être contestées par email à moderation@gamingactions.com.
      </Section>
      <Section title="🔄 Évolution des règles">
        Ces règles évoluent avec la communauté. Nous annonçons tout changement majeur avec un préavis de 15 jours via notification in-app.
      </Section>
      <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Dernière mise à jour : juin 2026</p>
    </>
  );
}

function ContestContent() {
  return (
    <>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--gray)' }}>
        Gaming Actions organise régulièrement des concours de clips pour récompenser les meilleurs joueurs de la communauté. Ces règles s'appliquent à tous les concours organisés sur la plateforme, sauf mention contraire spécifique dans les règles d'un concours particulier.
      </p>
      <Section title="1. Éligibilité">
        Pour participer à un concours GA, tu dois : avoir un compte Gaming Actions actif et en règle, respecter les Community Guidelines, avoir au moins 13 ans. Les employés de Gaming Actions et leurs proches ne peuvent pas participer.
      </Section>
      <Section title="2. Participation">
        Pour soumettre un clip à un concours : le clip doit être enregistré par toi-même, il doit correspondre au thème et au jeu du concours, il doit être uploadé sur ton profil GA avec le hashtag officiel du concours, il ne doit pas avoir été publié avant le début du concours (sauf indication contraire).
      </Section>
      <Section title="3. Critères de jugement">
        Les clips sont évalués sur : le skill et la difficulté du moment capturé, la créativité et l'originalité, la qualité de la capture vidéo, l'engagement généré (likes, commentaires), le vote de la communauté (quand applicable). Le jury GA se réserve le droit de disqualifier tout clip ne respectant pas les règles.
      </Section>
      <Section title="4. Récompenses">
        Les récompenses peuvent inclure des GA Points, des abonnements Legendary, des cosmétiques exclusifs, des badges de champion, et (pour les grands concours) des prix physiques ou monétaires. Les récompenses monétaires sont soumises aux taxes applicables selon ta juridiction. Gaming Actions n'est pas responsable des frais fiscaux.
      </Section>
      <Section title="5. Droits sur le contenu">
        En participant à un concours, tu accordes à Gaming Actions le droit de partager et promouvoir ton clip sur la plateforme et nos réseaux sociaux officiels, avec attribution à ton profil. Tu conserves la propriété de ton clip.
      </Section>
      <Section title="6. Disqualification">
        Tout participant peut être disqualifié en cas de : triche (gameplay modifié, manipulations), violation des Community Guidelines, tentative de manipulation des votes, faux compte ou usurpation d'identité.
      </Section>
      <Section title="7. Décisions finales">
        Les décisions du jury GA sont définitives. Tout litige doit être soumis par email à contests@gamingactions.com dans les 7 jours suivant l'annonce des résultats.
      </Section>
      <Section title="8. Annulation">
        Gaming Actions se réserve le droit d'annuler ou modifier un concours en cas de circonstances exceptionnelles. Les participants en seront informés via notification in-app.
      </Section>
      <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Dernière mise à jour : juin 2026</p>
    </>
  );
}

const TAB_CONTENT = {
  terms: <TermsContent />,
  privacy: <PrivacyContent />,
  community: <CommunityContent />,
  contest: <ContestContent />,
};

function LegalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') || 'terms';

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 text-sm font-bold transition-opacity hover:opacity-70"
        style={{ color: 'var(--gray)' }}
      >
        <span style={{ fontSize: '1.1rem' }}>←</span> Retour
      </button>

      <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--white)' }}>📋 Legal</h1>

      {/* Tab navigation */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => router.replace(`/legal?tab=${t.id}`)}
            className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            style={{
              background: tab === t.id ? 'rgba(201,168,76,0.15)' : 'transparent',
              color: tab === t.id ? 'var(--gold)' : 'var(--gray)',
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="text-lg font-black mb-5" style={{ color: 'var(--white)' }}>
          {TABS.find(t => t.id === tab)?.label}
        </h2>
        {TAB_CONTENT[tab] || TAB_CONTENT.terms}
      </div>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p style={{ color: 'var(--gray)' }}>Chargement...</p>
      </div>
    }>
      <LegalContent />
    </Suspense>
  );
}
