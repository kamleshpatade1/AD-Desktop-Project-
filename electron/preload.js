const { contextBridge, ipcRenderer } = require('electron')

// Sandboxed preload scripts use CommonJS; expose named actions, not ipcRenderer.
contextBridge.exposeInMainWorld('athena', {
  getAppInfo: () => ipcRenderer.invoke('athena:get-app-info'),
  showExamRules: () => ipcRenderer.invoke('athena:show-exam-rules'),
  setFullscreen: (enabled) => {
    if (typeof enabled !== 'boolean') {
      return Promise.reject(new TypeError('Fullscreen state must be a boolean.'))
    }
    return ipcRenderer.invoke('athena:set-fullscreen', enabled)
  },
  getFullscreenState: () => ipcRenderer.invoke('athena:get-fullscreen-state'),
  onFullscreenChanged: (callback) => {
    if (typeof callback !== 'function') {
      throw new TypeError('A fullscreen state callback is required.')
    }

    // Hide Electron's IPC event object and expose only the fullscreen boolean.
    const listener = (_event, enabled) => callback(enabled === true)
    ipcRenderer.on('athena:fullscreen-changed', listener)
    return () => ipcRenderer.removeListener('athena:fullscreen-changed', listener)
  },
})
