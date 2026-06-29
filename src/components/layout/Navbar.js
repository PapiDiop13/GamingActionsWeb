'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';
import FramedAvatar from '@/components/ui/FramedAvatar';

export default function Navbar() {
  const { user, userProfile, logout } = useAuthStore();
  const router = useRouter();
  const avatar = userProfile?.avatarUrl || userProfile?.avatar;
  const initial = (userProfile?.username || user?.email || '?')[0].toUpperCase();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      borderBottom: '1px solid var(--gray3)',
      background: 'rgba(10,10,15,0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="GA" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span className="hidden sm:block font-black text-base" style={{ color: 'var(--white)' }}>
            GAMING <span style={{ color: 'var(--gold)' }}>ACTIONS</span>
          </span>
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-xs">
          <input
            className="input text-sm"
            style={{ height: 36 }}
            placeholder="Search a gamer, a video..."
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                router.push(`/search?q=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link
                href="/creator"
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                style={{ color: 'var(--gray)', border: '1px solid var(--gray3)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.borderColor = 'var(--gray)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray)'; e.currentTarget.style.borderColor = 'var(--gray3)'; }}
              >
                🎮 Studio
              </Link>

              <Link href={`/profile/${user.uid}`} style={{ display: 'flex', alignItems: 'center', overflow: 'visible' }}>
                <FramedAvatar user={userProfile || { avatarUrl: user?.photoURL, username: user?.email }} size={34} />
              </Link>

              <button
                onClick={logout}
                className="hidden md:block text-xs font-bold transition-colors"
                style={{ color: 'var(--gray)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--white)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-sm font-bold px-3 py-2 rounded-xl transition-all"
                style={{ color: 'var(--gray)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--white)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}
              >
                Log in
              </Link>
              <Link href="/auth?mode=register" className="btn-gold text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
