// Aplicacion web CRUD - Sistema de Reserva de Salas Universitario (LM_RESERVASALAS)
// Node.js + Express + node-oracledb (modo Thin, no requiere Instant Client)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const oracledb = require('oracledb');
const tablas = require('./tablas');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.autoCommit = true;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let pool;

// ---------------------------------------------------------------------
// Conexion: cada peticion identifica al usuario de la aplicacion en la
// sesion de Oracle (CLIENT_IDENTIFIER). El trigger de auditoria lo lee
// con SYS_CONTEXT('USERENV','CLIENT_IDENTIFIER') para guardar "quien".
// ---------------------------------------------------------------------
async function conUsuario(req, fn) {
  const conn = await pool.getConnection();
  try {
    const usuario = (req.get('X-Usuario-App') || 'web-anonimo').slice(0, 60);
    conn.clientId = decodeURIComponent(usuario);
    conn.module = 'LM_ReservaSalas Web';
    conn.action = `${req.method} ${req.path}`.slice(0, 60);
    return await fn(conn);
  } finally {
    await conn.close();
  }
}

function meta(nombre) {
  const t = tablas[String(nombre || '').toUpperCase()];
  if (!t) {
    const e = new Error('Tabla no permitida');
    e.status = 404;
    throw e;
  }
  return t;
}

const exprSelect = (c, alias = 't') => {
  const col = `${alias}.${c.nombre}`;
  if (c.tipo === 'date') return `TO_CHAR(${col}, 'YYYY-MM-DD') AS ${c.nombre}`;
  if (c.tipo === 'datetime') return `TO_CHAR(${col}, 'YYYY-MM-DD"T"HH24:MI') AS ${c.nombre}`;
  return col;
};

const exprValor = (c, bind) => {
  if (c.tipo === 'date') return `TO_DATE(:${bind}, 'YYYY-MM-DD')`;
  if (c.tipo === 'datetime') return `TO_DATE(:${bind}, 'YYYY-MM-DD"T"HH24:MI')`;
  return `:${bind}`;
};

function convertir(c, v) {
  if (v === undefined || v === null || v === '') return null;
  if (c.tipo === 'number' || c.tipo === 'fk') {
    const n = Number(v);
    if (Number.isNaN(n)) throw Object.assign(new Error(`${c.etiqueta}: debe ser numérico`), { status: 400 });
    return n;
  }
  let s = String(v).trim();
  if (c.mayus) s = s.toUpperCase();
  return s;
}

function sqlListado(nombre, t) {
  const cols = t.columnas.map((c) => exprSelect(c));
  t.columnas.filter((c) => c.tipo === 'fk').forEach((c) => {
    cols.push(`(SELECT ${c.fk.texto} FROM ${c.fk.tabla} f WHERE f.${c.fk.valor} = t.${c.nombre}) AS ${c.nombre}__TEXTO`);
  });
  return `SELECT ${cols.join(', ')} FROM ${nombre} t`;
}

// ---------------------------------------------------------------------
// Traduccion de errores de Oracle a mensajes claros
// ---------------------------------------------------------------------
const nombresRestriccion = {
  UQ_FACULTAD_CODIGO: 'Ya existe una facultad con ese código',
  UQ_FACULTAD_NOMBRE: 'Ya existe una facultad con ese nombre',
  UQ_USUARIO_DOCUMENTO: 'Ya existe un usuario con ese documento',
  UQ_USUARIO_EMAIL: 'Ya existe un usuario con ese correo',
  UQ_EDIFICIO_CODIGO: 'Ya existe un edificio con ese código',
  UQ_TIPO_ESPACIO_NOMBRE: 'Ya existe un tipo de espacio con ese nombre',
  UQ_ESPACIO_CODIGO: 'Ya existe un espacio con ese código',
  UQ_RECURSO_NOMBRE: 'Ya existe un recurso con ese nombre',
  PK_ESPACIO_RECURSO: 'Ese recurso ya está asignado a ese espacio',
  CK_USUARIO_EMAIL: 'El correo no tiene un formato válido',
  CK_USUARIO_DOCUMENTO: 'El documento debe tener solo dígitos (6 a 15)',
  CK_FACULTAD_CODIGO: 'El código de la facultad debe ir en mayúsculas',
  CK_EDIFICIO_HORAS: 'La hora de apertura debe ser menor que la de cierre (0-24)',
  CK_EDIFICIO_PISOS: 'El número de pisos debe estar entre 1 y 30',
  CK_ESPACIO_CAPACIDAD: 'La capacidad debe estar entre 1 y 1000',
  CK_RESERVA_FECHAS: 'La fecha de fin debe ser posterior a la de inicio',
  CK_RESERVA_MISMO_DIA: 'La reserva debe iniciar y terminar el mismo día',
  CK_RESERVA_ASISTENTES: 'El número de asistentes debe ser mayor que cero',
  CK_TIPO_MAX_HORAS: 'El máximo de horas debe estar entre 1 y 12',
};

