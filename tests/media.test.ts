import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {describe, it} from 'node:test';
import {tempProject} from './helpers';

// Depo modül yüklenirken okunur: kullanıcının .media/ klasörüne dokunmamak için geçici depo.
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'yte-media-'));
process.env.YTE_MEDIA = store;
const media = await import('../src/pipeline/media');

const video = crypto.randomBytes(6 * 1024 * 1024);

describe('ortak medya deposu', () => {
  it('aynı kurgu kaydı iki projede diskte bir kez durur; proje silinince depodan da kalkar', async () => {
    const a = tempProject();
    const b = tempProject();
    try {
      fs.writeFileSync(path.join(a.dir, 'footage/kurgu.mp4'), video);
      fs.writeFileSync(path.join(b.dir, 'footage/kurgu.mp4'), video);
      const [ra] = await media.ingestProject(a.dir);
      const [rb] = await media.ingestProject(b.dir);
      assert.equal(ra.state, 'yeni');
      assert.equal(rb.state, 'ortak');
      const sa = fs.statSync(path.join(a.dir, 'footage/kurgu.mp4'));
      const sb = fs.statSync(path.join(b.dir, 'footage/kurgu.mp4'));
      assert.equal(sa.ino, sb.ino, 'aynı dosya (hardlink)');
      assert.equal(sa.nlink, 3, 'iki proje + depo');
      assert.ok(Buffer.compare(fs.readFileSync(path.join(b.dir, 'footage/kurgu.mp4')), video) === 0, 'içerik bozulmadı');
      assert.equal((await media.ingestProject(a.dir))[0].state, 'zaten', 'ikinci kez özet alınmaz');
      assert.equal(media.diskUsage(a.dir).shared, video.length);

      a.cleanup();
      assert.equal(media.gcMedia().removed.length, 0, 'b hâlâ kullanıyor');
      b.cleanup();
      const gc = media.gcMedia();
      assert.equal(gc.removed.length, 1);
      assert.equal(gc.bytes, video.length);
    } finally {
      a.cleanup();
      b.cleanup();
    }
  });

  it('temizlik yalnızca yeniden üretilebilir dosyaları siler', () => {
    const p = tempProject({
      'script.final.md': 'x',
      'assets/secilen.jpg': 'jpg',
      'build/edits.json': '{}',
      'build/scenes.json': '{}',
      'build/fotolar/foto/aday-1.jpg': 'aday',
      'build/.render-tmp-1/parca.mp4': 'yarım',
      'out/video.mp4': 'son',
      'out/gorsel-katmani.mov': 'katman',
    });
    try {
      const r = media.runCleanup(p.dir);
      assert.deepEqual(r.items.map((i) => i.path).sort(), ['build/.render-tmp-1', 'build/fotolar', 'out/gorsel-katmani.mov']);
      for (const kept of ['script.final.md', 'assets/secilen.jpg', 'build/edits.json', 'build/scenes.json', 'out/video.mp4']) assert.ok(fs.existsSync(path.join(p.dir, kept)), kept);
    } finally {
      p.cleanup();
    }
  });
});

process.on('exit', () => fs.rmSync(store, {recursive: true, force: true}));
