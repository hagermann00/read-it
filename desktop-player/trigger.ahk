#Requires AutoHotkey v2.0
#SingleInstance Force

; Only trigger on LEFT MOUSE UP while SHIFT is NOT held (to avoid messing with normal Shift+Click selection)
~LButton Up:: {
    ; Small delay to let selection complete
    Sleep(150)
    
    ; Save current clipboard
    ClipSaved := A_Clipboard
    A_Clipboard := ""
    
    ; Try to copy
    SendInput("^c")
    
    ; Wait briefly
    if (ClipWait(0.3)) {
        ; Only if we got NEW text that's different from what was there
        newText := A_Clipboard
        if (newText != "" && newText != ClipSaved) {
            CoordMode "Mouse", "Screen"
            MouseGetPos &x, &y
            
            try {
                TriggerFile := "c:\Y-OS\Y-IT_ENGINES\read-it\desktop-player\.trigger_event"
                if FileExist(TriggerFile)
                    FileDelete TriggerFile
                FileAppend x "," y, TriggerFile
            }
            ; Keep the new text in clipboard (user wanted to copy it anyway)
            return
        }
    }
    
    ; Restore clipboard if we didn't get new text
    A_Clipboard := ClipSaved
}
