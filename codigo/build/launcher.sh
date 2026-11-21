#!/bin/bash
# Cactus TV Linux — lanzador portable.
# No usa `bwrap --unshare-all`: eso rompia el sandbox de Chromium en el port
# anterior (start-cactus.bash). El aislamiento se mantiene en el renderer.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
export CACTUS_DATA_DIR="${CACTUS_DATA_DIR:-$HERE/datos}"
mkdir -p "$CACTUS_DATA_DIR"
# En equipos sin chrome-sandboxConfigurado (root:root 4755), Electron aborta
# antes de leer los switches de app.commandLine; hay que pasarlo como argumento.
EXTRA=()
[ "${CACTUS_NO_SANDBOX:-0}" = "1" ] && EXTRA+=(--no-sandbox)
exec "$HERE/cactus-tv" "${EXTRA[@]}" "$@"
