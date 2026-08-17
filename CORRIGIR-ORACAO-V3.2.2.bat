@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CORRIGIR-ORACAO-V3.2.2.ps1"
echo.
pause
