@echo off
REM ============================================================
REM  Reconecta los dispositivos al backend (tunel adb reverse).
REM  Ejecutar (doble clic) cada vez que:
REM    - enciendes el PC, o
REM    - desconectas/reconectas el telefono por USB.
REM  Redirige localhost:8080 del dispositivo -> :80 del PC (nginx).
REM ============================================================
echo.
echo  Armando tunel 8080 -^> 80 en los dispositivos conectados...
echo.

adb start-server >nul 2>&1

set FOUND=0
for /f "skip=1 tokens=1,2" %%a in ('adb devices') do (
  if "%%b"=="device" (
    adb -s %%a reverse tcp:8080 tcp:80 >nul
    echo    [OK] %%a
    set FOUND=1
  )
)

echo.
if "%FOUND%"=="0" (
  echo  No hay dispositivos. Conecta el telefono por USB ^(con depuracion
  echo  USB activada^) y vuelve a ejecutar este archivo.
) else (
  echo  Listo. Abre la app: deberia mostrar "EN VIVO" en unos segundos.
)
echo.
pause
