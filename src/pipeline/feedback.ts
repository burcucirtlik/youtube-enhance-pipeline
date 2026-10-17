// Editör geri bildirimi: Zena'nın editörde hangi tür görseli tuttuğu, kaydırdığı, kısalttığı ya da sildiği.
// Bütün projelerden toplanır ve skill klasörüne bir istatistik dosyası olarak yazılır; skill script yazarken onu okur
// (çok silinen işaret türünü daha az önerir, hep geç kaydırılan türü fark eder).
//
// Yalnızca editörde en az bir düzenleme yapılmış projeler sayılır: hiç açılmamış bir projenin "tutuldu"ları
// gerçek bir karar değildir.

import fs from 'node:fs';
import path from 'node:path';
import type {Scene, ScenesFile} from '../shared/types';
import {loadEdits, type Edits} from './edits';
import {paths, SKILL, VIDEOS} from './util';

export const FEEDBACK_FILE = path.join(path.dirname(SKILL), 'editor-istatistikleri.md');

export type Outcome = 'tutuldu' | 'kaydırıldı' | 'taşındı' | 'süresi değişti' | 'silindi';
export type SceneOutcome = {project: string; key: string; suggested: boolean; outcome: Outcome; shiftSec: number; durationDelta: number};

/** İşaret türü etiketi: ANİM alt türüyle ("ANİM stat"), diğerleri türüyle ("FOTO"). */
export const markerKey = (s: Pick<Scene, 'kind' | 'props'>) => (s.kind === 'ANİM' ? `ANİM ${s.props.type}` : s.kind);

const MOVE_EPS = 0.3; // saniye; sürüklemede bundan küçük oynamalar sayılmaz
/**
 * Bundan uzak kaydırma "zamanlama düzeltmesi" değil, görseli başka bir cümleye taşımaktır (ya da eski bir hizalamadan
 * kalmış düzenlemedir); kaydırma ortancasına katılmaz, skill'e "daha erken gir" gibi yanlış ders vermesin.
 */
const RELOCATE_SEC = 10;

export const sceneOutcomes = (project: string, aligned: Scene[], edits: Edits): SceneOutcome[] =>
  aligned.map((s) => {
    const e = edits[s.markerId] ?? {};
    const start = e.startSec ?? s.startSec;
    const end = e.endSec ?? s.endSec;
    const shiftSec = start - s.startSec;
    const durationDelta = end - start - (s.endSec - s.startSec);
    const outcome: Outcome = e.disabled
      ? 'silindi'
      : Math.abs(shiftSec) > RELOCATE_SEC
        ? 'taşındı'
        : Math.abs(shiftSec) >= MOVE_EPS
          ? 'kaydırıldı'
          : Math.abs(durationDelta) >= MOVE_EPS
            ? 'süresi değişti'
            : 'tutuldu';
    return {project, key: markerKey(s), suggested: s.suggested, outcome, shiftSec, durationDelta};
  });

/** Editörde düzenlenmiş bütün projelerin sahne sonuçları. */
export const collectOutcomes = (videosDir = VIDEOS): {projects: string[]; rows: SceneOutcome[]} => {
  const projects: string[] = [];
  const rows: SceneOutcome[] = [];
  if (!fs.existsSync(videosDir)) return {projects, rows};
  for (const id of fs.readdirSync(videosDir).sort()) {
    const dir = path.join(videosDir, id);
    if (id.startsWith('.') || !fs.statSync(dir).isDirectory()) continue;
    const edits = loadEdits(dir);
    if (!Object.keys(edits).length) continue;
    let data: ScenesFile;
    try {
      data = JSON.parse(fs.readFileSync(paths(dir).scenes, 'utf8'));
    } catch {
      continue;
    }
    projects.push(id);
    rows.push(...sceneOutcomes(id, data.aligned ?? data.scenes, edits));
  }
  return {projects, rows};
};

