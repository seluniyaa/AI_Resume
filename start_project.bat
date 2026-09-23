@echo off
title AI Resume Master System - Unified Platform Launcher
color 0b

echo ===============================================================================
echo            AI RESUME MASTER SYSTEM - ATS AUDIT ^& JOB PIPELINE
echo                       Unified Dual-Service Launcher
echo ===============================================================================
echo.
echo  Working Directory: %~dp0
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "VENV_PYTHON=%~dp0backend\venv\Scripts\python.exe"
set "OLLAMA_MODELS=%~dp0ollama\models"

rem -----------------------------------------------------------------------------
rem Pre-Flight Verifications
rem -----------------------------------------------------------------------------
if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python Virtual Environment was not found at: "%VENV_PYTHON%"
    echo.
    echo Please run 'setup_and_migrate.bat' first to set up the environment and database.
    echo.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [WARNING] Frontend node_modules directory was not found.
    echo           Please run 'setup_and_migrate.bat' to install dependencies if frontend fails.
    echo.
)

rem Detect npm.cmd to avoid PowerShell ExecutionPolicy restrictions (npm.ps1)
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_EXEC=npm.cmd"
) else (
    set "NPM_EXEC=npm"
)

rem Quick Port Availability Check
netstat -ano 2>nul | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 8000 is currently in use.
)

netstat -ano 2>nul | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 3000 is currently in use. Vite will automatically pick port 3001.
)

netstat -ano 2>nul | findstr /R /C:":11434 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 11434 is currently in use - Ollama AI Engine active.
)

rem Detect Ollama Executable
set "OLLAMA_EXE="
if exist "%ROOT_DIR%ollama\ollama.exe" set "OLLAMA_EXE=%ROOT_DIR%ollama\ollama.exe"
if "%OLLAMA_EXE%"=="" (
    where ollama >nul 2>&1
    if %errorlevel% equ 0 set "OLLAMA_EXE=ollama"
)

echo.
rem -----------------------------------------------------------------------------
rem 1. Launch Ollama Local AI Engine
rem -----------------------------------------------------------------------------
echo [1/3] Verifying and Spawning Ollama Local AI Engine [http://localhost:11434]...

netstat -ano 2>nul | findstr /R /C:":11434 .*LISTENING" >nul 2>&1
set "OLLAMA_PORT_ACTIVE=%errorlevel%"

if "%OLLAMA_PORT_ACTIVE%"=="0" (
    echo [OK] Ollama AI service is already running on port 11434.
)
if not "%OLLAMA_PORT_ACTIVE%"=="0" (
    if not "%OLLAMA_EXE%"=="" (
        echo [INFO] Launching Ollama Local AI Server daemon...
        if not exist "%ROOT_DIR%ollama\models" mkdir "%ROOT_DIR%ollama\models"
        start "AI Resume Master - Ollama Local AI Engine" /D "%ROOT_DIR%ollama" "%OLLAMA_EXE%" serve
        ping 127.0.0.1 -n 4 >nul
        echo [OK] Ollama AI Engine dispatched.
    )
    if "%OLLAMA_EXE%"=="" (
        echo [WARNING] Ollama executable not found! Backend will run with NLP fallback engine.
        echo           Run 'setup_and_migrate.bat' to download and set up Ollama automatically.
    )
)

echo.
rem -----------------------------------------------------------------------------
rem 2. Launch FastAPI Backend Daemon
rem -----------------------------------------------------------------------------
echo [2/3] Spawning Backend Server [FastAPI on http://127.0.0.1:8000]...
start "AI Resume Master - Backend (FastAPI)" /D "%BACKEND_DIR%" "%VENV_PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000

ping 127.0.0.1 -n 3 >nul

rem -----------------------------------------------------------------------------
rem 3. Launch React Vite Frontend Client
rem -----------------------------------------------------------------------------
echo [3/3] Spawning Frontend Client [Vite on http://localhost:3000]...
start "AI Resume Master - Frontend (Vite)" /D "%FRONTEND_DIR%" %NPM_EXEC% run dev

ping 127.0.0.1 -n 3 >nul

rem -----------------------------------------------------------------------------
rem 4. Automatically Open Default Web Browser
rem -----------------------------------------------------------------------------
echo.
echo [INFO] Dispatching web browser to http://localhost:3000/...
start http://localhost:3000/

echo.
echo ===============================================================================
echo                   SERVICES INITIALIZATION DISPATCHED
echo ===============================================================================
echo.
echo  Access Points:
echo    * Frontend Web Application:   http://localhost:3000/
echo    * Backend REST API ^& Docs:    http://127.0.0.1:8000/docs
echo    * Backend Root Info:          http://127.0.0.1:8000/
echo    * Ollama Local AI Engine:     http://localhost:11434/  (qwen2.5:3b)
echo.
echo  Default Demo Credentials:
echo    * Sample Candidate:   candidate@resumemaster.ai  /  candidate123
echo    * Master Recruiter:   recruiter@resumemaster.ai  /  recruiter123
echo.
echo  Press any key to close this monitor window (servers remain running).
echo ===============================================================================

if "%1"=="--no-pause" goto :SKIP_PAUSE
if "%1"=="-y" goto :SKIP_PAUSE
if "%1"=="/y" goto :SKIP_PAUSE
pause >nul
:SKIP_PAUSE
