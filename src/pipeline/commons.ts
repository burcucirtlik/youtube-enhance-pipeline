// Arşiv fotoğrafı bulma: FOTO işaretindeki `ara: "..."` sorgusuyla Wikimedia Commons'ta aday arar,
// en iyi 3'ünü indirir, Zena seçer; seçilen fotoğrafın atfı altyazıya ve Kaynaklar tablosuna yazılır.

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {Marker} from '../shared/types';
import {paths, pickScript} from './util';

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia, istemcinin kendini tanıtmasını istiyor.
const UA = 'YouTubeEnhancePipeline/0.1 (personal video tool; archival photo search)';
export const CANDIDATES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wikimedia hız sınırı: istekler arasında kısa bekleme, 429/503'te Retry-After kadar bekleyip yeniden dene. */
const politeFetch = async (url: string | URL, tries = 4): Promise<Response> => {
  for (let i = 0; ; i++) {
    await sleep(350);
    const res = await fetch(url, {headers: {'User-Agent': UA}});
    if ((res.status !== 429 && res.status !== 503) || i >= tries - 1) return res;
    const wait = Number(res.headers.get('retry-after')) || 2 ** i * 2;
    await sleep(Math.min(wait, 30) * 1000);
  }
};

export type Candidate = {
  title: string; // File:...
  page: string; // commons sayfası
  image: string; // indirilen boyut (en fazla 1920 px)
  width: number;
  height: number;
  artist: string;
  license: string;
  licenseUrl?: string;
  attributionRequired: boolean;
  date?: string;
  description?: string;
  local?: string; // build/fotolar/<ad>/aday-N.jpg (video klasörüne göre)
};

export type CandidateSet = {file: string; query: string; line: number; caption?: string; searchedAt: string; candidates: Candidate[]};

/** Şiddet ve kayıp içeren olaylarda kanlı, ceset ya da kalıntı karesi önerilmez. */
const GRAPHIC = /\b(corpses?|bod(y|ies)|dead|skulls?|bones?|remains|massacred?|killed|blood|bloody|execution|executed|mass grave|leiche|tote|toten|cadavres?|ossements|ceset|kafatas|kemik)\b/i;

