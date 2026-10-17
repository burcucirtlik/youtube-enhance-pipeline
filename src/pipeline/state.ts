// Aşama durumu: her aşamanın en son hangi girdilerle (özet = hash) çalıştığı ve iş günlükleri.
// build/state.json yeniden üretilebilir bir önbellektir (git'e girmez); silinirse aşamalar bir kez daha çalışır.
//
// Bir aşamanın girdileri değişmediyse ve çıktısı yerindeyse o aşama atlanır. Özetler içerik ya da
// (ad, boyut, değişme zamanı) imzasıyla alınır; büyük dosyalar (kurgu videosu) okunmaz.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {paths, ROOT} from './util';

export type StageKey = 'lint' | 'timing' | 'assets' | 'align' | 'render' | 'render-overlay';
export type StageRecord = {hash: string; at: string; detail?: string; ok?: boolean};
export type JobRecord = {kind: string; startedAt: string; endedAt: string; error: string | null; log: string};
export type ProjectState = {version: 1; stages: Partial<Record<StageKey, StageRecord>>; lastJob?: JobRecord};

const stateFile = (dir: string) => path.join(paths(dir).build, 'state.json');
export const logsDir = (dir: string) => path.join(paths(dir).build, 'logs');

export const loadState = (dir: string): ProjectState => {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(dir), 'utf8'));
    if (s?.version === 1) return s;
  } catch {
    /* yok ya da bozuk: baştan */
  }
  return {version: 1, stages: {}};
};

export const updateState = (dir: string, fn: (s: ProjectState) => void): ProjectState => {
  const s = loadState(dir);
  fn(s);
  fs.mkdirSync(paths(dir).build, {recursive: true});
  const f = stateFile(dir);
  fs.writeFileSync(f + '.tmp', JSON.stringify(s, null, 1));
  fs.renameSync(f + '.tmp', f);
  return s;
};

export const recordStage = (dir: string, stage: StageKey, rec: Omit<StageRecord, 'at'>) =>
  updateState(dir, (s) => {
    s.stages[stage] = {...rec, at: new Date().toISOString()};
  });

export const forgetStage = (dir: string, ...stages: StageKey[]) =>
  updateState(dir, (s) => {
    for (const st of stages) delete s.stages[st];
  });

/** Kaydedilen özet şimdikiyle aynı mı (ve aşama başarıyla bitmiş mi). */
export const isFresh = (dir: string, stage: StageKey, hash: string): boolean => {
  const r = loadState(dir).stages[stage];
  return Boolean(r && r.ok !== false && r.hash === hash);
};

// ── Özetler ────────────────────────────────────────────────────────────────

export const hashOf = (...parts: unknown[]): string => {
  const h = crypto.createHash('sha1');
  for (const p of parts) h.update(typeof p === 'string' ? p : JSON.stringify(p ?? null)).update('\0');
  return h.digest('hex').slice(0, 16);
};

export const fileHash = (file: string): string | null => {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
};

/** Dosyayı okumadan imza: büyük medya için. */
export const fileSig = (file: string): string | null => {
  try {
    const st = fs.statSync(file);
    return `${path.basename(file)}:${st.size}:${Math.round(st.mtimeMs)}`;
  } catch {
    return null;
  }
};

/** Klasördeki dosyaların (alt klasörler dahil) imza listesi; gizli dosyalar ve hariç tutulanlar dışarıda. */
export const dirSig = (dir: string, opts: {skip?: (rel: string) => boolean} = {}): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    let names: string[];
    try {
      names = fs.readdirSync(d).sort();
    } catch {
      return;
    }
    for (const n of names) {
      if (n.startsWith('.')) continue;
      const f = path.join(d, n);
      const rel = path.relative(dir, f);
      if (opts.skip?.(rel)) continue;
      const st = fs.statSync(f);
      if (st.isDirectory()) walk(f);
      else out.push(`${rel}:${st.size}:${Math.round(st.mtimeMs)}`);
    }
  };
  walk(dir);
  return out;
};

/** Kod sürümü: bu klasörlerdeki kaynakların içerik özeti (süreç boyunca bir kez hesaplanır, dosya değişince yenilenir). */
const codeCache = new Map<string, {sig: string; hash: string}>();
export const codeHash = (...rels: string[]): string => {
  const key = rels.join('|');
  const files = rels.flatMap((r) => {
    const abs = path.join(ROOT, r);
    return fs.statSync(abs).isDirectory() ? dirSig(abs).map((x) => path.join(r, x.split(':')[0])) : [r];
  });
  const sig = files.map((f) => fileSig(path.join(ROOT, f))).join('|');
  const hit = codeCache.get(key);
  if (hit?.sig === sig) return hit.hash;
  const hash = hashOf(...files.map((f) => [f, fileHash(path.join(ROOT, f))]));
  codeCache.set(key, {sig, hash});
  return hash;
};

// ── İş günlükleri ──────────────────────────────────────────────────────────

const KEEP_LOGS = 15;

/** Bir işin olaylarını build/logs/<zaman>-<tür>.jsonl'a yazar; en yeni 15 günlük kalır. */
export const saveJobLog = (dir: string, job: {kind: string; startedAt: string; error: string | null; events: unknown[]}): JobRecord => {
  const d = logsDir(dir);
  fs.mkdirSync(d, {recursive: true});
  const name = `${job.startedAt.replace(/[:.]/g, '-')}-${job.kind}.jsonl`;
  fs.writeFileSync(path.join(d, name), job.events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  const all = fs.readdirSync(d).filter((n) => n.endsWith('.jsonl')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP_LOGS))) fs.rmSync(path.join(d, old), {force: true});
  const rec: JobRecord = {kind: job.kind, startedAt: job.startedAt, endedAt: new Date().toISOString(), error: job.error, log: name};
  updateState(dir, (s) => {
    s.lastJob = rec;
  });
  return rec;
};

export const listJobLogs = (dir: string): string[] => {
  try {
    return fs.readdirSync(logsDir(dir)).filter((n) => n.endsWith('.jsonl')).sort().reverse();
  } catch {
    return [];
  }
};

export const readJobLog = <T = unknown,>(dir: string, name: string): T[] => {
  if (!/^[\w-]+\.jsonl$/.test(name)) throw new Error('Geçersiz günlük adı');
  const f = path.join(logsDir(dir), name);
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
};
