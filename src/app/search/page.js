'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VideoCard from '@/components/feed/VideoCard';
import Link from 'next/link';

function SearchResults() {
  const params            = useSearchParams();
  const q                 = params.get('q') || '';
  const [videos, setVideos] = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) { setLoading(false); return; }
    const term = q.toLowerCase();
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, 'videos'), orderBy('ggCount', 'desc'), limit(100))),
      getDocs(query(collection(db, 'users'), orderBy('ggCount', 'desc'), limit(50))),
    ]).then(([videosSnap, usersSnap]) => {
      setVideos(
        videosSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(v => !v.banned && !v.restricted && (
            v.title?.toLowerCase().includes(term) ||
            v.username?.toLowerCase().includes(term) ||
            v.genre?.toLowerCase().includes(term)
          ))
      );
      setUsers(
        usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.username?.toLowerCase().includes(term))
      );
    }).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="px-4 md:px-6 py-6">
      <h1 className="text-xl font-black text-[#E8F5EE] mb-2">
        Résultats pour <span className="text-[#00C853]">"{q}"</span>
      </h1>
      <p className="text-sm text-[#4A7A5A] mb-6">{videos.length} vidéos · {users.length} profils</p>

      {users.length > 0 && (
        <div className="mb-8">
          <h2 className="font-black text-[#E8F5EE] mb-4">👤 Profils</h2>
          <div className="flex flex-wrap gap-3">
            {users.slice(0, 6).map(u => (
              <Link key={u.id} href={`/profile/${u.id}`} className="card flex items-center gap-3 px-4 py-3 hover:border-[#00C853]/40 transition-all">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-[#1A4D2E] bg-[#0E1A12]">
                  {u.avatar
                    ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-black text-[#00C853]">{(u.username || '?')[0]}</div>
                  }
                </div>
                <div>
                  <p className="font-bold text-sm text-[#E8F5EE]">{u.username}</p>
                  <p className="text-[10px] text-[#4A7A5A]">⚡ {u.ggCount || 0} GGs</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h2 className="font-black text-[#E8F5EE] mb-4">🎬 Vidéos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        </div>
      )}

      {!loading && videos.length === 0 && users.length === 0 && (
        <div className="text-center py-20 text-[#4A7A5A]">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-bold text-[#E8F5EE] mb-2">Aucun résultat</p>
          <p className="text-sm">Essaie un autre terme de recherche</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchResults /></Suspense>;
}
