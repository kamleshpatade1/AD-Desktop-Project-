const { contextBridge, ipcRenderer } = require('electron')

// Sandboxed preload scripts use CommonJS; expose named actions, not ipcRenderer.
contextBridge.exposeInMainWorld('athena', {
  getAppInfo: () => ipcRenderer.invoke('athena:get-app-info'),
  showExamRules: () => ipcRenderer.invoke('athena:show-exam-rules'),
})
