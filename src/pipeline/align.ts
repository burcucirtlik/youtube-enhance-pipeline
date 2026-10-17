// Script kelimelerini altyazıdan çıkan kelime zamanlarıyla hizalar, her 📍 işaretini zamanlı bir sahneye çevirir.

import fs from 'node:fs';
import path from 'node:path';
import type {Chapter, Marker, Scene, SceneProps, ScenesFile} from '../shared/types';
import type {ParsedScript} from './parse-script';
import {levenshtein, normalizeWord, tokenize} from './text';
import {timedVisualChecks} from './visual-checks';
import {loadCandidateSet, loadPlaces, loadRegistry, withCredit} from './commons';
import {applyEdits, loadEdits, migrateEdits} from './edits';
import {assetKey, ffprobe, paths, rel, type Probe} from './util';

export type Transcript = {duration: number; words: {w: string; start: number; end: number; p?: number}[]};

// ── Kelime hizalama (Needleman–Wunsch, bulanık kelime eşleşmesi) ───────────

const GAP = -1;

const similarity = (a: string, b: string): number => {
  if (a === b) return 3;
  const min = Math.min(a.length, b.length);
  if (min >= 4) {
    let k = 0;
    while (k < min && a[k] === b[k]) k++;
    // Türkçe ekler: "kavanozları" ~ "kavanozlar"
    if (k === min || k >= 5) return 2;
  }
  const max = Math.max(a.length, b.length);
  if (max >= 3 && 1 - levenshtein(a, b) / max >= 0.75) return 1;
  return -2;
};

/** Her script kelimesi için eşleşen transkript kelimesinin indeksi (yoksa -1). */
export const alignWords = (script: string[], spoken: string[]): Int32Array => {
  const n = script.length;
  const m = spoken.length;
  const ids = new Map<string, number>();
  const intern = (w: string) => ids.get(w) ?? (ids.set(w, ids.size), ids.size - 1);
  const A = script.map(intern);
  const uA = ids.size;
  const B = spoken.map(intern);
  const U = ids.size;
  const vocab = [...ids.keys()];
  const cache = new Int8Array(uA * U).fill(127);
  const sim = (a: number, b: number) => {
    const k = a * U + b;
    let v = cache[k];
    if (v === 127) v = cache[k] = similarity(vocab[a], vocab[b]);
    return v;
  };

  const tb = new Uint8Array((n + 1) * (m + 1)); // 0 köşegen, 1 yukarı (script kelimesi atlandı), 2 sol (transkript kelimesi atlandı)
  let prev = new Int32Array(m + 1);
  let cur = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) {
    prev[j] = j * GAP;
    tb[j] = 2;
  }
  for (let i = 1; i <= n; i++) {
    cur[0] = i * GAP;
    tb[i * (m + 1)] = 1;
    const ai = A[i - 1];
    for (let j = 1; j <= m; j++) {
      const d = prev[j - 1] + sim(ai, B[j - 1]);
      const u = prev[j] + GAP;
      const l = cur[j - 1] + GAP;
      if (d >= u && d >= l) {
        cur[j] = d;
        tb[i * (m + 1) + j] = 0;
      } else if (u >= l) {
        cur[j] = u;
        tb[i * (m + 1) + j] = 1;
      } else {
        cur[j] = l;
        tb[i * (m + 1) + j] = 2;
      }
    }
    [prev, cur] = [cur, prev];
  }

  const map = new Int32Array(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const t = tb[i * (m + 1) + j];
    if (t === 0) {
      if (sim(A[i - 1], B[j - 1]) > 0) map[i - 1] = j - 1;
      i--;
      j--;
    } else if (t === 1) i--;
    else j--;
  }
  return map;
};

// ── Sahne zamanlaması ──────────────────────────────────────────────────────

export type AlignOptions = {
  includeSuggested: boolean;
  minSceneSec: number;
  maxSceneSec: number;
  maxScreenSec: number;
  tailSec: number;
};

export const DEFAULT_ALIGN: AlignOptions = {
  includeSuggested: true, // scenes.json hepsini taşır; render bayrakla filtreler
  minSceneSec: 2.5,
  maxSceneSec: 9,
  maxScreenSec: 25,
  tailSec: 0.35,
};

