// Metadatos de las tablas del modelo relacional.
// La aplicacion genera el CRUD (listar, crear, editar, eliminar) a partir de aqui.
//
// tipos de columna:
//   number | text | email | date | datetime | enum (opciones) | fk (llave foranea)

const tablas = {
  FACULTAD: {
    titulo: 'Facultades',
    pk: ['ID_FACULTAD'],
    orden: 'ID_FACULTAD',
    columnas: [
      { nombre: 'ID_FACULTAD', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'CODIGO', etiqueta: 'Código', tipo: 'text', requerido: true, max: 10, mayus: true },
      { nombre: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 100 },
      { nombre: 'DECANO', etiqueta: 'Decano', tipo: 'text', max: 100 },
      { nombre: 'TELEFONO', etiqueta: 'Teléfono', tipo: 'text', max: 20 },
    ],
  },
  USUARIO: {
    titulo: 'Usuarios',
    pk: ['ID_USUARIO'],
    orden: 'ID_USUARIO',
    columnas: [
      { nombre: 'ID_USUARIO', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'DOCUMENTO', etiqueta: 'Documento', tipo: 'text', requerido: true, max: 15, patron: '[0-9]{6,15}' },
      { nombre: 'NOMBRES', etiqueta: 'Nombres', tipo: 'text', requerido: true, max: 60 },
      { nombre: 'APELLIDOS', etiqueta: 'Apellidos', tipo: 'text', requerido: true, max: 60 },
      { nombre: 'EMAIL', etiqueta: 'Correo', tipo: 'email', requerido: true, max: 120 },
      { nombre: 'TELEFONO', etiqueta: 'Teléfono', tipo: 'text', max: 20 },
      { nombre: 'TIPO_USUARIO', etiqueta: 'Tipo', tipo: 'enum', requerido: true,
        opciones: ['ESTUDIANTE', 'PROFESOR', 'PERSONAL', 'ADMINISTRADOR'] },
      { nombre: 'ID_FACULTAD', etiqueta: 'Facultad', tipo: 'fk', requerido: true,
        fk: { tabla: 'FACULTAD', valor: 'ID_FACULTAD', texto: "CODIGO || ' - ' || NOMBRE" } },
      { nombre: 'ESTADO', etiqueta: 'Estado', tipo: 'enum', requerido: true, opciones: ['ACTIVO', 'INACTIVO'], defecto: 'ACTIVO' },
      { nombre: 'FECHA_REGISTRO', etiqueta: 'Registro', tipo: 'date', soloLectura: true },
    ],
  },
  EDIFICIO: {
    titulo: 'Edificios',
    pk: ['ID_EDIFICIO'],
    orden: 'ID_EDIFICIO',
    columnas: [
      { nombre: 'ID_EDIFICIO', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'CODIGO', etiqueta: 'Código', tipo: 'text', requerido: true, max: 10 },
      { nombre: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 100 },
      { nombre: 'UBICACION', etiqueta: 'Ubicación', tipo: 'text', max: 150 },
      { nombre: 'NUM_PISOS', etiqueta: 'Pisos', tipo: 'number', requerido: true, min: 1, maxv: 30 },
      { nombre: 'HORA_APERTURA', etiqueta: 'Abre (h)', tipo: 'number', requerido: true, min: 0, maxv: 23, defecto: 6 },
      { nombre: 'HORA_CIERRE', etiqueta: 'Cierra (h)', tipo: 'number', requerido: true, min: 1, maxv: 24, defecto: 22 },
    ],
  },
  TIPO_ESPACIO: {
    titulo: 'Tipos de espacio',
    pk: ['ID_TIPO'],
    orden: 'ID_TIPO',
    columnas: [
      { nombre: 'ID_TIPO', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'DESCRIPCION', etiqueta: 'Descripción', tipo: 'text', max: 200 },
      { nombre: 'MAX_HORAS', etiqueta: 'Máx. horas', tipo: 'number', requerido: true, min: 1, maxv: 12, defecto: 2 },
      { nombre: 'REQUIERE_APROBACION', etiqueta: 'Requiere aprobación', tipo: 'enum', requerido: true, opciones: ['S', 'N'], defecto: 'N' },
    ],
  },
  ESPACIO: {
    titulo: 'Espacios',
    pk: ['ID_ESPACIO'],
    orden: 'ID_ESPACIO',
    columnas: [
      { nombre: 'ID_ESPACIO', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'CODIGO', etiqueta: 'Código', tipo: 'text', requerido: true, max: 15 },
      { nombre: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 100 },
      { nombre: 'ID_EDIFICIO', etiqueta: 'Edificio', tipo: 'fk', requerido: true,
        fk: { tabla: 'EDIFICIO', valor: 'ID_EDIFICIO', texto: "CODIGO || ' - ' || NOMBRE" } },
      { nombre: 'ID_TIPO', etiqueta: 'Tipo', tipo: 'fk', requerido: true,
        fk: { tabla: 'TIPO_ESPACIO', valor: 'ID_TIPO', texto: 'NOMBRE' } },
      { nombre: 'PISO', etiqueta: 'Piso', tipo: 'number', requerido: true, min: 0, maxv: 30 },
      { nombre: 'CAPACIDAD', etiqueta: 'Capacidad', tipo: 'number', requerido: true, min: 1, maxv: 1000 },
      { nombre: 'ESTADO', etiqueta: 'Estado', tipo: 'enum', requerido: true,
        opciones: ['DISPONIBLE', 'MANTENIMIENTO', 'INACTIVO'], defecto: 'DISPONIBLE' },
    ],
  },
  RECURSO: {
    titulo: 'Recursos',
    pk: ['ID_RECURSO'],
    orden: 'ID_RECURSO',
    columnas: [
      { nombre: 'ID_RECURSO', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 60 },
      { nombre: 'DESCRIPCION', etiqueta: 'Descripción', tipo: 'text', max: 200 },
    ],
  },
  ESPACIO_RECURSO: {
    titulo: 'Recursos por espacio',
    pk: ['ID_ESPACIO', 'ID_RECURSO'],
    orden: 'ID_ESPACIO, ID_RECURSO',
    columnas: [
      { nombre: 'ID_ESPACIO', etiqueta: 'Espacio', tipo: 'fk', requerido: true, pkEditable: true,
        fk: { tabla: 'ESPACIO', valor: 'ID_ESPACIO', texto: "CODIGO || ' - ' || NOMBRE" } },
      { nombre: 'ID_RECURSO', etiqueta: 'Recurso', tipo: 'fk', requerido: true, pkEditable: true,
        fk: { tabla: 'RECURSO', valor: 'ID_RECURSO', texto: 'NOMBRE' } },
      { nombre: 'CANTIDAD', etiqueta: 'Cantidad', tipo: 'number', requerido: true, min: 1, maxv: 9999, defecto: 1 },
    ],
  },
  RESERVA: {
    titulo: 'Reservas',
    pk: ['ID_RESERVA'],
    orden: 'FECHA_INICIO DESC',
    columnas: [
      { nombre: 'ID_RESERVA', etiqueta: 'ID', tipo: 'number', auto: true },
      { nombre: 'ID_USUARIO', etiqueta: 'Usuario', tipo: 'fk', requerido: true,
        fk: { tabla: 'USUARIO', valor: 'ID_USUARIO', texto: "NOMBRES || ' ' || APELLIDOS || ' (' || TIPO_USUARIO || ')'" } },
      { nombre: 'ID_ESPACIO', etiqueta: 'Espacio', tipo: 'fk', requerido: true,
        fk: { tabla: 'ESPACIO', valor: 'ID_ESPACIO', texto: "CODIGO || ' - ' || NOMBRE || ' (cap. ' || CAPACIDAD || ')'" } },
      { nombre: 'FECHA_INICIO', etiqueta: 'Inicio', tipo: 'datetime', requerido: true },
      { nombre: 'FECHA_FIN', etiqueta: 'Fin', tipo: 'datetime', requerido: true },
      { nombre: 'NUM_ASISTENTES', etiqueta: 'Asistentes', tipo: 'number', requerido: true, min: 1, maxv: 9999, defecto: 1 },
      { nombre: 'MOTIVO', etiqueta: 'Motivo', tipo: 'text', requerido: true, max: 200 },
      { nombre: 'ESTADO', etiqueta: 'Estado', tipo: 'enum', requerido: true,
        opciones: ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'FINALIZADA'], defecto: 'PENDIENTE' },
      { nombre: 'FECHA_CREACION', etiqueta: 'Creada', tipo: 'date', soloLectura: true },
      { nombre: 'OBSERVACION', etiqueta: 'Observación', tipo: 'text', max: 300 },
    ],
  },
};

module.exports = tablas;
