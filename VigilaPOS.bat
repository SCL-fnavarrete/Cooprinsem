@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Cooprinsem POS - Vigilar y levantar
rem Revisa si el POS esta funcionando en la VM y levanta solo lo que este caido:
rem   - Backend  (puerto 3001, responde GET /health)
rem   - Frontend (puerto 5173, responde GET /)
rem Si el backend esta caido y el schema de Prisma cambio (o falta el cliente
rem generado), corre "npx prisma generate" antes de levantarlo. Nunca toca la BD
rem (no hace db push) ni actualiza el codigo (no hace git pull).
rem
rem Pensado para correr a mano o desde el Programador de tareas cada pocos
rem minutos. Deja registro en logs\vigila_AAAAMMDD.log.
rem Codigo de salida: 0 = todo arriba, 1 = algo quedo abajo o hubo un error.

set "RAIZ=C:\DemoPos\Cooprinsem"
rem Opcional: otra ruta como primer parametro (para probar en otra maquina)
if not "%~1"=="" set "RAIZ=%~f1"
set "PUERTO_BACK=3001"
set "PUERTO_FRONT=5173"
set "URL_BACK=http://localhost:%PUERTO_BACK%/health"
set "URL_FRONT=http://localhost:%PUERTO_FRONT%/"
rem Espera maxima tras levantar un servicio (intentos x 5 segundos)
set "INTENTOS=24"

if not exist "%RAIZ%\package.json" (
  echo [ERROR] No se encontro el proyecto en %RAIZ%
  exit /b 1
)
cd /d "%RAIZ%"

set "LOGS=%RAIZ%\logs"
if not exist "%LOGS%\" mkdir "%LOGS%"
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set "HOY=%%d"
set "LOG=%LOGS%\vigila_%HOY%.log"
set "STAMP_PRISMA=%LOGS%\.prisma_schema.sha256"

call :log "===== Revision del POS ====="

rem --- Requisitos ---------------------------------------------------------
where node >nul 2>nul || (call :log "[ERROR] Node.js no esta instalado o no esta en el PATH" & exit /b 1)
where curl.exe >nul 2>nul || (call :log "[ERROR] No se encontro curl.exe (Windows 10 1803 o superior)" & exit /b 1)
if not exist "%RAIZ%\server\.env" (call :log "[ERROR] Falta server\.env (DATABASE_URL y variables SAP_*)" & exit /b 1)

set "RESULTADO=0"

rem --- Backend ------------------------------------------------------------
call :responde "%URL_BACK%" BACK_OK
if "!BACK_OK!"=="1" (
  call :log "Backend OK (%URL_BACK%)"
  if not exist "%STAMP_PRISMA%" if exist "%RAIZ%\server\src\generated\prisma\" (
    rem Primera revision con el backend arriba: se toma el schema actual como el generado
    call :guardar_hash_prisma
    call :log "Registrado el schema de Prisma actual."
  )
  call :prisma_al_dia PRISMA_OK
  if "!PRISMA_OK!"=="0" call :log "[AVISO] El schema de Prisma cambio pero el backend esta arriba: no se regenera. Reinicie el backend para aplicarlo."
) else (
  call :log "Backend NO responde. Se levanta."
  call :liberar_puerto %PUERTO_BACK% "Cooprinsem POS - Backend*"
  if not exist "%RAIZ%\server\node_modules\" (
    call :log "Instalando dependencias del backend (falta server\node_modules)..."
    pushd "%RAIZ%\server"
    call npm install >> "%LOG%" 2>&1
    set "ERR=!errorlevel!"
    popd
    if not "!ERR!"=="0" (call :log "[ERROR] npm install del backend fallo" & exit /b 1)
  )
  call :prisma_al_dia PRISMA_OK
  if "!PRISMA_OK!"=="0" (
    call :log "Generando cliente Prisma (schema cambiado o cliente ausente)..."
    pushd "%RAIZ%\server"
    call npx prisma generate >> "%LOG%" 2>&1
    set "ERR=!errorlevel!"
    popd
    if not "!ERR!"=="0" (call :log "[ERROR] prisma generate fallo; revise el log" & exit /b 1)
    call :guardar_hash_prisma
    call :log "Cliente Prisma generado."
  )
  start "Cooprinsem POS - Backend (puerto %PUERTO_BACK%)" /min cmd /c "cd /d "%RAIZ%\server" && npm run dev >> "%LOGS%\backend_%HOY%.log" 2>&1"
  call :esperar "%URL_BACK%" BACK_OK
  if "!BACK_OK!"=="1" (call :log "Backend levantado.") else (call :log "[ERROR] El backend no respondio a tiempo; revise logs\backend_%HOY%.log" & set "RESULTADO=1")
)

