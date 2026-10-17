import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {spawnTracked, killTree} from '../src/pipeline/procs';
import {creditLine, withCredit} from '../src/pipeline/commons';
import {applyEdits, editsFromScenes} from '../src/pipeline/edits';
import type {Scene, ScenesFile} from '../src/shared/types';

const scene = (markerId: string, startSec: number, endSec: number): Scene => ({
  id: markerId,
  markerId,
  line: 1,
  kind: 'ANİM',
  suggested: false,
  danger: false,
  startSec,
  endSec,
  anchorText: '',
  props: {type: 'stat', value: '1'},
});
const file = (scenes: Scene[]): ScenesFile => ({
  version: 1,
  generatedAt: '',
  title: '',
  format: 'talking-head',
  scriptFile: '',
  base: {kind: 'video', src: '', durationSec: 100, width: 1280, height: 720, fps: 30},
  chapters: [],
  scenes,
  dropped: [],
  warnings: [],
});

describe('editör düzenlemeleri', () => {
  it('yalnızca farkları kaydeder ve geri uygular', () => {
    const aligned = file([scene('a', 10, 12), scene('b', 20, 22)]);
    const edited = [scene('a', 15, 17), {...scene('b', 20, 22), disabled: true}];
    const edits = editsFromScenes(aligned, edited);
    assert.deepEqual(edits, {a: {startSec: 15, endSec: 17}, b: {disabled: true}});
    const back = applyEdits(aligned, edits).scenes;
    assert.equal(back[0].startSec, 15);
    assert.equal(back[1].disabled, true);
  });

  it('düzenleme video süresini aşmaz', () => {
    const r = applyEdits(file([scene('a', 10, 12)]), {a: {startSec: 99, endSec: 140}});
    assert.equal(r.scenes[0].endSec, 100);
  });
});

describe('fotoğraf atfı', () => {
  it('yazar alanındaki "Photographer:" ön ekini temizler', () => {
    assert.equal(creditLine({artist: 'Photographer: Mosbatho', license: 'CC BY 4.0'}), 'Foto: Mosbatho (CC BY 4.0)');
  });
  it('altyazıda atıf yoksa ekler, "bulunacak" yer tutucusunu değiştirir', () => {
    assert.equal(withCredit('Olay, 1990', {artist: 'X', license: 'CC0'}), 'Olay, 1990 · Foto: X (CC0)');
    assert.equal(withCredit('Olay · Foto: bulunacak', {artist: 'X', license: 'CC0'}), 'Olay · Foto: X (CC0)');
    assert.equal(withCredit('Olay · Foto: Y (CC BY)', {artist: 'X', license: 'CC0'}), 'Olay · Foto: Y (CC BY)');
  });
});

describe('alt süreç temizliği', () => {
  it('süreç grubunu torunlarıyla birlikte kapatır', async () => {
    // Bir kabuk, arka planda uzun süren bir torun başlatır.
    const child = spawnTracked('test', 'bash', ['-c', 'sleep 30 & echo $!; wait'], {stdio: ['ignore', 'pipe', 'ignore']});
    const grandchild = await new Promise<number>((r) => child.stdout!.once('data', (d) => r(Number(String(d).trim()))));
    await killTree(child.pid!, 1000);
    const alive = (pid: number) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(alive(child.pid!), false, 'kabuk kapandı');
    assert.equal(alive(grandchild), false, 'torun da kapandı');
  });
});
