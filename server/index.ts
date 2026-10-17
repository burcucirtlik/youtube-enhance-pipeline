// Masaüstü uygulamasının yerel sunucusu. Projeler videos/ altındaki klasörlerdir; pipeline aşamaları
// src/pipeline/run.ts üzerinden çalışır, ilerleme SSE ile arayüze akar.

import express, {type Request, type Response} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import {selectCandidates} from '../src/pipeline/commons';
import {killAll, liveProcesses} from '../src/pipeline/procs';
import {findSubtitleFile} from '../src/pipeline/subtitles';
import {editsFromScenes, loadEdits, saveEdits} from '../src/pipeline/edits';
import {parseScript} from '../src/pipeline/parse-script';
import {loadScript, photoStatus, stageAlign, stagePrepare, stageRender, STAGES, type RunEvent, type StageName} from '../src/pipeline/run';
import {ffprobe, findBaseMedia, paths, ROOT, VIDEOS} from '../src/pipeline/util';
import type {Scene, ScenesFile} from '../src/shared/types';

const PORT = Number(process.env.PORT ?? 3030);
const app = express();
app.use(express.json({limit: '20mb'}));

// ── Proje modeli ───────────────────────────────────────────────────────────

type ProjectMeta = {id: string; title: string; createdAt: string; updatedAt?: string};
type Job = {kind: 'prepare' | 'render'; startedAt: string; events: RunEvent[]; done: boolean; error?: string; clients: Set<Response>; abort: AbortController};
const MAX_LOG_EVENTS = 400;
const jobs = new Map<string, Job>();

const metaFile = (dir: string) => path.join(dir, 'project.json');
const readMeta = (id: string): ProjectMeta => {
  const dir = path.join(VIDEOS, id);
  const f = metaFile(dir);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  let title = id;
  try {
    title = loadScript(dir).parsed.header.title || id;
  } catch {
    /* script yok */
  }
  return {id, title, createdAt: fs.statSync(dir).birthtime.toISOString()};
};
const writeMeta = (dir: string, m: ProjectMeta) => fs.writeFileSync(metaFile(dir), JSON.stringify({...m, updatedAt: new Date().toISOString()}, null, 1));

const projectDir = (id: string): string => {
  if (!/^[a-z0-9-]+$/.test(id)) throw httpError(400, 'Geçersiz proje adı');
  const dir = path.join(VIDEOS, id);
  if (!fs.existsSync(dir)) throw httpError(404, 'Proje yok');
  return dir;
};

const httpError = (status: number, message: string) => Object.assign(new Error(message), {status});

const readJson = <T,>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);

type Status = 'yeni' | 'işleniyor' | 'foto-seçimi' | 'hazır' | 'render' | 'bitti' | 'hata';

const summarize = (id: string) => {
  const dir = path.join(VIDEOS, id);
  const p = paths(dir);
  const meta = readMeta(id);
  const job = jobs.get(id);
  const scenes = readJson<ScenesFile>(p.scenes);
  const outFile = path.join(p.out, 'video.mp4');
  const hasOut = fs.existsSync(outFile);
  let photos: ReturnType<typeof photoStatus> = [];
  let hasScript = false;
  try {
    const {parsed} = loadScript(dir);
    hasScript = true;
    photos = photoStatus(dir, parsed);
  } catch {
    /* script yok */
  }
  const pendingPhotos = photos.filter((x) => x.state === 'bekliyor').length;
  let status: Status = 'yeni';
  let stage: StageName | null = null;
  if (job && !job.done) {
    status = job.kind === 'render' ? 'render' : 'işleniyor';
    stage = [...job.events].reverse().find((e): e is Extract<RunEvent, {type: 'stage'}> => e.type === 'stage')?.stage ?? null;
  } else if (job?.error) status = 'hata';
  else if (hasOut && scenes && fs.statSync(outFile).mtimeMs >= fs.statSync(p.scenes).mtimeMs) status = 'bitti';
  else if (scenes && pendingPhotos) status = 'foto-seçimi';
  else if (scenes) status = 'hazır';
  let hasVideo = false;
  try {
    findBaseMedia(dir);
    hasVideo = true;
  } catch {
    /* kayıt yok */
  }
  return {
    ...meta,
    status,
    stage,
    error: job?.error,
    hasScript,
    hasVideo,
    hasSubtitles: Boolean(findSubtitleFile(dir)),
    hasOut,
    outUpdatedAt: hasOut ? fs.statSync(outFile).mtime.toISOString() : null,
    durationSec: scenes?.base.durationSec ?? null,
    sceneCount: scenes ? scenes.scenes.filter((s) => !s.disabled).length : 0,
    pendingPhotos,
  };
};

