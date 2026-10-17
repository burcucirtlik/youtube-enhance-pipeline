// Ortak medya deposu: kurgu kayıtları içerik özetiyle (sha256) .media/ altında bir kez tutulur, projelerdeki
// footage/ dosyaları ona **sabit bağlantıdır** (hardlink). Aynı video iki projeye yüklenirse diskte bir kez yer kaplar.
//
// Neden sembolik bağlantı değil: Remotion'un dosya sunucusu sembolik bağlantı olan dosyayı 404'lüyor (bkz. render-worker.ts);
// sabit bağlantı her araç için sıradan bir dosyadır. Bedeli: depo ve projeler aynı diskte olmalı (değilse bağlanmaz, kopya kalır).
//
// Depodaki bir dosyaya başka bağlantı kalmadıysa (bağlantı sayısı 1) hiçbir proje kullanmıyordur: `gcMedia` siler.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {paths, ROOT, VIDEOS} from './util';

export const MEDIA = process.env.YTE_MEDIA ? path.resolve(process.env.YTE_MEDIA) : path.join(ROOT, '.media');
const MEDIA_EXT = /\.(mp4|mov|m4v|mkv|webm|wav|mp3|m4a|aac|flac)$/i;
/** Küçük dosyalar (altyazı vb.) depoya alınmaz. */
const MIN_BYTES = 5 * 1024 * 1024;

export const sha256File = (file: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file, {highWaterMark: 4 * 1024 * 1024})
      .on('data', (d) => h.update(d))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });

export type IngestResult = {file: string; hash: string; state: 'yeni' | 'ortak' | 'zaten' | 'bağlanamadı'; bytes: number};

/**
 * Bir medya dosyasını depoya alır. Depoda aynısı varsa proje dosyası depodakine bağlanır (kopya diskten kalkar);
 * yoksa depoya bu dosyanın bağlantısı eklenir.
 */
export const ingestFile = async (file: string): Promise<IngestResult> => {
  const st = fs.statSync(file);
  // Zaten depodaysa yeniden özet alma (her açılışta GB'larca okumamak için).
  if (st.nlink > 1 && inStore(st)) return {file, hash: '', state: 'zaten', bytes: st.size};
  const hash = await sha256File(file);
  const stored = path.join(MEDIA, `${hash}${path.extname(file).toLowerCase()}`);
  fs.mkdirSync(MEDIA, {recursive: true});
  if (fs.existsSync(stored)) {
    const s2 = fs.statSync(stored);
    if (s2.ino === st.ino && s2.dev === st.dev) return {file, hash, state: 'zaten', bytes: st.size};
    // Aynı içerik: proje dosyasını depodakine bağla. Önce yanına bağlantı, sonra atomik yer değiştirme;
    // açık tutan bir süreç (oynatıcı, render) varsa eski içeriği okumaya devam eder.
    const tmp = `${file}.bag-${process.pid}`;
    try {
      fs.linkSync(stored, tmp);
    } catch {
      return {file, hash, state: 'bağlanamadı', bytes: st.size};
    }
    fs.renameSync(tmp, file);
    return {file, hash, state: 'ortak', bytes: st.size};
  }
  try {
    fs.linkSync(file, stored);
  } catch {
    return {file, hash, state: 'bağlanamadı', bytes: st.size};
  }
  return {file, hash, state: 'yeni', bytes: st.size};
};

/** Projenin footage/ klasöründeki büyük medya dosyalarını depoya alır. */
export const ingestProject = async (dir: string): Promise<IngestResult[]> => {
  const f = paths(dir).footage;
  if (!fs.existsSync(f)) return [];
  const out: IngestResult[] = [];
  for (const n of fs.readdirSync(f)) {
    const file = path.join(f, n);
    if (n.startsWith('.') || !MEDIA_EXT.test(n)) continue;
    const st = fs.statSync(file);
    if (!st.isFile() || st.size < MIN_BYTES) continue;
    out.push(await ingestFile(file));
  }
  return out;
};

/** Hiçbir projenin kullanmadığı depo dosyalarını siler; boşalan baytları döndürür. */
export const gcMedia = (): {removed: string[]; bytes: number} => {
  const removed: string[] = [];
  let bytes = 0;
  if (!fs.existsSync(MEDIA)) return {removed, bytes};
  for (const n of fs.readdirSync(MEDIA)) {
    const f = path.join(MEDIA, n);
    const st = fs.statSync(f);
    if (st.isFile() && st.nlink <= 1) {
      fs.rmSync(f);
      removed.push(n);
      bytes += st.size;
    }
  }
  return {removed, bytes};
};

// ── Disk kullanımı ─────────────────────────────────────────────────────────

export type DiskUsage = {
  /** Projenin klasöründeki dosyaların toplamı (ortaklar dahil). */
  total: number;
  /** Başka bir projeyle paylaşılan (depoda bir kez duran) kısım. */
  shared: number;
  /** Silinince/temizlenince geri gelebilecek, yeniden üretilebilir kısım (bkz. cleanupPlan). */
  reclaimable: number;
  byFolder: Record<string, number>;
};

