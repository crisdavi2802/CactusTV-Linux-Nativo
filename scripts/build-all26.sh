#!/bin/sh
cd "/home/cristian/Documentos/Proyecto predeterminado/CactusTV-Linux-Nativo" || exit 1
for target in AppImage deb rpm pacman; do
  echo "=== $target ==="
  /home/cristian/node_modules/.bin/electron-builder --x64 \
    -c.electronDist=/home/cristian/Documentos/XuperDesktop-Linux-0.2.0/node_modules/electron/dist \
    -c.linux.target="$target" || exit 1
done
