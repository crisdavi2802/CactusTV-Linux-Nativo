/* Cactus TV Linux — adaptador de transporte.
 *
 * Los paquetes de television llaman a la API y a los CDN directamente desde el
 * navegador (funciona en Tizen/WebOS porque su WebView permite origins cruzados).
 * En un escritorio Linux el navegador bloquea esas peticiones por CORS.
 *
 * Este unico archivo redirige TODAS las URLs externas (fetch, XHR, <img>, <video>,
 * <source>) al relay local del backend: /r?u=<url>. El relay ya valida hosts, DNS,
 * cabeceras y tamanos; aqui solo se reescribe la URL, sin tocar la logica de la app.
 */
(function (w) {
  'use strict';
  var cfg = w.CACTUS_RUNTIME || {};
  if (!cfg.linux) return;                       // solo se activa en el port Linux
  var relay = '/r?u=';
  var nativeFetch = w.fetch.bind(w);
  var nativeOpen = XMLHttpRequest.prototype.open;

  function isExternal(value) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
    if (value.indexOf(location.origin) === 0) return false;
    return true;
  }
  function local(value) {
    if (!isExternal(value)) return value;
    if (value.indexOf(relay) === 0) return value;
    return relay + encodeURIComponent(value);
  }

  /* --- fetch (API Xuper, metadata, poster JSON) --- */
  w.fetch = function (input, init) {
    if (typeof input === 'string' || input instanceof URL) {
      console.warn('[cactus fetch]', String(input).slice(0, 220));
      return nativeFetch(local(String(input)), init);
    }
    if (input && typeof input === 'object' && 'url' in input) {
      var req = input;
      if (!isExternal(req.url)) return nativeFetch(req, init);
      var clone = req.clone();
      return clone.arrayBuffer().then(function (body) {
        var opts = {
          method: req.method,
          headers: req.headers,
          credentials: req.credentials,
          cache: req.cache,
          mode: 'cors',
          redirect: req.redirect,
          referrer: req.referrer,
          signal: req.signal
        };
        if (req.method !== 'GET' && req.method !== 'HEAD' && body.byteLength) opts.body = body;
        return nativeFetch(local(req.url), opts);
      });
    }
    return nativeFetch(input, init);
  };

  /* --- XHR (HLS.js, mpegts.js, descargas) --- */
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') {
      console.warn('[cactus xhr]', String(url).slice(0, 220));
      args[1] = local(url);
    }
    return nativeOpen.apply(this, args);
  };

  /* --- elementos multimedia e imagenes --- */
  function rewriteAttribute(el, name) {
    var value = el.getAttribute(name);
    if (isExternal(value)) el.setAttribute(name, local(value));
  }
  function rewrite(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('img[src], video[src], source[src], track[src]').forEach(function (el) {
      rewriteAttribute(el, 'src');
    });
    root.querySelectorAll('[poster]').forEach(function (el) { rewriteAttribute(el, 'poster'); });
  }
  var srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true, enumerable: srcDesc.enumerable,
      get: function () { return srcDesc.get.call(this); },
      set: function (value) { srcDesc.set.call(this, isExternal(value) ? local(value) : value); }
    });
  }
  var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (imgDesc && imgDesc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true, enumerable: imgDesc.enumerable,
      get: function () { return imgDesc.get.call(this); },
      set: function (value) { imgDesc.set.call(this, isExternal(value) ? local(value) : value); }
    });
  }
  var nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if ((name === 'src' || name === 'poster') && isExternal(value)) value = local(value);
    return nativeSetAttribute.call(this, name, value);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { rewrite(document); });
  } else {
    rewrite(document);
  }
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) {
          rewrite(node);
          if (node.querySelectorAll) rewrite(node);
        }
      });
    });
  }).observe(document.documentElement || document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'poster'] });

  /* --- Compatibilidad HEVC -------------------------------------------------
   * Chromium/Electron en Linux no soporta hvc1 en MediaSource. Cuando el
   * catalogo solo ofrece HEVC, el backend lo convierte a H.264 y aqui cargamos
   * esa playlist con el hls.js que ya trae la aplicacion. El motor original
   * sigue gestionando todos los titulos H.264 sin transcodificacion.
   */
  var directMedia = null;
  function encodeHeaders(headers) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(headers || {}))));
    } catch (e) { return ''; }
  }
  function wrapMedia(api) {
    if (!api || api.__cactusHevcWrapped) return api;
    var originalOpen = api.open, originalClose = api.close;
    var state = null;
    var video = document.getElementById('video');

    function cleanup() {
      if (!state) return;
      var old = state;
      state = null;
      if (old.hls) { try { old.hls.destroy(); } catch (e) {} }
      if (old.id) {
        nativeFetch('/h/stop?id=' + encodeURIComponent(old.id)).catch(function () {});
      }
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    }
    function fail(error) {
      if (!state) return;
      console.warn('[cactus hevc] fail', String(error && error.message || error));
      state.error = String(error && error.message || error || 'transcode_error').slice(0, 160);
      state.errorName = (error && error.name) || 'Error';
      state.phase = 'error';
      if (!video) return;
      var e = document.createEvent('Event');
      e.initEvent('cactusdirecterror', false, false);
      video.dispatchEvent(e);
    }
    var wrapped = {
      __cactusHevcWrapped: true,
      open: function (session, options) {
        cleanup();
        var requestInfo = null;
        try { requestInfo = session && session.transport && session.transport.mediaRequest('bytes=0-'); } catch (e) {}
        if (!requestInfo || !/hevc|hvc1|h265/i.test(String(session.codec || ''))) {
          return originalOpen.call(api, session, options);
        }
        var mine = { session: session, options: options || {}, error: null, errorName: '', phase: 'hls', id: null, hls: null, wantsPlay: true };
        state = mine;
        var Hls = w.Hls;
        if (!video || !Hls || !Hls.isSupported()) { fail(Error('codec_not_supported')); return mine; }
        var hls = new Hls({
          enableWorker: false, autoStartLoad: true,
          startPosition: (options && options.resume) || -1,
          /* El convertidor va ~2.5x mas rapido que la reproduccion: ampliamos
           * el bufer para que haya minutos por delante y la barra permita
           * adelantar como en un VOD en vez de quedar pegada al directo. */
          maxBufferLength: 90, maxMaxBufferLength: 180, backBufferLength: 60,
          liveDurationInfinity: false,
          manifestLoadingTimeOut: 20000, fragLoadingTimeOut: 20000
        });
        mine.hls = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          if (state !== mine) return;
          mine.phase = 'playing';
          if (mine.wantsPlay) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        });
        hls.on(Hls.Events.ERROR, function (name, data) {
          console.warn('[cactus hevc] hls', data && data.details, data && data.fatal, data && data.response && data.response.code);
          if (state !== mine || !data || !data.fatal) return;
          fail(Error(data.details || 'hls_error'));
        });
        hls.attachMedia(video);
        nativeFetch('/h/start?u=' + encodeURIComponent(requestInfo.url) + '&h=' + encodeURIComponent(encodeHeaders(requestInfo.headers)))
          .then(function (r) {
            if (!r.ok) throw Error('transcode_http_' + r.status);
            return r.json();
          })
          .then(function (data) {
            if (state !== mine || !data || !data.playlist) return;
            mine.id = data.id;
            hls.loadSource(data.playlist);
          })
          .catch(function (e) { if (state === mine) fail(e); });
        return mine;
      },
      close: function () { cleanup(); originalClose.call(api); },
      play: function () {
        if (!state) return;
        state.wantsPlay = true;
        if (video && video.src) return video.play();
      },
      pause: function () { if (state) state.wantsPlay = false; if (video) video.pause(); },
      seek: function (time) { if (video) { try { video.currentTime = Number(time) || 0; } catch (e) {} } },
      audioTracks: function () { return []; },
      info: function () {
        if (!state) return null;
        var ranges = [];
        if (video) for (var i = 0; i < video.buffered.length; i++) ranges.push([video.buffered.start(i), video.buffered.end(i)]);
        return {
          kind: state.session.kind, error: state.error, errorName: state.errorName,
          phase: state.phase, mediaBytes: 0, codec: state.session.codec,
          buffered: ranges.length, ranges: ranges, direct: true, transcoded: true
        };
      }
    };
    return wrapped;
  }
  Object.defineProperty(w, 'CACTUS_DIRECT_MEDIA', {
    configurable: true,
    get: function () { return directMedia; },
    set: function (value) { directMedia = wrapMedia(value); }
  });

  w.CACTUS_LINUX_TRANSPORT = { local: local, relay: relay };
})(window);
