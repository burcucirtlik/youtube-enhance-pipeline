// Güvenlik denetimleri (2026-10-18): dışarıdan gelen adlar ve linkler, sunucunun yerel koruması.

import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {describe, it, after, before} from 'node:test';
import {selectCandidates} from '../src/pipeline/commons';
import {isPublicHttpUrl, isSafeAssetName, ROOT} from '../src/pipeline/util';
import {tempProject} from './helpers';

describe('güvenlik: adlar ve linkler', () => {
  it('varlık adı düz bir dosya adı olmalı', () => {
    for (const ok of ['leo.jpg', 'anonymous-maske-2.jpg', 'klip_01.mp4', 'rapor.pdf', 'A.PNG']) assert.ok(isSafeAssetName(ok), ok);
    for (const bad of ['../x.jpg', '..', 'a/b.jpg', '/etc/passwd', '.gizli.jpg', 'x.sh', 'x.jpg\n', '', 42, 'a..b.jpg', 'C:\\x.jpg']) assert.ok(!isSafeAssetName(bad as any), String(bad));
  });

  it('fotoğraf seçimi klasör dışına çıkan adı reddeder', () => {
    const {dir, cleanup} = tempProject();
    try {
      assert.throws(() => selectCandidates(dir, '../../etc/x.jpg', [1]), /Geçersiz dosya adı/);
      assert.throws(() => selectCandidates(dir, 'yok.jpg', [1]), /aday yok/);
    } finally {
      cleanup();
    }
  });

  it('HABER linki yalnızca herkese açık http(s)', () => {
    for (const ok of ['https://www.theregister.com/x', 'http://example.com/a?b=c', 'https://8.8.8.8/']) assert.ok(isPublicHttpUrl(ok), ok);
    for (const bad of [
      'file:///Users/zena/.ssh/id_rsa',
      'file:///etc/hosts',
      'data:text/html,<h1>x</h1>',
      'javascript:alert(1)',
      'http://localhost:3030/api/projects',
      'http://127.0.0.1/',
      'http://127.1.2.3/',
      'http://0.0.0.0/',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.16.0.1/',
      'http://169.254.169.254/',
      'http://[::1]:3030/',
      'http://router.local/',
      'http://2130706433/',
      'http://0x7f000001/',
      'http://user:pw@example.com/',
      'not a url',
      undefined,
    ])
      assert.ok(!isPublicHttpUrl(bad), String(bad));
  });
});

/** Deneme sunucusu: boş bir videos klasörüyle ayrı bir portta; testler kullanıcının projelerine dokunmaz. */
describe('güvenlik: yerel API koruması', () => {
  const PORT = 3047;
  const base = `http://127.0.0.1:${PORT}`;
  let child: ReturnType<typeof spawn>;
  let tmp: string;
  before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yte-sec-'));
    child = spawn(process.execPath, [path.join(ROOT, 'node_modules/tsx/dist/cli.mjs'), 'server/index.ts'], {
      cwd: ROOT,
      env: {...process.env, PORT: String(PORT), YTE_VIDEOS: path.join(tmp, 'videos'), YTE_MEDIA: path.join(tmp, 'media')},
      stdio: 'ignore',
      detached: true,
    });
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(`${base}/api/health`)).ok) return;
      } catch {
        /* henüz değil */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('deneme sunucusu başlamadı');
  });
  after(async () => {
    try {
      process.kill(-child.pid!, 'SIGTERM');
    } catch {
      /* kapandı */
    }
    await new Promise((r) => setTimeout(r, 500));
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('kendi istekleri geçer, koruma başlıkları döner', async () => {
    const r = await fetch(`${base}/api/projects`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
  });

  /** fetch Host başlığını değiştirmeye izin vermez; ham HTTP isteği (DNS rebinding senaryosu). */
  const rawStatus = (headers: Record<string, string>) =>
    new Promise<number>((resolve, reject) => {
      http.get({host: '127.0.0.1', port: PORT, path: '/api/projects/x', headers}, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      }).on('error', reject);
    });

  it('başka siteden gelen istekler reddedilir', async () => {
    assert.equal(await rawStatus({Host: 'evil.example:3047'}), 403, 'yabancı Host (DNS rebinding)');
    assert.equal(await rawStatus({Host: `127.0.0.1:${PORT}`}), 404, 'doğru Host');
    const cases: [string, RequestInit][] = [
      ['yabancı Origin', {headers: {Origin: 'https://evil.example'}}],
      ['cross-site no-cors yükleme', {headers: {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'video'}}],
      ['başlıksız POST', {method: 'POST'}],
      ['başlıksız DELETE', {method: 'DELETE'}],
    ];
    for (const [name, init] of cases) {
      const r = await fetch(`${base}/api/projects/x`, init);
      assert.equal(r.status, 403, name);
    }
    const ok = await fetch(`${base}/api/projects`, {headers: {'Sec-Fetch-Site': 'same-origin'}});
    assert.equal(ok.status, 200);
  });

  it('yükleme: yanlış uzantılı kurgu kaydı ve script reddedilir, proje oluşmaz', async () => {
    const form = new FormData();
    form.set('script', new Blob(['# T\n**Video formatı:** talking-head\n\n---\n\nMerhaba.\n'], {type: 'text/markdown'}), 'script.final.md');
    form.set('video', new Blob(['x'], {type: 'application/octet-stream'}), 'kurgu.sh');
    form.set('subtitles', new Blob(['1\n00:00:00,000 --> 00:00:01,000\nMerhaba.\n']), 'kurgu.srt');
    const r = await fetch(`${base}/api/projects`, {method: 'POST', headers: {'X-YTE': '1'}, body: form});
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /video ya da ses/);
    const form2 = new FormData();
    form2.set('script', new Blob(['x']), 'script.exe');
    const r2 = await fetch(`${base}/api/projects`, {method: 'POST', headers: {'X-YTE': '1'}, body: form2});
    assert.equal(r2.status, 400);
    assert.deepEqual(fs.readdirSync(path.join(tmp, 'videos')), []);
    assert.deepEqual(fs.readdirSync(path.join(ROOT, '.uploads')), []);
  });

  it('fotoğraf seçimi: klasör dışına çıkan ad reddedilir', async () => {
    fs.mkdirSync(path.join(tmp, 'videos/p1/build'), {recursive: true});
    const r = await fetch(`${base}/api/projects/p1/photos`, {method: 'POST', headers: {'X-YTE': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({selections: {'../../x.jpg': [1]}})});
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /Geçersiz dosya adı/);
  });
});
