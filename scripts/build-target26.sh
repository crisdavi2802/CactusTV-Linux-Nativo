#!/bin/sh
TARGET="$1"
cd "/home/cristian/Documentos/Proyecto predeterminado/CactusTV-Linux-Nativo" || exit 1
/home/cristian/node_modules/.bin/electron-builder --x64 \
  -c.electronDist=/home/cristian/Documentos/XuperDesktop-Linux-0.2.0/node_modules/electron/dist \
  -c.linux.target="$TARGET"
