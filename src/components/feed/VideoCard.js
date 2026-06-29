'use client';
import Link from 'next/link';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function getThumbnail(video) {
  if (video?.muxPlaybackId)
    return `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?time=3&width=420&height=748&fit_mode=crop`;
  return video?.thumbnailUrl || video?.thumbnail || null;
}

export default function VideoCard({ video }) {
  const [hovered, setHovered] = useState(false);
  const thumb = getThumbnail(video);
  const ago   = formatDistanceToNow(video.createdAt?.toDate?.() ?? new Date(), { addSuffix: true, locale: fr });
  const av    = video.userAvatar;

  return (
    <Link
      href={`/video/${video.id}`}
      className="group block overflow-hidden transition-all"
      style={{
        borderRadius: 16,
        background: 'var(--card)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => {
        setHovered(true);
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.08)';
      }}
      onMouseLeave={e => {
        setHovered(false);
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '9/16', background: 'var(--dark)' }}>
        {thumb ? (
          <img
            src={thumb}
            alt={video.title || ''}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200" style={{
          background: 'rgba(0,0,0,0.35)',
          opacity: hovered ? 1 : 0,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'var(--black)', fontSize: 20, marginLeft: 3 }}>▶</span>
          </div>
        </div>

        {/* GG badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-1" style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}>
          <span style={{ fontSize: 10 }}>⚡</span>
          <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{video.ggCount || 0}</span>
        </div>

        {/* Game badge */}
        {(video.game || video.genre) && (
          <div className="absolute top-2 left-2 rounded-full px-2 py-0.5" style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
          }}>
            <span className="text-[10px] font-bold" style={{ color: 'var(--white)' }}>
              {video.game || video.genre}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="text-sm font-bold line-clamp-2 mb-2 transition-colors"
          style={{ color: hovered ? 'var(--gold)' : 'var(--white)' }}
        >
          {video.title || 'Sans titre'}
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--card2)', border: '1px solid var(--gray3)' }}>
            {av
              ? <img src={av} alt="" className="w-full h-full object-cover" />
              : <span className="flex items-center justify-center w-full h-full text-[8px] font-black" style={{ color: 'var(--gold)' }}>
                  {(video.username || '?')[0].toUpperCase()}
                </span>
            }
          </div>
          <span className="text-xs truncate" style={{ color: 'var(--gray)' }}>@{video.username || 'gamer'}</span>
          <span className="text-[10px] ml-auto shrink-0" style={{ color: 'var(--gray2)' }}>{ago}</span>
        </div>
      </div>
    </Link>
  );
}
