// Sunucu API'si (server/index.ts) için ince istemci.

import type {Freshness, PhotoStatus, RunEvent, StageName} from '../../src/pipeline/run';
import type {Scene, ScenesFile} from '../../src/shared/types';

export type Status = 'yeni' | 'işleniyor' | 'foto-seçimi' | 'hazır' | 'render' | 'bitti' | 'hata';

export type ProjectSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  status: Status;
  stage: StageName | null;
  error?: string;
  hasScript: boolean;
  hasVideo: boolean;
  hasSubtitles: boolean;
  hasOut: boolean;
  outUpdatedAt: string | null;
  durationSec: number | null;
  sceneCount: number;
  pendingPhotos: number;
  archived?: boolean;
  disk?: DiskUsage;
};

export type DiskUsage = {total: number; shared: number; reclaimable: number; byFolder: Record<string, number>};
export type CleanupItem = {path: string; bytes: number; why: string};

export type LintIssue = {line: number; level: 'hata' | 'uyarı' | 'bilgi'; msg: string};

export type ProjectDetail = ProjectSummary & {
  script: {file: string; title: string; format: string} | null;
  lint: {file: string; issues: LintIssue[]; stats: Record<string, string | number>} | null;
  scenes: ScenesFile | null;
  photos: PhotoStatus[];
  report: string | null;
  stages: {name: StageName; label: string}[];
  freshness: Record<StageName, {state: Freshness; at?: string; detail?: string}>;
  lastJob: {kind: string; startedAt: string; endedAt: string; error: string | null; log: string} | null;
  files: {video: string | null; base: string | null};
};

const j = async <T,>(res: Response): Promise<T> => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).error ?? `${res.status} ${res.statusText}`);
  return body as T;
};
/** Sunucu, değiştiren isteklerde bu başlığı ister (başka sitelerin isteklerini ayırmak için; bkz. server/index.ts). */
export const YTE_HEADER = {'X-YTE': '1'} as const;
const json = (method: string, body?: unknown): RequestInit => ({method, headers: {'Content-Type': 'application/json', ...YTE_HEADER}, body: body === undefined ? undefined : JSON.stringify(body)});

export const api = {
  projects: () => fetch('/api/projects').then(j<ProjectSummary[]>),
  project: (id: string) => fetch(`/api/projects/${id}`).then(j<ProjectDetail>),
  create: (form: FormData) => fetch('/api/projects', {method: 'POST', headers: YTE_HEADER, body: form}).then(j<ProjectDetail>),
  prepare: (id: string, force = false) => fetch(`/api/projects/${id}/prepare`, json('POST', {force})).then(j<ProjectSummary>),
  photos: (id: string, selections: Record<string, number[]>) => fetch(`/api/projects/${id}/photos`, json('POST', {selections})).then(j<ProjectDetail & {results: Record<string, string>}>),
  saveScenes: (id: string, scenes: Pick<Scene, 'markerId' | 'startSec' | 'endSec' | 'disabled'>[]) => fetch(`/api/projects/${id}/scenes`, json('PUT', {scenes})).then(j<{edits: number; scenes: ScenesFile}>),
  resetEdits: (id: string) => fetch(`/api/projects/${id}/edits`, json('DELETE')).then(j<{scenes: ScenesFile}>),
  lastLog: (id: string) => fetch(`/api/projects/${id}/logs/latest`).then(j<{name?: string; events: RunEvent[]}>),
  render: (id: string, opts: {overlay?: boolean; frames?: string; force?: boolean} = {}) => fetch(`/api/projects/${id}/render`, json('POST', opts)).then(j<ProjectSummary>),
  cleanupPlan: (id: string) => fetch(`/api/projects/${id}/cleanup`).then(j<{items: CleanupItem[]; disk: DiskUsage}>),
  cleanup: (id: string) => fetch(`/api/projects/${id}/cleanup`, json('POST')).then(j<{items: CleanupItem[]; bytes: number; disk: DiskUsage}>),
  archive: (id: string, archived: boolean) => fetch(`/api/projects/${id}/archive`, json('POST', {archived})).then(j<ProjectSummary & {freed: number}>),
  remove: (id: string) => fetch(`/api/projects/${id}`, json('DELETE')).then(j<{ok: true}>),
  cancel: (id: string) => fetch(`/api/projects/${id}/cancel`, json('POST')).then(j<{ok: true}>),
  uploadFiles: (id: string, form: FormData) => fetch(`/api/projects/${id}/files`, {method: 'POST', headers: YTE_HEADER, body: form}).then(j<ProjectDetail>),
  /** Çalışan işin olay akışı. Dönen fonksiyon aboneliği kapatır. */
  events: (id: string, onEvent: (e: RunEvent) => void, onEnd: (err: string | null) => void) => {
    const es = new EventSource(`/api/projects/${id}/events`);
    es.onmessage = (m) => onEvent(JSON.parse(m.data));
    es.addEventListener('end', (m) => {
      onEnd(JSON.parse((m as MessageEvent).data).error);
      es.close();
    });
    es.onerror = () => {
      es.close();
      onEnd(null);
    };
    return () => es.close();
  },
};

export const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};
export const fmtBytes = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toLocaleString('tr-TR', {maximumFractionDigits: 1})} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`;
export const fmtMs = (sec: number) => `${fmt(sec)}.${String(Math.floor((sec % 1) * 10))}`;

export const STATUS_LABEL: Record<Status, string> = {
  yeni: 'Yeni',
  işleniyor: 'İşleniyor',
  'foto-seçimi': 'Fotoğraf seçimi',
  hazır: 'Düzenlemeye hazır',
  render: 'Render alınıyor',
  bitti: 'Video hazır',
  hata: 'Hata',
};

/** Sahne türü etiketleri işaret sözlüğünden (src/shared/marker-schema.ts). */
export {TYPE_LABEL} from '../../src/shared/marker-schema';
