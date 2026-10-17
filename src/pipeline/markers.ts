// 📍 işaret grameri. Sözlük: .claude/skills/youtube-script-writer/SKILL.md → "Görsel İşaretler".

import type {AnimType, LabeledText, MarkerKind, SceneProps} from '../shared/types';

export const MARKER_LINE = /^\s*📍\s*\[(.*)\]\s*$/u;

/** İLLÜSTRASYON (AI görseli) 2026-10-17'de kaldırıldı; eski script'lerdeki bu işaretler hata vermeden atlanır. */
export const RETIRED_MARKER = /^\s*(İLLÜSTRASYON|ILLUSTRASYON|İLLUSTRASYON|ILLÜSTRASYON)\??\s*:/iu;
export const HAS_MARKER = /📍/u;

const KINDS: Record<string, MarkerKind> = {
  'ANİM': 'ANİM',
  'EKRAN': 'EKRAN',
  'HABER': 'HABER',
  'BELGE': 'BELGE',
  'FOTO': 'FOTO',
  'POST': 'POST',
};
// Yazım hatası toleransı: kabul edilir ama lint uyarı verir.
const KIND_ALIASES: Record<string, MarkerKind> = {
  ANIM: 'ANİM',
};

const ANIM_TYPES: AnimType[] = ['flow', 'compare', 'table', 'timeline', 'stat', 'quote', 'terminal', 'code', 'concept'];

export type ParsedMarker = {
  kind: MarkerKind;
  anim?: AnimType;
  suggested: boolean;
  danger: boolean;
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

  // ", ton: tehlike" her türde en sonda gelebilir.
  let danger = false;
  const tone = body.match(/,?\s*ton\s*:\s*([\p{L}-]+)\s*$/u);
  if (tone) {
    if (tone[1].toLocaleLowerCase('tr-TR') !== 'tehlike') issues.push(`Bilinmeyen ton: ${tone[1]} (sadece "tehlike" var)`);
    danger = tone[1].toLocaleLowerCase('tr-TR') === 'tehlike';
    body = body.slice(0, tone.index).trim();
  }

  const props = parseBody(kind, body, issues);
  const anim = props.type in ANIM_SET ? (props.type as AnimType) : undefined;
  return {kind, anim, suggested, danger, props, issues};
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
    case 'FOTO': {
      // ara: "..." → pipeline bu sorguyla Wikimedia Commons'ta arşiv fotoğrafı adayı arar.
      let rest = body;
      let search: string | undefined;
      const am = rest.match(/,?\s*ara\s*:\s*(?:"([^"]*)"|“([^”]*)”)\s*$/u);
      if (am) {
        search = (am[1] ?? am[2]).trim();
        rest = rest.slice(0, am.index).trim();
      }
      const parts = splitTopLevel(rest);
      return {type: 'photo', file: parts[0] ?? '', caption: parts[1] ? unquote(parts.slice(1).join(', ')) : undefined, search};
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
  }
};

/** Kurallar: kısa, küçük harf, Türkçe karaktersiz, tireli. */
export const isValidFileName = (f: string): boolean => /^[a-z0-9]+(?:[-_][a-z0-9]+)*\.[a-z0-9]{2,5}$/.test(f);
