# Cactus TV — port nativo Linux (nuevo)

Basado en el **núcleo JS de las versiones de televisión** (IPK de LG webOS + WGT de Samsung Tizen), no en el `.exe` de Windows ni en Android. Ver `ANALISIS.md`.

## Estructura

- `backend/server.js`, `backend/image-cache.js` — relay HTTP local del IPK LG (Node puro).
- `backend/app/` — UI y catálogos del WGT Samsung (`catalog-bootstrap.json`, `catalog-start.json`, `wepa-catalog.json`, `sports-extras.json`).
- `linux/service.cjs` — arranca el backend en `127.0.0.1` con puerto efímero y `ready.json`.
- `linux/transport.js` — redirige peticiones externas al relay (`/r?u=...`) para evitar CORS.
- `linux/main.cjs`, `linux/preload.cjs` — ventana delgada Electron (solo contenedor Chromium).
- `build/launcher.sh` — lanzador portable con `CACTUS_DATA_DIR`.

## Probar el backend sin interfaz

```bash
E="/home/cristian/Documentos/XuperDesktop-Linux-0.2.0/node_modules/electron/dist/electron"
ELECTRON_RUN_AS_NODE=1 "$E" -e \
  "require('/home/cristian/Documentos/Proyecto predeterminado/CactusTV-Linux-Nativo/linux/service.cjs').startService().then(s=>console.log(s.url))"
```

## Compilar

Con Node 22+/npm disponibles:

```bash
npm install
npm run build:all     # AppImage, deb, rpm, pacman
```

Los cuatro instaladores se generan en `release/`. Usa **electron-builder 26.18.0** (el 24.13.3 falla al crear RPM con `rpm` 6). Los paquetes `deb`/`rpm`/`pacman` declaran `ffmpeg` como dependencia; el AppImage usa el ffmpeg del sistema. En esta máquina los artefactos ya están compilados y el AppImage arranca correctamente.

Si solo se quiere probar con el Electron ya descargado, se puede forzar el runtime sin tocar `node_modules`:

```bash
E="/home/cristian/Documentos/XuperDesktop-Linux-0.2.0/node_modules/electron/dist/electron"
B="/tmp/opencode/eb26/node_modules/.bin/electron-builder"
"$B" --linux AppImage deb rpm pacman --x64 \
  -c.electronDist="$(dirname "$E")"
```

Opciones de ffmpeg en el fallback HEVC: `CACTUS_FFMPEG`, `CACTUS_FFPROBE`, `CACTUS_VAAPI=0|1|auto`, `CACTUS_VAAPI_DEVICE`, `CACTUS_TRANSCODE_THREADS` y `CACTUS_DOWNLOAD_WORKERS`.

## Datos portables

Por defecto: `~/.local/share/cactus-tv-linux/`. Si se define `CACTUS_DATA_DIR`, todo (caché de imágenes, `ready.json`, preferencias) queda junto al ejecutable.

## Optimizaciones aplicadas

Ver sección 4 de `ANALISIS.md`: throttling dinámico en segundo plano, flags ligeros de Chromium, sandbox por defecto, sin `bwrap --unshare-all`, caché de imágenes y catálogo local de 27 MB.
