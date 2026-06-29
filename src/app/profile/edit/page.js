'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const CONSOLES = ['PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'PC', 'Nintendo Switch', 'Mobile'];

const SOCIAL_LINKS = [
  { id: 'youtube',   label: 'YouTube',     color: '#FF0000', placeholder: 'youtube.com/c/yourchannel' },
  { id: 'twitch',    label: 'Twitch',      color: '#9146FF', placeholder: 'twitch.tv/yourname' },
  { id: 'twitter',   label: 'Twitter / X', color: '#1DA1F2', placeholder: 'twitter.com/yourname' },
  { id: 'instagram', label: 'Instagram',   color: '#E1306C', placeholder: 'instagram.com/yourname' },
  { id: 'tiktok',    label: 'TikTok',      color: '#01D4FF', placeholder: 'tiktok.com/@yourname' },
  { id: 'discord',   label: 'Discord',     color: '#5865F2', placeholder: 'discord.gg/yourserver' },
];

const POPULAR_GAMES = [
  'Valorant', 'Fortnite', 'Call of Duty', 'FIFA', 'Minecraft', 'Apex Legends',
  'League of Legends', 'GTA V', 'Rocket League', 'NBA 2K', 'Warzone', 'PUBG',
  'EA Sports FC', 'Overwatch 2', 'Rainbow Six Siege', 'CS2', 'Elden Ring',
  'God of War', 'Spider-Man', 'Zelda', 'Pokémon', 'Street Fighter 6',
];

