import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'

const preloadPath = fileURLToPath(new URL('./preload.js', import.meta.url))

// IPC channels are kept in the main process so the renderer cannot choose a channel.
const IPC_CHANNELS = {
  getAppInfo: 'athena:get-app-info',
  showExamRules: 'athena:show-exam-rules',
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

  // During development, show the React app served by Vite.
  window.loadURL('http://127.0.0.1:5173')
}

// Handle only the specific, limited requests exposed by the preload script.
ipcMain.handle(IPC_CHANNELS.getAppInfo, () => ({
  name: app.getName(),
  version: app.getVersion(),
}))

ipcMain.handle(IPC_CHANNELS.showExamRules, (event) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender)

  return dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: 'Exam rules',
    message: 'Please follow these guidelines during your exam.',
    detail: [
      'Remain in the exam window throughout your session.',
      'Keep your camera enabled when it is required.',
      'Do not leave the exam without permission.',
    ].join('\n'),
    buttons: ['Close'],
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
