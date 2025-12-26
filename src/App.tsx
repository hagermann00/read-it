
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, X, ExternalLink, Minimize2, Check, FileText, Play, Square, Loader } from 'lucide-react';
import './index.css';
import { summarizeText } from './services/gemini';

interface ReadItem {
    id: string;
    url?: string;
    title: string;
    text: string; // The full text content
    summary?: string;
    status: 'unread' | 'reading' | 'archived';
    addedAt: number;
    isSummarizing?: boolean;
}

function App() {
    const [mode, setMode] = useState<'icon' | 'input' | 'list'>('icon');
    const [items, setItems] = useState<ReadItem[]>([]);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentText, setCurrentText] = useState<string | null>(null);

    // Audio Refs
    const synth = window.speechSynthesis;
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Load Data
    useEffect(() => {
        if (window.electron) {
            window.electron.readQueue().then((data) => {
                if (Array.isArray(data)) setItems(data);
            });
        }
    }, []);

    // Save Data
    useEffect(() => {
        if (window.electron) {
            window.electron.writeQueue(items);
        }
    }, [items]);

    // Resize effects
    useEffect(() => {
        if (window.electron) {
            if (mode === 'icon') window.electron.resizeWindow(60, 60);
            if (mode === 'input') window.electron.resizeWindow(400, 60);
            if (mode === 'list') window.electron.resizeWindow(400, 500);
        }
    }, [mode]);

    useEffect(() => {
        if (mode === 'input' && inputRef.current) inputRef.current.focus();
    }, [mode]);

    const addItem = async (textOrUrl: string) => {
        if (!textOrUrl.trim()) return;

        const isUrl = textOrUrl.startsWith('http');
        const newItem: ReadItem = {
            id: Date.now().toString(),
            url: isUrl ? textOrUrl : undefined,
            title: isUrl ? textOrUrl : (textOrUrl.substring(0, 30) + '...'),
            text: textOrUrl,
            status: 'unread',
            addedAt: Date.now(),
            isSummarizing: true
        };

        setItems(prev => [newItem, ...prev]);
        setInputValue('');
        setMode('list');

        // Trigger Summary in background
        if (!isUrl && textOrUrl.length > 100) {
             try {
                 const summary = await summarizeText(textOrUrl);
                 setItems(prev => prev.map(i => i.id === newItem.id ? { ...i, summary, isSummarizing: false } : i));
             } catch (e) {
                 setItems(prev => prev.map(i => i.id === newItem.id ? { ...i, isSummarizing: false } : i));
             }
        } else {
             setItems(prev => prev.map(i => i.id === newItem.id ? { ...i, isSummarizing: false } : i));
        }
    };

    const handleHighlightAndPlay = async () => {
        // 1. Trigger Copy & Read from Electron
        // 2. Add to Queue
        // 3. Play immediately
        try {
            if (window.electron) {
                const text = await window.electron.triggerCopyAndRead();
                if (text && text.trim().length > 0) {
                    await addItem(text);
                    // Find the new item (it's the first one)
                    playText(text);
                    setMode('list'); // Open list to show it's working
                }
            } else {
                // Dev/Browser fallback
                alert("Highlight & Play only works in Electron app (requires system clipboard access).");
                setMode('input');
            }
        } catch (e) {
            console.error("Failed to copy/read", e);
        }
    };

    const playText = (text: string) => {
        if (synth.speaking) synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        utteranceRef.current = utterance;
        synth.speak(utterance);
        setIsPlaying(true);
        setCurrentText(text);
    };

    const stopPlaying = () => {
        if (synth.speaking) synth.cancel();
        setIsPlaying(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addItem(inputValue);
        if (e.key === 'Escape') setMode('icon');
    };

    // --- VIEWS ---

    // 1. PILL
    if (mode === 'icon') {
        return (
            <div className="draggable w-full h-full rounded-full bg-slate-900 border border-slate-700 shadow-lg flex items-center justify-center group overflow-hidden relative">
                {/* Background Hover Effect */}
                <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity" />

                {/* Main Action: Play/Highlight */}
                <button
                    className="clickable z-10 w-full h-full flex items-center justify-center text-white hover:text-indigo-400 transition-colors"
                    onClick={handleHighlightAndPlay}
                    title="Click to Read Highlighted Text"
                >
                   {isPlaying ? <Square className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 ml-1" />}
                </button>

                {/* Secondary: Expand (Small corner area or Double Click) */}
                <div
                   className="absolute top-0 right-0 w-4 h-4 bg-transparent cursor-nwse-resize z-20"
                   onClick={(e) => { e.stopPropagation(); setMode('list'); }}
                />
            </div>
        );
    }

    // 2. INPUT (Manual Add)
    if (mode === 'input') {
        return (
            <div className="draggable w-full h-full bg-slate-900 rounded-lg border border-slate-700 shadow-xl flex items-center px-4 gap-3">
                <button className="clickable text-slate-400 hover:text-white" onClick={() => setMode('icon')}>
                    <X size={18} />
                </button>
                <input
                    ref={inputRef}
                    className="clickable flex-1 bg-transparent border-none text-white outline-none placeholder-slate-500 text-sm"
                    placeholder="Paste Text or URL..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className="clickable text-indigo-500 hover:text-indigo-400" onClick={() => addItem(inputValue)}>
                    <Plus size={20} />
                </button>
            </div>
        );
    }

    // 3. LIST (Main View)
    return (
        <div className="draggable w-full h-full bg-white rounded-lg border border-slate-200 shadow-2xl flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600" />
                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Queue</h2>
                </div>
                <div className="flex gap-2">
                    <button className="clickable p-1 hover:bg-slate-200 rounded text-slate-500" onClick={() => setMode('input')}>
                        <Plus size={14} />
                    </button>
                    <button className="clickable p-1 hover:bg-slate-200 rounded text-slate-500" onClick={() => setMode('icon')}>
                        <Minimize2 size={14} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide bg-slate-50/50">
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
                        <p>Queue is empty</p>
                        <button className="clickable text-indigo-600 font-medium hover:underline" onClick={() => setMode('input')}>Add Article</button>
                    </div>
                )}

                {items.map(item => (
                    <div key={item.id} className="group bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="text-sm text-slate-800 font-semibold line-clamp-2 leading-tight">
                                {item.summary ? "Summary: " + item.title : item.title}
                            </h3>
                            {item.isSummarizing && <Loader size={12} className="animate-spin text-indigo-400" />}
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-3 mb-3">
                            {item.summary || item.text}
                        </p>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                            <span className="text-[10px] text-slate-400">{new Date(item.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>

                            <div className="flex gap-3">
                                <button
                                    className="clickable text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                    title="Play"
                                    onClick={() => playText(item.summary || item.text)}
                                >
                                    <Play size={14} />
                                </button>

                                <button
                                    className="clickable text-slate-400 hover:text-purple-600"
                                    title="Save to Obsidian"
                                    onClick={() => {
                                        const content = `Source: ${item.url || 'Clipboard'}\n\n# ${item.title}\n\n${item.summary ? '## Summary\n'+item.summary : ''}\n\n## Full Text\n${item.text}`;
                                        if (window.electron) {
                                            window.electron.saveToObsidian(content).then((path) => {
                                                if (path) alert('Saved to: ' + path);
                                                else alert('Failed to save');
                                            });
                                        } else {
                                            console.log("Obsidian content:", content);
                                            alert("Obsidian save (See console)");
                                        }
                                    }}
                                >
                                    <FileText size={14} />
                                </button>

                                <button
                                    className="clickable text-slate-400 hover:text-red-500"
                                    title="Archive/Delete"
                                    onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                                >
                                    <Check size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Mini Player Footer if Active */}
            {isPlaying && (
                <div className="p-2 bg-indigo-600 text-white flex items-center justify-between text-xs font-medium">
                    <span className="animate-pulse">Playing...</span>
                    <button onClick={stopPlaying} className="clickable hover:text-indigo-200">
                        <Square size={12} className="fill-current" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
