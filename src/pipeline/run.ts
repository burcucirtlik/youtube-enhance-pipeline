// Pipeline aşamaları, ilerleme olaylarıyla. CLI (cli.ts) ve masaüstü uygulamasının sunucusu (server/) ortak kullanır.

import fs from 'node:fs';
import path from 'node:path';
import type {ScenesFile} from '../shared/types';
import {buildScenes, DEFAULT_ALIGN, type Transcript} from './align';
import {collectAssets} from './assets';
import {loadCandidateSet, loadRegistry, writeReviewPage, type CandidateSet, type Provenance} from './commons';
import {lintScript, type LintResult} from './lint';
import {parseScript, type ParsedScript} from './parse-script';
import {killTree, spawnTracked} from './procs';
import type {WorkerEvent, WorkerJob} from './render-worker';
import {brand} from '../../brand/brand';
import {chapterCards, compositionFps, overlayRanges, sceneSequences} from '../shared/timeline';
import {codeHash, dirSig, fileHash, fileSig, forgetStage, hashOf, isFresh, loadState, recordStage, type StageKey} from './state';
import {buildTiming, timingUpToDate} from './timing';
import {ffprobe, findBaseMedia, fmtTime, paths, pickScript, ROOT, SKILL} from './util';

export type StageName = 'lint' | 'timing' | 'assets' | 'align' | 'render';
export const STAGES: {name: StageName; label: string}[] = [
  {name: 'lint', label: 'Script kontrolü'},
  {name: 'timing', label: 'Zamanlama (SRT)'},
  {name: 'assets', label: 'Görseller'},
  {name: 'align', label: 'Hizalama'},
  {name: 'render', label: 'Render'},
];

export type RunEvent =
  | {type: 'stage'; stage: StageName; status: 'start' | 'done' | 'skip' | 'error'; detail?: string}
  | {type: 'progress'; stage: StageName; ratio: number; text?: string}
  | {type: 'log'; text: string};
export type Emit = (e: RunEvent) => void;

export type LintStage = {file: string; parsed: ParsedScript; res: LintResult};
export type AssetResult = Awaited<ReturnType<typeof collectAssets>>[number];

export const loadScript = (dir: string): {file: string; parsed: ParsedScript} => {
  const file = pickScript(dir);
  return {file, parsed: parseScript(fs.readFileSync(file, 'utf8'))};
};

// ── Aşama girdileri ────────────────────────────────────────────────────────
// Her aşamanın çıktısını belirleyen her şeyin özeti. Özet son başarılı çalıştırmadakiyle aynıysa aşama atlanır.

const PIPELINE_CODE = ['src/pipeline/markers.ts', 'src/pipeline/parse-script.ts', 'src/pipeline/text.ts', 'src/shared'];
const assetSig = (dir: string) => {
  const p = paths(dir);
  return [dirSig(p.assets), dirSig(p.buildAssets), dirSig(path.join(p.build, 'fotolar'), {skip: (r) => r === 'index.html'})];
};
const assetMarkers = (parsed: ParsedScript) => parsed.markers.filter((m) => ['news', 'document', 'photo', 'clip', 'map', 'screen', 'code'].includes(m.props.type)).map((m) => m.props);

