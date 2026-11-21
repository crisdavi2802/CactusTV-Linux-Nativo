'use strict';
/* Cactus TV LG: servidor local NUEVO para webOS, sin API de Collateral/TMDB.
 * Entrega los recursos propios de Samsung y retransmite peticiones HTTPS/HTTP
 * iniciadas por Cactus TV. Escucha SOLO en 127.0.0.1.
 */
var http=require('http'), https=require('https'), fs=require('fs'), path=require('path'), dns=require('dns'), net=require('net'), zlib=require('zlib');
var root=path.resolve(__dirname,'app'), port=Number(process.env.PORT)||47883;
var imageCache=require('./image-cache')(), imageAgents={http:new http.Agent({keepAlive:true,maxSockets:4,maxFreeSockets:2}),https:new https.Agent({keepAlive:true,maxSockets:4,maxFreeSockets:2})};
var hevcHls=require('./hevc-hls')({baseUrl:'http://127.0.0.1:'+port,dataDir:process.env.CACTUS_DATA_DIR});
var maxBody=2097152, maxReply=67108864;
/* Solamente contadores: nunca guardar URLs, licencias, cookies ni cabeceras. */
var diag={images:{ok:0,http401:0,http404:0,otherHTTP:0,invalid:0,network:0},media:{ok:0,http401:0,http403:0,otherHTTP:0,network:0}};
function note(group,status,type){var d=diag[group];if(type==='network'){d.network++;return;}if(type==='invalid'){d.invalid++;return;}if(status===401){d.http401++;return;}if(status===403&&group==='media'){d.http403++;return;}if(status===404&&group==='images'){d.http404++;return;}if(status>=200&&status<300){d.ok++;return;}d.otherHTTP++;}
function imageMime(chunk){if(!chunk||chunk.length<12)return '';
 if(chunk[0]===255&&chunk[1]===216&&chunk[2]===255)return 'image/jpeg';
 if(chunk[0]===137&&chunk[1]===80&&chunk[2]===78&&chunk[3]===71&&chunk[4]===13)return 'image/png';
 if(chunk.toString('ascii',0,4)==='RIFF'&&chunk.toString('ascii',8,12)==='WEBP')return 'image/webp';
 if(chunk.toString('ascii',0,3)==='GIF')return 'image/gif';
 if(chunk.toString('ascii',4,8)==='ftyp'&&/avif|avis/.test(chunk.toString('ascii',8,20)))return 'image/avif';
 return '';
}
var mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.txt':'text/plain; charset=utf-8'};
function respond(res,code,msg){if(res.headersSent){res.destroy();return;}res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(msg);}
function publicIP(ip){
 var v=net.isIP(ip);if(!v)return false;
 if(v===4){var p=ip.split('.').map(Number);return !(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168||p[0]===192&&p[1]===0||p[0]===198&&p[1]>=18&&p[1]<=19||p[0]===100&&p[1]>=64&&p[1]<=127||p[0]===192&&p[1]===0&&p[2]===0||p[0]===192&&p[1]===0&&p[2]===2||p[0]===198&&p[1]===51&&p[2]===100||p[0]===203&&p[1]===0&&p[2]===113);
 }
 var s=ip.toLowerCase();return !(s==='::'||s==='::1'||s.indexOf('fc')===0||s.indexOf('fd')===0||s.indexOf('fe8')===0||s.indexOf('fe9')===0||s.indexOf('fea')===0||s.indexOf('feb')===0||s.indexOf('ff')===0||s.indexOf('::ffff:')===0||s.indexOf('2001:db8:')===0);
}
function parseRemote(raw){
 if(typeof raw!=='string'||raw.length>4096)throw Error('bad_url');
 var u=new URL(raw);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.hash)throw Error('unsafe_url');
 if(!u.hostname||u.hostname.length>253||/(^|\.)localhost\.?$/i.test(u.hostname)||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal'))throw Error('unsafe_host');
 if(net.isIP(u.hostname)&&!publicIP(u.hostname))throw Error('unsafe_host');
 return u;
}
function safeLookup(host,opts,cb){
 /* Node >=20 usa autoSelectFamily y pide la lookup con `all:true`, por lo que
  * la respuesta debe ser un array de {address,family}. El original de webOS
  * devolvia (address,family) y en Linux producia ERR_INVALID_IP_ADDRESS. */
 if(typeof opts==='function'){cb=opts;opts={};}
 dns.lookup(host,{all:true,verbatim:true},function(err,rows){
  if(err||!rows||!rows.length)return cb(err||Error('no_dns'));
  if(rows.some(function(r){return !publicIP(r.address);}))return cb(Error('blocked_dns'));
  var r=rows.find(function(x){return x.family===4;})||rows[0];
  if(opts&&opts.all)return cb(null,[r]);
  cb(null,r.address,r.family);
 });
}
function filterHeaders(headers){var selected={},allowed={'accept':1,'authorization':1,'apk':1,'apkver':1,'spkgver':1,'content-type':1,'range':1,'user-agent':1,'referer':1,'origin':1,'x-device-id':1,'x-request-id':1,'x-user-token':1,'x-portal-code':1,'x-client-version':1,'x-sign':1,'x-signature':1,'x-token':1,'app':1,'app-version':1,'content-license':1,'content-auth':1,'ranger-id':1,'pragma':1,'x-buffer':1};
 Object.keys(headers||{}).forEach(function(k){var n=k.toLowerCase(),v=headers[k];if(allowed[n]&&typeof v==='string'&&v.length<4096&&!/[\r\n]/.test(v))selected[n]=v;});selected['accept-encoding']='identity';return selected;}
