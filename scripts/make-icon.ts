// Uygulama ikonunu üretir: HTML ile çizilir, Playwright ile 1024×1024 PNG alınır,
// sips + iconutil ile macOS .icns yapılır. Çıktı: electron/icon.png, electron/icon.icns

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {brand} from '../brand/brand';

const OUT = path.resolve(import.meta.dirname, '../electron');

// Matrix/siberpunk kimlik: koyu zemin, neon yeşil "play" üçgeni ve 📍 işaret çizgisi.
const html = `<!doctype html><html><body style="margin:0;width:1024px;height:1024px;background:transparent">
<div style="position:absolute;inset:60px;border-radius:230px;background:radial-gradient(circle at 50% 35%, #0b2a1b 0%, ${brand.colors.bg} 70%);overflow:hidden;box-shadow:inset 0 0 0 6px rgba(0,255,136,0.35)">
  <div style="position:absolute;inset:0;opacity:.18;background-image:linear-gradient(${brand.colors.accent} 1px, transparent 1px),linear-gradient(90deg, ${brand.colors.accent} 1px, transparent 1px);background-size:64px 64px"></div>
  <div style="position:absolute;inset:0;opacity:.12;background:repeating-linear-gradient(0deg, rgba(0,0,0,.9) 0 3px, transparent 3px 6px)"></div>
  <svg viewBox="0 0 1024 1024" width="1024" height="1024" style="position:absolute;left:-60px;top:-60px">
    <defs><filter id="g"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <polygon points="400,300 400,724 740,512" fill="none" stroke="${brand.colors.accent}" stroke-width="34" stroke-linejoin="round" filter="url(#g)"/>
    <polygon points="400,300 400,724 740,512" fill="rgba(0,255,136,0.12)"/>
    <line x1="230" y1="820" x2="794" y2="820" stroke="${brand.colors.accent2}" stroke-width="14" stroke-linecap="round" opacity=".9"/>
    <rect x="290" y="796" width="110" height="48" rx="8" fill="${brand.colors.accent}"/>
    <rect x="470" y="796" width="70" height="48" rx="8" fill="${brand.colors.accent2}"/>
    <rect x="600" y="796" width="150" height="48" rx="8" fill="${brand.colors.accent}" opacity=".7"/>
  </svg>
</div></body></html>`;

const main = async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const png = path.join(OUT, 'icon.png');
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1024, height: 1024}, deviceScaleFactor: 1});
  await page.setContent(html);
  await page.screenshot({path: png, omitBackground: true});
  await browser.close();

  const iconset = path.join(os.tmpdir(), 'yt-enhance.iconset');
  fs.rmSync(iconset, {recursive: true, force: true});
  fs.mkdirSync(iconset);
  for (const s of [16, 32, 128, 256, 512]) {
    execFileSync('sips', ['-z', String(s), String(s), png, '--out', path.join(iconset, `icon_${s}x${s}.png`)], {stdio: 'ignore'});
    execFileSync('sips', ['-z', String(s * 2), String(s * 2), png, '--out', path.join(iconset, `icon_${s}x${s}@2x.png`)], {stdio: 'ignore'});
  }
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(OUT, 'icon.icns')]);
  console.log(`✓ ${path.relative(process.cwd(), png)}, icon.icns`);
};

main();
