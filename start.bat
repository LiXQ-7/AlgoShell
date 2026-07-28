@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [AlgoShell] Node.js was not found. Install Node.js 16.20 or newer.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [AlgoShell] Installing dependencies for the first run...
  call npm.cmd install
  if errorlevel 1 (
    echo [AlgoShell] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [AlgoShell] Starting local application...
call npm.cmd run dev

