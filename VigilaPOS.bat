@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Cooprinsem POS - Vigilar y levantar
rem Revisa si el POS esta funcionando en la VM y levanta solo lo que este caido:
rem   - Backend  (puerto 3001, responde GET /health)
rem   - Frontend (puerto 5173, responde GET /)
rem
rem Modo PRE_PROD (por defecto): ejecuta la version compilada (frontend con
rem "vite preview", backend con "node dist\index.js"). Si el codigo cambio desde
rem el ultimo build (commit de git distinto), compila primero en carpetas
rem aparte; solo si el build termina bien detiene los servicios, cambia la
rem version y los vuelve a levantar. Si el build falla, sigue corriendo la
rem version anterior.
rem Modo DEV (parametro "dev"): npm run dev en ambos, como antes.
rem
rem Antes de compilar o levantar el backend: "npm install" si cambio el
rem package-lock.json (o falta node_modules) y "npx prisma generate" si cambio el
rem schema de Prisma. Nunca toca la BD (no hace db push).
rem
rem Actualizacion automatica (pre_prod, rama main): scripts\actualizarDesdeGit.cjs
rem hace "git pull --ff-only" cuando hay version nueva, el parametro
rem ACTUALIZACION_AUTOMATICA_VM = S (Admin > Parametros) y nadie uso el POS en los
rem ultimos 2 minutos. Para pausarla sin el backend: crear logs\PAUSAR_ACTUALIZACION.
rem
rem Uso:  VigilaPOS.bat [dev] [ruta del proyecto]
rem Pensado para correr a mano o desde el Programador de tareas cada pocos
rem minutos. Deja registro en logs\vigila_AAAAMMDD.log.
rem Codigo de salida: 0 = todo arriba, 1 = algo quedo abajo o hubo un error.

set "RAIZ=C:\DemoPos\Cooprinsem"
set "MODO=preprod"
for %%a in (%*) do (
  if /i "%%~a"=="dev" (set "MODO=dev") else set "RAIZ=%%~fa"
)
rem Puertos: se pueden cambiar con variables de entorno (para probar en otra maquina)
if not defined PUERTO_BACK set "PUERTO_BACK=3001"
if not defined PUERTO_FRONT set "PUERTO_FRONT=5173"
set "URL_BACK=http://localhost:%PUERTO_BACK%/health"
set "URL_FRONT=http://localhost:%PUERTO_FRONT%/"
set "TITULO_BACK=Cooprinsem POS - Backend (puerto %PUERTO_BACK%)"
set "TITULO_FRONT=Cooprinsem POS - Frontend (puerto %PUERTO_FRONT%)"
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
set "STAMP_BUILD=%LOGS%\.build_commit"
set "STAMP_FALLIDO=%LOGS%\.build_fallido"
set "STAMP_DEPS_FRONT=%LOGS%\.deps_front.sha256"
set "STAMP_DEPS_BACK=%LOGS%\.deps_back.sha256"

call :log "===== Revision del POS (modo %MODO%) ====="

rem --- Requisitos ---------------------------------------------------------
where node >nul 2>nul || (call :log "[ERROR] Node.js no esta instalado o no esta en el PATH" & exit /b 1)
where curl.exe >nul 2>nul || (call :log "[ERROR] No se encontro curl.exe (Windows 10 1803 o superior)" & exit /b 1)
if not exist "%RAIZ%\server\.env" (call :log "[ERROR] Falta server\.env (DATABASE_URL y variables SAP_*)" & exit /b 1)

set "RESULTADO=0"
set "BUILD_FALLO=0"

rem --- Pre_prod: traer version nueva desde git ------------------------------
rem Todo en un solo bloque: cmd lo lee completo antes de ejecutarlo. Si el pull
rem cambia este mismo .bat (codigo 3), se termina sin leer mas lineas del archivo
rem viejo; la proxima revision corre con el nuevo.
if /i "%MODO%"=="preprod" (
  node "%RAIZ%\scripts\actualizarDesdeGit.cjs" "%RAIZ%" "%PUERTO_BACK%" >> "%LOG%" 2>&1
  if errorlevel 3 (
    >> "%LOG%" echo [%date% %time%] VigilaPOS.bat cambio con la actualizacion: se termina y la proxima revision compila.
    exit /b 0
  )
)

