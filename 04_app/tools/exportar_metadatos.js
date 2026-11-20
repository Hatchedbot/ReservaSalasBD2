// Lee el diccionario de Oracle (USER_TAB_COLUMNS, USER_CONSTRAINTS, comentarios)
// y lo guarda en 01_diseno/metadatos.json para generar el diccionario de datos
// (Excel/PDF) y el diagrama relacional (draw.io/PNG).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

(async () => {
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectString: process.env.DB_CONNECT,
  });
  const q = async (sql) => (await conn.execute(sql)).rows;

  const tablas = await q(`SELECT t.TABLE_NAME, c.COMMENTS, t.NUM_ROWS
                            FROM USER_TABLES t LEFT JOIN USER_TAB_COMMENTS c ON c.TABLE_NAME = t.TABLE_NAME
                           WHERE t.TABLE_NAME NOT LIKE 'BIN$%' ORDER BY t.TABLE_NAME`);
  const columnas = await q(`SELECT c.TABLE_NAME, c.COLUMN_ID, c.COLUMN_NAME, c.DATA_TYPE, c.DATA_LENGTH, c.CHAR_LENGTH,
                                   c.DATA_PRECISION, c.DATA_SCALE, c.NULLABLE, c.DATA_DEFAULT, c.IDENTITY_COLUMN,
                                   m.COMMENTS
                              FROM USER_TAB_COLUMNS c
                              LEFT JOIN USER_COL_COMMENTS m ON m.TABLE_NAME = c.TABLE_NAME AND m.COLUMN_NAME = c.COLUMN_NAME
                             WHERE c.TABLE_NAME IN (SELECT TABLE_NAME FROM USER_TABLES)
                             ORDER BY c.TABLE_NAME, c.COLUMN_ID`);
  const restricciones = await q(`SELECT uc.TABLE_NAME, uc.CONSTRAINT_NAME, uc.CONSTRAINT_TYPE, uc.SEARCH_CONDITION_VC,
                                        uc.DELETE_RULE, rc.TABLE_NAME AS TABLA_REF,
                                        LISTAGG(cc.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY cc.POSITION) AS COLUMNAS
                                   FROM USER_CONSTRAINTS uc
                                   LEFT JOIN USER_CONS_COLUMNS cc ON cc.CONSTRAINT_NAME = uc.CONSTRAINT_NAME
                                   LEFT JOIN USER_CONSTRAINTS rc ON rc.CONSTRAINT_NAME = uc.R_CONSTRAINT_NAME
                                  WHERE uc.TABLE_NAME NOT LIKE 'BIN$%'
                                  GROUP BY uc.TABLE_NAME, uc.CONSTRAINT_NAME, uc.CONSTRAINT_TYPE, uc.SEARCH_CONDITION_VC,
                                           uc.DELETE_RULE, rc.TABLE_NAME
                                  ORDER BY uc.TABLE_NAME, uc.CONSTRAINT_TYPE, uc.CONSTRAINT_NAME`);
  const indices = await q(`SELECT i.TABLE_NAME, i.INDEX_NAME, i.UNIQUENESS,
                                  LISTAGG(c.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY c.COLUMN_POSITION) AS COLUMNAS
                             FROM USER_INDEXES i JOIN USER_IND_COLUMNS c ON c.INDEX_NAME = i.INDEX_NAME
                            GROUP BY i.TABLE_NAME, i.INDEX_NAME, i.UNIQUENESS ORDER BY 1, 2`);
  const triggers = await q(`SELECT TRIGGER_NAME, TABLE_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS FROM USER_TRIGGERS ORDER BY 2, 1`);
  const conteos = {};
  for (const t of tablas) {
    conteos[t.TABLE_NAME] = (await q(`SELECT COUNT(*) N FROM ${t.TABLE_NAME}`))[0].N;
  }
  const salida = path.join(__dirname, '..', '..', '01_diseno', 'metadatos.json');
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, JSON.stringify({ tablas, columnas, restricciones, indices, triggers, conteos }, null, 2));
  console.log('Metadatos guardados en', salida);
  await conn.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
