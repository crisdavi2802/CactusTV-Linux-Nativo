#!/bin/bash
# Compila los cuatro instaladores desde codigo/.
# Uso:
#   scripts/compilar.sh
#   CACTUS_ELECTRON_DIST=/ruta/a/electron/dist scripts/compilar.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/codigo"

if [ ! -x node_modules/.bin/electron-builder ]; then
  npm install
fi

DIST="${CACTUS_ELECTRON_DIST:-$ROOT/codigo/node_modules/electron/dist}"
if [ ! -d "$DIST" ]; then
  echo "No encuentro Electron en: $DIST" >&2
  exit 1
fi

for target in AppImage deb rpm pacman; do
  echo "=== $target ==="
  node_modules/.bin/electron-builder --x64 -c.electronDist="$DIST" -c.linux.target="$target"
done
