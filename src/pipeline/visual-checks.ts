// Görsellerin izlenebilirlik denetimleri (youtube-visual-marker skill'inin makineyle denetlenebilen kuralları).
// - Statik (lint): ekrandaki metnin uzunluğu, aynı animasyon türünün art arda gelmesi, ekrandaki rakamın cümlede geçmesi.
// - Zamanlı (hizalama sonrası uyarılar): okuma hızı, görselsiz en uzun aralık, ilk 90 sn, son 20 sn, YouTube bölüm kuralları.

import type {Marker, SceneProps, ScenesFile, Sentence} from '../shared/types';
import type {Issue} from './parse-script';

const words = (s?: string | null) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
const lt = (l?: {label?: string; text: string}) => words(l?.label) + words(l?.text);

/** Telefon ekranında okunabilir sınırlar. Skill'deki "Ekrandaki metin" tablosu bunlarla aynı. */
export const TEXT_LIMITS = {
  quoteWords: 15,
  tableCols: 3,
  tableRows: 4,
  flowSteps: 4,
  stepWords: 4,
  timelinePoints: 5,
  statValueWords: 4,
  statCaptionWords: 5,
  compareSideWords: 8,
  conceptTermWords: 4,
  conceptDefinitionWords: 12,
  postWords: 35,
  lowerWords: 8,
  emphasisWords: 4,
} as const;

/** Okunması gereken metin kelime sayısı (fotoğraf altyazısı, haber, belge, ekran kaydı sayılmaz: hepsinin okunması gerekmez). */
export const screenWords = (p: SceneProps): number => {
  switch (p.type) {
    case 'flow':
      return p.steps.reduce((a, s) => a + words(s), 0);
    case 'compare':
      return lt(p.left) + lt(p.right);
    case 'table':
      return [p.headers, ...p.rows].flat().reduce((a, c) => a + words(c), 0);
    case 'timeline':
      return p.points.reduce((a, x) => a + lt(x), 0);
    case 'stat':
      return words(p.value) + words(p.caption);
    case 'quote':
      return words(p.text) + words(p.author);
    case 'concept':
      return words(p.term) + words(p.definition);
    case 'post':
      return words(p.text);
    case 'lower':
      return words(p.name) + words(p.title);
    case 'emphasis':
      return words(p.text);
    case 'map':
      return words(p.place) + words(p.caption);
    default:
      return 0;
  }
};

const tooLong = (p: SceneProps): string[] => {
  const L = TEXT_LIMITS;
  const out: string[] = [];
  switch (p.type) {
    case 'quote':
      if (words(p.text) > L.quoteWords) out.push(`alıntı ${words(p.text)} kelime (en fazla ${L.quoteWords}; en güçlü kısmını al)`);
      break;
    case 'table': {
      const cols = Math.max(p.headers.length, ...p.rows.map((r) => r.length));
      if (cols > L.tableCols) out.push(`tablo ${cols} sütun (en fazla ${L.tableCols})`);
      if (p.rows.length > L.tableRows) out.push(`tablo ${p.rows.length} satır (en fazla ${L.tableRows})`);
      break;
    }
    case 'flow':
      if (p.steps.length > L.flowSteps) out.push(`akış ${p.steps.length} adım (en fazla ${L.flowSteps})`);
      for (const s of p.steps) if (words(s) > L.stepWords) out.push(`akış adımı "${s}" ${words(s)} kelime (en fazla ${L.stepWords})`);
      break;
    case 'timeline':
      if (p.points.length > L.timelinePoints) out.push(`zaman çizelgesi ${p.points.length} nokta (en fazla ${L.timelinePoints})`);
      break;
    case 'stat':
      if (words(p.value) > L.statValueWords) out.push(`rakam "${p.value}" ${words(p.value)} kelime (en fazla ${L.statValueWords})`);
      if (words(p.caption) > L.statCaptionWords) out.push(`rakamın alt yazısı ${words(p.caption)} kelime (en fazla ${L.statCaptionWords})`);
      break;
    case 'compare':
      for (const side of [p.left, p.right]) if (lt(side) > L.compareSideWords) out.push(`karşılaştırmanın bir tarafı ${lt(side)} kelime (en fazla ${L.compareSideWords})`);
      break;
    case 'concept':
      if (words(p.term) > L.conceptTermWords) out.push(`kavram adı ${words(p.term)} kelime (en fazla ${L.conceptTermWords})`);
      if (words(p.definition) > L.conceptDefinitionWords) out.push(`kavram tanımı ${words(p.definition)} kelime (en fazla ${L.conceptDefinitionWords})`);
      break;
    case 'post':
      if (words(p.text) > L.postWords) out.push(`gönderi ${words(p.text)} kelime (en fazla ${L.postWords}; uzun gönderide vurgulanacak kısmı al)`);
      break;
    case 'lower':
      if (lt({label: p.name, text: p.title ?? ''}) > L.lowerWords) out.push(`alt bant ${words(p.name) + words(p.title)} kelime (en fazla ${L.lowerWords})`);
      break;
    case 'emphasis':
      if (words(p.text) > L.emphasisWords) out.push(`vurgu ${words(p.text)} kelime (en fazla ${L.emphasisWords})`);
      break;
  }
  return out;
};

const digitGroups = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((d) => d.replace(/[.,]/g, ''));

