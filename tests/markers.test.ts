import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {isValidFileName, MarkerError, parseMarker, RETIRED_MARKER} from '../src/pipeline/markers';

describe('📍 işaret grameri', () => {
  it('ANİM flow adımlarını okur', () => {
    const m = parseMarker('ANİM: flow — "a" → "b" → "c"');
    assert.equal(m.kind, 'ANİM');
    assert.deepEqual(m.props, {type: 'flow', steps: ['a', 'b', 'c']});
    assert.equal(m.suggested, false);
  });

  it('önerilen (?) işareti ve tehlike tonunu tanır', () => {
    const m = parseMarker('ANİM?: stat — "700 ajan", "tek gecede", ton: tehlike');
    assert.equal(m.suggested, true);
    assert.equal(m.danger, true);
    assert.deepEqual(m.props, {type: 'stat', value: '700 ajan', caption: 'tek gecede'});
  });

  it('compare iki tarafı etiketiyle ayırır', () => {
    const m = parseMarker('ANİM: compare — "Instagram: sadece yüz" vs "ChatGPT: yüz + hesap"');
    assert.deepEqual(m.props, {type: 'compare', left: {label: 'Instagram', text: 'sadece yüz'}, right: {label: 'ChatGPT', text: 'yüz + hesap'}});
  });

  it('table: ilk grup başlık, diğerleri satır', () => {
    const m = parseMarker('ANİM: table — "Sızan", "Çözüm" | "Şifre", "Yenile" | "Yüz", "Yok"');
    assert.deepEqual(m.props, {type: 'table', headers: ['Sızan', 'Çözüm'], rows: [['Şifre', 'Yenile'], ['Yüz', 'Yok']]});
  });

  it('HABER vurgu metnini ve vurgula: ? durumunu okur', () => {
    const a = parseMarker('HABER: https://x.com/a, vurgula: "tam metin"');
    assert.deepEqual(a.props, {type: 'news', url: 'https://x.com/a', highlight: 'tam metin'});
    const b = parseMarker('HABER?: https://x.com/a, vurgula: ?');
    assert.equal((b.props as any).highlight, null);
  });

  it('FOTO: altyazı ve Commons arama sorgusu', () => {
    const m = parseMarker('FOTO: pearl-harbor.jpg, "Pearl Harbor, 1941", ara: "USS Arizona 1941"');
    assert.deepEqual(m.props, {type: 'photo', file: 'pearl-harbor.jpg', caption: 'Pearl Harbor, 1941', search: 'USS Arizona 1941'});
  });

  it('BELGE sayfa numarasını okur', () => {
    const m = parseMarker('BELGE: rapor.pdf, s. 12, vurgula: "metin"');
    assert.deepEqual(m.props, {type: 'document', file: 'rapor.pdf', page: 12, highlight: 'metin'});
  });

  it('bilinmeyen tür hata verir', () => {
    assert.throws(() => parseMarker('VİDEO: x.mp4'), MarkerError);
  });

  it('kaldırılan İLLÜSTRASYON işaretini tanır (parser atlar)', () => {
    assert.ok(RETIRED_MARKER.test('İLLÜSTRASYON?: bir oda'));
    assert.ok(!RETIRED_MARKER.test('ANİM: concept — "x"'));
  });

  it('dosya adı kuralı: küçük harf, Türkçe karaktersiz, tireli', () => {
    assert.ok(isValidFileName('screen-01.mp4'));
    assert.ok(!isValidFileName('Ekran Kaydı.mp4'));
    assert.ok(!isValidFileName('şehir.jpg'));
  });
});