const walk = (dir: string, fn: (file: string, st: fs.Stats) => void) => {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const n of names) {
    const f = path.join(dir, n);
    const st = fs.lstatSync(f);
    if (st.isDirectory()) walk(f, fn);
    else if (st.isFile()) fn(f, st);
  }
};

/** Bir dosya ortak mı: depo dışında da başka bağlantısı var (bağlantı sayısı depo hariç > 1). */
const isShared = (st: fs.Stats) => st.nlink > 2 || (st.nlink === 2 && !inStore(st));
const storeInodes = new Map<string, number>();
const inStore = (st: fs.Stats) => {
  // Depodaki dosyaların inode'larını bir kez topla (her çağrıda yeniden okumamak için kısa ömürlü önbellek).
  if (!storeInodes.size || Date.now() - (storeInodes.get('@at') ?? 0) > 5000) {
    storeInodes.clear();
    storeInodes.set('@at', Date.now());
    if (fs.existsSync(MEDIA)) for (const n of fs.readdirSync(MEDIA)) storeInodes.set(`${fs.statSync(path.join(MEDIA, n)).ino}`, 1);
  }
  return storeInodes.has(`${st.ino}`);
};

export const diskUsage = (dir: string): DiskUsage => {
  const u: DiskUsage = {total: 0, shared: 0, reclaimable: 0, byFolder: {}};
  walk(dir, (f, st) => {
    u.total += st.size;
    if (isShared(st)) u.shared += st.size;
    const top = path.relative(dir, f).split(path.sep)[0];
    const key = top.includes('.') && !top.startsWith('.') ? '.' : top;
    u.byFolder[key] = (u.byFolder[key] ?? 0) + st.size;
  });
  u.reclaimable = cleanupPlan(dir).reduce((a, x) => a + x.bytes, 0);
  return u;
};

// ── Temizlik ───────────────────────────────────────────────────────────────

export type CleanupItem = {path: string; bytes: number; why: string};

/**
 * Yeniden üretilebilir ya da artık gereksiz dosyalar. Dokunulmayanlar: script, footage (kurgu kaydı + altyazı),
 * assets/ (elle konan ve seçilen fotoğraflar), build/edits.json, scenes.json, transcript.json, state.json,
 * haber/belge ekran görüntüleri (build/assets: kaynak sayfa değişebilir), out/video.mp4 (son video).
 */
export const cleanupPlan = (dir: string): CleanupItem[] => {
  const p = paths(dir);
  const items: CleanupItem[] = [];
  const size = (f: string) => {
    let n = 0;
    walk(f, (_x, st) => (n += st.size));
    try {
      const st = fs.lstatSync(f);
      if (st.isFile()) n = st.size;
    } catch {
      /* yok */
    }
    return n;
  };
  const add = (f: string, why: string) => {
    if (!fs.existsSync(f)) return;
    const bytes = size(f);
    if (bytes > 0 || fs.statSync(f).isDirectory()) items.push({path: path.relative(dir, f), bytes, why});
  };
  add(path.join(p.build, 'fotolar'), 'Commons aday fotoğrafları (seçilenler assets/ içinde; adaylar yeniden indirilebilir)');
  for (const n of fs.existsSync(p.build) ? fs.readdirSync(p.build) : []) if (n.startsWith('.render-tmp-')) add(path.join(p.build, n), 'yarım kalmış render geçici klasörü');
  add(path.join(p.out, 'gorsel-katmani.mov'), 'görsel katmanı (ProRes; yeniden render edilebilir)');
  return items;
};

/** Planı uygular, depoda sahipsiz kalanları siler. */
export const runCleanup = (dir: string): {items: CleanupItem[]; bytes: number} => {
  const items = cleanupPlan(dir);
  for (const it of items) fs.rmSync(path.join(dir, it.path), {recursive: true, force: true});
  return {items, bytes: items.reduce((a, x) => a + x.bytes, 0) + gcMedia().bytes};
};

/** Bütün projeleri depoya alır (açılışta arka planda). */
export const ingestAll = async (log: (s: string) => void = () => {}) => {
  if (!fs.existsSync(VIDEOS)) return;
  let saved = 0;
  for (const id of fs.readdirSync(VIDEOS)) {
    const dir = path.join(VIDEOS, id);
    if (id.startsWith('.') || !fs.statSync(dir).isDirectory()) continue;
    try {
      for (const r of await ingestProject(dir)) {
        if (r.state === 'ortak') saved += r.bytes;
        if (r.state === 'ortak' || r.state === 'bağlanamadı') log(`medya deposu: ${id}/${path.basename(r.file)} ${r.state}`);
      }
    } catch (e: any) {
      log(`medya deposu: ${id} atlandı (${e.message})`);
    }
  }
  if (saved) log(`medya deposu: aynı kayıtlar birleştirildi, ${(saved / 1e6).toFixed(0)} MB yer açıldı`);
};
