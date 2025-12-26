
import { GoogleGenerativeAI } from "@google/generative-ai";

// We need to access the API key safely.
const API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize GenAI
const genAI = new GoogleGenerativeAI(API_KEY);

export async function summarizeText(text: string): Promise<string> {
  if (!text) return "";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Summarize the following text concisely for audio reading. Keep it engaging but brief:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Summarization failed:", error);
    return "Could not generate summary.";
  }
}

export async function generateSpeech(text: string): Promise<void> {
    // Placeholder if we ever need it.
    // Currently using window.speechSynthesis in App.tsx
    return;
}
