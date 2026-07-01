'use client';
export const dynamic = 'force-dynamic';
import { useParams } from 'next/navigation';
import OpenInApp from '@/components/OpenInApp';

// Lien partagé /clip/{id} : ouvre l'app si installée (Universal Link),
// sinon landing "Ouvrir dans l'app" (mobile) ou page web du clip (desktop).
export default function ClipLanding() {
  const { id } = useParams();
  const vid = Array.isArray(id) ? id[0] : id;
  return (
    <OpenInApp
      path={`clip/${vid}`}
      webFallback={`/video/${vid}`}
      title="Watch this clip 🎮"
      subtitle="Open it in the Gaming Actions app for the best experience."
    />
  );
}
