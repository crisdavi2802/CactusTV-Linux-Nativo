/* Cactus TV · WepaTV M3U catalog adapter (ES5; no Android code or VPN).
 * Lists inspected from the authorized APK; visibility does not prove rights or live availability.
 * Lazy parse, pagination, no auto-open of adult content, no extraction of credentials. */
(function(w){'use strict';
 var data=null,loading=false,wait=[],rows=[],sports={},PAGE=40;
 function normal(s){return String(s||'').toLowerCase().replace(/[áàâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[íìîï]/g,'i').replace(/[óòôö]/g,'o').replace(/[úùûü]/g,'u').replace(/ñ/g,'n').replace(/\([^)]*\)/g,' ').replace(/\b(?:fhd|uhd|hd|sd|4k|1080p|720p|480p)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/^ +| +$/g,'').replace(/ +/g,' ');}
 function valid(u){return typeof u==='string'&&u.length<1600&&/^https?:\/\/[^\s<>]+$/i.test(u)&&!/[\\"']/g.test(u)&&!/[?&](?:token|secret|key|password|username|user|auth|sig|signature|access_token)=/i.test(u);}
 function convert(x,i){return {id:'wepa-'+i,title:x.title,category:'live',source:'CACTUS_WEPA',renderer:'native',streamUrl:x.url,label:'Cactus TV · '+x.group,group:x.group,kind:x.kind,posterUrl:x.logo||'',description:'Canal de TV en vivo. Disponibilidad y permisos sujetos al emisor.'};}
 function init(raw){if(!raw||raw.schema!==1||!Array.isArray(raw.channels))throw Error('wepa_data_invalid');data=raw;
  rows=[];sports={};for(var i=0;i<raw.channels.length&&i<2500;i++){var x=raw.channels[i];if(!x||!valid(x.url)||!x.title||!x.kind)continue;var r=convert(x,i);rows.push(r);if(x.kind==='sports'){var k=normal(r.title);if(!sports[k])sports[k]=r;}}
 }
 function ensure(cb){cb=cb||function(){};if(data){cb(null);return;}wait.push(cb);if(loading)return;loading=true;var xhr=new XMLHttpRequest(),finished=false;
  function done(err){if(finished)return;finished=true;loading=false;var callbacks=wait.slice();wait=[];for(var i=0;i<callbacks.length;i++)callbacks[i](err||null);}
  try{xhr.open('GET','wepa-catalog.json',true);xhr.timeout=11000;xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;try{if(xhr.status!==200&&xhr.status!==0)throw Error('wepa_catalog_http_'+xhr.status);init(JSON.parse(xhr.responseText));done(null);}catch(e){done(e);}};xhr.onerror=function(){done(Error('wepa_catalog_unavailable'));};xhr.ontimeout=function(){done(Error('wepa_catalog_timeout'));};xhr.send();}catch(e){done(e);}}
 function getPage(group,page,query,cb){ensure(function(err){if(err){cb(err);return;}var selected=[],q=normal(query),g=String(group||'all'),i,r;
   for(i=0;i<rows.length;i++){r=rows[i];if(g==='all'&&r.kind==='adult')continue;if(g!=='all'&&r.kind!==g)continue;if(q&&normal(r.title).indexOf(q)<0)continue;selected.push(r);}
   var p=Math.max(1,Math.floor(Number(page)||1)),start=(p-1)*PAGE;cb(null,{items:selected.slice(start,start+PAGE),page:p,total:selected.length,hasMore:start+PAGE<selected.length});});}
 function findSport(name){if(!data)return null;var key=normal(name),match=sports[key];if(!match)return null;return {id:match.id,title:match.title,category:match.category,source:match.source,renderer:'native',streamUrl:match.streamUrl,label:'Cactus TV'};}
 function canPlay(x){return x&&x.source==='CACTUS_WEPA'&&x.category==='live'&&valid(x.streamUrl);}
 w.CACTUS_WEPA={ensure:ensure,getPage:getPage,canPlay:canPlay,findSport:findSport,count:function(){return rows.length;}};
})(window);
