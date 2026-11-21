'use strict';
var fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
module.exports=function(options){
 options=options||{};var dir=options.dir||path.join(os.tmpdir(),'cactustv-lg-posters-v1'),limit=options.limit||33554432,maxEntry=2097152,ttl=21600000,writing=false,again=false;
 function filename(url){return path.join(dir,crypto.createHash('sha256').update(url).digest('hex')+'.img');}
 function prune(){if(writing){again=true;return;}writing=true;fs.readdir(dir,function(err,names){if(err){writing=false;return;}var files=[],remaining=names.length;if(!remaining){writing=false;return;}
  names.forEach(function(name){if(!/^[a-f0-9]{64}\.img$/.test(name))return done();var p=path.join(dir,name);fs.lstat(p,function(e,s){if(!e&&s.isFile())files.push({p:p,size:s.size,time:s.mtimeMs});done();});});
  function done(){if(--remaining)return;files.sort(function(a,b){return b.time-a.time;});var total=0;files.forEach(function(f,i){total+=f.size;if(Date.now()-f.time>ttl||total>limit||i>=160)fs.unlink(f.p,function(){});});writing=false;if(again){again=false;prune();}}
 });}
 fs.mkdir(dir,{recursive:true},function(e){if(!e)prune();});
 return {maxEntry:maxEntry,get:function(url,cb){var p=filename(url);fs.lstat(p,function(e,s){if(e||!s.isFile()||s.size<12||s.size>maxEntry||Date.now()-s.mtimeMs>ttl)return cb(null);fs.readFile(p,function(err,data){cb(err?null:data);});});},put:function(url,bytes){if(!bytes||bytes.length<12||bytes.length>maxEntry)return;var p=filename(url),temp=p+'.'+process.pid+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';fs.writeFile(temp,bytes,{flag:'wx',mode:384},function(e){if(e)return;fs.rename(temp,p,function(err){if(err)fs.unlink(temp,function(){});else prune();});});}};
};
