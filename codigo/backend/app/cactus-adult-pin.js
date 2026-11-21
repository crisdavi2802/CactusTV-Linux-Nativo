/* Cactus TV: control parental local por PIN. Sin marcas ni dependencias heredadas. */
(function(w,d){'use strict';
 var PREFIX='cactus_private_v1',LOCK='cactus_private_attempts_v1';
 var unlocked=false,dialog=null,card=null,entry=null,dots=null,hint=null,title=null,buttons=[],mode='',stage='',buffer='',first='',done=null,returnFocus=null;
 function safeParse(value){try{return JSON.parse(value)||{};}catch(e){return {};}}
 function read(){var c=safeParse(load(PREFIX));return {enabled:c.enabled===true&&!!c.salt&&!!c.hash,salt:c.salt||'',hash:c.hash||''};}
 function save(c){try{localStorage.setItem(PREFIX,JSON.stringify(c));return true;}catch(e){return false;}}
 function load(k){try{return localStorage.getItem(k);}catch(e){return null;}}
 function lockState(){return safeParse(load(LOCK));}
 function setLock(s){try{localStorage.setItem(LOCK,JSON.stringify(s));}catch(e){}}
 function salt(){return w.CryptoJS&&w.CryptoJS.lib&&w.CryptoJS.lib.WordArray?w.CryptoJS.lib.WordArray.random(16).toString():String(Date.now())+String(Math.random());}
 function hash(pin,s){return w.CryptoJS.SHA256(String(s)+':cactus:'+String(pin)).toString();}
 function dispatch(){var e=d.createEvent('Event');e.initEvent('cactusadultstatuschange',false,false);d.dispatchEvent(e);}
 function isEnabled(){return read().enabled;}
 function hasPin(){return !!read().hash;}
 function isUnlocked(){return isEnabled()&&unlocked;}
 function lock(){if(unlocked){unlocked=false;dispatch();}}
 function make(tag,cls,txt){var n=d.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
 function build(){if(dialog)return;
  dialog=make('div','cactus-pin-overlay');dialog.id='cactus-pin-overlay';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','cactus-pin-title');
  card=make('section','cactus-pin-card');title=make('h2','', 'Acceso privado');title.id='cactus-pin-title';hint=make('p','cactus-pin-hint','');hint.id='cactus-pin-hint';
  entry=make('input','cactus-pin-entry');entry.type='password';entry.inputMode='numeric';entry.maxLength=6;entry.autocomplete='off';entry.setAttribute('aria-label','PIN numérico');
  dots=make('div','cactus-pin-dots','○ ○ ○ ○');dots.setAttribute('aria-live','polite');
  var keys=make('div','cactus-pin-pad');[1,2,3,4,5,6,7,8,9,'Cancelar',0,'Borrar'].forEach(function(v){var b=make('button','cactus-pin-key',String(v));b.type='button';b.dataset.pinKey=String(v);keys.appendChild(b);buttons.push(b);});
  var actions=make('div','cactus-pin-actions');var confirm=make('button','cactus-pin-confirm','Confirmar PIN');confirm.type='button';confirm.dataset.pinKey='Confirmar';actions.appendChild(confirm);buttons.push(confirm);
  card.appendChild(title);card.appendChild(hint);card.appendChild(entry);card.appendChild(dots);card.appendChild(keys);card.appendChild(actions);dialog.appendChild(card);d.body.appendChild(dialog);
  keys.addEventListener('click',onKeyClick);actions.addEventListener('click',onKeyClick);
  entry.addEventListener('input',function(){buffer=String(entry.value||'').replace(/\D/g,'').slice(0,6);renderDots();});
 }
 function renderDots(){if(entry&&entry.value!==buffer)entry.value=buffer;if(dots)dots.textContent=buffer?Array(buffer.length+1).join('● '):'○ ○ ○ ○';}
 function info(message){hint.textContent=message;}
 function showStep(){buffer='';renderDots();var names={verify:'Introduce tu PIN',new:'Crea un PIN de 4 a 6 dígitos',confirm:'Repite tu nuevo PIN'};title.textContent=names[stage]||'PIN de Cactus TV';info('Usa los números del control remoto o el teclado en pantalla.');try{buttons[0].focus();}catch(ex){}}
 function finish(ok){var cb=done;done=null;buffer='';first='';stage='';mode='';if(dialog){dialog.hidden=true;dialog.style.display='';}renderDots();if(returnFocus&&d.documentElement.contains(returnFocus))returnFocus.focus();returnFocus=null;if(cb)cb(Boolean(ok));}
 function validate(){var value=buffer;if(!/^\d{4,6}$/.test(value)){info('Ingresa entre 4 y 6 números.');return;}
  if(stage==='verify'){
    var state=lockState();if(Number(state.until)>Date.now()){info('Demasiados intentos. Intenta más tarde.');buffer='';renderDots();return;}
    var cfg=read();if(!cfg.hash||hash(value,cfg.salt)!==cfg.hash){state.tries=(Number(state.tries)||0)+1;if(state.tries>=5){state={tries:0,until:Date.now()+60000};info('PIN incorrecto. Bloqueado durante un minuto.');}else info('PIN incorrecto. Intento '+state.tries+' de 5.');setLock(state);buffer='';renderDots();return;}
    setLock({tries:0,until:0});unlocked=true;dispatch();if(mode==='change'){stage='new';showStep();return;}finish(true);return;
  }
  if(stage==='new'){first=value;stage='confirm';showStep();return;}
  if(stage==='confirm'){if(value!==first){first='';stage='new';showStep();info('Los PIN no coinciden. Vuelve a introducir uno nuevo.');return;}
   var s=salt();if(!w.CryptoJS||!w.CryptoJS.SHA256){info('No se pudo iniciar la protección de PIN.');return;}if(!save({enabled:true,salt:s,hash:hash(value,s)})){info('No se pudo guardar el PIN. Revisa almacenamiento del TV.');return;}setLock({tries:0,until:0});unlocked=true;dispatch();finish(true);return;}
 }
 function key(v){if(v==='Cancelar'){finish(false);return;}if(v==='Borrar'){buffer=buffer.slice(0,-1);renderDots();return;}if(v==='Confirmar'){validate();return;}if(/^\d$/.test(v)&&buffer.length<6){buffer+=v;renderDots();}}
 function onKeyClick(e){var n=e.target;while(n&&n!==dialog&&!n.dataset.pinKey)n=n.parentNode;if(n&&n.dataset.pinKey)key(n.dataset.pinKey);}
 function open(which,cb){try{build();}catch(ex){if(cb)cb(false);return;}
  if(!dialog||!buttons.length){if(cb)cb(false);return;}
if(done){if(cb)cb(false);return;}if(which==='verify'&&!hasPin()){if(cb)cb(false);return;}var s=lockState();if(which==='verify'&&Number(s.until)>Date.now()){dialog.hidden=false;returnFocus=d.activeElement;done=cb;mode=which;stage='verify';showStep();info('Bloqueado temporalmente por intentos fallidos.');return;}
  mode=which;stage=which==='setup'?'new':'verify';done=cb;returnFocus=d.activeElement;dialog.hidden=false;dialog.style.display='flex';dialog.style.zIndex='260';showStep();}

 function enable(cb){if(isEnabled()){if(cb)cb(true);return;}open(hasPin()?'verify':'setup',function(ok){if(ok){var cfg=read();cfg.enabled=true;save(cfg);dispatch();}if(cb)cb(ok);});}
 function disable(cb){if(!isEnabled()){if(cb)cb(true);return;}open('verify',function(ok){if(ok){var cfg=read();cfg.enabled=false;save(cfg);lock();dispatch();}if(cb)cb(ok);});}
 function authorize(cb){if(!isEnabled()){if(cb)cb(false);return;}if(isUnlocked()){if(cb)cb(true);return;}open('verify',cb);}
 function change(cb){open(hasPin()?'change':'setup',cb);}
 d.addEventListener('keydown',function(e){if(!dialog||dialog.hidden)return;var code=e.keyCode||e.which;
  if(code===27||code===10009||code===65385||code===8&&d.activeElement!==entry){e.preventDefault();e.stopImmediatePropagation();if(code===8)key('Borrar');else finish(false);return;}
  if(code===13){e.preventDefault();e.stopImmediatePropagation();var b=d.activeElement;if(b&&b.dataset.pinKey)key(b.dataset.pinKey);else validate();return;}
  if(code>=48&&code<=57||code>=96&&code<=105){if(d.activeElement===entry)return;e.preventDefault();e.stopImmediatePropagation();key(String(code>=96?code-96:code-48));return;}
  if([37,38,39,40].indexOf(code)>=0){e.preventDefault();e.stopImmediatePropagation();var ix=buttons.indexOf(d.activeElement);if(ix<0){buttons[0].focus();return;}var next=ix;if(code===37)next=Math.max(0,ix-1);if(code===39)next=Math.min(buttons.length-1,ix+1);if(code===38)next=ix>=3?ix-3:ix;if(code===40)next=Math.min(buttons.length-1,ix+3);buttons[next].focus();return;}
  if(code===9){e.preventDefault();e.stopImmediatePropagation();var i=buttons.indexOf(d.activeElement),j=(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[j].focus();}
 },true);
 d.addEventListener('cactusprofilewillchange',lock);
 d.addEventListener('visibilitychange',function(){if(d.hidden){if(dialog&&!dialog.hidden)finish(false);lock();}});
 w.addEventListener('pagehide',lock);
 w.CACTUS_ADULTS={isEnabled:isEnabled,hasPin:hasPin,isUnlocked:isUnlocked,dialogOpen:function(){return !!(dialog&&!dialog.hidden);},lock:lock,enable:enable,disable:disable,authorize:authorize,change:change};
})(window,document);
