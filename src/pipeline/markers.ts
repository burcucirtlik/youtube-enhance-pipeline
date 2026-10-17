// 📍 işaret grameri. Türlerin listesi src/shared/marker-schema.ts'te (skill'deki sözlük de oradan üretilir);
// burada her türün içeriğinin nasıl ayrıştırıldığı var.

import {ANIM_TYPES, KIND_ALIASES, MARKER_KINDS, RETIRED_MARKERS} from '../shared/marker-schema';
import type {AnimType, LabeledText, Layout, MarkerKind, SceneProps} from '../shared/types';

export const MARKER_LINE = /^\s*📍\s*\[(.*)\]\s*$/u;

/** Kaldırılan türler (ör. İLLÜSTRASYON, 2026-10-17); eski script'lerdeki bu işaretler hata vermeden atlanır. */
export const RETIRED_MARKER = new RegExp(`^\\s*(${RETIRED_MARKERS.flatMap((r) => r.aliases).join('|')})\\??\\s*:`, 'iu');
export const HAS_MARKER = /📍/u;

const KINDS: Record<string, MarkerKind> = Object.fromEntries(MARKER_KINDS.map((k) => [k, k]));

export type ParsedMarker = {
  kind: MarkerKind;
  anim?: AnimType;
  suggested: boolean;
  danger: boolean;
  layout?: Layout;
  at?: string;
  props: SceneProps;
  issues: string[]; // lint için yazım sorunları (parse yine de başarılı)
};

export class MarkerError extends Error {}

/** "..." ve “...” içindeki metinleri sırayla döndürür. */
export const quoted = (s: string): string[] =>
  [...s.matchAll(/"([^"]*)"|“([^”]*)”/g)].map((m) => (m[1] ?? m[2]).trim());

const labeled = (s: string): LabeledText => {
  const i = s.indexOf(':');
  if (i > 0 && i < 40) return {label: s.slice(0, i).trim(), text: s.slice(i + 1).trim()};
  return {text: s.trim()};
};