rem --- Pre_prod: compilar si hay version nueva -----------------------------
if /i "%MODO%"=="preprod" call :actualizar_preprod

rem --- Backend ------------------------------------------------------------
call :responde "%URL_BACK%" BACK_OK
if "!BACK_OK!"=="1" (
  call :log "Backend OK (%URL_BACK%)"
  if not exist "%STAMP_PRISMA%" if exist "%RAIZ%\server\src\generated\prisma\" (
    rem Primera revision con el backend arriba: se toma el schema actual como el generado
    call :guardar_hash "%RAIZ%\server\prisma\schema.prisma" "%STAMP_PRISMA%"
    call :log "Registrado el schema de Prisma actual."
  )
  call :prisma_al_dia PRISMA_OK
  if "!PRISMA_OK!"=="0" call :log "[AVISO] El schema de Prisma cambio pero el backend esta arriba: no se regenera. Reinicie el backend para aplicarlo."
) else (
  call :log "Backend NO responde. Se levanta."
  call :detener %PUERTO_BACK% "%TITULO_BACK%"
  call :preparar_backend || exit /b 1
  if /i "%MODO%"=="preprod" (
    if exist "%RAIZ%\server\dist\index.js" (
      start "%TITULO_BACK%" /min cmd /c "cd /d "%RAIZ%\server" && set "PORT=%PUERTO_BACK%" && node dist\index.js >> "%LOGS%\backend_%HOY%.log" 2>&1"
    ) else (
      rem Sin ninguna version compilada (primer build fallido): modo desarrollo para no dejar el POS caido
      call :log "[AVISO] No hay build del backend: se levanta en modo desarrollo (npm run dev)."
      start "%TITULO_BACK%" /min cmd /c "cd /d "%RAIZ%\server" && set "PORT=%PUERTO_BACK%" && npm run dev >> "%LOGS%\backend_%HOY%.log" 2>&1"
    )
  ) else (
    start "%TITULO_BACK%" /min cmd /c "cd /d "%RAIZ%\server" && set "PORT=%PUERTO_BACK%" && npm run dev >> "%LOGS%\backend_%HOY%.log" 2>&1"
  )
  call :esperar "%URL_BACK%" BACK_OK
  if "!BACK_OK!"=="1" (call :log "Backend levantado.") else (call :log "[ERROR] El backend no respondio a tiempo; revise logs\backend_%HOY%.log" & set "RESULTADO=1")
)

rem --- Frontend -----------------------------------------------------------
call :responde "%URL_FRONT%" FRONT_OK
if "!FRONT_OK!"=="1" (
  call :log "Frontend OK (%URL_FRONT%)"
) else (
  call :log "Frontend NO responde. Se levanta."
  call :detener %PUERTO_FRONT% "%TITULO_FRONT%"
  call :preparar_frontend || exit /b 1
  if /i "%MODO%"=="preprod" (
    if exist "%RAIZ%\dist\index.html" (
      rem vite preview reenvia /api y /health al backend (vite.config.ts). Con node y no
      rem npx: npx cambia el titulo de la consola y luego no se puede cerrar por titulo.
      start "%TITULO_FRONT%" /min cmd /c "cd /d "%RAIZ%" && set "POS_BACKEND_URL=http://localhost:%PUERTO_BACK%" && node node_modules\vite\bin\vite.js preview --mode preprod --port %PUERTO_FRONT% --strictPort >> "%LOGS%\frontend_%HOY%.log" 2>&1"
    ) else (
      call :log "[AVISO] No hay build del frontend: se levanta en modo desarrollo (vite)."
      start "%TITULO_FRONT%" /min cmd /c "cd /d "%RAIZ%" && node node_modules\vite\bin\vite.js --port %PUERTO_FRONT% --strictPort >> "%LOGS%\frontend_%HOY%.log" 2>&1"
    )
  ) else (
    start "%TITULO_FRONT%" /min cmd /c "cd /d "%RAIZ%" && npm run dev >> "%LOGS%\frontend_%HOY%.log" 2>&1"
  )
  call :esperar "%URL_FRONT%" FRONT_OK
  if "!FRONT_OK!"=="1" (call :log "Frontend levantado.") else (call :log "[ERROR] El frontend no respondio a tiempo; revise logs\frontend_%HOY%.log" & set "RESULTADO=1")
)

