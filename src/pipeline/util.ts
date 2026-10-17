import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {SceneProps} from '../shared/types';

export const ROOT = path.resolve(import.meta.dirname, '../..');
// YTE_VIDEOS: projeler başka bir klasörden okunsun (testler ve deneme sunucusu kullanıcının projelerine dokunmasın).
export const VIDEOS = process.env.YTE_VIDEOS ? path.resolve(process.env.YTE_VIDEOS) : path.join(ROOT, 'videos');
export const SKILL = path.join(ROOT, '.claude/skills/youtube-script-writer/SKILL.md');
export const PY = path.join(ROOT, '.venv/bin/python');

// Apple Silicon'da Node Rosetta (x86_64) altında çalışıyorsa, alt süreçler de x86_64 açılır ve
// .venv'deki arm64 paketleri (pymupdf) yüklenemez. Python'u her zaman yerel mimaride çalıştır.
let armHost: boolean | null = null;
const isArmHost = () => {
  if (armHost === null) {
    try {
      armHost = process.platform === 'darwin' && execFileSync('sysctl', ['-n', 'hw.optional.arm64'], {encoding: 'utf8'}).trim() === '1';
    } catch {
      armHost = false;
    }
  }
  return armHost;
};
export const python = (args: string[]): [string, string[]] => (isArmHost() && process.arch !== 'arm64' ? ['/usr/bin/arch', ['-arm64', PY, ...args]] : [PY, args]);

/** "2026-10-kisa-baslik" ya da "videos/2026-10-kisa-baslik" → mutlak yol. */
export const resolveVideoDir = (arg: string | undefined): string => {
  if (!arg) throw new Error('Video klasörü ver: örn. videos/2026-10-kisa-baslik');
  const candidates = [path.resolve(arg), path.join(VIDEOS, arg)];
  const found = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isDirectory());
  if (!found) throw new Error(`Video klasörü bulunamadı: ${arg}`);
  return found;
};

export const paths = (dir: string) => ({
  dir,
  scriptMd: path.join(dir, 'script.md'),
  scriptFinal: path.join(dir, 'script.final.md'),
  footage: path.join(dir, 'footage'),
  assets: path.join(dir, 'assets'),
  build: path.join(dir, 'build'),
  buildAssets: path.join(dir, 'build/assets'),
  transcript: path.join(dir, 'build/transcript.json'),
  scenes: path.join(dir, 'build/scenes.json'),
  report: path.join(dir, 'build/rapor.md'),
  out: path.join(dir, 'out'),
});

/** Hizalamada script.final.md varsa o kullanılır (skill: Kurgu Sonrası Mod). */
export const pickScript = (dir: string): string => {
  const p = paths(dir);
  if (fs.existsSync(p.scriptFinal)) return p.scriptFinal;
  if (fs.existsSync(p.scriptMd)) return p.scriptMd;
  throw new Error(`${dir} içinde script.md yok`);
};

const VIDEO_EXT = ['.mp4', '.mov', '.m4v', '.mkv', '.webm'];
const AUDIO_EXT = ['.wav', '.mp3', '.m4a', '.aac', '.flac'];

/** footage/ içindeki kurgu kaydı: talking head için video, teknik eğitim için seslendirme. */
export const findBaseMedia = (dir: string): {file: string; kind: 'video' | 'audio'} => {
  const f = paths(dir).footage;
  const files = fs.existsSync(f) ? fs.readdirSync(f).filter((n) => !n.startsWith('.')).sort() : [];
  const pref = files.find((n) => /^kurgu\./i.test(n));
  const vid = pref && VIDEO_EXT.includes(path.extname(pref).toLowerCase()) ? pref : files.find((n) => VIDEO_EXT.includes(path.extname(n).toLowerCase()));
  if (vid) return {file: path.join(f, vid), kind: 'video'};
  const aud = files.find((n) => AUDIO_EXT.includes(path.extname(n).toLowerCase()));
  if (aud) return {file: path.join(f, aud), kind: 'audio'};
  throw new Error(`footage/ içinde kurgu kaydı yok (${f}). Descript'ten dışa aktardığın videoyu (ya da teknik eğitimde seslendirmeyi) buraya koy.`);
};

export type Probe = {durationSec: number; width: number; height: number; fps: number; hasVideo: boolean};

export const ffprobe = (file: string): Probe => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], {encoding: 'utf8'});
  const j = JSON.parse(out);
  const v = j.streams.find((s: any) => s.codec_type === 'video');
  const [num, den] = String(v?.avg_frame_rate ?? '30/1').split('/').map(Number);
  const fps = den ? num / den : 30;
  return {
    durationSec: Number(j.format.duration),
    width: v?.width ?? 1920,
    height: v?.height ?? 1080,
    fps: Number.isFinite(fps) && fps > 0 ? Math.round(fps * 1000) / 1000 : 30,
    hasVideo: Boolean(v),
  };
};

const h8 = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

/** Üretilen varlıklar için kararlı ad: işaret sırası değişse de aynı kalır. */
export const assetKey = (p: SceneProps): string | null => {
  switch (p.type) {
    case 'news':
      return `haber-${h8(p.url + '|' + (p.highlight ?? ''))}`;
    case 'document':
      return `belge-${h8(p.file + '|' + p.page + '|' + (p.highlight ?? ''))}`;
    default:
      return null;
  }
};

export const rel = (dir: string, abs: string) => path.relative(dir, abs).split(path.sep).join('/');

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
