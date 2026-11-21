/* Cola única: prioridad visible y cancelación de vistas abandonadas. ES5. */
(function(w,d){'use strict';var queue=[],active=[],timer=null,started=0,cancelled=0,loaded=0,failed=0,bad={},badOrder=[];
 function connected(img){return d.documentElement.contains(img);}
 function distance(t){var box=t.img.parentNode||t.img;if(t.disposed||!connected(t.img)||!box.getClientRects().length)return -1;var r=box.getBoundingClientRect();if(!r.width||!r.height||r.bottom< -100||r.top>w.innerHeight+180||r.right< -100||r.left>w.innerWidth+140)return -1;return (Math.max(0,r.top)+Math.max(0,r.left)/8)/(t.priority?2:1);}
 function enqueue(t){if(t.disposed||t.state==='queued'||t.state==='active'||t.state==='done'||t.state==='failed')return;t.state='queued';queue.push(t);}
 function schedule(){if(timer!==null)return;timer=setTimeout(function(){timer=null;pump();},40);}
 function noteBad(url){bad[url]=Date.now()+60000;badOrder.push(url);while(badOrder.length>160)delete bad[badOrder.shift()];}
 function load(t){while(t.urls.length&&bad[t.urls[0]]>Date.now())t.urls.shift();if(!t.urls.length){t.state='failed';t.img.hidden=true;failed++;if(t.img.parentNode)t.img.parentNode.classList.add('poster-unavailable');return;}
  var img=t.img,url=t.urls.shift(),finished=false,timeout;t.current=url;t.state='active';active.push(t);started++;
  function finish(ok,aborted){if(finished)return;finished=true;clearTimeout(timeout);img.onload=img.onerror=null;t.stop=null;var i=active.indexOf(t);if(i>=0)active.splice(i,1);
   if(aborted){cancelled++;t.urls.unshift(url);t.state='idle';img.removeAttribute('src');img.hidden=false;}
   else if(ok){loaded++;t.state='done';img.hidden=false;delete bad[url];if(img.parentNode)img.parentNode.classList.remove('poster-unavailable');}
   else{noteBad(url);img.removeAttribute('src');img.hidden=true;t.state=t.urls.length?'idle':'failed';if(t.state==='failed'){failed++;if(img.parentNode)img.parentNode.classList.add('poster-unavailable');}}
   if(t.state==='idle'&&!t.disposed&&connected(img))enqueue(t);schedule();
  }
  t.stop=function(){finish(false,true);};img.onload=function(){finish(img.naturalWidth>0,false);};img.onerror=function(){finish(false,false);};img.hidden=false;img.loading='eager';img.decoding='async';timeout=setTimeout(function(){finish(false,false);},5500);img.src=url;
 }
 function pump(){var paused=d.hidden||d.body.classList.contains('is-playing')||w.CACTUS_DIRECT&&w.CACTUS_DIRECT.isBusy&&w.CACTUS_DIRECT.isBusy();active.slice().forEach(function(t){if(paused||distance(t)<0)t.stop();});queue=queue.filter(function(t){if(t.disposed||!connected(t.img)){if(!t.disposed)t.state='idle';return false;}return t.state==='queued';});if(paused)return;
  var visible=[];for(var i=0;i<queue.length;i++){var n=distance(queue[i]);if(n>=0)visible.push({task:queue[i],distance:n});}visible.sort(function(a,b){return a.distance-b.distance;});var limit=w.CACTUS_RUNTIME&&w.CACTUS_RUNTIME.tizen3?3:4;
  while(active.length<limit&&visible.length){var next=visible.shift().task;queue.splice(queue.indexOf(next),1);load(next);}
 }
 function attach(img,src,backup,priority){var old=img._cactusTask;if(old&&!old.disposed&&old.src===src){old.priority=old.priority||priority;if(old.state==='idle')enqueue(old);schedule();return;}if(old){old.disposed=true;if(old.stop)old.stop();}var urls=[src],alts=Array.isArray(backup)?backup:backup?[backup]:[];alts.forEach(function(u){if(typeof u==='string'&&/^https?:\/\//i.test(u)&&urls.indexOf(u)<0)urls.push(u);});var t={img:img,src:src,urls:urls.slice(0,6),state:'idle',priority:!!priority,disposed:false};img._cactusTask=t;img.alt='';setTimeout(function(){if(!t.disposed){enqueue(t);schedule();}},0);}
 function scan(root){var images=(root||d).querySelectorAll('img');for(var i=0;i<images.length;i++){var t=images[i]._cactusTask;if(t&&t.state==='idle')enqueue(t);}schedule();}
 function release(root){var images=root.querySelectorAll('img');for(var i=0;i<images.length;i++){var t=images[i]._cactusTask;if(t){t.disposed=true;if(t.stop)t.stop();t.state='disposed';delete images[i]._cactusTask;}}queue=queue.filter(function(t){return !t.disposed;});}
 w.CACTUS_IMAGES={attach:function(img,src,backup){attach(img,src,backup,false);},attachImmediate:function(img,src,backup){attach(img,src,backup,true);},scan:scan,release:release,status:function(){return {active:active.length,queued:queue.length,started:started,cancelled:cancelled,loaded:loaded,failed:failed};},report:function(root){var images=(root||d).querySelectorAll('img'),r={total:0,loaded:0,failed:0,pending:0};for(var i=0;i<images.length;i++){var t=images[i]._cactusTask;if(!t)continue;r.total++;if(t.state==='done')r.loaded++;else if(t.state==='failed')r.failed++;else r.pending++;}return r;}};
 setInterval(function(){if(queue.length||active.length)schedule();},750);w.addEventListener('scroll',schedule,true);w.addEventListener('resize',schedule);d.addEventListener('focusin',schedule);d.addEventListener('keydown',schedule);d.addEventListener('visibilitychange',schedule);
})(window,document);
