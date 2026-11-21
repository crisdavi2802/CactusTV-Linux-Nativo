# Análisis y diseño del port nativo Linux de Cactus TV

## 1. Qué hay en los instalables

| Archivo | Contenido real | Sirve de base |
|---|---|---|
| `CactusTV_LG_*_2.0.41*.ipk` | App webOS: `service.js` (Luna), `bin/node18` ARM + libs, `backend/server.js` (relay HTTP en `127.0.0.1`), `backend/app/` | **Sí**: `server.js` + `image-cache.js` (Node puro) |
| `CactusTV_LG_Clasico_3.0.0_webOS4_ARMv7.ipk` | Igual, más temas "Desierto" e imágenes | Donante de tema |
| `CactusTV_Samsung_*_051.wgt` | Widget Tizen: 41 JS + CSS + **catálogos** (`catalog-bootstrap.json` 27 MB, `catalog-start.json`, `wepa-catalog.json`, `sports-extras.json`) | **Sí**: UI + bases de datos |
| `CactusTV-TVBox-AutoVPN-1.3.4.apk` | `assets/backend/`: `server.js` + `src/*` + `providers/*` + UI + `libnode.so`, `libopenvpn.so` (x86_64 incluido) | Donante opcional (anime, Kino, Stremio, VPN) |
| `CactusTV-TVBox-1.3.4.apk` | Igual sin VPN ni x86_64 | Donante opcional |
| `CactusTV-Windows-1.2.23-Instalar.exe` | NSIS → Electron 45 + `app.asar`: `desktop/main.cjs` con esquema `cactus://`, `native-transport.cjs`, `hevc-native.cjs`, mismos catálogos | **No** |
| `CactusTV-LG-Installer-Android-v0.2.0-beta.apk` | Instalador de TV, sin backend útil | No |

## 2. Por qué falló el port anterior

El intento anterior (`CactusTV-Port`, `start-cactus.bash`) partía solo del `.exe`:
- Copiaba `desktop/main.cjs` y `build/` pero **no incluía `public/` ni los JSON de catálogo** → la UI no encontraba las bases de datos (`catalog-bootstrap.json`, `catalog-start.json`, `wepa-catalog.json`, `sports-extras.json`).
- El Windows usa API directa desde el renderer con esquema `cactus://` y módulos nativos (`hevc-native.cjs`, DNS, PiP) que no existen en Linux.
- El lanzador envolvía Electron con `bwrap --unshare-all` y pasaba `--no-sandbox` por la variable `ELECTRON_OPTIONS` (Electron no la lee) → `FATAL:sandbox`.
- `desktop/*.cjs` era solo un archivo de constantes globales, no una aplicación.

## 3. Arquitectura del port nuevo

```
backend/server.js  (IPK LG, Node puro)  ── sirve backend/app/ (WGT Samsung)
        ▲
        │ fetch/XHR/img/video → /r?u=...  (ruta nueva, mismas validaciones)
linux/transport.js (nuevo) ── inyectado en index.html
linux/service.cjs  (nuevo) ── reemplaza service.js (webOS) y android-service.cjs
linux/main.cjs + preload.cjs (nuevos) ── ventana delgada, sin código Windows
build/launcher.sh + package.json ── AppImage/deb/rpm/pacman, datos portables
```

El backend es JavaScript estándar: se ejecuta con `node` del sistema o con el runtime Node de Electron (`ELECTRON_RUN_AS_NODE=1`, verificado v20.18.0). No se usa el `node18` ARM del IPK ni `libnode.so` del APK.

## 4. Optimizaciones de CPU/RAM tomadas de los ports Xuper

Aplicadas ya en este port:

