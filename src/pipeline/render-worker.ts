// Render işçisi: Remotion'un Node API'siyle (bundle + renderMedia) tek bir render yapar ve çıkar.
// Ayrı bir süreçte çalışır ki Chrome, kare tamponları ve bellek render bitince sunucudan bağımsız olarak
// tamamen bırakılsın; iptal = süreç grubunu kapatmak (procs.ts → killTree).
//
// Sunucu/CLI ile konuşma: argüman olarak JSON iş tanımı, stdout'a satır satır JSON olaylar.
// Kullanım: node --import tsx src/pipeline/render-worker.ts '<json>'

import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {spawn} from 'node:child_process';
import {makeCancelSignal, openBrowser, renderMedia, selectComposition, type CancelSignal} from '@remotion/renderer';
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
  /** Parça render'ı: yalnızca bu kare aralıkları Remotion'dan geçer, gerisi kurgu kaydından aynen gelir. */
  partial?: {ranges: [number, number][]; baseFile: string; sfx?: {file: string; sec: number; gain: number}[]};
};
export type WorkerEvent =
  | {t: 'bundle'; status: 'önbellekte' | 'paketleniyor' | 'hazır'; ratio?: number}
  | {t: 'progress'; rendered: number; encoded: number; total: number; stage: string}
  | {t: 'compose'; ratio: number}
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
  if (job.partial) {
    await renderPartial(job, {composition, serveUrl, inputProps, cancelSignal, tmp});
    return;
  }
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

type Ctx = {composition: Awaited<ReturnType<typeof selectComposition>>; serveUrl: string; inputProps: MainProps; cancelSignal: CancelSignal; tmp: string};

/**
 * Parça render'ı: konuşan kafa videosunun ~%70'inde görsel yok; o kareleri Chrome'dan geçirmek boşa.
 * 1) Görsel olan aralıklar normal kompozisyonla (kurgu kaydı + sahne) ayrı ayrı, neredeyse kayıpsız (crf 8) render edilir;
 *    tarayıcı bir kez açılır, bütün parçalarda kullanılır.
 * 2) ffmpeg, parçaları kurgu kaydının üstüne kendi zamanlarında bindirir (overlay, eof_action=pass): parça olmayan
 *    yerlerde kurgu kaydı aynen geçer. Ses kurgu kaydından kopyalanır (yeniden kodlanmaz).
 */
const renderPartial = async (job: WorkerJob, ctx: Ctx) => {
  const {ranges, baseFile} = job.partial!;
  const fps = ctx.composition.fps;
  const total = ranges.reduce((a, [x, y]) => a + y - x + 1, 0);
  const browser = await openBrowser('chrome', {logLevel: 'error'});
  const segs: {file: string; start: number}[] = [];
  let done = 0;
  let last = 0;
  try {
    for (const [i, [a, b]] of ranges.entries()) {
      const file = path.join(ctx.tmp, `parca-${String(i).padStart(3, '0')}.mp4`);
      await renderMedia({
        composition: ctx.composition,
        serveUrl: ctx.serveUrl,
        inputProps: ctx.inputProps,
        outputLocation: file,
        codec: 'h264',
        crf: 8,
        x264Preset: 'veryfast',
        muted: true,
        frameRange: [a, b],
        puppeteerInstance: browser,
        concurrency: job.concurrency ?? null,
        cancelSignal: ctx.cancelSignal,
        logLevel: 'error',
        onProgress: ({renderedFrames}) => {
          const now = Date.now();
          if (now - last < 250) return;
          last = now;
          send({t: 'progress', rendered: done + renderedFrames, encoded: 0, total, stage: `parça ${i + 1}/${ranges.length}`});
        },
      });
      done += b - a + 1;
      segs.push({file, start: a / fps});
      send({t: 'progress', rendered: done, encoded: 0, total, stage: `parça ${i + 1}/${ranges.length}`});
    }
  } finally {
    await browser.close({silent: true}).catch(() => {});
  }
  await compose(baseFile, segs, job.out, ctx.composition.durationInFrames / fps, job.partial!.sfx ?? []);
  send({t: 'done', out: job.out, frames: total});
};

/**
 * Ses: efekt yoksa kurgu kaydının sesi kopyalanır (yeniden kodlanmaz). Efekt varsa her biri kendi anına kaydırılıp
 * (adelay) kurgu sesiyle karıştırılır (amix, seviye düşürmeden) ve AAC 192k kodlanır.
 */
const compose = (baseFile: string, segs: {file: string; start: number}[], out: string, durationSec: number, sfx: {file: string; sec: number; gain: number}[]) =>
  new Promise<void>((resolve, reject) => {
    const args = ['-hide_banner', '-v', 'error', '-y', '-i', baseFile];
    for (const s of segs) args.push('-itsoffset', s.start.toFixed(6), '-i', s.file);
    const files = [...new Set(sfx.map((x) => x.file))];
    for (const f of files) args.push('-i', f);
    const chain = segs.map((_, i) => `[v${i}][${i + 1}:v]overlay=eof_action=pass[v${i + 1}]`);
    const graph = ['[0:v]null[v0]', ...chain];
    let audio: string[] = ['-map', '0:a?', '-c:a', 'copy'];
    if (sfx.length) {
      const first = 1 + segs.length;
      // Aynı dosya birden çok kez çalınır: asplit ile çoğaltılır.
      const uses = files.map((f) => sfx.filter((x) => x.file === f));
      uses.forEach((list, k) => graph.push(`[${first + k}:a]asplit=${list.length}${list.map((_, j) => `[s${k}_${j}]`).join('')}`));
      const parts: string[] = [];
      uses.forEach((list, k) =>
        list.forEach((e, j) => {
          const ms = Math.max(0, Math.round(e.sec * 1000));
          graph.push(`[s${k}_${j}]adelay=${ms}|${ms},volume=${e.gain.toFixed(3)}[e${k}_${j}]`);
          parts.push(`[e${k}_${j}]`);
        }),
      );
      graph.push(`[0:a]${parts.join('')}amix=inputs=${parts.length + 1}:duration=first:normalize=0[aout]`);
      audio = ['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'];
    }
    args.push(
      '-filter_complex', graph.join(';'),
      '-map', `[v${segs.length}]`, ...audio,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-progress', 'pipe:1', '-nostats',
      out,
    );
    const ff = spawn('ffmpeg', args, {stdio: ['ignore', 'pipe', 'pipe']});
    let err = '';
    ff.stderr.on('data', (d) => (err = (err + d).slice(-3000)));
    let buf = '';
    ff.stdout.on('data', (d) => {
      buf += d;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const l of lines) {
        const m = l.match(/^out_time_us=(\d+)/);
        if (m) send({t: 'compose', ratio: Math.min(1, Number(m[1]) / 1e6 / durationSec)});
      }
    });
    process.once('SIGTERM', () => ff.kill('SIGTERM'));
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg birleştirme başarısız (${code}): ${err.trim().split('\n').slice(-3).join(' | ')}`))));
  });

main().then(
  () => process.exit(0),
  (e) => {
    process.stderr.write(String(e?.stack ?? e) + '\n');
    process.exit(1);
  },
);
