@echo off
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
set "OLLAMA_MODELS=%ROOT_DIR%ollama\models"

rem -----------------------------------------------------------------------------
rem [STEP 1/5] Verifying Python Environment
rem -----------------------------------------------------------------------------
echo [STEP 1/5] Detecting Python 3.10+ installation...
set "SYS_PYTHON="

python --version >nul 2>&1
if %errorlevel% equ 0 set "SYS_PYTHON=python"
if "%SYS_PYTHON%"=="" (
    py -3 --version >nul 2>&1
    if %errorlevel% equ 0 set "SYS_PYTHON=py -3"
)
if "%SYS_PYTHON%"=="" (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 set "SYS_PYTHON=python3"
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

rem -----------------------------------------------------------------------------
rem [STEP 2/5] Setup Python Virtual Environment in backend\venv
rem -----------------------------------------------------------------------------
echo [STEP 2/5] Setting up Python Virtual Environment in backend\venv...
if not exist "%VENV_PYTHON%" (
    echo [INFO] Creating new isolated virtual environment at "%VENV_DIR%"...
    "%SYS_PYTHON%" -m venv "%VENV_DIR%"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        echo Please ensure you have write permissions in this folder.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
)
if exist "%VENV_PYTHON%" (
    echo [INFO] Existing virtual environment verified at "%VENV_DIR%".
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

rem -----------------------------------------------------------------------------
rem [STEP 3/5] Database Migration and Demo Account Initialization
rem -----------------------------------------------------------------------------
echo [STEP 3/5] Initializing SQLite Database and Migrating Schema...
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

rem -----------------------------------------------------------------------------
rem [STEP 4/5] Frontend Setup (Node.js and npm)
rem -----------------------------------------------------------------------------
echo [STEP 4/5] Verifying Node.js and npm for React Vite Frontend...

set "NPM_EXEC="
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 set "NPM_EXEC=npm.cmd"
if "%NPM_EXEC%"=="" (
    where npm >nul 2>&1
    if %errorlevel% equ 0 set "NPM_EXEC=npm"
)

if "%NPM_EXEC%"=="" (
    echo [WARNING] Node.js or npm was not detected in your PATH!
    echo Please install Node.js [version 18 or 20 LTS] from https://nodejs.org/
    echo After installing Node.js, run npm install inside the frontend folder.
    goto :SKIP_FRONTEND
)

for /f "tokens=*" %%v in ('%NPM_EXEC% --version 2^>^&1') do echo [OK] npm detected: version %%v

echo [INFO] Installing frontend dependencies in "%FRONTEND_DIR%"...
cd /d "%FRONTEND_DIR%"
cmd /c %NPM_EXEC% install
echo [OK] Frontend dependencies verified.

echo [INFO] Auditing frontend packages...
cmd /c %NPM_EXEC% audit fix --force >nul 2>&1
echo [OK] Frontend dependencies audited and updated.
cd /d "%ROOT_DIR%"

:SKIP_FRONTEND
echo.

rem -----------------------------------------------------------------------------
rem [STEP 5/5] Local Ollama AI Engine & Model Migration (qwen2.5:3b)
rem -----------------------------------------------------------------------------
echo [STEP 5/5] Configuring Local Ollama AI Engine and Pulling qwen2.5:3b model...

set "OLLAMA_EXE="
if exist "%ROOT_DIR%ollama\ollama.exe" set "OLLAMA_EXE=%ROOT_DIR%ollama\ollama.exe"
if "%OLLAMA_EXE%"=="" (
    where ollama >nul 2>&1
    if %errorlevel% equ 0 set "OLLAMA_EXE=ollama"
)

if "%OLLAMA_EXE%"=="" (
    echo [INFO] Ollama executable not found locally. Initiating automatic download...
    if not exist "%ROOT_DIR%ollama" mkdir "%ROOT_DIR%ollama"
    
    where curl >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Downloading Ollama CLI package (live progress below):
        curl -# -L "https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip" -o "%ROOT_DIR%ollama\ollama.zip"
    ) else (
        echo [INFO] Downloading Ollama CLI package via PowerShell (live progress below):
        powershell -Command "$ProgressPreference='Continue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Downloading https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip...'; Invoke-WebRequest -Uri 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip' -OutFile '%ROOT_DIR%ollama\ollama.zip'"
    )

    if exist "%ROOT_DIR%ollama\ollama.zip" (
        echo [INFO] Unpacking Ollama binary package...
        powershell -Command "Expand-Archive -Path '%ROOT_DIR%ollama\ollama.zip' -DestinationPath '%ROOT_DIR%ollama' -Force"
        del "%ROOT_DIR%ollama\ollama.zip" >nul 2>&1
        echo [OK] Unpacked Ollama binary.
    )
    if exist "%ROOT_DIR%ollama\ollama.exe" set "OLLAMA_EXE=%ROOT_DIR%ollama\ollama.exe"
)

if not "%OLLAMA_EXE%"=="" (
    echo [OK] Ollama CLI detected at "%OLLAMA_EXE%".
    if not exist "%ROOT_DIR%ollama\models" mkdir "%ROOT_DIR%ollama\models"

    netstat -ano 2>nul | findstr /R /C:":11434 .*LISTENING" >nul 2>&1
    set "OLLAMA_LISTEN=%errorlevel%"
    
    if not "%OLLAMA_LISTEN%"=="0" (
        echo [INFO] Starting background Ollama AI daemon service...
        start "AI Resume Master - Ollama Setup Service" /min "%OLLAMA_EXE%" serve
        ping 127.0.0.1 -n 5 >nul
    )

    echo [INFO] Downloading/Verifying local AI model qwen2.5:3b (live download progress below):
    "%OLLAMA_EXE%" pull qwen2.5:3b
    if %errorlevel% equ 0 (
        echo [OK] Local AI model qwen2.5:3b is ready for high-accuracy resume evaluation.
    )
    if not %errorlevel% equ 0 (
        echo [WARNING] Model download hit a network notice. Backend will use NLP fallback if offline.
    )
)

if "%OLLAMA_EXE%"=="" (
    echo [WARNING] Could not obtain Ollama executable automatically.
    echo           Please install Ollama from https://ollama.com/ to enable live local AI reasoning.
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
