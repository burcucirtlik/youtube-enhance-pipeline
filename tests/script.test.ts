import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {lintScript} from '../src/pipeline/lint';
import {parseScript} from '../src/pipeline/parse-script';
import {fixture, miniScript} from './helpers';

describe('script okuyucu', () => {
  it('başlık bloğunu, bölümleri ve işaretleri okur (gerçek proje)', () => {
    const s = parseScript(fixture('hakaret', 'script.final.md'));
    assert.equal(s.header.title, 'Yapay Zekaya Hakaret');
    assert.equal(s.header.format, 'talking-head');
    assert.equal(s.header.stage, 'kurgu-sonrası');
    assert.equal(s.sections.length, 10);
    assert.equal(s.sentences.length, 260);
    assert.equal(s.markers.length, 48);
    assert.ok(s.markers.every((m) => m.sentenceIndex >= 0), 'her işaret bir cümleye bağlı');
    assert.ok(s.trailing['Kaynaklar']?.length, 'Kaynaklar tablosu okundu');
  });

  it('işaret üstündeki cümleye bağlanır', () => {
    const s = parseScript(miniScript('## A\n\nBirinci cümle. İkinci cümle.\n📍 [ANİM: stat — "1"]\nÜçüncü cümle.'));
    const m = s.markers[0];
    assert.equal(s.sentences[m.sentenceIndex].text, 'İkinci cümle.');
  });

  it('kaldırılan İLLÜSTRASYON satırını atlar, bilgi notu düşer', () => {
    const s = parseScript(miniScript('## A\n\nBir cümle.\n📍 [İLLÜSTRASYON?: oda]\n📍 [ANİM: stat — "1"]'));
    assert.equal(s.markers.length, 1);
    assert.ok(s.issues.some((i) => /İLLÜSTRASYON/.test(i.msg) && i.level === 'bilgi'));
  });

  it('rakam arasındaki nokta cümleyi bölmez ("Opus 4.7", "1.200")', () => {
    const s = parseScript(miniScript('## A\n\nİşte Opus 4.7 ve Mythos 5. Fiyat 1.200 lira oldu.'));
    assert.deepEqual(
      s.sentences.map((x) => x.text),
      ['İşte Opus 4.7 ve Mythos 5.', 'Fiyat 1.200 lira oldu.', 'Bir sonraki videoda görüşmek üzere.'],
    );
  });

  it('cümle ortasındaki işaret hata verir', () => {
    const s = parseScript(miniScript('## A\n\nBir cümle 📍 [ANİM: stat — "1"] devam.'));
    assert.ok(s.issues.some((i) => i.level === 'hata'));
  });
});

describe('lint', () => {
  it('dürüstlüğü ilan eden kalıbı ve podcast atfını yakalar', () => {
    const r = lintScript(parseScript(miniScript('## A\n\nAçıkçası bu önemli. Ekranda gördüğünüz gibi büyüyor. Hadi gelin başlayalım.')));
    assert.ok(r.issues.some((i) => /açıkçası/.test(i.msg)));
    assert.ok(r.issues.some((i) => /Podcast uyumu/.test(i.msg)));
  });

  it('tarihsel bölümde fotoğraf yoksa uyarır, varsa uyarmaz', () => {
    const yok = lintScript(parseScript(miniScript('## Tarih\n\n1940 yılında bir sayım yapıldı. Hadi gelin başlayalım.')));
    assert.ok(yok.issues.some((i) => /tarihten bir hikâye/.test(i.msg)));
    const var_ = lintScript(parseScript(miniScript('## Tarih\n\n1940 yılında bir sayım yapıldı.\n📍 [FOTO: sayim.jpg, "Sayım, 1940", ara: "1940 census"]\nHadi gelin başlayalım.')));
    assert.ok(!var_.issues.some((i) => /tarihten bir hikâye/.test(i.msg)));
  });

  it("on yıl ifadesini (1980'ler) tarihsel hikâye saymaz", () => {
    const r = lintScript(parseScript(miniScript("## A\n\nHerkes 1980'lere ışınlandı. Hadi gelin başlayalım.")));
    assert.ok(!r.issues.some((i) => /tarihten bir hikâye/.test(i.msg)));
  });
});
