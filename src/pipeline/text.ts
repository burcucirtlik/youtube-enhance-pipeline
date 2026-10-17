// Türkçe metin yardımcıları: normalize, kelimeye ve cümleye bölme.

const FOLD: Record<string, string> = {
  ı: 'i', i: 'i', ş: 's', ç: 'c', ğ: 'g', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u',
};

/** Hizalama için kelimeyi sadeleştirir: Türkçe küçük harf, aksan katlama, noktalama yok. */
export const normalizeWord = (w: string): string =>
  w
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıişçğöüâîû]/g, (c) => FOLD[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Konuşulan metinden markdown, emoji ve göz kırpma işaretlerini temizler. */
export const stripMarkdown = (s: string): string =>
  s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(^|\s):[DPp)(](?=\s|$)/g, '$1')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/^>\s?/, '')
    .replace(/\s+/g, ' ')
    .trim();

export const tokenize = (s: string): string[] =>
  s
    .split(/[\s—–]+/)
    .map(normalizeWord)
    .filter((w) => w.length > 0);

/** Paragrafı cümlelere böler. "..." ve "…" ile asılı kalan cümleler ayrı cümle sayılır. */
export const splitSentences = (paragraph: string): string[] => {
  const out: string[] = [];
  // Rakam arasındaki nokta cümle sonu değildir: "Opus 4.7", "1.200 ajan", "2.5 saat".
  const re = /(?:[^.!?…]|(?<=\d)\.(?=\d))+(?:[.!?…]+["'”’)]*|$)/g;
  for (const m of paragraph.matchAll(re)) {
    const t = m[0].trim();
    if (t && /[\p{L}\p{N}]/u.test(t)) out.push(t);
  }
  return out;
};

export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
};

export const countWords = (s: string): number => tokenize(s).length;