export const stageInputs = {
  lint: (dir: string) => hashOf(fileHash(pickScript(dir)), fileHash(SKILL), codeHash('src/pipeline/lint.ts', ...PIPELINE_CODE)),
  assets: (dir: string, parsed: ParsedScript) => hashOf(assetMarkers(parsed), assetSig(dir), codeHash('src/pipeline/assets.ts', 'src/pipeline/commons.ts')),
  align: (dir: string) => {
    const p = paths(dir);
    let base: string | null = null;
    try {
      base = fileSig(findBaseMedia(dir).file);
    } catch {
      /* kayıt yok */
    }
    return hashOf(
      fileHash(pickScript(dir)),
      fileHash(p.transcript),
      base,
      fileHash(path.join(p.build, 'edits.json')),
      fileHash(path.join(p.assets, 'kaynaklar.json')),
      fileHash(path.join(p.build, 'harita.json')),
      assetSig(dir),
      codeHash('src/pipeline/align.ts', 'src/pipeline/edits.ts', 'src/pipeline/commons.ts', ...PIPELINE_CODE),
    );
  },
  /** Render: sahneler (oluşturulma zamanı hariç) + varlıklar + kurgu kaydı + Remotion/marka kodu + seçenekler. */
  render: (dir: string, opts: {overlay?: boolean; includeSuggested?: boolean} = {}) => {
    const p = paths(dir);
    let scenes: unknown = null;
    try {
      const {generatedAt: _g, ...rest} = JSON.parse(fs.readFileSync(p.scenes, 'utf8'));
      scenes = rest;
    } catch {
      /* hizalama yok */
    }
    let base: string | null = null;
    try {
      base = fileSig(findBaseMedia(dir).file);
    } catch {
      /* kayıt yok */
    }
    return hashOf(scenes, base, assetSig(dir), {overlay: Boolean(opts.overlay), includeSuggested: opts.includeSuggested ?? true}, codeHash('src/remotion', 'brand', 'src/shared'));
  },
};

const renderKey = (overlay?: boolean): StageKey => (overlay ? 'render-overlay' : 'render');

export type Freshness = 'güncel' | 'değişti' | 'yok';
/** Arayüz için: her aşamanın son çalışması şimdiki girdilere göre güncel mi. */
export const stageFreshness = (dir: string): Record<StageName, {state: Freshness; at?: string; detail?: string}> => {
  const st = loadState(dir).stages;
  const of = (k: StageKey, hash: () => string | null) => {
    const r = st[k];
    if (!r) return {state: 'yok' as Freshness};
    let h: string | null = null;
    try {
      h = hash();
    } catch {
      /* girdi eksik */
    }
    return {state: (r.ok !== false && h === r.hash ? 'güncel' : 'değişti') as Freshness, at: r.at, detail: r.detail};
  };
  let parsed: ParsedScript | null = null;
  try {
    parsed = loadScript(dir).parsed;
  } catch {
    /* script yok */
  }
  const timingRec = st.timing;
  return {
    lint: of('lint', () => stageInputs.lint(dir)),
    timing: timingRec ? {state: timingUpToDate(dir) ? 'güncel' : 'değişti', at: timingRec.at, detail: timingRec.detail} : {state: 'yok'},
    assets: of('assets', () => (parsed ? stageInputs.assets(dir, parsed) : null)),
    align: of('align', () => stageInputs.align(dir)),
    render: of('render', () => stageInputs.render(dir)),
  };
};

/** Tam video son render'dan beri değişmedi mi. Kaydı olmayan eski projelerde dosya zamanına bakılır. */
export const renderUpToDate = (dir: string): boolean => {
  const p = paths(dir);
  const out = path.join(p.out, 'video.mp4');
  if (!fs.existsSync(out)) return false;
  const rec = loadState(dir).stages.render;
  if (!rec) return fs.existsSync(p.scenes) && fs.statSync(out).mtimeMs >= fs.statSync(p.scenes).mtimeMs;
  return isFresh(dir, 'render', stageInputs.render(dir));
};

export const stageLint = (dir: string, emit: Emit): LintStage => {
  emit({type: 'stage', stage: 'lint', status: 'start'});
  const hash = stageInputs.lint(dir);
  const {file, parsed} = loadScript(dir);
  const res = lintScript(parsed, {skillPath: SKILL});
  fs.mkdirSync(paths(dir).build, {recursive: true});
  fs.writeFileSync(path.join(paths(dir).build, 'lint.json'), JSON.stringify({file: path.basename(file), ...res}, null, 1));
  const errs = res.issues.filter((i) => i.level === 'hata').length;
  const warns = res.issues.filter((i) => i.level === 'uyarı').length;
  const detail = `${res.stats['işaret']} işaret · ${errs} hata · ${warns} uyarı`;
  recordStage(dir, 'lint', {hash, detail, ok: true});
  emit({type: 'stage', stage: 'lint', status: 'done', detail});
  return {file, parsed, res};
};

