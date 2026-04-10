@echo off
title JARVIS AI Assistant
color 0B
cls

echo.
echo  ============================================
echo   J.A.R.V.I.S - AI Desktop Assistant
echo   Powered by Groq API
echo  ============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed!
    echo  Download from: https://nodejs.org
    pause
    exit /b 1
)

:: Check if .env exists
if not exist ".env" (
    echo  [SETUP] First time setup required...
    echo  Running setup wizard...
    echo.
    node scripts/setup.js
    if errorlevel 1 (
        echo  [ERROR] Setup failed.
        pause
        exit /b 1
    )
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo  [INSTALL] Installing dependencies...
    npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo  Starting Jarvis...
echo.
node index.js

if errorlevel 1 (
    echo.
    echo  [ERROR] Jarvis crashed. Check logs/ for details.
    pause
)