const detail = (id: string) => {
  const dir = path.join(VIDEOS, id);
  const p = paths(dir);
  const summary = summarize(id);
  let photos: ReturnType<typeof photoStatus> = [];
  let script: {file: string; title: string; format: string} | null = null;
  try {
    const {file, parsed} = loadScript(dir);
    photos = photoStatus(dir, parsed);
    script = {file: path.basename(file), title: parsed.header.title, format: parsed.header.format};
  } catch {
    /* script yok */
  }
  return {
    ...summary,
    script,
    lint: readJson(path.join(p.build, 'lint.json')),
    scenes: readJson<ScenesFile>(p.scenes),
    photos,
    report: fs.existsSync(p.report) ? fs.readFileSync(p.report, 'utf8') : null,
    stages: STAGES,
    files: {video: summary.hasOut ? `/files/${id}/out/video.mp4` : null, base: baseUrl(id)},
  };
};

const baseUrl = (id: string): string | null => {
  try {
    const dir = path.join(VIDEOS, id);
    const b = findBaseMedia(dir);
    return `/files/${id}/${path.relative(dir, b.file).split(path.sep).join('/')}`;
  } catch {
    return null;
  }
};

// ── İşler ve SSE ───────────────────────────────────────────────────────────

const startJob = (id: string, kind: Job['kind'], work: (emit: (e: RunEvent) => void, signal: AbortSignal) => Promise<unknown>) => {
  const existing = jobs.get(id);
  if (existing && !existing.done) throw httpError(409, 'Bu projede bir iş zaten çalışıyor');
  const job: Job = {kind, startedAt: new Date().toISOString(), events: [], done: false, clients: new Set(), abort: new AbortController()};
  jobs.set(id, job);
  const emit = (e: RunEvent) => {
    // Bellek sınırlı kalsın: aynı aşamanın ilerleme olayı öncekinin yerine geçer, günlük satırları son 400 ile sınırlı.
    // (Tam video render'ı aksi halde on binlerce ilerleme olayı biriktiriyordu.)
    if (e.type === 'progress') {
      const i = job.events.findIndex((x) => x.type === 'progress' && x.stage === e.stage);
      if (i >= 0) job.events.splice(i, 1);
    }
    job.events.push(e);
    if (e.type === 'log' && job.events.length > MAX_LOG_EVENTS) {
      const i = job.events.findIndex((x) => x.type === 'log');
      if (i >= 0) job.events.splice(i, 1);
    }
    const data = `data: ${JSON.stringify(e)}\n\n`;
    for (const c of job.clients) c.write(data);
  };
  work(emit, job.abort.signal)
    .catch((err: Error) => {
      job.error = err.message;
      emit({type: 'log', text: `✗ ${err.message}`});
    })
    .finally(() => {
      job.done = true;
      const end = `event: end\ndata: ${JSON.stringify({error: job.error ?? null})}\n\n`;
      for (const c of job.clients) {
        c.write(end);
        c.end();
      }
      job.clients.clear();
    });
  return job;
};

app.get('/api/projects/:id/events', (req, res) => {
  const id = req.params.id;
  const job = jobs.get(id);
  res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive'});
  if (!job) {
    res.write(`event: end\ndata: ${JSON.stringify({error: null, idle: true})}\n\n`);
    return res.end();
  }
  for (const e of job.events) res.write(`data: ${JSON.stringify(e)}\n\n`);
  if (job.done) {
    res.write(`event: end\ndata: ${JSON.stringify({error: job.error ?? null})}\n\n`);
    return res.end();
  }
  job.clients.add(res);
  req.on('close', () => job.clients.delete(res));
});

