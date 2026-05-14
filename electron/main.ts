import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Awsome Editor Pro',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'resources', 'icon.ico'),
    frame: false,
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

const template: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new') },
      { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open') },
      { type: 'separator' },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
      { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:save-as') },
      { type: 'separator' },
      { label: 'Export...', accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('menu:export') },
      { type: 'separator' },
      { label: 'Exit', role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => mainWindow?.webContents.send('menu:undo') },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => mainWindow?.webContents.send('menu:redo') },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => mainWindow?.webContents.send('menu:cut') },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => mainWindow?.webContents.send('menu:copy') },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => mainWindow?.webContents.send('menu:paste') },
      { label: 'Delete', accelerator: 'Delete', click: () => mainWindow?.webContents.send('menu:delete') },
      { type: 'separator' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => mainWindow?.webContents.send('menu:select-all') },
    ],
  },
  {
    label: 'View',
    submenu: [
      { label: 'Waveform', click: () => mainWindow?.webContents.send('menu:view-waveform') },
      { label: 'Spectral', click: () => mainWindow?.webContents.send('menu:view-spectral') },
      { type: 'separator' },
      { label: 'Toggle Full Screen', role: 'togglefullscreen' },
      { type: 'separator' },
      { label: 'Developer Tools', role: 'toggleDevTools' },
    ],
  },
  {
    label: 'Effects',
    submenu: [
      { label: 'Amplify...', click: () => mainWindow?.webContents.send('menu:fx-amplify') },
      { label: 'Normalize...', click: () => mainWindow?.webContents.send('menu:fx-normalize') },
      { type: 'separator' },
      { label: 'Fade In', click: () => mainWindow?.webContents.send('menu:fx-fadein') },
      { label: 'Fade Out', click: () => mainWindow?.webContents.send('menu:fx-fadeout') },
      { type: 'separator' },
      { label: 'Equalizer...', click: () => mainWindow?.webContents.send('menu:fx-eq') },
      { label: 'Compressor...', click: () => mainWindow?.webContents.send('menu:fx-compressor') },
      { label: 'Reverb...', click: () => mainWindow?.webContents.send('menu:fx-reverb') },
      { type: 'separator' },
      { label: 'Noise Reduction...', click: () => mainWindow?.webContents.send('menu:fx-noisereduction') },
      { label: 'Invert', click: () => mainWindow?.webContents.send('menu:fx-invert') },
      { label: 'Reverse', click: () => mainWindow?.webContents.send('menu:fx-reverse') },
    ],
  },
  {
    label: 'Generate',
    submenu: [
      { label: 'Silence...', click: () => mainWindow?.webContents.send('menu:gen-silence') },
      { label: 'Tone...', click: () => mainWindow?.webContents.send('menu:gen-tone') },
      { label: 'Noise...', click: () => mainWindow?.webContents.send('menu:gen-noise') },
    ],
  },
  {
    label: 'Help',
    submenu: [
      { label: 'About Awsome Editor Pro', click: () => {
        dialog.showMessageBoxSync(mainWindow!, {
          type: 'info',
          title: 'About Awsome Editor Pro',
          message: 'Awsome Editor Pro v1.0.0',
          detail: 'Professional Audio Editor\nBuilt with Electron & React\n\nThe modern successor to Cool Edit Pro.',
        })
      }},
    ],
  },
]

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aiff', 'aac'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile', 'multiSelections'],
  })
  return result
})

ipcMain.handle('save-file', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [
      { name: 'WAV', extensions: ['wav'] },
      { name: 'MP3', extensions: ['mp3'] },
      { name: 'OGG', extensions: ['ogg'] },
      { name: 'FLAC', extensions: ['flac'] },
    ],
  })
  return result
})

ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window-close', () => mainWindow?.close())
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized())

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
