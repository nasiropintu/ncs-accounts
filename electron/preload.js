const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('NCS_ELECTRON', {
  pickVideo: () => ipcRenderer.invoke('ncs:pick-video'),
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
