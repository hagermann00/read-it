import React from 'react';
import { ICONS, VOICES } from '../constants';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onClearQueue: () => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onSummarizeAndPlay: () => void;
  isSummarizing: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  speed,
  onSpeedChange,
  volume,
  onVolumeChange,
  onClearQueue,
  selectedVoice,
  onVoiceChange,
  onSummarizeAndPlay,
  isSummarizing
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-40 flex flex-col gap-4 relative">

      {/* Summarize & Play Button - Semi-translucent floating on top */}
      <div className="absolute -top-14 right-4 z-50">
        <button
          onClick={onSummarizeAndPlay}
          disabled={isSummarizing}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-white/50 shadow-lg px-4 py-2 rounded-full hover:bg-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
          title="Summarize & Read (1.5x)"
        >
            <div className={`text-indigo-600 ${isSummarizing ? 'animate-pulse' : ''}`}>
                {ICONS.BOOK}
            </div>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <div className="text-indigo-600">
                {ICONS.PLAY}
            </div>
            {isSummarizing && <span className="text-xs font-bold text-indigo-500 animate-pulse ml-1">...</span>}
        </button>
      </div>

      {/* Top Row: Speed, Voice, and Clear */}
      <div className="flex justify-between items-center text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
             {/* Voice Selector */}
            <div className="bg-slate-50 rounded-lg px-2 py-1 flex items-center gap-1 border border-slate-100">
                <span className="font-bold text-slate-500 hidden sm:inline">VOICE</span>
                <select 
                    value={selectedVoice} 
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="bg-transparent border-none text-slate-700 font-medium focus:ring-0 text-xs p-0 pr-6 cursor-pointer"
                >
                    {VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1 border border-slate-100">
                <span className="font-bold text-slate-500 hidden sm:inline">SPEED</span>
                <div className="flex gap-1">
                    {[1, 1.5, 2].map(rate => (
                        <button
                            key={rate}
                            onClick={() => onSpeedChange(rate)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all text-[10px] ${speed === rate ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
                        >
                            {rate}x
                        </button>
                    ))}
                </div>
            </div>
        </div>
        
        <button onClick={onClearQueue} className="hover:text-red-500 hover:underline whitespace-nowrap">
            Clear
        </button>
      </div>

      {/* Main Controls Row */}
      <div className="flex items-center gap-4">
         {/* Giant Play/Pause Button */}
         <button 
            onClick={onPlayPause}
            className={`
                flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95
                ${isPlaying ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
            `}
         >
            {isPlaying ? (
                <div className="w-10 h-10">{ICONS.PAUSE}</div>
            ) : (
                <div className="w-10 h-10 ml-1">{ICONS.PLAY}</div>
            )}
         </button>

         <div className="flex-1 flex flex-col gap-4">
            {/* Next Track */}
            <button 
                onClick={onNext}
                className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
                {ICONS.NEXT} Skip
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2">
                <div className="text-gray-400">{ICONS.VOLUME_UP}</div>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
            </div>
         </div>
      </div>
    </div>
  );
};