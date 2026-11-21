/* Cactus TV Original 0.2.4 — interfaz creada de cero, sin dependencias externas.
 * TMDB exclusivamente para metadatos; las fichas no contienen reproductores.
 */
(function(){
  'use strict';
  var demo=(window.CACTUS_CATALOG&&window.CACTUS_CATALOG.items)||[];
  var api=window.CACTUS_API||{enabled:false};var providerName='Cactus TV';
  var catalog=api.enabled?[]:demo.slice(0), quickRoot='', selected='all', item=null, lastFocused=null, reqNum=0, timer=null, currentPage=1, loadedPage=1, hasNext=false, liveGroup='all', enterHeld=false, sourceRoot='', sourceColumn='', categorySeq=0,browseMode=true,sourceChildren=[],sourceDefaultColumn='',quickCollection='';
  var byId=function(id){return document.getElementById(id);};
  var tabs=byId('tabs'), grid=byId('catalog'), search=byId('search');
  var searchProxy=byId('search-focus'),moreToggle=byId('cactus-more-toggle'),morePanel=byId('cactus-more-panel'),adultTab=byId('cactus-adult-tab');
  function syncSearchProxy(){searchProxy.textContent=search.value||'Buscar películas o series...';}
  function closeSearchEditor(){if(!search.hidden){search.blur();search.hidden=true;search.tabIndex=-1;searchProxy.hidden=false;syncSearchProxy();}}
  function openSearchEditor(){searchProxy.hidden=true;search.hidden=false;search.tabIndex=0;search.focus();}

  var modal=byId('modal'), player=byId('player'), video=byId('video'), play=byId('play');
  var sectionTitle=byId('list-title'), state=byId('catalog-state');
  var titles={all:'Descubrir',movie:'Películas',series:'Series',anime:'Animación japonesa',live:'TV en vivo',favorites:'Mi lista'};
  var favorites=window.CACTUS_FAVORITES.load(), favoriteIds=favorites.ids, favoriteItems=favorites.records;
  function readStorage(key,fallback){try{var v=JSON.parse(localStorage.getItem(key));return v===null?fallback:v;}catch(e){return fallback;}}
  function save(){window.CACTUS_FAVORITES.save(favoriteIds,favoriteItems);}
  function el(tag,css,value){var n=document.createElement(tag);if(css)n.className=css;if(typeof value==='string')n.textContent=value;return n;}
  function showStatus(msg){state.textContent=msg;}
  function isFav(id){return favoriteIds.indexOf(id)>-1;}
  function safeImage(url){return (api.safeImage&&api.safeImage(url))||typeof url==='string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w500\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp)$/.test(url);}
  function posterFor(x,wide){var direct=x&&safeImage(wide?x.backdropUrl:x.posterUrl)?(wide?x.backdropUrl:x.posterUrl):'';
   var url=x&&x.source==='XUPER'&&api.poster?api.poster(x,wide):'';
   return direct|| (safeImage(url)?url:'')||(x&&safeImage(x.posterUrl)?x.posterUrl:'');}
  function posterCandidates(x,primary){var list=[],parts=x&&x.posterAlternates||[];
   function add(u){if(safeImage(u)&&u!==primary&&list.indexOf(u)<0)list.push(u);}
   add(x&&x.backdropUrl);if(x&&x.source==='XUPER'&&api.poster)add(api.poster(x,true));for(var p=0;p<parts.length;p++)add(parts[p]);add(x&&x.posterUrl);if(x&&x.source==='XUPER'&&api.poster)add(api.poster(x,false));
   return list.slice(0,5);
  }
  function validData(obj){return obj&&typeof obj.id==='string'&&typeof obj.title==='string'&&typeof obj.description==='string';}
  function normalize(s){s=String(s).toLowerCase();return s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s;}
  function matches(x,q){return normalize(x.title+' '+x.description).indexOf(normalize(q))!==-1;}
  function shown(){var q=search.value.toLowerCase().trim(),src=selected==='favorites'?favoriteIds.map(function(id){return favoriteItems[id];}).filter(Boolean):catalog;
    return src.filter(function(x){if(quickRoot==='76300'&&!(window.CACTUS_ADULTS&&window.CACTUS_ADULTS.isUnlocked()))return false;var liveMatch=selected!=='live'||liveGroup==='all'||(liveGroup==='available'&&canPlay(x))||(liveGroup==='espn'&&/^ESPN/i.test(x.title))||(liveGroup==='dsports'&&/^DSports/i.test(x.title))||(liveGroup==='other'&&!/^(ESPN|DSports)/i.test(x.title));return liveMatch&&validData(x)&&(quickCollection||q&&api.enabled&&api.source==='Xuper'||selected==='favorites'||selected==='all'||x.category===selected||selected==='anime'&&x.category==='series')&&(!q||(quickCollection?matches(x,q):(api.enabled&&api.source==='Xuper'||matches(x,q))));});}
  function renderContinue(){var shelf=byId('continue-section'),container=byId('continue-catalog');if(selected!=='all'){shelf.hidden=true;return;}if(document.body.classList.contains('is-playing'))return;if(window.CACTUS_WATCH.refreshArtwork)window.CACTUS_WATCH.refreshArtwork();var rows=window.CACTUS_WATCH.list().slice(0,20);shelf.hidden=!rows.length;var old={},keep={};Array.prototype.forEach.call(container.children,function(c){old[c.getAttribute('data-watch-id')]=c;});rows.forEach(function(r,index){var card=old[r.id],created=!card;if(!card){card=el('button','continue-card');card.type='button';card.setAttribute('data-watch-id',r.id);var cover=el('span','continue-art');cover.appendChild(el('span','continue-play','▶'));card.appendChild(cover);var info=el('span','continue-info');info.appendChild(el('strong','',''));info.appendChild(el('small','',''));card.appendChild(info);var progress=document.createElement('progress');progress.setAttribute('aria-label','Progreso de '+r.title);card.appendChild(progress);}keep[r.id]=true;var cover=card.querySelector('.continue-art'),url=posterFor(r,true),art=safeImage(url)?url:'logo.svg',img=cover.querySelector('img');if(!img){img=document.createElement('img');cover.insertBefore(img,cover.firstChild);}if(img.getAttribute('data-art')!==art){img.setAttribute('data-art',art);if(art==='logo.svg'){img.src=art;img.alt='';}else window.CACTUS_IMAGES.attach(img,art);}card.querySelector('strong').textContent=r.title;card.querySelector('small').textContent='Continuar · '+(r.parentId&&r.episodeNumber?'Ep '+r.episodeNumber+' · ':'')+Math.floor(r.position/60)+' min vistos';card.querySelector('progress').max=r.duration;card.querySelector('progress').value=r.position;if(container.children[index]!==card)container.insertBefore(card,container.children[index]||null);});Object.keys(old).forEach(function(id){if(!keep[id])container.removeChild(old[id]);});}
  function shelving(){return !quickCollection&&api.enabled&&api.source==='Xuper'&&selected!=='live'&&selected!=='favorites'&&browseMode&&!search.value.trim();}
  function render(){var liveLayout=selected==='live'&&api.enabled&&api.source==='Xuper',shelves=shelving();byId('live-workspace').hidden=!liveLayout;grid.hidden=liveLayout||shelves;if(!shelves)window.CACTUS_BROWSE.hide();byId('browse-back').hidden=!!quickCollection||!api.enabled||api.source!=='Xuper'||selected==='live'||selected==='favorites'||shelves||Boolean(search.value.trim());byId('live-categories').hidden=selected!=='live'||liveLayout;byId('source-filters').hidden=!!quickCollection||api.source!=='Xuper'||selected==='favorites'||liveLayout;renderContinue();var paging=byId('pagination');paging.hidden=liveLayout||shelves||!api.enabled||selected==='favorites'||selected==='live'&&(api.source!=='Xuper'||liveGroup==='espn')||(!hasNext&&currentPage===1);byId('previous-page').disabled=currentPage<=1;byId('next-page').disabled=!hasNext;byId('page-status').textContent='Página '+currentPage;var focusedId=document.activeElement&&document.activeElement.getAttribute('data-id');sectionTitle.textContent=search.value.trim()?'Resultados de búsqueda':quickCollection||titles[selected]||titles.all;if(window.CACTUS_IMAGES.release)window.CACTUS_IMAGES.release(grid);while(grid.firstChild)grid.removeChild(grid.firstChild);if(liveLayout||shelves)return;
    var items=shown();
    if(!items.length){grid.appendChild(el('p','empty',selected==='favorites'?'Tu lista está vacía. Guarda una ficha para verla aquí.': 'No hay resultados disponibles para esta selección.'));return;}
    for(var i=0;i<items.length;i++){
      var x=items[i],card=el('button','media-card');card.type='button';card.dataset.id=x.id;card.setAttribute('aria-label',(selected==='live'&&canPlay(x)?'Ver en directo: ':'Ver ficha de ')+x.title);
      var poster=el('span','poster'),image=posterFor(x);
      var titleFallback=el('span','cactus-cover-fallback',x.title);poster.appendChild(titleFallback);
      if(safeImage(image)){var img=document.createElement('img');img.alt='';img.setAttribute('data-art',image);img.setAttribute('data-wide-art',posterFor(x,true)||'');var alts=posterCandidates(x,image);if(i<6&&window.CACTUS_IMAGES.attachImmediate)window.CACTUS_IMAGES.attachImmediate(img,image,alts);else window.CACTUS_IMAGES.attach(img,image,alts);poster.appendChild(img);}
      else poster.className+=' poster-unavailable';
      var info=el('span','card-info');info.appendChild(el('span','card-type',x.source==='TMDB'?'TMDB · '+(x.kind==='tv'?'Serie':'Película'):(x.source==='XUPER'?(x.category==='live'?'En directo':x.category==='anime'?'Anime':x.kind==='tv'?'Serie':'Película'):(x.label||x.category))));
      info.appendChild(el('strong','',x.title));info.appendChild(el('small','',isFav(x.id)?'★ En Mi lista':(x.year?x.year+' · ':'')+(typeof x.rating==='number'?'★ '+x.rating.toFixed(1):(selected==='live'?(canPlay(x)?'Ver en directo':'Fuente pendiente'):'Ver detalles'))));
      card.appendChild(poster);card.appendChild(info);grid.appendChild(card);if(focusedId===x.id){card.focus();lastFocused=card;}
    }
  }
  function mergeData(list){catalog=Array.isArray(list)?list.slice(0,60).filter(validData):[];if(quickRoot==='76300'&&window.CACTUS_WATCH&&window.CACTUS_WATCH.markPrivate)window.CACTUS_WATCH.markPrivate(catalog);render();
    if(window.CACTUS_IMAGES){var query=search.value.trim(),page=currentPage,selectedAt=selected,rootAt=quickRoot;
     setTimeout(function(){if(search.value.trim()!==query||selectedAt!==selected||page!==currentPage||rootAt!==quickRoot||grid.hidden)return;
       var a=window.CACTUS_IMAGES.report(grid);if(a.total>0&&a.loaded===0){var detail=a.failed>0?'fallidas '+a.failed:'pendientes '+a.pending;showStatus('Imágenes: 0/'+a.total+' visibles · '+detail+' · comprueba la conexión del servidor de carátulas.');}
     },11500);
    }
   }
  function loadSection(section,keep,finished){finished=finished||function(){};var seq=++reqNum;
    // «Más» nunca utiliza la consulta general ni muestra otras colecciones.
    if(quickCollection&&search.value.trim()){render();showStatus('Resultados dentro de '+quickCollection+' · esta página');finished(null);return;}
    if(quickRoot==='trend-rating'){
      if(!api.recommendations){catalog=[];render();showStatus('No hay puntuaciones disponibles para Tendencias.');finished(null);return;}
      showStatus('Cargando títulos mejor puntuados…');
      api.recommendations(function(err,data){if(seq!==reqNum||quickRoot!=='trend-rating')return;
        var list=!err&&data&&Array.isArray(data.items)?data.items:[];
        list=list.filter(function(x){return validData(x)&&Number(x.rating)>0&&x.category!=='adult'&&x.restricted!==true;});
        list.sort(function(a,b){return (Number(b.rating)||0)-(Number(a.rating)||0);});
        catalog=list.slice(0,40);currentPage=1;hasNext=false;render();
        showStatus(catalog.length?'Destacados por puntuación disponible · '+catalog.length+' títulos':'No se pudieron obtener títulos puntuados.');finished(err||null);
      });return;
    }
    if(quickRoot==='76300'&&!(window.CACTUS_ADULTS&&window.CACTUS_ADULTS.isUnlocked())){catalog=[];render();showStatus('Acceso protegido: introduce el PIN de Adultos.');finished(new Error('pin_required'));return;}
    if(quickRoot&&String(sourceRoot)!==String(quickRoot)){catalog=[];render();showStatus('La colección solicitada no coincide con el catálogo. No se mostrará el catálogo general.');finished(new Error('wrong_collection'));return;}
if(section==='live'&&window.CACTUS_LIVE_UI.isActive()){window.CACTUS_LIVE_UI.search(search.value,finished);return;}if(shelving()&&sourceChildren.length){window.CACTUS_BROWSE.open(section,sourceRoot,sourceChildren,sourceDefaultColumn,keep);hasNext=false;render();showStatus('Explora las colecciones · Ver todo abre el catálogo completo.');finished(null);return;}if(section==='live'&&api.source!=='Xuper'){catalog=window.CACTUS_LIVE.items.slice(0);showStatus(catalog.length+' canales de Wiwy · 7 fuentes disponibles · otros pendientes');render();finished(null);return;}if(!api.enabled){catalog=demo.slice(0);showStatus('Catálogo de demostración · películas y series de muestra');render();finished(null);return;}
    if(section==='favorites'){showStatus('Favoritos guardados en este dispositivo.');render();finished(null);return;}
    if(section==='live'&&liveGroup==='espn'){catalog=window.CACTUS_LIVE.items.filter(function(x){return /^ESPN/i.test(x.title)&&canPlay(x);});hasNext=false;showStatus('ESPN · '+catalog.length+' canales en directo');render();finished(null);return;}
    var q=search.value.trim();if(q.length===1){catalog=[];showStatus('Escribe al menos dos caracteres para buscar.');render();finished(null);return;}showStatus('Cargando catálogo de '+providerName+'…');
    var requestDone=false,previewShown=false;var callback=function(err,data){requestDone=true;if(seq!==reqNum){finished(new Error('superseded'));return;}if(err||!data||!Array.isArray(data.items)){showStatus(keep&&catalog.length?'Sin conexión con el catálogo · se conserva la última consulta.':'No se pudo cargar '+providerName+'. Revisa la conexión e inténtalo de nuevo.');currentPage=loadedPage;if(!keep)catalog=[];render();finished(err||new Error('invalid_response'));return;}
      loadedPage=currentPage;hasNext=data.hasMore===true||(typeof data.totalPages==='number'&&currentPage<data.totalPages);var results=data.items; if(section==='anime'&&!(api.source==='Xuper'&&q.length>=2))results=results.map(function(x){x.category='anime';return x;});
      mergeData(results);if(document.activeElement&&document.activeElement.disabled){var firstCard=grid.querySelector('button');if(firstCard)firstCard.focus();}showStatus(data.stale?'Catálogo guardado · se conserva la última consulta mientras se comprueba la conexión.':api.source==='Xuper'?'Catálogo · '+(typeof data.total==='number'?data.total.toLocaleString()+' títulos · ':'')+'Página '+currentPage+' · actualizado '+new Date().toLocaleTimeString():'Fichas informativas: '+providerName+' · actualizado '+new Date().toLocaleTimeString());finished(null,data);};
    if(q.length>=2&&api.searchPreview)api.searchPreview(q,function(error,data){if(error||requestDone||seq!==reqNum||!data||!data.items||!data.items.length)return;previewShown=true;keep=true;catalog=data.items;hasNext=data.hasMore===true;render();showStatus('Resultados guardados · comprobando novedades…');},currentPage,section);
    if(q.length>=2)api.search(q,callback,currentPage,section);else api.catalog(section==='all'?'trending':section,callback,currentPage);
  }
  function changeTab(name,root,nameInMore){if(!Object.prototype.hasOwnProperty.call(titles,name))return;
    if(quickRoot==='76300'&&root!=='76300'&&window.CACTUS_ADULTS)window.CACTUS_ADULTS.lock();
    quickRoot=root||'';quickCollection=nameInMore||'';
++reqNum;window.CACTUS_BROWSE.hide();browseMode=true;sourceChildren=[];if(window.CACTUS_LIVE_UI.isActive())window.CACTUS_LIVE_UI.close();selected=name;window.scrollTo(0,0);if(document.activeElement===search)closeSearchEditor();search.value='';syncSearchProxy();clearTimeout(timer);liveGroup='all';updateLiveGroups();currentPage=1;loadedPage=1;hasNext=false;
    Array.prototype.forEach.call(tabs.querySelectorAll('[data-section]'),function(x){var on=x.dataset.section===name&&!quickCollection;x.className=on?'tab active':'tab';if(on&&!quickCollection)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});
    if(moreToggle){moreToggle.className=quickCollection&&quickRoot!=='76300'?'tab cactus-more-tab active':'tab cactus-more-tab';moreToggle.setAttribute('aria-expanded','false');}if(adultTab){adultTab.className=quickRoot==='76300'?'tab cactus-adult-tab active':'tab cactus-adult-tab';}if(window.CACTUS_REEL)window.CACTUS_REEL.section(name);if(name==='live'&&api.enabled&&api.source==='Xuper'){render();showStatus('Elige una categoría y un canal.');window.CACTUS_LIVE_UI.open();return;}if(api.source==='Xuper'&&name!=='favorites'){
      sourceRoot='';sourceColumn='';
      if(quickRoot==='trend-rating'){browseMode=false;render();loadSection(name);}
      else{if(quickCollection)browseMode=false;loadSourceCategories(quickRoot||'');}
    }else loadSection(name); }
  function categoryName(name){return {Movies:'Películas','TV Series':'Series',Live:'TV en vivo',Kids:'Infantil',All:'Todas',ChannelList:'Todos los canales'}[name]||name;}
  function categoryLabels(){['root','category'].forEach(function(kind){var select=byId('source-'+kind),option=select.options[select.selectedIndex],button=byId('source-'+kind+'-toggle');button.textContent=(option?categoryName(option.textContent):(kind==='root'?'Colecciones':'Categorías'))+' ⌄';});}
  function fillOptions(select,rows,value){while(select.firstChild)select.removeChild(select.firstChild);rows.forEach(function(row){var option=document.createElement('option');option.value=String(row.id);option.textContent=row.name+(row.restricted?' · restringido':'');option.disabled=Boolean(row.restricted);select.appendChild(option);});select.value=String(value);categoryLabels();}
  var picker=byId('source-picker'),pickerKind='category';
  function closePicker(){picker.hidden=true;byId('source-'+pickerKind+'-toggle').focus();}
  function openPicker(kind){pickerKind=kind;var select=byId('source-'+kind),list=byId('source-picker-options');while(list.firstChild)list.removeChild(list.firstChild);byId('source-picker-title').textContent=kind==='root'?'Colecciones':'Categorías';Array.prototype.forEach.call(select.options,function(option){var button=el('button','category-choice',categoryName(option.textContent));button.type='button';button.dataset.value=option.value;button.disabled=option.disabled;button.setAttribute('aria-pressed',String(option.selected));list.appendChild(button);});picker.hidden=false;var focus=list.querySelector('[aria-pressed=true]:not([disabled])')||list.querySelector('button:not([disabled])');if(focus)focus.focus();}
  byId('source-root-toggle').addEventListener('click',function(){openPicker('root');});byId('source-category-toggle').addEventListener('click',function(){openPicker('category');});byId('source-picker-close').addEventListener('click',closePicker);
  byId('source-picker-options').addEventListener('click',function(e){var button=e.target;if(button.tagName!=='BUTTON'||button.disabled)return;var select=byId('source-'+pickerKind);select.value=button.dataset.value;categoryLabels();closePicker();var event=document.createEvent('Event');event.initEvent('change',true,false);select.dispatchEvent(event);});
  function loadSourceCategories(root){var seq=++categorySeq,section=selected;++reqNum;catalog=[];render();showStatus('Cargando '+(quickCollection||'categorías')+'…');api.categories(section,root,function(err,data){if(seq!==categorySeq||section!==selected)return;
     if(err||!data||!Array.isArray(data.roots)||!Array.isArray(data.children)||root&&String(data.rootId)!==String(root)){
       catalog=[];hasNext=false;render();showStatus(quickCollection?'No se pudo abrir exclusivamente '+quickCollection+'. Se ha evitado mostrar el catálogo general.':'No se pudieron cargar las categorías. Inténtalo de nuevo.');return;
     }
     sourceRoot=String(data.rootId);
     /* Recibir primero las categorías de la raíz ACTUAL. Antes se verificaba
        sourceChildren de la selección anterior, causando una excepción.
        Kids/Adultos a veces son columnas hoja y no contienen subcategorías. */
     sourceChildren=data.children.length?data.children.slice():[];
     if(quickCollection&&!sourceChildren.length){sourceChildren=[{id:data.rootId,name:'Todos',type:'3',restricted:false}];}
     sourceColumn=String(data.defaultColumnId||sourceChildren[0]&&sourceChildren[0].id||'');
     if(quickCollection&&!sourceChildren.some(function(x){return String(x.id)===sourceColumn;}))sourceColumn=String(sourceChildren[0].id);
     sourceDefaultColumn=sourceColumn;
     if(quickCollection&&!sourceChildren.length){catalog=[];hasNext=false;render();showStatus('Esta colección no tiene categorías disponibles.');return;}byId('source-root-label').hidden=selected!=='all'&&!quickCollection;fillOptions(byId('source-root'),data.roots,sourceRoot);fillOptions(byId('source-category'),sourceChildren,sourceColumn);api.setCategory(sourceRoot,sourceColumn);currentPage=1;loadedPage=1;hasNext=false;loadSection(selected);});}
  byId('source-root').addEventListener('change',function(){browseMode=true;search.value='';clearTimeout(timer);loadSourceCategories(this.value);});
  byId('source-category').addEventListener('change',function(){browseMode=false;categoryLabels();sourceColumn=this.value;api.setCategory(sourceRoot,sourceColumn);search.value='';clearTimeout(timer);currentPage=1;loadedPage=1;hasNext=false;loadSection(selected);});
  document.addEventListener('cactusbrowseall',function(e){browseMode=false;sourceColumn=e.detail.columnId;byId('source-category').value=sourceColumn;categoryLabels();api.setCategory(sourceRoot,sourceColumn);currentPage=1;loadedPage=1;search.value='';window.scrollTo(0,0);loadSection(selected);});
  function backToShelves(){browseMode=true;search.value='';loadSection(selected);window.CACTUS_BROWSE.restoreFocus();}
  byId('browse-back').addEventListener('click',backToShelves);
  function canPlay(x){return window.CACTUS_PLAYBACK.canPlay(x);}
  function findItem(id){var original=window.CACTUS_ORIGINAL_MEDIA.lookup(id);if(original)return original;var episode=window.CACTUS_PLAYER.lookup(id);if(episode)return episode;var live=window.CACTUS_LIVE.lookup(id);if(live)return live;for(var i=0;i<catalog.length;i++)if(catalog[i].id===id)return catalog[i];return favoriteItems[id]||window.CACTUS_WATCH.get(id)||null;}
  function modalClose(){window.CACTUS_DETAILS.close();modal.hidden=true;item=null;if(lastFocused&&document.documentElement.contains(lastFocused))window.CACTUS_NAVIGATION.focus(lastFocused);else{var fallback=grid.querySelector('button')||tabs.querySelector('.active');if(fallback)fallback.focus();}}
  function modalOpen(x){if(!x)return;if(quickRoot==='76300'&&window.CACTUS_WATCH&&window.CACTUS_WATCH.markPrivate)window.CACTUS_WATCH.markPrivate([x]);item=x;lastFocused=document.activeElement;window.CACTUS_DETAILS.open(x,{canPlay:canPlay,isFavorite:isFav,item:function(next){item=next;},play:function(next){item=next;playerOpen();}});}
  function toggleFavorite(){if(!item)return;if(window.CACTUS_WATCH&&window.CACTUS_WATCH.isPrivate&&window.CACTUS_WATCH.isPrivate(item))return;var ix=favoriteIds.indexOf(item.id);if(ix>=0){favoriteIds.splice(ix,1);delete favoriteItems[item.id];}else{favoriteIds.push(item.id);favoriteItems[item.id]={id:item.id,title:item.title,description:item.description,category:item.category,posterUrl:item.posterUrl||'',kind:item.kind,tmdbId:item.tmdbId,source:item.source,year:item.year,rating:item.rating,catalogRef:item.catalogRef,rightsVerified:false,streamUrl:''};}
    save();window.CACTUS_DETAILS.favorite();render();}
  function playerClose(){if(player.hidden)return;if(window.CACTUS_TRACKS.isOpen())window.CACTUS_TRACKS.close();window.CACTUS_CHROME.close();player.hidden=true;document.body.classList.remove('is-playing');if(window.CACTUS_LIVE_UI.isActive()&&window.CACTUS_LIVE_UI.isFullscreen()){window.CACTUS_LIVE_UI.returnToPreview();return;}window.CACTUS_PLAYER.close();renderContinue();if(lastFocused&&document.documentElement.contains(lastFocused))window.CACTUS_NAVIGATION.focus(lastFocused);else{var fallback=grid.querySelector('button')||tabs.querySelector('.active');if(fallback)window.CACTUS_NAVIGATION.focus(fallback);}}
  function playerOpen(){if(!canPlay(item))return;if(quickRoot==='76300'&&window.CACTUS_WATCH&&window.CACTUS_WATCH.markPrivate)window.CACTUS_WATCH.markPrivate([item]);window.CACTUS_DETAILS.close();modal.hidden=true;document.body.classList.add('is-playing');player.hidden=false;window.CACTUS_CHROME.open();window.CACTUS_PLAYER.open(item);byId('toggle-video').focus();}
  function overlayOpen(){return !morePanel.hidden|| window.CACTUS_PROFILE_UI.isOpen()||window.CACTUS_SETTINGS.isOpen()||!picker.hidden||!modal.hidden||!player.hidden;}
  function focusMove(code){var root=!morePanel.hidden?morePanel:window.CACTUS_PROFILE_UI.isOpen()?window.CACTUS_PROFILE_UI.root:credits.open||credits.hasAttribute('open')?credits:window.CACTUS_SETTINGS.isOpen()?window.CACTUS_SETTINGS.root:!picker.hidden?picker:window.CACTUS_TRACKS.isOpen()?window.CACTUS_TRACKS.root:(player.hidden?(modal.hidden?document:window.CACTUS_DETAILS.root):player);window.CACTUS_NAVIGATION.move(root,code);}
  /* Un único menú «Más», navegable con el mando; las raíces son las existentes en Super. */
  function closeMore(focus){if(morePanel.hidden)return;morePanel.hidden=true;moreToggle.setAttribute('aria-expanded','false');if(focus!==false)moreToggle.focus();}
  function openMore(){if(window.CACTUS_SETTINGS&&window.CACTUS_SETTINGS.isOpen())return;morePanel.hidden=false;moreToggle.setAttribute('aria-expanded','true');var first=morePanel.querySelector('.cactus-more-choice:not([hidden])');if(first)first.focus();}
  moreToggle.addEventListener('click',function(){if(morePanel.hidden)openMore();else closeMore();});
  byId('cactus-more-close').addEventListener('click',function(){closeMore();});
  morePanel.addEventListener('click',function(e){var t=e.target;while(t&&t!==morePanel&&!t.getAttribute('data-cactus-collection'))t=t.parentNode;
   if(!t||t===morePanel)return;var root=t.getAttribute('data-cactus-collection'),name=t.getAttribute('data-cactus-name');
   if(!/^(76783|76784|76301)$/.test(root))return;closeMore(false);
   if(root==='76301')changeTab('movie','trend-rating','Tendencias');
   else changeTab('movie',root,name);
   moreToggle.focus();
  });
  function syncAdultTab(){if(!adultTab)return;var canShow=!!(window.CACTUS_ADULTS&&window.CACTUS_ADULTS.isEnabled());adultTab.hidden=!canShow;if(!canShow&&quickRoot==='76300'){changeTab('all');}}
  adultTab.addEventListener('click',function(){var guard=window.CACTUS_ADULTS;if(!guard||!guard.isEnabled())return;guard.authorize(function(ok){if(ok)changeTab('movie','76300','Adultos');});});
  document.addEventListener('cactusadultstatuschange',syncAdultTab);
  syncAdultTab();
  tabs.addEventListener('click',function(e){var t=e.target;while(t&&t!==tabs&&!t.getAttribute('data-section'))t=t.parentNode;if(t&&t!==tabs)changeTab(t.getAttribute('data-section'));});
  byId('continue-catalog').addEventListener('click',function(e){var n=e.target;while(n&&n!==this&&!n.getAttribute('data-watch-id'))n=n.parentNode;if(n&&n!==this)modalOpen(findItem(n.getAttribute('data-watch-id')));});
  grid.addEventListener('click',function(e){var t=e.target;while(t&&t!==grid&&!t.getAttribute('data-id'))t=t.parentNode;if(t&&t!==grid){var chosen=findItem(t.getAttribute('data-id'));if(selected==='live'&&canPlay(chosen)){item=chosen;lastFocused=t;playerOpen();}else modalOpen(chosen);}});
  byId('previous-page').addEventListener('click',function(){if(currentPage>1){currentPage--;loadSection(selected,true);}});byId('next-page').addEventListener('click',function(){if(hasNext){currentPage++;loadSection(selected,true);}});
  search.addEventListener('input',function(){syncSearchProxy();currentPage=1;loadedPage=1;hasNext=false;++reqNum;clearTimeout(timer);timer=setTimeout(function(){if(quickCollection)render();else if(api.enabled&&selected!=='favorites'&&(selected!=='live'||api.source==='Xuper'))loadSection(selected);else render();},320);});
  video.addEventListener('error',function(){byId('player-status').textContent=window.CACTUS_SUPPORT?window.CACTUS_SUPPORT.message():'No se pudo abrir esta fuente.';});
  byId('close-modal').addEventListener('click',modalClose);byId('close-player').addEventListener('click',playerClose);play.addEventListener('click',playerOpen);
  modal.addEventListener('click',function(e){if(e.target===modal)modalClose();});player.addEventListener('click',function(e){if(e.target===player)playerClose();});
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='favorite')toggleFavorite();});
  var credits=byId('credits-dialog'),creditsButton=byId('credits');creditsButton.addEventListener('click',function(){if(credits.showModal)credits.showModal();else credits.setAttribute('open','');byId('credits-close').focus();});
  byId('credits-demo').addEventListener('click',function(){if(credits.close)credits.close();else credits.removeAttribute('open');window.CACTUS_SETTINGS.close(false);modalOpen(window.CACTUS_ORIGINAL_MEDIA.items[0]);});
  byId('credits-close').addEventListener('click',function(){if(credits.close)credits.close();else credits.removeAttribute('open');creditsButton.focus();});
  function selectedTab(){return tabs.querySelector('.active')||tabs.querySelector('button');}
  function leaveSearch(focusResults){closeSearchEditor();if(focusResults&&window.CACTUS_LIVE_UI.isActive()){window.CACTUS_LIVE_UI.focusChannels();return;}var target=focusResults?(window.CACTUS_BROWSE.isActive()?window.CACTUS_BROWSE.first():grid.querySelector('button')):selectedTab();(target||searchProxy||selectedTab()).focus();}
  function completeSearch(){clearTimeout(timer);if(quickCollection){render();leaveSearch(true);return;}timer=setTimeout(function(){loadSection(selected,false,function(){leaveSearch(true);});},0);search.blur();}
  function back(){if(window.CACTUS_ADULTS&&window.CACTUS_ADULTS.dialogOpen&&window.CACTUS_ADULTS.dialogOpen())return true;if(!morePanel.hidden){closeMore();return true;}if(window.CACTUS_PROFILE_UI.back())return true;if(credits.open||credits.hasAttribute('open')){if(credits.close)credits.close();else credits.removeAttribute('open');creditsButton.focus();return true;}if(window.CACTUS_SETTINGS.back())return true;if(!picker.hidden){closePicker();return true;}if(window.CACTUS_TRACKS.back())return true;if(!player.hidden){if(window.CACTUS_CHROME.back())return true;playerClose();return true;}if(!modal.hidden){if(window.CACTUS_DETAILS.back())return true;modalClose();return true;}if(document.activeElement===search){leaveSearch(Boolean(search.value.trim()));return true;}if(search.value){search.value='';clearTimeout(timer);loadSection(selected);selectedTab().focus();return true;}if(!quickCollection&&!browseMode&&api.enabled&&api.source==='Xuper'&&selected!=='live'&&selected!=='favorites'){backToShelves();return true;}if(selected!=='all'){changeTab('all');selectedTab().focus();return true;}return false;}
  byId('search-open').addEventListener('click',function(){window.CACTUS_NAVIGATION.focus(searchProxy);});searchProxy.addEventListener('click',openSearchEditor);search.addEventListener('blur',function(){if(!search.hidden){search.hidden=true;search.tabIndex=-1;searchProxy.hidden=false;syncSearchProxy();}});document.addEventListener('cactuswatchchange',renderContinue);
  document.addEventListener('cactusopenitem',function(e){if(!e.detail||!validData(e.detail.item))return;if(e.detail.play&&canPlay(e.detail.item)){item=e.detail.item;lastFocused=document.activeElement;playerOpen();}else modalOpen(e.detail.item);});
  document.addEventListener('cactuslivefullscreen',function(e){item=e.detail.item;lastFocused=document.activeElement;modal.hidden=true;document.body.classList.add('is-playing');player.hidden=false;window.CACTUS_CHROME.open();window.CACTUS_CHROME.show(true);});
  search.addEventListener('search',completeSearch);
  document.addEventListener('keydown',function(e){var code=e.keyCode||e.which,active=document.activeElement;
    if(code===65376){if(active===search)completeSearch();else if(active&&active.blur)active.blur();return;}
    if(code===65385){back();return;}
    if(code===27||code===10009||code===8){if(code===8&&/^(INPUT|TEXTAREA)$/.test(active.tagName))return;if(back())e.preventDefault();return;}
    if(active===search){if(code===13&&!e.isComposing){completeSearch();return;}if(code===38){e.preventDefault();search.blur();window.CACTUS_NAVIGATION.focus(byId('search-open'));return;}if(code===40){e.preventDefault();leaveSearch(true);return;}return;}
    if(active.id==='playback-progress'&&(code===38||code===40)){e.preventDefault();focusMove(code);return;}
    if(code===13&&/^(BUTTON|A)$/.test(active.tagName)){e.preventDefault();if(enterHeld||e.repeat)return;enterHeld=true;active.click();return;}
    if(code===9&&overlayOpen()){e.preventDefault();focusMove(e.shiftKey?37:39);return;}
    if([37,38,39,40].indexOf(code)!==-1&&!/^(INPUT|VIDEO|SELECT|TEXTAREA)$/.test(active.tagName)){e.preventDefault();focusMove(code);}
    if(code===10252&&!player.hidden){e.preventDefault();byId('toggle-video').click();}
  });
  document.addEventListener('keypress',function(e){if((e.keyCode===13||e.which===13)&&enterHeld)e.preventDefault();});
  document.addEventListener('keyup',function(e){if((e.keyCode===13||e.which===13)&&enterHeld){e.preventDefault();enterHeld=false;}});
  window.addEventListener('blur',function(){enterHeld=false;});
  document.addEventListener('tizenhwkey',function(e){if(e.keyName==='back')back();});
  function updateLiveGroups(){var groups=byId('live-categories').querySelectorAll('[data-live-group]');for(var i=0;i<groups.length;i++){var group=groups[i].getAttribute('data-live-group'),on=group===liveGroup;groups[i].hidden=api.source==='Xuper'&&group!=='all'&&group!=='espn';groups[i].setAttribute('aria-pressed',String(on));}}
  byId('live-categories').addEventListener('click',function(e){var n=e.target;while(n&&n!==this&&!n.getAttribute('data-live-group'))n=n.parentNode;if(n&&n!==this){liveGroup=n.getAttribute('data-live-group');currentPage=1;search.value='';updateLiveGroups();if(api.source==='Xuper')loadSection(selected);else render();}});
  document.addEventListener('cactusprofilewillchange',function(){if(!player.hidden)playerClose();if(window.CACTUS_LIVE_UI.isActive())window.CACTUS_LIVE_UI.close();window.CACTUS_DETAILS.close();modal.hidden=true;item=null;});
  document.addEventListener('cactusprofilechange',function(){var loaded=window.CACTUS_FAVORITES.load();favoriteIds=loaded.ids;favoriteItems=loaded.records;item=null;render();if(selected==='live'&&api.enabled&&api.source==='Xuper')window.CACTUS_LIVE_UI.open();});
  // En TV y en navegador, no se necesitan permisos especiales para flechas y Enter.
  syncAdultTab();if(!api.enabled){showStatus('Catálogo de muestra · TV en vivo disponible en su sección');}
  else{showStatus('Cargando '+providerName+'…');if(api.source==='Xuper')loadSourceCategories('');else loadSection('all');}
  var refresh=new window.CactusCatalogRefresh({load:function(done){if(!api.enabled||selected==='favorites'||selected==='live'&&api.source!=='Xuper'||overlayOpen()){done(null);return;}if(window.CACTUS_LIVE_UI.isActive()){window.CACTUS_LIVE_UI.refresh(done);return;}loadSection(selected,true,done);},change:function(){}});refresh.last=Date.now();refresh.start(false);document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh.resume();});window.addEventListener('pagehide',function(){refresh.stop();});window.addEventListener('pageshow',function(){if(refresh.stopped)refresh.start();});
  /* El worker carga las carátulas después de la búsqueda: actualizarlas en
     pantalla sin reconstruir tarjetas ni quitar el foco del control remoto. */
  function updateResultArtwork(){if(!search.value.trim()||!grid||grid.hidden)return;var cards=grid.querySelectorAll('button.media-card');
   for(var i=0;i<cards.length;i++){var card=cards[i],id=card.getAttribute('data-id'),match=null;
    for(var j=0;j<catalog.length;j++)if(catalog[j].id===id){match=catalog[j];break;}
    if(!match)continue;var url=posterFor(match);if(!safeImage(url))continue;
    var holder=card.querySelector('.poster');if(!holder)continue;
    var img=holder.querySelector('img');if(!img){img=document.createElement('img');holder.appendChild(img);}
    if(img.getAttribute('data-art')!==url){img.setAttribute('data-art',url);window.CACTUS_IMAGES.attach(img,url,posterCandidates(match,url));}
   }
  }
  document.addEventListener('cactusartworkchange',function(){renderContinue();updateResultArtwork();});document.addEventListener('cactuspubliccatalogchange',function(e){var section=selected==='all'?'movie':selected;if(e.detail&&e.detail.section&&e.detail.section!==section)return;if(!overlayOpen()){renderContinue();if(!window.CACTUS_ACTIVITY||window.CACTUS_ACTIVITY.idle(2000))refresh.refresh();}});
  window.addEventListener('offline',function(){showStatus('Sin conexión · favoritos y demostración disponibles');});window.addEventListener('online',function(){refresh.refresh();});render();var first=tabs.querySelector('button');if(first)first.focus();
})();
