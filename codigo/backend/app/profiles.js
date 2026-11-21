/* Perfiles locales, sin cuentas, email, contraseñas ni autenticación Xuper.
 * Solo preferencias de este dispositivo; no son una frontera de seguridad. */
(function(){'use strict';
 var key='cactus_profiles_v1',colors=['#bc754c','#397d80','#8264a7','#9c6b31','#607c45','#9b5767'];
 function cleanName(value){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24):'';}
 function normalize(raw){var out={profiles:[],active:'principal'};
  if(raw&&Array.isArray(raw.profiles))raw.profiles.slice(0,6).forEach(function(p){if(!p||typeof p.id!=='string'||!/^(principal|p_[a-z0-9_]{1,50})$/.test(p.id)||!cleanName(p.name)||out.profiles.some(function(x){return x.id===p.id;}))return;out.profiles.push({id:p.id,name:cleanName(p.name),color:colors.indexOf(p.color)>=0?p.color:colors[out.profiles.length%colors.length]});});
  if(!out.profiles.length)out.profiles.push({id:'principal',name:'Principal',color:colors[0]});
  out.active=out.profiles.some(function(p){return raw&&p.id===raw.active;})?raw.active:out.profiles[0].id;return out;
 }
 var raw;try{raw=JSON.parse(localStorage.getItem(key));}catch(e){}var state=normalize(raw);
 function beforeChange(){if(typeof document!=='undefined'&&typeof Event==='function')document.dispatchEvent(new Event('cactusprofilewillchange'));}
 function save(){try{localStorage.setItem(key,JSON.stringify(state));return true;}catch(e){return false;}}
 function active(){for(var i=0;i<state.profiles.length;i++)if(state.profiles[i].id===state.active)return state.profiles[i];return state.profiles[0];}
 function list(){return state.profiles.map(function(p){return {id:p.id,name:p.name,color:p.color};});}
 function find(id){for(var i=0;i<state.profiles.length;i++)if(state.profiles[i].id===id)return state.profiles[i];return null;}
 window.CACTUS_PROFILES={list:list,active:function(){var p=active();return {id:p.id,name:p.name,color:p.color};},select:function(id){if(!find(id))return false;if(state.active!==id)beforeChange();state.active=id;save();return true;},create:function(name){name=cleanName(name);if(!name||state.profiles.length>=6)return null;var id='p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);var profile={id:id,name:name,color:colors[state.profiles.length%colors.length]};state.profiles.push(profile);save();return {id:id,name:name,color:profile.color};},rename:function(id,name){var p=find(id);name=cleanName(name);if(!p||!name)return false;p.name=name;save();return true;},remove:function(id){if(!find(id)||state.profiles.length<=1)return false;if(state.active===id)beforeChange();state.profiles=state.profiles.filter(function(p){return p.id!==id;});if(state.active===id)state.active=state.profiles[0].id;try{var prefix=id==='principal'?'cactus_v02_':'cactus_v02_profile_'+id+'_';localStorage.removeItem(prefix+'ids');localStorage.removeItem(prefix+'records');localStorage.removeItem('cactus_watch_v1_'+id);localStorage.removeItem('cactus_tracks_'+id);}catch(e){}save();return true;},normalize:normalize};
})();
