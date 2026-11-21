#!/bin/sh
LOG=/tmp/opencode/cactus-deb-live.log
PIDFILE=/tmp/opencode/cactus-deb-live.pid
APP="/opt/Cactus TV/cactus-tv"
: > "$LOG"
CACTUS_NO_SANDBOX=1 "$APP" --no-sandbox >> "$LOG" 2>&1 &
echo $! > "$PIDFILE"
echo "PID=$(cat "$PIDFILE")"
