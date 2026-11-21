/* Motor propio: AVPlay en Samsung para HLS/pistas/saltos; HTML5 para otros equipos. */
(function(){'use strict';
 var video=document.getElementById('video'),surface=document.getElementById('native-video'),stage=document.getElementById('video-stage'),av=window.webapis&&window.webapis.avplay,native=false,url='',sequence=0,ready=false,preparing=false,paused=true,time=0,duration=0,pendingPlay=false,seeking=false,seekTarget=null,seekTimer=null,seekDelay=null,audios=[],subtitles=[];
 /* AVPlay renderiza en un plano nativo distinto al HTML5. El <object>
    no debe heredar el desplazamiento del #video-stage: ambos se anclan
    directamente al body y reciben el MISMO rectángulo de pantalla. */
 document.body.appendChild(stage);stage.hidden=true;
 document.body.appendChild(surface);surface.hidden=true;
 surface.style.position='fixed';surface.style.zIndex='0';
 surface.style.pointerEvents='none';surface.style.background='transparent';
 surface.style.minHeight='0';surface.style.maxHeight='none';
 function emit(name){var e=document.createEvent('Event');e.initEvent(name,false,false);video.dispatchEvent(e);}
 var lastError=null,presentation='fullscreen',previewMount=null,displayRect=[0,0,1920,1080],directSession=null,directOptions=null,nativeOpened=false,hlsSession=null;
 /* El ajuste antiguo se conserva EXCLUSIVAMENTE para señales WEPA
    (Cactus Deportes/Noticias/etc.). Nunca aplicarlo a Latina, Peru,
    Bolivia, Uruguay, Deportes adicionales no-WEPA ni al motor HTML5. */
 var fixKey='cactus_preview_native_rect_v1',previewProvider='';
 function mayAdjust(){return native&&previewProvider==='CACTUS_WEPA';}
 function announcePreviewProvider(){
  var e=document.createEvent('Event');e.initEvent('cactuspreviewproviderchange',false,false);document.dispatchEvent(e);
 }
 /* Posicion de referencia validada en Samsung del tester: -192/-108 en 1920x1080.
    Para una primera instalacion, escalar proporcionalmente al viewport CSS.
    Los ajustes existentes permanecen intactos y tienen prioridad; solo WEPA. */
 function previewDefault(){
  var vw=Math.max(1,document.documentElement.clientWidth||window.innerWidth||1920);
  var vh=Math.max(1,document.documentElement.clientHeight||window.innerHeight||1080);
  return {dx:-Math.round(vw*0.10),dy:-Math.round(vh*0.10),dw:0,dh:0};
 }
 function previewFix(){
  var c=previewDefault();
  try{
   var raw=localStorage.getItem(fixKey);
   if(!raw)return c;
   var r=JSON.parse(raw);
   if(!r||typeof r!=='object'||Array.isArray(r))return c;
   ['dx','dy','dw','dh'].forEach(function(k){
    if(r[k]===undefined||r[k]===null)return;
    var n=Number(r[k]);
    if(isFinite(n))c[k]=Math.max(-600,Math.min(600,Math.round(n)));
   });
  }catch(e){}
  return c;
 }
 function updatePreviewFix(p,reset){if(!mayAdjust())return {dx:0,dy:0,dw:0,dh:0};var c=reset?previewDefault():previewFix();Object.keys(c).forEach(function(k){if(p&&typeof p[k]==='number'&&isFinite(p[k]))c[k]=Math.max(-600,Math.min(600,c[k]+Math.round(p[k])));});try{localStorage.setItem(fixKey,JSON.stringify(c));}catch(e){}size();return c;}

 function call(name,args){try{return av[name].apply(av,args||[]);}catch(e){lastError={method:name,error:e.name};return null;}}
/* Ajustar una sola superficie al rectángulo visible del panel central.
  AVPlay usa coordenadas 1920x1080 aunque el navegador use otra resolución. */
 function size(){
  var vw=Math.max(1,document.documentElement.clientWidth||window.innerWidth||1920);
  var vh=Math.max(1,document.documentElement.clientHeight||window.innerHeight||1080);
  var r=presentation==='preview'&&previewMount?previewMount.getBoundingClientRect():{left:0,top:0,right:vw,bottom:vh,width:vw,height:vh};
  /* En vista previa, limitar el vídeo al hueco central entre Categorías y Canales.
     Algunos streams nativos estaban ocupando también la columna derecha. */
  if(presentation==='preview'){
   try{
    var leftPanel=document.querySelector('.live-category-panel');
    var rightPanel=document.querySelector('.live-channel-panel');
    var center=document.querySelector('.live-center');
    var lr=leftPanel&&leftPanel.getBoundingClientRect?leftPanel.getBoundingClientRect():null;
    var rr=rightPanel&&rightPanel.getBoundingClientRect?rightPanel.getBoundingClientRect():null;
    var cr=center&&center.getBoundingClientRect?center.getBoundingClientRect():null;
    var pad=12;
    if(cr){
      var cLeft=Number(cr.left)||0, cTop=Number(cr.top)||0, cRight=Number(cr.right)||((Number(cr.left)||0)+(Number(cr.width)||vw));
      var cBottom=Number(cr.bottom)||((Number(cr.top)||0)+(Number(cr.height)||vh));
      var safeLeft=lr?Math.max(cLeft,(Number(lr.right)||cLeft)+pad):cLeft;
      var safeRight=rr?Math.min(cRight,(Number(rr.left)||cRight)-pad):cRight;
      if(safeRight-safeLeft>80){
        var baseTop=Number(r.top)||cTop, baseBottom=Number(r.bottom)||cBottom;
        r={left:safeLeft, top:baseTop, right:safeRight, bottom:baseBottom, width:safeRight-safeLeft, height:Math.max(1,baseBottom-baseTop)};
      }
    }
   }catch(_e){}
  }
  /* Evitar el desplazamiento y el recorte detrás de las columnas laterales. */
  var left=Math.max(0,Math.min(vw-1,Number(r.left)||0));
  var top=Math.max(0,Math.min(vh-1,Number(r.top)||0));
  var right=Math.max(left+1,Math.min(vw,Number(r.right)||((Number(r.left)||0)+(Number(r.width)||vw))));
  var bottom=Math.max(top+1,Math.min(vh,Number(r.bottom)||((Number(r.top)||0)+(Number(r.height)||vh))));

  if(presentation==='preview'&&mayAdjust()){
   var change=previewFix();
   var baseWidth=right-left,baseHeight=bottom-top;
   left=Math.max(0,Math.min(vw-1,left+change.dx));
   top=Math.max(0,Math.min(vh-1,top+change.dy));
   right=Math.min(vw,left+Math.max(80,baseWidth+change.dw));
   bottom=Math.min(vh,top+Math.max(80,baseHeight+change.dh));
  }
  var w=Math.max(1,right-left),h=Math.max(1,bottom-top);
  var px=Math.round(left),py=Math.round(top),pw=Math.round(w),ph=Math.round(h);
  stage.style.left=px+'px';stage.style.top=py+'px';
  stage.style.right='auto';stage.style.bottom='auto';
  stage.style.width=pw+'px';stage.style.height=ph+'px';
  /* Samsung exige que el objeto AVPlay y setDisplayRect coincidan.
     No usar un objeto fullscreen con un rectángulo de preview parcial. */
  surface.style.setProperty('left',px+'px','important');
  surface.style.setProperty('top',py+'px','important');
  surface.style.setProperty('width',pw+'px','important');
  surface.style.setProperty('height',ph+'px','important');
  surface.style.setProperty('right','auto','important');
  surface.style.setProperty('bottom','auto','important');
  surface.style.setProperty('transform','none','important');
  if(!native||!av||!nativeOpened)return;
  var sx=1920/vw,sy=1080/vh;
  displayRect=[Math.max(0,Math.round(left*sx)),Math.max(0,Math.round(top*sy)),Math.max(1,Math.round(w*sx)),Math.max(1,Math.round(h*sy))];
  displayRect[2]=Math.min(displayRect[2],1920-displayRect[0]);
  displayRect[3]=Math.min(displayRect[3],1080-displayRect[1]);
  call('setDisplayRect',displayRect);
  call('setDisplayMethod',['PLAYER_DISPLAY_MODE_LETTER_BOX']);
 }
 function stop(){sequence++;clearTimeout(seekTimer);clearTimeout(seekDelay);seeking=false;seekTarget=null;ready=false;preparing=false;pendingPlay=false;if(directSession&&window.CACTUS_DIRECT_MEDIA)window.CACTUS_DIRECT_MEDIA.close();directSession=null;directOptions=null;if(hlsSession){try{hlsSession.destroy();}catch(e){}hlsSession=null;}if(native&&av&&nativeOpened){call('stop');call('close');}nativeOpened=false;video.pause();video.removeAttribute('src');video.load();audios=[];subtitles=[];duration=0;time=0;paused=true;}
 function trackList(){if(!native||!ready||seeking)return;var list=call('getTotalTrackInfo')||[],active=call('getCurrentStreamInfo')||[];audios=[];subtitles=[];list.forEach(function(t){var extra={};try{extra=JSON.parse(t.extra_info||'{}');}catch(e){}var language=extra.language||extra.lang||'',selected=active.some(function(a){return a.type===t.type&&a.index===t.index;}),value={language:language,label:language||((t.type==='AUDIO'?'Audio ':'Subtítulos ')+(t.index+1))};if(t.type==='AUDIO'){Object.defineProperty(value,'enabled',{get:function(){return selected;},set:function(on){selected=Boolean(on);if(on&&!seeking)call('setSelectTrack',['AUDIO',t.index]);}});audios.push(value);}if(t.type==='TEXT'){value.kind='subtitles';var mode=selected?'showing':'disabled';Object.defineProperty(value,'mode',{get:function(){return mode;},set:function(v){mode=v;if(!seeking){call('setSilentSubtitle',[v!=='showing']);if(v==='showing')call('setSelectTrack',['TEXT',t.index]);}}});subtitles.push(value);}});emit('cactustracks');}
 function seek(){if(!native||!ready||seeking||seekTarget===null)return;var target=seekTarget;seekTarget=null;seeking=true;emit('seeking');var token=sequence,completed=false;function finish(failed){if(completed||token!==sequence)return;completed=true;clearTimeout(seekTimer);seeking=false;if(!failed)time=target;emit(failed?'cactusseekerror':'seeked');if(seekTarget!==null)seek();else{if(!pendingPlay){call('pause');paused=true;emit('pause');}else if(paused)engine.play();trackList();}}
  seekTimer=setTimeout(function(){finish(true);},18000);try{av.seekTo(Math.round(Math.min(Math.max(0.001,target),Math.max(0.001,duration-0.25))*1000),function(){finish(false);},function(){finish(true);});}catch(e){finish(true);}}
 /* Chromium/Electron no reproduce HLS de forma nativa: el <video> termina en
  * MEDIA_ERR_SRC_NOT_SUPPORTED (V04) aunque la URL llegue por el relay local.
  * En Linux (sin AVPlay) esos directos se entregan a hls.js, que ya esta en
  * la app y cuyas peticiones XHR pasan por el adaptador de transporte. */
 function externalOf(value){
  var raw=String(value||'');
  try{if(/\/r\?u=/.test(raw))raw=decodeURIComponent(new URL(raw,location.href).searchParams.get('u')||raw);}catch(e){}
  return raw;
 }
 function hlsUrl(value){
  var raw=externalOf(value);
  try{var path=new URL(raw,location.href).pathname.toLowerCase();return /\.m3u8$/.test(path)||/\/play\/[a-z0-9_-]+$/.test(path)||/\.ism\/manifest$/.test(path);}catch(e){return /\.m3u8/i.test(raw);}
 }
 /* El relay local cambia la base del manifest: un segmento relativo
  * `lumpen-123.ts` se resolveria contra /r?u=... y daria 404. Reescribimos
  * las URL del manifest a absolutas usando la URL externa original antes de
  * que hls.js parsee el playlist; despues el adaptador de transporte las
  * vuelve a pasar por /r. */
 function absolutizeManifest(text,base){
  function abs(value){try{return new URL(value,base).href;}catch(e){return value;}}
  return String(text).split(/\r?\n/).map(function(line){
   if(/^\s*#/.test(line))return line.replace(/(URI\s*=\s*")([^"]+)(")/g,function(_m,a,u,b){return a+abs(u)+b;});
   var trimmed=line.trim();if(!trimmed||/^[a-z][a-z0-9+.-]*:/i.test(trimmed))return line;
   return line.slice(0,line.indexOf(trimmed))+abs(trimmed);
  }).join('\n');
 }
 function rewritePlaylistData(data,base){
  /* hls.js 1.5 entrega {url,data,code} en onSuccess. */
  if(data&&typeof data==='object'&&typeof data.data==='string'&&/#EXTM3U/.test(data.data)){
   var copy={};Object.keys(data).forEach(function(k){copy[k]=data[k];});copy.data=absolutizeManifest(data.data,base);return copy;
  }
  if(typeof data==='string')return /#EXTM3U/.test(data)?absolutizeManifest(data,base):data;
  if(data&&typeof data.byteLength==='number'&&data.byteLength<1048576){
   try{
    var text=new TextDecoder().decode(data);
    if(/#EXTM3U/.test(text))return new TextEncoder().encode(absolutizeManifest(text,base)).buffer;
   }catch(e){}
  }
  return data;
 }
 function makeHlsLoader(baseUrl){
  var Base=window.Hls.DefaultConfig.loader;
  function RelayLoader(config){Base.call(this,config);}
  RelayLoader.prototype=Object.create(Base.prototype);
  RelayLoader.prototype.constructor=RelayLoader;
  RelayLoader.prototype.load=function(context,config,callbacks){
   var wrapped=callbacks;
   if(callbacks&&callbacks.onSuccess){
    wrapped=Object.create(callbacks);
    wrapped.onSuccess=function(data,stats,ctx,details){
     var base=externalOf(ctx&&ctx.url||context&&context.url||baseUrl);
     return callbacks.onSuccess.call(callbacks,rewritePlaylistData(data,base),stats,ctx,details);
    };
   }
   return Base.prototype.load.call(this,context,config,wrapped);
  };
  return RelayLoader;
 }
 function hlsFail(error){
  if(hlsSession){try{hlsSession.destroy();}catch(e){}hlsSession=null;}
  if(!lastError)lastError={method:'hls',error:String(error&&error.message||error||'hls_error')};
  ready=false;preparing=false;emit('error');
 }
 function startHls(){
  var Hls=window.Hls;
  if(!Hls||!Hls.isSupported()){hlsFail(Error('hls_mse_unavailable'));return;}
  var token=++sequence,player;
  lastError=null;ready=false;preparing=true;paused=true;duration=0;time=0;
  try{player=new Hls({loader:makeHlsLoader(url),enableWorker:false,autoStartLoad:true,startPosition:0,maxBufferLength:24,maxMaxBufferLength:60,backBufferLength:30,liveSyncDurationCount:2,manifestLoadingTimeOut:15000,fragLoadingTimeOut:15000});}catch(e){hlsFail(e);return;}
  hlsSession=player;
  player.on(Hls.Events.MEDIA_ATTACHED,function(){if(token===sequence)player.loadSource(url);});
  player.on(Hls.Events.MANIFEST_PARSED,function(){if(token!==sequence)return;preparing=false;ready=true;emit('canplay');if(pendingPlay){pendingPlay=false;var p=video.play();if(p&&p.catch)p.catch(function(){});}});
  player.on(Hls.Events.LEVEL_LOADED,function(_e,data){if(token===sequence&&data&&data.details)duration=data.details.live?Infinity:(data.details.totalduration||0);});
  player.on(Hls.Events.ERROR,function(_e,data){if(token!==sequence||!data||!data.fatal)return;hlsFail(Error(data.details||data.type||'hls_error'));});
  player.attachMedia(video);
 }
 var engine={
  setSource:function(value,useNative,provider){stop();lastError=null;native=Boolean(useNative&&av);previewProvider=String(provider||'');url=value;video.hidden=native;surface.hidden=!native;stage.hidden=false;document.documentElement.classList.add('video-surface-active');document.documentElement.classList.toggle('tv-video-plane',Boolean(window.tizen||native));document.documentElement.classList.toggle('native-playing',native);size();announcePreviewProvider();return native;},
  setDirect:function(session,options){engine.setSource('',false);directSession=session;directOptions=options||{};},
  load:function(){
   if(directSession){window.CACTUS_DIRECT_MEDIA.open(directSession,directOptions);return;}
   if(!native&&hlsUrl(url)){startHls();return;}
   if(!native){video.src=url;video.load();return;}
   var token=++sequence;preparing=true;paused=true;
   try{
    av.open(url);nativeOpened=true;
    av.setListener({onbufferingstart:function(){if(token===sequence)emit('waiting');},onbufferingcomplete:function(){if(token===sequence){size();emit('canplay');if(!paused)emit('playing');}},oncurrentplaytime:function(ms){if(token!==sequence)return;time=ms/1000;emit('timeupdate');},onstreamcompleted:function(){if(token===sequence){paused=true;emit('ended');}},onerror:function(code){if(token===sequence){lastError={method:'playback',error:String(code).slice(0,80)};emit('error');}}});
    size();call('setTimeoutForBuffering',[20]);call('setBufferingParam',['PLAYER_BUFFER_FOR_PLAY','PLAYER_BUFFER_SIZE_IN_SECOND',3]);call('setBufferingParam',['PLAYER_BUFFER_FOR_RESUME','PLAYER_BUFFER_SIZE_IN_SECOND',2]);
    av.prepareAsync(function(){if(token!==sequence)return;preparing=false;ready=true;size();duration=Number(call('getDuration'))/1000;emit('loadedmetadata');if(pendingPlay)engine.play();},function(error){if(token===sequence){lastError={method:'prepare',error:error&&error.name||'prepare_failed'};preparing=false;emit('error');}});
   }catch(e){lastError={method:'open',error:e.name};preparing=false;emit('error');}
  },
  play:function(){if(directSession)return window.CACTUS_DIRECT_MEDIA.play();if(!native){if(hlsSession){pendingPlay=true;if(!ready)return Promise.resolve();}return video.play();}pendingPlay=true;if(!ready||seeking)return;if(call('play')!==null){paused=false;size();emit('playing');setTimeout(trackList,700);}},
  pause:function(){if(directSession){window.CACTUS_DIRECT_MEDIA.pause();return;}if(!native){pendingPlay=false;video.pause();return;}pendingPlay=false;paused=true;if(ready&&!seeking)call('pause');emit('pause');},
  close:function(){stop();native=false;previewProvider='';surface.hidden=true;video.hidden=false;stage.hidden=true;document.documentElement.classList.remove('native-playing');document.documentElement.classList.remove('video-surface-active');document.documentElement.classList.remove('tv-video-plane');announcePreviewProvider();},
  presentation:function(mode,mount){presentation=mode==='preview'?'preview':'fullscreen';previewMount=mount||null;size();window.requestAnimationFrame(size);},
  isNative:function(){return native;},canAdjustPreview:mayAdjust,previewAdjustment:function(){return mayAdjust()?previewFix():{dx:0,dy:0,dw:0,dh:0};},setPreviewAdjustment:function(delta){return updatePreviewFix(delta,false);},resetPreviewAdjustment:function(){return updatePreviewFix(null,true);},diagnostics:function(){var a=stage.getBoundingClientRect(),b=surface.getBoundingClientRect();return {lastError:lastError,direct:!!directSession,displayRect:displayRect,presentation:presentation,visible:document.visibilityState,ready:ready,preparing:preparing,native:native,stageRect:[Math.round(a.left),Math.round(a.top),Math.round(a.width),Math.round(a.height)],surfaceRect:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]};},addEventListener:function(name,fn){video.addEventListener(name,fn);},removeEventListener:function(name,fn){video.removeEventListener(name,fn);},element:video
 };
 Object.defineProperties(engine,{seeking:{get:function(){return native?seeking||seekTarget!==null:video.seeking;}},currentTime:{get:function(){return native?(seekTarget!==null?seekTarget:time):video.currentTime;},set:function(value){if(directSession){window.CACTUS_DIRECT_MEDIA.seek(Number(value)||0);return;}if(!native){video.currentTime=value;return;}seekTarget=Math.min(Math.max(0,Number(value)||0),duration);clearTimeout(seekDelay);seekDelay=setTimeout(seek,180);}},duration:{get:function(){return native?duration:video.duration;}},paused:{get:function(){return native?paused:video.paused;}},textTracks:{get:function(){return native?subtitles:video.textTracks;}},audioTracks:{get:function(){return directSession?window.CACTUS_DIRECT_MEDIA.audioTracks():native?audios:video.audioTracks;}}});
 video.addEventListener('cactusdirecterror',function(){if(directSession){var info=window.CACTUS_DIRECT_MEDIA.info();lastError={method:'direct',error:info&&info.error||'direct_error',name:info&&info.errorName,phase:info&&info.phase};emit('error');}});
 window.addEventListener('resize',size);window.addEventListener('scroll',function(){if(!stage.hidden&&presentation==='preview')size();},true);window.CACTUS_ENGINE=engine;
})();
