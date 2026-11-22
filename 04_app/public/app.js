// Interfaz web: CRUD genérico + reporte de auditoría (LM_RESERVASALAS)
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------------------------------------------------------ iconos (trazos estilo Lucide)
const ICONOS = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  FACULTAD: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  USUARIO: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>',
  EDIFICIO: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  TIPO_ESPACIO: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  ESPACIO: '<path d="M3 21h18"/><path d="M6 21V4a1 1 0 0 1 1-1h8l3 2v16"/><path d="M14 12h.01"/>',
  RECURSO: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  ESPACIO_RECURSO: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  RESERVA: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  auditoria: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  borrar: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  luna: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  imprimir: '<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
  descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  orden: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  arriba: '<path d="m7 14 5-5 5 5"/>',
  abajo: '<path d="m7 10 5 5 5-5"/>',
  derecha: '<path d="m9 18 6-6-6-6"/>',
  izquierda: '<path d="m15 18-6-6 6-6"/>',
  vacio: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  puerta: '<path d="M3 21h18"/><path d="M6 21V4a1 1 0 0 1 1-1h8l3 2v16"/><path d="M14 12h.01"/>',
};
const icono = (n, clase = '') => `<svg class="ic ${clase}" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n] || ''}</svg>`;

let META = {};
let CONTEOS = {};

// ------------------------------------------------------------------ tema claro / oscuro
const btnTema = $('#btnTema');
function pintarTema() {
  const oscuro = document.documentElement.dataset.theme === 'dark';
  btnTema.innerHTML = icono(oscuro ? 'sol' : 'luna');
  btnTema.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}
btnTema.onclick = () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('tema', t); } catch { /* ignore */ }
  pintarTema();
};
pintarTema();

// ------------------------------------------------------------------ menú móvil
const appEl = $('#app');
const btnMenu = $('#btnMenu');
btnMenu.onclick = () => {
  const abierto = appEl.classList.toggle('menu-abierto');
  btnMenu.setAttribute('aria-expanded', String(abierto));
};
appEl.addEventListener('click', (e) => {
  if (appEl.classList.contains('menu-abierto') && !e.target.closest('.sidebar') && !e.target.closest('#btnMenu')) {
    appEl.classList.remove('menu-abierto');
    btnMenu.setAttribute('aria-expanded', 'false');
  }
});

// ------------------------------------------------------------------ usuario de la aplicación
const inpUsuario = $('#usuarioApp');
try { inpUsuario.value = localStorage.getItem('usuarioApp') || ''; } catch { /* ignore */ }
inpUsuario.addEventListener('input', () => {
  $('#cajaUsuario').classList.remove('falta');
  try { localStorage.setItem('usuarioApp', inpUsuario.value.trim()); } catch { /* ignore */ }
});

function exigirUsuario() {
  if (inpUsuario.value.trim()) return true;
  $('#cajaUsuario').classList.add('falta');
  aviso('Escribe tu usuario (arriba a la derecha): la auditoría registra quién hace cada cambio.', true);
  inpUsuario.focus();
  return false;
}

// ------------------------------------------------------------------ API
async function api(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      'X-Usuario-App': encodeURIComponent(inpUsuario.value.trim() || 'web-anonimo'),
      ...(opciones.headers || {}),
    },
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || `Error ${r.status}`), { campo: datos.campo });
  return datos;
}

// ------------------------------------------------------------------ avisos (toasts)
function aviso(texto, error = false) {
  const t = document.createElement('div');
  t.className = `toast ${error ? 'error' : 'ok'}`;
  t.innerHTML = `${icono(error ? 'alerta' : 'ok')}<span>${esc(texto)}</span>`;
  $('#toasts').append(t);
  setTimeout(() => {
    t.classList.add('salir');
    setTimeout(() => t.remove(), 180);
  }, error ? 6000 : 3500);
}

// ------------------------------------------------------------------ confirmación
function confirmar(texto, etiqueta = 'Eliminar', titulo = 'Eliminar registro') {
  const d = $('#dlgConfirmar');
  $('#confTitulo').textContent = titulo;
  $('#confTexto').textContent = texto;
  $('#confSi').textContent = etiqueta;
  d.showModal();
  $('#confNo').focus();
  return new Promise((ok) => {
    const fin = (v) => { d.close(); ok(v); };
    $('#confSi').onclick = () => fin(true);
    $('#confNo').onclick = () => fin(false);
    d.oncancel = () => ok(false);
  });
}

// ------------------------------------------------------------------ navegación
function pintarMenu() {
  const m = $('#menu');
  const item = (v, texto, cuenta) => `<button class="nav-item" data-v="${v}">${icono(v)}<span>${esc(texto)}</span>${cuenta !== undefined ? `<span class="cuenta">${cuenta}</span>` : ''}</button>`;
  m.innerHTML = `<div class="nav-grupo">General</div>${item('inicio', 'Agenda de salas')}
    <div class="nav-grupo">Reservas</div>${item('RESERVA', META.RESERVA.titulo, CONTEOS.RESERVA)}
    ${item('ESPACIO', META.ESPACIO.titulo, CONTEOS.ESPACIO)}${item('USUARIO', META.USUARIO.titulo, CONTEOS.USUARIO)}
    <div class="nav-grupo">Catálogos</div>
    ${['EDIFICIO', 'TIPO_ESPACIO', 'RECURSO', 'ESPACIO_RECURSO', 'FACULTAD'].map((k) => item(k, META[k].titulo, CONTEOS[k])).join('')}
    <div class="nav-grupo">Control</div>${item('auditoria', 'Reporte de auditoría', CONTEOS.AUDITORIA)}`;
  m.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    appEl.classList.remove('menu-abierto');
    ir(b.dataset.v);
  };
}

