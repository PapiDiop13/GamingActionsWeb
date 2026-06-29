'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, orderBy, getDocs, doc, getDoc,
  addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp,
  onSnapshot, limit, increment,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const GENRES = ['FPS', 'Sports', 'RPG', 'MOBA', 'Battle Royale', 'Racing', 'Fighting', 'Strategy', 'Action', 'Other'];
const CONSOLES = ['PS5', 'PS4', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch', 'PC', 'Mobile'];
const POPULAR_GAMES = [
  'Call of Duty', 'Fortnite', 'Apex Legends', 'Valorant', 'FIFA', 'EA FC 26',
  'NBA 2K', 'Rocket League', 'Minecraft', 'GTA V', 'Warzone', 'CS2', 'Overwatch 2', 'Elden Ring',
];
const CONTENT_TYPES = [
  { id: '', label: 'Clip Gaming', color: 'var(--gold)' },
  { id: 'flashtuto', label: 'Flash Tuto', color: 'var(--blue)' },
  { id: 'flashinfo', label: 'Flash Info', color: 'var(--red)' },
  { id: 'gameindev', label: 'Game In Dev', color: '#7C4DFF' },
];
const TABS = ['Overview', 'Mes Vidéos', 'Fanbase', 'FanBox', 'Publier'];
const FANBASE_TABS = ['Overview', 'Fans', 'Exclusif', 'Paramètres'];

const EMPTY_UPLOAD = {
  title: '', description: '', genre: 'FPS', game: '', console: '',
  visibility: 'public', isFanbaseExclusive: false, contentType: '',
};

function fmt(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR');
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '18px 0', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 24, color: color || 'var(--gold)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function CreatorPage() {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [fanbaseTab, setFanbaseTab] = useState('Overview');
  const [videos, setVideos] = useState([]);
  const [fanbase, setFanbase] = useState(null);
  const [fans, setFans] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [stats, setStats] = useState({ totalGGs: 0, totalVideos: 0, subscribers: 0 });
  const [loading, setLoading] = useState(true);
  const [fbForm, setFbForm] = useState({ name: '', description: '' });
  const [fbSettings, setFbSettings] = useState({ name: '', description: '', isActive: true });
  const [creatingFb, setCreatingFb] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD);
  const chatEndRef = useRef(null);
  const chatUnsub = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !user) router.push('/auth');
  }, [mounted, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(query(collection(db, 'videos'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))),
      getDoc(doc(db, 'fanbases', user.uid)),
    ]).then(([videosSnap, fanbaseSnap]) => {
      const vids = videosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVideos(vids);
      const totalGGs = vids.reduce((acc, v) => acc + (v.ggCount || 0), 0);
      if (fanbaseSnap.exists()) {
        const fb = { id: fanbaseSnap.id, ...fanbaseSnap.data() };
        setFanbase(fb);
        setFbSettings({ name: fb.name || '', description: fb.description || '', isActive: fb.isActive !== false });
        setStats({ totalGGs, totalVideos: vids.length, subscribers: fb.subscriberCount || 0 });
        // Load fans
        getDocs(query(collection(db, 'fanbase_subscriptions'), where('creatorId', '==', user.uid))).then(snap => {
          setFans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }).catch(() => {});
      } else {
        setStats({ totalGGs, totalVideos: vids.length, subscribers: 0 });
      }
    }).catch(e => console.error(e)).finally(() => setLoading(false));
  }, [user]);

  // FanBox real-time listener
  useEffect(() => {
    if (tab !== 'FanBox' || !user) return;
    if (chatUnsub.current) chatUnsub.current();
    try {
      const q = query(
        collection(db, 'fanbox_messages', user.uid, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(60),
      );
      chatUnsub.current = onSnapshot(q, snap => {
        setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, () => {});
    } catch {}
    return () => { if (chatUnsub.current) chatUnsub.current(); };
  }, [tab, user]);

  const sendChat = async () => {
    if (!chatText.trim() || !user) return;
    const text = chatText.trim();
    setChatText('');
    try {
      await addDoc(collection(db, 'fanbox_messages', user.uid, 'messages'), {
        userId: user.uid,
        username: userProfile?.username || 'Creator',
        avatar: userProfile?.avatarUrl || '',
        text,
        createdAt: serverTimestamp(),
        isCreator: true,
      });
    } catch { toast.error('Erreur envoi message'); }
  };

  const createFanbase = async () => {
    if (!fbForm.name.trim()) { toast.error('Donne un nom à ta fanbase'); return; }
    setCreatingFb(true);
    try {
      await setDoc(doc(db, 'fanbases', user.uid), {
        creatorId: user.uid,
        name: fbForm.name.trim(),
        description: fbForm.description.trim(),
        subscriberCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', user.uid), { hasFanbase: true, fanbaseName: fbForm.name.trim() });
      const fb = { creatorId: user.uid, name: fbForm.name.trim(), description: fbForm.description.trim(), subscriberCount: 0, isActive: true };
      setFanbase(fb);
      setFbSettings({ name: fb.name, description: fb.description, isActive: true });
      toast.success('Fanbase créée ! 🎉');
    } catch { toast.error('Erreur création fanbase'); }
    setCreatingFb(false);
  };

  const kickFan = async (fan) => {
    if (!confirm(`Exclure ${fan.subscriberUsername} de ta fanbase ?`)) return;
    try {
      await deleteDoc(doc(db, 'fanbase_subscriptions', fan.id));
      await updateDoc(doc(db, 'fanbases', user.uid), { subscriberCount: increment(-1) });
      setFans(prev => prev.filter(f => f.id !== fan.id));
      setFanbase(prev => prev ? { ...prev, subscriberCount: (prev.subscriberCount || 1) - 1 } : prev);
      toast.success('Fan exclu');
    } catch { toast.error('Erreur'); }
  };

  const saveFbSettings = async () => {
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, 'fanbases', user.uid), {
        name: fbSettings.name.trim(),
        description: fbSettings.description.trim(),
        isActive: fbSettings.isActive,
      });
      setFanbase(prev => ({ ...prev, ...fbSettings }));
      toast.success('Paramètres sauvegardés');
    } catch { toast.error('Erreur'); }
    setSavingSettings(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!uploadForm.title.trim()) { toast.error('Titre requis'); return; }
    setUploading(true); setUploadPct(0);
    try {
      const path = `videos/${user.uid}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);
      const task = uploadBytesResumable(sRef, file);
      task.on('state_changed', snap => setUploadPct(Math.round(snap.bytesTransferred / snap.totalBytes * 100)));
      await task;
      const videoUrl = await getDownloadURL(sRef);
      const newDoc = await addDoc(collection(db, 'videos'), {
        userId: user.uid,
        username: userProfile?.username || '',
        userAvatar: userProfile?.avatarUrl || '',
        videoUrl,
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        genre: uploadForm.genre,
        game: uploadForm.game,
        console: uploadForm.console,
        visibility: uploadForm.visibility,
        contentType: uploadForm.contentType,
        isFanbaseExclusive: uploadForm.isFanbaseExclusive,
        ggCount: 0, commentCount: 0, viewCount: 0,
        restricted: false, banned: false,
        createdAt: serverTimestamp(),
      });
      const v = { id: newDoc.id, ...uploadForm, userId: user.uid, ggCount: 0, viewCount: 0 };
      setVideos(prev => [v, ...prev]);
      setStats(s => ({ ...s, totalVideos: s.totalVideos + 1 }));
      setUploadForm(EMPTY_UPLOAD);
      toast.success('Vidéo publiée ! 🎮');
    } catch (err) {
      toast.error('Erreur upload: ' + err.message);
    }
    setUploading(false);
  };

  const deleteVideo = async (id) => {
    if (!confirm('Supprimer cette vidéo ?')) return;
    await deleteDoc(doc(db, 'videos', id));
    setVideos(prev => prev.filter(v => v.id !== id));
    toast.success('Vidéo supprimée');
  };

  if (!mounted || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
          <p style={{ fontSize: 13 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const isLegendary = userProfile?.isLegendary || userProfile?.plan === 'legendary';
  const weekLimit = isLegendary ? 50 : 20;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
  const weekVideos = videos.filter(v => v.createdAt?.toDate?.() >= weekStart).length;
  const exclusiveVideos = videos.filter(v => v.isFanbaseExclusive);

  const TabBtn = ({ t }) => (
    <button onClick={() => setTab(t)} style={{
      padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      background: 'transparent', border: 'none',
      color: tab === t ? 'var(--white)' : 'var(--gray)',
      borderBottom: `2px solid ${tab === t ? 'var(--gold)' : 'transparent'}`,
      marginBottom: -1, transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{t}</button>
  );

  const FbTabBtn = ({ t }) => (
    <button onClick={() => setFanbaseTab(t)} style={{
      padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
      background: fanbaseTab === t ? 'rgba(201,168,76,0.12)' : 'transparent',
      border: `1px solid ${fanbaseTab === t ? 'rgba(201,168,76,0.4)' : 'var(--gray3)'}`,
      borderRadius: 20, color: fanbaseTab === t ? 'var(--gold)' : 'var(--gray)',
      transition: 'all 0.15s', marginRight: 8,
    }}>{t}</button>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 16px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: userProfile?.avatarUrl ? 'transparent' : 'rgba(201,168,76,0.15)',
          border: '2px solid var(--gold)', overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 22, color: 'var(--gold)',
        }}>
          {userProfile?.avatarUrl
            ? <img src={userProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (userProfile?.username || 'U')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 2 }}>🎬 Creator Studio</h1>
          <p style={{ fontSize: 13, color: 'var(--gray)' }}>
            Bienvenue, <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{userProfile?.username}</span>
          </p>
        </div>
        <Link href="/upload" className="btn-gold" style={{ fontSize: 13, padding: '10px 18px', textDecoration: 'none', borderRadius: 10, fontWeight: 700 }}>
          + Publier
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray3)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => <TabBtn key={t} t={t} />)}
      </div>

      {/* ─── OVERVIEW ─── */}
      {tab === 'Overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard icon="⚡" label="GGs totaux" value={stats.totalGGs.toLocaleString()} />
            <StatCard icon="🎬" label="Vidéos" value={stats.totalVideos} />
            <StatCard icon="👥" label="Fans Fanbase" value={fanbase?.subscriberCount || 0} color="#00C853" />
          </div>

          {/* Weekly quota */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Quota hebdomadaire</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold)' }}>{weekVideos} / {weekLimit}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--gray3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--gold)', width: `${Math.min(weekVideos / weekLimit * 100, 100)}%`, transition: 'width 0.3s' }} />
            </div>
            {!isLegendary && (
              <p style={{ fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
                Passe <Link href="/subscription" style={{ color: 'var(--gold)', fontWeight: 700 }}>Legendary</Link> pour 50 vidéos/semaine
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '📤', label: 'Publier une vidéo', desc: 'Uploader un nouveau clip ou tuto', action: () => router.push('/upload') },
              { icon: '👥', label: 'Gérer la Fanbase', desc: fanbase ? `${fanbase.subscriberCount || 0} fans actifs` : 'Créer ta fanbase', action: () => setTab('Fanbase') },
              { icon: '💬', label: 'FanBox Chat', desc: 'Parler avec ta communauté', action: () => setTab('FanBox') },
              { icon: '📊', label: 'Mes Vidéos', desc: `${videos.length} vidéos publiées`, action: () => setTab('Mes Vidéos') },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                background: 'var(--card)', border: '1px solid var(--gray3)',
                borderRadius: 14, padding: 18, textAlign: 'left', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray3)'}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── MES VIDÉOS ─── */}
      {tab === 'Mes Vidéos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 900, fontSize: 15, color: 'var(--white)' }}>Mes vidéos ({videos.length})</h3>
            <Link href="/upload" className="btn-gold" style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none', borderRadius: 8, fontWeight: 700 }}>+ Publier</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 72, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--gray3)', opacity: 0.5 }} />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Aucune vidéo publiée</p>
              <Link href="/upload" className="btn-gold" style={{ display: 'inline-block', marginTop: 8, padding: '10px 20px', fontSize: 13, textDecoration: 'none', borderRadius: 10 }}>Publier ma première vidéo</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {videos.map(v => (
                <div key={v.id} style={{
                  background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 12,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 80, height: 54, borderRadius: 8, background: 'var(--gray3)',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, overflow: 'hidden',
                  }}>
                    {v.thumbnail
                      ? <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                      : '🎬'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--gray)' }}>
                      <span>⚡ {v.ggCount || 0} GG</span>
                      <span>👁 {v.viewCount || 0}</span>
                      <span>💬 {v.commentCount || 0}</span>
                      {v.isFanbaseExclusive && <span style={{ color: '#00C853' }}>🔒 Exclusif</span>}
                      {v.contentType && <span style={{ color: 'var(--blue)' }}>{v.contentType}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link href={`/video/${v.id}`} style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: 'rgba(255,255,255,0.06)', color: 'var(--gray)',
                      border: '1px solid var(--gray3)', textDecoration: 'none',
                    }}>Voir</Link>
                    <button onClick={() => deleteVideo(v.id)} style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: 'rgba(255,45,85,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(255,45,85,0.2)', cursor: 'pointer',
                    }}>Suppr.</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FANBASE ─── */}
      {tab === 'Fanbase' && (
        <div>
          {!fanbase ? (
            /* Create fanbase */
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 8 }}>Crée ta Fanbase</h2>
                <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
                  Ouvre l'accès à du contenu exclusif pour tes fans les plus dévoués. Gratuit pendant la phase de lancement.
                </p>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 16, padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Nom de la fanbase *</label>
                  <input className="input" placeholder="ex: The FLAME Squad" value={fbForm.name} onChange={e => setFbForm(p => ({ ...p, name: e.target.value }))} maxLength={40} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description</label>
                  <textarea className="input resize-none" style={{ height: 90 }} placeholder="Décris ce que tes fans vont recevoir..." value={fbForm.description} onChange={e => setFbForm(p => ({ ...p, description: e.target.value }))} maxLength={200} />
                </div>
                <button onClick={createFanbase} disabled={creatingFb} className="btn-gold" style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 900, opacity: creatingFb ? 0.7 : 1 }}>
                  {creatingFb ? 'Création...' : '🚀 Ouvrir ma Fanbase'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--gray)', textAlign: 'center', marginTop: 10 }}>Gratuit pendant la phase de lancement ✨</p>
              </div>
            </div>
          ) : (
            /* Manage fanbase */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '16px', background: 'var(--card)', borderRadius: 12, border: '1px solid rgba(0,200,83,0.2)' }}>
                <div style={{ fontSize: 28 }}>👥</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 900, fontSize: 16, color: 'var(--white)' }}>{fanbase.name}</p>
                  <p style={{ fontSize: 12, color: '#00C853' }}>{fanbase.subscriberCount || 0} fans · {fanbase.isActive !== false ? 'Active' : 'Inactive'}</p>
                </div>
                <Link href={`/fanbase/${user.uid}`} style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', fontWeight: 700 }}>Page publique →</Link>
              </div>

              {/* Fanbase sub-tabs */}
              <div style={{ display: 'flex', marginBottom: 20, flexWrap: 'wrap', gap: 4 }}>
                {FANBASE_TABS.map(t => <FbTabBtn key={t} t={t} />)}
              </div>

              {/* Overview */}
              {fanbaseTab === 'Overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                    <StatCard icon="👥" label="Fans" value={fanbase.subscriberCount || 0} color="#00C853" />
                    <StatCard icon="🔒" label="Vidéos exclusives" value={exclusiveVideos.length} color="#7C4DFF" />
                    <StatCard icon="💰" label="Revenus" value="$0.00" color="var(--gray)" />
                  </div>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 12, padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 6 }}>{fanbase.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6 }}>{fanbase.description || 'Aucune description.'}</p>
                  </div>
                </div>
              )}

              {/* Fans list */}
              {fanbaseTab === 'Fans' && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>{fans.length} membres</p>
                  {fans.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray)' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                      <p>Aucun fan pour l'instant. Partage ton lien Fanbase !</p>
                    </div>
                  ) : fans.map(fan => (
                    <div key={fan.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--card)', border: '1px solid var(--gray3)',
                      borderRadius: 12, padding: '12px 16px', marginBottom: 8,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(201,168,76,0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 16, color: 'var(--gold)',
                      }}>
                        {fan.subscriberAvatar
                          ? <img src={fan.subscriberAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          : (fan.subscriberUsername || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>{fan.subscriberUsername || 'Utilisateur'}</p>
                        <p style={{ fontSize: 11, color: 'var(--gray)' }}>Abonné depuis {fmt(fan.joinedAt)}</p>
                      </div>
                      <button onClick={() => kickFan(fan)} style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: 'rgba(255,45,85,0.1)', color: 'var(--red)',
                        border: '1px solid rgba(255,45,85,0.2)', cursor: 'pointer',
                      }}>Exclure</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Exclusive videos */}
              {fanbaseTab === 'Exclusif' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--gray)' }}>{exclusiveVideos.length} vidéos exclusives</p>
                    <Link href="/upload" className="btn-gold" style={{ fontSize: 12, padding: '7px 14px', textDecoration: 'none', borderRadius: 8, fontWeight: 700 }}>+ Ajouter</Link>
                  </div>
                  {exclusiveVideos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray)' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
                      <p>Aucun contenu exclusif. Publie une vidéo marquée "Fanbase exclusif".</p>
                    </div>
                  ) : exclusiveVideos.map(v => (
                    <div key={v.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--card)', border: '1px solid rgba(0,200,83,0.15)',
                      borderRadius: 12, padding: '12px 16px', marginBottom: 8,
                      borderLeft: '3px solid #00C853',
                    }}>
                      <div style={{ width: 60, height: 40, borderRadius: 6, background: 'var(--gray3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎬</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                        <p style={{ fontSize: 11, color: '#00C853' }}>🔒 Exclusif · {v.contentType || 'clip'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Settings */}
              {fanbaseTab === 'Paramètres' && (
                <div style={{ maxWidth: 480 }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Nom</label>
                    <input className="input" value={fbSettings.name} onChange={e => setFbSettings(p => ({ ...p, name: e.target.value }))} maxLength={40} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description</label>
                    <textarea className="input resize-none" style={{ height: 90 }} value={fbSettings.description} onChange={e => setFbSettings(p => ({ ...p, description: e.target.value }))} maxLength={200} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 14, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--gray3)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', flex: 1 }}>Fanbase active</span>
                    <button onClick={() => setFbSettings(p => ({ ...p, isActive: !p.isActive }))} style={{
                      width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                      background: fbSettings.isActive ? '#00C853' : 'var(--gray3)', transition: 'background 0.2s',
                      position: 'relative',
                    }}>
                      <span style={{
                        position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                        background: 'white', transition: 'left 0.2s',
                        left: fbSettings.isActive ? 25 : 4,
                      }} />
                    </button>
                  </div>
                  <button onClick={saveFbSettings} disabled={savingSettings} className="btn-gold" style={{ width: '100%', padding: 13, fontWeight: 900, opacity: savingSettings ? 0.7 : 1 }}>
                    {savingSettings ? 'Sauvegarde...' : '✅ Sauvegarder'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── FANBOX ─── */}
      {tab === 'FanBox' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 200px)', background: '#071A0E', borderRadius: 16, border: '1px solid rgba(0,200,83,0.2)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,200,83,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            <div>
              <p style={{ fontWeight: 900, fontSize: 15, color: 'var(--white)' }}>FanBox Chat</p>
              <p style={{ fontSize: 11, color: '#00C853' }}>{fanbase?.subscriberCount || 0} fans</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: 40, fontSize: 13 }}>
                Aucun message pour l'instant. Dis bonjour à ta communauté ! 👋
              </div>
            )}
            {chatMessages.map(msg => {
              const isMe = msg.userId === user.uid;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {!isMe && (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900, color: 'var(--white)',
                    }}>
                      {(msg.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ maxWidth: '70%' }}>
                    {!isMe && <p style={{ fontSize: 10, color: msg.isCreator ? '#C9A84C' : '#00C853', fontWeight: 700, marginBottom: 3 }}>{msg.username}{msg.isCreator ? ' 👑' : ''}</p>}
                    <div style={{
                      padding: '8px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe ? '#00C853' : 'rgba(255,255,255,0.08)',
                      color: isMe ? '#000' : 'var(--white)',
                      fontSize: 13, fontWeight: 500, lineHeight: 1.5,
                    }}>{msg.text}</div>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,200,83,0.15)', display: 'flex', gap: 10 }}>
            <input
              className="input"
              style={{ flex: 1, background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.2)' }}
              placeholder="Message à ta fanbase..."
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              maxLength={500}
            />
            <button onClick={sendChat} disabled={!chatText.trim()} style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: '#00C853', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, opacity: chatText.trim() ? 1 : 0.4,
            }}>➤</button>
          </div>
        </div>
      )}

      {/* ─── PUBLIER ─── */}
      {tab === 'Publier' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 900, fontSize: 16, color: 'var(--white)' }}>📤 Publier une vidéo</h3>
            <Link href="/upload" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>Page dédiée →</Link>
          </div>

          {/* Content type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Type de contenu</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {CONTENT_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setUploadForm(p => ({ ...p, contentType: ct.id }))} style={{
                  padding: '10px 8px', borderRadius: 10, border: `1px solid ${uploadForm.contentType === ct.id ? ct.color : 'var(--gray3)'}`,
                  background: uploadForm.contentType === ct.id ? ct.color + '18' : 'var(--card)',
                  color: uploadForm.contentType === ct.id ? ct.color : 'var(--gray)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, textAlign: 'center',
                }}>{ct.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input className="input" placeholder="Titre *" value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
            <select className="input" value={uploadForm.genre} onChange={e => setUploadForm(p => ({ ...p, genre: e.target.value }))}>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
            <select className="input" value={uploadForm.console} onChange={e => setUploadForm(p => ({ ...p, console: e.target.value }))}>
              <option value="">Console / plateforme</option>
              {CONSOLES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" value={uploadForm.game} onChange={e => setUploadForm(p => ({ ...p, game: e.target.value }))}>
              <option value="">Jeu (optionnel)</option>
              {POPULAR_GAMES.map(g => <option key={g}>{g}</option>)}
            </select>
            <select className="input" value={uploadForm.visibility} onChange={e => setUploadForm(p => ({ ...p, visibility: e.target.value }))}>
              <option value="public">🌍 Public</option>
              <option value="followers">👥 Abonnés</option>
              <option value="private">🔒 Privé</option>
            </select>
          </div>
          <textarea className="input resize-none" style={{ height: 80, width: '100%', marginBottom: 12 }} placeholder="Description (optionnel)" value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} />

          {fanbase && (
            <div onClick={() => setUploadForm(p => ({ ...p, isFanbaseExclusive: !p.isFanbaseExclusive }))} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 16,
              background: uploadForm.isFanbaseExclusive ? 'rgba(0,200,83,0.08)' : 'var(--card)',
              border: `1px solid ${uploadForm.isFanbaseExclusive ? 'rgba(0,200,83,0.3)' : 'var(--gray3)'}`,
              borderRadius: 12, cursor: 'pointer',
            }}>
              <span style={{ fontSize: 18 }}>{uploadForm.isFanbaseExclusive ? '🔒' : '🌍'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)' }}>Contenu Fanbase exclusif</p>
                <p style={{ fontSize: 11, color: 'var(--gray)' }}>Réservé aux fans abonnés uniquement</p>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: 6, border: `1px solid ${uploadForm.isFanbaseExclusive ? '#00C853' : 'var(--gray3)'}`,
                background: uploadForm.isFanbaseExclusive ? '#00C853' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 14,
              }}>{uploadForm.isFanbaseExclusive ? '✓' : ''}</div>
            </div>
          )}

          {uploading ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--white)' }}>Upload en cours...</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold)' }}>{uploadPct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--gray3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: 'var(--gold)', width: `${uploadPct}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          ) : (
            <label style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{
                border: '2px dashed var(--gray3)', borderRadius: 14, padding: 32, textAlign: 'center',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray3)'}
              >
                <p style={{ fontSize: 40, marginBottom: 8 }}>🎬</p>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>Clique pour sélectionner une vidéo</p>
                <p style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>MP4, MOV, WebM · Max 500 MB</p>
              </div>
              <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
