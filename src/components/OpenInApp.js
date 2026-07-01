'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const APP_STORE  = 'https://apps.apple.com/us/app/gaming-actions-rize-to-gg/id6780596082';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.gamingactions.app';

function detect() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/**
 * Landing "Ouvrir dans l'app" pour les liens partagés (/clip, /user).
 * - mobile : bouton qui tente d'ouvrir l'app (ga://path), sinon → store.
 * - desktop : redirige vers la version web (webFallback).
 *
 * props: path = "clip/{id}" | "user/{username}" ; webFallback = "/video/{id}" ; title, subtitle
 */
export default function OpenInApp({ path, webFallback, title, subtitle }) {
  const router = useRouter();
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    const p = detect();
    setPlatform(p);
    // Sur desktop : pas d'app → on montre directement le contenu web.
    if (p === 'other' && webFallback) router.replace(webFallback);
  }, []);

  const store = platform === 'android' ? PLAY_STORE : APP_STORE;

  const openApp = () => {
    let left = false;
    const markLeft = () => { left = true; };
    document.addEventListener('visibilitychange', () => { if (document.hidden) left = true; });
    window.addEventListener('blur', markLeft);
    // Tente d'ouvrir l'app via le scheme custom
    window.location.href = `ga://${path}`;
    // Si l'app ne s'ouvre pas (~1.4s), on envoie vers le store
    setTimeout(() => { if (!left && !document.hidden) window.location.href = store; }, 1400);
  };

  // Pendant la détection / la redirection desktop
  if (platform === null || platform === 'other') {
    return <div className="text-center py-24 text-gray-400">Chargement…</div>;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <img src="/icon.png" alt="Gaming Actions" className="w-20 h-20 rounded-2xl mb-6 shadow-[0_0_32px_rgba(201,168,76,0.4)]"
           onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <h1 className="text-xl font-extrabold text-white mb-2">{title || 'Gaming Actions'}</h1>
      <p className="text-sm text-gray-400 mb-8">{subtitle || 'Ouvre ce contenu dans l\'app Gaming Actions.'}</p>

      <button onClick={openApp} className="btn-gold w-full max-w-xs py-3 rounded-xl font-extrabold mb-3">
        Ouvrir dans l&apos;app
      </button>

      {webFallback && (
        <button onClick={() => router.replace(webFallback)}
                className="w-full max-w-xs py-3 rounded-xl font-bold text-gray-300 border border-white/15">
          Continuer sur le web
        </button>
      )}

      <a href={store} className="text-xs text-gray-500 mt-6 underline">
        Pas encore l&apos;app ? Télécharger
      </a>
    </div>
  );
}