/** Kelime zamanları Descript altyazısından (SRT/VTT); saniyeler içinde biter. */
export const stageTiming = (dir: string, emit: Emit, force = false) => {
  emit({type: 'stage', stage: 'timing', status: 'start'});
  try {
    const r = buildTiming(dir, {force});
    recordStage(dir, 'timing', {hash: fileHash(paths(dir).transcript) ?? '', detail: r.detail, ok: true});
    emit({type: 'stage', stage: 'timing', status: r.status === 'güncel' ? 'skip' : 'done', detail: r.detail});
    return r;
  } catch (e: any) {
    emit({type: 'stage', stage: 'timing', status: 'error', detail: e.message});
    throw e;
  }
};

const assetResultsFile = (dir: string) => path.join(paths(dir).build, 'varliklar.json');

export const stageAssets = async (dir: string, parsed: ParsedScript, emit: Emit, force = false): Promise<AssetResult[] | null> => {
  emit({type: 'stage', stage: 'assets', status: 'start'});
  // Girdiler değişmediyse ve son çalışmada eksik kalmadıysa tarayıcı/ağ hiç açılmaz.
  if (!force && isFresh(dir, 'assets', stageInputs.assets(dir, parsed))) {
    emit({type: 'stage', stage: 'assets', status: 'skip', detail: `değişmedi · ${loadState(dir).stages.assets?.detail ?? ''}`});
    try {
      return JSON.parse(fs.readFileSync(assetResultsFile(dir), 'utf8'));
    } catch {
      return null;
    }
  }
  const results = await collectAssets(dir, parsed, {force});
  writeReviewPage(dir, path.basename(dir));
  const missing = results.filter((r) => r.status === 'eksik').length;
  const pending = photoStatus(dir, parsed).filter((p) => p.state === 'bekliyor').length;
  const detail = `${results.length} varlık · ${missing} eksik · ${pending} fotoğraf seçim bekliyor`;
  // Eksik varlık kaldıysa bir sonraki çalıştırmada yeniden denensin (ağ hatası, sonradan konan dosya).
  fs.writeFileSync(assetResultsFile(dir), JSON.stringify(results, null, 1));
  recordStage(dir, 'assets', {hash: stageInputs.assets(dir, parsed), detail, ok: missing === 0});
  emit({type: 'stage', stage: 'assets', status: 'done', detail});
  return results;
};

export const stageAlign = (dir: string, emit: Emit, opts: {force?: boolean} = {}): ScenesFile => {
  emit({type: 'stage', stage: 'align', status: 'start'});
  const p = paths(dir);
  if (!fs.existsSync(p.transcript)) throw new Error('Zamanlama yok; önce zamanlama aşaması çalışmalı');
  const hash = stageInputs.align(dir);
  if (!opts.force && fs.existsSync(p.scenes) && isFresh(dir, 'align', hash)) {
    const scenes: ScenesFile = JSON.parse(fs.readFileSync(p.scenes, 'utf8'));
    emit({type: 'stage', stage: 'align', status: 'skip', detail: `değişmedi · ${scenes.scenes.length} sahne`});
    return scenes;
  }
  const {file, parsed} = loadScript(dir);
  const t: Transcript = JSON.parse(fs.readFileSync(p.transcript, 'utf8'));
  const base = findBaseMedia(dir);
  const probe = ffprobe(base.file);
  const scenes = buildScenes(dir, file, parsed, t, {...base, probe}, {...DEFAULT_ALIGN, includeSuggested: true});
  fs.writeFileSync(p.scenes, JSON.stringify(scenes, null, 1));
  fs.mkdirSync(p.out, {recursive: true});
  fs.writeFileSync(path.join(p.out, 'bolumler.txt'), scenes.chapters.map((ch) => `${fmtTime(ch.startSec)} ${ch.title}`).join('\n') + '\n');
  const detail = `${scenes.scenes.length} sahne · ${scenes.dropped.length} düşen`;
  // Özet, hizalamanın kendi yazdığı dosyalar (edits taşıması) sonrasında alınır.
  recordStage(dir, 'align', {hash: stageInputs.align(dir), detail, ok: true});
  emit({type: 'stage', stage: 'align', status: 'done', detail});
  return scenes;
};