rem --- Frontend -----------------------------------------------------------
call :responde "%URL_FRONT%" FRONT_OK
if "!FRONT_OK!"=="1" (
  call :log "Frontend OK (%URL_FRONT%)"
) else (
  call :log "Frontend NO responde. Se levanta."
  call :liberar_puerto %PUERTO_FRONT% "Cooprinsem POS - Frontend*"
  if not exist "%RAIZ%\node_modules\" (
    call :log "Instalando dependencias del frontend (falta node_modules)..."
    call npm install >> "%LOG%" 2>&1
    if errorlevel 1 (call :log "[ERROR] npm install del frontend fallo" & exit /b 1)
  )
  start "Cooprinsem POS - Frontend (puerto %PUERTO_FRONT%)" /min cmd /c "cd /d "%RAIZ%" && npm run dev >> "%LOGS%\frontend_%HOY%.log" 2>&1"
  call :esperar "%URL_FRONT%" FRONT_OK
  if "!FRONT_OK!"=="1" (call :log "Frontend levantado.") else (call :log "[ERROR] El frontend no respondio a tiempo; revise logs\frontend_%HOY%.log" & set "RESULTADO=1")
)

if "%RESULTADO%"=="0" (call :log "Resultado: POS funcionando.") else (call :log "Resultado: hay servicios caidos.")
exit /b %RESULTADO%


rem ========================================================================
rem :responde URL VAR -> VAR=1 si la URL contesta HTTP 2xx/3xx
:responde
set "%~2=0"
set "CODIGO=000"
for /f %%c in ('curl.exe -s -o nul -m 5 -w "%%{http_code}" "%~1" 2^>nul') do set "CODIGO=%%c"
if "!CODIGO:~0,1!"=="2" set "%~2=1"
if "!CODIGO:~0,1!"=="3" set "%~2=1"
exit /b 0

rem :esperar URL VAR -> reintenta cada 5 s hasta INTENTOS veces
:esperar
set "%~2=0"
for /l %%i in (1,1,%INTENTOS%) do (
  if "!%~2!"=="0" (
    timeout /t 5 /nobreak >nul
    call :responde "%~1" %~2
  )
)
exit /b 0

rem :liberar_puerto PUERTO "TITULO*" -> cierra la consola anterior de este servicio
rem (nodemon puede quedar vivo sin el servidor) y el proceso que ocupe el puerto sin responder
:liberar_puerto
taskkill /FI "WINDOWTITLE eq %~2" /T /F >nul 2>&1 && call :log "Se cerro la consola anterior (%~2)."
for /f "tokens=5" %%p in ('netstat -ano -p TCP ^| findstr /R /C:":%~1 .*LISTENING"') do (
  if not "%%p"=="0" (
    call :log "Puerto %~1 ocupado por el PID %%p sin responder: se cierra ese proceso."
    taskkill /PID %%p /T /F >> "%LOG%" 2>&1
  )
)
exit /b 0

rem :prisma_al_dia VAR -> VAR=1 si el cliente generado existe y corresponde al schema actual
:prisma_al_dia
set "%~1=1"
if not exist "%RAIZ%\server\src\generated\prisma\" set "%~1=0"
call :hash_prisma HASH_ACTUAL
set "HASH_GUARDADO="
if exist "%STAMP_PRISMA%" set /p HASH_GUARDADO=<"%STAMP_PRISMA%"
if not "!HASH_ACTUAL!"=="!HASH_GUARDADO!" set "%~1=0"
exit /b 0

:guardar_hash_prisma
call :hash_prisma HASH_ACTUAL
> "%STAMP_PRISMA%" echo !HASH_ACTUAL!
exit /b 0

:hash_prisma
set "%~1="
for /f "skip=1 delims=" %%h in ('certutil -hashfile "%RAIZ%\server\prisma\schema.prisma" SHA256') do (
  if not defined %~1 set "%~1=%%h"
)
set "%~1=!%~1: =!"
exit /b 0

rem :log "texto" -> pantalla + archivo con fecha y hora
:log
echo [%date% %time:~0,8%] %~1
>> "%LOG%" echo [%date% %time:~0,8%] %~1
exit /b 0
