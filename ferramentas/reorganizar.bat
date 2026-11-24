@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================================
echo  Manutencao Interativa - reorganizacao das pastas
echo ==========================================================
echo.
echo 1) SIMULACAO (nada sera movido):
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0reorganizar.ps1" -Simular
echo.
set /p OK=Executar de verdade? Digite S e Enter para confirmar: 
if /i not "%OK%"=="S" ( echo Cancelado. & pause & exit /b )
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0reorganizar.ps1"
echo.
pause
