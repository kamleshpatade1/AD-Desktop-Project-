# Newton Athena — Desktop Exam Environment

Newton Athena is a beginner-friendly Electron desktop application for preparing
for an exam session. It combines a React interface with a native desktop window
and a small set of carefully scoped Electron features.

This is a learning prototype. It is not secure proctoring software and does
not enforce exam rules.

## Features

- Camera permission requested only after the user clicks **Grant Camera
  Permission**, with a live preview and a **Stop Camera** control.
- Configurable prototype exam timer (15, 30, 45, or 60 minutes; 30 minutes by
  default), with start and confirmed end controls.
- Native fullscreen toggle. Fullscreen can be exited with Escape or normal
  macOS window controls; the app does not use kiosk mode.
- Native **View Exam Rules** dialog with an acknowledgement button.
- Native folder picker and manual **Capture Snapshot** action.
- Automatic still-image snapshots every 10 seconds while an exam session is
  running. Automatic and manual snapshots are saved as timestamped PNG files
  in the selected folder.
- Blue-and-white responsive interface with browser fallbacks for desktop-only
  actions.

The app does not record video or audio, capture images in the background when
an exam is not running, or implement exam submission, authentication, a
backend, or a database.

## Prerequisites (macOS)

- macOS
- Node.js and npm. Install a current Node.js LTS release from
  [nodejs.org](https://nodejs.org/) or use a Node version manager.
- A camera for testing the camera preview and snapshot feature.

Check the installed tools:

```bash
node --version
npm --version
```

## Install and run

From the project directory:

```bash
npm install
npm run electron:dev
```

`electron:dev` starts the Vite development server on `127.0.0.1:5173`, waits for
it to respond, and then opens the Electron window. Close the app with **Cmd+Q**
or the regular macOS window controls.

You can run the React interface in a browser separately with:

```bash
npm run dev
```

Some desktop actions (native fullscreen, the native rules dialog, and folder
selection/snapshot saving) are only available in the Electron app. In a regular
browser, those controls are disabled and the UI explains why.

## Camera and snapshots

1. In the Electron app, click **Grant Camera Permission** and allow access when
   macOS asks. The preview appears once a live camera stream is available.
2. Click **Select Snapshot Folder** and choose a folder where you have write
   permission. The selected path is shown in the camera panel.
3. The app clearly notes that, while an exam is running, it automatically saves
   one still image every 10 seconds to the selected folder. There is no audio
   or video recording.
4. With the live preview active and a folder selected, click **Capture
   Snapshot** to save an additional single PNG immediately.
5. Click **Stop Camera** when you are done using the preview.

Snapshot folder selection is held by the Electron main process for the current
window and is not persisted after the app closes. Select a folder before
starting the exam; the start button remains unavailable without a live camera
and selected folder. Automatic captures stop when the exam ends or completes.

## Exam timer

Select a duration in the **Session timer** card. The prototype defaults to 30
minutes and offers 15, 30, 45, and 60 minutes. **Start Exam** is enabled only
while the camera has a live video track. **End Exam** asks for confirmation.
When time reaches zero, the session is marked complete. Losing the camera also
ends an active session.

The timer is local UI state. It is not a trusted clock, cannot prevent leaving
the app, and does not submit or save an exam.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run electron:dev` | Start Vite and launch the Electron development window. |
| `npm run dev` | Start only the Vite renderer for browser development. |
| `npm run build` | Build the React renderer into `dist/`. This does not package Electron. |
| `npm run lint` | Run ESLint across the project. |
| `npm run preview` | Preview the built Vite renderer; this does not launch Electron. |

There is currently no packaging or installer script. `npm run build` creates
the web renderer bundle only; a packaged macOS app is not configured yet.

## Project structure

```text
electron/
  main.js       Electron main process: window, native dialogs, fullscreen, snapshots
  preload.js    Narrow bridge between Electron IPC and the React renderer
src/
  App.jsx       React interface and camera, timer, and session state
  App.css       Application layout and component styling
  index.css     Global styles and shared theme colors
  main.jsx      React entry point
index.html      Vite HTML entry point and document metadata
vite.config.js  Vite and React plugin configuration
package.json    Dependencies and npm scripts
```

The **main process** in `electron/main.js` can use Electron and Node.js APIs.
The **preload** in `electron/preload.js` exposes specific named operations such
as selecting a snapshot folder; it does not expose `ipcRenderer` or general
filesystem access. The **renderer** in `src/` is the React UI. Camera access
uses the browser media API directly in response to a user action.

## Security and prototype limitations

- The Electron window uses `contextIsolation: true` and
  `nodeIntegration: false`.
- The renderer receives a small, named preload API with fixed IPC channels,
  rather than raw IPC or Node.js access.
- The main process validates snapshot input and writes only PNG data into the
  folder chosen through the native folder picker.
- Camera video is used for the live preview and for user-requested still
  snapshots, including automatic still snapshots every 10 seconds during an
  active exam. There is no audio or video recording.
- The timer and displayed states are prototype UI behavior, not tamper-resistant
  controls. Fullscreen is optional and can be exited normally.

Do not use this prototype as a substitute for a tested exam security,
proctoring, or assessment platform.

## Troubleshooting

### Camera permission is denied or no preview appears

- Make sure a camera is connected and not being used exclusively by another
  application.
- Check macOS **System Settings → Privacy & Security → Camera** and allow
  camera access for the Electron app. Depending on how the app is launched,
  macOS may identify the development app as Electron.
- Quit and relaunch the app after changing system camera permissions, then
  click **Grant Camera Permission** again.
- The app requests video only; it does not request microphone access.

### The Electron window does not open

- Run `npm install` and retry `npm run electron:dev`.
- Check whether another process is already using port `5173`. Stop the other
  Vite process before starting the Electron development command.
- Confirm that `node --version` and `npm --version` work in the terminal.

### Snapshot saving fails

- Choose a folder using **Select Snapshot Folder**; the choice is not retained
  after the app closes.
- Make sure the folder is writable and has available disk space.
- Keep the camera preview active and wait for it to display before capturing.
- Automatic captures are written only while the exam timer is running and stop
  when that session ends.

### Native desktop actions are disabled

Run `npm run electron:dev` to open the Electron app. A browser launched with
`npm run dev` does not have the Electron preload bridge and cannot show native
dialogs or save snapshots through the main process.