if "%RESULTADO%"=="1" (
  call :log "Resultado: hay servicios caidos o no se pudo cambiar de version."
  exit /b 1
)
if "%BUILD_FALLO%"=="1" (
  call :log "Resultado: POS funcionando con la version anterior (el build nuevo fallo)."
  exit /b 1
)
call :log "Resultado: POS funcionando."
exit /b 0


rem ========================================================================
rem :actualizar_preprod -> compila la version nueva en carpetas aparte y, si todo
rem compila, detiene los servicios y la reemplaza. Si algo falla, no toca la version en uso.
:actualizar_preprod
set "COMMIT=sin-git"
for /f %%c in ('git -C "%RAIZ%" rev-parse --short HEAD 2^>nul') do set "COMMIT=%%c"
set "COMMIT_BUILD="
if exist "%STAMP_BUILD%" set /p COMMIT_BUILD=<"%STAMP_BUILD%"
set "HAY_BUILD=1"
if not exist "%RAIZ%\dist\index.html" set "HAY_BUILD=0"
if not exist "%RAIZ%\server\dist\index.js" set "HAY_BUILD=0"
if "%HAY_BUILD%"=="1" if "!COMMIT!"=="!COMMIT_BUILD!" exit /b 0
rem Un commit cuyo build ya falló no se reintenta en cada revisión (se reintenta al cambiar el código)
set "COMMIT_FALLIDO="
if exist "%STAMP_FALLIDO%" set /p COMMIT_FALLIDO=<"%STAMP_FALLIDO%"
if "!COMMIT!"=="!COMMIT_FALLIDO!" (
  call :log "[AVISO] El build de !COMMIT! fallo antes: no se reintenta (version en uso: !COMMIT_BUILD!). Para reintentar, borre logs\.build_fallido."
  set "BUILD_FALLO=1"
  exit /b 0
)

call :log "Version nueva (commit !COMMIT!, ultimo build: !COMMIT_BUILD!). Compilando..."
rem Dependencias y Prisma pueden necesitar los servicios detenidos (archivos en uso)
call :deps_cambiaron "%RAIZ%\package-lock.json" "%STAMP_DEPS_FRONT%" "%RAIZ%\node_modules" CAMBIO_FRONT
call :deps_cambiaron "%RAIZ%\server\package-lock.json" "%STAMP_DEPS_BACK%" "%RAIZ%\server\node_modules" CAMBIO_BACK
call :prisma_al_dia PRISMA_OK
if "!CAMBIO_FRONT!"=="1" call :detener %PUERTO_FRONT% "%TITULO_FRONT%"
set "PARAR_BACK=0"
if "!CAMBIO_BACK!"=="1" set "PARAR_BACK=1"
if "!PRISMA_OK!"=="0" set "PARAR_BACK=1"
if "!PARAR_BACK!"=="1" call :detener %PUERTO_BACK% "%TITULO_BACK%"
call :preparar_frontend || (call :log "[ERROR] No se pudo preparar el frontend; se mantiene la version anterior." & set "RESULTADO=1" & exit /b 0)
call :preparar_backend || (call :log "[ERROR] No se pudo preparar el backend; se mantiene la version anterior." & set "RESULTADO=1" & exit /b 0)

if exist "%RAIZ%\dist_nuevo\" rmdir /s /q "%RAIZ%\dist_nuevo"
if exist "%RAIZ%\server\dist_nuevo\" rmdir /s /q "%RAIZ%\server\dist_nuevo"
call :log "Compilando frontend (vite build --mode preprod)..."
call npx vite build --mode preprod --outDir dist_nuevo --emptyOutDir >> "%LOG%" 2>&1
if errorlevel 1 (
  call :log "[ERROR] Fallo el build del frontend; se mantiene la version anterior. Revise el log."
  rmdir /s /q "%RAIZ%\dist_nuevo" 2>nul
  > "%STAMP_FALLIDO%" echo !COMMIT!
  set "BUILD_FALLO=1"
  exit /b 0
)
call :log "Compilando backend (tsc)..."
pushd "%RAIZ%\server"
call npx tsc --outDir dist_nuevo >> "%LOG%" 2>&1
set "ERR=!errorlevel!"
popd
if not "!ERR!"=="0" (
  call :log "[ERROR] Fallo el build del backend; se mantiene la version anterior. Revise el log."
  rmdir /s /q "%RAIZ%\dist_nuevo" 2>nul
  rmdir /s /q "%RAIZ%\server\dist_nuevo" 2>nul
  > "%STAMP_FALLIDO%" echo !COMMIT!
  set "BUILD_FALLO=1"
  exit /b 0
)

