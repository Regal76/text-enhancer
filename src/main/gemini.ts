import { GoogleGenerativeAI } from '@google/generative-ai';
import settingsManager from './settings';

class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private currentApiKey: string = '';

  private getClient(): GoogleGenerativeAI {
    const apiKey = settingsManager.get('geminiApiKey');

    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set your API key in settings.');
    }

    if (!this.client || this.currentApiKey !== apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.currentApiKey = apiKey;
    }

    return this.client;
  }

  async enhanceText(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided to enhance.');
    }

    const client = this.getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const promptTemplate = settingsManager.get('prompt');
    const fullPrompt = promptTemplate.replace('{text}', text);

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const enhancedText = response.text();

      if (!enhancedText) {
        throw new Error('Empty response from Gemini API.');
      }

      console.log('\n=== Gemini API Request Successful ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Model:', 'gemini-2.5-flash-lite');
      console.log('Input Text:', text);
      console.log('Response:', enhancedText);
      console.log('=====================================\n');

      return enhancedText.trim();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API key. Please check your settings.');
        }
        if (error.message.includes('RATE_LIMIT')) {
          throw new Error('Rate limit exceeded. Please wait and try again.');
        }
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling Gemini API.');
    }
  }

  async enhanceTextWithCustomPrompt(text: string, customInstruction: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided to enhance.');
    }
    if (!customInstruction || customInstruction.trim().length === 0) {
      throw new Error('No instruction provided.');
    }

    const client = this.getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const fullPrompt = `Apply the following instruction to the text below. Return ONLY the modified text, no explanations.\n\nInstruction: ${customInstruction}\n\nText:\n${text}`;

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const enhancedText = response.text();

      if (!enhancedText) {
        throw new Error('Empty response from Gemini API.');
      }

      console.log('\n=== Gemini Custom Prompt Request ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Instruction:', customInstruction);
      console.log('Input Text:', text);
      console.log('Response:', enhancedText);
      console.log('====================================\n');

      return enhancedText.trim();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API key. Please check your settings.');
        }
        if (error.message.includes('RATE_LIMIT')) {
          throw new Error('Rate limit exceeded. Please wait and try again.');
        }
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling Gemini API.');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      await model.generateContent('Say "OK" if you can read this.');
      console.log('[Gemini API] Connection test successful');
      return true;
    } catch {
      return false;
    }
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
