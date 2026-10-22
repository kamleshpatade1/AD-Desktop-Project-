import { app, BrowserWindow } from 'electron'

// Create the desktop window after Electron has finished starting up.
function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      // Keep browser pages isolated from Node.js and its native APIs.
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // During development, show the React app served by Vite.
  window.loadURL('http://127.0.0.1:5173')
}

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
