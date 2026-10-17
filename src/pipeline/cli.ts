// Pipeline komut satırı. Kullanım: npm run <komut> -- <video klasörü> [bayraklar]

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {ScenesFile} from '../shared/types';
import {collectAssets} from './assets';
import {loadCandidateSet, loadRegistry, selectCandidate, writeReviewPage} from './commons';
import {lintScript} from './lint';
import {parseScript, type Issue} from './parse-script';
import {stageAlign, stageRender, writeReport, type Emit} from './run';
import {buildTiming} from './timing';
import {ffprobe, findBaseMedia, fmtTime, paths, pickScript, resolveVideoDir, ROOT, SKILL, VIDEOS} from './util';

const [cmd, target, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((r) => r.startsWith('--')));
const flagVal = (name: string) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};

const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const loadScript = (dir: string) => {
  const file = pickScript(dir);
  return {file, parsed: parseScript(fs.readFileSync(file, 'utf8'))};
};

const printIssues = (issues: Issue[], file: string) => {
  const color = {hata: c.red, uyarı: c.yellow, bilgi: c.dim};
  for (const i of issues) console.log(`  ${color[i.level](i.level.padEnd(5))} ${c.dim(`${path.basename(file)}:${i.line}`)}  ${i.msg}`);
};

// ── Komutlar ───────────────────────────────────────────────────────────────

const cmdNew = () => {
  if (!target || !/^\d{4}-\d{2}-[a-z0-9-]+$/.test(target)) throw new Error('Klasör adı YYYY-MM-kisa-baslik olmalı (küçük harf, Türkçe karaktersiz). Örn: npm run new -- 2026-10-ajan-karteli');
  const dir = path.join(VIDEOS, target);
  if (fs.existsSync(dir)) throw new Error(`${dir} zaten var`);
  const p = paths(dir);
  for (const d of [p.footage, p.assets, p.build, p.out]) fs.mkdirSync(d, {recursive: true});
  const tutorial = flags.has('--egitim') || flags.has('--tutorial');
  fs.writeFileSync(
    p.scriptMd,
    `# VİDEO BAŞLIĞI
**Video formatı:** ${tutorial ? 'tutorial' : 'talking-head'}
**Klasör:** videos/${target}
**Tahmini süre:** X dakika
**Açılış tipi:** ${tutorial ? 'vaat' : '[A/B/C/D/E]'}
**Format:** ${tutorial ? 'adım adım' : '[dört teori / kehanet-liste / senaryo-arc / sarmal]'}
**Tarih:** ${new Date().toISOString().slice(0, 10)}

---

## Açılış

Skill'in ürettiği script.md'yi bu dosyanın yerine koy. Hadi gelin başlayalım.

Bir sonraki videoda görüşmek üzere.

---

## Görsel Listesi

## Kaynaklar
| İşaret | Dosya / link | Kaynak | Lisans / kullanım notu |
|---|---|---|---|

## Kayıttan Önce Doğrulanacaklar
`,
  );
  console.log(c.green(`✓ ${path.relative(ROOT, dir)} oluşturuldu`));
  console.log(`  script.md      → skill'in çıktısını buraya koy
  footage/       → Descript'ten dışa aktarılan kurgu (kurgu.mp4; teknik eğitimde seslendirme .wav/.m4a)
  assets/        → ekran kayıtları, fotoğraflar, PDF'ler, kod dosyaları (script'teki adlarla)
  build/, out/   → pipeline üretir`);
};

const cmdLint = (dir: string, quiet = false) => {
  const {file, parsed} = loadScript(dir);
  const res = lintScript(parsed, {skillPath: SKILL});
  if (!quiet) {
    console.log(c.bold(`\n📋 Kontrol: ${path.relative(ROOT, file)}`));
    console.log(c.dim('  ' + Object.entries(res.stats).map(([k, v]) => `${k}: ${v}`).join(' · ')));
    printIssues(res.issues, file);
    const errs = res.issues.filter((i) => i.level === 'hata').length;
    const warns = res.issues.filter((i) => i.level === 'uyarı').length;
    console.log(errs ? c.red(`  ${errs} hata, ${warns} uyarı`) : c.green(`  ✓ hata yok, ${warns} uyarı`));
  }
  return {file, parsed, res};
};

const cmdTiming = (dir: string) => {
  console.log(c.bold('\n⏱  Zamanlama (Descript altyazısı)'));
  const r = buildTiming(dir, {force: flags.has('--force')});
  console.log(r.status === 'güncel' ? c.dim(`  ${r.detail}; yeniden yapmak için --force`) : c.green(`  ✓ ${r.detail}`));
};

