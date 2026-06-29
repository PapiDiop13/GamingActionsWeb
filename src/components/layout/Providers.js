'use client';
import { useEffect } from 'react';
import useAuthStore from '@/lib/stores/useAuthStore';

export default function Providers({ children }) {
  const init = useAuthStore(s => s.init);
  useEffect(() => { const unsub = init(); return unsub; }, [init]);
  return <>{children}</>;
}
