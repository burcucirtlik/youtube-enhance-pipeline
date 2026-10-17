// Render işçisi: Remotion'un Node API'siyle (bundle + renderMedia) tek bir render yapar ve çıkar.
// Ayrı bir süreçte çalışır ki Chrome, kare tamponları ve bellek render bitince sunucudan bağımsız olarak
// tamamen bırakılsın; iptal = süreç grubunu kapatmak (procs.ts → killTree).
//
// Sunucu/CLI ile konuşma: argüman olarak JSON iş tanımı, stdout'a satır satır JSON olaylar.
// Kullanım: node --import tsx src/pipeline/render-worker.ts '<json>'

import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {makeCancelSignal, renderMedia, selectComposition} from '@remotion/renderer';
import type {MainProps} from '../remotion/Main';
import {codeHash} from './state';
import {ROOT} from './util';

export type WorkerJob = {
  projectDir: string;
  out: string;
  overlay: boolean;
  includeSuggested: boolean;
  frames?: [number, number];
  concurrency?: number | null;
};
export type WorkerEvent =
  | {t: 'bundle'; status: 'önbellekte' | 'paketleniyor' | 'hazır'; ratio?: number}
  | {t: 'progress'; rendered: number; encoded: number; total: number; stage: string}
  | {t: 'log'; text: string}
  | {t: 'done'; out: string; frames: number};

const send = (e: WorkerEvent) => process.stdout.write(JSON.stringify(e) + '\n');

export const CACHE = path.join(ROOT, '.cache/remotion');
const REMOTION_VERSION: string = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/remotion/package.json'), 'utf8')).version;
export const bundleKey = () => `${REMOTION_VERSION}-${codeHash('src/remotion', 'brand', 'src/shared')}`;

/**
 * Remotion paketi (webpack) kod değişmedikçe bir kez üretilir ve .cache/remotion/bundle-<sürüm>-<kod özeti>/ altında kalır.
 * Paket public klasörü içermez; her render'da projeye bağlanır (kopyalanmaz).
 */
const getBundle = async (): Promise<string> => {
  const dir = path.join(CACHE, `bundle-${bundleKey()}`);
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    send({t: 'bundle', status: 'önbellekte'});
    return dir;
  }
  send({t: 'bundle', status: 'paketleniyor', ratio: 0});
  fs.mkdirSync(CACHE, {recursive: true});
  // Yarıda kalmış (çökmüş) paketlemelerin artıkları.
  for (const n of fs.readdirSync(CACHE))
    if (/^(empty-public|bundling)-/.test(n) && Date.now() - fs.statSync(path.join(CACHE, n)).mtimeMs > 3600_000) fs.rmSync(path.join(CACHE, n), {recursive: true, force: true});
  const empty = fs.mkdtempSync(path.join(CACHE, 'empty-public-'));
  const tmpOut = fs.mkdtempSync(path.join(CACHE, 'bundling-'));
  try {
    await bundle({
      entryPoint: path.join(ROOT, 'src/remotion/index.ts'),
      outDir: tmpOut,
      publicDir: empty,
      enableCaching: true,
      onProgress: (p) => send({t: 'bundle', status: 'paketleniyor', ratio: p / 100}),
    });
    fs.rmSync(path.join(tmpOut, 'public'), {recursive: true, force: true});
    // Atomik: yarım paket önbellekte görünmesin. Aynı anda başka biri üretmişse onunki kalır.
    try {
      fs.renameSync(tmpOut, dir);
    } catch {
      fs.rmSync(tmpOut, {recursive: true, force: true});
    }
  } finally {
    fs.rmSync(empty, {recursive: true, force: true});
  }
  // Eski paketler: en yeni 3 kalır.
  const old = fs
    .readdirSync(CACHE)
    .filter((n) => n.startsWith('bundle-'))
    .map((n) => ({n, t: fs.statSync(path.join(CACHE, n)).mtimeMs}))
    .sort((a, b) => b.t - a.t)
    .slice(3);
  for (const o of old) fs.rmSync(path.join(CACHE, o.n), {recursive: true, force: true});
  send({t: 'bundle', status: 'hazır'});
  return dir;
};

/**
 * Render'ın sunduğu klasör: paket dosyalarının sabit bağlantıları (hardlink; ayrı diskteyse kopya) + public → proje
 * klasörüne sembolik bağlantı. Remotion'un dosya sunucusu sembolik bağlantı olan *dosyayı* reddeder (404) ama
 * yoldaki sembolik *klasörü* izler; bu yüzden paket dosyaları bağlanamaz, public klasörü bağlanabilir.
 * Render bitince geçici klasörle birlikte silinir.
 */
const serveDir = (bundleDir: string, projectDir: string, tmp: string): string => {
  const dir = path.join(tmp, 'serve');
  const link = (from: string, to: string) => {
    if (fs.statSync(from).isDirectory()) {
      fs.mkdirSync(to, {recursive: true});
      for (const n of fs.readdirSync(from)) link(path.join(from, n), path.join(to, n));
      return;
    }
    try {
      fs.linkSync(from, to);
    } catch {
      fs.copyFileSync(from, to);
    }
  };
  fs.mkdirSync(dir, {recursive: true});
  for (const n of fs.readdirSync(bundleDir)) if (n !== 'public') link(path.join(bundleDir, n), path.join(dir, n));
  fs.symlinkSync(projectDir, path.join(dir, 'public'));
  return dir;
};

const main = async () => {
  const job: WorkerJob = JSON.parse(process.argv[2]);
  const tmp = process.env.TMPDIR ?? fs.mkdtempSync(path.join(CACHE, 'tmp-'));
  const bundleDir = await getBundle();
  const serveUrl = serveDir(bundleDir, job.projectDir, tmp);
  const inputProps: MainProps = {scenesFile: 'build/scenes.json', includeSuggested: job.includeSuggested, overlayOnly: job.overlay};
  const composition = await selectComposition({serveUrl, id: 'Video', inputProps, logLevel: 'error'});
  const {cancelSignal, cancel} = makeCancelSignal();
  // SIGTERM: Remotion'a iptal de; Chrome'u ve ffmpeg'i kendisi kapatsın. Kapatmazsa üst süreç grubu öldürür.
  process.once('SIGTERM', () => cancel());
  const total = job.frames ? job.frames[1] - job.frames[0] + 1 : composition.durationInFrames;
  let last = 0;
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    outputLocation: job.out,
    codec: job.overlay ? 'prores' : 'h264',
    ...(job.overlay ? {proResProfile: '4444' as const, pixelFormat: 'yuva444p10le' as const, imageFormat: 'png' as const} : {}),
    frameRange: job.frames ?? null,
    concurrency: job.concurrency ?? null,
    cancelSignal,
    logLevel: 'error',
    onProgress: ({renderedFrames, encodedFrames, stitchStage}) => {
      const now = Date.now();
      if (now - last < 250 && renderedFrames < total) return; // olay seli olmasın
      last = now;
      send({t: 'progress', rendered: renderedFrames, encoded: encodedFrames, total, stage: stitchStage});
    },
  });
  send({t: 'done', out: job.out, frames: total});
};

main().then(
  () => process.exit(0),
  (e) => {
    process.stderr.write(String(e?.stack ?? e) + '\n');
    process.exit(1);
  },
);
