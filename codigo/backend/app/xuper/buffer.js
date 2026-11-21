/* Subconjunto Buffer para el transmultiplexor autorizado, sin clases ES2015. */
(function(w){'use strict';var nativeSub=Uint8Array.prototype.subarray,methods={};
 function wrap(value){Object.keys(methods).forEach(function(k){value[k]=methods[k];});return value;}
 function BinaryBuffer(input){return wrap(new Uint8Array(input));}
 BinaryBuffer.alloc=BinaryBuffer.allocUnsafe=function(n){return BinaryBuffer(n);};
 BinaryBuffer.from=function(input){if(typeof input==='string'){var a=BinaryBuffer(input.length);for(var i=0;i<input.length;i++)a[i]=input.charCodeAt(i)&255;return a;}if(input instanceof ArrayBuffer)return BinaryBuffer(input);if(input&&input.buffer instanceof ArrayBuffer)return BinaryBuffer(new Uint8Array(input.buffer,input.byteOffset,input.byteLength));return BinaryBuffer(input);};
 BinaryBuffer.concat=function(chunks,size){if(size===undefined)size=chunks.reduce(function(n,c){return n+c.byteLength;},0);var out=BinaryBuffer(size),index=0;chunks.forEach(function(c){if(index<out.length){out.set(c.subarray(0,out.length-index),index);index+=c.length;}});return out;};
 function view(b){return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 methods.subarray=function(start,end){return wrap(nativeSub.call(this,start,end));};methods.slice=function(start,end){return BinaryBuffer(nativeSub.call(this,start,end));};
 methods.readUInt32BE=function(p){return view(this).getUint32(p,false);};methods.readUInt16BE=function(p){return view(this).getUint16(p,false);};
 methods.writeUInt32BE=function(v,p){view(this).setUint32(p,v>>>0,false);return p+4;};methods.writeUInt16BE=function(v,p){view(this).setUint16(p,v&65535,false);return p+2;};methods.writeInt16BE=function(v,p){view(this).setInt16(p,v,false);return p+2;};methods.writeInt32BE=function(v,p){view(this).setInt32(p,v,false);return p+4;};
 methods.writeUIntBE=function(v,p,len){for(var i=len-1;i>=0;i--){this[p+i]=v&255;v=Math.floor(v/256);}return p+len;};methods.write=function(str,p){p=p||0;for(var i=0;i<str.length&&p+i<this.length;i++)this[p+i]=str.charCodeAt(i)&255;return Math.min(str.length,this.length-p);};
 methods.toString=function(enc,start,end){start=start||0;end=end===undefined?this.length:end;var s='';for(var i=start;i<end;i++)s+=enc==='hex'?('0'+this[i].toString(16)).slice(-2):String.fromCharCode(this[i]);return s;};w.CactusBuffer=BinaryBuffer;
})(window);