call :log "Builds correctos. Se reemplaza la version en uso."
call :detener %PUERTO_FRONT% "%TITULO_FRONT%"
call :detener %PUERTO_BACK% "%TITULO_BACK%"
call :cambiar_version "%RAIZ%" || (call :log "[ERROR] No se pudo reemplazar el frontend (carpeta en uso); queda la version anterior." & set "RESULTADO=1" & exit /b 0)
call :cambiar_version "%RAIZ%\server" || (call :log "[ERROR] No se pudo reemplazar el backend (carpeta en uso); queda la version anterior." & set "RESULTADO=1" & exit /b 0)
> "%STAMP_BUILD%" echo !COMMIT!
if exist "%STAMP_FALLIDO%" del "%STAMP_FALLIDO%"
call :log "Version !COMMIT! lista."
exit /b 0

rem :cambiar_version CARPETA -> deja dist_nuevo como dist. Primero renombrando
rem (dist pasa a dist_anterior, se puede volver atrás); si Windows tiene tomada
rem la carpeta (otro proceso la vigila), copia con robocopy.
:cambiar_version
if exist "%~1\dist_anterior\" rmdir /s /q "%~1\dist_anterior" 2>nul
set "RENOMBRADO=1"
if exist "%~1\dist\" (
  call :renombrar "%~1\dist" dist_anterior || set "RENOMBRADO=0"
)
if "!RENOMBRADO!"=="1" (
  call :renombrar "%~1\dist_nuevo" dist
  if errorlevel 1 (
    set "RENOMBRADO=0"
    if exist "%~1\dist_anterior\" call :renombrar "%~1\dist_anterior" dist
  )
)
if "!RENOMBRADO!"=="1" (
  if exist "%~1\dist_anterior\" rmdir /s /q "%~1\dist_anterior" 2>nul
  exit /b 0
)
call :log "No se pudo renombrar %~1\dist_nuevo (carpeta en uso): se copia con robocopy."
robocopy "%~1\dist_nuevo" "%~1\dist" /MIR /R:3 /W:2 /NFL /NDL /NJH /NJS /NP >> "%LOG%" 2>&1
if errorlevel 8 exit /b 1
rmdir /s /q "%~1\dist_nuevo" 2>nul
exit /b 0

rem :renombrar RUTA NOMBRE -> ren con hasta 5 intentos (2 s entre cada uno)
:renombrar
for /l %%i in (1,1,5) do (
  if exist "%~1\" (
    ren "%~1" "%~2" 2>nul
    if exist "%~1\" call :pausa 2
  )
)
if exist "%~1\" exit /b 1
exit /b 0

rem :pausa SEGUNDOS -> espera sin necesitar consola (timeout falla en el Programador de tareas)
:pausa
set /a "PINGS=%~1+1"
ping -n !PINGS! 127.0.0.1 >nul
exit /b 0

rem :preparar_frontend -> npm install si falta node_modules o cambio package-lock.json
:preparar_frontend
call :deps_cambiaron "%RAIZ%\package-lock.json" "%STAMP_DEPS_FRONT%" "%RAIZ%\node_modules" CAMBIO
if "!CAMBIO!"=="1" (
  call :log "Instalando dependencias del frontend (npm install)..."
  pushd "%RAIZ%"
  call npm install >> "%LOG%" 2>&1
  set "ERR=!errorlevel!"
  popd
  if not "!ERR!"=="0" (call :log "[ERROR] npm install del frontend fallo" & exit /b 1)
  call :guardar_hash "%RAIZ%\package-lock.json" "%STAMP_DEPS_FRONT%"
)
exit /b 0

