'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

function AuthForm() {
  const params    = useSearchParams();
  const [mode, setMode]       = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const { loginEmail, loginGoogle, signUpEmail, resetPassword } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginEmail(email, password);
        toast.success('Welcome back! 🎮');
        router.push('/');
      } else {
        if (password.length < 6) { toast.error('Password must be at least 6 characters'); setLoading(false); return; }
        if (password !== confirm) { toast.error('Passwords do not match'); setLoading(false); return; }
        await signUpEmail(email, password);
        // Verification email sent automatically
        router.push('/complete-profile');
      }
    } catch (err) {
      const msg = err.code === 'auth/wrong-password'       ? 'Incorrect password'
                : err.code === 'auth/user-not-found'       ? 'Account not found'
                : err.code === 'auth/email-already-in-use' ? 'Email already in use'
                : err.code === 'auth/invalid-credential'   ? 'Invalid email or password'
                : err.message;
      toast.error(msg);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { isNew } = await loginGoogle();
      toast.success('Signed in! 🎮');
      router.push(isNew ? '/complete-profile' : '/');
    } catch { toast.error('Google sign-in failed'); }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    try {
      await resetPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      toast.error(err.code === 'auth/user-not-found' ? 'No account with this email' : 'Error sending email');
    }
    setLoading(false);
  };

  const isLogin = mode === 'login';

  /* ---------- FORGOT PASSWORD VIEW ---------- */
  if (forgotMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', background: '#0A0A0F', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.12) 0%, transparent 60%)' }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 22, background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))', border: '1px solid rgba(201,168,76,0.3)', marginBottom: 16 }}>
              <span style={{ fontSize: 36 }}>🔑</span>
            </div>
            <h1 style={{ fontWeight: 900, fontSize: 24, color: '#fff', margin: 0 }}>Reset Password</h1>
            <p style={{ fontSize: 13, color: '#888899', marginTop: 6 }}>We'll send you a reset link</p>
          </div>

          <div style={{ background: 'rgba(26,26,38,0.95)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 24, padding: '36px 32px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            {forgotSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                <h2 style={{ fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 8 }}>Check your inbox</h2>
                <p style={{ fontSize: 13, color: '#888899', lineHeight: 1.6, marginBottom: 24 }}>
                  We sent a reset link to <strong style={{ color: '#C9A84C' }}>{forgotEmail}</strong>. Click it to set a new password.
                </p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }} style={{
                  width: '100%', padding: '13px 0', fontWeight: 800, fontSize: 14,
                  background: 'linear-gradient(135deg, #C9A84C, #E8C96A)',
                  color: '#0A0A0F', border: 'none', borderRadius: 12, cursor: 'pointer',
                }}>Back to Sign In</button>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase' }}>Email</label>
                  <input type="email" className="input" placeholder="you@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus style={{ width: '100%' }} />
                </div>
                <button type="submit" disabled={loading || !forgotEmail} style={{
                  width: '100%', padding: '14px 0', fontWeight: 900, fontSize: 15,
                  background: !forgotEmail ? 'rgba(201,168,76,0.2)' : 'linear-gradient(135deg, #C9A84C, #E8C96A)',
                  color: '#0A0A0F', border: 'none', borderRadius: 12, cursor: !forgotEmail ? 'not-allowed' : 'pointer',
                  boxShadow: forgotEmail ? '0 4px 20px rgba(201,168,76,0.35)' : 'none',
                }}>
                  {loading ? '...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>

          {!forgotSent && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#555566', marginTop: 20 }}>
              <span onClick={() => setForgotMode(false)} style={{ color: '#C9A84C', cursor: 'pointer', fontWeight: 700 }}>← Back to Sign In</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ---------- MAIN AUTH VIEW ---------- */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', background: '#0A0A0F', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.12) 0%, transparent 60%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(201,168,76,0.04) 0%, transparent 60%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 40% 40% at 80% 80%, rgba(201,168,76,0.04) 0%, transparent 60%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.03, backgroundImage: 'linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 88, height: 88, borderRadius: 24, background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)', border: '1px solid rgba(201,168,76,0.3)', marginBottom: 16, boxShadow: '0 0 40px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.2)' }}>
            <img src="/logo.png" alt="Gaming Actions" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontWeight: 900, fontSize: 26, letterSpacing: -0.5, color: '#fff', margin: 0 }}>
            Gaming <span style={{ color: '#C9A84C', textShadow: '0 0 20px rgba(201,168,76,0.4)' }}>Actions</span>
          </h1>
          <p style={{ fontSize: 13, color: '#888899', marginTop: 6, fontWeight: 500 }}>
            {isLogin ? 'Good to see you again 🎮' : 'Join the community 🚀'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(26,26,38,0.95)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 24, padding: '36px 32px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 28, background: 'rgba(10,10,15,0.8)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.04)' }}>
            {[{ id: 'login', label: 'Sign In' }, { id: 'register', label: 'Sign Up' }].map(t => (
              <button key={t.id} onClick={() => setMode(t.id)} style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                background: mode === t.id ? 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)' : 'transparent',
                color: mode === t.id ? '#0A0A0F' : '#888899',
                border: 'none',
                boxShadow: mode === t.id ? '0 2px 12px rgba(201,168,76,0.3)' : 'none',
                letterSpacing: 0.3,
              }}>{t.label}</button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase' }}>Email</label>
              <input type="email" className="input" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={{ width: '100%' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#888899', letterSpacing: 0.8, textTransform: 'uppercase' }}>Password</label>
                {isLogin && (
                  <span onClick={() => { setForgotMode(true); setForgotEmail(email); }} style={{ fontSize: 11, color: '#C9A84C', cursor: 'pointer', fontWeight: 600 }}>
                    Forgot password?
                  </span>
                )}
              </div>
              <input type="password" className="input" placeholder={isLogin ? '••••••••' : 'Min. 6 characters'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} style={{ width: '100%' }} />
            </div>

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888899', marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase' }}>Confirm Password</label>
                <input type="password" className="input" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" style={{ width: '100%' }} />
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', marginTop: 6, padding: '14px 0', fontSize: 15, fontWeight: 900,
              background: loading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)',
              color: '#0A0A0F', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.5, boxShadow: loading ? 'none' : '0 4px 20px rgba(201,168,76,0.35)', transition: 'all 0.2s',
            }}>
              {loading ? '...' : isLogin ? 'Sign In' : 'Continue →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: '#555566', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%', padding: '13px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#fff', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {!isLogin && (
            <p style={{ fontSize: 11, color: '#555566', textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <span style={{ color: '#C9A84C', cursor: 'pointer' }}>Terms of Service</span>
            </p>
          )}
        </div>

        {/* Bottom toggle */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#555566', marginTop: 20 }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setMode(isLogin ? 'register' : 'login')} style={{ color: '#C9A84C', cursor: 'pointer', fontWeight: 700 }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
