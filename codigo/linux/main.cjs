'use strict';
/* Cactus TV Linux — ventana delgada (sin codigo del .exe de Windows).
 * Electron se usa solo como contenedor Chromium equivalente a un navegador:
 * toda la interfaz y los datos vienen del backend local de la app de TV. */
const { app, BrowserWindow, shell, session, dialog, ipcMain } = require('electron');
const path = require('node:path');
const { startService } = require('./service.cjs');

ipcMain.on('cactus:fullscreen', (_event, enabled) => {
  if (win && !win.isDestroyed()) win.setFullScreen(!!enabled);
});
ipcMain.handle('cactus:info', () => ({ platform: 'linux', backend: backend ? backend.url : null }));

app.setName('Cactus TV');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
/* Optimizacion XuperDesktop 0.2.0/Linux: menos memoria compartida y sin
 * traduccion automatica (menos procesos/IPC en segundo plano). */
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-features', 'Translate');
/* Sandbox activado por defecto; solo se desactiva de forma explicita. */
const noSandboxEnv = process.env.CACTUS_NO_SANDBOX === '1';
/* El AppRun de AppImage anade --no-sandbox cuando no hay user namespaces.
   No aceptamos ese flag implicito: sin CACTUS_NO_SANDBOX=1 la app se cierra
   en vez de quedar ejecutandose sin aislamiento. */
if (process.argv.includes('--no-sandbox') && !noSandboxEnv) {
  dialog.showErrorBox('Cactus TV', 'El lanzador intento desactivar el sandbox. No se permite sin CACTUS_NO_SANDBOX=1.');
  app.exit(1);
}
if (noSandboxEnv) app.commandLine.appendSwitch('no-sandbox');
if (!app.requestSingleInstanceLock()) app.quit();

let backend = null;
let win = null;

app.whenReady().then(async () => {
  backend = await startService({ root: path.resolve(__dirname, '..') });
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'fullscreen');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'fullscreen');
  win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 800, minHeight: 480,
    backgroundColor: '#080a0d', title: 'Cactus TV', autoHideMenuBar: true,
    show: false,
    icon: path.resolve(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      /* Optimizacion XuperDesktop 0.1.6 -> 0.2.0: la ventana oculta no consume
       * CPU; el throttling se desactiva solo durante la reproduccion. */
      backgroundThrottling: true,
      webSecurity: true, allowRunningInsecureContent: false
    }
  });
  /* Trazas temporales de depuracion del port (se pueden quitar despues). */
  win.webContents.on('console-message', (_e, _level, message) => console.log('[renderer]', message));
  win.webContents.on('request-failed', (details) => console.log('[netfail]', details.error, details.url));
  win.webContents.on('did-fail-load', (_e, code, description, url, isMain) => {
    if (!isMain) console.log('[subfail]', code, description, url);
  });
  const setPlaybackActive = (active) => {
    try { win.webContents.setBackgroundThrottling(!active); } catch {}
  };
  win.webContents.on('media-started-playing', () => setPlaybackActive(true));
  win.webContents.on('media-paused', () => setPlaybackActive(false));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(github\.com|ko-fi\.com|buymeacoffee\.com)$/i.test(new URL(url).origin)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(backend.url + '/')) event.preventDefault();
  });
  win.webContents.on('will-redirect', (event, url) => {
    if (!url.startsWith(backend.url + '/')) event.preventDefault();
  });
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.on('did-fail-load', (_e, code, description, url, isMain) => {
    if (isMain && code !== -3) dialog.showErrorBox('Cactus TV', `No se pudo cargar la interfaz local (${code}): ${description}`);
  });
  await win.loadURL(backend.url + '/');
}).catch((error) => {
  dialog.showErrorBox('Cactus TV', error.message);
  app.quit();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (backend) backend.stop(); });
