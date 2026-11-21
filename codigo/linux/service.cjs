'use strict';
/* Cactus TV Linux — adaptador de servicio local.
 *
 * Sustituye a:
 *   - service.js de webOS (Luna Service + node18 ARM)
 *   - android-service.cjs del APK (libnode + token + WebView)
 * Ni uno ni otro se usan aqui. Se arranca el backend JS comun con el Node del
 * sistema (o con el runtime Node de Electron), escuchando solo en 127.0.0.1.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}
function waitFor(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function attempt() {
      const socket = net.connect(port, '127.0.0.1');
      const done = (ok) => { socket.destroy(); ok ? resolve() : (Date.now() > deadline ? reject(Error('El backend no respondio a tiempo')) : setTimeout(attempt, 150)); };
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
      socket.setTimeout(1200, () => done(false));
    })();
  });
}

async function startService(options = {}) {
  const root = options.root || path.resolve(__dirname, '..');
  const backend = path.join(root, 'backend');
  const dataDir = options.dataDir || process.env.CACTUS_DATA_DIR || path.join(os.homedir(), '.local', 'share', 'cactus-tv-linux');
  fs.mkdirSync(dataDir, { recursive: true });

  /* El backend es Node puro: si estamos dentro de Electron, reutilizamos su
   * runtime con ELECTRON_RUN_AS_NODE=1; si hay `node` en PATH, se usa ese. */
  let runtime = process.execPath;
  const env = Object.assign({}, process.env);
  /* En el AppImage el binario se llama `cactus-tv`, no `electron`, asi que
   * comprobar el nombre daba lugar a lanzar otra GUI en vez del backend Node.
   * process.versions.electron es fiable tanto en electron suelto como en
   * AppImage/deb/rpm/pacman. */
  if (process.versions && process.versions.electron) {
    env.ELECTRON_RUN_AS_NODE = '1';
  }
  const port = await freePort();
  const token = crypto.randomBytes(32).toString('hex');
  env.PORT = String(port);
  env.TMPDIR = path.join(dataDir, 'tmp');
  env.XDG_CACHE_HOME = path.join(dataDir, 'cache');
  env.CACTUS_PLATFORM = 'linux';
  env.CACTUS_DATA_DIR = dataDir;
  fs.mkdirSync(env.TMPDIR, { recursive: true });

  console.error('[cactus service] runtime=' + runtime + ' electron=' + !!(process.versions && process.versions.electron) + ' port=' + port);
  /* `backend` esta dentro de app.asar: no existe como directorio real, asi
   * que usarlo como cwd bloquea el spawn en el AppImage. El script se pasa
   * por ruta absoluta (asar la entiende) y el cwd es un directorio real. */
  const child = spawn(runtime, [path.join(backend, 'server.js')], {
    cwd: dataDir, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  let lastError = '';
  child.stderr.on('data', (chunk) => {
    lastError = String(chunk).slice(-400);
    process.stderr.write(chunk);   // trazas del relay (depuracion del port)
  });
  child.on('error', (error) => { lastError = error.message; console.error('[cactus service] spawn error: ' + error.message); });
  child.on('exit', (code, signal) => console.error('[cactus service] child exit code=' + code + ' signal=' + signal + ' last=' + lastError));
  try {
    await waitFor(port);
  } catch (error) {
    try { child.kill('SIGTERM'); } catch {}
    throw new Error(`${error.message} ${lastError}`.trim());
  }
  const url = `http://127.0.0.1:${port}`;
  fs.writeFileSync(path.join(dataDir, 'ready.json'), JSON.stringify({ port, url, token, pid: child.pid }, null, 2));
  return {
    url, port, token, dataDir, child,
    stop: () => new Promise((resolve) => {
      if (child.killed) return resolve();
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} resolve(); }, 3000);
    })
  };
}
module.exports = { startService };
