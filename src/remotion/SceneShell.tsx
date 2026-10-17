// Her sahnenin ortak kabuğu: giriş/çıkış, tehlike tonu (glitch), gren, eksik varlık yer tutucusu, öneri rozeti.

import React from 'react';
import {AbsoluteFill, getRemotionEnvironment, interpolate, OffthreadVideo, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../../brand/brand';
import type {Scene, SceneProps} from '../shared/types';
import {Compare, Concept, Flow, Quote, Stat, Table, Timeline} from './scenes/Diagrams';
import {Code, Terminal} from './scenes/Dev';
import {OVERLAY_TYPES} from '../shared/marker-schema';
import {MapScene} from './scenes/Map';
import {Clip, Document, News, Photo, Post, Screen} from './scenes/Media';
import {Emphasis, LowerThird} from './scenes/Overlay';
import {System} from './scenes/System';
import {Decode, fill, fonts, glow, H, SmoothInCtx, ToneProvider, useTone, W} from './theme';

const SceneBody: React.FC<{props: SceneProps}> = ({props: p}) => {
  switch (p.type) {
    case 'flow':
      return <Flow steps={p.steps} />;
    case 'compare':
      return <Compare left={p.left} right={p.right} />;
    case 'table':
      return <Table headers={p.headers} rows={p.rows} />;
    case 'timeline':
      return <Timeline points={p.points} />;
    case 'stat':
      return <Stat value={p.value} caption={p.caption} />;
    case 'quote':
      return <Quote text={p.text} author={p.author} />;
    case 'concept':
      return <Concept term={p.term} definition={p.definition} />;
    case 'terminal':
      return <Terminal commands={p.commands} />;
    case 'code':
      return <Code file={p.file} code={p.code} highlight={p.highlight} />;
    case 'screen':
      return <Screen file={p.file} />;
    case 'news':
      return <News url={p.url} image={p.image} rects={p.rects} imageSize={p.imageSize} />;
    case 'document':
      return <Document file={p.file} page={p.page} image={p.image} rects={p.rects} imageSize={p.imageSize} />;
    case 'photo':
      return <Photo file={p.file} caption={p.caption} />;
    case 'post':
      return <Post platform={p.platform} handle={p.handle} text={p.text} />;
    case 'clip':
      return <Clip file={p.file} caption={p.caption} />;
    case 'system':
      return <System actors={p.actors} events={p.events} />;
    case 'map':
      return <MapScene place={p.place} caption={p.caption} lat={p.lat} lon={p.lon} />;
    case 'lower':
      return <LowerThird name={p.name} title={p.title} />;
    case 'emphasis':
      return <Emphasis text={p.text} />;
  }
};

/** Yan yana yerleşim: soldaki yüz paneli ekranın bu oranı, görsel kalanı. */
const FACE_SHARE = 0.44;

const Placeholder: React.FC<{scene: Scene}> = ({scene}) => (
  <div style={{...fill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 160, textAlign: 'center', fontFamily: fonts.mono}}>
    <div style={{fontSize: 30, letterSpacing: 6, color: brand.colors.danger, ...glow(brand.colors.danger, 0.6)}}>
      <Decode text={`[ SİNYAL YOK · ${scene.kind} ]`} />
    </div>
    <div style={{fontSize: 34, lineHeight: 1.35, color: brand.colors.text}}>{scene.missingAsset}</div>
    <div style={{fontSize: 24, color: brand.colors.muted}}>satır {scene.line}</div>
  </div>
);

/** Arka plan: ince ızgara + Matrix dijital yağmuru. Panellerin arkasında, fotoğrafların altında kalır. */
/**
 * Player (uygulamadaki önizleme) tarayıcıda gerçek zamanlı çalışır; ağır efektler kare düşürür ve
 * Remotion videoyu yeniden senkronlarken ses takılıp tekrar eder. Önizlemede hafif mod, render'da tam mod.
 */
const useLite = () => getRemotionEnvironment().isPlayer;

const Backdrop: React.FC<{seed: string}> = ({seed}) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const lite = useLite();
  const {rain, rainGlyphs, grid} = brand.texture;
  const cols = lite ? 20 : 48;
  const rows = lite ? 18 : 30;
  const trail = lite ? 8 : 14;
  const glyphEvery = lite ? 15 : 6;
  const cell = H / rows;
  const glyphs = [...rainGlyphs];
  return (
    <>
      {grid ? (
        <div
          style={{
            ...fill,
            opacity: grid,
            backgroundImage: `linear-gradient(${tone.accent} 1px, transparent 1px), linear-gradient(90deg, ${tone.accent} 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            backgroundPosition: `0 ${(frame * 0.5) % 80}px`,
          }}
        />
      ) : null}
      {rain ? (
        <div style={{...fill, opacity: rain, fontFamily: fonts.mono, fontSize: cell * 0.8, lineHeight: `${cell}px`, overflow: 'hidden'}}>
          {Array.from({length: cols}, (_, c) => {
            const speed = 0.25 + random(`${seed}-s${c}`) * 0.45;
            const offset = random(`${seed}-o${c}`) * (rows + trail);
            const head = (offset + frame * speed) % (rows + trail);
            return (
              <div key={c} style={{position: 'absolute', left: (c / cols) * W, top: 0, width: W / cols, textAlign: 'center'}}>
                {Array.from({length: trail}, (_, k) => {
                  const row = Math.floor(head) - k;
                  if (row < 0 || row >= rows) return null;
                  const g = glyphs[Math.floor(random(`${seed}-${c}-${row}-${Math.floor(frame / glyphEvery)}`) * glyphs.length)];
                  return (
                    <div key={k} style={{position: 'absolute', top: row * cell, width: '100%', color: k === 0 ? '#E6FFF2' : tone.accent, opacity: 1 - k / trail, textShadow: k === 0 ? `0 0 8px ${tone.accent}` : undefined}}>
                      {g}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
};

/** Üst katman dokusu: CRT tarama çizgileri, vinyet, gren. */
const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const lite = useLite();
  const {scanlines, vignette} = brand.texture;
  const grain = lite ? 0 : brand.texture.grain; // SVG gren filtresi önizlemede çok pahalı
  return (
    <>
      {scanlines ? <div style={{...fill, opacity: scanlines, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0 2px, transparent 2px 4px)', pointerEvents: 'none'}} /> : null}
      <div style={{...fill, background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vignette}) 100%)`, pointerEvents: 'none'}} />
      {grain ? (
        <svg width={W} height={H} style={{...fill, opacity: grain, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
          <filter id="yt-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(random(`g${frame}`) * 1000)} />
          </filter>
          <rect width="100%" height="100%" filter="url(#yt-grain)" />
        </svg>
      ) : null}
    </>
  );
};

/** 1920×1080 tasarım alanını kompozisyon çözünürlüğüne ölçekler. */
const Stage: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  const s = Math.min(width / W, height / H);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
      <div style={{width: W, height: H, transform: `scale(${s})`, position: 'relative', flexShrink: 0}}>{children}</div>
    </AbsoluteFill>
  );
};

/**
 * face: yan yana yerleşimde soldaki yüz paneli için kurgu kaydı (render'da). Önizlemede (yalnızca katman) verilmez;
 * sol taraf saydam kalır, altta oynayan video görünür.
 */
export const SceneShell: React.FC<{scene: Scene; fadeOut?: boolean; crossfadeIn?: boolean; face?: {src: string; from: number}}> = ({scene, fadeOut = true, crossfadeIn = false, face}) => {
  // Alt bant ve vurgu: arka plan yok, kabuk efektleri yok; yüz görünür kalır.
  if (OVERLAY_TYPES.has(scene.props.type))
    return (
      <AbsoluteFill>
        <Stage>
          <ToneProvider danger={scene.danger}>
            <SceneBody props={scene.props} />
          </ToneProvider>
        </Stage>
      </AbsoluteFill>
    );
  return <FullScene scene={scene} fadeOut={fadeOut} crossfadeIn={crossfadeIn} face={face} />;
};

const FullScene: React.FC<{scene: Scene; fadeOut: boolean; crossfadeIn: boolean; face?: {src: string; from: number}}> = ({scene, fadeOut, crossfadeIn, face}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const {enterFrames, exitFrames, glitchFrames, dangerGlitchFrames, crossfadeFrames} = brand.motion;
  // Önceki görselden geliyorsa: glitch ve ölçek sıçraması yok, yalnızca yumuşak çapraz geçiş.
  const fadeInFrames = crossfadeIn ? crossfadeFrames : enterFrames * 0.5;
  const opacity = Math.min(
    interpolate(frame, [0, fadeInFrames], [0, 1], {extrapolateRight: 'clamp', easing: (x) => x * x * (3 - 2 * x)}),
    fadeOut ? interpolate(frame, [durationInFrames - exitFrames, durationInFrames], [1, 0], {extrapolateLeft: 'clamp'}) : 1,
  );
  const scale = crossfadeIn ? 1 : interpolate(frame, [0, enterFrames], [1.02, 1], {extrapolateRight: 'clamp'});

  // Kameradan görsele geçerken kısa bir sinyal bozulması; ton: tehlike'de daha uzun ve magenta.
  // Peş peşe iki görsel arasında glitch yok (Zena'nın isteği).
  const gFrames = crossfadeIn ? 0 : scene.danger ? dangerGlitchFrames : glitchFrames;
  let glitch: React.CSSProperties = {transform: `scale(${scale})`};
  if (frame < gFrames) {
    const r = (k: string) => (random(`${scene.id}-${frame}-${k}`) - 0.5) * 2;
    const amp = (1 - frame / gFrames) * (scene.danger ? 30 : 14);
    glitch = {
      transform: `translate(${r('x') * amp}px, ${r('y') * amp * 0.25}px) scale(${scale})`,
      filter: `drop-shadow(${amp * 0.6}px 0 0 rgba(255,42,109,0.8)) drop-shadow(${-amp * 0.6}px 0 0 rgba(0,229,255,0.7))`,
      clipPath: random(`${scene.id}-${frame}-c`) > 0.45 ? `inset(${Math.abs(r('t')) * 35}% 0 ${Math.abs(r('b')) * 35}% 0)` : undefined,
    };
  }
  const studio = getRemotionEnvironment().isStudio;
  const body = scene.missingAsset ? <Placeholder scene={scene} /> : <SceneBody props={scene.props} />;
  const side = scene.layout === 'yan';
  const faceW = W * FACE_SHARE;
  const k = 1 - FACE_SHARE; // görselin ölçeği

  return (
    <AbsoluteFill style={{opacity}}>
      <Stage>
        <SmoothInCtx.Provider value={crossfadeIn}>
        <ToneProvider danger={scene.danger}>
          {side ? (
            <>
              {face ? (
                <div style={{position: 'absolute', left: 0, top: 0, width: faceW, height: H, overflow: 'hidden', background: '#000'}}>
                  <OffthreadVideo src={face.src} trimBefore={face.from} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                </div>
              ) : null}
              <div style={{position: 'absolute', left: faceW, top: 0, width: W - faceW, height: H, overflow: 'hidden', background: brand.colors.bg, borderLeft: `3px solid ${brand.colors.accent}`, boxShadow: `-10px 0 30px -12px ${brand.colors.accent}`, ...glitch}}>
                <Backdrop seed={scene.id} />
                <div style={{position: 'absolute', left: 0, top: (H - H * k) / 2, width: W, height: H, transform: `scale(${k})`, transformOrigin: 'top left'}}>{body}</div>
              </div>
            </>
          ) : (
            <div style={{...fill, background: brand.colors.bg, ...glitch}}>
              <Backdrop seed={scene.id} />
              {body}
            </div>
          )}
          {scene.danger ? <div style={{...fill, boxShadow: `inset 0 0 180px rgba(255,42,109,0.35)`, pointerEvents: 'none'}} /> : null}
          <Overlay />
          {studio && scene.suggested && brand.showSuggestedBadge ? (
            <div style={{position: 'absolute', right: 30, top: 30, padding: '8px 16px', border: `1px solid ${brand.colors.accent2}`, background: 'rgba(2,8,5,0.85)', color: brand.colors.accent2, fontFamily: fonts.mono, fontSize: 22, letterSpacing: 2}}>
              ? ÖNERİ · SATIR {scene.line}
            </div>
          ) : null}
        </ToneProvider>
        </SmoothInCtx.Provider>
      </Stage>
    </AbsoluteFill>
  );
};
