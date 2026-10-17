// `ANİM: sistem` sahnesinin dili: aktör rolleri (hangi ikonla çizileceği) ve durum olayları.
// Parser, lint, Remotion ve skill sözlüğü buradaki listeleri kullanır.

export const ACTOR_ROLES = [
  {role: 'person', label: 'insan', words: ['client', 'kullanıcı', 'user', 'insan', 'müşteri', 'kişi', 'izleyici', 'çalışan', 'adam', 'kadın', 'biz', 'siz', 'sen', 'ben']},
  {role: 'hacker', label: 'saldırgan', words: ['hacker', 'saldırgan', 'dolandırıcı', 'hırsız', 'attacker']},
  {role: 'server', label: 'sunucu', words: ['server', 'sunucu', 'api', 'backend', 'servis', 'service', 'arka uç', 'host']},
  {role: 'database', label: 'veritabanı', words: ['database', 'veritabanı', 'db', 'veri tabanı', 'sql', 'kayıtlar', 'arşiv']},
  {role: 'agent', label: 'yapay zekâ / ajan', words: ['ajan', 'agent', 'bot', 'model', 'llm', 'yapay zeka', 'yapay zekâ', 'ai', 'claude', 'gpt', 'chatgpt', 'gemini', 'asistan']},
  {role: 'browser', label: 'web sitesi / platform', words: ['tarayıcı', 'browser', 'web', 'site', 'platform', 'sayfa', 'frontend']},
  {role: 'phone', label: 'telefon / uygulama', words: ['telefon', 'mobil', 'uygulama', 'app', 'iphone', 'android']},
  {role: 'cloud', label: 'bulut', words: ['bulut', 'cloud', 'aws', 'azure', 'internet']},
  {role: 'queue', label: 'kuyruk', words: ['kuyruk', 'queue', 'kafka', 'mesaj kuyruğu']},
  {role: 'file', label: 'dosya / belge', words: ['dosya', 'file', 'belge', 'doküman', 'e-posta', 'mail', 'eposta']},
  {role: 'company', label: 'şirket / kurum', words: ['şirket', 'kurum', 'banka', 'devlet', 'e-devlet', 'bakanlık', 'company', 'firma', 'openai', 'anthropic', 'google', 'meta', 'microsoft']},
  {role: 'shield', label: 'güvenlik duvarı / gardiyan', words: ['firewall', 'güvenlik duvarı', 'gardiyan', 'güvenlik', 'filtre', 'kalkan', 'sandbox']},
] as const;

export type ActorRole = (typeof ACTOR_ROLES)[number]['role'] | 'box';

/** Aktörün adından rolü: "Client" → person, "Ödeme API'si" → server. Bulunamazsa düz kutu. */
export const roleOf = (name: string): ActorRole => {
  // Türkçe küçültme "API"yi "apı" yapar; İngilizce adlar için iki biçime de bakılır.
  const forms = [name.toLocaleLowerCase('tr-TR'), name.toLowerCase()].map((x) => ` ${x.replace(/['’]/g, ' ')} `);
  // Kısa kelimeler (ai, db, app…) yalnızca tam kelime olarak; uzunlar ekli halleriyle de ("sunucuya", "sitesi").
  const hit = (w: string) => forms.some((n) => n.includes(` ${w} `) || (w.length > 3 && n.includes(` ${w}`)));
  for (const r of ACTOR_ROLES) if (r.words.some(hit)) return r.role;
  return 'box';
};

export const ROLE_NAMES = new Set<string>(ACTOR_ROLES.map((r) => r.role));

/** Durumlar: her birinin çizimi sabit. Listede olmayan durum yazılmaz. */
export const SYSTEM_STATES = [
  {state: 'çöker', look: 'sarsılır, kırmızı glitch, ✕ ve "ÇÖKTÜ"', bad: true},
  {state: 'yavaşlar', look: 'altında yavaş dolan yükleme çubuğu', bad: true},
  {state: 'kilitlenir', look: 'üstünde kilit', bad: true},
  {state: 'reddeder', look: 'yanında kırmızı çarpı, "REDDETTİ"', bad: true},
  {state: 'sızdırır', look: 'altından veri damlar, "SIZINTI"', bad: true},
  {state: 'kabul eder', look: 'yeşil onay', bad: false},
  {state: 'cevap verir', look: 'son mesajı gönderene geri dönen ok', bad: false},
] as const;
export type SystemState = (typeof SYSTEM_STATES)[number]['state'];

export type SystemActor = {name: string; role: ActorRole; count?: string};
export type SystemEvent = {kind: 'msg'; from: number; to: number; label?: string} | {kind: 'state'; actor: number; state: SystemState};

export const SYSTEM_LIMITS = {actors: 3, events: 4, nameWords: 2} as const;