const checkAbort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('İptal edildi');
};

/** lint → zamanlama → görseller → hizalama. Fotoğraf seçimi bekleyen işaret varsa `pendingPhotos` dolu döner. */
export const stagePrepare = async (dir: string, emit: Emit, opts: {force?: boolean; signal?: AbortSignal} = {}) => {
  const lint = stageLint(dir, emit);
  checkAbort(opts.signal);
  stageTiming(dir, emit, opts.force);
  checkAbort(opts.signal);
  const assets = await stageAssets(dir, lint.parsed, emit, opts.force);
  checkAbort(opts.signal);
  const scenes = stageAlign(dir, emit, {force: opts.force});
  writeReport(dir, {lint, assets: assets ?? undefined, scenes});
  return {lint, assets, scenes, photos: photoStatus(dir, lint.parsed)};
};

export type PhotoStatus = {
  file: string;
  line: number;
  caption?: string;
  query?: string;
  state: 'seçildi' | 'bekliyor' | 'aday-yok' | 'aranmadı' | 'elle';
  media: 'photo' | 'clip';
  selected: string[]; // seçilen aday başlıkları
  picks: number[]; // seçilen aday numaraları (1'den)
  candidates: CandidateSet['candidates'];
};

/** FOTO işaretlerinin durumu: aday var mı, seçildi mi. */
export const photoStatus = (dir: string, parsed: ParsedScript): PhotoStatus[] => {
  const reg = loadRegistry(dir);
  const out: PhotoStatus[] = [];
  const seen = new Set<string>();
  for (const m of parsed.markers) {
    if ((m.props.type !== 'photo' && m.props.type !== 'clip') || seen.has(m.props.file)) continue;
    seen.add(m.props.file);
    const f = m.props.file;
    const set = m.props.search ? loadCandidateSet(dir, f) : null;
    const prov: Provenance | undefined = reg[f];
    const inAssets = fs.existsSync(path.join(paths(dir).assets, f));
    const selectedFiles = prov ? [f, ...(prov.extra ?? [])] : [];
    const selectedTitles = selectedFiles.map((x) => reg[x]?.title).filter(Boolean) as string[];
    const picks = set ? selectedTitles.map((t) => set.candidates.findIndex((c) => c.title === t) + 1).filter((n) => n > 0) : [];
    const state: PhotoStatus['state'] = prov ? 'seçildi' : inAssets ? 'elle' : !m.props.search ? 'elle' : !set ? 'aranmadı' : set.candidates.length ? 'bekliyor' : 'aday-yok';
    out.push({media: m.props.type, file: f, line: m.line, caption: m.props.caption, query: m.props.search, state: inAssets && !prov && !m.props.search ? 'elle' : state, selected: selectedTitles, picks, candidates: set?.candidates ?? []});
  }
  return out;
};

// ── Render ─────────────────────────────────────────────────────────────────

export type RenderOptions = {overlay?: boolean; includeSuggested?: boolean; frames?: string; force?: boolean; full?: boolean; signal?: AbortSignal};

/** Görseller videonun bu oranından fazlasını kaplıyorsa parça render'ı kazandırmaz; tam render yapılır. */
const PARTIAL_MAX_COVERAGE = Number(process.env.YTE_PARTIAL_MAX ?? 0.6); // YTE_PARTIAL_MAX: deneme için

/**
 * Parça render'ı yapılabilir mi: tam video (katman değil, kare aralığı değil), kurgu kaydı video ve görseller
 * videonun çoğunu kaplamıyor. Dönen aralıklar kompozisyon kareleri (uçlar dahil).
 */
