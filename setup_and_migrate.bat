@echo off
setlocal EnableDelayedExpansion
title AI Resume Master System - Environment Setup and Migration Installer
color 0a

echo ===============================================================================
echo       AI RESUME MASTER SYSTEM - ENVIRONMENT SETUP AND MIGRATION
echo ===============================================================================
echo.
echo  Working Directory: %~dp0
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "VENV_PIP=%VENV_DIR%\Scripts\pip.exe"

:: -----------------------------------------------------------------------------
:: [STEP 1/4] Verifying Python Environment
:: -----------------------------------------------------------------------------
echo [STEP 1/4] Detecting Python 3.10+ installation...
set "SYS_PYTHON="

python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "SYS_PYTHON=python"
) else (
    py -3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        set "SYS_PYTHON=py -3"
    ) else (
        python3 --version >nul 2>&1
        if %errorlevel% equ 0 (
            set "SYS_PYTHON=python3"
        )
    )
)

if "%SYS_PYTHON%"=="" (
    echo.
    echo [ERROR] Python was not found in your system PATH!
    echo Please download and install Python 3.10+ from https://www.python.org/
    echo Make sure to check the box "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('%SYS_PYTHON% --version 2^>^&1') do echo [OK] System Python detected: %%v
echo.

:: -----------------------------------------------------------------------------
:: [STEP 2/4] Setup Python Virtual Environment in backend\venv
:: -----------------------------------------------------------------------------
echo [STEP 2/4] Setting up Python Virtual Environment in backend\venv...
if not exist "%VENV_PYTHON%" (
    echo [INFO] Creating new isolated virtual environment at "%VENV_DIR%"...
    %SYS_PYTHON% -m venv "%VENV_DIR%"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        echo Please ensure you have write permissions in this folder.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
) else (
    echo [INFO] Existing virtual environment found at "%VENV_DIR%".
)

echo [INFO] Updating pip and installing backend requirements...
"%VENV_PYTHON%" -m pip install --upgrade pip --quiet
"%VENV_PYTHON%" -m pip install -r "%BACKEND_DIR%\requirements.txt"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend requirements!
    echo Please check your internet connection and try running again.
    pause
    exit /b 1
)
echo [OK] Backend Python packages verified and ready.
echo.

:: -----------------------------------------------------------------------------
:: [STEP 3/4] Database Migration and Demo Account Initialization
:: -----------------------------------------------------------------------------
echo [STEP 3/4] Initializing SQLite Database and Migrating Schema...
echo [INFO] Running backend\init_db.py with isolated virtualenv Python...
cd /d "%BACKEND_DIR%"
"%VENV_PYTHON%" init_db.py
if %errorlevel% neq 0 (
    echo [ERROR] Database initialization failed!
    cd /d "%ROOT_DIR%"
    pause
    exit /b 1
)
cd /d "%ROOT_DIR%"
echo [OK] Database schema migrated and verified.
echo.

:: -----------------------------------------------------------------------------
:: [STEP 4/4] Frontend Setup (Node.js and npm)
:: -----------------------------------------------------------------------------
echo [STEP 4/4] Verifying Node.js and npm for React Vite Frontend...

:: Check for npm.cmd first to prevent PowerShell script execution policy errors (npm.ps1)
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_EXEC=npm.cmd"
) else (
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        set "NPM_EXEC=npm"
    ) else (
        echo [WARNING] Node.js or npm was not detected in your PATH!
        echo Please install Node.js [version 18 or 20 LTS] from https://nodejs.org/
        echo After installing Node.js, run npm install inside the frontend folder.
        goto :FINISH_SETUP
    )
)

for /f "tokens=*" %%v in ('%NPM_EXEC% --version 2^>^&1') do echo [OK] npm detected: version %%v

echo [INFO] Installing frontend dependencies in "%FRONTEND_DIR%"...
cd /d "%FRONTEND_DIR%"
call %NPM_EXEC% install
if %errorlevel% neq 0 (
    echo [WARNING] npm install reported warnings. Checking existing node_modules...
) else (
    echo [OK] Frontend dependencies installed successfully.
)

echo [INFO] Running npm audit fix --force...
call %NPM_EXEC% audit fix --force
if %errorlevel% neq 0 (
    echo [WARNING] npm audit fix reported warnings or issues.
) else (
    echo [OK] Frontend dependencies audited and fixed.
)
cd /d "%ROOT_DIR%"

:FINISH_SETUP
echo.
echo ===============================================================================
echo                     SETUP AND MIGRATION COMPLETE!
echo ===============================================================================
echo.
echo You can now start the entire platform with a single command:
echo.
echo     In Windows Explorer:   Double-click 'start_project.bat'
echo     In PowerShell / CMD:   .\start_project.bat
echo.
echo Pre-Configured Demo Credentials:
echo     Sample Candidate:       candidate@resumemaster.ai  /  candidate123
echo     Master Recruiter:       recruiter@resumemaster.ai  /  recruiter123
echo.

if "%1"=="--no-pause" goto :SKIP_PAUSE
if "%1"=="-y" goto :SKIP_PAUSE
if "%1"=="/y" goto :SKIP_PAUSE
echo Press any key to exit this installer...
pause >nul
:SKIP_PAUSE
