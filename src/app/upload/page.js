'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import { VIDEO_FRAMES } from '@/lib/frames';
import { GAMES } from '@/lib/games';
import toast from 'react-hot-toast';

const CF_BASE = 'https://us-central1-gamingactions-app.cloudfunctions.net';

// ─── Genres + games (aligné avec le mobile : GENRES_WITH_GAMES) ───
const GENRES_WITH_GAMES = [
  { id: 'all',          label: 'All Games',          icon: '🎮', games: GAMES.map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'fps',          label: 'FPS',                icon: '🎯', games: GAMES.filter(g => g.genre === 'fps').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'sports',       label: 'Sports',             icon: '⚽', games: GAMES.filter(g => g.genre === 'sports').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'battle_royale',label: 'Battle Royale',      icon: '🏆', games: GAMES.filter(g => g.genre === 'battle_royale').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'action',       label: 'Action / Adventure', icon: '💥', games: GAMES.filter(g => g.genre === 'action').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'rpg',          label: 'RPG',                icon: '⚔️', games: GAMES.filter(g => g.genre === 'rpg').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'fighting',     label: 'Fighting',           icon: '🥊', games: GAMES.filter(g => g.genre === 'fighting').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'moba',         label: 'MOBA / Strategy',    icon: '🧙', games: GAMES.filter(g => g.genre === 'moba').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'racing',       label: 'Racing',             icon: '🏎️', games: GAMES.filter(g => g.genre === 'racing').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'horror',       label: 'Horror',             icon: '👻', games: GAMES.filter(g => g.genre === 'horror').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'simulation',   label: 'Simulation / Sandbox', icon: '🏗️', games: GAMES.filter(g => g.genre === 'simulation').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
  { id: 'other',        label: 'Other',              icon: '🕹️', games: GAMES.filter(g => g.genre === 'other').map(g => g.name).sort((a, b) => a.localeCompare(b)) },
];

// Consoles (aligné avec le mobile)
const CONSOLES = [
  { id: 'ps5', label: 'PS5' },
  { id: 'ps4', label: 'PS4' },
  { id: 'xbox', label: 'Xbox' },
  { id: 'pc', label: 'PC' },
  { id: 'switch', label: 'Switch' },
  { id: 'mobile', label: 'Mobile' },
];

const CONTENT_TYPES_ALL = [
  { id: 'clip',      label: 'Gaming Clip', icon: '🎮', desc: "Share your best gameplay moments. Get GG'd by the community.", color: 'var(--gold)' },
  { id: 'flashtuto', label: 'FlashTuto',   icon: '💡', desc: 'Short tutorial or tip to help other gamers improve.', color: 'var(--blue)' },
  { id: 'flashinfo', label: 'FlashInfo',   icon: '📰', desc: 'Gaming news, meta updates, patch notes breakdown.', color: 'var(--red)' },
  { id: 'gameindev', label: 'GameInDev',   icon: '⚙️', desc: 'Dev diary or reveal for a game you are building.', color: '#7C4DFF' },
];
const CONTENT_TYPES_GAMER = [
  { id: 'clip', label: 'Gaming Clip', icon: '🎮', desc: "Share your best gameplay moments. Get GG'd by the community.", color: 'var(--gold)' },
];

const STEPS = ['Type', 'Vidéo', 'Infos', 'Publier'];

export default function UploadPage() {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isCreatorType = userProfile?.accountType === 'creator' || userProfile?.accountType === 'gameconic';
  const CONTENT_TYPES = isCreatorType ? CONTENT_TYPES_ALL : CONTENT_TYPES_GAMER;
  // Gamers skip the type step (only Gaming Clip available)
  const [step, setStep] = useState(isCreatorType ? 0 : 1);
  const [contentType, setContentType] = useState('clip');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [hasFanbase, setHasFanbase] = useState(false);
  const [gameSearch, setGameSearch] = useState('');
  const [customGame, setCustomGame] = useState('');
  const [showCustomGame, setShowCustomGame] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', genre: 'all', game: '', console: '',
    isFanbaseExclusive: false,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [videoFrame, setVideoFrame] = useState('none');
  const fileRef = useRef(null);

  const userPlan = userProfile?.plan || 'free';
  const availableVideoFrames = VIDEO_FRAMES.filter(f => !f.exclusive && (
    f.free ||
    (userProfile?.ownedVideoFrames || []).includes(f.id) ||
    (userPlan === 'legendary' && f.category !== 'theme' && (Number(f.dollarsPrice || 0) > 0 ? Number(f.dollarsPrice) <= 1.49 : Number(f.pointsPrice || 0) > 0))
  ));
  // Droits + cover
  const [agreedRights, setAgreedRights] = useState(false);
  const [showRightsModal, setShowRightsModal] = useState(false);
  const [thumbTime, setThumbTime] = useState(0);
  const [vidDuration, setVidDuration] = useState(0);
  const [customThumbUrl, setCustomThumbUrl] = useState(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const videoRef = useRef(null);
  const coverFileRef = useRef(null);

  const handleSeek = (t) => {
    setThumbTime(t);
    if (videoRef.current) { try { videoRef.current.currentTime = t; } catch (e) {} }
  };
  const handlePickCover = async (f) => {
    if (!f || !user) return;
    setThumbUploading(true);
    try {
      const r = storageRef(storage, `covers/${user.uid}_${Date.now()}`);
      await uploadBytes(r, f);
      const url = await getDownloadURL(r);
      setCustomThumbUrl(url);
    } catch (e) { toast.error('Cover upload failed'); }
    setThumbUploading(false);
  };

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
    const game = showCustomGame ? customGame.trim() : form.game;
    if (!file || !user) return;
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    if (!game) { toast.error('Please select or enter a game.'); return; }
    if (!form.console) { toast.error('Please select your console.'); return; }
    if (!agreedRights) { toast.error('Please confirm the content-rights checkbox first.'); return; }
    setStep(3); setUploading(true); setUploadPct(0);
    try {
      // ── 1. Obtenir l'URL d'upload Mux ──────────────────────────────────
      const urlRes = await fetch(`${CF_BASE}/muxGetUploadUrl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      if (!urlRes.ok) throw new Error("Impossible d'obtenir l'URL Mux : " + urlRes.status);
      const { uploadUrl, uploadId } = await urlRes.json();
      if (!uploadUrl) throw new Error('uploadUrl manquant dans la réponse Mux');

      // ── 2. PUT binaire vers Mux avec progression (XHR) ─────────────────
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('Mux upload failed: ' + xhr.status));
        };
        xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'upload Mux'));
        xhr.send(file);
      });

      // ── 3. Doc Firestore — muxPlaybackId sera rempli par le webhook ─────
      await addDoc(collection(db, 'videos'), {
        userId: user.uid,
        username: userProfile?.username || '',
        userAvatar: userProfile?.avatarUrl || userProfile?.avatar || '',
        title: form.title.trim(),
        description: form.description.trim(),
        genre: form.genre,
        game,
        console: form.console,
        visibility: 'public',
        contentType,
        isFanbaseExclusive: form.isFanbaseExclusive,
        videoFrame,
        isLegendaryFrame: videoFrame !== 'none',
        hashtags: [...new Set(((form.title + ' ' + form.description).toLowerCase().match(/#(\w+)/g) || []).map(h => h.slice(1)))],
        videoUrl: null,
        thumbnail: customThumbUrl || null,
        thumbnailTime: customThumbUrl ? null : (thumbTime ? Math.round(thumbTime * 10) / 10 : null),
        publicId: uploadId,
        muxUploadId: uploadId,
        muxPlaybackId: null,
        muxStatus: 'processing',
        ggCount: 0, commentCount: 0, viewCount: 0,
        restricted: false, banned: false,
        platform: 'web',
        createdAt: serverTimestamp(),
      });

      setUploading(false);
      toast.success('🎮 Vidéo envoyée à Mux ! Elle apparaîtra dans le feed dans quelques minutes.');
    } catch (err) {
      toast.error('Erreur upload : ' + err.message);
      setStep(2);
      setUploading(false);
    }
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
        <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)' }}>{contentType === 'clip' ? 'Clip Details' : contentType === 'flashtuto' ? 'FlashTuto Details' : contentType === 'flashinfo' ? 'FlashInfo Details' : 'GameInDev Details'}</h1>
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
            <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
              <video ref={videoRef} src={preview} controls
                onLoadedMetadata={(e) => setVidDuration(e.currentTarget.duration || 0)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}

          {/* Cover / thumbnail — aligned with mobile coverSection */}
          {preview && (
            <div style={{ marginBottom: 22, padding: 14, background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Cover</p>
              <p style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 12, lineHeight: 1.4 }}>Drag the bar to pick a frame from your clip, or upload your own image.</p>
              {customThumbUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={customThumbUrl} alt="cover" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 8, background: 'var(--gray3)' }} />
                  <button onClick={() => setCustomThumbUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Remove custom cover</button>
                </div>
              ) : (
                <div style={{ position: 'relative', height: 26 }}>
                  <input type="range" min={0} max={vidDuration || 0} step={0.1} value={thumbTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--gold)', height: 26, cursor: 'pointer' }} />
                </div>
              )}
              <button onClick={() => coverFileRef.current?.click()} disabled={thumbUploading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #C9A84C50', background: 'transparent', color: 'var(--gold)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <span>🖼️</span>{thumbUploading ? 'Uploading…' : 'Upload custom cover'}
              </button>
              <input ref={coverFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePickCover(e.target.files?.[0])} />
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
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Title *</label>
              <input className="input" placeholder="Give your clip a title..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={80} />
            </div>

            {/* Genre (drives the game list, aligné avec le mobile) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Genre</label>
              <select className="input" value={form.genre}
                onChange={e => { setForm(p => ({ ...p, genre: e.target.value, game: '' })); setGameSearch(''); setShowCustomGame(false); setCustomGame(''); }}
                style={{ width: '100%' }}>
                {GENRES_WITH_GAMES.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
              </select>
            </div>

            {/* Game — searchable list + "my game is not listed" (aligné avec le mobile) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Game *</label>
              <input className="input" placeholder="Search game..." value={gameSearch}
                onChange={e => setGameSearch(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
              {!showCustomGame && (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--gray3)', borderRadius: 10, background: 'var(--card)' }}>
                  {(GENRES_WITH_GAMES.find(g => g.id === form.genre)?.games || [])
                    .filter(g => gameSearch.length === 0 || g.toLowerCase().includes(gameSearch.toLowerCase()))
                    .map((g, i) => (
                      <div key={`${g}_${i}`} onClick={() => setForm(p => ({ ...p, game: g }))}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                          color: form.game === g ? 'var(--gold)' : 'var(--white)',
                          background: form.game === g ? 'rgba(201,168,76,0.1)' : 'transparent',
                          borderBottom: '0.5px solid var(--gray3)',
                        }}>
                        🎮 {g}{form.game === g ? '  ✓' : ''}
                      </div>
                    ))}
                </div>
              )}
              <div onClick={() => { setShowCustomGame(v => !v); if (!showCustomGame) setForm(p => ({ ...p, game: '' })); }}
                style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.06)', color: 'var(--gold)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ＋ My game is not listed
              </div>
              {showCustomGame && (
                <input className="input" placeholder="Enter game name..." value={customGame}
                  onChange={e => setCustomGame(e.target.value)} style={{ width: '100%', marginTop: 8 }} autoFocus />
              )}
            </div>

            {/* Console — chips (aligné avec le mobile) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Console *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CONSOLES.map(c => (
                  <button key={c.id} type="button" onClick={() => setForm(p => ({ ...p, console: c.id }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 20,
                      background: form.console === c.id ? 'rgba(201,168,76,0.15)' : 'var(--card)',
                      border: `1px solid ${form.console === c.id ? 'var(--gold)' : 'var(--gray3)'}`,
                      color: form.console === c.id ? 'var(--gold)' : 'var(--gray)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description</label>
              <textarea className="input resize-none" style={{ height: 90 }} placeholder="Describe your content... use #hashtags" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={300} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Video Frame 🎬</label>
              <select className="input" value={videoFrame} onChange={e => setVideoFrame(e.target.value)} style={{ width: '100%' }}>
                {availableVideoFrames.map(f => (
                  <option key={f.id} value={f.id}>{f.name}{f.id !== 'none' && !f.free && !(userProfile?.ownedVideoFrames || []).includes(f.id) ? ' 👑' : ''}</option>
                ))}
              </select>
              <p style={{ fontSize: 10, color: 'var(--gray)', marginTop: 6, lineHeight: 1.4 }}>Adds a glowing border around your clip in the feed. Unlock more frames in the Shop.</p>
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
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)' }}>Fanbase Exclusive 🔒</p>
                  <p style={{ fontSize: 11, color: 'var(--gray)' }}>Only visible to your fanbase subscribers</p>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, border: `2px solid ${form.isFanbaseExclusive ? '#00C853' : 'var(--gray3)'}`,
                  background: form.isFanbaseExclusive ? '#00C853' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#000',
                }}>{form.isFanbaseExclusive ? '✓' : ''}</div>
              </div>
            )}
          </div>

          {/* Content-rights confirmation (mandatory) */}
          <div onClick={() => setAgreedRights(v => !v)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', marginTop: 18, cursor: 'pointer',
            background: agreedRights ? 'rgba(201,168,76,0.08)' : 'var(--card)',
            border: `1px solid ${agreedRights ? 'rgba(201,168,76,0.4)' : 'var(--gray3)'}`, borderRadius: 12,
          }}>
            <div style={{
              width: 22, height: 22, marginTop: 1, flexShrink: 0, borderRadius: 6,
              border: `2px solid ${agreedRights ? 'var(--gold)' : 'var(--gray3)'}`,
              background: agreedRights ? 'var(--gold)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#000',
            }}>{agreedRights ? '✓' : ''}</div>
            <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.45 }}>
              I confirm I own or have the rights to all content in this clip (gameplay, music, etc.).{' '}
              <span onClick={(e) => { e.stopPropagation(); setShowRightsModal(true); }} style={{ color: 'var(--gold)', fontWeight: 700 }}>Content Usage Confirmation ›</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--gray3)',
              background: 'var(--card)', color: 'var(--gray)', fontWeight: 700, cursor: 'pointer',
            }}>← Back</button>
            <button onClick={handlePublish} disabled={!form.title.trim() || !(showCustomGame ? customGame.trim() : form.game) || !form.console || !agreedRights} className="btn-gold" style={{ flex: 2, padding: 14, fontWeight: 900, opacity: (!form.title.trim() || !(showCustomGame ? customGame.trim() : form.game) || !form.console || !agreedRights) ? 0.5 : 1 }}>
              🚀 Publish
            </button>
          </div>

          {/* Content Usage Confirmation modal */}
          {showRightsModal && (
            <div onClick={() => setShowRightsModal(false)} style={{
              position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
              <div onClick={(e) => e.stopPropagation()} style={{
                maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto',
                background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 16, padding: 24,
              }}>
                <h3 style={{ fontWeight: 900, fontSize: 18, color: 'var(--white)', marginBottom: 14 }}>Content Usage Confirmation</h3>
                <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.7 }}>
                  By posting this clip, you confirm that you own — or have permission to use — all content it contains, including gameplay footage, music, voices, and any third-party material.{'\n\n'}
                  You are solely responsible for the content you upload. Clips containing material you are not authorized to share may be removed, and repeated violations may lead to account suspension.{'\n\n'}
                  Do not upload content that infringes copyright, contains hateful, violent, or sexually explicit material, or violates our Community Guidelines.
                </p>
                <button onClick={() => { setAgreedRights(true); setShowRightsModal(false); }} className="btn-gold" style={{ width: '100%', padding: 13, fontWeight: 800, marginTop: 20 }}>
                  I understand & agree
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Upload / Processing */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>{uploading ? '📤' : '✅'}</div>
          <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 12 }}>
            {uploading ? (uploadPct < 100 ? 'Upload en cours...' : 'Traitement Mux...') : 'Vidéo envoyée !'}
          </h2>
          {uploading && uploadPct < 100 && (
            <>
              <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'var(--gray3)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 5, background: 'var(--gold)', width: `${uploadPct}%`, transition: 'width 0.3s' }} />
              </div>
              <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{uploadPct}%</p>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 8 }}>Ne ferme pas cette page...</p>
            </>
          )}
          {uploading && uploadPct >= 100 && (
            <p style={{ fontSize: 13, color: 'var(--gray)' }}>Vidéo reçue par Mux — encodage en cours...</p>
          )}
          {!uploading && (
            <>
              <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 24, lineHeight: 1.6 }}>
                Ta vidéo est en cours d'encodage par Mux.<br />
                Elle apparaîtra dans le feed dans <strong style={{ color: 'var(--gold)' }}>quelques minutes</strong>.
              </p>
              <button onClick={() => router.push('/creator')} className="btn-gold" style={{ padding: '12px 28px', fontWeight: 900 }}>
                Voir mes vidéos →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
