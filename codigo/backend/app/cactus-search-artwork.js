/* Cactus TV: carátulas de búsqueda recuperadas del catálogo local.
 * No consulta servicios nuevos ni introduce claves externas.
 * ES5/Chromium antiguo: ejecutable en Worker y como fallback en la TV. */
(function(w){'use strict';
 var indexedRecords=null,titleIndex=null,indexBuilds=0;
 function invalidate(){indexedRecords=null;titleIndex=null;}
 function index(records){if(indexedRecords===records&&titleIndex)return titleIndex;var result=Object.create(null);Object.keys(records).forEach(function(key){var r=records[key];if(!r||!artwork(r,false))return;var name=normalized(r.name);if(!name)return;(result[name]||(result[name]=[])).push(key);});indexedRecords=records;titleIndex=result;indexBuilds++;return result;}
 function normalized(v){var s=String(v||'').toLowerCase();
  if(s.normalize)try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(e){}
  return s.replace(/[^a-z0-9]+/g,' ').replace(/^\s+|\s+$/g,'').replace(/\s+/g,' ');
 }
 function firstYear(v){var m=/^(19|20)\d{2}/.exec(String(v||''));return m?m[0]:'';}
 function artwork(r,wide){if(!r)return '';var x=wide?r.wide:r.poster;if(typeof x==='string'&&/^https?:\/\//i.test(x))return x;
  var a=Array.isArray(r.posterList)?r.posterList:[];for(var j=0;j<a.length;j++)if(a[j]&&a[j].fileType===(wide?'poster':'icon')&&a[j].fileUrl)return a[j].fileUrl;
  return a.length&&a[0]&&a[0].fileUrl||'';
 }
 function batch(records,requested){var list=Array.isArray(requested)?requested.slice(0,40):[],wanted=Object.create(null),out={},keys=[],missing=0,i,k,r,n,request;
  for(i=0;i<list.length;i++){
   request=typeof list[i]==='string'?{id:list[i]}:list[i]||{};
   if(!request.id||!/^xuper-[A-Za-z0-9_-]{1,110}$/.test(request.id))continue;
   r=records[request.id];if(!r&&request.id.indexOf('xuper-')===0)r=records['xuper-'+request.id.slice(6).toUpperCase()];
   if(r&&artwork(r,false)){out[request.id]={poster:artwork(r,false),wide:artwork(r,true)};continue;}
   n=normalized(request.title);if(n){if(!wanted[n])wanted[n]=[];wanted[n].push(request);missing++;}
  }
  if(!missing)return out;
  var names=index(records);
  var candidates=Object.create(null);
  Object.keys(wanted).forEach(function(name){candidates[name]=(names[name]||[]).map(function(key){return records[key];}).filter(function(r){return r&&artwork(r,false);});});
  Object.keys(wanted).forEach(function(name){var choices=candidates[name]||[];wanted[name].forEach(function(req){
   var chosen=null,best=-1e6;
   for(var j=0;j<choices.length;j++){var c=choices[j],score=0;
    if(req.type!==undefined&&req.type!==''&&String(req.type)!==String(c.type))continue;
    if(req.type!==undefined&&String(req.type)===String(c.type))score+=10;
    var a=firstYear(req.year),b=firstYear(c.releaseTime);if(a&&b&&a!==b)continue;if(a&&b)score+=20;
    if(artwork(c,true))score+=2;
    if(score>best){best=score;chosen=c;}
   }
   if(chosen)out[req.id]={poster:artwork(chosen,false),wide:artwork(chosen,true)};
  });});
  return out;
 }
 function local(records,ids,query,page){var names=index(records),wanted=normalized(query),allowed=Object.create(null),seen=Object.create(null),hits=[],prefix=[];ids.forEach(function(id){allowed[id]=true;});if(wanted.length<2)return {rows:[],total:0};Object.keys(names).forEach(function(name){if(name.indexOf(wanted)<0)return;names[name].forEach(function(id){if(!allowed[id]||seen[id])return;seen[id]=true;(name.indexOf(wanted)===0?prefix:hits).push(id);});});hits=prefix.concat(hits);return {rows:hits.slice(((page||1)-1)*20,(page||1)*20).map(function(id){return records[id];}),total:hits.length};}
 w.CACTUS_SEARCH_ART={batch:batch,local:local,normalized:normalized,invalidate:invalidate,stats:function(){return {builds:indexBuilds,names:titleIndex?Object.keys(titleIndex).length:0};}};
})(typeof self!=='undefined'?self:window);
