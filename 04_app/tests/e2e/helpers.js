// Utilidades compartidas por las pruebas E2E
const { test: base, expect } = require('@playwright/test');

// Usuario de la aplicación con el que quedan auditados los cambios de las pruebas
const USUARIO_E2E = 'e2e-playwright';
// Marca única por ejecución: todos los datos de prueba la llevan y se borran al final
const MARCA = `E2E${String(Date.now()).slice(-6)}`;

// Prueba base: cada página ya tiene escrito el usuario de la app y el tema claro
const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((usuario) => {
      try {
        if (!sessionStorage.getItem('e2e-init')) {
          localStorage.setItem('usuarioApp', usuario);
          localStorage.setItem('tema', 'light');
          sessionStorage.setItem('e2e-init', '1');
        }
      } catch { /* sin almacenamiento */ }
    }, USUARIO_E2E);
    await use(page);
  },
});

// Llamadas directas a la API (preparar y limpiar datos)
async function api(request, metodo, ruta, datos) {
  const r = await request.fetch(`/api/${ruta}`, {
    method: metodo,
    headers: { 'X-Usuario-App': USUARIO_E2E, 'Content-Type': 'application/json' },
    data: datos,
  });
  const cuerpo = await r.json().catch(() => ({}));
  return { ok: r.ok(), status: r.status(), cuerpo };
}

// Botón del menú lateral por su título exacto (el nombre accesible lleva además el conteo)
const botonMenu = (page, titulo) => page.getByRole('navigation')
  .getByRole('button', { name: new RegExp(`^${titulo}( \\d+)?$`) });

// Abre una tabla desde el menú lateral y espera a que cargue
async function abrirTabla(page, titulo) {
  await page.goto('/#inicio');
  await botonMenu(page, titulo).click();
  await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
  await expect(page.locator('#lista table')).toBeVisible();
  await expect(page.locator('#lista .esqueleto')).toHaveCount(0);
}

// Busca en la tabla abierta y devuelve la fila que contiene el texto
async function buscarFila(page, texto) {
  await page.getByRole('searchbox').fill(texto);
  const fila = page.locator('#lista tbody tr', { hasText: texto });
  await expect(fila).toHaveCount(1);
  return fila;
}

// Rellena un campo del formulario abierto por el nombre de su columna
async function llenar(page, columna, valor) {
  const control = page.locator(`#f_${columna}`);
  const etiqueta = await control.evaluate((el) => el.tagName);
  if (etiqueta === 'SELECT') await control.selectOption(String(valor));
  else await control.fill(String(valor));
}

module.exports = { test, expect, api, botonMenu, abrirTabla, buscarFila, llenar, USUARIO_E2E, MARCA };
