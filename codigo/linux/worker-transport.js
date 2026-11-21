/* Cactus TV Linux — transporte dentro del Web Worker de proveedores.
 * El worker de la app de TV llama a la API por su propio `fetch`, que no pasa
 * por window.fetch. Este shim redirige sus peticiones al relay local /r. */
(function (scope) {
  'use strict';
  var nativeFetch = scope.fetch.bind(scope);
  var nativeOpen = scope.XMLHttpRequest.prototype.open;

  function isExternal(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value) &&
      value.indexOf(scope.location.origin) !== 0 && value.indexOf('/r?u=') !== 0;
  }
  function local(value) {
    if (!isExternal(value)) return value;
    return '/r?u=' + encodeURIComponent(value);
  }

  scope.fetch = function (input, init) {
    if (typeof input === 'string' || input instanceof URL) {
      return nativeFetch(local(String(input)), init);
    }
    if (input && typeof input === 'object' && 'url' in input) {
      var req = input;
      if (!isExternal(req.url)) return nativeFetch(req, init);
      return req.clone().arrayBuffer().then(function (body) {
        var opts = {
          method: req.method, headers: req.headers, credentials: req.credentials,
          cache: req.cache, mode: 'cors', redirect: req.redirect,
          referrer: req.referrer, signal: req.signal
        };
        if (req.method !== 'GET' && req.method !== 'HEAD' && body.byteLength) opts.body = body;
        return nativeFetch(local(req.url), opts);
      });
    }
    return nativeFetch(input, init);
  };

  scope.XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') args[1] = local(url);
    return nativeOpen.apply(this, args);
  };
})(self);
