// Renderer script for settings UI

(() => {

  interface ElectronAPI {
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
  }

  // Access the Electron API exposed by preload script
  const appAPI = (window as unknown as { electronAPI: ElectronAPI }).electronAPI;

  class SettingsUI {
    private apiKeyInput: HTMLInputElement;
    private shortcutInput: HTMLInputElement;
    private customShortcutInput: HTMLInputElement;
    private promptTextarea: HTMLTextAreaElement;
    private notificationsCheckbox: HTMLInputElement;
    private startAtLoginCheckbox: HTMLInputElement;
    private toast: HTMLElement;
    private toastMessage: HTMLElement;
    private isRecordingShortcut: boolean = false;
    private activeRecordingTarget: 'shortcut' | 'customShortcut' | null = null;
    private recordedKeys: Set<string> = new Set();
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
      this.apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
      this.shortcutInput = document.getElementById('shortcut') as HTMLInputElement;
      this.customShortcutInput = document.getElementById('customShortcut') as HTMLInputElement;
      this.promptTextarea = document.getElementById('prompt') as HTMLTextAreaElement;
      this.notificationsCheckbox = document.getElementById('enableNotifications') as HTMLInputElement;
      this.startAtLoginCheckbox = document.getElementById('startAtLogin') as HTMLInputElement;
      this.toast = document.getElementById('toast') as HTMLElement;
      this.toastMessage = document.getElementById('toastMessage') as HTMLElement;

      this.init();
    }

    private async init(): Promise<void> {
      // Setup event listeners first so UI is responsive even if settings fail to load
      this.setupEventListeners();

      // Check if appAPI is available
      if (!appAPI) {
        console.error('CRITICAL: electronAPI is not available. Preload failed or contextIsolation issue.');
        this.showToast('Error: System bridge failed', 'error');
        // Retry or manual fallback?
        return;
      }

      console.log('SettingsUI: electronAPI available');

      await this.loadSettings();
    }

    private async loadSettings(): Promise<void> {
      try {
        const settings = await appAPI.getSettings();
        this.apiKeyInput.value = settings.geminiApiKey;
        this.shortcutInput.value = this.formatShortcut(settings.shortcut);
        this.shortcutInput.dataset.value = settings.shortcut;
        this.customShortcutInput.value = this.formatShortcut(settings.customShortcut);
        this.customShortcutInput.dataset.value = settings.customShortcut;
        this.promptTextarea.value = settings.prompt;
        this.notificationsCheckbox.checked = settings.enableNotifications;
        this.startAtLoginCheckbox.checked = settings.startAtLogin;
      } catch (error) {
        console.error('Failed to load settings:', error);
        this.showToast('Failed to load settings - using defaults', 'error');
        
        // Apply default values so the form isn't left empty/unusable
        this.applyDefaultSettings();
      }
    }

    private applyDefaultSettings(): void {
      // Default settings matching the main process defaults
      const defaults = {
        geminiApiKey: '',
        shortcut: 'Ctrl+Shift+E',
        customShortcut: 'Ctrl+Shift+D',
        prompt: 'Enhance the following text to be more professional, clear, and well-written while preserving the original meaning and intent:\n\n{text}',
        enableNotifications: true,
        startAtLogin: false,
      };

      this.apiKeyInput.value = defaults.geminiApiKey;
      this.shortcutInput.value = this.formatShortcut(defaults.shortcut);
      this.shortcutInput.dataset.value = defaults.shortcut;
      this.customShortcutInput.value = this.formatShortcut(defaults.customShortcut);
      this.customShortcutInput.dataset.value = defaults.customShortcut;
      this.promptTextarea.value = defaults.prompt;
      this.notificationsCheckbox.checked = defaults.enableNotifications;
      this.startAtLoginCheckbox.checked = defaults.startAtLogin;
      
      console.log('Applied default settings due to load failure');
    }

    private setupEventListeners(): void {
      // Window controls
      document.getElementById('closeBtn')?.addEventListener('click', () => {
        appAPI?.closeWindow();
      });

      document.getElementById('minimizeBtn')?.addEventListener('click', () => {
        appAPI?.minimizeToTray();
      });

      // API Key toggle visibility
      document.getElementById('toggleApiKey')?.addEventListener('click', () => {
        const type = this.apiKeyInput.type === 'password' ? 'text' : 'password';
        this.apiKeyInput.type = type;
      });

      // Auto-save on input changes
      this.apiKeyInput.addEventListener('input', () => this.debouncedSave());
      this.promptTextarea.addEventListener('input', () => this.debouncedSave());
      this.notificationsCheckbox.addEventListener('change', () => this.debouncedSave());
      this.startAtLoginCheckbox.addEventListener('change', () => this.debouncedSave());

      // Shortcut recording
      document.getElementById('recordShortcut')?.addEventListener('click', () => {
        this.toggleShortcutRecording('shortcut');
      });

      // Custom shortcut recording
      document.getElementById('recordCustomShortcut')?.addEventListener('click', () => {
        this.toggleShortcutRecording('customShortcut');
      });

      // Keyboard listener for shortcut recording
      document.addEventListener('keydown', (e) => this.handleKeyDown(e));
      document.addEventListener('keyup', (e) => this.handleKeyUp(e));

      // Title bar is already set to drag in CSS via -webkit-app-region
    }

    private formatShortcut(shortcut: string): string {
      // Convert Electron accelerator format to display format
      return shortcut
        .replace(/\+/g, ' + ')
        .replace('Super', 'Win')
        .replace('CommandOrControl', 'Ctrl')
        .replace('CmdOrCtrl', 'Ctrl');
    }

    private parseShortcut(keys: Set<string>): string {
      // Convert recorded keys to Electron accelerator format
      const modifiers: string[] = [];
      let mainKey = '';

      keys.forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'control' || lowerKey === 'ctrl') {
          modifiers.push('Ctrl');
        } else if (lowerKey === 'shift') {
          modifiers.push('Shift');
        } else if (lowerKey === 'alt') {
          modifiers.push('Alt');
        } else if (lowerKey === 'meta' || lowerKey === 'win' || lowerKey === 'super') {
          modifiers.push('Super');
        } else {
          mainKey = key.length === 1 ? key.toUpperCase() : key;
        }
      });

      if (mainKey && modifiers.length > 0) {
        return [...modifiers, mainKey].join('+');
      }

      return '';
    }

    private toggleShortcutRecording(target: 'shortcut' | 'customShortcut'): void {
      if (this.isRecordingShortcut && this.activeRecordingTarget === target) {
        this.stopRecording();
      } else {
        // If recording another target, stop that first
        if (this.isRecordingShortcut) {
          this.stopRecording();
        }
        this.startRecording(target);
      }
    }

    private startRecording(target: 'shortcut' | 'customShortcut'): void {
      this.isRecordingShortcut = true;
      this.activeRecordingTarget = target;
      this.recordedKeys.clear();

      const inputEl = target === 'shortcut' ? this.shortcutInput : this.customShortcutInput;
      const btnId = target === 'shortcut' ? 'recordShortcut' : 'recordCustomShortcut';

      inputEl.value = 'Press keys...';
      inputEl.classList.add('recording');
      document.getElementById(btnId)?.classList.add('recording');
    }

    private stopRecording(): void {
      if (!this.activeRecordingTarget) return;

      const target = this.activeRecordingTarget;
      const inputEl = target === 'shortcut' ? this.shortcutInput : this.customShortcutInput;
      const btnId = target === 'shortcut' ? 'recordShortcut' : 'recordCustomShortcut';

      this.isRecordingShortcut = false;
      inputEl.classList.remove('recording');
      document.getElementById(btnId)?.classList.remove('recording');

      const shortcut = this.parseShortcut(this.recordedKeys);
      if (shortcut) {
        inputEl.value = this.formatShortcut(shortcut);
        inputEl.dataset.value = shortcut;
        this.debouncedSave();
      } else {
        inputEl.value = this.formatShortcut(inputEl.dataset.value || '');
      }

      this.recordedKeys.clear();
      this.activeRecordingTarget = null;
    }

    private handleKeyDown(e: KeyboardEvent): void {
      if (!this.isRecordingShortcut) return;

      e.preventDefault();
      e.stopPropagation();

      // Build shortcut from current keydown event
      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');
      if (e.metaKey) modifiers.push('Super');

      // Get the main key (ignore modifier-only presses)
      const key = e.key;
      const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(key);

      if (!isModifierOnly && modifiers.length > 0) {
        // We have a valid shortcut!
        const mainKey = key.length === 1 ? key.toUpperCase() : key;
        const shortcut = [...modifiers, mainKey].join('+');

        const inputEl = this.activeRecordingTarget === 'customShortcut' ? this.customShortcutInput : this.shortcutInput;
        const btnId = this.activeRecordingTarget === 'customShortcut' ? 'recordCustomShortcut' : 'recordShortcut';

        inputEl.value = this.formatShortcut(shortcut);
        inputEl.dataset.value = shortcut;
        this.isRecordingShortcut = false;
        this.activeRecordingTarget = null;
        inputEl.classList.remove('recording');
        document.getElementById(btnId)?.classList.remove('recording');
        this.debouncedSave();
      } else {
        // Show current modifiers
        const display = modifiers.length > 0 ? modifiers.join(' + ') + ' + ...' : 'Press keys...';
        this.shortcutInput.value = display;
      }
    }

    private handleKeyUp(e: KeyboardEvent): void {
      // Not needed with new approach, but keep for cleanup
      if (!this.isRecordingShortcut) return;
      e.preventDefault();
      e.stopPropagation();
    }

    private updateShortcutDisplay(): void {
      const keys = Array.from(this.recordedKeys).map((key) => {
        if (key === 'Control') return 'Ctrl';
        if (key === 'Meta') return 'Win';
        return key;
      });

      this.shortcutInput.value = keys.join(' + ') || 'Press keys...';
    }

    private debouncedSave(): void {
      // Cancel previous timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      // Save after 500ms of no changes
      this.saveTimeout = setTimeout(() => this.autoSave(), 500);
    }

    private async autoSave(): Promise<void> {
      if (!appAPI) return;

      try {
        const result = await appAPI.saveSettings({
          geminiApiKey: this.apiKeyInput.value,
          shortcut: this.shortcutInput.dataset.value || 'Ctrl+Shift+E',
          customShortcut: this.customShortcutInput.dataset.value || 'Ctrl+Shift+D',
          prompt: this.promptTextarea.value,
          enableNotifications: this.notificationsCheckbox.checked,
          startAtLogin: this.startAtLoginCheckbox.checked,
        });

        if (result.success) {
          this.showToast('Settings saved', 'success');
        } else {
          this.showToast(result.error || 'Failed to save', 'error');
        }
      } catch (error) {
        this.showToast('Failed to save settings', 'error');
      }
    }

    private showToast(message: string, type: 'success' | 'error' = 'success'): void {
      this.toastMessage.textContent = message;
      this.toast.className = `toast ${type} show`;

      setTimeout(() => {
        this.toast.className = 'toast';
      }, 2000);
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    new SettingsUI();
  });

})();
