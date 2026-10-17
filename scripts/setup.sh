#!/usr/bin/env bash
# Tek seferlik kurulum: npm paketleri, Python ortamı (PDF vurgusu için PyMuPDF), Chromium (haber ekran görüntüleri).
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
# Apple Silicon'da Python paketleri her zaman arm64 kurulur (Node Rosetta altında olsa bile).
PYRUN=""
if [ "$(uname)" = "Darwin" ] && [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then PYRUN="arch -arm64"; fi
$PYRUN python3 -m venv .venv
$PYRUN .venv/bin/python -m pip install --upgrade pip >/dev/null
$PYRUN .venv/bin/python -m pip install -r requirements.txt
npx playwright install chromium
echo "Kurulum tamam."
