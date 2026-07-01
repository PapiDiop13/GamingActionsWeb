'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';

const APP_STORE  = 'https://apps.apple.com/us/app/gaming-actions-rize-to-gg/id6780596082';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.gamingactions.app';

// Page de téléchargement intelligente — idéale pour les QR codes marketing.
// Scan QR → détecte iOS/Android → redirige direct vers le bon store.
// Sur desktop : affiche les deux options.
export default function DownloadPage() {
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) { window.location.href = APP_STORE; setPlatform('ios'); }
    else if (/Android/i.test(ua)) { window.location.href = PLAY_STORE; setPlatform('android'); }
    else setPlatform('desktop');
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <img src="/icon.png" alt="Gaming Actions" className="w-24 h-24 rounded-2xl mb-6 shadow-[0_0_32px_rgba(201,168,76,0.4)]"
           onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <h1 className="text-2xl font-extrabold text-white mb-2">Gaming Actions</h1>
      <p className="text-sm text-gray-400 mb-8">
        {platform === 'desktop' ? 'Télécharge l\'app sur ton téléphone :' : 'Redirection vers le store…'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a href={APP_STORE} className="btn-gold px-6 py-3 rounded-xl font-bold">📱 App Store (iOS)</a>
        <a href={PLAY_STORE} className="px-6 py-3 rounded-xl font-bold text-white border border-white/20">🤖 Google Play</a>
      </div>
    </div>
  );
}
