import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {alignScript, anchorTime} from '../src/pipeline/align';
import {lintScript} from '../src/pipeline/lint';
import {parseMarker} from '../src/pipeline/markers';
import {parseScript} from '../src/pipeline/parse-script';
import {transcriptFromCues} from '../src/pipeline/subtitles';
import {timedVisualChecks} from '../src/pipeline/visual-checks';
import {sceneSequences} from '../src/shared/timeline';
import type {Scene, ScenesFile} from '../src/shared/types';
import {miniScript} from './helpers';

describe('yeni işaret türleri ve seçenekler', () => {
  it('alt bant, vurgu, harita, arşiv videosu', () => {
    assert.deepEqual(parseMarker('ALT: "Leopold Aschenbrenner", "yatırımcı"').props, {type: 'lower', name: 'Leopold Aschenbrenner', title: 'yatırımcı'});
    assert.deepEqual(parseMarker('VURGU: "zeki ama akıllı değil"').props, {type: 'emphasis', text: 'zeki ama akıllı değil'});
    assert.deepEqual(parseMarker('ANİM: map — "Kigali, Ruanda", "1994"').props, {type: 'map', place: 'Kigali, Ruanda', caption: '1994', lat: undefined, lon: undefined});
    assert.deepEqual(parseMarker('ANİM: map — "Berlin", konum: 52.52, 13.40').props, {type: 'map', place: 'Berlin', caption: undefined, lat: 52.52, lon: 13.4});
    assert.deepEqual(parseMarker('KLİP: duvar.mp4, "Berlin Duvarı, 1989", ara: "Berlin Wall 1989"').props, {type: 'clip', file: 'duvar.mp4', caption: 'Berlin Duvarı, 1989', search: 'Berlin Wall 1989'});
  });

  it('@ kelime, yerleşim ve ton herhangi bir sırayla', () => {
    const m = parseMarker('FOTO: leo.jpg, "Leo", ton: tehlike, @ "Leo", yerleşim: yan');
    assert.equal(m.at, 'Leo');
    assert.equal(m.layout, 'yan');
    assert.equal(m.danger, true);
    assert.deepEqual(m.props, {type: 'photo', file: 'leo.jpg', caption: 'Leo', search: undefined});
    // POST'taki @kullanici bir seçenek sanılmaz.
    assert.equal(parseMarker('POST: X, @sama, "merhaba"').at, undefined);
  });
});

describe('kelimeye bağlama (@)', () => {
  it('görsel cümle başında değil, kelimenin söylendiği anda', () => {
    const s = parseScript(miniScript('## A\n\nİki yılda paranın değeri tam 13 milyar dolara çıktı.\n📍 [ANİM: stat — "13 milyar $", @ "13 milyar"]'));
    const t = transcriptFromCues([{start: 10, end: 14, text: 'İki yılda paranın değeri tam 13 milyar dolara çıktı.'}]);
    const {times, wordTime} = alignScript(s, t);
    const at = anchorTime(s, 0, '13 milyar', wordTime)!;
    assert.ok(times[0]!.start === 10 && at > 11.5 && at < 13, `kelime ${at} sn'de`);
    assert.equal(anchorTime(s, 0, 'olmayan kelime', wordTime), null);
  });
});

describe('izlenebilirlik denetimleri', () => {
  it('lint: ekranda okunmayacak metin, aynı tür art arda, söylenenle uyuşmayan rakam', () => {
    const r = lintScript(
      parseScript(
        miniScript(`## A

Birinci cümle. Hadi gelin başlayalım.
Gelirleri 12 milyar dolar oldu.
📍 [ANİM: stat — "13 milyar $"]
Sonra şöyle oldu.
📍 [ANİM: flow — "a" → "b" → "c" → "d" → "e"]
Bir daha.
📍 [ANİM: flow — "a" → "b"]
Bir kez daha.
📍 [ANİM: flow — "a" → "çok uzun bir adım metni burada"]`),
      ),
    );
    const msgs = r.issues.map((i) => i.msg).join('\n');
    assert.match(msgs, /rakam \(13 milyar \$\) cümlede söylenen rakamla eşleşmiyor/);
    assert.match(msgs, /akış 5 adım/);
    assert.match(msgs, /akış adımı "çok uzun bir adım metni burada"/);
    assert.match(msgs, /Art arda 3 "flow"/);
  });

  it('alt bant ve vurgu tam ekran sayılmaz', () => {
    const r = lintScript(parseScript(miniScript('## A\n\nBir. Hadi gelin başlayalım.\nİki.\n📍 [ALT: "Ada", "unvan"]\n📍 [VURGU: "bir"]\n📍 [ANİM: stat — "1"]')));
    assert.ok(!r.issues.some((i) => /Art arda \d+ tam ekran/.test(i.msg)), 'art arda tam ekran sayılmadı');
    // Ama alt bant tam ekranla aynı cümlede görünmez: uyarılır.
    assert.ok(r.issues.some((i) => /Alt bant, tam ekran görselle/.test(i.msg)));
  });

  const sc = (id: string, startSec: number, endSec: number, props: Scene['props']): Scene => ({id, markerId: id, line: 1, kind: 'ANİM', suggested: false, danger: false, startSec, endSec, anchorText: '', props});
  const file = (scenes: Scene[], chapters = [{title: 'a', startSec: 0}, {title: 'b', startSec: 50}, {title: 'c', startSec: 195}]): ScenesFile => ({
    version: 1,
    generatedAt: '',
    title: '',
    format: 'talking-head',
    scriptFile: '',
    base: {kind: 'video', src: '', durationSec: 200, width: 1280, height: 720, fps: 30},
    chapters,
    scenes,
    dropped: [],
    warnings: [],
  });

  it('hizalama sonrası: okuma hızı, uzun boşluk, ilk 90 sn, son 20 sn, bölümler', () => {
    const w = timedVisualChecks(
      file([sc('a', 10, 12, {type: 'quote', text: 'bir iki üç dört beş altı yedi sekiz dokuz on', author: 'X'}), sc('b', 100, 104, {type: 'stat', value: '1'}), sc('c', 185, 190, {type: 'stat', value: '2'})]),
    ).join('\n');
    assert.match(w, /11 kelime 2\.0 sn ekranda; okunamaz/);
    assert.match(w, /0:12–1:40 arası 88 sn görselsiz/);
    assert.match(w, /İlk 90 saniyede 1 görsel/);
    assert.match(w, /son 20 sn'de görsel var/);
    assert.match(w, /"c" bölümü 5 sn/);
  });

  it('çapraz geçiş yalnızca iki tam ekran arasında', () => {
    const f = file([sc('a', 1, 3, {type: 'stat', value: '1'}), sc('b', 3.05, 5, {type: 'lower', name: 'Ada'}), sc('c', 5.05, 7, {type: 'stat', value: '2'})]);
    const s = sceneSequences(f, {includeSuggested: true, crossfadeFrames: 12});
    assert.deepEqual(
      s.map((x) => [x.joinedPrev, x.joinedNext]),
      [
        [false, false],
        [false, false],
        [false, false],
      ],
    );
  });
});
