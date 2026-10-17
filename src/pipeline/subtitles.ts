// Descript'in altyazı dışa aktarımından (SRT / VTT) kelime zamanları üretir.
// Altyazı satırı 1–3 saniyelik bir blok; kelimeler satır süresine harf sayılarıyla orantılı dağıtılır.
// Pipeline'ın tek zamanlama kaynağı (bkz. timing.ts).

import fs from 'node:fs';
import path from 'node:path';
import type {Transcript} from './align';

export type Cue = {start: number; end: number; text: string};

const SUB_EXT = ['.srt', '.vtt'];

/** footage/ ya da proje kökündeki altyazı dosyası; "kurgu.srt" varsa o, yoksa ilk bulunan. */
export const findSubtitleFile = (dir: string): string | null => {
  for (const base of [path.join(dir, 'footage'), dir]) {
    if (!fs.existsSync(base)) continue;
    const files = fs.readdirSync(base).filter((n) => !n.startsWith('.') && SUB_EXT.includes(path.extname(n).toLowerCase())).sort();
    const pref = files.find((n) => /^kurgu\./i.test(n)) ?? files[0];
    if (pref) return path.join(base, pref);
  }
  return null;
};

const toSec = (t: string): number => {
  // 00:01:02,345 · 00:01:02.345 · 01:02.345
  const m = t.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) throw new Error(`Zaman damgası okunamadı: "${t}"`);
  const [, h = '0', mm, ss, ms] = m;
  return Number(h) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms.padEnd(3, '0')) / 1000;
};

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, '') // <i>, <b>, VTT <c.x>
    .replace(/\{\\[^}]*\}/g, '') // ASS stil kodları
    .replace(/\s+/g, ' ')
    .trim();

/** SRT ve VTT'yi aynı yapıya çözer. */
export const parseSubtitles = (source: string): Cue[] => {
  const lines = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const cues: Cue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const tm = line.match(/^(\S+)\s+-->\s+(\S+)/);
    if (!tm) {
      i++;
      continue;
    }
    const start = toSec(tm[1]);
    const end = toSec(tm[2]);
    i++;
    const text: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      text.push(lines[i]);
      i++;
    }
    const clean = stripTags(text.join(' '));
    if (clean && end > start) cues.push({start, end, text: clean});
  }
  // Çakışan ya da sırasız satırlar (Descript bazen aynı anı iki satıra böler)
  cues.sort((a, b) => a.start - b.start);
  return cues;
};

/** Her satırın kelimelerini satır süresine, harf sayısıyla orantılı dağıtır. */
export const transcriptFromCues = (cues: Cue[]): Transcript => {
  const words: Transcript['words'] = [];
  for (const c of cues) {
    const toks = c.text.split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    const weights = toks.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.5); // boşluk/duraklama payı
    const total = weights.reduce((a, b) => a + b, 0);
    let t = c.start;
    for (const [k, w] of toks.entries()) {
      const dur = ((c.end - c.start) * weights[k]) / total;
      words.push({w, start: Math.round(t * 1000) / 1000, end: Math.round((t + dur) * 1000) / 1000, p: 1});
      t += dur;
    }
  }
  const duration = cues.length ? cues[cues.length - 1].end : 0;
  return {duration, words};
};

export const transcriptFromSubtitleFile = (file: string): Transcript & {segments: Cue[]} => {
  const cues = parseSubtitles(fs.readFileSync(file, 'utf8'));
  if (!cues.length) throw new Error(`${path.basename(file)} içinde altyazı satırı bulunamadı`);
  return {...transcriptFromCues(cues), segments: cues};
};