/** Statik denetimler: lint çağırır. */
export const staticVisualChecks = (markers: Marker[], sentences: Sentence[]): Issue[] => {
  const issues: Issue[] = [];
  for (const m of markers) {
    for (const msg of tooLong(m.props)) issues.push({line: m.line, level: 'uyarı', msg: `Ekranda okunmaz: ${msg}`});
    // Ekrandaki rakam söylenenle aynı olmalı. Yalnızca cümlede rakam yazılıysa denetlenir (yazıyla söylenmiş olabilir).
    if (m.props.type === 'stat' && m.sentenceIndex >= 0) {
      const v = digitGroups(m.props.value);
      const sen = digitGroups(sentences[m.sentenceIndex].text);
      if (v.length && sen.length && !v.some((d) => sen.includes(d)))
        issues.push({line: m.line, level: 'uyarı', msg: `Ekrandaki rakam (${m.props.value}) cümlede söylenen rakamla eşleşmiyor`});
    }
  }
  // Alt bant tam ekran görselle aynı cümlede: tam ekran onu örter, alt bant yarım saniyeye sıkışır.
  for (const m of markers) {
    if (m.props.type !== 'lower' || m.sentenceIndex < 0) continue;
    const full = markers.find((x) => x !== m && x.sentenceIndex === m.sentenceIndex && x.props.type !== 'lower' && x.props.type !== 'emphasis' && x.layout !== 'yan');
    if (full) issues.push({line: m.line, level: 'uyarı', msg: `Alt bant, tam ekran görselle (satır ${full.line}) aynı cümlede; görünmez. Kişinin anıldığı başka bir cümleye taşı ya da görseli "yerleşim: yan" yap`});
  }
  // Aynı animasyon türü art arda 2'den fazla: görsel ritim tekdüzeleşir.
  let run: Marker[] = [];
  const flush = () => {
    if (run.length > 2) issues.push({line: run[0].line, level: 'uyarı', msg: `Art arda ${run.length} "${run[0].anim}" animasyonu (satır ${run[0].line}–${run.at(-1)!.line}); türleri karıştır`});
    run = [];
  };
  for (const m of markers) {
    if (m.anim && run.length && run[0].anim === m.anim) run.push(m);
    else {
      flush();
      if (m.anim) run.push(m);
    }
  }
  flush();
  return issues;
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Okuma hızı sınırı: saniyede bu kadar kelimeden fazlası okunmaz. */
export const READ_WPS = 3;
/** Talking head'de görselsiz en uzun aralık (sn). */
export const MAX_GAP_SEC = 60;
/** YouTube bitiş ekranı öğeleri son 5–20 sn'ye biner. */
export const END_SCREEN_SEC = 20;

/** Zamanlı denetimler: hizalamadan (ve editör düzenlemelerinden) sonra, render'a girecek sahneler üzerinde. */
export const timedVisualChecks = (f: ScenesFile): string[] => {
  const out: string[] = [];
  const talking = f.format === 'talking-head';
  const dur = f.base.durationSec;
  const on = f.scenes.filter((s) => !s.disabled).sort((a, b) => a.startSec - b.startSec);
  for (const s of on) {
    const w = screenWords(s.props);
    const sec = s.endSec - s.startSec;
    if (w && w / sec > READ_WPS)
      out.push(`Satır ${s.line} (${fmt(s.startSec)}): ${w} kelime ${sec.toFixed(1)} sn ekranda; okunamaz (en fazla saniyede ${READ_WPS} kelime). Metni kısalt ya da sahneyi uzat.`);
  }
  if (talking && dur > 120) {
    let prev = 0;
    for (const s of on) {
      if (s.startSec - prev > MAX_GAP_SEC) out.push(`${fmt(prev)}–${fmt(s.startSec)} arası ${Math.round(s.startSec - prev)} sn görselsiz (en fazla ${MAX_GAP_SEC} sn; kamera anları dışında bir görsel ekle)`);
      prev = Math.max(prev, s.endSec);
    }
    if (dur - END_SCREEN_SEC - prev > MAX_GAP_SEC) out.push(`${fmt(prev)}–sonu arası görselsiz`);
    const early = on.filter((s) => s.startSec < 90).length;
    if (early < 3) out.push(`İlk 90 saniyede ${early} görsel var; izleyici en çok burada kaybedilir (en az 3 önerilir)`);
    for (const s of on) if (s.endSec > dur - END_SCREEN_SEC) out.push(`Satır ${s.line}: son ${END_SCREEN_SEC} sn'de görsel var; bitiş ekranı öğeleriyle çakışır, yüz kalsın`);
  }
  // YouTube bölümleri: ilki 0:00, en az 3 bölüm, her biri en az 10 sn; yoksa YouTube bölümleri göstermez.
  if (f.chapters.length && f.chapters.length < 3) out.push(`${f.chapters.length} bölüm var; YouTube en az 3 bölüm ister`);
  for (let i = 0; i < f.chapters.length; i++) {
    const end = f.chapters[i + 1]?.startSec ?? dur;
    if (end - f.chapters[i].startSec < 10) out.push(`"${f.chapters[i].title}" bölümü ${Math.round(end - f.chapters[i].startSec)} sn; YouTube her bölümün en az 10 sn olmasını ister`);
  }
  return out;
};
