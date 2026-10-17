// 📍 işaret sözlüğünün tek kaynağı. Buradan türeyenler:
// - parser'ın tanıdığı türler (src/pipeline/markers.ts) ve TypeScript türleri (src/shared/types.ts)
// - arayüzdeki tür etiketleri (ui/src/api.ts)
// - gorsel-isaretleme skill'indeki "İşaret sözlüğü" bloğu (SKILL.md; `npm run skill:sync` yazar, test eşitliği denetler)
// Yeni bir tür eklemek: buraya ekle, parser'a ayrıştırmasını, Remotion'a sahnesini yaz, `npm run skill:sync`.

export const ANIM_MARKERS = [
  {type: 'flow', label: 'Akış', example: '📍 [ANİM: flow — "adım 1" → "adım 2" → "adım 3"]', use: 'süreç, sıralama, neden-sonuç zinciri'},
  {type: 'compare', label: 'Karşılaştırma', example: '📍 [ANİM: compare — "A: ..." vs "B: ..."]', use: 'iki şeyin karşılaştırması'},
  {type: 'table', label: 'Tablo', example: '📍 [ANİM: table — "başlık", "başlık" | "satır", "değer"]', use: 'çok kalemli karşılaştırma'},
  {type: 'timeline', label: 'Zaman çizelgesi', example: '📍 [ANİM: timeline — "2015: ..." → "2022: ..." → "bugün"]', use: 'zaman çizelgesi'},
  {type: 'stat', label: 'Rakam', example: '📍 [ANİM: stat — "13 milyar $", "iki yılda"]', use: 'tek çarpıcı rakam'},
  {type: 'quote', label: 'Alıntı', example: '📍 [ANİM: quote — "alıntı metni", "Ad Soyad"]', use: 'bir kişinin sözü (gönderi değilse)'},
  {type: 'terminal', label: 'Terminal', example: '📍 [ANİM: terminal — `komut`]', use: 'komut satırı (teknik eğitim)'},
  {type: 'code', label: 'Kod', example: '📍 [ANİM: code — dosya.js, satır 4 vurgula]', use: 'kod bloğu (teknik eğitim)'},
  {type: 'concept', label: 'Kavram', example: '📍 [ANİM: concept — "kavramın adı"]', use: 'kanal kavramı / terim kartı'},
] as const;

export const REAL_MARKERS = [
  {kind: 'EKRAN', type: 'screen', label: 'Ekran kaydı', examples: [['📍 [EKRAN: screen-01.mp4, ne vurgulanacak]', 'ekran kaydı']]},
  {kind: 'HABER', type: 'news', label: 'Haber', examples: [['📍 [HABER: https://link, vurgula: "haberdeki metin"]', 'haber/makale + fosforlu kalem']]},
  {kind: 'BELGE', type: 'document', label: 'Belge', examples: [['📍 [BELGE: dosya-adi.pdf, s. 12, vurgula: "belgedeki metin"]', "rapor, makale PDF'i, mahkeme dosyası"]]},
  {
    kind: 'FOTO',
    type: 'photo',
    label: 'Fotoğraf',
    examples: [
      ['📍 [FOTO: dosya-adi.jpg, "Ad Soyad, unvan"]', 'gerçek fotoğraf: kişi, yer, olay, belge'],
      ['📍 [FOTO: dosya-adi.jpg, "Olay, tarih", ara: "english search query"]', "arşiv fotoğrafı: pipeline Commons'ta aday arar"],
    ],
  },
  {kind: 'POST', type: 'post', label: 'Gönderi', examples: [['📍 [POST: platform, @kullanici, "gönderi metni"]', 'tweet / sosyal medya gönderisi']]},
] as const;

/** Kaldırılan türler: eski script'lerde görülürse parser atlar, lint bilgi notu düşer. */
export const RETIRED_MARKERS = [{kind: 'İLLÜSTRASYON', since: '2026-10-17', aliases: ['İLLÜSTRASYON', 'ILLUSTRASYON', 'İLLUSTRASYON', 'ILLÜSTRASYON']}] as const;

/** Yazım hatası toleransı: kabul edilir ama lint uyarı verir. */
export const KIND_ALIASES: Record<string, MarkerKind> = {ANIM: 'ANİM'};

export type AnimType = (typeof ANIM_MARKERS)[number]['type'];
export type MarkerKind = 'ANİM' | (typeof REAL_MARKERS)[number]['kind'];

export const ANIM_TYPES: AnimType[] = ANIM_MARKERS.map((m) => m.type);
export const MARKER_KINDS: MarkerKind[] = ['ANİM', ...REAL_MARKERS.map((m) => m.kind)];

/** Sahne türü → arayüz etiketi. */
export const TYPE_LABEL: Record<string, string> = Object.fromEntries([...ANIM_MARKERS, ...REAL_MARKERS].map((m) => [m.type, m.label]));

// ── Skill'deki sözlük bloğu ────────────────────────────────────────────────

export const SKILL_BLOCK_START = '<!-- işaret-sözlüğü: başla — src/shared/marker-schema.ts üretir (npm run skill:sync), elle düzenleme -->';
export const SKILL_BLOCK_END = '<!-- işaret-sözlüğü: bitir -->';

const column = (rows: (readonly [string, string])[]) => {
  const w = Math.max(...rows.map(([e]) => [...e].length)) + 3;
  return rows.map(([e, u]) => e + ' '.repeat(w - [...e].length) + u).join('\n');
};

/** SKILL.md'deki "İşaret sözlüğü" kod blokları. */
export const skillDictionary = (): string =>
  [
    SKILL_BLOCK_START,
    '**Animasyonlar (kodla çizilir):**',
    '```',
    column(ANIM_MARKERS.map((m) => [m.example, m.use] as const)),
    '```',
    '',
    '**Gerçek görseller:**',
    '```',
    column(REAL_MARKERS.flatMap((m): (readonly [string, string])[] => [...m.examples])),
    '```',
    SKILL_BLOCK_END,
  ].join('\n');

/** SKILL.md metnindeki bloğu yenisiyle değiştirir; blok yoksa hata. */
export const replaceSkillDictionary = (skill: string): string => {
  const a = skill.indexOf(SKILL_BLOCK_START);
  const b = skill.indexOf(SKILL_BLOCK_END);
  if (a < 0 || b < a) throw new Error("SKILL.md'de işaret sözlüğü bloğu işaretleri yok");
  return skill.slice(0, a) + skillDictionary() + skill.slice(b + SKILL_BLOCK_END.length);
};
