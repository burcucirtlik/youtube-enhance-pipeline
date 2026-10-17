import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, useVideoConfig} from 'remotion';
import {brand} from '../../brand/brand';
import type {ScenesFile} from '../shared/types';
import {SceneShell} from './SceneShell';
import {AssetBaseCtx, useSrc} from './theme';

export type MainProps = {
  scenesFile: string; // video klasörüne göre (public-dir)
  includeSuggested: boolean;
  overlayOnly: boolean; // true: sadece görseller, şeffaf zemin (Descript/Premiere'e katman olarak)
  data?: ScenesFile; // calculateMetadata doldurur
  assetBase?: string; // Player: varlıkların sunulduğu adres; render'da boş
};

export const Main: React.FC<MainProps> = ({assetBase, ...props}) => (
  <AssetBaseCtx.Provider value={assetBase ?? null}>
    <Timeline {...props} />
  </AssetBaseCtx.Provider>
);

const Timeline: React.FC<Omit<MainProps, 'assetBase'>> = ({data, includeSuggested, overlayOnly}) => {
  const {fps} = useVideoConfig();
  const src = useSrc();
  if (!data) return null;
  const {base} = data;
  // Editörde silinen (disabled) sahneler render'a girmez.
  const scenes = data.scenes.filter((s) => !s.disabled && (includeSuggested || !s.suggested));
  return (
    <AbsoluteFill style={{background: overlayOnly ? 'transparent' : brand.colors.bg}}>
      {!overlayOnly && base.kind === 'video' ? <OffthreadVideo src={src(base.src)} /> : null}
      {!overlayOnly && base.kind === 'audio' ? <Audio src={src(base.src)} /> : null}
      {scenes.map((sc, i) => {
        const from = Math.round(sc.startSec * fps);
        const dur = Math.max(1, Math.round(sc.endSec * fps) - from);
        // Peş peşe iki görsel: aralarında kameraya dönülmez ve glitch yok. Önceki sahne, sonraki üstüne
        // yumuşakça açılana kadar (crossfadeFrames) tam görünür kalır; sonraki çapraz geçişle girer.
        const prev = scenes[i - 1];
        const next = scenes[i + 1];
        const joinedNext = Boolean(next && next.startSec - sc.endSec < 0.2);
        const joinedPrev = Boolean(prev && sc.startSec - prev.endSec < 0.2);
        const hold = joinedNext ? brand.motion.crossfadeFrames + 2 : 0;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={dur + hold} name={`${sc.line}: ${sc.props.type}${sc.suggested ? '?' : ''}`}>
            <SceneShell scene={sc} fadeOut={!joinedNext} crossfadeIn={joinedPrev} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
