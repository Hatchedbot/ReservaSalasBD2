// Vista de celular (375 px): sin desplazamiento horizontal, menú tipo cajón y tablero usable
const { test, expect } = require('./helpers');

test.describe('Celular', () => {
  for (const [ruta, titulo] of [['/#inicio', null], ['/#RESERVA', 'Reservas'], ['/#USUARIO', 'Usuarios'], ['/#auditoria', 'Reporte de auditoría']]) {
    test(`sin desplazamiento horizontal en ${ruta}`, async ({ page }) => {
      await page.goto(ruta);
      if (titulo) await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const [ancho, ventana] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(ancho).toBeLessThanOrEqual(ventana);
    });
  }

  test('el menú se abre como cajón y se cierra al elegir una opción', async ({ page }) => {
    await page.goto('/');
    const boton = page.getByRole('button', { name: 'Abrir menú' });
    const menu = page.locator('#sidebar');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).not.toBeInViewport();
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeInViewport();
    await menu.getByRole('button', { name: /^Espacios/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Espacios' })).toBeVisible();
    await expect(menu).not.toBeInViewport();
  });

  test('en el tablero la columna de salas queda fija al desplazar las horas', async ({ page }) => {
    await page.goto('/');
    const sala = page.locator('.tb-fila .tb-sala').first();
    await expect(sala).toBeVisible();
    const antes = (await sala.boundingBox()).x;
    await page.locator('.tablero').evaluate((t) => { t.scrollLeft = 300; });
    await expect.poll(async () => Math.round((await sala.boundingBox()).x)).toBe(Math.round(antes));
  });
});
