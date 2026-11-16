@echo off
cd /d "%~dp0"
start "" wscript.exe "%~dp0start-app.vbs"
exit /b 0