// ── Projeler ───────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ok: true, root: ROOT}));

app.get('/api/projects', (_req, res) => {
  fs.mkdirSync(VIDEOS, {recursive: true});
  const ids = fs.readdirSync(VIDEOS).filter((n) => !n.startsWith('.') && fs.statSync(path.join(VIDEOS, n)).isDirectory());
  const list = ids.map(summarize).sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  res.json(list);
});

app.get('/api/projects/:id', (req, res) => {
  projectDir(req.params.id);
  res.json(detail(req.params.id));
});

const slugify = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğüöçâîû]/g, (c) => ({ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u'})[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const upload = multer({dest: path.join(ROOT, '.uploads'), limits: {fileSize: 20 * 1024 ** 3}});

/** Yükleme geçici dosyaları: istek hata verse de .uploads/ içinde kalmasın. */
const dropUploads = (req: Request) => {
  for (const list of Object.values((req.files as Record<string, Express.Multer.File[]>) ?? {})) for (const f of list) fs.rmSync(f.path, {force: true});
};

const SUB_EXT = ['.srt', '.vtt'];
const placeSubtitles = (dir: string, f: Express.Multer.File) => {
  const ext = path.extname(f.originalname).toLowerCase();
  if (!SUB_EXT.includes(ext)) throw httpError(400, 'Altyazı .srt ya da .vtt olmalı');
  const footage = paths(dir).footage;
  for (const e of SUB_EXT) fs.rmSync(path.join(footage, `kurgu${e}`), {force: true});
  fs.renameSync(f.path, path.join(footage, `kurgu${ext}`));
};

app.post('/api/projects', upload.fields([{name: 'video', maxCount: 1}, {name: 'script', maxCount: 1}, {name: 'subtitles', maxCount: 1}]), (req, res) => {
  try {
    createProject(req, res);
  } finally {
    dropUploads(req);
  }
});

const createProject = (req: Request, res: Response) => {
  const files = req.files as Record<string, Express.Multer.File[]>;
  const video = files?.video?.[0];
  const script = files?.script?.[0];
  const subtitles = files?.subtitles?.[0];
  if (!script) throw httpError(400, 'İşaretli script dosyası (.md) gerekli');
  if (video && !subtitles) throw httpError(400, "Descript altyazısı (SRT) gerekli: Descript'te Export → Subtitles → SRT");
  const scriptText = fs.readFileSync(script.path, 'utf8');
  const parsed = parseScript(scriptText);
  const title = (req.body.title as string)?.trim() || parsed.header.title || path.basename(script.originalname, '.md');
  const month = new Date().toISOString().slice(0, 7);
  let id = (req.body.id as string)?.trim() || `${month}-${slugify(title) || 'video'}`;
  if (!/^[a-z0-9-]+$/.test(id)) id = slugify(id);
  let dir = path.join(VIDEOS, id);
  for (let n = 2; fs.existsSync(dir); n++) dir = path.join(VIDEOS, `${id}-${n}`);
  id = path.basename(dir);
  const p = paths(dir);
  for (const d of [p.footage, p.assets, p.build, p.out]) fs.mkdirSync(d, {recursive: true});
  // Kurgu sonrası script'ler script.final.md, çekim script'leri script.md olur.
  const isFinal = parsed.header.stage === 'kurgu-sonrası' || /final/i.test(script.originalname);
  fs.writeFileSync(isFinal ? p.scriptFinal : p.scriptMd, scriptText);
  fs.unlinkSync(script.path);
  if (video) {
    const ext = path.extname(video.originalname).toLowerCase() || '.mp4';
    fs.renameSync(video.path, path.join(p.footage, `kurgu${ext}`));
  }
  // Descript altyazısı (SRT/VTT): pipeline'ın tek zamanlama kaynağı.
  if (subtitles) placeSubtitles(dir, subtitles);
  writeMeta(dir, {id, title, createdAt: new Date().toISOString()});
  if (video && subtitles && req.body.autostart !== 'false') startJob(id, 'prepare', (emit, signal) => stagePrepare(dir, emit, {signal}));
  res.status(201).json(detail(id));
};

/** Var olan projeye video / altyazı / script ekle ya da değiştir. */
app.post('/api/projects/:id/files', upload.fields([{name: 'video', maxCount: 1}, {name: 'script', maxCount: 1}, {name: 'subtitles', maxCount: 1}]), (req, res) => {
  try {
    const id = String(req.params.id);
    const dir = projectDir(id);
    const job = jobs.get(id);
    if (job && !job.done) throw httpError(409, 'İş çalışırken dosya değiştirilemez');
    const files = req.files as Record<string, Express.Multer.File[]>;
    const p = paths(dir);
    const video = files?.video?.[0];
    const script = files?.script?.[0];
    const subtitles = files?.subtitles?.[0];
    if (subtitles) placeSubtitles(dir, subtitles);
    if (video) {
      for (const n of fs.readdirSync(p.footage)) if (/^kurgu\.(mp4|mov|m4v|mkv|webm|wav|mp3|m4a|aac|flac)$/i.test(n)) fs.rmSync(path.join(p.footage, n));
      fs.renameSync(video.path, path.join(p.footage, `kurgu${path.extname(video.originalname).toLowerCase() || '.mp4'}`));
    }
    if (script) {
      const text = fs.readFileSync(script.path, 'utf8');
      const isFinal = parseScript(text).header.stage === 'kurgu-sonrası' || /final/i.test(script.originalname);
      fs.writeFileSync(isFinal ? p.scriptFinal : p.scriptMd, text);
    }
    writeMeta(dir, readMeta(id));
    res.json(detail(id));
  } finally {
    dropUploads(req);
  }
});

app.post('/api/projects/:id/prepare', (req, res) => {
  const dir = projectDir(req.params.id);
  findBaseMedia(dir);
  startJob(req.params.id, 'prepare', (emit, signal) => stagePrepare(dir, emit, {force: Boolean(req.body?.force), signal}));
  res.json(summarize(req.params.id));
});

/** Fotoğraf seçimi: {selections: {"dosya.jpg": [1, 3]}} → seçilen adaylar assets/'e geçer, hizalama yenilenir. */
app.post('/api/projects/:id/photos', (req, res) => {
  const dir = projectDir(req.params.id);
  const selections = (req.body?.selections ?? {}) as Record<string, number[]>;
  const results: Record<string, string> = {};
  for (const [file, picks] of Object.entries(selections)) {
    if (!Array.isArray(picks) || !picks.length) continue;
    try {
      results[file] = selectCandidates(dir, file, picks.map(Number)).provenance.title;
    } catch (e: any) {
      results[file] = `✗ ${e.message}`;
    }
  }
  stageAlign(dir, () => {});
  const meta = readMeta(req.params.id);
  writeMeta(dir, meta);
  res.json({results, ...detail(req.params.id)});
});

/** Editörden gelen sahneler: ham hizalamayla fark alınır, build/edits.json'a yazılır, scenes.json güncellenir. */
app.put('/api/projects/:id/scenes', (req, res) => {
  const dir = projectDir(req.params.id);
  const p = paths(dir);
  const data = readJson<ScenesFile>(p.scenes);
  if (!data) throw httpError(400, 'Önce hizalama çalışmalı');
  const incoming = (req.body?.scenes ?? []) as Pick<Scene, 'markerId' | 'startSec' | 'endSec' | 'disabled'>[];
  const aligned: ScenesFile = {...data, scenes: data.aligned ?? data.scenes};
  const edits = editsFromScenes(aligned, incoming as Scene[]);
  saveEdits(dir, edits);
  const scenes = stageAlign(dir, () => {});
  writeMeta(dir, readMeta(req.params.id));
  res.json({edits: Object.keys(edits).length, scenes});
});

app.delete('/api/projects/:id/edits', (req, res) => {
  const dir = projectDir(req.params.id);
  saveEdits(dir, {});
  res.json({scenes: stageAlign(dir, () => {}), edits: loadEdits(dir)});
});

app.post('/api/projects/:id/render', (req, res) => {
  const dir = projectDir(req.params.id);
  startJob(req.params.id, 'render', (emit, signal) => stageRender(dir, emit, {overlay: Boolean(req.body?.overlay), includeSuggested: true, frames: req.body?.frames, signal}));
  res.json(summarize(req.params.id));
});

/** Çalışan işi durdur: render'ın bütün süreç ağacı kapanır, yarım çıktı ve geçici dosyalar silinir. */
app.post('/api/projects/:id/cancel', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.done) throw httpError(409, 'Çalışan iş yok');
  job.abort.abort();
  res.json({ok: true});
});

