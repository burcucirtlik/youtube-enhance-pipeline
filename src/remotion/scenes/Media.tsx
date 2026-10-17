// Gerçek görseller: ekran kaydı, haber, belge, fotoğraf, arşiv videosu, gönderi.

import React from 'react';
import {Img, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../../brand/brand';
import type {HighlightRect, Size} from '../../shared/types';
import {Decode, fill, fonts, glow, H, Panel, useEnter, useSrc, useTone, W} from '../theme';

const useProgress = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return frame / Math.max(1, durationInFrames);
};

export const Screen: React.FC<{file: string}> = ({file}) => {
  const src = useSrc();
  const p = useProgress();
  const pad = brand.frame.padding * 0.6;
  return (
    <div style={{position: 'absolute', inset: pad, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Panel label="EKRAN KAYDI" style={{width: '100%', height: '100%', background: '#000'}}>
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
          <OffthreadVideo src={src(file)} muted style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${1 + p * 0.04})`}} />
        </div>
      </Panel>
    </div>
  );
};

/**
 * Ekran görüntüsü/PDF sayfası + fosforlu kalem. Kamera vurgunun merkezine yavaşça yaklaşır,
 * kalem kutuları sırayla soldan sağa boyanır.
 */
const HighlightedImage: React.FC<{image: string; size?: Size; rects?: HighlightRect[]; paper?: boolean; label?: string}> = ({image, size, rects = [], paper, label}) => {
  const src = useSrc();
  const tone = useTone();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = useProgress();
  const iw = size?.width ?? 3200;
  const ih = size?.height ?? 2000;
  // Sayfa genişliği: haber tam genişlik, belge kâğıt gibi daha dar.
  const baseScale = (paper ? 1250 : W - 120) / iw;
  // Vurgu varsa kamera ona yaklaşır: vurgu ekranın ~%55'ini kaplayana kadar (en fazla 2,2×).
  const hlW = rects.length ? Math.max(...rects.map((r) => r.x + r.width)) - Math.min(...rects.map((r) => r.x)) : 0;
  const target = rects.length ? Math.min(2.2, Math.max(1.15, (W * 0.55) / (hlW * baseScale))) : 1 + brand.motion.kenBurns * 2;
  const push = interpolate(frame, [fps * 0.2, fps * 1.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3)});
  const zoom = 1 + (target - 1) * push + p * brand.motion.kenBurns;
  const s = baseScale * zoom;
  const cx = rects.length ? (Math.min(...rects.map((r) => r.x)) + Math.max(...rects.map((r) => r.x + r.width))) / 2 : iw / 2;
  const cy = rects.length ? (Math.min(...rects.map((r) => r.y)) + Math.max(...rects.map((r) => r.y + r.height))) / 2 : (paper ? ih * 0.3 : H / 2 / baseScale);
  // Vurgu merkezi ekranın ortasına gelsin, ama görüntünün dışı görünmesin.
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const tx = clamp(W / 2 - cx * s, W - iw * s, 0);
  const ty = clamp(H / 2 - cy * s, H - ih * s, 0);
  const total = rects.reduce((a, r) => a + r.width, 0) || 1;
  const sweep = interpolate(frame, [fps * 1.2, fps * 2.2], [0, total], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let used = 0;
  return (
    <div style={{...fill, background: paper ? brand.colors.bg : '#fff', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: tx, top: ty, width: iw, height: ih, transform: `scale(${s})`, transformOrigin: '0 0', boxShadow: paper ? brand.frame.shadow : undefined}}>
        <Img src={src(image)} style={{width: iw, height: ih, display: 'block'}} />
        {rects.map((r, i) => {
          const w = Math.max(0, Math.min(r.width, sweep - used));
          used += r.width;
          return <div key={i} style={{position: 'absolute', left: r.x - 6, top: r.y + r.height * 0.08, width: w + 12, height: r.height * 0.92, background: tone.highlighter, mixBlendMode: 'multiply', borderRadius: 6}} />;
        })}
      </div>
      {label ? (
        <div style={{position: 'absolute', left: 48, bottom: 40, padding: '12px 22px', background: 'rgba(2, 8, 5, 0.9)', border: `1px solid ${tone.accent}`, boxShadow: `0 0 18px ${tone.accent}55`, color: tone.accent, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, maxWidth: W - 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
          <Decode text={`KAYNAK:// ${label}`} />
        </div>
      ) : null}
    </div>
  );
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const News: React.FC<{url: string; image?: string; rects?: HighlightRect[]; imageSize?: Size}> = ({url, image, rects, imageSize}) =>
  image ? <HighlightedImage image={image} rects={rects} size={imageSize} label={hostOf(url)} /> : null;

export const Document: React.FC<{file: string; page: number; image?: string; rects?: HighlightRect[]; imageSize?: Size}> = ({file, page, image, rects, imageSize}) =>
  image ? <HighlightedImage image={image} rects={rects} size={imageSize} paper label={`${file} · s. ${page}`} /> : null;

