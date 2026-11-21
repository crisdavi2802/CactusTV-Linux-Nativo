/* TV de tres paneles, con un único reproductor y navegación explícita del mando. */
(function(){'use strict';
 var startupTimer=null,startupAt=0,autoPreviewing=false,autoLeft=0;
 function clearStartup(){clearTimeout(startupTimer);startupTimer=null;}
 function previewReady(){var v=document.getElementById('video');return active&&current&&player.currentId()===current.id&&!engine.paused&&Number(engine.currentTime)>.1&&(engine.isNative()||v.readyState>=3&&v.videoWidth>0);}
 function markPlaying(){if(!previewReady())return false;clearStartup();connection='playing';el('live-preview-placeholder').hidden=true;el('live-preview-state').textContent='En directo · '+current.title;return true;}
 function monitorStartup(){clearStartup();startupAt=Date.now();var id=current.id,token=sequence;function tick(){startupTimer=null;if(!active||!current||current.id!==id||token!==sequence)return;if(document.hidden){startupAt=Date.now();startupTimer=setTimeout(tick,500);return;}if(markPlaying())return;if(Date.now()-startupAt>=12000){var error=new Error('live_startup_timeout');error.code='live_startup_timeout';failed(error);return;}startupTimer=setTimeout(tick,250);}startupTimer=setTimeout(tick,250);}
 var api=window.CACTUS_API,player=window.CACTUS_PLAYER,engine=window.CACTUS_ENGINE,active=false,fullscreen=false,categories=[],root='',category='extras',rows=[],page=1,total=0,hasMore=false,busy=false,sequence=0,current=null,focusTimer=null,query='',connection='idle',extraRows=[],lastSportsData=null;
 function el(id){return document.getElementById(id);}var panel=el('live-workspace'),left=el('live-category-list'),right=el('live-channel-list'),mount=el('live-preview-viewport')||el('live-preview-mount');
 function node(tag,css,text){var n=document.createElement(tag);if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;}
 function label(name){return name==='ChannelList'?'Todos los canales':name;}
 /* La categoría original Deportes no es Deportes adicionales.
    Presentar ambos apartados por separado, incluso sin internet. */
 function sportsFirst(children){var sports=null,seen={},rest=[],all=Array.isArray(children)?children:[];
  all.forEach(function(c){if(!c||c.restricted||String(c.id)==='76208'||seen[String(c.id)])return;seen[String(c.id)]=true;
   if(/^Deportes$/i.test(c.name||'')||String(c.id)==='76206')sports=c;
   else if(String(c.id)!=='espn'&&String(c.id)!=='extras'&&String(c.id).indexOf('wepa:')!==0)rest.push(c);});
  if(!sports)sports={id:'76206',name:'Deportes',restricted:false};
  var adults=window.CACTUS_ADULTS; if(adults&&adults.isEnabled())rest.push({id:'76208',name:'Adultos (+18) · PIN',restricted:false});
  var wepa=[{id:'wepa:sports',name:'Cactus Deportes'},{id:'wepa:news',name:'Cactus Noticias'},{id:'wepa:movies',name:'Cactus Cine TV'},{id:'wepa:series',name:'Cactus Series TV'},{id:'wepa:kids',name:'Cactus Infantiles'},{id:'wepa:music',name:'Cactus Música'},{id:'wepa:all',name:'Cactus Todos'}];if(adults&&adults.isEnabled())wepa.push({id:'wepa:adult',name:'Cactus Adultos (+18) · PIN'});return [{id:'extras',name:'Deportes adicionales',restricted:false},sports].concat(wepa,rest);
 }
 function canPlay(x){return Boolean(window.CACTUS_PLAYBACK&&window.CACTUS_PLAYBACK.canPlay(x));}
 function webPage(x){return Boolean(window.CACTUS_WEB_SPORTS&&window.CACTUS_WEB_SPORTS.get(x));}
 function originalExtras(){var a=window.CACTUS_LIVE&&window.CACTUS_LIVE.items?window.CACTUS_LIVE.items.slice():[];return a.filter(function(x){return !/^wiwy-espn-[1-7]$/.test(x.id);}).concat(a.filter(function(x){return /^wiwy-espn-[1-7]$/.test(x.id);}));}
 function setExtras(data){if(data)lastSportsData=data;data=data||lastSportsData;
  var used={},base=originalExtras(),wepa=window.CACTUS_WEPA;
  extraRows=base.map(function(old){var hit=data&&data.linked&&data.linked[old.id],wa=wepa&&wepa.findSport(old.title);if(hit&&canPlay(hit)){used[hit.id]=true;return Object.assign({},hit,{title:old.title,extraSource:'principal'});}if(wa&&canPlay(wa))return Object.assign({},wa,{id:old.id,title:old.title,extraSource:'wepa'});if(hit){used[hit.id]=true;return Object.assign({},hit,{title:old.title,extraSource:'principal'});}return Object.assign({},old,{extraSource:'antigua'});});
  (data&&data.additional||[]).forEach(function(x){if(!used[x.id]){used[x.id]=true;extraRows.push(Object.assign({},x,{extraSource:'principal'}));}});
  if(category==='extras'){applyExtraFilter(Boolean(data));}
 }
 function applyExtraFilter(autoPreview){var value=String(query||'').toLowerCase();rows=extraRows.filter(function(x){return x.title.toLowerCase().indexOf(value)>=0;});total=rows.length;hasMore=false;renderChannels();
  if(rows.length&&!rows.some(function(x){return current&&x.id===current.id;})){current=null;player.close();var playable=rows.filter(canPlay);if(playable.length&&autoPreview)preview(playable[0],true);else if(!playable.length)el('live-preview-state').textContent='No hay fuentes de reproducción configuradas para esta selección.';}
  if(!rows.length){current=null;player.close();el('live-preview-state').textContent='No se encontraron canales con ese nombre.';}
 }

 function categoryButton(id){var b=left.querySelectorAll('button');for(var i=0;i<b.length;i++)if(b[i].dataset.liveCategory===String(id))return b[i];return null;}
 function channelButton(id){var b=right.querySelectorAll('button');for(var i=0;i<b.length;i++)if(b[i].dataset.liveId===id)return b[i];return null;}
 function visible(n){if(!n)return;n.focus();var parent=n.parentNode;if(n.offsetTop<parent.scrollTop)parent.scrollTop=n.offsetTop;if(n.offsetTop+n.offsetHeight>parent.scrollTop+parent.clientHeight)parent.scrollTop=n.offsetTop+n.offsetHeight-parent.clientHeight;}
 function renderCategories(){var focused=document.activeElement&&document.activeElement.dataset.liveCategory;while(left.firstChild)left.removeChild(left.firstChild);categories.forEach(function(c){var b=node('button','live-category-choice',label(c.name));b.type='button';if(String(c.id)==='extras')b.className+=' live-category-sports';b.dataset.liveCategory=String(c.id);b.disabled=Boolean(c.restricted);b.setAttribute('aria-pressed',String(String(c.id)===category));left.appendChild(b);});if(focused)visible(categoryButton(focused));}
 function renderChannels(){var focused=document.activeElement&&document.activeElement.dataset.liveId;while(right.firstChild)right.removeChild(right.firstChild);rows.forEach(function(x,i){var b=node('button','live-channel-choice');b.type='button';b.dataset.liveId=x.id;b.dataset.index=String(i);b.setAttribute('aria-pressed',String(current&&current.id===x.id));b.appendChild(node('span','live-channel-number',String(i+1)));b.appendChild(node('strong','',x.title));var ok=canPlay(x),web=webPage(x);b.appendChild(node('span',ok?'live-on-air':web?'live-web-source':'live-no-source',ok?(web?'● / Web':'●'):web?'Web × 3':'Sin fuente'));if(!ok&&!web){b.className+=' live-channel-no-source';b.setAttribute('aria-label',x.title+' · fuente no configurada');}else if(web){b.setAttribute('aria-label',x.title+' · reproductor web histórico');}right.appendChild(b);});el('live-channel-count').textContent=String(total);el('live-more').hidden=!hasMore;el('live-more').disabled=busy;if(focused)visible(channelButton(focused));}
 function preview(item,automatic){if(!automatic)autoPreviewing=false;if(!active||!item||current&&current.id===item.id&&connection!=='error')return;clearStartup();autoPreviewing=!!automatic;current=item;if(!canPlay(item)&&webPage(item)){player.close();connection='web';el('live-preview-title').textContent=item.title;el('live-preview-state').textContent='3 fuentes web disponibles · pulsa OK para probarlas en Samsung.';el('live-preview-placeholder').querySelector('p').textContent='Fuente 1, 2, 3 o página original; cambia con izquierda/derecha.';el('live-preview-placeholder').hidden=false;renderChannels();return;}if(!canPlay(item)){player.close();connection='unavailable';el('live-preview-title').textContent=item.title;el('live-preview-state').textContent='Canal inventariado · fuente de reproducción pendiente.';el('live-preview-placeholder').querySelector('p').textContent='No hay una fuente configurada para este canal.';el('live-preview-placeholder').hidden=false;renderChannels();return;}connection='connecting';el('live-preview-title').textContent=item.title;el('live-preview-state').textContent='Conectando canal…';el('live-preview-placeholder').querySelector('p').textContent='Conectando canal…';el('live-preview-placeholder').hidden=false;renderChannels();monitorStartup();if(fullscreen){player.open(item);if(window.CACTUS_CHROME)window.CACTUS_CHROME.open();}else player.preview(item,mount);}
 function requestPreview(item){clearTimeout(focusTimer);autoPreviewing=false;if(!item)return;focusTimer=setTimeout(function(){preview(item);},450);}
 function savedKey(){return 'cactus_live_category_'+window.CACTUS_PROFILES.active().id;}
 function loadPage(next,focusNext,done){done=done||function(){};if(busy){done(null);return;}var token=sequence;busy=true;el('live-more').disabled=true;var fetchPage=category.indexOf('wepa:')===0&&window.CACTUS_WEPA?function(cb){window.CACTUS_WEPA.getPage(category.slice(5),next,query,cb);}:function(cb){api.liveCatalog(root,category,next,cb,query);};fetchPage(function(err,data){if(!active||token!==sequence)return;busy=false;if(err||!data||!Array.isArray(data.items)){el('live-preview-state').textContent='No se pudieron cargar los canales. Prueba otra categoría.';done(err||new Error('live_unavailable'));return;}var old=rows.length;rows=next===1?data.items:rows.concat(data.items);page=next;total=data.total;hasMore=data.hasMore===true;renderChannels();if(next===1&&rows.length&&(!current||!rows.some(function(x){return x.id===current.id;})))preview(rows[0],true);if(!rows.length&&next===1){el('live-preview-state').textContent='Esta categoría no tiene canales disponibles ahora.';el('live-preview-placeholder').querySelector('p').textContent='Prueba otra categoría.';}if(focusNext&&rows[old])visible(channelButton(rows[old].id));done(null);},query);}
 function selectCategory(id,done){clearStartup();autoPreviewing=false;autoLeft=2;var next=String(id),guard=window.CACTUS_ADULTS;
  if((next==='76208'||next==='wepa:adult')&&(!guard||!guard.isEnabled())){if(done)done(new Error('adult_disabled'));return;}
  if((next==='76208'||next==='wepa:adult')&&guard&&!guard.isUnlocked()){guard.authorize(function(ok){if(ok)selectCategory(next,done);else focusMenu();});return;}
  if((category==='76208'||category==='wepa:adult')&&next!==category&&guard)guard.lock();
  ++sequence;busy=false;category=String(id);rows=[];page=1;hasMore=false;total=0;query='';el('search').value='';var searchButton=document.getElementById('search-focus');if(searchButton)searchButton.textContent='Buscar películas o series...';current=null;clearTimeout(focusTimer);player.close();el('live-preview-placeholder').hidden=false;var chosen=categories.filter(function(c){return String(c.id)===category;})[0];el('live-channel-heading').textContent=chosen?label(chosen.name):'Canales';el('live-preview-title').textContent=chosen?label(chosen.name):'TV en vivo';el('live-preview-state').textContent='Cargando canales…';renderCategories();renderChannels();try{localStorage.setItem(savedKey(),category);}catch(e){}
  if(category==='extras'){var currentSequence=sequence;extraRows=[];el('live-preview-state').textContent='Selecciona un canal. La disponibilidad depende de su fuente.';setExtras(null);if(window.CACTUS_WEPA)window.CACTUS_WEPA.ensure(function(err){if(!err&&active&&category==='extras'&&currentSequence===sequence)setExtras(null);});
   if(api.sportsExtras)api.sportsExtras(function(err,data){if(!active||category!=='extras'||currentSequence!==sequence)return;if(!err&&data)setExtras(data);if(done)done(err||null);
     /* Segunda pasada no bloqueante: localizar señales nuevas en el catálogo
        vigente del proveedor y asociarlas al reproductor ya integrado. */
     if(api.sportsExtrasRefresh)api.sportsExtrasRefresh(function(refreshErr,fresh){
      if(!active||category!=='extras'||currentSequence!==sequence)return;
      if(!refreshErr&&fresh)setExtras(fresh);
     });
   });
   else if(done)done(null);
  }else loadPage(1,false,done);
 }
 function expand(){if(!active||!current)return;if(webPage(current)&&(!canPlay(current)||connection==='error')){window.CACTUS_WEB_SPORTS.open(current);return;}if(!canPlay(current))return;if(connection==='error'){preview(current);return;}clearTimeout(focusTimer);fullscreen=true;player.toFullscreen();var event=document.createEvent('CustomEvent');event.initCustomEvent('cactuslivefullscreen',true,false,{item:current});document.dispatchEvent(event);}
 function close(){clearStartup();autoPreviewing=false;if(window.CACTUS_ADULTS)window.CACTUS_ADULTS.lock();active=false;fullscreen=false;++sequence;clearTimeout(focusTimer);busy=false;current=null;player.close();document.body.classList.remove('live-preview-playing');panel.hidden=true;}
 function open(){var token=++sequence;active=true;fullscreen=false;panel.hidden=false;document.body.classList.add('live-preview-playing');el('live-preview-state').textContent='Cargando categorías…';categories=sportsFirst([]);renderCategories();api.categories('live','',function(err,data){if(!active||token!==sequence)return;if(!err&&data){root=String(data.rootId);categories=sportsFirst(data.children);renderCategories();}var saved='extras';try{saved=localStorage.getItem(savedKey())||'extras';}catch(e){}if(saved==='espn'||saved==='76208'||saved==='wepa:adult')saved='extras';if(!categories.some(function(c){return String(c.id)===saved;}))saved='extras';selectCategory(saved);});}
 function header(){var button=document.querySelector('#tabs .active');if(button)button.focus();}
 function focusMenu(){visible(categoryButton(category)||left.querySelector('button'));}
 function focusChannels(){visible(channelButton(current&&current.id)||right.querySelector('button'));}
 left.addEventListener('click',function(e){var b=e.target;while(b&&b!==left&&!b.dataset.liveCategory)b=b.parentNode;if(b&&b!==left)selectCategory(b.dataset.liveCategory);});
 right.addEventListener('focus',function(e){var b=e.target;if(b.dataset.liveId)requestPreview(rows[Number(b.dataset.index)]);},true);
 right.addEventListener('click',function(e){var b=e.target;while(b&&b!==right&&!b.dataset.liveId)b=b.parentNode;if(!b||b===right)return;var item=rows[Number(b.dataset.index)];if(!item)return;
  /* Un solo OK abre el selector web: el cambio de foco iniciaba antes una vista previa y exigía dos OK. */
  if(webPage(item)&&!canPlay(item)){clearTimeout(focusTimer);preview(item);window.CACTUS_WEB_SPORTS.open(item);return;}
  if(current&&current.id===item.id)expand();else preview(item);
 });
 el('live-expand').addEventListener('click',expand);el('live-more').addEventListener('click',function(){if(hasMore)loadPage(page+1,true);});
 function failed(error){if(!active||!current||player.currentId()!==current.id)return;clearStartup();connection='error';var failedId=current.id,token=sequence,next=null,at=-1;for(var i=0;i<rows.length;i++)if(rows[i].id===failedId){at=i;break;}if(autoPreviewing&&autoLeft>0){for(var j=at+1;j<rows.length;j++)if(canPlay(rows[j])){next=rows[j];break;}}
  el('live-preview-state').textContent=(error&&error.code==='live_startup_timeout'?'El canal no respondió a tiempo.':window.CACTUS_SUPPORT?window.CACTUS_SUPPORT.message(error):'Este canal no está disponible ahora.')+(webPage(current)?' Pulsa OK para probar las fuentes web.':' Pulsa OK para reintentar.');el('live-preview-placeholder').querySelector('p').textContent='El canal no respondió. Puedes elegir otro.';el('live-preview-placeholder').hidden=false;player.close();
  if(next){autoLeft--;startupTimer=setTimeout(function(){startupTimer=null;if(!active||token!==sequence||!current||current.id!==failedId||!autoPreviewing||connection!=='error')return;preview(next,true);el('live-preview-state').textContent='El primer canal no respondió. Probando otro de esta categoría…';},250);}
 }
 document.getElementById('video').addEventListener('playing',markPlaying);
 document.getElementById('video').addEventListener('error',function(){failed();});document.addEventListener('cactusplaybackerror',function(e){if(current&&e.detail&&e.detail.id===current.id)failed(e.detail.error);});
 document.addEventListener('keydown',function(e){if(!active||window.CACTUS_SETTINGS&&window.CACTUS_SETTINGS.isOpen())return;var code=e.keyCode||e.which,b=document.activeElement;
  if(fullscreen){if((code===38||code===40)&&window.CACTUS_CHROME&&!window.CACTUS_CHROME.isVisible()){e.preventDefault();e.stopImmediatePropagation();var ix=-1;for(var c=0;c<rows.length;c++)if(current&&rows[c].id===current.id){ix=c;break;}var next=rows[ix+(code===40?1:-1)];if(next)preview(next);}return;}
  var isCategory=b&&b.dataset.liveCategory!==undefined,isChannel=b&&b.dataset.liveId!==undefined;if(!isCategory&&!isChannel&&b!==el('live-expand')&&b!==el('live-adjust'))return;
  if([37,38,39,40].indexOf(code)<0)return;e.preventDefault();e.stopImmediatePropagation();
  if(isCategory){var list=left.querySelectorAll('button:not([disabled])'),i=Array.prototype.indexOf.call(list,b);if(code===38){if(i>0)visible(list[i-1]);else header();}if(code===40&&i<list.length-1)visible(list[i+1]);if(code===39)focusChannels();}
  else if(isChannel){var index=Number(b.dataset.index);
   if(code===37)focusMenu();
   if(code===39){var chosen=rows[index];if(chosen){clearTimeout(focusTimer);preview(chosen);if(webPage(chosen)&&(!canPlay(chosen)||connection==='error'))window.CACTUS_WEB_SPORTS.open(chosen);else visible(el('live-expand'));}}
   if(code===38){if(index>0)visible(channelButton(rows[index-1].id));else header();}
   if(code===40){if(rows[index+1])visible(channelButton(rows[index+1].id));else if(hasMore)loadPage(page+1,true);}}
  
  else if(b===el('live-adjust')){if(code===37)focusMenu();if(code===39||code===40)focusChannels();if(code===38)visible(el('live-expand'));}
  else{if(code===37)focusMenu();if(code===39)focusChannels();if(code===38)header();if(code===40){if(!el('live-adjust').hidden)visible(el('live-adjust'));else focusChannels();}}
 },true);
 document.addEventListener('cactussportfeedchange',function(){if(!active||category!=='extras')return;api.sportsExtras(function(err,data){if(!err&&data)setExtras(data);});});
 document.addEventListener('cactusadultstatuschange',function(){if(!active)return;categories=sportsFirst(categories);if((category==='76208'||category==='wepa:adult')&&(!window.CACTUS_ADULTS||!window.CACTUS_ADULTS.isUnlocked())){selectCategory('extras');return;}renderCategories();});
 window.CACTUS_LIVE_UI={open:open,close:close,focusMenu:focusMenu,focusChannels:focusChannels,isActive:function(){return active;},isFullscreen:function(){return fullscreen;},returnToPreview:function(){fullscreen=false;player.toPreview(mount);focusChannels();},search:function(value,done){value=String(value||'').slice(0,70);if(category==='extras'){query=value;applyExtraFilter(true);if(done)done(null);return;}++sequence;busy=false;query=value;loadPage(1,false,done);},refresh:function(done){api.categories('live','',function(err,data){if(!active){if(done)done(null);return;}if(!err&&data){root=String(data.rootId);categories=sportsFirst(data.children);renderCategories();}if(category==='extras'){if(done)done(null);}else loadPage(1,false,done);});}};
})();
