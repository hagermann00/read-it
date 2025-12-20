#Requires AutoHotkey v2.0
#SingleInstance Force

; Store last trigger time to prevent spam
lastTrigger := 0
lastToggle := 0

; ============================================
; GLOBAL HOTKEY: Ctrl+Alt+I to toggle floater
; ============================================
^!i:: {
    global lastToggle
    
    ; Debounce - only trigger every 300ms
    if (A_TickCount - lastToggle < 300)
        return
    
    lastToggle := A_TickCount
    
    try {
        ToggleFile := "c:\Y-OS\Y-IT_ENGINES\read-it\desktop-player\.toggle_floater"
        if FileExist(ToggleFile)
            FileDelete ToggleFile
        FileAppend A_TickCount, ToggleFile
    }
}

~LButton Up:: {
    global lastTrigger
    
    ; Debounce - only trigger every 500ms
    if (A_TickCount - lastTrigger < 500)
        return
    
    Sleep(200)
    
    ; Save clipboard BEFORE touching it
    ClipSaved := ClipboardAll()
    
    ; Clear and try copy
    A_Clipboard := ""
    SendInput("^c")
    
    ; Wait for clipboard
    if (ClipWait(0.3)) {
        newText := A_Clipboard
        
        ; Only trigger if we got actual new text
        if (newText != "") {
            lastTrigger := A_TickCount
            
            CoordMode "Mouse", "Screen"
            MouseGetPos &x, &y
            
            try {
                TriggerFile := "c:\Y-OS\Y-IT_ENGINES\read-it\desktop-player\.trigger_event"
                if FileExist(TriggerFile)
                    FileDelete TriggerFile
                FileAppend x "," y, TriggerFile
            }
            return  ; Keep new text in clipboard
        }
    }
    
    ; RESTORE clipboard if we didn't get new text
    A_Clipboard := ClipSaved
}
