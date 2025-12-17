
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, X, ExternalLink, Minimize2, Check, FileText } from 'lucide-react';
import './index.css';

interface ReadItem {
    id: string;
    url: string;
    title: string;
    status: 'unread' | 'reading' | 'archived';
    addedAt: number;
}

function App() {
    const [mode, setMode] = useState<'icon' | 'input' | 'list'>('icon');
    const [items, setItems] = useState<ReadItem[]>([]);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Mock data for now if IPC fails, but we should rely on IPC
    // useEffect(() => { window.electron.readData().then(setItems); }, []);

    // Resize effects
    useEffect(() => {
        if (mode === 'icon') window.electron.resizeWindow(60, 60);
        if (mode === 'input') window.electron.resizeWindow(400, 60);
        if (mode === 'list') window.electron.resizeWindow(400, 500);
    }, [mode]);

    useEffect(() => {
        if (mode === 'input' && inputRef.current) inputRef.current.focus();
    }, [mode]);

    const addItem = () => {
        if (!inputValue.trim()) return;
        const newItem: ReadItem = {
            id: Date.now().toString(),
            url: inputValue,
            title: inputValue, // We'll fetch title later?
            status: 'unread',
            addedAt: Date.now()
        };
        setItems([newItem, ...items]);
        setInputValue('');
        setMode('list');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addItem();
        if (e.key === 'Escape') setMode('icon');
    };

    // --- VIEWS ---

    // 1. PILL
    if (mode === 'icon') {
        return (
            <div
                className="draggable w-full h-full rounded-full bg-bg border border-border shadow-lg flex items-center justify-center group hover:border-accent transition-all cursor-pointer"
                onClick={() => setMode('input')}
                onDoubleClick={() => setMode('list')}
            >
                <BookOpen className="text-accent w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
        );
    }

    // 2. INPUT
    if (mode === 'input') {
        return (
            <div className="draggable w-full h-full bg-bg rounded-lg border border-border shadow-xl flex items-center px-4 gap-3">
                <button className="clickable text-muted hover:text-text" onClick={() => setMode('icon')}>
                    <X size={18} />
                </button>
                <input
                    ref={inputRef}
                    className="clickable flex-1 bg-transparent border-none text-text outline-none placeholder-muted text-sm"
                    placeholder="Paste URL to read..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className="clickable text-accent hover:text-white" onClick={addItem}>
                    <Plus size={20} />
                </button>
            </div>
        );
    }

    // 3. SLATE (List)
    return (
        <div className="draggable w-full h-full bg-bg rounded-lg border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-accent" />
                    <h2 className="text-sm font-bold text-text">READING QUEUE</h2>
                </div>
                <div className="flex gap-2">
                    <button className="clickable p-1 hover:bg-border rounded text-muted hover:text-text" onClick={() => setMode('input')}>
                        <Plus size={14} />
                    </button>
                    <button className="clickable p-1 hover:bg-border rounded text-muted hover:text-text" onClick={() => setMode('icon')}>
                        <Minimize2 size={14} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted text-sm gap-2">
                        <p>Queue is empty</p>
                        <button className="clickable text-accent hover:underline" onClick={() => setMode('input')}>Add Article</button>
                    </div>
                )}

                {items.map(item => (
                    <div key={item.id} className="group flex items-center gap-3 p-3 hover:bg-surface rounded-md transition-colors border border-transparent hover:border-border">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm text-text font-medium truncate">{item.title}</h3>
                            <p className="text-xs text-muted truncate">{item.url}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="clickable text-muted hover:text-accent" title="Open">
                                <ExternalLink size={14} />
                            </button>
                            <button
                                className="clickable text-muted hover:text-purple-500"
                                title="Send to Obsidian Inbox"
                                onClick={() => {
                                    window.electron.saveToObsidian(`Source: ${item.url}\nTitle: ${item.title}`).then(() => alert('Saved to Obsidian!'));
                                }}
                            >
                                <FileText size={14} />
                            </button>
                            <button className="clickable text-muted hover:text-green-500" title="Archive">
                                <Check size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
