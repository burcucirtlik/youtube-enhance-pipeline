// Varlık toplama: HABER ekran görüntüsü + vurgu kutuları, BELGE sayfası + vurgu, arşiv fotoğrafı adayları,
// ve elle konması gereken dosyaların (ekran kaydı, fotoğraf, kod) kontrol listesi.

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {Marker} from '../shared/types';
import type {ParsedScript} from './parse-script';
import {fetchCandidates, geocodePlaces, loadPlaces} from './commons';
import {assetKey, paths, python, ROOT} from './util';

type Result = {line: number; what: string; status: 'hazır' | 'üretildi' | 'eksik' | 'uyarı'; note?: string};

export const collectAssets = async (dir: string, s: ParsedScript, opts: {force?: boolean} = {}): Promise<Result[]> => {
  const p = paths(dir);
  fs.mkdirSync(p.buildAssets, {recursive: true});
  fs.mkdirSync(p.assets, {recursive: true});
  const results: Result[] = [];
  const done = new Set<string>();

  const existing = (key: string) =>
    [p.assets, p.buildAssets].flatMap((b) => ['.png', '.jpg', '.jpeg', '.webp'].map((e) => path.join(b, key + e))).find((f) => fs.existsSync(f));

  const news = s.markers.filter((m) => m.props.type === 'news');
  if (news.length) await captureNews(dir, news, results, done, opts.force ?? false, existing);

  for (const m of s.markers) {
    const pr = m.props;
    if (pr.type === 'document') {
      const key = assetKey(pr)!;
      if (done.has(key)) continue;
      done.add(key);
      const pdf = path.join(p.assets, pr.file);
      if (!fs.existsSync(pdf)) {
        results.push({line: m.line, what: `BELGE assets/${pr.file}`, status: 'eksik', note: 'PDF dosyasını assets/ içine koy'});
        continue;
      }
      if (!opts.force && existing(key)) {
        results.push({line: m.line, what: `BELGE ${pr.file} s.${pr.page}`, status: 'hazır'});
        continue;
      }
      const out = path.join(p.buildAssets, key + '.png');
      const args = [path.join(ROOT, 'scripts/pdf_highlight.py'), pdf, String(pr.page), out];
      if (pr.highlight) args.push('--text', pr.highlight);
      try {
        const meta = JSON.parse(execFileSync(...python(args), {encoding: 'utf8'}));
        fs.writeFileSync(path.join(p.buildAssets, key + '.json'), JSON.stringify({...meta, file: pr.file, page: pr.page, highlight: pr.highlight}, null, 1));
        results.push({
          line: m.line,
          what: `BELGE ${pr.file} s.${pr.page}`,
          status: pr.highlight && !meta.found ? 'uyarı' : 'üretildi',
          note: pr.highlight && !meta.found ? `"${pr.highlight}" sayfada bulunamadı — vurgula metni kaynakla birebir mi?` : undefined,
        });
      } catch (e: any) {
        results.push({line: m.line, what: `BELGE ${pr.file}`, status: 'eksik', note: String(e.stderr ?? e.message).trim()});
      }
    }

    if ((pr.type === 'photo' || pr.type === 'clip') && pr.search && !fs.existsSync(path.join(p.assets, pr.file)) && !done.has(pr.file)) {
      done.add(pr.file);
      const label = pr.type === 'clip' ? 'KLİP' : 'FOTO';
      try {
        const set = await fetchCandidates(dir, m, opts.force ?? false);
        results.push({
          line: m.line,
          what: `${label} ${pr.file}`,
          status: set.candidates.length ? 'uyarı' : 'eksik',
          note: set.candidates.length
            ? `${set.candidates.length} aday Commons'tan indirildi → seç: build/fotolar/index.html (seçilene kadar 1. aday geçici kullanılır)`
            : `"${pr.search}" için Commons'ta uygun aday yok; sorguyu değiştir ya da dosyayı elle koy`,
        });
      } catch (e: any) {
        results.push({line: m.line, what: `${label} ${pr.file}`, status: 'eksik', note: e.message});
      }
      continue;
    }

    if (pr.type === 'screen' || pr.type === 'photo' || pr.type === 'clip' || pr.type === 'code') {
      if (done.has(pr.file)) continue;
      done.add(pr.file);
      const ok = fs.existsSync(path.join(p.assets, pr.file));
      const label = pr.type === 'screen' ? 'EKRAN' : pr.type === 'photo' ? 'FOTO' : pr.type === 'clip' ? 'KLİP' : 'KOD';
      const note = pr.type === 'screen' ? `çekilecek: ${pr.note ?? ''}` : pr.type === 'photo' || pr.type === 'clip' ? `bulunacak: ${pr.caption ?? ''}` : 'kod dosyasını assets/ içine koy';
      results.push({line: m.line, what: `${label} assets/${pr.file}`, status: ok ? 'hazır' : 'eksik', note: ok ? undefined : note});
    }
  }

  // Harita: yer adları koordinata (konum: verilmemişse).
  const maps = s.markers.filter((m) => m.props.type === 'map' && m.props.lat === undefined);
  if (maps.length) {
    const places = maps.map((m) => (m.props as {place: string}).place);
    const known = loadPlaces(dir);
    try {
      const {missing} = await geocodePlaces(dir, places.filter((x) => !known[x] || opts.force));
      for (const m of maps) {
        const place = (m.props as {place: string}).place;
        const miss = missing.includes(place);
        results.push({line: m.line, what: `HARİTA ${place}`, status: miss ? 'eksik' : 'hazır', note: miss ? 'yer bulunamadı; adı değiştir ya da konum: enlem, boylam yaz' : undefined});
      }
    } catch (e: any) {
      for (const m of maps) results.push({line: m.line, what: `HARİTA ${(m.props as {place: string}).place}`, status: 'eksik', note: e.message});
    }
  }

  return results.sort((a, b) => a.line - b.line);
};

