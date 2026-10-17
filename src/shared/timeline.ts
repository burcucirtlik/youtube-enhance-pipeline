// Sahnelerin kare aralıkları: Remotion kompozisyonu (Main.tsx) ve parça render'ı (run.ts) aynı hesabı kullanır.
// İkisi ayrı hesaplarsa parça render'ı bir sahnenin kenarını kaçırabilir.

import {OVERLAY_TYPES} from './marker-schema';
import type {Scene, ScenesFile} from './types';

export type SceneSequence = {scene: Scene; from: number; durationInFrames: number; joinedPrev: boolean; joinedNext: boolean};

/** Kompozisyonun fps'i: kurgu kaydınınki, tam sayıya yuvarlanmış (Descript 29,997 verir → 30). */
export const compositionFps = (data: ScenesFile) => Math.round(data.base.fps) || 30;

/**
 * Render'a girecek sahneler ve Sequence aralıkları. Peş peşe iki görsel (aralarında < 0,2 sn): öncekisi
 * crossfadeFrames + 2 kare uzar ki sonraki üstüne yumuşakça açılsın.
 */
export const sceneSequences = (data: ScenesFile, opts: {includeSuggested: boolean; crossfadeFrames: number; skipMissing?: boolean}): SceneSequence[] => {
  const fps = compositionFps(data);
  // Editörde silinen (disabled) sahneler render'a girmez. Malzemesi eksik sahne (yer tutucu) önizlemede görünür,
  // render'da atlanır: "SİNYAL YOK" kartı hiçbir zaman son videoya girmemeli.
  const scenes = data.scenes.filter((s) => !s.disabled && (opts.includeSuggested || !s.suggested) && !(opts.skipMissing && s.missingAsset));
  return scenes.map((scene, i) => {
    const from = Math.round(scene.startSec * fps);
    const dur = Math.max(1, Math.round(scene.endSec * fps) - from);
    const prev = scenes[i - 1];
    const next = scenes[i + 1];
    // Çapraz geçiş yalnızca iki tam ekran görsel arasında; alt bant ve vurgu kendi girişini yapar.
    const full = (x?: Scene) => Boolean(x && !OVERLAY_TYPES.has(x.props.type));
    const joinedNext = full(scene) && full(next) && next!.startSec - scene.endSec < 0.2;
    const joinedPrev = full(scene) && full(prev) && scene.startSec - prev!.endSec < 0.2;
    return {scene, from, durationInFrames: dur + (joinedNext ? opts.crossfadeFrames + 2 : 0), joinedPrev, joinedNext};
  });
};

/**
 * Görsel bulunan kare aralıkları (uçlar dahil), birbirine `mergeGap` kareden yakın olanlar birleşik.
 * Her aralık 1 kare pay alır; pay karelerinde sahne yoktur, kurgu kaydıyla aynıdır.
 */
export const overlayRanges = (seqs: {from: number; durationInFrames: number}[], totalFrames: number, mergeGap: number): [number, number][] => {
  const raw = seqs.map((s) => [Math.max(0, s.from - 1), Math.min(totalFrames - 1, s.from + s.durationInFrames)] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && r[0] - last[1] <= mergeGap) last[1] = Math.max(last[1], r[1]);
    else out.push([...r]);
  }
  return out.filter(([a, b]) => b >= a);
};

/** Yakınlaşma (YAKIN): kurgu kaydının o karedeki ölçeği. Render (Main) ve önizleme (Editor) aynı hesabı kullanır. */
export const ZOOM_SCALE = 1.18;
export const zoomAt = (data: ScenesFile, frame: number): number => {
  const fps = compositionFps(data);
  const ease = (x: number) => x * x * (3 - 2 * x);
  let z = 1;
  for (const s of data.scenes) {
    if (s.disabled || s.props.type !== 'zoom') continue;
    const a = Math.round(s.startSec * fps);
    const b = Math.round(s.endSec * fps);
    if (frame < a || frame > b) continue;
    const inP = Math.min(1, (frame - a) / 5);
    const outP = Math.min(1, (b - frame) / 8);
    z = Math.max(z, 1 + (ZOOM_SCALE - 1) * ease(Math.min(inP, outP)));
  }
  return z;
};
/** Yakınlaşmanın merkezi: konuşan kafa genelde kadrajın ortasında, biraz yukarıda. */
export const ZOOM_ORIGIN = '50% 38%';

/** Bölüm kartları: her ## başlığının başladığı an (ilki hariç: açılış kamerada kalır). */
export const chapterCards = (data: ScenesFile, opts: {enabled: boolean; seconds: number}) => {
  if (!opts.enabled) return [];
  const fps = compositionFps(data);
  return data.chapters.slice(1).map((ch, i) => ({n: i + 2, title: ch.title, from: Math.round(ch.startSec * fps), durationInFrames: Math.round(opts.seconds * fps)}));
};