const cmdAssets = async (dir: string) => {
  const {parsed} = loadScript(dir);
  console.log(c.bold('\n🖼  Varlıklar'));
  const results = await collectAssets(dir, parsed, {force: flags.has('--force')});
  const color = {hazır: c.green, üretildi: c.green, eksik: c.red, uyarı: c.yellow};
  for (const r of results) console.log(`  ${color[r.status](r.status.padEnd(9))} ${c.dim(`satır ${r.line}`)}  ${r.what}${r.note ? c.dim(' — ' + r.note) : ''}`);
  if (!results.length) console.log(c.dim('  toplanacak varlık yok'));
  const review = writeReviewPage(dir, path.basename(dir));
  if (review) console.log(`\n  📷 Arşiv fotoğrafı adayları: ${path.relative(ROOT, review)}\n     seçmek için: npm run foto -- ${path.basename(dir)} <dosya.jpg> <aday no>`);
  return results;
};

const cmdAlign = (dir: string) => {
  const p = paths(dir);
  if (!fs.existsSync(p.transcript)) throw new Error('Zamanlama yok. Önce: npm run timing -- ' + path.relative(ROOT, dir));
  console.log(c.bold(`\n⏱  Hizalama: ${path.relative(ROOT, pickScript(dir))} ↔ ${path.basename(findBaseMedia(dir).file)}`));
  let skipped = false;
  const scenes = stageAlign(dir, (e) => e.type === 'stage' && e.status === 'skip' && (skipped = true), {force: flags.has('--force')});
  if (skipped) console.log(c.dim('  girdiler değişmedi; yeniden yapmak için --force'));
  console.log(`  ${c.green(String(scenes.scenes.length))} sahne · ${scenes.dropped.length ? c.yellow(String(scenes.dropped.length)) : 0} düşen · ${scenes.chapters.length} bölüm işareti`);
  for (const d of scenes.dropped) console.log(`  ${c.yellow('düşen')} ${c.dim(`satır ${d.line}`)}  ${d.reason}`);
  for (const w of scenes.warnings) console.log(`  ${c.yellow('uyarı')} ${w}`);
  console.log(c.dim(`  → ${path.relative(ROOT, p.scenes)}, out/bolumler.txt`));
  return scenes;
};

/** Arşiv fotoğrafı seçimi. Argümansız: durum listesi. */
const cmdFoto = (dir: string) => {
  const [file, nStr] = rest.filter((r) => !r.startsWith('--'));
  if (file && nStr) {
    const {provenance, scriptUpdated} = selectCandidate(dir, file, Number(nStr));
    console.log(c.green(`✓ ${file} ← ${provenance.title}`));
    console.log(c.dim(`  ${provenance.artist} · ${provenance.license}`));
    console.log(c.dim(scriptUpdated ? '  Kaynaklar tablosu güncellendi.' : '  Script\'te "## Kaynaklar" bulunamadı; satırı elle ekle.'));
    writeReviewPage(dir, path.basename(dir));
    console.log(c.dim(`  Videoya yansıması için: npm run align -- ${path.basename(dir)}`));
    return;
  }
  const {parsed} = loadScript(dir);
  const reg = loadRegistry(dir);
  console.log(c.bold('\n📷 Arşiv fotoğrafları'));
  for (const m of parsed.markers) {
    if (m.props.type !== 'photo' || !m.props.search) continue;
    const f = m.props.file;
    const set = loadCandidateSet(dir, f);
    const state = reg[f]
      ? c.green(`seçildi: ${reg[f].title}`)
      : !set
        ? c.red('henüz aranmadı (npm run assets)')
        : set.candidates.length
          ? c.yellow(`${set.candidates.length} aday, seçim bekliyor`)
          : c.red(`"${set.query}" için aday bulunamadı: sorguyu değiştir ya da dosyayı elle assets/ içine koy`);
    console.log(`  ${c.dim(`satır ${m.line}`)}  ${f}  ${state}`);
  }
  const review = writeReviewPage(dir, path.basename(dir));
  if (review) console.log(`\n  ${path.relative(ROOT, review)}\n  seç: npm run foto -- ${path.basename(dir)} <dosya.jpg> <aday no>`);
};

const remotion = (args: string[]) => {
  const r = spawnSync('npx', ['remotion', ...args], {stdio: 'inherit', cwd: ROOT});
  if (r.status !== 0) throw new Error('Remotion başarısız');
};

const cmdStudio = (dir: string | null) => {
  if (!dir) return remotion(['studio', 'src/remotion/index.ts']);
  if (!fs.existsSync(paths(dir).scenes)) throw new Error('build/scenes.json yok. Önce: npm run align -- ' + path.relative(ROOT, dir));
  remotion(['studio', 'src/remotion/index.ts', '--public-dir', dir]);
};

