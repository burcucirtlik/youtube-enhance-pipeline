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
import {buildTiming} from './timing';
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

export const stageLint = (dir: string, emit: Emit): LintStage => {
  emit({type: 'stage', stage: 'lint', status: 'start'});
  const {file, parsed} = loadScript(dir);
  const res = lintScript(parsed, {skillPath: SKILL});
  fs.mkdirSync(paths(dir).build, {recursive: true});
  fs.writeFileSync(path.join(paths(dir).build, 'lint.json'), JSON.stringify({file: path.basename(file), ...res}, null, 1));
  const errs = res.issues.filter((i) => i.level === 'hata').length;
  const warns = res.issues.filter((i) => i.level === 'uyarı').length;
  emit({type: 'stage', stage: 'lint', status: 'done', detail: `${res.stats['işaret']} işaret · ${errs} hata · ${warns} uyarı`});
  return {file, parsed, res};
};

/** Kelime zamanları Descript altyazısından (SRT/VTT); saniyeler içinde biter. */
export const stageTiming = (dir: string, emit: Emit, force = false) => {
  emit({type: 'stage', stage: 'timing', status: 'start'});
  try {
    const r = buildTiming(dir, {force});
    emit({type: 'stage', stage: 'timing', status: r.status === 'güncel' ? 'skip' : 'done', detail: r.detail});
    return r;
  } catch (e: any) {
    emit({type: 'stage', stage: 'timing', status: 'error', detail: e.message});
    throw e;
  }
};

export const stageAssets = async (dir: string, parsed: ParsedScript, emit: Emit, force = false): Promise<AssetResult[]> => {
  emit({type: 'stage', stage: 'assets', status: 'start'});
  const results = await collectAssets(dir, parsed, {force});
  writeReviewPage(dir, path.basename(dir));
  const missing = results.filter((r) => r.status === 'eksik').length;
  const pending = photoStatus(dir, parsed).filter((p) => p.state === 'bekliyor').length;
  emit({type: 'stage', stage: 'assets', status: 'done', detail: `${results.length} varlık · ${missing} eksik · ${pending} fotoğraf seçim bekliyor`});
  return results;
};

export const stageAlign = (dir: string, emit: Emit): ScenesFile => {
  emit({type: 'stage', stage: 'align', status: 'start'});
  const p = paths(dir);
  const {file, parsed} = loadScript(dir);
  if (!fs.existsSync(p.transcript)) throw new Error('Zamanlama yok; önce zamanlama aşaması çalışmalı');
  const t: Transcript = JSON.parse(fs.readFileSync(p.transcript, 'utf8'));
  const base = findBaseMedia(dir);
  const probe = ffprobe(base.file);
  const scenes = buildScenes(dir, file, parsed, t, {...base, probe}, {...DEFAULT_ALIGN, includeSuggested: true});
  fs.writeFileSync(p.scenes, JSON.stringify(scenes, null, 1));
  fs.mkdirSync(p.out, {recursive: true});
  fs.writeFileSync(path.join(p.out, 'bolumler.txt'), scenes.chapters.map((ch) => `${fmtTime(ch.startSec)} ${ch.title}`).join('\n') + '\n');
  emit({type: 'stage', stage: 'align', status: 'done', detail: `${scenes.scenes.length} sahne · ${scenes.dropped.length} düşen`});
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
  const scenes = stageAlign(dir, emit);
  writeReport(dir, {lint, assets, scenes});
  return {lint, assets, scenes, photos: photoStatus(dir, lint.parsed)};
};

export type PhotoStatus = {
  file: string;
  line: number;
  caption?: string;
  query?: string;
  state: 'seçildi' | 'bekliyor' | 'aday-yok' | 'aranmadı' | 'elle';
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
    if (m.props.type !== 'photo' || seen.has(m.props.file)) continue;
    seen.add(m.props.file);
    const f = m.props.file;
    const set = m.props.search ? loadCandidateSet(dir, f) : null;
    const prov: Provenance | undefined = reg[f];
    const inAssets = fs.existsSync(path.join(paths(dir).assets, f));
    const selectedFiles = prov ? [f, ...(prov.extra ?? [])] : [];
    const selectedTitles = selectedFiles.map((x) => reg[x]?.title).filter(Boolean) as string[];
    const picks = set ? selectedTitles.map((t) => set.candidates.findIndex((c) => c.title === t) + 1).filter((n) => n > 0) : [];
    const state: PhotoStatus['state'] = prov ? 'seçildi' : inAssets ? 'elle' : !m.props.search ? 'elle' : !set ? 'aranmadı' : set.candidates.length ? 'bekliyor' : 'aday-yok';
    out.push({file: f, line: m.line, caption: m.props.caption, query: m.props.search, state: inAssets && !prov && !m.props.search ? 'elle' : state, selected: selectedTitles, picks, candidates: set?.candidates ?? []});
  }
  return out;
};

// ── Render ─────────────────────────────────────────────────────────────────

