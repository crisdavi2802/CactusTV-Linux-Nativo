/* Cactus TV - conector opcional de canales HLS/DASH desde listas del usuario.
 * No se distribuyen listas, credenciales ni accesos de terceros.
 * ES5 para compatibilidad Tizen 3 y superiores. */
(function(w,d){'use strict';
 var storeKey='cactus_sport_sources_v1',urlKey='cactus_sport_sources_url_v1',entries=[],inputUrl='',sourceCount=0;
 var names={
  'wiwy-tvplus-1':['bein sports extra','bein sports xtra','be in sports extra'],
  'wiwy-tvplus-2':['liga 1','liga1','liga 1 pe hd'],
  'wiwy-tvplus-3':['liga 1 max','liga1 max','liga 1 max peru'],
  'wiwy-tvplus-4':['tudn','tudn mx','tudn usa','univision tudn'],
  'wiwy-tvplus-5':['sky sports la liga','sky sports laliga','sky sports laliga hd'],
  'wiwy-tvplus-7':['tyc sports','tyc sports hd'],
  'wiwy-tvplus-9':['movistar liga de campeones','liga de campeones movistar','movistar liga campeones'],
  'wiwy-tvplus-10':['dsports','directv sports','dsports directv'],
  'wiwy-tvplus-11':['dsports 2','directv sports 2'],
  'wiwy-tvplus-12':['dsports plus','directv sports plus','dsports +'],
  'wiwy-tvplus-13':['espn premium','espn premium lat'],
  'wiwy-tvplus-14':['espn','espn 1','espn lat'],
  'wiwy-tvplus-15':['espn 2','espn2'],
  'wiwy-tvplus-16':['espn 3','espn3'],
  'wiwy-tvplus-17':['espn 4','espn4'],
  'wiwy-tvplus-18':['espn 5','espn5'],
  'wiwy-tvplus-19':['espn 6','espn6'],
  'wiwy-tvplus-20':['espn 7','espn7'],
  'wiwy-tvplus-21':['espn mexico','espn mexico 1','espn 1 mexico'],
  'wiwy-tvplus-22':['espn 2 mexico','espn2 mexico'],
  'wiwy-tvplus-23':['espn 3 mexico','espn3 mexico'],
  'wiwy-tvplus-24':['espn 4 mexico','espn4 mexico'],
  'wiwy-tvplus-25':['espn 5 mexico','espn5 mexico'],
  'wiwy-tvplus-26':['azteca deportes','azteca deportes network'],
  'wiwy-tvplus-27':['fox sports','fox sports 1'],
  'wiwy-tvplus-28':['dsports max','directv sports max'],
  'wiwy-espn-deportes-hd':['espn deportes','espn deportes hd']
 };
 function clean(s){return String(s||'').toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n').replace(/[^a-z0-9]+/g,' ').replace(/^ +| +$/g,'').replace(/ +/g,' ');}
 function sourceId(name){var v=clean(name),id,alias,i;for(id in names)if(Object.prototype.hasOwnProperty.call(names,id)){alias=names[id];for(i=0;i<alias.length;i++)if(clean(alias[i])===v)return id;}return null;}
 function validUrl(url){return typeof url==='string'&&url.length>=12&&url.length<=1800&&/^https?:\/\/[^\s/:?#]+(?::\d+)?(?:[/?#][^\s]*)?$/i.test(url)&&!/[<>\\]/.test(url)&&!/(?:\.php|\.html?)(?:[?#]|$)/i.test(url);}
 function playable(obj){return obj&&obj.source==='CACTUS_SPORT_FEED'&&obj.category==='live'&&validUrl(obj.streamUrl);}
 function parse(text){if(typeof text!=='string'||text.length>2200000)throw Error('La lista es demasiado grande.');var out=[],seen={},j,i,obj,nm,src,media,lines,match,attr='',line;
  function add(name,url){var id=sourceId(name);if(!id||!validUrl(url)||seen[id])return;seen[id]=true;out.push({id:id,title:name,url:url});}
  if(/^\s*[\[{]/.test(text)){
   try{j=JSON.parse(text);}catch(e){throw Error('JSON no válido.');}
   if(!Array.isArray(j))j=j&&Array.isArray(j.channels)?j.channels:j&&Array.isArray(j.items)?j.items:[];
   for(i=0;i<j.length&&i<3000;i++){obj=j[i];if(!obj||typeof obj!=='object')continue;nm=obj.name||obj.title||obj.channel;src=obj.url||obj.streamUrl||obj.stream||obj.playUrl;if(typeof src==='string')add(nm,src);}
  }else{
   lines=text.replace(/\r/g,'').split('\n');
   for(i=0;i<lines.length&&i<14000;i++){line=lines[i].trim();if(/^#EXTINF:/i.test(line)){match=/tvg-name\s*=\s*"([^"]+)"/i.exec(line);attr=match?match[1]:(line.indexOf(',')>=0?line.slice(line.indexOf(',')+1).trim():'');}
    else if(line&&line.charAt(0)!=='#'){add(attr,line);attr='';}}
  }
  return out;
 }
 function load(){try{var s=JSON.parse(localStorage.getItem(storeKey)||'[]');if(Array.isArray(s))entries=s.filter(function(x){return x&&sourceId(x.title)===x.id&&validUrl(x.url);}).slice(0,100);}catch(e){}try{inputUrl=localStorage.getItem(urlKey)||'';}catch(e){}}
 function persist(){try{localStorage.setItem(storeKey,JSON.stringify(entries));localStorage.setItem(urlKey,inputUrl);}catch(e){}}
 function inject(data){var copy=data&&typeof data==='object'?data:{},linked={},key,i,entry,old,match;for(key in copy.linked)if(Object.prototype.hasOwnProperty.call(copy.linked,key))linked[key]=copy.linked[key];
  for(i=0;i<entries.length;i++){entry=entries[i];old=w.CACTUS_LIVE&&w.CACTUS_LIVE.lookup?w.CACTUS_LIVE.lookup(entry.id):null;if(!old)continue;
   linked[entry.id]={id:entry.id,title:old.title,category:'live',source:'CACTUS_SPORT_FEED',renderer:'native',streamUrl:entry.url};}
  return {linked:linked,additional:copy.additional||[]};
 }
 function wrapApi(){if(!w.CACTUS_API)return;var api=w.CACTUS_API;
  ['sportsExtras','sportsExtrasRefresh'].forEach(function(name){if(typeof api[name]!=='function')return;var orig=api[name];api[name]=function(done){return orig.call(api,function(err,data){done(err,inject(data));});};});
 }
 function announce(){var e=d.createEvent('Event');e.initEvent('cactussportfeedchange',true,false);d.dispatchEvent(e);}
 function importRemote(url,done){if(!/^https?:\/\//i.test(url)||!validUrl(url))return done(Error('Escribe una dirección HTTPS/HTTP válida.'));
  var req=new XMLHttpRequest();req.open('GET',url,true);req.timeout=16000;req.onreadystatechange=function(){if(req.readyState!==4)return;if(req.status!==200)return done(Error('El servidor devolvió HTTP '+req.status+'.'));try{var parsed=parse(req.responseText);done(null,parsed);}catch(e){done(e);}};req.onerror=function(){done(Error('No se pudo acceder. Puede faltar CORS o estar sin conexión.'));};req.ontimeout=function(){done(Error('Tiempo de espera agotado.'));};try{req.send();}catch(e){done(e);}
 }
 function ui(){var workspace=d.getElementById('live-workspace'),heading=workspace&&workspace.querySelector('.live-channel-heading');if(!heading)return;
  var launch=d.createElement('button');launch.type='button';launch.id='cactus-sport-import-open';launch.className='cactus-sport-import-button';launch.textContent='Mis fuentes M3U/JSON';heading.parentNode.insertBefore(launch,heading.nextSibling);
  var overlay=d.createElement('div');overlay.id='cactus-sport-source-modal';overlay.hidden=true;overlay.className='cactus-sport-source-modal';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Configurar fuentes deportivas');
  overlay.innerHTML='<div class="cactus-sport-source-card"><h2>Fuentes deportivas</h2><p>Importa una lista M3U o JSON con transmisiones que tengas autorización para utilizar. Cactus asociará por nombre los canales de Deportes adicionales. No se incluye ninguna fuente privada.</p><label for="cactus-sport-source-url">Dirección de tu lista (HTTPS/HTTP)</label><input id="cactus-sport-source-url" type="url" autocomplete="off" spellcheck="false" placeholder="https://servidor.example/mi-lista.m3u"><div class="cactus-sport-source-actions"><button type="button" id="cactus-sport-source-save">Importar / actualizar</button><button type="button" id="cactus-sport-source-clear">Quitar fuentes</button><button type="button" id="cactus-sport-source-close">Cerrar</button></div><p id="cactus-sport-source-message" aria-live="polite"></p><small>No introduzcas contraseñas ni tokens privados. Las listas importadas se guardan solo en este televisor.</small></div>';
  d.body.appendChild(overlay);var inp=d.getElementById('cactus-sport-source-url'),msg=d.getElementById('cactus-sport-source-message'),save=d.getElementById('cactus-sport-source-save'),close=d.getElementById('cactus-sport-source-close'),clear=d.getElementById('cactus-sport-source-clear');
  function open(){inp.value=inputUrl;msg.textContent=entries.length+' canales asociados de una lista guardada.';overlay.hidden=false;inp.focus();}
  function shut(){overlay.hidden=true;launch.focus();}
  launch.addEventListener('click',open);close.addEventListener('click',shut);
  clear.addEventListener('click',function(){entries=[];inputUrl='';persist();msg.textContent='Fuentes importadas eliminadas.';announce();});
  save.addEventListener('click',function(){var u=inp.value.trim();msg.textContent='Consultando lista…';save.disabled=true;importRemote(u,function(err,list){save.disabled=false;if(err){msg.textContent='No se pudo importar: '+String(err.message||err);return;}
    entries=list;inputUrl=u;persist();msg.textContent='Se asociaron '+entries.length+' canales deportivos. Si alguno sigue sin señal, verifica la fuente en tu proveedor.';announce();});});
  d.addEventListener('keydown',function(e){if(overlay.hidden)return;var c=e.keyCode||e.which;if(c===27||c===10009||c===8&&d.activeElement!==inp){e.preventDefault();e.stopImmediatePropagation();shut();}},true);
  launch.addEventListener('keydown',function(e){var c=e.keyCode||e.which;if(c!==37&&c!==39&&c!==40)return;e.preventDefault();e.stopImmediatePropagation();var q=c===37?d.querySelector('#live-category-list button[aria-pressed="true"]'):d.querySelector('#live-channel-list button');if(q)q.focus();});
 }
 load();wrapApi();w.CACTUS_SPORT_SOURCES={parse:parse,sourceId:sourceId,canPlay:playable,count:function(){return entries.length;},inject:inject,update:function(text){entries=parse(text);persist();announce();return entries.length;}};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',ui);else ui();
})(window,document);
