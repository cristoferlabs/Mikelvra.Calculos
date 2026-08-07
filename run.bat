@echo off
setlocal enabledelayedexpansion
title Mikelvra - Servidor local
cd /d "%~dp0"

echo ============================================
echo   Mikelvra - Instalando y ejecutando
echo ============================================
echo.
echo Carpeta: %cd%
echo URL:     http://localhost:8080/index.html
echo.
echo Este sitio es HTML/CSS/JS puro (sin Astro, sin
echo React, sin build). Este script solo necesita un
echo servidor local para que el menu del sitio cargue
echo bien (los navegadores bloquean fetch() si abres
echo index.html con doble clic).
echo.

REM Liberar puerto 8080 si quedaron servidores viejos de pruebas anteriores
echo [INFO] Liberando puerto 8080 si estaba ocupado...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  echo   Cerrando proceso PID %%P
  taskkill /F /PID %%P >nul 2>nul
)
timeout /t 1 /nobreak >nul
echo.

REM ---------- Opcion 1: Python ya instalado ----------
where python >nul 2>nul
if %errorlevel%==0 (
    echo [OK] Python encontrado. Iniciando servidor...
    goto :RUN_PYTHON
)

where python3 >nul 2>nul
if %errorlevel%==0 (
    echo [OK] Python3 encontrado. Iniciando servidor...
    goto :RUN_PYTHON3
)

REM ---------- Opcion 2: Node.js ya instalado ----------
where node >nul 2>nul
if %errorlevel%==0 (
    echo [OK] Node.js encontrado. Instalando dependencias ^(npm install^)...
    call npm install
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Fallo "npm install". Revisa tu conexion a internet e intenta de nuevo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencias instaladas. Iniciando servidor con "npm start"...
    start "" "http://localhost:8080/index.html?v=%RANDOM%"
    call npm start
    goto :EOF
)

REM ---------- Opcion 3: no hay Python ni Node -> intentar instalar Python con winget ----------
echo [AVISO] No se encontro Python ni Node.js en este equipo.
where winget >nul 2>nul
if %errorlevel%==0 (
    echo Intentando instalar Python automaticamente con winget...
    winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    echo.
    echo Python fue instalado ^(o ya estaba disponible^). Vuelve a ejecutar
    echo este mismo archivo run.bat para iniciar el sitio.
    pause
    goto :EOF
)

echo.
echo No se pudo instalar nada automaticamente porque tampoco se
echo encontro "winget" en este equipo.
echo.
echo Instala manualmente UNA de estas dos opciones y vuelve a correr run.bat:
echo   1) Python:  https://www.python.org/downloads/
echo   2) Node.js: https://nodejs.org/
echo.
pause
goto :EOF

:RUN_PYTHON
start "" "http://localhost:8080/index.html?v=%RANDOM%"
python -m http.server 8080
goto :EOF

:RUN_PYTHON3
start "" "http://localhost:8080/index.html?v=%RANDOM%"
python3 -m http.server 8080
goto :EOF
