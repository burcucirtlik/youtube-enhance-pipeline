// Kodla çizilen animasyonlar: flow, compare, table, timeline, stat, quote, concept.
// Görsel dil: HUD panelleri, neon parıltı, Matrix çözülmesiyle gelen metin.

import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../../brand/brand';
import type {LabeledText} from '../../shared/types';
import {Decode, fonts, glow, Panel, useEnter, useTone} from '../theme';

const P = brand.frame.padding;
const st = brand.motion.stagger;

const Center: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', inset: P, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style}}>{children}</div>
);

const rise = (v: number): React.CSSProperties => ({opacity: v, transform: `translateY(${(1 - v) * 30}px)`});

const fitSize = (text: string, base: number, maxChars: number) => (text.length > maxChars ? Math.max(base * 0.6, base * Math.sqrt(maxChars / text.length)) : base);

/** Bölüm etiketi: "// 01" gibi küçük HUD kodu. */
const Tag: React.FC<{children: React.ReactNode; color: string}> = ({children, color}) => (
  <div style={{fontFamily: fonts.mono, fontSize: 20, letterSpacing: 4, color, opacity: 0.8, marginBottom: 14}}>{children}</div>
);

// ── flow ───────────────────────────────────────────────────────────────────

const FlowStep: React.FC<{text: string; i: number; last: boolean; vertical: boolean}> = ({text, i, last, vertical}) => {
  const tone = useTone();
  const v = useEnter(i * st * 2);
  return (
    <div style={{...rise(v), flex: vertical ? undefined : 1, width: vertical ? 1250 : undefined}}>
      <Panel color={last ? tone.accent : tone.accent2} style={{padding: vertical ? '20px 36px' : '40px 32px', textAlign: vertical ? 'left' : 'center'}}>
        <Tag color={last ? tone.accent : tone.accent2}>{`// ${String(i + 1).padStart(2, '0')}`}</Tag>
        <Decode
          text={text}
          delay={i * st * 2}
          style={{fontFamily: fonts.display, fontWeight: 600, fontSize: fitSize(text, vertical ? 38 : 44, vertical ? 60 : 26), lineHeight: 1.2, color: last ? tone.accent : brand.colors.text, ...(last ? glow(tone.accent, 0.6) : {})}}
        />
      </Panel>
    </div>
  );
};

const FlowArrow: React.FC<{i: number; vertical: boolean}> = ({i, vertical}) => {
  const tone = useTone();
  const frame = useCurrentFrame();
  const a = useEnter(i * st * 2 + st);
  // Ok boyunca akan veri darbesi
  const pulse = ((frame - i * 4) % 30) / 30;
  return (
    <div style={{position: 'relative', width: vertical ? 4 : 70, height: vertical ? 34 : 4, background: `${tone.accent}33`, opacity: a, flexShrink: 0}}>
      <div style={{position: 'absolute', [vertical ? 'top' : 'left']: `${pulse * 100}%`, width: vertical ? 4 : 18, height: vertical ? 12 : 4, background: tone.accent, boxShadow: `0 0 12px ${tone.accent}`}} />
    </div>
  );
};

export const Flow: React.FC<{steps: string[]}> = ({steps}) => {
  const vertical = steps.length > 4;
  return (
    <Center style={{flexDirection: vertical ? 'column' : 'row', gap: vertical ? 6 : 14}}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <FlowStep text={s} i={i} last={i === steps.length - 1} vertical={vertical} />
          {i < steps.length - 1 ? <FlowArrow i={i} vertical={vertical} /> : null}
        </React.Fragment>
      ))}
    </Center>
  );
};

// ── compare ────────────────────────────────────────────────────────────────

const Side: React.FC<{side: LabeledText; color: string; delay: number; tag: string}> = ({side, color, delay, tag}) => {
  const v = useEnter(delay);
  return (
    <div style={{...rise(v), flex: 1, display: 'flex'}}>
      <Panel color={color} style={{flex: 1, padding: 56}}>
        <Tag color={color}>{tag}</Tag>
        {side.label ? (
          <Decode text={side.label} delay={delay} style={{display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: brand.type.title, color, marginBottom: 20, ...glow(color, 0.7)}} />
        ) : null}
        <div style={{fontFamily: fonts.body, fontSize: fitSize(side.text, brand.type.body, 90), lineHeight: 1.4}}>{side.text}</div>
      </Panel>
    </div>
  );
};

