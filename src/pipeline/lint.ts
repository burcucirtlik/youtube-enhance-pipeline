// Skill'in "İç Kalite Kontrol" listesinin makineyle kontrol edilebilen kısmı + işaret sözlüğü denetimi.

import fs from 'node:fs';
import {OVERLAY_TYPES} from '../shared/marker-schema';
import type {Marker} from '../shared/types';
import {isValidFileName} from './markers';
import type {Issue, ParsedScript} from './parse-script';
import {normalizeWord} from './text';
import {staticVisualChecks} from './visual-checks';

// Konuşma hızı varsayımı: ~150 kelime/dakika (skill: 15–30 sn ≈ 40–75 kelime).
export const WORDS_PER_SEC = 2.5;

const HONESTY = ['açık söyleyeyim', 'açık konuşayım', 'baştan açık konuşayım', 'dürüst olalım', 'size dürüst olayım', 'açıkçası', 'itiraf edeyim'];
const CLICHES = ['internet ikiye bölündü', 'işin aslı başka', 'yangına körükle'];
const SCREEN_REFS = ['ekranda gördüğünüz', 'ekranda gördüğümüz', 'şu grafiğe bak', 'ekrana bak', 'grafikte gördüğünüz', 'görselde gördüğünüz'];
const HEADER_FIELDS = ['Video formatı', 'Klasör', 'Tahmini süre', 'Açılış tipi', 'Format', 'Tarih'];
const MONTHS = 'Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık';
const BULLETIN = new RegExp(`^((Saat\\s+\\d{1,2}[:.]\\d{2})|((\\d{1,2}\\s+)?(${MONTHS})\\s+\\d{4}(,\\s*[\\p{L}\\s]+)?))[.!]?$`, 'u');

const norm = (s: string) => ' ' + s.split(/\s+/).map(normalizeWord).filter(Boolean).join(' ') + ' ';

/** Skill dosyasındaki "Daha önce kullanılan..." listelerinden tükenmiş ifadeleri çıkarır. */
export const loadExhausted = (skillPath: string): string[] => {
  if (!fs.existsSync(skillPath)) return [];
  const text = fs.readFileSync(skillPath, 'utf8');
  const out = new Set<string>();
  for (const line of text.split('\n')) {
    if (!/Daha önce kullanılan/i.test(line)) continue;
    for (const m of line.matchAll(/"([^"]+)"/g)) {
      const phrase = m[1].replace(/\.\.\.|…/g, ' ').trim();
      if (phrase.split(/\s+/).length >= 2) out.add(phrase);
    }
  }
  return [...out];
};

export type LintResult = {issues: Issue[]; stats: Record<string, string | number>};

