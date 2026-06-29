'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useAuthStore from '@/lib/stores/useAuthStore';

const NAV = [
  { href: '/',             icon: '🎮', label: 'Feed' },
  { href: '/rankings',     icon: '🏆', label: 'Rankings' },
  { href: '/subscription', icon: '👑', label: 'Legendary' },
];

const AUTH_NAV_BASE = [
  { href: '/shop',          icon: '🛒', label: 'Shop' },
  { href: '/notifications', icon: '🔔', label: 'Notifications' },
  { href: '/points',        icon: '⚡', label: 'GA Points' },
  { href: '/tips',          icon: '💡', label: 'GameTips' },
  { href: '/giftcards',     icon: '🎁', label: 'Gift Cards' },
  { href: '/settings',      icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, userProfile } = useAuthStore();

  // (sidebar visible everywhere now — feed is card-based, not fullscreen)

  return (
    <aside
      className="hidden lg:flex flex-col w-52 shrink-0 px-3 py-6 sticky overflow-y-auto scrollbar-hide"
      style={{
        top: 56,
        height: 'calc(100vh - 56px)',
        borderRight: '1px solid var(--gray3)',
      }}
    >
      <nav className="flex flex-col gap-1">
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                color: active ? 'var(--gold)' : 'var(--gray)',
                background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                border: active ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.color = 'var(--white)';
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.color = 'var(--gray)';
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {user && (() => {
          const isCreatorType = userProfile?.accountType === 'creator' || userProfile?.accountType === 'gameconic';
          const uploadItem = isCreatorType
            ? { href: '/creator', icon: '🎬', label: 'Creator Studio' }
            : { href: '/upload', icon: '📤', label: 'Publier' };
          const nav = [...AUTH_NAV_BASE];
          // Insert upload/studio after GA Points (index 3)
          nav.splice(3, 0, uploadItem);
          return nav.map(item => {
            const active = pathname === item.href || (item.href === '/creator' && pathname.startsWith('/creator'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  color: active ? 'var(--gold)' : 'var(--gray)',
                  background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--white)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--gray)'; }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          });
        })()}
      </nav>

      {/* Legendary promo */}
      {user && !userProfile?.isLegendary && (
        <div className="mt-auto pt-6">
          <Link href="/subscription" className="block p-4 rounded-xl transition-all" style={{
            background: 'var(--card)',
            border: '1px solid rgba(201,168,76,0.2)',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'}
          >
            <div className="text-xl mb-1">👑</div>
            <p className="text-xs font-black mb-1" style={{ color: 'var(--gold)' }}>Legendary Pass</p>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              50 videos/week, exclusive badge, feed priority
            </p>
          </Link>
        </div>
      )}
    </aside>
  );
}