export const partialPlan = (dir: string, opts: RenderOptions): {ranges: [number, number][]; baseFile: string; coverage: number} | null => {
  if (opts.overlay || opts.frames || opts.full) return null;
  const data: ScenesFile = JSON.parse(fs.readFileSync(paths(dir).scenes, 'utf8'));
  if (data.base.kind !== 'video') return null;
  const fps = compositionFps(data);
  const total = Math.max(1, Math.ceil(data.base.durationSec * fps));
  const seqs = sceneSequences(data, {includeSuggested: opts.includeSuggested ?? true, crossfadeFrames: brand.motion.crossfadeFrames, skipMissing: true});
  const ranges = overlayRanges([...seqs, ...chapterCards(data, brand.chapterCard)], total, 2 * fps);
  const coverage = ranges.reduce((a, [x, y]) => a + y - x + 1, 0) / total;
  if (coverage > PARTIAL_MAX_COVERAGE) return null;
  return {ranges, baseFile: path.join(dir, data.base.src), coverage};
};

/**
 * Render kuyruğu: aynı anda tek render (her biri bütün çekirdekleri kullanıyor). Sıradaki işler bekler,
 * iptal edilen sıradan düşer.
 */
let renderChain: Promise<unknown> = Promise.resolve();
let queued = 0;
export const renderQueueLength = () => queued;

const enqueue = <T,>(work: () => Promise<T>, onWait: (ahead: number) => void, signal?: AbortSignal): Promise<T> => {
  const ahead = queued;
  queued++;
  if (ahead > 0) onWait(ahead);
  const run = renderChain.then(() => {
    if (signal?.aborted) throw new Error('Render iptal edildi');
    return work();
  });
  renderChain = run.catch(() => {}).finally(() => queued--);
  return run;
};

const parseFrames = (f?: string): [number, number] | undefined => {
  if (!f) return undefined;
  const m = f.match(/^(\d+)-(\d+)$/);
  if (!m) throw new Error(`Kare aralığı "başlangıç-bitiş" olmalı: ${f}`);
  return [Number(m[1]), Number(m[2])];
};

/**
 * Render, Remotion'un Node API'siyle ayrı bir işçi süreçte (render-worker.ts) çalışır:
 * - Remotion paketi kod değişmedikçe bir kez üretilir (.cache/remotion); her render'da yeniden paketlenmez,
 *   proje klasörü (750 MB'lık video dahil) pakete kopyalanmaz, bağlanır.
 * - İşçi kendi süreç grubunda ve kendi geçici klasöründe (TMPDIR = build/.render-tmp-*) çalışır. Bitince, hata
 *   verince ya da iptal edilince süreç ağacı kapanır, geçici klasör silinir. Çıktı önce geçici klasöre yazılır, yalnızca
 *   başarılı olursa yerine taşınır: iptal edilen yeniden render önceki videoyu silmez.
 */
