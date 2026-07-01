'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import OpenInApp from '@/components/OpenInApp';

// Lien partagé /user/{username} : ouvre l'app si installée, sinon landing /
// page web du profil. On résout d'abord le pseudo → uid pour le fallback web.
export default function UserLanding() {
  const { username } = useParams();
  const uname = decodeURIComponent(Array.isArray(username) ? username[0] : (username || ''));
  const [uid, setUid] = useState(undefined); // undefined = en cours, null = introuvable

  useEffect(() => {
    if (!uname) return;
    (async () => {
      try {
        let snap = await getDocs(query(collection(db, 'users'),
          where('usernameLower', '==', uname.toLowerCase()), limit(1)));
        if (snap.empty) snap = await getDocs(query(collection(db, 'users'),
          where('username', '==', uname.toUpperCase()), limit(1)));
        setUid(snap.empty ? null : snap.docs[0].id);
      } catch (e) { setUid(null); }
    })();
  }, [uname]);

  if (uid === undefined) return <div className="text-center py-24 text-gray-400">Chargement…</div>;

  return (
    <OpenInApp
      path={`user/${uname}`}
      webFallback={uid ? `/profile/${uid}` : null}
      title={`@${uname}`}
      subtitle="Ouvre ce profil dans l'app Gaming Actions."
    />
  );
}
