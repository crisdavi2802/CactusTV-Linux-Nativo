/* Cactus TV: comparar imagen local, vertical y horizontal en el MISMO televisor.
   No almacena, transmite ni revela URLs completas, cookies o historiales. */
(function(w,d){'use strict';
 var button=d.getElementById('cactus-posters-diagnose');
 var output=d.getElementById('cactus-posters-report');
 if(!button||!output)return;
 var running=false;
 function hostname(url){var match=/^https?:\/\/([^\/?#]+)/i.exec(String(url||''));return match?match[1].slice(0,85):'archivo local';}
 function inspectImages(){var g=d.getElementById('catalog');var r=w.CACTUS_IMAGES&&w.CACTUS_IMAGES.report?w.CACTUS_IMAGES.report(g):{total:0,loaded:0,failed:0,pending:0};return 'Tarjetas: '+r.total+' imágenes · cargadas '+r.loaded+' · fallidas '+r.failed+' · pendientes '+r.pending+'.';}
 function sample(){var g=d.getElementById('catalog');var card=g&&g.querySelector('.media-card');
  if(card){var i=card.querySelector('.poster img');if(i)return {poster:i.getAttribute('data-art')||'',wide:i.getAttribute('data-wide-art')||'',live:!!(i.complete&&i.naturalWidth>0),hidden:!!i.hidden};}
  return {poster:'',wide:'',live:false,hidden:false};
 }
 function status(v){output.textContent=v;}
 function probe(url,timeout,callback){if(!url){callback('SIN URL');return;}
  var img=new Image(),done=false,clock;
  function end(value){if(done)return;done=true;clearTimeout(clock);img.onload=null;img.onerror=null;callback(value);}
  img.onload=function(){end(img.naturalWidth>0?'OK '+img.naturalWidth+'×'+img.naturalHeight:'SIN PÍXELES');};
  img.onerror=function(){end('ERROR AL ABRIR');};
  clock=setTimeout(function(){end('TIEMPO AGOTADO');},timeout);
  img.src=url;
 }
 function start(){if(running)return;running=true;button.disabled=true;
  var s=sample(),lines=['Diagnóstico 0.4.9',inspectImages(), 'Tarjeta principal: '+(s.live?'la imagen existe ('+(s.hidden?'oculta':'visible')+')':'sin imagen cargada')];
  if(!s.poster)lines.push('No hay una tarjeta activa; abre Kids, Búsqueda o Adultos y vuelve aquí.');
  var tests=[{label:'Imagen local',url:'icon.png'},{label:'Póster vertical',url:s.poster},{label:'Imagen horizontal',url:s.wide}];
  function next(i){if(i>=tests.length){lines.push('Resultado: si LOCAL es OK, pero VERTICAL y HORIZONTAL fallan, revisar el servidor o la conexión de imágenes.');lines.push(inspectImages());status(lines.join('\n'));running=false;button.disabled=false;return;}
   var t=tests[i];probe(t.url,7000,function(result){lines.push(t.label+' ['+hostname(t.url)+']: '+result);status(lines.join('\n'));next(i+1);});
  }
  status(lines.join('\n')+'\nComprobando...');next(0);
 }
 button.addEventListener('click',start);
})(window,document);
