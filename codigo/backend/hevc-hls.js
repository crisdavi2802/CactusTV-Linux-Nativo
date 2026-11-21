'use strict';
/* Cactus TV Linux — compatibilidad HEVC.
 *
 * Electron/Chromium en Linux no incluye decodificador HEVC en MediaSource,
 * mientras que parte del catalogo Cactus solo ofrece variantes hvc1/h265.
 * Este modulo lanza ffmpeg (binario del sistema) para convertir ESOS casos a
 * H.264 + AAC y exponerlos como HLS local; el resto del catalogo sigue usando
 * el motor directo original sin transcodificar nada.
 *
 * El CDN entrega el TS a velocidad real, asi que convertir "en directo" no
 * deja margen para adelantar. Ademas de la conversion inicial, el fichero
 * completo se baja en paralelo mediante peticiones Range; cuando termina se
 * publica una playlist VOD y cada segmento que falte se genera bajo demanda
 * con ffmpeg -ss sobre el fichero local. Resultado: seek a cualquier minuto.
 *
 * Seguridad: id aleatorio, nombre de segmento validado y unico acceso a
 * Internet a traves del relay /r del propio backend.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

function findOnPath(name) {
  const dirs = String(process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    try {
      const candidate = path.join(dir, name);
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch (_) {}
  }
  return null;
}
/* Igual que XuperTV 2.1: ffmpeg del sistema, ffprobe derivado del propio ffmpeg
 * cuando no se indica de forma explicita. Se admite CACTUS_FFMPEG=ffmpeg
 * (buscar en PATH) para no depender de /usr/bin. */
const FFMPEG = process.env.CACTUS_FFMPEG ||
  (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : (findOnPath('ffmpeg') || 'ffmpeg'));
const FFPROBE = process.env.CACTUS_FFPROBE || FFMPEG.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
const PRESET = process.env.CACTUS_TRANSCODE_PRESET || 'ultrafast';
const CRF = process.env.CACTUS_TRANSCODE_CRF || '23';
const SCALE = process.env.CACTUS_TRANSCODE_SCALE || '800:-2';
const THREADS = Math.max(1, Number(process.env.CACTUS_TRANSCODE_THREADS) || 2);
const VAAPI_MODE = String(process.env.CACTUS_VAAPI || 'auto').toLowerCase();
const SEGMENT_SECONDS = 4;
const PLAYLIST_SIZE = 600;
const MAX_SESSIONS = 2;
const TTL_MS = 45 * 60 * 1000;
const CHUNK_BYTES = 4 * 1024 * 1024;
/* 8 descargas en paralelo saturaban el relay Node y el CDN; 4 basta. */
const DOWNLOAD_WORKERS = Math.max(1, Number(process.env.CACTUS_DOWNLOAD_WORKERS) || 4);
const MAX_GENERATE = 2;

