import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getSettings: () => Promise<{
    shortcut: string;
    customShortcut: string;
    geminiApiKey: string;
    prompt: string;
    enableNotifications: boolean;
    startAtLogin: boolean;
  }>;
  saveSettings: (settings: {
    shortcut?: string;
    customShortcut?: string;
    geminiApiKey?: string;
    prompt?: string;
    enableNotifications?: boolean;
    startAtLogin?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  testApiKey: () => Promise<{ success: boolean; error?: string }>;
  resetSettings: () => Promise<void>;
  closeWindow: () => void;
  minimizeToTray: () => void;
  submitCustomPrompt: (instruction: string) => void;
  cancelCustomPrompt: () => void;
  onResetDialog: (callback: () => void) => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('save-settings', settings),
  testApiKey: () => ipcRenderer.invoke('test-api-key'),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  submitCustomPrompt: (instruction: string) => ipcRenderer.send('submit-custom-prompt', instruction),
  cancelCustomPrompt: () => ipcRenderer.send('cancel-custom-prompt'),
  onResetDialog: (callback: () => void) => {
    // Remove previous listener for this specific channel to avoid duplicates
    const channel = 'reset-dialog';
    // Only remove listeners that were added by this preload
    const existingListeners = ipcRenderer.listeners(channel) as ((event: Electron.IpcRendererEvent, ...args: any[]) => void)[];
    existingListeners.forEach((listener) => {
      ipcRenderer.removeListener(channel, listener);
    });
    ipcRenderer.on(channel, (_event: Electron.IpcRendererEvent) => callback());
  },
} as ElectronAPI);
