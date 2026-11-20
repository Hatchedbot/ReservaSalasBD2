-- =====================================================================
--  Proyecto : Sistema de Reserva de Salas Universitario  (LM_RESERVASALAS)
--  Script   : 06_backup_datos.sql
--  Objetivo : Respaldo de LOS DATOS del esquema como sentencias INSERT.
--  Ejecutar : sqlplus LM_RESERVASALAS/<clave>@localhost:1521/FREEPDB1 @06_backup_datos.sql <archivo_salida.sql>
--  Resultado: script .sql que (sobre la estructura ya creada) desactiva
--             los triggers, inserta todos los registros respetando el orden
--             de las llaves foraneas, ajusta las columnas IDENTITY y
--             vuelve a activar los triggers.
--  Tecnica  : bloque PL/SQL generico con DBMS_SQL: describe las columnas de
--             cada tabla y convierte cada valor en un literal segun su tipo.
--  (Alternativa con Data Pump: ver backup_datapump.bat, CONTENT=DATA_ONLY)
-- =====================================================================
SET ECHO OFF FEEDBACK OFF HEADING OFF VERIFY OFF TERMOUT OFF
SET PAGESIZE 0 LINESIZE 32767 TRIMSPOOL ON TRIMOUT ON TAB OFF
SET SERVEROUTPUT ON SIZE UNLIMITED FORMAT WRAPPED

SPOOL &1

