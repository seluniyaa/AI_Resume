@echo off
setlocal EnableDelayedExpansion
title AI Resume Master System - Unified Platform Launcher
color 0b

echo ===============================================================================
echo            AI RESUME MASTER SYSTEM - ATS AUDIT & JOB PIPELINE
echo                       Unified Dual-Service Launcher
echo ===============================================================================
echo.
echo  Working Directory: %~dp0
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "VENV_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"

:: -----------------------------------------------------------------------------
:: Pre-Flight Verifications
:: -----------------------------------------------------------------------------
if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python Virtual Environment was not found at:
    echo         "%VENV_PYTHON%"
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

:: Detect npm.cmd to avoid PowerShell ExecutionPolicy restrictions (npm.ps1)
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_EXEC=npm.cmd"
) else (
    set "NPM_EXEC=npm"
)

:: Quick Port 8000 and 3000 Availability Check
netstat -ano 2>nul | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 8000 is currently in use. If an earlier backend instance is open,
    echo        it will serve existing requests.
)

netstat -ano 2>nul | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [NOTE] Port 3000 is currently in use. Vite will automatically attach or pick 3001.
)

echo.
:: -----------------------------------------------------------------------------
:: 1. Launch FastAPI Backend Daemon
:: -----------------------------------------------------------------------------
echo [1/2] Spawning Backend Server (FastAPI on http://127.0.0.1:8000)...
start "AI Resume Master - Backend (FastAPI)" /D "%BACKEND_DIR%" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

ping 127.0.0.1 -n 3 >nul

:: -----------------------------------------------------------------------------
:: 2. Launch React Vite Frontend Client
:: -----------------------------------------------------------------------------
echo [2/2] Spawning Frontend Client (Vite on http://localhost:3000)...
start "AI Resume Master - Frontend (Vite)" /D "%FRONTEND_DIR%" cmd /k "%NPM_EXEC% run dev"

ping 127.0.0.1 -n 3 >nul

:: -----------------------------------------------------------------------------
:: 3. Automatically Open Default Web Browser
:: -----------------------------------------------------------------------------
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
echo    * Backend REST API & Docs:    http://127.0.0.1:8000/docs
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