module.exports = function createHevcHls(opts) {
  const dataDir = (opts && opts.dataDir) || process.env.CACTUS_DATA_DIR || path.join(os.homedir(), '.local', 'share', 'cactus-tv-linux');
  const baseUrl = (opts && opts.baseUrl) || '';
  const workRoot = path.join(dataDir, 'hls');
  const sessions = new Map();
  fs.mkdirSync(workRoot, { recursive: true });

  /* --- Aceleracion por hardware (VAAPI) -----------------------------------
   * Igual que XuperDesktop 0.2.0, se prueba una vez al arrancar y se cachea.
   * En este equipo el driver no soporta scale_vaapi, asi que la ruta GPU
   * conserva la resolucion original; el encode libx264 sigue como fallback.
   * CACTUS_VAAPI=0 fuerza software; =1 fuerza intento GPU.
   */
  let vaapiChecked = false;
  let vaapiDevice = null;
  function detectVaapi(cb) {
    if (vaapiChecked) return cb(vaapiDevice);
    vaapiChecked = true;
    if (VAAPI_MODE === '0' || VAAPI_MODE === 'off' || VAAPI_MODE === 'never') return cb(null);
    const candidates = (process.env.CACTUS_VAAPI_DEVICE
      ? [process.env.CACTUS_VAAPI_DEVICE]
      : ['/dev/dri/renderD128', '/dev/dri/renderD129', '/dev/dri/card0', '/dev/dri/card1'])
      .filter(function (p) { return fs.existsSync(p); });
    if (!candidates.length) return cb(null);
    const device = candidates[0];
    const args = [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-vaapi_device', device,
      '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25', '-frames:v', '5',
      '-vf', 'format=nv12,hwupload', '-c:v', 'h264_vaapi', '-f', 'null', '-'
    ];
    execFile(FFMPEG, args, { timeout: 8000 }, function (err) {
      vaapiDevice = err ? null : device;
      if (err) console.error('[cactus hevc] VAAPI no disponible: ' + String(err.message || err).slice(0, 160));
      else console.error('[cactus hevc] transcodido VAAPI: ' + device);
      cb(vaapiDevice);
    });
  }
  function videoArgs(device) {
    if (device) {
      return {
        input: ['-vaapi_device', device, '-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi'],
        codec: ['-c:v', 'h264_vaapi', '-qp', CRF]
      };
    }
    return {
      input: [],
      codec: [
        '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-pix_fmt', 'yuv420p',
        '-vf', 'scale=' + SCALE, '-threads', String(THREADS), '-filter_threads', String(THREADS)
      ]
    };
  }

  function cleanup(id) {
    const s = sessions.get(id);
    if (!s || s.closed) return;
    s.closed = true;
    sessions.delete(id);
    clearTimeout(s.timer);
    if (s.proc && !s.proc.killed && s.proc.exitCode === null) {
      try { s.proc.kill('SIGTERM'); } catch (_) {}
      setTimeout(() => { try { s.proc.kill('SIGKILL'); } catch (_) {} }, 2500).unref();
    }
    s.jobs.forEach((j) => { try { j.kill('SIGTERM'); } catch (_) {} });
    /* Cortar descargas ANTES de borrar el directorio: si un WriteStream
     * intenta abrir source.ts después del rm, Node lanza un 'error' no
     * manejado y tumba el backend completo. */
    s.requests.forEach((q) => { try { q.destroy(); } catch (_) {} });
    s.streams.forEach((st) => { try { st.destroy(); } catch (_) {} });
    setTimeout(() => { try { fs.rmSync(s.dir, { recursive: true, force: true }); } catch (_) {} }, 1500).unref();
  }
  function track(s, stream) {
    if (s && s.streams) {
      s.streams.add(stream);
      stream.on('close', function () { s.streams.delete(stream); });
    }
    return stream;
  }
  function touch(id) {
    const s = sessions.get(id);
    if (!s) return;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => cleanup(id), TTL_MS);
    s.timer.unref();
  }

  /* ---------- Descarga completa en paralelo -------------------------------- */
  function request(url, options, onResponse, onError, s) {
    let mod;
    try { mod = url.indexOf('https:') === 0 ? https : http; } catch (_) { mod = http; }
    const req = mod.get(url, options || {}, onResponse);
    req.on('error', onError);
    req.setTimeout(300000, function () { req.destroy(Error('download_timeout')); });
    if (s && s.requests) {
      s.requests.add(req);
      req.on('close', function () { s.requests.delete(req); });
    }
    return req;
  }

  function fetchChunk(url, from, to, dest, done, attempt, s) {
    let out, settled = false;
    const tryAgain = function (err) {
      if (s && s.closed) return done(Error('sesion_cerrada'));
      if ((attempt || 0) >= 3) return done(err);
      setTimeout(function () { fetchChunk(url, from, to, dest, done, (attempt || 0) + 1, s); }, 400 * (attempt || 1));
    };
    const finish = function (err) {
      if (settled) return;
      settled = true;
      try { if (out) out.destroy(); } catch (_) {}
      tryAgain(err);
    };
    const ok = function () {
      if (settled) return;
      settled = true;
      done(null);
    };
    request(url, { headers: { range: 'bytes=' + from + '-' + to } }, function (res) {
      if (res.statusCode !== 206) { res.resume(); return finish(Error('range_http_' + res.statusCode)); }
      out = track(s, fs.createWriteStream(dest));
      res.pipe(out);
      res.on('error', finish);
      out.on('finish', ok);
      out.on('error', finish);
    }, finish, s);
  }

  function headLength(url, cb, s) {
    return request(url, { method: 'HEAD' }, function (res) {
      const len = Number(res.headers['x-cactus-length'] || res.headers['content-length'] || 0);
      res.resume();
      cb(null, len);
    }, cb, s);
  }

  function concatParts(s, total, cb) {
    const dest = path.join(s.dir, 'source.ts');
    const out = track(s, fs.createWriteStream(dest));
    let i = 0, settled = false;
    const fail = function (e) {
      if (settled) return;
      settled = true;
      try { out.destroy(); } catch (_) {}
      cb(e);
    };
    out.on('error', fail);
    (function next() {
      if (s.closed) return fail(Error('sesion_cerrada'));
      if (i >= total) {
        if (settled) return;
        out.end(function () { if (!settled) { settled = true; cb(null, dest); } });
        return;
      }
      const part = path.join(s.dir, 'part-' + String(i).padStart(4, '0') + '.bin');
      const input = track(s, fs.createReadStream(part));
      input.pipe(out, { end: false });
      input.on('end', function () {
        try { fs.unlinkSync(part); } catch (_) {}
        i++; next();
      });
      input.on('error', fail);
    })();
  }

  function downloadSource(s, relayUrl, cb) {
    headLength(relayUrl, function (err, length) {
      if (s.closed) return cb(Error('sesion_cerrada'));
      if (err || !length || !isFinite(length) || length > 4 * 1024 * 1024 * 1024) {
        /* Sin longitud: descarga secuencial sencilla. */
        const dest = path.join(s.dir, 'source.ts');
        const out = track(s, fs.createWriteStream(dest));
        let settled = false;
        const fail = function (e) {
          if (settled) return;
          settled = true;
          try { out.destroy(); } catch (_) {}
          cb(e);
        };
        out.on('error', fail);
        request(relayUrl, {}, function (res) {
          if (res.statusCode !== 200 && res.statusCode !== 206) { res.resume(); return fail(Error('download_http_' + res.statusCode)); }
          res.pipe(out);
          out.on('finish', function () { if (!settled) { settled = true; cb(null, dest); } });
          res.on('error', fail);
        }, fail, s);
        return;
      }
      const count = Math.ceil(length / CHUNK_BYTES);
      let done = 0, failed = null, started = 0;
      console.error('[cactus hevc] descargando ' + Math.round(length / 1048576) + ' MB en ' + count + ' partes');
      (function pump() {
        /* DOWNLOAD_WORKERS de verdad:started-done es el numero de peticiones
         * en vuelo. Antes se lanzaban las 112/224 partes a la vez y el CDN
         * devolvia 502/503, matando tambien el directo de ffmpeg. */
        while (started < count && (started - done) < DOWNLOAD_WORKERS && !failed && !s.closed) {
          const i = started++;
          const from = i * CHUNK_BYTES;
          const to = Math.min(length - 1, from + CHUNK_BYTES - 1);
          fetchChunk(relayUrl, from, to, path.join(s.dir, 'part-' + String(i).padStart(4, '0') + '.bin'), function (e) {
            if (s.closed) return;
            if (e && !failed) failed = e;
            done++;
            if (done === count) {
              if (failed) return cb(failed);
              return concatParts(s, count, cb);
            }
            pump();
          }, 0, s);
        }
      })();
    }, s);
  }

  /* ---------- Playlist VOD y segmentos bajo demanda ------------------------ */
  /* ffmpeg elige la longitud de segmento segun los keyframes del CDN (aqui
   * salen ~10 s, no 4 s). Leemos sus EXTINF reales para que la playlist VOD
   * no desalinee el timeline: si no, hls.js pide seg-00011 creyendo que es el
   * minuto 0:44 cuando en realidad contiene el 1:54. */
  function parseLivePlaylist(s) {
    const out = [];
    let text = '';
    try { text = fs.readFileSync(path.join(s.dir, 'index.m3u8'), 'utf8'); } catch (_) { return out; }
    let lastDur = 0;
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (/^#EXTINF:/.test(line)) lastDur = Number(line.slice(8).replace(',', '')) || 0;
      else if (/^seg-\d{5}\.ts$/.test(line)) {
        out.push({ index: Number(line.slice(4, 9)), duration: lastDur || SEGMENT_SECONDS, name: line });
        lastDur = 0;
      }
    });
    return out;
  }

  function buildVod(s, source, cb) {
    execFile(FFPROBE, ['-v', 'error', '-rw_timeout', '8000000', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', source], { timeout: 8000 }, function (err, stdout) {
      if (err) return cb(err);
      const duration = Number(String(stdout || '').trim());
      if (!duration || !isFinite(duration)) return cb(Error('duracion_desconocida'));

      const live = parseLivePlaylist(s);
      const byIndex = new Map();
      live.forEach(function (e) { byIndex.set(e.index, e); });
      const maxLive = live.length ? Math.max.apply(null, live.map(function (e) { return e.index; })) : -1;
      const avg = live.length ? live.reduce(function (a, e) { return a + e.duration; }, 0) / live.length : SEGMENT_SECONDS;

      const starts = [], durations = [];
      let cursor = 0;
      for (let i = 0; i <= maxLive; i++) {
        const e = byIndex.get(i);
        const d = e ? e.duration : avg;
        starts.push(cursor); durations.push(d); cursor += d;
      }
      /* El ultimo fichero que estaba escribiendo ffmpeg puede quedar a medias:
       * no esta en su playlist, así que lo borramos para que se regenere. */
      try {
        fs.readdirSync(s.dir).forEach(function (f) {
          const m = /^seg-(\d{5})\.ts$/.exec(f);
          if ((m && Number(m[1]) > maxLive) || f.indexOf('.gen-') === 0) {
            try { fs.unlinkSync(path.join(s.dir, f)); } catch (_) {}
          }
        });
      } catch (_) {}
      while (cursor < duration) {
        const d = Math.min(SEGMENT_SECONDS, duration - cursor);
        if (d < 0.25) break;
        starts.push(cursor); durations.push(d); cursor += d;
      }
      const maxDur = Math.max.apply(null, durations);
      let text = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:' + Math.max(4, Math.ceil(maxDur)) +
        '\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n';
      for (let i = 0; i < starts.length; i++) {
        text += '#EXTINF:' + durations[i].toFixed(6) + ',\n';
        if (i > maxLive) text += '#EXT-X-DISCONTINUITY\n';
        text += 'seg-' + String(i).padStart(5, '0') + '.ts\n';
      }
      text += '#EXT-X-ENDLIST\n';
      const tmp = path.join(s.dir, 'full.tmp');
      fs.writeFile(tmp, text, function (e) {
        if (e) return cb(e);
        fs.rename(tmp, path.join(s.dir, 'full.m3u8'), function (e2) {
          if (e2) return cb(e2);
          s.fullPlaylist = path.join(s.dir, 'full.m3u8');
          s.segmentStarts = starts;
          s.segmentDurations = durations;
          s.segmentCount = starts.length;
          console.error('[cactus hevc] VOD listo: ' + starts.length + ' segmentos (' +
            Math.round(duration) + ' s, ' + live.length + ' from ffmpeg)');
          if (s.proc && s.proc.exitCode === null) {
            try { s.proc.kill('SIGTERM'); } catch (_) {}
          }
          cb(null);
        });
      });
    });
  }

  function generateSegment(s, index) {
    const name = 'seg-' + String(index).padStart(5, '0') + '.ts';
    const final = path.join(s.dir, name);
    if (fs.existsSync(final) && fs.statSync(final).size > 0) return Promise.resolve(final);
    if (s.pending.has(index)) return s.pending.get(index);
    if (!s.sourceReady) return Promise.reject(Error('fuente_no_descargada'));
    if (index >= s.segmentCount) return Promise.reject(Error('segmento_fuera_de_rango'));

    const tmp = path.join(s.dir, '.gen-' + name);
    const ss = (s.segmentStarts && s.segmentStarts[index] != null ? s.segmentStarts[index] : index * SEGMENT_SECONDS).toFixed(3);
    const dur = (s.segmentDurations && s.segmentDurations[index] ? s.segmentDurations[index] : SEGMENT_SECONDS).toFixed(3);
    const v = videoArgs(s.vaapi);
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin']
      .concat(v.input, [
        '-ss', ss, '-i', path.join(s.dir, 'source.ts'), '-t', dur,
        '-map', '0:v:0', '-map', '0:a:0?'
      ], v.codec, [
        '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
        '-avoid_negative_ts', 'make_zero', '-muxdelay', '0', '-muxpreload', '0',
        '-f', 'mpegts', '-y', tmp
      ]);
    const job = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    s.jobs.add(job);
    let err = '';
    job.stderr.on('data', function (b) { err = (err + String(b)).slice(-1200); });
    const promise = new Promise(function (resolve, reject) {
      job.once('error', function (e) { s.jobs.delete(job); reject(e); });
      job.once('close', function (code) {
        s.jobs.delete(job);
        if (code !== 0) return reject(Error('ffmpeg_segment_' + code + ' ' + err));
        try {
          if (!fs.statSync(tmp).size) return reject(Error('segmento_vacio'));
          fs.renameSync(tmp, final);
          resolve(final);
        } catch (e) { reject(e); }
      });
    });
    s.pending.set(index, promise);
    promise.then(function () { s.pending.delete(index); }, function (e) {
      s.pending.delete(index);
      console.error('[cactus hevc] segmento ' + index + ' fallo: ' + e.message.slice(-300));
    });
    return promise;
  }

  function fillBackground(s) {
    /* Solo adelantamos unos pocos segmentos para suavizar el arranque.
     * Generar los ~1500 segmentos de una pelicula entera mantendria ffmpeg
     * al 100% durante casi una hora; el resto se crea bajo demanda al seek. */
    let next = 0;
    const limit = Math.min(6, s.segmentCount);
    for (let w = 0; w < 2; w++) {
      (function worker() {
        if (s !== sessions.get(s.id) || s.closed) return;
        if (next >= limit) return;
        const i = next++;
        generateSegment(s, i).catch(function () {}).then(worker);
      })();
    }
  }

  function ffmpegAvailable() {
    if (FFMPEG.indexOf('/') === -1) return !!findOnPath(FFMPEG);
    return fs.existsSync(FFMPEG);
  }
  function start(mediaUrl, headers) {
    return new Promise(function (resolve, reject) {
      detectVaapi(function (device) {
        try { startWith(device, mediaUrl, headers).then(resolve, reject); }
        catch (e) { reject(e); }
      });
    });
  }
  function startWith(device, mediaUrl, headers) {
    if (!ffmpegAvailable()) throw Error('ffmpeg_no_disponible');
    if (sessions.size >= MAX_SESSIONS) cleanup(sessions.keys().next().value);
    const id = crypto.randomBytes(12).toString('hex');
    const dir = path.join(workRoot, id);
    fs.mkdirSync(dir, { recursive: true });

    const safeHeaders = {};
    Object.keys(headers || {}).forEach(function (k) {
      const n = k.toLowerCase();
      if (n === 'range') return;
      if (/^[a-z0-9-]+$/.test(n) && typeof headers[k] === 'string' && headers[k].length < 4096 && !/[\r\n]/.test(headers[k])) safeHeaders[n] = headers[k];
    });
    const relay = baseUrl + '/r?u=' + encodeURIComponent(mediaUrl) + '&h=' + encodeURIComponent(Buffer.from(JSON.stringify(safeHeaders), 'utf8').toString('base64')) + '&stream=1';
    const playlist = path.join(dir, 'index.m3u8');
    const v = videoArgs(device);
    const args = ['-hide_banner', '-loglevel', 'warning', '-nostdin', '-rw_timeout', '30000000']
      .concat(v.input, [
        '-i', relay, '-map', '0:v:0', '-map', '0:a:0?'
      ], v.codec, [
        '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
        '-f', 'hls', '-hls_time', String(SEGMENT_SECONDS), '-hls_list_size', String(PLAYLIST_SIZE),
        '-hls_flags', 'delete_segments+append_list',
        '-hls_segment_filename', path.join(dir, 'seg-%05d.ts'), playlist
      ]);
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let log = '';
    proc.stderr.on('data', function (b) { log = (log + String(b)).slice(-3000); });
    proc.once('error', function (e) { log = e.message; });
    const s = {
      id, dir, proc, relay, vaapi: device, log: function () { return log; }, timer: null,
      closed: false, fullPlaylist: null, sourceReady: false, segmentCount: 0,
      pending: new Map(), jobs: new Set(), requests: new Set(), streams: new Set()
    };
    sessions.set(id, s);
    touch(id);

    /* Descarga completa en segundo plano, pero dejamos que ffmpeg llene
     * unos segundos de playlist antes de bombardear el CDN con Rangos. */
    setTimeout(function () {
      if (s !== sessions.get(id) || s.closed) return;
      downloadSource(s, relay, function (err, source) {
        if (s !== sessions.get(id) || s.closed) return;
        if (err) { console.error('[cactus hevc] download fallo: ' + err.message); return; }
        s.sourceReady = true;
        buildVod(s, source, function (err2) {
          if (s !== sessions.get(id) || s.closed || err2) return;
          fillBackground(s);
        });
      });
    }, 8000);

    return new Promise(function (resolve, reject) {
      let waited = 0;
      (function check() {
        if (proc.exitCode !== null || proc.signalCode) { cleanup(id); return reject(Error('ffmpeg_exit')); }
        try { if (fs.statSync(playlist).size > 0) return resolve({ id: id, playlist: '/h/' + id + '/index.m3u8' }); } catch (_) {}
        if (waited >= 20000) { cleanup(id); return reject(Error('transcode_timeout')); }
        waited += 250;
        setTimeout(check, 250);
      })();
    });
  }

  function prepare(id, name) {
    if (!/^[a-f0-9]{24}$/.test(id) || !/^(index\.m3u8|seg-\d{5}\.ts)$/.test(name)) return Promise.reject(Error('recurso_no_valido'));
    const s = sessions.get(id);
    if (!s) return Promise.reject(Error('sesion_caducada'));
    touch(id);
    if (name === 'index.m3u8') return Promise.resolve(s.fullPlaylist || path.join(s.dir, name));
    const final = path.join(s.dir, name);
    if (fs.existsSync(final) && fs.statSync(final).size > 0) return Promise.resolve(final);
    const m = /^seg-(\d{5})\.ts$/.exec(name);
    return generateSegment(s, Number(m[1]));
  }

  return { start: start, stop: cleanup, touch: touch, prepare: prepare, count: function () { return sessions.size; } };
};
