#!/usr/bin/env bash
# Tek seferlik kurulum: projeye özel Node (.runtime/node), npm paketleri, Python ortamı (PDF vurgusu için PyMuPDF),
# Chromium (haber ekran görüntüleri). Paketler bu Node ile kurulur ki yerel ikililer (Remotion, esbuild) doğru mimaride olsun.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/setup-node.sh
export PATH="$PWD/.runtime/node/bin:$PATH"
npm install
# Apple Silicon'da Python paketleri her zaman arm64 kurulur (Node Rosetta altında olsa bile).
PYRUN=""
if [ "$(uname)" = "Darwin" ] && [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then PYRUN="arch -arm64"; fi
$PYRUN python3 -m venv .venv
$PYRUN .venv/bin/python -m pip install --upgrade pip >/dev/null
$PYRUN .venv/bin/python -m pip install -r requirements.txt
npx playwright install chromium
echo "Kurulum tamam."