export type RenderOptions = {overlay?: boolean; includeSuggested?: boolean; frames?: string; signal?: AbortSignal};

/**
 * Render kendi süreç grubunda ve kendi geçici klasöründe çalışır (TMPDIR = build/.render-tmp-*).
 * Bitince, hata verince ya da iptal edilince: bütün süreç ağacı sonlandırılır, geçici klasör
 * (Remotion'un webpack paketi, Chrome profili, kare tamponları; tam videoda ~800 MB) silinir,
 * yarım kalan çıktı dosyası kaldırılır.
 */

export const stageRender = (dir: string, emit: Emit, opts: RenderOptions = {}): Promise<string> =>
  new Promise((resolve, reject) => {
    const p = paths(dir);
    if (!fs.existsSync(p.scenes)) return reject(new Error('build/scenes.json yok; önce hizalama çalışmalı'));
    emit({type: 'stage', stage: 'render', status: 'start'});
    fs.mkdirSync(p.out, {recursive: true});
    const out = path.join(p.out, opts.overlay ? 'gorsel-katmani.mov' : 'video.mp4');
    const propsFile = path.join(p.build, 'render-props.json');
    fs.writeFileSync(propsFile, JSON.stringify({scenesFile: 'build/scenes.json', includeSuggested: opts.includeSuggested ?? true, overlayOnly: Boolean(opts.overlay)}));
    const args = ['remotion', 'render', 'src/remotion/index.ts', 'Video', out, '--public-dir', dir, '--props', propsFile, '--log=info'];
    if (opts.overlay) args.push('--codec', 'prores', '--prores-profile', '4444', '--pixel-format', 'yuva444p10le', '--image-format', 'png');
    if (opts.frames) args.push('--frames', opts.frames);
    const tmp = path.join(p.build, `.render-tmp-${Date.now()}`);
    fs.mkdirSync(tmp, {recursive: true});
    const startedAt = Date.now();
    const child = spawnTracked(`render ${path.basename(dir)}`, 'npx', args, {cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, FORCE_COLOR: '0', TMPDIR: tmp + '/'}});
    let cancelled = false;
    const onAbort = () => {
      cancelled = true;
      emit({type: 'log', text: 'Render iptal ediliyor…'});
      if (child.pid) killTree(child.pid);
    };
    opts.signal?.addEventListener('abort', onAbort, {once: true});
    const cleanup = (ok: boolean) => {
      opts.signal?.removeEventListener('abort', onAbort);
      // Süreç ağacında artakalan (ör. Chrome yardımcıları) varsa onları da kapat.
      if (child.pid) killTree(child.pid, 1000);
      fs.rmSync(tmp, {recursive: true, force: true});
      if (!ok && fs.existsSync(out) && fs.statSync(out).mtimeMs >= startedAt) fs.rmSync(out, {force: true});
    };
    let buf = '';
    let bundled = false;
    const onChunk = (d: Buffer) => {
      buf += d.toString();
      const parts = buf.split(/[\r\n]/);
      buf = parts.pop() ?? '';
      for (const raw of parts) {
        const line = raw.replace(/\x1b\[[0-9;]*m/g, ''); // renk kodları günlükte görünmesin
        const r = line.match(/Rendered\s+(\d+)\/(\d+)/);
        const e = line.match(/Encoded\s+(\d+)\/(\d+)/);
        if (r) {
          bundled = true;
          // Render %90, kodlama %10 olarak paylaştırılır.
          emit({type: 'progress', stage: 'render', ratio: (Number(r[1]) / Number(r[2])) * 0.9, text: `kare ${r[1]} / ${r[2]}`});
        } else if (e) emit({type: 'progress', stage: 'render', ratio: 0.9 + (Number(e[1]) / Number(e[2])) * 0.1, text: `kodlama ${e[1]} / ${e[2]}`});
        else if (!bundled && /bundl|Bundling|compil/i.test(line)) emit({type: 'progress', stage: 'render', ratio: 0.02, text: 'paketleniyor'});
        else if (line.trim() && !/^\s*[-+]\s/.test(line) && !/^\s*$/.test(line)) emit({type: 'log', text: line.trim().slice(0, 300)});
      }
    };
    child.stdout!.on('data', onChunk);
    child.stderr!.on('data', onChunk);
    child.on('error', (e) => {
      cleanup(false);
      reject(e);
    });
    child.on('close', (code) => {
      if (cancelled || code !== 0 || !fs.existsSync(out)) {
        cleanup(false);
        emit({type: 'stage', stage: 'render', status: 'error', detail: cancelled ? 'iptal edildi' : `Remotion çıkış kodu ${code}`});
        return reject(new Error(cancelled ? 'Render iptal edildi' : `Render başarısız (çıkış kodu ${code})`));
      }
      cleanup(true);
      const mb = (fs.statSync(out).size / 1e6).toFixed(1);
      emit({type: 'stage', stage: 'render', status: 'done', detail: `${path.basename(out)} · ${mb} MB`});
      resolve(out);
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
