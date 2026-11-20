-- =====================================================================
--  Proyecto : Sistema de Reserva de Salas Universitario
--  Grupo    : Lara - Malagon        (prefijo LM_)
--  Motor    : Oracle AI Database 26ai Free  (PDB FREEPDB1)
--  Script   : 00_crear_base_datos.sql
--  Ejecutar : como SYSTEM conectado a FREEPDB1
--             sqlplus system/<clave>@localhost:1521/FREEPDB1 @00_crear_base_datos.sql <clave_lm>
--
--  En Oracle una "base de datos" de aplicacion se implementa como un
--  ESQUEMA (usuario) dentro de la base de datos conectable FREEPDB1.
--  Se crea el tablespace y el esquema LM_RESERVASALAS.
-- =====================================================================
SET ECHO ON
WHENEVER SQLERROR CONTINUE

-- Limpieza (permite re-ejecutar el script)
DROP USER LM_RESERVASALAS CASCADE;
DROP TABLESPACE LM_RESERVASALAS_TS INCLUDING CONTENTS AND DATAFILES;

WHENEVER SQLERROR EXIT SQL.SQLCODE

-- Tablespace propio del proyecto
CREATE TABLESPACE LM_RESERVASALAS_TS
  DATAFILE 'LM_RESERVASALAS_TS01.dbf' SIZE 100M
  AUTOEXTEND ON NEXT 20M MAXSIZE 1G;

-- Esquema (base de datos) con prefijo de los apellidos: L(ara) M(alagon)
CREATE USER LM_RESERVASALAS IDENTIFIED BY "&1"
  DEFAULT TABLESPACE LM_RESERVASALAS_TS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON LM_RESERVASALAS_TS;

GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE,
      CREATE PROCEDURE, CREATE TRIGGER, CREATE SYNONYM, CREATE TYPE
   TO LM_RESERVASALAS;

-- Necesario para respaldos con Data Pump (expdp/impdp)
WHENEVER SQLERROR CONTINUE
GRANT READ, WRITE ON DIRECTORY DATA_PUMP_DIR TO LM_RESERVASALAS;
GRANT DATAPUMP_EXP_FULL_DATABASE TO LM_RESERVASALAS;

SELECT USERNAME, DEFAULT_TABLESPACE, CREATED
  FROM DBA_USERS WHERE USERNAME = 'LM_RESERVASALAS';

EXIT
