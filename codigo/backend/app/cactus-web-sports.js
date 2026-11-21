/* Cactus TV - selector de cuatro rutas web externas documentadas en
 * WiwyXuper.apk (octubre 2026): 3 espejos + página del canal.
 * No extrae cookies, claves, tokens ni manifiestos ocultos.
 * Una página web NO es una señal HLS/DASH. El estado depende de la fuente.
 * Implementación propia para el mando de Samsung; ES5 / Tizen 3+.
 */
(function(w,d){'use strict';
 var ROOT='https://www.tvplusgratis.org/';
 var CHANNELS={"wiwy-tvplus-1":{"slug":"beinsportsxtra","page":"bein-sports-xtra-en-vivo.php"},"wiwy-tvplus-2":{"slug":"liga1","page":"liga-1-en-vivo.php"},"wiwy-tvplus-3":{"slug":"liga1max","page":"liga-1-max-en-vivo.php"},"wiwy-tvplus-4":{"slug":"tudn","page":"tudn-en-vivo.php"},"wiwy-tvplus-5":{"slug":"skysportslaliga","page":"sky-sports-la-liga-en-vivo.php"},"wiwy-tvplus-7":{"slug":"tycsports","page":"tyc-sports-en-vivo.php"},"wiwy-tvplus-9":{"slug":"movistarligadecampeones","page":"movistar-liga-campeones-en-vivo.php"},"wiwy-tvplus-10":{"slug":"directvsports","page":"directv-sports-en-vivo.php"},"wiwy-tvplus-11":{"slug":"directvsports2","page":"directv-sports-2-en-vivo.php"},"wiwy-tvplus-12":{"slug":"directvsportsplus","page":"directv-sports-plus-en-vivo.php"},"wiwy-tvplus-13":{"slug":"espnpremiumlat","page":"espn-premium-en-vivo.php"},"wiwy-tvplus-14":{"slug":"espn","page":"espn-en-vivo.php"},"wiwy-tvplus-15":{"slug":"espn2","page":"espn-2-en-vivo.php"},"wiwy-tvplus-16":{"slug":"espn3","page":"espn-3-en-vivo.php"},"wiwy-tvplus-17":{"slug":"espn4","page":"espn-4-en-vivo.php"},"wiwy-tvplus-18":{"slug":"espn5","page":"espn-5-en-vivo.php"},"wiwy-tvplus-19":{"slug":"espn6","page":"espn-6-en-vivo.php"},"wiwy-tvplus-20":{"slug":"espn7","page":"espn-7-en-vivo.php"},"wiwy-tvplus-21":{"slug":"espnmexico","page":"espn-mexico-en-vivo.php"},"wiwy-tvplus-22":{"slug":"espn2mexico","page":"espn-2-mexico-en-vivo.php"},"wiwy-tvplus-23":{"slug":"espn3mexico","page":"espn-3-mexico-en-vivo.php"},"wiwy-tvplus-24":{"slug":"espn4mexico","page":"espn-4-mexico-en-vivo.php"},"wiwy-tvplus-25":{"slug":"espn5mexico","page":"espn-5-mexico-en-vivo.php"},"wiwy-tvplus-26":{"slug":"aztecadeportes","page":"azteca-deportes-en-vivo.php"},"wiwy-tvplus-27":{"slug":"foxsports","page":"fox-sports-en-vivo.php"}};
 var modal=null,frame=null,heading=null,footer=null,closeButton=null,sourceButtons=[],autoButton=null,confirmButton=null;
 var lastFocus=null,activeItem=null,activeChoice=0,autoMode=false,autoTimer=0,loadToken=0,loadTimer=0,oldOverflow='';
 var CHECK_MS=14000;
 function owns(x){return Object.prototype.hasOwnProperty.call(CHANNELS,x);}
 function urls(item){var id=typeof item==='string'?item:(item&&item.id);if(!owns(id))return [];
  var c=CHANNELS[id],base='core.php?canal='+encodeURIComponent(c.slug);
  return [ROOT+'live/'+base,ROOT+'live2/'+base,ROOT+'live3/'+base,ROOT+c.page];
 }
 function make(tag,cls,txt){var e=d.createElement(tag);if(cls)e.className=cls;if(typeof txt==='string')e.textContent=txt;return e;}
 function savedChoice(item){try{var id=typeof item==='string'?item:(item&&item.id),v=w.localStorage.getItem('cactus_web_good_'+id);if(v!==null&&/^[0-3]$/.test(v))return Number(v);}catch(e){}return -1;}
 function saveChoice(item,index){try{w.localStorage.setItem('cactus_web_good_'+item.id,String(index));}catch(e){}}
 function clearTimers(){clearTimeout(autoTimer);clearTimeout(loadTimer);autoTimer=0;loadTimer=0;}
 function status(txt){if(footer)footer.textContent=txt;}
 function updateAuto(){if(autoButton){autoButton.setAttribute('aria-pressed',String(autoMode));autoButton.textContent=autoMode?'⏳ Automático: activado':'▶ Probar automáticamente';}}
 function build(){if(modal)return;
  modal=make('section','cactus-web-sources');modal.id='cactus-web-source';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Fuentes web deportivas');
  var bar=make('header','cactus-web-header'),info=make('div','cactus-web-controls');
  heading=make('strong','cactus-web-heading');heading.id='cactus-web-heading';bar.appendChild(heading);
  closeButton=make('button','cactus-web-exit','✕ Cerrar');closeButton.type='button';closeButton.id='cactus-web-close';bar.appendChild(closeButton);
  var subtitle=make('p','cactus-web-info','Elige una fuente con ◀ ▶. El modo automático prueba cada página por tiempo; una página cargada no garantiza que el vídeo funcione.');
  var choices=make('nav','cactus-web-choices');choices.setAttribute('aria-label','Alternativas de reproducción');
  var labels=['Fuente 1','Fuente 2','Fuente 3','Original'];
  for(var i=0;i<4;i++){var b=make('button','cactus-web-choice',labels[i]);b.type='button';b.setAttribute('data-source-index',String(i));b.setAttribute('aria-pressed','false');choices.appendChild(b);sourceButtons.push(b);}
  var actions=make('div','cactus-web-actions');
  autoButton=make('button','cactus-web-auto','▶ Probar automáticamente');autoButton.type='button';autoButton.id='cactus-web-auto';autoButton.setAttribute('aria-pressed','false');
  confirmButton=make('button','cactus-web-good','✓ Se ve bien · conservar fuente');confirmButton.type='button';confirmButton.id='cactus-web-good';
  actions.appendChild(autoButton);actions.appendChild(confirmButton);
  footer=make('p','cactus-web-status','');footer.setAttribute('role','status');
  info.appendChild(subtitle);info.appendChild(choices);info.appendChild(actions);info.appendChild(footer);
  frame=make('iframe','cactus-web-frame');frame.setAttribute('title','Visualización de contenido externo');frame.setAttribute('tabindex','-1');
  /* Se conserva aislamiento: no interactuar ni inspeccionar páginas ajenas. */
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');frame.setAttribute('allow','autoplay; fullscreen');
  modal.appendChild(bar);modal.appendChild(info);modal.appendChild(frame);d.body.appendChild(modal);
  closeButton.addEventListener('click',stop);
  for(var j=0;j<sourceButtons.length;j++){(function(index){sourceButtons[index].addEventListener('click',function(){autoMode=false;updateAuto();choose(index,false);});})(j);}
  autoButton.addEventListener('click',function(){if(!activeItem)return;autoMode=!autoMode;updateAuto();if(autoMode)choose(activeChoice,true);else{clearTimers();status('Cambio automático detenido. Usa ◀ ▶ para elegir otra fuente.');}});
  confirmButton.addEventListener('click',function(){if(!activeItem)return;autoMode=false;updateAuto();clearTimers();saveChoice(activeItem,activeChoice);status('Fuente '+(activeChoice+1)+' guardada para este canal. Si deja de funcionar, activa Automático.');confirmButton.focus();});
  frame.addEventListener('load',function(){if(!activeItem||modal.hidden||frame.src==='about:blank')return;
   /* load significa que terminó una navegación, NO que exista vídeo. */
   if(autoMode)status('Página '+(activeChoice+1)+' cargada. Si hay vídeo, pulsa «Se ve bien»; si no, se probará la siguiente.');
   else status('Página '+(activeChoice+1)+' cargada. Si no ves vídeo, usa ◀ ▶ o activa Automático.');
  });
  frame.addEventListener('error',function(){if(!activeItem||modal.hidden)return;if(autoMode){clearTimers();nextAuto();}else status('La página no pudo abrirse. Cambia de fuente.');});
 }
 function choose(index,auto){if(!modal||modal.hidden||!activeItem)return false;
  var all=urls(activeItem);if(index<0||index>=all.length)return false;
  clearTimers();activeChoice=index;
  for(var i=0;i<sourceButtons.length;i++)sourceButtons[i].setAttribute('aria-pressed',String(i===index));
  status('Intentando '+(index===3?'página original':'Fuente '+(index+1))+(auto?' · automático':'')+'…');
  frame.src='about:blank';frame.src=all[index];
  if(!auto||sourceButtons.indexOf(d.activeElement)>=0)sourceButtons[index].focus();
  if(autoMode){autoTimer=setTimeout(function(){nextAuto();},CHECK_MS);}
  return true;
 }
 function nextAuto(){if(!activeItem||!autoMode)return;
  if(activeChoice>=3){autoMode=false;updateAuto();clearTimers();status('Se probaron las 4 páginas. No es posible confirmar el vídeo desde Samsung; elige otra o pulsa «Se ve bien» si funciona.');return;}
  choose(activeChoice+1,true);
 }
 function open(item,choice){var all=urls(item);if(!all.length)return false;
  build();if(!modal.hidden)stop();lastFocus=d.activeElement;activeItem=item;
  heading.textContent=String(item&&item.title||'Deportes adicionales')+' · fuentes';
  modal.hidden=false;
  /* Impide que el navegador desplace la pantalla principal por debajo del selector. */
  oldOverflow=d.documentElement.style.overflow;d.documentElement.style.overflow='hidden';
  var saved=savedChoice(item),initial=typeof choice==='number'?choice:saved>=0?saved:0;
  autoMode=saved<0&&typeof choice!=='number';updateAuto();choose(initial,autoMode);
  /* La apertura automática antes dejaba el foco en el canal seleccionado.
     Samsung continuaba enviando las flechas a la lista que quedó detrás. */
  sourceButtons[initial].focus();
  return true;
 }
 function stop(){if(!modal||modal.hidden)return false;
  clearTimers();autoMode=false;updateAuto();modal.hidden=true;frame.src='about:blank';activeItem=null;d.documentElement.style.overflow=oldOverflow;
  if(lastFocus&&d.documentElement.contains(lastFocus))lastFocus.focus();lastFocus=null;return true;
 }
 function controls(){return sourceButtons.concat([autoButton,confirmButton,closeButton]);}
 function key(e){if(!modal||modal.hidden)return;
  var c=e.keyCode||e.which,handled=false,active=d.activeElement;
  /* Guardia de foco: la navegación siempre ocurre en el selector visible. */
  if(active&&!modal.contains(active)){sourceButtons[activeChoice].focus();active=d.activeElement;}
  if(c===10009||c===27||c===65385||c===8){stop();handled=true;}
  else if(c>=49&&c<=52){autoMode=false;updateAuto();choose(c-49,false);handled=true;}
  else if(c===37||c===39){autoMode=false;updateAuto();choose((activeChoice+(c===39?1:3))%4,false);handled=true;}
  else if(c===38||c===40||c===9){var opts=controls(),index=opts.indexOf(active);if(index<0)index=0;
   var dir=c===38||c===9&&e.shiftKey?-1:1;index=(index+dir+opts.length)%opts.length;opts[index].focus();handled=true;}
  else if(c===13){if(e.repeat){handled=true;}else {if(active&&active.click)active.click();handled=true;}}
  if(handled){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
 }
 d.addEventListener('keydown',key,true);
 w.addEventListener('pagehide',stop);
 w.CACTUS_WEB_SPORTS={get:function(item){var a=urls(item);return a.length?a[0]:null;},sources:urls,open:open,close:stop,
  isOpen:function(){return !!(modal&&!modal.hidden);},count:function(){return Object.keys(CHANNELS).length;}};
})(window,document);
