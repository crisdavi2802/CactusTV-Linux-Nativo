# Aviso legal y de uso

Este proyecto es un porteo no oficial de Cactus TV para Linux, basado en la aplicación publicada en:

<https://cactus-tv-web.pages.dev/>

El catálogo `backend/app/wepa-catalog.json` contiene enlaces incluidos en un APK facilitado por terceros. Su inclusión aquí no implica autorización de retransmisión ni afirmación de derechos sobre los canales.

**El uso de esta aplicación, de sus enlaces y de cualquier contenido al que acceda es responsabilidad exclusiva de cada usuario.** Verifica licencias, permisos y leyes locales antes de reproducir o redistribuir contenido.

## Aislamiento

La ventana Electron se ejecuta con:

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`.
- Sandbox de Chromium activo por defecto. `--no-sandbox` solo se permite con `CACTUS_NO_SANDBOX=1`.
- Backend local escuchando únicamente en `127.0.0.1`.
- Perfil AppArmor estándar de Electron (Ubuntu 24+) y `chrome-sandbox` con SUID condicional cuando no hay user namespaces.

Estas medidas reducen superficie de ataque, **no garantizan seguridad absoluta** ni cubren el contenido externo reproducido.

## No afiliación

No afiliado con Cactus TV, XuperTV ni con los emisores de los canales. Marcas y contenidos pertenecen a sus respectivos titulares.
