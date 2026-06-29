'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const ACCOUNT_TYPES = [
  { id: 'gamer',     icon: '🎮', label: 'Gamer' },
  { id: 'creator',   icon: '🎬', label: 'Creator' },
  { id: 'developer', icon: '💻', label: 'Developer' },
];

export default function CompleteProfilePage() {
  const { user, userProfile, saveProfile, checkUsername } = useAuthStore();
  const router = useRouter();

  const [username, setUsername]       = useState('');
  const [accountType, setAccountType] = useState('gamer');
  const [mainGame, setMainGame]       = useState('');
  const [bio, setBio]                 = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [step, setStep]               = useState(1); // 1 = gamertag, 2 = details

  // If user already has a username they're done
  useEffect(() => {
    if (userProfile?.username) router.replace('/');
  }, [userProfile]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user && !loading) {
      const timer = setTimeout(() => router.replace('/auth'), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const validateUsername = (val) => {
    if (!val) return 'GamerTag is required';
    if (val.length < 3) return 'At least 3 characters';
    if (val.length > 20) return 'Max 20 characters';
    if (!/^[A-Z0-9_]+$/i.test(val)) return 'Letters, numbers and _ only';
    return null;
  };

  const handleNext = async () => {
    const err = validateUsername(username.trim());
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const available = await checkUsername(username.trim());
      if (!available) {
        setError('This GamerTag is already taken — try another one');
        setLoading(false);
        return;
      }
      setStep(2);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      await saveProfile({
        username: username.trim(),
        accountType,
        mainGame: mainGame.trim(),
        bio: bio.trim(),
      });
      toast.success("Let's go! 🎮");
      router.push('/');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F' }}>
        <p style={{ color: '#888899' }}>Redirecting...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.10) 0%, transparent 60%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.02, backgroundImage: 'linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: 22,
            background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)',
            border: '1px solid rgba(201,168,76,0.3)', marginBottom: 16,
            boxShadow: '0 0 40px rgba(201,168,76,0.12)',
          }}>
            <img src="/logo.png" alt="GA" style={{ width: 54, height: 54, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontWeight: 900, fontSize: 24, color: '#fff', margin: 0, letterSpacing: -0.5 }}>
            Complete your profile
          </h1>
          <p style={{ fontSize: 13, color: '#888899', marginTop: 6 }}>Let the world know who you are</p>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                height: 4, borderRadius: 2, transition: 'all 0.3s',
                width: step >= s ? 32 : 16,
                background: step >= s ? '#C9A84C' : 'rgba(201,168,76,0.2)',
              }} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(26,26,38,0.95)',
          border: '1px solid rgba(201,168,76,0.15)', borderRadius: 24,
          padding: '36px 32px', backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>

          {error && (
            <div style={{
              background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              fontSize: 13, color: '#ff6b7a', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Your GamerTag
              </label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🎮</span>
                <input
                  className="input"
                  placeholder="ECHO_KING"
                  value={username}
                  onChange={e => { setUsername(e.target.value.toUpperCase()); setError(''); }}
                  maxLength={20}
                  style={{ width: '100%', paddingLeft: 42, fontWeight: 800, fontSize: 15, letterSpacing: 1 }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                />
              </div>
              <p style={{ fontSize: 11, color: '#555566', marginBottom: 28, lineHeight: 1.6 }}>
                Your GamerTag is your unique identity on Gaming Actions — choose wisely. Letters, numbers and _ only.
              </p>

              {/* Preview */}
              {username.length >= 2 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 24,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))',
                    border: '2px solid rgba(201,168,76,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 16, color: '#C9A84C',
                  }}>
                    {username[0]}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#fff' }}>{username}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#888899' }}>@{username.toLowerCase()}</p>
                  </div>
                </div>
              )}

              <button onClick={handleNext} disabled={loading || !username} style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 900,
                background: !username ? 'rgba(201,168,76,0.2)' : 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)',
                color: '#0A0A0F', border: 'none', borderRadius: 12,
                cursor: !username ? 'not-allowed' : 'pointer',
                boxShadow: username ? '0 4px 20px rgba(201,168,76,0.35)' : 'none',
                letterSpacing: 0.5,
              }}>
                {loading ? '...' : 'Check availability →'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* GamerTag badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 12, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18 }}>🎮</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: '#C9A84C' }}>{username}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888899' }}>GamerTag confirmed ✓</p>
                </div>
                <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', fontSize: 11, color: '#888899', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Change
                </button>
              </div>

              {/* Account type */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Account type
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {ACCOUNT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setAccountType(type.id)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                      background: accountType === type.id ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                      border: accountType === type.id ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: accountType === type.id ? '#C9A84C' : '#888899',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Main game */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Main game <span style={{ color: '#555566', fontWeight: 500 }}>(optional)</span>
              </label>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🏆</span>
                <input
                  className="input"
                  placeholder="Call of Duty, FIFA, Fortnite..."
                  value={mainGame}
                  onChange={e => setMainGame(e.target.value)}
                  style={{ width: '100%', paddingLeft: 42 }}
                />
              </div>

              {/* Bio */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Bio <span style={{ color: '#555566', fontWeight: 500 }}>(optional)</span>
              </label>
              <textarea
                className="input"
                placeholder="Tell the community about yourself..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={150}
                rows={3}
                style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 11, color: '#555566', textAlign: 'right', marginTop: 4, marginBottom: 24 }}>{bio.length}/150</p>

              <button onClick={handleComplete} disabled={loading} style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 900,
                background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)',
                color: '#0A0A0F', border: 'none', borderRadius: 12, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(201,168,76,0.35)', letterSpacing: 0.5,
              }}>
                {loading ? '...' : "LET'S GO 🎮"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
