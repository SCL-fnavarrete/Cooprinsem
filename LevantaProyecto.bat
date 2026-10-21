@echo off
setlocal
title Cooprinsem POS - Levantar proyecto
rem Levanta el POS en esta maquina: genera el cliente Prisma y abre dos
rem consolas (backend en el puerto 3001 y frontend en el 5173).
rem Requisitos: Node.js 20+, archivo server\.env y acceso a la red de
rem Cooprinsem (VPN) para la BD PostgreSQL y SAP.

cd /d "%~dp0"

echo.
echo ============================================
echo   Cooprinsem POS - Levantar proyecto
echo ============================================
echo.

rem 1. Node.js instalado
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js. Instale Node 20 o superior desde https://nodejs.org
  goto :fin_error
)
for /f "delims=" %%v in ('node -v') do echo Node.js %%v

rem 2. Configuracion del backend (BD y credenciales SAP: no van en el repositorio)
if not exist "server\.env" (
  echo [ERROR] Falta el archivo server\.env
  echo         Copie server\.env.example como server\.env y complete DATABASE_URL y las variables SAP_*.
  goto :fin_error
)

rem 3. Dependencias (solo la primera vez)
if not exist "node_modules\" (
  echo.
  echo Instalando dependencias del frontend, puede tardar unos minutos...
  call npm install
  if errorlevel 1 goto :error_paso
)
if not exist "server\node_modules\" (
  echo.
  echo Instalando dependencias del backend, puede tardar unos minutos...
  pushd server
  call npm install
  if errorlevel 1 (
    popd
    goto :error_paso
  )
  popd
)

rem 4. Cliente Prisma (obligatorio tras cada actualizacion del schema; NO modifica la BD)
echo.
echo Generando cliente Prisma...
pushd server
call npx prisma generate
if errorlevel 1 (
  popd
  goto :error_paso
)
popd

rem 5. Backend y frontend, cada uno en su consola (cerrar la consola detiene ese proceso)
echo.
echo Levantando backend (http://localhost:3001) y frontend (http://localhost:5173)...
start "Cooprinsem POS - Backend (puerto 3001)" cmd /k "cd /d "%~dp0server" && npm run dev"
start "Cooprinsem POS - Frontend (puerto 5173)" cmd /k "cd /d "%~dp0" && npm run dev"

rem 6. Abrir el navegador cuando el frontend alcance a levantar
echo Abriendo el navegador en unos segundos...
timeout /t 10 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Listo. Para detener el POS cierre las consolas "Backend" y "Frontend".
echo Si la pagina no carga, espere unos segundos y recargue (F5).
echo.
pause
exit /b 0

:error_paso
echo.
echo [ERROR] El paso anterior fallo. Revise el mensaje de arriba.
:fin_error
echo.
pause
exit /b 1
