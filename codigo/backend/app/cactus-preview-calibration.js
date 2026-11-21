/* Cactus TV · Ajuste de AVPlay por mando. ES5 compatible con Samsung Legacy. */
(function(w){'use strict';
 var engine=w.CACTUS_ENGINE,trigger=document.getElementById('live-adjust'),panel=document.getElementById('cactus-align-panel'),target=document.getElementById('cactus-align-target'),readout=document.getElementById('cactus-align-value'),modeText=document.getElementById('cactus-align-mode'),showing=false,mode='move';
 if(!engine||!trigger||!panel||!target)return;
 function text(){var c=engine.previewAdjustment();readout.textContent='Horizontal '+c.dx+' · Vertical '+c.dy+' · Ancho '+c.dw+' · Alto '+c.dh;modeText.textContent=mode==='move'?'Mover imagen':'Cambiar tamaño';}
 function rect(){var mount=document.getElementById('live-preview-viewport')||document.getElementById('live-preview-mount');if(!mount)return;var r=mount.getBoundingClientRect();target.style.left=Math.round(r.left)+'px';target.style.top=Math.round(r.top)+'px';target.style.width=Math.round(r.width)+'px';target.style.height=Math.round(r.height)+'px';}
 function open(){if(showing)return;if(!engine.canAdjustPreview()){trigger.hidden=true;return;}showing=true;mode='move';text();rect();target.hidden=false;panel.hidden=false;trigger.setAttribute('aria-expanded','true');}
 function close(){if(!showing)return;showing=false;panel.hidden=true;target.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();}
 function refresh(){var enabled=engine.canAdjustPreview();if(!enabled&&showing)close();trigger.hidden=!enabled;}
 document.addEventListener('cactuspreviewproviderchange',refresh);
 trigger.addEventListener('click',open);refresh();
 document.addEventListener('keydown',function(e){if(!showing)return;var k=e.keyCode||e.which,delta={};if([37,38,39,40].indexOf(k)>=0){
  if(mode==='move'){delta.dx=k===37?-12:k===39?12:0;delta.dy=k===38?-12:k===40?12:0;}
  else {delta.dw=k===37?-12:k===39?12:0;delta.dh=k===38?-12:k===40?12:0;}
  engine.setPreviewAdjustment(delta);text();
 }else if(k===13){mode=mode==='move'?'size':'move';text();}
 else if(k===48||k===96){engine.resetPreviewAdjustment();text();}
 else if(k===8||k===27||k===10009||k===65385){close();}
 else return;
 e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 },true);
 w.CACTUS_ALIGN={isOpen:function(){return showing;},close:close};
})(window);