export const lintScript = (s: ParsedScript, opts: {skillPath?: string} = {}): LintResult => {
  const issues: Issue[] = [...s.issues];
  const add = (line: number, level: Issue['level'], msg: string) => issues.push({line, level, msg});
  const talking = s.header.format === 'talking-head';

  // ── Başlık bloğu
  for (const f of HEADER_FIELDS) if (!s.header.fields[f]) add(1, 'hata', `Başlık bloğunda "**${f}:**" alanı eksik (pipeline bu alanları okuyor)`);
  if (!s.header.title) add(1, 'hata', '"# VİDEO BAŞLIĞI" satırı yok');

  // ── Sabit imzalar
  const allText = s.sentences.map((x) => x.text).join(' ');
  if (!/Hadi gelin başlayalım\./.test(allText)) add(1, 'hata', 'Açılış imzası "Hadi gelin başlayalım." bulunamadı');
  const last = s.sentences.at(-1);
  if (s.header.stage === 'çekim' && last && !/Bir sonraki videoda görüşmek üzere\.?$/.test(last.text))
    add(last.line, 'hata', 'Son satır "Bir sonraki videoda görüşmek üzere." değil');

  // ── Yasak kalıplar (cümle bazında)
  const exhausted = opts.skillPath ? loadExhausted(opts.skillPath) : [];
  const exhaustedNorm = exhausted.map((p) => [p, norm(p)] as const);
  let ctaCount = 0;
  let hedges = 0;
  for (const sen of s.sentences) {
    const lower = sen.text.toLocaleLowerCase('tr-TR');
    for (const p of HONESTY) if (lower.includes(p)) add(sen.line, 'hata', `Dürüstlüğü ilan eden kalıp: "${p}"`);
    for (const p of CLICHES) if (lower.includes(p)) add(sen.line, 'uyarı', `Hazır klişe: "${p}" → konuya özgü bir ifadeyle değiştir`);
    if (lower.includes('umarım beğenmişsinizdir')) add(sen.line, 'hata', 'Yasak kapanış: "Umarım beğenmişsinizdir"');
    if (talking) for (const p of SCREEN_REFS) if (lower.includes(p)) add(sen.line, 'hata', `Podcast uyumu: "${p}" — görselin gösterdiğini cümle de söylemeli`);
    if (BULLETIN.test(sen.text.trim())) add(sen.line, 'uyarı', `Bülten dili: "${sen.text}" → tam konuşma cümlesine çevir`);
    if (/abone/i.test(lower)) ctaCount++;
    hedges += (lower.match(/\b(belki|sanırım|olabilir)\b/gu) ?? []).length;
    const n = norm(sen.text);
    for (const [orig, pn] of exhaustedNorm) if (n.includes(pn)) add(sen.line, 'uyarı', `Daha önce kullanılmış ifade: "${orig}"`);
  }
  if (ctaCount > 2) add(1, 'uyarı', `Abonelik çağrısı ${ctaCount} cümlede geçiyor (en fazla 2)`);
  const per1000 = (hedges / Math.max(1, s.words.length)) * 1000;
  if (per1000 > 6) add(1, 'bilgi', `"belki/sanırım/olabilir" sık (${hedges} kez) → iddia yap`);

  // ── İşaretler
  const ms = s.markers;
  const kaynak = (s.trailing['Kaynaklar'] ?? []).join('\n');
  if (ms.some((m) => ['HABER', 'BELGE', 'FOTO', 'KLİP', 'POST'].includes(m.kind)) && !kaynak)
    add(1, 'hata', '"## Kaynaklar" tablosu yok ama gerçek görsel işaretleri var');

  for (const m of ms) {
    const p = m.props;
    const fileOf = 'file' in p ? p.file : null;
    if (fileOf && !isValidFileName(fileOf)) add(m.line, 'uyarı', `Dosya adı kurala uymuyor: "${fileOf}" (küçük harf, Türkçe karaktersiz, tireli)`);
    if ((p.type === 'news' || p.type === 'document') && p.highlight === null) add(m.line, 'bilgi', 'vurgula: ? — "Kayıttan Önce Doğrulanacaklar"a eklendiğinden emin ol');
    if (kaynak) {
      // ara: sorgulu FOTO'nun satırı, aday seçilince (npm run foto) tabloya otomatik yazılır.
      const key = p.type === 'news' ? p.url : p.type === 'post' ? p.handle : p.type === 'document' || ((p.type === 'photo' || p.type === 'clip') && !p.search) ? p.file : null;
      if (key && !kaynak.includes(key)) add(m.line, 'uyarı', `"Kaynaklar" tablosunda karşılığı yok: ${key}`);
    }
  }

  // Tarihsel hikâye = gerçek görsel: 2015'ten eski bir yıl geçen bölümde arşiv fotoğrafı (FOTO) ya da belge (BELGE) olmalı; haber ekran görüntüsü yetmez.
  const REAL = new Set(['FOTO', 'BELGE']);
  for (const sec of s.sections) {
    const text = s.sentences.filter((x) => x.section === sec.title).map((x) => x.text).join(' ');
    const years = [...text.matchAll(/\b(1[5-9]\d\d|200\d|201[0-4])\b(?!['’]l[ae]r)/g)].map((y) => y[1]);
    if (!years.length) continue;
    const real = ms.filter((m) => m.section === sec.title && REAL.has(m.kind));
    if (!real.length) add(sec.line, 'uyarı', `"${sec.title}" bölümü tarihten bir hikâye anlatıyor (${[...new Set(years)].join(', ')}) ama gerçek görsel yok: arşiv fotoğrafı (FOTO) ya da belge ekle`);
  }

  // Ekranda okunabilirlik, tür çeşitliliği, ekrandaki rakamın söylenenle aynılığı.
  issues.push(...staticVisualChecks(ms, s.sentences));

  const danger = ms.filter((m) => m.danger).length;
  if (ms.length && danger / ms.length > 0.15) add(1, 'uyarı', `Tehlike tonu işaretlerin %${Math.round((danger / ms.length) * 100)}'ünde (en fazla %15)`);
  const suggested = ms.filter((m) => m.suggested).length;
  if (suggested) add(1, 'bilgi', `${suggested} önerilen (?) işaret Zena'nın kararını bekliyor; render varsayılan olarak bunları atlar`);

  // ── Yoğunluk
  const anchored = ms.filter((m) => m.sentenceIndex >= 0).sort((a, b) => a.sentenceIndex - b.sentenceIndex);
  // Alt bant ve vurgu yüzü kapatmaz: tam ekran sayımına ve "kamerada kalmalı" denetimine girmez.
  const fullScreen = anchored.filter((m) => !OVERLAY_TYPES.has(m.props.type) && m.layout !== 'yan');
  // Fotoğraf ve arşiv videosu zincirleri ritim sınırına takılmaz (Zena: fotoğraf sayısında sınır yok).
  const fullScreenRun = fullScreen.filter((m) => m.props.type !== 'photo' && m.props.type !== 'clip');
  const wordAt = (si: number) => s.sentences[si]?.wordStart ?? 0;
  if (talking) {
    const avg = s.words.length / Math.max(1, ms.length);
    if (ms.length && avg > 75) add(1, 'uyarı', `İşaretler seyrek: ortalama ${Math.round(avg)} kelimede bir (hedef 40–75)`);
    let prevW = 0;
    let prevLine = 1;
    for (const m of anchored) {
      const w = wordAt(m.sentenceIndex);
      if (w - prevW > 150) add(m.line, 'uyarı', `Satır ${prevLine}–${m.line} arasında ~${Math.round((w - prevW) / WORDS_PER_SEC)} sn işaretsiz`);
      prevW = s.sentences[m.sentenceIndex].wordEnd;
      prevLine = m.line;
    }
    // Art arda tam ekran: aynı ya da ardışık cümlelere bağlı 3+ işaret.
    let run: Marker[] = [];
    const flush = () => {
      if (run.length > 2) add(run[0].line, 'uyarı', `Art arda ${run.length} tam ekran kesme (satır ${run[0].line}–${run.at(-1)!.line}); en fazla 2, sonra yüze dön`);
      run = [];
    };
    for (const m of fullScreenRun) {
      const p = run.at(-1);
      if (p && m.sentenceIndex - p.sentenceIndex > 1) flush();
      run.push(m);
    }
    flush();
    // Açılışın ilk cümlesi ve kapanış cümlesi kamerada kalır.
    const first = fullScreen[0];
    if (first && first.sentenceIndex === 0) add(first.line, 'uyarı', 'Açılışın ilk cümlesi kamerada kalmalı');
    const closingIdx = s.sentences.length - 2; // imzadan önceki cümle
    for (const m of fullScreen) if (m.sentenceIndex >= closingIdx && closingIdx > 0) add(m.line, 'uyarı', 'Kapanış cümlesi kamerada kalmalı');
  } else {
    let prevW = 0;
    let prevLine = 1;
    for (const m of anchored) {
      const w = wordAt(m.sentenceIndex);
      if (w - prevW > 25) add(m.line, 'uyarı', `Teknik eğitim: satır ${prevLine}–${m.line} arasında ~${Math.round((w - prevW) / WORDS_PER_SEC)} sn görselsiz (en fazla 10 sn)`);
      prevW = s.sentences[m.sentenceIndex].wordEnd;
      prevLine = m.line;
    }
    if (s.words.length - prevW > 25) add(prevLine, 'uyarı', 'Teknik eğitim: son işaretten sonra 10 sn\'den uzun görselsiz bölüm');
  }

  const minutes = s.words.length / WORDS_PER_SEC / 60;
  if (talking && s.header.stage === 'çekim' && (s.words.length < 1800 || s.words.length > 2800))
    add(1, 'bilgi', `${s.words.length} kelime (~${minutes.toFixed(1)} dk); talking head hedefi 1.800–2.800`);

  const byKind: Record<string, number> = {};
  for (const m of ms) byKind[m.anim ? `ANİM:${m.anim}` : m.kind] = (byKind[m.anim ? `ANİM:${m.anim}` : m.kind] ?? 0) + 1;

  return {
    issues: issues.sort((a, b) => a.line - b.line),
    stats: {
      format: s.header.format,
      aşama: s.header.stage,
      kelime: s.words.length,
      'tahmini süre': `${minutes.toFixed(1)} dk`,
      bölüm: s.sections.length,
      işaret: ms.length,
      önerilen: suggested,
      tehlike: danger,
      ...byKind,
    },
  };
};
