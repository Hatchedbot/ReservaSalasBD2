-- =====================================================================
--  Proyecto : Sistema de Reserva de Salas Universitario  (LM_RESERVASALAS)
--  Script   : 04_consulta_auditoria.sql
--  Ejecutar : conectado como LM_RESERVASALAS
--  Contenido: vistas de consulta de la auditoria y bloque anonimo PL/SQL
--             que genera un reporte de cambios por rango de fechas.
-- =====================================================================
SET ECHO ON
SET DEFINE ON
SET VERIFY OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 220
SET PAGESIZE 100

-- ---------------------------------------------------------------------
-- Vista detallada: un registro por cambio, con el "quien" consolidado
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW VW_AUDITORIA AS
SELECT a.ID_AUDITORIA,
       CAST(a.FECHA AS DATE)                         AS FECHA,
       TO_CHAR(a.FECHA, 'YYYY-MM-DD HH24:MI:SS.FF3') AS FECHA_HORA,
       TRUNC(CAST(a.FECHA AS DATE))                  AS DIA,
       a.TABLA,
       a.OPERACION,
       a.ID_REGISTRO,
       NVL(a.USUARIO_APP, a.USUARIO_BD)              AS QUIEN,
       a.USUARIO_BD,
       a.USUARIO_APP,
       a.USUARIO_SO,
       a.EQUIPO,
       a.IP,
       a.PROGRAMA,
       a.COLUMNAS_MODIFICADAS,
       a.DATOS_ANTERIORES,
       a.DATOS_NUEVOS
  FROM AUDITORIA a;

-- ---------------------------------------------------------------------
-- Vista resumen: cantidad de cambios por dia, tabla y operacion
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW VW_AUDITORIA_RESUMEN AS
SELECT TRUNC(CAST(FECHA AS DATE)) AS DIA,
       TABLA,
       COUNT(CASE WHEN OPERACION = 'INSERT' THEN 1 END) AS INSERCIONES,
       COUNT(CASE WHEN OPERACION = 'UPDATE' THEN 1 END) AS ACTUALIZACIONES,
       COUNT(CASE WHEN OPERACION = 'DELETE' THEN 1 END) AS ELIMINACIONES,
       COUNT(*)                                         AS TOTAL
  FROM AUDITORIA
 GROUP BY TRUNC(CAST(FECHA AS DATE)), TABLA;

-- Ejemplos de consulta de las vistas
COLUMN FECHA_HORA FORMAT A23
COLUMN TABLA      FORMAT A16
COLUMN OPERACION  FORMAT A9
COLUMN ID_REGISTRO FORMAT A12
COLUMN QUIEN      FORMAT A24
COLUMN COLUMNAS_MODIFICADAS FORMAT A40

SELECT ID_AUDITORIA, FECHA_HORA, TABLA, OPERACION, ID_REGISTRO, QUIEN, COLUMNAS_MODIFICADAS
  FROM VW_AUDITORIA
 ORDER BY ID_AUDITORIA DESC
 FETCH FIRST 20 ROWS ONLY;

SELECT * FROM VW_AUDITORIA_RESUMEN ORDER BY DIA DESC, TABLA;

-- ---------------------------------------------------------------------
-- Bloque anonimo: reporte de auditoria por rango de fechas
-- Uso:  @04_consulta_auditoria.sql  (pide fecha inicial y final)
--       Formato de fecha: YYYY-MM-DD. Tabla opcional (Enter = todas).
-- ---------------------------------------------------------------------
ACCEPT p_desde PROMPT 'Fecha inicial (YYYY-MM-DD): '
ACCEPT p_hasta PROMPT 'Fecha final   (YYYY-MM-DD): '
ACCEPT p_tabla PROMPT 'Tabla (Enter = todas)     : '