DECLARE
  TYPE t_lista IS TABLE OF VARCHAR2(128);
  -- Orden de carga: padres antes que hijos
  v_orden t_lista := t_lista('FACULTAD','USUARIO','EDIFICIO','TIPO_ESPACIO','ESPACIO',
                             'RECURSO','ESPACIO_RECURSO','RESERVA','AUDITORIA');

  FUNCTION lit_texto(p VARCHAR2) RETURN VARCHAR2 IS
  BEGIN
    RETURN CASE WHEN p IS NULL THEN 'NULL' ELSE '''' || REPLACE(p, '''', '''''') || '''' END;
  END;

  -- CLOB en trozos de 1000 caracteres (evita el limite de 4000 de un literal)
  FUNCTION lit_clob(p CLOB) RETURN CLOB IS
    v   CLOB;
    pos PLS_INTEGER := 1;
    len PLS_INTEGER;
  BEGIN
    IF p IS NULL THEN RETURN 'NULL'; END IF;
    len := DBMS_LOB.GETLENGTH(p);
    IF len = 0 THEN RETURN 'EMPTY_CLOB()'; END IF;
    WHILE pos <= len LOOP
      v := v || CASE WHEN pos > 1 THEN ' || ' END
             || 'TO_CLOB(' || lit_texto(DBMS_LOB.SUBSTR(p, 1000, pos)) || ')';
      pos := pos + 1000;
    END LOOP;
    RETURN v;
  END;

  PROCEDURE imprimir(p CLOB) IS
    pos PLS_INTEGER := 1;
    len PLS_INTEGER := DBMS_LOB.GETLENGTH(p);
  BEGIN
    -- DBMS_OUTPUT admite hasta 32767 caracteres por linea
    WHILE pos <= len LOOP
      DBMS_OUTPUT.PUT_LINE(DBMS_LOB.SUBSTR(p, 32000, pos));
      pos := pos + 32000;
    END LOOP;
  END;

  PROCEDURE volcar(p_tabla VARCHAR2) IS
    c        INTEGER := DBMS_SQL.OPEN_CURSOR;
    n        INTEGER;
    ign      INTEGER;
    cols     DBMS_SQL.DESC_TAB2;
    v_vc     VARCHAR2(32767);
    v_num    NUMBER;
    v_dt     DATE;
    v_ts     TIMESTAMP(9);
    v_clob   CLOB;
    v_cols   VARCHAR2(4000);
    v_vals   CLOB;
    v_filas  PLS_INTEGER := 0;
  BEGIN
    DBMS_SQL.PARSE(c, 'SELECT * FROM ' || DBMS_ASSERT.SIMPLE_SQL_NAME(p_tabla) || ' ORDER BY 1', DBMS_SQL.NATIVE);
    DBMS_SQL.DESCRIBE_COLUMNS2(c, n, cols);
    FOR i IN 1 .. n LOOP
      CASE cols(i).col_type
        WHEN 2   THEN DBMS_SQL.DEFINE_COLUMN(c, i, v_num);
        WHEN 12  THEN DBMS_SQL.DEFINE_COLUMN(c, i, v_dt);
        WHEN 180 THEN DBMS_SQL.DEFINE_COLUMN(c, i, v_ts);
        WHEN 112 THEN DBMS_SQL.DEFINE_COLUMN(c, i, v_clob);
        ELSE          DBMS_SQL.DEFINE_COLUMN(c, i, v_vc, 32767);
      END CASE;
      v_cols := v_cols || CASE WHEN i > 1 THEN ', ' END || cols(i).col_name;
    END LOOP;

    DBMS_OUTPUT.PUT_LINE(CHR(10) || '-- ---------- ' || p_tabla || ' ----------');
    ign := DBMS_SQL.EXECUTE(c);
    WHILE DBMS_SQL.FETCH_ROWS(c) > 0 LOOP
      v_vals := NULL;
      FOR i IN 1 .. n LOOP
        IF i > 1 THEN v_vals := v_vals || ', '; END IF;
        CASE cols(i).col_type
          WHEN 2 THEN
            DBMS_SQL.COLUMN_VALUE(c, i, v_num);
            v_vals := v_vals || NVL(TO_CHAR(v_num, 'TM9', 'NLS_NUMERIC_CHARACTERS=''.,'''), 'NULL');
          WHEN 12 THEN
            DBMS_SQL.COLUMN_VALUE(c, i, v_dt);
            v_vals := v_vals || CASE WHEN v_dt IS NULL THEN 'NULL'
                      ELSE 'TO_DATE(''' || TO_CHAR(v_dt, 'YYYY-MM-DD HH24:MI:SS') || ''', ''YYYY-MM-DD HH24:MI:SS'')' END;
          WHEN 180 THEN
            DBMS_SQL.COLUMN_VALUE(c, i, v_ts);
            v_vals := v_vals || CASE WHEN v_ts IS NULL THEN 'NULL'
                      ELSE 'TO_TIMESTAMP(''' || TO_CHAR(v_ts, 'YYYY-MM-DD HH24:MI:SS.FF6') || ''', ''YYYY-MM-DD HH24:MI:SS.FF6'')' END;
          WHEN 112 THEN
            DBMS_SQL.COLUMN_VALUE(c, i, v_clob);
            v_vals := v_vals || lit_clob(v_clob);
          ELSE
            DBMS_SQL.COLUMN_VALUE(c, i, v_vc);
            v_vals := v_vals || lit_texto(v_vc);
        END CASE;
      END LOOP;
      imprimir('INSERT INTO ' || p_tabla || ' (' || v_cols || ') VALUES (' || v_vals || ');');
      v_filas := v_filas + 1;
    END LOOP;
    DBMS_OUTPUT.PUT_LINE('-- ' || v_filas || ' registros');
    DBMS_SQL.CLOSE_CURSOR(c);
  EXCEPTION
    WHEN OTHERS THEN
      IF DBMS_SQL.IS_OPEN(c) THEN DBMS_SQL.CLOSE_CURSOR(c); END IF;
      RAISE;
  END volcar;

BEGIN
  DBMS_OUTPUT.PUT_LINE('-- =====================================================================');
  DBMS_OUTPUT.PUT_LINE('--  RESPALDO DE DATOS - esquema ' || USER);
  DBMS_OUTPUT.PUT_LINE('--  Generado: ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
  DBMS_OUTPUT.PUT_LINE('--  Restaurar sobre la estructura vacia: @este_archivo.sql');
  DBMS_OUTPUT.PUT_LINE('-- =====================================================================');
  DBMS_OUTPUT.PUT_LINE('SET DEFINE OFF');
  DBMS_OUTPUT.PUT_LINE('SET FEEDBACK OFF');
  DBMS_OUTPUT.PUT_LINE('WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK');
  DBMS_OUTPUT.PUT_LINE(CHR(10) || '-- Desactivar triggers para no generar auditoria ni validar durante la carga');
  FOR t IN (SELECT TRIGGER_NAME FROM USER_TRIGGERS ORDER BY 1) LOOP
    DBMS_OUTPUT.PUT_LINE('ALTER TRIGGER ' || t.TRIGGER_NAME || ' DISABLE;');
  END LOOP;

  FOR i IN 1 .. v_orden.COUNT LOOP
    volcar(v_orden(i));
  END LOOP;
  -- Tablas nuevas que no esten en la lista de orden
  FOR t IN (SELECT TABLE_NAME FROM USER_TABLES
             WHERE TABLE_NAME NOT IN ('FACULTAD','USUARIO','EDIFICIO','TIPO_ESPACIO','ESPACIO',
                                      'RECURSO','ESPACIO_RECURSO','RESERVA','AUDITORIA')
               AND TABLE_NAME NOT LIKE 'BIN$%' ORDER BY 1) LOOP
    volcar(t.TABLE_NAME);
  END LOOP;

  DBMS_OUTPUT.PUT_LINE(CHR(10) || 'COMMIT;');
  DBMS_OUTPUT.PUT_LINE(CHR(10) || '-- Ajustar columnas IDENTITY al maximo valor cargado');
  FOR x IN (SELECT TABLE_NAME, COLUMN_NAME FROM USER_TAB_IDENTITY_COLS ORDER BY 1) LOOP
    DBMS_OUTPUT.PUT_LINE('ALTER TABLE ' || x.TABLE_NAME || ' MODIFY ' || x.COLUMN_NAME ||
                         ' GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);');
  END LOOP;
  DBMS_OUTPUT.PUT_LINE(CHR(10) || '-- Recompilar (los ALTER de IDENTITY los invalidan) y reactivar triggers');
  FOR t IN (SELECT TRIGGER_NAME FROM USER_TRIGGERS ORDER BY 1) LOOP
    DBMS_OUTPUT.PUT_LINE('ALTER TRIGGER ' || t.TRIGGER_NAME || ' COMPILE;');
    DBMS_OUTPUT.PUT_LINE('ALTER TRIGGER ' || t.TRIGGER_NAME || ' ENABLE;');
  END LOOP;
  FOR v IN (SELECT VIEW_NAME FROM USER_VIEWS ORDER BY 1) LOOP
    DBMS_OUTPUT.PUT_LINE('ALTER VIEW ' || v.VIEW_NAME || ' COMPILE;');
  END LOOP;
  DBMS_OUTPUT.PUT_LINE('SET FEEDBACK ON');
  DBMS_OUTPUT.PUT_LINE('-- Fin del respaldo de datos');
END;
/

SPOOL OFF
SET TERMOUT ON
PROMPT Respaldo de datos generado en &1
EXIT
