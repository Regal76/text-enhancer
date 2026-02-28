import { globalShortcut, Notification, BrowserWindow, ipcMain, app } from 'electron';
import * as path from 'path';
import settingsManager from './settings';
import textCaptureService from './textCapture';
import geminiClient from './gemini';

type HotkeyCallback = () => void;

class HotkeyHandler {
  private currentShortcut: string = '';
  private currentCustomShortcut: string = '';
  private isProcessing: boolean = false;
  private isCustomProcessing: boolean = false;
  private isSubmittingCustom: boolean = false;
  private callback: HotkeyCallback | null = null;
  private promptWindow: BrowserWindow | null = null;
  private capturedTextForCustom: string = '';
  private isPromptWindowReady: boolean = false;

  register(callback?: HotkeyCallback): boolean {
    const shortcut = settingsManager.get('shortcut');

    // Unregister previous shortcut if exists
    if (this.currentShortcut) {
      try { globalShortcut.unregister(this.currentShortcut); } catch { }
    }

    try {
      const success = globalShortcut.register(shortcut, () => {
        this.onHotkeyPressed();
        if (callback) callback();
      });

      if (success) {
        this.currentShortcut = shortcut;
        this.callback = callback || null;
        console.log(`Hotkey registered: ${shortcut}`);
      } else {
        console.error(`Failed to register hotkey: ${shortcut}`);
        return false;
      }
    } catch (error) {
      console.error(`Error registering hotkey: ${error}`);
      return false;
    }

    // Also register the custom shortcut
    this.registerCustomShortcut();

    return true;
  }

  registerCustomShortcut(): boolean {
    const customShortcut = settingsManager.get('customShortcut');

    // Unregister previous custom shortcut if exists
    if (this.currentCustomShortcut) {
      try { globalShortcut.unregister(this.currentCustomShortcut); } catch { }
    }

    try {
      const success = globalShortcut.register(customShortcut, () => {
        this.onCustomHotkeyPressed();
      });

      if (success) {
        this.currentCustomShortcut = customShortcut;
        console.log(`Custom hotkey registered: ${customShortcut}`);
        return true;
      } else {
        console.error(`Failed to register custom hotkey: ${customShortcut}`);
        return false;
      }
    } catch (error) {
      console.error(`Error registering custom hotkey: ${error}`);
      return false;
    }
  }

  unregister(): void {
    if (this.currentShortcut) {
      try { globalShortcut.unregister(this.currentShortcut); } catch { }
      this.currentShortcut = '';
    }
    if (this.currentCustomShortcut) {
      try { globalShortcut.unregister(this.currentCustomShortcut); } catch { }
      this.currentCustomShortcut = '';
    }
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.currentShortcut = '';
    this.currentCustomShortcut = '';
  }

  updateShortcut(newShortcut: string): boolean {
    const oldShortcut = this.currentShortcut;
    settingsManager.set('shortcut', newShortcut);

    if (this.register(this.callback || undefined)) {
      return true;
    }

    settingsManager.set('shortcut', oldShortcut);
    this.register(this.callback || undefined);
    return false;
  }

  isRegistered(): boolean {
    return this.currentShortcut !== '' && globalShortcut.isRegistered(this.currentShortcut);
  }

  getCurrentShortcut(): string {
    return this.currentShortcut;
  }

  getCurrentCustomShortcut(): string {
    return this.currentCustomShortcut;
  }

