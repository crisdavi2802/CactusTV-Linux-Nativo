/* Descarga solo imágenes cercanas; una vista abandonada libera sus conexiones. */
(function(){'use strict';var queue=[],active=[],timer=null,started=0,cancelled=0,loaded=0,failed=0,observer=null;
 /* Chromium 56 tiene IntersectionObserver, pero no isIntersecting. El observador
  * despierta la cola; la geometría decide qué imágenes pueden descargarse. */
 if(window.IntersectionObserver)try{observer=new IntersectionObserver(function(entries){entries.forEach(function(e){var task=e.target._cactusImage;if(task){task.near=typeof e.isIntersecting==='boolean'?e.isIntersecting:e.intersectionRatio>0;if(task.near)enqueue(task);}});schedule();},{rootMargin:'200px 180px',threshold:0});}catch(e){}
 function connected(img){return document.documentElement.contains(img);}
 function distance(task){var box=task.img.parentNode||task.img;if(!connected(task.img)||!box.getClientRects().length)return -1;var r=box.getBoundingClientRect();if(r.width===0||r.height===0||r.bottom< -120||r.top>innerHeight+200||r.right< -100||r.left>innerWidth+180)return -1;return Math.max(0,r.top)+Math.max(0,r.left)/10;}
 function enqueue(task){if(task.state==='queued'||task.state==='active'||task.state==='done'||task.state==='failed')return;task.state='queued';queue.push(task);}
 function observe(task){if(task.disposed)return;var box=task.img.parentNode;if(observer&&box){box._cactusImage=task;try{observer.observe(box);}catch(e){}}enqueue(task);}
 function schedule(){if(timer)return;timer=setTimeout(function(){timer=null;pump();},35);}
 function load(task){task.state='active';active.push(task);started++;var img=task.img,finished=false,timeout;
  function finish(ok,aborted){if(finished)return;finished=true;clearTimeout(timeout);img.onload=null;img.onerror=null;active=active.filter(function(t){return t!==task;});task.stop=null;
   if(aborted){cancelled++;task.state='idle';img.removeAttribute('src');img.hidden=false;}else{
    if(ok){loaded++;task.state='done';img.hidden=false;if(observer&&img.parentNode)observer.unobserve(img.parentNode);}
    else if(task.alternates.length){task.state='idle';img.hidden=true;task.src=task.alternates.shift();setTimeout(function(){if(connected(img)){enqueue(task);schedule();}},120);}
    else{failed++;task.state='failed';img.hidden=true;}
    if(img.parentNode)img.parentNode.classList.toggle('poster-unavailable',task.state==='failed');
   }schedule();}
  task.stop=function(){finish(false,true);};img.onload=function(){finish(img.naturalWidth>0,false);};img.onerror=function(){finish(false,false);};img.hidden=false;img.loading='eager';timeout=setTimeout(function(){finish(false,false);if(task.state!=='done')img.removeAttribute('src');},8000);img.src=task.src;
 }
 function pump(){var paused=document.hidden||document.body.classList.contains('is-playing')||window.CACTUS_DIRECT&&window.CACTUS_DIRECT.isBusy&&window.CACTUS_DIRECT.isBusy();active.slice().forEach(function(task){if(paused||distance(task)<0){task.stop();if(connected(task.img)){enqueue(task);}}});if(paused)return;queue=queue.filter(function(t){if(t.disposed||!connected(t.img)){t.state='idle';return false;}return t.state==='queued';});
  var visible=[];for(var i=0;i<queue.length;i++){var task=queue[i];var d=distance(task);if(d>=0)visible.push({task:task,distance:d});}visible.sort(function(a,b){return a.distance-b.distance;});while(active.length<((window.CACTUS_RUNTIME&&window.CACTUS_RUNTIME.tizen3)?3:5)&&visible.length){var next=visible.shift().task;queue.splice(queue.indexOf(next),1);load(next);}}
 function scan(root){var images=(root||document).querySelectorAll('img');for(var i=0;i<images.length;i++){var task=images[i]._cactusTask;if(task&&task.state!=='done'){observe(task);if(!observer)enqueue(task);}}schedule();}
 function release(root){var images=root.querySelectorAll('img');for(var i=0;i<images.length;i++){var task=images[i]._cactusTask;if(!task)continue;task.disposed=true;if(task.stop)task.stop();task.state='disposed';var box=task.img.parentNode;if(observer&&box){observer.unobserve(box);delete box._cactusImage;}delete images[i]._cactusTask;}queue=queue.filter(function(t){return !t.disposed;});}
 function attachImmediate(img,src,backup){
  var alternatives=Array.isArray(backup)?backup.slice():backup?[backup]:[],urls=[src],index=0,waiting=null;
  alternatives.forEach(function(x){if(typeof x==='string'&&/^https?:\/\//i.test(x)&&urls.indexOf(x)<0)urls.push(x);});
  img._cactusTask={img:img,src:src,state:'queued',alternates:[],disposed:false,stop:function(){if(waiting)clearTimeout(waiting);img.onload=null;img.onerror=null;}};
  function next(){
   if(!connected(img)||img._cactusTask.disposed)return;
   if(index>=urls.length){img._cactusTask.state='failed';img.hidden=true;if(img.parentNode)img.parentNode.classList.add('poster-unavailable');return;}
   var u=urls[index++];img._cactusTask.state='active';img.hidden=false;
   if(waiting)clearTimeout(waiting);
   waiting=setTimeout(function(){if(img._cactusTask&&img._cactusTask.state==='active'){img.onload=null;img.onerror=null;next();}},5500);
   img.onload=function(){if(waiting)clearTimeout(waiting);if(img.naturalWidth>0){img._cactusTask.state='done';img.hidden=false;if(img.parentNode)img.parentNode.classList.remove('poster-unavailable');}else next();};
   img.onerror=function(){if(waiting)clearTimeout(waiting);next();};
   img.src=u;
  }
  setTimeout(next,0);
 }
 window.CACTUS_IMAGES={attachImmediate:attachImmediate,attach:function(img,src,backup){
   var old=img._cactusTask,alternates=Array.isArray(backup)?backup.slice():backup?[backup]:[];
   alternates=alternates.filter(function(u,i){return typeof u==='string'&&u!==src&&/^https?:\/\//i.test(u)&&alternates.indexOf(u)===i;}).slice(0,5);
   if(old&&old.src===src&&old.state==='done'){return;}
   if(old){old.disposed=true;if(old.stop)old.stop();if(observer&&img.parentNode)try{observer.unobserve(img.parentNode);}catch(e){}}
   var task={img:img,src:src,alternates:alternates,state:'idle',near:!observer,disposed:false};
   img._cactusTask=task;img.alt='';img.decoding='async';setTimeout(function(){if(!task.disposed){observe(task);schedule();}},0);
  },scan:scan,release:release,status:function(){return {active:active.length,queued:queue.length,started:started,cancelled:cancelled,loaded:loaded,failed:failed};},
  report:function(root){var all=(root||document).querySelectorAll('img'),r={total:0,loaded:0,failed:0,pending:0};for(var i=0;i<all.length;i++){var t=all[i]._cactusTask;if(!t)continue;r.total++;if(t.state==='done')r.loaded++;else if(t.state==='failed')r.failed++;else r.pending++;}return r;}};
 setInterval(schedule,750);window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);document.addEventListener('click',schedule);document.addEventListener('keydown',schedule);document.addEventListener('visibilitychange',schedule);
})();
