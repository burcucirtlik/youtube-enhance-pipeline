#!/usr/bin/env bash
# Projeye özel Node: .runtime/node (resmî nodejs.org paketi, SHA-256 doğrulamalı).
# Neden: sistemdeki Node x86_64 (Rosetta) ve Remotion/esbuild yerel ikilileri onunla x64 kuruluyordu;
# Apple Silicon'da render ~3 kat yavaştı. Masaüstü ikonu ve Electron bu Node'u kullanır.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${NODE_VERSION:-v25.9.0}"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) PLATFORM=darwin-arm64 ;;
  Darwin-x86_64) [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ] && PLATFORM=darwin-arm64 || PLATFORM=darwin-x64 ;;
  Linux-x86_64) PLATFORM=linux-x64 ;;
  Linux-aarch64) PLATFORM=linux-arm64 ;;
  *) echo "Desteklenmeyen platform: $(uname -s)-$(uname -m)"; exit 1 ;;
esac
if [ -x .runtime/node/bin/node ] && [ "$(.runtime/node/bin/node -v)" = "$VERSION" ]; then
  echo "✓ .runtime/node $VERSION ($PLATFORM) zaten kurulu"; exit 0
fi
NAME="node-$VERSION-$PLATFORM"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -sSfL "https://nodejs.org/dist/$VERSION/$NAME.tar.gz" -o "$TMP/$NAME.tar.gz"
curl -sSfL "https://nodejs.org/dist/$VERSION/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt"
(cd "$TMP" && grep " $NAME.tar.gz\$" SHASUMS256.txt | shasum -a 256 -c -)
tar -xzf "$TMP/$NAME.tar.gz" -C "$TMP"
mkdir -p .runtime && rm -rf .runtime/node && mv "$TMP/$NAME" .runtime/node
echo "✓ .runtime/node $(.runtime/node/bin/node -v) $(.runtime/node/bin/node -p process.arch)"
