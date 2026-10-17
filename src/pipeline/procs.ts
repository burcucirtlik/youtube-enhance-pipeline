// Alt süreç kaydı. Render gibi uzun işler kendi süreç grubunda başlatılır (detached) ki
// iş bittiğinde, iptal edildiğinde ya da uygulama kapanınca bütün ağaç (npx → remotion → chrome,
// ffmpeg, compositor) tek seferde sonlandırılabilsin; hiçbiri sahipsiz kalıp CPU/bellek yemesin.

import {spawn, type ChildProcess, type SpawnOptions} from 'node:child_process';

const live = new Map<number, {child: ChildProcess; label: string}>();

export const spawnTracked = (label: string, cmd: string, args: string[], opts: SpawnOptions = {}): ChildProcess => {
  const child = spawn(cmd, args, {...opts, detached: true});
  if (child.pid) {
    const pid = child.pid;
    live.set(pid, {child, label});
    child.on('exit', () => live.delete(pid));
  }
  return child;
};

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Bir sürecin bütün grubunu durdurur: önce SIGTERM, `graceMs` içinde kapanmazsa SIGKILL. */
export const killTree = (pid: number, graceMs = 3000): Promise<void> =>
  new Promise((resolve) => {
    const send = (sig: NodeJS.Signals) => {
      try {
        process.kill(-pid, sig); // negatif pid = süreç grubu
      } catch {
        try {
          process.kill(pid, sig);
        } catch {
          /* zaten kapanmış */
        }
      }
    };
    if (!alive(pid)) return resolve();
    send('SIGTERM');
    const start = Date.now();
    const t = setInterval(() => {
      if (!alive(pid)) {
        clearInterval(t);
        resolve();
      } else if (Date.now() - start > graceMs) {
        clearInterval(t);
        send('SIGKILL');
        resolve();
      }
    }, 100);
  });

export const killAll = async (graceMs = 3000) => {
  await Promise.all([...live.keys()].map((pid) => killTree(pid, graceMs)));
  live.clear();
};

export const liveProcesses = () => [...live.entries()].map(([pid, v]) => ({pid, label: v.label}));
