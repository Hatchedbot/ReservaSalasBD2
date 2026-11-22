// Reporte de auditoría: registra quién y qué cambió, filtros, detalle antes/después y CSV
const fs = require('fs');
const { test, expect, api, USUARIO_E2E, MARCA } = require('./helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Reporte de auditoría', () => {
  let id;
  test.beforeAll(async ({ request }) => {
    const c = await api(request, 'POST', 'RECURSO', { NOMBRE: `${MARCA} Auditado`, DESCRIPCION: 'Antes' });
    id = c.cuerpo.id;
    await api(request, 'PUT', `RECURSO/${id}`, { NOMBRE: `${MARCA} Auditado`, DESCRIPCION: 'Después' });
    await api(request, 'DELETE', `RECURSO/${id}`);
  });

  async function abrirReporte(page, filtros = {}) {
    await page.goto('/#auditoria');
    await expect(page.getByRole('heading', { level: 1, name: 'Reporte de auditoría' })).toBeVisible();
    if (filtros.tabla) await page.locator('select[name="tabla"]').selectOption(filtros.tabla);
    if (filtros.operacion) await page.locator('select[name="operacion"]').selectOption(filtros.operacion);
    if (filtros.usuario) await page.locator('input[name="usuario"]').fill(filtros.usuario);
    await page.getByRole('button', { name: 'Consultar' }).click();
    await expect(page.locator('#resAud .esqueleto')).toHaveCount(0);
  }

  test('las tres operaciones quedan registradas con el usuario de la aplicación', async ({ page }) => {
    await abrirReporte(page, { tabla: 'RECURSO', usuario: USUARIO_E2E });
    const filas = page.locator('#resAud tbody tr:not(.dia):not(.detalle)', { hasText: `Registro ${id}` });
    await expect(filas).toHaveCount(3);
    await expect(filas.locator('.chip')).toHaveText(['Eliminación', 'Actualización', 'Inserción']);
    await expect(filas.first()).toContainText(USUARIO_E2E);
    await expect(filas.first()).toContainText('LM_ReservaSalas Web');
  });

  test('el detalle de la actualización muestra antes y después y resalta lo que cambió', async ({ page }) => {
    await abrirReporte(page, { tabla: 'RECURSO', operacion: 'UPDATE', usuario: USUARIO_E2E });
    const fila = page.locator('#resAud tbody tr', { hasText: `Registro ${id}` }).first();
    await expect(fila.locator('.cols code')).toHaveText(['DESCRIPCION']);
    const boton = fila.getByRole('button', { name: 'Ver datos' });
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    const detalle = page.locator(`#${await boton.getAttribute('aria-controls')}`);
    await expect(detalle).toBeVisible();
    await expect(detalle.locator('.cambio')).toHaveCount(2); // antes y después de DESCRIPCION
    await expect(detalle).toContainText('"Antes"');
    await expect(detalle).toContainText('"Después"');
  });

  test('el filtro por operación solo muestra esa operación', async ({ page }) => {
    await abrirReporte(page, { operacion: 'DELETE' });
    const chips = page.locator('#resAud tbody .chip');
    await expect(chips.first()).toBeVisible();
    const textos = await chips.allInnerTexts();
    expect(new Set(textos)).toEqual(new Set(['Eliminación']));
  });

  test('exportar CSV descarga los cambios consultados', async ({ page }) => {
    await abrirReporte(page, { tabla: 'RECURSO', usuario: USUARIO_E2E });
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()]);
    expect(descarga.suggestedFilename()).toMatch(/^auditoria_\d{4}-\d{2}-\d{2}\.csv$/);
    const contenido = fs.readFileSync(await descarga.path(), 'utf8');
    expect(contenido.split('\n')[0]).toContain('ID_AUDITORIA;FECHA;TABLA;OPERACION');
    expect(contenido).toContain(`${MARCA} Auditado`);
  });
});
