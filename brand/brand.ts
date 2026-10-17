// Kanalın görsel kimliği: Matrix / siberpunk. Script görsel stil tarif etmez; bütün stil buradan gelir.
// Renk, font, doku, animasyon hızı ve çerçeve burada değişir, sahneler otomatik uyar.

export const brand = {
  colors: {
    bg: '#020805', // neredeyse siyah, hafif yeşil
    surface: 'rgba(0, 255, 136, 0.045)', // HUD paneli içi
    surface2: 'rgba(0, 255, 136, 0.09)', // tablo satırı, ikincil panel
    line: 'rgba(0, 255, 136, 0.45)', // panel çerçevesi
    text: '#D9FFEC', // fosfor beyazı
    muted: '#5FAF86',
    accent: '#00FF88', // Matrix yeşili
    accent2: '#00E5FF', // siber camgöbeği
    highlighter: 'rgba(0, 255, 136, 0.40)', // HABER/BELGE fosforlu kalemi
    danger: '#FF2A6D', // ton: tehlike (neon magenta-kırmızı)
    danger2: '#FF71CE',
    dangerHighlighter: 'rgba(255, 42, 109, 0.42)',
  },
  fonts: {
    // @remotion/google-fonts içinden; ikisi de Türkçe karakterleri (latin-ext) destekliyor.
    display: 'Chakra Petch',
    body: 'JetBrains Mono',
    mono: 'JetBrains Mono',
  },
  type: {
    hero: 132, // stat rakamı
    title: 72,
    body: 40,
    small: 30,
    caption: 26,
  },
  motion: {
    enterFrames: 14, // kameradan görsele yumuşak geçiş (solarak açılma + çok hafif yakınlaşma; glitch yok)
    exitFrames: 10, // görselden kameraya yumuşak çıkış
    stagger: 7, // liste öğeleri arası
    spring: {damping: 200, stiffness: 140, mass: 0.8},
    kenBurns: 0.06, // fotoğraf/illüstrasyon yavaş yakınlaşma oranı
    crossfadeFrames: 12, // peş peşe iki görsel arasında yumuşak çapraz geçiş
    // Geçişlerde glitch yok, metinler de rastgele karakterlerden "çözülmez"; yumuşakça belirir (Zena, 2026-10-17).
    // true yapılırsa eski Matrix çözülmesi geri gelir.
    textDecode: false,
    textFadeFrames: 10, // metnin belirme süresi
    decodeFrames: 16, // (textDecode açıksa) metnin rastgele karakterlerden çözülme süresi
    typingCharsPerSec: 38, // terminal yazma hızı
  },
  frame: {
    padding: 110, // kenar boşluğu (1080p için; diğer çözünürlüklerde ölçeklenir)
    radius: 0, // HUD panelleri köşeli
    corner: 22, // panel köşe parantezlerinin boyu
    glow: '0 0 24px rgba(0, 255, 136, 0.18), inset 0 0 40px rgba(0, 255, 136, 0.05)',
    shadow: '0 0 40px rgba(0, 255, 136, 0.15)',
  },
  texture: {
    rain: 0.14, // arka plandaki dijital yağmurun opaklığı (0 = kapalı)
    rainGlyphs: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ0123456789',
    scanlines: 0.10, // CRT tarama çizgileri
    grid: 0.06, // arka plan ızgarası
    grain: 0.04, // film greni
    vignette: 0.55,
    photoTint: 0.12, // gerçek fotoğraflara binen yeşil ton (0 = doğal renk)
  },
  /** true: önerilen (?) işaretler studio önizlemesinde köşede "? ÖNERİ · SATIR n" rozetiyle gösterilir (render'a hiç girmez). */
  showSuggestedBadge: false,
  /** Her ## bölümünün başında sol üstte kısa bölüm kartı (yüzü kapatmaz). İlk bölümde (açılış) yok. */
  chapterCard: {enabled: true, seconds: 2.4},
} as const;

export type Brand = typeof brand;