/** Gerçek fotoğraflara binen hafif fosfor tonu (brand.texture.photoTint). */
const Tint: React.FC = () => {
  const tone = useTone();
  return brand.texture.photoTint ? <div style={{...fill, background: tone.accent, mixBlendMode: 'color', opacity: brand.texture.photoTint}} /> : null;
};

export const Photo: React.FC<{file: string; caption?: string}> = ({file, caption}) => {
  const src = useSrc();
  const tone = useTone();
  const c = useEnter(10);
  const p = useProgress();
  // "Olay, tarih · Foto: yazar (lisans)" → ilk satır olay, ikinci satır tarih ve atıf.
  const [name, ...rest] = (caption ?? '').includes(' · ') ? (caption ?? '').split(' · ') : (caption ?? '').split(',');
  return (
    <div style={{...fill, background: '#000'}}>
      {/* Arşiv fotoğrafları çoğu zaman dikey ya da küçük: arkada bulanık kopya, önde fotoğrafın tamamı. */}
      <Img src={src(file)} style={{...fill, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.45)', transform: 'scale(1.15)'}} />
      <Img src={src(file)} style={{...fill, width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${1 + p * brand.motion.kenBurns})`}} />
      <Tint />
      {caption ? (
        <>
          <div style={{...fill, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.8) 100%)'}} />
          <div style={{position: 'absolute', left: brand.frame.padding, bottom: 80, opacity: c, transform: `translateX(${(1 - c) * -30}px)`, borderLeft: `4px solid ${tone.accent}`, boxShadow: `-8px 0 18px -10px ${tone.accent}`, paddingLeft: 26}}>
            <div style={{fontFamily: fonts.mono, fontSize: 20, letterSpacing: 4, color: tone.accent2, marginBottom: 6}}>{'// ARŞİV'}</div>
            <Decode text={name.trim()} delay={10} style={{display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: 58, color: tone.accent, ...glow(tone.accent, 0.6)}} />
            {rest.length ? <div style={{fontFamily: fonts.mono, fontSize: 26, color: brand.colors.text, opacity: 0.85, marginTop: 8}}>{rest.join(' · ').trim()}</div> : null}
          </div>
        </>
      ) : null}
    </div>
  );
};

/** Arşiv videosu: sessiz, kendi oranında (siyah boşluklu), fotoğrafla aynı künye. */
export const Clip: React.FC<{file: string; caption?: string}> = ({file, caption}) => {
  const src = useSrc();
  const tone = useTone();
  const c = useEnter(10);
  const [name, ...rest] = (caption ?? '').includes(' · ') ? (caption ?? '').split(' · ') : (caption ?? '').split(',');
  return (
    <div style={{...fill, background: '#000'}}>
      <OffthreadVideo src={src(file)} muted style={{...fill, width: '100%', height: '100%', objectFit: 'contain'}} />
      <Tint />
      {caption ? (
        <>
          <div style={{...fill, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.8) 100%)'}} />
          <div style={{position: 'absolute', left: brand.frame.padding, bottom: 80, opacity: c, transform: `translateX(${(1 - c) * -30}px)`, borderLeft: `4px solid ${tone.accent}`, boxShadow: `-8px 0 18px -10px ${tone.accent}`, paddingLeft: 26}}>
            <div style={{fontFamily: fonts.mono, fontSize: 20, letterSpacing: 4, color: tone.accent2, marginBottom: 6}}>{'// ARŞİV · VİDEO'}</div>
            <Decode text={name.trim()} delay={10} style={{display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: 58, color: tone.accent, ...glow(tone.accent, 0.6)}} />
            {rest.length ? <div style={{fontFamily: fonts.mono, fontSize: 26, color: brand.colors.text, opacity: 0.85, marginTop: 8}}>{rest.join(' · ').trim()}</div> : null}
          </div>
        </>
      ) : null}
    </div>
  );
};

export const Post: React.FC<{platform: string; handle: string; text: string}> = ({platform, handle, text}) => {
  const tone = useTone();
  const v = useEnter(0);
  const initial = handle.replace('@', '').charAt(0).toUpperCase();
  return (
    <div style={{...fill, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Panel label={platform.toLocaleUpperCase('tr-TR')} style={{width: 1240, padding: '56px 64px', opacity: v, transform: `translateY(${(1 - v) * 40}px) scale(${0.96 + v * 0.04})`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26, marginBottom: 34}}>
          <div style={{width: 96, height: 96, border: `2px solid ${tone.accent2}`, boxShadow: `0 0 16px ${tone.accent2}`, color: tone.accent2, fontFamily: fonts.display, fontWeight: 700, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{initial}</div>
          <div style={{flex: 1}}>
            <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 42, color: tone.accent}}>{handle}</div>
            <div style={{fontFamily: fonts.body, fontSize: 28, color: brand.colors.muted}}>{platform}</div>
          </div>
        </div>
        <div style={{fontFamily: fonts.body, fontSize: text.length > 220 ? 34 : 42, lineHeight: 1.45}}>{text}</div>
      </Panel>
    </div>
  );
};
