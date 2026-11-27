const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('NCS_ELECTRON', {
  pickVideo: () => ipcRenderer.invoke('ncs:pick-video'),
  pickVideoFolder: () => ipcRenderer.invoke('ncs:pick-video-folder'),
  listVideoFolder: (dirPath) => ipcRenderer.invoke('ncs:list-video-folder', dirPath),
  getBackdropCaps: () => ipcRenderer.invoke('ncs:get-backdrop-caps'),
  setBackdropMaterial: (material) => ipcRenderer.invoke('ncs:set-backdrop-material', material),
  getFilePath: (file) => {
    try {
      return (file && webUtils && typeof webUtils.getPathForFile === 'function')
        ? (webUtils.getPathForFile(file) || '')
        : '';
    } catch (e) {
      return '';
    }
  }
});
