'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const CF_BASE = 'https://us-central1-gamingactions-app.cloudfunctions.net';

function Section({ title, children }) {
  return (
    <div className="rounded-xl overflow-hidden mb-4" style={{
      background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--gray)' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ icon, label, sublabel, onClick, danger, right }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-white/[0.02]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{
        background: danger ? 'rgba(255,45,85,0.12)' : 'rgba(201,168,76,0.1)',
      }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: danger ? 'var(--red)' : 'var(--white)' }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--gray)' }}>{sublabel}</p>}
      </div>
      {right || <span style={{ color: 'var(--gray)' }}>›</span>}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--gray3)' }} onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-5" style={{ color: 'var(--white)' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, userProfile, logout } = useAuthStore();
  const router = useRouter();
  const [modal, setModal] = useState(null); // 'email' | 'password' | 'delete' | 'portal'
  const [loading, setLoading] = useState(false);

  // Change email
  const [newEmail, setNewEmail] = useState('');
  const [currentPwd1, setCurrentPwd1] = useState('');

  // Change password
  const [currentPwd2, setCurrentPwd2] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  // Delete account
  const [deletePwd, setDeletePwd] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const isLegendary = userProfile?.plan === 'legendary' || userProfile?.isLegendary;
  const isCreator = userProfile?.accountType === 'creator';
  const isIcon = userProfile?.accountType === 'gameconic';

  // Creator request modal
  const [creatorModal, setCreatorModal] = useState(false);
  const [creatorText, setCreatorText] = useState('');
  const [creatorLoading, setCreatorLoading] = useState(false);

  // Bug report modal
  const [bugModal, setBugModal] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugLoading, setBugLoading] = useState(false);

  // Upload help modal
  const [uploadModal, setUploadModal] = useState(false);

  const handleCreatorRequest = async () => {
    if (!creatorText.trim()) return toast.error('Ajoute un message');
    setCreatorLoading(true);
    try {
      await addDoc(collection(db, 'creator_requests'), {
        message: creatorText.trim(),
        userId: user?.uid,
        username: userProfile?.username,
        createdAt: serverTimestamp(),
      });
      toast.success('Demande envoyée !');
      setCreatorModal(false);
      setCreatorText('');
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setCreatorLoading(false);
  };

  const handleBugReport = async () => {
    if (!bugText.trim()) return toast.error('Décris le bug');
    setBugLoading(true);
    try {
      await addDoc(collection(db, 'bug_reports'), {
        message: bugText.trim(),
        userId: user?.uid,
        username: userProfile?.username,
        createdAt: serverTimestamp(),
      });
      toast.success('Bug signalé, merci !');
      setBugModal(false);
      setBugText('');
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setBugLoading(false);
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="font-bold" style={{ color: 'var(--white)' }}>Connecte-toi pour accéder aux paramètres</p>
      <button onClick={() => router.push('/auth')} className="btn-gold px-6 py-2.5">Connexion</button>
    </div>
  );

  const reauth = async (password) => {
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(auth.currentUser, cred);
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !currentPwd1) return toast.error('Remplis tous les champs');
    setLoading(true);
    try {
      await reauth(currentPwd1);
      await updateEmail(auth.currentUser, newEmail);
      await doc(db, 'users', user.uid); // trigger profile refresh
      toast.success('Email mis à jour !');
      setModal(null);
      setNewEmail(''); setCurrentPwd1('');
    } catch (e) {
      toast.error(e.code === 'auth/wrong-password' ? 'Mot de passe incorrect' : e.message);
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!currentPwd2 || !newPwd || !confirmPwd) return toast.error('Remplis tous les champs');
    if (newPwd !== confirmPwd) return toast.error('Les mots de passe ne correspondent pas');
    if (newPwd.length < 6) return toast.error('Mot de passe trop court (6 chars min)');
    setLoading(true);
    try {
      await reauth(currentPwd2);
      await updatePassword(auth.currentUser, newPwd);
      toast.success('Mot de passe mis à jour !');
      setModal(null);
      setCurrentPwd2(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      toast.error(e.code === 'auth/wrong-password' ? 'Mot de passe actuel incorrect' : e.message);
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return toast.error('Tape DELETE pour confirmer');
    if (!deletePwd) return toast.error('Entre ton mot de passe');
    setLoading(true);
    try {
      await reauth(deletePwd);
      const uid = user.uid;
      // Delete user's videos
      const videosSnap = await getDocs(query(collection(db, 'videos'), where('userId', '==', uid)));
      const batch = writeBatch(db);
      videosSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      // Delete user doc
      await deleteDoc(doc(db, 'users', uid));
      // Delete auth user
      await deleteUser(auth.currentUser);
      toast.success('Compte supprimé');
      router.push('/');
    } catch (e) {
      toast.error(e.code === 'auth/wrong-password' ? 'Mot de passe incorrect' : e.message);
    }
    setLoading(false);
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CF_BASE}/createPortalSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, returnUrl: `${window.location.origin}/settings` }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Erreur');
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black mb-8" style={{ color: 'var(--white)' }}>⚙️ Paramètres</h1>

      {/* Profile */}
      <Section title="Profil">
        <Row icon="✏️" label="Modifier le profil" sublabel="Pseudo, bio, avatar, console..." onClick={() => router.push('/profile/edit')} />
        <Row icon="⚡" label="GA Points & Historique" sublabel={`${(userProfile?.gaPoints || 0).toLocaleString()} points`} onClick={() => router.push('/points')} />
        <Row icon="🛍️" label="Boutique cosmétiques" sublabel="Frames, bannières, thèmes..." onClick={() => router.push('/shop')} />
      </Section>

      {/* Account */}
      <Section title="Compte">
        <Row
          icon="📧"
          label="Changer d'email"
          sublabel={user.email}
          onClick={() => setModal('email')}
        />
        <Row
          icon="🔑"
          label="Changer le mot de passe"
          onClick={() => setModal('password')}
        />
      </Section>

      {/* Subscription */}
      <Section title="Abonnement">
        {isLegendary ? (
          <Row
            icon="👑"
            label="Gérer mon abonnement Legendary"
            sublabel="Voir, modifier ou annuler via Stripe"
            onClick={handleManageSubscription}
            right={loading ? <span style={{ color: 'var(--gray)' }}>...</span> : <span style={{ color: 'var(--gray)' }}>›</span>}
          />
        ) : (
          <Row
            icon="👑"
            label="Passer Legendary"
            sublabel="CA$1.99/mois — 50 vidéos, badge, priorité feed..."
            onClick={() => router.push('/legendary')}
          />
        )}
      </Section>

      {/* Créateur */}
      {(isCreator || isIcon) && (
        <Section title="Créateur">
          <Row icon="🎬" label="Ma Fanbase" sublabel="Gère tes abonnés et ton contenu" onClick={() => router.push('/creator')} />
          <Row icon="💰" label="Revenus Créateur" sublabel="Suivi de tes gains et paiements" onClick={() => router.push('/creator/earnings')} />
        </Section>
      )}

      {!(isCreator || isIcon) && (
        <Section title="Créateur">
          <Row icon="⭐" label="Devenir Créateur" sublabel="Rejoins le programme créateur GA" onClick={() => setCreatorModal(true)} />
        </Section>
      )}

      {/* Aide & Légal */}
      <Section title="Aide & Légal">
        <Row icon="📹" label="Comment uploader" sublabel="Guide étape par étape" onClick={() => setUploadModal(true)} />
        <Row icon="🐛" label="Signaler un bug" sublabel="Aide-nous à améliorer l'app" onClick={() => setBugModal(true)} />
        <Row icon="📋" label="Community Guidelines" onClick={() => router.push('/legal?tab=community')} />
        <Row icon="🏆" label="Règles du concours" onClick={() => router.push('/legal?tab=contest')} />
        <Row icon="📄" label="Conditions d'utilisation" onClick={() => router.push('/legal?tab=terms')} />
        <Row icon="🔒" label="Politique de confidentialité" onClick={() => router.push('/legal?tab=privacy')} />
      </Section>

      {/* Danger zone */}
      <Section title="Zone dangereuse">
        <Row icon="🚪" label="Se déconnecter" onClick={logout} danger />
        <Row icon="🗑️" label="Supprimer le compte" sublabel="Action irréversible" onClick={() => setModal('delete')} danger />
      </Section>

      {/* ─── Modals ─── */}

      {modal === 'email' && (
        <Modal title="Changer d'email" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <input className="input" placeholder="Nouveau email" value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" />
            <input className="input" placeholder="Mot de passe actuel" value={currentPwd1} onChange={e => setCurrentPwd1(e.target.value)} type="password" />
            <button onClick={handleChangeEmail} disabled={loading} className="btn-gold w-full py-2.5">
              {loading ? '...' : 'Confirmer'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'password' && (
        <Modal title="Changer le mot de passe" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <input className="input" placeholder="Mot de passe actuel" value={currentPwd2} onChange={e => setCurrentPwd2(e.target.value)} type="password" />
            <input className="input" placeholder="Nouveau mot de passe" value={newPwd} onChange={e => setNewPwd(e.target.value)} type="password" />
            <input className="input" placeholder="Confirmer le nouveau" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} type="password" />
            <button onClick={handleChangePassword} disabled={loading} className="btn-gold w-full py-2.5">
              {loading ? '...' : 'Mettre à jour'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="⚠️ Supprimer le compte" onClose={() => setModal(null)}>
          <p className="text-sm mb-5" style={{ color: 'var(--gray)' }}>
            Cette action est <strong style={{ color: 'var(--red)' }}>irréversible</strong>. Tous tes clips, points et données seront définitivement supprimés.
          </p>
          <div className="flex flex-col gap-3">
            <input className="input" placeholder='Tape "DELETE" pour confirmer' value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <input className="input" placeholder="Mot de passe actuel" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} type="password" />
            <button
              onClick={handleDeleteAccount}
              disabled={loading || deleteConfirm !== 'DELETE'}
              className="w-full py-2.5 rounded-xl font-black text-sm transition-opacity"
              style={{ background: 'var(--red)', color: 'var(--white)', opacity: (loading || deleteConfirm !== 'DELETE') ? 0.5 : 1 }}
            >
              {loading ? '...' : '🗑️ Supprimer définitivement'}
            </button>
          </div>
        </Modal>
      )}

      {creatorModal && (
        <Modal title="⭐ Devenir Créateur" onClose={() => setCreatorModal(false)}>
          <p className="text-sm mb-4" style={{ color: 'var(--gray)' }}>
            Pour rejoindre le programme Créateur Gaming Actions, tu dois :<br /><br />
            <strong style={{ color: 'var(--white)' }}>1.</strong> Poster au moins <strong style={{ color: 'var(--gold)' }}>5 clips</strong> de qualité<br />
            <strong style={{ color: 'var(--white)' }}>2.</strong> Accumuler <strong style={{ color: 'var(--gold)' }}>100 followers</strong> sur ton profil<br />
            <strong style={{ color: 'var(--white)' }}>3.</strong> Nous contacter via le formulaire ci-dessous
          </p>
          <textarea
            className="input w-full resize-none"
            rows={4}
            placeholder="Présente-toi, dis-nous pourquoi tu veux devenir créateur GA..."
            value={creatorText}
            onChange={e => setCreatorText(e.target.value)}
            style={{ minHeight: '100px' }}
          />
          <button
            onClick={handleCreatorRequest}
            disabled={creatorLoading || !creatorText.trim()}
            className="btn-gold w-full py-2.5 mt-3"
            style={{ opacity: (!creatorText.trim() || creatorLoading) ? 0.5 : 1 }}
          >
            {creatorLoading ? '...' : 'Envoyer ma demande'}
          </button>
        </Modal>
      )}

      {bugModal && (
        <Modal title="🐛 Signaler un bug" onClose={() => setBugModal(false)}>
          <p className="text-sm mb-4" style={{ color: 'var(--gray)' }}>
            Décris le bug que tu as rencontré le plus précisément possible (étapes pour reproduire, appareil, etc.).
          </p>
          <textarea
            className="input w-full resize-none"
            rows={5}
            placeholder="Ex: Quand je clique sur 'Upload', l'app se ferme sur iPhone 14..."
            value={bugText}
            onChange={e => setBugText(e.target.value)}
            style={{ minHeight: '120px' }}
          />
          <button
            onClick={handleBugReport}
            disabled={bugLoading || !bugText.trim()}
            className="btn-gold w-full py-2.5 mt-3"
            style={{ opacity: (!bugText.trim() || bugLoading) ? 0.5 : 1 }}
          >
            {bugLoading ? '...' : 'Envoyer le rapport'}
          </button>
        </Modal>
      )}

      {uploadModal && (
        <Modal title="📹 Comment uploader un clip" onClose={() => setUploadModal(false)}>
          <div className="flex flex-col gap-4">
            {[
              { step: '1', title: 'Crée ton clip gaming', desc: 'Capture ton meilleur moment de jeu — victoire épique, skill shot, moment drôle... La durée max est de 60 secondes.' },
              { step: '2', title: 'Va dans Creator Studio', desc: 'Depuis ton profil, appuie sur le bouton "+" ou accède au Creator Studio via le menu principal.' },
              { step: '3', title: 'Upload et publie', desc: 'Sélectionne ton fichier vidéo, ajoute un titre accrocheur, choisis tes tags et ton jeu, puis appuie sur Publier !' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
                  {step}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--white)' }}>{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gray)' }}>{desc}</p>
                </div>
              </div>
            ))}
            <button onClick={() => { setUploadModal(false); router.push('/creator'); }} className="btn-gold w-full py-2.5 mt-1">
              Ouvrir Creator Studio
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