function marcarActivo(v, titulo) {
  document.querySelectorAll('#menu .nav-item').forEach((b) => {
    if (b.dataset.v === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#migas').innerHTML = v === 'inicio' ? '<b>Agenda de salas</b>' : `<span>Agenda</span>${icono('derecha', 'ic-sm')}<b>${esc(titulo)}</b>`;
  document.title = `${titulo} · Reserva de Salas LM`;
}

function ir(v) {
  if (location.hash.slice(1) !== v) history.pushState(null, '', `#${v}`);
  mostrar(v);
}
// enfocar: al navegar, el foco pasa al contenido nuevo (lectores de pantalla).
// En la carga inicial no se mueve, para que Tab empiece por el menú.
function mostrar(v, enfocar = true) {
  if (META[v]) { marcarActivo(v, META[v].titulo); vistaTabla(v); }
  else if (v === 'auditoria') { marcarActivo(v, 'Reporte de auditoría'); vistaAuditoria(); }
  else { marcarActivo('inicio', 'Agenda de salas'); vistaInicio(); }
  if (enfocar) $('#vista').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', () => mostrar(location.hash.slice(1) || 'inicio'));

async function refrescarConteos() {
  try {
    const e = await api('/api/estado');
    CONTEOS = Object.fromEntries(e.conteos.map((c) => [c.TABLA, c.N]));
    document.querySelectorAll('#menu .nav-item').forEach((b) => {
      const k = b.dataset.v === 'auditoria' ? 'AUDITORIA' : b.dataset.v;
      const c = b.querySelector('.cuenta');
      if (c && CONTEOS[k] !== undefined) c.textContent = CONTEOS[k];
    });
    return e;
  } catch { return null; }
}

// ------------------------------------------------------------------ utilidades de presentación
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const TONO_ESTADO = {
  ACTIVO: 'ok', DISPONIBLE: 'ok', CONFIRMADA: 'ok', INSERT: 'ok',
  PENDIENTE: 'warn', MANTENIMIENTO: 'warn', UPDATE: 'warn',
  INACTIVO: 'danger', CANCELADA: 'danger', DELETE: 'danger',
  FINALIZADA: 'neutral', S: 'info', N: 'neutral',
};
// Los valores se guardan en mayúsculas en Oracle; en pantalla se leen como texto normal
const ETIQUETA = {
  ACTIVO: 'Activo', INACTIVO: 'Inactivo', DISPONIBLE: 'Disponible', MANTENIMIENTO: 'Mantenimiento',
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', FINALIZADA: 'Finalizada',
  ESTUDIANTE: 'Estudiante', PROFESOR: 'Profesor', PERSONAL: 'Personal', ADMINISTRADOR: 'Administrador',
  INSERT: 'Inserción', UPDATE: 'Actualización', DELETE: 'Eliminación', S: 'Sí', N: 'No',
};
const chip = (v) => `<span class="chip ${TONO_ESTADO[v] || 'neutral'}">${esc(ETIQUETA[v] || v)}</span>`;
const COLOR_ESTADO = { CONFIRMADA: 'var(--morado)', PENDIENTE: 'var(--lima)', CANCELADA: 'var(--magenta)', FINALIZADA: 'var(--border-strong)' };
// Nombre de un registro de cada tabla (para títulos, botones y avisos)
const SINGULAR = {
  FACULTAD: ['facultad', 'f'], USUARIO: ['usuario', 'm'], EDIFICIO: ['edificio', 'm'], TIPO_ESPACIO: ['tipo de espacio', 'm'],
  ESPACIO: ['espacio', 'm'], RECURSO: ['recurso', 'm'], ESPACIO_RECURSO: ['recurso de un espacio', 'm'], RESERVA: ['reserva', 'f'],
};
const nuevoDe = (t) => { const [n, g] = SINGULAR[t]; return `${g === 'f' ? 'Nueva' : 'Nuevo'} ${n}`; };
const hechoDe = (t, verbo) => {
  const [n, g] = SINGULAR[t];
  const fin = g === 'f' ? 'a' : 'o';
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${verbo}${fin}`;
};

function cabecera(titulo, subtitulo, extra = '') {
  return `<div class="cabecera"><div><h1>${esc(titulo)}</h1><p>${subtitulo}</p></div>${extra}</div>`;
}

// ------------------------------------------------------------------ inicio: tablero de ocupación
const H_INI = 6;
const H_FIN = 22;
const HORAS = H_FIN - H_INI;
const aHoras = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };
const pct = (h) => `${((Math.min(Math.max(h, H_INI), H_FIN) - H_INI) / HORAS) * 100}%`;
const dosDig = (n) => String(n).padStart(2, '0');
let diaAgenda = null;

function moverDia(iso, dias) {
  const d = new Date(`${iso}T12:00`);
  d.setDate(d.getDate() + dias);
  return isoHoy(d);
}

async function vistaInicio(dia) {
  const vista = $('#vista');
  vista.innerHTML = `<div class="hoy"><div><h1>Agenda de salas</h1><p>Cargando ocupación…</p></div></div>
    <div class="tarjeta tablero"><div style="padding:24px;display:grid;gap:14px">${'<div class="esqueleto"></div>'.repeat(6)}</div></div>`;
  let e;
  let ag;
  try {
    [e, ag] = await Promise.all([refrescarConteos(), api(`/api/agenda${dia ? `?dia=${dia}` : ''}`)]);
  } catch { e = null; }
  if (!e || !ag) {
    vista.innerHTML = `<div class="tarjeta"><div class="vacio">${icono('alerta')}<b>No hay conexión con la base de datos</b>Verifica que el servicio de Oracle esté iniciado y recarga la página.</div></div>`;
    return;
  }
  diaAgenda = ag.dia;
  const hoy = isoHoy();
  const fecha = new Date(`${ag.dia}T12:00`);
  const tituloMin = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const titulo = tituloMin.charAt(0).toUpperCase() + tituloMin.slice(1);
  const nota = ag.dia === hoy ? 'Hoy'
    : (!dia ? 'No hay reservas hoy; este es el próximo día con reservas' : fecha.toLocaleDateString('es-CO', { year: 'numeric' }));
  const porSala = {};
  ag.reservas.forEach((r) => { (porSala[r.ID_ESPACIO] = porSala[r.ID_ESPACIO] || []).push(r); });

  const escala = Array.from({ length: HORAS }, (_, i) => H_INI + i)
    .map((h) => `<span style="left:${pct(h)}">${h}</span>`).join('');
  const ahora = new Date();
  const hAhora = ahora.getHours() + ahora.getMinutes() / 60;
  const marcaAhora = ag.dia === hoy && hAhora > H_INI && hAhora < H_FIN ? `<i class="tb-ahora" style="left:${pct(hAhora)}"></i>` : '';

  const filas = ag.espacios.map((s) => {
    const mant = s.ESTADO !== 'DISPONIBLE';
    const cerrado = [
      s.HORA_APERTURA > H_INI ? `<i class="tb-cerrado" style="left:0;width:${pct(s.HORA_APERTURA)}"></i>` : '',
      s.HORA_CIERRE < H_FIN ? `<i class="tb-cerrado" style="left:${pct(s.HORA_CIERRE)};right:0"></i>` : '',
    ].join('');
    const bloques = (porSala[s.ID_ESPACIO] || []).map((r) => {
      const a = aHoras(r.INICIO);
      const b = aHoras(r.FIN);
      const ancho = `calc(${pct(b)} - ${pct(a)} - 2px)`;
      // El nombre accesible empieza por el texto visible y añade sala y estado solo para lectores de pantalla
      return `<button class="tb-bloque ${r.ESTADO}" style="left:calc(${pct(a)} + 1px);width:${ancho}" data-reserva="${r.ID_RESERVA}"
        title="${esc(`${r.INICIO}–${r.FIN} ${r.MOTIVO} (${r.USUARIO})`)}"><b>${esc(r.MOTIVO)}</b><span>${esc(r.INICIO)}–${esc(r.FIN)}, ${esc(r.USUARIO)}</span><span class="sr-only">, en ${esc(s.CODIGO)}, ${ETIQUETA[r.ESTADO] || r.ESTADO}. Editar</span></button>`;
    }).join('');
    return `<div class="tb-fila${mant ? ' mant' : ''}" data-espacio="${s.ID_ESPACIO}" data-abre="${s.HORA_APERTURA}" data-cierra="${s.HORA_CIERRE}">
      <div class="tb-sala"><span class="placa">${esc(s.CODIGO)}</span><small>${mant ? 'En mantenimiento' : `${esc(s.NOMBRE)}, ${s.CAPACIDAD} ${s.CAPACIDAD === 1 ? 'persona' : 'personas'}`}</small></div>
      <div class="tb-pista" style="--horas:${HORAS}">${cerrado}${bloques}${marcaAhora}</div></div>`;
  }).join('');

  const ind = e.indicadores;
  const total = e.porEstado.reduce((n, x) => n + x.N, 0) || 1;
  const orden = ['CONFIRMADA', 'PENDIENTE', 'FINALIZADA', 'CANCELADA'];
  const estados = orden.map((k) => ({ k, n: (e.porEstado.find((x) => x.ESTADO === k) || {}).N || 0 }));
  const maxTop = Math.max(1, ...e.topEspacios.map((x) => x.N));
  const MES = (m) => MESES[Number(m) - 1];

  vista.innerHTML = `
    <div class="hoy">
      <div><h1>${esc(titulo)}</h1><p>${esc(nota)}. ${ag.reservas.length} ${ag.reservas.length === 1 ? 'reserva' : 'reservas'} en ${ag.espacios.length} salas.</p></div>
      <div class="hoy-acc">
        <div class="pasos" role="group" aria-label="Cambiar de día">
          <button id="diaAnt" aria-label="Día anterior">${icono('izquierda')}</button>
          <button id="diaHoy">Hoy</button>
          <button id="diaSig" aria-label="Día siguiente">${icono('derecha')}</button>
        </div>
        <button class="btn btn-pri" id="nuevaReserva">${icono('mas')}Nueva reserva</button>
      </div>
    </div>

    <section class="tarjeta tablero" aria-labelledby="tbTitulo">
      <h2 id="tbTitulo" class="sr-only">Ocupación de las salas por hora</h2>
      <div class="tb">
        <div class="tb-escala" aria-hidden="true"><div class="tb-sala">Sala</div><div class="tb-horas">${escala}</div></div>
        ${filas}
      </div>
      <div class="tb-pie">
        <span><i class="c"></i>Confirmada</span><span><i class="p"></i>Pendiente</span>
        <span><i class="f"></i>Finalizada</span><span><i class="x"></i>Edificio cerrado</span>
        <span class="ayuda-tb">Haz clic en un hueco libre para reservar esa sala a esa hora.</span>
      </div>
    </section>

    <div class="cifras">
      <button data-ir="RESERVA"><b>${ind.ACTIVAS}</b><span>reservas activas</span></button>
      <button data-ir="RESERVA"><b>${ind.PENDIENTES}</b><span>pendientes de aprobación</span></button>
      <button data-ir="ESPACIO"><b>${ind.DISPONIBLES}<small> de ${ind.ESPACIOS}</small></b><span>salas disponibles</span></button>
      <button data-ir="auditoria"><b>${ind.CAMBIOS_HOY}</b><span>cambios auditados hoy</span></button>
    </div>

    <div class="inicio-bajo">
      <section class="bloque-sec" aria-labelledby="bProx">
        <h2 id="bProx">Próximas reservas <button class="enlace" data-ir="RESERVA">Ver todas</button></h2>
        ${e.proximas.length ? `<ul class="lista-res">${e.proximas.slice(0, 5).map((r) => {
          const [, m, d] = r.DIA.split('-');
          return `<li><div class="fecha-cal"><b>${Number(d)}</b><span>${MES(m)}</span></div>
            <div><div class="tit">${esc(r.MOTIVO)}</div><div class="det">${esc(r.INICIO)}–${esc(r.FIN)} en ${esc(r.ESPACIO.replace(' · ', ', '))}</div><div class="det">${esc(r.USUARIO)}</div></div>
            ${chip(r.ESTADO)}</li>`;
        }).join('')}</ul>` : `<div class="vacio">${icono('vacio')}<b>No hay reservas próximas</b>Crea una con «Nueva reserva».</div>`}
      </section>
      <div>
        <section class="bloque-sec" aria-labelledby="bEst">
          <h2 id="bEst">Reservas por estado</h2>
          <div class="barra-estados" role="img" aria-label="${estados.map((s) => `${ETIQUETA[s.k]}: ${s.n}`).join(', ')}">
            ${estados.map((s) => `<i style="width:${(s.n / total) * 100}%;background:${COLOR_ESTADO[s.k]}"></i>`).join('')}
          </div>
          <ul class="leyenda">${estados.map((s) => `<li><span class="sw" style="background:${COLOR_ESTADO[s.k]}"></span>${ETIQUETA[s.k]}<b>${s.n}</b></li>`).join('')}</ul>
        </section>
        <section class="bloque-sec" aria-labelledby="bTop">
          <h2 id="bTop">Salas más solicitadas</h2>
          <ol class="ranking">${e.topEspacios.map((x) => `<li><span class="r-nom"><span class="placa">${esc(x.CODIGO)}</span>${esc(x.NOMBRE)}</span>
            <b>${x.N}</b><span class="r-barra" aria-hidden="true"><i style="width:${(x.N / maxTop) * 100}%"></i></span></li>`).join('')}</ol>
        </section>
        <section class="bloque-sec" aria-labelledby="bTab">
          <h2 id="bTab">Registros por tabla</h2>
          <div class="tablas-mini">
            ${e.conteos.map((c) => `<button data-ir="${c.TABLA === 'AUDITORIA' ? 'auditoria' : c.TABLA}"><span>${esc(META[c.TABLA]?.titulo || 'Auditoría')}</span><b>${c.N}</b></button>`).join('')}
          </div>
        </section>
      </div>
    </div>`;

  vista.querySelectorAll('[data-ir]').forEach((b) => { b.onclick = () => ir(b.dataset.ir); });
  $('#diaAnt').onclick = () => vistaInicio(moverDia(diaAgenda, -1));
  $('#diaSig').onclick = () => vistaInicio(moverDia(diaAgenda, 1));
  $('#diaHoy').onclick = () => vistaInicio(hoy);
  const recargar = () => vistaInicio(diaAgenda);
  $('#nuevaReserva').onclick = () => abrirForm('RESERVA', null, {}, recargar);

  vista.querySelector('.tb').onclick = async (ev) => {
    const bloque = ev.target.closest('.tb-bloque');
    if (bloque) {
      const todas = await api('/api/RESERVA');
      const fila = todas.find((x) => String(x.ID_RESERVA) === bloque.dataset.reserva);
      if (fila) abrirForm('RESERVA', fila, {}, recargar);
      return;
    }
    const pista = ev.target.closest('.tb-pista');
    const filaEl = ev.target.closest('.tb-fila');
    if (!pista || filaEl.classList.contains('mant')) return;
    const caja = pista.getBoundingClientRect();
    let h = Math.floor(H_INI + ((ev.clientX - caja.left) / caja.width) * HORAS);
    h = Math.min(Math.max(h, Number(filaEl.dataset.abre)), Number(filaEl.dataset.cierra) - 1);
    abrirForm('RESERVA', null, {
      ID_ESPACIO: filaEl.dataset.espacio,
      FECHA_INICIO: `${diaAgenda}T${dosDig(h)}:00`,
      FECHA_FIN: `${diaAgenda}T${dosDig(h + 1)}:00`,
    }, recargar);
  };
}

// ------------------------------------------------------------------ CRUD
const idFila = (t, fila) => t.pk.map((p) => fila[p]).join('~');
const estadoTabla = {};

function celda(c, fila) {
  const v = fila[c.nombre];
  if (v === null || v === undefined || v === '') return '<td></td>';
  if (c.auto) return `<td class="num"><span class="id">${esc(v)}</span></td>`;
  if (c.tipo === 'fk') {
    let txt = String(fila[`${c.nombre}__TEXTO`] ?? v);
    let detalle = '';
    const m = txt.match(/^(.*?) \((.*)\)$/);
    if (m) { [, txt, detalle] = m; }
    detalle = detalle.replace(/^cap\. (\d+)$/, (_, n) => `${n} ${n === '1' ? 'persona' : 'personas'}`).replace(/^(ESTUDIANTE|PROFESOR|PERSONAL|ADMINISTRADOR)$/, (x) => ETIQUETA[x]);
    const cod = txt.match(/^(\S+) - (.*)$/);
    const principal = cod ? `<span class="placa">${esc(cod[1])}</span> ${esc(cod[2])}` : esc(txt);
    return `<td class="fk">${principal}${detalle ? `<small>${esc(detalle)}</small>` : ''}</td>`;
  }
  if (c.tipo === 'enum') return `<td>${chip(v)}</td>`;
  if (c.tipo === 'number') return `<td class="num">${esc(v)}</td>`;
  if (c.tipo === 'datetime') {
    const [d, h] = String(v).split('T');
    return `<td class="fecha">${esc(d)} <span class="hora">${esc(h)}</span></td>`;
  }
  if (c.tipo === 'date') return `<td class="fecha">${esc(v)}</td>`;
  if (c.nombre === 'CODIGO') return `<td><span class="placa">${esc(v)}</span></td>`;
  return `<td>${esc(v)}</td>`;
}

async function vistaTabla(nombre) {
  const t = META[nombre];
  estadoTabla[nombre] = estadoTabla[nombre] || { q: '', col: null, dir: 1 };
  const st = estadoTabla[nombre];
  const vista = $('#vista');
  vista.innerHTML = cabecera(t.titulo, `Busca, ordena, crea, edita o elimina. Los cambios quedan en la auditoría.`,
    `<button class="btn btn-pri" id="nuevo">${icono('mas')}${nuevoDe(nombre)}</button>`) + `
    <div class="barra-herr">
      <label class="campo buscador"><span class="sr-only">Buscar en ${esc(t.titulo)}</span>${icono('buscar', 'ic-sm')}
        <input id="buscar" type="search" value="${esc(st.q)}" placeholder="Buscar en ${esc(t.titulo.toLowerCase())}…" class="control"></label>
      <span class="espacio"></span><span class="conteo" id="conteo"></span>
    </div>
    <div class="tarjeta"><div class="tabla-env" id="lista">${esqueletoTabla(t)}</div></div>`;
  $('#nuevo').onclick = () => abrirForm(nombre, null);
  let tm;
  $('#buscar').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { st.q = e.target.value; cargarLista(nombre); }, 300); };
  await cargarLista(nombre);
}

function esqueletoTabla(t) {
  const fila = `<tr>${t.columnas.map(() => '<td><div class="esqueleto"></div></td>').join('')}<td></td></tr>`;
  return `<table><thead><tr>${t.columnas.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('')}<th></th></tr></thead><tbody>${fila.repeat(6)}</tbody></table>`;
}

let datosTabla = {};
async function cargarLista(nombre) {
  const t = META[nombre];
  const st = estadoTabla[nombre];
  const caja = $('#lista');
  try {
    datosTabla[nombre] = await api(`/api/${nombre}${st.q ? `?q=${encodeURIComponent(st.q)}` : ''}`);
    pintarLista(nombre);
  } catch (err) {
    caja.innerHTML = `<div class="vacio">${icono('alerta')}<b>No se pudo cargar</b>${esc(err.message)}</div>`;
  }
  void t;
}

function pintarLista(nombre) {
  const t = META[nombre];
  const st = estadoTabla[nombre];
  const caja = $('#lista');
  if (!caja) return;
  let filas = [...datosTabla[nombre]];
  $('#conteo').textContent = `${filas.length} registro${filas.length === 1 ? '' : 's'}`;
  if (!filas.length) {
    caja.innerHTML = `<div class="vacio">${icono('vacio')}<b>${st.q ? 'Sin resultados' : 'Sin registros'}</b>${st.q ? `Nada coincide con «${esc(st.q)}».` : `Crea el primero con «${nuevoDe(nombre)}».`}</div>`;
    return;
  }
  if (st.col) {
    const c = t.columnas.find((x) => x.nombre === st.col);
    const val = (f) => (c.tipo === 'fk' ? f[`${c.nombre}__TEXTO`] : f[c.nombre]);
    filas.sort((a, b) => {
      const x = val(a); const y = val(b);
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true })) * st.dir;
    });
  }
  const th = (c) => {
    const activo = st.col === c.nombre;
    const sort = activo ? ` aria-sort="${st.dir === 1 ? 'ascending' : 'descending'}"` : '';
    const ic = activo ? (st.dir === 1 ? 'arriba' : 'abajo') : 'orden';
    return `<th class="${c.tipo === 'number' ? 'num' : ''}"${sort}><button class="orden" data-col="${c.nombre}">${esc(c.etiqueta)}${icono(ic, 'ic-sm')}</button></th>`;
  };
  caja.innerHTML = `<table><thead><tr>${t.columnas.map(th).join('')}<th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${filas.map((f) => {
      const id = esc(idFila(t, f));
      return `<tr>${t.columnas.map((c) => celda(c, f)).join('')}
        <td class="acc"><button class="btn-fila" data-ed="${id}" aria-label="Editar registro ${id.replace('~', ' / ')}" title="Editar">${icono('editar')}</button>
        <button class="btn-fila borrar" data-del="${id}" aria-label="Eliminar registro ${id.replace('~', ' / ')}" title="Eliminar">${icono('borrar')}</button></td></tr>`;
    }).join('')}</tbody></table>`;
  caja.onclick = (e) => {
    const o = e.target.closest('[data-col]');
    const ed = e.target.closest('[data-ed]');
    const del = e.target.closest('[data-del]');
    if (o) {
      if (st.col === o.dataset.col) st.dir *= -1; else { st.col = o.dataset.col; st.dir = 1; }
      pintarLista(nombre);
      caja.querySelector(`[data-col="${o.dataset.col}"]`)?.focus();
    }
    if (ed) abrirForm(nombre, datosTabla[nombre].find((f) => idFila(t, f) === ed.dataset.ed));
    if (del) eliminar(nombre, del.dataset.del);
  };
}

async function abrirForm(nombre, fila, inicial = {}, alGuardar = null) {
  const t = META[nombre];
  const editar = !!fila;
  const dlg = $('#dlg');
  $('#dlgTitulo').textContent = editar ? `Editar ${SINGULAR[nombre][0]} ${t.pk.map((p) => fila[p]).join(' / ')}` : nuevoDe(nombre);
  $('#btnGuardar').textContent = editar ? 'Guardar cambios' : `Crear ${SINGULAR[nombre][0]}`;
  $('#dlgError').hidden = true;
  const campos = $('#campos');
  campos.innerHTML = '<div class="esqueleto ancho" style="height:40px"></div><div class="esqueleto ancho" style="height:40px"></div>';
  dlg.showModal();

  const opciones = {};
  try {
    await Promise.all(t.columnas.filter((c) => c.tipo === 'fk').map(async (c) => {
      opciones[c.nombre] = await api(`/api/opciones/${nombre}/${c.nombre}`);
    }));
  } catch (err) {
    campos.innerHTML = '';
    mostrarError(err.message);
    return;
  }

  campos.innerHTML = t.columnas.map((c) => {
    const valor = fila ? fila[c.nombre] : (inicial[c.nombre] ?? c.defecto ?? '');
    const bloqueado = c.auto || c.soloLectura || (editar && t.pk.includes(c.nombre));
    if ((c.auto || c.soloLectura) && !editar) return '';
    const req = c.requerido && !bloqueado;
    const atr = `id="f_${c.nombre}" name="${c.nombre}" ${req ? 'required aria-required="true"' : ''} ${bloqueado ? 'disabled' : ''}`;
    const ancho = (c.max || 0) > 100 || c.tipo === 'fk' && t.columnas.filter((x) => x.tipo === 'fk').length === 1 ? ' ancho' : '';
    let control;
    if (c.tipo === 'fk') {
      control = `<select ${atr}><option value="">Seleccione…</option>
        ${opciones[c.nombre].map((o) => `<option value="${o.VALOR}" ${String(o.VALOR) === String(valor) ? 'selected' : ''}>${esc(o.TEXTO)}</option>`).join('')}</select>`;
    } else if (c.tipo === 'enum') {
      control = `<select ${atr}>${c.opciones.map((o) => `<option value="${o}" ${o === valor ? 'selected' : ''}>${esc(ETIQUETA[o] || o)}</option>`).join('')}</select>`;
    } else {
      const tipo = { number: 'number', email: 'email', date: 'date', datetime: 'datetime-local' }[c.tipo] || 'text';
      const extra = [
        c.max ? `maxlength="${c.max}"` : '', c.min !== undefined ? `min="${c.min}"` : '',
        c.maxv !== undefined ? `max="${c.maxv}"` : '', c.patron ? `pattern="${c.patron}"` : '',
      ].join(' ');
      control = `<input type="${tipo}" value="${esc(valor)}" ${extra} ${atr}>`;
    }
    const textoAyuda = c.patron ? 'Solo dígitos, de 6 a 15'
      : c.tipo === 'email' ? 'Ejemplo: nombre@universidad.edu.co'
        : (c.min !== undefined && c.maxv !== undefined ? `Entre ${c.min} y ${c.maxv}` : '');
    const ayuda = textoAyuda ? `<span class="ayuda" id="ayuda_${c.nombre}">${textoAyuda}</span>` : '';
    const describe = [textoAyuda ? `ayuda_${c.nombre}` : '', `err_${c.nombre}`].filter(Boolean).join(' ');
    control = control.replace(` id="f_${c.nombre}"`, ` id="f_${c.nombre}" aria-describedby="${describe}"`);
    return `<label class="campo${ancho}" for="f_${c.nombre}"><span class="etq">${esc(c.etiqueta)}${req ? '<span class="req" aria-hidden="true">*</span><span class="sr-only"> (obligatorio)</span>' : ''}</span>${control}${ayuda}
      <span class="error-campo" id="err_${c.nombre}" hidden></span></label>`;
  }).join('');
  // El diálogo es modal: la barra superior queda inaccesible mientras está abierto.
  // Si falta el usuario de la app, se pide aquí mismo y se sincroniza con la barra.
  if (!inpUsuario.value.trim()) {
    campos.insertAdjacentHTML('afterbegin', `<label class="campo ancho" for="f_USUARIO_APP">
      <span class="etq">Tu usuario de la aplicación<span class="req" aria-hidden="true">*</span><span class="sr-only"> (obligatorio)</span></span>
      <input id="f_USUARIO_APP" maxlength="60" autocomplete="username" aria-describedby="ayuda_USUARIO_APP err_USUARIO_APP">
      <span class="ayuda" id="ayuda_USUARIO_APP">Queda en la auditoría como la persona que hizo el cambio</span>
      <span class="error-campo" id="err_USUARIO_APP" hidden></span></label>`);
    $('#f_USUARIO_APP').addEventListener('input', (ev) => {
      inpUsuario.value = ev.target.value;
      inpUsuario.dispatchEvent(new Event('input'));
    });
  }
  limpiarErrores();
  campos.oninput = (ev) => { const n = ev.target.name || ev.target.id.replace(/^f_/, ''); if (n) marcarCampo(n, null); };
  campos.onchange = campos.oninput;
  campos.querySelector('input:not(:disabled), select:not(:disabled)')?.focus();

  const cerrar = () => dlg.close();
  $('#btnCancelar').onclick = cerrar;
  $('#btnCerrar').onclick = cerrar;
  $('#frm').onsubmit = async (e) => {
    e.preventDefault();
    const form = $('#frm');
    limpiarErrores();
    const errores = validarFormulario(form, t);
    if (!inpUsuario.value.trim() && document.getElementById('f_USUARIO_APP')) {
      errores.unshift({ campo: 'USUARIO_APP', mensaje: 'Escribe tu usuario para que la auditoría registre quién hace el cambio' });
    }
    if (errores.length) { mostrarErrores(errores); return; }
    if (!exigirUsuario()) return;
    const datos = Object.fromEntries(new FormData(form).entries());
    const btn = $('#btnGuardar');
    btn.disabled = true;
    btn.classList.add('cargando');
    try {
      if (editar) {
        await api(`/api/${nombre}/${encodeURIComponent(idFila(t, fila))}`, { method: 'PUT', body: JSON.stringify(datos) });
        aviso(hechoDe(nombre, 'actualizad'));
      } else {
        const r = await api(`/api/${nombre}`, { method: 'POST', body: JSON.stringify(datos) });
        aviso(`${hechoDe(nombre, 'cread')}${r.id ? ` con el número ${r.id}` : ''}`);
      }
      dlg.close();
      if (alGuardar) await alGuardar(); else await cargarLista(nombre);
      refrescarConteos();
    } catch (err) {
      // Si Oracle indica qué columna falló y está en el formulario, el error va junto a ese campo
      if (err.campo && document.getElementById(`f_${err.campo}`) && !document.getElementById(`f_${err.campo}`).disabled) {
        mostrarErrores([{ campo: err.campo, mensaje: err.message }]);
      } else {
        mostrarError(err.message);
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove('cargando');
    }
  };
}

function mostrarError(msg) {
  const caja = $('#dlgError');
  caja.innerHTML = `${icono('alerta')}<span>${esc(msg)}</span>`;
  caja.hidden = false;
  caja.scrollIntoView({ block: 'nearest' });
}

// ---------- validación con errores junto a cada campo + resumen enfocable
const etiquetaDe = (campo) => document.querySelector(`label[for="f_${campo}"] .etq`)?.firstChild?.textContent.trim() || campo;

function marcarCampo(campo, mensaje) {
  const control = document.getElementById(`f_${campo}`);
  const caja = document.getElementById(`err_${campo}`);
  if (!control || !caja) return;
  if (mensaje) {
    control.setAttribute('aria-invalid', 'true');
    caja.innerHTML = `${icono('alerta')}<span>${esc(mensaje)}</span>`;
    caja.hidden = false;
  } else if (control.getAttribute('aria-invalid')) {
    control.removeAttribute('aria-invalid');
    caja.hidden = true;
    caja.innerHTML = '';
  }
}

function limpiarErrores() {
  document.querySelectorAll('#campos [aria-invalid]').forEach((c) => marcarCampo(c.id.replace(/^f_/, ''), null));
  $('#resumenErrores').hidden = true;
  $('#dlgError').hidden = true;
}

function mensajeValidez(el) {
  const v = el.validity;
  if (v.valueMissing) return el.tagName === 'SELECT' ? 'Selecciona una opción' : 'Este campo es obligatorio';
  if (v.typeMismatch && el.type === 'email') return 'Escribe un correo válido, por ejemplo nombre@universidad.edu.co';
  if (v.patternMismatch) return 'Usa solo dígitos, entre 6 y 15';
  if (v.rangeUnderflow) return `El valor mínimo es ${el.min}`;
  if (v.rangeOverflow) return `El valor máximo es ${el.max}`;
  if (v.stepMismatch || v.badInput) return 'Escribe un número válido';
  if (v.tooLong) return `Máximo ${el.maxLength} caracteres`;
  return el.validationMessage;
}

function validarFormulario(form, t) {
  const errores = [];
  form.querySelectorAll('input:not(:disabled), select:not(:disabled)').forEach((el) => {
    if (!el.checkValidity()) errores.push({ campo: el.name, mensaje: mensajeValidez(el) });
  });
  // Regla visible antes de ir a la base de datos: el fin debe ser posterior al inicio
  const ini = form.elements.FECHA_INICIO?.value;
  const fin = form.elements.FECHA_FIN?.value;
  if (t.columnas.some((c) => c.nombre === 'FECHA_FIN') && ini && fin && fin <= ini && !errores.some((e) => e.campo === 'FECHA_FIN')) {
    errores.push({ campo: 'FECHA_FIN', mensaje: 'Debe ser posterior a la fecha de inicio' });
  }
  return errores;
}

function mostrarErrores(errores) {
  errores.forEach((e) => marcarCampo(e.campo, e.mensaje));
  const resumen = $('#resumenErrores');
  const n = errores.length;
  resumen.innerHTML = `<h3 id="resumenTitulo">${icono('alerta', 'ic-sm')}${n === 1 ? 'Hay un problema' : `Hay ${n} problemas`} en el formulario</h3>
    <ul>${errores.map((e) => `<li><a href="#f_${e.campo}" data-campo="${e.campo}">${esc(etiquetaDe(e.campo))}: ${esc(e.mensaje)}</a></li>`).join('')}</ul>`;
  resumen.hidden = false;
  resumen.onclick = (ev) => {
    const a = ev.target.closest('a[data-campo]');
    if (!a) return;
    ev.preventDefault();
    document.getElementById(`f_${a.dataset.campo}`).focus();
  };
  $('.dlg-cuerpo').scrollTop = 0;
  resumen.focus();
}

async function eliminar(nombre, id) {
  if (!exigirUsuario()) return;
  const ok = await confirmar(`Vas a eliminar ${SINGULAR[nombre][1] === 'f' ? 'la' : 'el'} ${SINGULAR[nombre][0]} ${id.replace('~', ' / ')}. No se puede deshacer, pero quedará registrado en la auditoría.`,
    `Eliminar ${SINGULAR[nombre][0]}`, `Eliminar ${SINGULAR[nombre][0]}`);
  if (!ok) return;
  try {
    await api(`/api/${nombre}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    aviso(hechoDe(nombre, 'eliminad'));
    await cargarLista(nombre);
    refrescarConteos();
  } catch (err) {
    aviso(err.message, true);
  }
}

// ------------------------------------------------------------------ reporte de auditoría
const isoHoy = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function jsonResaltado(obj, cambios) {
  if (!obj) return '<pre class="json">—</pre>';
  return `<pre class="json">${Object.entries(obj).map(([k, v]) =>
    `<span class="${cambios.includes(k) ? 'cambio' : ''}"><span class="k">${esc(k)}:</span> ${esc(JSON.stringify(v))}</span>`).join('\n')}</pre>`;
}

async function vistaAuditoria() {
  const vista = $('#vista');
  const hace7 = new Date(Date.now() - 7 * 864e5);
  vista.innerHTML = cabecera('Reporte de auditoría',
    'Cada inserción, actualización y eliminación que registran los triggers de Oracle, agrupada por día.',
    `<div class="no-imprimir" style="display:flex;gap:8px"><button type="button" class="btn btn-sec" id="imprimir">${icono('imprimir')}Imprimir o guardar PDF</button>
     <button type="button" class="btn btn-sec" id="csv">${icono('descargar')}Exportar CSV</button></div>`) + `
    <form class="tarjeta filtros" id="filtros">
      <label class="campo">Desde<input type="date" name="desde" value="${isoHoy(hace7)}" required></label>
      <label class="campo">Hasta<input type="date" name="hasta" value="${isoHoy()}" required></label>
      <label class="campo">Tabla<select name="tabla"><option value="">Todas</option>${Object.entries(META).map(([k, t]) => `<option value="${k}">${esc(t.titulo)}</option>`).join('')}</select></label>
      <label class="campo">Operación<select name="operacion"><option value="">Todas</option><option value="INSERT">Inserción</option><option value="UPDATE">Actualización</option><option value="DELETE">Eliminación</option></select></label>
      <label class="campo">Usuario<input name="usuario" placeholder="Quién"></label>
      <div class="acciones-filtro"><button class="btn btn-pri">${icono('buscar')}Consultar</button></div>
    </form>
    <div id="resAud"></div>`;
  const form = $('#filtros');
  let ultimo = [];
  const consultar = async () => {
    const p = new URLSearchParams(new FormData(form));
    $('#resAud').innerHTML = `<div class="tarjeta solo"><div class="tabla-env" style="padding:16px"><div class="esqueleto" style="margin-bottom:12px"></div><div class="esqueleto" style="margin-bottom:12px"></div><div class="esqueleto"></div></div></div>`;
    try {
      const r = await api(`/api/auditoria?${p}`);
      ultimo = r.filas;
      pintarAuditoria(r);
    } catch (err) {
      $('#resAud').innerHTML = `<div class="tarjeta solo"><div class="vacio">${icono('alerta')}<b>No se pudo consultar</b>${esc(err.message)}</div></div>`;
    }
  };
  form.onsubmit = (e) => { e.preventDefault(); consultar(); };
  $('#imprimir').onclick = () => window.print();
  $('#csv').onclick = () => exportarCsv(ultimo);
  consultar();
}

function pintarAuditoria(r) {
  const filas = r.filas;
  const cuenta = (op) => filas.filter((f) => f.OPERACION === op).length;
  const quienes = new Set(filas.map((f) => f.USUARIO_APP || f.USUARIO_BD));
  const fmt = (iso) => new Date(`${iso}T12:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  let html = `<div class="cifras cinco">
      <div><b>${filas.length}</b><span>cambios del ${esc(fmt(r.desde))} al ${esc(fmt(r.hasta))}</span></div>
      <div><b>${cuenta('INSERT')}</b><span>inserciones</span></div>
      <div><b>${cuenta('UPDATE')}</b><span>actualizaciones</span></div>
      <div><b>${cuenta('DELETE')}</b><span>eliminaciones</span></div>
      <div><b>${quienes.size}</b><span>${quienes.size === 1 ? 'persona' : 'personas'}</span></div>
    </div>`;
  if (!filas.length) {
    $('#resAud').innerHTML = `${html}<div class="tarjeta"><div class="vacio">${icono('vacio')}<b>No hay cambios en ese periodo</b>Amplía el rango de fechas o quita filtros.</div></div>`;
    return;
  }
  let dia = null;
  const cuerpo = filas.map((f) => {
    let cab = '';
    if (f.DIA !== dia) {
      dia = f.DIA;
      const n = filas.filter((x) => x.DIA === dia).length;
      const largo = new Date(`${dia}T12:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
      cab = `<tr class="dia"><td colspan="7">${esc(largo.charAt(0).toUpperCase() + largo.slice(1))}, ${n} ${n === 1 ? 'cambio' : 'cambios'}</td></tr>`;
    }
    const ant = f.DATOS_ANTERIORES ? JSON.parse(f.DATOS_ANTERIORES) : null;
    const nue = f.DATOS_NUEVOS ? JSON.parse(f.DATOS_NUEVOS) : null;
    const cambios = (f.COLUMNAS_MODIFICADAS || '').split(',').filter(Boolean);
    return `${cab}<tr>
      <td class="num"><span class="id">${f.ID_AUDITORIA}</span></td>
      <td class="fecha">${esc(f.FECHA.slice(11))}</td>
      <td>${chip(f.OPERACION)}</td>
      <td>${esc(META[f.TABLA]?.titulo || f.TABLA)}<br><span class="id">Registro ${esc(f.ID_REGISTRO)}</span></td>
      <td class="quien"><b>${esc(f.USUARIO_APP || f.USUARIO_BD)}</b><small>Desde ${esc(f.PROGRAMA || 'cliente desconocido')} en ${esc(f.EQUIPO || 'equipo desconocido')}</small></td>
      <td><div class="cols">${cambios.map((c) => `<code>${esc(c)}</code>`).join('')}</div></td>
      <td><button type="button" class="enlace ver-datos" aria-expanded="false" aria-controls="det${f.ID_AUDITORIA}">${icono('derecha', 'ic-sm')}Ver datos</button></td></tr>
      <tr class="detalle" id="det${f.ID_AUDITORIA}" hidden><td colspan="7"><div class="difs">
        <div><h4>Antes</h4>${jsonResaltado(ant, cambios)}</div>
        <div><h4>Después</h4>${jsonResaltado(nue, cambios)}</div></div></td></tr>`;
  }).join('');
  html += `<div class="tarjeta"><div class="tabla-env"><table><thead><tr><th class="num">N.º</th><th>Hora</th><th>Operación</th><th>Tabla y registro</th>
    <th>Quién</th><th>Columnas que cambiaron</th><th><span class="sr-only">Detalle</span></th></tr></thead><tbody>${cuerpo}</tbody></table></div></div>`;
  $('#resAud').innerHTML = html;
  $('#resAud').onclick = (e) => {
    const b = e.target.closest('.ver-datos');
    if (!b) return;
    const abierto = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!abierto));
    document.getElementById(b.getAttribute('aria-controls')).hidden = abierto;
  };
}

