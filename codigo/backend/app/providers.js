/* Código propio. No contiene rutas, certificados ni código extraído de APK.
 * Los transportes los proporciona una futura integración auditada, nunca la UI.
 * API callback exactamente una vez, timeout y cancelación de resultados obsoletos. */
(function(){'use strict';
 window.CACTUS_PLAYBACK={canPlay:function(x){if(window.CACTUS_API&&window.CACTUS_API.canPrepare&&window.CACTUS_API.canPrepare(x))return true;if(window.CACTUS_ORIGINAL_MEDIA&&window.CACTUS_ORIGINAL_MEDIA.canPlay(x))return true;if(window.CACTUS_LIVE&&window.CACTUS_LIVE.canPlay(x))return true;if(window.CACTUS_SPORT_SOURCES&&window.CACTUS_SPORT_SOURCES.canPlay(x))return true;if(window.CACTUS_WEPA&&window.CACTUS_WEPA.canPlay(x))return true;return Boolean(x&&x.source==='AUTHORIZED_TEST'&&x.rightsVerified===true&&typeof x.rightsEvidence==='string'&&x.rightsEvidence.trim()&&typeof x.streamUrl==='string'&&/^https:\/\/[a-z0-9.-]+\/[a-zA-Z0-9/_.-]+$/.test(x.streamUrl));}};
 function XuperProvider(transport){this.transport=transport||null;}
 XuperProvider.prototype.catalog=function(query,done){var finished=false,timer;function finish(err,data){if(finished)return;finished=true;clearTimeout(timer);done(err,data);}
  if(!this.transport){finish(new Error('xuper_not_configured'));return;}
  if(typeof query!=='string'||query.length>70){finish(new Error('invalid_query'));return;}
  timer=setTimeout(function(){finish(new Error('timeout'));},7000);
  try{this.transport(query,function(err,data){if(err){finish(new Error('xuper_unavailable'));return;}if(!data||!Array.isArray(data.items)){finish(new Error('invalid_response'));return;}
   var items=data.items.slice(0,40).filter(function(x){return x&&typeof x.id==='string'&&typeof x.title==='string';}).map(function(x){return {id:'xuper-'+x.id.slice(0,80),title:x.title.slice(0,180),description:typeof x.description==='string'?x.description.slice(0,1800):'',source:'XUPER',category:'movie',rightsVerified:false,streamUrl:''};});finish(null,{items:items});
  });}catch(e){finish(new Error('xuper_unavailable'));}
 };
 function VpnProvider(){this.state='unavailable';}
 VpnProvider.prototype.connect=function(options,done){this.state='unavailable';done(new Error('vpn_native_service_not_configured'));};
 VpnProvider.prototype.disconnect=function(done){this.state='disconnected';if(done)done(null,{state:this.state});};
 window.XuperProvider=XuperProvider;window.VpnProvider=VpnProvider;
 window.CACTUS_XUPER=new XuperProvider();window.CACTUS_VPN=new VpnProvider();
})();
