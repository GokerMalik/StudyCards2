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

  // Set up the application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Load Table',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              title: 'Load Table',
              filters: [{ name: 'JSON', extensions: ['json'] }],
              properties: ['openFile']
            });
            if (!canceled && filePaths && filePaths[0]) {
              try {
                const content = fs.readFileSync(filePaths[0], 'utf-8');
                const data = JSON.parse(content);
                dataPath = filePaths[0]; // Use this file for future saves
                // Write to the current dataPath to ensure consistency
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                // Notify renderer to reload (force reload)
                mainWindow.webContents.reload();
              } catch (err) {
                dialog.showErrorBox('Load Error', 'Failed to load table: ' + err.message);
              }
            }
          }
        },
        {
          label: 'Save Table as',
          click: async () => {
            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
              title: 'Save Table as',
              filters: [{ name: 'JSON', extensions: ['json'] }],
              defaultPath: 'data.json'
            });
            if (!canceled && filePath) {
              try {
                // Read current data
                let data = { categories: [], decks: [], cards: [] };
                if (fs.existsSync(dataPath)) {
                  const content = fs.readFileSync(dataPath, 'utf-8');
                  data = JSON.parse(content);
                }
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                dataPath = filePath; // Use this file for future saves
              } catch (err) {
                dialog.showErrorBox('Save Error', 'Failed to save table: ' + err.message);
              }
            }
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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