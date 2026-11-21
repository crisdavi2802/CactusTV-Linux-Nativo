# Flatpak / Flathub

El bundle `release/cactus-tv-1.0.0-rc.1-x86_64.flatpak` se genera con el target `flatpak` de electron-builder.

## Compilar

```bash
scripts/compilar.sh
```

o directamente:

```bash
cd codigo
npm install
TMPDIR="$PWD/.flatpak-tmp" node_modules/.bin/electron-builder --x64 \
  -c.electronDist="$PWD/node_modules/electron/dist" \
  -c.linux.target=flatpak
```

Para reproducir el bundle original usa `CACTUS_ELECTRON_DIST` apuntando a `XuperDesktop-Linux-0.2.0/node_modules/electron/dist`.

## Instalar el bundle

```bash
flatpak install --user ./cactus-tv-1.0.0-rc.1-x86_64.flatpak
flatpak run com.cocotecnico.cactustv.linux
```

## Permisos

El manifiesto generado usa:

- `org.freedesktop.Platform` / `org.electronjs.Electron2.BaseApp` 24.08.
- `wayland`, `x11`, `ipc`, `pulseaudio`, `dri`, `home`, `network` y notificaciones.

El backend sigue escuchando solo en `127.0.0.1`. El sandbox de Chromium y las opciones de Electron se mantienen igual que en los demás artefactos.

Para una futura publicación en Flathub haría falta un repo de manifiesto separado con el source tarball y la identified request; este bundle es el artefacto instalable.