app.get('/api/processes', (_req, res) => res.json(liveProcesses()));

app.delete('/api/projects/:id', (req, res) => {
  const dir = projectDir(req.params.id);
  const job = jobs.get(req.params.id);
  if (job && !job.done) throw httpError(409, 'İş çalışırken proje silinemez');
  fs.rmSync(dir, {recursive: true, force: true});
  jobs.delete(req.params.id);
  res.json({ok: true});
});

/** Kurgu kaydının temel bilgisi (çözünürlük, süre). */
app.get('/api/projects/:id/probe', (req, res) => {
  const dir = projectDir(req.params.id);
  res.json(ffprobe(findBaseMedia(dir).file));
});

// ── Dosyalar ve arayüz ─────────────────────────────────────────────────────

app.use('/files', express.static(VIDEOS, {acceptRanges: true, fallthrough: false}));

const uiDist = path.join(ROOT, 'dist/ui');
if (fs.existsSync(uiDist)) {
  // index.html önbelleğe alınmasın: yeni derlemede hash'li paket adları değişir.
  const noCache = {headers: {'Cache-Control': 'no-cache'}};
  app.use(express.static(uiDist, {index: false, setHeaders: (res, file) => file.endsWith('.html') && res.setHeader('Cache-Control', 'no-cache')}));
  app.get(/^(?!\/api|\/files).*/, (_req, res) => res.sendFile(path.join(uiDist, 'index.html'), noCache));
} else {
  app.get('/', (_req, res) => res.type('text').send('Arayüz derlenmemiş. Geliştirme: npm run ui:dev · Üretim: npm run ui:build'));
}