// ── HABER: Playwright ile ekran görüntüsü + vurgu kutuları ─────────────────

const captureNews = async (
  dir: string,
  markers: Marker[],
  results: Result[],
  done: Set<string>,
  force: boolean,
  existing: (key: string) => string | undefined,
) => {
  const p = paths(dir);
  const todo = markers.filter((m) => {
    const key = assetKey(m.props)!;
    if (done.has(key)) return false;
    done.add(key);
    if (!force && existing(key)) {
      results.push({line: m.line, what: `HABER ${(m.props as any).url}`, status: 'hazır'});
      return false;
    }
    return true;
  });
  if (!todo.length) return;

  const {chromium} = await import('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1600, height: 1000}, deviceScaleFactor: 2, locale: 'tr-TR'});
  try {
    for (const m of todo) {
      const pr = m.props;
      if (pr.type !== 'news') continue;
      const key = assetKey(pr)!;
      const page = await ctx.newPage();
      try {
        await page.goto(pr.url, {waitUntil: 'domcontentloaded', timeout: 45000});
        await page.waitForTimeout(2500);
        await dismissOverlays(page);
        const found = pr.highlight ? await page.evaluate<boolean>(FIND_TEXT(pr.highlight)) : false;
        await page.waitForTimeout(600);
        const rects = found ? await page.evaluate<{x: number; y: number; width: number; height: number}[]>(RECTS) : [];
        const out = path.join(p.buildAssets, key + '.png');
        await page.screenshot({path: out});
        const title = await page.title();
        fs.writeFileSync(
          path.join(p.buildAssets, key + '.json'),
          JSON.stringify({url: pr.url, title, highlight: pr.highlight, found: rects.length > 0, width: 3200, height: 2000, rects: rects.map((r) => ({x: r.x * 2, y: r.y * 2, width: r.width * 2, height: r.height * 2}))}, null, 1),
        );
        const warn = pr.highlight && !rects.length;
        results.push({line: m.line, what: `HABER ${pr.url}`, status: warn ? 'uyarı' : 'üretildi', note: warn ? `"${pr.highlight}" sayfada bulunamadı (paywall/çerez ekranı ya da metin birebir değil). Elle ekran görüntüsü: assets/${key}.png` : undefined});
      } catch (e: any) {
        results.push({line: m.line, what: `HABER ${pr.url}`, status: 'eksik', note: `${e.message.split('\n')[0]} → elle ekran görüntüsü al: assets/${key}.png`});
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
};

/** Çerez/abonelik katmanlarını kabul etmeden gizler (önce "reddet" düğmesi denenir). */
const dismissOverlays = async (page: import('playwright').Page) => {
  const reject = page.getByRole('button', {name: /reddet|tümünü reddet|reject all|reject|decline|only necessary|yalnızca gerekli|sadece gerekli/i});
  if (await reject.count().catch(() => 0)) await reject.first().click({timeout: 2000}).catch(() => {});
  await page.evaluate(HIDE_OVERLAYS);
};

// Tarayıcıda çalışan kod düz metin olarak gönderilir: tsx'in eklediği yardımcılar sayfada tanımsız olur.
const HIDE_OVERLAYS = `(() => {
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const cs = getComputedStyle(el);
    if ((cs.position === 'fixed' || cs.position === 'sticky') && el.offsetHeight > 40) el.style.setProperty('display', 'none', 'important');
  }
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';
})()`;

/** Metni sayfada bulur (boşluk ve tırnak farklarını yok sayar), ortaya kaydırır. */
const FIND_TEXT = (needle: string) => `((needle) => {
  const norm = (s) => s.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'");
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let text = '';
  const map = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
    const v = n.data;
    for (let k = 0; k < v.length; k++) {
      const ch = /\s/.test(v[k]) ? ' ' : v[k];
      if (ch === ' ' && text.endsWith(' ')) continue;
      text += ch;
      map.push([n, k]);
    }
  }
  const target = norm(needle).replace(/\s+/g, ' ').trim();
  const hay = norm(text);
  let idx = hay.indexOf(target);
  if (idx < 0) idx = hay.toLocaleLowerCase('tr-TR').indexOf(target.toLocaleLowerCase('tr-TR'));
  if (idx < 0) return false;
  const a = map[idx];
  const b = map[idx + target.length - 1];
  const range = document.createRange();
  range.setStart(a[0], a[1]);
  range.setEnd(b[0], b[1] + 1);
  window.__ytRange = range;
  const r = range.getBoundingClientRect();
  window.scrollBy(0, r.top - window.innerHeight * 0.45);
  return true;
})(${JSON.stringify(needle)})`;

const RECTS = `(() => {
  const range = window.__ytRange;
  if (!range) return [];
  return Array.from(range.getClientRects())
    .filter((r) => r.width > 2 && r.height > 2)
    .map((r) => ({x: r.left, y: r.top, width: r.width, height: r.height}));
})()`;
