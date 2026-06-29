'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  doc, getDoc, onSnapshot, addDoc, updateDoc, increment, collection,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import toast from 'react-hot-toast';

const THANKS_COST = 5;
const CAT_COLORS = { flashtuto: 'var(--blue)', flashinfo: 'var(--red)', gameindev: '#7C4DFF' };
const CAT_LABELS = { flashtuto: 'FLASHTUTO', flashinfo: 'FLASHINFO', gameindev: 'GAMEINDEV' };

function fmtTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'maintenant';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'j';
}

function CommentBubble({ comment, onReply }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true); setLikes(l => l + 1);
    try { await updateDoc(doc(db, 'tipComments', comment.id), { likes: increment(1) }); } catch {}
  };

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 12, padding: 12, marginBottom: 8,
      border: '1px solid var(--gray3)',
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 900, fontSize: 13, color: 'var(--gold)',
        }}>{(comment.username || '?')[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--gold)' }}>{comment.username}</span>
            <span style={{ fontSize: 10, color: 'var(--gray)' }}>{fmtTime(comment.createdAt)}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.5, marginBottom: 8 }}>{comment.text}</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => onReply(comment.username)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 4 }}>
              💬 Reply
            </button>
            <button onClick={handleLike} disabled={liked} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: liked ? 'var(--red)' : 'var(--gray)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {liked ? '❤️' : '🤍'} {likes > 0 ? likes : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TipDetailPage({ params }) {
  const { id } = use(params);
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [thanksCount, setThanksCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [thankLoading, setThankLoading] = useState(false);
  const [showThanksModal, setShowThanksModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'videos', id)).then(snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setTip(data);
        setThanksCount(data.thanksCount || 0);
        setCommentsCount(data.commentsCount || data.commentCount || 0);
        setViewsCount(data.viewCount || 0);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  // Track view
  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => {
      updateDoc(doc(db, 'videos', id), { viewCount: increment(1) }).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [id]);

  // Real-time stats
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'videos', id), snap => {
      if (snap.exists()) {
        setThanksCount(snap.data().thanksCount || 0);
        setCommentsCount(snap.data().commentsCount || snap.data().commentCount || 0);
        setViewsCount(snap.data().viewCount || 0);
      }
    }, () => {});
    return () => unsub();
  }, [id]);

  // Comments
  useEffect(() => {
    if (!showComments || !id) return;
    const q = query(collection(db, 'tipComments'), where('tipId', '==', id), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [showComments, id]);

  const sendComment = async () => {
    const raw = (replyTo ? `@${replyTo} ` : '') + commentText.trim();
    if (!raw || !user || !userProfile) return;
    setCommentText(''); setReplyTo(null);
    try {
      await addDoc(collection(db, 'tipComments'), {
        tipId: id, userId: user.uid,
        username: userProfile.username || '',
        avatar: userProfile.avatarUrl || '',
        text: raw, likes: 0, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'videos', id), { commentsCount: increment(1) });
    } catch { toast.error('Erreur commentaire'); }
  };

  const doThanks = async () => {
    if (!user || !tip) return;
    if ((userProfile?.gaPoints || 0) < THANKS_COST) { toast.error(`Tu as besoin de ${THANKS_COST} GA Points`); setShowThanksModal(false); return; }
    setShowThanksModal(false); setThankLoading(true);
    try {
      await addDoc(collection(db, 'thanks'), {
        userId: user.uid, tipId: id, creatorId: tip.userId, points: THANKS_COST, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', user.uid), { gaPoints: increment(-THANKS_COST) });
      await updateDoc(doc(db, 'users', tip.userId), { gaPoints: increment(THANKS_COST) });
      await updateDoc(doc(db, 'videos', id), { thanksCount: increment(1) });
      toast.success(`Thanks envoyé ! -${THANKS_COST} GA Points ✅`);
    } catch { toast.error('Erreur'); }
    setThankLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray)' }}><div style={{ fontSize: 32 }}>💡</div><p style={{ marginTop: 8 }}>Chargement...</p></div>
      </div>
    );
  }
  if (!tip) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray)' }}><div style={{ fontSize: 32 }}>😕</div><p style={{ marginTop: 8 }}>Tip introuvable</p></div>
      </div>
    );
  }

  const catColor = CAT_COLORS[tip.contentType] || 'var(--gold)';
  const catLabel = CAT_LABELS[tip.contentType];
  const gaPoints = userProfile?.gaPoints || 0;
  const isOwnTip = user?.uid === tip.userId;
  const isCreatorType = userProfile?.accountType === 'creator' || userProfile?.accountType === 'gameconic';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 80 }}>

      {/* Thanks confirm modal */}
      {showThanksModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowThanksModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#141420', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%',
            border: '1px solid rgba(124,77,255,0.3)', textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>👍</div>
            <h3 style={{ fontWeight: 900, fontSize: 18, color: 'var(--white)', marginBottom: 8 }}>Envoyer un Thanks ?</h3>
            <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 20 }}>
              Tu vas envoyer <strong style={{ color: '#7C4DFF' }}>{THANKS_COST} GA Points</strong> à {tip.username}.<br />
              Solde après : <strong>{Math.max(0, gaPoints - THANKS_COST)} pts</strong>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowThanksModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--gray3)', background: 'transparent', color: 'var(--gray)', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={doThanks} style={{ flex: 1.4, padding: '12px 0', borderRadius: 12, border: 'none', background: '#7C4DFF', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>
                Envoyer · {THANKS_COST} pts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back + title header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px', borderBottom: '1px solid var(--gray3)' }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--gray3)', background: 'var(--card)', cursor: 'pointer', fontSize: 18, color: 'var(--white)' }}>‹</button>
        <h1 style={{ flex: 1, fontWeight: 700, fontSize: 15, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tip.title || tip.caption}</h1>
      </div>

      {/* Video */}
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#060610', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {tip.videoUrl ? (
          <video src={tip.videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.15 }}>🎮</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px 16px', borderBottom: '1px solid var(--gray3)' }}>
        {catLabel && (
          <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, background: catColor + '18', color: catColor, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, marginBottom: 10 }}>{catLabel}</div>
        )}
        <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 8, lineHeight: 1.3 }}>{tip.title || tip.caption}</h2>
        <p style={{ fontSize: 13, color: 'var(--gold)' }}>🎮 {tip.game || '—'}</p>
      </div>

      {/* Creator row */}
      <Link href={`/profile/${tip.userId}`} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: '1px solid var(--gray3)', textDecoration: 'none',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: 'var(--gold)', overflow: 'hidden' }}>
          {tip.userAvatar ? <img src={tip.userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (tip.username || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--white)', marginBottom: 2 }}>{tip.username}</p>
          <p style={{ fontSize: 11, color: 'var(--gray)' }}>Voir le profil →</p>
        </div>
      </Link>

      {/* Stats */}
      <div style={{ display: 'flex', margin: '16px', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gray3)' }}>
        {[
          { label: 'Vues', value: viewsCount, color: 'var(--white)' },
          { label: 'Commentaires 💬', value: commentsCount, color: 'var(--blue)', onClick: () => setShowComments(v => !v) },
          { label: 'Thanks 👍', value: thanksCount, color: '#7C4DFF' },
        ].map((s, i) => (
          <button key={s.label} onClick={s.onClick} style={{
            flex: 1, padding: '16px 0', textAlign: 'center',
            background: 'var(--card)', border: 'none', cursor: s.onClick ? 'pointer' : 'default',
            borderRight: i < 2 ? '1px solid var(--gray3)' : 'none',
          }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Comments section */}
      <div style={{ margin: '0 16px' }}>
        <button onClick={() => setShowComments(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          background: 'var(--card)', border: '1px solid var(--gray3)', borderRadius: 12,
          cursor: 'pointer', marginBottom: 12,
        }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>
            Voir {commentsCount} commentaires
          </span>
          <span style={{ color: 'var(--gray)', fontSize: 14 }}>{showComments ? '▲' : '▼'}</span>
        </button>

        {showComments && (
          <div style={{ marginBottom: 16 }}>
            {/* Input */}
            {user && (
              <div style={{ marginBottom: 16 }}>
                {replyTo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--card)', borderRadius: '10px 10px 0 0', border: '1px solid var(--gray3)', borderBottom: 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--blue)', flex: 1 }}>↩ Répondre à @{replyTo}</span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', fontSize: 16 }}>✕</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value.slice(0, 150))}
                    placeholder={replyTo ? `Répondre à @${replyTo}...` : 'Ajouter un commentaire...'}
                    style={{
                      flex: 1, background: 'var(--card)', border: '1px solid var(--gray3)',
                      borderRadius: 12, padding: '12px 14px', color: 'var(--white)', fontSize: 13,
                      resize: 'none', height: 60, outline: 'none',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  />
                  <button onClick={sendComment} disabled={!commentText.trim()} style={{
                    width: 40, height: 40, borderRadius: '50%', background: 'var(--gold)', border: 'none',
                    cursor: 'pointer', fontSize: 16, opacity: commentText.trim() ? 1 : 0.4,
                  }}>➤</button>
                </div>
              </div>
            )}
            {comments.length === 0
              ? <p style={{ color: 'var(--gray)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun commentaire. Sois le premier ! 👇</p>
              : comments.map(c => <CommentBubble key={c.id} comment={c} onReply={setReplyTo} />)
            }
          </div>
        )}
      </div>

      {/* Thanks section */}
      {!isOwnTip && !isCreatorType && user && (
        <div style={{
          margin: '0 16px 16px', padding: 16, borderRadius: 12,
          background: 'rgba(124,77,255,0.08)', border: '1px solid rgba(124,77,255,0.25)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 24 }}>👍</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)', marginBottom: 3 }}>Ce tip t'a aidé ?</p>
            <p style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.5 }}>
              Envoie {THANKS_COST} GA Points à {tip.username}{'\n'}
              <span style={{ color: '#7C4DFF', fontWeight: 700 }}>Tes points : {gaPoints} pts</span>
            </p>
          </div>
          <button onClick={() => gaPoints >= THANKS_COST ? setShowThanksModal(true) : toast.error(`Il te faut ${THANKS_COST} GA Points`)} disabled={thankLoading} style={{
            padding: '9px 14px', borderRadius: 20, border: 'none', background: '#7C4DFF',
            color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            opacity: thankLoading ? 0.7 : 1,
          }}>{thankLoading ? '...' : `Thanks · ${THANKS_COST} pts`}</button>
        </div>
      )}

      {/* Fanbase CTA */}
      {!isOwnTip && tip.accountType !== 'gamer' && (
        <Link href={`/fanbase/${tip.userId}`} style={{
          display: 'flex', alignItems: 'center', gap: 14, margin: '0 16px 16px', padding: 16,
          background: 'rgba(0,212,255,0.06)', borderRadius: 12, border: '1px solid rgba(0,212,255,0.2)',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)', marginBottom: 3 }}>Rejoins la Fanbase de {tip.username}</p>
            <p style={{ fontSize: 11, color: 'var(--gray)' }}>Clips exclusifs, tips privés & chat direct · $4.99/mois</p>
          </div>
          <span style={{ color: 'var(--blue)', fontSize: 16 }}>›</span>
        </Link>
      )}
    </div>
  );
}
