// Utility to base64 decode
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Utility to convert raw PCM to AudioBuffer
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Adaptive Chunking:
// 1. First 2 chunks are small (~250 chars) to ensure playback starts immediately (low latency).
// 2. Subsequent chunks are large (~2500 chars) to minimize API calls and maximize efficiency (high throughput).
export function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  // Split by sentence endings primarily to avoid cutting in the middle of a sentence
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  
  let currentChunk = "";
  let chunkIndex = 0;

  for (const sentence of sentences) {
    // Dynamic limit based on how many chunks we've already created
    const charLimit = chunkIndex < 2 ? 250 : 2500;

    if ((currentChunk + sentence).length > charLimit) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        chunkIndex++;
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}