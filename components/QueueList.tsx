import React from 'react';
import { QueueItem, PlaybackType } from '../types';
import { ICONS } from '../constants';

interface QueueListProps {
  items: QueueItem[];
  currentId: string | null;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onPlayNow: (id: string) => void;
  onSave: (item: QueueItem) => void;
}

export const QueueList: React.FC<QueueListProps> = ({ 
  items, 
  currentId, 
  onRemove, 
  onMoveUp, 
  onMoveDown,
  onPlayNow,
  onSave
}) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm italic">
        <div className="mb-2 text-gray-300 p-3 bg-gray-50 rounded-full">{ICONS.SPEAKER}</div>
        <p>Your queue is empty.</p>
        <p className="text-xs mt-1 max-w-[200px] text-center">Highlight text to add to queue. Verbatim mode starts instantly.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 pb-48">
      {items.map((item, index) => {
        const isPlaying = item.id === currentId;
        const isSummary = item.type === PlaybackType.SUMMARY;
        // Calculate buffer progress: how many segments are loaded?
        const segmentsLoaded = item.segments ? item.segments.filter(s => s.buffer).length : 0;
        const totalSegments = item.segments ? item.segments.length : 0;
        const progress = totalSegments > 0 ? (segmentsLoaded / totalSegments) * 100 : 0;
        
        return (
          <li 
            key={item.id} 
            className={`
              relative group flex flex-col p-3 rounded-lg border transition-all duration-200
              ${isPlaying ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}
            `}
          >
            <div className="flex justify-between items-start w-full">
              <div 
                className="flex-1 cursor-pointer mr-2"
                onClick={() => onPlayNow(item.id)}
              >
                {/* Header Badge */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${isSummary ? 'bg-purple-500' : 'bg-blue-600'}`}>
                        {isSummary ? ICONS.SPARKLE : ICONS.DOCUMENT}
                        <span>{isSummary ? 'Summary' : 'Verbatim'}</span>
                    </div>
                    {item.isLoading && (
                        <span className="text-xs text-amber-600 font-medium animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                            {isSummary ? 'Thinking...' : `Buffering ${Math.round(progress)}%`}
                        </span>
                    )}
                    {item.error && <span className="text-xs text-red-500 font-bold">Error</span>}
                </div>

                {/* Text Content */}
                <p className={`text-sm leading-snug transition-all ${isPlaying ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>
                  <span className={isPlaying ? "" : "line-clamp-3"}>
                    {item.displayText}
                  </span>
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors" title="Remove">
                  {ICONS.TRASH}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onSave(item); }} className="p-1 hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 rounded transition-colors" title="Save to Knowledge Base">
                  {ICONS.SAVE}
                </button>
              </div>
            </div>
            {isPlaying && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-lg"></div>
            )}
          </li>
        );
      })}
    </ul>
  );
};