function traducirError(err) {
  const msg = err.message || String(err);
  const m = msg.match(/\(LM_RESERVASALAS\.([A-Z0-9_]+)\)/);
  const restr = m && m[1];
  if (/ORA-2000[1-5]|ORA-2010\d/.test(msg)) {
    return msg.split('\n')[0].replace(/^ORA-\d+:\s*/, '');
  }
  if (msg.includes('ORA-00001')) return nombresRestriccion[restr] || `Valor duplicado (${restr})`;
  if (msg.includes('ORA-02290')) return nombresRestriccion[restr] || `No cumple la regla ${restr}`;
  if (msg.includes('ORA-02292')) return `No se puede eliminar: hay registros que dependen de este (${restr})`;
  if (msg.includes('ORA-02291')) return `El registro relacionado no existe (${restr})`;
  if (msg.includes('ORA-01400')) return 'Falta un campo obligatorio';
  if (msg.includes('ORA-12899')) return 'Un valor es demasiado largo para el campo';
  if (msg.includes('ORA-01841') || msg.includes('ORA-01861') || msg.includes('ORA-01843')) return 'Fecha inválida';
  return msg.split('\n')[0];
}

// Restricción -> columna (se lee del diccionario de Oracle al iniciar), para
// que la interfaz muestre el error junto al campo que lo causó.
let columnaDeRestriccion = {};
// Reglas del trigger TRG_RESERVA_REGLAS (ORA-2000x) -> campo del formulario
const campoDeRegla = {
  20001: 'FECHA_INICIO', 20002: 'NUM_ASISTENTES', 20003: 'FECHA_FIN', 20004: 'FECHA_INICIO', 20005: 'ID_ESPACIO',
};

function campoDelError(err) {
  const msg = err.message || '';
  const regla = msg.match(/ORA-(2000[1-5])/);
  if (regla) return campoDeRegla[regla[1]];
  const restr = msg.match(/\(LM_RESERVASALAS\.([A-Z0-9_]+)\)/);
  if (restr && !msg.includes('ORA-02292')) return columnaDeRestriccion[restr[1]];
  const col = msg.match(/"LM_RESERVASALAS"\."[A-Z_]+"\."([A-Z0-9_]+)"/); // ORA-01400, ORA-12899
  return col ? col[1] : undefined;
}

const ruta = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(err.status || 400).json({ error: traducirError(err), campo: campoDelError(err), detalle: err.message });
  }
};

// ---------------------------------------------------------------------
// API
// ---------------------------------------------------------------------
app.get('/api/meta', (req, res) => res.json(tablas));