export const Compare: React.FC<{left: LabeledText; right: LabeledText}> = ({left, right}) => {
  const tone = useTone();
  const vs = useEnter(st * 3);
  return (
    <Center>
      <div style={{display: 'flex', gap: 36, alignItems: 'stretch', width: '100%'}}>
        <Side side={left} color={tone.accent2} delay={0} tag="[ A ]" />
        <div style={{alignSelf: 'center', fontFamily: fonts.display, fontWeight: 700, fontSize: 52, color: tone.accent, opacity: vs, ...glow(tone.accent, 0.8)}}>VS</div>
        <Side side={right} color={tone.accent} delay={st * 2} tag="[ B ]" />
      </div>
    </Center>
  );
};

// ── table ──────────────────────────────────────────────────────────────────

const Row: React.FC<{cells: string[]; cols: number; ri: number; fs: number}> = ({cells, cols, ri, fs}) => {
  const tone = useTone();
  const v = useEnter((ri + 1) * st);
  return (
    <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, ...rise(v), fontSize: fs, borderTop: `1px solid ${brand.colors.line}33`, background: ri % 2 ? brand.colors.surface2 : 'transparent'}}>
      {Array.from({length: cols}, (_, ci) => (
        <div key={ci} style={{padding: '22px 32px', fontWeight: ci === 0 ? 700 : 400, color: ci === 0 ? tone.accent2 : brand.colors.text}}>
          {ci === 0 ? <span style={{color: tone.accent, marginRight: 14}}>{'>'}</span> : null}
          <Decode text={cells[ci] ?? ''} delay={(ri + 1) * st} />
        </div>
      ))}
    </div>
  );
};

export const Table: React.FC<{headers: string[]; rows: string[][]}> = ({headers, rows}) => {
  const tone = useTone();
  const cols = Math.max(headers.length, ...rows.map((r) => r.length));
  const fs = rows.length > 5 ? 32 : 38;
  const h = useEnter(0);
  return (
    <Center>
      <Panel style={{width: '100%', fontFamily: fonts.body, overflow: 'hidden'}}>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, opacity: h, borderBottom: `2px solid ${tone.accent}`, boxShadow: `0 6px 20px -10px ${tone.accent}`}}>
          {headers.map((t, i) => (
            <div key={i} style={{padding: '24px 32px', fontFamily: fonts.display, fontWeight: 700, fontSize: fs, letterSpacing: 3, textTransform: 'uppercase', color: tone.accent, ...glow(tone.accent, 0.5)}}>
              <Decode text={t.toLocaleUpperCase('tr-TR')} />
            </div>
          ))}
        </div>
        {rows.map((r, ri) => (
          <Row key={ri} cells={r} cols={cols} ri={ri} fs={fs} />
        ))}
      </Panel>
    </Center>
  );
};

// ── timeline ───────────────────────────────────────────────────────────────

const Point: React.FC<{pt: LabeledText; i: number; n: number; per: number}> = ({pt, i, n, per}) => {
  const tone = useTone();
  const v = useEnter(i * per + 4);
  const x = n === 1 ? 50 : 6 + (i / (n - 1)) * 88;
  const up = n > 4 && i % 2 === 1;
  const last = i === n - 1;
  return (
    <div style={{position: 'absolute', left: `${x}%`, top: '50%', width: 0, height: 0}}>
      <div style={{position: 'absolute', left: -14, top: -12, width: 28, height: 28, transform: `rotate(45deg) scale(${v})`, border: `3px solid ${last ? tone.accent : tone.accent2}`, background: last ? tone.accent : brand.colors.bg, boxShadow: `0 0 16px ${last ? tone.accent : tone.accent2}`}} />
      <div style={{position: 'absolute', left: -170, width: 340, textAlign: 'center', [up ? 'bottom' : 'top']: 46, ...rise(v), fontFamily: fonts.body, color: brand.colors.text}}>
        {pt.label ? <Decode text={pt.label} delay={i * per + 4} style={{display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: 50, color: last ? tone.accent : tone.accent2, marginBottom: 8, ...glow(last ? tone.accent : tone.accent2, 0.6)}} /> : null}
        <div style={{fontSize: fitSize(pt.text, 30, 40), lineHeight: 1.3}}>{pt.text}</div>
      </div>
    </div>
  );
};

export const Timeline: React.FC<{points: LabeledText[]}> = ({points}) => {
  const tone = useTone();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const per = st * 3;
  const line = interpolate(frame, [0, per * points.length + fps * 0.4], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', inset: P}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: `${tone.accent2}33`}} />
      <div style={{position: 'absolute', left: 0, top: 'calc(50% - 1px)', height: 4, width: `${line * 100}%`, background: tone.accent, boxShadow: `0 0 14px ${tone.accent}`}} />
      {points.map((pt, i) => (
        <Point key={i} pt={pt} i={i} n={points.length} per={per} />
      ))}
    </div>
  );
};