function exportarCsv(filas) {
  if (!filas.length) { aviso('No hay datos para exportar', true); return; }
  const cols = ['ID_AUDITORIA', 'FECHA', 'TABLA', 'OPERACION', 'ID_REGISTRO', 'USUARIO_APP', 'USUARIO_BD', 'EQUIPO', 'IP', 'PROGRAMA', 'COLUMNAS_MODIFICADAS', 'DATOS_ANTERIORES', 'DATOS_NUEVOS'];
  const linea = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(';'), ...filas.map((f) => cols.map((c) => linea(f[c])).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `auditoria_${isoHoy()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  aviso('CSV descargado');
}

// ------------------------------------------------------------------ arranque
(async () => {
  try {
    META = await api('/api/meta');
  } catch (err) {
    $('#vista').innerHTML = `<div class="tarjeta solo"><div class="vacio">${icono('alerta')}<b>No se pudo cargar la aplicación</b>${esc(err.message)}</div></div>`;
    return;
  }
  const e = await refrescarConteos();
  $('#puntoBd').className = `punto ${e ? 'ok' : 'mal'}`;
  $('#textoBd').textContent = e ? `Conectado a Oracle (${e.PDB})` : 'Sin conexión a Oracle';
  pintarMenu();
  mostrar(location.hash.slice(1) || 'inicio', false);
})();
