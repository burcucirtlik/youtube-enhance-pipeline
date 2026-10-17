import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {loadEdits, migrateEdits, saveEdits} from '../src/pipeline/edits';
import {parseScript, sequentialId} from '../src/pipeline/parse-script';
import {miniScript, tempProject} from './helpers';

const body = `## A

Birinci cümle.
📍 [ANİM?: stat — "1", "bir"]
İkinci cümle.
📍 [FOTO: a.jpg, "A"]
📍 [FOTO: b.jpg, "B"]`;

const ids = (src: string) => parseScript(miniScript(src)).markers.map((m) => m.id);

describe('kalıcı işaret kimliği', () => {
  it('başka bir yere işaret eklemek kimlikleri değiştirmez', () => {
    const before = ids(body);
    const after = ids(body.replace('## A\n\n', '## A\n\nYeni giriş cümlesi.\n📍 [ANİM: concept — "yeni"]\n'));
    assert.deepEqual(after.slice(1), before);
  });

  it("önerinin ?'ini silmek ya da metnini düzeltmek kimliği değiştirmez", () => {
    const before = ids(body);
    assert.deepEqual(ids(body.replace('ANİM?: stat — "1", "bir"', 'ANİM: stat — "2", "iki"')), before);
  });

  it('aynı cümledeki aynı türden işaretler sıralarıyla ayrılır', () => {
    const [, a, b] = ids(body);
    assert.notEqual(a, b);
    assert.match(a, /^k[0-9a-f]{8}$/);
  });
});

describe('eski düzenlemelerin taşınması', () => {
  it('m001 biçimindeki anahtarları sıraya göre kalıcı kimliğe çevirir, yedek bırakır', () => {
    const p = tempProject();
    try {
      const markers = parseScript(miniScript(body)).markers;
      saveEdits(p.dir, {[sequentialId(1)]: {disabled: true}, [sequentialId(2) + '#2']: {startSec: 5}, m009: {disabled: true}});
      const r = migrateEdits(p.dir, markers.map((m) => m.id));
      assert.equal(r.migrated, 2);
      assert.deepEqual(r.dropped, ['m009']);
      assert.deepEqual(loadEdits(p.dir), {[markers[1].id]: {disabled: true}, [markers[2].id + '#2']: {startSec: 5}});
      assert.ok(fs.existsSync(path.join(p.dir, 'build/edits.m-ids.bak.json')));
      assert.equal(migrateEdits(p.dir, markers.map((m) => m.id)).migrated, 0, 'ikinci çalıştırmada bir şey yapmaz');
    } finally {
      p.cleanup();
    }
  });
});
