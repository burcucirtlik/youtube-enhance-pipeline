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

describe('sistem diyagramı', () => {
  it('aktörler, roller (ad ya da açık rol), çoğul, mesaj ve durum olayları', () => {
    const m = parseMarker('ANİM: sistem — "700 × Ajan" → "Platform": "saldırı" ; "Platform" → "Kayıtlar" (veritabanı): "sorgu" ; "Kayıtlar": sızdırır');
    assert.deepEqual(m.props, {
      type: 'system',
      actors: [
        {name: 'Ajan', role: 'agent', count: '700'},
        {name: 'Platform', role: 'browser', count: undefined},
        {name: 'Kayıtlar', role: 'database', count: undefined},
      ],
      events: [
        {kind: 'msg', from: 0, to: 1, label: 'saldırı'},
        {kind: 'msg', from: 1, to: 2, label: 'sorgu'},
        {kind: 'state', actor: 2, state: 'sızdırır'},
      ],
    });
    assert.deepEqual(m.issues, []);
  });

  it('rol adından: Türkçe ekler ve büyük harfli kısaltmalar', async () => {
    const {roleOf} = await import('../src/shared/system-diagram');
    assert.deepEqual(['Client', 'API', 'Sunucuya', 'Veritabanı', 'Claude', 'Hacker', 'Aile'].map(roleOf), ['person', 'server', 'server', 'database', 'agent', 'hacker', 'box']);
  });

  it('listede olmayan durum ve sınır aşımı uyarılır', () => {
    const m = parseMarker('ANİM: sistem — "A" → "B" ; "B" → "C" ; "C" → "D" ; "D": patlar');
    assert.ok(m.issues.some((i) => /bilinmeyen durum "patlar"/.test(i)));
    assert.ok(m.issues.some((i) => /4 aktör/.test(i)));
  });
});

describe('sohbet, grafik, liste, yakınlaşma, kaynak', () => {
  it('yazımlar', () => {
    assert.deepEqual(parseMarker('SOHBET: Claude, "Silebilir misin?" → "Hayır."').props, {type: 'chat', assistant: 'Claude', turns: ['Silebilir misin?', 'Hayır.']});
    assert.deepEqual(parseMarker('ANİM: grafik — "2022: 1,5", "2023: 1.200", birim: "milyar $", tür: çizgi').props, {
      type: 'chart',
      points: [
        {label: '2022', value: 1.5, display: '1,5'},
        {label: '2023', value: 1200, display: '1.200'},
      ],
      unit: 'milyar $',
      style: 'line',
    });
    const l = parseMarker('ANİM: liste — "Az yetki ver" @ "yetki", "Bol şüphe et"');
    assert.deepEqual(l.props, {type: 'list', items: [{text: 'Az yetki ver', at: 'yetki'}, {text: 'Bol şüphe et', at: undefined}]});
    assert.equal(l.at, undefined, 'madde @ işareti işaretin kendi @ seçeneği sanılmaz');
    const z = parseMarker('YAKIN: @ "yetmezdi"');
    assert.deepEqual([z.props, z.at], [{type: 'zoom'}, 'yetmezdi']);
    assert.deepEqual(parseMarker('KAYNAK: "Wired", "2 Mart 2026"').props, {type: 'source', name: 'Wired', date: '2 Mart 2026'});
  });

  it('liste maddeleri sonraki cümlelerde söylendikleri anda gelir', async () => {
    const {buildScenes} = await import('../src/pipeline/align');
    const {tempProject} = await import('./helpers');
    const p = tempProject();
    try {
      const s = parseScript(miniScript('## A\n\nÜç şey yapın.\n📍 [ANİM: liste — "Az yetki" @ "yetki", "Bol şüphe" @ "şüphe"]\nBirincisi az yetki verin. İkincisi bol şüphe edin.'));
      const t = transcriptFromCues([
        {start: 0, end: 2, text: 'Üç şey yapın.'},
        {start: 2, end: 5, text: 'Birincisi az yetki verin.'},
        {start: 5, end: 8, text: 'İkincisi bol şüphe edin.'},
      ]);
      const f = buildScenes(p.dir, p.dir + '/script.final.md', s, t, {file: p.dir + '/x.mp4', kind: 'video', probe: {durationSec: 30, width: 1280, height: 720, fps: 30, hasVideo: true}});
      const list = f.scenes.find((x) => x.props.type === 'list')!;
      const items = (list.props as any).items;
      const abs = items.map((it: any) => list.startSec + it.offsetSec);
      assert.ok(abs[0] > 3 && abs[0] < 4.5, `1. madde ${abs[0]}`);
      assert.ok(abs[1] > 6 && abs[1] < 7.5, `2. madde ${abs[1]}`);
      assert.ok(list.endSec >= abs[1] + 2.9, 'son maddeden 3 sn sonra biter');
    } finally {
      p.cleanup();
    }
  });

  it('yakınlaşma', async () => {
    const {zoomAt, ZOOM_SCALE} = await import('../src/shared/timeline');
    const sc = (id: string, a: number, b: number, props: Scene['props'], danger = false): Scene => ({id, markerId: id, line: 1, kind: 'ANİM', suggested: false, danger, startSec: a, endSec: b, anchorText: '', props});
    const f: ScenesFile = {
      version: 1,
      generatedAt: '',
      title: '',
      format: 'talking-head',
      scriptFile: '',
      base: {kind: 'video', src: '', durationSec: 60, width: 1280, height: 720, fps: 30},
      chapters: [{title: 'a', startSec: 0}, {title: 'b', startSec: 30}],
      scenes: [sc('z', 2, 4, {type: 'zoom'}), sc('s', 10, 13, {type: 'stat', value: '1'}, true), sc('t', 13.05, 16, {type: 'stat', value: '2'})],
      dropped: [],
      warnings: [],
    };
    assert.equal(zoomAt(f, 30), 1);
    assert.ok(Math.abs(zoomAt(f, 90) - ZOOM_SCALE) < 1e-9, 'ortada tam yakın');
  });
});