const pct = (n: number, d: number) => (d ? `%${Math.round((n / d) * 100)}` : '–');
const sec = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1).replace('.', ',')} sn`;

type Agg = Record<Outcome, number> & {n: number; shifts: number[]};
const aggregate = (rows: SceneOutcome[], by: (r: SceneOutcome) => string) => {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const k = by(r);
    const a = m.get(k) ?? {n: 0, tutuldu: 0, kaydırıldı: 0, taşındı: 0, 'süresi değişti': 0, silindi: 0, shifts: []};
    a.n++;
    a[r.outcome]++;
    if (r.outcome === 'kaydırıldı') a.shifts.push(r.shiftSec);
    m.set(k, a);
  }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Az örnekli türden kural çıkarılmaz. */
const MIN_N = 5;

export const renderFeedback = (data: {projects: string[]; rows: SceneOutcome[]}, now = new Date()): string => {
  const {projects, rows} = data;
  const L: string[] = [
    '# Editör İstatistikleri (otomatik)',
    '',
    `_Pipeline üretir, elle düzenleme: masaüstü uygulamasında her editör kaydında ve \`npm run stats\` ile yenilenir. Son güncelleme: ${now.toISOString().slice(0, 10)}._`,
    '',
    "Zena'nın video editöründe senin işaretlerine ne yaptığı. Görsel işaret yazarken (özellikle `?` ile önerirken) buna bak: çok silinen türü daha az ve daha seçici öner; hep kaydırılan türde işareti cümlenin doğru yerine koy. Buradaki sayılar \"Zena'nın Düzeltmelerinden Öğrenilenler\"in yerine geçmez, ona veri sağlar.",
    '',
  ];
  if (!rows.length) {
    L.push('Henüz editörde düzenlenmiş proje yok.', '');
    return L.join('\n');
  }
  L.push(`Kaynak: ${projects.length} proje (${projects.join(', ')}), ${rows.length} görsel.`, '');

  L.push(
    '## İşaret türüne göre',
    '',
    `Kaydırıldı: ${RELOCATE_SEC} sn'ye kadar oynatıldı (zamanlama düzeltmesi). Taşındı: daha uzağa (başka cümleye) götürüldü.`,
    '',
    '| İşaret | Sayı | Tutuldu | Kaydırıldı | Taşındı | Süresi değişti | Silindi | Kaydırma (ortanca) |',
    '|---|---|---|---|---|---|---|---|',
  );
  for (const [k, a] of aggregate(rows, (r) => r.key))
    L.push(
      `| ${k} | ${a.n} | ${pct(a.tutuldu, a.n)} | ${pct(a.kaydırıldı, a.n)} | ${pct(a.taşındı, a.n)} | ${pct(a['süresi değişti'], a.n)} | ${pct(a.silindi, a.n)} | ${a.shifts.length ? sec(median(a.shifts)) : '–'} |`,
    );
  L.push('');

  L.push('## Kesin ve önerilen (?) işaretler', '', '| | Sayı | Tutuldu | Silindi |', '|---|---|---|---|');
  for (const [k, a] of aggregate(rows, (r) => (r.suggested ? 'önerilen (?)' : 'kesin'))) L.push(`| ${k} | ${a.n} | ${pct(a.n - a.silindi, a.n)} | ${pct(a.silindi, a.n)} |`);
  L.push('');

  // Kurallar: yeterli örnek varsa, belirgin eğilimleri cümleye çevir.
  const notes: string[] = [];
  for (const [k, a] of aggregate(rows, (r) => `${r.key}${r.suggested ? '?' : ''}`)) {
    if (a.n < MIN_N) continue;
    const del = a.silindi / a.n;
    const label = k.endsWith('?') ? `\`${k.slice(0, -1)}\` önerileri (?)` : `\`${k}\` (kesin)`;
    if (del >= 0.4) notes.push(`${label}: silinme oranı ${pct(a.silindi, a.n)} (${a.n} işaret). Bu türü daha az ve yalnızca güçlü anlarda öner.`);
    else if (del <= 0.1 && a.tutuldu / a.n >= 0.7) notes.push(`${label}: olduğu gibi tutulma oranı ${pct(a.tutuldu, a.n)} (${a.n} işaret). İşe yarıyor.`);
    if (a.shifts.length >= 3) {
      const m = median(a.shifts);
      if (Math.abs(m) >= 0.5) notes.push(`${label}: kaydırılanlar ortanca ${sec(m)} ${m > 0 ? 'ileri (cümleden daha geç girmeli)' : 'geri (cümleden daha erken girmeli)'}.`);
    }
  }
  L.push('## Çıkarımlar', '');
  L.push(...(notes.length ? notes.map((n) => `- ${n}`) : [`- Henüz kural çıkaracak kadar örnek yok (tür başına en az ${MIN_N}).`]), '');

  L.push('## Projeler', '', '| Proje | Görsel | Silindi | Kaydırıldı | Taşındı |', '|---|---|---|---|---|');
  for (const [k, a] of aggregate(rows, (r) => r.project).sort((x, y) => x[0].localeCompare(y[0]))) L.push(`| ${k} | ${a.n} | ${a.silindi} | ${a.kaydırıldı} | ${a.taşındı} |`);
  L.push('');
  return L.join('\n');
};

/** İstatistik dosyasını yeniden üretir; içerik değişmediyse dosyaya dokunmaz (tarih satırı hariç karşılaştırılır). */
export const writeFeedback = (videosDir = VIDEOS, file = FEEDBACK_FILE): {changed: boolean; scenes: number; projects: number} => {
  const data = collectOutcomes(videosDir);
  const text = renderFeedback(data);
  const strip = (t: string) => t.replace(/Son güncelleme: [\d-]+/, '');
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const changed = strip(old) !== strip(text);
  if (changed) fs.writeFileSync(file, text);
  return {changed, scenes: data.rows.length, projects: data.projects.length};
};
