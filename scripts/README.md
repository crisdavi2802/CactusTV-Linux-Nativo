# Scripts

- `compilar.sh`: compila AppImage, deb, rpm y pacman desde `codigo/`.
  - Por defecto usa el Electron instalado por `npm install` en `codigo/node_modules/electron/dist`.
  - Para reproducir los artefactos originales, define `CACTUS_ELECTRON_DIST` apuntando a `XuperDesktop-Linux-0.2.0/node_modules/electron/dist`.
- `build-target26.sh`, `build-all26.sh`, `launch-appimage.sh`, `launch-deb.sh`: helpers usados durante la verificación local (rutas absolutas del equipo original).
