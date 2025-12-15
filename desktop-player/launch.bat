@echo off
:: IIWII Reader Launcher
:: Starts both the AHK trigger and the Electron app

:: Start AHK Trigger (hidden)
start "" "C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe" "c:\Y-OS\Y-IT_ENGINES\read-it\desktop-player\trigger.ahk"

:: Start Electron App
cd /d "c:\Y-OS\Y-IT_ENGINES\read-it\desktop-player"
npm start
