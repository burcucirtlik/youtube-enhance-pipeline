import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence} from 'remotion';
import {brand} from '../../brand/brand';
import {sceneSequences} from '../shared/timeline';
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
  const src = useSrc();
  if (!data) return null;
  const {base} = data;
  const seqs = sceneSequences(data, {includeSuggested, crossfadeFrames: brand.motion.crossfadeFrames});
  return (
    <AbsoluteFill style={{background: overlayOnly ? 'transparent' : brand.colors.bg}}>
      {!overlayOnly && base.kind === 'video' ? <OffthreadVideo src={src(base.src)} /> : null}
      {!overlayOnly && base.kind === 'audio' ? <Audio src={src(base.src)} /> : null}
      {seqs.map(({scene: sc, from, durationInFrames, joinedPrev, joinedNext}) => (
        // Peş peşe iki görsel: aralarında kameraya dönülmez ve glitch yok. Önceki sahne, sonraki üstüne
        // yumuşakça açılana kadar (crossfadeFrames) tam görünür kalır; sonraki çapraz geçişle girer.
        <Sequence key={sc.id} from={from} durationInFrames={durationInFrames} name={`${sc.line}: ${sc.props.type}${sc.suggested ? '?' : ''}`}>
          <SceneShell scene={sc} fadeOut={!joinedNext} crossfadeIn={joinedPrev} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
