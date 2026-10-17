// script.md / script.final.md okuyucu. Başlık bloğu, ## bölümleri, konuşulan cümleler ve 📍 işaretleri.

import crypto from 'node:crypto';
import type {Marker, ScriptHeader, Sentence, VideoFormat} from '../shared/types';
import {HAS_MARKER, MARKER_LINE, MarkerError, parseMarker, RETIRED_MARKER} from './markers';
import {splitSentences, stripMarkdown, tokenize} from './text';

/** Eski sıra numaralı kimlik (m001…): yalnızca eski edits.json kayıtlarını taşımak için. */
export const sequentialId = (i: number) => `m${String(i + 1).padStart(3, '0')}`;

/**
 * Kalıcı işaret kimliği: bağlı olduğu cümle + işaret türü + o cümledeki aynı türden işaretler arasındaki sırası.
 * Script'e başka yerde işaret eklemek, bir önerinin ?'ini silmek ya da animasyon metnini düzeltmek kimliği
 * değiştirmez; editör düzenlemeleri (build/edits.json) bu kimliğe bağlı olduğu için doğru sahnede kalır.
 */
const stableIds = (markers: Marker[], sentences: Sentence[]) => {
  const seen = new Map<string, number>();
  for (const m of markers) {
    const anchor = m.sentenceIndex >= 0 ? tokenize(sentences[m.sentenceIndex].text).join(' ') : `satir-${m.line}`;
    const kind = m.anim ?? m.props.type;
    const base = `${anchor}|${kind}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    m.id = 'k' + crypto.createHash('sha1').update(`${base}|${n}`).digest('hex').slice(0, 8);
  }
};

export type Issue = {line: number; level: 'hata' | 'uyarı' | 'bilgi'; msg: string};

export type ParsedScript = {
  header: ScriptHeader;
  sentences: Sentence[];
  words: string[]; // normalize edilmiş konuşulan kelimeler
  wordSentence: number[]; // her kelimenin cümle indeksi
  markers: Marker[];
  sections: {title: string; line: number; firstSentence: number}[];
  trailing: Record<string, string[]>; // "Kaynaklar", "Görsel Listesi" ... → satırlar
  issues: Issue[];
  lines: string[];
};

const TRAILING = ['Görsel Listesi', 'Kaynaklar', 'Kayıttan Önce Doğrulanacaklar', 'Değişiklik Raporu'];
const isTrailing = (title: string) => TRAILING.some((t) => title.toLocaleLowerCase('tr-TR').startsWith(t.toLocaleLowerCase('tr-TR')));

const FORMAT_MAP: Record<string, VideoFormat> = {
  'talking-head': 'talking-head',
  'talking head': 'talking-head',
  tutorial: 'tutorial',
  'teknik eğitim': 'tutorial',
  'teknik-egitim': 'tutorial',
};

export const parseScript = (source: string): ParsedScript => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const issues: Issue[] = [];
  const header: ScriptHeader = {title: '', fields: {}, format: 'talking-head', stage: 'çekim'};

  // ── Başlık bloğu ─────────────────────────────
  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '---') {
      i++;
      break;
    }
    const t = l.match(/^#\s+(.+)$/);
    if (t && !header.title) header.title = t[1].trim();
    const f = l.match(/^\*\*([^*:]+):\*\*\s*(.*)$/) ?? l.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
    if (f) header.fields[f[1].trim()] = f[2].trim();
    if (l.startsWith('## ')) {
      // Başlık bloğu --- ile kapanmamış.
      issues.push({line: i + 1, level: 'uyarı', msg: 'Başlık bloğu "---" ile kapanmamış'});
      break;
    }
  }
  const fmtRaw = (header.fields['Video formatı'] ?? '').toLocaleLowerCase('tr-TR');
  const fmt = Object.entries(FORMAT_MAP).find(([k]) => fmtRaw.includes(k));
  if (fmt) header.format = fmt[1];
  else issues.push({line: 1, level: 'uyarı', msg: `"Video formatı" okunamadı ("${fmtRaw}"), talking-head varsayıldı`});
  if ((header.fields['Aşama'] ?? '').toLocaleLowerCase('tr-TR').includes('kurgu')) header.stage = 'kurgu-sonrası';

  // ── Gövde ─────────────────────────────────────
  const sentences: Sentence[] = [];
  const words: string[] = [];
  const wordSentence: number[] = [];
  const markers: Marker[] = [];
  const sections: ParsedScript['sections'] = [];
  const trailing: Record<string, string[]> = {};
  let section: string | null = null;
  let trailingKey: string | null = null;
  let inFence = false;
  let inComment = false;
  let prev: 'text' | 'marker' | 'heading' | 'start' = 'start';
  let pendingFallback: Marker[] = []; // cümlenin altında olmayan işaretler → bir sonraki cümleye

  const addSentence = (text: string, line: number) => {
    const toks = tokenize(text);
    if (!toks.length) return;
    const idx = sentences.length;
    sentences.push({index: idx, text, section, line, wordStart: words.length, wordEnd: words.length + toks.length});
    for (const w of toks) {
      words.push(w);
      wordSentence.push(idx);
    }
    for (const m of pendingFallback) m.sentenceIndex = idx;
    pendingFallback = [];
  };

  for (; i < lines.length; i++) {
    const raw = lines[i];
    const l = raw.trim();
    const lineNo = i + 1;

    if (trailingKey) {
      const h = l.match(/^##\s+(.+)$/);
      if (h) trailingKey = h[1].trim();
      else if (l) (trailing[trailingKey] ??= []).push(l);
      continue;
    }
    if (l.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (inComment || l.startsWith('<!--')) {
      inComment = !l.includes('-->');
      continue;
    }
    if (!l) continue;
    if (l === '---' || l.startsWith('──')) continue;

    const h = l.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const title = h[2].trim();
      if (h[1].length <= 2 && isTrailing(title)) {
        trailingKey = title;
        continue;
      }
      if (h[1].length === 2) {
        section = title;
        sections.push({title, line: lineNo, firstSentence: sentences.length});
      }
      prev = 'heading';
      continue;
    }

    const mm = l.match(MARKER_LINE);
    if (mm && RETIRED_MARKER.test(mm[1])) {
      issues.push({line: lineNo, level: 'bilgi', msg: 'İLLÜSTRASYON işaretleri kaldırıldı; bu satır atlandı'});
      continue;
    }
    if (mm) {
      const id = sequentialId(markers.length); // geçici; parse sonunda kalıcı kimlik atanır
      try {
        const p = parseMarker(mm[1]);
        for (const msg of p.issues) issues.push({line: lineNo, level: 'uyarı', msg});
        const marker: Marker = {
          id,
          kind: p.kind,
          anim: p.anim,
          suggested: p.suggested,
          danger: p.danger,
          raw: l,
          line: lineNo,
          props: p.props,
          sentenceIndex: -1,
          section,
        };
        if (prev === 'text' || prev === 'marker') {
          marker.sentenceIndex = sentences.length - 1;
        } else {
          issues.push({line: lineNo, level: 'hata', msg: 'İşaret bir cümlenin hemen altında değil (başlıktan hemen sonra geliyor); bir sonraki cümleye bağlandı'});
          pendingFallback.push(marker);
        }
        markers.push(marker);
      } catch (e) {
        if (e instanceof MarkerError) issues.push({line: lineNo, level: 'hata', msg: `${e.message}: ${l}`});
        else throw e;
      }
      prev = 'marker';
      continue;
    }

    if (HAS_MARKER.test(l)) {
      issues.push({line: lineNo, level: 'hata', msg: 'İşaret cümlenin içinde ya da satırın ortasında; ayrı bir satıra, cümlenin altına koy'});
      const textPart = l.replace(/📍\s*\[[^\]]*\]/gu, ' ');
      for (const s of splitSentences(stripMarkdown(textPart))) addSentence(s, lineNo);
      prev = 'text';
      continue;
    }

    // Liste ve alıntı satırları da konuşulan metindir.
    const text = stripMarkdown(l.replace(/^([-*+]|\d+[.)])\s+/, ''));
    for (const s of splitSentences(text)) addSentence(s, lineNo);
    prev = 'text';
  }

  stableIds(markers, sentences);
  return {header, sentences, words, wordSentence, markers, sections, trailing, issues, lines};
};
