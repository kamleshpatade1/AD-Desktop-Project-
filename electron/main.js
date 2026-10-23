import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const preloadPath = fileURLToPath(new URL('./preload.js', import.meta.url))

// IPC channels are kept in the main process so the renderer cannot choose a channel.
const IPC_CHANNELS = {
  getAppInfo: 'athena:get-app-info',
  showExamRules: 'athena:show-exam-rules',
  setFullscreen: 'athena:set-fullscreen',
  getFullscreenState: 'athena:get-fullscreen-state',
  fullscreenChanged: 'athena:fullscreen-changed',
  selectSnapshotFolder: 'athena:select-snapshot-folder',
  saveSnapshot: 'athena:save-snapshot',
}

// Keep each window's chosen destination in the main process, not in renderer IPC data.
const snapshotFolders = new WeakMap()
const MAX_SNAPSHOT_BYTES = 20 * 1024 * 1024
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

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

ipcMain.handle(IPC_CHANNELS.selectSnapshotFolder, async (event) => {
  const window = getWindowForEvent(event)

  // Let the operating system's native dialog choose the destination folder.
  const result = await dialog.showOpenDialog(window, {
    title: 'Choose a folder for exam snapshots',
    buttonLabel: 'Select Folder',
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    snapshotFolders.delete(window)
    return null
  }

  const folderPath = result.filePaths[0]
  snapshotFolders.set(window, folderPath)
  return folderPath
})

ipcMain.handle(IPC_CHANNELS.saveSnapshot, async (event, dataUrl) => {
  const window = getWindowForEvent(event)
  const folderPath = snapshotFolders.get(window)

  if (!folderPath) {
    throw new Error('Choose a snapshot folder before saving an image.')
  }
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new TypeError('Snapshot data must be a PNG image.')
  }

  const base64Data = dataUrl.slice(PNG_DATA_URL_PREFIX.length)
  if (
    base64Data.length === 0 ||
    base64Data.length * 0.75 > MAX_SNAPSHOT_BYTES ||
    base64Data.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)
  ) {
    throw new TypeError('Snapshot image data is invalid or too large.')
  }

  const imageBuffer = Buffer.from(base64Data, 'base64')
  if (
    imageBuffer.length > MAX_SNAPSHOT_BYTES ||
    imageBuffer.length < PNG_SIGNATURE.length ||
    !imageBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw new TypeError('Snapshot data is not a valid PNG image.')
  }

  // Timestamped names make each manual capture easy to identify and sort.
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt}`
    const filename = `newton-athena-snapshot-${timestamp}${suffix}.png`

    try {
      // Exclusive creation prevents a rapid second capture from overwriting a file.
      await writeFile(join(folderPath, filename), imageBuffer, { flag: 'wx' })
      return { filename }
    } catch (error) {
      if (error.code === 'EEXIST') {
        continue
      }

      throw new Error(
        'Could not save the snapshot. Check that the selected folder is writable and has available space.',
        { cause: error },
      )
    }
  }

  throw new Error('Could not create a unique snapshot filename. Please try again.')
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
