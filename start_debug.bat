@echo off
title JARVIS AI - DEBUG MODE
color 0E
cls
echo  Starting Jarvis in DEBUG MODE...
echo.
set DEBUG_MODE=true
node index.js --debug
pause
