// Sahnelerin kare aralıkları: Remotion kompozisyonu (Main.tsx) ve parça render'ı (run.ts) aynı hesabı kullanır.
// İkisi ayrı hesaplarsa parça render'ı bir sahnenin kenarını kaçırabilir.

import type {Scene, ScenesFile} from './types';

export type SceneSequence = {scene: Scene; from: number; durationInFrames: number; joinedPrev: boolean; joinedNext: boolean};

/** Kompozisyonun fps'i: kurgu kaydınınki, tam sayıya yuvarlanmış (Descript 29,997 verir → 30). */
export const compositionFps = (data: ScenesFile) => Math.round(data.base.fps) || 30;

/**
 * Render'a girecek sahneler ve Sequence aralıkları. Peş peşe iki görsel (aralarında < 0,2 sn): öncekisi
 * crossfadeFrames + 2 kare uzar ki sonraki üstüne yumuşakça açılsın.
 */
export const sceneSequences = (data: ScenesFile, opts: {includeSuggested: boolean; crossfadeFrames: number}): SceneSequence[] => {
  const fps = compositionFps(data);
  // Editörde silinen (disabled) sahneler render'a girmez.
  const scenes = data.scenes.filter((s) => !s.disabled && (opts.includeSuggested || !s.suggested));
  return scenes.map((scene, i) => {
    const from = Math.round(scene.startSec * fps);
    const dur = Math.max(1, Math.round(scene.endSec * fps) - from);
    const prev = scenes[i - 1];
    const next = scenes[i + 1];
    const joinedNext = Boolean(next && next.startSec - scene.endSec < 0.2);
    const joinedPrev = Boolean(prev && scene.startSec - prev.endSec < 0.2);
    return {scene, from, durationInFrames: dur + (joinedNext ? opts.crossfadeFrames + 2 : 0), joinedPrev, joinedNext};
  });
};

/**
 * Görsel bulunan kare aralıkları (uçlar dahil), birbirine `mergeGap` kareden yakın olanlar birleşik.
 * Her aralık 1 kare pay alır; pay karelerinde sahne yoktur, kurgu kaydıyla aynıdır.
 */
export const overlayRanges = (seqs: SceneSequence[], totalFrames: number, mergeGap: number): [number, number][] => {
  const raw = seqs.map((s) => [Math.max(0, s.from - 1), Math.min(totalFrames - 1, s.from + s.durationInFrames)] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && r[0] - last[1] <= mergeGap) last[1] = Math.max(last[1], r[1]);
    else out.push([...r]);
  }
  return out.filter(([a, b]) => b >= a);
};
