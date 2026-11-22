// Validaciones: errores junto a cada campo, reglas de Oracle mostradas en el campo correcto
const { test, expect, api, abrirTabla, llenar, MARCA } = require('./helpers');

const errorDe = (page, campo) => page.locator(`#err_${campo}`);

test.describe('Validaciones del formulario', () => {
  test('enviar vacío muestra un resumen enfocado y un error accesible en cada campo', async ({ page }) => {
    await abrirTabla(page, 'Usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await llenar(page, 'DOCUMENTO', '12ab');
    await llenar(page, 'EMAIL', 'correo-sin-arroba');
    await page.locator('#btnGuardar').click();

    const resumen = page.locator('#resumenErrores');
    await expect(resumen).toBeVisible();
    await expect(resumen).toBeFocused();
    await expect(resumen.locator('li')).toHaveCount(5);
    for (const campo of ['DOCUMENTO', 'NOMBRES', 'APELLIDOS', 'EMAIL', 'ID_FACULTAD']) {
      await expect(page.locator(`#f_${campo}`)).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator(`#f_${campo}`)).toHaveAttribute('aria-describedby', new RegExp(`err_${campo}`));
      await expect(errorDe(page, campo)).toBeVisible();
    }
    await expect(errorDe(page, 'DOCUMENTO')).toHaveText('Usa solo dígitos, entre 6 y 15');
    await expect(errorDe(page, 'EMAIL')).toContainText('Escribe un correo válido');

    // El enlace del resumen lleva al campo, y al corregirlo el error desaparece
    await resumen.getByRole('link', { name: /^Correo/ }).click();
    await expect(page.locator('#f_EMAIL')).toBeFocused();
    await page.locator('#f_EMAIL').fill('valido@universidad.edu.co');
    await expect(errorDe(page, 'EMAIL')).toBeHidden();
    await expect(page.locator('#f_EMAIL')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('un correo repetido (UNIQUE de Oracle) se marca en el campo Correo', async ({ page }) => {
    await abrirTabla(page, 'Usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await llenar(page, 'DOCUMENTO', `98${String(Date.now()).slice(-8)}`);
    await llenar(page, 'NOMBRES', 'Correo');
    await llenar(page, 'APELLIDOS', `${MARCA} Repetido`);
    await llenar(page, 'EMAIL', 'afmoreno@universidad.edu.co');
    await llenar(page, 'ID_FACULTAD', 1);
    await page.locator('#btnGuardar').click();
    await expect(errorDe(page, 'EMAIL')).toHaveText('Ya existe un usuario con ese correo');
    await expect(page.locator('#dlg')).toBeVisible();
  });

  test.describe('reglas de reserva del trigger TRG_RESERVA_REGLAS', () => {
    let base;
    test.beforeAll(async ({ request }) => {
      base = await api(request, 'POST', 'RESERVA', {
        ID_USUARIO: 1, ID_ESPACIO: 1, FECHA_INICIO: '2027-03-16T10:00', FECHA_FIN: '2027-03-16T12:00',
        NUM_ASISTENTES: 20, MOTIVO: `${MARCA} Reserva base`, ESTADO: 'CONFIRMADA',
      });
      expect(base.ok, JSON.stringify(base.cuerpo)).toBeTruthy();
    });
    test.afterAll(async ({ request }) => {
      if (base?.cuerpo?.id) await api(request, 'DELETE', `RESERVA/${base.cuerpo.id}`);
    });

    async function nuevaReserva(page, datos) {
      await abrirTabla(page, 'Reservas');
      await page.getByRole('button', { name: 'Nueva reserva' }).click();
      for (const [k, v] of Object.entries({ ID_USUARIO: 5, MOTIVO: `${MARCA} Intento`, ...datos })) await llenar(page, k, v);
      await page.locator('#btnGuardar').click();
    }

    test('doble reserva: el error aparece en el campo Inicio', async ({ page }) => {
      await nuevaReserva(page, { ID_ESPACIO: 1, FECHA_INICIO: '2027-03-16T11:00', FECHA_FIN: '2027-03-16T13:00', NUM_ASISTENTES: 10 });
      await expect(errorDe(page, 'FECHA_INICIO')).toContainText('Doble reserva');
      await expect(page.locator('#resumenErrores')).toContainText('Inicio');
    });

    test('superar la capacidad: el error aparece en Asistentes', async ({ page }) => {
      await nuevaReserva(page, { ID_ESPACIO: 6, FECHA_INICIO: '2027-03-17T09:00', FECHA_FIN: '2027-03-17T10:00', NUM_ASISTENTES: 3 });
      await expect(errorDe(page, 'NUM_ASISTENTES')).toContainText('capacidad');
    });

    test('superar el máximo de horas del tipo de espacio: el error aparece en Fin', async ({ page }) => {
      await nuevaReserva(page, { ID_ESPACIO: 6, FECHA_INICIO: '2027-03-17T09:00', FECHA_FIN: '2027-03-17T14:00', NUM_ASISTENTES: 1 });
      await expect(errorDe(page, 'FECHA_FIN')).toContainText('máximo de horas');
    });

    test('fin antes del inicio se detecta antes de ir a la base de datos', async ({ page }) => {
      const peticiones = [];
      page.on('request', (r) => { if (r.method() === 'POST') peticiones.push(r.url()); });
      await nuevaReserva(page, { ID_ESPACIO: 1, FECHA_INICIO: '2027-03-18T11:00', FECHA_FIN: '2027-03-18T10:00', NUM_ASISTENTES: 5 });
      await expect(errorDe(page, 'FECHA_FIN')).toHaveText('Debe ser posterior a la fecha de inicio');
      expect(peticiones).toHaveLength(0);
    });
  });

  test('no se puede eliminar un edificio con espacios (llave foránea)', async ({ page }) => {
    await abrirTabla(page, 'Edificios');
    const fila = page.locator('#lista tbody tr', { hasText: 'Bloque de Ingenierias' });
    await fila.getByRole('button', { name: /^Eliminar registro/ }).click();
    await page.locator('#dlgConfirmar').getByRole('button', { name: 'Eliminar edificio' }).click();
    await expect(page.locator('.toast.error')).toContainText('No se puede eliminar');
    await expect(page.locator('#lista tbody tr', { hasText: 'Bloque de Ingenierias' })).toHaveCount(1);
  });

  test('sin usuario de la aplicación, el formulario lo pide dentro del diálogo', async ({ page }) => {
    await abrirTabla(page, 'Recursos');
    await page.locator('#usuarioApp').fill('');
    await page.getByRole('button', { name: 'Nuevo recurso' }).click();
    // El diálogo es modal: el usuario se pide en un campo propio del formulario
    const campoUsuario = page.locator('#f_USUARIO_APP');
    await expect(campoUsuario).toBeVisible();
    await llenar(page, 'NOMBRE', `${MARCA} Sin usuario`);
    await page.locator('#btnGuardar').click();
    await expect(page.locator('#err_USUARIO_APP')).toContainText('Escribe tu usuario');
    await expect(campoUsuario).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#resumenErrores').getByRole('link', { name: /^Tu usuario/ }).click();
    await expect(campoUsuario).toBeFocused();
    await campoUsuario.fill('e2e-playwright');
    await expect(page.locator('#err_USUARIO_APP')).toBeHidden();
    await page.locator('#btnGuardar').click();
    await expect(page.locator('.toast').last()).toContainText('Recurso creado');
    await expect(page.locator('#usuarioApp')).toHaveValue('e2e-playwright'); // quedó sincronizado con la barra
  });
});
