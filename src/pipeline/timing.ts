// Zamanlama: her kelimenin kayıtta kaçıncı saniyede söylendiği. Tek kaynak Descript altyazısı (SRT/VTT).
// Whisper kaldırıldı (2026-10-17): Zena altyazıyı her projede verir; yerel model 1,5 GB yer ve ~3 dk tutuyordu.

import fs from 'node:fs';
import path from 'node:path';
import {findSubtitleFile, transcriptFromSubtitleFile} from './subtitles';
import {paths} from './util';

export const MISSING_SRT =
  "Descript altyazısı yok. Descript'te Export → Subtitles → SRT al ve projeye ekle (uygulamada \"Altyazı yükle\" ya da footage/kurgu.srt).";

/** build/transcript.json bu altyazı dosyasının bu sürümünden üretildiyse güncel sayılır. */
export const timingUpToDate = (dir: string): boolean => {
  const p = paths(dir);
  const sub = findSubtitleFile(dir);
  if (!sub || !fs.existsSync(p.transcript)) return false;
  try {
    const t = JSON.parse(fs.readFileSync(p.transcript, 'utf8'));
    return t.source === path.basename(sub) && t.sourceMtime === fs.statSync(sub).mtimeMs;
  } catch {
    return false;
  }
};

export type TimingResult = {status: 'güncel' | 'altyazı' | 'eski'; detail: string};

/**
 * Altyazıdan kelime zamanlarını çıkarır, build/transcript.json'a yazar.
 * Altyazı yoksa ve daha önceki (Whisper dönemi) bir transcript.json varsa onu kullanır; ikisi de yoksa hata.
 */
export const buildTiming = (dir: string, opts: {force?: boolean} = {}): TimingResult => {
  const p = paths(dir);
  const sub = findSubtitleFile(dir);
  if (!sub) {
    if (fs.existsSync(p.transcript)) return {status: 'eski', detail: 'altyazı yok; mevcut transcript.json kullanılıyor'};
    throw new Error(MISSING_SRT);
  }
  if (!opts.force && timingUpToDate(dir)) return {status: 'güncel', detail: `${path.basename(sub)} değişmedi`};
  fs.mkdirSync(p.build, {recursive: true});
  const t = transcriptFromSubtitleFile(sub);
  fs.writeFileSync(p.transcript, JSON.stringify({model: 'descript-subtitles', language: 'tr', ...t, source: path.basename(sub), sourceMtime: fs.statSync(sub).mtimeMs}));
  return {status: 'altyazı', detail: `${path.basename(sub)}: ${t.segments.length} satır, ${t.words.length} kelime`};
};
