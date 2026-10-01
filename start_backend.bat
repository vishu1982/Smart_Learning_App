@echo off
echo Starting Smart Learning FastAPI Backend...
cd /d "%~dp0backend"
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe main.py
) else (
    python main.py
)
pause
