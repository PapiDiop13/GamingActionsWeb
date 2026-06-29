'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import FramedAvatar from '@/components/ui/FramedAvatar';

export default function FollowingPage() {
  const { userId } = useParams();
  const router = useRouter();
  const { user, userProfile } = useAuthStore();

  const [following, setFollowing] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState(new Set());
  const [loadingFollow, setLoadingFollow] = useState({});

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(following);
    } else {
      const lower = search.toLowerCase();
      setFiltered(following.filter(f => f.username?.toLowerCase().includes(lower)));
    }
  }, [search, following]);

  async function fetchFollowing() {
    setLoading(true);
    try {
      const targetDoc = await getDoc(doc(db, 'users', userId));
      if (!targetDoc.exists()) {
        setFollowing([]);
        setFiltered([]);
        return;
      }

      const followingUids = targetDoc.data().following || [];

      if (followingUids.length === 0) {
        setFollowing([]);
        setFiltered([]);
        return;
      }

      const profiles = await Promise.all(
        followingUids.map(async uid => {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) return { uid: snap.id, ...snap.data() };
          return null;
        })
      );

      const validProfiles = profiles.filter(Boolean);
      setFollowing(validProfiles);
      setFiltered(validProfiles);

      if (user) {
        const myDoc = await getDoc(doc(db, 'users', user.uid));
        if (myDoc.exists()) {
          const myFollowing = myDoc.data().following || [];
          setFollowingSet(new Set(myFollowing));
        }
      }
    } catch (err) {
      console.error('Error fetching following:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowToggle(targetUid) {
    if (!user) return;
    setLoadingFollow(prev => ({ ...prev, [targetUid]: true }));
    try {
      const myRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', targetUid);
      const isFollowing = followingSet.has(targetUid);

      if (isFollowing) {
        await updateDoc(myRef, { following: arrayRemove(targetUid) });
        await updateDoc(targetRef, { followers: increment(-1) });
        setFollowingSet(prev => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
      } else {
        await updateDoc(myRef, { following: arrayUnion(targetUid) });
        await updateDoc(targetRef, { followers: increment(1) });
        setFollowingSet(prev => new Set([...prev, targetUid]));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setLoadingFollow(prev => ({ ...prev, [targetUid]: false }));
    }
  }

  function getAccountBadge(profile) {
    if (profile.plan === 'legendary') return 'LEG';
    if (profile.accountType === 'creator') return 'CR';
    if (profile.accountType === 'gameconic') return 'ICON';
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', color: 'var(--white)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 0',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--black)',
          zIndex: 10,
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--white)',
              cursor: 'pointer',
              fontSize: 20,
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Following</h1>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 0' }}>
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'var(--card)',
              color: 'var(--white)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(255,255,255,0.15)',
              borderTop: '3px solid var(--gold)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--gray)', padding: '60px 0', fontSize: 15 }}>
            Ne suit personne pour l&apos;instant 👾
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 32 }}>
            {filtered.map(profile => {
              const badge = getAccountBadge(profile);
              const isOwnProfile = user && profile.uid === user.uid;
              const isFollowingThis = followingSet.has(profile.uid);
              const isLoadingThis = loadingFollow[profile.uid];

              return (
                <div
                  key={profile.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    backgroundColor: 'var(--card)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(`/profile/${profile.uid}`)}
                >
                  <FramedAvatar user={profile} size={40} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.username || 'Utilisateur'}
                      </span>
                      {badge && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--gold)',
                          border: '1px solid var(--gold)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          flexShrink: 0,
                        }}>
                          {badge}
                        </span>
                      )}
                    </div>
                    {profile.mainGame && (
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.mainGame}
                      </div>
                    )}
                  </div>

                  {!isOwnProfile && user && (
                    <button
                      onClick={e => { e.stopPropagation(); handleFollowToggle(profile.uid); }}
                      disabled={isLoadingThis}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        border: isFollowingThis ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        backgroundColor: isFollowingThis ? 'transparent' : 'var(--gold)',
                        color: isFollowingThis ? 'var(--gray)' : 'var(--black)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: isLoadingThis ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        opacity: isLoadingThis ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {isFollowingThis ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