type SentenceTime = {start: number; end: number; coverage: number} | null;

export const sentenceTimes = (s: ParsedScript, t: Transcript): SentenceTime[] => alignScript(s, t).times;

/** Cümle zamanları + tek tek script kelimelerinin kayıttaki zamanı (bulunamayan kelime: null). */
export const alignScript = (s: ParsedScript, t: Transcript) => {
  const spoken = t.words.map((w) => normalizeWord(w.w));
  // Boş normalize olan transkript kelimelerini (sadece noktalama) çıkar ama indeksleri koru.
  const keep: number[] = [];
  spoken.forEach((w, k) => w && keep.push(k));
  const map = alignWords(s.words, keep.map((k) => spoken[k]));
  const wordTime = (w: number) => (map[w] >= 0 ? t.words[keep[map[w]]] : null);
  const times = s.sentences.map((sen): SentenceTime => {
    let first = -1;
    let last = -1;
    let matched = 0;
    for (let w = sen.wordStart; w < sen.wordEnd; w++) {
      const j = map[w];
      if (j < 0) continue;
      matched++;
      if (first < 0) first = keep[j];
      last = keep[j];
    }
    const total = sen.wordEnd - sen.wordStart;
    const coverage = matched / total;
    const needed = total <= 3 ? 1 : Math.max(2, Math.ceil(total * 0.34));
    if (matched < needed) return null;
    return {start: t.words[first].start, end: t.words[last].end, coverage};
  });
  return {times, wordTime};
};

/**
 * `@ "kelime"`: cümlenin içinde bu kelimelerin söylendiği an. Türkçe ekler için kelimenin başı eşleşmesi yeter
 * ("milyar" ↔ "milyarı"). Bulunamazsa null; sahne cümle başında girer.
 */
export const anchorTime = (s: ParsedScript, si: number, phrase: string, wordTime: (w: number) => {start: number} | null): number | null => {
  const toks = tokenize(phrase);
  if (!toks.length) return null;
  const sen = s.sentences[si];
  const same = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
  for (let w = sen.wordStart; w + toks.length <= sen.wordEnd; w++) {
    if (!toks.every((tk, k) => same(s.words[w + k], tk))) continue;
    for (let k = 0; k < toks.length; k++) {
      const wt = wordTime(w + k);
      if (wt) return wt.start;
    }
  }
  return null;
};

/** Kelimeyi bu cümleden başlayarak sonraki birkaç cümlede arar (liste maddeleri birkaç cümleye yayılır). */
export const anchorTimeAfter = (s: ParsedScript, si: number, phrase: string, wordTime: (w: number) => {start: number} | null, span = 15): number | null => {
  for (let k = si; k < Math.min(s.sentences.length, si + span); k++) {
    const t = anchorTime(s, k, phrase, wordTime);
    if (t !== null) return t;
  }
  return null;
};

/** Türe göre ekranda kalma süresi sınırları (sn); verilmeyenler AlignOptions'tan. */
const DURATION: Partial<Record<SceneProps['type'], [number, number]>> = {
  lower: [3, 5],
  emphasis: [1.5, 3],
  zoom: [1.2, 4],
  source: [3, 6],
  map: [3, 7],
  chart: [4, 9],
  chat: [4, 20],
  list: [4, 40],
};

