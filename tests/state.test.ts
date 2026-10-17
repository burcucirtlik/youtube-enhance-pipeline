import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {saveEdits} from '../src/pipeline/edits';
import {stageAlign, stageFreshness, stageLint, stageTiming, type RunEvent} from '../src/pipeline/run';
import {dirSig, hashOf, listJobLogs, loadState, readJobLog, saveJobLog} from '../src/pipeline/state';
import {miniScript, tempProject} from './helpers';

const SRT = `1
00:00:00,000 --> 00:00:02,000
Birinci cümle burada.

2
00:00:02,000 --> 00:00:04,000
İkinci cümle de burada.
`;

/** Dört saniyelik sessiz ses kaydı: findBaseMedia + ffprobe için gerçek bir dosya. */
const withProject = (fn: (dir: string) => void) => {
  const p = tempProject({
    'script.final.md': miniScript('## A\n\nBirinci cümle burada.\n📍 [ANİM: stat — "1"]\nİkinci cümle de burada.'),
    'footage/kurgu.srt': SRT,
  });
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '4', path.join(p.dir, 'footage/kurgu.wav')]);
  try {
    fn(p.dir);
  } finally {
    p.cleanup();
  }
};

const statuses = (run: (emit: (e: RunEvent) => void) => void) => {
  const ev: RunEvent[] = [];
  run((e) => ev.push(e));
  return ev.filter((e): e is Extract<RunEvent, {type: 'stage'}> => e.type === 'stage' && e.status !== 'start').map((e) => e.status);
};

describe('aşama özetleri', () => {
  it('özet sıralı ve kararlı; klasör imzası dosya değişince değişir', () => {
    assert.equal(hashOf('a', {b: 1}), hashOf('a', {b: 1}));
    assert.notEqual(hashOf('a', {b: 1}), hashOf('a', {b: 2}));
    const p = tempProject({'assets/x.jpg': '1'});
    try {
      const before = dirSig(path.join(p.dir, 'assets'));
      fs.writeFileSync(path.join(p.dir, 'assets/x.jpg'), '22');
      assert.notDeepEqual(dirSig(path.join(p.dir, 'assets')), before);
    } finally {
      p.cleanup();
    }
  });

  it('hizalama girdiler değişmedikçe atlanır; script, düzenleme ya da altyazı değişince yeniden çalışır', () =>
    withProject((dir) => {
      stageLint(dir, () => {});
      stageTiming(dir, () => {});
      assert.deepEqual(
        statuses((e) => stageAlign(dir, e)),
        ['done'],
      );
      assert.deepEqual(
        statuses((e) => stageAlign(dir, e)),
        ['skip'],
      );
      assert.equal(stageFreshness(dir).align.state, 'güncel');

      // Editör düzenlemesi
      const markerId = JSON.parse(fs.readFileSync(path.join(dir, 'build/scenes.json'), 'utf8')).scenes[0].markerId;
      saveEdits(dir, {[markerId]: {disabled: true}});
      assert.equal(stageFreshness(dir).align.state, 'değişti');
      assert.deepEqual(
        statuses((e) => stageAlign(dir, e)),
        ['done'],
      );

      // Script değişikliği
      fs.appendFileSync(path.join(dir, 'script.final.md'), '\n');
      assert.equal(stageFreshness(dir).lint.state, 'değişti');
      assert.deepEqual(
        statuses((e) => stageAlign(dir, e)),
        ['done'],
      );

      // Altyazı aynı içerikle yeniden yazılırsa zamanlama yenilenmez
      fs.writeFileSync(path.join(dir, 'footage/kurgu.srt'), SRT);
      assert.deepEqual(
        statuses((e) => stageTiming(dir, e)),
        ['skip'],
      );
      fs.writeFileSync(path.join(dir, 'footage/kurgu.srt'), SRT.replace('İkinci', 'Üçüncü'));
      assert.equal(stageFreshness(dir).timing.state, 'değişti');
      assert.deepEqual(
        statuses((e) => stageTiming(dir, e)),
        ['done'],
      );
      assert.deepEqual(
        statuses((e) => stageAlign(dir, e, {force: true})),
        ['done'],
      );
    }));
});

describe('iş günlükleri', () => {
  it('diske yazılır, son iş kaydedilir, en yeni 15 günlük kalır', () => {
    const p = tempProject();
    try {
      for (let i = 0; i < 17; i++) saveJobLog(p.dir, {kind: 'prepare', startedAt: `2026-10-17T10:00:${String(i).padStart(2, '0')}.000Z`, error: i === 16 ? 'bozuldu' : null, events: [{type: 'log', text: `iş ${i}`}]});
      const logs = listJobLogs(p.dir);
      assert.equal(logs.length, 15);
      const last = loadState(p.dir).lastJob!;
      assert.equal(last.error, 'bozuldu');
      assert.equal(last.log, logs[0]);
      assert.deepEqual(readJobLog(p.dir, last.log), [{type: 'log', text: 'iş 16'}]);
      assert.throws(() => readJobLog(p.dir, '../state.json'));
    } finally {
      p.cleanup();
    }
  });
});
