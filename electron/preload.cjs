const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  downloadPdf: (options) => ipcRenderer.invoke('download-pdf', options),
})
