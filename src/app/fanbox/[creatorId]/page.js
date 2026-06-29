'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, doc, serverTimestamp, getDoc, getDocs, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/stores/useAuthStore';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ACCENT = '#00C853';
const GOLD   = '#C9A84C';
const MEMBER_COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6FF2','#F77F00','#00C9A7','#C77DFF'];
function memberColor(uid = '') {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

export default function FanBoxPage() {
  const { creatorId }           = useParams();
  const router                  = useRouter();
  const { user, userProfile }   = useAuthStore();
  const [creator, setCreator]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [access, setAccess]     = useState(null); // null=checking, true=ok, false=no
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef(null);

  const isCreator = user?.uid === creatorId;

  // Load creator info
  useEffect(() => {
    if (!creatorId) return;
    getDoc(doc(db, 'users', creatorId)).then(snap => {
      if (snap.exists()) setCreator({ uid: creatorId, ...snap.data() });
    });
  }, [creatorId]);

  // Check access
  useEffect(() => {
    if (!user) { setAccess(false); return; }
    if (isCreator) { setAccess(true); return; }
    getDocs(query(
      collection(db, 'fanbase_subscriptions'),
      where('subscriberId', '==', user.uid),
      where('creatorId', '==', creatorId)
    )).then(snap => setAccess(!snap.empty)).catch(() => setAccess(false));
  }, [user?.uid, creatorId, isCreator]);

  // Messages
  useEffect(() => {
    if (access !== true || !creatorId) return;
    const q = query(
      collection(db, 'fanbox_messages', creatorId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
    return () => unsub();
  }, [access, creatorId]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !user) return;
    setSending(true);
    setText('');
    try {
      await addDoc(collection(db, 'fanbox_messages', creatorId, 'messages'), {
        text: trimmed, userId: user.uid,
        username: userProfile?.username || 'Fan',
        avatar: userProfile?.avatar || '',
        createdAt: serverTimestamp(), deleted: false,
      });
    } catch { setText(trimmed); toast.error('Erreur d\'envoi'); }
    setSending(false);
  };

  // ── States ──────────────────────────────────────────────────────────────────
  if (access === null) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="card p-8 text-center max-w-sm">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="font-black text-[#E8F5EE] text-lg mb-2">Connexion requise</h2>
        <p className="text-sm text-[#4A7A5A] mb-5">Connecte-toi pour accéder au FanBox.</p>
        <Link href="/auth" className="btn-primary">Se connecter</Link>
      </div>
    </div>
  );

  if (!access) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="card p-8 text-center max-w-sm border-[#00C853]/30">
        <div className="text-5xl mb-4">🎮</div>
        <h2 className="font-black text-[#E8F5EE] text-lg mb-2">Accès FanBox</h2>
        <p className="text-sm text-[#4A7A5A] mb-2">
          Rejoins le FanBox de <span className="text-[#00C853] font-bold">{creator?.username || 'ce créateur'}</span> pour discuter avec toute la communauté.
        </p>
        <p className="text-xs text-[#2A5A3A] mb-5">🚀 Accès gratuit pendant la phase de lancement</p>
        <Link href={`/profile/${creatorId}`} className="btn-primary">Rejoindre le FanBox</Link>
      </div>
    </div>
  );

  // ── Chat ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]" style={{ background: '#071A0E' }}>
      {/* Header */}
      <div className="border-b border-[#1A4D2E] bg-[#0A2212] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#4A7A5A] hover:text-[#00C853] transition-colors">←</button>
        <div className="w-2 h-2 rounded-full bg-[#00C853] shadow-[0_0_6px_#00C853]" />
        <div>
          <p className="font-black text-sm text-[#E8F5EE]">
            FanBox · <span className="text-[#00C853]">@{creator?.username || creatorId}</span>
          </p>
          <p className="text-[10px] text-[#4A7A5A]">Groupe de fans — {isCreator ? 'Tu es le créateur' : 'Membre'}</p>
        </div>
        {isCreator && (
          <span className="ml-auto text-xs font-bold text-[#C9A84C] bg-[#C9A84C14] border border-[#C9A84C30] rounded-full px-2.5 py-0.5">
            👑 Modération
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-16 text-[#4A7A5A]">
            <p className="text-4xl mb-3">🎮</p>
            <p className="font-bold text-[#E8F5EE] mb-1">FanBox ouvert !</p>
            <p className="text-sm">Sois le premier à écrire dans ce groupe.</p>
          </div>
        )}
        {messages.filter(m => !m.deleted).map(msg => {
          const isOwn       = msg.userId === user?.uid;
          const isCreatorMsg = msg.userId === creatorId;
          const color       = isCreatorMsg ? GOLD : memberColor(msg.userId);

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full border overflow-hidden shrink-0" style={{ borderColor: color }}>
                {msg.avatar
                  ? <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-black bg-[#0E1A12]" style={{ color }}>{(msg.username || '?')[0]}</div>
                }
              </div>

              <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-black mb-1" style={{ color }}>
                  {isCreatorMsg ? '👑 ' : ''}{msg.username || 'Fan'}
                </span>
                <div
                  className="rounded-2xl px-3 py-2"
                  style={{
                    background: isOwn ? '#1A5C32' : isCreatorMsg ? '#1C1200' : '#122B1A',
                    borderBottomRightRadius: isOwn ? 4 : undefined,
                    borderBottomLeftRadius: !isOwn ? 4 : undefined,
                    border: isCreatorMsg ? '1px solid rgba(201,168,76,0.3)' : '1px solid #1A4D2E',
                  }}
                >
                  <p className="text-sm text-[#E8F5EE] leading-relaxed">{msg.text}</p>
                  <p className="text-[9px] text-[#4A7A5A] mt-1 text-right">
                    {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: fr }) : ''}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1A4D2E] bg-[#0D2618] px-4 py-3 flex items-end gap-3">
        <div className="w-8 h-8 rounded-full border border-[#00C853] overflow-hidden shrink-0">
          {userProfile?.avatar
            ? <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xs font-black text-[#00C853] bg-[#0E1A12]">{(userProfile?.username || '?')[0]}</div>
          }
        </div>
        <textarea
          className="flex-1 bg-[#0E1A12] border border-[#1A4D2E] rounded-xl px-3 py-2 text-sm text-[#E8F5EE] placeholder-[#4A7A5A] focus:outline-none focus:border-[#00C853] resize-none max-h-28"
          placeholder="Message au groupe..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0"
          style={{ background: text.trim() ? ACCENT : '#1A4D2E', boxShadow: text.trim() ? `0 0 12px ${ACCENT}50` : undefined }}
        >
          <span className="text-black font-black text-sm">→</span>
        </button>
      </div>
    </div>
  );
}