/** Uygulamayla aynı render aşaması: girdiler değişmediyse atlanır, geçici dosyalar temizlenir. */
const cmdRender = async (dir: string) => {
  const p = paths(dir);
  if (!fs.existsSync(p.scenes)) throw new Error('build/scenes.json yok. Önce: npm run align -- ' + path.relative(ROOT, dir));
  const overlay = flags.has('--katman') || flags.has('--overlay');
  const includeSuggested = flags.has('--oneriler');
  const data: ScenesFile = JSON.parse(fs.readFileSync(p.scenes, 'utf8'));
  const pending = data.scenes.filter((s) => s.suggested && !s.disabled).length;
  if (pending && !includeSuggested) console.log(c.yellow(`  ${pending} önerilen (?) işaret render'a girmiyor. Tutulacaksa script'te ?'yi sil ya da --oneriler ekle.`));
  const missing = data.scenes.filter((s) => s.missingAsset && (includeSuggested || !s.suggested)).length;
  if (missing) console.log(c.yellow(`  ${missing} sahnede varlık eksik; yer tutucu çizilecek.`));
  console.log(c.bold(`\n🎬 Render`));
  const out = await stageRender(dir, consoleEmit, {overlay, includeSuggested, frames: flagVal('--kareler'), force: flags.has('--force'), full: flags.has('--tam')});
  console.log(c.green(`  ✓ ${path.relative(ROOT, out)}`));
};

/** Aşama olaylarını terminale yazar; ilerleme tek satırda güncellenir. */
const consoleEmit: Emit = (e) => {
  if (e.type === 'progress') process.stdout.write(`\r  ${Math.round(e.ratio * 100)}% ${e.text ?? ''}`.padEnd(48));
  else if (e.type === 'stage' && e.status !== 'start') console.log(`\r  ${e.status === 'error' ? c.red('✗') : e.status === 'skip' ? c.dim('◌') : c.green('●')} ${e.detail ?? ''}`.padEnd(48));
  else if (e.type === 'log' && flags.has('--ayrinti')) console.log(c.dim(`  ${e.text}`));
};

const HELP = `
Zena'nın video pipeline'ı

  npm run new -- 2026-10-kisa-baslik [--egitim]   yeni video klasörü
  npm run lint -- <klasör>                         script kontrolü (işaret sözlüğü + kalite listesi)
  npm run timing -- <klasör> [--force]             Descript altyazısından (footage/kurgu.srt) kelime zamanları
  npm run assets -- <klasör> [--force]             haber ekran görüntüsü, PDF vurgusu, arşiv fotoğrafı adayları, eksik listesi
  npm run foto -- <klasör> [<dosya.jpg> <no>]      arşiv fotoğrafı adaylarını listele / birini seç
  npm run align -- <klasör> [--force]              işaretleri sese hizalar → build/scenes.json (girdiler değişmediyse atlar)
  npm run studio -- [<klasör>]                     Remotion Studio önizleme (klasörsüz: bileşen galerisi)
  npm run render -- <klasör> [--oneriler] [--katman] [--kareler 0-299] [--force] [--tam] [--ayrinti]
  npm run pipeline -- <klasör> [--render]          lint → zamanlama → assets → align (→ render)

<klasör>: videos/2026-10-kisa-baslik ya da sadece 2026-10-kisa-baslik
`;

const main = async () => {
  switch (cmd) {
    case 'new':
      return cmdNew();
    case 'lint': {
      const r = cmdLint(resolveVideoDir(target));
      process.exitCode = r.res.issues.some((i) => i.level === 'hata') ? 1 : 0;
      return;
    }
    case 'timing':
    case 'transcribe':
      return cmdTiming(resolveVideoDir(target));
    case 'assets': {
      const dir = resolveVideoDir(target);
      await cmdAssets(dir);
      return;
    }
    case 'align': {
      const dir = resolveVideoDir(target);
      const scenes = cmdAlign(dir);
      writeReport(dir, {lint: cmdLint(dir, true), scenes});
      return;
    }
    case 'foto':
      return cmdFoto(resolveVideoDir(target));
    case 'studio':
      return cmdStudio(target && !target.startsWith('--') ? resolveVideoDir(target) : null);
    case 'render':
      return await cmdRender(resolveVideoDir(target));
    case 'all': {
      const dir = resolveVideoDir(target);
      const lint = cmdLint(dir);
      if (lint.res.issues.some((i) => i.level === 'hata') && flags.has('--siki')) throw new Error("Script'te hata var (--siki)");
      cmdTiming(dir);
      const assets = await cmdAssets(dir);
      const scenes = cmdAlign(dir);
      writeReport(dir, {lint, assets, scenes});
      if (flags.has('--render')) await cmdRender(dir);
      else console.log(c.dim(`\n  Önizleme: npm run studio -- ${path.relative(ROOT, dir)}\n  Render:   npm run render -- ${path.relative(ROOT, dir)}`));
      return;
    }
    default:
      console.log(HELP);
  }
};

main().catch((e) => {
  console.error(c.red(`\n✗ ${e.message}`));
  process.exit(1);
});