/** "a, b, c" → ["a","b","c"]; tırnak içindeki virgülleri bölmez. */
export const splitTopLevel = (s: string, sep = ','): string[] => {
  const out: string[] = [];
  let cur = '';
  let q: string | null = null;
  for (const ch of s) {
    if (q) {
      cur += ch;
      if ((q === '"' && ch === '"') || (q === '“' && ch === '”') || (q === '`' && ch === '`')) q = null;
      continue;
    }
    if (ch === '"' || ch === '“' || ch === '`') {
      q = ch;
      cur += ch;
      continue;
    }
    if (ch === sep) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

const unquote = (s: string): string => {
  const q = quoted(s);
  return q.length ? q[0] : s.trim();
};

export const parseMarker = (inner: string): ParsedMarker => {
  const issues: string[] = [];
  const head = inner.match(/^\s*([^\s:?]+)(\?)?\s*:\s*([\s\S]*)$/u);
  if (!head) throw new MarkerError('İşaret "TÜR: içerik" biçiminde değil');
  const rawKind = head[1].toLocaleUpperCase('tr-TR');
  let kind = KINDS[rawKind];
  if (!kind) {
    kind = KIND_ALIASES[rawKind] ?? KIND_ALIASES[head[1].toUpperCase()];
    if (!kind) throw new MarkerError(`Bilinmeyen işaret türü: ${head[1]}`);
    issues.push(`Tür "${head[1]}" yazılmış, sözlükteki yazım "${kind}"`);
  }
  const suggested = Boolean(head[2]);
  let body = head[3].trim();

  // Her türde en sonda, herhangi bir sırayla: ", ton: tehlike", ", yerleşim: yan", ', @ "söylenen kelime"'.
  let danger = false;
  let layout: Layout | undefined;
  let at: string | undefined;
  for (;;) {
    const opt = body.match(/,?\s*(?:ton\s*:\s*([\p{L}-]+)|yerleşim\s*:\s*([\p{L}-]+)|@\s*(?:"([^"]+)"|“([^”]+)”))\s*$/u);
    if (!opt) break;
    body = body.slice(0, opt.index).trim();
    if (opt[1]) {
      const t = opt[1].toLocaleLowerCase('tr-TR');
      if (t !== 'tehlike') issues.push(`Bilinmeyen ton: ${opt[1]} (sadece "tehlike" var)`);
      danger = t === 'tehlike';
    } else if (opt[2]) {
      const l = opt[2].toLocaleLowerCase('tr-TR');
      if (l === 'yan' || l === 'tam') layout = l;
      else issues.push(`Bilinmeyen yerleşim: ${opt[2]} ("yan" ya da "tam")`);
    } else at = (opt[3] ?? opt[4]).trim();
  }

  const props = parseBody(kind, body, issues);
  const anim = props.type in ANIM_SET ? (props.type as AnimType) : undefined;
  if (layout === 'yan' && (props.type === 'lower' || props.type === 'emphasis')) {
    issues.push(`${kind} zaten yüzün üstünde; "yerleşim: yan" yok sayıldı`);
    layout = undefined;
  }
  return {kind, anim, suggested, danger, layout, at, props, issues};
};

const ANIM_SET: Record<string, true> = Object.fromEntries(ANIM_TYPES.map((t) => [t, true]));

const parseHighlight = (s: string | undefined, issues: string[]): string | null => {
  if (s === undefined) {
    issues.push('"vurgula:" eksik');
    return null;
  }
  const v = s.trim();
  if (v === '?' || v === '"?"') return null;
  const q = quoted(v);
  if (!q.length) issues.push('"vurgula:" metni tırnak içinde değil');
  return q.length ? q[0] : v;
};

const splitHighlight = (body: string): [string, string | undefined] => {
  const m = body.match(/,?\s*vurgula\s*:\s*([\s\S]*)$/u);
  if (!m) return [body, undefined];
  return [body.slice(0, m.index).trim(), m[1]];
};

const parseBody = (kind: MarkerKind, body: string, issues: string[]): SceneProps => {
  switch (kind) {
    case 'ANİM':
      return parseAnim(body, issues);
    case 'EKRAN': {
      const [file, ...rest] = splitTopLevel(body);
      if (!file) throw new MarkerError('EKRAN: dosya adı eksik');
      return {type: 'screen', file: file.trim(), note: rest.join(', ') || undefined};
    }
    case 'HABER': {
      const [before, hl] = splitHighlight(body);
      const url = before.replace(/,$/, '').trim();
      if (!/^https?:\/\//.test(url)) issues.push('HABER: link http(s):// ile başlamıyor');
      return {type: 'news', url, highlight: parseHighlight(hl, issues)};
    }
    case 'BELGE': {
      const [before, hl] = splitHighlight(body);
      const parts = splitTopLevel(before);
      const file = parts[0] ?? '';
      const pageStr = parts.find((p) => /^s\.?\s*\d+/i.test(p));
      const page = pageStr ? Number(pageStr.match(/\d+/)![0]) : 1;
      if (!pageStr) issues.push('BELGE: sayfa ("s. 12") eksik, 1. sayfa varsayıldı');
      return {type: 'document', file, page, highlight: parseHighlight(hl, issues)};
    }
    case 'FOTO':
    case 'KLİP': {
      // ara: "..." → pipeline bu sorguyla Wikimedia Commons'ta arşiv fotoğrafı / videosu adayı arar.
      let rest = body;
      let search: string | undefined;
      const am = rest.match(/,?\s*ara\s*:\s*(?:"([^"]*)"|“([^”]*)”)\s*$/u);
      if (am) {
        search = (am[1] ?? am[2]).trim();
        rest = rest.slice(0, am.index).trim();
      }
      const parts = splitTopLevel(rest);
      const file = parts[0] ?? '';
      const caption = parts[1] ? unquote(parts.slice(1).join(', ')) : undefined;
      if (kind === 'KLİP') {
        if (file && !/\.(mp4|mov|webm|m4v)$/i.test(file)) issues.push(`KLİP: dosya adı video uzantılı olmalı (.mp4): ${file}`);
        return {type: 'clip', file, caption, search};
      }
      return {type: 'photo', file, caption, search};
    }
    case 'ALT': {
      const q = quoted(body);
      if (!q.length) throw new MarkerError('ALT: "Ad Soyad", "unvan" biçiminde olmalı');
      return {type: 'lower', name: q[0], title: q[1]};
    }
    case 'VURGU': {
      const q = quoted(body);
      if (!q.length) throw new MarkerError('VURGU: "kısa metin" biçiminde olmalı');
      return {type: 'emphasis', text: q[0]};
    }
    case 'POST': {
      const parts = splitTopLevel(body);
      if (parts.length < 3) issues.push('POST: "platform, @kullanici, \\"metin\\"" biçiminde olmalı');
      return {
        type: 'post',
        platform: parts[0] ?? '',
        handle: parts[1] ?? '',
        text: unquote(parts.slice(2).join(', ')),
      };
    }
  }
};

const parseAnim = (body: string, issues: string[]): SceneProps => {
  const m = body.match(/^\s*([a-zA-Z]+)\s*(—|–|-{1,2})\s*([\s\S]*)$/u);
  if (!m) throw new MarkerError('ANİM: "tür — içerik" biçiminde değil (örn. ANİM: flow — "a" → "b")');
  const sub = m[1].toLowerCase() as AnimType;
  if (m[2] !== '—') issues.push(`ANİM: tür ile içerik arasında "—" (uzun tire) olmalı, "${m[2]}" yazılmış`);
  if (!ANIM_TYPES.includes(sub)) throw new MarkerError(`Bilinmeyen animasyon türü: ${m[1]}`);
  const rest = m[3].trim();
  const q = quoted(rest);

  switch (sub) {
    case 'flow': {
      const steps = q.length ? q : rest.split('→').map((s) => s.trim()).filter(Boolean);
      if (steps.length < 2) issues.push('flow: en az iki adım olmalı');
      return {type: 'flow', steps};
    }
    case 'compare': {
      const sides = q.length >= 2 ? q : rest.split(/\s+vs\.?\s+/i).map(unquote);
      if (sides.length < 2) issues.push('compare: "A" vs "B" biçiminde iki taraf olmalı');
      return {type: 'compare', left: labeled(sides[0] ?? ''), right: labeled(sides[1] ?? '')};
    }
    case 'table': {
      const groups = splitTopLevel(rest, '|');
      const cells = (g: string) => {
        const qq = quoted(g);
        return qq.length ? qq : g.split(/[;,]/).map((c) => c.trim()).filter(Boolean);
      };
      const [h, ...rows] = groups.map(cells);
      if (!rows.length) issues.push('table: başlık satırından sonra en az bir satır olmalı');
      return {type: 'table', headers: h ?? [], rows};
    }
    case 'timeline': {
      const pts = q.length ? q : rest.split('→').map((s) => s.trim()).filter(Boolean);
      return {type: 'timeline', points: pts.map(labeled)};
    }
    case 'stat':
      return {type: 'stat', value: q[0] ?? rest, caption: q[1]};
    case 'quote':
      if (q.length < 2) issues.push('quote: "alıntı", "Ad Soyad" biçiminde olmalı');
      return {type: 'quote', text: q[0] ?? rest, author: q[1]};
    case 'terminal': {
      const cmds = [...rest.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
      if (!cmds.length) issues.push('terminal: komut `ters tırnak` içinde olmalı');
      return {type: 'terminal', commands: cmds.length ? cmds : [rest]};
    }
    case 'code': {
      const [file, ...more] = splitTopLevel(rest);
      const highlight: number[] = [];
      for (const part of more) {
        for (const r of part.matchAll(/(\d+)\s*(?:[-–]\s*(\d+))?/g)) {
          const a = Number(r[1]);
          const b = r[2] ? Number(r[2]) : a;
          for (let i = a; i <= b; i++) highlight.push(i);
        }
      }
      return {type: 'code', file: file.replace(/`/g, '').trim(), highlight};
    }
    case 'concept':
      return {type: 'concept', term: q[0] ?? rest, definition: q[1]};
    case 'map': {
      // konum: enlem, boylam — verilmezse pipeline yer adından bulur (OpenStreetMap).
      const km = rest.match(/,?\s*konum\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/u);
      const qq = quoted(km ? rest.slice(0, km.index) : rest);
      if (!qq.length) issues.push('map: yer adı tırnak içinde olmalı ("Kigali, Ruanda")');
      return {type: 'map', place: qq[0] ?? rest, caption: qq[1], lat: km ? Number(km[1]) : undefined, lon: km ? Number(km[2]) : undefined};
    }
  }
};

/** Kurallar: kısa, küçük harf, Türkçe karaktersiz, tireli. */
export const isValidFileName = (f: string): boolean => /^[a-z0-9]+(?:[-_][a-z0-9]+)*\.[a-z0-9]{2,5}$/.test(f);
