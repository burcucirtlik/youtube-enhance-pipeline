// Zaman çizelgesi düzenlemeleri: Zena'nın editörde kaydırdığı, kısalttığı ya da sildiği sahneler.
// build/edits.json içinde markerId'ye göre tutulur; align yeniden çalışsa da kaybolmaz.

import fs from 'node:fs';
import path from 'node:path';
import type {Scene, ScenesFile} from '../shared/types';
import {paths} from './util';

export type SceneEdit = {startSec?: number; endSec?: number; disabled?: boolean};
export type Edits = Record<string, SceneEdit>; // key: scene.markerId (çoklu fotoğrafta "m012#2")

const editsFile = (dir: string) => path.join(paths(dir).build, 'edits.json');

export const loadEdits = (dir: string): Edits => {
  const f = editsFile(dir);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
};

export const saveEdits = (dir: string, edits: Edits) => {
  fs.mkdirSync(paths(dir).build, {recursive: true});
  fs.writeFileSync(editsFile(dir), JSON.stringify(edits, null, 1));
};

/** Hizalamanın ürettiği sahnelere kayıtlı düzenlemeleri uygular. */
export const applyEdits = (data: ScenesFile, edits: Edits): ScenesFile => {
  const scenes = data.scenes.map((sc): Scene => {
    const e = edits[sc.markerId];
    if (!e) return sc;
    const start = e.startSec ?? sc.startSec;
    const end = e.endSec ?? sc.endSec;
    return {...sc, startSec: Math.max(0, start), endSec: Math.min(data.base.durationSec, Math.max(start + 0.3, end)), disabled: e.disabled ?? sc.disabled, edited: true};
  });
  return {...data, scenes};
};

/** Editörden gelen sahne listesini hizalama çıktısıyla karşılaştırıp yalnızca farkları kaydeder. */
export const editsFromScenes = (aligned: ScenesFile, edited: Scene[]): Edits => {
  const out: Edits = {};
  const byId = new Map(aligned.scenes.map((s) => [s.markerId, s]));
  for (const sc of edited) {
    const orig = byId.get(sc.markerId);
    if (!orig) continue;
    const e: SceneEdit = {};
    if (Math.abs(sc.startSec - orig.startSec) > 0.01) e.startSec = Math.round(sc.startSec * 100) / 100;
    if (Math.abs(sc.endSec - orig.endSec) > 0.01) e.endSec = Math.round(sc.endSec * 100) / 100;
    if (sc.disabled) e.disabled = true;
    if (Object.keys(e).length) out[sc.markerId] = e;
  }
  return out;
};
