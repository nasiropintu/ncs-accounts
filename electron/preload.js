const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('NCS_ELECTRON', {
  pickVideo: () => ipcRenderer.invoke('ncs:pick-video'),
  pickVideoFolder: () => ipcRenderer.invoke('ncs:pick-video-folder'),
  listVideoFolder: (dirPath) => ipcRenderer.invoke('ncs:list-video-folder', dirPath),
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