app.get('/api/estado', ruta(async (req, res) => {
  const r = await conUsuario(req, async (conn) => {
    const conteos = await conn.execute(Object.keys(tablas).concat('AUDITORIA')
      .map((t) => `SELECT '${t}' TABLA, COUNT(*) N FROM ${t}`).join(' UNION ALL '));
    const info = await conn.execute(
      `SELECT USER ESQUEMA, SYS_CONTEXT('USERENV','CON_NAME') PDB,
              (SELECT BANNER_FULL FROM V$VERSION WHERE ROWNUM = 1) VERSION FROM DUAL`);
    const proximas = await conn.execute(
      `SELECT r.ID_RESERVA, TO_CHAR(r.FECHA_INICIO, 'YYYY-MM-DD') DIA, TO_CHAR(r.FECHA_INICIO, 'HH24:MI') INICIO,
              TO_CHAR(r.FECHA_FIN, 'HH24:MI') FIN, e.CODIGO || ' · ' || e.NOMBRE ESPACIO,
              u.NOMBRES || ' ' || u.APELLIDOS USUARIO, r.MOTIVO, r.ESTADO
         FROM RESERVA r JOIN ESPACIO e ON e.ID_ESPACIO = r.ID_ESPACIO JOIN USUARIO u ON u.ID_USUARIO = r.ID_USUARIO
        WHERE r.FECHA_FIN >= SYSDATE AND r.ESTADO IN ('PENDIENTE', 'CONFIRMADA')
        ORDER BY r.FECHA_INICIO FETCH FIRST 6 ROWS ONLY`);
    const porEstado = await conn.execute(`SELECT ESTADO, COUNT(*) N FROM RESERVA GROUP BY ESTADO`);
    const topEspacios = await conn.execute(
      `SELECT e.CODIGO, e.NOMBRE, COUNT(*) N
         FROM RESERVA r JOIN ESPACIO e ON e.ID_ESPACIO = r.ID_ESPACIO
        WHERE r.ESTADO <> 'CANCELADA'
        GROUP BY e.CODIGO, e.NOMBRE ORDER BY N DESC, e.CODIGO FETCH FIRST 3 ROWS ONLY`);
    const indicadores = await conn.execute(
      `SELECT (SELECT COUNT(*) FROM RESERVA WHERE ESTADO IN ('PENDIENTE','CONFIRMADA') AND FECHA_FIN >= SYSDATE) ACTIVAS,
              (SELECT COUNT(*) FROM RESERVA WHERE ESTADO = 'PENDIENTE' AND FECHA_FIN >= SYSDATE) PENDIENTES,
              (SELECT COUNT(*) FROM ESPACIO WHERE ESTADO = 'DISPONIBLE') DISPONIBLES,
              (SELECT COUNT(*) FROM ESPACIO) ESPACIOS,
              (SELECT COUNT(*) FROM AUDITORIA WHERE FECHA >= TRUNC(SYSTIMESTAMP)) CAMBIOS_HOY
         FROM DUAL`);
    return {
      conteos: conteos.rows, ...info.rows[0], proximas: proximas.rows,
      porEstado: porEstado.rows, indicadores: indicadores.rows[0], topEspacios: topEspacios.rows,
    };
  });
  res.json(r);
}));

// Agenda de un día: todas las salas con sus reservas (para el tablero de ocupación)
app.get('/api/agenda', ruta(async (req, res) => {
  const r = await conUsuario(req, async (conn) => {
    let dia = /^\d{4}-\d{2}-\d{2}$/.test(req.query.dia || '') ? req.query.dia : null;
    if (!dia) {
      // Hoy si tiene reservas; si no, el próximo día con reservas activas
      const d = await conn.execute(
        `SELECT TO_CHAR(NVL(
                  (SELECT MIN(TRUNC(FECHA_INICIO)) FROM RESERVA
                    WHERE FECHA_INICIO >= TRUNC(SYSDATE) AND ESTADO IN ('PENDIENTE','CONFIRMADA')),
                  TRUNC(SYSDATE)), 'YYYY-MM-DD') DIA FROM DUAL`);
      dia = d.rows[0].DIA;
    }
    const espacios = await conn.execute(
      `SELECT e.ID_ESPACIO, e.CODIGO, e.NOMBRE, e.CAPACIDAD, e.ESTADO, t.NOMBRE TIPO,
              d.HORA_APERTURA, d.HORA_CIERRE
         FROM ESPACIO e JOIN EDIFICIO d ON d.ID_EDIFICIO = e.ID_EDIFICIO
         JOIN TIPO_ESPACIO t ON t.ID_TIPO = e.ID_TIPO
        ORDER BY d.CODIGO, e.CODIGO`);
    const reservas = await conn.execute(
      `SELECT r.ID_RESERVA, r.ID_ESPACIO, r.ESTADO, r.MOTIVO, r.NUM_ASISTENTES,
              u.NOMBRES || ' ' || u.APELLIDOS USUARIO,
              TO_CHAR(r.FECHA_INICIO, 'HH24:MI') INICIO, TO_CHAR(r.FECHA_FIN, 'HH24:MI') FIN
         FROM RESERVA r JOIN USUARIO u ON u.ID_USUARIO = r.ID_USUARIO
        WHERE r.FECHA_INICIO >= TO_DATE(:dia, 'YYYY-MM-DD') AND r.FECHA_INICIO < TO_DATE(:dia, 'YYYY-MM-DD') + 1
          AND r.ESTADO <> 'CANCELADA'
        ORDER BY r.FECHA_INICIO`, { dia });
    return { dia, espacios: espacios.rows, reservas: reservas.rows };
  });
  res.json(r);
}));

