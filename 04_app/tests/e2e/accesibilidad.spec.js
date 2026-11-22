// Accesibilidad: análisis automático con axe-core, tamaño de controles, teclado y tema
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect, abrirTabla } = require('./helpers');

async function analizar(page, contexto) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  const resumen = graves.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(resumen, `Problemas de accesibilidad graves en ${contexto}`).toEqual([]);
}

test.describe('Accesibilidad', () => {
  test('agenda sin problemas graves (axe, WCAG 2.2 AA)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tb-fila').first()).toBeVisible();
    await analizar(page, 'la agenda');
  });

  test('tabla de reservas sin problemas graves', async ({ page }) => {
    await abrirTabla(page, 'Reservas');
    await analizar(page, 'la tabla de reservas');
  });

  test('formulario con errores sin problemas graves', async ({ page }) => {
    await abrirTabla(page, 'Usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await page.locator('#btnGuardar').click();
    await expect(page.locator('#resumenErrores')).toBeVisible();
    await analizar(page, 'el formulario con errores');
  });

  test('reporte de auditoría sin problemas graves', async ({ page }) => {
    await page.goto('/#auditoria');
    await expect(page.locator('#resAud table')).toBeVisible();
    await analizar(page, 'el reporte de auditoría');
  });

  test('todos los controles visibles miden al menos 44 px de alto', async ({ page }) => {
    for (const ruta of ['/#inicio', '/#RESERVA', '/#auditoria']) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      const pequenos = await page.evaluate(() => [...document.querySelectorAll(
        '.nav-item, .btn, .btn-fila, .btn-icono, th button.orden, .pasos button, .enlace, .campo input, .campo select, #buscar')]
        .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44)
        .map((e) => `${e.className || e.tagName} "${(e.textContent || e.name || '').trim().slice(0, 20)}" ${Math.round(e.getBoundingClientRect().height)}px`));
      expect(pequenos, `controles de menos de 44 px en ${ruta}`).toEqual([]);
    }
  });

  test('con el teclado se recorre la interfaz y el foco es visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tb-fila').first()).toBeVisible();
    await page.keyboard.press('Tab');
    const primero = page.locator(':focus');
    await expect(primero).toHaveClass(/marca/); // el logo enlaza al inicio
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText(/Agenda de salas/);
    const contorno = await page.locator(':focus').evaluate((e) => getComputedStyle(e).outlineStyle);
    expect(contorno).not.toBe('none');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // abre «Reservas»
    await expect(page.getByRole('heading', { level: 1, name: 'Reservas' })).toBeVisible();
  });

  test('el tema oscuro se activa con el botón y se recuerda al recargar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
