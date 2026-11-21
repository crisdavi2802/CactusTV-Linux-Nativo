/* Contrato: load devuelve IDs únicos y registros informativos; nunca permisos de reproducción. */
(function(){'use strict';
 function storageKey(suffix){var id=window.CACTUS_PROFILES?window.CACTUS_PROFILES.active().id:'principal';return (id==='principal'?'cactus_v02_':'cactus_v02_profile_'+id+'_')+suffix;}

 function sanitize(ids,records){var result={ids:[],records:{}};
  if(!Array.isArray(ids)||!records||typeof records!=='object'||Array.isArray(records))return result;
  ids.slice(0,500).forEach(function(id){if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||/^(constructor|prototype|__proto__)$/.test(id)||result.ids.indexOf(id)>=0)return;
   var x=records[id];if(!x||x.id!==id||typeof x.title!=='string'||typeof x.description!=='string')return;
   result.ids.push(id);result.records[id]={id:id,title:x.title.slice(0,180),description:x.description.slice(0,1800),category:x.category,source:x.source,kind:x.kind,tmdbId:x.tmdbId,year:x.year,posterUrl:x.posterUrl,rating:x.rating,rightsVerified:false,streamUrl:''};
   if(x.source==='XUPER'&&x.catalogRef&&/^\d+$/.test(String(x.catalogRef.columnId))&&/^[A-Za-z0-9_-]{1,100}$/.test(String(x.catalogRef.contentId))&&/^\d{1,2}$/.test(String(x.catalogRef.type)))result.records[id].catalogRef={columnId:Number(x.catalogRef.columnId),contentId:String(x.catalogRef.contentId),type:String(x.catalogRef.type)};
  });return result;
 }
 window.CACTUS_FAVORITES={sanitize:sanitize,load:function(){try{return sanitize(JSON.parse(localStorage.getItem(storageKey('ids'))),JSON.parse(localStorage.getItem(storageKey('records'))));}catch(e){return sanitize([],{});}},save:function(ids,records){var safe=sanitize(ids,records);try{localStorage.setItem(storageKey('ids'),JSON.stringify(safe.ids));localStorage.setItem(storageKey('records'),JSON.stringify(safe.records));return true;}catch(e){return false;}}};
})();
