@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ATUALIZAR-V3.3.ps1"
echo.
pause
