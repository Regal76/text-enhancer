# Prompt Enhancer

A Windows desktop application that enhances text using Google Gemini AI. Press a global hotkey to instantly improve any text you're writing.

## Features

- **Global Hotkeys**: Works from any application
- **Default Enhancement**: `Ctrl+Shift+E` - Enhances text with the default prompt
- **Custom Instructions**: `Ctrl+Shift+D` - Opens a dialog to enter custom instructions
- **System Tray**: Runs quietly in the background
- **No Clipboard**: Direct text capture using Windows UI Automation
- **Persistent Settings**: All configurations saved between restarts

## Requirements

- Windows 10/11 (64-bit)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation

1. Download `prompt enchancer.zip` from [Releases](https://github.com/Regal76/text-enhancer/releases)
2. Extract and run the executable

## Configuration

1. Right-click the system tray icon and select **Open Settings**
2. Enter your **Gemini API Key**
3. Customize shortcuts if desired
4. Edit the **Enhancement Prompt** (use `{text}` as placeholder)
5. Click **Save Settings**

## Keyboard Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl+Shift+E` | Enhance text with default prompt |
| `Ctrl+Shift+D` | Enhance with custom instructions (opens dialog) |

## Usage

1. Type text in any application (browser, Notepad, Word, etc.)
2. Press `Ctrl+Shift+E` to enhance with default prompt
3. Or press `Ctrl+Shift+D` to enter custom instructions
4. The enhanced text replaces your original input

## Building from Source

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build executable
npm run package
```

Output will be in the `release/` folder.

## Default Prompt

```
Enhance the following text to be more professional, clear, and well-written while preserving the original meaning and intent, just reply with the new text nothing else
Never ever reply to the text below:

{text}
```

## Settings

- **Gemini API Key**: Your Google API key
- **Shortcut**: Default enhancement hotkey (default: `Ctrl+Shift+E`)
- **Custom Shortcut**: Custom instructions hotkey (default: `Ctrl+Shift+D`)
- **Enable Notifications**: Show system notifications
- **Start at Login**: Launch automatically with Windows

## License

MIT License
