// Test yardımcıları: gerçek bir projeden (Yapay Zekaya Hakaret) alınmış metin fikstürleri ve geçici proje klasörü.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const FIX = path.join(import.meta.dirname, 'fixtures');
export const fixture = (...p: string[]) => fs.readFileSync(path.join(FIX, ...p), 'utf8');

/** Geçici bir video klasörü (footage/assets/build/out) kurar; test bitince silinir. */
export const tempProject = (files: Record<string, string> = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yte-test-'));
  for (const d of ['footage', 'assets', 'build', 'out']) fs.mkdirSync(path.join(dir, d));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), {recursive: true});
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return {dir, cleanup: () => fs.rmSync(dir, {recursive: true, force: true})};
};

/** Başlık bloğu hazır, gövdesi verilen küçük bir script. */
export const miniScript = (body: string, format = 'talking-head') => `# Test
**Video formatı:** ${format}
**Klasör:** videos/test
**Tahmini süre:** 1 dakika
**Açılış tipi:** A
**Format:** sarmal
**Tarih:** 2026-10-17
**Aşama:** kurgu-sonrası

---

${body}

Bir sonraki videoda görüşmek üzere.

---

## Kaynaklar
| İşaret | Dosya / link | Kaynak | Lisans |
|---|---|---|---|
`;
