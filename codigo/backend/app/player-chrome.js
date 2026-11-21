/* Controles de pantalla completa: tres segundos, flechas/OK para mostrarlos. */
(function(){'use strict';var player=document.getElementById('player'),timer=null,visible=true,opened=false;
 function interactive(){return window.CACTUS_TRACKS&&window.CACTUS_TRACKS.isOpen();}
 function hide(){if(!opened)return;clearTimeout(timer);visible=false;document.body.classList.add('controls-hidden');if(player.contains(document.activeElement)){player.setAttribute('tabindex','-1');player.focus();}}
 function later(){clearTimeout(timer);if(opened&&!interactive())timer=setTimeout(hide,3000);}
 function show(focus){if(!opened)return;visible=true;document.body.classList.remove('controls-hidden');if(focus)document.getElementById('toggle-video').focus();later();}
 function loading(){if(!opened||!visible)return;clearTimeout(timer);}
 document.addEventListener('keydown',function(e){if(!opened||player.hidden||interactive()||window.CACTUS_SETTINGS&&window.CACTUS_SETTINGS.isOpen())return;var code=e.keyCode||e.which;if([13,37,38,39,40].indexOf(code)>=0&&!visible){e.preventDefault();e.stopImmediatePropagation();show(true);return;}if([8,27,10009,65385].indexOf(code)<0)show(false);},true);
 player.addEventListener('mousemove',function(){show(false);});player.addEventListener('touchstart',function(){show(false);});player.addEventListener('click',function(){if(opened)show(false);});player.addEventListener('change',later);player.addEventListener('focusout',later);
 var video=document.getElementById('video');video.addEventListener('waiting',loading);video.addEventListener('seeking',loading);video.addEventListener('playing',function(){if(visible)later();});video.addEventListener('seeked',function(){if(visible)later();});
 window.CACTUS_CHROME={open:function(){opened=true;visible=true;document.body.classList.remove('controls-hidden');clearTimeout(timer);},close:function(){opened=false;clearTimeout(timer);visible=true;document.body.classList.remove('controls-hidden');},show:show,hide:hide,isVisible:function(){return visible;},back:function(){if(opened&&visible){hide();return true;}return false;}};
})();
