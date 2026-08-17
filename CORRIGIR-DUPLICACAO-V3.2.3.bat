@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CORRIGIR-DUPLICACAO-V3.2.3.ps1"
echo.
pause
