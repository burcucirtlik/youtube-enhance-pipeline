#!/usr/bin/env bash
# Masaüstüne "YouTube Enhance.app" koyar: çift tıklayınca bu projedeki uygulamayı başlatır.
# Paket, projenin yolunu içerir; proje klasörü taşınırsa scripti yeniden çalıştır.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$HOME/Desktop/YouTube Enhance.app}"
[ -f "$ROOT/electron/icon.icns" ] || (cd "$ROOT" && npx tsx scripts/make-icon.ts)

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$ROOT/electron/icon.icns" "$APP/Contents/Resources/icon.icns"

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>YouTube Enhance</string>
  <key>CFBundleDisplayName</key><string>YouTube Enhance</string>
  <key>CFBundleIdentifier</key><string>com.zena.youtube-enhance.launcher</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSUIElement</key><true/>
</dict></plist>
EOF

# Başlatıcı Terminal açmadan çalışır; çıktılar ~/Library/Logs'a yazılır.
cat > "$APP/Contents/MacOS/launch" <<EOF
#!/bin/bash
# Önce projenin kendi Node'u (.runtime/node, arm64), yoksa sistemdeki.
export PATH="$ROOT/.runtime/node/bin:/usr/local/bin:/opt/homebrew/bin:\$HOME/.nvm/current/bin:\$PATH"
LOG="\$HOME/Library/Logs/YouTubeEnhance.log"
cd "$ROOT" || { osascript -e 'display alert "YouTube Enhance" message "Proje klasörü bulunamadı: $ROOT"'; exit 1; }
if [ -z "\$(command -v node)" ]; then osascript -e 'display alert "YouTube Enhance" message "Node bulunamadı. Terminalde \"npm run app\" ile dene."'; exit 1; fi
echo "=== \$(date) başlatılıyor" >> "\$LOG"
exec npm run app >> "\$LOG" 2>&1
EOF
chmod +x "$APP/Contents/MacOS/launch"

# Finder ikonu hemen yenilesin.
touch "$APP"
echo "✓ $APP"
