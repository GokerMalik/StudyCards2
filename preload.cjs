const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readData: () => ipcRenderer.invoke('read-data'),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  // Open native file dialog, read selected file, and return parsed data (desktop)
  openAndLoad: () => ipcRenderer.invoke('open-and-load'),
  // Show save dialog and write provided data to chosen path (desktop)
  saveAs: (data) => ipcRenderer.invoke('save-as', data),
}); 