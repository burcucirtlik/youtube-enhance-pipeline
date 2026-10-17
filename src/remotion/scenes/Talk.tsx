// Konuşmayı destekleyen sahneler: yapay zekâ sohbeti, grafik, numaralı liste, kaynak rozeti.

import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../../brand/brand';
import type {ListItem} from '../../shared/types';
import {Decode, fonts, glow, Panel, useEnter, useTone} from '../theme';

const P = brand.frame.padding;

// ── Sohbet ──────────────────────────────────────────────────────────────────

/**
 * Kullanıcı ve yapay zekâ sırayla konuşur; yapay zekânın cevabı yazılıyormuş gibi akar.
 * Mesajlar sahne süresine uzunluklarıyla orantılı yayılır.
 */
export const Chat: React.FC<{assistant: string; turns: string[]}> = ({assistant, turns}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const tone = useTone();
  const v = useEnter(0);
  const usable = Math.max(20, durationInFrames - 26);
  const weights = turns.map((t, i) => (i % 2 ? t.length : t.length * 0.4) + 12);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 8;
  const starts = weights.map((w) => {
    const s = acc;
    acc += (w / total) * usable;
    return s;
  });
  return (
    <div style={{position: 'absolute', inset: P, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Panel label={assistant.toLocaleUpperCase('tr-TR')} style={{width: 1300, padding: '40px 46px', opacity: v, transform: `translateY(${(1 - v) * 30}px)`}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
          {turns.map((t, i) => {
            if (frame < starts[i]) return null;
            const user = i % 2 === 0;
            const age = frame - starts[i];
            const shown = user ? t : t.slice(0, Math.floor(age * 2.4)); // ~70 harf/sn
            const typing = !user && shown.length < t.length;
            const c = user ? tone.accent2 : tone.accent;
            return (
              <div key={i} style={{alignSelf: user ? 'flex-end' : 'flex-start', maxWidth: '82%', opacity: Math.min(1, age / 5)}}>
                <div style={{fontFamily: fonts.mono, fontSize: 20, letterSpacing: 3, color: c, marginBottom: 6, textAlign: user ? 'right' : 'left'}}>{user ? 'SEN' : assistant.toLocaleUpperCase('tr-TR')}</div>
                <div style={{border: `2px solid ${c}`, background: user ? 'rgba(0,229,255,0.06)' : 'rgba(0,255,136,0.06)', padding: '16px 24px', fontFamily: fonts.body, fontSize: t.length > 140 ? 32 : 38, lineHeight: 1.4, color: brand.colors.text, boxShadow: `0 0 18px -8px ${c}`}}>
                  {shown}
                  {typing ? <span style={{color: c, opacity: Math.floor(frame / 8) % 2 ? 1 : 0.2}}>▌</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

// ── Grafik ──────────────────────────────────────────────────────────────────

export const Chart: React.FC<{points: {label: string; value: number; display: string}[]; unit?: string; style: 'bar' | 'line'}> = ({points, unit, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tone = useTone();
  const max = Math.max(...points.map((p) => p.value), 0) || 1;
  const w = 1400;
  const h = 560;
  const gap = w / points.length;
  const grow = (i: number) => spring({frame: frame - 8 - i * 7, fps, config: {damping: 18, mass: 0.7}});
  const xs = points.map((_, i) => gap * i + gap / 2);
  const ys = points.map((p, i) => h - (p.value / max) * h * (style === 'line' ? Math.min(1, grow(i)) : 1));
  const draw = interpolate(frame, [8, 8 + points.length * 8], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return (
    <div style={{position: 'absolute', inset: P, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      {unit ? <div style={{fontFamily: fonts.mono, fontSize: 26, letterSpacing: 4, color: tone.accent2, marginBottom: 22, alignSelf: 'flex-start', marginLeft: 120}}>{`// ${unit.toLocaleUpperCase('tr-TR')}`}</div> : null}
      <svg width={w} height={h + 90} style={{overflow: 'visible'}}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={0} x2={w} y1={h - g * h} y2={h - g * h} stroke={tone.accent} strokeOpacity={0.12} />
        ))}
        <line x1={0} x2={w} y1={h} y2={h} stroke={tone.accent} strokeOpacity={0.6} strokeWidth={2} />
        {style === 'bar'
          ? points.map((p, i) => {
              const g = grow(i);
              const bh = (p.value / max) * h * Math.min(1, g);
              const last = i === points.length - 1;
              const c = last ? tone.accent : tone.accent2;
              return (
                <g key={i}>
                  <rect x={xs[i] - gap * 0.3} y={h - bh} width={gap * 0.6} height={bh} fill={c} fillOpacity={0.18} stroke={c} strokeWidth={3} style={{filter: last ? `drop-shadow(0 0 14px ${c})` : undefined}} />
                  <text x={xs[i]} y={h - bh - 18} textAnchor="middle" fontFamily={fonts.display} fontWeight={700} fontSize={48} fill={c} opacity={Math.min(1, g)}>
                    {p.display}
                  </text>
                </g>
              );
            })
          : (
              <>
                <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} fill="none" stroke={tone.accent} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{filter: `drop-shadow(0 0 10px ${tone.accent})`}} />
                {points.map((p, i) =>
                  draw * points.length >= i + 0.5 ? (
                    <g key={i}>
                      <circle cx={xs[i]} cy={ys[i]} r={10} fill={tone.accent} />
                      <text x={xs[i]} y={ys[i] - 24} textAnchor="middle" fontFamily={fonts.display} fontWeight={700} fontSize={44} fill={tone.accent}>
                        {p.display}
                      </text>
                    </g>
                  ) : null,
                )}
              </>
            )}
        {points.map((p, i) => (
          <text key={i} x={xs[i]} y={h + 52} textAnchor="middle" fontFamily={fonts.mono} fontSize={32} fill={brand.colors.text} opacity={0.85}>
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ── Liste ───────────────────────────────────────────────────────────────────

/** Numaralı maddeler; her madde kendi anında (offsetSec) gelir, en son gelen vurgulanır. */
export const List: React.FC<{items: ListItem[]}> = ({items}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tone = useTone();
  const at = items.map((it, i) => Math.round((it.offsetSec ?? i * 1.2) * fps));
  const current = at.reduce((a, f, i) => (frame >= f ? i : a), -1);
  return (
    <div style={{position: 'absolute', inset: P, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 140, gap: 26}}>
      {items.map((it, i) => {
        if (frame < at[i]) return null;
        const v = spring({frame: frame - at[i], fps, config: brand.motion.spring});
        const on = i === current;
        const c = on ? tone.accent : brand.colors.muted;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 34, opacity: v * (on ? 1 : 0.7), transform: `translateX(${(1 - v) * -40}px)`}}>
            <div style={{width: 92, height: 92, flexShrink: 0, border: `3px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.display, fontWeight: 700, fontSize: 50, color: c, ...(on ? glow(c, 0.6) : {})}}>{i + 1}</div>
            <Decode text={it.text} style={{fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: on ? tone.accent : brand.colors.text, ...(on ? glow(tone.accent, 0.4) : {})}} />
          </div>
        );
      })}
    </div>
  );
};

// ── Kaynak rozeti (kameranın üstünde) ───────────────────────────────────────

export const SourceBadge: React.FC<{name: string; date?: string}> = ({name, date}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const tone = useTone();
  const v = useEnter(0);
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', right: P, top: 70, opacity: Math.min(v, out), transform: `translateX(${(1 - v) * 40}px)`, background: 'rgba(2,8,5,0.82)', border: `2px solid ${tone.accent2}`, padding: '12px 22px', boxShadow: `0 0 18px -6px ${tone.accent2}`}}>
      <div style={{fontFamily: fonts.mono, fontSize: 18, letterSpacing: 4, color: tone.accent2, marginBottom: 4}}>{'// KAYNAK'}</div>
      <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 38, color: brand.colors.text}}>
        {name}
        {date ? <span style={{fontFamily: fonts.mono, fontWeight: 400, fontSize: 26, color: brand.colors.muted}}>{`  ·  ${date}`}</span> : null}
      </div>
    </div>
  );
};
