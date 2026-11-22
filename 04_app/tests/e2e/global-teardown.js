// Al terminar, borra todos los registros creados por las pruebas (llevan la marca E2E).
// Los registros de AUDITORIA no se borran: la tabla está protegida a propósito.
const BASE = 'http://localhost:3000/api';
const H = { 'X-Usuario-App': 'e2e-playwright', 'Content-Type': 'application/json' };

async function listar(tabla) {
  const r = await fetch(`${BASE}/${tabla}?q=E2E`, { headers: H });
  return r.ok ? r.json() : [];
}
async function borrar(tabla, id) {
  await fetch(`${BASE}/${tabla}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: H }).catch(() => {});
}

module.exports = async () => {
  try {
    // Orden: primero los hijos, luego los padres
    for (const r of await listar('RESERVA')) if (/^E2E/.test(r.MOTIVO)) await borrar('RESERVA', r.ID_RESERVA);
    for (const r of await listar('ESPACIO_RECURSO')) {
      if (/E2E/.test(r.ID_RECURSO__TEXTO || '')) await borrar('ESPACIO_RECURSO', `${r.ID_ESPACIO}~${r.ID_RECURSO}`);
    }
    for (const r of await listar('USUARIO')) if (/^E2E/.test(r.APELLIDOS)) await borrar('USUARIO', r.ID_USUARIO);
    for (const r of await listar('RECURSO')) if (/^E2E/.test(r.NOMBRE)) await borrar('RECURSO', r.ID_RECURSO);
    for (const r of await listar('FACULTAD')) if (/^E2/.test(r.CODIGO)) await borrar('FACULTAD', r.ID_FACULTAD);
  } catch (e) {
    console.warn('Limpieza de datos de prueba incompleta:', e.message);
  }
};