const resolveAsset = (dir: string, props: SceneProps, probeCache: Map<string, Probe>): {props: SceneProps; missing?: string} => {
  const p = paths(dir);
  const inAssets = (f: string) => path.join(p.assets, f);
  switch (props.type) {
    case 'screen': {
      const f = inAssets(props.file);
      if (!fs.existsSync(f)) return {props, missing: `assets/${props.file}`};
      if (!probeCache.has(f)) probeCache.set(f, ffprobe(f));
      return {props: {...props, file: rel(dir, f), mediaDurationSec: probeCache.get(f)!.durationSec}};
    }
    case 'photo': {
      const f = inAssets(props.file);
      // Seçilmiş fotoğraf: atıf assets/kaynaklar.json'dan altyazıya eklenir.
      if (fs.existsSync(f)) return {props: {...props, file: rel(dir, f), caption: withCredit(props.caption, loadRegistry(dir)[props.file])}};
      // Henüz seçilmedi: önizlemede geçici olarak 1. aday.
      const first = loadCandidateSet(dir, props.file)?.candidates[0];
      if (first?.local) return {props: {...props, file: first.local, caption: withCredit(props.caption, first), provisional: true}};
      return {props, missing: `assets/${props.file}${props.search ? ' (npm run assets ile aday ara)' : ''}`};
    }
    case 'clip': {
      const probe = (f: string) => {
        if (!probeCache.has(f)) probeCache.set(f, ffprobe(f));
        return probeCache.get(f)!.durationSec;
      };
      const f = inAssets(props.file);
      if (fs.existsSync(f)) return {props: {...props, file: rel(dir, f), caption: withCredit(props.caption, loadRegistry(dir)[props.file], 'Video'), mediaDurationSec: probe(f)}};
      const first = loadCandidateSet(dir, props.file)?.candidates[0];
      if (first?.local)
        return {props: {...props, file: first.local, caption: withCredit(props.caption, first, 'Video'), provisional: true, mediaDurationSec: probe(path.join(dir, first.local))}};
      return {props, missing: `assets/${props.file}${props.search ? ' (npm run assets ile aday ara)' : ''}`};
    }
    case 'map': {
      if (props.lat !== undefined && props.lon !== undefined) return {props};
      const hit = loadPlaces(dir)[props.place];
      if (hit) return {props: {...props, lat: hit.lat, lon: hit.lon}};
      return {props, missing: `"${props.place}" konumu bulunamadı (npm run assets; ya da işarete konum: enlem, boylam yaz)`};
    }
    case 'code': {
      const f = inAssets(props.file);
      if (!fs.existsSync(f)) return {props, missing: `assets/${props.file}`};
      return {props: {...props, code: fs.readFileSync(f, 'utf8'), language: path.extname(f).slice(1)}};
    }
    case 'news':
    case 'document': {
      const key = assetKey(props)!;
      // Elle konan dosya (assets/) üretilene (build/assets/) üstün gelir.
      for (const base of [p.assets, p.buildAssets]) {
        for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
          const img = path.join(base, key + ext);
          if (!fs.existsSync(img)) continue;
          const metaFile = path.join(p.buildAssets, key + '.json');
          const meta = fs.existsSync(metaFile) && base === p.buildAssets ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
          return {props: {...props, image: rel(dir, img), rects: meta.rects, imageSize: meta.width ? {width: meta.width, height: meta.height} : undefined} as SceneProps};
        }
      }
      return {props, missing: `${key}.png (npm run assets)`};
    }
    default:
      return {props};
  }
};

