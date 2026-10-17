// Electron kabuğu: yerel pipeline sunucusunu başlatır, hazır olunca pencerede açar.
const {app, BrowserWindow, shell} = require('electron');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3030);
const URL = `http://localhost:${PORT}`;
let server = null;

const isUp = () =>
  new Promise((resolve) => {
    const req = http.get(`${URL}/api/health`, (res) => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });

const startServer = async () => {
  if (await isUp()) return; // dışarıdan (npm run server) zaten çalışıyor
  // Sunucu projenin kendi Node'uyla (.runtime/node, arm64) çalışır; yoksa sistemdekiyle. Electron'un Node'u değil.
  // PATH'in başına da o konur ki render (npx remotion) gibi alt süreçler aynı mimaride çalışsın.
  // Kendi süreç grubunda başlar ki kapanışta tsx + node + (sunucunun bıraktığı her şey) tek seferde sonlandırılabilsin.
  // YTE_PARENT_PID: Electron çökerse sunucu bunu fark edip kendini kapatır.
  const runtimeBin = path.join(ROOT, '.runtime/node/bin');
  const hasRuntime = fs.existsSync(path.join(runtimeBin, 'node'));
  const PATH = [hasRuntime && runtimeBin, process.env.PATH, '/usr/local/bin', '/opt/homebrew/bin'].filter(Boolean).join(':');
  const env = {...process.env, PORT: String(PORT), YTE_PARENT_PID: String(process.pid), PATH};
  const [cmd, args] = hasRuntime
    ? [path.join(runtimeBin, 'node'), [path.join(ROOT, 'node_modules/tsx/dist/cli.mjs'), 'server/index.ts']]
    : [path.join(ROOT, 'node_modules/.bin/tsx'), ['server/index.ts']];
  server = spawn(cmd, args, {cwd: ROOT, env, stdio: 'inherit', detached: true});
  server.on('exit', (code) => {
    server = null;
    if (code && code !== 0) console.error(`Sunucu çıktı (kod ${code})`);
  });
  for (let i = 0; i < 60; i++) {
    if (await isUp()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Sunucu 30 saniyede başlamadı');
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    title: 'YouTube Enhance',
    backgroundColor: '#07090c',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {contextIsolation: true},
  });
  win.loadURL(URL);
  // Commons sayfaları gibi dış linkler sistem tarayıcısında açılır.
  win.webContents.setWindowOpenHandler(({url}) => {
    if (!url.startsWith(URL)) {
      shell.openExternal(url);
      return {action: 'deny'};
    }
    return {action: 'allow'};
  });
};

app.setName('YouTube Enhance');

app.whenReady().then(async () => {
  // Dock'ta Electron'un değil kanalın ikonu görünsün.
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(path.join(__dirname, 'icon.png'));
  try {
    await startServer();
  } catch (e) {
    console.error(e);
  }
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => app.quit());

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Kapanış: sunucuya SIGTERM (o, çalışan render ve diğer alt süreçleri sonlandırıp geçici dosyaları siler),
 * 6 sn içinde kapanmazsa bütün grubu SIGKILL. Sunucuyu biz başlatmadıysak (npm run server) dokunmayız.
 */
let quitting = false;
app.on('before-quit', (e) => {
  if (quitting || !server?.pid) return;
  e.preventDefault();
  quitting = true;
  const pid = server.pid;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    /* zaten kapalı */
  }
  const start = Date.now();
  const t = setInterval(() => {
    if (!alive(pid) || Date.now() - start > 6000) {
      clearInterval(t);
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        /* kapandı */
      }
      app.exit(0);
    }
  }, 100);
});