export const stageRender = (dir: string, emit: Emit, opts: RenderOptions = {}): Promise<string> => {
  const p = paths(dir);
  if (!fs.existsSync(p.scenes)) return Promise.reject(new Error('build/scenes.json yok; önce hizalama çalışmalı'));
  emit({type: 'stage', stage: 'render', status: 'start'});
  fs.mkdirSync(p.out, {recursive: true});
  const out = path.join(p.out, opts.overlay ? 'gorsel-katmani.mov' : 'video.mp4');
  // Son tam render'dan beri hiçbir girdi değişmediyse aynı dosyayı yeniden üretme.
  const key = renderKey(opts.overlay);
  const hash = stageInputs.render(dir, opts);
  if (!opts.frames && !opts.force && fs.existsSync(out) && isFresh(dir, key, hash)) {
    emit({type: 'stage', stage: 'render', status: 'skip', detail: `değişmedi · ${path.basename(out)} güncel`});
    return Promise.resolve(out);
  }
  const frames = parseFrames(opts.frames);
  const missing = (JSON.parse(fs.readFileSync(p.scenes, 'utf8')) as ScenesFile).scenes.filter((s) => !s.disabled && s.missingAsset);
  if (missing.length) emit({type: 'log', text: `Malzemesi eksik ${missing.length} sahne render'a girmiyor (önizlemede yer tutucu): ${missing.map((s) => `satır ${s.line} ${s.missingAsset}`).join(', ')}`});
  const partial = partialPlan(dir, opts);
  if (partial) emit({type: 'log', text: `Parça render'ı: görseller videonun %${Math.round(partial.coverage * 100)}'ini kaplıyor; ${partial.ranges.length} parça render edilip kurgu kaydının üstüne bindirilecek.`});
  return enqueue(
    () =>
      runWorker(
        dir,
        emit,
        {out, overlay: Boolean(opts.overlay), includeSuggested: opts.includeSuggested ?? true, frames, partial: partial ? {ranges: partial.ranges, baseFile: partial.baseFile} : undefined},
        opts.signal,
      ).then((r) => ({detail: partial ? `${r.detail} · parça render (%${Math.round(partial.coverage * 100)})` : r.detail})),
    (ahead) => emit({type: 'progress', stage: 'render', ratio: 0, text: `sırada: önünde ${ahead} render var`}),
    opts.signal,
  ).then(
    (r) => {
      // Kısmi (kare aralığı) render tam videonun yerine sayılmaz.
      if (!frames) recordStage(dir, key, {hash, detail: r.detail, ok: true});
      else forgetStage(dir, key);
      emit({type: 'stage', stage: 'render', status: 'done', detail: r.detail});
      return out;
    },
    (e: Error) => {
      emit({type: 'stage', stage: 'render', status: 'error', detail: /iptal/i.test(e.message) ? 'iptal edildi' : e.message.split('\n')[0].slice(0, 200)});
      throw e;
    },
  );
};

const runWorker = (dir: string, emit: Emit, job: Omit<WorkerJob, 'projectDir'>, signal?: AbortSignal) =>
  new Promise<{detail: string}>((resolve, reject) => {
    const p = paths(dir);
    const tmp = path.join(p.build, `.render-tmp-${Date.now()}`);
    fs.mkdirSync(tmp, {recursive: true});
    const startedAt = Date.now();
    // İşçi geçici klasöre yazar, başarılıysa yerine taşınır: iptal edilen ya da hata veren yeniden render
    // önceki iyi videoyu silmez.
    const spec: WorkerJob = {...job, out: path.join(tmp, 'cikti' + path.extname(job.out)), projectDir: dir};
    const child = spawnTracked(`render ${path.basename(dir)}`, process.execPath, ['--import', 'tsx', path.join(ROOT, 'src/pipeline/render-worker.ts'), JSON.stringify(spec)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {...process.env, FORCE_COLOR: '0', TMPDIR: tmp + '/'},
    });
    let cancelled = false;
    const onAbort = () => {
      cancelled = true;
      emit({type: 'log', text: 'Render iptal ediliyor…'});
      if (child.pid) killTree(child.pid);
    };
    if (signal?.aborted) onAbort();
    signal?.addEventListener('abort', onAbort, {once: true});
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      // Süreç ağacında artakalan (ör. Chrome yardımcıları) varsa onları da kapat.
      if (child.pid) killTree(child.pid, 1000);
      fs.rmSync(tmp, {recursive: true, force: true});
    };
    let buf = '';
    let stderr = '';
    let done = false;
    child.stdout!.on('data', (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        let e: WorkerEvent;
        try {
          e = JSON.parse(line);
        } catch {
          if (line.trim()) emit({type: 'log', text: line.trim().slice(0, 300)});
          continue;
        }
        if (e.t === 'bundle')
          emit({type: 'progress', stage: 'render', ratio: e.status === 'paketleniyor' ? (e.ratio ?? 0) * 0.05 : 0.05, text: e.status === 'önbellekte' ? 'paket önbellekte' : e.status === 'paketleniyor' ? 'paketleniyor (kod değişti)' : 'paket hazır'});
        else if (e.t === 'progress' && job.partial)
          // Paket %5, parçalar %65, birleştirme %30.
          emit({type: 'progress', stage: 'render', ratio: 0.05 + (e.rendered / e.total) * 0.65, text: `${e.stage} · kare ${e.rendered} / ${e.total}`});
        else if (e.t === 'progress')
          // Paket %5, kareler %85, kodlama %10.
          emit({type: 'progress', stage: 'render', ratio: 0.05 + (e.rendered / e.total) * 0.85 + (e.encoded / e.total) * 0.1, text: e.rendered < e.total ? `kare ${e.rendered} / ${e.total}` : `kodlama ${e.encoded} / ${e.total}`});
        else if (e.t === 'compose') emit({type: 'progress', stage: 'render', ratio: 0.7 + e.ratio * 0.3, text: `kurgu kaydıyla birleştiriliyor %${Math.round(e.ratio * 100)}`});
        else if (e.t === 'log') emit({type: 'log', text: e.text});
        else if (e.t === 'done') done = true;
      }
    });
    child.stderr!.on('data', (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-4000);
    });
    child.on('error', (e) => {
      cleanup();
      reject(e);
    });
    child.on('close', (code) => {
      if (cancelled || code !== 0 || !done || !fs.existsSync(spec.out)) {
        cleanup();
        if (!cancelled && stderr.trim()) emit({type: 'log', text: stderr.trim().split('\n').slice(-6).join(' | ').slice(0, 600)});
        return reject(new Error(cancelled ? 'Render iptal edildi' : `Render başarısız (çıkış kodu ${code})`));
      }
      fs.renameSync(spec.out, job.out);
      cleanup();
      const mb = (fs.statSync(job.out).size / 1e6).toFixed(1);
      resolve({detail: `${path.basename(job.out)} · ${mb} MB · ${Math.round((Date.now() - startedAt) / 1000)} sn`});
    });
  });