function upstream(target,method,headers,body,accept,done,round){
 var u;try{u=parseRemote(target);}catch(e){return done(e);}
 if(round>4)return done(Error('redirect_limit'));
 var redirected=null;var module=u.protocol==='https:'?https:http,finished=false;
 function finish(err,stream,status,upHeaders){if(finished)return;finished=true;done(err,stream,status,upHeaders);}
 var req=module.request({protocol:u.protocol,hostname:u.hostname,port:u.port||(u.protocol==='https:'?443:80),path:u.pathname+u.search,method:method,headers:headers,lookup:safeLookup,agent:accept==='image'?imageAgents[u.protocol==='https:'?'https':'http']:undefined,timeout:accept==='image'?8000:25000},function(remote){
  var loc=remote.headers.location;
  if(loc&&[301,302,303,307,308].indexOf(remote.statusCode)!==-1){
   remote.resume();var next;
   try{next=new URL(loc,u).href;next=parseRemote(next).href;}catch(e){return finish(e);}
   var nh=Object.assign({},headers),nm=method,nb=body;
   if(new URL(next).origin!==u.origin){delete nh.authorization;delete nh.referer;delete nh.origin;delete nh['x-token'];delete nh['x-signature'];delete nh['content-license'];delete nh['content-auth'];delete nh['ranger-id'];delete nh['x-user-token'];delete nh['x-portal-code'];}
   if(remote.statusCode===303||(remote.statusCode===301||remote.statusCode===302)&&method==='POST'){nm='GET';nb=null;delete nh['content-type'];delete nh['content-length'];}
   redirected=upstream(next,nm,nh,nb,accept,finish,round+1);return;
  }
  finish(null,remote,remote.statusCode,remote.headers);
 });
 req.on('timeout',function(){req.destroy(Error('upstream_timeout'));});req.on('error',function(e){finish(e);});
 if(body)req.write(body);req.end();return function(){if(redirected)redirected();req.destroy();};
}
function pipeRemote(res,url,method,headers,body,image,unlimited){
 if(!image)return pipeRemoteFetch(res,url,method,headers,body,false,unlimited);
 imageCache.get(url,function(bytes){if(res.destroyed||res.writableEnded)return;var mime=bytes&&imageMime(bytes);if(mime){res.writeHead(200,{'Content-Type':mime,'Content-Length':bytes.length,'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','X-Cactus-Image-Cache':'hit'});return res.end(bytes);}pipeRemoteFetch(res,url,method,headers,body,true);});
}
function pipeRemoteFetch(res,url,method,headers,body,image,unlimited){
 var cancel=upstream(url,method,headers,body,image?'image':'bytes',function(err,remote,status,rh){
  if(res.destroyed||res.writableEnded){if(remote)remote.destroy();return;}
  var group=image?'images':'media';
  if(err){note(group,0,'network');return respond(res,502,'No se pudo consultar la fuente externa');}
  var size=Number(rh['content-length']||0),max=image?10485760:(unlimited?Number.MAX_SAFE_INTEGER:maxReply);
  if(size>max){note(group,0,'invalid');remote.destroy();return respond(res,413,'Respuesta demasiado grande');}
  var encoding=String(rh['content-encoding']||'').toLowerCase(),stream=remote;
  if(encoding==='gzip')stream=remote.pipe(zlib.createGunzip());
  else if(encoding==='deflate')stream=remote.pipe(zlib.createInflate());
  var out={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':rh['content-type']||'application/octet-stream'};
  if(rh['accept-ranges'])out['Accept-Ranges']=rh['accept-ranges'];
  if(rh['content-range'])out['Content-Range']=String(rh['content-range']).slice(0,250);
  if(!image){
   note(group,status);
   out['X-Cactus-Status']=String(status);
   if(rh['content-range'])out['X-Cactus-Range']=String(rh['content-range']).slice(0,250);
   if(rh['content-length']&&encoding==='')out['X-Cactus-Length']=String(rh['content-length']);
   /* El reproductor exige el codigo real: 206 para rangos de vídeo, 416 al
    * final del indexado. El relay de webOS devolvia siempre 200 (X-Cactus-Status),
    * lo que en Linux producia R02 (media_range_unavailable). */
   res.writeHead(status,out);
   var count=0;stream.on('data',function(chunk){count+=chunk.length;if(count>max){stream.destroy();res.destroy();}});
   stream.on('error',function(){res.destroy();});res.on('close',function(){remote.destroy();});stream.pipe(res);
   return;
  }
  /* Los CDNs usan rutas sin extension y a veces responden application/octet-stream.
   * Verificamos la firma real de imagen antes de ofrecerla al navegador LG. */
  if(status<200||status>=300){note(group,status);remote.destroy();return respond(res,status===404?404:502,'Imagen remota no disponible');}
  var started=false,count=0,chunks=[];
  stream.once('data',function(chunk){
   stream.pause();started=true;var mime=imageMime(chunk);
   if(!mime){note(group,0,'invalid');stream.destroy();return respond(res,415,'La fuente no entrego una imagen compatible');}
   note(group,status);out['Content-Type']=mime;out['Cache-Control']='private, max-age=3600';
   res.writeHead(200,out);count+=chunk.length;if(count<=imageCache.maxEntry)chunks.push(chunk);res.write(chunk);
   stream.on('data',function(c){count+=c.length;if(count<=imageCache.maxEntry)chunks.push(c);else chunks=[];if(count>max){stream.destroy();res.destroy();}});
   stream.on('error',function(){res.destroy();});res.on('close',function(){remote.destroy();});
   stream.pipe(res);
   stream.resume();
  });
  stream.once('end',function(){if(started&&chunks.length&&count<=imageCache.maxEntry)imageCache.put(url,Buffer.concat(chunks));if(!started){note(group,0,'invalid');respond(res,502,'Imagen vacia');}});
  stream.once('error',function(){if(!started){note(group,0,'network');respond(res,502,'Error remoto');}});
 },0);
 if(image)res.once('close',function(){if(cancel)cancel();});
}
function staticFile(req,res,url){
 if(req.method!=='GET'&&req.method!=='HEAD')return respond(res,405,'Método no admitido');
 var pathname;try{pathname=decodeURIComponent(url.pathname);}catch(e){return respond(res,400,'Ruta incorrecta');}
 if(pathname==='/'||pathname==='')pathname='/index.html';
 if(pathname.indexOf('\0')!==-1||pathname.indexOf('\\')!==-1)return respond(res,400,'Ruta incorrecta');
 var file=path.resolve(root,'.'+pathname);if(file.indexOf(root+path.sep)!==0)return respond(res,403,'Acceso denegado');
 var ext=path.extname(file).toLowerCase();if(!mime[ext])return respond(res,404,'Recurso no disponible');
 fs.stat(file,function(e,stat){if(e||!stat.isFile())return respond(res,404,'Recurso no disponible');
  var responseHeaders={'Content-Type':mime[ext],'Content-Length':stat.size,'Cache-Control':ext==='.html'||ext==='.js'?'no-store':'private, max-age=1800','X-Content-Type-Options':'nosniff'};
  if(ext==='.mp4'){
   responseHeaders['Accept-Ranges']='bytes';
   var range=/^bytes=(\d+)-(\d*)$/.exec(String(req.headers.range||''));
   if(req.headers.range&&(!range||Number(range[1])>=stat.size)){
    res.writeHead(416,{'Content-Range':'bytes */'+stat.size,'Content-Length':0});return res.end();
   }
   if(range){var start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;
    if(end<start){res.writeHead(416,{'Content-Range':'bytes */'+stat.size,'Content-Length':0});return res.end();}
    responseHeaders['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;
    responseHeaders['Content-Length']=end-start+1;res.writeHead(206,responseHeaders);
    if(req.method==='HEAD')return res.end();return fs.createReadStream(file,{start:start,end:end}).pipe(res);
   }
  }
  res.writeHead(200,responseHeaders);
  if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
 });
}

/* Metadatos de episodios, independientes de Collateral.
 * TVmaze es la fuente gratuita primaria; Kitsu sirve como opcion anime si TVmaze no cubre el titulo.
 * Límite de respuesta, caché corta y dominios fijos para evitar proxies de URL arbitrarios. */
var episodeCache=new Map();
function episodeNorm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(?:\b(?:season|temporada)\s*\d+\b|\b(?:t|s)\d+\b)/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function episodeScore(wanted,found){var a=episodeNorm(wanted),b=episodeNorm(found);if(a===b)return 1;if(!a||!b)return 0;if(a.indexOf(b)===0||b.indexOf(a)===0)return Math.min(a.length,b.length)>=7?0.89:0.60;var wa=a.split(' ').filter(function(w){return w.length>=3;}),wb=b.split(' ').filter(function(w){return w.length>=3;});if(!wa.length||!wb.length)return 0;var shared=wa.filter(function(w){return wb.indexOf(w)>=0;}).length;return shared/Math.max(wa.length,wb.length);}
function episodeGet(host,requestPath,cb){
 var done=false,buf=[],length=0;
 function finish(err,data){if(done)return;done=true;cb(err,data);}
 var req=https.get({hostname:host,port:443,path:requestPath,headers:{'User-Agent':'CactusTV/2.0.11 (metadata; local webOS app)','Accept':'application/json'},timeout:7500,lookup:safeLookup},function(r){
  if(r.statusCode!==200){r.resume();return finish(Error('status_'+r.statusCode));}
  r.on('data',function(c){length+=c.length;if(length>1800000){req.destroy();return finish(Error('too_large'));}buf.push(c);});
  r.on('end',function(){try{finish(null,JSON.parse(Buffer.concat(buf).toString('utf8')));}catch(e){finish(Error('not_json'));}});
  r.on('error',function(e){finish(e);});
 });req.on('timeout',function(){req.destroy(Error('timeout'));});req.on('error',function(e){finish(e);});
}
function episodeMaze(title,season,done){
 episodeGet('api.tvmaze.com','/search/shows?q='+encodeURIComponent(title),function(err,search){
  if(err||!Array.isArray(search))return done(null,[]);
  var best=null,score=0;search.slice(0,8).forEach(function(r){var s=r&&r.show;if(!s||!Number.isInteger(s.id))return;var n=episodeScore(title,s.name);if(n>score){score=n;best=s;}});
  if(!best||score<0.76)return done(null,[]);
  episodeGet('api.tvmaze.com','/shows/'+best.id+'/episodes',function(err,list){
   if(err||!Array.isArray(list))return done(null,[]);
   var valid=list.filter(function(e){return e&&e.season===season&&Number.isInteger(e.number)&&e.number>0&&e.number<1000;}).slice(0,220).map(function(e){
    var image=e.image&&(e.image.medium||e.image.original),validImage=typeof image==='string'&&/^https:\/\/static\.tvmaze\.com\//.test(image);
    return {number:e.number,title:typeof e.name==='string'?e.name.slice(0,140):'',image:validImage?image:''};
   });done(null,valid);
  });
 });
}
function episodeKitsu(title,season,done){
 episodeGet('kitsu.io','/api/edge/anime?filter%5Btext%5D='+encodeURIComponent(title)+'&page%5Blimit%5D=6',function(err,result){
  var found=result&&Array.isArray(result.data)?result.data:[],best=null,score=0;
  found.forEach(function(r){if(!r||!r.attributes||!/^[0-9]+$/.test(String(r.id)))return;var a=r.attributes,titles=[a.canonicalTitle].concat(Object.keys(a.titles||{}).map(function(x){return a.titles[x];}));var rank=Math.max.apply(null,titles.map(function(n){return episodeScore(title,n);}));if(rank>score){score=rank;best=r;}});
  if(err||!best||score<0.76)return done(null,[]);
  episodeGet('kitsu.io','/api/edge/anime/'+best.id+'/episodes?page%5Blimit%5D=100&page%5Boffset%5D=0',function(err,items){
   if(err||!items||!Array.isArray(items.data))return done(null,[]);
   var eps=items.data.filter(function(e){return e&&e.attributes&&Number(e.attributes.seasonNumber||1)===season;}).map(function(e){
    var a=e.attributes,num=Number(a.number)||0,image=a.thumbnail&&a.thumbnail.original;
    return {number:num,title:String(a.titles&&(a.titles.en_us||a.titles.en_jp)||a.canonicalTitle||'').slice(0,140),image:typeof image==='string'&&/^https:\/\/media\.kitsu\.io\//.test(image)?image:''};
   }).filter(function(e){return Number.isInteger(e.number)&&e.number>0&&e.number<1000;}).slice(0,100);
   done(null,eps);
  });
 });
}
function episodeMetadata(req,res,u){
 if(req.method!=='GET')return respond(res,405,'Método no admitido');
 var title=String(u.searchParams.get('title')||'').trim(),season=Number(u.searchParams.get('season')||1),anime=u.searchParams.get('anime')==='1';
 if(title.length<2||title.length>140||!Number.isInteger(season)||season<1||season>40)return respond(res,400,'Parámetros incorrectos');
 var id=episodeNorm(title)+'|'+season+'|'+anime,hit=episodeCache.get(id);
 function reply(data){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
 if(hit&&hit.expires>Date.now())return reply(hit.data);
 episodeMaze(title,season,function(err,eps){
  if(eps&&eps.length&&eps.some(function(e){return e.image;}))return save({source:'TVmaze',episodes:eps});
  if(!anime)return save({source:eps&&eps.length?'TVmaze':'',episodes:eps||[]});
  episodeKitsu(title,season,function(ignored,kitsu){
   if(kitsu&&kitsu.length&&(!eps||kitsu.filter(function(e){return e.image;}).length>eps.filter(function(e){return e.image;}).length))return save({source:'Kitsu',episodes:kitsu});
   save({source:eps&&eps.length?'TVmaze':'',episodes:eps||[]});
  });
 });
 function save(data){if(episodeCache.size>=60)episodeCache.delete(episodeCache.keys().next().value);episodeCache.set(id,{expires:Date.now()+(data.episodes.length?43200000:3600000),data:data});reply(data);}
}

http.createServer(function(req,res){
 var host=req.headers.host||'';if(host!=='127.0.0.1:'+port&&host!=='localhost:'+port)return respond(res,403,'Host no permitido');
 var u;try{u=new URL(req.url,'http://127.0.0.1:'+port);}catch(e){return respond(res,400,'Ruta incorrecta');}
 if(u.pathname==='/__cactus__/diagnostics'){
  if(req.method!=='GET')return respond(res,405,'Metodo no admitido');
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  return res.end(JSON.stringify({version:'2.0.41',images:diag.images,media:diag.media}));
 }
 if(u.pathname==='/__cactus__/episode-meta')return episodeMetadata(req,res,u);
 /* Fallback HEVC: solo se usa cuando el catalogo no ofrece H.264 y Chromium
  * no puede decodificar hvc1 por MediaSource. ffmpeg convierte a HLS local. */
 if(u.pathname==='/h/start'){
  if(req.method!=='GET')return respond(res,405,'Método no admitido');
  var hraw=u.searchParams.get('u'),hheaders=u.searchParams.get('h')||'';
  try{parseRemote(hraw);}catch(e){return respond(res,400,'URL no permitida');}
  var hparsed={};
  try{hparsed=JSON.parse(Buffer.from(hheaders,'base64').toString('utf8'));if(!hparsed||typeof hparsed!=='object'||Array.isArray(hparsed))hparsed={};}catch(e){hparsed={};}
  var hpromise;
  try{hpromise=hevcHls.start(hraw,hparsed);}catch(e){return respond(res,503,'La conversión HEVC no está disponible');}
  return hpromise.then(function(hsession){
   if(res.destroyed||res.writableEnded)return;
   res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(JSON.stringify(hsession));
  },function(){return respond(res,503,'La conversión HEVC no está disponible');});
 }
 if(u.pathname==='/h/stop'){
  if(req.method!=='GET')return respond(res,405,'Método no admitido');
  hevcHls.stop(String(u.searchParams.get('id')||''));
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end('{}');
 }
 if(u.pathname.indexOf('/h/')===0){
  if(req.method!=='GET'&&req.method!=='HEAD')return respond(res,405,'Método no admitido');
  var hparts=u.pathname.split('/');
  return hevcHls.prepare(hparts[2]||'',hparts[3]||'').then(function(hfile){
   return fs.stat(hfile,function(e,stat){if(e||!stat.isFile())return respond(res,404,'Recurso no disponible');
    var htype=/\.m3u8$/.test(hfile)?'application/vnd.apple.mpegurl':'video/mp2t';
    res.writeHead(200,{'Content-Type':htype,'Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();fs.createReadStream(hfile).pipe(res);});
  },function(){return respond(res,404,'Recurso no disponible');});
 }
 /* Linux portable: relay GET (HLS, vídeo e imágenes) con las mismas
   comprobaciones de seguridad que /__cactus__/fetch. */
 if(u.pathname==='/r'){
  var raw=u.searchParams.get('u');if(!raw)return respond(res,400,'URL requerida');
  try{parseRemote(raw);}catch(e){return respond(res,400,'URL no permitida');}
  var signed={};
  try{signed=JSON.parse(Buffer.from(u.searchParams.get('h')||'','base64').toString('utf8'));if(!signed||typeof signed!=='object'||Array.isArray(signed))signed={};}catch(e){signed={};}
  res.once('finish',function(){console.error('[CACTUS relay] '+req.method+' '+raw.slice(0,200)+' -> '+res.statusCode);});
  var chunks=[],size=0;
  req.on('data',function(b){size+=b.length;if(size>maxBody){req.destroy();return;}chunks.push(b);});
  req.on('end',function(){
   if(size>maxBody)return;
   var body=size?Buffer.concat(chunks):null;
   return pipeRemote(res,raw,req.method,filterHeaders(Object.assign({},req.headers,signed)),body,false,u.searchParams.get('stream')==='1');
  });
  return;
 }
 if(u.pathname==='/__cactus__/image'){
  if(req.method!=='GET')return respond(res,405,'Método no admitido');
  var raw=u.searchParams.get('u');if(!raw)return respond(res,400,'URL requerida');
  return pipeRemote(res,raw,'GET',filterHeaders({accept:'image/avif,image/webp,image/png,image/jpeg,image/gif','user-agent':'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/53.0.2785.34 Safari/537.36'}),null,true);
 }
 if(u.pathname==='/__cactus__/fetch'){
  if(req.method!=='POST')return respond(res,405,'Método no admitido');
  if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']||'')))return respond(res,415,'Formato no permitido');
  var chunks=[],size=0;req.on('data',function(b){size+=b.length;if(size>maxBody){req.destroy();return;}chunks.push(b);});
  req.on('end',function(){if(size>maxBody)return;var data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(e){return respond(res,400,'Datos incorrectos');}
   var method=String(data.method||'GET').toUpperCase();if(['GET','POST','HEAD','PUT','PATCH','DELETE'].indexOf(method)===-1)return respond(res,405,'Método no permitido');
   if(typeof data.body!=='string'&&data.body!==null&&data.body!==undefined)return respond(res,400,'Cuerpo no permitido');
   var body=data.body?Buffer.from(data.body,'utf8'):null,headers=filterHeaders(data.headers);
   if(body)headers['content-length']=String(body.length);
   return pipeRemote(res,data.url,method,headers,body,false);
  });return;
 }
 staticFile(req,res,u);
}).listen(port,'127.0.0.1');
