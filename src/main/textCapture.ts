import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { clipboard } from 'electron';

const execAsync = promisify(exec);

// Hardcoded VBScript templates - never modify these dynamically to prevent injection
const VBS_COPY = `
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.SendKeys "^a"
WScript.Sleep 50
WshShell.SendKeys "^c"
`;

const VBS_PASTE = `
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.SendKeys "^v"
`;

class TextCaptureService {
  // Store original clipboard content to restore later
  private originalClipboard: { text: string; html?: string; rtf?: string; bookmark?: string } | null = null;

  private validateTempFilePath(filePath: string): void {
    // Ensure the path is within the temp directory to prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const tempDir = path.resolve(os.tmpdir());
    if (!resolvedPath.startsWith(tempDir)) {
      throw new Error('Invalid temp file path: path traversal detected');
    }
    // Ensure the file has .vbs extension
    if (!resolvedPath.endsWith('.vbs')) {
      throw new Error('Invalid temp file path: must have .vbs extension');
    }
  }

  private async runVBScript(scriptContent: string): Promise<void> {
    // Generate a safe temp file name with random components
    const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const tempFilePath = path.join(os.tmpdir(), `pe-script-${randomSuffix}.vbs`);

    // Validate the generated path
    this.validateTempFilePath(tempFilePath);

    try {
      await fs.promises.writeFile(tempFilePath, scriptContent, { encoding: 'utf8' });

      // Use cscript to execute VBScript without GUI popups. Extremely fast startup.
      // Escape the path properly for command line
      const escapedPath = tempFilePath.replace(/"/g, '""');
      const command = `cscript //Nologo //B "${escapedPath}"`;

      await execAsync(command, {
        timeout: 5000,
        windowsHide: true
      });

    } catch (error: any) {
      throw new Error(`VBScript execution failed: ${error.message}`);
    } finally {
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError);
      }
    }
  }

  private saveClipboard(): void {
    try {
      this.originalClipboard = {
        text: clipboard.readText(),
        html: clipboard.readHTML(),
        rtf: clipboard.readRTF(),
        bookmark: clipboard.readBookmark().title,
      };
    } catch (error) {
      console.error('Failed to save clipboard:', error);
      this.originalClipboard = null;
    }
  }

  private restoreClipboard(): void {
    if (!this.originalClipboard) return;
    
    try {
      // Restore text content
      if (this.originalClipboard.text) {
        clipboard.writeText(this.originalClipboard.text);
      } else if (this.originalClipboard.html) {
        clipboard.writeHTML(this.originalClipboard.html);
      } else if (this.originalClipboard.rtf) {
        clipboard.writeRTF(this.originalClipboard.rtf);
      } else {
        clipboard.clear();
      }
    } catch (error) {
      console.error('Failed to restore clipboard:', error);
    } finally {
      this.originalClipboard = null;
    }
  }

  async getTextFromFocusedElement(): Promise<string> {
    // Save original clipboard content before we modify it
    this.saveClipboard();

    try {
      // Clear clipboard natively via Electron
      clipboard.clear();

      // Run VBScript to send Ctrl+A and Ctrl+C
      await this.runVBScript(VBS_COPY);

      // Wait for the OS to populate the clipboard
      await new Promise(resolve => setTimeout(resolve, 150));

      // Read natively via Electron
      const text = clipboard.readText();

      if (!text || text.trim().length === 0) {
        throw new Error('Clipboard is empty or text could not be copied.');
      }

      return text;
    } catch (error) {
      // Restore clipboard on error
      this.restoreClipboard();
      throw error;
    }
  }

  async setTextToFocusedElement(text: string): Promise<void> {
    try {
      // Set text natively via Electron
      clipboard.writeText(text);

      // Wait a brief moment for clipboard access
      await new Promise(resolve => setTimeout(resolve, 50));

      // Run VBScript to send Ctrl+V
      await this.runVBScript(VBS_PASTE);
    } finally {
      // Always restore original clipboard after paste operation
      // Small delay to ensure paste completes first
      await new Promise(resolve => setTimeout(resolve, 100));
      this.restoreClipboard();
    }
  }

  async captureAndReplace(enhancer: (text: string) => Promise<string>): Promise<{
    success: boolean;
    originalText?: string;
    enhancedText?: string;
    error?: string;
  }> {
    try {
      // Small delay to ensure focus is stable
      await new Promise(resolve => setTimeout(resolve, 100));

      const originalText = await this.getTextFromFocusedElement();

      if (!originalText || originalText.trim().length === 0) {
        // Restore clipboard if no text found
        this.restoreClipboard();
        return {
          success: false,
          error: 'No text found in the focused element',
        };
      }

      const enhancedText = await enhancer(originalText);

      await this.setTextToFocusedElement(enhancedText);

      return {
        success: true,
        originalText,
        enhancedText,
      };
    } catch (error) {
      // Ensure clipboard is restored on any error
      this.restoreClipboard();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const textCaptureService = new TextCaptureService();
export default textCaptureService;
