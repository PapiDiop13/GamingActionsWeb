// FramedAvatar — port fidèle du mobile (ElectricEffect.js + FramedAvatar.js)
// Usage: <FramedAvatar user={userDoc} size={40} />
// user doit avoir : avatar/avatarUrl, username, equippedFrame, isChampion?, plan?

import { FRAMES } from '@/lib/frames';

function getFrame(id) {
  if (!id || id === 'none') return null;
  return FRAMES.find(f => f.id === id) || null;
}

// ─── Keyframes injectées une seule fois ───────────────────────────────────────
const KEYFRAMES = `
  @keyframes fa-rotate     { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
  @keyframes fa-rotate-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg);    } }
  @keyframes fa-halo {
    0%, 100% { opacity: 0.1; }
    50%       { opacity: 0.35; }
  }
  @keyframes fa-pulse {
    0%, 100% { box-shadow: 0 0 6px 2px var(--fa-color); opacity: 0.8; }
    50%       { box-shadow: 0 0 18px 6px var(--fa-color); opacity: 1; }
  }
  @keyframes fa-electric {
    0%, 100% { box-shadow: 0 0 8px 3px var(--fa-color), 0 0 20px 8px var(--fa-color-dim); }
    25%       { box-shadow: 0 0 4px 1px var(--fa-color), 0 0 12px 4px var(--fa-color-dim); }
    50%       { box-shadow: 0 0 16px 6px var(--fa-color), 0 0 32px 12px var(--fa-color-dim); }
    75%       { box-shadow: 0 0 6px 2px var(--fa-color), 0 0 14px 5px var(--fa-color-dim); }
  }
`;

// ─── Dots SVG sur le pourtour du ring ────────────────────────────────────────
// Tourne avec le div parent (animation fa-rotate)
function RingDots({ totalSize, ringR, count = 8 }) {
  const cx = totalSize / 2;
  const cy = totalSize / 2;
  return (
    <svg
      width={totalSize} height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 2 * Math.PI;
        const x = cx + ringR * Math.cos(angle);
        const y = cy + ringR * Math.sin(angle);
        return (
          <circle
            key={i} cx={x} cy={y} r={1.8}
            fill={i % 2 === 0 ? 'rgba(255,224,102,0.95)' : '#C9A84C'}
          />
        );
      })}
    </svg>
  );
}

