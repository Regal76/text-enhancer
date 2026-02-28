# Prompt Enhancer

A Windows desktop application that enhances text using Google Gemini AI. Press a global hotkey to instantly improve any text you're writing.

## Features

- **Global Hotkey**: Press `Ctrl+Shift+E` (customizable) from any application to enhance text
- **System-Wide**: Works with any text input field across Windows using UI Automation
- **Custom Prompts**: Define your own enhancement prompts
- **Minimal UI**: Clean, Apple-inspired settings interface
- **Background Operation**: Runs quietly in the system tray
- **Persistent Settings**: All configurations saved between restarts
- **No Clipboard**: Text capture without using the clipboard

## Requirements

- Windows 10/11 (64-bit)
- Node.js v18+ (for development only, not required for EXE)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Quick Start

### Option 1: Run from Source

```bash
# Clone the repository
cd "prompt enhancer"

# Install dependencies
npm install

# Build and run
npm start
```

### Option 2: Use Pre-built EXE

After building:
- Run `release/PromptEnhancer-Portable.exe` for portable use
- Or run the installer `release/PromptEnhancer Setup X.X.X.exe`

## Configuration

1. On first run, right-click the system tray icon and select **Open Settings**
2. Enter your **Gemini API Key**
3. Click **Test Connection** to verify
4. Customize the **Keyboard Shortcut** if desired
5. Edit the **Enhancement Prompt** to your preference
6. Click **Save Settings**

### Default Prompt

```
Enhance the following text to be more professional, clear, and well-written while preserving the original meaning and intent:

{text}
```

Use `{text}` as a placeholder for the captured text.

## Usage

1. Type text in any application (browser, Notepad, Word, etc.)
2. Click in the text field to focus it
3. Press `Ctrl+Shift+E` (or your custom shortcut)
4. Wait a moment while Gemini processes the text
5. The enhanced text replaces your original input

## Building from Source

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript only
npm run build
```

### Production Build (EXE)

```bash
# Build and package as Windows EXE
npm run package
```

This creates in the `release/` folder:
- `PromptEnhancer-Portable.exe` - Standalone portable executable
- `PromptEnhancer Setup X.X.X.exe` - Windows installer

### Build Output Structure

```
release/
├── PromptEnhancer-Portable.exe    # Portable EXE (standalone)
├── PromptEnhancer Setup 1.0.0.exe # NSIS installer
└── win-unpacked/                  # Unpacked app directory
```

### Icon Generation (Optional)

To regenerate the app icons:

```powershell
# Generate PNG icon
powershell -ExecutionPolicy Bypass -File scripts/create-icon.ps1

# Generate ICO icon
powershell -ExecutionPolicy Bypass -File scripts/create-ico.ps1
```

## Project Structure

```
prompt-enhancer/
├── src/
│   ├── main/
│   │   ├── index.ts        # Main Electron process
│   │   ├── hotkey.ts       # Global hotkey handler
│   │   ├── textCapture.ts  # Windows UI Automation
│   │   ├── gemini.ts       # Gemini API client
│   │   └── settings.ts     # Settings persistence
│   ├── renderer/
│   │   ├── index.html      # Settings UI
│   │   ├── styles.css      # Apple-like styling
│   │   └── renderer.ts     # UI logic
│   └── preload.ts          # IPC bridge
├── assets/
│   ├── icon.png            # App icon (PNG)
│   └── icon.ico            # App icon (ICO)
├── scripts/
│   ├── create-icon.ps1     # PNG icon generator
│   └── create-ico.ps1      # ICO icon converter
├── package.json
├── tsconfig.json
└── README.md
```

## Technical Details

### Text Capture

The app uses Windows UI Automation API via PowerShell to:
1. Detect the currently focused text element
2. Read text using `ValuePattern` (for most text inputs) or `TextPattern` (for rich text)
3. Write enhanced text back to the element

This approach:
- Works without clipboard manipulation
- Supports most standard Windows text controls
- Works across different applications

### API Integration

Uses the official `@google/generative-ai` package with the `gemini-1.5-flash` model for fast, cost-effective responses.

### Settings Storage

Settings are stored using `electron-store` in:
```
%APPDATA%/prompt-enhancer/settings.json
```

### Architecture

- **Main Process**: Handles global shortcuts, system tray, IPC
- **Renderer Process**: Settings UI with modern, minimal design
- **Text Capture Service**: PowerShell-based UI Automation wrapper
- **Gemini Client**: Async API wrapper with error handling

## Troubleshooting

### Hotkey Not Working

- The shortcut may conflict with another application (Win+E opens File Explorer by default)
- Try a different key combination like `Ctrl+Shift+E` in settings
- Ensure the app is running (check system tray)

### Text Not Captured

- Some applications may not support UI Automation (games, custom controls)
- Ensure the text field is focused before pressing the hotkey
- Try with standard text fields first (Notepad, browser input)

### API Errors

- Verify your API key is correct and has Gemini access
- Check your internet connection
- Ensure you haven't exceeded API rate limits
- Free tier has limited requests per minute

### App Not Starting

- Check if another instance is already running
- Look in Task Manager for "Prompt Enhancer"
- Try running as Administrator

## Keyboard Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl+Shift+E` | Enhance text (default, customizable) |

## Security Notes

- API keys are stored locally in your user profile
- No data is sent anywhere except to Google's Gemini API
- Text is processed and replaced locally

## License

MIT License

## Credits

- Built with [Electron](https://www.electronjs.org/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Settings storage via [electron-store](https://github.com/sindresorhus/electron-store)
