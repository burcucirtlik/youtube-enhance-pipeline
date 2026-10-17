import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {alignWords, sentenceTimes} from '../src/pipeline/align';
import {parseScript} from '../src/pipeline/parse-script';
import {normalizeWord} from '../src/pipeline/text';
import {parseSubtitles, transcriptFromCues} from '../src/pipeline/subtitles';
import {buildTiming, MISSING_SRT, timingUpToDate} from '../src/pipeline/timing';
import {fixture, miniScript, tempProject} from './helpers';

describe('altyazı (SRT/VTT)', () => {
  it('Descript SRT dosyasını okur (gerçek proje)', () => {
    const cues = parseSubtitles(fixture('hakaret', 'kurgu.srt'));
    assert.equal(cues.length, 323);
    assert.equal(cues[0].start, 0.099);
    assert.match(cues[0].text, /^Karşınızda RoboCop/);
  });

  it('VTT biçimini ve etiketleri okur', () => {
    const cues = parseSubtitles('WEBVTT\n\n00:01.000 --> 00:02.500\n<i>Merhaba</i> dünya\n');
    assert.deepEqual(cues, [{start: 1, end: 2.5, text: 'Merhaba dünya'}]);
  });

  it('kelimeler satır süresini aşmadan sırayla dağıtılır', () => {
    const t = transcriptFromCues([{start: 10, end: 12, text: 'bir iki üç'}]);
    assert.equal(t.words.length, 3);
    assert.equal(t.words[0].start, 10);
    assert.ok(Math.abs(t.words[2].end - 12) < 0.01);
    for (let i = 1; i < 3; i++) assert.ok(t.words[i].start >= t.words[i - 1].end - 1e-9);
  });
});

describe('zamanlama aşaması', () => {
  it('SRT yoksa ve eski transkript de yoksa açık hata verir', () => {
    const p = tempProject();
    try {
      assert.throws(() => buildTiming(p.dir), {message: MISSING_SRT});
    } finally {
      p.cleanup();
    }
  });

  it('SRT değişmedikçe yeniden üretmez', () => {
    const p = tempProject({'footage/kurgu.srt': '1\n00:00:00,000 --> 00:00:01,000\nmerhaba\n'});
    try {
      assert.equal(buildTiming(p.dir).status, 'altyazı');
      assert.ok(timingUpToDate(p.dir));
      assert.equal(buildTiming(p.dir).status, 'güncel');
      assert.ok(fs.existsSync(path.join(p.dir, 'build/transcript.json')));
    } finally {
      p.cleanup();
    }
  });
});

describe('hizalama', () => {
  it('gerçek projede 260 cümlenin hepsi altyazıyla eşleşir', () => {
    const s = parseScript(fixture('hakaret', 'script.final.md'));
    const t = transcriptFromCues(parseSubtitles(fixture('hakaret', 'kurgu.srt')));
    const times = sentenceTimes(s, t);
    assert.equal(times.filter((x) => !x).length, 0);
    // Zaman sırası korunur
    const starts = times.map((x) => x!.start);
    for (let i = 1; i < starts.length; i++) assert.ok(starts[i] >= starts[i - 1] - 0.5, `cümle ${i} geriye gitmiş`);
  });

  it('kurguda kesilen cümle bulunamaz, doğaçlama araya girse de diğerleri eşleşir', () => {
    const s = parseScript(miniScript('## A\n\nBirinci cümle burada. Kesilen bu cümle hiç söylenmedi. Üçüncü cümle de burada.'));
    const t = transcriptFromCues([
      {start: 0, end: 2, text: 'Birinci cümle burada.'},
      {start: 2, end: 4, text: 'Valla bunu ben ekledim.'},
      {start: 4, end: 6, text: 'Üçüncü cümle de burada.'},
    ]);
    const times = sentenceTimes(s, t);
    assert.ok(times[0] && times[2], 'söylenen cümleler eşleşti');
    assert.equal(times[1], null, 'kesilen cümle düştü');
  });

  it('Türkçe ek farklarını tolere eder', () => {
    const n = (a: string[]) => a.map(normalizeWord);
    const map = alignWords(n(['kavanozları', 'gördüm']), n(['kavanozlar', 'GÖRDÜM']));
    assert.deepEqual([...map], [0, 1]);
  });
});
