import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  NativeImage,
  ipcMain,
  Notification,
} from 'electron';
import * as path from 'path';
import settingsManager from './settings';
import hotkeyHandler from './hotkey';
import geminiClient from './gemini';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createTrayIcon(): NativeImage {
  // Create a simple tray icon (16x16 pixels)
  // In production, you'd use a proper icon file
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'logo.png');
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    // Create a simple colored square as fallback
    return nativeImage.createEmpty();
  }
}

function createTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADVSURBVDiNtZMxDoJAEEXfgIWV0FhQeQNLGxNvQOMB7Cy8gYWNCRaewNILaEdBY2FHYWJh4Q2sGBvNAguLxPiTSWZn/p/dZJYQQuA/YfXHj3NADZgBNWAD1LtF3x4C0m4G3oAHIATGwFUIoQMYGwPJNzNgAVyAgdY6ALqA3wO+AMcWsO+1LgJF4EwI4RpDX5h0MmkZaBlI4VO1VcA2cK21PjJ+h3r/AaC1rgNHQDvJI4moAENgGZnJBSBaax8BeAeukvNpPqR5J1W+Ah6BpKXXMf4EfgCO4T9gRDzZpgAAAABJRU5ErkJggg=='
  ) : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => {
        showWindow();
      },
    },
    {
      type: 'separator',
    },
    {
      label: `Shortcut: ${settingsManager.get('shortcut')}`,
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Prompt Enhancer');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    showWindow();
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => {
        showWindow();
      },
    },
    {
      type: 'separator',
    },
    {
      label: `Shortcut: ${settingsManager.get('shortcut')}`,
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'logo.png'),
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    // Show window on startup for easier debugging
    mainWindow?.show();
    // Open DevTools in development
    if (process.env.NODE_ENV !== 'production') {
      // mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function setupIPC(): void {
  ipcMain.handle('get-settings', () => {
    return settingsManager.getAll();
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    try {
      const oldShortcut = settingsManager.get('shortcut');

      // Save all settings
      settingsManager.setAll(settings);

      // Update auto-launch settings
      if (settings.startAtLogin !== undefined) {
        app.setLoginItemSettings({
          openAtLogin: settings.startAtLogin,
          path: app.getPath('exe'),
        });
      }

      // Re-register hotkey if shortcut changed
      if (settings.shortcut && settings.shortcut !== oldShortcut) {
        const success = hotkeyHandler.register();
        if (!success) {
          // Rollback
          settingsManager.set('shortcut', oldShortcut);
          hotkeyHandler.register();
          return { success: false, error: 'Failed to register new shortcut. It may be in use by another application.' };
        }
        updateTrayMenu();
      }

      // Re-register custom hotkey if custom shortcut changed
      const oldCustomShortcut = settingsManager.get('customShortcut');
      if (settings.customShortcut && settings.customShortcut !== oldCustomShortcut) {
        settingsManager.set('customShortcut', settings.customShortcut);
        const success = hotkeyHandler.registerCustomShortcut();
        if (!success) {
          settingsManager.set('customShortcut', oldCustomShortcut);
          hotkeyHandler.registerCustomShortcut();
          return { success: false, error: 'Failed to register custom shortcut. It may be in use by another application.' };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('test-api-key', async () => {
    try {
      const success = await geminiClient.testConnection();
      return { success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('reset-settings', async () => {
    settingsManager.reset();
    hotkeyHandler.register();
    updateTrayMenu();
  });

  ipcMain.on('close-window', () => {
    mainWindow?.hide();
  });

  ipcMain.on('minimize-to-tray', () => {
    mainWindow?.hide();
  });
}

app.whenReady().then(async () => {
  createWindow();
  createTray();
  setupIPC();

  // Setup IPC for custom prompt dialog
  hotkeyHandler.setupCustomPromptIPC();

  // Pre-create the prompt window for instant showing (fixes lag on first Shift+Ctrl+D)
  hotkeyHandler.createPromptWindow();

  // Register global hotkey
  const hotkeyRegistered = hotkeyHandler.register();

  if (!hotkeyRegistered) {
    new Notification({
      title: 'Prompt Enhancer',
      body: 'Failed to register hotkey. Please check settings.',
    }).show();
  }

  // Show notification that app is running
  new Notification({
    title: 'Prompt Enhancer',
    body: `Running in background. Press ${settingsManager.get('shortcut')} to enhance, ${settingsManager.get('customShortcut')} for custom instructions.`,
  }).show();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
  if (process.platform !== 'darwin') {
    // On Windows/Linux, we keep running
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  hotkeyHandler.unregisterAll();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, show our window
    showWindow();
  });
}