const stripHtml = (s?: string) =>
  (s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const meta = (m: any, k: string): string | undefined => m?.[k]?.value;

export const searchCommons = async (query: string, limit = 25): Promise<Candidate[]> => {
  const url = new URL(API);
  const q: Record<string, string> = {
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1920',
  };
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Commons araması başarısız (${res.status})`);
  const j: any = await res.json();
  const pages: any[] = Object.values(j.query?.pages ?? {}).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
  const out: Candidate[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime)) continue;
    const m = ii.extmetadata;
    const license = stripHtml(meta(m, 'LicenseShortName'));
    if (!license) continue; // lisansı belirsiz dosya önerilmez
    const description = stripHtml(meta(m, 'ImageDescription')).slice(0, 300);
    if (GRAPHIC.test(`${p.title} ${description}`)) continue;
    if (Math.max(ii.width, ii.height) < 600) continue; // tam ekranda çok bulanık kalır
    out.push({
      title: p.title,
      page: ii.descriptionurl,
      image: ii.thumburl ?? ii.url,
      width: ii.width,
      height: ii.height,
      artist: stripHtml(meta(m, 'Artist')) || 'bilinmiyor',
      license,
      licenseUrl: meta(m, 'LicenseUrl'),
      attributionRequired: meta(m, 'AttributionRequired') !== 'false',
      date: stripHtml(meta(m, 'DateTimeOriginal')).slice(0, 40) || undefined,
      description: description || undefined,
    });
  }
  // Aynı fotoğrafın restore/kırpılmış kopyaları tek aday sayılır.
  const seen = new Set<string>();
  const unique = out.filter((c) => {
    const key = c.title
      .toLowerCase()
      .replace(/^file:/, '')
      .replace(/\.[a-z]+$/, '')
      .replace(/\b(restored|restoration|retouched|cropped|crop|edit|edited|version|v\d)\b|[-_().,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Yatay kareler 16:9 ekranda daha iyi durur: ilk 8 sonuç içinde öne al, alaka sırasını koru.
  const head = unique.slice(0, 8);
  return [...head.filter((c) => c.width >= c.height), ...head.filter((c) => c.width < c.height), ...unique.slice(8)];
};

const stem = (file: string) => file.replace(/\.[^.]+$/, '');
export const candidateDir = (dir: string, file: string) => path.join(paths(dir).build, 'fotolar', stem(file));
const setFile = (dir: string, file: string) => path.join(candidateDir(dir, file), 'adaylar.json');

export const loadCandidateSet = (dir: string, file: string): CandidateSet | null => {
  const f = setFile(dir, file);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};

/** Aynı sorgu için daha önce aday indirildiyse tekrar indirmez (force hariç). */
export const fetchCandidates = async (dir: string, m: Marker, force = false): Promise<CandidateSet> => {
  const p = m.props;
  if (p.type !== 'photo' || !p.search) throw new Error('ara: sorgusu olmayan işaret');
  const existing = loadCandidateSet(dir, p.file);
  if (existing && existing.query === p.search && !force) return existing;
  const found = await searchCommons(p.search);
  const cdir = candidateDir(dir, p.file);
  fs.mkdirSync(cdir, {recursive: true});
  const picked = found.slice(0, CANDIDATES);
  for (const [i, c] of picked.entries()) {
    const ext = path.extname(new URL(c.image).pathname).toLowerCase() || '.jpg';
    const local = path.join(cdir, `aday-${i + 1}${ext}`);
    const res = await politeFetch(c.image);
    if (!res.ok) throw new Error(`İndirilemedi: ${c.title} (${res.status})`);
    fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
    c.local = path.relative(dir, local).split(path.sep).join('/');
  }
  const set: CandidateSet = {file: p.file, query: p.search, line: m.line, caption: p.caption, searchedAt: new Date().toISOString(), candidates: picked};
  fs.writeFileSync(setFile(dir, p.file), JSON.stringify(set, null, 1));
  return set;
};

// ── Seçim ve atıf ────────────────────────────────────────────────────────────

export type Provenance = {file: string; title: string; page: string; artist: string; license: string; licenseUrl?: string; attributionRequired: boolean; date?: string; selectedAt: string; extra?: string[]};

const registryFile = (dir: string) => path.join(paths(dir).assets, 'kaynaklar.json');

export const loadRegistry = (dir: string): Record<string, Provenance> => {
  const f = registryFile(dir);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
};

/** Altyazıya eklenen atıf: "Foto: yazar (lisans)". */
export const creditLine = (c: {artist: string; license: string}) => {
  // Commons'un yazar alanı bazen "Photographer: Ad" ya da "Unknown author" gelir; etiketi biz koyuyoruz.
  let a = c.artist.replace(/^(photographer|photograph|photo|author|fotoğrafçı|foto|artist)\s*:\s*/i, '').trim();
  if (/^unknown author/i.test(a)) a = 'bilinmiyor';
  if (a.length > 60) a = a.slice(0, 57) + '…';
  return `Foto: ${a} (${c.license})`;
};

/** Altyazıda "Foto:" yoksa ya da "Foto: bulunacak" ise atfı ekler. */
export const withCredit = (caption: string | undefined, c: {artist: string; license: string} | undefined) => {
  if (!c) return caption;
  const base = (caption ?? '').replace(/\s*·\s*Foto:\s*bulunacak\s*$/i, '').trim();
  if (/Foto:/i.test(base)) return base;
  return base ? `${base} · ${creditLine(c)}` : creditLine(c);
};

/** Adayı seçer: assets/'e kopyalar, kaynak kaydını ve script'teki Kaynaklar tablosunu günceller. */
export const selectCandidate = (dir: string, file: string, n: number) => selectCandidates(dir, file, [n]);

const toProvenance = (file: string, c: Candidate): Provenance => ({file, title: c.title, page: c.page, artist: c.artist, license: c.license, licenseUrl: c.licenseUrl, attributionRequired: c.attributionRequired, date: c.date, selectedAt: new Date().toISOString()});

/**
 * Birden fazla aday seçilirse ilki işaretteki dosya adını alır, diğerleri "ad-2.jpg", "ad-3.jpg" olur
 * ve aynı cümlenin süresi aralarında bölünür (align bunları ayrı sahnelere açar).
 */
export const selectCandidates = (dir: string, file: string, picks: number[]): {provenance: Provenance; scriptUpdated: boolean} => {
  const set = loadCandidateSet(dir, file);
  if (!set) throw new Error(`${file} için aday yok. Önce: npm run assets`);
  const uniq = [...new Set(picks)].filter((n) => Number.isInteger(n) && n >= 1);
  if (!uniq.length) throw new Error('En az bir aday seç');
  const chosen = uniq.map((n) => {
    const c = set.candidates[n - 1];
    if (!c?.local) throw new Error(`${file} için ${n}. aday yok (${set.candidates.length} aday var)`);
    return c;
  });
  const assets = paths(dir).assets;
  fs.mkdirSync(assets, {recursive: true});
  const reg = loadRegistry(dir);
  // Önceki seçimin ek dosyalarını temizle.
  for (const old of reg[file]?.extra ?? []) {
    const f = path.join(assets, old);
    if (fs.existsSync(f)) fs.unlinkSync(f);
    delete reg[old];
  }
  const ext = path.extname(file);
  const stem = file.slice(0, -ext.length);
  const names = chosen.map((_, i) => (i === 0 ? file : `${stem}-${i + 1}${ext}`));
  let scriptUpdated = false;
  chosen.forEach((c, i) => {
    fs.copyFileSync(path.join(dir, c.local!), path.join(assets, names[i]));
    const prov = toProvenance(names[i], c);
    if (i === 0) prov.extra = names.slice(1);
    reg[names[i]] = prov;
    scriptUpdated = upsertSourceRow(dir, prov) || scriptUpdated;
  });
  fs.writeFileSync(registryFile(dir), JSON.stringify(reg, null, 1));
  return {provenance: reg[file], scriptUpdated};
};

/** Script'in "## Kaynaklar" tablosunda bu dosyanın satırını yazar ya da günceller. */
const upsertSourceRow = (dir: string, p: Provenance): boolean => {
  const scriptFile = pickScript(dir);
  const lines = fs.readFileSync(scriptFile, 'utf8').split('\n');
  const row = `| FOTO | ${p.file} | Wikimedia Commons, ${p.title.replace(/^File:/, '')}, ${p.artist} — ${p.page} | ${p.license}${p.attributionRequired ? '; atıf ekranda' : ''} |`;
  const start = lines.findIndex((l) => /^##\s+Kaynaklar/.test(l.trim()));
  if (start < 0) return false;
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end].trim())) end++;
  const existing = lines.findIndex((l, i) => i > start && i < end && l.startsWith('|') && l.split('|')[2]?.trim() === p.file);
  if (existing >= 0) lines[existing] = row;
  else {
    let last = start;
    for (let i = start + 1; i < end; i++) if (lines[i].startsWith('|')) last = i;
    lines.splice(last + 1, 0, row);
  }
  fs.writeFileSync(scriptFile, lines.join('\n'));
  return true;
};

// ── İnceleme sayfası ─────────────────────────────────────────────────────────

/** Sayfaya gömülen küçük resim (her tarayıcıda, statik önizlemede de görünsün diye). */
const thumbData = (dir: string, local: string): string => {
  const src = path.join(dir, local);
  const thumb = src.replace(/\.[^.]+$/, '.thumb.jpg');
  try {
    if (!fs.existsSync(thumb)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=480:-2', '-q:v', '5', thumb]);
    return `data:image/jpeg;base64,${fs.readFileSync(thumb).toString('base64')}`;
  } catch {
    return `../../${local}`;
  }
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** build/fotolar/index.html: her işaret için adaylar, lisansları ve seçim komutu. */
export const writeReviewPage = (dir: string, folderArg: string): string => {
  const root = path.join(paths(dir).build, 'fotolar');
  if (!fs.existsSync(root)) return '';
  const reg = loadRegistry(dir);
  const sets = fs
    .readdirSync(root)
    .map((d) => path.join(root, d, 'adaylar.json'))
    .filter((f) => fs.existsSync(f))
    .map((f) => JSON.parse(fs.readFileSync(f, 'utf8')) as CandidateSet)
    .sort((a, b) => a.line - b.line);
  const blocks = sets.map((s) => {
    const chosen = reg[s.file];
    const cards = s.candidates.length
      ? s.candidates
          .map((c, i) => {
            const isChosen = chosen?.title === c.title;
            const cmd = `npm run foto -- ${folderArg} ${s.file} ${i + 1}`;
            return `<figure class="${isChosen ? 'chosen' : ''}">
  <div class="n">${i + 1}${isChosen ? ' · SEÇİLDİ' : ''}</div>
  <img src="${c.local ? thumbData(dir, c.local) : ''}" alt="">
  <figcaption>
    <a href="${esc(c.page)}">${esc(c.title.replace(/^File:/, ''))}</a>
    <span>${esc(c.artist)} · <b>${esc(c.license)}</b> · ${c.width}×${c.height}${c.date ? ' · ' + esc(c.date) : ''}</span>
    ${c.description ? `<em>${esc(c.description.slice(0, 160))}</em>` : ''}
    <code onclick="navigator.clipboard.writeText(this.textContent)">${esc(cmd)}</code>
  </figcaption>
</figure>`;
          })
          .join('\n')
      : `<p class="none">Aday bulunamadı. Sorguyu değiştir ya da dosyayı elle <code>assets/${esc(s.file)}</code> olarak koy.</p>`;
    return `<section>
  <h2>${esc(s.file)} <small>satır ${s.line}</small></h2>
  <p class="q">ara: "${esc(s.query)}"${s.caption ? ` — altyazı: ${esc(s.caption)}` : ''}</p>
  <div class="grid">${cards}</div>
</section>`;
  });
  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arşiv fotoğrafı adayları</title>
<style>
:root{--bg:#020805;--fg:#d9ffec;--muted:#5faf86;--accent:#00ff88;--line:rgba(0,255,136,.35)}
body{margin:0;padding:24px 16px 60px;background:var(--bg);color:var(--fg);font:15px/1.45 ui-monospace,Menlo,monospace}
h1{color:var(--accent);font-size:20px;margin:0 0 6px}.lead{color:var(--muted);margin:0 0 28px}
section{border-top:1px solid var(--line);padding:18px 0 8px}h2{font-size:17px;margin:0}h2 small{color:var(--muted);font-weight:400}
.q{color:var(--muted);margin:4px 0 14px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
figure{margin:0;border:1px solid var(--line);background:rgba(0,255,136,.04)}figure.chosen{border:2px solid var(--accent);box-shadow:0 0 18px rgba(0,255,136,.35)}
.n{padding:6px 10px;color:var(--accent)}img{display:block;width:100%;aspect-ratio:16/10;object-fit:contain;background:#000}
figcaption{padding:10px;display:flex;flex-direction:column;gap:6px}a{color:#00e5ff;word-break:break-all}span{color:var(--muted)}b{color:var(--fg)}
em{color:var(--muted);font-size:13px}code{display:block;padding:6px 8px;background:#000;border:1px solid var(--line);cursor:pointer;word-break:break-all}
.none{color:#ff71ce}
</style></head><body>
<h1>Arşiv fotoğrafı adayları</h1>
<p class="lead">Her işaret için bir aday seç: komuta tıklayınca kopyalanır, terminalde çalıştır. Seçilmeyen işaretlerde önizleme geçici olarak 1. adayı kullanır.</p>
${blocks.join('\n')}
</body></html>`;
  const out = path.join(root, 'index.html');
  fs.writeFileSync(out, html);
  return out;
};