export const buildScenes = (
  dir: string,
  scriptFile: string,
  s: ParsedScript,
  t: Transcript,
  base: {file: string; kind: 'video' | 'audio'; probe: Probe},
  opts: AlignOptions = DEFAULT_ALIGN,
): ScenesFile => {
  const {times, wordTime} = alignScript(s, t);
  const warnings: string[] = [];
  const dropped: ScenesFile['dropped'] = [];
  const duration = base.probe.durationSec || t.duration;
  const tutorial = s.header.format === 'tutorial';
  const probeCache = new Map<string, Probe>();

  const cutSentences = times.filter((x) => x === null).length;
  if (cutSentences / Math.max(1, times.length) > 0.5)
    warnings.push(`Cümlelerin %${Math.round((cutSentences / times.length) * 100)}'i kayıtta bulunamadı. Doğru kayıt mı? Kurgudan sonra script.final.md üretmek hizalamayı düzeltir.`);

  // Birden fazla aday seçilmiş FOTO işaretleri ayrı sahnelere açılır (aynı cümlenin süresi bölünür).
  const registry = loadRegistry(dir);
  const markers: Marker[] = s.markers.flatMap((m) => {
    const pr = m.props;
    if (pr.type !== 'photo' && pr.type !== 'clip') return [m];
    const extra = registry[pr.file]?.extra ?? [];
    return [m, ...extra.map((file, i): Marker => ({...m, id: `${m.id}#${i + 2}`, props: {...pr, file}}))];
  });

  // İşaretleri cümlelerine göre grupla.
  const bySentence = new Map<number, Marker[]>();
  for (const m of markers) {
    if (!opts.includeSuggested && m.suggested) continue;
    if (m.sentenceIndex < 0) {
      dropped.push({markerId: m.id, line: m.line, raw: m.raw, reason: 'bir cümleye bağlanamadı'});
      continue;
    }
    if (!times[m.sentenceIndex]) {
      dropped.push({markerId: m.id, line: m.line, raw: m.raw, reason: `desteklediği cümle kayıtta yok (kurguda kesilmiş olabilir): "${s.sentences[m.sentenceIndex].text.slice(0, 80)}"`});
      continue;
    }
    const arr = bySentence.get(m.sentenceIndex) ?? [];
    arr.push(m);
    bySentence.set(m.sentenceIndex, arr);
  }

  const scenes: Scene[] = [];
  // Kısa bir cümlenin altındaki işaretler en kısa sürelerini doldurmak için sonraki cümleye taşabilir;
  // o zaman sonraki cümlenin sahneleri onların arasına girmesin, ardından gelsin.
  let cursor = 0;
  for (const [si, ms] of [...bySentence.entries()].sort((a, b) => a[0] - b[0])) {
    const st = times[si]!;
    const span = Math.max(st.end - st.start, opts.minSceneSec * ms.length);
    const slot = span / ms.length;
    const groupStart = Math.max(st.start, cursor);
    if (groupStart - st.start > 2) warnings.push(`Satır ${ms[0].line}: önceki işaretler taştığı için sahne cümlesinden ${(groupStart - st.start).toFixed(1)} sn geç giriyor`);
    cursor = groupStart + span;
    let prevStart = -Infinity;
    ms.forEach((m, k) => {
      const {props, missing} = resolveAsset(dir, m.props, probeCache);
      // @ "kelime": görsel o kelime söylenince girer (biraz önce: göz kelimeyi duyduğunda görseli bulsun).
      const at = m.at ? anchorTime(s, si, m.at, wordTime) : null;
      if (m.at && at === null) warnings.push(`Satır ${m.line}: @ "${m.at}" cümlede ya da kayıtta bulunamadı; görsel cümle başında giriyor`);
      let start = at !== null ? Math.max(at - 0.15, groupStart) : groupStart + k * slot;
      start = Math.max(start, prevStart + 0.5);
      prevStart = start;
      let [minSec, maxSec] = DURATION[props.type] ?? [opts.minSceneSec, opts.maxSceneSec];
      // Sohbet okunacak kadar kalır (saniyede ~3 kelime).
      if (props.type === 'chat') minSec = Math.max(minSec, Math.min(maxSec, props.turns.join(' ').split(/\s+/).length / 3));
      // Sistem diyagramı: aktörler girer, her olay ~1,6 sn'de izlenebilsin (kısa cümlede 4 olay 3 sn'ye sıkışıyordu).
      if (props.type === 'system') minSec = Math.max(minSec, Math.min(maxSec, 1.2 + 1.6 * props.events.length));
      // Liste: her madde kendi kelimesinde gelir (sonraki cümlelerde de olabilir); sahne son maddeden 3 sn sonra biter.
      if (props.type === 'list') {
        let last = 0;
        props.items = props.items.map((it, i) => {
          const t = it.at ? anchorTimeAfter(s, si, it.at, wordTime) : null;
          if (it.at && t === null) warnings.push(`Satır ${m.line}: liste maddesi "${it.text}" için @ "${it.at}" bulunamadı; eşit aralıkla gelecek`);
          const off = t !== null ? Math.max(0, t - 0.15 - start) : null;
          const fallback = last + (i === 0 ? 0.3 : 1.2);
          last = Math.max(off ?? fallback, i === 0 ? 0 : last + 0.4);
          return {...it, offsetSec: last};
        });
        minSec = Math.max(minSec, last + 3);
      }
      let end = (at !== null ? Math.max(st.end, start + slot) : start + slot) + (k === ms.length - 1 ? opts.tailSec : 0);
      if (props.type === 'screen' && props.mediaDurationSec) end = Math.max(end, start + Math.min(props.mediaDurationSec, opts.maxScreenSec));
      else end = Math.min(Math.max(end, start + minSec), start + maxSec);
      // Arşiv videosu kendi süresinden uzun gösterilmez (son karede donmasın).
      if (props.type === 'clip' && props.mediaDurationSec) end = Math.min(end, start + Math.max(minSec, props.mediaDurationSec));
      if (missing) warnings.push(`Satır ${m.line}: varlık eksik → ${missing} (yer tutucu çizilecek)`);
      if ((props.type === 'photo' || props.type === 'clip') && props.provisional) warnings.push(`Satır ${m.line}: ${props.file.split('/').pop()} henüz seçilmedi, geçici olarak 1. aday kullanılıyor`);
      scenes.push({
        id: `s${String(scenes.length + 1).padStart(3, '0')}`,
        markerId: m.id,
        line: m.line,
        kind: m.kind,
        suggested: m.suggested,
        danger: m.danger,
        layout: m.layout,
        startSec: start,
        endSec: end,
        anchorText: s.sentences[si].text,
        props,
        missingAsset: missing,
      });
    });
  }

  // Çakışmaları çöz: bir sahne bir sonrakinin başladığı yerde biter.
  scenes.sort((a, b) => a.startSec - b.startSec);
  for (let k = 0; k < scenes.length; k++) {
    const next = scenes[k + 1];
    const sc = scenes[k];
    if (tutorial) sc.endSec = next ? next.startSec : duration; // yüz yok: boşluk bırakma
    else if (next && sc.endSec > next.startSec - 0.05) sc.endSec = Math.max(sc.startSec + 0.5, next.startSec - 0.05);
    sc.endSec = Math.min(sc.endSec, duration);
    if (sc.endSec - sc.startSec < 1.2) warnings.push(`Satır ${sc.line}: sahne ${(sc.endSec - sc.startSec).toFixed(1)} sn'ye sıkıştı (işaretler çok yakın)`);
  }
  if (tutorial && scenes[0] && scenes[0].startSec < 12) scenes[0].startSec = 0;

  // YouTube bölüm işaretleri: ## başlıklarının gerçekte başladığı an.
  const chapters: Chapter[] = [];
  for (const sec of s.sections) {
    for (let si = sec.firstSentence; si < s.sentences.length && s.sentences[si].section === sec.title; si++) {
      if (times[si]) {
        chapters.push({title: sec.title, startSec: times[si]!.start});
        break;
      }
    }
  }
  if (chapters[0]) chapters[0].startSec = 0;

  const result: ScenesFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    title: s.header.title,
    format: s.header.format,
    scriptFile: rel(dir, scriptFile),
    base: {
      kind: base.kind,
      src: rel(dir, base.file),
      durationSec: duration,
      width: base.kind === 'video' ? base.probe.width : 1920,
      height: base.kind === 'video' ? base.probe.height : 1080,
      fps: base.kind === 'video' ? base.probe.fps : 30,
    },
    chapters,
    scenes,
    dropped,
    warnings,
  };
  // Editör düzenlemeleri (kaydırma, kısaltma, silme) ham hizalamanın üstüne biner.
  const mig = migrateEdits(dir, s.markers.map((m) => m.id));
  if (mig.migrated) warnings.push(`${mig.migrated} eski editör düzenlemesi kalıcı işaret kimliklerine taşındı`);
  if (mig.dropped.length) warnings.push(`Eşleşmeyen eski düzenleme: ${mig.dropped.join(', ')}`);
  const edits = loadEdits(dir);
  const applied = applyEdits(result, edits);
  const editedCount = applied.scenes.filter((x) => x.edited || x.disabled).length;
  if (editedCount) warnings.push(`${editedCount} sahnede editör düzenlemesi uygulandı (build/edits.json)`);
  // İzlenebilirlik denetimleri editörden sonraki hâl üzerinde: okuma hızı, görselsiz aralık, ilk 90 / son 20 sn, bölümler.
  const out = {...applied, aligned: result.scenes};
  out.warnings = [...out.warnings, ...timedVisualChecks(out)];
  return out;
};