// ─── Champion Frame ───────────────────────────────────────────────────────────
// Reproduit exactement RotatingElectricRing + crown du mobile
function ChampionFrame({ size, av, initial }) {
  const GOLD  = '#C9A84C';
  const GOLD2 = '#FFE066';
  const bw    = size >= 60 ? 3 : 2;

  // Miroir exact des constantes mobile
  const outerD  = size + 10;   // outer ring diameter (mobile: ring = size + 8, bord 3px)
  const innerD  = size + 4;    // inner ring diameter (mobile: inner = size + 2, bord 1.5px)
  const haloD   = size + 18;   // halo diameter
  const outerOff = (outerD - size) / 2;
  const innerOff = (innerD - size) / 2;
  const haloOff  = (haloD  - size) / 2;

  const crownSize = Math.max(Math.round(size * 0.40), 11);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, overflow: 'visible' }}>
      <style>{KEYFRAMES}</style>

      {/* 👑 Crown — au-dessus, centré, avec glow doré */}
      <div style={{
        position: 'absolute',
        top: -(crownSize * 0.62),
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: crownSize,
        lineHeight: 1,
        zIndex: 20,
        filter: `drop-shadow(0 0 5px ${GOLD2}) drop-shadow(0 0 3px ${GOLD})`,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>👑</div>

      {/* Halo pulsé derrière tout */}
      <div style={{
        position: 'absolute',
        top: -haloOff, left: -haloOff,
        width: haloD, height: haloD,
        borderRadius: '50%',
        background: GOLD,
        animation: 'fa-halo 1.4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Anneau extérieur doré rotatif (dashed) — avec 8 dots qui tournent avec lui */}
      <div style={{
        position: 'absolute',
        top: -outerOff, left: -outerOff,
        width: outerD, height: outerD,
        borderRadius: '50%',
        border: `3px dashed ${GOLD2}`,
        boxShadow: `0 0 6px ${GOLD2}, 0 0 14px ${GOLD}60`,
        animation: 'fa-rotate 2.5s linear infinite',
        pointerEvents: 'none',
      }}>
        <RingDots totalSize={outerD} ringR={outerD / 2} count={8} />
      </div>

      {/* Anneau intérieur (dotted) contre-rotatif */}
      <div style={{
        position: 'absolute',
        top: -innerOff, left: -innerOff,
        width: innerD, height: innerD,
        borderRadius: '50%',
        border: `1.5px dotted ${GOLD}`,
        animation: 'fa-rotate-rev 4s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* Avatar (cercle, overflow hidden) */}
      <div style={{
        position: 'relative', zIndex: 5,
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden', background: 'rgba(201,168,76,0.2)',
        border: `${bw}px solid ${GOLD2}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {av
          ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: GOLD2, fontWeight: 900, fontSize: size * 0.35, lineHeight: 1 }}>{initial}</span>
        }
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FramedAvatar({ user, size = 40, style = {} }) {
  const EXCLUDED = ['creator', 'gameconic'];
  const isExcluded = EXCLUDED.includes(user?.accountType);
  const isChampion = (!!user?.isChampion || user?.equippedFrame === 'champion') && !isExcluded;

  const av      = user?.avatarUrl || user?.avatar;
  const initial = (user?.username || 'GA').slice(0, 2).toUpperCase();
  const bw      = size >= 60 ? 3 : 2;

  // ── Champion → RotatingElectricRing (identique mobile) ──────────────────
  if (isChampion) {
    return <ChampionFrame size={size} av={av} initial={initial} />;
  }

  const frame = getFrame(user?.equippedFrame);

  // ── Pas de frame / ring simple ───────────────────────────────────────────
  if (!frame || (!frame.glow && !frame.animated && !frame.electric)) {
    const isLeg = user?.plan === 'legendary';
    const borderColor = isLeg ? '#C9A84C' : (frame ? frame.color : '#2A2A3A');
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `${bw}px solid ${borderColor}`,
        overflow: 'hidden', flexShrink: 0, background: '#1A1A26',
        display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
      }}>
        {av
          ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: borderColor, fontWeight: 900, fontSize: size * 0.38, lineHeight: 1 }}>{initial}</span>
        }
      </div>
    );
  }

  const color = frame.color || '#2A2A3A';

  // ── Electric (frames payantes électriques) ────────────────────────────────
  if (frame.electric) {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          border: `${bw}px solid ${color}`,
          overflow: 'hidden', flexShrink: 0, background: '#1A1A26',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '--fa-color': color, '--fa-color-dim': color + '55',
          animation: 'fa-electric 0.8s ease-in-out infinite',
          ...style,
        }}>
          {av
            ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color, fontWeight: 900, fontSize: size * 0.38, lineHeight: 1 }}>{initial}</span>
          }
        </div>
      </>
    );
  }

  // ── Animated frames — spin ou pulse ─────────────────────────────────────
  if (frame.animated) {
    const SPIN_IDS = ['neon_pulse_blue','neon_pulse_pink','galaxy_animated','rainbow_animated',
      'lightning_animated','void_animated','nebula_animated','neon_city_animated','cosmic_animated','blizzard_animated'];
    const isSpin = SPIN_IDS.includes(frame.id);

    if (isSpin) {
      const outerD = size + 10;
      const innerD = size + 4;
      const outerOff = (outerD - size) / 2;
      const innerOff = (innerD - size) / 2;
      return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, overflow: 'visible', ...style }}>
          <style>{KEYFRAMES}</style>
          {/* Halo */}
          <div style={{ position: 'absolute', top: -(outerOff + 3), left: -(outerOff + 3), width: outerD + 6, height: outerD + 6, borderRadius: '50%', background: color, opacity: 0.18, pointerEvents: 'none' }} />
          {/* Outer rotating arc */}
          <div style={{ position: 'absolute', top: -outerOff, left: -outerOff, width: outerD, height: outerD, borderRadius: '50%', border: `3px solid ${color}`, borderTopColor: 'transparent', borderRightColor: 'transparent', animation: 'fa-rotate 2.5s linear infinite', boxShadow: `0 0 6px ${color}`, pointerEvents: 'none' }} />
          {/* Inner pulsed ring */}
          <div style={{ position: 'absolute', top: -innerOff, left: -innerOff, width: innerD, height: innerD, borderRadius: '50%', border: `1.5px solid ${color}`, '--fa-color': color, animation: 'fa-pulse 1.6s ease-in-out infinite', pointerEvents: 'none' }} />
          {/* Avatar */}
          <div style={{ position: 'relative', zIndex: 5, width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#1A1A26', border: `${bw}px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {av ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color, fontWeight: 900, fontSize: size * 0.38, lineHeight: 1 }}>{initial}</span>}
          </div>
        </div>
      );
    }

    // PulsingRing classique
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          border: `${bw}px solid ${color}`,
          overflow: 'hidden', flexShrink: 0, background: '#1A1A26',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '--fa-color': color,
          animation: 'fa-pulse 1.6s ease-in-out infinite',
          ...style,
        }}>
          {av
            ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color, fontWeight: 900, fontSize: size * 0.38, lineHeight: 1 }}>{initial}</span>
          }
        </div>
      </>
    );
  }

  // ── Glow statique ─────────────────────────────────────────────────────────
  const glowShadow = `0 0 ${Math.round(size * 0.2)}px ${color}80, 0 0 ${Math.round(size * 0.08)}px ${color}40`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${bw}px solid ${color}`,
      boxShadow: glowShadow,
      overflow: 'hidden', flexShrink: 0, background: '#1A1A26',
      display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      {av
        ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color, fontWeight: 900, fontSize: size * 0.38, lineHeight: 1 }}>{initial}</span>
      }
    </div>
  );
}
