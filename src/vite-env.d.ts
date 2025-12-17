/// <reference types="vite/client" />

interface Window {
    electron: {
        resizeWindow: (width: number, height: number) => void;
        setIgnoreMouse: (ignore: boolean) => void;
        saveToObsidian: (text: string) => Promise<boolean>;
    };
}
