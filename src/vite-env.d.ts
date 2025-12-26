/// <reference types="vite/client" />

interface Window {
    electron: {
        resizeWindow: (width: number, height: number) => void;
        setIgnoreMouse: (ignore: boolean) => void;
        saveToObsidian: (text: string) => Promise<string | boolean>;
        readQueue: () => Promise<any[]>;
        writeQueue: (queue: any[]) => Promise<void>;
        triggerCopyAndRead: () => Promise<string>;
    };
}
