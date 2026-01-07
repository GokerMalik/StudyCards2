const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Workaround: ensure Electron/Chromium disk cache is placed in a writable folder.
// This helps avoid errors like "Unable to move the cache: Access is denied." on Windows.
try {
  const cacheDir = path.join(app.getPath('userData'), 'Cache');
  // Create the cache directory early so Chromium can use it.
  fs.mkdirSync(cacheDir, { recursive: true });
  // Tell Chromium/Electron to use this directory for its disk cache.
  // Must be set before Chromium initializes heavy subsystems; doing it here is early enough.
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
  // If GPU cache errors continue, you can disable GPU as a last resort:
  // app.commandLine.appendSwitch('disable-gpu');
} catch (e) {
  console.warn('Unable to prepare disk cache directory:', e && e.message);
}

// Sample data
const sampleCategories = [
  { id: 'cat1', name: 'Spanish' },
  { id: 'cat2', name: 'French' },
];
const sampleCards = [
  { id: 'card1', front: 'cat', back: 'gato', totalAnswered: 0, correctAnswered: 0, totalReward: 0, totalAttemptWeight: 0 },
  { id: 'card2', front: 'dog', back: 'perro', totalAnswered: 0, correctAnswered: 0, totalReward: 0, totalAttemptWeight: 0 },
  { id: 'card3', front: 'house', back: 'maison', totalAnswered: 0, correctAnswered: 0, totalReward: 0, totalAttemptWeight: 0 },
  { id: 'card4', front: 'water', back: 'eau', totalAnswered: 0, correctAnswered: 0, totalReward: 0, totalAttemptWeight: 0 },
];
const sampleDecks = [
  {
    id: 'deck1',
    name: 'Basic Animals',
    categoryId: 'cat1',
    studyMode: 'ask_backside',
    cardIds: ['card1', 'card2'],
  },
  {
    id: 'deck2',
    name: 'Basic Nouns',
    categoryId: 'cat2',
    studyMode: 'ask_both',
    cardIds: ['card3', 'card4'],
  },
];

// Path to data.json
let dataPath = path.join(app.getPath('userData'), 'data.json');

// Store current window reference for dialogs
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const devServerUrl = 'http://localhost:5173';
  const distIndexPath = path.join(__dirname, 'dist', 'index.html');
  const useDevServer = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (useDevServer) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      if (fs.existsSync(distIndexPath)) {
        mainWindow.loadFile(distIndexPath);
        return;
      }
      console.error('Dev server not available and dist/index.html is missing.');
      mainWindow.loadURL('data:text/html,<h2>Renderer not found</h2><p>Run vite build or start the dev server.</p>');
    });
  } else if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath);
  } else {
    console.error('dist/index.html is missing. Run vite build before packaging.');
    mainWindow.loadURL('data:text/html,<h2>Renderer not found</h2><p>Run vite build before packaging.</p>');
  }
  // During development show a simple File menu (helps dev workflow). Hide the native menu in packaged builds
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  if (!app.isPackaged) {
    Menu.setApplicationMenu(menu);
  } else {
    // Hide the native menu in packaged (production) desktop app. The renderer provides the hamburger menu.
    Menu.setApplicationMenu(null);
  }
}

// Ensure data.json exists with sample data if not present
function ensureDataFile() {
  if (!fs.existsSync(dataPath)) {
    const initialData = {
      categories: sampleCategories,
      decks: sampleDecks,
      cards: sampleCards,
    };
    fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// IPC handler to read data.json
ipcMain.handle('read-data', async () => {
  try {
    if (!fs.existsSync(dataPath)) {
      // If file doesn't exist, return default structure
      return { categories: [], decks: [], cards: [] };
    }
    const content = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading data.json:', err);
    return { categories: [], decks: [], cards: [] };
  }
});

// IPC handler to write data.json
ipcMain.handle('write-data', async (event, data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error writing data.json:', err);
    return { success: false, error: err.message };
  }
});

// IPC: Open native dialog to select a JSON file, read and return its contents
ipcMain.handle('open-and-load', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Load Table',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(content);
    dataPath = filePaths[0];
    // Persist to the primary dataPath so subsequent write-data/write-as work against this file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    return { canceled: false, data };
  } catch (err) {
    console.error('open-and-load error', err);
    return { canceled: true, error: err.message };
  }
});

// IPC: Show save dialog and write provided data to chosen path
ipcMain.handle('save-as', async (event, data) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Table as',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: 'data.json'
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    dataPath = filePath;
    return { canceled: false };
  } catch (err) {
    console.error('save-as error', err);
    return { canceled: true, error: err.message };
  }
});

app.whenReady().then(() => {
  ensureDataFile();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 
