import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'

const preloadPath = fileURLToPath(new URL('./preload.js', import.meta.url))

// IPC channels are kept in the main process so the renderer cannot choose a channel.
const IPC_CHANNELS = {
  getAppInfo: 'athena:get-app-info',
  showExamRules: 'athena:show-exam-rules',
  setFullscreen: 'athena:set-fullscreen',
  getFullscreenState: 'athena:get-fullscreen-state',
  fullscreenChanged: 'athena:fullscreen-changed',
}

function getWindowForEvent(event) {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || window.isDestroyed()) {
    throw new Error('The request did not come from an active application window.')
  }
  return window
}

// Create the desktop window after Electron has finished starting up.
function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      // Keep browser pages isolated from Node.js and its native APIs.
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const publishFullscreenState = () => {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.fullscreenChanged, window.isFullScreen())
    }
  }

  // Send fullscreen updates so the React button stays in sync with native controls.
  window.on('enter-full-screen', publishFullscreenState)
  window.on('leave-full-screen', publishFullscreenState)

  // Escape exits fullscreen as a normal user action; fullscreen is never locked.
  window.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && window.isFullScreen()) {
      window.setFullScreen(false)
    }
  })

  // During development, show the React app served by Vite.
  window.loadURL('http://127.0.0.1:5173')
}

// Handle only the specific, limited requests exposed by the preload script.
ipcMain.handle(IPC_CHANNELS.getAppInfo, (event) => {
  getWindowForEvent(event)
  return {
    name: app.getName(),
    version: app.getVersion(),
  }
})

ipcMain.handle(IPC_CHANNELS.getFullscreenState, (event) => {
  return getWindowForEvent(event).isFullScreen()
})

ipcMain.handle(IPC_CHANNELS.setFullscreen, (event, enabled) => {
  if (typeof enabled !== 'boolean') {
    throw new TypeError('Fullscreen state must be a boolean.')
  }

  const window = getWindowForEvent(event)
  window.setFullScreen(enabled)
  return window.isFullScreen()
})

ipcMain.handle(IPC_CHANNELS.showExamRules, (event) => {
  const parentWindow = getWindowForEvent(event)

  // A native dialog keeps the rules readable and asks the student to acknowledge them.
  return dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: 'Exam rules',
    message: 'Please follow these guidelines during your exam.',
    detail: [
      'Remain in the exam window throughout your session.',
      'Keep your camera enabled when it is required.',
      'Do not leave the exam without permission.',
    ].join('\n'),
    buttons: ['I Understand'],
    defaultId: 0,
    cancelId: 0,
  })
})

app.whenReady().then(() => {
  createWindow()

  // macOS apps usually stay open in the Dock until the user quits them.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// On Windows and Linux, closing the last window exits the application.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