// ── stat ───────────────────────────────────────────────────────────────────

/** "13 milyar $" → 0'dan 13'e sayar; sayı yoksa olduğu gibi gösterir. */
const countUp = (value: string, t: number) => {
  const m = value.match(/^([^\d]*)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  const dec = raw.includes(',') || raw.includes('.') ? raw.split(/[.,]/)[1].length : 0;
  // Binlik ayraçlı sayılar ("1.200") ondalık sanılmasın.
  if (dec === 3 && raw.includes('.')) return null;
  const num = Number(raw.replace(',', '.'));
  const cur = (num * t).toFixed(dec).replace('.', ',');
  return `${m[1]}${t >= 1 ? raw : cur}${m[3]}`;
};

export const Stat: React.FC<{value: string; caption?: string}> = ({value, caption}) => {
  const tone = useTone();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [0, fps * 1.1], [0, 1], {extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3)});
  const v = useEnter(0);
  const c = useEnter(st * 2);
  const counted = countUp(value, t);
  const valueStyle: React.CSSProperties = {fontFamily: fonts.display, fontWeight: 700, fontSize: fitSize(value, brand.type.hero * 1.5, 12), color: tone.accent, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', ...glow(tone.accent, 1.2)};
  return (
    <Center style={{flexDirection: 'column', gap: 26}}>
      <Tag color={tone.accent2}>{tone.danger ? '!! UYARI' : '// VERİ'}</Tag>
      <div style={{transform: `scale(${0.9 + v * 0.1})`, opacity: v}}>{counted ? <span style={valueStyle}>{counted}</span> : <Decode text={value} style={valueStyle} />}</div>
      {caption ? (
        <div style={{...rise(c), fontFamily: fonts.body, fontSize: brand.type.title * 0.62, color: brand.colors.text, borderTop: `1px solid ${tone.accent}66`, paddingTop: 18}}>
          <Decode text={caption} delay={st * 2} />
        </div>
      ) : null}
    </Center>
  );
};

// ── quote ──────────────────────────────────────────────────────────────────

export const Quote: React.FC<{text: string; author?: string}> = ({text, author}) => {
  const tone = useTone();
  const v = useEnter(0);
  const a = useEnter(st * 3);
  return (
    <Center>
      <Panel label="ALINTI" style={{width: '100%', padding: '70px 90px', ...rise(v)}}>
        <div style={{fontFamily: fonts.display, fontWeight: 500, fontSize: fitSize(text, 58, 110), lineHeight: 1.3, color: brand.colors.text}}>
          <span style={{color: tone.accent, ...glow(tone.accent, 0.6)}}>“</span>
          <Decode text={text} />
          <span style={{color: tone.accent, ...glow(tone.accent, 0.6)}}>”</span>
        </div>
        {author ? <div style={{marginTop: 34, fontFamily: fonts.mono, fontSize: brand.type.small, color: tone.accent2, ...rise(a)}}>{'> '}{author}</div> : null}
      </Panel>
    </Center>
  );
};

// ── concept ────────────────────────────────────────────────────────────────

export const Concept: React.FC<{term: string; definition?: string}> = ({term, definition}) => {
  const tone = useTone();
  const frame = useCurrentFrame();
  const v = useEnter(0);
  const u = interpolate(frame, [st, st + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const d = useEnter(st * 3);
  return (
    <Center style={{flexDirection: 'column', gap: 26}}>
      <Tag color={tone.accent2}>{'// KAVRAM'}</Tag>
      <div style={{position: 'relative', textAlign: 'center', opacity: v}}>
        <Decode text={term} style={{fontFamily: fonts.display, fontWeight: 700, fontSize: fitSize(term, 120, 18), color: tone.accent, ...glow(tone.accent, 1)}} />
        <div style={{position: 'absolute', left: 0, bottom: -16, height: 4, width: `${u * 100}%`, background: tone.accent, boxShadow: `0 0 14px ${tone.accent}`}} />
      </div>
      {definition ? (
        <div style={{marginTop: 34, maxWidth: 1300, textAlign: 'center', fontFamily: fonts.body, fontSize: brand.type.body, color: brand.colors.text, ...rise(d)}}>
          <Decode text={definition} delay={st * 3} />
        </div>
      ) : null}
    </Center>
  );
};
