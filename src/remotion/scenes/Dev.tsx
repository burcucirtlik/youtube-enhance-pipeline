// Teknik eğitim sahneleri: terminal ve kod.

import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../../brand/brand';
import {fonts, glow, Panel, useEnter, useTone} from '../theme';

const Window: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => {
  const tone = useTone();
  const v = useEnter(0);
  return (
    <div style={{position: 'absolute', inset: brand.frame.padding, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Panel style={{width: '100%', maxHeight: '100%', overflow: 'hidden', background: 'rgba(0, 12, 6, 0.85)', opacity: v, transform: `translateY(${(1 - v) * 30}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '16px 26px', borderBottom: `1px solid ${brand.colors.line}`}}>
          <div style={{width: 12, height: 12, background: tone.accent, boxShadow: `0 0 10px ${tone.accent}`}} />
          <div style={{fontFamily: fonts.mono, fontSize: 22, letterSpacing: 3, color: tone.accent}}>{title.toLocaleUpperCase('tr-TR')}</div>
          <div style={{marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 18, color: brand.colors.muted}}>[ SECURE · TTY ]</div>
        </div>
        {children}
      </Panel>
    </div>
  );
};

export const Terminal: React.FC<{commands: string[]}> = ({commands}) => {
  const tone = useTone();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cps = brand.motion.typingCharsPerSec;
  let budget = Math.max(0, (frame - 8) / fps) * cps;
  const blink = Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <Window title="terminal">
      <div style={{padding: '34px 40px', fontFamily: fonts.mono, fontSize: 40, lineHeight: 1.6, color: brand.colors.text, minHeight: 300}}>
        {commands.map((c, i) => {
          const shown = c.slice(0, Math.max(0, Math.floor(budget)));
          const typing = budget >= 0 && budget < c.length + 6;
          budget -= c.length + 6; // komutlar arası kısa duraklama
          if (shown.length === 0 && !typing && i > 0) return null;
          return (
            <div key={i} style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
              <span style={{color: tone.accent, ...glow(tone.accent, 0.5)}}>{'❯ '}</span>
              {shown}
              {typing && blink ? <span style={{background: tone.accent, color: 'transparent', boxShadow: `0 0 10px ${tone.accent}`}}>_</span> : null}
            </div>
          );
        })}
      </div>
    </Window>
  );
};

export const Code: React.FC<{file: string; code?: string; highlight: number[]}> = ({file, code, highlight}) => {
  const tone = useTone();
  const frame = useCurrentFrame();
  const lines = (code ?? '').replace(/\t/g, '  ').split('\n');
  const first = highlight.length ? Math.min(...highlight) : 1;
  const visible = 16;
  const start = Math.max(0, Math.min(first - 5, lines.length - visible));
  const hl = interpolate(frame, [12, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Window title={file}>
      <div style={{padding: '24px 0', fontFamily: fonts.mono, fontSize: 32, lineHeight: 1.55}}>
        {lines.slice(start, start + visible).map((l, k) => {
          const n = start + k + 1;
          const on = highlight.includes(n);
          return (
            <div key={n} style={{display: 'flex', position: 'relative', opacity: highlight.length && !on ? 1 - hl * 0.55 : 1}}>
              {on ? <div style={{position: 'absolute', inset: 0, width: `${hl * 100}%`, background: tone.highlighter, opacity: 0.35}} /> : null}
              {on ? <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: tone.accent, opacity: hl}} /> : null}
              <span style={{width: 90, textAlign: 'right', paddingRight: 28, color: brand.colors.muted, position: 'relative'}}>{n}</span>
              <span style={{whiteSpace: 'pre', color: on ? tone.accent : brand.colors.text, position: 'relative', ...(on ? glow(tone.accent, 0.4) : {})}}>{l || ' '}</span>
            </div>
          );
        })}
      </div>
    </Window>
  );
};
