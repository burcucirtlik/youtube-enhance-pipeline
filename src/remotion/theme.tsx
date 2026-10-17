import {loadFont as loadDisplay} from '@remotion/google-fonts/ChakraPetch';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import React, {createContext, useContext} from 'react';
import {random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../brand/brand';

const display = loadDisplay('normal', {weights: ['500', '600', '700'], subsets: ['latin', 'latin-ext']});
const mono = loadMono('normal', {weights: ['400', '500', '700', '800'], subsets: ['latin', 'latin-ext']});

export const fonts = {
  display: display.fontFamily,
  body: mono.fontFamily,
  mono: mono.fontFamily,
};

/**
 * Varlık yollarının kökü. Render'da null → Remotion'un public klasörü (staticFile).
 * Masaüstü uygulamasındaki Player'da sunucu adresi (ör. "/files/<proje>/").
 */
export const AssetBaseCtx = createContext<string | null>(null);
export const useSrc = () => {
  const base = useContext(AssetBaseCtx);
  return (p: string) => (base ? base + p.split('/').map(encodeURIComponent).join('/') : staticFile(p));
};

/** Sahne önceki görselden çapraz geçişle mi giriyor? O zaman metinler "çözülme" efektsiz, düz gelir. */
export const SmoothInCtx = createContext(false);

export const W = 1920;
export const H = 1080;

type Tone = {accent: string; accent2: string; highlighter: string; danger: boolean};
const ToneCtx = createContext<Tone>({accent: brand.colors.accent, accent2: brand.colors.accent2, highlighter: brand.colors.highlighter, danger: false});

export const ToneProvider: React.FC<{danger: boolean; children: React.ReactNode}> = ({danger, children}) => (
  <ToneCtx.Provider
    value={
      danger
        ? {accent: brand.colors.danger, accent2: brand.colors.danger2, highlighter: brand.colors.dangerHighlighter, danger: true}
        : {accent: brand.colors.accent, accent2: brand.colors.accent2, highlighter: brand.colors.highlighter, danger: false}
    }
  >
    {children}
  </ToneCtx.Provider>
);
export const useTone = () => useContext(ToneCtx);

/** 0→1 yay animasyonu; delay kare cinsinden. */
export const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: brand.motion.spring});
};

export const fill: React.CSSProperties = {position: 'absolute', inset: 0};

/** Neon parıltı: metne renkli ışık ve hafif renk kayması verir. */
export const glow = (color: string, strength = 1): React.CSSProperties => ({
  textShadow: `0 0 ${12 * strength}px ${color}, 0 0 ${28 * strength}px ${color}55, 2px 0 0 rgba(255,42,109,0.35), -2px 0 0 rgba(0,229,255,0.35)`,
});

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺ01#$%&*<>/\\|=+ABCDEFXYZ0123456789';

/**
 * Matrix çözülmesi: harfler soldan sağa, rastgele karakterlerden gerçek haline oturur.
 * Boşluklar ve noktalama hemen görünür, böylece satır düzeni sabit kalır.
 */
export const Decode: React.FC<{text: string; delay?: number; style?: React.CSSProperties}> = ({text, delay = 0, style}) => {
  const smooth = useContext(SmoothInCtx);
  const frame = useCurrentFrame() - delay;
  if (smooth) return <span style={style}>{text}</span>;
  const dur = brand.motion.decodeFrames;
  if (frame >= dur + 4) return <span style={style}>{text}</span>;
  const chars = [...text];
  const out = chars.map((ch, i) => {
    if (/[\s.,:;!?'"()\-—–→]/.test(ch)) return ch;
    const reveal = (i / Math.max(1, chars.length)) * dur;
    if (frame >= reveal + 3) return ch;
    if (frame < 0) return ' ';
    return GLYPHS[Math.floor(random(`${text}-${i}-${frame}`) * GLYPHS.length)];
  });
  return <span style={style}>{out.join('')}</span>;
};

/** HUD paneli: ince neon çerçeve, köşe parantezleri ve iç parıltı. */
export const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties; color?: string; label?: string}> = ({children, style, color, label}) => {
  const tone = useTone();
  const c = color ?? tone.accent;
  const k = brand.frame.corner;
  const corner = (pos: React.CSSProperties, borders: React.CSSProperties) => (
    <div style={{position: 'absolute', width: k, height: k, ...pos, ...borders, filter: `drop-shadow(0 0 6px ${c})`}} />
  );
  const b = `3px solid ${c}`;
  return (
    <div
      style={{
        position: 'relative',
        background: brand.colors.surface,
        border: `1px solid ${tone.danger ? 'rgba(255,42,109,0.45)' : brand.colors.line}`,
        boxShadow: tone.danger ? '0 0 24px rgba(255,42,109,0.2), inset 0 0 40px rgba(255,42,109,0.06)' : brand.frame.glow,
        color: brand.colors.text,
        backdropFilter: 'blur(2px)',
        ...style,
      }}
    >
      {corner({left: -2, top: -2}, {borderLeft: b, borderTop: b})}
      {corner({right: -2, top: -2}, {borderRight: b, borderTop: b})}
      {corner({left: -2, bottom: -2}, {borderLeft: b, borderBottom: b})}
      {corner({right: -2, bottom: -2}, {borderRight: b, borderBottom: b})}
      {label ? (
        <div style={{position: 'absolute', left: k + 8, top: -14, padding: '0 10px', background: brand.colors.bg, color: c, fontFamily: fonts.mono, fontSize: 20, letterSpacing: 4}}>{label}</div>
      ) : null}
      {children}
    </div>
  );
};
