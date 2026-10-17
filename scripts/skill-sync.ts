// SKILL.md'deki işaret sözlüğü bloğunu src/shared/marker-schema.ts'ten yeniden yazar.
// Blok işaretleri yoksa (ilk çalıştırma), "Animasyonlar" ile "Gerçek görseller" kod bloklarını bulup yerine koyar.
// Kullanım: npm run skill:sync  (değişiklik yoksa dosyaya dokunmaz)

import fs from 'node:fs';
import {replaceSkillDictionary, SKILL_BLOCK_START, skillDictionary} from '../src/shared/marker-schema';
import {SKILL} from '../src/pipeline/util';

let text = fs.readFileSync(SKILL, 'utf8');
if (!text.includes(SKILL_BLOCK_START)) {
  const a = text.indexOf('**Animasyonlar (kodla çizilir):**');
  const g = text.indexOf('**Gerçek görseller:**', a);
  const open = text.indexOf('```', g);
  const close = text.indexOf('```', open + 3);
  if (a < 0 || g < 0 || open < 0 || close < 0) throw new Error("SKILL.md'de işaret sözlüğü kod blokları bulunamadı");
  text = text.slice(0, a) + skillDictionary() + text.slice(close + 3);
} else text = replaceSkillDictionary(text);
const old = fs.readFileSync(SKILL, 'utf8');
if (old === text) console.log('SKILL.md güncel');
else {
  fs.writeFileSync(SKILL, text);
  console.log('SKILL.md işaret sözlüğü güncellendi');
}
