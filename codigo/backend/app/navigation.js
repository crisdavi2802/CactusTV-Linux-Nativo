/* El mapa de filas se conserva entre flechas y se invalida solo al cambiar la UI. */
(function(){'use strict';var revision=0,cachedRoot=null,cachedRevision=-1,cachedRows=null,builds=0,moves=0,observer=window.MutationObserver?new MutationObserver(function(){revision++;}):null;if(observer)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','open','style','class']});
 function ancestor(n,attribute){while(n&&n!==document){if(n.getAttribute&&n.hasAttribute(attribute))return n;n=n.parentNode;}return null;}
 function visible(n){if(n.disabled||n.hidden||!n.getClientRects().length)return false;var p=n.parentNode;while(p&&p!==document){if(p.hidden)return false;p=p.parentNode;}return getComputedStyle(n).visibility!=='hidden';}
 function reveal(n){var carousel=ancestor(n,'data-nav-carousel');if(carousel){var left=n.offsetLeft,right=left+n.offsetWidth;if(left<carousel.scrollLeft+8)carousel.scrollLeft=Math.max(0,left-8);else if(right>carousel.scrollLeft+carousel.clientWidth-8)carousel.scrollLeft=right-carousel.clientWidth+8;}
  var rect=n.getBoundingClientRect(),parent=n.parentNode,scroller=null;while(parent&&parent!==document.body){var style=getComputedStyle(parent);if(/auto|scroll/.test(style.overflowY)&&parent.scrollHeight>parent.clientHeight+4){scroller=parent;break;}parent=parent.parentNode;}
  if(scroller){var area=scroller.getBoundingClientRect();if(rect.top<area.top+8)scroller.scrollTop-=area.top+8-rect.top;else if(rect.bottom>area.bottom-8)scroller.scrollTop+=rect.bottom-area.bottom+8;}
  else{var header=document.querySelector('.topbar'),top=header&&visible(header)?header.getBoundingClientRect().height+12:12;if(rect.top<top)window.scrollBy(0,rect.top-top);else if(rect.bottom>innerHeight-20)window.scrollBy(0,rect.bottom-innerHeight+20);}
  try{n.focus({preventScroll:true});}catch(e){n.focus();}
 }
 function groups(root){if(observer&&observer.takeRecords().length)revision++;if(observer&&root===cachedRoot&&revision===cachedRevision)return cachedRows;builds++;var list=root.querySelectorAll('button,input,select,a[href],video[controls]'),rows=[];
  for(var i=0;i<list.length;i++){var n=list[i];if(!visible(n))continue;var owner=ancestor(n,'data-nav-row'),rect=owner?null:n.getBoundingClientRect(),group=null;
   for(var j=0;j<rows.length;j++)if(owner?rows[j].owner===owner:!rows[j].owner&&Math.abs(rows[j].top-rect.top)<18){group=rows[j];break;}
   if(!group){group={owner:owner,top:rect?rect.top:0,nodes:[]};rows.push(group);}group.nodes.push(n);
  }
  rows.forEach(function(row){row.nodes.sort(function(a,b){if(a.dataset.navCol!==undefined&&b.dataset.navCol!==undefined)return Number(a.dataset.navCol)-Number(b.dataset.navCol);return 0;});});cachedRoot=root;cachedRevision=revision;cachedRows=rows;return rows;
 }
 window.CACTUS_NAVIGATION={focus:reveal,move:function(root,code){moves++;if(root===document&&code===40&&document.activeElement&&document.activeElement.id==='search-open'){var s=document.getElementById('search-focus');if(s&&visible(s)){reveal(s);return true;}}var rows=groups(root);if(!rows.length)return false;var active=document.activeElement,rowIndex=-1,index=-1;for(var i=0;i<rows.length;i++){var at=rows[i].nodes.indexOf(active);if(at>=0){rowIndex=i;index=at;break;}}
  if(rowIndex<0){reveal(rows[0].nodes[0]);return true;}var row=rows[rowIndex],target=null;
  if(code===37||code===39){var next=index+(code===37?-1:1);if(next>=0&&next<row.nodes.length)target=row.nodes[next];}
  else{var nextRow=rows[rowIndex+(code===38?-1:1)];if(nextRow){if(root===document&&row.owner&&row.owner.dataset.navRow==='header'&&code===40){if(window.CACTUS_LIVE_UI&&window.CACTUS_LIVE_UI.isActive()){window.CACTUS_LIVE_UI.focusMenu();return true;}target=nextRow.nodes[0];}else if(nextRow.owner&&nextRow.owner.dataset.navRow==='header')target=document.querySelector('#tabs .active')||nextRow.nodes[0];else{var candidates=nextRow.nodes;if(!active.classList.contains('shelf-see-all')){var cards=candidates.filter(function(n){return !n.classList.contains('shelf-see-all');});if(cards.length)candidates=cards;}target=candidates[Math.min(index,candidates.length-1)];}}}
  if(target){reveal(target);return true;}return false;
 },stats:function(){return {moves:moves,builds:builds};}};
})();
