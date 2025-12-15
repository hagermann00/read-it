import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData } from "./audioUtils";

// --- Safety & Rate Limiting System ---

class SafetySystem {
  private requestTimestamps: number[] = [];
  private consecutiveErrors: number = 0;
  private circuitOpenUntil: number = 0;
  
  // Configuration
  private readonly MAX_RPM = 60; // Max requests per minute
  private readonly ERROR_THRESHOLD = 3; // Consecutive errors before circuit trip
  private readonly COOL_DOWN_MS = 30000; // 30 seconds cool down

  checkLimits() {
    const now = Date.now();

    // 1. Check Circuit Breaker
    if (this.circuitOpenUntil > now) {
      const remaining = Math.ceil((this.circuitOpenUntil - now) / 1000);
      throw new Error(`Safety Halt: Too many errors. Cool down for ${remaining}s.`);
    }

    // 2. Check Rate Limit (Sliding Window)
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    if (this.requestTimestamps.length >= this.MAX_RPM) {
      throw new Error("Safety Halt: API Rate limit exceeded. Slow down.");
    }

    this.requestTimestamps.push(now);
  }

  reportError() {
    this.consecutiveErrors++;
    if (this.consecutiveErrors >= this.ERROR_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + this.COOL_DOWN_MS;
      console.warn("Safety System: Circuit Breaker Tripped.");
    }
  }

  reportSuccess() {
    this.consecutiveErrors = 0;
  }
}

const safety = new SafetySystem();
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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