  private async onHotkeyPressed(): Promise<void> {
    if (this.isProcessing) {
      console.log('Already processing, ignoring hotkey');
      return;
    }

    this.isProcessing = true;

    try {
      const showNotifications = settingsManager.get('enableNotifications');

      const apiKey = settingsManager.get('geminiApiKey');
      if (!apiKey) {
        if (showNotifications) {
          new Notification({
            title: 'Prompt Enhancer',
            body: 'Please configure your Gemini API key in settings.',
          }).show();
        }
        this.isProcessing = false;
        return;
      }

      if (showNotifications) {
        new Notification({
          title: 'Prompt Enhancer',
          body: 'Enhancing text...',
          silent: true,
        }).show();
      }

      const result = await textCaptureService.captureAndReplace(async (text) => {
        return await geminiClient.enhanceText(text);
      });

      if (result.success) {
        if (showNotifications) {
          new Notification({
            title: 'Prompt Enhancer',
            body: 'Text enhanced successfully!',
          }).show();
        }
      } else {
        if (showNotifications) {
          new Notification({
            title: 'Prompt Enhancer',
            body: result.error || 'Failed to enhance text',
          }).show();
        }
        console.error('Enhancement failed:', result.error);
      }
    } catch (error) {
      const showNotifications = settingsManager.get('enableNotifications');
      if (showNotifications) {
        new Notification({
          title: 'Prompt Enhancer',
          body: error instanceof Error ? error.message : 'An error occurred',
        }).show();
      }
      console.error('Hotkey handler error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async onCustomHotkeyPressed(): Promise<void> {
    if (this.isCustomProcessing) {
      console.log('Already processing custom, ignoring hotkey');
      return;
    }

    this.isCustomProcessing = true;
    const showNotifications = settingsManager.get('enableNotifications');

    try {
      const apiKey = settingsManager.get('geminiApiKey');
      if (!apiKey) {
        if (showNotifications) {
          new Notification({
            title: 'Prompt Enhancer',
            body: 'Please configure your Gemini API key in settings.',
          }).show();
        }
        this.isCustomProcessing = false;
        return;
      }

      // Step 1: Capture the text first
      await new Promise(resolve => setTimeout(resolve, 100));
      let capturedText: string;
      try {
        capturedText = await textCaptureService.getTextFromFocusedElement();
      } catch (error) {
        if (showNotifications) {
          new Notification({
            title: 'Prompt Enhancer',
            body: error instanceof Error ? error.message : 'Failed to capture text',
          }).show();
        }
        this.isCustomProcessing = false;
        return;
      }

      if (!capturedText || capturedText.trim().length === 0) {
        if (showNotifications) {
          new Notification({
            title: 'Prompt Enhancer',
            body: 'No text found to enhance.',
          }).show();
        }
        this.isCustomProcessing = false;
        return;
      }

      this.capturedTextForCustom = capturedText;

      // Step 2: Show the prompt dialog (async to ensure window is ready)
      await this.showPromptDialog();

    } catch (error) {
      if (showNotifications) {
        new Notification({
          title: 'Prompt Enhancer',
          body: error instanceof Error ? error.message : 'An error occurred',
        }).show();
      }
      console.error('Custom hotkey handler error:', error);
      this.isCustomProcessing = false;
    }
  }

  private async showPromptDialog(): Promise<void> {
    // Ensure window is created and ready
    await this.ensurePromptWindowReady();

    if (!this.promptWindow || this.promptWindow.isDestroyed()) return;

    // FIX: Force reset window bounds to prevent sizing glitches
    // This ensures the window always opens at the correct size
    this.promptWindow.setBounds({
      x: Math.round(this.promptWindow.getBounds().x),
      y: Math.round(this.promptWindow.getBounds().y),
      width: 480,
      height: 250,
    }, false);

    // Reset input via IPC
    this.promptWindow.webContents.send('reset-dialog');

    // FIX: Simplified, more reliable show sequence
    // Use center() to ensure consistent positioning and avoid DPI issues
    this.promptWindow.center();
    
    // Show the window
    this.promptWindow.show();
    this.promptWindow.setAlwaysOnTop(true, 'pop-up-menu');
    this.promptWindow.focus();
  }

  closePromptDialog(): void {
    if (this.promptWindow && !this.promptWindow.isDestroyed()) {
      // On Windows, minimizing before hiding forces the OS to restore focus 
      // to the previously active application (the text editor) instead of dropping it.
      // We minimize first, hide, then restore bounds for next show.
      if (process.platform === 'win32') {
        this.promptWindow.minimize();
      }
      this.promptWindow.hide();
      // Restore correct bounds after hide to prevent sizing glitches on next show
      this.promptWindow.setBounds({
        width: 480,
        height: 250,
      }, false);
    }
  }

  cancelCustomPromptFlow(): void {
    this.closePromptDialog();
    this.capturedTextForCustom = '';
    this.isCustomProcessing = false;
    this.isSubmittingCustom = false;
  }

  // Recreate the prompt window if it was destroyed or has sizing issues
  recreatePromptWindow(): void {
    if (this.promptWindow && !this.promptWindow.isDestroyed()) {
      this.promptWindow.destroy();
    }
    this.promptWindow = null;
    this.isPromptWindowReady = false;
    this.createPromptWindow();
  }

  async handleCustomPromptSubmit(instruction: string): Promise<void> {
    this.isSubmittingCustom = true;
    const showNotifications = settingsManager.get('enableNotifications');

    // Close dialog immediately
    this.closePromptDialog();

    // Crucial: Wait a moment for Windows to restore focus to the previously active application
    // before we try to paste the text back.
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (showNotifications) {
        new Notification({
          title: 'Prompt Enhancer',
          body: `Applying: "${instruction}"...`,
          silent: true,
        }).show();
      }

      const enhancedText = await geminiClient.enhanceTextWithCustomPrompt(
        this.capturedTextForCustom,
        instruction
      );

      await textCaptureService.setTextToFocusedElement(enhancedText);

      if (showNotifications) {
        new Notification({
          title: 'Prompt Enhancer',
          body: 'Text enhanced with custom instruction!',
        }).show();
      }
    } catch (error) {
      if (showNotifications) {
        new Notification({
          title: 'Prompt Enhancer',
          body: error instanceof Error ? error.message : 'Failed to enhance text',
        }).show();
      }
      console.error('Custom enhancement error:', error);
    } finally {
      this.capturedTextForCustom = '';
      this.isCustomProcessing = false;
      this.isSubmittingCustom = false;
    }
  }

  setupCustomPromptIPC(): void {
    ipcMain.on('submit-custom-prompt', async (_event, instruction: string) => {
      await this.handleCustomPromptSubmit(instruction);
    });

    ipcMain.on('cancel-custom-prompt', () => {
      this.cancelCustomPromptFlow();
    });
  }

  // Pre-create the prompt window at startup for instant showing
  createPromptWindow(): void {
    if (this.promptWindow) return;

    this.promptWindow = new BrowserWindow({
      width: 480,
      height: 250,
      minWidth: 480,
      minHeight: 250,
      maxWidth: 480,
      maxHeight: 250,
      useContentSize: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      // Prevent DPI/scaling issues
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        // Disable zoom to prevent accidental size changes
        zoomFactor: 1.0,
      },
    });

    this.promptWindow.loadFile(path.join(__dirname, '..', 'renderer', 'prompt-dialog.html'));

    // Mark as ready when loaded
    this.promptWindow.webContents.on('did-finish-load', () => {
      this.isPromptWindowReady = true;
    });

    this.promptWindow.on('blur', () => {
      if (!this.isSubmittingCustom) {
        this.cancelCustomPromptFlow();
      }
    });

    this.promptWindow.on('closed', () => {
      this.promptWindow = null;
      this.isPromptWindowReady = false;
      if (this.isCustomProcessing) {
        this.isCustomProcessing = false;
      }
    });
  }

  // Ensure window is ready before showing (call this at app startup)
  async ensurePromptWindowReady(): Promise<void> {
    if (this.isPromptWindowReady && this.promptWindow) {
      return;
    }

    if (!this.promptWindow) {
      this.createPromptWindow();
    }

    // Wait for the window to be ready
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isPromptWindowReady) {
          resolve();
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });
  }
}

export const hotkeyHandler = new HotkeyHandler();
export default hotkeyHandler;
