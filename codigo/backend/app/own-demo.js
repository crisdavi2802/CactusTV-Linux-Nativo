/* Medio original creado por este proyecto: animación vectorial generada localmente.
 * Dos entradas de prueba comparten el mismo clip; no representan una serie Xuper.
 * Registro cerrado de recurso local; jamás admite URLs locales arbitrarias. */
(function(){'use strict';
 var evidence='Animación vectorial y subtítulos originales generados para Cactus TV el 2026-11-03.';
 var first={id:'cactus-preview-1',title:'Prueba del reproductor · Parte 1',description:'Clip original de Cactus TV para probar progreso, subtítulos y cambio de capítulo. No pertenece al catálogo Xuper.',category:'series',label:'PRUEBA PROPIA',source:'CACTUS_ORIGINAL_DEMO',rightsVerified:true,rightsEvidence:evidence,streamUrl:'cactus-demo.mp4',subtitleTracks:[{src:'cactus-demo-es.vtt',language:'es',label:'Español'},{src:'cactus-demo-en.vtt',language:'en',label:'English'}]};
 var second={id:'cactus-preview-2',title:'Prueba del reproductor · Parte 2',description:first.description,category:'series',label:first.label,source:first.source,rightsVerified:true,rightsEvidence:evidence,streamUrl:first.streamUrl,subtitleTracks:first.subtitleTracks};
 var items=[first,second];first.episodes=items;second.episodes=items;
 window.CACTUS_ORIGINAL_MEDIA={items:items,lookup:function(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i];return null;},canPlay:function(x){return Boolean(x&&x.source==='CACTUS_ORIGINAL_DEMO'&&x.rightsVerified===true&&x.rightsEvidence===evidence&&(x.id===first.id||x.id===second.id)&&x.streamUrl==='cactus-demo.mp4');}};
})();
