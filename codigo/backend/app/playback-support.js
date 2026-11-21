/* Diagnóstico local: solo códigos, etapa y capacidades públicas. Sin URLs ni cuentas. */
(function(w){'use strict';
 var phases=['catalog','asset','vod-start','live-start','routes','license','manifest','index','index-size','demux','mse','mse-open','buffer','hls','playing','native-open','native-prepare','native-playback'],kinds=['Error','TypeError','ReferenceError','RangeError','SyntaxError','InvalidStateError','InvalidAccessError','NotSupportedError','QuotaExceededError','NetworkError','AbortError'];
 function one(v,allowed){return allowed.indexOf(v)>=0?v:'';}
 function reason(error){var d=w.CACTUS_ENGINE&&w.CACTUS_ENGINE.diagnostics(),last=d&&d.lastError||{},s=String(error&&error.message||error||last.error||''),video=document.getElementById('video'),n=video&&video.error&&video.error.code;
  if(/codec_not_supported|compatible_video_unavailable|h264_mse_unavailable|NotSupportedError/.test(s))return {code:'V01',message:'El reproductor de este televisor no admite el formato de este vídeo'};
  if(/protected_media/.test(s))return {code:'V02',message:'Esta fuente necesita otro reproductor autorizado'};
  var http=/media_http_(\d+)|HTTP\s+(\d+)/.exec(s);if(http)return {code:'R'+(http[1]||http[2]),message:'El servidor rechazó o no pudo servir esta reproducción'};
  if(error&&/^aaa\d+$/.test(String(error.code)))return {code:'A01',message:'El proveedor no autorizó esta reproducción para la sesión actual'};
  if(/network|fetch|CONNECTION|TIMEOUT|AbortError|todos los hosts/i.test(s)||n===2)return {code:'R01',message:'No se pudo conectar con esta fuente. Comprueba Internet y vuelve a intentar'};
  if(/media_size_unavailable|media_range_unavailable|index_tail_unavailable|invalid_index|invalid_hls|empty_hls/.test(s))return {code:'R02',message:'La fuente devolvió una respuesta multimedia incompleta o incompatible'};
  if(/decoder|missing_video_track|buffer_timeout|fragParsingError|bufferAppendError/.test(s)||n===3)return {code:'V03',message:'Este vídeo no pudo decodificarse en el televisor'};
  if(n===4)return {code:'V04',message:'El televisor no pudo abrir el formato de esta fuente'};
  return {code:'P01',message:'No se pudo iniciar esta fuente. Puedes reintentar o elegir otra'};
 }
 function device(){var match=/Tizen[ /]([\d.]+)/i.exec(navigator.userAgent);return match?'Samsung · Tizen '+match[1]:'Cactus TV';}
 function saved(){try{return JSON.parse(localStorage.getItem('cactus_last_error_v1'))||{};}catch(e){return {};}}
 function detail(r){return [one(r.phase,phases),one(r.kind,kinds)].filter(Boolean).join('/');}
 function save(error){var r=reason(error),d=w.CACTUS_ENGINE&&w.CACTUS_ENGINE.diagnostics(),last=d&&d.lastError||{},record={code:r.code,device:device(),at:Date.now(),phase:one(error&&error.cactusPhase||last.phase||('native-'+last.method),phases),kind:one(error&&error.name||last.name,kinds)};try{localStorage.setItem('cactus_last_error_v1',JSON.stringify(record));}catch(e){}return r.message+' ('+r.code+(r.code==='P01'&&detail(record)?'/'+detail(record):'')+').';}
 function capabilities(){function has(mime){try{return !!(w.MediaSource&&w.MediaSource.isTypeSupported(mime));}catch(e){return false;}}return {mse:!!w.MediaSource,h264:has('video/mp4; codecs="avc1.42E01E"'),hevc:has('video/mp4; codecs="hvc1.1.6.L93.B0"')};}
 w.CACTUS_SUPPORT={message:save,device:device,last:function(){var r=saved();return /^[AVRP]\d{2,3}$/.test(r.code)?r.code:'Sin errores registrados';},details:function(){return detail(saved());},capabilities:capabilities};
})(window);