// ── Rapor ──────────────────────────────────────────────────────────────────

export const writeReport = (dir: string, parts: {lint?: LintStage; assets?: AssetResult[]; scenes?: ScenesFile}) => {
  const p = paths(dir);
  const L: string[] = [`# Pipeline raporu — ${parts.lint?.parsed.header.title ?? path.basename(dir)}`, '', `_${new Date().toLocaleString('tr-TR')}_`, ''];
  if (parts.lint) {
    L.push('## Script kontrolü', '', Object.entries(parts.lint.res.stats).map(([k, v]) => `${k}: ${v}`).join(' · '), '');
    for (const i of parts.lint.res.issues) L.push(`- **${i.level}** (satır ${i.line}) ${i.msg}`);
    L.push('');
  }
  if (parts.assets) {
    L.push('## Varlıklar', '');
    for (const r of parts.assets) L.push(`- [${r.status === 'eksik' ? ' ' : 'x'}] ${r.what} (satır ${r.line})${r.note ? ' — ' + r.note : ''}`);
    L.push('');
  }
  if (parts.scenes) {
    const s = parts.scenes;
    L.push('## Hizalama', '', `${s.scenes.length} sahne, ${s.dropped.length} düşen işaret.`, '');
    for (const d of s.dropped) L.push(`- düşen (satır ${d.line}): ${d.raw} — ${d.reason}`);
    for (const w of s.warnings) L.push(`- uyarı: ${w}`);
    L.push('', '### Sahne listesi', '', '| Zaman | Satır | Tür | Süre | Not |', '|---|---|---|---|---|');
    for (const sc of s.scenes)
      L.push(`| ${fmtTime(sc.startSec)} | ${sc.line} | ${sc.props.type}${sc.suggested ? ' ?' : ''}${sc.danger ? ' ⚠' : ''}${sc.disabled ? ' (silindi)' : ''} | ${(sc.endSec - sc.startSec).toFixed(1)} sn | ${sc.missingAsset ? 'eksik: ' + sc.missingAsset : ''} |`);
    L.push('', '### YouTube bölümleri', '', '```', ...s.chapters.map((ch) => `${fmtTime(ch.startSec)} ${ch.title}`), '```', '');
  }
  fs.writeFileSync(p.report, L.join('\n'));
  return p.report;
};