app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({error: err.message ?? 'Sunucu hatası'});
});

// Önceki çalışmadan kalmış yarım yüklemeleri temizle (klasörün kendisi kalır; multer ona yazıyor).
const UPLOADS = path.join(ROOT, '.uploads');
fs.mkdirSync(UPLOADS, {recursive: true});
for (const f of fs.readdirSync(UPLOADS)) fs.rmSync(path.join(UPLOADS, f), {recursive: true, force: true});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`YouTube Enhance sunucusu: http://localhost:${PORT}`));

// ── Kapanış: hiçbir alt süreç sahipsiz kalmasın ────────────────────────────

let shuttingDown = false;
const shutdown = async (reason: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Kapanıyor (${reason}): ${liveProcesses().length} alt süreç sonlandırılıyor`);
  for (const job of jobs.values()) if (!job.done) job.abort.abort();
  await killAll(3000);
  server.close();
  for (const job of jobs.values()) for (const c of job.clients) c.end();
  // Render'ın temizliği (geçici klasör, yarım çıktı) close olayında yapılır; ona kısa süre tanı.
  setTimeout(() => process.exit(0), 300).unref();
};
for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.on(sig, () => shutdown(sig));

// Electron beklenmedik şekilde kapanırsa (çökme, kill -9) sunucu kendini kapatır.
const parentPid = Number(process.env.YTE_PARENT_PID);
if (parentPid) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0);
    } catch {
      shutdown('uygulama kapandı');
    }
  }, 2000).unref();
}
