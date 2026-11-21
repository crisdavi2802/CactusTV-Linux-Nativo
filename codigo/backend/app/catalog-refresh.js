/* Sondeo acotado: al iniciar/reanudar y cada 5 min mientras la app es visible.
 * Una consulta simultánea; cancelar invalida callbacks antiguos; fallo conserva datos.
 * Sin promesa de push instantáneo ni trabajo en segundo plano cuando la TV suspende. */
(function(){'use strict';
 function CatalogRefresh(options){this.load=options.load;this.change=options.change;this.interval=Math.max(60000,options.interval||300000);this.clock=options.clock||function(){return Date.now();};this.timer=null;this.busy=false;this.generation=0;this.last=0;this.stopped=false;}
 CatalogRefresh.prototype.refresh=function(){var self=this;if(self.busy||self.stopped)return;var generation=self.generation,completed=false;self.busy=true;
  self.load(function(err,data){if(completed||generation!==self.generation||self.stopped)return;completed=true;self.busy=false;if(!err){self.last=self.clock();}self.change(err,data);});
 };
 CatalogRefresh.prototype.start=function(immediate){var self=this;if(self.timer)return;self.stopped=false;if(immediate!==false)self.refresh();self.timer=setInterval(function(){if(!document.hidden)self.refresh();},self.interval);};
 CatalogRefresh.prototype.cancel=function(){++this.generation;this.busy=false;};
 CatalogRefresh.prototype.resume=function(){if(this.clock()-this.last>=this.interval)this.refresh();};
 CatalogRefresh.prototype.stop=function(){this.stopped=true;this.cancel();clearInterval(this.timer);this.timer=null;};
 window.CactusCatalogRefresh=CatalogRefresh;
})();
