import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueueItem, SelectionState, PlaybackType, SavedItem, AudioSegment } from './types';
import { ICONS, VOICES } from './constants';
import { summarizeText, generateSpeech } from './services/geminiService';
import { splitTextIntoChunks } from './services/audioUtils';
import { QueueList } from './components/QueueList';
import { PlayerControls } from './components/PlayerControls';

declare var chrome: any;

export default function App() {
  // --- State ---
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('knowledgeBase');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Selection state is now less relevant for context menus, but kept for internal functionality if needed
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'saved'>('queue');

  // --- Audio Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isAudioInitialized = useRef(false);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('knowledgeBase', JSON.stringify(savedItems));
  }, [savedItems]);

  // --- Chrome Extension Listeners ---
  useEffect(() => {
    // 1. Check for pending text in storage (from Context Menu open)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pendingText'], (result: any) => {
        if (result.pendingText) {
          const { text, type, timestamp } = result.pendingText;
          // Avoid re-adding old items (older than 10 seconds)
          if (Date.now() - timestamp < 10000) {
             addToQueue(text, type === 'Verbatim' ? PlaybackType.FULL : PlaybackType.SUMMARY);
          }
          // Clear it
          chrome.storage.local.remove('pendingText');
        }
      });
    }

    // 2. Listen for runtime messages (if panel is already open)
    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.action === "NEW_SELECTION" && message.payload) {
         const { text, type } = message.payload;
         addToQueue(text, type === 'Verbatim' ? PlaybackType.FULL : PlaybackType.SUMMARY);
         setActiveTab('queue');
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, []);

  // --- Audio Engine ---
  const initAudio = () => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;
      
      isAudioInitialized.current = true;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const stopCurrentAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) { /* ignore */ }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playSegment = useCallback((buffer: AudioBuffer) => {
    initAudio();
    const ctx = audioContextRef.current!;
    const gainNode = gainNodeRef.current!;

    if (sourceNodeRef.current) {
       try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackSpeed;
    
    source.connect(gainNode);
    gainNode.gain.value = volume;

    source.onended = () => {
       if (source === sourceNodeRef.current) {
           setIsPlaying(false);
           // Logic to trigger next segment handled by useEffect watcher
       }
    };

    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  }, [playbackSpeed, volume]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopCurrentAudio();
    } else {
      initAudio();
      if (currentQueueId) {
        const item = queue.find(q => q.id === currentQueueId);
        if (item && item.segments[currentSegmentIndex]?.buffer) {
             playSegment(item.segments[currentSegmentIndex].buffer!);
        } else if (item) {
             setCurrentSegmentIndex(0);
        }
      } else if (queue.length > 0) {
         playQueueItem(queue[0].id);
      }
    }
  };

  const playQueueItem = (id: string) => {
    stopCurrentAudio();
    setCurrentQueueId(id);
    setCurrentSegmentIndex(0);
  };

  // --- Orchestrator ---
  useEffect(() => {
    if (!isPlaying && currentQueueId) {
        const item = queue.find(q => q.id === currentQueueId);
        if (item) {
             const segment = item.segments[currentSegmentIndex];
             if (segment && segment.buffer) {
                 playSegment(segment.buffer);
             } else if (segment && !segment.isLoading && !segment.buffer) {
                 if (currentSegmentIndex < item.segments.length - 1) {
                     setCurrentSegmentIndex(prev => prev + 1);
                 } else {
                     handleNextItem();
                 }
             }
        }
    }
  }, [currentQueueId, currentSegmentIndex, queue, isPlaying, playSegment]);

  // --- Segment Watcher ---
  useEffect(() => {
    const node = sourceNodeRef.current;
    if (node) {
        node.onended = () => {
            if (node === sourceNodeRef.current) {
                setIsPlaying(false); 
                setCurrentSegmentIndex(prevIndex => prevIndex + 1);
            }
        };
    }
  }, [sourceNodeRef.current, currentQueueId]);

  useEffect(() => {
      const item = queue.find(q => q.id === currentQueueId);
      if (item) {
          if (currentSegmentIndex > 0 && currentSegmentIndex >= item.segments.length) {
              handleNextItem();
          }
      }
  }, [currentSegmentIndex, currentQueueId, queue]);


  const handleNextItem = useCallback(() => {
    const idx = queue.findIndex(q => q.id === currentQueueId);
    if (idx >= 0 && idx < queue.length - 1) {
        playQueueItem(queue[idx + 1].id);
    } else {
        stopCurrentAudio();
        setCurrentQueueId(null);
        setCurrentSegmentIndex(0);
    }
  }, [queue, currentQueueId, stopCurrentAudio]);

  useEffect(() => {
    if (sourceNodeRef.current) {
        sourceNodeRef.current.playbackRate.value = playbackSpeed;
    }
    if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volume;
    }
  }, [playbackSpeed, volume]);

  const countWords = (str: string) => str.trim().split(/\s+/).length;

  const addToQueue = async (text: string, type: PlaybackType) => {
    initAudio();
    const now = Date.now();
    
    // Auto-deduplicate or smart replace if adding same text rapidly
    const lastItem = queue[queue.length - 1];
    let replaceId: string | null = null;
    const voiceToUse = selectedVoice; 

    if (lastItem && (now - lastItem.timestamp < 5000)) {
        if (text.includes(lastItem.originalText) || lastItem.originalText.includes(text)) {
            replaceId = lastItem.id;
            if (currentQueueId === replaceId) stopCurrentAudio();
        }
    }

    const id = replaceId || Date.now().toString();
    const isSummary = type === PlaybackType.SUMMARY;
    
    let segments: AudioSegment[] = [];
    if (!isSummary) {
        const textChunks = splitTextIntoChunks(text);
        segments = textChunks.map(chunk => ({
            text: chunk,
            buffer: null,
            isLoading: true,
            isPlayed: false
        }));
    } else {
        segments = [{ text: "", buffer: null, isLoading: true, isPlayed: false }];
    }

    const newItem: QueueItem = {
      id,
      originalText: text,
      displayText: isSummary ? "Generating Summary..." : text,
      type,
      segments,
      currentDuration: 0,
      isLoading: true,
      wordCount: isSummary ? 0 : countWords(text),
      timestamp: now
    };

    if (replaceId) {
        setQueue(prev => prev.map(item => item.id === replaceId ? newItem : item));
        if (currentQueueId === replaceId) {
             setCurrentQueueId(replaceId);
             setCurrentSegmentIndex(0);
        }
    } else {
        setQueue(prev => [...prev, newItem]);
        if (queue.length === 0) {
            setCurrentQueueId(id);
            setCurrentSegmentIndex(0);
        }
    }

    try {
        if (isSummary) {
            const summary = await summarizeText(text);
            const summaryChunks = splitTextIntoChunks(summary);
            const summarySegments = summaryChunks.map(chunk => ({
                text: chunk,
                buffer: null,
                isLoading: true,
                isPlayed: false
            }));

            setQueue(prev => prev.map(item => 
                item.id === id ? { 
                    ...item, 
                    displayText: summary,
                    wordCount: countWords(summary),
                    segments: summarySegments
                } : item
            ));

            processSegmentsAudio(id, summarySegments, voiceToUse);
        } else {
            processSegmentsAudio(id, segments, voiceToUse);
        }
    } catch (err: any) {
        console.error(err);
        setQueue(prev => prev.map(item => 
            item.id === id ? { ...item, isLoading: false, error: err.message || "Failed" } : item
        ));
    }
  };

  const processSegmentsAudio = async (itemId: string, segments: AudioSegment[], voiceName: string) => {
      if (!audioContextRef.current) return;
      for (let i = 0; i < segments.length; i++) {
          try {
              const buffer = await generateSpeech(segments[i].text, voiceName, audioContextRef.current);
              setQueue(prev => {
                  if (!prev.find(item => item.id === itemId)) return prev;
                  return prev.map(item => {
                      if (item.id !== itemId) return item;
                      const newSegments = [...item.segments];
                      if (newSegments[i]) {
                          newSegments[i] = { ...newSegments[i], buffer, isLoading: false };
                      }
                      return { ...item, segments: newSegments, isLoading: false };
                  });
              });
          } catch (e: any) {
              setQueue(prev => prev.map(item => 
                item.id === itemId 
                    ? { ...item, isLoading: false, error: e.message || "Generation Failed" } 
                    : item
              ));
              break; 
          }
      }
  };

  const saveToKnowledgeBase = (item: QueueItem) => {
      const saved: SavedItem = {
          id: Date.now().toString(),
          text: item.originalText,
          summary: item.type === PlaybackType.SUMMARY ? item.displayText : undefined,
          date: new Date().toLocaleDateString(),
          tags: [item.type]
      };
      setSavedItems(prev => [saved, ...prev]);
      setActiveTab('saved');
  };

  const removeFromQueue = (id: string) => {
    if (currentQueueId === id) stopCurrentAudio();
    setQueue(prev => {
        const item = prev.find(i => i.id === id);
        if (item) setHistory(h => [item, ...h].slice(0, 10));
        return prev.filter(i => i.id !== id);
    });
  };

  const clearQueue = () => {
    stopCurrentAudio();
    setCurrentQueueId(null);
    setHistory(h => [...queue, ...h].slice(0, 20));
    setQueue([]);
  };

  return (
    <div className="flex h-screen bg-white w-full flex-col">
      {/* --- Sidebar Header --- */}
      <div className="p-4 border-b border-gray-100 bg-white z-10 sticky top-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <span className="text-indigo-600">{ICONS.SPEAKER}</span>
              Gemini Reader
          </h2>
          
          <div className="flex mt-4 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('queue')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'queue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Queue
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  History
              </button>
              <button onClick={() => setActiveTab('saved')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'saved' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Saved
              </button>
          </div>
      </div>

      {/* --- Main List Area --- */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 relative">
          {activeTab === 'queue' && (
              <QueueList 
                  items={queue} 
                  currentId={currentQueueId}
                  onRemove={removeFromQueue}
                  onMoveUp={(i) => {}}
                  onMoveDown={(i) => {}}
                  onPlayNow={playQueueItem}
                  onSave={saveToKnowledgeBase}
              />
          )}
          
          {activeTab === 'history' && (
              <div className="space-y-3 pb-48">
                  {history.length === 0 && <p className="text-center text-gray-400 text-xs mt-8">No history</p>}
                  {history.map((item) => (
                      <div key={item.id} className="p-3 bg-white rounded-lg border border-gray-200 opacity-75">
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.displayText}</p>
                          <button onClick={() => { setQueue(q => [...q, item]); setActiveTab('queue'); }} className="text-[10px] text-indigo-600 font-bold hover:underline">RE-QUEUE</button>
                      </div>
                  ))}
              </div>
          )}

          {activeTab === 'saved' && (
              <div className="space-y-4 pb-48">
                  {savedItems.length === 0 && (
                      <div className="text-center mt-10 opacity-50">
                          <div className="mx-auto w-8 h-8 text-gray-400 mb-2">{ICONS.BOOKMARK}</div>
                          <p className="text-xs text-gray-500">Knowledge Base is empty.</p>
                      </div>
                  )}
                  {savedItems.map((item) => (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] text-gray-400 font-mono">{item.date}</span>
                              <div className="flex gap-1">
                                  {item.tags.map(tag => (
                                      <span key={tag} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{tag}</span>
                                  ))}
                              </div>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 mb-1">{item.text.substring(0, 60)}...</h4>
                          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-3">
                              {item.summary || item.text}
                          </p>
                          <div className="flex justify-end gap-2">
                              <button 
                                  onClick={() => {
                                      setSavedItems(prev => prev.filter(i => i.id !== item.id));
                                  }}
                                  className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1"
                              >
                                  Delete
                              </button>
                              <button 
                                  onClick={() => {
                                      addToQueue(item.text, item.summary ? PlaybackType.SUMMARY : PlaybackType.FULL);
                                      setActiveTab('queue');
                                  }}
                                  className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold hover:bg-indigo-100"
                              >
                                  Play
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      <PlayerControls 
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNextItem}
          speed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          volume={volume}
          onVolumeChange={setVolume}
          onClearQueue={clearQueue}
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
      />
    </div>
  );
}