import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData } from "./audioUtils";

// --- Multi-API Key Fallback System ---

interface APIKeyConfig {
  key: string;
  label: string;
  consecutiveErrors: number;
  lastErrorTime: number;
}

class SafetySystem {
  private requestTimestamps: number[] = [];
  private currentKeyIndex: number = 0;
  private apiKeys: APIKeyConfig[] = [];
  
  // Configuration
  private readonly MAX_RPM = 60; // Max requests per minute
  private readonly ERROR_THRESHOLD = 3; // Consecutive errors before switching key
  private readonly COOL_DOWN_MS = 30000; // 30 seconds cool down per key

  constructor() {
    // Initialize API keys hierarchy: hagsburner1 (primary) -> backup_1 -> backup_2
    const primaryKey = process.env.API_KEY;
    const backup1 = process.env.API_KEY_BACKUP_1;
    const backup2 = process.env.API_KEY_BACKUP_2;

    if (primaryKey) this.apiKeys.push({ key: primaryKey, label: 'hagsburner1 (primary)', consecutiveErrors: 0, lastErrorTime: 0 });
    if (backup1) this.apiKeys.push({ key: backup1, label: 'brihag (backup 1)', consecutiveErrors: 0, lastErrorTime: 0 });
    if (backup2) this.apiKeys.push({ key: backup2, label: 'hagermann00 (backup 2)', consecutiveErrors: 0, lastErrorTime: 0 });

    if (this.apiKeys.length === 0) {
      throw new Error("No API keys configured. Please set GEMINI_API_KEY in .env.local");
    }

    console.log(`🔑 Loaded ${this.apiKeys.length} API key(s) with intelligent fallback`);
  }

  getCurrentKey(): string {
    const now = Date.now();

    // Try to use primary key first if it's cooled down
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyConfig = this.apiKeys[i];
      const coolDownRemaining = keyConfig.lastErrorTime + this.COOL_DOWN_MS - now;
      
      if (coolDownRemaining <= 0 || keyConfig.consecutiveErrors < this.ERROR_THRESHOLD) {
        if (this.currentKeyIndex !== i) {
          console.log(`🔄 Switching to API key: ${keyConfig.label}`);
          this.currentKeyIndex = i;
        }
        return keyConfig.key;
      }
    }

    // All keys are in cooldown - use least recently errored
    const leastRecentError = this.apiKeys.reduce((prev, curr) => 
      curr.lastErrorTime < prev.lastErrorTime ? curr : prev
    );
    const index = this.apiKeys.indexOf(leastRecentError);
    this.currentKeyIndex = index;
    
    const remaining = Math.ceil((leastRecentError.lastErrorTime + this.COOL_DOWN_MS - now) / 1000);
    console.warn(`⚠️ All API keys in cooldown. Using ${leastRecentError.label} (cooldown: ${remaining}s)`);
    
    return leastRecentError.key;
  }

  checkLimits() {
    const now = Date.now();

    // Check Rate Limit (Sliding Window)
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    if (this.requestTimestamps.length >= this.MAX_RPM) {
      throw new Error("Safety Halt: API Rate limit exceeded. Slow down.");
    }

    this.requestTimestamps.push(now);
  }

  reportError() {
    const currentKey = this.apiKeys[this.currentKeyIndex];
    currentKey.consecutiveErrors++;
    currentKey.lastErrorTime = Date.now();

    if (currentKey.consecutiveErrors >= this.ERROR_THRESHOLD) {
      console.warn(`❌ API key ${currentKey.label} hit error threshold. Switching to backup.`);
    }
  }

  reportSuccess() {
    const currentKey = this.apiKeys[this.currentKeyIndex];
    currentKey.consecutiveErrors = 0;
  }

  getStats() {
    return this.apiKeys.map(k => ({
      label: k.label,
      errors: k.consecutiveErrors,
      status: k.consecutiveErrors >= this.ERROR_THRESHOLD ? 'cooldown' : 'active'
    }));
  }
}

const safety = new SafetySystem();
const getClient = () => new GoogleGenAI({ apiKey: safety.getCurrentKey() });

// --- API Methods ---

export async function summarizeText(text: string): Promise<string> {
  safety.checkLimits();
  
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following text in a concise manner suitable for reading aloud. Keep the key points but remove fluff.\n\nText: ${text}`,
    });
    
    safety.reportSuccess();
    return response.text || "Could not generate summary.";
  } catch (error) {
    safety.reportError();
    throw error;
  }
}

export async function generateSpeech(
  text: string, 
  voice: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  safety.checkLimits();

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    safety.reportSuccess();
    const rawBytes = decodeBase64(base64Audio);
    return await decodeAudioData(rawBytes, audioContext, 24000, 1);
  } catch (error) {
    safety.reportError();
    throw error;
  }
}