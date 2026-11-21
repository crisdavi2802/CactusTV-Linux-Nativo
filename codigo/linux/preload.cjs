'use strict';
/* Puente minimo (patron XuperDesktop 0.1.6/0.2.0): solo cuatro metodos,
 * sin Node en el renderer. La UI de Cactus no lo necesita para funcionar. */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cactusDesktop', {
  fullscreen: (enabled) => ipcRenderer.send('cactus:fullscreen', !!enabled),
  info: () => ipcRenderer.invoke('cactus:info')
});
