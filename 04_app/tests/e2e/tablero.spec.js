// Tablero de ocupación de la agenda: cambio de día, reservar en un hueco libre y editar un bloque
const { test, expect, api, llenar, MARCA } = require('./helpers');

const largo = (iso) => new Date(`${iso}T12:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const conMayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

test.describe('Tablero de ocupación', () => {
  test('las flechas cambian de día y «Hoy» vuelve a la fecha actual', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    const inicial = await h1.innerText();
    await page.getByRole('button', { name: 'Día siguiente' }).click();
    await expect(h1).not.toHaveText(inicial);
    await page.getByRole('button', { name: 'Día anterior' }).click();
    await expect(h1).toHaveText(inicial);
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    await expect(h1).toHaveText(conMayuscula(largo(iso)));
    await expect(page.locator('.hoy p')).toContainText('Hoy');
  });

  test('clic en un hueco libre abre la reserva con sala y hora, y el bloque aparece al guardar', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('.tb-fila').first()).toBeVisible();
    const fila = page.locator('.tb-fila[data-espacio="6"]'); // B3-C01, cabina individual
    await expect(fila).toBeVisible();

    // Primera hora libre dentro del horario del edificio (sin bloque encima)
    const hueco = await fila.evaluate((el) => {
      const pista = el.querySelector('.tb-pista');
      const caja = pista.getBoundingClientRect();
      const abre = Number(el.dataset.abre);
      const cierra = Number(el.dataset.cierra);
      for (let h = abre; h < cierra; h += 1) {
        const x = caja.left + caja.width * ((h + 0.5 - 6) / 16);
        const y = caja.top + caja.height / 2;
        if (document.elementFromPoint(x, y) === pista) return { h, x, y };
      }
      return null;
    });
    expect(hueco, 'la cabina debe tener al menos una hora libre').not.toBeNull();
    await page.mouse.click(hueco.x, hueco.y);

    await expect(page.locator('#dlgTitulo')).toHaveText('Nueva reserva');
    await expect(page.locator('#f_ID_ESPACIO')).toHaveValue('6');
    const inicio = await page.locator('#f_FECHA_INICIO').inputValue();
    expect(inicio).toMatch(new RegExp(`T${String(hueco.h).padStart(2, '0')}:00$`));
    await expect(page.locator('#f_FECHA_FIN')).toHaveValue(inicio.replace(/T\d\d/, `T${String(hueco.h + 1).padStart(2, '0')}`));

    await llenar(page, 'ID_USUARIO', 3);
    await llenar(page, 'MOTIVO', `${MARCA} Estudio individual`);
    await page.locator('#btnGuardar').click();
    await expect(page.locator('.toast').last()).toContainText(/Reserva creada con el número (\d+)/);
    const id = (await page.locator('.toast').last().innerText()).match(/(\d+)$/)[1];

    const bloque = fila.locator(`.tb-bloque[data-reserva="${id}"]`);
    await expect(bloque).toBeVisible();
    await expect(bloque).toHaveClass(/PENDIENTE/);

    // Clic en el bloque: abre la edición de esa reserva
    await bloque.click();
    await expect(page.locator('#dlgTitulo')).toHaveText(`Editar reserva ${id}`);
    await expect(page.locator('#f_MOTIVO')).toHaveValue(`${MARCA} Estudio individual`);
    await page.locator('#btnCancelar').click();

    await api(request, 'DELETE', `RESERVA/${id}`);
  });

  test('las salas en mantenimiento no se pueden reservar desde el tablero', async ({ page }) => {
    await page.goto('/');
    const mant = page.locator('.tb-fila.mant').first();
    await expect(mant).toContainText('En mantenimiento');
    await mant.locator('.tb-pista').click({ position: { x: 200, y: 20 } });
    await expect(page.locator('#dlg')).not.toBeVisible();
  });
});
