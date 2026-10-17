// Kameranın üstünde çizilenler: yüz görünür kalır, arka plan yok.
// Alt bant (kişi/kurum kartı) ve vurgu (kısa kinetik metin).

import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../../brand/brand';
import {Decode, fonts, glow, useEnter, useTone} from '../theme';

/** Sahnenin son karelerinde yumuşak çıkış (alt bant ve vurgu kendi giriş/çıkışını yapar). */
const useExit = (frames = 8) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return interpolate(frame, [durationInFrames - frames, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

export const LowerThird: React.FC<{name: string; title?: string}> = ({name, title}) => {
  const tone = useTone();
  const v = useEnter(0);
  const out = useExit();
  const bar = interpolate(v, [0, 1], [0, 1]);
  return (
    <div style={{position: 'absolute', left: brand.frame.padding, bottom: 110, opacity: out, transform: `translateX(${(1 - v) * -60}px)`}}>
      <div style={{height: 4, width: `${bar * 100}%`, background: tone.accent, boxShadow: `0 0 14px ${tone.accent}`}} />
      <div style={{background: 'rgba(2,8,5,0.82)', borderLeft: `6px solid ${tone.accent}`, padding: '18px 34px 20px 26px', backdropFilter: 'blur(6px)'}}>
        <Decode text={name} delay={4} style={{display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: 52, color: tone.accent, whiteSpace: 'nowrap', ...glow(tone.accent, 0.5)}} />
        {title ? <div style={{fontFamily: fonts.mono, fontSize: 26, color: brand.colors.text, opacity: 0.9 * v, marginTop: 6, whiteSpace: 'nowrap'}}>{title}</div> : null}
      </div>
    </div>
  );
};

export const Emphasis: React.FC<{text: string}> = ({text}) => {
  const tone = useTone();
  const v = useEnter(0);
  const out = useExit(6);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 150, display: 'flex', justifyContent: 'center', opacity: out}}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.05,
          textAlign: 'center',
          maxWidth: 1500,
          color: tone.accent,
          padding: '14px 40px',
          background: 'rgba(2,8,5,0.7)',
          border: `2px solid ${tone.accent}`,
          boxShadow: `0 0 30px -6px ${tone.accent}`,
          transform: `scale(${0.85 + v * 0.15})`,
          opacity: v,
          ...glow(tone.accent, 0.7),
        }}
      >
        {text.toLocaleUpperCase('tr-TR')}
      </div>
    </div>
  );
};