| Optimización | Origen | Dónde se aplicó |
|---|---|---|
| `backgroundThrottling: true` + `setBackgroundThrottling(!active)` en `media-started-playing` / `media-paused` | `XuperDesktop-Linux-0.1.6/desktop/main.cjs` → `0.2.0` (`OPTIMIZACIONES-BAJO-CONSUMO.md` §1) | `linux/main.cjs` |
| Flags `--disable-dev-shm-usage` y `--disable-features=Translate` | `0.2.0` §2, `XuperTV-Linux-2.1/docs/Cambios/CAMBIOS-1.3-A-2.1.md` §4.2 | `linux/main.cjs` |
| Sandbox de Chromium activo por defecto; `--no-sandbox` solo con variable de entorno | `0.2.0` §3 | `linux/main.cjs` (`CACTUS_NO_SANDBOX=1`) |
| Sin `bwrap --unshare-all` (rompía el sandbox) | Fallo documentado en `start-cactus.bash` | `build/launcher.sh` |
| Permisos restringidos a `fullscreen`, `will-navigate`/`will-redirect` limitados al loopback, `will-attach-webview` bloqueado | `XuperTV-Linux-2.1/desktop/main.cjs` L25-29, `0.2.0/desktop/main.cjs` | `linux/main.cjs` |
| Instancia única (`requestSingleInstanceLock`) | 2.1 / 0.2.0 | `linux/main.cjs` |
| Caché de imágenes (32 MB, TTL 6 h) en el relay | IPK LG `backend/image-cache.js` | `backend/` |
| Catálogo local de 27 MB cargado una vez (menos llamadas API y menos parseo en cada arranque en caliente) | WGT Samsung `catalog-bootstrap.json` | `backend/app/` |
| Sin fotograma de telemetría/actualizador en segundo plano | `XuperDesktop-Linux-0.1.6/0.2.0` (sin telemetría) | Diseño del port |

Diferencia importante: **el camino normal no usa ffmpeg**. El backend retransmite bytes directamente (`pipeRemote`), por lo que el 99 % del catálogo H.264 no recodifica (0 % de CPU de transcodificación). Los ports Xuper sí usaban ffmpeg local; de ellos se toma el patrón de **no recodificar cuando no hace falta** (`-c:v copy` en `XuperTV-Linux-2.1/server/media.cjs` L11-12). En Cactus ese papel ya lo cumple el proxy directo, así que no se ha añadido un relay para H.264.

El único caso con ffmpeg es el fallback HEVC (`backend/hevc-hls.js`), donde Chromium no puede decodificar `hvc1` en MediaSource:

| Optimización | Origen | Dónde se aplicó |
|---|---|---|
| Sincronización del catálogo retrasada 5 min, intervalo 30 min y solo con 60 s de inactividad | Análisis de CPU local (el `poll()` a los 15 s quemaba ~100 % del worker) | `linux/runtime-config.js`, `backend/app/direct-catalog-sync.js` |
| Probe de VAAPI una sola vez, con timeout de 8 s y device configurable (`CACTUS_VAAPI`, `CACTUS_VAAPI_DEVICE`) | Detección HW de `XuperDesktop-Linux-0.2.0/service/ffmpeg-relay.js` | `backend/hevc-hls.js` |
| `h264_vaapi` (+ `-hwaccel vaapi`) en la ruta HEVC; `libx264` limitado a 2 hilos como fallback | XuperTV 2.1 evita recodificar; aquí GPU/flujo limitado | `backend/hevc-hls.js` |
| `ffprobe` con `-rw_timeout 8000000` y timeout de proceso 8 s | `CAMBIOS...` §4.4, `server/app.cjs` de XuperTV 2.1 | `backend/hevc-hls.js` |
| 4 descargas Rangos en paralelo (antes 8) | Medición local de saturación del relay | `backend/hevc-hls.js` |
| ffmpeg/ffprobe del sistema; `ffprobe` derivado de `CACTUS_FFMPEG` | `XuperTV-Linux-2.1/desktop/platform.cjs` | `backend/hevc-hls.js`, dependencias `deb`/`rpm`/`pacman` |

Medición local tras el cambio: renderer ~1 % CPU y DedicatedWorker ~0,3 % en reposo (antes ~70-100 % por la sincronización a los 15 s); el probe VAAPI detecta `/dev/dri/renderD128` y un segmento de 4 s tarda ~0,9 s de CPU con GPU frente a ~4,3 s con `libx264`.

## 5. Verificación rápida

```bash
P="/home/cristian/Documentos/Proyecto predeterminado/CactusTV-Linux-Nativo"
E="/home/cristian/Documentos/XuperDesktop-Linux-0.2.0/node_modules/electron/dist/electron"
ELECTRON_RUN_AS_NODE=1 "$E" -e "require('$P/linux/service.cjs').startService().then(s=>console.log(s.url))"
```

El servicio imprime `http://127.0.0.1:<puerto>/` y escribe `~/.local/share/cactus-tv-linux/ready.json`.
