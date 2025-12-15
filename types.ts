export enum PlaybackType {
  FULL = 'Verbatim',
  SUMMARY = 'Summary',
}

export interface AudioSegment {
  text: string;
  buffer: AudioBuffer | null;
  isLoading: boolean;
  isPlayed: boolean;
}

export interface QueueItem {
  id: string;
  originalText: string;
  displayText: string;
  type: PlaybackType;
  // Instead of one buffer, we now have segments for streaming large text
  segments: AudioSegment[]; 
  // Flattened duration isn't perfectly known upfront for streams, but we track what we have
  currentDuration: number;
  isLoading: boolean;
  error?: string;
  wordCount: number;
  timestamp: number; // For smart replace logic
}

export interface SavedItem {
  id: string;
  text: string;
  summary?: string;
  date: string;
  tags: string[];
}

export interface SelectionState {
  text: string;
  showMenu: boolean;
  x: number;
  y: number;
}

export interface AudioState {
  isPlaying: boolean;
  volume: number;
  speed: number;
  currentItemId: string | null;
}