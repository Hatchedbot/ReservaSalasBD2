// Navegación general: agenda, menú, migas, enlaces directos, búsqueda y orden
const { test, expect, api, botonMenu, abrirTabla } = require('./helpers');

test.describe('Navegación', () => {
  test('la agenda carga el tablero con todas las salas y las cifras del día', async ({ page, request }) => {
    const agenda = (await api(request, 'GET', 'agenda')).cuerpo;
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/\d{1,2} de [a-z]+/);
    await expect(page.locator('.tb-fila')).toHaveCount(agenda.espacios.length);
    await expect(page.locator('.tb-bloque')).toHaveCount(agenda.reservas.length);
    await expect(page.locator('.cifras > *')).toHaveCount(4);
    await expect(page.locator('#textoBd')).toContainText('Conectado a Oracle');
  });

  test('cada opción del menú abre su tabla con todos sus registros', async ({ page, request }) => {
    const meta = (await api(request, 'GET', 'meta')).cuerpo;
    for (const [nombre, t] of Object.entries(meta)) {
      const filas = (await api(request, 'GET', nombre)).cuerpo;
      await abrirTabla(page, t.titulo);
      await expect(page.locator('#conteo')).toHaveText(`${filas.length} ${filas.length === 1 ? 'registro' : 'registros'}`);
      await expect(page.locator('#lista tbody tr')).toHaveCount(filas.length);
      await expect(page.locator('#migas')).toContainText(t.titulo);
      await expect(botonMenu(page, t.titulo)).toHaveAttribute('aria-current', 'page');
    }
  });

  test('los enlaces directos y el botón atrás del navegador funcionan', async ({ page }) => {
    await page.goto('/#USUARIO');
    await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible();
    await page.getByRole('navigation').getByRole('button', { name: /^Reporte de auditoría/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Reporte de auditoría' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible();
  });

  test('la búsqueda filtra las filas', async ({ page }) => {
    await abrirTabla(page, 'Edificios');
    // «Biblioteca» aparece en dos edificios (nombre y ubicación): deben salir los dos
    await page.getByRole('searchbox').fill('Biblioteca');
    await expect(page.locator('#lista tbody tr')).toHaveCount(2);
    await page.getByRole('searchbox').fill('Bienestar');
    await expect(page.locator('#lista tbody tr')).toHaveCount(1);
    await expect(page.locator('#lista tbody tr')).toContainText('Bienestar Universitario');
    await page.getByRole('searchbox').fill('texto-que-no-existe-xyz');
    await expect(page.locator('#lista .vacio')).toContainText('Sin resultados');
  });

  test('ordenar por columna cambia el orden y lo anuncia con aria-sort', async ({ page }) => {
    await abrirTabla(page, 'Edificios');
    const encabezado = page.locator('th', { has: page.getByRole('button', { name: /^Pisos/ }) });
    await encabezado.getByRole('button').click();
    await expect(encabezado).toHaveAttribute('aria-sort', 'ascending');
    const asc = await page.locator('#lista tbody tr td:nth-child(5)').allInnerTexts();
    expect(asc.map(Number)).toEqual([...asc.map(Number)].sort((a, b) => a - b));
    await encabezado.getByRole('button').click();
    await expect(encabezado).toHaveAttribute('aria-sort', 'descending');
    const desc = await page.locator('#lista tbody tr td:nth-child(5)').allInnerTexts();
    expect(desc.map(Number)).toEqual([...desc.map(Number)].sort((a, b) => b - a));
  });
});