DECLARE
  -- Si no se escribe una fecha valida se toman los ultimos 30 dias
  v_desde  DATE := TO_DATE(NVL(REGEXP_SUBSTR('&p_desde', '[0-9]{4}-[0-9]{2}-[0-9]{2}'),
                               TO_CHAR(SYSDATE - 30, 'YYYY-MM-DD')), 'YYYY-MM-DD');
  v_hasta  DATE := TO_DATE(NVL(REGEXP_SUBSTR('&p_hasta', '[0-9]{4}-[0-9]{2}-[0-9]{2}'),
                               TO_CHAR(SYSDATE, 'YYYY-MM-DD')), 'YYYY-MM-DD') + 1;
  v_tabla  VARCHAR2(30) := REGEXP_SUBSTR(UPPER('&p_tabla'), '[A-Z_]+');
  v_total  PLS_INTEGER := 0;
  v_dia    DATE;
BEGIN
  DBMS_OUTPUT.PUT_LINE(RPAD('=', 100, '='));
  DBMS_OUTPUT.PUT_LINE(' REPORTE DE AUDITORIA - LM_RESERVASALAS');
  DBMS_OUTPUT.PUT_LINE(' Desde: ' || TO_CHAR(v_desde, 'YYYY-MM-DD') ||
                       '   Hasta: ' || TO_CHAR(v_hasta - 1, 'YYYY-MM-DD') ||
                       '   Tabla: ' || NVL(v_tabla, 'TODAS'));
  DBMS_OUTPUT.PUT_LINE(RPAD('=', 100, '='));

  FOR r IN (SELECT *
              FROM VW_AUDITORIA
             WHERE FECHA >= v_desde AND FECHA < v_hasta
               AND (v_tabla IS NULL OR TABLA = v_tabla)
             ORDER BY ID_AUDITORIA) LOOP
    IF v_dia IS NULL OR r.DIA <> v_dia THEN
      v_dia := r.DIA;
      DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- ' || TO_CHAR(v_dia, 'YYYY-MM-DD') || ' ---');
    END IF;
    v_total := v_total + 1;
    DBMS_OUTPUT.PUT_LINE(
      RPAD(r.FECHA_HORA, 24) || RPAD(r.OPERACION, 7) || ' ' ||
      RPAD(r.TABLA, 16) || ' id=' || RPAD(r.ID_REGISTRO, 8) ||
      ' por ' || r.QUIEN || ' (' || r.USUARIO_BD || '@' || NVL(r.EQUIPO, '?') || ')');
    IF r.OPERACION = 'UPDATE' THEN
      DBMS_OUTPUT.PUT_LINE('    columnas: ' || r.COLUMNAS_MODIFICADAS);
    END IF;
    IF r.DATOS_ANTERIORES IS NOT NULL THEN
      DBMS_OUTPUT.PUT_LINE('    antes  : ' || DBMS_LOB.SUBSTR(r.DATOS_ANTERIORES, 3000, 1));
    END IF;
    IF r.DATOS_NUEVOS IS NOT NULL THEN
      DBMS_OUTPUT.PUT_LINE('    despues: ' || DBMS_LOB.SUBSTR(r.DATOS_NUEVOS, 3000, 1));
    END IF;
  END LOOP;

  DBMS_OUTPUT.PUT_LINE(CHR(10) || RPAD('-', 100, '-'));
  DBMS_OUTPUT.PUT_LINE(' Total de cambios en el periodo: ' || v_total);
  FOR s IN (SELECT OPERACION, COUNT(*) N
              FROM AUDITORIA
             WHERE FECHA >= CAST(v_desde AS TIMESTAMP) AND FECHA < CAST(v_hasta AS TIMESTAMP)
               AND (v_tabla IS NULL OR TABLA = v_tabla)
             GROUP BY OPERACION ORDER BY OPERACION) LOOP
    DBMS_OUTPUT.PUT_LINE('   ' || RPAD(s.OPERACION, 8) || ': ' || s.N);
  END LOOP;
END;
/
