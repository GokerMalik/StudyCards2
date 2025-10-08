const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Sample data
const sampleCategories = [
  { id: 'cat1', name: 'Spanish' },
  { id: 'cat2', name: 'French' },
];
const sampleCards = [
  { id: 'card1', front: 'cat', back: 'gato', totalAnswered: 0, correctAnswered: 0 },
  { id: 'card2', front: 'dog', back: 'perro', totalAnswered: 0, correctAnswered: 0 },
  { id: 'card3', front: 'house', back: 'maison', totalAnswered: 0, correctAnswered: 0 },
  { id: 'card4', front: 'water', back: 'eau', totalAnswered: 0, correctAnswered: 0 },
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

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
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