#!/bin/sh
LOG=/tmp/opencode/cactus-appimage-live.log
PIDFILE=/tmp/opencode/cactus-appimage-live.pid
APP="/home/cristian/Documentos/Proyecto predeterminado/CactusTV-Linux-Nativo/release/cactus-tv-1.0.0-rc.1-x86_64.AppImage"
: > "$LOG"
CACTUS_NO_SANDBOX=1 "$APP" --no-sandbox >> "$LOG" 2>&1 &
echo $! > "$PIDFILE"
echo "PID=$(cat "$PIDFILE")"