export default function EditProfilePage() {
  const { user, userProfile, loading: authLoading, refreshProfile } = useAuthStore();
  const router = useRouter();
  const avatarInputRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  const [username, setUsername]       = useState('');
  const [bio, setBio]                 = useState('');
  const [mainConsole, setMainConsole] = useState('PS5');
  const [mainGame, setMainGame]       = useState('');
  const [gameSearch, setGameSearch]   = useState('');
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [avatarPreview, setAvatarPreview]   = useState('');
  const [avatarFile, setAvatarFile]         = useState(null);
  const [links, setLinks]             = useState({
    youtube: '', twitch: '', twitter: '', instagram: '', tiktok: '', discord: '',
  });
  const [loading, setLoading]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) router.push('/auth');
  }, [mounted, authLoading, user, router]);

  useEffect(() => {
    if (!userProfile) return;
    setUsername(userProfile.username || '');
    setBio(userProfile.bio || '');
    setMainConsole(userProfile.mainConsole || 'PS5');
    setMainGame(userProfile.mainGame || '');
    setAvatarPreview(userProfile.avatarUrl || userProfile.avatar || '');
    setLinks({
      youtube:   userProfile.socialLinks?.youtube   || '',
      twitch:    userProfile.socialLinks?.twitch    || '',
      twitter:   userProfile.socialLinks?.twitter   || '',
      instagram: userProfile.socialLinks?.instagram || '',
      tiktok:    userProfile.socialLinks?.tiktok    || '',
      discord:   userProfile.socialLinks?.discord   || '',
    });
  }, [userProfile]);

  // Show spinner until mounted + auth confirmed
  if (!mounted || authLoading || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888899' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <p style={{ fontSize: 13 }}>Loading...</p>
        </div>
      </div>
    );
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    const fileRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
    await uploadBytes(fileRef, avatarFile);
    return await getDownloadURL(fileRef);
  };

  const handleSave = async () => {
    if (!username.trim()) return toast.error('Le pseudo est obligatoire');
    if (username.trim().length < 3) return toast.error('Pseudo trop court (3 chars min)');

    setLoading(true);
    try {
      // Check username uniqueness (if changed)
      if (username.trim().toLowerCase() !== (userProfile?.username || '').toLowerCase()) {
        const existing = await getDocs(query(
          collection(db, 'users'),
          where('usernameLower', '==', username.trim().toLowerCase())
        ));
        if (!existing.empty && existing.docs[0].id !== user.uid) {
          toast.error('Ce pseudo est déjà pris');
          setLoading(false);
          return;
        }
      }

      // Upload avatar if new
      let avatarUrl = userProfile?.avatarUrl || userProfile?.avatar || '';
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        usernameLower: username.trim().toLowerCase(),
        bio: bio.trim(),
        mainConsole,
        mainGame: mainGame.trim(),
        avatar: avatarUrl,
        avatarUrl,
        socialLinks: links,
        updatedAt: new Date(),
      });

      await refreshProfile?.();
      toast.success('Profil mis à jour ✅');
      router.push(`/profile/${user.uid}`);
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setLoading(false);
  };

  const filteredGames = POPULAR_GAMES.filter(g =>
    gameSearch ? g.toLowerCase().includes(gameSearch.toLowerCase()) : true
  );

  const initial = (username || user.email || '?')[0].toUpperCase();

  return (
    <div className="px-4 md:px-6 py-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{
          background: 'var(--card)', border: '1px solid var(--gray3)', color: 'var(--gray)',
        }}>
          ‹
        </button>
        <h1 className="text-xl font-black" style={{ color: 'var(--white)' }}>Modifier le profil</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="relative cursor-pointer"
          onClick={() => avatarInputRef.current?.click()}
        >
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            border: '3px solid var(--gold)',
            overflow: 'hidden',
            background: 'var(--card)',
          }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 32, color: 'var(--gold)' }}>
                  {initial}
                </div>
            }
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
            border: '2px solid var(--black)',
          }}>
            ✏️
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <p className="text-xs mt-3" style={{ color: 'var(--gray)' }}>Clique pour changer l'avatar</p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-5">

        {/* Username */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--gray)' }}>Pseudo *</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ton_pseudo"
            maxLength={30}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--gray)' }}>Bio</label>
          <textarea
            className="input resize-none"
            style={{ height: 80 }}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Présente-toi en quelques mots..."
            maxLength={160}
          />
          <p className="text-[10px] text-right mt-1" style={{ color: 'var(--gray)' }}>{bio.length}/160</p>
        </div>

        {/* Console */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--gray)' }}>Console principale</label>
          <div className="flex flex-wrap gap-2">
            {CONSOLES.map(c => (
              <button
                key={c}
                onClick={() => setMainConsole(c)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={mainConsole === c ? {
                  background: 'var(--gold)', color: 'var(--black)',
                } : {
                  background: 'var(--card)', color: 'var(--gray)',
                  border: '1px solid var(--gray3)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Main game */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--gray)' }}>Jeu principal</label>
          <div className="relative">
            <input
              className="input"
              value={mainGame || gameSearch}
              onChange={e => { setGameSearch(e.target.value); setMainGame(''); setShowGamePicker(true); }}
              onFocus={() => setShowGamePicker(true)}
              placeholder="Valorant, FIFA, Fortnite..."
            />
            {showGamePicker && filteredGames.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto" style={{
                background: 'var(--card)', border: '1px solid var(--gray3)',
              }}>
                {filteredGames.map(g => (
                  <button
                    key={g}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-all"
                    style={{ color: 'var(--white)' }}
                    onClick={() => { setMainGame(g); setGameSearch(''); setShowGamePicker(false); }}
                  >
                    🎮 {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Social links */}
        <div>
          <label className="block text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: 'var(--gray)' }}>Liens sociaux</label>
          <div className="flex flex-col gap-3">
            {SOCIAL_LINKS.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 font-bold text-xs" style={{
                  background: s.color + '20', color: s.color, border: `1px solid ${s.color}30`,
                }}>
                  {s.label[0]}
                </div>
                <input
                  className="input flex-1"
                  placeholder={s.placeholder}
                  value={links[s.id]}
                  onChange={e => setLinks(prev => ({ ...prev, [s.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-gold w-full py-3 text-base font-black mt-2"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Sauvegarde...' : '✅ Sauvegarder le profil'}
        </button>
      </div>
    </div>
  );
}
