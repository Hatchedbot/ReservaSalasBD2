@echo off
REM =====================================================================
REM  Instala la base de datos LM_RESERVASALAS completa en Oracle Free:
REM    00 esquema -> 01 tablas -> 02 datos -> 03 auditoria -> 04 vistas
REM  Lee las claves de ..\04_app\.env (DB_PASSWORD) y
REM  ..\04_app\.oracle_sys_password (clave de SYSTEM).
REM  Los resultados quedan en logs\instalacion_*.log
REM =====================================================================
setlocal
cd /d "%~dp0"
set "SQLPLUS=D:\Oracle\product\26ai\dbhomeFree\bin\sqlplus.exe"
set "BD=localhost:1521/FREEPDB1"
for /f "usebackq tokens=1,* delims==" %%a in ("..\04_app\.env") do if "%%a"=="DB_PASSWORD" set "LMPW=%%b"
set /p SYSPW=<"..\04_app\.oracle_sys_password"
if not exist logs mkdir logs

echo [1/5] Creando esquema LM_RESERVASALAS (como SYSTEM)...
"%SQLPLUS%" -s -l system/%SYSPW%@%BD% @00_crear_base_datos.sql %LMPW% > logs\instalacion_00.log
echo [2/5] Creando tablas y restricciones...
echo exit | "%SQLPLUS%" -s -l LM_RESERVASALAS/%LMPW%@%BD% @01_crear_tablas.sql > logs\instalacion_01.log
echo [3/5] Insertando datos...
echo exit | "%SQLPLUS%" -s -l LM_RESERVASALAS/%LMPW%@%BD% @02_insertar_datos.sql > logs\instalacion_02.log
echo [4/5] Instalando auditoria (tabla, paquete, triggers)...
echo exit | "%SQLPLUS%" -s -l LM_RESERVASALAS/%LMPW%@%BD% @03_auditoria.sql > logs\instalacion_03.log
echo [5/5] Creando vistas de consulta de auditoria...
(echo.& echo.& echo.& echo exit) | "%SQLPLUS%" -s -l LM_RESERVASALAS/%LMPW%@%BD% @04_consulta_auditoria.sql > logs\instalacion_04.log
echo Listo. Revise la carpeta logs.
endlocal
