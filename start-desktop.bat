@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo  Menjalankan Aplikasi Standalone Globaliti Center
echo  SMKS TI Bali Global Denpasar
echo ===================================================
npm run app
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Gagal menjalankan aplikasi. Pastikan Node.js terpasang.
  pause
)
