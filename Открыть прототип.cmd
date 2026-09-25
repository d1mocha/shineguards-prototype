@echo off
rem Double-click: starts the prototype server (if it is not running yet) and opens the site.
cd /d "%~dp0"
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 5174)).Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  start "Shine Guards prototype (close to stop)" /min python _serve.py 5174
  timeout /t 2 /nobreak >nul
)
start "" "http://localhost:5174/vienna/ua/"
