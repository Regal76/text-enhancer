import Store from 'electron-store';

export interface AppSettings {
  shortcut: string;
  customShortcut: string;
  geminiApiKey: string;
  prompt: string;
  enableNotifications: boolean;
  startAtLogin: boolean;
}

const defaultSettings: AppSettings = {
  shortcut: 'Ctrl+Shift+E',
  customShortcut: 'Ctrl+Shift+D',
  geminiApiKey: '',
  prompt: 'Enhance the following text to be more professional, clear, and well-written while preserving the original meaning and intent:\n\n{text}',
  enableNotifications: true,
  startAtLogin: false,
};

class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'settings',
      defaults: defaultSettings,
    });
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  getAll(): AppSettings {
    return {
      shortcut: this.store.get('shortcut'),
      customShortcut: this.store.get('customShortcut'),
      geminiApiKey: this.store.get('geminiApiKey'),
      prompt: this.store.get('prompt'),
      enableNotifications: this.store.get('enableNotifications'),
      startAtLogin: this.store.get('startAtLogin'),
    };
  }

  setAll(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        this.store.set(key as keyof AppSettings, value);
      }
    });
  }

  reset(): void {
    this.store.clear();
    Object.entries(defaultSettings).forEach(([key, value]) => {
      this.store.set(key as keyof AppSettings, value);
    });
  }

  getStorePath(): string {
    return this.store.path;
  }
}

export const settingsManager = new SettingsManager();
export default settingsManager;