rem :preparar_backend -> npm install si hace falta y prisma generate si cambio el schema
:preparar_backend
call :deps_cambiaron "%RAIZ%\server\package-lock.json" "%STAMP_DEPS_BACK%" "%RAIZ%\server\node_modules" CAMBIO
if "!CAMBIO!"=="1" (
  call :log "Instalando dependencias del backend (npm install)..."
  pushd "%RAIZ%\server"
  call npm install >> "%LOG%" 2>&1
  set "ERR=!errorlevel!"
  popd
  if not "!ERR!"=="0" (call :log "[ERROR] npm install del backend fallo" & exit /b 1)
  call :guardar_hash "%RAIZ%\server\package-lock.json" "%STAMP_DEPS_BACK%"
)
call :prisma_al_dia PRISMA_OK
if "!PRISMA_OK!"=="0" (
  call :log "Generando cliente Prisma (schema cambiado o cliente ausente)..."
  pushd "%RAIZ%\server"
  call npx prisma generate >> "%LOG%" 2>&1
  set "ERR=!errorlevel!"
  popd
  if not "!ERR!"=="0" (call :log "[ERROR] prisma generate fallo; revise el log" & exit /b 1)
  call :guardar_hash "%RAIZ%\server\prisma\schema.prisma" "%STAMP_PRISMA%"
  call :log "Cliente Prisma generado."
)
exit /b 0

rem :deps_cambiaron LOCK STAMP NODE_MODULES VAR -> VAR=1 si falta node_modules, falta alguna
rem dependencia de package.json en node_modules, cambio el lock o no hay registro previo.
:deps_cambiaron
set "%~4=0"
if not exist "%~3\" (set "%~4=1" & exit /b 0)
if not exist "%~2" (set "%~4=1" & exit /b 0)
rem No basta el registro: un node_modules antiguo puede no tener dependencias nuevas (ej. jspdf)
node "%RAIZ%\scripts\verificarDependencias.cjs" "%~dp1." >> "%LOG%" 2>&1
if errorlevel 1 (set "%~4=1" & exit /b 0)
call :hash_archivo "%~1" H_ACTUAL
set "H_GUARDADO="
set /p H_GUARDADO=<"%~2"
if not "!H_ACTUAL!"=="!H_GUARDADO!" set "%~4=1"
exit /b 0

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
    call :pausa 5
    call :responde "%~1" %~2
  )
)
exit /b 0

rem :detener PUERTO "TITULO" -> cierra la consola del servicio (nodemon o vite pueden
rem quedar vivos sin el servidor) y el proceso que ocupe el puerto
:detener
rem Solo la consola con el titulo exacto de este servicio y puerto (no otras ventanas del POS)
tasklist /FI "WINDOWTITLE eq %~2" /NH 2>nul | find /i "cmd.exe" >nul && (
  taskkill /FI "WINDOWTITLE eq %~2" /T /F >nul 2>&1
  call :log "Se cerro la consola del servicio (%~2)."
)
rem IPv4 e IPv6 (vite preview escucha en [::1]): netstat sin -p
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:"TCP .*:%~1 .*LISTENING"') do (
  if not "%%p"=="0" (
    call :log "Puerto %~1 ocupado por el PID %%p: se cierra ese proceso."
    taskkill /PID %%p /T /F >> "%LOG%" 2>&1
  )
)
exit /b 0

rem :prisma_al_dia VAR -> VAR=1 si el cliente generado existe y corresponde al schema actual
:prisma_al_dia
set "%~1=1"
if not exist "%RAIZ%\server\src\generated\prisma\" set "%~1=0"
call :hash_archivo "%RAIZ%\server\prisma\schema.prisma" HASH_ACTUAL
set "HASH_GUARDADO="
if exist "%STAMP_PRISMA%" set /p HASH_GUARDADO=<"%STAMP_PRISMA%"
if not "!HASH_ACTUAL!"=="!HASH_GUARDADO!" set "%~1=0"
exit /b 0

rem :guardar_hash ARCHIVO STAMP
:guardar_hash
call :hash_archivo "%~1" H_GUARDAR
> "%~2" echo !H_GUARDAR!
exit /b 0

rem :hash_archivo ARCHIVO VAR -> SHA256 del archivo (vacio si no existe)
:hash_archivo
set "%~2="
if not exist "%~1" exit /b 0
for /f "skip=1 delims=" %%h in ('certutil -hashfile "%~1" SHA256') do (
  if not defined %~2 set "%~2=%%h"
)
set "%~2=!%~2: =!"
exit /b 0

rem :log "texto" -> pantalla + archivo con fecha y hora
:log
echo [%date% %time:~0,8%] %~1
>> "%LOG%" echo [%date% %time:~0,8%] %~1
exit /b 0
