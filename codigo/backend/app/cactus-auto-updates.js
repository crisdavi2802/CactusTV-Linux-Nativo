/* CACTUS TV · actualización segura de datos / avisos de versión · ES5/Tizen3+.
 * Este módulo NO instala WGT, NO descarga ni ejecuta JS externo,
 * NO modifica controles parentales y NO almacena credenciales.
 */
(function(w,d){'use strict';
 var BRANCH='tizen65',LOCAL='0.5.1';
 var HOST='https://cactus-tv-web.pages.dev';
 var ENDPOINT=HOST+'/updates/samsung/manifest.json';
 var storeKey='cactus_remote_manifest_v1_'+BRANCH;
 var last=0, busy=false, timer=null, latest=null, state='Iniciando…', button=null, info=null, link=null, css=null;
 function e(tag,cls,txt){var x=d.createElement(tag);if(cls)x.className=cls;if(typeof txt==='string')x.textContent=txt;return x;}
 function digits(s){return /^\d{1,3}\.\d{1,3}\.\d{1,5}$/.test(s);}
 function cmp(a,b){if(!digits(a)||!digits(b))return 0;var aa=a.split('.'),bb=b.split('.');for(var i=0;i<3;i++){var n=Number(aa[i])-Number(bb[i]);if(n)return n>0?1:-1;}return 0;}
 function show(s){state=s;if(info)info.textContent='Versión '+LOCAL+' · '+state;}
 function safePage(url){return typeof url==='string'&&url.indexOf(HOST)===0&&(url.length===HOST.length||/^\//.test(url.slice(HOST.length)))?url:'';}
 function valid(x){return x&&x.schema===1&&x.channel==='stable'&&x.packages&&x.packages[BRANCH]&&digits(x.packages[BRANCH].latest||'')&&x.ui&&typeof x.ui==='object';}
 function theme(x){var n=Number(x.navFontPercent),a=Number(x.actionFontPercent);
  if(!isFinite(n)||n<90||n>113)n=100;
  if(!isFinite(a)||a<90||a>113)a=100;
  if(!css){css=e('style');css.id='cactus-remote-ui-v1';d.head.appendChild(css);}
  var rules=[];
  if(n!==100){rules.push('@media(min-width:1551px){.tabs .tab{font-size:'+Math.round(19*n/100)+'px!important}}');rules.push('@media(min-width:1161px) and (max-width:1550px){.tabs .tab{font-size:'+Math.round(17*n/100)+'px!important}}');}
  if(a!==100){rules.push('@media(min-width:1161px){.reel-actions button,.hero-reel .primary,.hero-reel .secondary{font-size:'+Math.round(21*a/100)+'px!important}.detail-actions button,.details-card #play,.details-card #favorite{font-size:'+Math.round(20*a/100)+'px!important}}');}
  css.textContent=rules.join('\n');
 }
 function apply(doc,offline){
  if(!valid(doc))return;
  latest=doc;theme(doc.ui);
  /* Solo opciones públicas del menú Más; jamás habilitar contenido adulto por configuración remota. */
  if(doc.ui&&doc.ui.moreCollections&&typeof doc.ui.moreCollections==='object'){
   var allowed={'76783':'kids','76784':'explore','87026':'free','76301':'trending'};
   for(var collectionId in allowed){if(!Object.prototype.hasOwnProperty.call(allowed,collectionId))continue;
    var option=d.querySelector('[data-cactus-collection="'+collectionId+'"]');
    if(option)option.hidden=doc.ui.moreCollections[allowed[collectionId]]===false;
   }
  }

  var p=doc.packages[BRANCH],page=safePage(p.releasePage),available=p.releaseReady===true&&cmp(p.latest,LOCAL)>0&&page;
  if(available){show('Nueva versión '+p.latest+' disponible. En otro dispositivo visita '+HOST+' para instalarla.');if(link){link.textContent='Ver instrucciones de instalación';link.hidden=false;link.onclick=function(){w.open(page,'_blank');};}}
  else{show(offline?'Sin conexión: ajustes guardados':'Configuración remota al día');if(link)link.hidden=true;}
  if(offline)return;
  try{w.localStorage.setItem(storeKey,JSON.stringify({at:Date.now(),manifest:doc}));}catch(ex){}
 }
 function cached(){try{var c=JSON.parse(w.localStorage.getItem(storeKey)||'null');if(c&&c.manifest&&Date.now()-Number(c.at)<30*24*60*60*1000)apply(c.manifest,true);}catch(ex){}
 }
 function check(manual){
  if(busy)return;
  if(!manual&&Date.now()-last<30*60*1000)return;
  last=Date.now();busy=true;if(manual)show('Comprobando versiones…');
  var xhr=new XMLHttpRequest(),completed=false,guard=null;
  function finish(err,data){if(completed)return;completed=true;busy=false;clearTimeout(guard);
   if(err){if(manual)show('No se pudo conectar; Cactus seguirá funcionando.');return;}
   try{var obj=JSON.parse(data);if(!valid(obj)||data.length>16000)throw Error('Formato');apply(obj,false);}catch(ex){if(manual)show('El servidor devolvió una configuración no válida.');}
  }
  try{
   xhr.open('GET',ENDPOINT+'?v='+Date.now(),true);xhr.timeout=9000;
   xhr.onreadystatechange=function(){if(xhr.readyState===4){if(xhr.status===200)finish(null,xhr.responseText||'');else finish('http');}};
   xhr.onerror=xhr.ontimeout=function(){finish('network');};
   guard=setTimeout(function(){try{xhr.abort();}catch(ex){}finish('timeout');},9500);
   xhr.send(null);
  }catch(ex){finish('exception');}
 }
 function ui(){var about=d.getElementById('settings-about');if(!about)return;
  var section=e('div','cactus-update-panel');section.id='cactus-update-panel';
  section.appendChild(e('h4','cactus-update-title','Actualizaciones de Cactus TV'));
  info=e('p','cactus-update-status');info.id='cactus-update-status';section.appendChild(info);
  button=e('button','secondary','Buscar actualizaciones');button.id='cactus-update-check';button.type='button';button.addEventListener('click',function(){check(true);});section.appendChild(button);
  link=e('button','secondary','Instrucciones');link.type='button';link.hidden=true;link.id='cactus-update-link';section.appendChild(link);
  section.appendChild(e('p','cactus-update-hint','Los canales, carátulas y ajustes compatibles se sincronizan por Internet. Los cambios del motor o una versión WGT requieren instalación manual.'));
  about.appendChild(section);show('Listo para consultar');cached();check(false);
  if(!timer)timer=w.setInterval(function(){if(!d.hidden)check(false);},30*60*1000);
  d.addEventListener('visibilitychange',function(){if(!d.hidden)check(false);});
  w.addEventListener('online',function(){check(false);});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',ui);else ui();
 w.CACTUS_AUTO_UPDATES={check:function(){check(true);},getLocalVersion:function(){return LOCAL;},getBranch:function(){return BRANCH;},getLast:function(){return latest;}};
})(window,document);