// Opciones para listas desplegables de llaves foraneas
app.get('/api/opciones/:tabla/:columna', ruta(async (req, res) => {
  const t = meta(req.params.tabla);
  const c = t.columnas.find((x) => x.nombre === req.params.columna && x.tipo === 'fk');
  if (!c) throw Object.assign(new Error('Columna no válida'), { status: 404 });
  const r = await conUsuario(req, (conn) => conn.execute(
    `SELECT ${c.fk.valor} AS VALOR, ${c.fk.texto} AS TEXTO FROM ${c.fk.tabla} ORDER BY 2`));
  res.json(r.rows);
}));

// Reporte de auditoria por fechas
app.get('/api/auditoria', ruta(async (req, res) => {
  const hoy = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const desde = req.query.desde || iso(new Date(hoy.getTime() - 30 * 864e5));
  const hasta = req.query.hasta || iso(hoy);
  const binds = { desde, hasta };
  let filtro = '';
  if (req.query.tabla) { filtro += ' AND TABLA = :tabla'; binds.tabla = String(req.query.tabla).toUpperCase(); }
  if (req.query.operacion) { filtro += ' AND OPERACION = :operacion'; binds.operacion = String(req.query.operacion).toUpperCase(); }
  if (req.query.usuario) {
    filtro += ' AND UPPER(NVL(USUARIO_APP, USUARIO_BD)) LIKE :usuario';
    binds.usuario = `%${String(req.query.usuario).toUpperCase()}%`;
  }
  const r = await conUsuario(req, (conn) => conn.execute(
    `SELECT ID_AUDITORIA, TO_CHAR(FECHA, 'YYYY-MM-DD HH24:MI:SS') AS FECHA,
            TO_CHAR(FECHA, 'YYYY-MM-DD') AS DIA, TABLA, OPERACION, ID_REGISTRO,
            USUARIO_BD, USUARIO_APP, USUARIO_SO, EQUIPO, IP, PROGRAMA,
            COLUMNAS_MODIFICADAS, DATOS_ANTERIORES, DATOS_NUEVOS
       FROM AUDITORIA
      WHERE FECHA >= TO_TIMESTAMP(:desde, 'YYYY-MM-DD')
        AND FECHA <  TO_TIMESTAMP(:hasta, 'YYYY-MM-DD') + INTERVAL '1' DAY ${filtro}
      ORDER BY ID_AUDITORIA DESC
      FETCH FIRST 3000 ROWS ONLY`, binds));
  res.json({ desde, hasta, filas: r.rows });
}));

// CRUD generico
app.get('/api/:tabla', ruta(async (req, res) => {
  const nombre = req.params.tabla.toUpperCase();
  const t = meta(nombre);
  let sql = `SELECT * FROM (${sqlListado(nombre, t)}) x`;
  const binds = {};
  if (req.query.q) {
    const campos = t.columnas.map((c) => (c.tipo === 'fk' ? `${c.nombre}__TEXTO` : c.nombre));
    sql += ` WHERE UPPER(${campos.map((c) => `NVL(TO_CHAR(x.${c}), '')`).join(" || '|' || ")}) LIKE :q`;
    binds.q = `%${String(req.query.q).toUpperCase()}%`;
  }
  sql += ` ORDER BY ${t.orden.split(',').map((s) => `x.${s.trim()}`).join(', ')}`;
  const r = await conUsuario(req, (conn) => conn.execute(sql, binds));
  res.json(r.rows);
}));

