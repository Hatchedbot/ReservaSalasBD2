@echo off
REM =====================================================================
REM  Genera los respaldos de LM_RESERVASALAS en ..\03_backups
REM   1) Script SQL de SOLO ESTRUCTURA  (05_backup_estructura.sql, DBMS_METADATA)
REM   2) Script SQL de SOLO DATOS       (06_backup_datos.sql, INSERTs)
REM   3) Data Pump (expdp): METADATA_ONLY y DATA_ONLY (.dmp, opcional)
REM =====================================================================
setlocal
cd /d "%~dp0"
set "ORAHOME=D:\Oracle\product\26ai\dbhomeFree\bin"
set "BD=localhost:1521/FREEPDB1"
for /f "usebackq tokens=1,* delims==" %%a in ("..\04_app\.env") do if "%%a"=="DB_PASSWORD" set "LMPW=%%b"
for /f %%f in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmm"') do set "FECHA=%%f"
if not exist ..\03_backups mkdir ..\03_backups

echo Respaldo de estructura...
"%ORAHOME%\sqlplus.exe" -s -l LM_RESERVASALAS/%LMPW%@%BD% @05_backup_estructura.sql "..\03_backups\LM_RESERVASALAS_estructura_%FECHA%.sql"
echo Respaldo de datos...
"%ORAHOME%\sqlplus.exe" -s -l LM_RESERVASALAS/%LMPW%@%BD% @06_backup_datos.sql "..\03_backups\LM_RESERVASALAS_datos_%FECHA%.sql"

echo Data Pump (archivos .dmp en el directorio DATA_PUMP_DIR de Oracle)...
"%ORAHOME%\expdp.exe" LM_RESERVASALAS/%LMPW%@%BD% SCHEMAS=LM_RESERVASALAS CONTENT=METADATA_ONLY DIRECTORY=DATA_PUMP_DIR DUMPFILE=LM_estructura_%FECHA%.dmp LOGFILE=LM_estructura_%FECHA%.log REUSE_DUMPFILES=YES
"%ORAHOME%\expdp.exe" LM_RESERVASALAS/%LMPW%@%BD% SCHEMAS=LM_RESERVASALAS CONTENT=DATA_ONLY DIRECTORY=DATA_PUMP_DIR DUMPFILE=LM_datos_%FECHA%.dmp LOGFILE=LM_datos_%FECHA%.log REUSE_DUMPFILES=YES
echo Listo.
endlocal
