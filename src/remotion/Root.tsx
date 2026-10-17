import React from 'react';
import {AbsoluteFill, type CalculateMetadataFunction, Composition, Sequence, staticFile} from 'remotion';
import {brand} from '../../brand/brand';
import type {ScenesFile} from '../shared/types';
import {DEMO_SCENES} from './demo';
import {Main, type MainProps} from './Main';
import {SceneShell} from './SceneShell';

const GALLERY_SEC = 4;

/** Süre, çözünürlük ve fps kurgu kaydından gelir (build/scenes.json). */
const calculateMetadata: CalculateMetadataFunction<MainProps> = async ({props}) => {
  const res = await fetch(staticFile(props.scenesFile));
  if (!res.ok) throw new Error(`${props.scenesFile} bulunamadı. Önce: npm run align -- <video klasörü>`);
  const data = (await res.json()) as ScenesFile;
  const fps = Math.round(data.base.fps) || 30;
  return {
    fps,
    width: data.base.width,
    height: data.base.height,
    durationInFrames: Math.max(1, Math.ceil(data.base.durationSec * fps)),
    props: {...props, data},
  };
};

/** Bileşen kütüphanesi vitrini: brand/ ayarlarını video olmadan denemek için. */
const Gallery: React.FC = () => (
  <AbsoluteFill style={{background: brand.colors.bg}}>
    {DEMO_SCENES.map((sc, i) => (
      <Sequence key={sc.id} from={i * GALLERY_SEC * 30} durationInFrames={GALLERY_SEC * 30} name={sc.props.type + (sc.danger ? ' (tehlike)' : '')}>
        <SceneShell scene={sc} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Main}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={300}
      defaultProps={{scenesFile: 'build/scenes.json', includeSuggested: true, overlayOnly: false} satisfies MainProps}
      calculateMetadata={calculateMetadata}
    />
    <Composition id="Galeri" component={Gallery} width={1920} height={1080} fps={30} durationInFrames={DEMO_SCENES.length * GALLERY_SEC * 30} />
  </>
);
