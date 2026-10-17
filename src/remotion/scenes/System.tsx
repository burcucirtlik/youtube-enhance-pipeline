// Sistem tasarımı sahnesi: aktörler (rolüne göre ikon), aralarında akan mesajlar ve sonuç durumları.
// İkonlar emoji değil, marka çizgisinde çizilmiş SVG: her tarayıcıda/render'da aynı görünür, siberpunk dile uyar.

import React from 'react';
import {Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../../brand/brand';
import {SYSTEM_STATES, type ActorRole, type SystemActor, type SystemEvent, type SystemState} from '../../shared/system-diagram';
import {Decode, fill, fonts, glow, H, useTone, W} from '../theme';

const ICON = 220; // ikon kutusu (px); telefonda da seçilsin
const Y = 470; // aktörlerin dikey merkezi

// ── İkonlar (viewBox 0 0 100 100, yalnızca çizgi) ─────────────────────────────

const Glyph: React.FC<{role: ActorRole; color: string}> = ({role, color}) => {
  const p = {fill: 'none', stroke: color, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  switch (role) {
    case 'person':
      return (
        <g {...p}>
          <circle cx="50" cy="30" r="15" />
          <path d="M20 88 C20 64 34 54 50 54 C66 54 80 64 80 88 Z" />
        </g>
      );
    case 'hacker':
      return (
        <g {...p}>
          <path d="M22 88 C22 60 30 40 50 14 C70 40 78 60 78 88 Z" />
          <path d="M36 52 C40 44 60 44 64 52 C60 62 40 62 36 52 Z" />
          <path d="M42 53 L46 53 M54 53 L58 53" strokeWidth={4} />
        </g>
      );
    case 'server':
      return (
        <g {...p}>
          {[14, 40, 66].map((y) => (
            <g key={y}>
              <rect x="16" y={y} width="68" height="22" rx="3" />
              <circle cx="27" cy={y + 11} r="2.5" fill={color} />
              <path d={`M50 ${y + 11} L74 ${y + 11}`} />
            </g>
          ))}
        </g>
      );
    case 'database':
      return (
        <g {...p}>
          <ellipse cx="50" cy="22" rx="32" ry="10" />
          <path d="M18 22 L18 78 C18 84 32 88 50 88 C68 88 82 84 82 78 L82 22" />
          <path d="M18 41 C18 47 32 51 50 51 C68 51 82 47 82 41" />
          <path d="M18 60 C18 66 32 70 50 70 C68 70 82 66 82 60" />
        </g>
      );
    case 'agent':
      return (
        <g {...p}>
          <rect x="20" y="30" width="60" height="48" rx="10" />
          <path d="M50 30 L50 16" />
          <circle cx="50" cy="13" r="4" />
          <circle cx="38" cy="52" r="5" fill={color} />
          <circle cx="62" cy="52" r="5" fill={color} />
          <path d="M38 66 L62 66" />
          <path d="M20 50 L12 50 M80 50 L88 50" />
        </g>
      );
    case 'browser':
      return (
        <g {...p}>
          <rect x="10" y="18" width="80" height="64" rx="5" />
          <path d="M10 32 L90 32" />
          <circle cx="19" cy="25" r="2" fill={color} />
          <circle cx="27" cy="25" r="2" fill={color} />
          <path d="M22 46 L60 46 M22 58 L78 58 M22 70 L50 70" />
        </g>
      );
    case 'phone':
      return (
        <g {...p}>
          <rect x="30" y="10" width="40" height="80" rx="7" />
          <path d="M44 18 L56 18" />
          <circle cx="50" cy="80" r="3" />
        </g>
      );
    case 'cloud':
      return (
        <g {...p}>
          <path d="M28 76 C14 76 10 62 20 55 C16 40 34 32 44 40 C50 24 76 26 76 46 C90 46 92 76 74 76 Z" />
        </g>
      );
    case 'queue':
      return (
        <g {...p}>
          {[14, 34, 54].map((x) => (
            <rect key={x} x={x} y="34" width="16" height="32" rx="2" />
          ))}
          <path d="M74 50 L90 50 M84 44 L90 50 L84 56" />
        </g>
      );
    case 'file':
      return (
        <g {...p}>
          <path d="M26 10 L62 10 L78 26 L78 90 L26 90 Z" />
          <path d="M62 10 L62 26 L78 26" />
          <path d="M36 46 L68 46 M36 58 L68 58 M36 70 L56 70" />
        </g>
      );
    case 'company':
      return (
        <g {...p}>
          <path d="M18 88 L18 24 L52 12 L52 88" />
          <path d="M52 40 L82 40 L82 88" />
          <path d="M10 88 L90 88" />
          <path d="M28 34 L30 34 M40 34 L42 34 M28 50 L30 50 M40 50 L42 50 M28 66 L30 66 M40 66 L42 66 M64 54 L66 54 M64 70 L66 70" strokeWidth={5} />
        </g>
      );
    case 'shield':
      return (
        <g {...p}>
          <path d="M50 10 L82 22 L82 48 C82 70 66 84 50 90 C34 84 18 70 18 48 L18 22 Z" />
          <path d="M36 50 L46 60 L66 40" />
        </g>
      );
    default:
      return (
        <g {...p}>
          <rect x="16" y="22" width="68" height="56" rx="6" />
        </g>
      );
  }
};

// ── Zamanlama ─────────────────────────────────────────────────────────────────

/** Olay i'nin başladığı kare: aktörler girdikten sonra kalan süre olaylar arasında eşit bölünür. */
const useSchedule = (n: number) => {
  const {durationInFrames} = useVideoConfig();
  const start = 18;
  const slot = Math.max(12, (durationInFrames - start - 14) / Math.max(1, n));
  return (i: number) => start + i * slot;
};

const xsFor = (n: number) => (n <= 2 ? [W / 2 - 430, W / 2 + 430] : [W / 2 - 600, W / 2, W / 2 + 600]);

const STATE_LABEL: Record<SystemState, string> = {
  çöker: 'ÇÖKTÜ',
  yavaşlar: 'YAVAŞLADI',
  kilitlenir: 'KİLİTLENDİ',
  reddeder: 'REDDETTİ',
  sızdırır: 'SIZINTI',
  'kabul eder': 'KABUL',
  'cevap verir': 'CEVAP',
};
const isBad = (s: SystemState) => SYSTEM_STATES.find((x) => x.state === s)!.bad;

// ── Sahne ─────────────────────────────────────────────────────────────────────

export const System: React.FC<{actors: SystemActor[]; events: SystemEvent[]}> = ({actors, events}) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const at = useSchedule(events.length);
  const xs = xsFor(actors.length);
  const danger = brand.colors.danger;

  // Her aktörün o ana kadarki son durumu.
  const stateOf = (a: number): {state: SystemState; since: number} | null => {
    let cur: {state: SystemState; since: number} | null = null;
    events.forEach((e, i) => {
      if (e.kind === 'state' && e.actor === a && frame >= at(i)) cur = {state: e.state, since: at(i)};
    });
    return cur;
  };

  // "cevap verir": son mesajı ona gönderen aktöre geri ok.
  const replyTarget = (i: number, a: number) => {
    for (let k = i - 1; k >= 0; k--) {
      const e = events[k];
      if (e.kind === 'msg' && e.to === a) return e.from;
    }
    return null;
  };

  const arrows: {from: number; to: number; label?: string; t0: number; reply?: boolean; bounce?: boolean}[] = [];
  events.forEach((e, i) => {
    if (e.kind === 'msg') arrows.push({from: e.from, to: e.to, label: e.label, t0: at(i)});
    if (e.kind === 'state' && e.state === 'cevap verir') {
      const back = replyTarget(i, e.actor);
      if (back !== null) arrows.push({from: e.actor, to: back, label: 'cevap', t0: at(i), reply: true});
    }
  });

  return (
    <div style={{...fill}}>
      <svg width={W} height={H} style={fill}>
        <defs>
          <marker id="sys-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill={tone.accent2} />
          </marker>
        </defs>
        {arrows.map((a, k) => {
          const dir = Math.sign(xs[a.to] - xs[a.from]) || 1;
          const x1 = xs[a.from] + dir * (ICON / 2 + 26);
          const x2 = xs[a.to] - dir * (ICON / 2 + 26);
          // Aynı aktör çifti arasında gidiş üstte, dönüş altta.
          const y = Y + (dir > 0 ? -28 : 34) + (a.reply ? 0 : 0);
          const draw = interpolate(frame, [a.t0, a.t0 + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const travel = interpolate(frame, [a.t0 + 4, a.t0 + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
          if (frame < a.t0) return null;
          const xe = x1 + (x2 - x1) * draw;
          const px = x1 + (x2 - x1) * travel;
          return (
            <g key={k}>
              <line x1={x1} y1={y} x2={xe} y2={y} stroke={tone.accent2} strokeWidth={3} strokeDasharray={a.reply ? '10 8' : undefined} markerEnd={draw > 0.95 ? 'url(#sys-head)' : undefined} opacity={0.9} />
              {travel < 1 ? <circle cx={px} cy={y} r={11} fill={tone.accent} style={{filter: `drop-shadow(0 0 10px ${tone.accent})`}} /> : null}
              {a.label ? (
                <text x={(x1 + x2) / 2} y={y + (dir > 0 ? -22 : 44)} textAnchor="middle" fontFamily={fonts.mono} fontSize={36} fill={brand.colors.text} opacity={draw}>
                  {a.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {actors.map((actor, a) => {
        const enter = interpolate(frame, [a * 4, a * 4 + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4))});
        const st = stateOf(a);
        const bad = st ? isBad(st.state) : false;
        const color = bad ? danger : tone.accent;
        const age = st ? frame - st.since : 0;
        // Çökme: ilk 14 karede sarsıntı + renk kayması.
        const shake = st?.state === 'çöker' && age < 14 ? (random(`sh-${a}-${frame}`) - 0.5) * 26 * (1 - age / 14) : 0;
        const glitchFx = st?.state === 'çöker' && age < 14 ? `drop-shadow(${shake * 0.6}px 0 0 rgba(255,42,109,0.9)) drop-shadow(${-shake * 0.6}px 0 0 rgba(0,229,255,0.8))` : `drop-shadow(0 0 12px ${color})`;
        const stateIn = interpolate(age, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
        return (
          <div key={a} style={{position: 'absolute', left: xs[a] - 220, top: Y - ICON / 2 - 10, width: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: enter, transform: `translate(${shake}px, ${(1 - enter) * 30}px)`}}>
            <div style={{position: 'relative', width: ICON, height: ICON}}>
              {/* Kalabalık ("700 × Ajan"): arkada iki kopya + sayı rozeti */}
              {actor.count ? (
                <>
                  <svg viewBox="0 0 100 100" width={ICON * 0.8} height={ICON * 0.8} style={{position: 'absolute', left: -38, top: 10, opacity: 0.35}}>
                    <Glyph role={actor.role} color={color} />
                  </svg>
                  <svg viewBox="0 0 100 100" width={ICON * 0.8} height={ICON * 0.8} style={{position: 'absolute', right: -38, top: 10, opacity: 0.35}}>
                    <Glyph role={actor.role} color={color} />
                  </svg>
                </>
              ) : null}
              <svg viewBox="0 0 100 100" width={ICON} height={ICON} style={{position: 'relative', filter: glitchFx}}>
                <Glyph role={actor.role} color={color} />
              </svg>
              {actor.count ? (
                <div style={{position: 'absolute', right: -50, top: -18, padding: '2px 12px', border: `2px solid ${tone.accent2}`, background: 'rgba(2,8,5,0.9)', color: tone.accent2, fontFamily: fonts.mono, fontSize: 30, ...glow(tone.accent2, 0.4)}}>
                  ×{actor.count}
                </div>
              ) : null}
              {/* Durum işaretleri */}
              {st?.state === 'çöker' ? (
                <svg viewBox="0 0 100 100" width={ICON} height={ICON} style={{position: 'absolute', inset: 0, opacity: stateIn}}>
                  <path d="M18 18 L82 82 M82 18 L18 82" stroke={danger} strokeWidth={9} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px ${danger})`}} />
                </svg>
              ) : null}
              {st?.state === 'kilitlenir' ? (
                <svg viewBox="0 0 40 40" width={70} height={70} style={{position: 'absolute', right: -24, top: -24, opacity: stateIn}}>
                  <rect x="8" y="18" width="24" height="18" rx="3" fill="rgba(2,8,5,0.9)" stroke={danger} strokeWidth={3} />
                  <path d="M13 18 L13 12 C13 4 27 4 27 12 L27 18" fill="none" stroke={danger} strokeWidth={3} />
                </svg>
              ) : null}
              {st?.state === 'kabul eder' ? (
                <svg viewBox="0 0 40 40" width={70} height={70} style={{position: 'absolute', right: -24, top: -24, opacity: stateIn}}>
                  <circle cx="20" cy="20" r="17" fill="rgba(2,8,5,0.9)" stroke={tone.accent} strokeWidth={3} />
                  <path d="M11 20 L18 27 L30 13" fill="none" stroke={tone.accent} strokeWidth={4} strokeLinecap="round" />
                </svg>
              ) : null}
              {st?.state === 'reddeder' ? (
                <svg viewBox="0 0 40 40" width={70} height={70} style={{position: 'absolute', left: -30, top: -24, opacity: stateIn}}>
                  <circle cx="20" cy="20" r="17" fill="rgba(2,8,5,0.9)" stroke={danger} strokeWidth={3} />
                  <path d="M12 12 L28 28 M28 12 L12 28" stroke={danger} strokeWidth={4} strokeLinecap="round" />
                </svg>
              ) : null}
              {st?.state === 'sızdırır'
                ? [0, 1, 2, 3, 4].map((d) => {
                    const yy = ((age * 3 + d * 22) % 110) + ICON - 10;
                    return <div key={d} style={{position: 'absolute', left: ICON / 2 - 40 + d * 20, top: yy, width: 8, height: 14, borderRadius: 4, background: danger, opacity: 1 - (yy - ICON) / 110, boxShadow: `0 0 8px ${danger}`}} />;
                  })
                : null}
              {st?.state === 'yavaşlar' ? (
                <div style={{position: 'absolute', left: 10, right: 10, bottom: -22, height: 10, border: `2px solid ${danger}`}}>
                  <div style={{height: '100%', width: `${Math.min(92, 8 + age * 0.6)}%`, background: danger}} />
                </div>
              ) : null}
            </div>
            <Decode text={actor.name} delay={a * 4 + 4} style={{marginTop: 34, fontFamily: fonts.display, fontWeight: 700, fontSize: 46, color, whiteSpace: 'nowrap', ...glow(color, 0.5)}} />
            {st && st.state !== 'cevap verir' ? (
              <div style={{marginTop: 10, padding: '3px 14px', border: `2px solid ${color}`, color, fontFamily: fonts.mono, fontSize: 28, letterSpacing: 4, opacity: stateIn, ...glow(color, 0.5)}}>{STATE_LABEL[st.state]}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
