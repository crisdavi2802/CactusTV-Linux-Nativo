/* Historial por perfil. Guarda progreso y metadatos mínimos, nunca URLs de vídeo,
 * tokens, derechos, contraseñas ni listas de episodios. */
(function(){'use strict';
 /* Privacy: prior releases stored Adultos videos as ordinary movies. On this
    first upgrade, old XUPER resume entries must be purged (including normal
    XUPER entries whose classification was not recorded). Other sources remain. */
 var privateIds=Object.create(null);
 function migrateHistory(){
  var marker='cactus_watch_privacy_migration_048';
  try{if(localStorage.getItem(marker)==='1')return;
   for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);
    if(!/^cactus_watch_v1_/.test(k))continue;
    var rows;try{rows=JSON.parse(localStorage.getItem(k));}catch(e){continue;}
    if(!Array.isArray(rows))continue;
    var clean=rows.filter(function(r){return r&&r.source!=='XUPER';});
    if(clean.length!==rows.length)localStorage.setItem(k,JSON.stringify(clean));
   }
   localStorage.setItem(marker,'1');
  }catch(e){}
 }
 migrateHistory();
 function restricted(x){
  if(!x)return false;
  var ref=x.catalogRef||{},col=String(ref.columnId||'');
  return x.privateContent===true||x.restricted===true||x.category==='adult'||x.isAdult===true||
   col==='76300'||col==='76208'||privateIds[x.id]===true||privateIds[x.parentId]===true;
 }
 function markPrivate(rows){
  if(!Array.isArray(rows))rows=[rows];
  rows.forEach(function(x){if(!x)return;x.privateContent=true;if(x.id)privateIds[x.id]=true;if(x.parentId)privateIds[x.parentId]=true;});
  // An item previously stored without a private marker must not remain in Home.
  var current=read().filter(function(r){return !restricted(r);});write(current);
 }
 var memory={};function key(){var id=window.CACTUS_PROFILES?window.CACTUS_PROFILES.active().id:'principal';return 'cactus_watch_v1_'+id;}
 function valid(r){return r&&typeof r.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(r.id)&&typeof r.title==='string'&&typeof r.position==='number'&&isFinite(r.position)&&r.position>=0&&typeof r.duration==='number'&&isFinite(r.duration)&&r.duration>0;}
 function read(){var k=key(),raw;try{raw=JSON.parse(localStorage.getItem(k));}catch(e){raw=memory[k];}if(!Array.isArray(raw))raw=memory[k]||[];return raw.filter(valid).filter(function(r){return !restricted(r);}).slice(0,100);}
 function write(rows){var k=key();memory[k]=rows;try{localStorage.setItem(k,JSON.stringify(rows));}catch(e){}}
 function resumable(r){return r.position>=1&&r.duration-r.position>2;}
 function publicId(id){return typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);}
 function recent(){return read().map(function(row,index){return {row:row,index:index};}).sort(function(a,b){return (Number(b.row.updatedAt)||0)-(Number(a.row.updatedAt)||0)||a.index-b.index;}).map(function(x){return x.row;});}
 function seasonIds(item){var ids=[];if(publicId(item.parentId))ids.push(item.parentId);if(Array.isArray(item.seriesIds))item.seriesIds.slice(0,100).forEach(function(id){if(publicId(id)&&ids.indexOf(id)<0)ids.push(id);});return ids;}
 function continuing(){
  var rows=recent(),parents=Object.create(null),seen=Object.create(null);
  function root(key){if(!parents[key])parents[key]=key;var result=key,next;while(parents[result]!==result)result=parents[result];while(key!==result){next=parents[key];parents[key]=result;key=next;}return result;}
  function family(r,id){return String(r.source||'LOCAL')+':'+id;}
  // Relaciona temporadas por sus IDs públicos, sin unir obras por títulos parecidos.
  rows.forEach(function(r){if(!publicId(r.parentId))return;var parent=family(r,r.parentId);seasonIds(r).forEach(function(id){parents[root(family(r,id))]=root(parent);});});
  return rows.filter(function(r){var group=publicId(r.parentId)?'series:'+root(family(r,r.parentId)):'item:'+family(r,r.id);if(seen[group])return false;seen[group]=true;
   // Una finalización reciente también oculta capítulos anteriores de la serie.
   return resumable(r);
  });
 }
 function publicArt(url){return typeof url==='string'&&url.length<2048&&/^https?:\/\//.test(url)&&url.indexOf('?')<0&&url.indexOf('@')<0&&window.CACTUS_API&&window.CACTUS_API.safeImage(url);}
 function refreshArtwork(){var changed=false,rows=read(),api=window.CACTUS_API;if(!api||!api.poster)return;rows.forEach(function(r){if(r.source!=='XUPER'||!resumable(r)||restricted(r))return;[['posterUrl',false],['backdropUrl',true]].forEach(function(pair){var url=api.poster(r,pair[1]);if(publicArt(url)&&r[pair[0]]!==url){r[pair[0]]=url;changed=true;}});});if(changed)write(rows);}
 window.CACTUS_WATCH={markPrivate:markPrivate,isPrivate:restricted,refreshArtwork:refreshArtwork,list:continuing,get:function(id){var rows=read();for(var i=0;i<rows.length;i++)if(rows[i].id===id&&resumable(rows[i]))return rows[i];return null;},latest:function(parentId){var rows=recent();for(var i=0;i<rows.length;i++)if((rows[i].parentId||rows[i].id)===parentId&&resumable(rows[i]))return rows[i];return null;},save:function(item,position,duration){if(restricted(item)){var safe=read().filter(function(r){return r.id!==item.id&&r.id!==item.parentId;});write(safe);return false;}if(!item||item.category==='live'||typeof item.id!=='string'||typeof item.title!=='string'||!isFinite(position)||!isFinite(duration)||duration<=0||position<0)return false;var rows=read().filter(function(x){return x.id!==item.id;});if(position>=1){var r={id:item.id,title:item.title.slice(0,180),description:typeof item.description==='string'?item.description.slice(0,500):'',category:item.category,source:item.source,position:Math.min(position,duration),duration:duration,updatedAt:Date.now()};if(publicId(item.parentId)){r.parentId=item.parentId;r.seriesIds=seasonIds(item);if(Number(item.episodeNumber)>0&&Number(item.episodeNumber)<=100000)r.episodeNumber=Number(item.episodeNumber);}if(item.source==='XUPER'){r.catalogRef=item.catalogRef;r.kind=item.kind;}['posterUrl','backdropUrl'].forEach(function(k){var u=item[k];if(publicArt(u))r[k]=u;});if(!valid(r))return false;rows.unshift(r);}write(rows.slice(0,100));return true;},remove:function(id){write(read().filter(function(x){return x.id!==id;}));},clear:function(){write([]);}};
})();