app.post('/api/:tabla', ruta(async (req, res) => {
  const nombre = req.params.tabla.toUpperCase();
  const t = meta(nombre);
  const cols = t.columnas.filter((c) => !c.auto && !c.soloLectura);
  const binds = {};
  cols.forEach((c, i) => { binds[`v${i}`] = convertir(c, req.body[c.nombre]); });
  const auto = t.columnas.find((c) => c.auto);
  let sql = `INSERT INTO ${nombre} (${cols.map((c) => c.nombre).join(', ')})
             VALUES (${cols.map((c, i) => exprValor(c, `v${i}`)).join(', ')})`;
  if (auto) {
    sql += ` RETURNING ${auto.nombre} INTO :nuevo_id`;
    binds.nuevo_id = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };
  }
  const r = await conUsuario(req, (conn) => conn.execute(sql, binds));
  res.status(201).json({ ok: true, id: auto ? r.outBinds.nuevo_id[0] : null });
}));

function wherePk(t, id, binds) {
  const partes = String(id).split('~');
  if (partes.length !== t.pk.length) throw Object.assign(new Error('Identificador inválido'), { status: 400 });
  return t.pk.map((p, i) => { binds[`pk${i}`] = Number(partes[i]); return `${p} = :pk${i}`; }).join(' AND ');
}

app.put('/api/:tabla/:id', ruta(async (req, res) => {
  const nombre = req.params.tabla.toUpperCase();
  const t = meta(nombre);
  const cols = t.columnas.filter((c) => !c.auto && !c.soloLectura && !t.pk.includes(c.nombre));
  const binds = {};
  cols.forEach((c, i) => { binds[`v${i}`] = convertir(c, req.body[c.nombre]); });
  const sql = `UPDATE ${nombre} SET ${cols.map((c, i) => `${c.nombre} = ${exprValor(c, `v${i}`)}`).join(', ')}
                WHERE ${wherePk(t, req.params.id, binds)}`;
  const r = await conUsuario(req, (conn) => conn.execute(sql, binds));
  if (!r.rowsAffected) throw Object.assign(new Error('Registro no encontrado'), { status: 404 });
  res.json({ ok: true });
}));

app.delete('/api/:tabla/:id', ruta(async (req, res) => {
  const nombre = req.params.tabla.toUpperCase();
  const t = meta(nombre);
  const binds = {};
  const r = await conUsuario(req, (conn) => conn.execute(
    `DELETE FROM ${nombre} WHERE ${wherePk(t, req.params.id, binds)}`, binds));
  if (!r.rowsAffected) throw Object.assign(new Error('Registro no encontrado'), { status: 404 });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------
async function iniciar() {
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT,
    poolMin: 1,
    poolMax: 5,
  });
  const conn = await pool.getConnection();
  try {
    const r = await conn.execute(
      `SELECT CONSTRAINT_NAME, MIN(COLUMN_NAME) KEEP (DENSE_RANK LAST ORDER BY POSITION) COLUMNA
         FROM USER_CONS_COLUMNS GROUP BY CONSTRAINT_NAME`);
    columnaDeRestriccion = Object.fromEntries(r.rows.map((x) => [x.CONSTRAINT_NAME, x.COLUMNA]));
    // CHECK con varias columnas: el campo más útil para corregir
    Object.assign(columnaDeRestriccion, { CK_RESERVA_FECHAS: 'FECHA_FIN', CK_RESERVA_MISMO_DIA: 'FECHA_FIN', CK_EDIFICIO_HORAS: 'HORA_CIERRE' });
  } finally {
    await conn.close();
  }
  const puerto = Number(process.env.PORT || 3000);
  app.listen(puerto, () => console.log(`LM_ReservaSalas web en http://localhost:${puerto}`));
}

iniciar().catch((e) => {
  console.error('No se pudo iniciar:', e.message);
  process.exit(1);
});
