/* Recomendaciones reproducibles del catálogo propio; puntuaciones de Xuper. */
(function(){'use strict';var api=window.CACTUS_API,hero=document.getElementById('home-reel'),items=[],index=0,section='all';
 function el(id){return document.getElementById(id);}
 function render(){hero.hidden=section!=='all'||!items.length;document.body.classList.toggle('has-home-reel',!hero.hidden);if(hero.hidden)return;var item=items[index];el('hero-title').textContent=item.title;el('reel-meta').textContent='★ '+item.rating.toFixed(1)+(item.year?' · '+item.year:'')+' · Película';el('reel-description').textContent=(item.description||'Descubre una de las películas mejor valoradas del catálogo.');var image=el('reel-image');image.decoding='async';var src=item.backdropUrl||item.posterUrl;if(api.safeImage(src)){image.src=src;image.hidden=false;}else{image.removeAttribute('src');image.hidden=true;}el('reel-page').textContent=(index+1)+' / '+items.length;}
 function move(step){if(!items.length)return;index=(index+step+items.length)%items.length;render();}
 function open(play){if(!items.length)return;var event=document.createEvent('CustomEvent');event.initCustomEvent('cactusopenitem',true,false,{item:items[index],play:play});document.dispatchEvent(event);}
 el('reel-next').addEventListener('click',function(){move(1);});el('reel-previous').addEventListener('click',function(){move(-1);});el('reel-play').addEventListener('click',function(){open(true);});el('reel-details').addEventListener('click',function(){open(false);});
 if(api.enabled&&api.source==='Xuper')api.recommendations(function(err,data){if(!err&&data&&Array.isArray(data.items)){items=data.items.filter(function(x){return x&&x.source==='XUPER'&&typeof x.rating==='number';});render();}});
 setInterval(function(){if((!window.CACTUS_ACTIVITY||window.CACTUS_ACTIVITY.idle(6000))&&section==='all'&&!document.hidden&&!hero.contains(document.activeElement)&&!window.CACTUS_SETTINGS.isOpen()&&!window.CACTUS_PROFILE_UI.isOpen()&&document.getElementById('player').hidden&&document.getElementById('modal').hidden)move(1);},8000);
 window.CACTUS_REEL={section:function(value){section=value;render();}};
})();
