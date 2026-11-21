/* Cliente de metadatos propios. Solo consulta el backend que nosotros configuramos.
 * JAMÁS colocar aquí claves de API, cookies de sesión ni tokens de TMDB. */
(function () {
  'use strict';
  var cfg = window.CACTUS_RUNTIME || {};
  var xuper=cfg.catalogSource==='xuper',localBase='';try{localBase=localStorage.getItem('cactus_metadata_origin')||'';}catch(e){}var lan=/^http:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}):8001$/.test(localBase);
  var base = typeof cfg.apiBase === 'string' ? cfg.apiBase.replace(/\/+$/, '') : '';
  if(lan&&!base){base=localBase;cfg={demoOnly:false};try{xuper=localStorage.getItem('cactus_catalog_source')==='xuper';}catch(e){xuper=false;}}
  var rootId='',columnId='';function categoryQuery(){return (rootId?'&rootId='+encodeURIComponent(rootId):'')+(columnId?'&columnId='+encodeURIComponent(columnId):'');}
  var valid = /^https:\/\/[a-z0-9.-]+(?::[0-9]{2,5})?$/i.test(base) || /^http:\/\/localhost(?::[0-9]{2,5})?$/i.test(base)||(lan&&base===localBase);
  var savedCatalog={},usedSaved={};try{savedCatalog=JSON.parse(localStorage.getItem('cactus_catalog_cache_v1'))||{};}catch(e){}if(typeof savedCatalog!=='object'||Array.isArray(savedCatalog))savedCatalog={};Object.keys(savedCatalog).forEach(function(key){var entry=savedCatalog[key];if(!entry||typeof entry!=='object'||!entry.data||typeof entry.time!=='number')delete savedCatalog[key];});
  function cacheable(path){return xuper&&/^\/v1\/xuper\/(categories\?|recommendations$|catalog\?|details\?)/.test(path)&&path.indexOf('&query=')<0;}
  function readSaved(path){var d=savedCatalog[base+path];if(!d||!d.data||typeof d.data!=='object')return null;var value=JSON.parse(JSON.stringify(d.data));value.stale=true;return value;}
  function keepSaved(path,data){if(!cacheable(path))return;usedSaved[path]=true;var key=base+path;savedCatalog[key]={time:Date.now(),data:data};var keys=Object.keys(savedCatalog).sort(function(a,b){return savedCatalog[a].time-savedCatalog[b].time;}),text=JSON.stringify(savedCatalog);while((text.length>1500000||keys.length>90)&&keys.length>1){delete savedCatalog[keys.shift()];text=JSON.stringify(savedCatalog);}try{localStorage.setItem('cactus_catalog_cache_v1',text);}catch(e){}}
  function request(path, done) {
    var completed=false,callback=done;
    done=function(err,data){if(completed)return;completed=true;callback(err,data);};
    if (!valid || cfg.demoOnly !== false) {done(new Error('backend_not_configured'));return;}
    var saved=cacheable(path)?readSaved(path):null;if(saved&&!usedSaved[path]){usedSaved[path]=true;done(null,saved);}
    function failure(error){if(saved)done(null,saved);else done(error);}
    var xhr = new XMLHttpRequest();
    xhr.open('GET',base + path,true);xhr.timeout = path.indexOf('/v1/xuper/play?')===0?45000:12000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 200) {failure(new Error('backend_status_'+xhr.status));return;}
      if(!/^application\/json(?:;|$)/i.test(xhr.getResponseHeader('Content-Type')||'')){done(new Error('bad_content_type'));return;}
      try {var data=JSON.parse(xhr.responseText);} catch(e){done(new Error('bad_response'));return;}if(xuper&&Array.isArray(data.items)){data.items.forEach(function(x){['posterUrl','backdropUrl'].forEach(function(key){if(typeof x[key]==='string'&&x[key].indexOf('/v1/xuper/poster?id=xuper-')===0)x[key]=base+x[key];});});}keepSaved(path,data);done(null,data);
    };
    xhr.ontimeout = function(){failure(new Error('timeout'));};
    xhr.onerror = function(){failure(new Error('network_error'));};
    xhr.send();return xhr;
  }
  window.CACTUS_API = {
    source:xuper?'Xuper':'TMDB',
    enabled:valid && cfg.demoOnly === false,
    catalog:function(section,done,page){page=page||1;request(xuper?'/v1/xuper/catalog?section='+encodeURIComponent(section==='trending'?'all':section)+'&page='+page+categoryQuery():'/v1/catalog?section='+encodeURIComponent(section)+'&page='+page,done);},
    search:function(q,done,page,section){page=page||1;request(xuper?'/v1/xuper/catalog?section='+encodeURIComponent(section||'all')+'&query='+encodeURIComponent(q)+'&page='+page+categoryQuery():'/v1/search?q='+encodeURIComponent(q)+'&page='+page,done);},
    setCategory:function(root,column){rootId=String(root||'');columnId=String(column||'');},
    categories:function(section,root,done){request('/v1/xuper/categories?section='+encodeURIComponent(section)+(root?'&rootId='+encodeURIComponent(root):''),done);},
    recommendations:function(done){request('/v1/xuper/recommendations',done);},
    categoryCatalog:function(section,root,column,done){request('/v1/xuper/catalog?section='+encodeURIComponent(section)+'&rootId='+encodeURIComponent(root)+'&columnId='+encodeURIComponent(column)+'&page=1',done);},
    safeImage:function(url){var prefix=base+'/v1/xuper/poster?id=xuper-';if(!xuper||!valid||typeof url!=='string'||url.indexOf(prefix)!==0)return false;var parts=url.slice(prefix.length).split('&'),seen={},rules={variant:/^wide$/,columnId:/^\d+$/,type:/^\d{1,2}$/,contentId:/^[A-Za-z0-9_-]{1,100}$/,episode:/^[1-9]\d{0,5}$/};if(!/^[A-Za-z0-9_-]{1,100}$/.test(parts.shift()))return false;for(var i=0;i<parts.length;i++){var kv=parts[i].split('=');if(kv.length!==2||!Object.prototype.hasOwnProperty.call(rules,kv[0])||seen[kv[0]]||!rules[kv[0]].test(kv[1]))return false;seen[kv[0]]=true;}return true;},
    liveCatalog:function(root,column,page,done,query){request('/v1/xuper/catalog?section=live&rootId='+encodeURIComponent(root)+'&columnId='+encodeURIComponent(column)+'&page='+(page||1)+(query?'&query='+encodeURIComponent(query):''),done);},
    poster:function(x,wide,episode){if(!x||x.source!=='XUPER')return '';var id=x.parentId||x.id;if(!/^xuper-[A-Za-z0-9_-]{1,90}$/.test(id))return '';var ref=x.catalogRef||{},path=base+'/v1/xuper/poster?id='+encodeURIComponent(id);if(/^\d+$/.test(String(ref.columnId))&&/^\d{1,2}$/.test(String(ref.type))&&/^[A-Za-z0-9_-]{1,100}$/.test(String(ref.contentId)))path+='&columnId='+ref.columnId+'&type='+ref.type+'&contentId='+ref.contentId;if(wide)path+='&variant=wide';if(typeof episode==='number'&&episode>0&&episode<=100000)path+='&episode='+episode;return path;},
    xuperDetails:function(x,done,page){var ref=x.catalogRef||{},id=x.parentId||x.id;return request('/v1/xuper/details?id='+encodeURIComponent(id)+'&columnId='+encodeURIComponent(ref.columnId||'')+'&type='+encodeURIComponent(ref.type||'')+'&contentId='+encodeURIComponent(ref.contentId||'')+'&page='+(page||1),done);},
    canPrepare:function(x){return xuper&&valid&&cfg.demoOnly===false&&x&&x.source==='XUPER'&&/^xuper-[A-Za-z0-9_-]{1,90}$/.test(x.parentId||x.id);},
    subtitle:function(path,done){if(!xuper||!/^\/v1\/xuper\/media\/[a-f0-9]{48}\/subtitle-\d{1,3}\.vtt$/.test(path))return done(new Error('invalid_subtitle'));var xhr=new XMLHttpRequest();xhr.open('GET',base+path,true);xhr.timeout=15000;xhr.onload=function(){if(xhr.status===200&&xhr.responseText.length<=2097152&&/^WEBVTT/.test(xhr.responseText))done(null,xhr.responseText);else done(new Error('subtitle_unavailable'));};xhr.onerror=xhr.ontimeout=function(){done(new Error('subtitle_unavailable'));};xhr.send();},
    prepare:function(x,done){var ref=x.catalogRef||{},id=x.parentId||x.id;return request('/v1/xuper/play?id='+encodeURIComponent(id)+'&episode='+encodeURIComponent(x.episodeNumber||1)+'&columnId='+encodeURIComponent(ref.columnId||'')+'&type='+encodeURIComponent(ref.type||'')+'&contentId='+encodeURIComponent(ref.contentId||''),function(err,data){if(err)return done(err);if(!data||!/^\/v1\/xuper\/media\/[a-f0-9]{48}\/(index\.m3u8|video\.ts)$/.test(data.streamUrl||''))return done(new Error('invalid_media'));data.streamUrl=base+data.streamUrl;done(null,data);});},
    details:function(kind,id,done){request('/v1/details?kind='+encodeURIComponent(kind)+'&id='+encodeURIComponent(id),done);},
    status:function(done){request(xuper?'/v1/xuper/status':'/v1/status',done);}
  };
})();
