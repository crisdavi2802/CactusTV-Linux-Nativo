/* Catálogo y licencias mediante la sesión NORMAL de cada instalación de la TV.
 * No usa PC, TV Box, cuentas preexistentes ni la clave TMDB de la app antigua. */
(function(w){'use strict';if(!w.CACTUS_RUNTIME.direct)return;
 var cfg=w.XuperConfig,rawApi,dev,session,connecting=null,boot=null,records={},detailCache={},columnCache={},liveCache={},routeCache={},routeJobs={},preparing=0,rootId='',columnId='',subs={},serial=0,background=w.CACTUS_BACKGROUND,fullPromise=null,lookupJobs={};
 var categoryNames={movie:'Movies',series:'TV Series',anime:'Anime',live:'Live'},aliases={spa:'es',esp:'es',eng:'en',por:'pt',jpn:'ja',kor:'ko',zho:'zh',chi:'zh',fra:'fr',fre:'fr',deu:'de',ger:'de',ita:'it',rus:'ru'};
 function list(v){return Array.isArray(v)?v:[];}function text(v,n){return typeof v==='string'?v.slice(0,n||180):'';}function split(v){return typeof v==='string'?v.split(/[,;|，、]+/).map(function(x){return x.trim();}).filter(Boolean):[];}
 function lang(v){return split(v).map(function(x){return aliases[x.toLowerCase()]||x.toLowerCase();}).filter(function(x,i,a){return /^[a-z]{2,3}$/.test(x)&&a.indexOf(x)===i;});}
 function seconds(v){if(typeof v==='number')return v>0?v:0;var p=String(v||'').split(':').map(Number);return p.length>1&&p.every(function(x){return isFinite(x)&&x>=0;})?p.reduce(function(n,x){return n*60+x;},0):0;}
 function image(v){if(typeof v!=='string'||!/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/[^\s]*$/i.test(v)||/[\r\n@]/.test(v))return '';return v;}
 function artwork(r,wide){if(wide&&r.wide)return image(r.wide);if(!wide&&r.poster)return image(r.poster);var rows=list(r.posterList),p=rows.find(function(x){return x.fileType===(wide?'poster':'icon');})||rows[0];return p?image(p.fileUrl):'';}
 function cid(r){return r.channelCode?'xuper-live-'+w.CryptoJS.SHA256(String(r.channelCode)).toString():'xuper-'+r.contentId;}
 /* Buscar suele devolver fichas resumidas sin posterList; conservar el arte
    de la ficha completa cuando ya está en la memoria o en el catálogo local. */
 function supplementArtwork(result,backup){if(!backup)return result;var r=result;
  if(!artwork(r,false)){var poster=artwork(backup,false);if(poster){r=Object.assign({},r);r.poster=poster;}}
  if(!artwork(r,true)){var wide=artwork(backup,true);if(wide){if(r===result)r=Object.assign({},r);r.wide=wide;}}
  return r;
 }

 function remember(r,section,column){var id=r._id||cid(r);if(!r.contentId&&!r.channelCode)return null;r=supplementArtwork(r,records[id]&&records[id].raw);r=supplementArtwork(r,boot&&boot.records[id]);records[id]={raw:r,section:section,column:column};var live=!!r.channelCode,type=String(r.type===undefined?'':r.type),category=live?'live':section==='anime'?'anime':type==='0'?'series':'movie';return {id:id,title:text(r.name),description:text(r.description||r.viewPoint,1800),source:'XUPER',category:category,kind:type==='0'?'tv':'movie',year:/^\d{4}/.test(r.releaseTime||'')?r.releaseTime.slice(0,4):'',rating:Number(r.score)||0,posterUrl:artwork(r,false),backdropUrl:artwork(r,true),rightsVerified:true,playback:'xuper',catalogRef:{columnId:column,type:type,contentId:String(r.contentId||'')}};}
 function storage(){return {get:function(k){try{return localStorage.getItem('cactus_direct_v1_'+k);}catch(e){return null;}},set:function(k,v){try{localStorage.setItem('cactus_direct_v1_'+k,v);}catch(e){}}};}
 function getClient(){if(rawApi)return;dev=new w.XuperDevice.Device({storage:storage()});var preferred;try{preferred=localStorage.getItem('cactus_direct_portal_host');}catch(e){}rawApi=new w.XuperApi.Api({host:cfg.PORTAL_HOSTS.indexOf(preferred)>=0?preferred:undefined,timeout:4000,minInterval:100,fetch:function(u,o){return w.fetch.call(w,u,o);}});session=new w.XuperSession.Session(rawApi,dev);}
 function workerEnabled(){return background&&background.enabled();}
 function connect(){if(workerEnabled())return background.call('connect');getClient();if(connecting)return connecting;connecting=session.ensure().then(function(){return true;},function(e){connecting=null;throw e;});return connecting;}
 function call(path,body,retried){if(workerEnabled())return background.call('api',{path:path,body:body||{}}).catch(function(e){if(!workerEnabled())return call(path,body,retried);throw e;});return connect().then(function(){var args=Object.assign({portalCode:cfg.PORTAL_CODE,userId:dev.userId,userToken:dev.userToken},dev.fields(),body||{});return rawApi.call(path,args);}).then(function(r){try{localStorage.setItem('cactus_direct_portal_host',rawApi.host);}catch(e){}return r.data||{};},function(e){if(!retried&&['aaa100027','aaa100028'].indexOf(String(e.code))>=0){routeCache={};connecting=session.refresh().then(function(){return true;});return call(path,body,true);}throw e;});}
 function fileJSON(file){return new Promise(function(resolve,reject){var x=new XMLHttpRequest();x.open('GET',file,true);x.onload=function(){try{var data=JSON.parse(x.responseText);if(data.format!==1)throw Error('invalid_catalog');resolve(data);}catch(e){reject(e);}};x.onerror=function(){reject(Error('catalog_unavailable'));};x.send();});}
 function applySummary(summary){if(!boot||!summary)return;boot.categories=summary.categories||boot.categories;boot.totals=summary.totals||boot.totals;}
 var ready=fileJSON('catalog-start.json').catch(function(){return {format:1,categories:{},records:{},sections:{},totals:{},previews:{}};}).then(function(data){boot=data;return boot;});
 function fullCatalog(){if(fullPromise)return fullPromise;if(workerEnabled()){fullPromise=background.call('catalog').then(function(summary){applySummary(summary);return boot;}).catch(function(e){if(!workerEnabled()){fullPromise=null;return fullCatalog();}throw e;});}else fullPromise=fileJSON('catalog-bootstrap.json').then(function(data){boot=data;boot.totals={};Object.keys(boot.sections).forEach(function(k){boot.totals[k]=boot.sections[k].length;});return boot;});return fullPromise;}
 var catalogReady=ready.then(fullCatalog);catalogReady.catch(function(){});
 function hydrate(id,r){if(!workerEnabled()||lookupJobs[id])return;lookupJobs[id]=true;background.call('lookup',id).then(function(raw){if(raw){boot.records[id]=raw;if(r)r.raw=supplementArtwork(Object.assign({},raw,r.raw),raw);var event=document.createEvent('Event');event.initEvent('cactusartworkchange',false,false);document.dispatchEvent(event);}delete lookupJobs[id];},function(){delete lookupJobs[id];});}
 if(background)background.on(function(type,data){if(type==='catalogLoaded')ready.then(function(){applySummary(data);});if(type==='catalogChanged')ready.then(function(){applySummary(data.summary);var section=data.section,cats=boot.categories[section];Object.keys(boot.previews||{}).forEach(function(k){if(k.indexOf(cats.rootId+':')===0)delete boot.previews[k];});boot.sections[section]=data.seed.map(function(r){var key=cid(r);boot.records[key]=r;delete records[key];return key;});var event=document.createEvent('CustomEvent');event.initCustomEvent('cactuspubliccatalogchange',false,false,{section:section});document.dispatchEvent(event);});});
 function callback(p,done){var cancelled=false;p.then(function(d){if(!cancelled)done(null,d);},function(e){if(!cancelled){var error=new Error(text(e.message,180)||'provider_unavailable');error.name=e.name||'Error';error.code=e.code;error.cactusPhase=e.cactusPhase;done(error);}});return {abort:function(){cancelled=true;}};}
 function columns(parent){var key=String(parent),hit=columnCache[key];if(hit&&Date.now()-hit.at<300000)return Promise.resolve(hit.rows);var rows=[];function page(n){return call('v3/getColumnContents',{columnId:parent,pageNum:n,pageSize:40,isAv1:'0'}).then(function(d){var batch=list(d.childColumnList);rows=rows.concat(batch);return batch.length===40&&n<1000?page(n+1):rows;});}return page(1).then(function(rows){columnCache[key]={at:Date.now(),rows:rows};return rows;});}
 function categories(section,root){return ready.then(function(){var base=boot&&boot.categories[section==='all'?'movie':section];if(base&&(!root||String(base.rootId)===String(root)))return base;return columns(null).then(function(roots){var r=roots.find(function(x){return root?String(x.id)===String(root):x.name===(categoryNames[section]||'Movies');});if(!r||(String(r.restricted)==='1'&&!(String(root)==='76300'&&w.CACTUS_ADULTS&&w.CACTUS_ADULTS.isUnlocked())))throw Error('collection_unavailable');return columns(r.id).then(function(children){
    var map=function(x){return {id:x.id,name:x.name,type:x.type,restricted:String(x.restricted)==='1'||x.restricted===true};};
    /* Algunas colecciones del proveedor son una columna hoja. Si no tienen
       childColumnList, leer la propia raíz en vez de lanzar TypeError. */
    if(!children.length)children=[{id:r.id,name:'Todos',type:r.type,restricted:false}];
    var all=children.find(function(x){return /^(All|Todas|ChannelList)$/i.test(x.name);})||children[0];
    return {rootId:r.id,rootName:r.name,defaultColumnId:all.id,roots:roots.map(map),children:children.map(map)};
   });});});}
 function sectionForRoot(root,fallback){if(boot)for(var k in boot.categories)if(String(boot.categories[k].rootId)===String(root))return k;return fallback==='all'?'movie':fallback;}
 function normalized(rows,section,column,page,total,hasMore){return {items:rows.map(function(r){return remember(r,section,column);}).filter(Boolean),page:page,total:total,hasMore:hasMore,source:'XUPER'};}
 function localRows(section,column,page,limit){var cats=boot&&boot.categories[section];if(!cats||String(column)!==String(cats.defaultColumnId))return null;var ids=boot.sections[section]||[],start=(page-1)*limit,total=boot.totals&&boot.totals[section]||ids.length;if(ids.length<Math.min(total,start+limit))return null;return normalized(ids.slice(start,start+limit).map(function(id){var r=boot.records[id];r._id=id;return r;}),section,column,page,total,total>page*limit);}
 function shelf(section,root,column,page,preview){return categories(section,root).then(function(c){
  var s=sectionForRoot(c.rootId,section),col=column||c.defaultColumnId,limit=preview?12:40;
  var standard=boot&&boot.categories[s]&&String(boot.categories[s].rootId)===String(c.rootId);
  /* El worker 'page' contiene fichas de Movies/Series/Anime, NO las de Kids
     ni Adultos. Con una raíz especial consultar siempre su columna real. */
  if(standard){
   var local=localRows(s,col,page,limit);if(local)return local;
   var seed=preview&&boot.previews&&boot.previews[c.rootId+':'+col];
   if(seed&&seed.ids.length)return normalized(seed.ids.map(function(id){return boot.records[id];}),s,col,1,seed.total,seed.total>12);
   if(workerEnabled()){var kind=String(col)===String(c.defaultColumnId)?'page':preview?'preview':null;
    if(kind)return background.call(kind,{section:s,root:c.rootId,column:col,page:page,limit:limit}).then(function(d){return normalized(d.rows,s,col,page,d.total,d.hasMore===undefined?d.total>page*limit:d.hasMore);});}
   if(String(col)===String(c.defaultColumnId))return fullCatalog().then(function(){return localRows(s,col,page,limit);});
  }
  return call('v3/getShelveData',{columnId:Number(col),columnType:'2',pageNum:page,pageSize:limit,numDisplay:null,encryptVersion:1}).then(function(d){var total=Number(d.assetListTotalSize)||0;return normalized(list(d.assetList),s,col,page,total,total>page*limit);});
 });}
 function live(root,column,page,query){return categories('live',root).then(function(c){var col=column||c.defaultColumnId,cache=liveCache[col],local=!query&&localRows('live',col,page,40);if(local)return local;var p=cache&&Date.now()-cache.at<300000?Promise.resolve(cache.rows):call('v6/getLiveData',{columnId:Number(col),dataVersion:'',expireTimeStr:'',pageNum:1,pageSize:3000}).then(function(d){var rows=list(d.channelList);liveCache[col]={at:Date.now(),rows:rows};return rows;});return p.then(function(rows){if(query)rows=rows.filter(function(x){return String(x.name||'').toLowerCase().indexOf(query.toLowerCase())>=0;});return {items:rows.slice((page-1)*40,page*40).map(function(x){return remember(x,'live',col);}),page:page,total:rows.length,hasMore:rows.length>page*40};});});}
 /* Canales deportivos adicionales: una instantánea ligera de esta misma instalación,
    con IDs del proveedor ya incorporado. No introduce enlaces ni credenciales nuevas. */
 function sportsExtras(){return ready.then(function(){return fileJSON('sports-extras.json');}).then(function(data){
  var cats=boot&&boot.categories.live,column=cats&&cats.defaultColumnId||'76182',linked={},more=[];
  Object.keys(data.linked||{}).forEach(function(id){linked[id]=remember(data.linked[id],'live',column);});
  list(data.additional).forEach(function(r){var item=remember(r,'live',column);if(item)more.push(item);});
  return {linked:linked,additional:more};
 });}
 /* Coincidencias estrictas entre nombres históricos y catálogo ACTUAL del proveedor.
    Nunca convertimos una página web ni un nombre de canal en una URL de video. */
 var sportsAliases={
  'wiwy-tvplus-1':['bein sports xtra','bein sports extra','be in sports xtra'],
  'wiwy-tvplus-2':['liga 1','liga 1 pe','liga 1 peru'],
  'wiwy-tvplus-3':['liga 1 max','liga 1 max peru','liga1 max'],
  'wiwy-tvplus-4':['tudn','tudn mx','tudn mexico'],
  'wiwy-tvplus-5':['sky sports la liga','sky sports laliga'],
  'wiwy-tvplus-7':['tyc sports','tyc sports argentina'],
  'wiwy-tvplus-9':['movistar liga de campeones','movistar liga campeones','movistar champions league'],
  'wiwy-tvplus-10':['dsports','d sports','directv sports','directv sports pc'],
  'wiwy-tvplus-11':['dsports 2','d sports 2','directv sports 2','dsports2'],
  'wiwy-tvplus-12':['dsports plus','dsports +','dsports+','d sports plus','directv sports plus'],
  'wiwy-tvplus-13':['espn premium','espn premium arg','espn premium argentina'],
  'wiwy-tvplus-21':['espn mexico','espn mx'],
  'wiwy-tvplus-22':['espn 2 mexico','espn 2 mx'],
  'wiwy-tvplus-23':['espn 3 mexico','espn 3 mx'],
  'wiwy-tvplus-24':['espn 4 mexico','espn 4 mx'],
  'wiwy-tvplus-25':['espn 5 mexico','espn 5 mx'],
  'wiwy-tvplus-27':['fox sports','fox sports 1 mx','fox sports central'],
  'wiwy-tvplus-26':['azteca deportes','tv azteca deportes network'],
  'wiwy-espn-deportes':['espn deportes','espn deportes usa'],
  'wiwy-tvplus-28':['dsports max','d sports max','directv sports max'],
  'wiwy-espn-1':['espn','espn 1'],
  'wiwy-espn-2':['espn 2'],
  'wiwy-espn-3':['espn 3'],
  'wiwy-espn-4':['espn 4'],
  'wiwy-espn-5':['espn 5'],
  'wiwy-espn-6':['espn 6'],
  'wiwy-espn-7':['espn 7']
 };
 function sportName(v){return String(v||'').toLowerCase().replace(/[áàâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[íìîï]/g,'i').replace(/[óòôö]/g,'o').replace(/[úùûü]/g,'u').replace(/ñ/g,'n').replace(/\+/g,' plus ').replace(/[^a-z0-9]+/g,' ').replace(/\b(?:hd|fhd|uhd|sd|4k|1080p|720p)\b/g,' ').replace(/\s+/g,' ').trim();}
 function sportMatch(name,id,title){var n=sportName(name);if(!n)return false;
  var labels=sportsAliases[id]||[title];
  if(labels.indexOf(title)<0)labels=labels.concat([title]);
  for(var i=0;i<labels.length;i++)if(n===sportName(labels[i]))return true;
  return false;
 }
 /* Retorna la coincidencia solo si es inequívoca: con ello se evita poner una
    señal errónea de ESPN en ESPN Premium, o DSports en DSports 2. */
 function matchSportsFresh(rows,data){
  var old=w.CACTUS_LIVE&&w.CACTUS_LIVE.items||[],targets=[],lookup={},links={},additional=list(data.additional).slice(),seen={},fresh={};
  old.forEach(function(x){targets.push({id:x.id,title:x.title});});
  additional.forEach(function(x,i){targets.push({id:'additional:'+i,title:x.name,index:i});});
  /* Índice precalculado: una sola normalización por canal; apto para Tizen 3. */
  targets.forEach(function(t){var labels=(sportsAliases[t.id]||[]).concat([t.title]);
   labels.forEach(function(label){var key=sportName(label);if(!key)return;
    if(!lookup[key])lookup[key]=[];
    if(lookup[key].indexOf(t.id)<0)lookup[key].push(t.id);
   });
  });
  list(rows).forEach(function(raw){if(!raw||!raw.channelCode||!raw.name)return;
   var code=String(raw.channelCode);if(!code||seen[code])return;seen[code]=true;
   var keys=lookup[sportName(raw.name)]||[];
   keys.forEach(function(key){if(!fresh[key])fresh[key]=raw;});
  });
  Object.keys(data.linked||{}).forEach(function(id){links[id]=data.linked[id];});
  Object.keys(fresh).forEach(function(id){if(id.indexOf('additional:')===0){var n=Number(id.split(':')[1]);additional[n]=fresh[id];}else links[id]=fresh[id];});
  return {linked:links,additional:additional,matched:Object.keys(fresh).length,totalRaw:list(rows).length};
 }
 /* La consulta utiliza la sesión normal de Cactus. Sin tokens ajenos,
    extracción de reproductores externos ni elusión de controles de acceso. */
 function sportsExtrasRefresh(){return Promise.all([ready,fileJSON('sports-extras.json')]).then(function(parts){
   var data=parts[1],cats=boot&&boot.categories.live,col=cats&&cats.defaultColumnId||76182;
   return call('v6/getLiveData',{columnId:Number(col),dataVersion:'',expireTimeStr:'',pageNum:1,pageSize:3000}).then(function(response){
    var merged=matchSportsFresh(list(response.channelList),data),linked={},additional=[];
    Object.keys(merged.linked).forEach(function(id){linked[id]=remember(merged.linked[id],'live',col);});
    merged.additional.forEach(function(raw){var item=remember(raw,'live',col);if(item)additional.push(item);});
    return {linked:linked,additional:additional,matched:merged.matched,totalRaw:merged.totalRaw};
   });
  });}
 function searchFresh(q,page,section){return call('v3/searchByName',{columnId:-1,value:q,pageNum:page,pageSize:20,type:'1',filter:''}).then(function(d){var rows=[];list(d.searchItemList).forEach(function(g){rows=rows.concat(list(g.itemList));});var total=Number(d.totalSize)||rows.length,c=boot&&boot.categories[section==='anime'?'anime':'series'];
   /* El catálogo instalado es la referencia visual principal: la búsqueda
      puede devolver imágenes temporales distintas que no cargan en Tizen. */
   function deliver(found){var entries=found||{};return {items:rows.map(function(r){
     var id=r._id||cid(r),known=entries[id]||(boot&&boot.records[id]),originalPoster=artwork(r,false),originalWide=artwork(r,true),savedPoster=known&&artwork(known,false),savedWide=known&&artwork(known,true);
     var alternatives=[];
     function alternative(u){if(image(u)&&alternatives.indexOf(u)<0)alternatives.push(u);}
     alternative(savedPoster);alternative(originalPoster);alternative(savedWide);alternative(originalWide);
     if(savedPoster||savedWide){r=Object.assign({},r);if(savedPoster)r.poster=savedPoster;if(savedWide)r.wide=savedWide;}
     var entry=remember(r,section==='anime'?'anime':String(r.type)==='0'?'series':'movie',c?c.defaultColumnId:columnId);
     if(entry){entry.posterAlternates=alternatives;entry.isSearchResult=true;}
     return entry;
    }).filter(Boolean),total:total,page:page,hasMore:total>page*20};}
   if(!rows.length)return deliver();
   var request=rows.map(function(r){return {id:r._id||cid(r),title:text(r.name),type:String(r.type===undefined?'':r.type),year:String(r.releaseTime||'').slice(0,4)};}),pending;
   /* Buscar por ID y por título EXACTO, respetando año y tipo, en el catálogo
      completo. El worker puede tardar en modelos viejos: jamás perder su
      respuesta por haber superado el plazo de visualización inicial. */
   if(workerEnabled())pending=background.call('lookupBatch',request);
   else pending=catalogReady.then(function(){return w.CACTUS_SEARCH_ART.batch(boot.records,request);});
   var timer,early=false;
   var timeLimit=new Promise(function(resolve){timer=setTimeout(function(){early=true;resolve(null);},1700);});
   return Promise.race([pending,timeLimit]).then(function(found){clearTimeout(timer);
    if(early){pending.then(function(late){var changed=false;Object.keys(late||{}).forEach(function(id){var stored=records[id];if(stored&&stored.raw&&late[id]){var fallback=late[id],p=image(fallback.poster),wide=image(fallback.wide);if(p||wide){var raw=Object.assign({},stored.raw);if(p)raw.poster=p;if(wide)raw.wide=wide;stored.raw=raw;changed=true;}}});
      if(changed){var event=document.createEvent('Event');event.initEvent('cactusartworkchange',false,false);document.dispatchEvent(event);}
     },function(){});}
    return deliver(found);
   },function(){clearTimeout(timer);return deliver();});
  });}
 var searchCache=Object.create(null),searchJobs=Object.create(null),searchOrder=[],searchHits=0;
 function search(q,page,section){var normalizedQuery=String(q||'').trim().replace(/\s+/g,' '),key=section+':'+page+':'+normalizedQuery.toLowerCase(),hit=searchCache[key];
  if(hit&&Date.now()-hit.at<120000){searchHits++;return Promise.resolve(hit.data);}
  if(searchJobs[key])return searchJobs[key];
  searchJobs[key]=searchFresh(normalizedQuery,page,section).then(function(data){delete searchJobs[key];if(!searchCache[key])searchOrder.push(key);searchCache[key]={at:Date.now(),data:data};while(searchOrder.length>12)delete searchCache[searchOrder.shift()];return data;},function(error){delete searchJobs[key];throw error;});return searchJobs[key];
 }
 function searchPreview(q,done,page,section){var task=workerEnabled()?background.call('searchPreview',{query:q,page:page||1,section:section||'all'}):Promise.resolve({rows:[],total:0});return callback(task.then(function(data){return normalized(data.rows||[],section==='anime'?'anime':'movie','',page||1,data.total||0,(data.total||0)>(page||1)*20);}),done);}
 w.CACTUS_SEARCH_CACHE={status:function(){return {entries:searchOrder.length,hits:searchHits,pending:Object.keys(searchJobs).length};}};
 function record(x){var id=x.parentId||x.id,r=records[id],raw=boot&&boot.records[id];if(r){if(raw&&!artwork(r.raw,false))r.raw=Object.assign({},raw,r.raw);if(!artwork(r.raw,false))hydrate(id,r);return r;}if(raw){var section=x.category==='anime'?'anime':String(raw.type)==='0'?'series':'movie',c=boot.categories[section];remember(raw,section,c.defaultColumnId);return records[id];}var ref=x.catalogRef;if(!ref||!ref.contentId)throw Error('unknown_item');var section=x.category||'series';remember({contentId:ref.contentId,type:ref.type,name:x.title},section,ref.columnId);hydrate(id,records[id]);return records[id];}
 function asset(x){return ready.then(function(){var id=x.parentId||x.id,r=record(x),hit=detailCache[id];if(hit&&Date.now()-hit.at<300000)return hit.data;return call('v4/getItemData',{contentId:r.raw.contentId,type:r.raw.type,macAddr:dev?dev.sn:'',sortType:'0',language:'es'}).then(function(d){var data=Object.assign({},r.raw,d.assetData||{});if(list(data.posterList).length){delete data.poster;delete data.wide;}detailCache[id]={at:Date.now(),data:data};remember(data,r.section,r.column);return data;});});}
 function details(x,page){return asset(x).then(function(d){var r=record(x),base=remember(d,r.section,r.column),seasons=[],seen={};list(d.sameSeasonSeriesList).forEach(function(s){var id='xuper-'+s.contentId,n=Number(s.seasonNumber);if(!/^[A-Za-z0-9_-]{1,100}$/.test(s.contentId)||!Number.isSafeInteger(n)||n<0||seen[id])return;seen[id]=true;seasons.push({id:id,number:n,label:n?'Temporada '+n:'Especiales',catalogRef:{columnId:r.column,type:'0',contentId:s.contentId}});});var current=seasons.find(function(s){return s.id===base.id;}),number=current?current.number:Number((/\bT(\d+)\b/.exec(base.title)||[])[1])||1;if(base.kind==='tv'&&!current)seasons.push({id:base.id,number:number,label:'Temporada '+number,catalogRef:base.catalogRef});seasons.sort(function(a,b){return a.number-b.number;});var rows=base.kind==='tv'?list(d.simpleProgramList):[];return {source:'XUPER',item:Object.assign(base,{description:text(d.description||d.viewPoint,8000),duration:seconds(d.duration),genres:split(d.tags),countries:split(d.originalCountry),directors:split(d.director),cast:split(d.actorDisplay),audioLanguages:lang(d.audioInfo||d.language),subtitleLanguages:lang(d.subsInfo),seasons:seasons,selectedSeason:number,episodes:rows.slice((page-1)*32,page*32).map(function(e,i){var n=Number(e.seriesNumber)||(page-1)*32+i+1;return {number:n,title:'Episodio '+n,duration:seconds(e.duration),thumbnailEpisode:list(e.posterList).length?n:0};}),episodeCount:rows.length,hasMoreEpisodes:rows.length>page*32})};});}
 function routes(kind){var hit=routeCache[kind];if(hit&&hit.expires>Date.now())return Promise.resolve(hit.data);if(routeJobs.shared)return routeJobs.shared;routeJobs.shared=call('v9/getAuthInfo',{type:'',lang:'es'}).then(function(a){return call('v15/getSlbInfo',{appParams:'',appVer:cfg.APK_VERSION,encMediaSupported:1,hasPay:a.hasPay,userIdentity:a.userIdentity,lang:'es',liveCodeList:[cfg.SECTIONS.live],pipFlag:'0',type:'merge'});}).then(function(d){var expiry=Date.now()+300000;list(d.cdn_list).forEach(function(c){list(c.url_list).forEach(function(u){var p=w.XuperStream.Stream.parseParams(u.url);if(Number(p.expired)>Date.now()/1000)expiry=Math.min(expiry,Number(p.expired)*1000-60000);});});routeCache.live=routeCache.vod={data:d,expires:expiry};routeJobs.shared=null;return d;},function(e){routeJobs.shared=null;throw e;});return routeJobs.shared;}
 function prepare(x){preparing++;var r,phase='catalog';return ready.then(function(){r=record(x);phase=r.section==='live'?'live-start':'asset';return r.section==='live'?call('v4/startPlayLive',{channelCode:r.raw.channelCode,columnId:r.column,type:'0'}):asset(x);}).then(function(d){if(r.section==='live')return {play:d,kind:'live',item:r.raw};var programs=list(d.simpleProgramList),episode=Number(x.episodeNumber)||1,chosen=programs.find(function(e,i){return (Number(e.seriesNumber)||i+1)===episode;});var cats=boot.categories[r.section]||boot.categories.series,root=cats&&list(cats.roots)[0],args=String(r.raw.type)==='0'?{columnId:root&&root.id,contentId:d.contentId,seriesContentId:d.contentId,type:'0',startTime:0,authType:'1',episodeNumberList:[episode]}:{contentId:d.contentId,language:'es',macAddr:'02:00:00:00:00:00',sortType:'0',type:r.raw.type};phase='vod-start';return call('v10/startPlayVOD',args).then(function(play){var ep=list(play.episodeList).find(function(e){return Number(e.episodeNumber)===episode;})||list(play.episodeList)[0];if(!ep)throw Error('video_unavailable');var files=[];list(ep.totalMovieList).forEach(function(g){files=files.concat(list(g.movieList));});files=files.filter(function(f){return list(f.licenseList).length&&String(f.videoFormat||'ts').toLowerCase()==='ts';}).sort(function(a,b){return (/h264|avc/i.test(a.encodeFormat||'')?0:1)-(/h264|avc/i.test(b.encodeFormat||'')?0:1);});var file=files[0];if(!file)throw Error('compatible_video_unavailable');var license=list(file.licenseList).find(function(l){return l.tag==='free';})||file.licenseList[0];return {play:{license:license.license,container:file.videoFormat},kind:'vod',episode:episode,programs:programs,subtitleList:ep.subtitleList||[],codec:file.encodeFormat,item:d};});}).then(function(info){phase='routes';return routes(info.kind).then(function(slb){phase='license';var stream=new w.XuperStream.Stream(rawApi,dev),media=stream.createCflSession(info.kind,info.play,slb),key=String(++serial),subtitleTracks=list(info.subtitleList).map(function(s,i){var f=list(s.file).find(function(x){return /vtt/i.test(x.fileType||'');})||list(s.file)[0],path='direct-sub:'+key+':'+i;if(f)subs[path]=f.url;return {src:path,language:s.language,label:s.language};});return {streamUrl:'direct:'+key,renderer:'direct',directSession:{kind:info.kind,transport:media,codec:info.codec,title:x.title,description:info.item},episode:info.episode||1,seriesIds:info.kind==='vod'&&String(r.raw.type)==='0'?[x.parentId||x.id].concat(list(info.item.sameSeasonSeriesList).map(function(s){return 'xuper-'+s.contentId;})).filter(function(id){return /^xuper-[A-Za-z0-9_-]{1,94}$/.test(id);}).slice(0,100):[],episodes:list(info.programs).map(function(e,i){return {number:Number(e.seriesNumber)||i+1,title:e.name};}),subtitleTracks:subtitleTracks};});}).then(function(value){preparing--;return value;},function(e){preparing--;e.cactusPhase=phase;throw e;});}
 function recommendations(){return ready.then(function(){var cats=boot.categories.movie;if(boot.recommendations)return {items:boot.recommendations.map(function(id){return remember(boot.records[id],'movie',cats.defaultColumnId);})};var ids=(boot.sections.movie||[]).filter(function(id){return Number(boot.records[id].score)>0&&Number(boot.records[id].score)<=10;}).sort(function(a,b){return Number(boot.records[b].score)-Number(boot.records[a].score);}).slice(0,20);return {items:ids.map(function(id){return remember(boot.records[id],'movie',cats.defaultColumnId);})};});}
 w.CACTUS_API={enabled:true,source:'Xuper',direct:true,catalog:function(section,done,page){return callback(shelf(section==='trending'?'all':section,rootId,columnId,page||1),done);},categories:function(section,root,done){return callback(categories(section,root),done);},setCategory:function(root,column){rootId=root;columnId=column;},categoryCatalog:function(section,root,column,done){return callback(shelf(section,root,column,1,true),done);},liveCatalog:function(root,column,page,done,query){return callback(live(root,column,page||1,query),done);},sportsExtras:function(done){return callback(sportsExtras(),done);},sportsExtrasRefresh:function(done){return callback(sportsExtrasRefresh(),done);},searchPreview:searchPreview,search:function(q,done,page,section){return callback(search(q,page||1,section||'all'),done);},recommendations:function(done){return callback(recommendations(),done);},xuperDetails:function(x,done,page){return callback(details(x,page||1),done);},prepare:function(x,done){return callback(prepare(x),done);},canPrepare:function(x){return !!x&&x.source==='XUPER'&&/^xuper-[A-Za-z0-9_-]{1,100}$/.test(x.parentId||x.id);},safeImage:function(url){return !!image(url);},poster:function(x,wide,episode){try{var r=record(x).raw;if(episode){var d=detailCache[x.parentId||x.id],e=d&&list(d.data.simpleProgramList).find(function(e,i){return (Number(e.seriesNumber)||i+1)===episode;});if(e&&list(e.posterList).length)return artwork(e,wide);}return artwork(r,wide);}catch(e){return '';}},subtitle:function(path,done){var url=subs[path];if(!image(url))return done(Error('subtitle_unavailable'));callback(w.fetch.call(w,url).then(function(r){if(!r.ok)throw Error('subtitle_unavailable');return r.text();}).then(function(t){t=t.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');if(!t.startsWith('WEBVTT'))t='WEBVTT\n\n'+t.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');return t;}),done);},status:function(done){callback(connect().then(function(){return {configured:true,direct:true};}),done);}};
 function cleanPublic(r){return {contentId:r.contentId,channelCode:r.channelCode,type:String(r.type===undefined?'':r.type),name:text(r.name),description:text(r.description||r.viewPoint,500),releaseTime:text(r.releaseTime),score:r.score,poster:artwork(r,false),wide:artwork(r,true)};}
 function applySection(section,snapshot){if(w.CACTUS_SEARCH_ART.invalidate)w.CACTUS_SEARCH_ART.invalidate();searchCache=Object.create(null);searchOrder=[];if(!boot||!snapshot||!Array.isArray(snapshot.rows)||!snapshot.categories)return;boot.categories[section]=snapshot.categories;boot.sections[section]=snapshot.rows.map(function(r){r=cleanPublic(r);var id=cid(r);r._id=id;boot.records[id]=r;delete records[id];return id;});boot.totals=boot.totals||{};boot.totals[section]=boot.sections[section].length;boot.sync=boot.sync||{};boot.sync[section]=snapshot.state;var event=document.createEvent('Event');event.initEvent('cactuspubliccatalogchange',false,false);document.dispatchEvent(event);}
 w.CACTUS_DIRECT={connect:connect,call:call,ready:ready,catalogReady:catalogReady,asset:asset,details:details,routes:routes,prepare:prepare,columns:columns,cleanPublic:cleanPublic,snapshot:function(){return boot;},isBusy:function(){return preparing>0;},applySection:applySection};
 ready.then(function(){setTimeout(function(){connect().then(function(){return routes('live');}).catch(function(){});},500);});
 var heartbeatBusy=false;function heartbeat(){if(document.hidden||heartbeatBusy||!rawApi&&!workerEnabled())return;heartbeatBusy=true;call('v5/heartbeat',{}).catch(function(){}).then(function(){heartbeatBusy=false;});}setInterval(heartbeat,30000);document.addEventListener('visibilitychange',function(){if(!document.hidden)heartbeat();});
})(window);
