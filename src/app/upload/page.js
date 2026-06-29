'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const GENRES = ['FPS', 'Sports', 'RPG', 'MOBA', 'Battle Royale', 'Racing', 'Fighting', 'Strategy', 'Action', 'Other'];
const CONSOLES = ['PS5', 'PS4', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch', 'PC', 'Mobile'];
const GAMES_BY_GENRE = {
  'FPS':          ['Call of Duty', 'Valorant', 'CS2', 'Overwatch 2', 'Rainbow Six Siege', 'Apex Legends', 'Warzone', 'Halo Infinite'],
  'Sports':       ['FIFA', 'EA FC 26', 'NBA 2K', 'PES', 'NHL', 'Madden', 'eFootball'],
  'RPG':          ['Elden Ring', 'God of War', 'Zelda', 'Pokémon', 'Final Fantasy XVI', 'Baldurs Gate 3', 'Starfield'],
  'MOBA':         ['League of Legends', 'Dota 2', 'Smite', 'Heroes of the Storm'],
  'Battle Royale':['Fortnite', 'Apex Legends', 'PUBG', 'Warzone', 'Fall Guys'],
  'Racing':       ['Rocket League', 'Gran Turismo 7', 'Forza Horizon 5', 'F1 24', 'Mario Kart'],
  'Fighting':     ['Street Fighter 6', 'Mortal Kombat 1', 'Tekken 8', 'Dragon Ball FighterZ'],
  'Strategy':     ['StarCraft II', 'Age of Empires IV', 'Clash Royale', 'Civilization VII'],
  'Action':       ['GTA V', 'Minecraft', 'Spider-Man 2', 'Hogwarts Legacy', 'Cyberpunk 2077'],
  'Other':        ['Autres'],
};
const CONTENT_TYPES_ALL = [
  { id: '', label: 'Clip Gaming', icon: '🎮', desc: 'Ton meilleur moment de jeu', color: 'var(--gold)' },
  { id: 'flashtuto', label: 'Flash Tuto', icon: '💡', desc: 'Astuce ou tutoriel rapide', color: 'var(--blue)' },
  { id: 'flashinfo', label: 'Flash Info', icon: '📰', desc: 'Actu gaming ou meta', color: 'var(--red)' },
  { id: 'gameindev', label: 'Game In Dev', icon: '⚙️', desc: 'Journal de dev ou révélation', color: '#7C4DFF' },
];
const CONTENT_TYPES_GAMER = [
  { id: '', label: 'Clip Gaming', icon: '🎮', desc: 'Ton meilleur moment de jeu', color: 'var(--gold)' },
];

const STEPS = ['Type', 'Vidéo', 'Infos', 'Publier'];

export default function UploadPage() {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isCreatorType = userProfile?.accountType === 'creator' || userProfile?.accountType === 'gameconic';
  const CONTENT_TYPES = isCreatorType ? CONTENT_TYPES_ALL : CONTENT_TYPES_GAMER;
  // Gamers skip the type step (only Clip Gaming available)
  const [step, setStep] = useState(isCreatorType ? 0 : 1);
  const [contentType, setContentType] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [hasFanbase, setHasFanbase] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', genre: 'FPS', game: '', console: '',
    isFanbaseExclusive: false,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !user) router.push('/auth');
  }, [mounted, user, router]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'fanbases', user.uid)).then(snap => setHasFanbase(snap.exists())).catch(() => {});
  }, [user]);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('video/')) { toast.error('Fichier vidéo requis (MP4, MOV, WebM)'); return; }
    if (f.size > 500 * 1024 * 1024) { toast.error('Vidéo trop volumineuse (max 500 MB)'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep(2);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handlePublish = async () => {
    if (!file || !user) return;
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    setStep(3); setUploading(true); setUploadPct(0);
    try {
      const path = `videos/${user.uid}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);
      const task = uploadBytesResumable(sRef, file);
      task.on('state_changed', snap => setUploadPct(Math.round(snap.bytesTransferred / snap.totalBytes * 100)));
      await task;
      const videoUrl = await getDownloadURL(sRef);
      await addDoc(collection(db, 'videos'), {
        userId: user.uid,
        username: userProfile?.username || '',
        userAvatar: userProfile?.avatarUrl || '',
        videoUrl,
        title: form.title.trim(),
        description: form.description.trim(),
        genre: form.genre,
        game: form.game,
        console: form.console,
        visibility: 'public',
        contentType,
        isFanbaseExclusive: form.isFanbaseExclusive,
        ggCount: 0, commentCount: 0, viewCount: 0,
        restricted: false, banned: false,
        createdAt: serverTimestamp(),
      });
      toast.success('Vidéo publiée ! 🎮');
      router.push('/creator');
    } catch (err) {
      toast.error('Erreur upload : ' + err.message);
      setStep(2);
    }
    setUploading(false);
  };

  if (!mounted || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888' }}><div style={{ fontSize: 32 }}>📤</div><p style={{ marginTop: 8 }}>Chargement...</p></div>
      </div>
    );
  }

  const selectedType = CONTENT_TYPES.find(ct => ct.id === contentType) || CONTENT_TYPES[0];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <button onClick={() => router.back()} style={{
          width: 36, height: 36, borderRadius: 10, border: '1px solid var(--gray3)',
          background: 'var(--card)', color: 'var(--gray)', cursor: 'pointer', fontSize: 18,
        }}>‹</button>
        <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)' }}>📤 Publier une vidéo</h1>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'initial' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 13,
                background: i < step ? 'var(--gold)' : i === step ? 'rgba(201,168,76,0.2)' : 'var(--card)',
                border: `2px solid ${i <= step ? 'var(--gold)' : 'var(--gray3)'}`,
                color: i < step ? '#000' : i === step ? 'var(--gold)' : 'var(--gray)',
              }}>{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize: 10, color: i === step ? 'var(--gold)' : 'var(--gray)', marginTop: 4, fontWeight: i === step ? 700 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? 'var(--gold)' : 'var(--gray3)', margin: '0 8px', marginBottom: 20 }} />
            )}
          </div>
        ))}
      </div>

      {/* STEP 0: Type de contenu */}
      {step === 0 && (
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 17, color: 'var(--white)', marginBottom: 6 }}>Quel type de contenu ?</h2>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 24 }}>Choisis le format qui correspond à ta vidéo.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {CONTENT_TYPES.map(ct => (
              <button key={ct.id} onClick={() => { setContentType(ct.id); setStep(1); }} style={{
                padding: 20, borderRadius: 14, border: `2px solid ${ct.color}30`,
                background: `${ct.color}08`, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = ct.color; e.currentTarget.style.background = ct.color + '18'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ct.color + '30'; e.currentTarget.style.background = ct.color + '08'; }}
              >
                <div style={{ fontSize: 30, marginBottom: 10 }}>{ct.icon}</div>
                <p style={{ fontWeight: 900, fontSize: 14, color: 'var(--white)', marginBottom: 4 }}>{ct.label}</p>
                <p style={{ fontSize: 11, color: 'var(--gray)' }}>{ct.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: Sélection vidéo */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: selectedType.color + '18', border: `1px solid ${selectedType.color}40`, fontSize: 12, fontWeight: 700, color: selectedType.color }}>
              {selectedType.icon} {selectedType.label}
            </div>
            <button onClick={() => setStep(0)} style={{ fontSize: 12, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Changer le type</button>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--gray3)'}`,
              borderRadius: 18, padding: 60, textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(201,168,76,0.05)' : 'var(--card)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
            <p style={{ fontWeight: 900, fontSize: 16, color: 'var(--white)', marginBottom: 8 }}>Glisse ta vidéo ici</p>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20 }}>ou clique pour parcourir tes fichiers</p>
            <div style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontWeight: 900, fontSize: 13, display: 'inline-block' }}>
              Choisir un fichier
            </div>
            <p style={{ fontSize: 11, color: 'var(--gray)', marginTop: 16 }}>MP4, MOV, WebM · Max 500 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {/* STEP 2: Métadonnées */}
      {step === 2 && (
        <div>
          {preview && (
            <div style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
              <video src={preview} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: '5px 12px', borderRadius: 20, background: selectedType.color + '18', border: `1px solid ${selectedType.color}40`, fontSize: 11, fontWeight: 700, color: selectedType.color }}>
              {selectedType.icon} {selectedType.label}
            </div>
            {file && <span style={{ fontSize: 12, color: 'var(--gray)' }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Titre *</label>
              <input className="input" placeholder="Nom de ta vidéo" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={80} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Genre</label>
                <select className="input" value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value, game: '' }))}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Console</label>
                <select className="input" value={form.console} onChange={e => setForm(p => ({ ...p, console: e.target.value }))}>
                  <option value="">Sélectionne</option>
                  {CONSOLES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Jeu</label>
                <select className="input" value={form.game} onChange={e => setForm(p => ({ ...p, game: e.target.value }))}>
                  <option value="">Sélectionne un jeu</option>
                  {(GAMES_BY_GENRE[form.genre] || []).map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description</label>
              <textarea className="input resize-none" style={{ height: 90 }} placeholder="Décris ta vidéo (optionnel)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={300} />
            </div>

            {hasFanbase && (
              <div onClick={() => setForm(p => ({ ...p, isFanbaseExclusive: !p.isFanbaseExclusive }))} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer',
                background: form.isFanbaseExclusive ? 'rgba(0,200,83,0.08)' : 'var(--card)',
                border: `1px solid ${form.isFanbaseExclusive ? 'rgba(0,200,83,0.35)' : 'var(--gray3)'}`,
                borderRadius: 12,
              }}>
                <span style={{ fontSize: 22 }}>{form.isFanbaseExclusive ? '🔒' : '🌍'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)' }}>Contenu Fanbase exclusif</p>
                  <p style={{ fontSize: 11, color: 'var(--gray)' }}>Visible uniquement par tes fans abonnés</p>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, border: `2px solid ${form.isFanbaseExclusive ? '#00C853' : 'var(--gray3)'}`,
                  background: form.isFanbaseExclusive ? '#00C853' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#000',
                }}>{form.isFanbaseExclusive ? '✓' : ''}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--gray3)',
              background: 'var(--card)', color: 'var(--gray)', fontWeight: 700, cursor: 'pointer',
            }}>← Retour</button>
            <button onClick={handlePublish} disabled={!form.title.trim()} className="btn-gold" style={{ flex: 2, padding: 14, fontWeight: 900, opacity: !form.title.trim() ? 0.5 : 1 }}>
              🚀 Publier la vidéo
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Upload en cours */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>{uploading ? '📤' : '✅'}</div>
          <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 12 }}>
            {uploading ? 'Upload en cours...' : 'Vidéo publiée !'}
          </h2>
          {uploading && (
            <>
              <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'var(--gray3)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 5, background: 'var(--gold)', width: `${uploadPct}%`, transition: 'width 0.3s' }} />
              </div>
              <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{uploadPct}%</p>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 8 }}>Ne ferme pas cette page...</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
